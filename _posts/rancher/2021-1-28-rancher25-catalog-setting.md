---
layout: post
title: Rancher 2.5 Cluster Explorer 应用商店设置
subtitle: 修改Rancher 默认应用商店地址
date: 2021-1-28 21:06:00 +0800
author: Ksd
header-img: img/post-bg-keybord.jpg
catalog: true
tags:
  - rancher
  - Kubernetes
  - 应用商店
  - catalog
---

一些用户启动 Rancher 之后发现`Cluster Explorer`里的应用商店无法使用，提示`git clone https://git.rancher.io/charts ... timeout...`

这是因为 rancher 默认的 应用商店配置地址在国外，因为个别国内环境访问失败导致。针对不同的部署场景，可以有以下几种解决方案：

## 使用内置 catalog

> 参考：https://docs.rancher.cn/docs/rancher2/installation_new/other-installation-methods/air-gap/install-rancher/_index

HA 部署：`useBundledSystemChart=true`

单节点部署：`CATTLE_SYSTEM_CATALOG=bundled`

## 将 catalog 配置的地址修改成 gitee 地址

![](https://tva1.sinaimg.cn/large/008eGmZEly1gn3dsc3s1ij32lc0os0uc.jpg)

对应关系如下：

| chart          | default                               | gitee                                    |
| -------------- | ------------------------------------- | ---------------------------------------- |
| partner-charts | https://git.rancher.io/partner-charts | https://gitee.com/rancher/partner-charts |
| charts         | https://git.rancher.io/charts         | https://gitee.com/rancher/charts         |

> `Cluster Manager（老）` UI 可以参考 [如何在国内优雅地使用 Rancher](https://mp.weixin.qq.com/s/yvIDBcBQnsel4zabwenKMA)

## 内部搭建 gitlab

你也可以在内部搭建 gitlab，然后将 Rancher 所需的 chart 上传至该 gitlab，然后再修改 Rancher 应用商店的配置即可。
