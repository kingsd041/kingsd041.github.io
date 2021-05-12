---
layout: post
title: 单节点 Rancher Server 连接私有仓库
subtitle: 
date: 2021-5-11 21:06:00 +0800
author: Ksd
header-img: img/post-bg-keybord.jpg
catalog: true
tags:
  - Rancher
  - Airgap
---

## 前言

Rancher 从 v2.5.x 开始，单节点 Rancher Server 内置了 K3s 作为 local 集群，该 local 集群除了支撑 Rancher Server 运行以外，还将运行 `fleet`、`rancher-webhook`、`gitjob`、`coredns` 等组件。下图为 Rancher v2.5.8 内置 K3s 集群默认启动的组件和所需的镜像：

![](https://tva1.sinaimg.cn/large/008i3skNly1gqeko0vbt6j30r90cswi1.jpg)

其中，`docker.io/rancher/coredns-coredns` 和 `docker.io/rancher/pause` 为 Rancher Server 内置的镜像，其他镜像需要在 Rancher Server 启动后到 dockerhub 去在线下载。

如果你的环境是离线环境，并且是通过 `docker run` 的方式启动 Rancher Server，会报一些镜像下载失败的日志：

```
E0511 08:39:56.060906      28 pod_workers.go:191] Error syncing pod d0f83155-f023-4ff6-9164-11b6b63ef4d6 ("helm-operation-t8mtl_cattle-system(d0f83155-f023-4ff6-9164-11b6b63ef4d6)"), skipping: [failed to "StartContainer" for "helm" with ImagePullBackOff: "Back-off pulling image \"rancher/shell:v0.1.6\"", failed to "StartContainer" for "proxy" with ImagePullBackOff: "Back-off pulling image \"rancher/shell:v0.1.6\""]
```

官网文档[单节点离线安装 Rancher Server](http://docs.rancher.cn/docs/rancher2.5/installation/other-installation-methods/air-gap/install-rancher/_index#%E5%8D%95%E8%8A%82%E7%82%B9%E5%AE%89%E8%A3%85)章节中指出了可以通过`CATTLE_SYSTEM_DEFAULT_REGISTRY`参数指定从私有镜像仓库去获取 Rancher Server 所需的镜像，但如果你的私有镜像仓库是**启用 TLS**或**有认证**的情况，`CATTLE_SYSTEM_DEFAULT_REGISTRY`是无法满足你的需求的。

针对上述场景，我们可以将内置 k3s 集群的`/etc/rancher/k3s/registries.yaml` 映射到宿主机上，然后通过修改`registries.yaml`来实现**启用 TLS**或**有认证** 等更复杂的场景，关于 k3s 配置私有仓库，可参考[k3s 官网](http://docs.rancher.cn/docs/k3s/installation/private-registry/_index/)。

## 单节点 Rancher Server 配置私有镜像仓库

以下章节将指导大家如何通过私有镜像仓库在离线环境下安装单节点 Rancher Server，针对镜像仓库类型的不同，分为以下几种场景：

- 私有仓库为 SSL 证书颁发机构颁发的证书（https），有认证
- 私有仓库为自签名证书（https），有认证
- 私有仓库不使用 SSL（使用 http），有认证

#### 私有仓库为 SSL 证书颁发机构颁发的证书（https），有认证

> 私有仓库中已经提前上传了 Rancher Server 所需要的镜像，如何同步镜像到私有镜像仓库可以参考[官方文档](http://docs.rancher.cn/docs/rancher2.5/installation/other-installation-methods/air-gap/populate-private-registry/_index)

**1. 配置 K3s `registries.yaml`**

```
root@ip-172-31-14-159:~# cat /opt/registries.yaml
mirrors:
  # 私有仓库域名
  harbor.kingsd.top:
    endpoint:
      - "https://harbor.kingsd.top"
configs:
  "harbor.kingsd.top":
    auth:
      username: admin  # 这是私有镜像仓库的用户名
      password: Password  # 这是私有镜像仓库的密码
```

**2. 启动单节点 Rancher Server**

```
root@ip-172-31-14-159:~# docker run -itd --privileged \
>     --restart=unless-stopped \
>     -p 80:80 -p 443:443 \
>     -e CATTLE_SYSTEM_DEFAULT_REGISTRY=harbor.kingsd.top \ # 设置私有仓库域名
>     -v /opt/registries.yaml:/etc/rancher/k3s/registries.yaml \ # 将宿主机`registries.yaml`映射到容器内
>     rancher/rancher:v2.5.8
```

**3. 验证**

等待 Rancher Server 启动成功后，我们可以 exec 到容器内确认所需要的组件是否启动：

```
root@3fd636aa513e:/var/lib/rancher# kubectl get pods -A
NAMESPACE                 NAME                                READY   STATUS      RESTARTS   AGE
cattle-system             helm-operation-5w49g                0/2     Completed   0          3m21s
cattle-system             helm-operation-gclkp                0/2     Completed   0          3m3s
cattle-system             helm-operation-jt948                0/2     Completed   0          3m13s
cattle-system             helm-operation-l76g6                0/2     Completed   0          3m41s
cattle-system             helm-operation-zmm6f                0/2     Completed   0          3m28s
cattle-system             rancher-webhook-58b8d9f6c6-bxmns    1/1     Running     0          3m24s
fleet-system              fleet-agent-7c7d457b6d-x4kvf        1/1     Running     0          2m33s
fleet-system              fleet-controller-5ddfd96f5c-lxbnt   1/1     Running     0          3m10s
fleet-system              gitjob-7b4ddfcbf7-6hx52             1/1     Running     0          3m10s
kube-system               coredns-66c464876b-hfjqk            1/1     Running     0          4m1s
rancher-operator-system   rancher-operator-5cbfb5d6d7-kq29z   1/1     Running     0          3m32s

root@3fd636aa513e:/var/lib/rancher# k3s crictl images
IMAGE                                        TAG                 IMAGE ID            SIZE
docker.io/rancher/coredns-coredns            1.6.9               4e797b3234604       43.3MB
docker.io/rancher/pause                      3.1                 da86e6ba6ca19       746kB
harbor.kingsd.top/rancher/fleet-agent        v0.3.5              2a0c55d5db357       55.9MB
harbor.kingsd.top/rancher/fleet              v0.3.5              981b7123a405f       23.9MB
harbor.kingsd.top/rancher/gitjob             v0.1.15             dac9b6c58fe07       24.8MB
harbor.kingsd.top/rancher/rancher-operator   v0.1.4              c18d03bea7c6f       14.5MB
harbor.kingsd.top/rancher/rancher-webhook    v0.1.0              aec2ca2e747d7       12.6MB
harbor.kingsd.top/rancher/shell              v0.1.6              2e550736e6a49       46.8MB
```

可以看到，除了 Rancher Server 内置的 `rancher/coredns-coredns` 和 `rancher/pause` 镜像以外，其他的镜像都是从 `harbor.kingsd.top` 拉取。

#### 私有仓库为自签名证书（https），有认证

Rancher Server 连接自签名证书的私有仓库和 SSL 证书颁发机构的私有仓库配置的区别主要在于连接自签名证书的私有仓库时需要在 k3s 的`registries.yaml`中指定私有镜像仓库的自签名证书。

**1. 配置 K3s `registries.yaml`**

```
root@ip-172-31-14-159:~# cat /opt/registries.yaml
mirrors:
  # 私有仓库域名
  harbor.kingsd.top:
    endpoint:
      - "https://harbor.kingsd.top"
configs:
  "harbor.kingsd.top":
    auth:
      username: admin  # 这是私有镜像仓库的用户名
      password: Password  # 这是私有镜像仓库的密码
    tls:
      ca_file: /opt/certs/ca.crt # 镜像仓库中使用的ca文件的路径。
      cert_file: /opt/certs/harbor.kingsd.top.cert  # 镜像仓库中使用的cert文件的路径。
      key_file: /opt/certs/harbor.kingsd.top.key # 镜像仓库中使用的key文件的路径。
```

**2. 启动单节点 Rancher Server**

```
root@ip-172-31-14-159:~# docker run -itd --privileged \
>     --restart=unless-stopped \
>     -p 80:80 -p 443:443 \
>     -e CATTLE_SYSTEM_DEFAULT_REGISTRY=harbor.kingsd.top \   # 设置私有仓库域名
>     -v /opt/registries.yaml:/etc/rancher/k3s/registries.yaml \  # 将宿主机`registries.yaml`映射到容器内
>     -v /opt/certs:/opt/certs \  # 将证书映射到容器内
>     rancher/rancher:v2.5.8
```

**3. 验证**

等待 Rancher Server 启动成功后，我们可以 exec 到容器内确认所需要的组件是否启动：

```
root@381b5d2c26d9:/var/lib/rancher# kubectl get pods -A
NAMESPACE                 NAME                                READY   STATUS      RESTARTS   AGE
cattle-system             helm-operation-b5mvm                0/2     Completed   0          6m27s
cattle-system             helm-operation-cdlc8                0/2     Completed   0          5m57s
cattle-system             helm-operation-hcxmj                0/2     Completed   0          5m47s
cattle-system             helm-operation-vqz9z                0/2     Completed   0          6m4s
cattle-system             helm-operation-wqgz9                0/2     Completed   0          6m12s
cattle-system             rancher-webhook-58b8d9f6c6-z68ps    1/1     Running     0          6m18s
fleet-system              fleet-agent-7c7d457b6d-zznvd        1/1     Running     0          5m25s
fleet-system              fleet-controller-5ddfd96f5c-kcqmq   1/1     Running     0          5m53s
fleet-system              gitjob-7b4ddfcbf7-99l46             1/1     Running     0          5m53s
kube-system               coredns-66c464876b-mflfv            1/1     Running     0          6m49s
rancher-operator-system   rancher-operator-5cbfb5d6d7-prsqh   1/1     Running     0          6m9s

root@381b5d2c26d9:/var/lib/rancher# k3s crictl images
IMAGE                                        TAG                 IMAGE ID            SIZE
docker.io/rancher/coredns-coredns            1.6.9               4e797b3234604       43.3MB
docker.io/rancher/pause                      3.1                 da86e6ba6ca19       746kB
harbor.kingsd.top/rancher/fleet-agent        v0.3.5              2a0c55d5db357       55.9MB
harbor.kingsd.top/rancher/fleet              v0.3.5              981b7123a405f       23.9MB
harbor.kingsd.top/rancher/gitjob             v0.1.15             dac9b6c58fe07       24.8MB
harbor.kingsd.top/rancher/rancher-operator   v0.1.4              c18d03bea7c6f       14.5MB
harbor.kingsd.top/rancher/rancher-webhook    v0.1.0              aec2ca2e747d7       12.6MB
harbor.kingsd.top/rancher/shell              v0.1.6              2e550736e6a49       46.8MB
```

可以看到，除了 Rancher Server 内置的 `rancher/coredns-coredns` 和 `rancher/pause` 镜像以外，其他的镜像都是从 `harbor.kingsd.top` 拉取。

#### 私有仓库不使用 SSL（使用 http），有认证

针对 HTTP 的私有仓库，只需要将 `registries.yaml` 里的 mirrors.endpoint 配置修改为`http` 开头即可。

**1. 配置 K3s `registries.yaml`**

```

root@ip-172-31-14-159:~# cat cat /opt/registries.yaml
cat: cat: No such file or directory
mirrors:
  # 私有仓库IP
  3.96.56.137:
    endpoint:
      - "http://3.96.56.137"
configs:
  "3.96.56.137":
    auth:
      username: admin  # 这是私有镜像仓库的用户名
      password: Password  # 这是私有镜像仓库的密码
```

**2. 启动单节点 Rancher Server**

```
root@ip-172-31-14-159:~# docker run -itd --privileged \
>     --restart=unless-stopped \
>     -p 80:80 -p 443:443 \
>     -e CATTLE_SYSTEM_DEFAULT_REGISTRY=3.96.56.137 \  # 设置私有仓库IP
>     -v /opt/registries.yaml:/etc/rancher/k3s/registries.yaml \  # 将宿主机`registries.yaml`映射到容器内
>     rancher/rancher:v2.5.8
```

**3. 验证**

```
root@cb018bb70446:/var/lib/rancher# kubectl get pods -A
NAMESPACE                 NAME                                READY   STATUS      RESTARTS   AGE
cattle-system             helm-operation-44tb7                0/2     Completed   0          77s
cattle-system             helm-operation-cwpvz                0/2     Completed   0          66s
cattle-system             helm-operation-f898m                0/2     Completed   0          58s
cattle-system             helm-operation-fc4tj                0/2     Completed   0          51s
cattle-system             helm-operation-qq4kz                0/2     Completed   0          42s
cattle-system             rancher-webhook-c49756c7f-rjwdj     1/1     Running     0          63s
fleet-system              fleet-agent-55865c8959-rz8p2        1/1     Running     0          21s
fleet-system              fleet-controller-797ff98bfd-xj48k   1/1     Running     0          47s
fleet-system              gitjob-58bdfc4c69-mp84z             1/1     Running     0          47s
kube-system               coredns-66c464876b-dbm8v            1/1     Running     0          96s
rancher-operator-system   rancher-operator-578b4c64d4-4ptq9   1/1     Running     0          69s

root@cb018bb70446:/var/lib/rancher# k3s crictl images
IMAGE                                  TAG                 IMAGE ID            SIZE
3.96.56.137/rancher/fleet-agent        v0.3.5              2a0c55d5db357       55.9MB
3.96.56.137/rancher/fleet              v0.3.5              981b7123a405f       23.9MB
3.96.56.137/rancher/gitjob             v0.1.15             dac9b6c58fe07       24.8MB
3.96.56.137/rancher/rancher-operator   v0.1.4              c18d03bea7c6f       14.5MB
3.96.56.137/rancher/rancher-webhook    v0.1.0              aec2ca2e747d7       12.6MB
3.96.56.137/rancher/shell              v0.1.6              2e550736e6a49       46.8MB
docker.io/rancher/coredns-coredns      1.6.9               4e797b3234604       43.3MB
docker.io/rancher/pause                3.1                 da86e6ba6ca19       746kB
```

可以看到，除了 Rancher Server 内置的 `rancher/coredns-coredns` 和 `rancher/pause` 镜像以外，其他的镜像都是从 `3.96.56.137` 拉取。

## 后记

单节点 Rancher Server 连接私有仓库其实就是内置的 K3s 集群连接私有仓库，关于更多 k3s 私有镜像仓库配置可以参考 [k3s 官网](http://docs.rancher.cn/docs/k3s/installation/private-registry/_index/)
