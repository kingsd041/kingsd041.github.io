---
layout:     post
title:      Windows Active Directory 启用TLS
subtitle:   启用域控LDAPS
date:       2020-3-4 15:06:00 +0800
author:     Ksd
header-img: img/post-bg-rancher-k8s.png
catalog: true
tags:
    - rancher
    - AD
    - Active Directory
    - ldap
---

## 实验环境
- AD域名kingsd.top
- Windows Server 2012 R2 X64 （DC,计算机名dc ）
- OpenSSL (Linux或Windows，选择你熟悉的平台）
- Windows AD创建参考：https://note.youdao.com/ynoteshare1/index.html?id=2687b2c1b2dffbb7fe9ffeaba5317ecc&type=note

#### 生成根证书，按提示输入参数
```
$ openssl genrsa -aes256 -out ca.key 4096
$ openssl req -new -x509 -days 3650 -key ca.key -out ca.crt
```
此时，应该生成两个文件，根证书ca.crt,根证书私钥ca.key

#### 将根证书导入到域控制器的受信任存储中
1. 将生成的ca.crt移动到DC服务器
2. 打开cmd，执行mmc，文件-添加或删除管理单元，选择 证书-添加，选择”计算机账户“--”本地计算机“
3. 在受信任的根证书颁发机构，导入根证书ca.crt
![](https://tva1.sinaimg.cn/large/00831rSTly1gci2ctlls0j31xy0r2q4j.jpg)


## 创建客户端证书
接下来使用根证书签发DC服务器证书 - dc.kingsd.top
在AD服务器上执行以下步骤：
1. 使用以下内容创建一个新的request.inf，并且用AD服务器的合格域名替换ACTIVE_DIRECTORY_FQDN：
本例使用`dc.kingsd.top`替换`ACTIVE_DIRECTORY_FQDN`

```
 [Version]
 Signature="$Windows NT$"

 [NewRequest]
 Subject = "CN=ACTIVE_DIRECTORY_FQDN"
 KeySpec = 1
 KeyLength = 2048
 Exportable = TRUE
 MachineKeySet = TRUE
 SMIME = FALSE
 PrivateKeyArchive = FALSE
 UserProtected = FALSE
 UseExistingKeySet = FALSE
 ProviderName = "Microsoft RSA SChannel Cryptographic Provider"
 ProviderType = 12
 RequestType = PKCS10
 KeyUsage = 0xa0

 [EnhancedKeyUsageExtension]
 OID = 1.3.6.1.5.5.7.3.1 ; Server Authentication
```

2. 运行以下命令生成请求证书文件

```
C:\> certreq -new request.inf client.csr
```

复制client.csr到OpenSSl环境下
3. 创建包含以下内容的v3ext.txt

```
 keyUsage=digitalSignature,keyEncipherment
 extendedKeyUsage=serverAuth
 subjectKeyIdentifier=hash
```

4. 从证书请求client.csr和根证书（使用私钥）创建证书client.crt

```
 $ openssl x509 \
 	-req -days 3650 \
 	-in client.csr -CA ca.crt -CAkey ca.key -extfile v3ext.txt \
 	-set_serial 01 -out client.crt
```

5. 验证证书

```
openssl x509 -in client.crt -text
```

6. 确保以下字段 X509v3 extensions 全部包含
    1. X509v3 Key Usage: Digital Signature, Key Encipherment
    2. X509v3 Extended Key Usage: TLS Web Server Authentication
    3. X509v3 Subject Key Identifier
## 导入域控服务器证书
1. 复制client.crt 到dc服务器上，执行以下命令

```
C:\> certreq -accept client.crt
```

2. 打开证书管理控制台，在个人证书下，确保有以下内容

![](https://tva1.sinaimg.cn/large/00831rSTly1gci2dup2r8j316c0u075v.jpg)

## 重启AD服务加载证书
你可以选择重启计算机来加载LDAPS，或者用以下命令启用LDAP

1. 创建一个文件 ldap-renewservercert.txt 包含以下内容:

```
 dn:
 changetype: modify
 add: renewServerCertificate
 renewServerCertificate: 1
 -
```

2. 运行下面的命令

```
C:\> ldifde -i -f ldap-renewservercert.txt
```

## 测试LDAPS
#### 在windows上测试
1. 从另外一台在域中的计算机，安装第一步生成的根证书 ca.crt 到受信任的根证书颁发机构
2. `cmd`--`ldp` 打开工具
3. 连接--连接，输入服务器 端口等参数
4. 返回正常信息，说明ok.

![](https://tva1.sinaimg.cn/large/00831rSTly1gci2edksytj312z0u0q5e.jpg)

#### 在linux上测试

```
vi /etc/ldap/ldap.conf
HOST dc.kingsd.top
PORT 636
TLS_CACERT      /root/2012/ca.crt # 根证书的路径
```

```

root@iZ2zebr5gfi9o0005icumgZ:~/2012# ldapsearch -H "ldaps://dc.kingsd.top" -D "your_user@kingsd.top" -w 'your_password' -b "OU=shenyang,OU=rancher,DC=kingsd,DC=top" "$(objectClass=person)"
# extended LDIF
#
# LDAPv3
# base <OU=shenyang,OU=rancher,DC=kingsd,DC=top> with scope subtree
# filter: (objectclass=*)
# requesting:
#

# shenyang, rancher, kingsd.top
dn: OU=shenyang,OU=rancher,DC=kingsd,DC=top

# wanghailong, shenyang, rancher, kingsd.top
dn: CN=wanghailong,OU=shenyang,OU=rancher,DC=kingsd,DC=top

# wanghailong2, shenyang, rancher, kingsd.top
dn: CN=wanghailong2,OU=shenyang,OU=rancher,DC=kingsd,DC=top

# search result
search: 2
result: 0 Success

# numResponses: 4
# numEntries: 3
```

参考：
https://gist.github.com/magnetikonline/0ccdabfec58eb1929c997d22e7341e45
