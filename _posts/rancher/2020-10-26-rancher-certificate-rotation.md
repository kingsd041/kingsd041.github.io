---
layout:     post
title:      Rancher v2.3轮转证书
subtitle:   Rancher v2.3轮转证书
date:       2020-10-26 15:06:00 +0800
author:     Ksd
header-img: img/post-bg-rancher-k8s.png
catalog: true
tags:
    - rancher
    - rancher-server
    - rancher cluster
    - Certificate Rotation
---

## 前言

Rancher v2.3正式release已经一年的时间了，第一批使用Rancher v2.3的用户可能会遇到了Rancher Server证书过期，没有自动轮换的情况。

这会导致Rancher Server无法启动，并且日志会报错：

![](https://tva1.sinaimg.cn/large/0081Kckwly1gk56rrww4oj31h60aw401.jpg)

> **注意：**

1. Rancher Server无法启动不会影响下游集群，下游集群依然可以通过kubeconfig去操作。
2. 以上情况只会在`docker run`并且使用 Rancher 默认的自签名证书启动和使用小于k3s v1.19用作local集群的Rancher上才会发生。

## 重现问题

为了让大家更好的理解这个问题，下面将以手动修改系统时间的形式来重现这个问题。

当前时间：`2020年10月30日 星期五 10时37分59秒 CST`

1. 启动Rancher v2.3.1，并且添加下游集群，操作步骤可以参考官网：

    https://docs.rancher.cn/docs/rancher2/installation/other-installation-methods/single-node-docker/_index/

    https://docs.rancher.cn/docs/rancher2/cluster-provisioning/_index

2. 启动Rancher 之后，从浏览器上查看到的过期时间：`2021年10月30日 星期六 中国标准时间 10:29:35`

    ![](https://tva1.sinaimg.cn/large/0081Kckwly1gk75sw66k2j30ri0goq46.jpg)

3. 查看Rancher Server容器内的K3s证书过期时间为`Oct 28 08:34:23 2021 GMT`

```
root@rancher1:~# docker exec -it rancher_server_id bash
root@25c228f6a4c8:/var/lib/rancher# for i in `ls /var/lib/rancher/k3s/server/tls/*.crt`; do echo $i; openssl x509 -enddate -noout -in $i; done
/var/lib/rancher/k3s/server/tls/client-admin.crt
notAfter=Oct 30 02:28:49 2021 GMT
/var/lib/rancher/k3s/server/tls/client-auth-proxy.crt
notAfter=Oct 30 02:28:49 2021 GMT
/var/lib/rancher/k3s/server/tls/client-ca.crt
notAfter=Oct 28 02:28:49 2030 GMT
/var/lib/rancher/k3s/server/tls/client-controller.crt
notAfter=Oct 30 02:28:49 2021 GMT
/var/lib/rancher/k3s/server/tls/client-kube-apiserver.crt
notAfter=Oct 30 02:28:49 2021 GMT
/var/lib/rancher/k3s/server/tls/client-kube-proxy.crt
notAfter=Oct 30 02:28:49 2021 GMT
/var/lib/rancher/k3s/server/tls/client-scheduler.crt
notAfter=Oct 30 02:28:49 2021 GMT
/var/lib/rancher/k3s/server/tls/request-header-ca.crt
notAfter=Oct 28 02:28:49 2030 GMT
/var/lib/rancher/k3s/server/tls/server-ca.crt
notAfter=Oct 28 02:28:49 2030 GMT
/var/lib/rancher/k3s/server/tls/serving-kube-apiserver.crt
notAfter=Oct 30 02:28:49 2021 GMT
```

4. 将服务器时间调整为证书过期后5天的日期，比如：`20211105`

```
root@rancher1:~# timedatectl set-ntp no
root@rancher1:~# date -s 20211105
Fri Nov  5 00:00:00 CST 2021
root@rancher1:~# date
Fri Nov  5 00:00:00 CST 2021
```

此时，Rancher UI 已经无法访问:

![](https://tva1.sinaimg.cn/large/0081Kckwly1gk75zwz2lfj31680re74o.jpg)

并且Rancher 容器由于内置的K3s证书过期不停的重启，也就是在前言中提到的现象。


## 手动轮换证书

以上的现象是因为Rancher Server内置的K3s证书过期，导致K3s无法启动，从而影响到了Rancher Server容器无法启动。

为了可以继续操作Rancher Server容器，需要将系统时间调整到K3s证书过期之前。

```
root@rancher1:~# date -s 20211025
Mon Oct 25 00:00:00 CST 2021
```

> 如果启动Rancher时未加`--restart=unless-stopped`参数，需要手动启动Rancher Server。

接下来我们就可以进入到容器内手动删除K3s证书，然后重启Rancher，重启成功后将重新生成K3s证书

```
root@rancher1:~# docker exec -it rancher_server_id bash
root@25c228f6a4c8:/var/lib/rancher# rm -rf /var/lib/rancher/k3s/server/tls/*.crt
root@25c228f6a4c8:/var/lib/rancher# exit
exit
root@rancher1:~# docker restart rancher_server_id
```

Rancher Server如果出现以下日志，那就再重启一次Rancher Server：

```
2021/10/24 16:01:00 [INFO] Waiting for server to become available: Get https://localhost:6443/version?timeout=30s: x509: certificate signed by unknown authority
```

## 验证

1. 将服务器时间再次调整为证书过期后5天的日期，比如：`20211105`

```
root@rancher1:~# date -s 20211105
Fri Nov  5 00:00:00 CST 2021
```

证书更新之后，我们需要确认下K3s证书是否更新成功，还需要检查下游集群是否会有影响。

2. 确认K3s证书已经更新

```
root@rancher1:~# docker exec -it rancher_server_id bash
root@25c228f6a4c8:/var/lib/rancher# for i in `ls /var/lib/rancher/k3s/server/tls/*.crt`; do echo $i; openssl x509 -enddate -noout -in $i; done
/var/lib/rancher/k3s/server/tls/client-admin.crt
notAfter=Oct 24 16:00:54 2022 GMT
/var/lib/rancher/k3s/server/tls/client-auth-proxy.crt
notAfter=Oct 24 16:00:54 2022 GMT
/var/lib/rancher/k3s/server/tls/client-ca.crt
notAfter=Oct 22 16:00:54 2031 GMT
/var/lib/rancher/k3s/server/tls/client-controller.crt
notAfter=Oct 24 16:00:54 2022 GMT
/var/lib/rancher/k3s/server/tls/client-kube-apiserver.crt
notAfter=Oct 24 16:00:54 2022 GMT
/var/lib/rancher/k3s/server/tls/client-kube-proxy.crt
notAfter=Oct 24 16:00:54 2022 GMT
/var/lib/rancher/k3s/server/tls/client-scheduler.crt
notAfter=Oct 24 16:00:54 2022 GMT
/var/lib/rancher/k3s/server/tls/request-header-ca.crt
notAfter=Oct 22 16:00:54 2031 GMT
/var/lib/rancher/k3s/server/tls/server-ca.crt
notAfter=Oct 22 16:00:54 2031 GMT
/var/lib/rancher/k3s/server/tls/serving-kube-apiserver.crt
notAfter=Oct 24 16:00:54 2022 GMT
```

K3s证书过期时间已经从`Oct 30 02:28:49 2021 GMT`更新到了`Oct 24 16:00:54 2022 GMT`

3. 确认浏览器证书已经更新

浏览器上的证书过期已经从`2021年10月30日 星期六 中国标准时间 10:29:35`更新到了`2022年10月25日 星期二 中国标准时间 00:01:34`

![](https://tva1.sinaimg.cn/large/0081Kckwly1gk767cso67j30re0gkt9v.jpg)

4. 确认下游集群不受影响

    - 集群状态为`Active`
    ![](https://tva1.sinaimg.cn/large/0081Kckwly1gk565guljaj31zs0i0wey.jpg)

    - 检查集群 Pod 的运行状况
    ![](https://tva1.sinaimg.cn/large/0081Kckwly1gk567u2576j312w0gumye.jpg)

## 后记

Rancher从v2.3开始，在Rancher Server容器中内置了K3s作为local集群来支撑Rancher Server运行。

而k3s内部自动签发的证书的有效期是1年，正常情况下如果证书已过期或剩余的时间少于90天，则在重新启动K3s时将轮换证书。参考官网：https://docs.rancher.cn/docs/k3s/advanced/_index

但实际上由于K3s的bug导致在证书已过期或剩余的时间少于90天时重启Rancher没有将证书轮换，所以才会出现前言中的问题。

不过不用担心，在后续的K3s v1.19版本中已经解决了这个问题，参考：https://github.com/rancher/k3s/commit/a2471a1f8a2aa26902f8e3b29624dc9c809024d2



