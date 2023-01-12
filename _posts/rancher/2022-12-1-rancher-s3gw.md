---
layout: post
title: 如何为 Longhorn 扩展对象存储能力
subtitle:
date: 2022-12-1 21:07:00 +0800
author: Ksd
header-img: img/post-bg-desk.jpg
catalog: true
tags:
  - Rancher
  - S3gw
---

在云原生环境中，非常重要的一个环节就是提供一个可以使用标准协议与客户端交互的存储系统。大家可能会马上联想到 “简单存储服务(Simple Storage Service, S3)”，S3 是一个庞大的协议，涵盖了存储桶、对象、密钥、版本控制、ACL 和区域等关键概念。

Longhorn 是 Kubernetes 的分布式块存储系统。Longhorn 目前**只支持块存储和文件系统**。那么，Longhorn 能否充当 S3 的服务器，并且提供单一的 AWS S3 API 接口来访问后端数据存储呢？

当然可以！但是你可能需要一个 S3 网关来向外部客户端提供对数据的访问权限。

有了 s3gw 项目，就可以让这一切的设想变的可行！

## 什么是 s3gw？

s3gw(https://github.com/aquarist-labs/s3gw) 是一项与 S3 兼容的服务并公开与 S3 兼容的 API，专注于在任何 PVC 支持的 Kubernetes 环境中进行部署，包括 Longhorn。 自成立以来，关注的重点一直放在云原生部署上。但是，如果附加了某种形式的存储，s3gw 是可以部署在许多场景中的。

s3gw 基于 Ceph 的 RADOSGW (RGW)，但它作为独立服务运行，没有 RADOS 集群，并且依赖于 SUSE 存储团队持续开发的存储后端。目前 s3gw 仍处于开发的早期阶段，但它已经可以用于测试和使用一些 S3 功能。

以上的介绍是通过 s3gw 官网直译过来的，如果大家还是不清楚什么是 s3gw，那大家可以把 s3gw 看成是一个减配版的 minio。只不过 s3gw 为了补充 Rancher 产品组合，目前重心放在和 Longhorn 的适配上，但该工具不限于 Rancher 产品。另外，s3gw 采用的是 `Apache License, Version 2.0`，而 minio 部分组件采用的是 `GNU AGPLv3 license`。

接下来，本文将介绍如何安装和使用 s3gw。

## 部署 s3gw

s3gw 依赖一个基础的 Kubernetes 集群和 Longhorn。本次介绍将通过 Rancher 创建一个下游 K3s 集群，然后通过 Rancher 应用商店在下游 K3s 集群中安装 Longhorn 和 s3gw。

### 部署 Rancher 和 K3s

为了节省篇幅，部署 Rancher 和 K3s 的步骤就不在本文中详细描述，大家可参考 Rancher 和 K3s 文档进行部署。

演示环境：

- 操作系统：Ubuntu 20.04.5 LTS
- Rancher 版本：rancher/rancher:v2.7.0
- 下游 K3s 版本：v1.24.8+k3s1
- s3gw chart：0.8.0
- Longhorn chart：101.1.0+up1.3.2

### 部署 Longhorn

通过 Rancher 部署 Longhorn 非常简单，只需要进入下游 K3s 集群，在 Rancher 仪表板左侧 **Apps** 下的 **Charts** 选择 Longhorn 便可开始部署 Longhorn：

![](https://tva1.sinaimg.cn/large/008vxvgGly1h8qk13v8jej31ae0u0777.jpg)

安装非常简单，你不需要更改 chart 中的任何默认值。最后，如果一切顺利，你应该会看到 Rancher 的控制台显示：

![](https://tva1.sinaimg.cn/large/008vxvgGly1h8qk3608wgj31kn0u0tev.jpg)

安装 Longhorn 后，你只需单击左侧 Rancher 菜单中的 Longhorn 菜单即可重定向到 Longhorn 的仪表板：

![](https://tva1.sinaimg.cn/large/008vxvgGly1h8qk7cg1bwj31ka0u077j.jpg)

新安装的 Longhorn 显示仍然没有应用程序使用持久卷。

### 部署 s3gw

和 Longhorn 一样，你仍然可以使用 **Apps** 来安装 S3gw，你会在合作伙伴存储库中找到可用的 s3gw，如下所示：

![](https://tva1.sinaimg.cn/large/008vxvgGly1h8qkb1gjsaj31ef0u0add.jpg)

你也可以为 s3gw 设置一些自定义的参数。

![](https://tva1.sinaimg.cn/large/008vxvgGly1h8qkdenkg2j31gn0u00vy.jpg)

本次 Demo 取消了 `Create Storage Class` 选项，并且修改 `Storage Class` 为 `longhorn`。因为 Longhorn 已经通过 Rancher App 进行部署，并且名称为 `longhorn`。

![](https://tva1.sinaimg.cn/large/008vxvgGly1h8qktft7zdj319s0u0q5a.jpg)

安装完成后，如果一切顺利，你应该会看到 Rancher 的控制台显示：

![](https://tva1.sinaimg.cn/large/008vxvgGly1h8qkugg6oxj31k90u044z.jpg)

在 Longhorn 仪表板上，你可以验证应用程序是否正在使用 Longhorn 持久卷：

![](https://tva1.sinaimg.cn/large/008vxvgGly1h8pm32h6uaj31sq0u0jux.jpg)

以上，我们就完成了 s3gw 的安装，接下来，我们就可以验证 S3gw 的使用！

## 验证 s3gw

默认情况下，s3gw chart 配置一个 ingress，该 ingress 指向具有 FQDN 的 S3 网关：`s3gw.local`。因此，你必须在 /etc/hosts 中定义 s3gw.local 指向主机物理接口之一的 IP 地址。

如果部署 s3gw 时启用了 S3 UI，那么也需要将 S3 UI 的 FQDN 加到映射文件中，例如：

```
35.182.248.120 s3gw.local
35.182.248.120 s3gw-ui.local
```

要测试 S3 gateway，你可以依赖 s3cmd，它是一个流行的命令行 S3 客户端。

安装后，你可以从 https://raw.githubusercontent.com/aquarist-labs/s3gw-core/main/env/s3cmd.cfg 获取 s3cmd 配置文件并将其用于 s3gw。

> 需要修改文件中的 `access_key` 和 `secret_key`

接下来，你需要做的就是创建一个目录，将 s3cmd.cfg 放入其中，最后调用 s3cmd。

#### 创建 bucket

```
$ s3cmd -c s3cmd.cfg mb s3://foo
```

#### 上传文件到 bucket 中

让我们创建一个 1mb 的文件，填充一些随机数据并将其放入存 bucket 中：

```
$ dd if=/dev/random bs=1k count=1k of=obj.1mb.bin
$ s3cmd -c s3cmd.cfg put obj.1mb.bin s3://foo
```

#### 列出 bucket 中包含的对象

```
$ s3cmd -c s3cmd.cfg ls s3://foo
2022-12-02 02:05      1048576  s3://foo/obj.1mb.bin
```

#### 删除 bucket

```
$ s3cmd -c s3cmd.cfg rm s3://foo/obj.1mb.bin
```

## Rancher 备份对接 S3gw

Rancher 可以通过 `rancher-backup operator` 用来备份和恢复任何 Kubernetes 集群上的 Rancher，备份文件可以保存在 S3 兼容的对象存储中。这样我们就可以利用 `rancher-backup operator` 将 Rancher 备份通过 s3gw 存储在 longhorn 中。

要实现以上的需求，只需要在创建 Rancher 备份时选择 `Use an S3-compatible object store`，并设置 s3gw 的连接参数即可，以下是示例：

![](https://tva1.sinaimg.cn/large/008vxvgGly1h8pm3ljfshj30wj0u076z.jpg)

![](https://tva1.sinaimg.cn/large/008vxvgGly1h8pm3qje1tj31pu0seq7c.jpg)

备份创建成功后，可以通过 s3cmd 确认 Rancher 备份是否上传到 s3gw：

```
$ s3cmd -c s3cmd.cfg ls s3://foo
2022-12-02 02:09      1048576  s3://foo/obj.1mb.bin
2022-12-02 02:55       826155  s3://foo/rancher-backup-demo-455e4847-d18f-4ae5-a960-90ecc5768986-2022-12-02T02-55-36Z.tar.gz
```

## S3gw UI

s3gw Web UI 提供了一种与 s3gw 服务交互的直观方式。这包括用户和存储桶管理，以及对象资源管理器。

要访问 s3gw Web UI，可以使用在 chart 中配置的 S3 UI FQDN 访问 S3 Web UI（本例为：s3gw-ui.local），并使用 chart 中设置的 `Access key` 和 `Secret key` 作为凭证登录 S3 Web UI（本例为：test/test）:

下面是当前 UI 版本的一些屏幕截图，但请记住，我们仍在积极开发它，它的功能还不完整。

![](https://www.suse.com/c/wp-content/uploads/2022/11/s3gw-login-1.png)

![](https://tva1.sinaimg.cn/large/008vxvgGly1h8p9if91tdj311x0rodgu.jpg)

![](https://tva1.sinaimg.cn/large/008vxvgGly1h8p9iwafxpj311x0rowg2.jpg)

![](https://tva1.sinaimg.cn/large/008vxvgGly1h8p9j9gkgaj311x0ro0uh.jpg)

## 总结

在本教程中，你了解了如何在 Rancher 中安装 Longhorn/s3gw 以及最后使用 S3 网关系统。 K3s、Rancher 和 Longhorn 是建立一个提供弹性和高性能存储功能的环境的强大工具。如果你需要将存储暴露给外部客户端，那么 s3gw 是一个非常好的选择。

