---
title: "proto_msrp 模块"
description: "**proto_msrp** 模块提供 MSRP 协议栈，即网络读写（明文与 TLS）、消息解析与组装、事务层以及基本信令操作。"
sidebar: false
---


## 管理指南 {#admin-guide}


### 概述 {#overview}


**proto_msrp** 模块提供
MSRP 协议栈，即网络读写（明文与 TLS）、
消息解析与组装、事务层以及基本的
信令操作。


加载后，你就可以在配置文件中通过添加其 IP、可选地还有
监听端口，来在脚本中定义 MSRP 监听地址，
类似下面的示例：
```opensips
...
socket=msrp:127.0.0.1:65432
socket=msrps:127.0.0.1:65431
...
```


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


在本模块之前必须加载以下模块：


- *tls_mgm* - 如果使用 MSRPS（安全）套接字，
则需要加载本模块。通过该模块你可以
管理 SSL 证书


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，必须安装
以下库或应用程序：


- *无*。


### 导出的参数 {#exported-parameters}


#### send_timeout (integer)


如果 MSRP 连接在此时间间隔内不具备阻塞写入条件
（且 OpenSIPS 想要在其上发送数据），则在经过该毫秒数后
连接将被关闭。


*默认值为 100 ms。*


```opensips title="设置 send_timeout 参数"
...
modparam("proto_msrp", "send_timeout", 200)
...
```


#### max_msg_chunks (integer)


一条 SIP 消息经 MSRP 到达时预期分成的最大块数。
如果收到的报文分片程度超过此值，
则连接将被丢弃（要么连接严重过载导致
高度碎片化 - 要么我们正遭受持续攻击，
攻击者为了降低我们的性能而发送
高度碎片化的流量）。


*默认值为 4。*


```opensips title="设置 max_msg_chunks 参数"
...
modparam("proto_msrp", "max_msg_chunks", 8)
...
```


#### tls_handshake_timeout (integer)


设置 SSL 握手序列完成的超时时间（毫秒）。
当连接使用 CPU 密集型加密套件时，
可能需要增大该值，以便有时间生成并
处理密钥。


该超时在接受新连接时（入站）以及
发起新会话的等待期间（出站）生效。


*默认值为 100。*


```opensips title="设置 tls_handshake_timeout 变量"
param("proto_msrp", "tls_handshake_timeout", 200) # 毫秒数			
```


#### cert_check_on_conn_reusage (integer)


该参数用于开启或关闭在复用现有 TLS 连接时
对 TLS 域（SSL 证书）的额外检查/匹配。没有这项额外检查时，
只会检查连接的 IP 和端口（以便复用现有连接）。
使用这项额外检查时，待复用的连接必须具有与
当前信令操作所设置证书相同的 SSL 证书。


该检查仅在通过 TLS 发送 SIP 流量时进行，
并且只针对由 OpenSIPS（作为 TLS 客户端）创建/发起的
连接。任何被接受的连接（作为 TLS 服务器）都会自动匹配
（额外的测试将被跳过）。


*默认值为 0（禁用）。*


```opensips title="设置 cert_check_on_conn_reusage 参数"
...
modparam("proto_msrp", "cert_check_on_conn_reusage", 1)
...
```


#### trace_destination (string) {#trace_destination-string}


跟踪模块中定义的跟踪目标地址。目前
唯一的跟踪模块是 **proto_hep**。
诸如 connect、accept 和连接关闭这类网络事件
将与处理过程中可能出现的错误一起被跟踪。


**警告：**必须加载跟踪模块，
该参数才能生效。（例如
**proto_hep**）。


*默认值为 none（未定义）。*


```opensips title="设置 trace_destination 参数"
...
modparam("proto_hep", "hep_id", "[hep_dest]10.0.0.2;transport=tcp;version=3")

modparam("proto_msrp", "trace_destination", "hep_dest")
...
```


#### trace_on (int) {#trace_on-int}


控制是否开启 MSRP 的跟踪。仍需定义
[trace_destination](#trace_destination-string) 才能生效，但
该值将通过 MI 函数
[msrp_trace](#msrp_trace) 控制。


```opensips title="设置 trace_on 参数"
...
modparam("proto_msrp", "trace_on", 1)
...
```


#### trace_filter_route (string)


定义一个路由名，在其中可以过滤哪些连接
会被跟踪、哪些连接不会被跟踪。在该路由中你将获得
当前连接的源与目的 IP 和端口信息。要禁用
某个特定连接的跟踪，该路由中最后调用的必须是 **drop**，
任何其他退出方式都会导致当前连接被跟踪
（当然，你仍需定义 [trace_destination](#trace_destination-string)，并且在此连接
打开时必须已开启跟踪）。


> [!IMPORTANT]
> 可以使用 **$si** 和 **$sp** 对 IP 地址和端口进行过滤，以匹配
> 正在连接 OpenSIPS 的实体，或 OpenSIPS 正在连接的
> 实体。这个名称可能具有误导性（按文档字面理解 **$si** 表示源 IP），但实际上
> 它只是指 OpenSIPS 套接字之外的另一端套接字。要匹配
> OpenSIPS 接口（无论是接受连接的那个接口，还是
> 发起连接的那个接口），可以使用 **$socket_in(ip)**（ip）和
> **$socket_in(port)**（port）。


> [!WARNING]
> 如果 [trace_on](#trace_on-int)
> 设置为 0，或通过 mi 命令 [msrp_trace](#msrp_trace) 停用了跟踪，
> 则该路由不会被调用。


```opensips title="设置 trace_filter_route 参数"
...
modparam("proto_msrp", "trace_filter_route", "msrp_filter")
...
/* 如果启用了跟踪且定义了跟踪目标地址，
 * 所有 MSRP 连接都将经过此路由 */
route[msrp_filter] {
	...
	/* 从 ip 1.1.1.1:8000 打开/由其打开的所有连接将在
	   接口 1.1.1.10:5060（opensips 监听地址）上被跟踪
	   所有其他连接则不会被跟踪 */
	 if ( $si == "1.1.1.1" && $sp == 8000 &&
		$socket_in(ip) == "1.1.1.10"  && $socket_in(port) == 5060)
		exit;
	else
		drop;
}
...
```


### 导出的 MI 函数 {#exported-mi-functions}


#### msrp_trace {#msrp_trace}


名称：*msrp_trace*


参数：


- trace_mode(optional)：开启和关闭 MSRP 跟踪。
该参数可以缺省，此时命令将显示
本模块当前的跟踪状态（开启或关闭）；
可能的取值：
	- on
	- off


MI FIFO 命令格式：
```bash
:msrp_trace:_reply_fifo_file_
trace_mode
_empty_line_
```
<!-- CONTRIBUTORS -->

### 许可证 {#license}

所有文档文件（即以 .md 为扩展名的文件）均按 Creative Common License 4.0 授权。
