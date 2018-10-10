---
layout:     post
title:      Linux 磁盘性能测试工具--Fio
subtitle:   Fio
date:       2017-2-18 15:57:00 +0800
author:     Ksd
header-img: img/post-bg-unix-linux.jpg
catalog: true
tags:
    - Linux
    - 监控
---

## 安装  
从fio官网下载源码,网址：http://linux.softpedia.com/get/System/Filesystems/fio-7881.shtml  
```
#安装gcc编译器：
yum –y install gcc
#安装libiao库
yum install libaio-devel
tar -jxvf fio-2.1.4.tar.bz2
cd fio-2.1.4
make && make install

```  
## 说明  
1. 如果测试IOPS，使用4k块即可；如测试带宽，使用大块例如32M,随机读。
2. 如无指定测试条件，使用4k随机读、4k随机写、32k随机读、32k随机写。
3. 一般测试使用异步I/O
4. 一般使用裸盘测试  

## 样例  
```
#同步i/o、顺序读：
fio -filename=/dev/rbd2 -direct=1 -iodepth 1 -thread -rw=read -ioengine=psync -bs=16k -size=50G -numjobs=30 -runtime=1000 -group_reporting -name=read-psync >read-psync.txt

#同步i/o、顺序写：
fio -filename=/dev/rbd2 -direct=1 -iodepth 1 -thread -rw=write -ioengine=psync -bs=16k -size=30G -numjobs=30 -runtime=1000 -group_reporting -name=write-psync >write-psync.txt

#同步i/o、顺序混合读写：
fio -filename=/dev/rbd2 -direct=1 -iodepth 1 -thread -rw=readwrite -rwmixread=50 -ioengine=psync -bs=16k -size=50G -numjobs=30 -runtime=1000 -group_reporting -name=>rw-readwrite-psync.txt

#同步i/o、随机读：
fio -filename=/dev/rbd2 -direct=1 -iodepth 1 -thread -rw=randread -ioengine=psync -bs=16k -size=50G -numjobs=30 -runtime=1000 -group_reporting -name=randread-psync >randread-psync.txt

#同步i/o、随机写：
fio -filename=/dev/rbd2 -direct=1 -iodepth 1 -thread -rw=randwrite -ioengine=psync -bs=16k -size=50G -numjobs=30 -runtime=1000 -group_reporting -name=randwrite-psync >randwrite-psync.txt

#同步i/o、随机混合读写：
fio -filename=/dev/rbd2 -direct=1 -iodepth 1 -thread -rw=randrw -rwmixread=50 -ioengine=psync -bs=16k -size=50G -numjobs=30 -runtime=100 -group_reporting -ioscheduler=noop -name=randrw-psync >randrw-psync.txt

##############################  异步 i/o   ##################################################################3

#异步 i/o、顺序读：
fio -filename=/dev/rbd2 -direct=1 -iodepth 1 -thread -rw=read -ioengine=libaio -bs=16k -size=50G -numjobs=30 -runtime=1000 -group_reporting -name=read-libaio >read-libaio.txt

#异步 i/o、顺序写：
fio -filename=/dev/rbd2 -direct=1 -iodepth 1 -thread -rw=write -ioengine=libaio -bs=16k -size=50G -numjobs=30 -runtime=1000 -group_reporting -name=write-libaio >write-libaio.txt

#异步 i/o、顺序混合读写：
fio -filename=/dev/rbd2 -direct=1 -iodepth 1 -thread -rw=readwrite -rwmixread=50 -ioengine=libaio -bs=16k -size=50G -numjobs=30 -runtime=1000 -group_reporting -name=rw-readwrite-libaio >rw-readwrite-psync.txt

#异步 i/o、随机读：
fio -filename=/dev/rbd2 -direct=1 -iodepth 1 -thread -rw=randread -ioengine=libaio -bs=16k -size=50G -numjobs=30 -runtime=1000 -group_reporting -name=randread-libaio >randread-libaio.txt

#异步 i/o、随机写：
fio -filename=/dev/rbd2 -direct=1 -iodepth 1 -thread -rw=randwrite -ioengine=libaio -bs=16k -size=50G -numjobs=30 -runtime=1000 -group_reporting -name=randwrite-libaio >randwrite-libaio.txt

#异步 i/o、随机混合读写：
fio -filename=/dev/rbd2 -direct=1 -iodepth 1 -thread -rw=randrw -rwmixread=50 -ioengine=libaio -bs=16k -size=50G -numjobs=30 -runtime=100 -group_reporting -ioscheduler=noop -name=randrw-libaio >randrw-libaio.txt

```  

## 参数说明  
- filename=/dev/sdb1       测试文件名称，通常选择需要测试的盘的data目录。
- direct=1                 测试过程绕过机器自带的buffer。使测试结果更真实。
- rw= read 顺序读、write 顺序写 、randwrite 随机写 、randread 随机读 、rw,readwrite 顺序混合读写 、randrw 随机混合读写
- bs=16k                   单次io的块文件大小为16k
- bsrange=512-2048         同上，提定数据块的大小范围
- size=5g    本次的测试文件大小为5g，以每次4k的io进行测试。
- numjobs=30               本次的测试线程为30.根据CPU核数设定，设置1即可。设置的值越大，结果越好。
- runtime=1000             测试时间为1000秒，如果不写则一直将5g文件分4k每次写完为止。
- ioengine=psync           io引擎使用pync方式
- rwmixread=30  在混合读写的模式下，读占30% ，默认%50，两个参数同时使用，后者覆盖第一
- rwmixwrite=30 在混合读写的模式下，写占30% ，默认%50
- group_reporting          关于显示结果的，汇总每个进程的信息。

__此外__
- lockmem=1g               只使用1g内存进行测试。
- zero_buffers             用0初始化系统buffer。
- nrfiles=8                每个进程生成文件的数量。
- ioscheduler 尝试切换设备托管文件指定的I / O调度器。
- psync  同步i/o测试
- libaio 异步i/o测试libaio的读写过程简单说来就是你发出一个读写请求，然后你可以开始做其他事情，当读写过程结束时libaio会通知你你的这次请求已经完成


## 结果说明  

因报告内容丰富，而我们只需要关注以下两项即可：

- bw：磁盘的吞吐量，这个是顺序读写考察的重点
- iops：磁盘的每秒读写次数，这个是随机读写考察的重点

比如，下面是4个测试的结果部分截取：  

test-read: (groupid=0, jobs=4): err= 0: pid=4752  
read : io=839680KB, bw=76823KB/s, iops=75 , runt= 10930msec  
随机读，`带宽3457.4KB/s, iops=864`  

test-rand-write: (groupid=0, jobs=64): err= 0: pid=4685  
write: io=129264KB, bw=6432.4KB/s, iops=1608 , runt= 20097msec  
随机写，`带宽6432.4KB/s, iops=1608`
