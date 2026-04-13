---
layout: post
title: K3s 如何优化镜像拉取？在线、离线、加速器与 eStargz 全面介绍
subtitle: 本篇将从在线拉取、离线部署、镜像加速器到 eStargz 深度解析，全面介绍 K3s 在不同场景下如何实现更快、更稳定的镜像拉取体验。
date: 2025-11-24 11:08:00 +0800
author: Ksd
header-img: img/post-bg-debug.jpg
catalog: true
tags:
  - K3s
---

在资源受限或离线（隔离）环境中，镜像拉取速度慢会让人非常头疼，甚至可能导致 Kubernetes 的启动时间超过可接受范围。如今越来越多的 AI 应用依赖超大镜像（动辄几十 GB、上百 GB），这个问题更加突出。

本文将介绍 K3s 提供的一些机制，帮助用户在处理大型镜像时提升体验。

## 在线 & 离线场景的镜像处理策略 📦

K3s 提供了两类方法，分别应对在线和离线环境中拉取大镜像的需求：

- **在线集群**：为了避免 Pod 启动时从外部镜像仓库拉取镜像过慢，K3s 可以通过一个清单文件提前 `pre-pull` 镜像。
- **离线集群**：在完全没有外网的场景下，K3s 可以直接从本地的镜像 tar 包中 `import` 镜像。

## 1. 使用清单文件预拉取镜像（在线场景）

在可联网的场景下，目标是尽早并高效地启动镜像拉取。K3s 可以在启动时，或运行过程中，根据一个文本文件提前顺序拉取一组镜像，将其放入内置的 containerd 存储中。

这样可以确保基础镜像在集群启动或应用部署时已经就绪。

⚠️ **注意**
如果你在 K3s 启动前就预拉取镜像、且镜像非常大，整个拉取过程超时（>15 分钟），K3s 可能会启动失败。因此，如果怀疑镜像过大，最好在 K3s 正在运行时再执行预拉取。

### 使用方法

在某个节点上创建目录并将镜像列表文件放进去，一行一个镜像名称。例如：

```bash
mkdir -p /var/lib/rancher/k3s/agent/images \
  && echo docker.io/pytorch/pytorch:2.9.0-cuda12.6-cudnn9-runtime \
  > /var/lib/rancher/k3s/agent/images/pytorch.txt
```

当 K3s 发现该文件后，会通过 CRI API 开始拉取镜像，并在日志中打印类似内容：

```bash
# 检测到镜像清单文件
level=info msg="Pulling images from /var/lib/rancher/k3s/agent/images/example.txt"
level=info msg="Pulling image docker.io/pytorch/pytorch:2.9.0-cuda12.6-cudnn9-runtime"

# 拉取完成（包含耗时）
level=info msg="Imported docker.io/pytorch/pytorch:2.9.0-cuda12.6-cudnn9-runtime"
level=info msg="Imported images from ... in 6m1.178972902s"
```

## 2. 从镜像 Tar 包导入（离线 & 超高速）

在完全隔离或需要最高速度的场景下，建议将镜像保存为 tar 包，使 K3s 在本地直接加载这些镜像，而无需任何网络请求。

将通过 `docker save` 或 `ctr save` 创建的镜像压缩包放入 `/var/lib/rancher/k3s/agent/images` 目录即可。例如：

```bash
mkdir -p /var/lib/rancher/k3s/agent/images
cp microservices-demo.tar.gz /var/lib/rancher/k3s/agent/images/
```

K3s 进程会自动解压镜像 tar 包并载入镜像，日志如下：

```bash
level=info msg="Importing images from /var/lib/rancher/k3s/agent/images/microservices-demo.tar.gz"
level=info msg="Imported images ... in 1m39.8610592s"
```

你可以随时使用 K3s 内置的 ctr 客户端查看镜像：

```bash
k3s ctr images list
```

## 使用 tar 包优化 K3s 启动时间

默认情况下，K3s 在每次启动时都会重新导入镜像压缩包。对于非常大的镜像，这会明显拖慢启动速度。例如上面的 `microservices-demo.tar.gz` 导入一次就需要 1 分 39 秒。

为优化这一点，K3s 支持缓存功能，只在 tar 包发生变化时重新导入：

```bash
touch /var/lib/rancher/k3s/agent/images/.cache.json
```

这个 `.cache.json` 文件会记录镜像压缩包的元数据（如大小、修改时间）。下次启动时，如果文件没有变化，K3s 会跳过导入，显著缩短启动时间。因此，要检查此功能是否正常工作，请检查缓存文件 `.cache.json` 是否为空，并在重启后检查日志中是否不再出现 `Importing images` 相关的日志

⚠️ **提示**
启用缓存后，如果某个镜像被删除或被清理，需要手动重新导入以恢复一致性。更多细节可查阅[文档](https://docs.k3s.io/installation/airgap?_highlight=.cache.json&airgap-load-images=Manually+Deploy+Images#enable-conditional-image-imports "Enable Conditional Image Imports")。

## 内置镜像加速器：Embedded Registry Mirror 🕸️

K3s 内置 Spegel 作为集群内的容器镜像缓存加速器。其主要作用是加速镜像拉取、减少外部网络依赖，使节点在可能的情况下从集群内的其他节点拉取已缓存的镜像内容，而不是每个节点都直接访问外部仓库。比如当节点 A 拉取了某个镜像后，节点 B 再拉取时可直接从节点 A 获取，而不是重复从外部仓库下载。

要启用 Spegel，需要在 server 节点使用 `--embedded-registry` 参数，或在配置文件中设置 `embedded-registry: true`。启用后，集群中的每个节点都会立即成为一个无状态、本地镜像镜像点，监听端口 6443。节点之间会通过端口 5001 的 P2P 网络持续同步可用镜像列表。

```bash
# 启用内嵌 registry mirror
embedded-registry: true
# 启用可帮助监控镜像镜像器的指标
supervisor-metrics: true
```

然后，你需要在所有节点上添加一个 `registries.yaml`，其中指定允许哪些 registry 在节点间同步镜像内容。

如果某个 registry 只在部分节点上启用，那么只有启用了该 registry 的节点才会互相交换镜像。

例如：

```bash
mirrors:
  docker.io:
  registry.k8s.io:
```

成功启动后，你将看到：

```bash
level=info msg="Starting distributed registry mirror ..."
level=info msg="Starting distributed registry P2P node ..."
```

可以通过 supervisor 的 metrics 端点查看 Spegel 相关指标：

```bash
kubectl get --server https://10.11.0.11:6443 --raw /metrics | grep spegel
```

更多详细信息请查看 [K3s 文档](https://docs.k3s.io/installation/registry-mirror "嵌入式注册表镜像")。

另外，我们之前也详细介绍过 K3s 的嵌入式容器镜像共享机制，可参考：[打造高效 Kubernetes 集群：深入解析 K3s 的嵌入式容器镜像共享机制](https://mp.weixin.qq.com/s/pJWWDND-EkW_79ezN_Ob-w)

## 使用 eStargz 镜像 ⚡

另一种加速 Pod 创建的方法是使用一种特殊的镜像格式：eStargz。它支持延迟拉取（lazy pulling），意味着应用可以几乎立即启动，其余镜像内容会在后台继续拉取。

这种方式要求：

- 镜像必须以 eStargz 格式构建

- K3s agent 必须配置使用 stargz snapshotter（`--snapshotter=estargz` 或配置文件中 `snapshotter: estargz`）

这是 K3s 中的实验性功能，更多信息可在[文档高级章节](https://docs.k3s.io/advanced#enabling-lazy-pulling-of-estargz-experimental "启用 eStargz 的延迟拉取")中找到。如果你正在使用它，我们非常希望听到你的反馈。

## 总结 🏁

面对如今动辄几十 GB 的云原生与 AI 镜像，K3s 提供了一系列实用而灵活的镜像加速能力，包括：

- 使用清单文件预拉取镜像
- 从 tar 包导入镜像（离线 & 超高速）
- 利用 cache 优化启动时间
- 启用内置的 Spegel 镜像加速器
- 使用 eStargz 格式实现 lazy pulling

这些机制帮助你将「慢速网络操作」转变为「快速本地操作」，让资源受限或离线环境下的 K3s 集群获得更快、更可控的启动体验。
