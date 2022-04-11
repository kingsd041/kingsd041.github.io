---
layout: post
title: 查找容器和主机上的网卡对应关系
subtitle: ip link show 或 ethtool
date: 2021-3-27 21:06:00 +0800
author: Ksd
header-img: img/post-bg-os-metro.jpg
catalog: true
tags:
  - Kubernetes
  - Network
---

veth pair + bridge 模式的容器中的eth0实际上和外面host上的某个veth是成对的关系，可以通过以下两种方法查找对应关系：

#### 方法1：

容器执行命令：
```
root@ip-172-31-12-164:~# docker exec -it 8066 ip link show eth0
3: eth0@if41: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1450 qdisc noqueue state UP mode DEFAULT group default
    link/ether be:12:00:87:51:9d brd ff:ff:ff:ff:ff:ff link-netnsid 0
```
上面命令中的`3`是eth0接口的index，41是和它成对的veth的index，是在主机上的

```
root@ip-172-31-12-164:~# ip link show | grep 41
41: cali92eefabadfb@if3: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1450 qdisc noqueue state UP mode DEFAULT group default
```

#### 方法2：

使用 ethtool：
```
root@ip-172-31-12-164:~# docker exec -it 8066 ethtool -S eth0
NIC statistics:
     peer_ifindex: 41
root@ip-172-31-12-164:~#
root@ip-172-31-12-164:~# ip addr | grep 41
41: cali92eefabadfb@if3: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1450 qdisc noqueue state UP group default
```
