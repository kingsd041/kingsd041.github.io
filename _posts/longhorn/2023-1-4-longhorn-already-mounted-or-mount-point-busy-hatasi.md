---
layout: post
title: Longhorn “already mounted or mount point busy”
subtitle:
date: 2023-12-7 11:07:00 +0800
author: Ksd
header-img: img/post-bg-debug.jpg
catalog: true
tags:
  - RKE2
  - 迁移
  - 恢复
---

我在 Kubernetes 上使用 Longhorn。Longhorn 为我的数据在 3 个工作节点上提供了一个共享池。数据在各个 Pod 之间同步，不管工作节点如何。在我的当前设置中，Longhorn 安装在外部磁盘上，这就是问题的根本原因。有时，当在 Pods 中使用多个设备或路径时，可能会遇到以下错误：

```
Output: mount: /var/lib/kubelet/pods/cf0a0b5b-106e-4793-a74a-28bfae21be1a/volumes/kubernetes.io~csi/pvc-d061512e-870a-4ece-bd45-2f04672d5256/mount: /dev/longhorn/pvc-d061512e-870a-4ece-bd45-2f04672d5256 already mounted or mount point busy.
```

为了解决这个问题，您可以按照以下步骤进行操作。这些步骤将帮助我们在所有设备上应用黑名单，防止错误发生。

首先，我们使用以下命令打开 multipath.conf 文件：

```
nano /etc/multipath.conf
```

接下来，将以下行添加到文件底部并保存：

```
blacklist {
    devnode "^sd[a-z0-9]+"
}
```

然后，重新启动多路径服务：

```
systemctl restart multipathd.service
```

最后，我们验证我们添加的配置：

```
multipath -t
```

Cheers!
