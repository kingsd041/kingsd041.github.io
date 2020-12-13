---
layout:     post
title:      安装Containerd 和 crictl
subtitle:   
date:       2020-12-13 15:06:00 +0800
author:     Ksd
header-img: img/post-bg-unix-linux.jpg
catalog: true
tags:
    - rancher
    - k3s
    - containerd
    - crictl
---


之前使用containerd都是基于k3s默认安装的containerd，今天尝试了直接在ubunut 1804上安装containerd和crictl来操作。

## 安装 Containerd

#### 下载安装文件

可以在[下载](https://containerd.io/downloads/)页面下载containerd中最新的版本，然后使用您喜欢的方式启动守护程序。

要安装1.4.3版，例如：

```
wget https://github.com/containerd/containerd/releases/download/v1.4.3/containerd-1.4.3-linux-amd64.tar.gz
tar xvf containerd-1.4.3-linux-amd64.tar.gz -C /usr/local
```

#### 生成配置文件

Containerd启动需要一个配置文件，当启动containerd之后会根据这个配置文件去启动，默认位置是：`用/etc/containerd/config.toml`。

有两种方法可以获取这个配置文件：

1. 参考[containerd官网](https://containerd.io/docs/getting-started/)的示例，手动创建。例如：

    ```
    subreaper = true
    oom_score = -999
    
    [debug]
            level = "debug"
    
    [metrics]
            address = "127.0.0.1:1338"
    
    [plugins.linux]
            runtime = "runc"
            shim_debug = true
    ```
    
2. 通过`containerd config default > /etc/containerd/config.toml`创建，配置文件说明参考：https://github.com/containerd/containerd/blob/master/docs/man/containerd-config.toml.5.md

以上的配置需要注意`grpc.address`的配置，默认的配置为：`"/run/containerd/containerd.sock"`，一会安装`crictl`时候会用的到。

#### 准备containerd 启动文件

这个配置文件可以从[下载](https://containerd.io/downloads/)页面里的源码包获得

```
cat /lib/systemd/system/containerd.service
# Copyright The containerd Authors.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

[Unit]
Description=containerd container runtime
Documentation=https://containerd.io
After=network.target local-fs.target

[Service]
ExecStartPre=-/sbin/modprobe overlay
ExecStart=/usr/local/bin/containerd

Type=notify
Delegate=yes
KillMode=process
Restart=always
RestartSec=5
# Having non-zero Limit*s causes performance problems due to accounting overhead
# in the kernel. We recommend using cgroups to do container-local accounting.
LimitNPROC=infinity
LimitCORE=infinity
LimitNOFILE=1048576
# Comment TasksMax if your systemd version does not supports it.
# Only systemd 226 and above support this version.
TasksMax=infinity
OOMScoreAdjust=-999

[Install]
WantedBy=multi-user.target
```

#### 启动containerd

```
systemctl daemon-reload
systemctl enable containerd.service
systemctl start containerd.service
systemctl status containerd.service
```

至此 containerd 已经安装成功！


## 安装crictl

Containerd中默认带有`ctr`命令工具，它是一个简单的 CLI 接口，用作 containerd 本身的一些调试用途，投入生产使用时还是应该配合docker 或者 cri-containerd。

`crictl`是一个命令行接口，用于与CRI兼容的容器运行时。你可以使用它来检查和调试Kubernetes节点上的容器运行时和应用程序。crictl及其源代码托管在[cri-tools](https://github.com/kubernetes-sigs/cri-tools/blob/master/docs/crictl.md)仓库中。

#### 开始安装

可以从[cri-tools发布页面](https://github.com/kubernetes-sigs/cri-tools/releases)下载crictl：

```
VERSION="v1.19.0"
wget https://github.com/kubernetes-sigs/cri-tools/releases/download/$VERSION/crictl-$VERSION-linux-amd64.tar.gz
sudo tar zxvf crictl-$VERSION-linux-amd64.tar.gz -C /usr/local/bin
rm -f crictl-$VERSION-linux-amd64.tar.gz
```

#### 配置 crictl

crictl默认连接到 `unix:///var/run/dockershim.sock`。对于其它运行时，你可以通过多种方式设置端点:

- 设置 `--runtime-endpoint` 和 `--image-endpoint` 选项。
- 设置 `CONTAINER_RUNTIME_ENDPOINT` 和 `IMAGE_SERVICE_ENDPOINT` 环境变量。
- 在配置文件 `--config=/etc/crictl.yaml` 设置端点。
还可以在连接到服务器时指定超时值，并启用或禁用调试，方法是在配置文件中指定 timeout 和debug 值，或者使用--timeout和--debug命令行选项。

要查看或编辑当前配置，请查看或编辑/etc/crictl.yaml的内容

```
cat /etc/crictl.yaml
runtime-endpoint: unix:///run/containerd/containerd.sock
image-endpoint: unix:///run/containerd/containerd.sock
timeout: 10
debug: true

# /run/containerd/containerd.sock 为containerd中的“grpc.address” 配置，两个需要对应上。
```

至此 crictl 已经安装成功！

```
root@containerd:~# crictl images ls
DEBU[0000] get image connection
DEBU[0000] connect using endpoint 'unix:///run/containerd/containerd.sock' with '10s' timeout
DEBU[0000] connected successfully using endpoint: unix:///run/containerd/containerd.sock
DEBU[0000] ListImagesRequest: &ListImagesRequest{Filter:&ImageFilter{Image:&ImageSpec{Image:ls,Annotations:map[string]string{},},},}
DEBU[0000] ListImagesResponse: &ListImagesResponse{Images:[]*Image{},}
IMAGE               TAG                 IMAGE ID            SIZE
```


## 未完待续

后来使用 crictl 关于 pod 的命令时发现还得安装CNI插件，不爱弄了……
