---
layout: post
title: K3s 轮换自签名 CA 证书
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

默认情况下，K3s 在第一个 Server 节点启动时生成自签名 CA 证书。这些 CA 证书自颁发日起 10 年内有效，不会自动更新。社区中有许多用户担心 10 年后 CA 证书过期，集群会出现问题。那么本文将介绍如何去轮换 CA 的证书。

要轮换 CA 证书和密钥，可使用 `k3s certificate rotate-ca` 命令。 该命令会执行完整性检查，从而确认更新的证书和密钥可用。 如果更新后的数据没有问题，则会更新数据存储的加密引导程序密钥，并在下次 K3s 启动时使用新的证书和密钥。 如果在验证证书和密钥时出现了问题，则会向系统日志报告错误，并取消操作且不做任何更改。

> 从 2023-02 版本（v1.26.2+k3s1、v1.25.7+k3s1、v1.24.11+k3s1、v1.23.17+k3s1）开始，支持 `k3s certificate rotate-ca` 命令以及使用由外部 CA 签发的 CA 证书。

## 测试环境

在我的环境中，已经创建好了一个 2 个节点的 K3s 集群，默认的 CA 有消息为 10 年。

```
root@k3s1:~# kubectl get nodes
NAME   STATUS   ROLES                  AGE     VERSION
k3s1   Ready    control-plane,master   5m23s   v1.25.7+k3s1
k3s2   Ready    <none>                 3m44s   v1.25.7+k3s1
root@k3s1:~#
root@k3s1:~# for i in `ls /var/lib/rancher/k3s/server/tls/*.crt`; do echo $i; openssl x509 -enddate -noout -in $i; done
/var/lib/rancher/k3s/server/tls/client-admin.crt
notAfter=Mar 21 17:50:37 2024 GMT
/var/lib/rancher/k3s/server/tls/client-auth-proxy.crt
notAfter=Mar 21 17:50:37 2024 GMT
/var/lib/rancher/k3s/server/tls/client-ca.crt
notAfter=Mar 19 17:50:37 2033 GMT
/var/lib/rancher/k3s/server/tls/client-ca.nochain.crt
notAfter=Mar 19 17:50:37 2033 GMT
/var/lib/rancher/k3s/server/tls/client-controller.crt
notAfter=Mar 21 17:50:37 2024 GMT
/var/lib/rancher/k3s/server/tls/client-k3s-cloud-controller.crt
notAfter=Mar 21 17:50:37 2024 GMT
/var/lib/rancher/k3s/server/tls/client-k3s-controller.crt
notAfter=Mar 21 17:50:37 2024 GMT
/var/lib/rancher/k3s/server/tls/client-kube-apiserver.crt
notAfter=Mar 21 17:50:37 2024 GMT
/var/lib/rancher/k3s/server/tls/client-kube-proxy.crt
notAfter=Mar 21 17:50:37 2024 GMT
/var/lib/rancher/k3s/server/tls/client-scheduler.crt
notAfter=Mar 21 17:50:37 2024 GMT
/var/lib/rancher/k3s/server/tls/request-header-ca.crt
notAfter=Mar 19 17:50:37 2033 GMT
/var/lib/rancher/k3s/server/tls/server-ca.crt
notAfter=Mar 19 17:50:37 2033 GMT
/var/lib/rancher/k3s/server/tls/server-ca.nochain.crt
notAfter=Mar 19 17:50:37 2033 GMT
/var/lib/rancher/k3s/server/tls/serving-kube-apiserver.crt
notAfter=Mar 21 17:50:37 2024 GMT
```

## 轮换自签名 CA 证书

要轮换 K3s 生成的自签名 CA 证书，请使用 `k3s certificate rotate-ca` 子命令。 更新后的文件必须暂存到一个临时目录中，加载到数据存储中，并且必须在所有节点上重启 K3s 才能使用更新后的证书。

K3s 仓库中的 [contrib/util/rotate-default-ca-certs.sh](https://github.com/k3s-io/k3s/blob/master/contrib/util/rotate-default-ca-certs.sh) 示例脚本用于创建由现有 CA 交叉签名的更新 CA 证书和密钥。

要使用示例脚本生成由现有 CA 交叉签名的更新的自签名证书，请运行以下命令：

```
# 创建更新的 CA 证书和密钥，由当前 CA 交叉签名。
# 该脚本将创建一个包含更新证书的新临时目录，并输出新的 Token 值。
curl -sL https://github.com/k3s-io/k3s/raw/master/contrib/util/rotate-default-ca-certs.sh | bash -

# 将更新后的证书加载到数据存储中。在脚本的输出中查看更新后的 Token 值。
k3s certificate rotate-ca --path=/var/lib/rancher/k3s/server/rotate-ca --force
```

重启 K3s server 和 agent。

## 确认证书轮换

```
root@k3s1:~# kubectl get nodes
NAME   STATUS   ROLES                  AGE     VERSION
k3s1   Ready    control-plane,master   10m     v1.25.7+k3s1
k3s2   Ready    <none>                 9m10s   v1.25.7+k3s1
root@k3s1:~# for i in `ls /var/lib/rancher/k3s/server/tls/*.crt`; do echo $i; openssl x509 -enddate -noout -in $i; done
/var/lib/rancher/k3s/server/tls/client-admin.crt
notAfter=Mar 21 17:59:03 2024 GMT
/var/lib/rancher/k3s/server/tls/client-auth-proxy.crt
notAfter=Mar 21 17:59:03 2024 GMT
/var/lib/rancher/k3s/server/tls/client-ca.crt
notAfter=Mar 17 17:58:11 2043 GMT
/var/lib/rancher/k3s/server/tls/client-ca.nochain.crt
notAfter=Mar 17 17:58:11 2043 GMT
/var/lib/rancher/k3s/server/tls/client-controller.crt
notAfter=Mar 21 17:59:03 2024 GMT
/var/lib/rancher/k3s/server/tls/client-k3s-cloud-controller.crt
notAfter=Mar 21 17:59:03 2024 GMT
/var/lib/rancher/k3s/server/tls/client-k3s-controller.crt
notAfter=Mar 21 17:59:03 2024 GMT
/var/lib/rancher/k3s/server/tls/client-kube-apiserver.crt
notAfter=Mar 21 17:59:03 2024 GMT
/var/lib/rancher/k3s/server/tls/client-kube-proxy.crt
notAfter=Mar 21 17:59:03 2024 GMT
/var/lib/rancher/k3s/server/tls/client-scheduler.crt
notAfter=Mar 21 17:59:03 2024 GMT
/var/lib/rancher/k3s/server/tls/request-header-ca.crt
notAfter=Mar 17 17:58:11 2043 GMT
/var/lib/rancher/k3s/server/tls/server-ca.crt
notAfter=Mar 17 17:58:11 2043 GMT
/var/lib/rancher/k3s/server/tls/server-ca.nochain.crt
notAfter=Mar 17 17:58:11 2043 GMT
/var/lib/rancher/k3s/server/tls/serving-kube-apiserver.crt
notAfter=Mar 21 17:59:03 2024 GMT
```

再次查看证书有效期，可以查看到 CA 证书的有效期已经变为了 20 年，另外，你可以在 rotate-default-ca-certs.sh 中自定义 CA 证书的有消息。
