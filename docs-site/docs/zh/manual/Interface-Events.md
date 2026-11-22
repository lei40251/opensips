---
title: "事件接口"
description: "事件接口是 OpenSIPS 的一个接口，提供多种方式将 OpenSIPS 内部触发的特定事件通知给外部应用。"
---

**事件接口**是 OpenSIPS 的一个接口，提供多种方式将 OpenSIPS 内部触发的特定事件通知给外部应用。

## 概述

为了将 OpenSIPS 内部事件通知给外部应用，**事件接口**提供了以下功能：
* 管理导出的事件
* 管理来自不同应用的订阅
* 导出用于触发事件的通用函数（与所使用的传输协议无关）
* 与不同的传输协议通信以发送事件

关于 **OpenSIPS 事件接口**的更详细信息，可参见[事件接口教程](https://docs.opensips.org/tutorials/eventinterface/)。

---

## 事件

OpenSIPS 可以导出若干类型的事件：
* **核心事件** —— 触发 OpenSIPS 核心／全局行为变化的内部事件。所导出的核心事件完整列表可参见[此处](Interface-CoreEvents.md)。
* **模块事件** —— 各模块在被加载时触发的事件。每个模块可导出零个、一个或多个事件。详细信息可参见各模块的[文档页面](Modules.md)。
* **自定义事件** —— 使用 [raise_event()](Script-CoreFunctions.md#raise-event-event-attrs-vals) 命令从脚本中触发。

---

## 传输协议

外部应用可以通过多种传输协议接收所触发事件的通知。接口本身由 OpenSIPS 核心提供，而下面每一种传输协议都由单独的 OpenSIPS 模块实现。可以同时加载多个传输模块，以提供不同的通知方式。

可用的传输协议有：

* [event_datagram](/zh/modules/event_datagram) —— 通过 UDP 或 UNIX 套接字发送数据报
* [event_flatstore](/zh/modules/event_flatstore) —— 写入纯文本文件
* [event_kafka](/zh/modules/event_kafka) —— 通过 Apache Kafka broker 发送事件
* [event_rabbitmq](/zh/modules/event_rabbitmq) —— 向 RabbitMQ 服务器发送 AMQP 消息
* [event_stream](/zh/modules/event_stream) —— 通过 TCP 发送 JSON-RPC 命令／通知
* [event_virtual](/zh/modules/event_virtual) —— 聚合多个事件后端以实现故障切换与均衡
* [event_xmlrpc](/zh/modules/event_xmlrpc) —— 通过 TCP 发送 XML-RPC 命令

外部应用可以订阅任何已导出的事件，并可通过任何已加载的传输模块／协议接收通知。另外，核心事件接口可以在不加载专用传输模块的情况下，运行与所触发事件同名的 `event_route`，例如 `event_route[E_PIKE_BLOCKED]`。

---

## 事件订阅

可以在启动时订阅事件（在脚本中使用 [subscribe_event()](Script-CoreFunctions.md#subscribe-event-string-string-int) 命令），也可以在运行期间使用 [event_subscribe](Interface-CoreMI.md#event-subscribe) MI 命令订阅。

---

## 示例

为了让 RabbitMQ 服务器在自定义事件被触发时收到通知，首先需要使用 [subscribe_event()](Script-CoreFunctions.md#subscribe-event-string-string-int) 命令订阅该事件：

```opensips

    startup_route {
        subscribe_event("E_SCRIPT_CUSTOM_EVENT", "rabbitmq:127.0.0.1/opensips");
    }

```

然后，为了从脚本中触发该事件，在需要时调用 [raise_event()](Script-CoreFunctions.md#raise-event-event-attrs-vals) 命令：

```opensips

   ....
   raise_event("E_SCRIPT_CUSTOM_EVENT");     # 触发一个不带任何参数的事件
   ...

```
