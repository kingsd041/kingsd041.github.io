---
layout:     post
title:      Build rancheros image
subtitle:   
date:       2018-10-15
author:     Ksd
header-img: img/post-bg-unix-linux.jpg
catalog: 	 true
tags:
    - RancherOS
    - OS
---

# Build rancheros image
> 宿主机的kernel版本必须大于ros的kernel版本
> 推荐使用ubuntu 18.04

## 下载os repo
```
git clone https://github.com/rancher/os.git
```

## Build vmware image -- boot from iso
```
cd os
VMWARE_AUTOFORMAT=0 make vmware
```
ISO生成到以下目录，这两个ISO其实是一个，可以通过`md5sum`验证。
这个ISO和release里的ISO的区别是就是生成的IOS没有持久化目录，支持 boot for iso, 而release里的 rancherros-vmware.iso是持久化的，所以无法安装到磁盘
```
./dist/vmware/artifacts/rancheros.iso
./dist/artifacts/rancheros-vmware.iso
```

## Build respherry pi iso
> respherry pi 只能在ARM机器上build
```
KERNEL_CHECK=0 make
make rpi64
```
- KERNEL_CHECK=0 代表不检查kernel版本

文件生成到`/dist/artifacts/rootfs_arm64.tar.gz`下
