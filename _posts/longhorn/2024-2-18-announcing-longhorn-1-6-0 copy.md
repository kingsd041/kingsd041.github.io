---
layout: post
title: 发布 Longhorn 1.6.0：引领性能革新与平台扩展
subtitle: Longhorn 1.6.0 的发布标志着性能提升和多平台支持方面的重要进展。本次更新引入了众多新功能和改进，包括备受期待的 Longhorn Data Engine version 2.0 的功能预览、Talos 支持以及对系统稳定性、性能和弹性的增强
date: 2024-2-18 11:07:00 +0800
author: Ksd
header-img: img/post-bg-debug.jpg
catalog: true
tags:
  - Longhorn
---

Longhorn 团队欣喜地宣布推出最新的次要版本 1.6.0！此版本引入了一系列新功能、增强功能以及 Bug 修复，旨在提升系统质量和整体用户体验。

具体来说，此次发布包括备受期待的 Longhorn Data Engine version 2.0 的进一步功能预览、Talos 支持、节点维护以及对系统稳定性、性能和弹性的改进。

Longhorn 团队由衷感谢社区的贡献，并期待收到有关此版本的反馈。

## Longhorn Data Engine version 2.0（技术预览）

Longhorn Data Engine version 2.0（v2 Data Engine）的核心功能得到了显著增强；现在你可以在版本 1 和 2 数据引擎之间无缝执行卷备份和还原操作，为将来在两个数据引擎之间进行卷迁移铺平了道路。

Longhorn 的 V2 数据引擎利用 SPDK 的强大功能提升了整体性能。这种集成显著降低了 I/O 延迟，同时提高了 IOPS 和吞吐量。该增强提供了一种能够满足各种工作负载需求的高性能存储解决方案。

**Longhorn 性能 - IOPS：**

![](https://longhorn.io/img/diagrams/v2-data-engine/equinix-iops.svg)

与 V1 引擎相比，Longhorn 的写入性能提高了 2 到 4 倍，随机读性能提高了 2 到 3 倍，单副本的 IOPS 与本地磁盘相当。

**Longhorn 性能 - 延迟：**

![](https://longhorn.io/img/diagrams/v2-data-engine/equinix-latency.svg)

与 V1 引擎相比，Longhorn 的延迟减少了 50-70%，单个副本的读/写延迟与本地磁盘相当。

有关性能改进的更多信息，请参阅[性能文档](https://longhorn.io/docs/1.6.0/v2-data-engine/performance/ "Longhorn 性能文档")。

Longhorn 团队将继续为 V1 数据引擎开发功能，并准备将 V2 数据引擎用于各种环境。

## Talos 支持

Longhorn 旨在无缝运行在通用 Linux 发行版上，以及某些容器优化系统，例如 SLE Micro。针对众多请求，v1.6.0 进行了增强，允许在 Talos 上安装 Longhorn 组件，Talos 是一个安全、不可变且最小化的 Kubernetes 操作系统。v1.6.0 还包括 OKD 支持，感谢社区提供此功能。

Longhorn 团队致力于使 Longhorn 成为自适应存储解决方案，并期待收到你对首选平台的反馈。

## 空间效率

现在，Longhorn 还允许你配置所有卷和特定卷的最大快照数量和最大聚合快照大小。无论是全局应用还是个别应用，这两个设置都有助于空间估算和管理。早期的 Longhorn 版本不提供控制或预测卷快照数量和大小的机制。

## 其他重要变化

Longhorn 1.6.0 发布的其他重要变化包括：

- Longhorn 已经通过了主流的 GitOps 解决方案的验证，包括 Flux、Argo CD 和 Fleet。
- 支持 block volume 加密
- 两个新的 node drain 策略选项：阻止驱逐和如果包含最后一个副本则阻止驱逐
- 后端镜像管理，允许创建和恢复后端镜像的备份

## 更多信息

有关此版本发布后发现的问题，请参阅[发布已知问题](https://github.com/longhorn/longhorn/wiki/Release-Known-Issues "Longhorn 发布已知问题")。有关重要更改的信息，包括功能不兼容性、弃用和移除，请参阅 Longhorn 文档中的[重要说明](https://longhorn.io/docs/1.6.0/deploy/important-notes/ "Longhorn 重要说明")。如果你想了解更多关于发布说明的信息，请参考[Longhorn 发布说明](https://github.com/longhorn/longhorn/releases/tag/v1.6.0 "Longhorn 发布说明")。有关支持性的更多信息，请参阅[支持矩阵](https://www.suse.com/suse-longhorn/support-matrix/all-supported-versions/longhorn-v1-6-x/ "Longhorn 支持矩阵")和[生命周期](https://www.suse.com/lifecycle/#longhorn "Longhorn 生命周期")页面。
