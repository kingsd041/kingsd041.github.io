---
layout:     post
title:      RancherOS自定义配置
subtitle:   记录一些常用的配置
date:       2018-10-15
author:     Ksd
header-img: img/post-bg-unix-linux.jpg
catalog: 	 true
tags:
    - RancherOS
    - OS
---

# RancherOS 常用自定义配置
## IPXE启动
```
Virtualbox下使用IPXE启动
参考：http://ipxe.org/
主要步骤：
1. 下载IPXE镜像, http://boot.ipxe.org/ipxe.iso, 下载之后，启动虚拟机的时候需要加载到vbox中
2. 在MacOS下面/Users/ksd/Library/Virtualbox/TFTP/创建IPXE.pxe文件，内容参考RancherOS release的IPXE文件（IPXE.pxe中的IPXE需要和虚拟机名称保持一致）
```

## 设置DEBUG
```
sudo ros config set rancher.debug true
```

## Mirror
```
rancher:
  console: ubuntu
  docker:
    registry_mirror: https://fogjl973.mirror.aliyuncs.com
  system_docker:
    registry_mirror: https://fogjl973.mirror.aliyuncs.com
  bootstrap_docker:
    registry_mirror: https://fogjl973.mirror.aliyuncs.com
```

## ros install 时设置密码
```
[root@rancher ~]# ros install -t noformat -d /dev/sda -c cloud-init.yml --append rancher.password=rancher
```

## ros debug
```
[root@rancher ~]# ros install --debug -d ...
```
