---
layout: post
title: Rancher v2.15 新监控模式实践：在离线环境中安装 kube-prometheus-stack
subtitle: 以 Rancher + Harbor + K3s/RKE2 为例，说明如何在离线环境中准备镜像、上传私有仓库并完成 kube-prometheus-stack 部署

date: 2026-9-23 11:06:00 +0800
author: Ksd
header-img: img/post-bg-desk.jpg
catalog: true
tags:
  - Rancher
  - Prometheus
  - 监控
  - Monitoring
  - Harbor
  - 离线安装
  - kube-prometheus-stack
---

## 前言

> 参考：
>
> - kube-prometheus-stack 官方 chart：<https://github.com/prometheus-community/helm-charts/tree/main/charts/kube-prometheus-stack>

从 Rancher v2.15 开始，监控拆成了两层：

- `kube-prometheus-stack`：负责 Prometheus / Grafana / Alertmanager 等运行时；
- `rancher-monitoring-dashboards`：负责 Rancher UI 中的仪表板展示。

本文的重点，是说明在离线环境中如何把这套监控部署起来。也就是：

1. 先准备 Rancher 的离线基础条件；
2. 再把 `kube-prometheus-stack` 对应的镜像拉取并同步到 Harbor / private registry；
3. 然后修改 Helm values，把镜像地址改成私有仓库；
4. 最后补齐 `Monitoring Dashboards` 和 `PushProx` 的离线安装。

本文以 Rancher + Harbor + K3s/RKE2 为例，聚焦于离线环境中最关键的镜像准备、仓库同步和 Helm 部署方法，最终把 `kube-prometheus-stack` 及其相关组件在私有 registry 中稳定运行起来，而不是重复展开 Rancher 本身的完整离线安装流程。

---

## 1. Rancher 离线安装先准备好

本文的重点是 `kube-prometheus-stack` 在离线环境中的部署，不展开 Rancher Server 本身的完整离线安装流程。简单来说：

- Rancher 的离线安装请直接参考官方文档；
- 本文默认前提是 Rancher 已经安装完成；
- 你的 Harbor / private registry 已经可用；
- 目标集群节点可以从该 registry 拉取镜像。

> Rancher 官方离线安装文档入口：<https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/other-installation-methods/air-gapped-helm-cli-install/>

---

## 2. 离线安装 kube-prometheus-stack

### 2.1 为什么离线安装 kube-prometheus-stack 需要单独处理镜像

`kube-prometheus-stack` 是一个较大的 Helm chart，里面会部署很多组件，例如：

- Prometheus
- Alertmanager
- Grafana
- Prometheus Operator
- kube-state-metrics
- node-exporter
- blackbox-exporter
- admission webhook 等

这些组件的镜像默认会来自以下来源：

- quay.io
- registry.k8s.io
- docker.io
- ghcr.io
- public.ecr.aws

在离线环境中，这些镜像都无法直接访问，因此必须执行以下流程：

1. 获取 `kube-prometheus-stack` chart；
2. 提取 chart 里所涉及的镜像列表；
3. 把镜像拉下来后上传到私有镜像仓库；
4. 修改 `values.yaml` 中的镜像地址和仓库前缀；
5. 再执行 `helm install` / `helm upgrade`。

这正是离线部署的本质：将“公开镜像地址”替换成“内网私有镜像地址”。

---

### 2.2 获取 kube-prometheus-stack 的离线镜像列表

### 2.2.1 添加 Helm 仓库

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update
```

查看版本：

```BASH
helm search repo prometheus-community/kube-prometheus-stack
```
> 本例使用的版本为：91.5.1

### 2.2.2 提取镜像列表

最简单、直接的方式，是直接让 Helm 把最终渲染后的 `image:` 字段提取出来，并写入一个镜像列表文件：

首先，先准备我们要部署 `kube-prometheus-stack` 所需要的 values.yaml：

```YAML
# values.yaml
grafana:
  # NOTE: Do NOT set root_url or serve_from_sub_path here
  grafana.ini:
    security:
      allow_embedding: true
    auth:
      disable_login_form: false
    auth.anonymous:
      enabled: true
      org_role: Viewer
    dashboards:
      default_home_dashboard_path: /tmp/dashboards/rancher-default-home.json
    users:
      auto_assign_org_role: Viewer

# Prometheus configuration to pick up all ServiceMonitors
prometheus:
  prometheusSpec:
    serviceMonitorSelectorNilUsesHelmValues: false
    podMonitorSelectorNilUsesHelmValues: false

# No metric exporter by default
kubeEtcd:
  enabled: false
kubeControllerManager:
  enabled: false
kubeScheduler:
  enabled: false
kubeProxy:
  enabled: false
```

参考：https://ranchermanager.docs.rancher.com/v2.15/integrations-in-rancher/monitoring-and-alerting/

```bash
helm template kube-prometheus-stack \
  prometheus-community/kube-prometheus-stack \
  --version 91.5.1 \
  --namespace cattle-monitoring-system \
  -f values.yaml \
  | grep -Eo '([a-zA-Z0-9.-]+\.)?[a-zA-Z0-9.-]+/[a-zA-Z0-9._/-]+:[a-zA-Z0-9._-]+' \
  | sort -u \
  > /tmp/kube-prometheus-stack-images.txt
```

这个步骤的关键目的是：

- 直接从 chart 的最终渲染结果中提取镜像地址；
- 生成一个统一的镜像清单；
- 后续只要按这个列表逐个下载、重命名、上传到 Harbor 即可。

### 2.2.3 登录私有仓库并上传

这里以 `public.kingsd.top` 为例。

```bash
docker login public.kingsd.top
```

然后循环拉取并推送每个镜像：

```bash
#!/bin/bash

SOURCE_FILE="/tmp/kube-prometheus-stack-images.txt"
TARGET_REGISTRY="public.kingsd.top"

while IFS= read -r img; do

  # 跳过空行和注释
  [[ -z "$img" || "$img" =~ ^# ]] && continue

  echo "========================================"
  echo "Processing: $img"

  # 去掉第一个 registry
  target="${img#*/}"

  # 目标镜像
  target="${TARGET_REGISTRY}/${target}"

  echo "Source: $img"
  echo "Target: $target"

  skopeo copy \
    --override-os linux \
    --override-arch amd64 \
    "docker://${img}" \
    "docker://${target}"

  if [ $? -eq 0 ]; then
    echo "SUCCESS: $target"
  else
    echo "FAILED: $img"
  fi

done < "$SOURCE_FILE"
```

---

### 2.3 修改 values.yaml：让镜像前缀指向 Harbor

在离线环境中，真正关键的一步是让 Helm chart 在部署时不再去拉取公网镜像，而是改为拉取私有仓库地址。常见方式是修改 `values.yaml`，添加 `global.imageRegistry` 指向私有仓库地址。

```yaml
# values.yaml
global:
  imageRegistry: public.kingsd.top

grafana:
  # NOTE: Do NOT set root_url or serve_from_sub_path here
  grafana.ini:
    security:
      allow_embedding: true
    auth:
      disable_login_form: false
    auth.anonymous:
      enabled: true
      org_role: Viewer
    dashboards:
      default_home_dashboard_path: /tmp/dashboards/rancher-default-home.json
    users:
      auto_assign_org_role: Viewer

# Prometheus configuration to pick up all ServiceMonitors
prometheus:
  prometheusSpec:
    serviceMonitorSelectorNilUsesHelmValues: false
    podMonitorSelectorNilUsesHelmValues: false

# No metric exporter by default
kubeEtcd:
  enabled: false
kubeControllerManager:
  enabled: false
kubeScheduler:
  enabled: false
kubeProxy:
  enabled: false
```

---

### 2.4 Helm 安装 kube-prometheus-stack

在完成镜像准备和 values 修改之后，就可以开始安装：

```bash
helm install kube-prometheus-stack prometheus-community/kube-prometheus-stack \
  --version 91.5.1 \
  --namespace cattle-monitoring-system \
  --create-namespace \
  --debug \
  --wait \
  -f values.yaml
```

如果一切正常，Prometheus/Grafana 的基础设施很快就会起来，随后你就可以继续安装 Rancher 的 Monitoring Dashboards 组件，进行 UI 侧的嵌入和显示。

---

## 3. 离线安装 Rancher Monitoring Dashboards

`rancher-monitoring-dashboards` 不需要像 `kube-prometheus-stack` 那样自己重新整理一大批镜像。它的镜像通常已经包含在 Rancher 离线安装用的 `rancher-images.txt` 里。

安装时把 `Override the Default Container Registry` 指向自己的私有仓库，然后直接安装 Dashboard chart 即可。完成这一步之后，基础的监控展示层也就接通了；下一步再补齐控制平面指标采集。

![](https://raw.githubusercontent.com/kingsd041/picture/main/202609241657362.png)

安装完成后， `rancher-monitoring-dashboards` 和  `kube-prometheus-stack` 均使用私有镜像仓库部署成功：

![](https://raw.githubusercontent.com/kingsd041/picture/main/202609241710433.png)

---

## 4. 离线安装 PushProx

如果你的环境需要采集 `etcd`、`kube-scheduler`、`kube-controller-manager`、`kube-proxy` 这类控制平面指标，那么还需要额外安装 `PushProx`。它不是核心监控运行时，而是给 RKE2 / K3s 这类组件补充指标采集的桥接层：

- `kube-prometheus-stack` 负责跑 Prometheus / Grafana；
- `PushProx` 负责把 `etcd`、`kube-scheduler`、`kube-controller-manager`、`kube-proxy` 这类指标“转给”Prometheus。

通常 PushProx 只需要两个镜像：`rancher/pushprox` 和 `rancher/mirrored-library-busybox`。

而这个镜像通常已经包含在 Rancher 离线安装时的 `rancher-images.txt` 里，所以很多时候不用额外整理一大批镜像。只要 Harbor / private registry 可用，并且把镜像仓库指向自己的地址，就可以直接用。

如果 `rancher-images.txt` 里确实没有这个镜像，也不用慌张。因为它只**依赖两个镜像**，手动上传到私有镜像仓库即可

这和 `kube-prometheus-stack` 这种需要准备大量镜像完全不同，PushProx 的离线处理成本非常低。

安装 PushProx 需要在对应的 PushProx values.yaml 中增加如下配置：

```YAML
clients:
  image:
    repository: public.kingsd.top/rancher/pushprox
    tag: v0.1.11

  copyCertsImage:
    repository: public.kingsd.top/rancher/mirrored-library-busybox
    tag: 1.37.0

proxy:
  image:
    repository: public.kingsd.top/rancher/pushprox
    tag: v0.1.11
```

然后使用 Helm 安装即可。对于具体的 PushProx chart 配置和安装细节，可以参考此前发布的两篇 Rancher v2.15 监控实践文章：一篇用于 RKE2 场景，一篇用于 K3s 场景。

---

## 5. 写在最后

离线安装的核心原则，其实很简单：

- `Rancher Server` 相关镜像按官方离线包准备；
- `kube-prometheus-stack` 这类 chart 需要自己从 Helm 渲染结果中提取镜像并同步到私有 registry；
- `rancher-monitoring-dashboards` 通常可以直接沿用 Rancher 的 `rancher-images.txt`；
- `PushProx` 这类补充组件，通常只需要一两张镜像，手动同步也很简单。

如果你要按实际操作顺序来做，最实用的 checklist 是：

1. 确认 Rancher 离线环境已准备好；
2. 从 chart 中提取 `kube-prometheus-stack` 镜像清单；
3. 上传到 Harbor / private registry；
4. 修改 values.yaml，把镜像地址改到私有 registry；
5. 安装 Dashboard 和必要的 PushProx；
6. 验证 Pod 状态和镜像拉取是否正常。

这个顺序，基本就是离线安装里最关键的落地方法。
