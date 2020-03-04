---
layout:     post
title:      OpenLDAP 启用tls并授权rancher登录
subtitle:   openLDAP 启用tls并授权rancher登录
date:       2020-3-4 15:06:00 +0800
author:     Ksd
header-img: img/post-bg-rancher-k8s.png
catalog: true
tags:
    - rancher
    - openLDAP
    - ldap
---


本次操作使用的是自签名证书，所以需要先生成自签名证书，然后再讲证书挂载到对应的目录中

## 自定义CA签名证书
#### 为什么要用TLS？
Openldap默认使用简单验证，对slapd的所有访问都使用明文密码通过未加密通道进行。为了确保信息安全，需要对信息进行加密传输，SSL（Secure Sockets Layer）是一个可靠的解决方案。

它使用 X.509 证书，由可信任第三方（Certificate Authority (CA)）进行数字签名的一个标准格式的数据。有效的数字签名意味着已签名的数据没有被篡改。如果签名的数据被更改，将不会通过验证

#### 创建根密钥
```sh
openssl genrsa -out hailongCA.key 2048
```
#### 创建自签名根证书
```sh
openssl req -x509 -new -nodes -key hailongCA.key -sha256 -days 1024 -out hailongCA.pem
```
**输出**
```sh
# openssl req -x509 -new -nodes -key hailongCA.key -sha256 -days 1024 -out hailongCA.pem
Can't load /root/.rnd into RNG
139666739052992:error:2406F079:random number generator:RAND_load_file:Cannot open file:../crypto/rand/randfile.c:88:Filename=/root/.rnd
You are about to be asked to enter information that will be incorporated
into your certificate request.
What you are about to enter is what is called a Distinguished Name or a DN.
There are quite a few fields but you can leave some blank
For some fields there will be a default value,
If you enter '.', the field will be left blank.
-----
Country Name (2 letter code) [AU]:CN
State or Province Name (full name) [Some-State]:liaoning
Locality Name (eg, city) []:shenyang
Organization Name (eg, company) [Internet Widgits Pty Ltd]:XXX
Organizational Unit Name (eg, section) []:sy
Common Name (e.g. server FQDN or YOUR name) []:openldap.kingsd.top # ldap服务器的域名
Email Address []:your_mail
```
#### LDAP服务器创建私钥
```sh
openssl genrsa -out hailongldap.key 2048
```
#### 创建证书签名请求
```sh
openssl req -new -key hailongldap.key -out hailongldap.csr
```

**输出：**
```sh
# openssl req -new -key hailongldap.key -out hailongldap.csr
You are about to be asked to enter information that will be incorporated
into your certificate request.
What you are about to enter is what is called a Distinguished Name or a DN.
There are quite a few fields but you can leave some blank
For some fields there will be a default value,
If you enter '.', the field will be left blank.
-----
Country Name (2 letter code) [AU]:CN
State or Province Name (full name) [Some-State]:liaoning
Locality Name (eg, city) []:shenyang
Organization Name (eg, company) [Internet Widgits Pty Ltd]:XXX
Organizational Unit Name (eg, section) []:sy
Common Name (e.g. server FQDN or YOUR name) []:openldap.kingsd.top # ldap服务器的域名
Email Address []:your_mail

Please enter the following 'extra' attributes
to be sent with your certificate request
A challenge password []:
An optional company name []:
```

#### 使用自定义根CA签署证书签名请求
```sh
openssl x509 -req -in hailongldap.csr -CA hailongCA.pem -CAkey hailongCA.key -CAcreateserial -out hailongldap.crt -days 1460 -sha256
```

#### 拷贝使用到的证书到应用目录
```sh
cp hailongldap.{crt,key} hailongCA.pem /etc/openldap/certs/
```

## 搭建openLDAP环境
直接在linux上安装openLDAP，启用TLS一直没弄明白，所以本次采用[sixia/docker-openldap](https://github.com/osixia/docker-openldap)搭建openLDAP环境。

#### 启动`osixia/openldap`容器
> 详细参数参考：https://github.com/osixia/docker-openldap

```sh
docker run --env LDAP_ORGANISATION="My Company" --env LDAP_DOMAIN="kingsd.top" \
    --name openldap_container \
    --env LDAP_ADMIN_PASSWORD="your_password" \
    -v /etc/openldap/data:/var/lib/ldap \
    -v /etc/openldap/conf:/etc/ldap/slapd.d \
    -v /etc/openldap/certs:/container/service/slapd/assets/certs \
    --env LDAP_TLS_CRT_FILENAME=hailongldap.crt \
    --env LDAP_TLS_KEY_FILENAME=hailongldap.key \
    --env LDAP_TLS_CA_CRT_FILENAME=hailongCA.pem \
    --env LDAP_TLS_VERIFY_CLIENT=try \ # 如果不加这个参数，使用ldapsearch验证的时候会报错，参考：https://github.com/osixia/docker-openldap/issues/105#issuecomment-279673189

    -p 389:389 -p 636:636 \
    --hostname openldap.kingsd.top \ # 自定义证书时设置的Common Name
    --detach osixia/openldap:1.3.0
```

安装完成之后，使⽤用如下命令可以看到默认的配置
```
docker exec -it openldap_container ldapsearch -Q -LLL -Y EXTERNAL -H ldapi:/// -b cn=config dn
```
输出：
```
dn: cn=config
dn: cn=module{0},cn=config
dn: cn=schema,cn=config
dn: cn={0}core,cn=schema,cn=config
dn: cn={1}cosine,cn=schema,cn=config
dn: cn={2}nis,cn=schema,cn=config
dn: cn={3}inetorgperson,cn=schema,cn=config
dn: cn={4}ppolicy,cn=schema,cn=config
dn: cn={5}dhcp,cn=schema,cn=config
dn: cn={6}dnszone,cn=schema,cn=config
dn: cn={7}mail,cn=schema,cn=config
dn: cn={8}mmc,cn=schema,cn=config
dn: cn={9}openssh-lpk,cn=schema,cn=config
dn: cn={10}quota,cn=schema,cn=config
dn: cn={11}radius,cn=schema,cn=config
dn: cn={12}samba,cn=schema,cn=config
dn: cn={13}zarafa,cn=schema,cn=config
dn: olcBackend={0}mdb,cn=config
dn: olcDatabase={-1}frontend,cn=config
dn: olcDatabase={0}config,cn=config
dn: olcDatabase={1}mdb,cn=config
dn: olcOverlay={0}memberof,olcDatabase={1}mdb,cn=config
dn: olcOverlay={1}refint,olcDatabase={1}mdb,cn=config
```

## 配置
Rancher对接ldap服务的认证需要读取memberOf模块，通过`osixia/openldap`搭建的openLDAP环境默认已经安装了 memberOf模块。 只需执行下面的操作即可完成配置

```sh
# docker exec -it openldap_container bash
# cat > refint2.ldif<<EOF
dn: olcOverlay={1}refint,olcDatabase={1}mdb,cn=config
objectClass: olcConfig
objectClass: olcOverlayConfig
objectClass: olcRefintConfig
objectClass: top
olcOverlay: {1}refint
olcRefintAttribute: memberof member manager owner
EOF
```
> `dn: olcOverlay={1}refint,olcDatabase={1}mdb,cn=config` {}里的数字可以通过`docker exec -it openldap_container ldapsearch -Q -LLL -Y EXTERNAL -H ldapi:/// -b cn=config dn`查询, 在我的环境上是{1},而且后面的`mdb`也需要注意，有的环境是其他的标识
```
# ldapsearch -Q -LLL -Y EXTERNAL -H ldapi:/// -b cn=config dn | grep refint
dn: olcOverlay={1}refint,olcDatabase={1}mdb,cn=config
```

执行命令add：
```
# ldapadd -Q -Y EXTERNAL -H ldapi:/// -f refint2.ldif
adding new entry "olcOverlay={1}refint,olcDatabase={1}mdb,cn=config"
```

所有操作都执行成功后，将会得到类似下面的配置：
```
# cat /etc/openldap/conf/cn=config/cn=module{0}.ldif
# AUTO-GENERATED FILE - DO NOT EDIT!! Use ldapmodify.
# CRC32 73084b0a
dn: cn=module{0}
objectClass: olcModuleList
cn: module{0}
olcModulePath: /usr/lib/ldap
olcModuleLoad: {0}back_mdb
olcModuleLoad: {1}memberof
olcModuleLoad: {2}refint
structuralObjectClass: olcModuleList
entryUUID: 81820e30-f237-1039-988a-49a62d7c5b45
creatorsName: cn=admin,cn=config
createTimestamp: 20200304074255Z
entryCSN: 20200304074256.449972Z#000000#000#000000
modifiersName: gidNumber=0+uidNumber=0,cn=peercred,cn=external,cn=auth
modifyTimestamp: 20200304074256Z
```

以上就完成了了memberOf模块的配置，我们可以使⽤用命令行⼯工具，或者web⻚页⾯面来 维护相关组织单元信息了。

## phpldapadmin

为了更直观的管理理ldap信息，可以直接在openldap的主机上安装web端工具，⽅便维护ldap信息
这里使⽤docker运行⼀个phpldapadmin服务，首先需要配置对接openldap服务的相关信息，将以下内容保存到env.yaml中
```
# cat env.yml
  - server:
      - tls: false # phpldapadmin只是一个管理平台，不需要开启tls
  - login:
    - bind_id: cn=admin,dc=kingsd,dc=top
    - bind_pass: your_password
  - auto_number:
    - min: 1000
```
> `bind_id` 可以通过`docker exec -it openldap_container cat /etc/ldap/slapd.d/cn=config/olcDatabase={1}mdb.ldif | grep olcRootDN `获得

启动phpldapadmin
```
# docker run -p 6443:443 \
    --env PHPLDAPADMIN_LDAP_HOSTS=172.31.8.76 \# `osixia/openldap`容器的IP
    --volume /root/env.yml:/container/environment/01-custom/env.yaml \
    --detach osixia/phpldapadmin:0.9.0
```

然后就可以使用https://<your-server>:6443访问web⻚页面，使⽤配置文件里配置的 `bind_id` ⽤户登录即可。

## 验证
修改客户端ldap配置，指定证书位置
```
# cat /etc/ldap/ldap.conf
TLS_CACERT	/etc/openldap/certs/hailongCA.pem
```

使用ldapsearch验证, 输出如下：
```
ldapsearch -H "ldaps://openldap.kingsd.top" -D "cn=admin,dc=kingsd,dc=top" -w 'your_password' -b "OU=My Company,DC=kingsd,DC=top" "$(objectClass=person)"

# extended LDIF
#
# LDAPv3
# base <OU=My Company,DC=kingsd,DC=top> with scope subtree
# filter: (objectclass=*)
# requesting:
#

# search result
search: 2
result: 32 No such object
matchedDN: dc=kingsd,dc=top

# numResponses: 1
```

## Rancher使用openLDAP授权登录

#### phpldapadmin 设置
使用phpldapadmin登录web页面，创建ou和用户，创建用户时配置：
- RDN：User Name（uid）
- cn: wang
- sn: hailong
- passowrd: your_password
- User Name: hailong

结构图：
![](https://tva1.sinaimg.cn/large/00831rSTly1gci17wqjq6j30ly0jcadc.jpg)

#### Rancher 设置
使用本地admin用户登录rancher，全局-安全-认证-OpenLDAP,
![](https://tva1.sinaimg.cn/large/00831rSTly1gci1gf4ltuj31h20u0gxf.jpg)
注意：
- TLS：复选框需要选中
- 服务帐户专有名称：需要设置env.yml中`bind_id`的值，也就是 `olcRootDN`
- 用户搜索起点: 对应的是 phpldapadmin中rancher(ou)对应的 dn

完成认证：
![](https://tva1.sinaimg.cn/large/00831rSTly1gci1gtvsn4j31my0u0wlh.jpg)



