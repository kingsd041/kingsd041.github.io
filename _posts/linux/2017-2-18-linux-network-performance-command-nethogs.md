---
layout:     post
title:      Linux 网络监控命令--Nethogs  
subtitle:   可以查看哪个PID占用的流量高
date:       2017-2-18 16:34:00 +0800
author:     Ksd
header-img: img/post-bg-unix-linux.jpg
catalog: true
tags:
    - Linux
    - 监控
---

# 安装  

安装的版本最好是0.8.1，0.8.0 有bug，会导致各种问题。
源码怎么装目前还没能明白，ubuntu16.04使用阿里源就会安装0.8.1，14.04是0.8.0

## ubuntu系列

#### 命令行安装  
```
apt-get install nethogs  
```  
#### 源码安装  
```
安装c++环境
apt-get install -y gcc
apt-get install -y  git ncurses* -- ncurses我也不确定是否必须安装
apt-get install -y  libpcap-dev

git clone https://github.com/raboof/nethogs
cd nethogs
make
make install  
```  

## centos 系列


#### 命令行安装  

在epel源中可以直接yum安装,配置阿里云epel源.  
```
[root@dev src]# yum install -y libpcap nethogs -y  
```  

#### 源码安装  

```
#安装c++环境
[root@dev src]# yum install -y gcc-c++ libpcap-devel.x86_64 libpcap.x86_64 ncurses*
[root@dev src]# git clone https://github.com/raboof/nethogs
[root@dev src]# cd nethogs/
[root@dev src]# make
[root@dev src]# make install
```  


# 命令行参数  

每隔5秒刷新一次  
```
# nethogs -d 5  
```  

如果只用来监视设备(eth0)的网络带宽可以使用如下命令：  
```
# nethogs eth0  
```  

如果要同时监视eth0和eth1接口,使用以下命令即可:  
```
# nethogs eth0 eth1  
```  

# 其他参数和用法  

- -d : 刷新间隔
- -h : 帮助
- -p : promiscious 模式
- -t : trace模式
- -V : 版本  


# 交互命令

以下是NetHogs的一些交互命令(键盘快捷键)  

- m : 修改单位
- r : 按流量排序
- s : 按发送流量排序
- q : 退出命令提示符

# 故障排查  

1. 在PID那一列，可以使用 lsof -p pid 查看进程。
2. 或者用“lsof -i:端口号”来查看是哪些进程在占用。

