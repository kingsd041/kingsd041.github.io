---
layout: post
title: RKE2 使用 DNS 进行高可用部署
subtitle:
date: 2024-2-1 11:07:00 +0800
author: Ksd
header-img: img/post-bg-debug.jpg
catalog: true
tags:
  - RKE2
---

## 目的

本文档的目的是描述使用轮询 DNS 来实现高可用部署 RKE2 Kubernetes 发行版的步骤。

## 说明

在使用 REK2 构建集群时，特别需要注意的是 RKE2 Server 进程在端口 9345 上侦听新节点注册，而 Kubernetes API 则在端口 6443 上提供服务。因此，为了实现集群中节点的互通，确保整个集群的正常运行，需要开放这两个端口，并在 DNS 中将 FQDN 映射为所有 Control-Plane 的主机 IP 地址。

## 环境信息

| 主机名 | 角色          | IP             |
| ------ | ------------- | -------------- |
| ha-m1  | Control-Plane | 192.168.205.85 |
| ha-m2  | Control-Plane | 192.168.205.86 |
| ha-m3  | Control-Plane | 192.168.205.87 |
| ha-w1  | Worker        | 192.168.205.88 |

## 部署架构图

![](https://raw.githubusercontent.com/kingsd041/picture/main/202402041626848.png)

## 安装要求

### 主机要求

可参考官方文档[安装要求](https://docs.rke2.io/zh/install/requirements)章节和[支持矩阵](https://www.suse.com/suse-rke2/support-matrix/all-supported-versions/rke2-v1-29/)。

### DNS 设置

使用 DNS 方案是实验性的，应谨慎使用，因为它主要取决于客户基础设施设置中已运行的企业 DNS 服务的可用性。

配置 FQDN 到 IP 地址映射的步骤取决于所使用的 DNS 设置。**但需要在 DNS 服务器上返回 FQDN 对应的全部 IP 地址**。如果使用其他模式，解析 FQDN 可能只返回一个 IP 地址，那么当节点注册时，无法保证解析的地址上成功运行了 RKE2 Server 服务。以下为在**阿里云云解析 DNS** 中的配置示例：

![](https://raw.githubusercontent.com/kingsd041/picture/main/202402011739914.png)

通过设置“返回全部地址”，`nslookup` 将返回所有配置的 IP 地址：

```
# nslookup rke2.demo.kingsd.top
Server:		114.114.114.114
Address:	114.114.114.114#53

Non-authoritative answer:
Name:	rke2.demo.kingsd.top
Address: 192.168.205.86
Name:	rke2.demo.kingsd.top
Address: 192.168.205.85
Name:	rke2.demo.kingsd.top
Address: 192.168.205.87
```

大多域名注册商都支持多条 A 记录的解析，其实这就是 DNS 轮询，DNS 服务器将解析请求按照 A 记录的顺序，逐一分配到不同的 IP 上，这样就完成了简单的负载均衡。

**优点**

- 基本上无成本，因为往往域名注册商的这种解析都是免费的；
- 部署方便，除了网络拓扑的简单扩增，新增的 Web 服务器只要增加一个公网 IP 即可。

**缺点**

- 健康检查，如果某台服务器宕机，DNS 服务器是无法知晓的，仍旧会将访问分配到此服务器。修改 DNS 记录全部生效起码要 3-4 小时，甚至更久；
- 分配不均，如果几台 Web 服务器之间的配置不同，能够承受的压力也就不同，但是 DNS 解析分配的访问却是均匀分配的。其实 DNS 也是有分配算法的，可以根据当前连接较少的分配、可以设置 Rate 权重分配等等，只是目前绝大多数的 DNS 服务器都不支持；
- 会话保持，如果是需要身份验证的网站，在不修改软件构架的情况下，这点是比较致命的，因为 DNS 解析无法将验证用户的访问持久分配到同一服务器。虽然有一定的本地 DNS 缓存，但是很难保证在用户访问期间，本地 DNS 不过期，而重新查询服务器并指向新的服务器，那么原服务器保存的用户信息是无法被带到新服务器的，而且可能要求被重新认证身份，来回切换时间长了各台服务器都保存有用户不同的信息，对服务器资源也是一种浪费。

参考：https://developer.aliyun.com/article/43118

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

如果想通过域名访问 RKE2 集群，需要先准备好 FQDN 和 所有 Control-Plane 节点 IP 地址的映射。

本例已经提前将 rke2.demo.kingsd.top 通过在 DNS 服务器中使用 A 记录映射到了三个控制节点 `192.168.205.86`、`192.168.205.87`、`192.168.205.88`，并设置 “返回全部地址”。

![](https://raw.githubusercontent.com/kingsd041/picture/main/202402011802175.png)

## 安装高可用 RKE2 集群

### 启动第一个 Server 节点

1. 配置 RKE2 配置文件：

```
root@ha-m1:~# mkdir -p /etc/rancher/rke2/
root@ha-m1:~# cat /etc/rancher/rke2/config.yaml
token: my-shared-secret
tls-san:
  - rke2.demo.kingsd.top
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
ha-m1   Ready    control-plane,etcd,master   16m   v1.26.12+rke2r1
```

默认情况下，Server 节点是可调度的，因此你的工作负载可以在 Server 节点上启动。如果你希望拥有一个不会运行用户工作负载的专用 Control-Plane，你可以使用污点（taint）。node-taint 参数允许你配置带有污点的节点。以下是将节点污点添加到配置文件的示例：

```
node-taint:
  - "CriticalAddonsOnly=true:NoExecute"
```

### 启动其他 Server 节点

其他 Server 节点的启动与第一个节点非常相似，只是你必须指定 `server` 和 `token` 参数，以便它们可以成功连接到初始 Server 节点。

1. 配置 RKE2 配置文件：

```
# cat /etc/rancher/rke2/config.yaml
server: https://rke2.demo.kingsd.top:9345
token: my-shared-secret
tls-san:
  - rke2.demo.kingsd.top
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
NAME    STATUS   ROLES                       AGE     VERSION
ha-m1   Ready    control-plane,etcd,master   28m     v1.26.12+rke2r1
ha-m2   Ready    control-plane,etcd,master   7m10s   v1.26.12+rke2r1
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
server: https://rke2.demo.kingsd.top:9345
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
ha-m1   Ready    control-plane,etcd,master   3h4m   v1.26.12+rke2r1
ha-m2   Ready    control-plane,etcd,master   147m   v1.26.12+rke2r1
ha-m3   Ready    control-plane,etcd,master   167m   v1.26.12+rke2r1
ha-w1   Ready    <none>                      73s    v1.26.12+rke2r1
```

## 总结

通过本文档，你学习了如何使用轮询 DNS 来实现高可用部署 RKE2 Kubernetes 集群。通过配置 DNS 服务器返回多个 Control-Plane 节点的 IP 地址，你可以确保集群中的节点能够被正确访问和注册。
