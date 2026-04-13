---
layout: post
title: SUSE Virtualization 节点故障处理机制深度解析
subtitle:
date: 2026-1-4 11:06:00 +0800
author: Ksd
header-img: img/post-bg-desk.jpg
catalog: true
tags:
  - Harvester
---

SUSE Virtualization 是一款云原生的超融合基础设施（HCI）平台解决方案，专为在数据中心、多云以及边缘环境中运行虚拟机和容器工作负载进行了优化。

本文将重点介绍 **SUSE Virtualization 的节点故障应对策略**。你将了解到 Kubernetes 是如何处理节点故障的，以及 SUSE Virtualization 如何基于这些能力，确保工作负载的高可用性与可靠性。

## Kubernetes 的节点故障处理机制

在深入介绍 SUSE Virtualization 的具体策略之前，先了解 Kubernetes 是如何管理节点故障的非常重要。

首先，我们需要了解 Kubernetes 监控节点状态时涉及的几种常见 Condition：

- **Ready**：表示节点健康，可以正常接收 Pod。
- **NotReady**：表示节点资源不足，或 kubelet 工作异常。
- **Unknown**：表示节点状态未知，通常由网络异常导致。

那么，Kubernetes 是如何在 Ready 和 Unknown 等状态之间进行切换的呢？
根据官方文档，Kubernetes 通过 **心跳（heartbeat）机制** 来监控节点健康状态，其中涉及三个关键参数：

- **node-status-update-frequency**：kubelet 向 Node Controller 发送节点状态更新的时间间隔，默认值为 **10 秒**。
- **node-monitor-period**：Node Controller 检查节点状态的频率，默认值为 **5 秒**。
- **node-monitor-grace-period**：在未收到心跳的情况下，Node Controller 等待多长时间后将节点标记为 NotReady 或 Unknown，默认值为 **40 秒**。

`node-status-update-frequency` 决定了 kubelet 向 Node Controller 上报状态的频率；Node Controller 每隔 `node-monitor-period` 检查一次节点状态；如果在 `node-monitor-grace-period` 时间内未收到节点心跳，Node Controller 就会将该节点标记为 NotReady 或 Unknown。

因此，在默认配置下，如果节点连续 **4 次（约 40 秒）** 未上报心跳，就会被标记为 NotReady 或 Unknown。

## SUSE Virtualization 的节点故障应对策略

SUSE Virtualization 为虚拟机工作负载提供了云原生能力，这意味着它必须能够有效地处理节点故障，以确保虚拟机的高可用性和稳定性。

SUSE Virtualization 以 **KubeVirt** 作为虚拟化层，在 Kubernetes 之上管理虚拟机。其节点故障应对策略的核心目标是：
**在检测到节点故障后，能够自动将虚拟机重新调度到健康节点上。**

为此，需要解决两个关键问题：

1. **KubeVirt 如何检测节点故障**
2. **SUSE Virtualization 如何重新调度虚拟机**

对于第一个问题，SUSE Virtualization 依赖的仍然是 Kubernetes 的节点故障检测机制：当节点被标记为 **NotReady 或 Unknown** 时，KubeVirt 会将其视为故障节点，并触发相应的节点故障处理逻辑。

节点故障通常意味着一次 **非正常关机（non-graceful shutdown）**。在这种情况下，即便 KubeVirt 触发了虚拟机迁移，迁移过程也往往会因为遗留的 **VolumeAttachment 孤儿资源** 而失败。

从 **Kubernetes v1.28** 开始，可以使用 `node.kubernetes.io/out-of-service` 这个 taint 来标记节点为已停止服务，对应的孤儿资源（例如 VolumeAttachment）将会被自动清理。

因此，在第二个问题上，SUSE Virtualization 会在检测到节点故障后：

- 自动重新调度虚拟机到健康节点
- 为故障节点添加 `node.kubernetes.io/out-of-service` taint

这样既能确保孤儿资源被正确清理，也能保证虚拟机可以顺利在其他节点上重新启动。

## Demo 演示

### 1. 创建一个包含多个节点的 SUSE Virtualization 集群

（演示中使用一个两节点集群）

```bash
# kubectl get nodes
NAME               STATUS   ROLES                AGE   VERSION
harvester-node-0   Ready    control-plane,etcd   37h   v1.34.2+rke2r1
harvester-node-1   Ready    <none>               37h   v1.34.2+rke2r1
```

### 2. 在 `harvester-node-1` 上创建一个虚拟机

```bash
# kubectl get vmi
NAME        AGE   PHASE     IP           NODENAME           READY
demo-vm01   52s   Running   10.52.1.37   harvester-node-1   True
```

### 3. 模拟节点故障

关闭 `harvester-node-1`，或断开其网络连接

```bash
# date -u +"%Y-%m-%d %H:%M:%S %Z"; ip link set dev mgmt-br down
2025-12-28 21:04:26 UTC
```

### 4. 查看节点状态变化

```yaml
- lastHeartbeatTime: "2025-12-28T21:01:47Z"
  lastTransitionTime: "2025-12-28T21:05:12Z"
  message: Kubelet stopped posting node status.
  reason: NodeStatusUnknown
  status: Unknown
  type: Ready
```

可以看到，大约 **40 秒左右** 后，节点被标记为 `Unknown`：
`2025-12-28T21:05:12Z - 2025-12-28 21:04:26Z ≈ 46 秒`

### 5. 查看是否触发了迁移

```yaml
taints:
  - effect: NoSchedule
    key: kubevirt.io/drain
```

### 6. 确认虚拟机已被重新调度到 `harvester-node-0`

```bash
# kubectl get vmi
NAME        AGE     PHASE     IP           NODENAME           READY
demo-vm01   2m11s   Running   10.52.0.88   harvester-node-0   True
```

### 7. 确认故障节点被打上 out-of-service taint

```yaml
taints:
  - effect: NoExecute
    key: node.kubernetes.io/out-of-service
```

## 总结

总体来看，SUSE Virtualization 充分利用了 Kubernetes 的节点故障检测机制以及 KubeVirt 的虚拟化能力，为虚拟机工作负载提供了高可用、可靠的运行环境。

通过在节点故障发生时自动重新调度虚拟机，并清理遗留的孤儿资源，SUSE Virtualization 在云原生架构下提供了一套健壮、成熟的节点故障处理方案。

## 可选的高级配置参数

你还可以通过以下配置，对 SUSE Virtualization 集群中的节点故障检测灵敏度进行调优：

```yaml
VMForceResetPolicy:
  Enabled: true
  Period: 15 # 单位：秒，默认 15 秒
  VMMigrationTimeout: 180 # 单位：秒，默认 180 秒
```

参数说明：

- **Period**：在节点被判定为故障后，等待多长时间再为节点添加 `kubevirt.io/drain` taint，从而触发虚拟机迁移。
- **VMMigrationTimeout**：在迁移超时后，等待多长时间再为节点添加 `node.kubernetes.io/out-of-service` taint，用于强制清理孤儿资源。

在默认配置下，一次完整的故障处理流程大致耗时为：

- Kubernetes 节点故障检测：约 **45 秒**
- Period：**15 秒**
- VMMigrationTimeout：**180 秒**
- 实际虚拟机迁移耗时

整体通常需要 **4 ～ 5 分钟**。

如果希望缩短故障恢复时间，可以优先调整 `Period` 和 `VMMigrationTimeout`；如果还需要更高的敏感度，也可以进一步调整 Kubernetes 的节点故障检测参数（如前文所述）。

## 附录

SUSE Virtualization 下游集群所使用的 **Harvester CSI Driver**，在处理存储卷相关操作时，也实现了自身的节点故障处理策略。这能够在下游集群节点发生故障时，进一步提升整体系统的可靠性与韧性。
