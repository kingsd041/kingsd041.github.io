---
layout: post
title: 在 Equinix Metal 上部署 Harvester 集群
subtitle: 本文档提供了在Equinix Metal平台上部署 Harvester 集群的步骤
date: 2023-3-2 11:07:00 +0800
author: Ksd
header-img: img/post-bg-desk.jpg
catalog: true
tags:
  - Rancher
  - Harvester
  - Equinix
---


Equinix Metal 平台允许用户使用外部 iPXE 脚本文件来配置节点。我们将演示如何通过从用户的 Github 存储库启动 iPXE 脚本来创建 Harvester 集群。

> 注意：由于[已知证书](https://github.com/harvester/harvester/issues/2226)问题，Equinix 上的 ipxe 目前不支持https://release.rancher.com，你可以构建自己的 Web 服务器或使用其他方法下载相关工件。

我已经提前讲 harvester 的ipxe 安装工件上传到了 https://github.com/kingsd041/harvester/releases/tag/v1.1.1

![](https://raw.githubusercontent.com/kingsd041/picture/main/202303021016362.png)

## 修改 iPXE 脚本

将 https://github.com/harvester/ipxe-examples fork 到自己的 repo，然后修改 iPXE 脚本:

```
#!ipxe
dhcp
iflinkwait -t 5000 && echo Detected link on ${ifname} 
set version v1.1.1
set base https://github.com/kingsd041/harvester/releases/download/${version} # ipxe on Equinix currently does not support `https://release.rancher.com`, you can build your own web server or use other methods to download related artifacts.
kernel ${base}/harvester-${version}-vmlinuz-amd64 ip=dhcp net.ifnames=1 rd.cos.disable rd.noverifyssl root=live:${base}/harvester-${version}-rootfs-amd64.squashfs harvester.install.management_interface.interfaces="hwAddr:${net0/mac}" harvester.install.management_interface.method=dhcp harvester.install.management_interface.bond_options.mode=balance-tlb harvester.install.management_interface.bond_options.miimon=100 console=ttyS1,115200 harvester.install.automatic=true boot_cmd="echo include_ping_test=yes >> /etc/conf.d/net-online" harvester.install.config_url=https://metadata.platformequinix.com/userdata
initrd ${base}/harvester-${version}-initrd-amd64
boot
```

然后将修改的内容上传到自己的 report 中，本例使用的 repo 是：https://github.com/kingsd041/ipxe-examples

参数说明可参考：https://github.com/harvester/ipxe-examples

## 在 Equinix 上创建服务器

`Choose your operating system` 选择 `custom_ipxe`，并设置 `IPXE Script URL`为：https://raw.githubusercontent.com/kingsd041/ipxe-examples/main/equinix/ipxe-install

![](https://raw.githubusercontent.com/kingsd041/picture/main/202303021020703.png)

`Configure IPs` 使用默认即可，如果你已经在 Equinix 申请了公网 IP，或者有这方面的需求，可参考 [配置弹性 IP](https://github.com/harvester/ipxe-examples) 去操作

`User data` 可参考 [ipxe-examples](https://github.com/harvester/ipxe-examples) 来设置：

```
#cloud-config
scheme_version: 1
token: token
os:
  ssh_authorized_keys:
  - ssh-rsa ...
  password: p@ssword   # replace with a your password
  ntp_servers:
  - 0.suse.pool.ntp.org
  - 1.suse.pool.ntp.org
install:
  mode: create
  device: /dev/sda
  iso_url: https://releases.rancher.com/harvester/master/harvester-master-amd64.iso
  tty: ttyS1,115200n8
  vip: 10.70.245.136
  vip_mode: static
```

vip 可以任意填，我填的是 Equinix 中已经设置好的 Private IPv4 的网段地址，方便后续注册集群使用。

## 查看安装日志

可按照 Equinix 中提供的功能去查看安装日志，这里也可以看见 ipxe 安装 harvest 的日志：

![](https://raw.githubusercontent.com/kingsd041/picture/main/202303021027371.png)

