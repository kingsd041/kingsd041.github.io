---
layout: post
title: 解读 Kubernetes 管理平台（第二部分）
subtitle:
date: 2023-5-19 11:08:00 +0800
author: Ksd
header-img: img/post-bg-desk.jpg
catalog: true
tags:
  - Rancher
---

## 非托管 KMP

这篇文章是关于 Kubernetes 管理平台（KMP）的系列文章的第二篇。在第一篇文章中，我们分析了托管 KMP，探讨了它们的潜在好处和客户群体。本篇文章将研究非托管 KMP 以及可以从这种解决方案中获益最多的组织客户群体。

在第一篇文章之后，你可能认为托管 KMP 是最好的选择，但在做出决定之前有许多要考虑的因素。在本篇文章文章中，我们希望帮助你选择最适合你的用例和需求，因此让我们开始分析每个选项的优缺点。

在深入讨论非托管 KMP 的优缺点之前，让我们了解一下市场的背景以及为什么非托管 KMP 是全球大多数知名组织的首选。市场上使用最广泛的一些 KMP 包括 Rancher Prime 和 Red Hat Advanced Cluster Management。这些平台以简化 Kubernetes 集群的部署、扩展和管理，并提供一个集中控制平面来管理规模化集群和与其他技术的轻松集成而闻名。此外，这些平台提供安全功能和自动更新，以确保集群具有高可用性和安全性。

然而，它们在组织中受欢迎的主要原因是它们的控制力和适应性。尽管存在差异，但这些平台使组织能够完全控制其集群、安全、配置、应用程序和任何其他与 Kubernetes 相关的事项，并适应组织内使用的任何架构。这意味着你拥有管理平台的所有权力。

## 非托管 KMP 的优势：

- **更高的灵活性：**
  - 非托管平台在自定义和配置选项方面提供更高的灵活性，这对于复杂的环境非常有益。
- **混合云或多云：**
  - 非托管 KMP 在关注本地部署的同时，不会限制你使用和扩展公共云提供商和托管服务的可能性。
- **边缘架构：**
  - 像 Rancher Prime 这样的解决方案专为将边缘部署整合到管理层中，而不会干扰你的工具和流程。
- **更多的控制和安全性：**
  - 在非托管的 Kubernetes 管理平台中，你的操作人员拥有完整的控制权，并决定哪些安全措施和工具更适合你的应用程序和具体需求。这对于需要严格合规性或受到高度监管的行业来说是最佳选择。
- **成本效益：**
  - 非托管平台比托管平台更具成本效益，尤其是对于大规模部署而言。
- **社区：**
  - 像 Rancher 这样的 Kubernetes 管理平台是开源的，并且多年来建立了一个社区。开源社区在推动创新和帮助项目成为全球解决方案（如 Kubernetes）方面发挥了重要作用。

## 非托管 KMP 的缺点：

- **更复杂：**
  - 非托管平台可能比托管平台更具挑战性，需要更多的技术专业知识来进行设置和管理。
- **责任：**
  - 用户对 Kubernetes 集群的安全性、配置、维护、数据安全性和更新负有责任，这可能会耗费大量时间并需要高度专业知识和更多资源。

## 用户群体

在大多数情况下，非托管 KMP 需要一组运维人员和 SRE 组成的团队。并非所有组织都有资源来管理 Kubernetes，即使有一个 KMP 来简化他们的工作。

- **大型企业：**
  - 这些组织通常拥有专门的 IT 基础设施和 IT 人员，并可能更倾向于自行管理他们的 KMP，以保持对其云基础设施的完全控制和可见性。
- **具有合规要求的公司：**
  - 一些公司可能有特定的监管或数据隐私要求，托管 KMP 无法满足这些要求，因此非托管 KMP 可能是更合适的选择。
- **DevOps 团队：**
  - 精通云基础设施和 Kubernetes 的 DevOps 团队可能更倾向于使用非托管 KMP 提供的更多控制和自定义选项。
- **具有多个云部署的组织：**
  - 拥有多个云部署的公司可能会发现自行管理 KMP 比支付多个不同供应商提供的托管 KMP 更具成本效益。

## 结论

非托管平台需要更高的专业知识，但在使用案例方面提供了更大的灵活性，例如混合云、边缘和本地部署。它们还可以毫无问题地适应多云用例。非托管解决方案在市场上被广泛使用，因为它们通过自动化提供了几乎与托管解决方案相同的所有优点，同时提供了非托管解决方案的优势。选择合适的平台对于帮助你的组织快速适应和发展以满足业务需求至关重要。