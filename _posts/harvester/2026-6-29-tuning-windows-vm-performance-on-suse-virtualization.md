---
layout: post
title: 在 Harvester 上调优 Windows 虚拟机性能
subtitle:
date: 2026-6-29 11:06:00 +0800
author: Ksd
header-img: img/post-bg-desk.jpg
catalog: true
tags:
  - Harvester
---

SUSE Virtualization(Harvester) 是一款云原生的超融合基础设施（HCI）平台解决方案，专为在数据中心、多云以及边缘环境中运行虚拟机和容器工作负载而优化。

这篇文章重点聊聊在 SUSE Virtualization 上给 Windows 虚拟机做性能调优这件事——毕竟 Windows 客户机要想发挥出全部实力，往往得再多花点心思。我们会逐一过一遍对性能影响最大的几个调优参数，并附上实测结果。

## SUSE Virtualization 中的 Windows 虚拟机

SUSE Virtualization 用 KubeVirt 作为虚拟化层，在 Kubernetes 之上统一管理虚拟机。至于怎么在 SUSE Virtualization 上创建并跑起一台 Windows 虚拟机，可以参考[在 SUSE Virtualization 上运行 Windows 虚拟机](https://docs.harvesterhci.io/v1.8/vm/create-windows-vm "在 SUSE Virtualization 上运行 Windows 虚拟机") 这篇文档。建好之后，再按本文里的建议调一调，性能还能进一步拉满。

## Windows 虚拟机的驱动程序

Windows 是非常常见的虚拟机客户机系统，但它得装上专门的驱动才能识别块设备，比如 VirtIO / VirtIO SCSI。SUSE 为此提供了 VMDP（Virtual Machine Driver Pack for Microsoft Windows，即 Windows 虚拟机驱动包）。具体怎么装，可以翻一下 [VMDP 安装指南](https://documentation.suse.com/en-us/sle-vmdp/2.5/pdf/vmdp_en.pdf "VMDP 安装指南")。

## 影响 Windows 虚拟机性能的因素

在 SUSE Virtualization 上，影响 Windows 虚拟机性能的因素有不少，最关键的几个是 **磁盘驱动**、**CPU 型号**、**Hyper-V 配置** 以及 **IOThreads**。把这几项调好，Windows 虚拟机的性能差距就能明显拉开。

### 磁盘驱动

Windows 虚拟机最常用的磁盘驱动就两种：VirtIO 和 VirtIO SCSI。VirtIO 是半虚拟化驱动，性能更佳；VirtIO SCSI 主要用在热插拔设备上，调优之后表现也不差。

在虚拟机 spec 里，磁盘设备对应的配置大概长这样：

```yaml
# SCSI 驱动
devices:
  - disk:
      bus: scsi
    name: vol001
```

```yaml
# VirtIO 驱动
devices:
  - disk:
      bus: virtio
    name: vol001
```

两种驱动的实测结果见下表：

#### 性能

| 测试项 | SCSI | VirtIO |
| --- | --- | --- |
| 顺序写 128K | 551.5 MB/s | 544.0 MB/s |
| 顺序读 128K | 1,397.6 MB/s | 1,422.1 MB/s |
| 随机写 4K | 28,240 IOPS | 45,226 IOPS |
| 随机读 4K | 31,093 IOPS | 36,296 IOPS |
| 随机混合 4K（60% 读 / 40% 写） | 29,479 IOPS | 37,672 IOPS |

#### 延迟

| 测试项 | SCSI | VirtIO |
| --- | --- | --- |
| 顺序写 128K | 232.06 ms | 235.28 ms |
| 顺序读 128K | 91.55 ms | 90.00 ms |
| 随机写 4K | 31.46 ms | 22.61 ms |
| 随机读 4K | 30.55 ms | 28.19 ms |
| 随机混合 4K（60% 读 / 40% 写） | 31.16 ms | 27.16 ms |

### CPU 型号

CPU 型号方面，建议直接用 host-passthrough 模式，性能最好。这种模式下，虚拟机能直接用上宿主机暴露出来的全部 CPU 特性，对某些工作负载的提速相当明显。

### Hyper-V 增强功能

Hyper-V 增强功能（enlightenments）是微软的一套机制，能让 Windows 在 hypervisor 上跑得更省心——开启之后，Windows 可以更顺手地利用底层硬件，性能自然跟着上来。KubeVirt 同样支持这些特性，直接在虚拟机 spec 里就能打开。详细说明可以看[官方文档](https://kubevirt.io/user-guide/user_workloads/guest_operating_system_information/ "KubeVirt Hyper-V 官方文档")。

在虚拟机 spec 里开启 Hyper-V 增强功能，对应的配置如下：

```yaml
domain:
  clock:
    timer:
      hyperv: {}
  features:
    hyperv:
      ipi: {}
      relaxed: {}
      reset: {}
      runtime: {}
      spinlocks:
        spinlocks: 8191
      synic: {}
      synictimer: {}
      vapic: {}
      vpindex: {}
```

在 UI 里点「edit yaml」编辑虚拟机 spec，把上面这段加进去就能启用 Hyper-V 增强功能，操作如下图：

![](https://www.suse.com/c/wp-content/uploads/2026/05/hyperv_clocks-1024x42.png)

![](https://www.suse.com/c/wp-content/uploads/2026/05/hyperv_features-1024x144.png)

#### 性能

| 测试项 | SCSI | SCSI + Hyper-V enlightenments | VirtIO | VirtIO + Hyper-V enlightenments |
| --- | --- | --- | --- | --- |
| 顺序写 128K | 551.5 MB/s | 564.4 MB/s | 544.0 MB/s | 557.2 MB/s |
| 顺序读 128K | 1,397.6 MB/s | 1,430.8 MB/s | 1,422.1 MB/s | 1,419.3 MB/s |
| 随机写 4K | 28,240 IOPS | 43,618 IOPS | 45,226 IOPS | 44,206 IOPS |
| 随机读 4K | 31,093 IOPS | 36,694 IOPS | 36,296 IOPS | 36,627 IOPS |
| 随机混合 4K（60% 读 / 40% 写） | 29,479 IOPS | 38,231 IOPS | 37,672 IOPS | 37,996 IOPS |

#### 延迟

| 测试项 | SCSI | SCSI + Hyper-V enlightenments | VirtIO | VirtIO + Hyper-V enlightenments |
| --- | --- | --- | --- | --- |
| 顺序写 128K | 232.06 ms | 226.78 ms | 235.28 ms | 229.70 ms |
| 顺序读 128K | 91.55 ms | 89.45 ms | 90.00 ms | 90.18 ms |
| 随机写 4K | 31.46 ms | 23.47 ms | 22.61 ms | 23.16 ms |
| 随机读 4K | 30.55 ms | 27.90 ms | 28.19 ms | 27.95 ms |
| 随机混合 4K（60% 读 / 40% 写） | 31.16 ms | 26.78 ms | 27.16 ms | 26.95 ms |

### IOThreads 与 MultiQueue

> IOThreads 只能搭配 VirtIO 使用。SCSI 设备走的是 SCSI 控制器，而 KubeVirt 目前还不支持给 SCSI 控制器挂 IOThreads。

IOThreads 会用专门的线程去处理 I/O，对 I/O 密集型负载很有帮助。KubeVirt 支持几种不同的 IOThread 策略，细节可以看[官方文档](https://kubevirt.io/user-guide/storage/disks_and_volumes/ "KubeVirt 磁盘与卷官方文档")。

我们的建议是：用 supplementalPool 策略，同时打开 Block Multi-Queue，性能还能更进一步。

在虚拟机 spec 里同时开启 IOThreads 和 MultiQueue，配置如下：

```yaml
spec:
  domain:
    ioThreadsPolicy: supplementalPool
    ioThreads:
      SupplementalPoolThreadCount: 4
  devices:
    - disk:
        bus: virtio
      multiQueue: true
      name: vol001
```

#### 性能

| 测试项 | VirtIO + Hyper-V enlightenments | VirtIO + Hyper-V enlightenments + SupplementalPool |
| --- | --- | --- |
| 顺序写 128K | 557.2 MB/s | 563.2 MB/s |
| 顺序读 128K | 1,419.3 MB/s | 1,428.7 MB/s |
| 随机写 4K | 44,206 IOPS | 43,397 IOPS |
| 随机读 4K | 36,627 IOPS | 37,006 IOPS |
| 随机混合 4K（60% 读 / 40% 写） | 37,996 IOPS | 38,236 IOPS |

#### 延迟

| 测试项 | VirtIO + Hyper-V enlightenments | VirtIO + Hyper-V enlightenments + SupplementalPool |
| --- | --- | --- |
| 顺序写 128K | 229.70 ms | 227.28 ms |
| 顺序读 128K | 90.18 ms | 89.59 ms |
| 随机写 4K | 23.16 ms | 23.59 ms |
| 随机读 4K | 27.95 ms | 27.67 ms |
| 随机混合 4K（60% 读 / 40% 写） | 26.95 ms | 26.78 ms |

可能有人会问：开了 IOThreads 和 MultiQueue，怎么没看到明显提升？原因很简单——这次测试只有一个磁盘，没有别的磁盘来抢 IOThread，所以差异不大。换成多磁盘的场景，效果就会明显得多。

### 性能结果汇总

![](https://www.suse.com/c/wp-content/uploads/2026/05/Seq_mbs.png)

![](https://www.suse.com/c/wp-content/uploads/2026/05/Rand_iops.png)

![](https://www.suse.com/c/wp-content/uploads/2026/05/Avg_latency.png)

## 结论

从结果来看，选对磁盘驱动、打开 Hyper-V 增强功能、再配上 IOThreads，SUSE Virtualization 上 Windows 虚拟机的性能会有肉眼可见的提升。VirtIO 和 VirtIO SCSI 在调优之后其实不相上下；但到了多磁盘场景，VirtIO 因为支持 IOThreads 和 MultiQueue，性能会更高一筹。所以我们的建议是：在 SUSE Virtualization 上，Windows 虚拟机的磁盘驱动优先选 VirtIO，同时开启 Hyper-V 增强功能和 IOThreads，性能最佳。

总结一下，下面两种组合就是 SUSE Virtualization 上调优 Windows 虚拟机的最佳实践：

- VirtIO SCSI + Hyper-V enlightenments
- VirtIO + Hyper-V enlightenments + IOThreads

## 附录：测试环境与工具

- 基准测试工具：DISKSPD v2.2
- Windows 版本：Windows Server 2022
- SUSE Virtualization 版本：SUSE Virtualization 1.8.0
- KubeVirt 版本：KubeVirt 1.7.0
- Longhorn 版本：Longhorn v1.11.1
- CPU：INTEL(R) XEON(R) SILVER 4509Y
- SSD：VK000960KYDPT 960GB NVMe SSD
