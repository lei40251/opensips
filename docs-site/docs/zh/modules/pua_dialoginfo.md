---
title: "pua_dialoginfo 模块"
description: "pua_dialoginfo 从 dialog 模块获取对话状态信息，并通过 pua 模块发布（PUBLISH）对话信息。"
sidebar: false
---

## 管理员指南 {#admin-guide}


### 概述 {#overview}


pua_dialoginfo 从 dialog 模块获取对话状态信息，并通过 pua
模块发布（PUBLISH）该对话信息。因此，与 presence_xml 模块配合使用时，
可以从 dialog 模块推导出对话信息，并将对话信息的变化
通知（NOTIFY）给已订阅的观察者（watcher）。例如，可将此用于
SNOM 和 Linksys 话机。


> [!NOTE]
> 本模块依据 RFC 4235 实现对话信息，与
> draft-anil-sipping-bla-03.txt 中定义的 BLA 特性不兼容。
> （实际上 BLA 草案相当糟糕，因为它改变了 SIP 语义）


本模块的代码基于 pua_usrloc 和 nat_traversal
模块（复制/粘贴）。


下面展示若干取自 RFC 4235 的对话信息 XML 文档示例。
这有助于理解各模块参数的含义：


```xml
<?xml version="1.0"?>
<dialog-info xmlns="urn:ietf:params:xml:ns:dialog-info"
             version="1"
             state="full"
             entity="sip:alice@example.com">
    <dialog id="as7d900as8" 
            call-id="a84b4c76e66710"
            local-tag="1928301774" 
            remote-tag="456887766"
            direction="initiator">
        <state>early</state>
    </dialog>
</dialog-info>
```


根元素是 "dialog-info"。它包含命名空间、版本（针对某一特定对话的每次
新 PUBLISH 都必须递增该版本号）、状态（本模块仅支持 state=full）
以及我们为其发布对话信息的实体（entity）。


"dialog" 元素必须包含 id 参数。id 参数通常与可选的 call-id 参数（即
INVITE 请求的 call-id）不同，因为一个 INVITE 可能创建多个对话（分叉请求）。
但由于 dialog 模块不支持由单个事务创建的多个对话，
pua_dialoginfo 模块将 id 参数设置为与 call-id 参数相同的值。
"local-tag" 表示该实体的本地 tag。remote-tag 表示对端的 tag。
"direction" 表示该实体是对话的发起方还是接收方（即
该实体是发送还是接收了第一个 INVITE）。


"state" 元素描述对话状态机的状态，其值必须为：trying、proceeding、early、confirmed 或 terminated。


dialog 元素可以包含可选的 "local" 和 "remote" 元素，用于
更详细地描述本地一方与对端一方，例如：


```xml
<?xml version="1.0" encoding="UTF-8"?>
<dialog-info xmlns="urn:ietf:params:xml:ns:dialog-info"
             version="1" state="full">
    <dialog id="as7d900as8" 
            call-id="a84b4c76e66710"
            local-tag="1928301774" 
            remote-tag="456887766"
            direction="initiator">
        <state>early</state>
        <local>
            <identity display="Alice">sip:alice@example.com</identity>
            <target uri="sip:alice@phone11.example.com"/>
        </local>
        <remote>
            <identity display="Bob">sip:bob@example.org</identity>
            <target uri="sip:bobster@phone21.example.org"/>
        </remote>
    </dialog>
</dialog-info>
```


local 和 remote 元素是实现呼叫代接（call pickup）所必需的。例如，
如果上述 XML 文档被某个已 SUBSCRIBE Alice 对话信息的人收到，
那么该人就可以代接该呼叫——即向 Bob 发送一个 INVITE（实际上我不确定
应该使用 identity 元素中的 URI 还是 target 参数中的 URI），
该 INVITE 包含一个 Replaces 头域，其中带有 call-id 和各个 tag。
此功能已在 Linksys SPA962 话机和 SNOM 320 固件 7.3.7 上测试成功
（需要将功能键设置为 "Extension"）。


一个对话信息 XML 文档可以包含多个 "dialog" 元素，例如
该实体有多个正在进行的对话时。例如，
下面的 XML 文档展示了一个 confirmed 状态的对话和一个 early 状态
（可能是第二个呼入呼叫）的对话。


```xml
<?xml version="1.0"?>
<dialog-info xmlns="urn:ietf:params:xml:ns:dialog-info"
             version="3"
             state="full"
             entity="sip:alice@example.com">
    <dialog id="as7d900as8" call-id="a84b4c76e66710"
            local-tag="1928301774" remote-tag="hh76a"
            direction="initiator">
        <state>confirmed</state>
    </dialog>
    <dialog id="j7zgt54" call-id="ASDRRVASDRF"
            local-tag="123456789" remote-tag="EE345"
            direction="recipient">
        <state>early</state>
    </dialog>
</dialog-info>
```


要为某个对话启用对话信息通知，必须对该对话调用
[dialoginfo_set()](#dialoginfo_setside) 函数。
该函数可接收一个参数，通过该参数可以告知模块
仅针对呼叫的一方发布对话信息。这很有用，
因为可能只想为本地用户保存对话信息，此时可以在脚本中
判断呼叫双方是否为本地用户，并向该函数传入正确的
参数，使其仅为本地用户生成对话信息。可选值为："A" ——
表示仅为主叫生成对话信息；"B" —— 仅为被叫生成对话信息。若未给出
参数，模块将为双方生成对话信息。


可以在调用 [dialoginfo_set()](#dialoginfo_setside) 函数之前，
为以模块参数 "caller_spec_param" 和
"callee_spec_param" 命名的伪变量赋值，从而指定主叫和被叫应使用哪些 URI。
请阅读[导出参数](#exported-parameters)一节中这些参数的
说明。若未设置这些参数，将使用默认来源：主叫取自 From 头域，
被叫取自 To 头域中的显示名 + RURI。


由于 dialog 模块的回调只针对某个特定对话，pua_dialoginfo
始终发布只含单个 "dialog" 元素的 XML 文档。如果某个实体
有多个并发对话，pua_dialoginfo 模块会为
每个对话分别发送 PUBLISH。这些多个"呈现"（presence）
可以由 presence_dialoginfo 模块聚合为单个包含多个 "dialog" 元素的 XML 文档。
有关聚合的细节，请参见 presence_dialoginfo 模块的说明。


如果 dialog 模块的回调出现问题且希望对其调试，
可在 pua_dialoginfo.c 中定义 PUA_DIALOGINFO_DEBUG 并重新编译。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


在加载本模块之前，必须先加载以下模块：


- *dialog*。
- *pua*。


#### 外部库或应用 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，必须先安装以下库或应用：


- *libxml*。


### 导出参数 {#exported-parameters}


#### include_callid (int)


若设置该参数，可选的 call-id 将被放入
dialog 元素中。呼叫代接功能需要此项。


*默认值为 "1"。*


```opensips title="Set include_callid parameter"
...
modparam("pua_dialoginfo", "include_callid", 0)
...
```


#### include_tags (int)


若设置该参数，本地与远端 tag 将被放入
dialog 元素中。呼叫代接功能需要此项。


*默认值为 "1"。*


```opensips title="Set include_tags parameter"
...
modparam("pua_dialoginfo", "include_tags", 0)
...
```


#### include_localremote (int)


若设置该参数，可选的 local 和 remote 元素
将被放入 dialog 元素中。呼叫代接
功能需要此项。


*默认值为 "1"。*


```opensips title="Set include_localremote parameter"
...
modparam("pua_dialoginfo", "include_localremote", 0)
...
```


#### caller_confirmed (int)


通常主叫的对话信息为
"trying -> early -> confirmed"，被叫的对话信息
为 "early -> confirmed"。在某些话机上，只要状态为 early，功能键 LED
就会开始闪烁，无论呼叫方是主叫还是被叫（由 "direction" 参数指示）。
为避免主叫侧的 LED 闪烁，可以启用该参数。
此时即使处于 "early" 状态，主叫的状态也会被标记为 "confirmed"。
这是针对存在缺陷的 Linksys SPA962
话机的变通做法。SNOM 话机在默认设置下工作正常。


*默认值为 "0"。*


```opensips title="Set caller_confirmed parameter"
...
modparam("pua_dialoginfo", "caller_confirmed", 1)
...
```


#### publish_on_trying (int)


通常主叫的对话信息为
"trying -> early -> confirmed"。"trying" 状态会在
对主叫调用 [dialoginfo_set()](#dialoginfo_setside) 后立即触发，而 "early" 则在
被叫振铃时（由 180 或 183 临时应答触发）触发。
有时，更适合仅在被叫进入 early 状态时才收到通知，而在此之前不通知。
在另一些情况下，则适合不通知 early 状态。该设置可控制此行为。


该参数的预期目的是降低通知速率
（参见 RFC4235 第 3.10 节 Rate of Notifications）。


*默认值为 "0"。*


```opensips title="Set publish_on_trying parameter to 0"
...
modparam("pua_dialoginfo", "publish_on_trying", 0)

# 成功呼叫场景：
#
# UAC       proxy       UAS     presence server
#  |--INVITE->|          |            |
#  |<-100-----|--INVITE->|            |
#  |          |<-100-----|            |
#  |          |          |            |
#  |          |<-18x-----|            |
#  |<-18x-----|--PUBLISH(early)------>|
#  |          |          |            |
#  |          |<-200-----|            |
#  |<-200-----|--PUBLISH(confirmed)-->|
#  |--ACK---->|          |            |
#  |          |--ACK---->|            |
#  |          |          |            |
#
#
# 不成功呼叫场景：
#
# UAC       proxy       UAS     presence server
#  |--INVITE->|          |            |
#  |<-100-----|--INVITE->|            |
#  |          |<-100-----|            |
#  |          |          |            |
#  |          |<-456xx---|            |
#  |<-456xx---|--ACK---->|            |
#  |--ACK---->|          |            |
...
```


```opensips title="Set publish_on_trying parameter to 1"
...
modparam("pua_dialoginfo", "publish_on_trying", 1)

# 成功呼叫场景：
#
# UAC       proxy       UAS     presence server
#  |--INVITE->|          |            |
#  |<-100-----|--INVITE->|            |
#  |          |--PUBLISH(trying)----->|
#  |          |<-100-----|            |
#  |          |          |            |
#  |          |<-18x-----|            |
#  |<-18x-----|--PUBLISH(early)------>|
#  |          |          |            |
#  |          |<-200-----|            |
#  |<-200-----|--PUBLISH(confirmed)-->|
#  |--ACK---->|          |            |
#  |          |--ACK---->|            |
#  |          |          |            |
#
#
# 不成功呼叫场景：
#
# UAC       proxy       UAS     presence server
#  |--INVITE->|          |            |
#  |<-100-----|--INVITE->|            |
#  |          |--PUBLISH(trying)----->|
#  |          |<-100-----|            |
#  |          |          |            |
#  |          |<-456xx---|            |
#  |          |--PUBLISH(terminated)->|
#  |<-456xx---|--ACK---->|            |
#  |--ACK---->|          |            |
...
```


#### nopublish_flag (str)


默认情况下，reINVITE 会触发 PUBLISH。它们实际上是
唯一有意义的对话内请求。
在某些情况下，重新发布对话状态没有意义
（例如处理 B2BUA reINVITE 时）。
该设置定义了需要在请求路由中设置的标志位，
以便在特定的 reINVITE 情况下阻止生成 PUBLISH 请求。


```opensips title="Set nopublish_flag parameter"
...
modparam("pua_dialoginfo", "nopublish_flag", "no_publish")
...
```


#### presence_server (string)


应向其发送 PUBLISH 消息的呈现服务器
地址（非必需）。


```opensips title="Set presence_server parameter"
...
modparam("pua_dialoginfo", "presence_server", "sip:ps@opensips.org:5060")
...
```


#### caller_spec_param (string)


将保存自定义主叫 URI 的伪变量名称。
若未设置该变量，则使用 From 头域中的信息。
若想使用其他主叫定义，必须在调用 [dialoginfo_set()](#dialoginfo_setside)
函数之前填充该伪变量。字符串
格式与 To/From SIP 头域格式相同：
"display_name&lt;sip_uri&gt;" 或 "sip_uri"。


```opensips title="Set caller_spec_param parameter"
...
modparam("pua_dialoginfo", "caller_spec_param", "$avp(10)")
...
		
```


#### callee_spec_param (string)


将保存被叫 URI 的伪变量名称。
若未设置该变量，则所使用的被叫信息
将由 To 显示名 URI + RURI 构成。
设置该伪变量的字符串格式
与 caller_spec_param 一节所述相同。


```opensips title="Set caller_spec_param parameter"
...
modparam("pua_dialoginfo", "callee_spec_param", "$avp(11)")
...
		
```


#### osips_ps (int)


建议在使用的呈现服务器不是 OpenSIPS 呈现服务器时，
将该参数设置为 0。
默认情况下，与 OpenSIPS 呈现服务器配合工作时会
使用一个技巧（将 Publish 消息体中的 version 设为 '0000000'）
以加快处理，而其他呈现服务器可能不接受此做法。


*默认值为 "1"。*


```opensips title="Set osips_ps parameter"
...
modparam("pua_dialoginfo", "osips_ps", 0)
...
		
```


### 导出函数 {#exported-functions}


#### dialoginfo_set([side]) {#dialoginfo_setside}


必须对初始化对话的 INVITE 消息调用该函数，
且该对话需要发布对话信息。


参数含义：


- *side*（字符串，可选）- 可为 "A" 或/和 "B"，
表示仅为主叫或被叫发布 —— 若缺省，则双方
都会被发布。


```opensips title="dialoginfo_set usage"
...
	if(is_method("INVITE"))
		if($ru =~ "opensips.org")
			dialoginfo_set();
...
		
```


#### dialoginfo_set_branch_callee(callee)


该函数仅应在分支路由中使用，用于设置
按分支的被叫/对端（peer）描述。该 peer 值仅会
用于为该特定分支创建的对话信息记录。


该函数仅在呼叫分叉（顺序/并行）
场景中有意义，即主叫可能与多个不同的
被叫关联。


参数含义：


- *callee*（字符串）- 被叫的 SIP 名称地址（name addr）描述
（name_addr 格式为 '[display] &lt;uri&gt;' 或
'uri'，与 To 或 From 头域中相同）


```opensips title="dialoginfo_set_branch_callee usage"
...
branch_route[out]
{
....
	# 使发布的信息与该分支的 RURI 一致
	dialoginfo_set_branch_callee("sip:$rU@opensips.org");
...
}
		
```


#### dialoginfo_mute_branch([side])


必须对 INVITE 消息、且仅在分支路由中调用该函数，
以屏蔽该分支所涉及的主叫/被叫/双方的
对话信息发布。


参数含义：


- *side*（字符串，可选）- 可为
"A" 或/和 "B"，表示仅屏蔽主叫或被叫 —— 若缺省，
则双方都会被屏蔽。


```opensips title="dialoginfo_mute_branch usage"
...
	branch_route[out] {
		# 若不是本地域，则屏蔽被叫侧的发布
		if (!is_domain_local("$rd"))
			dialoginfo_mute_branch("B");
	}
...
		
```
<!-- CONTRIBUTORS -->

### 许可证 {#license}

所有文档文件（即 .md 扩展名）均按 Creative Common License 4.0 授权
