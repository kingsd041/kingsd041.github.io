---
layout: post
title: K3S、RKE2、RKE 到 Rancher 的国内资源部署技巧
subtitle: 利用国内资源安装 Rancher/K3S/RKE2/RKE
date: 2024-6-3 11:07:00 +0800
author: Ksd
header-img: img/post-bg-rancher-k8s.png
catalog: true
tags:
  - Rancher
---

在国内使用 Kubernetes 和 Rancher 时，用户可能会遇到以下痛点：

- 国外镜像库访问受限：由于国内网络环境的限制，从官方镜像库（如 Docker Hub）拉取镜像可能会很慢或无法访问。这导致安装和更新 Kubernetes 组件以及应用容器时变得非常困难。
- 网络波动和丢包：即使能够访问国外的镜像库，网络的不稳定性也会影响镜像的下载速度和可靠性。
- RKE/RKE2/K3s 二进制文件存储在 Github，国内访问 Github 缓慢。

为了解决以上问题，Rancher 社区将 Rancher 相关资源均同步到了国内站点：

- Rancher Releases Mirrors：https://mirror.rancher.cn/
- 阿里云镜像仓库：registry.cn-hangzhou.aliyuncs.com

## K3s

### 通用脚本安装 K3s

默认安装脚本：

```bash
root@demo-1:~# time curl -sfL https://get.k3s.io | sh -
[INFO]  Finding release for channel stable
[INFO]  Using v1.29.4+k3s1 as release
[INFO]  Downloading hash https://github.com/k3s-io/k3s/releases/download/v1.29.4+k3s1/sha256sum-amd64.txt
[INFO]  Downloading binary https://github.com/k3s-io/k3s/releases/download/v1.29.4+k3s1/k3s
[INFO]  Verifying binary download
[INFO]  Installing k3s to /usr/local/bin/k3s
[INFO]  Skipping installation of SELinux RPM
[INFO]  Creating /usr/local/bin/kubectl symlink to k3s
[INFO]  Creating /usr/local/bin/crictl symlink to k3s
[INFO]  Creating /usr/local/bin/ctr symlink to k3s
[INFO]  Creating killall script /usr/local/bin/k3s-killall.sh
[INFO]  Creating uninstall script /usr/local/bin/k3s-uninstall.sh
[INFO]  env: Creating environment file /etc/systemd/system/k3s.service.env
[INFO]  systemd: Creating service file /etc/systemd/system/k3s.service
[INFO]  systemd: Enabling k3s unit
Created symlink /etc/systemd/system/multi-user.target.wants/k3s.service → /etc/systemd/system/k3s.service.
[INFO]  systemd: Starting k3s

real	0m24.314s
user	0m1.241s
sys	0m0.519s
```

**安装 K3s 所需资源：**

- K3s 安装脚本，默认：https://get.k3s.io
- K3s channel，默认：https://update.k3s.io/v1-release/channels
- K3s hash 文件，默认：https://github.com/k3s-io/k3s/
- K3s 二进制文件，默认：https://github.com/k3s-io/k3s/
- K3s 依赖的容器镜像，默认：docker.io

```bash
root@demo-1:~# kubectl get pods -A
NAMESPACE     NAME                                      READY   STATUS              RESTARTS   AGE
kube-system   helm-install-traefik-crd-wjq2z            0/1     ContainerCreating   0          10m
kube-system   helm-install-traefik-bxh8h                0/1     ContainerCreating   0          10m
kube-system   local-path-provisioner-6c86858495-ttq2z   1/1     Running             0          10m
kube-system   metrics-server-54fd9b65b-hm2h8            1/1     Running             0          10m
kube-system   coredns-6799fbcd5-6qbfh                   1/1     Running             0          10m

root@demo-1:~# crictl images
IMAGE                                        TAG                    IMAGE ID            SIZE
docker.io/rancher/klipper-helm               v0.8.3-build20240228   0929b4140ada6       91.2MB
docker.io/rancher/klipper-lb                 v0.4.7                 edc812b8e25d0       4.78MB
docker.io/rancher/local-path-provisioner     v0.0.26                c54dcef6214cb       17.2MB
docker.io/rancher/mirrored-coredns-coredns   1.10.1                 ead0a4a53df89       16.2MB
docker.io/rancher/mirrored-library-traefik   2.10.7                 ee69e8120b64a       43.2MB
docker.io/rancher/mirrored-metrics-server    v0.7.0                 b9a5a1927366a       19.4MB
docker.io/rancher/mirrored-pause             3.6                    6270bb605e12e       301kB
```

### 使用国内资源安装 K3s

国内资源：

- Rancher Releases Mirrors：https://mirror.rancher.cn/
- 阿里云镜像仓库：registry.cn-hangzhou.aliyuncs.com

```bash
root@demo-1:~# time curl -sfL https://rancher-mirror.rancher.cn/k3s/k3s-install.sh | \
  INSTALL_K3S_MIRROR=cn \
  K3S_TOKEN=12345 sh -s - \
  --system-default-registry=registry.cn-hangzhou.aliyuncs.com

[INFO]  Finding release for channel stable
[INFO]  Using v1.29.4+k3s1 as release
[INFO]  Downloading hash rancher-mirror.rancher.cn/k3s/v1.29.4-k3s1/sha256sum-amd64.txt
[INFO]  Downloading binary rancher-mirror.rancher.cn/k3s/v1.29.4-k3s1/k3s
[INFO]  Verifying binary download
[INFO]  Installing k3s to /usr/local/bin/k3s
[INFO]  Skipping installation of SELinux RPM
[INFO]  Creating /usr/local/bin/kubectl symlink to k3s
[INFO]  Creating /usr/local/bin/crictl symlink to k3s
[INFO]  Creating /usr/local/bin/ctr symlink to k3s
[INFO]  Creating killall script /usr/local/bin/k3s-killall.sh
[INFO]  Creating uninstall script /usr/local/bin/k3s-uninstall.sh
[INFO]  env: Creating environment file /etc/systemd/system/k3s.service.env
[INFO]  systemd: Creating service file /etc/systemd/system/k3s.service
[INFO]  systemd: Enabling k3s unit
Created symlink /etc/systemd/system/multi-user.target.wants/k3s.service → /etc/systemd/system/k3s.service.
[INFO]  systemd: Starting k3s

real	0m18.052s
user	0m0.850s
sys	0m0.462s
```

```bash
root@demo-1:~# kubectl get pods -A
NAMESPACE     NAME                                      READY   STATUS      RESTARTS   AGE
kube-system   coredns-58c9946f4-b92sb                   1/1     Running     0          80s
kube-system   helm-install-traefik-crd-zfpb8            0/1     Completed   0          79s
kube-system   svclb-traefik-e80607b2-c6dmt              2/2     Running     0          36s
kube-system   helm-install-traefik-k4hjs                0/1     Completed   1          79s
kube-system   metrics-server-5bbb74b77-kzv8n            1/1     Running     0          80s
kube-system   traefik-57c89d7764-795wg                  1/1     Running     0          36s
kube-system   local-path-provisioner-7f4c755b68-ccdrz   1/1     Running     0          80s
root@demo-1:~# crictl images
IMAGE                                                                TAG                    IMAGE ID            SIZE
registry.cn-hangzhou.aliyuncs.com/rancher/klipper-helm               v0.8.3-build20240228   0929b4140ada6       91.2MB
registry.cn-hangzhou.aliyuncs.com/rancher/klipper-lb                 v0.4.7                 edc812b8e25d0       4.78MB
registry.cn-hangzhou.aliyuncs.com/rancher/local-path-provisioner     v0.0.26                c54dcef6214cb       17.2MB
registry.cn-hangzhou.aliyuncs.com/rancher/mirrored-coredns-coredns   1.10.1                 ead0a4a53df89       16.2MB
registry.cn-hangzhou.aliyuncs.com/rancher/mirrored-library-traefik   2.10.7                 ee69e8120b64a       43.2MB
registry.cn-hangzhou.aliyuncs.com/rancher/mirrored-metrics-server    v0.7.0                 b9a5a1927366a       19.3MB
registry.cn-hangzhou.aliyuncs.com/rancher/mirrored-pause             3.6                    6270bb605e12e       298kB
```

K3s agent 节点安装：

```bash
root@demo-2:~# curl -sfL https://rancher-mirror.rancher.cn/k3s/k3s-install.sh | \
  INSTALL_K3S_MIRROR=cn \
  K3S_URL=https://172.16.0.98:6443 \
  K3S_TOKEN=12345 \
  sh -

# K3s agent 节点不需要配置 `system-default-registry`。
```

```bash
root@demo-2:~# crictl images
IMAGE                                                      TAG                 IMAGE ID            SIZE
registry.cn-hangzhou.aliyuncs.com/rancher/klipper-lb       v0.4.7              edc812b8e25d0       4.78MB
registry.cn-hangzhou.aliyuncs.com/rancher/mirrored-pause   3.6                 6270bb605e12e       298kB
```

### 高可用安装

第一个 K3s Server 节点：

```bash
curl -sfL https://rancher-mirror.rancher.cn/k3s/k3s-install.sh | \
  INSTALL_K3S_MIRROR=cn \
  K3S_TOKEN=12345 \
  sh -s - server \
  --cluster-init \
  --token 12345 \
  --system-default-registry=registry.cn-hangzhou.aliyuncs.com
```

将第二台和第三台 K3s Server 加入集群：：

```bash
curl -sfL https://rancher-mirror.rancher.cn/k3s/k3s-install.sh | \
  INSTALL_K3S_MIRROR=cn \
  K3S_TOKEN=12345 \
  sh -s - server \
  --server https://172.16.0.98:6443 \
  --system-default-registry=registry.cn-hangzhou.aliyuncs.com
```

### 通过配置文件安装 K3s

K3s Server:

```bash
root@demo-1:~# mkdir -p /etc/rancher/k3s/
root@demo-1:~# cat >/etc/rancher/k3s/config.yaml <<EOL
token: 12345
system-default-registry: registry.cn-hangzhou.aliyuncs.com
EOL

root@demo-1:~# curl -sfL https://rancher-mirror.rancher.cn/k3s/k3s-install.sh | INSTALL_K3S_MIRROR=cn sh -
```

## RKE2

### 通用脚本安装 RKE2

```bash
root@demo-1:~# time curl -sfL https://get.rke2.io | sh -
[INFO]  finding release for channel stable
[INFO]  using v1.28.10+rke2r1 as release
[INFO]  downloading checksums at https://github.com/rancher/rke2/releases/download/v1.28.10+rke2r1/sha256sum-amd64.txt
[INFO]  downloading tarball at https://github.com/rancher/rke2/releases/download/v1.28.10+rke2r1/rke2.linux-amd64.tar.gz
[INFO]  verifying tarball
[INFO]  unpacking tarball file to /usr/local

real	0m35.477s
user	0m3.306s
sys	0m2.912s
```

```bash
root@demo-1:~# systemctl start rke2-server.service
Job for rke2-server.service failed because the control process exited with error code.
See "systemctl status rke2-server.service" and "journalctl -xeu rke2-server.service" for details.
```

查看日志：

```
May 25 06:21:02 demo-1 rke2[77843]: time="2024-05-25T14:21:02+08:00" level=info msg="Pulling runtime image index.docker.io/rancher/rke2-runtime:v1.28.10-rke2r1"
```

**安装 RKE2 所需资源：**

- RKE2 安装脚本，默认：https://get.rke2.io
- RKE2 channel，默认：https://update.rke2.io/v1-release/channels
- RKE2 hash 文件，默认：https://github.com/rancher/rke2/releases/
- RKE2 二进制文件，默认：https://github.com/rancher/rke2/releases/
- RKE2 依赖的容器镜像，默认：docker.io

### 使用国内资源安装 RKE2

国内资源：

- Rancher Releases Mirrors：https://mirror.rancher.cn/
- 阿里云镜像仓库：registry.cn-hangzhou.aliyuncs.com

```bash
root@demo-1:~# mkdir -p /etc/rancher/rke2/
root@demo-1:~# cat >/etc/rancher/rke2/config.yaml <<EOL
token: 123456
system-default-registry: registry.cn-hangzhou.aliyuncs.com
EOL

root@demo-1:~# curl -sfL https://rancher-mirror.rancher.cn/rke2/install.sh | \
  INSTALL_RKE2_MIRROR=cn sh -
[INFO]  finding release for channel stable
[INFO]  using v1.28.10-rke2r1 as release
[INFO]  downloading checksums at https://rancher-mirror.rancher.cn/rke2/releases/download/v1.28.10-rke2r1/sha256sum-amd64.txt
[INFO]  downloading tarball at https://rancher-mirror.rancher.cn/rke2/releases/download/v1.28.10-rke2r1/rke2.linux-amd64.tar.gz
[INFO]  verifying tarball
[INFO]  unpacking tarball file to /usr/local

root@demo-1:~# systemctl start rke2-server.service
```

```bash
root@demo-1:~# export CRI_CONFIG_FILE=/var/lib/rancher/rke2/agent/etc/crictl.yaml
root@demo-1:~# /var/lib/rancher/rke2/bin/crictl images
IMAGE                                                                                        TAG                                        IMAGE ID            SIZE
registry.cn-hangzhou.aliyuncs.com/rancher/hardened-calico                                    v3.27.3-build20240423                      3564b4ac1d3dc       199MB
registry.cn-hangzhou.aliyuncs.com/rancher/hardened-cluster-autoscaler                        v1.8.10-build20240124                      cd00dc5289588       12MB
registry.cn-hangzhou.aliyuncs.com/rancher/hardened-coredns                                   v1.11.1-build20240305                      00df8b41cfd2e       23.5MB
registry.cn-hangzhou.aliyuncs.com/rancher/hardened-etcd                                      v3.5.9-k3s1-build20240418                  7893f7425a52a       16.6MB
registry.cn-hangzhou.aliyuncs.com/rancher/hardened-flannel                                   v0.25.1-build20240423                      398c3d1a135f0       83.3MB
registry.cn-hangzhou.aliyuncs.com/rancher/hardened-k8s-metrics-server                        v0.7.1-build20240401                       6d80f01a1966b       18.4MB
registry.cn-hangzhou.aliyuncs.com/rancher/hardened-kubernetes                                v1.28.10-rke2r1-build20240514              b7e03d90f06bb       175MB
registry.cn-hangzhou.aliyuncs.com/rancher/klipper-helm                                       v0.8.3-build20240228                       0929b4140ada6       91.2MB
registry.cn-hangzhou.aliyuncs.com/rancher/mirrored-ingress-nginx-kube-webhook-certgen        v20230312-helm-chart-4.5.2-28-g66a760794   5a86b03a88d23       20.1MB
registry.cn-hangzhou.aliyuncs.com/rancher/mirrored-pause                                     3.6                                        6270bb605e12e       298kB
registry.cn-hangzhou.aliyuncs.com/rancher/mirrored-sig-storage-snapshot-controller           v6.2.1                                     1ef6c138bd5f2       24.2MB
registry.cn-hangzhou.aliyuncs.com/rancher/mirrored-sig-storage-snapshot-validation-webhook   v6.2.2                                     ff52c2bcf9f88       21.1MB
registry.cn-hangzhou.aliyuncs.com/rancher/nginx-ingress-controller                           nginx-1.9.6-hardened1                      3f5b7fd2026e9       325MB
registry.cn-hangzhou.aliyuncs.com/rancher/rke2-cloud-provider                                v1.29.3-build20240412                      3525a3daa55c9       68MB
registry.cn-hangzhou.aliyuncs.com/rancher/rke2-runtime                                       v1.28.10-rke2r1                            4f23dbe9c5144       108MB
```

RKE2 agent 节点安装：

```bash
root@demo-2:~# mkdir -p /etc/rancher/rke2/
root@demo-2:~# cat >/etc/rancher/rke2/config.yaml <<EOL
server: https://172.16.0.98:9345
token: 123456
EOL

root@demo-2:~# curl -sfL https://rancher-mirror.rancher.cn/rke2/install.sh | \
  INSTALL_RKE2_MIRROR=cn \
  INSTALL_RKE2_TYPE="agent" sh -
[INFO]  finding release for channel stable
[INFO]  using v1.28.10-rke2r1 as release
[INFO]  downloading checksums at https://rancher-mirror.rancher.cn/rke2/releases/download/v1.28.10-rke2r1/sha256sum-amd64.txt
[INFO]  downloading tarball at https://rancher-mirror.rancher.cn/rke2/releases/download/v1.28.10-rke2r1/rke2.linux-amd64.tar.gz
[INFO]  verifying tarball
[INFO]  unpacking tarball file to /usr/local

root@demo-2:~# systemctl start rke2-agent.service
```

```bash
root@demo-2:~# export CRI_CONFIG_FILE=/var/lib/rancher/rke2/agent/etc/crictl.yaml
root@demo-2:~# /var/lib/rancher/rke2/bin/crictl images
IMAGE                                                           TAG                             IMAGE ID            SIZE
registry.cn-hangzhou.aliyuncs.com/rancher/hardened-calico       v3.27.3-build20240423           3564b4ac1d3dc       199MB
registry.cn-hangzhou.aliyuncs.com/rancher/hardened-coredns      v1.11.1-build20240305           00df8b41cfd2e       23.5MB
registry.cn-hangzhou.aliyuncs.com/rancher/hardened-flannel      v0.25.1-build20240423           398c3d1a135f0       83.3MB
registry.cn-hangzhou.aliyuncs.com/rancher/hardened-kubernetes   v1.28.10-rke2r1-build20240514   b7e03d90f06bb       175MB
registry.cn-hangzhou.aliyuncs.com/rancher/mirrored-pause        3.6                             6270bb605e12e       298kB
registry.cn-hangzhou.aliyuncs.com/rancher/rke2-runtime          v1.28.10-rke2r1                 4f23dbe9c5144       108MB
```

### 高可用安装

将第二台和第三台 RKE2 Server 加入集群：：

```bash
root@demo-2:~# mkdir -p /etc/rancher/rke2/
root@demo-2:~# cat >/etc/rancher/rke2/config.yaml <<EOL
server: https://172.16.0.98:9345
token: 123456
system-default-registry: registry.cn-hangzhou.aliyuncs.com
EOL

root@demo-2:~# curl -sfL https://rancher-mirror.rancher.cn/rke2/install.sh | \
  INSTALL_RKE2_MIRROR=cn sh -
[INFO]  finding release for channel stable
[INFO]  using v1.28.10-rke2r1 as release
[INFO]  downloading checksums at https://rancher-mirror.rancher.cn/rke2/releases/download/v1.28.10-rke2r1/sha256sum-amd64.txt
[INFO]  downloading tarball at https://rancher-mirror.rancher.cn/rke2/releases/download/v1.28.10-rke2r1/rke2.linux-amd64.tar.gz
[INFO]  verifying tarball
[INFO]  unpacking tarball file to /usr/local

root@demo-2:~# systemctl start rke2-server.service
```

查看第二台和第三台 RKE2 Server 镜像：

```
root@demo-2:~# /var/lib/rancher/rke2/bin/crictl images
IMAGE                                                                TAG                             IMAGE ID            SIZE
registry.cn-hangzhou.aliyuncs.com/rancher/hardened-calico            v3.27.3-build20240423           3564b4ac1d3dc       199MB
registry.cn-hangzhou.aliyuncs.com/rancher/hardened-coredns           v1.11.1-build20240305           00df8b41cfd2e       23.5MB
registry.cn-hangzhou.aliyuncs.com/rancher/hardened-etcd              v3.5.9-k3s1-build20240418       7893f7425a52a       16.6MB
registry.cn-hangzhou.aliyuncs.com/rancher/hardened-flannel           v0.25.1-build20240423           398c3d1a135f0       83.3MB
registry.cn-hangzhou.aliyuncs.com/rancher/hardened-kubernetes        v1.28.10-rke2r1-build20240514   b7e03d90f06bb       175MB
registry.cn-hangzhou.aliyuncs.com/rancher/mirrored-pause             3.6                             6270bb605e12e       298kB
registry.cn-hangzhou.aliyuncs.com/rancher/nginx-ingress-controller   nginx-1.9.6-hardened1           3f5b7fd2026e9       325MB
registry.cn-hangzhou.aliyuncs.com/rancher/rke2-cloud-provider        v1.29.3-build20240412           3525a3daa55c9       68MB
registry.cn-hangzhou.aliyuncs.com/rancher/rke2-runtime               v1.28.10-rke2r1                 4f23dbe9c5144       108MB


root@demo-3:~# /var/lib/rancher/rke2/bin/crictl images
IMAGE                                                                TAG                             IMAGE ID            SIZE
registry.cn-hangzhou.aliyuncs.com/rancher/hardened-calico            v3.27.3-build20240423           3564b4ac1d3dc       199MB
registry.cn-hangzhou.aliyuncs.com/rancher/hardened-etcd              v3.5.9-k3s1-build20240418       7893f7425a52a       16.6MB
registry.cn-hangzhou.aliyuncs.com/rancher/hardened-flannel           v0.25.1-build20240423           398c3d1a135f0       83.3MB
registry.cn-hangzhou.aliyuncs.com/rancher/hardened-kubernetes        v1.28.10-rke2r1-build20240514   b7e03d90f06bb       175MB
registry.cn-hangzhou.aliyuncs.com/rancher/mirrored-pause             3.6                             6270bb605e12e       298kB
registry.cn-hangzhou.aliyuncs.com/rancher/nginx-ingress-controller   nginx-1.9.6-hardened1           3f5b7fd2026e9       325MB
registry.cn-hangzhou.aliyuncs.com/rancher/rke2-cloud-provider        v1.29.3-build20240412           3525a3daa55c9       68MB
registry.cn-hangzhou.aliyuncs.com/rancher/rke2-runtime               v1.28.10-rke2r1                 4f23dbe9c5144       108MB
```

## RKE

安装 RKE 所需资源：

- RKE 二进制文件，默认：https://github.com/rancher/rke
- RKE 依赖的容器镜像，默认：docker.io

### 使用国内资源安装 RKE 集群

从 https://mirror.rancher.cn/#rke/ 获取 rke 二进制文件。

```
cat > cluster.yml <<EOL
nodes:
  - address: 192.168.205.110
    user: ubuntu
    role:
      - controlplane
      - etcd
      - worker
  - address: 192.168.205.107
    user: ubuntu
    role:
      - worker
private_registries:
  - url: registry.cn-hangzhou.aliyuncs.com
    is_default: true
EOL
```

通过 `url` 和 `is_default` 设置系统镜像从 `registry.cn-hangzhou.aliyuncs.com` 拉取镜像。

```
rke up --config cluster.yml
INFO[0000] Running RKE version: v1.4.5
INFO[0000] Initiating Kubernetes cluster
INFO[0000] [dialer] Setup tunnel for host [192.168.205.110]
INFO[0000] [dialer] Setup tunnel for host [192.168.205.107]
INFO[0001] Finding container [cluster-state-deployer] on host [192.168.205.110], try #1
INFO[0001] Pulling image [registry.cn-hangzhou.aliyuncs.com/rancher/rke-tools:v0.1.88] on host [192.168.205.110], try #1
...
...
...
```

## Rancher

**安装 Rancher 所需资源：**

- Rancher 依赖的容器镜像，默认：docker.io

### 高可用模式安装 Rancher（Helm 安装 Rancher）

```bash
helm install rancher rancher-latest/rancher \
  --namespace cattle-system \
  --set hostname=192.168.205.106.sslip.io \
  --set replicas=1 \
  --set bootstrapPassword=admin \
  --set rancherImage=registry.cn-hangzhou.aliyuncs.com/rancher/rancher \
  --set systemDefaultRegistry=registry.cn-hangzhou.aliyuncs.com
```

- rancherImage：指定 rancher 镜像
- systemDefaultRegistry：设置系统默认镜像仓库

参考：https://github.com/rancher/rancher/blob/v2.8.4/chart/values.yaml#L131

Rancher 启动成功后，进入到 local 集群查看运行的 pod，均为 `registry.cn-hangzhou.aliyuncs.com` 镜像：

![](https://raw.githubusercontent.com/kingsd041/picture/main/202405252344754.png)

创建 RKE2/K3S 集群时，`Container Registry` 默认为：`registry.cn-hangzhou.aliyuncs.com`：

![](https://raw.githubusercontent.com/kingsd041/picture/main/202405252346143.png)

```bash
root@demo-2:~# /var/lib/rancher/rke2/bin/crictl image
IMAGE                                                                                        TAG                                        IMAGE ID            SIZE
registry.cn-hangzhou.aliyuncs.com/rancher/fleet-agent                                        v0.9.4                                     ce783a0ca33f0       107MB
registry.cn-hangzhou.aliyuncs.com/rancher/hardened-cluster-autoscaler                        v1.8.10-build20240124                      cd00dc5289588       12MB
registry.cn-hangzhou.aliyuncs.com/rancher/hardened-coredns                                   v1.11.1-build20240305                      00df8b41cfd2e       23.5MB
registry.cn-hangzhou.aliyuncs.com/rancher/hardened-etcd                                      v3.5.9-k3s1-build20240418                  7893f7425a52a       16.6MB
registry.cn-hangzhou.aliyuncs.com/rancher/hardened-k8s-metrics-server                        v0.7.1-build20240401                       6d80f01a1966b       18.4MB
registry.cn-hangzhou.aliyuncs.com/rancher/hardened-kubernetes                                v1.28.9-rke2r1-build20240416               8fae8e1e0c868       175MB
registry.cn-hangzhou.aliyuncs.com/rancher/klipper-helm                                       v0.8.3-build20240228                       0929b4140ada6       91.2MB
registry.cn-hangzhou.aliyuncs.com/rancher/mirrored-calico-cni                                v3.27.3                                    6527a35581401       88.4MB
registry.cn-hangzhou.aliyuncs.com/rancher/mirrored-calico-kube-controllers                   v3.27.3                                    3e4fd05c0c1c0       33.4MB
registry.cn-hangzhou.aliyuncs.com/rancher/mirrored-calico-node                               v3.27.3                                    5c6ffd2b2a1d0       116MB
registry.cn-hangzhou.aliyuncs.com/rancher/mirrored-calico-operator                           v1.32.7                                    ac4b460566ae9       21.4MB
registry.cn-hangzhou.aliyuncs.com/rancher/mirrored-calico-pod2daemon-flexvol                 v3.27.3                                    ab5b4f1ca2893       7.59MB
registry.cn-hangzhou.aliyuncs.com/rancher/mirrored-calico-typha                              v3.27.3                                    b542f80277bc5       29.6MB
registry.cn-hangzhou.aliyuncs.com/rancher/mirrored-ingress-nginx-kube-webhook-certgen        v20230312-helm-chart-4.5.2-28-g66a760794   5a86b03a88d23       20.1MB
registry.cn-hangzhou.aliyuncs.com/rancher/mirrored-pause                                     3.6                                        6270bb605e12e       298kB
registry.cn-hangzhou.aliyuncs.com/rancher/mirrored-sig-storage-snapshot-controller           v6.2.1                                     1ef6c138bd5f2       24.2MB
registry.cn-hangzhou.aliyuncs.com/rancher/mirrored-sig-storage-snapshot-validation-webhook   v6.2.2                                     ff52c2bcf9f88       21.1MB
registry.cn-hangzhou.aliyuncs.com/rancher/nginx-ingress-controller                           nginx-1.9.6-hardened1                      3f5b7fd2026e9       325MB
registry.cn-hangzhou.aliyuncs.com/rancher/rancher-agent                                      v2.8.4                                     ed9ac6cfe6db5       519MB
registry.cn-hangzhou.aliyuncs.com/rancher/rke2-cloud-provider                                v1.29.3-build20240412                      3525a3daa55c9       68MB
registry.cn-hangzhou.aliyuncs.com/rancher/rke2-runtime                                       v1.28.9-rke2r1                             cbd54504b9c4a       108MB
registry.cn-hangzhou.aliyuncs.com/rancher/system-agent                                       v0.3.6-suc                                 00511613dec56       32.4MB
registry.cn-hangzhou.aliyuncs.com/rancher/system-upgrade-controller                          v0.13.1                                    abc5338582c4f       10.7MB
```

创建 RKE 集群，需要手动设置 `Private Registry` 为：`registry.cn-hangzhou.aliyuncs.com`：

![](https://raw.githubusercontent.com/kingsd041/picture/main/202405252348549.png)

```bash
root@demo-3:~# docker images
REPOSITORY                                                                              TAG                    IMAGE ID       CREATED         SIZE
registry.cn-hangzhou.aliyuncs.com/rancher/rancher-agent                                 v2.8.4                 ed9ac6cfe6db   10 days ago     1.12GB
registry.cn-hangzhou.aliyuncs.com/rancher/rancher-webhook                               v0.4.5                 2015c2094775   2 weeks ago     82.8MB
registry.cn-hangzhou.aliyuncs.com/rancher/shell                                         v0.1.24                deabd25af88c   3 weeks ago     393MB
registry.cn-hangzhou.aliyuncs.com/rancher/fleet-agent                                   v0.9.4                 ce783a0ca33f   3 weeks ago     297MB
registry.cn-hangzhou.aliyuncs.com/rancher/hyperkube                                     v1.28.9-rancher1       9054b61bcaeb   5 weeks ago     1.75GB
registry.cn-hangzhou.aliyuncs.com/rancher/kube-api-auth                                 v0.2.1                 61e101ca176a   3 months ago    96.2MB
registry.cn-hangzhou.aliyuncs.com/rancher/nginx-ingress-controller                      nginx-1.9.6-rancher1   aba045951c44   3 months ago    236MB
registry.cn-hangzhou.aliyuncs.com/rancher/calico-cni                                    v3.27.0-rancher1       491835dde8c1   4 months ago    215MB
registry.cn-hangzhou.aliyuncs.com/rancher/mirrored-flannel-flannel                      v0.24.2                f9c73fde068f   4 months ago    76.1MB
registry.cn-hangzhou.aliyuncs.com/rancher/mirrored-metrics-server                       v0.7.0                 b9a5a1927366   4 months ago    66.8MB
registry.cn-hangzhou.aliyuncs.com/rancher/mirrored-ingress-nginx-kube-webhook-certgen   v20231226-1a7112e06    eb825d2bb76b   5 months ago    53.6MB
registry.cn-hangzhou.aliyuncs.com/rancher/mirrored-calico-kube-controllers              v3.27.0                4e87edec0297   5 months ago    75.5MB
registry.cn-hangzhou.aliyuncs.com/rancher/mirrored-calico-node                          v3.27.0                1843802b91be   5 months ago    340MB
registry.cn-hangzhou.aliyuncs.com/rancher/rke-tools                                     v0.1.96                d236cd628d15   6 months ago    319MB
registry.cn-hangzhou.aliyuncs.com/rancher/mirrored-coreos-etcd                          v3.5.10                42d0b9aa7106   7 months ago    57.6MB
registry.cn-hangzhou.aliyuncs.com/rancher/mirrored-cluster-proportional-autoscaler      v1.8.9                 2635ad6e71aa   10 months ago   38MB
registry.cn-hangzhou.aliyuncs.com/rancher/mirrored-coredns-coredns                      1.10.1                 ead0a4a53df8   15 months ago   53.6MB
registry.cn-hangzhou.aliyuncs.com/rancher/mirrored-pause                                3.7                    221177c6082a   2 years ago     711kB
```

### 单节点模式安装 Rancher

可以通过环境变量 `CATTLE_SYSTEM_DEFAULT_REGISTRY` 来设置 `system-default-registry` 参数。以下是一个示例命令：

```
docker run -d --restart=unless-stopped \
  -p 80:80 -p 443:443 \
  --privileged \
  -e CATTLE_SYSTEM_DEFAULT_REGISTRY=registry.cn-hangzhou.aliyuncs.com \
  --name rancher \
  registry.cn-hangzhou.aliyuncs.com/rancher/rancher:v2.8.4
```

## 配置 Mirror

### K3s

配置 Mirror：

```bash
cat >> /etc/rancher/k3s/registries.yaml <<EOF
mirrors:
  "docker.io":
    endpoint:
      - "https://docker.nju.edu.cn/"
      - "https://registry-1.docker.io"
EOF
systemctl restart k3s
```

查看配置：

```bash
root@demo-1:~# cat /var/lib/rancher/k3s/agent/etc/containerd/certs.d/docker.io/hosts.toml
# File generated by k3s. DO NOT EDIT.

server = "https://registry-1.docker.io/v2"
capabilities = ["pull", "resolve", "push"]

[host]
[host."https://docker.nju.edu.cn/v2"]
  capabilities = ["pull", "resolve"]
```

### RKE2

配置 Mirror：

```bash
cat >> /etc/rancher/rke2/registries.yaml <<EOF
mirrors:
  "docker.io":
    endpoint:
      - "https://docker.nju.edu.cn/"
      - "https://registry-1.docker.io"
EOF
systemctl restart rke2-server
```

查看配置：

```bash
root@demo-3:~# cat /var/lib/rancher/rke2/agent/etc/containerd/certs.d/docker.io/hosts.toml
# File generated by rke2. DO NOT EDIT.

server = "https://registry-1.docker.io/v2"
capabilities = ["pull", "resolve", "push"]

[host]
[host."https://docker.nju.edu.cn/v2"]
  capabilities = ["pull", "resolve"]
```
