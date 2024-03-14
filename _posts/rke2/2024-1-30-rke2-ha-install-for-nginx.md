---
layout: post
title: RKE2 使用 Nginx/HAProxy 进行高可用部署
subtitle:
date: 2024-1-30 11:07:00 +0800
author: Ksd
header-img: img/post-bg-debug.jpg
catalog: true
tags:
  - RKE2
---

## 目的

本文档的目的是描述使用 Nginx 来实现高可用部署 RKE2 Kubernetes 发行版的步骤。

## 说明

在使用 REK2 构建集群时，特别需要注意的是 RKE2 Server 进程在端口 9345 上侦听新节点注册，而 Kubernetes API 则在端口 6443 上提供服务。因此，为了实现集群中节点的互通，确保整个集群的正常运行，需要开放这两个端口，并将它们正确配置在负载均衡器中。

## 环境信息

| 主机名 | 角色          | IP             |
| ------ | ------------- | -------------- |
| ha-lb  | Load Balancer | 192.168.205.84 |
| ha-m1  | Control-Plane | 192.168.205.85 |
| ha-m2  | Control-Plane | 192.168.205.86 |
| ha-m3  | Control-Plane | 192.168.205.87 |
| ha-w1  | Worker        | 192.168.205.88 |

## 部署架构图

![](https://raw.githubusercontent.com/kingsd041/picture/main/202402021423228.png)

## 安装要求

### 主机要求

可参考官方文档[安装要求](https://docs.rke2.io/zh/install/requirements)章节和[支持矩阵](https://www.suse.com/suse-rke2/support-matrix/all-supported-versions/rke2-v1-29/)。

### 负载均衡器节点

负载均衡器节点需要位于集群的顶部，它将用于将流量路由和负载均衡到适当的节点，用于集群管理的控制平面流量

负载均衡器节点可以是：

- Nginx 反向代理
- HAproxy
- 也可以使用现有的负载均衡器

本例使用单点 Nginx 作为演示实例。

| 类型       | 内存 | CPU | 磁盘   | 网络端口                                         | 最小节点 |
| ---------- | ---- | --- | ------ | ------------------------------------------------ | -------- |
| 负载均衡器 | 4-8  | 4-8 | 100GiB | 6443,9345 至所有 Control-Plane Nodes/Worker Node | 1        |

> 注意：没有 HA 的负载均衡器在集群设置中存在单点故障，生产环境需要通过类似 keepalived 的方案实现 LB 层面的高可用

### RKE2 集群拓扑

生产集群可以使用多种 workload 选项来运行：

1. 对于负载较轻的集群，Control-Plane 可以与 Worker 节点混合在一起使用。
2. 对于高度繁忙的集群，建议卸载 Control-Plane 节点的 Worker 角色，以便 Control-Plane 节点不会受到集群资源的大量使用的影响，Worker 节点只负责处理业务逻辑。

**Control-Plane 节点 (无 Worker 角色)**

| 类型 | 内存 | CPU | 磁盘                   | 网络端口                                         | 最小节点 |
| ---- | ---- | --- | ---------------------- | ------------------------------------------------ | -------- |
| RKE2 | 4    | 4   | 150GiB（建议使用 SSD） | 6443,9345 至所有 Control-Plane Nodes/Worker Node | 1        |

> 如果为 Control-Plane 节点启用了 Worker 角色，还需要根据业务需要增加资源，例如 16GiB RAM、8 个 vCPU 和 250 GiB 存储。

**Worker 节点**

Worker 节点的资源分配取决于实际生产中的也许需求，下面只列出了基本生产环境的配置要求。

| 类型 | 内存 | CPU | 磁盘                   | 网络端口                                                                                                  | 最小节点 |
| ---- | ---- | --- | ---------------------- | --------------------------------------------------------------------------------------------------------- | -------- |
| RKE2 | 16   | 8   | 250GiB（建议使用 SSD） | 所有节点都可以访问 6443/TCP，8472/UDP 用于 CNI，10250/TCP 用于 metrics-server，2379-2380/TCP 用于 ETCD HA | 0        |

### FQDN

如果想通过域名访问 RKE2 集群，需要先准备好 FQDN 和 LB 主机的 IP 地址的映射。

本例已经提前将 rke2.demo.rancher.cn 映射到 LB 所在节点的 IP 地址，`rke2.demo.rancher.cn` --> `192.168.205.84`

## 安装高可用 RKE2 集群

### 安装负载均衡器(Nginx)

1. 安装 Nginx

- RHEL

```
yum install nginx -y
```

- Ubuntu

```
apt install nginx -y
```

2. 配置 Nginx
   将以下 nginx.conf 内容覆盖到 nginx 配置文件中：

nginx.conf

```
load_module /usr/lib/nginx/modules/ngx_stream_module.so;
worker_processes 4;
worker_rlimit_nofile 40000;
error_log /var/log/nginx/error.log;
pid /run/nginx.pid;

# Load dynamic modules. See /usr/share/doc/nginx/README.dynamic.
include /usr/share/nginx/modules/*.conf;

events {
    worker_connections 8192;
}

stream {
    upstream backend {
        least_conn;
        server 192.168.205.85:9345 max_fails=3 fail_timeout=5s;
        server 192.168.205.86:9345 max_fails=3 fail_timeout=5s;
        server 192.168.205.87:9345 max_fails=3 fail_timeout=5s;
   }

   # This server accepts all traffic to port 9345 and passes it to the upstream.
   # Notice that the upstream name and the proxy_pass need to match.
   server {

      listen 9345;

          proxy_pass backend;
   }
    upstream rancher_api {
        least_conn;
        server 192.168.205.85:6443 max_fails=3 fail_timeout=5s;
        server 192.168.205.86:6443 max_fails=3 fail_timeout=5s;
        server 192.168.205.87:6443 max_fails=3 fail_timeout=5s;
    }
        server {
        listen     6443;
        proxy_pass rancher_api;
        }
}
```

其中，192.168.205.85-87 为 Control-Plane 的主机 IP 地址。rke2 server 进程在端口 9345 上侦听新节点注册。Kubernetes API 照常在端口 6443 上提供服务。

1. 重启 nginx 服务

```
systemctl restart nginx
```

### 启动第一个 Server 节点

1. 配置 RKE2 配置文件：

```
root@ha-m1:~# mkdir -p /etc/rancher/rke2/
root@ha-m1:~# cat /etc/rancher/rke2/config.yaml
token: my-shared-secret
tls-san:
  - rke2.demo.rancher.cn
  - 192.168.205.84
```

- token：用于其他 Server 或 Agent 节点在连接集群时注册的 Secret 令牌
- tls-san：这个选项在 Server 的 TLS 证书中增加一个额外的主机名或 IP 作为 Subject Alternative Name。如果你想通过 IP 和主机名访问，你可以将它指定为一个列表。

2. 运行 RKE2 安装程序

```
root@ha-m1:~# curl -sfL https://get.rke2.io | sh -
```

这会将 `rke2-server` 服务和 `rke2` 二进制文件安装到你的主机上。

需要使用 root 用户或通过 sudo 运行，否则会执行失败。

3. 启用 rke2-server 服务

```
root@ha-m1:~# systemctl enable rke2-server.service
```

4. 启动服务

```
root@ha-m1:~# systemctl start rke2-server.service
```

5. 如有需要，可以查看日志

```
root@ha-m1:~# journalctl -u rke2-server -f
```

6. 查看节点运行状态

```
root@ha-m1:~# export KUBECONFIG=/etc/rancher/rke2/rke2.yaml
root@ha-m1:~# /var/lib/rancher/rke2/bin/kubectl get nodes
NAME    STATUS   ROLES                       AGE   VERSION
ha-m1   Ready    control-plane,etcd,master   15m   v1.26.12+rke2r1
```

默认情况下，Server 节点是可调度的，因此你的工作负载可以在 Server 节点上启动。如果你希望拥有一个不会运行用户工作负载的专用 Control-Plane，你可以使用污点（taint）。node-taint 参数允许你配置带有污点的节点。以下是将节点污点添加到配置文件的示例：

```
node-taint:
  - "CriticalAddonsOnly=true:NoExecute"
```

### 启动其他 Server 节点

其他 Server 节点的启动与第一个节点非常相似，只是你必须指定 `server` 和 `token` 参数，以便它们可以成功连接到初始 Server 节点。

1. 配置 RKE2 配置文件：

```
# cat /etc/rancher/rke2/config.yaml
server: https://rke2.demo.rancher.cn:9345
token: my-shared-secret
tls-san:
  - rke2.demo.rancher.cn
  - 192.168.205.84
```

2. 运行 RKE2 安装程序

```
root@ha-m2:~# curl -sfL https://get.rke2.io | sh -
```

3. 启用 rke2-server 服务

```
root@ha-m2:~# systemctl enable rke2-server.service
```

4. 启动服务

```
root@ha-m2:~# systemctl start rke2-server.service
```

5. 如有需要，可以查看日志

```
root@ha-m2:~# journalctl -u rke2-server -f
```

6. 查看节点运行状态

```
root@ha-m2:~# export KUBECONFIG=/etc/rancher/rke2/rke2.yaml
root@ha-m2:~# /var/lib/rancher/rke2/bin/kubectl get nodes
NAME    STATUS   ROLES                       AGE   VERSION
ha-m1   Ready    control-plane,etcd,master   24h   v1.26.12+rke2r1
ha-m2   Ready    control-plane,etcd,master   11m   v1.26.12+rke2r1
```

在保证 Server 节点**总数为奇数**的情况下，可以添加多个 Server 节点，添加节点步骤和配置均与添加第二个 Server 节点的方式相同。

根据文章开头介绍的部署架构图，本文搭建了 3 个 Server 节点：

```
root@ha-m2:~# export KUBECONFIG=/etc/rancher/rke2/rke2.yaml
root@ha-m2:~# /var/lib/rancher/rke2/bin/kubectl get nodes
NAME    STATUS   ROLES                       AGE    VERSION
ha-m1   Ready    control-plane,etcd,master   3h4m   v1.26.12+rke2r1
ha-m2   Ready    control-plane,etcd,master   147m   v1.26.12+rke2r1
ha-m3   Ready    control-plane,etcd,master   167m   v1.26.12+rke2r1
```

### 可选：加入 Agent 节点

> 因为 RKE2 Server 节点具有 Worker 角色，所以集群中即使没有 Worker 节点也可以创建 workload。

在 HA 集群中加入 Agent 节点与在[单个 Server 集群中加入 Agent 节点](https://docs.rke2.io/install/quickstart#linux-agent-worker-node-installation)是一样的。你只需要指定 Agent 应该注册的 URL 和要使用的 Token 即可。

1. 配置 RKE2 Agent 配置文件：

```
root@ha-w1:~# cat /etc/rancher/rke2/config.yaml
server: https://rke2.demo.rancher.cn:9345
token: my-shared-secret
```

2. 运行 RKE2 安装程序

```
root@ha-w1:~# curl -sfL https://get.rke2.io | INSTALL_RKE2_TYPE="agent" sh -
```

3. 启用 rke2-server 服务

```
root@ha-w1:~# systemctl enable rke2-agent.service
```

4. 启动服务

```
root@ha-w1:~# systemctl start rke2-agent.service
```

5. 如有需要，可以查看日志

```
root@ha-w1:~# journalctl -u rke2-agent -f
```

6. 查看节点运行状态

```
root@ha-m1:~# /var/lib/rancher/rke2/bin/kubectl get nodes
NAME    STATUS   ROLES                       AGE    VERSION
ha-m1   Ready    control-plane,etcd,master   25h    v1.26.12+rke2r1
ha-m2   Ready    control-plane,etcd,master   40m    v1.26.12+rke2r1
ha-m3   Ready    control-plane,etcd,master   24m    v1.26.12+rke2r1
ha-w1   Ready    <none>                      106s   v1.26.12+rke2r1
```

## 总结

通过本文档，你已经了解了如何使用 Nginx 搭建高可用的 RKE2 Kubernetes 集群。在这个过程中，你学习了如何配置负载均衡器节点，并通过安装和配置多个 RKE2 Server 节点来实现集群的高可用性。此外，还介绍了如何向集群中添加 Agent 节点以满足业务需求。
