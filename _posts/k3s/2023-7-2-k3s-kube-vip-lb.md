---
layout: post
title: 使用 kube-vip 扩展 K3s 的 LoadBalancer
subtitle:
date: 2023-7-2 11:06:00 +0800
author: Ksd
header-img: img/post-bg-desk.jpg
catalog: true
tags:
  - K3s
  - kube-vip
---

在之前的文章中，我们介绍了[如何使用 kube-vip 实现 K3s 控制平面的高可用部署](https://mp.weixin.qq.com/s/rsvAAm78CrbeBsQMTjgNhg)。然而，kube-vip 不仅仅适用于实现 K3s 控制平面的高可用，它还可以使用相同的技术为 LoadBalancer 类型的 Kubernetes 服务资源提供负载均衡功能。在某些情况下，K3s 自带的 ServiceLB 可能无法满足负载均衡的需求，这时我们可以考虑使用 kube-vip 来替代。

在本文中，我们将介绍 K3s 中的 ServiceLB 的作用，并探讨通过使用 kube-vip 来替代 ServiceLB 实现更强大的负载均衡解决方案的好处。最后，我们将详细介绍在 K3s 中使用 kube-vip 的操作步骤。

## 关于 K3s ServiceLB

上游 Kubernetes 允许创建 LoadBalancer 类型的 Service，但不包括默认的负载均衡器实现，因此这些 Service 在安装之前会保持 `pending` 状态。许多托管服务需要 Amazon EC2 或 Microsoft Azure 等云厂商来提供外部负载均衡器实现。相比之下，K3s ServiceLB 可以在没有云厂商或任何额外配置的情况下使用 LoadBalancer Service。

对于每个 LoadBalancer 类型的 Service，在 `kube-system` 命名空间中会创建一个 DaemonSet。这个 DaemonSet 依次在每个节点上创建带有 `svc-` 前缀的 Pod。这些 Pod 使用 iptables 将流量从 Pod 的 NodePort 转发到 Service 的 ClusterIP 地址和端口。

然而，K3s 自带的 ServiceLB 在某些情况下可能会不适合你的环境要求。这时候，我们可以考虑使用 kube-vip 或 MetalLB 等方案代替 ServiceLB。

## 关于 kube-vip 中的 LoadBalancer

kube-vip 中的 LoadBalancer 功能提供了一种简单的方式来将外部流量引入 Kubernetes 集群中。当你创建一个使用 LoadBalancer 类型的 Service 时，kube-vip 会自动为该 Service 分配一个负载均衡 IP 地址，并将流量从该 IP 地址转发到 Service 的后端 Pod 上。

需要注意的是，kube-vip 并不是 Kubernetes 默认的负载均衡实现，它是一个可选的工具，用于在 Kubernetes 集群中实现负载均衡功能。在某些环境中，特别是在没有云服务商提供负载均衡器的情况下，kube-vip 可以作为替代方案，提供基于 IPVS 或 Keepalived 的负载均衡功能。

## 在 K3s 中安装 kube-vip

### 创建 Manifests 文件夹

K3s 有一个可选的 Manifests 目录，K3s 启动时将检查该目录中的 yaml 文件，并自动的在 K3s 中部署，参考：https://docs.k3s.io/installation/packaged-components#auto-deploying-manifests-addons

首先创建此目录，以便稍后将 kube-vip 资源放入其中:

```
mkdir -p /var/lib/rancher/k3s/server/manifests/
```

### 获取 kube-vip RBAC 清单

kube-vip 在 K3s 下作为 DaemonSet 运行，我们需要 RBAC 资源来确保 ServiceAccount 存在并进行绑定，来保它具有与 API 服务器通信所需的权限。

获取 RBAC 清单并将其放置在自动部署目录中：

```
curl https://kube-vip.io/manifests/rbac.yaml > /var/lib/rancher/k3s/server/manifests/kube-vip-rbac.yaml
```

### 生成 kube-vip DaemonSet 清单

```
export VIP=192.168.205.200 # 设置虚拟 IP 用于访问控制平面的地址，如只为了提供 LoadBalancer 功能，可任意设置。
export INTERFACE=ens3 # 设置控制平面所在主机的网卡名称
KVVERSION=$(curl -sL https://api.github.com/repos/kube-vip/kube-vip/releases | jq -r ".[0].name")  # 获取 kube-vip 版本
alias kube-vip="docker run --network host --rm ghcr.io/kube-vip/kube-vip:$KVVERSION" # 针对 docker 环境设置别名

# 创建 kube-vip 清单
kube-vip manifest daemonset \
    --interface $INTERFACE \
    --address $VIP \
    --inCluster \
    --taint \
    --controlplane \
    --services \
    --arp \
    --leaderElection > /var/lib/rancher/k3s/server/manifests/kube-vip.yaml
```

### 安装 K3s，禁用 servicelb

**由于我们需要使用 kube-vip 替换到 servicelb，所以在启动 K3s 时需要通过 `--disable servicelb` 将 K3s 中自带的 servicelb 禁用掉。**

```
curl -sfL https://rancher-mirror.rancher.cn/k3s/k3s-install.sh | INSTALL_K3S_MIRROR=cn \
    K3S_TOKEN=SECRET sh -s - server \
    --cluster-init \
    --system-default-registry "registry.cn-hangzhou.aliyuncs.com" \
    --disable servicelb
```

检查 kube-vip daemonset，我们应该会看到 kube-vip-ds 已经成功启动：

![](https://raw.githubusercontent.com/kingsd041/picture/main/202307031402777.png)

## kube-vip LoadBalancer

当 kube-vip 启动后，将在所有匹配类型为 loadBalancer 的服务上启用一个名为 **watcher** 的监听器。只有在填充了 `metadata.annotations["kube-vip.io/loadbalancerIPs"]` 或 `spec.loadBalancerIP` 的情况下，**watcher** 才会发布一个 Kubernetes service。

下面，我们可以通过创建的简单的 nginx deployment，并且通过一个 LoadBalancer 类型的 service 将服务暴露出来。

```
kubectl apply -f - <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
  labels:
    app: nginx
spec:
  replicas: 1
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: kingsd/nginx:install-tools
        ports:
        - containerPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: nginx
spec:
  type: LoadBalancer
  loadBalancerIP: 192.168.205.202
  selector:
    app: nginx
  ports:
    - port: 80
      targetPort: 80
EOF
```

接下来，可以通过 `kubectl get svc nginx` 获取可以在外部访问的 EXTERNAL-IP：

![](https://raw.githubusercontent.com/kingsd041/picture/main/202307031450219.png)

最后，我们就可以通过 EXTERNAL-IP 来访问我们的示例 nginx：

![](https://raw.githubusercontent.com/kingsd041/picture/main/202307031451820.png)

### 使用 DHCP 获取 LoadBalancer EXTERNAL-IP

kube-vip 支持使用本地网络 DHCP 服务器为 kube-vip 提供负载均衡器地址，该地址可用于访问网络上的 Kubernetes 服务。

为了实现这一点，我们需要通过 `--load-balancer-ip=0.0.0.0` 来告诉 kube-vip 和云提供商不需要他们管理 LoadBalancer 的地址。

```
kubectl apply -f - <<EOF
apiVersion: v1
kind: Service
metadata:
  name: nginx-dhcp
spec:
  type: LoadBalancer
  loadBalancerIP: 0.0.0.0
  selector:
    app: nginx
  ports:
    - port: 80
      targetPort: 80
EOF
```

![](https://raw.githubusercontent.com/kingsd041/picture/main/202307031511636.png)

![](https://raw.githubusercontent.com/kingsd041/picture/main/202307031714959.png)

从上图可以看到，我们已经可以通过 DHCP 获取的地址 **192.168.205.65** 来访问部署的业务。

同时，kube-vip 还支持 **同一个 VIP 上暴露多个服务**、**Kubernetes LoadBalancer class**、**UPnP** 等，篇幅有限，就不一一介绍，大家有兴趣可参考 kube-vip 官网。

## kube-vip Cloud Provider

kube-vip Cloud Provider 可用于为类型为 LoadBalancer 的服务填充 IP 地址，类似于公共云提供商通过 Kubernetes CCM 的方式。同时也支持类似 MetalLB 那样通过 CIDR 或者 IP 范围分配 LoadBalancer 的 IP。

### 安装 kube-vip Cloud Provider

可以使用以下命令从 **main** 分支中的最新版本安装 kube-vip cloud provider：

```
kubectl apply -f https://raw.githubusercontent.com/kube-vip/kube-vip-cloud-provider/main/manifest/kube-vip-cloud-controller.yaml
```

### 创建全局 CIDR 或 IP 范围

要让 kube-vip 为 LoadBalancer 设置 IP 地址，它需要有可用的 IP 地址来分配。这些信息存储在一个 Kubernetes ConfigMap 中，并且允许 kube-vip 可以访问该 ConfigMap。你可以使用 ConfigMap 中的键来控制 IP 分配的范围。可以指定 CIDR 块或 IP 范围，并将其范围限定在全局（集群内）或每个命名空间内。

首先，该 ConfigMap 的名称要求是 `kubevip`，如果要创建全局的 CIDR 块，键的名称必须为 `cidr-global`，例如：

```
kubectl create configmap -n kube-system kubevip --from-literal cidr-global=192.168.205.216/29
```

```
kubectl apply -f - <<EOF
apiVersion: v1
kind: Service
metadata:
  name: nginx-cidr
spec:
  type: LoadBalancer
  selector:
    app: nginx
  ports:
    - port: 80
      targetPort: 80
EOF
```

![](https://raw.githubusercontent.com/kingsd041/picture/main/202307031606289.png)

与 CIDR 块类似，可通过 `range-global` 设置可分配的 IP 地址范围：

```
kubectl create configmap -n kube-system kubevip --from-literal range-global=192.168.205.220-192.168.205.230
```

现在，在任何命名空间中创建类型为 LoadBalancer 的服务将从 ConfigMap 中定义的全局地址池中获取地址。

同时，kube-vip 也支持为单个命名空间来分配 CIDR 块或者 IP 范围，只需要将 `cidr-global` 或 `range-global` 替换为 `cidr-<namespace>` 或 `range-<namespace>` 即可。

## 总结

K3s 中的 ServiceLB 提供了基本的负载均衡功能，但在某些情况下可能无法满足你的需求。这样我们可以通过使用 kube-vip 替代 ServiceLB 来获得更强大的负载均衡解决方案。kube-vip 提供了灵活性、定制化、高可用性以及易于部署和管理的优势。通过遵循简要的操作步骤，你可以在 K3s 集群中轻松安装和配置 kube-vip，以实现更高效的负载均衡。

在使用 kube-vip 之前，请确保了解其功能和配置选项，并在实际环境中进行充分测试和评估。负载均衡是一个关键的组件，对应用程序的性能和可用性有着重要影响。通过选择适合你的需求的负载均衡解决方案，你可以提升 K3s 集群的性能和稳定性，为你的应用程序提供更好的用户体验。

## 参考：

**K3s**：https://k3s.io/
**Kube-vip**: https://kube-vip.io/
