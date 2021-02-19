---
layout: post
title: Rancher 替换证书
subtitle:
date: 2021-2-9 21:06:00 +0800
author: Ksd
header-img: img/post-bg-debug.png
catalog: true
tags:
  - rancher
  - 证书
  - certificate
---

## 前言

关于 Rancher Server 的证书问题，一直是我们比较关注的，在实际使用中，如果首次搭建 Rancher 环境时欠缺考虑，后期想替换证书，一般的做法是重新搭建集群。下面将介绍如何在原有的集群中替换 Rancher 证书，这样可以免去了重新搭建集群的烦恼。

> 撰写本文时使用的 Rancher 版本为`v2.5.x`，如果是其他版本操作可能略有不同。

本文将分别介绍单节点和高可用的 Rancher Server 如何替换证书：

## 替换单节点 Rancher Server 证书

本节将演示如何把单节点 Rancher 的默认证书替换为自签名证书。

#### 前期准备

假设你已经搭建了一个单节点的 Rancher，并且创建了一个下游业务集群:

![](https://tva1.sinaimg.cn/large/008eGmZEly1gnsmta0sdjj31xi0iwjry.jpg)

接下来，从浏览器查看 Rancher 证书为`dynamic`，颁发者为`dynamiclistener-ca`，这是 Rancher 生成的默认证书：

![](https://tva1.sinaimg.cn/large/008eGmZEly1gnsmuc0dszj30r80gmabd.jpg)

因为替换证书之后，Rancher Agent 需要修使用域名连接 Rancher Server，业务集群会出现无法连接的情况，所以需要提前从 Rancher UI 下载业务集群的 kubeconfig，并且将`context`切换到`demo-rancher-demo2`。切换后，可以不通过 Rancher api 直接访问 k8s api-server。

```
# kubectl config get-contexts
CURRENT   NAME                 CLUSTER              AUTHINFO   NAMESPACE
*         demo                 demo                 demo
          demo-rancher-demo2   demo-rancher-demo2   demo

# kubectl config use-context demo-rancher-demo2
Switched to context "demo-rancher-demo2".

# kubectl config current-context
demo-rancher-demo2

# kubectl get nodes
NAME            STATUS   ROLES                      AGE   VERSION
rancher-demo2   Ready    controlplane,etcd,worker   58m   v1.19.6
```

#### Rancher Server 替换为自签名证书

1. 备份 Rancher Server

  > 参考：[升级单节点 Rancher](https://docs.rancher.cn/docs/rancher2/installation_new/other-installation-methods/single-node-docker/single-node-upgrades/_index)

  ```
  # docker ps
  CONTAINER ID        IMAGE               COMMAND             CREATED             STATUS              PORTS                                      NAMES
  b0e3062667a2        rancher/rancher     "entrypoint.sh"     2 hours ago         Up 2 hours          0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp   silly_swanson

  # docker stop silly_swanson
  silly_swanson

  # docker create --volumes-from silly_swanson --name rancher-data rancher/rancher
  aca6f6c791f7caa870e96e1c9f6370a6f015af62c65d73f1f6f80c56587a7542
  ```

2. 基于备份，使用自定义证书启动 Rancher Server

  ```
  docker run -d --privileged --volumes-from rancher-data \
            --restart=unless-stopped \
            -p 80:80 -p 443:443 \
            -v $PWD/certs/cert.pem:/etc/rancher/ssl/cert.pem \
            -v $PWD/certs/key.pem:/etc/rancher/ssl/key.pem \
            -v $PWD/certs/ca.pem:/etc/rancher/ssl/cacerts.pem \
            --privileged \
            rancher/rancher:v2.5.5
  ```

  > 注意：
  >
  > 1. 如果你的需求只是为了要替换证书，请不要修改 Rancher Server 镜像的版本号，保持和之前版本一致，本例为：`rancher/rancher:v2.5.5`，否则将执行升级的操作。
  > 2. 本例是将证书替换为`自签名证书`，如果要替换为其他类型的证书，请参考[升级单节点 Rancher](https://docs.rancher.cn/docs/rancher2/installation_new/other-installation-methods/single-node-docker/single-node-upgrades/_index)里其他选项的参数。

  重新登录 Rancher UI，下游集群的状态为`Unavailable`：

  ![](https://tva1.sinaimg.cn/large/008eGmZEly1gnsn3bea1bj31xs0ii0t9.jpg)

  并且，`cluster-agent` 容器报错：

  ```
  kubectl logs -f cattle-cluster-agent-77cfbbff8b-ldt9n -n cattle-system

  time="2021-02-09T09:32:08Z" level=error msg="Remotedialer proxy error" error="x509: cannot validate certificate for 192.168.64.55 because it doesn't contain any IP SANs"
  W0209 09:32:15.106448       1 warnings.go:77] apiextensions.k8s.io/v1beta1 CustomResourceDefinition is deprecated in v1.16+, unavailable in v1.22+; use apiextensions.k8s.io/v1 CustomResourceDefinition
  time="2021-02-09T09:32:18Z" level=info msg="Connecting to wss://192.168.64.55/v3/connect with token j6t7l2wkvz9k9xbdfnlf6kgxngfl89htl2svnmb4qgkrv7wl9ccp5m"
  time="2021-02-09T09:32:18Z" level=info msg="Connecting to proxy" url="wss://192.168.64.55/v3/connect"
  time="2021-02-09T09:32:18Z" level=error msg="Failed to connect to proxy. Empty dialer response" error="x509: cannot validate certificate for 192.168.64.55 because it doesn't contain any IP SANs"
  ```

3. 通过 kubectl 删除 `daemonset.apps/cattle-node-agent`和`deployment.apps/cattle-cluster-agent`

  ```
  kubectl -n cattle-system delete daemonset.apps/cattle-node-agent deployment.apps/cattle-cluster-agent
  daemonset.apps "cattle-node-agent" deleted
  deployment.apps "cattle-cluster-agent" deleted
  ```

4. 进入到`Setting`-> `Advanced Settings`页面，修改`server-url`的地址为你定义的域名，本例为: `rancher-demo.kingsd.top`

  ![](https://tva1.sinaimg.cn/large/008eGmZEly1gnsn5bs9j5j31q00hk3ys.jpg)

5. 导出集群 YAML

  在 Rancher UI 上创建 API token（用户-> API & Keys）并保存`Bearer Token`

  ![](https://tva1.sinaimg.cn/large/008eGmZEly1gnsna513lej31ac0u00tu.jpg)

  选择集群后，在 Rancher UI（格式为 c-xxxxx）中找到其 clusterid，并在地址栏中找到它。

  ![](https://tva1.sinaimg.cn/large/008eGmZEly1gnsn89tipqj311a0hi74u.jpg)

  根据以上获取的变量替换：`RANCHERURL`、`CLUSTERID`、`TOKEN`（主机需要安装`curl`和`jq`）

  ```
  # Rancher URL
  RANCHERURL="https://192.168.64.55"
  # Cluster ID
  CLUSTERID="c-sxjz5"
  # Token
  TOKEN="token-89z7s:lmg8cszl69vjj9pqr5bjst6shs6mht2n5wxtx6hlz8xpl962hxkprf"
  # Valid certificates
  curl -s -H "Authorization: Bearer ${TOKEN}" "${RANCHERURL}/v3/clusterregistrationtokens?clusterId=${CLUSTERID}" | jq -r '.data[] | select(.name != "system") | .command'
  # Self signed certificates
  curl -s -k -H "Authorization: Bearer ${TOKEN}" "${RANCHERURL}/v3/clusterregistrationtokens?clusterId=${CLUSTERID}" | jq -r '.data[] | select(.name != "system") | .insecureCommand'
  ```

  以上命令执行成功后，将返回导入集群的命令：

  ```
  curl --insecure -sfL https://rancher-demo.kingsd.top/v3/import/rc2gb9qgl4wxm7tjwr5d6krqb9c8d8pkm8bt9fmtj8hrhx62fvqkgk.yaml | kubectl apply -f -
  ```

  然后，可以在具有 kubeconfig 的主机上执行，该命令会重新生成`cattle-cluster-agent`：

  ```
  curl --insecure -sfL https://rancher-demo.kingsd.top/v3/import/rc2gb9qgl4wxm7tjwr5d6krqb9c8d8pkm8bt9fmtj8hrhx62fvqkgk.yaml | kubectl apply -f -
  clusterrole.rbac.authorization.k8s.io/proxy-clusterrole-kubeapiserver unchanged
  clusterrolebinding.rbac.authorization.k8s.io/proxy-role-binding-kubernetes-master unchanged
  namespace/cattle-system unchanged
  serviceaccount/cattle unchanged
  clusterrolebinding.rbac.authorization.k8s.io/cattle-admin-binding unchanged
  secret/cattle-credentials-cfff3df unchanged
  clusterrole.rbac.authorization.k8s.io/cattle-admin unchanged
  deployment.apps/cattle-cluster-agent created
  ```

#### 验证

稍等片刻，`cattle-cluster-agent`和`cattle-node-agent` 将会重新运行：

```
kubectl -n cattle-system get pods
NAME                                   READY   STATUS    RESTARTS   AGE
cattle-cluster-agent-c9774fcdd-rwdk5   1/1     Running   2          2m14s
cattle-node-agent-r58w4                1/1     Running   0          2m13s
```

业务集群状态重新变为`Active`：

![](https://tva1.sinaimg.cn/large/008eGmZEly1gnsnp3l6wbj31y00j6t9a.jpg)

此时，再次查看 Rancher Server 的证书，已经替换为自签名的证书：

![](https://tva1.sinaimg.cn/large/008eGmZEly1gnsnq2i37pj30rg0fyq49.jpg)

## 替换 Rancher HA 证书

本节将演示如何将 Rancher HA 从`自签名证书`替换为 `可信证书`

> 本例 Rancher HA 的采用 L4 的搭建方式，如果 L7 方式搭建的 Rancher HA，从 LB 中替换证书即可。

#### 前期准备

假设你已经搭建了一个高可用的自签名 Rancher 集群，并且创建了一个下游业务集群:

![](https://tva1.sinaimg.cn/large/008eGmZEly1gnstrr75wdj31yi0hsmxm.jpg)

接下来，从浏览器查看 Rancher 证书为自签的`rancher.kingsd.top`，颁发者为`ca-rancher.kingsd.top`:

![](https://tva1.sinaimg.cn/large/008eGmZEly1gnstsq2yuej30rc0js40a.jpg)

#### 将自签名证书替换为可信证书

1. 从`secret`中移除自签名证书

  ```
  kubectl -n cattle-system delete secret tls-rancher-ingress
  kubectl -n cattle-system delete secret tls-ca
  ```

2. 使用可信证书重新创建 `tls-rancher-ingress`

  ```
  kubectl -n cattle-system create secret tls tls-rancher-ingress \
    --cert=rancher.kingsd.top.pem \
    --key=rancher.kingsd.top.key
  ```

3. 从当前安装的 Rancher Helm chart 中获取用 `--set` 传递的值。

  ```
  # helm get values rancher -n cattle-system
  USER-SUPPLIED VALUES:
  hostname: rancher.kingsd.top
  ingress:
    tls:
      source: secret
  privateCA: true
  ```

4. 将上一步中的所有值用--set key=value 追加到命令中。

  ```
  # helm upgrade rancher rancher-latest/rancher \
    --namespace cattle-system \
    --set hostname=rancher.kingsd.top \
    --set ingress.tls.source=secret
  ```

  > 因为只有自签名证书才需要使用参数:`privateCA: true`，所以更新集群为可信证书时，需要删除该参数

  以上是一个例子，可能有更多上一步的值需要追加。 另外，也可以将当前的值导出到一个文件中，并在升级时引用该文件。参考中文官网[高可用升级指南](https://docs.rancher.cn/docs/rancher2/installation_new/install-rancher-on-k8s/upgrades/_index)

  本例是将证书替换为可信证书，如果要替换为其他类型的证书，请参考[高可用升级指南](https://docs.rancher.cn/docs/rancher2/installation_new/install-rancher-on-k8s/upgrades/_index)里其他选项的参数。

#### 验证

稍等片刻，Rancher pod 更新成功之后即可通过浏览器访问 Rancher Server。

此时，再次查看 Rancher Server 的证书，已经替换为可信证书：

![](https://tva1.sinaimg.cn/large/008eGmZEly1gnsv84b4nqj31ok0owdig.jpg)

## 后记

无论是单节点还是高可用的 Rancher Server 替换证书，思路基本一致，都是使用新的证书去更新原集群，如果替换证书过程中域名有变更或出现业务集群 agent 无法连接 Rancher Server 的情况，可以参考本文中`替换单节点 Rancher Server 证书`的步骤修改`server-url`，然后重新创建`cattle-cluster-agent`即可。
