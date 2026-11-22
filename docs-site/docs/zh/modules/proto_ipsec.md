---
title: "proto_ipsec 模块"
description: "**proto_ipsec** 模块提供 IPSec 套接字，用于建立安全的通信通道。"
sidebar: false
---


## 管理员指南 {#admin-guide}


### 概述 {#overview}


**proto_ipsec** 模块提供
IPSec 套接字，用于建立安全的通信通道。
它依赖 RFC 3329（Security Mechanism Agreement for the Session
Initiation Protocol (SIP)）来协商建立为每个连接创建动态
安全联盟（Security Association，SA）所必需的 IPSec 参数。


本模块的开发完全遵循 VoLTE
规范（GSMA PRD IR.92），并实现了 TS 33.203
（3G Security: Access Security for IP-based Services）中定义的扩展。


它允许在同一个 IP:port 对上同时创建 UDP 和 TCP 安全连接，
该 IP:port 对被定义为套接字。本质上，当使用 *proto_ipsec*
协议定义一个套接字时，会在指定端口上创建两个新的
内部/隐藏套接字。
例如，定义以下套接字：
```opensips
...
socket=ipsec:127.0.0.1:5100
...
```

在内部，会创建两个不同的套接字：
```opensips
...
socket=udp:127.0.0.1:5100
socket=tcp:127.0.0.1:5100
...
```

通过这些套接字的通信应通过 IPSec 进行，
因此在 RFC 3329 中规定，使用这些监听地址之前应先
建立适当的安全联盟（SA）。


> [!NOTE]
> 这意味着你不能再在配置中
> 定义这些套接字，否则它们将与内部定义的套接字
> 发生重叠。


IPSec 通信要求每个参与方为每个连接至少定义两个
端口：一个用于该实体作为客户端时，另一个
用于它作为服务器时。因此，通常
需要至少定义两个 IPSec 套接字，模块才能
正常工作。


该模块实现了跟踪注册状态的完整逻辑，
它挂接 usrloc 模块并监听联系人变更更新。
它还通过重启后恢复隧道来确保其持久性。


当通过 IPSec 隧道接收到请求时，模块提供
两个变量 [$ipsec](#ipsec) 和
[$ipsec_ue](#ipsec_ue)，用于查看其详细信息。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


在本模块之前必须先加载以下模块：


- *tm* - 用于在请求和应答之间跟踪 IPSec
SA 上下文。
- *usrloc* - 用于识别成功的
注册/注销何时发生。
- *proto_udp* - 用于处理
IPSec UDP 连接操作。
- *proto_tcp* - 用于处理
IPSec TCP 连接操作。


#### 外部库或应用程序 {#external-libraries-or-applications}


在使用本模块运行 OpenSIPS 之前，必须安装以下
库或应用程序：


- *libmnl* - 极简 Netlink 库（Minimalistic Netlink Library），
用于通过 XFRM 内核接口创建 IPSec SA。


### 导出的参数 {#exported-parameters}


#### port (integer)


当 *socket* 全局参数中未指定端口时，使用的
默认 IPSec 端口。


*默认值为 5062。*


```opensips title="设置 port 参数"
...
modparam("proto_ipsec", "port", 5100)
...
```


#### min_spi (integer)


该参数表示安全联盟（SA）SPI 参数的最小值。
它与 *max_spi* 设置共同定义 SPI
范围 *[min_spi, max_spi]*，该范围内的值在系统中
必须唯一。


*默认值为 65536。*


```opensips title="设置 min_spi 参数"
...
modparam("proto_ipsec", "min_spi", 10000)
...
```


#### max_spi (integer)


该参数表示安全联盟（SA）SPI 参数的最大值。
它与 *min_spi* 设置共同定义 SPI
范围 *[min_spi, max_spi]*，该范围内的值在系统中
必须唯一。


*默认值为 262144。*


```opensips title="设置 max_spi 参数"
...
modparam("proto_ipsec", "max_spi", 20000)
...
```


#### temporary_timeout (integer)


设置临时安全联盟在内存中可保存多久（以秒为单位），
直到它被远端端点确认（或使用）。


该超时表示的是从在 401 应答中发送
安全联盟（SA）参数，到用户设备（UE）
通过新的安全通道发送初始消息之间
所经过的时长。


*默认值为 30。*


```opensips title="设置 temporary_timeout 变量"
param("proto_ipsec", "temporary_timeout", 10) # 秒数

			
```


#### default_client_port (integer) {#default_client_port-integer}


当我们在 IPSec 通信中作为客户端时使用的
默认端口值。


*默认值未定义——会使用一个随机套接字，
但它必须与服务器套接字不同。*


```opensips title="设置 default_client_port 参数"
...
modparam("proto_ipsec", "default_client_port", 5100)
...
```


#### default_server_port (integer) {#default_server_port-integer}


当我们在 IPSec 通信中作为服务器时使用的
默认端口值。


*默认值未定义——会使用一个随机套接字，
但它必须与客户端套接字不同。*


```opensips title="设置 default_server_port 参数"
...
modparam("proto_ipsec", "default_server_port", 6100)
...
```


#### allowed_algorithms (string) {#allowed_algorithms-string}


将可用于 IPSec 的鉴权和加密算法
列入白名单。


其格式为：*alg|ealg|alg=ealg*


可以指定多组算法，以逗号分隔。


当前支持的算法有：


- 鉴权算法：
	- hmac-md5-96 - 已被 TS 33.203 V13 废弃
	- hmac-sha-1-96 - TS 33.203 V17 不建议使用
	- aes-gmac
	- null - 只能与 aes-gcm 加密配合使用
- 加密算法：
	- des-ede3-cbc - 不建议使用
	- aes-cbc - TS 33.203 V17 不建议使用
	- aes-gcm
	- null - 不加密


*默认值为 none——这意味着可以使用所有算法。*


```opensips title="设置 allowed_algorithms 参数"
...
modparam("proto_ipsec", "allowed_algorithms", "null")
modparam("proto_ipsec", "allowed_algorithms", "hmac-sha-1-96=null")
modparam("proto_ipsec", "allowed_algorithms", "hmac-sha-1-96=null,aes-gmac=aes-gcm")
...
```


#### disable_deprecated_algorithms (integer)


指示是否应忽略已废弃的算法，
这些算法在 TS 33.203（3G Security: Access Security for
IP-based Services）中定义。目前，这会禁用
以下算法：


- *hmac-md5-96* 和 *hmac-sha-1-96* 鉴权算法
- *des-ede3-cbc* 和 *aes-cbc* 加密算法


*默认值为 false——可以使用所有算法。*


```opensips title="设置 disable_deprecated_algorithms 参数"
...
modparam("proto_ipsec", "disable_deprecated_algorithms", yes)
...
```


### 导出的函数 {#exported-functions}


#### ipsec_create([port_server], [port_client], [algos])


根据在 401 应答中收到的
*Security-Client* 头域和 AKA 信息，
创建一个 IPSec SA/隧道。


该函数只应在针对 REGISTER 消息的 401 应答上调用。


成功创建 IPSec 隧道后，它会构建
*Security-Server* 头域并将其追加到应答中。


各参数的含义如下：


- *port_server（整型，可选）* - IPSec 通信中使用的
服务器端口。它应为一个已存在的 IPSec 端口，
并会在 *Security-Server* 头域中通告。如果缺省，
则考虑使用 [default_client_port](#default_client_port-integer)。
- *port_client（整型，可选）* - IPSec 通信中使用的
客户端端口。它应为一个已存在的 IPSec 端口，
并会在 *Security-Server* 头域中通告。如果缺省，
则考虑使用 [default_server_port](#default_server_port-integer)。
- *algos（字符串，可选）* - 用于创建该安全联盟的
算法列表。其格式与
[allowed_algorithms](#allowed_algorithms-string) 相同，
使用时会覆盖其值。如果缺省，
则考虑使用 [allowed_algorithms](#allowed_algorithms-string)。


该函数可以在 REPLY_ROUTE 中使用。


```opensips title="ipsec_create() 用法"
...
onreply_route[ipsec] {
	if ($T_reply_code == 401)
		if (ipsec_create())
}
...
```


### 导出的伪变量 {#exported-pseudo-variables}


#### $ipsec {#ipsec}


对于通过 IPSec 隧道接收到的请求，
该变量会被填充，其中包含本地 IPSec
端点的信息。


可以获取以下字段：


- *ik* - IPSec 隧道
所使用的完整性密钥。
- *ck* - IPSec 隧道
所使用的机密性密钥。
- *alg* - 所使用的
鉴权算法。
- *ealg* - 所使用的
加密算法。
- *ip* - 为该隧道绑定的
本地 IP。
- *spi-c* - 为通过客户端通道接收消息
而选择的本地 SPI。
- *spi-s* - 为通过服务器通道接收消息
而选择的本地 SPI。
- *port-c* - 为通过客户端通道通信
而选择的本地端口。
- *port-c* - 为通过服务器通道通信
而选择的本地端口。


```opensips title="$ipsec(field) 用法"
...
xlog("Using $ipsec(ip):$ipsec(port-c) and $ipsec(ip):$ipsec(port-s) socket\n");
...
```


#### $ipsec_ue {#ipsec_ue}


对于通过 IPSec 隧道接收到的请求，
该变量会被填充，其中包含远端 IPSec
端点的信息。


可以获取以下字段：


- *ik* - IPSec 隧道
所使用的完整性密钥。
- *ck* - IPSec 隧道
所使用的机密性密钥。
- *alg* - 所使用的
鉴权算法。
- *ealg* - 所使用的
加密算法。
- *ip* - 使用该隧道的
UE 的远端 IP。
- *spi-c* - 为通过客户端通道发送消息
而选择的远端 SPI。
- *spi-s* - 为通过服务器通道发送消息
而选择的远端 SPI。
- *port-c* - 为通过客户端通道通信
而选择的远端端口。
- *port-c* - 为通过服务器通道通信
而选择的远端端口。


```opensips title="$ipsec_ue(field) 用法"
...
xlog("Using $ipsec_ue(ip):$ipsec_ue(port-c) and $ipsec_ue(ip):$ipsec_ue(port-s) socket\n");
...
```
<!-- CONTRIBUTORS -->

### 许可 {#license}

所有文档文件（即 .md 扩展名）均在 Creative Common License 4.0 下授权。
