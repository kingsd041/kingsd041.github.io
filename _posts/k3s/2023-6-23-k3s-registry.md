---
layout: post
title: RKE2/K3S 镜像仓库的对应关系
subtitle: 
date: 2023-6-23 11:06:00 +0800
author: Ksd
header-img: img/post-bg-desk.jpg
catalog: true
tags:
  - K3s
  - 证书
---

```
system-default-registry: "registry.example.com"

mirrors:
  registry.example.com:
    endpoint:
      - "https://registry.example.com:5000"
configs:
  "registry.example.com:5000":
    auth:
      username: xxxxxx # this is the registry username
      password: xxxxxx # this is the registry password
    tls:
      cert_file:            # path to the cert file used to authenticate to the registry
      key_file:             # path to the key file for the certificate used to authenticate to the registry
      ca_file:              # path to the ca file used to verify the registry's certificate
      insecure_skip_verify: # may be set to true to skip verifying the registry's certificate
```

- system-default-registry 按照配置的 `registry.example.com` 去找 mirrors 中的 `registry.example.com`，也就是说 system-default-registry 的名字和 mirrors 中的名字得对应上
- 然后跳转到 endpoint 中的 `https://registry.example.com:5000`，根据 `https://registry.example.com:5000` 找 config 中的 `registry.example.com:5000`，也就是说，endpoint 中的 `registry.example.com:5000` 得和 config 中的 `registry.example.com:5000` 对应上
