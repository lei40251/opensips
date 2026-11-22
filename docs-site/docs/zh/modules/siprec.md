---
title: "siprec 模块"
description: "该模块提供了使用外部录音器进行通话录音的手段 —— 记录通话的实体不在主叫与被叫之间的媒体路径中，而是完全独立的，因此它无论如何都不会影响会话质量。"
---


## 管理员指南 {#admin-guide}


### 概述 {#overview}


该模块提供了使用外部录音器进行通话录音的手段 —— 记录通话的
实体不在主叫与被叫之间的媒体路径中，而是完全独立的，
因此它无论如何都不会影响会话质量。这是以标准化方式完成的，
使用 [SIPREC 协议](https://tools.ietf.org/html/rfc7866)，因此任何实现了该协议的
录音器都可以使用它。


由于使用外部服务器来录制通话，因此对录音器的位置
没有任何限制，它可以任意部署。这为架构
配置提供了极大的灵活性，并带来多种扩展手段。


本模块的工作由 [OrecX 公司](http://www.orecx.com/) 赞助。本模块
与 OrecX 通话录音产品完全集成。


### 工作原理 {#how-it-works}


SIP 媒体录音平台的完整架构记录在
[RFC 7245](https://tools.ietf.org/html/rfc7245) 中。按照该架构，本 OpenSIPS
模块实现了一个 SRC（Session Recording Client，会话录音客户端），由它在新通话
开始时通知 SRS（Session Recording Server，会话录音服务器）
通话的参与者及其配置文件。基于这些数据，
SRS 可以决定是否应当录制该通话。


从 SIP 信令的角度看，该模块不会改变主叫与被叫之间的呼叫
流程。呼叫的建立方式与其他所有未录音的呼叫完全相同。但对于每一个
启用了 *SIPREC* 的呼叫，SRC（OpenSIPS）都会使用
[OpenSIPS Back-2-Back 模块](/zh/modules/b2b_entities) 向着 SRS 启动一个完全独立的
SIP 会话。发送给 SRS 的 *INVITE* 消息包含一个
由两部分组成的多部分消息体：


- *Recording SDP* —— 媒体服务器的 SDP，
该服务器会将 RTP *分叉* 给录音器。
- *Participants Metadata* —— 一份 XML 格式的
文档，包含参与者的相关信息。该
文档的结构在 [RFC 7865](https://tools.ietf.org/html/rfc7865) 中详细说明。


SRS 可以用否定应答回应，表示该会话
不需要录音；也可以用肯定应答（200 OK）回应，
并在 SDP 消息体中指明媒体 RTP 应当被
*发送/分叉* 到何处。当呼叫结束时，SRC 必须
向 SRS 发送 *BYE* 消息，表示
录音应当结束。


完整的呼叫流程示例可在 [RFC 8068](https://tools.ietf.org/html/rfc8068) 中找到。


### 媒体处理 {#media-handling}


由于 OpenSIPS 是 SIP 代理，其自身不具备任何媒体能力。
因此需要依赖另一个媒体服务器来捕获
RTP 流量并将其分叉到 SRS。当前实现
同时支持 [RTPProxy](http://www.rtpproxy.org/)
（通过 [RTPProxy 模块](/zh/modules/rtpproxy)）和
[RTPEngine](https://github.com/sipwise/rtpengine)
（通过 [RTEngine 模块](/zh/modules/rtpengine)）媒体
服务器。


### SRS 故障切换 {#srs-failover}


*siprec* 模块支持在多个 SRS 服务器之间进行故障切换 ——
调用 *[siprec_start_recording()](#siprec_start_recordingsrs-instance)* 函数时，
可以配置多个以逗号分隔的 SRS URI。此时，OpenSIPS
会按指定的顺序逐个尝试使用它们，直到
其中一个以肯定应答（200 OK）回应，或者
应答码属于 *[skip_failover_codes](#skip_failover_codes-string)* 正则表达式
匹配的编码。在后一种情况下，该通话完全不会被录音。


### 局限性 {#limitations}


本模块仅实现 [SIPREC RFC](https://tools.ietf.org/html/rfc7866) 中的 SRC
规范。为了获得完整的录音解决方案，还需要一个 SRS 方案，
例如 [Oreka](http://oreka.sourceforge.net/) —— 一个由
[OrecX](http://www.orecx.com/) 提供的开源项目。


尽管本模块提供了通话录音所需的全部工具，
但它并未完整实现 *SIPREC* SRC 规范的全部内容。
以下是本模块的部分局限性：


- *不会向被叫播放录音提示音* —— 由于 OpenSIPS
仍然作为代理运行，我们无法推迟主叫与被叫之间的
媒体流以播放录音提示消息。
- *无法处理由 SRS 发起的录音会话* —— 我们不支持
SRS 在对话进行中突然决定录制某个通话的场景。
- *无法向 OpenSIPS "查询" 正在进行的录音会话* ——
此项计划在后续版本中实现。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


以下模块必须在本模块之前加载：


- *TM* —— 事务模块。
- *Dialog* —— 用于跟踪通话的对话模块。
- *RTP_Relay* —— RTP 中继模块，用于控制将要分叉媒体的
媒体服务器。
- *B2B_ENTITIES* —— 用于与 SRS 通信的 Back-2-Back 模块。


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，必须安装
以下库或应用程序：


- *无*。


### 导出参数 {#exported-parameters}


#### skip_failover_codes (string) {#skip_failover_codes-string}


一个正则表达式，用于指定应当阻止模块
故障切换到新 SRS 服务器的编码。


*默认情况下，任何否定应答都会触发故障切换。*


```opensips title="设置 skip_failover_codes 参数"
...
# 遇到 408 应答码时不进行故障切换
modparam("siprec", "skip_failover_codes", "408")

# 遇到 408 或 487 应答码时不进行故障切换
modparam("siprec", "skip_failover_codes", "408|487")

# 遇到任何 3xx 或 4xx 应答码时不进行故障切换
modparam("siprec", "skip_failover_codes", "[34][0-9][0-9]")
...
		
```


### 导出事件 {#exported-events}


#### E_SIPREC_START {#e_siprec_start}


当 SIPREC 通话已建立并且某个通话开始被录音时，
会触发该事件。


参数：


- *dlg_id* —— 被录音通话的对话 id（"did"）；
- *dlg_callid* —— 被录音通话的 Call-Id；
- *callid* —— SIPREC 通话的 Call-Id（B2B id）；
- *session_id* —— 录音通话的 SIPREC UUID；
- *server* —— 处理该通话的 SIPREC 服务器；
- *instance* —— 触发该事件所对应的 SIPREC 实例；


#### E_SIPREC_STOP


当 SIPREC 通话终止时，会触发该事件。


该事件对外提供的参数与
[E_SIPREC_START](#e_siprec_start) 事件相同。


### 导出函数 {#exported-functions}


#### siprec_start_recording(srs[, instance]) {#siprec_start_recordingsrs-instance}


在初始 *INVITE* 上调用该函数，会为该通话
启用向 SRS 的通话录音。注意，这并不意味着该通话
一定会被录音 —— 它只意味着 OpenSIPS 会通知
SRS 有新通话开始，但 SRS
可能判定对这些参与者不启用录音。


> [!NOTE]
> 通话录音不会立即开始，只有在被叫
> 也提供 SDP 时（通常是在 200 OK 中，也可能在 183 Ringing 中）
> 才开始。


> [!Note]
> 如果只想在通话建立时（收到 200 OK）
> 才开始录音，则应在处理该 200 OK 的应答路由中
> 调用此函数。


参数：


- *srs*（string）—— 以逗号分隔的 SRS URI
列表。这些 URI 按指定的顺序使用。参见
[siprec srs failover](#srs-failover) 了解更多
信息。
- *instance*（string，可选）—— 用于
启动特定的 SIPREC *实例*。
未提供时，将启动 *default* 实例。


当触发内部错误且通话录音的建立失败时，该函数返回 false。
否则，如果所有内部机制都已激活，它返回 true。


该函数可在 REQUEST_ROUTE 中使用。


```opensips title="使用单个 SRS 调用 siprec_start_recording() 函数"
	...
	if (!has_totag() && is_method("INVITE")) {
		$var(srs) = "sip:127.0.0.1";
		xlog("Engage SIPREC call recording to $var(srs) for $ci\n");
		siprec_start_recording($var(srs));
	}
	...
```


```opensips title="使用多个 SRS 服务器调用 siprec_start_recording() 函数"
	...
	if (!has_totag() && is_method("INVITE")) {
		$var(srs) = "sip:127.0.0.1, sip:127.0.0.1;transport=TCP";
		xlog("Engage SIPREC call recording to servers $var(srs) for $ci in inbound group\n");
		siprec_start_recording($var(srs), "inbound");
	}
	...
```


```opensips title="为参与者使用自定义 XML 值调用 siprec_start_recording() 函数"
	...
	$xml(caller_xml) = "<nameID></nameID>";
	$xml(caller_xml/nameID.attr/aor) = "sip:6024151234@10.0.0.11:5090";
	$xml(caller_xml/nameID) = "<name>test</name>";
	$siprec(caller) = $xml(caller_xml/nameID);
	siprec_start_recording($var(srs));
	...
```


```opensips title="使用自定义头域调用 siprec_start_recording() 函数"
	...
	$siprec(headers) = "X-MY-CUSTOM_HDR: 1\r\n";
	siprec_start_recording($var(srs));
	...
```


```opensips title="使用自定义 group 与会话扩展调用 siprec_start_recording() 函数"
	...
	$var(temp) = "
```


#### siprec_pause_recording([instance])


暂停正在进行的通话的录音。应当在
对话匹配之后调用。


参数：


- *instance*（string，可选）—— 用于
暂停特定的 SIPREC *实例*。
未提供时，将暂停 *default* 实例。


该函数可在任意路由中使用。


```opensips title="使用 siprec_pause_recording()"
	...
	if (has_totag() && is_method("INVITE")) {
		if (is_audio_on_hold())
			siprec_pause_recording();
	}
	...
```


#### siprec_resume_recording([instance])


恢复正在进行的通话的录音。应当在
对话匹配之后调用。


参数：


- *instance*（string，可选）—— 用于
恢复特定的 SIPREC *实例*。
未提供时，将恢复 *default* 实例。


该函数可在任意路由中使用。


```opensips title="使用 siprec_resume_recording()"
	...
	if (has_totag() && is_method("INVITE")) {
		if (!is_audio_on_hold())
			siprec_resume_recording();
	}
	...
```


#### siprec_stop_recording([instance])


停止正在进行的通话的录音。应当对
此前已启动的 SIPREC 会话调用。


参数：


- *instance*（string，可选）—— 用于
停止特定的 SIPREC *实例*。
未提供时，将停止 *default* 实例。


该函数可在任意路由中使用。


```opensips title="使用 siprec_stop_recording()"
	...
	if (has_totag() && is_method("INVITE")) {
		if (is_audio_on_hold())
			siprec_stop_recording();
	}
	...
```


#### siprec_send_indialog([hdrs[, body]])


向 SRS 发送一个任意的对话内请求。


该函数可在任意路由中使用。


参数：


- *headers*（string，可选）—— 一组
将添加到所生成请求中的头域。
- *body*（string，可选）—— 将
添加到所生成请求中的消息体。
- *instance*（string，可选）—— 用于
在特定的 SIPREC *实例* 内发送请求。
未提供时，请求将发送到 *default*
实例中。


```opensips title="使用 siprec_send_indialog()"
	...
	if (has_totag() && is_method("INFO")) {
		siprec_send_indialog("Content-Type: $hdr(Content-Type)\r\n", $rb);
	}
	...
```


### 导出伪变量 {#exported-pseudo-variables}


#### $siprec


用于修改/描述不同的 siprec 会话
参数，这些参数应当被
[siprec_start_recording()](#siprec_start_recordingsrs-instance) 函数纳入考虑。


该变量可以按 *instance* 索引，
以针对用户想要调节的实例进行设置。如果未指定，
则修改 *default* 实例。


该变量的上下文仅限于当前正在处理的
消息 —— 它在事务或对话级别不可用。


以上任何设置都是可选的。


可配置的设置：


- *group* —— 一个不透明值，将被插入
SIPREC 消息体中，表示可用于在某些配置文件中
对通话进行分类的组名。如果缺失，则不添加组。
- *caller* —— 一个 XML 块，包含
主叫的相关信息。如果缺失，则使用初始对话的 *From* 头域
来构建该值。
- *callee* —— 一个 XML 块，包含
被叫的相关信息。如果缺失，则使用初始对话的 *To* 头域
来构建该值。
- *media* —— RTPProxy 将从中
流式传输媒体的 IP。如果缺失，
将使用 *127.0.0.1*。
	> [!NOTE]
	> *media_ip* 已被移除。
- *headers* —— 要添加到向 SRS 发送的初始请求中的
额外头域。
	> [!NOTE]
	> 多个头域之间必须以 *\r\n* 分隔，
	> 且必须以 *\r\n* 结尾。
- *socket* —— 向 SRS 发送出站请求时
应当使用的监听套接字。
- *from_uri* —— 出现在对话的
*From* 头域中的 URI。默认值为请求 URI。
	> [!NOTE]
	> 这不会影响 XML 块中的
	> *caller* 信息，
	> 后者取自初始对话。
- *to_uri* —— 出现在对话的
*To* 头域中的 URI。默认值为请求 URI。注意这不会影响
XML 块中的 *callee* 信息，
后者取自初始对话。
- *group_custom_extension* —— 一个可选的 XML 块，
包含要添加到 *group* 标签下的
自定义信息。
	> [!NOTE]
	> 如果 *group* 缺失，该
	> 值将被忽略且不会在任何地方使用。
- *session_custom_extension* —— 一个可选的 XML 块，
包含要添加到 *session* 标签下的
自定义信息。
<!-- CONTRIBUTORS -->

### 许可证 {#license}

所有文档文件（即 .md 扩展名的文件）均按 Creative Common License 4.0 授权
