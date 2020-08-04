---
layout:     post
title:      使用Racnehr搭建跨数据中心集群
subtitle:   使用Racnehr搭建跨数据中心集群
date:       2020-5-5 15:06:00 +0800
author:     Ksd
header-img: img/post-bg-rancher-k8s.png
catalog: true
tags:
    - rancher
    - rancher-server
    - rancher cluster
---


# 使用Racnehr搭建跨数据中心集群

## 背景
待补充

## 环境信息


数据中心 | 主机名 | 角色 | 公网IP | 私有IP | 备注
--- | --- | --- | --- | --- | ---
AWS | ip-172-31-8-93 | Rancher Server | 35.183.208.191 | 172.31.8.93 |
AWS | ip-172-31-2-52 | Etcd&Control | 35.183.104.184 | 172.31.2.52 | 
AWS | ip-172-31-8-33 | worker | 52.60.79.181 | 172.31.8.33 | 
GCE | hailong-demo-gce-worker | worker | 35.188.150.213 | 35.188.150.213 |


## 搭建集群

#### 在Rancher Server 机器上安装单节点Rancher
```
# docker run -itd -p 80:80 -p 443:443 --restart=unless-stopped rancher/rancher:v2.4.3
```

#### 在ETCD&Control节点想集群添加Etcd&Control角色

> 注意：需要将`Node Public Address`和`Node Public Address`都设置为公网IP地址或者只设置`Node Public Address`，否则添加worker节点后，worker节点的`nginx-proxy`将会报错：
> ```
> 2020/05/09 02:49:05 [error] 11#11: *711 upstream timed out (110: Operation timed out) while connecting to upstream, client: 127.0.0.1, server: 0.0.0.0:6443, upstream: "172.31.2.52:6443", bytes from/to client:0/0, bytes from/to upstream:0/0
> ```


![](https://tva1.sinaimg.cn/large/007S8ZIlly1gem0n4qcb4j31tq0u0ab1.jpg)

然后将自动生成的命令copy到对应的Etcd&Control主机，执行

几分钟后，添加成功，节点状态变为Active
![](https://tva1.sinaimg.cn/large/007S8ZIlly1gelz17suvwj321g0lqdgi.jpg)

随后可以点击主机 右侧的 省略号 > Edit, 可以查看到`rke.cattle.io/internal-ip`已经设置为公网IP地址
![](https://tva1.sinaimg.cn/large/007S8ZIlly1gem0zalqryj315y0u0myv.jpg)


#### 添加worker节点

随后我们就可以在AWS和GCE虚拟机上添加worker节点，添加节点是需要分别指定`Node Public Address`和`Node Internal Address`的地址，这次可以按照虚拟机的公网IP和内网IP分别指定，不需要像Etcd节点那样同时都设置成公网IP。

下图为添加节点成功后的截图：
![](https://tva1.sinaimg.cn/large/007S8ZIlly1gem1g1hs91j322y0qkgmx.jpg)

然后在确认下pod是否都启动了：
```
root@ip-172-31-8-93:~# kubectl get pods --all-namespaces
NAMESPACE       NAME                                      READY   STATUS      RESTARTS   AGE
cattle-system   cattle-cluster-agent-54f5f97854-qc4bm     1/1     Running     0          41m
cattle-system   cattle-node-agent-fl8jz                   1/1     Running     0          39m
cattle-system   cattle-node-agent-kplpq                   1/1     Running     0          18m
cattle-system   cattle-node-agent-lfjts                   1/1     Running     0          41m
cattle-system   kube-api-auth-jl4lw                       1/1     Running     0          41m
ingress-nginx   default-http-backend-67cf578fc4-x2j7w     1/1     Running     0          41m
ingress-nginx   nginx-ingress-controller-5sr8b            1/1     Running     0          39m
ingress-nginx   nginx-ingress-controller-v7bq2            1/1     Running     0          18m
kube-system     canal-j44zb                               2/2     Running     0          42m
kube-system     canal-k89nq                               2/2     Running     0          39m
kube-system     canal-qpxlt                               2/2     Running     0          18m
kube-system     coredns-7c5566588d-fwmjj                  1/1     Running     0          18m
kube-system     coredns-7c5566588d-kspws                  1/1     Running     0          42m
kube-system     coredns-autoscaler-65bfc8d47d-9g9qp       1/1     Running     0          42m
kube-system     metrics-server-6b55c64f86-vpl99           1/1     Running     0          42m
kube-system     rke-coredns-addon-deploy-job-qs49q        0/1     Completed   0          42m
kube-system     rke-ingress-controller-deploy-job-tqgkm   0/1     Completed   0          42m
kube-system     rke-metrics-addon-deploy-job-48px5        0/1     Completed   0          42m
kube-system     rke-network-plugin-deploy-job-45slw       0/1     Completed   0          42m
```

## 解决网络问题

在以上步骤完成后，跨数据中心的集群就已经搭建完成了，但跨数据中心的pod是不通的，可以登录到gce-worker节点和aws-worker节点flannel对应的`dst`都为内网地址，这会导致pod间网络不通。

**AWS worker:**
```
root@ip-172-31-8-33:~# bridge fdb show | grep flannel
72:b9:96:ab:69:60 dev flannel.1 dst 172.31.2.52 self permanent
2a:c8:84:70:13:90 dev flannel.1 dst 10.240.0.25 self permanent
```

**GCE worker:**
```
root@hailong-demo-gce-worker:~# bridge fdb show | grep flannel
d6:6f:c8:77:de:6c dev flannel.1 dst 172.31.8.33 self permanent
72:b9:96:ab:69:60 dev flannel.1 dst 172.31.2.52 self permanent
```

要解决这个问题，需要手动分别编辑**worker节点和etcd&control**的Annotations，添加`flannel.alpha.coreos.com/public-ip-overwrite`来解决，参考：https://coreos.com/flannel/docs/latest/kubernetes.html

**参考：**
![](https://tva1.sinaimg.cn/large/007S8ZIlly1gem2756e2nj314j0u0dhk.jpg)

随后导航到system project下，redeploy kube-system namespace下的canal workload，为了使配置生效。

接下来，再次在两台worker节点上验证flannel的`dst`地址
**AWS worker:**
```
root@ip-172-31-8-33:~# bridge fdb show | grep flannel
72:b9:96:ab:69:60 dev flannel.1 dst 35.183.104.184 self permanent
2a:c8:84:70:13:90 dev flannel.1 dst 35.188.150.213 self permanent
```

**GCE worker:**
```
root@hailong-demo-gce-worker:~# bridge fdb show | grep flannel
d6:6f:c8:77:de:6c dev flannel.1 dst 52.60.79.181 self permanent
72:b9:96:ab:69:60 dev flannel.1 dst 35.183.104.184 self permanent
```

可以看到，`dst`都已经变成了对端节点的公网IP。

## 验证

接下来就可以验证两个pod间通讯了。

```
root@ip-172-31-8-93:~# kubectl get pods -o wide
NAME                   READY   STATUS    RESTARTS   AGE   IP          NODE                      NOMINATED NODE   READINESS GATES
aws-76644dbb44-428wd   1/1     Running   0          18m   10.42.2.3   ip-172-31-8-33            <none>           <none>
gce-577c94b676-px8cf   1/1     Running   0          18m   10.42.1.6   hailong-demo-gce-worker   <none>           <none>
root@ip-172-31-8-93:~#
root@ip-172-31-8-93:~#
root@ip-172-31-8-93:~# kubectl exec -it aws-76644dbb44-428wd -- ping -c 4 10.42.1.6
PING 10.42.1.6 (10.42.1.6) 56(84) bytes of data.
64 bytes from 10.42.1.6: icmp_seq=1 ttl=62 time=28.9 ms
64 bytes from 10.42.1.6: icmp_seq=2 ttl=62 time=28.9 ms
64 bytes from 10.42.1.6: icmp_seq=3 ttl=62 time=28.9 ms
64 bytes from 10.42.1.6: icmp_seq=4 ttl=62 time=28.9 ms
```


## 遗留问题

1. 使用kubectl exec gce 主机上的pod 会报错：
```
root@ip-172-31-8-93:~# kubectl exec -it gce-577c94b676-bsmt7 bash
Error from server: error dialing backend: dial tcp 10.240.0.25:10250: i/o timeout
```

问题的原因应该是 执行命令时，kube-api通过内网ip去连接worker节点的kubelet，所以才会导致timeout的情况
可能在worker节点的kubelet加上--node-ip参数就可以了，但目前没找到怎么在rancher中加这个参数。