---
title: "Presence_CallInfo 模块"
description: "本模块为 OpenSIPS 提供共享呼叫外观（SCA）支持，该机制由 BroadWorks SIP Access Side Extensions Interface 规范定义。"
sidebar: false
---


## 管理员指南 {#admin-guide}


### 概述 {#overview}


本模块为 OpenSIPS 提供共享呼叫外观（shared call appearances，SCA）支持，
该机制由 BroadWorks SIP Access Side Extensions Interface 规范定义。
SCA 机制是多种增强电话业务的基础构件。话务台、线路分机
以及按键系统模拟等功能，若没有某种在各接入设备之间
共享呼叫外观的机制，就无法实现。尽管 SIP（RFC 3261）
本身并不提供支持 SCA 特性的内在语义，但当它与
「SIP 特定事件通知」（SIP Specific Event Notification）框架（RFC 3265）
的恰当实例化相结合时，这些业务就可以相当容易地
部署在分布式网络中。


共享线路是由中心控制实体（例如应用服务器）管理的
记录地址。应用服务器允许多个端点针对该记录地址
注册位置。应用服务器负责管控谁可以针对该共享线路
注册、谁不可以注册。


本模块使 "call-info" 与 "line-seize"
事件能够在 presence 模块内得到处理。它与通用事件
处理模块 presence 配合使用，负责构造 "Call-Info" 头域
并将其添加到通知事件中。


### 使用模式 {#usage-modes}


本模块有两种使用方式（取决于由谁
发布 "call-info" 数据）：


- 外部发布——"call-info" 数据
由第三方通过 SIP PUBLISH 请求送达。此模式下，
模块仅分发 SCA 信息，不生成
任何内容——必须由第三方应用向 presence 服务器
发布 "call-info" 事件。
- 内部发布——"call-info" 数据
由模块基于从 dialog 模块收到的
信息在内部生成——哪些呼叫正在使用哪条
线路/索引、呼叫处于什么状态等。此模式下没有 SIP
PUBLISH，也不需要第三方——
模块自身即可完整提供该功能，独立运行。


所用模式可通过模块参数
"disable_dialog_support_for_sca" 控制——参见下文参数
小节。


#### 外部发布 {#external-publishing}


本模块目前未实现任何授权
规则。它假定 PUBLISH 请求仅由
第三方应用发出，SUBSCRIBE 请求仅由
call-info 与 line-seize 事件的订阅者发出。因此，
可以在调用 handle_publish() 与 handle_subscribe() 函数之前，
通过 OpenSIPS 配置文件轻松完成授权。


为更好地理解模块的工作方式，请参考
下图：


```c
   caller       proxy &   callee        watcher        publisher
alice@example  presence  bob@example  watcher@example
                 server                       
     |             |           |           |              |
     |             |<-----SUBSCRIBE bob----|              |
     |             |------200 OK---------->|              |
     |             |------NOTIFY---------->|              |
     |             |<-----200 OK-----------|              |
     |             |           |           |              |
     |--INV bob--->|           |           |              |
     |             |--INV bob->|           |              |
     |             |<-100------|           |              |
     |             |<-----PUBLISH(alerting)---------------|
     |             |------200 OK------------------------->|
     |             |------NOTIFY---------->|              |
     |             |<-----200 OK-----------|              |
     |             |           |           |              |
     |             |<-180 ring-|           |              |
     |<--180 ring--|           |           |              |
     |             |           |           |              |
     |             |           |           |              |
     |             |<-200 OK---|           |              |
     |<--200 OK----|           |           |              |
     |             |<-----PUBLISH(active)-----------------|
     |             |------200 OK------------------------->|
     |             |------NOTIFY---------->|              |
     |             |<-----200 OK-----------|              |
     |             |           |           |              |

			
```


- 观察者（watcher）订阅 Bob 的 "Event: dialog"。
- Alice 呼叫 Bob。
- 发布者发布 Bob 的 "alerting" 状态。
- presence 模块接收并处理 PUBLISH。
presence 模块更新 "presentity"。
presence 模块检查该 presentity 的活跃观察者。
通过 NOTIFY SIP 请求通知活跃观察者。
- Bob 接听呼叫。
- 发布者发布 Bob 的 "active" 状态。
- presence 模块接收并处理 PUBLISH。
presence 模块更新 "presentity"。
presence 模块检查该 presentity 的活跃观察者。
通过 NOTIFY SIP 请求通知活跃观察者。


#### 内部发布 {#internal-publishing}


此模式下，模块要求 OpenSIPS 中已加载
"dialog" 模块。所有发布都会
自动完成（模块之间将通过 C API 直接交换数据）。


从 presence 的角度看，OpenSIPS 脚本必须配置
为只处理 SUBSCRIBE 请求（此模式没有 SIP 发布，
因此无需处理 PUBLISH）。所以务必
在脚本中使用 "handle_subscribe()" 函数（来自 presence 模块）。


要为某个呼叫触发（来自 dialog 模块的）内部发布，
在处理新呼叫时在脚本中使用 "sca_set_calling_line()" 或
"sca_set_called_line()" 函数。这些函数会完成所有工作
（创建对话、设置内部发布等）——你只需使用它们，
并可选地指定线路名称（如果与 SIP INVITE 中的不同）
——参见下文文档。


限制：此模式下，模块并不真正检查线路
是否存在（如已定义的那样）——它盲目信任流量；
也不检查每条线路有多少个索引。这类
信息（线路与索引）并不会预先配置到模块中，
但模块将基于 SIP 流量动态接受并处理
任意线路与索引。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


本模块加载前必须先加载以下模块：


- *presence*。
- *dialog*。


#### 外部库或应用 {#external-libraries-or-applications}


无。


### 导出的参数 {#exported-parameters}


#### call_info_timeout_notification (int)


启用或禁用 call_info 事件超时通知。


*默认值为 "1"*（启用）。


```opensips title="Set call_info_timeout_notification parameter"
...
modparam("presence_callinfo", "call_info_timeout_notification", 0)
...
			
```


#### line_seize_timeout_notification (int)


启用或禁用 line_seize 事件超时通知。


*默认值为 "0"*（禁用）。


```opensips title="Set line_seize_timeout_notification parameter"
...
modparam("presence_callinfo", "line_seize_timeout_notification", 1)
...
			
```


#### disable_dialog_support_for_sca (int)


禁用 "call-info" 事件（由 dialog 模块生成）的内部发布。
此时预期由第三方通过 SIP PUBLISH 完成发布。参见
本文开头所述的工作模式。


*默认值为 "0"*（未禁用）。


```opensips title="Set disable_dialog_support_for_sca parameter"
...
modparam("presence_callinfo", "disable_dialog_support_for_sca", 1)
...
			
```


#### line_hash_size (int)


用于控制存储线路与索引信息（内部发布模式下）的
内部哈希表大小。


该值必须为 2 的幂。若使用大量线路（>1000），
可考虑增大该值。


*默认值为 "64"*。


```opensips title="Set line_hash_size parameter"
...
modparam("presence_callinfo", "line_hash_size", 128)
...
			
```


### 导出的函数 {#exported-functions}


#### sca_set_calling_line([line])


该函数（仅用于内部发布模式）为当前新呼叫
（初始 INVITE）设置出站线路——即
用于呼出的线路。


若未提供参数，线路名称取自
INVITE 的 SIP FROM 头域。你可以通过以字符串参数形式
提供线路名称来覆盖它——注意该值必须是
SIP URI！


本函数可在 REQUEST_ROUTE 中使用。


```opensips title="sca_set_calling_line() usage"
...
	if (is_method("INVITE") and !has_totag()) {
		sca_set_calling_line();
	}
...
```


#### sca_set_called_line([line])


该函数（仅用于内部发布模式）为当前新呼叫
（初始 INVITE）设置入站线路——即
接收该呼叫的线路。


若未提供参数，线路名称取自
INVITE 的 SIP RURI。你可以通过以字符串参数形式
提供线路名称来覆盖它——注意该值必须是
SIP URI！允许使用变量。


本函数可在 REQUEST_ROUTE 中使用。


```opensips title="sca_set_called_line() usage"
...
	if (is_method("INVITE") and !has_totag()) {
		sca_set_called_line();
	}
...
```
<!-- CONTRIBUTORS -->

### 许可 {#license}

所有文档文件（即 .md 扩展名）均按 Creative Common License 4.0 授权。
