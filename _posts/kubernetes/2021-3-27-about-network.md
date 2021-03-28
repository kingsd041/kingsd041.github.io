---
layout: post
title: 关于Kubernetes网络
subtitle: 一些笔记
date: 2021-3-27 21:06:00 +0800
author: Ksd
header-img: img/post-bg-os-metro.jpg
catalog: true
tags:
  - Kubernetes
  - Network
---

## NodePort 指定访问同主机的Pod

当访问NodePort 或 Load Balancer 类型的Service的流量到节点时，流量可能会被转发到其他节点上的Pod。这可能需要额外一跳的网络。如果要避免额外的跳跃，需要用户执行流量必须转到最初接收流量的节点上的Pod。

要指定流量必须转到同一节点上的Pod，可以将 `serviceSpec.externalTrafficPolicy` 设置为 `Local`（默认为Cluster），Local 保留客户端源 IP 并避免 LoadBalancer 和 NodePort 类型服务的第二跳， 但存在潜在的不均衡流量传播风险：
```
apiVersion: v1
kind: Service
metadata:
  name: example-service
spec:
  selector:
    app: example
  ports:
    - port: 8765
      targetPort: 9376
  externalTrafficPolicy: Local
  type: LoadBalancer
```

参考：https://kubernetes.io/zh/docs/tasks/access-application-cluster/create-external-load-balancer/

## 带有nslookup的busybox

大部分busybox都不带nslookup命令，但`busybox:1.28` 有。

## 查询Kubernetes默认的API Server 服务 Kubernetes的IP地址

```
# kubectl exec -it busybox-5f7b6455c5-bnwql -- nslookup kubernetes.default
Server:    10.43.0.10
Address 1: 10.43.0.10 kube-dns.kube-system.svc.cluster.local

Name:      kubernetes.default
Address 1: 10.43.0.1 kubernetes.default.svc.cluster.local
```

## 容器 resolv.conf 文件说明

```
# kubectl exec -it busybox-5f7b6455c5-bnwql -- cat /etc/resolv.conf
nameserver 10.43.0.10
search default.svc.cluster.local svc.cluster.local cluster.local ca-central-1.compute.internal
options ndots:5
```

DNS Server 的IP地址是 `10.43.0.10`。`options ndots:5` 的含义是当查询的域名字符串内的 **点** 字符数量超过ndots（5）值时，则认为是完整域名，直接解析，否则Linux系统会自动尝试使用 default.pod.cluster.local、default.svc.cluster.local、svc.cluster.local 补齐域名后缀。

例如，查询 whoami 会自动补齐成 whoami.default.pod.cluster.local、whoami.default.svc.cluster.local 和 whoami.svc.cluster.local，查询中任何一个记录匹配便返回，显示能返回 DNS记录匹配的是 whoami + default.svc.cluster.local。 而whoami.default 能返回DNS记录的匹配是 whoami.default.svc.cluster.local

## 调试DNS

如果nslookup 命令由于某种原因失败，这有几种调试和排除故障的方法。但是，应该如何得到DNS查找失败呢？若DNS 失败，通常会得到如下响应：
```
kubectl exec -it busybox-5f7b6455c5-bnwql -- nslookup kubernetes.default
Server:    10.43.0.10
Address 1: 10.43.0.10
nslookup: can't resolve 'kubernetes.default'
```

如果出现此错误，这需要做的第一个事检查DNS配置是否正确。

查看容器中的resolv.conf文件
```
# kubectl exec -it busybox-5f7b6455c5-bnwql -- cat /etc/resolv.conf
nameserver 10.43.0.10
search default.svc.cluster.local svc.cluster.local cluster.local ca-central-1.compute.internal
options ndots:5
```

如果条目正确，检查coredns插件是否已启动，或者检查coredns pod 是否运行正常。

如果pod正在运行，这全局dns服务可能存在问题
```
kubectl get svc -n kube-system
NAME             TYPE        CLUSTER-IP    EXTERNAL-IP   PORT(S)                  AGE
kube-dns         ClusterIP   10.43.0.10    <none>        53/UDP,53/TCP,9153/TCP   89m
```

可能还需要检查后端DNS Endpoint 是否准备好：
```
kubectl -n kube-system get ep kube-dns
NAME       ENDPOINTS                                  AGE
kube-dns   10.42.0.2:53,10.42.0.2:53,10.42.0.2:9153   90m
```

如果在rancher中排查 agent的dns配置，可以参考：
https://gist.github.com/kingsd041/f086f56654608f24fa5db88f4d0674fa

## 通过 pause 容器查看容器IP

有时候我们的容器没安装ip命令，所以exec 后还是无法查询IP地址. 我们可以通过在宿主机上进入到 `pause` 的namespace里去查询：

```
root@ip-172-31-12-164:~# docker ps | grep ubuntu
80664c45e07a   ubuntu                                            "/bin/bash"              2 hours ago         Up 2 hours                   k8s_ubuntu1_ubuntu1-85fc988485-qnwzq_default_cf9c33f0-c1f9-4973-83ed-269bd1b89ce9_0
f1896ba13a81   rancher/pause:3.1                                 "/pause"                 2 hours ago         Up 2 hours                   k8s_POD_ubuntu1-85fc988485-qnwzq_default_cf9c33f0-c1f9-4973-83ed-269bd1b89ce9_0

root@ip-172-31-12-164:~# docker inspect f1896ba13a81 --format '{{.State.Pid}}'
20911
root@ip-172-31-12-164:~# nsenter --target 20911 --net

root@ip-172-31-12-164:~# ip addr
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
3: eth0@if41: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1450 qdisc noqueue state UP group default
    link/ether be:12:00:87:51:9d brd ff:ff:ff:ff:ff:ff link-netnsid 0
    inet 10.42.0.8/32 scope global eth0
       valid_lft forever preferred_lft forever
```

## 