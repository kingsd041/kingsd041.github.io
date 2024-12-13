---
layout: post
title: Longhorn 的一些笔记
subtitle: Longhorn 的一些笔记
date: 2024-10-8 11:07:00 +0800
author: Ksd
header-img: img/post-bg-debug.jpg
catalog: true
tags:
  - Longhorn
---

## Dashboard 使用空间

### Node

![](https://raw.githubusercontent.com/kingsd041/picture/main/202410081452311.png)

**Size：**

Longhorn 卷可以使用的最大实际可用空间。它等于节点的总磁盘空间减去预留空间。
例如: longhorn-1 节点，系统磁盘为 194G， 挂载盘为 492G，系统盘预留 58.09G，挂载盘预留 20G，所以：`194+492-58.09-20=607.91`

```
/dev/sda1                                                194G   16G  178G   9% /
/dev/sdb                                                 492G   14G  453G   3% /mnt/longhorn-disk-2
```

预留的磁盘大小可以从节点的编辑页面查看。

**Allocated：**

左边的数字是已经用于卷调度的大小，并不代表该空间已经用于 Longhorn 卷数据存储，也就是说创建卷填写的卷的大小。

因为一共创建的了 6 个卷，并且都是三副本，所以每个节点的占用大小都是 62G，如下：
![](https://raw.githubusercontent.com/kingsd041/picture/main/202410081514643.png)

右边的数字是卷调度的最大 Size 大小，是 Size 列的值乘 `Storage Over Provisioning Percentage` 的结果。（本例的超配比例是 100，也就是不超配）

右侧的数字也可以决定是否可以将卷副本调度到此节点。

**Used**

左侧代表节点上磁盘真实占用的空间，包括卷和系统的占用空间。

右侧代表主机的总空间，例如 longhorn-1 节点的总空间为 194+492=686

### Dashboard

Schedulable：Longhorn 卷调度可以使用的实际空间，本例中，607+136+136-29.36-30.66-29.68=789.3

Reserved：为其他应用程序和系统保留的空间，本例中：78.1+58.1+581=194.3

Used：Longhorn、系统和其他应用程序已使用的实际空间，29.36+30.66+29.68=89.7

Disabled：不允许调度 Longhorn 卷的磁盘/节点的总空间。

Total：所有节点主机的磁盘总和，本例中：(684.73+193.65+193.65)/1024=1.0469