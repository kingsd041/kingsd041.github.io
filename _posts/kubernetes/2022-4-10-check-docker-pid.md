---
layout: post
title: 通过进程ID找到对应的容器
subtitle: 通过进程ID找到对应的容器
date: 2022-4-10 21:06:00 +0800
author: Ksd
header-img: img/post-bg-os-metro.jpg
catalog: true
tags:
  - Docker
  - Pid
---

先使用 ps auxw 查看进程的 ID，再执行：
docker ps -q | xargs docker inspect --format '{{.State.Pid}}, {{.Name}}' | grep "^%PID%"
其中％PID％是 ps 查看到的 CONTAINER PID.

```
root@dev-1:~# ps -ef | grep kube-apiserver
root      9776 22619  0 11:16 pts/0    00:00:00 grep --color=auto kube-apiserver
root     24978 24962  8 04:25 ?        00:33:12 kube-apiserver --etcd-certfile=/etc/kubernetes/ssl/kube-node.pem --tls-cert-file=/etc/kubernetes/ssl/kube-apiserver.pem --service-account-lookup=true --authorization-mode=Node,RBAC...........

root@dev-1:~# docker ps -q | xargs docker inspect --format '{{.State.Pid}}, {{.Name}}' | grep "^24978"
24978, /kube-apiserver
```

如果 ps auxw 取到的进程 ID 不为 CONTAINER PID,通常情况下是由于这个进程不是容器的 1 号进程造成的。可以通过
pstree -sg <PID>
先找到父 ID，再执行：
docker ps -q | xargs docker inspect --format '{{.State.Pid}}, {{.Name}}' | grep "^%PID%"
就可以了。

```
root@dev-1:~# ps -ef | grep cri-dockerd
root     13505 22619  0 11:19 pts/0    00:00:00 grep --color=auto cri-dockerd
root     26211 25813  3 04:26 ?        00:14:46 /opt/rke-tools/bin/cri-dockerd --network-plugin=cni --cni-conf-dir=/etc/cni/net.d --cni-bin-dir=/opt/cni/bin --pod-infra-container-image=rancher/mirrored-pause:3.6
root@dev-1:~#
root@dev-1:~# pstree -sg 25813
systemd(1)───containerd(795)───containerd-shim(25793)───entrypoint.sh(25813)─┬─cri-dockerd(25813)─┬─calico(25813)─┬─{calico}(25813)
                                                                             │                    │               ├─{calico}(25813)
...
...
...

root@dev-1:~# docker ps -q | xargs docker inspect --format '{{.State.Pid}}, {{.Name}}' | grep "^25813"
25813, /kubelet
```
