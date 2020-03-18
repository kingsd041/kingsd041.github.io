---
layout:     post
title:      K3s配置私有registry
subtitle:   使用只签名证书
date:       2020-3-18 21:06:00 +0800
author:     Ksd
header-img: img/post-bg-rancher-k8s.png
catalog: true
tags:
    - rancher
    - K3S
    - Kubernetes
---
> 参考：
> [K3S private registry](https://rancher.com/docs/k3s/latest/en/installation/private-registry/#with-tls)



## 说明

## registry 启动tls
本例使用只签名证书启动registry，大概的流程是先创建证书，然后启动registry将生成的证书配置到registry中

#### 生成证书
```
#!/bin/bash -e


# * 为必改项
# * 服务器FQDN或颁发者名(更换为你自己的域名)，没有就写localhost
CN='local-registry.kingsd.top'


# 扩展信任IP或域名


## 一般ssl证书只信任域名的访问请求，有时候需要使用ip去访问server，那么需要给ssl证书添加扩展IP，用逗号隔开。
SSL_IP='192.168.99.211,192.168.99.212,192.168.99.203'
SSL_DNS=''


# 国家名(2个字母的代号)
C=CN


# 证书加密位数
SSL_SIZE=2048


# 证书有效期
DATE=${DATE:-3650}


# 配置文件
SSL_CONFIG='openssl.cnf'


if [[ -z $SILENT ]]; then
echo "----------------------------"
echo "| SSL Cert Generator |"
echo "----------------------------"
echo
fi


export CA_KEY=${CA_KEY-"cakey.pem"}
export CA_CERT=${CA_CERT-"cacerts.pem"}
export CA_SUBJECT=ca-$CN
export CA_EXPIRE=${DATE}


export SSL_CONFIG=${SSL_CONFIG}
export SSL_KEY=$CN.key
export SSL_CSR=$CN.csr
export SSL_CERT=$CN.crt
export SSL_EXPIRE=${DATE}


export SSL_SUBJECT=${CN}
export SSL_DNS=${SSL_DNS}
export SSL_IP=${SSL_IP}


export K8S_SECRET_COMBINE_CA=${K8S_SECRET_COMBINE_CA:-'true'}


[[ -z $SILENT ]] && echo "--> Certificate Authority"


if [[ -e ./${CA_KEY} ]]; then
    [[ -z $SILENT ]] && echo "====> Using existing CA Key ${CA_KEY}"
else
    [[ -z $SILENT ]] && echo "====> Generating new CA key ${CA_KEY}"
    openssl genrsa -out ${CA_KEY} ${SSL_SIZE} > /dev/null
fi


if [[ -e ./${CA_CERT} ]]; then
    [[ -z $SILENT ]] && echo "====> Using existing CA Certificate ${CA_CERT}"
else
    [[ -z $SILENT ]] && echo "====> Generating new CA Certificate ${CA_CERT}"
    openssl req -x509 -sha256 -new -nodes -key ${CA_KEY} -days ${CA_EXPIRE} -out ${CA_CERT} -subj "/CN=${CA_SUBJECT}" > /dev/null || exit 1
fi


echo "====> Generating new config file ${SSL_CONFIG}"
cat > ${SSL_CONFIG} <<EOM
[req]
req_extensions = v3_req
distinguished_name = req_distinguished_name
[req_distinguished_name]
[ v3_req ]
basicConstraints = CA:FALSE
keyUsage = nonRepudiation, digitalSignature, keyEncipherment
extendedKeyUsage = clientAuth, serverAuth
EOM


if [[ -n ${SSL_DNS} || -n ${SSL_IP} ]]; then
    cat >> ${SSL_CONFIG} <<EOM
subjectAltName = @alt_names
[alt_names]
EOM
    IFS=","
    dns=(${SSL_DNS})
    dns+=(${SSL_SUBJECT})
    for i in "${!dns[@]}"; do
      echo DNS.$((i+1)) = ${dns[$i]} >> ${SSL_CONFIG}
    done


    if [[ -n ${SSL_IP} ]]; then
        ip=(${SSL_IP})
        for i in "${!ip[@]}"; do
          echo IP.$((i+1)) = ${ip[$i]} >> ${SSL_CONFIG}
        done
    fi
fi


[[ -z $SILENT ]] && echo "====> Generating new SSL KEY ${SSL_KEY}"
openssl genrsa -out ${SSL_KEY} ${SSL_SIZE} > /dev/null || exit 1


[[ -z $SILENT ]] && echo "====> Generating new SSL CSR ${SSL_CSR}"
openssl req -sha256 -new -key ${SSL_KEY} -out ${SSL_CSR} -subj "/CN=${SSL_SUBJECT}" -config ${SSL_CONFIG} > /dev/null || exit 1


[[ -z $SILENT ]] && echo "====> Generating new SSL CERT ${SSL_CERT}"
openssl x509 -sha256 -req -in ${SSL_CSR} -CA ${CA_CERT} -CAkey ${CA_KEY} -CAcreateserial -out ${SSL_CERT} \
    -days ${SSL_EXPIRE} -extensions v3_req -extfile ${SSL_CONFIG} > /dev/null || exit 1


if [[ -z $SILENT ]]; then
echo "====> Complete"
echo "keys can be found in volume mapped to $(pwd)"
echo
echo "====> Output results as YAML"
echo "---"
echo "ca_key: |"
cat $CA_KEY | sed 's/^/  /'
echo
echo "ca_cert: |"
cat $CA_CERT | sed 's/^/  /'
echo
echo "ssl_key: |"
cat $SSL_KEY | sed 's/^/  /'
echo
echo "ssl_csr: |"
cat $SSL_CSR | sed 's/^/  /'
echo
echo "ssl_cert: |"
cat $SSL_CERT | sed 's/^/  /'
echo
fi


if [[ -n $K8S_SECRET_NAME ]]; then


  if [[ -n $K8S_SECRET_COMBINE_CA ]]; then
    [[ -z $SILENT ]] && echo "====> Adding CA to Cert file"
    cat ${CA_CERT} >> ${SSL_CERT}
  fi


  [[ -z $SILENT ]] && echo "====> Creating Kubernetes secret: $K8S_SECRET_NAME"
  kubectl delete secret $K8S_SECRET_NAME --ignore-not-found


  if [[ -n $K8S_SECRET_SEPARATE_CA ]]; then
    kubectl create secret generic \
    $K8S_SECRET_NAME \
    --from-file="tls.crt=${SSL_CERT}" \
    --from-file="tls.key=${SSL_KEY}" \
    --from-file="ca.crt=${CA_CERT}"
  else
    kubectl create secret tls \
    $K8S_SECRET_NAME \
    --cert=${SSL_CERT} \
    --key=${SSL_KEY}
  fi


  if [[ -n $K8S_SECRET_LABELS ]]; then
    [[ -z $SILENT ]] && echo "====> Labeling Kubernetes secret"
    IFS=$' \n\t' # We have to reset IFS or label secret will misbehave on some systems
    kubectl label secret \
      $K8S_SECRET_NAME \
      $K8S_SECRET_LABELS
  fi
fi


echo "4. 重命名服务证书"
mv ${CN}.key tls.key
mv ${CN}.crt tls.crt
```

以上命令会生成一系列的证书，但我们主要使用`tls.crt`和`tls.key`

#### 启动registry
```
docker run -d \
  --restart=always \
  --name registry \
  -v /root/certs:/certs \
  -e REGISTRY_HTTP_ADDR=0.0.0.0:443 \
  -e REGISTRY_HTTP_TLS_CERTIFICATE=/certs/tls.crt \
  -e REGISTRY_HTTP_TLS_KEY=/certs/tls.key \
  -p 443:443 \
  registry:2
``` 

这样就启动了一个带有只签名的registry了

接下来我们可以在本机上测试下registry是否可用

首先需要在registry所在的机器上设置 `insecure-registries`
```
# cat /etc/docker/daemon.json
{
  "insecure-registries": ["192.168.99.203"]
}

# systemctl daemon-reload && systemctl restart docker
```

然后就可以将本地的image上传到registry当中
```
# docker tag nginx 192.168.99.203/nginx
# docker push 192.168.99.203/nginx
```

## 设置k3s启用Private Registry

```
# cat /etc/rancher/k3s/registries.yaml
mirrors:
  "192.168.99.203":
    endpoint:
      - "https://192.168.99.203"
configs:
  "192.168.99.203":
    tls:
      cert_file: /root/certs/tls.crt
      key_file: /root/certs/tls.key
      ca_file: /root/certs/cacerts.pem
```
`cert_file` `key_file` `ca_file` 所需的证书文件，到对应的证书文件中找吧，上面提到的生成证书的脚本中就有，名字都不需要改。

接下来就是启动k3s了，启动后，k3s会自动修改containerd的参数
```
# cat /var/lib/rancher/k3s/agent/etc/containerd/config.toml

[plugins.cri.registry.mirrors]

[plugins.cri.registry.mirrors."192.168.99.203"]
  endpoint = ["https://192.168.99.203"]
  
[plugins.cri.registry.configs."192.168.99.203".tls]
  ca_file = "/root/certs/cacerts.pem"
  cert_file = "/root/certs/tls.crt"
  key_file = "/root/certs/tls.key"
```

因为containerd对应的registry的参数已经修改，所以我们可以使用`crictl`去pull image 测试
```
# crictl pull 192.168.99.203/nginx
```
不出意外，image会成功的pull到本机

接下来就可以使用k3s测试了
```
# kubectl run nginx-registry --image=192.168.99.203/nginx --replicas=5
# kubectl get pods -o wide
NAME                              READY   STATUS             RESTARTS   AGE   IP           NODE   NOMINATED NODE   READINESS GATES
nginx-registry-5fd8898b7d-nxcjq   1/1     Running            0          12s   10.42.0.33   k3s1   <none>           <none>
nginx-registry-5fd8898b7d-kcz97   1/1     Running            0          12s   10.42.0.34   k3s1   <none>           <none>
nginx-registry-5fd8898b7d-nmx7j   0/1     ErrImagePull       0          12s   10.42.1.25   k3s2   <none>           <none>
nginx-registry-5fd8898b7d-qhgp5   0/1     ErrImagePull       0          12s   10.42.1.26   k3s2   <none>           <none>
nginx-registry-5fd8898b7d-5h4gj   0/1     ImagePullBackOff   0          12s   10.42.1.24   k3s2   <none>           <none>
```

上面的操作有几个pod的镜像没拉下来，不要慌，是因为我在k3s2上没有配置 private registry

## 遗留问题
之前是想使用域名连接registry的，因为没办法在根域上做解析，所以在/etc/hosts文件中做的解析，但pull镜像的时候失败了
```
# k3s crictl pull local-registry.kingsd.top/nginx
FATA[2020-03-18T14:23:19.312049117Z] pulling image failed: rpc error: code = Unknown desc = failed to pull and unpack image "local-registry.kingsd.top/nginx:latest": failed to resolve reference "local-registry.kingsd.top/nginx:latest": failed to do request: Head https://local-registry.kingsd.top/v2/nginx/manifests/latest: EOF

# ping local-registry.kingsd.top
PING local-registry.kingsd.top (192.168.99.203) 56(84) bytes of data.
64 bytes from local-registry.kingsd.top (192.168.99.203): icmp_seq=1 ttl=64 time=0.324 ms
^C
--- local-registry.kingsd.top ping statistics ---
1 packets transmitted, 1 received, 0% packet loss, time 0ms
rtt min/avg/max/mdev = 0.324/0.324/0.324/0.000 ms

```

不清楚为什么，有时间的时候再看吧