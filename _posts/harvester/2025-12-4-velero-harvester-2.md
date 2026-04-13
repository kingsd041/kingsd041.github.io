---
layout: post
title: 使用 Velero 通过外部 CSI 存储备份和恢复 SUSE Virtualization VM
subtitle:
date: 2025-12-4 11:06:00 +0800
author: Ksd
header-img: img/post-bg-desk.jpg
catalog: true
tags:
  - Harvester
---

SUSE Virtualization 1.5 引入了使用外部 CSI 来提供虚拟机 root 卷和数据卷的能力。

本文展示了如何使用 [Velero 1.16.0](https://velero.io/ "Velero 官网") 在 SUSE Virtualization 中执行虚拟机的备份与恢复。

文中通过命令和清单示例演示如何：

- 备份命名空间中的虚拟机、NFS CSI 卷以及相关的命名空间级别配置
- 将备份文件导出到 AWS S3 bucket
- 恢复到同一集群上的不同命名空间。
- 恢复到其他集群
- 使用 filesystem freeze 确保备份过程中的数据一致性（进阶内容）

Velero 是一个 Kubernetes 原生的备份与恢复工具，用户能够将虚拟机按计划或按需备份到外部对象存储（例如 S3、Azure Blob 或 GCS），符合企业级备份和灾难恢复实践。

> 注意：本文中的命令和清单已在 SUSE Virtualization 1.6.1 中通过测试。
>
> CSI NFS 驱动以及 Velero 的配置和版本仅用于演示，请根据你的实际环境和需求进行调整。

> 重要提示：本文示例旨在备份和恢复 Linux 虚拟机工作负载。不适用于通过 Harvester Rancher 集成创建的 guest cluster 备份。
>
> 若要备份和恢复如 RKE2 等 guest cluster，请参考对应发行版的官方文档。

## SUSE Virtualization 安装

请参考 [Harvester 文档](https://docs.harvesterhci.io/v1.6/install/requirements "Harvester 安装要求") 了解安装要求和选项。

## 安装并配置 Velero

下载 [Velero CLI](https://velero.io/docs/v1.16/basic-install/#install-the-cli "Velero CLI")。

设置以下 shell 变量：

```bash
BUCKET_NAME=<your-s3-bucket-name>
BUCKET_REGION=<your-s3-bucket-region>
AWS_CREDENTIALS_FILE=<absolute-path-to-your-aws-credentials-file>
```

在 SUSE Virtualization 集群中安装 Velero：

```bash
velero install \
  --provider aws \
  --features=EnableCSI \
  --plugins "velero/velero-plugin-for-aws:v1.12.0,quay.io/kubevirt/kubevirt-velero-plugin:v0.7.1" \
  --bucket "${BUCKET_NAME}" \
  --secret-file "${AWS_CREDENTIALS_FILE}" \
  --backup-location-config region="${BUCKET_REGION}" \
  --snapshot-location-config region="${BUCKET_REGION}" \
  --use-node-agent
```

- 此配置中，Velero 被设置为：

  - 运行在 `velero` 命名空间中
  - 启用 CSI 卷快照 API
  - 启用内置的 node agent 数据移动控制器和 pod
  - 使用 `velero-plugin-for-aws` 插件管理与 S3 对象存储的交互
  - 使用 `kubevirt-velero-plugin` 插件备份和恢复 KubeVirt 资源
  - 通过以下命令确认 Velero 已成功安装并运行：

```
kubectl -n velero get po

NAME                      READY   STATUS    RESTARTS         AGE
node-agent-875mr          1/1     Running   0                1d
velero-745645565f-5dqgr   1/1     Running   0                1d
```

配置 `velero` CLI 在输出中显示 CSI 对象的备份和恢复状态：

```
velero client config set features=EnableCSI
```

## 部署 NFS CSI 和 NFS Server

根据 [NFS CSI 文档](https://github.com/kubernetes-csi/csi-driver-nfs/blob/master/deploy/example/README.md "NFS CSI 文档") 部署 NFS CSI 驱动、存储类以及示例 NFS Server。还需根据[文档](https://github.com/kubernetes-csi/csi-driver-nfs/tree/master/deploy/example/snapshot "启用 NFS CSI 卷快照")启用 NFS CSI 卷快照功能。

确认 NFS CSI 和 NFS Server 已启动：

```
kubectl get po -A -l 'app in (csi-nfs-node,csi-nfs-controller,nfs-server)'

NAMESPACE     NAME                                  READY   STATUS    RESTARTS    AGE
default       nfs-server-b767db8c8-9ltt4            1/1     Running   0           1d
kube-system   csi-nfs-controller-5bf646f7cc-6vfxn   5/5     Running   0           1d
kube-system   csi-nfs-node-9z6pt                    3/3     Running   0           1d
```

默认的 NFS CSI 存储类名为 `nfs-csi`：

```
kubectl get sc nfs-csi

NAME      PROVISIONER      RECLAIMPOLICY   VOLUMEBINDINGMODE   ALLOWVOLUMEEXPANSION   AGE
nfs-csi   nfs.csi.k8s.io   Delete          Immediate           true                   14d
```

确认默认的 NFS CSI 卷快照类 `csi-nfs-snapclass` 已安装：

```
kubectl get volumesnapshotclass csi-nfs-snapclass
NAME                DRIVER           DELETIONPOLICY   AGE
csi-nfs-snapclass   nfs.csi.k8s.io   Delete           14d
```

## 准备虚拟机与镜像

创建自定义命名空间 `demo-src`：

```
kubectl create ns demo-src
```

根据 [Image Management](https://docs.harvesterhci.io/v1.5/image/upload-image/#upload-images-via-url "Harvester 上传镜像") 的说明，从 https://cloud-images.ubuntu.com/minimal/releases/noble/ 上传 Ubuntu 24.04 raw 镜像到 SUSE Virtualization。

根据 [第三方存储支持](https://docs.harvesterhci.io/v1.5/advanced/csidriver#virtual-machine-image-creation "Harvester 虚拟机镜像创建") 文档，镜像的存储类必须设置为 `nfs-csi`。

确认虚拟机镜像已成功上传：

![](https://www.suse.com/c/wp-content/uploads/2025/12/vm-image-1024x334.png)

根据第三方存储支持文档，基于上一步上传的镜像创建使用 NFS root 卷与数据卷的虚拟机。

为了使 NFS CSI snapshot 可用，NFS 数据卷必须将 `volumeMode` 设置为 `Filesystem`：

![](https://www.suse.com/c/wp-content/uploads/2025/12/vm-create-1024x747.png)

> 说明（可选）：用于测试时，当虚拟机准备就绪后，可通过 SSH 登录并向 root 卷及数据卷写入一些文件。
>
> 数据卷需要先分区、格式化并挂载后，才能写入文件。

## 备份源命名空间

使用 `Velero` CLI 和 Velero 内置的数据移动工具创建 `demo-src` 命名空间的备份：

```
BACKUP_NAME=backup-demo-src-`date "+%s"`

velero backup create "${BACKUP_NAME}" \
  --include-namespaces demo-src \
  --snapshot-move-data
```

备份将创建 `demo-src` 命名空间的备份，包括虚拟机、卷、secret 及其他所有关联配置。

备份耗时取决于虚拟机及卷大小。

可以通过 `DataUpload` 自定义资源查看备份进度：

```
kubectl -n velero get datauploads -l velero.io/backup-name="${BACKUP_NAME}"
```

确认备份成功完成：

```
velero backup get "${BACKUP_NAME}"

NAME                         STATUS      ERRORS   WARNINGS   CREATED                         EXPIRES   STORAGE LOCATION   SELECTOR
backup-demo-src-1747954979   Completed   0        0          2025-05-22 16:04:46 -0700 PDT   29d       default            <none>
```

备份完成后，Velero 会删除存储侧的 CSI snapshots，以释放快照占用空间。

> 提示：可以使用 `velero backup describe` 和 `velero backup logs` 来查看备份包含的资源、被跳过的资源，以及备份期间可能出现的警告和错误。

## 恢复到其他命名空间

本节展示如何将来自 `demo-src` 命名空间的备份恢复到新命名空间 `demo-dst`。

保存以下 restore modifier 为本地文件 `modifier-data-volumes.yaml`：

```
version: v1
resourceModifierRules:
- conditions:
    groupResource: persistentvolumeclaims
    matches:
    - path: /metadata/annotations/harvesterhci.io~1volumeForVirtualMachine
      value: "\"true\""
  patches:
  - operation: remove
    path: /metadata/annotations/harvesterhci.io~1volumeForVirtualMachine
```

该 restore modifier 会移除虚拟机数据卷上的 `harvesterhci.io/volumeForVirtualMachine` 注解，以避免恢复时与 CDI 卷导入 populator 冲突。

创建 restore modifier：

```
kubectl -n velero create cm modifier-data-volumes --from-file=modifier-data-volumes.yaml
```

设置备份名变量：

```
BACKUP_NAME=backup-demo-src-1747954979
```

启动恢复操作：

```
velero restore create \
  --from-backup "${BACKUP_NAME}" \
  --namespace-mappings "demo-src:demo-dst" \
  --exclude-resources "virtualmachineimages.harvesterhci.io" \
  --resource-modifier-configmap "modifier-data-volumes" \
  --labels "velero.kubevirt.io/clear-mac-address=true,velero.kubevirt.io/generate-new-firmware-uuid=true"
```

- 在恢复期间：

  - 虚拟机 MAC 地址与 firmware UUID 会被重置，以避免与现有虚拟机冲突
  - 因为 Velero 会恢复虚拟机的完整状态，所以跳过恢复虚拟机镜像资源
  - restore modifier 会修改虚拟机数据卷的 metadata，避免与 CDI 导入 populator 冲突

恢复进行中时，可以通过 `DataDownload` 自定义资源查看进度：

```
RESTORE_NAME=backup-demo-src-1747954979-20250522164015

kubectl -n velero get datadownload -l velero.io/restore-name="${RESTORE_NAME}"
```

确认恢复已成功完成：

```
velero restore get

NAME                                        BACKUP                       STATUS      STARTED                         COMPLETED                       ERRORS   WARNINGS   CREATED                         SELECTOR
backup-demo-src-1747954979-20250522164015   backup-demo-src-1747954979   Completed   2025-05-22 16:40:15 -0700 PDT   2025-05-22 16:40:49 -0700 PDT   0        6          2025-05-22 16:40:15 -0700 PDT   <none>
```

确认虚拟机及其配置已恢复至 `demo-dst`：

![](https://www.suse.com/c/wp-content/uploads/2025/12/vm-restore-v2-1024x428.png)

> 注意：Velero 默认使用 Kopia 作为数据移动工具。Kopia 对部分高级文件系统特性（如 setuid/gid、硬链接、挂载点、socket、xattr、ACL 等）仍有限制。
>
> Velero 提供 `--data-mover` 选项以配置自定义数据移动工具，以适配不同场景，详见[文档](https://velero.io/docs/v1.16/csi-snapshot-data-movement/#customized-data-movers "Velero 数据迁移")。

> 提示：可通过 `velero restore describe` 和 `velero restore logs` 获取恢复的资源、跳过的资源、警告和错误等详细信息。

## 恢复到其他集群

本节在上述示例基础上展示如何将备份恢复到另一个 SUSE Virtualization 集群。

在目标集群中安装 Velero，并按照 “部署 NFS CSI 和 NFS Server” 章节设置 NFS CSI 和 NFS server。

只要 Velero 被配置成使用与源集群相同的备份位置，它会自动发现可用的备份：

```
velero backup get

NAME                         STATUS      ERRORS   WARNINGS   CREATED                         EXPIRES   STORAGE LOCATION   SELECTOR
backup-demo-src-1747954979   Completed   0        0          2025-05-22 16:04:46 -0700 PDT   29d       default            <none>
```

按照 “恢复到其他命名空间” 中的步骤，在目标集群上执行恢复。

如果希望恢复到目标集群的原命名空间 `demo-src`，则移除 `--namespace-mappings` 选项。

确认虚拟机及配置已恢复到目标集群的 `demo-src` 命名空间：

![](https://www.suse.com/c/wp-content/uploads/2025/12/vm-migrate-1024x367.png)

## 限制

本节所描述的限制相关的改进措施已在 https://github.com/harvester/harvester/issues/8367 上进行了跟踪。

- 默认情况下，Velero 仅支持根据资源组和标签进行 [资源过滤](https://velero.io/docs/v1.16/resource-filtering/ "Velero 资源过滤")。若要备份或恢复单个虚拟机实例，必须手动为虚拟机及其相关资源（VMI、pod、data volume、PVC、PV、`cloudinit` secret）添加自定义标签。建议备份整个命名空间，并在恢复过程中通过过滤选择需要的资源，以确保备份包含虚拟机运行所需的全部依赖资源。
- 虚拟机镜像的恢复目前尚未完全支持。

## 进阶内容：通过文件系统冻结确保数据一致性

在某些场景下，为防止数据损坏（例如虚拟机正在进行大量 I/O 操作），你可能需要在 Velero 创建备份期间让虚拟机的文件系统进入冻结状态。本节介绍如何自定义 [Velero Backup Hooks](https://velero.io/docs/v1.17/backup-hooks/ "Velero Backup Hooks") 以在备份过程中执行文件系统冻结，从而确保备份内容的数据一致性。

### 背景：KubeVirt virt-freezer

KubeVirt 的 [virt-freezer](https://github.com/kubevirt/kubevirt/blob/main/docs/freeze.md#virt-freezer "KubeVirt virt-freezer") 提供冻结和解冻 guest 文件系统的机制，可以用于确保虚拟机备份期间的文件系统一致性。但文件系统冻结/解冻的正常工作需要满足一定条件。

**文件系统冻结的先决条件**

- 必须在 Guest VM 中启用 **QEMU Guest Agent**

  - 可以通过检查 VMI 的状态中是否存在 `AgentConnected` 来确认

- Guest VM 必须为相关的 libvirt 命令正确配置

- 当触发 virt-freezer 时，KubeVirt 会通过 libvirt 命令（例如 `guest-fsfreeze-freeze`）与 QEMU Guest Agent 通信
- guest agent 会将这些命令转换为特定操作系统的调用：

  - **Linux 系统：** 使用 `fsfreeze` 系统调用
  - **Windows 系统：** 使用 **VSS（Volume Shadow Copy Service）** API

**常见配置挑战**

根据 SUSE Virtualization 项目的经验，一些操作系统需要额外配置：

- **Linux 发行版**（例如 RHEL、SLE Micro）：默认情况下可能缺少执行文件系统冻结操作所需的权限，需要自定义策略
- **Windows Guest：** 必须启用 VSS 服务才能使用文件系统冻结功能

> **重要提示：** 文件系统冻结/解冻功能依赖于 guest VM 的内部配置，不属于 SUSE Virtualization 可控范围。用户有责任在使用带有文件系统冻结的 Velero 备份钩子之前确保 Guest OS 兼容。

**验证文件系统冻结的兼容性**

要确认虚拟机是否支持文件系统冻结操作：

1. 进入虚拟机对应的 virt-launcher 的 `compute` 容器：

```
POD=$(kubectl get pods -n <VM Namespace> \
  -l vm.kubevirt.io/name=<VM Name> \
  -o jsonpath='{.items[0].metadata.name}')
kubectl exec -it $POD -n default -c compute -- bash
```

2. 使用 compute 容器中提供的 virt-freezer 工具测试文件系统冻结：

```
virt-freezer --freeze --namespace <VM namespace> --name <VM name>
```

3. **关键：** 始终检查冻结操作结果，并务必在进行其他操作之前解冻虚拟机文件系统

### 为虚拟机备份实现文件系统冻结钩子

Velero 支持 pre/post 备份钩子，可以与 KubeVirt 的 virt-freezer 集成，以确保虚拟机备份期间的数据一致性。

**配置虚拟机模板注解**

对于所有需要数据一致性的虚拟机，在 VM 模板中添加以下注解：

```
apiVersion: kubevirt.io/v1
kind: VirtualMachine
metadata:
  name: vm-nfs
  namespace: demo
spec:
  template:
    metadata:
      annotations:
        # 这些注解将应用到 virt-launcher pod
        pre.hook.backup.velero.io/command: '["/usr/bin/virt-freezer", "--freeze", "--namespace", "<VM Namespace>", "--name", "<VM Name>"]'
        pre.hook.backup.velero.io/container: compute
        pre.hook.backup.velero.io/on-error: Fail
        pre.hook.backup.velero.io/timeout: 30s

        post.hook.backup.velero.io/command: '["/usr/bin/virt-freezer", "--unfreeze", "--namespace", "<VM Namespace>", "--name", "<VM Name>"]'
        post.hook.backup.velero.io/container: compute
        post.hook.backup.velero.io/timeout: 30s
    spec:
      # ...rest of VM spec...
```

这些注解将被传递到 virt-launcher pod，并通知 Velero：

- 在备份开始前冻结 VM 文件系统
- 在备份完成后解冻文件系统

> 将 `<VM Namespace>` 和 `<VM Name>` 替换为实际虚拟机的命名空间和名称。

### 使用文件系统冻结创建 Velero 备份

在将上述 Velero pre/post 钩子添加到 VM 清单后，按照本文前面部分的备份流程操作即可。

**验证钩子是否成功执行**

如果 guest VM 配置正确，Velero 备份会成功完成，并显示 `HooksAttempted` 表示钩子执行成功。

使用以下命令检查备份状态：

```
velero backup describe [Backup Name] --details
```

示例输出（显示钩子执行成功）：

```
Name:         demo
Namespace:    velero
Labels:       velero.io/storage-location=default
Annotations:  velero.io/resource-timeout=10m0s
              velero.io/source-cluster-k8s-gitversion=v1.33.3+rke2r1
              velero.io/source-cluster-k8s-major-version=1
              velero.io/source-cluster-k8s-minor-version=33

Phase:  Completed

...

HooksAttempted:  2
HooksFailed:     0
```

该输出表示 Velero pre/post 备份钩子成功执行。在此场景中，钩子与 guest VM 的文件系统冻结/解冻操作相连，以确保数据一致性。

## 排查文件系统冻结问题

如果你在使用文件系统冻结时遇到问题：

1. 检查 VMI 中的 QEMU Guest Agent 状态
2. 检查 guest OS 是否正确配置以支持文件系统冻结
3. 查看 Velero 钩子的日志中是否有错误信息
4. 按验证步骤手动执行 virt-freezer 进行测试

## 总结

本指南涵盖了使用 Velero 结合外部 CSI 存储备份与恢复 SUSE Virtualization 虚拟机的完整流程：

**基础操作：**

- 为 VM 备份和恢复配置外部 CSI 驱动（如 NFS）
- 创建带有 CSI 卷快照与数据迁移的命名空间级备份
- 在同一集群中恢复到不同命名空间
- 使用兼容 S3 的存储，在不同 SUSE Virtualization 集群之间迁移虚拟机

**高级数据一致性：**

- 使用 KubeVirt virt-freezer 实现文件系统冻结/解冻钩子
- 为高 I/O 虚拟机确保时间点一致性

通过结合 Velero 强大的备份功能和正确的文件系统静默（quiescing）技术，你可以构建一个完善的 SUSE Virtualization 灾难恢复策略。从基础备份到严格一致性的企业场景，这套方法都能满足需求。
