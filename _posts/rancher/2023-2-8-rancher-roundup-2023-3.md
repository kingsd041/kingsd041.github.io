---
layout: post
title: Rancher Roundup 2023-3
subtitle:
date: 2023-3-8 11:07:00 +0800
author: Ksd
header-img: img/post-bg-rancher-k8s.png
catalog: true
tags:
  - Rancher
  - Rancher Roundup
---

Rancher Roundup 在每个月的第一个星期二发布一期新刊，这是你对 SUSE Rancher 云原生所有内容的摘要。

## Epinio

今年二月，Epinio v.1.7.0 发布，其中包含了一些身份验证的增强功能。在最新版本中，扩展了与 AWS 的集成，支持通过 EKS 上的 IAM 角色和 Kubernetes 服务帐户进行身份认证。此外，更新后的 UI 有一个仪表板页面，可以看到你的命名空间、应用程序和服务的概况，并支持 Dex 登录。这个版本的另一个重要里程碑是添加了 SUSE 的 [s3gw](https://s3gw.io/) 作为 Minio 的替代品，可用于内部应用程序的存储。查看我们的[发行说明](https://github.com/epinio/epinio/releases/tag/v1.7.0)来了解有关这些增强功能、其他常规 Bug 修复和更新的更多信息。

## Kubewarden

我们很高兴地宣布 Kubewarden 将参与 LFX 导师计划。选定的候选人将能够在此计划期间改进 Kubewarden [SDK](https://mentorship.lfx.linuxfoundation.org/project/ddc368b7-1e24-42ed-9e30-02abdf6fcd33) 或[政策](https://mentorship.lfx.linuxfoundation.org/project/9b8a3840-1355-4301-894b-7271c597f0cf)。我们正在审查收到的申请，并将很快公布各自的被指导者。

## NeuVector

[NeuVector 5.1.1](https://github.com/neuvector/neuvector/releases/tag/v5.1.1) 于二月份发布，在漏洞扫描中增加了软件包信息，修复了多个关键 CVE，增加了对替换内部证书的支持，并通过修复多个 Bug 增强了性能。最近发布的其他功能包括多集群 CVE 扫描、增强的准入控制规则以及一些功能调整，来更好的满足大型集群和边缘部署的性能要求。
