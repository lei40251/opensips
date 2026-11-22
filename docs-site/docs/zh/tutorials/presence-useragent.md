---
title: "呈现用户代理"
description: "从呈现角度介绍 OpenSIPS 的 SIP 用户代理支持：它可以通过 PUBLISH 请求发布多种类型的呈现信息，例如来自 Register 的状态、到 XMPP 的网关、通过 MI 发送 Publish 与 Subscribe 等。"
---

OpenSIPS 可以**从呈现（presence）的角度充当 SIP 用户代理**。这意味着它能够通过 **PUBLISH** 请求，把各种类型的呈现信息发布到已配置的 SIP 呈现服务器。

从架构上讲，呈现用户代理的核心功能由 [pua](modules/devel/pua/) 模块提供。注意，该模块并不提供任何可直接在脚本中使用的功能，而是通过内部 API 为其他按事件划分的模块提供这种 PUA 客户端支持，以便它们执行 PUA 客户端操作。

根据所要发布的信息类型，OpenSIPS 提供了一些呈现扩展，它们具备很有意思的能力：

* 对话信息 / 忙灯字段（BLF，event:dialog），通过模块 **[pua_dialoginfo](#pua_dialoginfo)**
* 通过 MI 接口发送 Publish 与 Subscribe 消息，通过模块 **[pua_mi](#pua_mi)**
* 注册状态共享（RFC 3680），通过模块 **[pua_reginfo](#pua_reginfo)**
* 从 Register 获取呈现状态，通过模块 **[pua_usrloc](#pua_usrloc)**
* 桥接线路外观（BLA，event: dialog;sla），通过模块 **[pua_bla](#pua_bla)**
* 到 XMPP 呈现的网关，通过模块 **[pua_xmpp](#pua_xmpp)**

- - -

## pua_dialoginfo

该模块通过监视对话信息并将其发布到呈现服务器，在服务器端启用 **BLF 功能**。基本上，该模块使用 [dialog](/zh/modules/dialog) 模块（一个基于 INVITE 的对话跟踪器）。它注册回调，每当 SIP 呼叫开始 / 失败 / 建立 / 终止 / 超时时，这些回调就会被调用。这些回调把对话的新状态转换为 *application/dialog-info+xml* 数据格式的文本，作为 PUBLISH 消息的消息体发送给呈现服务器。

此后剩余的工作由呈现服务器完成。在呈现服务器一侧，需要加载相应的 **[presence_dialoginfo](/zh/modules/presence_dialoginfo)** 模块来启用对该事件的处理 —— 该模块会把 *'dialog-info'* 事件注册到呈现服务器。呈现服务器将接收来自 UA 的 **SUBSCRIBE** 消息，并根据 pua_dialoginfo 模块所发送的 **PUBLISH** 消息中的信息生成 **NOTIFY**。

这里有一份[配置文件示例](https://github.com/OpenSIPS/opensips/tree/master/modules/pua_dialoginfo/samples/opensips-pua_dialoginfo.cfg)。

你可以在这里阅读[模块 readme](/zh/modules/pua_dialoginfo)。

- - -

## pua_mi

OpenSIPS 提供了通过 MI 接口向呈现服务器发布任意类型信息，或订阅某个资源呈现状态的能力。要使用该模块，至少应加载一个 [MI 后端模块](/zh/manual/Interface-MI)。

可用命令如下：

1. **[publish](/zh/modules/pua_mi#mi_publish)**

示例：

```text
opensips-cli -x mi pua_mi:publish sip:system@opensips.org 3600 presence application/pidf+xml <?xml version='1.0'?><presence xmlns='urn:ietf:params:xml:ns:pidf' xmlns:dm='urn:ietf:params:xml:ns:pidf:data-model' xmlns:rpid='urn:ietf:params:xml:ns:pidf:rpid' xmlns:c='urn:ietf:params:xml:ns:pidf:cipid' entity='system@opensips.org'><tuple id='0x81475a0'><status><basic>open</basic></status></tuple><dm:person id='pdd748945'><rpid:activities><rpid:away/>away</rpid:activities><dm:note>CPU:16 MEM:476</dm:note></dm:person></presence>
```

该示例发布一个系统（CPU/MEM）的状态。这一能力可用于许多应用，其中一个例子是通过一个虚拟 SIP 账号的呈现状态来投放并发布新闻和优惠信息。

2. **[subscribe](/zh/modules/pua_mi#mi_subscribe)**

```text
opensips-cli -x mi pua_mi:subscribe sip:system@opensips.org sip:400@opensips.org presence 3600
```

此处，*sip:400@opensips.org* 实体订阅 *sip:system@opensips.org* 实体，期限为接下来的 3600 秒，以便接收 *presence* 事件。

你可以在这里阅读[模块 readme](/zh/modules/pua_mi)。

- - -

## pua_reginfo

该模块按 RFC 3680 发布关于 *reg* 事件的信息。这可用于把注册信息状态分发给已订阅的观察者。

当有新用户在本服务器注册时（例如调用 “save()” 时），该模块会把信息 **PUBLISH** 给那些已订阅该用户 reg-info 的用户。

该模块可以向另一台服务器 **SUBSCRIBE** 信息，这样当某个用户的信息发生变化时，它就会收到 **NOTIFY** 请求。

最后，它能够处理收到的 **NOTIFY** 请求，并相应地更新本地注册表。

相关的使用场景可能包括：

* 让不同服务器之间的位置数据库保持同步
* 在用户注册时获得通知：为某账号处理离线消息存储的呈现服务器，会在该用户上线时收到通知。
* 客户端可以订阅自己的注册状态，这样当自己的账号被管理性地注销时，就能立即收到通知。

你可以在这里阅读[模块 readme](/zh/modules/pua_reginfo)。

- - -

## pua_usrloc

仍有许多 SIP 电话（尤其是硬话机）未实现呈现支持。即便如此，服务器仍能根据电话是否已注册来判断其是否在线。该模块利用这一信息，向呈现服务器发送任意电话的基本呈现信息。

**[pua_usrloc](/zh/modules/pua_usrloc)** 模块挂接在 *usrloc* 模块之上，从而“看到”用户何时注册了设备（以便将其发布为 *online*），以及何时其全部注册被删除 / 过期（以便将其发布为 *offline*）

这里有一份[配置文件示例](https://github.com/OpenSIPS/opensips/tree/master/modules/pua_usrloc/samples/opensips-pua_usrloc.cfg)。

注意：呈现服务器并非必须与 **pua_usrloc** 扩展运行在同一台机器上，因为二者之间是通过 PUBLISH SIP 消息通信的。

你可以在这里阅读[模块 readme](/zh/modules/pua_usrloc)。

- - -

## pua_bla

该模块按草案 [draft-anil-sipping-bla-03.txt](http://tools.ietf.org/draft/draft-anil-sipping-bla/draft-anil-sipping-bla-03.txt) 实现 *BLA（Bridge Line Appearance）*。

它还需要监视 **REGISTER** 消息，这意味着与 [pua_usrloc](#pua_usrloc) 类似，它必须与注册服务器部署在同一位置，或者 **REGISTER** 消息必须被转发到该服务器。
BLA 服务器作为中心实体，从各话机收集桥接线路信息，然后将其分发给注册到该线路的所有话机。
收集部分由 [pua_bla](/zh/modules/pua_bla) 模块完成，功能由 **pua** 模块提供。实现方式是：在话机注册时向其发送 **SUBSCRIBE** 消息，随后捕获来自话机的 **NOTIFY**。该 **NOTIFY** 随后被转换为 **PUBLISH** 消息并发送给呈现服务器。
分发部分由呈现服务器负责。它会接收来自话机的订阅消息，并利用 [pua_bla](/zh/modules/pua_bla) 模块所发送的已发布信息，发送携带线路状态的 **NOTIFY**。

这里有一份[配置示例](https://github.com/OpenSIPS/opensips/tree/master/modules/pua_bla/samples/opensips-pua_bla.cfg)。

你可以在这里阅读[模块 readme](/zh/modules/pua_bla)。

- - -

## pua_xmpp

该模块实现 XMPP 与 SIP 之间的呈现网关。它需要 **[pua](/zh/modules/pua)** 与 **[xmpp](/zh/modules/xmpp)** 模块。

**pua_xmpp** 模块所执行的操作包括：在 XMPP 与 SIP 之间双向转换呈现信息格式，以及处理二者在逻辑上的不兼容（SIP 基于时间，而 XMPP 不是）。
在 SIP 一侧，该模块代表 xmpp 用户发送 **SUBSCRIBE** 消息，并在脚本中捕获 **NOTIFY**。
此外，它还会检测发往 XMPP 域中用户的 **SUBSCRIBE**，并代表这些用户发送事件为 *presence.winfo* 的 **SUBSCRIBE**，以便在其他人**订阅**其呈现状态时得到通知。

这是通过在脚本中调用以下函数实现的：

* **pua_xmpp_notify()**
* **pua_xmpp_req_winfo(URI, expires)**

这里有一份[配置示例](https://github.com/OpenSIPS/opensips/tree/master/modules/pua_xmpp/samples/opensips-pua_xmpp.cfg)。

你可以在这里阅读[模块 readme](/zh/modules/pua_xmpp)。

- - -
