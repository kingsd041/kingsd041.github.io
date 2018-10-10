---
layout:     post
title:      Linux 磁盘监控命令--iostat
subtitle:   iostat
date:       2017-2-18 15:06:00 +0800
author:     Ksd
header-img: img/post-bg-unix-linux.jpg
catalog: true
tags:
    - Linux
    - 监控
---

## 语法1  
```
[root@localhost ~]# iostat  -d -k 2 100
Linux 2.6.32-642.11.1.el6.x86_64 (localhost.localdomain)     02/13/2017     _x86_64_    (2 CPU)

Device:            tps    kB_read/s    kB_wrtn/s    kB_read    kB_wrtn
sda               0.28         0.50        57.15     420921   48498560
dm-0             14.31         0.48        57.11     406305   48469624
dm-1              0.00         0.00         0.00       1300          0

```  

#### 说明  
- -d选项：显示设备（磁盘）使用状态，后面可接磁盘名称。
- -k选项：表示将Block为单位的列使用KB为单位
- 2：表示数据采集每隔2秒一次；
- 10：表示采集10次  

#### 输出信息  

- tps：该设备每秒的传输次数（Indicate the number of transfers per second that were issued to the device.）。"一次传输"意思是"一次I/O请求"。多个逻辑请求可能会被合并为"一次I/O请求"。"一次传输"请求的大小是未知的。 tps应该就是iops。
- kB_read/s：每秒从设备（drive expressed）读取的数据量；
- kB_wrtn/s：每秒向设备（drive expressed）写入的数据量；
- kB_read：读取的总数据量；
- kB_wrtn：写入的总数量数据量；这些单位都为Kilobytes。


## 语法2  

```
root@compute1:~# iostat -x -d -k 2 10
Linux 4.4.0-46-generic (compute1)     01/10/2017     _x86_64_    (32 CPU)

Device:         rrqm/s   wrqm/s     r/s     w/s    rkB/s    wkB/s avgrq-sz avgqu-sz   await r_await w_await  svctm  %util
sda               0.00     0.09    0.15    1.41     8.38   335.22   438.92     0.30  190.46    5.39  210.18   1.34   0.21
dm-0              0.00     0.00    0.15    0.55     8.36   335.21   983.31     0.10  144.76    5.47  182.06   2.99   0.21
dm-1              0.00     0.00    0.00    0.00     0.01     0.01     8.14     0.00  288.65    2.23  476.65   8.09   0.00

```  
#### 说明  

- -x选项：用于显示和I/O相关的扩展数据  

#### 输出信息  

- rrqm/s：每秒这个设备相关的读请求有多少被Merge（合并）了（当系统调用需要读取数据时，虚拟文件系统讲请求发到各个文件系统，如果文件系统发现不同的读取请求读取的是相同块的数据，文件系统会将这个请求合并）。
- wrqm/s：每秒这个设备相关的写入请求有多少被合并了。
- r/s：每秒读请求。
- w/s：每秒写请求。
- rKB/s：每秒从设备读入的数据量。
- wKB/s：每秒向设备写入的数据量。
- avgrq-sz：平均请求扇区的大小avgqu-sz是平均请求队列的长度。
- await：响应时间，每一个I/O请求的处理的平均时间（单位是毫秒）
- svctm：表示平均每次设备I/O操作的服务时间（以毫秒为单位）
- %util：设备使用率，在统计时间内所有处理I/O时间，除以总共统计时间。
- iops：r/s+w/s

## 异常说明  

- %util 表示磁盘利用率，值越小磁盘越空闲，当这个值持续大于90%说明磁盘利用率很高，需要引起重视。
- await和avctm是一对相对的数据，await可以理解为I/O的处理时间，包括队列时间和操作时间，一般系统I/O处理时间应该低于5ms，一旦超过20ms，系统会感觉到卡（当然如果是多磁盘，即使%util是100%，因为磁盘的并发能力，所以磁盘使用未必就到了瓶颈）
-       如果await远远超过srvtm，说明IO在队列中的等待时间很长。
- IO瓶颈：%util高，swait远远大于svctm、avgqu-sz比较大
- IO忙碌：% util高，await接近svctm，略大一点、avgqu-sz不大







 







