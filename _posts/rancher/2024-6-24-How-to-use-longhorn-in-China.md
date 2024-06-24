---
layout: post
title: 如何使用国内资源安装 Longhorn
subtitle: 利用国内资源安装 Longhorn
date: 2024-6-24 11:07:00 +0800
author: Ksd
header-img: img/post-bg-rancher-k8s.png
catalog: true
tags:
  - Longhorn
---

目前，国内访问 Docker Hub 存在问题，而 Longhorn 的镜像都存储在 Docker Hub 上，这会导致从国内无法顺利使用 Longhorn。

为了解决这一问题，Rancher 社区已经将 Longhorn 的镜像同步到了国内的阿里云镜像仓库，包括 amd64 和 arm64 的镜像。

需要注意的是：Longhorn 镜像默认的命名空间为 "longhornio"，但上传到阿里云镜像仓库的命名空间为 "rancher"。以下是一个 Longhorn 镜像的示例：

```
longhornio/longhorn-manager:v1.5.5 --> registry.cn-hangzhou.aliyuncs.com/rancher/longhorn-manager:v1.5.5
```

因此，如果要在国内安装 Longhorn，只需要将镜像替换为国内的镜像名称即可。下面以[使用 kubectl 方式安装 Longhorn](https://longhorn.io/docs/1.6.2/deploy/install/install-with-kubectl/) 为例，介绍如何使用国内资源安装 Longhorn：

1. 下载 longhorn yaml 配置文件

```
wget https://raw.githubusercontent.com/longhorn/longhorn/v1.6.2/deploy/longhorn.yaml
```

2. 修改 longhorn 镜像，使其替换为国内的 longhorn 镜像：

```
sed -i 's|longhornio|registry.cn-hangzhou.aliyuncs.com/rancher|g' longhorn.yaml
```

3. 部署 longhorn

```
kubectl apply -f longhorn.yaml
```

Longhorn 还支持其他安装方式，比如 Helm 等。其他安装方式与 kubectl 类似，只需替换对应的镜像即可。

通过上述步骤，你可以顺利在国内安装和使用 Longhorn。

参考：
使用 kubectl 安装 Longhorn：https://longhorn.io/docs/1.6.2/deploy/install/install-with-kubectl/
离线安装 Longhorn：https://longhorn.io/docs/1.6.2/deploy/install/airgap/
