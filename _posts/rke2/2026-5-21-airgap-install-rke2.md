---
layout: post
title: 避坑帖！麒麟 V10 离线安装 RKE2：为什么我建议你最高只装到 v1.34？
subtitle:
date: 2026-5-21 11:07:00 +0800
author: Ksd
header-img: img/post-bg-debug.jpg
catalog: true
tags:
  - RKE2
---

随着国产化替代的深入，在 ARM 架构的麒麟操作系统上部署高可用 Kubernetes 集群已成为核心需求。然而，受限于内核版本与 Cgroup 机制的实现差异，RKE2 在麒麟 V10 上的版本选择存在“分水岭”。本文将详细介绍如何在离线环境下，规避高版本 Cgroup V2 兼容性陷阱，成功搭建稳定的 RKE2（v1.34.x）高可用集群。

## 说明

### 环境说明

本例使用 4 个 rke2 节点进行安装，分别 3 个 Server 组建一个 HA 集群，另外一个节点作为 agent 节点。

| HOSTNAME | IP          | ROLE  | OS  |
| -------- | ----------- | ----- | --- |
| Node-1   | 10.3.15.102 | ALL   |     |
| Node-2   | 10.3.15.103 | ALL   |
| Node-3   | 10.3.15.104 | ALL   |
| Node-4   | 10.3.15.105 | agent |

### 关于 CGROUP V2

#### **关于麒麟 V10 环境下 RKE2 版本安装受限的说明**

**现状描述：**
目前在麒麟 V10 操作系统上安装 RKE2 时，**仅能成功部署 v1.34 及以下版本**。尝试安装 RKE2 v1.35、v1.36 及更高版本（均会触发以下报错：
`error: failed to find cpuset cgroup (v2)`

**问题根源：**

- **Cgroup 模式冲突**：高版本 RKE2（基于 K8s v1.35+）强制要求标准的 Cgroup V2 支持。虽然麒麟 V10 可以通过内核参数开启 V2，但其实际运行机制为 **Hybrid（混合）模式**。
- **控制器缺失**：在混合模式下，内核无法向 RKE2 提供标准的 `cpuset` 控制器路径。由于麒麟 V10 内核对 Cgroup V2 的实现并不纯粹，导致 RKE2 无法完成环境自检。

**部署建议：**
针对麒麟 V10 操作系统，请务必将 RKE2 版本锁定在 **v1.34.x**。除非操作系统内核未来发布针对“纯 Cgroup V2”模式的完整补丁，否则不建议强行升级，以规避节点不稳或调度异常的风险。

**其他**

麒麟 V10 的官方内核更新非常缓慢，短期内不会修复这个 cgroup v2 的缺陷。麒麟 V10 SP4（预计 2026 年下半年发布），它将基于 5.10 内核，原生支持完整的 cgroup v2。

## 下载 RKE2 离线介质

找一台可以访问外网的主机下载安装 RKE2 所需的离线介质：

```bash
RKE2_VERSION=v1.34.8+rke2r1
curl -OLs https://github.com/rancher/rke2/releases/download/${RKE2_VERSION}/rke2-images.linux-arm64.tar.zst
curl -OLs https://github.com/rancher/rke2/releases/download/${RKE2_VERSION}/rke2.linux-arm64.tar.gz
curl -OLs https://github.com/rancher/rke2/releases/download/${RKE2_VERSION}/sha256sum-arm64.txt
curl -sfL https://get.rke2.io --output install.sh
```

> 本例采用 v1.34.8+rke2r1 作为示例，如需安装指定版本，可替换 RKE2 的版本号

## 将安装介质分别上传到每台服务器上

> 注意：每一台主机都需要上传上面的这 4 个安装介质，并且每一台都需要将镜像压缩包 `rke2-images.linux-arm64.tar.zst` 上传到 RKE2 镜像目录中：

创建介质存放目录：

```bash
mkdir /root/rke2-artifacts && cd /root/rke2-artifacts/
```

将 `rke2-images.linux-arm64.tar.zst`、`rke2.linux-arm64.tar.gz`、`sha256sum-arm64.txt`、`install.sh` 上传到 `/root/rke2-artifacts/` 目录

将镜像压缩包 `rke2-images.linux-arm64.tar.zst` 上传到 RKE2 镜像目录中：

```bash
mkdir -p /var/lib/rancher/rke2/agent/images/
cp rke2-images.linux-arm64.tar.zst /var/lib/rancher/rke2/agent/images/rke2-images.linux-arm64.tar.zst
```

## 安装 RKE2

### 安装第一个 RKE2 Server 节点

> 在 Node-1 上执行

设置配置文件：

```bash
mkdir -p /etc/rancher/rke2
cat > /etc/rancher/rke2/config.yaml <<EOF
token: my-shared-secret
EOF
```

接下来，使用该目录运行 install.sh，如下例所示：

```bash
INSTALL_RKE2_ARTIFACT_PATH=/root/rke2-artifacts sh install.sh
```

启动 rke2-server 服务

```
systemctl enable rke2-server.service
systemctl start rke2-server.service
```

#### 检查节点 和 pod 运行情况

```bash
# export KUBECONFIG=/etc/rancher/rke2/rke2.yaml
# /var/lib/rancher/rke2/bin/kubectl get nodes
NAME                      STATUS   ROLES                AGE   VERSION
izbp11m90kx835ja1sj11uz   Ready    control-plane,etcd   18m   v1.34.8+rke2r1

# /var/lib/rancher/rke2/bin/kubectl get pods -A
NAMESPACE     NAME                                                   READY   STATUS      RESTARTS   AGE
kube-system   cloud-controller-manager-izbp11m90kx835ja1sj11uz       1/1     Running     0          19m
kube-system   etcd-izbp11m90kx835ja1sj11uz                           1/1     Running     0          19m
kube-system   helm-install-rke2-canal-kdlhr                          0/1     Completed   0          19m
kube-system   helm-install-rke2-coredns-7w9fg                        0/1     Completed   0          19m
kube-system   helm-install-rke2-ingress-nginx-tnq8p                  0/1     Completed   0          19m
kube-system   helm-install-rke2-metrics-server-qq2tf                 0/1     Completed   0          19m
kube-system   helm-install-rke2-runtimeclasses-5wcz7                 0/1     Completed   0          19m
kube-system   helm-install-rke2-snapshot-controller-bjtl6            0/1     Completed   2          19m
kube-system   helm-install-rke2-snapshot-controller-crd-4np5w        0/1     Completed   0          19m
kube-system   kube-apiserver-izbp11m90kx835ja1sj11uz                 1/1     Running     0          19m
kube-system   kube-controller-manager-izbp11m90kx835ja1sj11uz        1/1     Running     0          19m
kube-system   kube-proxy-izbp11m90kx835ja1sj11uz                     1/1     Running     0          19m
kube-system   kube-scheduler-izbp11m90kx835ja1sj11uz                 1/1     Running     0          19m
kube-system   rke2-canal-b7cvr                                       2/2     Running     0          18m
kube-system   rke2-coredns-rke2-coredns-7fdc65c8b4-djwgf             1/1     Running     0          18m
kube-system   rke2-coredns-rke2-coredns-autoscaler-7498fbdb6-s86hz   1/1     Running     0          18m
kube-system   rke2-ingress-nginx-controller-lg5qk                    1/1     Running     0          18m
kube-system   rke2-metrics-server-566684c4cd-lzbfq                   1/1     Running     0          18m
kube-system   rke2-snapshot-controller-77b9dc856d-htdhh              1/1     Running     0          17m
```

### 添加其他 RKE2 Server 节点：

> 分别在 Node-1/Node-2 上执行相同的操作

设置配置文件：

```bash
mkdir -p /etc/rancher/rke2
cat > /etc/rancher/rke2/config.yaml <<EOF
server: https://10.3.15.102:9345  # 指定第一个 RKE2 Server 节点的 IP
token: my-shared-secret
EOF
```

接下来，使用该目录运行 install.sh，如下例所示：

```bash
INSTALL_RKE2_ARTIFACT_PATH=/root/rke2-artifacts sh install.sh
```

启动 rke2-server 服务

```
systemctl enable rke2-server.service
systemctl start rke2-server.service
```

### 添加 RKE2 Agent 节点

设置配置文件：

```bash
mkdir -p /etc/rancher/rke2
cat > /etc/rancher/rke2/config.yaml <<EOF
server: https://10.3.15.102:9345  # 指定第一个 RKE2 Server 节点的 IP
token: my-shared-secret
EOF
```

接下来，使用该目录运行 install.sh，如下例所示：

```bash
INSTALL_RKE2_ARTIFACT_PATH=/root/rke2-artifacts INSTALL_RKE2_TYPE="agent" sh install.sh
```

启动 rke2-server 服务

```
systemctl enable rke2-agent.service
systemctl start rke2-agent.service
```

## 检查集群运行情况

```BASH
# /var/lib/rancher/rke2/bin/kubectl get nodes
NAME                      STATUS   ROLES                AGE     VERSION
izbp11m90kx835ja1sj11uz   Ready    control-plane,etcd   42m     v1.34.8+rke2r1
izbp1ar9ykmepwc42p84zbz   Ready    control-plane,etcd   7m58s   v1.34.8+rke2r1
izbp1ar9ykmepwc42p84zcz   Ready    control-plane,etcd   4m8s    v1.34.8+rke2r1
izbp1ar9ykmepwc42p84zdz   Ready    <none>               2m35s   v1.34.8+rke2r1

# /var/lib/rancher/rke2/bin/kubectl get pods -A
NAMESPACE     NAME                                                   READY   STATUS      RESTARTS   AGE
kube-system   cloud-controller-manager-izbp11m90kx835ja1sj11uz       1/1     Running     0          42m
kube-system   cloud-controller-manager-izbp1ar9ykmepwc42p84zbz       1/1     Running     0          7m13s
kube-system   cloud-controller-manager-izbp1ar9ykmepwc42p84zcz       1/1     Running     0          3m30s
kube-system   etcd-izbp11m90kx835ja1sj11uz                           1/1     Running     0          42m
kube-system   etcd-izbp1ar9ykmepwc42p84zbz                           1/1     Running     0          7m13s
kube-system   etcd-izbp1ar9ykmepwc42p84zcz                           1/1     Running     0          3m30s
kube-system   helm-install-rke2-canal-kdlhr                          0/1     Completed   0          42m
kube-system   helm-install-rke2-coredns-7w9fg                        0/1     Completed   0          42m
kube-system   helm-install-rke2-ingress-nginx-tnq8p                  0/1     Completed   0          42m
kube-system   helm-install-rke2-metrics-server-qq2tf                 0/1     Completed   0          42m
kube-system   helm-install-rke2-runtimeclasses-5wcz7                 0/1     Completed   0          42m
kube-system   helm-install-rke2-snapshot-controller-bjtl6            0/1     Completed   2          42m
kube-system   helm-install-rke2-snapshot-controller-crd-4np5w        0/1     Completed   0          42m
kube-system   kube-apiserver-izbp11m90kx835ja1sj11uz                 1/1     Running     0          42m
kube-system   kube-apiserver-izbp1ar9ykmepwc42p84zbz                 1/1     Running     0          7m13s
kube-system   kube-apiserver-izbp1ar9ykmepwc42p84zcz                 1/1     Running     0          3m30s
kube-system   kube-controller-manager-izbp11m90kx835ja1sj11uz        1/1     Running     0          42m
kube-system   kube-controller-manager-izbp1ar9ykmepwc42p84zbz        1/1     Running     0          7m13s
kube-system   kube-controller-manager-izbp1ar9ykmepwc42p84zcz        1/1     Running     0          3m30s
kube-system   kube-proxy-izbp11m90kx835ja1sj11uz                     1/1     Running     0          42m
kube-system   kube-proxy-izbp1ar9ykmepwc42p84zbz                     1/1     Running     0          7m13s
kube-system   kube-proxy-izbp1ar9ykmepwc42p84zcz                     1/1     Running     0          3m30s
kube-system   kube-proxy-izbp1ar9ykmepwc42p84zdz                     1/1     Running     0          2m42s
kube-system   kube-scheduler-izbp11m90kx835ja1sj11uz                 1/1     Running     0          42m
kube-system   kube-scheduler-izbp1ar9ykmepwc42p84zbz                 1/1     Running     0          7m13s
kube-system   kube-scheduler-izbp1ar9ykmepwc42p84zcz                 1/1     Running     0          3m30s
kube-system   rke2-canal-4kwzc                                       2/2     Running     0          2m42s
kube-system   rke2-canal-b7cvr                                       2/2     Running     0          42m
kube-system   rke2-canal-gds8b                                       2/2     Running     0          4m14s
kube-system   rke2-canal-jcz7l                                       2/2     Running     0          8m5s
kube-system   rke2-coredns-rke2-coredns-7fdc65c8b4-djwgf             1/1     Running     0          41m
kube-system   rke2-coredns-rke2-coredns-7fdc65c8b4-pd49s             1/1     Running     0          6m57s
kube-system   rke2-coredns-rke2-coredns-autoscaler-7498fbdb6-s86hz   1/1     Running     0          41m
kube-system   rke2-ingress-nginx-controller-lg5qk                    1/1     Running     0          41m
kube-system   rke2-ingress-nginx-controller-pxzb2                    1/1     Running     0          7m2s
kube-system   rke2-ingress-nginx-controller-vtwfp                    1/1     Running     0          3m12s
kube-system   rke2-ingress-nginx-controller-w2ndx                    1/1     Running     0          101s
kube-system   rke2-metrics-server-566684c4cd-lzbfq                   1/1     Running     0          41m
kube-system   rke2-snapshot-controller-77b9dc856d-htdhh              1/1     Running     0          41m
```

## 写在最后

在国产化环境（ARM64 + 麒麟 V10）的适配过程中，内核特性的差异是绕不开的坎。由于麒麟 V10 现阶段对 Cgroup V2 的支持尚处于“混合过渡期”，坚持使用 v1.34.x 版本是目前兼顾功能与稳定性的最优解。我们将持续关注麒麟内核的更新动态，期待在后续 SP4 版本中能通过原生的 Cgroup V2 支持解锁更高版本的 RKE2。
