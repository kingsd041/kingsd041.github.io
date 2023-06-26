---
layout: post
title: Rancher Desktop：开发者的终极本地 Kubernetes 解决方案
subtitle:
date: 2023-6-25 11:07:00 +0800
author: Ksd
header-img: img/post-bg-rancher-k8s.png
catalog: true
tags:
  - Rancher
  - Rancher Desktop
---

## Kubernetes 在现代软件开发中的关键角色

Kubernetes 在现代软件开发中起着重要的作用，因为它是一个功能强大的开源容器编排平台，使组织能够大规模部署和管理复杂的容器化应用程序。

在本文中，我们将介绍 Rancher Desktop 如何帮助开发者在本地运行和管理 Kubernetes。

## 简化的 Kubernetes：由开发人员为开发人员打造

作为开发者，我们的主要目标是创建尽可能快速有效地适应变化的软件，来确保它能够满足现实世界中不断增长的需求或趋势。Kubernetes 提供的是最佳的应用程序托管平台，可以容器化应用程序，使它们能够在各种平台上轻松移植，并通过扩展来优化软件性能。

这可以通过缩小开发、测试和生产环境之间的差距来加速开发和部署过程。因此，我们的应用程序变得更加稳定、健壮并适合生产使用。说了这么多，现在你想知道，“如何开始你的 Kubernetes 体验之旅？” 这就是 Rancher Desktop 发挥作用的地方。Rancher Desktop 是由开发者为开发者创建的，帮助转变你对 Kubernetes 的看法。

## 开发者的突出特点

Rancher Desktop 是一款帮助开发者构建云原生应用程序的工具。借助其图形用户界面(GUI)和强大的命令行界面(rdctl)，你可以轻松在本地计算机上运行 Kubernetes，并以最快、最便捷的方式在任务之间切换。不再需要等待 IT 为你提供所需的 Kubernetes 环境，也不必处理公有云账户，因为你可以在自己的笔记本电脑或工作站上轻松掌握所有内容。

Rancher Desktop 的关键功能之一是：它能够让你自由的安装和选择所需的 Kubernetes 版本，或者映射出目前正在使用的版本，以测试你的应用程序在不同版本变化中的响应。

例如，Rancher Desktop 1.8 可以让你仅单击一次即可跳转到 1.16 到 1.27 之间的任何 Kubernetes 版本，因此你可以轻松地来回切换进行测试或故障排查。

![](https://www.suse.com/c/wp-content/uploads/2023/05/rancher-desktop-kubernetes-versions-configuration-1.png)

轻松在不同的 Kubernetes 版本之间进行切换以进行测试和故障排查。

## 打包核心容器工具链

Rancher Desktop 围绕着最酷、最轻量级的 Kubernetes 发行版（k3s）构建，使你能够快速启动自己的开发环境。

支持 dockerd 和 containerd，并提供了对它们各自的 docker 和 nerdctl 命令行工具的支持。通过选择首选的容器引擎，开发者可以在两者之间切换。这使得 Rancher Desktop 非常方便和实用。

对于 Kubernetes 管理和应用程序安装，你还可以使用 CLI，因为 Rancher Desktop 还安装了 kubectl 和 Helm。

开发者不仅可以使用提供的工具链轻松添加、构建和管理镜像，Rancher Desktop 还具有集成的容器安全扫描器，可以在开发过程的早期尽早检测到容器的漏洞和配置问题。

![](https://www.suse.com/c/wp-content/uploads/2023/05/rancher-desktop-image-security-scanning-1.png)

Rancher Desktop 全面支持容器镜像的安全扫描。

## 工作负载和集群管理仪表板

Rancher Desktop 还配备了一个仪表板，你可以在其中可视化并跟踪本地 Kubernetes 集群中的所有资源，就像在 Rancher Prime 的企业版中一样。Rancher Desktop 的用户界面帮助开发者掌控和管理工作负载的资源，如内存、容量等。

![](https://www.suse.com/c/wp-content/uploads/2023/05/rancher-desktop-dashboard-1.png)

全功能仪表板用于管理 Kubernetes 对象和工作负载。

## 配置诊断和故障排查

Rancher Desktop 配备了一个包含所有 Rancher Desktop 日志文件的文件夹，以及故障排查和诊断功能，帮助识别常见问题的原因和可能的解决方案。开发者还可以管理端口转发，以便能够访问本地 Kubernetes 集群中创建的 service 和 ingresse。

![](https://www.suse.com/c/wp-content/uploads/2023/05/port-forwarding-rancher-desktop.png)

通过端口转发，方便访问你的 Kubernetes service 和 ingresse。

## 100% 兼容且 100% 开源

Rancher Desktop 的伟大之处在于它的多功能性，可以适应任何操作系统、IDE、容器运行时和 Kubernetes 版本，但这个列表并不止于此。从 Rancher Desktop 1.9 版本开始，它将开始支持 Docker 扩展，因此你可以通过几次点击来根据自己的需求调整和扩展开发环境，并重复使用广泛的扩展目录。最重要的是，Rancher Desktop 是 100% 开源的，并且完全免费！

Rancher Desktop 是推进你作为开发者职业发展的理想工具，可无缝过渡到使用 Kubernetes 和微服务应用程序。
