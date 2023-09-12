---
layout: post
title: Rancher Roundup 2023-7
subtitle:
date: 2023-7-10 11:07:00 +0800
author: Ksd
header-img: img/post-bg-rancher-k8s.png
catalog: true
tags:
  - Rancher
  - Rancher Roundup
---

Rancher Roundup 在每个月的第一个星期二发布一期新刊，这是你对 SUSE Rancher 云原生所有内容的摘要。

## Elemental

Elemental 的新稳定版本已发布。它包括 Elemental Operator v1.2.5 和 Elemental UI extension v1.2.0。

最显著的变化包括：

- SeedImage 资源现在有一个 **cleanupAfterMinutes** 字段（默认设置为 60 分钟）；在指定的时间过后，构建的 ISO 将被自动删除，并释放集群节点的本地存储空间
- 修复了 SeedImage 资源的 **cloud-config** 配置被忽略的问题
- 现在，Operator 已安装默认的 **ManagedOSVersionChannel**，其中包含最新稳定的 Elemental OS 映像，可用于 Elemental 集群节点操作系统升级

请查阅我们的[文档](https://elemental.docs.rancher.com/)，了解有关 Elemental 及其最新发布的功能的更多信息。

## Epinio

我们自豪地宣布，Epinio 现在是 [Artifact Hub](https://artifacthub.io/packages/helm/epinio/epinio) 上的**官方项目**。此外，最新的 **Rancher v2.7.5** 附带了 Epinio v1.8.1，以实验性模式提供许多 UI 增强功能和新功能。有关完整的变更日志，请查阅我们在 GitHub 上发布的 [v1.8.1 版本的发布说明](https://github.com/epinio/epinio/releases/tag/v1.8.1)！

## Harvester

Harvester 团队正忙于准备 v1.2.0 版本，预计将于 7 月底发布。此版本的亮点包括试验性的裸金属工作负载支持和开箱即用的 Rancher 支持功能，预计将扩展 Harvester 在裸金属上运行容器工作负载的范围。请查看我们的[项目路线图](https://github.com/harvester/harvester/wiki/Roadmap#v120-q2-2023)，了解即将发布的 Harvester 版本的时间表和更多细节。

## Kubewarden

Kubewarden 项目自豪地宣布发布 v1.7.0-rc1 版本，我们开始着手开发审计扫描器。审计扫描器是扫描在你的 Kubernetes 集群中运行的资源，以确保它们符合 Kubewarden 上部署的最新策略的组件。此外，通过此版本，我们还引入了另一个策略后端 - WASI 策略。通过引入这一功能，Kubewarden 旨在利用 WASI 来运行使用 Kyverno 和 CEL DSL 编写的策略。请查阅我们的[文档](https://docs.kubewarden.io/writing-policies/wasi)了解更多关于这些最新发展的信息！

## Longhorn

7 月出，Longhorn 发布了 v1.5.0 版本，该版本的亮点之一是基于 SPDK 的 v2 数据引擎，它可以在 Longhorn 中提供接近本机存储性能。请查看我们的[发布说明](https://github.com/longhorn/longhorn/releases/tag/v1.5.0)，了解 Longhorn v1.5 版本的详细信息。

## Opni

在 Rancher，我们相信用户应该能够选择最适合他们的工具。因此，从 v0.10 开始，Opni 允许用户能够根据自己的偏好选择 Prometheus 或 OpenTelemetry 指标。最新版本的 Opni 通过无缝集成到托管的 Rancher 中，可以节省约 40-90%的 RAM 和 25-60%的 CPU 利用率，从而减少指标占用空间。请查看我们的[发布说明](https://github.com/rancher/opni/releases/tag/v0.10.0)，了解更多信息！

## Rancher

Rancher 的最新版本 [v2.7.5](https://github.com/rancher/rancher/releases/tag/v2.7.5) 主要专注于稳定性增强和错误修复。引入了针对 Kubernetes v1.25 及以上版本的改进安装过程，并新增了对 Kubernetes v1.26 的支持。在升级到最新版本的 Rancher 时，还需要注意一些行为变化和已知问题。因此，我们强烈建议在更新之前查阅我们的安装/升级说明！

## Rancher Desktop

Rancher Desktop v1.9.0 于 6 月 13 日发布，引入了新功能和多项稳定性改进。该版本支持 Docker 扩展。你可以从 Rancher Desktop Catalog 中尝试可用的 Docker 扩展。此版本还包括新的偏好设置选项用于实验性设置，例如在 Windows 上为 VPN 环境选择网络堆栈、配置 macOS 和 Linux 上的目录挂载选项、在 socket-vmnet 和 vde-vmnet 之间进行选择等等。Rancher Desktop 在开源社区中持续受到欢迎，并不时得到外部贡献。本次发布中包含的 Windows 操作系统的代理支持功能是其中最重要的外部贡献之一，我们要感谢 [Thomas Perale](https://github.com/tperale) 对此宝贵的贡献。

## SLE BCI

如果你使用 Rancher，那么你将依赖 SUSE Linux Enterprise Base Container Images（SLE BCI）。但是它们究竟是什么？SLE BCI 是受欢迎、值得信赖、安全且精简的 SUSE Linux Enterprise Server 15 基础镜像，你可以使用它们来开发、部署和重新分发应用程序。随着 [SUSE Linux Enterprise Server 15 SP5](https://www.suse.com/c/announcing-new-bcl-releases/) 的推出，[SUSE Linux Enterprise Base Container Images（SLE BCI）](https://www.suse.com/products/base-container-images/)的[语言](https://registry.suse.com/#bci-lang)和[应用容器](https://registry.suse.com/#apps)也已升级，以利用新产品版本提供的增强功能。请查阅我们同事 Dirk Müller 撰写的[短文](https://www.suse.com/c/sle-bci-15-service-pack-5-containers/)，了解有关最新版本中的新功能。
