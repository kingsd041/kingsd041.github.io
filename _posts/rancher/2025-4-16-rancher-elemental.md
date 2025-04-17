---
layout: post
title: 边缘设备自动上线 + 集群自建，这才是 Kubernetes 的终极玩法！
subtitle: 一站式搞定边缘与裸金属节点的 Kubernetes 自动化部署与集中管理
date: 2025-4-16 11:06:00 +0800
author: Ksd
header-img: img/post-bg-desk.jpg
catalog: true
tags:
  - Elemental
---

在边缘计算快速发展的今天，越来越多的企业希望能像管理云中集群一样，**实现边缘设备的自动上线、统一纳管和集群级自动部署**。但现实往往很骨感：网络环境复杂、设备异构、运维成本高……这些都让边缘集群部署成为一件让人头大的事。

而 **SUSE Rancher 推出的 Rancher Elemental**，正在悄悄改变这一切。它不仅能让边缘节点开机即注册、自动装系统、自动进集群，还能将操作系统镜像像容器镜像一样统一管理，实现真正的 **从“开机”到“Kubernetes 就绪”全自动化流程**。

这篇文章将带你深入了解 Rancher Elemental 的工作原理、核心组件和 UI 实战流程，看看如何用一张 ISO 镜像，让你的边缘设备秒变 Kubernetes 集群节点。

## 什么是 Rancher Elemental？

**Rancher Elemental** 是一个专为边缘和裸金属基础设施设计的 Kubernetes 部署方案，它基于 **SUSE 的轻量级 Linux 发行版 – SLE Micro** 与 **Elemental**，通过整合 Rancher 的集中管理能力，帮助用户快速、自动化地在任意硬件上部署 Kubernetes 节点。

简而言之，Elemental 提供了一套完整的云原生操作系统管理解决方案，不仅可将 Kubernetes 节点的系统镜像管理为 **标准化的 OCI 镜像**（如容器镜像那样便捷），还可以将其快速转换为 **自安装 ISO 或磁盘镜像**，极大简化大规模部署与自动化流程。

它不仅仅是一个安装工具，更是连接边缘设备与云原生管理平台的桥梁，使操作系统、集群注册、GitOps 配置到生命周期管理全部自动化完成。

### 主要特点：

- **零接触部署（Zero-Touch Provisioning, ZTP）**：支持 PXE、iPXE、ISO、USB 启动，自动完成操作系统与节点安装。
- **轻量安全的系统**：只读根文件系统、快照回滚等提升系统可靠性。
- **Rancher 集成管理**：统一纳管 Elemental 节点，支持多集群视图与生命周期管理。
- **GitOps 支持**：结合 Fleet 工具进行集群配置与升级的声明式管理。

## Elemental Stack 核心组件

Rancher Elemental Stack 是在 **SLE Micro** 操作系统之上构建的一组组件，它们协同工作，实现 Kubernetes 节点的系统部署、注册、配置与集中式管理。

主要组件包括：

| 组件名称                 | 功能描述                                                                                                  |
| ------------------------ | --------------------------------------------------------------------------------------------------------- |
| **elemental-toolkit**    | 提供操作系统级工具集，使系统可通过容器方式进行管理。包括 dracut 模块、引导加载器配置、cloud-init 服务等。 |
| **elemental-operator**   | 部署于 Rancher 管理集群，负责处理 Kubernetes 中的 `MachineRegistration` 和 `MachineInventory` CRD 资源。  |
| **elemental-register**   | 在节点启动时运行，将节点注册至 Rancher 管理集群，并通过 `elemental-cli` 执行安装流程。                    |
| **elemental-cli**        | 基于 elemental-toolkit 的安装工具，实现支持 A/B 分区的操作系统安装与升级逻辑。                            |
| **rancher-system-agent** | 安装在节点系统中，接收来自 Rancher Manager 的安装与运行指令（称为 “Plans”），持续对节点进行配置管理。     |

此外，Elemental CLI 支持通过容器镜像的方式构建和管理节点操作系统，可生成自安装 ISO 镜像并在新设备上引导使用。用户可以选择使用 Rancher UI 插件或 CLI 工具在不同设备上安装 Elemental 节点。

通过 Elemental Operator 与 Rancher System Agent 的配合，Rancher Manager 能够**从操作系统安装到 Kubernetes 集群创建**，实现 Elemental 集群的完整生命周期管理。

## 典型使用场景

- 大规模边缘设备自动部署（零售、交通、制造等行业）
- 私有数据中心裸金属节点快速集群化
- 多站点集群的统一纳管与 GitOps 管理
- 安全可控的本地计算节点（支持 TPM、安全启动）

## 如何在 Rancher 中创建 Elemental 集群（基于 UI）

本节将向你展示如何将 Elemental 插件和 operator 部署到现有的 Rancher Manager 实例中。

安装后，你将能够基于 RKE2 或 K3s 配置新的 Elemental 集群。

根据官方文档 [Quickstart UI 指南](https://elemental.docs.rancher.com/quickstart-ui "Quickstart UI 指南")，我们可以通过 Rancher UI 快速创建一个 Elemental 管理的 Kubernetes 集群：

### 前置条件

- 已部署的 Rancher Manager（至少需要 Rancher ≥ 2.9.x）

### Step 1: 添加官方 Rancher 扩展存储库

如果 Elemental 扩展不可用，则需要添加官方 Rancher 扩展存储库：

> Repo 地址：https://github.com/rancher/ui-plugin-charts
> Repo 分支：main

![](https://raw.githubusercontent.com/kingsd041/picture/main/202504170921753.png)

![](https://raw.githubusercontent.com/kingsd041/picture/main/202504170924421.png)

![](https://raw.githubusercontent.com/kingsd041/picture/main/202504170925841.png)

### Step 2: 安装 Elemental 插件

启用 Rancher Manager Extensions 支持后，你可以按如下方式安装 `Elemental` 插件：

- 在 `Available` 选项卡下，你将看到可用的 Elemental 插件:
  ![](https://raw.githubusercontent.com/kingsd041/picture/main/202504170929559.png)

- 单击 `Install` 按钮，将出现一个弹出窗口，再次单击 `Install` 继续:

![](https://raw.githubusercontent.com/kingsd041/picture/main/202504170930702.png)

- 在 `Installed` 选项卡上，现在列出了 `Elemental` 插件:
  ![](https://raw.githubusercontent.com/kingsd041/picture/main/202504170932033.png)

安装 `Elemental` 插件后，你可以在 Rancher Manager 菜单中看到 `OS Management` 选项，如果没有看到，请刷新页面:

![](https://raw.githubusercontent.com/kingsd041/picture/main/202504170935050.png)

### Step 3：安装 Elemental Operator

- 导航到 `OS Management` 点击 `Install Elemental Operator` 按钮，它会将你重定向到 Rancher Marketplace 来安装 operator。

![](https://raw.githubusercontent.com/kingsd041/picture/main/202504170944378.png)

![](https://raw.githubusercontent.com/kingsd041/picture/main/202504170945698.png)

- 点击 `Next`，你可以自定义或使用默认值，单击 `Install` 继续：

![](https://raw.githubusercontent.com/kingsd041/picture/main/202504170947003.png)

你应该看到 `elemental-operator-crds` 和 `elemental-operator` 部署在 `cattle-elemental-system` 命名空间中：

![](https://raw.githubusercontent.com/kingsd041/picture/main/202504171018394.png)

### Step 4: 添加 Machine Registration Endpoint

在 `OS Management` 仪表板中，单击 `Create Registration Endpoint` 按钮:

![](https://raw.githubusercontent.com/kingsd041/picture/main/202504171020864.png)

现在，你可以在相应的位置输入每个详细信息，也可以将其编辑为 YAML 并一次性创建 Endpoint。在这里，我们将通过 YAML 编辑 `machineInventoryLabels` 和 `machineName`。

![](https://raw.githubusercontent.com/kingsd041/picture/main/202504171034840.png)

> 关于 MachineRegistration 的配置说明可参考：[MachineRegistration reference](https://elemental.docs.rancher.com/machineregistration-reference "MachineRegistration reference")

Registration Endpoint 创建成功后状态变为 `active`:

![](https://raw.githubusercontent.com/kingsd041/picture/main/202504171037725.png)

### Step 5: 准备 seed 镜像

现在到了最后一步，你需要准备一个包含初始注册配置的 seed 镜像，它可以自动注册、安装并完全部署为集群的一部分。文件的内容包括节点需要注册的 `Registration URL` 和服务器证书，以便节点能够安全连接 elemental operator。

然后就可以使用这个 seed 镜像来配置和启动多个主机作为 Rancher 集群的节点。

Seed 镜像作为 Kubernetes 资源创建，可以使用 `Build Media` 按钮进行构建。你可以选择用于裸机启动的 iso 镜像，也可以构建在云环境启动的 raw 镜像，本例构建 iso 镜像。

![](https://raw.githubusercontent.com/kingsd041/picture/main/202504171043378.png)

构建完成后，可以使用 `Download Media` 按钮下载构建的 iso 镜像：

![](https://raw.githubusercontent.com/kingsd041/picture/main/202504171046198.png)

现在可以使用此 iso 镜像启动你的节点，它们将：

- 使用 registrationURL 进行注册，并创建每台机器的 MachineInventory
- 将 SLE Micro 安装到给定的设备
- 重启

### Step 6: Machine Inventory

本例采用 pve 启动上面步骤构建出的 iso 镜像。注意，主机需要启动 TPM 2.0，并且使用 UEFI（而不是 BIOS），否则 ISO 将无法启动。

![](https://raw.githubusercontent.com/kingsd041/picture/main/202504171105924.png)

本例使用构建的 iso 通过 pve 启动三台主机。每台主机首次启动时，它们会连接到 Rancher Manager 并为每个节点创建一个 `Machine Inventory`。

![](https://raw.githubusercontent.com/kingsd041/picture/main/202504171233931.png)

Inventory of Machines 页面可以通过点击右侧三个点的菜单来自定义要显示的列，这些标签是在创建 `Machine Registration Endpoint` 时设置的。

![](https://raw.githubusercontent.com/kingsd041/picture/main/202504171251251.png)

注意，后续将主机添加到集群中也是依赖这些标签。

### Step 7: 创建你的第一个 Elemental Cluster

现在让我们使用这些 `Machine Inventory` 通过单击 `Create Elemental Cluster` 来创建集群：

![](https://raw.githubusercontent.com/kingsd041/picture/main/202504171254847.png)

对于你的 Elemental 集群，你可以选择 K3s 或 RKE2：

![](https://raw.githubusercontent.com/kingsd041/picture/main/202504171301074.png)

然而，`Inventory of Machines Selector Template` 部分非常重要，它通过标签来筛选要添加到 Elemental 集群的 `Machine Inventory` 主机。

![](https://raw.githubusercontent.com/kingsd041/picture/main/202504171302929.png)

由于我们的三个主机都包含 `CPUVendor: GenuineIntel` 的标签 ，因此这三台主机将用于创建 Elemental 集群。

完整配置如下：

![](https://raw.githubusercontent.com/kingsd041/picture/main/202504171306455.png)

创建集群后，会匹配设置的 label 来将对应的 `Machine Inventory` 主机添加到集群，我们要做的只是等待集群创建成功即可：

![](https://raw.githubusercontent.com/kingsd041/picture/main/202504171346765.png)

## 除了 UI，还可以使用 CLI 自动化部署

对于希望实现批量部署、CI/CD 集成的用户，Rancher Elemental 也支持完整的 **命令行部署方式**，无需 Rancher UI 操作即可通过简单的几条命令完成集群节点接入。

详细操作步骤可参考文档：[Elemental the command line way](https://elemental.docs.rancher.com/quickstart-cli "Elemental the command line way")

## 总结

随着企业对边缘部署、私有集群和集中运维的需求持续增长，传统的手工装机和节点接入方式已经无法满足敏捷交付与规模化扩展的需求。而 **Rancher Elemental 正是为了解决这一痛点而生**。

它将“操作系统即镜像”的理念引入到边缘集群管理中，借助 Rancher 的集中化能力，实现了真正意义上的：

- 边缘设备开机即注册  
- 零接触自动部署操作系统与 Kubernetes  
- 多节点自动加入集群  
- 与 GitOps、集中策略管理深度融合  

无论你是构建边缘计算平台，还是管理成百上千的私有节点，Elemental 都能带来前所未有的部署体验与运维效率。

**这，或许就是 Kubernetes 在边缘场景的终极形态。**

📚 **推荐阅读：**

- 🌐 官方主页：https://elemental.docs.rancher.com/
- 🚀 快速入门（UI）：https://elemental.docs.rancher.com/quickstart-ui
- 🧰 CLI 部署指南：https://elemental.docs.rancher.com/quickstart-cli
- 📦 GitHub 项目地址：https://github.com/rancher/elemental
