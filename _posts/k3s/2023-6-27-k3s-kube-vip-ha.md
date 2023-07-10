---
layout: post
title: 利用 kube-vip 实现 K3s 高可用部署
subtitle:
date: 2023-6-27 11:06:00 +0800
author: Ksd
header-img: img/post-bg-desk.jpg
catalog: true
tags:
  - K3s
  - kube-vip
---

在容器化和云原生应用的快速发展中，K3s 成为了一种备受关注的轻量级 Kubernetes 发行版。然而，在生产环境中，单点故障可能导致整个集群的不可用，因此高可用成为了至关重要的需求。

K3s 本身可以自动实现控制平面的高可用，但缺少一个具有高可用的访问控制平面入口。毕竟，你不想依靠一个单一的节点来访问你的 Kubernetes 集群的 API。为了解决这个问题，我们可以借助 kube-vip 工具来实现 K3s 控制平面的高可用，这样可以确保 K3s 集群在面临故障时仍能提供稳定可靠的服务。在本文中，我们将介绍如何通过 kube-vip 来实现 K3s 控制平面的高可用。

## 什么是 kube-vip

kube-vip(https://kube-vip.io/) 是一个功能强大的工具，它可以通过虚拟 IP（VIP）来实现 Kubernetes 集群的高可用。它可以监控集群中的 Master 节点，并在主节点故障时自动切换到备用节点，确保集群的持续可用性。

当使用 kube-vip 时，可以选择两种模式之一：ARP 模式和 BGP 模式。这两种模式都用于在 Kubernetes 集群中创建和管理高可用虚拟 IP 地址。

- ARP 模式：
  在 ARP 模式下，kube-vip 使用 ARP（地址解析协议）来实现 IP 转发。它通过在集群中的节点之间发送 ARP 请求和响应来实现负载均衡和故障转移。当一个节点接收到 ARP 请求时，它会回答请求并接管 IP 地址。这种模式简单且易于配置，不需要任何其他的外部依赖。

- BGP 模式：
  在 BGP 模式下，kube-vip 使用 BGP（边界网关协议）来实现 IP 转发。BGP 是一种用于在不同自治系统（AS）之间交换路由信息的路由协议。在 BGP 模式中，kube-vip 在 Kubernetes 集群内部模拟了一个 BGP 路由器，各个节点通过 BGP 会话将路由信息交换给 kube-vip，并由 kube-vip 将流量导向适当的节点。这种模式通常在需要与外部网络进行互连或实现更高级的路由策略时使用，它需要额外的配置和与网络设备（如路由器）的集成。

选择使用哪种模式取决于集群的需求和网络环境。ARP 模式简单易用，适合于较小规模的集群或在没有复杂网络配置的情况下。BGP 模式则适用于更大规模的集群，需要与外部网络进行交互或实现高级路由策略的情况下。

本文演示的示例采用的是 ARP 模式。更多使用方式可参考 kube-vip 文档：https://kube-vip.io/docs/

## 通过 kube-vip 实现 K3s 控制平面高可用

在下面的示例中，首先生成一个用于部署在 K3s 集群中的 kube-vip Manifest，然后再启动一个高可用的 K3s 集群，启动 K3s 集群时会自动部署 kube-vip 的 Manifest 文件，从而实现通过 kube-vip 实现控制平面的高可用。

### 1. 创建 Manifests 文件夹

K3s 有一个可选的 Manifests 目录，K3s 启动时将检查该目录中的 yaml 文件，并自动的在 K3s 中部署，参考：https://docs.k3s.io/installation/packaged-components#auto-deploying-manifests-addons

首先创建此目录，以便稍后将 kube-vip 资源放入其中:

```
mkdir -p /var/lib/rancher/k3s/server/manifests/
```

### 2. 获取 kube-vip RBAC 清单

kube-vip 在 K3s 下作为 DaemonSet 运行，我们需要 RBAC 资源来确保 ServiceAccount 存在并进行绑定，来保它具有与 API 服务器通信所需的权限。

获取 RBAC 清单并将其放置在自动部署目录中：

```
curl https://kube-vip.io/manifests/rbac.yaml > /var/lib/rancher/k3s/server/manifests/kube-vip-rbac.yaml
```

### 3. 生成 kube-vip DaemonSet 清单

```
export VIP=192.168.205.200 # 设置虚拟 IP 用于访问控制平面的地址
export INTERFACE=ens3 # 设置控制平面所在主机的网卡名称
KVVERSION=$(curl -sL https://api.github.com/repos/kube-vip/kube-vip/releases | jq -r ".[0].name")  # 获取 kube-vip 版本
alias kube-vip="docker run --network host --rm ghcr.io/kube-vip/kube-vip:$KVVERSION" # 针对 docker 环境设置别名

# 创建 kube-vip 清单
kube-vip manifest daemonset \
    --interface $INTERFACE \
    --address $VIP \
    --inCluster \
    --taint \
    --controlplane \
    --services \
    --arp \
    --leaderElection > /var/lib/rancher/k3s/server/manifests/kube-vip.yaml
```

### 安装 HA K3s 集群

K3s 支持多种 HA 安装方式，本次示例采用嵌入式 ETCD 的方式搭建高可用的 K3s 集群，这样集群中就存在了 3 个控制平面，然后通过 kube-vip 实现这些控制平面的高可用。

安装 K3s 时需要指定 `--tls-san` 参数，这样 K3s 就会使用 kube-vip 虚拟 IP 地址生成 API 服务器证书。

启动第一个节点：

```
curl -sfL https://rancher-mirror.rancher.cn/k3s/k3s-install.sh | INSTALL_K3S_MIRROR=cn \
    K3S_TOKEN=SECRET sh -s - server \
    --cluster-init \
    --system-default-registry "registry.cn-hangzhou.aliyuncs.com" \
    --tls-san 192.168.205.200
```

使用相同命令启动第二和第三个节点：

```
curl -sfL https://rancher-mirror.rancher.cn/k3s/k3s-install.sh | INSTALL_K3S_MIRROR=cn \
    K3S_TOKEN=SECRET  sh -s - server \
    --server https://<ip or hostname of server1>:6443 \
    --system-default-registry "registry.cn-hangzhou.aliyuncs.com" \
    --tls-san 192.168.205.200
```

检查节点运行情况：

![](https://raw.githubusercontent.com/kingsd041/picture/main/202306282216394.png)

检查 kube-vip daemonset，我们应该会看到 kube-vip-ds 已经成功启动：

![](https://raw.githubusercontent.com/kingsd041/picture/main/202306282218472.png)

## 验证 K3s 控制平面高可用

### 检查虚拟 IP 地址是否有效

kube-vip daemonset 启动成功后，你应该看到 kube-vip 配置的虚拟 IP 地址可以 ping 通：

![](https://raw.githubusercontent.com/kingsd041/picture/main/202306282219680.png)

### 将 kubeconfig 更改为 kube-vip 的虚拟 IP 地址

将 K3s 生成的 kubeconfig 文件下载到本地，并将默认的 127.0.0.1 改为虚拟 IP 地址：192.168.205.200。

![](https://raw.githubusercontent.com/kingsd041/picture/main/202306282220281.png)

![](https://raw.githubusercontent.com/kingsd041/picture/main/202306282221639.png)

可以看到，使用虚拟机 IP 可以继续通过 kubeconfig 访问 Kubernetes API。

### 模拟 K3s 控制平面故障，kube-vip 虚拟 IP 切换

现在我们已经配置了 kube-vip，并且可以通过虚拟 IP 访问到某个控制平面。接下来让我们执行实际测试，看看 kube-vip 虚拟 IP 是否按预期进行故障转移。

此时，可以通过 `ip addr show ens3` 确认虚拟 IP 落在了 k3s1 主机上：

![](https://raw.githubusercontent.com/kingsd041/picture/main/202306282222345.png)

接下来，我们可以将 k3s1 主机关机，模拟故障：

![](https://raw.githubusercontent.com/kingsd041/picture/main/202306282223268.png)

正如你说看到的，当 k3s1 主机发生故障，kube-vip 的虚拟 IP 可以自动切换到其他主机，并且我们可以继续使用该虚拟机 IP 去访问 Kubernetes API：

![](https://raw.githubusercontent.com/kingsd041/picture/main/202306282224359.png)

## 总结

通过使用 kube-vip，我们可以轻松实现 K3s 控制平面的高可用。kube-vip 提供了一个简单而强大的解决方案，通过虚拟 IP 和自动切换机制，确保在 Master 节点故障时，集群仍能持续对外提供服务。

kube-vip 可以通过指定虚拟 IP 和监听端口来监控集群中的 Master 节点的健康状态，并在主节点故障时自动将虚拟 IP 切换到其他节点上。

总之，kube-vip 是实现 K3s 控制平面高可用的理想工具。它的简单安装和配置过程使得任何人都可以轻松部署和管理高可用的 K3s 集群。通过使用 kube-vip，你可以放心地在生产环境中运行 K3s，并确保集群的持续可用性和稳定性。试着在你的环境中尝试一下，并体验它为你带来的好处吧！
