---
title: "event_stream 模块"
description: "本模块为 Event 接口提供了一套 TCP 传输层实现。"
---


## 管理指南 {#admin-guide}


### 概述 {#overview}


本模块为 Event 接口提供了一套 TCP 传输层实现。该模块既可以发送
JSON-RPC 通知，也可以发送标准请求并等待应答（在
*reliable_mode* 模式下使用时）。


由于 JSON-RPC 直接通过 TCP 发送，绕过了任何应用层传输协议
（例如 HTTP），本模块提供了一种非常轻量且可靠的方式，
将事件投递到应用服务器。


为了接收通知，JSON-RPC 服务器必须订阅 OpenSIPS 提供的某个事件。
这可以通过通用 MI 接口（*event_subscribe* 函数）完成，
也可以在 OpenSIPS 脚本中完成（*subscribe_event* 核心函数）。


### 流式套接字语法 {#stream-socket-syntax}


*'tcp:' host ':' port ['/' method]*


含义：


- *'tcp:'* - 指定 Event 接口用于发送命令的
传输协议。*tcp*
标记表示订阅者的事件应通过
*event_stream* 模块通知。
- *host* - JSON-RPC 服务器的主机名。
- *port* - JSON-RPC 服务器的端口。
- *method* - 由 JSON-RPC 客户端远程调用的方法。
注意：该参数是可选的 —— 若缺失，
所使用的方法就是实际订阅的事件
（即若 *localhost:8080*
订阅了 *E_PIKE_BLOCKED*
事件，则 RPC 调用将使用
*E_PIKE_BLOCKED* 方法）。


JSON-RPC 命令按如下方式构建：


- *id* - 若使用
*reliable_mode*，则唯一生成；否则（对于
通知）为 *null*。
- *method* - 若在套接字中未指定方法，
则把事件名设为方法，否则
使用指定的标记。
- *params* - 若发送的事件包含
命名参数，则该参数是一个 JSON 对象，
其中每个参数对应一个对象。若发送的事件仅
包含值，则这些参数会以数组形式发送。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


必须在本模块之前加载以下模块：


- *无*。


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，必须安装以下库或应用程序：


- *无*


### 导出的参数 {#exported-parameters}


#### reliable_mode (integer)


该参数控制
*event_stream* 模块与 JSON-RPC 服务器通信的方式。
若启用（设为
*1*），每个事件都会被转换为
JSON-RPC 请求。若禁用，每个事件将作为
JSON-RPC 通知发送 —— 我们的客户端不会
期望收到任何应答。


注意，若你需要与 JSON-RPC 服务器进行可靠通信，
即每个发送的事件都需要被确认
（通过 JSON-RPC 应答），则必须将该参数
设为 *1/yes*。若你在故障切换部署中使用本模块
（使用 *event_virtual* 模块），建议
将该参数设为 *1/yes*。


*默认值为 "0（禁用）"。*


```opensips title="Set reliable_mode parameter"
...
modparam("event_stream", "reliable_mode", yes)
...
```


#### timeout (integer)


指定模块等待命令完成的毫秒数。
在 *reliable_mode* 下，它指定模块
等待请求被发送并收到应答的时间。
在非 *reliable_mode* 下，它仅表示
opensips 发送 JSON-RPC 通知所花的时间。


注意，若事件未为其参数使用名称，
则该事件将是 JSON-RPC 命令中的第一个参数。


*默认值为 "1000 毫秒 = 1 秒"。*


```opensips title="Set timeout parameter"
...
# 只等待 200 毫秒以获得应答
modparam("event_stream", "timeout", 200)
...
```


#### event_param (string)


默认情况下，所订阅事件的名称不会
在 JSON-RPC 命令中发送。若需要同时发送
事件名称，可以使用该参数
指定 params 中用于承载事件名称的那个
JSON 对象的名称。


*默认值为 "disabled" —— 不添加事件。*


```opensips title="Set event_param parameter"
...
modparam("event_stream", "event_param", "opensips_event")
# 生成的 json 将包含 "opensips_event": EVENT 标记
...
```


### 导出的函数 {#exported-functions}


没有导出供配置文件使用的函数。


### 示例 {#examples}


```c title="Stream socket"
	# 调用 'block_ip' 方法
	tcp:127.0.0.1:8080/block_ip

	# 若已订阅 E_PIKE_BLOCKED 事件，则调用 'E_PIKE_BLOCKED' 方法
	tcp:127.0.0.1:8080
```


#### JSON-RPC 通知 {#json-rpc-notification}


下面是一个事件示例，该事件在
*reliable_mode* 被禁用时由 pike 模块
判定某个 IP 应被封锁时触发：


```c title="E_PIKE_BLOCKED JSON-RPC notification"
{
	"jsonrpc": "2.0",
	"method": "E_PIKE_BLOCKED",
	"params": {
		"ip": "192.168.2.11"
	}
}
```


#### JSON-RPC 请求 {#json-rpc-request}


下面是一个在
*reliable_mode* 下由 pike 模块
判定某个 IP 应被封锁时触发的事件示例：


```c title="E_PIKE_BLOCKED JSON-RPC request (reliable_mode)"
# 请求
{
	"id": 915243442,
	"jsonrpc": "2.0",
	"method": "E_PIKE_BLOCKED",
	"params": {
		"ip": "192.168.2.11"
	}
}

# 应答
{
	"jsonrpc": "2.0",
	"result": 8,
	"id": 915243442
}
```


#### 带事件名称的 JSON-RPC 通知 {#json-rpc-notification-with-events-name}


当把 *event_param* 设为
*opensips_event* 时，pike 模块
触发的事件将如下所示：


```c title="E_PIKE_BLOCKED notification with event name"
# 模块配置
modparam("event_stream", "event_param", "opensips_event")

# Stream socket: tcp:HOST:PORT/handle_cmd

# 发送的 JSON-RPC 命令
{
	"jsonrpc": "2.0",
	"method": "handle_cmd",
	"params": {
		"opensips_event": "E_PIKE_BLOCKED"
		"ip": "192.168.2.11"
	}
}
```


#### 从脚本发送自定义 JSON-RPC 通知 {#custom-json-rpc-notification-from-script}


本例包含一段脚本片段，用于使用
*event_stream* 模块从脚本中发送
自定义事件。


注意，我们只填充了事件的值，
并未为这些值指定名称。
因此，参数将以数组形式发送。


```c title="E_PIKE_BLOCKED event"
startup_route {
	subscribe_event("E_MY_EVENT", "tcp:127.0.0.1:8080");
}

route {
	...
	$avp(attr-val) = 3;
	$avp(attr-val) = 5;
	raise_event("E_MY_EVENT", $avp(attr-val));
	...
}

# 发送的 JSON-RPC 命令
{
	"jsonrpc": "2.0",
	"method": "E_MY_EVENT",
	"params": [3, 5]
}
```
<!-- CONTRIBUTORS -->

### 许可 {#license}

所有文档文件（即 .md 扩展名的文件）均以 Creative Common License 4.0 授权。
