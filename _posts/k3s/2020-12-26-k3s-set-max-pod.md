---
layout: post
title: K3s 设置 max-pod
subtitle: --kubelet-arg
date: 2020-12-26 21:06:00 +0800
author: Ksd
header-img: img/post-bg-rancher-k3s.png
catalog: true
tags:
  - rancher
  - K3S
  - Kubernetes
---

## 前言

K8s 单个 node 默认最大可以创建 110 个 pod，这个其实 K8s 的限制，如果你使用 rancher 通过自定义方式创建集群，可以看见主机列表页面上显示默认的最大 pod 数就是 110，K3s 也是一样。

K8s 可以直接修改 kubelet 的`--max-pods`解决，但在 K3s 中，可以通过`--kubelet-arg=max-pods=200` 去指定，参考[K3s 官网。](https://docs.rancher.cn/docs/k3s/installation/install-options/server-config/_index)

## 实践

1. 启动 K3s server 和 agent，将 max-pod 修改为 200

   ```bash
   # curl -sfL https://get.k3s.io | sh -s - --kubelet-arg=max-pods=200  ## hostname:ip-172-31-16-63
   # curl -sfL https://get.k3s.io | INSTALL_K3S_EXEC="--kubelet-arg=max-pods=200"  K3S_URL=https://172.31.16.63:6443 K3S_TOKEN=token sh -  ## hostname:ip-172-31-29-242
   ```

   **K3s systemd 参数：**

   K3s server:

   ```bash
   # cat /etc/systemd/system/k3s.service
   ExecStart=/usr/local/bin/k3s \
   	server \
   	'--kubelet-arg=max-pods=200' \
   ```

   K3s agent:

   ```bash
   # cat /etc/systemd/system/k3s-agent.service
   ExecStart=/usr/local/bin/k3s \
   	agent \
   	'--kubelet-arg=max-pods=200' \
   ```

2. 启动测试 wokload，p

   ```bash
   # cat busybox.yaml
   apiVersion: apps/v1
   kind: Deployment
   metadata:
   name: sz-busybox-deployment
   labels:
   	app: sz-busybox
   spec:
   replicas: 300
   selector:
   	matchLabels:
   	app: sz-busybox
   template:
   	metadata:
   	labels:
   		app: sz-busybox
   	spec:
   	containers:
   	- name: sz-busybox
   		image: busybox
   		args:
   		- sleep
   		- "infinity"
   # kubectl apply -f busybox.yaml
   deployment.apps/sz-busybox-deployment unchanged
   ```

3. 分别查看节点上 Running 状态的 pod 数量

   ```bash
   root@ip-172-31-16-63:~# kubectl get pods -o wide | grep Running | grep 'ip-172-31-16-63' | wc -l
   149
   root@ip-172-31-16-63:~# kubectl get pods -o wide | grep Running | grep 'ip-172-31-29-242' | wc -l
   151
   ```

从以上测试结果看出，两个节点的 pod 数分别是 149 和 151，已经超过了默认的 110.

当然，你也可以通过其他形式在 K3s 中传递`--kubelet-arg`参数，你可以参考[K3s 官网。](https://docs.rancher.cn/docs/k3s/installation/install-options/how-to-flags/_index)
