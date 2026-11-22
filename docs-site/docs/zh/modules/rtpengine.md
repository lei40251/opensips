---
title: "rtpengine 模块"
description: "本模块使媒体流能够经由 RTP 代理进行中继。"
sidebar: false
---

## 管理指南 {#admin-guide}


### 概述 {#overview}


本模块使媒体流能够经由 RTP 代理进行中继。目前已知可与本模块配合工作的
RTP 代理只有 Sipwise rtpengine
[https://github.com/sipwise/rtpengine](https://github.com/sipwise/rtpengine)。
rtpengine 模块是原 rtpproxy 模块的修改版本，使用新的控制协议。从配置文件
的角度看，本模块被设计为旧模块的直接替代品，但由于控制协议不兼容，
它只能与专门支持该协议的 RTP 代理配合工作。


### 多 RTP 代理用法 {#multiple-rtp-proxy-usage}


rtpengine 模块支持多个 RTP 代理，用于均衡/分发以及控制/选择。


本模块允许定义若干组 rtpengine。负载均衡在组内进行，管理员
可以选择使用哪一组。组通过其 id 选择 —— id 在定义组时
指定。语法说明请参考
"[rtpengine_sock](#rtpengine_sock-string)" 模块参数定义。


组内的均衡由模块根据组内每个 RTP 代理的权重
自动完成。


组的选择在脚本中完成，且要在使用
rtpengine_delete()、rtpengine_offer() 或 rtpengine_answer()
函数之前进行 —— 参见 rtpengine_use_set() 函数。


选择组的另一种方式是定义 setid_avp
模块参数，并在调用 rtpengine_offer() 或 rtpengine_manage()
函数之前为所定义的 avp 赋值 setid。如果请求转发失败
且还有其他分支可尝试，记得在调用
rtpengine_delete() 函数之后 unset 该 avp。


出于向后兼容的原因，没有 id 的组默认
取 id 0。此外，如果在
rtpengine_delete()、rtpengine_offer() 或 rtpengine_answer() 之前
没有显式设置任何组，将使用 0 号组。


> [!IMPORTANT]
> 如果使用多个组，请注意为
> rtpengine_offer()/rtpengine_answer() 和 rtpengine_delete() 使用同一个组！！
> 如果通过 setid_avp 选择组，该 avp 只需在
> 调用 rtpengine_offer() 或 rtpengine_manage() 之前设置一次。

### 故障切换 {#failover}


如果所选节点存在通信问题，模块能够切换到组内的
新节点。此外，如果节点返回下列错误之一，它也会
执行故障切换：


- 达到并行会话上限
- 端口耗尽


可以使用 [extra_failover_error()](#extra_failover_error-string) 参数
扩展上述列表。


许多 rtpengine_* 函数接受 "sock_var" 参数，该参数
会被填充为特定操作所选择的 RTPEngine 的套接字。
"sock_var" 中存储的数据格式为："proto:ip:port"。如果指定了
"sock_var" 且其值非 NULL，则用它来确定
要使用的具体 RTPEngine。请注意，"sock_var"
指定的套接字必须是当前 RTPEngine
组上下文中的成员。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


必须先加载以下模块才能使用本模块：


- *tm 模块* -（可选）如果希望
rtpengine_manage() 功能完整


#### 外部库或应用 {#external-libraries-or-applications}


加载本模块运行 OpenSIPS 之前，必须安装以下
库或应用：


- *无*。


### 导出的参数 {#exported-parameters}


#### rtpengine_sock (string) {#rtpengine_sock-string}


用于连接（一组）RTP 代理的套接字定义。它可以
指定 UNIX 套接字或 IPv4/IPv6 UDP 套接字。如果缺少
协议部分（即 "udp:"），该套接字按
UNIX 套接字处理。


*默认值为 "NONE"（禁用）。*


```opensips title="Set rtpengine_sock parameter"
...
# 单个 rtproxy
modparam("rtpengine", "rtpengine_sock", "udp:localhost:12221")
# 用于负载均衡的多个 rtproxy
modparam("rtpengine", "rtpengine_sock",
	"udp:localhost:12221 udp:localhost:12222")
# 多个组，每组多个 rtproxy
modparam("rtpengine", "rtpengine_sock",
	"1 == udp:localhost:12221 udp:localhost:12222")
modparam("rtpengine", "rtpengine_sock",
	"2 == udp:localhost:12225")
...
```


#### rtpengine_disable_tout (integer)


一旦发现某个 RTP 代理不可达并将其标记为禁用，rtpengine
模块在 rtpengine_disable_tout 秒内不会再尝试与该 RTP 代理
建立通信。


*默认值为 "60"。*


```opensips title="Set rtpengine_disable_tout parameter"
...
modparam("rtpengine", "rtpengine_disable_tout", 20)
...
```


#### rtpengine_tout (integer)


等待 RTP 代理应答的超时值。


*默认值为 "1"。*


```opensips title="Set rtpengine_tout parameter"
...
modparam("rtpengine", "rtpengine_tout", 2)
...
```


#### rtpengine_retr (integer)


在发生超时后，模块应重试发送和接收的次数。


*默认值为 "5"。*


```opensips title="Set rtpengine_retr parameter"
...
modparam("rtpengine", "rtpengine_retr", 2)
...
```


#### rtpengine_timer_interval (integer) {#rtpengine_timer_interval-integer}


扫描 rtpengine 各组以探测禁用节点的频率。探测在
SIP 处理上下文之外、由单独的定时器例程完成。禁用的节点
在 rtpengine_disable_tout 秒之后被探测以重新启用。将该值设置得
过高可能导致禁用区间意外变大，因为探测前的最大间隔
为 (rtpengine_timer_interval + rtpengine_disable_tout) 秒。


默认值为 "5"。


```opensips title="Set rtpengine_timer_interval parameter"
...
modparam("rtpengine", "rtpengine_timer_interval", 1)
...
```


#### notification_sock (string)


一个格式为 *IP:port* 的 UDP 套接字，
表示 OpenSIPS 为接收来自 RTPengine 的通知（例如 DTMF 事件）
而绑定的监听 IP 和端口。


从 RTPengine 收到的每个通知都会触发
*E_RTPENGINE_NOTIFICATION* 事件。


*默认值为 "none" —— 通知被忽略。*


```opensips title="Set notification_sock parameter"
...
modparam("rtpengine", "notification_sock", "127.0.0.1:9999")
...
```


#### extra_id_pv (string) {#extra_id_pv-string}


该参数设置当在 rtpengine_delete()、rtpengine_offer()、
rtpengine_answer() 或 rtpengine_manage() 命令上使用
"via-branch=extra" 选项时所使用的 PV 定义。


默认为空，此时不能使用 "via-branch=extra" 选项。


```opensips title="Set extra_id_pv parameter"
...
modparam("rtpengine", "extra_id_pv", "$avp(extra_id)")
...
```


#### setid_avp (string)


该参数定义一个 AVP：如果它被设置，
就决定 rtpengine_offer()、rtpengine_answer()、
rtpengine_delete() 和 rtpengine_manage()
函数使用哪个 RTP 代理组。


没有默认值。


```opensips title="Set setid_avp parameter"
...
modparam("rtpengine", "setid_avp", "$avp(setid)")
...
```


#### error_pv (string)


该参数定义一个变量，当某个 rtpengine_* 函数失败时
由 RTP 填充。


没有默认值。


```opensips title="Set error_pv parameter"
...
modparam("rtpengine", "error_pv", "$var(rtpengine_error)")
...
```


#### db_url (string) {#db_url-string}


数据库 URL，用于从数据库加载 RTPEngine 套接字，
而不是在脚本中指定
（[rtpengine_sock](#rtpengine_sock-string)
模块参数）。


默认值为 "NULL"，即不使用
数据库。


```opensips title="Set db_url parameter"
...
modparam("rtpengine", "db_url", 
		"mysql://opensips:opensipsrw@localhost/opensips")
...
```


#### db_table (string)


存储 RTPEngine 套接字的表。
在配置了数据库 URL 时使用。


默认值为 "rtpengine"。


```opensips title="Set db_table parameter"
...
modparam("rtpengine", "db_table", "rtpengine_new")
...
```


#### socket_column (string)


数据库表中 rtpengine 套接字列的名称。


默认值为 "socket"。


```opensips title="Set socket_column parameter"
...
modparam("rtpengine", "socket_column", "sock")
...
```


#### set_column (string)


数据库表中 rtpengine 组列的名称。


默认值为 "set_id"。


```opensips title="Set set_column parameter"
...
modparam("rtpengine", "set_column", "set_new")
...
```


#### ping_enabled (integer)


该参数表示是否也应对已启用的节点进行探测。


如果设置该参数，每个已启用的节点都会
每 [rtpengine_timer_interval](#rtpengine_timer_interval-integer) 秒被 ping 一次，除非
自上一个间隔以来与该节点有过任何通信。


*默认值为 "0"（禁用）。*


```opensips title="Set ping_enabled parameter"
...
modparam("rtpengine", "ping_enabled", yes)
...
```


### 导出的函数 {#exported-functions}


#### rtpengine_use_set(setid)


为接下来的 rtpengine_delete()、rtpengine_offer()、rtpengine_answer()
或 rtpengine_manage() 命令设置要使用的 RTP 代理组 ID。
该参数是一个整数。


该函数可在 REQUEST_ROUTE、ONREPLY_ROUTE、
BRANCH_ROUTE 中使用。


```opensips title="rtpengine_use_set usage"
...
rtpengine_use_set(2);
rtpengine_offer();
...
```


#### rtpengine_offer([flags[, sock_var[, sdp_pvar[, body]]]]) {#rtpengine_offerflags-sock_var-sdp_pvar-body}


重写 SDP 消息体，以确保媒体经由
RTP 代理传输。应在以下情形调用：
SDP 位于 INVITE 和 200 OK 中时用于 INVITE；SDP 位于 200 OK 和 ACK 中时
用于 200 OK。


参数含义如下：


- *flags(string, optional)* - 用于开启某些特性的标志。
"flags" 字符串是以空格分隔的项列表。每一项
要么是单独的标记，要么是 "key=value" 格式的标记。可能
的标记如下所述。
传入 OpenSIPS 不认识的选项时，该选项会被
原样发送给 rtpengine 守护进程处理。

  - *via-branch=...* - 在发送给 RTP 代理的请求中包含某个
"Via" 头域的 "branch" 值。可能的取值为：
"1" - 使用第一个 "Via" 头域；
"2" - 使用第二个 "Via" 头域；
"auto" - 如果这是请求则使用第一个 "Via" 头域，
如果是应答则使用第二个；
"extra" - 不从任何头域取值，而是使用
"[extra_id_pv](#extra_id_pv-string)" 变量的值。
这可用于在 RTP 代理上为每个分支创建一个媒体会话。
随后向 RTP 代理发送 "delete" 命令时，只要在
"rtpengine_delete" 中传入标志 '1' 或 '2'，就可以只停止特定分支的会话，
或者在不传入这两个标志时停止该呼叫的
所有会话。如果存在串行分叉的呼叫场景，即 RTP 代理
收到新分支的 "offer" 命令，随后又收到前一个分支的
"delete" 命令（否则会删除整个呼叫，破坏新分支后续的
"answer"），这一点尤其有用。*目前只有 Sipwise rtpengine
RTP 代理支持该标志！*
  - *via-branch-param=...* - 为
*via-branch* 参数提供自定义值。
  - *call-id* - 为会话提供自定义 Call-ID。如果
缺失，则使用请求/应答的 Call-Id。
  - *from-tag* - 为会话提供自定义 from-tag。如果
缺失，则使用请求的 from-tag。
  - *no-from-tag* - 在发送给 RTP 代理的命令中不包含 from-tag。
当命令必须应用于呼叫的所有分支而不是
选择特定呼叫腿时，可以使用该选项。
  - *to-tag* - 为会话提供自定义 to-tag。如果
缺失，则使用请求/应答的 to-tag（如果存在）。
  - *asymmetric* - 标志表示接收消息的 UA
不支持对称 RTP。（会自动设置 'r' 标志）
  - *force-answer* - 强制 "answer"，也就是说，
仅当 RTP 代理中已存在对应会话时才重写 SDP。
默认在会话即将完成时开启。
  - *in-iface=..., out-iface=...* - 这些标志指定 SIP 消息的
方向。这些标志仅在 RTP 代理以桥接模式
运行时才有意义。"in-iface" 应指明代理的入向
接口，而 "out-iface" 对应 RTP 代理的
出向接口。你总需要指定两个标志来定义
入向网络和出向网络。例如，对于从本地接口接收
并通过外部接口发出的 SIP 消息，应使用
"in-iface=internal out-iface=external"。
  - *internal, external* - 这些是用于
指定呼叫方向的旧标志。它们现在已过时，被
"in-iface=internal out-iface=external" 配置取代。
  - *auto-bridge* - 该标志是 "internal" 和 "external" 标志的
替代方案，用于在 "internal network" 上的 IPv4
与 "external network" 上的 IPv6 之间自动桥接。它不需要
显式指示 RTP 代理选择特定的地址
族，而是由 RTP 代理根据 SDP 消息体中的给定 IP
自行区分。Sipwise rtpengine 不支持该选项。
  - *address-family=...* - 指示 RTP 代理该
SDP 消息体的接收方期望看到特定地址族的地址。
可能的取值为 "IP4" 和 "IP6"。例如，
如果 SDP 消息体包含 IPv4 地址但接收方只支持 IPv6，
可以使用 "address-family=IP6" 在两个地址族之间
桥接。
Sipwise rtpengine 在看过某一方的 SDP 消息体之后
会记住该方的地址族偏好。这意味着通常只需
在 "offer" 中显式指定地址族，
而不必在 "answer" 中指定。
注意：请留意，这仅在非双栈用户代理或
符合 RFC6157 的双栈客户端（该 RFC 建议双栈实现使用 ICE）上
才能正常工作。该捷径在符合 RFC4091（ANAT）的客户端上
无法正常工作，因为后者建议
将具有不同 IP 协议的不同 m-line 分组在一起。
  - *received-from=...* - 设置接收到带 SDP 的 SIP 包的地址。
该标志总是自动设置，除非有理由，否则不要使用它。
  - *force* - 指示 RTP 代理忽略传输途中其他 RTP 代理
插入的、用于表示会话已通过另一个代理的标记。
允许创建代理链。Sipwise rtpengine 不支持并会忽略该选项。
  - *trust-address* - 标志表示应信任 SDP 中的
IP 地址。没有该标志时，RTP 代理会忽略 SDP
中的地址，而使用 SIP 消息的源地址作为媒体
地址并传给 RTP 代理。从 rtpengine 3.8 起，这是默认行为。
  - *SIP-source-address* - trust-address 的反面。
恢复忽略 SDP 消息体中地址端点的旧默认行为。
  - *replace-origin* - 标志表示 origin
描述（o=）中的 IP 也应被修改。
  - *replace-session-connection* - 标志表示当媒体描述中也
包含连接信息时，修改会话级
SDP 连接（c=）IP。
  - *replace-zero-address* - 标志表示用真实地址替换零地址。
使用零端点地址是一种表示静音或仅发送流的过时方式。
带零地址的流通常被标记为 sendonly，SDP 中的
零地址会被透传。
  - *symmetric* - 标志表示对于接收
消息的 UA，必须强制支持对称 RTP。你不需要
显式指定该值，因为它是默认值，只有在使用
*asymmetric* 时行为才会改变。
  - *repacketize=NN* - 请求 RTP 代理对来自
发送当前消息的 UA 的 RTP 流量重新打包，
以便在可能的情况下增大或减小每个转发的 RTP 包的载荷
大小。NN 是目标载荷大小，单位为 ms，对大多数编解码器其取值
应以 10ms 递增，但对某些编解码器增量
可能不同（例如 GSM 为 30ms，G.723 为 20ms）。RTP
代理会选择编解码器支持的最接近的值。
该特性可用于显著降低低比特率编解码器的
带宽开销，例如 G.729 从 10ms 改为 100ms
可节省三分之二的网络带宽。
Sipwise rtpengine 不支持该选项。
  - *loop-protect* - 标志指示 RTP 在
循环同一消息时避免重写 SDP。
  - *ICE=...* - 控制 RTP 代理在 SDP 消息体
内处理 ICE 属性的行为。可能的取值为：
"force" -
丢弃 SDP 消息体中已有的任何 ICE 属性，
然后生成并插入新的 ICE 数据，使自己成为
*唯一*的 ICE 候选；
"remove" 指示 RTP 代理丢弃
任何 ICE 属性，并且不向 SDP 插入任何新的 ICE 属性。
默认情况下（完全未给出 "ICE=..." 时），
仅当 SDP 原本不含 ICE 时才会生成
新的 ICE 数据；否则
RTP 代理只会将自己作为*附加*
ICE 候选插入。其他
SDP 替换（c=、m= 等）不受该标志影响。
  - *RTP, SRTP, AVP, AVPF* - 这些标志控制应向
SDP 接收方使用的 RTP 传输协议。如果都未指定，
SDP 中给出的协议保持不变。否则，"SRTP" 标志
表示应使用 SRTP，而 "RTP" 表示不应使用 SRTP。
"AVPF" 表示应使用带反馈消息的高级 RTCP 配置，
"AVP" 表示应使用常规 RTCP 配置。
另请参见下面的一组标志。
  - *RTP/AVP, RTP/SAVP, RTP/AVPF, RTP/SAVPF* - 这些是
另一种更显式的方式，用于在 RTP 代理支持的
不同 RTP 协议与配置之间进行选择。例如，给出标志
"RTP/SAVPF" 与给出 "SRTP AVPF" 两个标志效果相同。
  - *to-tag* - 强制包含 "To" tag。
通常，"To" tag 只要存在就总会被包含，
但 "delete" 消息除外。在 "delete" 消息中包含
"To" tag 可以更精确地选择呼叫内
要拆除的对话。
  - *to-tag=...* - 使用指定字符串作为 "To"
tag，而不是 SIP 消息中的实际 "To" tag，并按上述
方式强制在消息中包含该 tag。
  - *from-tag=...* - 使用指定字符串作为
"From" tag，而不是 SIP 消息中的实际 "From"
tag。
  - *call-id=...* - 使用指定字符串作为
"Call-ID"，而不是 SIP 消息中的实际 "Call-ID"。
  - *rtcp-mux-demux* - 如果提供了 rtcp-mux（RFC 5761），
让 RTP 代理接受该 offer，但不向该消息的
接收方提供。
  - *rtcp-mux-reject* - 如果提供了 rtcp-mux，让
RTP 代理拒绝该 offer，但仍向接收方提供。可与
"rtcp-mux-offer" 组合，以便始终提供。
  - *rtcp-mux-offer* - 让 RTP 代理向该消息的
接收方提供 rtcp-mux，无论原本是否提供过。
  - *rtcp-mux-require* - 与 offer 类似，但假定
客户端已接受 rtcp-mux。这违反了 RFC 5761，且不会通告
独立的 RTCP 端口。WebRTC 客户端需要该选项。
  - *rtcp-mux-accept* - 如果提供了 rtcp-mux，让
RTP 代理接受该 offer，并同时向该消息的接收方
提供。可与 "rtcp-mux-offer" 组合，以便始终提供。
  - *media-address=...* - 强制在 SDP 消息体中
使用特定的媒体地址。地址族会自动检测。
  - *record-call=yes/no* - 表示 rtpengine 是否应
录制该呼叫。使用该参数时，可以在 "metadata" 中
传递更多信息。
  - *transcode-CODEC* - 仅用于 offer，表示
rtpengine 应向 B 侧转码 CODEC。示例：
*transcode-PCMA* 会向 B 侧呈现 PCMA 编解码器。
  - *codec-strip-CODEC* - 仅用于 offer，表示
呼叫的 A 侧最终不会使用 CODEC 通话。示例：
*codec-strip-PCMA* 会阻止 A 侧收到
PCMA 编解码器。
  - *codec-mask-CODEC* - 仅用于 offer，表示
A 侧将使用 CODEC，但不会向 B 侧呈现。示例：
*codec-mask-PCMA* 会使 A 侧收到 PCMA 编解码器，
而 B 侧会使用其他编解码器。
- *sock_var(var, optional)* - 用于存储为此呼叫所选的 rtpengine
套接字的变量。
- *sdp_var(var, optional)* - 用于存储从 rtpengine 收到的
完整 SDP 的变量。可以对该字符串执行任何额外修改。
*重要：*提供该变量后，消息体不再被修改，
因此必须手动替换它！。
- *body(string, optional)* - 用于向 rtpengine_* 函数
提供特定消息体。如果缺少该参数，
则使用当前消息的消息体。


该函数可在 ALL_ROUTES 中使用。


```opensips title="rtpengine_offer usage"
route {
...
    if (is_method("INVITE")) {
        if (has_body("application/sdp")) {
            if (rtpengine_offer())
                t_on_reply("1");
        } else {
            t_on_reply("2");
        }
    }
    if (is_method("ACK") && has_body("application/sdp"))
        rtpengine_answer();
...
}

onreply_route[1]
{
...
    if (has_body("application/sdp"))
        rtpengine_answer();
...
}

onreply_route[2]
{
...
    if (has_body("application/sdp"))
        rtpengine_offer();
...
}
```


```opensips title="rtpengine_offer usage with body replace"
...
if (rtpengine_offer(, $var(socket), $var(body), $rb)) {
    xlog("Used rtpengine $var(socket)\n");
    # 在 $var(body) 中得到的结果 SDP 上做所有修改
    ...
    remove_body_part();
    add_body_part($var(body), "application/sdp");
}
...
```


```opensips title="rtpengine_offer usage with call recording"
...
$var(rtpengine_flags) = $var(rtpengine_flags) + " record-call=yes";

$json(recording_keys) := "{}";
$json(recording_keys/callId) = $ci;
$json(recording_keys/fromUser) = $dlg_val(recording_from_user);
$json(recording_keys/fromDomain) = $dlg_val(recording_from_domain);
$json(recording_keys/fromTag) = $dlg_val(recording_from_tag);
$json(recording_keys/toUser) = $dlg_val(recording_to_user);
$json(recording_keys/toDomain) = $dlg_val(recording_to_domain);

$var(rtpengine_flags) = $var(rtpengine_flags) + " metadata=" + $(json(recording_keys){s.encode.hexa});
rtpengine_offer($var(rtpengine_flags));
...
```


```opensips title="rtpengine_offer usage for transcoding"
...
# 目标：让 A 侧使用 PCMA，让 B 侧使用 opus
# * 不向 B 侧呈现 PCMA：codec-mask-PCMA，但在 A 侧使用它
# * A 侧不使用 opus：codec-strip-opus
# * 向 B 侧提供 opus：transcode-opus
rtpengine_offer("... codec-mask-PCMA codec-strip-opus transcode-opus ...");
...
```


##### extra_failover_error (string) {#extra_failover_error-string}


包含一个（XDB）正则表达式，可用于
匹配从 RTPEngine 节点收到的错误。如果匹配，
模块会尝试使用新节点来处理受影响的命令。


该参数可用于扩展模块隐式
执行故障切换的错误列表（见 [failover](#failover)）。


> [!NOTE]
> 每条声明将定义一个
> 表达式/匹配规则。如果要定义多条规则，
> 需要多次定义该参数。


默认值为空，即不使用额外错误。


```opensips title="Set extra_failover_error parameter"
...
modparam("rtpengine", "extra_failover_error", "Parallel session limit reached")
...
```


#### rtpengine_answer([flags[, sock_pvar[, sdp_pvar[, body]]]]) {#rtpengine_answerflags-sock_pvar-sdp_pvar-body}


重写 SDP 消息体，以确保媒体经由
RTP 代理传输。应在以下情形调用：
SDP 位于 INVITE 和 200 OK 中时用于 200 OK；SDP 位于 200 OK 和 ACK 中时
用于 ACK。


参数含义参见上面的 rtpengine_offer() 函数说明。


该函数可在 REQUEST_ROUTE、ONREPLY_ROUTE、
FAILURE_ROUTE、BRANCH_ROUTE 中使用。


示例参见上面的 rtpengine_offer() 函数示例。


#### rtpengine_delete([flags[, sock_var]]) {#rtpengine_deleteflags-sock_var}


拆除当前呼叫的 RTPEngine 会话。


参数含义参见上面的 rtpengine_offer() 函数说明。注意并非所有
标志对 "delete" 都有意义。


该函数可在 ALL_ROUTES 中使用。


```opensips title="rtpengine_delete usage"
...
rtpengine_delete();
...
```


#### rtpengine_manage([flags[, sock_var[, sdp_var[, body]]]])


管理 RTPEngine 会话 —— 它合并了
rtpengine_offer()、rtpengine_answer() 和 rtpengine_delete() 的功能，在内部
根据消息类型和方法判断执行哪一个。


它可以接受与 `rtpengine_offer()` 相同的参数。
传给 rtpengine_manage() 的 flags 参数可以是
包含标志字符串的配置变量。


功能：


- 如果是带 SDP 的 INVITE，则执行 `rtpengine_offer()`
- 如果是带 SDP 的 ACK，则执行 `rtpengine_answer()`
- 如果是 BYE 或 CANCEL，或在 FAILURE_ROUTE[] 中调用，则执行 `rtpengine_delete()`
- 如果对 INVITE 的应答代码 >= 300，则执行 `rtpengine_delete()`
- 如果对 INVITE 的带 SDP 应答代码为 1xx 和 2xx，则在请求带有 SDP
或未加载 tm 时执行 `rtpengine_answer()`，
否则执行 `rtpengine_offer()`


该函数可在 ALL_ROUTES 中使用。


```opensips title="rtpengine_manage usage"
...
rtpengine_manage();
...
```


#### rtpengine_start_recording([flags [, sock_var]])


该函数向 RTP 代理发送信号，以在 RTP 代理上
录制 RTP 流。


参数含义如下：


- *flags(string, optional)* - 用于改变录制器行为的标志。
一个重要的取值是 *call-id* 值，可用于
开始录制与所请求呼叫不同的呼叫。
- *sock_var(var, optional)* - 用于存储为此呼叫所选的 rtpengine
套接字的变量。


该函数可在任意路由中使用。


```opensips title="rtpengine_start_recording usage"
...
rtpengine_start_recording();
...	
```


#### rtpengine_stop_recording([flags [, sock_var]])


该函数向 RTP 代理发送信号，以停止
在 RTP 代理上录制 RTP 流。


参数含义如下：


- *flags(string, optional)* - 用于改变录制器行为的标志。
一个重要的取值是 *call-id* 值，可用于
开始录制与所请求呼叫不同的呼叫。
- *sock_var(var, optional)* - 用于存储为此呼叫所选的 rtpengine
套接字的变量。


该函数可在任意路由中使用。


```opensips title="rtpengine_stop_recording usage"
...
rtpengine_stop_recording();
...
		
```


#### rtpengine_pause_recording([flags [, sock_var]])


该函数向 RTP 代理发送信号，以暂停
在 RTP 代理上录制 RTP 流。它与停止录制相同，区别在于它
指示录制守护进程不要关闭录制文件，而是保持其打开，
以便之后可以通过另一条开始录制消息恢复录制。


参数含义如下：


- *flags(string, optional)* - 用于改变录制器行为的标志。
一个重要的取值是 *call-id* 值，可用于
开始录制与所请求呼叫不同的呼叫。
- *sock_var(var, optional)* - 用于存储为此呼叫所选的 rtpengine
套接字的变量。


该函数可在任意路由中使用。


```opensips title="rtpengine_pause_recording usage"
...
rtpengine_stop_recording();
...
		
```


#### rtpengine_play_media(flags, [duration_spec[, sock_var[, sockvar]]])


该函数将开始向其中一个端点播放媒体文件。


参数含义如下：


- *flags(string)* - 与其他函数类似的标志列表。
必须指定 *file*、
*blob* 或 *db-id* 参数之一，以指明要播放的媒体文件内容。
*file* 是常见选择，用于指定 rtpengine
从文件路径获取媒体；*blob* 用于从内联字符串
获取内容；*db-id* 用于
从数据库获取内容。
媒体流的方向由
*from-tag* 参数、*address*
（SDP 中的媒体地址）或 *label* 控制（如果
媒体流包含 label）。如果这些都缺失，媒体
文件将播放给 SIP 请求的发起方，效果类似于
回铃音。
- *duration_spec(var, optional)* - 一个伪变量，
将包含所播放文件的时长。如果无法确定时长，
则将其设置为 *-1*。
- *sock_var(var, optional)* - 用于存储为此呼叫所选的 rtpengine
套接字的变量。


该函数可在任意路由中使用。


```opensips title="Ringback tone using rtpengine_play_media"
...
if (is_method("INVITE") && !has_totag())
	rtpengine_play_media("file=/path/to/ringback_tone_file.wav");
...
		
```


```opensips title="Manage music on hold using rtpengine_play_media"
...
if (is_method("INVITE") && has_totag()) {
	if (is_audio_on_hold()) {
		$dlg_val(on_hold) = "1";
		rtpengine_play_media("from-tag=$tt file=/path/to/moh_file.wav");
	} else if ($dlg_val(on_hold) == "1") {
		$dlg_val(on_hold) = "0";
		rtpengine_stop_media("from-tag=$tt");
	}
}
...
		
```


#### rtpengine_stop_media(flags[, [sock_var[, sockvar]], [last_frame_pos]])


该函数将停止播放先前由
`rtpengine_play_media()` 调用启动的媒体文件。其参数
含义与前面的函数类似。注意调用该
函数时应使用与其对应的
`rtpengine_play_media()` 调用相似的参数，否则
RTPEngine 将无法停止媒体播放。


参数含义如下：


- *flags(string)* - 与其他函数类似的标志
列表。
- *last_frame_pos(var, optional)* - 一个伪变量，
将包含文件最后播放的帧。


该函数可在任意路由中使用。


```opensips title="Ringback tone stop using rtpengine_stop_media"
...
if (is_method("INVITE") && $rs == 200)
	rtpengine_stop_media();
...
		
```


```opensips title="Example use of the last-frame-pos parameter rtpengine_stop_media"
...
if (is_method("INVITE") && has_totag()) {
	if (is_audio_on_hold()) {
		$dlg_val(on_hold = "1";
		rtpengine_play_media("from-tag=$tt start-pos=$avp(last_frame_pos) file=/path/to/moh_file.wav");
	} else if ($dlg_val(on_hold) == "1") {
		rtpengine_stop_media("from-tag=$tt", , $avp(last_frame_pos));
		$dlg_val(on_hold = "0");
	}
}
	rtpengine_stop_media();
...
		
```


#### rtpengine_block_media([flags[, sockvar]])


该函数将阻塞从其中一个端点发送的媒体。
被阻塞的方向由 *flags*
参数中的 *from-tag* 值控制。


该函数可在任意路由中使用。


```opensips title="Example of rtpengine_block_media usage"
...
rtpengine_block_media();
...
		
```


#### rtpengine_unblock_media([flags[, sockvar]])


该函数将恢复/解除阻塞从其中一个端点发送的媒体。
被阻塞的方向由 *flags*
参数中的 *from-tag* 值控制。


该函数可在任意路由中使用。


```opensips title="Example of rtpengine_unblock_media usage"
...
rtpengine_unblock_media();
...
		
```


#### rtpengine_block_dtmf([flags[, sockvar]])


该函数将阻塞从其中一个端点发送的 DTMF 媒体。
被阻塞的方向由 *flags*
参数中的 *from-tag* 值控制。


该函数可在任意路由中使用。


```opensips title="Example of rtpengine_block_dtmf usage"
...
rtpengine_block_dtmf();
...
		
```


#### rtpengine_unblock_dtmf([flags[, sockvar]])


该函数将恢复/解除阻塞从其中一个端点发送的 DTMF 媒体。
被阻塞的方向由 *flags*
参数中的 *from-tag* 值控制。


该函数可在任意路由中使用。


```opensips title="Example of rtpengine_unblock_dtmf usage"
...
rtpengine_unblock_dtmf();
...
		
```


#### rtpengine_start_forwarding([flags[, sockvar]])


该函数将开始将媒体转发到 RTPEngine 的
*tls-send-to* 参数中指定的 TLS 目的地。该函数允许
通过指定要转发媒体的实体的 *from-tag*
来选择媒体流。如果缺失，则转发所有媒体流。


该函数可在任意路由中使用。


```opensips title="Example of rtpengine_start_forwarding usage"
...
rtpengine_start_forwarding();
...
		
```


#### rtpengine_stop_forwarding([flags[, sockvar]])


该函数将停止转发先前使用
*rtpengine_start_forwarding()* 函数启动的媒体。


该函数可在任意路由中使用。


```opensips title="Example of rtpengine_stop_forwarding usage"
...
rtpengine_stop_forwarding();
...
		
```


#### rtpengine_play_dtmf(code, [flags[, sockvar]])


该函数指示 RTP 向通话参与者发送 DTMF *code*。
*code* 可以是数字（"0-9"）或特殊字符
（"*,#,A,B,C,D" 之一）。可使用 *flags*
参数配置其他参数。更多信息请查阅 RTP 文档。


> [!NOTE]
> 如果计划在会话中注入 DTMF，
> 必须在创建会话时指定 *inject-DTMF* 标志。


该函数可用于将 SIP INFO DTMF 按键转换为 RTP DTMF。


该函数可在任意路由中使用。


```opensips title="Example of rtpengine_play_dtmf usage"
...
rtpengine_play_dtmf("0"); # send the 0 code upstream
...
```


### 导出的异步函数 {#exported-asynchronous-functions}


#### rtpengine_offer([flags[, sock_pvar[, sdp_pvar[, body]]]])


[rtpengine_offer()](#rtpengine_offerflags-sock_var-sdp_pvar-body)
函数的异步版本。它接受相同的参数，含义相同。


```opensips title="Example of async rtpengine_offer() usage"
...
if (is_method("ACK") && has_totag() && has_body_part("application/sdp")) {
	async(rtpengine_offer(), resume_invite);
}
...
route[resume_invite] {
	t_relay();
}
...
```


#### rtpengine_answer([flags[, sock_pvar[, sdp_pvar[, body]]]])


[rtpengine_answer()](#rtpengine_answerflags-sock_pvar-sdp_pvar-body)
函数的异步版本。它接受相同的参数，含义相同。


```opensips title="Example of async rtpengine_answer() usage"
...
if (is_method("ACK") && has_body_part("application/sdp")) {
	# 延迟协商
	async(rtpengine_answer(), resume_ack);
}
...
route[resume_ack] {
	t_relay();
}
...
```


#### rtpengine_delete([flags[, sock_var]])


[rtpengine_delete()](#rtpengine_deleteflags-sock_var)
函数的异步版本。它接受相同的参数，含义相同。


```opensips title="Example of async rtpengine_delete() usage"
...
if (is_method("BYE")) {
	launch(rtpengine_delete());
}
...
```


### 导出的伪变量 {#exported-pseudo-variables}


#### $rtpstat


返回来自 RTP 代理的 RTP 统计。来自 RTP 代理的 RTP 统计
以字符串形式提供，其中包含若干个包计数器。


```opensips title="$rtpstat Usage"
...
    append_hf("X-RTP-Statistics: $rtpstat\r\n");
...
```


#### $rtpstat(STAT)[index]


返回下列预定义统计之一：


- *MOS-average* - 不带索引时，返回参与该呼叫的
所有 RTP 流（主叫和被叫）的平均 MOS
值，以 0 到 50 之间的整数表示。如果指定了索引，它
必须是呼叫涉及的 *from-tag*
或 *to-tag* 之一。此时变量
将返回该端点以相应 tag 值生成的所有流的
平均 MOS。如果需要更细粒度的统计，请查看
*$rtpquery* 变量。
- *jitter-average* - 行为与
*MOS-average* 类似，但返回平均抖动。
- *roundtrip-average* - 行为与
*MOS-average* 类似，但返回平均往返时延。
- *packetloss-average* - 行为与
*MOS-average* 类似，但返回平均丢包。
- *MOS-min* - 不带索引时，返回参与该呼叫的
所有 RTP 流（主叫和被叫）的最小 MOS 值
（0 到 50 之间的整数值）。
如果指定了索引，其效果与
*MOS-average* 相同。
- *jitter-min* - 行为与
*MOS-min* 类似，但返回某条腿/呼叫的最小抖动。
- *roundtrip-min* - 行为与
*MOS-min* 类似，但返回某条腿/呼叫的最小往返时延。
- *packetloss-min* - 行为与
*MOS-min* 类似，但返回某条腿/呼叫的最小丢包。
- *MOS-max* - 不带索引时，返回参与该呼叫的
所有 RTP 流（主叫和被叫）的最大 MOS 值
（0 到 50 之间的整数值）。
如果指定了索引，其效果与
*MOS-average* 相同。
- *jitter-max* - 行为与
*MOS-max* 类似，但返回某条腿/呼叫的最大抖动。
- *roundtrip-max* - 行为与
*MOS-max* 类似，但返回某条腿/呼叫的最大往返时延。
- *packetloss-max* - 行为与
*MOS-max* 类似，但返回某条腿/呼叫的最大丢包。
- *MOS-min-at* - 不带索引时，返回从呼叫开始到
MOS 值最小时所经过的时间（秒）。
如果指定了索引，其效果与
*MOS-average* 相同。
- *jitter-min-at* - 行为与
*MOS-min-at* 类似，但返回检测到最小
抖动的时间。
- *roundtrip-min-at* - 行为与
*MOS-min-at* 类似，但返回检测到最小
往返时延的时间。
- *packetloss-min-at* - 行为与
*MOS-min-at* 类似，但返回检测到某条腿/呼叫
最小丢包的时间。
- *MOS-max-at* - 不带索引时，返回从呼叫开始到
MOS 值最大时所经过的时间（秒）。
如果指定了索引，其效果与
*MOS-average* 相同。
- *jitter-max-at* - 行为与
*MOS-max-at* 类似，但返回检测到最大
抖动值的时间。
- *roundtrip-max-at* - 行为与
*MOS-max-at* 类似，但返回检测到最大
往返时延值的时间。
- *packetloss-min-at* - 行为与
*MOS-max-at* 类似，但返回检测到某条腿/呼叫
最大丢包的时间。


> [!NOTE]
> 所有这些统计均基于
> RTPEngine 生成的统计计算。其中一些可能并非对
> 所有呼叫都可用（例如呼叫太短，或
> 话机未通过 RTCP 正确上报 RTP 统计时，无法计算 MOS）。在这些情况下
> 变量返回 *NULL* 值。


```opensips title="$rtpstat(STAT)"
...
    xlog("Average MOS of the entire call is $rtpstat(MOS-average)\r\n");
    xlog("Average MOS of caller is $(rtpstat(MOS-average)[$ft])\r\n");
    xlog("Average MOS of callee is $(rtpstat(MOS-average)[$tt])\r\n");
    xlog("Min MOS of caller is $(rtpstat(MOS-min)[$ft]) reported at $(rtpstat(MOS-min-at)[$ft])\r\n");
...
```


#### $rtpquery


向 RTP 代理发送 Query 命令，并以 JSON 格式返回应答。
可使用该变量从 RTP 代理获取任意数据，例如
呼叫的原始统计或其他指标。


可使用 *$json()* 变量解析
其输出，并从查询结果中提取任何信息，例如
RTP 统计或 MOS 值。


```opensips title="$rtpquery Usage"
...
	$json(reply) := $rtpquery;
	xlog("Total RTP Stats: $json(reply/totals)\n");
...
```


### 导出的 MI 函数 {#exported-mi-functions}


#### rtpengine_enable


启用/禁用 RTP 代理。


参数：


- *url* - RTP 代理 url（与配置文件中的
定义完全一致）。
- *enable* - 1 - 启用 RTP 代理，0 - 禁用 RTP 代理，2 - 将 RTP 节点置于探测模式。
- *setid*（可选）要更新的节点的组 ID。如果提供，则只更新所提供组中的节点。


> [!NOTE]
> 如果某个 RTP 代理被多次定义（在同一组或
> 不同组中），在未提供组 ID 的情况下，它的所有实例
> 都会被启用/禁用。


```bash title="rtpengine_enable usage"
...
## 按 URL 禁用所有 rtpengine
$ opensips-cli -x mi rtpengine_enable udp:192.168.2.133:8081 0
## 按 URL 和组 ID (3) 启用 rtpengine
$ opensips-cli -x mi rtpengine_enable url=udp:192.168.2.133:8081 enable=1 setid=3
...
```


#### rtpengine_show


显示所有 RTP 代理及其信息：组和
状态（是否禁用、权重和 recheck_ticks）。


无参数。


```bash title="rtpengine_show usage"
...
$ opensips-cli -x mi rtpengine_show
...
```


#### rtpengine_reload


从数据库重新加载所有 rtpengine 组。仅在设置了
"[db_url](#db_url-string)" 参数时使用。


参数：


- *type*（可选）soft - 从数据库重新加载节点时，
复用任何现有套接字并保留节点现有的
禁用状态。如果未提供，则先拆除所有节点和套接字，
然后从数据库加载节点。


无参数。


```bash title="rtpengine_reload usage"
...
$ opensips-cli -x mi rtpengine_reload
$ opensips-cli -x mi rtpengine_reload type=soft
...
```


#### teardown


通过作为参数给出的 SIP Call-ID 终止 SIP 对话。


参数：


- *callid* - SIP Call-ID。


注意这只是对 "dialog" 模块提供的
"dlg_end_dlg" MI 函数的一个包装函数。之所以做此包装，
只是为了让 rtpengine 在基于 RTP 超时尝试终止 SIP 呼叫时
能正常工作。


```bash title="teardown usage"
...
$ opensips-cli -x mi teardown Y2IwYjQ2YmE2ZDg5MWVkNDNkZGIwZjAzNGM1ZDY0ZDQ
...
```


### 导出的事件 {#exported-events}


#### E_RTPENGINE_NOTIFICATION


当从 RTPengine 收到通知时会触发该事件。


参数表示从 RTPengine 收到的 Json 请求中的各节点。
常见取值包括：


- *type* - 标识通知类型（例如 DTMF）
- *callid* - 触发该事件的呼叫的 callid
- *source_tag* - 触发该事件的呼叫的 from tag
- *timestamp* - 触发该事件时的时间戳


对于收到的 DTMF 事件，还会得到以下节点：


- *source_ip* - 触发 DTMF 的 IP
- *event* - 按下的事件/按键
- *duration* - 按键按下的时长
- *volume* - 音调的音量


#### E_RTPENGINE_STATUS


当 RTPEngine 服务器将其状态变为
active/inactive 时会触发该事件。


参数：


- *socket* - 标识
RTPEngine 实例的套接字。
- *status* - 如果 RTPEngine 实例响应探测则为
*active*；如果实例被停用则为
*inactive*。
- *set* - 该 RTPEngine 实例所属组的
数字 id。


## 常见问题 {#frequently-asked-questions}


**问：如何从 "rtpproxy" 或 "rtpproxy-ng" 迁移到
"rtpengine"？**


大部分情况下只有函数名发生了变化，每个名称中的
"rtpproxy" 都被替换为 "rtpengine"。
例如，"rtpproxy_manage()" 变成了
"rtpengine_manage()"。一些重名的函数也得到了合并，
例如现在只有一个 "rtpengine_delete()"，而不是
"unforce_rtp_proxy()" 和与之相同的 "rtpproxy_destroy()"。


与旧模块最大的差异是标志如何传给
"rtpengine_offer()"、"rtpengine_answer()"、
"rtpengine_manage()" 和 "rtpengine_delete()"。它们不再
接受由单字母标志组成的字符串，而是接受以空格分隔的
项组成的字符串，每一项要么是单独的标记（单词），要么是 "key=value"
对。


例如，如果你有调用 "rtpproxy_offer("FRWOC+PS");"，那么它将
变成：

最后，如果你曾使用这些函数的第二个参数（显式媒体地址），
它已被第一个标志字符串中的 "media-address=..."
选项取代。


**问：在哪里可以找到更多关于 OpenSIPS 的信息？**


请看 [https://opensips.org/](https://opensips.org/)。


**问：在哪里可以就本模块提问？**


首先检查你的问题是否已在我们某个邮件列表中
得到了回答：

关于任何稳定版 OpenSIPS 的邮件应发送到
users@lists.opensips.org，关于开发版本的邮件
应发送到 devel@lists.opensips.org。

如果希望邮件保持私密，请发送到
users@lists.opensips.org。


**问：如何报告 bug？**


请遵循以下位置提供的指南：
[https://github.com/OpenSIPS/opensips/issues](https://github.com/OpenSIPS/opensips/issues)。
<!-- CONTRIBUTORS -->

### 许可证 {#license}

所有文档文件（即 .md 扩展名）均在 Creative Common License 4.0
下许可。
