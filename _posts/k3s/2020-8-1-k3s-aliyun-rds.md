---
layout:     post
title:      K3s对接阿里云RDS（MySQL 5.7）
subtitle:   K3s对接阿里云RDS（MySQL 5.7）
date:       2020-8-1 21:06:00 +0800
author:     Ksd
header-img: img/post-bg-rancher-k8s.png
catalog: true
tags:
    - rancher
    - K3S
    - Kubernetes
---
> 参考：
> [K3S官网](https://rancher.com/docs/k3s/latest/en/)
> [K3S中文官网](https://docs.rancher.cn/k3s/)



# K3s对接阿里云RDS（MySQL 5.7）

本以为k3s对接阿里云的 mysql 5.7和docker run的 mysql应该是一样的，但实际操作时候发现有点小坑，就是阿里云RDS默认的`innodb_large_prefix=OFF`，这会导致k3s在启动的时候会报错，然后对于第一次使用阿里云RDS小白用户（我）来说，修改`innodb_large_prefix`的配置的时候也懵逼了下。

## 配置阿里云RDS
1. 创建RDS实例，实例类型选择`MySQL 5.7`，因为K3S官方支持这个版本，其他选项根据实际情况设置
![](https://tva1.sinaimg.cn/large/007S8ZIlly1gh85ialz0bj31l10u0aca.jpg)

2. 设置白名单，白名单的内容设置为你的K3s 实例的IP即可
> 如果不设置白名单，貌似不会自动生成rds的内网域名

![](https://tva1.sinaimg.cn/large/007S8ZIlly1gh85j6bho7j31f50u0zl8.jpg)

3. 创建账号，我是创建了一个`普通账号（ksd）`和一个`高权限账号`账号，但实际使用的时候只使用`普通账号（ksd）`即可

4. 创建数据库，设置数据库名称（k3s），授权账号（ksd）
> 之前在使用docker启动的mysql时，不需要提前创建数据库，因为启动k3s的时候会自动创建，但在阿里云RDS上户型，必须得先在UI上创建数据库。
![](https://tva1.sinaimg.cn/large/007S8ZIlly1gh85lrathkj319p0u0q4l.jpg)

## 启动K3S

```
curl -sfL https://docs.rancher.cn/k3s/k3s-install.sh | INSTALL_K3S_SKIP_DOWNLOAD=true \
	INSTALL_K3S_MIRROR=cn \
	K3S_DATASTORE_ENDPOINT='mysql://hailong:WWW163com@tcp(rm-2ze8a65b8mi15gj92.mysql.rds.aliyuncs.com:3306)/k3s' \
	sh -s - server
```

具体的配置参考官网吧，https://rancher.com/docs/k3s/latest/en/

## 故障排查

### 问题描述

本以为可以顺利的启动k3s，但事与愿违，k3s 报错了：

```
# tail -200f /var/log/syslog
...
Jul 29 20:08:06 iZ2zed0v8rqape974mz8suZ systemd[1]: k3s.service: Service hold-off time over, scheduling restart.
Jul 29 20:08:06 iZ2zed0v8rqape974mz8suZ systemd[1]: k3s.service: Scheduled restart job, restart counter is at 11.
Jul 29 20:08:06 iZ2zed0v8rqape974mz8suZ systemd[1]: Stopped Lightweight Kubernetes.
Jul 29 20:08:06 iZ2zed0v8rqape974mz8suZ systemd[1]: Starting Lightweight Kubernetes...
Jul 29 20:08:07 iZ2zed0v8rqape974mz8suZ k3s[24934]: time="2020-07-29T20:08:07.145963348+08:00" level=info msg="Starting k3s v1.18.6+k3s1 (6f56fa1d)"
Jul 29 20:08:07 iZ2zed0v8rqape974mz8suZ k3s[24934]: time="2020-07-29T20:08:07.159363656+08:00" level=fatal msg="starting kubernetes: preparing server: creating storage endpoint: building kine: Error 1071: Specified key was too long; max key length is 767 bytes"
Jul 29 20:08:07 iZ2zed0v8rqape974mz8suZ systemd[1]: k3s.service: Main process exited, code=exited, status=1/FAILURE
Jul 29 20:08:07 iZ2zed0v8rqape974mz8suZ systemd[1]: k3s.service: Failed with result 'exit-code'.
Jul 29 20:08:07 iZ2zed0v8rqape974mz8suZ systemd[1]: Failed to start Lightweight Kubernetes.

...
```

这个是因为在阿里云的mysql 5.7的`innodb_large_prefix`默认为`OFF`照成

### 解决
为了解决这个问题，可以在阿里云RDS->参数设置里，将`innodb_large_prefix`修改为`ON`，然后点击右上角的 `提交参数`，然后`确定`，否则修改不生效…… （第一次用，吃了这个亏，老土了）

![](https://tva1.sinaimg.cn/large/007S8ZIlly1gh85gqpxksj32j30u0aby.jpg)

![](https://tva1.sinaimg.cn/large/007S8ZIlly1gh85h7e2r5j32l20smabn.jpg)

之后再次查看/var/log/syslog日志，已经不再刷新上面的日志了，并且可以get node和pods了

![](https://tva1.sinaimg.cn/large/007S8ZIlly1gh85nasql0j31ju0eyad7.jpg)