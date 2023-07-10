---
layout: post
title: 探索 K3s 简单高效的多云和混合云部署
subtitle: 本文将介绍如何通过 “嵌入式 k3s 多云” 和 “与 Tailscale VPN 集成” 两种方案实现 K3s 的多云和混合云部署。
date: 2023-7-7 11:06:00 +0800
author: Ksd
header-img: img/post-bg-desk.jpg
catalog: true
tags:
  - K3s
---

在当今企业环境中，混合云和多云环境正逐渐成为趋势。企业面临着市场需求的不断变化、灵活性要求以及数据安全和合规性的挑战。为满足这些需求，企业需要一种适应性强、易于管理的解决方案。在这方面，K3s 作为一种轻量级的 Kubernetes 发行版，可以部署在没有公网 IP 且节点之间不直连的节点上（例如不同公有云中的节点）。K3s 正成为了在混合云和多云环境中部署和管理容器化应用的理想选择。

K3s 有两种主要方案来满足混合云和多云环境的需求：

- 嵌入式 k3s 多云解决方案
- 与 Tailscale VPN 集成

本文将针对这两种方案来展开介绍。

> 警告：
> 1. 多云场景下，节点之间的延迟会变高。延迟太高会降低网络性能，还可能影响集群的运行。
> 2. 此类部署不支持嵌入式 etcd。如果使用嵌入式 etcd，所有 Server 节点必须通过其私有 IP 相互访问。Agent 可能分布在多个网络上，但所有 server 都应该位于同一位置。

## 嵌入式 k3s 多云解决方案

K3s 可以使用 wireguard 为集群流量建立 VPN 网格。每个节点都必须具有唯一的 IP（通常是公网 IP），可以通过 IP 访问节点。K3s Supervisor 流量使用 WebSocket 隧道进行传输，而集群网络接口（Container Network Interface，CNI）的流量则使用 WireGuard 隧道。

这种配置方式提供了一种安全的方法来建立节点之间的通信通道。WireGuard 是一种现代的 VPN 协议，通过使用高效的加密算法和精简的代码实现，提供了快速、安全和可靠的网络连接。通过使用 WireGuard 隧道，K3s 可以在集群中传输数据，同时确保数据的机密性和完整性。

要启用这种类型的部署，你必须在 K3s Server 中添加以下参数：

```
--node-external-ip=<SERVER_EXTERNAL_IP> --flannel-backend=wireguard-native --flannel-external-ip
```

Agent 节点添加以下参数：

```
--node-external-ip=<AGENT_EXTERNAL_IP>
```

其中 `SERVER_EXTERNAL_IP` 是访问 Server 节点的公网 IP，`AGENT_EXTERNAL_IP` 是访问 Agent 节点的公网 IP。`SERVER_EXTERNAL_IP` 和 `AGENT_EXTERNAL_IP` 之间需要保持连接，并且通常使用公网 IP。

### 实践

本节将演示如何在多云环境上通过公网 IP 来构建 K3s 集群。**K3s server 所在实例为 AWS，K3s agent 所在实例为 aliyun**，如下图：

![](https://raw.githubusercontent.com/kingsd041/picture/main/202307081131596.png)

**AWS 实例安装 K3s server 节点**

```
curl -sfL https://get.k3s.io | K3S_TOKEN=toke sh -s - \
    --node-external-ip="3.96.164.33" \
    --flannel-backend=wireguard-native \
    --flannel-external-ip
```

**Aliyun 实例安装 K3s agent 节点**

```
curl -sfL https://get.k3s.io | \
    K3S_URL=https://3.96.164.33:6443 \
    K3S_TOKEN=token sh -s - \
    --node-external-ip=47.119.165.155
```

集群安装后，可获取集群节点信息：

![](https://raw.githubusercontent.com/kingsd041/picture/main/202307081148817.png)

在 K3s 中，如果配置参数指定了 `node-external-ip`，K3s 会为节点自动添加 `flannel.alpha.coreos.com/public-ip-overwrite`，以便 flannel 可以自动配置正确的对外 IP。

![](https://raw.githubusercontent.com/kingsd041/picture/main/202307081150794.png)

![](https://raw.githubusercontent.com/kingsd041/picture/main/202307081151674.png)

接下来分别在这两个节点上创建 pod，可以看到夸云之间 pod 可以相互访问：

![](https://raw.githubusercontent.com/kingsd041/picture/main/202307081427580.png)

## 与 Tailscale VPN 集成

> 在 v1.27.3、v1.26.6、v1.25.11 和更高版本中可用。

K3s 支持与 VPN 集成，Tailscale 是 K3s 纳入第一个 VPN 选项，K3s 节点可使用 Tailscale VPN 服务在节点之间构建网格。

Tailscale VPN 利用加密技术建立了一个安全的网络隧道，允许位于不同云平台的节点之间进行安全的通信。在混合云和多云环境中，安全的网络连接至关重要。通过集成 Tailscale VPN，K3s 为企业提供了可靠的网络互连，确保了在分布式环境中容器之间的通信安全和可靠性。

本节将介绍如何通过集成的 Tailscale 搭建一个不暴露在公网上的 K3s 集群。

演示集群由三个节点组成，**我将在本地局域网的一个虚拟机作为 K3s server 节点(K3s1)，将阿里云(izwz9eox9l8h9wh9bazd2hz)和 AWS(ip-172-31-7-7)的两台实例分别作为 agent 节点添加到 K3s server 节点，从而搭建一个混合云场景的 K3s 集群。**

![](https://raw.githubusercontent.com/kingsd041/picture/main/202307081556554.png)

### 安装并配置 Tailscale

在部署 K3s 之前，我们需要安装并配置 Tailscale：

1. 登录到你的 Tailscale 帐户

2. 在 `Settings > Keys` 中，生成一个授权密钥（$AUTH-KEY），它可以被集群中的所有节点重复使用：

![](https://raw.githubusercontent.com/kingsd041/picture/main/202307081444965.png)

![](https://raw.githubusercontent.com/kingsd041/picture/main/202307081445210.png)

本例获取的 `AUTH-KEY` 为：`tskey-auth-kfZp9F4CNTRL-Kj3sqcKW4i7zY3cCq2q7h7uhXitJutpY`

3. 定义 K3s 集群使用的 pod CIDR（默认 10.42.0.0/16）网络策略。在 Access Controls 中附加 CIDR（或双栈的 CIDR）：

```
"autoApprovers": {
        "routes": {
            "10.42.0.0/16":        ["kingsd041@gmail.com"],
            // "2001:cafe:42:0::/56": ["your_account@xyz.com"],
        },
    },
```

4. 在**每个节点**中安装 Tailscale：

```
curl -fsSL https://tailscale.com/install.sh | sh
```

### 部署 K3s 集群

接下来就可以部署 K3s 集群，要部署启用了 Tailscale 集成的 K3s，你必须在**每个节点**上添加以下参数：

```
--vpn-auth="name=tailscale,joinKey=$AUTH-KEY
```

**启动 K3s server 节点：**

K3s server 节点执行：

```
curl -sfL https://get.k3s.io | sh -s - \
    --vpn-auth="name=tailscale,joinKey=tskey-auth-kfZp9F4CNTRL-Kj3sqcKW4i7zY3cCq2q7h7uhXitJutpY"
```

K3s 安装成功后，会自动将该节点注册到 Tailscale 中，并在 Tailscale 中生成一个可用于 VPN 网络内访问的 IP 地址：

![](https://raw.githubusercontent.com/kingsd041/picture/main/202307081515094.png)

接下来，在注册 agent 节点时，就可以通过 Tailscale 提供的 `100.105.190.87` 作为 K3s server 节点 IP 去注册：

**注册 K3s agent 节点：**

分别在 AWS 和 阿里云的实例上执行相同命令，将节点注册到我家里局域网内的 K3s server 节点：

```
curl -sfL https://get.k3s.io | \
    K3S_URL=https://100.105.190.87:6443 \
    K3S_TOKEN=mynodetoken sh -s - \
    --vpn-auth="name=tailscale,joinKey=tskey-auth-kfZp9F4CNTRL-Kj3sqcKW4i7zY3cCq2q7h7uhXitJutpY"
```

K3s 三个节点都启动成功后，我们就可以在 Tailscale 控制台看见三个节点均自动注册到 Tailscale 中。

![](https://raw.githubusercontent.com/kingsd041/picture/main/202307081533254.png)

并且，三个节点之间可以通过 Tailscale 提供的 `100.` 开头的 IP 地址进行相互通信：

![](https://raw.githubusercontent.com/kingsd041/picture/main/202307081534957.png)

当然，跨主机之间的 pod 也是可以相互通信的：

![](https://raw.githubusercontent.com/kingsd041/picture/main/202307081538897.png)

以上，我们就完成了使用 Tailscale VPN 服务构建的私有网络上部署 K3s 集群，并且集群节点不对外暴露任何信息。如果你的 PC 端也注册到 Tailscale，那么你就可以完全通过 Tailscale 提供的私有网络来访问 K3s 集群。

## 总结

混合云和多云环境为企业提供了灵活性、性能优化和资源管理的机会，但也带来了复杂性和安全性的挑战。K3s 作为一种适应混合云和多云环境的容器编排解决方案，通过其嵌入式多云解决方案和 Tailscale VPN 的集成，为企业提供了一种简化管理、安全可靠的选择。通过采用 K3s，企业能够更好地应对混合云和多云环境带来的挑战，并实现更高效的应用部署和管理。
