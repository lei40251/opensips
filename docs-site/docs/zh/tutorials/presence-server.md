---
title: "呈现服务器"
description: "本教程介绍如何将 OpenSIPS 配置为完整的 SIP 呈现服务器，并给出基础版、集成 XCAP 与外部 XCAP 三种场景的配置文件。"
---

OpenSIPS 能够充当完整的 SIP **呈现服务器（Presence Server）** —— 在 SIP 各方之间共享呈现信息。这意味着从不同来源**接收呈现信息**（通常通过 **PUBLISH** 请求），对这些信息进行可能的**处理**，最后**将其分发给**对这类信息感兴趣的其它方 —— 这些方被称为观察者（watcher）或订阅者，通过 **SUBSCRIBE**/**NOTIFY** 机制完成。  

呈现信息可能有多种类型，例如状态信息（在线、离线、忙碌等）、通话信息（是否在通话中）、特性信息（某些特性是否启用）。

## 呈现服务器关键能力 {#presence-server-key-capabilities}

* **可扩展** —— 由于采用分层架构，服务器可轻松添加需要处理的新事件
* **快速缓存**，并周期性更新数据库 —— 可以配置回退到数据库模式，这在同一个域使用多台服务器时很有用
* **基于 XCAP 存储的隐私规则** —— 一种更快的集成式 xcap 模式，使用数据库作为与 XCAP 服务器交互的接口（可与 OpenXCAP 配合使用）

- - -

## 呈现服务器架构 {#presence-server-architecture}

![presence schema](/public/uploads/presence-schema.jpg "Presence architecture")

- - -

## 模块 {#modules}

### PRESENCE 模块 {#the-presence-module}

[PRESENCE 模块](/zh/modules/presence) —— 这是呈现服务引擎的核心组件。该模块是一个通用的、与事件包无关的订阅、发布处理器与通知生成器，遵循 RFC 3265 与 3903。

该模块通过 [handle_subscribe()](modules/devel/presence/#func_handle_subscribe) 函数处理 **SUBSCRIBE** 请求，从而维护所有活动订阅（对接收呈现信息感兴趣的 SIP 实体）。

当通过 **PUBLISH** 请求、经由 [handle_publish()](modules/devel/presence/#func_handle_publish) 函数收到新的呈现信息时，模块将匹配感兴趣的订阅者，并通过 **NOTIFY** 请求更新它们。 

因此，PRESENCE 模块提供了在 SIP 实体之间共享/交换呈现信息的方式（相对于实际载荷而言较为无关）。

### EVENT 模块 {#the-event-modules}

在接收与共享呈现信息之间，OpenSIPS 呈现服务器还能处理（操作）呈现信息。为了理解各类呈现信息，OpenSIPS 提供了面向事件的模块 —— 这些模块能够读取、合并或修改所交换的呈现信息：

* [PRESENCE_XML](/zh/modules/presence_xml) —— 处理 *presence*（RFC 3856）、*presence.winfo*（RFC 3857）、*dialog;sla* 等事件的 XML 消息体。
* [PRESENCE_MWI](/zh/modules/presence_mwi) —— 针对 notify-subscribe *message-summary*（消息等待指示）的专门处理（RFC 3842）
* [PRESENCE_DIALOGINFO](/zh/modules/presence_dialoginfo) —— 处理 *dialog* 事件（如 RFC 4235 所定义）
* [PRESENCE_CALLINFO](/zh/modules/presence_callinfo) —— 处理共享呼叫外观（SCA），如 BroadWorks SIP Access Side Extensions Interface 规范所定义。
* [PRESENCE_DFKS](/zh/modules/presence_dfks) —— 处理 *as-feature-event* 事件包（如 Broadsoft 的 Device Feature Key Synchronization 协议所定义）
* [PRESENCE_REGINFO](/zh/modules/presence_reginfo) —— 处理 *reg* 事件（如 RFC 3680 所定义）
* [PRESENCE_XCAPDIFF](/zh/modules/presence_xcapdiff) —— 处理 *xcap-diff* 事件

### CONTROL 模块 {#the-control-modules}

[XCAP 模块](/zh/modules/xcap)负责存储并应用/检查 XCAP 规则 —— 这些规则规定了谁可以被允许查看某人的呈现信息。

[XCAP_CLIENT 模块](/zh/modules/xcap_client)为 OpenSIPS 实现了 XCAP 客户端 —— 一种从 OpenSIPS 之外获取 XCAP 规则的方式。它通过发送 HTTP GET 请求获取 XCAP 元素，既可以是完整文档，也可以是文档的一部分。

> [!NOTE]
> XCAP_CLIENT 模块提供了内部 API，可用于构建其他需要 XCAP 访问的模块，详见[此处](https://docs.opensips.org/tutorials/presence-xcapclient/)。  

- - -

## 配置文件 {#configuration-files}

上面的架构图展示的是完整/最大化的配置与部署，其中 (a) 未施加任何限制，(b) 启用了隐私许可规则处理，(c) 使用通用 XCAP 服务器。 
也可以根据自定义需求简化和调整部署。为此可以配置相关模块，使某些连接被移除或出现其他连接。

### 基础呈现服务器 {#basic-presence-server}

最简单的配置是不带隐私规则的呈现服务器：任何人都有权查看任何人的呈现状态，也不需要 XCAP 服务器。这种情况下 XCAP 部分从架构图中消失。该运行模式通过设置 [force_active](/zh/modules/presence_xml#param_force_active) 标志位来配置，它是 [presence_xml](/zh/modules/presence_xml) 模块的模块参数。  

可以在[此处查看该场景完整的可用配置文件](https://github.com/OpenSIPS/opensips/tree/master/modules/presence/samples/opensips-presence-basic.cfg)。

### 集成 XCAP 的呈现服务器 {#presence-server-with-integrated-xcap}

如果你希望启用呈现隐私规则，并且使用 XCAP 服务器，但该服务器通过数据库表与 OpenSIPS 呈现服务器通信（例如 OpenXCAP），那么可以把呈现服务器配置为集成 xcap 服务器模式。为此需要设置 [presence_xml](/zh/modules/presence_xml) 模块的 [integrated_xcap_server](/zh/modules/presence_xml#param_integrated_xcap_server) 参数。这种情况下架构图会简化：移除 **xcap_client** 模块，[presence_xml](/zh/modules/presence_xml) 模块只与数据库通信。

你会注意到配置文件中还加载了 [mi_xmlrpc](/zh/modules/mi_xmlrpc_ng) 模块。需要激活 MI 接口，以便当呈现规则文档发生变化时 OpenXCAP 能够通知 OpenSIPS。这样改动才能立即生效。这种情况下发送的 MI 命令是 [refresh_watchers](modules/devel/devel/presence/#mi_refresh_watchers)。  

可以在[此处查看该场景完整的可用配置文件](https://github.com/OpenSIPS/opensips/tree/master/modules/presence/samples/opensips-presence-xcap.cfg)。

### 使用外部 XCAP 的呈现服务器 {#presence-server-with-external-xcap}

如果你决定使用带隐私授权的呈现服务器，而不使用集成式 xcap 服务器，这种情况下也可以做一项改进。对于非集成的 XCAP 服务器，必须使用 [xcap_client](modules/devel/xcap_client) 模块，并且必须通过 [presence_xml](/zh/modules/presence_xml) 模块的 [xcap_server](modules/devel/presence_xml/#param_xcap_server) 参数设置服务器（可能有多台）的地址。

**xcap_client** 模块的任务是从 XCAP 服务器获取 XCAP 文档并存入数据库。该模块还可以被要求将数据库中保存的文档与服务器上的文档进行同步。为此需要一种检测更新的手段。适用于所有 XCAP 服务器的通用手段是周期性查询。不过也存在由服务器向模块通知更新的可能。为此，模块必须能够在更新发生时发送 [refreshXcapDoc](modules/devel/xcap_client/#mi_refreshXcapDoc) MI 命令。如果你使用的 XCAP 服务器能够发送该命令，就可以把服务器配置为无周期性查询模式。为此需要将 [xcap_client](modules/devel/xcap_client) 模块的 [periodical_query](/zh/modules/xcap_client#param_query_period) 参数设置为 0，以取消该功能。

- - -

## 数据库 {#database}

呈现服务器需要[数据库中的 4 张表](/zh/manual/Install-DBSchema#presence)：

* **active_watchers**：存储活动的 Subscribe 对话
* **presentity**：存储已发布的信息
* **watchers**：存储观察者的订阅状态
* **xcap**：存储 XCAP 文档

前三张表仅供服务器内部使用。**xcap** 表要么用作 XCAP 服务器与 OpenSIPS 之间的通信接口（如果服务器工作在 [integrated_xcap_server](/zh/modules/presence_xml#param_integrated_xcap_server) 模式），要么用作 **xcap_client** 模块（填充该表）与 **presence_xml** 模块（使用该信息）之间的通信手段。
