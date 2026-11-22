---
title: "presence_dialoginfo 模块"
description: "本模块使 presence 模块内部能够处理 \"Event: dialog\"（如 RFC 4235 所定义）。"
sidebar: false
---


## 管理指南 {#admin-guide}


### 概述 {#overview}


本模块使 presence 模块内部能够处理 "Event: dialog"（如
RFC 4235 所定义）。这可用于
把对话信息（dialog-info）状态分发给已订阅的观察者。


本模块目前未实现任何授权
规则。它假设发布请求仅由
已授权的应用发出，订阅请求仅由
已授权的用户发出。因此，可以很方便地在
调用 handle_publish() 与 handle_subscribe() 函数之前，
于 OpenSIPS 配置文件中完成授权。


> [!NOTE]
> 本模块只是激活 presence 模块中对 "dialog" 的
> 处理。若要向观察者发送对话信息，还需要
> 一个向 presence 模块 PUBLISH 对话信息的来源。
> 例如可以使用 pua_dialoginfo 模块或任何外部
> 组件。这种方式允许把呈现服务器与
> 能感知对话信息的发布者（例如主代理）部署在不同的
> OpenSIPS 实例上。


本模块默认进行消息体聚合。也就是说，若 presence
模块收到了来自多个呈现体（presentity）的 PUBLISH（例如某实体有
多个对话时，pua_dialoginfo 会发送多条 PUBLISH），
模块会解析所有收到的（且仍然有效的，取决于 PUBLISH
请求中的 Expires 头域）XML 文档，并生成一个包含多个
"dialog" 元素的单一 XML 文档。这完全合法，但
遗憾的是并非所有 SIP 电话都支持，例如 Linksys SPA962 在收到
包含多个 dialog 元素的对话信息时会崩溃。这种情况下请使用
force_single_dialog 模块参数。


为更好地理解各模块如何协同工作，请参见
下图：


```c
    Main Proxy and Presence Server on the same Instance

   caller        proxy &      callee         watcher
alice@example   presence   bob@example   watcher@example
                 server
     |             |            |               |
     |             |<-------SUBSCRIBE bob-------|
     |             |--------200 OK------------->|
     |             |--------NOTIFY------------->|
     |             |<-------200 OK--------------|
     |             |            |               |
     |--INV bob--->|            |               |
     |             |--INV bob-->|               |
     |             |<-100-------|               |
     |             |            |               |
     |             |<-180 ring--|               |
     |<--180 ring--|            |               |
     |             |--          |               |
     |             |   \        |               |
     |             | PUBLISH bob|               |
     |             |   /        |               |
     |             |<-          |               |
     |             |            |               |
     |             |--          |               |
     |             |   \        |               |
     |             | 200 ok     |               |
     |             |   /        |               |
     |             |<-          |               |
     |             |--------NOTIFY------------->|
     |             |<-------200 OK--------------|
     |             |            |               |
```


- 观察者订阅 Bob 的 "Event: dialog"。
- Alice 呼叫 Bob。
- Bob 以振铃应答，dialog 模块中的对话
转为 "early" 状态。pua_dialoginfo 中的回调被执行。
pua_dialoginfo 模块创建 XML 文档，并使用
pua 模块发送 PUBLISH。（pua 模块自身使用 tm 模块
以有状态方式发送 PUBLISH）
- PUBLISH 被 presence 模块接收并处理。presence
模块更新 "presentity"。presence 模块检查该 presentity 的活跃
观察者。它把所有 XML 文档交给 presence_dialoginfo
模块，由后者聚合为单一 XML 文档。然后它把
携带该聚合 XML 文档的 NOTIFY 发送给所有活跃观察者。


也可以通过使用独立的 OpenSIPS 实例把呈现服务器与主代理
分离，如下图所示。（可以设置 pua 模块的
outbound_proxy 参数，或者确保把主代理"回环"的 PUBLISH 请求
路由到呈现服务器）。


```c
    Main Proxy and Presence Server use a separate Instance

   caller        proxy &   presence      callee         watcher
alice@example    server     server     bob@example   watcher@example
     |             |            |               |            |
     |             |<--------------------SUBSCRIBE bob-------|
     |             |-SUBSC bob->|               |            |
     |             |<-200 ok----|               |            |
     |             |---------------------200 OK------------->|
     |             |          .... NOTIFY ... 200 OK ...     |
     |             |            |               |            |
     |             |            |               |            |
     |--INV bob--->|            |               |            |
     |             |--INV bob------------------>|            |
     |             |<-100-----------------------|            |
     |             |            |               |            |
     |             |<-180 ring------------------|            |
     |<--180 ring--|            |               |            |
     |             |--PUBL bob->|               |            |
     |             |<-200 ok----|               |            |
     |             |            |--------NOTIFY------------->|
     |             |            |<-------200 OK--------------|
     |             |            |               |            |
```


已知问题：


- 即使 XML 文档没有变化，每次 NOTIFY 时
"version" 属性都会递增。这当然合法，
但并不十分明智。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


以下模块必须先于本模块加载：


- *presence*。


#### 外部库或应用程序 {#external-libraries-or-applications}


无。


### 导出的参数 {#exported-parameters}


#### force_single_dialog (int)


默认情况下，模块会把所有可用的对话信息
聚合到一个包含多个
"dialog" 元素的单一对话信息文档中。若电话不支持这种方式，
可以启用该参数。


若设置了该参数，只有当前最值得关注的对话状态
所对应的 dialog 元素会被放入
对话信息文档。因此，dialog-info 元素将只包含
一个 "dialog" 元素。算法按以下优先级顺序
（最不重要的在前）选择状态：
terminated、trying、proceeding、confirmed、early。

> [!NOTE]
> 我认为 "early" 状态比 confirmed 更有意义，因为当
> 原被叫已忙于另一次通话时，你往往仍可能
> 想接起这个呼叫。


*默认值为 "0"。*


```opensips title="Set parameter"
...
modparam("presence_dialoginfo", "force_single_dialog", 1)
...
```


### 导出的函数 {#exported-functions}


没有可在配置文件中使用的函数。
<!-- CONTRIBUTORS -->

### 许可证 {#license}

本项目的所有文档文件（即 .md 扩展名的文件）均以 Creative Common License 4.0 授权。
