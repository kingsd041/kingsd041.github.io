---
layout: post
title: 深入理解 RKE2 镜像重写：从配置到实际应用
subtitle: 本文深入研究了RKE2镜像重写的配置和应用，以及如何利用Harbor作为镜像代理缓存后端，提高容器环境中的镜像管理效率。
date: 2024-1-9 11:06:00 +0800
author: Ksd
header-img: img/post-bg-desk.jpg
catalog: true
tags:
  - RKE2
---

## 什么是 RKE2 镜像重写？

在 RKE2 镜像仓库配置中，每个 Mirror 都可以配备一组 Rewrites。这些 Rewrites 能够根据正则表达式对镜像标签进行调整，解决了当镜像仓库中的组织或项目结构与上游不一致的情况。

例如，以下配置将透明地从 `harbor.kingsd.top/production/busybox:1.35` 中拉取镜像 `docker.io/ksd-test/busybox:1.35`

```
root@ksd-1:~# cat /etc/rancher/rke2/registries.yaml
mirrors:
  docker.io:
    endpoint:
      - https://harbor.kingsd.top
    rewrite:
      "^ksd-test/(.*)": "production/$1"
root@ksd-1:~#
root@ksd-1:~# crictl pull ksd-test/busybox:1.35
Image is up to date for sha256:8aa0a6afef383f794b4f9a3785899de3832551d6c895ba74c8d0c3357823f3de
root@ksd-1:~# crictl image list
IMAGE                                                                TAG                    IMAGE ID            SIZE
docker.io/ksd-test/busybox                                            1.35                   8aa0a6afef383       2.21MB
```

以上配置是 RKE2 使用的容器镜像仓库的镜像重写（rewrite）配置。让我们逐步解释每个部分的含义：

- `mirrors`: 这个部分定义了镜像仓库的配置。
- `docker.io`: 这里指定了要配置的镜像仓库的名称，即 Docker Hub。
- `endpoint`: 定义了镜像仓库的地址。在这里，它是 `https://harbor.kingsd.top`。
- `rewrite`: 这是一个重要的部分，它定义了镜像的重写规则。在这个例子中，它使用正则表达式来重写镜像的路径。具体来说，它将以 "ksd-test/" 开头的路径重写为 "production/"，这意味着所有以 "ksd-test/" 开头的镜像将被重写为以 "production/" 开头。

上面的示例中尝试拉取 `ksd-test/busybox:1.35`，根据重写规则，它将被重写为 `production/busybox:1.35`。所以，如果在你的镜像仓库中存在 `production/busybox:1.35`，那么拉取将成功。

读到这，你可能认为 `ksd-test/busybox:1.35` 是从 dockerhub 拉取的。但其实 dockerhub 中是不存在 `ksd-test/busybox:1.35` 的，如果换个主机，这个镜像是拉不到的：

```
root@harbor:~# docker pull ksd-test/busybox:1.35
Error response from daemon: manifest for ksd-test/busybox:1.35 not found: manifest unknown: manifest unknown
```

## 使用 Harbor 作为 RKE2 的镜像代理缓存后端

借助 RKE2 强大的 rewrite 特性，我们得以精心配置，将 Harbor 巧妙地嵌入到 RKE2 的镜像代理缓存体系中，为整个容器化环境提供了高效、灵活的镜像管理解决方案。

### 创建 Harbor 代理缓存项目

> 建议 Harbor 配置访问外网的 HTTP(S) 代理，不使用外网代理无法获取 gcr.io/k8s.gcr.io 的镜像

登入 Harbor 管理后台 https://harbor.kingsd.top

1. 左侧边栏 Administration => Registries => New Endpoint 创建 5 个 Endpoint：

| Provider   | Name       | Endpoint URL       | Access ID |
| ---------- | ---------- | ------------------ | --------- |
| Docker Hub | docker.io  |                    |           |
| Quay       | quay.io    | https://quay.io    | 清空      |
| Quay       | gcr.io     | https://gcr.io     | 清空      |
| Quay       | k8s.gcr.io | https://k8s.gcr.io | 清空      |
| Quay       | ghcr.io    | https://ghcr.io    | 清空      |

2. 左侧边栏 Projects => New Project 创建 5 个项目：

| Project Name | Access Level                           | Proxy Cache                                         |
| ------------ | -------------------------------------- | --------------------------------------------------- |
| docker.io    | Public <input type="checkbox" checked> | <input type="checkbox" checked>Endpoint: docker.io  |
| quay.io      | Public <input type="checkbox" checked> | <input type="checkbox" checked>Endpoint: quay.io    |
| gcr.io       | Public <input type="checkbox" checked> | <input type="checkbox" checked>Endpoint: gcr.io     |
| k8s.gcr.io   | Public <input type="checkbox" checked> | <input type="checkbox" checked>Endpoint: k8s.gcr.io |
| ghcr.io      | Public <input type="checkbox" checked> | <input type="checkbox" checked>Endpoint: ghcr.io    |

### 配置 RKE2 registries.yaml

```
cat >/etc/rancher/rke2/registries.yaml <<EOF
mirrors:
  docker.io:
    endpoint:
      - https://harbor.kingsd.top
    rewrite:
      "(^.+$)": "docker.io/$1"
  quay.io:
    endpoint:
      - https://harbor.kingsd.top
    rewrite:
      "(^.+$)": "quay.io/$1"
  gcr.io:
    endpoint:
      - https://harbor.kingsd.top
    rewrite:
      "(^.+$)": "gcr.io/$1"
  k8s.gcr.io:
    endpoint:
      - https://harbor.kingsd.top
    rewrite:
      "(^.+$)": "k8s.gcr.io/$1"
  ghcr.io:
    endpoint:
      - https://harbor.kingsd.top
    rewrite:
      "(^.+$)": "ghcr.io/$1"
EOF
```

上述配置可以用作镜像仓库的缓存配置。通过这样的配置，RKE2 集群会将对于 quay.io、gcr.io、ghcr.io 等镜像仓库的拉取请求重定向到指定的 Harbor 镜像仓库地址，从而实现镜像的缓存和加速。

具体而言，这个配置中的 endpoint 部分指定了 Harbor 镜像仓库的地址，而 rewrite 部分则将镜像路径重写为对应的镜像仓库路径。这样一来，当 RKE2 集群中的容器需要从 gcr.io 或 ghcr.io 拉取镜像时，实际上会先从 Harbor 镜像仓库中拉取，从而提高镜像拉取的速度，并减轻对外部镜像仓库的依赖。

这种做法对于在封闭网络环境下或需要控制对外部镜像仓库访问的场景非常有用，同时也可以减少对公共镜像仓库的访问频率，降低镜像拉取的时间和成本。

参考：

- 使用 Harbor 作为 K3s 的镜像代理缓存后端：https://www.cnblogs.com/roy2220/p/14811537.html
- RKE2 私有镜像仓库配置：https://docs.rke2.io/install/containerd_registry_configuration
