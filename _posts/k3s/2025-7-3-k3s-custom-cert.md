---
layout: post
title: K3S 证书有效期太短？一招将证书延长至 10 年！
subtitle:
date: 2025-7-3 11:08:00 +0800
author: Ksd
header-img: img/post-bg-debug.jpg
catalog: true
tags:
  - certificate
---

在使用 K3S 搭建生产环境时，大家或许遇到过证书有效期过短的问题。默认情况下，K3S 中的系统证书有效期为 12 个月，临近过期后在服务重启时会自动轮换。然而，在实际部署中，我们常常希望将证书有效期设置得更长，避免频繁运维。

本文将介绍如何在 **K3S 初始安装阶段** 或 **已有集群中**，通过配置环境变量 `CATTLE_NEW_SIGNED_CERT_EXPIRATION_DAYS`，将证书有效期延长至 **5 年、甚至 10 年**，让你的集群更“省心”。

> 注意：`CATTLE_NEW_SIGNED_CERT_EXPIRATION_DAYS` 的最大值为 3650（即 10 年），因为 K3S 内部 CA 的最大有效期也是 10 年。

## 初始安装集群设置证书有效期

**Step 1：配置环境变量**

在安装 **每个 K3S Server（Control-plane/etcd）节点** 时，添加如下环境变量：

```bash
cat << EOF > /etc/default/k3s
CATTLE_NEW_SIGNED_CERT_EXPIRATION_DAYS=3650
EOF
```

该配置会将 K3S 所有关键组件（如 kube-apiserver、etcd、kubelet 等）的证书有效期设置为 10 年。

**Step 2：安装并启动 K3S**

```bash
curl -sfL https://get.k3s.io | sh -
```

**Step 3：验证证书有效期**

```bash
k3s certificate check
```

执行结果：

```bash
INFO[0000] Server detected, checking agent and server certificates
INFO[0000] client.crt: certificate etcd-client (ClientAuth) is ok, expires at 2035-07-01T07:47:40Z
INFO[0000] client.crt: certificate etcd-server-ca@1751528860 (CertSign) is ok, expires at 2035-07-01T07:47:40Z
INFO[0000] server-client.crt: certificate etcd-server (ServerAuth,ClientAuth) is ok, expires at 2035-07-01T07:47:40Z
INFO[0000] server-client.crt: certificate etcd-server-ca@1751528860 (CertSign) is ok, expires at 2035-07-01T07:47:40Z
INFO[0000] peer-server-client.crt: certificate etcd-peer (ServerAuth,ClientAuth) is ok, expires at 2035-07-01T07:47:40Z
INFO[0000] peer-server-client.crt: certificate etcd-peer-ca@1751528860 (CertSign) is ok, expires at 2035-07-01T07:47:40Z
...
...
...
INFO[0000] client-k3s-controller.crt: certificate system:k3s-controller (ClientAuth) is ok, expires at 2035-07-01T07:47:42Z
INFO[0000] client-k3s-controller.crt: certificate k3s-client-ca@1751528860 (CertSign) is ok, expires at 2035-07-01T07:47:40Z
INFO[0000] client-kube-apiserver.crt: certificate system:apiserver (ClientAuth) is ok, expires at 2035-07-01T07:47:40Z
INFO[0000] client-kube-apiserver.crt: certificate k3s-client-ca@1751528860 (CertSign) is ok, expires at 2035-07-01T07:47:40Z
INFO[0000] serving-kube-apiserver.crt: certificate kube-apiserver (ServerAuth) is ok, expires at 2035-07-01T07:47:40Z
INFO[0000] serving-kube-apiserver.crt: certificate k3s-server-ca@1751528860 (CertSign) is ok, expires at 2035-07-01T07:47:40Z
```

你将看到所有证书的过期时间已延长至 2035 年。


## 已部署集群中修改证书有效期

**Step 1：停止服务**

```bash
systemctl stop k3s.service
```

**Step 2：配置环境变量**

```bash
cat << EOF > /etc/default/k3s
CATTLE_NEW_SIGNED_CERT_EXPIRATION_DAYS=3650
EOF
```

**Step 3：执行证书轮换**

```bash
k3s certificate rotate
```

以下证书将被轮换：

supervisor、kube-proxy、kubelet、k3s-controller、api-server、admin、scheduler、etcd、auth-proxy、cloud-controller、controller-manager

**Step 4：重启服务**

```bash
systemctl start k3s.service
```

**Step 5：验证证书有效期**

```bash
k3s certificate check
```

执行结果：

```BASH
INFO[0000] Server detected, checking agent and server certificates
INFO[0000] client.crt: certificate etcd-client (ClientAuth) is ok, expires at 2035-07-01T07:53:02Z
INFO[0000] client.crt: certificate etcd-server-ca@1751529127 (CertSign) is ok, expires at 2035-07-01T07:52:07Z
INFO[0000] server-client.crt: certificate etcd-server (ServerAuth,ClientAuth) is ok, expires at 2035-07-01T07:53:02Z
INFO[0000] server-client.crt: certificate etcd-server-ca@1751529127 (CertSign) is ok, expires at 2035-07-01T07:52:07Z
INFO[0000] peer-server-client.crt: certificate etcd-peer (ServerAuth,ClientAuth) is ok, expires at 2035-07-01T07:53:02Z
INFO[0000] peer-server-client.crt: certificate etcd-peer-ca@1751529127 (CertSign) is ok, expires at 2035-07-01T07:52:07Z
INFO[0000] client-scheduler.crt: certificate system:kube-scheduler (ClientAuth) is ok, expires at 2035-07-01T07:53:02Z
INFO[0000] client-scheduler.crt: certificate k3s-client-ca@1751529127 (CertSign) is ok, expires at 2035-07-01T07:52:07Z
...
...
...
INFO[0000] client-controller.crt: certificate system:kube-controller-manager (ClientAuth) is ok, expires at 2035-07-01T07:53:02Z
INFO[0000] client-controller.crt: certificate k3s-client-ca@1751529127 (CertSign) is ok, expires at 2035-07-01T07:52:07Z
INFO[0000] kube-controller-manager.crt: certificate kube-controller-manager (ServerAuth) is ok, expires at 2035-07-01T07:53:02Z
INFO[0000] kube-controller-manager.crt: certificate k3s-server-ca@1751529127 (CertSign) is ok, expires at 2035-07-01T07:52:07Z
INFO[0000] client-supervisor.crt: certificate system:k3s-supervisor (ClientAuth) is ok, expires at 2035-07-01T07:53:02Z
INFO[0000] client-supervisor.crt: certificate k3s-client-ca@1751529127 (CertSign) is ok, expires at 2035-07-01T07:52:07Z
```

确认所有证书的有效期已更新。

**Step 6：在其他 Control-plane/etcd 节点重复 Step 1 ～ 5 的操作**

确保整个集群的证书一致更新。

## 写在最后

证书轮换和有效期管理，是保障集群稳定运行的基础工作之一。通过合理配置 `CATTLE_NEW_SIGNED_CERT_EXPIRATION_DAYS`，你可以大幅延长证书的生命周期，降低运维成本。

欢迎转发这篇文章给你的运维团队伙伴，也欢迎在评论区分享你的使用体验和技巧。如果你想了解更多 K3S 相关实战配置技巧，记得关注我们，Rancher 社区与你一同探索云原生世界！
