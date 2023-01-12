---
layout: post
title: 如何在 RKE2 中创建单独的 ETCD 和 Controlplane 节点
subtitle:
date: 2023-1-10 21:07:00 +0800
author: Ksd
header-img: img/post-bg-debug.jpg
catalog: true
tags:
  - RKE2
---

RKE2 默认分为两种角色：

- master：具有 etcd、controlplane、worker 角色
- agent：具有 worker 角色

因为某种需求，你可能需要独立的 etcd 或 controlplan 节点，本文将介绍如何拆分这些角色运行 RKE2。

## 测试环境

RKE2 1.21.2 及更高版本

## 拆分角色

1. 在所需的 ETCD 节点上创建 `/etc/rancher/rke2/config.yaml`，内容如下：

```
   disable-apiserver: true
   disable-controller-manager: true
   disable-kube-proxy: false
   disable-scheduler: true
```

启动后，该节点只有 ETCD 的角色。

2. 在 etcd 节点上安装 rke2 `curl -sfL https://get.rke2.io | INSTALL_RKE2_VERSION="<所需的 RKE2 版本>" INSTALL_RKE2_TYPE="server" sh -` ,并启动 `systemctl start rke2-server`
3. 在 controlplane 节点上创建 `/etc/rancher/rke2/config.yaml`，内容如下：

```
   server: https://<ip of the etcd node>:9345
   token: <token string from /var/lib/rancher/rke2/server/node-token on the etcd node>
   disable-etcd: true
   disable-kube-proxy: false
   etcd-expose-metrics: false
```

启动后，该节点只有 controlplane 的角色。

4. 在控制平面节点上安装 rke2 `curl -sfL https://get.rke2.io | INSTALL_RKE2_VERSION="<所需的 RKE2 版本>" INSTALL_RKE2_TYPE="server" sh -` ，并启动 `systemctl start rke2-server`
5. 添加 agent 节点

## 附加信息

这只是一个示例。在 prod 环境中，您应该根据 https://docs.rke2.io/install/ha#1-configure-the-fixed-registration-address 上的文档配置一个固定的注册地址
