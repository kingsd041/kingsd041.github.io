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

最近社区用户出现了rancher v2.3 证书过期导致 rancher server的容器无法启动的情况,
日志：
![](https://tva1.sinaimg.cn/large/007S8ZIlgy1gjunm8pym1j30t403amxq.jpg)

按照官网的逻辑：
> 证书未过期时，rancher server 可以正常运行。升级到 Rancher v2.0.14+ 、v2.1.9+、v2.2.2+ 后会自动检查证书有效期，如果发现证书即将过期，将会自动生成新的证书。所以独立容器运行的 Rancher Server，只需在证书过期前把 rancher 版本升级到支持自动更新 ssl 证书的版本即可，无需做其他操作。

理论上在过期之前,应该自动续签证书才对,所以带着疑问,在2.3进行了测试

**注意：操作轮转证书之前，一定要针对你的Rancher Server做好备份！！！参考[官网](https://docs.rancher.cn/docs/rancher2/backups/backups/_index)**

## 基于Rancher v2.3.1验证

### 基础环境

测试日期: `2020年10月19日 星期一 15时07分13秒 CST`

启动Rancher 之后，从浏览器上查看到的证书过期时间：`2021年10月19日 星期二 中国标准时间 14:31:44`

exec 到 rancher server 容器，查看K3S 证书过期时间：
```
for i in `ls /var/lib/rancher/k3s/server/tls/*.crt`; do echo $i; openssl x509 -enddate -noout -in $i; done
/var/lib/rancher/k3s/server/tls/client-admin.crt
notAfter=Oct 19 06:31:26 2021 GMT
/var/lib/rancher/k3s/server/tls/client-auth-proxy.crt
notAfter=Oct 19 06:31:26 2021 GMT
/var/lib/rancher/k3s/server/tls/client-ca.crt
notAfter=Oct 17 06:31:26 2030 GMT
/var/lib/rancher/k3s/server/tls/client-controller.crt
notAfter=Oct 19 06:31:26 2021 GMT
/var/lib/rancher/k3s/server/tls/client-kube-apiserver.crt
notAfter=Oct 19 06:31:26 2021 GMT
/var/lib/rancher/k3s/server/tls/client-kube-proxy.crt
notAfter=Oct 19 06:31:26 2021 GMT
/var/lib/rancher/k3s/server/tls/client-scheduler.crt
notAfter=Oct 19 06:31:26 2021 GMT
/var/lib/rancher/k3s/server/tls/request-header-ca.crt
notAfter=Oct 17 06:31:26 2030 GMT
/var/lib/rancher/k3s/server/tls/server-ca.crt
notAfter=Oct 17 06:31:26 2030 GMT
/var/lib/rancher/k3s/server/tls/serving-kube-apiserver.crt
notAfter=Oct 19 06:31:26 2021 GMT
```

### 开始验证

1. 将服务器时间调整为还有5天过期的时间，比如：`20211015`
```
timedatectl set-ntp no

date -s 20211015

date
Fri Oct 15 00:00:02 CST 2021
```

2. 触发证书更新

rancher 会在没6小时检查一下证书，如果快过期了，会更新Rancher的相关证书，但本次测试为了快点更新，直接使用使用重启rancher的方式触发更新。
```
docker restat rancher-server
```

3. 验证证书更新

    - 在浏览器上查看证书的过期时间：`2022年10月15日 星期六 中国标准时间 00:04:53`，已经更新成功
    - 检查K3S的证书：
    
    ```
    # for i in `ls /var/lib/rancher/k3s/server/tls/*.crt`; do echo $i; openssl x509 -enddate -noout -in $i; done
    /var/lib/rancher/k3s/server/tls/client-admin.crt
    notAfter=Oct 19 07:45:23 2021 GMT
    /var/lib/rancher/k3s/server/tls/client-auth-proxy.crt
    notAfter=Oct 19 07:45:23 2021 GMT
    /var/lib/rancher/k3s/server/tls/client-ca.crt
    notAfter=Oct 17 07:45:23 2030 GMT
    /var/lib/rancher/k3s/server/tls/client-controller.crt
    notAfter=Oct 19 07:45:23 2021 GMT
    /var/lib/rancher/k3s/server/tls/client-kube-apiserver.crt
    notAfter=Oct 19 07:45:23 2021 GMT
    /var/lib/rancher/k3s/server/tls/client-kube-proxy.crt
    notAfter=Oct 19 07:45:23 2021 GMT
    /var/lib/rancher/k3s/server/tls/client-scheduler.crt
    notAfter=Oct 19 07:45:23 2021 GMT
    /var/lib/rancher/k3s/server/tls/request-header-ca.crt
    notAfter=Oct 17 07:45:23 2030 GMT
    /var/lib/rancher/k3s/server/tls/server-ca.crt
    notAfter=Oct 17 07:45:23 2030 GMT
    /var/lib/rancher/k3s/server/tls/serving-kube-apiserver.crt
    notAfter=Oct 19 07:45:23 2021 GMT
    ```
    从上面的结果来看，K3s的证书并没有更新，这回导致到了K3s证书过期时间之后，Rancher server将反复重启，也就是开头遇见的那个问题。
    
### 问题解决

1. exec 到Rancher server内，删除对应的证书：
```
rm -rf /var/lib/rancher/k3s/server/tls/*.crt 
```

2. 重启Rancher server容器
    有时候会反复刷日志`2021/10/14 16:12:10 [INFO] Waiting for server to become available: Get https://localhost:6443/version?timeout=30s: x509: certificate signed by unknown authority`

    如果出现以上日志，那就再重启一次rancher server

3. 检查K3s证书过期时间
    在容器内执行：
    ```
    # for i in `ls /var/lib/rancher/k3s/server/tls/*.crt  `; do echo $i; openssl x509 -enddate -noout -in $i; done
    /var/lib/rancher/k3s/server/tls/client-admin.crt
    notAfter=Oct 14 16:16:34 2022 GMT
    /var/lib/rancher/k3s/server/tls/client-auth-proxy.crt
    notAfter=Oct 14 16:16:34 2022 GMT
    /var/lib/rancher/k3s/server/tls/client-ca.crt
    notAfter=Oct 12 16:16:34 2031 GMT
    /var/lib/rancher/k3s/server/tls/client-controller.crt
    notAfter=Oct 14 16:16:34 2022 GMT
    /var/lib/rancher/k3s/server/tls/client-kube-apiserver.crt
    notAfter=Oct 14 16:16:34 2022 GMT
    /var/lib/rancher/k3s/server/tls/client-kube-proxy.crt
    notAfter=Oct 14 16:16:34 2022 GMT
    /var/lib/rancher/k3s/server/tls/client-scheduler.crt
    notAfter=Oct 14 16:16:34 2022 GMT
    /var/lib/rancher/k3s/server/tls/request-header-ca.crt
    notAfter=Oct 12 16:16:34 2031 GMT
    /var/lib/rancher/k3s/server/tls/server-ca.crt
    notAfter=Oct 12 16:16:34 2031 GMT
    /var/lib/rancher/k3s/server/tls/serving-kube-apiserver.crt
    notAfter=Oct 14 16:16:34 2022 GMT
    ```
    
    从以上结果可以看到，K3s的证书过期时间已经更新成了 2022年 10月 14日
    
    此时将服务器时间再往后调整一个月，验证K3s和Rancher server是否正常
    ```
    date -s 20211115
    ```
    
    结果：
    Rancher 访问正常