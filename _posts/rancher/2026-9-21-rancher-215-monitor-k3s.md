---
layout: post
title: Rancher v2.15 新监控模式实践：使用 kube-prometheus-stack 与 Monitoring Dashboards 监控 K3s 集群
subtitle: 以 K3s 为例，构建 kube-prometheus-stack 与 Rancher Monitoring Dashboards 的监控方案

date: 2026-9-21 11:06:00 +0800
author: Ksd
header-img: img/post-bg-desk.jpg
catalog: true
tags:
  - Rancher
  - Prometheus
  - 监控
  - Monitoring
  - K3s
---

## 前言

> 参考：<https://ranchermanager.docs.rancher.com/v2.15/integrations-in-rancher/monitoring-and-alerting/>

从 Rancher v2.15 开始，监控相关组件的安装方式发生了明显变化。此前，Rancher 通过一个完整的 `rancher-monitoring` chart 统一部署 Prometheus、Grafana、Alertmanager 以及相关导出器；但在新版本中，Rancher 引入了更加“解耦”的 `rancher-monitoring-dashboards` chart，用于承载 Grafana 仪表板和 Rancher UI 集成，而真正的监控运行时则需要由用户自行部署 `kube-prometheus-stack`，再由 dashboard chart 进行接入。

这种调整的核心意义在于：Rancher 不再把“监控运行时”和“仪表板能力”绑定在同一个 chart 中，而是让用户能够更灵活地选择自己的 Prometheus/Grafana 方案，并通过 Rancher UI 统一展示监控面板。这种架构更符合现代监控栈的部署方式，也更符合官方文档中强调的 “dashboard-only” 和 “runtime-external” 设计思路。

在 K3s 场景下，这种模式同样适用。对于 K3s 集群，用户可以选择：

- 采用默认的 kube-prometheus-stack 标准配置，直接让 kubelet / kube-proxy / controller-manager 等组件通过默认 ServiceMonitor 方式暴露指标；
- 或者在更偏“K3s 专用”场景下，启用 `k3sServer` PushProx，以更适合 K3s 的方式采集 host-local 指标。

本文将以 K3s 集群为例，记录如何在 Rancher v2.15 的新模式下，先部署 `kube-prometheus-stack`，再安装 `rancher-monitoring-dashboards`，并说明在 K3s 场景下使用 `k3sServer` PushProx 时，应该如何关闭默认 kubelet 采集，避免出现重复抓取 10250 指标的问题。

---

## 安装与配置 Monitoring Dashboards

### 安装 kube-prometheus-stack

1. 安装 kube-prometheus-stack chart

在安装 `rancher-monitoring-dashboards` chart 之前，必须先使用 `kube-prometheus-stack` chart 设置底层监控基础架构。

添加 prometheus-community Helm 仓库以访问 kube-prometheus-stack chart。你可以通过 Rancher UI 或使用 Helm CLI 执行以下命令来完成此操作（本例使用 Helm CLI 方式）：

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update
```

> 结果：prometheus-community Helm 仓库已添加，可用于 chart 安装。

2. 创建 kube-prometheus-stack values.yaml 文件

使用以下设置配置该文件，以确保 kube-prometheus-stack 能正确集成并支持 `rancher-monitoring-dashboards` 中的嵌入式仪表板。

```yaml
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

这里需要说明几点：

- `allow_embedding: true`：这是 Rancher UI 直接嵌入 Grafana 仪表板的前提条件。
- `serviceMonitorSelectorNilUsesHelmValues: false`：让 Prometheus 能识别到所有 ServiceMonitor，而不仅仅仅看 Helm 自己生成的对象。
- 由于 `rancher-monitoring-dashboards` 仅负责展示和集成，并不负责完整运行 Prometheus/Grafana，因此默认情况下不启用 `kubeEtcd`、`kubeControllerManager`、`kubeScheduler` 和 `kubeProxy` 这四类组件的默认导出器，避免重复抓取和不必要的配置噪音。

3. 通过 Helm CLI 在 cattle-monitoring-system 命名空间中安装 kube-prometheus-stack chart，并应用上一步中的 values.yaml 文件：

```bash
helm install kube-prometheus-stack prometheus-community/kube-prometheus-stack \
  --namespace cattle-monitoring-system \
  --create-namespace \
  --debug \
  --wait \
  -f values.yaml
```

> 结果：Prometheus 监控基础设施已部署在 `cattle-monitoring-system` 命名空间中。

---

### 安装 rancher-monitoring-dashboards

使用 Rancher UI 部署 Monitoring Dashboards Chart：

1. 导航到 Cluster Management。
2. 选择你的集群并点击 Explore 按钮。
3. 在左侧菜单中选择 Apps > Charts。
4. 找到 Monitoring Dashboards chart，点击 Install。
5. 在 Project 下拉框选择你要安装到的项目名称，点击 Next。
6. 根据你的集群类型来选择集群类型，本例是 K3s 集群，因此选择 K3s 相关配置，如果你的场景使用的是 RKE2 或其他 Kubernetes 发行版，可相应调整；最后点击 Install。

> 结果：Rancher 部署 `rancher-monitoring-dashboards` chart，并将仪表板集成到 Rancher UI 中。

这种情况下，Prometheus 会走标准的默认 kubelet 采集方式，监控面板和 dashboards 也可以正常集成，安装步骤更简单，适合多数普通场景；这也是一种基础监控方案，适合大多数 K3s 用户，只要你希望有一套可用的 Kubernetes 监控能力，直接部署 `kube-prometheus-stack` + `rancher-monitoring-dashboards` 就已经足够了，可以直接看到节点、Pod、工作负载和常见 Kubernetes 指标。

但如果你需要更贴合 K3s 运行时的深层指标，例如对 `k3s-server`、`cadvisor`、`probes` 这类 host-local 指标做更细粒度采集，那么就不应该继续保留默认 kubelet 采集，而应该显式关闭它，并切换到 `k3sServer` PushProx 的方式。也就是说，基础监控可直接完成，而 K3s 专用的深层监控需要进一步做“禁用 kubelet + 启用 k3sServer”的优化配置。

下面将介绍如果在 K3s 中要做更深入、更贴近 K3s 运行时的监控，应该如何正确关闭默认 kubelet，并切换到 `k3sServer` PushProx 的方式来避免重复采集。

---

## 在 K3s 中安装 k3sServer PushProx

在 K3s 集群里，默认的 `kube-prometheus-stack` 配置会继续抓取 `kubelet` 相关的指标，包括：

- `/metrics`
- `/metrics/cadvisor`
- `/metrics/probes`

而 K3s 的 PushProx 采集方式也会访问本机的 K3s Server 相关端点，通常是 10250 端口。这样一来，如果你同时启用：

- 默认 kubelet ServiceMonitor
- K3sServer PushProx

那么 Prometheus 中很容易出现两套标签不同但同一种端点来源的采集目标，例如：

- `job="kubelet"`
- `job="k3s-server"`

这会造成：

- 同一类 10250 相关指标出现重复采集；
- Grafana/Prometheus 侧看到的时间序列分裂；
- 监控面板在对比和聚合时出现“看起来像同一类指标，但是多了一套不同 job 的时间序列”。

因此，在 K3s 集群中，如果你准备走 K3s 专用的 PushProx 流程，就要显式关闭默认的 kubelet 采集。

### 推荐配置

如果你使用 K3s 的 PushProx 方案，建议在 kube-prometheus-stack 中这样配置：

```yaml
kubelet:
  enabled: false
```

如果已经安装上文安装 `kube-prometheus-stack`，请更新集群：

```BASH
helm upgrade kube-prometheus-stack prometheus-community/kube-prometheus-stack \
  --namespace cattle-monitoring-system \
  --debug \
  --wait \
  -f values.yaml
```

随后再安装 K3sServer PushProx：

```BASH
git clone https://github.com/rancher/charts.git
cd charts/rancher-monitoring/110.0.1+up80.9.1-rancher.19/

```

> 版本选择较新的即可

创建 `values.yaml`：

```BASH
cat <<'EOF' > k3s-server-values.yaml
namespaceOverride: cattle-monitoring-system
metricsPort: 10250
component: k3s-server
clients:
  port: 10013
  useLocalhost: true
  https:
    enabled: true
    useServiceAccountCredentials: true
    insecureSkipVerify: true
  rbac:
    additionalRules:
    - nonResourceURLs: ["/metrics/cadvisor"]
      verbs: ["get"]
    - apiGroups: [""]
      resources: ["nodes/metrics"]
      verbs: ["get"]
  tolerations:
  - effect: "NoExecute"
    operator: "Exists"
  - effect: "NoSchedule"
    operator: "Exists"
serviceMonitor:
  endpoints:
  - port: metrics
    honorLabels: true
    relabelings:
    - sourceLabels: [__metrics_path__]
      targetLabel: metrics_path
  - port: metrics
    path: /metrics/cadvisor
    honorLabels: true
    relabelings:
    - sourceLabels: [__metrics_path__]
      targetLabel: metrics_path
  - port: metrics
    path: /metrics/probes
    honorLabels: true
    relabelings:
    - sourceLabels: [__metrics_path__]
      targetLabel: metrics_path
EOF
```

> values.yaml 内容来源于：https://github.com/rancher/charts/blob/release-v2.15/charts/rancher-monitoring/110.0.1%2Bup80.9.1-rancher.19/values.yaml#L130-L171

这里需要注意几个关键配置：

- `component: k3s-server`：指定 PushProx 监控的组件为 K3s Server。
- `metricsPort: 10250`：K3s Server / kubelet 暴露的本机 metrics 端口，用于采集 `/metrics`、`/metrics/cadvisor` 等指标。
- `clients.port: 10013`：PushProx Client 与 Proxy 之间使用的通信端口。
- `clients.useLocalhost: true`：PushProx Client 通过节点本机地址访问本地 K3s Server 指标。
- `nodeSelector`：将 PushProx Client 调度到带有 `node-role.kubernetes.io/control-plane=true` 等控制面节点标签的节点。
- `tolerations`：允许 PushProx Client 在控制面节点存在 `NoExecute` 或 `NoSchedule` 污点时仍正常调度。

安装：

```BASH
helm upgrade --install k3s-server \
  ./charts/k3sServer/ \
  -n cattle-monitoring-system \
  --create-namespace \
  -f k3s-server-values.yaml
```

这是最稳妥的配置方式。这样做的目的，是保证：

- 默认 kubelet ServiceMonitor 不再注册；
- Prometheus 只走 K3sServer PushProx 这条链路；
- 不再出现 kubelet 和 k3s-server 同时抓 10250 的重复采集情况。

---

## K3sServer PushProx 的实际意义

K3sServer PushProx 本质上不是“重新部署一套监控”，而是一种“更适合 K3s 运行时的指标收集方式”。

它的核心特点包括：

- 通过 PushProx Client/Proxy 方式绕过常规 ServiceMonitor 的限制；
- 适合抓取宿主机上本地暴露的指标端点；
- 适合 K3s 这类本地组件进程更密集的场景；
- 能更自然地覆盖 `k3s-server`、`cadvisor`、`probes` 等 host-local 指标来源。

对于 K3s 集群而言，这种方式通常更符合实际运行环境，因为 K3s 的 server 组件和控制平面组件并不是传统“NodePort / ClusterIP 方式”那样简单暴露，所以 PushProx 的角色会更明显。

---

## 写在最后

从 Rancher v2.15 的官方说明来看，`rancher-monitoring-dashboards` 的定位已经从“完整监控发行版”调整为“仪表板和 Rancher UI 集成组件”，而底层监控运行时交给用户自己部署，这种方案显著降低了耦合，也让监控栈的维护和扩展更加灵活。

在本文的 K3s 场景下，我们通过 `kube-prometheus-stack` 先搭建基础 Prometheus/Grafana 运行时，再安装 `rancher-monitoring-dashboards` 做界面集成，并在必要时增加 K3sServer PushProx 的配置。这个思路的关键点在于：

- 默认安装方案：用标准 kube-prometheus-stack 配置即可；
- K3s 专项优化：启用 `k3sServer`，并关闭默认 kubelet；
- 避免重复采集：不要让 `kubelet` 与 `k3s-server` 同时抢 10250 端口的指标。

换句话说，Rancher v2.15 的新监控方式，本质上是把“运行时”和“展示层”拆开了。只要你明确了这个设计思路，再结合 K3s 的实际监控特性，整个监控体系会更清晰，也更容易长期维护。
