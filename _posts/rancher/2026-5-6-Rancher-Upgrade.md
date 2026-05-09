---
layout: post
title: Rancher 升级检查清单：企业 Kubernetes 平台升级最佳实践
subtitle: 面向生产环境的 Rancher 与 Kubernetes 升级规划、检查与回滚实践
date: 2026-5-6 11:06:00 +0800
author: Ksd
header-img: img/post-bg-desk.jpg
catalog: true
tags:
  - Rancher
---

在企业 Kubernetes 平台的日常运维中，升级是一个绕不开的话题。无论是为了获取新功能、提升稳定性，还是修复安全问题，Rancher 与 Kubernetes 的版本升级都需要被认真规划与执行。

但在实际操作中，很多问题往往并不是出现在“怎么升级”，而是出在“什么时候升级、先升什么、是否符合版本兼容性”。一旦顺序或策略不当，轻则业务波动，重则可能导致集群不可用甚至数据丢失。

本文整理了一份 **Rancher 升级检查清单（Upgrade Checklist）**，从升级规划、前置准备到升级后验证，帮助你建立一套更安全、可控、可回滚的升级流程。

> **关于版本说明**
>
> 本文中提到的版本号仅为撰写时的示例参考，并非固定要求。
>
> Rancher 和 Kubernetes 均采用语义化版本，版本格式为：`major.minor.patch`，例如：v2.13.x，其中 x 表示补丁版本。

## 二、升级规划

- Rancher [支持矩阵](https://www.suse.com/suse-rancher/support-matrix/all-supported-versions "Rancher 支持矩阵")提供了经过认证且可组合使用的版本完整列表。

- **推荐的升级顺序为：Rancher → Kubernetes → 操作系统**
  - 确保升级过程始终处于支持矩阵规定的版本组合范围内。
  - 对于跨度较大的升级，建议拆分为多个阶段逐步完成，每个阶段完成全部相关组件升级后再继续下一步。
  - 例如：
    - 如果升级后的 Rancher 版本不支持当前管理集群（local 集群）或下游集群的 Kubernetes 版本，则不应直接升级 Rancher。
    - 正确做法是：先将 Kubernetes 升级到一个同时被当前版本和目标 Rancher 版本支持的版本。

- **所有升级操作建议先在测试/预生产环境验证**

- **建议在每一步升级之间预留观察期**
  - 例如：Rancher、 local 集群、下游集群之间可间隔 24 小时
  - 这样可以减少短时间内变更过多带来的风险，并有助于问题排查

- 在 Rancher 升级期间，建议暂停所有依赖 Rancher API 的应用部署

- **每次升级前必须执行快照**，如果没有快照，一旦升级失败将无法回滚，严重情况下可能导致整个集群或环境数据丢失
  - **Rancher：**
    - 每次升级前请按照 [Rancher 文档](https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/backup-restore-and-disaster-recovery/back-up-rancher "Rancher 备份与恢复")中的说明通过 Rancher Backup Operator 执行备份
    - 如果 Rancher 运行在 [RKE](https://rke.docs.rancher.com/etcd-snapshots/one-time-snapshots "RKE 快照")/[RKE2](https://docs.rke2.io/datastore/backup_restore#creating-snapshots "RKE2 快照")/[K3s](https://docs.k3s.io/cli/etcd-snapshot#creating-snapshots "K3s 快照") 集群上，建议根据RKE、RKE2和K3s文档中的说明，按需对 local 集群进行快照。

  - **Kubernetes：** 每次升级前必须执行集群快照，此外，还可以按照上述步骤进行 Rancher 备份（可选）。
    - Rancher local 集群 / 导入集群：参考 RKE/RKE2/K3s 官方文档执行快照
    - Rancher 创建的集群：参考 [Rancher 文档](https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/backup-restore-and-disaster-recovery/back-up-rancher-launched-kubernetes-clusters "Rancher 备份集群")执行快照

## 三、升级要求

### 1. Rancher 升级要求

- **禁止跨 Minor 版本升级**
  - 示例：
    - ❌ v2.11.x → v2.13.x（错误）
    - ✅ v2.11.x → v2.12.x → v2.13.x（正确）

- **建议始终从当前版本的最新 Patch 升级到下一个 Minor 的最新 Patch**
  - 示例：
    - v2.12.2 → v2.13.x 的正确路径：
      - 第一步：v2.12.2 → v2.12.7（当前 Minor 最新）
      - 第二步：v2.12.7 → v2.13.3（目标 Minor 最新）

- **不要升级到预发布版本（Pre-release）**
  - 包括：
    - `-rc`（Release Candidate）
    - `-alpha`

  - 示例：v2.13.0-rc2

- Rancher 每年大约发布 **3 个 Minor 版本**，建议企业定期规划升级

### 2. Kubernetes 升级要求

- 根据 [Kubernetes 版本偏差策略](https://kubernetes.io/releases/version-skew-policy/#supported-version-skew "Kubernetes 版本偏差策略")，**必须逐个 Minor 版本升级**
  - 示例：
    - ❌ v1.31.x → v1.34.x
    - ✅ v1.31.x → v1.32.x → v1.33.x → v1.34.x

- Kubernetes 每年同样大约发布 **3 个 Minor 版本**，因此最好在一年内多次计划 Kubernetes 次要版本升级。

## 四、Rancher 升级前检查

- 确认 Rancher UI 可访问
- 确认所有集群状态为 Active
- 检查关键命名空间 Pod 状态：

  ```bash
  kubectl get pods -n kube-system
  kubectl get pods -n cattle-system
  ```

- 验证数据存储已配置定时快照，并正常运行
  - **RKE：** 如果 Rancher 部署在用 RKE 构建的 Kubernetes 集群上，请验证 etcd 快照是否已启用并运行正常。在 etcd 节点上，你可以使用以下命令进行确认：

    ```bash
    ls -l /opt/rke/etcd-snapshots
    docker logs etcd-rolling-snapshots
    ```

  - **RKE2 / K3s：**
    - 确认已配置并正常执行定时备份（参考 [RKE2](https://docs.rke2.io/datastore/backup_restore "RKE2 备份与恢复") 和 [K3s](https://docs.k3s.io/datastore/backup-restore "K3s 备份与恢复") 官方文档）

- 使用 Rancher Backup Operator 创建一次备份，最好也创建一个 Rancher local 集群的集群快照。

## 五、Rancher 升级步骤

具体升级流程请参考 [Rancher 官方文档](https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/install-upgrade-on-a-kubernetes-cluster/upgrades "Rancher 升级")。

## 六、升级后验证

升级完成后，请执行以下检查：

- Rancher UI 是否可访问，确认能否登录、查看集群、访问工作负载

- UI 中 Rancher 版本是否已更新，版本显示位置位于页面左下角

- 所有集群是否为 Active 状态

- 核心命名空间 Pod 是否正常运行，主要为：`kube-system` 和 `cattle-system`

- 检查所有下游集群中的 pod 是否正在运行，确认 `cattle-cluster-agent` 和 `cattle-node-agent` 是否更新为最新版本

- 使用 Rancher Backup Operator 创建一个新的快照，并可根据上面“升级规划”部分中的备份说明，按需创建 local 集群快照。

## 七、回滚说明

升级之后，如果需要回滚到以前的版本，可参考 [Rancher 官方文档](https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/install-upgrade-on-a-kubernetes-cluster/rollbacks "Rancher 回滚")。

## 八、后续建议（可选）

- **升级 Rancher local 集群**，通常作为 Rancher 升级后的后续步骤，有关升级过程，请参阅[RKE](https://rancher.com/docs/rke/latest/en/upgrades/ "RKE 集群升级")、[RKE2](https://docs.rke2.io/upgrades/upgrade "RKE2 集群升级")和[K3s](https://docs.k3s.io/upgrades "K3s 集群升级") 的升级文档。请注意上文的要求和规划部分。

- **升级下游集群**，更多信息请参阅 [Rancher 文档](https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/upgrade-and-roll-back-kubernetes "Rancher 升级下游集群")，同样遵循本文的规划与要求

- **操作系统/Docker 升级**，可参考操作系统/ Docker 升级指南进行

## 九、总结

Rancher 与 Kubernetes 的升级，从来都不只是一次简单的版本变更，而是一项涉及平台稳定性、业务连续性与数据安全的重要运维工作。

相比“尽快升级”，更重要的是建立一套 **可规划、可验证、可回滚** 的升级流程。只有在充分理解版本兼容关系、严格执行备份策略、合理安排升级顺序的前提下，才能真正降低升级风险，避免因版本不兼容或操作失误导致的业务中断。

对于企业环境而言，建议将升级工作纳入日常运维生命周期管理，而不是等到版本过旧、停止支持或出现安全风险后再被动处理。通过定期升级，不仅可以持续获得 Rancher 与 Kubernetes 社区的新特性与安全修复，也能够让整个容器平台始终保持在一个稳定、受支持的状态。

如果你在 Rancher、RKE2 或 K3s 的升级过程中遇到兼容性、迁移、备份恢复或生产环境变更等问题，也可以联系 Rancher/SUSE 服务团队或社区获取支持与最佳实践建议。
