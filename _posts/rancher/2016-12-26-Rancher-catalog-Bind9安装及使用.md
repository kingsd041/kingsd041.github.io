---
layout:     post
title:      Rancher catalog Bind9安装及使用
subtitle:   Rancher catalog
date:       2016-12-26 20:49:00 +0800
author:     Ksd
header-img: img/post-bg-cook.jpg
catalog: true
tags:
    - Rancher
---

## 说明
使用Rancher时，当需要对外暴漏端口时，可以创建一个LB，将端口暴漏在外。但是当LB宕机时，我们将无法访问应用，就算设置健康检查，对应的IP也会更换，使用过程中会带来不便。  
我们可以使用Rancher Catalog中的bind9服务器来解决该问题。

## 版本
Rancher：1.1.3  
Docker：1.10.3  
操作系统：Ubuntu 14.04  

## 操作
Bind9是根据DNS的update-policy选项，配合认证用的key来进行数据文件的更新。

#### 生成秘钥

```bash
root@rancher-agent-4:~/key2# dnssec-keygen -a HMAC-MD5 -b 128 -n HOST ksd  
Kksd.+157+17828

选项与参数：  
-a ：后面接的 [type] 为演算方式的意思，主要有 RSAMD5, RSA, DSA, DH  
与 HMAC-MD5 等。建议你可以使用常见的 HMAC-MD5 来演算密码；  
-b ：你的密码长度为多少？通常给予 512 位的 HMAC-MD5；  
-n ： 后面接的则是客户端能够更新的类型， 主要有底下两种， 建议给 HOST 即可：  
ZONE：客户端可以更新任何标志及整个 ZONE；  
HOST：客户端仅可以针对他的主机名来更新。
```

```
root@rancher-agent-4:~/key2# cat Kksd.+157+17828.key  
ksd. IN KEY 512 3 157 zZN/HEvc3Ve2zFagtxIFow==    


ksd 为keyname

zZN/HEvc3Ve2zFagtxIFow== 为TSIG key
```

#### Rancher Catalog安装Bind9

访问【Rancher Catalog】，选择“Bind9 Domain Name Server”。

![catalog bind9](img/bind9/catalog-bind9.jpg)
![catalog bind9](img/bind9/catalog-detail.jpg)

现在，一个带有forward功能DNS服务器已经搭建完成。

```
    参数说明：
          ksd.com： dns zone name
          ksd ： 执行nssec-keygen命令时，设置的keyname
          zZN/HEvc3Ve2zFagtxIFow==  ：  通过dnssec-keygen命令生成的TSIG key

```

#### 验证bind9安装
```bash
$ dig -t a www.baidu.com @192.168.252.235
          ...........
          ...........
          ...........
;; ANSWER SECTION:
www.baidu.com.        901    IN    CNAME    www.a.shifen.com.
www.a.shifen.com.    31    IN    A    111.206.223.172
www.a.shifen.com.    31    IN    A    111.206.223.173
          ...........
          ...........
          ...........

本例中，bind9安装在192.168.252.235机器上。

通过dig命令，指定dns服务器192.168.252.235，如获取对应的A记录，这Bind9搭建成功。
```

## Rancher Catalog安装DNS Update (RFC2136)

#### Rancher Catalog安装DNS Update
访问【Rancher Catalog】，选择“DNS Update (RFC2136)”。

![](img/bind9/catalog-dns-update.jpg)
![](img/bind9/catalog-dns-update-detail.jpg)

```  
    参数说明：
          ksd.com： dns zone name
          ksd ： 执行nssec-keygen命令时，设置的keyname
          zZN/HEvc3Ve2zFagtxIFow==  ：  通过dnssec-keygen命令生成的TSIG key

```

## 测试DNS
通过Rancher catalog创建wordpress 应用。创建成功后可通过http://<service>.<stack>.<environment>.<hosted zone>访问wordpress应用。

```
# dig -t a wordpress.wordpress.default.ksd.com @192.168.252.235

;; QUESTION SECTION:  
;wordpress.wordpress.default.ksd.com. IN    A

;; ANSWER SECTION:  
wordpress.wordpress.default.ksd.com. 299 IN A    192.168.252.235

;; AUTHORITY SECTION:  
ksd.com.        604800    IN    NS    ns.ksd.com.

;; ADDITIONAL SECTION:  
ns.ksd.com.        604800    IN    A    192.168.252.235

;; Query time: 1 msec  
;; SERVER: 192.168.252.235#53(192.168.252.235)  
;; WHEN: Tue Aug 30 08:27:10 UTC 2016  
;; MSG SIZE  rcvd: 113

```

## 自定义A记录  

该Bind9不仅提供Rancher使用，也可以自定义A记录，提供给Rancher以外的主机使用。  
我们还记得通过dnssec-keygen命令生产的两个key文件吧，我们登陆到含有这两个key的文件夹中，然后通过nsupdate命令进行设置。  

```
#cd /root/key2/  
#nsupdate -k Kksd.+157+17828.key  
> server 192.168.252.235  
> update web.ksd.com <==如果存在，删除原有的  
> update add web.ksd.com 600 A 192.168.252.175 <==更新到最新的  
> send  
> 最后在此按下 [ctrl]+D 即可  

#测试  

#dig -t a web.ksd.com @192.168.252.235  
;; QUESTION SECTION:  
;web.ksd.com.            IN    A  

;; ANSWER SECTION:  
web.ksd.com.        600    IN    A    192.168.252.175  

;; AUTHORITY SECTION:  
ksd.com.        604800    IN    NS    ns.ksd.com.  

;; ADDITIONAL SECTION:  
ns.ksd.com.        604800    IN    A    192.168.252.235  

```

## 安全  

Bind9中默认的设置几乎都为允许，例如：allow-recursion、allow-query-cache、allow-query、recursion、dnssec-enable、dnssec-validation。内网测试还可以，如果开放到公网，非常危险。  投入使用后，还需要针对这些参数单独优化。
























