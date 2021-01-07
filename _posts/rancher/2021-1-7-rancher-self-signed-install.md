---
layout: post
title: 从0开始安装rancher通过自签名证书
subtitle: 使用自签名证书安装rancher
date: 2021-1-7 21:06:00 +0800
author: Ksd
header-img: img/post-bg-rancher-k3s.png
catalog: true
tags:
  - rancher
  - Kubernetes
  - containerd
  - install
  - self-signed certificate
---

Rancher 2.x是Kubernetes的管理平台，在这篇文章中将介绍如何创建自签名证书和使用自签名证书安装rancher。不推荐使用此方式应用于生产环境。 

## Step 1: 设置DNS

要在证书中配置Rancher的FQDN，您将需要设置一个指向您计算机IP的A记录。例如，如果运行Rancher的主机的IP为10.0.0.10，则DNS记录应为：

```
rancher.yourdomain.com. IN A 10.0.0.10
```

不要尝试通过使用/etc/hosts文件绕过DNS，因为在创建/导入群集时需要使用DNS来解析它。

## Step 2: 创建证书

```
docker run -v $PWD/certs:/certs \
           -e CA_SUBJECT="My own root CA" \
           -e CA_EXPIRE="1825" \
           -e SSL_EXPIRE="365" \
           -e SSL_SUBJECT="rancher.yourdomain.com" \
           -e SSL_DNS="rancher.yourdomain.com" \
           -e SILENT="true" \
           superseb/omgwtfssl
...
Signature ok
subject=/CN=rancher.yourdomain.com
Getting CA Private Key
# ls certs/
ca-key.pem  ca.pem  ca.srl  cert.pem  key.csr  key.pem  openssl.cnf  secret.yaml
```

运行上面显示的`ls certs/`应该会显示所有创建的证书文件。如果要验证证书链，可以使用openssl进行验证，如下所示：

```
# openssl verify -CAfile certs/ca.pem certs/cert.pem
certs/cert.pem: OK
```

## Step 3: 使用生成的证书运行Rancher

```
docker run -d --restart=unless-stopped \
           -p 80:80 -p 443:443 \
           -v $PWD/rancher:/var/lib/rancher \
           -v $PWD/certs/cert.pem:/etc/rancher/ssl/cert.pem \
           -v $PWD/certs/key.pem:/etc/rancher/ssl/key.pem \
           -v $PWD/certs/ca.pem:/etc/rancher/ssl/cacerts.pem \
           --privileged \
           rancher/rancher:latest
```

参数参考：官网[Option B: Bring Your Own Certificate, Self-signed](https://rancher.com/docs/rancher/v2.x/en/installation/other-installation-methods/single-node-docker/#option-b-bring-your-own-certificate-self-signed)部分。

## Step 4：检查DNS，连接性和证书

要检查DNS，连接性和证书配置是否正确，可以使用superseb / rancher-check映像。它将检查是否可以使用DNS解析给定的FQDN，是否可以通过网络访问FQDN以及证书链是否完整。您可以运行以下命令来检查设置。

```
# docker run --rm --net=host superseb/rancher-check \
                             "https://rancher.yourdomain.com"
OK: DNS for rancher.yourdomain.com is 142.93.109.25
OK: Response from https://rancher.yourdomain.com/ping is pong
INFO: CA checksum from https://rancher.yourdomain.com/v3/settings/cacerts is x
OK: Certificate chain is complete
INFO: Found CN rancher.yourdomain.com
INFO: Found Subject Alternative Name(s) (SANs): rancher.yourdomain.com
OK: rancher.yourdomain.com was found in SANs (rancher.yourdomain.com)
Certificate:
Data:
Version: 3 (0x2)
Serial Number:
ed:be:94:aa:73:f8:d3:24
Issuer: CN=My own root CA
Validity
Not Before: Aug 23 11:34:11 2018 GMT
Not After : Aug 23 11:34:11 2019 GMT
Subject: CN=rancher.yourdomain.com
```

这应该显示正确的DNS条目，一行显示“Certificate chain is complete”表示证书链完整，并且将显示为给定FQDN找到的证书信息。

也可以通过rancher ui上查下证书。

## Step 5：使用Rancher

您现在可以访问https://rancher.yourdomain.com并使用Rancher创建和/或管理您的Kubernetes集群

## 参考

- https://medium.com/@superseb/zero-to-rancher-2-x-single-install-using-created-self-signed-certificates-in-5-minutes-5f9fe11fceb0
- https://rancher.com/docs/rancher/v2.x/en/installation/other-installation-methods/single-node-docker/#option-b-bring-your-own-certificate-self-signed