---
layout: post
title: RKE2 私有镜像仓库配置验证
subtitle:
date: 2022-4-18 21:07:00 +0800
author: Ksd
header-img: img/post-bg-debug.jpg
catalog: true
tags:
  - RKE2
  - Registry
---

## 前言

Rancher 中文论坛中有社区用户提问: 使用 `system-default-registry: "192.168.101.30"` 指定 http 的私有镜像仓库，启动 RKE2 时，还是会使用 https 拉取镜像。

> 话题连接：https://forums.rancher.cn/t/rke2/398

随后进行一系列验证，避免日后遗忘，所以整理出文档。

## 环境准备

#### 配置 Harbor，禁用 https，使用 http

> 参考：https://goharbor.io/docs/1.10/install-config

注释掉 https 的配置，设置 hostname，其他参数默认值即可

```
root@ip-172-31-8-132:~# cat harbor.yml
#  # https port for harbor, default is 443
#  port: 443
#  # The path of cert and key files for nginx
#  certificate: /your/certificate/path
#  private_key: /your/private/key/path

hostname: harbor2.kingsd.top
```

#### 上传镜像

可以根据安装的 rke2 版本到 [rke2 release](https://github.com/rancher/rke2/releases) 中查找对应的 tall 包的 txt 文件，然后下载到本地。

至于上传到到 harbor 有个简便方法，就是下载 [rancher release ](https://github.com/rancher/rancher/releases) 中的 rancher-load-images.sh 和 rancher-save-images.sh 进行上传。

## 验证 `system-default-registry` 指定 http 的镜像仓库

准备配置文件：

```
root@ip-172-31-8-132:~# mkdir -p /etc/rancher/rke2
```

```
root@ip-172-31-8-132:~# vi /etc/rancher/rke2/config.yaml
system-default-registry: "harbor2.kingsd.top"
```

```
root@ip-172-31-8-132:~# vi /etc/rancher/rke2/registries.yaml
mirrors:
  "harbor2.kingsd.top":
    endpoint:
      - "http://harbor2.kingsd.top"
```

上面配置文件，通过 `system-default-registry` 设置 RKE2 的默认系统镜像仓库地址为: harbor2.kingsd.top。然后在通过 registries.yaml 设置使用 `http` 类型的镜像仓库。

#### 安装 rke2

```
root@ip-172-31-8-132:~# curl -sfL https://get.rke2.io | sh -

[INFO]  finding release for channel stable
[INFO]  using v1.22.8+rke2r1 as release
[INFO]  downloading checksums at https://github.com/rancher/rke2/releases/download/v1.22.8+rke2r1/sha256sum-amd64.txt
[INFO]  downloading tarball at https://github.com/rancher/rke2/releases/download/v1.22.8+rke2r1/rke2.linux-amd64.tar.gz
[INFO]  verifying tarball
[INFO]  unpacking tarball file to /usr/local
root@ip-172-31-8-132:~#
root@ip-172-31-8-132:~# systemctl enable rke2-server.service
Created symlink /etc/systemd/system/multi-user.target.wants/rke2-server.service → /usr/local/lib/systemd/system/rke2-server.service.
root@ip-172-31-8-132:~#
root@ip-172-31-8-132:~# systemctl start rke2-server.service
Job for rke2-server.service failed because the control process exited with error code.
See "systemctl status rke2-server.service" and "journalctl -xe" for details.
```

可以看到已经报错，继续查看日志：

```
root@ip-172-31-8-132:~# journalctl -f -u rke2-server
-- Logs begin at Tue 2022-04-19 01:51:19 UTC. --
Apr 19 05:31:13 ip-172-31-8-132 rke2[20972]: time="2022-04-19T05:31:13Z" level=info msg="Checking local image archives in /var/lib/rancher/rke2/agent/images for harbor2.kingsd.top/rancher/rke2-runtime:v1.22.8-rke2r1"
Apr 19 05:31:13 ip-172-31-8-132 rke2[20972]: time="2022-04-19T05:31:13Z" level=warning msg="Failed to load runtime image harbor2.kingsd.top/rancher/rke2-runtime:v1.22.8-rke2r1 from tarball: no local image available for harbor2.kingsd.top/rancher/rke2-runtime:v1.22.8-rke2r1: not found in any file in /var/lib/rancher/rke2/agent/images: image not found"
Apr 19 05:31:13 ip-172-31-8-132 rke2[20972]: time="2022-04-19T05:31:13Z" level=info msg="Using private registry config file at /etc/rancher/rke2/registries.yaml"
Apr 19 05:31:13 ip-172-31-8-132 rke2[20972]: time="2022-04-19T05:31:13Z" level=info msg="Pulling runtime image harbor2.kingsd.top/rancher/rke2-runtime:v1.22.8-rke2r1"
Apr 19 05:31:13 ip-172-31-8-132 rke2[20972]: time="2022-04-19T05:31:13Z" level=warning msg="Failed to get image from endpoint: Get \"https://harbor2.kingsd.top/service/token?scope=repository%3Arancher%2Frke2-runtime%3Apull&service=harbor-registry\": dial tcp 3.98.138.181:443: connect: connection refused"
Apr 19 05:31:13 ip-172-31-8-132 rke2[20972]: time="2022-04-19T05:31:13Z" level=warning msg="Failed to get image from endpoint: Get \"https://harbor2.kingsd.top/v2/\": dial tcp 3.98.138.181:443: connect: connection refused"
Apr 19 05:31:13 ip-172-31-8-132 rke2[20972]: time="2022-04-19T05:31:13Z" level=fatal msg="failed to get runtime image harbor2.kingsd.top/rancher/rke2-runtime:v1.22.8-rke2r1: all endpoints failed: Get \"https://harbor2.kingsd.top/service/token?scope=repository%3Arancher%2Frke2-runtime%3Apull&service=harbor-registry\": dial tcp 3.98.138.181:443: connect: connection refused; Get \"https://harbor2.kingsd.top/v2/\": dial tcp 3.98.138.181:443: connect: connection refused"
Apr 19 05:31:13 ip-172-31-8-132 systemd[1]: rke2-server.service: Main process exited, code=exited, status=1/FAILURE
Apr 19 05:31:13 ip-172-31-8-132 systemd[1]: rke2-server.service: Failed with result 'exit-code'.
Apr 19 05:31:13 ip-172-31-8-132 systemd[1]: Failed to start Rancher Kubernetes Engine v2 (server).
```

从日志可以看出，虽然刚才已经在 registries.yaml 中设置了使用 http 类型的 镜像仓库，但是连接的依然是 https：https://harbor2.kingsd.top/v2

**初步判断，有可能 system-default-registry 参数不支持 http，只能使用 https 的私有仓库**，为了验证这个问题，把 `/etc/rancher/rke2/config.yaml` 中的 `system-default-registry` 参数移除，让 rke2 通过默认的 docker.io 去下载镜像。

```
root@ip-172-31-8-132:~# rm /etc/rancher/rke2/config.yaml

root@ip-172-31-8-132:~# systemctl restart rke2-server.service
```

稍等片刻，RKE2 集群已经成功启动，接下来再来验证 RKE2 集群能否从 http 的镜像仓库去拉取镜像：

```
root@ip-172-31-8-132:~# cat nginx.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
  labels:
    app: nginx
spec:
  replicas: 1
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: harbor2.kingsd.top/rancher/nginx
        ports:
```

```
root@ip-172-31-8-132:~# /var/lib/rancher/rke2/bin/kubectl create -f nginx.yaml
deployment.apps/nginx-deployment created
```

```
root@ip-172-31-8-132:~# /var/lib/rancher/rke2/bin/kubectl get pods
NAME                                READY   STATUS    RESTARTS   AGE
nginx-deployment-54cbd467d4-57nm2   1/1     Running   0          18s
```

```
root@ip-172-31-8-132:~# root@ip-172-31-8-132:~# /var/lib/rancher/rke2/bin/kubectl describe pods nginx-deployment-54cbd467d4-57nm2

Events:
  Type    Reason     Age   From               Message
  ----    ------     ----  ----               -------
  Normal  Scheduled  46s   default-scheduler  Successfully assigned default/nginx-deployment-54cbd467d4-57nm2 to ip-172-31-8-132
  Normal  Pulling    45s   kubelet            Pulling image "harbor2.kingsd.top/rancher/nginx"
  Normal  Pulled     42s   kubelet            Successfully pulled image "harbor2.kingsd.top/rancher/nginx" in 3.73656947s
  Normal  Created    42s   kubelet            Created container nginx
  Normal  Started    41s   kubelet            Started container nginx
```

**从测试结果可以看出，可能 RKE2 不支持通过 system-default-registry 指定 http 的私有仓库，但业务集群是可以使用 http 的私有仓库的。**

## 验证 `system-default-registry` 指定 https（自签名） 的镜像仓库

在内网离线环境，如果 `system-default-registry` 不支持 http，我们可以使用自签名 https 的私有仓库。

#### Harbor 配置

参考 https://goharbor.io/docs/1.10/install-config/ 配置 harbor 自签名证书和安装 harbor

#### 安装 RKE2

准备配置文件：

```
mkdir -p /etc/rancher/rke2
```

```
root@ip-172-31-8-132:~# vi /etc/rancher/rke2/config.yaml
system-default-registry: "harbor2.kingsd.top"
```

```
root@ip-172-31-8-132:~# vi /etc/rancher/rke2/registries.yaml
mirrors:
  "harbor2.kingsd.top":
    endpoint:
      - "https://harbor2.kingsd.top"
configs:
  harbor2.kingsd.top:
    tls:
      insecure_skip_verify: true
```

上面配置文件，通过 `system-default-registry` 设置 RKE2 的默认系统镜像仓库地址为: harbor2.kingsd.top。然后在通过 registries.yaml 设置使用 `https` 类型的自签名镜像仓库，并且通过 `insecure_skip_verify: true` 跳过证书验证。

#### 安装 rke2

```
root@ip-172-31-8-132:~# curl -sfL https://get.rke2.io | sh -
[INFO]  finding release for channel stable
[INFO]  using v1.22.8+rke2r1 as release
[INFO]  downloading checksums at https://github.com/rancher/rke2/releases/download/v1.22.8+rke2r1/sha256sum-amd64.txt
[INFO]  downloading tarball at https://github.com/rancher/rke2/releases/download/v1.22.8+rke2r1/rke2.linux-amd64.tar.gz
[INFO]  verifying tarball
[INFO]  unpacking tarball file to /usr/local
```

```
root@ip-172-31-8-132:~# systemctl enable rke2-server.service
Created symlink /etc/systemd/system/multi-user.target.wants/rke2-server.service → /usr/local/lib/systemd/system/rke2-server.service.
```

```
root@ip-172-31-8-132:~#  systemctl restart rke2-server.service
```

#### 确认 RKE2 系统镜像从 harbor2.kingsd.top 获取

```
root@ip-172-31-8-132:~# /var/lib/rancher/rke2/bin/kubectl get pods --all-namespaces -o jsonpath='{range .items[*]}{"\n"}{.metadata.name}{":\t"}{range .spec.containers[*]}{.image}{", "}{end}{end}' |sort

cloud-controller-manager-ip-172-31-8-132:	harbor2.kingsd.top/rancher/rke2-cloud-provider:v0.0.3-build20211118,
etcd-ip-172-31-8-132:	harbor2.kingsd.top/rancher/hardened-etcd:v3.5.1-k3s1-build20220112,
helm-install-rke2-canal--1-xz59r:	harbor2.kingsd.top/rancher/klipper-helm:v0.7.0-build20220315,
helm-install-rke2-coredns--1-tgpmr:	harbor2.kingsd.top/rancher/klipper-helm:v0.7.0-build20220315,
helm-install-rke2-ingress-nginx--1-fqxwk:	harbor2.kingsd.top/rancher/klipper-helm:v0.7.0-build20220315,
helm-install-rke2-metrics-server--1-hh9gp:	harbor2.kingsd.top/rancher/klipper-helm:v0.7.0-build20220315,
kube-apiserver-ip-172-31-8-132:	harbor2.kingsd.top/rancher/hardened-kubernetes:v1.22.8-rke2r1-build20220316,
kube-controller-manager-ip-172-31-8-132:	harbor2.kingsd.top/rancher/hardened-kubernetes:v1.22.8-rke2r1-build20220316,
kube-proxy-ip-172-31-8-132:	harbor2.kingsd.top/rancher/hardened-kubernetes:v1.22.8-rke2r1-build20220316,
kube-scheduler-ip-172-31-8-132:	harbor2.kingsd.top/rancher/hardened-kubernetes:v1.22.8-rke2r1-build20220316,
rke2-canal-tv4d2:	harbor2.kingsd.top/rancher/hardened-calico:v3.21.4-build20220228, harbor2.kingsd.top/rancher/hardened-flannel:v0.17.0-build20220317,
rke2-coredns-rke2-coredns-8f8fcd966-c9lqx:	harbor2.kingsd.top/rancher/hardened-coredns:v1.9.1-build20220318,
rke2-coredns-rke2-coredns-autoscaler-765f78cf97-9x6pb:	harbor2.kingsd.top/rancher/hardened-cluster-autoscaler:v1.8.5-build20211119,
rke2-ingress-nginx-controller-4k8b6:	harbor2.kingsd.top/rancher/nginx-ingress-controller:nginx-1.0.2-hardened4,
rke2-metrics-server-778cf67475-gkrsx:	harbor2.kingsd.top/rancher/hardened-k8s-metrics-server:v0.5.0-build20211119,
```

## 后记

从测试结果来看，RKE2 不支持通过 system-default-registry 指定 http 的私有仓库，但业务集群是可以使用 http 的私有仓库的。

如果你在私有环境有需要连接私有镜像仓库，可以将镜像仓库设置为 https。
