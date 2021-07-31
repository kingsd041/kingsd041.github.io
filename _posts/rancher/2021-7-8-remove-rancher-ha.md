---
layout: post
title: 如何卸载 Rancher HA
subtitle:
date: 2021-7-8 21:07:00 +0800
author: Ksd
header-img: img/post-bg-desk.jpg
catalog: true
tags:
  - Rancher
  - HA
---

## 前言

Rancher 从 v2.5 开始，支持将 Rancher HA 安装在任何经过 CNCF 认证的标准 K8s 发行版上，这个集群可以使用上游 Kubernetes，也可以使用 Rancher 的 Kubernetes 发行版之一，也可以是来自 Amazon EKS 等提供商的托管 Kubernetes 集群。无论安装到哪种集群上，Rancher 都推荐使用一个独立的 K8S/K3S 集群作为 Rancher HA 的 Local 集群，这样 Rancher HA 不会和业务集群相互影响。

如果在独立的 Local 集群上卸载 Rancher HA，一般的做法是将 Local 集群删掉，从而达到卸载 Rancher HA 的目的，这样做的好处是比较简单、数据清理的比较彻底。

但有些用户将 Rancher HA 安装到了某些业务或生产集群上，这样的话，就无法通过移除 Local 集群去卸载 Rancher HA。我们需要找到一个办法可以在不影响 Local 集群运行的情况下卸载掉 Rancher HA。

Rancher 提供了一个卸载 Rancher HA 的工具：[system-tools](https://rancher.com/docs/rancher/v2.x/en/system-tools/)。我们可以借助 system-tools 来将 Rancher HA 生成的 namespace 和其他资源移除。执行`remove`命令会移除以下资源：

- Rancher 部署的命名空间，默认名称是`cattle-system`。
- Rancher 通过`cattle.io/creator:norman`标签标记的`serviceAccount`、 `clusterRoles`和`clusterRoleBindings`。使用 Rancher v2.1.0 或更新版本创建的所有及资源都会被打上`cattle.io/creator:norman`的标签。
- Labels、annotations、finalizers。
- Rancher Deployment。
- 集群、项目和用户相关的 CRD。
- `management.cattle.io` API Group 内创建的所有资源。
- 使用 Rancher v2.x 创建的所有 CRD。

但 system-tools 年久失修（最后一次更新于 2019 年 4 月 11 日），针对后续 Rancher 版本新增的一些 namespace 等资源并没有被移除，所以导致我们没有一个方法可以完全在 Local 集群上卸载掉 Rancher HA。

## 卸载 Rancher HA

为了在 Local 集群上彻底卸载掉 Rancher HA，我们可以先筛选出哪些 namesaces 是由 Rancher HA 创建的，然后再通过 `system-tools remove --kubeconfig <$KUBECONFIG> --namespace <NAMESPACE>` 来删除对应的 namespace 和相关资源。经过测试发现，通过 system-tools 移除 namespace 后，namespace 的状态始终为`Terminating`，还需要手动的移除掉`.spec.finalizers`和`.metadata.finalizers`，然后才能彻底的将 namespace 删除。

为此，笔者准备了一个 shell 脚本来完成以上的删除流程：

> 注意：
>
> - 本脚本只基于 Rancher v2.5.8 上进行测试，理论上 v2.5.x 系列版本均支持。其他版本（例如：2.4.x）需要修改步骤 4 中对应的`NS`参数来设置要删除的 namespace
> - 本脚本在 Local 集群为 k3s 和 rke 集群上做过验证，如 Local 集群为其他 K8s 集群，需要确认步骤 4 中对应的`NS`参数来设置要删除的 namespace
> - Rancher HA 会创建`c-`、`p-`、`user-` 开头的 namespace，这些不需要用户关注，当通过`system-tools`移除`cattle-system`会自动将这些 namespace 移除

1. 下载脚本

```
root@ip-172-31-22-79:~# wget https://raw.githubusercontent.com/kingsd041/some_script/master/remove-rancher-ha/remove_r_ha.sh
```

2. 在该主机上安装`kubectl`、`jq`、[system-tools](https://rancher.com/docs/rancher/v2.x/en/system-tools/)，并且创建 `kubeconfig` 文件。
3. 编辑脚本，设置 `KUBE_CONFIG`目录

```
KUBE_CONFIG='/root/.kube/config'
```

4. 编辑脚本，确认`NS`变量设置的 namespace 是否为将要被删除的 namespace，避免误删 namespace。

```
NS="cattle-system|*fleet*|rancher-operator-system|cattle-global-nt|cattle-global-data"
```

5. 执行脚本，卸载 Rancher HA

```
root@ip-172-31-22-79:~# ./remove_r_ha.sh

cattle-system
cattle-global-data
cattle-global-nt
rancher-operator-system
fleet-clusters-system
fleet-local
cluster-fleet-local-local-1a3d67d0a899
fleet-system
fleet-default
cluster-fleet-default-c-9zwzq-dd029f17f988
Are you sure to remove the above namespace? [y/n] y
INFO[0000] Removing Rancher management plane in namespace: [cattle-system]
INFO[0000] Getting connection configuration
INFO[0000] Removing Cattle deployment
INFO[0000] Removed Cattle deployment succuessfully
INFO[0000] Removing ClusterRoleBindings
...
...
```

大约 5 分钟，脚本执行完成。此时，可以通过`kubectl get ns` 来确认 Rancher HA 是否被卸载：

```
root@ip-172-31-22-79:~# kubectl get ns
NAME              STATUS   AGE
kube-public       Active   65m
default           Active   65m
kube-node-lease   Active   65m
kube-system       Active   65m
```

## 后记

虽然 Rancher v2.5 开始可以将 Rancher HA 安装在任何经过 CNCF 认证的 K8s 集群上，但还是建议大家在生产环境上将 Rancher HA 安装在一个独立的 Local 集群上，这样可以避免 Rancher HA 和业务集群相互影响。如果你将 Rancher HA 安装到了业务 K8s 集群上，可以使用本文的方式去完美的卸载 Rancher HA，对原集群不会有任何影响。

## 鸣谢

感谢 **IT 老男孩** 博文：[强制删除 Terminating 状态的 namespace](https://www.xtplayer.cn/Kubernetes/forces-delete-terminated-namespace/#rancher-%E8%87%AA%E5%AE%9A%E4%B9%89-k8s-%E9%9B%86%E7%BE%A4%E6%88%96%E8%80%85%E5%AF%BC%E5%85%A5-rancher-%E7%AE%A1%E7%90%86%E7%9A%84k8s%E9%9B%86%E7%BE%A4)
