---
layout: post
title: 使用 k3s 在 Raspberry Pi 4 上构建低成本 Kubernetes 集群
subtitle: 介绍 K3s 和 K8s 的对比。
date: 2023-8-14 11:06:00 +0800
author: Ksd
header-img: img/post-bg-desk.jpg
catalog: true
tags:
  - K3s
  - Raspberry
---

![](https://miro.medium.com/v2/resize:fit:1400/format:webp/1*lMIG04rH02M6jhnuPSdzig.png)

你是否对 Kubernetes 感到好奇并且想要尝试一些实验？或许你手头有一些闲置的 Raspberry Pi 4，想要充分利用它们？如果是的话，你可真是幸运！在这篇文章中，我将向你展示如何借助 Raspberry Pi 4 和 k3s，构建一个简单且轻量级的 Kubernetes 集群。这种经济实惠且易于上手的方法，让你能够探索 Kubernetes 的世界，同时不会造成过多负担。一起开始这个有趣的探索吧！

![](https://miro.medium.com/v2/resize:fit:1400/format:webp/1*6WrrQyhsIcr-kqpSfrDXew.png)

## 硬件

- 3 x 树莓派 4 Model B 4GB
- 2 x Kingston CANVAS Select Plus SD 卡 32GB
- 52pi 机架式塔式集群机箱
- 1 x Kingston A400 固态硬盘（240GB）
- TP-Link TLSG108 8 口千兆台式交换机（你也可以使用 4 口交换机）

## 安装操作系统

我使用了 [Raspberry Pi Imager](https://www.raspberrypi.com/software/ "Raspberry Pi Imager") 将树莓派操作系统（32 位）安装到了 SD 卡上。在设置过程中（如下面的第 4 步所述），将会提示配置主机名、用户名等设置。

![](https://miro.medium.com/v2/resize:fit:1400/format:webp/1*rdFxorW2jCBWMUJ_rE5cxA.png)

## 从 USB SSD 启动 Raspberry Pi 4

我承认，在树莓派 Kubernetes 集群的设置过程中，有一个步骤确实让我感到相当困惑。我尝试让 master 节点使用固态硬盘来运行，但遇到了一些令人头疼的问题。我在网上搜索了几个小时，希望找到解决方法。幸运的是，我最终偶然发现了一篇[博文](https://www.tomshardware.com/how-to/boot-raspberry-pi-4-usb "如何从 USB SSD 或闪存驱动器启动 Raspberry Pi 4 / 400")，它为我提供了宝贵的见解，解决了我困扰已久的问题。有了这些新获得的知识，我终于成功地让 master 节点通过固态硬盘启动起来。这真是让我感到欣慰！

## 网络设置

为了将你的树莓派设备连接到互联网，你需要通过以太网将它们连接到交换机。一旦连接好，你可以从路由器的配置页面轻松地确定分配给你的树莓派的 IP 地址。

如果你已经使用 Raspberry Pi Imager 设置了树莓派的主机名，那么识别它们的 IP 地址将会非常容易。在我的环境中，我正在使用诺基亚 Wifi Beacon 1 路由器，以下是我用来验证树莓派 IP 地址的步骤。

在检查节点的 IP 地址时，你可能会注意到具有不同 IP 地址的重复详细信息，一个是用于无线连接，另一个是用于以太网。识别以太网 IP 地址非常重要，因为与无线相比，它提供了更稳定和可靠的连接。要找到以太网 IP 地址，请检查你的路由器配置页面，并选择标有 “Ethernet” 的选项。

![](https://miro.medium.com/v2/resize:fit:1400/format:webp/1*FJO2JuPlzJycH9XRT_5Qaw.png)

## 准备节点

在确定了节点的 IP 地址后，你可以通过 ssh 连接到它们的 IP 地址。

以下是设置的基本内容：

- 在 `/etc/hosts` 中添加节点的主机名
- 检查 [k3s 所需的端口](https://docs.k3s.io/installation/requirements "K3s 端口要求")

### a. 在 /etc/hosts 中添加节点的主机名

为了在笔记本电脑的终端和每个节点中使用主机名访问你的节点，你需要分别配置 `/etc/hosts`。这个步骤对于所有三个节点都是相同的，所以你需要为每个节点重复这个过程。一旦配置完成，你可以通过主机名轻松访问每个节点，简化管理过程并且更容易连接到你的节点。

```
vi /etc/hosts
## Raspberry Cluster Nodes
192.168.18.35 k3s-master
192.168.18.52 worker01
192.168.18.53 worker02
```

完成后，你应该能够使用节点的主机名连接到它们：

```
GLP/~ $ ssh iamroot@k3s-master
iamroot@k3s-master's password:
Linux k3s-master 5.15.84-v7l+ #1613 SMP Thu Jan 5 12:01:26 GMT 2023 armv7l

The programs included with the Debian GNU/Linux system are free software;
the exact distribution terms for each program are described in the
individual files in /usr/share/doc/*/copyright.

Debian GNU/Linux comes with ABSOLUTELY NO WARRANTY, to the extent
permitted by applicable law.
Last login: Sun Apr 23 06:44:04 2023 from 192.168.18.8
iamroot@k3s-master:~ $
```

### b. 检查 k3s 所需的端口

验证是否允许端口 10250。如果没有被允许，请继续下一步操作：

```
iamroot@k3s-master:~ $ netstat -anlp | grep 10250
```

要允许来自 master 节点的端口 10250，具体所需的命令将根据你的操作系统而异。DigitalOcean 有一份指南，提供了有关在 Linux 上打开端口的[详细说明](https://www.digitalocean.com/community/tutorials/opening-a-port-on-linux "如何在 Linux 上打开端口")，你可以作为参考。通过允许端口 10250，你将能够在安装 K3s 时与 master 节点建立安全连接，以供 metrics server 使用。

```
iamroot@k3s-master:~ $ sudo su -
root@k3s-master:~# iptables -A INPUT -p tcp --dport 10250 -j ACCEPT
```

验证，请运行：

```
iptables --list | grep 10250
```

## 安装 K3s

有关 K3s 架构的更多详细信息，请参阅 https://docs.k3s.io/architecture

### 在 master 节点上安装 k3s

首先，我们需要在 master 节点上安装 K3s。在安装过程中，有时你可能会看到一个错误消息，内容如下：

```
[INFO] Failed to find memory cgroup, you may need to add “cgroup_memory=1 cgroup_enable=memory” to your linux cmdline (/boot/cmdline.txt on a Raspberry Pi)
```

要解决这个错误，请编辑 `/boot/cmdline.txt`，并添加 `cgroup_memory=1 cgroup_enable=memory`：

```
vi /boot/cmdline.txt

console=serial0,115200 console=tty1 root=PARTUUID=71c3dce0–02 rootfstype=ext4 fsck.repair=yes rootwait quiet splash plymouth.ignore-serial-consoles cgroup_memory=1 cgroup_enable=memory
```

修复了错误后，你就可以继续安装并创建你的 Kubernetes 集群：

```
curl -sfL https://get.k3s.io | sh -
```

以下是命令的示例输出：

```
iamroot@k3s-master:~ $ curl -sfL https://get.k3s.io | sh -
[INFO]  Finding release for channel stable
[INFO]  Using v1.26.3+k3s1 as release
[INFO]  Downloading hash https://github.com/k3s-io/k3s/releases/download/v1.26.3+k3s1/sha256sum-arm.txt
[INFO]  Skipping binary downloaded, installed k3s matches hash
[INFO]  Finding available k3s-selinux versions
sh: 407: [: unexpected operator
[INFO]  Skipping /usr/local/bin/kubectl symlink to k3s, already exists
[INFO]  Skipping /usr/local/bin/crictl symlink to k3s, already exists
[INFO]  Skipping /usr/local/bin/ctr symlink to k3s, already exists
[INFO]  Creating killall script /usr/local/bin/k3s-killall.sh
[INFO]  Creating uninstall script /usr/local/bin/k3s-uninstall.sh
[INFO]  env: Creating environment file /etc/systemd/system/k3s.service.env
[INFO]  systemd: Creating service file /etc/systemd/system/k3s.service
[INFO]  systemd: Enabling k3s unit
Created symlink /etc/systemd/system/multi-user.target.wants/k3s.service → /etc/systemd/system/k3s.service.
[INFO]  No change detected so skipping service start
```

为了确认你的 Kubernetes 安装正常工作并且 master 节点可用，你可以运行命令 `sudo kubectl get nodes` 来执行一个简单的验证测试：

```
iamroot@k3s-master:~ $ sudo kubectl get nodes
NAME         STATUS   ROLES                  AGE    VERSION
k3s-master   Ready    control-plane,master   7d5h   v1.26.3+k3s1
```

### 在 worker 节点上安装 k3s agent

与 master 节点类似，你还需要确保对每个 worker 节点的 `/boot/cmdline.txt` 文件进行编辑，将 `cgroup_memory=1 cgroup_enable=memory` 添加到行末。

在其他树莓派上安装 k3s worker 节点之前，你需要从 master 节点获取 IP 地址和访问 token 。为此，只需通过 SSH 登录到 master 节点，并运行以下命令：

获取 master 节点 IP 地址：

```
iamroot@k3s-master:~ $ hostname -I | awk '{print$1}'
192.168.18.35
```

获取访问 token：

```
iamroot@k3s-master:~ $ sudo cat /var/lib/rancher/k3s/server/node-token
K10910a9f606e89da8a95e3e37ab9faf160a3eeca46229dd82fb902c3984bec8e1b::server:e658625eecb60de3f383ca0a75df3e24
```

### SSH 进入每个 worker 节点并执行所需的命令：

使用从 master 节点获取的 IP 和节点 token。运行命令：`curl -sfl https://get.k3s.io |K3S_URL=https://<Master IP>:6443 K3S_TOKEN=<Node Token>`

```
## 替换节点 IP 和 token 用于以下命令：

iamroot@worker01:~ $ curl -sfL https://get.k3s.io | K3S_URL=https://192.168.18.35:6443 K3S_TOKEN=K10910a9f606e89da8a95e3e37ab9faf160a3eeca46229dd82fb902c3984bec8e1b::server:e658625eecb60de3f383ca0a75df3e24 sh -
[INFO]  Finding release for channel stable
[INFO]  Using v1.26.3+k3s1 as release
[INFO]  Downloading hash https://github.com/k3s-io/k3s/releases/download/v1.26.3+k3s1/sha256sum-arm.txt
[INFO]  Skipping binary downloaded, installed k3s matches hash
[INFO]  Finding available k3s-selinux versions
sh: 407: [: unexpected operator
[INFO]  Skipping /usr/local/bin/kubectl symlink to k3s, already exists
[INFO]  Skipping /usr/local/bin/crictl symlink to k3s, already exists
[INFO]  Skipping /usr/local/bin/ctr symlink to k3s, already exists
[INFO]  Creating killall script /usr/local/bin/k3s-killall.sh
[INFO]  Creating uninstall script /usr/local/bin/k3s-agent-uninstall.sh
[INFO]  env: Creating environment file /etc/systemd/system/k3s-agent.service.env
[INFO]  systemd: Creating service file /etc/systemd/system/k3s-agent.service
[INFO]  systemd: Enabling k3s-agent unit
Created symlink /etc/systemd/system/multi-user.target.wants/k3s-agent.service → /etc/systemd/system/k3s-agent.service.
[INFO]  systemd: Starting k3s-agent
```

在你的 worker 节点上安装了 k3s agent 后，你可以验证它们是否已成功添加到集群并处于 **Ready** 状态。要做到这一点，请登录到你的 master 节点并运行以下命令：

```
iamroot@k3s-master:~ $ sudo kubectl get nodes
NAME         STATUS   ROLES                  AGE    VERSION
k3s-master   Ready    control-plane,master   7d5h   v1.26.3+k3s1
worker02     Ready    <none>                 7d5h   v1.26.3+k3s1
worker01     Ready    <none>                 7d5h   v1.26.3+k3s1
```

## 从你的笔记本电脑管理集群

### a. 安装 kubectl

根据你笔记本电脑的操作系统，你可以查阅[官方文档](https://kubernetes.io/docs/tasks/tools/ "Kubernetes Install Tools")了解如何安装 kubectl。

### b. 在你的笔记本电脑上设置 kubeconfig

要从 master 节点检索 kubeconfig 文件，请在 master 节点上执行以下命令：

```
iamroot@k3s-master:~ $ sudo cat /etc/rancher/k3s/k3s.yaml

apiVersion: v1
clusters:
- cluster:
    certificate-authority-data: LS0tLS1..
    server: https://<Master Nodes-IP>:6443
  name: default
contexts:
- context:
    cluster: default
    user: default
  name: k3s
current-context: default
kind: Config
preferences: {}
users:
- name: default
  user:
    client-certificate-data: LS0tLS1CRUd..
    client-key-data: LS0tLS1C...
```

要在本地机器上使用 kubeconfig 文件，请将文件的内容复制到本地机器上的一个新文件中，并将其保存为 `~/.kube/config`。

在使用配置文件之前，你需要更新 `cluster` 部分中的 `server` 字段，使其与你的 master 节点的 IP 地址匹配。将默认的服务器 IP 地址 `127.0.0.1` 替换为你的 master 节点的 IP 地址。另外，将上下文从 `default` 重命名为 `k3s`。

一旦你更新了配置文件，你可以通过在本地终端中执行 `kubectl` 命令来测试连接，使用刚刚创建的 `k3s` 上下文。例如，你可以运行：

```
GLP/~ $ kubectl config use-context k3s
Switched to context "k3s".
GLP/~ $ kubectl get nodes
NAME         STATUS   ROLES                  AGE    VERSION
k3s-master   Ready    control-plane,master   7d6h   v1.26.3+k3s1
worker02     Ready    <none>                 7d6h   v1.26.3+k3s1
worker01     Ready    <none>                 7d6h   v1.26.3+k3s1
```

## 总结

我们已成功地建立了一个由一个 master 节点和两个 worker 节点组成的三节点集群，通过安装 k3s 并在我们的笔记本电脑上配置 kubeconfig 来访问该集群。

虽然这篇文章已经涵盖了集群的初始设置阶段，但请继续关注未来的项目，因为它们将展示此集群更多高级的用例。我有几个令人兴奋的项目计划，将充分发挥 Kubernetes 的强大和灵活性。敬请期待！
