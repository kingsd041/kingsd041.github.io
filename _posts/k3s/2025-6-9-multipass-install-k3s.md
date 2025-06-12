---
layout: post
title: 用 Multipass 快速部署本地 K3s 集群，零基础也能上手
subtitle: 只需几条命令，用 Multipass 带起 K3s，小白也能搭出一个能打的本地 Kubernetes 集群！
date: 2025-6-9 11:06:00 +0800
author: Ksd
header-img: img/post-bg-desk.jpg
catalog: true
tags:
  - Multipass
  - K3s
---

在边缘计算开发、K3s 测试或日常的 Kubernetes 学习中，许多人面临一个问题：
**如何快速地在本地构建一个轻量级的多节点集群？**

本文将介绍一种简单、高效、跨平台的方式：使用 Multipass 与 K3s 搭建三节点 Kubernetes 集群。该方法适用于 macOS、Linux 和 Windows 平台的开发环境，帮助你在几分钟内完成部署，便于模拟边缘场景。

## 什么是 Multipass？

[Multipass](https://multipass.run/ "Multipass 官网") 是由 Canonical（Ubuntu 背后的公司）开发的轻量级虚拟机管理工具，专为快速创建 Ubuntu 环境而设计，支持 macOS、Windows 和 Linux 平台。

它的特点包括：

- 使用命令行即可快速启动、停止、删除虚拟机
- 默认镜像基于 Ubuntu LTS，适合开发测试
- 跨平台统一体验（底层使用 HyperKit / Hyper-V / QEMU）
- 适合本地 K3s、MicroK8s、LXD 等轻量容器平台的快速部署

通过 Multipass，用户无需复杂的 VirtualBox 配置或大型云环境，也能在本地快速模拟出多个节点，非常适合本教程中的 K3s 多节点部署。

## 先决条件

- Linux 或 macOS 主机
- `kubectl`：有关如何安装 kubectl 的详细信息，请参阅[安装和设置 kubectl](https://kubernetes.io/docs/tasks/tools/install-kubectl/ "安装 kubectl") 页面
- 本教程默认你已安装好 Multipass。若尚未安装，可访问[Multipass 官网](https://multipass.run/ "Multipass 官网")

## 创建三台虚拟机

我们计划创建一台 master 节点和两台 worker 节点，每台配置为：1 核、2GB 内存、10GB 磁盘，系统为 Ubuntu 22.04。

### 创建 master 节点

```bash
multipass launch -c 1 -m 2G -d 10G -n k3s-master 22.04
```

```bash
Launched: k3s-master
```

说明：

- `-c 1`：1 核 CPU
- `-m 2G`：2GB 内存
- `-d 10G`：10GB 磁盘
- `-n`：指定实例名称

查看节点详情：

```bash
multipass info k3s-master
```

```bash
Name:           k3s-master
State:          Running
Snapshots:      0
IPv4:           192.168.205.130
Release:        Ubuntu 22.04.5 LTS
Image hash:     a037d6d02991 (Ubuntu 22.04 LTS)
CPU(s):         1
Load:           2.03 0.80 0.30
Disk usage:     1.7GiB out of 9.6GiB
Memory usage:   190.0MiB out of 1.9GiB
```

### 批量创建两个 worker 节点

```bash
for i in 1 2; do
  multipass launch -c 1 -m 2G -d 10G -n k3s-worker-$i 22.04
done
```

```bash
Launched: k3s-worker-1
Launched: k3s-worker-2
```

查看全部虚拟机状态：

```bash
multipass list
```

```bash
Name                    State             IPv4             Image
k3s-master              Running           192.168.205.130  Ubuntu 22.04 LTS
k3s-worker-1            Running           192.168.205.131  Ubuntu 22.04 LTS
k3s-worker-2            Running           192.168.205.132  Ubuntu 22.04 LTS
```

此时应显示三个节点均处于 Running 状态。

## 部署 K3s 集群

K3s 是一个轻量级的 Kubernetes 发行版，面向资源受限的环境。K3s 简单的安装过程非常适合快速原型开发。

我们将在 master 节点上安装 K3s，并让 worker 节点加入该集群。

### 在 master 节点安装 K3s

使用国内镜像源，加快安装速度：

```bash
multipass exec k3s-master -- bash -c \
"curl -sfL https://rancher-mirror.rancher.cn/k3s/k3s-install.sh | \
INSTALL_K3S_MIRROR=cn sh -s - \
--system-default-registry=registry.cn-hangzhou.aliyuncs.com"
```

```bash
[INFO]  Finding release for channel stable
[INFO]  Using v1.32.5+k3s1 as release
[INFO]  Downloading hash rancher-mirror.rancher.cn/k3s/v1.32.5-k3s1/sha256sum-amd64.txt
[INFO]  Downloading binary rancher-mirror.rancher.cn/k3s/v1.32.5-k3s1/k3s
[INFO]  Verifying binary download
[INFO]  Installing k3s to /usr/local/bin/k3s
[INFO]  Skipping installation of SELinux RPM
[INFO]  Creating /usr/local/bin/kubectl symlink to k3s
[INFO]  Creating /usr/local/bin/crictl symlink to k3s
[INFO]  Creating /usr/local/bin/ctr symlink to k3s
[INFO]  Creating killall script /usr/local/bin/k3s-killall.sh
[INFO]  Creating uninstall script /usr/local/bin/k3s-uninstall.sh
[INFO]  env: Creating environment file /etc/systemd/system/k3s.service.env
[INFO]  systemd: Creating service file /etc/systemd/system/k3s.service
[INFO]  systemd: Enabling k3s unit
Created symlink /etc/systemd/system/multi-user.target.wants/k3s.service → /etc/systemd/system/k3s.service.
[INFO]  systemd: Starting k3s
```

### 获取集群 Token 和 master 节点 IP

K3s 安装程序在 `k3s-master` 节点上创建了一个 Kubernetes 令牌保存到 `/var/lib/rancher/k3s/server/node-token` 文件中。执行以下命令可以将文件的内容存储到名为 `TOKEN` 的环境变量：

```bash
TOKEN=$(multipass exec k3s-master sudo cat /var/lib/rancher/k3s/server/node-token)
IP=$(multipass info k3s-master | grep IPv4 | awk '{print $2}')
```

说明：

- `TOKEN` 是 worker 节点加入集群所需的认证密钥
- `IP` 是 master 节点的访问地址

### 将两个 worker 节点加入集群

```bash
for i in 1 2; do
  multipass exec k3s-worker-$i -- bash -c \
  "curl -sfL https://rancher-mirror.rancher.cn/k3s/k3s-install.sh | \
  INSTALL_K3S_MIRROR=cn K3S_URL=\"https://$IP:6443\" K3S_TOKEN=\"$TOKEN\" sh -"
done
```

## 验证集群状态

在 master 节点中运行：

```bash
multipass exec k3s-master -- bash -c "sudo kubectl get node"
```

预期输出如下：

```
NAME           STATUS   ROLES                  AGE     VERSION
k3s-master     Ready    control-plane,master   5m19s   v1.32.5+k3s1
k3s-worker-1   Ready    <none>                 61s     v1.32.5+k3s1
k3s-worker-2   Ready    <none>                 16s     v1.32.5+k3s1
```

如果希望直接在宿主机使用 `kubectl` 操作集群，可以执行以下步骤：

1. 从虚拟机中复制配置文件

```bash
multipass exec k3s-master -- bash -c "sudo cat /etc/rancher/k3s/k3s.yaml" > kubeconfig
```

2. 修改集群访问地址
   编辑 `kubeconfig` 文件，将其中的：

```yaml
server: https://127.0.0.1:6443
```

3. 修改为 master 节点的实际 IP，例如：

```yaml
server: https://192.168.205.130:6443
```

4. 设置环境变量并验证

```bash
export KUBECONFIG=$(pwd)/kubeconfig
kubectl get nodes
```

如果输出节点列表，即表示配置成功。

## 清理所有资源

如需释放资源，可执行以下命令：

```bash
multipass stop k3s-master k3s-worker-1 k3s-worker-2
multipass delete k3s-master k3s-worker-1 k3s-worker-2
multipass purge
multipass list
```

## 总结

本教程展示了如何使用 Multipass 和 K3s 在本地快速搭建一个三节点 Kubernetes 集群。该方法具有如下优势：

- 无需手动配置系统或安装依赖
- 启动和销毁集群都非常快速
- 适用于边缘计算开发、本地测试和教学演示场景

后续你可以基于此集群进一步探索：

- Helm 应用部署
- EdgeDevice 模拟
- K3s 高可用方案
