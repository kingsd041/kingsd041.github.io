---
layout: post
title: 单节点内置 ETCD 的 K3s 集群如何修改节点 IP
subtitle:
date: 2022-4-11 21:06:00 +0800
author: Ksd
header-img: img/post-bg-desk.jpg
catalog: true
tags:
  - K3s
---

## 介绍

社区用户询问单节点内置 ETCD 的 K3s server 节点的主机 IP 修改，导致 K3s server 无法启动。

随后进行了验证，验证过程中复现了社区用户的操作，并且在 ETCD 集群上做了一些调整，可以重新启动 k3s server 节点。

> 注意：
> 本操作只适用于**单节点内置 ETCD 的 K3s 集群**，其他场景没有测试过。

## 环境

K3s version: v1.22.7-k3s1
Node IP: 192.168.205.201

## 安装 K3s

```
root@del-1:/var/lib/rancher# curl -sfL http://rancher-mirror.cnrancher.com/k3s/k3s-install.sh | INSTALL_K3S_MIRROR=cn  INSTALL_K3S_EXEC="server --disable traefik --cluster-init" INSTALL_K3S_CHANNEL=latest sh -
sh: 0: getcwd() failed: No such file or directory
sh: 0: getcwd() failed: No such file or directory
[INFO]  Finding release for channel latest
[INFO]  Using v1.23.5+k3s1 as release
[INFO]  Downloading hash https://rancher-mirror.rancher.cn/k3s/v1.23.5-k3s1/sha256sum-amd64.txt
[INFO]  Downloading binary https://rancher-mirror.rancher.cn/k3s/v1.23.5-k3s1/k3s
[INFO]  Verifying binary download
[INFO]  Installing k3s to /usr/local/bin/k3s
[INFO]  Skipping installation of SELinux RPM
[INFO]  Creating /usr/local/bin/kubectl symlink to k3s
[INFO]  Creating /usr/local/bin/crictl symlink to k3s
[INFO]  Skipping /usr/local/bin/ctr symlink to k3s, command exists in PATH at /usr/bin/ctr
[INFO]  Creating killall script /usr/local/bin/k3s-killall.sh
[INFO]  Creating uninstall script /usr/local/bin/k3s-uninstall.sh
[INFO]  env: Creating environment file /etc/systemd/system/k3s.service.env
sh: 0: getcwd() failed: No such file or directory
sh: 0: getcwd() failed: No such file or directory
[INFO]  systemd: Creating service file /etc/systemd/system/k3s.service
[INFO]  systemd: Enabling k3s unit
Created symlink /etc/systemd/system/multi-user.target.wants/k3s.service → /etc/systemd/system/k3s.service.
[INFO]  systemd: Starting k3s
```

## 创建测试 pod

```
root@del-1:/var/lib/rancher# kubectl get pods,svc
NAME                                    READY   STATUS              RESTARTS   AGE
pod/nginx-deployment-6949d6fbc9-4t9xw   0/1     ContainerCreating   0          31s
pod/nginx-deployment-6949d6fbc9-mjsz5   0/1     ContainerCreating   0          31s
pod/nginx-deployment-6949d6fbc9-p2bmb   0/1     ContainerCreating   0          31s

NAME                 TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)        AGE
service/kubernetes   ClusterIP   10.43.0.1       <none>        443/TCP        3m32s
service/nginx        NodePort    10.43.207.172   <none>        80:30007/TCP   31s
```

## 修改主机 IP

`192.168.205.201` --> `192.168.205.202`

```
root@del-1:~# vi /etc/netplan/50-cloud-init.yaml
network:
  version: 2
  ethernets:
    enp0s2:
      dhcp4: no
      addresses:
        - 192.168.205.202/24 # 原 IP 为192.168.205.199
      gateway4: 192.168.205.1
      nameservers:
          addresses: [1.2.4.8]

root@del-1:~# reboot
```

## 复现

```
root@del-1:~# kubectl get pods
Error from server (InternalError): an error on the server ("apiserver not ready") has prevented the request from succeeding (get pods)
```

日志：

```
Apr  7 16:25:13 del-1 k3s[884]: time="2022-04-07T16:25:13+08:00" level=info msg="Connecting to proxy" url="wss://127.0.0.1:6443/v1-k3s/connect"
Apr  7 16:25:13 del-1 k3s[884]: time="2022-04-07T16:25:13+08:00" level=error msg="Failed to connect to proxy" error="websocket: bad handshake"
Apr  7 16:25:13 del-1 k3s[884]: time="2022-04-07T16:25:13+08:00" level=error msg="Remotedialer proxy error" error="websocket: bad handshake"
Apr  7 16:25:14 del-1 k3s[884]: time="2022-04-07T16:25:14+08:00" level=info msg="Defragmenting etcd database"
Apr  7 16:25:14 del-1 k3s[884]: {"level":"info","ts":"2022-04-07T16:25:14.583+0800","caller":"v3rpc/maintenance.go:89","msg":"starting defragment"}
Apr  7 16:25:14 del-1 k3s[884]: {"level":"info","ts":"2022-04-07T16:25:14.585+0800","caller":"backend/backend.go:479","msg":"defragmenting","path":"/var/lib/rancher/k3s/server/db/etcd/member/snap/db","current-db-size-bytes":1462272,"current-db-size":"1.5 MB","current-db-size-in-use-bytes":1454080,"current-db-size-in-use":"1.5 MB"}
Apr  7 16:25:14 del-1 k3s[884]: {"level":"info","ts":"2022-04-07T16:25:14.635+0800","caller":"backend/backend.go:537","msg":"finished defragmenting directory","path":"/var/lib/rancher/k3s/server/db/etcd/member/snap/db","current-db-size-bytes-diff":0,"current-db-size-bytes":1462272,"current-db-size":"1.5 MB","current-db-size-in-use-bytes-diff":0,"current-db-size-in-use-bytes":1454080,"current-db-size-in-use":"1.5 MB","took":"52.764022ms"}
Apr  7 16:25:14 del-1 k3s[884]: {"level":"info","ts":"2022-04-07T16:25:14.636+0800","caller":"v3rpc/maintenance.go:95","msg":"finished defragment"}
Apr  7 16:25:14 del-1 k3s[884]: time="2022-04-07T16:25:14+08:00" level=info msg="Failed to test data store connection: this server is a not a member of the etcd cluster. Found [del-1-b19343fd=https://192.168.205.201:2380], expect: del-1-b19343fd=192.168.205.202"
```

## 解决问题

```
root@del-1:~# ETCDCTL_ENDPOINTS='https://127.0.0.1:2379' ETCDCTL_CACERT='/var/lib/rancher/k3s/server/tls/etcd/server-ca.crt' ETCDCTL_CERT='/var/lib/rancher/k3s/server/tls/etcd/server-client.crt' ETCDCTL_KEY='/var/lib/rancher/k3s/server/tls/etcd/server-client.key' ETCDCTL_API=3 etcdctl member  list
8231ab7d5a8b9644, started, del-1-b19343fd, https://192.168.205.201:2380, https://192.168.205.202:2379

ETCDCTL_ENDPOINTS='https://127.0.0.1:2379' ETCDCTL_CACERT='/var/lib/rancher/k3s/server/tls/etcd/server-ca.crt' ETCDCTL_CERT='/var/lib/rancher/k3s/server/tls/etcd/server-client.crt' ETCDCTL_KEY='/var/lib/rancher/k3s/server/tls/etcd/server-client.key' ETCDCTL_API=3 etcdctl member update 8231ab7d5a8b9644 --peer-urls="https://192.168.205.202:2380"
```

## 验证

```
root@del-1:~# kubectl get pods,svc
NAME                                    READY   STATUS    RESTARTS        AGE
pod/nginx-deployment-6949d6fbc9-4t9xw   1/1     Running   1 (4m37s ago)   6m28s
pod/nginx-deployment-6949d6fbc9-mjsz5   1/1     Running   1 (4m37s ago)   6m28s
pod/nginx-deployment-6949d6fbc9-p2bmb   1/1     Running   1 (4m37s ago)   6m28s

NAME                 TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)        AGE
service/kubernetes   ClusterIP   10.43.0.1       <none>        443/TCP        9m29s
service/nginx        NodePort    10.43.207.172   <none>        80:30007/TCP   6m28s

root@del-1:~# kubectl get node -o wide
NAME    STATUS   ROLES                       AGE     VERSION        INTERNAL-IP       EXTERNAL-IP   OS-IMAGE             KERNEL-VERSION       CONTAINER-RUNTIME
del-1   Ready    control-plane,etcd,master   9m54s   v1.23.5+k3s1   192.168.205.202   <none>        Ubuntu 18.04.6 LTS   4.15.0-173-generic   containerd://1.5.10-k3s1
```
