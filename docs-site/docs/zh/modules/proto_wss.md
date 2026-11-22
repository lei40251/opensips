---
title: "proto_wss 模块"
description: "WSS（安全 WebSocket）模块提供了通过安全（TLS 加密）通道与 WebSocket（[RFC 6455](http://tools.ietf.org/html/rfc6455)）客户端或服务器通信的能力。"
sidebar: false
---


## 管理员指南 {#admin-guide}


### 概述 {#overview}


WSS（安全 WebSocket）模块提供了通过安全（TLS 加密）通道与
WebSocket（[RFC
6455](http://tools.ietf.org/html/rfc6455)）客户端或服务器通信的能力。
作为 [WebRTC](https://webrtc.org/)
规范的一部分，该协议可用于为支持 HTTPS 的浏览器
提供安全的 VoIP 呼叫。


本模块的行为与其他传输协议模块一致：要使用它，
必须在 `mpath`
参数*之后*定义一个或多个用于处理安全
WebSocket 流量的监听地址：

```opensips
...
mpath=/path/to/modules
...
socket=wss:10.0.0.1			# 替换为监听 IP
socket=wss:10.0.0.1:5060	# 替换为监听 IP 和端口
...
```

此外，还需要定义用于保护连接的 TLS 参数。这通过 *tls_mgm* 模块接口完成，与 *proto_tls* 模块类似：

```opensips
modparam("tls_mgm", "certificate", "/certs/biloxy.com/cert.pem")
modparam("tls_mgm", "private_key", "/certs/biloxy.com/privkey.pem")
modparam("tls_mgm", "ca_list", "/certs/wellknownCAs")
modparam("tls_mgm", "tls_method", "tlsv1")
modparam("tls_mgm", "verify_cert", "1")
modparam("tls_mgm", "require_cert", "1")
```
更多信息请参见 *tls_mgm* 模块文档。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


在本模块之前必须先加载以下模块：


- *tls_openssl* 或 *tls_wolfssl*，
取决于所需的 TLS 库
- *tls_mgm*。


#### 外部库的依赖 {#dependencies-of-external-libraries}


在使用本模块运行 OpenSIPS 之前，必须安装以下
库或应用程序：


- *无*。


### 导出的参数 {#exported-parameters}


所有这些参数都可以在 opensips.cfg 文件中使用，
以配置 OpenSIPS-WSS 的行为。


#### listen=interface


这是一个全局参数，用于指定由哪个接口/IP 和
端口处理 WSS 流量。


```opensips title="设置 listen 变量"
...
socket= wss:1.2.3.4:44344
...			
```


#### wss_port (integer)


所有 WSS 相关操作使用的默认端口。请
注意，默认端口会同时影响 SIP 监听部分
（如果 WSS 监听地址中未定义端口）和 SIP 发送
部分（如果目的 WSS URI 中没有显式端口）。


如果只想更改 WSS 的监听端口，请使用 SIP 监听地址定义中的
port 选项。


*默认值为 443。*


```opensips title="设置 wss_port 变量"
...
modparam("proto_wss", "wss_port", 44344)
...		
```


#### wss_max_msg_chunks (integer)


预期通过 WSS 到达的 SIP 消息被分成的最大分片数。
如果接收到的数据包分片数超过该值，
则丢弃连接（要么是连接非常
过载导致高度分片——要么是我们正遭受
正在进行的攻击，攻击者发送高度
分片的流量以降低服务器性能）。


*默认值为 4。*


```opensips title="设置 wss_max_msg_chunks 参数"
...
modparam("proto_wss", "wss_max_msg_chunks", 8)
...
```


#### wss_resource (string)


发起 WebSocket 握手时所查询的资源。


*默认值为 "/"。*


```opensips title="设置 wss_resource 参数"
...
modparam("proto_wss", "wss_resource", "/wss")
...
```


#### wss_handshake_timeout (integer)


该参数指定 proto_wss 模块等待 WebSocket 服务器返回
WebSocket 握手应答的时间（以毫秒为单位）。


*默认值为 100。*


```opensips title="设置 wss_handshake_timeout 参数"
...
modparam("proto_wss", "wss_handshake_timeout", 300)
...
```


#### cert_check_on_conn_reusage (integer)


该参数用于开启或关闭在复用现有 TLS 连接时
对 TLS 域（SSL 证书）的额外检查/匹配。
如果没有该额外检查，则仅检查连接的 IP 和端口
（以便复用现有连接）。有了该额外检查，
被复用的连接必须具有与当前信令操作所设置的
SSL 证书相同的证书。


该检查仅在通过 TLS 发送 SIP 流量时进行，
并且仅针对由 OpenSIPS 创建/发起（作为 TLS 客户端）的连接
生效。任何被接受的连接（作为 TLS 服务器）都将
自动匹配（跳过额外检查）。


*默认值为 0（禁用）。*


```opensips title="设置 cert_check_on_conn_reusage 参数"
...
modparam("proto_wss", "cert_check_on_conn_reusage", 1)
...
```


#### trace_destination (string) {#trace_destination-string}


跟踪目的地，如 tracing 模块中所定义。目前
唯一的 tracing 模块是 **proto_hep**。
诸如 connect、accept 和 connection closed 之类的
网络事件，以及过程中可能出现的错误，都将被跟踪。
对于每个创建的连接，都会发送一个事件，其中包含
客户端和服务器证书、主密钥、属于 WebSocket 协议握手的
http 请求和应答，以及网络层信息。


> [!WARNING]
> 必须加载一个 tracing 模块
> 该参数才能生效（例如
> **proto_hep**）。


*默认值为 none（未定义）。*


```opensips title="设置 trace_destination 参数"
...
modparam("proto_hep", "hep_id", "[hep_dest]10.0.0.2;transport=tcp;version=3")
modparam("proto_wss", "trace_destination", "hep_dest")
...
```


#### trace_on (int) {#trace_on-int}


该参数控制是否对 wss 开启跟踪。要使跟踪生效，仍需定义
[trace_destination](#trace_destination-string)，但该值可以通过 MI 函数
[wss_trace](#wss_trace) 来控制。


```opensips title="设置 trace_on 参数"
...
modparam("proto_wss", "trace_on", 1)
...
```


#### trace_filter_route (string)


定义一个路由名称，在其中可以过滤哪些连接
需要跟踪、哪些不需要。在该路由中，你将获得
关于当前连接的源和目的 IP 及端口的信息。
要禁用对特定连接的跟踪，该路由中的最后一次调用
必须是 **drop**，任何其他退出方式都会导致跟踪
当前连接（当然，你仍然
必须定义 [trace_destination](#trace_destination-string)，并且在打开该连接时跟踪
必须处于开启状态）。


> [!IMPORTANT]
> 可以基于 IP 地址和端口进行过滤，使用 **$si** 和 **$sp** 来匹配
> 连接到 OpenSIPS 的实体，或 OpenSIPS 正在连接的实体。
> 该名称可能具有误导性（如果阅读文档，**$si** 表示源 IP），但实际上
> 它只是除 OpenSIPS 套接字之外的另一个套接字。为了匹配
> OpenSIPS 接口（无论是接受连接的那个接口，还是发起连接的那个
> 接口），可以使用 **$socket_in(ip)**（ip）和
> **$socket_in(port)**（port）。


> [!WARNING]
> 如果 [trace_on](#trace_on-int) 被设置为 0，或通过 MI 命令 [wss_trace](#wss_trace)
> 停用了跟踪，则不会调用该路由。


```opensips title="设置 trace_filter_route 参数"
...
modparam("proto_wss", "trace_filter_route", "wss_filter")
...
/* 如果跟踪已激活且定义了跟踪目的地，
 * 所有 wss 连接都会经过该路由 */
route[wss_filter] {
	...
	/* 所有从 1.1.1.1:8000 打开/由 1.1.1.1:8000 打开的连接都将
	   在接口 1.1.1.10:5060（opensips 监听地址）上被跟踪
	   所有其他连接则不会 */
	 if ( $si == "1.1.1.1" && $sp == 8000 &&
		$socket_in(ip) == "1.1.1.10"  && $socket_in(port) == 5060)
		exit;
	else
		drop;
}
...
```


#### wss_tls_handshake_timeout (integer)


设置 SSL 握手序列完成的超时时间（以毫秒为单位）。
当连接使用 CPU 密集型加密时，可能需要增大该值，
以便留出时间生成和处理密钥。


该超时在接受到新连接（入站）期间以及
在等待新会话建立（出站）期间被启用。


*默认值为 100。*


```opensips title="设置 wss_tls_handshake_timeout 变量"
param("proto_wss", "wss_tls_handshake_timeout", 200) # 毫秒数
```


#### wss_send_timeout (integer)


设置发送操作完成的超时时间（以毫秒为单位）


发送超时适用于所有 TLS 写操作，不包括
握手过程（参见：wss_tls_handshake_timeout）


*默认值为 100。*


```opensips title="设置 wss_send_timeout 变量"
modparam("proto_wss", "wss_send_timeout", 200) # 毫秒数
```


#### require_origin (int)


控制模块是否要求 Origin 头域。


```opensips title="设置 require_origin 参数"
modparam("proto_wss", "require_origin", no)
```


### 导出的 MI 函数 {#exported-mi-functions}


#### wss_trace {#wss_trace}


名称：*wss_trace*


参数：


- trace_mode（可选）：开启和关闭 wss 跟踪。该参数
可以缺省，此时命令将显示该模块当前的跟踪
状态（on 或 off）；
可能的取值：
	- on
	- off


MI FIFO 命令格式：


```bash
opensips-cli -x mi wss_trace on
```


## 常见问题 {#frequently-asked-questions}


**问：OpenSIPS 是否支持分片的安全 WebSocket 消息？**


不支持，WebSocket 分片机制不受支持。
<!-- CONTRIBUTORS -->

### 许可 {#license}

所有文档文件（即 .md 扩展名）均在 Creative Common License 4.0 下授权。
