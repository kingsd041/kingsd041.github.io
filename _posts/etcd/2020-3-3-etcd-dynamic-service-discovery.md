---
layout:     post
title:      基于已有集群动态发现方式部署 Etcd 集群
subtitle:   etcd
date:       2020-3-3 15:06:00 +0800
author:     Ksd
header-img: img/post-bg-unix-linux.jpg
catalog: true
tags:
    - Etcd
---

> 转载：[基于已有集群动态发现方式部署 Etcd 集群](https://www.hi-linux.com/posts/55447.html)

etcd提供了多种部署集群的方式，在「通过静态发现方式部署etcd集群」 一文中我们介绍了如何通过静态发现方式部署集群。

不过很多时候，你只知道你要搭建一个多大(包含多少节点)的集群，但是并不能事先知道这几个节点的ip，从而无法使用`--initial-cluster`参数。

这个时候，你就需要使用discovery的方式来搭建etcd集群。discovery方式有两种：`etcd discovery`和`DNS discovery`。

这里我们先介绍下`etcd discovery方式`。这种启动方式依赖另外一个ETCD集群，在该集群中创建一个目录，并在该目录中创建一个_config的子目录，并且在该子目录中增加一个size节点，指定集群的节点数目。在这种情况下，将该目录在ETCD中的URL作为节点的启动参数，即可完成集群启动。

`etcd discovery`集群方式分为两种：自定义的`etcd discovery`和`公共 etcd discovery`。


#### 公共etcd discovery服务

公共的discovery就是通过CoreOS提供的公共discovery服务申请token。

#### 获取集群标识

集群标识可以从已有的etcd集群中创建，这里通过CoreOS提供的公共discovery服务申请token

```
$ curl -w "\n" 'https://discovery.etcd.io/new?size=3'
https://discovery.etcd.io/c5b52d9d8fd7af9017bd7b54cf13e420

```

以上命令会生成一个链接样式的token，参数size代表要创建的集群大小。

#### 修改etcd配置

依次编辑三个节点的etcd配置文件，删除`ETCD_INITIAL_CLUSTER`、`ETCD_INITIAL_CLUSTER_STATE`、`ETCD_INITIAL_CLUSTER_TOKEN`配置参数并加上`ETCD_DISCOVERY`参数为获取的集群标识即可。

这里以etcd1节点为例(etcd2、etcd3同理)：

```
# 编辑etcd配置文件
$ vim /opt/etcd/config/etcd.conf

ETCD_NAME=etcd1
ETCD_DATA_DIR="/var/lib/etcd/etcd1"
ETCD_LISTEN_PEER_URLS="http://192.168.2.210:2380"
ETCD_LISTEN_CLIENT_URLS="http://192.168.2.210:2379,http://192.168.2.210:4001"
ETCD_INITIAL_ADVERTISE_PEER_URLS="http://192.168.2.210:2380"
ETCD_ADVERTISE_CLIENT_URLS="http://192.168.2.210:2379,http://192.168.2.210:4001"
ETCD_DISCOVERY="https://discovery.etcd.io/c5b52d9d8fd7af9017bd7b54cf13e420"
```

#### 测试etcd集群

按上面配置好各集群节点后，分别在各节点启动etcd。


```
$ systemctl start etcd

```

启动完成后，执行以下命令：

```
$ curl -w '\n' https://discovery.etcd.io/c5b52d9d8fd7af9017bd7b54cf13e420
{"action":"get","node":{"key":"/_etcd/registry/c5b52d9d8fd7af9017bd7b54cf13e420","dir":true,"nodes":[{"key":"/_etcd/registry/c5b52d9d8fd7af9017bd7b54cf13e420/a44795c1770e34ec","value":"etcd1=http://192.168.2.210:2380","modifiedIndex":1301600912,"createdIndex":1301600912},{"key":"/_etcd/registry/c5b52d9d8fd7af9017bd7b54cf13e420/a085e7281cb15be2","value":"etcd2=http://192.168.2.211:2380","modifiedIndex":1301601030,"createdIndex":1301601030},{"key":"/_etcd/registry/c5b52d9d8fd7af9017bd7b54cf13e420/173070ace158b9d1","value":"etcd3=http://192.168.2.212:2380","modifiedIndex":1301601101,"createdIndex":1301601101}],"modifiedIndex":1301571633,"createdIndex":1301571633}}
```

从输出结果看，说明集群已在discovery.etcd.io注册成功。


查看集群成员

```
$ etcdctl --endpoints "http://192.168.2.210:2379" member list
173070ace158b9d1: name=etcd3 peerURLs=http://192.168.2.212:2380 clientURLs=http://192.168.2.212:2379,http://192.168.2.212:4001 isLeader=false
a085e7281cb15be2: name=etcd2 peerURLs=http://192.168.2.211:2380 clientURLs=http://192.168.2.211:2379,http://192.168.2.211:4001 isLeader=false
a44795c1770e34ec: name=etcd1 peerURLs=http://192.168.2.210:2380 clientURLs=http://192.168.2.210:2379,http://192.168.2.210:4001 isLeader=true
```

更多集群使用方法可参考「通过静态发现方式部署etcd集群」一文。

## 自定义的etcd discovery服务

这种方式就是利用一个已有的etcd集群来提供discovery服务，从而搭建一个新的etcd集群。


假设已有的etcd集群的一个访问地址是：192.168.2.210，那么我们首先需要在已有etcd中创建一个特殊的key，方法如下：

```
$ curl http://192.168.2.210:2379/v2/keys/discovery/8ebee6723eaf3f5c7724e879f8797e85/_config/size -d value=3

{"action":"create","node":{"key":"/discovery/8ebee6723eaf3f5c7724e879f8797e85/_config/size/00000000000000000011","value":"3","modifiedIndex":11,"createdIndex":11}}

```

其中`value=3`表示本集群的大小，即: 有多少集群节点。而 8ebee6723eaf3f5c7724e879f8797e85就是用来做discovery的token。

值得注意的是：如果实际启动的etcd节点个数大于discovery token创建时指定的size，多余的节点会自动变为proxy节点。

> etcd proxy模式简介：
> 作为反向代理把客户的请求转发给可用的etcd集群，新节点加入集群如果核心节点数已满足要求，
> 则自动转化为proxy模式，此项不会在节点不足时逆向转化为实际节点。



接下来的配置就和公共`etcd discovery`服务中的方法类似，就不再重复阐述了。