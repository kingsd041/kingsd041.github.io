---
layout: post
title: 将 Rancher 迁移到新集群
subtitle:
date: 2021-1-20 21:06:00 +0800
author: Ksd
header-img: img/post-bg-keybord.jpg
catalog: true
tags:
  - rancher
  - Kubernetes
  - 迁移
  - 备份
---

## 前言

Rancher v2.5 之前的版本是不支持将 Rancher 迁移到其他集群的，但可以利用一些“黑科技”实现将 Rancher 迁移到新的集群，在之前发布的文章[多场景解析如何迁移 Rancher Server](https://mp.weixin.qq.com/s/lKQPT5RQIpwfi-Cf1GC4DQ)有过介绍。

从 Rancher v2.5 开始，可以使用 `rancher-backup operator` 来备份和恢复 Rancher，`rancher-backup` 工作时不需要暴露 etcd，因为 operator 通过调用 kube-apiserver 来收集资源。我们可以利用此特性将 Rancher 迁移到任何标准 Kubernetes 发行版的集群中。

迁移过程概要：

1. 创建 Rancher 备份，并将备份上传到备份存储位置
2. 创建 Rancher local 集群
3. 使用 Restore 自定义资源从备份中还原到 local 集群
4. 使用 Helm 安装 Rancher

## 迁移先决条件

- Rancher 版本必须是 v2.5.0 及以上。
- 如果你要将 Rancher 迁移到一个新的 Kubernetes 集群，你不需要先在新集群上安装 Rancher。如果将 Rancher 还原到一个已经安装了 Rancher 的新集群上，可能会引起问题。
- 要求使用与第一个集群中设置的服务器 URL 相同的 hostname，本例为：rancher.kingsd.top。

## 备份存储位置

Rancher v2.5 备份支持将备份文件推送到兼容 S3 的对象存储（比如：MinIO 或阿里云 OSS），也可以存储在一个 Persistent Volumes 中。考虑到一些用户是离线环境，而且跨集群使用 Persistent Volumes 的方式比较麻烦，所以本文采用将备份推送到 MinIO 的方式给大家带来讲解。

MinIO 安装参考 MinIO 官网(https://docs.min.io/)即可。本文已安装的MinIO地址为：https://minio.kingsd.top。

## 安装单节点 Rancher

> 为了更好的展现迁移效果，本文将演示 "单节点" 迁移到 "高可用" 的场景，当然，也支持 "高可用" 迁移到 "高可用" 的场景，步骤基本相同。

由于在上面 "迁移先决条件" 中提到的 “要求使用与第一个集群中设置的服务器 URL 相同的 hostname”，所以原集群不能是"[使用 Rancher 默认的自签名证书](https://docs.rancher.cn/docs/rancher2/installation_new/other-installation-methods/single-node-docker/_index/#%E9%80%89%E9%A1%B9-a---%E4%BD%BF%E7%94%A8-rancher-%E9%BB%98%E8%AE%A4%E7%9A%84%E8%87%AA%E7%AD%BE%E5%90%8D%E8%AF%81%E4%B9%A6)"的方式安装，因为该方式将自动为 Rancher 签发证书。本文采用[“使用已有的可信证书”](https://docs.rancher.cn/docs/rancher2/installation_new/other-installation-methods/single-node-docker/_index/#%E9%80%89%E9%A1%B9-c---%E4%BD%BF%E7%94%A8%E5%B7%B2%E6%9C%89%E7%9A%84%E5%8F%AF%E4%BF%A1%E8%AF%81%E4%B9%A6)方式安装 Rancher：

```
sudo docker run -d --privileged --restart=unless-stopped \
    -p 80:80 -p 443:443 \
    -v /opt/rancher.kingsd.top.pem:/etc/rancher/ssl/cert.pem \
    -v /opt/rancher.kingsd.top.key:/etc/rancher/ssl/key.pem \
    rancher/rancher:v2.5.5 \
    --no-cacerts
```

然后在 DNS 服务器上将域名`rancher.kingsd.top`映射到你的 Rancher 服务器的 IP，随后你就可以通过 https://rancher.kingsd.top 访问到你的单节点 Rancher UI 了。 为了测试迁移之后依然可以管理下游业务集群，我们需要创建一个自定义集群，并创建几个测试 workload，以便迁移之后做验证。

![](https://tva1.sinaimg.cn/large/008eGmZEly1gmszyonlmuj31xk0jmt99.jpg)

![](https://tva1.sinaimg.cn/large/008eGmZEly1gmszy1rvjij31yc0jcaar.jpg)

## 备份 Rancher

#### 创建 MinIO Secret

将备份上传到 MinIO 需要设置 MinIO 的用户名和密码，在 Rancher 中是以 Secret 的形式存储的，所以需要在`local`集群中提前创建：

![](https://tva1.sinaimg.cn/large/008eGmZEly1gmt0uei0m2j31f10u0t9t.jpg)

#### 安装 rancher-backup operator

1. 在 Rancher UI 的 `Cluster Manager` 中，选择名为`local`的集群
2. 在右上角单击 `Cluster Explorer`
3. 单击 `Apps`
4. 单击 `Rancher Backup` operator
5. 所有选项默认即可，直接点击`Install`创建`Rancher Backup` operator

`rancher-backup`和`rancher-backup-crd`状态为`Deployed`，代表 rancher-backup operator 成功部署。
  ![](https://tva1.sinaimg.cn/large/008eGmZEly1gmt0hx0sd6j31o60u0aet.jpg)

#### 创建备份

1. 在`Cluster Explorer`中，进入左上角的下拉菜单，单击`Rancher Backups`
2. 选择`Backups`，然后点击右侧`Create`
3. 输入`Backups`的配置参数：
   ![](https://tva1.sinaimg.cn/large/008eGmZEly1gmt0w8m464j31vh0u0q4s.jpg)

4. 备份创建成功后，备份状态为`Completed`，备份文件名称为`rancher-backup-1-8f21c185-3caf-4a82-ab8c-8ba425a6667b-2021-01-19T07-12-30Z.tar.gz`
   ![](https://tva1.sinaimg.cn/large/008eGmZEly1gmt10jzi7jj32l60ks3zn.jpg)

5. MinIO 页面也会显示对应的备份文件：
   ![](https://tva1.sinaimg.cn/large/008eGmZEly1gmt11fwtfoj32l80h8wf1.jpg)

至此，Rancher 的备份已经创建成功，并且将备份文件推送到了 MinIO。

## 迁移 Rancher

迁移 Rancher，其实就是利用在 MinIO 上的备份，将 Rancher 恢复到新的 Kubernetes 集群上，所以我们需要先创建一个 Kubernetes 集群做为 Rancher 的 local 集群，本例使用 K3s 作为 local 集群

#### 创建 K3s 集群作为 Local 集群

由于在撰写文章使用的 Rancher 版本为 v2.5.5，此版本不支持 `>=v1.20` 版本的 Kubernetes 集群作为 local 集群，所以需要指定 K3s 版本为`v1.19.7+k3s1`：

```
curl -sfL http://rancher-mirror.cnrancher.com/k3s/k3s-install.sh | INSTALL_K3S_MIRROR=cn INSTALL_K3S_VERSION="v1.19.7+k3s1" sh -
```

#### 安装 rancher-backup Helm chart

```
helm repo add rancher-charts https://charts.rancher.io
helm repo update
helm install rancher-backup-crd rancher-charts/rancher-backup-crd -n cattle-resources-system --create-namespace
helm install rancher-backup rancher-charts/rancher-backup -n cattle-resources-system
```

#### 使用 Restore 自定义资源从备份中还原

本例使用兼容 S3 的对象存储 MinIO 作为备份源，并且需要使用你的 MinIO 凭证进行还原，所以需要在这个集群中创建一个 MinIO Secret。Secret 数据必须有两个 key，accessKey 和 secretKey，包含 MinIO 凭证，像这样：

```
apiVersion: v1
kind: Secret
metadata:
  name: minio-creds
type: Opaque
data:
  accessKey: <Enter your access key>
  secretKey: <Enter your secret key>
```

这个 secret 可以在任何命名空间中创建，上面的例子中，它将在 `default` 的命名空间中创建。

在 Restore 自定义资源中，prune 必须设置为 false。创建一个像下面例子一样的 Restore 自定义资源：

```
# migrationResource.yaml
apiVersion: resources.cattle.io/v1
kind: Restore
metadata:
  name: restore-migration
spec:
  backupFilename: rancher-backup-1-8f21c185-3caf-4a82-ab8c-8ba425a6667b-2021-01-19T07-12-30Z.tar.gz
  prune: false
  # encryptionConfigSecretName: encryptionconfig
  storageLocation:
    s3:
      credentialSecretName: minio-creds
      credentialSecretNamespace: default
      bucketName: rancher-backup
      # folder: ecm1
      # region: us-west-2
      endpoint: minio.kingsd.top
```

查看`Restore`结果：

```
kubectl get restore
NAME                BACKUP-SOURCE   BACKUP-FILE                                                                         AGE   STATUS
restore-migration   S3              rancher-backup-1-8f21c185-3caf-4a82-ab8c-8ba425a6667b-2021-01-19T07-12-30Z.tar.gz   52s   Completed
```

如果`Restore`有异常，可以通过 `cattle-resources-system` 命名空间下的 `rancher-backup-xxx`查看日志。

### 使用 Helm 安装 Rancher

从 [ResourceSets ](https://github.com/rancher/backup-restore-operator/blob/master/crds/resourceset.yaml)中可以看到在备份和恢复过程中，并没有将 Rancher 的 Pod 备份和恢复，所以需要使用 Helm 安装与第一个集群相同版本的 Rancher。

```
# 如果是从HA迁移到HA，不需要重新创建此secret
kubectl -n cattle-system create secret tls tls-rancher-ingress \
  --cert=/opt/rancher.kingsd.top.pem \
  --key=/opt/rancher.kingsd.top.key

helm repo add rancher-latest https://releases.rancher.com/server-charts/latest
helm install rancher rancher-latest/rancher \
  --namespace cattle-system \
  --set hostname=rancher.kingsd.top \
  --set ingress.tls.source=secret \
  --set rancherImageTag=v2.5.5
```

此时，你需要在 DNS 服务器上将域名`rancher.kingsd.top`映射到新的 Rancher 服务器的 IP，本例为 K3s master 所在的服务器 IP，你也可以映射到 LB 的 IP。等待 DNS 配置生效，再次使用 https://rancher.kingsd.top 访问 Rancher，可以看到`local`集群已经替成刚才安装的`v1.19.7+k3s1`版本的 K3s，并且创建的测试 workload 正常工作，迁移成功。

![](https://tva1.sinaimg.cn/large/008eGmZEly1gmt56hqyhpj31yg0ia74r.jpg)

![](https://tva1.sinaimg.cn/large/008eGmZEly1gmt59za2wpj31y00i4wf5.jpg)

## 参考

Rancher v2.5 中的备份和恢复：https://docs.rancher.cn/docs/rancher2/backups/2.5/_index
将 Rancher 迁移到新集群：https://docs.rancher.cn/docs/rancher2/backups/2.5/migrating-rancher/_index
Rancher 高可用安装：https://docs.rancher.cn/docs/rancher2/installation_new/install-rancher-on-k8s/_index
K3s 安装：https://docs.rancher.cn/docs/k3s/quick-start/_index/
MinIO：https://docs.min.io/docs/
