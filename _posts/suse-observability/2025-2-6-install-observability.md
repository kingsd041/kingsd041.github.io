---
layout: post
title: 安装 SUSE Observability
subtitle:
date: 2025-2-6 11:07:00 +0800
author: Ksd
header-img: img/post-bg-debug.jpg
catalog: true
tags:
  - SUSE Observability
---

SUSE Observability（以前称为 StackState）可用于观察您的 Kubernetes 集群及其工作负载。

关于License key、安装要求等先决条件可参考：
https://docs.stackstate.com/get-started/k8s-suse-rancher-prime


## 安装 storageclass

由于我使用的是 rke2 集群，默认没有 storageclass，所以需要提前安装，本例使用的是 longhorn。

另外，k3s 默认创建 rancher.io/local-path 类型的本地路径存储类。

## 安装 SUSE Observability

1. 获取 helm chart
```
helm repo add suse-observability https://charts.rancher.com/server-charts/prime/suse-observability
helm repo update
```

2. 生成 helm chart values 文件：
```
export VALUES_DIR=.
helm template \
  --set license='<your license>' \
  --set baseUrl='ss.kingsd.top' \
  --set adminPassword='Rancher' \
  --set sizing.profile='trial' \
  suse-observability-values \
  suse-observability/suse-observability-values --output-dir $VALUES_DIR
```

- `baseUrl` 需要设置为一个单独的域名，并做好 DNS 映射。后续需要申请这个证书的证书，用于 ingress 访问 observability ui，本例使用 `ss.kingsd.top`。
- `sizing.profile` 可配置 `trial, 10-nonha, 20-nonha, 50-nonha, 100-nonha, 150-ha, 250-ha, 500-ha`，根据此配置文件，sizing_values.yaml将生成包含要在 Ha 或 NonHa 模式下部署的 SUSE Observability 资源和配置的默认大小的文件。例如，10-nonha 将生成一个sizing_values.yaml用于部署 NonHa SUSE Observability 实例以在非高可用模式下观察 10 节点集群的配置文件。目前无法从 nonha 环境迁移到 ha 环境，因此如果您预计您的环境将需要观察大约 150 个节点，那么最好立即使用 ha。
- `adminPassword` 最好自定义，如果不自定义会生成一个随机的密码存储在 `$VALUES_DIR/suse-observability-values/templates/baseConfig_values.yaml` 中。
上面的命令执行后，可生成文件：`$VALUES_DIR/suse-observability-values/templates/baseConfig_values.yaml` 和 `$VALUES_DIR/suse-observability-values/templates/sizing_values.yaml`，包含了安装 SUSE Observability Helm Chart 所需的配置。

3. 使用生成的值部署 SUSE Observability helm chart：

本例采用 ingress 访问，所以需要通过配置启动 ingress：

```
kubectl create secret tls ob-tls \
  --cert=./ss.kingsd.top.pem \
  --key=./ss.kingsd.top.key \
  --namespace=suse-observability
```

```
# ingress_values.yaml
ingress:
  enabled: true
  annotations:
    nginx.ingress.kubernetes.io/proxy-body-size: "50m"
  hosts:
    - host: ss.kingsd.top
  tls:
    - hosts:
        - ss.kingsd.top
      secretName: ob-tls
```

```
helm upgrade --install \
    --namespace suse-observability \
    --create-namespace \
    --values "ingress_values.yaml" \
    --values $VALUES_DIR/suse-observability-values/templates/baseConfig_values.yaml \
    --values $VALUES_DIR/suse-observability-values/templates/sizing_values.yaml \
    suse-observability \
    suse-observability/suse-observability
```

## 访问 SUSE Observability

将 ss.kingsd.top 映射为 K8s 节点主机的 IP，然后访问域名，用户名/密码登录


## 后续

只有按照 https://docs.stackstate.com/get-started/k8s-suse-rancher-prime#installing-ui-extensions 操作即可