---
layout: post
title: Rancher 教程：如何在 Kubernetes 中使用 Cluster Autoscaler
subtitle:
date: 2023-10-10 11:07:00 +0800
author: Ksd
header-img: img/post-bg-rancher-k8s.png
catalog: true
tags:
  - Rancher
---

自动扩展和收缩 Kubernetes 集群中的资源和服务对于应对不断变化的工作负载至关重要，你不能总是依赖手动扩缩来帮助集群应对意外的负载波动。

集群自动扩缩不仅可以实现更快速、更高效的部署，还能减少资源浪费，从而降低总体成本。通过快速调整规模，你的应用程序可以根据不同的工作负载进行优化，从而提高可靠性。

本教程将向你介绍 Kubernetes 的 [Cluster Autoscaler](https://github.com/kubernetes/autoscaler "Cluster Autoscaler")。你将了解它与 Kubernetes 中其他类型的自动扩缩的区别，以及如何使用 Rancher 来实现 Cluster Autoscaler。

## 不同类型的 Kubernetes 自动扩缩的区别

通过监控资源利用率并对变化做出应对，Kubernetes 自动扩缩有助于确保应用程序和服务始终以最佳状态运行。你可以通过使用 [Vertical Pod Autoscaler（VPA）](https://github.com/kubernetes/autoscaler/tree/master/vertical-pod-autoscaler "Vertical Pod Autoscaler（VPA）")，[Horizo​​ntal Pod Autoscaler（HPA）](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/ "Horizo​​ntal Pod Autoscaler（HPA）]")或 [Cluster Autoscaler（CA）](https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/FAQ.md "Cluster Autoscaler（CA）")来实现自动扩缩。

**VPA** 是一个负责管理单个 Pod 资源请求的 Kubernetes 资源。它用于自动调整单个 Pod 的资源请求和限制，例如 CPU 和内存，以优化资源利用率。VPA 通过根据使用模式进行扩缩和缩减，帮助组织维护单个应用程序的性能。

**HPA** 是一个 Kubernetes 资源，它会自动调整特定应用程序或服务的副本数量。HPA 监控应用程序或服务的使用情况增加或减少副本数量。这有助于组织在无需手动干预的情况下维护其应用程序和服务的性能。

**CA** 是一个 Kubernetes 资源，用于根据使用情况自动扩缩集群中的节点数量。这有助于组织维护集群的性能并优化资源利用率。

VPA、HPA 和 CA 之间的主要区别在于，VPA 和 HPA 负责管理单个 Pod 和服务的资源请求，而 CA 负责管理集群的整体资源。VPA 和 HPA 用于根据单个应用程序或服务的使用模式进行扩缩或缩减，而 CA 用于根据整个集群的性能来调整集群中的节点数量。

现在你了解了 CA 与 VPA 和 HPA 的区别，你可以开始在 Kubernetes 中开始操作集群自动扩缩了。

## 先决条件

有许多方法可以演示如何实现 CA。例如，你可以在本地计算机上安装 Kubernetes，并使用 `kubectl` 命令行工具手动设置所有内容。或者，你可以在 Amazon Web Services（AWS），Google Cloud Platform（GCP）或 Azure 上设置具有足够权限的用户，以便使用你最喜欢的托管集群提供商来使用 Kubernetes。然而，它们涉及许多配置步骤，可能会分散注意力，而我们主要的目标是 Kubernetes Cluster Autoscaler。

我们的目标是了解 CA 的内部工作原理，而不是耗时的平台配置，这就是你将在这里了解的内容。这个解决方案只涉及两个要求：一个 Linode 账户和 Rancher。

对于本教程，你需要一个正在运行的 Rancher Manager。Rancher 非常适合演示 CA 的工作原理，因为它允许你从其强大的用户界面方便地部署和管理 Kubernetes 集群。包括以下热门选项：

- [K3s](https://k3s.io/ "K3s")：如果你已经在本地计算机上运行 K3s，你可以使用 Helm 将 Rancher 安装在 K3s 中。

- Docker：另一种选择是在单节点上使用 `docker run` 安装 Rancher。

- [Rancher Desktop](https://rancherdesktop.io/ "Rancher Desktop")：对于开发人员来说，这是一个很好的选择，因为它会在本地计算机上安装一个单节点的 K3s 集群，同时安装了 Helm 和 metrics server，并设置了 kubectl 命令行工具。一旦准备好，你可以使用 Docker 或 Helm 在 Rancher Desktop 上安装 Rancher。

- Cloud provider：另一种选择是使用你喜欢的云提供商在 Kubernetes 集群上安装 Rancher。

- Linode 账户：Linode 是一个流行的云提供商，可以轻松演示如何对 Kubernetes 集群进行扩缩和缩减。你只需创建一个访问令牌，以便 Rancher 可以将 Linode Kubernetes Engine（LKE）集成到其集群管理仪表板中。如果你还没有 Linode 账户，可以在他们的网站上免费注册。

如果你有疑问，我们建议阅读 Rancher 文档，文档中描述了[如何在 Rancher 上使用 Amazon Elastic Compute Cloud（Amazon EC2）自动扩缩组来安装 Cluster Autoscaler](https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/manage-clusters/install-cluster-autoscaler/use-aws-ec2-auto-scaling-groups "具有 AWS EC2 Auto Scaling 组的 Cluster Autoscaler")。然而，请注意，不同平台上实现 CA 非常相似，因为所有解决方案都利用了 [Kubernetes Cluster API](https://cluster-api.sigs.k8s.io/ "Kubernetes Cluster API") 来实现，后续会详细讨论。

### 什么是 Cluster API，Kubernetes CA 如何利用它

Cluster API 是一个用于构建和管理 Kubernetes 集群的开源项目。它提供了一个声明式的 API 来定义 Kubernetes 集群的期望状态。换句话说，Cluster API 可以用于扩缩 Kubernetes API 来便管理跨各种云提供商、裸金属安装和虚拟机的集群。

与此相比，Kubernetes CA 利用 Cluster API 来响应应用程序需求的变化而实现 Kubernetes 集群的自动扩缩。当 CA 检测到集群的容量不足以容纳当前的工作负载时，它会向云提供商请求额外的节点。然后，CA 使用 Cluster API 配置新节点并将节点添加到集群中。通过这种方式，CA 确保集群具备为应用程序提供服务所需的容量。

由于 Rancher 支持 CA 和 RKE2，并且 K3s 与 Cluster API 兼容，因此它们的组合提供了从中央仪表板进行自动化 Kubernetes 生命周期管理的理想解决方案。对于任何支持 Cluster API 的其他云提供商也同样适用。

### 在 Kubernetes 中实现 CA

既然你已经了解了 Cluster API 和 CA 是什么，那么现在是时候开始实际操作了。你的第一个任务将是使用 Rancher 部署一个新的 Kubernetes 集群。

## 在 Rancher 中部署新的 Kubernetes 集群

首先，登录 Rancher UI，点击位于左上角的汉堡菜单，然后选择 “Cluster Management”：

![](https://i.imgur.com/BdK2vew.png)

在下一个页面上，点击 “Drivers”：

![](https://i.imgur.com/A5yGT38.png)

Rancher 使用集群驱动程序在托管的云提供商中创建 Kubernetes 集群。

对于 Linode LKE，你需要激活特定的驱动程序，这很简单。只需选择驱动程序，然后点击 “Activate” 按钮。一旦驱动程序被下载并安装，状态将变为 “Active”，然后你可以在侧边菜单中点击 “Clusters”：

![](https://i.imgur.com/w18Fg3Z.png)

启用了集群驱动程序后，现在可以通过选择 “Create” 来创建一个新的 Kubernetes 部署：

![](https://i.imgur.com/Hyq8JOO.png)

然后从托管 Kubernetes 提供商列表中选择 Linode LKE：

![](https://i.imgur.com/uuNo3xN.png)

接下来，你需要输入一些基本信息，包括集群的名称以及用于与 Linode API 进行身份验证的个人访问令牌。完成后，点击 “Proceed to Cluster Configuration”：

![](https://i.imgur.com/0AAnMEm.png)

如果与 Linode API 的连接成功，你将被引导到下一个页面，在那里你需要选择一个 region、Kubernetes 版本，以及可选地为新集群选择一个标签。一旦准备好，点击 “Proceed to Node pool selection”：

![](https://i.imgur.com/4jMMjHC.png)

这是在创建 LKE 集群之前的最后一个页面。在这里，你决定要创建多少个节点池。虽然你可以创建任意数量的节点池，但 [Linode 的 Cluster Autoscaler](https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/cloudprovider/linode/README.md "Linode Cluster Autoscaler") 有两个限制：

1. 每个 LKE 节点池必须托管一个单一的节点（称为 Linode）。
2. 每个 Linode 必须是相同类型的（例如 2GB、4GB 和 6GB）。

对于本教程，你将使用两个节点池，一个托管 2GB 内存的节点，另一个托管 4GB 内存的节点。配置节点池很简单；从下拉列表中选择类型和所需数量的节点，然后点击 “Add Node Pool” 按钮。就像下面图片一样，点击 “Create”：

![](https://i.imgur.com/W4cl1lH.png)

你将被带回到 “Clusters” 页面，你需要等待新的集群完成配置。在幕后，Rancher 正在利用 Cluster API 根据你的要求配置 LKE 集群：

![](https://i.imgur.com/Hv3M8Om.png)

一旦集群状态显示为 “active”，你可以通过点击右侧的 “Explore” 按钮来查看新集群的详细信息：

![](https://i.imgur.com/KMF20Nk.png)

至此，你已经使用 Rancher 部署了一个 LKE 集群。在下一节中，你将学习如何在集群上实现 CA。

## 设置 CA

如果你是 Kubernetes 的新手，实现 CA 可能看起来复杂。例如，[AWS 上的 Cluster Autoscaler 文档](https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/cloudprovider/aws/README.md "AWS Cluster Autoscaler 文档")讨论了如何使用身份和访问管理（IAM）策略、OpenID Connect（OIDC）联合身份验证和 AWS 安全凭证来设置权限。与此同时，[Azure 上的 Cluster Autoscaler 文档](https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/cloudprovider/azure/README.md "Azure Cluster Autoscaler 文档")侧重于如何在 Azure Kubernetes Service（AKS）中实现 CA，如何自动调整 VMAS 实例和 VMSS 实例，对于这些操作，你还需要花时间设置你的用户凭证。

本教程的目标是摒弃与每个云提供商的身份验证和授权机制相关的具体细节，聚焦于真正重要的内容：如何在 Kubernetes 中实现 CA。为此，你应该将注意力集中在以下三个关键点上：

1. CA 引入了节点组的概念，一些供应商也称之为自动扩缩组。你可以将这些组视为由 CA 管理的节点池。这个概念很重要，因为 CA 为你提供了设置节点组，根据你的指示自动扩缩的灵活性，同时排除其他节点组来进行手动扩缩。

2. CA 根据你配置的某些参数来添加或删除 Kubernetes 节点。这些参数包括先前提到的节点组、它们的最小大小、最大大小等等。

3. CA 作为 Kubernetes 部署运行，其中定义了 secrets、services、namespaces、roles 和 role bindings。

CA 和 Kubernetes 的支持版本可能会因供应商而异。节点组的识别方式（使用标志、标签、环境变量等）以及部署所需的权限也可能有所不同。然而，归根结底，所有实现都围绕着上述原则展开：自动扩缩节点组、CA 配置参数和 CA 部署。

说了这么多，让我们回到正题。在点击 “Explore” 按钮后，你应该被引导到集群仪表板。目前，你只需要查看节点和集群的容量。

接下来的步骤包括定义节点组并执行相应的 CA 部署。从最简单的开始，遵循一些最佳实践来创建一个用于部署构成 CA 的组件的命名空间。为此，请转到 “Projects/Namespaces”：

![](https://i.imgur.com/6kWL3av.png)

你可以管理 Rancher 项目和命名空间。在 “Projects: System” 下，单击 “Create Namespace” 创建 “System” 项目的新命名空间：

![](https://i.imgur.com/KOvDYPm.png)

设置命名空间名称，并选择 “Create”。创建命名空间后，单击红圈处显示的图标（即导入 YAML）：

![](https://i.imgur.com/YXUcSv5.png)

Rancher 允许从 UI 执行任务，导入本地 YAML 文件并部署到 Kubernetes 集群。请复制以下代码。请记得将 `<PERSONAL_ACCESS_TOKEN>` 替换为你为本教程创建的 Linode 令牌：

```
---
apiVersion: v1
kind: Secret
metadata:
  name: cluster-autoscaler-cloud-config
  namespace: autoscaler
type: Opaque
stringData:
  cloud-config: |-
    [global]
    linode-token=<PERSONAL_ACCESS_TOKEN>
    lke-cluster-id=88612
    defaut-min-size-per-linode-type=1
    defaut-max-size-per-linode-type=5
    do-not-import-pool-id=88541

    [nodegroup "g6-standard-1"]
    min-size=1
    max-size=4

    [nodegroup "g6-standard-2"]
    min-size=1
    max-size=2
```

接下来，选择你刚刚创建的命名空间，将代码粘贴到 Rancher 中并选择导入：

![](https://i.imgur.com/xsMuddH.png)

出现一个弹窗，确认资源已创建，按 “Close” 继续：

![](https://i.imgur.com/cFKVyeI.png)

刚刚创建的 secret 是 Linode 实现 CA 使用的节点组配置。此配置定义了多个参数，包括以下内容：

- `linode-token`：这是用于在 Rancher 中注册 LKE 的个人访问令牌，与之前提到的一样。
- `lke-cluster-id`：这是在 Rancher 中创建的 LKE 集群的唯一标识符。你可以从 Linode 控制台获取这个值，或者通过运行命令 `curl -H "Authorization: Bearer $TOKEN" https://api.linode.com/v4/lke/clusters` 来获取，其中 STOKEN 是你的 Linode 个人访问令牌。在输出中，第一个字段 `id` 是集群的标识符。
- `default-min-size-per-linode-type`：这是一个全局参数，定义了每个节点组中的最小节点数。
- `default-max-size-per-linode-type`：这也是一个全局参数，设置了 Cluster Autoscaler 可以添加到每个节点组的节点数限制。
- `do-not-import-pool-id`：在 Linode 上，每个节点池都有一个唯一的 ID。此参数用于排除特定的节点池，以便 CA 不对其进行扩缩。
- `nodegroup`（`min-size` 和 `max-size`）：此参数设置了每个节点组的最小和最大限制。Linode 的 CA 实现强制每个节点组使用相同的节点类型。要获取可用节点类型的列表，你可以运行命令 `curl https://api.linode.com/v4/linode/types`。

本教程定义了两个节点组，一个使用 `g6-standard-1` Linodes（2GB 节点），另一个使用 `g6-standard-2` Linodes（4GB 节点）。对于第一个组，CA 可以将节点数量增加到最多四个，而对于第二个组，CA 只能将节点数量增加到两个。

具有节点组配置后，你可以使用 Rancher 将 CA 部署到相应的命名空间。将以下代码粘贴到 Rancher 中（与之前一样，点击导入 YAML 图标）：

```
---
apiVersion: v1
kind: ServiceAccount
metadata:
  labels:
    k8s-addon: cluster-autoscaler.addons.k8s.io
    k8s-app: cluster-autoscaler
  name: cluster-autoscaler
  namespace: autoscaler
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: cluster-autoscaler
  labels:
    k8s-addon: cluster-autoscaler.addons.k8s.io
    k8s-app: cluster-autoscaler
rules:
  - apiGroups: [""]
    resources: ["events", "endpoints"]
    verbs: ["create", "patch"]
  - apiGroups: [""]
    resources: ["pods/eviction"]
    verbs: ["create"]
  - apiGroups: [""]
    resources: ["pods/status"]
    verbs: ["update"]
  - apiGroups: [""]
    resources: ["endpoints"]
    resourceNames: ["cluster-autoscaler"]
    verbs: ["get", "update"]
  - apiGroups: [""]
    resources: ["nodes"]
    verbs: ["watch", "list", "get", "update"]
  - apiGroups: [""]
    resources:
      - "namespaces"
      - "pods"
      - "services"
      - "replicationcontrollers"
      - "persistentvolumeclaims"
      - "persistentvolumes"
    verbs: ["watch", "list", "get"]
  - apiGroups: ["extensions"]
    resources: ["replicasets", "daemonsets"]
    verbs: ["watch", "list", "get"]
  - apiGroups: ["policy"]
    resources: ["poddisruptionbudgets"]
    verbs: ["watch", "list"]
  - apiGroups: ["apps"]
    resources: ["statefulsets", "replicasets", "daemonsets"]
    verbs: ["watch", "list", "get"]
  - apiGroups: ["storage.k8s.io"]
    resources: ["storageclasses", "csinodes"]
    verbs: ["watch", "list", "get"]
  - apiGroups: ["batch", "extensions"]
    resources: ["jobs"]
    verbs: ["get", "list", "watch", "patch"]
  - apiGroups: ["coordination.k8s.io"]
    resources: ["leases"]
    verbs: ["create"]
  - apiGroups: ["coordination.k8s.io"]
    resourceNames: ["cluster-autoscaler"]
    resources: ["leases"]
    verbs: ["get", "update"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: cluster-autoscaler
  namespace: autoscaler
  labels:
    k8s-addon: cluster-autoscaler.addons.k8s.io
    k8s-app: cluster-autoscaler
rules:
  - apiGroups: [""]
    resources: ["configmaps"]
    verbs: ["create","list","watch"]
  - apiGroups: [""]
    resources: ["configmaps"]
    resourceNames: ["cluster-autoscaler-status", "cluster-autoscaler-priority-expander"]
    verbs: ["delete", "get", "update", "watch"]

---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: cluster-autoscaler
  labels:
    k8s-addon: cluster-autoscaler.addons.k8s.io
    k8s-app: cluster-autoscaler
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: cluster-autoscaler
subjects:
  - kind: ServiceAccount
    name: cluster-autoscaler
    namespace: autoscaler

---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: cluster-autoscaler
  namespace: autoscaler
  labels:
    k8s-addon: cluster-autoscaler.addons.k8s.io
    k8s-app: cluster-autoscaler
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: cluster-autoscaler
subjects:
  - kind: ServiceAccount
    name: cluster-autoscaler
    namespace: autoscaler

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cluster-autoscaler
  namespace: autoscaler
  labels:
    app: cluster-autoscaler
spec:
  replicas: 1
  selector:
    matchLabels:
      app: cluster-autoscaler
  template:
    metadata:
      labels:
        app: cluster-autoscaler
      annotations:
        prometheus.io/scrape: 'true'
        prometheus.io/port: '8085'
    spec:
      serviceAccountName: cluster-autoscaler
      containers:
        - image: k8s.gcr.io/autoscaling/cluster-autoscaler-amd64:v1.26.1
          name: cluster-autoscaler
          resources:
            limits:
              cpu: 100m
              memory: 300Mi
            requests:
              cpu: 100m
              memory: 300Mi
          command:
            - ./cluster-autoscaler
            - --v=2
            - --cloud-provider=linode
            - --cloud-config=/config/cloud-config
          volumeMounts:
            - name: ssl-certs
              mountPath: /etc/ssl/certs/ca-certificates.crt
              readOnly: true
            - name: cloud-config
              mountPath: /config
              readOnly: true
          imagePullPolicy: "Always"
      volumes:
        - name: ssl-certs
          hostPath:
            path: "/etc/ssl/certs/ca-certificates.crt"
        - name: cloud-config
          secret:
            secretName: cluster-autoscaler-cloud-config
```

在这段代码中，你正在定义一些标签、将部署 CA 的命名空间以及相应的 ClusterRole、Role、ClusterRoleBinding、RoleBinding、ServiceAccount 和 Cluster Autoscaler。

不同云提供商的差异在文件的末尾，特别在 `command` 部分。这里指定了几个标志。其中最重要的包括以下内容：

- Cluster Autoscaler 版本 **v**。
- **cloud-provider**；在这种情况下是 Linode。
- **cloud-config**，指向一个前面步骤中创建的 secret 的文件。

有关可用标志和选项的完整列表，请阅读 [Cloud Autoscaler FAQ](https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/FAQ.md "Cloud Autoscaler FAQ")。

应用部署后，将弹出一个窗口，列出了创建的资源：

![](https://i.imgur.com/rNCFiMO.png)

你刚刚在 Kubernetes 上安装了 CA，现在是时候进行测试了。

## 验证 CA

为了检查 CA 是否按预期工作，请在 Rancher `default` 命名空间中部署以下测试 workload：

![](https://i.imgur.com/1TYPRfC.png)

示例 YAML：

```
apiVersion: apps/v1
kind: Deployment
metadata:
  name: busybox-workload
  labels:
    app: busybox
spec:
  replicas: 600
  strategy:
    type: RollingUpdate
  selector:
    matchLabels:
      app: busybox
  template:
    metadata:
      labels:
        app: busybox
    spec:
      containers:
      - name: busybox
        image: busybox
        imagePullPolicy: IfNotPresent

        command: ['sh', '-c', 'echo Demo Workload ; sleep 600']
```

正如你所看到的，这是一个生成 600 个 `busybox` 副本的 workload。

如果你导航到 Cluster Dashboard，你会注意到 LKE 集群默认最大 Pod 数量为 220 个。这意味着 CA 应该开始添加节点来满足需求：

![](https://i.imgur.com/6oSTx3d.png)

如果你现在点击 “Nodes”，可以看到节点创建过程：

![](https://i.imgur.com/4kFbkmh.png)

![](https://i.imgur.com/62wdJI7.png)

等待几分钟，然后返回到 Cluster Dashboard,，你会注意到 CA 完成了工作，因为现在集群正在为所有 600 个副本提供服务：

![](https://i.imgur.com/dtn8SFY.png)

这证明了扩缩操作是有效的。但是你还需要测试缩小操作。转到 “Workload” 并点击与 `busybox-workload` 相关的汉堡菜单。从下拉列表中选择 “Delete”：

![](https://i.imgur.com/gZwxdYU.png)

将会弹出一个窗口，确认删除 `busybox-workload`：

![](https://i.imgur.com/YHYlXWm.png)

通过删除 `busybox-workload`，预期的结果是 CA 开始删除节点。通过返回到 “Nodes” 来验证：

![](https://i.imgur.com/LyMtv5w.png)

默认情况下，CA 会在 10 分钟后开始删除节点。与此同时，你会在 “Nodes” 页面上看到污点，指示哪些节点是待删除的节点。有关这种行为以及如何修改它的更多信息，请阅读 Cluster Autoscaler FAQ 中的 “[CA 在缩减规模时是否遵从 GracefulTermination？](https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/FAQ.md#does-ca-respect-gracefultermination-in-scale-down "CA 在缩减规模时是否遵从 GracefulTermination？")”。

10 分钟后，LKE 集群将恢复到其初始状态，即一个 2GB 节点和一个 4GB 节点：

![](https://i.imgur.com/65dfbHu.png)

你也可以通过返回到 Cluster Dashboard 来确认集群的状态：

![](https://i.imgur.com/Ai5ISZV.png)

现在你已经验证了 Cluster Autoscaler 可以根据需要扩缩和缩减节点。

## CA、Rancher 和托管 Kubernetes services

到目前为止，Cluster Autoscaler 的强大已经变得清晰明了。它可以根据需求自动调整集群中的节点数量，最小化了手动干预的需求。

由于 Rancher 完全支持 Kubernetes Cluster Autoscaler API，因此你可以在常见的服务提供商（如 AKS、Google Kubernetes Engine（GKE）和 Amazon Elastic Kubernetes Service（EKS））上利用此功能。让我们看一个例子来说明这一点。

创建一个新的 workload，类似于以下示例：

![](https://i.imgur.com/Knt8Zxg.png)

这与之前使用的代码相同，只是在这种情况下，有 1000 个 `busybox` 副本，而不是 600 个。几分钟后，集群的容量将被超出。这是因为你设置的配置指定了最多四个 2GB 节点（第一个节点组）和两个 4GB 节点（第二个节点组），即总共六个节点：

![](https://i.imgur.com/uWCr6Vf.png)

前往 Linode 仪表板并手动添加新的节点池：

![](https://i.imgur.com/6lsTqMP.png)

![](https://i.imgur.com/RoiUF3Q.png)

新节点将与其余节点一起显示在 Rancher 的节点页面上：

![](https://i.imgur.com/80SV3Zo.png)

更好的是，由于新节点与第一个节点组（2GB）具有相同的容量，一旦工作负载减少，CA 将删除它。

换句话说，无论底层基础架构如何，Rancher 都可以利用 CA 来了解节点是否由于负载而动态创建或销毁。

总的来说，Rancher 能够在开箱即用的情况下支持 Cluster Autoscaler 是个好消息；它巩固了 Rancher 作为理想的 Kubernetes 多集群管理工具的地位，无论你的组织使用哪个云提供商。此外，Rancher 与其他工具和技术（如 Longhorn 和 Harvester）的无缝集成，将产生一个方便的集中式仪表板，用于管理你的整个超融合基础架构。

## 结论

本教程向你介绍了 Kubernetes Cluster Autoscaler 以及它与其他类型的自动扩缩（如 Vertical Pod Autoscaler（VPA）和 Horizontal Pod Autoscaler（HPA））的不同之处。此外，你还学会了如何在 Kubernetes 上实现 CA，以及它如何调整你的集群大小。

最后，你还简要了解了 Rancher 的潜力，可以从直观的 UI 方便地管理 Kubernetes 集群。Rancher 是 SUSE 丰富生态系统的一部分，SUSE 是领先的开放式 Kubernetes 管理平台。要了解有关 SUSE 开发的其他解决方案的更多信息，如 Edge 2.0 或 NeuVector，请访问 SUSE 官方网站。
