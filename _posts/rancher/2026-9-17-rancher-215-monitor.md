---
layout: post
title: Rancher v2.15 新监控模式实践：使用 kube-prometheus-stack 与 Monitoring Dashboards 监控 RKE2 集群
subtitle: 以 RKE2 为例，构建 kube-prometheus-stack 与 Rancher Monitoring Dashboards 的监控方案

date: 2026-9-17 11:06:00 +0800
author: Ksd
header-img: img/post-bg-desk.jpg
catalog: true
tags:
  - Rancher
  - Prometheus
  - 监控
  - Monitoring
---

## 前言

> 参考：<https://ranchermanager.docs.rancher.com/v2.15/integrations-in-rancher/monitoring-and-alerting/>

从 Rancher v2.15 开始，监控相关组件的安装方式发生了明显变化。此前，Rancher 通过一个完整的 `rancher-monitoring` chart 统一部署 Prometheus、Grafana、Alertmanager 以及相关导出器；但在新版本中，Rancher 引入了更加“解耦”的 `rancher-monitoring-dashboards` chart，用于承载 Grafana 仪表板和 Rancher UI 集成，而真正的监控运行时则需要由用户自行部署 `kube-prometheus-stack`，再由 dashboard chart 进行接入。

这种调整的核心意义在于：Rancher 不再把监控运行时和仪表板能力绑定在同一个 chart 中，而是让用户能够更灵活地选择自己的 Prometheus/Grafana 方案，并通过 Rancher UI 统一展示监控面板。这种架构更符合现代监控栈的部署方式，也更符合官方文档中强调的“dashboard-only”和“runtime-external”设计思路。

**本文以 RKE2 集群为例**，记录如何在 Rancher v2.15 的新模式下，先部署 `kube-prometheus-stack`，再安装 `rancher-monitoring-dashboards`，并进一步为 kubeEtcd、kubeControllerManager、kubeScheduler 和 kubeProxy 这四类组件配置 PushProx，从而让 Prometheus 正常拉取这些控制平面组件的指标。

## 安装与配置 Monitoring Dashboards

### 安装 kube-prometheus-stack

1. 安装 kube-prometheus-stack chart

在安装 rancher-monitoring-dashboards chart 之前，必须先使用 kube-prometheus-stack chart 设置底层监控基础架构：

添加 prometheus-community Helm 仓库以访问 kube-prometheus-stack chart。你可以通过 Rancher UI 或使用 Helm CLI 执行以下命令来完成此操作（本例使用 Helm CLI 方式）。

```BASH
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update
```

> 结果：prometheus-community Helm 仓库已添加，可用于 chart 安装。

2. 创建 kube-prometheus-stack values.yaml 文件。使用以下设置配置该文件，以确保 kube-prometheus-stack 正确集成并支持 rancher-monitoring-dashboards 中的嵌入式仪表板。

```YAML
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

3.  通过 Helm CLI 在 cattle-monitoring-system 命名空间中安装 kube-prometheus-stack chart，并应用上一步中的 values.yaml 文件：

```BASH
helm install kube-prometheus-stack prometheus-community/kube-prometheus-stack \
  --namespace cattle-monitoring-system \
  --create-namespace \
  --debug \
  --wait \
  -f values.yaml
```

> 结果：Prometheus 监控基础设施已部署在 cattle-monitoring-system 命名空间中。

### 安装 rancher-monitoring-dashboards

使用 Rancher UI 部署 Monitoring Dashboards Chart：

1. 导航到 Cluster Management。

2. 选择你的集群并点击 Explore 按钮。

3. 在左侧菜单中选择 Apps > Charts。

4. 找到 Monitoring Dashboards chart，点击 Install。

5. 在 Project 下拉框选择你要安装到的项目名称，点击 Next。

6. 根据你的集群类型来选择集群类型，本例是 RKE2 集群，所以选择 RKE2，最后，点击 Install。

> 结果：Rancher 部署 rancher-monitoring-dashboards chart，并将仪表板集成到 Rancher UI 中。

## 为 RKE2 控制平面组件配置 PushProx

默认情况下，`rancher-monitoring-dashboards` chart 不会主动抓取 kubeEtcd、kubeControllerManager、kubeScheduler 或 kubeProxy 的指标。若要从这些组件导出指标，则必须额外配置 PushProx。

在社区现有方案中，没有找到能够直接满足本文 RKE2 集群监控场景的 PushProx Chart。进一步查看 Rancher Charts 后发现，Rancher 自身提供了 `rancher-pushprox` Chart。该 Chart 是 Rancher Monitoring 早期版本中用于监控 Kubernetes 相关组件的子 Chart，因此本文直接复用这一现成方案。

> 需要注意的是，本文并不是重新部署 Rancher Monitoring，而是单独复用其中的 PushProx 子 Chart，为 kubeEtcd、kubeControllerManager、kubeScheduler 和 kubeProxy 提供指标转发能力。

```BASH
git clone https://github.com/rancher/charts.git
```

下面将介绍如何针对不同的组件来部署 PushProx：

### 选择对应的 PushProx Chart

`rancher-pushprox` Chart 针对不同的 Kubernetes 集群部署方式提供了多个子 Chart，例如 `kubeAdm`、`RKE` 和 `RKE2` 等。

例如，在 Chart 的 `charts` 目录下可以看到：

```text
rke2Etcd
rke2ControllerManager
rke2Scheduler
rke2Proxy
rkeEtcd
rkeControllerManager
rkeScheduler
rkeProxy
kubeAdmEtcd
kubeAdmControllerManager
kubeAdmScheduler
...
```

由于本文使用的是 **RKE2 集群**，因此需要选择 `rke2` 对应的 Chart，而不是 `rke` 或 `kubeAdm` 目录下的 Chart。

例如，针对 RKE2 控制平面组件，可以选择：

```text
charts/
├── rke2Etcd
├── rke2Scheduler
├── rke2ControllerManager
└── rke2Proxy
```

其中：

- `rke2Etcd`：用于监控 RKE2 集群的 etcd
- `rke2Scheduler`：用于监控 RKE2 集群的 kube-scheduler
- `rke2ControllerManager`：用于监控 RKE2 集群的 kube-controller-manager
- `rke2Proxy`：用于监控 RKE2 集群的 kube-proxy

因此，本文后续针对 RKE2 控制平面组件的监控配置，均使用 `rke2` 目录下对应的 Chart。

### 安装 ETCD PushProx

进入对应的 Chart 目录：

```BASH
cd charts/rancher-monitoring/110.0.1+up80.9.1-rancher.19/
```

> 版本选择较新的即可

创建 `values.yaml`：

```BASH
cat <<'EOF' > rke2-etcd-values.yaml
namespaceOverride: cattle-monitoring-system
component: kube-etcd
metricsPort: 2381

clients:
  port: 10014
  useLocalhost: true
  nodeSelector:
    node-role.kubernetes.io/etcd: "true"
  tolerations:
    - effect: "NoExecute"
      operator: "Exists"
    - effect: "NoSchedule"
      operator: "Exists"
EOF
```
> values.yaml 内容来源于：https://github.com/rancher/charts/blob/release-v2.15/charts/rancher-monitoring/110.0.1%2Bup80.9.1-rancher.19/values.yaml#L318-L331

这里需要注意几个关键配置：

- `component: kube-etcd`：指定 PushProx 监控的组件为 ETCD。
- `metricsPort: 2381`：RKE2 ETCD 的 Metrics 端口。
- `clients.port: 10014`：PushProx Client 与 Proxy 之间使用的通信端口。
- `clients.useLocalhost: true`：PushProx Client 通过节点本机地址访问 ETCD。
- `nodeSelector`：将 PushProx Client 调度到带有 `node-role.kubernetes.io/etcd=true` 标签的 ETCD 节点。
- `tolerations`：允许 PushProx Client 调度到可能存在 `NoExecute` 或 `NoSchedule` 污点的 ETCD 节点。

安装：

```BASH
helm upgrade --install rke2-etcd \
  ./charts/rke2Etcd \
  -n cattle-monitoring-system \
  --create-namespace \
  -f rke2-etcd-values.yaml
```

### 安装 ControllerManager PushProx

进入对应的 Chart 目录：

```BASH
cd charts/rancher-monitoring/110.0.1+up80.9.1-rancher.19/
```

> 版本选择较新的即可

创建 `values.yaml`：

```BASH
cat <<'EOF' >  rke2-controller-manager-values.yaml

namespaceOverride: cattle-monitoring-system

metricsPort: 10257 # default to secure port as of k8s >= 1.22
component: kube-controller-manager
clients:
  https:
    enabled: true
    insecureSkipVerify: true
    useServiceAccountCredentials: true
  port: 10011
  useLocalhost: true
  nodeSelector:
    node-role.kubernetes.io/control-plane: "true"
  tolerations:
    - effect: "NoExecute"
      operator: "Exists"
    - effect: "NoSchedule"
      operator: "Exists"
kubeVersionOverrides:
- constraint: "< 1.22"
  values:
    metricsPort: 10252 # default to insecure port in k8s < 1.22
    clients:
      https:
        enabled: false
        insecureSkipVerify: false
        useServiceAccountCredentials: false
EOF
```
> values.yaml 内容来源于：https://github.com/rancher/charts/blob/release-v2.15/charts/rancher-monitoring/110.0.1%2Bup80.9.1-rancher.19/values.yaml#L249-L275

这里需要注意几个关键配置：

- `component: kube-controller-manager`：指定 PushProx 监控的组件为 kube-controller-manager。
- `metricsPort: 10257`：RKE2 中 kube-controller-manager 的安全指标端口，Kubernetes 1.22 及以上默认使用此端口。
- `clients.port: 10011`：PushProx Client 与 Proxy 之间使用的通信端口。
- `clients.useLocalhost: true`：PushProx Client 通过节点本机地址访问 kube-controller-manager。
- `nodeSelector`：将 PushProx Client 调度到带有 `node-role.kubernetes.io/control-plane=true` 标签的控制平面节点。
- `tolerations`：允许 PushProx Client 调度到可能存在 `NoExecute` 或 `NoSchedule` 污点的控制平面节点。
- `kubeVersionOverrides`：在 Kubernetes 1.22 之前的版本中，控制平面组件默认使用非安全端口，因此需要切换到 10252，并关闭 HTTPS 配置。

安装：

```BASH
helm upgrade --install rke2-controller-manager \
  ./charts/rke2ControllerManager/ \
  -n cattle-monitoring-system \
  --create-namespace \
  -f rke2-controller-manager-values.yaml
```

### 安装 Scheduler PushProx

进入对应的 Chart 目录：

```BASH
cd charts/rancher-monitoring/110.0.1+up80.9.1-rancher.19/
```

> 版本选择较新的即可

创建 `values.yaml`：

```BASH
cat <<'EOF' >  rke2-scheduler-values.yaml

namespaceOverride: cattle-monitoring-system

namespaceOverride: cattle-monitoring-system
metricsPort: 10259 # default to secure port as of k8s >= 1.22
component: kube-scheduler
clients:
  https:
    enabled: true
    insecureSkipVerify: true
    useServiceAccountCredentials: true
  port: 10012
  useLocalhost: true
  nodeSelector:
    node-role.kubernetes.io/control-plane: "true"
  tolerations:
    - effect: "NoExecute"
      operator: "Exists"
    - effect: "NoSchedule"
      operator: "Exists"
kubeVersionOverrides:
- constraint: "< 1.22"
  values:
    metricsPort: 10251 # default to insecure port in k8s < 1.22
    clients:
      https:
        enabled: false
        insecureSkipVerify: false
        useServiceAccountCredentials: false
EOF
```
> values.yaml 内容来源于: https://github.com/rancher/charts/blob/release-v2.15/charts/rancher-monitoring/110.0.1%2Bup80.9.1-rancher.19/values.yaml#L277-L303

这里需要注意几个关键配置：

- `component: kube-scheduler`：指定 PushProx 监控的组件为 kube-scheduler。
- `metricsPort: 10259`：RKE2 中 kube-scheduler 的安全指标端口，Kubernetes 1.22 及以上默认使用此端口。
- `clients.port: 10012`：PushProx Client 与 Proxy 之间使用的通信端口。
- `clients.useLocalhost: true`：PushProx Client 通过节点本机地址访问 kube-scheduler。
- `nodeSelector`：将 PushProx Client 调度到带有 `node-role.kubernetes.io/control-plane=true` 标签的控制平面节点。
- `tolerations`：允许 PushProx Client 调度到可能存在 `NoExecute` 或 `NoSchedule` 污点的控制平面节点。
- `kubeVersionOverrides`：在 Kubernetes 1.22 之前的版本中，调度器默认使用非安全端口，因此需要切换到 10251，并关闭 HTTPS 配置。

安装：

```BASH
helm upgrade --install rke2-scheduler \
  ./charts/rke2Scheduler/ \
  -n cattle-monitoring-system \
  --create-namespace \
  -f rke2-scheduler-values.yaml
```

### 安装 Proxy PushProx

进入对应的 Chart 目录：

```BASH
cd charts/rancher-monitoring/110.0.1+up80.9.1-rancher.19/
```

> 版本选择较新的即可

创建 `values.yaml`：

```BASH
cat <<'EOF' >  rke2-proxy-values.yaml

namespaceOverride: cattle-monitoring-system
metricsPort: 10249
component: kube-proxy
clients:
  port: 10013
  useLocalhost: true
  tolerations:
    - effect: "NoExecute"
      operator: "Exists"
    - effect: "NoSchedule"
      operator: "Exists"
EOF
```
> values.yaml 内容来源于: https://github.com/rancher/charts/blob/release-v2.15/charts/rancher-monitoring/110.0.1%2Bup80.9.1-rancher.19/values.yaml#L305-L316

这里需要注意几个关键配置：

- `component: kube-proxy`：指定 PushProx 监控的组件为 kube-proxy。
- `metricsPort: 10249`：RKE2 kube-proxy 的指标端口。
- `clients.port: 10013`：PushProx Client 与 Proxy 之间使用的通信端口。
- `clients.useLocalhost: true`：PushProx Client 通过节点本机地址访问 kube-proxy。
- `tolerations`：允许 PushProx Client 调度到可能存在 `NoExecute` 或 `NoSchedule` 污点的节点。

安装：

```BASH
helm upgrade --install rke2-proxy \
  ./charts/rke2Proxy \
  -n cattle-monitoring-system \
  --create-namespace \
  -f rke2-proxy-values.yaml
```

> 结果： kubeEtcd、kubeControllerManager、kubeScheduler 和 kubeProxy 的 PushProx 部署成功，并且可以在 prometheus 中查看到 对应的 Target 为 `up` 状态：
> ![](https://raw.githubusercontent.com/kingsd041/picture/main/202609181108858.png)

## 写在最后

从 Rancher v2.15 的官方说明来看，`rancher-monitoring-dashboards` 的定位已经从“完整监控发行版”调整为“仪表板和 Rancher UI 集成组件”，而底层监控运行时交给用户自己部署，这种方案显著降低了耦合，也让监控栈的维护和扩展更加灵活。

在本文的 RKE2 场景下，我们通过 `kube-prometheus-stack` 先搭建基础 Prometheus/Grafana 运行时，再安装 `rancher-monitoring-dashboards` 做界面集成，并额外为 kubeEtcd、kubeControllerManager、kubeScheduler 和 kubeProxy 增加 PushProx 配置。这样做的好处是：不但可以让 Rancher UI 中的内置仪表板正常展示，还能让各类控制平面组件的指标按需要纳入监控范围。

换句话说，Rancher v2.15 的新监控方式，本质上是把“运行时”和“展示层”拆开了。只要你明确了这个设计思路，再结合 PushProx 和外部 Prometheus 语义，整个监控体系会更清晰，也更容易长期维护。
