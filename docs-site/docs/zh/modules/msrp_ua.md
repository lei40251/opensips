---
title: "msrp_ua 模块"
description: "该模块实现了一个用户代理，能够使用 MSRP（RFC 4976）协议建立消息会话。"
sidebar: false
---


## 管理员指南 {#admin-guide}


### 概述 {#overview}


该模块实现了一个用户代理（User Agent），能够使用 MSRP（RFC 4976）协议
建立消息会话。


通过内部 API 以及导出的脚本函数和 MI 函数，该模块
使 OpenSIPS 能够通过 SIP 建立 MSRP 会话，并作为
MSRP 端点交换消息。


该模块使用 *proto_msrp* 模块实现 MSRP 协议栈，
使用 *b2b_entities* 模块实现 SIP UAC/UAS 功能。


### 从脚本与外部 API 使用 {#usage-from-script-and-external-api}


若要从 OpenSIPS 发起一个携带 MSRP 的 SIP 呼叫，可以使用
[msrp_ua_start_session](#msrp_ua_start_session) MI 函数。或者，要用 MSRP
应答一个 SIP 会话，可以使用
[msrp_ua_answer()](#msrp_ua_answercontent_types) 脚本函数。


当 UAC 或 UAS 会话成功建立（已发送/已接收 ACK）时，
会触发 [E_MSRP_SESSION_NEW](#e_msrp_session_new) 事件。此后，
可能会收到 MSRP 消息或 Report，它们分别通过
[E_MSRP_MSG_RECEIVED](#e_msrp_msg_received) 和
[E_MSRP_REPORT_RECEIVED](#e_msrp_report_received) 事件通知。


注意，*E_MSRP_REPORT_RECEIVED* 事件既涵盖实际的 MSRP
REPORT 请求，也涵盖否定的 MSRP 事务应答以及本地发送
超时（应将其与收到的超时应答事务同样对待）。


可以使用 [msrp_ua_send_message](#msrp_ua_send_message) MI 函数
向对端发送 MSRP 消息。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


以下模块必须在本模块之前加载：


- *proto_msrp*
- *b2b_entities*


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，必须安装
以下库或应用程序：


- *无*。


### 导出参数 {#exported-parameters}


#### hash_size (int)


保存 MSRP 会话信息的哈希表大小。它是实际大小的
以 2 为底的对数值。


*默认值为 "10"*
（1024 条记录）。


```opensips title="设置 hash_size 参数"
...
modparam("msrp_ua", "hash_size", 16)
...
	
```


#### cleanup_interval (int)


为清理过期的 MSRP 会话而对会话表进行
完整遍历之间的间隔。


*默认值为 "60"。*


```opensips title="设置 cleanup_interval 参数"
...
modparam("msrp_ua", "cleanup_interval", 30)
...
	
```


#### max_duration (integer)


呼叫的最大时长。如果设为 0，则没有限制。


默认值为 12 * 3600 秒（12 小时）。


```opensips title="max_duration 参数示例"
...
modparam("msrp_ua", "max_duration", 7200)
...
```


#### my_uri (string)


OpenSIPS 端点的 MSRP URI。该 URI 会在建立会话时
向对端提供的 SDP offer 中通告，并且应当与脚本中定义的
某个 MSRP 监听地址相匹配。


URI 中的 *session-id* 部分应当省略。


如果未显式设置端口，则假定使用默认值 2855


```opensips title="my_uri 参数用法"
...
modparam("msrp_ua", "my_uri", "msrp://opensips.org:2855;tcp")
...
```


#### advertised_contact (string) {#advertised_contact-string}


在所生成的 SIP 请求中使用的 Contact。对于由 OpenSIPS
应答的会话，如果未设置该项，则会根据接收发起请求的
套接字动态构造。


使用 [msrp_ua_start_session](#msrp_ua_start_session) MI 函数时，
该参数为必填。


```opensips title="advertised_contact 参数用法"
...
modparam("msrp_ua", "advertised_contact", "sip:oss@opensips.org")
...
```


#### relay_uri (string)


用于已接受会话和已发起会话的 MSRP 中继的
URI。


MSRP 客户端的凭据通过
*uac_auth* 模块设置
*credential* 模块参数来提供。


如果未设置，则不使用中继。


```opensips title="relay_uri 参数用法"
...
modparam("msrp_ua", "relay_uri", "msrp://opensips.org:2856;tcp")
...
```


### 导出函数 {#exported-functions}


#### msrp_ua_answer(content_types) {#msrp_ua_answercontent_types}


该函数应答一个提供新 MSRP
消息会话的初始 INVITE。在使用该函数初始化
会话之后，呼叫将完全由 B2B 引擎处理。


参数：


- *content_types*（string）—— 在
*accept-types* SDP 属性中通告的内容类型。该列表中的
内容类型至少有一个必须与
对端在其 SDP offer 中提供的类型相匹配。


该函数只能从请求路由中使用。


```opensips title="msrp_ua_answer() 用法"
...
if (!has_totag() && is_method("INVITE")) {
	msrp_ua_answer("text/plain");
	exit;
}
...
```


### 导出 MI 函数 {#exported-mi-functions}


#### msrp_ua_send_message {#msrp_ua_send_message}


向对端发送一条新的 MSRP 消息。


名称：*msrp_ua_send_message*


参数


- *session_id*（string）—— MSRP 会话
标识符（MSRP URI 中的 "session-id" 部分）。
- *mime*（string，可选）—— 该消息的 MIME 内容
类型。如果缺失，将发送一条空消息。
- *body*（string，可选）—— 实际的消息
体。如果缺失，将发送一条空消息。
- *success_report*（string，可选）—— 指示是否
请求 MSRP Success Report 的字符串。可能取值
为 *yes* 或 *no*。
如果该参数缺失或被设为 "no"，SEND 请求
将不包含 Success-Report 头域。
- *failure_report*（string，可选）—— 指示是否
请求 MSRP Failure Report 的字符串。可能取值
为 *yes*、*no* 或
*partial*，由 MSRP 规定。
如果该参数缺失或被设为 "yes"，SEND 请求
将不包含 Failure-Report 头域。注意，如果缺少该头域
字段，接收端的 MSRP 端点必须将其与值为 "yes" 的
Failure-Report 头域同样对待。


MI FIFO 命令格式：


```bash
opensips-cli -x mi msrp_ua_send_message \
	session_id=5addd9e7b74fa44fbace68a4fc562293 \
	mime=text/plain body=Hello success_report=yes
	
```


#### msrp_ua_start_session {#msrp_ua_start_session}


启动一个 MSRP 会话。


如果使用该函数，
[advertised_contact](#advertised_contact-string) 为必填。


名称：*msrp_ua_start_session*


参数


- *content_types*（string）—— 在
*accept-types* SDP 属性中通告的内容类型。
- *from_uri*（string）—— 在 INVITE 中使用的
From URI。
- *to_uri*（string）—— 在 INVITE 中使用的
To URI。
- *ruri*（string）—— INVITE 的 Request URI
和目的地。


MI FIFO 命令格式：


```bash
opensips-cli -x mi msrp_ua_start_session \
	text/plain sip:oss@opensips.org \
	sip:alice@opensips.org sip:alice@opensips.org
	
```


#### msrp_ua_list_sessions


列出进行中的 MSRP 会话的信息。


名称：*msrp_ua_list_sessions*


参数


- *无*。


MI FIFO 命令格式：


```bash
opensips-cli -x mi msrp_ua_list_sessions
	
```


#### msrp_ua_end_session


终止一个进行中的 MSRP 会话。


名称：*msrp_ua_end_session*


参数


- *session_id*（string）—— MSRP 会话
标识符（MSRP URI 中的 "session-id" 部分）。


MI FIFO 命令格式：


```bash
opensips-cli -x mi msrp_ua_end_session \
	5addd9e7b74fa44fbace68a4fc562293
	
```


### 导出事件 {#exported-events}


#### E_MSRP_SESSION_NEW {#e_msrp_session_new}


当新的 MSRP 会话成功建立（已发送/已接收 ACK）时，
会触发该事件。


参数：


- *from_uri* —— 已应答 INVITE 的 SIP From 头域中的
URI。
- *to_uri* —— 已应答 INVITE 的 SIP To 头域中的
URI。
- *ruri* —— 已应答 INVITE 的 SIP Request URI。
- *session_id* —— MSRP 会话标识符
（MSRP URI 中的 "session-id" 部分）。
- *content_types* —— 对端在 *accept-types* SDP 属性中
提供的内容类型。


#### E_MSRP_SESSION_END


当进行中的 MSRP 会话被终止时（会话
过期或收到 BYE；通过
*msrp_ua_end_session* MI 函数终止会话不包含在内），会触发该事件。


参数：


- *session_id* —— MSRP 会话标识符
（MSRP URI 中的 "session-id" 部分）。


#### E_MSRP_MSG_RECEIVED {#e_msrp_msg_received}


当收到来自对端的新的、非空 MSRP SEND
请求时，会触发该事件。


参数：


- *session_id* —— MSRP 会话标识符
（MSRP URI 中的 "session-id" 部分）。
- *content_type* —— 该消息的内容类型。
- *body* —— 实际的消息体。


#### E_MSRP_REPORT_RECEIVED {#e_msrp_report_received}


该事件在以下情况被触发：


- 收到 MSRP REPORT 请求
- 收到失败的事务应答
- SEND 请求发生本地超时。


参数：


- *session_id* —— MSRP 会话标识符
（MSRP URI 中的 "session-id" 部分）。
- *message_id* —— Message-ID
头域的值。
- *status* —— Status 头域的值。
- *byte_range* —— Byte-Range 头域
的值。


## 开发者指南 {#developer-guide}


### 概述 {#overview-1}


为了应答一个携带 MSRP 的 SIP 会话，应当使用 [init_uas()](#init_uasmsg-accept_types-hdl)
函数。反之，要以 UAC 身份发起 MSRP 呼叫，
可以使用 [init_uac()](#init_uacaccept_types-from_uri-to_uri-ruri-hdl) 函数。


使用上述任一函数初始化会话后，SIP 呼叫
将由模块进一步处理，有关重要的 SIP
层事件以及所收到的 MSRP 请求和应答的通知，将通过
注册回调函数来投递。


会话建立后，可以使用 [send_message()](#send_messagesession_id-mime-body-failure_report-success_report) 函数
发送 MSRP SEND 请求；会话建立会由
*msrp_ua_notify_cb_f* 回调以
*MSRP_UA_SESS_ESTABLISHED* 事件通知。


收到的 MSRP 请求、事务应答以及本地发送超时
将通过 *msrp_ua_req_cb_f* 和
*msrp_ua_rpl_cb_f* 回调通知。


### 可用函数 {#available-functions}


#### init_uas(msg, accept_types, hdl) {#init_uasmsg-accept_types-hdl}


该函数将基于收到的 SIP INVITE
初始化一个 MSRP UA 会话。


参数含义如下：


- *struct sip_msg *msg* —— SIP 消息
- *str *accept_types* —— 要包含在 SDP offer 中的
"accept-types" 属性值。
- *struct msrp_ua_handler *hdl* —— 用于注册 SIP 层和 MSRP
层通知回调的处理程序
结构。


```c title="struct msrp_ua_handler 结构"
struct msrp_ua_handler {
	/* 本次注册的名称 */
	str *name;
	/* 传递给 msrp_req_cb 和 msrp_rpl_cb 回调的参数 */
	void *param;
	/* SIP 层通知的回调 */
	msrp_ua_notify_cb_f notify_cb;
	/* 接收 MSRP 请求的回调 */
	msrp_ua_req_cb_f msrp_req_cb;
	/* 接收 MSRP 应答的回调 */
	msrp_ua_rpl_cb_f msrp_rpl_cb;
};
```


```c title="msrp_ua_notify_cb_f 原型"
typedef int (*msrp_ua_notify_cb_f)(struct msrp_ua_notify_params *params,
	void *hdl_param);
```


```c title="struct msrp_ua_notify_params 结构"
struct msrp_ua_notify_params {
	/* 事件类型 */
	enum msrp_ua_event_type event;
	/* SIP 消息 */
	struct sip_msg *msg;
	/* MSRP_UA_SESS_ESTABLISHED 事件时为 SDP "accept-types" 属性 */
	str *accept_types;
	/* MSRP UA 会话 ID */
	str *session_id;
};
```


```c title="enum msrp_ua_event_type"
enum msrp_ua_event_type {
	/* 会话已建立（已发送/已接收 ACK） */
	MSRP_UA_SESS_ESTABLISHED = 1,
	/* 建立会话失败（否定应答/超时等） */
	MSRP_UA_SESS_FAILED,
	/* 已接收/已发送 BYE（会话超时的情况） */
	MSRP_UA_SESS_TERMINATED
};
```


```c title="msrp_ua_req_cb_f 原型"
typedef int (*msrp_ua_req_cb_f)(struct msrp_msg *req, void *hdl_param);
```


```c title="msrp_ua_rpl_cb_f 原型"
/* MSRP 事务超时将通过以 NULL 的 rpl 参数调用该回调来通知 */
typedef int (*msrp_ua_rpl_cb_f)(struct msrp_msg *rpl, void *hdl_param);
```


#### init_uac(accept_types, from_uri, to_uri, ruri, hdl) {#init_uacaccept_types-from_uri-to_uri-ruri-hdl}


该函数将通过向某个目的地发送 SIP INVITE，
初始化一个 MSRP UA 会话。


参数含义如下：


- *str *accept_types* —— 要包含在 SDP offer 中的
"accept-types" 属性值。
- *str *from_uri* —— 在 INVITE 的 From
头域中使用的 URI。
- *str *to_uri* —— 在 INVITE 的 To
头域中使用的 URI。
- *str *ruri* —— 在 INVITE 中使用的
Request URI。
- *struct msrp_ua_handler *hdl* —— 用于注册 SIP 层和 MSRP
层通知回调的处理程序
结构。


#### end_session(session_id)


该函数终止一个 MSRP 会话。


参数含义如下：


- *str *session_id* —— MSRP UA 会话 ID。


#### send_message(session_id, mime, body, failure_report, success_report) {#send_messagesession_id-mime-body-failure_report-success_report}


该函数向对端发送一个 MSRP SEND 请求。


参数含义如下：


- *str *session_id* —— MSRP UA 会话 ID。
- *str *mime* —— 该消息的 MIME 内容
类型。如果为 NULL，将发送一条空消息。
- *str *body* —— 实际的消息
体。如果为 NULL，将发送一条空消息。
- *enum msrp_failure_report_type failure_report* ——
MSRP Failure Report 类型 —— yes、no 或 partial。
- *int success_report* —— 指示是否
请求 MSRP Failure Report。


```c title="enum msrp_failure_report_type"
enum msrp_failure_report_type {
	MSRP_FAILURE_REPORT_YES,
	MSRP_FAILURE_REPORT_PARTIAL,
	MSRP_FAILURE_REPORT_NO
};
```
<!-- CONTRIBUTORS -->

### 许可证 {#license}

所有文档文件（即 .md 扩展名的文件）均按 Creative Common License 4.0 授权
