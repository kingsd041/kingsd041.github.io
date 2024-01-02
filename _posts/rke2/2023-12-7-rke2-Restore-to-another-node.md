---
layout: post
title: RKE2 集群迁移实战：利用快照轻松应对新环境
subtitle:
date: 2023-12-7 11:07:00 +0800
author: Ksd
header-img: img/post-bg-debug.jpg
catalog: true
tags:
  - RKE2
  - 迁移
  - 恢复
---

## 前言

当今云原生技术的迅猛发展使得容器编排系统如 Kubernetes 在现代应用开发中扮演着愈发重要的角色。而在 Kubernetes 生态系统中，RKE2（Rancher Kubernetes Engine 2）以其轻量、灵活、易于管理的特性备受开发者和运维人员的喜爱。在构建和管理 Kubernetes 集群的过程中，数据的备份和恢复一直是一项至关重要的任务。

本文将着重探讨如何通过快照技术，将 RKE2 集群恢复到一个新的环境中。快照不仅仅是备份数据的一种方式，更是一项高效的恢复手段，特别是在构建全新集群或者应对灾难性事件时。让我们一起深入了解如何利用快照，将 RKE2 集群在新的环境中迅速重建，确保业务的高可用性和稳定性。

RKE2 官方文档中明确提到了两种恢复快照的方式：一种是将快照恢复到现有节点（[详见链接](https://docs.rke2.io/backup_restore#restoring-a-snapshot-to-existing-nodes)），另一种是将快照恢复到新节点（[详见链接](https://docs.rke2.io/backup_restore#restoring-a-snapshot-to-new-nodes)）。前者适用于在当前集群进行备份和恢复操作，而我们则着重利用后者的特性，将快照成功恢复到一个全新的节点上，实现了 RKE2 集群的迁移。

接下来，我们将详细记录这一操作过程：

## 环境介绍

1. 我已经提前创建了一个由 3 个 master 节点，1 个 worker 节点组成的 RKE2 集群：

![](https://raw.githubusercontent.com/kingsd041/picture/main/202312071442533.png)

2. 随后我又新建了一个主机，主机名称为：`rke2-backup-m1`，`IP：172.16.1.138`，用于新集群的快照恢复。

3. 为了验证迁移结果，我已经提前在集群中创建了 nginx 的 deployment 和 svc：

```
root@rke2-m1:~# kubectl get all -l app=nginx
NAME                                   READY   STATUS    RESTARTS   AGE
pod/nginx-deployment-6bf597b56-7qt5h   1/1     Running   0          81m
pod/nginx-deployment-6bf597b56-brkcc   1/1     Running   0          81m
pod/nginx-deployment-6bf597b56-dhrnm   1/1     Running   0          81m

NAME                               READY   UP-TO-DATE   AVAILABLE   AGE
deployment.apps/nginx-deployment   3/3     3            3           81m

NAME                                         DESIRED   CURRENT   READY   AGE
replicaset.apps/nginx-deployment-6bf597b56   3         3         3       81m
```

4. 已经将原集群的 RKE2 快照上传到了 `rke2-backup-m1` 的 `/home/ubuntu/` 下，本例是使用如下命令手动创建快照，并上传到 `rke2-backup-m1`：

```
root@rke2-m1:~# rke2 etcd-snapshot save --name pre-upgrade-snapshot
root@rke2-m1:/var/lib/rancher/rke2/server/db/snapshots# scp pre-upgrade-snapshot-rke2-m1-1701932453 ubuntu@172.16.1.138:/home/ubuntu
pre-upgrade-snapshot-rke2-m1-1701932453                                                                                                                      100% 6316KB  16.8MB/s   00:00
```

## 将 RKE2 迁移到新集群

1. 将原集群 `/var/lib/rancher/rke2/server/cred`、`/var/lib/rancher/rke2/server/tls`、`/var/lib/rancher/rke2/server/token` 和 `/etc/rancher` 上传到主机 `rke2-backup-m1` 对应目录下。

rke2-m1 的操作：

```
root@rke2-m1:~# scp -r /var/lib/rancher/rke2/server/cred ubuntu@172.16.1.138:/home/ubuntu
root@rke2-m1:~# scp -r /var/lib/rancher/rke2/server/tls ubuntu@172.16.1.138:/home/ubuntu
root@rke2-m1:~# scp -r /etc/rancher ubuntu@172.16.1.138:/home/ubuntu
root@rke2-m1:~# scp /var/lib/rancher/rke2/server/token ubuntu@172.16.1.138:/home/ubuntu
```

rke2-backup-m1 的操作：

```
root@rke2-backup-m1:~# cd /home/ubuntu/
root@rke2-backup-m1:/home/ubuntu# mkdir -p /var/lib/rancher/rke2/server
root@rke2-backup-m1:/home/ubuntu# mv cred /var/lib/rancher/rke2/server/
root@rke2-backup-m1:/home/ubuntu# mv tls /var/lib/rancher/rke2/server/
root@rke2-backup-m1:/home/ubuntu# mv token /var/lib/rancher/rke2/server/
root@rke2-backup-m1:/home/ubuntu# mv rancher /etc/
```

2. 在新 Server 节点上安装 RKE2

```
root@rke2-backup-m1:/home/ubuntu# curl -sfL https://rancher-mirror.rancher.cn/rke2/install.sh | INSTALL_RKE2_MIRROR=cn sh -
[INFO]  finding release for channel stable
[INFO]  using v1.26.10-rke2r2 as release
[INFO]  downloading checksums at https://rancher-mirror.rancher.cn/rke2/releases/download/v1.26.10-rke2r2/sha256sum-amd64.txt
[INFO]  downloading tarball at https://rancher-mirror.rancher.cn/rke2/releases/download/v1.26.10-rke2r2/rke2.linux-amd64.tar.gz
[INFO]  verifying tarball
[INFO]  unpacking tarball file to /usr/local
```

3. 接下来，使用以下命令在新 Server 节点上启动快照恢复：

```
root@rke2-backup-m1:~# rke2 server \
  --cluster-reset \
  --cluster-reset-restore-path=/home/ubuntu/pre-upgrade-snapshot-rke2-m1-1701932453
WARN[0000] not running in CIS mode
INFO[0000] Applying Pod Security Admission Configuration
WARN[0000] remove /var/lib/rancher/rke2/agent/etc/rke2-agent-load-balancer.json: no such file or directory
WARN[0000] remove /var/lib/rancher/rke2/agent/etc/rke2-api-server-agent-load-balancer.json: no such file or directory
INFO[0000] Starting rke2 v1.26.10+rke2r2 (21e3a8c82da71473f2b846065dcab197a9b2c9d8)
...
...
INFO[0070] Managed etcd cluster membership has been reset, restart without --cluster-reset flag now. Backup and delete ${datadir}/server/db on each peer etcd server and rejoin the nodes
```

4. 恢复完成后，在这个 Server 节点上启动 rke2-server 服务，如下所示：

```
root@rke2-backup-m1:~# systemctl start rke2-server
```

RKE2 服务启动后，查看节点状态，发现还残留原集群的节点信息，直接通过 kubectl 移除即可：

```
root@rke2-backup-m1:~# kubectl get nodes
NAME             STATUS     ROLES                       AGE   VERSION
rke2-backup-m1   Ready      control-plane,etcd,master   79s   v1.26.10+rke2r2
rke2-m1          NotReady   control-plane,etcd,master   20d   v1.26.10+rke2r2
rke2-m2          NotReady   control-plane,etcd,master   20d   v1.26.10+rke2r2
rke2-m3          NotReady   control-plane,etcd,master   20d   v1.26.10+rke2r2
rke2-w1          NotReady   <none>                      20d   v1.26.10+rke2r2
root@rke2-backup-m1:~# kubectl delete node rke2-m1 rke2-m2 rke2-m3 rke2-w1
node "rke2-m1" deleted
node "rke2-m2" deleted
node "rke2-m3" deleted
node "rke2-w1" deleted
```

几分钟后，pod 重新调度到新的集群的节点：

```
root@rke2-backup-m1:~# kubectl get all -l app=nginx
NAME                                   READY   STATUS    RESTARTS   AGE
pod/nginx-deployment-6bf597b56-2h8pd   1/1     Running   0          82s
pod/nginx-deployment-6bf597b56-c7vb7   1/1     Running   0          83s
pod/nginx-deployment-6bf597b56-qk6bz   1/1     Running   0          84s

NAME                               READY   UP-TO-DATE   AVAILABLE   AGE
deployment.apps/nginx-deployment   3/3     3            3           101m

NAME                                         DESIRED   CURRENT   READY   AGE
replicaset.apps/nginx-deployment-6bf597b56   3         3         3       101m
```

5. 最后，根据[标准 RKE2 HA 安装文档](https://docs.rke2.io/install/ha)继续向集群添加新的 Server 和 Worker 节点即可。

## 后记

通过本文详细的步骤，我们成功地探讨了如何通过快照技术将 RKE2 集群恢复到一个全新的环境中。快照的灵活性和高效性为我们提供了一个可靠的备份和迁移手段，特别是在构建新集群或者应对灾难性事件时。通过 RKE2 提供的官方文档，我们了解到可以将快照恢复到现有节点，也可以将快照恢复到新节点，为集群的迁移提供了更多选择。

在迁移的过程中，我们一步步地操作，包括上传原集群的关键数据、安装新的 RKE2 环境、进行快照恢复以及最终添加新的节点。通过这一系列操作，我们成功地将 RKE2 集群从旧环境迁移到了全新的环境，并验证了迁移结果，确保业务的高可用性和稳定性。

希望本文的指导能够对读者理解 RKE2 集群的迁移过程有所帮助。随着云原生技术的不断发展，我们相信 RKE2 在容器编排领域将继续发挥重要作用，为用户提供更便捷、高效的集群管理体验。愿你在实际应用中能够充分利用这些技术，确保你的 Kubernetes 集群始终处于最佳状态。
