---
title: "RabbitMQ Consumer 模块"
description: "*RabbitMQ Consumer*（[http://www.rabbitmq.com/](http://www.rabbitmq.com/)）是一个开源消息服务器。"
sidebar: false
---


## 管理指南 {#admin-guide}


### 概述 {#overview}


*RabbitMQ Consumer*
（[http://www.rabbitmq.com/](http://www.rabbitmq.com/)）
是一个开源消息服务器。它的用途是利用灵活的 AMQP 协议，
管理队列中收到的消息。


使用本模块，你可以把消费者订阅到 RabbitMQ 中介，以便接收指定队列的
AMQP 消息。这些消息将通过 OpenSIPS 事件接口触发事件的方式投递。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


在加载本模块之前，必须先加载以下模块：


- *tls_mgm*，如果启用了 [use_tls](#use_tls-integer)。


#### 外部库或应用 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，必须先安装以下库或应用：


- *librabbitmq-dev*


> [!NOTE]
> 本模块与 librabbitmq-dev 库 0.4 及以下版本不兼容。


### 导出的参数 {#exported-parameters}


#### connection_id (string) {#connection_id-string}


指定 RabbitMQ 连接的配置。它包含一组参数，用于定制与服务器的连接以及
消费者订阅。参数的格式为
*param1=value1; param2=value2;*。
*uri*、*queue* 和
*event* 参数是必填的。


该参数可以为每个 RabbitMQ 连接多次设置。


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
- *queue* - 必填参数 - 要为其订阅消费者的
RabbitMQ 队列名称。该参数为必填。
- *event* - 必填参数 - 每收到一条 AMQP 消息时
触发的 OpenSIPS 事件名。
- *ack* - 标志位，向中介表示
消息在收到时即被确认。若不设置此标志，
服务器不会期望 ACK，OpenSIPS 也不会
发送 ACK。
- *exclusive* - 标志位，向中介表示
请求独占的消费者访问权限，即只有该消费者
可以访问该队列。
- *frame_max* - AMQP 帧的最大
大小。默认大小为 131072。
- *heartbeat* - 发送心跳消息的
间隔，单位为秒。默认禁用。
- *tls_domain* - 指定该连接使用哪个 TLS 域（由
*tls_mgm* 模块定义）。
此时必须是 *amqps* URI，且
必须启用 [use_tls](#use_tls-integer) 模块参数。


```opensips title="设置 connection_id 参数"
...
# 连接到 localhost 上的 RabbitMQ 服务器，使用默认端口
# 心跳消息间隔为 5 秒
modparam("rabbitmq_consumer", "connection_id",
    "uri = amqp://127.0.0.1; queue = myqueue1; event = E_Q1_MSG; heartbeat = 5;")
...
# 会确认消息的消费者
modparam("rabbitmq_consumer", "connection_id",
    "uri = amqp://127.0.0.1; queue = myqueue2; event = E_Q2_MSG; ack;")
...
# TLS 连接
modparam("rabbitmq_consumer", "connection_id",
    "uri = amqps://127.0.0.1; queue = myqueue3; event = E_Q3_MSG; tls_domain=rmq;")
...
		
```


#### connect_timeout (integer)


与 RabbitMQ 服务器建立 TCP 连接所允许的
最长持续时间（毫秒）。


*默认值为 "500"（毫秒）。*


```opensips title="设置 connect_timeout 参数"
...
modparam("rabbitmq_consumer", "connect_timeout", 1000)
...
```


#### retry_timeout (integer)


OpenSIPS 在该间隔（毫秒）之后会尝试
重建到 RabbitMQ 服务器上失败的 AMQP 连接。


*默认值为 "5000"（毫秒）。*


```opensips title="设置 retry_timeout 参数"
...
modparam("rabbitmq_consumer", "retry_timeout", 10000)
...
```


#### use_tls (integer) {#use_tls-integer}


设置该参数可允许对中介连接使用 TLS。
要为某个特定连接启用 TLS，可以在通过
[connection_id](#connection_id-string) 模块参数指定的配置中
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
modparam("rabbitmq_consumer", "use_tls", 1)
...
```


### 导出的函数 {#exported-functions}


本模块不导出任何脚本函数。


### 导出的事件 {#exported-events}


每收到一条 AMQP 消息，都会触发一个自定义名称的事件，
名称取自 [connection_id](#connection_id-string) 参数的
*event* 字段。


参数：


- *body* - AMQP 消息体。
<!-- CONTRIBUTORS -->

### 许可证 {#license}

所有文档文件（即 .md 扩展名）均采用 Creative Common License 4.0 许可。
