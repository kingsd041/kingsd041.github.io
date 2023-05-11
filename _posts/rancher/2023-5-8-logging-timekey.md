---
layout: post
title: rancher-logging：如何控制 fluentd 的日志刷新频率
subtitle: PodSecurityPolicy API 在 Kubernetes v1.25 中被完全删除，本文将介绍如何将下游集群升级到 1.25
date: 2023-5-4 11:07:00 +0800
author: Ksd
header-img: img/post-bg-desk.jpg
catalog: true
tags:
  - Rancher
---

默认情况下，rancher-logging 中的 fluentd 每 11 分钟刷新一次日志，因为 timekey 默认为 10 分钟，timekey_wait 设置为 1 分钟。

```
 <buffer tag,time>
      @type file
      chunk_limit_size 8MB
      path /buffers/clusterflow:cattle-logging-system:test-es-flow-1:clusteroutput:cattle-logging-system:test-es-1.*.buffer
      retry_forever true
      timekey 10m
      timekey_wait 1m
    </buffer>
```

这两个参数可以用来管理 fluentd 刷新日志的频率。 timekey 指定应按块分组的日志的时间范围。 timekey 为 10m 时，chunk 将包含 10 分钟时间范围内的日志。

示例：timekey 10m：`["12:00:00", ..., "12:09:59"]`, `["12:10:00", ..., "12:19:59"]`

`timekey_wait` 配置事件的刷新延迟。下面是一个例子来说明这一点

## timekey 10m

time range for chunk | timekey_wait | actual flush time
12:00:00 - 12:09:59  | 60s          | 12:11:00

这两个参数将在 output/clusteroutput 级别指定，以管理来自 fluentd 的日志刷新频率。在创建时，你有一个名为输出缓冲区的部分（Logging > Output > Create > Output Buffer 或 Logging > ClusterOutput > Create > Output Buffer）可以在其中更改，或者如果你使用的是 kubectl 命令行，则可以更新缓冲区如下例所示：

```
<buffer tag,time>
      @type file
      chunk_limit_size 8MB
      path /buffers/clusterflow:cattle-logging-system:test-es-flow-1:clusteroutput:cattle-logging-system:test-es-1.*.buffer
      retry_forever true
      timekey 3m
      timekey_wait 1m
    </buffer>
```
