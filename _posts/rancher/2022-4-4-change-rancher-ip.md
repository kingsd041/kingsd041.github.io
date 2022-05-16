---
layout: post
title: 如何修改 Rancher Server 的 IP 地址
subtitle:
date: 2022-4-4 21:07:00 +0800
author: Ksd
header-img: img/post-bg-desk.jpg
catalog: true
tags:
  - Rancher
---

> 注意：
>
> - 本指南适用于 v2.5 及 v2.5 以下的 Rancher 版本，不适用 v2.6
> - 本指南非官方操作，操作前请务必做好备份

## 前言

Rancher 管理的每个下游用户集群都有一个 cluster agent，它建立了一个 tunnel，并通过这个 tunnel 连接到 Rancher server 中相应的集群控制器(Cluster controller)。

Cluster agent，也称为 `cattle-cluster-agent`，是在下游用户集群中运行的组件。它其中的一个非常重要的作用就是：在下游用户集群和 Rancher server 之间（通过到集群控制器的 tunnel）就事件、统计信息、节点信息和健康状况进行通信并上报.

![](https://rancher.com/docs/img/rancher/rancher-architecture-cluster-controller.svg)

如果当 Rancher server 的 IP 发生变化，`cattle-cluster-agent` 无法通过 tunnel 连接到 Rancher server，你可以在下游集群的 `cattle-cluster-agent` 容器中查看到如下日志：

```
time="2022-04-06T03:42:22Z" level=info msg="Connecting to wss://35.183.183.66/v3/connect with token jhh9rx4zmgkrw2mz8mkvsmlnnx6q5jllnqb8jnr2vdxcgglglqbdjz"
time="2022-04-06T03:42:22Z" level=info msg="Connecting to proxy" url="wss://35.183.183.66/v3/connect"
time="2022-04-06T03:42:32Z" level=error msg="Failed to connect to proxy. Empty dialer response" error="dial tcp 35.183.183.66:443: i/o timeout"
time="2022-04-06T03:42:32Z" level=error msg="Remotedialer proxy error" error="dial tcp 35.183.183.66:443: i/o timeout"
```

> 35.183.183.66 为原 Rancher server IP

Rancher UI 将显示集群状态为 `Unavailable`：

![](https://tva1.sinaimg.cn/large/e6c9d24ely1h0zusm1yegj21fi0cwgmq.jpg)

可以看出，Rancher server 的主机的 IP 发生变化后，Rancher agent 无法通过原来的 Rancher server IP 去连接，所以我们需要更新 Rancher agent 连接 Rancher server 的 IP 地址。

## 重新创建 Rancher agent，使 Rancher agent 连接到新 Rancher server IP

#### 更新 `server-url`

因为 Rancher server 节点的 IP 地址发生变化，所以需要更新 Rancher server 的 `server-url` 为正确的主机 IP。我们可以从 `Settings` 中找到 `server-url` 的选项。

![](https://tva1.sinaimg.cn/large/e6c9d24ely1h0zutqnd60j21ce08mdgi.jpg)

#### 获取下游集群的 kubeconfig

重新创建 Rancher agent 需要通过 kubectl 连接下游集群，所以在操作前，首先获取下游集群的 kubeconfig 文件。

可以从以下三种方式中任选其一：

- 如果你已经从 Rancher UI 上下载了下游集群的 kubeconfig。由于 Rancher 已经和下游集群失联，所以你无法继续使用 rancher api 连接下游集群。但你可以通过 切换 context 直接连接到下游集群 kube-apiserver 继续操作下游集群，参考: [直接使用下游集群进行身份验证](https://rancher.com/docs/rancher/v2.6/en/cluster-admin/cluster-access/kubectl/)
- 在 Rancher server 容器的 secret 中获取，参考：https://gist.github.com/superseb/f6cd637a7ad556124132ca39961789a4
- 在具有控制平面角色的节点上生成 kubeconfig：
  ```
  docker run --rm --net=host -v $(docker inspect kubelet --format '{{ range .Mounts }}{{ if eq .Destination "/etc/kubernetes" }}{{ .Source }}{{ end }}{{ end }}')/ssl:/etc/kubernetes/ssl:ro --entrypoint bash $(docker inspect $(docker images -q --filter=label=io.cattle.agent=true) --format='{{index .RepoTags 0}}' | tail -1) -c 'kubectl --kubeconfig /etc/kubernetes/ssl/kubecfg-kube-node.yaml get configmap -n kube-system full-cluster-state -o json | jq -r .data.\"full-cluster-state\" | jq -r .currentState.certificatesBundle.\"kube-admin\".config | sed -e "/^[[:space:]]*server:/ s_:.*_: \"https://127.0.0.1:6443\"_"' > kubeconfig_admin.yaml
  ```

#### 重新生成 Rancher agent 定义

在 UI 中生成 API 令牌（User -> API & Keys）并保存 Bearer Token；

本例为：`token-rfv84:86v2wxpzh8mtgvzxpsnwnvrx5nlc424tf8tvrnpzckdxdpt2vfltqq`

![](https://tva1.sinaimg.cn/large/e6c9d24ely1h0zuwclcygj21cj0u0adb.jpg)

在 Rancher UI 中找到 clusterid（格式为 c-xxxxx）。如果你不知道如何查找 clusterid，导航到首页，点击对应的集群名称，此时，浏览器地址栏将会显示一个 c-xxxxx 的 clusterid。

本例为：`c-s8t7s`

![](https://tva1.sinaimg.cn/large/e6c9d24ely1h0zv18fcufj21rs0famzy.jpg)

生成 agent 定义（需要 curl, jq）

```
# Rancher URL
RANCHERURL="https://35.183.24.89"
# Cluster ID
CLUSTERID="c-s8t7s"
# Token
TOKEN="token-rfv84:86v2wxpzh8mtgvzxpsnwnvrx5nlc424tf8tvrnpzckdxdpt2vfltqq"
# Valid certificates
curl -s -H "Authorization: Bearer ${TOKEN}" "${RANCHERURL}/v3/clusterregistrationtokens?clusterId=${CLUSTERID}" | jq -r '.data[] | select(.name != "system") | .command'
# Self signed certificates
curl -s -k -H "Authorization: Bearer ${TOKEN}" "${RANCHERURL}/v3/clusterregistrationtokens?clusterId=${CLUSTERID}" | jq -r '.data[] | select(.name != "system") | .insecureCommand'
```

成功执行后，将生成一个执行定义的命令，例如：

```
root@ip-172-31-6-210:~# curl -s -k -H "Authorization: Bearer ${TOKEN}" "${RANCHERURL}/v3/clusterregistrationtokens?clusterId=${CLUSTERID}" | jq -r '.data[] | select(.name != "system") | .insecureCommand'
curl --insecure -sfL https://35.183.24.89/v3/import/98bvp7cpc7m7xqccxqwsghbnb6pvm9b2lcz7jz4xlfdlsc9lh5tmv8_c-s8t7s.yaml | kubectl apply -f -
```

#### 应用定义

在具有 kubectl 和 kubeconfig 的主机上执行上一步生成的重新配置 Rancher agent 的命令：

```
root@ip-172-31-6-210:~# curl --insecure -sfL https://35.183.24.89/v3/import/98bvp7cpc7m7xqccxqwsghbnb6pvm9b2lcz7jz4xlfdlsc9lh5tmv8_c-s8t7s.yaml | kubectl apply -f -
clusterrole.rbac.authorization.k8s.io/proxy-clusterrole-kubeapiserver unchanged
clusterrolebinding.rbac.authorization.k8s.io/proxy-role-binding-kubernetes-master unchanged
namespace/cattle-system unchanged
serviceaccount/cattle unchanged
clusterrolebinding.rbac.authorization.k8s.io/cattle-admin-binding unchanged
secret/cattle-credentials-6f51cbe created
clusterrole.rbac.authorization.k8s.io/cattle-admin unchanged
deployment.apps/cattle-cluster-agent configured
daemonset.apps/cattle-node-agent configured
```

#### 验证

稍等片刻，`cattle-cluster-agent`和`cattle-node-agent` 将会重新运行：

```
root@ip-172-31-6-210:~# kubectl -n cattle-system get pods
NAME                                    READY   STATUS    RESTARTS   AGE
cattle-cluster-agent-77f864c76f-qrjs2   1/1     Running   0          38s
cattle-node-agent-znrv5                 1/1     Running   0          4s
```

业务集群状态重新变为`Active`：

![](https://tva1.sinaimg.cn/large/e6c9d24ely1h0zv6khni1j222e0jugoi.jpg)

## 后记

个人非常不建议去修改 Rancher server 的 IP 地址，甚至 `server-url` 的修改也有可能带来隐患。

即使是单节点安装的 Rancher server，也建议通过域名去注册下游集群，这样后续我们可以从单节点迁移到高可用，或者 Rancher server 节点 IP 有变动后，只需要修改对应的 IP 映射即可。
