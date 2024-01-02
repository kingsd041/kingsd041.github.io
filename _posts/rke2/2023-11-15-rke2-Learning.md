---
layout: post
title: RKE2 学习笔记
subtitle:
date: 2023-11-15 21:07:00 +0800
author: Ksd
header-img: img/post-bg-debug.jpg
catalog: true
tags:
  - RKE2
---

## RKE2 国内启动

```
# mkdir -p /etc/rancher/rke2
# cat > /etc/rancher/rke2/config.yaml << EOL
system-default-registry: registry.cn-hangzhou.aliyuncs.com
EOL

# curl -sfL https://rancher-mirror.rancher.cn/rke2/install.sh | INSTALL_RKE2_MIRROR=cn sh -
# systemctl enable rke2-server.service
# systemctl start rke2-server.service
```

## RKE2 COMMAND

参考：https://forums.rancher.cn/t/rke2-commands/2110

## 网络选项

默认 CNI 为 Canal，RKE2 v1.21 开始支持 Cilium 和 Calico。

使用 Cilium CNI 启动：
```
# mkdir -p /etc/rancher/rke2
# cat > /etc/rancher/rke2/config.yaml << EOL
system-default-registry: registry.cn-hangzhou.aliyuncs.com
cni: cilium
EOL

# curl -sfL https://rancher-mirror.rancher.cn/rke2/install.sh | INSTALL_RKE2_MIRROR=cn sh -
# systemctl enable rke2-server.service
# systemctl start rke2-server.service
```

使用 Calico CNI 启动：
```
# mkdir -p /etc/rancher/rke2
# cat > /etc/rancher/rke2/config.yaml << EOL
system-default-registry: registry.cn-hangzhou.aliyuncs.com
cni: calico
EOL

# curl -sfL https://rancher-mirror.rancher.cn/rke2/install.sh | INSTALL_RKE2_MIRROR=cn sh -
# systemctl enable rke2-server.service
# systemctl start rke2-server.service
```

## RKE2 的高可用

虽然官网说需要一个固定的注册地址，放在放在 Server 节点的前面，允许其他节点注册到集群。但实际操作，并不需要这样做。

因为，无论是注册的端口 `9345`，还是 api-server 的端口 `6443`。当 RKE2 启动 kubelet 并且必须连接到 Kubernetes api-server 时，它通过 rke2 agent 进程进行连接，该进程充当客户端负载均衡器。

也就是说，RKE2 agent 会自动做一个 HA 的连接，配置如下：
```
# cat /var/lib/rancher/rke2/agent/etc/rke2-agent-load-balancer.json
{
  "ServerURL": "https://172.16.1.134:9345",
  "ServerAddresses": [
    "172.16.0.25:9345",
    "172.16.1.129:9345",
    "172.16.1.134:9345"
  ],
  "Listener": null
}root@rke2-w1:~#
root@rke2-w1:~# cat /var/lib/rancher/rke2/agent/etc/rke2-api-server-agent-load-balancer.json
{
  "ServerURL": "https://172.16.1.134:6443",
  "ServerAddresses": [
    "172.16.0.25:6443",
    "172.16.1.129:6443",
    "172.16.1.134:6443"
  ],
  "Listener": null
```
当有master 节点被移除时，讲会自动从文件中剔除。

## 管理 Server 角色

官网地址：https://docs.rke2.io/zh/install/server_roles

按照官网禁用 etcd 和 control-plane 都没有问题，但对应的节点都有 worker 角色，也就是说都可以创建业务 pod，目前没找到什么好的方法，只能通过污点去禁止调度：

```
# /etc/rancher/rke2/config.yaml
node-taint:
  - "node-role.kubernetes.io/control-plane:NoSchedule"
```

