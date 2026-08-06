---
layout: post
title: 打通 guest 集群与 Longhorn 存储——Harvester CSI 驱动配置笔记
subtitle:
date: 2026-6-29 16:20:00 +0800
author: Ksd
header-img: img/post-bg-desk.jpg
catalog: true
tags:
  - Harvester
---

在 SUSE Virtualization（Harvester） 里跑 guest Kubernetes 集群，可以说是鱼和熊掌兼得——既有裸金属的性能，又有虚拟机的灵活性。这是一种很常见的玩法：把 Rancher 和下游节点都当作 guest 虚拟机部署好之后，接下来要面对的问题就是——怎么让这些 guest 集群用上宿主机的存储（SUSE Storage（Longhorn））。

如果你翻过 SUSE Rancher 的应用市场（Apps Marketplace），大概率已经留意到 Harvester CSI Driver 这个 Helm chart。这个驱动依赖 Linux 内核里的存储工具（具体来说是 iSCSI），把 Harvester 底层 Longhorn 引擎提供的块存储直接热插拔到 guest 节点上。

下面这份实战笔记就来讲讲，怎么在 Ubuntu、RHEL、SLES 混搭的多操作系统 guest 环境里把 Harvester CSI 驱动配置好。

## 有没有更省事的方式？

有的！如果你是用 **Harvester node driver** 来创建集群的，那它其实已经预先选好了，并且会自动完成配置：

![](https://www.suse.com/c/wp-content/uploads/2026/06/harvester-provider-node-1024x542.png)

在这里点一下，就搞定了！

![](https://www.suse.com/c/wp-content/uploads/2026/06/harvester-provider-1024x661.png)

![](https://www.suse.com/c/wp-content/uploads/2026/06/harvester-provider-2-1024x661.png)

不过，如果你用的是 **Create Custom** 选项，那就只算完成了一半。你只需要在对话框里选择 Harvester 作为 Cloud Provider，再提供一份 cloud-init 文件，把访问 Harvester 集群的配置写到 `/var/lib/rancher/rke2/etc/config-files/cloud-provider-config` 路径下即可。

如果你是要在一个**已经存在的** guest 集群上安装，那就接着往下看吧！

## 准备 guest 节点

动手装 Helm chart 之前，得先把基础打好。Longhorn 是通过网络以 iSCSI 的方式提供块存储的，所以 guest Rancher 集群里**每一台** Linux 节点都必须把 iSCSI initiator 跑起来。SSH 登录到你的 guest 节点，根据发行版的不同执行对应命令：

### SLES / openSUSE

进到 SLES 节点，用 `zypper`：

```bash
# zypper install -y open-iscsi
# systemctl enable --now iscsid
```

> **关于 RWX（ReadWriteMany）卷的重要提示**：如果你打算用 Harvester CSI 较新的共享文件系统功能（底层依赖 NFS），那 SLES 上还得把 NFS 客户端包装上：`sudo zypper install -y nfs-client`。

### Ubuntu / Debian

```bash
# apt-get update
# apt-get install -y open-iscsi nfs-common
# systemctl enable --now iscsid
```

### RHEL / CentOS / Rocky Linux

```bash
# yum install -y iscsi-initiator-utils nfs-utils
# systemctl enable --now iscsid
```

## 第 1 步：在 Harvester 宿主机上生成 cloud config

Harvester CSI 驱动需要自己的身份凭证——它靠一个特定的 service account token 来向 Harvester API 做安全认证。这份配置文件我们直接在 Harvester 宿主集群的管理面生成。

1. 找一台能用 `kubectl` 访问 Harvester 宿主集群的终端。
2. 下载并运行 Harvester 官方提供的生成脚本：

```bash
# curl -LO https://raw.githubusercontent.com/harvester/harvester-csi-driver/master/deploy/generate_addon_csi.sh
# chmod +x generate_addon_csi.sh
```

脚本后面要带这几个参数：`<guest-cluster-name>` `<harvester-namespace-of-vms>` `[RKE2|k3s]`

```bash
# ./generate_addon_csi.sh my-mixed-cluster default RKE2
```

（提示：如果你的 guest 集群是用 K3s 而不是 RKE2 搭的，把脚本最后一个参数从 `RKE2` 换成 `k3s` 就行。）

脚本会输出一段结构化的配置数据，说明如何访问 Harvester 集群。把 `### cloud-config ###` 和 `### cloud-init user data ##` 这两个标记之间的内容复制出来，存成一个名叫 `cloud-provider-config` 的文件。

## 第 2 步：把配置注入 guest 集群

不管节点跑的是 SLES、Ubuntu 还是 RHEL，Helm chart 都会到 guest 节点本地去找这个 token，好让 DaemonSet 的 pod 把它挂载进去。这里有两种方式。

### 方式 A：走 cloud-init（推荐）

如果你是通过 Rancher 的 provisioning UI 来部署 guest 集群的，那就可以在所有节点模板里把这个步骤自动化。把脚本的输出直接粘到 `### cloud-init user data ###` 标记之后，放进 **Machine Pools > Show Advanced > User Data (Cloud-init)** 这一栏。这样一来，将来集群自动扩容、加入更多 SLES 或 Ubuntu 节点时，它们一启动就自带这套存储配置了。

顺手再加点东西，把下面这段 `runcmd` 放进 cloud-init，连装包、起服务这一步也一起自动化掉：

```yaml
runcmd: 
  # 1. Detect the OS package manager and install iSCSI + NFS packages gracefully 
  - | 
    if command -v zypper &> /dev/null; then 
      echo "SUSE Linux Enterprise Server detected"
      zypper install -y open-iscsi nfs-client 
    elif command -v apt-get &> /dev/null; then 
      echo "Ubuntu/Debian detected" 
      apt-get update && apt-get install -y open-iscsi nfs-common 
    elif command -v dnf &> /dev/null || command -v yum &> /dev/null; then 
      echo "RHEL/Rocky/CentOS detected" 
      yum install -y iscsi-initiator-utils nfs-utils 
    fi  
  # 2. Enable and start the iSCSI daemon required by Longhorn 
  - systemctl daemon-reload 
  - systemctl enable --now iscsid
```

### 方式 B：手动配置

如果集群已经跑起来了，你更想手动来，那就把脚本的输出粘到**每一台** guest 节点上下面这个路径：

```bash
# mkdir -p /var/lib/rancher/rke2/etc/config-files
# vim /var/lib/rancher/rke2/etc/config-files/cloud-provider-config
```

## 第 3 步：部署 Harvester CSI 驱动

SLES 和其他 Linux 节点上的 OS 层依赖都搞定之后，就可以真正上手装这个 Helm chart 了。

### 方式 1：用 Helm CLI

把 kubeconfig 指向你的 guest 集群，依次执行下面的命令：添加仓库，然后把 chart 装到 `kube-system` 命名空间里：

```bash
# helm repo add harvester https://charts.harvesterhci.io/
# helm repo update

# helm install harvester-csi-driver harvester/harvester-csi-driver \
  --namespace kube-system
```

### 方式 2：用 Rancher 控制台

1. 打开 Rancher UI，切换到你的 guest 集群上下文。
2. 进入 **Apps > Charts**，搜索 **Harvester CSI Driver**。
3. 点击 **Install**。
4. 默认值原样保留就行——chart 会自动去找我们在第 2 步填好的那个文件路径。

## 重要提醒：如果你启用了 SELinux

在当前版本的 Helm chart 上，如果你用的是默认开启 SELinux 的系统（比如 SLES 16.0），会遇到一个问题：pod 在访问内部通信 socket 时会陷入 CrashLoopBackOff。

解决办法是执行：

```bash
# kubectl patch deployment harvester-csi-driver-controllers -n kube-system \
  --type=merge \
  -p '{"spec":{"template":{"spec":{"securityContext":{"seLinuxOptions":{"type":"spc_t"}}}}}}'
```

## 第 4 步：验证与冒烟测试

Helm 部署跑完之后，驱动会自动在你的 guest 集群里注册一个新的默认 `StorageClass`。先确认它确实存在：

```bash
# kubectl get storageclass
```

正常的话会看到类似下面的输出，说明 Harvester 已经成为你的默认存储提供者：

```
NAME                  PROVISIONER               RECLAIMPOLICY   VOLUMEBINDINGMODE   ALLOWVOLUMEEXPANSION
harvester (default)   driver.harvesterhci.io    Delete          Immediate           true
```

### 拿真实工作负载来测一下

为了验证整条链路从头到尾都能跑通，我们部署一个测试用的 PVC。

新建一个 `test-pvc.yaml`：

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: test-harvester-storage
  namespace: default
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: harvester
  resources:
    requests:
      storage: 10Gi
```

应用到 guest 集群：

```bash
# kubectl apply -f test-pvc.yaml
```

然后盯着状态看：

```bash
# kubectl get pvc test-harvester-storage -w
```

几秒钟之内，状态就会从 `Pending` 变成 `Bound`。背后发生的事情是：你的 guest 集群和 Harvester 通信，Harvester 让 Longhorn 切出一个 10Gi 的卷，再把它直接热插拔到你的虚拟机节点上——不管这台节点跑的是 Ubuntu、RHEL 还是 SLES。

你也可以回到 Harvester 控制台，进到 **Volumes** 里看一下，确认这个新 PVC 确实出现了。

## 小结

用上 Harvester CSI 驱动之后，就不用再在虚拟化环境里额外跑一套存储方案了。guest 上的应用可以直接享用 Longhorn 原生的裸金属性能，所有存储都通过单一的超融合控制面统一管理，让 SLES 和各种操作系统的节点都能原生地用上后端的企业级存储。
