---
layout: post
title: Rancher Roundup 2023-4
subtitle:
date: 2023-4-8 11:07:00 +0800
author: Ksd
header-img: img/post-bg-rancher-k8s.png
catalog: true
tags:
  - Rancher
  - Rancher Roundup
---

Rancher Roundup 在每个月的第一个星期二发布一期新刊，这是你对 SUSE Rancher 云原生所有内容的摘要。

## Epinio

三月，Epinio v.1.7.1 发布，在列出（epinio app list）应用程序的性能方面有了明显提升。例如，列出 10 个应用程序从以前版本的 8 至 9 秒改进到现在的几乎不到 1 秒。

这个版本还包含了一些更新和 Bug 修复，其中包括 1.7.0 中已经指出的 Bug 修复，该 Bug 会阻止用户在使用 Rancher Desktop 或 Docker Desktop 时使用 DEX 登录 UI。

查看我们的[发布说明](https://github.com/epinio/epinio/releases/tag/v1.7.1)来了解更多信息！

## Longhorn

Longhorn v1.4.1 已经发布。这个补丁版本主要侧重于提高空间效率、稳定性、性能和弹性。其中包含一个与重复 job 有关的改进，并引入了两种新的 job 类型，来帮助用户设计快照保留策略。你可以在我们的[博文](https://www.suse.com/c/rancher_blog/longhorn-v1-4-1/)中阅读相关信息或查看[发行说明](https://github.com/longhorn/longhorn/releases/tag/v1.4.1)以了解更多信息。

## NeuVector

NeuVector 5.1.2 版本于 3 月 28 日发布。该版本增加了一些新功能，例如基于虚拟主机的网络规则，并修复了 GKE (cos) 在保护模式下发现的应用速度慢的问题。仔细阅读[发行说明](https://github.com/neuvector/neuvector/releases/tag/v5.1.2)，查看 NeuVector Helm chart 的更改。

## Opni

Opni 在这个月取得了丰硕的成果，在不同的垂直领域进行了多项增强和修复，包括日志、监控、AIOps、告警和 UI。以下是关键变化的简要概述：

#### 日志:

- 转换为使用 open-telemetry-collector 进行日志收集
- 日志通过 gRPC 发送到上游 Opni 集群

#### 监控:

- 存储的 Opni 内部指标包含每个租户的集群名称而不是本地集群的租户
- 改进了 Opni local agent 识别

#### AIOps:

- 优化的查询，用于过滤训练控制器内的异常关键词，并从 Opensearch 获取日志用于训练深度学习模型
- 实施了一个用于日志异常检测模型训练的流式数据加载器，以减少大型数据集的内存压力。

#### 告警:

- 在告警时间线中合并基于指标的告警事件

日志、监控、AIOps 和告警垂直领域的改进增强了平台的整体性能和功能。此外，各种 UI 的修复和改进确保了管理员和终端用户拥有更流畅、更直观的用户界面。随着 Opni 的不断发展，用户可以期待看到该平台各方面的进一步完善和进步。

## Rancher Desktop

Rancher Desktop 1.8.0 已经发布，其中包括几个 Bug 修复和实验性功能。一些值得注意的内容包括部署配置文件的引入，Windows 上新的网络堆栈以及对 MacOS 上的 Apple 虚拟化框架的支持。你可以在我们的[博文](https://www.suse.com/c/rancher_blog/rancher-desktop-1-8-now-with-additional-configuration-options-and-more/)中阅读相关内容，或者查看我们的[发布说明](https://github.com/rancher-sandbox/rancher-desktop/releases/tag/v1.8.0)以了解更多信息!
