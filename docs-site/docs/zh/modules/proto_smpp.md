---
title: "proto_smpp 模块"
description: "该模块提供 SIP 与 SMPP（Short Message Peer-to-Peer）协议之间的互通能力。"
---

## 管理员指南 {#admin-guide}


### 概述 {#overview}


该模块提供 SIP 与 SMPP
（Short Message Peer-to-Peer）协议之间的互通能力。它提供了
在两种协议之间构建消息网关/桥接的手段，
能够对两个方向的消息进行转换。


- SIP 到 SMPP - 来自 SIP 的消息可以被转换为
SMPP PDU（Protocol Data Unit，协议数据单元）消息，并进一步发送到
SMSC（Short Message Service Center，短消息服务中心）。
- SMPP 到 SIP - 该模块可以作为 ESME（External Short
Messaging Entity，外部短消息实体）运行，从 SMSC 接收消息并把
它们转换为 SIP 消息，进一步发送给 SIP 代理。


该模块与
[SMPP v3.4](http://opensmpp.org/specs/SMPP_v3_4_Issue1_2.pdf) 规范兼容。


### SIP 到 SMPP 的桥接 {#sip-to-smpp-bridging}


要把 SIP 消息转换为 SMPP，你只需
调用 [send_smpp_message()](#send_smpp_messagesmsc_name-fromtobodyutf-16delivery_receipt) 函数，
并指明要把消息发送到的 SMSc。模块
将根据数据库中配置的参数
构建 PDU。


### SMPP 到 SIP 的桥接 {#smpp-to-sip-bridging}


桥接通过 SMPP 接口收到的消息时，
OpenSIPS 会构建一条 SIP 消息，并把它发送到由
[outbound_uri](#outbound_uri-string)
模块参数指定的出站代理。


### SMSC 绑定 {#smsc-binding}


为了能够向 SMSc 投递消息，ESME 需要
先绑定到 SMSc。这会在 OpenSIPS 启动时通过发送
SMPP *bind_transceiver* 命令连接到 SMSc，
或发送 *outbind* 命令通知 SMSc 现在可以绑定到我们的网关
来完成。


所有 SMSc 服务器的描述都在数据库中配置。
对每个服务器，可以配置以下信息：


- *Name* - 赋予该 SMSc 的唯一名称，
用于在 OpenSIPS 脚本中引用该 SMSc。
- *IP* - SMSc 监听新绑定/连接所用的 IP。
- *Port* - SMSc 监听新绑定/连接所用的 TCP 端口。
- *System ID* - 也称为用于向 SMSc 鉴权的
用户名。
- *Password* - 用于向 SMSc 鉴权的口令。
- *System Type* - 通常为
"SMPP"，某些 SMPP 供应商要求该字段。
- *Source Type of Number (TON)* - 指定用于发送消息的
号码格式。一些常见取值有：

				*0* - Unknown
				*1* - International
				*2* - National
				*3* - Network Specific
				*4* - Subscriber Number
				*5* - Alphanumeric
				*6* - Abbreviated

			默认值为 *0 - Unknown*。
- *Source Number Plan Indicator (NPI)* - 指定
用于发送消息的号码的编号方案。一些常见取值有：

	- *0* - Unknown
	- *1* - ISDN/telephone numbering plan (E163/E164)
	- *3* - Data numbering plan (X.121)
	- *4* - Telex numbering plan (F.69)
	- *6* - Land Mobile (E.212)
	- *8* - National numbering plan
	- *9* - Private numbering plan
	- *10* - ERMES numbering plan (ETSI DE/PS 3 01-3)
	- *13* - Internet (IP)
	- *18* - WAP Client Id (to be defined by WAP Forum)

	*默认值为 0 - Unknown。*
- *Destination Type of Number (TON)* - 指定用于发送消息的
号码格式。取值可与
*Source Type of Number (TON)* 相同，默认值为 *0 -
Unknown*。
- *Destination Number Plan Indicator (NPI)* -
指定用于发送消息的号码的编号方案。取值可与
*Source Number Plan Indicator (NPI)* 相同，
*默认值为 0 - Unknown*。
- *Session Type* - 指定连接 SMSc 时应使用
哪种会话类型。可选值有：
	- *1* - Transceiver
	- *2* - Transmitter
	- *3* - Receiver
	- *4* - Outbind

	*默认值为 1 - Transceiver*。


OpenSIPS 启动时会从数据库读取所有 SMSc 规格，
并与它们发起绑定。*注意：*
暂不支持重载 SMSc 数据库，但已在开发中。


每条 SMPP 连接都会被定期 ping（目前每 5 秒一次），
使用 *enquire_link* SMPP 命令来保持
连接活跃。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


使用该模块前必须先加载以下模块：


- *database* -- 任意数据库模块


#### 外部库的依赖 {#dependencies-of-external-libraries}


- *无*。


### 导出的参数 {#exported-parameters}


所有这些参数都可以在 opensips.cfg 文件中使用，
以配置 OpenSIPS-SMPP 网关的行为。


#### db_url (string)


用于存储 SMPP 连接的数据库句柄。该参数为必填。


*默认值为未设置。*


```opensips title="设置 db_url 参数"
...
modparam("proto_smpp", "db_url", "dbdriver://username:password@dbhost/dbname")
...
```


#### smpp_port (integer)


用于修改 SMPP 端口（用于监听新连接）的默认值。


*默认值为 2775。*


```opensips title="设置 smpp_port 变量"
...
modparam("proto_smpp", "smpp_port", 27775)
...
		
```


#### smpp_max_msg_chunks (integer)


一条 SMPP 消息通过 TCP 到达时预期被拆分成的最大块数。
如果收到的报文分片超过该值，
连接将被断开（要么是连接负载过重导致高度碎片化 - 要么是我们
正遭受攻击，攻击者发送高度碎片化的流量以降低服务器性能）。


*默认值为 8。*


```opensips title="设置 smpp_max_msg_chunks 参数"
...
modparam("proto_smpp", "smpp_max_msg_chunks", 32)
...
```


#### smpp_send_timeout (integer)


以毫秒为单位的时间，如果 TCP 连接在该时间间隔内无法用于
阻塞写（而 OpenSIPS 又想在其上发送数据），
该连接将被关闭。


*默认值为 100 ms。*


```opensips title="设置 smpp_send_timeout 参数"
...
modparam("proto_smpp", "smpp_send_timeout", 200)
...
```


#### outbound_uri (string) {#outbound_uri-string}


该参数表示用于发送由 SMPP 转换为 SIP 的消息的
出站代理 URI。


*默认值为 None。*


```opensips title="设置 outbound_uri 参数"
...
modparam("proto_smpp", "outbound_uri", "sip:127.0.0.1:5060")
...
```


#### smpp_table (string)


包含用于连接的 SMSc 服务器定义的
数据库表名。


*默认值为 "smpp"。*


```opensips title="设置 smpp_table 参数"
...
modparam("proto_smpp", "smpp_table", "smsc")
...
```


#### name_col (string)


存放 *send_smpp_message()* 函数所使用的 SMSc 标识符的
列名。


*默认值为 "name"。*


```opensips title="设置 name_col 参数"
...
modparam("proto_smpp", "name_col", "smsc_name")
...
```


#### ip_col (string)


存放 SMSc 的 IP 的列名。


*默认值为 "ip"。*


```opensips title="设置 ip_col 参数"
...
modparam("proto_smpp", "ip_col", "smsc_ip")
...
```


#### port_col (string)


存放 SMSc 端口的列名。


*默认值为 "port"。*


```opensips title="设置 port_col 参数"
...
modparam("proto_smpp", "port_col", "smsc_port")
...
```


#### system_id_col (string)


存放 SMSc System ID 的列名。


*默认值为 "system_id"。*


```opensips title="设置 system_id_col 参数"
...
modparam("proto_smpp", "system_id_col", "smsc_system_id")
...
```


#### password_col (string)


用于向 SMSc 鉴权的口令列的名称。


*默认值为 "password"。*


```opensips title="设置 password_col 参数"
...
modparam("proto_smpp", "password_col", "smsc_password")
...
```


#### system_type_col (string)


用于绑定 SMSc 的 System Type 列的名称。


*默认值为 "system_type"。*


```opensips title="设置 system_type_col 参数"
...
modparam("proto_smpp", "system_type_col", "smsc_system_type")
...
```


#### src_ton_col (string)


存放 Source TON 值的列名。


*默认值为 "src_ton"。*


```opensips title="设置 src_ton_col 参数"
...
modparam("proto_smpp", "src_ton_col", "smsc_src_ton")
...
```


#### src_npi_col (string)


存放 Source NPI 值的列名。


*默认值为 "src_npi"。*


```opensips title="设置 src_npi_col 参数"
...
modparam("proto_smpp", "src_npi_col", "smsc_src_npi")
...
```


#### dst_ton_col (string)


存放 Destination TON 值的列名。


*默认值为 "dst_ton"。*


```opensips title="设置 dst_ton_col 参数"
...
modparam("proto_smpp", "dst_ton_col", "smsc_dst_ton")
...
```


#### dst_npi_col (string)


存放 Destination NPI 值的列名。


*默认值为 "dst_npi"。*


```opensips title="设置 dst_npi_col 参数"
...
modparam("proto_smpp", "dst_npi_col", "smsc_dst_npi")
...
```


#### session_type_col (string)


存放 SMSc 的 Session Type 的列名。


*默认值为 "session_type"。*


```opensips title="设置 session_type_col 参数"
...
modparam("proto_smpp", "session_type_col", "smsc_session_type")
...
```


### 导出的函数 {#exported-functions}


#### send_smpp_message(smsc_name, [from],[to],[body],[utf-16],[delivery_receipt]) {#send_smpp_messagesmsc_name-fromtobodyutf-16delivery_receipt}


该函数用于把 OpenSIPS 脚本中收到的 SIP 消息转换为 SMPP PDU，
并发送到作为参数传入的
*smsc_name (string)*。用于构造 PDU 的 SMPP 参数在数据库中
配置，发送的命令是
*submit_sm* 或 *deliver_sm*，
取决于 SMSc 的类型。


如果消息应发送到的 SMSc 在数据库中不存在，函数返回 *-2*；
如果发生内部错误，返回 *-1*；
成功时返回正值。


各参数含义如下：


- *sms_name (string)* - 用于发送 SMPP 流量的 SMS
名称。
- *from (string, optional)* - 源号码。
若缺失，则使用 SIP 消息的 from 用户名。
- *to (string, optional)* - 目的号码。
若缺失，则使用 SIP 请求 URI 的用户名。
- *body (string, optional)* - SMS 的消息体。
若缺失，则使用 SIP 消息体。
- *UTF-16 (int, optional)* - 如果消息体为 UTF-16
格式，则设为 *1*。若缺失或为 *0*，则使用 UTF-8。
- *delivery_receipt (int, optional)* - SMSC 是否
应为该 SMS 确认投递


该函数可在 REQUEST_ROUTE、FAILURE_ROUTE
或 BRANCH_ROUTE 中使用。


```opensips title="send_smpp_message() 用法"
...
if (is_method("MESSAGE"))
	send_smpp_message("MY_SMSC");
...
```
<!-- CONTRIBUTORS -->

### 许可证 {#license}

所有文档文件（即 .md 扩展名）均按 Creative Common License 4.0 许可
