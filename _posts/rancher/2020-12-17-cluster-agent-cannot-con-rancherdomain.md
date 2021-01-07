---
layout:     post
title:      业务集群无法连接 Rancher 自定义域名
subtitle:   Error https://rancher.my.org/ping is not accessible
date:       2020-12-17 15:06:00 +0800
author:     Ksd
header-img: img/rancher.jpeg
catalog: true
tags:
    - rancher
    - rancher-server
    - rancher cluster
    - cluster-agent
---

## 问题描述

如果你使用自签名证书搭建 Rancher HA，并且没有dns服务器，你只能通过修改hosts文件去映射域名和rancher的对应关系。 这样做的好处是比较方便，直接修改 hosts 文件映射就可以访问 Rancher UI，但同时带来的问题是当你添加业务集群时，业务集群的 cluster-agent 会报错：

```
root@iZ2ze3r5pmefkuvg3s1yodZ:~# docker ps -a | grep cluster-agent | grep -v pause
eed1b883e620        263ad36fcb47                                      "run.sh"                 3 minutes ago       Exited (1) 3 minutes ago                        k8s_cluster-register_cattle-cluster-agent-784d6f854-x7dzk_cattle-system_402b545e-b6a9-47b5-b09e-18892d710540_11
root@iZ2ze3r5pmefkuvg3s1yodZ:~#
root@iZ2ze3r5pmefkuvg3s1yodZ:~# docker logs -f eed1b883e620
INFO: Environment: CATTLE_ADDRESS=10.42.0.5 CATTLE_CA_CHECKSUM=a9e591a43069e38405c35843ff96a014efe966c48fd18dfa1a70323f87ea07f4 CATTLE_CLUSTER=true CATTLE_FEATURES= CATTLE_INTERNAL_ADDRESS= CATTLE_IS_RKE=true CATTLE_K8S_MANAGED=true CATTLE_NODE_NAME=cattle-cluster-agent-784d6f854-x7dzk CATTLE_SERVER=https://rancher.sss.top
INFO: Using resolv.conf: nameserver 10.43.0.10 search cattle-system.svc.cluster.local svc.cluster.local cluster.local options ndots:5
ERROR: https://rancher.sss.top/ping is not accessible (Could not resolve host: rancher.sss.top)
```

这回导致添加业务集群后，在Rancher UI上一直无法添加成功。

这是因为 Rancher 的 cluster-agent 需要通过 coredns（10.43.0.10）去解析 rancher server的域名，当coredns 无法解析 `rancher.sss.top` 之后，就会将这个域名发送给上端dns服务器，也就是你主机配置的dns服务器，比如：114.114.114.114，上端 dns服务器也无法解析这个IP，所以就会报错。

## 解决方案

有个方法可以解决，参考[rancher 中文官网](https://docs.rancher.cn/docs/rancher2/faq/install/_index#error-httpsranchermyorgping-is-not-accessible-could-not-resolve-host-ranchermyorg)

但是，前提条件你需要获取业务集群的kubeconfig文件。 集群目前还没创建成功，没有办法通过UI去获取 kubeconfig 文件。既然 UI 上无法获取，我们可以 `controlplane` 节点 执行下面的命令来获取：

> 命令行里有特殊字符，不知道为什么显示不全，可以通过下面连接去获取命令：

https://gist.github.com/kingsd041/b52edaca81097ddeaf0c60701f6232ce

执行成功后，会在当前目录生成 `kubeconfig_admin.yaml` 文件，接下来，可以按照[rancher 中文官网](https://docs.rancher.cn/docs/rancher2/faq/install/_index#error-httpsranchermyorgping-is-not-accessible-could-not-resolve-host-ranchermyorg)的操作来做域名和IP的映射

```
kubectl --kubeconfig kubeconfig_admin.yaml -n cattle-system patch  deployments cattle-cluster-agent --patch '{
    "spec": {
        "template": {
            "spec": {
                "hostAliases": [
                    {
                      "hostnames":
                      [
                        "rancher.sss.top"
                      ],
                      "ip": "192.168.1.107"
                    }
                ]
            }
        }
    }
}'

kubectl --kubeconfig kubeconfig_admin.yaml  -n cattle-system patch  daemonsets cattle-node-agent --patch '{
 "spec": {
     "template": {
         "spec": {
             "hostAliases": [
                 {
                    "hostnames":
                      [
                        "rancher.sss.top"
                      ],
                    "ip": "192.168.1.107"
                 }
             ]
         }
     }
 }
}'
```

稍等片刻，就可以看到 cluster-agent 已经成功启动

```
# kubectl --kubeconfig kubeconfig_admin.yaml  -n cattle-system get pods
NAME                                    READY   STATUS    RESTARTS   AGE
cattle-cluster-agent-6d4d66b659-l68tc   1/1     Running   0          52s
cattle-node-agent-4tx98                 1/1     Running   0          5s
kube-api-auth-qxvbm                     1/1     Running   0          43m
```

## 其他

这种问题一般都是在测试环境，或才开始搭建的用户才会出现，正式环境，内网可以搭建一个dns服务器，或使用正规的域名。
