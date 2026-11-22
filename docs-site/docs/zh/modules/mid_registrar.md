---
title: "mid_registrar 模块"
description: "*mid_registrar* 是 SIP 平台的中间组件，设计用于在终端用户与平台的主注册组件之间工作。"
---

## 管理员指南 {#admin-guide}


### 概述 {#overview}


*mid_registrar* 是 SIP 平台的中间组件，设计用于在终端用户与平台的主注册组件之间工作。

它为利用现有基础设施开辟了新的可能性，以便在保留现有低资源注册服务器的同时继续增长（无论是用户数还是注册流量）。


作为主 SIP 注册服务器的注册前端，mid-registrar 能够：


- 将接入的高速率注册流量转换为低速率的变体，发往主注册服务器层。通过恰当的配置，它可以吸收超过 90% 的现有注册流量，同时正确管理后端的用户位置状态，从而有效降低相应层的资源占用。
- 通过正确接受主注册服务器所决定的 contact 状态与过期时间，（从用户位置的角度）与其保持同步。


#### Path 支持（RFC 3327） {#path-support-rfc-3327}


mid_registrar 模块依据
[RFC 3327](https://tools.ietf.org/html/rfc3327)
提供 SIP Path 头域支持，供注册服务器与 home-proxy 使用。


如果在 mid_registrar 模块中启用了 path 支持，调用 *mid_registrar_save()* 会将 Path 头域的值连同 Contact 信息一起存入 usrloc。对于包含一个或多个 Path 头域的 REGISTER 消息，构造应答有三种模式：


- *off* - 将 Path 头域的值存入 usrloc，但不在应答中回传给 UAC。
- *lazy* - 存储 Path 头域，并且仅当 Supported 头域中的 "path" 参数表明支持 Path 时，才将其回传给 UAC。
- *strict* - 如果存在 Path 头域但 UAC 未表明支持，则以 "420 Bad Extension" 拒绝该注册。否则将其存储并回传给 UAC。


调用 *mid_registrar_lookup()* 时，如果找到 Path 头域则总会使用它，并将其作为 Route 头域插入：插在第一个 Route 头域之前；如果不存在 Route，则插在最后一个 Via 头域之后。它还会将目的 URI 设置为第一个 Path URI，从而覆盖 received-URI，因为 NAT 必须在 UAC 的出站代理（客户端 NAT 之后的第一跳）处处理。


整个过程对用户透明，因此除了在调用 *mid_registrar_save()* 时启用 "p0" / "p1" / "p2" 标志之一外，无需任何配置变更。


#### GRUU 支持（RFC 5627） {#gruu-support-rfc-5627}


mid_registrar 模块依据 [RFC 5627](https://tools.ietf.org/html/rfc5627) 支持全局可路由的用户代理 URI（GRUU）。


如果话机支持 GRUU，调用 *mid_registrar_save()* 会将 SIP Instance 的值连同 contact 一起存入 usrloc。模块会生成两类 GRUU：


- *public* - 暴露底层的 AOR，构造方式只是将 SIP Instance 作为 ;gr 参数值附加。这类 GRUU 是持久的，只要 contact 注册有效就一直有效。
- *temporary* - 隐藏底层的 AOR。每个新的 Register 请求都会导致构造一个新的临时 GRUU，而带有不同 Call-ID 的 Register 请求会导致此前生成的所有临时 GRUU 失效。


调用 *mid_registrar_lookup()* 时会尝试检测 R-URI 中是否包含 GRUU。如果包含，它将仅针对该特定 AOR 所属的 Contact 路由请求，不附加任何其他分支。


即使在注册过程中的 GRUU 处理对用户透明、无需任何配置变更，在处理对话中请求时仍需自行处理 GRUU 的相关细节。


由于 GRUU 会出现在启用了 GRUU 的设备所生成的初始请求的 contact 头域中，因此在收到 RURI 中带有 GRUU 指示的对话中请求时，也必须执行一次 lookup()。


#### SIP 推送通知支持（RFC 8599） {#sip-push-notification-support-rfc-8599}


mid_registrar 模块依据
[RFC 8599](https://tools.ietf.org/html/rfc8599)
支持基于标准的 SIP 推送通知。将
[pn_enable](#pn_enable-boolean) 切换为 *true* 即可启用该草案基本版本的支持。模块还包含在长生命周期对话期间发送推送通知的可选支持（[参见 RFC 第 6 节](https://tools.ietf.org/html/rfc8599#page-23)），通过 [pn_enable_purr](#pn_enable_purr-boolean) 开关控制。


推送通知（PN）支持背后的核心机制：


- PN 支持与现有逻辑完全兼容，启用它不会带来任何限制，因为 mid_registrar 可以同时处理符合 SIP PN 的 User Agent 和标准 SIP User Agent
- 每当需要向启用了 PN 的 contact 发送推送通知时，OpenSIPS 都会抛出
[E_UL_CONTACT_REFRESH](/zh/modules/usrloc#e-ul-contact-refresh)
事件。该事件包含该 contact 的 PN 坐标 —— 它们可以在 Contact URI（'uri'
事件参数）中找到，并可使用 {uri.param,name} 变换提取。此后，由脚本开发者负责触发推送通知（例如可能通过
[rest_client](/zh/modules/rest_client) 模块发送 HTTP POST），从而促使设备重新注册。
- REGISTER 处理保持不变 —— 启用了 PN 的 UA 与普通 UA 一样被保存，只是前者还会在 contact 的任何 MI 列表的 "Flags" 字段中设置 *4* 位标志，以便区分
- 初始 INVITE 处理几乎没有变化，*mid_registrar_lookup()* 函数现在还会在唯一找到的 contact 均为启用了 PN 的 contact、且都需要推送通知时返回值
**2**。这意味着已为每个这类 contact 触发了 PN，且不需要调用 t_relay()，因为它们在重新注册之前不可达！
借助 event_routing 模块，OpenSIPS 会在这些 contact 于可接受的
[pn_refresh_timeout](#pn_refresh_timeout-integer)
时段内每次重新注册时，透明地从当前 INVITE 分叉出一个新分支
- 对话中请求：在某些情况下（例如长生命周期对话），在能够将对话中请求路由到 SIP UA 之前可能需要 PN。[pn_process_purr()](#pn_process_purrdomain)
异步函数会负责触发 PN 事件，并在收到相关 contact 的重新注册后立即恢复脚本执行。


更多信息或示例请参阅 "pn_xxx" 模块参数的文档，或围绕
"SIP Push Notification" 主题的 OpenSIPS 博客文章。


### 工作模式 {#working-modes}


mid_registrar 可以采用以下几种模式之一工作：


#### Contact 镜像（默认） {#contact-mirroring-default}


在 "contact mirroring" 模式下，mid-registrar 仅通过修改 Contact 头域的值，将自己插入到终端用户与主注册服务器之间的 SIP 流量中。有关可能的基于 Contact 的插入模式的详细说明，参见
[sip flow insertion](#auto-insertion-into-future-sip-flows) 一节。接入的 REGISTER 请求将被进一步代理到主注册服务器；只有在收到 2xx 应答时，才会依据主注册服务器返回的信息，将已注册的 contact 存入 mid-registrar。


这种模式的一个可能用途，例如，是在通过新服务扩展主平台（如增加 IM/消息路由）的 SIP 前端上克隆注册。


#### Contact 限流 {#contact-throttling}


在 "contact throttling" 模式下，mid-registrar 可以在应对终端用户侧（终端用户与 mid-registrar 之间）高速率注册的同时，显著降低主注册服务器侧（mid-registrar 与主注册服务器之间）的注册速率。这在终端用户高度动态、生命周期很短（例如移动设备），而主注册服务器无法应对大量注册流量的场景中非常有用。


流量转换以 *"per-device"* 的方式、按每个唯一的 SIP Contact 头域值进行。实现方式是：在向主注册服务器转发注册时，增大每个 contact 的 "expires" 参数值。一旦这样的注册完成，针对同一 SIP Contact 头域值的后续注册将被 mid-registrar 持续吸收，直到最终远端注册的生命周期缩短到必须进行刷新（即，简单地转发下一个 REGISTER 请求）为止。


一种常见情况是某些 SIP User Agent 丢失网络连接（尤其是在移动设备场景下），因此它们没有正确地从 mid-registrar 注销。此时，为避免主注册服务器上出现陈旧注册（其中包含生命周期被大幅延长的 SIP contact！），mid-registrar 会适时生成 De-REGISTER 请求，并在认定这些 contact 已过期时立即将其从主注册服务器的位置服务中移除。


该模式的主要实际用途是注册流量转换。通过将主注册服务器处理注册的压力降到最低，我们可以让它将更多系统资源投入到平台的关键领域，例如高级 SIP 呼叫功能和/或媒体处理。


#### AOR 限流 {#aor-throttling}


在 "AOR throttling" 模式下，mid-registrar 有助于处理每个用户/AOR 的多个注册。其做法是将来自同一 AOR 的所有终端用户已注册 contact 聚合为主注册服务器上的单个注册。这可以大幅降低注册的接入速率（每个 AOR 一次注册），同时也有助于应对那些无法实现并行分叉/振铃的注册服务器。


流量转换以 *"per-user"* 的方式、按每个唯一的 SIP AOR 进行。实现方式是：在向主注册服务器转发注册时，为某个 contact 提供一个较大的 "expires" 参数值。一旦这样的注册完成，针对同一 Address-of-record 的后续注册将被 mid-registrar 持续吸收，直到最终远端注册的生命周期缩短到必须进行刷新（即，简单地转发下一个 REGISTER 请求）为止。


一种常见情况是某些 SIP User Agent 丢失网络连接（尤其是在移动设备场景下），因此它们没有正确地从 mid-registrar 注销。此时，为避免主注册服务器上出现陈旧注册（其中包含生命周期被大幅延长的 SIP AOR！），mid-registrar 会适时生成 De-REGISTER 请求，并在认定这些 contact 已过期时立即将其从主注册服务器的位置服务中移除。


在三种模式中，"AOR throttling" 在通往主注册服务器的路径上可能带来最佳的流量削减效果。通过聚合 contact，它还有减少主注册服务器必须处理的 contact 数量的额外好处。


关于该模式下的 SIP 请求改写，在将注册代理到主注册服务器时，模块总会将所有 Contact 头域值替换为单个 Contact 头域值，表明该 AOR 位于前端本地，其 contact 可在那里找到。


该模式的主要实际用途是向主注册服务器的注册流量转换，以及接管其呼叫分叉职责。通过将主注册服务器处理注册/分叉呼叫的压力降到最低，我们可以让它将更多系统资源投入到平台的关键领域，例如高级 SIP 呼叫功能和/或媒体处理。


### 自动插入后续 SIP 流程 {#auto-insertion-into-future-sip-flows}


mid-registrar 的一个决定性特征是其必须易于集成，理想情况下是一个"即插即用"的 SIP 组件。它不应在平台的任何层上强加任何 "outbound-proxy" 配置，并应自动插入到注册成功之后的呼叫流程中。


无论配置的工作 [模式](#mode-integer) 为何，mid-registrar 都会改写所有被转发的 REGISTER 请求的 Contact 头域 URI，将 Contact URI 中原有的 "hostname" 和
"port" 部分替换为它的某个监听接口。


此外，在模式 "0" 和 "1" 下，每个 Contact 都会被分配一个唯一标识符，该标识符将在后续基于 contact 的查找操作中使用。此信息将包含在每个被转发的 Contact URI 中。[contact_id_insertion](#contact_id_insertion-integer) modparam 控制该信息的包含方式。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


在加载本模块之前必须加载以下模块：


- *usrloc*
- *signaling*
- *tm*
- *event_routing*，如果 [pn_enable](#pn_enable-boolean) 被设置为 *true*。


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，必须安装以下库或应用程序：


- *无*


### 导出的参数 {#exported-parameters}


#### mode (integer)


模块的工作模式。
更多细节参见 [工作模式](#working-modes) 一节。


以下内容对**所有**工作模式均成立：


- 收到 REGISTER 时，脚本编写者必须调用
*[mid_registrar_save()](#mid_registrar_savedomain-flags-aor-outgoing_expires-ownership_tag)*
- mid-registrar 会依据
*[contact_id_insertion](#contact_id_insertion-integer)* 将所有注册插入到呼叫流程中。
- 只有当来自下游注册服务器的应答状态码为 2xx 时，由 mid-registrar 转发的注册才会透明地导致用户位置更新。


每种工作模式的行为如下：


- *0 (Contact mirroring mode)*
模块仅将自己插入呼叫流程。
Contact 过期时间保持不变。
- *1 (Contact throttling mode)*
Contact 限流是降低注册流量速率的第一步。这可以通过使用
*[outgoing_expires](#outgoing_expires-integer)* 模块参数，或
*[mid_registrar_save()](#mid_registrar_savedomain-flags-aor-outgoing_expires-ownership_tag)* 的对应参数实现，
它们允许脚本编写者延长通往主注册服务器途中的注册的生命周期。

  在此模式下，mid-registrar 在转发注册时，可依据
  *[outgoing_expires](#outgoing_expires-integer)* 修改初始请求中出现的 Expires 头域值或 Contact 头域的 "expires" 参数。
- *2 (AOR throttling mode)*
AOR 限流在 "Contact 限流" 之上更进一步，因为主注册服务器只会被告知 AOR 的网络存在，而不是 Contact。此行为同样可以通过
*[outgoing_expires](#outgoing_expires-integer)* 模块参数，或
*[mid_registrar_save()](#mid_registrar_savedomain-flags-aor-outgoing_expires-ownership_tag)* 的对应参数实现，
它们允许脚本编写者延长通往主注册服务器途中的注册的生命周期。
在此模式下，mid-registrar 会将所有被转发注册的 Contact 集合完全替换为单个 Contact，通告该 AOR 对主注册服务器可用。该 Contact 的过期值由
*[outgoing_expires](#outgoing_expires-integer)* 给出。


默认值为 **0**（contact mirroring 模式）


```opensips title="Setting the *mode* module parameter"
modparam("mid_registrar", "mode", 2)
```


#### contact_id_insertion (string) {#contact_id_insertion-integer}


仅在 "mirroring" 或 "contact throttling"
[模式](#mode-integer) 下相关。控制附加的唯一 Contact 标识信息（64 位、十六进制编码的整数）将被放置在传出 Contact 头域 URI 中的位置。更多细节参见
[sip flow insertion](#auto-insertion-into-future-sip-flows)。


可能的值：


- *"ct-param"（默认）* - contact ID 应作为 ";ctid=" 参数附加到传出的 Contact URI。
- *"ct-username"* - contact ID 将替换传出 Contact URI 的 "username" 部分


```opensips title="Setting the *contact_id_insertion* module parameter"
modparam("mid_registrar", "contact_id_insertion", "ct-username")
```


#### contact_id_param (string) {#contact_id_param-string}


仅在 "mirroring" 或 "contact throttling"
[模式](#mode-integer) 下相关。指定模块用于匹配 contact 并路由 SIP 请求的 Contact URI 参数名称。


默认值为 **"ctid"**


```opensips title="Setting the *contact_id_param* module parameter"
modparam("mid_registrar", "contact_id_param", "ctid")

# 生成的 Contact 头域示例：
# Contact: <sip:liviu@10.0.0.10:5060;ctid=619244948763447138>;expires=180.
```


#### at_escape_str (string)


仅在 "AoR throttling" [模式](#mode-integer) 下、且启用了 usrloc 的 [use_domain](/zh/modules/usrloc#use-domain-integer)
设置时相关。该字符串表示 "@" 字符的转义序列，必须以某种方式包含在 mid-registrar 生成的 Contact URI 用户名中。


当后端注册服务器与默认转义字符串不兼容时，将此参数设置为不同的值可能有用。


默认值为 **"%40"**


```opensips title="Setting the *at_escape_str* module parameter"
modparam("mid_registrar", "at_escape_str", "___")

# mid-registrar 生成的 Contact 头域示例：
# Contact: <sip:zach%40sipdomain.invalid@127.0.0.1:5060>;expires=120
```


#### outgoing_expires (integer) {#outgoing_expires-integer}


仅在 Contact/AOR 限流模式下相关。为出向 contact 的过期时间间隔设置最小值。


默认值为 **3600**（秒）


```opensips title="Setting the *outgoing_expires* module parameter"
modparam("mid_registrar", "outgoing_expires", 3600)
```


#### received_avp (string)


模块会将此参数所配置的 AVP 的值存入用户位置表的 *received* 列。如果 AVP 为空，则该列留空。该 AVP 应包含一个由所处理 REGISTER 消息的源 IP、端口和协议组成的 SIP URI。


> [!NOTE]
> 此参数的值应与 nathelper 模块对应参数的值相同。


默认值为 **"NULL"**（禁用）


```opensips title="Setting the *received_avp* module parameter"
modparam("mid_registrar", "received_avp", "$avp(rcv)")
```


#### received_param (string)


如果 received URI 由 nathelper 模块设置，该参数名将被附加到 200 OK 应答的 Contact 上。


> [!NOTE]
> 此参数的值应与 nathelper 模块对应参数的值相同。


默认值为 **"received"**


```opensips title="Setting the *received_param* module parameter"
modparam("mid_registrar", "received_param", "rcv")
```


#### extra_contact_params_avp (string)


一个 AVP 规范。该 AVP 在
*[mid_registrar_save()](#mid_registrar_savedomain-flags-aor-outgoing_expires-ownership_tag)* 期间求值：
如果它持有有效的字符串，其内容将被附加到 mid-registrar 为传出请求构造的*每个*新 Contact URI 上。


默认值为 **None**（未使用）


```opensips title="Setting the *extra_contact_params_avp* module parameter"
# 注意：AVP 会随每个新的 SIP 请求被清除
modparam("mid_registrar", "extra_contact_params_avp", "$avp(extra_ct_params)")

# 在处理 SIP 消息期间设置该 AVP
$avp(extra_ct_params) = ";transport=tls";
```


#### attr_avp (string)


用于为每个注册存储特定附加信息的 AVP。该信息从 AVP 读取，并在 [mid_registrar_save()](#mid_registrar_savedomain-flags-aor-outgoing_expires-ownership_tag) 时存储（内存、DB 或两者）。当调用
[mid_registrar_lookup()](#mid_registrar_lookupdomain-flags-aor) 或 'is_registered()'（registrar）
函数时，*attr_avp* 将被填充为在[重]注册时保存的值。


进行呼叫分叉时，该 AVP 将持有多个值。相应属性信息在 *attr_avp* 中的位置
等于分支索引。下面给出一个示例场景。


*默认值为 NULL。*


```opensips title="Set attr_avp parameter"
# 在进行并行分叉时从 attr_pvar 读取属性
...
modparam("mid_registrar", "attr_avp", "$avp(attr)")

...
if (is_method("REGISTER")) {
	$avp(attr) = "contact_info";
	mid_registrar_save("location");
	exit;
}
...
mid_registrar_lookup("location");
t_on_branch("parallel_fork");
...
branch_route [parallel_fork] {
	xlog("Attributes for branch $T_branch_idx: $(avp(attr)[$T_branch_idx])\n");
}

		
```


#### min_expires (integer)


Contact 的最小过期值，低于该最小值的值将被自动设置为最小值。值 0 禁用该检查。


默认值为 **10**（秒）


```opensips title="Setting the *min_expires* module parameter"
modparam("mid_registrar", "min_expires", 600)
```


#### default_expires (integer)


如果所处理的消息既不包含 Expires 头域，也不包含 expires contact 参数，则该值将用作任何新建 usrloc 记录的过期时间间隔。


默认值为 **3600**（秒）


```opensips title="Setting the *default_expires* module parameter"
modparam("mid_registrar", "default_expires", 1800)
```


#### max_expires (integer)


Contact 的最大过期值，高于该最大值的值将被自动设置为最大值。值 0 禁用该检查。


默认值为 **3600**（秒）


```opensips title="Setting the *max_expires* module parameter"
modparam("mid_registrar", "max_expires", 7200)
```


#### default_q (integer) {#default_q-integer}


设置新 contact 的默认 *"q"* 值。
由于 OpenSIPS 不支持浮点型模块参数，
所提供的 *"q"* 值必须乘以 1000。
例如，如果希望
*[default_q](#default_q-integer)*
为 0.38，则将该参数设置为 380。


默认值为 **0**


```opensips title="Setting the *default_q* module parameter"
modparam("mid_registrar", "default_q", 380)
```


#### tcp_persistent_flag (string)


指定用于控制模块在 TCP 连接方面行为的消息标志位。如果为携带 TCP contact 的 TCP REGISTER 设置了该标志，模块将通过
*[mid_registrar_save()](#mid_registrar_savedomain-flags-aor-outgoing_expires-ownership_tag)*
函数将 TCP 连接的生命周期设置为该 contact 的过期值。这样，只要其 contact 有效，TCP 连接就会保持建立。


默认值为 **-1**（未设置）


```opensips title="Setting the *tcp_persistent_flag* module parameter"
modparam("mid_registrar", "tcp_persistent_flag", "TCP_PERSIST_REGISTRATIONS")
```


#### realm_prefix (string)


在多域用户位置场景中
（usrloc 模块参数 **"use_domain"**
设置为 *"1"*），
该参数表示一个前缀，在执行 save（保存）时会自动从 *To* 头域 URI 的主机名部分剥离，或在执行 lookup 时从 *Request-URI* 中剥离。


它旨在作为 DNS SRV 记录的替代方案（并非所有 SIP 客户端都支持 SRV 查询），可以为 SIP 用途为主域定义一个子域（例如
"sip.mydomain.net" 指向与 "mydomain.net" 的 SRV 记录相同的 IP 地址）。在注册时忽略 realm_prefix "sip."，
"sip.mydomain.net" 将被转换为 "mydomain.net"。


默认值为 **NULL**（无）


```opensips title="Setting the *realm_prefix* module parameter"
modparam("mid_registrar", "realm_prefix", "sip.")
```


#### case_sensitive (integer)


如果设置为 1，则 AOR 比较区分
大小写（如 RFC3261 所规定）；如果设置为 0，则
AOR 比较不区分大小写。


默认值为 **1**（true）


```opensips title="Setting the *case_sensitive* module parameter"
modparam("mid_registrar", "case_sensitive", 0)
```


#### allow_dup_cseq (boolean)


某些 SIP 协议栈会使用相同的 Call-ID 和 CSeq 值重新 REGISTER。
虽然拒绝此类请求符合 RFC 3261 § 10.3.7，但启用
此参数会指示 mid_registrar 改为接受它们，
从而改善互通性。


*默认值为 *false*（拒绝重复的 CSeq）。*


```opensips title="Setting the allow_dup_cseq parameter"
...
# 放宽 RFC 3261 合规性：允许带有重复 CSeq 的 REGISTER 请求
modparam("mid_registrar", "allow_dup_cseq", true)
```


#### expires_max_deviation (integer)


设置此参数可为新注册 contact 的过期时间间隔添加一个不超过
给定值（含该值）的随机正负偏差。例如，如果该参数设为
*100* 且话机注册了 1800 秒，最终
过期时间将是 [1700, 1900] 区间内的随机数。
通过随机化 contact 的注册生命周期，
服务器能更好地应对重启后的*注册
风暴*，即所有 TCP 连接丢失、相当一部分
UA 同时重新注册的情况。得益于 contact 生命周期的
随机化，注册风暴只会发生一次，
而不是在重启后每 1800 秒发生一次。


*默认值为 0（无偏差）。*


```opensips title="Setting the expires_max_deviation parameter"
...
# 为每个注册生命周期添加随机 +/- 0-100 秒
modparam("mid_registrar", "expires_max_deviation", 100)
```


#### max_contacts (integer) {#max_contacts-integer}


该参数可用于限制用户位置数据库中每个
AOR（Address of Record）的 contact 数量。值 0
禁用该检查。
这是默认值，仅在未向 save() 函数传递其他值
（用于 max_contacts）时使用。
也就是说 —— 函数参数会覆盖此全局参数。


*默认值为 0。*


```opensips title="Set max_contacts parameter"
...
# 每个 AOR 最多允许 10 个 contact
modparam("mid_registrar", "max_contacts", 10)
```


#### max_username_len (integer)


Address-of-Record SIP URI 中 "username" 部分的最大长度。


默认值为 **64**。


```opensips title="Setting the *max_username_len* module parameter"
modparam("mid_registrar", "max_username_len", 128)
```


#### max_domain_len (integer)


Address-of-Record SIP URI 中 "domain" 部分的最大长度。


默认值为 **64**。


```opensips title="Setting the *max_domain_len* module parameter"
modparam("mid_registrar", "max_domain_len", 128)
```


#### max_aor_len (integer)


Address-of-Record SIP URI 的最大长度。


默认值为 **256**。


```opensips title="Setting the *max_aor_len* module parameter"
modparam("mid_registrar", "max_aor_len", 512)
```


#### max_contact_len (integer)


Contact 头域 SIP URI 的最大长度。


默认值为 **255**。


```opensips title="Setting the *max_contact_len* module parameter"
modparam("mid_registrar", "max_contact_len", 512)
```


#### retry_after (integer)


mid-registrar 在多种情况下可能对注册生成 5xx 应答。例如，当设置了
*[max_contacts](#max_contacts-integer)* 参数且处理 REGISTER 请求会超出限制时，就可能发生这种情况。
此时，OpenSIPS 将以 "503 Service Unavailable" 应答。


如果希望在 5xx 应答中添加 Retry-After 头域，请将
此参数设置为大于零的值（0 表示：不添加
该头域）。更多细节参见 RFC3261 第 20.33 节。


默认值为 **0**（禁用）


```opensips title="Setting the *retry_after* module parameter"
modparam("mid_registrar", "retry_after", 30)
```


#### disable_gruu (integer)


全局禁用 GRUU 处理。


默认值为 **1**（不处理 GRUU）


```opensips title="Setting the *gruu_secret* module parameter"
modparam("mid_registrar", "disable_gruu", 0)
```


#### gruu_secret (string)


生成临时 GRUU 时用于 XOR 运算的字符串。


默认值为 **"0p3nS1pS"**


```opensips title="Setting the *gruu_secret* module parameter"
modparam("mid_registrar", "gruu_secret", "my_secret")
```


#### pn_enable (boolean) {#pn_enable-boolean}


启用 SIP 推送通知支持（[RFC 8599](https://tools.ietf.org/html/rfc8599)）。
如果启用，包含所有
[pn_ct_match_params](#pn_ct_match_params-string) 的 Contact 头域 URI 将仅使用这些参数与
现有绑定进行匹配。否则，
模块将按常规方式，使用当前的
usrloc [matching_mode](/zh/modules/usrloc#matching-mode-integer) 尝试匹配它们。


*默认值为 **false**。*


```opensips title="Setting the pn_enable parameter"
...
modparam("mid_registrar", "pn_enable", true)
...
```


#### pn_providers (string)


受支持的推送通知提供者列表。虽然 RFC 8599 只定义了三种
可能的值（"apns"、"fcm" 和 "webpush"），
但也可以指定非标准值。


*默认值为 **NULL**
（未设置）。*


```opensips title="Setting the pn_providers parameter"
...
modparam("mid_registrar", "pn_providers", "apns, fcm, webpush")
...
```


#### pn_ct_match_params (string) {#pn_ct_match_params-string}


最小必需的 RFC 8599 参数列表（也接受自定义参数），
这些参数必须出现在 Contact URI 中，并与现有绑定
完全相同地匹配，才能在 SIP 重注册期间刷新该绑定。如果 Contact 头域 URI 中至少缺少一个此类
参数，模块将回退为执行常规的 contact 匹配。


请注意，如果上述所有 PN Contact URI 参数都与现有
绑定匹配，则无论 SIP URI 的其他部分是否匹配（例如主机名、端口、
其他 URI 参数等），该匹配都被视为成功。


在调用 *mid_registrar_lookup()* 或
[pn_process_purr()](#pn_process_purrdomain) 之后，上述与 PN 相关的
参数将分别自动从生成的请求和 Contact URI 事件参数中剥离。


*默认值为 **"pn-provider, pn-prid, pn-param"**。*


```opensips title="Setting the pn_ct_match_params parameter"
...
modparam("mid_registrar", "pn_ct_match_params", "pn-provider, pn-prid")
...
```


#### pn_pnsreg_interval (integer)


对于能够自行唤醒并刷新其绑定的设备（由 *";+sip.pnsreg"*
Contact 头域参数表示），该设置表示服务器通告的
临过期时间间隔，设备应在此时间点发出其绑定刷新请求。


*默认值为 **130**
（过期前的秒数）。*


```opensips title="Setting the pn_pnsreg_interval parameter"
...
modparam("mid_registrar", "pn_pnsreg_interval", 140)
...
```


#### pn_trigger_interval (integer) {#pn_trigger_interval-integer}


如果来自给定 SIP 端点的绑定刷新 REGISTER 请求未在过期前至少 [pn_trigger_interval](#pn_trigger_interval-integer)
秒内到达（例如因为设备不支持 *";+sip.pnsreg"*，或因其他
错误情况），将触发 [E_UL_CONTACT_REFRESH](/zh/modules/usrloc#e-ul-contact-refresh)
usrloc 事件。


一旦触发 [E_UL_CONTACT_REFRESH](/zh/modules/usrloc#e-ul-contact-refresh)，
脚本编写者应使用 Contact URI 中的 RFC 8599 参数，
向设备的 PN 提供者生成推送通知请求，
以使设备唤醒并重新注册。


*默认值为 **120**
（过期前的秒数）。*


```opensips title="Setting the pn_trigger_interval parameter"
...
modparam("mid_registrar", "pn_trigger_interval", 130)
...
```


#### pn_skip_pn_interval (integer)


在 contact 成功（重新）注册之后，该设置
表示一个时间间隔（秒），在此期间假定该 contact
可达，因此将跳过任何推送通知。


*默认值为 **0** 秒
（始终生成推送通知）。*


```opensips title="Setting the pn_skip_pn_interval parameter"
...
modparam("mid_registrar", "pn_skip_pn_interval", 10)
...
```


#### pn_refresh_timeout (integer) {#pn_refresh_timeout-integer}


该超时在触发推送通知的 *mid_registrar_lookup()* 或
[pn_process_purr()](#pn_process_purrdomain) 之后开始计时。该值表示允许的
发送推送通知所需时长与相应设备重新注册
到达所需时长之和的最大值。


一旦初始请求或对话中请求超过此超时，
任何与挂起推送通知匹配的后续重新注册都将不再产生
预期效果。例如：


- 挂起的初始 INVITE 事务将完成，且不再
为被叫侧发送的每个 REGISTER 自动分叉出额外分支
- 挂起的 BYE 消息将超时，OpenSIPS 将在未收到
目标设备确实可达的确认的情况下尝试路由它们


*默认值为 **6** 秒。*


```opensips title="Setting the pn_refresh_timeout parameter"
...
modparam("mid_registrar", "pn_refresh_timeout", 10)
...
```


#### pn_enable_purr (boolean) {#pn_enable_purr-boolean}


为长生命周期对话启用 SIP 推送通知机制。
如果启用，mid-registrar 将在对 REGISTER
请求的 200 OK 应答中包含 *"+sip.pnspurr"*
Feature-Caps 头域标签。该标签表示该注册的
唯一标识符（PURR - Proxy Unique Registration Reference）。


在对话建立期间，每个 UA 可以在其 Contact 头域中
包含 OpenSIPS 在注册期间返回的 PURR 值。通过
包含 PURR（例如 ";pn-purr=XXX"），代理表明
它期望先被 PN 唤醒，然后才能接收
另一方发送的对话中请求。


启用此参数时，请确保同时为
[pn_process_purr()](#pn_process_purrdomain) 添加相应逻辑。


*默认值为 **false**。*


```opensips title="Setting the pn_enable_purr parameter"
...
modparam("mid_registrar", "pn_enable_purr", true)
...
```


### 导出的函数 {#exported-functions}


#### mid_registrar_save(domain[, flags[, aor[, outgoing_expires[, ownership_tag]]]]) {#mid_registrar_savedomain-flags-aor-outgoing_expires-ownership_tag}


处理 REGISTER 请求时调用的函数。该函数
决定是否应将 REGISTER 转发到主注册服务器，并对已注册的 contact
执行所有必要的修改。该函数还涵盖
2xx REGISTER 应答的处理 ——
由主注册服务器确认的 contact 将被自动
保存到本地用户位置（无需任何额外脚本）。


在 Contact/AOR 限流模式（有关工作模式的更多信息参见[工作模式](#working-modes)一节）下，
该函数的返回值指示脚本
编写者必须将 REGISTER 请求转发到主注册服务器，
还是只需完成剩余的遗留处理并退出脚本执行，因为
当前 REGISTER 请求已以 200 OK 应答
（在 mid-registrar 层被吸收）。


取决于当前的
*[mode](#mode-integer)* 和
*[contact_id_insertion](#contact_id_insertion-integer)*，
该函数在转发 REGISTER 请求时还可能执行
以下一系列转换：


- 在 *"Contact throttling"* 模式下

  - 将 *Expires*
头域的值改为
*outgoing_expires* 的值（如果给出），
否则改为
*[outgoing_expires](#outgoing_expires-integer)*
模块参数给定的值。
对任何 *";expires"*
Contact URI 参数同样适用。
  - 将接入 REGISTER 请求中所有 Contact URI 的 "host:port" 部分
替换为某个 OpenSIPS 监听接口
  - 为每个
*Contact* URI 附加一个参数，
使模块能够匹配应答 contact
并路由呼叫。该 URI
参数的名称可通过
*[contact_id_param](#contact_id_param-string)* 配置
- 在 *"AOR throttling"* 模式下

  - 将 *Expires*
头域的值改为
*outgoing_expires* 的值（如果给出），
否则改为
*[outgoing_expires](#outgoing_expires-integer)*
模块参数给定的值。
  - 将请求的所有 *Contact* 头域
替换为单个 *Contact* 头域，
其中包含以下 SIP URI："sip:address-of-record@proxy_ip:proxy_port"


参数含义如下：


- *domain*（静态字符串）- 注册服务器内的逻辑域。
如果使用数据库，则必须是存储 contact 的 *usrloc*
表名
- *flags*（字符串，可选）- 由一个或多个
下列标志组成的逗号分隔字符串：

  - *'memory-only'* -（旧 *m* 标志）
仅将 contact 保存到内存缓存中，不进行任何 DB 操作；
  - *'no-reply'* -（旧 *r* 标志）
不向当前 REGISTER 请求生成 SIP 应答。
  - *'max-contacts=[int]'* -（旧 *c*
标志）此标志可用于限制用户位置数据库中该
AOR（Address of Record）的 contact 数量。
值 0 禁用该检查。此参数覆盖
全局 "max_contacts" 模块参数。
  - *'force-registration'* -（旧 *f*
标志）此标志可用于在达到最大 contact 数量时
仍强制注册新 contact。在这种情况下，
较旧的 contact 将被移除以为新 contact 腾出空间，
且不会超过允许的最大数量。
此标志仅在使用了 "max-contacts" 时才有意义。
  - *'matching-mode=[val]'* -（旧 *M*
标志）如何在（当前处理的 REGISTER 所）上传的
contact 与已知 contact（在内存或 DB 中）之间执行匹配。
此选项仅用于当前操作，可以是：
	- *'0'* - 仅 contact URI
匹配
	- *'1'* - contact URI 与
SIP Call-ID 匹配
	- *'&lt;param_name&gt;'* - 仅
使用给定 URI 参数的值进行
匹配（例如 &lt;rinstance&gt;）
  - *'path-off'* -（旧 *p0* 标志）
（Path 支持 - 'off' 模式）- Path 头域被存入 usrloc，
但从不包含在应答中。
  - *'path-lazy'* -（旧 *p1* 标志）
（Path 支持 - lazy 模式）Path 头域被存入 usrloc，但仅当
注册请求中通过 "Supported" 头域的 "path" 选项
表明支持 path 时，才包含在应答中。
  - *'path-strict'* -（旧 *p2* 标志）
（Path 支持 - strict 模式）- 仅当注册请求中通过
"Supported" 头域的 "path" 选项表明支持 path 时，
Path 头域才会被存入 usrloc。如果未表明支持 path，
则以 "420 - Bad Extension" 拒绝请求，
并在应答中包含 "Unsupported: path"
头域以及收到的 "Path" 头域。此模式是 RFC-3327 推荐的方式。
  - *'path-received'* -（旧 *v* 标志）
如果设置，则注册的第一个 Path URI 的 "received"
参数被设为 received-uri，并为该 contact 设置 NAT
分支标志。当注册服务器位于 SIP 负载均衡器
之后、而该均衡器将其 nat 后的 UAC 地址作为 "received"
参数放入其 Path uri 时，此标志很有用。
  - *'only-request-contacts'* -（旧 *o*
标志）在注册成功的情况下，仅在 200 OK 应答中包含
REGISTER 请求的 Contact。虽然这
违反 RFC 3261，但在某些场景下可能有用。
- *aor（字符串，可选）* - 自定义 Address-of-Record。
如果未给出，AOR 将取自 *To* 头域 URI
- *outgoing_expires（整型，可选）* - 仅在
Contact/AOR 限流模式下相关，这是传出 REGISTER
请求的 contact 过期时间间隔的自定义值，
它覆盖默认的
*[outgoing_expires](#outgoing_expires-integer)* 模块参数。
- *ownership_tag*（字符串，可选）- 一个集群共享
标签（更多细节参见 clusterer 模块文档），它
将被附加到从当前请求保存的每个 contact 上。
该标签仅在集群式用户位置场景中相关，
用于帮助确定 contact 当前的逻辑所有者节点。这
又有助于限制当前不负责该 contact 的节点
执行某些操作（例如：在高可用部署中错误地从
非拥有的虚拟 IP 地址发起 ping）。


**返回值**


- 1（成功）- 当前 REGISTER 请求必须由脚本编写者
派发到主注册服务器
- 2（成功）- 当前 REGISTER 请求已被
mid-registrar 吸收；已向上游发送 200 OK 应答
- -1（错误）- 通用错误码；日志应提供更多帮助


此函数只能从请求路由中使用。


```opensips title="*mid_registrar_save* usage"
...
if (is_method("REGISTER")) {
	mid_registrar_save("location");
	switch ($retcode) {
	case 1:
		xlog("L_INFO", "forwarding REGISTER to main registrar...\n");
		$ru = "sip:10.0.0.3:5070";
		if (!t_relay()) {
			send_reply(500, "Server Internal Error 1");
		}

		break;
	case 2:
		xlog("L_INFO", "REGISTER has been absorbed!\n");
		break;
	default:
		xlog("L_ERR", "mid-registrar error!\n");
		send_reply(500, "Server Internal Error 2");
	}

	exit;
}
...
```


#### mid_registrar_lookup(domain[, [flags][, [aor]]]) {#mid_registrar_lookupdomain-flags-aor}


接收来自主注册服务器的请求（需路由到终端用户）时调用的函数。
它执行本地查找
（在用户位置中）以及必要的 RURI 处理，以便将请求
进一步路由到终端用户已注册的 contact（注意：
查找后可能产生多个分支/目的地址）。


取决于当前的工作
*[mode](#mode-integer)*，
该函数的行为如下：


- 在 *"mirror"* 模式下

  - 从 Request-URI 中提取用户名（Address-of-Record），
并查找其存储在用户
位置中的所有 contact 绑定。Request-URI（**$ru**
变量）将被覆盖为 q 值最高的 contact，
并可选地为每个 contact 创建
额外的分支。（取决于 *flags* 参数）
- 在 *"Contact throttling"* 模式下

  - 从 Request-URI 中提取
*[contact_id_param](#contact_id_param-string)*，
据此推导出目的地的实际 SIP URI，
并将其设置为 INVITE 的新 Request-URI
（**$ru** 变量）。
- 在 *"AOR throttling"* 模式下

  - 从 Request-URI 中提取用户名（Address-of-Record），
并查找其存储在用户
位置中的所有 contact 绑定。Request-URI（**$ru**
变量）将被覆盖为 q 值最高的 contact，
并可选地为每个 contact 创建
额外的分支。（取决于 *flags* 参数）


参数含义如下：


- *domain (static string)* - 注册服务器内的逻辑域。
如果使用数据库，则必须是存储 contact 的 *usrloc*
表名
- *flags（字符串，可选）- 由一个或多个
下列标志组成的逗号分隔字符串：*

  - *'no-branches'* -（旧 *b* 标志）此
标志控制 *mid_registrar_lookup()* 函数如何处理多个 contact。
如果 usrloc 中给定用户名
有多个 contact 且未设置此
标志，则 Request-URI 将被覆盖为
q 值最高的 contact，其余将被追加到
sip_msg 结构，之后可供 tm 用于分叉。如果
设置了该标志，则仅将 Request-URI 覆盖为
q 值最高的 contact，其余保持
未处理。
  - *'to-branches-only'* -（旧 *B* 标志）
此标志强制所有找到的 contact 仅作为分支（在
目的地集合中）上传，而完全不写入当前消息的
R-URI。使用此选项可使 *mid_registrar_lookup()* 函数
也能用于 SIP 应答的上下文。
  - *'branch'* -（旧 *r* 标志）此标志
允许在现有分支中搜索 aor 并将其扩展
为 contact。例如，你的
ruri 中有 AOR A，但你还想将呼叫转发到 AOR B。为了
做到这一点，必须将 AOR B 放入某个分支；如果启用了此标志，
函数也会将 AOR B 扩展为 contact，
并放回分支中。函数调用之前
分支中的 AOR 将被移除。
**警告：**
*如果希望激活此标志，
则不得设置 'no-branches' 标志，因为设置
该标志将不允许 *mid_registrar_lookup()* 写入分支。*
  - *'method-filtering'* -（旧 *m* 标志）
设置此标志将启用基于注册期间 "Allow" 头域中所列
支持方法的 contact 过滤。
注册期间未提供 "Allow" 头域的 contact
被假定支持所有标准 SIP 方法。
  - *'ua-filtering=[val]'*（旧 *u* 标志）
（User-Agent 过滤）- 此标志启用按 user-agent 的正则表达式过滤。
在启用 append_branches 参数时很有用。取值必须使用
'/regexp/' 格式。
  - *'case-insensitive'*（旧 *i* 标志）-
此标志为 'ua-filtering' 标志启用不区分大小写的过滤。
  - *'extended-regexp'* -（旧 *e* 标志）
此标志为 'ua-filtering' 标志启用扩展正则表达式格式。
  - *'global'*（旧 *g* 标志）（全局
查找）- 此标志仅在联邦式用户位置集群场景下相关。
如果设置，*mid_registrar_lookup()* 函数不仅会执行经典的内存内
"search-AoR-and-push-branches" 操作，还会
执行元数据查找，并为每个返回结果追加一个额外分支。
"内存分支"对应本地 contact（当前位置），
而"元数据分支"对应平台其他一个或多个
位置可用的 contact。
AoR 元数据由最少必需的信息组成，
以便 VoIP 平台的某个位置（数据中心）为全球平台
通告本地注册 AoR 的存在。具体而言，它包括
两项信息：
	- AoR（例如 "vladimir@federation-cluster"）
	- home IP（例如 "10.0.0.223"）
  - *'max-ping-latency=[int]'* -（旧 *y*
标志）可接受的最大 contact ping 延迟（微秒）。在 *mid_registrar_lookup()* 期间，延迟更高的
AoR contact 将被丢弃。
  - *'sort-by-latency'* -（旧 *Y* 标志）
contact 将按最近一次成功
ping 延迟的升序选取（最快 ping -> 最慢 ping）。此标志可与
"max-ping-latency" 标志一起使用。
- *aor（字符串，可选）* - 自定义 Address-of-Record。
如果未给出，AOR 将取自 *Request-URI*


返回码：


- **1** - 找到 contact 并成功
作为分支推送。需要在可达之前被唤醒的 contact
正通过异步推送通知被通知。
- **2** - 已为找到的 contact 成功启动至少一个
异步推送通知，但未填充额外分支
（即无需调用 t_relay()）。
- **-1** - 未找到 contact。
- **-2** - 找到 contact，但均
不支持当前 SIP 方法。
- **-3** - 处理期间发生内部错误。


此函数只能从请求路由中使用。


```opensips title="*mid_registrar_lookup* usage"
...
	# 来自主注册服务器的初始 invite - 需要对其进行查找！
	if (is_method("INVITE") and $si == "10.0.0.3" and $sp == 5070) {
		if (!mid_registrar_lookup("location")) {
			t_reply(404, "Not Found");
			exit;
		}

		if (!t_relay())
			send_reply(500, "Server Internal Error 3");

	    exit;
	}
...
```


### 导出的异步函数 {#exported-asynchronous-functions}


#### pn_process_purr(domain) {#pn_process_purrdomain}


依据 RFC 8599 执行对话中请求处理。对于
此类请求，在 R-URI 和最顶层 Route 头域 URI 中搜索
*";pn-purr"* 参数值，该值既要匹配
OpenSIPS 的 PURR 格式，又要对应某个 usrloc 注册。一旦
定位到 usrloc contact，就触发 [E_UL_CONTACT_REFRESH](/zh/modules/usrloc#e-ul-contact-refresh)
事件，并将该请求异步挂起最多
[pn_refresh_timeout](#pn_refresh_timeout-integer) 秒，直到匹配的
REGISTER 请求到达。


如果处理在触发推送通知之前结束，
则请求将不再被异步挂起，恢复路由会被
立即调用。


参数含义如下：


- *domain (static string)* - 注册服务器内的
逻辑域。如果使用数据库，则必须是存储 contact 的
表名。


**返回码**


- **1** - 成功，PN 已发起。
- **2** - 成功，
但 PN 未发起（由于缺少 PURR、外部 PURR 或
contact 离线）
- **-1** - 内部错误


```opensips title="async pn_process_purr() usage"
route {
	...
	if (has_totag()) {
		if (is_method("ACK") && t_check_trans()) {
			t_relay();
			exit;
		}

		if (!loose_route()) {
			send_reply(404, "Not Found");
			exit;
		}

		if (!is_method("ACK"))
			async (pn_process_purr("location"), resume_route);

		route(relay);
		exit;
	}
}

route [resume_route] {
	$var(rc) = $rc;
	xlog("pn_process_purr() finished with $var(rc)\n");

	...
}
```
<!-- CONTRIBUTORS -->

### 许可 {#license}

所有文档文件（即以 .md 为扩展名的文件）均采用 Creative Common License 4.0 许可。
