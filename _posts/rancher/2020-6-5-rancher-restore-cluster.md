---
layout:     post
title:      多场景讲解如何恢复您的集群
subtitle:   多场景讲解如何恢复您的集群
date:       2020-6-5 15:06:00 +0800
author:     Ksd
header-img: img/post-bg-rancher-k8s.png
catalog: true
tags:
    - rancher
    - rancher-server
    - rancher cluster
---


在实际使用Rancher过程中，偶尔会因为误操作删除了System Workload、节点或集群, 导致集群状态异常而无法访问。如果用户不了解恢复方法，通常会重新添加节或重新搭建集群。

本文将根据以下几个场景来介绍如何恢复由于误操作引起的Rancher集群故障:

- 如何恢复System Project Workload
- 如何恢复从Rancher UI或kubectl误删的节点
- 如何恢复执行过清理节点脚本的节点
- 如何恢复被删除的custom集群

## 重要说明

- 本文档基于Rancher 2.4.x测试，其他版本操作可能会略有不同
- 本文介绍的场景均是针对`custom`集群。
- 如果您在此过程中遇到问题，则应该熟悉Rancher架构/故障排除
- 您应该熟悉单节点安装和高可用安装之间的体系结构差异

## 如何恢复System Project Workload

System Project中包含了一些保证该集群能够正常运行的一些workload，如果删除某些workload可能会对该集功能群照成影响。

通常情况下，通过RKE创建的`custom`集群应包括以下workload：
![](https://tva1.sinaimg.cn/large/007S8ZIlly1ggh7dmdjubj31d20u0gpa.jpg)

下面我们来分别介绍如果误删了这些workload之后应如何恢复。

### 恢复`cattle-cluster-agent`和`cattle-node-agent`

#### 模拟故障

从System Project下删除 `cattle-cluster-agent`和`cattle-node-agent`

![](https://tva1.sinaimg.cn/large/007S8ZIlly1ggh2npw631j32070u0gnl.jpg)

#### 生成Kubeconfig和集群yaml

1. 在Rancher UI上创建API token（用户-> API & Keys）并保存`Bearer Token`
![](https://tva1.sinaimg.cn/large/007S8ZIlly1ggh1u1cissj31am0u0ab4.jpg)
2. 选择集群后，在Rancher UI（格式为c-xxxxx）中找到其clusterid，并在地址栏中找到它。
![](https://tva1.sinaimg.cn/large/007S8ZIlly1ggcr77qaapj31c60tcgmk.jpg)
3. 根据步骤1-2获取的变量替换：`RANCHERURL`、`CLUSTERID`、`TOKEN`（主机需要安装`curl`和`jq`）
```
# Rancher URL
RANCHERURL="https://192.168.99.201"
# Cluster ID
CLUSTERID="c-v6mtr"
# Token
TOKEN="token-klt5n:2smg6n5cb5vstn7qm797l9fbc7s9gljxjw528r7c5c4mwf2g7kr6nm"
# Valid certificates
curl -s -H "Authorization: Bearer ${TOKEN}" "${RANCHERURL}/v3/clusterregistrationtokens?clusterId=${CLUSTERID}" | jq -r '.data[] | select(.name != "system") | .command'
# Self signed certificates
curl -s -k -H "Authorization: Bearer ${TOKEN}" "${RANCHERURL}/v3/clusterregistrationtokens?clusterId=${CLUSTERID}" | jq -r '.data[] | select(.name != "system") | .insecureCommand'
```
以上命令执行成功后，将返回导入集群的命令，请做好备份，命令如下：
```
curl --insecure -sfL https://192.168.99.201/v3/import/2mgnx6f4tvgk5skfzgs6qlcrvn5nnwqh9kchqbf5lhlnswfcfrqwpr.yaml | kubectl apply -f -

```


#### 恢复`cattle-cluster-agent`和`cattle-node-agent`

1. 在具有`controlplane`角色的节点上生成kubeconfig
```
docker run --rm --net=host -v $(docker inspect kubelet --format '{{ range .Mounts }}{{ if eq .Destination "/etc/kubernetes" }}{{ .Source }}{{ end }}{{ end }}')/ssl:/etc/kubernetes/ssl:ro --entrypoint bash $(docker inspect $(docker images -q --filter=label=io.cattle.agent=true) --format='{{index .RepoTags 0}}' | tail -1) -c 'kubectl --kubeconfig /etc/kubernetes/ssl/kubecfg-kube-node.yaml get configmap -n kube-system full-cluster-state -o json | jq -r .data.\"full-cluster-state\" | jq -r .currentState.certificatesBundle.\"kube-admin\".config | sed -e "/^[[:space:]]*server:/ s_:.*_: \"https://127.0.0.1:6443\"_"' > kubeconfig_admin.yaml
```

2. 应用更新

> 将`https://xxx/v3/import/dl75kfmmbp9vj876cfsrlvsb9x9grqhqjd44zvnfd9qbh6r7ks97sr.yaml`替换为**生成Kubeconfig和集群yaml**步骤中生成的yaml连接,本例为`https://192.168.99.201/v3/import/2mgnx6f4tvgk5skfzgs6qlcrvn5nnwqh9kchqbf5lhlnswfcfrqwpr.yaml`
```
docker run --rm --net=host -v $PWD/kubeconfig_admin.yaml:/root/.kube/config --entrypoint bash $(docker inspect $(docker images -q --filter=label=io.cattle.agent=true) --format='{{index .RepoTags 0}}' | tail -1) -c 'curl --insecure -sfL https://xxx/v3/import/dl75kfmmbp9vj876cfsrlvsb9x9grqhqjd44zvnfd9qbh6r7ks97sr.yaml | kubectl apply -f -'
```

![](https://tva1.sinaimg.cn/large/007S8ZIlly1ggh2poycwej31h807ejry.jpg)

#### 验证

接下来通过Rancher UI或kubectl可以看到 `cattle-cluster-agent`和`cattle-node-agent` 已经恢复

![](https://tva1.sinaimg.cn/large/007S8ZIlly1ggh2sd720mj31g90u0di7.jpg)

![](https://tva1.sinaimg.cn/large/007S8ZIlly1ggh2tvjszyj30oq02i0so.jpg)

### 恢复`kube-api-auth`

默认情况下，RKE 集群会默认启用授权集群端点。这个端点允许您使用 kubectl CLI 和 kubeconfig 文件访问下游的 Kubernetes 集群，RKE 集群默认启用了该端点。 

如果误删`kube-api-auth`，恢复的方法也很简单，只需要编辑集群，将“授权集群访问地址”修改成`禁用`，保存集群。然后再用相同的方法`启用` “授权集群访问地址”即可。

1. 编辑集群

![](https://tva1.sinaimg.cn/large/007S8ZIlly1ggh349y35oj31v40u0t9j.jpg)

2. 禁用授权集群访问地址，保存
![](https://tva1.sinaimg.cn/large/007S8ZIlly1ggh35gp2hhj31yy0hsgm9.jpg)

3. 再次编辑集群，启用授权集群访问地址，保存
![](https://tva1.sinaimg.cn/large/007S8ZIlly1ggh35iynu0j31y80nqjs9.jpg)

#### 恢复`nginx-ingress-controller`、`canal`、`coredns`、`metrics-serve`组件

`nginx-ingress-controller`、`canal`、`coredns`、`metrics-serve` 这些workload都是通过`kube-system`命名空间下的各种`job`来创建的，所以如果要重建这些workload只需要重新执行对应的job即可。

本例使用`nginx-ingress-controller`做演示，其他workload的恢复步骤可以参考此恢复方案。

#### 模拟故障

从System Project下删除 kube-system 下的`	default-http-backend`和`nginx-ingress-controller`

![](https://tva1.sinaimg.cn/large/007S8ZIlly1ggh4279fn0j31iy0u0wh2.jpg)

#### 执行恢复

1. 从`kube-system`命名空间下删除`rke-ingress-controller-deploy-job`（如果不删除对应的job，更新集群后，不会重新触发job重新执行）

2. 为了触发集群更新，可以编辑集群，修改`NodePort范围`，然后保存。

#### 验证

集群更新成功后，回到System Project下确认`	default-http-backend`和`nginx-ingress-controller`已经重新创建。

![](https://tva1.sinaimg.cn/large/007S8ZIlly1ggjrqgbel0j31py0u0jtl.jpg)

## 如何恢复从Rancher UI或kubectl误删的节点

当节点处于“活动”状态，从集群中删除节点将触发一个进程来清理节点。如果没有重启服务器，并不会完成所有的清除所有非持久化数据。

如果无意中将节点删除，只需要使用相同的参数再次添加节点即可恢复集群。

比如我的环境有两个节点，分别具有`全部`和`Worker`角色
![](https://tva1.sinaimg.cn/large/007S8ZIlly1ggh9unla8wj31za0kq756.jpg)

从Rancher UI或kubectl将节点`rancher2`删除，此时集群中只剩下一个`rancher3`节点，由于集群中缺少`Etcd`和`Control`角色，所以集群提示：`Waiting for etcd and controlplane nodes to be registered`

![](https://tva1.sinaimg.cn/large/007S8ZIlly1ggh9w0e1z2j31zw0lkdgl.jpg)

接下来，编辑集群，并且设置相同的节点参数，这地方要注意，一定要设置和之前添加节点时相同的节点参数。

![](https://tva1.sinaimg.cn/large/007S8ZIlly1ggh9yj43omj31640u0gnt.jpg)

制复添加节点命令在`rancher2`的SSH终端运行。

![](https://tva1.sinaimg.cn/large/007S8ZIlly1ggha6kjsw7j31h902owel.jpg)

过一会，再回到集群集群主机列表页面，可以看到`rancher2`节点已经恢复

![](https://tva1.sinaimg.cn/large/007S8ZIlly1ggha7slkyqj320k0ksaax.jpg)

## 如何恢复执行过清理节点脚本的节点

中文官网提供了一个清理节点（https://rancher2.docs.rancher.cn/docs/cluster-admin/cleaning-cluster-nodes/_index） 的脚本，这个脚本会清理节点上的容器、卷、rancher/kubernetes目录、网络、进程、iptables等。

如果由于误操作，在正确的节点上执行了清理脚本。针对这种场景，只有在rancher中创建过备份的集群才可以恢复。

> 创建集群备份参考中文官网：https://rancher2.docs.rancher.cn/docs/cluster-admin/backing-up-etcd/_index

在我的环境中，`demo`集群有`rancher2`和`rancher3`两个节点。

![](https://tva1.sinaimg.cn/large/007S8ZIlly1gghc3lnzl4j320c0lawfc.jpg)

### 创建备份

在Rancher UI上创建集群快照，稍后恢复集群的时候会用的到。

![](https://tva1.sinaimg.cn/large/007S8ZIlly1gghcjdbvksj31ur0u0dgn.jpg)

然后导航到`全局`->`demo`->`工具`->`备份`查看已经创建的ETCD备份，从备份创建时间可以看出，刚才创建的备份名称为`c-v6mtr-ml-klt5n`。

![](https://tva1.sinaimg.cn/large/007S8ZIlly1gghczs7555j31ze0nmaao.jpg)

备份文件存到了etcd（rancher2）节点对应的`/opt/rke/etcd-snapshots`目录下。

![](https://tva1.sinaimg.cn/large/007S8ZIlly1gghcz26fgxj30o904974a.jpg)

### 清理节点

在`rancher2`节点执行中文官网节点清理脚本，清理理完之后，不出所料，集群崩了。

![](https://tva1.sinaimg.cn/large/007S8ZIlly1gghd3cfvk5j31z20n00te.jpg)

### 恢复集群

节点清理脚本并不会将`/opt/rke`目录删除，只是使用`mv /opt/rke /opt/rke-bak-$(date +"%Y%m%d%H%M")`做了个备份。接下来可以将快照备份恢复到默认的`/opt/rke`目录下。

```
mv /opt/rke-bak-202007060903 /opt/rke
```

接下来，编辑集群重新添加节点。这地方要注意，一定要设置和之前添加节点时相同的节点参数。

![](https://tva1.sinaimg.cn/large/007S8ZIlly1gghdwomgfzj320y0sct9n.jpg)

![](https://tva1.sinaimg.cn/large/007S8ZIlly1gghdwz80jcj31b60u0wgo.jpg)


运⾏完命令之后，可以看到rancher agent已经正常工作起来了。

![](https://tva1.sinaimg.cn/large/007S8ZIlly1gghdxzbynlj31h6075wf0.jpg)

接下来，选择之前的备份记录，保存，开始恢复集群。

![](https://tva1.sinaimg.cn/large/007S8ZIlly1gghe0ebyl8j31we0n0gme.jpg)

现在集群的状态变成了`Updating`，已经开始使用之前创建的快照进行恢复集群了

![](https://tva1.sinaimg.cn/large/007S8ZIlly1gghekwwikbj32340kedgd.jpg)

稍等片刻，可以看到kubernetes组件全部运行起来。

![](https://tva1.sinaimg.cn/large/007S8ZIlly1ggheo5w5btj30qg0cugm0.jpg)

集群状态也变为了`Active`，此时，集群已经成功恢复

![](https://tva1.sinaimg.cn/large/007S8ZIlly1ggheowokcij321m0jmaah.jpg)

### 业务应用检查

之前部署的名为nginx的nginx应⽤依旧存在，且运行正常。

![](https://tva1.sinaimg.cn/large/007S8ZIlly1ggher2jx48j31za0k6gme.jpg)

![](https://tva1.sinaimg.cn/large/007S8ZIlly1ggherfq3fzj31tm0mkab1.jpg)

## 如何恢复被删除的custom集群

在Rancher UI中误删自定义的集群，如果要恢复该集群，必须需要有Rancher local集群和自定义集群的备份才可以恢复。

### 备份集群

#### 备份custom集群

参考 https://rancher2.docs.rancher.cn/docs/cluster-admin/backing-up-etcd/_index 备份custom集群，备份成功后，可以导航到`集群->工具->备份`查看备份。

![](https://tva1.sinaimg.cn/large/007S8ZIlly1ggjaazfnraj320e0mot97.jpg)

#### 备份local集群

参考 https://rancher2.docs.rancher.cn/docs/backups/_index 备份local集群，备份成功后，将在本地生成一个tar.gz文件。

![](https://tva1.sinaimg.cn/large/007S8ZIlly1ggifxlqleij30g301smwz.jpg)


### 模拟故障

接下来可以在Rancher UI上将集群删除来模拟故障。

![](https://tva1.sinaimg.cn/large/007S8ZIlly1ggjsn3yjkqj32000j6my4.jpg)

### 恢复local集群

参考 https://rancher2.docs.rancher.cn/docs/backups/restorations/_index 恢复local集群。

local恢复成功后，重新登录Rancher UI，可以看到刚才被删除的custom集群又重新显示了，但状态是`Unavailable`

![](https://tva1.sinaimg.cn/large/007S8ZIlly1ggihc87zzmj31zc0k6mxl.jpg)


### 恢复custom集群

接下来，可以根据之前创建的custom集群快照恢复custom集群。

恢复custom集群参考：https://rancher2.docs.rancher.cn/docs/cluster-admin/restoring-etcd/_index

![](https://tva1.sinaimg.cn/large/007S8ZIlly1ggjaogbjrvj31kc0k2gm3.jpg)

恢复后，集群状态变为`Updating`，稍等片刻，可以看到集群状态又变为`Active`，集群恢复成功。

![](https://tva1.sinaimg.cn/large/007S8ZIlly1ggjaphzn7sj32000jyjrt.jpg)

![](https://tva1.sinaimg.cn/large/007S8ZIlly1ggjaxgwyf4j31yc0hiwew.jpg)

## 总结

从以上几个场景的恢复操作可以看出，大部分的恢复方案都依赖于集群的备份，所以大家在生成环境中一定要做好定时备份，并且最好将备份文件上传到远端备份服务器，这样可以在灾难情况下保护您的数据。