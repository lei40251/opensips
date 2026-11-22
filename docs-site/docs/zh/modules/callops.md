---
title: "呼叫操作模块"
description: "该模块提供一组函数，允许用户控制正在进行的通话。"
---

## 管理指南 {#admin-guide}


### 概述 {#overview}


该模块提供了一组函数，允许用户控制正在进行的通话。
它可用于从代理侧（而不是终端设备侧）触发呼叫转移（盲转或出席转移），
或将通话置于保持状态。
该模块绑定在 [OpenSIPS Dialog
模块](/zh/modules/dialog) 之上，以获取正在进行的通话的信息，并
存储将要发起的新通话的信息。


该模块还会通过事件接口（Event Interface）触发一组事件，向外部应用
提供通话如何转移以及彼此之间如何关联的细节。这些事件可用于追踪
呼叫转移中涉及的所有腿（leg）。


执行呼叫转移场景时最大的挑战之一，是将新通话与被转移的旧通话
关联起来，尤其是在盲转场景中。为解决这一挑战，该模块可以配置为
以两种不同模式引用旧腿，可通过
[mode](#mode-stringinteger) 参数切换：


- 自动（默认模式）：在 REFER 中发送的目的地 URI 里添加一个
特殊参数。当新通话返回时，该参数会出现在新通话的
Request URI 中。模块会找到它，将新通话与旧通话关联，
并从 URI 中移除该参数。
- 手动：使用自定义/外部逻辑（如数据库或
本地存储）匹配旧通话。在该模式下，用户必须
显式调用 [call_blind_replace()](#call_blind_replacecallid-leg)
函数将两个通话关联起来。


该模块还可用于捕获 *Notify refer* 事件并在 OpenSIPS 层面予以应答。
但请注意，在 *auto* 模式下，即使匹配到对话时 NOTIFY 已被处理，
该请求仍会继续执行脚本，这一点与使用
*manual* 模式配合
[call_transfer_notify()](#call_transfer_notify) 函数时不同。为避免将
NOTIFY 发送到端点，必须将其丢弃，如下所示：


```opensips title="Drop automatically handled NOTIFY refer events"
...
if (has_totag() && loose_route() &&
		is_method("NOTIFY") && $hdr(Event) == "refer")
	drop;
...
```


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


必须先加载以下模块才能加载本模块：


- *TM*——事务模块。
- *Dialog*——用于跟踪被代理通话的 Dialog 模块。


#### 外部库或应用程序 {#external-libraries-or-applications}


加载本模块运行 OpenSIPS 之前，必须先安装
以下库或应用程序：


- *无*。


### 导出的参数 {#exported-parameters}


#### mode (string/integer) {#mode-stringinteger}


该参数可用于更改模块匹配被转移腿
所用的模式。支持的取值有：


- *param* / *0*——执行
盲转时，在
refer 消息中发送的目的地将包含一个用于标识
被替换对话的参数。收到新通话时该参数会被
自动移除。
- *manual* / *1*——用户
自行创建匹配新通话的逻辑，并
调用 [call_blind_replace()](#call_blind_replacecallid-leg) 函数
使 OpenSIPS 知晓该配对关系。注意，该模式也不会
自动处理 *Notify refer*，
因此还必须使用
[call_transfer_notify()](#call_transfer_notify) 函数来处理
它们。
- *callid* / *2*——与
*param* 取值类似，区别在于
不在 Request URI 中存储待转移通话的对话 ID，
而是使用实际的 callid 作为标识。


*默认值为 "0（使用参数的自动模式）"。*


```opensips title="Set mode parameter"
...
modparam("callops", "mode", "manual") # 使用自己的逻辑
...
```


#### match_param (string)


用于将不同通话匹配在一起的参数。该参数
主要用于 *param* 模式，但
也在内部用于在被转移的
对话中存储不同的值——请确保它不与已有的对话值冲突。


*默认值为 "osid"。*


```opensips title="Set match_param parameter"
...
modparam("callops", "match_param", "call")
...
```


### 导出的函数 {#exported-functions}


#### call_blind_replace(callid[, leg]) {#call_blind_replacecallid-leg}


使用 *manual 模式* 时，调用该函数
在转移通话与被转移
通话之间建立映射。应在 OpenSIPS 收到
正在转移既有通话的新通话时调用。


参数：


- *callid* (string) - 正在被转移的既有通话。
- *leg* (string, optional) - 正在被转移的
腿。如果未指定，且 OpenSIPS 无法
根据目的地确定该腿，则应使用
*unknown* 标签。


该函数只能在请求路由中使用。


```opensips title="Use call_blind_replace() function to match an existing leg."
...
if (!has_totag() && is_method("INVITE")) {
	if (cache_fetch("local", "callid_$si", $avp(callid))) {
		call_blind_replace($avp(callid));
	}
}
...
	
```


#### call_transfer_notify() {#call_transfer_notify}


使用 *manual 模式* 时，应对
带有 *Event: refer* 头域的对话中 NOTIFY 请求
调用该函数，以便相应地处理它们。


注意，如果该函数成功处理了 NOTIFY 请求，
脚本将不再继续执行。


该函数可在请求路由、失败路由和本地路由中使用。


```opensips title="Use call_transfer_notify() function to handle NOTIFY refer requests."
...
if (has_totag() && is_method("NOTIFY") && loose_route()) {
	call_transfer_notify();
}
...
	
```


#### call_transfer(leg, destination) or


该函数通过在正在进行的通话期间发送 REFER
消息来触发盲转。该函数需要在
被转移对话的上下文中运行。


参数：


- *leg* (string) - 正在
被转移的腿。必须是 *caller*
或 *callee* 值之一。
- *destination* (string) - 该腿被转移到的
目的地的 SIP URI。


该函数可在任何具有对话上下文的路由中使用。


```opensips title="Use call_transfer() function to do a blind transfer of the caller to a new destination."
...
if (has_totag() && && loose_route()) {
	call_transfer("caller", "sip:announcement@127.0.0.1");
}
...
	
```


#### call_transfer(leg, transfer_callid, transfer_leg[, destination]) or


该函数通过在正在进行的通话期间发送 REFER
消息来触发出席转移。该函数需要在
被转移对话的上下文中运行。


参数：


- *leg* (string) - 正在
被转移的腿。必须是 *caller*
或 *callee* 值之一。
- *transfer_callid* (string) - 正在被转移的
第二个对话的 callid。
- *transfer_leg* (string) - 第二个通话中
将被转移到 *leg* 的腿。
必须是 *caller* 或
*callee* 值之一。
- *destination* (string, optional) - 该腿被转移到的
目的地的 SIP URI。如果缺省，则
使用初始通话的 From/To URI。


该函数可在任何具有对话上下文的路由中使用。


```opensips title="Use call_transfer() function to do an attended transfer of the caller to the callee of a different call."
...
if (has_totag() && && loose_route()) {
	call_transfer("caller", "ba55b1b3-459d-4e84-a6f8-14c40e4f6ace", "callee");
}
...
	
```


### 导出的 MI 函数 {#exported-mi-functions}


#### call_transfer


用于将正在进行的通话转移到新目的地的
MI 命令。


根据所使用的参数，该命令既可以执行盲转
也可以执行出席转移场景。使用
*transfer_callid* 时执行出席转移，
否则执行盲转。


名称：*call_transfer*


参数


- *callid* (string) - 正在被转移的
对话的 callid。
- *leg* (string) - 指明
*callid* 通话中正在被
转移/保留在新转移通话中的腿。
可取值为 "caller"、
"callee" 或 "both"。
- *destination* (string, optional) - 通话
被转移到的 URI。该参数对于盲转
是必填的，对于出席转移
则是可选的。在出席转移的情况下，
如果缺省，通话的目的地将取自
转移对话中的 URI。
- *transfer_callid* (string, optional) -
在出席转移时为必填，用于指定
新通话中 Bleg 的通话。
- *transfer_leg* (string, optional) -
在出席转移的情况下，指定
*transfer_callid* 通话中将要与 *callid*
的 *leg* 桥接的参与者。如果缺省，
则必须使用
*transfer_fromtag* 和
*transfer_totag* 来标识
tag。
- *transfer_fromtag* 与
*transfer_totag* (string, optional) -
这两个参数应始终一起指定，用于
被转移 Bleg 的对话不由 OpenSIPS 管理的
出席转移场景。
注意，在这些场景中只有 A-leg 对话
会收到有关呼叫转移的事件。


MI FIFO 命令格式：


```bash
# 盲转至 sip:agent@127.0.0.1
opensips-cli -x mi call_transfer \
	callid=4b664b48-5639-40bf-bff8-3a866c145c3b \
	leg=caller \
	destination=sip:agent@217.0.0.1
		
```


```bash
# 两个通话之间的出席转移
opensips-cli -x mi call_transfer \
	callid=e8d024db-78e5-4d18-9794-5b8ba837bed4
	leg=caller \
	transfer_callid=559abf97-9834-4380-bba1-a036eb245450 \
	transfer_leg=calee
		
```


#### call_hold {#call_hold}


用于将正在进行的通话置于保持状态的
MI 命令。


如果通话的任一腿已被置于保持状态，
命令返回 *OK*。如果通话已处于
保持状态，则返回错误。


名称：*call_hold*


参数


- *callid* (string) - 正在被置于
保持状态的对话的 callid。


MI FIFO 命令格式：


```bash
# 将通话置于保持状态
opensips-cli -x mi call_hold \
	callid=921b00e4-fec0-4a36-9397-a40ab74e1893
		
```


#### call_unhold


用于将通话从 [call_hold](#call_hold) 调用所设置的
保持状态恢复的 MI 命令。


如果有任一腿被恢复，命令返回 *OK*；
如果此前没有任何腿被置于保持状态，
则返回错误。


名称：*call_unhold*


参数


- *callid* (string) - 正在被恢复的
对话的 callid。


MI FIFO 命令格式：


```bash
opensips-cli -x mi call_unhold \
	callid=921b00e4-fec0-4a36-9397-a40ab74e1893
		
```


### 导出的事件 {#exported-events}


#### E_CALL_TRANSFER


该事件在呼叫转移场景中触发。


对于某次具体的呼叫转移，会触发多个事件，
从转移开始一直到转移
完成。*state* 参数表示
呼叫转移的状态。


在盲转场景中只会触发一组事件，
而在出席转移中，只要转移涉及的两个对话
都经由 OpenSIPS 代理，就会为
这两个对话各触发一组事件


参数：


- *callid* - 正在被转移的通话的
callid。
- *leg* - 正在被转移的通话的
腿（*caller* 或 *callee*）。
- *transfer_callid* - 正在转移旧
*callid* 通话的新通话的 callid。
- *destination* - *leg*
被转移到的 URI 目的地。
- *state* - 转移的状态：
	* *start* - 在
		REFER 消息被发送给被转移参与者时触发。
	* *notify* - 在
		从被转移参与者收到 NOTIFY refer 事件时触发。
		*status* 参数包含关于转移通话状态的额外
		信息。
	* *ok* - 在
		转移完成时触发——通话被
		被转移参与者接听。
	* *fail* - 在
		转移因各种原因失败时触发。如果
		我们无法启动呼叫转移（即发送 REFER），
		*status* 参数为空，
		否则包含关于失败的信息。
- *status* - 包含关于通话
成功或失败的额外信息。


#### E_CALL_HOLD


在将通话置于保持状态，或将通话从
保持状态恢复的过程中触发。


该事件对通话的每条腿触发两次——第一次是
该腿开始被置于保持状态时，随后是
该腿接受或拒绝该状态时。


参数：


- *callid* - 正在被置于保持状态
或恢复的通话的 callid。
- *leg* - 受保持或恢复影响
的通话腿（*caller* 或 *callee*）。
- *action* - 正在执行的
*hold* 或 *unhold* 动作。
- *state* - 正在执行动作的
状态。
  * *start* - 在向被置于保持状态的参与者发送 re-INVITE 时触发。
  * *ok* - 在保持/恢复动作成功完成时触发。
  * *fail* - 在动作失败时触发。
<!-- CONTRIBUTORS -->

### 许可证 {#license}

所有文档文件（即 .md 扩展名）均按 Creative Common License 4.0 许可协议授权。
