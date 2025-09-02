---
layout: post
title: iStoreOS + PassWall 实现局域网科学上网
subtitle:
date: 2025-9-2 11:07:00 +0800
author: Ksd
header-img: img/post-bg-desk.jpg
catalog: true
tags:
  - Proxy
  - iStoreOS
---

在日常折腾测试环境时，我常常需要在几台服务器上部署 **Rancher/K8s**。不过在国内访问 DockerHub 的速度和稳定性一直是个痛点，每次都要想办法配置代理，既麻烦又影响效率。于是，我决定在实验环境里搭建一个**旁路由**，让所有设备的网络都能自动走代理，省去逐一配置的烦恼。

经过调研，我选择了 **[iStoreOS](https://www.istoreos.com/)** 搭配 **[PassWall](https://github.com/xiaorouji/openwrt-PassWall)** 的方案。iStoreOS 提供了简洁的虚拟化安装方式和直观的管理界面，而 PassWall 则能方便地接入代理订阅，实现透明科学上网，非常适合我的需求。

## 在 PVE 上安装 iStoreOS

参考 iStoreOS 文档即可：https://doc.linkease.com/zh/guide/istoreos/install_pve.html，已经非常详细了。

## 安装 PassWall

istoreos 的 istore 没有自带 PassWall，可以在 [github](https://github.com/AUK9527/Are-u-ok) 下载。

我的是 X86，所以我选择的也是 X86。

![](https://raw.githubusercontent.com/kingsd041/picture/main/202509021459138.png)

下载之后是一个 run 后缀的安装包，可以在 iStore--手动安装，通过上传安装包去安装：

![](https://raw.githubusercontent.com/kingsd041/picture/main/202509021501855.png)

等待右上角原点变绿之后就安装完成。

## 配置 PassWall

PassWall 安装成功后，登录 iStoreOS 首页，就可以在 服务下面找到 PassWall。

在 **节点订阅**最下面添加你的订阅地址，并保存应用：

![](https://raw.githubusercontent.com/kingsd041/picture/main/202509021512474.png)

最后可点击 **手动订阅** 来出发更新。

## 配置防火墙

进入 **网络**--**防火墙**，进入到防火墙设置页面。常规设置里，入站数据，出站数据，转发这三个选项都选择**接受**。

![](https://raw.githubusercontent.com/kingsd041/picture/main/202509021515774.png)

## 上网设备配置走旁路由

将已存在的 vm 的网关配置为 旁路由地址，再将 dhcp server 里的默认网关改为 旁路由地址即可。


## 写在最后

到这里，一个基于 **iStoreOS + PassWall** 的旁路由就搭建完成了。这样配置后，局域网内的所有设备只要把网关指向旁路由，就能自动享受稳定的科学上网体验，无需再逐个配置代理，大大提升了使用效率。

这个方案特别适合像我这样需要频繁搭建测试环境、访问海外镜像源的场景。当然，如果只是日常使用，也同样能让全屋设备畅快上网。