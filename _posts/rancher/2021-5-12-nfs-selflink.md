---
layout: post
title: K8s v1.20 无法挂载 nfs provisioner
subtitle: selfLink was empty, can't make reference
date: 2021-5-12 21:07:00 +0800
author: Ksd
header-img: img/post-bg-desk.jpg
catalog: true
tags:
  - Rancher
  - NFS
---

如果你的 K8S 集群是 v1.20+，在 nfs provisioner 创建 pvc 时，nfs provisioner 会报错：

```
I0512 03:01:54.863533       1 controller.go:926] provision "default/v1" class "nfs-provisioner": started
E0512 03:01:54.867892       1 controller.go:943] provision "default/v1" class "nfs-provisioner": unexpected error getting claim reference: selfLink was empty, can't make reference
```

这是因为 在 k8s 1.20 中，已根据 [release notes](https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.20.md)删除 selfLink 参数。

要解决这个问题只需要在`kube-api`添加`--feature-gates=RemoveSelfLink=false` 即可，参考：[kubernetes-sigs/nfs-subdir-external-provisioner#25](https://github.com/kubernetes-sigs/nfs-subdir-external-provisioner/issues/25)

如果你使用的是 rancher 集群，可以通过一下方式修改 kube-api 参数：

**1. 编辑集群**
![](https://tva1.sinaimg.cn/large/008i3skNly1gqfgx25dpkj322s0lqq6q.jpg)

**2. Edit as YAML**

![](https://tva1.sinaimg.cn/large/008i3skNly1gqfgxy5q0zj31ym0u0n1l.jpg)

**3. 在 YAML 中修改`kube-api`参数**

```
    kube-api:
      always_pull_images: false
      pod_security_policy: false
      secrets_encryption_config:
        enabled: false
      service_node_port_range: 30000-32767
      extra_args:
        feature-gates: 'RemoveSelfLink=false'
```

![](https://tva1.sinaimg.cn/large/008i3skNly1gqfgzbenu4j31f10u0n3v.jpg)

**4. Save --> Done**

此时，集群将会自动更新

![](https://tva1.sinaimg.cn/large/008i3skNly1gqfh0yur70j31zy0e040y.jpg)

等待集群更新成功后，查看之前创建失败的 pvc 和 pod，此时，pvc 和 pod 应该都创建成功
