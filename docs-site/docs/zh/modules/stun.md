---
title: "STUN 模块 (stun)"
description: "本模块在 OpenSIPS 内部实现 STUN 服务器，使其与 SIP 共用端口，以便为位于 NAT 之后的客户端提供准确的外部地址信息。"
---


## 管理员指南 {#admin-guide}


### 概述 {#overview}


#### 思路 {#the-idea}


让 STUN 服务器与 SIP 使用同一端口（5060），以获得准确的信息。其好处在于：当 NAT 针对不同目的端口做出不同的地址转换时，仍能获得准确的外部地址。该服务器还可以对外宣告与其实际监听地址不同的网络地址。


#### 基本运行方式 {#basic-operation}


STUN 服务器会使用 4 个套接字：


- socket1 = ip1 : port1
- socket2 = ip1 : port2
- socket3 = ip2 : port1
- socket4 = ip2 : port2


其中 *ip1* / *port1* 代表一个 UDP SIP 监听地址，*ip2* / *port2* 则通过
[alternate_ip](#alternate_ip-str) 和
[alternate_port](#alternate_port-str)
参数配置。


这些套接字取自既有的 SIP 套接字，或由本模块创建。


Socket1 必须始终是 OpenSIPS 的一个 SIP UDP 监听地址。


如果启用了 [use_listeners_as_primary](#use_listeners_as_primary-int)，
STUN 服务器实际会使用由上述 IP/port 组合得到的多组套接字，每组对应
OpenSIPS 的一个 SIP UDP 监听地址。


服务器会创建一个独立进程。
该进程在已创建的套接字上监听数据。
服务器会向 SIP 注册一个回调函数，
当发现特定的 (stun) 头域时就会调用该函数。


#### 支持的 STUN 属性 {#supported-stun-attributes}


本 STUN 实现支持 RFC3489（以及 RFC5389 中的
XOR_MAPPED_ADDRESS）


- MAPPED_ADDRESS
- RESPONSE_ADDRESS
- CHANGE_REQUEST
- SOURCE_ADDRESS
- CHANGED_ADDRESS
- ERROR_CODE
- UNKNOWN_ATTRIBUTES
- REFLECTED_FROM
- XOR_MAPPED_ADDRESS


不支持的属性：


- USERNAME
- PASSWORD
- MESSAGE_INTEGRITY


以及与之关联的 ERROR_CODE


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


使用本模块前必须先加载以下模块：


*无*。


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，必须先安装以下库或应用程序：


- *无*。


### 导出的参数 {#exported-parameters}


#### primary_ip (str) {#primary_ip-str}


某个接口的 IP，该接口已在 OpenSIPS 中配置为 UDP SIP 监听地址。这是必填参数，
除非启用了
[use_listeners_as_primary](#use_listeners_as_primary-int)。


语法: "ip [/ advertised_ip]


默认情况下，*primary_ip* 与对外宣告的
*primary_ip* 相同。
可通过可选的 "/ xxx.xxx.xxx.xxx" 字符串更改。


```opensips title="设置 primary_ip 参数"
...
modparam("stun", "primary_ip", "192.168.0.100")

# 位于 NAT 之后的 OpenSIPS 内置 STUN 服务器示例
modparam("stun", "primary_ip", "192.168.0.100 / 64.50.46.78")
...
```
				

#### primary_port (str) {#primary_port-str}


在 OpenSIPS 中与 *primary_ip* 一起配置为 UDP SIP
监听地址的端口。默认值为 5060。


语法: "port [/ advertised_port]


默认情况下，*primary_port* 与对外宣告的
*primary_port* 相同。
可通过可选的 "/ adv_port" 字符串更改。


```opensips title="设置 primary_port 参数"
...
modparam("stun", "primary_port", "5060")

# 监听主端口，但对外宣告另一个端口
modparam("stun", "primary_port", "5060 / 5062")
...
```
				


#### alternate_ip (str) {#alternate_ip-str}


来自另一个接口的另一个 IP。这是必填参数。


如果启用了 [use_listeners_as_primary](#use_listeners_as_primary-int)，则
alternate IP 必须满足以下之一：


- 是 OpenSIPS 中已配置的某个 UDP SIP 监听地址的 IP，
但该 IP 与所有其他 UDP 监听地址的 IP 都不同；
- 与 OpenSIPS 中已配置的所有 UDP SIP 监听地址的 IP 都不同。


语法: "ip [/ advertised_ip]


默认情况下，*alternate_ip* 与对外宣告的
*alternate_ip* 相同。
可通过可选的 "/ xxx.xxx.xxx.xxx" 字符串更改。


```opensips title="设置 alternate_ip 参数"
...
modparam("stun","alternate_ip","11.22.33.44")

# 位于 NAT 之后的 OpenSIPS 内置 STUN 服务器示例
modparam("stun", "alternate_ip", "192.168.0.100 / 64.78.46.50")
...
```
				


#### alternate_port (str) {#alternate_port-str}


STUN 服务器用于第二个接口的端口。
默认值为 3478（STUN 默认端口）。


如果启用了 [use_listeners_as_primary](#use_listeners_as_primary-int)，则
alternate 端口必须满足以下之一：


- 是 OpenSIPS 中已配置的某个 UDP SIP 监听地址的端口，
但该端口与所有其他 UDP 监听地址的端口都不同；
- 与 OpenSIPS 中已配置的所有 UDP SIP 监听地址的端口都不同。


语法: "port [/ advertised_port]


默认情况下，*alternate_port* 与对外宣告的
*alternate_port* 相同。
可通过可选的 "/ adv_port" 字符串更改。


```opensips title="设置 alternate_port 参数"
...
modparam("stun","alternate_port","3479")

# 监听 alternate 端口，但对外宣告另一个端口
modparam("stun", "alternate_port", "5060 / 5062")
...
```
				


#### use_listeners_as_primary (int) {#use_listeners_as_primary-int}


将该参数设为 *1*，即可让所有已配置的 UDP SIP 监听地址自动用作
“primary” STUN 套接字。


启用该行为时，[primary_ip](#primary_ip-str) 与
[primary_port](#primary_port-str)
参数将被忽略。


默认值为 *0*（禁用）。


```opensips title="设置 use_listeners_as_primary 参数"
...
modparam("stun","use_listeners_as_primary",1)
...
```
				
<!-- CONTRIBUTORS -->

### 许可 {#license}

所有文档文件（即 .md 扩展名的文件）均以 Creative Common License 4.0 授权。
