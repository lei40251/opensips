---
title: "media_exchange 模块"
description: "本模块提供了在不同 SIP 代理呼叫之间，以及与由媒体服务器发起或接收的呼叫之间交换媒体 SDP 的手段。"
sidebar: false
---

## 管理指南 {#admin-guide}


### 概述 {#overview}


本模块提供了在不同 SIP 代理呼叫之间，以及与由媒体服务器（Media Server）发起或接收的呼叫之间交换媒体 SDP 的手段。模块本身不具备任何媒体能力，它只是暴露若干原语，用于在两个或多个不同呼叫之间交换 SDP 消息体。


本模块既可以发起呼叫，把已有的 SDP 推送给媒体服务器以实现放音，或者单纯录制一段已有的 RTP；也可以取新呼叫的 SDP，并把该 SDP 注入到一个已有的代理 SIP 呼叫中。为了操作这些新呼叫（无论是模块生成的还是终结的），本模块借助 [OpenSIPS B2B entities 模块](/zh/modules/b2b_entities) 充当背靠背用户代理。


就所交换的 SDP 媒体而言，模块可以有两种不同的模式：


- *双向媒体（Two way Media）*——在此模式下，新呼叫的媒体会被推向已有呼叫的其中一个分支。这样呼叫中的一方就会与媒体服务器通话。默认情况下，呼叫的另一方会被置于保持状态，但在发起新分支时可以调整该行为。
- *分叉媒体（Fork Media）*——无论是发起还是接收的新 B2B 呼叫，都只是由媒体代理引擎分叉出一份 RTP 副本。在此模式下，代理呼叫应该在分叉呼叫开始之前就已处于 RTP 中继路径中。既可以只分叉一个媒体分支，也可以分叉两个分支。*注意：* RTPProxy 目前不支持停止媒体流，因此如果分流的呼叫终止，RTPProxy 仍会继续推流，即使对端已无人接收。


本模块可以提供不同的功能，适用于多种使用场景，例如：


- *呼叫录音*——与 [OpenSIPS SIPREC](/zh/modules/siprec) 模块类似，可用于把 RTP 媒体分叉到新的 SIP 目的地，但不带 SIPREC 载荷。
- *呼叫旁听*——可能需要呼入 OpenSIPS 并开始旁听一个已有呼叫。
- *呼叫通知音*——把来自媒体服务器的通知音注入到正在进行的呼叫参与者。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


必须先加载以下模块，才能加载本模块：


- *TM*——事务模块。
- *Dialog*——用于跟踪代理呼叫的对话模块。
- *RTP Relay*——可选，在初始呼叫使用 RTP Relay 时使用，或在使用媒体分叉模式时使用。
- *B2B_ENTITIES*——用于操作与媒体服务器之间呼叫的背靠背模块。


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，必须安装以下库或应用程序：


- *无*。


### 导出的函数 {#exported-functions}


#### media_fork_to_uri(URI[, leg][, headers][, medianum][, instance]) {#media_fork_to_uriuri-leg-headers-medianum-instance}


作为 B2B 用户代理客户端，向某个 SIP URI 发起呼叫，然后把媒体推流到 200 OK 应答中所收到的 SDP。


可以多次调用，每次调用都会创建一个新呼叫。所生成的呼叫可以通过 *instance* 参数加以区分。


参数：


- *URI*（字符串）- 要推送当前呼叫媒体的目的地
- *leg*（字符串，可选）- 将被推流的分支。可能的取值为 *caller*、*callee* 和 *both*。如果缺省，则使用对话内请求的方向。
- *headers*（字符串，可选）- 添加到所生成请求中的可选头域。
- *medianum*（整型，可选）- 在该呼叫内将被分叉的媒体流。第一个索引为 0。如果缺省，则该分支的所有媒体流都会被推流。
- *instance*（字符串，可选）- 用于标识分叉实例的唯一名称。如果缺省，则假定为 *default* 名称。


该函数可在任意路由中使用。


```opensips title="使用 media_fork_to_uri() 函数把媒体分叉到媒体服务器"
...
if (!has_totag() && is_method("INVITE"))
	media_fork_to_uri("sip:record@127.0.0.1:5080");
...
	
```


#### media_fork_from_call(callid[, leg][, medianum][, instance])


开始把由 *callid* 参数所标识的某个已有代理呼叫的媒体，推流到本请求消息体中的 SDP。


可以多次调用，每次调用都会接受一个新呼叫。这些呼叫可以通过 *instance* 参数加以区分。


参数：


- *callid*（字符串）- 要从中推流/分叉媒体的呼叫的 callid 标识
- *leg*（字符串，可选）- 将被推流的分支。可能的取值为 *caller*、*callee* 和 *both*。如果缺省，则两个分支都会被推流。
- *medianum*（整型，可选）- 在该呼叫内将被分叉的媒体流。第一个索引为 0。如果缺省，则该分支的所有媒体流都会被推流，只要消息体中包含足够多的媒体流。*注意：* RTPProxy 不做任何媒体混音，因此需要确保 INVITE 中包含足够多的 SDP 媒体流，以处理所有被选中分叉的媒体流。
- *instance*（字符串，可选）- 用于标识分叉实例的唯一名称。如果缺省，则假定为 *default* 名称。


该函数可在 REQUEST_ROUTE、BRANCH_ROUTE、FAILURE_ROUTE 和 ONREPLY_ROUTE 中使用。


> [!NOTE]
> 该呼叫的请求完全由 B2B 引擎处理。因此，运行该函数之后，请确保不要再转发该消息，否则会遇到非预期的行为。最好的做法是在运行该函数后退出处理。


```opensips title="使用 media_fork_from_call() 函数分叉一个呼叫的所有媒体流"
...
if (!has_totag() && is_method("INVITE") && $hdr(X-CallID) != NULL)
	media_fork_from_call($hdr(X-CallID));
...
	
```


```opensips title="使用 media_fork_from_call() 函数只分叉主叫的第一路媒体流"
...
if (!has_totag() && is_method("INVITE") && $hdr(X-CallID) != NULL)
	media_fork_from_call($hdr(X-CallID), "caller", 0);
...
	
```


#### media_fork_pause([leg][, medianum][, instance])


暂停一个已有的 RTP 媒体推流会话。该函数不会终止分叉呼叫，只是停止发送 RTP。它还会向媒体服务器重新发起 INVITE，以告知这一变化。


参数：


- *leg*（字符串，可选）- 将被暂停的分支。可能的取值为 *caller*、*callee* 和 *both*。如果缺省，则所有正在进行的媒体会话都会被暂停。
- *medianum*（整型，可选）- 要暂停的媒体流。第一个索引为 0。如果缺省，则与所选分支相关的所有正在进行的媒体流都会被暂停。
- *instance*（字符串，可选）- 要暂停的分叉实例。如果缺省，则所有实例都会被暂停。


该函数可在任意路由中使用。


```opensips title="使用 media_fork_pause() 函数临时停止该呼叫的全部媒体流"
...
if (has_totag() && is_method("INVITE"))
	media_fork_pause();
...
	
```


#### media_fork_resume([leg][, medianum][, instance])


恢复一个已有会话/呼叫的 RTP 媒体流。该函数依赖于此前已经启动的媒体分叉会话。


参数：


- *leg*（字符串，可选）- 将被恢复的分支。可能的取值为 *caller*、*callee* 和 *both*。如果缺省，则所有处于停止状态的已有媒体分支都会被启动。
- *medianum*（整型，可选）- 要暂停的媒体流。第一个索引为 0。如果缺省，则与所选分支相关的所有正在进行的媒体流都会被暂停。
- *instance*（字符串，可选）- 要恢复的分叉实例。如果缺省，则所有实例都会被恢复。


该函数可在任意路由中使用。


```opensips title="使用 media_fork_resume() 函数恢复先前已停止的分叉"
...
if (has_totag() && is_method("INVITE"))
	media_fork_resume();
...
	
```


#### media_exchange_from_uri(URI[, leg][, body][, headers][, nohold]) {#media_exchange_from_uriuri-leg-body-headers-nohold}


向指定的 URI 发起一个呼叫。取出应答中的 SDP 并推送到该呼叫的其中一个分支，从而在正在进行的呼叫的一方与新呼叫之间形成双向音频。默认情况下，另一方所在的分支会被置于保持状态。


可以针对对话内请求调用，例如 re-INVITE（例如把某个实体置于保持状态时），或针对 INFO 请求调用（例如由 DTMF 触发）。


参数：


- *URI*（字符串）- 用于发起新呼叫的目的地。
- *leg*（字符串，可选）- 新的媒体 SDP 将被推入的分支。可能的取值为 *caller* 和 *callee*。如果缺省，模块认为这是一个保持 re-INVITE，并交换另一分支的媒体 SDP。
- *body*（字符串，可选）- 所生成 INVITE 使用的自定义消息体。如果缺省，则使用与相关分支关联的对话中所存储的消息体。
- *headers*（字符串，可选）- 添加到所生成请求中的可选头域。
- *nohold*（整型，可选）- 若设置为 true，则不会把另一方置于保持状态。当也为另一分支生成新呼叫时，这很有用。


该函数可在任意路由中使用。


```opensips title="使用 media_exchange_from_uri() 函数从媒体服务器的呼叫中获取媒体"
...
if (has_totag() && is_method("INVITE") && is_audio_on_hold())
	media_exchange_from_uri("sip:moh@127.0.0.1:5080");
...
	
```


#### media_exchange_to_call(callid[, leg][, nohold])


把一个新呼叫所收到的 SDP 推入某个已有的代理呼叫，从而在发起该呼叫的媒体服务器与正在进行的代理呼叫的已有参与者之间形成双向音频。


参数：


- *callid*（字符串）- 要交换媒体的呼叫的 callid 标识。
- *leg*（字符串）- 将被推流的分支。可能的取值为 *caller* 和 *callee*。
- *nohold*（整型，可选）- 若设置为 true，则不会把另一方置于保持状态。当也为另一分支生成新呼叫时，这很有用。


该函数可在 REQUEST_ROUTE、BRANCH_ROUTE、FAILURE_ROUTE 和 ONREPLY_ROUTE 中使用。


> [!NOTE]
> 该呼叫的请求完全由 B2B 引擎处理。因此，运行该函数之后，请确保不要再转发该消息，否则会遇到非预期的行为。最好的做法是在运行该函数后退出处理。


```opensips title="使用 media_exchange_to_call() 函数播放通知音"
...
if (!has_totag() && is_method("INVITE") && $hdr(X-CallID) != NULL)
	media_exchange_to_call($hdr(X-CallID), "caller");
...
	
```


#### media_terminate([leg][, nohold][, instance])


终止一个正在进行的媒体会话交换，无论是仅有媒体推流，还是正在传输双向音频。如果该参与方分支涉及另一个媒体交换，则当前分支会被置于保持状态。


参数：


- *leg*（字符串，可选）- 要终止媒体交换的分支。可能的取值为 *caller* 和 *callee*。如果缺省，则使用对话内请求的方向。
- *nohold*（整型，可选）- 若设置为 true，且另一方涉及另一个媒体交换，则当前分支不再被置于保持状态。*注意：* 如果终止媒体交换的请求是对话内的 re-INVITE，该函数不会取消另一分支的保持状态，因为需要把该 re-INVITE 本身继续转发出去才能做到。通过显式设置 *nohold* 参数可以改变这一行为。
- *instance*（字符串，可选）- 只应在终止分叉实例时使用，表示要终止的实例。在终止推流会话时必须省略该参数。不过，出于回退兼容性考虑，如果缺少该参数且未找到推流会话，该命令会终止 *default* 分叉实例（如果存在）。


该函数可在任意路由中使用。


```opensips title="使用 media_terminate() 函数终止通知音"
...
if (has_totag() && is_method("INVITE") && !is_audio_on_hold())
	media_terminate();
...
	
```


#### media_handle_indialog()


查找为任一分支启动的已有媒体会话，如果找到正在进行的会话，则针对该请求执行额外的处理逻辑。例如，如果媒体是以分叉模式启动的，而该 INVITE 用于激活保持状态，那么该函数也会暂停被分叉的媒体流。


根据该函数的返回码，需要在脚本中执行额外的逻辑。可能的返回码有：


- *1* - 表示消息已被处理，但脚本中没有额外的任务需要执行。
- *-1* - 表示该呼叫没有正在进行的媒体交换或分叉，或者该请求没有需要执行的额外逻辑。
- *-2* - 表示该请求的所有额外处理都已执行完毕，且该请求不应转发给用户代理，而应被丢弃。
- *-3* - 表示发生了内部错误。


该函数可在 REQUEST_ROUTE、BRANCH_ROUTE 和 ONREPLY_ROUTE 中使用。


```opensips title="使用 media_terminate() 函数终止通知音"
...
if (has_totag() && loose_route()) {
	# 处理顺序请求
	media_handle_indialog();
	switch ($rc) {
	case -2:
		drop;
	case -1:
		xlog("no ongoing media session for $ci!\n");
	case 1:
		break;
}
...
	
```

### 导出的 MI 函数 {#exported-mi-functions}


#### media_fork_from_call_to_uri


行为与 [media_fork_to_uri()](#media_fork_to_uriuri-leg-headers-medianum-instance) 相同的 MI 命令，只是触发方式不由脚本驱动，而由外部驱动。适用于开始旁听一个呼叫。


名称：*media_fork_from_call_to_uri*


参数


- *callid*（字符串）- 其 RTP 将被推流到面向媒体服务器的新呼叫的对话的 callid
- *uri*（字符串）- 新呼叫的目的地 URI
- *leg*（字符串，可选）- 表示在新呼叫中将被推流 RTP 的参与方分支。可能的取值为 "caller"、"callee" 或 "both"。如果缺省，则两个媒体流都会被分叉
- *headers*（字符串，可选）- 要添加到出向请求的额外头域
- *medianum*（整型，可选）- 在该呼叫内将被分叉的媒体流。第一个索引为 0。如果缺省，则该分支的所有媒体流都会被推流。
- *instance*（字符串，可选）- 分叉实例的唯一名称。如果缺省，则假定为 *default* 名称。


MI FIFO 命令格式：


```bash
# 开始把一个 callid 推流到录音媒体服务器
opensips-cli -x mi media_fork_from_call_to_uri \
	callid=c6fdb0f9-47dc-495d-8d38-0f37e836a531 \
	uri=sip:record@127.0.0.1:5080
		
```


#### media_exchange_from_call_to_uri {#media_exchange_from_call_to_uri}


行为与 [media_exchange_from_uri()](#media_exchange_from_uriuri-leg-body-headers-nohold) 相同的 MI 命令，只是触发方式不由脚本驱动，而由外部驱动。适用于在呼叫过程中注入媒体通知音。


名称：*media_exchange_from_call_to_uri*


参数


- *callid*（字符串）- 其分支将与面向媒体服务器的新呼叫相混合的对话的 callid
- *uri*（字符串）- 新呼叫的目的地 URI
- *leg*（字符串）- 表示其媒体将被接入新呼叫的参与方。可能的取值为 "caller" 和 "callee"。
- *headers*（字符串，可选）- 要添加到出向请求的额外头域
- *nohold*（整型，可选）- 若设置为非零值，模块在开始媒体交换时不会把另一方置于保持状态


MI FIFO 命令格式：


```bash
# 开始向主叫播放通知音
opensips-cli -x mi media_exchange_from_call_to_uri \
	callid=c6fdb0f9-47dc-495d-8d38-0f37e836a531 \
	uri=sip:announcement@127.0.0.1:5080 \
	leg=caller
		
```


#### media_exchange_from_call_to_uri_body


与 [media_exchange_from_call_to_uri](#media_exchange_from_call_to_uri) MI 函数功能相同的 MI 命令，但还允许在出向请求中指定自定义消息体。消息体必须在必填的 *body* 参数中给出，其余参数均与 [media_exchange_from_call_to_uri](#media_exchange_from_call_to_uri) 的参数相同。


#### media_terminate


用于终止正在进行的媒体交换的 MI 命令。


名称：*media_terminate*


参数


- *callid*（字符串）- 要终止其媒体交换的对话的 callid。
- *leg*（字符串，可选）- 要为其终止媒体交换的分支。可接受的取值为 *caller*、*callee* 和 *both*。如果缺省，则所有媒体会话都会被终止。
- *nohold*（整型，可选）- 若指定且值为非零，则在另一方仍有正在进行的媒体会话时，被终止的分支不会被置于保持状态。
- *instance*（字符串，可选）- 只应在终止分叉实例时使用，表示要终止的实例。在终止推流会话时必须省略该参数。不过，出于回退兼容性考虑，如果缺少该参数且未找到推流会话，该命令会终止 *default* 分叉实例（如果存在）。


MI FIFO 命令格式：


```bash
# 终止主叫的通知音
opensips-cli -x mi media_terminate \
	callid=c6fdb0f9-47dc-495d-8d38-0f37e836a531 \
	leg=caller
```
<!-- CONTRIBUTORS -->

### 许可证 {#license}

所有文档文件（即 .md 扩展名的文件）均按 Creative Common License 4.0 许可发布。
