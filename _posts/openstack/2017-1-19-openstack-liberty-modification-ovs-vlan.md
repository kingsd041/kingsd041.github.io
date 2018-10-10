---
layout:     post
title:      openstack liberty ovs vxlan 改 ovs vlan
subtitle:   
date:       2017-1-19 20:49:00 +0800
author:     Ksd
header-img: img/post-bg-unix-linux.jpg
catalog: true
tags:
    - Openstack
---


## 说明  
> 1. 前天把linuxbridge改成了ovs+vxlan。再接再厉，今天讲ovs-vxlan改成ovs-vlan模式。
> 2. 环境信息、ovs安装等请参见上一篇文章[openstack liberty bridge 改 ovs vxlan](https://kingsd041.github.io/kingsd041.github.io/2017/01/16/openstack-liberty-modification-ovs-vxlan/)
> 3. `vlan网络上联交换机对应的网口应该配置成qinq模式，否则vlan打完标签之后无法出局。`

__直接贴配置文件__

#### 控制节点  

###### ml2_conf.ini  
```
root@B-70-2:~# grep -v -e ^# -e ^$ /etc/neutron/plugins/ml2/ml2_conf.ini
[ml2]
type_drivers = vxlan, flat, gre, vlan
tenant_network_types = vlan
mechanism_drivers = openvswitch, l2population
extension_drivers = port_security
[ml2_type_flat]
flat_networks = external
[ml2_type_vlan]
network_vlan_ranges = vlan:1:1024
[ml2_type_vxlan]
[ml2_type_gre]
[securitygroup]
enable_ipset = True
```  


#### 网络节点  


###### ml2_conf.ini
```
root@B-70-3:~# grep -v -e ^# -e ^$ /etc/neutron/plugins/ml2/ml2_conf.ini
[ml2]
type_drivers = vxlan, flat, gre, vlan
tenant_network_types = vlan
mechanism_drivers = openvswitch, l2population
extension_drivers = port_security
[ml2_type_flat]
[ml2_type_vlan]
network_vlan_ranges = vlan:1:1024
[ml2_type_vxlan]
[ml2_type_gre]
```  

###### openvswitch_agent.ini
```
root@B-70-3:~# grep -v -e ^# -e ^$ /etc/neutron/plugins/ml2/openvswitch_agent.ini
[ovs]
bridge_mappings=vlan:br-vlan
[agent]
l2_population = True
[securitygroup]
enable_security_group = True
firewall_driver = neutron.agent.linux.iptables_firewall.OVSHybridIptablesFirewallDriver
enable_ipset = True
```  

###### l3_agent.ini  
```
root@B-70-3:~# grep -v -e ^# -e ^$ /etc/neutron/l3_agent.ini
[DEFAULT]
verbose = True
interface_driver = neutron.agent.linux.interface.OVSInterfaceDriver
use_namespaces = True
external_network_bridge = br-ex
[AGENT]
```  
改成vxlan时，`external_network_bridge`配置为空，但改成vlan时，此配置必须填写外部网桥的网桥名称。  



#### 计算节点  

###### ml2_conf.ini  
```
root@B-17-4:~# grep -v -e ^# -e ^$ /etc/neutron/plugins/ml2/ml2_conf.ini
[ml2]
type_drivers = vxlan, flat, gre, vlan
tenant_network_types = vlan
mechanism_drivers = openvswitch, l2population
extension_drivers = port_security
[ml2_type_flat]
[ml2_type_vlan]
network_vlan_ranges = vlan:1:1024
[ml2_type_vxlan]
[ml2_type_gre]
```  

###### openvswitch_agent.ini
```
root@B-17-4:~# grep -v -e ^# -e ^$ /etc/neutron/plugins/ml2/openvswitch_agent.ini
[ovs]
bridge_mappings = vlan:br-vlan
[agent]
l2_population = True
[securitygroup]
enable_security_group = True
firewall_driver = neutron.agent.linux.iptables_firewall.OVSHybridIptablesFirewallDriver
enable_ipset = True
```  


## 创建网桥  

#### 网络节点  

```
创建br-vlan
# ovs-vsctl add-br br-vlan
# ovs-vsctl add-port br-vlan eth1

创建br-ex
# ovs-vsctl add-br br-ex
# ovs-vsctl add-port br-ex eth3
``` 
`使用vxlan时，不需要创建br-vlan，难道是因为设置了local_ip？`  

#### 计算节点
```
ovs-vsctl add-br br-vlan
ovs-vsctl add-port br-vlan eth1
```

## 重启服务  
```
控制节点：
service  neutron-server restart
网络节点：
service neutron-dhcp-agent restart
service neutron-metadata-agent restart
service neutron-plugin-openvswitch-agent restart
service neutron-l3-agent restart
计算节点：
service neutron-plugin-openvswitch-agent restart
```  

## 创建外部网络
```
neutron net-create ext-net --router:external True   --provider:physical_network external --provider:network_type flat
neutron subnet-create ext-net --name ext-subnet --allocation-pool   start=10.24.3.211,end=10.24.3.250 --disable-dhcp   --gateway 10.24.3.254 10.24.3.0/24
```




## 总结  
- 本次部署，最开始l3配置文件中的external_network_bridge设置为空，导致无法上br-int的port qg无法连接到br-ex网桥，从本机一直ping不通router ip。
- 修改正确后，重启各服务，网络节点的br-ex上依然没有和br-int网桥相连的port，最开始选择重新建网桥，后来尝试了下使用`service neutron-ovs-cleanup restart` ,再重启网络节点各服务，轻松搞定。  

## 网络节点ovs-vsctl show  

应该特别注意一下br-ex网桥的`qg`网卡，有时候ping不通路由，很可能是该网卡没建立成功。

```
763bb22d-c433-4595-a731-5acb092d94f8
    Bridge br-ex
        Port "qg-963aed57-cf"
            Interface "qg-963aed57-cf"
                type: internal
        Port "eth3"
            Interface "eth3"
        Port br-ex
            Interface br-ex
                type: internal
    Bridge br-int
        fail_mode: secure
        Port int-br-vlan
            Interface int-br-vlan
                type: patch
                options: {peer=phy-br-vlan}
        Port br-int
            Interface br-int
                type: internal
        Port "tap3434ee66-4d"
            tag: 1
            Interface "tap3434ee66-4d"
                type: internal
        Port "qr-908d888d-eb"
            tag: 1
            Interface "qr-908d888d-eb"
                type: internal
    Bridge br-vlan
        fail_mode: secure
        Port phy-br-vlan
            Interface phy-br-vlan
                type: patch
                options: {peer=int-br-vlan}
        Port "eth1"
            Interface "eth1"
        Port br-vlan
            Interface br-vlan
                type: internal
    ovs_version: "2.4.1"
```  

