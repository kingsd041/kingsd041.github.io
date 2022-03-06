---
layout: post
title: 如何使用 Rancher Desktop 访问 Traefik Proxy 仪表板
subtitle:
date: 2022-2-21 21:07:00 +0800
author: Ksd
header-img: img/post-bg-desk.jpg
catalog: true
tags:
  - Rancher
  - RancherDesktop
  - Traefik
---

# 如何使用 Rancher Desktop 访问 Traefik Proxy 仪表板

作者：Simon Flood  
原文连接：https://community.suse.com/posts/how-to-access-the-traefik-proxy-dashboard-using-rancher-desktop-on-linux

如果你参加了 Adrian Goins 最近关于如何使用 K3s 和 Traefik 保护和控制边缘的 Kubernetes 大师班，那么你将看到如何访问 K3s 的 Traefik Proxy 仪表板的演示。如果你不能参加他的课程，那么我建议你通过在 https://suse.to/traefik 注册来观看回放。

由于 Rancher Desktop 创建了一个单节点 K3s 集群，我非常好奇在使用 Rancher Desktop 时是否可以访问 Traefik Proxy 仪表板。我在 Adrian 的会议期间提出了这个问题，当他说应该可以时，于是我便开始着手操作，这篇文章就是结果。

> 注意：本文使用的环境为 Linux 操作系统，如 Mac 或 Windows 需视情况调整参数。

![](https://media1-production-mightynetworks.imgix.net/asset/35020621/Screenshot_from_2022-02-11_16-07-46.png?ixlib=rails-0.3.0&fm=jpg&q=75&auto=format)

Adrian 在 GitHub 上的 https://github.com/traefik-workshops/k3s-and-traefik-proxy 上发布了一些课程，我在本文中参考了这些课程：

![](https://media1-production-mightynetworks.imgix.net/asset/35020672/Screenshot_from_2022-02-11_18-59-17.png?ixlib=rails-0.3.0&fm=jpg&q=75&auto=format)

首先，克隆 Adrian 的 repo：

```
> git clone https://github.com/traefik-workshops/k3s-and-traefik-proxy.git
> cd k3s-and-traefik-proxy/
```

## 第一课: 暴露 Traefik 仪表盘

> 注意： 01-Expose-the-Dashboard 中的所有文件目前都没有在 Adrian 的课程中使用。

#### 将集群 IP 设置为变量

Adrian 建议检查 kubeconfig 文件中的集群 IP 地址，Rancher Desktop 会在主机上创建一个 `~/.kube/config` 文件：

```
> grep server ~/.kube/config
server: https://127.0.0.1:6443

> export CLUSTERIP=127.0.0.1
```

此时，Adrian 继续他的课程，但目前 Linux 上的 Rancher Desktop 存在一个问题，其中特权端口（低于 1024 的端口）无法访问。请参考 https://github.com/rancher-sandbox/rancher-desktop/issues/576

相反，Linux 上的 Rancher Desktop 用户必须知道 HTTP (80) 和 HTTPS (443) 端口已转发到哪些 Ingress 端口：

```
> kubectl get service -n kube-system traefik
NAME      TYPE           CLUSTER-IP     EXTERNAL-IP    PORT(S)                      AGE
traefik   LoadBalancer   10.43.146.37   192.168.5.15   80:30876/TCP,443:30614/TCP   26m
```

我们会将 Ingress 端口保存到变量中，我们可以在整个课程中使用：

```
> export CLUSTERHTTP=`kubectl get service -n kube-system traefik -o json | jq '.spec.ports[0].nodePort'`
> export CLUSTERHTTPS=`kubectl get service -n kube-system traefik -o json | jq '.spec.ports[1].nodePort'`
```

#### 切换当前 Namespace 为 kube-system

```
> kubectl config set-context --current --namespace kube-system
Context "rancher-desktop" modified.
```

#### 创建 Service

```
> kubectl expose deploy/traefik -n kube-system --port=9000 --target-port=9000 --name=traefik-dashboard
service/traefik-dashboard exposed
```

#### 创建 Ingress

```
> kubectl create ingress traefik-dashboard --rule="dashboard.traefik.$CLUSTERIP.sslip.io/*=traefik-dashboard:9000"
ingress.networking.k8s.io/traefik-dashboard created
```

#### 访问仪表板

在 Adrian 步骤不同的是，我们需要在 URL 中包含 HTTP 的 Ingress 端口：

```
> curl -si http://dashboard.traefik.$CLUSTERIP.sslip.io:$CLUSTERHTTP/dashboard/ | head -n 1
HTTP/1.1 200 OK
```

```
> echo http://dashboard.traefik.$CLUSTERIP.sslip.io:$CLUSTERHTTP/dashboard/
http://dashboard.traefik.127.0.0.1.sslip.io:30876/dashboard/
```

![](https://media1-production-mightynetworks.imgix.net/asset/35020752/Screenshot_from_2022-02-11_16-49-39.png?ixlib=rails-0.3.0&fm=jpg&q=75&auto=format&w=1400&h=1400&fit=max&impolicy=ResizeCrop&constraint=downsize&aspect=fit)

![](https://media1-production-mightynetworks.imgix.net/asset/35020777/Screenshot_from_2022-02-11_16-49-49.png?ixlib=rails-0.3.0&fm=jpg&q=75&auto=format)

#### 添加 Annotations

```
> kubectl annotate ingress traefik-dashboard traefik.ingress.kubernetes.io/router.entrypoints=web
ingress.networking.k8s.io/traefik-dashboard annotated
```

![](https://media1-production-mightynetworks.imgix.net/asset/35020875/Screenshot_from_2022-02-11_16-50-02.png?ixlib=rails-0.3.0&fm=jpg&q=75&auto=format)

## 第 2 课：使用 Middleware 保护仪表板

```
> cd 02-Secure-the-Dashboard-With-Middleware
```

#### 创建用户文件

注意 Adrian 已根据研讨会提供了用户文件设置：

```
> cat users
user@example.com:$apr1$nWlieTS.$pbESld2QB5uYuUTAfFICr.
admin@example.com:$apr1$XMtXkoUy$IwIKiM./ujfaYf6/MsCaf1
```

#### 从用户文件中创建仪表板 dashboard-users Secret

```
> kubectl create secret generic dashboard-users --from-file=users
secret/dashboard-users created
```

#### 从 middleware-auth.yaml 创建 Middleware

```
> cat middleware-auth.yaml
apiVersion: traefik.containo.us/v1alpha1
kind: Middleware
metadata:
  name: dashboard-auth
spec:
  basicAuth:
      secret: dashboard-users

> kubectl apply -f middleware-auth.yaml
middleware.traefik.containo.us/dashboard-auth created
```

#### 将 Middleware 应用到 Ingress

```
> kubectl annotate ingress traefik-dashboard \
traefik.ingress.kubernetes.io/router.middlewares=kube-system-dashboard-auth@kubernetescrd
ingress.networking.k8s.io/traefik-dashboard annotated
```

请注意，如果你在浏览器中一直访问仪表板，那么现在应该提示你输入用户名和密码：

![](https://media1-production-mightynetworks.imgix.net/asset/35020903/Screenshot_from_2022-02-11_17-03-33.png?ixlib=rails-0.3.0&fm=jpg&q=75&auto=format)

#### 测试 Middleware

```
> curl -si http://dashboard.traefik.$CLUSTERIP.sslip.io:$CLUSTERHTTP/dashboard/ | head -n 1
HTTP/1.1 401 Unauthorized
```

```
> curl -si -u 'admin@example.com:admin1234' http://dashboard.traefik.$CLUSTERIP.sslip.io:$CLUSTERHTTP/dashboard/ | head -n 1
HTTP/1.1 200 OK
```

#### 创建 Middleware 以添加 /dashboard 前缀

```
> cat middleware-rewrite.yaml
apiVersion: traefik.containo.us/v1alpha1
kind: Middleware
metadata:
  name: dashboard-rewrite
spec:
  addPrefix:
    prefix: /dashboard

> kubectl apply -f middleware-rewrite.yaml
middleware.traefik.containo.us/dashboard-rewrite created
```

#### 将第二个 Middleware 应用到 Ingress

```
> kubectl annotate ingress traefik-dashboard \
  traefik.ingress.kubernetes.io/router.middlewares=kube-system-dashboard-rewrite@kubernetescrd,kube-system-dashboard-auth@kubernetescrd \
  --overwrite=true
ingress.networking.k8s.io/traefik-dashboard annotated
```

#### 访问没有 /dashboard/ 的仪表板

```
> curl -si http://dashboard.traefik.$CLUSTERIP.sslip.io:$CLUSTERHTTP/ | head -n 1
HTTP/1.1 401 Unauthorized
```

![](https://media1-production-mightynetworks.imgix.net/asset/35020943/Screenshot_from_2022-02-11_17-09-23.png?ixlib=rails-0.3.0&fm=jpg&q=75&auto=format)

#### 修复仪表板

```
> kubectl create ingress traefik-dashboard-api --rule="dashboard.traefik.$CLUSTERIP.sslip.io/api/*=traefik-dashboard:9000"
ingress.networking.k8s.io/traefik-dashboard-api created
```

```
> kubectl annotate ingress traefik-dashboard-api \
  traefik.ingress.kubernetes.io/router.middlewares=kube-system-dashboard-auth@kubernetescrd
ingress.networking.k8s.io/traefik-dashboard-api annotated
```

![](https://media1-production-mightynetworks.imgix.net/asset/35020960/Screenshot_from_2022-02-11_17-11-00.png?ixlib=rails-0.3.0&fm=jpg&q=75&auto=format)

## 第 3 课：使用 IngressRoute 自定义资源

```
> cd ../03-Use-the-IngressRoute-Custom-Resource/
```

#### 将 Ingress 更改为 IngressRoutes

移除之前创建的 Ingress：

```
> kubectl delete ingress/traefik-dashboard ingress/traefik-dashboard-api
ingress.networking.k8s.io "traefik-dashboard" deleted
ingress.networking.k8s.io "traefik-dashboard-api" deleted
```

创建新的 IngressRoute，我们需要更改 IP 地址：

```
> cat ingressroute.yaml
apiVersion: traefik.containo.us/v1alpha1
kind: IngressRoute
metadata:
  name: traefik-dashboard-secure
spec:
  entryPoints:
  - web
  routes:
  - kind: Rule
    match: Host("dashboard.traefik.10.68.0.70.sslip.io")
    services:
    - name: traefik-dashboard
      port: 9000
    middlewares:
    - name: dashboard-auth
    - name: dashboard-rewrite
  - kind: Rule
    match: Host("dashboard.traefik.10.68.0.70.sslip.io") && PathPrefix("/api")
    services:
    - name: traefik-dashboard
      port: 9000
    middlewares:
    - name: dashboard-auth

> sed -i "s/10\.68\.0\.70/${CLUSTERIP}/" ingressroute.yaml

> cat ingressroute.yaml
apiVersion: traefik.containo.us/v1alpha1
kind: IngressRoute
metadata:
  name: traefik-dashboard-secure
spec:
  entryPoints:
  - web
  routes:
  - kind: Rule
    match: Host("dashboard.traefik.127.0.0.1.sslip.io")
    services:
    - name: traefik-dashboard
      port: 9000
    middlewares:
    - name: dashboard-auth
    - name: dashboard-rewrite
  - kind: Rule
    match: Host("dashboard.traefik.127.0.0.1.sslip.io") && PathPrefix("/api")
    services:
    - name: traefik-dashboard
      port: 9000
    middlewares:
    - name: dashboard-auth

> kubectl apply -f ingressroute.yaml
ingressroute.traefik.containo.us/traefik-dashboard-secure created
```

#### 查看 IngressRoute

```
> kubectl get ingressroute traefik-dashboard -o yaml
apiVersion: traefik.containo.us/v1alpha1
kind: IngressRoute
metadata:
  annotations:
    helm.sh/hook: post-install,post-upgrade
  creationTimestamp: "2022-02-11T16:01:09Z"
  generation: 1
  labels:
    app.kubernetes.io/instance: traefik
    app.kubernetes.io/managed-by: Helm
    app.kubernetes.io/name: traefik
    helm.sh/chart: traefik-10.9.100
  name: traefik-dashboard
  namespace: kube-system
  resourceVersion: "657"
  uid: 7993457e-7cde-478b-82c9-76acc5eebbd9
spec:
  entryPoints:
  - traefik
  routes:
  - kind: Rule
    match: PathPrefix(`/dashboard`) || PathPrefix(`/api`)
    services:
    - kind: TraefikService
      name: api@internal
```

#### 什么是 TraefikService？

```
> kubectl patch ingressroute/traefik-dashboard-secure --type=json --patch-file patch-dashboard-service.yaml
ingressroute.traefik.containo.us/traefik-dashboard-secure patched
```

```
> kubectl delete service traefik-dashboard
service "traefik-dashboard" deleted
```

```
> curl -si -u 'admin@example.com:admin1234' http://dashboard.traefik.$CLUSTERIP.sslip.io:$CLUSTERHTTP/ | head -n 1
HTTP/1.1 200 OK
```

## 第 4 课：使用 TLS 保护仪表板

```
> cd ../04-Secure-the-Dashboard-With-TLS/
```

#### 设置 cert-manager

我使用了最新版本的 cert-manager，目前是 1.7.1：

```
> kubectl apply -f https://github.com/jetstack/cert-manager/releases/download/v1.7.1/cert-manager.yaml
customresourcedefinition.apiextensions.k8s.io/certificaterequests.cert-manager.io created
customresourcedefinition.apiextensions.k8s.io/certificates.cert-manager.io created
...
...
...
mutatingwebhookconfiguration.admissionregistration.k8s.io/cert-manager-webhook created
validatingwebhookconfiguration.admissionregistration.k8s.io/cert-manager-webhook created
```

```
> kubectl get pods -n cert-manager
NAME                                     READY   STATUS    RESTARTS   AGE
cert-manager-cainjector-d6cbc4d9-j8q8x   1/1     Running   0          70s
cert-manager-6d8d6b5dbb-ts2mq            1/1     Running   0          70s
cert-manager-webhook-85fb68c79b-ql658    1/1     Running   0          70s
```

#### 创建 ClusterIssuer

```
> cat clusterissuer.yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: selfsigned
spec:
  selfSigned: {}

> kubectl apply -f clusterissuer.yaml
clusterissuer.cert-manager.io/selfsigned created
```

#### 为仪表板生成证书

我们需要更改 IP 地址：

```
> cat certificate.yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: dashboard
spec:
  subject:
    organizations:
    - Traefik Academy
  commonName: dashboard.traefik.10.68.0.70.sslip.io
  issuerRef:
    kind: ClusterIssuer
    name: selfsigned
  secretName: dashboard-crt

> sed -i "s/10\.68\.0\.70/${CLUSTERIP}/" certificate.yaml

> cat certificate.yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: dashboard
spec:
  subject:
    organizations:
    - Traefik Academy
  commonName: dashboard.traefik.127.0.0.1.sslip.io
  issuerRef:
    kind: ClusterIssuer
    name: selfsigned
  secretName: dashboard-crt

> kubectl apply -f certificate.yaml
certificate.cert-manager.io/dashboard created
```

```
> kubectl get secret | grep tls
k3s-serving                                          kubernetes.io/tls                     2      87m
dashboard-crt                                        kubernetes.io/tls                     3      13s
```

#### 将证书添加到 IngressRoute

```
> cat patch-dashboard-tls.yaml
- op: replace
  path: /spec/entryPoints
  value:
    - websecure
- op: add
  path: /spec/tls
  value:
    secretName: dashboard-crt

> kubectl patch ingressroute/traefik-dashboard-secure \
  --type=json \
  --patch-file patch-dashboard-tls.yaml
ingressroute.traefik.containo.us/traefik-dashboard-secure patched
```

```
> echo https://dashboard.traefik.$CLUSTERIP.sslip.io:$CLUSTERHTTPS/
https://dashboard.traefik.127.0.0.1.sslip.io:30614/
```

![](https://media1-production-mightynetworks.imgix.net/asset/35021016/Screenshot_from_2022-02-11_17-28-53.png?ixlib=rails-0.3.0&fm=jpg&q=75&auto=format&w=1400&h=1400&fit=max&impolicy=ResizeCrop&constraint=downsize&aspect=fit)

![](https://media1-production-mightynetworks.imgix.net/asset/35021056/Screenshot_from_2022-02-11_17-29-12.png?ixlib=rails-0.3.0&fm=jpg&q=75&auto=format)

#### 添加 HTTP 重定向

```
> cat middleware-scheme.yaml
apiVersion: traefik.containo.us/v1alpha1
kind: Middleware
metadata:
  name: redirect-permanent
spec:
  redirectScheme:
    permanent: true
    scheme: https
```

需要在 middleware-scheme.yaml 添加 HTTPS 端口，并在 ingressroute.yaml 中更改 IP 地址：

```
> echo "    port: \"${CLUSTERHTTPS}\"" >> middleware-scheme.yaml

> cat middleware-scheme.yaml
apiVersion: traefik.containo.us/v1alpha1
kind: Middleware
metadata:
  name: redirect-permanent
spec:
  redirectScheme:
    permanent: true
    scheme: https
    port: "30614"

> kubectl apply -f middleware-scheme.yaml
middleware.traefik.containo.us/redirect-permanent created

> cat ingressroute.yaml
apiVersion: traefik.containo.us/v1alpha1
kind: IngressRoute
metadata:
  name: traefik-dashboard-http
spec:
  entryPoints:
  - web
  routes:
  - kind: Rule
    match: Host("dashboard.traefik.10.68.0.70.sslip.io")
    services:
    - name: api@internal
      kind: TraefikService
    middlewares:
    - name: redirect-permanent

> sed -i "s/10\.68\.0\.70/${CLUSTERIP}/" ingressroute.yaml

> cat ingressroute.yaml
apiVersion: traefik.containo.us/v1alpha1
kind: IngressRoute
metadata:
  name: traefik-dashboard-http
spec:
  entryPoints:
  - web
  routes:
  - kind: Rule
    match: Host("dashboard.traefik.127.0.0.1.sslip.io")
    services:
    - name: api@internal
      kind: TraefikService
    middlewares:
    - name: redirect-permanent

> kubectl apply -f ingressroute.yaml
ingressroute.traefik.containo.us/traefik-dashboard-http created
```

```
> curl -si http://dashboard.traefik.$CLUSTERIP.sslip.io:$CLUSTERHTTP/ | head -n 1
HTTP/1.1 301 Moved Permanently
```

如果我们删除 head 命令，我们可以看到它被移动到了哪里：

```
> curl -si http://dashboard.traefik.$CLUSTERIP.sslip.io:$CLUSTERHTTP/
HTTP/1.1 301 Moved Permanently
Location: https://dashboard.traefik.127.0.0.1.sslip.io:30614/
Date: Fri, 11 Feb 2022 17:40:15 GMT
Content-Length: 17
Content-Type: text/plain; charset=utf-8
```

该位置应包括 HTTPS 的 Ingress 端口：

```
> echo http://dashboard.traefik.$CLUSTERIP.sslip.io:$CLUSTERHTTP/
http://dashboard.traefik.127.0.0.1.sslip.io:30876/
```

如果我们在 Web 浏览器中打开 URL，它应该重定向到 HTTPS 站点。如果没有，你可能需要清除 Web 浏览器的缓存。
