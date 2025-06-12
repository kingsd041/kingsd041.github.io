---
layout: post
title: K3K 笔记
subtitle: 记录 K3K 的一些用法
date: 2025-3-5 11:06:00 +0800
author: Ksd
header-img: img/post-bg-desk.jpg
catalog: true
tags:
  - K3k
---

## 国内使用

v0.3.0 可通过 helm 来指定所需的镜像：

命令行安装:
```bash
helm install --namespace k3k-system --create-namespace k3k k3k/k3k --devel \
  --set image.repository=registry.cn-hangzhou.aliyuncs.com/kingsd/k3k \
  --set sharedAgent.image.repository=registry.cn-hangzhou.aliyuncs.com/kingsd/k3k-kubelet
```

指定 values.yaml:
```bash
# values.yaml
image:
  repository: registry.cn-hangzhou.aliyuncs.com/kingsd/k3k
  tag: ""
  pullPolicy: ""


sharedAgent:
  image:
    repository: registry.cn-hangzhou.aliyuncs.com/kingsd/k3k-kubelet
    tag: ""
    pullPolicy: ""
```

```bash
helm install --namespace k3k-system --create-namespace k3k k3k/k3k --devel -f values.yaml
```

遗留问题：
1. K3K 安装的 K3s 集群依赖 `rancher/k3s:v1.31.3-k3s1` 镜像，这个镜像目前无法指定，参考：https://github.com/rancher/k3k/issues/264
2. K3s 运行，内部的 K3s 所需的镜像目前还无法去指定镜像仓库，参考：https://github.com/rancher/k3k/issues/265

