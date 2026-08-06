---
layout: post
title: RKE2 与 K3s 集群证书续期与轮换实战指南
subtitle: 介绍证书到期监控、自动续期、手动轮换以及 Rancher 管理集群的证书操作方法
date: 2026-8-3 11:07:00 +0800
author: Ksd
header-img: img/post-bg-desk.jpg
catalog: true
tags:
  - Rancher
  - RKE2
  - K3s
  - Certificate
---

在 RKE2 和 K3s 集群中，证书是 Kubernetes 控制平面与节点之间建立信任关系的基础。证书一旦过期，节点之间的身份认证就会失效，进而导致 kubelet、Kubernetes API Server、控制平面组件之间的通信异常，最终表现为集群不稳定甚至服务中断。

因此，证书的监控、续期与轮换是 Kubernetes 集群日常运维工作中不可忽视的一部分。本文整理了 RKE2 与 K3s 集群在以下场景下的常用操作方法：

- 监控证书到期时间
- 自动续期与手动续期
- 证书轮换（rotation）
- Rancher 管理下集群与独立集群的差异处理
- CA 证书轮换（仅限独立集群）

## 证书的有效期与自动续期机制

根据 RKE2 与 K3s 官方文档说明，客户端与服务端证书的有效期通常为 365 天。只要证书没有过期，并且距离过期时间还剩 120 天以内，RKE2 或 K3s 在启动时就会自动尝试续期。

这类续期会复用现有的私钥（key），只是延长证书的有效期，而不会重新生成新的证书和密钥。若你需要生成新的证书和密钥，而不是仅仅延长旧证书有效期，就需要执行证书轮换（rotation）。

> 注意：
>
> 在 2025 年 5 月之前的版本中，告警和续期触发时间是 90 天，而不是 120 天。

## 1. 监控证书到期时间

### 手动检查证书过期时间

可以通过以下命令直接查看节点证书及其到期时间：

- RKE2：

```bash
rke2 certificate check --output table
```

- K3s：

```bash
k3s certificate check --output table
```

以上命令可参考官方文档 [RKE2 证书检查文档](https://docs.rke2.io/security/certificates#checking-expiration-dates "RKE2 证书检查文档") 和 [K3s 证书检查文档](https://docs.k3s.io/cli/certificate#client-and-server-certificates "K3s 证书检查文档")。

### 旧版本需要手动检查 kube-scheduler 与 kube-controller-manager 证书

在 2025 年 5 月之前的版本中，针对 Rancher 管理的集群，`kube-scheduler` 与 `kube-controller-manager` 相关证书并不会出现在 `certificate check` 的输出中。对于这些较老版本，可以手动使用 `openssl` 进行检查。

RKE2 版本：

```bash
openssl x509 -enddate -noout -in /var/lib/rancher/rke2/server/tls/kube-scheduler/kube-scheduler.crt
openssl x509 -enddate -noout -in /var/lib/rancher/rke2/server/tls/kube-controller-manager/kube-controller-manager.crt
```

K3s 版本：

```bash
openssl x509 -enddate -noout -in /var/lib/rancher/k3s/server/tls/kube-scheduler/kube-scheduler.crt
openssl x509 -enddate -noout -in /var/lib/rancher/k3s/server/tls/kube-controller-manager/kube-controller-manager.crt
```

### 自动监控证书到期

当某个证书距离过期时间不足 120 天时，Kubernetes 会创建一个 Warning Event，事件的 `reason` 为：`CertificateExpirationWarning`

该事件会关联到使用该证书的节点。你可以基于这些 Event 来构建自动化监控告警机制。

除了使用 Kubernetes Event 之外，也可以采用 Prometheus + Alertmanager 的方式，例如 `rancher-monitoring` 中常见的 [`x509-certificate-exporter`](https://github.com/enix/x509-certificate-exporter "x509-certificate-exporter") 方案，用于更主动地跟踪证书到期时间并发出告警。

## 2. 证书续期流程

如果某个证书已经过期，或者距离过期时间不足 120 天，那么只要复用现有的 key，就可以通过重启 RKE2 或 K3s 的 supervisor 进程来完成证书续期。

### 可以执行的重启命令

- RKE2：

```bash
systemctl restart rke2-server
systemctl restart rke2-agent
```

- K3s：

```bash
systemctl restart k3s
systemctl restart k3s-agent
```

### 说明

重启 supervisor 进程后，系统会自动根据当前证书状态进行续期或重新生成到期时间更接近的证书。

### 旧版本的特殊注意事项

如果集群版本较老，特别是 2025 年 5 月之前的版本，Rancher 管理的集群中 `kube-scheduler` 和 `kube-controller-manager` 证书并不由 RKE2 或 K3s 的 supervisor 进程托管，因此仅重启 supervisor 进程不会更新这两个证书。

对于这类旧版本，有两个可行方案：

1. 通过 Rancher UI 执行证书轮换
2. 手动删除旧证书和 key 文件，然后重新启动 supervisor 进程

例如：

RKE2：

```bash
rm /var/lib/rancher/rke2/server/tls/kube-controller-manager/kube-controller-manager.{crt,key} \
   /var/lib/rancher/rke2/server/tls/kube-scheduler/kube-scheduler.{crt,key}
```

K3s：

```bash
rm /var/lib/rancher/k3s/server/tls/kube-controller-manager/kube-controller-manager.{crt,key} \
   /var/lib/rancher/k3s/server/tls/kube-scheduler/kube-scheduler.{crt,key}
```

## 3. 证书轮换流程

如果你希望重新生成新的证书和私钥，而不是像续期那样只延长现有证书的有效期，那么需要进行证书轮换。

RKE2 和 K3s 的证书轮换适用于两种场景：

- 独立集群
- Rancher 管理下的下游集群

### 独立集群的轮换步骤

对于独立部署的 RKE2 或 K3s 集群，可以参考 [RKE2 证书轮换文档](https://docs.rke2.io/security/certificates#rotating-client-and-server-certificates-manually "RKE2 证书轮换文档") 与 [K3s 证书轮换文档](https://docs.k3s.io/cli/certificate#rotating-client-and-server-certificates "K3s 证书轮换文档") 中的 `certificate rotate` 子命令。

通常流程如下：

1. 停止 RKE2 或 K3s 的 supervisor 进程：

```bash
systemctl stop rke2-server
systemctl stop rke2-agent
# 或
systemctl stop k3s
systemctl stop k3s-agent
```

2. 执行证书轮换：

```bash
rke2 certificate rotate
# 或
k3s certificate rotate
```

3. 启动 supervisor 进程：

```bash
systemctl start rke2-server
systemctl start rke2-agent
# 或
systemctl start k3s
systemctl start k3s-agent
```

根据 RKE2 证书轮换说明与 K3s 证书轮换说明所述，你也可以使用 `--service` 参数只轮换指定服务的证书，而不需要对所有服务一并处理。

### Rancher 管理下集群的轮换步骤

对于 Rancher 创建或托管的 RKE2/K3s 集群，可以直接在 Rancher UI 中执行证书轮换。操作路径可参考 [Rancher 证书轮换文档](https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/manage-clusters/rotate-certificates#certificate-rotation "Rancher 证书轮换文档")。

操作步骤如下：

1. 在左上角点击 `☰ > Cluster Management`
2. 在 `Clusters` 页面中，找到目标集群并点击 `⋮ > Rotate Certificates`
3. 选择以下选项之一：
   - `Rotate all Service certificates`（推荐）
   - 或者单独选择某个服务
4. 点击 `Save`

Rancher 会自动协调并在集群节点之间完成证书轮换。

## 4. CA 证书轮换（仅限独立集群）

默认情况下，RKE2 和 K3s 在首个 server 节点启动时会自动生成自签名 CA 证书。这样的 CA 证书默认有效期为 10 年，并不会自动续期。

### 重要说明

如果集群是独立部署的，并且使用的是默认自签名 CA 证书，那么 CA 证书轮换会产生一定的中断性影响。相关操作可参考 [RKE2 CA 证书轮换文档](https://docs.rke2.io/security/certificates#rotating-ca-certificates "RKE2 CA 证书轮换文档") 与 [K3s CA 证书文档](https://docs.k3s.io/cli/certificate#certificate-authority-ca-certificates "K3s CA 证书文档")。

尤其是在以下情况下会更明显：

- 新的 CA 证书与旧 CA 证书没有交叉签名
- 使用自定义 CA 证书时，根 CA 被替换
- 所有节点都需要重新配置为使用新的 secure cluster token
- 相关 Pod 需要重启

因此，CA 证书轮换通常需要额外规划，并且对生产环境风险更高。

## 5. 结论

RKE2 和 K3s 集群的证书管理可以总结为以下几点：

1. 证书默认有效期 365 天
2. 当证书距离到期不足 120 天时，会自动触发续期与告警机制
3. 如果仅需延长有效期，可以通过重启 supervisor 进程完成续期
4. 如果需要重新生成证书与私钥，则应执行证书轮换
5. Rancher 管理的集群推荐通过 Rancher UI 进行证书轮换
6. CA 证书轮换属于更高风险操作，尤其适用于独立集群，实施前必须谨慎评估

对于生产环境的 Kubernetes 集群运维来说，建立一套证书到期告警与定期轮换机制，是确保集群长期稳定运行的关键实践之一。
