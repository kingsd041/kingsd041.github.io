---
layout: post
title: RKE2 使用 Kube-VIP 进行高可用部署
subtitle:
date: 2024-2-4 11:07:00 +0800
author: Ksd
header-img: img/post-bg-debug.jpg
catalog: true
tags:
  - RKE2
---

## 目的

本文档的目的是描述使用 Kube-VIP 来实现高可用部署 RKE2 Kubernetes 发行版的步骤。

## 说明

在使用 REK2 构建集群时，特别需要注意的是 RKE2 Server 进程在端口 9345 上侦听新节点注册，而 Kubernetes API 则在端口 6443 上提供服务。因此，为了实现集群中节点的互通，确保整个集群的正常运行，需要开放这两个端口。并且通过 kube-vip 将虚拟 IP 映射到所有 Control-Plane 的主机。

## 环境信息

| 主机名 | 角色          | IP             |
| ------ | ------------- | -------------- |
| ha-m1  | Control-Plane | 192.168.205.85 |
| ha-m2  | Control-Plane | 192.168.205.86 |
| ha-m3  | Control-Plane | 192.168.205.87 |
| ha-w1  | Worker        | 192.168.205.88 |

VIP：192.168.205.200

## 部署架构图

![](https://raw.githubusercontent.com/kingsd041/picture/main/202402041641825.png)

## 安装要求

### 主机要求

可参考官方文档[安装要求](https://docs.rke2.io/zh/install/requirements)章节和[支持矩阵](https://www.suse.com/suse-rke2/support-matrix/all-supported-versions/rke2-v1-29/)。

### RKE2 集群拓扑

生产集群可以使用多种 workload 选项来运行：

1. 对于负载较轻的集群，Control-Plane 可以与 Worker 节点混合在一起使用。
2. 对于高度繁忙的集群，建议卸载 Control-Plane 节点的 Worker 角色，以便 Control-Plane 节点不会受到集群资源的大量使用的影响，Worker 节点只负责处理业务逻辑。

**Control-Plane 节点 (无 Worker 角色)**

| 类型 | 内存 | CPU | 磁盘                   | 网络端口                                         | 最小节点 |
| ---- | ---- | --- | ---------------------- | ------------------------------------------------ | -------- |
| RKE2 | 4    | 4   | 150GiB（建议使用 SSD） | 6443,9345 至所有 Control-Plane Nodes/Worker Node | 1        |

> 如果为 Control-Plane 节点启用了 Worker 角色，还需要根据业务需要增加资源，例如 16GiB RAM、8 个 vCPU 和 250 GiB 存储。

**Worker 节点**

Worker 节点的资源分配取决于实际生产中的也许需求，下面只列出了基本生产环境的配置要求。

| 类型 | 内存 | CPU | 磁盘                   | 网络端口                                                                                                  | 最小节点 |
| ---- | ---- | --- | ---------------------- | --------------------------------------------------------------------------------------------------------- | -------- |
| RKE2 | 16   | 8   | 250GiB（建议使用 SSD） | 所有节点都可以访问 6443/TCP，8472/UDP 用于 CNI，10250/TCP 用于 metrics-server，2379-2380/TCP 用于 ETCD HA | 0        |

### FQDN

如果想通过域名访问 RKE2 集群，需要先准备好 FQDN 和 VIP 地址的映射。

本例直接通过 VIP 去访问集群，如果想通过 FQDN 访问集群，请提前将 FQDN 映射到 VIP 地址：`192.168.205.200`。

### Kube-VIP 要求

Kube-VIP 是一个开源项目，它提供了一种在 Kubernetes 集群中实现虚拟 IP（VIP）高可用的解决方案。VIP 是一个虚拟的 IP 地址，它可以在多个 Control-Plane 节点之间无缝切换，确保服务的持续可用性。Kube-VIP 的工作方式与 keepalive 完全相同，只是它具有一些额外的灵活性，可以根据环境进行配置，例如 Kube-VIP 可以使用：

- ARP - 当使用 ARP 或二层网络时，它将使用 leader 选举。
- BGP - BGP 是一种机制，依赖路由（三层网络）的网络可以确保将新地址广播到路由基础设施
- 路由表 - 路由表模式允许使用其他路由技术，如 ECMP 等。

对于 RKE2 集群设置，我们将使用 ARP 模式，这需要：

- VIP 可在任 Control-Plane 节点之间传输，即与 Control-Plane 节点的子网相同。ARP 通常会向整个网络广播更新，以更新 IP 到硬件（MAC）的映射，从而确保流量被发送到正确的物理或虚拟网络网卡。
- ARP 流量在网络中是公开的。

## 安装高可用 RKE2 集群

### 启动第一个 Server 节点

1. 配置 RKE2 配置文件：

```
root@ha-m1:~# mkdir -p /etc/rancher/rke2/
root@ha-m1:~# cat /etc/rancher/rke2/config.yaml
token: my-shared-secret
tls-san:
  - rke2.demo.kingsd.top
  - 192.168.205.200
```

- token：用于其他 Server 或 Agent 节点在连接集群时注册的 Secret 令牌
- tls-san：这个选项在 Server 的 TLS 证书中增加一个额外的主机名或 IP 作为 Subject Alternative Name。如果你想通过 IP 和主机名访问，你可以将它指定为一个列表。

2. 运行 RKE2 安装程序

```
root@ha-m1:~# curl -sfL https://get.rke2.io | sh -
```

这会将 `rke2-server` 服务和 `rke2` 二进制文件安装到你的主机上。

需要使用 root 用户或通过 sudo 运行，否则会执行失败。

3. 启用 rke2-server 服务

```
root@ha-m1:~# systemctl enable rke2-server.service
```

4. 启动服务

```
root@ha-m1:~# systemctl start rke2-server.service
```

5. 如有需要，可以查看日志

```
root@ha-m1:~# journalctl -u rke2-server -f
```

6. 查看节点运行状态

```
root@ha-m1:~# export KUBECONFIG=/etc/rancher/rke2/rke2.yaml
root@ha-m1:~# /var/lib/rancher/rke2/bin/kubectl get nodes
NAME    STATUS   ROLES                       AGE   VERSION
ha-m1   Ready    control-plane,etcd,master   15m   v1.26.12+rke2r1
```

默认情况下，Server 节点是可调度的，因此你的工作负载可以在 Server 节点上启动。如果你希望拥有一个不会运行用户工作负载的专用 Control-Plane，你可以使用污点（taint）。node-taint 参数允许你配置带有污点的节点。以下是将节点污点添加到配置文件的示例：

```
node-taint:
  - "CriticalAddonsOnly=true:NoExecute"
```

### 在 第一个 Server 节点上安装 kube-vip

参考：https://kube-vip.io/docs/installation/daemonset/

1. 配置用于配置 kube-vip 的环境变量

```
export VIP=192.168.205.200
export INTERFACE=ens3
```

2. 通过解析 GitHub API 获取最新版本的 kube-vip 版本。此步骤需要安装 `jq` 和 `curl`：

```
KVVERSION=$(curl -sL https://api.github.com/repos/kube-vip/kube-vip/releases | jq -r ".[0].name")
```

3. 应用 RBAC 清单：

```
kubectl apply -f https://kube-vip.io/manifests/rbac.yaml
```

4. 创建 daemonset 清单以运行 kube-vip:

```
alias ctr="/var/lib/rancher/rke2/bin/ctr --address /run/k3s/containerd/containerd.sock"
alias kube-vip="ctr image pull ghcr.io/kube-vip/kube-vip:$KVVERSION; ctr run --rm --net-host ghcr.io/kube-vip/kube-vip:$KVVERSION vip /kube-vip"

kube-vip manifest daemonset \
    --interface $INTERFACE \
    --address $VIP \
    --inCluster \
    --taint \
    --controlplane \
    --arp \
    --leaderElection | tee /var/lib/rancher/rke2/server/manifests/kube-vip.yaml
```

5. 检查 kube-vip pod 是否正在运行:

查找正在运行的 kube-vip Pod：

```
/var/lib/rancher/rke2/bin/kubectl get pod -n kube-system | grep kube-vip
```

找到当选为 leader 的节点：

```
/var/lib/rancher/rke2/bin/kubectl logs --tail 100 -n kube-system <pod_from_above> | grep -i leader
```

6. 验证浮动 IP 状态：

```
ping 192.168.205.200
```

### 启动其他 Server 节点

其他 Server 节点的启动与第一个节点非常相似，只是你必须指定 `server` 和 `token` 参数，以便它们可以成功连接到初始 Server 节点。

1. 配置 RKE2 配置文件：

```
# cat /etc/rancher/rke2/config.yaml
server: https://192.168.205.200:9345
token: my-shared-secret
tls-san:
  - rke2.demo.kingsd.top
  - 192.168.205.200
```

2. 运行 RKE2 安装程序

```
root@ha-m2:~# curl -sfL https://get.rke2.io | sh -
```

3. 启用 rke2-server 服务

```
root@ha-m2:~# systemctl enable rke2-server.service
```

4. 启动服务

```
root@ha-m2:~# systemctl start rke2-server.service
```

5. 如有需要，可以查看日志

```
root@ha-m2:~# journalctl -u rke2-server -f
```

6. 查看节点运行状态

```
root@ha-m2:~# export KUBECONFIG=/etc/rancher/rke2/rke2.yaml
root@ha-m2:~# /var/lib/rancher/rke2/bin/kubectl get nodes
NAME    STATUS   ROLES                       AGE   VERSION
ha-m1   Ready    control-plane,etcd,master   24h   v1.26.12+rke2r1
ha-m2   Ready    control-plane,etcd,master   11m   v1.26.12+rke2r1
```

在保证 Server 节点**总数为奇数**的情况下，可以添加多个 Server 节点，添加节点步骤和配置均与添加第二个 Server 节点的方式相同。

根据文章开头介绍的部署架构图，本文搭建了 3 个 Server 节点：

```
root@ha-m2:~# export KUBECONFIG=/etc/rancher/rke2/rke2.yaml
root@ha-m2:~# /var/lib/rancher/rke2/bin/kubectl get nodes
NAME    STATUS   ROLES                       AGE    VERSION
ha-m1   Ready    control-plane,etcd,master   3h4m   v1.26.12+rke2r1
ha-m2   Ready    control-plane,etcd,master   147m   v1.26.12+rke2r1
ha-m3   Ready    control-plane,etcd,master   167m   v1.26.12+rke2r1
```

### 可选：加入 Agent 节点

> 因为 RKE2 Server 节点具有 Worker 角色，所以集群中即使没有 Worker 节点也可以创建 workload。

在 HA 集群中加入 Agent 节点与在[单个 Server 集群中加入 Agent 节点](https://docs.rke2.io/install/quickstart#linux-agent-worker-node-installation)是一样的。你只需要指定 Agent 应该注册的 URL 和要使用的 Token 即可。

1. 配置 RKE2 Agent 配置文件：

```
root@ha-w1:~# cat /etc/rancher/rke2/config.yaml
server: https://192.168.205.200:9345
token: my-shared-secret
```

2. 运行 RKE2 安装程序

```
root@ha-w1:~# curl -sfL https://get.rke2.io | INSTALL_RKE2_TYPE="agent" sh -
```

3. 启用 rke2-server 服务

```
root@ha-w1:~# systemctl enable rke2-agent.service
```

4. 启动服务

```
root@ha-w1:~# systemctl start rke2-agent.service
```

5. 如有需要，可以查看日志

```
root@ha-w1:~# journalctl -u rke2-agent -f
```

6. 查看节点运行状态

```
root@ha-m1:~# /var/lib/rancher/rke2/bin/kubectl get nodes
NAME    STATUS   ROLES                       AGE    VERSION
ha-m1   Ready    control-plane,etcd,master   25h    v1.26.12+rke2r1
ha-m2   Ready    control-plane,etcd,master   40m    v1.26.12+rke2r1
ha-m3   Ready    control-plane,etcd,master   24m    v1.26.12+rke2r1
ha-w1   Ready    <none>                      106s   v1.26.12+rke2r1
```

## 总结

通过使用 kube-vip 实现了 RKE2 Kubernetes 发行版的高可用部署，确保了集群中的 Control-Plane 节点之间的通信和可用性。同时，根据部署架构图和步骤，成功安装了一个由多个 Control-Plane 节点组成的高可用集群，并且可选地加入了 Agent 节点。这样的部署能够提供更高的可用性和容错能力，确保了 Kubernetes 集群的稳定运行。
