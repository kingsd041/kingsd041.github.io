---
layout: post
title: K3s 镜像仓库配置--Rewrite
subtitle: 介绍 K3s 镜像仓库配置中 Rewrite 如何使用
date: 2023-3-5 21:06:00 +0800
author: Ksd
header-img: img/post-bg-desk.jpg
catalog: true
tags:
  - K3s
  - Rewrite
---

K3s 配置私有镜像仓库时，可以设置 `rewrite`，这里是官方的解释：https://docs.k3s.io/installation/private-registry#rewrites

也就是说，你可以在 mirror 中去设置 rewrite，rewrite 可以根据正则表达式来改变镜像的标签。Rewrite 特别适合在 mirror 仓库中的组织/项目结构与上游不同的场景。

以下是一个配置实例：

```
root@k3s-demo:/etc/rancher/k3s# cat registries.yaml
mirrors:
  ghcr.io:
    endpoint:
      - "https://harbor.kingsd.top"
    rewrite:
      "^test/(.*)": "rancher/$1"
```

在这个配置中定义了一个名为 ghcr.io 的 mirror，对应的 endpoint 设置 "https://harbor.kingsd.top"。这样配置后，如果在 K3s 中拉取 ghcr.io 开头的镜像，将会转到从 “https://harbor.kingsd.top” 拉取，比如：`crictl pull ghcr.io/demo/busybox:t1`，实际上 K3s 拉取的是 `harbor.kingsd.top/demo/busybox:t1`。

`rewrite` 配置的作用是：如果 pull 的镜像被正则匹配到，那将按照冒号右面的配置去拉取。按照上面的配置，使用 `crictl pull ghcr.io/test/kubectl:v1.20.2`，将会从 `harbor.kingsd.top/rancher/kubectl:v1.20.2` 拉取这个镜像，其实就是通过 rewrite 进行了一次重写，表面是从 `test` 的 repo 中拉取镜像，但实际上是从 `rancher` repo 中拉取的。

因为，`ghcr.io/test/kubectl:v1.20.2` 的项目名称为 `test`，正好被 rewrite 中配置正则比配到，所以按照 rewrite 的配置，将 `test` 替换为 `rancher`。

```
root@k3s-demo:/etc/rancher/k3s# crictl pull ghcr.io/test/kubectl:v1.20.2
Image is up to date for sha256:b119c4dfc78c8227a776d5b786e781ff9e20b214d0a90efee47ff5e8bff9066b
root@k3s-demo:/etc/rancher/k3s# crictl images
ghcr.io/test/kubectl                         v1.20.2                b119c4dfc78c8       12MB
```

##  其他

[使用 Harbor 作为 K3S 的镜像代理缓存后端](https://www.cnblogs.com/roy2220/p/14811537.html) ，这个场景可以作为参考。

