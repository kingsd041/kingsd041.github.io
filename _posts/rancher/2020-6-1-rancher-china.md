---
layout:     post
title:      如何在国内更优雅的使用Rancher
subtitle:   如何在国内更优雅的使用Rancher
date:       2020-6-5 15:06:00 +0800
author:     Ksd
header-img: img/post-bg-rancher-k8s.png
catalog: true
tags:
    - rancher
    - rancher-server
    - rancher cluster
---


# 如何在国内更优雅的使用Rancher

## 在国内使用Rancher的困扰

您是不是和我一样，经常被下面的问题困扰着？

##### 1. 无法从Github上下载Rancher资源

```
ksd@Hailong-MacBook-Pro  /tmp  wget https://github.com/rancher/rke/releases/download/v1.0.8/rke_linux-amd64
--2020-05-07 10:20:30--  https://github.com/rancher/rke/releases/download/v1.0.8/rke_linux-amd64
Resolving github.com... 13.250.177.223
Connecting to github.com|13.250.177.223|:443... connected.
HTTP request sent, awaiting response... 302 Found
Location: https://github-production-release-asset-2e65be.s3.amazonaws.com/108337180/26415380-8ebd-11ea-834a-af693358e976?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAIWNJYAX4CSVEH53A%2F20200507%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20200507T022031Z&X-Amz-Expires=300&X-Amz-Signature=f4659696f17f619d1d42bfc0a78d998c12c34506475983eb523f150a22a4ce51&X-Amz-SignedHeaders=host&actor_id=0&repo_id=108337180&response-content-disposition=attachment%3B%20filename%3Drke_linux-amd64&response-content-type=application%2Foctet-stream [following]
--2020-05-07 10:20:31--  https://github-production-release-asset-2e65be.s3.amazonaws.com/108337180/26415380-8ebd-11ea-834a-af693358e976?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAIWNJYAX4CSVEH53A%2F20200507%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20200507T022031Z&X-Amz-Expires=300&X-Amz-Signature=f4659696f17f619d1d42bfc0a78d998c12c34506475983eb523f150a22a4ce51&X-Amz-SignedHeaders=host&actor_id=0&repo_id=108337180&response-content-disposition=attachment%3B%20filename%3Drke_linux-amd64&response-content-type=application%2Foctet-stream
Resolving github-production-release-asset-2e65be.s3.amazonaws.com... 52.216.65.240
Connecting to github-production-release-asset-2e65be.s3.amazonaws.com|52.216.65.240|:443... failed: Operation timed out.
Retrying.
```


##### 2. 使用rancher部署custom集群时，从dockerhub pull image非常慢，时间都浪费在pull image上
![down-image](https://tva1.sinaimg.cn/large/007S8ZIlly1gejpohuwy9j31cm09aglt.jpg)

如果查看`rancher/rancher`日志，会得到一些正在下载rancher images的日志，而且经常会出现timeout的情况。
```
2020/05/07 03:06:27 [INFO] Pulling image [rancher/rke-tools:v0.1.56] on host [172.17.206.119], try #1
2020/05/07 03:09:16 [INFO] Pulling image [rancher/hyperkube:v1.17.5-rancher1] on host [172.17.206.119], try #1
2020/05/07 03:09:16 [INFO] cluster [c-zfz4g] provisioning: Pre-pulling kubernetes images
```

##### 3. Rancher启动后，无法使用`library`和`system-library`，导致应用商店无法使用

![](https://tva1.sinaimg.cn/large/007S8ZIlly1gejq7wg5jcj31rv0u0763.jpg)

`rancher/rancher`日志会显示一些关于`git.rancher.io timeout`的错误日志：
```
2020/05/07 03:31:31 [ERROR] CatalogController helm3-library [catalog] failed with : Remote commit check failed: Repo [https://git.rancher.io/helm3-charts] is not accessible: Get https://git.rancher.io/repos/helm3-charts/commits/master: net/http: request canceled (Client.Timeout exceeded while awaiting headers)
2020/05/07 03:31:33 [ERROR] CatalogController library [catalog] failed with : Remote commit check failed: Repo [https://git.rancher.io/charts] is not accessible: Get https://git.rancher.io/repos/charts/commits/master: net/http: request canceled (Client.Timeout exceeded while awaiting headers)
2020/05/07 03:31:34 [ERROR] CatalogController system-library [catalog] failed with : Remote commit check failed: Repo [https://git.rancher.io/system-charts] is not accessible: Get https://git.rancher.io/repos/system-charts/commits/release-v2.4: net/http: request canceled (Client.Timeout exceeded while awaiting headers)
```

这些是从Rancher社区中总结的常见问题，主要的原因是国内用户访问github或dockerhub慢导致，这严重影响到了我们在国内使用Rancher的体验。

## 如何解决
作为时间就是金钱的现代人，这种问题是不可容忍的。为了解决以上问题，我们将一些资源mirror到了国内，并且提供给国内用户使用，下面就根据不同的场景一一介绍如何使用这些资源。

#### 场景1：使用国内资源下载Rancher组件
国内用户可以直接到 http://mirror.cnrancher.com 去下载Rancher的常用组件。此服务器在国内，所以下载速度可以用`MB/s`来计算，从此告别那该死的`failed: Operation timed out`

先上个图，欢迎大家体验这飞一般的感觉……
![rancher-mirror](https://tva1.sinaimg.cn/large/007S8ZIlly1gejvtmh6w3j31sx0u0q3j.jpg)

#### 场景2：使用阿里云镜像仓库搭建Rancher
我们已经在阿里云镜像仓库中同步了一份原版的镜像，仓库地址: `registry.cn-hangzhou.aliyuncs.com`

> 注意：阿里云镜像仓库中的rancher镜像不支持使用 `latest` `stable`等tags，必须指定版本号，例如`v2.4.2`

那怎么使用阿里云的镜像仓库去搭建rancher呢？下面的demo演示了应该如何操作：

1. 使用阿里云镜像仓库的rancher镜像启动rancher

```
# docker run -itd -p 80:80 -p 443:443 \
    --restart=unless-stopped \
    -e CATTLE_AGENT_IMAGE="registry.cn-hangzhou.aliyuncs.com/rancher/rancher-agent:v2.4.2" \
    registry.cn-hangzhou.aliyuncs.com/rancher/rancher:v2.4.2
```
- `CATTLE_AGENT_IMAGE:` 指定rancher-agent的镜像名称

2. 设置默认镜像仓库

从UI导航到`Settings`，然后编辑`system-default-registry`，Value设置为`registry.cn-hangzhou.aliyuncs.com`

![system-registry](https://tva1.sinaimg.cn/large/007S8ZIlly1gek021xwzij31tq0k8gm1.jpg)

- `system-default-registry:` 参数请参考[官方文档](https://rancher2.docs.rancher.cn/docs/admin-settings/config-private-registry/_index/#%E5%B0%86%E4%B8%8D%E9%9C%80%E8%A6%81%E8%AE%A4%E8%AF%81%E7%9A%84%E7%A7%81%E6%9C%89%E9%95%9C%E5%83%8F%E4%BB%93%E5%BA%93%E8%AE%BE%E7%BD%AE%E4%B8%BA%E9%BB%98%E8%AE%A4%E9%95%9C%E5%83%8F%E4%BB%93%E5%BA%93)


1. 接下来我们就可以按照官方文档去[添加自定义集群](https://rancher2.docs.rancher.cn/docs/cluster-provisioning/rke-clusters/custom-nodes/_index)，我们只需要等待集群启动成功即可。下图中列出了system-project中所有的workload，这些workload均使用了阿里云的镜像仓库`registry.cn-hangzhou.aliyuncs.com`内的镜像
![](https://tva1.sinaimg.cn/large/007S8ZIlly1gejx15bo0yj313f0u00y5.jpg)

整个集群搭建完成，大概需要3-5分钟的时间，再次体验掉了飞的感觉……

#### 场景3：使用码云代替github

Rancher默认使用github上的repo作为应用商店的URL，如果出现`timeout`情况，可以将`Catalog URL`替换成我们国内的码云地址。

每个repo的对应关系如下：

| 应用商店地址 | Rancher repo地址 | Gitee地址 |
| --- | --- | --- |
| https://git.rancher.io/helm3-charts | https://github.com/rancher/helm3-charts | https://gitee.com/rancher/helm3-charts | 
| https://git.rancher.io/charts  | https://github.com/rancher/charts  | https://gitee.com/rancher/charts  |
| https://git.rancher.io/system-charts  | https://github.com/rancher/system-charts  |  https://gitee.com/rancher/system-charts |

**如何修改`Catalog URL`：**
1. 导航到全局或项目级别的`Apps` -> `Manage Catalogs` 
2. 点击列表右侧的省略号 -> `Edit`
3. 将`Catalog URL`替换成码云中的地址即可，`Save`
4. 此时，对应的Catalog的状态变为了`Refreshed`，等待变为`Active`之后即可正常使用

#### 场景4：修改`rke-metadata-config`
每次启动Rancher都会到github上拉取[kontainer-driver-metadata](https://github.com/rancher/kontainer-driver-metadata.git)，如果拉取的慢，会导致创建在创建自定义集群时`Kubernetes Version`显示为空：
![](https://tva1.sinaimg.cn/large/007S8ZIlly1get57kqscwj31nk0jo0t6.jpg)

要解决这个问题只需要参考[获取新的 Kubernetes 版本](https://rancher2.docs.rancher.cn/docs/admin-settings/k8s-metadata/_index)将rke-metadata-config地址修改成[gitee](https://gitee.com/rancher/kontainer-driver-metadata/)上的地址即可，例如：
```
{
  "refresh-interval-minutes": "1440",
  "url": "https://gitee.com/rancher/kontainer-driver-metadata/raw/dev-v2.4/data/data.json"
}
```
> 注意:
> 修改`rke-metadata-config`地址时，需要对应版本号，一定要和默认地址中的版本号对应上，本例的版本号是`v2.4`。


#### 同步说明
以上提到的这些国内资源，都是通过定时任务每天从国外去拉取，然后同步到国内，可能有延迟或同步失败的情况。如果发现任何问题，请及时在微信群中反馈给我们。