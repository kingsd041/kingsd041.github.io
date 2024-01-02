---
layout: post
title: 容器奇谈：探秘 K3s 前世今生，轻舟启航的轻量级 Kubernetes
subtitle: 探寻K3s前世今生：在容器奇谈中轻盈启航，演绎轻量级 Kubernetes 的崭新篇章
date: 2023-12-5 11:06:00 +0800
author: Ksd
header-img: img/post-bg-desk.jpg
catalog: true
tags:
  - K3s
  - MetalLB
---

全球企业的发展都受到对可扩展和可靠服务的需求驱动。Kubernetes 起源于谷歌内部多年来使用的名为 Borg 的系统，直到谷歌将 Borg 与公众分享。凭借谷歌在运行大规模数据中心以快速响应搜索查询方面的近乎神话般的历史，Kubernetes 几乎没花多少时间就将自己打造成每个人都想使用的解决方案。

Kubernetes 被设计成能够容纳大型配置并具有可扩展性和弹性。但是，原始的 Kubernetes 庞大、复杂、难以管理，并且具有陡峭的学习曲线。几乎在它发布后，人们就开始改变他们的应用程序以适应 Kubernetes 的限制，而不是使用 Kubernetes 作为具有特定用途的工具。

未使用的资源会导致安装时间延长、攻击面增大以及额外的复杂性。构建容器的最佳实践规定，容器应该只包含执行其功能所需的资源，那么容器编排器为什么要有所不同呢？通过摆脱不必要的组件，K3s 成功解决了许多开发者在标准 Kubernetes 中面临的问题。

## K3s 是什么？

[K3s](https://k3s.io/) 是由 Rancher Labs 创建的轻量级 Kubernetes 发行版，完全获得了云原生计算基金会（Cloud Native Computing Foundation，CNCF）的认证。K3s 具有高可用性并且生产可用。它的二进制文件非常小，资源需求非常低。

简而言之，K3s 是剥离了臃肿部分并支持不同后端数据存储的 Kubernetes。需要注意的是，K3s 并不是一个分叉，因为它没有更改任何核心 Kubernetes 功能，并且仍然接近原生 Kubernetes。

### K3s 的诞生

在构建 [Rio](https://rio.io/ "Rio")（现已不再活跃）时，Rancher Labs（现已成为 SUSE 的一部分）的 Darren Shepherd 发现每次测试运行都需要花费很长时间才能启动一个新的 Kubernetes 集群，这让他感到沮丧。他知道，如果能更快地上线集群，他就能更快地编码，而如果能更快地编码，就能更快地发布功能。

Rancher 已经有了 Rancher Kubernetes Engine（RKE），因此 Darren 对 Kubernetes 源代码非常熟悉。他开始分析源代码，去除所有在他的环境中运行工作负载所必需之外的冗余内容。这包括所有的 out-of-tree 和 alpha 资源、存储驱动程序以及将 etcd 作为后端数据存储的要求。

他创建了一个单一的二进制解决方案，其中包括 containerd、网络堆栈、控制平面（master）和工作节点（agent）组件、SQLite 替代 etcd、负载均衡器、用于本地存储的存储类，以及拉取和安装其他核心组件（如 CoreDNS 和 [Traefik Proxy](https://github.com/traefik/traefik) 作为[入口控制器](https://traefik.io/glossary/kubernetes-ingress-and-ingress-controller-101/）)的清单。

结果得到了一个不到 50MB 的 Kubernetes 发行版，它可以在不到 512MB 的 RAM 中运行整个 Kubernetes。这使得 Kubernetes 能够在资源受限的环境中运行，例如物联网（IoT）和边缘计算。这是第一次有人可以在只有 1GB RAM 的系统上运行 Kubernetes，而仍然有足够的内存来处理工作负载。

Rancher K3s 应运而生，当时谁也没有想到它会如此受欢迎。

### K3s 与 CNCF

云原生计算基金会（CNCF）是管理 Kubernetes 和许多其他开源项目的管理机构。他们将 Kubernetes 发行版认证为符合标准，这意味着在一个经过认证的发行版中运行的工作负载将在另一个经过认证的发行版中运行。

通过 CNCF 的认证，K3s 可以安装在风力发电场、卫星、飞机、车辆和船舶等环境中。政府机构对在离线环境中使用 K3s 的兴趣逐渐增加，以及在有限攻击面的环境中使用 K3s 也非常适合。

Rancher 意识到最初是一个内部项目，范围有限。后来 Rancher 将 K3s 捐赠给了 CNCF。Rancher K3s 将其名称缩写为 K3s，它是 CNCF 领域中唯一由 CNCF 拥有的 Kubernetes 发行版。

### K3s 的名称含义是什么？

K8s 来自 “Kubernetes”，在 K 和 S 之间有八个字母。这种缩写形式来自于国际化（internationalization）的一套编程库，”internationalization“ 变成了“i18n”，Kubernetes 也因此变成了“K8s”。

Rancher 希望 K3s 内存占用大小只有 Kubernetes 的一半，像 Kubernetes 一半大的东西就是一个 5 个字母的单词，如果按照相同的缩写方式，就简称为 K3s。K3s 既没有长名称，也没有官方发音。

## K3s 的优点

K3s 是一个单一的二进制文件，易于安装和配置，并解决了标准 Kubernetes 中引入的一些痛点。

简而言之：

- **小巧轻便**：K3s 小于 100MB，可能是它最大的优势。
- **轻量级**：包含非容器化组件的二进制文件比 K8s 小。
- **快速部署**：你可以使用单个命令安装和部署 K3s，整个过程不到 30 秒。
- **简化**：得益于独立的单个二进制包。
- **支持持续集成所需的自动化**：K3s 帮助你将多个代码贡献自动集成到单个项目中。
- **较小的攻击面**：由于其小巧的规格和较少的依赖关系。
- **内置组件可插拔**：包括 CRI、CNI、负载均衡器和入口控制器。
- **易于更新**：由于其减少的依赖关系。
- **易于远程部署**：可以在 K3s 上线后通过 manifests 进行引导安装。
- **适用于资源受限环境**：K3s 是物联网和边缘计算的更好选择。

为了更好地理解这一切是如何实现的，我们来看看 K3s 的主要特性。

### 单一二进制文件，内置组件可插拔

K3s 是一个单一的二进制文件，易于安装和配置。该二进制文件的大小在 50 到 100MB 之间（取决于版本），K3s 解压后包含在控制平面和工作节点上运行 Kubernetes 所需的所有组件。这包括作为 CRI 的 containerd，作为 CNI 的 Flannel，作为数据存储的 SQLite，以及用于安装关键资源（如 CoreDNS 和 Traefik Proxy 作为入口控制器）的 manifest。它包含一个负载均衡器，将 Kubernetes 服务连接到主机 IP，使其适用于单节点集群。

控制平面节点在不到 512MB 的 RAM 中运行所有 Kubernetes 组件，而工作节点在不到 50MB 的 RAM 中运行其组件。

### 单一进程的简单性

与在不同进程中运行组件的传统 Kubernetes 不同，K3s 在单个 Server 或 Agent 进程中运行控制平面、kubelet 和 kube-proxy，并由 containerd 处理容器生命周期功能。

![](https://traefik.io/static/2c77712c8d6aea11ec2a32cf4e4aeef3/K3-Diagram.jpg)

### 灵活性

K3s 在安装时通过命令行参数或环境变量进行配置。同一二进制文件可以成为控制平面节点，也可以作为工作节点加入现有集群。对于资源充足的环境，它可以将 SQLite 替换为嵌入式 etcd 集群，或者可以使用外部 etcd 集群或类似 MySQL、MariaDB 或 Postgres 的 RDBMS 解决方案。

K3s 将运行时与工作负载分离，因此可以在停止和启动 K3s 进程时，而不会影响正在运行的容器。这使得通过替换二进制文件并重新启动进程来轻松升级 K3s，或通过更改启动文件中的标志并重新启动来重新配置 K3s 成为可能。

尽管 K3s 内置了 containerd，但它仍然支持使用 Docker 作为容器运行时。所有嵌入式的 K3s 组件都可以关闭，使用户可以灵活安装自己的入口控制器、DNS 服务器和 CNI。

### 兑现 Kubernetes 的无处不在承诺

K3s 如此小巧，可以在许多地方运行，包括可以从端到端运行 K3s。开发人员可以直接使用 K3s，或通过类似 [K3d](https://k3d.io/ "K3D") 或 [Rancher Desktop](https://rancherdesktop.io/ "Rancher Desktop") 的嵌入式解决方案，而无需在本地工作站上分配多个 CPU 核心和几 GB 的 RAM。

CI/CD 系统可以使用 K3d 在 Docker 内部启动 K3s 集群，并在批准应用程序投入生产之前使用它们来测试应用程序。生产环境可以以 HA 配置运行完整的 K3s 集群，具有多个隔离的控制平面和数据平面节点以及一组工作节点，来将应用程序交付给用户。

环境的一致性确保开发人员创建的内容在生产中运行的结果相同，从而将一致的容器操作应用到集群本身。

### 比 K8s 更快

在 Kubernetes 需要花费 10 分钟或更长时间进行安装的世界中，K3s 可以在任何 Linux 系统上安装，并在不到一分钟内提供一个可用的集群。其轻量级架构对于运行的工作负载而言也比标准 Kubernetes 更快。

### 在 K8s 无法运行的地方运行

K3s 小巧的足迹使得在以前 Kubernetes 无法触及的地方进行容器工作负载的编排和运行成为可能，比如在有限或间歇性连接的恶劣环境中运行。

K3s 包含一个 [Helm 控制器](https://github.com/k3s-io/helm-controller "K3s Helm-controller")，它将通过 HelmChart 清单安装 Helm 软件包。在安装之前或之后，可以将任何 Kubernetes 清单放置在控制平面节点上的目录中，这些资源将自动安装到集群中。这些功能的结合使得在引导集群的瞬间就具备所需的各个应用程序，无需外部干预。

K3s 已成功用于卫星、飞机、潜艇、车辆、风力发电场、零售场所、智能城市等通常无法运行 Kubernetes 的地方。

## K3s 与 K8s 的比较

关于 K3s 与 K8s 的比较实际上并不完全成立。K3s 是一个类似于 RKE 的 Kubernetes 发行版。K3s 与标准 Kubernetes 之间的真正区别在于，K3s 被设计为具有较小的内存占用和适应某些环境（如边缘计算或物联网）的特殊特性。

因此，问题不在于 K3s 和 K8s 之间有什么区别，而更多地取决于何时以及在哪种环境下选择其中之一。

### 何时选择 K3s？

选择在项目中使用 K3s 还是 K8s 将取决于项目的需求和你可用的资源。如果你想在 Arm 硬件（如 Raspberry Pi）上运行 Kubernetes，那么 K3s 将为你提供完整的 Kubernetes 功能，同时为工作负载留出更多的 CPU 和 RAM。

另一方面，如果你想在具有 24 个 CPU 核心和 128GB RAM 的云实例上运行 Kubernetes，那么 K3s 与 RKE 或 RKE2 等 Kubernetes 发行版相比并没有真正的优势。

如果你在本地运行 Kubernetes，并且不需要所有云提供商的额外功能，那么 K3s 是一个出色的解决方案。你可以将其与外部 RDBMS 或内嵌或外部 etcd 集群一起使用，它将在相同环境中比标准的 Kubernetes 发行版运行得更快。

如果你定期启动和关闭 Kubernetes 集群，用于云环境横向扩展、运行批处理作业或进行持续集成测试，那么你将体会到 K3s 集群上线的速度有多快。

### 结论

K3s 一出现就引起了轰动，并且它继续满足资源受限环境中对可靠 Kubernetes 的需求。

它既不是 Kubernetes 的缩水版本，也不是分支。它是 100% 的上游 Kubernetes，针对特定用例进行了优化。

作为唯一由 CNCF 拥有并且是最受欢迎的轻量级 Kubernetes 发行版，它是在其擅长的环境中的正确选择。
