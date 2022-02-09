---
layout: post
title: 一文带你入门 Rancher Desktop
subtitle:
date: 2022-2-8 21:07:00 +0800
author: Ksd
header-img: img/post-bg-desk.jpg
catalog: true
tags:
  - Rancher
---

## 什么是 Rancher Desktop

Rancher Desktop 是一款在桌面上提供容器和 Kubernetes 管理的应用。它适用于 Mac（包括 Intel 和 Apple 芯片）、Windows 和 Linux，允许在工作站本地运行 Kubernetes 和容器管理。

它提供了许多很棒的功能，例如允许你选择在本地运行的 Kubernetes 版本，使用 containerd 或 Moby（即 dockerd）构建、推送和运行容器镜像。而且，你不需先将镜像推送到镜像仓库就可以构建和运行这些镜像。

## Rancher Desktop 架构

Rancher Desktop 基于 Electron 实现跨平台用户界面，封装了 nerdctl、kubectl、Helm、Docker CLI 等工具。在 MacOS 和 Linux 上，Rancher Desktop 利用虚拟机运行 containerd 或 dockerd 和 Kubernetes。在 Windows 中使用的是 Windows Subsystem for Linux 2 (WSL2)。

Rancher Desktop 使用专门的 Rancher K3s 发行版。K3s 是一个 CNCF 沙盒项目，它提供了一个轻量级的 Kubernetes 发行版，主要适用于边缘计算、物联网等场景。K3s 安装简单且非常轻量。不仅适用于生产环境，而且还可以作为本地开发平台在 Rancher Desktop 内运行。

![rancher desktop](https://rancherdesktop.io/images/how-it-works-rancher-desktop.svg)

你所需要做的就是下载并运行 Rancher Desktop。

## Rancher Desktop 安装和配置

> 撰写本文时，Rancher Desktop 最新版为 1.0.1

#### 下载 Rancher Desktop

从 [Github release](https://github.com/rancher-sandbox/rancher-desktop/releases) 页面下载适用你系统的 Rancher Desktop：

![](https://tva1.sinaimg.cn/large/008i3skNly1gz6ek75sq5j31d00qk44r.jpg)

#### 在 Mac 上安装 Rancher Desktop

由于我的电脑是 Mac，我将下载并安装 Rancher Desktop 1.0.1 的 Mac 版本。从上面的截图中可以看出，安装包很小，只有 339 MB。下载 Rancher Desktop 后，只需运行 `Rancher.Desktop-1.0.1.x86_64.dmg` 并按照提示将 `Rancher Desktop` 移动到 `Applications` 中即可完成安装。

![](https://tva1.sinaimg.cn/large/008i3skNly1gz6esp5ht7j30u20l2aaq.jpg)

> 更多安装方式请参考[官网](http://docs.rancher.cn/docs/rancherdesktop/installation/_index)

#### 配置 Rancher Desktop Kubernetes

- 打开 Rancher Desktop 后，会自动配置和启动 Kubernetes 集群：
  ![](https://tva1.sinaimg.cn/large/008i3skNly1gz6ew5jqlvj31b60u00wa.jpg)

- 从 `Kubernetes Settings` 选项卡中可以看到 Kubernetes 的默认参数配置：
  ![](https://tva1.sinaimg.cn/large/008i3skNly1gz6f60nwmfj31bc0u0jur.jpg)

- 几分钟后，会完成 Rancher Desktop 加载：
  ![](https://tva1.sinaimg.cn/large/008i3skNly1gz6fjj28e4j31b20u0jue.jpg)

此时，你已经完成了 Rancher Desktop 的安装和配置。并且你已经在本地启动了一个可以用来操作的 Kubernetes 集群。

- `General` 选项卡提供有关项目状态的一般信息，以及讨论项目、报告问题或了解有关项目的更多信息的链接。
  ![](https://tva1.sinaimg.cn/large/008i3skNly1gz6g1n0sxuj31b00u0jus.jpg)

- 在 `Kubernetes Settings` 选项卡上，你可以管理虚拟机的设置，比如：Kubernetes 版本、Container Runtime（容器运行时）、内存、CPU 等。你也可以通过 `Reset Kubernetes/Reset Kubernetes and Container Images` 来重置 Kubernetes 集群。
  ![](https://tva1.sinaimg.cn/large/008i3skNly1gz6g57zmiyj31b00u0tbs.jpg)

- 在 `Supporting Utilities` 选项卡上，你可以创建指向 `/usr/local/bin` 中工具的符号链接。默认情况下，如果本地不存在该工具，就会创建一个符号链接。
  ![](https://tva1.sinaimg.cn/large/008i3skNly1gz6g7vu320j31b00u0jtl.jpg)

- `Images` 选项卡允许你管理虚拟机上的镜像，包括拉取和构建镜像。
  ![](https://tva1.sinaimg.cn/large/008i3skNly1gz6g9d0m6aj31b00u0gp4.jpg)

- `Troubleshooting` 选项卡可以查看日志，如果遇到问题，还可以将环境重置为出厂配置。
  ![](https://tva1.sinaimg.cn/large/008i3skNly1gz6gcq4g95j31b00u0412.jpg)

> 注意：  
> Windows、Linux 和 Mac 版的 Rancher Desktop 支持的选项可能有所不同，更多支持的选项说明请参考[官网](https://docs.rancher.cn/docs/rancherdesktop/features-guide/preferences/_index)

## 使用 nerdctl 命令行工具

Nerdctl 是一个与 Docker CLI 风格兼容的 containerd CLI 工具，使用体验和 Docker 基本一致，例如 `docker run`、`docker pull` 和 `docker logs`。Nerdctl 基本涵盖了 Docker CLI 的所有功能，同时，它还实现了很多 Docker 中不具备的功能，比如：延迟拉取镜像（lazy-pulling）、镜像加密（imgcrypt）等。

Rancher Desktop 启动 Kubernetes 集群后，会自动在你的工作站中安装 nerdctl。所以你可以直接通过 nerdctl 来操作你的集群：
![](https://tva1.sinaimg.cn/large/008i3skNly1gz72g1s7u0j318707ndix.jpg)

## 使用 Kubectl 连接 Rancher Desktop Kubernetes

现在，我们可以使用 Kubectl 连接到 Rancher Desktop Kubernetes 集群。但首先需要确保你的 kubectl context 设置为 `Rancher Desktop Kubernetes` 集群。你可以通过 `Kubernetes Contexts` 来查看或切换当前的 context：
![](https://tva1.sinaimg.cn/large/008i3skNly1gz72u7wme2j30kc08amy8.jpg)

当然，你也可以通过 `kubectl config get-contexts` 来查看：
![](https://tva1.sinaimg.cn/large/008i3skNly1gz72wyii2mj30l602c3yp.jpg)

最后，就可以使用普通的 kubectl 命令查看 pod 和节点：
![](https://tva1.sinaimg.cn/large/008i3skNly1gz72xx1xtxj30pf07m0ub.jpg)

## 仪表盘

Rancher Desktop 1.0.1 没有提供用于管理 Kubernetes 集群的仪表盘。默认情况下，你只能通过 kubectl、helm、nerdctl 管理 Rancher Desktop 创建的 Kubernetes 集群。

如果你想通过一个简洁的仪表盘来管理 Rancher Desktop 创建的 Kubernetes 集群，你可以使用 [Kube-explorer](https://github.com/cnrancher/kube-explorer)。

Kube-explorer 是 Kubernetes 的可移植资源管理器，没有任何依赖关系。它集成了 Rancher steve 框架及其仪表板，并经过重新编译、打包、压缩，并提供了一个几乎完全无状态的 Kubernetes 资源管理器。

要安装 kube-explorer，请从 [kube-explorer release](https://github.com/cnrancher/kube-explorer/releases) 页面下载二进制文件。

运行 HTTP 的 Server：

```
./kube-explorer --http-listen-port=9898 --https-listen-port=0
```

然后，打开浏览器访问 http://x.x.x.x:9898 ，接下来你就可以通过一个非常简洁的仪表盘来管理你的 Kubernetes 集群了。
![](https://tva1.sinaimg.cn/large/008i3skNly1gz733pwaucj322c0u00w4.jpg)

> 注意： 如果你在 Windows 上安装 Rancher Desktop，你可以使用 kubectl 方式来安装 kube-explorer。

## 社区常见问题

#### 问：Rancher Desktop 支持中文么？

目前 Rancher Desktop 还不支持中文，但 Rancher Desktop 的中文文档已经上线，大家可以访问 http://docs.rancher.cn/rancherdesktop/ 来查阅相关资料。

#### 问：Rancher Desktop 是 Rancher 的桌面版本吗？

不是，Rancher Desktop 不是桌面上的 Rancher。安装 Rancher Desktop 并不安装 Rancher，但你可以将 Rancher 作为一个工作负载来安装。

Rancher Desktop 类似于 minikube、kind 或 Docker Desktop 等应用，其目标是拥有一个易于设置的本地 Kubernetes 环境来管理容器。

#### 与 Docker Desktop 相比如何？Rancher Desktop 是不是要取代 Docker Desktop？

当我们开始开发 Rancher Desktop 时，我们的目标并不是要创建一个替代 Docker Desktop 的产品。相反，我们专注于改善本地运行 Kubernetes 的体验，而 Docker Desktop 专注于容器化应用程序。而且，Docker 多年来一直致力于 Docker Desktop，使其在容器化应用程序方面表现出色。

随着我们向 Rancher Desktop 中添加构建、推送和拉取镜像并运行容器等功能。Rancher Desktop 在功能方面开始与 Docker Desktop 重叠。

## 后记

Rancher Desktop 是一个很好的解决方案，可以轻松地在本地工作站上建立本地 Kubernetes 环境，而且非常轻量（内置 K3s），非常适用于开发、学习和其他目的。使用 Rancher Desktop 运行 Kubernetes 的过程也非常简单，并且提供了其他开发环境所没有的功能，例如：任意切换 Kubernetes 版本来配置环境；切换你喜欢的容器运行时等。

Rancher Desktop 1.0.1 还不支持离线安装，对应的配置选项也不是特别丰富，需要手动安装仪表盘等。后续版本会支持离线安装，并且也会把 Rancher Dashboard 集成进来，同时也会支持更多你需要的高级配置选项。

用一句最近比较火的一句话结束本篇分享：你永远可以相信 Rancher Team!
