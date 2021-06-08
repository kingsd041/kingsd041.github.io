---
layout: post
title: 为什么执行集群证书轮换后 Kubelet 证书仍然显示已过期？
subtitle:
date: 2021-6-7 21:07:00 +0800
author: Ksd
header-img: img/post-bg-desk.jpg
catalog: true
tags:
  - Rancher
  - 证书
  - Kubelet
---

今天我们来继续聊聊通过 RKE 或 Rancher 自定义集群的 kubelet 证书，正常来说 kubelet 的证书有效期是一年，如果证书过期后或将要过期时可以通过`rke cert rotate --service kubelet`去轮换 kubelet 证书。

但当使用`rke cert rotate --service kubelet` 或在 Rancher ui 上轮转 kubelet 时，对应的 kubelet 证书并没有轮换

## 如何验证 Kubelet 证书

- `openssl s_client -connect <NODE IP>:10250 | openssl x509 -text`
- `curl -vk https://<NODE IP>:10250`

我们来确认下轮换 kubelet 之后的证书过期时间：

```
root@ip-172-31-31-10:~# openssl s_client -connect 172.31.31.10:10250 | openssl x509 -text | grep -E "Before|After"
depth=1 CN = 172.31.31.10-ca@1623070697
verify error:num=19:self signed certificate in certificate chain
            Not Before: Jun  7 11:58:16 2021 GMT
            Not After : Jun  7 11:58:16 2022 GMT
```

从结果来看，证书过期时间没有轮换，因为当前的日期为 `2021年 6月 7日`

## 原因

在 Rancher v2.3.3 和 RKE v1.0.0 之前，集群配置没有向 Kubelet 容器提供 --tls-cert-file 和 --tls-private-key-file 参数。因此，kubelet 会自动生成 /var/lib/kubelet/pki 目录下的 kubelet.crt 和 kubelet.key 文件，并且在证书轮换期间不会轮换证书。

## 解析

您可以在 RKE 和 Rancher 配置的集群中轮换 kubelet 证书，如下所示：

#### 如何在 Rancher v2.2.0 - v2.3.0 和 RKE v0.2.0 - v0.3.2 配置集群中轮换 kubelet 证书

对于 v2.3.3 之前的 Rancher 或 v1.0.0 之前的 RKE 配置和管理的集群，您需要手动删除 `/var/lib/kubelet/pki` 中的 `kubelet.crt` 和 `kubelet.key` 并重新启动 Kubelet 容器：

```
docker exec kubelet rm /var/lib/kubelet/pki/kubelet.crt
docker exec kubelet rm /var/lib/kubelet/pki/kubelet.key
docker restart kubelet
```

#### 如何在 Rancher v2.3.2+ 配置的集群中轮换 kubelet 证书

对于 Rancher v2.3.3 及以上版本管理的 Rancher 配置集群，您可以在集群配置 YAML 中将 `generate_serving_certificate` kubelet 选项设置为 `true` 以轮换 kubelet 证书。

1. 对于受影响的集群，从 Rancher UI 集群视图中单击“编辑集群”。
2. 单击 “编辑为 YAML”。
3. 将 kubelet 的 `generate_serving_certificate` 选项设置为 `true`，如下所示：

```
services:
  kubelet:
    generate_serving_certificate: true
```

4. 单击“保存”以启动集群触发 kubelet 证书的轮换。

#### 如何在 RKE v1.0.0+ 配置的集群中轮换 kubelet 证书

对于由 RKE v1.0.0 及以上版本管理的集群，可以在集群配置 YAML 中将 `generate_serving_certificate` 选项设置为 `true` 并调用 `rke up` 来轮换 kubelet 证书。

1. 在集群配置 YAML 文件中，将 kubelet 的 `generate_serving_certificate` 选项设置为 `true`，如下所示：

```
services:
  kubelet:
    generate_serving_certificate: true
```

2. 调用 `rke up --config <cluster configuration yaml>` 以使用新的 kubelet 选项更新集群配置并触发 kubelet 证书的轮换。

## 为什么 kubelet 证书过期对集群没影响？

大家有没有好奇既然 kubelet 证书乱换没生效，为什么对 k8s 集群没影响呢？这是因为 kubelet 无论是注册节点还是与 API Server 通信都是单项的，即：kubelet 主动向 API Server 发送节点新消息，API Server 在接收到新消息后，将信息写入 etcd。所以虽然 kubelet api 过期，也不会有任何影响，因为除非深层使用，否则不会有服务会调用 kubelet api。
