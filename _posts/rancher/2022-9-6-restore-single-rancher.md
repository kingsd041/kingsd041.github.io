---
layout: post
title: 恢复单节点安装的 rancher server
subtitle:
date: 2022-9-6 21:07:00 +0800
author: Ksd
header-img: img/post-bg-desk.jpg
catalog: true
tags:
  - Rancher
---

Rancher 安装分为单节点和高可用安装。生产环境建议使用高可用安装，而单节点也就是通过 `docker run` 启动的 Rancher 目的是为了测试或者了解 Rancher

而社区中确实有很多用户还是选择 `docker run` 的方式来安装 Rancher，这种安装方式虽然方便，但如果被误删，而且没有备份的情况下，很多用户就无从下手了。

本文介绍通过 `docker run` 启动的 Rancher 在被误删的情况下如何恢复。

## 目录说明

Rancher Server 的默认数据目录为 `/var/lib/rancher`，而且在 Dockerfile 中也通过了匿名卷的形式映射出来了这个目录：`VOLUME /var/lib/rancher`，所以要恢复 Rancher Server 的数据，只需要恢复这个目录即可。

## 恢复 Rancher

#### 数据目录映射到本地的情况下恢复 Rancher

单节点安装 Rancher 可以将数据目录映射的本地，对于这种情况，只需要重新将映射在本地的目录重新挂到容器中即可：

```
docker run -d --restart=unless-stopped \
  -p 80:80 -p 443:443 \
  --privileged \
  -v /opt/rancher:/var/lib/rancher \
  rancher/rancher
```

注意：
`/opt/rancher` 为安装时映射在本地的目录。 而且 `rancher/rancher` 一定要使用和安装时相同的 Rancher 版本。

#### 数据目录没映射到本地的情况下恢复 Rancher

比如你安装 Rancher 时，没有将 Rancher 数据目录映射到本地，这时你将 Rancher Server 容器误删，这种情况也是能够把数据找回来的。

因为 Rancher Server 的 Dockerfile 中也通过了匿名卷的形式映射出来了数据目录：`VOLUME /var/lib/rancher`，所以可以在 `/var/lib/docker/volumes/{VOLUME_ID}` 中找到对应的 Rancher 数据。

如果你已经误删了 Rancher，那你也可能没办法找到对应的 Volume ID，这里有个取巧的方法，就是在 `/var/lib/docker/volumes` 中搜索 k3s.log 文件，这样就能快速定位到对应的数据目录，如果你之前创建了多个 Rancher Server，你可能会查找到多个目录中包含 k3s.log 文件，那你可以根据时间排序，最新的时间就是你要恢复的 Rancher 数据目录.

```
root@v26-1:~# ls -lt `find /var/lib/docker/volumes -name k3s.log`
-rw-r--r-- 1 root root 19825858 Sep  7 09:47 /var/lib/docker/volumes/e7f66370ff25c14faf7407388abdcd63d56e17903f40aa1a04f22d4311f79335/_data/k3s.log
-rw-r--r-- 1 root root    36672 Aug 23 15:12 /var/lib/docker/volumes/27d16a9f04c9147c6e6bd32684e13581d80c3e4835990b8a296bc11180989efd/_data/k3s.log
-rw-r--r-- 1 root root 50622617 Jul 13 16:18 /var/lib/docker/volumes/e4dcc7f8091420cdb5acb600e3e9a1880d50205f1b8cb7105406788e48bba647/_data/k3s.log
-rw-r--r-- 1 root root   637779 May 13 09:34 /var/lib/docker/volumes/3b7c9eca9b3087f551477def17f08182e7b44e501dde2a9fadaab9ee7b471384/_data/k3s.log
-rw-r--r-- 1 root root  8201826 May 13 09:19 /var/lib/docker/volumes/02d15c68dd833bb777554c3b9ef0f086a5ff7df3446f86ac68b2e27fd81ab4be/_data/k3s.log
-rw-r--r-- 1 root root   947472 May  7 20:16 /var/lib/docker/volumes/6b6e980cef41e26bee0bd43e51a7f692599833a51fb36b1de78307afa06c4be1/_data/k3s.log
-rw-r--r-- 1 root root  1581317 May  7 20:05 /var/lib/docker/volumes/15a8d8b2d22edf8f03225233e639cdbfdb992e12e56c53c5230c27e2132aeb2c/_data/k3s.log
```

接下来, 把 Rancher 数据目录 copy 到其他目录即可，比如到 /opt 下：

```
cp -rf /var/lib/docker/volumes/e7f66370ff25c14faf7407388abdcd63d56e17903f40aa1a04f22d4311f79335/_data  /opt/rancher-data
```

然后重新运行相同版本的 Rnahcer，并把数据目录挂载到 Rancher 容器中：

```
docker run -d \
    -v /opt/rancher-data:/var/lib/rancher \
    --restart=unless-stopped \
    -p 80:80 -p 443:443 \
    --privileged \
    rancher/rancher:v2.6.7
```
