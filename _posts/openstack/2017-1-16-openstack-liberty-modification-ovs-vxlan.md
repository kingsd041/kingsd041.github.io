---
layout:     post
title:      openstack liberty bridge 改 ovs vxlan
subtitle:   
date:       2017-1-16 20:49:00 +0800
author:     Ksd
header-img: img/post-bg-unix-linux.jpg
catalog: true
tags:
    - Openstack
---

## 说明  
最近按照openstack liberty官网搭建openstack，官网使用的是linuxbridge方式，为了研究ovs，所以改造成ovs+vxlan模式。
按照官网搭建时，完全按照官网的搭建方式进行，只有控制节点和计算节点。 改造ovs时使用 控制节点+网络节点+计算节点。  


## 环境配置

__hosts配置__ 
 
```
cat /etc/hosts
127.0.0.1 localhost
10.2.70.2 B-70-2
10.2.70.3 B-70-3
10.2.70.4 B-17-4
```  

__B-70-2__  

```
eth0：10.2.70.2     #Management network
```  

__B-70-3__  

```
eth0：10.2.70.3     #Management network
eth1：192.168.70.3     #Tunnel network
eth3：     #External network
```  

__B-70-4__  

```
eth0：10.2.70.4     #Management network
eth1：192.168.70.4     #Tunnel network
eth3：     #External network
```  


## 删除相关neutron组件，只保留 neutron-server、ml2  

__控制节点__

```
apt-get remove neutron-plugin-linuxbridge-agent neutron-l3-agent neutron-dhcp-agent neutron-metadata-agent
```  

__计算节点__  

```
apt-get remove neutron-plugin-linuxbridge-agent
```  


## 安装neutron 组件  

__网络节点__  

```
# vim /etc/sysctl.conf
net.ipv4.ip_forward=1
net.ipv4.conf.all.rp_filter=0
net.ipv4.conf.default.rp_filter=0
# sysctl -p
```  

```
apt-get install neutron-plugin-ml2 neutron-plugin-openvswitch-agent \
neutron-l3-agent neutron-dhcp-agent neutron-metadata-agent
```  

__计算节点__  

```
apt-get install neutron-plugin-openvswitch-agent
```  


## 相关配置  

#### 说明  
> 1. 本文档是从从linuxbridge改成ovs vxlan，主要修改的配置文件是 ml2_conf.ini和openvswitch_agent.ini，其他的neutron配置几乎无需修改。
> 2. 修改过程中碰到了各种问题，所以相关配置文件的配置项有不少是没用的，也没时间整理删除无用配置，反正就一起加上了。
> 3. 一定要注意，原来的interface_driver 是 `neutron.agent.linux.interface.BridgeInterfaceDriver` ，使用ovs需要修改成 `neutron.agent.linux.interface.OVSInterfaceDriver` 。
> 4. 本文的修改是参照官网[Classic with Open vSwitch](http://docs.openstack.org/liberty/networking-guide/scenario-classic-ovs.html).
> 5. 官网中未提及 网络节点和计算节点的 ml2相关配置，但我ps 进程查看到 启动的配置文件中带有了ml2_agent.ini 的相关配置，所以参照 I 版也一起改了。  


#### 控制节点  

###### neutron.conf  

```
root@B-70-2:~# grep -v -e ^# -e ^$ /etc/neutron/neutron.conf
[DEFAULT]
rpc_backend = rabbit
notify_nova_on_port_status_changes = True
notify_nova_on_port_data_changes = True
nova_url = http://B-70-2:8774/v2
verbose = True
core_plugin = ml2
service_plugins = router
auth_strategy = keystone
allow_overlapping_ips = True
[matchmaker_redis]
[matchmaker_ring]
[quotas]
[agent]
root_helper = sudo /usr/bin/neutron-rootwrap /etc/neutron/rootwrap.conf
[keystone_authtoken]
auth_uri = http://B-70-2:5000
auth_url = http://B-70-2:35357
auth_plugin = password
project_domain_id = default
user_domain_id = default
project_name = service
username = neutron
password = neutron
[database]
connection = mysql+pymysql://neutron:NEUTRON_DBPASS@B-70-2/neutron
[nova]
auth_url = http://B-70-2:35357
auth_plugin = password
project_domain_id = default
user_domain_id = default
region_name = RegionOne
project_name = service
username = nova
password = nova
[oslo_concurrency]
lock_path = $state_path/lock
[oslo_policy]
[oslo_messaging_amqp]
[oslo_messaging_qpid]
[oslo_messaging_rabbit]
rabbit_host = B-70-2
rabbit_userid = openstack
rabbit_password = RABBIT_PASS
[qos]
```  

###### ml2_conf.ini  
```
root@B-70-2:~# grep -v -e ^# -e ^$ /etc/neutron/plugins/ml2/ml2_conf.ini
[ml2]
type_drivers = vxlan, flat, gre, vlan
tenant_network_types = vxlan
mechanism_drivers = openvswitch, l2population
extension_drivers = port_security
[ml2_type_flat]
flat_networks = external
[ml2_type_vlan]
[ml2_type_vxlan]
vni_ranges = 10:10000
[ml2_type_gre]
[securitygroup]
enable_ipset = True
```  


#### 网络节点  

###### neutron.conf  
```
root@B-70-3:~# grep -v -e ^# -e ^$ /etc/neutron/neutron.conf
[DEFAULT]
verbose = True
core_plugin = ml2
service_plugins = router
auth_strategy = keystone
allow_overlapping_ips = True
rpc_backend = rabbit
[matchmaker_redis]
[matchmaker_ring]
[quotas]
[agent]
root_helper = sudo /usr/bin/neutron-rootwrap /etc/neutron/rootwrap.conf
[keystone_authtoken]
auth_uri = http://B-70-2:5000
auth_url = http://B-70-2:35357
auth_plugin = password
project_domain_id = default
user_domain_id = default
project_name = service
username = neutron
password = neutron
[database]
[nova]
[oslo_concurrency]
lock_path = $state_path/lock
[oslo_policy]
[oslo_messaging_amqp]
[oslo_messaging_qpid]
[oslo_messaging_rabbit]
rabbit_host = B-70-2
rabbit_userid = openstack
rabbit_password = RABBIT_PASS
[qos]
```  

###### ml2_conf.ini
```
root@B-70-3:~# grep -v -e ^# -e ^$ /etc/neutron/plugins/ml2/ml2_conf.ini
[ml2]
type_drivers = vxlan, flat, gre, vlan
tenant_network_types = vxlan
mechanism_drivers = openvswitch, l2population
extension_drivers = port_security
[ml2_type_flat]
[ml2_type_vlan]
[ml2_type_vxlan]
vni_ranges = 10:10000
[ml2_type_gre]
```  

###### openvswitch_agent.ini
```
root@B-70-3:~# grep -v -e ^# -e ^$ /etc/neutron/plugins/ml2/openvswitch_agent.ini
[ovs]
local_ip = 192.168.70.3
tenant_network_type = vxlan
enable_tunneling = True
tunnel_type = vxlan
bridge_mappings=external:br-ex
[agent]
tunnel_types = vxlan
l2_population = True
prevent_arp_spoofing = True
[securitygroup]
enable_security_group = True
enable_ipset = True
firewall_driver = neutron.agent.linux.iptables_firewall.OVSHybridIptablesFirewallDriver
```  

###### l3_agent.ini  
```
root@B-70-3:~# grep -v -e ^# -e ^$ /etc/neutron/l3_agent.ini
[DEFAULT]
verbose = True
interface_driver = neutron.agent.linux.interface.OVSInterfaceDriver
use_namespaces = True
external_network_bridge =
[AGENT]
```  

###### dhcp_agent.ini
```
root@B-70-3:~# grep -v -e ^# -e ^$ /etc/neutron/dhcp_agent.ini
[DEFAULT]
verbose = True
interface_driver = neutron.agent.linux.interface.OVSInterfaceDriver
dhcp_driver = neutron.agent.linux.dhcp.Dnsmasq
enable_isolated_metadata = True
dnsmasq_config_file = /etc/neutron/dnsmasq-neutron.conf
[AGENT]
```  

###### netadata_agent.ini  
```
root@B-70-3:~# grep -v -e ^# -e ^$ /etc/neutron/metadata_agent.ini
[DEFAULT]
auth_uri = http://B-70-2:5000
auth_url = http://B-70-2:35357
auth_region = RegionOne
auth_plugin = password
project_domain_id = default
user_domain_id = default
project_name = service
username = neutron
password = neutron
nova_metadata_ip = B-70-2
metadata_proxy_shared_secret = METADATA_SECRET
verbose = True
[AGENT]
```  


#### 计算节点  

###### ml2_conf.ini  
```
root@B-17-4:~# grep -v -e ^# -e ^$ /etc/neutron/plugins/ml2/ml2_conf.ini
[ml2]
type_drivers = vxlan, flat, gre, vlan
tenant_network_types = vxlan
mechanism_drivers = openvswitch, l2population
extension_drivers = port_security
[ml2_type_flat]
[ml2_type_vlan]
[ml2_type_vxlan]
vni_ranges = 10:10000
[ml2_type_gre]
```  

###### openvswitch_agent.ini
```
root@B-17-4:~# grep -v -e ^# -e ^$ /etc/neutron/plugins/ml2/openvswitch_agent.ini
[ovs]
local_ip = 192.168.70.4
tenant_network_type = vxlan
enable_tunneling = True
tunnel_type = vxlan
[agent]
l2_population = True
tunnel_types = vxlan
prevent_arp_spoofing = True
[securitygroup]
enable_security_group = True
enable_ipset = True
firewall_driver = neutron.agent.linux.iptables_firewall.OVSHybridIptablesFirewallDriver
```  


## 初始化数据  
配置完成后，建议重新生成数据库和 br-int、br-ex等配置

#### 初始化数据库  
```bash
su -s /bin/sh -c "neutron-db-manage --config-file /etc/neutron/neutron.conf \
  --config-file /etc/neutron/plugins/ml2/ml2_conf.ini upgrade head" neutron
```  

#### 添加网桥  
```
ovs-vsctl add-br br-ex
ovs-vsctl add-port br-ex eth3
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

## 总结  
配置修改遇到两个比较严重并且比较2B的问题:

- 控制节点neutron.conf配置文件忘记加 keystone相关配置，导致创建虚拟机的时候ERROR，日志提示认证未通过。
- 设置ext-net时，网关写错了，各种抓包和排查配置文件，都没有问题，随后加了各种无用配置也不好用。
