---
layout: post
title: 如何从单节点 K3s 迁移到高可用
subtitle:
date: 2022-4-10 21:06:00 +0800
author: Ksd
header-img: img/post-bg-desk.jpg
catalog: true
tags:
  - k3s
  - ETCD
---

## 前言

K3s 支持单节点安装和高可用安装两种方式，单节点安装就是 k3s server 内嵌了一个 SQLite 作为数据库，而且这个数据库不支持扩展，所以生产环境不建议使用单节点方式安装 k3s。

单节点 k3s server 的架构：
![](http://docs.rancher.cn/assets/images/k3s-architecture-single-server-42bb3c4899985b4f6d8fd0e2130e3c0e.png)

K3s 高可用安装分为 “使用外部数据库实现高可用安装” 和 “嵌入式 etcd 的高可用” 两种方式:

- 使用外部数据库实现高可用安装：可以将 k3s 服务和数据库解耦，在启动 k3s 服务时通过对应数据库的参数来连接已经创建好的数据库，支持：PostgreSQL、MySQL、MariaDB、etcd。
- 嵌入式 etcd 的高可用：从 v1.19.5+k3s1 版本开始，k3s 已添加了对嵌入式 etcd 的支持，每个 k3s master 节点内置了一个 etcd 数据库，要在这种模式下运行 k3s，你必须有奇数的 server 节点。我们建议从三个节点开始。

虽然单节点 k3s server 集群可以满足各种用例，但是对于需要稳定运行的生产环境，推荐安装高可用的 k3s server。如果你已经在生产上部署了单节点的 k3s 集群，现在想将你的集群转换为高可用集群，你之前可能会选择重新搭建高可用的 k3s 集群。

**本文将要介绍如何将单节点嵌入式 SQLite 数据库 k3s 集群直接转换为内置 etcd 高可用 k3s 集群，并且不影响业务集群的数据。**

> 注意： k3s v1.22.2 及更新版本才支持从单节点 k3s 集群转换为内置 etcd 集群

## 单节点 k3s 集群转换为内置 etcd 高可用集群

### 环境准备

首先你需要有一个单节点的 k3s 集群，本例使用 1 master 节点、1 worker 节点的 k3s 集群。安装方法可以参考 k3s 官网[快速入门指南](https://docs.rancher.cn/docs/k3s/quick-start/_index/)章节。

```
root@ip-172-31-13-233:~# kubectl get nodes
NAME               STATUS   ROLES                  AGE   VERSION
ip-172-31-13-233   Ready    control-plane,master   86s   v1.23.6+k3s1
ip-172-31-4-125    Ready    <none>                 42s   v1.23.6+k3s1
```

创建测试 deployment 和 service，以便转换为高可用集群后确认数据是否丢失：

```
root@ip-172-31-13-233:~# kubectl apply -f https://raw.githubusercontent.com/kingsd041/tmp/master/nginx.yml
deployment.apps/nginx-deployment created
service/nginx created

root@ip-172-31-13-233:~# kubectl get deployment,svc
NAME                               READY   UP-TO-DATE   AVAILABLE   AGE
deployment.apps/nginx-deployment   3/3     3            3           36s

NAME                 TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)        AGE
service/kubernetes   ClusterIP   10.43.0.1       <none>        443/TCP        5m47s
service/nginx        NodePort    10.43.254.106   <none>        80:30007/TCP   36s
```

### 将单节点 K3s 集群转换为内置 etcd 高可用集群

首先，先停止 k3s 服务：

```
root@ip-172-31-13-233:~# systemctl stop k3s
```

然后，通过使用 `--cluster-init` 标志重新启动你的 k3s server 来将其转换为 etcd 集群：

```
root@ip-172-31-13-233:~# curl -sfL https://get.k3s.io | sh -s - --cluster-init

[INFO]  Finding release for channel stable
[INFO]  Using v1.23.6+k3s1 as release
[INFO]  Downloading hash https://github.com/k3s-io/k3s/releases/download/v1.23.6+k3s1/sha256sum-amd64.txt
[INFO]  Skipping binary downloaded, installed k3s matches hash
[INFO]  Skipping installation of SELinux RPM
[INFO]  Skipping /usr/local/bin/kubectl symlink to k3s, already exists
[INFO]  Skipping /usr/local/bin/crictl symlink to k3s, already exists
[INFO]  Skipping /usr/local/bin/ctr symlink to k3s, already exists
[INFO]  Creating killall script /usr/local/bin/k3s-killall.sh
[INFO]  Creating uninstall script /usr/local/bin/k3s-uninstall.sh
[INFO]  env: Creating environment file /etc/systemd/system/k3s.service.env
[INFO]  systemd: Creating service file /etc/systemd/system/k3s.service
[INFO]  systemd: Enabling k3s unit
Created symlink /etc/systemd/system/multi-user.target.wants/k3s.service → /etc/systemd/system/k3s.service.
[INFO]  systemd: Starting k3s
```

查看 master 节点的角色，来确认是否转换成功：

```
root@ip-172-31-13-233:~# kubectl get nodes
NAME               STATUS   ROLES                       AGE     VERSION
ip-172-31-13-233   Ready    control-plane,etcd,master   9m39s   v1.23.6+k3s1
ip-172-31-4-125    Ready    <none>                      8m55s   v1.23.6+k3s1
```

从上面 `ROLES` 列可以看到，master 节点的角色增加了 `etcd`，证明已经通过内置 etcd 数据库重新启动了 k3s 集群。

## 扩容 K3s master 节点

当通过 `--cluster-init` 标志将默认嵌入式 SQLite 数据库的现有集群转换为 etcd 集群之后，我们也可以参考[嵌入式 DB 的高可用](http://docs.rancher.cn/docs/k3s/installation/ha-embedded/_index)组成多个 master 节点的集群，操作步骤和普通的嵌入式 etcd 的高可用集群的方式没有任何区别。

本例将扩容到 3 个 k3s master 节点：

```
root@ip-172-31-13-233:~# kubectl get nodes
NAME               STATUS   ROLES                       AGE     VERSION
ip-172-31-1-114    Ready    control-plane,etcd,master   30s     v1.23.6+k3s1
ip-172-31-13-233   Ready    control-plane,etcd,master   24m     v1.23.6+k3s1
ip-172-31-4-125    Ready    <none>                      23m     v1.23.6+k3s1
ip-172-31-9-12     Ready    control-plane,etcd,master   2m42s   v1.23.6+k3s1
```

当然，你也可以继续向集群中添加 k3s worker 节点：

```
root@ip-172-31-13-233:~# kubectl get nodes
NAME               STATUS   ROLES                       AGE     VERSION
ip-172-31-1-114    Ready    control-plane,etcd,master   89s     v1.23.6+k3s1
ip-172-31-13-233   Ready    control-plane,etcd,master   25m     v1.23.6+k3s1
ip-172-31-4-125    Ready    <none>                      24m     v1.23.6+k3s1
ip-172-31-8-211    Ready    <none>                      7s      v1.23.6+k3s1
ip-172-31-9-12     Ready    control-plane,etcd,master   3m41s   v1.23.6+k3s1
```

## 验证业务数据是否有变化

最后，再次确认之前创建的测试 deployment、service 是否有变化，来验证转换后数据是否有影响：

```
root@ip-172-31-13-233:~# kubectl get deployment,svc
NAME                               READY   UP-TO-DATE   AVAILABLE   AGE
deployment.apps/nginx-deployment   3/3     3            3           6m40s

NAME                 TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)        AGE
service/kubernetes   ClusterIP   10.43.0.1       <none>        443/TCP        11m
service/nginx        NodePort    10.43.254.106   <none>        80:30007/TCP   6m40s
```

从以上结果来看，转换为内置 etcd 数据库之后，业务数据并没有变化，不会影响你生产或测试环境。而且这些转换过程由 k3s 自动完成，不需要我们过多操作。

## 迁移失败后如何恢复数据

通过使用 `--cluster-init` 标志执行从 sqlite 迁移到 etcd 时，K3s 首先会将 sqlite 默认数据文件（/var/lib/rancher/k3s/server/db/state.db）备份为 `/var/lib/rancher/k3s/server/db/state.db.migrated`。然后创建 etcd 数据目录（/var/lib/rancher/k3s/server/db/etcd），并把转换后的 etcd 数据生成到该目录下。最后，通过 `--cluster-init` 标志告知 K3s 应该使用 etcd 启动该集群。

```
root@ip-172-31-8-83:~# ls /var/lib/rancher/k3s/server/db/
etcd  state.db-shm  state.db-wal  state.db.migrated
```

所以，当我们迁移到 etcd 数据库失败时，只需要将 `state.db.migrated` 还原为 `state.db`，然后删除掉 etcd 文件夹，并且去掉 `--cluster-init` 标志重新启动 K3s 即可：

```
root@ip-172-31-8-83:~# service k3s stop
root@ip-172-31-8-83:~# mv /var/lib/rancher/k3s/server/db/state.db.migrated /var/lib/rancher/k3s/server/db/state.db
root@ip-172-31-8-83:~# rm -rf /var/lib/rancher/k3s/server/db/etcd
root@ip-172-31-8-83:~# ls /var/lib/rancher/k3s/server/db/
state.db  state.db-shm  state.db-wal
root@ip-172-31-8-83:~# curl -sfL https://get.k3s.io | sh -
[INFO]  Finding release for channel stable
[INFO]  Using v1.23.6+k3s1 as release
[INFO]  Downloading hash https://github.com/k3s-io/k3s/releases/download/v1.23.6+k3s1/sha256sum-amd64.txt
[INFO]  Skipping binary downloaded, installed k3s matches hash
[INFO]  Skipping installation of SELinux RPM
[INFO]  Skipping /usr/local/bin/kubectl symlink to k3s, already exists
[INFO]  Skipping /usr/local/bin/crictl symlink to k3s, already exists
[INFO]  Skipping /usr/local/bin/ctr symlink to k3s, already exists
[INFO]  Creating killall script /usr/local/bin/k3s-killall.sh
[INFO]  Creating uninstall script /usr/local/bin/k3s-uninstall.sh
[INFO]  env: Creating environment file /etc/systemd/system/k3s.service.env
[INFO]  systemd: Creating service file /etc/systemd/system/k3s.service
[INFO]  systemd: Enabling k3s unit
Created symlink /etc/systemd/system/multi-user.target.wants/k3s.service → /etc/systemd/system/k3s.service.
[INFO]  systemd: Starting k3s
root@ip-172-31-8-83:~# kubectl get nodes
NAME             STATUS   ROLES                  AGE     VERSION
ip-172-31-2-70   Ready    <none>                 7m21s   v1.23.6+k3s1
ip-172-31-8-83   Ready    control-plane,master   7m48s   v1.23.6+k3s1
```
