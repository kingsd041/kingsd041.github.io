---
layout: post
title: Harvester 笔记
subtitle:
date: 2024-10-24 11:06:00 +0800
author: Ksd
header-img: img/post-bg-desk.jpg
catalog: true
tags:
  - Harvester
---

## Harvester Shell

以使用 F12 可以从 Harvester 控制台切换到 Shell，然后键入 exit 返回 Harvester 控制台。

## Harvester VIP

1. 如何获取 VIP MAC

```
harvester-1:~ # kubectl get svc -n kube-system ingress-expose -ojsonpath='{.metadata.annotations}'
{"kube-vip.io/hwaddr":"de:6d:6a:77:9f:ff","kube-vip.io/ignore-service-security":"true","kube-vip.io/loadbalancerIPs":"0.0.0.0","kube-vip.io/requestedIP":"10.201.170.140","kube-vip.io/vipHost":"harvester-1"}
```

2. 确认 VIP 被分配到的主机

```
harvester-1:~ # kubectl -n kube-system get svc ingress-expose -o jsonpath='{.metadata.annotations.kube-vip\.io/vipHost}'
harvester-1
```

或者挨个登录到 Harvester node，执行 `ip address show mgmt-br` 确认：

```
harvester-1:~ # ip address show mgmt-br
6: mgmt-br: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default qlen 1000
    link/ether 00:22:19:69:56:53 brd ff:ff:ff:ff:ff:ff
    inet 10.201.170.138/22 brd 10.201.171.255 scope global mgmt-br
       valid_lft forever preferred_lft forever
    inet 10.201.170.140/32 scope global mgmt-br
       valid_lft forever preferred_lft forever
```

## 如果集群只有两个控制平面节点，Harvester 不允许您在任何节点上启用维护模式。您可以使用以下命令手动清空要移除的节点：

```
kubectl drain <node_name> --force --ignore-daemonsets --delete-local-data --pod-selector='app!=csi-attacher,app!=csi-provisioner'
```

## 主机添加磁盘

如果主机上已经挂载磁盘，但在 harvester 上添加磁盘提示：`sorry, no matching options` ，可参考：https://github.com/harvester/harvester/issues/3840#issuecomment-1920122120

## CloudInit

### 密码

默认登录用户的密码：

```
#cloud-config
password: password
chpasswd: { expire: False }
ssh_pwauth: True
```

### 网络

```
# DHCP
# Network Data:
version: 1
config:
  - type: physical
    name: enp1s0
    subnets:
      - type: dhcp
```

```
# 配置静态 ip
# Network Data:
version: 1
config:
  - type: physical
    name: enp1s0
    subnets:
      - type: static
        address: 172.16.1.100/16
        gateway: 172.16.0.1
        dns_nameservers:
          - 114.114.114.114
          - 114.114.115.115
```

```
# 配置阿里云apt源
apt:
  primary:
    - arches: [default]
      uri: http://mirrors.aliyun.com/ubuntu/
```

```
# 配置k3s mirror
write_files:
- content: |
    mirrors:
      "docker.io":
        endpoint:
          - "https://fogjl973.mirror.aliyuncs.com"
          - "https://registry-1.docker.io"
  path: /etc/rancher/k3s/registries.yaml
```

```
# 启动K3S master
runcmd:
    - curl -sfL http://rancher-mirror.cnrancher.com/k3s/k3s-install.sh | K3S_TOKEN=rancher INSTALL_K3S_MIRROR=cn sh -
```

## 设置备份目标

对接 minio，Endpoint 设置为 运行 minio 暴漏的端口，并不是 UI 访问的端口，本例为： 31900

```
docker run -itd    -p 31900:9000    -p 31901:9001    --name minio    -v /opt/minio/data:/data    -e "MINIO_ROOT_USER=admin"    -e "MINIO_ROOT_PASSWORD=xxx"    minio/minio:RELEASE.2023-04-28T18-11-17Z server /data --console-address ":9001"
```





## 疑问：

- 创建 vm 的时候为什么可以选择两个 storageclass ？
- LB 的轮询策略在哪修改
- volume 创建 镜像的 volume 有什么用
- 导出 volume 有什么用？
- 卷快照的恢复，是用快照生成一个新卷，然后重新挂载到 vm ？
- harvester 配置 containerd 代理