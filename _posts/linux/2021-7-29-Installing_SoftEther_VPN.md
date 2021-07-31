---
layout: post
title: 安装 SoftEther VPN
subtitle: docker 安装 SoftEther VPN
date: 2021-7-29 15:57:00 +0800
author: Ksd
header-img: img/post-bg-unix-linux.jpg
catalog: true
tags:
  - SoftEther
  - VPN
---

最近办公室鸟枪换炮，弄了个公网 IP，所以搞个 vpn，可以远程连接到办公室的“服务器”。

[softether vpn](https://www.softether.org/)是老东家一直再用的，今天尝试了按照官网安装，甚是繁琐，还得自己 build。

反正也是自己用，干脆就用 docker 来启动吧。

## 安装

所用镜像：https://hub.docker.com/r/siomiz/softethervpn

```
docker run -d --restart=unless-stopped \
    --cap-add NET_ADMIN \
    -p 500:500/udp \
    -p 4500:4500/udp \
    -p 1701:1701/tcp \
    -p 1194:1194/udp \
    -p 5555:5555/tcp \
    -e PSK=预共享秘钥 \
    -e USERNAME=用户名 \
    -e PASSWORD=密码  \
    -v /etc/softethervpn/vpn_server.config:/usr/vpnserver/vpn_server.config \
    siomiz/softethervpn
```

## 连接 VPN

连接 vpn 需要，4500/udp、1701/tcp、500/udp、所以需要在交换机上做好端口转发。

然后在 mac 端创建 vpn 连接就行了。

![](https://tva1.sinaimg.cn/large/008i3skNly1gt04pha9o2j30nc0ayt9e.jpg)

然后 IP、用户名、密码即可连接。

如果选择下面的选项，需要手动创建路由：

![](https://tva1.sinaimg.cn/large/008i3skNly1gt04r0qgt5j30le0cujs4.jpg)

```
sudo route add -net 192.168.1.0 192.168.30.10
```
