---
layout: post
title: 深度融合：Rancher NeuVector UI 扩展加固云原生堆栈安全
subtitle:
date: 2024-3-19 11:07:00 +0800
author: Ksd
header-img: img/post-bg-debug.jpg
catalog: true
tags:
  - NeuVector
---

我们很高兴地宣布，Rancher 的 NeuVector UI 扩展的首个版本正式发布了！这一版本标志着将 NeuVector 安全监控与实施集成到 Rancher Manager UI 中，这是令人振奋的一步。

SUSE 及其[企业容器管理](https://www.suse.com/solutions/enterprise-container-management/ "SUSE enterprise container management")(ECM) 产品的安全愿景始终是实现安全云原生堆栈的轻松部署、监控和管理。全生命周期容器安全解决方案 NeuVector 提供了一套全面的安全可观测性和控制能力，通过与 Rancher 集成，用户可以保护 Rancher 管理的敏感数据流和关键业务应用。

Rancher 用户可以通过 Rancher 部署 NeuVector，并通过 NeuVector UI 扩展监控每个集群的关键安全指标。该扩展包括集群安全评分、入口/出口连接风险以及节点和 Pod 的漏洞风险。

![](https://www.suse.com/c/wp-content/uploads/2024/03/Glen_kosaka_1.png)

由于与 Rancher 的单点登录 (SSO) 集成，用户无需再次登录即可打开完整的 NeuVector 控制台（通过右上角的便捷链接）。通过 NeuVector 控制台，用户可以对安全事件和漏洞进行更深入的分析，配置准入控制策略并管理 NeuVector 提供的零信任运行时安全保护。

NeuVector UI 扩展还支持用户交互以从仪表板调查安全详细信息。特别是，它显示整个集群和工作负载的动态安全风险评分，并提供“如何提高评分”的指导向导。如下所示，这个操作会自动扫描节点和 Pod 中的漏洞和合规性违规行为。

![](https://www.suse.com/c/wp-content/uploads/2024/03/Glen_kosaka_2.png)

## Rancher 扩展架构提供了版本的解耦

扩展允许用户、开发人员、合作伙伴和客户扩展和增强 Rancher UI。此外，用户可以独立于 Rancher 版本对其 UI 功能进行更改和增强。扩展可以允许用户能够在 Rancher 之上进行构建，以更好地适应各自的环境。在这种情况下，NeuVector 扩展可以独立于 Rancher 版本不断增强和更新。

## Rancher Prime 和 NeuVector Prime

NeuVector 的新 UI 扩展作为 Rancher Prime 和 NeuVector Prime 商业产品的一部分提供。商业订阅者可以直接从 Rancher Prime 仓库安装该扩展，并且它预装在 Rancher Prime 中。

## Rancher-NeuVector Roadmap

这是 UI 集成的第一阶段，在接下来的几个月中还计划了更多阶段。例如，计划在下一阶段直接在 Rancher 集群资源视图中查看 Pod 和节点的扫描结果，并手动触发扫描。我们还正在努力实现更细粒度的 SSO/RBAC 集成，将 Rancher 用户/组与 NeuVector 角色进行集成，以及集成来自 [Kubewarden](https://www.kubewarden.io/ "Kubewarden") 和 NeuVector 的准入控制。

## 想要了解更多吗？

> 注意：NeuVector UI 扩展需要 NeuVector 5.3.0+ 和 Rancher 2.7.0+。

有关更多信息，请参阅 NeuVector [文档](https://open-docs.neuvector.com/deploying/rancher "NeuVector 文档")和[发布说明](https://open-docs.neuvector.com/releasenotes/5x "NeuVector 发布说明")。
