---
title: "event_virtual 模块"
description: "event_virtual 模块允许使用不同传输协议的多个外部应用，作为单个虚拟订阅者订阅 OpenSIPS 事件接口上的特定事件。"
sidebar: false
---


## 管理指南 {#admin-guide}


### 概述 {#overview}


*event_virtual*
模块允许使用不同传输协议的多个外部应用，作为单个虚拟订阅者订阅 OpenSIPS 事件接口上的特定事件。当事件被触发时，event_virtual 模块使用以下策略之一通知指定的传输模块：


- *PARALLEL* - 所有订阅者（应用）同时被通知
- *FAILOVER* - 对于每个触发的事件，按给定顺序尝试通知订阅者，
直到第一次成功通知。失败的订阅者在
[failover_timeout](#failover_timeout-integer) 过去之前，
后续通知中会被跳过。
- *ROUND-ROBIN* - 对于每个触发的事件，按给定顺序轮流通知订阅者（每个触发的事件通知一个不同的订阅者）


只能使用一个 expire 值（针对整个虚拟订阅），而不是为每个单独订阅者各用一个。


### 虚拟套接字语法 {#virtual-socket-syntax}


*virtual:policy subscriber_1 [[subscriber_2] ...]*


含义：


- *virtual:* - 告知事件接口，发送给此订阅者的事件应由
*event_virtual* 模块处理
- *policy* - 订阅者通知策略，可取以下值之一：'PARALLEL'、'FAILOVER'、'ROUND-ROBIN'（行为如上所述）


*!! 重要：策略必须始终以大写字符串指定！*
- *subscriber_1* - 对此特定订阅者使用套接字语法（例如 "rabbitmq:guest:guest@127.0.0.1:5672/pike"）


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


以下模块必须在本模块之前加载：
*实现订阅者所使用的传输协议的 OpenSIPS 事件模块*。


### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，必须安装以下库或应用程序：


- *无*


### 导出的参数 {#exported-parameters}


#### failover_timeout (integer) {#failover_timeout-integer}


失败的订阅者在后续通知中被跳过的最短持续时间，单位为秒。此参数仅影响
*FAILOVER* 策略。


*默认值为 "30"。*


```opensips title="设置 failover_timeout 参数"
...
modparam("event_virtual", "failover_timeout", 5)
...
	
```


### 导出的函数 {#exported-functions}


没有可在配置文件中使用的导出函数。


### 示例 {#example}


订阅者的套接字之间可以用任意数量的空格或制表符分隔：


```c title="虚拟套接字"
	virtual:PARALLEL rabbitmq:guest:guest@127.0.0.1:5672/pike flatstore:/var/log/opensips_proxy.log
```
<!-- CONTRIBUTORS -->

### 许可证 {#license}


所有文档文件（即 .md 扩展名）均按 Creative Common License 4.0 许可发布。
