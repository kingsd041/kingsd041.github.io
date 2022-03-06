# RKE2 安装 Rancher HA 的国内加速器

## 前言

Rancher 一直崇尚 “简单即美”，无论 Rancher 的安装和使用都已经把简单发挥的淋漓尽致。但通过国内环境使用 Rancher 和 RKE2 可能会因为网络问题导致 Rancher 的使用起来并不是那么的 “美”：

1. Rancher 和 RKE2 启动都依赖于容器镜像，在国内通过 dockerhub 拉取镜像偶尔会非常慢。
2. RKE2 安装脚本和二进制文件默认使用 github 资源，国内下载困难。

为了解决上述问题，Rancher 已经把资源 mirror 到了国内，并提供给国内环境使用，本文将为大家介绍如何使用国内资源在 RKE2 上安装 Rancher HA。

## 环境描述

- 操作系统：SUSE Linux Enterprise Server 15 SP3
- kubernetes 发行版：RKE2 Kubernetes-v1.21.9+rke2r1
- Rancher 版本：2.6.3
- 节点信息
  > - rancher2-6-node01 Server 节点(controller、etcd、worker)
  > - rancher2-6-node02 Server 节点(controller、etcd、worker)
  > - rancher2-6-node03 Server 节点(controller、etcd、worker)
- Helm 3.8.0

## 部署 RKE2 Kubernetes 集群

> - 在此章节中，将部署 RKE2 的高可用集群，用于 Rancher 2.6 版本的部署环境使用；
> - Rancher 中国团队定时将 dockerhub 上的 RKE2 镜像同步到国内阿里云镜像仓库（registry.cn-hangzhou.aliyuncs.com），所以在国内安装 RKE2 推荐使用阿里云镜像仓库地址；
> - RKE2 可以通过参数 `system-default-registry` 指定镜像仓库地址；

### 创建第一个 server 节点

&#8195;&#8195;通常情况下，RKE2 使用 /etc/rancher/rke2/config.yaml 文件作为 RKE2 的默认配置文件。但是集群部署模式下，需要指定 server 地址、token 和 tls-san 参数，可以先行创建配置文件；

```shell
mkdir -p /etc/rancher/rke2               ##创建目录
vim /etc/rancher/rke2/config.yaml        ##编辑配置文件

token: rke2-create-token          ##自定义token
tls-san: 172.16.200.1             ##tls-san参数
system-default-registry: "registry.cn-hangzhou.aliyuncs.com"  ##阿里云镜像库地址
```

&#8195;&#8195;更多配置选项可查看官方文档，配置文件创建完成后，使用以下命令执行脚本安装 rke2-server，由于截止本文发出后的 Rancher 2.6.3 版本尚不支持在 kubernetes 1.22 版本上运行，因此这里使用 v1.21.9+rke2r1 的 kubernetes 版本；

```shell
curl -sfL http://rancher-mirror.rancher.cn/rke2/install.sh | INSTALL_RKE2_MIRROR=cn INSTALL_RKE2_VERSION=v1.21.9+rke2r1 sh -
```

&#8195;&#8195;执行以下命令将 rke2 启动并设置为开机自启动(第一次启动需要下载镜像等文件，需要一定时间)；

```shell
systemctl start rke2-server && systemctl enable rke2-server
```

&#8195;&#8195;默认的 kubectl 工具和 kubeconfig 文件路径如下：

```shell
kubectl: /var/lib/rancher/rke2/bin/kubectl
kubeconfig: /etc/rancher/rke2/rke2.yaml
crictl: /var/lib/rancher/rke2/bin/crictl
ctr: /var/lib/rancher/rke2/bin/ctr
以上工具可以软链接到/usr/bin下方便使用
例如：ln -s /var/lib/rancher/rke2/bin/kubectl /usr/bin/kubectl
```

&#8195;&#8195;执行以下命令可以查看集群状态

```shell
kubectl --kubeconfig /etc/rancher/rke2/rke2.yaml get node

NAME                STATUS   ROLES                       AGE    VERSION
rancher2-6-node01   Ready    control-plane,etcd,master   106s   v1.21.9+rke2r1
```

### 添加其他 server 节点

&#8195;&#8195;在上一个步骤中，我们已经成功启动了第一个 server 节点，现在需要将剩下的两个节点添加到集群中，以组成高可用集群；

&#8195;&#8195;在添加第二个 server 节点前，需要手动创建一个 RKE2 配置文件：

```shell
mkdir -p /etc/rancher/rke2               ##创建目录
vim /etc/rancher/rke2/config.yaml        ##编辑配置文件

server: https://172.16.200.1:9345   ##添加首个节点的server地址；
token: <token for server node>      ##填写第一个server节点的token，通过在第一个节点查看/var/lib/rancher/rke2/server/token文件获得；
tls-san: 172.16.200.1               ##tls-san参数；
system-default-registry:"registry.cn-hangzhou.aliyuncs.com"    ##阿里云镜像库地址；
```

&#8195;&#8195;执行以下命令执行脚本安装 rke2-server：

```shell
curl -sfL http://rancher-mirror.rancher.cn/rke2/install.sh | INSTALL_RKE2_MIRROR=cn INSTALL_RKE2_VERSION=v1.21.9+rke2r1 sh -
```

&#8195;&#8195;执行以下命令将 rke2 启动并设置为开机自启动(第一次启动需要下载镜像等文件，需要一定时间)：

```shell
systemctl start rke2-server && systemctl enable rke2-server
```

&#8195;&#8195; 同样，在添加第三个 server 节点前，需要手动创建一个 RKE2 配置文件：

```shell
mkdir -p /etc/rancher/rke2               ##创建目录
vim /etc/rancher/rke2/config.yaml        ##编辑配置文件

server: https://172.16.200.1:9345   ##添加首个节点的server地址；
token: <token for server node>      ##填写第一个server节点的token，通过在第一个节点查看/var/lib/rancher/rke2/server/token文件获得；
tls-san: 172.16.200.1               ##tls-san参数；
system-default-registry: "registry.cn-hangzhou.aliyuncs.com"    ##阿里云镜像库地址；
```

&#8195;&#8195;执行以下命令执行脚本安装 rke2-server：

```shell
curl -sfL http://rancher-mirror.rancher.cn/rke2/install.sh | INSTALL_RKE2_MIRROR=cn INSTALL_RKE2_VERSION=v1.21.9+rke2r1 sh -
```

&#8195;&#8195;执行以下命令将 rke2 启动并设置为开机自启动(第一次启动需要下载镜像等文件，需要一定时间)：

```shell
systemctl start rke2-server && systemctl enable rke2-server
```

### 验证集群

&#8195;&#8195;执行以下命令可以查看集群状态：

```shell
kubectl --kubeconfig /etc/rancher/rke2/rke2.yaml get node

NAME                STATUS   ROLES                       AGE     VERSION
rancher2-6-node01   Ready    control-plane,etcd,master   18m     v1.21.9+rke2r1
rancher2-6-node02   Ready    control-plane,etcd,master   7m29s   v1.21.9+rke2r1
rancher2-6-node03   Ready    control-plane,etcd,master   3m31s   v1.21.9+rke2r1
```

&#8195;&#8195; 至此，已经成功创建并运行由 RKE2 创建的 kubernetes 高可用集群，但需要注意的是 RKE2 官方最佳实践推荐，高可用集群应该由统一的 LB 入口访问，这样才是真正的高可用，在本文中，server 注册地址是 node01 的 IP 地址，如果该节点出现意外，则整个集群都会处于不可用状态；在本文中主要介绍 Rancher 2.6 版本在 RKE2 集群上的部署，因此更详细的 RKE2 使用、部署可以参考[RKE2 官方文档](https://docs.rancher.cn/docs/rke2/_index)或者[官方公众号文章](https://mp.weixin.qq.com/s/6HRlF7YDmfBU_EV2NKv-1g)。

&#8195;&#8195; RKE2 默认使用 containerd 作为 Runtime，如果想要查询主机上运行的容器，可以使用以下命令：

```shell
crictl --config /var/lib/rancher/rke2/agent/etc/crictl.yaml ps
```

## 部署 Rancher 2.6.3

> - 在此章节中，将部署 Rancher 2.6.3 版本在 RKE2 集群中；
> - Rancher 中国团队定时将 dockerhub 上的 Rancher 镜像同步到国内阿里云镜像仓库（registry.cn-hangzhou.aliyuncs.com），所以在国内安装 Rancher 推荐使用阿里云镜像仓库地址；
> - 可以通过 helm chart 选项 `rancherImage` 和 `systemDefaultRegistry` 来设置使用阿里云镜像仓库；

### 安装 Rancher 2.6.3

&#8195;&#8195; 添加 Rancher helm repo 源：

```shell
helm repo add rancher-latest http://rancher-mirror.oss-cn-beijing.aliyuncs.com/server-charts/latest

"rancher-latest" has been added to your repositories

## 此处使用为国内源地址，国外地址使用https://releases.rancher.com/server-charts/<CHART_REPO>
## 关于更多国内加速信息，请查看官方公众号[如何在国内优雅地使用Rancher](https://mp.weixin.qq.com/s/yvIDBcBQnsel4zabwenKMA)
```

&#8195;&#8195;为 Rancher 创建 Namespace：

```shell
kubeconfig=/etc/rancher/rke2/rke2.yaml

kubectl --kubeconfig=$kubeconfig create namespace cattle-system
```

&#8195;&#8195;创建 Ingress 证书：

```shell
kubeconfig=/etc/rancher/rke2/rke2.yaml

kubectl --kubeconfig=$kubeconfig \
    -n cattle-system create secret \
    tls tls-rancher-ingress \
    --cert=./tls.pem \
    --key=./tls.key
```

&#8195;&#8195; helm 安装 Rancher Server：

```shell
helm --kubeconfig=$kubeconfig install rancher rancher-latest/rancher \
    --namespace cattle-system \
    --set hostname=rancher26.itlsp.com \
    --set rancherImage=registry.cn-hangzhou.aliyuncs.com/rancher/rancher \
    --set ingress.tls.source=secret \
    --set systemDefaultRegistry=registry.cn-hangzhou.aliyuncs.com \
    --set rancherImageTag=v2.6.3

## hostname为上一步创建证书中的hostname；
## systemDefaultRegistry和rancherImage中的镜像库可指定；
## 以上命令为权威证书安装命令，如果是自签名证书参考以下命令

## 创建自签名Ingress证书
kubectl --kubeconfig=$kubeconfig \
    -n cattle-system create \
    secret tls tls-rancher-ingress \
    --cert=./tls.crt \
    --key=./tls.key
## 创建自签名证书CA
kubectl --kubeconfig=$kubeconfig \
    -n cattle-system \
    create secret generic tls-ca \
    --from-file=cacerts.pem

##helm安装Rancher server
helm --kubeconfig=$kubeconfig install rancher rancher-latest/rancher \
    --namespace cattle-system \
    --set hostname=<修改为自己的域名> \
    --set rancherImage=<镜像库地址>/cnrancher/rancher \
    --set privateCA=true \
    --set ingress.tls.source=secret \
    --set systemDefaultRegistry=<镜像库地址> \
    --set rancherImageTag=v2.6.3

```

&#8195;&#8195;执行一下命令查看 Rancher Server Pod 状态：

```shell
kubectl --kubeconfig=$kubeconfig -n cattle-system get pod | grep rancher

rancher-57f57f775-4bjdj   1/1     Running   1          5m58s
rancher-57f57f775-fdh6c   1/1     Running   0          5m58s
rancher-57f57f775-fnsxk   1/1     Running   0          5m58s
```

&#8195;&#8195; 恭喜你！到这个步骤，应该已经可以通过浏览器访问全新的 Rancher 2.6.3 版本了。至此，全新的 Rancher2.6.3 版本已经运行在更安全、更稳定、更高效的 RKE2 平台上。
![Rancher 2.6首页](https://zknow-1256858200.cos.ap-guangzhou.myqcloud.com/%E5%85%AC%E4%BC%97%E5%8F%B7-%E5%BF%AB%E9%80%9F%E5%B0%86Rancher2.6%E9%83%A8%E7%BD%B2%E4%BA%8ERKE2%E5%B9%B3%E5%8F%B0%E4%B8%8A/clipboard_20220210_014628.png)

## 总结

- RKE2 是 SUSE Rancher 下一代 Kubernetes 发行版，它以更安全著称(因为还有另外个名字，RKE Government(政府版))；启用了 FIPS 140-2 标准和完全通过了 CIS1.5 和 1.6 版本的扫描；
- 另外 RKE2 默认没有使用 docker 作为 Runtime 而是使用了更底层的 containerd，这大大稳定了国内用户对于 kubernetes 抛弃 docker 后何去何从的信心；
- RKE2 将如 kube-apiserver、etcd、kube-controller-manager 等核心组件作为 Pod 运行，由二进制运行的 kubelet 进行管理，增强了故障自愈和整体的稳定性；也简化了部署难度；
- 本文中安装 Rancher 和 RKE2 均使用的阿里云镜像仓库 `registry.cn-hangzhou.aliyuncs.com`，并且安装 RKE2 的脚本也使用的国内的资源。这样能大大提升国内用户的体验；