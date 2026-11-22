---
title: "rtp_relay 模块"
description: "本模块旨在简化在 OpenSIPS 脚本中使用各种 RTP 中继服务器（如 RTPProxy、RTPEngine、Media Proxy）的方式，并提供依赖 RTP 中继的各种复杂功能（如媒体重新锚定）。"
sidebar: false
---


## 管理指南 {#admin-guide}


### 概述 {#overview}


本模块旨在简化在 OpenSIPS 脚本中使用各种
RTP 中继服务器（如 RTPProxy、RTPEngine、Media Proxy）
的方式，并提供依赖 RTP 中继的各种复杂
功能（如媒体重新锚定）。


本模块提供了这样的逻辑：在初始 INVITE 期间为呼叫引入
特定的 RTP 中继，随后由本模块处理与 RTP 中继之间的
全部通信，直至呼叫终止。


此外，可以指定各种标志位来改变 RTP 引擎使用
各用户代理 SDP 的方式 —— 这些标志位在整个 RTP 会话期间
保持不变，并用于后续的对话中请求。这些标志位可在
初始 INVITE 时通过
[$rtp_relay](#rtp_relay) 和/或
[$rtp_relay_peer](#rtp_relay_peer) 变量指定，
随后随 RTP 中继上下文一同传递，直到
呼叫结束。它们也可以在顺序的对话中请求期间被修改。


本模块并非直接与 RTP 中继通信的独立模块，
而是一个通用接口，能够与
各具体 RTP 中继交互的模块
（如 *rtpproxy* 或 *rtpengine*）
协作，并实现其特定的通信协议。


### 多分支 {#multiple-branches}


本模块能够以不同的标志位组合为多个分支处理 RTP 中继。
每个分支的标志位可通过
[$rtp_relay](#rtp_relay) 变量调整 —— 若该变量
在主路由中配置，则其标志位会被所有后续分支
继承，除非针对某分支单独修改。
要修改特定分支，需将期望的
分支索引指定为变量索引
（即 *$(rtp_relay[1]) = "cor"*）。
在分支路由中配置时，标志位仅对
该特定分支生效。


从 OpenSIPS 3.3 开始，可根据分支参与者的
to_tag 来标识分支。当在 B2B 模式下
使用 *rtp_relay*、无法再简单通过索引
标识对端时，该特性尤为方便。不过，该
特性在对话场景中同样可用。


多分支行为由后端引擎按其能力
以不同方式处理。例如，
*rtpengine* 原生支持带多个分支的呼叫，
而对于 *rtpproxy*，每个分支都在具有不同
call-id 的不同会话中被模拟。


当呼叫被应答且仅剩一个分支处于活动状态时，
其他所有分支都会被销毁，只有已建立的
分支在整个呼叫期间保持活动。


### RTP Relay 引擎 {#rtp-relay-engines}


本模块本身不执行任何 SDP 改写，它只是
所支持的各后端的启用器，例如 RTPProxy
或 RTPEngine。这些后端被称为 RTP Relay 引擎，在引入
RTP 中继时需要指定。


从 OpenSIPS 3.6 开始，本模块新增了内部
RTP 引擎，可在一组 RTP 事件（如 offer、answer、delete）
发生时运行一组路由，从而实现
*手动/自定义* SDP 改写。可通过使用 *route*
引擎引入 RTP 中继来启用该功能。如果未定义
相应路由，则 SDP 不会
改变。更多信息请参阅
[route_offer](#route_offer-string)、
[route_answer](#route_answer-string) 和
[route_delete](#route_delete-string) 参数。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


必须先加载以下模块：


- *Dialog* 模块 - 用于跟踪对话中的请求。
- *RTP 中继*模块 - 如 *rtpproxy*，或
*rtpengine*，或任何实现
*rtp_relay* 接口的模块。


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，必须安装
以下库或应用程序：


- *无*。


### 导出的参数 {#exported-parameters}


#### route_offer (string) {#route_offer-string}


当发生 SDP offer 时（即
正在处理携带 SDP 的 INVITE 时）所运行的路由。


路由执行时，会填充以下
参数：


- *callid* - 正在处理的呼叫的 callid。
- *from_tag* - 正在处理的呼叫的 from_tag。
- *to_tag* - 正在处理的呼叫的 to_tag（若存在）。
- *branch* - 引入 RTP 中继的分支
—— 若在主分支引入，则使用 *-1*。
- *body* - 可选，如果使用了显式的 body，
否则应考虑消息的消息体。
- *set* - 该呼叫使用的 rtp relay 集。
- *node* - 可选，引擎节点标识符 —— 这是
运行 *route_offer* 路由后返回的用户填充值
（参见下文的返回值部分）。
- *ip* - 可选，在
[$rtp_relay](#rtp_relay) 变量中为当前对端指定的 IP。
- *type* - 可选，在
[$rtp_relay](#rtp_relay) 变量中为当前对端指定的 RTP 类型。
- *in-iface* - 可选，应用于该对端的
入向接口。
- *out-iface* - 可选，应用于该对端的
出向接口。
- *ctx-flags* - 可选，在
[$rtp_relay_ctx()](#rtp_relay_ctx) 变量中指定的全局标志位。
- *flags* - 可选，为该对端指定的标志位。
- *peer* - 可选，为相应对端指定的
对端标志位；


运行该路由时，期望返回以下值：


*body* - 新创建的要用于 offer 的消息体。若不
返回，则消息体保持不变。


*node* - 可选，用于后续
路由/命令执行时标识的节点。
*默认值为 "rtp_relay_offer"。*


```opensips title="Set route_offer parameter"
...
modparam("rtp_relay", "route_offer", "custom_rtp_offer")
...
```


```opensips title="route_offer route usage"
...
route[rtp_relay_offer] {
	# 手动引入 RTPEngine，获取 SDP，并在消息中替换它
	return (1, $var(body));
}
...
```


#### route_answer (string) {#route_answer-string}


当发生 SDP answer 时（即
正在处理携带 SDP 的 183 或 200 OK 应答时）所运行的路由。


路由执行时，会填充以下
参数：


- *callid* - 正在处理的呼叫的 callid。
- *from_tag* - 正在处理的呼叫的 from_tag。
- *to_tag* - 正在处理的呼叫的 to_tag（若存在）。
- *branch* - 引入 RTP 中继的分支
—— 若在主分支引入，则使用 *-1*。
- *body* - 可选，如果使用了显式的 body，
否则应考虑消息的消息体。
- *set* - 该呼叫使用的 rtp relay 集。
- *node* - 可选，引擎节点标识符 —— 这是
运行 *route_offer* 路由后返回的用户填充值。
- *ip* - 可选，在
[$rtp_relay](#rtp_relay) 变量中为当前对端指定的 IP。
- *type* - 可选，在
[$rtp_relay](#rtp_relay) 变量中为当前对端指定的 RTP 类型。
- *in-iface* - 可选，应用于该对端的
入向接口。
- *out-iface* - 可选，应用于该对端的
出向接口。
- *ctx->flags* - 可选，在
[$rtp_relay_ctx()](#rtp_relay_ctx) 变量中指定的全局标志位。
- *flags* - 可选，为该对端指定的标志位。
- *peer* - 可选，为相应对端指定的
对端标志位；


运行该路由时，期望返回以下值：


*body* - 新创建的要用于 answer 的消息体。若不
返回，则消息体保持不变。
*默认值为 "rtp_relay_answer"。*


```opensips title="Set route_answer parameter"
...
modparam("rtp_relay", "route_answer", "custom_rtp_answer")
...
```


```opensips title="route_answer route usage"
...
route[rtp_relay_answer] {
	# 同样，手动引入 RTPEngine
	rtpengine_answer(,, $var(body), $rb);
	return (1, $var(body));
}
...
```


#### route_delete (string) {#route_delete-string}


当应断开媒体时（即收到 CANCEL 或 BYE 时）
所运行的路由。


路由执行时，会填充以下
参数：


- *callid* - 正在处理的呼叫的 callid。
- *from_tag* - 正在处理的呼叫的 from_tag。
- *to_tag* - 正在处理的呼叫的 to_tag（若存在）。
- *branch* - 引入 RTP 中继的分支
—— 若在主分支引入，则使用 *-1*。
- *body* - 可选，如果使用了显式的 body，
否则应考虑消息的消息体。
- *set* - 该呼叫使用的 rtp relay 集。
- *node* - 可选，引擎节点标识符 —— 这是
运行 *route_offer* 路由后返回的用户填充值
（参见下文的返回值部分）。
- *ctx->flags* - 可选，在
[$rtp_relay_ctx()](#rtp_relay_ctx) 变量中指定的全局标志位。
- *delete* - 可选，在
[$rtp_relay_ctx()](#rtp_relay_ctx) 变量中指定的删除标志位。


不需要返回值。
*默认值为 "rtp_relay_delete"。*


```opensips title="Set route_delete parameter"
...
modparam("rtp_relay", "route_delete", "custom_rtp_delete")
...
```


```opensips title="rtp_relay_delete route usage"
...
route[rtp_relay_delete] {
	# 手动移除 RTPEngine 会话
	rtpengine_delete();
}
...
```


#### route_copy_offer (string)


当新呼叫的 SDP 被复制时所执行的路由。


路由执行时，会填充以下
参数：


- *callid* - 正在处理的呼叫的 callid。
- *from_tag* - 正在处理的呼叫的 from_tag。
- *to_tag* - 正在处理的呼叫的 to_tag（若存在）。
- *branch* - 引入 RTP 中继的分支
—— 若在主分支引入，则使用 *-1*。
- *set* - 该呼叫使用的 rtp relay 集。
- *node* - 可选，引擎节点标识符 —— 这是
运行 *route_offer* 路由后返回的用户填充值
（参见下文的返回值部分）。
- *flags* - 可选，由正在复制 SDP
的模块指定的标志位。
- *copy-ctx* - 可选，复制上下文标识符 ——
这是运行 *route_copy_offer* 路由后返回的用户填充值
（参见下文的返回值部分）。


运行该路由时，期望返回以下值：


*copy-ctx* - 可选，一个复制上下文标识符，
后续可用于标识当前复制会话。
*默认值为 "rtp_relay_copy_offer"。*


```opensips title="Set rtp_relay_copy_offer parameter"
...
modparam("rtp_relay", "route_copy_offer", "custom_rtp_copy_offer")
...
```


```opensips title="Set rtp_relay_copy_offer usage"
...
route[rtp_relay_copy_offer] {
	# 指示媒体引擎对媒体进行分叉，并分配一个标识符
	# 该标识符应存储在 $var(handle) 变量中
	return (1, $var(handle));
}
...
```


#### route_copy_answer (string)


当收到被复制流的 SDP 时所运行的路由。
（即收到 CANCEL 或 BYE 时）。


路由执行时，会填充以下
参数：


- *callid* - 正在处理的呼叫的 callid。
- *from_tag* - 正在处理的呼叫的 from_tag。
- *to_tag* - 正在处理的呼叫的 to_tag（若存在）。
- *branch* - 引入 RTP 中继的分支
—— 若在主分支引入，则使用 *-1*。
- *body* - 可选，如果使用了显式的 body，
否则应考虑消息的消息体。
- *set* - 该呼叫使用的 rtp relay 集。
- *node* - 可选，引擎节点标识符 —— 这是
运行 *route_offer* 路由后返回的用户填充值
（参见下文的返回值部分）。
- *flags* - 可选，由正在复制 SDP
的模块指定的标志位。
- *copy-ctx* - 可选，复制上下文标识符 ——
这是 *route_copy_offer* 执行结束时
返回的用户填充值。


*默认值为 "rtp_relay_copy_answer"。*


```opensips title="Set rtp_relay_copy_answer parameter"
...
modparam("rtp_relay", "route_copy_answer", "custom_rtp_copy_answer")
...
```


```opensips title="Set rtp_relay_copy_answer usage"
...
route[rtp_relay_copy_answer] {
	# 将收到的 $param(body) 提供给正在分叉该呼叫的媒体引擎
	# 复制实例由 $param(copy-ctx) 变量标识
}
...
```


#### route_copy_delete (string)


当应移除媒体分叉时所运行的路由。


路由执行时，会填充以下
参数：


- *callid* - 正在处理的呼叫的 callid。
- *from_tag* - 正在处理的呼叫的 from_tag。
- *to_tag* - 正在处理的呼叫的 to_tag（若存在）。
- *branch* - 引入 RTP 中继的分支
—— 若在主分支引入，则使用 *-1*。
- *body* - 可选，如果使用了显式的 body，
否则应考虑消息的消息体。
- *set* - 该呼叫使用的 rtp relay 集。
- *node* - 可选，引擎节点标识符 —— 这是
运行 *route_offer* 路由后返回的用户填充值
（参见下文的返回值部分）。
- *flags* - 可选，由正在复制 SDP
的模块指定的标志位。
- *copy-ctx* - 可选，复制上下文标识符 ——
这是 *route_copy_offer* 执行结束时
返回的用户填充值。


不需要返回值。


*默认值为 "rtp_relay_copy_delete"。*


```opensips title="Set rtp_relay_copy_delete parameter"
...
modparam("rtp_relay", "route_copy_delete", "custom_rtp_copy_delete")
...
```


```opensips title="Set rtp_relay_copy_delete usage"
...
route[rtp_relay_copy_delete] {
	# 移除由 $param(copy-ctx) 变量标识的复制实例
}
...
```


### 导出的函数 {#exported-functions}


#### rtp_relay_engage(engine, [set])


为当前初始 INVITE 引入 RTP 中继 *engine*。
调用此函数后，整个 RTP 中继通信
将由本模块自行处理，无需对后续的
对话中请求/应答再做干预（除非确实希望干预）。


该函数不会当场执行媒体请求，
而是注册钩子，以自动处理后续的
所有媒体请求。


所使用的 RTP 会话修饰符是通过
[$rtp_relay](#rtp_relay) 和/或
[$rtp_relay_peer](#rtp_relay_peer) 变量配置的。


该函数可以从主请求路由调用 —— 此时
RTP 中继将应用于此后创建的所有分支；也可以从
分支路由调用 —— 此时 RTP 中继仅应用于
调用它的分支，或已配置关联
*rtp_relay* 的分支。


为该函数配置 RTP 中继标志位时，请注意
[$rtp_relay](#rtp_relay) 和
[$rtp_relay_peer](#rtp_relay_peer) 是相对于其
所在路由的。在初始 INVITE 的主请求路由中，
[$rtp_relay](#rtp_relay) 指主叫，
[$rtp_relay_peer](#rtp_relay_peer) 指被叫。在
分支路由中，[$rtp_relay](#rtp_relay) 指当前
被叫分支，[$rtp_relay_peer](#rtp_relay_peer) 指
主叫。


各参数含义如下：


- *engine(string)* - 用于该呼叫的 RTP 中继引擎
（即 *rtpproxy*、
*rtpengine* 或 *route*）
- *set(int, optional)* - 用于该呼叫的集。


该函数可在 REQUEST_ROUTE、FAILURE_ROUTE、BRANCH_ROUTE 中使用。


```opensips title="rtp_relay_engage usage"
...
if (is_method("INVITE") && !has_totag()) {
	xlog("SCRIPT: engaging RTPProxy relay for all branches\n");
	$rtp_relay = "co";
	$rtp_relay_peer = "co";
	rtp_relay_engage("rtpproxy");
}
...
		
```


### 导出的 MI 函数 {#exported-mi-functions}


#### rtp_relay_list


列出所有已引入的 RTP 中继会话。


参数：


- *engine* - （可选）RTP
中继引擎（即 *rtpproxy*
或 *rtpengine*）。
- *set* - （可选）RTP
中继集。使用时，必须同时指定 *engine*
参数。
- *node* - （可选）RTP
中继节点。使用时，必须同时指定 *engine*
参数。


```bash title="rtp_relay_list usage"
...
## 列出所有会话
$ opensips-cli -x mi rtp_relay_list

## 列出经过特定 RTP 节点的所有会话
$ opensips-cli -x mi rtp_relay_list rtpproxy udp:127.0.0.1:2222
...
			
```


#### rtp_relay_update {#rtp_relay_update}


更新/重新引入所有正在进行的 RTP 中继会话中的 RTP 中继。


该函数可用于为某些正在进行的 RTP 会话
触发对话中更新。对于所有匹配的
会话，它会重新引入一次 RTP 中继 offer/answer 会话，
然后向呼叫参与者发送携带
更新后 SDP 的 re-INVITE。


> [!NOTE]
> 不带过滤器（如 *engine* 或 *set*）
> 运行该命令将导致所有 RTP 中继会话
> 被重新引入。


> [!NOTE]
> 在强制指定新节点时，
> 并不保证一定使用该节点 —— 如果该节点
> 不可用而另一个节点可用，将选择
> 活动的那个。


> [!NOTE]
> 如果节点发生变更，
> 模块会尝试撤销先前的 RTP 中继
> 会话，尽管这可能不奏效。


参数：


- *engine* - （可选）用作过滤条件的
RTP 中继引擎（即 *rtpproxy*
或 *rtpengine*）。
- *set* - （可选）用作过滤条件的
RTP 中继集。若缺失，
将使用其初始引入时的
同一个集。
- *node* - （可选）用作过滤条件的
RTP 中继节点。
- *new_set* - （可选）用于该呼叫的
新 RTP 中继集。
- *new_node* - （可选）用于该呼叫的
新 RTP 节点。若缺失
*new_set*，将使用
同一个集。


```bash title="rtp_relay_update usage"
...
## 更新所有使用 rtpproxy 的会话
$ opensips-cli -x mi rtp_relay_update rtpproxy
...
```


#### rtp_relay_update_callid


更新/重新引入所有正在进行的 RTP 中继会话中的 RTP 中继。


该函数的工作方式与
[rtp_relay_update](#rtp_relay_update) 基本相同，但
用于更新特定的 callid。此外，还可以
更新该特定会话所使用的 *engine* 和
*flags*。


参数：


- *callid* - 用于
匹配待更新对话的 callid。
- *engine* - （可选）要使用的
新 RTP 中继引擎（即 *rtpproxy*
或 *rtpengine*）。若
缺失，则使用相同的初始引擎。
- *set* - （可选）要使用的
新 RTP 中继集。若缺失，将使用其初始引入时的
同一个默认集。
- *node* - （可选）要使用的
RTP 中继节点。若未指定，
则使用第一个可用节点。
- *flags* - （可选）一个 JSON，
包含 *caller* 和/或
*callee* 节点，其中含有
应用于该会话的新标志位。只有
显式指定的标志位会被覆盖。


```bash title="rtp_relay_update_callid usage"
...
## 使用可用的 RTPproxy 节点更新某路呼叫
$ opensips-cli -x mi rtp_relay_update_callid 1-3758963@127.0.0.1 rtpproxy

## 更新某路呼叫，为主叫使用带 SRTP SDP 的 RTPEngine
$ opensips-cli -x mi rtp_relay_update_callid callid=1-3758963@127.0.0.1 \
	flags='{ "caller":{"type":"SRTP", "flags":"replace-origin"},
		"callee":{"type":"RTP", "flags"="replace-origin"}}'
...
```


### 导出的伪变量 {#exported-pseudo-variables}


#### $rtp_relay {#rtp_relay}


用于为当前对端配置 RTP 后端标志位。
该变量是作用域相对的：在初始 INVITE
的主请求路由中，它配置主叫；而在初始 INVITE
事务的分支路由或应答中，它配置被叫分支。


对于顺序请求，该变量表示
发起该请求的 UAC 所使用的标志位。在
应答中使用时，配置的是另一 UAC 的标志位。


当脚本需要配置对侧时，请使用
[$rtp_relay_peer](#rtp_relay_peer)：在初始
INVITE 的主请求路由中，它配置被叫；而在
初始 INVITE 事务的分支路由或应答中，
它配置主叫。


在初始 INVITE 作用域内，可通过变量的
索引按分支配置该变量。


每个 UAC/对端可配置多个
标志位：


- *flags*（默认，当
变量不带名称使用时）- 是与当前 UAC 关联的
标志位 —— 它们随 offer 命令
一同传递
- *peer* - 这些标志位
随 offer 命令传递，但它们是与
另一 UAC/对端关联的标志位
- *ip* - 应在生成的 SDP 中
通告的 IP。
- *type* - 当前 UAC 使用的
RTP 类型（目前仅 *rtpengine* 使用）
- *iface* - 用于来自该 UAC 的
流量的接口。
- *body* - 用于该 UAC 的
消息体。
- *delete* - 在媒体会话终止/删除时
使用的标志位。
- *disabled* - 以整型配置，
用于为该 UAC 禁用 RTP 中继。


#### $rtp_relay_peer {#rtp_relay_peer}


该变量的含义与参数与
[$rtp_relay](#rtp_relay) 变量相同，区别在于它
用于配置另一 UAC 的标志位，而非
当前 UAC。其他所有字段类似。


#### $rtp_relay_ctx() {#rtp_relay_ctx}


该变量可用于提供关于 RTP
上下文的信息，这些信息不与任何
涉及的对端关联。


可使用以下设置：


- *callid* - 用于与 rtp 服务器进行
所有通信的 callid。
若未指定，则取自消息/对话。
- *from_tag* - 用于与 rtp 服务器进行
所有通信的 from-tag。
若未指定，则取自消息/对话。
- *to_tag* - 用于与 rtp 服务器进行
所有通信的 to-tag。
若未指定，则取自消息/对话。
- *flags* - 发送给所有 offer/answer
请求的通用标志位。
- *delete* - 在中继会话终止时
发送的标志位。
<!-- CONTRIBUTORS -->

### 许可 {#license}

所有文档文件（即扩展名为 .md 的文件）均按 Creative Common License 4.0 许可。
