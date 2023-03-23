---
layout: post
title: 使用自定义 CA 证书启动 K3s
subtitle: 本文将介绍如何使用自定义 CA 证书来启动 K3s
date: 2023-3-23 11:06:00 +0800
author: Ksd
header-img: img/post-bg-desk.jpg
catalog: true
tags:
  - K3s
  - 证书
---

> 本文内容参考 K3s 官网 [k3s certificate 章节](https://docs.k3s.io/zh/cli/certificate)

Kubernetes 需要大量 CA 证书才能正常运行。有关 Kubernetes 如何使用 CA 证书，请参阅 Kubernetes [PKI 证书和要求](https://kubernetes.io/docs/setup/best-practices/certificates/#all-certificates)文档。

默认情况下，K3s 在第一个 Server 节点启动时生成自签名 CA 证书。这些 CA 证书自颁发日起 10 年内有效，不会自动更新。

## 预先创建证书和密钥

在集群中的第一台 Server 初始启动期间，如果找到了放置在正确位置的 CA 证书和密钥，将不会自动生成 CA 证书。 也就是说如果在启动 K3s 之前，`/var/lib/rancher/k3s/server/tls` 目录下已经存在了自定义 CA 等证书，K3s 启动后会使用这些自定义的 CA 证书去颁发服务器证书和客户端证书。

所以，我们可以通过 K3s 仓库中的 [contrib/util/generate-custom-ca-certs.sh](https://github.com/k3s-io/k3s/blob/master/contrib/util/generate-custom-ca-certs.sh) 示例脚本用于预先创建证书和密钥。 该脚本应在首次启动 K3s 之前运行，能创建一整套由通用根证书和中间 CA 证书签名的叶 CA 证书。 如果你已有根证书或中间 CA 证书，你可以使用此脚本（或用作起点）创建 CA 证书，从而使用现有机构中的 PKI 来配置 K3s 集群。

要在启动 K3s 之前使用示例脚本生成自定义证书和密钥，请运行以下命令：

```
# 创建用于生成证书的目标目录。
mkdir -p /var/lib/rancher/k3s/server/tls

# 生成自定义 CA 证书和密钥。
curl -sL https://github.com/k3s-io/k3s/raw/master/contrib/util/generate-custom-ca-certs.sh | bash -
```

> 你可以修改 generate-custom-ca-certs.sh 中相关 CA 的签发有效期，默认：root ca 是 7300 天。

## 启动 K3s

```
root@k3s1:~# curl -sfL https://rancher-mirror.rancher.cn/k3s/k3s-install.sh | INSTALL_K3S_MIRROR=cn  sh -
[INFO]  Finding release for channel stable
[INFO]  Using v1.25.7+k3s1 as release
[INFO]  Downloading hash rancher-mirror.rancher.cn/k3s/v1.25.7-k3s1/sha256sum-amd64.txt
[INFO]  Downloading binary rancher-mirror.rancher.cn/k3s/v1.25.7-k3s1/k3s
[INFO]  Verifying binary download
[INFO]  Installing k3s to /usr/local/bin/k3s
[INFO]  Skipping installation of SELinux RPM
[INFO]  Creating /usr/local/bin/kubectl symlink to k3s
[INFO]  Creating /usr/local/bin/crictl symlink to k3s
[INFO]  Skipping /usr/local/bin/ctr symlink to k3s, command exists in PATH at /usr/bin/ctr
[INFO]  Creating killall script /usr/local/bin/k3s-killall.sh
[INFO]  Creating uninstall script /usr/local/bin/k3s-uninstall.sh
[INFO]  env: Creating environment file /etc/systemd/system/k3s.service.env
[INFO]  systemd: Creating service file /etc/systemd/system/k3s.service
[INFO]  systemd: Enabling k3s unit
Created symlink /etc/systemd/system/multi-user.target.wants/k3s.service → /etc/systemd/system/k3s.service.
[INFO]  systemd: Starting k3s
```

## 确认证书有效期

```
root@k3s1:~# for i in `ls /var/lib/rancher/k3s/server/tls/*.crt`; do echo $i; openssl x509 -enddate -noout -in $i; done
/var/lib/rancher/k3s/server/tls/client-admin.crt
notAfter=Mar 21 16:48:08 2024 GMT
/var/lib/rancher/k3s/server/tls/client-auth-proxy.crt
notAfter=Mar 21 16:48:08 2024 GMT
/var/lib/rancher/k3s/server/tls/client-ca.crt
notAfter=Mar 18 16:44:39 2038 GMT
/var/lib/rancher/k3s/server/tls/client-ca.nochain.crt
notAfter=Mar 18 16:44:39 2038 GMT
/var/lib/rancher/k3s/server/tls/client-controller.crt
notAfter=Mar 21 16:48:08 2024 GMT
/var/lib/rancher/k3s/server/tls/client-k3s-cloud-controller.crt
notAfter=Mar 21 16:48:08 2024 GMT
/var/lib/rancher/k3s/server/tls/client-k3s-controller.crt
notAfter=Mar 21 16:48:08 2024 GMT
/var/lib/rancher/k3s/server/tls/client-kube-apiserver.crt
notAfter=Mar 21 16:48:08 2024 GMT
/var/lib/rancher/k3s/server/tls/client-kube-proxy.crt
notAfter=Mar 21 16:48:08 2024 GMT
/var/lib/rancher/k3s/server/tls/client-scheduler.crt
notAfter=Mar 21 16:48:08 2024 GMT
/var/lib/rancher/k3s/server/tls/intermediate-ca.crt
notAfter=Mar 18 16:44:38 2038 GMT
/var/lib/rancher/k3s/server/tls/request-header-ca.crt
notAfter=Mar 18 16:44:39 2038 GMT
/var/lib/rancher/k3s/server/tls/root-ca.crt
notAfter=Mar 17 16:44:35 2043 GMT
/var/lib/rancher/k3s/server/tls/server-ca.crt
notAfter=Mar 18 16:44:39 2038 GMT
/var/lib/rancher/k3s/server/tls/server-ca.nochain.crt
notAfter=Mar 18 16:44:39 2038 GMT
/var/lib/rancher/k3s/server/tls/serving-kube-apiserver.crt
notAfter=Mar 21 16:48:08 2024 GMT
```

从获取的有效期可以看到我们的 root-ca 的证书有消息是 20 年，其他 CA 证书有消息为 15 年。
