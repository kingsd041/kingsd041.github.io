---
layout: post
title: 如何在 Rancher 中修改 Kubernetes 服务的参数
subtitle:
date: 2021-7-8 21:07:00 +0800
author: Ksd
header-img: img/post-bg-desk.jpg
catalog: true
tags:
  - Rancher
  - Kubernetes
---

## 前言

![](https://tva1.sinaimg.cn/large/008i3skNly1gs9n2fd6z3j31fk0sik3u.jpg)

最近，总能在社区里收到关于如何修改 kube-api、kubelet 等参数的问题，针对如何在 Rancher 中修改 Kubernetes 服务参数(kube-apiserver、kube-controller-manager、kubelet、kube-scheduler 、kube-proxy、etcd)，个别同学可能还不是特别熟悉，所以专门写一篇文章给大家介绍如何在 Rancher 中修改自定义集群的 Kubernetes 各个服务的参数。

## 如何在 Rancher 中修改 Kubernetes 服务的参数

Rancher 创建的自定义集群，其实就是通过 RKE 部署 Kubernetes 集群，所以无论是通过 Rancher UI 去创建的自定义集群，还是通过 RKE 去启动的 Kubernetes 集群，都可以参考[cluster.yml 文件示例](http://docs.rancher.cn/docs/rke/example-yamls/_index/)去设置对应的参数。**cluster.yml 文件示例**中内置了一些常用的 Kubernetes 服务配置项，例如 NodePort 端口范围、Service IP CIDR 等，如果要修改这类参数，我们只需要修改参数对应的值即可：

```
kube-api:
  # IP range for any services created on Kubernetes
  # This must match the service_cluster_ip_range in kube-controller
  service_cluster_ip_range: 10.43.0.0/16
  # Expose a different port range for NodePort services
  service_node_port_range: 30000-32767
...
...
```

如果内置的参数选项不包含你要修改的 Kubernetes 服务参数，我们可以在每个 Kubernetes 服务的`extra_args:`下面添加对应的 Kubernetes 参数选项，例如修改 kube-apiserver 的 NodePort 范围和启用 RemoveSelfLink：

```
    kube-api:
      extra_args:
        # extra_args 中的参数优先级高于rke默认的参数优先级，所以"service-node-port-range"会覆盖掉上层的"service_node_port_range"参数的值
        service-node-port-range: 40000-42767
        feature-gates: 'RemoveSelfLink=false'
```

那么，如何在 Rancher 中修改自定义集群的 Kubernetes 服务参数呢，我们可以在 Rancher UI 上选中集群，点击右侧竖起来的 `...`，然后点击`Edit`，进入到编辑集群页面：

![](https://tva1.sinaimg.cn/large/008i3skNly1gsagvsehecj31go0qo783.jpg)

然后，点击`Edit as YAML`：

![](https://tva1.sinaimg.cn/large/008i3skNly1gsagxpeq66j31gc0pwad9.jpg)

接下来，我们就可以在 `rancher_kubernetes_engine_config.services` 中修改各个 Kubernetes 服务的配置参数：

![](https://tva1.sinaimg.cn/large/008i3skNly1gsah16xdu5j30t20xitdb.jpg)

最后，点击`Save`，保存修改的参数配置。如果配置格式正确，Rancher 会自动更新下游 Kubernetes 集群。

## 在 Rancher 中修改 Kubernetes 服务参数的原则

1. 所有的 kubernetes 服务的修改层级都是在 `rancher_kubernetes_engine_config.services` 下，例如：

`kube-apiserver`的参数层级：

```
rancher_kubernetes_engine_config:
  services:
    kube-api: {}
```

`kube-controller-manager`的参数层级：

```
rancher_kubernetes_engine_config:
  services:
    kube-controller: {}
```

2. YAML 中默认的参数名称是通过`-`分隔，而 Kubernetes 服务的参数是使用`_`分隔，例如：

通过 YAML 编辑集群时，默认的参数命名规则：

```
service-node-port-range: 40000-42767
```

Kubernetes 服务 api 的参数的命名规则：

```
service_node_port_range: 30000-32767
```

3. 可以在`extra_args:`中添加额外的 Kubernetes 服务参数，但需要移除每个参数前面的`--`，例如 [kube-apiserver](https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/)中对应的启用`SelfLink`的参数为`--feature-gates=RemoveSelfLink=false`，而在 Rancher YAML 中添加的参数格式应该为：

```
rancher_kubernetes_engine_config:
  services:
    kube-api:
      extra_args:
        feature-gates: 'RemoveSelfLink=false'
```

4. `extra_args` 中的参数优先级高于 RKE 默认的参数优先级，所以 `service-node-port-range` 会覆盖掉上层的 `service_node_port_range` 参数的值。

```
rancher_kubernetes_engine_config:
  services:
    kube-api:
      service_node_port_range: 30000-32767
      extra_args:
        # extra_args 中的参数优先级高于rke默认的参数优先级，所以"service-node-port-range"会覆盖掉上层的"service_node_port_range"参数的值
        service-node-port-range: 40000-42767
```

## 如何确认参数是否生效

参数修改后，如果可以成功保存并更新集群，代表你的参数格式是正确的。那么，如何确认修改的参数已经生效了呢？我们可以登录到对应节点，然后通过 `docker inspect` 查看对应 Kubernetes 服务的`Args`：

```
# docker inspect kube-apiserver
        ···
        "Args": [
        	···
            "--service-node-port-range=40000-42767",
            "--feature-gates=RemoveSelfLink=false",
            ···
        ],
```

## 参考

- RKE 集群参数：http://docs.rancher.cn/docs/rancher2/cluster-provisioning/rke-clusters/options/_index/
- RKE cluster.yml 文件示例：http://docs.rancher.cn/docs/rke/example-yamls/_index/
