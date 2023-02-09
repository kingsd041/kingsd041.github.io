---
layout: post
title: Rancher Roundup 2023-2
subtitle:
date: 2023-2-8 21:07:00 +0800
author: Ksd
header-img: img/post-bg-rancher-k8s.png
catalog: true
tags:
  - Rancher
  - Rancher Roundup
---

Rancher Roundup 在每个月的第一个星期二发布一期新刊，这是你对 SUSE Rancher 云原生所有内容的摘要。

## Epinio

一月，Epinio 发布了 v1.6.1 ，原生支持 IAM 角色身份认证。这允许在 EKS 集群中部署 Epinio 的 AWS 客户使用 Amazon S3 作为外部存储，而不需要指定任何凭证，只需使用专用策略即可实现更安全、更可靠的集成。此版本还附带一些 Bug 修复和安全更新。查看我们的[发行说明](https://github.com/epinio/epinio/releases/tag/v1.6.1)以了解更多信息！

## K3s

1.26 系列中的第一个 k3s 版本 [v1.26.0+k3s1](https://github.com/k3s-io/k3s/releases/tag/v1.26.0%2Bk3s1) 受到 [containerd/containerd#7843](https://github.com/containerd/containerd/issues/7843) 的影响。在最新版本 v1.26.0+k3s2 中，我们将 containerd 的版本更新为 v1.6.14，解决了 containerd 重启时 Pod 丢失 CNI 信息的问题。建议使用 v1.26.0+k3s2 而不是 v1.26.0+k3s1，因为其中还包含其他一些稳定性和管理方面的变化。请参阅链接的[发行说明](https://github.com/k3s-io/k3s/releases/tag/v1.26.0%2Bk3s2)以了解更多信息。

## Kubewarden

最新版本的 Kubewarden 带来了显着的安全增强：策略评估超时。为了改善项目的安全状况，这一默认功能可提高项目的安全状况，防止策略服务器因一个或多个策略评估陷入无限循环而耗尽计算资源。查看[公告博客](https://www.kubewarden.io/blog/2023/01/release-1_5_0/)，了解有关此功能的更多详细信息，并了解此版本中的其他新功能！

## Opni

使用最新版本的 Opni v0.8.1，用户可以配置各种告警来触发告警。这些告警包括：

- 用户输入的 Prometheus 查询计算结果为 true
- 下游集群中用户指定的 Kubernetes 对象在用户指定的时间内处于用户指定的状态
- 用户的 Opni 监控后台不健康
- 下游集群的 Opni agent 掉线或不健康

请参阅我们的[文档](https://opni.io/)以了解有关如何设置它们的更多信息！

## Rancher

Rancher 安全团队发布了新的 Rancher 2.7.1、2.6.10 和 2.5.17 版本，这些版本只包含了安全相关问题 (CVE) 的修复。基于每个发布分支的最后一个稳定版本 2.7.0、2.6.9 和 2.5.16，这些最新的安全版本将允许你在生产中运行 Rancher，并保证安全性。此外，通过这些安全版本，我们的目标是让我们的开发流程与有关漏洞安全披露的行业标准保持一致。阅读[公告博客](https://www.suse.com/c/rancher_blog/whats-new-in-ranchers-security-release-only-versions/)以了解有关此版本中新功能的更多信息！
