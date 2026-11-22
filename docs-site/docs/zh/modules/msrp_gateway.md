---
title: "MSRP 网关模块"
description: "本模块实现一个网关，用于在页面模式（SIP MESSAGE 方法）与会话模式（MSRP）即时消息之间进行转换。"
sidebar: false
---


## 管理指南 {#admin-guide}


### 概述 {#overview}


本模块实现一个网关，用于在页面模式（Page Mode，SIP MESSAGE 方法）与会话模式（Session Mode，MSRP）即时消息之间进行转换。


本模块使用 *msrp_ua* 模块的 API 实现 MSRP UAC/UAS 功能。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


在使用本模块之前必须先加载以下模块：


- *tm*
- *msrp_ua*


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，必须安装以下库或应用程序：


- *无*。


### 导出的参数 {#exported-parameters}


#### hash_size (int)


用于存储网关会话信息的哈希表大小。该值为实际大小的以 2 为底的对数值。


*默认值为 "10"*
（1024 条记录）。


```opensips title="设置 hash_size 参数"
...
modparam("msrp_gateway", "hash_size", 16)
...
		
```


#### cleanup_interval (int)


对会话表进行完整遍历以清理残留会话的间隔时间。


*默认值为 "60"。（秒）*


```opensips title="设置 cleanup_interval 参数"
...
modparam("msrp_gateway", "cleanup_interval", 60)
...
		
```


#### session_timeout (int)


自任意一侧收到最后一条消息起经过的时间（单位：秒），超过该时间后会话应被终止。


*默认值为 12 * 3600 秒（12 小时）。*


```opensips title="设置 session_timeout 参数"
...
modparam("msrp_gateway", "session_timeout", 7200)
...
		
```


#### message_timeout (int)


自收到最后一条 MESSAGE 起经过的时间（单位：秒），超过该时间后会话应被终止。


*默认值为 2 * 3600 秒（2 小时）。*


```opensips title="设置 message_timeout 参数"
...
modparam("msrp_gateway", "message_timeout", 3600)
...
		
```


### 导出的函数 {#exported-functions}


#### msrp_gw_answer(key, content_types, from, to, ruri)


该函数通过应答来自 MSRP 侧 SIP 会话的初始 INVITE 来初始化一个新的网关会话。运行该函数后，呼叫将完全由 MSRP UA 引擎处理，MSRP SEND 请求会被自动转换为 SIP MESSAGE 请求。


用于构建 MESSAGE 请求的 SIP From、To 和 RURI 坐标通过参数传给该函数。


参数：


- *key* (string) - 用于把 MESSAGE 请求与 MSRP 侧 SIP 会话关联起来的网关会话键。一个简单的做法是，基于两侧的 From 和 To URI（分别来自初始 MSRP 侧的 INVITE 与 SIP MESSAGE 请求）构建该键。
- *content_types* (string) - 在 MSRP 侧 SIP 会话的 SDP offer 中通告的内容类型。
- *from* (string) - 用于构建 SIP MESSAGE 请求的 From URI。
- *to* (string) - 用于构建 SIP MESSAGE 请求的 To URI。
- *ruri* (string) - 用于构建 SIP MESSAGE 请求的 Request-URI。


该函数只能在请求路由中使用。


```opensips title="msrp_gw_answer() 用法"
...
if (!has_totag() && is_method("INVITE")) {
	msrp_gw_answer($var(corr_key), "text/plain", $fu, $tu, $ru);
	exit;
}
...
```


#### msg_to_msrp(key, content_types)


该函数把 SIP MESSAGE 请求转换为 MSRP SEND 请求。如果之前的调用尚未建立网关会话，该函数会初始化一个新的网关会话并建立 MSRP 侧 SIP 会话。


新 MSRP 侧会话的 SIP From、To 和 RURI 坐标取自该 MESSAGE 请求，并在使用 *msrp_gw_answer* 把 MSRP SEND 转换为 SIP MESSAGE 时被镜像回去。


参数：


- *key* (string) - 用于把 MESSAGE 请求与 MSRP 侧 SIP 会话关联起来的网关会话键。一个简单的做法是，基于两侧的 From 和 To URI（分别来自初始 MSRP 侧的 INVITE 与 SIP MESSAGE 请求）构建该键。
- *content_types* (string) - 在 MSRP 侧 SIP 会话的 SDP offer 中通告的内容类型。


该函数只能在请求路由中使用。


```opensips title="msg_to_msrp() 用法"
...
if (is_method("MESSAGE")) {
	msg_to_msrp($var(corr_key), "text/plain");
	exit;
}
...
```


### 导出的 MI 函数 {#exported-mi-functions}


#### msrp_gw_list_sessions


列出正在进行的会话的信息。


名称：*msrp_gw_list_sessions*


参数


- *无*。


MI FIFO 命令格式：


```bash
opensips-cli -x mi msrp_gw_list_sessions
		
```


#### msrp_gw_end_session


终止一个正在进行的会话。


名称：*msrp_gw_end_session*


参数


- *key* (string) - 会话键


MI FIFO 命令格式：


```bash
opensips-cli -x mi msrp_gw_end_session alice@opensips.org-bob@opensips.org
		
```


### 导出的事件 {#exported-events}


#### E_MSRP_GW_SETUP_FAILED


当使用 *msg_to_msrp()* 函数而 MSRP 侧 SIP 会话建立失败时，会触发该事件。


该事件可用于在 MESSAGE 侧生成带有失败描述的消息。


参数：


- *key* - 会话键。
- *from_uri* - 在 MESSAGE 侧使用的 SIP From 头域中的 URI。
- *to_uri* - 在 MESSAGE 侧使用的 SIP To 头域中的 URI。
- *ruri* - 在 MESSAGE 侧使用的 SIP 请求 URI。
- *code* - 在 MSRP 侧收到的否定应答中的 SIP 错误码。如果 MSRP UA 会话在收到否定应答之前已过期，则该值可能为 NULL。
- *reason* - 在 MSRP 侧收到的否定应答中的 SIP 原因字符串。如果 MSRP UA 会话在收到否定应答之前已过期，则该值可能为 NULL。
<!-- CONTRIBUTORS -->

### 许可证 {#license}

本项目的所有文档文件（即 .md 扩展名的文件）均以 Creative Common License 4.0 授权。
