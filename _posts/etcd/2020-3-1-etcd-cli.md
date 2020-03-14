---
layout:     post
title:      Etcd常用命令
subtitle:   etcd
date:       2020-3-1 15:06:00 +0800
author:     Ksd
header-img: img/post-bg-unix-linux.jpg
catalog: true
tags:
    - Etcd
---



## 安装
#### Static
- node1: 192.168.99.201
```
etcd --name infra0 --initial-advertise-peer-urls http://192.168.99.201:2380 \
  --listen-peer-urls http://192.168.99.201:2380 \
  --listen-client-urls http://192.168.99.201:2379,http://127.0.0.1:2379 \
  --advertise-client-urls http://192.168.99.201:2379 \
  --initial-cluster-token etcd-cluster-1 \
  --initial-cluster infra0=http://192.168.99.201:2380,infra1=http://192.168.99.202:2380,infra2=http://192.168.99.203:2380 \
  --initial-cluster-state new
```
- node2: 192.168.99.202
```
etcd --name infra1 --initial-advertise-peer-urls http://192.168.99.202:2380 \
  --listen-peer-urls http://192.168.99.202:2380 \
  --listen-client-urls http://192.168.99.202:2379,http://127.0.0.1:2379 \
  --advertise-client-urls http://192.168.99.202:2379 \
  --initial-cluster-token etcd-cluster-1 \
  --initial-cluster infra0=http://192.168.99.201:2380,infra1=http://192.168.99.202:2380,infra2=http://192.168.99.203:2380 \
  --initial-cluster-state new
```
- node3: node2: 192.168.99.203
```
etcd --name infra2 --initial-advertise-peer-urls http://192.168.99.203:2380 \
  --listen-peer-urls http://192.168.99.203:2380 \
  --listen-client-urls http://192.168.99.203:2379,http://127.0.0.1:2379 \
  --advertise-client-urls http://192.168.99.203:2379 \
  --initial-cluster-token etcd-cluster-1 \
  --initial-cluster infra0=http://192.168.99.201:2380,infra1=http://192.168.99.202:2380,infra2=http://192.168.99.203:2380 \
  --initial-cluster-state new
```

## Etcd 常用参数
 

| 参数 | 使用说明 |
| --- | --- |
| --name etcd0	 |本member的名字 |
| --initial-advertise-peer-urls http://192.168.2.55:2380 | 其他member使用，其他member通过该地址与本member交互信息。一定要保证从其他member能可访问该地址。静态配置方式下，该参数的value一定要同时在--initial-cluster参数中存在。memberID的生成受--initial-cluster-token和--initial-advertise-peer-urls影响 |
| --listen-peer-urls  http://0.0.0.0:2380 | 本member侧使用，用于监听其他member发送信息的地址。ip为全0代表监听本member侧所有接口 |
| --listen-client-urls http://0.0.0.0:2379 | 本member侧使用，用于监听etcd客户发送信息的地址。ip为全0代表监听本member侧所有接口 |
| --advertise-client-urls http://192.168.2.55:2379 | etcd客户使用，客户通过该地址与本member交互信息。一定要保证从客户侧能可访问该地址 |
| --initial-cluster-token etcd-cluster-2 | 用于区分不同集群。本地如有多个集群要设为不同 |
| --initial-cluster etcd0=http://192.168.2.55:2380,etcd1=http://192.168.2.54:2380,etcd2=http://192.168.2.56:2380 | 本member侧使用。描述集群中所有节点的信息，本member根据此信息去联系其他member。memberID的生成受--initial-cluster-token和--initial-advertise-peer-urls影响|
| --initial-cluster-state new | 用于指示本次是否为新建集群。有两个取值new和existing。如果填为existing，则该member启动时会尝试与其他member交互。集群初次建立时，要填为new，经尝试最后一个节点填existing也正常，其他节点不能填为existing。集群运行过程中，一个member故障后恢复时填为existing，经尝试填为new也正常 |
| -data-dir | 指定节点的数据存储目录，这些数据包括节点ID，集群ID，集群初始化配置，Snapshot文件，若未指定-wal-dir，还会存储WAL文件；如果不指定会用缺省目录 |
| discovery http://192.168.1.163:20003/v2/keys/discovery/78b12ad7-2c1d-40db-9416-3727baf686cb | 用于自发现模式下，指定第三方etcd上key地址，要建立的集群各member都会向其注册自己的地址 |


## etcdctl 常用命令
- 指定etcd集群

```
HOST_1=192.168.99.201
HOST_2=192.168.99.202
HOST_3=192.168.99.203
ENDPOINTS=$HOST_1:2379,$HOST_2:2379,$HOST_3:2379
```
- 增加

```
# ./etcdctl --endpoints=$ENDPOINTS put foo "Hello World!"
OK
```
- 查

```
# root@rancher1:~/etcd-v3.4.4-linux-amd64# ./etcdctl --endpoints=$ENDPOINTS get foo
foo
Hello World!
```
指定显示格式
```
# ./etcdctl --endpoints=$ENDPOINTS --write-out="json" get foo
{"header":{"cluster_id":18182515703841266493,"member_id":3863268447043884649,"revision":9,"raft_term":11},"kvs":[{"key":"Zm9v","create_revision":9,"mod_revision":9,"version":1,"value":"SGVsbG8gV29ybGQh"}],"count":1}
```
指定前缀查找
```
# etcdctl --endpoints=$ENDPOINTS put web1 value1
OK
# etcdctl --endpoints=$ENDPOINTS put web2 value2
OK
# etcdctl --endpoints=$ENDPOINTS put web3 value3
OK
# etcdctl --endpoints=$ENDPOINTS get web --prefix
web1
value1
web2
value2
web3
value3
```

- 删

```
etcdctl --endpoints=$ENDPOINTS put key myvalue
etcdctl --endpoints=$ENDPOINTS del key

etcdctl --endpoints=$ENDPOINTS put k1 value1
etcdctl --endpoints=$ENDPOINTS put k2 value2
etcdctl --endpoints=$ENDPOINTS del k --prefix
```

- 集群状态

```
# etcdctl --write-out=table --endpoints=$ENDPOINTS endpoint status
+---------------------+------------------+---------+---------+-----------+------------+-----------+------------+--------------------+--------+
|      ENDPOINT       |        ID        | VERSION | DB SIZE | IS LEADER | IS LEARNER | RAFT TERM | RAFT INDEX | RAFT APPLIED INDEX | ERRORS |
+---------------------+------------------+---------+---------+-----------+------------+-----------+------------+--------------------+--------+
| 192.168.99.201:2379 | 359d162f22069669 |   3.4.4 |   20 kB |     false |      false |        11 |         22 |                 22 |        |
| 192.168.99.202:2379 | 2e873c158e99975a |   3.4.4 |   20 kB |      true |      false |        11 |         22 |                 22 |        |
| 192.168.99.203:2379 | 572538f1b89f3496 |   3.4.4 |   20 kB |     false |      false |        11 |         22 |                 22 |        |
+---------------------+------------------+---------+---------+-----------+------------+-----------+------------+--------------------+--------+

# etcdctl --endpoints=$ENDPOINTS endpoint health
192.168.99.203:2379 is healthy: successfully committed proposal: took = 9.729088ms
192.168.99.201:2379 is healthy: successfully committed proposal: took = 9.851376ms
192.168.99.202:2379 is healthy: successfully committed proposal: took = 10.176253ms
```

- 集群成员

```
# etcdctl member list -w table
```

其他相关命令
```
    member add          Adds a member into the cluster
    member remove       Removes a member from the cluster
    member update       Updates a member in the cluster
    member list         Lists all members in the cluster
```

... 未完待续
