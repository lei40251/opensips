---
title: "janus 模块"
description: "janus 模块是 Janus websocket 协议的 C 驱动。"
---


## 管理指南 {#admin-guide}


### 概述 {#overview}


*"janus"* 模块是
Janus websocket 协议的 C 驱动。它可以
向一个或多个 Janus 服务器下发命令，或从中接收
事件，从而与其交互。


该驱动可视为一个集中的 Janus 连接管理器。
它会连接到每个 Janus 服务器，建立连接处理句柄 ID（connection handler ID）；从连接处理句柄 ID
的角度看，客户端可以是透明的，只需传入其想要执行的 Janus 命令。


### 外部库或应用程序 {#external-libraries-or-applications}


#### OpenSIPS 模块 {#opensips-modules}


以下模块必须与本模块一同加载：


- *一个 SQL 数据库模块*


在加载本模块运行 OpenSIPS 之前，必须安装
以下库或应用程序：


- *无*


### 导出的参数 {#exported-parameters}


#### janus_send_timeout (integer)


时间，单位为毫秒；若 Janus WebSocket 连接在该时间间隔内无法
进行阻塞写（而 OpenSIPS 又要向其发送数据），则在该时间后关闭该连接。


*默认值为 "1000"（毫秒）。*


```opensips title="Setting the janus_send_timeout parameter"
...
modparam("janus", "janus_send_timeout", 2000)
...
```


#### janus_max_msg_chunks (integer)


预期一个 Janus 消息通过 WebSocket 到达时的最大分块数。如果收到的数据包
分片数超过该值，则断开该连接


*默认值为 "4"*


```opensips title="Setting the janus_max_msg_chunks parameter"
...
modparam("janus", "janus_max_msg_chunks", 8)
...
```


#### janus_cmd_timeout (integer)


Janus 命令执行所允许的最长持续时间。
该时间间隔不包含连接耗时。


*默认值为 "5000"（毫秒）。*


```opensips title="Setting the janus_cmd_timeout parameter"
...
modparam("janus", "janus_cmd_timeout", 3000)
...
```


#### janus_cmd_polling_itv (integer)


轮询 Janus 命令响应时使用的休眠间隔。由于该参数的
取值会给任何 Janus 命令带来一个最小时长，
应先以调试模式运行 OpenSIPS，确定任意 Janus 命令的预期
响应时间，再据此调整该参数。


*默认值为 "1000"（微秒）。*


```opensips title="Setting the janus_cmd_polling_itv parameter"
...
modparam("janus", "janus_cmd_polling_itv", 3000)
...
```


#### janus_ping_interval (integer)


OpenSIPS 对 Janus 连接执行保活 ping 的时间间隔


*默认值为 "5"（秒）。*


```opensips title="Setting the janus_ping_interval parameter"
...
modparam("janus", "janus_ping_interval", 10)
...
```


#### janus_db_url (string)


OpenSIPS 用于加载 Janus 连接列表的 DB URL


*默认值为 "none"（模块启动前必须设置）。*


```opensips title="Setting the janus_db_url parameter"
...
modparam("janus", "janus_db_url", "mysql://root@localhost/opensips")
...
```


#### janus_db_table (string)


OpenSIPS 用于加载 Janus 连接列表的 DB 表


*默认值为 "janus"*


```opensips title="Setting the janus_db_table parameter"
...
modparam("janus", "janus_db_table", "my_janus_table")
...
```


### 导出的函数 {#exported-functions}


#### janus_send_request(janus_id, janus_command[, response_var])


在任意 Janus 套接字上运行任意命令。
janus_id 必须在数据库中定义


当前 OpenSIPS 工作进程将阻塞，直到 Janus 的应答
到达。该操作的超时可通过
**janus_cmd_timeout** 参数控制。


各参数含义如下：


- *janus_id* (string) - 数据库中定义的 janus 连接 ID。
- *janus_command* (string) - 要运行的 JANUS 命令。
- *response_var (var, optional)* -
用于保存 Janus 命令文本结果的变量。


**返回值**


- 1 (success) - Janus 命令执行成功，且所有
输出变量均已成功写入。注意，这并不
表示 Janus 应答本身的性质（它
完全可能是一个 "-ERR" 类型的响应）
- -1 (failure) - 内部错误或 Janus 命令
执行失败


该函数可用于任意路由。


```opensips title="*janus_send_request()* usage"
...
# 若数据库包含：
#       id: 1
# janus_id: test_janus
# janus_url: janusws://my_janus_host:80/janus?room=abcd

	$var(rc) = janus_send_request("test_janus", "{
  "janus": "attach",
  "plugin": "janus.plugin.videoroom",
  "transaction": "abcdef123456",
  "session_id": 987654321
}", $var(response));
	if (!$var(rc)) {
		xlog("failed to execute Janus command ($var(rc))\n");
		return -1;
	}
	xlog("Janus response is $var(response) \n");
...
...
```


#### 导出的事件 {#exported-events}


##### E_JANUS_EVENT


当从 Janus 服务器收到通知时触发该事件。


参数分别表示发起该通知的 janus_id 与 janus_url，以及所收到事件的完整 janus_body


- *janus_id* - 数据库中定义的 janus id
- *janus_url* - 数据库中定义的 janus url
- *janus_body* - 从 janus 收到的通知完整消息体


```opensips title="*E_JANUS_EVENT* example"
...
# 若数据库包含：
#       id: 1
# janus_id: test_janus
# janus_url: janusws://my_janus_host:80/janus?room=abcd

event_route[E_JANUS_EVENT] {
	xlog("Received janus event from $param(janus_id) - $param(janus_url) - $param(janus_body) \n");
	$json(janus_body) := $param(janus_body);
	$avp(janus_sender) =  $json(janus_body/sender);
	if ($avp(janus_sender) != NULL) {
		xlog("Received event from sender $avp(janus_sender) \n");
	}
}
...
...
```
<!-- CONTRIBUTORS -->

### 许可证 {#license}

所有文档文件（即 .md 扩展名）均按 Creative Common License 4.0 许可发布
