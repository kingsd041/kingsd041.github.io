---
layout: post
title: Rancher Roundup 2023-8
subtitle:
date: 2023-8-7 11:07:00 +0800
author: Ksd
header-img: img/post-bg-rancher-k8s.png
catalog: true
tags:
  - Rancher
  - Rancher Roundup
---

## Epinio

我们发布了新的 Epinio v1.9.0 版本！自 v1.8.1 版本以来，我们添加了许多功能，这里重点介绍其中的一些内容。

新功能包括：

- 可以通过用户提供的值和 Epinio 元数据来自定义服务
- CLI 新增了 logout 和 service port-forward 命令
- 为 app restage 命令添加了 --restart 标志
- 新增了 --from-file 标志，可以从文件中读取配置

我们还修复了一些 Bug。其中包括：

- 使用 OCI 注册表时由于身份验证令牌过期而导致服务部署问题
- 修复了 Epinio 服务出错后删除的问题
- 错误的 CA 证书验证

在 UI 方面 也有很大的变化。从 v1.9.0 开始，用户可以：

- 直接从屏幕复制日志
- 从应用程序详细视图中重新部署应用程序
- 在配置中使用包含键值的上传文件。这在 UI 中相当于 CLI 的 --from-file 标志。

UI 方面的一些修复包括：

- 修正了 OIDC 角色映射
- 禁用了针对已绑定服务的配置取消绑定的命令

最后，我们为了让客户更好的了解如何使用 Epinio，[文档](https://docs.epinio.io/)部分也进行了更新：

- 修复了过时的 GitJob 操作方法
- 添加了验证签名资产的说明
- 描述了如何使用新的服务自定义值
- 描述了如何在安全的外部注册表中使用证书

请查阅我们的[发布说明](https://github.com/epinio/epinio/releases/tag/v1.9.0)以获取完整的变更日志。

## Longhorn

备受期待的 Longhorn 1.5.0 版本于 7 月 6 日发布，紧随其后的是 Longhorn 1.5.1 版本于 7 月 19 日发布的补丁版本。这个最新版本包含了显著的增强功能，旨在提高 IO 性能、弹性和稳定性。通过合并实例管理器的数量，降低了资源需求。此外，基于存储性能开发工具包（SPDK）的新 v2 数据引擎预览版有望彻底改变卷操作中的 IO 性能。这个增强功能极大地提高了 IO 带宽、IOPS，并减少了 IO 的延迟。如果你想了解更多关于 Longhorn 1.5.0 版本的信息，请参阅我们的[发布说明](https://github.com/longhorn/longhorn/releases/tag/v1.5.0)。

## NeuVector

我们在七月发布了 NeuVector 的 5.2 版本，该版本带来了[许多令人兴奋的新功能](https://www.suse.com/c/neuvector-5-2-is-now-available/)。其中包括与 Sigstore/cosign 集成，用于镜像签名验证，Harbor 扫描适配器，可定制登录界面/横幅，以及在 AWS Marketplace 上的可用性。有关所有新功能和 Bug 修复的完整列表，请查阅 NeuVector 的[发布说明](https://open-docs.neuvector.com/releasenotes/5x#520-july-2023)，并从 NeuVector 的 [Docker Hub](https://hub.docker.com/u/neuvector) 尝试使用该版本。
