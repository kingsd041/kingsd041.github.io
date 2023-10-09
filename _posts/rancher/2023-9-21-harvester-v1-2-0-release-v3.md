---
layout: post
title: Harvester v1.2.0 版本发布
subtitle:
date: 2023-9-21 11:07:00 +0800
author: Harvester
header-img: img/post-bg-rancher-k8s.png
catalog: true
tags:
  - Harvester
---

自从去年十月推出 Harvester v1.1 以来，已经过去了十个月。Harvester 现在已经成为 Rancher 平台的重要组成部分，不仅在社区内获得了显著的增长，还积累了宝贵的用户反馈。

我们的专业团队一直在不懈努力，将这些反馈融入到我们的开发流程中。今天，我非常高兴地宣布，Harvester v1.2.0 (最新版) 正式发布！

在这个最新版本中，Harvester v1.2.0 进一步扩展了功能，为你的本地工作负载提供了综合的基础设施解决方案。无论你是管理虚拟机（VM）、云原生工作负载还是其他任务，Harvester 都提供了一个统一的界面，为你提供市场上无与伦比的灵活性。

现在，让我们更深入地了解一下 Harvester v1.2.0 发布所伴随的一些重要功能：

## 裸金属云原生工作负载支持（实验性）

从一开始，我们的愿景一直聚焦于支持用户在本地部署 Kubernetes。尽管最初 Harvester 着重于虚拟化技术，但我们迅速认识到 Kubernetes 及其生态系统正在推动虚拟化的商业化，并不断演进。

这一认识促使我们调整了我们的使命，将重点转向开发 HCI 软件，该软件不仅简化了传统虚拟机管理，同时也赋予用户加速迈向现代云原生基础设施的能力。为了实现这一目标，我们增强了 Harvester 的功能，确保为 Harvester 创建的虚拟机上运行的 Kubernetes 集群提供了强大的支持，包括内置的 CSI 和云提供商（Cloud Provider）集成。

我们的社区欣然接受了这一方向，因为它有效地解决了 Kubernetes 的关键挑战，如资源隔离和多租户。然而，随着 Harvester 的广泛应用，我们开始收到关于在边缘位置支持 Kubernetes 操作的请求。在这些情况下，通常由小团队管理本地集群，强调最小的开销，同时需要容器工作负载与虚拟机的无缝共存。许多托管专业化虚拟机工作负载的环境也希望能够在 Harvester 主机或裸金属集群上直接运行容器工作负载。

经过深思熟虑，我们认识到这一概念略微偏离了我们最初的目标。然而，由于 Kubernetes 在 Harvester 中的基础地位，我们找到了一种方法来扩展我们的范围以满足这些需求。

随着 Harvester v1.2.0 的推出，我们自豪地宣布引入了实验性的“裸金属云原生工作负载支持”功能。虽然最初作为实验性功能发布，但此功能使 Harvester v1.2.0 能够与 Rancher v2.7.6 及更高版本无缝合作，实现在 Harvester 主机（裸金属）集群上直接运行容器工作负载。你可以在我们的 [Harvester 文档](https://docs.harvesterhci.io/v1.2/rancher/index/#harvester-baremetal-container-workload-support-experimental "Harvester 文档") 中了解有关激活此功能的更多信息。

一旦启用，用户可以轻松将 Harvester 主机 (裸金属) 集群作为其他标准 Kubernetes 集群来使用，从而促进容器工作负载与 Harvester 的虚拟机工作负载之间的无缝交互。请注意，目前存在一些限制，我们在文档中详细说明了这些[限制](https://docs.harvesterhci.io/v1.2/rancher/index/#key-features "使用限制")。

![](https://www.suse.com/c/wp-content/uploads/2023/09/Picture1.png)
_图 1：Rancher UI 中启用的功能标志_

## Rancher Manager vcluster 附加组件（实验性）

自从 Harvester 诞生以来，与 Rancher Manager 进行集成的需求就显而易见了。这种集成允许用户充分利用 Rancher Manager 的丰富功能，无需进行重复身份验证、授权或 CI/CD 等操作，因为 Rancher Manager 已经非常完善。此外，Rancher Manager 在多集群管理方面的经验使其能够有效地管理多个 Harvester 集群。

然而，随之而来了一个新的挑战：我们需要满足那些不需要集中管理的 Rancher Server 的用户的需求。一些用户负责运营不同站点和团队，他们可能对统一的 Rancher Server 监控所有 Harvester 集群不感兴趣，而其他用户仍然需要 Rancher Manager 的功能。

目前的 Harvester 版本包括一个内置的 Rancher Manager，用于内部集群管理，这促使 Harvester 工程团队探索如何最大限度地发挥其作用。经过与 Rancher 工程团队的合作和磋商，由于 Harvester BareMetal 集群充当嵌入式 Rancher 的本地集群，而在本地集群上部署 Rancher Manager 工作负载是不推荐的。

为了解决这个问题，我们转向了一个名为 vcluster 的相对较新的开源计划，以简化 Rancher Manager 的部署在 Harvester 主机集群上的流程。这个解决方案为用户带来了两个主要优势。首先，相较于传统方式将 Rancher Manager 作为虚拟机引导，它降低了开销，提高了操作效率；其次，部署体验与通常在云原生环境中使用 Helm chart 部署工作负载的方式相似。

Rancher Manager 插件运行在 Harvester 集群之上，它授予了在 Rancher Manager 插件中的完全访问权限，本质上是赋予了对 Harvester 集群和 Rancher Manager 的管理权限。操作员现在可以在定义 Rancher Manager 中的角色和权限时考虑这种实用程序整合。

你可以在[此处](https://docs.harvesterhci.io/v1.2/advanced/addons/rancher-vcluster/ "启用 Rancher Manager 集群插件")启用 Rancher Manager 集群插件以体验这些新的功能。

![](https://www.suse.com/c/wp-content/uploads/2023/09/Picture2.png)

_图 2：Harvester 中的 Rancher vcluster 添加_

![](https://www.suse.com/c/wp-content/uploads/2023/09/Picture1.1.png)

_图 3：Rancher Manager 与 Harvester 集群集成_

## Harvester 中支持非根磁盘的第三方存储集成

Harvester 作为 HCI 软件，将存储视为核心要素。然而，我们注意到许多客户在其数据中心已经拥有中央存储设备。他们欣赏 Harvester，但发现将现有服务器改装为具有 SSD/NVMe 驱动器的服务器具有挑战性，而无法充分利用其现有存储设备。这是我们客户非常关心的问题。

好消息是，Harvester 的 Kubernetes 基础架构使我们能够支持第三方的存储解决方案，只要它们与 Kubernetes 兼容并通过容器存储接口（CSI）进行连接。

通过 Harvester 1.2.0，用户现在可以按照介绍的[方法](https://docs.harvesterhci.io/v1.2/advanced/csidriver/ "第三方存储支持")将自己的存储设备和第三方 CSI 驱动程序无缝集成。我们正在积极与多个存储供应商合作进行认证，敬请期待即将发布的公告！

需要注意的是，目前第三方存储支持仅限于非根磁盘（即 VM 的数据盘），通常不是来自虚拟机系统镜像的磁盘。这个限制存在是因为 Harvester 仍然依赖于 Longhorn 进行虚拟机镜像管理，它支持镜像上传和从现有镜像快速创建虚拟机等基本功能，从而增强了 Harvester 的整体用户体验。同时，我们也计划将继续探索 Longhorn 与第三方存储设备集成以进行镜像管理的方法。

## 大大增强了云提供商（Cloud Provider）和负载均衡器（LoadBalancer）的特性

从一开始，我们就认识到在 Harvester 中实现负载均衡的重要性。许多虚拟化提供商缺乏将负载均衡功能无缝集成到 Kubernetes Cloud Provider 驱动程序中的能力。我们相信，即使在本地部署中，这个功能也会极大地使用户受益。因此，我们从一开始就将云提供商驱动程序集成到 Harvester 的 guest k8s 集群中。

在过去的一年中，我们收到了大量关于我们最初云提供商实现的反馈。有两个关注度较高的需求：用户希望能够为每个 guest k8s 集群定制负载均衡服务，而不是一个适用于整个 Harvester 的 IP 池，并且他们还希望为其虚拟机提供负载均衡服务。

Harvester 1.2.0 引入了新的负载均衡服务，为用户提供以下功能：

- 允许为每个 guest k8s 集群网络指定 IP 池（对于那些使用 VLAN 网络的待确认）
- 为其虚拟机配置负载均衡服务，实现与多个负载均衡提供商的集成

要深入了解此服务的详细信息并学习如何部署它，请访问此[链接](https://docs.harvesterhci.io/v1.2/rancher/cloud-provider/ "Harvester Cloud Provider")。此外，在升级你的 Kubernetes 集群之前，请务必查看向后兼容性[通知](https://docs.harvesterhci.io/v1.2/rancher/cloud-provider/#backward-compatibility-notice "向后兼容性通知")。

## 硬件管理 – 带外(out-of-band) IPMI 集成和错误检测

由于 Harvester 直接在裸金属服务器上运行，因此全面的服务器管理至关重要。操作员需要实时了解硬件状态，对潜在的硬件错误进行即时警报，并在将来需要更换磁盘时提前通知。

在版本 1.2.0 中，我们引入了裸金属硬件管理功能的增强。我们集成了与 IPMI 终端服务器的带外连接，使 Harvester 能够直接获取硬件错误信息并迅速通知管理员。此外，在这个版本中，Harvester 获得了管理节点生命周期的功能。

要启用此功能，请参考[此处](https://docs.harvesterhci.io/v1.2/advanced/addons/seeder/ "Seeder 参考")提供的说明。

此外，Harvester v1.2.0 也带来了一些其他备受期待的功能：

- 新的安装模式：我们为与裸金属云提供商合作的用户引入了一个简化的安装模式，详见[此处](https://docs.harvesterhci.io/v1.2/install/install-binaries-mode/ "使用二进制文件安装 Harvester")。
- SR-IOV 虚拟化支持：通过 SRIOV 虚拟化支持网卡直通，提升虚拟机网络性能，详见[此处](https://docs.harvesterhci.io/v1.2/advanced/addons/pcidevices/#sriov-network-devices "SRIOV Network Devices")。
- 减少资源占用选项：用户现在可以选择启用或禁用日志和监控组件来减少系统资源占用，并支持在 Harvester 安装时配置，如[此处所述](https://docs.harvesterhci.io/v1.2/advanced/addons/ "Harvester 插件")。
- 增加 Pod 限制：我们已经将 Harvester 节点的 Pod 限制提高到 200，允许更好地利用裸金属服务器提供的计算资源。
- 模拟 TPM 2.0：通过新增的模拟 [TPM 2.0 支持](https://docs.harvesterhci.io/v1.2/vm/index/#tpm-device "TPM 2.0 支持")，提供了对 Windows 虚拟机的更好支持。

我们诚挚的邀请你探索和使用 [Harvester v1.2.0](https://github.com/harvester/harvester/releases/tag/v1.2.0 "Harvester v1.2.0 release")。你可以通过我们的 [Slack channel](https://rancher-users.slack.com/archives/C01GKHKAG0K "Slack channel") 或 [GitHub](https://github.com/harvester/harvester/issues "Harvester github issues") 与我们分享反馈。

注意：如果你使用 USB 进行安装，请按照[此处](https://docs.harvesterhci.io/v1.2/install/usb-install/ "安装说明")的说明进行操作，并使用 USB [专用 ISO](https://releases.rancher.com/harvester/v1.2.0/harvester-v1.2.0-patch1-amd64.iso "Harvester 专用 ISO") 进行 Harvester v1.2.0 安装。
