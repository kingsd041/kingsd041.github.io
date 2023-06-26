---
layout: post
title: Rancher Roundup 2023-6
subtitle:
date: 2023-6-8 11:07:00 +0800
author: Ksd
header-img: img/post-bg-rancher-k8s.png
catalog: true
tags:
  - Rancher
  - Rancher Roundup
---

Rancher Roundup 在每个月的第一个星期二发布一期新刊，这是你对 SUSE Rancher 云原生所有内容的摘要。

## Epinio

在五月底，[Epinio v1.8.1](https://github.com/epinio/epinio/releases/tag/v1.8.1) 发布，这个版本增加了许多新功能。

让我们从 UI 开始说起。我们整合了一些增强功能，如 Gitlab 集成、更新应用源码的能力，以及新的导出功能。

在 CLI 端，我们添加了用于批量删除的 delete --all 标志，覆盖默认应用程序端口的功能，以及在创建服务时避免等待的能力。

我们还改进了 Docker 桌面扩展，增加了一个卸载 Epinio 的按钮，以提供更好的用户体验，并更新了我们的文档，使 RKE2 和 Epinio 的安装更加友好。

最后，Epinio v1.8.1 版本解决了一些 bug，如处理并发绑定和解绑与服务和配置的问题，部署到 0 个实例时出现的问题，以及自动完成冗余等等。

## Longhorn

最新的稳定版本 Longhorn v1.4.2 现已发布。此版本引入了一个带有节点清空策略的 Kubernetes 升级功能，允许用户在 Kubernetes 升级期间应用适当的清空策略。此外，它还通过考虑节点之间的网络不稳定性来改进副本重建，以防止重建进程被卡住。另外，副本信息将在节点重启后从实例管理器中清除，以防止不正确的下游副本重建。此外，准入验证 webhook 的失败策略已更改为 "failPolicyFail"，以增强 Longhorn 的稳定性。更多信息，请访问发布说明：https://github.com/longhorn/longhorn/releases/tag/v1.4.2。

## NeuVector

NeuVector 5.1.3 版本于 5 月发布，增加了打印本地扫描结果和支持 .NET 扫描等新功能。修复的 bug 包括 Network Activity 菜单和 Compliance Profile 的 UI 问题。请查看[发布说明](https://open-docs.neuvector.com/releasenotes/5x)并注册[邮件通知](https://lists.suse.com/mailman/listinfo/neuvector-updates)以获取新版本的消息。敬请期待六月份的重大新版本 5.2 的公告！

## Opni

Opni 团队很自豪地宣布，在我们的 v0.10 版本中，Opni Monitoring 已经将 OpenTelemetry 指标集成进来，并将在 6 月初发布。用户现在可以选择他们喜欢的指标收集方法：Prometheus 代理或 OpenTelemetry。从 Opni UI 可以轻松切换 Prometheus 和 OpenTelemetry，简化了两种收集器的部署过程。

集成 OpenTelemetry 的优势在于，它比 Prometheus 更高效地收集指标。在特定的集群配置中，Opni OpenTelemetry 收集器已经证明可以节省高达 90% 的内存，使其成为一种更加节省资源的选择。

这个更新对于那些从较小集群中收集指标的用户特别有益，因为它保留了 Opni 可观察性组件的简单性和易操作性。
