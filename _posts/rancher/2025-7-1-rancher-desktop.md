---
layout: post
title: 解锁开发者生产力：Rancher Desktop 搭配 SUSE Application Collection 扩展
subtitle: 
date: 2025-6-21 11:06:00 +0800
author: Ksd
header-img: img/post-bg-desk.jpg
catalog: true
tags:
  - RancherDesktop
---

在开源社区中，开发者始终追求强大而灵活的工具。在企业环境中，开发者同样需要快速创新、高效迭代，并能够安心地部署应用。**Rancher Desktop 搭配 SUSE Application Collection 扩展**的组合，正是满足现代企业开发者需求的理想选择，提供了一套完整的本地开发环境，让开发与部署更加稳定、安全、高效。

## SUSE Application Collection：企业级开源工具集

**SUSE Application Collection** 是由 SUSE 精选并维护的一组企业级开源软件工具。与 Rancher Desktop 搭配使用时，它为本地开发提供了稳固、安全的基础，帮助开发者在企业环境中构建关键业务应用。其核心优势包括：

- **精选开源组件**：SUSE 提供经过测试和验证的开源软件版本，确保长期可维护性与稳定性。
- **安全与合规**：SUSE 持续发布补丁与安全更新，帮助企业满足合规要求，强化安全防护。
- **透明可追溯**：每个应用都附带软件清单（SBOMs）、来源证明（符合 SLSA Level 3 标准）以及已知漏洞（CVEs）列表，确保用户对组件的来源和风险一目了然。
- **开发工具集成**：涵盖了常用的开发框架和工具，覆盖从编写代码到部署上线的全流程。
- **企业级支持**：SUSE 提供专业的技术支持服务，助力开发与运维团队快速排障，降低宕机风险。

通过 SUSE Application Collection，企业可以降低运营风险，提升安全水平，加速业务应用的上线周期，在保持开源灵活性的同时，享受企业级的保障。

## Rancher Desktop：本地 Kubernetes 与容器开发中心

**Rancher Desktop** 是一款开源桌面应用，提供本地 Kubernetes 集群和容器管理功能。它专为开发者打造，简化了容器化应用的开发流程。其亮点功能包括：

- **轻松搭建本地 Kubernetes**：一键启动本地集群，集成 `kubectl`、`helm` 等常用工具，省去复杂配置。
- **多容器运行时支持**：支持 containerd 和 Moby（Docker Engine），开发者可自由选择适配项目需求。
- **资源可控**：支持为本地集群分配 CPU 和内存，优化性能同时保障主机系统流畅运行。
- **跨平台支持**：兼容 Windows、macOS 和 Linux，适应不同开发者的操作系统环境。
- **贴近生产环境**：本地开发环境高度模拟生产环境，快速验证修改，缩短迭代周期。

Rancher Desktop 帮助开发团队更加独立自主地工作，不依赖昂贵的云开发环境，提升协作效率，助力企业更快发布高质量应用。

## 快速上手指南

下面是如何在 Rancher Desktop 中安装并使用 SUSE Application Collection 扩展的详细步骤。

### 环境准备

- 安装好 Rancher Desktop
  - 文档地址：https://docs.rancherdesktop.io
- 注册 SUSE Application Collection 账号
  - 官网：https://apps.rancher.com
- （可选）创建 SUSE 应用集服务账号
  - 教程：https://docs.apps.rancher.io/get-started/authentication/#create-a-service-account

### 安装 SUSE Application Collection 扩展

1. 打开 Rancher Desktop
   ![](https://www.suse.com/c/wp-content/uploads/2025/06/Captura-de-pantalla-2025-06-23-a-las-17.11.10-2048x1224.png)
2. 点击左侧菜单中的 “Extensions”
3. 搜索 **SUSE Application Collection**
   ![](https://www.suse.com/c/wp-content/uploads/2025/06/Captura-de-pantalla-2025-06-23-a-las-17.11.32-2048x1224.png)
4. 点击“Install”
   ![](https://www.suse.com/c/wp-content/uploads/2025/06/Captura-de-pantalla-2025-06-23-a-las-17.11.55-2048x1224.png)

### 用户认证

首次部署应用前，请进行身份认证：

1. 在左侧菜单中点击 “Application Collection”
   ![](https://www.suse.com/c/wp-content/uploads/2025/06/Captura-de-pantalla-2025-06-23-a-las-17.12.32-2048x1224.png)
2. 输入用户名和 Access Token，点击 “Save Credentials”
   ![](https://www.suse.com/c/wp-content/uploads/2025/06/Captura-de-pantalla-2025-06-23-a-las-17.13.18-2048x1224.png)

### 安装第一个应用

1. 找到要安装的应用（如 Penpot）
   ![](https://www.suse.com/c/wp-content/uploads/2025/06/Captura-de-pantalla-2025-06-23-a-las-17.13.36-2048x1224.png)
2. 点击“Actions”列中的“INSTALL”按钮
3. 查看并编辑 Helm Chart 参数，点击“INSTALL”
   ![](https://www.suse.com/c/wp-content/uploads/2025/06/Captura-de-pantalla-2025-06-23-a-las-17.14.03-2048x1224.png)
4. 安装完成后，记录所使用的 NodePort 端口号
   ![](https://www.suse.com/c/wp-content/uploads/2025/06/Captura-de-pantalla-2025-06-23-a-las-17.14.10-2048x1224.png)

### 访问应用

- Rancher Desktop 默认会将 Kubernetes 的端口转发至宿主机，因此可通过 `localhost` 直接访问。
- 示例：假设 Workloads 中列出的端口为 32179，访问地址则为 `http://localhost:32179`
  ![](https://www.suse.com/c/wp-content/uploads/2025/06/Screenshot-2025-06-23-at-17.15.40-2048x1221.png)

## 下一步：构建可信的企业应用交付链

通过为企业开发者提供可信的开源应用与工具，企业从源头上强化了**安全供应链（Secure Supply Chain）**，为软件生命周期注入合规与安全保障。

📘 想了解更多 Rancher Desktop 的功能？请访问官方文档站点：https://docs.rancherdesktop.io

🎨 想体验 Penpot 开源设计工具如何打通设计与开发的协作壁垒？请访问：https://penpot.app

🎯 想进一步了解 SUSE Application Collection 如何助力企业开发？欢迎联系 SUSE 销售团队或合作伙伴，获取定制化演示与服务支持。
