---
layout: post
title: 多团队共用集群太乱？用 Rancher+K3k 实现一人一套环境
subtitle:
date: 2025-4-21 11:06:00 +0800
author: Ksd
header-img: img/post-bg-desk.jpg
catalog: true
tags:
  - K3K
---

在我之前写的那篇文章：[《K3K：Kubernetes 套娃式集群管理，轻松运行多个 K3s》](https://mp.weixin.qq.com/s/BO6HG0G8ClrELXEI62yEQg)，我们介绍了一款轻量虚拟集群工具 —— K3k。通过 `k3kcli` 可以快速在现有 Kubernetes 集群中创建多个隔离的 K3s 虚拟集群，对于开发测试、多租户、实验验证等场景非常实用。

不过，那时候的 K3k 还不支持共享模式，每个虚拟集群都需要启动独立的 K3s server pod，资源隔离虽好，但资源利用率不高，而且所有操作都依赖命令行工具，略显硬核。

如今，K3k 迎来了两个重大更新：

- 支持 Shared Mode，共享模式大大提升资源利用率
- 与 Rancher 实现原生集成，可在 UI 中一键创建 K3k 虚拟集群

下面我们就来看看，这些变化对多团队管理 Kubernetes 意味着什么。

## 多团队共用集群的典型挑战

在现实中，一个平台团队往往要支持数十个开发团队共享使用一个 Kubernetes 集群，常见问题包括：

**资源冲突**  
多个团队抢占 CPU、内存等资源，极易导致某个任务拖慢甚至中断其他团队的工作流。

**安全风险**  
一组的错误配置或漏洞可能波及到整个集群的安全，比如服务暴露、证书误用等问题。

**配置受限**  
不同团队有不同需求，可能需要特定版本的 Kubernetes 或自定义的 Admission 配置，但由于共用集群，这些都难以实现。

**运维干扰**  
即使划分了 namespace，很多组件如 Operator、CRD Controller 等还是全局生效，一个团队部署的全局资源可能误伤其他团队。

## 虚拟集群带来的转变：隔离、灵活又节省资源

虚拟集群作为 Kubernetes 多租户方案之一，能够从根本上解决上述问题。K3k 是一种在现有集群中创建轻量虚拟 K3s 集群的工具，具备以下两种模式：

**Virtual Mode（虚拟模式）**  
每个虚拟集群都有独立的 K3s Server 进程，具备完整隔离性，适用于高安全性要求场景。

**Shared Mode（共享模式）**  
共享模式使用 K3s server 作为控制平面，并采用 [agentless servers configuration](https://docs.k3s.io/advanced#running-agentless-servers-experimental "K3s Running Agentless Servers")，K3k server 将不运行 kubelet、容器运行时或 CNI 显著节省资源，适合资源紧张的开发测试场景。

值得一提的是，Shared Mode 是近期新增的特性，在我最初介绍 K3k 时并未支持，这也是此次更新的亮点之一。

## Rancher 原生集成 K3k，全面提升虚拟集群管理体验

这次最令人兴奋的变化是：K3k 已与 Rancher 实现集成。

现在，用户可以直接在 Rancher UI 中创建和管理虚拟集群，无需再手动执行 `k3kcli` 或维护复杂的 YAML 配置。

这一集成带来的能力包括：

- 在 Rancher UI 中选择宿主集群，一键创建 K3k 虚拟集群
- 支持选择虚拟或共享模式
- 自动为每个虚拟集群生成独立的 kubeconfig，实现真正隔离
- 将虚拟集群作为 Rancher 集群视图中的“一级公民”，可统一纳管、统一审计、统一权限管控
- 与现有 DevOps、CI/CD 流程无缝衔接

## 演示与部署体验

要在 Rancher 中启用 K3k 虚拟集群功能，需要安装官方提供的 `virtual-clusters-ui` 插件，**并确保使用的是 Rancher 2.11.x 及以上版本**。以下是详细步骤：

1. 打开 Rancher 管理界面，导航至「Extensions」页面。
2. 点击右上角的三点菜单，选择「Manage Repositories」。
   ![](https://raw.githubusercontent.com/kingsd041/picture/main/202504211533422.png)
3. 点击「Create」，添加新的插件仓库：
   - Name：virtual-clusters-ui
   - Index URL：`https://rancher.github.io/virtual-clusters-ui`
     ![](https://raw.githubusercontent.com/kingsd041/picture/main/202504211534419.png)
4. 点击「Create」，等待仓库状态变为 Active。
5. 返回「Extensions」页面，切换到「Available」标签页。
6. 找到「Virtual Clusters」插件卡片，点击「Install」。
   ![](https://raw.githubusercontent.com/kingsd041/picture/main/202504211535992.png)
7. 选择插件版本（建议使用最新版本），点击「Install」。
   ![](https://raw.githubusercontent.com/kingsd041/picture/main/202504211535972.png)
8. 安装完成后，页面顶部会出现「Reload」按钮，点击以刷新界面。

完成上述步骤后，您就可以在 Rancher 的「Cluster Management」页面中：

- 点击「Create」创建集群；
- 选择「K3k 虚拟集群」类型；
  ![](https://raw.githubusercontent.com/kingsd041/picture/main/202504211105387.png)
- 下拉框「Host Cluster」选择宿主集群，点击右侧「Install K3K」来在宿主集群上安装 `k3k controller`
  ![](https://raw.githubusercontent.com/kingsd041/picture/main/202504211540851.png)
- 配置集群名称、K3s version、模式（Virtual 或 Shared）等参数；
  ![](https://raw.githubusercontent.com/kingsd041/picture/main/202504211541072.png)
- 提交后，Rancher 将自动部署对应的 K3s Server 和 Agent 组件；
- 创建完成后，即可通过 kubeconfig 或 Rancher UI 管理该虚拟集群。
  ![](https://raw.githubusercontent.com/kingsd041/picture/main/202504211602387.png)

整个过程无需 YAML 文件、无需命令行干预，即便是初级用户也能快速上手。

## 使用场景拓展

K3k 的核心价值在于：为每个团队提供一份**独立的 Kubernetes 使用体验**，而不需要**独占一个真实集群**。

典型应用场景包括：

- 平台团队为各业务线分配独立的 Dev/Test 集群
- SaaS 多租户场景下的集群隔离与资源限额
- 大模型微服务实验中的 agent 隔离运行
- 教育培训中为每位学员分配独立环境

结合 Rancher 的权限控制、资源审计、监控告警能力，平台团队可以真正做到 “多集群统一纳管，虚拟集群独立可控”。

## 总结

K3k 从命令行工具成长为可视化平台集成组件，标志着 Kubernetes 虚拟集群进入了真正实用化的新阶段。

它不仅解决了多团队共享集群的资源冲突、安全风险和管理混乱，更通过 Rancher 的图形化操作，降低了使用门槛，提升了平台团队的运营效率。

如果你还在为多租户管理烦恼，或者想提升测试/研发环境的隔离性和灵活性，现在就是尝试 Rancher + K3k 的最佳时机。
