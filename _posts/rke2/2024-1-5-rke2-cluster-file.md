---
layout: post
title: RKE2 cluster.yml 文件示例
subtitle:
date: 2024-1-5 11:07:00 +0800
author: Ksd
header-img: img/post-bg-debug.jpg
catalog: true
tags:
  - RKE2
---

## 关于环境变量

从 `rke2 server -h` 可以查看到有一些参数支持通过环境变量进行设置，如果某个选项出现在括号中（例如 [$RKE2_TOKEN]），该选项可以作为该名称的环境变量传入。

如果是 K3S 集群，可以在安装脚本从通过环境变量中传递，但 RKE2 集群，只能通过 env 传入。

在 RKE2 自动生成的 systemd 配置文件中可以查看到 RKE2 的 env 文件位置：

```
# /usr/local/lib/systemd/system/rke2-server.service
[Service]
Type=notify
EnvironmentFile=-/etc/default/%N
EnvironmentFile=-/etc/sysconfig/%N
EnvironmentFile=-/usr/local/lib/systemd/system/%N.env
```

所以，如果要通过环境变量修改 RKE2 的参数，直接将环境变量添加到任意的 EnvironmentFile 文件中即可，例如：

```
# /usr/local/lib/systemd/system/rke2-server.env
HOME=/root
RKE2_CONFIG_FILE=/opt/config.yaml
```

## RKE2 Server

```
# LOGGING

# 打开调试日志
# 环境变量：[$RKE2_DEBUG]
debug: true

# LISTENER

# RKE2 supervisor API 绑定地址(默认:0.0.0.0)
bind-address: 192.168.205.81
# 可通过 ss -lntp 确认：
# root@rke2-2:~# ss -lntp | grep 2379
# LISTEN 0      4096   192.168.205.81:2379       0.0.0.0:*    users:(("etcd",pid=1604,fd=11))

# apiserver 用于向集群成员发布的IPv4/IPv6地址(默认值:node-external-ip/node-ip)
# 一般用户多网卡场景
# 与 kube-apiserver 中的参数 advertise-address 作用相同
# https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/
advertise-address: 192.168.205.110

# 添加其他主机名或 IPv4/IPv6 地址作为服务器 TLS 证书上的 Subject Alternative Names
# 为了避免固定注册地址的证书错误，在启动Server时设置 tls-san 参数。可以是IP 或主机名。
tls-san:
  - my-kubernetes-domain.com
  - another-kubernetes-domain.com

# 通过拒绝添加与 kubernetes apiserver 服务、server 节点或 tls-san 选项值不关联的 Subject Alternative Names 来保护服务器 TLS 证书（默认值：true）
tls-san-security: true

# DATA

# 可通过此参数修改 RKE2 的数据目录
# 如执行 rke2-uninstall.sh 卸载 rke2，不会自动删除 data-dir 设置的目录，需要手动删除。
# rke2-uninstall.sh 只会删除默认的 /var/lib/rancher，参考：https://github.com/rancher/rke2/blob/master/bundle/bin/rke2-uninstall.sh#L101C26-L101C26
data-dir: /opt/rke2-data/

# NETWORKING

# 用于 Pod IP 的 IPv4/IPv6 网络 CIDR（默认值：10.42.0.0/16）
cluster-cidr: 10.42.0.0/16

# 用于 Service IP 的 IPv4/IPv6 网络 CIDR（默认值：10.43.0.0/16）
service-cidr: 10.43.0.0/16

# NodePort 端口范围（默认值：“30000-32767”）
service-node-port-range: 30000-32767

# Coredns 的 IPv4 Cluster IP。 该 IP 应在 service-cidr 范围内（默认值：10.43.0.10）
cluster-dns: 10.43.0.10

# Cluster Domain (默认值: "cluster.local")
cluster-domain: cluster.local

# 说明参考：https://docs.k3s.io/installation/network-options#control-plane-egress-selector-configuration
# 可设置为 “agent”、“cluster”、“pod”、“disabled” (默认为“agent”)
egress-selector-mode: agent

# servicelb 组件的 pod 的命名空间（默认值：“kube-system”）
# 要使此配置生效，许通过参数 "enable-servicelb: true" 在 rke2 集群中启用 servicelb
# servicelb-namespace 修改后，当创建 LoadBalancer 类型的 service，servicelb 会自动在设置的 namespace 中创建 svclb- 开头的 pod 来实现 servicelb 功能。
# servicelb 参考：https://github.com/k3s-io/klipper-lb
servicelb-namespace: kube-system

# CLIENT

# RKE2 生成的 kubeconfig 文件位置
# 默认：/etc/rancher/rke2/rke2.yaml
# 环境变量：[$RKE2_KUBECONFIG_OUTPUT]
# 问题：当修改为其他位置后，默认的 kubeconfig 文件依然存在，也就是说会同时存在两个 rke2.yaml
write-kubeconfig: /etc/rancher/rke2/rke2.yaml

# RKE2 kubeconfig 文件的权限
# 默认：600
# 环境变量：[$RKE2_KUBECONFIG_MODE]
write-kubeconfig-mode: 600

# HELM

# RKE2 通过 rancher/helm-release CRD 轻松的部署传统的 Kubernetes 资源清单和 Helm Chart
# 当 RKE2 启动后，自动通过 helm 来部署 /var/lib/rancher/rke2/server/manifests 中的文件
# 参考：https://docs.rke2.io/helm
# 一般很少有场景修改这个默认的镜像
helm-job-image: rancher/klipper-helm:v0.8.2-xxx

# CLUSTER

# 用于将 server 节点或 agent 加入集群的共享密钥
# 环境变量：[$RKE2_TOKEN]
token: TOKEN

# 包含 token 的文件，可通过文件传递 token，文件中设置 token 的值
# 环境变量：[$RKE2_TOKEN_FILE]
token-file: /opt/token-file.txt

# 仅 rke2 server 选项，用于配置 rke2 agent 使用的单独 token。
# 通过这个参数，可以将 server 和 agent token 分离。设置后，agent 可以单独使用这个 token 去注册节点
# 环境变量：[$RKE2_AGENT_TOKEN]
agent-token: agenttoken

# 包含 agent token 的文件，可通过文件传递 agent token，文件中设置 token 的值
# 环境变量：[$RKE2_AGENT_TOKEN_FILE]
agent-token-file: /opt/token-file.txt

# 连接到的 rke2 server，用于 agent/server 节点加入集群。
# 环境变量：[$RKE2_URL]
server: https://<server>:9345

# 集群重置，将集群重置为一个成员集群
# 参考：https://docs.rke2.io/backup_restore#cluster-reset
# 该参数一般通过 rke2 cli 去设置，例如 `rke2 server --cluster-reset`，基本不通过配置文件的形式设置。
# 环境变量：[$RKE2_CLUSTER_RESET]
cluster-reset

# 要恢复的快照文件路径
# 参考：https://docs.rke2.io/backup_restore#restoring-a-snapshot-to-existing-nodes
# 该参数一般通过 rke2 cli 去设置，例如 `rke2 server --cluster-reset`，基本不通过配置文件的形式设置。
cluster-reset-restore-path

# FLAGS

# 自定义 kube-apiserver 的参数：
# 参数的内容选项来源于：https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/
# 以下是一个示例：
kube-apiserver-arg:
  - "watch-cache=true"              # 启用Watch缓存，默认启用
  - "default-watch-cache-size=1500" # 为replicationcontrollers, endpoints, nodes, pods, services, apiservices.apiregistration.k8s.io（系统默认值）以外的资源设置缓存大小，默认100
  - "event-ttl=1h0m0s"              # 事件保留时间，默认1小时
  - "max-requests-inflight=800"     # 默认值400，设置0为不限制，一般来说，每25~30个Pod有15个并行
  - "max-mutating-requests-inflight=400" # Mutating最大请求数，默认值200，设置0为不限制
  - "kubelet-timeout=5s"            # kubelet操作超时，默认5s
  - "default-not-ready-toleration-seconds=60"  # Pod默认容忍Node NotReady的时间，超过Pod将被驱逐，默认300
  - "default-unreachable-toleration-seconds=60" # Pod默认容忍Node Unreachable的时间，超过Pod将被驱逐，默认300

# 自定义 etcd 的参数：
# 参数的内容选项来源于：https://etcd.io/docs/v3.5/op-guide/configuration/
# 以下是一个示例：
#etcd-arg:
#  - "auto-compaction-retention=1"              #etcd每小时自动压缩一次，默认不执行(单位小时)
#  - "quota-backend-bytes=6442450944"           # 修改etcd空间配额为6442450944，默认2G,最大8G
#  - "election-timeout=5000"            # 选举超时时间，默认1000毫秒，网络条件不好的场景下可以调整
#  - "hearbeat-interval=500"            # 心跳间隔时间，默认100毫秒，网络条件不好的场景下可以调整

# 自定义 kube-controller-manager 的参数
# 参数的内容选项来源于：https://kubernetes.io/docs/reference/command-line-tools-reference/kube-controller-manager/
# 以下是一个示例：
kube-controller-manager-arg:
  - "node-cidr-mask-size=24"        # 修改每个节点子网大小(cidr掩码长度)，默认为24，可用IP为254个；23，可用IP为510个；22，可用IP为1022个
  - "node-monitor-period=5s"        # 控制器定时与节点通信以检查通信是否正常，周期默认5s
  # 当节点通信失败后，再等一段时间kubernetes判定节点为notready状态。"
  # 这个时间段必须是kubelet的nodeStatusUpdateFrequency(默认10s)的整数倍，"
  # 其中N表示允许kubelet同步节点状态的重试次数，默认40s。"
  - "node-monitor-grace-period=20s"
  # 再持续通信失败一段时间后，kubernetes判定节点为unhealthy状态，默认1m0s。"
  - "node-startup-grace-period=30s"
  # 默认5. 同时同步的deployment的数量
  - "concurrent-deployment-syncs=5"
  # 默认5. 同时同步的endpoint的数量
  - "concurrent-endpoint-syncs=5"
  # 默认20. 同时同步的垃圾收集器工作器的数量
  - "concurrent-gc-syncs=20"
  # 默认10. 同时同步的命名空间的数量
  - "concurrent-namespace-syncs=10"
  # 默认5. 同时同步的副本集的数量。
  - "concurrent-replicaset-syncs=5"
  # 默认1. 同时同步的服务数
  - "concurrent-service-syncs=1"
  # 默认5. 同时同步的服务帐户令牌数。
  - "concurrent-serviceaccount-token-syncs=5"
  # 默认15s。同步PV和PVC的周期。
  - "pvclaimbinder-sync-period=15s"

# 自定义 kube-scheduler 的参数
# 参数的内容选项来源于：https://kubernetes.io/docs/reference/command-line-tools-reference/kube-scheduler/
# 以下是一个示例：
kube-scheduler-arg:
  - "disabled-metrics: true"

# DB

# 公开 etcd metrics
# 默认：false
etcd-expose-metrics: false

# 禁用 etcd 自动快照
etcd-disable-snapshots: true

# 设置 etcd 快照的前缀名称
# 默认 "etcd-snapshot"，最终效果：etcd-snapshot-<unix-timestamp>
etcd-snapshot-name: etcd-snapshot

# 创建快照的时间间隔，
# 默认每隔 12 小时创建一次， "0 */12 * * *"
# 下面示例将每隔 5 小时创建一次快照
etcd-snapshot-schedule-cron： '0 */5 * * *'

# 要保留的快照数量，默认为 5 个
etcd-snapshot-retention: 5

# etcd 快照的保存目录，默认为：${data-dir}/db/snapshots
etcd-snapshot-dir: /opt/db/snapshots

# 压缩 etcd 快照，会压缩为 zip 格式，默认为 不开启
etcd-snapshot-compress: false

# 启用 S3 备份
etcd-s3: true
# S3 endpoint url (default: "s3.amazonaws.com")
etcd-s3-endpoint: minio.local:9000
# S3自定义CA证书连接到S3 endpoint
etcd-s3-endpoint-ca: /etc/pki/ca-trust/source/anchors/my-ca.pem
# 禁用S3 SSL证书验证
etcd-s3-skip-ssl-verify: true
# S3 access key [$AWS_ACCESS_KEY_ID]
etcd-s3-access-key: myuser
# S3 secret key [$AWS_SECRET_ACCESS_KEY]
etcd-s3-secret-key: mykey
# S3 bucket name
etcd-s3-bucket: rke2-backup
# S3 region / bucket location (optional) (default: "us-east-1")
# 如果是 minio，可不设置
etcd-s3-region: us-east-1
# S3 folder
etcd-s3-folder: rke2-folder
# 禁用 S3 https，如果你的 S3 server 是 http 的，需通过此参数来设置使用 http 访问
etcd-s3-insecure: true
# S3 timeout (default: 5m0s)，当上传的文件过大，或者网络比较慢时，需要调大此参数
etcd-s3-timeout: 5m0s

## 示例1 - 将 etcd 快照上传到 http 的 minio
## cat /etc/rancher/rke2/config.yaml
## etcd-s3: true
## etcd-s3-endpoint: 192.168.205.83:9000
## etcd-s3-access-key: myuser
## etcd-s3-secret-key: mykey
## etcd-s3-bucket: rke2-backup
## etcd-s3-folder: rke2-folder
## etcd-s3-insecure: true
## etcd-s3-timeout: 10m0s

## 示例 2 - 将快照上传到 aws S3
## etcd-s3: true
## etcd-s3-access-key: myuser
## etcd-s3-secret-key: mykey/h
## etcd-s3-region: ca-central-1
## etcd-s3-bucket: hailong-test
## etcd-s3-folder: rke2-folder
## etcd-s3-timeout: 10m0s

# COMPONENTS

# RKE2 默认会启动 coredns、ingress、metrics，可通过此参数禁用自动部署这些组件
# 已部署的集群，也可通过此参数来启用或禁用对应的组件
disable:
  - rke2-coredns
  - rke2-ingress-nginx
  - rke2-metrics-server

# 禁用 Kubernetes 默认 scheduler
disable-scheduler: true
# 禁用 Kubernetes 默认 cloud controller manager
disable-cloud-controller: true
# 禁用 Kubernetes 默认 kube-proxy
disable-kube-proxy: true

# AGENT/NODE

# 自定义 node name，默认为节点的 hostname
# 环境变量：[$RKE2_NODE_NAME]
node-name: my-node-name

# 将 id 附加到节点名称后面
# 如果集群所有节点的主机名都相同，可以使用此参数来自动设置不同的节点名称
with-node-id: true

# 节点添加 label
node-label:
  - app=rancher
  - foo=bar

#  节点添加 taint
node-taint:
  - "CriticalAddonsOnly=true:NoExecute"

# credential provider plugin 插件二进制文件所在目录的路径(默认:"/var/lib/rancher/credentialprovider/bin")
# 参考：https://kubernetes.io/blog/2022/12/22/kubelet-credential-providers/
image-credential-provider-bin-dir: /var/lib/rancher/credentialprovider/bin

# credential provider plugin 配置文件的路径
# 参考：https://kubernetes.io/blog/2022/12/22/kubelet-credential-providers/
image-credential-provider-config: /var/lib/rancher/credentialprovider/config.yaml

# AGENT/RUNTIME

# 禁用嵌入式 Containerd 并使用替代的 CRI 实现，所以可以指定使用 containerd 或者 CRI-O
container-runtime-endpoint: /run/containerd/containerd.sock

# 覆盖默认 containerd snapshotter (默认:"overlayfs")
# 参考：https://github.com/containerd/containerd/tree/main/docs/snapshotters
snapshotter: overlayfs

# 私有注册表配置文件 (默认:"/etc/rancher/rke2/registries.yaml")
private-registry: /etc/rancher/rke2/registries.yaml

# 设置 RKE2 的系统镜像私有镜像仓库
# 环境变量：[$RKE2_SYSTEM_DEFAULT_REGISTRY]
# 例如使用阿里云镜像仓库启动 RKE2
system-default-registry: registry.cn-hangzhou.aliyuncs.com

# AGENT/NETWORK

# 用于通告节点的 IPv4/IPv6 地址，当节点有多个网卡时，可通过该参数设置对应的网卡 IP
node-ip: 1.2.3.4

# 用于通告节点的 IPv4/IPv6 外部 IP 地址，如果想通过公网 IP 注册节点，可使用此参数
node-external-ip: 211.1.1.1

# 设置 kubelet resolv.conf 文件
# 环境变量：[$RKE2_RESOLV_CONF]
resolv-conf: /run/systemd/resolve/resolv.conf

# AGENT/FLAGS

# 自定义 kubelet 参数
kubelet-arg:
  #- "pod-infra-container-image=rancher/pause:3.1"      #指定pause镜像
  - "max-pods=110"                                     #修改节点最大Pod数量
  - "sync-frequency=3s"                                #密文和配置映射同步时间，默认1分钟
  - "max-open-files=2000000"                           #Kubelet进程可以打开的文件数（默认1000000）,根据节点配置情况调整
  - "kube-api-burst=30"                                #与apiserver会话时的并发数，默认是10
  - "kube-api-qps=15"                                  #与apiserver会话时的QPS,默认是5，QPS=并发量/平均响应时间
  - "serialize-image-pulls=false"                      #kubelet默认一次拉取一个镜像，设置为false可以同时拉取多个镜像,前提是存储驱动要为Overlay2，对应的Dokcer也需要增加下载并发数
  - "registry-burst=10"                                #拉取镜像的最大并发数，registry-burst不能超过registry-qps
  - "registry-qps=0"                                   #仅当registry-qps大于0时生效，(默认10)。如果registry-qps为0则不限制(默认5)
  - "cgroups-per-qos=true"
  - "cgroup-driver=cgroupfs"
  - "node-status-update-frequency=10s"                 #指定kubelet多长时间向Master发布一次节点状态。注意=必须与kube-controller中的node-monitor-grace-period一起协调工作。(默认10s)
  - "global-housekeeping-interval=1m0s"                #设置cAdvisor全局的采集行为的时间间隔，主要通过内核事件来发现新容器的产生。默认1m0s
  - "housekeeping-interval=10s"                        #每个已发现的容器的数据采集频率。默认10s
  - "runtime-request-timeout=2m0s"                     #所有运行时请求的超时，除了长时间运行的pull,logs,execandattach。超时后，kubelet将取消请求，抛出错误，然后重试。(默认2m0s)
  - "volume-stats-agg-period=1m0s"                     #指定kubelet计算和缓存所有pod和卷的卷磁盘使用量的间隔。默认为1m0s
     #驱逐相关配置
  - "enforce-node-allocatable=pods"                    #节点资源预留,预留类型为pods，预留只对pods生效，不对system-reserved和kube-reserved生效
  - "system-reserved=cpu=0.25,memory=512Mi"            #为节点预留资源，在enforce-node-allocatable中未设置system-reserved时，仅从节点可分配资源中减去相应资源数量
  - "kube-reserved=cpu=0.25,memory=1536Mi"             #为节点预留资源，在enforce-node-allocatable中未设置kube-reserved时，仅从节点可分配资源中减去相应资源数量
  - "eviction-hard=memory.available<300Mi,nodefs.available<10%,imagefs.available<15%,nodefs.inodesFree<5%"                      #硬驱逐阈值，节点上的可用资源降至保留值以下时，就会触发强制驱逐。强制驱逐会强制Kill掉POD，不会等POD自动退出
  - "eviction-soft=memory.available<512Mi,nodefs.available<15%,imagefs.available<20%,nodefs.inodesFree<10%"                     #软驱逐阈值
  - "eviction-soft-grace-period=memory.available=1m30s,nodefs.available=1m30s,imagefs.available=1m30s,nodefs.inodesFree=1m30s"  #当节点上的可用资源少于这个值时但大于硬驱逐阈值时候，会等待eviction-soft-grace-period设置的时长
  - "eviction-max-pod-grace-period=30"                 #等待中每10s检查一次，当最后一次检查还触发了软驱逐阈值就会开始驱逐，驱逐不会直接KillPOD，先发送停止信号给POD，然后等待eviction-max-pod-grace-period设置的时长
  - "eviction-pressure-transition-period=30s"          #在eviction-max-pod-grace-period时长之后，如果POD还未退出则发送强制killPOD

# 自定义 kube-proxy 参数
kube-proxy-arg:
  - "proxy-mode=iptables"                              # 默认使用iptables进行数据转发，ipvs需要提前加载内核模块
  - "kube-api-burst=20"                               # 与kubernetes apiserver通信并发数,默认10
  - "kube-api-qps=10"                                  # 与kubernetes apiserver通信时使用QPS，默认值5，QPS=并发量/平均响应时间

# 内核调整行为。如果设置为 true， 并且内核可调参数与 kubelet 默认值不同，则会退出。
# 参考：https://docs.rke2.io/security/hardening_guide#ensure-protect-kernel-defaults-is-set
protect-kernel-defaults: true

# 在 supervisor 端口上启用 pprof endpoint
enable-pprof: true

# 在 containerd 中启用 SELinux
# 参考：https://docs.rke2.io/security/selinux
# 环境变量：[$RKE2_SELINUX]
selinux: true

# supervisor 客户端负载均衡器的本地端口。如果 Supervisor 和 apiserver 没有配置在一起，则小于此端口的附加端口 1 也将用于 apiserver 客户端负载均衡器。（默认值：6444）
# 环境变量：[$RKE2_LB_SERVER_PORT]
lb-server-port: 6444

# 要部署的 CNI 插件，可选择 none、calico、canal、cilium（默认值：canal）
# 环境变量：[$RKE2_CNI]
# 参考：https://docs.rke2.io/install/network_options
cni: canal

# 启用 rke2 servicelb
# 参考：https://docs.k3s.io/networking#service-load-balancer
enable-servicelb: true

# 自定义 kube-apiserver 镜像
kube-apiserver-image: kube-apiserver-image>
# 自定义  kube-controller-manager 镜像
kube-controller-manager-image: <kube-controller-manager-image>
# 自定义 cloud-controller-manager 镜像
cloud-controller-manager-image: <cloud-controller-manager-image>
# 自定义 kube-proxy 镜像
kube-proxy-image: <kube-proxy-image>
# 自定义 kube-schedule 镜像
kube-scheduler-image: <kube-scheduler-image>
# 自定义 pause 镜像
pause-image: <pause-image>
# 自定义 runtime 二进制文件镜像 (containerd, kubectl, crictl, 等)
runtime-image: <runtime-image>
# 自定义 etcd 镜像
etcd-image: <etcd-image>
# 自定义 kubelet 二进制路径
kubelet-path: <kubelet-path>

# Cloud provider 名称
cloud-provider-name: vsphere
# Cloud provider 配置文件路径
cloud-provider-config: "/etc/rancher/rke2/vsphere.yaml"

# 根据所选基准验证系统配置（有效项:cis, cis-1.23(已弃用)）
# 参考：https://docs.rke2.io/security/hardening_guide
# 环境变量：[$RKE2_CIS_PROFILE]
profile: cis

# 定义审计策略配置的文件的路径
## cat /opt/audit-policy.yaml
## apiVersion: audit.k8s.io/v1
## kind: Policy
## metadata:
##   creationTimestamp: null
## rules:
## - level: Metadata
audit-policy-file: /opt/audit-policy.yaml

# 定义 Pod Security Admission 配置文件的路径
# 参考：https://docs.rke2.io/security/pod_security_standards
pod-security-admission-config-file: <path-to-custom-psa-config-file>

# Control Plane 组件资源请求
# 参考：https://docs.rke2.io/advanced#control-plane-component-resource-requestslimits
# 环境变量：[$RKE2_CONTROL_PLANE_RESOURCE_REQUESTS]
control-plane-resource-requests:
  - kube-apiserver-cpu=250m
  - kube-apiserver-memory=256M
  - kube-scheduler-cpu=125m
  - kube-scheduler-memory=256M
  - etcd-cpu=1000m

# Control Plane 组件资源限制
# 参考：https://docs.rke2.io/advanced#control-plane-component-resource-requestslimits
# 环境变量：[$RKE2_CONTROL_PLANE_RESOURCE_LIMITS]
control-plane-resource-limits:
  - kube-apiserver-cpu=500m
  - kube-apiserver-memory=512M
  - kube-scheduler-cpu=250m
  - kube-scheduler-memory=512M
  - etcd-cpu=1000m

# Control Plane 探针配置
# 参考：https://github.com/rancher/rke2/pull/3204
# 环境变量：[$RKE2_CONTROL_PLANE_PROBE_CONFIGURATION]
control-plane-probe-configuration:
  - etcd-startup-initial-delay-seconds=42
  - kube-apiserver-readiness-period-seconds=15

# 参考：https://docs.rke2.io/advanced#extra-control-plane-component-volume-mounts
# kube-apiserver 额外卷挂载
# 环境变量：[$RKE2_KUBE_APISERVER_EXTRA_MOUNT]
kube-apiserver-extra-mount:
  - "/tmp/foo.yaml:/root/foo.yaml"
  - "/tmp/bar.txt:/etc/bar.txt:ro"
# kube-scheduler 额外卷挂载
# 环境变量：[$RKE2_KUBE_SCHEDULER_EXTRA_MOUNT]
kube-scheduler-extra-mount:
  - "/tmp/foo.yaml:/root/foo.yaml"
  - "/tmp/bar.txt:/etc/bar.txt:ro"
# kube-controller-manager 额外卷挂载
# 环境变量：[$RKE2_KUBE_CONTROLLER_MANAGER_EXTRA_MOUNT]
kube-controller-manager-extra-mount:
  - "/tmp/foo.yaml:/root/foo.yaml"
  - "/tmp/bar.txt:/etc/bar.txt:ro"
# kube-proxy 额外卷挂载
# 环境变量：[$RKE2_KUBE_PROXY_EXTRA_MOUNT]
kube-proxy-extra-mount:
  - "/tmp/foo.yaml:/root/foo.yaml"
  - "/tmp/bar.txt:/etc/bar.txt:ro"
# etcd 额外卷挂载
# 环境变量：[$RKE2_ETCD_EXTRA_MOUNT]
etcd-extra-mount:
  - "/tmp/foo.yaml:/root/foo.yaml"
  - "/tmp/bar.txt:/etc/bar.txt:ro"
# cloud-controller-manager 额外卷挂载
# 环境变量：[$RKE2_CLOUD_CONTROLLER_MANAGER_EXTRA_MOUNT]
cloud-controller-manager-extra-mount:
  - "/tmp/foo.yaml:/root/foo.yaml"
  - "/tmp/bar.txt:/etc/bar.txt:ro"

# 额外的 Control Plane 组件环境变量
# 参考：https://docs.rke2.io/advanced#extra-control-plane-component-environment-variables

# kube-apiserver 额外的环境变量
# 环境变量：[$RKE2_KUBE_APISERVER_EXTRA_ENV]
kube-apiserver-extra-env:
  - "MY_FOO=FOO"
  - "MY_BAR=BAR"
# kube-scheduler 额外的环境变量
# 环境变量：[$RKE2_KUBE_SCHEDULER_EXTRA_ENV]
kube-scheduler-extra-env:
  - "TZ=America/Los_Angeles"
# kube-controller-manager 额外的环境变量
# 环境变量：[$RKE2_KUBE_CONTROLLER_MANAGER_EXTRA_ENV]
kube-controller-manager-extra-env:
  - "MY_FOO=FOO"
  - "MY_BAR=BAR"
# kube-proxy 额外的环境变量
# 环境变量：[$RKE2_KUBE_PROXY_EXTRA_ENV]
kube-proxy-extra-env:
  - "MY_FOO=FOO"
  - "MY_BAR=BAR"
# etcd 额外的环境变量
# 环境变量：[$RKE2_ETCD_EXTRA_ENV]
etcd-extra-env:
  - "MY_FOO=FOO"
  - "MY_BAR=BAR"
# cloud-controller-manager 额外的环境变量
# 环境变量：[$RKE2_CLOUD_CONTROLLER_MANAGER_EXTRA_ENV]
cloud-controller-manager-extra-env:
  - "MY_FOO=FOO"
  - "MY_BAR=BAR"
```

## RKE2 Agent

```
# 打开调试日志
# 环境变量：[$RKE2_DEBUG]
debug: true

# 用于将 server 节点或 agent 加入集群的共享密钥
# 环境变量：[$RKE2_TOKEN]
token: TOKEN

# 包含 token 的文件，可通过文件传递 token，文件中设置 token 的值
# 环境变量：[$RKE2_TOKEN_FILE]
token-file: /opt/token-file.txt

# 连接到的 rke2 server，用于 agent/server 节点加入集群。
# 环境变量：[$RKE2_URL]
server: https://<server>:9345

# 可通过此参数修改 RKE2 的数据目录
# 如执行 rke2-uninstall.sh 卸载 rke2，不会自动删除 data-dir 设置的目录，需要手动删除。
# rke2-uninstall.sh 只会删除默认的 /var/lib/rancher，参考：https://github.com/rancher/rke2/blob/master/bundle/bin/rke2-uninstall.sh#L101C26-L101C26
data-dir: /opt/rke2-data/

# 自定义 node name，默认为节点的 hostname
# 环境变量：[$RKE2_NODE_NAME]
node-name: my-node-name

# 将 id 附加到节点名称后面
# 如果集群所有节点的主机名都相同，可以使用此参数来自动设置不同的节点名称
with-node-id: true

# 节点添加 label
node-label:
  - app=rancher
  - foo=bar

#  节点添加 taint
node-taint:
  - "CriticalAddonsOnly=true:NoExecute"

# credential provider plugin 插件二进制文件所在目录的路径(默认:"/var/lib/rancher/credentialprovider/bin")
# 参考：https://kubernetes.io/blog/2022/12/22/kubelet-credential-providers/
image-credential-provider-bin-dir: /var/lib/rancher/credentialprovider/bin

# credential provider plugin 配置文件的路径
# 参考：https://kubernetes.io/blog/2022/12/22/kubelet-credential-providers/
image-credential-provider-config: /var/lib/rancher/credentialprovider/config.yaml

# 在 containerd 中启用 SELinux
# 参考：https://docs.rke2.io/security/selinux
# 环境变量：[$RKE2_SELINUX]
selinux: true

# supervisor 客户端负载均衡器的本地端口。如果 Supervisor 和 apiserver 没有配置在一起，则小于此端口的附加端口 1 也将用于 apiserver 客户端负载均衡器。（默认值：6444）
# 环境变量：[$RKE2_LB_SERVER_PORT]
lb-server-port: 6444

# 内核调整行为。如果设置为 true， 并且内核可调参数与 kubelet 默认值不同，则会退出。
# 参考：https://docs.rke2.io/security/hardening_guide#ensure-protect-kernel-defaults-is-set
protect-kernel-defaults: true

# 禁用嵌入式 Containerd 并使用替代的 CRI 实现，所以可以指定使用 containerd 或者 CRI-O
container-runtime-endpoint: /run/containerd/containerd.sock

# 覆盖默认 containerd snapshotter (默认:"overlayfs")
# 参考：https://github.com/containerd/containerd/tree/main/docs/snapshotters
snapshotter: overlayfs

# 私有注册表配置文件 (默认:"/etc/rancher/rke2/registries.yaml")
private-registry: /etc/rancher/rke2/registries.yaml

# 用于通告节点的 IPv4/IPv6 地址，当节点有多个网卡时，可通过该参数设置对应的网卡 IP
node-ip: 1.2.3.4

# 用于通告节点的 IPv4/IPv6 外部 IP 地址，如果想通过公网 IP 注册节点，可使用此参数
node-external-ip: 211.1.1.1

# 设置 kubelet resolv.conf 文件
# 环境变量：[$RKE2_RESOLV_CONF]
resolv-conf: /run/systemd/resolve/resolv.conf

# AGENT/FLAGS

# 自定义 kubelet 参数
kubelet-arg:
  #- "pod-infra-container-image=rancher/pause:3.1"      #指定pause镜像
  - "max-pods=110"                                     #修改节点最大Pod数量
  - "sync-frequency=3s"                                #密文和配置映射同步时间，默认1分钟
  - "max-open-files=2000000"                           #Kubelet进程可以打开的文件数（默认1000000）,根据节点配置情况调整
  - "kube-api-burst=30"                                #与apiserver会话时的并发数，默认是10
  - "kube-api-qps=15"                                  #与apiserver会话时的QPS,默认是5，QPS=并发量/平均响应时间
  - "serialize-image-pulls=false"                      #kubelet默认一次拉取一个镜像，设置为false可以同时拉取多个镜像,前提是存储驱动要为Overlay2，对应的Dokcer也需要增加下载并发数
  - "registry-burst=10"                                #拉取镜像的最大并发数，registry-burst不能超过registry-qps
  - "registry-qps=0"                                   #仅当registry-qps大于0时生效，(默认10)。如果registry-qps为0则不限制(默认5)
  - "cgroups-per-qos=true"
  - "cgroup-driver=cgroupfs"
  - "node-status-update-frequency=10s"                 #指定kubelet多长时间向Master发布一次节点状态。注意=必须与kube-controller中的node-monitor-grace-period一起协调工作。(默认10s)
  - "global-housekeeping-interval=1m0s"                #设置cAdvisor全局的采集行为的时间间隔，主要通过内核事件来发现新容器的产生。默认1m0s
  - "housekeeping-interval=10s"                        #每个已发现的容器的数据采集频率。默认10s
  - "runtime-request-timeout=2m0s"                     #所有运行时请求的超时，除了长时间运行的pull,logs,execandattach。超时后，kubelet将取消请求，抛出错误，然后重试。(默认2m0s)
  - "volume-stats-agg-period=1m0s"                     #指定kubelet计算和缓存所有pod和卷的卷磁盘使用量的间隔。默认为1m0s
     #驱逐相关配置
  - "enforce-node-allocatable=pods"                    #节点资源预留,预留类型为pods，预留只对pods生效，不对system-reserved和kube-reserved生效
  - "system-reserved=cpu=0.25,memory=512Mi"            #为节点预留资源，在enforce-node-allocatable中未设置system-reserved时，仅从节点可分配资源中减去相应资源数量
  - "kube-reserved=cpu=0.25,memory=1536Mi"             #为节点预留资源，在enforce-node-allocatable中未设置kube-reserved时，仅从节点可分配资源中减去相应资源数量
  - "eviction-hard=memory.available<300Mi,nodefs.available<10%,imagefs.available<15%,nodefs.inodesFree<5%"                      #硬驱逐阈值，节点上的可用资源降至保留值以下时，就会触发强制驱逐。强制驱逐会强制Kill掉POD，不会等POD自动退出
  - "eviction-soft=memory.available<512Mi,nodefs.available<15%,imagefs.available<20%,nodefs.inodesFree<10%"                     #软驱逐阈值
  - "eviction-soft-grace-period=memory.available=1m30s,nodefs.available=1m30s,imagefs.available=1m30s,nodefs.inodesFree=1m30s"  #当节点上的可用资源少于这个值时但大于硬驱逐阈值时候，会等待eviction-soft-grace-period设置的时长
  - "eviction-max-pod-grace-period=30"                 #等待中每10s检查一次，当最后一次检查还触发了软驱逐阈值就会开始驱逐，驱逐不会直接KillPOD，先发送停止信号给POD，然后等待eviction-max-pod-grace-period设置的时长
  - "eviction-pressure-transition-period=30s"          #在eviction-max-pod-grace-period时长之后，如果POD还未退出则发送强制killPOD

# 自定义 kube-proxy 参数
kube-proxy-arg:
  - "proxy-mode=iptables"                              # 默认使用iptables进行数据转发，ipvs需要提前加载内核模块
  - "kube-api-burst=20"                               # 与kubernetes apiserver通信并发数,默认10
  - "kube-api-qps=10"                                  # 与kubernetes apiserver通信时使用QPS，默认值5，QPS=并发量/平均响应时间

# 自定义 kube-apiserver 镜像
kube-apiserver-image: kube-apiserver-image>
# 自定义  kube-controller-manager 镜像
kube-controller-manager-image: <kube-controller-manager-image>
# 自定义 cloud-controller-manager 镜像
cloud-controller-manager-image: <cloud-controller-manager-image>
# 自定义 kube-proxy 镜像
kube-proxy-image: <kube-proxy-image>
# 自定义 kube-schedule 镜像
kube-scheduler-image: <kube-scheduler-image>
# 自定义 pause 镜像
pause-image: <pause-image>
# 自定义 runtime 二进制文件镜像 (containerd, kubectl, crictl, 等)
runtime-image: <runtime-image>
# 自定义 etcd 镜像
etcd-image: <etcd-image>
# 自定义 kubelet 二进制路径
kubelet-path: <kubelet-path>

# Cloud provider 名称
cloud-provider-name: vsphere
# Cloud provider 配置文件路径
cloud-provider-config: "/etc/rancher/rke2/vsphere.yaml"

# 根据所选基准验证系统配置（有效项:cis, cis-1.23(已弃用)）
# 参考：https://docs.rke2.io/security/hardening_guide
# 环境变量：[$RKE2_CIS_PROFILE]
profile: cis

# 定义审计策略配置的文件的路径
## cat /opt/audit-policy.yaml
## apiVersion: audit.k8s.io/v1
## kind: Policy
## metadata:
##   creationTimestamp: null
## rules:
## - level: Metadata
audit-policy-file: /opt/audit-policy.yaml

# 定义 Pod Security Admission 配置文件的路径
# 参考：https://docs.rke2.io/security/pod_security_standards
pod-security-admission-config-file: <path-to-custom-psa-config-file>

# Control Plane 组件资源请求
# 参考：https://docs.rke2.io/advanced#control-plane-component-resource-requestslimits
# 环境变量：[$RKE2_CONTROL_PLANE_RESOURCE_REQUESTS]
control-plane-resource-requests:
  - kube-apiserver-cpu=250m
  - kube-apiserver-memory=256M
  - kube-scheduler-cpu=125m
  - kube-scheduler-memory=256M
  - etcd-cpu=1000m

# Control Plane 组件资源限制
# 参考：https://docs.rke2.io/advanced#control-plane-component-resource-requestslimits
# 环境变量：[$RKE2_CONTROL_PLANE_RESOURCE_LIMITS]
control-plane-resource-limits:
  - kube-apiserver-cpu=500m
  - kube-apiserver-memory=512M
  - kube-scheduler-cpu=250m
  - kube-scheduler-memory=512M
  - etcd-cpu=1000m

# Control Plane 探针配置
# 参考：https://github.com/rancher/rke2/pull/3204
# 环境变量：[$RKE2_CONTROL_PLANE_PROBE_CONFIGURATION]
control-plane-probe-configuration:
  - etcd-startup-initial-delay-seconds=42
  - kube-apiserver-readiness-period-seconds=15

# 参考：https://docs.rke2.io/advanced#extra-control-plane-component-volume-mounts
# kube-apiserver 额外卷挂载
# 环境变量：[$RKE2_KUBE_APISERVER_EXTRA_MOUNT]
kube-apiserver-extra-mount:
  - "/tmp/foo.yaml:/root/foo.yaml"
  - "/tmp/bar.txt:/etc/bar.txt:ro"
# kube-scheduler 额外卷挂载
# 环境变量：[$RKE2_KUBE_SCHEDULER_EXTRA_MOUNT]
kube-scheduler-extra-mount:
  - "/tmp/foo.yaml:/root/foo.yaml"
  - "/tmp/bar.txt:/etc/bar.txt:ro"
# kube-controller-manager 额外卷挂载
# 环境变量：[$RKE2_KUBE_CONTROLLER_MANAGER_EXTRA_MOUNT]
kube-controller-manager-extra-mount:
  - "/tmp/foo.yaml:/root/foo.yaml"
  - "/tmp/bar.txt:/etc/bar.txt:ro"
# kube-proxy 额外卷挂载
# 环境变量：[$RKE2_KUBE_PROXY_EXTRA_MOUNT]
kube-proxy-extra-mount:
  - "/tmp/foo.yaml:/root/foo.yaml"
  - "/tmp/bar.txt:/etc/bar.txt:ro"
# etcd 额外卷挂载
# 环境变量：[$RKE2_ETCD_EXTRA_MOUNT]
etcd-extra-mount:
  - "/tmp/foo.yaml:/root/foo.yaml"
  - "/tmp/bar.txt:/etc/bar.txt:ro"
# cloud-controller-manager 额外卷挂载
# 环境变量：[$RKE2_CLOUD_CONTROLLER_MANAGER_EXTRA_MOUNT]
cloud-controller-manager-extra-mount:
  - "/tmp/foo.yaml:/root/foo.yaml"
  - "/tmp/bar.txt:/etc/bar.txt:ro"

# 额外的 Control Plane 组件环境变量
# 参考：https://docs.rke2.io/advanced#extra-control-plane-component-environment-variables

# kube-apiserver 额外的环境变量
# 环境变量：[$RKE2_KUBE_APISERVER_EXTRA_ENV]
kube-apiserver-extra-env:
  - "MY_FOO=FOO"
  - "MY_BAR=BAR"
# kube-scheduler 额外的环境变量
# 环境变量：[$RKE2_KUBE_SCHEDULER_EXTRA_ENV]
kube-scheduler-extra-env:
  - "TZ=America/Los_Angeles"
# kube-controller-manager 额外的环境变量
# 环境变量：[$RKE2_KUBE_CONTROLLER_MANAGER_EXTRA_ENV]
kube-controller-manager-extra-env:
  - "MY_FOO=FOO"
  - "MY_BAR=BAR"
# kube-proxy 额外的环境变量
# 环境变量：[$RKE2_KUBE_PROXY_EXTRA_ENV]
kube-proxy-extra-env:
  - "MY_FOO=FOO"
  - "MY_BAR=BAR"
# etcd 额外的环境变量
# 环境变量：[$RKE2_ETCD_EXTRA_ENV]
etcd-extra-env:
  - "MY_FOO=FOO"
  - "MY_BAR=BAR"
# cloud-controller-manager 额外的环境变量
# 环境变量：[$RKE2_CLOUD_CONTROLLER_MANAGER_EXTRA_ENV]
cloud-controller-manager-extra-env:
  - "MY_FOO=FOO"
  - "MY_BAR=BAR"

```