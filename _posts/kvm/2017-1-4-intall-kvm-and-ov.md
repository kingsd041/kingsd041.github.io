---
layout:     post
title:      Ubuntu 14.04 安装KVM、网桥、OVS 及配置
subtitle:   
date:       2017-1-4 22:33:00 +0800
author:     Ksd
header-img: img/post-bg-unix-linux.jpg
catalog: true
tags:
    - Linux
    - kvm
---

## 环境说明：  
操作系统：Ubuntu 14.04

## 安装KVM  
- 检查CPU是否支持安装KVM  

```
# egrep -o '(vmx|svm)' /proc/cpuinfo
```  
- 安装KVM  

```
# apt-get install qemu-kvm libvirt-bin virt-manager bridge-utils
```  
- 检查安装是否成功  

```
# lsmod | grep kvm
virsh -c qemu:///system list  
```  

## 安装openvswitch  
- 安装OVS

```
# apt-get install openvswitch-switch
```  
- 查看OVS运行情况

```
# ps -ea | grep ovs
10637 ?        00:00:00 ovsdb-server
10647 ?        00:00:00 ovs-vswitchd
```  
- 查看安装版本

```
# ovs-appctl --version
ovs-appctl (Open vSwitch) 2.0.2
Compiled May 13 2015
```  

## 网桥  
- 安装网桥  

```
# apt-get install bridge-utils uml-utilities
```  
- 配置网卡  

```
auto lo
iface lo inet loopback

auto eth0
iface eth0 inet manual

auto br0
iface br0 inet static
address 10.2.70.2
netmask 255.255.0.0
gateway 10.2.254.254
dns-nameservers 114.114.114.114 8.8.4.4

bridge_ports eth0
bridge_stp off
bridge_fd 0
bridge_maxwait 0

auto eth3
iface eth3 inet manual
```  
`eth3的上联交换机配置的是 trunk`

## 创建虚拟机，使用桥接  
- 创建虚拟机  

```
virt-install --name=ubuntu-1 --ram=1024 --vcpus=1 --os-type=Linux --hvm --cdrom=/home/neunn/ubuntu-14.04-server-amd64.iso --file=/root/img/ubuntu-1.img --file-size=10 --bridge=br0 --graphics vnc,listen=0.0.0.0,port=5920
``` 

## 虚拟机使用OVS  
- 创建一个默认的网桥br0，并添加一个物理网络接口，虚拟机将通过这个接口与外部网络进行联系。在该教程中，我假设这类网络接口是eth3。

```
# ovs-vsctl add-br br1
# ovs-vsctl add-port br1 eth3
# ovs-vsctl show
b032d7b7-b1e1-47d3-a491-8ceee47fdb40
    Bridge "br1"
        Port "br1"
            Interface "br1"
                type: internal
        Port "eth3"
            Interface "eth3"
    ovs_version: "2.0.2"
```  
- 修改虚拟机配置文件，设置使用OVS  
type必修是openvswitch，tap1为ovs的port，tag设置vlanid

```
    <interface type='bridge'>
      <mac address='52:54:00:20:da:69'/>
      <source bridge='br1'/>
      <vlan>
        <tag id='2'/>
      </vlan>
      <virtualport type='openvswitch'>
        <parameters interfaceid='a1cfca0e-970b-4a84-b87d-a063c6214cb1'/>
      </virtualport>
      <target dev='tap1'/>
      <model type='virtio'/>
      <address type='pci' domain='0x0000' bus='0x00' slot='0x03' function='0x0'/>
    </interface>
```  
容器虚拟机，并且设置虚拟机IP，即可测试。  

## 跨主机间虚拟机通讯  
跨主机间虚拟机通过OVS通讯其实和一台虚拟机上通讯是一样，只是将eth3上联交换机端口设置成trunk即可。

## 遗留问题
1. 跨主机间虚拟机通讯，上连交换机如果是vlan模式，是否还可以通？
2. 使用本教程创建的虚拟机只能互通，不能上外网。如需上外网，还需要再研究，小弟不会啊……
3. 创建虚拟机时，先使用br0网桥，然后再编辑配置文件设置OVS。现在还不清楚创建虚拟机时直接指定OVS。
