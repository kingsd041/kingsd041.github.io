---
layout: post
title: Minikube vs K3s：对于 DevOps 和开发人员的优缺点
subtitle: 了解 Minikube 和 K3s 在本地 Kubernetes 开发和 DevOps 中的区别，并探索哪一个更适合开发。
date: 2025-1-19 11:06:00 +0800
author: Ksd
header-img: img/post-bg-desk.jpg
catalog: true
tags:
  - K3s
---

![](https://raw.githubusercontent.com/kingsd041/picture/main/202501211635159.png)

Kubernetes 是开发人员和 DevOps 专业人士的必备技能。作为高可用容器运行的首选方案，许多开发人员和 DevOps 团队通常会从设置一个本地 Kubernetes 集群开始开发工作。在本地开发、家庭实验室以及小型环境中，有两种广受欢迎的 Kubernetes 发行版：Minikube 和 K3s。本文将对比 Minikube 和 K3s，分析它们的优缺点。

## 本地 Kubernetes 集群开发环境

许多人使用本地 Kubernetes 集群环境来开发和测试他们的代码，然后再将更改提交到暂存或生产基础架构。本地 Kubernetes 开发是测试代码的理想方式，能够在进入生产或生产测试环境之前验证容器化应用的运行效果。它允许开发人员和 DevOps 使用与生产环境相同的基础设施运行容器化应用，而不是仅在主机系统的单个 Docker 容器中运行。

通过 Kubernetes，开发人员可以在本地设置中测试和确保容器化应用正常工作，然后将其部署到生产环境。这种方法可以有效管理 Kubernetes 集群，确保从开发到生产的平滑过渡。

## 什么是本地 Kubernetes 开发环境？

本地开发环境是指 Kubernetes 集群运行在单台机器上，通常是开发人员或 DevOps 工程师的工作站。这也可以包括使用虚拟化工具（如 Hyper-V、VirtualBox 或 VMware Workstation）在虚拟机中运行的 Kubernetes 集群。Windows 工作站上的开发人员甚至可以通过 Windows Subsystem for Linux（WSL）来设置本地 Kubernetes 集群。

本地 Kubernetes 环境提供对节点的完全控制，允许你在不影响生产系统的情况下进行实验和更改。它非常适合开发、测试和配置 CI/CD 流水线，是一个安全且隔离的环境。

## 什么是 Minikube？

Minikube 是一个非常流行的本地 Kubernetes 单节点集群环境。它为你提供了快速上手 Kubernetes 的好方法。Minikube 轻量级且包含运行单节点 Kubernetes 集群所需的一切。

![](https://raw.githubusercontent.com/kingsd041/picture/main/202501211635712.png)

开发人员通常不需要一个包含多个节点的完整 Kubernetes 集群，只需一个单节点即可满足开发需求。Minikube 可以轻松地在虚拟机、容器或裸机安装中启动 Kubernetes 集群，无需手动安装所有组件。

Minikube 支持多种操作系统，包括 Windows、macOS 和 Linux，同时支持 Docker 和 CRI-O 等不同的容器运行时。它让开发人员可以快速搭建本地开发环境，避免“从零开始”设置的复杂性。

## 什么是 K3s？

K3s 是一个轻量级的 Kubernetes 发行版，专为资源有限的主机设计，例如边缘环境或开发环境。它非常适合边缘设备、物联网设备，甚至家庭实验室。

K3s 由 Rancher Labs 开发，也是 Rancher Desktop 的底层 Kubernetes 发行版。K3s 的一个显著特点是其简洁性。它是一个小于 100MB 的单一二进制文件，非常适合资源受限的环境。

![](https://raw.githubusercontent.com/kingsd041/picture/main/202501211636628.png)

尽管 K3s 的体积很小，但它包含了完整 Kubernetes 的核心功能，包括网络、存储和安全性。借助 K3sup、Autok3s 和 KubeVIP 等项目，你可以更轻松地构建 Kubernetes 集群。此外，K3s 既可用于开发，也可用于生产环境，可运行在多节点集群中或边缘设备上。

相比之下，K3s 是一个既适用于开发又适用于生产的发行版，而 Minikube 仅适用于开发。

## Minikube 的安装

以下是通过 WSL 在开发工作站上安装 Minikube 的简单步骤：

```bash
sudo apt install -y curl wget apt-transport-https && \
curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64 && \
sudo install minikube-linux-amd64 /usr/local/bin/minikube
```

![](https://raw.githubusercontent.com/kingsd041/picture/main/202501211708693.png)

安装完成后，你可以使用以下命令启动 Minikube 集群，前提是你已安装虚拟化引擎（如 Docker 驱动）：

```bash
minikube start --driver=docker
```

![](https://raw.githubusercontent.com/kingsd041/picture/main/202501211708943.png)

## K3s 的安装

以下是安装 K3s 的简单步骤：

```bash
curl -sfL https://get.k3s.io | sh -
```

你现在可以查看你的 kubectl 配置：

```bash
kubectl config view
```

![](https://raw.githubusercontent.com/kingsd041/picture/main/202501211709983.png)

也可以看到 Kubernetes 版本和节点信息：

![](https://raw.githubusercontent.com/kingsd041/picture/main/202501211711199.png)

## Minikube 与 K3s：优缺点对比

##### 1. Kubernetes 功能与支持

Minikube 支持几乎所有的 Kubernetes 功能，包括滚动更新和自愈能力。此外，它还可以通过简单命令快速启动 Kubernetes 仪表盘或启用 Ingress 控制器。但 Minikube 仅适用于单节点开发环境，不支持多节点配置。

K3s 提供完整的 Kubernetes 集群体验，支持网络、存储等多个功能领域，可用于开发和生产。借助 KubeVIP 等项目，你可以在 K3s 集群中实现负载均衡和其他功能。

##### 2. 性能

相比 Minikube，K3s 更加轻量级，资源占用更少。K3s 是一个不到 100MB 的单一二进制文件，非常适合资源受限的硬件环境。

##### 3. 开发体验

Minikube 提供多种工具和插件，适合开发和 DevOps 工程师使用。而 K3s 也非常简单直观，但可能不如 Minikube 直接面向开发环境。

##### 4. 安全与网络

作为生产级 Kubernetes 发行版，K3s 提供更多安全功能，如网络策略和 Secrets 管理。两者均支持多种网络选项，包括 Custom CNI(Canal/Calico/Cilium)。

##### 5. 社区支持

Minikube 和 K3s 都拥有活跃的用户社区和丰富的文档支持，用户可以轻松找到所需的帮助资源。

## 选择 Minikube 和 K3s 的最佳 Kubernetes 方案

如果你需要本地运行 Kubernetes，用于测试环境或家庭实验室，无论是 Minikube 还是 K3s，都是不错的选择。这两个 Kubernetes 发行版都非常优秀，可以满足学习、开发、测试等多种本地集群场景需求。

如果你希望使用既适合开发又能用于生产环境的 Kubernetes，那么 K3s 无疑是两者中更好的选择。作为一个轻量级的 Kubernetes，K3s 不仅适用于生产环境，还支持边缘设备、物联网设备等多种应用场景。

以下是基于文章内容和额外考量的详细对比表格，帮助你更直观地了解 Minikube 和 K3s 的差异：

以下是整理成 Markdown 格式并翻译后的内容：

| 功能            | Minikube                                            | K3s                                                               |
| --------------- | --------------------------------------------------- | ----------------------------------------------------------------- |
| 目标            | 用于单节点本地 Kubernetes 开发环境                  | 用于开发、生产、边缘、物联网以及家庭实验室的轻量级 Kubernetes     |
| 应用环境        | 主要用于本地开发和测试                              | 可用于本地开发、生产环境以及多节点集群                            |
| 安装            | 需要虚拟化（如 Docker、Hyper-V、VirtualBox）        | 单一二进制文件（<100 MB）                                         |
| 支持平台        | 支持 Windows、macOS 和 Linux                        | 支持基于 Linux 的系统，也可在 Rancher Desktop（支持 Mac（Intel 和 Apple Silicon）、Windows 和 Linux） 或独立环境中运行    |
| 资源效率        | 占用资源较多，运行负载较重                          | 轻量级，适合资源受限的环境（如物联网或边缘环境）                  |
| Kubernetes 功能 | 完整 Kubernetes 功能集，适用于单节点集群            | 完整 Kubernetes 功能集，支持多节点和边缘集群                      |
| 生产环境适配性  | 不支持生产环境，仅适用于开发                        | 生产级 Kubernetes，支持边缘集群和轻量级生产部署                   |
| 网络功能        | 简单的网络设置，易于添加 Ingress 控制器             | 支持高级网络功能，包括 Custom CNI(Canal/Calico/Cilium) 和生产级网络策略               |
| 存储选项        | 支持本地存储                                        | 支持本地存储和分布式存储（如 Longhorn）                           |
| 社区支持        | 活跃的社区，提供良好的文档支持                      | 活跃的社区，拥有 Rancher Labs 的企业支持                          |
| 易用性          | 适合初学者，提供简单易学的命令和工具                | 使用简单，一条命令就可以完成安装                                  |
| 应用场景        | 开发、测试以及学习 Kubernetes 基础知识              | 开发、生产、物联网、边缘计算和家庭实验室                          |
| 集群类型        | 仅支持单节点集群                                    | 支持多节点和单节点集群                                            |
| 自定义能力      | 易于通过插件和命令进行自定义（如启用 Ingress 插件） | 支持使用 KubeVIP、Autok3s 和 K3sup 等工具进行高级网络和自动化设置 |
| 安全功能        | 提供适用于开发目的的基础安全功能                    | 提供生产级高级安全功能，包括 Secrets 管理                         |

## 总结：Minikube 与 K3s

构建本地 Kubernetes 开发集群是开发人员和 DevOps 工程师测试更改和配置的理想方式，能够在不影响生产环境的情况下验证工作。本地集群同样适用于家庭实验室，便于在自己的硬件上进行学习和实验。

在对比 Minikube 和 K3s 时，两者各有优缺点。选择哪一个更适合你的使用场景，可以从资源需求、功能支持和社区支持等因素进行考虑。
