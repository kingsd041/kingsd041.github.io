---
layout:     post
title:      k3s证书轮转验证
subtitle:   k3s证书轮转验证
date:       2020-7-1 21:06:00 +0800
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



# 验证k3s证书轮转

## 说明
K3s官网说明：

> By default, certificates in K3s expire in 12 months.
> If the certificates are expired or have fewer than 90 days remaining before they expire, the certificates are rotated when K3s is restarted.

也就是说如果证书已过期或剩余的时间少于90天，可以通过重启K3s将触发轮换证书的操作。

但实际测试结果来看，并不是这样的。如果k3s证书**已经过期**再通过重启k3s来触发轮转证书,只能确认`/var/lib/rancher/k3s/server/tls/`里的证书轮转成功，但secret `k3s-serving`是没有轮转的，得通过手动删除的方式触发`k3s-serving`的重建。

## 测试环境

操作系统 | K3S 版本 
-- | --
ubuntu 1804 | v1.18.6+k3s1

## 场景1：证书已过期，k3s轮转证书

1. 查下当前时间
```
# date
Sun Jul 26 04:53:03 UTC 2020
```
当前时间为 2020年7月26日

2. 关闭ubuntu 时钟同步
```
# timedatectl set-ntp no
```

3. 启动k3s 集群
```
curl -sfL https://get.k3s.io | sh -
```

4. 查看证书过期时间
```
# for i in `ls /var/lib/rancher/k3s/server/tls/*.crt`; do echo $i; openssl x509 -enddate -noout -in $i; done
/var/lib/rancher/k3s/server/tls/client-admin.crt
notAfter=Jul 26 04:53:44 2021 GMT
/var/lib/rancher/k3s/server/tls/client-auth-proxy.crt
notAfter=Jul 26 04:53:44 2021 GMT
/var/lib/rancher/k3s/server/tls/client-ca.crt
notAfter=Jul 24 04:53:44 2030 GMT
/var/lib/rancher/k3s/server/tls/client-cloud-controller.crt
notAfter=Jul 26 04:53:44 2021 GMT
/var/lib/rancher/k3s/server/tls/client-controller.crt
notAfter=Jul 26 04:53:44 2021 GMT
/var/lib/rancher/k3s/server/tls/client-k3s-controller.crt
notAfter=Jul 26 04:53:44 2021 GMT
/var/lib/rancher/k3s/server/tls/client-kube-apiserver.crt
notAfter=Jul 26 04:53:44 2021 GMT
/var/lib/rancher/k3s/server/tls/client-kube-proxy.crt
notAfter=Jul 26 04:53:44 2021 GMT
/var/lib/rancher/k3s/server/tls/client-scheduler.crt
notAfter=Jul 26 04:53:44 2021 GMT
/var/lib/rancher/k3s/server/tls/request-header-ca.crt
notAfter=Jul 24 04:53:44 2030 GMT
/var/lib/rancher/k3s/server/tls/server-ca.crt
notAfter=Jul 24 04:53:44 2030 GMT
/var/lib/rancher/k3s/server/tls/serving-kube-apiserver.crt
notAfter=Jul 26 04:53:44 2021 GMT
```
可以确认 k3s集群的过期时间为`Jul 26 04:53:44 2021 GMT`

5. 修改系统时间，修改为大于证书过期的时间。比如上步查询的证书过期时间为`2021-7-26`，修改后的日志应该大于这个时间，例如修改为`2021-08-24`来模拟证书已经过期的场景。
```
# date -s 20210920
```

6. 确认证书已经过期的情况下无法操作k3s集群
```
# kubectl get nodes
Unable to connect to the server: x509: certificate has expired or is not yet valid
```

7. 重启K3s，触发轮转证书机制
```
# service k3s restart
```

8. 查看证书过期时间，并确认集群是否可用
```
# for i in `ls /var/lib/rancher/k3s/server/tls/*.crt`; do echo $i; openssl x509 -enddate -noout -in $i; done
/var/lib/rancher/k3s/server/tls/client-admin.crt
notAfter=Aug 24 00:00:13 2022 GMT
/var/lib/rancher/k3s/server/tls/client-auth-proxy.crt
notAfter=Aug 24 00:00:13 2022 GMT
/var/lib/rancher/k3s/server/tls/client-ca.crt
notAfter=Jul 24 04:53:44 2030 GMT
/var/lib/rancher/k3s/server/tls/client-cloud-controller.crt
notAfter=Aug 24 00:00:13 2022 GMT
/var/lib/rancher/k3s/server/tls/client-controller.crt
notAfter=Aug 24 00:00:13 2022 GMT
/var/lib/rancher/k3s/server/tls/client-k3s-controller.crt
notAfter=Aug 24 00:00:13 2022 GMT
/var/lib/rancher/k3s/server/tls/client-kube-apiserver.crt
notAfter=Aug 24 00:00:13 2022 GMT
/var/lib/rancher/k3s/server/tls/client-kube-proxy.crt
notAfter=Aug 24 00:00:13 2022 GMT
/var/lib/rancher/k3s/server/tls/client-scheduler.crt
notAfter=Aug 24 00:00:13 2022 GMT
/var/lib/rancher/k3s/server/tls/request-header-ca.crt
notAfter=Jul 24 04:53:44 2030 GMT
/var/lib/rancher/k3s/server/tls/server-ca.crt
notAfter=Jul 24 04:53:44 2030 GMT
/var/lib/rancher/k3s/server/tls/serving-kube-apiserver.crt
notAfter=Aug 24 00:00:13 2022 GMT
```
从上面的结果来看，证书过期时间已经更新为`Aug 24 00:00:13 2022 GMT`,但此时是无法通过kubectl来操作k3s集群的：

```
# kubectl get ndoes
Unable to connect to the server: x509: certificate has expired or is not yet valid
```
并且 syslog日志中有以下错误信息：
```
Aug 24 00:03:08 ip-172-31-19-157 k3s[8854]: time="2021-08-24T00:03:08.841915266Z" level=info msg="Waiting for master node  startup: resource name may not be empty"
Aug 24 00:03:09 ip-172-31-19-157 k3s[8854]: http: TLS handshake error from 10.42.0.2:45278: remote error: tls: bad certificate
Aug 24 00:03:09 ip-172-31-19-157 k3s[8854]: http: TLS handshake error from 10.42.0.2:45280: remote error: tls: bad certificate
Aug 24 00:03:09 ip-172-31-19-157 k3s[8854]: time="2021-08-24T00:03:09.842174021Z" level=info msg="Waiting for master node  startup: resource name may not be empty"
Aug 24 00:03:10 ip-172-31-19-157 k3s[8854]: http: TLS handshake error from 10.42.0.2:45284: remote error: tls: bad certificate
Aug 24 00:03:10 ip-172-31-19-157 k3s[8854]: http: TLS handshake error from 10.42.0.2:45286: remote error: tls: bad certificate
Aug 24 00:03:10 ip-172-31-19-157 k3s[8854]: http: TLS handshake error from 127.0.0.1:33844: remote error: tls: bad certificate
Aug 24 00:03:10 ip-172-31-19-157 k3s[8854]: http: TLS handshake error from 127.0.0.1:33846: remote error: tls: bad certificate
Aug 24 00:03:10 ip-172-31-19-157 k3s[8854]: time="2021-08-24T00:03:10.140052506Z" level=error msg="server https://127.0.0.1:6443/cacerts is not trusted: Get https://127.0.0.1:6443/cacerts: x509: certificate has expired or is not yet valid"
```

以上问题应该是 重启k3s后，对应的`k3s-serving`过期时间没有更新导致：

```
# kubectl get secret -n kube-system k3s-serving -o jsonpath='{.data.tls\.crt}' | base64 -d | openssl x509 -noout -text | grep Not
            Not Before: Jul 26 05:32:54 2020 GMT
            Not After : Jul 26 05:32:54 2021 GMT
```

### 解决方法：

1. 设置系统时间（小于证书轮转前的证书过期时间），确保可以重新通过kubctl操作集群
```
date -s 20210720

kubectl get nodes
NAME               STATUS   ROLES    AGE    VERSION
ip-172-31-19-157   Ready    master   358d   v1.18.6+k3s1
```

2. 删除k3s-serving和dynamic-cert.json

> 必须得同时删除k3s-serving和dynamic-cert.json，否则重启K3s之后，k3s-serving的过期时间也不会更新，原因不详。

```
kubectl delete secret k3s-serving -n kube-system
secret "k3s-serving" deleted
```

```
rm -rf /var/lib/rancher/k3s/server/tls/dynamic-cert.json
```

3. 修改时间为已过期的时间，然后重启k3s触发更新并且从新创建k3s-serveing

```
date -s 20210920
service k3s restart
```
4. 确认证书已更新
```
date
Mon Sep 20 00:02:29 UTC 2021

kubectl get node
NAME               STATUS   ROLES    AGE    VERSION
ip-172-31-19-157   Ready    master   420d   v1.18.6+k3s1
```

## 场景2：证书未过期(<90天)，k3s轮转证书

1. 查下当前时间
```
date
Fri Jul 24 07:00:22 UTC 2020
```

2. 关闭ubuntu 时钟同步
```
timedatectl set-ntp no
```

3. 启动k3s 集群
```
curl -sfL https://get.k3s.io | sh -
```

4. 查看证书过期时间
```
for i in `ls /var/lib/rancher/k3s/server/tls/*.crt`; do echo $i; openssl x509 -enddate -noout -in $i; done
/var/lib/rancher/k3s/server/tls/client-admin.crt
notAfter=Jul 24 07:04:04 2021 GMT
/var/lib/rancher/k3s/server/tls/client-auth-proxy.crt
notAfter=Jul 24 07:04:04 2021 GMT
/var/lib/rancher/k3s/server/tls/client-ca.crt
notAfter=Jul 22 07:04:04 2030 GMT
/var/lib/rancher/k3s/server/tls/client-cloud-controller.crt
notAfter=Jul 24 07:04:04 2021 GMT
/var/lib/rancher/k3s/server/tls/client-controller.crt
notAfter=Jul 24 07:04:04 2021 GMT
/var/lib/rancher/k3s/server/tls/client-k3s-controller.crt
notAfter=Jul 24 07:04:04 2021 GMT
/var/lib/rancher/k3s/server/tls/client-kube-apiserver.crt
notAfter=Jul 24 07:04:04 2021 GMT
/var/lib/rancher/k3s/server/tls/client-kube-proxy.crt
notAfter=Jul 24 07:04:04 2021 GMT
/var/lib/rancher/k3s/server/tls/client-scheduler.crt
notAfter=Jul 24 07:04:04 2021 GMT
/var/lib/rancher/k3s/server/tls/request-header-ca.crt
notAfter=Jul 22 07:04:04 2030 GMT
/var/lib/rancher/k3s/server/tls/server-ca.crt
notAfter=Jul 22 07:04:04 2030 GMT
/var/lib/rancher/k3s/server/tls/serving-kube-apiserver.crt
notAfter=Jul 24 07:04:04 2021 GMT
```
可以确认 k3s集群的过期时间为`Jul 24 07:04:04 2021 GMT`

5. 修改系统时间

修改为`Jul 20 2021 GMT`
```
date -s 20210720
```
> 修改的时间应该为证书过期前 90天之内的时间

6. 确认证书未过期的情况下依然可以操作k3s集群

```
kubectl get nodes
NAME               STATUS   ROLES    AGE    VERSION
ip-172-31-30-162   Ready    master   360d   v1.18.6+k3s1
```

7. 重启K3s，触发轮转证书机制
```
service k3s restart
```

8. 查看证书过期时间
```
for i in `ls /var/lib/rancher/k3s/server/tls/*.crt`; do echo $i; openssl x509 -enddate -noout -in $i; done
/var/lib/rancher/k3s/server/tls/client-admin.crt
notAfter=Jul 20 00:01:12 2022 GMT
/var/lib/rancher/k3s/server/tls/client-auth-proxy.crt
notAfter=Jul 20 00:01:12 2022 GMT
/var/lib/rancher/k3s/server/tls/client-ca.crt
notAfter=Jul 22 07:04:04 2030 GMT
/var/lib/rancher/k3s/server/tls/client-cloud-controller.crt
notAfter=Jul 20 00:01:12 2022 GMT
/var/lib/rancher/k3s/server/tls/client-controller.crt
notAfter=Jul 20 00:01:12 2022 GMT
/var/lib/rancher/k3s/server/tls/client-k3s-controller.crt
notAfter=Jul 20 00:01:12 2022 GMT
/var/lib/rancher/k3s/server/tls/client-kube-apiserver.crt
notAfter=Jul 20 00:01:12 2022 GMT
/var/lib/rancher/k3s/server/tls/client-kube-proxy.crt
notAfter=Jul 20 00:01:12 2022 GMT
/var/lib/rancher/k3s/server/tls/client-scheduler.crt
notAfter=Jul 20 00:01:12 2022 GMT
/var/lib/rancher/k3s/server/tls/request-header-ca.crt
notAfter=Jul 22 07:04:04 2030 GMT
/var/lib/rancher/k3s/server/tls/server-ca.crt
notAfter=Jul 22 07:04:04 2030 GMT
/var/lib/rancher/k3s/server/tls/serving-kube-apiserver.crt
notAfter=Jul 20 00:01:12 2022 GMT
```
从上面的结果来看，证书过期时间已经更新为`notAfter=Jul 20 00:01:12 2022 GMT`

9. 确认K3S集群可用
```
root@ip-172-31-30-162:~# kubectl get pods -A
NAMESPACE     NAME                                     READY   STATUS      RESTARTS   AGE
kube-system   local-path-provisioner-6d59f47c7-whwcb   1/1     Running     0          360d
kube-system   metrics-server-7566d596c8-4htmm          1/1     Running     0          360d
kube-system   helm-install-traefik-dqlbn               0/1     Completed   1          360d
kube-system   svclb-traefik-2h6cp                      2/2     Running     0          360d
kube-system   coredns-8655855d6-rb9mf                  1/1     Running     0          360d
kube-system   traefik-758cd5fc85-qp4mq                 1/1     Running     0          360d
root@ip-172-31-30-162:~#
root@ip-172-31-30-162:~#
root@ip-172-31-30-162:~# kubectl get nodes
NAME               STATUS   ROLES    AGE    VERSION
ip-172-31-30-162   Ready    master   360d   v1.18.6+k3s1
```

### 问题：
以上操作之后，表面上看，k3s证书轮转成功,并且证书过期时间已经更新为2022年，也可以正常操作k3s集群。

但实际上`server https://127.0.0.1:6443/cacerts`对应的证书并没有轮转，请看下面的操作：

1. 此时再次修改系统时间，将系统时间修改为`20210920`（大于证书轮转前的证书过期时间）
```
date -s 20210920
```

2. 再次确认K3S集群可用，报错：
```
kubectl get nodes
Unable to connect to the server: x509: certificate has expired or is not yet valid
```

但理论上，上一步设置的时间`20210920`要小于当前集群的证书过期时间，应该是可以操作集群的才对。

原因应该和上一章节`证书已过期，k3s轮转证书`的原因一样，所以解决方法也基本相同。

### 解决方法

1. 设置系统时间（小于证书轮转前的证书过期时间），确保可以从新通过kubctl操作集群
```
date -s 20210720

kubectl get nodes
NAME               STATUS   ROLES    AGE    VERSION
ip-172-31-19-157   Ready    master   358d   v1.18.6+k3s1
```

2. 删除k3s-serving

> 必须得同时删除k3s-serving和dynamic-cert.json，否则重启K3s之后，k3s-serving的过期时间也不会更新，原因不详。

```
kubectl delete secret k3s-serving -n kube-system
secret "k3s-serving" deleted
```

```
rm -rf /var/lib/rancher/k3s/server/tls/dynamic-cert.json
```
3. 修改时间为已过期的时间，然后重启k3s触发更新并且从新创建k3s-serveing

```
date -s 20210920
service k3s restart
```
4. 确认证书已更新
```
date
Mon Sep 20 00:02:29 UTC 2021

kubectl get node
NAME               STATUS   ROLES    AGE    VERSION
ip-172-31-19-157   Ready    master   420d   v1.18.6+k3s1
```
