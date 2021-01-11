---
layout: post
title: 通过RKE纳管Rancher 自定义集群
subtitle:
date: 2021-1-10 21:06:00 +0800
author: Ksd
header-img: img/post-bg-keybord.jpg
catalog: true
tags:
  - rancher
  - Kubernetes
  - rke
---

## 前言

使用 Rancher 过程中，也许会因为各种各样的原因导致 Rancher Server 无法继续管理通过 Rancher Server 创建的自定义集群，比如误删 Rancher Server 或备份数据无法恢复等。一般遇到这类问题可以重新启动一个 Rancher Server 并将下游业务集群导入并纳管，但这样会带来一些遗留问题，比如无法继续扩展业务集群的节点。

众所周知，Rancher Server 通过 UI 创建的"自定义"集群，后端也是通过 RKE 实现的，所以 RKE(https://docs.rancher.cn/rke/)有能力去纳管Rancher Server 创建的“自定义”集群。RKE 创建和管理 Kubernetes 集群，依赖 3 个文件：

- cluster.yml：RKE 集群配置文件
- kube_config_cluster.yml：该文件包含了获取该集群所有权限的认证凭据
- cluster.rkestate：Kubernetes 集群状态文件，包含了获取该集群所有权限的认证凭据

所以，只要能从下游业务集群中够获得这 3 个文件，就可以结合 RKE 二进制文件继续管理下游业务集群。下面将详细的介绍如何通过 RKE 纳管 Rancher Server 创建的“自定义”集群，并通过RKE扩展集群的节点。

## 演示环境

> 本文只针对 Rancher v2.4.x 和 v2.5.x 版本做了测试，其他版本可能不适用.

为了更好的演示效果，本文将从 Rancher Server 创建“自定义”集群开始，然后通过 RKE 纳管"自定义"集群，最后为了确认 RKE 有能力纳管集群，将演示通过 RKE 添加一个节点。

Rancher Server（`ip-172-31-2-203`）可以采用最简单的`docker run`方式启动，并通过 UI 创建一个"自定义"集群，集群中包括两个节点：`ip-172-31-2-203`和`ip-172-31-1-111`, 详细如下：

| 主机名          | IP           | 角色                     |
| --------------- | ------------ | ------------------------ |
| ip-172-31-8-56  | 172.31.8.56  | Rancher Server           |
| ip-172-31-2-203 | 172.31.2.203 | controlplane,etcd,worker |
| ip-172-31-1-111 | 172.31.1.111 | worker                   |

```
# kubectl get nodes
NAME              STATUS   ROLES                      AGE     VERSION
ip-172-31-1-111   Ready    worker                     2m2s    v1.18.14
ip-172-31-2-203   Ready    controlplane,etcd,worker   3m23s   v1.18.14
```

## RKE 纳管"自定义"集群

1. 将`ip-172-31-8-56` 关机，模拟 Rancher Server 故障，此时无法通过 Rancher Server 继续管理下游集群

2. 恢复下游业务集群的`kube_config_cluster.yml`文件，在`controlplane`节点上运行以下命令：

```
# docker run --rm --net=host \
  -v $(docker inspect kubelet --format '{{ range .Mounts }}{{ if eq .Destination "/etc/kubernetes" }}{{ .Source }}{{ end }}{{ end }}')/ssl:/etc/kubernetes/ssl:ro \
  --entrypoint bash $(docker inspect $(docker images -q --filter=label=io.cattle.agent=true) \
  --format='{{index .RepoTags 0}}' | tail -1) \
  -c 'kubectl --kubeconfig /etc/kubernetes/ssl/kubecfg-kube-node.yaml get configmap \
  -n kube-system full-cluster-state \
  -o json | jq -r .data.\"full-cluster-state\" | jq \
  -r .currentState.certificatesBundle.\"kube-admin\".config | sed \
  -e "/^[[:space:]]*server:/ s_:.*_: \"https://127.0.0.1:6443\"_"' \
  > kubeconfig_admin.yaml
```
> 可能因为博客对`{}` 有特殊处理，如果以上命令执行失败，可以从 https://gist.github.com/kingsd041/b52edaca81097ddeaf0c60701f6232ce 获得。

成功导出`kubeconfig_admin.yaml`之后，就可以使用 kubectl 继续操作下游业务集群：

```
# kubectl --kubeconfig kubeconfig_admin.yaml get nodes
NAME              STATUS   ROLES                      AGE   VERSION
ip-172-31-1-111   Ready    worker                     32m   v1.18.14
ip-172-31-2-203   Ready    controlplane,etcd,worker   34m   v1.18.14
```

3. 恢复下游业务集群的`cluster.rkestate`文件，在`controlplane`节点上运行以下命令：

```
# docker run --rm --net=host \
    -v $(docker inspect kubelet \
    --format '{{ range .Mounts }}{{ if eq .Destination "/etc/kubernetes" }}{{ .Source }}{{ end }}{{ end }}')/ssl:/etc/kubernetes/ssl:ro \
    --entrypoint bash $(docker inspect $(docker images -q --filter=label=org.label-schema.vcs-url=https://github.com/rancher/hyperkube.git) \
    --format='{{index .RepoTags 0}}' | tail -1) \
    -c 'kubectl --kubeconfig /etc/kubernetes/ssl/kubecfg-kube-node.yaml \
    -n kube-system get configmap full-cluster-state \
    -o json | jq -r .data.\"full-cluster-state\" | jq -r .' \
    > cluster.rkestate
```

> 可能因为博客对`{}` 有特殊处理，如果以上命令执行失败，可以从 https://gist.github.com/kingsd041/e6c6d93e77d705eae8eb144128bc5c5e 获得。

4. 恢复下游业务集群的`cluster.yml`文件

目前我没找到好方法可以自动恢复该文件，但可以基于已经恢复的`cluster.rkestate`来手动恢复`cluster.yml`文件，因为`cluster.yml`需要的配置基本都可以从`cluster.rkestate`获得。

从`cluster.rkestate`中获得集群节点的配置信息：

```
# cat cluster.rkestate | jq -r .desiredState.rkeConfig.nodes
[
  {
    "nodeName": "c-kfbjs:m-d3e75ad7a0ea",
    "address": "172.31.2.203",
    "port": "22",
    "internalAddress": "172.31.2.203",
    "role": [
      "etcd",
      "controlplane",
      "worker"
    ],
    "hostnameOverride": "ip-172-31-2-203",
    "user": "root",
    "sshKeyPath": "~/.ssh/id_rsa"
  }
]
```

根据 `cluster.rkestate`提供的节点信息，手动编写 `cluster.yml`

```
# cat cluster.yml
nodes:
  - address: 172.31.2.203
    hostname_override: ip-172-31-2-203
    user: ubuntu
    role:
      - controlplane
      - etcd
      - worker
  - address: 172.31.1.111
    hostname_override: ip-172-31-1-111
    user: ubuntu
    role:
      - worker
  - address: 172.31.5.186
    hostname_override: ip-172-31-5-186
    user: ubuntu
    role:
      - worker
kubernetes_version: v1.18.14-rancher1-1
```

> **以上手动编写的 cluster.yml 有几个地方需要注意：**
>
> - 只能从`cluster.rkestate`文件中获得`controlplane(ip-172-31-2-203)`节点的信息，因为本例集群中还有一个`worker(p-172-31-1-111)`节点，所以需要将`worker(p-172-31-1-111)`节点的信息手动补充完整。
> - `cluster.yaml`中的`ip-172-31-5-186`是新增的`worker`节点，用于下一步演示 RKE 新增节点。
> - 从`cluster.rkestate`获得的节点信息是`root`用户，需要根据实际需求，修改成 RKE 执行的用户，本例为`ubuntu`用户。
> - 一定要指定原始集群的`kubernetes_version`参数，否则会将集群升级到 RKE 默认的最新版 Kubernetes。

除了以上方式，还可以通过下面的脚本恢复`cluster.yml`。同样，你需要修改以上几点提到的地方。使用这种方法的好处是可以更完整的恢复`cluster.yml`文件，篇幅有限，就不做过多演示：

```bash
#!/bin/bash
echo "Building cluster.yml..."
echo "Working on Nodes..."
echo 'nodes:' > cluster.yml
cat cluster.rkestate | grep -v nodeName | jq -r .desiredState.rkeConfig.nodes | yq r - | sed 's/^/  /' | \
sed -e 's/internalAddress/internal_address/g' | \
sed -e 's/hostnameOverride/hostname_override/g' | \
sed -e 's/sshKeyPath/ssh_key_path/g' >> cluster.yml
echo "" >> cluster.yml

echo "Working on services..."
echo 'services:' >> cluster.yml
cat cluster.rkestate  | jq -r .desiredState.rkeConfig.services | yq r - | sed 's/^/  /' >> cluster.yml
echo "" >> cluster.yml

echo "Working on network..."
echo 'network:' >> cluster.yml
cat cluster.rkestate  | jq -r .desiredState.rkeConfig.network | yq r - | sed 's/^/  /' >> cluster.yml
echo "" >> cluster.yml

echo "Working on authentication..."
echo 'authentication:' >> cluster.yml
cat cluster.rkestate  | jq -r .desiredState.rkeConfig.authentication | yq r - | sed 's/^/  /' >> cluster.yml
echo "" >> cluster.yml

echo "Working on systemImages..."
echo 'system_images:' >> cluster.yml
cat cluster.rkestate  | jq -r .desiredState.rkeConfig.systemImages | yq r - | sed 's/^/  /' >> cluster.yml
echo "" >> cluster.yml
```

5. 使用 RKE 在原有集群上新增节点。

到目前为止，RKE 需要的配置文件`cluster.yml`、`cluster.rkestate`都已经恢复完成，接下来就可以通过`rke up`来操作集群增加`worker(p-172-31-1-111)`节点。

```
# rke up
INFO[0000] Running RKE version: v1.2.4
INFO[0000] Initiating Kubernetes cluster
INFO[0000] [certificates] GenerateServingCertificate is disabled, checking if there are unused kubelet certificates
INFO[0000] [certificates] Generating admin certificates and kubeconfig
INFO[0000] Successfully Deployed state file at [./cluster.rkestate]
INFO[0000] Building Kubernetes cluster
INFO[0000] [dialer] Setup tunnel for host [172.31.2.203]
INFO[0000] [dialer] Setup tunnel for host [172.31.1.111]
INFO[0000] [dialer] Setup tunnel for host [172.31.5.186]
...
...
INFO[0090] [addons] no user addons defined
INFO[0090] Finished building Kubernetes cluster successfully
```

等待集群更新完成之后，再次获取节点信息：

```
# kubectl --kubeconfig kubeconfig_admin.yaml get nodes
NAME              STATUS   ROLES                      AGE     VERSION
ip-172-31-1-111   Ready    worker                     8m6s    v1.18.14
ip-172-31-2-203   Ready    controlplane,etcd,worker   9m27s   v1.18.14
ip-172-31-5-186   Ready    worker                     29s     v1.18.14
```

可以看到新增了一个`worker(ip-172-31-5-186)`节点，并且集群版本依然是`v1.18.14`。

以后，可以通过 RKE 来继续管理通过 Rancher Server 创建的自定义集群，无论是新增节点、快照、恢复均可。和直接通过 RKE 创建的集群几乎无差别。

## 后记

虽然本文指导了通过 RKE 纳管 Rancher 自定义集群，但操作比较复杂，特别是`cluster.yml`的配置，有一点差错，可能就会导致整个集群的更新或出错，所以使用前一定要多做测试。
