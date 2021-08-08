---
layout: post
title: 使用外置数据库搭建K3s HA失败
subtitle: bootstrap data already found and encrypted with different token
date: 2021-7-30 21:06:00 +0800
author: Ksd
header-img: img/post-bg-desk.jpg
catalog: true
tags:
  - Rancher
  - K3S
  - HA
---

## 前言

K3s HA 主要有两种方式搭建，使用外部数据库和使用内置的 ETCD。因为对 ETCD 缺乏运维能力，我一般会选择使用外置的 mysql 数据库作为 k3s 高可用的存储数据库。备份/恢复只针对这个外置 mysql 就行了。

K3s 使用 mysql 作为外置数据库的搭建方式也很简单，就一条命令，然后在每个 K3s 主机上执行**相同**的命令就行：

```
curl -sfL https://get.k3s.io | sh -s - server \
  --datastore-endpoint="mysql://username:password@tcp(hostname:3306)/database-name"
```

今天使用相同的方式，去安装 K3s 集群，第一个 mster 节点顺利启动，当启动第二个 master 节点时，居然报错了：

```
level=fatal msg="starting kubernetes: preparing server: bootstrap data already found and encrypted with different token"
```

Google 也没找到对应的日志，至少今天（2021-7-30）没找到。

一度怀疑是我的姿势不对，反复检查命令和各节点的配置，操作应该没问题，也许是版本的问题。

## 遇事不要慌

随后去 K3s 官网外置数据库高可用安装章节 (https://rancher.com/docs/k3s/latest/en/installation/ha/)，也没看到安装方式有什么不同。 无奈之下，又去检查了 k3s release node（https://github.com/k3s-io/k3s/releases/tag/v1.21.3%2Bk3s1）。 发现，新版真的有更新：

![](https://tva1.sinaimg.cn/large/008i3skNgy1gt05i2jj1fj31j40d0whn.jpg)

也就是说，外置数据库的 K3s HA，第二个节点需要加上 `--token` 的参数才行，随后更新第二台 master 节点的安装命令：

```
curl -sfL https://get.k3s.io | sh -s - server \
  --token=8bede309a67fb157d38d589e913a1227 \
  --datastore-endpoint="mysql://username:password@tcp(hostname:3306)/database-name"
```

至此，第二个 k3s master 节点也加进来了，可以继续在上面继续搞了

## 后记

受影响的版本：

- v1.21.3+k3s1 及以后的版本
- v1.20.9+k3s1 及以后的版本
- v1.19.13+k3s1 及以后的版本

K3s 官网虽然目前还没跟进这个修改，但一般每个版本的 release node 里会有详细的更新说明，推荐大家要使用某个版本前，看看对应版本的 release node。
