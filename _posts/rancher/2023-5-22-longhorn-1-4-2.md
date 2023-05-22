---
layout: post
title: Kubewarden 遥测增强发布
subtitle:
date: 2023-5-22 11:07:00 +0800
author: Ksd
header-img: img/post-bg-desk.jpg
catalog: true
tags:
  - Kubewarden
---

我们很高兴地宣布，Kubewarden 组件进行了各种更新、修复和增强！本次发布主要关注于改进 Kubewarden 的遥测功能和依赖更新。

## 遥测增强和修复

Kubewarden 控制器在遥测方面进行了几项修复和改进。包括为用户提供了一个简化的流程，可以部署启用了遥测的策略服务器，以及修复了与控制器可用指标相关的错误。

我们发现了控制器中的一个错误，即未记录 `policy-count` 指标。现在用户可以在他们的仪表板中正确使用该指标来监控集群活动。

此外，控制器现在将所有必要的 `OpenTelemetry` 配置合并到策略服务器的定义中，以启用遥测功能。这意味着用户不再需要为集群中每个部署的策略服务器单独启用遥测。相反，他们可以在 Kubewarden 控制器中启用遥测，然后该配置将适当地传播到所有随后部署的策略服务器。

因此，`kubewarden-defaults` Helm chart 已经更新，其 values 文件中移除了遥测配置。

如果您想了解有关如何在 Kubewarden 上启用遥测的更多信息，请查阅我们的[文档](https://docs.kubewarden.io/operator-manual/telemetry/opentelemetry/quickstart)！
