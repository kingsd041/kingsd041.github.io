---
layout: post
title: Ubuntu 18.04 配置s-nail发送邮件
subtitle: s-nail
date: 2021-2-19 15:57:00 +0800
author: Ksd
header-img: img/post-bg-unix-linux.jpg
catalog: true
tags:
  - Linux
  - ubuntu
  - mail
  - s-nail
---

## 配置 apt 源

通过在终端中输入以下命令来安装 s-nail：

```
sudo apt update
sudo apt install s-nail
```

## 配置 s-nail

vi /etc/s-nail.rc

```
# 文件最后附加：
set from="xxx@qq.com"
set smtp="smtps://smtp.qq.com:465"
set smtp-auth-user="xxx@qq.com"
set smtp-auth-password="xxx" # 需要到 QQ 邮箱的 设置->账户->POP3/IMAP/SMTP/Exchange/CardDAV/CalDAV服务 开机 “POP3/SMTP服务” 并生成授权码
set smtp-auth=login
```

## 测试

```
# 示例1：
echo "邮件内容" | s-nail  -s "邮件主题" xxx@nicholas_ksd.com
# 示例2：
s-nail  -s "邮件主题" xxx@nicholas_ksd.com  < result.txt
```

## 参考

http://manpages.ubuntu.com/manpages/bionic/en/man1/s-nail.1.html

