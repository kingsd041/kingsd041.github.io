---
layout: post
title: 获取 Rancher 支持的 RKE2/K3S 版本
subtitle:
date: 2022-7-22 21:07:00 +0800
author: Ksd
header-img: img/post-bg-desk.jpg
catalog: true
tags:
  - Rancher
---

## 获取支持的 K3S 版本

```
curl -sL https://raw.githubusercontent.com/rancher/kontainer-driver-metadata/release-v2.6/data/data.json | jq -r '.k3s.releases[].version'
```

## 获取支持的 RKE2 版本

```
curl -sL https://raw.githubusercontent.com/rancher/kontainer-driver-metadata/release-v2.6/data/data.json | jq -r '.rke2.releases[].version'
```

## 获取 K3s 的 stable/latest/testing 等版本

浏览器访问：https://update.k3s.io/v1-release/channels

## 获取 RKE2 的 stable/latest/testing 等版本

浏览器访问：https://update.rke2.io/v1-release/channels

