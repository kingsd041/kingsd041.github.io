---
layout:     post
title:      利用阿里云SLB、RDS实现K3S HA
subtitle:   利用阿里云SLB、RDS实现K3S HA
date:       2020-8-3 21:06:00 +0800
author:     Ksd
header-img: img/post-bg-rancher-k3s.png
catalog: true
tags:
    - rancher
    - K3S
    - Kubernetes
    - SLB
    - RDS
    - HA
---
> 参考：
> [K3S官网](https://rancher.com/docs/k3s/latest/en/)


# 利用阿里云SLB、RDS实现K3S HA

## 前言

在面向生产环境的实践中，高可用是我们无法避免的问题，K3s本身也历经多个版本的迭代，HA方案也进行了不断优化，形成了目前的比较稳定的HA方案。

目前官方提供两种HA方案：

1. 嵌入式DB的高可用（实验）
2. 使用外部数据库实现高可用

`嵌入式DB的高可用`目前还是实验性的，本文不过多介绍，请参考：https://rancher.com/docs/k3s/latest/en/installation/ha-embedded/

`使用外部数据库实现高可用`需要搭建一个高可用的外置数据库，目前，K3s支持SQLite/etcd/MySQL/PostgreSQL/DQLite等datastore，不同的datastore面向不同的使用场景。

目前国内使用最多的公有云环境应该就是阿里云了，我们可以在阿里云上利用虚拟机搭建K3s HA，然后对接到阿里云的RDS，这样可以免去单独维护一套数据库的麻烦。本文选择大家熟知的MySQL来做HA的实践，PostgreSQL与MySQL类似，我们就不再重复。

## 架构图

![](https://tva1.sinaimg.cn/large/007S8ZIlly1gho3x4okwqj31420n0js9.jpg)

如上图，终端用户访问SLB，SLB将流量分别转发到后端的两台K3s master HA。两台 K3s master 节点连接同一个RDS 创建的外置数据库。

## 创建阿里云实例

K3s 需要至少两台实例去组成HA，所以在阿里云上创建至少两台实例用作演示：

实例名称 | 内网IP | 角色
-- | -- | -- |--
k3s-master-1 | 172.17.207.15  | master
k3s-master-2 | 172.17.207.16  | master


## 配置阿里云RDS

1. 创建RDS实例，实例类型要选择`MySQL 5.7`，该版本是K3s官方支持的版本，其他参数根据自身需求设置即可。

![](https://tva1.sinaimg.cn/large/007S8ZIlly1gh85ialz0bj31l10u0aca.jpg)

2. 设置白名单，白名单的内容设置为你的K3s 实例的内网IP即可。设置成功后，我们将得到一个内网地址用作数据库连接：`rm-2ze64ke7q33bkq3yt.mysql.rds.aliyuncs.com`


![](https://tva1.sinaimg.cn/large/007S8ZIlly1ghnytsk3yzj319r0u0jsj.jpg)

![](https://tva1.sinaimg.cn/large/007S8ZIlly1ghnzsuylwqj31sc0u040b.jpg)

3. 创建账号，使用`普通账号（ksd）`即可.

4. 创建数据库，设置数据库名称（k3s），授权账号（ksd）
> 之前在使用docker启动的mysql时，不需要提前创建数据库，因为启动k3s的时候会自动创建。但在阿里云RDS上，必须先在UI上创建K3s所需的数据库。

![](https://tva1.sinaimg.cn/large/007S8ZIlly1ghnz7k2roij31aq0u00ui.jpg)

5. 修改数据库参数

我们需要把数据参数`innodb_large_prefix`设置为`ON`，否则启动K3s的时候会报错：
```
Jul 29 20:08:06 iZ2zed0v8rqape974mz8suZ systemd[1]: k3s.service: Service hold-off time over, scheduling restart.
Jul 29 20:08:06 iZ2zed0v8rqape974mz8suZ systemd[1]: k3s.service: Scheduled restart job, restart counter is at 11.
Jul 29 20:08:06 iZ2zed0v8rqape974mz8suZ systemd[1]: Stopped Lightweight Kubernetes.
Jul 29 20:08:06 iZ2zed0v8rqape974mz8suZ systemd[1]: Starting Lightweight Kubernetes...
Jul 29 20:08:07 iZ2zed0v8rqape974mz8suZ k3s[24934]: time="2020-07-29T20:08:07.145963348+08:00" level=info msg="Starting k3s v1.18.6+k3s1 (6f56fa1d)"
Jul 29 20:08:07 iZ2zed0v8rqape974mz8suZ k3s[24934]: time="2020-07-29T20:08:07.159363656+08:00" level=fatal msg="starting kubernetes: preparing server: creating storage endpoint: building kine: Error 1071: Specified key was too long; max key length is 767 bytes"
Jul 29 20:08:07 iZ2zed0v8rqape974mz8suZ systemd[1]: k3s.service: Main process exited, code=exited, status=1/FAILURE
Jul 29 20:08:07 iZ2zed0v8rqape974mz8suZ systemd[1]: k3s.service: Failed with result 'exit-code'.
Jul 29 20:08:07 iZ2zed0v8rqape974mz8suZ systemd[1]: Failed to start Lightweight Kubernetes.
```

将`innodb_large_prefix`修改为`ON`之后，点击右上角`提交参数` 即可完成修改。

![](https://tva1.sinaimg.cn/large/007S8ZIlly1gh85gqpxksj32j30u0aby.jpg)


以上步骤操作成功后，K3s要求的外置数据库就已经准备完成，下面我们来启动K3s HA。

## 实现 K3s HA

在`k3s-master-1`和`k3s-master-2`上执行相同的命令：
```
curl -sfL https://docs.rancher.cn/k3s/k3s-install.sh |  \
	INSTALL_K3S_MIRROR=cn \
	K3S_DATASTORE_ENDPOINT='mysql://ksd:your_password@tcp(rm-2ze64ke7q33bkq3yt.mysql.rds.aliyuncs.com:3306)/k3s' \
	sh -s - server
```

稍等片刻，一个K3s HA的环境就已经启动完成了：

> 如果在阿里云上pull K3s的镜像比较慢的话，可以配置mirror或者 从 http://mirror.cnrancher.com 下载对应版本的离线包，然后参考下面链接导入镜像：
https://rancher.com/docs/k3s/latest/en/installation/airgap/#prepare-the-images-directory-and-k3s-binary 

```
root@k3s-master-2:~# kubectl get pods -A -o wide
NAMESPACE     NAME                                     READY   STATUS      RESTARTS   AGE   IP          NODE           NOMINATED NODE   READINESS GATES
kube-system   local-path-provisioner-6d59f47c7-tshfx   1/1     Running     0          16m   10.42.0.5   k3s-master-1   <none>           <none>
kube-system   metrics-server-7566d596c8-mrc94          1/1     Running     0          16m   10.42.0.2   k3s-master-1   <none>           <none>
kube-system   coredns-8655855d6-sxn7v                  1/1     Running     0          16m   10.42.0.4   k3s-master-1   <none>           <none>
kube-system   helm-install-traefik-cmmsr               0/1     Completed   2          16m   10.42.0.3   k3s-master-1   <none>           <none>
kube-system   svclb-traefik-z6vlb                      2/2     Running     0          11m   10.42.0.6   k3s-master-1   <none>           <none>
kube-system   svclb-traefik-f89x6                      2/2     Running     0          11m   10.42.1.2   k3s-master-2   <none>           <none>
kube-system   traefik-758cd5fc85-chnbc                 1/1     Running     0          11m   10.42.1.3   k3s-master-2   <none>           <none>
root@k3s-master-2:~#
root@k3s-master-2:~# kubectl get node -o wide
NAME           STATUS   ROLES    AGE   VERSION        INTERNAL-IP     EXTERNAL-IP   OS-IMAGE             KERNEL-VERSION       CONTAINER-RUNTIME
k3s-master-1   Ready    master   16m   v1.18.6+k3s1   172.17.207.15   <none>        Ubuntu 18.04.4 LTS   4.15.0-106-generic   containerd://1.3.3-k3s2
k3s-master-2   Ready    master   16m   v1.18.6+k3s1   172.17.207.16   <none>        Ubuntu 18.04.4 LTS   4.15.0-106-generic   containerd://1.3.3-k3s2
```

## 通过阿里云SLB提供统一访问入口

现在我们已经拥有了高可用的MySQL和K3s，但现在还缺一个为多个K3s server提供一个统一的访问入口，这可以使用以下方式实现：

1. L4层负载均衡器
2. Round-robin DNS
3. VIP或者弹性IP

所以，我们可以直接使用阿里云的SLB做L4层负载均衡，将`6443`端口转发到后端的两台K3s master。

![](https://tva1.sinaimg.cn/large/007S8ZIlly1gho1izw2i3j31se09ygm9.jpg)


接下来，我们可以把k3s master节点的`/etc/rancher/k3s/k3s.yaml` 复制到本地的`~/.kube/config` 目录，然后将server地址修改为`server: https://39.106.185.201:6443`（SLB的公网IP）

然后可以通过 `kubectl get nodes` 测试下是否可以通过SLB将流量转发到K3s master：

```
ksd@Hailong-MacBook-Pro  ~  kubectl get nodes
Unable to connect to the server: x509: certificate is valid for 10.43.0.1, 127.0.0.1, 172.17.207.15, 172.17.207.16, not 39.106.185.201
```

这个错误是因为K3s mster启动时自动创建的证书不信任`39.106.185.201`这个SLB的公网IP，为了解决这个问题，可以更新K3s master，添加参数`--tls-san 39.106.185.201`：

```
curl -sfL https://docs.rancher.cn/k3s/k3s-install.sh |  \
	INSTALL_K3S_MIRROR=cn \
	K3S_DATASTORE_ENDPOINT='mysql://ksd:your_password@tcp(rm-2ze64ke7q33bkq3yt.mysql.rds.aliyuncs.com:3306)/k3s' \
	sh -s - server \
	--tls-san 39.106.185.201
```

最后，再回到本地机器上，再次执行`kubectl get nodes`，不出意外的话，就应该可以获取到节点信息了
```
ksd@Hailong-MacBook-Pro  ~  kubectl get nodes
NAME           STATUS   ROLES    AGE   VERSION
k3s-master-2   Ready    master   65m   v1.18.6+k3s1
k3s-master-1   Ready    master   65m   v1.18.6+k3s1
```

## 后记

本文只介绍了如何借助阿里云的SLB，RDS来实现K3s的HA，其他公有云的操作基本大同小异，虽然没做过详细的测试，但理论上应该都是支持的。如果是非公有云环境，可以根据自身的需求选择适合的datastore以及对应的HA方式。