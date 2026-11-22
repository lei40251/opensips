---
title: "event_rabbitmq 模块"
description: "*RabbitMQ*（[http://www.rabbitmq.com/](http://www.rabbitmq.com/)）是一个开源消息服务器。"
sidebar: false
---


## 管理指南 {#admin-guide}


### 概述 {#overview}


*RabbitMQ*
（[http://www.rabbitmq.com/](http://www.rabbitmq.com/)）
是一个开源消息服务器。它的用途是利用灵活的 AMQP 协议，
管理队列中收到的消息。


本模块提供了 RabbitMQ 客户端的实现，
支持两项主要功能：


- *事件驱动消息（Event-Driven Messaging）：*
每次事件接口触发已订阅的事件时，用于向 RabbitMQ 服务器
发送 AMQP 消息。
- *通用消息发布（General Message Publishing）：*
本模块还支持直接向 RabbitMQ 服务器发送 AMQP 消息。
可以按照 AMQP 规范以及 RabbitMQ 扩展轻松定制消息。


### RabbitMQ 事件语法 {#rabbitmq-events-syntax}


事件负载被格式化为 JSON-RPC 通知，事件名作为
*method* 字段，事件参数作为
*params* 字段。


### RabbitMQ 套接字语法 {#rabbitmq-socket-syntax}


*'rabbitmq:' [user[':'password] '@' host [':' port] '/' [params '?'] routing_key*


含义：


- *'rabbitmq:'* - 告知事件接口，发送给该订阅者的事件
应由 *event_rabbitmq* 模块处理。
- *user* - 用于 RabbitMQ 服务器鉴权的
用户名。默认值为 'guest'。
- *password* - 用于 RabbitMQ 服务器鉴权的
密码。默认值为 'guest'。
- *host* - RabbitMQ 服务器的主机名。
- *port* - RabbitMQ 服务器的端口。
默认值为 '5672'。
- *params* - 以 *key[=value]* 形式指定的
额外参数，用 ';' 分隔：
	* *exchange* - RabbitMQ 服务器的交换器。
	默认值为 ''。
	* *tls_domain* - 指定该连接使用哪个 TLS 域（由
	*tls_mgm* 模块定义）。
	必须启用 [use_tls](#use_tls-integer) 模块参数。
	* *persistent* - 表示消息应以持久化方式发布，
	即 *delivery_mode=2*。该
	参数没有取值。
- *routing_key* - 这是 AMQP 协议使用的路由键，
用于标识事件应发送到哪个队列。


> [!NOTE]
> 如果队列不存在，本模块不会
> 尝试创建它。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


在加载本模块之前，必须先加载以下模块：


- *tls_mgm*，如果启用了 [use_tls](#use_tls-integer)。


#### 外部库或应用 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，
必须先安装以下库或应用：


- *librabbitmq-dev*


### 导出的参数 {#exported-parameters}


#### heartbeat (integer)


为 AMQP 通信启用心跳支持。如果客户端
在指定间隔内未收到服务器的心跳，
rabbitmq-client 会自动关闭套接字。这可以避免
OpenSIPS 在等待已失效的 rabbitmq-server 响应时
被阻塞。该值表示心跳间隔，
单位为秒。


*默认值为 "0（禁用）"。*


```opensips title="设置 heartbeat 参数"
...
modparam("event_rabbitmq", "heartbeat", 3)
...
```


#### connect_timeout (integer)


与 RabbitMQ 服务器建立 TCP 连接所允许的
最长持续时间（毫秒）。


*默认值为 "500"（毫秒）。*


```opensips title="设置 connect_timeout 参数"
...
modparam("event_rabbitmq", "connect_timeout", 1000)
...
	
```


#### use_tls (integer) {#use_tls-integer}


设置该参数可允许对中介连接使用 TLS。
要为某个特定连接启用 TLS，可以在通过
[套接字语法](#rabbitmq-socket-syntax)指定的配置中
使用 "tls_domain=*dom_name*" 参数。


使用该参数时，还必须确保
*tls_mgm* 已加载且配置正确。有关
TLS 客户端域的更多信息，请参考该模块。


*默认值为 **0**（未启用）*


```opensips title="设置 use_tls 参数"
...
modparam("tls_mgm", "client_domain", "rmq")
modparam("tls_mgm", "certificate", "[rmq]/etc/pki/tls/certs/rmq.pem")
modparam("tls_mgm", "private_key", "[rmq]/etc/pki/tls/private/rmq.key")
modparam("tls_mgm", "ca_list",     "[rmq]/etc/pki/tls/certs/ca.pem")
...
modparam("event_rabbitmq", "use_tls", 1)
...
```


#### timeout (integer)


指定发送给 RabbitMQ 服务器的任何命令（如 publish）
的超时时间（毫秒）。


> [!NOTE]
> 该参数仅在 RabbitMQ 库版本 *0.9.0* 及以上可用；
> 在更早版本中设置不会生效，publish 命令将以
> 阻塞模式运行。


*默认值为 **0**（无超时 - 阻塞模式）*


```opensips title="设置 timeout 参数"
...
modparam("event_rabbitmq", "timeout", 1000) # 1 秒后超时
...
```


#### server_id (string)


指定 RabbitMQ 服务器的配置。它包含一组参数，
用于定制与服务器的连接
以及发送的消息。参数的格式为
*[id_name] param1=value1; param2=value2;*。
*uri* 参数是必填的。


该参数可为每个 RabbitMQ
服务器多次设置。


可使用以下参数：


- *uri* - 必填参数 - 完整的
*amqp* URI，格式见
[此处](https://www.rabbitmq.com/uri-spec.html)。
URI 中缺失的字段将采用默认值，
例如：*user: guest*、
*password: guest*、
*host: localhost*、
*vhost: /*、
*port: 5672*。TLS 连接使用
*amqps* URI 指定。
- *frames* - AMQP 帧的最大
大小。可选参数，默认大小为 131072。
- *retries* - 连接断开时的
重试次数。可选参数，默认禁用
（不重试）。
- *exchange* - 用于发送 AMQP
消息的交换器。可选参数，默认值为 *""*。
- *heartbeat* - 发送心跳消息的
间隔，单位为秒。可选参数，
默认禁用。
- *immediate* - 向中介表示
消息必须立即投递给消费者。
可选参数，默认不立即投递。
- *mandatory* - 向中介表示
消息必须路由到队列。可选参数，
默认不启用。
- *non-persistent* - 表示
RabbitMQ 服务器重启时消息不应持久化。
可选参数，默认持久化。
- *tls_domain* - 指定该连接使用哪个 TLS 域（由
*tls_mgm* 模块定义）。
此时必须是 *amqps* URI，且
必须启用 [use_tls](#use_tls-integer) 模块参数。


```opensips title="设置 server_id 参数"
...
# 连接到 localhost 上的 RabbitMQ 服务器，使用默认端口
modparam("event_rabbitmq", "server_id","[ID1] uri = amqp://127.0.0.1")
...
# 心跳消息间隔为 5 秒的连接
modparam("event_rabbitmq", "server_id","[ID2] uri = amqp://127.0.0.1;
heartbeat = 5")
...
# TLS 连接
modparam("event_rabbitmq", "server_id","[ID3] uri = amqps://127.0.0.1; tls_domain=rmq")
...
		
```


### 导出的函数 {#exported-functions}


#### rabbitmq_publish(server_id, routing_key, message [, [content_type [, headers, headers_vals]]])


向 RabbitMQ 服务器发送一条 publish 消息。


该函数还允许你在 AMQP 消息中附加 AMQP 头及其值。
做法是指定一组头名（在 *headers* 参数中）
及其对应值（在 *headers_vals*
参数中）。*headers* 中的 AVP 值数量
必须与 *headers_vals* 中的一致。


该函数可在任意路由中使用。


该函数有以下参数：


- *server_id*（string）- RabbitMQ 服务器的 id。
必须是 *server_id* modparam 中定义的
参数之一。
- *routing_key*（string）- 用于
投递 AMQP 消息的路由键。
- *message*（string）- 消息体。
- *content_type*（string，可选）- 所发送消息的
内容类型。默认为 *none*。
- *headers*（string，可选）- 一个 AVP，包含
AMQP 消息中各头的名称。若设置，
则必须同时指定 *headers_vals* 参数。
- *headers_vals*（string，可选）- 一个 AVP，包含
AMQP 各头的对应值。若设置，
则必须同时指定 *headers* 参数。


```opensips title="rabbitmq_publish() 函数用法"
	...
	rabbitmq_publish("ID1", "call", "$fU called $rU");
	...
	rabbitmq_publish("ID1", "call", "{ \'caller\': \'$fU\',
					\'callee\; \'$rU\'", "application/json");
	...
	$avp(hdr_name) = "caller";
	$avp(hdr_value) = $fU;
	$avp(hdr_name) = "callee";
	$avp(hdr_value) = $rU;
	rabbitmq_publish("ID2", "call", $rb, , $avp(hdr_name), $avp(hdr_value));
	...
	
```


### 示例 {#example}


下面是 pike 模块判定某个 IP 应被封锁时
触发的事件示例：


```c title="E_PIKE_BLOCKED 事件"
{
  "jsonrpc": "2.0",
  "method": "E_PIKE_BLOCKED",
  "params": {
    "ip": "192.168.2.11"
  }
}
```


```c title="RabbitMQ 套接字"
rabbitmq:guest:guest@127.0.0.1:5672/pike

# 同一个套接字也可以写成
rabbitmq:127.0.0.1/pike

# TLS 中介连接
rabbitmq:127.0.0.1/tls_domain=rmq?pike
```


## 示例集 {#samples}

[示例集](https://github.com/OpenSIPS/opensips/tree/3.6/modules/event_rabbitmq/samples)


## 常见问题 {#frequently-asked-questions}


**问：AMQP 消息的最大长度是多少？**


数据报事件的最大长度为 16384 字节。


**问：在哪里可以找到更多关于 OpenSIPS 的信息？**


请访问 [https://opensips.org/](https://opensips.org/)。


**问：AMQP 服务器使用的 vhost 是什么？**


目前仅支持 *'/'* 这一个 vhost。


**问：如何在套接字中设置 vhost？**


本版本不支持其他 vhost。


**问：如何向我的 RabbitMQ 服务器发送事件？**


本模块作为 OpenSIPS 事件接口的传输模块。因此，
本模块应遵循事件接口的行为方式：

第一步是将 RabbitMQ 服务器订阅到
OpenSIPS 事件接口。可以使用核心函数
*subscribe_event* 完成：

下一步是在脚本中使用核心函数 *raise_event*
触发该事件：

注意，上面用到的事件仅用于示例说明脚本中的用法。
通过 OpenSIPS 事件接口发布的任何事件
都可以用本模块触发。


**问：在哪里可以找到更多关于 RabbitMQ 的信息？**


可以在 RabbitMQ 官方网站
（[http://www.rabbitmq.com/](http://www.rabbitmq.com/)）找到更多信息。


**问：可以在哪里提出关于本模块的问题？**


首先请查看你的问题是否已在我们的某个邮件列表中
得到了解答：

与任何稳定版 OpenSIPS 相关的邮件请发送至
users@lists.opensips.org，与开发版相关的邮件
请发送至 devel@lists.opensips.org。

如果希望邮件保持私密，请发送至
users@lists.opensips.org。


**问：如何报告 bug？**


请遵循以下地址给出的指引：
[https://github.com/OpenSIPS/opensips/issues](https://github.com/OpenSIPS/opensips/issues)。
<!-- CONTRIBUTORS -->

### 许可证 {#license}

所有文档文件（即 .md 扩展名）均采用 Creative Common License 4.0 许可。
