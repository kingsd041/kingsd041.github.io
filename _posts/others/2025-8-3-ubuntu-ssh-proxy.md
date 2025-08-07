---
layout: post
title: 通过 SSH 和 Privoxy 搭建本地代理，解决 K3s 镜像无法下载问题
subtitle:
date: 2025-8-3 11:07:00 +0800
author: Ksd
header-img: img/post-bg-desk.jpg
catalog: true
tags:
  - Proxy
  - K3s
---

## 通过 ssh 配置 proxy

有一台国外服务器，例如：1.1.1.1

在需要启动 proxy 的主机上执行：

```BASH
ssh -o ServerAliveInterval=60 -f -CNgT -D 1080 root@1.1.1.1 -p 22

输入密码
```

## 将 socket5 转为 https

因为只支持 scoket5，所以需要安装 proxy:

```BASH
apt install privoxy
```

配置文件：

```BASH
root@proxy:~# cat /etc/privoxy/config
添加 SOCKS5 转发规则
# 监听地址和端口（默认 8118）
listen-address  0.0.0.0:8118

# 将所有流量转发到 SOCKS5 代理
forward-socks5t   /   127.0.0.1:1080  .

# 启用 HTTPS 支持
accept-intercepted-requests 1
```

```BASH
sudo systemctl restart privoxy
```

## 验证配置

检查服务状态：

```BASH
systemctl status privoxy
```

测试 HTTP 代理

```BASH
curl -x http://127.0.0.1:8118 -v https://ipinfo.io
```

查看日志：

```BASH
tail -f /var/log/privoxy/logfile
```

## 安装 K3S

```BASH
curl -sfL https://rancher-mirror.rancher.cn/k3s/k3s-install.sh | INSTALL_K3S_MIRROR=cn sh -
```

配置 containerd 代理：

```BASH
cat /etc/systemd/system/k3s.service.env
# k3s agent 为：/etc/systemd/system/k3s-agent.service.env
CONTAINERD_HTTP_PROXY=http://10.201.170.176:8118
CONTAINERD_HTTPS_PROXY=http://10.201.170.176:8118
CONTAINERD_NO_PROXY=127.0.0.0/8,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16
```
