---
layout: post
title: 告别卡顿与等待，Rancher Vai 让集群操作“秒响应”
subtitle: 有时候，创新不只是功能更多，而是让等待更少。Rancher Vai，让每一次操作都快得刚刚好。
date: 2025-10-10 11:06:00 +0800
author: Ksd
header-img: img/post-bg-desk.jpg
catalog: true
tags:
  - Rancher
  - Vai
---

如果你正用 Rancher 在大规模环境中管理 Kubernetes，那么你一定知道，UI 性能不只是“锦上添花”——它对效率至关重要。Rancher 团队一直在不断努力提升平台在更复杂环境下的处理能力。

在这篇文章里，我们将深入探讨一个令人兴奋、正不断演进的改进项目：代号为 “Vai”（也称 UI 服务器端分页或基于 SQLite 的缓存）。目标是让你在使用 Rancher 时拥有更流畅、更快速、更具可扩展性的体验，尤其在你要管理大量 Kubernetes 资源的场景下。正因如此，Rancher 团队构建了 Vai 项目，该项目现已成为 [SUSE Rancher Prime](https://www.suse.com/products/rancher/ "SUSE Rancher Prime") 中的一项生产就绪功能。

Rancher Prime 的 Vai 引擎通过重新设计数据流向 UI 的方式，实现更快、更可靠的 Kubernetes 管理。这保证了企业能够更顺畅地管理大型复杂环境，同时降低成本、提高效率。 

* 更快更顺畅的 Rancher UI — 提升效率
* 减轻 Kubernetes API 服务器的压力 — 保持集群健康、提升性能
* 默认启用加密的安全缓存 — 保护敏感数据
* 可扩展的基础设施 — 随环境增长而扩展，并为未来洞察提供可能

## 问题所在：规模如何影响 UI 性能

随着 Rancher 部署规模的扩大，管理海量集群、节点及其内部资源成为常态。我们明确听到了用户的反馈：UI 性能，尤其是 Rancher Dashboard 的响应，在某些极限场景下已成为瓶颈。 

为应对这一挑战，我们为 Rancher 的性能设定了一些目标。比如，为了保证 UI 在极端规模场景下也能正常应对，我们将一个基准目标设为：对某一种资源（以载荷 1MiB 的 ConfigMap 为例），能够分页显示数万个条目；在最坏情况下，分页结果从 API 返回时间不超过 0.5 秒，以便最终渲染在 1 秒之内完成。 

这些数字并不仅仅是理论目标；它们映射了真实场景中的痛点：一个迟缓的 UI 会妨碍你有效地管理和监控 Kubernetes 环境。正如我们在内部所说：“当 Dashboard 无法达到用户期望时，用户对 Rancher 的印象就会变差，使用效率也会降低。” 这正是我们决心解决的关键痛点。 

问题的核心通常归结于 UI 如何获取与处理大量 Kubernetes 对象列表。将数千个项（如 Pod、Deployment 或其他资源）拉入浏览器端进行缓存、排序与过滤，会对网络、浏览器内存造成压力，并导致明显延迟。此外，这样的操作会对 Kubernetes API Server 造成过度负载，从而对被管理集群产生负面影响。 

因此，我们知道，必须设计一种更智能、更高效的数据交付方式给 UI。

## 解决方案：Vai 如何带来更快、可扩展的 UI

这正是 “Vai” 问世的原因。这个项目不仅仅是一次小优化，而是对 Rancher 内部 API（名为 Steve）如何向 UI 提供资源、以及其如何在大规模场景下与 Kubernetes 数据交互的根本性重构。 

Vai 的主要目标是在服务器端实现高效的分页、过滤和排序。与其将庞大的数据集拉到浏览器端再处理，不如让服务器端先行处理这些操作，只将必要、已经处理过的那一页数据发送给 UI。 

核心思路是构建一个位于 Kubernetes API Server 和 Rancher UI 之间的强大缓存层。这个缓存层以 SQLite 为后端存储，使 Steve（Rancher 的 Kubernetes API 代理组件）能够更快地响应 UI 对对象列表的请求，因为排序、过滤和分页操作都在服务器端完成，从而最小化数据传输量。 

期望成果是什么？响应速度大幅提升的 UI、Kubernetes API Server 和 Rancher 本身负载显著降低、在资源分页浏览时获得更好的体验——即便在有数万个资源的环境中也能流畅应对。 

## 技术深潜：Vai 的 SQLite 支撑架构

那么，Vai 到底是如何运作的？其“魔法”在于它的架构：将 Kubernetes 原生的 Informer 机制与 SQLite 的高速、低内存开销结合起来。 

Vai 是对 Steve 的一种扩展，Steve 是 Rancher 用来将 UI 的 API 请求代理到 Kubernetes 的组件。Vai 利用专门的 Informer 来缓存 Kubernetes API 的信息。 

如果你对 Kubernetes 控制器开发稍有了解，就知道 Informer 是一种标准机制，用于监听资源变动并维护本地同步缓存。当 UI 第一次请求某一种资源（例如 Pods）的列表时，会为该资源类型创建一个 Vai Informer。这个 Informer 首先向 Kubernetes API 发起 LIST 请求，然后再开启 WATCH，以保持缓存与 Kubernetes 实时同步。 

关键区别在于：传统 Informer 缓存通常驻留在内存中，而 Vai Informer 使用 SQLite 作为其后端持久化存储。这意味着被缓存的 Kubernetes 对象被持久化写入磁盘（默认情况下，会写入 Rancher pod 或下游集群的 cattle-cluster-agent pod 内）。 

与纯内存解决方案相比，磁盘存储提供了更大的缓存容量。这在处理我们测试的最坏情况时至关重要，例如前面提到的 80,000 个大型 ConfigMap 基准测试案例中约 80 GiB 的数据。

下面是一个简化流程：

1. **UI 请求**：浏览器端（Rancher Dashboard 的 JavaScript 代码）向 Steve 的某个 API 端点请求一页 Pods，带有排序（如按创建时间）和过滤（如按名称）条件
2. **Steve 与 Vai**：Steve 接收到请求。如果对应资源类型的 Vai 缓存已被预热（即缓存已就绪），则 Steve 会将该请求转换成一个 SQL 查询
3. **SQLite 查询**：该 SQL 查询在 SQLite 数据库中执行，SQLite 引擎高效地完成过滤、排序、分页，只挑选出请求页所需的数据
4. **响应 UI**：Steve 将这页整理好的数据返回给 UI

美妙之处在于：后续对不同页、或对同一种资源做略有不同的过滤/排序请求，都可以直接在本地 SQLite 缓存中处理，而无需再次对 Kubernetes API Server 发起完整的 LIST 请求。这样便极大地减轻了对 kube-apiserver 和 etcd 的访问压力。 

数据库本身为每种资源类型设计了一组表。通常包括一个“对象表”（object table），存储完整的资源对象 blob；以及一个“字段表”（fields table），包含可供排序或过滤使用的索引列，如 name、namespace、creation timestamp 以及其他模式定义属性。这个 “感兴趣字段”（fields of interest） 的概念至关重要。我们不会为每个对象的每个字段都建立索引，那样效率太低；相反，我们只索引 UI 交互中最常用的字段。这是在常见用例和索引开销之间的一个权衡。 

## Vai 的演进历程与替代方案回顾

Vai 的开发是一次迭代的旅程，从 HackWeek 项目起步，经过多轮设计讨论、RFC 制定、实现和优化。Rancher 2.8 提供了起步的基础能力，随着版本演进（2.9、2.10、2.11，直至 2.12），我们不断在其之上构建、修正与完善。沿途我们通过多个 EPIC GitHub issue 跟踪进展、修复 bug、调整实现，并解决诸如缓存预热性能、功能一致性等挑战。这个迭代方式使我们能够渐进交付，并依据反馈做及时调整。 

在 Vai 之前，我们并非第一次尝试通过缓存优化 Steve 的 UI 性能。之前我们试过多种策略，并对它们做了系统化的评估和基准测试，最终选择了当前设计。 

下面是几种我们在 Vai 之前探索过的替代方案，以及它们的利弊：

| 替代方案                        | 初步收益                     | 主要痛点                                                                              | 它如何引导我们走向 Vai 的设计                               |
| --------------------------- | ------------------------ | --------------------------------------------------------------------------------- | ----------------------------------------------- |
| Steve 原本的内存 LRU 缓存          | 作为 UI 性能基线               | 由于对每种查询参数变化或 RBAC 权限变化都可能产生新的缓存条目，导致内存效率低、数据重复                                    | 突显出需要一种更高效的缓存机制，以避免冗余数据存储，并能应对多样的 UI 请求而不消耗过多内存 |
| 在从 Kubernetes API 返回后再做内存缓存 | 通过缓存原始 API 响应可略有提高效率     | 缓存频繁失效，因为即便元素未发生变化，资源版本（resourceVersion）也可能改变，从而导致每次“最新”请求都写入新的缓存条目               | 暴露出需要一种对资源版本频繁变化更具鲁棒性的缓存策略                      |
| 为内存缓存追踪 resourceVersion     | 在不常变化的列表上，内存使用减少且响应一致性提升 | 对于频繁更新的资源（如 leader election leases），缓存几乎总被认为“过期”，导致不断重新获取和加入新条目，对于包含数万个资源的动态场景不可行 | 促使我们考虑引入 Informer 机制以实现实时高效更新                   |

这段历程展示了我们严谨的工程流程：我们并不是随意选定一个方案，而是识别已有方案的局限性，逐步推进到更健壮的架构。频繁更新的资源导致缓存抖动，是一个非常关键的推动因素。 Vai 正是为直接应对这些问题而选中的方案：通过 Informer 获取高效实时更新，通过 SQLite 获得更大、磁盘级持久缓存，并且能运用 SQL 提供服务器端排序、过滤、分页。这样便有效地将部分工作负载从 Kubernetes API Server 和客户端浏览器中卸载。 

## 对你（工程师）而言，Vai 的意义

那这一系列变革，对你这个使用 Rancher 的技术工程师来说，有什么实打实的好处？

* **异常灵敏的 UI 体验**：最直接的收益是，当你在 Cluster Explorer 中浏览成千上万条资源（如 Pods、Secrets、ConfigMaps 等）时，排序、过滤、翻页操作会感觉非常迅捷流畅，因为计算已在服务器端完成。 
* **Kubernetes API 服务器负担减轻**：由于大量 UI 数据请求可以直接从缓存返回，Vai 显著减少 Rancher 向下游 API 服务器发起的 LIST 和 GET 请求次数。这不仅对 Rancher 有利，也能改善被管理集群的健康和性能，为你的实际工作负载释放更多 API Server 资源。 

![](https://www.suse.com/c/wp-content/uploads/2025/09/Screenshot-2025-09-16-at-14.51.47-1024x733.png)
图 1：Rancher 2.11.1 上的 kubapiserver 负载，这是 QA 测试的一部分。Steve 的 “list” 负载由 k6 生成，然后 Steve 又加载 Kubernetes API Server，此处由 Rancher Monitoring 进行监控。

![](https://www.suse.com/c/wp-content/uploads/2025/09/Screenshot-2025-09-16-at-14.52.11-1024x733.png)
图 2：Rancher 2.12.1（启用 Vai）上的 kubapiserver 负载，这是 QA 测试的一部分。更重的 Steve “list” 负载由 k6 生成（比上图高出 10 倍），而 Kubernetes API Server 的负载几乎未受影响。

* **为更丰富的数据洞察建立基础**：使用 SQLite 为后端存储为未来 Rancher 版本提供了 SQL 引擎的灵活性。未来可以做更复杂的查询，比如在服务器端直接 JOIN 多种 Kubernetes 资源进行汇总视图。以前在无 Vai 的情况下，这类操作通常需要多个大型 LIST，然后在浏览器端进行映射、JOIN，资源消耗极大。 
* **Rancher 更具可扩展性**：这些效率提升意味着 Rancher 自身可以更有效地管理更多、更大的集群。其控制平面组件（如 Steve）也变得更加节省资源。 
* **效率提升，减少等待**：更快、更可靠的 UI 意味着你等待的时间更少，能做的事情更多。这正是我们设计 Vai 的出发点之一：避免一个缓慢的 Dashboard 给用户留下不好的印象并削弱生产效率。 

总之，Vai 是一个基础性组件，能帮助 Rancher 随着你的需求扩展。它确保即便你的 Kubernetes 规模增长得很大，Rancher 仍然是一款强劲、高性能的工具。同时，这种改进也为未来更高级的功能铺路——响应式的数据访问层常常是许多高级特性的前提。 

## 安全考虑：保护你的数据

谈到数据管理，特别是来自你 Kubernetes 集群的数据，安全问题至关重要。因为 Vai 会将 Kubernetes 对象的副本缓存到 Rancher server pod（对于本地集群）或 cattle-cluster-agent pod（对于下游集群）的磁盘上，我们在设计时就把“静态加密”（encryption-at-rest）纳入了架构之中。 

具体来说，我们内建了两道防线：

* **可选的全缓存加密**：若你对 SQLite 缓存中的数据在磁盘上的安全性有顾虑，可以通过在相应的 Rancher 或 agent pod 中设置环境变量 `CATTLE_ENCRYPT_CACHE_ALL=true` 来启用对所有缓存对象的加密。 
* **Secrets 和 Tokens 始终加密**：无论你是否开启全缓存加密，Kubernetes Secrets 和 Rancher Tokens 在缓存中始终被加密。这为最敏感的信息提供了最低保护门槛。 

加密机制本身采用 **AES-GCM**，使用一个驻内存的 Key-Encryption Key（KEK）来加密 / 解密 Data Encryption Keys（DEKs）。这些 DEK 用于加密实际资源数据，并且定期轮换以增强安全性。 

此外，还有一个重要的安全考量是访问控制（RBAC、权限控制等）：由于我们改变了缓存逻辑，必须确保政策和权限机制在启用 Vai 后仍然得到尊重。为此，我们与安全团队密切合作，执行深入的审查和自动化测试（启用与未启用 Vai 的场景同时测试），以确保一致性。 

## Rancher 性能的未来之路

Vai 代表了 Rancher 在大规模数据处理方面的一次重大进步，但这并不是终点。这个特性正走在成为 Rancher 体验核心的一条路径上。 

在 Rancher 2.11 及之前的版本中，Vai 被视为**实验性功能**，默认关闭。但令人振奋的是，**从 Rancher 2.12 开始，Vai 被认为是可用于生产环境的特性，并在默认情况下被启用且受 SUSE 支持**。对我们来说，这可是一个重要里程碑，我们将继续根据真实使用反馈来增强它。 

更进一步地，我们才刚刚开始挖掘底层 SQL 引擎所提供的额外灵活性。我们预期会利用这一基础，在未来丰富 Rancher 的数据摘要和洞察功能。我们的终极目标是，在未来的某个版本中，让这个强大的性能引擎默认开启，使得高度可扩展的 UI 成为每个人的标准体验。 

## 帮我们测试与完善 Vai！

你的反馈非常重要！如果你愿意深度体验并帮忙验证，建议你先阅读 Rancher 文档中关于 [UI Server-Side Pagination](https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/ui-server-side-pagination) 的特性页面，然后将你的体验反馈给我们：在 GitHub 上开一个 Issue，分享你的发现和建议。 

感谢你的阅读！我们期待听到你的使用体验，一起打造更加快速、可扩展的 Rancher 平台。 
