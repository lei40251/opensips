---
title: "事件接口"
description: "OpenSIPS 事件接口提供了一种通用方式，可在发生内部事件时通知外部应用。"
---

## 事件接口 {#event-interface}

OpenSIPS 事件接口提供了一种通用方式，可在某些事件发生时通知外部应用或 OpenSIPS 脚本逻辑。它包含两侧：一是供 OpenSIPS 核心、模块与脚本逻辑声明并触发事件的内部接口，二是供订阅者注册对事件的兴趣并在事件被触发时接收通知的订阅者接口。

---

## 概述 {#overview}

OpenSIPS 可以使用事件模块和核心路由钩子通知外部应用或内部脚本逻辑：

* [event_datagram](/zh/modules/event_datagram) —— 通过 UDP 或 UNIX 数据报套接字发送事件通知。
* [event_flatstore](/zh/modules/event_flatstore) —— 把事件通知写入扁平文件。
* [event_kafka](/zh/modules/event_kafka) —— 把事件通知发送到 Apache Kafka。
* [event_rabbitmq](/zh/modules/event_rabbitmq) —— 把事件通知发送到 RabbitMQ 服务器。
* [event_routing](/zh/modules/event_routing) —— 使用事件接口通知进行内部的基于事件的路由。
* [event_sqs](/zh/modules/event_sqs) —— 把事件通知发送到 Amazon SQS。
* [event_stream](/zh/modules/event_stream) —— 通过 TCP 流交换事件通知。
* [event_virtual](/zh/modules/event_virtual) —— 把多个事件后端归组到一个虚拟订阅者之后。
* [event_xmlrpc](/zh/modules/event_xmlrpc) —— 向 XML-RPC 服务器发出 XML-RPC 命令。
* route —— 直接在核心脚本引擎中运行 `event_route[...]` 块。

要接收事件通知，外部应用需订阅某个特定事件。这可以通过管理接口（MI）命令完成，也可以直接在 OpenSIPS 脚本中完成。订阅中指定事件名以及通知应发送到的目标。目标的格式取决于所使用的事件模块，因此请查阅模块文档以了解确切语法。

当事件被触发时，事件接口会使用所选的事件模块或路由钩子，向注册了该事件的每个订阅者发送通知。通知的消息体与投递语义是模块特有的。

---

## 事件订阅 {#event-subscription}

外部应用可以使用 MI 命令或直接在 OpenSIPS 脚本中订阅事件。MI 订阅适用于动态订阅者，而脚本订阅适用于应由 OpenSIPS 自身注册的订阅者。

### MI 订阅 {#mi-subscription}

当订阅是动态的时，外部应用应使用 MI 命令订阅事件：它订阅一段较短的时间，接收通知，然后续订或删除订阅。当前用于订阅事件的核心 MI 命令是 [evi:subscribe](/zh/manual/Interface-CoreMI)。

例如，要订阅 `E_PIKE_BLOCKED` 事件 1200 秒，一个监听 localhost UDP 端口 8888 的外部应用会发出以下 MI 命令：

```bash
$ opensips-mi evi:subscribe E_PIKE_BLOCKED udp:127.0.0.1:8888 1200
```

第一个参数是事件名，第二个参数是订阅者目标，最后一个参数是以秒表示的过期时间。如果缺少最后一个参数，则假定默认订阅期为 3600 秒。

要取消订阅某个事件，外部应用使用与订阅时相同的事件和目标，但把过期时间指定为 `0`：

```bash
$ opensips-mi evi:subscribe E_PIKE_BLOCKED udp:127.0.0.1:8888 0
```

[evi:subscribers](/zh/manual/Interface-CoreMI) MI 命令列出活跃的订阅者。它还可以按事件名和目标过滤订阅者：

```bash
$ opensips-mi evi:subscribers
$ opensips-mi evi:subscribers E_PIKE_BLOCKED
```

### 脚本订阅 {#script-subscription}

事件接口还允许脚本编写者直接从 OpenSIPS 配置脚本中订阅事件。这通常用于订阅由 OpenSIPS 管理的情形，例如某台服务器持续监听 OpenSIPS 事件并在外部处理它们。用于此目的的脚本函数是 [subscribe_event](/zh/manual/Script-CoreFunctions)。

永久订阅通常从 `startup_route` 中注册，但这并非硬性要求，因为该函数可以在任何路由中使用。

下面是一个在 OpenSIPS 启动时订阅 `E_PIKE_BLOCKED`、且不带过期时间的示例：

```opensips
startup_route() {
   subscribe_event("E_PIKE_BLOCKED", "udp:127.0.0.1:8888");
}
```

如果订阅应在 1200 秒后过期，请指定 [subscribe_event](/zh/manual/Script-CoreFunctions) 的第三个参数：

```opensips
timer_route[refresh_pike_subscription, 3600] {
   subscribe_event("E_PIKE_BLOCKED", "udp:127.0.0.1:8888", 1200);
}
```

---

## 事件 {#events}

事件有两种类型：由 OpenSIPS 核心与模块导出的静态或预定义事件，以及直接从 OpenSIPS 脚本触发的动态事件。预定义事件的几个例子如下：

* [E_PIKE_BLOCKED](/zh/modules/pike#id250185) —— 当 **pike** 模块判定某个 IP 应被封锁时触发。
* [E_RTPPROXY_STATUS](/zh/modules/rtpproxy#id293509) —— 当 RTPProxy 连接或断开时触发。
* [E_DISPATCHER_STATUS](/zh/modules/dispatcher#id293894) —— 当某个目标地址变为活跃或不活跃时，由 **dispatcher** 模块触发。
* [E_CORE_THRESHOLD](/zh/manual/Interface-CoreEvents) —— 当启用了调试瓶颈检测且超过所配置的阈值时触发。
* [E_CORE_PKG_THRESHOLD](/zh/manual/Interface-CoreEvents) —— 当私有内存用量超过所配置的阈值时触发。
* [E_CORE_SHM_THRESHOLD](/zh/manual/Interface-CoreEvents) —— 当共享内存用量超过所配置的阈值时触发。

### 事件名 {#event-names}

尽管事件接口并不强制严格的事件命名，但让事件名遵循 `E_MODULE_NAME` 格式是一种好做法，其中 `MODULE` 是导出该事件的模块名，若事件由 OpenSIPS 核心导出则为 `CORE`，若事件是从脚本触发的动态事件则为 `SCRIPT`。

### 触发事件 {#raising-an-event}

要从脚本中触发事件，使用 [raise_event](/zh/manual/Script-CoreFunctions) 函数。该函数接收一个、两个或三个参数，取决于脚本编写者的需要。如果事件没有参数，则只需事件名。

如果脚本编写者希望给事件附加额外信息，则须使用第二个参数以及可选的第三个参数。这些值存储在 AVP 中，例如：

```opensips
$avp(values) = "value1";
$avp(values) = "value2";
...
```

如果参数也有名字，则需要另一个 AVP 存储属性名。values AVP 中值的数量必须与属性的数量相同：

```opensips
$avp(attributes) = "param1";
$avp(values) = "value1";
$avp(attributes) = "param2";
$avp(values) = "value2";
...
```

下面的示例展示了如何从脚本中触发事件：

```opensips
raise_event("E_SCRIPT_EVENT");

raise_event("E_SCRIPT_EVENT", $avp(values));

raise_event("E_SCRIPT_EVENT", $avp(attributes), $avp(values));
```

[evi:raise](/zh/manual/Interface-CoreMI) MI 命令也可以通过事件接口触发事件：

```bash
$ opensips-mi evi:raise -j '{"event":"E_SCRIPT_EVENT","params":{"source":"mi"}}'
```

### 事件列表 {#events-list}

[evi:list](/zh/manual/Interface-CoreMI) MI 命令列出所有可用的事件：

```bash
$ opensips-mi evi:list
```

### 示例 {#examples}

动态事件的一个实际用例是：当 TCP 负载高于 80% 时从脚本中触发事件：

```opensips
route[TCP_LOAD_CHECK] {
   if ($stat(tcp-load) > 80) {
      # 触发事件，指定阈值与实际负载
      $avp(attrs) = "limit";
      $avp(vals) = 80;
      $avp(attrs) = "load";
      $avp(vals) = $stat(tcp-load);

      raise_event("E_SCRIPT_TCP_LOAD", $avp(attrs), $avp(vals));
   }
}
```

动态事件也可用于计费目的。例如，你可以用三种动态事件来通知外部应用某个呼叫的状态：

```opensips
# 该路由初始化计费变量
route[ACC_VARS] {
   # 首先清理此前可能残留的内容
   $avp(attrs) := NULL;
   $avp(vals) := NULL;
   $avp(attrs) = "from";
   $avp(vals) = $fU;
   if (has_totag()) {
      $avp(attrs) = "to";
      $avp(vals) = $rU;
   }
   ...
   $avp(attrs) = "callid";
   $avp(vals) = $ci;
   # 用你需要的额外信息填充 attrs 与 vals
}

route {
   ...
   if (!has_totag() && is_method("INVITE")) {
      route(ACC_VARS);
      raise_event("E_SCRIPT_CALL_START", $avp(attrs), $avp(vals));
      t_on_reply("acc");
   } else if (is_method("CANCEL|BYE")) {
      route(ACC_VARS);
      raise_event("E_SCRIPT_CALL_STOP", $avp(attrs), $avp(vals));
   }
   ...
}

onreply_route[acc] {
   ...
   if (t_check_status("200")) {
      route(ACC_VARS);
      raise_event("E_SCRIPT_CALL_ESTABLISHED", $avp(attrs), $avp(vals));
   }
   ...
}
```

---

## 事件模块与核心路由 {#event-modules-and-core-routes}

有若干事件模块可用于通知外部应用，或把事件接口通知接入其他 OpenSIPS 子系统。

### 数据报消息 {#datagram-messages}

当 OpenSIPS 内部事件被触发时，可以使用 UDP 或 UNIX 数据报通知外部应用。这让程序员可以用自己偏好的编程语言编写一个简单的 UDP 或 UNIX 数据报服务器，接收通知并处理它。

要支持这种通信方式，请加载 [event_datagram](/zh/modules/event_datagram) 模块。有关订阅套接字与封装格式的更多信息，请查阅模块文档页面。

### Flatstore 日志 {#flatstore-logs}

[event_flatstore](/zh/modules/event_flatstore) 模块把事件通知及其参数写入文本文件。当事件需要稍后由日志处理器或其他本地工具消费时，它很有用。

### Kafka 消息 {#kafka-messages}

[event_kafka](/zh/modules/event_kafka) 模块把事件通知发送到 Apache Kafka。当 OpenSIPS 事件需要与基于 Kafka 的处理流水线集成时，可以使用它。

### RabbitMQ 消息 {#rabbitmq-messages}

OpenSIPS 可以使用 AMQP 消息与 [RabbitMQ](http://www.rabbitmq.com/) 服务器通信。这种通信方式利用了该服务器提供的队列特性。

[event_rabbitmq](/zh/modules/event_rabbitmq) 模块提供该功能。在这种情况下，RabbitMQ 服务器就是事件后端，因此订阅通常由 OpenSIPS 脚本或某个独立的控制应用来管理。更多信息请查阅模块文档页面。

### 事件路由 {#event-routing}

[event_routing](/zh/modules/event_routing) 模块提供基于事件的路由能力。当 SIP 处理需要等待、响应事件接口通知，或基于其触发逻辑时，它很有用。

不要把这个模块与核心的 `event_route[...]` 处理块混淆。旧的 route 能力现在已是 OpenSIPS 核心的一部分，并在下文描述。

### SQS 消息 {#sqs-messages}

[event_sqs](/zh/modules/event_sqs) 模块把事件通知发送到 Amazon SQS。当 OpenSIPS 事件需要由托管在 AWS 上的工作进程或队列消费时，可以使用它。

### 流消息 {#stream-messages}

[event_stream](/zh/modules/event_stream) 模块通过 TCP 流交换事件通知。它适用于与 OpenSIPS 保持持久 TCP 连接的应用。

### 虚拟订阅者 {#virtual-subscribers}

[event_virtual](/zh/modules/event_virtual) 模块把多个事件后端归组到一个虚拟订阅者之后。它可用于在真实事件订阅者之间做扇出、负载均衡或提供故障切换。

### XML-RPC 命令 {#xml-rpc-commands}

OpenSIPS 还可以在事件被触发时执行远程 XML-RPC 命令。负责事件接口与 XML-RPC 服务器之间通信的模块是 [event_xmlrpc](/zh/modules/event_xmlrpc)。

### 核心事件路由 {#core-event-routes}

OpenSIPS 可以使用 [event_route](/zh/manual/Script-Routes) 块直接从脚本中处理事件。这让脚本编写者无需使用外部传输模块即可对事件接口通知做出反应。路由名指定了该路由所处理的事件。

较旧的示例可能会使用 `fetch_event_params()` 函数来获取事件参数。该函数已被废弃，随后被移除。在当前 OpenSIPS 版本中，请在事件路由内从 `$params` 变量读取事件参数。

例如，要处理 `E_PIKE_BLOCKED` 事件并打印被封锁的 IP，OpenSIPS 脚本可以包含以下代码：

```opensips
event_route[E_PIKE_BLOCKED] {
   xlog("IP $params(ip) has been blocked\n");
}
```

定义 `event_route` 会自动让该路由订阅该事件，因此该路由无需再进行显式的外部订阅或脚本订阅。

---

## 旧版本说明 {#older-version-notes}

### MI 命令名 {#mi-command-names}

> [!IMPORTANT]
> `evi:*` MI 命名空间是在 OpenSIPS 4.0 中引入的。较旧的版本使用先前的扁平 MI 命令名。

| 4.0+ MI 命令 | 旧版 MI 命令 |
| --- | --- |
| `evi:subscribe` | `event_subscribe` |
| `evi:list` | `events_list` |
| `evi:subscribers` | `subscribers_list` |
| `evi:raise` | `raise_event` |

### 事件路由参数 {#event-route-parameters}

`fetch_event_params()` 函数在 OpenSIPS 3.0 中被移除。较旧的 `event_route[...]` 示例可能会用它把事件参数复制到脚本变量中。当前版本应直接从 `$params(name)` 读取事件参数。

### OpenSIPS 1.8 {#opensips-18}

OpenSIPS 1.8 使用相同的事件接口概念，只是使用该分支中可用的事件模块与 MI 命令名。对于 1.8 部署，请加载受支持的事件传输模块，通过 MI 或脚本中的 `subscribe_event()` 订阅事件，并使用 `raise_event()` 触发脚本事件。

对于 1.8 的 MI 订阅，请使用 `event_subscribe <event> <destination> [expires]`；把 `expires` 设为 `0` 即删除订阅。不要混淆旧的 MI `raise_event` 命令与脚本函数 `raise_event()`，后者仍是上面展示的脚本侧 API。
