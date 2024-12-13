---
layout: post
title: RKE2 证书轮换
subtitle:
date: 2024-2-6 11:07:00 +0800
author: Ksd
header-img: img/post-bg-debug.jpg
catalog: true
tags:
  - RKE2
---

## 说明

默认情况下，RKE2 中的证书在 12 个月后过期。

如果证书已经过期或剩余的时间不足 90 天，则在 RKE2 重启时轮换证书。

从 v1.21.8+rke2r1 开始，你可以手动轮换证书。为此，建议先停止 rke2-server 进程，然后轮换证书，最后再次启动该进程：

```
systemctl stop rke2-server
rke2 certificate rotate
systemctl start rke2-server
```

你也可以通过传递 `--service` 标志来轮换单个服务，例如：`rke2 certificate rotate --service api-server`。

## 单 RKE2 Server 集群轮换证书

### 环境说明

本节要演示单个 rke2 server 集群的证书更新，所以在本节的环境只包含一个 rke2 server 和一个 rke2 agent 节点：

| 主机名 | 角色          | IP             |
| ------ | ------------- | -------------- |
| ha-m1  | Control-Plane | 192.168.205.85 |
| ha-w1  | Worker        | 192.168.205.88 |

```
root@ha-m1:~# kubectl get node
NAME    STATUS   ROLES                       AGE   VERSION
ha-m1   Ready    control-plane,etcd,master   52m   v1.27.10+rke2r1
ha-w1   Ready    <none>                      12m   v1.27.10+rke2r1
```

### 手动轮换证书

1. 查看当前证书过期时间

```
root@ha-m1:~# kubectl get secret -n kube-system rke2-serving -o jsonpath='{.data.tls\.crt}' | base64 -d | openssl x509 -noout -text | grep Not
            Not Before: Feb 21 05:48:02 2024 GMT
            Not After : Feb 20 06:41:05 2025 GMT
root@ha-m1:~# for i in `ls /var/lib/rancher/rke2/server/tls/*.crt`; do echo $i; openssl x509 -enddate -noout -in $i; done
/var/lib/rancher/rke2/server/tls/client-admin.crt
notAfter=Feb 20 06:41:05 2025 GMT
/var/lib/rancher/rke2/server/tls/client-auth-proxy.crt
notAfter=Feb 20 06:41:05 2025 GMT
/var/lib/rancher/rke2/server/tls/client-ca.crt
notAfter=Feb 18 05:48:02 2034 GMT
/var/lib/rancher/rke2/server/tls/client-ca.nochain.crt
notAfter=Feb 18 05:48:02 2034 GMT
/var/lib/rancher/rke2/server/tls/client-controller.crt
notAfter=Feb 20 06:41:05 2025 GMT
/var/lib/rancher/rke2/server/tls/client-kube-apiserver.crt
notAfter=Feb 20 06:41:05 2025 GMT
/var/lib/rancher/rke2/server/tls/client-kube-proxy.crt
notAfter=Feb 20 06:41:05 2025 GMT
/var/lib/rancher/rke2/server/tls/client-rke2-cloud-controller.crt
notAfter=Feb 20 06:41:05 2025 GMT
/var/lib/rancher/rke2/server/tls/client-rke2-controller.crt
notAfter=Feb 20 06:41:05 2025 GMT
/var/lib/rancher/rke2/server/tls/client-scheduler.crt
notAfter=Feb 20 06:41:05 2025 GMT
/var/lib/rancher/rke2/server/tls/client-supervisor.crt
notAfter=Feb 20 05:48:02 2025 GMT
/var/lib/rancher/rke2/server/tls/request-header-ca.crt
notAfter=Feb 18 05:48:02 2034 GMT
/var/lib/rancher/rke2/server/tls/server-ca.crt
notAfter=Feb 18 05:48:02 2034 GMT
/var/lib/rancher/rke2/server/tls/server-ca.nochain.crt
notAfter=Feb 18 05:48:02 2034 GMT
/var/lib/rancher/rke2/server/tls/serving-kube-apiserver.crt
notAfter=Feb 20 06:41:05 2025 GMT
```

2. 登录到 rke2 server 节点，执行手动轮换证书

```
root@ha-m1:~# systemctl stop rke2-server

root@ha-m1:~# rke2 certificate rotate
INFO[0000] Server detected, rotating server certificates
INFO[0000] Rotating certificates for admin service
INFO[0000] Rotating certificates for etcd service
INFO[0000] Rotating certificates for api-server service
INFO[0000] Rotating certificates for controller-manager service
INFO[0000] Rotating certificates for cloud-controller service
INFO[0000] Rotating certificates for scheduler service
INFO[0000] Rotating certificates for rke2-server service
INFO[0000] Rotating dynamic listener certificate
INFO[0000] Rotating certificates for rke2-controller service
INFO[0000] Rotating certificates for auth-proxy service
INFO[0000] Rotating certificates for kubelet service
INFO[0000] Rotating certificates for kube-proxy service
INFO[0000] Successfully backed up certificates for all services to path /var/lib/rancher/rke2/server/tls-1708499173, please restart rke2 server or agent to rotate certificates

root@ha-m1:~# systemctl start rke2-server
```

3. 确认证书已经轮换成功

```
root@ha-m1:~# kubectl get secret -n kube-system rke2-serving -o jsonpath='{.data.tls\.crt}' | base64 -d | openssl x509 -noout -text | grep Not
            Not Before: Feb 21 05:48:02 2024 GMT
            Not After : Feb 20 07:06:36 2025 GMT
root@ha-m1:~# for i in `ls /var/lib/rancher/rke2/server/tls/*.crt`; do echo $i; openssl x509 -enddate -noout -in $i; done
/var/lib/rancher/rke2/server/tls/client-admin.crt
notAfter=Feb 20 07:06:36 2025 GMT
/var/lib/rancher/rke2/server/tls/client-auth-proxy.crt
notAfter=Feb 20 07:06:36 2025 GMT
/var/lib/rancher/rke2/server/tls/client-ca.crt
notAfter=Feb 18 05:48:02 2034 GMT
/var/lib/rancher/rke2/server/tls/client-ca.nochain.crt
notAfter=Feb 18 05:48:02 2034 GMT
/var/lib/rancher/rke2/server/tls/client-controller.crt
notAfter=Feb 20 07:06:36 2025 GMT
/var/lib/rancher/rke2/server/tls/client-kube-apiserver.crt
notAfter=Feb 20 07:06:36 2025 GMT
/var/lib/rancher/rke2/server/tls/client-kube-proxy.crt
notAfter=Feb 20 07:06:36 2025 GMT
/var/lib/rancher/rke2/server/tls/client-rke2-cloud-controller.crt
notAfter=Feb 20 07:06:36 2025 GMT
/var/lib/rancher/rke2/server/tls/client-rke2-controller.crt
notAfter=Feb 20 07:06:36 2025 GMT
/var/lib/rancher/rke2/server/tls/client-scheduler.crt
notAfter=Feb 20 07:06:36 2025 GMT
/var/lib/rancher/rke2/server/tls/client-supervisor.crt
notAfter=Feb 20 05:48:02 2025 GMT
/var/lib/rancher/rke2/server/tls/request-header-ca.crt
notAfter=Feb 18 05:48:02 2034 GMT
/var/lib/rancher/rke2/server/tls/server-ca.crt
notAfter=Feb 18 05:48:02 2034 GMT
/var/lib/rancher/rke2/server/tls/server-ca.nochain.crt
notAfter=Feb 18 05:48:02 2034 GMT
/var/lib/rancher/rke2/server/tls/serving-kube-apiserver.crt
notAfter=Feb 20 07:06:36 2025 GMT
```

从以上结果可以看出，除了 ca 证书以外，证书已经成功轮换，并延长了 1 年的证书有效期

### 通过重启 RKE2 服务轮换证书

默认情况下，RKE2 中的证书在 12 个月后过期。

如果证书已经过期或剩余的时间不足 90 天，则可以通过重启 RKE2 Server/Agent 时自动轮换证书。

1. 确认当前集群证书已经过期

```
root@ha-m1:~# kubectl get nodes
Unable to connect to the server: tls: failed to verify certificate: x509: certificate has expired or is not yet valid: current time 2025-02-28T00:00:15+08:00 is after 2025-02-25T06:26:10Z
```

2. 通过重启 rke2 server 服务，轮换证书

```
root@ha-m1:~# systemctl restart rke2-server.service
```

个别环境会出现无法通过重启 rke2 server 轮换证书，可以删除 `rke2-serving` secret 和 `/var/lib/rancher/rke2/server/tls/dynamic-cert.json` 然后再次重启 rke2 server 服务来轮换：

```
root@ha-m1:~# kubectl --insecure-skip-tls-verify delete secret rke2-serving -n kube-system
secret "rke2-serving" deleted
root@ha-m1:~# rm -rf /var/lib/rancher/rke2/server/tls/dynamic-cert.json
root@ha-m1:~# systemctl restart rke2-server.service
```

3. 重启所有 rke2 agent 服务

登录到**所有**rke2 agent 节点，重启 rke2 agent 服务：

```
root@ha-w1:~# systemctl restart rke2-agent.service
```

如果不重启 rke2 agent 服务，agent 节点的状态为：NotReady， 并且 kube-proxy 会报错：

```
W0227 16:09:35.340198       1 reflector.go:533] k8s.io/client-go/informers/factory.go:150: failed to list *v1.EndpointSlice: Unauthorized
E0227 16:09:35.340376       1 reflector.go:148] k8s.io/client-go/informers/factory.go:150: Failed to watch *v1.EndpointSlice: failed to list *v1.EndpointSlice: Unauthorized
W0227 16:09:38.517400       1 reflector.go:533] k8s.io/client-go/informers/factory.go:150: failed to list *v1.Service: Unauthorized
E0227 16:09:38.517694       1 reflector.go:148] k8s.io/client-go/informers/factory.go:150: Failed to watch *v1.Service: failed to list *v1.Service: Unauthorized
```

4. 确认证书已经轮换成功

```
root@ha-m1:~# kubectl get secret -n kube-system rke2-serving -o jsonpath='{.data.tls\.crt}' | base64 -d | openssl x509 -noout -text | grep Not
            Not Before: Feb 26 06:26:10 2024 GMT
            Not After : Feb 27 16:04:48 2026 GMT
root@ha-m1:~# for i in `ls /var/lib/rancher/rke2/server/tls/*.crt`; do echo $i; openssl x509 -enddate -noout -in $i; done
/var/lib/rancher/rke2/server/tls/client-admin.crt
notAfter=Feb 27 16:00:44 2026 GMT
/var/lib/rancher/rke2/server/tls/client-auth-proxy.crt
notAfter=Feb 27 16:00:44 2026 GMT
/var/lib/rancher/rke2/server/tls/client-ca.crt
notAfter=Feb 23 06:26:10 2034 GMT
/var/lib/rancher/rke2/server/tls/client-ca.nochain.crt
notAfter=Feb 23 06:26:10 2034 GMT
/var/lib/rancher/rke2/server/tls/client-controller.crt
notAfter=Feb 27 16:00:44 2026 GMT
/var/lib/rancher/rke2/server/tls/client-kube-apiserver.crt
notAfter=Feb 27 16:00:44 2026 GMT
/var/lib/rancher/rke2/server/tls/client-kube-proxy.crt
notAfter=Feb 27 16:00:44 2026 GMT
/var/lib/rancher/rke2/server/tls/client-rke2-cloud-controller.crt
notAfter=Feb 27 16:00:44 2026 GMT
/var/lib/rancher/rke2/server/tls/client-rke2-controller.crt
notAfter=Feb 27 16:00:44 2026 GMT
/var/lib/rancher/rke2/server/tls/client-scheduler.crt
notAfter=Feb 27 16:00:44 2026 GMT
/var/lib/rancher/rke2/server/tls/client-supervisor.crt
notAfter=Feb 27 16:00:44 2026 GMT
/var/lib/rancher/rke2/server/tls/request-header-ca.crt
notAfter=Feb 23 06:26:10 2034 GMT
/var/lib/rancher/rke2/server/tls/server-ca.crt
notAfter=Feb 23 06:26:10 2034 GMT
/var/lib/rancher/rke2/server/tls/server-ca.nochain.crt
notAfter=Feb 23 06:26:10 2034 GMT
/var/lib/rancher/rke2/server/tls/serving-kube-apiserver.crt
notAfter=Feb 27 16:00:44 2026 GMT
```

从以上结果可以看出，除了 ca 证书以外，证书已经成功轮换，并延长了 1 年的证书有效期

## 高可用 RKE2 Server 集群轮换证书

### 环境说明

本节要演示高可用 rke2 server 集群的证书更新，在本节的环境包含三个 rke2 server 和一个 rke2 agent 节点：

| 主机名 | 角色          | IP             |
| ------ | ------------- | -------------- |
| ha-m1  | Control-Plane | 192.168.205.85 |
| ha-m2  | Control-Plane | 192.168.205.86 |
| ha-m3  | Control-Plane | 192.168.205.89 |
| ha-w1  | Worker        | 192.168.205.88 |

```
root@ha-m1:~# kubectl get nodes
NAME    STATUS   ROLES                       AGE    VERSION
ha-m1   Ready    control-plane,etcd,master   41m    v1.27.10+rke2r1
ha-m2   Ready    control-plane,etcd,master   37m    v1.27.10+rke2r1
ha-m3   Ready    control-plane,etcd,master   13m    v1.27.10+rke2r1
ha-w1   Ready    <none>                      109s   v1.27.10+rke2r1
```

### 手动轮换证书

1. 查看当前证书过期时间

```
root@ha-m1:~# kubectl get secret -n kube-system rke2-serving -o jsonpath='{.data.tls\.crt}' | base64 -d | openssl x509 -noout -text | grep Not
            Not Before: Feb 26 07:28:16 2024 GMT
            Not After : Feb 25 07:58:12 2025 GMT
root@ha-m1:~# for i in `ls /var/lib/rancher/rke2/server/tls/*.crt`; do echo $i; openssl x509 -enddate -noout -in $i; done
/var/lib/rancher/rke2/server/tls/client-admin.crt
notAfter=Feb 25 07:28:16 2025 GMT
/var/lib/rancher/rke2/server/tls/client-auth-proxy.crt
notAfter=Feb 25 07:28:16 2025 GMT
/var/lib/rancher/rke2/server/tls/client-ca.crt
notAfter=Feb 23 07:28:16 2034 GMT
/var/lib/rancher/rke2/server/tls/client-ca.nochain.crt
notAfter=Feb 23 07:28:16 2034 GMT
/var/lib/rancher/rke2/server/tls/client-controller.crt
notAfter=Feb 25 07:28:16 2025 GMT
/var/lib/rancher/rke2/server/tls/client-kube-apiserver.crt
notAfter=Feb 25 07:28:16 2025 GMT
/var/lib/rancher/rke2/server/tls/client-kube-proxy.crt
notAfter=Feb 25 07:28:16 2025 GMT
/var/lib/rancher/rke2/server/tls/client-rke2-cloud-controller.crt
notAfter=Feb 25 07:28:16 2025 GMT
/var/lib/rancher/rke2/server/tls/client-rke2-controller.crt
notAfter=Feb 25 07:28:16 2025 GMT
/var/lib/rancher/rke2/server/tls/client-scheduler.crt
notAfter=Feb 25 07:28:16 2025 GMT
/var/lib/rancher/rke2/server/tls/client-supervisor.crt
notAfter=Feb 25 07:28:16 2025 GMT
/var/lib/rancher/rke2/server/tls/request-header-ca.crt
notAfter=Feb 23 07:28:16 2034 GMT
/var/lib/rancher/rke2/server/tls/server-ca.crt
notAfter=Feb 23 07:28:16 2034 GMT
/var/lib/rancher/rke2/server/tls/server-ca.nochain.crt
notAfter=Feb 23 07:28:16 2034 GMT
/var/lib/rancher/rke2/server/tls/serving-kube-apiserver.crt
notAfter=Feb 25 07:28:16 2025 GMT
```

2. 分别登录到**每个** rke2 server 节点，**逐个**执行手动轮换证书

```
root@ha-m1:~# systemctl stop rke2-server

root@ha-m1:~# rke2 certificate rotate
INFO[0000] Server detected, rotating server certificates
INFO[0000] Rotating certificates for admin service
INFO[0000] Rotating certificates for etcd service
INFO[0000] Rotating certificates for api-server service
INFO[0000] Rotating certificates for controller-manager service
INFO[0000] Rotating certificates for cloud-controller service
INFO[0000] Rotating certificates for scheduler service
INFO[0000] Rotating certificates for rke2-server service
INFO[0000] Rotating dynamic listener certificate
INFO[0000] Rotating certificates for rke2-controller service
INFO[0000] Rotating certificates for auth-proxy service
INFO[0000] Rotating certificates for kubelet service
INFO[0000] Rotating certificates for kube-proxy service
INFO[0000] Successfully backed up certificates for all services to path /var/lib/rancher/rke2/server/tls-1708935371, please restart rke2 server or agent to rotate certificates

root@ha-m1:~# systemctl start rke2-server
```

3. 分别在**每个** rke2 server 节点确认证书已经轮换成功

```
root@ha-m1:~# kubectl get secret -n kube-system rke2-serving -o jsonpath='{.data.tls\.crt}' | base64 -d | openssl x509 -noout -text | grep Not

root@ha-m1:~# for i in `ls /var/lib/rancher/rke2/server/tls/*.crt`; do echo $i; openssl x509 -enddate -noout -in $i; done
root@ha-m2:~# for i in `ls /var/lib/rancher/rke2/server/tls/*.crt`; do echo $i; openssl x509 -enddate -noout -in $i; done
root@ha-m3:~# for i in `ls /var/lib/rancher/rke2/server/tls/*.crt`; do echo $i; openssl x509 -enddate -noout -in $i; done
```

从以上结果可以看出，除了 ca 证书以外，每个节点的证书已经成功轮换，并延长了 1 年的证书有效期

### 通过重启 RKE2 服务轮换证书

默认情况下，RKE2 中的证书在 12 个月后过期。

如果证书已经过期或剩余的时间不足 90 天，则可以通过重启 RKE2 Server/Agent 时自动轮换证书。

1. 确认当前集群证书已经过期

```
root@ha-m1:~# kubectl get nodes
E0322 00:00:12.338728    2608 memcache.go:265] couldn't get current server API group list: Get "https://127.0.0.1:6443/api?timeout=32s": tls: failed to verify certificate: x509: certificate has expired or is not yet valid: current time 2025-03-22T00:00:12+08:00 is after 2025-02-26T07:12:15Z
```

2. 通过重启所有三个节点的 rke2 server 服务，轮换证书：

```
root@ha-m1:~# rm -rf /var/lib/rancher/rke2/server/tls/dynamic-cert.json
root@ha-m1:~# systemctl restart rke2-server.service
```

```
root@ha-m2:~# rm -rf /var/lib/rancher/rke2/server/tls/dynamic-cert.json
root@ha-m2:~# systemctl restart rke2-server.service
```

```
root@ha-m3:~# rm -rf /var/lib/rancher/rke2/server/tls/dynamic-cert.json
root@ha-m3:~# systemctl restart rke2-server.service
```

1. 重启**所有** rke2 agent 服务

登录到 所有 rke2 agent 节点，重启 rke2 agent 服务：

```
root@ha-w1:~# systemctl restart rke2-agent.service
```

如果不重启 rke2 agent 服务，agent 节点的状态为：NotReady， 并且 kube-proxy 会报错：

```
W0227 16:09:35.340198       1 reflector.go:533] k8s.io/client-go/informers/factory.go:150: failed to list *v1.EndpointSlice: Unauthorized
E0227 16:09:35.340376       1 reflector.go:148] k8s.io/client-go/informers/factory.go:150: Failed to watch *v1.EndpointSlice: failed to list *v1.EndpointSlice: Unauthorized
W0227 16:09:38.517400       1 reflector.go:533] k8s.io/client-go/informers/factory.go:150: failed to list *v1.Service: Unauthorized
E0227 16:09:38.517694       1 reflector.go:148] k8s.io/client-go/informers/factory.go:150: Failed to watch *v1.Service: failed to list *v1.Service: Unauthorized
```

4. 确认证书已经轮换成功

```
root@ha-m1:~# kubectl get secret -n kube-system rke2-serving -o jsonpath='{.data.tls\.crt}' | base64 -d | openssl x509 -noout -text | grep Not
            Not Before: Feb 27 07:12:15 2024 GMT
            Not After : Mar 21 16:03:10 2026 GMT
root@ha-m1:~# for i in `ls /var/lib/rancher/rke2/server/tls/*.crt`; do echo $i; openssl x509 -enddate -noout -in $i; done
/var/lib/rancher/rke2/server/tls/client-admin.crt
notAfter=Mar 21 16:00:35 2026 GMT
/var/lib/rancher/rke2/server/tls/client-auth-proxy.crt
notAfter=Mar 21 16:00:35 2026 GMT
/var/lib/rancher/rke2/server/tls/client-ca.crt
notAfter=Feb 24 07:12:15 2034 GMT
/var/lib/rancher/rke2/server/tls/client-ca.nochain.crt
notAfter=Feb 24 07:12:15 2034 GMT
/var/lib/rancher/rke2/server/tls/client-controller.crt
notAfter=Mar 21 16:00:35 2026 GMT
/var/lib/rancher/rke2/server/tls/client-kube-apiserver.crt
notAfter=Mar 21 16:00:35 2026 GMT
/var/lib/rancher/rke2/server/tls/client-kube-proxy.crt
notAfter=Mar 21 16:00:35 2026 GMT
/var/lib/rancher/rke2/server/tls/client-rke2-cloud-controller.crt
notAfter=Mar 21 16:00:35 2026 GMT
/var/lib/rancher/rke2/server/tls/client-rke2-controller.crt
notAfter=Mar 21 16:00:35 2026 GMT
/var/lib/rancher/rke2/server/tls/client-scheduler.crt
notAfter=Mar 21 16:00:35 2026 GMT
/var/lib/rancher/rke2/server/tls/client-supervisor.crt
notAfter=Mar 21 16:00:35 2026 GMT
/var/lib/rancher/rke2/server/tls/request-header-ca.crt
notAfter=Feb 24 07:12:15 2034 GMT
/var/lib/rancher/rke2/server/tls/server-ca.crt
notAfter=Feb 24 07:12:15 2034 GMT
/var/lib/rancher/rke2/server/tls/server-ca.nochain.crt
notAfter=Feb 24 07:12:15 2034 GMT
/var/lib/rancher/rke2/server/tls/serving-kube-apiserver.crt
notAfter=Mar 21 16:00:35 2026 GMT
```

从以上结果可以看出，除了 ca 证书以外，证书已经成功轮换，并延长了 1 年的证书有效期
