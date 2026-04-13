---
layout: post
title: 如何优雅地关闭 RKE2 或 K3s 集群
subtitle:
date: 2026-4-13 11:07:00 +0800
author: Ksd
header-img: img/post-bg-debug.jpg
catalog: true
tags:
  - RKE2
  - K3S
---

## 操作步骤

如果你需要关闭运行 RKE2 或 K3s Kubernetes 集群的基础设施（例如数据中心维护），本指南提供了按正确顺序执行的步骤，以确保集群安全关闭。

## 1. 创建集群快照

与任何集群维护操作一样，强烈建议在执行该流程之前创建集群快照。

- 对于独立集群，可以在 [RKE2](https://docs.rke2.io/datastore/backup_restore) 和 [K3s](https://docs.k3s.io/datastore/backup-restore) 官方文档中找到快照相关说明。
- 对于由 Rancher 创建的集群，可以在 [Rancher 文档](https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/backup-restore-and-disaster-recovery/back-up-rancher-launched-kubernetes-clusters)中找到对应流程。

## 2. Drain 节点

> 关于 Longhorn 的说明：如果集群中运行了 SUSE Storage（Longhorn），请同时参考 Longhorn 官方文档《Node Maintenance and Kubernetes Upgrade Guide》。在停止 Kubernetes 之前，请确保所有带有存储卷的工作负载已经被驱逐或缩容，并且所有 Longhorn 卷处于“已分离（detached）”状态。

遍历集群中的所有节点（从 worker/agent 节点开始），以优雅方式停止 Pod：

```bash
kubectl drain <NODE_NAME> --ignore-daemonsets --delete-emptydir-data
```

## 3. 停止 agent（worker）节点

在所有仅具备 worker 角色的节点上，通过 SSH 登录节点，停止服务并清理运行时环境。

### 对于 K3s agent 节点：

```bash
sudo systemctl stop k3s-agent
sudo /usr/local/bin/k3s-killall.sh
```

### 对于 RKE2 agent 节点：

```bash
sudo systemctl stop rke2-agent
sudo /usr/local/bin/rke2-killall.sh
```

## 4. 停止 server（控制平面）节点

> 关于角色分离的说明：如果 controlplane 和 etcd 角色是分离的，应先停止 controlplane 节点，然后再停止 etcd 节点。

在 server 节点上，通过 SSH 登录节点，停止服务并清理运行时环境。

### 对于 K3s server 节点：

```bash
sudo systemctl stop k3s
sudo /usr/local/bin/k3s-killall.sh
```

### 对于 RKE2 server 节点：

```bash
sudo systemctl stop rke2-server
sudo /usr/local/bin/rke2-killall.sh
```

## 5. 关闭节点

当所有节点上的服务都已停止，并且 killall 脚本已清理网络和容器运行时相关组件后，可以安全地关闭主机：

```bash
sudo shutdown -h now
```

> 关于网络存储的说明：如果你使用了作为卷的网络附加存储设备（NAS），请在集群完全关闭之后再关闭这些存储设备。

## 6. 关闭后重新启动 Kubernetes

Kubernetes 具备较强的自恢复能力，在遵循特定的启动顺序时，通常无需额外干预即可恢复：

1. **先启动存储：** 确保所有网络存储设备已先启动并处于可用状态。
2. **再启动 server：** 先启动所有 server（control plane 和 etcd）节点，并等待 Kubernetes API 可响应。
3. **最后启动 agent：** 启动 agent 节点。
4. **恢复工作负载：** 将节点标记为可调度，以便工作负载重新调度：

```bash
kubectl uncordon <NODE_NAME>
```

5. **验证状态：** 登录 Rancher UI（或使用 kubectl）确认工作负载已按预期启动。根据工作负载数量和服务器性能，这个过程可能需要几分钟时间。
