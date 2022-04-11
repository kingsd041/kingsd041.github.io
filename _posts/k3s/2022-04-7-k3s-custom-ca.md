---
layout: post
title: 突破K3s CA 证书10 年有效期的限制
subtitle:
date: 2022-4-7 21:06:00 +0800
author: Ksd
header-img: img/post-bg-desk.jpg
catalog: true
tags:
  - K3s
  - cacert
  - 证书
---

## 前言

K3s 启动时会自动生成 CA 证书，CA 证书的有效期为 10 年。其他证书有效期为 1 年，如果证书已经过期或剩余的时间不足 90 天，则在 K3s 重启时轮换证书。K3s 服务只是一个进程，K3s 服务重启不会影响正在运行的 pod，也不会影响你的业务。 

如果你担心 10 年的 CA 有效期太短，你可以自签名一个 CA 证书，然后 K3s 启动时使用你自签的 CA 去启动即可。

下面通过一个示例来介绍如何自签一个 100 年有效期的 CA，并使用这个 CA 来启动 K3s，从而突破K3s CA 证书10 年有效期的限制。

## 突破K3s CA 证书10 年有效期的限制

#### 创建 100 年有效期的 CA 证书

```
mkdir -p /var/lib/rancher/k3s/server/tls
cd /var/lib/rancher/k3s/server/tls
openssl genrsa -out client-ca.key 2048
openssl genrsa -out server-ca.key 2048
openssl genrsa -out request-header-ca.key 2048
openssl req -x509 -new -nodes -key client-ca.key -sha256 -days 36500 -out client-ca.crt -addext keyUsage=critical,digitalSignature,keyEncipherment,keyCertSign -subj '/CN=k3s-client-ca'
openssl req -x509 -new -nodes -key server-ca.key -sha256 -days 36500 -out server-ca.crt -addext keyUsage=critical,digitalSignature,keyEncipherment,keyCertSign -subj '/CN=k3s-server-ca'
openssl req -x509 -new -nodes -key request-header-ca.key -sha256 -days 36500 -out request-header-ca.crt -addext keyUsage=critical,digitalSignature,keyEncipherment,keyCertSign -subj '/CN=k3s-request-header-ca'
```

#### 使用自签名 CA 证书启动 K3s

因为我们已经在 `/var/lib/rancher/k3s/server/tls` 创建了 CA 证书，所以当启动 K3s 时，将使用已创建的 CA 颁发证书。

你可以像往常一样安装 K3s：

```
curl -sfL https://get.k3s.io | INSTALL_K3S_CHANNEL=v1.21  sh -
```

#### 查看证书有效期

```
root@dev-1:/var/lib/rancher/k3s/server/tls# for i in `ls /var/lib/rancher/k3s/server/tls/*.crt`; do echo $i; openssl x509 -enddate -noout -in $i; done
/var/lib/rancher/k3s/server/tls/client-admin.crt
notAfter=Apr  7 02:50:31 2023 GMT
/var/lib/rancher/k3s/server/tls/client-auth-proxy.crt
notAfter=Apr  7 02:50:31 2023 GMT
/var/lib/rancher/k3s/server/tls/client-ca.crt
notAfter=Mar 14 02:49:24 2122 GMT
/var/lib/rancher/k3s/server/tls/client-controller.crt
notAfter=Apr  7 02:50:31 2023 GMT
/var/lib/rancher/k3s/server/tls/client-k3s-cloud-controller.crt
notAfter=Apr  7 02:50:31 2023 GMT
/var/lib/rancher/k3s/server/tls/client-k3s-controller.crt
notAfter=Apr  7 02:50:31 2023 GMT
/var/lib/rancher/k3s/server/tls/client-kube-apiserver.crt
notAfter=Apr  7 02:50:31 2023 GMT
/var/lib/rancher/k3s/server/tls/client-kube-proxy.crt
notAfter=Apr  7 02:50:31 2023 GMT
/var/lib/rancher/k3s/server/tls/client-scheduler.crt
notAfter=Apr  7 02:50:31 2023 GMT
/var/lib/rancher/k3s/server/tls/request-header-ca.crt
notAfter=Mar 14 02:49:24 2122 GMT
/var/lib/rancher/k3s/server/tls/server-ca.crt
notAfter=Mar 14 02:49:24 2122 GMT
/var/lib/rancher/k3s/server/tls/serving-kube-apiserver.crt
notAfter=Apr  7 02:50:31 2023 GMT
```

```
root@dev-1:/usr/local/bin# kubectl get secret -n kube-system k3s-serving -o jsonpath='{.data.tls\.crt}' | base64 -d | openssl x509 -noout -text | grep Not
            Not Before: Apr  7 02:49:24 2022 GMT
            Not After : Apr  7 02:50:31 2023 GMT
```

从以上结果可以看到，CA 证书的有效期已经变成了 100 年，其他的客户端证书的有效期依然是 1 年。

#### 模拟证书过期，轮换证书

将服务器时间调整为 50 年后，比如：20720407

```
root@dev-1:~# timedatectl set-ntp no
root@dev-1:~# date -s 20720407
Thu Apr  7 00:00:00 CST 2072
root@dev-1:~# date
Thu Apr  7 00:00:00 CST 2072
```

重启 K3s，触发证书轮换：

```
root@dev-1:~# service k3s restart
```

证书轮换后，再次查询证书的有效期：

```
root@dev-1:~# for i in `ls /var/lib/rancher/k3s/server/tls/*.crt`; do echo $i; openssl x509 -enddate -noout -in $i; done
/var/lib/rancher/k3s/server/tls/client-admin.crt
notAfter=Apr  6 16:00:41 2073 GMT
/var/lib/rancher/k3s/server/tls/client-auth-proxy.crt
notAfter=Apr  6 16:00:41 2073 GMT
/var/lib/rancher/k3s/server/tls/client-ca.crt
notAfter=Mar 14 02:49:24 2122 GMT
/var/lib/rancher/k3s/server/tls/client-controller.crt
notAfter=Apr  6 16:00:41 2073 GMT
/var/lib/rancher/k3s/server/tls/client-k3s-cloud-controller.crt
notAfter=Apr  6 16:00:41 2073 GMT
/var/lib/rancher/k3s/server/tls/client-k3s-controller.crt
notAfter=Apr  6 16:00:41 2073 GMT
/var/lib/rancher/k3s/server/tls/client-kube-apiserver.crt
notAfter=Apr  6 16:00:41 2073 GMT
/var/lib/rancher/k3s/server/tls/client-kube-proxy.crt
notAfter=Apr  6 16:00:41 2073 GMT
/var/lib/rancher/k3s/server/tls/client-scheduler.crt
notAfter=Apr  6 16:00:41 2073 GMT
/var/lib/rancher/k3s/server/tls/request-header-ca.crt
notAfter=Mar 14 02:49:24 2122 GMT
/var/lib/rancher/k3s/server/tls/server-ca.crt
notAfter=Mar 14 02:49:24 2122 GMT
/var/lib/rancher/k3s/server/tls/serving-kube-apiserver.crt
notAfter=Apr  6 16:00:41 2073 GMT
root@dev-1:~# kubectl get secret -n kube-system k3s-serving -o jsonpath='{.data.tls\.crt}' | base64 -d | openssl x509 -noout -text | grep Not
            Not Before: Apr  7 02:49:24 2022 GMT
            Not After : Apr  6 16:01:11 2073 GMT
root@dev-1:~# kubectl get nodes
NAME    STATUS   ROLES                  AGE   VERSION
dev-1   Ready    control-plane,master   50y   v1.21.11+k3s1
```

K3s 服务重启后，会自动轮换 K3s 证书。从以上结果可以看到 K3s 的证书已经更新到了 2073 年，已经突破了 K3s 默认生成 CA 的 10 年有效期，证明我们自签名的 CA 已经生效，客户端证书是由自签名 CA 颁发。

## 后记

本指南只是通过使用自签名 CA 的形式来延长了 CA 证书的有效期，其他客户端证书有效期依然为 1 年。我们还是需要在证书已经过期或剩余的时间不足 90 天时重启 K3s 来触发客户端证书的轮换。

也许有同学希望延长客户端证书的有效期，比如：将 kube-apiserver.crt 的有效期延长至 5 年，这样就不需要每年都重启 K3s。但目前没有原生方法可以做到这一点（改源码除外），你可以通过定时重启 K3s 服务来保证证书不会过期，重启 K3s 服务不会影响正在运行的 pod，所以你不必担心重启 K3s会对你的业务集群造成影响。

K3s 已经计划加入手动轮换证书的功能，这样就可以更新现有证书的过期时间来延长证书有效期。
