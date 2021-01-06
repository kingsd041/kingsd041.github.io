---
layout: post
title: K3s 离线安装
subtitle: 导入镜像和配置registry
date: 2021-01-01 21:06:00 +0800
author: Ksd
header-img: img/post-bg-github-cup.jpg
catalog: true
tags:
  - rancher
  - K3S
  - Kubernetes
  - containerd
  - registry
  - airgap
---

## 前言

相信大家对 K3s 已经非常熟悉了，它是一个轻量级的 Kubernetes 发行版，在 2020 年统计的 K3s 下载量中，K3s 的全球下载量已经超过 100 万次，每周平均被安装超过 2 万次，其中 30%的下载量来自于中国。在国内已经有许多用户将 K3s 应用到了各种边缘计算和物联网设备中，同时也被广泛应用于智能工厂部署的生产线机器人和一些世界上最大型的风力发电厂当中。

针对生成环境下的 K3s，一个不可逾越的问题就是**离线安装**。说起离线安装，需要在你的离线环境准备以下 3 个组件：

- K3s 的安装脚本
- K3s 的二进制文件
- K3s 依赖的镜像

> 以上三个组件都可以通过[K3s Release](https://github.com/k3s-io/k3s/releases)页面下载，如果在国内使用，推荐从 http://mirror.cnrancher.com 获得这些组件。

笔者认为离线安装的重点在于**K3s 依赖的镜像**部分，因为 K3s 的"安装脚本"和"二进制文件"只需要下载到对应目录，然后赋予相应的权限即可，非常简单。但**K3s 依赖的镜像**的安装方式取决于你使用的是**手动部署镜像**还是**私有注册表**，也取决于容器运行时使用的是`containerd`还是`docker`。

针对不同的组合形式，可以分为以下几种形式来实现离线安装：

- Containerd + 手动部署镜像方式
- Docker + 手动部署镜像方式
- Containerd + 私有注册表方式
- Docker + 私有注册表方式

## Containerd + 手动部署镜像方式

> 假设你已经将同一版本的 K3s 的安装脚本(k3s-install.sh)、K3s 的二进制文件(k3s)、K3s 依赖的镜像(k3s-airgap-images-amd64.tar)下载到了`/root`目录下。

如果你使用的容器运行时为`containerd`，在启动 K3s 时，它会检查`/var/lib/rancher/k3s/agent/images/`是否存在可用的镜像压缩包，如果存在，就将该镜像导入到`containerd` 镜像列表中。 所以我们只需要下载 K3s 依赖的镜像到`/var/lib/rancher/k3s/agent/images/`目录，然后启动 K3s 即可。

1. 导入镜像到 containerd 镜像列表

```
sudo mkdir -p /var/lib/rancher/k3s/agent/images/
sudo cp /root/k3s-airgap-images-amd64.tar /var/lib/rancher/k3s/agent/images/
```

2. 将 K3s 安装脚本和 K3s 二进制文件移动到对应目录并授予可执行权限

```
sudo chmod a+x /root/k3s /root/k3s-install.sh
sudo cp /root/k3s /usr/local/bin/
```

3. 安装 K3s

```
INSTALL_K3S_SKIP_DOWNLOAD=true /root/k3s-install.sh
```

稍等片刻，即可查看到 K3s 已经成功启动：

```
root@k3s-docker:~# crictl images
IMAGE                                      TAG                 IMAGE ID            SIZE
docker.io/rancher/coredns-coredns          1.8.0               296a6d5035e2d       42.6MB
docker.io/rancher/klipper-helm             v0.3.2              4be09ab862d40       146MB
docker.io/rancher/klipper-lb               v0.1.2              897ce3c5fc8ff       6.46MB
docker.io/rancher/library-busybox          1.31.1              1c35c44120825       1.44MB
docker.io/rancher/library-traefik          1.7.19              aa764f7db3051       86.6MB
docker.io/rancher/local-path-provisioner   v0.0.14             e422121c9c5f9       42MB
docker.io/rancher/metrics-server           v0.3.6              9dd718864ce61       41.2MB
docker.io/rancher/pause                    3.1                 da86e6ba6ca19       746kB

root@k3s-docker:~# kubectl get pods -A
NAMESPACE     NAME                                      READY   STATUS      RESTARTS   AGE
kube-system   local-path-provisioner-7c458769fb-zdg9z   1/1     Running     0          38s
kube-system   coredns-854c77959c-696gk                  1/1     Running     0          38s
kube-system   metrics-server-86cbb8457f-hs6vw           1/1     Running     0          38s
kube-system   helm-install-traefik-4pgcr                0/1     Completed   0          38s
kube-system   svclb-traefik-bq7wl                       2/2     Running     0          17s
kube-system   traefik-6f9cbd9bd4-jccd7                  1/1     Running     0          17s
```

## Docker + 手动部署镜像方式

> 假设你已经将同一版本的 K3s 的安装脚本(k3s-install.sh)、K3s 的二进制文件(k3s)、K3s 依赖的镜像(k3s-airgap-images-amd64.tar)下载到了`/root`目录下。

与 containerd 不同，使用 docker 作为容器运行时，启动 K3s 不会导入`/var/lib/rancher/k3s/agent/images/`目录下的镜像。所以在启动 K3s 之前我们需要将 K3s 依赖的镜像手动导入到 docker 镜像列表中。

1. 导入镜像到 docker 镜像列表

```
sudo docker load -i k3s-airgap-images-amd64.tar
```

2. 将 K3s 安装脚本和 K3s 二进制文件移动到对应目录并授予可执行权限

```
sudo chmod a+x /root/k3s /root/k3s-install.sh
sudo cp /root/k3s /usr/local/bin/
```

3. 安装 K3s

```
INSTALL_K3S_SKIP_DOWNLOAD=true INSTALL_K3S_EXEC='--docker' ./k3s-install.sh
```

稍等片刻，即可查看到 K3s 已经成功启动：

```
root@k3s-docker:~# docker images
REPOSITORY                       TAG                 IMAGE ID            CREATED             SIZE
rancher/klipper-helm             v0.3.2              4be09ab862d4        7 weeks ago         145MB
rancher/coredns-coredns          1.8.0               296a6d5035e2        2 months ago        42.5MB
rancher/library-busybox          1.31.1              1c35c4412082        7 months ago        1.22MB
rancher/local-path-provisioner   v0.0.14             e422121c9c5f        7 months ago        41.7MB
rancher/library-traefik          1.7.19              aa764f7db305        14 months ago       85.7MB
rancher/metrics-server           v0.3.6              9dd718864ce6        14 months ago       39.9MB
rancher/klipper-lb               v0.1.2              897ce3c5fc8f        19 months ago       6.1MB
rancher/pause                    3.1                 da86e6ba6ca1        3 years ago         742kB

root@k3s-docker:~# kubectl get pods -A
NAMESPACE     NAME                                      READY   STATUS      RESTARTS   AGE
kube-system   metrics-server-86cbb8457f-8ckr6           1/1     Running     0          30s
kube-system   local-path-provisioner-7c458769fb-vhkjr   1/1     Running     0          30s
kube-system   helm-install-traefik-4b46c                0/1     Completed   0          31s
kube-system   coredns-854c77959c-4ql8t                  1/1     Running     0          30s
kube-system   svclb-traefik-kbtbx                       2/2     Running     0          27s
kube-system   traefik-6f9cbd9bd4-rbm6k                  1/1     Running     0          27s
```

## Containerd + 私有注册表方式

> 假设你已经将同一版本的 K3s 的安装脚本(k3s-install.sh)、K3s 的二进制文件(k3s)下载到了`/root`目录下。并且 K3s 所需要的镜像已经上传到了镜像仓库（本例的镜像仓库地址为：http://192.168.64.44:5000）。
> K3s 所需的镜像列表可以从 K3s [Release](https://github.com/k3s-io/k3s/releases)页面的`k3s-images.txt`获得。

1. 配置 K3s 镜像仓库

启动 K3s 默认会从`docker.io`拉取镜像。使用`containerd`容器运行时在离线安装时，我们只需要将镜像仓库地址配置到`docker.io`下的`endpoint`即可，我的测试环境的镜像仓库是`不使用 TLS`并且`无认证`的方式搭建的，更多配置说明请参考[配置 containerd 镜像仓库完全攻略](http://kingsd.top/2020/12/30/k3s-containerd-registry/)或[K3s 官方文档](https://docs.rancher.cn/docs/k3s/installation/private-registry/_index/)

```
sudo mkdir -p /etc/rancher/k3s
sudo cat >> /etc/rancher/k3s/registries.yaml <<EOF
mirrors:
  "docker.io":
    endpoint:
      - "http://192.168.64.44:5000"
      - "https://registry-1.docker.io"
EOF
```

2. 将 K3s 安装脚本和 K3s 二进制文件移动到对应目录并授予可执行权限

```
sudo chmod a+x /root/k3s /root/k3s-install.sh
sudo cp /root/k3s /usr/local/bin/
```

3. 安装 K3s

```
INSTALL_K3S_SKIP_DOWNLOAD=true /root/k3s-install.sh
```

稍等片刻，即可查看到 K3s 已经成功启动：

```
root@k3s-containerd:~# crictl images
IMAGE                                      TAG                 IMAGE ID            SIZE
docker.io/rancher/coredns-coredns          1.8.0               296a6d5035e2d       12.9MB
docker.io/rancher/klipper-helm             v0.3.2              4be09ab862d40       50.7MB
docker.io/rancher/klipper-lb               v0.1.2              897ce3c5fc8ff       2.71MB
docker.io/rancher/library-traefik          1.7.19              aa764f7db3051       24MB
docker.io/rancher/local-path-provisioner   v0.0.14             e422121c9c5f9       13.4MB
docker.io/rancher/metrics-server           v0.3.6              9dd718864ce61       10.5MB
docker.io/rancher/pause                    3.1                 da86e6ba6ca19       326kB

root@k3s-containerd:~# kubectl get pods -A
NAMESPACE     NAME                                      READY   STATUS      RESTARTS   AGE
kube-system   local-path-provisioner-7c458769fb-7w8hb   1/1     Running     0          37s
kube-system   coredns-854c77959c-f8m2n                  1/1     Running     0          37s
kube-system   helm-install-traefik-9lbrx                0/1     Completed   0          38s
kube-system   svclb-traefik-x8f6f                       2/2     Running     0          29s
kube-system   metrics-server-86cbb8457f-f7lb7           1/1     Running     0          37s
kube-system   traefik-6f9cbd9bd4-4s66r                  1/1     Running     0          29s
```

## Docker + 私有注册表方式

> 假设你已经将同一版本的 K3s 的安装脚本(k3s-install.sh)、K3s 的二进制文件(k3s)下载到了`/root`目录下。并且 K3s 所需要的镜像已经上传到了镜像仓库（本例的镜像仓库地址为：http://192.168.64.44:5000）。
> K3s 所需的镜像列表可以从 K3s [Release](https://github.com/k3s-io/k3s/releases)页面的`k3s-images.txt`获得。

1. 配置 K3s 镜像仓库

Docker 不支持像 containerd 那样可以通过修改 docker.io 对应的 endpoint（默认为 https://registry-1.docker.io）来间接修改默认镜像仓库的地址。但在Docker中可以通过配置`registry-mirrors`来实现从其他镜像仓库中获取K3s镜像。 这样配置之后，会先从`registry-mirrors`配置的地址拉取镜像，如果获取不到才会从默认的`docker.io`获取镜像，从而满足了我们的需求。

```
cat >> /etc/docker/daemon.json <<EOF
{
    "registry-mirrors": ["http://192.168.64.44:5000"]
}
EOF

sudo systemctl daemon-reload
sudo systemctl restart docker
```

2. 将 K3s 安装脚本和 K3s 二进制文件移动到对应目录并授予可执行权限

```
sudo chmod a+x /root/k3s /root/k3s-install.sh
sudo cp /root/k3s /usr/local/bin/
```

3. 安装 K3s

```
INSTALL_K3S_SKIP_DOWNLOAD=true INSTALL_K3S_EXEC='--docker' /root/k3s-install.sh
```

稍等片刻，即可查看到 K3s 已经成功启动：

```
root@k3s-docker:~# docker images
REPOSITORY                       TAG                 IMAGE ID            CREATED             SIZE
rancher/klipper-helm             v0.3.2              4be09ab862d4        7 weeks ago         145MB
rancher/coredns-coredns          1.8.0               296a6d5035e2        2 months ago        42.5MB
rancher/local-path-provisioner   v0.0.14             e422121c9c5f        7 months ago        41.7MB
rancher/library-traefik          1.7.19              aa764f7db305        14 months ago       85.7MB
rancher/metrics-server           v0.3.6              9dd718864ce6        14 months ago       39.9MB
rancher/klipper-lb               v0.1.2              897ce3c5fc8f        19 months ago       6.1MB
rancher/pause                    3.1                 da86e6ba6ca1        3 years ago         742kB

root@k3s-docker:~# kubectl get pods -A
NAMESPACE     NAME                                      READY   STATUS      RESTARTS   AGE
kube-system   helm-install-traefik-bcclh                0/1     Completed   0          33s
kube-system   coredns-854c77959c-kp85f                  1/1     Running     0          33s
kube-system   metrics-server-86cbb8457f-85fpd           1/1     Running     0          33s
kube-system   local-path-provisioner-7c458769fb-r5nkw   1/1     Running     0          33s
kube-system   svclb-traefik-rbmhk                       2/2     Running     0          24s
kube-system   traefik-6f9cbd9bd4-k6t9n                  1/1     Running     0          24s
```
## 后记

**手动部署镜像**方式比较适合小规模安装，节点数量不多的场景。**私有注册表**方式比较适合规模比较大节点数比较多的集群。本文的docker registry采用的是最简单的搭建方式`docker run -d -p 5000:5000 --restart=always --name registry registry:2`，可能在你的环境中由于镜像仓库的搭建方式不同，你可能需要修改一些关于registry的参数。

## 参考

- [K3s 离线安装](https://docs.rancher.cn/docs/k3s/installation/airgap/_index/)
- [配置 containerd 镜像仓库完全攻略](https://mp.weixin.qq.com/s/nLz2eotMv68YXYHerfIvsA)
