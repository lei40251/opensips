---
title: "proto_ws 模块"
description: "WebSocket 协议（[RFC 6455](http://tools.ietf.org/html/rfc6455)）在两个基于 Web 的应用之间提供端到端的全双工通信通道。"
sidebar: false
---


## 管理指南 {#admin-guide}


### 概述 {#overview}


WebSocket 协议（[RFC 6455](http://tools.ietf.org/html/rfc6455)）
在两个基于 Web 的应用之间提供端到端的全双工通信通道。
这使得支持 WebSocket 的浏览器能够连接到 WebSocket 服务器
并交换任意类型的数据。
[RFC 7118](http://tools.ietf.org/html/rfc7118)
给出了通过 WebSocket 协议传输 SIP 消息的规范。


**proto_ws** 模块是提供基于 WebSocket 协议通信的
传输层模块。本模块完全符合
[RFC 7118](http://tools.ietf.org/html/rfc7118)，从而使浏览器
可以作为 OpenSIPS 代理的 SIP 客户端。


当前实现同时充当 WebSocket 服务器与客户端，因此既能
接受来自 WebSocket 客户端的连接，也能主动向另一个
WebSocket 服务器发起连接。连接建立后，消息可在
两个方向上流动。


OpenSIPS 支持以下 WebSocket 操作：


- text 与 binary —— 既能发送也能接收消息体为文本或二进制的 WebSocket 消息
- close —— 通过两条消息的握手安全关闭 WebSocket 通信的消息
- ping —— 以 pong 消息应答。没有触发 ping 消息的机制。
- pong —— 收到 ping 消息时发送。OpenSIPS 会吸收收到的 pong 消息。


加载后，即可在脚本中定义 WebSocket 监听地址。要
添加监听地址，必须在 `mpath` 参数*之后*添加其 IP，以及可选的
监听端口，类似下面的示例：

```opensips
...
mpath=/path/to/modules
...
socket=ws:127.0.0.1		# 换成监听 IP
socket=ws:127.0.0.1:5060	# 换成监听 IP 与端口
...
```


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


以下模块必须先于本模块加载：


- *无*。


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，必须安装以下
库或应用程序：


- *无*。


### 导出的参数 {#exported-parameters}


#### ws_port (integer)


所有与 WS 相关的操作所使用的默认端口。请注意，
该默认端口会同时影响 SIP 监听部分（若 WS 监听地址中
未定义端口）与 SIP 发送部分（若
目标 WS URI 未显式指定端口）。


若只想修改 WS 的监听端口，请使用 SIP 监听定义中的
port 选项。


*默认值为 80。*


```c title="Set ws_port parameter"
...
modparam("proto_ws", "ws_port", 8080)
...
```


#### ws_send_timeout (integer)


以毫秒为单位的时间：若 WebSocket 连接在该时间间隔内
无法进行阻塞写（而 OpenSIPS 想在其上发送数据），
则该连接将被关闭。


*默认值为 100 ms。*


```opensips title="Set ws_send_timeout parameter"
...
modparam("proto_ws", "ws_send_timeout", 200)
...
```


#### ws_max_msg_chunks (integer)


预期一条 SIP 消息经由 WebSocket 到达时所分成的
最大分块数。若收到的数据包分片程度超过该值，
连接会被丢弃（要么连接负载过高
导致分片严重 —— 要么我们正
遭受攻击，攻击者发送高度分片的流量
以降低服务器性能）。


*默认值为 4。*


```opensips title="Set ws_max_msg_chunks parameter"
...
modparam("proto_ws", "ws_max_msg_chunks", 8)
...
```


#### trace_destination (string) {#trace_destination-string}


追踪模块中定义的追踪目的地。目前
唯一的追踪模块是 **proto_hep**。
诸如 connect、accept 与 connection closed 之类的网络事件，
以及过程中可能出现的错误，都会被追踪。
对每个建立的连接，都会发送一个事件，
其中包含属于 web socket 协议握手的 http 请求与应答信息
以及网络层信息。


> [!WARNING]
> 必须加载追踪模块，该参数才能生效。
> （例如 **proto_hep**）。


*默认值为无（未定义）。*


```opensips title="Set trace_destination parameter"
...
modparam("proto_hep", "hep_id", "[hep_dest]10.0.0.2;transport=tcp;version=3")

modparam("proto_ws", "trace_destination", "hep_dest")
...
```


#### trace_on (int) {#trace_on-int}


该参数控制 ws 的追踪是否开启。要使其生效，
仍需要定义 [trace_destination](#trace_destination-string)，但该值将由
MI 函数 [ws_trace](#ws_trace) 控制。


```opensips title="Set trace_on parameter"
...
modparam("proto_ws", "trace_on", 1)
...
```


#### trace_filter_route (string)


定义一个路由的名称，在该路由中可以过滤哪些连接
会被追踪、哪些不会。该路由中会有当前连接的
源与目的 ip 及端口信息。要禁用对某个特定连接的追踪，
该路由中最后一次调用必须是 **drop**，任何其他退出
方式都会导致当前连接被追踪（当然，仍必须
定义 [trace_destination](#trace_destination-string)，且在该连接建立时
追踪必须处于开启状态）。


> [!IMPORTANT]
> 可以使用 **$si** 与 **$sp** 按 ip 地址与端口进行过滤，
> 它们匹配的既可能是连接到 OpenSIPS 的一方，也可能是
> OpenSIPS 所连接的一方。名称可能有些误导（若按文档字面理解，**$si** 意为源 ip），
> 但实际上它只是 OpenSIPS 套接字之外的另一端套接字。若要匹配
> OpenSIPS 的接口（无论是接受连接的那个，还是
> 发起连接的那个），可以使用 **$socket_in(ip)**（ip）与
> **$socket_in(port)**（port）。


> [!WARNING]
> 若 [trace_on](#trace_on-int) 设为
> 0，或通过 MI 命令 [ws_trace](#ws_trace) 停用了追踪，
> 则该路由不会被调用。


```opensips title="Set trace_filter_route parameter"
...
modparam("proto_ws", "trace_filter_route", "ws_filter")
...
/* 若追踪已激活且定义了追踪目的地，
 * 所有 ws 连接都会经过该路由 */
route[ws_filter] {
	...
	/* 由 ip 1.1.1.1:8000 打开的连接将在
	   接口 1.1.1.10:5060（opensips 监听地址）上被追踪，
	   其他所有连接都不会被追踪 */
	 if ( $si == "1.1.1.1" && $sp == 8000 &&
		$socket_in(ip) == "1.1.1.10"  && $socket_in(port) == 5060)
		exit;
	else
		drop;
}
...
```


#### require_origin (int)


控制本模块是否要求 Origin 头域。


```opensips title="Set require_origin parameter"
...
modparam("proto_ws", "require_origin", no)
...
```


### 导出的 MI 函数 {#exported-mi-functions}


#### ws_trace {#ws_trace}


名称：*ws_trace*


参数：


- trace_mode（可选）：开启或关闭 ws 追踪。该参数
可以缺省，此时命令将显示本模块当前的追踪
状态（开启或关闭）；
可选值：
	- on
	- off


MI FIFO 命令格式：


```bash
opensips-cli -x mi ws_trace on
```


## 常见问题 {#frequently-asked-questions}


**问：OpenSIPS 能否作为 WebSocket 客户端？**


可以，从 OpenSIPS 2.2 开始，它可以作为 WebSocket 客户端。


**问：OpenSIPS 是否支持 WebSocket 消息分片？**


不支持，WebSocket 分片机制不受支持。
<!-- CONTRIBUTORS -->

### 许可证 {#license}

本项目的所有文档文件（即 .md 扩展名的文件）均以 Creative Common License 4.0 授权。
