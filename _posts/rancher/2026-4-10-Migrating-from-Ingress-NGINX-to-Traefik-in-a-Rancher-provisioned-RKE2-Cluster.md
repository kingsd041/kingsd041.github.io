---
layout: post
title: Rancher RKE2 集群从 Ingress NGINX 迁移至 Traefik 实践指南
subtitle: 面向 Rancher RKE2 集群的 Ingress Controller 迁移实践，从 NGINX 平滑切换至 Traefik 的官方路径说明
date: 2026-4-10 11:06:00 +0800
author: Ksd
header-img: img/post-bg-desk.jpg
catalog: true
tags:
  - Rancher
  - Ingress-NGINX
  - Traefik
---

# Rancher RKE2 集群从 Ingress NGINX 迁移至 Traefik 实践指南

## 背景

Ingress NGINX 将在 2026 年 3 月之后停止维护，对于暂时不打算迁移 Ingress Controller 的组织，SUSE 将帮助你稳定现有环境。RKE2 v1.35 将为 SUSE Rancher Prime LTS 客户提供支持直至 2027 年 11 月。这意味着 Ingress NGINX 仍会获得加固基线（hardened baselines）以及持续的 CVE 监控，并附带缓解方案文档。

对于准备迁移的组织，SUSE 提供了迁移到 Traefik 的路径。如果你的配置属于常见模式，可以利用 Traefik 提供的 nginx 兼容机制，在切换过程中尽量减少改动和风险。如果你使用了大量自定义注解或高级特性（例如 TLS 透传、双向 TLS、限流、自定义认证等），SUSE 咨询服务团队可以帮助你评估差异、进行试点验证，并分阶段安全切换。

本文介绍在 Rancher UI 中，将 Rancher 创建的集群迁移到 Traefik 的官方支持方案。

## 重要注意事项

在开始迁移前，请务必评估以下技术要求与限制：

- **注解兼容性**
- Traefik 提供了一个 “shim层” 用于解析 NGINX 注解，但并非完全 1:1 兼容
  - **建议操作：**
    - 查阅 Traefik 官方注解列表，确认不支持的注解
    - 使用 Traefik 提供的扫描工具，自动识别集群中不兼容的注解
  - **支持建议：**
    - 如果你的环境依赖不支持的注解，建议联系咨询服务团队进行评估、试点和分阶段迁移

- **通用限制**
  - Traefik 文档中列出了一些限制，需要提前评估

- **备份**
  - 对 RKE2 集群进行快照
  - 可选：备份所有 Ingress 及相关 Secret 资源

## 前提条件

在执行迁移之前，请确保满足以下要求：

- Rancher 版本 ≥ v2.14.0
- RKE2 版本需运行以下 RKE2 版本之一或更高版本：
  - v1.35.0+rke2r1
  - v1.34.3+rke2r1
  - v1.33.7+rke2r1
  - v1.32.11+rke2r1

## 迁移流程

迁移分为四个阶段：

1. **第一阶段：双 Ingress Controller 设置-** 启用 Traefik 和 Ingress NGINX，使用临时不冲突的端口。
2. **第二阶段：并行迁移与验证-** 复制 Ingress 资源，同时被 Ingress NGINX 和 Traefik 暴露。此阶段用于验证 Traefik 能否在不中断服务的情况下处理现有的 Ingress 资源。
3. **第三阶段：最终切换和端口重新分配-** 一旦 Traefik 测试完成，就可以移除 Ingress NGINX，并将 Traefik 切换到使用标准端口。
4. **第四阶段：清理旧资源-** 删除绑定到 Ingress NGINX 的旧版 Ingress 资源。

## 第一阶段：双 Ingress Controller 设置（共存）

在该阶段，Traefik 将作为第二个 Ingress Controller 部署，并使用临时端口避免冲突。同时默认启用 `kubernetesIngressNginx` provider，用于解析 NGINX 注解。

### 1. 为现有 Ingress 设置 ingressClassName: nginx

确保所有现有 Ingress 明确绑定到 Ingress NGINX，避免部署 Traefik 后出现竞争问题。

**在 Rancher UI 中操作：**

1. 进入目标 RKE2 集群
2. 进入 `Service Discovery` → `Ingresses`
3. 选择 `All Namespaces`
4. 确保所有 `Ingress Class` 为 nginx
5. 若不是，则编辑并修改为 nginx

**自动化方式：**

```bash
kubectl get ingress --all-namespaces -o custom-columns='NAMESPACE:.metadata.namespace,NAME:.metadata.name' --no-headers | while read NS NAME; do
	echo "Patching Ingress: $NS/$NAME"
	kubectl patch ingress "$NAME" -n "$NS" --type=merge -p '{"spec": {"ingressClassName": "nginx"}}'
done
```

### 2. 修改 RKE2 配置

一旦所有 ingress 资源都分配了 `ingressClassName: nginx`，就可以启用 Traefik 作为额外的 ingress Controller。

1. Rancher UI → Cluster Management

2. 编辑目标集群配置

3. 在 Ingress 配置中选择 **Dual Mode**

4. 确保端口不冲突：
   - Ingress NGINX：80 / 443（保持不变）
   - Traefik：8000 / 8443（默认）
     ![](https://raw.githubusercontent.com/kingsd041/picture/main/202604101656099.png)
5. 保存配置

> 注意：
> Dual Mode 下，Traefik 会成为默认 ingress controller（影响 system charts 的 global.systemDefaultIngressClass），可能触发 Helm 升级，但通常不会导致 Pod 重建。建议将其视为一次维护操作。

点击“保存”后，将发生以下情况：

- Traefik 与 Ingress NGINX 同时运行
- Traefik 默认使用 8000 和 8443 端口进行部署，而 Ingress NGINX 使用 80 和 443 端口（或你选择的任何端口）。
- 创建新的 IngressClass：`traefix`
- Traefik 部署时启用了 kubernetesIngressNginx provider，并使用了 `traefix`。此 IngressClass 资源会自动部署。

### 3. 功能验证

- 现有 Ingress NGINX：验证现有 Ingress 是否仍然可以通过标准端口 (80/443) 上的 Ingress NGINX 访问。
- 新的 Traefik Ingress（测试）：部署新的 Ingress 资源，指定 traefik class 来测试 Traefik，使用临时端口（8000/8443）进行访问。
- 验证 Traefik DaemonSet manifest：默认情况下，DaemonSet 包含 hostPort: 8000 和 hostPort: 8443。如果你修改了这些端口，那就根据实际情况验证。
- 新增 IngressClass：新增一个名为 `traefix` 的 IngressClass。
- Traefik 的 IngressNginx provider：验证 IngressNginx provider 是否已启动。在 Traefik 日志中会显示：

```
INF Starting provider *ingressnginx.Provider
```

## 第二阶段：并行迁移与验证

目标：通过处理重复的 Ingress 资源来验证 Traefik 是否能够正确处理流量和 NGINX 注解。

### 1. 复制 并重新分配 Ingress

为每个关键 Ingress 创建副本，仅修改：

对于每个关键的 Ingress 资源（当前使用 ingressClassName: nginx），创建一个清单副本，只做一项更改：将类名设置为 `traefix`。

在 Rancher UI 中执行如下步骤：

1. 进入到目标 RKE2 集群
2. 在左侧菜单中选择 **Service Discovery** 选项卡，然后单击 **Ingresses**。
3. 在页面顶部的下拉筛选器中选择 **All Namespaces**。
4. 每个 ingress 资源都执行：
   1. 点击 **Clone**
   2. 输入一个新的名称，例如在原名称后添加后缀 `-traefik`
   3. 点击 **Ingress Class** 选项卡，然后在 **Ingress Class** 下拉菜单中选择 `traefix`。
   4. 点击 **Create**

### 2. 双路径测试

现在可以通过两条不同的路径（主机端口）访问你的服务：

- Ingress NGINX 访问（原始）：http://<Node IP>；（端口 80/443）
- Traefik 访问：`http://<Node_IP>:8000`；（端口 8000/8443）

测试通过 Traefik 端口（8000/8443）访问的所有服务，确保 Traefik 的兼容层能够正确处理所有 Ingress Nginx 特有的功能（注解）。

### 3.（可选）配置外部负载均衡

如果你使用外部负载均衡器 (LB) 将流量路由到你的 Kubernetes 集群，请使用 Traefik 节点路由 (http://<Node_IP>:8000) 添加 Traefik 作为后端。

请参阅 Traefik 迁移指南，了解基于 DNS 的迁移或使用加权流量的外部负载均衡器策略。请注意，该指南要求两个入口都包含一个具有负载均衡器地址的服务，但本指南假设使用的是节点端口。

> 关于健康检查的说明：入口 NGINX 和 Traefik 处理健康探测的方式不同。请确保您的负载均衡配置已相应更新：
>
> | 控制器       | Ingress NGINX      | Traefik            |
> | ------------ | ------------------ | ------------------ |
> | 默认路径     | /healthz           | /ping              |
> | 默认端口     | 10254 (Management) | 8080（API/仪表盘） |
> | 数据端口同步 | 自动响应           | 默认禁用           |

## 第三阶段：切换和端口重新分配

验证完成后，即可卸载 Ingress NGINX 并将 Traefik 切换到标准端口。请注意，由于 Kubernetes 处理资源和 Webhook 清理的方式，卸载 Ingress NGINX 可能需要一些时间。

如果想减少 ingress 流量中断，可以考虑将此阶段分为两部分：首先卸载 Ingress NGINX，同时保持 Traefik 监听 8000/8443 端口，然后，一旦 Ingress NGINX 被移除，立刻更改 Traefik 端口。

### 1. 卸载 Ingress NGINX

按照启用 **Dual Mode** 的步骤相同，在第一阶段，选择 Traefik 代替：

1. 在 Rancher Manager UI 的左侧栏中，单击 **Cluster Management**。
2. 选择目标 RKE2 集群，单击 **Edit Config**。
3. 滚动到集群配置表单基本信息部分底部的 **Ingress** 选项。
4. 选择 **Traefik**
   ![](https://raw.githubusercontent.com/kingsd041/picture/main/202604101656568.png)
5. 保存。

### 2. 切换 Traefik 到标准端口（可选）

如果你在上一步中没有修改 Traefik 端口（改为 80 和 443），请在确认 Ingress NGINX 已移除后修改端口。

### 3. 最终验证

- 确认 Ingress NGINX DaemonSet 已删除
- 所有服务通过 Traefik 正常访问（80/443）

## 第四阶段：清理

**移除 Ingress NGINX 资源**

删除绑定到 ingressClassName: nginx 的旧版 Ingress 资源。

在 UI 中执行：

1. 访问目标 RKE2 集群
2. 在左侧菜单中选择 **Service Discovery ** 选项卡，然后单击 **Ingresses**。
3. 在页面顶部的下拉筛选器中选择**All Namespaces**。
4. 选择所有 **Ingress Class** 为 nginx 的 Ingress，然后单击 **Delete** 按钮。
   ![](https://raw.githubusercontent.com/kingsd041/picture/main/202604101704700.png)

> **关于独立或导入集群的说明：**
> 本文所描述的迁移流程仅适用于通过 Rancher 创建的 RKE2 集群（即按照 Rancher 官方方式进行集群部署的场景）。
> 对于独立部署或导入到 Rancher 的 RKE2 集群（包括 Rancher 本地集群），请参考 RKE2 官方文档关于[迁移到 Traefik](https://docs.rke2.io/reference/ingress_migration) 的说明。

## 写在最后

从 Ingress NGINX 迁移到 Traefik，并不是一次简单的组件替换，而是一次围绕流量入口、注解语义以及运维方式的整体调整。从实际落地经验来看，**“双控制器并行 + 分阶段验证”** 是最稳妥、风险最低的迁移路径。

通过 Rancher 提供的 Dual Mode 能力，可以在不中断现有业务的前提下，引入 Traefik 并完成兼容性验证，再逐步切换流量与清理旧资源。这种方式特别适合对稳定性要求较高的生产环境。

需要特别注意的是：

- 提前评估 Ingress 注解兼容性，避免切换后出现行为差异
- 尽量对关键业务进行逐个验证，而不是一次性整体切换
- 在迁移过程中结合监控与日志，持续观察流量与错误情况
- 对于复杂场景（如自定义认证、mTLS、限流等），建议进行专项测试甚至灰度发布

整体来看，Traefik 在动态配置、云原生集成以及可观测性方面具备一定优势，但是否迁移、何时迁移，仍应结合自身架构复杂度与运维能力来决策。

如果你的环境仍在使用 Ingress NGINX，也不必过于激进切换——在支持周期内，保持现状并持续评估，也是一个合理选择。

最后，如果在迁移过程中遇到兼容性问题、行为差异或架构设计方面的疑问，建议及时引入专业支持。**SUSE Rancher 咨询服务团队可以协助进行环境评估、方案设计以及分阶段迁移落地，帮助你在保证业务稳定的前提下，顺利完成从 Ingress NGINX 到 Traefik 的演进**。
