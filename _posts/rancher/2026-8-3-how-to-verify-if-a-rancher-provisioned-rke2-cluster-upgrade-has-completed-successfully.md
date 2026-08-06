---
layout: post
title: 如何确认 Rancher 配置的 RKE2 集群升级已成功完成
subtitle: 通过 Rancher UI、Rancher Manager 日志、节点状态与系统组件检查，验证 RKE2 集群升级是否已顺利结束
date: 2026-8-3 11:06:00 +0800
author: Ksd
header-img: img/post-bg-desk.jpg
catalog: true
tags:
  - Rancher
  - RKE2
  - Upgrade
---

在 Rancher 管理下创建的 RKE2 集群升级过程中，用户最关心的往往不是“升级命令是否已发出”，而是“升级是否真的已经完成”。

本文重点介绍如何验证 Rancher 管理的 RKE2 集群升级是否已成功结束，并给出一组可直接执行的检查方法。

## 前言

通常情况下，只要下游集群升级已经完全结束，Rancher UI 中该集群的状态会自动恢复为 `Active`。不过如果你想进一步确认升级是否真的已经完成，或者排查升级看起来“卡住”的情况，可以采用以下几个高级验证步骤。

## 1. 监控 Rancher Manager 日志

要确认 Rancher 管理平面已经完成对所有节点升级计划的下发，可以查看上游/local 集群中的 Rancher pod 日志。

### 命令

在上游/local Rancher 集群中执行：

```bash
kubectl logs -n cattle-system -l app=rancher --tail=1000 | grep -E "planner|rkecluster"
```

### 示例输出

```text
2026/03/25 13:10:15 [INFO] [planner] rkecluster fleet-default/rke2-mnt-opt: configuring worker node(s) rke2-mnt-opt-wk-4x6xz-ggpsc,rke2-mnt-opt-wk-4x6xz-kztnc
2026/03/25 13:10:19 [INFO] [planner] rkecluster fleet-default/rke2-mnt-opt: configuring worker node(s) rke2-mnt-opt-wk-4x6xz-kztnc: waiting for plan to be applied
2026/03/25 13:10:38 [INFO] [planner] rkecluster fleet-default/rke2-mnt-opt: configuring worker node(s) rke2-mnt-opt-wk-4x6xz-kztnc: waiting for probes: kubelet
2026/03/25 13:10:43 [INFO] [planner] rkecluster fleet-default/rke2-mnt-opt: configuring worker node(s) rke2-mnt-opt-wk-4x6xz-kztnc: waiting for probes: calico
```

### 成功判断

当所有节点都已经按计划完成配置后，planner 日志应从反复出现的 `waiting for plan`、`waiting for probes` 等状态过渡到空闲状态。也就是说，升级计划已经被完整下发并持续完成，不再有持续的重试或反复 reconciliation。

## 2. 通过 Rancher UI 的 Provisioning Log 验证

你还可以直接在 Rancher UI 中查看节点滚动升级的状态。

### 操作步骤

1. 登录 Rancher UI
2. 进入左侧导航栏中的 `Cluster Management`
3. 点击目标 Rancher 配置的 RKE2 集群名称
4. 进入 `Provisioning Log` 标签页

### 成功判断

如果整轮升级已成功完成，日志中应出现如下最终结果：

```text
[INFO ] provisioning done
```

这意味着节点升级和配置工作已经全部结束，系统已经完成了最终状态收敛。

## 3. 检查核心 Add-on Helm Job 是否已完成

在 RKE2 升级期间，核心 Add-on（例如 CNI、Ingress、CoreDNS）通常会通过 Kubernetes Job 的方式进行升级。因此，需确认这些系统安装 Job 都已成功完成。

### 命令

在下游集群上执行：

```bash
kubectl get jobs -n kube-system
```

### 示例输出

```text
NAME                                        STATUS     COMPLETIONS   DURATION   AGE
helm-install-rke2-calico                    Complete   1/1           13s        21m
helm-install-rke2-calico-crd                Complete   1/1           22s        21m
helm-install-rke2-coredns                   Complete   1/1           12s        21m
helm-install-rke2-ingress-nginx             Complete   1/1           70s        21m
helm-install-rke2-metrics-server            Complete   1/1           9s         21m
helm-install-rke2-runtimeclasses            Complete   1/1           7s         21m
helm-install-rke2-snapshot-controller       Complete   1/1           8s         21m
```

### 成功判断

所有 `helm-install-rke2-*` Jobs 都应显示为：

- `STATUS: Complete`
- `COMPLETIONS: 1/1`

## 4. 验证 Helm 安装 Release 日志

除了确认 Job 状态，还应查看相关安装任务的日志，确认没有出现升级失败或部署异常。

### 命令

在下游集群中针对目标 Job 执行：

```bash
kubectl logs -n kube-system job/helm-install-rke2-calico
```

### 示例输出

```text
Upgrading rke2-calico
Release "rke2-calico" has been upgraded. Happy Helming!
NAME: rke2-calico
LAST DEPLOYED: Mon Jun  1 09:54:03 2026
NAMESPACE: kube-system
STATUS: deployed
REVISION: 2
TEST SUITE: None
+ exit
```

### 成功判断

安装日志应结尾显示：

```text
STATUS: deployed
```

这表示对应 Helm Release 已成功升级并完成部署。

## 5. 验证节点 Ready 状态和 Kubernetes 版本

升级完成后，还需要确认所有节点都已经成功切换到目标版本，并保持健康状态。

### 命令

```bash
kubectl get nodes -o wide
```

### 示例输出

```text
NAME                          STATUS   ROLES                              AGE   VERSION           INTERNAL-IP       EXTERNAL-IP   OS-IMAGE             KERNEL-VERSION     CONTAINER-RUNTIME
rke2-mnt-opt-cp-mfgdx-tnhmw   Ready    control-plane,etcd,master,worker   71m   v1.32.13+rke2r1   143.110.162.252   <none>        Ubuntu 24.04.3 LTS   6.8.0-71-generic   containerd://2.1.5-k3s1
rke2-mnt-opt-wk-4x6xz-g289f   Ready    worker                             67m   v1.32.13+rke2r1   161.35.165.145    <none>        Ubuntu 24.04.3 LTS   6.8.0-71-generic   containerd://2.1.5-k3s1
rke2-mnt-opt-wk-4x6xz-ggpsc   Ready    worker                             67m   v1.32.13+rke2r1   138.68.190.185    <none>        Ubuntu 24.04.3 LTS   6.8.0-71-generic   containerd://2.1.5-k3s1
rke2-mnt-opt-wk-4x6xz-kztnc   Ready    worker                             67m   v1.32.13+rke2r1   138.68.190.186    <none>        Ubuntu 24.04.3 LTS   6.8.0-71-generic   containerd://2.1.5-k3s1
```

### 成功判断

- 所有节点的状态都应为 `Ready`
- `VERSION` 列中的版本号应与目标升级版本一致，例如：`v1.32.13+rke2r1`

## 6. 验证系统 Pod 健康状态

升级完成后，还需要确认系统组件本身运行正常，尤其是 CNI、CoreDNS、Ingress、Proxy 和 Control Plane 相关 Pod。

### 命令

```bash
kubectl get pods -n kube-system
```

### 示例输出

```text
NAME                                                   READY   STATUS      RESTARTS   AGE
etcd-rke2-mnt-opt-cp-mfgdx-tnhmw                       1/1     Running     0          30m
helm-install-rke2-canal-skmdv                          0/1     Completed   0          30m
helm-install-rke2-coredns-8cgv2                        0/1     Completed   0          30m
helm-install-rke2-ingress-nginx-6r6zd                  0/1     Completed   0          30m
helm-install-rke2-metrics-server-cxcv6                 0/1     Completed   0          30m
helm-install-rke2-runtimeclasses-x7hxd                 0/1     Completed   0          30m
helm-install-rke2-snapshot-controller-8ngsm            0/1     Completed   0          30m
kube-apiserver-rke2-mnt-opt-cp-mfgdx-tnhmw             1/1     Running     0          30m
kube-controller-manager-rke2-mnt-opt-cp-mfgdx-tnhmw    1/1     Running     0          30m
kube-scheduler-rke2-mnt-opt-cp-mfgdx-tnhmw             1/1     Running     0          30m
kube-proxy-rke2-mnt-opt-mfgdx                          1/1     Running     0          30m
kube-proxy-rke2-mnt-opt-wk-4x6xz-g289f                 1/1     Running     0          29m
kube-proxy-rke2-mnt-opt-wk-4x6xz-ggpsc                 1/1     Running     0          29m
kube-proxy-rke2-mnt-opt-wk-4x6xz-kztnc                 1/1     Running     0          28m
rke2-canal-4x7ws                                       2/2     Running     0          29m
rke2-canal-drzk4                                       2/2     Running     0          29m
rke2-canal-mfgdx                                       2/2     Running     0          30m
rke2-coredns-rke2-coredns-6c4d6868d-r4nrs              1/1     Running     1          29m
rke2-ingress-nginx-controller-k9lrm                    1/1     Running     0          28m
rke2-ingress-nginx-controller-rgnjj                    1/1     Running     0          27m
rke2-ingress-nginx-controller-v9s5h                    1/1     Running     0          29m
rke2-metrics-server-cb87ff84d-bcql5                    1/1     Running     0          29m
```

### 成功判断

- 常驻系统组件 Pod 应为 `Running`，且容器健康状态正常（例如 `1/1` 或 `2/2 READY`）
- `helm-install-rke2-*` 等系统安装 Job 的 Pod 应为 `Completed`

## 最终建议

如果你想确认一次 Rancher 管理的 RKE2 集群升级是否已经真正完成，最稳妥的方式是同时检查以下几项：

1. Rancher UI 中集群状态恢复为 `Active`
2. Rancher UI 的 Provisioning Log 里出现 `provisioning done`
3. `kubectl get jobs -n kube-system` 中所有核心 Job 全部为 `Complete`
4. `kubectl get nodes -o wide` 中所有节点均为 `Ready` 且版本一致
5. `kubectl get pods -n kube-system` 中系统 Pod 正常运行

当以上条件同时满足时，可以认为 Rancher 配置的 RKE2 集群升级已经成功完成。
