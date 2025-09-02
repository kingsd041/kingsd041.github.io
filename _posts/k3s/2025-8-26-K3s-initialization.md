---
layout: post
title: K3s 启动为什么这么快？带你深度解析初始化流程
subtitle: 很多人第一次用 K3s 的时候，都会惊讶：集群居然这么快就跑起来了！背后到底发生了什么？本文将从 内置组件 到 启动顺序，带你深入剖析 K3s 的初始化过程，看看它如何做到轻量与高效的完美结合。
date: 2025-8-26 11:08:00 +0800
author: Ksd
header-img: img/post-bg-debug.jpg
catalog: true
tags:
  - K3s
  - 安装
---

K3s 是一个轻量级的 Kubernetes 发行版，以其快速的部署速度和极低的资源占用而闻名。事实上，很多用户喜爱 K3s，正是因为它带来了无与伦比的初始化速度。

这篇文章将带你深入了解 K3s 高效运行的核心：初始化过程。我们将逐步解析 K3s 如何在极短时间内启动并运行一个功能完整的 Kubernetes 集群。通过对 K3s 启动日志的剖析，你将更直观地理解每个步骤背后的含义。这不仅能帮助你更好地了解 K3s 的工作原理，还能为你在日常部署和故障排查中提供参考。


## 内置的强力引擎 ⚙️⚡

K3s 使用 **go-bindata** 将关键的 Linux 用户态二进制文件和 manifests 直接打包进可执行文件中。这一设计消除了外部依赖，简化了部署流程。在 K3s 的二进制文件中，你可以找到核心组件，例如 **runc** 和 **containerd**，以及一个 `k3s-root` 压缩包（如 `k3s-root-amd64.tar`）。这个压缩包包含了所有运行 K3s 所需的用户态二进制文件，从而减少了对宿主机操作系统的依赖。如果你希望所有内置的二进制文件优先于宿主机的文件，可以通过 `--prefer-bundled-bin` 参数来实现。

这些内置的二进制文件部署在同一个目录：`/var/lib/rancher/k3s/data`。在这个目录下，你至少会看到三个子目录：**cni**、**current** 以及一个由长字符串（SHA 值）命名的目录。这个长字符串是在构建 K3s 时由内置二进制文件压缩包运行 `sha256sum` 后生成的，因此每个版本都不同。如果你进行了升级操作，还会同时存在两个这样的目录。

其中：

* **current** 是指向该 SHA 目录的符号链接。
* **cni** 目录包含了不同的 CNI 插件，同样是指向 SHA 目录中 CNI 二进制文件的符号链接。K3s 使用了 multi-exec 工具，将所有 CNI 插件构建到一个二进制文件中，从而进一步节省资源。
* 如果当前 K3s 集群经历过升级，你还会看到一个 **previous** 符号链接，指向上一个版本对应的 SHA 目录。

例如：

```
$> ls -ahltr /var/lib/rancher/k3s/data/
total 24K
-rw------- 1 root root    0 Mar 19 06:22 .lock
drwxr-xr-x 4 root root 4.0K Mar 19 06:22 ..
drwxr-xr-x 4 root root 4.0K Mar 19 06:28 82142f5157c67effc219aeefe0bc03e0460fc62b9fbae9e901270c86b5635d53
lrwxrwxrwx 1 root root   90 Mar 19 06:28 previous -> /var/lib/rancher/k3s/data/82142f5157c67effc219aeefe0bc03e0460fc62b9fbae9e901270c86b5635d53
drwxr-xr-x 4 root root 4.0K Mar 19 06:30 b13851fe661ab93938fc9a881cdce529da8c6b9b310b2440ef01a860f8b9c3a9
lrwxrwxrwx 1 root root   90 Mar 19 06:30 current -> /var/lib/rancher/k3s/data/b13851fe661ab93938fc9a881cdce529da8c6b9b310b2440ef01a860f8b9c3a9
drwxr-xr-x 2 root root 4.0K Mar 19 06:30 cni
drwxr-xr-x 4 root root 4.0K Mar 19 06:40 .
```

此外，K3s 还内置了 Helm Chart 和 manifests，用于部署关键服务，如 **CoreDNS**、**Traefik** 和 **local storage**。这些以 yaml 文件形式存在的内置清单文件位于控制平面节点的目录：

```
/var/lib/rancher/k3s/server/manifests
```

仅仅一个 **70+MB** 的 K3s 二进制文件，就包含了如此丰富的内容！


## 启动流程逐步解析 👣

既然我们已经了解了 K3s 内置了哪些工具，接下来让我们看看它是如何启动的。以下是通过 `journalctl` 查看 K3s server 节点启动时的典型日志：

首先是：

```
Starting Lightweight Kubernetes...
```

接着：

```
/usr/bin/systemctl is-enabled --quiet nm-cloud-setup.service
```

这里检查的是 **NetworkManager** 的某个服务是否已被禁用。它会修改部分网络栈配置（尤其是路由表），与 Kubernetes 的网络机制冲突，因此 K3s 启动时必须确认它是否关闭。

随后：

```
Acquiring lock file /var/lib/rancher/k3s/data/.lock
Preparing data dir /var/lib/rancher/k3s/data/f8e9b5e7d85085972f4a9ddfd539d4dcf887be2e380a55f415c93cac5516dad5
```

此时，存放内置二进制文件的目录已经被创建。K3s 会在这里解压二进制文件，同时利用锁文件防止并发修改，避免在初始化过程中执行 `kubectl` 或 `ctr` 之类的命令干扰流程。

接下来是版本和数据存储的相关日志。例如，默认情况下 K3s 使用 **kine + sqlite**：

```
Starting k3s v1.32.2+k3s1
Configuring sqlite3 database connection pooling: maxIdleConns=2, maxOpenConns=0, connMaxLifetime=0s
Configuring database table schema and indexes, this may take a moment...
Database tables and indexes are up to date
Kine available at unix://kine.sock
```

一旦数据存储准备就绪，K3s 会锁定 **bootstrap key**。在高可用模式下，这一步尤为重要，因为它可以避免多个控制平面节点重复生成 CA 证书。

```
Bootstrap key locked for initial create
```

接下来，K3s 会生成内部通信所需的 **TLS 证书**：

```
generated self-signed CA certificate
certificate CN=system:admin,O=system:masters signed by CN=k3s-client-ca@1742309831
certificate CN=system:k3s-supervisor,O=system:masters signed by CN=k3s-client-ca@1742309831
certificate CN=system:kube-controller-manager signed by CN=k3s-client-ca@1742309831
...
certificate CN=k3s,O=k3s signed by CN=k3s-server-ca@1742309831
```

然后将 bootstrap 数据写入数据存储（非 HA 模式下不影响运行）：

```
Saving cluster bootstrap data to datastore
```

紧接着，K3s 启动 Kubernetes 核心组件。这些组件都以内置 **goroutine** 的形式在 K3s 进程中运行，这不仅减少了资源占用，也进一步缩短了启动时间：

```
Running kube-apiserver
Running kube-scheduler
Running kube-controller-manager
```

随后，K3s 会将打包好的组件清单文件提取到：

```
/var/lib/rancher/k3s/server/manifests/
```

当核心组件全部运行后，**deploy controller** 会监控该目录，并自动应用这些 manifests，从而完成 **CoreDNS**、**Traefik** 等关键服务的安装。

至此，一个完整的 Kubernetes 集群就已经在极短的时间内启动完成 🎉

## 总结 🏁

通过本文，我们解析了 K3s 在初始化过程中所执行的关键步骤。从日志入手，不仅揭开了 K3s 速度背后的秘密，也帮助你更深入地理解其运行机制。希望这些内容能对你在日常部署和排错中有所帮助。

