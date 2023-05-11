---
layout: post
title: 将你的 Rancher 下游集群升级到 Kubernetes v1.25
subtitle: PodSecurityPolicy API 在 Kubernetes v1.25 中被完全删除，本文将介绍如何将下游集群升级到 1.25
date: 2023-5-4 11:07:00 +0800
author: Ksd
header-img: img/post-bg-desk.jpg
catalog: true
tags:
  - Rancher
---

## 介绍

最初在 Kubernetes v1.21 中被弃用的 PodSecurityPolicy API，已经在 Kubernetes v1.25 中被[完全删除](https://kubernetes.io/blog/2022/08/04/upcoming-changes-in-kubernetes-1-25/#podsecuritypolicy-removal)。由于 API 被移除，你无法在 Kubernetes v1.25 集群中创建、编辑或查询 PodSecurityPolicy 资源。此外，由于其准入控制器已被移除，所以你的集群无法再强制执行在 Kubernetes v1.24 及之前版本中创建的任何 PodSecurityPolicy 规则。因此，你必须将工作负载安全迁移到新的 Pod Security Admission 控制器、补充策略引擎或两者的组合。

本文讨论如何将 Rancher 管理的下游集群升级到 Kubernetes v1.25，包括如何使用 Rancher 特定的机制来应用 Pod Security Admission 配置，以及如何从 Rancher 维护的工作负载中删除 PodSecurityPolicies。本文是一个示例教程，建议先在非生产环境中运行这些步骤来熟悉流程，然后确定你的生产环境需要如何操作。

## 要求

将集群升级到 Kubernetes v1.25 之前，请确保：

- 你正在运行 Rancher v2.7.2 或更高版本。
- 你的下游集群正在运行 Kubernetes v1.24。
- 你已完成了 Kubernetes 文档中概述的[从 PodSecurityPolicies 迁移到内置的 Pod Security Admission 控制器](https://kubernetes.io/docs/tasks/configure-pod-container/migrate-from-psp/)的步骤，将 PodSecurityPolicies 映射到 Pod Security Admission 配置或 Pod Security Standard 标签中。
- 你已经评估过 Pod Security Admission 是否适合你的需求。在本文的最后，有一些关于补充策略引擎的链接资源，如果 Pod Security Admission 不足以满足你的使用情况，你可能希望将它添加到你的集群中。

## 配置 Pod Security Admission 控制器

第一步是配置新的 Pod Security Admission 控制器。在 Kubernetes v1.24 中，这个准入控制器已经在 kube-apiserver 中默认启用。有几种方法可以配置这个准入控制器。其中一种选择是通过 kube-apiserver 命令行参数部署集群范围的 AdmissionConfiguration。从 2.7.2 版本开始，Rancher 提供了两个开箱即用的 AdmissionConfigurations，或者你也可以通过 Rancher UI 创建自己的 Pod Security Admission 配置。下面将更详细地介绍这些功能。

## 审查 Pod Security Admission 配置预设

要查看 Rancher 附带的 Pod Security Admission 配置预设，请使用管理员身份登录 Rancher 时导航至 **Cluster Management** → **Advanced** → **Pod Security Admissions**。你将看到两个可用的预设：**rancher-privileged** 和 **rancher-restricted**。 **rancher-restricted** 将 enforce、warn 和 audit 值设置为 **restricted** 并包含一些命名空间豁免，用来允许 Rancher 在你的集群中正常工作。 **rancher-privileged** 预设等同于 [Kubernetes 文档中提供的示例 AdmissionConfiguration](https://kubernetes.io/docs/tasks/configure-pod-container/enforce-standards-admission-controller/#configure-the-admission-controller)，并且不提供任何特定的安全保证。你可以在 [Rancher 文档](https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/pod-security-standards)上阅读更多关于 Pod Security Admission 和 Pod Security Standard 的信息。

## （可选）创建自定义 Pod Security Admission 配置

你还可以创建自己的 Pod Security Admission 配置。为此，请导航至 **Cluster Management** → **Advanced** → **Pod Security Admissions**，然后单击 **Create**：

![](https://www.suse.com/c/wp-content/uploads/2023/04/01-psa-list.png)

![](https://www.suse.com/c/wp-content/uploads/2023/04/02-psa_create.png)

为你的新 Pod Security Admission 配置选择一个名称，并选择应用于执行、审计和警告的规则。你还可以指定是否有豁免适来满足你的需求。填写表单后，单击 **Create**。

## 配置集群使用 Pod Security Admission 配置

你可以利用 Rancher UI 来应用集群范围的 Pod Security Admission 配置。在 Rancher Manager 的 **Cluster Management** 选项卡中，选择要配置的集群的汉堡菜单，然后选择 **Edit Config** 选项：

![](https://www.suse.com/c/wp-content/uploads/2023/04/03-hamburger-menu.png)

然后针对不同的下游集群启用 Pod Security Admission ：

- **RKE**：导航到 **Advanced Options**，然后在 **Pod Security Admission Configuration Template** 字段中选择你的首选选项。

![](https://www.suse.com/c/wp-content/uploads/2023/04/04-rke-config.png)

- **RKE2** 或 **K3S**：导航到 **Cluster Configuration** 面板。在 **Basics** 窗格中的 **Security** 部分下，在 **Pod Security Admission Configuration Template** 字段中选择你的首选选项。

![](https://www.suse.com/c/wp-content/uploads/2023/04/05-k3s-config.png)

完成配置后，请确保保存并测试。

## 手动配置单个命名空间

要使用 Pod Security Standard 标签单独配置命名空间，请参考 [Kubernetes 文档](https://kubernetes.io/docs/concepts/security/pod-security-admission/#pod-security-levels)。请注意，当 Pod Security Admission 配置与 Pod Security Standard 标签结合使用时，准入控制器将忽略任何应用于在 Pod Security Admission 配置中标记为豁免的资源的 Pod Security Standard 标签。

## 删除 PodSecurityPolicies

本节假设你已经将 PodSecurityPolicies 映射到 Pod Security Admission 配置和 Pod Security Standard 命名空间标签，并且你的集群符合要求。如果你还没有这样做，请查看有关[从 PodSecurityPolicies 迁移到内置 PodSecurity Admission Controller 的 Kubernetes 文档](https://kubernetes.io/docs/tasks/configure-pod-container/migrate-from-psp/)。

你不应手动删除 PodSecurityPolicies。通过 kubectl delete 删除由 Helm chart 添加的 PodSecurityPolicies 不会从 Helm 版本中删除它们的引用，并且可能导致无法升级甚至删除 Helm chart 的情况。要了解有关如何防止出现这种情况的更多信息，请继续阅读本节。

升级你的 Apps & Marketplace chart 以删除 PodSecurityPolicies。之前安装 PodSecurityPolicies 的 Rancher 维护的工作负载增加了一个格式为 v102.x.y 的新版本，允许你删除这些资源。显着变化包括：

- 创建了一个新的 PodSecurityPolicy 开关：global.cattle.psp.enabled。以前的 PodSecurityPolicy 开关已被这个新开关取代。
- 在 chart 安装前，增加了 PodSecurityPolicies 的集群能力验证。如果你尝试在打开 PodSecurityPolicy 开关的情况下将这些新 chart 安装到 Kubernetes v1.25 集群中，你将看到一条错误消息，要求你在继续之前禁用 PodSecurityPolicies。

为了顺利升级到 Kubernetes v1.25，你必须删除使用 Helm 部署的 PodSecurityPolicy 资源。为此，请将每个 chart 的安装升级到最新版本 v102.0.0，并确保将 PodSecurityPolicy 开关 global.cattle.psp.enabled 的值设置为 false。

## 验证集群中的所有工作负载都已迁移到 Pod Security Admission

验证集群中的其他工作负载是否也已从 PodSecurityPolicies 迁移到 Pod Security Admission 和 Standards。你可以通过运行 kubectl get podsecuritypolicies 检查集群中存在哪些 PodSecurityPolicies。请注意，集群中存在 PodSecurityPolicy 资源并不意味着有工作负载在使用它。

要检查哪些 PodSecurityPolicies 仍在使用中，你可以运行以下命令。请注意，此策略可能会遗漏当前未运行的工作负载，例如 CronJobs、当前副本数为 0 的工作负载或其他尚未推出的工作负载：

```
kubectl get pods --all-namespaces \
    --output jsonpath="{.items[*].metadata.annotations.kubernetes\.io\/psp}" \
    | tr " " "\n" | sort -u
```

要了解有关检查正在使用的 PodSecurityPolicies 的策略的更多信息，请参见 Kubernetes 的 PodSecurityPolicy 迁移文档的[确定适当的 Pod 安全级别](https://kubernetes.io/docs/tasks/configure-pod-container/migrate-from-psp/#identify-appropriate-level)章节。

## 将集群升级到 Kubernetes v1.25

在前面的步骤完成并且集群中没有剩余的 PodSecurityPolicies 之后，就可以将集群升级到 Kubernetes v1.25 了。对于下游集群，你可以通过 Rancher UI 执行升级。

要升级集群，请导航至 **Cluster Management**。在 **Clusters** 页面中，单击要升级到 Kubernetes v1.25 的集群对应的汉堡菜单，然后选择 **Edit Config** 选项。根据你的集群类型更改 Kubernetes 版本：

- **RKE**：导航到 **Cluster Options** → **Kubernetes options**。在 Kubernetes 版本字段中，选择你要升级到的 v1.25 版本。
- **RKE2 或 K3S**：导航到 **Cluster Configuration** 面板并选择 **Basics** 窗格。在 **Basics** 部分下，找到 **Kubernetes Version** 字段。选择你要升级到的 v1.25 版本。

保存选择的配置。你将看到集群从 **Active** 过渡到 **Upgrading** 的状态。升级可能需要一些时间，完成后集群状态将再次变为 **Active** 状态。

## 细粒度的策略

由于 Pod Security Admission 和 Pod Security Standards 不像 PodSecurityPolicies 那样细化，并且不提供突变功能来确保 Pod 符合规则，你可能希望通过在集群中安装单独的准入控制器来补充功能。在 Kubernetes 领域，有一些准入控制器提供可变准入和更细粒度的验证功能，例如 Kubewarden、Kyverno、Neuvector 和 OPA Gatekeeper 等等。你可以在本文末尾找到有关这些补充策略引擎的文档链接。

## 故障排查

升级到 Kubernetes v1.25 后，如果你忘记检查是否存在 PodSecurityPolicies（或其他已停用的 API），你可能会注意到某些 Helm 版本无法升级或卸载。如果发生这种情况，你可以使用 helm-mapkubeapis 插件将你的版本恢复到工作状态。此插件读取 Helm 发布数据并用新版本替换被取代的 API，或删除引用已从 Kubernetes 中完全删除的 API 的资源。

请注意，Helm 插件是在运行命令的机器上安装的。因此，请确保在你打算运行清理步骤的同一台机器上运行安装步骤。

### 安装 helm-mapkubeapis

1. 请确保你已经安装了 Helm，执行 helm version 会得到类似如下的输出：

```
version.BuildInfo{Version:"v3.10.2", GitCommit:"50f003e5ee8704ec937a756c646870227d7c8b58", GitTreeState:"clean", GoVersion:"go1.18.8"}
```

2. 安装 helm-mapkubeapis 插件：

```
helm plugin install https://github.com/helm/helm-mapkubeapis
```

输出应类似于：

```
Downloading and installing helm-mapkubeapis v0.4.1 …
https://github.com/helm/helm-mapkubeapis/releases/download/v0.4.1/helm-mapkubeapis_0.4.1_darwin_amd64.tar.gz
Installed plugin: mapkubeapis
```

3. 检查插件是否正确安装：

```
helm mapkubeapis --help
```

输出应类似于：

```
Map release deprecated or removed Kubernetes APIs in-place
Usage:
    mapkubeapis [flags] RELEASE
Flags:
    --dry-run               simulate a command
    -h, --help              help for mapkubeapis
    --kube-context string   name of the kubeconfig context to use
    --kubeconfig string     path to the kubeconfig file
    --mapfile string        path to the API mapping file
    --namespace string      namespace scope of the release
```

确保安装的 helm-mapkubeapis 版本为 v0.4.1 或更高版本，因为早期版本不支持删除资源。

### 清理 PodSecurityPolicies

1. 运行 `kubectl cluster-info` 确保可以访问目标集群。
2. 列出集群中安装的所有版本

```
helm list --all-namespaces
```

3. 使用 `helm mapkubeapis --dry-run <release-name> --namespace <namespace-name>` 对你想清理的每一个版本进行模拟运行，输出会告知你哪些资源将被替换或移除。
4. 查看更改后，执行完整命令：

```
helm mapkubeapis <release-name> --namespace <namespace-name>.
```

### 将你的工作负载升级到支持 Kubernetes v1.25 的版本

清理损坏的版本后，你需要将工作负载升级到 Kubernetes v1.25 中支持的版本。这个步骤不能被跳过，因为清理后的版本不能保证正常工作或具有 Kubernetes v1.25 所需的安全性。

对于 Rancher 维护的工作负载，请按照本文删除 PodSecurityPolicies 部分中介绍的步骤进行操作。对于其他工作负载，请参阅对应供应商的文档。

## 下一步

- 详细了解 [Pod Security Admission 控制器](https://kubernetes.io/docs/concepts/security/pod-security-admission/)和 [Pod Security Standard ](https://kubernetes.io/docs/concepts/security/pod-security-standards/)。
- 详细了解补充策略引擎：[Kubewarden](https://docs.kubewarden.io/)、[Kyverno](https://kyverno.io/docs/)、[NeuVector](https://open-docs.neuvector.com/) 和 [OPA Gatekeeper](https://open-policy-agent.github.io/gatekeeper/website/docs/)。
- 查看[如何将 PodSecurityPolicies 迁移到 Kubewarden 策略](https://docs.kubewarden.io/tasksDir/psp-migration)。
- 详细了解[如何使用 helm-mapkubeapis](https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/pod-security-standards#cleaning-up-releases-after-a-kubernetes-v125-upgrade)。
