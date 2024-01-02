---
layout: post
title: RKE2 启动日志
subtitle:
date: 2023-11-14 21:07:00 +0800
author: Ksd
header-img: img/post-bg-debug.jpg
catalog: true
tags:
  - RKE2
---

## RKE2 启动过程

0. 查看日志

```
root@rke2-1:~# journalctl -u rke2-server -f
```

1. 检查服务：

```
Nov 14 13:53:13 rke2-1 sh[8590]: + /usr/bin/systemctl is-enabled --quiet nm-cloud-setup.service
Nov 14 13:53:13 rke2-1 sh[8591]: Failed to get unit file state for nm-cloud-setup.service: No such file or directory
```

尝试检查 nm-cloud-setup.service 服务是否启用，但未找到该服务的单元文件。参考：https://docs.rke2.io/known_issues#networkmanager

2. RKE2 初始化：

```
Nov 14 13:53:14 rke2-1 rke2[8599]: time="2023-11-14T13:53:14+08:00" level=warning msg="not running in CIS mode"
Nov 14 13:53:14 rke2-1 rke2[8599]: time="2023-11-14T13:53:14+08:00" level=info msg="Applying Pod Security Admission Configuration"
Nov 14 13:53:14 rke2-1 rke2[8599]: time="2023-11-14T13:53:14+08:00" level=info msg="Starting rke2 v1.26.10+rke2r2 (21e3a8c82da71473f2b846065dcab197a9b2c9d8)"
Nov 14 13:53:14 rke2-1 rke2[8599]: time="2023-11-14T13:53:14+08:00" level=info msg="Managed etcd cluster initializing"
```

RKE2 开始初始化，应用 Pod 安全性配置，并启动版本为 `v1.26.10+rke2r2` 的 RKE2。接着，etcd 集群开始初始化。

3. 生成证书：

```
Nov 14 13:53:14 rke2-1 rke2[8599]: time="2023-11-14T13:53:14+08:00" level=info msg="generated self-signed CA certificate CN=rke2-client-ca@1699941194: notBefore=2023-11-14 05:53:14.395151804 +0000 UTC notAfter=2033-11-11 05:53:14.395151804 +0000 UTC"
Nov 14 13:53:14 rke2-1 rke2[8599]: time="2023-11-14T13:53:14+08:00" level=info msg="certificate CN=system:admin,O=system:masters signed by CN=rke2-client-ca@1699941194: notBefore=2023-11-14 05:53:14 +0000 UTC notAfter=2024-11-13 05:53:14 +0000 UTC"
Nov 14 13:53:14 rke2-1 rke2[8599]: time="2023-11-14T13:53:14+08:00" level=info msg="certificate CN=system:rke2-supervisor,O=system:masters signed by CN=rke2-client-ca@1699941194: notBefore=2023-11-14 05:53:14 +0000 UTC notAfter=2024-11-13 05:53:14 +0000 UTC"
Nov 14 13:53:14 rke2-1 rke2[8599]: time="2023-11-14T13:53:14+08:00" level=info msg="certificate CN=system:kube-controller-manager signed by CN=rke2-client-ca@1699941194: notBefore=2023-11-14 05:53:14 +0000 UTC notAfter=2024-11-13 05:53:14 +0000 UTC"
Nov 14 13:53:14 rke2-1 rke2[8599]: time="2023-11-14T13:53:14+08:00" level=info msg="certificate CN=system:kube-scheduler signed by CN=rke2-client-ca@1699941194: notBefore=2023-11-14 05:53:14 +0000 UTC notAfter=2024-11-13 05:53:14 +0000 UTC"
Nov 14 13:53:14 rke2-1 rke2[8599]: time="2023-11-14T13:53:14+08:00" level=info msg="certificate CN=system:apiserver,O=system:masters signed by CN=rke2-client-ca@1699941194: notBefore=2023-11-14 05:53:14 +0000 UTC notAfter=2024-11-13 05:53:14 +0000 UTC"
Nov 14 13:53:14 rke2-1 rke2[8599]: time="2023-11-14T13:53:14+08:00" level=info msg="certificate CN=system:kube-proxy signed by CN=rke2-client-ca@1699941194: notBefore=2023-11-14 05:53:14 +0000 UTC notAfter=2024-11-13 05:53:14 +0000 UTC"
Nov 14 13:53:14 rke2-1 rke2[8599]: time="2023-11-14T13:53:14+08:00" level=info msg="certificate CN=system:rke2-controller signed by CN=rke2-client-ca@1699941194: notBefore=2023-11-14 05:53:14 +0000 UTC notAfter=2024-11-13 05:53:14 +0000 UTC"
Nov 14 13:53:14 rke2-1 rke2[8599]: time="2023-11-14T13:53:14+08:00" level=info msg="certificate CN=rke2-cloud-controller-manager signed by CN=rke2-client-ca@1699941194: notBefore=2023-11-14 05:53:14 +0000 UTC notAfter=2024-11-13 05:53:14 +0000 UTC"
Nov 14 13:53:14 rke2-1 rke2[8599]: time="2023-11-14T13:53:14+08:00" level=info msg="generated self-signed CA certificate CN=rke2-server-ca@1699941194: notBefore=2023-11-14 05:53:14.40338601 +0000 UTC notAfter=2033-11-11 05:53:14.40338601 +0000 UTC"
Nov 14 13:53:14 rke2-1 rke2[8599]: time="2023-11-14T13:53:14+08:00" level=info msg="certificate CN=kube-apiserver signed by CN=rke2-server-ca@1699941194: notBefore=2023-11-14 05:53:14 +0000 UTC notAfter=2024-11-13 05:53:14 +0000 UTC"
Nov 14 13:53:14 rke2-1 rke2[8599]: time="2023-11-14T13:53:14+08:00" level=info msg="generated self-signed CA certificate CN=rke2-request-header-ca@1699941194: notBefore=2023-11-14 05:53:14.405143335 +0000 UTC notAfter=2033-11-11 05:53:14.405143335 +0000 UTC"
Nov 14 13:53:14 rke2-1 rke2[8599]: time="2023-11-14T13:53:14+08:00" level=info msg="certificate CN=system:auth-proxy signed by CN=rke2-request-header-ca@1699941194: notBefore=2023-11-14 05:53:14 +0000 UTC notAfter=2024-11-13 05:53:14 +0000 UTC"
Nov 14 13:53:14 rke2-1 rke2[8599]: time="2023-11-14T13:53:14+08:00" level=info msg="generated self-signed CA certificate CN=etcd-server-ca@1699941194: notBefore=2023-11-14 05:53:14.407045768 +0000 UTC notAfter=2033-11-11 05:53:14.407045768 +0000 UTC"
Nov 14 13:53:14 rke2-1 rke2[8599]: time="2023-11-14T13:53:14+08:00" level=info msg="certificate CN=etcd-client signed by CN=etcd-server-ca@1699941194: notBefore=2023-11-14 05:53:14 +0000 UTC notAfter=2024-11-13 05:53:14 +0000 UTC"
Nov 14 13:53:14 rke2-1 rke2[8599]: time="2023-11-14T13:53:14+08:00" level=info msg="generated self-signed CA certificate CN=etcd-peer-ca@1699941194: notBefore=2023-11-14 05:53:14.408338743 +0000 UTC notAfter=2033-11-11 05:53:14.408338743 +0000 UTC"
Nov 14 13:53:14 rke2-1 rke2[8599]: time="2023-11-14T13:53:14+08:00" level=info msg="certificate CN=etcd-peer signed by CN=etcd-peer-ca@1699941194: notBefore=2023-11-14 05:53:14 +0000 UTC notAfter=2024-11-13 05:53:14 +0000 UTC"
Nov 14 13:53:14 rke2-1 rke2[8599]: time="2023-11-14T13:53:14+08:00" level=info msg="certificate CN=etcd-server signed by CN=etcd-server-ca@1699941194: notBefore=2023-11-14 05:53:14 +0000 UTC notAfter=2024-11-13 05:53:14 +0000 UTC"
```

RKE2 生成一系列自签名的 CA 证书，用于不同组件之间的通信和身份验证。

4. etcd 集群初始化：

```
Nov 14 13:53:14 rke2-1 rke2[8599]: time="2023-11-14T13:53:14+08:00" level=info msg="Starting etcd for new cluster"
```

RKE2 开始启动 etcd 以初始化新的集群。

5. 证书警告：

```
Nov 14 13:53:14 rke2-1 rke2[8599]: time="2023-11-14T13:53:14+08:00" level=warning msg="dynamiclistener [::]:9345: no cached certificate available for preload - deferring certificate load until storage initialization or first client request"
```

出现证书预加载的警告，指出在初始化存储或首次客户端请求之前，无法使用缓存的证书。

6. 开始启动：

```
Nov 14 13:53:14 rke2-1 rke2[8599]: time="2023-11-14T13:53:14+08:00" level=info msg=start
Nov 14 13:53:14 rke2-1 rke2[8599]: time="2023-11-14T13:53:14+08:00" level=info msg="schedule, now=2023-11-14T13:53:14+08:00, entry=1, next=2023-11-15T00:00:00+08:00"
Nov 14 13:53:14 rke2-1 rke2[8599]: time="2023-11-14T13:53:14+08:00" level=info msg="Active TLS secret / (ver=) (count 10): map[listener.cattle.io/cn-10.43.0.1:10.43.0.1 listener.cattle.io/cn-127.0.0.1:127.0.0.1 listener.cattle.io/cn-192.168.205.79:192.168.205.79 listener.cattle.io/cn-__1-f16284:::1 listener.cattle.io/cn-kubernetes:kubernetes listener.cattle.io/cn-kubernetes.default:kubernetes.default listener.cattle.io/cn-kubernetes.default.svc:kubernetes.default.svc listener.cattle.io/cn-kubernetes.default.svc.cluster.local:kubernetes.default.svc.cluster.local listener.cattle.io/cn-localhost:localhost listener.cattle.io/cn-rke2-1:rke2-1 listener.cattle.io/fingerprint:SHA1=EA785B91154943C97063341C751D0F10DBE7195D]"
```

7. 启动 kube-apiserver、kube-scheduler、kube-controller-manager、cloud-controller-manager

```
Nov 14 13:53:14 rke2-1 rke2[8599]: time="2023-11-14T13:53:14+08:00" level=info msg="Running kube-apiserver --advertise-port=6443 --allow-privileged=true --anonymous-auth=false --api-audiences=https://kubernetes.default.svc.cluster.local,rke2 --authorization-mode=Node,RBAC --bind-address=0.0.0.0 --cert-dir=/var/lib/rancher/rke2/server/tls/temporary-certs --client-ca-file=/var/lib/rancher/rke2/server/tls/client-ca.crt --egress-selector-config-file=/var/lib/rancher/rke2/server/etc/egress-selector-config.yaml --enable-admission-plugins=NodeRestriction --enable-aggregator-routing=true --enable-bootstrap-token-auth=true --encryption-provider-config=/var/lib/rancher/rke2/server/cred/encryption-config.json --etcd-cafile=/var/lib/rancher/rke2/server/tls/etcd/server-ca.crt --etcd-certfile=/var/lib/rancher/rke2/server/tls/etcd/client.crt --etcd-keyfile=/var/lib/rancher/rke2/server/tls/etcd/client.key --etcd-servers=https://127.0.0.1:2379 --feature-gates=JobTrackingWithFinalizers=true --kubelet-certificate-authority=/var/lib/rancher/rke2/server/tls/server-ca.crt --kubelet-client-certificate=/var/lib/rancher/rke2/server/tls/client-kube-apiserver.crt --kubelet-client-key=/var/lib/rancher/rke2/server/tls/client-kube-apiserver.key --kubelet-preferred-address-types=InternalIP,ExternalIP,Hostname --profiling=false --proxy-client-cert-file=/var/lib/rancher/rke2/server/tls/client-auth-proxy.crt --proxy-client-key-file=/var/lib/rancher/rke2/server/tls/client-auth-proxy.key --requestheader-allowed-names=system:auth-proxy --requestheader-client-ca-file=/var/lib/rancher/rke2/server/tls/request-header-ca.crt --requestheader-extra-headers-prefix=X-Remote-Extra- --requestheader-group-headers=X-Remote-Group --requestheader-username-headers=X-Remote-User --secure-port=6443 --service-account-issuer=https://kubernetes.default.svc.cluster.local --service-account-key-file=/var/lib/rancher/rke2/server/tls/service.key --service-account-signing-key-file=/var/lib/rancher/rke2/server/tls/service.current.key --service-cluster-ip-range=10.43.0.0/16 --service-node-port-range=30000-32767 --storage-backend=etcd3 --tls-cert-file=/var/lib/rancher/rke2/server/tls/serving-kube-apiserver.crt --tls-cipher-suites=TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384,TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384,TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256,TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256,TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305,TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305 --tls-private-key-file=/var/lib/rancher/rke2/server/tls/serving-kube-apiserver.key"
Nov 14 13:53:14 rke2-1 rke2[8599]: time="2023-11-14T13:53:14+08:00" level=info msg="Removed kube-apiserver static pod manifest"
Nov 14 13:53:14 rke2-1 rke2[8599]: time="2023-11-14T13:53:14+08:00" level=info msg="Running kube-scheduler --authentication-kubeconfig=/var/lib/rancher/rke2/server/cred/scheduler.kubeconfig --authorization-kubeconfig=/var/lib/rancher/rke2/server/cred/scheduler.kubeconfig --bind-address=127.0.0.1 --kubeconfig=/var/lib/rancher/rke2/server/cred/scheduler.kubeconfig --profiling=false --secure-port=10259"
Nov 14 13:53:14 rke2-1 rke2[8599]: time="2023-11-14T13:53:14+08:00" level=info msg="Running kube-controller-manager --allocate-node-cidrs=true --authentication-kubeconfig=/var/lib/rancher/rke2/server/cred/controller.kubeconfig --authorization-kubeconfig=/var/lib/rancher/rke2/server/cred/controller.kubeconfig --bind-address=127.0.0.1 --cluster-cidr=10.42.0.0/16 --cluster-signing-kube-apiserver-client-cert-file=/var/lib/rancher/rke2/server/tls/client-ca.nochain.crt --cluster-signing-kube-apiserver-client-key-file=/var/lib/rancher/rke2/server/tls/client-ca.key --cluster-signing-kubelet-client-cert-file=/var/lib/rancher/rke2/server/tls/client-ca.nochain.crt --cluster-signing-kubelet-client-key-file=/var/lib/rancher/rke2/server/tls/client-ca.key --cluster-signing-kubelet-serving-cert-file=/var/lib/rancher/rke2/server/tls/server-ca.nochain.crt --cluster-signing-kubelet-serving-key-file=/var/lib/rancher/rke2/server/tls/server-ca.key --cluster-signing-legacy-unknown-cert-file=/var/lib/rancher/rke2/server/tls/server-ca.nochain.crt --cluster-signing-legacy-unknown-key-file=/var/lib/rancher/rke2/server/tls/server-ca.key --configure-cloud-routes=false --controllers=*,tokencleaner,-service,-route,-cloud-node-lifecycle --feature-gates=JobTrackingWithFinalizers=true --kubeconfig=/var/lib/rancher/rke2/server/cred/controller.kubeconfig --profiling=false --root-ca-file=/var/lib/rancher/rke2/server/tls/server-ca.crt --secure-port=10257 --service-account-private-key-file=/var/lib/rancher/rke2/server/tls/service.current.key --service-cluster-ip-range=10.43.0.0/16 --use-service-account-credentials=true"
Nov 14 13:53:14 rke2-1 rke2[8599]: time="2023-11-14T13:53:14+08:00" level=info msg="Running cloud-controller-manager --allocate-node-cidrs=true --authentication-kubeconfig=/var/lib/rancher/rke2/server/cred/cloud-controller.kubeconfig --authorization-kubeconfig=/var/lib/rancher/rke2/server/cred/cloud-controller.kubeconfig --bind-address=127.0.0.1 --cloud-config=/var/lib/rancher/rke2/server/etc/cloud-config.yaml --cloud-provider=rke2 --cluster-cidr=10.42.0.0/16 --configure-cloud-routes=false --controllers=*,-route,-service --kubeconfig=/var/lib/rancher/rke2/server/cred/cloud-controller.kubeconfig --leader-elect-resource-name=rke2-cloud-controller-manager --node-status-update-frequency=1m0s --profiling=false"
```

1. 节点信息和加入集群指南：

```
Nov 14 13:53:14 rke2-1 rke2[8599]: time="2023-11-14T13:53:14+08:00" level=info msg="Server node token is available at /var/lib/rancher/rke2/server/token"
Nov 14 13:53:14 rke2-1 rke2[8599]: time="2023-11-14T13:53:14+08:00" level=info msg="To join server node to cluster: rke2 server -s https://192.168.205.79:9345 -t ${SERVER_NODE_TOKEN}"
Nov 14 13:53:14 rke2-1 rke2[8599]: time="2023-11-14T13:53:14+08:00" level=info msg="Agent node token is available at /var/lib/rancher/rke2/server/agent-token"
Nov 14 13:53:14 rke2-1 rke2[8599]: time="2023-11-14T13:53:14+08:00" level=info msg="To join agent node to cluster: rke2 agent -s https://192.168.205.79:9345 -t ${AGENT_NODE_TOKEN}"
```

将 token 生成到 `/var/lib/rancher/rke2/server/token` 中，并介绍了如何将 agent 节点加入到 RKE2 集群中

9. kubeconfig 信息：

```
Nov 14 13:53:14 rke2-1 rke2[8599]: time="2023-11-14T13:53:14+08:00" level=info msg="Wrote kubeconfig /etc/rancher/rke2/rke2.yaml"
```

kubeconfig 生成到 `/etc/rancher/rke2/rke2.yaml` 中，该文件包含了访问 Kubernetes 集群所需的配置信息。

Nov 14 13:53:14 rke2-1 rke2[8599]: time="2023-11-14T13:53:14+08:00" level=info msg="Run: rke2 kubectl"

10. 等待 cri 连接信息：

```
Nov 14 13:53:14 rke2-1 rke2[8599]: time="2023-11-14T13:53:14+08:00" level=info msg="Waiting for cri connection: rpc error: code = Unavailable desc = connection error: desc = \"transport: Error while dialing: dial unix /run/k3s/containerd/containerd.sock: connect: no such file or directory\""
```

说明：等待 Container Runtime Interface (CRI) 连接的信息。

11. kubelet 设置 dns：

```
Nov 14 13:53:15 rke2-1 rke2[8599]: time="2023-11-14T13:53:15+08:00" level=warning msg="Host resolv.conf includes loopback or multicast nameservers - kubelet will use autogenerated resolv.conf with nameserver 8.8.8.8"
```

将主机的 8.8.8.8 作为 DNS Server

12. 检查模块的加载和设置 sysctl：

```
Nov 14 13:53:15 rke2-1 rke2[8599]: time="2023-11-14T13:53:15+08:00" level=info msg="Module overlay was already loaded"
Nov 14 13:53:15 rke2-1 rke2[8599]: time="2023-11-14T13:53:15+08:00" level=info msg="Module br_netfilter was already loaded"
Nov 14 13:53:15 rke2-1 rke2[8599]: time="2023-11-14T13:53:15+08:00" level=info msg="Set sysctl 'net/ipv4/conf/all/forwarding' to 1"
Nov 14 13:53:15 rke2-1 rke2[8599]: time="2023-11-14T13:53:15+08:00" level=info msg="Set sysctl 'net/netfilter/nf_conntrack_max' to 131072"
Nov 14 13:53:15 rke2-1 rke2[8599]: time="2023-11-14T13:53:15+08:00" level=info msg="Set sysctl 'net/netfilter/nf_conntrack_tcp_timeout_established' to 86400"
Nov 14 13:53:15 rke2-1 rke2[8599]: time="2023-11-14T13:53:15+08:00" level=info msg="Set sysctl 'net/netfilter/nf_conntrack_tcp_timeout_close_wait' to 3600"
```

13. 本地镜像信息检查和拉取过程：

```
Nov 14 13:53:15 rke2-1 rke2[8599]: time="2023-11-14T13:53:15+08:00" level=info msg="Checking local image archives in /var/lib/rancher/rke2/agent/images for index.docker.io/rancher/rke2-runtime:v1.26.10-rke2r2"
Nov 14 13:53:15 rke2-1 rke2[8599]: time="2023-11-14T13:53:15+08:00" level=warning msg="Failed to load runtime image index.docker.io/rancher/rke2-runtime:v1.26.10-rke2r2 from tarball: no local image available for index.docker.io/rancher/rke2-runtime:v1.26.10-rke2r2: not found in any file in /var/lib/rancher/rke2/agent/images: image not found"
Nov 14 13:53:15 rke2-1 rke2[8599]: time="2023-11-14T13:53:15+08:00" level=info msg="Checking local image archives in /var/lib/rancher/rke2/agent/images for registry.cn-hangzhou.aliyuncs.com/rancher/rke2-runtime:v1.26.10-rke2r2"
Nov 14 13:53:15 rke2-1 rke2[8599]: time="2023-11-14T13:53:15+08:00" level=warning msg="Failed to load runtime image registry.cn-hangzhou.aliyuncs.com/rancher/rke2-runtime:v1.26.10-rke2r2 from tarball: no local image available for registry.cn-hangzhou.aliyuncs.com/rancher/rke2-runtime:v1.26.10-rke2r2: not found in any file in /var/lib/rancher/rke2/agent/images: image not found"
Nov 14 13:53:15 rke2-1 rke2[8599]: time="2023-11-14T13:53:15+08:00" level=info msg="Pulling runtime image registry.cn-hangzhou.aliyuncs.com/rancher/rke2-runtime:v1.26.10-rke2r2"
```

检查 `/var/lib/rancher/rke2/agent/images` 中是否已经上传离线 RKE2 tarball，如果未上传，在线拉取 `rke2-runtime:v1.26.10-rke2r2` 镜像。

`rke2-runtime:v1.26.10-rke2r2` 是 RKE2 的容器运行时镜像，包含了容器运行时是负责管理和运行容器的组件。包括：containerd、containerd-shim、kubectl 等，就是下面日志中 `Extracting` 开头的内容。

14. 解压 rke2-runtime

```
Nov 14 13:53:17 rke2-1 rke2[8599]: time="2023-11-14T13:53:17+08:00" level=info msg="Creating directory /var/lib/rancher/rke2/data/v1.26.10-rke2r2-c713199d8a74/bin"
Nov 14 13:53:17 rke2-1 rke2[8599]: time="2023-11-14T13:53:17+08:00" level=info msg="Extracting file bin/containerd to /var/lib/rancher/rke2/data/v1.26.10-rke2r2-c713199d8a74/bin/containerd"
Nov 14 13:53:25 rke2-1 rke2[8599]: time="2023-11-14T13:53:25+08:00" level=info msg="Extracting file bin/containerd-shim to /var/lib/rancher/rke2/data/v1.26.10-rke2r2-c713199d8a74/bin/containerd-shim"
Nov 14 13:53:26 rke2-1 rke2[8599]: time="2023-11-14T13:53:26+08:00" level=info msg="Extracting file bin/containerd-shim-runc-v1 to /var/lib/rancher/rke2/data/v1.26.10-rke2r2-c713199d8a74/bin/containerd-shim-runc-v1"
Nov 14 13:53:28 rke2-1 rke2[8599]: time="2023-11-14T13:53:28+08:00" level=info msg="Extracting file bin/containerd-shim-runc-v2 to /var/lib/rancher/rke2/data/v1.26.10-rke2r2-c713199d8a74/bin/containerd-shim-runc-v2"
Nov 14 13:53:29 rke2-1 rke2[8599]: {"level":"warn","ts":"2023-11-14T13:53:29.50451+0800","logger":"etcd-client","caller":"v3@v3.5.9-k3s1/retry_interceptor.go:62","msg":"retrying of unary invoker failed","target":"etcd-endpoints://0xc00079c8c0/127.0.0.1:2379","attempt":0,"error":"rpc error: code = DeadlineExceeded desc = latest balancer error: last connection error: connection error: desc = \"transport: Error while dialing: dial tcp 127.0.0.1:2379: connect: connection refused\""}
Nov 14 13:53:29 rke2-1 rke2[8599]: {"level":"info","ts":"2023-11-14T13:53:29.505121+0800","logger":"etcd-client","caller":"v3@v3.5.9-k3s1/client.go:210","msg":"Auto sync endpoints failed.","error":"context deadline exceeded"}
Nov 14 13:53:30 rke2-1 rke2[8599]: time="2023-11-14T13:53:30+08:00" level=info msg="Extracting file bin/crictl to /var/lib/rancher/rke2/data/v1.26.10-rke2r2-c713199d8a74/bin/crictl"
Nov 14 13:53:34 rke2-1 rke2[8599]: time="2023-11-14T13:53:34+08:00" level=info msg="Waiting for cri connection: rpc error: code = Unavailable desc = connection error: desc = \"transport: Error while dialing: dial unix /run/k3s/containerd/containerd.sock: connect: no such file or directory\""
Nov 14 13:53:35 rke2-1 rke2[8599]: time="2023-11-14T13:53:35+08:00" level=info msg="Extracting file bin/ctr to /var/lib/rancher/rke2/data/v1.26.10-rke2r2-c713199d8a74/bin/ctr"
Nov 14 13:53:38 rke2-1 rke2[8599]: time="2023-11-14T13:53:38+08:00" level=info msg="Extracting file bin/kubectl to /var/lib/rancher/rke2/data/v1.26.10-rke2r2-c713199d8a74/bin/kubectl"
Nov 14 13:53:44 rke2-1 rke2[8599]: {"level":"warn","ts":"2023-11-14T13:53:44.506216+0800","logger":"etcd-client","caller":"v3@v3.5.9-k3s1/retry_interceptor.go:62","msg":"retrying of unary invoker failed","target":"etcd-endpoints://0xc00079c8c0/127.0.0.1:2379","attempt":0,"error":"rpc error: code = DeadlineExceeded desc = latest balancer error: last connection error: connection error: desc = \"transport: Error while dialing: dial tcp 127.0.0.1:2379: connect: connection refused\""}
Nov 14 13:53:44 rke2-1 rke2[8599]: {"level":"info","ts":"2023-11-14T13:53:44.506471+0800","logger":"etcd-client","caller":"v3@v3.5.9-k3s1/client.go:210","msg":"Auto sync endpoints failed.","error":"context deadline exceeded"}
Nov 14 13:53:44 rke2-1 rke2[8599]: {"level":"warn","ts":"2023-11-14T13:53:44.517355+0800","logger":"etcd-client","caller":"v3@v3.5.9-k3s1/retry_interceptor.go:62","msg":"retrying of unary invoker failed","target":"etcd-endpoints://0xc00079c8c0/127.0.0.1:2379","attempt":0,"error":"rpc error: code = DeadlineExceeded desc = latest balancer error: last connection error: connection error: desc = \"transport: Error while dialing: dial tcp 127.0.0.1:2379: connect: connection refused\""}
Nov 14 13:53:46 rke2-1 rke2[8599]: time="2023-11-14T13:53:46+08:00" level=info msg="Extracting file bin/kubelet to /var/lib/rancher/rke2/data/v1.26.10-rke2r2-c713199d8a74/bin/kubelet"
Nov 14 13:53:54 rke2-1 rke2[8599]: time="2023-11-14T13:53:54+08:00" level=info msg="Waiting for cri connection: rpc error: code = Unavailable desc = connection error: desc = \"transport: Error while dialing: dial unix /run/k3s/containerd/containerd.sock: connect: no such file or directory\""
Nov 14 13:53:59 rke2-1 rke2[8599]: {"level":"warn","ts":"2023-11-14T13:53:59.507419+0800","logger":"etcd-client","caller":"v3@v3.5.9-k3s1/retry_interceptor.go:62","msg":"retrying of unary invoker failed","target":"etcd-endpoints://0xc00079c8c0/127.0.0.1:2379","attempt":0,"error":"rpc error: code = DeadlineExceeded desc = latest balancer error: last connection error: connection error: desc = \"transport: Error while dialing: dial tcp 127.0.0.1:2379: connect: connection refused\""}
Nov 14 13:53:59 rke2-1 rke2[8599]: {"level":"info","ts":"2023-11-14T13:53:59.507749+0800","logger":"etcd-client","caller":"v3@v3.5.9-k3s1/client.go:210","msg":"Auto sync endpoints failed.","error":"context deadline exceeded"}
Nov 14 13:54:00 rke2-1 rke2[8599]: time="2023-11-14T13:54:00+08:00" level=info msg="Extracting file bin/runc to /var/lib/rancher/rke2/data/v1.26.10-rke2r2-c713199d8a74/bin/runc"
Nov 14 13:54:01 rke2-1 rke2[8599]: time="2023-11-14T13:54:01+08:00" level=info msg="Creating directory /var/lib/rancher/rke2/data/v1.26.10-rke2r2-c713199d8a74/charts"
Nov 14 13:54:01 rke2-1 rke2[8599]: time="2023-11-14T13:54:01+08:00" level=info msg="Extracting file charts/harvester-cloud-provider.yaml to /var/lib/rancher/rke2/data/v1.26.10-rke2r2-c713199d8a74/charts/harvester-cloud-provider.yaml"
Nov 14 13:54:01 rke2-1 rke2[8599]: time="2023-11-14T13:54:01+08:00" level=info msg="Extracting file charts/harvester-csi-driver.yaml to /var/lib/rancher/rke2/data/v1.26.10-rke2r2-c713199d8a74/charts/harvester-csi-driver.yaml"
Nov 14 13:54:01 rke2-1 rke2[8599]: time="2023-11-14T13:54:01+08:00" level=info msg="Extracting file charts/rancher-vsphere-cpi.yaml to /var/lib/rancher/rke2/data/v1.26.10-rke2r2-c713199d8a74/charts/rancher-vsphere-cpi.yaml"
Nov 14 13:54:01 rke2-1 rke2[8599]: time="2023-11-14T13:54:01+08:00" level=info msg="Extracting file charts/rancher-vsphere-csi.yaml to /var/lib/rancher/rke2/data/v1.26.10-rke2r2-c713199d8a74/charts/rancher-vsphere-csi.yaml"
Nov 14 13:54:01 rke2-1 rke2[8599]: time="2023-11-14T13:54:01+08:00" level=info msg="Extracting file charts/rke2-calico-crd.yaml to /var/lib/rancher/rke2/data/v1.26.10-rke2r2-c713199d8a74/charts/rke2-calico-crd.yaml"
Nov 14 13:54:02 rke2-1 rke2[8599]: time="2023-11-14T13:54:02+08:00" level=info msg="Extracting file charts/rke2-calico.yaml to /var/lib/rancher/rke2/data/v1.26.10-rke2r2-c713199d8a74/charts/rke2-calico.yaml"
Nov 14 13:54:02 rke2-1 rke2[8599]: time="2023-11-14T13:54:02+08:00" level=info msg="Extracting file charts/rke2-canal.yaml to /var/lib/rancher/rke2/data/v1.26.10-rke2r2-c713199d8a74/charts/rke2-canal.yaml"
Nov 14 13:54:02 rke2-1 rke2[8599]: time="2023-11-14T13:54:02+08:00" level=info msg="Extracting file charts/rke2-cilium.yaml to /var/lib/rancher/rke2/data/v1.26.10-rke2r2-c713199d8a74/charts/rke2-cilium.yaml"
Nov 14 13:54:02 rke2-1 rke2[8599]: time="2023-11-14T13:54:02+08:00" level=info msg="Extracting file charts/rke2-coredns.yaml to /var/lib/rancher/rke2/data/v1.26.10-rke2r2-c713199d8a74/charts/rke2-coredns.yaml"
Nov 14 13:54:02 rke2-1 rke2[8599]: time="2023-11-14T13:54:02+08:00" level=info msg="Extracting file charts/rke2-ingress-nginx.yaml to /var/lib/rancher/rke2/data/v1.26.10-rke2r2-c713199d8a74/charts/rke2-ingress-nginx.yaml"
Nov 14 13:54:02 rke2-1 rke2[8599]: time="2023-11-14T13:54:02+08:00" level=info msg="Extracting file charts/rke2-metrics-server.yaml to /var/lib/rancher/rke2/data/v1.26.10-rke2r2-c713199d8a74/charts/rke2-metrics-server.yaml"
Nov 14 13:54:02 rke2-1 rke2[8599]: time="2023-11-14T13:54:02+08:00" level=info msg="Extracting file charts/rke2-multus.yaml to /var/lib/rancher/rke2/data/v1.26.10-rke2r2-c713199d8a74/charts/rke2-multus.yaml"
Nov 14 13:54:02 rke2-1 rke2[8599]: time="2023-11-14T13:54:02+08:00" level=info msg="Extracting file charts/rke2-snapshot-controller-crd.yaml to /var/lib/rancher/rke2/data/v1.26.10-rke2r2-c713199d8a74/charts/rke2-snapshot-controller-crd.yaml"
Nov 14 13:54:02 rke2-1 rke2[8599]: time="2023-11-14T13:54:02+08:00" level=info msg="Extracting file charts/rke2-snapshot-controller.yaml to /var/lib/rancher/rke2/data/v1.26.10-rke2r2-c713199d8a74/charts/rke2-snapshot-controller.yaml"
Nov 14 13:54:02 rke2-1 rke2[8599]: time="2023-11-14T13:54:02+08:00" level=info msg="Extracting file charts/rke2-snapshot-validation-webhook.yaml to /var/lib/rancher/rke2/data/v1.26.10-rke2r2-c713199d8a74/charts/rke2-snapshot-validation-webhook.yaml"
```

注意：这里是解压到 `/var/lib/rancher/rke2/data/v1.26.10-rke2r2-c713199d8a74` 目录。

15. 生成各组件的 manifest

```
Nov 14 13:54:02 rke2-1 rke2[8599]: time="2023-11-14T13:54:02+08:00" level=info msg="Updated manifest /var/lib/rancher/rke2/server/manifests/rke2-metrics-server.yaml to set cluster configuration values"
Nov 14 13:54:02 rke2-1 rke2[8599]: time="2023-11-14T13:54:02+08:00" level=info msg="Updated manifest /var/lib/rancher/rke2/server/manifests/rke2-multus.yaml to set cluster configuration values"
Nov 14 13:54:02 rke2-1 rke2[8599]: time="2023-11-14T13:54:02+08:00" level=info msg="Updated manifest /var/lib/rancher/rke2/server/manifests/harvester-cloud-provider.yaml to set cluster configuration values"
Nov 14 13:54:02 rke2-1 rke2[8599]: time="2023-11-14T13:54:02+08:00" level=info msg="Updated manifest /var/lib/rancher/rke2/server/manifests/rke2-calico-crd.yaml to set cluster configuration values"
Nov 14 13:54:02 rke2-1 rke2[8599]: time="2023-11-14T13:54:02+08:00" level=info msg="Updated manifest /var/lib/rancher/rke2/server/manifests/rancher-vsphere-csi.yaml to set cluster configuration values"
Nov 14 13:54:02 rke2-1 rke2[8599]: time="2023-11-14T13:54:02+08:00" level=info msg="Updated manifest /var/lib/rancher/rke2/server/manifests/rke2-cilium.yaml to set cluster configuration values"
Nov 14 13:54:02 rke2-1 rke2[8599]: time="2023-11-14T13:54:02+08:00" level=info msg="Updated manifest /var/lib/rancher/rke2/server/manifests/rke2-coredns.yaml to set cluster configuration values"
Nov 14 13:54:02 rke2-1 rke2[8599]: time="2023-11-14T13:54:02+08:00" level=info msg="Updated manifest /var/lib/rancher/rke2/server/manifests/rke2-ingress-nginx.yaml to set cluster configuration values"
Nov 14 13:54:02 rke2-1 rke2[8599]: time="2023-11-14T13:54:02+08:00" level=info msg="Updated manifest /var/lib/rancher/rke2/server/manifests/rke2-snapshot-validation-webhook.yaml to set cluster configuration values"
Nov 14 13:54:02 rke2-1 rke2[8599]: time="2023-11-14T13:54:02+08:00" level=info msg="Updated manifest /var/lib/rancher/rke2/server/manifests/harvester-csi-driver.yaml to set cluster configuration values"
Nov 14 13:54:02 rke2-1 rke2[8599]: time="2023-11-14T13:54:02+08:00" level=info msg="Updated manifest /var/lib/rancher/rke2/server/manifests/rancher-vsphere-cpi.yaml to set cluster configuration values"
Nov 14 13:54:02 rke2-1 rke2[8599]: time="2023-11-14T13:54:02+08:00" level=info msg="Updated manifest /var/lib/rancher/rke2/server/manifests/rke2-snapshot-controller.yaml to set cluster configuration values"
Nov 14 13:54:02 rke2-1 rke2[8599]: time="2023-11-14T13:54:02+08:00" level=info msg="Updated manifest /var/lib/rancher/rke2/server/manifests/rke2-canal.yaml to set cluster configuration values"
Nov 14 13:54:02 rke2-1 rke2[8599]: time="2023-11-14T13:54:02+08:00" level=info msg="Updated manifest /var/lib/rancher/rke2/server/manifests/rke2-snapshot-controller-crd.yaml to set cluster configuration values"
Nov 14 13:54:02 rke2-1 rke2[8599]: time="2023-11-14T13:54:02+08:00" level=info msg="Updated manifest /var/lib/rancher/rke2/server/manifests/rke2-calico.yaml to set cluster configuration values"
```

根据启动时，RKE2 的配置，生成 manifest。

16. 运行 containerd：

```
Nov 14 13:54:02 rke2-1 rke2[8599]: time="2023-11-14T13:54:02+08:00" level=info msg="Logging containerd to /var/lib/rancher/rke2/agent/containerd/containerd.log"
Nov 14 13:54:02 rke2-1 rke2[8599]: time="2023-11-14T13:54:02+08:00" level=info msg="Running containerd -c /var/lib/rancher/rke2/agent/etc/containerd/config.toml -a /run/k3s/containerd/containerd.sock --state /run/k3s/containerd --root /var/lib/rancher/rke2/agent/containerd"
Nov 14 13:54:03 rke2-1 rke2[8599]: time="2023-11-14T13:54:03+08:00" level=info msg="containerd is now running"
```

18. 等待 ETCD、API-server

```
Nov 14 13:54:14 rke2-1 rke2[8599]: time="2023-11-14T13:54:14+08:00" level=info msg="Waiting for etcd server to become available"
Nov 14 13:54:14 rke2-1 rke2[8599]: time="2023-11-14T13:54:14+08:00" level=info msg="Waiting for API server to become available"
Nov 14 13:54:14 rke2-1 rke2[8599]: time="2023-11-14T13:54:14+08:00" level=info msg="Pod for etcd not synced (pod sandbox not found), retrying"
Nov 14 13:54:19 rke2-1 rke2[8599]: {"level":"warn","ts":"2023-11-14T13:54:19.520655+0800","logger":"etcd-client","caller":"v3@v3.5.9-k3s1/retry_interceptor.go:62","msg":"retrying of unary invoker failed","target":"etcd-endpoints://0xc00079c8c0/127.0.0.1:2379","attempt":0,"error":"rpc error: code = DeadlineExceeded desc = latest balancer error: last connection error: connection error: desc = \"transport: Error while dialing: dial tcp 127.0.0.1:2379: connect: connection refused\""}
Nov 14 13:54:19 rke2-1 rke2[8599]: time="2023-11-14T13:54:19+08:00" level=info msg="Failed to test data store connection: context deadline exceeded"
```

以上日志会不断重复，直到连接到 etcd 和 api-server。

19. 拉取控制组件所需的镜像

```
Nov 14 13:54:03 rke2-1 rke2[8599]: time="2023-11-14T13:54:03+08:00" level=info msg="Pulling images from /var/lib/rancher/rke2/agent/images/cloud-controller-manager-image.txt"
Nov 14 13:54:03 rke2-1 rke2[8599]: time="2023-11-14T13:54:03+08:00" level=info msg="Pulling image registry.cn-hangzhou.aliyuncs.com/rancher/rke2-cloud-provider:v1.26.3-build20230406..."
Nov 14 13:54:42 rke2-1 rke2[8599]: time="2023-11-14T13:54:42+08:00" level=info msg="Imported images from /var/lib/rancher/rke2/agent/images/cloud-controller-manager-image.txt in 38.674959554s"
Nov 14 13:54:42 rke2-1 rke2[8599]: time="2023-11-14T13:54:42+08:00" level=info msg="Pulling images from /var/lib/rancher/rke2/agent/images/etcd-image.txt"
Nov 14 13:54:42 rke2-1 rke2[8599]: time="2023-11-14T13:54:42+08:00" level=info msg="Pulling image registry.cn-hangzhou.aliyuncs.com/rancher/hardened-etcd:v3.5.9-k3s1-build20230802..."
Nov 14 13:55:20 rke2-1 rke2[8599]: time="2023-11-14T13:55:20+08:00" level=info msg="Imported images from /var/lib/rancher/rke2/agent/images/etcd-image.txt in 38.118768598s"
Nov 14 13:55:20 rke2-1 rke2[8599]: time="2023-11-14T13:55:20+08:00" level=info msg="Pulling images from /var/lib/rancher/rke2/agent/images/kube-apiserver-image.txt"
Nov 14 13:55:20 rke2-1 rke2[8599]: time="2023-11-14T13:55:20+08:00" level=info msg="Pulling image registry.cn-hangzhou.aliyuncs.com/rancher/hardened-kubernetes:v1.26.10-rke2r2-build20231102..."
Nov 14 13:57:43 rke2-1 rke2[8599]: time="2023-11-14T13:57:43+08:00" level=info msg="Imported images from /var/lib/rancher/rke2/agent/images/kube-apiserver-image.txt in 2m23.715150473s"
Nov 14 13:57:43 rke2-1 rke2[8599]: time="2023-11-14T13:57:43+08:00" level=info msg="Pulling images from /var/lib/rancher/rke2/agent/images/kube-controller-manager-image.txt"
Nov 14 13:57:43 rke2-1 rke2[8599]: time="2023-11-14T13:57:43+08:00" level=info msg="Imported images from /var/lib/rancher/rke2/agent/images/kube-controller-manager-image.txt in 2.251005ms"
Nov 14 13:57:43 rke2-1 rke2[8599]: time="2023-11-14T13:57:43+08:00" level=info msg="Pulling images from /var/lib/rancher/rke2/agent/images/kube-scheduler-image.txt"
Nov 14 13:57:43 rke2-1 rke2[8599]: time="2023-11-14T13:57:43+08:00" level=info msg="Imported images from /var/lib/rancher/rke2/agent/images/kube-scheduler-image.txt in 685.306µs"
```

包括：rancher/rke2-cloud-provider、rancher/hardened-etcd、rancher/hardened-kubernetes、kube-controller-manager-image、kube-scheduler-image

20. 运行 kubelet

```
Nov 14 13:57:43 rke2-1 rke2[8599]: time="2023-11-14T13:57:43+08:00" level=info msg="Running kubelet --address=0.0.0.0 --alsologtostderr=false --anonymous-auth=false --authentication-token-webhook=true --authorization-mode=Webhook --cgroup-driver=systemd --client-ca-file=/var/lib/rancher/rke2/agent/client-ca.crt --cloud-provider=external --cluster-dns=10.43.0.10 --cluster-domain=cluster.local --container-runtime-endpoint=unix:///run/k3s/containerd/containerd.sock --containerd=/run/k3s/containerd/containerd.sock --eviction-hard=imagefs.available<5%,nodefs.available<5% --eviction-minimum-reclaim=imagefs.available=10%,nodefs.available=10% --fail-swap-on=false --healthz-bind-address=127.0.0.1 --hostname-override=rke2-1 --kubeconfig=/var/lib/rancher/rke2/agent/kubelet.kubeconfig --log-file=/var/lib/rancher/rke2/agent/logs/kubelet.log --log-file-max-size=50 --logtostderr=false --node-ip=192.168.205.79 --node-labels= --pod-infra-container-image=registry.cn-hangzhou.aliyuncs.com/rancher/pause:3.6 --pod-manifest-path=/var/lib/rancher/rke2/agent/pod-manifests --read-only-port=0 --resolv-conf=/var/lib/rancher/rke2/agent/etc/resolv.conf --serialize-image-pulls=false --stderrthreshold=FATAL --tls-cert-file=/var/lib/rancher/rke2/agent/serving-kubelet.crt --tls-private-key-file=/var/lib/rancher/rke2/agent/serving-kubelet.key"
Nov 14 13:57:44 rke2-1 rke2[8599]: time="2023-11-14T13:57:44+08:00" level=info msg="Connecting to proxy" url="wss://127.0.0.1:9345/v1-rke2/connect"
Nov 14 13:57:44 rke2-1 rke2[8599]: time="2023-11-14T13:57:44+08:00" level=info msg="Handling backend connection request [rke2-1]"
```

rke2 服务器进程在端口 9345 上侦听要注册的新节点，参考：https://docs.rke2.io/install/ha

21. 检索 ETCD，并确认启动：

```
Nov 14 13:57:54 rke2-1 rke2[8599]: time="2023-11-14T13:57:54+08:00" level=info msg="Defragmenting etcd database"
Nov 14 13:57:54 rke2-1 rke2[8599]: time="2023-11-14T13:57:54+08:00" level=info msg="Pod for etcd is synced"
Nov 14 13:57:55 rke2-1 rke2[8599]: time="2023-11-14T13:57:55+08:00" level=info msg="etcd data store connection OK"
Nov 14 13:57:55 rke2-1 rke2[8599]: time="2023-11-14T13:57:55+08:00" level=info msg="Saving cluster bootstrap data to datastore"
Nov 14 13:57:55 rke2-1 rke2[8599]: time="2023-11-14T13:57:55+08:00" level=info msg="Waiting for API server to become available"
```

22. 检索 api-server、kube-proxy、cloud-controller-manager，并确认 RKE2 启动

```
Nov 14 13:58:14 rke2-1 rke2[8599]: time="2023-11-14T13:58:14+08:00" level=info msg="Waiting for API server to become available"
Nov 14 13:58:14 rke2-1 rke2[8599]: time="2023-11-14T13:58:14+08:00" level=info msg="Waiting to retrieve kube-proxy configuration; server is not ready: https://127.0.0.1:9345/v1-rke2/readyz: 500 Internal Server Error"
Nov 14 13:58:15 rke2-1 rke2[8599]: time="2023-11-14T13:58:15+08:00" level=info msg="Annotations and labels have been set successfully on node: rke2-1"
Nov 14 13:58:15 rke2-1 rke2[8599]: time="2023-11-14T13:58:15+08:00" level=info msg="Waiting for cloud-controller-manager privileges to become available"
Nov 14 13:58:15 rke2-1 rke2[8599]: time="2023-11-14T13:58:15+08:00" level=info msg="Kube API server is now running"
Nov 14 13:58:15 rke2-1 rke2[8599]: time="2023-11-14T13:58:15+08:00" level=info msg="Creating rke2-supervisor event broadcaster"
Nov 14 13:58:15 rke2-1 rke2[8599]: time="2023-11-14T13:58:15+08:00" level=info msg="Applying Cluster Role Bindings"
Nov 14 13:58:15 rke2-1 rke2[8599]: time="2023-11-14T13:58:15+08:00" level=info msg="Watching for delete of rke2-1 Node object"
Nov 14 13:58:15 rke2-1 rke2[8599]: time="2023-11-14T13:58:15+08:00" level=info msg="Applying CRD helmcharts.helm.cattle.io"
Nov 14 13:58:15 rke2-1 rke2[8599]: time="2023-11-14T13:58:15+08:00" level=info msg="Applying CRD helmchartconfigs.helm.cattle.io"
Nov 14 13:58:15 rke2-1 rke2[8599]: time="2023-11-14T13:58:15+08:00" level=info msg="Applying CRD addons.k3s.cattle.io"
Nov 14 13:58:16 rke2-1 rke2[8599]: time="2023-11-14T13:58:16+08:00" level=info msg="Applying CRD etcdsnapshotfiles.k3s.cattle.io"
Nov 14 13:58:18 rke2-1 rke2[8599]: time="2023-11-14T13:58:18+08:00" level=info msg="Cluster Role Bindings applied successfully"
Nov 14 13:58:18 rke2-1 rke2[8599]: time="2023-11-14T13:58:18+08:00" level=info msg="ETCD server is now running"
Nov 14 13:58:18 rke2-1 rke2[8599]: time="2023-11-14T13:58:18+08:00" level=info msg="rke2 is up and running"
Nov 14 13:58:18 rke2-1 systemd[1]: Started Rancher Kubernetes Engine v2 (server).
```

注意，以上还 Apply 了 4 个 CRD，这个是 RKE2/K3s 特定的功能。
