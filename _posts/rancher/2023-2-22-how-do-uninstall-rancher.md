---
layout: post
title: 如何清理 Rancher 资源
subtitle: 介绍如何清理 Rancher 资源，包括 Rancher 本身和下游集群的节点
date: 2023-2-22 21:10:00 +0800
author: Ksd
header-img: img/post-bg-desk.jpg
catalog: true
tags:
  - Rancher
  - 卸载
---

## 前言

清理 Rancher 通常分为两种情况：

1. 将 Rancher 安装在 Local K8s 集群上，然后想保留 Local 集群将 Rancher 创建的所有资源都清理掉
2. 通过 Rancher 创建的自定义集群，在原主机上将 Rancher 的资源清理掉

本文将分别介绍这两种情况应该如何清理 Rancher

## 清理 Local K8s 集群上的 Rancher

当 Rancher 安装在 K8s 上时，会生成多个 pod、deployment、configmap、crd 等，几乎没办法手动清理掉。

但 Rancher 准备了一个叫 [rancher-cleanup](https://github.com/rancher/rancher-cleanup) 的项目来卸载 Local 集群之上的 Rancher 资源。

> 注意：
> 这将删除 RANCHER 创建的所有资源
> 确保已经创建并测试了你的备份
> 这是一个不可逆的操作

此脚本将删除属于 Rancher 或由 Rancher 创建的所有 Kubernetes 资源（包括已安装的工具，如日志 logging/monitoring/opa gatekeeper 等）。注意：这不会删除任何 Longhorn 资源。

#### 使用清理脚本

使用也非常简单，只需要运行一个 K8s 的 job 即可：

```
# git clone https://github.com/rancher/rancher-cleanup.git
# cd rancher-cleanup
# kubectl create -f deploy/rancher-cleanup.yaml
```

运行的同时可以试试查看清理的进度和日志：

```
kubectl  -n kube-system logs -l job-name=cleanup-job  -f
```

#### 验证

- 使用 `kubectl create -f deploy/verify.yaml` 运行一个 job。
- 使用 `kubectl  -n kube-system logs -l job-name=verify-job  -f` 查看日志，输出应该为空（除了 deprecated 警告）
- 使用 `kubectl  -n kube-system logs -l job-name=verify-job  -f | grep -v "is deprecated"` | 检查完成的日志 grep -v "deprecated"，这将排除 deprecated 警告。

## 清理通过 Rancher 创建的自定义集群

通过 Rancher 创建自定义集群，常用的主要是 RKE、RKE2、K3S，分别介绍如何清理这三种集群：

#### 清理 RKE 集群

首先需要在 Rancher UI 操作删除集群。

如果有残留容器，可执行 rke 节点清理脚本进行清理，参考：https://gist.githubusercontent.com/kingsd041/42d5d644d72820856cbb74a809d1b8ec/raw/036180f0aabf9678cb926f8acd8d1b200e28a97a/cleanup-node.sh

> 注意：避免对你主机原有应用造成影响，请提前阅读脚本，确认是否和你主机上的应用有冲突。

#### 清理 K3S 集群

首先需要在 Rancher UI 操作删除集群。

然后登陆到下游集群的节点，执行：`k3s-uninstall.sh` 或 `k3s-agent-uninstall.sh`

也许 `/etc/rancher/k3s/` 和 `/var/lib/rancher/k3s/` 会有一些残留问题，也可以手动删除。

#### 清理 RKE2 集群

首先需要在 Rancher UI 操作删除集群。

然后登陆到下游集群的节点，执行：`rke2-uninstall.sh` 或 `rke2-agent-uninstall.sh`

也许 `/etc/rancher/rke2/` 和 `/var/lib/rancher/rke2/` 会有一些残留问题，也可以手动删除。
