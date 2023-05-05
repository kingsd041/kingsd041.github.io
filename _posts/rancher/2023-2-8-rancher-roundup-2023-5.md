---
layout: post
title: Rancher Roundup 2023-5
subtitle:
date: 2023-5-5 11:07:00 +0800
author: Ksd
header-img: img/post-bg-rancher-k8s.png
catalog: true
tags:
  - Rancher
  - Rancher Roundup
---

Rancher Roundup 在每个月的第一个星期二发布一期新刊，这是你对 SUSE Rancher 云原生所有内容的摘要。

## Elemental

Elemental 的新稳定版本已经发布，可用于完整 Kubernetes 节点管理的 Rancher Extension。

它包括 Elemental UI Extension v1.1.0，这样就可以与 Rancher v2.7.2 无缝集成，还有经过深度改造的 Elemental Operator v1.2.2。新的稳定版本带来了更高的可靠性和许多新功能。最值得一提的是：

- 添加 MachineInventory [硬件标签和注释](https://elemental.docs.rancher.com/hardwarelabels)，将在主机注册期间自动填写。
- 通过新的 [SeedImage 资源](https://elemental.docs.rancher.com/seedimage-reference)构建引导 ISO，该资源允许自定义 cloud-config 注入，可以在 ISO 引导期间应用。
- 只需在 [Rancher UI 上单击一下](https://elemental.docs.rancher.com/quickstart-ui#preparing-the-installation-seed-image)即可构建引导 ISO，欢迎按照我们的[快速入门](https://elemental.docs.rancher.com/quickstart-ui)指南尝试一下！

## Kubewarden

我们很高兴地宣布 Kubewarden 1.6.0 发布。此版本带来了稳定性、性能和安全性方面的改进以及一项新的主要功能。你可以使用我们的官方 helm chart 升级到最新版本，并通过查看我们的[官方发布博客](https://www.kubewarden.io/blog/2023/04/kubewarden-.1.6.0-release/)了解有关该版本的更多信息。

## Opni

4 月对于 Opni 项目来说是令人兴奋的一个月，因为我们推出了最新版本 v0.9.1，主要侧重于增强我们的 AIOps 功能。我们的团队致力于改进 AI 服务和 Nats Jetstream KV 存储之间的集成，从而使获取模型训练参数的过程更加简化和高效。

在我们不断努力改进 Opni 的监控能力的过程中，我们还将 Opentelemetry 指标与 Prometheus 集成。此功能将包含在我们即将发布的 v0.10.0 版本中，为我们的用户提供更全面的监控解决方案。

前往我们的[发行说明](https://github.com/rancher/opni/releases/tag/v0.9.0)了解更多信息！

## Rancher

在 KubeCon Europe，我们发布了最新版本的 Rancher v2.7.2。虽然我们旨在通过将 Rancher Manager 的用户功能与此版本分离来促进更强大的生态系统采用，但它包含一个严重漏洞 [CVE-2023-22651](https://github.com/advisories/GHSA-6m9f-pj6w-w87g)。 [v2.7.3](https://github.com/rancher/rancher/releases/tag/v2.7.3) 解决了这个问题，但在其他方面是 v2.7.2 的镜像版本。请参阅相关的建议并查看我们的[发行说明](https://github.com/rancher/rancher/releases/tag/v2.7.2)以了解更多信息。

## Rancher Desktop

Rancher Desktop 在 4 月份发布了 1.9.0-tech-preview 版本，我们在其中引入了对 Docker 扩展的支持。在此版本中，我们从用户可以安装和试用的三个扩展目录开始。我们的目标是在即将发布的 Rancher Desktop 版本中继续使用更多的扩展。

你可以通过查看[发行说明](https://github.com/rancher-sandbox/rancher-desktop/releases/tag/v1.9.0-tech-preview)或我们的[博客](https://www.suse.com/c/rancher_blog/rancher-desktop-1-9-tech-preview-with-support-for-docker-extensions/)了解有关技术预览版的更多信息。
