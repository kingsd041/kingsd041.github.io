---
layout: post
title: Rancher v2.4.x 轮换证书
subtitle: 适用于单节点Rancher v2.4.x 过期
date: 2021-4-9 21:06:00 +0800
author: Ksd
header-img: img/post-bg-keybord.jpg
catalog: true
tags:
  - rancher
  - 证书
---

> 只适用于 rancher v2.4.x版本，且单节点安装

1. exec 到rancher server
```
kubectl --insecure-skip-tls-verify -n kube-system delete secrets k3s-serving
kubectl --insecure-skip-tls-verify delete secret serving-cert -n cattle-system
rm -f /var/lib/rancher/k3s/server/tls/dynamic-cert.json
```

2. 重启rancher-server

3. 执行以下命令刷新参数
```
curl --insecure -sfL https://server-url/v3
```