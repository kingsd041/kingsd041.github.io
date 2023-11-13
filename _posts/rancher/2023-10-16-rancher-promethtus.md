---
layout: post
title: Rancher Monitoring 使用
subtitle:
date: 2023-10-16 11:07:00 +0800
author: Ksd
header-img: img/post-bg-rancher-k8s.png
catalog: true
tags:
  - Rancher
  - Monitoring
---

## 环境

- Rancher v2.7.8

## Grafana 持久化

分两种持久化方式：

- 将 dashboard 文件挂载到 configmap 中
- 通过 pvc 持久化 grafana 数据

### 将 dashboard 文件挂载到 configmap 中

参考[持久 Grafana 仪表板](https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/monitoring-alerting-guides/create-persistent-grafana-dashboard)，将 dashboard json 文件导入的 configmap 中，例如：

```
apiVersion: v1
kind: ConfigMap
metadata:
  labels:
    grafana_dashboard: "1"
  name: redis-dashboard
  namespace: cattle-dashboards #
data:
  redis-dashboard.json: |-
    {
      "__inputs": [
        {
          "name": "DS_PROMETHEUS",
          "label": "Prometheus",
          "description": "",
          "type": "datasource",
          "pluginId": "prometheus",
          "pluginName": "Prometheus"
        }
```

json 文件可以从 https://grafana.com/grafana/dashboards 下载，也可以从 grafana 中导出。

### 通过 pvc 持久化 grafana 数据

创建或者更新 rancher-monitoring 时，通过 `PVC template` 或者 `StatefulSet template` 挂载 storageclass：

![](https://raw.githubusercontent.com/kingsd041/picture/main/202310191339192.png)

## 持久化 prometheus

创建或者升级 rancher-monitoring 时，可通过 UI 设置。

## 持久化 alertmanager

没测试，但应该可以在创建或者升级 rancher-monitoring 时，通过 yaml 的形式编辑 chart，具体配置可参考：https://github.com/kingsd041/k3s-cluster/blob/main/k3s-kube-prometheus-stack/files/values.yaml

## 添加 ServiceMonitoring

创建 redis deployment，通过 container sidecar 添加 redis exporter，开放 redis 的 metrics。

并且创建 redis service，提供给 serviceMoniter 监控。

> 吐槽下，rancher v2.7.8 只能通过导入 yaml 的形式添加，还不支持表单添加 ServiceMonitor 和 PodMonitor

```
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
  labels:
    app: redis
    user: ksd
spec:
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
        - name: redis
          image: redis:4
          resources:
            requests:
              cpu: 100m
              memory: 100Mi
          ports:
            - containerPort: 6379
        - name: redis-exporter
          image: oliver006/redis_exporter:latest
          resources:
            requests:
              cpu: 100m
              memory: 100Mi
          ports:
            - containerPort: 9121
---
kind: Service
apiVersion: v1
metadata:
#  annotations:
#    prometheus.io/scrape: "true"
#    prometheus.io/port: "9121"
  name: redis
  labels:
    app: redis
spec:
  selector:
    app: redis
  ports:
    - name: redis
      port: 6379
      targetPort: 6379
    - name: prom
      port: 9121
      targetPort: 9121
```

创建 ServiceMonitor，将以下 yaml 从 rancher 中导入：

```
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  labels:
    k8s-app: redis-monitor
  name: redis-monitor
  namespace: default
spec:
  endpoints:
    - interval: 15s
      port: prom
      relabelings:
      - action: labelmap
        regex: __meta_kubernetes_pod_label_(.+)
      - action: replace
        sourceLabels:
        - "__meta_kubernetes_pod_name"
        targetLabel: ksdhost
  jobLabel: redis
  namespaceSelector:
    matchNames:
      - default
  selector:
    matchLabels:
      app: redis
```

## 添加 Prometheus Rules

Prometheus Rules 可以通过 rancher UI 去添加，但我使用的 rancher v2.7.8 有 [bug](https://github.com/rancher/dashboard/issues/9926)，所以只能通过 yaml 去创建：

```
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  labels:
    app: rancher-monitoring
    app.kubernetes.io/instance: rancher-monitoring
    app.kubernetes.io/managed-by: Helm
    app.kubernetes.io/part-of: rancher-monitoring
    app.kubernetes.io/version: 102.0.2_up40.1.2
    chart: rancher-monitoring-102.0.2_up40.1.2
    heritage: Helm
    release: rancher-monitoring
  name: rancher-monitoring-redis
  namespace: cattle-monitoring-system
spec:
  groups:
    - name: redis
      rules:
        - alert: RedisDown
          annotations:
            description: "Redis instance is down\n  VALUE = {{ $value }}\n  LABELS = {{ $labels }}"
            summary: Redis down (instance {{ $labels.instance }})
          expr: |-
            redis_up == 0
          for: 0m
          labels:
            severity: critical
        # RedisTest 为测试使用，故意生成一个告警
        - alert: RedisTest
          annotations:
            description: "Redis Test\n  VALUE = {{ $value }}\n  LABELS = {{ $labels }}"
            summary: Redis Test (instance {{ $labels.instance }})
          expr: >-
            redis_commands_processed_total >
            1
          for: 0m
          labels:
            severity: critical
```

## 配置 Alertmanager

老版本的 Rancher Monitoring 使用 `Routes and Receivers` 来配置监控，但 Rancher v2.7.8 已经标记为 `Deprecated`，所以尝试使用 `AlertmanagerConfigs` 去添加 alertmanager 的配置，但是…… 集成的 alertmanager v0.24.0，实在太老了，导致我不知道如何通过 `AlertmanagerConfigs` 配置全局。

而且，通过 `AlertmanagerConfigs` 会自动在 `route.routes.matchers` 加上 `namespace` 的配置，导致一只能监控某一个 ns 的告警：

```
route:
  receiver: "null"
  group_by:
  - namespace
  continue: false
  routes:
  - receiver: default/defafult-email/email2
    group_by:
    - instance
    matchers:
    - alertname="RedisDelete"
    - namespace="default"
```

另外， `AlertmanagerConfigs` UI 设计真的是反人类，已经无力吐槽。

还有，`Routes and Receivers` 虽然已经弃用，但是 alertmanager 中还是存在许多 `Routes and Receivers` 中的默认值，我已经不知道应该如何咋配置了。

## 黑盒监控

Blackbox Exporter 是 Prometheus 社区提供的官方黑盒监控解决方案，其允许用户通过：HTTP、HTTPS、DNS、TCP 以及 ICMP 的方式对网络进行探测，可以用于下面的这些场景：

- HTTP 测试：定义 Request Header 信息、判断 Http status、Response Header、Body 内容
- TCP 测试：业务组件端口状态监听、应用层协议定义与监听
- ICMP 测试：主机探活机制
- POST 测试：接口联通性
- SSL 证书过期时间

Prometheus Operator 中提供了一个 `Probe` CRD 对象可以用来进行黑盒监控，我们需要单独运行一个 Blackbox 服务，然后作为一个 prober 提供给 Probe 对象使用。

### 部署 Blackbox Exporter

Rancher 启用 Monitoring 没有安装 Blackbox Exporter，所以需要我们自己安装，安装方式也比较简单，直接通过 helm 即可。

```
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

helm -n cattle-monitoring-system install [RELEASE_NAME] prometheus-community/prometheus-blackbox-exporter
```

参考：https://github.com/prometheus-community/helm-charts/tree/main/charts/prometheus-blackbox-exporter

#### 自定义配置

另外，通过 heml 安装的 Blackbox Exporter 只包含了 `http_2xx` module 的配置，如果需要自定义，比如添加 icmp，可在 value.yaml 中自定义，或者编辑 prometheus-blackbox-exporter configmap

参考：https://github.com/prometheus-community/helm-charts/blob/main/charts/prometheus-blackbox-exporter/values.yaml#L145-L153

```
k get cm prometheus-blackbox-exporter -o yaml
apiVersion: v1
data:
  blackbox.yaml: |
    modules:
      http_2xx:
        http:
          follow_redirects: true
          preferred_ip_protocol: ip4
          valid_http_versions:
          - HTTP/1.1
          - HTTP/2.0
        prober: http
        timeout: 5s
      icmp:
        prober: icmp
```

如果不添加 ping 的模块，配置 ping 之后，会报 400：

![](https://raw.githubusercontent.com/kingsd041/picture/main/202310191705449.png)

### 通过 Probe CRD 进行黑盒监控

- 监控 web 网站

Prometheus CRD 中通过了 `probeSelector` 定义了只会监控带有 `release: rancher-monitoring` 的 probe 资源，所以在创建 `Probe` 时需要加上这个标签，否则 prometheus 不能服务发现。

```
piVersion: monitoring.coreos.com/v1
kind: Prometheus
metadata:
  annotations:
    meta.helm.sh/release-name: rancher-monitoring
    meta.helm.sh/release-namespace: cattle-monitoring-system
......
......
......
  probeNamespaceSelector: {}
  probeSelector:
    matchLabels:
      release: rancher-monitoring
```

```
# blackboxExporter-test.yaml
apiVersion: monitoring.coreos.com/v1
kind: Probe
metadata:
  name: test-probe
  namespace: cattle-monitoring-system
  labels:
    release: rancher-monitoring
spec:
  jobName: test-probe # 任务名称
  prober: # 指定blackbox的地址
    url: blackbox-exporter-prometheus-blackbox-exporter.cattle-monitoring-system:9115
  module: http_2xx # 配置文件中的检测模块
  targets: # 目标（可以是static配置也可以是ingress配置）
    # ingress <Object>
    staticConfig: # 如果配置了 ingress，静态配置优先
      static:
        - www.jd.com
        - www.baidu.com
        - www.163.com
```

![](https://raw.githubusercontent.com/kingsd041/picture/main/202310191640646.png)

- Ping 监控

```
# blackboxExporter-probePing.yaml
apiVersion: monitoring.coreos.com/v1
kind: Probe
metadata:
  name: ping
  namespace: cattle-monitoring-system
  labels:
    release: rancher-monitoring
spec:
  jobName: ping # 任务名称
  prober: # 指定blackbox的地址
    url: prometheus-blackbox-exporter.default:9115
  module: icmp # 配置文件中的检测模块
  targets: # 目标（可以是static配置也可以是ingress配置）
    # ingress <Object>
    staticConfig: # 如果配置了 ingress，静态配置优先
      static:
        - 1.2.4.8
```

![](https://raw.githubusercontent.com/kingsd041/picture/main/202310191709234.png)

## 关于 Lables

### ServiceMonitor

将业务 pod 的 labels 添加到 prometheus alert 中，可以通过以下访问：

其中，labelmap 将 pod 的标签筛选出来，显示到 prometheus alert 中。replace 后去 "\_\_meta_kubernetes_pod_name" 的值，并且赋给 `host`，最终也显示在 prometheus alert 中。

另外，也可通过 `k explain servicemonitor.spec.podTargetLabels` 将标签显示到 prometheus alert 中。

```
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  labels:
    k8s-app: redis-monitor
  name: redis-monitor
  namespace: default
spec:
  endpoints:
    - interval: 15s
      port: prom
      relabelings:
      - action: labelmap
        regex: __meta_kubernetes_pod_label_(.+)
      - action: replace
        sourceLabels:
        - "__meta_kubernetes_pod_name"
        targetLabel: ksdhost
  jobLabel: redis
  namespaceSelector:
    matchNames:
      - default
  selector:
    matchLabels:
      app: redis
```

### Probe

```
 k -n cattle-monitoring-system get probe probe-rancher-web -o yaml
apiVersion: monitoring.coreos.com/v1
kind: Probe
metadata:
  labels:
    objectset.rio.cattle.io/hash: b072b00d96d6332c608bd3b38284c2a1cffd77ce
    release: rancher-monitoring
  name: probe-rancher-web
  namespace: cattle-monitoring-system
  resourceVersion: "2131618"
  uid: f905e855-52d9-48e9-bd89-b7e3f4d06288
spec:
  jobName: probe-rancher-web
  module: http_2xx
  prober:
    path: /probe
    url: blackbox-exporter-prometheus-blackbox-exporter.cattle-monitoring-system:9115
  targets:
    staticConfig:
      labels:
        k1: v1
        k2: v2
      static:
      - https://forums.rancher.cn
      - https://www.rancher.cn
      - https://mirror.rancher.cn
      - https://docs.rancher.cn
      - https://www.neunn.com
```

通过 `k explain probes.spec.targets.staticConfig.labels` 来添加标签，这样会将每个实例都添加上这些标签，后续 alertmanager route 中可能会用的到这些标签。

另外，也可以通过 `k explain probes.spec.targets.staticConfig.relabelingConfigs` 替换标签，和上面的 `ServiceMonitor` 类似了就。

## 监控 forums.rancher.cn，外部域名的 /metrics

要监控 discourse 的 metrics，首先需要在构建 discourse 时，加上 `DISCOURSE_PROMETHEUS_TRUSTED_IP_ALLOWLIST_REGEX` 参数，否则 prometheus 页面会报 404，参考：https://meta.discourse.org/t/discourse-prometheus/72666，https://meta.discourse.org/t/how-to-configure-monitoring-of-discourse-prometheus-on-prometheus/221218

监控外部域名的 metrics，我最开始使用 ServiceMonitor 没生效，不知道什么地方出问题了，一直无法在 prometheus tagets 中查看到设置的实例。

示例如下：

```
kubectl create -n cattle-monitoring-system secret generic forums-basic-auth --from-literal=username=admin --from-literal=password=<password>

## rancher-forums-servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  annotations:
  labels:
    app: rancher-forums
  name: rancher-forums
  namespace: cattle-monitoring-system
spec:
  endpoints:
  - basicAuth:
      password:
        key: password
        name: forums-basic-auth
      username:
        key: username
        name: forums-basic-auth
  - honorLabels: true
    interval: 10s
    port: metrics
    scheme: https
  namespaceSelector:
    matchNames:
    - cattle-monitoring-system
  selector:
    matchLabels:
      app: rancher-forums

## rancher-forums-servicemonitor.yaml
apiVersion: v1
kind: Service
metadata:
  labels:
    app: rancher-forums
  name: rancher-forums
  namespace: cattle-monitoring-system
spec:
  externalName: forums.rancher.cn
  ports:
  - name: metrics
    port: 443
    protocol: TCP
    targetPort: 443
  sessionAffinity: None
  type: ExternalName
```

但可以通过在 Rancher Apps 中来直接通过 yaml 的形式来修改 prometheus 的配置实现，采用 `additionalScrapeConfigs` 和 `additionalScrapeConfigsSecret` 的方式，都成功了，示例如下：

- additionalScrapeConfigs：

```
    additionalScrapeConfigs:
      - basic_auth:
          password: <your_password>
          username: admin
        job_name: rancher-forums-monitoring-1
        metrics_path: /metrics
        scheme: https
        static_configs:
          - targets:
              - forums.rancher.cn
```

- additionalScrapeConfigsSecret

创建 secret：

```
$ cat prometheus-additional.yaml
- job_name: rancher-forums-monitoring
  metrics_path: /metrics
  static_configs:
    - targets:
      - forums.rancher.cn
  scheme: https
  basic_auth:
    username: admin
    password: <your_password>

$ kubectl create secret generic additional-configs --from-file=prometheus-additional.yaml -n cattle-monitoring-system
```

修改 Rancher rancher-monitoring Apps 中的 yaml 配置：

```
    additionalScrapeConfigsSecret:
      enabled: true
      key: prometheus-additional.yaml
      name: additional-configs
```

以上，参考 [Rancher rancher-monitoring Charts](https://github.com/rancher/charts/blob/64b8c85a829e118ab5c48bd16dee5946968b31de/charts/rancher-monitoring/102.0.1%2Bup40.1.2/values.yaml#L3488C5-L3488C34)