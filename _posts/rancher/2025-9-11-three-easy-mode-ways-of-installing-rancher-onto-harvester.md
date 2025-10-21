---
layout: post
title: 手把手教你在 Harvester 上安装 Rancher 的三种方法
subtitle: 三种简单方式在 Harvester 上安装 Rancher
date: 2025-9-11 11:06:00 +0800
author: Ksd
header-img: img/post-bg-desk.jpg
catalog: true
tags:
  - Rancher
  - Harvester
---

## 引言

大家好！本文将深入探讨 Rancher 的 Harvester，并探索当我们通过统一的 API（即 Kubernetes API）结合基础设施层和编排层时所产生的协同效应。
因此，我们不会再使用传统的与云无关的工具（Terraform、Ansible 等），而是尝试 **仅使用 Kubernetes** 在 Harvester 上部署一个 RKE2 Local 集群，并在该集群上安装 Rancher。理想状态下，我们能通过最少的步骤完成安装，避免复杂的 bash 脚本。

我会额外花一些时间讲解：**如何将一个原本用于 RKE2 节点的基础虚拟机，转换成 HelmChart。** 这部分我会放在单独的文档中，并在对应章节附上链接。

本文需要用到一个 GitHub 仓库中的一些简单代码，目前该仓库位于 [这里](https://github.com/bcdurden/harvester-rancher-install-blog "代码示例仓库地址")。

## Kubernetes CRDs 与 Harvester

Kubernetes 的真正能力不仅仅是运行容器，而在于**它是如何运行容器的**。在 Kubernetes 中，所有资源都通过统一的 API 定义，控制器、调度器等都是通过 API 定义的对象和抽象来运行。这使得 Kubernetes 拥有极强的灵活性，能够适配很多以前需要特殊解决方案的场景。

这些 API 可以通过 `CRD` 进行扩展。这样，像 Rancher 这样的厂商就能在 Kubernetes 内为其应用创建特定的对象。通过这些对象和 API，运维人员可以用自动化和模板化的方式来管理应用。

![Harvester Stack](https://ranchergovernment.com/hs-fs/hubfs/harvester_stack.png?width=4382&height=1838&name=harvester_stack.png)

归根结底，Kubernetes 的真正优势在于它将一切运行和控制的内容都变成 **基础设施即代码 / 配置即代码**。Harvester 作为一个硬件解耦的 HCI（超融合）堆栈，本质上是多个 Kubernetes 产品的组合，并依赖这些统一的 API 来管理所有资源。因此，我们可以在 Harvester 中实现很多在 VMware、Nutanix 或 OpenStack 中做不到的酷炫操作！

## Helm 模板化

由于 Kubernetes 中所有内容都可以通过 `yaml` 或 `json` 配置来定义，我们可以利用各种模板化技术来构建复杂应用，并只公开我们需要的配置参数。

当你定义一个完整应用的配置时，其中会包含大量数据，你可能希望对最终用户隐藏这些细节，甚至希望通过少量输入就可以生成复杂的配置。这时，模板化就能派上用场。

这正是 Helm 的价值所在。Helm 基于 `go-templating`，并提供了额外的选项，使我们能够将复杂应用的配置模板化。

![](https://ranchergovernment.com/hs-fs/hubfs/helm_diagram.png)

想深入了解 Helm，可以去 Helm 官网，里面有很多入门信息。通过 Google 或 ChatGPT 也能找到不少复杂 helmchart 的优秀示例。

## 一个简单的 Harvester HelmChart

由于这部分会比较深入，我单独放在这里讲解：[Basic Helmchart for Harvester](https://github.com/bcdurden/harvester-rancher-install-blog/blob/main/harvester_helmchart.md "Basic Helmchart for Harvester")

## Rancher 安装方式 1: Helm

基于前面提到的 Helm 方法，我编写了一个非常简单的 helmchart，用来描述一个带指定节点数量的 RKE2 集群，并将 Rancher 的静态清单嵌入其中。
注意，这个 chart 是故意简化的，目的是展示流程，而不是功能完整的 helmchart。

### 配置

我已经将该 helmchart 放在 [这里](https://github.com/bcdurden/harvester-rancher-install-blog/blob/main/helm/rke2 "helmchart 示例")，并提供了一个 [demo values 文件](https://github.com/bcdurden/harvester-rancher-install-blog/blob/main/helm/demo_values.yaml "demo values 文件")。其中我嵌入了 `Cert-Manager` 和 `Rancher` 的 HelmChart CRDs 作为静态清单，以确保在 RKE2 `Ready` 后立即安装。

需要修改的配置包括：

- **LoadBalancer** 配置：`control_plane.loadbalancer_gateway`、`control_plane.loadbalancer_subnet`、`control_plane.vip`
- **静态 IP 网络配置**：`control_plane.network`（例子是 Ubuntu，Rocky/RHEL 会有不同）
- **SSH 公钥**：`ssh_pub_key`（确保你拥有对应的密钥对）
- **VM 规格**：`control_plane.cpu_count`、`control_plane.memory_gb`
- **网络名称**：`network_name`（你在 Harvester 中创建的 VM 网络）
- **VM 镜像名称**：`vm.image`
- **Rancher URL**：`control_plane.files[].content`（设置为你能控制的域名或可在 `/etc/hosts` 里配置的地址）

## 安装

配置完成后，将 helmchart 应用到 Harvester 集群即可：

```console
$ cd helm
$ helm install rke2-mgmt -f demo_values.yaml rke2/
NAME: rke2-mgmt
LAST DEPLOYED: Fri Jan 10 14:08:05 2025
NAMESPACE: default
STATUS: deployed
REVISION: 1
TEST SUITE: None
```

在 Harvester UI 中可以看到 3 台 VM 已经启动：

![Type1 Method VM Starting](https://ranchergovernment.com/hs-fs/hubfs/helm-start.png?width=2136&height=962&name=helm-start.png)

几秒钟后，Harvester 会把这些 VM 分配到不同节点并开始启动：

![Type1 Method VM Booting](https://ranchergovernment.com/hs-fs/hubfs/helm-boot.png?width=2124&height=804&name=helm-boot.png)

## 验证

等待一两分钟后，可以通过 SSH 密钥查询 cloud-init 状态，确认 RKE2 何时可用：

```bash
export SSH_PRIVATE_KEY=$HOME/.ssh/infrakey
export RKE2_NODE_IP=10.2.0.21
ssh -i $SSH_PRIVATE_KEY -o UserKnownHostsFile=/dev/null -o StrictHostKeyChecking=no ubuntu@$RKE2_NODE_IP "while [ ! -f /var/lib/cloud/instance/boot-finished ]; do echo 'Waiting for Cloud-Init...'; sleep 5; done"
```

确认 RKE2 已启动后，可以通过以下命令获取 kubeconfig，并将其中的 IP 修改为 VIP：

```bash
export SSH_PRIVATE_KEY=$HOME/.ssh/infrakey
export RKE2_NODE_IP=10.2.0.21
export VIP=$(helm get values rke2-mgmt | grep vip: | awk '{printf $2}')
ssh -i $SSH_PRIVATE_KEY -o UserKnownHostsFile=/dev/null -o StrictHostKeyChecking=no ubuntu@$RKE2_NODE_IP "sudo cat /etc/rancher/rke2/rke2.yaml" 2> /dev/null | \
sed "s/127.0.0.1/${VIP}/g" > kube.yaml
chmod 600 kube.yaml
```

检查节点状态：

```console
$ kubectl --kubeconfig kube.yaml get nodes
NAME             STATUS   ROLES                       AGE   VERSION
rke2-mgmt-cp-0   Ready    control-plane,etcd,master   11m   v1.29.6+rke2r1
rke2-mgmt-cp-1   Ready    control-plane,etcd,master   10m   v1.29.6+rke2r1
rke2-mgmt-cp-2   Ready    control-plane,etcd,master   10m   v1.29.6+rke2r1
```

再检查 Rancher 的状态：

```console
$ kubectl --kubeconfig kube.yaml get po -n cattle-system
NAME                                         READY   STATUS      RESTARTS        AGE
helm-operation-bxftn                         0/2     Completed   0               8m13s
helm-operation-hrwgj                         0/2     Completed   0               8m38s
helm-operation-l87jh                         0/2     Completed   0               7m35s
helm-operation-lrpnt                         0/2     Completed   0               9m10s
helm-operation-mk6zt                         0/2     Completed   0               8m2s
helm-operation-sjvb4                         0/2     Completed   0               7m25s
helm-operation-vnrhf                         0/2     Completed   0               7m5s
helm-operation-xxqgl                         0/2     Completed   0               8m19s
rancher-7d8f64bfc6-8v4wx                     1/1     Running     1 (9m56s ago)   10m
rancher-7d8f64bfc6-rzqnb                     1/1     Running     1 (9m56s ago)   10m
rancher-7d8f64bfc6-z2h6v                     1/1     Running     0               10m
rancher-webhook-bfd464697-rk7dh              1/1     Running     0               7m59s
system-upgrade-controller-646f9548cc-pkzvk   1/1     Running     0               7m32s
```

此时访问我配置的 URL `rancher.lab.sienarfleet.systems`，即可看到 Rancher UI。如果没有 DNS 控制权，可以在本机 `/etc/hosts` 添加一条记录。

![Rancher at Boot screen](https://ranchergovernment.com/hs-fs/hubfs/running_rancher.png?width=2160&height=820&name=running_rancher.png)

我在 Helm values 文件里设置的引导密码是 `admin`，登录后即可看到 Rancher 2.10.1 UI！说明我已经成功用 helmchart 在 RKE2 集群上安装了 Rancher。

![Rancher Running](https://ranchergovernment.com/hs-fs/hubfs/running_rancher2.png?width=2964&height=1436&name=running_rancher2.png)

## 安装 Rancher 方法 2: Fleet

这种方法利用了 Harvester 与 Fleet 的集成。我们将使用在**方法 1**部分中使用的 HelmChart。有两种方式可以实现，一种需要在你的环境中有一个 Git 仓库（如果可以访问互联网，也可以从远程获取），另一种则不需要 Git。

第二种安装方式有点繁琐，除非你可以执行第一种方式并生成第二种方式使用的 `Bundle` CR。原因是第一种方式使用 Fleet 的 GitOps 功能，通过引用包含 RKE2 Helmchart 和 values 的远程 Git 仓库。当 Fleet 消费这些数据时，会在 Harvester/Fleet 中创建一个 `Bundle` 对象。Bundle 用于描述一组已发现的资源及其处理方式，从而实现自动化。第二种方法直接使用 `Bundle`，但手动创建会比较费力。

为了避免这个问题，我提供了一个预构建的 [Bundle](https://github.com/bcdurden/harvester-rancher-install-blog/blob/main/fleet/mgmt.yaml "示例 Bundle")。

在真实生产环境中，我们更可能选择第一种方式，使用真正的 GitOps 方法来管理集群。但为了简单起见，这里直接使用 Bundle。

### 配置

编辑**预构建的 Bundle** 文件并设置值。注意，与纯 Helm 版本不同，我们需要手动在 Bundle CRD 中注入一些值。这些值位于 yaml 路径 `.spec.helm.values` 中。

确保以下内容设置正确：

- **LoadBalancer** 配置：`control_plane.loadbalancer_gateway`、`control_plane.loadbalancer_subnet`、`control_plane.vip`
- **静态 IP 网络配置**：`control_plane.network`（例子是 Ubuntu，Rocky/RHEL 会有不同）
- **SSH 公钥**：`ssh_pub_key`（确保你拥有对应的密钥对）
- **VM 规格**：`control_plane.cpu_count`、`control_plane.memory_gb`
- **网络名称**：`network_name`（你在 Harvester 中创建的 VM 网络）
- **VM 镜像名称**：`vm.image`
- **Rancher URL**：`control_plane.files[].content`（设置为你能控制的域名或可在 `/etc/hosts` 里配置的地址）

### 安装

安装非常简单。只需将 kube 上下文指向你的 Harvester 集群，然后执行：

```bash
kubectl apply -f fleet/mgmt.yaml
```

一旦在 Harvester 中创建了 `Bundle`，Fleet 将立即尝试安装嵌入的 HelmChart。如果配置正确，你应该很快在 Harvester 中看到虚拟机开始启动。

### 验证

当 Helm 创建 RKE2 集群后，你可以等待第一个节点上线（等待 cloud-init 完成）。正确设置环境变量：

```bash
export SSH_PRIVATE_KEY=$HOME/.ssh/infrakey
export RKE2_NODE_IP=10.2.0.21
ssh -i $SSH_PRIVATE_KEY -o UserKnownHostsFile=/dev/null -o StrictHostKeyChecking=no ubuntu@$RKE2_NODE_IP "while [ ! -f /var/lib/cloud/instance/boot-finished ]; do echo 'Waiting for Cloud-Init...'; sleep 5; done"
```

安装过程依次为：RKE2 -> Cert-manager -> Rancher。在我的系统上，总共大约 7 分钟（非 airgap 环境）。如果是 airgap，速度更快（5 分钟以内）。

当第一个节点准备就绪后，可以使用以下命令从节点获取 kubeconfig，并设置 VIP 值：

```bash
export SSH_PRIVATE_KEY=$HOME/.ssh/infrakey
export RKE2_NODE_IP=10.2.0.21
export VIP=$(helm get values mgmt-cluster | grep vip: | awk '{printf $2}')
ssh -i $SSH_PRIVATE_KEY -o UserKnownHostsFile=/dev/null -o StrictHostKeyChecking=no ubuntu@$RKE2_NODE_IP "sudo cat /etc/rancher/rke2/rke2.yaml" 2> /dev/null | \
sed "s/127.0.0.1/${VIP}/g" > kube.yaml
chmod 600 kube.yaml
```

检查节点状态：

```console
$ kubectl --kubeconfig kube.yaml get nodes
rke2-mgmt-cp-0   Ready    control-plane,etcd,master   2m22s   v1.29.6+rke2r1
rke2-mgmt-cp-1   Ready    control-plane,etcd,master   65s     v1.29.6+rke2r1
rke2-mgmt-cp-2   Ready    control-plane,etcd,master   73s     v1.29.6+rke2r1
```

检查 Rancher 状态：

```console
$ kubectl --kubeconfig kube.yaml get po -n cattle-system
NAME                              READY   STATUS      RESTARTS   AGE
helm-operation-67v2c              0/2     Completed   0          66s
helm-operation-9hmjw              0/2     Completed   0          80s
helm-operation-9l4kh              0/2     Completed   0          27s
helm-operation-lcfkf              0/2     Completed   0          37s
rancher-7d8f64bfc6-4hcqx          1/1     Running     0          2m5s
rancher-7d8f64bfc6-vkph6          1/1     Running     0          2m5s
rancher-7d8f64bfc6-zd7tr          1/1     Running     0          2m5s
rancher-webhook-bfd464697-fzhlr   1/1     Running     0          24s
```

此时，你可以访问 UI 并像方法 1 一样验证：

![Rancher at Boot screen](<https://ranchergovernment.com/hs-fs/hubfs/running_rancher%20(1).png?width=2084&height=1268&name=running_rancher%20(1).png>)

使用 `admin` 引导密码登录 Rancher，成功！

![Rancher Running](https://ranchergovernment.com/hs-fs/hubfs/helm-start.png?width=2136&height=962&name=helm-start.png)

## 安装 Rancher 方法 3: CAPI

此方法涵盖 Harvester 的实验性 PoC 插件，可直接在 Harvester 内安装 RKE2 集群，无需外部工具或依赖。它会在集群上安装完整版的 Rancher。过去通常使用 Terraform 或 Ansible，现在不需要使用它们了。

### 说明

ClusterAPI（CAPI）基于使用 Kubernetes 集群创建下游集群的概念。大部分使用模式都从 KinD（Kubernetes in Docker）集群开始。KinD 和 K3D 类似，都需要现有基础设施（如笔记本或虚拟机），并且必须运行 Docker。

鉴于 Harvester 已运行 Kubernetes，我希望能在 Harvester 上运行 CAPI，而不影响 Harvester 自带的 Rancher 组件（Harvester 内有精简版 Rancher，用于故障排查）。

我选择使用 vCluster 创建隔离的临时集群。它在 Harvester RKE2 集群内部的单个 Pod 内创建集群，并映射外部 ingress/egress。vCluster 可创建 CAPI bootstrap 集群，然后指向本地 Harvester 安装 RKE2 集群。这里不使用 Helm 或其他工具，仅使用 CAPI Operator。

CAPI 基于 `Providers` 拓扑，包括基础设施 Provider、Bootstrap Provider 等。我们使用 Harvester `Infrastructure Provider`（Beta）和 RKE2 `ControlPlane Provider`（GA）。

#### 限制

- Harvester Infra Provider 需要嵌入 Harvester kubeconfig（base64），CPU 数量不准确（bug 导致核心数 ^3），负载均衡要求 DHCP，agentConfig.additionalUserData 不可用，无法管理静态 IP，UEFI 系统不支持。
- Harvester Addon UI 元素硬编码，自定义 Addon 需手动编辑 yaml。
- RKE2 ControlPlane Provider 不考虑 IPAM，节点命名不可预测。
- CAPI 将节点断电视为异常，不太适合边缘 Kubernetes。

#### 已知问题

- vCluster 使用 StatefulSet，默认不清理卷，重复使用会恢复现有状态而非重新安装，需要手动删除 PVC。

### 安装

Harvester 的 RKE2 和 Rancher 组件提供许多 CRD，包括 `HelmChart`。`Bundle` 本质上封装了 HelmChart，也可直接创建 `Addon` CRD。

#### Addon 模式

安装 Addon：

```bash
kubectl apply -f capi/addon.yaml
```

在 Harvester UI 高级菜单 -> Addons 中启用 `rancher-embedded`，点击 `Edit Config`，选择 `Edit Yaml` 编辑：

```yaml
vm_network_name: ""
ssh_keypair: ""
vm_image_name: ""
vm_default_user: ""
harvester_vip: ""
rancher_url: ""
harvester_kubeconfig_b64: ""
```

- `harvester_kubeconfig_b64`：下载 Harvester kubeconfig 并 base64 编码
  Linux: `cat ~/Downloads/local.yaml | base64 -w0`
  MacOS: `cat ~/Downloads/local.yaml | base64`

编辑完成后保存。

#### HelmChart CRD 模式

使用 [helmchart 文件](https://github.com/bcdurden/harvester-rancher-install-blog/blob/main/capi/helmchart.yaml "helmchart 文件")：

```bash
rt VM_IMAGE_NAME="ubuntu"
export VM_DEFAULT_USER="ubuntu"
export HARVESTER_VIP="10.2.0.20"
export RANCHER_URL="rancher.lab.sienarfleet.systems"
export HARVESTER_CONTEXT_NAME=lab
export HARVESTER_KUBECONFIG_B64=$(kubectl config use-context ${HARVESTER_CONTEXT_NAME} &>/dev/null && kubectl config view --minify --flatten | yq '.contexts[0].name = "'${HARVESTER_CONTEXT_NAME}'"' | yq '.current-context = "'${HARVESTER_CONTEXT_NAME}'"' | yq '.clusters[0].name = "'${HARVESTER_CONTEXT_NAME}'"' | yq '.contexts[0].context.cluster = "'${HARVESTER_CONTEXT_NAME}'"' | base64 -w0); \

cat helmchart.yaml | envsubst | kubectl apply -f -
```

### 验证

Harvester 会先在裸机 RKE2 集群中安装 vCluster。然后 CAPI 组件启动，逐步创建 RKE2 客户端节点。可用 `watch kubectl get po` 监视进度。

最终状态示例：

```console
$ kubectl get po
NAME                                                              READY   STATUS             RESTARTS         AGE
bootstrap-cluster-cluster-api-operator-bfcf86f56-54q-978a8b9abb   1/1     Running            0                3m44s
caphv-controller-manager-b64f46f7b-w5b87-x-caphv-sys-66f8057b1a   2/2     Running            0                2m55s
capi-controller-manager-c4479f749-62j2c-x-capi-syste-f97a3e30d8   1/1     Running            0                3m17s
cert-manager-5d58d69944-hflsl-x-cert-manager-x-rancher-embedded   1/1     Running            0                4m36s
cert-manager-cainjector-54985976df-jpdjx-x-cert-mana-b5e7d084b7   1/1     Running            0                4m36s
cert-manager-webhook-5fcfcd455-2tbff-x-cert-manager--5585ffcae7   1/1     Running            0                4m37s
coredns-5964bd6fd4-ppnd4-x-kube-system-x-rancher-embedded         1/1     Running            0                4m45s
helm-install-bootstrap-cluster-hlll2-x-default-x-ran-d190cab10a   0/1     Completed          3                4m45s
helm-install-cert-manager-c25q6-x-default-x-rancher-embedded      0/1     Completed          0                4m45s
helm-install-rancher-embedded-m22c9                               0/1     Completed          0                5m18s
rancher-embedded-0                                                1/1     Running            0                5m13s
rke2-bootstrap-controller-manager-d7ff5c66b-s8rkd-x--ca2813698c   1/1     Running            0                2m49s
rke2-control-plane-controller-manager-7f6559b6bd-plw-b5d3f978b8   1/1     Running            0                2m49s
virt-launcher-rke2-mgmt-cp-machine-r2dcm-q649c                    2/2     Running            0                2m34s
```

获取 LoadBalancer IP，用于设置 DNS，例如 10.2.0.117，并在 `/etc/hosts` 中临时添加条目。使用 bootstrap 密码（admin）登录 Rancher：

![Rancher at Boot screen](https://ranchergovernment.com/hs-fs/hubfs/lb.png?width=2148&height=674&name=lb.png)
![Rancher Running](https://ranchergovernment.com/hs-fs/hubfs/rancher-running.png?width=2308&height=996&name=rancher-running.png)

我登录并看到 Rancher UI，看起来一切都在运行！

![](https://ranchergovernment.com/hs-fs/hubfs/rancher-running2.png?width=2974&height=1456&name=rancher-running2.png)

## 总结

这篇文章到此结束，我希望能够引导深入思考，使用 Harvester 等解决方案，基础设施自动化的未来将会是什么样子。新的模式正在涌现，简化我们的工作方式，并增强我们实现自动化的能力。祝你使用愉快！
