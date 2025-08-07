---
layout: post
title: RKE2 证书有效期太短？一招将证书延长至 10 年！
subtitle:
date: 2025-7-3 11:07:00 +0800
author: Ksd
header-img: img/post-bg-debug.jpg
catalog: true
tags:
  - certificate
---

在使用 RKE2 搭建生产环境时，大家或许遇到过证书有效期过短的问题。默认情况下，RKE2 中的系统证书有效期为 12 个月，临近过期后在服务重启时会自动轮换。然而，在实际部署中，我们常常希望将证书有效期设置得更长，避免频繁运维。

本文将介绍如何在 **RKE2 初始安装阶段** 或 **已有集群中**，通过配置环境变量 `CATTLE_NEW_SIGNED_CERT_EXPIRATION_DAYS`，将证书有效期延长至 **5 年、甚至 10 年**，让你的集群更“省心”。


> 注意：`CATTLE_NEW_SIGNED_CERT_EXPIRATION_DAYS` 的最大值为 3650（即 10 年），因为 RKE2 内部 CA 的最大有效期也是 10 年。

## 初始安装集群设置证书有效期

**Step 1：配置环境变量**

在安装 **每个 RKE2 Server（Control-plane/etcd）节点** 时，添加如下环境变量：

```bash
cat << EOF > /etc/default/rke2-server
CATTLE_NEW_SIGNED_CERT_EXPIRATION_DAYS=3650
EOF
```

该配置会将 RKE2 所有关键组件（如 kube-apiserver、etcd、kubelet 等）的证书有效期设置为 10 年。

**Step 2：安装并启动 RKE2**

```bash
curl -sfL https://get.rke2.io | sh -
systemctl start rke2-server.service
```

**Step 3：验证证书有效期**

```bash
rke2 certificate check
```

执行结果：

```bash
INFO[0000] Server detected, checking agent and server certificates
INFO[0000] client-rke2-controller.crt: certificate system:rke2-controller (ClientAuth) is ok, expires at 2035-07-01T07:07:52Z
INFO[0000] client-rke2-controller.crt: certificate rke2-client-ca@1751526470 (CertSign) is ok, expires at 2035-07-01T07:07:50Z
INFO[0000] client-admin.crt: certificate system:admin (ClientAuth) is ok, expires at 2035-07-01T07:07:50Z
INFO[0000] client-admin.crt: certificate rke2-client-ca@1751526470 (CertSign) is ok, expires at 2035-07-01T07:07:50Z
INFO[0000] client-auth-proxy.crt: certificate system:auth-proxy (ClientAuth) is ok, expires at
...
...
...
INFO[0000] client-supervisor.crt: certificate system:rke2-supervisor (ClientAuth) is ok, expires at 2035-07-01T07:07:50Z
INFO[0000] client-supervisor.crt: certificate rke2-client-ca@1751526470 (CertSign) is ok, expires at 2035-07-01T07:07:50Z
INFO[0000] client-kube-proxy.crt: certificate system:kube-proxy (ClientAuth) is ok, expires at 2035-07-01T07:07:52Z
INFO[0000] client-kube-proxy.crt: certificate rke2-client-ca@1751526470 (CertSign) is ok, expires at 2035-07-01T07:07:50Z
```

你将看到所有证书的过期时间已延长至 2035 年。

## 已部署集群中修改证书有效期

**Step 1：停止服务**

```bash
systemctl stop rke2-server.service
```

**Step 2：配置环境变量**

```bash
cat << EOF > /etc/default/rke2-server
CATTLE_NEW_SIGNED_CERT_EXPIRATION_DAYS=3650
EOF
```

**Step 3：执行证书轮换**

```bash
rke2 certificate rotate
```

**Step 4：重启服务**

```bash
systemctl start rke2-server.service
```

**Step 5：验证证书有效期**

```bash
rke2 certificate check
```

执行结果：

```BASH
root@ip-172-31-16-225:~# rke2 certificate check
INFO[0000] Server detected, checking agent and server certificates
INFO[0000] client-kube-apiserver.crt: certificate system:apiserver (ClientAuth) is ok, expires at 2035-07-01T07:33:54Z
INFO[0000] client-kube-apiserver.crt: certificate rke2-client-ca@1751527477 (CertSign) is ok, expires at 2035-07-01T07:24:37Z
INFO[0000] serving-kube-apiserver.crt: certificate kube-apiserver (ServerAuth) is ok, expires at 2035-07-01T07:33:54Z
INFO[0000] serving-kube-apiserver.crt: certificate rke2-server-ca@1751527477 (CertSign) is ok, expires at 2035-07-01T07:24:37Z
INFO[0000] client-auth-proxy.crt: certificate system:auth-proxy (ClientAuth) is ok, expires at 2035-07-01T07:33:54Z
...
...
...
INFO[0000] client-kube-proxy.crt: certificate rke2-client-ca@1751527477 (CertSign) is ok, expires at 2035-07-01T07:24:37Z
INFO[0000] client-kubelet.crt: certificate system:node:ip-172-31-16-225 (ClientAuth) is ok, expires at 2035-07-01T07:33:56Z
INFO[0000] client-kubelet.crt: certificate rke2-client-ca@1751527477 (CertSign) is ok, expires at 2035-07-01T07:24:37Z
INFO[0000] serving-kubelet.crt: certificate ip-172-31-16-225 (ServerAuth) is ok, expires at 2035-07-01T07:33:55Z
INFO[0000] serving-kubelet.crt: certificate rke2-server-ca@1751527477 (CertSign) is ok, expires at 2035-07-01T07:24:37Z
```

确认所有证书的有效期已更新。

**Step 6：在其他 Control-plane/etcd 节点重复 Step 1 ～ 5 的操作**

确保整个集群的证书一致更新。

## 写在最后

证书轮换和有效期管理，是保障集群稳定运行的基础工作之一。通过合理配置 `CATTLE_NEW_SIGNED_CERT_EXPIRATION_DAYS`，你可以大幅延长证书的生命周期，降低运维成本。

欢迎转发这篇文章给你的运维团队伙伴，也欢迎在评论区分享你的使用体验和技巧。如果你想了解更多 RKE2 相关实战配置技巧，记得关注我们，Rancher 社区与你一同探索云原生世界！
