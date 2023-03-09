---
layout: post
title: K3s 修改 CoreDNS 配置，持久生效
subtitle:
date: 2023-3-5 21:06:00 +0800
author: Ksd
header-img: img/post-bg-desk.jpg
catalog: true
tags:
  - K3s
  - CoreDNS
---

K3s 启动后，会自动帮我们安装好 CoreDNS，不需要手动安装。如果你想修改 CoreDNS 的配置，常用的有两种方式：

- 直接修改 CoreDNS 的 configmap 来调整 CoreDNS 的参数，例如：`kubectl -n kube-system edit configmap coredns`
- 修改 K3s manifests 中的 CoreDNS 配置文件，文件位置：`/var/lib/rancher/k3s/server/manifests/coredns.yaml`

这两种方式虽然简单，但都有相同的弊端：当你重启 K3s 服务或者升级 K3s 时，由于 K3s 会重新初始化 manifests 中的 CoreDNS 等配置，所以会覆盖掉你通过以上两种方式修改的 coredns 配置。

如果你想修改 K3s 中 CoreDNS 中的配置，并且持久生效的话，可以通过额外的 `coredns-custom` configmap 安装到 CoreDNS 容器中，并从包含的文件中导入覆盖和额外的 CoreDNS 配置。

下面是一个示例，可以在 CoreDNS 中通过 hosts plugin 添加域名映射记录：

```
# cat host.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: coredns-custom
  namespace: kube-system
data:
  demo.server: |
    test.kingsd.top {
      hosts {
        127.0.0.1 test.kingsd.top
      }
    }
```

> 注意：
> ConfigMap 的 name 一定刚要是 `coredns-custom` 才能够被 coredns 的 deployment 识别并挂载。

可通过查看 coredns pod 的日志来确认配置是否被重现加载并生效：

```
root@k3s1:~/coeredns# kubectl -n kube-system logs -f coredns-597584b69b-5lpfl
[WARNING] No files matching import glob pattern: /etc/coredns/custom/*.server
.:53
[WARNING] No files matching import glob pattern: /etc/coredns/custom/*.server
[INFO] plugin/reload: Running configuration SHA512 = b941b080e5322f6519009bb49349462c7ddb6317425b0f6a83e5451175b720703949e3f3b454a24e77f3ffe57fd5e9c6130e528a5a1dd00d9000e4afd6c1108d
CoreDNS-1.9.4
linux/amd64, go1.19.1, 1f0a41a
[WARNING] No files matching import glob pattern: /etc/coredns/custom/*.server
[INFO] Reloading
[INFO] plugin/reload: Running configuration SHA512 = 1b52ff608bf13ce36aecfb99d526714404a5e7f5e257fb01d1778e125d758ad03854dfd57e00f809da3d774f72e55e1c9f35cd4087024d98a6ca1b58ff631a43
[INFO] Reloading complete
```

最后，在其他 pod 中验证 CoreDNS 的配置是否生效：

```
root@k3s1:~# kubectl exec -it nginx-deployment-7588dc757d-krt5k bash
root@nginx-deployment-7588dc757d-krt5k:/# ping test.kingsd.top
PING test.kingsd.top (127.0.0.1) 56(84) bytes of data.
64 bytes from localhost (127.0.0.1): icmp_seq=1 ttl=64 time=0.033 ms
^C
--- test.kingsd.top ping statistics ---
1 packets transmitted, 1 received, 0% packet loss, time 0ms
rtt min/avg/max/mdev = 0.033/0.033/0.033/0.000 ms
```

参考：

- https://github.com/k3s-io/k3s/pull/4397
- https://github.com/k3s-io/k3s/issues/5312#issuecomment-1072930172
