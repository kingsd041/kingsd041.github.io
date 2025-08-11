---
layout: post
title: K3s 高可用部署：像搭积木一样轻松
subtitle: 轻松掌握K3s高可用部署，像搭积木一样简单，实现云计算集群的稳定与高效。
date: 2025-8-11 11:08:00 +0800
author: Ksd
header-img: img/post-bg-debug.jpg
catalog: true
tags:
  - K3s
  - 高可用
---

在容器化与云原生的世界里，高可用是保证业务连续性的关键。无论你是想部署生产环境，还是测试环境中验证架构，高可用集群都能提供更强的容错能力与更稳定的运行保障。

本文将带你搭建一个 **最简单、可直接运行的 K3s 高可用集群**，同时配备自动升级功能，让它未来一年几乎零维护。

## 为什么选择 K3s 做 HA？

K3s 是由 Rancher 开发的轻量级 Kubernetes 发行版，相比传统 K8s：

- **安装简单**：单一二进制文件，几分钟即可部署
- **资源占用低**：适合边缘计算、嵌入式和小型数据中心
- **集成度高**：默认集成多种核心组件，减少额外运维工作

在高可用架构下，K3s 同样能提供与标准 K8s 类似的稳定性和可扩展性，同时部署门槛更低，非常适合中小型团队。

## 架构设计：我们的 HA 基础方案

为了保证架构的简单与稳定，我们将构建一个由 4 台节点组成的集群：

| 节点类型         | 数量 | 说明                                                           |
| ---------------- | ---- | -------------------------------------------------------------- |
| 负载均衡器（LB） | 1    | 负责将 API Server 请求分发到多个 Server 节点，可后续扩展到多台 |
| Server 节点      | 3    | 每台节点运行 K3s Server，使用嵌入式 etcd 提供一致性存储        |
| Agent 节点       | 可选 | 本文先不部署，后续可根据业务需求扩展                           |

**特点：**

- 📌 单 IP 入口（通过负载均衡器访问 API Server）
- 📌 内置 etcd 高可用存储（无需额外数据库）
- 📌 自动升级（system-upgrade-controller）

## 部署步骤

### 1️⃣ 准备工作

我使用 `vagrant` 创建了 4 台 **Ubuntu 24.04** 虚拟机，它们处于同一网段（平面网络）。
假设节点信息如下：

| 节点名称 | IP 地址      | 角色       |
| -------- | ------------ | ---------- |
| lb       | 10.10.10.100 | 负载均衡器 |
| server-0 | 10.10.10.50  | Server     |
| server-1 | 10.10.10.51  | Server     |
| server-2 | 10.10.10.52  | Server     |

### 2️⃣ 安装负载均衡器（haproxy）

我们使用 **haproxy** 转发 6443 端口（Kubernetes API Server）。

```bash
sudo apt update
sudo apt install haproxy
```

**配置文件** `/etc/haproxy/haproxy.cfg`：

```bash
frontend k3s
    bind *:6443
    mode tcp
    default_backend k3s

backend k3s
    mode tcp
    option tcp-check
    balance roundrobin
    server server-0 10.10.10.50:6443 check
    server server-1 10.10.10.51:6443 check
    server server-2 10.10.10.52:6443 check
```

**重启服务**：

```bash
sudo systemctl restart haproxy
```

💡 **提示**

- 后续可以使用 keepalived 部署第二台 LB，实现双机热备。
- 如果有防火墙，请确保 6443 端口已开放。

### 3️⃣ 部署第一个 Server 节点

在 `server-0` 上执行：

```bash
curl -sfL https://get.k3s.io | INSTALL_K3S_CHANNEL=v1.31 sh -s - \
--cluster-init --token k3sblog --tls-san 10.10.10.100
```

参数说明：

- `--cluster-init`：初始化集群（第一个 Server 必须有）
- `--token`：节点加入集群的密钥
- `--tls-san`：将负载均衡 IP 加入 API Server 证书

### 4️⃣ 加入其他 Server 节点

在 `server-1` 和 `server-2` 上执行：

```bash
curl -sfL https://get.k3s.io | INSTALL_K3S_CHANNEL=v1.31 sh -s - \
--server https://10.10.10.100:6443 --token k3sblog
```

### 5️⃣ 获取 kubeconfig 文件

现在集群已启动，我们可以从第一台 server 节点获取 kubeconfig：

```bash
scp server-0:/etc/rancher/k3s/k3s.yaml k3s.yaml
```

将 `127.0.0.1` 替换为负载均衡器的 IP，这样就可以在本地主机上通过负载均衡器访问集群：

```bash
sed -i 's/127.0.0.1/10.10.10.100/' k3s.yaml
```

测试集群：

```bash
export KUBECONFIG=$(pwd)/k3s.yaml
kubectl get nodes
```

此时应能看到 **3 台 Server 节点均为 Ready 状态**。

## 自动升级集群

我使用的升级计划会让 K3s 保持在所选版本通道的最新补丁版本。本例中我们使用 v1.31 通道（与安装时一致）。在撰写本文时，Kubernetes v1.31.4 刚刚发布，因此该计划能在接下来 10~12 个月内保持稳定升级（取决于该小版本的补丁数量）。

### 6️⃣ 安装 system-upgrade-controller

升级计划由 system-upgrade-controller 管理，安装方法如下：

```bash
kubectl apply -f https://github.com/rancher/system-upgrade-controller/releases/latest/download/system-upgrade-controller.yaml
kubectl apply -f https://github.com/rancher/system-upgrade-controller/releases/latest/download/crd.yaml
```

### 7️⃣ 创建升级计划

`server-plan.yaml`：

```yaml
apiVersion: upgrade.cattle.io/v1
kind: Plan
metadata:
  name: server-plan
  namespace: system-upgrade
spec:
  concurrency: 1
  cordon: true
  nodeSelector:
    matchExpressions:
      - key: node-role.kubernetes.io/control-plane
        operator: In
        values:
          - "true"
  serviceAccountName: system-upgrade
  upgrade:
    image: rancher/k3s-upgrade
  channel: https://update.k3s.io/v1-release/channels/v1.31
```

应用计划：

```bash
kubectl apply -f server-plan.yaml
```

📌 说明：

- `concurrency: 1` 表示一次只升级一台节点，保证业务不中断
- `channel` 指定升级通道（v1.31），会自动跟进最新补丁版本

## 总结与扩展

![](https://docs.k3s.io/zh/assets/images/kubectl-e58868310be82a01e6ad9e0fbc4a0e32.png)

至此，我们已经拥有一个：

- **高可用 K3s 集群**（3 台 Server + 1 台 LB）
- **单 IP 入口**（方便运维与访问）
- **自动升级机制**（未来一年免维护）

💡 进一步扩展：

- 添加 **Agent 节点** 承载更多工作负载
- 增加第二台 LB 节点，实现更高冗余
- 配置持久化存储（如 Longhorn、NFS）
