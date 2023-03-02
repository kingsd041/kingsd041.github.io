---
layout: post
title: Rancher 高可用安装--Cert-Manager 签发 TLS 证书+4层 LB
subtitle: 使用 Cert-Manager 签发的 TLS 证书 + L4 LB 安装高可用安装
date: 2023-2-23 11:07:00 +0800
author: Ksd
header-img: img/post-bg-desk.jpg
catalog: true
tags:
  - Rancher
  - 高可用
---

## 前言

> Cert-Manager 签发 TLS 证书：意思是使用 Rancher 生成的 CA 证书，并由 Cert-Manager 签发证书， CA 证书默认有效期是 10 年，cert-manager 签发的证书默认 90 天有效期，到期后会自动轮换

安装 Rancher 主要分为[单节点](https://ranchermanager.docs.rancher.com/zh/pages-for-subheaders/rancher-on-a-single-node-with-docker)和[高可用](https://ranchermanager.docs.rancher.com/zh/pages-for-subheaders/install-upgrade-on-a-kubernetes-cluster)两种方式：

- 单节点通常是指通过 `docker run` 来启动的 rancher。这种方式非常不推荐生产上使用，如果你的目的是测试或演示，你可以使用 Docker 把 Rancher 安装到单个节点中。
- 高可用主要是指通过 helm 在 kubernetes 集群上安装 Rancher。这个 kubernetes 集群，我们叫他 local 集群，这个集群推荐使用专用的集群，也就是说只用来部署 rancher。如果你的主机资源不足，你可以使用单个主机去运行 local 集群，然后安装 rancher 时将副本数缩减为 1。虽然说这种方式 Rancher Server 没有高可用性，但如果你后期要像这个 local 集群添加节点，就可以很快的获得一个高可用的 Rancher Server。

同时，还有一些其他的安装方式，比如在 Amazon EKS 上部署 Rancher、离线安装等，可以参考官网文档：https://ranchermanager.docs.rancher.com/zh/pages-for-subheaders/installation-and-upgrade

## 说明

#### 参考

本文示例步骤，均参考 Rancher 官网文档[在 Kubernetes 集群上安装/升级 Rancher](https://ranchermanager.docs.rancher.com/zh/pages-for-subheaders/install-upgrade-on-a-kubernetes-cluster)章节。

#### 关于证书

对于才接触 Rancher 的用户，很多都是卡在了证书的配置上。其实 Rancher 的证书配置非常简单，一共分为以下三种：

- Rancher 生成的证书（默认）：Rancher 生成 CA，由 cert-manager 负责签发，默认 90 天有效期，过期后自动轮换
- Let’s Encrypt
- 你已有的证书
  - 自签名证书
  - 颁发机构颁发的证书

本文介绍如何使用**Rancher 生成 CA，由 cert-manager 负责签发的证书来安装高可用的 Rancher**，更多安装方式，可参考[官网文档](https://ranchermanager.docs.rancher.com/zh/pages-for-subheaders/install-upgrade-on-a-kubernetes-cluster)。

#### 关于 DNS

**生产环境安装 Rancher 高可用，需要有一个 DNS 服务器来解析 Rancher 的域名。**

这个 DNS 不是必须的，可以通过在 hosts 文件中映射 Rancher 的域名来解决没有 DNS 服务器的问题，但无论是测试环境和生产环境都不推荐使用 hosts 的方式映射域名。

**本示例已经提前搭建好 DNS 服务器，并做好了域名映射！**

## 通过 Rancher 生成的 CA 证书安装 Rancher HA

所谓 Rancher Server 高可用，就是通过 helm 将 Rancher 安装在 Kubernetes 集群之上，对于 Rancher 来说，只要是标准的发行版，都可以在上面进行安装，比如：rke、k3s、rke2、kubeadm、托管集群(aks、gks、tks 等)。

为了更好的指导安装，本文从一个裸机开始安装 local 集群，然后在 local 集群上部署高可用的 Rancher Server。

#### 安装环境

Rancher：v2.7.1

主机信息：
| 主机名 | 角色 | IP | OS |
| ------ | ------------- | -------------- | ------------------ |
| demo-1 | local cluster | 192.168.205.30 | Ubuntu 20.04 LTS |
| demo-2 | LB(nginx) | 192.168.205.31 | Ubuntu 20.04 LTS |
| demo-2 | 下游集群 | 192.168.205.34 | Ubuntu 20.04 LTS |

> 本文只是为了演示高可用安装，所以 local 集群只使用了一台，如果是生产环境，建议使用 3 台。

#### 安装 local 集群

> 重要:
>
> 每个 Rancher 支持的 Kubernetes 不同，所以在安装之前一定要参考官网的[支持矩阵](https://www.suse.com/suse-rancher/support-matrix/all-supported-versions/)或者 rancher 的 [release note](https://github.com/rancher/rancher/releases) 来确认支持的 Kubernetes 集群版本：

登录到 demo-1 主机，安装 local kubernete 集群，本文采用的是 k3s 集群：

```
# curl –sfL \
    https://rancher-mirror.rancher.cn/k3s/k3s-install.sh | \
    INSTALL_K3S_VERSION=v1.24.10+k3s1 \
    INSTALL_K3S_MIRROR=cn sh -s - \
    --system-default-registry "registry.cn-hangzhou.aliyuncs.com"
```

参数说明：

- 通过国内的安装脚本和环境变量（INSTALL_K3S_MIRROR=cn）来加速 K3s 的安装
- --system-default-registry：通过此参数，可以设置 K3s 的系统默认镜像仓库使用阿里云的仓库
- 通过 INSTALL_K3S_VERSION 设置 local 集群的 K3s 版本

如果你是使用国外的主机，那么你可以参考[k3s 文档](https://docs.k3s.io/zh/quick-start)来使用通用的安装脚本。
而且这些资源是 Rancher 社区自愿者提供，rancher 并不负责维护。

确认所有 pod 均成功运行;

```
root@demo-1:~# kubectl get pods -A
NAMESPACE     NAME                                      READY   STATUS      RESTARTS   AGE
kube-system   local-path-provisioner-79bf9db7dd-8hhzv   1/1     Running     0          99s
kube-system   coredns-59cd496867-c4hp5                  1/1     Running     0          99s
kube-system   helm-install-traefik-crd-whm9n            0/1     Completed   0          99s
kube-system   helm-install-traefik-n5hlp                0/1     Completed   1          99s
kube-system   metrics-server-9dc9c745f-pwxhf            1/1     Running     0          99s
kube-system   svclb-traefik-11b66970-5q2sj              2/2     Running     0          41s
kube-system   traefik-b44944bf7-5f87t                   1/1     Running     0          41s
```

#### 安装 helm 并设置 KUBECONFIG 环境变量

```
root@demo-1:~# curl https://rancher-mirror.rancher.cn/helm/get-helm-3.sh | INSTALL_HELM_MIRROR=cn bash
root@demo-1:~# export KUBECONFIG=/etc/rancher/k3s/k3s.yaml
root@demo-1:~# helm ls
NAME	NAMESPACE	REVISION	UPDATED	STATUS	CHART	APP VERSION
```

#### 安装 cert-manager

```
root@demo-1:~# helm repo add jetstack https://charts.jetstack.io
root@demo-1:~# helm install cert-manager jetstack/cert-manager \
    --namespace cert-manager \
    --create-namespace \
    --set installCRDs=true \
    --set image.repository=cnrancher/mirrored-jetstack-cert-manager-controller \
    --set webhook.image.repository=cnrancher/mirrored-jetstack-cert-manager-webhook \
    --set cainjector.image.repository=cnrancher/mirrored-jetstack-cert-manager-cainjector \
    --set startupapicheck.image.repository=cnrancher/mirrored-jetstack-cert-manager-ctl \
    --version v1.10.2
  ```

安装完 cert-manager 后，你可以通过检查 cert-manager 命名空间中正在运行的 Pod 来验证它是否已正确部署：

```
root@demo-1:~# kubectl get pods --namespace cert-manager

NAME                                       READY   STATUS    RESTARTS   AGE
cert-manager-cainjector-7cb8669d6b-47l6g   1/1     Running   0          90s
cert-manager-webhook-696c5db7ff-mwpmb      1/1     Running   0          90s
cert-manager-646c67487-2lls7               1/1     Running   0          90s
```

#### 添加 Rancher Helm Chart 仓库

```
root@demo-1:~# helm repo add rancher-stable https://releases.rancher.com/server-charts/stable
"rancher-stable" has been added to your repositories
```

#### 使用 Rancher 生成的 CA 证书部署 Rancher

```
root@demo-1:~# helm install rancher rancher-stable/rancher \
  --create-namespace \
  --namespace cattle-system \
  --set hostname=rancherdemo.kingsd.top \
  --set replicas=1 \
  --set bootstrapPassword=RancherForFun
```

说明：

- hostname：访问 rancher 所需的域名，需要在 dns 中将域名和 nginx 的主机进行映射
- replicas: replicas 设置 rancher 的副本数为 1，默认是 3

#### 确认安装完成

查看所有 rancher pod 的状态：

```
root@demo-1:~# kubectl -n cattle-system get pods -l app=rancher
NAME                       READY   STATUS    RESTARTS     AGE
rancher-7c5dbf46fc-6n9zj   1/1     Running   2 (8m ago)   11m
```

查看日志：

```
kubectl -n cattle-system logs -f -l app=rancher
```

#### 安装 LB

虽然本文演示环境的 local 集群只有 1 个节点和 1 个 rancher 副本，但生产环境建议使用 3 个节点的 local 集群和 3 个副本的 rancher pod。

所以要实现高可用，还需要在 rancher 前面加一个 LB，本文为了方便演示，使用 nginx 来演示 LB 的配置：

登录到 demo-2 主机设置 nginx 配置文件：

```
root@demo-2:~# cat /etc/nginx.conf
worker_processes 4;
worker_rlimit_nofile 40000;

events {
    worker_connections 8192;
}

stream {
    upstream rancher_servers_http {
        least_conn;
        server 192.168.205.30:80 max_fails=3 fail_timeout=5s;
        #server <IP_NODE_2>:80 max_fails=3 fail_timeout=5s;
        #server <IP_NODE_3>:80 max_fails=3 fail_timeout=5s;
    }
    server {
        listen 80;
        proxy_pass rancher_servers_http;
    }

    upstream rancher_servers_https {
        least_conn;
        server 192.168.205.30:443 max_fails=3 fail_timeout=5s;
        #server <IP_NODE_2>:443 max_fails=3 fail_timeout=5s;
        #server <IP_NODE_3>:443 max_fails=3 fail_timeout=5s;
    }
    server {
        listen     443;
        proxy_pass rancher_servers_https;
    }

}
```

- 192.168.205.30 为 rancher local 集群的主机
- 如果是 3 个节点的 local 集群并且 rancher 副本数也是 3，那需要将三个节点的主机 ip 都设置进去

启动 nginx：

```
root@demo-2:~# docker run -d --restart=unless-stopped \
  -p 80:80 -p 443:443 \
  -v /etc/nginx.conf:/etc/nginx/nginx.conf \
  nginx:stable
```

#### 修改域名和 LB 的映射记录

在 DNS 中将 rancherdemo.kingsd.top 的域名映射为 Nginx 的 IP 地址，本例的对应关系是：`rancherdemo.kingsd.top--192.168.205.31`

#### 访问 Rancher Server

从浏览器直接访问：https://rancherdemo.kingsd.top/，然后设置 heml 安装时候设置的引导密码和初始密码，即可登录。

## 创建下游集群

本例采用 rke 集群，rke2 和 k3s 集群也是一样的，流程基本没区别：

使用默认参数，创建 rke 集群，然后将生产的注册节点命令复制到 demo-3 主机执行即可：

![](https://raw.githubusercontent.com/kingsd041/picture/main/202302231617888.png)

![](https://raw.githubusercontent.com/kingsd041/picture/main/202302231624059.png)
