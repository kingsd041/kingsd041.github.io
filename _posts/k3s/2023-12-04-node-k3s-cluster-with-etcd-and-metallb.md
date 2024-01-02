---
layout: post
title: K3S 集群搭建：裸金属系统中 etcd 和 MetalLB 的实现
subtitle: 在本教程中，我将使用 etcd 和 MetalLB 负载均衡器创建一个包含 3 个节点的集群。
date: 2023-12-4 11:06:00 +0800
author: Ksd
header-img: img/post-bg-desk.jpg
catalog: true
tags:
  - K3s
  - MetalLB
---

云服务提供商可以非常轻松地通过 CLI 中的简单命令或在其 Web 门户中单击几下来启动 Kubernetes 集群。然而，在没有云基础设施的情况下，在边缘或用于家庭实验室的场景中，设置 Kubernetes 并不像在云中那样简单，因为整个基础设施，包括网络，都需要考虑在内。

[K3S](https://k3s.io/ "K3S") 是一个轻量级的 Kubernetes 分发版本，专为适用于边缘工作负载的设备而设计。它经过简化并且占用空间非常小，此外方便的安装脚本使入门过程变得更加容易。

在本教程中，我将使用 etcd 和 MetalLB 负载均衡器创建一个包含 3 个节点的集群。

etcd 用于在 3 个节点之间同步配置，而 MetalLB 用于负载均衡。其中网络中的一个可访问 IP 将用作流量的入口点，然后流量将根据可用节点进行路由。

etcd 已经非常成熟，并且应用于很多场景。MetalLB 处于 Beta 阶段，但 MetalLB 项目页面声称已经在公司和个人的生产和非生产集群中使用。虽然在大规模采用 MetalLB 可能是早期或有风险，但我在测试环境中使用 MetalLB 一直非常稳定。

借助 K3S，我们可以从功耗极低的设备转向性能更高的设备，以扩展每个设备可以支持的工作负载数量。使用哪种设备有许多变量需要评估才能做出决定。

在此示例中，我使用 3 台配备 16 GB DDR5 RAM 和 500 GB NVMe 存储驱动器的迷你 PC。我购买的型号配有 2 个网卡，但我没有在此设置中使用第二个网卡。当需要分离管理和工作负载流量时，第二块网卡就变得非常有用。

我的拓扑目前是这样的：

![](https://miro.medium.com/v2/resize:fit:1400/format:webp/1*PhbgfcZga8nGBkYgwMLxnQ.png)

在这个配置示例中，192.168.3.101 是将要安装的主节点，其他两个节点随后加入集群。

我使用 Fedora Server 38 作为基准操作系统。Fedora Server 带有一个非常方便的用于管理的 Web 界面，称为 Cockpit。有关更多信息，请参阅 [Cockpit Project](https://cockpit-project.org/ "Fedora Cockpit Project")。

可以通过在浏览器中导航到 https://<服务器的主机名或 IP 地址>:9090 来访问它。然后，我们可以使用内置的基于 Web 的 Shell，作为从主机到服务器的 ssh 的替代方法。控制台如下所示：

![](https://miro.medium.com/v2/resize:fit:1400/format:webp/1*bOQzZaLTyt2RL32d8KBSXA.png)

我们可以在网络中配置 DNS 来解析服务器的 IP 地址和主机名，但对于测试或小规模安装，直接在 hosts 文件中添加 IP 地址和主机名就足够了（在所有节点中）：

```
sudo vim /etc/hosts

# Then add the following lines,
# replacing with your Ip addresses and hostnames:
192.168.3.101 pnode3101 pnode3101.clockcode.local
192.168.3.102 pnode3102 pnode3102.clockcode.local
192.168.3.103 pnode3103 pnode3103.clockcode.local
```

然后我们可以通过使用 ping 命令和主机名来测试节点是否正常工作：

![](https://miro.medium.com/v2/resize:fit:1202/format:webp/1*JKcvP5ewOYH9oQmLkyhC-g.png)

为了让 K3S 和 MetalLB 正常工作，需要自定义一些防火墙规则。我们首先使用 firewall-cmd 命令应用这些规则（在所有节点中）：

```
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https

sudo firewall-cmd --permanent --zone=trusted --add-source=10.42.0.0/16 #pods
sudo firewall-cmd --permanent --zone=trusted --add-source=10.43.0.0/16 #services

sudo firewall-cmd --permanent --new-service=k3s
sudo firewall-cmd --permanent --service=k3s --set-description="K3S Firewall Rules"
sudo firewall-cmd --permanent --service=k3s --add-port=2379/tcp
sudo firewall-cmd --permanent --service=k3s --add-port=2380/tcp
sudo firewall-cmd --permanent --service=k3s --add-port=6443/tcp
sudo firewall-cmd --permanent --service=k3s --add-port=8472/udp
sudo firewall-cmd --permanent --service=k3s --add-port=10250/tcp
sudo firewall-cmd --permanent --service=k3s --add-port=51820/udp
sudo firewall-cmd --permanent --service=k3s --add-port=51821/udp
sudo firewall-cmd --permanent --add-service=k3s

sudo firewall-cmd --reload
```

有关更多信息，请参阅 [K3S 网络要求](https://docs.k3s.io/installation/requirements#networking "K3S 网络要求")和[其他操作系统准备](https://docs.k3s.io/advanced#additional-os-preparations "其他操作系统准备")。

现在，让我们创建一个用于安装 K3S 实例并能够将其他节点加入集群的密钥。我们可以通过多种方式做到这一点，其中一种是使用 openssl：

```
openssl rand -hex 10 > k3s_secret.txt
```

这将创建一个随机的十六进制值。如果需要更大的密钥，可以增加 -hex 之后的数字。

然后，我们可以将 k3s_secret.txt 复制到节点并在安装命令行中使用。

在主节点上，我们可以使用以下命令安装 K3S server（仅在第一个节点上运行）：

```
curl -sfL https://get.k3s.io | K3S_TOKEN=`cat k3s_secret.txt` sh -s - server --cluster-init --disable=servicelb
```

此命令将从 K3S 获取安装脚本并将第一个节点安装为 controlplan、etcd 和主节点。

我们可以使用以下命令检查节点的状态：

```
sudo kubectl get nodes
```

![](https://miro.medium.com/v2/resize:fit:1340/format:webp/1*U5oE595OBWd0xXSl-kWwHw.png)

> 请注意，我们使用了 disable-servicelb 选项，因为使用 MetalLB 需要禁用掉 servicelb，如 [K3s Issue](https://metallb.universe.tf/configuration/k3s/ "ISSUES WITH K3S")中所述。

我们将在其他节点上使用相同的配置文件，但命令行略有变化（在每个附加节点上运行相同的命令）：

```
# Replace with the ip address or hostname of your server
curl -sfL https://get.k3s.io | K3S_TOKEN=`cat k3s_secret.txt` sh -s - server --server https://pnode3101.clockcode.local:6443 --disable=servicelb
```

一旦两个附加节点都加入了集群，我们应该使用 `kubectl get nodes` 命令看到如下输出：

![](https://miro.medium.com/v2/resize:fit:1376/format:webp/1*p3yDd8Zn2iVwTRouD_XXKQ.png)

现在 K3S 集群已经安装，我们可以配置负载均衡器以将网络可访问的 Ip 地址分配给集群中安装的服务。我们可以使用以下命令检查：

```
sudo kubectl get services --all-namespaces
```

此时可以看到 K3S 内置的 traefik 负载均衡器服务对 external-ip 设置处于 pending 状态。

![](https://miro.medium.com/v2/resize:fit:1400/format:webp/1*_Z_fweGYr0samGMkJXAvqA.png)

这是因为我们没有激活带有 IP 地址分配的负载均衡器，我们将通过启用 MetalLB 来实现。

[安装 MetalLB](https://metallb.universe.tf/installation/ "安装 MetalLB") 有几种方法。在本教程中，我使用 kubectl apply 通过提供一个清单来安装，使用以下命令：

```
sudo kubectl apply -f https://raw.githubusercontent.com/metallb/metallb/v0.13.10/config/manifests/metallb-native.yaml
```

屏幕上应该会出现以下输出：

![](https://miro.medium.com/v2/resize:fit:1400/format:webp/1*9z3lJFmGY9BCOEYFJ4xB1Q.png)

现在，我们需要配置 MetalLB 中的 Layer-2 等设置，包括为负载均衡器保留的 IP 地址。

在我的示例中，我保留了一系列不在我的本地网络 DHCP 范围内的 IP 地址：

```
sudo kubectl apply -f - <<EOF
apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata:
  name: k3s-lb-pool
  namespace: metallb-system
spec:
  addresses:
  - 192.168.3.51-192.168.3.100
---
apiVersion: metallb.io/v1beta1
kind: L2Advertisement
metadata:
  name: k3s-lb-pool
  namespace: metallb-system
EOF
```

命令的输出应该类似于这样：

![](https://miro.medium.com/v2/resize:fit:752/format:webp/1*d-UyjdHH1oKcHm7G6un2gA.png)

现在，如果我们再次检查集群中的服务，我们应该看到 traefik 负载均衡器具有我们配置的 IP 地址范围内的一个 IP 地址。

![](https://miro.medium.com/v2/resize:fit:1400/format:webp/1*nlW28B53bYgW_g3TzRHmMw.png)

我们可以通过部署 ngnix 服务并通过我们现在配置的 MetalLB 负载均衡器进行公开服务来进行验证 MetalLB。

```
sudo kubectl create deployment nginx --image=nginx
sudo kubectl expose deployment nginx --type=LoadBalancer --name=nginx --port=80 --protocol=TCP
```

现在，我们应该看到为我们的 nginx deployment 创建了一个类型为 LoadBalancer 的 service：

![](https://miro.medium.com/v2/resize:fit:1400/format:webp/1*01yn5xDBL7G578nM2mWRbQ.png)

我们可以尝试访问该 IP 地址并查看 nginx 的欢迎消息。

![](https://miro.medium.com/v2/resize:fit:1038/format:webp/1*8Himo2-azDlf03_ju7F9fA.png)

如果不再需要或不再使用该服务，我们还可以执行清理操作，使用以下命令：

```
sudo kubectl delete all -l app=nginx
```

参数 `-l` 用于选择一个选择器，这是一个键/值对，此处用于过滤名称为 nginx 的应用程序。输出应该类似于这样：

![](https://miro.medium.com/v2/resize:fit:594/format:webp/1*2xH5CWSbkJcPG1x4FV_rqw.png)

这个教程没有探讨更高级的设置，比如证书管理和安装，但我希望它对于想要快速搭建 Kubernetes 集群的人来说是一个很好的起点。
