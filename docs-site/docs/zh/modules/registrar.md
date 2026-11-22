---
title: "registrar 模块"
description: "本模块包含按 RFC 3261 处理 SIP REGISTER 请求的逻辑。"
---


## 管理员指南 {#admin-guide}


### 概述 {#overview}


本模块包含按 RFC 3261 处理 SIP REGISTER 请求的逻辑。在此基础之上，还提供若干扩展：


#### Path 支持（RFC 3327） {#path-support-rfc-3327}


registrar 模块依据
[RFC 3327](https://tools.ietf.org/html/rfc3327)
包含对 SIP Path 头域的支持，可用于注册服务器和归属代理（home-proxies）。


调用 *save()* 时，若 registrar 模块中启用了 Path 支持，则会把各 Path
头域的值连同 Contact 信息一并存入 usrloc。对于包含一个或多个 Path 头域的
REGISTER 消息，构建应答共有三种模式：


- *off* - 把 Path 头域的值存入 usrloc，但不随应答将其返回给 UAC。
- *lazy* - 保存 Path 头域，并且仅当 UAC 通过 Supported 头域中的 "path"
参数表明了 Path 支持时，才将其返回给 UAC。
- *strict* - 若存在 Path 头域但 UAC 未表明支持，则以 "420 Bad Extension"
拒绝该注册。否则保存该头域并将其返回给 UAC。


调用 *lookup()* 时，若找到 Path 头域则总是使用它，并将其作为 Route
头域插入：或置于第一个 Route 头域之前，或在不存在 Route 时置于最后一个
Via 头域之后。它还会把目的 URI 设为第一个 Path URI，从而覆盖 received-URI，
因为 NAT 必须在 UAC 的出站代理（客户端 NAT 之后的第一跳）处处理。


整个过程对用户透明，因此除了在调用 *save()* 时启用
"p0" / "p1" / "p2" 之一外，无需修改配置。


#### GRUU 支持（RFC 5627） {#gruu-support-rfc-5627}


registrar 模块依据 [RFC 5627](https://tools.ietf.org/html/rfc5627)
包含对全局可路由用户代理 URI（Globally Routable User Agent URIs）的支持。


若话机支持 GRUU，调用 *save()* 会把 SIP Instance 的值连同联系人存入
usrloc。模块会生成两类 GRUU：


- *public* - 暴露底层 AOR，仅通过把 SIP Instance 作为 ;gr
参数值附加来构造。这类 GRUU 是持久的，只要联系人注册有效便一直有效。
- *temporary* - 隐藏底层 AOR。
每个新的 Register 请求都会构造一个新的临时 GRUU，而 Call-ID 不同的
Register 请求会使此前生成的所有临时 GRUU 失效。


调用 *lookup()* 会尝试检测 R-URI 中是否含有 GRUU。若含有，则只把请求
路由到该特定 AOR 所属的联系人，不追加任何其他分支。


尽管注册过程中的 GRUU 处理对用户透明、无需修改配置，但在处理对话中请求时，
仍需要注意 GRUU 的具体细节。


由于启用 GRUU 的设备所生成的初始请求，其 Contact 头域中会带有 GRUU，
因此在收到 RURI 中含 GRUU 指示的对话中请求时，同样需要执行一次 lookup()。


#### SIP 推送通知支持（RFC 8599） {#sip-push-notification-support-rfc-8599}


registrar 模块依据
[RFC 8599](https://tools.ietf.org/html/rfc8599)
包含对基于标准的 SIP 推送通知（SIP Push Notifications）的支持。
把 [pn_enable](#pn_enable-boolean) 切换为 *true* 即可启用草案基本版本的支持。
模块还通过 [pn_enable_purr](#pn_enable_purr-boolean) 开关，提供在长时对话
期间发送推送通知的可选支持（[参见 RFC 第 6 节](https://tools.ietf.org/html/rfc8599#page-23)）。


推送通知（PN）支持背后的关键机制：


- PN 支持与现有逻辑完全兼容，启用它不会带来任何限制，因为
registrar 可以同时处理符合 SIP PN 规范的 UA 和标准 SIP 用户代理
- 每当需要向启用了 PN 的联系人发送推送通知时，OpenSIPS 会触发
[E_UL_CONTACT_REFRESH](/zh/modules/usrloc#e-ul-contact-refresh)
事件。该事件包含该联系人的 PN 坐标——它们可在 Contact URI（'uri'
事件参数）中找到，并可用 {uri.param,name} 变换提取。此后，由脚本
开发者决定如何触发推送通知（例如可通过
[rest_client](/zh/modules/rest_client) 模块发送一条 HTTP POST），
从而促使设备重新注册。
- REGISTER 处理方式不变——启用了 PN 的 UA 与普通 UA 一样保存，只是前者在
任何 MI 联系人列表的 "Flags" 字段中还会额外设置 *4* 标志位，以作区分
- 初始 INVITE 处理几乎不变，只是 *lookup()*
函数现在会在仅找到启用了 PN 的联系人（这些联系人都需要推送通知）时额外返回
**2**。这意味着已为每个联系人触发了 PN，且无需调用 t_relay()，因为在重新注册
之前它们不可达！
借助 event_routing 模块，OpenSIPS 会在接受的
[pn_refresh_timeout](#pn_refresh_timeout-integer)
时间窗内，对来自这些联系人的每次重新注册，从当前 INVITE 透明地分叉出一个新分支
- 对话中请求：某些情况下（例如长时对话），在能够把对话中请求路由到 SIP UA
之前可能需要先发送 PN。[pn_process_purr()](#pn_process_purrdomain)
异步函数负责触发 PN 事件，并在收到相关联系人的重新注册后立即恢复脚本。


更多信息或示例，请参阅 "pn_xxx" 模块参数的文档，或 OpenSIPS 博客中关于
"SIP Push Notification" 主题的文章。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


加载本模块之前必须先加载以下模块：


- *usrloc - User Location Module*。
- *signaling - Signaling module*。
- *event_routing*，
若 [pn_enable](#pn_enable-boolean) 被设为 *true*。


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，必须安装以下库或应用程序：


- *None*。


### 导出的参数 {#exported-parameters}


#### default_expires (integer)


若所处理的消息既没有 Expires 头域也没有 expires 联系人参数，则新建的
usrloc 记录将使用该值。该参数为过期所需的秒数（例如一小时用 3600）。


*默认值为 3600。*


```opensips title="Set default_expires parameter"
...
modparam("registrar", "default_expires", 1800)
...
```


#### min_expires (integer) {#min_expires-integer}


联系人的最小过期值，低于该最小值的取值会被自动设为最小值。值为 0 时禁用
该检查。


*默认值为 60。*


```opensips title="Set min_expires parameter"
...
modparam("registrar", "min_expires", 60)
...
```


#### max_expires (integer) {#max_expires-integer}


联系人的最大过期值，高于该最大值的取值会被自动设为最大值。值为 0 时禁用
该检查。


*默认值为 0。*


```opensips title="Set max_expires parameter"
...
modparam("registrar", "max_expires", 120)
...
```


#### default_q (integer)


该参数表示新联系人的默认 q 值。由于 OpenSIPS 不支持浮点类型参数，参数中的
值会被除以 1000 并按浮点存储。例如希望 default_q 为 0.38，此处应使用
380。


*默认值为 0。*


```opensips title="Set default_q parameter"
...
modparam("registrar", "default_q", 1000)
...
```


#### tcp_persistent_flag (string)


该参数指定用于控制模块对 TCP 连接行为的消息标志位。若某条经由 TCP 传输且带有
TCP 联系人的 REGISTER 请求设置了该标志位，模块将通过 "save()"
函数把该 TCP 连接的生命周期设为联系人的过期值。这样一来，只要联系人有效，
TCP 连接就会一直保持。


*默认值为 -1（禁用）。*


```opensips title="Set tcp_persistent_flag parameter"
...
modparam("registrar", "tcp_persistent_flag", "TCP_PERSIST_DURATION")
...
```


#### realm_prefix (string)


要从 realm 中自动剥离的前缀。作为 SRV 记录的替代方案（并非所有 SIP 客户端
都支持 SRV 查询），可以为 SIP 用途定义一个主域的子域（例如
sip.mydomain.net 指向与 mydomain.net 的 SRV 记录相同的 IP 地址）。通过
忽略 realm_prefix "sip."，注册时 sip.mydomain.net 将等价于
mydomain.net 。


*默认值为 NULL（无）。*


```opensips title="Set realm_prefix parameter"
...
modparam("registrar", "realm_prefix", "sip.")
...
```


#### case_sensitive (integer)


若设为 1，则 AOR 比较区分大小写（如 RFC3261 所要求）；若设为 0，则 AOR
比较不区分大小写。


*默认值为 1。*


```opensips title="Set case_sensitive parameter"
...
modparam("registrar", "case_sensitive", 0)
...
```


#### received_avp (str)


registrar 会把该参数所配置的 AVP 的值存入用户位置数据库的 received 列。
若该 AVP 为空，则该列留空。该 AVP 应包含一个 SIP URI，由所处理 REGISTER
消息的源 IP、端口和协议组成。


> [!NOTE]
> 该参数的取值应与 nathelper 模块中对应参数的取值相同。


*默认值为 "NULL"（禁用）。*


```opensips title="Set received_avp parameter"
...
modparam("registrar", "received_avp", "$avp(rcv)")
...
```


#### received_param (string)


当 received URI 由 nathelper 模块设置时，将该参数名追加到 200 OK 的
Contact 中。


*默认值为 "received"。*


```opensips title="Set received_param parameter"
...
modparam("registrar", "received_param", "rcv")
...
```


#### allow_dup_cseq (boolean)


某些 SIP 协议栈会用相同的 Call-ID 和 CSeq 值重新 REGISTER。虽然拒绝这类
请求符合 RFC 3261 § 10.3.7，但启用该参数会让 registrar 转而接受它们，
从而改善互通性。


*默认值为 *false*（拒绝重复的 CSeq）。*


```opensips title="Setting the allow_dup_cseq parameter"
...
# 放宽 RFC 3261 合规性：允许 CSeq 重复的 REGISTER 请求
modparam("registrar", "allow_dup_cseq", true)
```


#### expires_max_deviation (integer)


设置该参数可为新注册联系人的过期间隔增加一个随机正负偏差，偏差上限即为所给的
值（含该值）。例如该参数设为
*100*，某话机注册 1800 秒，则最终过期时间将是 [1700, 1900] 区间内的
随机数。通过随机化联系人的注册生命周期，服务器能更好地应对重启后的
*注册风暴*：此时所有 TCP 连接都已丢失，大量 UA 会同时重新注册。得益于
联系人生命周期的随机化，注册风暴只会发生一次，而不是在重启后每隔 1800 秒
就发生一次。


*默认值为 0（无偏差）。*


```opensips title="Setting the expires_max_deviation parameter"
...
# 为每个注册生命周期增加随机的 0-100 秒正负偏差
modparam("registrar", "expires_max_deviation", 100)
```


#### max_contacts (integer)


该参数可用于限制用户位置数据库中每个 AOR（Address of Record，记录地址）的
联系人数目。值为 0 时禁用该检查。
这是默认值，仅当未向 save() 函数传入其他（max_contacts 的）取值时才会使用。
也就是说——函数参数会覆盖该全局参数。


*默认值为 0。*


```opensips title="Set max_contacts parameter"
...
# 每个 AOR 最多允许 10 个联系人
modparam("registrar", "max_contacts", 10)
```


#### max_username_len (integer)


Address-of-Record SIP URI 中 "username" 部分的最大长度。


默认值为 **64**。


```opensips title="Setting the *max_username_len* module parameter"
modparam("registrar", "max_username_len", 128)
```


#### max_domain_len (integer)


Address-of-Record SIP URI 中 "domain" 部分的最大长度。


默认值为 **64**。


```opensips title="Setting the *max_domain_len* module parameter"
modparam("registrar", "max_domain_len", 128)
```


#### max_aor_len (integer)


Address-of-Record SIP URI 的最大长度。


默认值为 **256**。


```opensips title="Setting the *max_aor_len* module parameter"
modparam("registrar", "max_aor_len", 512)
```


#### max_contact_len (integer)


Contact 头域 SIP URI 的最大长度。


默认值为 **255**。


```opensips title="Setting the *max_contact_len* module parameter"
modparam("registrar", "max_contact_len", 512)
```


#### retry_after (integer)


registrar 在多种情况下会对 REGISTER 生成 5xx 应答。例如，当设置了
`max_contacts` 参数、而对该 REGISTER 请求的处理会超出限制时就会发生，
此时 registrar 会生成 "503 Service Unavailable" 响应。


若希望在 5xx 应答中加入 Retry-After 头域，请把该参数设为大于零的值（0
表示不添加该头域）。更多细节参见 RFC3261 第 20.33 节。


*默认值为 0（禁用）。*


```opensips title="Set retry_after parameter"
...
modparam("registrar", "retry_after", 30)
...
		
```


#### sock_hdr_name (string)


包含套接字描述（proto:IP:port）的头域，用于覆盖接收到的套接字信息。只有在
"save()" 时设置了 's'（Socket header）标志位，才会查找并使用该头域。


这仅在多台复制服务器的场景下有意义。


*默认值为 NULL。*


```opensips title="Set sock_hdr_namer parameter"
...
modparam("registrar", "sock_hdr_name", "Sock-Info")
...
		
```


#### mcontact_avp (string) {#mcontact_avp-string}


用于存放在缓存注册场景下（REGISTER 被转发到另一台 registrar 时）所设置的
已修改绑定/联系人的 AVP。该 AVP 将用于提取主 registrar 在 200 OK 中返回的
"expires" 值。


这仅在缓存注册场景下有意义，即你的 OpenSIPS 在把注册转发给主 registrar
之前先对其进行缓存。


*默认值为 NULL。*


```opensips title="Set mcontact_avp parameter"
...
modparam("registrar", "mcontact_avp", "$avp(orig_ct)")
...
route {
   ...
   # 在转发 REGISTER 请求之前，保存发出的 contact。
   # 务必在对 contact 完成所有可能的修改之后执行，
   # 例如 fix_nated_contact()
   $avp(orig_ct) = $ct.fields(uri);
   t_on_reply("do_save");
   t_relay("udp:ip:port");
   ...
}
...
onreply_route[do_save] {
	if ($rs=="200")
		save("location");
}
...
		
```


#### attr_avp (string)


用于存放每次注册的特定附加信息的 AVP。该信息从 AVP 中读取，并在每次
registrar 的 'save()' 时被存储（内存、数据库或两者）。当调用 registrar 的
'lookup()' 或 'is_registered()' 函数时，所存信息会被推入同名的消息分支属性中，
名称即为 *attr_avp*（参见 $msg.branch.attr() 核心变量）


进行并行呼叫分叉时，联系人属性会被推入相应分支的属性中


*默认值为 NULL。*


```opensips title="Set attr_avp parameter"
# 并行分叉时从 attr_pvar 读取属性
...
modparam("registrar", "attr_avp", "$avp(attr)")

...
if (is_method("REGISTER")) {
	$avp(attr) = "contact_info";
	save("location");
	exit;
}
...
lookup("location");
# 列出所有生成的分支及其属性
$var(i) = 0;
while ($(msg.branch.uri[$var(i)])!=NULL) {
	xlog("branch $var(i): $(msg.branch.uri[$var(i)]), attr=$(msg.branch.attr(attr)[$var(i)])\n");
	$var(i) = $var(i) + 1;
}
....
t_on_branch("parallel_fork");
t_relay();
...
branch_route [parallel_fork] {
	xlog("Attributes for branch $T_branch_idx: $tm.branch.attr(attr)\n");
}

		
```


#### gruu_secret (string)


生成临时 GRUU 时用于 XOR 运算的字符串。


*若未设置，默认密钥为 'OpenSIPS'。*


```opensips title="Set gruu_secret parameter"
...
modparam("registrar", "gruu_secret", "top_secret")
...
		
```


#### disable_gruu (int)


全局禁用 GRUU 处理


*默认值为 1（不处理 GRUU）。*


```opensips title="Set gruu_secret parameter"
...
modparam("registrar", "disable_gruu", 0)
...
		
```


#### pn_enable (boolean) {#pn_enable-boolean}


启用 SIP 推送通知支持（[RFC 8599](https://tools.ietf.org/html/rfc8599)）。
若启用，则包含全部
[pn_ct_match_params](#pn_ct_match_params-string) 的 Contact 头域 URI
将仅用这些参数来与已有绑定进行匹配。否则，模块会按常规方式匹配，即使用
usrloc 的 [matching_mode](/zh/modules/usrloc#matching-mode-integer)。


*默认值为 **false**。*


```opensips title="Setting the pn_enable parameter"
...
modparam("registrar", "pn_enable", true)
...
```


#### pn_providers (string)


受支持的推送通知提供方列表。虽然 RFC 8599 只定义了三个可能取值（"apns"、
"fcm" 和 "webpush"），但也可以指定非标准取值。


*默认值为 **NULL**
（未设置）。*


```opensips title="Setting the pn_providers parameter"
...
modparam("registrar", "pn_providers", "apns, fcm, webpush")
...
```


#### pn_ct_match_params (string) {#pn_ct_match_params-string}


一组最低要求的 RFC 8599 参数（自定义参数也被接受），它们必须出现在某个
Contact URI 中、且与已有绑定完全一致，该绑定才会在 SIP 重新 REGISTER 时被
刷新。若某个 Contact 头域 URI 中至少缺少一个此类参数，模块将回退到执行常规
的联系人匹配。


> [!NOTE]
> 若上述所有 PN Contact URI 参数都与某个已有绑定匹配，则无论
> SIP URI 的其他部分是否匹配（例如主机名、端口、
> 其他 URI 参数等），都视为匹配成功。


调用 *lookup()* 或
[pn_process_purr()](#pn_process_purrdomain) 之后，上述与 PN 相关的参数
将分别从结果的 Request 和 Contact URI 事件参数中被自动剥离。


*默认值为 **"pn-provider, pn-prid, pn-param"**。*


```opensips title="Setting the pn_ct_match_params parameter"
...
modparam("registrar", "pn_ct_match_params", "pn-provider, pn-prid")
...
```


#### pn_pnsreg_interval (integer)


对于能够自行唤醒并刷新绑定的设备（由 Contact 头域参数
*";+sip.pnsreg"* 表示），该设置表示服务器通告的、设备应
在过期前多久发出绑定刷新请求的时间间隔。


*默认值为 **130**
（过期前秒数）。*


```opensips title="Setting the pn_pnsreg_interval parameter"
...
modparam("registrar", "pn_pnsreg_interval", 140)
...

```


#### pn_trigger_interval (integer) {#pn_trigger_interval-integer}


若某个 SIP 端点的绑定刷新 REGISTER 请求未能在过期前至少
[pn_trigger_interval](#pn_trigger_interval-integer)
秒内到达（例如设备不支持 *";+sip.pnsreg"*，或其他错误情况），
就会触发 [E_UL_CONTACT_REFRESH](/zh/modules/usrloc#e-ul-contact-refresh)
usrloc 事件。


一旦触发 [E_UL_CONTACT_REFRESH](/zh/modules/usrloc#e-ul-contact-refresh)，
脚本编写者应使用 Contact URI 中的 RFC 8599 参数，向设备所属的 PN
提供方生成推送通知请求，以使设备唤醒并重新注册。


*默认值为 **120**
（过期前秒数）。*


```opensips title="Setting the pn_trigger_interval parameter"
...
modparam("registrar", "pn_trigger_interval", 130)
...

```


#### pn_skip_pn_interval (integer)


在某个联系人成功（重新）注册之后，该设置表示一个以秒为单位的时间间隔，
在此间隔内假定该联系人是可达的，因此所有推送通知都会被跳过。


*默认值为 **0** 秒
（始终生成推送通知）。*


```opensips title="Setting the pn_skip_pn_interval parameter"
...
modparam("registrar", "pn_skip_pn_interval", 10)
...
```


#### pn_refresh_timeout (integer) {#pn_refresh_timeout-integer}


该超时在 *lookup()* 或
[pn_process_purr()](#pn_process_purrdomain) 触发推送通知后开始计时。
该值表示发送推送通知所需时长与相应设备重新注册到达所需时长之和的最大
允许值。


对于初始请求或对话中请求，一旦超过该超时，任何与待处理推送通知匹配的后续
重新注册都将不再产生预期效果。例如：


- 待处理的初始 INVITE 事务将完成，且不再为被叫侧发送的每个 REGISTER
自动分叉出额外分支
- 待处理的 BYE 消息将超时，OpenSIPS 会在尚未收到目标设备确实可达的
确认的情况下尝试路由它们


*默认值为 **6** 秒。*


```opensips title="Setting the pn_refresh_timeout parameter"
...
modparam("registrar", "pn_refresh_timeout", 10)
...
```


#### pn_enable_purr (boolean) {#pn_enable_purr-boolean}


为长时对话启用 SIP 推送通知机制。若启用，registrar 会在对 REGISTER
请求的 200 OK 应答中包含
*"+sip.pnspurr"*
Feature-Caps 头域标签。该标签表示该注册的唯一标识符（PURR - Proxy Unique
Registration Reference）。


在对话建立期间，每个 UA 都可以在其 Contact 头域中包含 OpenSIPS 在注册时
返回的 PURR 值。通过包含 PURR（例如 ";pn-purr=XXX"），代理表明它期望
先被 PN 唤醒，之后才能接收对端发来的对话中请求。


启用该参数时，请务必同时添加针对
[pn_process_purr()](#pn_process_purrdomain) 的逻辑。


*默认值为 **false**。*


```opensips title="Setting the pn_enable_purr parameter"
...
modparam("registrar", "pn_enable_purr", true)
...
```


### 导出的函数 {#exported-functions}


#### save(domain[, flags[, aor[, ownership_tag]]])


该函数处理一条 REGISTER 消息。它会根据 REGISTER 消息中的 Contact 和
Expires 头域来添加、删除或修改 usrloc 记录。成功时返回 200 OK，并列出
usrloc 中当前的所有联系人。出错时会发送错误消息，并在 reason phrase 中给出
简短描述。


各参数含义如下：


- *domain (static string)* - registrar 内的逻辑域。若使用数据库，则必须是
存储联系人的表名。
- *flags (string, optional)* - 由一个或多个下列标志位组成的字符串，
以逗号分隔：

  - *'memory-only'* -（旧 *m* 标志位）
只把联系人保存在内存缓存中，不做任何数据库操作；
  - *'no-reply'* -（旧 *r* 标志位）
不为当前 REGISTER 请求生成 SIP 应答。
  - *'max-contacts=[int]'* -（旧 *c*
标志位）该标志位可用于限制用户位置数据库中该
AOR（Address of Record）的联系人数目。
值为 0 时禁用该检查。该参数会覆盖全局的 "max_contacts" 模块参数。
  - *'force-registration'* -（旧 *f*
标志位）该标志位可用于即使已达到最大联系人数目也强制注册新联系人。此种
情况下，较旧的联系人会被移除，为新的联系人腾出空间，但不会超过允许的最大
数目。
该标志位仅在使用了 "max-contacts" 时才有意义。
  - *'matching-mode=[val]'* -（旧 *M*
标志位）上传的联系人（由当前处理的 REGISTER 带来）与已知联系人（内存或
数据库中）之间应如何执行匹配。该选项仅对当前操作生效，可取值为：
	- *'0'* - 仅按 contact URI 匹配
	- *'1'* - 按 contact URI 和 SIP Call-ID 匹配
	- *'&lt;param_name&gt;'* - 仅使用给定 URI 参数的值进行匹配（例如 &lt;rinstance&gt;）
  - *'path-off'* -（旧 *p0* 标志位）
（Path 支持 - 'off' 模式）- Path 头域被保存到 usrloc，但绝不包含在应答中。
  - *'path-lazy'* -（旧 *p1* 标志位）
（Path 支持 - lazy 模式）Path 头域被保存到 usrloc，但仅当注册请求通过
"Supported" 头域的 "path" 选项表明了 Path 支持时，才包含在应答中。
  - *'path-strict'* -（旧 *p2* 标志位）
（Path 支持 - strict 模式）- 仅当注册请求通过 "Supported"
头域的 "path" 选项表明了 Path 支持时，才把 path 头域保存到 usrloc。
若未表明 Path 支持，则以 "420 - Bad Extension" 拒绝该请求，并在应答中
包含 "Unsupported: path" 头域以及收到的 "Path"
头域。该模式是 RFC-3327 推荐的模式。
  - *'path-received'* -（旧 *v* 标志位）
若设置，则注册中第一个 Path URI 的 "received" 参数被设为 received-uri，
并为该联系人设置 NAT 分支标志位。当 registrar 位于 SIP 负载均衡器之后，
而该均衡器把经 NAT 的 UAC 地址作为 "received"
参数放入其 Path uri 时，该选项很有用。
  - *'only-request-contacts'* -（旧 *o*
标志位）注册成功时，应答的 200 OK 中只包含该 REGISTER 请求的 Contact。
虽然这违反 RFC 3261，但在某些场景下可能有用。
  - *'socket-header'* -（旧
*s* 标志位）在 REGISTER 请求中查找包含套接字
描述（proto:IP:port）的头域。register 将存储该套接字信息，而不是接收到的
套接字信息。
  - *'min-expires=[int]'* -（旧
*e* 标志位）该
标志位可用于设置最小注册过期时间。
低于该最小值的取值会被自动设为最小值。值为 0 时禁用该检查。
该参数会覆盖全局的
[min_expires](#min_expires-integer) 模块参数。
  - *'max-expires=[int]'* -（旧
*E* 标志位）该
标志位可用于设置最大注册过期时间。
高于该最大值的取值会被自动设为最大值。值为 0 时禁用该检查。
该参数会覆盖全局的
[max_expires](#max_expires-integer) 模块参数。
该参数是由一组标志位组成的字符串。
- *aor (string, optional)* - 自定义 AOR；若缺省，
则 AOR 取自默认位置——TO 头域 URI。
- *ownership_tag (string, optional)* - 一个集群共享
标签（详见 clusterer 模块文档），它
会被附加到当前请求保存的每个联系人上。
该标签只在集群化用户位置场景下相关，用
于确定联系人当前所属的逻辑属主节点。这反过
来有助于限制当前并不负责该联系人的节点执行某些
操作（例如：在高可用部署中从非属主的虚拟 IP 地址错误地发起 ping）。


该函数可在 REQUEST_ROUTE 和 ONREPLY_ROUTE 中使用。


若计划在应答路由中使用 "save()" 函数，
请参阅 [mcontact_avp](#mcontact_avp-string) 模块参数。


```opensips title="save usage"
...
# 保存到 'location'，无标志位，使用默认 AOR（TO URI）
save("location");
...
# 保存到 'location'，不更新数据库，每个 AOR 最多 5 个联系人，
# 使用默认 AOR（TO URI）
save("location","memory-only, max-contacts=5");
...
# 保存到 'location'，无标志位，使用 FROM URI 作为 AOR
save("location","",$fu);
...
# 保存到 'location'，不更新数据库，强制注册，从 AVP 取 AOR
save("location","memory-only, no-reply", $avp(aor));
...
# 保存到 'location'，为联系人打上 "vip" 归属标签，并
# 把这些联系人复制到当前不拥有 "vip" 的备份节点
save("location", , , "vip");
...
```


#### remove(domain, AOR[, [contact][, [next_hop][, [sip_instance], [bflag]]]])


显式删除某个给定 address-of-record 之下的联系人。


各参数含义如下：


- *domain (static string* - registrar 内的逻辑域。
若使用数据库，则必须是存储联系人的表名。
- *AOR (string)* - 要搜索的 address-of-record（SIP URI）
- *contact (string, optional)* - 用于筛选
要删除联系人的 SIP URI。必须是注册时所用的完整 SIP URI。
- *next_hop (string, optional)* - 返回该
联系人途中的下一跳 SIP IP 地址/主机名。关于下一跳如何
计算，详见下文。主机名在匹配前会被解析。
- *sip_instance (string, optional)* - 用于
筛选的 "+sip.instance" 值。
- *bflag (string, optional)* - 用于
筛选的分支标志位。


> [!IMPORTANT]
> 每个联系人的 IP 地址（用于匹配）按如下方式计算：
> - a. 若存在 Path 头域，则解析 Path URI 的主机名部分
> 作为该联系人的 IP 地址。
> - b. 否则，若通过 nathelper 为该联系人设置了 "Received" 值
> （下一跳的源 IP），则该值成为被解析为联系人
> IP 地址的主机名。
> - c. 否则，选择 Contact 头域 URI 的 "hostname" 部分
> 解析为该联系人的 IP 地址。


该函数可在 REQUEST_ROUTE 和 ONREPLY_ROUTE 中使用。


```opensips title="remove usage"
...
# 删除属于 "bob" AOR 的所有联系人
remove("location", "sip:bob@atlanta.com");
...
# 只删除 bob 的家庭电话联系人
remove("location", "sip:bob@atlanta.com", "sip:bob@46.50.64.78");
...
# 删除 bob 所有位于 "50.60.50.60" 之后的电话
# 注意：即使不使用，"contact" 参数也必须以 NULL 值指定
$var(next_hop) = "50.60.50.60"
remove("location", "sip:bob@atlanta.com", , $var(next_hop));
...
# 删除 bob 位于 "50.60.50.60" 之后、contact 为 "sip:bob@46.50.64.78" 的电话
remove("location", "sip:bob@atlanta.com", "sip:bob@46.50.64.78", "50.60.50.60");
...
# 删除 bob 移动设备 X 之后的所有联系人
remove("location", "sip:bob@atlanta.com", , , "<urn:uuid:e5e68d40-f08a-4600-b82e-ff4d5d8c1a8f>")
```


#### remove_ip_port(IP,Port, domain, [AOR])


删除位于指定 IP 和端口之后的所有联系人，可选地按 AOR 过滤。


各参数含义如下：


- *IP (string)* - 要删除联系人的 IP
- *Port (integer)* - 要删除联系人的端口
- *domain (static string* - registrar 内的逻辑域。
若使用数据库，则必须是存储联系人的表名。
- *AOR (string, optional)* - 要搜索的 address-of-record（SIP URI）


该函数可在所有路由中使用。


```opensips title="remove_ip_port usage"
...
# 删除 8.8.8.8 端口 43213 之后的所有联系人
remove_ip_port("8.8.8.8",43213,"location");
...
# 只删除 bob 位于 8.8.8.8:43213 主机之后的联系人
remove_ip_port("8.8.8.8",43213,"location","sip:bob@atlanta.com");
...
```


#### lookup(domain [, flags [, aor]])


该函数从 Request-URI 中提取用户名，并尝试在 usrloc 中查找该用户名的
所有联系人。若没有此类联系人，则返回 -1。若存在此类联系人，
Request-URI 会被覆盖为 q 值最高的那个联系人，并且（取决于
append_branches 参数值）其余联系人可选地被追加到消息中。


若启用了 method_filtering 选项，lookup 函数
只会返回支持所处理请求方法的联系人。


各参数含义如下：


- *domain (static string)* - 应用于查找的表名。
- *flags (string, optional) - 由一个或多个
下列标志位组成的字符串，以逗号分隔：*

  - *'no-branches'* -（旧 *b* 标志位）该
标志位控制 *lookup()* 函数如何处理多个联系人。
若 usrloc 中给定用户名有多个联系人且未设置该
标志位，Request-URI 会被覆盖为 q 值最高的联系人，其余联系人会被追加到
sip_msg 结构中，之后可被 tm 用于分叉。若
设置了该标志位，则只会把 Request-URI 覆盖为
q 值最高的联系人，其余联系人保持不处理。
  - *'to-branches-only'* -（旧 *B* 标志位）
该标志位强制把所有找到的联系人仅作为分支上传（放入
目的地址集），完全不放入当前消息的 R-URI。使用该选项可使 *lookup()* 函数
也能用于 SIP 应答场景。
  - *'branch'* -（旧 *r* 标志位）该标志位
启用对已有分支中的 AOR 进行搜索并将其展开为
联系人。例如，RURI 中是 AOR A，但你还想把呼叫转发到 AOR B。为此
必须把 AOR B 放入一个分支，若启用该标志位，函数也会把 AOR B 展开为联系人，
并放回分支中。函数调用前已在分支中的 AOR 会被移除。
**警告：**
*若希望启用该标志位，
则不得设置 'no-branches' 标志位，因为设置了
该标志位就不允许 *lookup()* 写入分支。*
  - *'method-filtering'* -（旧 *m* 标志位）
设置该标志位将根据注册时 "Allow" 头域中列出的受支持方法来启用联系人过滤。
注册时未提供 "Allow" 头域的联系人被视为支持所有标准 SIP 方法。
  - *'ua-filtering=[val]'*（旧 *u* 标志位）
（User-Agent 过滤）- 该标志位启用按 user-agent 的正则过滤。
它与启用的 append_branches 参数配合时很有用。值必须采用
'/regexp/' 格式。
  - *'case-insensitive'*（旧 *i* 标志位）-
该标志位为 'ua-filtering' 标志位启用不区分大小写的过滤。
  - *'extended-regexp'* -（旧 *e* 标志位）
该标志位为 'ua-filtering' 标志位启用扩展正则表达式格式。
  - *'global'*（旧 *g* 标志位）（全局
lookup）- 该标志位仅在联邦式用户位置集群下相关。
若设置，*lookup()* 函数不仅执行经典的
内存内 "search-AoR-and-push-branches" 操作，还会
执行一次元数据查找，并为每个返回结果追加一个额外分支。
"内存分支"对应本地联系人（当前位置），而"元数据
分支"对应平台其他一个或多个位置上的可用联系人。
AoR 元数据由最低要求的信息组成，
以便 VoIP 平台的某个位置（数据中心）能为全局平台通告
本地已注册 AoR 的存在。具体而言，它由两项
信息组成：


即 AoR（例如 "vladimir@federation-cluster"）


以及归属 IP（例如 "10.0.0.223"）
  - *'max-ping-latency=[int]'* -（旧 *y*
标志位）可接受的联系人 ping 延迟上限（微秒）。在 *lookup()* 期间，
延迟更高的 AoR 联系人会被丢弃。
  - *'sort-by-latency'* -（旧 *Y* 标志位）
将按联系人最近一次成功 ping 延迟的升序挑选（ping 最快 -> ping 最慢）。
该标志位可与 "max-ping-latency" 标志位配合使用。
- *AOR (string, optional)* - 要查找的 AOR；若
缺省，则使用 RURI 作为 AOR；


返回码：


- **1** - 找到联系人并成功作为分支推入。需要先被唤醒才能
可达的联系人，将通过异步推送通知得到通知。
- **2** - 已为找到的联系人成功启动至少一个
异步推送通知，但未填充任何额外分支（即无需调用 t_relay()）。
- **-1** - 未找到联系人。
- **-2** - 找到联系人，但没有一个
支持当前 SIP 方法。
- **-3** - 处理过程中发生内部错误。


该函数可在 REQUEST_ROUTE、FAILURE_ROUTE 中使用。


```opensips title="lookup usage"
...
lookup("location");  # 简单查找
   #或
lookup("location", "method-filtering"); # 带方法过滤的查找
   #或
lookup("location", "branch"); # 带 aor 分支搜索的查找；
						# 除第一个之外的所有联系人都应放入
						# 分支中
   #或
lookup("location", "ua-filtering=/phone/i"); # 带 user-agent 过滤的查找
   #或
lookup("location", "", $var(aor)); # 使用变量中 AOR 的简单查找
switch ($retcode) {
    case -1:
    case -3:
        sl_send_reply(404, "Not Found");
        exit;
    case -2:
        sl_send_reply(405, "Not Found");
        exit;
};
...
```


#### is_registered(domain ,[AOR])


若某个 AOR 已注册则返回 true，否则返回 false。
该函数不修改所处理的消息。


> [!NOTE]
> 若在应答中调用（从 onreply_route），必须传入
> AOR（作为参数），否则函数会失败。


各参数含义如下：


- *domain (static string)* - 应用于查找的表名。
- *AOR (string, optional)* - 要查找的 AOR；若
缺省，则对 REGISTER 请求取 "To" 头域、对其他 sip 请求取 "From"
头域作为 AOR 来源。


该函数可在 REQUEST_ROUTE、FAILURE_ROUTE、
BRANCH_ROUTE、ONREPLY_ROUTE、LOCAL_ROUTE 中使用。


```opensips title="is_registered usage"
...
/**/
if (is_method("REGISTER")) {
	/* 自动使用 To 头域中的 URI */
	if (is_registered("location")) {
		xlog("this AOR is registered\n")
		...
	}
};
/* 检查 From uri 中的该 aor 是否已注册 */
if (is_registered("location",$fu)) {
	xlog("caller is registered\n");
}
...
```


#### is_contact_registered(domain ,[AOR],[contact],[callid])


若某个 AOR 下的联系人及/或 callid 已注册则返回 true，否则返回 false。
该函数不修改所处理的消息。


各参数含义如下：


- *domain (static string)* - 应用于查找的表名。
- *AOR (string, optional)* - 要查找的 AOR；若
缺省，则对 REGISTER 请求取 "To" 头域、对其他 sip 请求取 "From"
头域作为 AOR 来源。
- *contact (contact, optional)*（可选）- 用于检查是否存在以该 URI
为 contact 的注册的 SIP URI（这有助于你区分同一用户/AOR 的多个
注册）。
- *callid (string, optional)* - 用于检查联系人是否以该 callid
注册的 callid（这有助于你区分新注册的联系人（callid
此前未注册）与重新注册（callid 已
注册））。


该函数可在 REQUEST_ROUTE、FAILURE_ROUTE、
BRANCH_ROUTE、ONREPLY_ROUTE、LOCAL_ROUTE 中使用。


```opensips title="is_contact_registered usage"
...
/* 拦截未注册的用户... */
if (is_method("INVITE")) {
	if (!is_contact_registered("location")) {
		sl_send_reply(401, "Unauthorized");
		...
	}
}

/* ... 或检查第 2 个 Contact URI 是否已注册 */
if (is_method("INVITE")) {
	if (is_contact_registered("location", $fu, $(ct.fields(uri)[1])))
		xlog("caller is registered\n");
}
...
```


#### is_ip_registered(domain ,[AOR],IPvar,[PORTvar])


若至少存在一个从 IPvar 变量中的 IP（以及可选的 PORTvar 变量）注册的
联系人，则返回 true。
IP 会与 received 主机（若存在）匹配，否则与 contact 主机匹配。
该函数不修改所处理的消息。该函数
取代了旧的 "is_other_contact" 函数。


各参数含义如下：


- *domain (static string)* - 应用于查找的表名。
- *AOR (string, optional)* - 要查找的 AOR；若
缺省，则对 REGISTER 请求取 "To" 头域、对其他 sip 请求取 "From"
头域作为 AOR 来源。
- *IPvar (var)* - 包含用于与 contact 主机或 received 主机（见上）
匹配的 IP 的变量。若 *IPvar* 是包含多个值/IP 的 AVP，
则会检查所有值。
- *PORTvar (var, optional)* - 包含用于与 contact 主机或 received 主机
（见上）匹配的端口的变量。若 *IPvar* 是包含多个值/IP 的 AVP，
则 PORTvar 应包含相同数量的条目，并且所有值都会被检查。


该函数可在 REQUEST_ROUTE、FAILURE_ROUTE、
BRANCH_ROUTE、ONREPLY_ROUTE、LOCAL_ROUTE 中使用。


```opensips title="is_ip_registered usage"
...
/* 检查源 IP 是否已注册 */
if (is_method("REGISTER")) {
	if (is_ip_registered("location",$tu,$si)) {
		xlog("already registered from this ip\n");
		...
	}
};
...
```


#### add_sock_hdr(hdr_name)


向当前 REGISTER 请求添加一个名为
"hdr_name" 的新头域，其中包含
接收到的套接字描述（proto:ip:port）


这仅在多台复制服务器的场景下有意义。


各参数含义如下：


- *hdr_name (string)* - 要使用的头域名。


该函数可在 REQUEST_ROUTE 中使用。


```opensips title="add_sock_hdr usage"
...
add_sock_hdr("Sock-Info");
...
```


### 导出的异步函数 {#exported-asynchronous-functions}


#### pn_process_purr(domain) {#pn_process_purrdomain}


按 RFC 8599 执行对话中请求处理。对此类请求，在 R-URI 和最顶层 Route
头域 URI 中查找 *";pn-purr"* 参数值，该值既符合
OpenSIPS PURR 格式，又对应某个 usrloc 注册。一旦定位到 usrloc
联系人，就触发 [E_UL_CONTACT_REFRESH](/zh/modules/usrloc#e-ul-contact-refresh)
事件，并把该请求异步挂起最多
[pn_refresh_timeout](#pn_refresh_timeout-integer) 秒，直至收到匹配的
REGISTER 请求。


若处理在触发推送通知之前结束，则该请求
不再被异步挂起，恢复路由会被立即调用。


各参数含义如下：


- *domain (static string)* - registrar 内的逻辑域。
若使用数据库，则必须是存储联系人的
表名。


**返回码**


- **1** - 成功，PN 已发起。
- **2** - 成功，
但 PN 未发起（由于缺少 PURR、PURR 不属于本机或
联系人离线）
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


### 导出的统计项 {#exported-statistics}


#### max_expires


max_expires 参数的值。


#### max_contacts


max_contacts 参数的值。


#### default_expires


default_expires 参数的值。


#### accepted_regs


被接受的注册数目。


#### rejected_regs


被拒绝的注册数目。


## 常见问题 {#frequently-asked-questions}


**问：旧的 "append_branch" 模块参数怎么了？**


它作为全局选项被移除，因为 "lookup"
函数通过标志位 "b"（append Branches）接收该选项。
参见 "lookup" 函数的文档。


**问：旧的 "method_filtering" 模块参数怎么了？**


它作为全局选项被移除，因为 "lookup"
函数通过标志位 "m"（Method filtering）接收该选项。
参见 "lookup" 函数的文档。


**问：旧的 "sock_flag" 模块参数怎么了？**


它作为全局选项被移除，因为 "save"
函数通过标志位 "s"（Socket header）接收该选项。
参见 "save" 函数的文档。


**问：旧的 "use_path" 和 "path_mode" 模块参数怎么了？**


它们作为全局选项被移除，因为 "save"
函数通过标志位 "px"（path support）接收这些选项。
参见 "save" 函数的文档。


**问：旧的 "path_use_received" 模块参数怎么了？**


它作为全局选项被移除，因为 "save"
函数通过标志位 "v"（path receiVed）接收该选项。
参见 "save" 函数的文档。


**问：旧的 "nat_flag" 模块参数怎么了？**


它被移除，因为模块内部从
"USRLOC" 模块加载该值（参见 "nat_bflag"
USRLOC 参数）。


**问：旧的 "use_domain" 模块参数怎么了？**


它被移除，因为模块内部从
"USRLOC" 模块加载该选项。这样做是为了简化
配置。


**问：旧的 "save_noreply" 和 "save_memory" 函数怎么了？**


这些函数已合并到新的
"save(domain,flags)" 函数中。是否应发送应答、是否应更新数据库，
都由
flags 控制。


**问：在哪里可以了解更多关于 OpenSIPS 的信息？**


请访问 [https://opensips.org/](https://opensips.org/)。


**问：在哪里可以就该模块提问？**


首先请确认你的问题是否已在我们的
某个邮件列表中得到了回答：

关于任何稳定版 OpenSIPS 的邮件应发送至
users@lists.opensips.org，关于开发版的邮件
应发送至 devel@lists.opensips.org。

若希望邮件保持私密，请发送至
users@lists.opensips.org。


**问：如何报告缺陷？**


请遵循以下地址所提供的指南：
[https://github.com/OpenSIPS/opensips/issues](https://github.com/OpenSIPS/opensips/issues)。


**问：desc_time_order 参数去哪里了？**


它被移除，因为其功能已迁移到 usrloc
模块，那里有一个同名参数。
<!-- CONTRIBUTORS -->

### 许可证 {#license}

所有文档文件（即 .md 扩展名）均按 Creative Common License 4.0 许可
