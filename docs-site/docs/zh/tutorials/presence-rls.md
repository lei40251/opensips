---
title: "呈现 RLS（资源列表服务器）"
description: "介绍 OpenSIPS 中遵循 RFC 4662 与 RFC 4826 规范的资源列表服务器（RLS）实现。"
---

OpenSIPS 有一个*资源列表服务器（Resource List Server，RLS）*实现，遵循 RFC 4662 与 RFC 4826 的规范。

* [特性](#features)
* [描述](#description)
* [配置](#configuration)
* [数据库](#database)

- - -

## 特性： {#features}

* 独立于呈现服务器（使用 SUBSCRIBE - NOTIFY 机制获取信息）
* 可与 XCAP 服务器配合用于存储
* 可处理任意事件；默认启用 '*presence*'

- - -

## 描述 {#description}

如上一节所述，RLS 服务器独立于呈现服务器。它的任务是处理以列表为目标的 **SUBSCRIBE** 消息，并为它们生成携带列表中各条目聚合状态的 **NOTIFY**。
例如，RLS 服务器可能收到 'alice' 发往其名为 'alice-list' 的好友列表的 **SUBSCRIBE** 消息。

```text
SUBSCRIBE sip:alice-list@opensips.org SIP/2.0.
Via: SIP/2.0/UDP 192.168.2.7:42521;rport;branch=z9hG4bKPjbcrHyV7gv7ksDabu36LZHlNnLEO-aXvc.
Max-Forwards: 70.
From: sip:alice@opensips.org;tag=3Rx6IkYlLyY88snX9vGQnhdUbsLk0Fck.
To: sip:alice-list@opensips.org.
Contact: <sip:0OAcbgzCkI@192.168.2.7:42521>.
Call-ID: eY-mlt.Enp1zYoMpWBBYT7rblVtStXHY.
CSeq: 9492 SUBSCRIBE.
Event: presence.
Expires: 300.
Accept: multipart/related, application/rlmi+xml, application/pidf+xml.
Allow-Events: presence.winfo, message-summary, xcap-diff, presence.
User-Agent: ag-projects/sipclient-0.3.0-pjsip-1.0-trunk.
Supported: eventlist.
Content-Length:  0.
```

处理步骤：

* 第一步是检查该订阅是否确实应由 RLS 服务器处理。  

首要条件是 'Supported' 头域中存在 '*eventlist*' 值。  

其次，列表定义必须存在于服务器上（实际上是该域的 XCAP 服务器上）。你大概已经知道，客户端把列表定义存储在 XCAP 服务器上，而 SIP RLS 服务器必须从 XCAP 服务器取回该列表。OpenSIPS 可以用两种模式与 XCAP 服务器通信 —— 你可以通过 '*integrated_xcap_server*' 参数进行配置。第一种是 XCAP 协议定义的通用方式，即通过 HTTP 请求从 XCAP 服务器获取信息。如果不设置 '*integrated_xcap_server*' 参数，服务器就在该模式下工作，但你必须用 XCAP 服务器的地址设置 '*xcap_root*' 参数（如果你使用多个 XCAP 服务器，可以多次设置）。第二种是一种更高效的特殊通信方式，以数据库作为中介：XCAP 服务器写入数据库表，RLS 服务器从那里读取。已知能够在这种模式下工作的 XCAP 服务器是 OpenXCAP。如果你在平台上使用它，可以设置 'integrated_xcap_server' 参数。  

使用与该工作模式相符的手段，RLS 服务器会查找列表定义。如果找不到，RLS 服务器将认为该 **SUBSCRIBE** 消息不是发给它的 —— 即使 Supported 头域中包含 'eventlist' —— 而应把消息转发给呈现服务器（由脚本文件完成）。当 [rls_handle_subscribe](modules/devel/rls/#func_rls_handle_subscribe)() 函数推断出该 *SUBSCRIBE* 消息可能是发给呈现服务器的，它会返回一个代码（默认值为 '10'，也可通过参数 [*to_presence_code*](modules/devel/rls/#param_to_presence_code) 配置）。正如你将在配置文件示例中看到的，在这种情况下消息应由呈现服务器处理（如果服务器与 RLS 服务器同址部署，调用 *[handle_subscribe](modules/devel/presence/#func_handle_subscribe)*() 方法；否则转发给呈现服务器）。

* 继续我们的示例，假设该列表具有如下描述：  

```xml
<?xml version="1.0" encoding="UTF-8"?>
   <rls-services xmlns="urn:ietf:params:xml:ns:rls-services"
      xmlns:rl="urn:ietf:params:xml:ns:resource-lists"
      xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
	<service uri="sip:alice-list@opensips.org">
	   <list name="alice-list">
	      <rl:entry uri="bob@opensips.org"/>
	      <rl:entry uri="claire@opensips.org"/>
           </list>
           <packages>
              <package>presence</package>
           </packages>
        </service>
   </rls-services> 
```

第二步是立即发送一个携带列表中各条目呈现信息的 **NOTIFY**。RLS 会检查自己是否已存储任何信息，并以多部分（multi-part）消息体在 **NOTIFY** 中发送这些信息。对于第一个 **SUBSCRIBE** 消息，服务器还没有存储任何信息，因此该 **NOTIFY** 不包含任何呈现状态。  

* RLS 服务器必须从呈现服务器获取呈现信息。下一步是代表 alice 针对列表中各条目（'bob' 与 'claire'）的呈现状态发送 **SUBSCRIBE** 消息。RLS 服务器之所以为列表中每个条目代表请求者发送 **SUBSCRIBE** 消息，与隐私授权规则有关。假设还有 'tom' 对另一个同样包含 'bob' 条目的列表的订阅。RLS 服务器可能因为已经代表 'alice' 发送过订阅而存储了 'bob' 的呈现状态，但它不能使用这份数据。原因是 RLS 服务器并不知道 tom 是否被允许查看 'bob' 的呈现状态，也不知道该状态是否应按 'bob' 定义的某些规则进行变换。因此，RLS 服务器必须为每个列表中的每个条目发送一条 **SUBSCRIBE**，并在构造聚合 **NOTIFY** 时只使用这些应答。  

在这种情况下，OpenSIPS RLS 服务器会向本地域的呈现服务器发送两条 **SUBSCRIBE** 消息：分别发给 'bob' 与 'claire'。如果你设置了 '*presence_server*' 参数，其中的地址将作为这些 **SUBSCRIBE** 消息的出站代理使用。随后它会从呈现服务器接收 Notify。在配置文件中很容易识别，因为它们的目标是 RLS 服务器（R-URI 中是 RLS 服务器的地址）。这应由 rls 模块调用 **[rls_handle_notify()](modules/devel/rls/#func_rls_handle_notify)** 函数来处理。

* 在收到来自呈现服务器的带状态更新的 Notify 时构造 **NOTIFY** 消息。\
  出于性能考虑，RLS 服务器在收到状态更新时不会立即发送 RL **NOTIFY**。它会等待一段可配置的时间（通过模块参数 'waiting_time'），期望在此期间收到更多更新，从而在一个 **NOTIFY** 中发送更多信息。

- - -

## 配置 {#configuration}

服务器由 **rls** 模块实现。要了解该模块所需的参数，请阅读[模块 readme](/zh/modules/rls)。

参见[配置文件示例](https://github.com/OpenSIPS/opensips/tree/master/modules/rls/samples/opensips-rls.cfg)。

- - -

## 数据库 {#database}

它在数据库中使用 2 张表：[**rls_presentity** 与 **rls_watchers**](/zh/manual/Install-DBSchema#rls)
