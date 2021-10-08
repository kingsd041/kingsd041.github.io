---
layout: post
title: 一次关于RKE的Troubleshooting
subtitle: 由于禁用IPv6导致的
date: 2021-8-8 21:06:00 +0800
author: Ksd
header-img: img/post-bg-desk.jpg
catalog: true
tags:
  - RKE
---

最近，Rancher 社区中反馈了一个比较“常见”的问题：使用 RKE 在 Centos 7.8 上安装 K8s 集群时报错：

![](https://tva1.sinaimg.cn/large/008i3skNgy1gt9i23r5o0j62l80gi48a02.jpg)

## 初判

起初，格局小了，按照日志提示的内容指导用户排查：

1. 检查 `cluster.yml` 配置的用户是否为非 root
2. 是否指定了正确的密钥文件
3. 检查配置的用户是否可以在节点上执行 `docker ps`
4. 检查 SSH 服务器版本是否至少为 6.7 或更高版本

以上这些排查选项也是 RKE 官方文档（http://docs.rancher.cn/docs/rke/troubleshooting/ssh-connectivity-errors/_index)中要求的，用户排查后，确认都是按照 RKE 文档要求去配置的 RKE 和 K8s 主机。

## 问题并不“常见”

随后，再次翻看错误日志，将重点放到了如下日志：

```
Failed to bring up Control Plane: [Failed to verify healthcheck: Failed to check https://localhost:6443/healthz for service [kube-apiserver] on host [10.240.0.34]: Get "https://localhost:6443/healthz"
```

如果想获取更详细的原因，可以登录到对应的主机查看`kube-apiserver`日志:

> 使用`docker logs -f kube-apiserver` 查看日志时，会快速的刷新一些无用日志，这时可以访问容器日志文件：`/var/lib/docker/containers/${container_id}/${container_id}-json.log`查看完整日志。

```
{"log":"E0808 06:10:53.740231       1 reflector.go:138] k8s.io/client-go/informers/factory.go:134: Failed to watch *v1.StorageClass: failed to list *v1.StorageClass: Get \"https://localhost:6443/apis/storage.k8s.io/v1/storageclasses?limit=500\u0026resourceVersion=0\": dial tcp [::1]:6443: connect: no route to host\n","stream":"stderr","time":"2021-08-08T06:10:53.740356721Z"}
{"log":"E0808 06:10:53.740448       1 reflector.go:138] k8s.io/client-go/informers/factory.go:134: Failed to watch *v1.LimitRange: failed to list *v1.LimitRange: Get \"https://localhost:6443/api/v1/limitranges?limit=500\u0026resourceVersion=0\": dial tcp [::1]:6443: connect: no route to host\n","stream":"stderr","time":"2021-08-08T06:10:53.742506129Z"}
{"log":"F0808 06:11:10.695434       1 controller.go:161] Unable to perform initial IP allocation check: unable to refresh the service IP block: Get \"https://localhost:6443/api/v1/services\": dial tcp [::1]:6443: connect: no route to host\n","stream":"stderr","time":"2021-08-08T06:11:10.69562321Z"}
```

最开始看这个日志的时候也是一头雾水，`kube-apiserver`提示访问主机的 `localhost` 会 `no route to host`？ 使用`ping` 命令测试，一切正常：

```
# ping localhost
PING localhost (127.0.0.1) 56(84) bytes of data.
64 bytes from localhost (127.0.0.1): icmp_seq=1 ttl=64 time=0.089 ms
64 bytes from localhost (127.0.0.1): icmp_seq=2 ttl=64 time=0.059 ms
64 bytes from localhost (127.0.0.1): icmp_seq=3 ttl=64 time=0.058 ms
```

再使用 `telnet` 测试，确实出问题了……

```
# telnet localhost 6443
Trying ::1...
telnet: connect to address ::1: No route to host
# telnet localhost 22
Trying ::1...
telnet: connect to address ::1: No route to host
```

> 为什么`ping localhost`可以解析到`127.0.0.1`，`telnet localhost`不能解析的原因，请查看文末「延伸阅读」部分

从上面`telnet`结果判断应该是主机的某些配置影响到了 kube-apiserver 的健康检查，导致 kube-apiserver 启动之后健康检查未通过，从而反复的重启 kube-apiserver。

## 原因分析

接下来，先从主机层面分析这个问题，只要能解决为什么 `telnet localhost port` 报错`No route to host`，应该就可以解决 kube-apiserver 启动失败的问题。

无论 kube-apiserver 日志还是`telnet localhost`的返回结果，使用的都是主机的 IPv6 ip：`::1`。

继续排查，先查看`/etc/hosts`中的`localhost`映射配置：

```
# cat /etc/hosts
::1         localhost localhost.localdomain localhost6 localhost6.localdomain6
127.0.0.1   centos7.Localdomain
```

再看网卡的配置：

```
# ip addr
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
```

发现，`/etc/hosts`中将 `localhost` 映射到了主机的 IPv6 地址`::1`，并且 `lo` 回环地址的 IPv6 已经被禁用掉。所以就造成了 `telnet localhost port` 提示 `No route to host`的情况。从而影响了 kube-apiserver 通过`localhost 6443`执行健康检查，最后造成了 kube-apiserver 反复重启。

## 解决问题

要解决这个问题也非常简单，只需要在 `/etc/hosts` 文件中添加 IPv4 的 `localhost` 映射，这样就可以通过`localhost`解析到正确的 IPv4 地址，然后重新执行`rke up` 即可：

```
# cat /etc/hosts
::1         localhost localhost.localdomain localhost6 localhost6.localdomain6
127.0.0.1   localhost centos7.Localdomain

# rke up
INFO[0000] Running RKE version: v1.2.11
INFO[0000] Initiating Kubernetes cluster
INFO[0000] [certificates] GenerateServingCertificate is disabled, checking if there are unused kubelet certificates
INFO[0000] [certificates] Generating admin certificates and kubeconfig
INFO[0000] Successfully Deployed state file at [./cluster.rkestate]
···
```

## 延伸阅读

在排查过程中，发现个奇怪的问题。如果 `/etc/hosts` 中 `localhost` 只映射到 IPv6 `::1` 地址，并且主机和网卡都禁用 IPv6 的前提下。使用 `ping localhost` 可以解析到 `127.0.0.1`， `telnet localhost` 却不能。

查询了 `telnet` 和 `ping` 的资料后仿佛开云见日：

- 为什么`telnet localhost`会出现`No route to host`？
  因为 `/etc/hosts` 中只配置了将 `localhost` 解析到 IPv6 地址 `::1`，并且主机和 `lo` 网卡都禁用掉了 IPv6，返回 `No route to host` 是预期行为。
- 为什么`ping localhost`可以解析到`127.0.0.1`？
  `ping` 同时适用于 IPv4 和 IPv6，并且可以将 IPv6 地址自动转化为 IPv4。为了验证，我们可以通过 `-6` 参数强制使用 IPv6 访问 `localhost`， 也会出现 `No route to host` 的情况:

  ```
  # ping -6 localhost
  connect: No route to host
  ```
