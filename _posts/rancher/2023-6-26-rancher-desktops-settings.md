---
layout: post
title: 深入了解 Rancher Desktop 设置
subtitle:
date: 2023-6-26 11:07:00 +0800
author: Ksd
header-img: img/post-bg-rancher-k8s.png
catalog: true
tags:
  - Rancher
  - Rancher Desktop
---

## Rancher Desktop 设置的全面概述

Rancher Desktop 具备方便且强大的功能，使其成为最佳的开发者工具之一，也是在本地构建和部署 Kubernetes 的最快捷方式。

在本文中，我们将介绍 Rancher Desktop 的功能和特性以及 Rancher Desktop 作为容器管理平台和本地运行 Kubernetes 的所有优势。

## Rancher Desktop 仪表板

Rancher Desktop 的仪表板是一个非常简单易用的图形用户界面，它提供了可用于处理 Kubernetes 集群的开发者工具。以下是一些特性和功能：

- **可视化**展示所有 node 和 deployment。
- 创建、配置和**监控本地 k8s 集群和资源**统计信息。
- **命名空间管理、项目管理**。
- **工作负载管理**，开发者可以执行健康检查、监控资源消耗、控制安全性，甚至为工作负载添加更多存储空间。
- **Pod 管理**，例如扩展策略、网络和 Pod 调度等。
- **Helm Chart 应用程序目录**，使开发者可以更方便地在 Kubernetes 上安装应用程序。

如果你想访问仪表板，只需点击任务栏系统托盘中的 Rancher Desktop 仪表板选项即可。

![](https://www.suse.com/c/wp-content/uploads/2023/05/rancher-desktop-dashboard-2.png)

## 与社区保持联系

如有任何问题或者开发者希望讨论问题并与其他人分享解决方案，你可以访问 Rancher Desktop 的 Slack 频道和我们的 GitHub 主页(https://github.com/rancher-sandbox/rancher-desktop)。此外，我们希望不断改进 Rancher Desktop，因此我们鼓励你在此选项卡中启用统计信息收集功能。

![](https://www.suse.com/c/wp-content/uploads/2023/05/rancher-desktop-general.png)

## Kubernetes 端口转发

**通过端口转发**，开发者可以使用本地网络上不冲突的端口**轻松访问在本地 Kubernetes 集群中定义的服务**。

![](https://www.suse.com/c/wp-content/uploads/2023/05/rancher-desktop-port-forwarding-2.png)

## 构建和扫描容器镜像检测漏洞

开发者必须保证他们使用或构建的容器镜像在被推送到本地开发环境以外之前，经过充分的测试并彻底检查是否存在任何安全威胁、错误配置和漏洞。使用 Rancher Desktop 你不仅可以构建、拉取和推送镜像，还可以在本地机器上扫描镜像，以确保它们都经过安全扫描。所有这些操作只需按下一个按钮即可完成。

![](https://www.suse.com/c/wp-content/uploads/2023/05/rancher-desktop-images.png)

## 诊断和故障排查

了解本地集群和 Rancher Desktop 本身发生的情况是非常重要的。你可以**通过"诊断和故障排查"选项卡访问所有日志文件、错误配置或任何应用程序问题**。这些开发者工具将为你提供跟踪和调试环境所需的所有信息。

此外，你还可以选择**启用重置 Kubernetes 为初始状态的选项**，或者**恢复 Rancher Desktop 为默认设置**，以删除所有配置和工作负载。

通过使用这些诊断和故障排查功能，开发者可以有效地追踪和调试环境，解决问题，并确保 Kubernetes 环境和 Rancher Desktop 的正常运行。

![](https://www.suse.com/c/wp-content/uploads/2023/05/rancher-desktop-diagnostics.png)

![](https://www.suse.com/c/wp-content/uploads/2023/05/rancher-desktop-troubleshooting.png)

## 安装扩展

开发者可以根据自己的需求自定义他们的环境，通过安装扩展来增加功能。这是 Rancher Desktop 提供的最新功能之一。在扩展选项卡中，你可以从我们广泛的扩展目录中选择经过测试和验证的扩展。从 Rancher Desktop 1.9 版本开始，还将支持 Docker 扩展。


![](https://www.suse.com/c/wp-content/uploads/2023/05/rancher-desktop-extensions.png)

## 首选项/设置

除了上述提到的功能外，在“首选项”部分还可以根据你的需求配置以下设置：

- 启用或禁用来自 **Rancher Desktop 的自动更新，并收集匿名统计信息**。
- 在**登录时自动启动** Rancher Desktop 中的所有容器和 Kubernetes。

![](https://www.suse.com/c/wp-content/uploads/2023/05/rancher-desktop-preferences-application.png)

如果你使用的是 Windows 操作系统，Rancher Desktop 将提供一项配置，将 Rancher Desktop 的 Kubernetes 配置暴露给 Windows Subsystem for Linux（WSL）发行版，以便你可以使用诸如 kubectl 之类的命令与 Kubernetes 进行通信。

![](https://www.suse.com/c/wp-content/uploads/2023/05/rancher-desktop-preferences-wsl.png)

- 在 macOS 和 Linux 系统上，你可以配置本地集群的虚拟机 **CPU 和内存**资源。

- 禁用 Kubernetes 以减少计算机上的**资源消耗，并将 Rancher Desktop 只用作容器管理平台**。

- 选择和**修改 Kubernetes 版本**以测试不同的配置和应用程序。

- **启用或禁用 Traefik 作为 ingress 和负载均衡器**。

- 更改默认的 Kubernetes API 端口。
  ![](https://www.suse.com/c/wp-content/uploads/2023/05/rancher-desktop-preferences-kubernetes.png)

- 在首选项部分，你**可以轻松地在容器引擎之间进行切换**，包括 dockerd（Moby）和 containerd。dockerd 支持 Docker API 和 Docker CLI 的使用，而 containerd 为容器提供了命名空间，并支持使用 nerdctl。你可以根据需要选择适合你工作流程的容器引擎。

![](https://www.suse.com/c/wp-content/uploads/2023/05/rancher-desktop-preferences-container-engine.png)

## 总结

Rancher Desktop 是一个出色且适合开发者的应用程序，拥有丰富的特性和功能。无论你使用的是 Linux、Mac 还是 Windows 操作系统，安装都非常简单。正如你在这里所看到的，你有很多选项可以根据自己的需求进行适应。开发者可以通过简单的操作将 Kubernetes 在本地运行，并管理他们的所有工作负载、集群和资源。
