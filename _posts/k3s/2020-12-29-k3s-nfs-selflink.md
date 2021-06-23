---
layout: post
title: K3S v1.20 无法挂载 nfs provisioner
subtitle: elfLink was empty, can't make reference
date: 2021-6-17 21:06:00 +0800
author: Ksd
header-img: img/post-bg-desk.jpg
catalog: true
tags:
  - rancher
  - K3S
  - nfs
---

如果你的 K3S 集群是 v1.20+，在 nfs provisioner 创建 PersistentVolumeClaim，PersistentVolumeClaim 保持 `Pending`状态, 且 nfs provisioner 会报错：

```
$ kubectl get pvc
NAME   STATUS    VOLUME   CAPACITY   ACCESS MODES   STORAGECLASS      AGE
d      Pending                                      nfs-provisioner   13s
```

```
I0512 03:01:54.863533       1 controller.go:926] provision "default/v1" class "nfs-provisioner": started
E0512 03:01:54.867892       1 controller.go:943] provision "default/v1" class "nfs-provisioner": unexpected error getting claim reference: selfLink was empty, can't make reference
```

这是因为 在 k8s 1.20 中，已根据 [release notes](https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.20.md)删除 selfLink 参数。

正如 [github 评论](https://github.com/kubernetes-sigs/nfs-subdir-external-provisioner/issues/25#issuecomment-742616668) 中所指出的，将 `RemoveSelfLink` 设置为 `false` 可以解决这个问题。

但是 Rancher K3S 没有 `kube-apiserver.yaml` 文件。但是 `--feature-gates` 可以作为命令行参数直接传递给服务。

#### 对于全新安装的 K3S，可以使用以下命令行：

```
$ curl -sfL https://get.k3s.io | sh -s - --kube-apiserver-arg "feature-gates=RemoveSelfLink=false"
```

#### 对于已存在的 K3s 集群:

**方法 1：** 可以通过参考 K3S 官网[升级](https://rancher.com/docs/k3s/latest/en/upgrades/)章节进行升级，并添加 `--kube-apiserver-arg "feature-gates=RemoveSelfLink=false"` 参数

**方法 2：** 可以通过修改 systemd 配置来更新 K3S 参数：

```
$ cat /etc/systemd/system/k3s.service
...
ExecStart=/usr/local/bin/k3s \
    server \
        '--kube-apiserver-arg' \
        'feature-gates=RemoveSelfLink=false' \
...
```

最后，不要忘记重启 K3s 触发更新。

## 其他

如果你是通过 https://github.com/kubernetes-retired/external-storage 部署的 nfs storageclass，可以通过将镜像替换成`gcr.io/k8s-staging-sig-storage/nfs-subdir-external-provisioner:v4.0.0` 来解决这个问题，这样就不需要修改对应的api参数了。
