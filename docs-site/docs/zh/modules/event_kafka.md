---
title: "event_kafka 模块"
description: "本模块是 Apache Kafka 生产者的一个实现。"
---


## 管理指南 {#admin-guide}


### 概述 {#overview}


本模块是
[Apache Kafka](https://kafka.apache.org/) 生产者的一个实现。
它作为事件接口（Event Interface）的传输后端，同时提供一个独立连接器，供 OpenSIPS
脚本使用，以便向 Kafka broker 发布消息。


### Kafka 套接字语法 {#kafka-socket-syntax}


*'kafka:' brokers '/' topic ['?' properties]*


套接字各字段的含义：


- *brokers* - 要连接的 Kafka broker 地址列表（形如
host:port），以逗号分隔。这些是客户端用于发现 Kafka 集群的 “bootstrap”
服务器。它对应 *bootstrap.servers* /
*metadata.broker.list* 配置属性。
- *topic* - 用于发布消息的 Kafka topic。
- *properties* - 透明传递给 Kafka 客户端库的
配置属性。语法为：
*'g.'|'t.' property '=' value ['&' 'g.'|'t.' property '=' value] ...*
每个属性名前的 *g.* 或 *t.* 前缀用于指明它是
Kafka 库所分类的全局属性还是 topic 级属性。支持的属性文档见
[此处](https://github.com/edenhill/librdkafka/blob/master/CONFIGURATION.md)。
注意，某些库属性名称本身包含 *topic.*
前缀，但仍属于全局类别。
*key=callid* 是一个额外的属性，不会
传递给 Kafka 库，而由 OpenSIPS 自身解析。
启用该属性后，发布到 Kafka 的记录还会
将当前 SIP 消息的 Call-ID 作为 key 一并包含。


### Kafka 事件语法 {#kafka-events-syntax}


事件载荷被格式化为 JSON-RPC 通知，事件名作为 *method* 字段，
事件参数作为 *params* 字段。


如果在事件套接字中提供了 *key=callid* 属性，
发布到 Kafka 的记录还会将当前 SIP 消息的 Call-ID 作为 key 一并包含。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


必须先加载以下模块：


- *无*。


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，必须安装
以下库或应用程序：


- *librdkafka-dev*


*librdkafka-dev* 可从 Confluent 的
[APT](https://docs.confluent.io/current/installation/installing_cp/deb-ubuntu.html#get-the-software) 或
[YUM](https://docs.confluent.io/current/installation/installing_cp/rhel-centos.html#get-the-software)
仓库安装。


### 导出的参数 {#exported-parameters}


#### broker_id (string) {#broker_id-string}


该参数为某个 Kafka broker（或集群）指定配置，
可通过 [kafka_publish()](#kafka_publishbroker_id-message-key-report_route) 函数
在脚本中直接用它发布消息。


参数的格式为 *[ID]kafka_socket*，
其中 *ID* 是该 broker 实例的标识符，
*kafka_socket* 是类似
[Kafka 套接字语法](#kafka-socket-syntax)的规约。


通过该参数配置的 broker，*key=callid* 属性不会生效。


该参数可以设置多次。


```opensips title="Set broker_id parameter"
...
modparam("event_kafka", "broker_id", "[k1]127.0.0.1:9092/topic1?g.linger.ms=100&t.acks=all")
...
```


### 导出的函数 {#exported-functions}


#### kafka_publish(broker_id, message, [key], [report_route]) {#kafka_publishbroker_id-message-key-report_route}


向 Kafka broker（或集群）发布一条消息。由于实际的
发送操作是异步完成的，可以提供报告路由
以检查消息投递状态。


若消息成功进入发送队列则返回 *1*，
否则返回 *-1*。


该函数可用于任意路由。


该函数具有以下参数：


- *broker_id* (string) - Kafka broker
（或集群）的 ID。
必须是
[broker_id](#broker_id-string) 模块参数所定义的 ID 之一。
- *message* (string) - 要发布的 Kafka
消息载荷。
- *key* (string, optional) - 要发布的 Kafka
记录的 key。
- *report_route* (string, static, optional) -
当消息投递状态可用时要执行的脚本路由名。
消息发布的信息可在该路由中通过以下 AVP 变量获取：
	* *$avp(kafka_id)* - broker ID
	* *$avp(kafka_status)* - 投递状态，成功为 0，否则为 -1
	* *$avp(kafka_key)* - 消息 key
	* *$avp(kafka_msg)* - 消息载荷


```opensips title="kafka_publish() function usage"
	...
	$var(msg) = "my msg content";
	kafka_publish("k1", $var(kmsg), $ci, "kafka_report");
	...
	route[kafka_report] {
		xlog("Delivery status: $avp(kafka_status) for broker: $avp(kafka_id)\n");
	}
	...
	
```


### 示例 {#examples}


```c title="Kafka socket"
	kafka:127.0.0.1:9092/topic1?t.message.timeout.ms=1000&key=callid
```
<!-- CONTRIBUTORS -->

### 许可证 {#license}

所有文档文件（即 .md 扩展名）均按 Creative Common License 4.0 许可发布
