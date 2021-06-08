---
layout: post
title: 关于单节点Rancher Server证书过期
subtitle:
date: 2021-6-2 21:07:00 +0800
author: Ksd
header-img: img/post-bg-desk.jpg
catalog: true
tags:
  - Rancher
  - 证书
---

今天我们来聊聊单节点安装的 Rancher 的证书问题，其实这个问题从去年（2020 年）就已经暴露出来了，因为 Rancher 2.3 的首个版本是 2019 年 10 月 8 日发布的，到 2020 年的 10 月份正好满一年，说到这里，真挺佩服我们国内用户的尝鲜精神。

那么单节点安装的 Rancher 的证书过期会是什么现象呢：

1. Rancher UI 无法访问
2. Rancher Server 日志报错：`x509: certificate has expired or is not yet valid`
3. Rancher Server 反复重启（如果你在启动 rancher 时加了 `--restart` 参数）

此时，你无法继续再通过 Rancher UI 去操作集群，有许多用户就会认为整个集群都挂掉了，莫慌，其实并不是这样。Rancher 的设计是分离式的，也就是说 Rancher Server 挂掉，根本不会影响你创建的业务集群，你可以继续通过`kubectl`操作你的业务集群，而且你的 pod 等业务不会有任何变动。

## 原因

Rancher 官网明确指出 Rancher v2.3 以上的版本 **会自动检查证书有效期，如果发现证书即将过期，将会自动生成新的证书**，那为什么会出现上述的情况呢，其实这是 K3s 的一个 bug 引起的。

Rancher Server 内置了一个 K3s 集群作为 local 集群，也就是说通过`docker run ... rancher/rancher:version` 启动的 Rancher，在容器里其实已经内置了一个 K3s 用来支撑 Rancher 的运行。

这里再简单说下 K3s 的证书逻辑，**K3s 证书有效期默认也是一年，如果证书已经过期或剩余的时间不足 90 天，则在 K3s 重启时轮换证书**。但在 K3s v1.19.1 之前的版本中，由于 BUG(https://github.com/k3s-io/k3s/issues/1621)，导致K3s无法自动轮转证书。

Rancher v2.3+ 和 v2.4+ 内置的 K3s 版本分别是`1.17.x`和`1.18.x`，所以说由于内置的 k3s 影响到了 Rancher Server 的证书轮转，因为当 Rancher 证书过期后，会自动重启 Rancher Server 的重启，然后触发内置 K3s 的更新，此时，K3s 证书更新失败，所以，Rancher Server 就无法启动。

## 手动轮转证书

### 2.3.x

```
docker exec -ti <rancher_server_id> mv /var/lib/rancher/k3s/server/tls /var/lib/rancher/k3s/server/tlsbak
# 执行两侧，第一次用于申请证书，第二次用于加载证书并启动
docker restart <rancher_server_id>
```

### 2.4.x 和 2.5.x 

**1. `docker exec` 到 Rancher Server 容器内，执行：**

```
kubectl --insecure-skip-tls-verify -n kube-system delete secrets k3s-serving
kubectl --insecure-skip-tls-verify delete secret serving-cert -n cattle-system
rm -f /var/lib/rancher/k3s/server/tls/dynamic-cert.json
```

**2. 重启 rancher-server**

**3. 将 rancher ip 重新注入到新证书中，否则业务集群 agent 连接 Rancher Server 会有问题**

```
curl --insecure -sfL https://server-url/v3
```

## 后记

Rancher v2.5.8 通过把内置的 K3s 集群更新到`v1.20`解决了这个问题。无论是新安装的，还是从老版本升级到 v2.5.8 的单节点 Rancher，都不会再被证书过期所困扰。

其实非常不建议大家在生产上用单节点安装，如果机器不够用，可以先用 rke 或 k3s 启动一个单节点的 local 集群，然后通过 helm 将 Rancher 部署到这个 local 集群上，这样即不占用过多机器，也可以为后期扩展打好基础。
