---
layout: post
title: Rancher 高可用安装-自签名证书+4层 LB
subtitle: 使用自签名证书+L4 LB 安装高可用安装
date: 2023-2-22 21:07:00 +0800
author: Ksd
header-img: img/post-bg-desk.jpg
catalog: true
tags:
  - Rancher
  - 高可用
---

## 前言

安装 Rancher 主要分为[单节点](https://ranchermanager.docs.rancher.com/zh/pages-for-subheaders/rancher-on-a-single-node-with-docker)和[高可用](https://ranchermanager.docs.rancher.com/zh/pages-for-subheaders/install-upgrade-on-a-kubernetes-cluster)两种方式：

- 单节点通常是指通过 `docker run` 来启动的 rancher。这种方式非常不推荐生产上使用，如果你的目的是测试或演示，你可以使用 Docker 把 Rancher 安装到单个节点中。
- 高可用主要是指通过 helm 在 kubernetes 集群上安装 Rancher。这个 kubernetes 集群，我们叫他 local 集群，这个集群推荐使用专用的集群，也就是说只用来部署 rancher。如果你的主机资源不足，你可以使用单个主机去运行 local 集群，然后安装 rancher 时将副本数缩减为 1。虽然说这种方式 Rancher Server 没有高可用性，但如果你后期要像这个 local 集群添加节点，就可以很快的获得一个高可用的 Rancher Server。

同时，还有一些其他的安装方式，比如在 Amazon EKS 上部署 Rancher、离线安装等，可以参考官网文档：https://ranchermanager.docs.rancher.com/zh/pages-for-subheaders/installation-and-upgrade

## 说明

#### 关于证书

对于才接触 Rancher 的用户，很多都是卡在了证书的配置上。其实 Rancher 的证书配置非常简单，一共分为以下三种：

- Rancher 生成的证书（默认）
- Let’s Encrypt
- 你已有的证书
  - 自签名证书
  - 颁发机构颁发的证书

本文介绍如何使用**自签名证书来安装高可用的 Rancher**，更多安装方式，可参考[官网文档](https://ranchermanager.docs.rancher.com/zh/pages-for-subheaders/install-upgrade-on-a-kubernetes-cluster)。

#### 关于 DNS

**生产环境安装 Rancher 高可用，需要有一个 DNS 服务器来解析 Rancher 的域名。**

这个 DNS 不是必须的，可以通过在 hosts 文件中映射 Rancher 的域名来解决没有 DNS 服务器的问题，但无论是测试环境和生产环境都不推荐使用 hosts 的方式映射域名。

但考虑到社区用户很多都是采取在 hosts 中映射域名的形式搭建的 Rancher HA，所以本文也采取的在 hosts 文件中映射域名。

## 通过自签名证书安装 Rancher HA

所谓 Rancher Server 高可用，就是通过 helm 将 Rancher 安装在 Kubernetes 集群之上，对于 Rancher 来说，只要是标准的发行版，都可以在上面进行安装，比如：rke、k3s、rke2、kubeadm、托管集群(aks、gks、tks 等)。

为了更好的指导安装，本文从一个裸机开始安装 local 集群，然后在 local 集群上部署高可用的 Rancher Server。

#### 安装环境

Rancher：v2.7.1

主机信息：
| 主机名 | 角色 | IP | OS |
| ------ | ------------- | -------------- | ------------------ |
| demo-1 | local cluster | 192.168.205.30 | Ubuntu 18.04.6 LTS |
| demo-2 | LB(nginx) | 192.168.205.31 | Ubuntu 18.04.6 LTS |
| demo-2 | 下游集群 | 192.168.205.34 | Ubuntu 18.04.6 LTS |

> 本文只是为了演示高可用安装，所以 local 集群只使用了一台，如果是生产环境，建议使用 3 台。

#### 安装 local 集群

> 重要:
>
> 每个 Rancher 支持的 Kubernetes 不同，所以在安装之前一定要参考官网的[支持矩阵](https://www.suse.com/suse-rancher/support-matrix/all-supported-versions/)或者 rancher 的 [release note](https://github.com/rancher/rancher/releases) 来确认支持的 Kubernetes 集群版本：

登录到 demo-1 主机，安装 local kubernete 集群，本文采用的是 k3s 集群：

```
# curl –sfL \
    https://rancher-mirror.rancher.cn/k3s/k3s-install.sh | \
    INSTALL_K3S_VERSION=v1.24.10+k3s1 \
    INSTALL_K3S_MIRROR=cn sh -s - \
    --system-default-registry "registry.cn-hangzhou.aliyuncs.com"
```

参数说明：

- 通过国内的安装脚本和环境变量（INSTALL_K3S_MIRROR=cn）来加速 K3s 的安装
- --system-default-registry：通过此参数，可以设置 K3s 的系统默认镜像仓库使用阿里云的仓库
- 通过 INSTALL_K3S_VERSION 设置 local 集群的 K3s 版本

如果你是使用国外的主机，那么你可以参考[k3s 文档](https://docs.k3s.io/zh/quick-start)来使用通用的安装脚本。
而且这些资源是 Rancher 社区自愿者提供，rancher 并不负责维护。

确认所有 pod 均成功运行;

```
root@demo-1:~# kubectl get pods -A
NAMESPACE     NAME                                      READY   STATUS      RESTARTS   AGE
kube-system   local-path-provisioner-79bf9db7dd-8hhzv   1/1     Running     0          99s
kube-system   coredns-59cd496867-c4hp5                  1/1     Running     0          99s
kube-system   helm-install-traefik-crd-whm9n            0/1     Completed   0          99s
kube-system   helm-install-traefik-n5hlp                0/1     Completed   1          99s
kube-system   metrics-server-9dc9c745f-pwxhf            1/1     Running     0          99s
kube-system   svclb-traefik-11b66970-5q2sj              2/2     Running     0          41s
kube-system   traefik-b44944bf7-5f87t                   1/1     Running     0          41s
```

#### 安装 helm 并设置 KUBECONFIG 环境变量

```
root@demo-1:~# curl https://rancher-mirror.rancher.cn/helm/get-helm-3.sh | INSTALL_HELM_MIRROR=cn bash
root@demo-1:~# export KUBECONFIG=/etc/rancher/k3s/k3s.yaml
root@demo-1:~# helm ls
NAME	NAMESPACE	REVISION	UPDATED	STATUS	CHART	APP VERSION
```

#### 创建自签名证书

生成证书脚本可参考 rancher 2.5 生成自签名证书的[文档](https://docs.rancher.cn/docs/rancher2/installation/resources/advanced/self-signed-ssl/_index/#4-%E5%A6%82%E4%BD%95%E7%94%9F%E6%88%90%E8%87%AA%E7%AD%BE%E5%90%8D%E8%AF%81%E4%B9%A6)

```
root@demo-1:~/cert# ./create_self-signed-cert.sh --ssl-domain=rancher.demo.cn
......
......
root@demo-1:~/cert# ls
cacerts.pem  cacerts.srl  cakey.pem  create_self-signed-cert.sh  openssl.cnf  rancher.demo.cn.crt  rancher.demo.cn.csr  rancher.demo.cn.key  tls.crt  tls.key
```

#### 添加 Helm Chart 仓库

```
root@demo-1:~# helm repo add rancher-stable https://releases.rancher.com/server-charts/stable
"rancher-stable" has been added to your repositories
```

#### 为 Rancher 创建命名空间

```
root@demo-1:~# kubectl create namespace cattle-system
namespace/cattle-system created
```

#### 使用自签名证书部署 Rancher

```
root@demo-1:~# helm install rancher rancher-stable/rancher \
  --namespace cattle-system \
  --set hostname=rancher.demo.cn \
  --set bootstrapPassword=admin \
  --set replicas=1 \
  --set ingress.tls.source=secret \
  --set privateCA=true
```

说明：

- hostname 需要和生成自签名的证书域名对应上
- replicas 设置 rancher 的副本数为 1，默认是 3
- 因为是自签名证书，所以需要这种 `ingress.tls.source=secret`
- 因为是使用私有 CA 证书，所以需要设置 privateCA=true

#### 添加 TLS 密文

```
root@demo-1:~/cert# ls
cacerts.pem  cacerts.srl  cakey.pem  create_self-signed-cert.sh  openssl.cnf  rancher.demo.cn.crt  rancher.demo.cn.csr  rancher.demo.cn.key  tls.crt  tls.key
root@demo-1:~/cert# kubectl -n cattle-system create secret tls tls-rancher-ingress \
  --cert=tls.crt \
  --key=tls.key
root@demo-1:~/cert#kubectl -n cattle-system create secret generic tls-ca \
  --from-file=cacerts.pem=./cacerts.pem
```

#### 确认安装完成

查看所有 rancher pod 的状态：

```
root@demo-1:~# kubectl -n cattle-system get pods -l app=rancher
NAME                       READY   STATUS    RESTARTS   AGE
rancher-69b49b48c4-hcc55   1/1     Running   0          12m
```

查看日志：

```
kubectl -n cattle-system logs -f -l app=rancher
```

#### 安装 LB

虽然本文演示环境的 local 集群只有 1 个节点和 1 个 rancher 副本，但生产环境建议使用 3 个节点的 local 集群和 3 个副本的 rancher pod。

所以要实现高可用，还需要在 rancher 前面加一个 LB，本文为了方便演示，使用 nginx 来演示 LB 的配置：

登录到 demo-2 主机设置 nginx 配置文件：

```
root@demo-2:~# cat /etc/nginx.conf
worker_processes 4;
worker_rlimit_nofile 40000;

events {
    worker_connections 8192;
}

stream {
    upstream rancher_servers_http {
        least_conn;
        server 192.168.205.30:80 max_fails=3 fail_timeout=5s;
        #server <IP_NODE_2>:80 max_fails=3 fail_timeout=5s;
        #server <IP_NODE_3>:80 max_fails=3 fail_timeout=5s;
    }
    server {
        listen 80;
        proxy_pass rancher_servers_http;
    }

    upstream rancher_servers_https {
        least_conn;
        server 192.168.205.30:443 max_fails=3 fail_timeout=5s;
        #server <IP_NODE_2>:443 max_fails=3 fail_timeout=5s;
        #server <IP_NODE_3>:443 max_fails=3 fail_timeout=5s;
    }
    server {
        listen     443;
        proxy_pass rancher_servers_https;
    }

}
```

- 192.168.205.30 为 rancher local 集群的主机
- 如果是 3 个节点的 local 集群并且 rancher 副本数也是 3，那需要将三个节点的主机 ip 都设置进去

启动 nginx：

```
root@demo-2:~# docker run -d --restart=unless-stopped \
  -p 80:80 -p 443:443 \
  -v /etc/nginx.conf:/etc/nginx/nginx.conf \
  nginx:1.14
```

#### 修改域名和 LB 的映射记录

如果内网有 dns 服务器，直接在 dns 服务器上修改即可。如果没有可以在 PC 端的 hosts 文件中修改也可以，比如我在我 mac 电脑的 /etc/hosts 文件中增加以下映射记录：

```
# sudo vi /etc/hosts
192.168.205.30 rancher.demo.cn
```

#### 访问 Rancher Server

从浏览器直接访问：https://rancher.demo.cn/，然后设置 heml 安装时候设置的引导密码和初始密码，即可登录。

## 创建下游集群

目前为止，我们已经安装了高可用的 Rancher，但因为是通过 hosts 文件去做的映射，所以有很多用户会遇到下游集群无法添加的情况，本文继续演示添加下游集群。

#### 创建集群

创建一个 rke 集群，选择所有角色，然后将生成的命令复制到 demo-3 主机，这样会自动 将 demo-3 作为下游集群的节点添加集群到 rancher。
![](https://raw.githubusercontent.com/kingsd041/picture/main/202302222129247.png)

此时，下游集群的注册容器会报一个无法解析 rancher.demo.cn 的错误：

```
INFO: Using resolv.conf: nameserver 127.0.0.53 options edns0 search ctc
WARN: Loopback address found in /etc/resolv.conf, please refer to the documentation how to configure your cluster to resolve DNS properly
ERROR: https://rancher.demo.cn/ping is not accessible (Could not resolve host: rancher.demo.cn)
```

这是因为本次演示 rancher 的域名是通过本地 hosts 文件映射的，所以还需要在下游集群节点的 hosts 文件总配置域名的映射:

```
root@demo-3:~# cat /etc/hosts
192.168.205.31 rancher.demo.cn
```

这时，注册容器解析到 rancher server 之后，开始继续安装下游集群的组件.

> 小技巧:
>
> 可以查看 rancher pod 的日志来查看安装的进度

可以通过 docker ps 来查看下游集群都启动了哪些容器，这时你会发现有个 `cluster-agent` 始终没有启动成功，导致集群一直无法变为 `active`，查看 `cluster-agent` 的日志：

```
root@demo-3:~# docker logs -f 6f696c17b56b
......
......
INFO: Using resolv.conf: nameserver 10.43.0.10 search cattle-system.svc.cluster.local svc.cluster.local cluster.local ctc options ndots:5
ERROR: https://rancher.demo.cn/ping is not accessible (Could not resolve host: rancher.demo.cn)
```

大家可能会有疑问，我们已经在 hosts 文件中映射了域名和 IP，那为什么还解析不了呢？这是因为 cluster-agent 是通过coredns 来解析域名的，因为本次 demo 并没有 DNS 服务器，只在 hosts 中进行了映射，所以 coredns 无法解析域名 rancher.demo.cn。

解决这个问题的方法有很多，下面介绍一种比较简单的方式，直接在 cluster-agent deployment 中添加 HostAliases。

在下游集群 controlplan 节点中执行以下命令来获取 kubeconfig 文件：
```
docker run --rm --net=host -v $(docker inspect kubelet --format '{{ range .Mounts }}{{ if eq .Destination "/etc/kubernetes" }}{{ .Source }}{{ end }}{{ end }}')/ssl:/etc/kubernetes/ssl:ro --entrypoint bash $(docker inspect $(docker images -q --filter=label=io.cattle.agent=true) --format='{{index .RepoTags 0}}' | tail -1) -c 'kubectl --kubeconfig /etc/kubernetes/ssl/kubecfg-kube-node.yaml get configmap -n kube-system full-cluster-state -o json | jq -r .data.\"full-cluster-state\" | jq -r .currentState.certificatesBundle.\"kube-admin\".config | sed -e "/^[[:space:]]*server:/ s_:.*_: \"https://127.0.0.1:6443\"_"' > kubeconfig_admin.yaml
```

> 如果下游集群是 K3S 或 RKE2，直接到 /etc/rancher/k3s/k3s.yaml 或  /etc/rancher/rke2/rke2.yaml 获取 kubeconfig 文件即可。

添加映射：
```
root@demo-3:~# kubectl -n cattle-system patch  deployments cattle-cluster-agent --patch '{
    "spec": {
        "template": {
            "spec": {
                "hostAliases": [
                    {
                      "hostnames":
                      [
                        "rancher.demo.cn"
                      ],
                      "ip": "192.168.205.31"
                    }
                ]
            }
        }
    }
}'

```

执行后，cluster-agent 成功运行，集群状态立刻变为 `active`。

另外，解决以上问题的其他方法可参考：
- https://docs.rancher.cn/docs/rancher2.5/faq/install/_index/#error-httpsranchermyorgping-is-not-accessible-could-not-resolve-host-ranchermyorg
- https://forums.rancher.cn/t/k8s-cluster-register-cattle-cluster-agent-could-not-resolve-host/1672

话说回来，如果你的网络环境中有个 DNS 服务器，就可以避免这么多手动操作的麻烦，所以说，无论是测试环境还是生产环境，还是建议大家先搭建一个 DNS 服务器再安装 Rancher 高可用。

![](https://raw.githubusercontent.com/kingsd041/picture/main/202302222128051.png)