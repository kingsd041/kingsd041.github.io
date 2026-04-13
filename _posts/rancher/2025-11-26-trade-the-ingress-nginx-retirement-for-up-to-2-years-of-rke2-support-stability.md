---
layout: post
title: 用 RKE2 长达 2 年的支持与稳定性，平稳度过 Ingress-NGINX 退役期
subtitle: Ingress-NGINX 即将退役，但依托 RKE2 的长期支持，你完全可以稳住现状、从容规划下一步。
date: 2025-11-26 11:06:00 +0800
author: Ksd
header-img: img/post-bg-desk.jpg
catalog: true
tags:
  - Rancher
  - Ingress-NGINX
  - Traefik
---

# 用 RKE2 长达 2 年的支持与稳定性，平稳度过 Ingress-NGINX 退役期

你或许已经听说了：**Ingress-NGINX 将在 2026 年 3 月之后停止维护**。这并不意味着那一天系统就会突然停止工作，但从此开始，它将**不再获得任何上游的 Bug 修复与安全补丁**。把一个无人维护的组件放在生产环境边缘，会使安全与合规风险随着时间不断上升。

好消息是，这段时间你不需要“硬扛”。SUSE 会确保你在这个过渡期里有稳定的技术支撑，有计划、有节奏地推进迁移，而不是被时间追着跑。

## 明确的规划基准：RKE2 v1.35 支持至 2027 年 12 月

RKE2 同时支持 **Ingress-NGINX 和 Traefik** 两种 Ingress 控制器，你可以按集群自由选择。这种灵活性很重要，因为不同团队的节奏不同：有的受合规窗口限制，任何变更都要提前几个月排；有的行动比较快，只要路径清晰、风险可控就能马上动。

对于必须在短期内保持稳定的团队，SUSE 将帮助你**稳住现有环境**：

- RKE2 v1.35 计划在 2025 年 12 月（上游版本发布后不久）推出；
- Rancher Prime LTS 客户可获得长达 **24 个月的支持周期**；
- 提供强化基线、持续的 CVE 监控以及可验证的规避或缓解措施。

核心诉求只有一个：**在保证 SLA 的前提下，让你拥有从容规划下一步的时间。**

## 想迁到 Traefik？也有一条顺滑、尽量少踩坑的路

如果你已经准备好迁移到 Traefik，我们也有一套相对“省心”的方案。
- 大多数常见的 Ingress-NGINX 配置，用 Traefik 的 [Ingress-NGINX provider](https://doc.traefik.io/traefik/reference/install-configuration/providers/kubernetes/kubernetes-ingress-nginx/ "Ingress-NGINX provider") 来减少变更并降低风险
- 如果你用了大量自定义注解、高级能力（例如 TLS 透传、mTLS、限流、定制认证……），SUSE 的咨询团队可以帮忙做差异分析、试点验证、分阶段切换计划

另外，**迁到 Traefik 之后，你也就迈出了往 Gateway API 演进的第一步**（稍后会有更多相关内容介绍推出）。

Traefik Labs 创始人兼 CTO Emile Vauge 表示：

> “Ingress-NGINX 的退役是 Kubernetes 社区的一个关键拐点。Traefik 的目标是消除迁移风险，我们很自豪通过原生的 NGINX 兼容方式成为唯一真正的即插即用型可替代方案，它采用原生 NGINX 兼容性设计。借助 SUSE 延长的 RKE2 支持，团队可以按照自己的节奏安全迁移，把退役期限转化为立即可控的风险缓解点，并为未来基于 Gateway API 的平台现代化奠定基础。”

## 你可以立即开始的三件事

为了在迁移过程中保持业务连续性，我们建议按以下步骤推进，以尽量降低干扰：

1. **审计现有环境**
   明确 Ingress-NGINX 的部署位置，并整理所有依赖的注解与特性。

2. **与 SUSE 对齐策略**
   与 SUSE 团队共同评估当前架构，并制定适合业务节奏的迁移时间表：
   是需要马上稳定当前版本？还是择机迁移？或者并行推进两条路径？

3. **通过试点验证**
   在非生产环境部署 Traefik，确认行为一致性，并准备经过验证的可回滚方案。

之后，你就能根据企业的业务排期与监管要求，自信地安排上线窗口，而不必担心时间不够用——**RKE2 v1.35 支持到 2027 年底，让你有足够的空间“把事做好”。**

## 参考资料

- RKE2 Ingress 控制器（Ingress-NGINX & Traefik）文档：https://documentation.suse.com/cloudnative/rke2/latest/en/networking/networking_services.html
- Traefik 的 Ingress-NGINX 迁移指南：

  - 参考文档：https://doc.traefik.io/traefik/reference/routing-configuration/kubernetes/ingress-nginx/
  - 博客：
    - Traefik Ingress-NGINX Provider 介绍: https://traefik.io/blog/transition-from-ingress-nginx-to-traefik 
    - 使用 Traefik 的分阶段迁移方案:  https://traefik.io/blog/migrate-from-ingress-nginx-to-traefik-now


技术退役不一定意味着混乱。只要评估得当、规划合理，并结合 SUSE 的支持，你完全可以让风险降到最低、让节奏保持稳定。如果你需要制定详细计划，或希望启动迁移试点，欢迎联系你的 SUSE 团队。
我们会与你站在一起，确保你的 Ingress 路径始终保持安全、合规、并且——就像最好的基础设施一样——“乏味到不值得被注意”。
