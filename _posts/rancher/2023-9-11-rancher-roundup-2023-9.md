---
layout: post
title: Rancher Roundup 2023-9
subtitle:
date: 2023-9-11 11:07:00 +0800
author: Ksd
header-img: img/post-bg-rancher-k8s.png
catalog: true
tags:
  - Rancher
  - Rancher Roundup
---

Rancher Roundup 在每个月的第一个星期二发布一期新刊，这是你对 SUSE Rancher 云原生所有内容的摘要。

## NeuVector

NeuVector 5.2 现已上线！此版本包含了非常有价值的新增功能和 Bug 修复。新功能包括：

- Sigstore/cosign 集成，用于在准入控制规则中要求镜像签名验证。
- Golang 扫描和 Harbor 可插拔扫描适配器。
- 通过 [AWS Marketplace](https://aws.amazon.com/marketplace/pp/prodview-u2ciiono2w3h2?sr=0-3&ref_=beagle&applicationId=AWSMPContessa) 支持 NeuVector 订阅。
- 基于 Token 的 REST API 访问。
- 可自定义的登录横幅、标志和协议，以及受监管行业用户的分类标头和页脚。
- 为 Prime 订阅者提供新的 CVE 数据库查找服务和其他资产。

请查看 5.2 版本的[博文](https://www.suse.com/c/neuvector-5-2-is-now-available/)和 5.2.x 版本的[发行说明](https://open-docs.neuvector.com/releasenotes/5x)，来获取完整的增强功能和 Bug 修复列表。

紧随 5.2.0 之后，我们还发布了 5.2.1 版本，其中添加了更多增强功能，如 SYSLOG 中的分层扫描结果和 NIST 800-53 报告映射到 CIS。

## Opni

Opni v0.11.0 已发布，随后发布了 v0.11.1 的补丁版本。更新内容如下：

- Opensearch 已升级至 v2.8.0。
- Opni Agent 现在将自动升级以匹配 Gateway 版本。
- 告警中现在包括集群名称。
- 添加了用于配置 AIOps 服务的外部 S3 的 UI 选项。
- 具备从下游集群同步 Prometheus 规则的能力。
