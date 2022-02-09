---
layout: post
title: 如何在 K3s 中启用 Traefik dashborad
subtitle:
date: 2022-1-12 21:06:00 +0800
author: Ksd
header-img: img/post-bg-desk.jpg
catalog: true
tags:
  - K3s
  - Traefik
---

## 前言

Traefik 是一个开源的边缘路由器，它可以让你的服务发布变得轻松有趣。它负责接收你系统的请求，然后使用合适的组件来对这些请求进行处理。

Traefik 带有一个非常方便的仪表板，提供集群当前状态的详细概述，包括集群入口和服务网格路由配置的详细信息：

![](https://tva1.sinaimg.cn/large/008i3skNly1gy9r8udt1vj31060u0q67.jpg)

K3s 是经 CNCF 一致性认证的 Kubernetes 轻量级发行版，专为物联网及边缘计算设计。在 K3s 中，内置了 Traefik 作为集群的默认反向代理和 Ingress Controller。K3s 1.21 开始默认安装 Traefik v2，而之前的版本默认安装 Traefik v1。本文将根据不同的 Traefik 版本来介绍如何启用 Traefik Dashborad。

## Traefik v1 启用 Dashborad

默认情况下，K3s 1.20 及更早版本默认安装 Traefik v1，并且默认没有启用 Traefik Dashboard。如果要在 K3s 中启用 Traefik v1 的 Dashborad，我们可以借住 HelmChartConfig 来自定义由 Helm 部署的 Traefik v1 并启用 Dashboard：

> 注意：
> 不建议手动编辑 `/var/lib/rancher/K3s/server/manifests/traefik.yaml` 来修改 Traefik 配置文件，因为 K3s 重启后会覆盖修改的内容。
> 我们建议通过在 `/var/lib/rancher/K3s/server/manifests` 中创建一个额外的 `HelmChartConfig` 清单来自定义 Traefik 配置，参考：http://docs.rancher.cn/docs/K3s/helm/_index/

```
cat >> /var/lib/rancher/K3s/server/manifests/traefik-config.yaml << EOF
apiVersion: helm.cattle.io/v1
kind: HelmChartConfig
metadata:
  name: traefik
  namespace: kube-system
spec:
  valuesContent: |-
    dashboard:
      enabled: true
      domain: "traefik.localhost"
EOF
```

此时，Traefik 会重新部署，大约 10 秒钟左右，你就可以通过 `spec.valuesContent.domain` 配置的域名来访问 Traefik Dashboard 了:

![](https://tva1.sinaimg.cn/large/008i3skNly1gy9r6f2n4oj31z50u0tcb.jpg)

## Traefik v2 启用 Dashborad

默认情况下，K3s 1.21 及更高版本默认安装 Traefik v2。出于安全考虑，默认不公开 Traefik Dashboard。常见的公开 Dashborad 的方式主要为以下两种：

#### 方法 1：通过端口转发来实现

```
kubectl -n kube-system port-forward $(kubectl -n kube-system get pods --selector "app.kubernetes.io/name=traefik" --output=name) 9000:9000
```

可通过 http://127.0.0.1:9000/dashboard/ 访问 Dashboard:

![](https://tva1.sinaimg.cn/large/008i3skNly1gy9uukct5ej31ia0u00we.jpg)

#### 方法 2：IngressRoute CRD

另一种方法是通过定义和应用 IngressRoute CRD (`kubectl apply -f dashboard.yaml`)：

```
# dashboard.yaml
apiVersion: traefik.containo.us/v1alpha1
kind: IngressRoute
metadata:
  name: dashboard
spec:
  entryPoints:
    - web
  routes:
    - match: Host(`traefik.example`) && (PathPrefix(`/dashboard`) || PathPrefix(`/api`))
      kind: Rule
      services:
        - name: api@internal
          kind: TraefikService
```

部署成功后，可通过 http://traefik.example/dashboard/ 访问 Dashboard:

![](https://tva1.sinaimg.cn/large/008i3skNly1gy9v1rtr53j31j10u0782.jpg)

## 参考

traefik-helm-chart：https://github.com/traefik/traefik-helm-chart/
更多 Traefik Dashboard 配置：https://doc.traefik.io/traefik/operations/dashboard/
