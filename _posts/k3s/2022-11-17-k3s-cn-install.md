---
layout: post
title: 使用国内资源安装 K3s 全攻略
subtitle:
date: 2022-7-17 21:06:00 +0800
author: Ksd
header-img: img/post-bg-desk.jpg
catalog: true
tags:
  - K3s
---

近期，经常有小伙伴在 K3s 社区中咨询关于使用国内资源安装 K3s 的问题。所以，本文将一些使用国内资源安装 K3s 的技巧统一整理出来，通过一篇文章详细介绍如何使用国内资源安装 K3s。

## K3s 安装和启动流程

K3s 是一个轻量级的 Kubernetes 发行版，非常简单易用而且轻量。只需要一个简单的安装脚本即可把 K3s 安装到你的主机。

以下是使用官方安装脚本的执行过程：

```
# curl -sfL https://get.k3s.io | sh -
[INFO]  Finding release for channel stable
[INFO]  Using v1.25.3+k3s1 as release
[INFO]  Downloading hash https://github.com/k3s-io/k3s/releases/download/v1.25.3+k3s1/sha256sum-amd64.txt
[INFO]  Downloading binary https://github.com/k3s-io/k3s/releases/download/v1.25.3+k3s1/k3s
[INFO]  Verifying binary download
...
...
[INFO]  systemd: Starting k3s
```

如果从国内环境安装 K3s 可能会遇到安装速度特别缓慢或者 time out 的情况，从以上的安装过程可以分析出主要由以下几个原因导致：

- K3s 的安装脚本(https://get.k3s.io)存储在国外的服务器，从国内环境访问可能出现无法访问的情况
- K3s 默认安装 stable 版本，stable 对应的具体 K3s 版本是通过 https://update.k3s.io/v1-release/channels 解析来的，而这个地址也是运行在一个国外的服务器上
- 当通过 channel 解析出对应 K3s 的版本为：v1.25.3+k3s1，此时需要到 github 上拉取对应的 K3s 二进制文件。虽然这个二进制文件才几十兆，但国内环境访问 github 经常会出现无法访问的情况。

```
# kubectl get pods -A
NAMESPACE     NAME                                      READY   STATUS              RESTARTS   AGE
kube-system   helm-install-traefik-crd-7k9rw            0/1     ContainerCreating   0          10m
kube-system   helm-install-traefik-8q69g                0/1     ContainerCreating   0          10m
kube-system   coredns-75fc8f8fff-hlx2w                  0/1     ContainerCreating   0          10m
kube-system   metrics-server-5c8978b444-xz6vx           0/1     ContainerCreating   0          10m
kube-system   local-path-provisioner-5b5579c644-8g2kn   0/1     ImagePullBackOff    0          10m
```

另外，要完整的运行 K3s，还依赖一些系统的服务，这些系统服务(例如：coredns、traefik)都是以容器的方式运行。而这些系统服务依赖的系统镜像默认是从 DockerHub 去拉取。同样从国内访问偶尔会出现无法访问或拉取镜像缓慢的情况。

以上，就是从国内环境使用 K3s 的一些痛点。

## 使用国内资源安装 K3s

为了解决以上问题，K3s 社区已经将所需的 K3s 资源都同步到了国内的服务器上，这样我们就可以使用这些国内资源在国内环境上安装 K3s，不但提升了安装速度也提升了安装的稳定性。

> 该站点由 K3s 社区维护，同步资源到国内服务器有可能出现延后或遗漏情况，如发现延后或遗漏情况欢迎反馈到中文论坛(https://forums.rancher.cn)。

K3s 社区都同步了哪些资源到国内？

- K3s 安装脚本
- Channel 解析文件
- K3s 的二进制文件
- K3s 依赖系统镜像

接下来，再来看下应该如何运用国内的资源安装 K3s：

```
# curl –sfL \
     https://rancher-mirror.oss-cn-beijing.aliyuncs.com/k3s/k3s-install.sh | \
     INSTALL_K3S_MIRROR=cn sh -s - \
     --system-default-registry "registry.cn-hangzhou.aliyuncs.com"

[INFO]  Finding release for channel stable
[INFO]  Using v1.25.3+k3s1 as release
[INFO]  Downloading hash rancher-mirror.oss-cn-beijing.aliyuncs.com/k3s/v1.25.3-k3s1/sha256sum-amd64.txt
[INFO]  Downloading binary rancher-mirror.oss-cn-beijing.aliyuncs.com/k3s/v1.25.3-k3s1/k3s
[INFO]  Verifying binary download
...
...
[INFO]  systemd: Starting k3s
```

确认系统镜像是否从阿里云镜像仓库拉取：

```
# kubectl get pods -n kube-system
NAME                                     READY   STATUS      RESTARTS   AGE
coredns-7c855cf8c6-x6d77                 1/1     Running     0          7m55s

# kubectl describe pods coredns-7c855cf8c6-x6d77 -n kube-system
Events:
  Type    Reason     Age    From               Message
  ----    ------     ----   ----               -------
  Normal  Scheduled  7m44s  default-scheduler  Successfully assigned kube-system/coredns-7c855cf8c6-x6d77 to k3s3
  Normal  Pulling    7m40s  kubelet            Pulling image "registry.cn-hangzhou.aliyuncs.com/rancher/mirrored-coredns-coredns:1.9.1"
  Normal  Pulled     7m6s   kubelet            Successfully pulled image "registry.cn-hangzhou.aliyuncs.com/rancher/mirrored-coredns-coredns:1.9.1" in 34.050826086s
  Normal  Created    7m6s   kubelet            Created container coredns
  Normal  Started    7m6s   kubelet            Started container coredns
```

首先，安装 K3s 使用的是存储在阿里云对象存储上的 K3s 安装脚本，并且使用存储在国内 channel 去解析对应的 K3s 版本。

其次，通过 `INSTALL_K3S_MIRROR=cn` 环境变量来指定 K3s 的二进制文件从国内的阿里云对象存储上去拉取。

最后，通过 `--system-default-registry` 参数来指定 K3s 的系统镜像从国内的阿里云镜像仓库(registry.cn-hangzhou.aliyuncs.com) 去拉取。

如果你的带宽充足，一分钟之内即可完成 K3s 的安装和系统服务的启动。

## K3s 配置 Mirror

以上这些步骤只是为了加速 K3s 的安装和启动。启动 K3s 后你可能会在 K3s 上部署自己的业务(例如 nginx)，而这些镜像默认也是从 DockerHub 拉取。如果使用 docker 容器运行时，你可能会在 docker 上配置 mirror 来加速镜像的拉取。

K3s 默认使用的 containerd 容器运行时。而且，可以通过 K3s 的参数来设置 containerd 的 mirror，设置方式如下：

```
cat >> /etc/rancher/k3s/registries.yaml <<EOF
mirrors:
  "docker.io":
    endpoint:
      - "https://docker.mirrors.ustc.edu.cn" # 可根据需求替换 mirror 站点
      - "https://registry-1.docker.io"
EOF
systemctl restart k3s
```

经过以上配置后，通过 K3s 拉取的镜像如果在配置的 mirror 站点中存在，那么将会从该站点拉取镜像。如果不存在，将会从默认的 docker.io 中拉取镜像。

如果你想确认 containerd 的 mirror 是否生效，你可以使用 `crictl info` 检查：

```
# crictl info
    "registry": {
      "configPath": "",
      "mirrors": {
        "docker.io": {
          "endpoint": [
            "https://docker.mirrors.ustc.edu.cn",
            "https://registry-1.docker.io"
          ],
          "rewrite": null
        }
      },
```

## 从国内获取 K3s 离线安装资源

K3s 离线安装(https://docs.k3s.io/installation/airgap)需要手动下载 K3s 的二进制文件和镜像的 tar 包。

当然，这些资源也可以从国内的服务器上找到并下载。Rancher 社区已经把我们常用的 Rancher 产品相关资源还有 K8s 常用工具都已经同步到了国内，并提供给大家免费下载。

如果要从国内资源下载 Rancher 相关的资源，可以访问 https://mirror.rancher.cn/，然后根据不同的产品目录和版本下载对应的资源。

![](https://tva1.sinaimg.cn/large/008vxvgGly1h8881n8wtaj30wr0u0tct.jpg)

> 注意：
> 该站点因为备案的问题暂时关闭，等恢复访问后，第一时间通知大家。

## 通过 Rancher Manager 创建 K3s 集群

从 Rancher v2.6 开始，支持从 Rancher Manager 创建 K3s 集群。通过 Rancher Manager 创建 K3s 集群和默认的 K3s 集群安装有所不同，前者创建集群主要依赖一些镜像完成，这些镜像默认是从 DockerHub 拉取。

同样，可以在 Rancher Manager 修改创建 K3s 集群的参数来完成使用国内资源安装 K3s 集群。只需要在创建 K3s 集群时导航到 `Registries`，选择 `Pull images for Rancher from a private registry` 并设置 `Registry hostname for Rancher images` 的值为阿里云镜像仓库的地址 "registry.cn-hangzhou.aliyuncs.com" 即可，如下图：

![](https://tva1.sinaimg.cn/large/008vxvgGly1h888sfxy46j31c80u0tc5.jpg)

## 后记

通过以上方式安装 K3s 基本能满足国内环境使用 K3s 的各种需求，而且从安装和启动速度上来说，相对于官方的安装脚本要更加节省时间。

如果使用以上方式安装 K3s 出现问题或疑问，以及在国内使用 K3s 还有其他需求，欢迎大家把问题反馈到中文论坛(https://forums.rancher.cn/)。
