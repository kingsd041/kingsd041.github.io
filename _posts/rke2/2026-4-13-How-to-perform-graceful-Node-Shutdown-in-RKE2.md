---
layout: post
title: 如何优雅的关闭 RKE2 节点
subtitle:
date: 2026-4-13 11:07:00 +0800
author: Ksd
header-img: img/post-bg-debug.jpg
catalog: true
tags:
  - RKE2
---

## 操作步骤

在 RKE2 中，为了在维护场景下实现节点的优雅关机，可以按照以下步骤对节点进行 `cordon` 和 `drain` 操作：

### 1. 将节点标记为不可调度

```bash
kubectl cordon <node name>
```

### 2. 驱逐节点上的 Pod

将节点上的所有 Pod 驱逐，包括受 Pod Disruption Budget（PDB）限制的 Pod：

```bash
kubectl drain <node name> --ignore-daemonsets --force
```

## Worker 节点操作

1. 停止 rke2-agent 服务：

```bash
sudo systemctl stop rke2-agent
```

2. 检查是否仍有未停止的容器进程：

```bash
sudo ps auxfww
```

## 控制平面 / etcd 节点操作

1. 停止 rke2-server 服务：

```bash
sudo systemctl stop rke2-server
```

2. 检查是否仍有未停止的容器进程：

```bash
sudo ps auxfww
```

## 停止剩余进程（可选）

如果所有应用工作负载已经停止，在节点关机前通常不需要执行此步骤。但在某些情况下，你可能希望停止所有残留的容器进程以及 containerd 等组件。

1. 确认节点上没有正在运行的应用工作负载：

```bash
kubectl describe node <node name>
```

2. 如果所有工作负载已经被调度到其他节点，可以使用 rke2-killall.sh 脚本停止残留进程：

```bash
sudo /usr/local/bin/rke2-killall.sh
```

> 注意：rke2-killall.sh 脚本使用 SIGKILL 信号强制终止进程，这可能会对仍在运行的有状态应用产生负面影响。对于有状态工作负载，建议优先采用发送 SIGTERM 并设置超时的方式，再考虑使用 SIGKILL。
>
> 另外，在执行任何节点维护操作之前，请务必先进行 etcd 快照备份。


## 恢复节点服务

1. 维护完成后，重新启动服务：

   * Worker（agent）节点：

     ```bash
     sudo systemctl start rke2-agent
     ```
   * 控制平面（server）节点：

     ```bash
     sudo systemctl start rke2-server
     ```

2. 将节点重新标记为可调度：

```bash
kubectl uncordon <node name>
```
