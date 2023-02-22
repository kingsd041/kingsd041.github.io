---
layout: post
title: RancherDesktop 配置 http proxy
subtitle:
date: 2023-2-21 21:07:00 +0800
author: Ksd
header-img: img/post-bg-rancher-k8s.png
catalog: true
tags:
  - RancherDesktop
---

撰写本文时，RancherDesktop 目前最新的版本是 1.7.0。虽然提供了[离线安装](https://docs.rancherdesktop.io/zh/how-to-guides/running-air-gapped)的方法，但只是将所需镜像手动拉倒缓存目录的方式，并没有提供如何通过代理去安装。

而且，有些镜像从国内访问比较慢的话，你可能期望在你的环境里配置代理来加速镜像的拉取，本文将介绍如何在 RancherDesktop 中配置 HTTP PROXY。

1. 使用 `rdctl shell` 登录到 lima，参考：https://docs.rancherdesktop.io/zh/references/rdctl-command-reference

```
# rdctl shell
lima-rancher-desktop:/Users/ksd$
```

2. 使用 sudo 修改文件 `/etc/conf.d/containerd`，然后退出 Rancher Desktop：
   > 如果你使用的容器运行时是 docker，那你可以修改 `/etc/conf.d/docker`

```
HTTP_PROXY="xxxx"
HTTPS_PROXY="xxxx"
NO_PROXY="localhost,127.0.0.1,xxxxx"

export HTTP_PROXY
export HTTPS_PROXY
export NO_PROXY
```

3. 启动或重启 Rancher Desktop 或 重启 Lima
4. 测试从互联网拉取镜像，代理应该可以正常工作

## 通过 Rancher Desktop 配置脚本添加代理

如果你闲修改配置文件麻烦，你也可以使用 Rancher Desktop 提供的[配置脚本](https://docs.rancherdesktop.io/zh/how-to-guides/provisioning-scripts)将所需的配置添加到对应的目录，以下是一个示例（我并没有验证过）：

```
provision:
- mode: system
  script: |
    cat <<EOF > /tmp/proxy.sh
    #!/bin/sh
    export http_proxy="http://foo.com"
    export https_proxy="http://foo.com"
    export no_proxy=kubernetes.docker.internal,127.0.0.1,127.0.0.0/8
    export ftp_proxy="ftp://foo.com/"
    export all_proxy="http://foo.com"
    export HTTP_PROXY="http://foo.com"
    export HTTPS_PROXY="http://foo.com"
    export NO_PROXY=kubernetes.docker.internal,127.0.0.1,127.0.0.0/8
    export FTP_PROXY="ftp://foo.com/"
    export ALL_PROXY="http://foo.com"
    EOF

    echo ". /tmp/proxy.sh" | sed -i -e '7r /dev/stdin' /etc/init.d/docker
    echo ". /tmp/proxy.sh" | sed -i -e '9r /dev/stdin' /etc/init.d/containerd
```

参考：https://github.com/rancher-sandbox/rancher-desktop/issues/897
