---
layout: post
title: 通过 K3s 配置 containerd 的镜像仓库
subtitle: 配置 containerd 镜像仓库完全攻略
date: 2020-12-30 21:06:00 +0800
author: Ksd
header-img: img/post-bg-rancher-k3s.png
catalog: true
tags:
  - rancher
  - K3S
  - Kubernetes
  - containerd
  - registry
---

## 前言

Kubernetes 在 Changelog 中宣布自 Kubernetes 1.20 之后将弃用 Docker 作为容器运行时之后，containerd成为下一个容器运行时的热门选项。虽然 containerd 很早就已经是 Docker 的一部分，但是纯粹使用 containerd 还是给大家带来了诸多困扰，本文将介绍如何使用 containerd 配置镜像仓库和加速器。

本文将以K3s为例对containerd进行配置，如果您的环境未使用 K3s 而是使用的 Kubernetes，你也可以参考本文来配置 containerd 的镜像仓库，因为 containerd 的配置是通用的

## 关于 K3s 和 containerd

K3s 是一个轻量级 Kubernetes 发行版，所需内存只有 kubernetes 的一半，所有的二进制都不到 100MB。k3s 为了降低资源消耗，将默认的 runtime 修改为 containerd，同时也内置了 Kubernetes CLI 工具 [crictl](https://github.com/kubernetes-sigs/cri-tools)和[ctr](https://github.com/containerd/containerd/tree/master/cmd/ctr)。

K3s 默认的 containerd 配置文件目录为`/var/lib/rancher/k3s/agent/etc/containerd/config.toml`，但直接操作 containerd 的配置文件去设置镜像仓库或加速器相比于操作 docker 要复杂许多。K3s 为了简化配置 containerd 镜像仓库的复杂度，K3s 会在启动时检查/etc/rancher/k3s/中是否存在 registries.yaml 文件，如果存在该文件，就会根据 registries.yaml 的内容转换为 containerd 的配置并存储到`/var/lib/rancher/k3s/agent/etc/containerd/config.toml`，从而降低了配置 containerd 镜像仓库的复杂度。

## 使用 K3s 配置私有镜像仓库

K3s 镜像仓库配置文件由两大部分组成：`mirrors`和`configs`:

- Mirrors 是一个用于定义专用镜像仓库的名称和 endpoint 的指令
- Configs 部分定义了每个 mirror 的 TLS 和证书配置。对于每个 mirror，你可以定义`auth`和/或`tls`

containerd 使用了类似 K8S 中 svc 与 endpoint 的概念，svc 可以理解为访问名称，这个名称会解析到对应的 endpoint 上。 也可以理解 mirror 配置就是一个反向代理，它把客户端的请求代理到 endpoint 配置的后端镜像仓库。mirror 名称可以随意填写，但是必须符合`IP或域名`的定义规则。并且可以配置多个 endpoint，默认解析到第一个 endpoint，如果第一个 endpoint 没有返回数据，则自动切换到第二个 endpoint，以此类推。

比如以下配置示例：

```
mirrors:
  "172.31.6.200:5000":
    endpoint:
      - "http://172.31.6.200:5000"
  "rancher.ksd.top:5000":
    endpoint:
      - "http://172.31.6.200:5000"
  "docker.io":
    endpoint:
      - "https://fogjl973.mirror.aliyuncs.com"
      - "https://registry-1.docker.io"
```

可以通过 `crictl pull 172.31.6.200:5000/library/alpine` 和 `crictl pull rancher.ksd.top:5000/library/alpine`获取到镜像，但镜像都是从同一个仓库获取到的。

```
root@rancher-server:/etc/rancher/k3s# systemctl restart k3s.service
root@rancher-server:/etc/rancher/k3s# crictl pull 172.31.6.200:5000/library/alpine
Image is up to date for sha256:a24bb4013296f61e89ba57005a7b3e52274d8edd3ae2077d04395f806b63d83e
root@rancher-server:/etc/rancher/k3s# crictl pull rancher.ksd.top:5000/library/alpine
Image is up to date for sha256:a24bb4013296f61e89ba57005a7b3e52274d8edd3ae2077d04395f806b63d83e
root@rancher-server:/etc/rancher/k3s#
```

### 非安全（http）私有仓库配置

配置非安全（http）私有仓库，只需要在 endpoint 中指定 http 协议头的地址即可。

> 在没有 TLS 通信的情况下，需要为 endpoints 指定`http://`，否则将默认为 https。

- 无认证

如果你使用的是非安全（http）私有仓库，那么可以通过下面的参数来配置 k3s 连接私有仓库：

```
root@ip-172-31-13-117:~# cat >> /etc/rancher/k3s/registries.yaml <<EOF
mirrors:
  "172.31.6.200:5000":
    endpoint:
      - "http://172.31.6.200:5000"
EOF
systemctl restart k3s
```

然后就可以通过 crictl 去 pull 镜像：

```
root@ip-172-31-13-117:~# crictl pull 172.31.6.200:5000/my-ubuntu
Image is up to date for sha256:9499db7817713c4d10240ca9f5386b605ecff7975179f5a46e7ffd59fff462ee
```

接下来，在看一下 containerd 的配置，可以看到文件末尾追加了如下配置：

```
root@ip-172-31-13-117:~# cat /var/lib/rancher/k3s/agent/etc/containerd/config.toml
[plugins.cri.registry.mirrors]

[plugins.cri.registry.mirrors."172.31.6.200:5000"]
  endpoint = ["http://172.31.6.200:5000"]

[plugins.cri.registry.mirrors."rancher.ksd.top:5000"]
  endpoint = ["http://172.31.6.200:5000"]
```

- 有认证

如果你的非安全（http）私有仓库带有认证，那么可以通过下面的参数来配置 k3s 连接私有仓库：

```
root@ip-172-31-13-117:~# cat >> /etc/rancher/k3s/registries.yaml <<EOF
mirrors:
  "35.182.134.80":
    endpoint:
      - "http://35.182.134.80"
configs:
  "35.182.134.80":
    auth:
      username: admin # this is the registry username
      password: Harbor12345 # this is the registry password
EOF
systemctl restart k3s
```

通过 crictl 去 pull 镜像：

```
root@ip-172-31-13-117:~# crictl pull 35.182.134.80/ksd/ubuntu:16.04
Image is up to date for sha256:9499db7817713c4d10240ca9f5386b605ecff7975179f5a46e7ffd59fff462ee
```

Containerd 配置文件末尾追加了如下配置：

```
root@ip-172-31-13-117:~# cat /var/lib/rancher/k3s/agent/etc/containerd/config.toml
[plugins.cri.registry.mirrors]

[plugins.cri.registry.mirrors."35.182.134.80"]
  endpoint = ["http://35.182.134.80"]

[plugins.cri.registry.configs."35.182.134.80".auth]
  username = "admin"
  password = "Harbor12345"
```

### 安全（https）私有仓库配置

> 以下示例均启用了认证，所以每个示例都配置了`configs.auth`，如果实际环境未配置认证，删除`configs.auth`配置即可。

- 使用授信 ssl 证书

与非安全（http）私有仓库配置类似，只需要配置 endpoint 对应的仓库地址为 https 即可。

```
root@ip-172-31-13-117:~# cat >> /etc/rancher/k3s/registries.yaml <<EOF
mirrors:
  "harbor.kingsd.top":
    endpoint:
      - "https://harbor.kingsd.top"
configs:
  "harbor.kingsd.top":
    auth:
      username: admin # this is the registry username
      password: Harbor12345 # this is the registry password
EOF
systemctl restart k3s
```

通过 crictl 去 pull 镜像：

```
root@ip-172-31-13-117:~# crictl pull harbor.kingsd.top/ksd/ubuntu:16.04
Image is up to date for sha256:9499db7817713c4d10240ca9f5386b605ecff7975179f5a46e7ffd59fff462ee
```

Containerd 配置文件末尾追加了如下配置：

```
root@ip-172-31-13-117:~# cat /var/lib/rancher/k3s/agent/etc/containerd/config.toml
[plugins.cri.registry.mirrors]

[plugins.cri.registry.mirrors."harbor.kingsd.top"]
  endpoint = ["https://harbor.kingsd.top"]

[plugins.cri.registry.configs."harbor.kingsd.top".auth]
  username = "admin"
  password = "Harbor12345"
```

- 使用自签 ssl 证书

如果后端仓库使用的是自签名的 ssl 证书，那么需要配置 CA 证书 用于 ssl 证书的校验。

```
root@ip-172-31-13-117:~# cat >> /etc/rancher/k3s/registries.yaml <<EOF
mirrors:
  "harbor-ksd.kingsd.top":
    endpoint:
      - "https://harbor-ksd.kingsd.top"
configs:
  "harbor-ksd.kingsd.top":
    auth:
      username: admin # this is the registry username
      password: Harbor12345 # this is the registry password
    tls:
      ca_file: /opt/certs/ca.crt
EOF
systemctl restart k3s
```

通过 crictl 去 pull 镜像：

```
root@ip-172-31-13-117:~# crictl pull harbor-ksd.kingsd.top/ksd/ubuntu:16.04
Image is up to date for sha256:9499db7817713c4d10240ca9f5386b605ecff7975179f5a46e7ffd59fff462ee
```

Containerd 配置文件末尾追加了如下配置：

```
root@ip-172-31-13-117:~# cat /var/lib/rancher/k3s/agent/etc/containerd/config.toml
[plugins.cri.registry.mirrors]

[plugins.cri.registry.mirrors."harbor-ksd.kingsd.top"]
  endpoint = ["https://harbor-ksd.kingsd.top"]

[plugins.cri.registry.configs."harbor-ksd.kingsd.top".auth]
  username = "admin"
  password = "Harbor12345"

[plugins.cri.registry.configs."harbor-ksd.kingsd.top".tls]
  ca_file = "/opt/certs/ca.crt"
```

- ssl 双向认证

如果镜像仓库配置了双向认证，那么需要为 containerd 配置 ssl 证书用于 镜像仓库对 containerd 做认证。

```
root@ip-172-31-13-117:~# cat >> /etc/rancher/k3s/registries.yaml <<EOF
mirrors:
  "harbor-ksd.kingsd.top":
    endpoint:
      - "https://harbor-ksd.kingsd.top"
configs:
  "harbor-ksd.kingsd.top":
    auth:
      username: admin # this is the registry username
      password: Harbor12345 # this is the registry password
    tls:
      ca_file: /opt/certs/ca.crt # path to the ca file used in the registry
      cert_file: /opt/certs/harbor-ksd.kingsd.top.cert # path to the cert file used in the registry
      key_file: /opt/certs/harbor-ksd.kingsd.top.key # path to the key file used in the registry
EOF
systemctl restart k3s
```

通过 crictl 去 pull 镜像：

```
root@ip-172-31-13-117:~# crictl pull harbor-ksd.kingsd.top/ksd/ubuntu:16.04
Image is up to date for sha256:9499db7817713c4d10240ca9f5386b605ecff7975179f5a46e7ffd59fff462ee
```

Containerd 配置文件末尾追加了如下配置：

```
root@ip-172-31-13-117:~# cat /var/lib/rancher/k3s/agent/etc/containerd/config.toml
[plugins.cri.registry.mirrors]

[plugins.cri.registry.mirrors."harbor-ksd.kingsd.top"]
  endpoint = ["https://harbor-ksd.kingsd.top"]

[plugins.cri.registry.configs."harbor-ksd.kingsd.top".auth]
  username = "admin"
  password = "Harbor12345"

[plugins.cri.registry.configs."harbor-ksd.kingsd.top".tls]
  ca_file = "/opt/certs/ca.crt"
  cert_file = "/opt/certs/harbor-ksd.kingsd.top.cert"
  key_file = "/opt/certs/harbor-ksd.kingsd.top.key"
```

### 加速器配置

Containerd 与 docker 都有默认仓库，均为 `docker.io`。 如果配置中未指定 mirror 为 `docker.io`，containerd 后会自动加载 `docker.io` 配置。与 docker 不同的是，containerd 可以修改 `docker.io` 对应的 endpoint（默认为 https://registry-1.docker.io），而 docker 无法修改。

Docker 中可以通过 `registry-mirrors` 设置镜像加速地址。如果 pull 的镜像不带仓库地址（`项目名+镜像名:tag`），则会从默认镜像仓库去拉取镜像。如果配置了镜像加速地址，会先访问镜像加速仓库，如果没有返回数据，再访问默认的镜像仓库。

Containerd 目前没有直接配置镜像加速的功能，但 containerd 中可以修改 `docker.io` 对应的 endpoint，所以可以通过修改 endpoint 来实现镜像加速下载。因为 endpoint 是轮训访问，所以可以给 `docker.io` 配置多个仓库地址来实现 `加速地址+默认仓库地址`。如下配置示例：

```
cat >> /etc/rancher/k3s/registries.yaml <<EOF
mirrors:
  "docker.io":
    endpoint:
      - "https://fogjl973.mirror.aliyuncs.com"
      - "https://registry-1.docker.io"
EOF

systemctl restart k3s
```

Containerd 配置文件末尾追加了如下配置：

```
root@ip-172-31-13-117:~# cat /var/lib/rancher/k3s/agent/etc/containerd/config.toml
[plugins.cri.registry.mirrors]

[plugins.cri.registry.mirrors."docker.io"]
  endpoint = ["https://fogjl973.mirror.aliyuncs.com", "https://registry-1.docker.io"]
```

### 完整配置示例

```
mirrors:
  "192.168.50.119":
    endpoint:
      - "http://192.168.50.119"
  "docker.io":
    endpoint:
      - "https://fogjl973.mirror.aliyuncs.com"
      - "https://registry-1.docker.io"
configs:
  "192.168.50.119":
    auth:
      username: '' # this is the registry username
      password: '' # this is the registry password
    tls:
      cert_file: '' # path to the cert file used in the registry
      key_file: '' # path to the key file used in the registry
      ca_file: '' # path to the ca file used in the registry
  "docker.io":
    auth:
      username: '' # this is the registry username
      password: '' # this is the registry password
    tls:
      cert_file: '' # path to the cert file used in the registry
      key_file: '' # path to the key file used in the registry
      ca_file: '' # path to the ca file used in the registry
```

## 参考

- K3s私有镜像仓库配置：https://docs.rancher.cn/docs/k3s/installation/private-registry/_index
- Containerd配置镜像仓库：https://github.com/containerd/cri/blob/master/docs/registry.md
