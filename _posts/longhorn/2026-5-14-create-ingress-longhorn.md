---
layout: post
title: Longhorn Ingress 实践：基于 Traefik 实现 Basic Auth
subtitle: 这篇文章介绍了如何基于 Traefik 为 Longhorn 配置 Ingress、启用 Basic Auth，并支持大文件 backing image 上传。
date: 2026-5-14 11:07:00 +0800
author: Ksd
header-img: img/post-bg-debug.jpg
catalog: true
tags:
  - Longhorn
  - Traefik
---

如果你通过 kubectl 或 Helm 在 Kubernetes 集群中安装了 SUSE Storage(Longhorn)，那么你需要创建一个 Ingress，才能让外部流量访问 SUSE Storage 的 UI。

当通过 kubectl 或 Helm 安装 SUSE Storage 时，默认并不会启用认证机制。本文将介绍如何使用 Traefik 暴露 SUSE Storage UI、通过 Basic Authentication（基础认证）对其进行保护，并配置对大文件上传（例如 backing image）的支持。

随着 Kubernetes 项目正式停止维护 ingress-nginx，Traefik 已成为 Kubernetes 环境中的一个非常实用的替代方案，尤其是因为它支持标准 Ingress 资源、动态配置更新以及可复用的中间件（Middleware）组件。Kubernetes 官方已于 2025 年 11 月宣布 ingress-nginx 进入退役阶段，并将在 2026 年 3 月结束“尽力维护（best-effort maintenance）”。

## 为什么选择 Traefik？

Traefik 非常适合这个场景，原因包括：

- 它兼容标准 Kubernetes Ingress 资源
- 它支持可复用的 Middleware（中间件），用于实现认证、请求缓冲、限流、重定向、Header 管理等功能
- 它的 Kubernetes Ingress Provider 会监听 Ingress 变化，并自动生成动态路由配置
- 它是 K3s 和 RKE2 默认的 Ingress Controller，因此特别适用于边缘计算和实验环境中常见的轻量级 Kubernetes 发行版

本文默认你已经在集群中安装并运行了 Traefik Ingress Controller。Traefik 通常是 K3s 和 RKE2 的默认组件；但在其他 Kubernetes 环境中，你可能需要先手动安装 Traefik。

你可以通过以下命令确认 Traefik 是否已经运行：

```bash
kubectl get pods -A | grep traefik
```

Traefik 同时还支持一种名为 IngressRoute 的 CRD 资源，它比标准 Kubernetes Ingress 提供了更高级的路由能力。

为了保持简单性与兼容性，本文仍然使用标准 Ingress 资源，同时通过 Annotation 的方式使用 Traefik Middleware。

Traefik 官方将 IngressRoute 定义为其基于 CRD 的高级路由模型，而 Kubernetes Ingress Provider 则继续兼容标准 Kubernetes Ingress 资源。

## 安全性注意事项

Basic Authentication（基础认证）是一种简单且快速的 UI 保护方式，但它应当只在 HTTPS 环境下使用。

因为 Basic Auth 会在每次请求中携带认证信息，所以在明文 HTTP 下暴露认证信息并不适用于生产环境。

对于生产环境，Traefik 还支持结合以下额外安全机制：

- IP Allow List（IP 白名单）
- Rate Limiting（限流）
- Security Headers（安全响应头）
- 基于 ForwardAuth 的外部认证

这些都是 Traefik Proxy 所支持的标准 Middleware 模式。

## 前置条件

在开始之前，请确保：

- SUSE Storage 已安装在 `longhorn-system` 命名空间
- Traefik 已安装并运行
- Traefik Kubernetes CRD 已安装，因为 Middleware 属于 Traefik 的 CRD 资源

Traefik 官方文档指出，在创建 Middleware 对象之前，必须先在集群中注册对应的 CRD。

# 1. 创建 Basic Auth Secret

创建一个名为 `auth` 的 Basic Auth 文件，这个 Secret 必须包含一个名为 `auth` 的 key，Traefik 的 `basicAuth` Middleware 会使用它。

```bash
USER=<USERNAME_HERE>
PASSWORD=<PASSWORD_HERE>
echo "${USER}:$(openssl passwd -stdin -apr1 <<< ${PASSWORD})" > auth
```

然后在 `longhorn-system` 命名空间中创建 Secret：

```bash
kubectl -n longhorn-system create secret generic basic-auth --from-file=auth
```

这种方式会创建一个基于 `htpasswd` 格式的哈希密码条目，相比直接在 Secret 中保存明文用户名和密码更加安全。Traefik 官方文档中也说明了 BasicAuth 对 Kubernetes Secret 的支持方式。

# 2. 创建 Traefik Middleware

Traefik 使用 Middleware 来实现认证、请求处理规则等功能。

在本例中，我们将创建：

- 一个用于保护 SUSE Storage UI 的 `basicAuth` Middleware
- 一个用于支持大文件 backing image 上传的 `buffering` Middleware

创建 `longhorn-middlewares.yaml` 文件：

```yaml
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: longhorn-auth
  namespace: longhorn-system
spec:
  basicAuth:
    secret: basic-auth
---
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: longhorn-buffering
  namespace: longhorn-system
spec:
  buffering:
    # 允许最大 10,000MB 的 backing image 上传
    maxRequestBodyBytes: 10485760000
```

应用配置：

```bash
kubectl apply -f longhorn-middlewares.yaml
```

Traefik 官方文档将 Middleware 定义为 Kubernetes CRD，并说明 `buffering.maxRequestBodyBytes` 用于限制请求体大小。

这一点对于 SUSE Storage 尤其重要，因为 backing image 上传文件通常会很大。

如果没有适当配置请求体大小限制，那么超大上传请求可能会在 Ingress 层就被拒绝，甚至无法到达 SUSE Storage 前端服务。

# 3. 创建 Ingress Manifest

现在，为 SUSE Storage UI 创建一个 Ingress 资源，并通过 Traefik Annotation 挂载前面创建的两个 Middleware。

创建 `longhorn-ingress.yaml` 文件：

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: longhorn-ingress
  namespace: longhorn-system
  annotations:
    # 关联步骤 2 中创建的 Middleware
    traefik.ingress.kubernetes.io/router.middlewares:
      longhorn-system-longhorn-auth@kubernetescrd,
      longhorn-system-longhorn-buffering@kubernetescrd
spec:
  ingressClassName: traefik
  rules:
    - http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: longhorn-frontend
                port:
                  number: 80
```

应用配置：

```bash
kubectl apply -f longhorn-ingress.yaml
```

Traefik 官方文档说明，Kubernetes Ingress 中的 `router.middlewares` Annotation 可以通过逗号分隔的方式引用多个 Middleware，并使用 `@kubernetescrd` 这样的 Provider 语法。

## 你还可以为 Traefik 添加哪些功能？

Traefik 的一个重要优势在于：同一个 Ingress 可以随着时间逐步扩展更多安全性和运维能力。

根据你的环境需求，你还可以进一步启用：

- TLS 加密
- HTTP 到 HTTPS 的自动跳转
- 基于 IP 白名单的访问限制
- 安全相关响应头
- Rate Limiting（限流）

Traefik 还提供了可观测性能力，例如：

- Access Logs（访问日志）
- Metrics（指标）
- Tracing（链路追踪）

这些能力能够帮助你监控和排查访问 SUSE Storage UI 的流量问题。

## 总结

随着 ingress-nginx 退役，Traefik 成为了 Kubernetes 环境中暴露 SUSE Storage UI 的一种实用方案，同时还能保持配置的模块化与 Kubernetes 原生风格。通过将标准的 Kubernetes Ingress 与 Traefik Middleware 相结合，你可以在不更改 SUSE Storage 服务本身的情况下，添加基本身份验证和对大型后端镜像上传的支持。

对于生产环境部署，建议启用 TLS，并结合更多 Traefik 安全机制，例如：IP 白名单、 HTTP 重定向和安全响应头。
