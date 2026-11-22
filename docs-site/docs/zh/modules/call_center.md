---
title: "call_center 模块"
description: "Call Center 模块实现一个呼入型呼叫中心系统，包含用于对收到的呼叫进行排队的呼叫流程，以及用于接听呼叫的坐席。"
sidebar: false
---

## 管理指南 {#admin-guide}


### 概述 {#overview}


Call Center 模块实现一个呼入型呼叫中心系统，包含呼叫流程（用于对收到的
呼叫进行排队）和坐席（用于接听呼叫）。


该模块实现了排队系统、呼叫向坐席的分发、坐席管理、呼叫的话单、
呼叫分发与坐席活动的统计——基本上除（队列所需的）媒体播放之外的一切。
这部分必须由第三方媒体服务器（FreeSwitch、Asterisk 或其他）提供。


这实际上是一个联络中心，能够同时处理 RTP/音频呼叫
和（多个）MSRP/聊天呼叫。


该模块提供内置的分发逻辑（用于将呼叫/聊天发送给坐席），
同时也提供使用外部逻辑进行分发的可能
（参见 [cc_dispatch_call_to_agent](#cc_dispatch_call_to_agent) MI 命令）。


### 工作原理 {#how-it-works}


模块中的主要实体是流程（队列）和坐席。


#### 数据库表 {#db-tables}


每个实体在数据库中都有对应的表，用于数据配置——即
*cc_flows* 和 *cc_agents* 表，参见
[DB schema](/zh/manual/Install-DBSchema)。
数据在启动时加载并缓存到内存中；运行时可通过 MI 命令
重新加载（参见[导出的 MI 函数](#exported-mi-functions)
中的 *cc_reload* 命令）。


此外还有一张 *cc_cdrs* 表，用于写入
话单——该操作在呼叫结束后实时完成，涵盖所有可能的情况：
呼叫在排队时被挂断、呼叫被坐席拒绝、呼叫被坐席接受、
呼叫因错误而终止——注意，一个呼叫可能产生不止一条
话单（例如呼叫被坐席 A 拒绝，随后被重新分发并由
坐席 B 接受）。


*cc_calls* 表用于存储正在进行的呼叫，
无论其处于何种状态（排队中、发往坐席、已结束）。该表在运行时由模块
填充，并在启动时查询。此表不应
手工配置。


#### 呼叫流程 {#call-flows}


流程由一个唯一的字母数字 ID 定义——流程的主要属性
是 *技能*（skill）——技能是流程要求坐席具备
以便能够接听该呼叫的能力；*技能* 的概念是
流程与坐席之间的纽带——说明哪些坐席服务于哪些流程
		- 流程要求一项技能，而坐席提供一组技能。
匹配合格技能的坐席将自动
收到来自该流程的呼叫。


此外，流程还有 *优先级*（priority）——由于坐席
可以（基于技能）同时服务多个流程，你可以
在流程之间定义优先级——如果流程具有更高的
优先级，其呼叫在（向坐席投递和排队时）将被排在
优先级更低的流程的呼叫之前。


模块可按流程配置呼叫劝退；这
意味着当队列/流程过载时，将呼叫重定向到另一个
目的地：


- 如果队列中已有的呼叫数超过 diss_qsize_th 阈值
- 如果队列的预计等待时间超过 diss_ewt_th 阈值
- 如果呼叫在队列中等待的时间长于 diss_onhold_th 阈值


可选地，流程可以定义 *prependcid*——在
呼叫投递给坐席时添加到 CLI（Caller ID，主叫号码）的
前缀——由于一个坐席可能收到来自多个流程的呼叫，
让用户看到呼叫来自哪个队列是很重要的。


在媒体播报方面，流程定义了
*message_welcome*（可选，在
对该呼叫做任何处理之前播放）和
*message_queue*（必填，循环播放的媒体消息，
提供无限等待媒体；重要——该消息必须循环播放，
媒体服务器绝不能对其挂断。两种播报均以 SIP URI
的形式提供（必须将呼叫发送到该 URI 才能获得
播放）。


流程还有一个可选的 *max_wrapup time*（最大整理时间），
它作为每坐席/全局值的上限（流程
为其所有呼叫强制设定 wrapup 值的上限）。


#### 坐席 {#agents}


坐席由一个唯一的字母数字 ID 定义——坐席的主要属性
是其 *技能* 集合。该技能集合
将决定要接收哪些呼叫（来自哪些流程，基于
技能匹配）。


坐席可以提供对不同可选媒体类型的支持，例如
RTP/音频或 MSRP/聊天。每种受支持的媒体类型都带有
最大支持的会话数。当然，对于音频，`1`
值是硬编码的。在 SIP 侧，每种媒体类型都带有一个
*locations*（位置）。位置是一个 SIP URI，必须将
呼叫发送到该 URI 才能由该坐席接听。至少应定义一种
媒体类型。要指定坐席支持哪些媒体，
只需在其配置中定义相应的 SIP 位置。


因此，在某一时刻，一个坐席要么处理单个呼叫，
要么处理多个聊天会话。


此外，坐席有一个初始 *logstate*（登录状态）——
即是否已登录（必须已登录才能
接收呼叫）。登录状态可以在运行时通过专用 MI 命令
*cc_agent_login* 更改，参见
[导出的 MI 函数](#exported-mi-functions)。


坐席有一个可选的 *wrapup_time*（整理时间），
表示坐席（在结束一个呼叫之后）从系统获得新
呼叫之前的时间间隔。如果未为该坐席定义值，
则使用全局 *wrapup_time*。注意，如果定义了
每流程的 *max_wrapup_time*，结果值可能受其上限约束。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


以下模块必须在本模块之前加载：


- *b2b_logic* - B2bUA 模块
- *database* - 某一个 SQL DB 模块


#### 外部库或应用程序 {#external-libraries-or-applications}


加载本模块运行 OpenSIPS 之前，必须安装以下库或应用程序：


- *None*（无）。


### 导出的参数 {#exported-parameters}


#### db_url (string)


指向 DB 服务器的 SQL 地址——与具体数据库相关。它必须是
保存配置表（cc_flows、cc_agents
和 cc_calls 表）的数据库。


```opensips title="Set db_url parameter"
...
modparam("call_center", "db_url", 
	"mysql://opensips:opensipsrw@localhost/opensips")
...
```


#### acc_db_url (string)


指向 DB 服务器的 SQL 地址——与具体数据库相关。它必须是
话单表（cc_cdrs）所在的数据库。


```opensips title="Set acc_db_url parameter"
...
modparam("call_center", "acc_db_url", 
	"mysql://opensips:opensipsrw@localhost/opensips_cdrs")
...
```


#### rt_db_url (string)


指向 DB 服务器的 SQL 地址/URL（与具体数据库相关），运行时表
（非配置表）位于其中。运行时表是由 OpenSIPS
用运行时获知的数据填充的表。更具体地说，目前我们
唯一的运行时表是 “cc_calls” 表。


```opensips title="Set rt_db_url parameter"
...
modparam("call_center", "rt_db_url", 
	"mysql://opensips:opensipsrw@localhost/opensips_runtime")
...
```


#### wrapup_time (integer)


坐席在结束一个呼叫与从系统接收下一个呼叫之间
的时间。即使存在排队的呼叫，模块
在此整理间隔内也不会向坐席投递呼叫。


该值可被每坐席的值（如果定义）覆盖，
并进一步被每流程的值（如果定义）覆盖。


*默认值为 “30 秒”。*


```opensips title="Set wrapup_time parameter"
...
modparam("call_center", "wrapup_time", 45)
...
```


#### queue_pos_param (string)


用于在将呼叫发送到媒体服务器进行
onwait/queue 播放时上报等待队列位置的 SIP URI 参数
名称。位置 0 表示它是下一个要投递给坐席的
呼叫。


*默认值为 “空（无）”。*


```opensips title="Set queue_pos_param parameter"
...
modparam("call_center", "queue_pos_param", "cc_pos")
...
```


#### reject_on_no_agents (int)


该参数用于说明在没有已登录坐席时，呼入呼叫应被拒绝
还是排队。基本上，这允许在尚无坐席的流程上
对呼叫排队。


*默认值为 “1（true）”。*


```opensips title="Set reject_on_no_agents parameter"
...
modparam("call_center", "reject_on_no_agents", 0)
...
```


#### chat_dispatch_policy (string)


该参数用于说明将聊天/MSRP 会话分发给坐席时应
采用什么策略，考虑到一个坐席可以同时
处理多个此类会话/聊天。


可选值为：


- **balancing** - 分发
将尽量在坐席之间保持均衡，但这样做你可能
最终在坐席上浪费聊天会话并导致呼叫饥饿——
坐席被聊天会话部分占用，因此无法接听
呼叫（当然，前提是你有音频/聊天混合的坐席）
- **full-load** - 分发
将尽量在聊天会话方面以最佳方式使用坐席——一旦坐席
接受了一个聊天，后续所有聊天都会分配给他——其思路是
尽量高效地使用坐席的资源/会话，为呼叫留出
尽可能多的空间。当然，这可能导致聊天坐席
负载不均衡——有些会被占满，有些则空闲。


*默认值为 “balancing”。*


```opensips title="Set chat_dispatch_policy parameter"
...
modparam("call_center", "chat_dispatch_policy", "balancing")
...
```


#### internal_call_dispatching (int) {#internal_call_dispatching-int}


该参数用于说明是否应使用内置的向坐席分发呼叫
的功能。若启用，模块将（自行）自动
将排队/呼入的呼叫分发给可用坐席。
若禁用，模块不会自行进行此类分发，此时
应使用 [cc_dispatch_call_to_agent](#cc_dispatch_call_to_agent)
MI 命令将排队的呼叫分发给坐席。这允许
实现外部的、自定义的分发逻辑。该设置的
值可在运行时通过
[cc_internal_call_dispatching](#cc_internal_call_dispatching) MI 命令更改。


*默认值为 “1”（启用）。*


```opensips title="Set internal_call_dispatching parameter"
...
modparam("call_center", "internal_call_dispatching", 0)
...
```


#### cc_agents_table (string)


用于保存坐席的表名。


*默认值为 “cc_agents”。*


```opensips title="Set cc_agents_table parameter"
...
modparam("call_center", "cc_agents_table", "my_agents")
...
```


#### cca_agentid_column (string)


坐席表中 “agent id”（唯一 DB id）列的名称。


*默认值为 “agentid”。*


```opensips title="Set cca_agentid_column parameter"
...
modparam("call_center", "cca_agentid_column", "cid")
...
```


#### cca_location_column (string)


坐席表中呼叫/音频 “location”（SIP URI）列的名称。


*默认值为 “location”。*


```opensips title="Set cca_location_column parameter"
...
modparam("call_center", "cca_location_column", "sip_uri")
...
```


#### cca_msrp_location_column (string)


坐席表中 msrp/聊天 “location”（SIP URI）列的名称。


*默认值为 “msrp_location”。*


```opensips title="Set cca_msrp_location_column parameter"
...
modparam("call_center", "cca_msrp_location_column", "sip_uri")
...
```


#### cca_msrp_max_sessions_column (string)


（坐席表中）用于保存该坐席可处理的最大聊天会话数
的列名。


*默认值为 “msrp_max_sessions”。*


```opensips title="Set cca_msrp_max_sessions_column parameter"
...
modparam("call_center", "cca_msrp_max_sessions_column", "max_chats")
...
```


#### cca_skills_column (string)


坐席表中 “skills”（技能列表）列的名称。


*默认值为 “skills”。*


```opensips title="Set cca_skills_column parameter"
...
modparam("call_center", "cca_skills_column", "skills")
...
```


#### cca_logstate_column (string)


坐席表中 “logstate”（初始登录状态）列的名称。


*默认值为 “logstate”。*


```opensips title="Set cca_logstate_column parameter"
...
modparam("call_center", "cca_logstate_column", "log_state")
...
```


#### cca_wrapuptime_column (string)


坐席表中 “wrapuptime”（每坐席整理时间）列的名称。


*默认值为 “wrapup_time”。*


```opensips title="Set cca_wrapuptime_column parameter"
...
modparam("call_center", "cca_wrapuptime_column", "wtime")
...
```


#### cca_wrapupend_column (string)


坐席表中 “wrapupend”（整理结束的时间戳）列的名称。


*默认值为 “wrapup_end_time”。*


```opensips title="Set cca_wrapupend_column parameter"
...
modparam("call_center", "cca_wrapupend_column", "wrapup_ends")
...
```


#### cc_flows_table (string)


用于保存流程/队列定义的表名。


*默认值为 “cc_flows”。*


```opensips title="Set cc_flows_table parameter"
...
modparam("call_center", "cc_flows_table", "queues")
...
```


#### ccf_flowid_column (string)


流程表中 “flow id”（唯一 DB id）列的名称。


*默认值为 “flowid”。*


```opensips title="Set ccf_flowid_column parameter"
...
modparam("call_center", "ccf_flowid_column", "queue_id")
...
```


#### ccf_priority_column (string)


流程表中 “priority” 列的名称。


*默认值为 “priority”。*


```opensips title="Set ccf_priority_column parameter"
...
modparam("call_center", "ccf_priority_column", "queue_prio")
...
```


#### ccf_skill_column (string)


流程表中 “skill” 列的名称。


*默认值为 “skill”。*


```opensips title="Set ccf_skill_column parameter"
...
modparam("call_center", "ccf_skill_column", "queue_skill")
...
```


#### ccf_cid_column (string)


流程表中 “caller ID prefix”（主叫号码前缀）列的名称。


*默认值为 “prependcid”。*


```opensips title="Set ccf_cid_column parameter"
...
modparam("call_center", "ccf_cid_column", "queue_cli_prefix")
...
```


#### ccf_max_wrapup_column (string)


流程表中 “max limit for wrapup time”（整理时间上限）列的名称。


*默认值为 “max_wrapup_time”。*


```opensips title="Set ccf_max_wrapup_column parameter"
...
modparam("call_center", "ccf_max_wrapup_column", "queue_wrapup")
...
```


#### ccf_dissuading_hangup_column (string)


流程表中 “hangup after dissuading”（劝退后挂断）列的名称。


*默认值为 “dissuading_hangup”。*


```opensips title="Set ccf_dissuading_hangup_column parameter"
...
modparam("call_center", "ccf_dissuading_hangup_column", "hangup_on_dissuading")
...
```


#### ccf_dissuading_onhold_th_column (string)


流程表中 “on-hold dissuading threshold”（等待中劝退阈值）列的名称。


*默认值为 “dissuading_onhold_th”。*


```opensips title="Set ccf_dissuading_onhold_th_column parameter"
...
modparam("call_center", "ccf_dissuading_onhold_th_column", "th_diss_onhold")
...
```


#### ccf_dissuading_ewt_th_column (string)


流程表中 “EWT dissuading threshold”（EWT 劝退阈值）列的名称。


*默认值为 “dissuading_ewt_th”。*


```opensips title="Set ccf_dissuading_ewt_th_column parameter"
...
modparam("call_center", "ccf_dissuading_ewt_th_column", "th_diss_ewt")
...
```


#### ccf_dissuading_qsize_th_column (string)


流程表中 “queue size dissuading threshold”（队列长度劝退阈值）列的名称。


*默认值为 “dissuading_qsize_th”。*


```opensips title="Set ccf_dissuading_qsize_th_column parameter"
...
modparam("call_center", "ccf_dissuading_qsize_th_column", "th_diss_qsize")
...
```


#### ccf_m_welcome_column (string)


流程表中 “audio message on welcome”（欢迎音频消息）列的名称。


*默认值为 “message_welcome”。*


```opensips title="Set ccf_m_welcome_column parameter"
...
modparam("call_center", "ccf_m_welcome_column", "audio_welcome")
...
```


#### ccf_m_queue_column (string)


流程表中 “audio message on queueing”（排队音频消息）列的名称。


*默认值为 “message_queue”。*


```opensips title="Set ccf_m_queue_column parameter"
...
modparam("call_center", "ccf_m_queue_column", "audio_queue")
...
```


#### ccf_m_dissuading_column (string)


流程表中 “audio message on dissuading”（劝退音频消息）列的名称。


*默认值为 “message_dissuading”。*


```opensips title="Set ccf_m_dissuading_column parameter"
...
modparam("call_center", "ccf_m_dissuading_column", "audio_dissuading")
...
```


#### ccf_m_flow_id_column (string)


流程表中 “audio message on identifying the flow”（识别流程音频消息）
列的名称。


*默认值为 “message_flow_id”。*


```opensips title="Set ccf_m_flow_id_column parameter"
...
modparam("call_center", "ccf_m_flow_id_column", "audio_flow_id")
...
```


#### b2b_logic_ctx_param (string) {#b2b_logic_ctx_param-string}


*$b2b_logic.ctx* 变量的名称，该变量可用于
获取传给
[cc_handle_call()](#cc_handle_call-flowid-param) 函数的参数值。


该参数将被复制到由 call_center 模块启动的所有 B2B 场景中。
注意，你可以通过写入它来更改当前场景的值，
但该更改不会反映到另一个场景中。


*默认值为 “call_center”。*


```opensips title="Set b2b_logic_ctx_param parameter"
...
modparam("call_center", "b2b_logic_ctx_param", "b2b_callid")
...
route[handle_call_center] {
    ...
    cc_handle_call("flow", $ci);
    ...
}
...
route[b2b_handle_request] {
    ...
    xlog("Initial Callid is $b2b_logic.ctx(b2b_callid)\n");
    ...
}
```


### 导出的函数 {#exported-functions}


#### cc_handle_call( flowID [,param]) {#cc_handle_call-flowid-param}


该函数只能用于初始 INVITE 请求——该函数将呼叫
推入 call center 模块处理（通过某个
流程/队列）。


该函数可在 REQUEST_ROUTE 中使用。


参数：


- *flowID (string)* - 处理该呼叫的流程
ID（将呼叫推入该流程）。
- *param (string，可选)* - 一个不透明
字符串，作为参数传给 “callcenter” 和
“agent” B2B 场景。它
用于 call center 模块的自定义集成，
其值和用途完全由脚本编写者决定，
OpenSIPS 不会触碰或解释它。
你可以使用 *$b2b_logic.ctx* 变量，
以 [b2b_logic_ctx_param](#b2b_logic_ctx_param-string)
参数中定义的名字获取该参数的值。


如果呼叫被成功推入并由 Call Center 引擎处理，该函数
向脚本返回 TRUE。重要：
在此之后，你不得对呼叫进行任何信令操作（应答、中继）。


出错时，FALSE 被返回给脚本，并带有以下
返回码：


- **-1** - 无法从参数中获取流程 ID；
- **-2** - 无法解析 FROM URI；
- **-3** - 未找到具有该 FlowID 的流程；
- **-4** - 该流程中没有已登录的坐席；
- **-5** - 内部错误；


```opensips title="cc_handle_call usage"
...
if (is_method("INVITE") and !has_totag()) {
	if (!cc_handle_call("tech_support")) {
		send_reply(403,"Cannot handle call");
		exit;
	}
}
...
```


#### cc_agent_login(agentID, state)


该函数设置坐席的登录（开或关）状态。


该函数可在 REQUEST_ROUTE 中使用。


参数：


- *agentID (string)* - 坐席的 ID
- *state (int)* - 一个整型值，给出
新状态——0 表示已注销，其他任何值表示已登录。


```opensips title="cc_agent_login usage"
...
# 注销 'agentX' 坐席
cc_agent_login("agentX",0);
...
```


### 导出的统计 {#exported-statistics}


#### 全局统计 {#global-statistics}


##### ccg_incalls


收到的呼叫总数。（counter 类型）


##### ccg_awt


呼叫的全局平均等待时间。（realtime 类型）


##### ccg_load


全局负载（跨所有流程）。（realtime 类型）


##### ccg_distributed_incalls


已分发呼叫总数。（counter 类型）


##### ccg_answered_incalls


由坐席接听的呼叫（音频/RTP 和聊天/MSRP）总数。（counter 类型）


##### ccg_answered_inchats


由坐席接听的仅聊天/MSRP 呼叫总数。（counter 类型）


##### ccg_abandonned_incalls


在坐席接听之前由主叫终止的呼叫
总数。（counter 类型）


##### ccg_onhold_calls


队列中（等待中）的呼叫（音频/RTP 和聊天/MSRP）总数。（realtime 类型）


##### ccg_onhold_chats


队列中（等待中）的仅聊天/MSRP 呼叫总数。（realtime 类型）


##### ccg_free_agents


空闲坐席总数（跨所有流程）。（realtime 类型）


#### 各流程统计（每个流程一组） {#per-flow-statistics-one-set-for-each-flow}


##### ccf_incalls_flowID


该流程收到的呼叫数。（counter 类型）


##### ccf_dist_incalls_flowID


该流程中已分发的呼叫数。（counter 类型）


##### ccf_answ_incalls_flowID


来自该流程并由坐席接听的呼叫（音频/RTP 和聊天/MSRP）数。（counter 类型）


##### ccf_answ_incalls_flowID


来自该流程并由坐席接听的仅聊天/MSRP 呼叫数。（counter 类型）


##### ccf_aban_incalls_flowID


（来自该流程的）在坐席接听之前由主叫终止的
呼叫数。（counter 类型）


##### ccf_onhold_incalls_flowID


（来自该流程的）正在等待的呼叫（音频/RTP 和聊天/MSRP）数。
（realtime 类型）


##### ccf_onhold_inchats_flowID


（来自该流程的）正在等待的仅聊天/MSRP 呼叫数。
（realtime 类型）


##### ccf_queued_calls_flowID


为该流程排队的呼叫数。（realtime 类型）


##### ccf_free_agents_flowID


服务该流程的空闲坐席数。（realtime 类型）


##### ccf_etw_flowID


该流程的预计等待时间。（realtime 类型）


##### ccf_awt_flowID


该流程的平均等待时间。（realtime 类型）


##### ccg_load_flowID


该流程的负载（排队呼叫数与已登录坐席数
之比）。（realtime 类型）


#### 各坐席统计（每个坐席一组） {#per-agent-statistics-one-set-for-each-agent}


##### cca_dist_incalls_agnetID


分发给该坐席的呼叫数。（counter 类型）


##### cca_answ_incalls_agentID


由该坐席接听的呼叫（音频/RTP 和聊天/MSRP）数。（counter 类型）


##### cca_answ_inchats_agentID


由该坐席接听的仅聊天/MSRP 呼叫数。（counter 类型）


##### cca_aban_incalls_agentID


（发送给该坐席的）在坐席接听之前由主叫终止的
呼叫数。（counter 类型）


##### cca_att_agentID


该坐席的平均通话时间（realtime 类型）


### 导出的 MI 函数 {#exported-mi-functions}


#### cc_reload


从数据库重新加载流程和坐席定义的命令。


它不接受任何参数。


MI FIFO 命令用法：


```bash
opensips-cli -x mi cc_reload
```


#### cc_agent_login


将坐席登录到 Call Center 引擎的命令。


参数：


- *agent_id* - 坐席的 ID
- *state* - 新的登录状态（0 - 注销，1 - 登录）


MI FIFO 命令用法：


```bash
opensips-cli -x mi cc_agent_login agentX 0
```


#### cc_list_queue {#cc_list_queue}


列出所有排队中的呼叫的命令——对每个呼叫，将
打印以下属性：呼叫 id、主叫
用户信息、呼叫所属流程、呼叫在队列中的
时长、呼叫的 ETW、呼叫优先级
以及呼叫技能（从流程继承）。


它不接受任何参数。


MI FIFO 命令用法：


```bash
opensips-cli -x mi cc_list_queue
```


#### cc_list_flows


列出所有流程的命令——对每个流程，将
打印以下属性：流程 ID、平均呼叫
时长、已处理的呼叫数、已登录的坐席数，
以及正在进行的呼叫数。


它不接受任何参数。


MI FIFO 命令用法：


```bash
opensips-cli -x mi cc_list_flows
```


#### cc_list_agents {#cc_list_agents}


列出所有坐席的命令——对每个坐席，将
打印以下属性：坐席 ID、坐席登录状态、
坐席状态（free、wrapup、incall）以及进行中会话的信息。


它不接受任何参数。


MI FIFO 命令用法：


```bash
opensips-cli -x mi cc_list_agents
```


#### cc_list_calls


列出所有正在进行的呼叫的命令——对每个呼叫，将
打印以下属性：呼叫 ID、呼叫状态
（welcome、queued、toagent、ended）、呼叫时长、所属流程、
服务该呼叫的坐席（如有）。


它不接受任何参数。


MI FIFO 命令用法：


```bash
opensips-cli -x mi cc_list_agents
```


#### cc_dispatch_call_to_agent {#cc_dispatch_call_to_agent}


该函数将给定呼叫（从队列中）发送给给定坐席。为使
操作成功，必须满足若干条件：


- 呼叫必须在队列中
- 坐席必须已登录
- 坐席必须支持该呼叫所需的技能
- 坐席必须支持该呼叫所需的媒体（RTP/MSRP）
- 坐席必须具有所请求媒体的可用会话


它接受两个参数。


- *call_id* - 呼叫的 ID，由队列列表
MI 命令 [cc_list_queue](#cc_list_queue) 提供
- *agent_id* - 坐席的 ID，由坐席列表
MI 命令 [cc_list_agents](#cc_list_agents) 提供


> [!IMPORTANT]
> 为了使用它，你需要确保内部
> 呼叫分发已通过
> [internal_call_dispatching](#internal_call_dispatching-int) 模块参数
> 或 [cc_internal_call_dispatching](#cc_internal_call_dispatching) MI 命令被禁用。


MI FIFO 命令用法：


```bash
opensips-cli -x mi cc_dispatch_call_to_agent B2B452.dee2.33 agentX
```


#### cc_internal_call_dispatching {#cc_internal_call_dispatching}


用于检查和/或更改
[internal_call_dispatching](#internal_call_dispatching-int) 设置的命令


如果要更改该设置的值，它接受一个可选参数 `dispatching`。
值为 0 表示禁用内部分发，非零值
表示启用。


MI FIFO 命令用法：


```bash
opensips-cli -x mi cc_internal_call_dispatching 0
```


#### cc_reset_stats


重置所有类计数器统计的命令。


它不接受任何参数。


MI FIFO 命令用法：


```bash
opensips-cli -x mi cc_reset_stats
```


### 导出的事件 {#exported-events}


#### E_CALLCENTER_AGENT_REPORT


当坐席状态发生变化时触发该事件。


参数：


- *agent_id* - 坐席的 id。
- *state* - 坐席的状态：
	* offline
	* free
	* incall
	* wrapup
- *wrapup_ends* - wrapup 状态将结束的
时间戳；仅当状态为
“wrapup” 时发布
- *flow_id* - 为该坐席投递
呼叫的流程 ID；仅当状态为 “incall” 时发布


### 导出的伪变量 {#exported-pseudo-variables}


`$cc_state`
返回呼叫的状态。
可能返回的值为：
*welcome* - 正在播放欢迎消息。
*dissuading1* - 正在播放第一条劝退消息。
*dissuading2* - 正在播放第二条劝退消息。
*queue* - 呼叫在队列中。
*preagent* - 正在呼叫坐席。
*toagent* - 坐席正在通话中。

## 常见问题 {#frequently-asked-questions}


**问：在哪里可以找到更多关于 OpenSIPS 的信息？**


查看 [https://opensips.org/](https://opensips.org/)。


**问：在哪里可以就本模块提问？**


首先请检查你的问题是否已在我们的某个邮件列表中
得到解答：


关于任何稳定版 OpenSIPS 发布的邮件应发送至
users@lists.opensips.org，关于开发版本的邮件
应发送至 devel@lists.opensips.org。

如果你想保持邮件私密，请发送至
users@lists.opensips.org。


**问：如何报告 bug？**


请遵循以下地址提供的指南：
[https://github.com/OpenSIPS/opensips/issues](https://github.com/OpenSIPS/opensips/issues)。
<!-- CONTRIBUTORS -->

### 许可证 {#license}

所有文档文件（即 .md 扩展名）均按 Creative Common License 4.0 许可。
