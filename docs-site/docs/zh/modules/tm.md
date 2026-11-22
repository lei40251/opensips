---
title: "tm 模块"
description: "TM 模块为 SIP 事务提供有状态处理能力。"
sidebar: false
---


## 管理员指南 {#admin-guide}


### 概述 {#overview}


TM 模块为 SIP 事务提供有状态处理能力。有状态逻辑在内存和 CPU 上开销较大，其主要用途在于某些服务本身就天然需要状态。例如，基于事务的计费（模块 acc）需要处理事务状态，而不是单条消息；任何形式的分叉也都必须以有状态方式实现。有状态处理的另一个用途，是用内存来换取重传处理所消耗的 CPU。不过，只有当每个请求的 CPU 开销都很大时这样做才有意义。例如，如果你希望避免对发往无法解析目的地的每个请求重传都进行昂贵的 DNS 解析，就使用有状态模式。这样，只有初始消息会因 DNS 查询而给服务器带来负担，后续的重传会被丢弃，不会再导致更多进程被 DNS 解析阻塞。代价是更高的内存消耗和更大的处理延迟。


从用户视角看，最核心的函数是 t_relay()。它建立事务状态、吸收来自上游的重传、产生向下游的重传，并把应答与请求关联起来。


一般而言，如果使用了 TM，它会把收到的 SIP 消息的副本克隆到共享内存中。这会消耗内存，也会消耗 CPU 时间（memcpy、查找、共享内存锁等）。注意，非 TM 函数是在私有内存中对收到的消息进行操作，这意味着一旦创建了事务状态，任何核心操作都不会对有状态处理的消息产生效果。例如，在 t_relay *之后* 调用 record_route 基本没有用处，因为 RR 会被加到私有持有的消息上，而转发的是它的 TM 克隆。


TM 相当庞大且不易编程——大量互斥锁、共享内存访问、malloc 与 free、定时器——做任何事时都必须格外小心。为简化 TM 编程，提供了回调（callback）这一手段。回调机制允许程序员把自己的函数注册到特定事件上。可能的事件列表见 t_hooks.h。


程序员可能还想了解的是 UAC——它是一段非常简单的代码，可以让你生成自己的事务。对 NOTIFY 或 IM 网关之类的东西尤其有用。UAC 负责全部事务机制：重传、FR 超时、分叉等。更多细节见 uac.h 中的 t_uac 原型。想查看事务结果的人可以注册回调。


#### 按分支的标志位 {#per-branch-flags}


首先说说分支概念的想法：分支路由是在每个分支发出之前分别执行的路由——该路由中的改动应当只反映到那个分支上。


OpenSIPS 中有几类标志位：


- *消息/事务* 标志位 - 它们在事务中随处可见（所有路由中以及所有顺序应答/请求中）。
- *分支* 标志位 - 只从特定分支可见的标志位 - 在该分支相关的所有应答和路由中可见。
- *脚本* 标志位 - 仅在脚本执行期间存在的标志位。它们不被存储在任何地方，一旦离开顶层路由就丢失。


例如：我有一个呼叫并行分叉到 GW 和一个用户。我想知道最终否定应答（如果有的话）会来自哪个分支。我会在转发这些呼叫（共 2 个分支）之前设置一个分支路由。分支路由会对每个分支分别执行；在发往 GW 的分支中（可以通过查看 RURI 来识别它），我会设置一个分支标志位。这个标志位只会出现在为 GW 的应答而执行的 onreply 路由中。如果最终选定的应答属于 GW 分支，它在失败路由中也同样可见。这些标志位在其他分支中不可见（即在执行其他分支应答的路由中）。


关于如何定义分支标志位并在脚本中使用，参见 [t_on_branch()](#t_on_branchbranch_route) 以及 setbflag()、resetbflag() 和 isbflagset() 脚本函数。


另外，模块可以在创建事务之前设置分支标志位（目前该特性在脚本中不可用）。REGISTRAR 模块是第一个使用这类标志位的模块。NAT 标志位被推入分支标志位，而不是消息标志位。


#### 基于超时的故障切换 {#timeout-based-failover}


超时可以用来触发故障切换行为。例如，如果我们把呼叫发往某个网关，而该网关在 3 秒内没有发送临时应答，我们就想取消这个呼叫并把呼叫发往另一个网关。另一个例子是只让某个 SIP 客户端振铃 30 秒，然后把呼叫重定向到语音信箱。


事务模块导出两类超时：


- **[fr_timeout](#fr_timeout-integer)** - 尚未收到任何应答时使用。如果经过 *[fr_timeout](#fr_timeout-integer)* 秒后仍无应答，定时器就会触发（如果调用了 t_on_failure()，失败路由将被执行）。对于 INVITE 事务，如果收到了临时应答，超时会重置为 *[fr_inv_timeout](#fr_inv_timeout-integer)* 秒，其他事务则重置为 RT_T2。一旦收到最终应答，事务就结束了。
- **fr_inv_timeout** - 对于 INVITE 事务，一旦收到临时应答，该超时就开始倒计时。


例如：你希望在没有临时应答 3 秒后执行故障切换，但又希望振铃 60 秒。于是把 *[fr_timeout](#fr_timeout-integer)* 设为 3，把 *fr_inv_timeout* 设为 60。


#### DNS 故障切换 {#dns-failover}


转发有状态请求时可以使用基于 DNS 的故障切换。根据 RFC 3263，DNS 故障切换应在传输层或事务层进行。TM 模块两者都支持。


传输层的故障切换可能由请求消息发送失败触发。如果没有为发送请求找到对应的接口、TCP 连接被拒绝，或发送过程中发生一般性内部错误，就视为失败。不支持 ICMP 错误报告。


事务层的故障切换可能在事务以 503 应答完成、或以未收到任何应答的超时完成时触发。在这种情况下，如果还有其他目的地 IP 可用于投递请求，就会自动分叉出一个新分支。新分支将是胜出分支的克隆。


目的地 IP 集合是基于目的地域可用的 NAPTR、SRV 和 A 记录逐步（按需）构建的。


基于 DNS 的故障切换默认启用，除非该故障切换被全局禁用（见核心参数 disable_dns_failover），或（按事务）设置了 relay 标志位（见 t_relay() 函数）。


#### Anycast 场景 {#anycast-scenario}


在使用 [Anycast IP](https://en.wikipedia.org/wiki/Anycast) 做负载均衡场景时，可能会遇到这样的问题：某个事务请求到达一个实例，而应答（或多个应答）却到达了其他实例。这通常会破坏事务状态，因为本地事务会开始重传，并最终超时。此外，从 UA 的角度看，应答本应已经发出，但由于它到达的代理并不知晓该事务，因此不会被转发（在 INVITE 的情况下也不会被 ACK）。从这时起，事情可能迅速升级。


为解决这些问题，模块使用一种分布式机制来判断某个特定应答的事务是在哪里创建的。当某个实例收到的应答没有关联事务时，它会复制该应答，交由「拥有」该事务的实例处理。这通过 *clusterer* 模块的支持实现。


搭建 anycast 场景非常简单：属于某个 anycast 场景的所有实例都必须配置在同一个集群中（更多信息见 [tm_replication_cluster](#tm_replication_cluster-integer) 参数）。创建事务时，会在 branch 参数后附加一个特殊标识符，即创建该事务的实例。应答到达时，事务模块会检查谁「拥有」该事务。如果该标识符就是本实例自己的 id，则应答在本地处理；否则就复制给该 id 所指的节点。复制以非常高效的方式进行，使用 *proto_bin* 传输层。


对 *CANCEL* 和 *ACK* 方法有特殊处理。由于这些方法在 branch 参数中不包含特殊标识符（因为它们由 UAC 而非我们生成），因此无法确定谁「拥有」该事务。所以，如果为这些请求找不到本地事务，就用 [t_anycast_replicate()](#t_anycast_replicate) 函数把它们广播给所有其他实例。同样，这也是借助 *proto_bin* 传输层以非常高效的方式完成的。


#### 使用范围 {#usage-scope}


事务函数和变量只应被调用在可以创建事务的 SIP 请求消息上，或调用在具备事务感知的路由中，例如 *branch_route[name]*、*failure_route[name]* 或 *onreply_route[name]*。在不具备事务感知的路由中使用 TM 函数或变量（例如通用的 *onreply_route*、*error_route* 或 *timer_route[name, timer]*）可能导致未定义行为，且多数情况下会产生伪造或畸形的信令。因此强烈建议避免在非 TM 上下文感知的路由中使用它们。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


本模块之前必须先加载以下模块：


- *clusterer* 模块，如果启用了 anycast 场景（更多信息见 [tm_replication_cluster](#tm_replication_cluster-integer) 参数）。


#### 外部库或应用程序 {#external-libraries-or-applications}


加载本模块运行 OpenSIPS 之前，必须先安装以下库或应用程序：


- *无*。


### 导出的参数 {#exported-parameters}


#### fr_timeout (integer) {#fr_timeout-integer}


当请求没有最终应答、或否定 INVITE 应答没有 ACK 到达时触发的超时（单位：秒）。


*默认值为 30 秒。*


```opensips title="Set fr_timeout parameter"
...
modparam("tm", "fr_timeout", 10)
...
```


#### fr_inv_timeout (integer) {#fr_inv_timeout-integer}


对于 INVITE，在收到临时消息后仍没有最终应答到达时触发的超时（单位：秒）。该超时在收到第一个临时应答后开始倒计时。因此，把 *[fr_timeout](#fr_timeout-integer)* 设为较小的值可以实现快速故障切换（网关不发送 100 trying）。见下面的示例。


*默认值为 120 秒。*


```opensips title="Set fr_inv_timeout parameter"
...
modparam("tm", "fr_inv_timeout", 200)
...
```


#### wt_timer (integer)


事务完成之后仍留在内存中以吸收延迟消息的时间；此外，当该定时器到时，本地 CANCEL 的重传会停止（一种纯粹但复杂的行为是一直不进入等待状态，直到本地分支因最终应答或 FR 定时器而结束——我们做了简化）。


对于非 INVITE 事务，该定时器对应 RFC 3261 第 17.2.2 节的定时器 J。根据该 RFC，这个定时器应为 64*T1（= 32 秒）。但这样会增加内存占用，因为事务会在内存中保留很久。


*默认值为 5 秒。*


```opensips title="Set wt_timer parameter"
...
modparam("tm", "wt_timer", 10)
...
```


#### delete_timer (integer)


当前被某进程引用（ref-ed）的待删除事务，在此时间之后会再次尝试删除。


*默认值为 2 秒。*


```opensips title="Set delete_timer parameter"
...
modparam("tm", "delete_timer", 5)
...
```


#### T1_timer (integer)


重传 T1 周期，单位毫秒。


*默认值为 500 毫秒。*


```opensips title="Set T1_timer parameter"
...
modparam("tm", "T1_timer", 700)
...
```


#### T2_timer (integer)


最大重传周期，单位毫秒。


*默认值为 4000 毫秒。*


```opensips title="Set T2_timer parameter"
...
modparam("tm", "T2_timer", 8000)
...
```


#### ruri_matching (integer)


是否按标准要求，把 request-uri 匹配用作 pre-3261 事务匹配的一部分？只有当需要与那些行为不规范、在 CANCEL/ACK 中发送与原始 INVITE 不同 r-uri 的设备更好互通时才关闭。


*默认值为 1（true）。*


```opensips title="Set ruri_matching parameter"
...
modparam("tm", "ruri_matching", 0)
...
```


#### via1_matching (integer)


是否按标准要求，把最顶层 VIA 匹配用作 pre-3261 事务匹配的一部分？只有当需要与那些行为不规范、在 CANCEL/ACK 中发送与原始 INVITE 不同最顶层 VIA 的设备更好互通时才关闭。


*默认值为 1（true）。*


```opensips title="Set via1_matching parameter"
...
modparam("tm", "via1_matching", 0)
...
```


#### unix_tx_timeout (integer)


使用 UNIX 套接字的函数（如 t_write_unix）所用的发送超时。


*默认值为 2 秒。*


```opensips title="Set unix_tx_timeout parameter"
...
modparam("tm", "unix_tx_timeout", 5)
...
```


#### restart_fr_on_each_reply (integer)


如果为 true（非空值），则每收到一个临时应答都会重新触发最终应答定时器。在这种情况下，最终应答超时可能发生在超过 *[fr_inv_timeout](#fr_inv_timeout-integer)* 的时间之后（如果 UAS 持续发送临时应答）。


*默认值为 1（true）。*


```opensips title="Set restart_fr_on_each_reply parameter"
...
modparam("tm", "restart_fr_on_each_reply", 0)
...
```


#### tw_append (string)


由 t_write_req 和 t_write_unix 函数追加的附加信息列表。


*默认值为空字符串。*


该参数的语法为：


- *tw_append = append_name':' element (';'element)**
- *element = ( [name '='] variable)*


每个元素都会以 "name: value" 格式逐行追加。元素 "$rb（消息体）" 是唯一不接受名称的元素；消息体将始终打印在最后，而不管它在定义字符串中的位置。


```opensips title="Set tw_append parameter"
...
modparam("tm", "tw_append",
   "test: ua=$hdr(User-Agent) ;avp=$avp(avp);$rb;time=$Ts")
...
```


#### pass_provisional_replies (integer)


启用/禁用把临时应答传递给 FIFO 应用程序。


*默认值为 0。*


```opensips title="Set pass_provisional_replies parameter"
...
modparam("tm", "pass_provisional_replies", 1)
...
```


#### syn_branch (integer)


启用/禁用生成 Via 头域时使用有状态同义分支 ID。它们更快，但无法在重启后继续使用（not reboot-safe）。


*默认值为 1（使用同义分支）。*


```opensips title="Set syn_branch parameter"
...
modparam("tm", "syn_branch", 0)
...
```


#### onreply_avp_mode (integer)


描述在应答路由中应如何处理 AVP：


- *0* - AVP 仅按消息有效；它们不会与事务中存储的 AVP 相互影响；初始时是一个空列表，路由结束时所有创建的 AVP 都会被丢弃。
- *1* - AVP 就是事务 AVP；初始时事务 AVP 可见；路由结束时，该列表会（连同所有改动）重新挂回事务。


在模式 1 下，你可以看到在请求路由、分支路由或失败路由中设置的 AVP。副作用是性能开销，因为需要更多加锁来维护 AVP 列表的完整性。


*默认值为 0。*


```opensips title="Set onreply_avp_mode parameter"
...
modparam("tm", "onreply_avp_mode", 1)
...
```


#### disable_6xx_block (integer)


说明 6xx 应答应如何在内部处理：


- *0* - 6xx 应答会阻止任何后续的串行分叉（添加新分支）。这是 RFC3261 的行为。
- *1* - 6xx 应答会像任何其他否定应答一样处理——允许串行分叉。逻辑上，如果你想把呼叫重定向到播报和语音信箱服务，就需要突破 RFC3261。


*默认值为 0。*


```opensips title="Set disable_6xx_block parameter"
...
modparam("tm", "disable_6xx_block", 1)
...
```


#### enable_stats (integer)


启用 TM 模块的统计支持 - 如启用，TM 模块会在内部维护若干统计，并通过 MI（Management Interface，管理接口）导出。


*默认值为 1（启用）。*


```opensips title="Set enable_stats parameter"
...
modparam("tm", "enable_stats", 0)
...
```


#### minor_branch_flag (string/integer)


在脚本中用于标记次分支（minor branch，在 t_relay() 之前）的分支标志位索引。


次分支是 OpenSIPS 在并行分叉期间不会等待其完成的分支。因此，如果其余分支都返回否定应答，OpenSIPS 不会等待次分支的最终应答，而是直接取消它。


次分支的主要用途是把一个分支分叉到媒体服务器，用于注入（通过 183 Early Media）一些呼叫前媒体——当然，从分支选择的角度看，这个分支对呼叫的其余分支是透明的。


*默认值为 none（禁用）。*


```opensips title="Set minor_branch_flag parameter"
...
modparam("tm", "minor_branch_flag", "MINOR_BFLAG")
...
```


#### timer_partitions (integer)


TM 内部定时器（重传、删除、等待等）的分区数。对定时器进行分区可以并行处理定时器事件而不是全部串行，从而在高负载下提升吞吐量。


定时器分区的建议范围最大为 16（软限制）。


*默认值为 1（禁用）。*


```opensips title="Set timer_partitions parameter"
...
# 启用两个定时器分区
modparam("tm", "timer_partitions", 2)
...
```


#### auto_100trying (integer) {#auto_100trying-integer}


该参数控制 TM 模块在创建 INVITE 事务时是否自动生成 100 Trying 有状态应答。


如果你希望从脚本层面控制何时发送 100 Trying，可以禁用该行为。


*默认值为 1（启用）。*


```opensips title="Set auto_100trying parameter"
...
# 禁用自动 100 Trying
modparam("tm", "auto_100trying", 0)
...
```


#### tm_replication_cluster (integer) {#tm_replication_cluster-integer}


该参数应用于 anycast 配置，指定所有使用 anycast IP 的节点的集群 id。


更多细节见 [tm anycast](#anycast-scenario) 一节。


*默认情况下 anycast 复制是禁用的。*


```opensips title="Set tm_replication_cluster parameter"
...
# 在集群 1 中复制 anycast 消息
modparam("tm", "tm_replication_cluster", 1)
...
```


#### cluster_param (string)


该参数应用于 anycast 配置，指定 VIA branch 参数中用于标记创建事务的实例 id 的参数名。


更多细节见 [tm anycast](#anycast-scenario) 一节。


*默认值为 cid。*


```opensips title="Set the cluster_param parameter"
...
modparam("tm", "cluster_param", "tid")
...
```


#### cluster_auto_cancel (boolean)


该参数应用于 anycast 配置，指定在标记为 anycast 的监听地址上收到的 *CANCEL* 消息应被自动处理，还是应进入 OpenSIPS 脚本。如果启用该参数（默认），在 anycast 监听地址上收到的 *CANCEL* 消息将永不进入脚本，从而使脚本更干净。


更多细节见 [tm anycast](#anycast-scenario) 一节。


*默认值为 yes（启用）。*


```opensips title="Set the cluster_auto_cancel parameter"
...
# 禁用自动 CANCEL 处理
modparam("tm", "cluster_auto_cancel", no)
...
```


#### local_request_route (string)


该参数指向一个路由，每当 TM 即将发送本地生成的请求时（例如通过 B2B 模块或通过 MI）就会执行该路由。


该路由的用途仅限于以 SIP 消息的形式暴露请求的内容。


该路由由 TM 使用生成的消息执行，并已包含所有修改。


> [!IMPORTANT]
> 该路由在 local_route（如果已定义）之后执行，并会暴露来自该路由的所有改动。


> [!IMPORTANT]
> 该路由应以只读方式使用，仅用于检视。你在此处做的任何改动都会被丢弃。


> [!IMPORTANT]
> 该路由不提供任何消息、事务或对话上下文，因此不要依赖任何有作用域的变量（如 AVP）。


```opensips title="Set the local_request_route parameter"
...
# 在发送请求时执行路由 "local_request_route"
modparam("tm", "local_request_route", "tm_local_request")

route[tm_local_request] {
	if (is_method("INVITE") && $rb(application/sdp) && !has_totag()) {
		$avp(sdp_request) := $rb(application/sdp);
	}
}
...
```


#### local_reply_route (string)


该参数指向一个路由，每当 TM 即将发送本地生成的应答时（例如通过 B2B 模块或通过 MI）就会执行该路由。


该路由的用途仅限于以 SIP 消息的形式暴露应答的内容。


> [!IMPORTANT]
> 该路由应以只读方式使用，仅用于检视。你在此处做的任何改动都会被丢弃。


> [!IMPORTANT]
> 该路由不提供任何消息、事务或对话上下文，因此不要依赖任何有作用域的变量（如 AVP）。


```opensips title="Set the local_reply_route parameter"
...
# 在发送应答时执行路由 "tm_local_reply"
modparam("tm", "local_reply_route", "tm_local_reply")

route[tm_local_reply] {
	if (is_method("BYE")) {
		$var(rc) = rest_get("http://localhost/qos/delete",
					$var(recv_body), $var(recv_ct), $var(rcode));
	}
}

...
```


### 导出的函数 {#exported-functions}


#### t_relay([flags],[outbound_proxy]) {#t_relayflagsoutbound_proxy}


以有状态方式把消息转发到当前 URI 所指示的目的地。（如果原始 URI 已被 UsrLoc、RR、strip/prefix 等改写，则使用新的 URI）。失败时返回负值——你可能仍希望以无状态方式向上游发送否定应答，以免让上游 UAC 陷入困境。


对应的事务可能已经创建，也可能尚未创建。若尚未创建，函数会自动创建它。


该函数可接受两个可选参数。


第一个参数是以逗号分隔的字符串标志位列表，用于控制内部行为。支持的标志位有：


- *no-auto-477* -（旧的 *0x02* 标志位）在发生全局转发失败（即每个分支的转发都因内部错误、错误的 R-URI、错误的消息、网络不可达等原因而失败）时，不在内部生成并发送 "477 Send failed (477/TM)" SIP 应答。

	该标志位仅当事务此前未由 [t_newtran()](#t_newtran) 创建时适用。发生全局转发失败时，不会转发任何 SIP 请求，因此即使设置了 failure_route，也不会有否定 SIP 应答或超时出现在 failure_route 上。当你希望为「当前创建的所有分支都无法转发」实现故障切换逻辑时，这很有用。
- *no-dns-failover* -（旧的 *0x04* 标志位）为该事务禁用 DNS 故障切换。只使用第一个 IP。它同时禁用传输层和事务层的故障切换。
- *pass-reason-hdr* -（旧的 *0x08* 标志位）如果请求是 CANCEL，则信任并继续传递所收到 CANCEL 中的 Reason 头域——简言之，会传播 Reason 头域。
- *allow-no-cancel* -（旧的 *0x10* 标志位）允许 OpenSIPS 检查并遵循 Content-Disposition 的 "no-cancel" 指示（如果存在）。按照 RFC3841 第 9.1 节，可以指示 TM 模块在收到 2xx 应答时不要取消所有正在进行的分支。它会让尚未完成的分支继续进行，直到 (1) 所有分支都收到最终应答，或 (2) 事务命中超时。


第二个参数是一个字符串，表示消息应发往的出站代理（固定目的地）。目的地以 "[proto:]host[:port]" 形式指定。如果在调用该函数之前已为该消息设置了目的地 URI "$du"，则使用该值作为目的地，而不是函数参数。


出错时，函数返回以下值：


- *-1* - 一般性内部错误
- *-2* - 消息错误（解析错误）
- *-3* - 无可用目的地（未添加分支或请求已被取消）
- *-4* - 目的地错误（地址无法解析）
- *-5* - 目的地被过滤（在黑名单中）
- *-6* - 一般性发送失败


该函数可在 REQUEST_ROUTE、FAILURE_ROUTE 中使用。


```opensips title="t_relay usage"
...
if (!t_relay()) {
    sl_reply_error();
    exit;
}
...
t_relay( ,"tcp:192.168.1.10:5060");
...
t_relay(0x1, "mydomain.com:5070");
...
```


#### t_reply(code, reason_phrase)


向当前处理的请求发送有状态 SIP 应答。注意，如果事务尚未创建，会通过内部调用 `t_newtran` 函数自动创建。


参数含义如下：


- *code (int)* - 应答码数字。
- *reason_phrase (string)* - 原因短语字符串。


该函数可在 REQUEST_ROUTE、FAILURE_ROUTE 中使用。


```opensips title="t_reply usage"
...
t_reply(404, "Use $rU not found");
...
```


#### t_reply_with_body(code, reason_phrase, body)


向当前处理的请求发送带消息体的有状态 SIP 应答。注意，如果事务尚未创建，会通过内部调用 `t_newtran` 函数自动创建。


参数含义如下：


- *code (int)* - 应答码数字。
- *reason_phrase (string)* - 原因短语字符串。
- *body (string)* - 应答消息体。


该函数可在 REQUEST_ROUTE 和 FAILURE_ROUTE 中使用。


```opensips title="t_reply_with_body usage"
...
	if(is_method("INVITE"))
	{
		append_to_reply("Contact: $var(contact)\r\n"
				"Content-Type: application/sdp\r\n");
		t_reply_with_body(200, "Ok", $var(body));
		exit;
	}
...
```


#### t_newtran() {#t_newtran}


为当前处理的 SIP 请求创建 SIP 事务，从而切换到有状态处理。对于 INVITE 请求，会立即发送 100 Trying 应答，除非禁用了 [auto_100trying](#auto_100trying-integer)。一旦创建了 SIP 事务，对重传请求再次调用 [t_newtran()](#t_newtran) 将结束 OpenSIPS 脚本执行，并把最后发送的应答向上游重传。


该函数可在 REQUEST_ROUTE 中使用。


```opensips title="t_newtran usage"
...
t_newtran();  # 此处发出 100 Trying
xlog("doing my complicated routing logic\n");
....
t_relay(); # 把呼叫继续发下去
...
```


#### t_check_trans()


如果当前请求关联到某个事务，则返回 true。请求与事务之间的关系定义如下：


- *非 CANCEL/非 ACK 请求* - 如果该请求属于某个事务（即它是重传），函数会对该重传做标准处理并中断/停止脚本。如果请求不是重传，函数返回 false。
- *CANCEL 请求* - 如果被取消的 INVITE 事务存在，则返回 true。
- *ACK 请求* - 如果该 ACK 是逐跳 ACK（对应否定应答）、且对应之前的 INVITE 事务，则返回 true。[!IMPORTANT] 对于端到端 ACK（对应来自不同事务的 2xx 应答），该函数返回 false（返回码 *-2*）。


> [!NOTE]
> 要使用该函数检测重传，必须确保初始请求已经创建了事务，例如通过 t_relay()。如果请求处理可能耗时较长（例如数据库查询），而重传在调用 t_relay() 之前就到达，你可以使用 t_newtran() 函数手动创建事务。


该函数可在 REQUEST_ROUTE 和 BRANCH_ROUTE 中使用。


```opensips title="t_check_trans usage"
...
if ( is_method("CANCEL") ) {
	if ( t_check_trans() )
		t_relay();
	exit;
}
...
```


#### t_check_status(re)


如果正则表达式 "re" 与响应消息的应答码匹配，则返回 true，具体如下：


- *在路由块中* - 最后发送的应答的码。
- *在 on_reply 块中* - 当前收到的应答的码。
- *在 on_failure 块中* - 选定的否定最终应答的码。


该函数可在 REQUEST_ROUTE、ONREPLY_ROUTE、FAILURE_ROUTE 和 BRANCH_ROUTE 中使用。


```opensips title="t_check_status usage"
...
if (t_check_status("(487)|(408)")) {
    log("487 or 408 negative reply\n");
}
...
```


#### t_local_replied(reply)


如果全部（或最后一个，取决于参数）应答都是本地生成的（而非收到的），则返回 true。


参数可以是 "all" 或 "last"。


该函数可在 REQUEST_ROUTE、BRANCH_ROUTE、FAILURE_ROUTE 和 ONREPLY_ROUTE 中使用。


```opensips title="t_local_replied usage"
...
if (t_local_replied("all")) {
	log ("no reply received\n");
}
...
```


#### t_was_cancelled()


如果对某个 INVITE 事务调用，且该事务已被 UAC 侧通过 CANCEL 请求显式取消，则返回 true。


该函数可在 ONREPLY_ROUTE、FAILURE_ROUTE 中使用。


```opensips title="t_was_cancelled usage"
...
if (t_was_cancelled()) {
    log("transaction was cancelled by UAC\n");
}
...
```


#### t_cancel_branch([flags])


当收到应答时，应调用该函数来取消当前呼叫的一组分支（见 flags）。


参数含义如下：


- *flags (string, optional)* - 一组标志位（基于字符的标志位），用于控制要取消哪些分支：

  - *a* - all - 取消所有挂起的分支
  - *o* - others - 取消除当前分支之外的所有其他挂起分支
  - *empty* - current - 只取消当前分支


该函数可在 ONREPLY_ROUTE 中使用。


```opensips title="t_cancel_branch usage"
onreply_route[3] {
...
	if (t_check_status(183)) {
		# 不支持早媒体
		t_cancel_branch();
	}
...
}
```


#### t_new_request( method, RURI, from, to [, body[, ctx]])


该函数生成并以有状态方式发出一个新的 SIP 请求。新请求与当前处理的 SIP 消息完全无关。


参数含义如下（都接受变量）：


- *method (string)* - SIP 方法
- *RURI (string)* - SIP 请求 URI（请求将发往该目的地）
- *from (string)* - SIP From 头域信息，形式为 "[display ]URI"
- *to (string)* - SIP To 头域信息，形式为 "[display ]URI"
- *body (string, optional)* - SIP 消息体内容，以内容类型字符串开头："conten_type body"
- *ctx (string, optional)* - 一个上下文字符串，将作为名为 "uac_ctx" 的 AVP 添加到新事务中（它可能在本地路由中可见）


```opensips title="t_new_request usage"
...
	# 发送一个 MESSAGE 请求
	t_new_request("MESSAGE","sip:alice@192.168.2.2","BOB sip:userB@mydomain.net","ALICE sip:userA@mydomain.net","text/plain Hello Alice!")) {
...
```


#### t_on_failure(failure_route)


设置应答路由块，事务以否定结果完成之后、发送最终应答之前，控制权会传递到该块。在被引用的块中，你可以启动新分支（适合 forward_on_no_reply 之类的服务），也可以自行发送最终应答（例如适合消息存储服务，它从上游收到否定应答却想告诉上游「202 我来处理」）。


由于并非所有函数都能从失败路由中使用，请查阅每个函数的文档以了解权限。任何其他命令都可能导致不可预测的行为，并可能造成服务器故障。


一个请求只能设置一个 failure_route。如果多次使用 t_on_failure()，只有最后一个生效。


注意，每当进入 failure_route 时，RURI 都会被设为胜出分支的值。


参数含义如下：


- *failure_route (string)* - 要调用的应答路由块。


该函数可在 REQUEST_ROUTE、BRANCH_ROUTE、ONREPLY_ROUTE 和 FAILURE_ROUTE 中使用。


```opensips title="t_on_failure usage"
...
route { 
	t_on_failure("1"); 
	t_relay();
} 

failure_route[1] {
	seturi("sip:user@voicemail");
	t_relay();
}
...
```


#### t_on_reply(reply_route)


设置应答路由块，每当收到该事务的应答（临时或最终）时，控制权就传递到该块。该路由不会为本地生成的应答而调用！在被引用的块中，你可以检查应答并对其执行文本操作。


由于并非所有函数都能从这类路由中使用，请查阅每个函数的文档以了解权限。任何其他命令都可能导致不可预测的行为，并可能造成服务器故障。


如果从分支路由调用，应答路由只对当前分支设置——也就是说，只有属于该特定分支的应答才会调用它。当然，从分支路由中，你可以为每个分支设置不同的应答路由。


当从非分支路由调用时，应答路由会为当前事务全局设置——属于该事务的所有应答都会调用它。注意，一个事务只能设置 *一个* onreply_route。如果多次使用 t_on_reply()，只有最后一个生效。


如果处理的应答是临时应答（1xx 代码），调用 drop() 函数（由核心导出）将结束该路由的执行，该应答不会再被转发。


参数含义如下：


- *reply_route (string)* - 要调用的应答路由块。


该函数可在 REQUEST_ROUTE、BRANCH_ROUTE、ONREPLY_ROUTE 和 FAILURE_ROUTE 中使用。


```opensips title="t_on_reply usage"
...
route {
	seturi("sip:bob@opensips.org");  # 第一个分支
	append_branch("sip:alice@opensips.org"); # 第二个分支

	t_on_reply("global"); # "global" 应答路由
	                      # 为整个事务设置
	t_on_branch("1");

	t_relay();
}

branch_route[1] {
	if ($rU=="alice")
		t_on_reply("alice"); # "alice" 应答路由
		                      # 只为第二个分支设置
}

onreply_route[alice] {
	xlog("received reply from alice\n");
}

onreply_route[global] {
	if (t_check_status("1[0-9][0-9]")) {
		setflag(LOG_FLAG);
		log("provisional reply received\n");
		if (t_check_status("183"))
			drop;
	}
}
...
```


#### t_on_branch(branch_route) {#t_on_branchbranch_route}


设置分支路由，在事务的每个分支发出之前分别执行——该路由中的改动应只反映到那个分支上。


由于并非所有函数都能从这类路由中使用，请查阅每个函数的文档以了解权限。任何其他命令都可能导致不可预测的行为，并可能造成服务器故障。


一个请求只能设置一个 branch_route。如果多次使用 t_on_branch()，只有最后一个生效。


调用 drop() 函数（由核心导出）将结束分支路由的执行，该分支不会再被转发。


参数含义如下：


- *branch_route (string)* - 要调用的分支路由块。


该函数可在 REQUEST_ROUTE、BRANCH_ROUTE、ONREPLY_ROUTE 和 FAILURE_ROUTE 中使用。


```opensips title="t_on_branch usage"
...
route { 
	t_on_branch("1"); 
	t_relay();
} 

branch_route[1] {
	if ($ru=~"bad_uri") {
		xlog("dropping branch $ru \n");
		drop;
	}
	if ($ru=~"GW_uri") {
		append_rpid();
	}
}
...
```


#### t_inject_branches(source[,flags]) {#t_inject_branchessourceflags}


该函数向已存在的事务添加新的 SIP 分支（目的地）并触发它们（发送出去）。该事务可能已有正在进行的分支（例如处于振铃状态），这些分支不会受注入新分支的影响。同样，在注入时刻事务也可能没有任何进行中的分支（不过事务仍必须等待新分支，即使现有分支都已完成——为此见 [t_wait_for_new_branches()](#t_wait_for_new_branchesbranches) 函数）。


该函数的主要使用场景（这也是它与 [t_relay()](#t_relayflagsoutbound_proxy) 的不同之处）是能够从事务无关的脚本路由（如定时器路由、事件路由、通知路由等）向正在进行的事务添加新分支。在这类路由中，注入之前使用的其他函数/模块会指向将被本次注入影响的事务——见 *event_routing* 模块。


参数：


- *source (string)* - 从哪里获取要注入的新分支的描述。可以是：
	- *event* - 分支将从事件通知路由中暴露的事件属性获取（见 *event_routing* 模块）。
	- *msg* - 分支将从 SIP 消息的 RURI 以及附加分支（由 append_branch() 函数或类似方式创建）中获取。
- *flags (string, optional)* - 与注入过程相关的一些附加标志位：
	- *cancel* 或 *c* - 在注入新分支之前取消事务中所有正在进行的现有分支。
	- *l* (last) - 这是该事务上最后一个注入的分支，不再等待任何其他分支注入。


```opensips title="t_inject_branches usage"
...
route[event_notification] {
	t_inject_branches("event");
}
...
```


#### t_wait_for_new_branches([branches]) {#t_wait_for_new_branchesbranches}


该函数指示已存在的 SIP 事务在现有分支完成之后仍等待新分支注入。这种等待会持续到该事务的最终应答 INVITE 定时器（fr_inv_timeout）到时，或直到注入的分支数达到最大值（见参数）；当然，如果事务从某个分支收到 2xx 最终应答，等待也会终止。


通常，如果你有一个含两个分支的事务，它们分别收到（比如说）404 和 486 应答，这些分支完成后事务会通过向主叫发送 404 应答而终止。不过，如果你在转发事务之前执行 *t_wait_for_new_branches*，事务在分支完成后不会终止，也不会向主叫发送 404
		- 它会等待新分支注入（见 [t_inject_branches()](#t_inject_branchessourceflags) 函数），直到 fr_inv 定时器到时。


参数：


- *branches (integer, optional)* - 最多等待多少个分支。


```opensips title="t_wait_for_new_branches usage"
...
t_newtran();
t_wait_for_new_branches();
t_relay();
...
```


#### t_wait_no_more_branches()


该函数指示已存在的 SIP 事务停止等待任何新的分支注入。该函数应用于正通过 [t_wait_for_new_branches()](#t_wait_for_new_branchesbranches) 函数等待动态分支的事务。


使用场景：你的事务正在等待动态新分支（例如推送通知的结果）。到某个时刻，某个正在进行的分支收到最终应答——该分支失败这一事实就转化为停止等待更多分支（这是一个示例，说明如何根据从各种设备（固话或移动）得到的应答，决定还要等多久才等更多分支）。


```opensips title="t_wait_no_more_branches usage"
...
t_wait_no_more_branches();
...
```


#### t_add_hdrs("sip_hdrs")


向已存在的事务附加一组头域——这些头域会被追加到该事务相关的所有请求上（出站分支、本地 ACK、CANCEL）。


参数：


- *sip_hdrs (string)*


```opensips title="t_add_hdrs usage"
...
t_add_hdrs("X-origin: 1.1.1.1\r\n");
...
```


#### t_add_cancel_reason("Reason_hdr")


该函数用于从脚本层面强制为 CANCEL 请求加入自定义的 "Reason" 头域。通常 Reason 头域继承自收到的 CANCEL（注意 CANCEL 以逐跳方式传播——每一跳都会重新生成），但该函数可以覆盖它。它必须在转发 CANCEL 请求之前调用，且输入必须是完全格式化的 Reason 头域，包含名称、消息体和 CRLF。


参数：


- *reason_hdr (string)*


```opensips title="t_add_cancel_reason usage"
...
t_add_cancel_reason("Reason: SIP ;cause=200 ;text=\"Call completed elsewhere\"\r\n");
t_relay();
...
```


#### t_replicate(URI,[flags])


把请求复制到另一个目的地。复制请求的任何信息（如应答码）都不会转发给原始 SIP UAC。


目的地由 SIP URI 指定。如果要使用多个目的地，必须以分支的形式设置附加的 SIP URI。


参数：


- *uri (string)*
- *flags (string, optional)* - 一组用于控制内部行为的标志位——说明见上面的 "t_relay([flags])" 函数。注意这里只有 *no-dns-failover* 适用。


该函数可在 REQUEST_ROUTE 中使用。


```opensips title="t_replicate usage"
...
t_replicate("sip:1.2.3.4:5060");
t_replicate("sip:1.2.3.4:5060;transport=tcp");
t_replicate("sip:1.2.3.4",0x4);
...
```


#### t_write_req(info,fifo) t_write_unix(info,sock)


通过 FIFO 文件或 UNIX 套接字写入大量关于该请求的信息。写入哪些信息可通过 "tw_append" 参数控制。


参数：


- *info (string)*
- *path (string)*


该函数可在 REQUEST_ROUTE、FAILURE_ROUTE 和 BRANCH_ROUTE 中使用。


```opensips title="t_write_req/unix usage"
...
modparam("tm","tw_append","append1:Email=$avp(email);UA=$ua")
modparam("tm","tw_append","append2:body=$rb")
...
t_write_req("voicemail/append1","/tmp/appx_fifo");
...
t_write_unix("logger/append2","/var/run/logger.sock");
...
```


#### t_flush_flags()


把当前请求的标志位刷新到已创建的事务中。它只在路由块中有意义，即当事务是通过 t_newtran() 创建、且此后标志位被改动过。


该函数可在 REQUEST_ROUTE 和 BRANCH_ROUTE 中使用。


```opensips title="t_flush_flags usage"
...
t_flush_flags();
...
```


#### t_anycast_replicate() {#t_anycast_replicate}


该函数在 anycast 配置中用于复制找不到本地事务的 *CANCEL* 或 *ACK* 方法。该函数会把消息广播给集群中所有其他节点，但只有事务的「拥有者」能够处理它。


```opensips title="t_anycast_replicate usage"
...
if (is_method("ACK|CANCEL") && !t_check_trans()) {
	t_anycast_replicate();
	exit;
}
...
```


#### t_reply_by_callid(code, reason_phrase, [callid], [cseq])


该函数用于向已存在的 INVITE 事务发送应答。常见用例是 OpenSIPS 作为 UAS：收到 INVITE 后，通过回复 "t_reply(180, "Ringing")" 或 "t_reply(183, "Session Progress")" 把它在 OpenSIPS 本地「停放」，随后需要处理它的 CANCEL 或 BYE，并向原始 INVITE 事务发送 '487 Request Terminated'。


用于标识事务的 callid 和 cseq 将从当前正在处理的消息中获取。但它们也可以显式传入，例如这样我们就能处理 BYE，其中 cseq 必须是 INVITE 的 cseq 减一。


该函数可在 REQUEST_ROUTE 中使用。


```opensips title="t_reply_by_callid usage"
...
route{
	if($rU == "LOCAL_PARK") {
		if(is_method("INVITE")) {
			$T_fr_timeout = 10;
			$T_fr_inv_timeout = 10;
			append_to_reply("Contact: sip:LOCAL_PARK@$socket_in(ip):$socket_in(port)\r\n");
			t_reply(180, "Ringing");
			t_wait_for_new_branches();
		} else if(is_method("CANCEL")) {
			if(!t_reply_by_callid(487, "Request Terminated")) {
				sl_send_reply(481, "Call Leg/Transaction Does Not Exist");
			} else {
				sl_send_reply(200, "OK");
			}
		} else if(is_method("BYE")) {
			$var(prev_cseq) = ($(cs{s.int}) - 1);
			if(!t_reply_by_callid(487, "Request Terminated", , $var(prev_cseq))) {
				sl_send_reply(481, "Call Leg/Transaction Does Not Exist");
			} else {
				sl_send_reply(200, "OK");
			}
		} else if(is_method("ACK")) {
			t_relay();
		}
		exit;
	}
}
...
```


#### t_get_branch_idx_by_attr(attr, [val_str], [val_int], [result_var], [offset])


该函数可用于查找当前事务另一个分支的索引。查找基于按分支属性——至少需要提供属性的名称。可选地，你可以为用于查找的属性提供一个值（字符串或整型）。作为输入，函数可以接受一个可选的分支偏移量（绝对值，覆盖事务的所有分支），作为查找的起始位置。


如果找到（具有给定属性名称和值的）分支，函数返回 true。分支的状态（例如正在进行、已完成）无关紧要。如果找到，"result_var" 变量会被填充为分支索引（整型）。


该函数可在 ONREPLY_ROUTE、BRANCH_ROUTE 和 FAILURE_ROUTE 中使用。


```opensips title="t_get_branch_idx_by_attr usage"
...
	# 查找具有 "name" 属性的分支
	# 其字符串值为 "pstn"
	if (t_get_branch_idx_by_attr("name", "pstn", , $var(idx))) {
		xlog("found branch has index $var(idx)\n");
	}
...
```


### 导出的伪变量 {#exported-pseudo-variables}


导出的变量列在以下各节中。


#### $T_branch_idx


*$T_branch_idx* - 当前正在处理的分支索引（第一个分支从 0 开始）。该索引只在 BRANCH 和 REPLY 路由中（此处按分支处理）以及 FAILURE 路由中（此处它指向事务上最后一个最终应答所在的分支）有意义。在所有其他类型的路由中，该索引的值为 NULL。


#### $T_reply_code


*$T_reply_code* - 应答的码，具体如下：在 request_route 中将是最后发送的有状态应答；在 reply_route 中将是当前处理的应答；在 failure_route 中将是胜出的否定应答。若无应答或出错，返回 '0' 值。


#### $T_fr_timeout


*$T_fr_timeout (R/W)* - 当前事务最终应答的超时。


每收到一个不同的请求，*$T_fr_timeout* 初始时都等于 **[fr_timeout](#fr_timeout-integer)** 参数。


*"$T_fr_timeout = NULL;"* 会把它重置为 **[fr_timeout](#fr_timeout-integer)**。


#### $T_fr_inv_timeout


*$T_fr_inv_timeout (R/W)* - 收到 1XX 应答之后，INVITE 请求最终应答的超时。该变量也可以在 onreply_route 中设置（例如在 180 Ringing 时、100 Trying 之后），并且仍然生效。


每收到一个不同的请求，*$T_fr_inv_timeout* 初始时都等于 **[fr_inv_timeout](#fr_inv_timeout-integer)** 参数。


*"$T_fr_inv_timeout = NULL;"* 会把它重置为 **[fr_inv_timeout](#fr_inv_timeout-integer)**。


#### $T_ruri


*$T_ruri* - 当前分支的 ruri；该信息取自事务结构，因此你可以为任何具备事务的 sip 消息（请求/应答）访问该信息。


#### $bavp(name)


*$bavp(name)* - 一种特殊类型的 avp，可以为每个分支取不同的值。它们只能在 BRANCH、REPLY 和 FAILURE 路由中使用。否则返回 NULL 值。


#### $T_id


*$T_id* - 返回当前事务的 ID。ID 是一个不透明的十六进制字符串，每个事务唯一。如果没有当前事务，则返回 NULL 值。


#### $T_branch_last_reply_code


*$T_branch_last_reply_code* - 返回为作为参数指定的分支收到的最后一个应答码。如果未指定参数，则获取当前分支的最后一个应答。


#### $tm.branch.uri[] {#tmbranchuri}


*$tm.branch.uri* - 对 TM 已存在分支的 Request URI 提供只读访问（作为字符串）。分支的状态（已完成、正在进行等）无关紧要。


TM（UAC 侧）分支是在请求通过 "t_relay()" 或 "t_inject()" 发送到新目的地时创建的。


分支索引从 0 开始，可访问事务的所有分支（过去的和活动的）。不过，索引支持两个可选后缀，以简化脚本编写：


- */active* - 索引同样从 0 开始，但相对于最后一组分支——即上一次 "t_relay()" 所创建的并行分支。
- */all* - 与「无后缀」情形类似，表示绝对索引，覆盖事务的所有分支（即对该事务执行的所有 "t_relay()" 所产生的结果）。


如果未指定索引，则使用当前分支。这取决于脚本上下文。例如在应答路由中，当前分支是应答所来自的分支；在分支路由中，当前分支是即将发出的分支；在失败路由中，当前分支是胜出分支。


> [!NOTE]
> 不支持索引 ALL（"*"）。

> [!NOTE]
> 在分支路由中，只有 "$tm.branch.attr" 和 
> "$tm.branch.flag" 变量对当前分支有效 
> （其他与分支相关的变量将返回 NULL）。

> [!NOTE]
> 接受负值，表示从末尾索引（-1 是最新/最大的分支）。


该变量可在 BRANCH、ONREPLY 和 FAILURE 路由中使用。


#### $tm.branch.duri[]


*$tm.branch.duri* - 与 **[$tm.branch.uri[]](#tmbranchuri)** 完全类似，但返回分支的 Destination-URI 值。


#### $tm.branch.path[]


*$tm.branch.path* - 与 **[$tm.branch.uri[]](#tmbranchuri)** 完全类似，但返回分支的 PATH 值。


#### $tm.branch.q[]


*$tm.branch.q* - 与 **[$tm.branch.uri[]](#tmbranchuri)** 完全类似，但返回分支的 Q 值。


#### $tm.branch.flags[]


*$tm.branch.flags* - 与 **[$tm.branch.uri[]](#tmbranchuri)** 完全类似，但返回为该分支设置的按分支标志位列表（逗号分隔）。


#### $tm.branch.socket[]


*$tm.branch.socket* - 与 **[$tm.branch.uri[]](#tmbranchuri)** 完全类似，但返回用于把该分支发出去所使用的套接字描述（proto:ip:port）。


#### $tm.branch.flag()[]


*$tm.branch.flag(name)* - 与 **[$tm.branch.uri[]](#tmbranchuri)** 类似，但对单个分支标志位（按名称）提供读写访问。


可接受的值为 0 表示 FALSE，正的非零值表示 TRUE。返回值为 0 表示 FALSE，1 表示 TRUE。


此处操作的标志位与你可以通过 "[re]setbflag()" 函数操作的 bflags 相同。


#### $tm.branch.attr()[]


*$tm.branch.attr(name)* - 与 **[$tm.branch.uri[]](#tmbranchuri)** 类似，但对附加到分支上的属性提供读写访问。


属性的名称可以是任意的（无需预定义），并且（同一时刻）只能有一个值，字符串或整型。


#### $tm.branch.last_received[]


*$tm.branch.last_received* - 与 **[$tm.branch.uri[]](#tmbranchuri)** 完全类似，但返回该分支上从网络收到的最后一个应答的应答码。如果至今未收到任何应答，则返回 NULL。


#### $tm.branch.type[]


*$tm.branch.type* - 与 **[$tm.branch.uri[]](#tmbranchuri)** 完全类似，但返回当前分支的类型。如果不是真实分支（无 SIP 信令，用于等待分支注入），可能是 "phone"；或者是 "sip"（真实的信令分支）。


### 导出的 MI 函数 {#exported-mi-functions}


#### t_uac_dlg


生成并发送一个本地 SIP 请求。


参数：


- *method* - 请求方法
- *ruri* - 请求 SIP URI
- *headers* - 要添加到请求中的附加头域集合；至少必须指定 
"From" 和 "To" 头域
- *next_hop*（可选）- 下一跳 SIP URI（OBP）。
- *socket*（可选）- 用于发送请求的本地套接字。
- *body*（可选）- 请求消息体（如存在，需要 
"Content-Type" 和 "Content-length"
头域）


MI FIFO 命令格式：


```bash
opensips-cli -x mi t_uac_dlg method=INVITE ruri="sip:alice@127.0.0.1:7050" headers="From: sip:bobster@127.0.0.1:1337\r\nTo: sip:alice@127.0.0.1:7050\r\nContact: sip:bobster@127.0.0.1:1337\r\n"
```


#### t_uac_cancel


为已存在的 SIP 请求生成并发送 CANCEL。


参数：


- *callid* - 要取消的 INVITE 请求的 callid。
- *cseq* - 要取消的 INVITE 请求的 cseq。


MI FIFO 命令格式：


```bash
opensips-cli -x mi t_uac_cancel "1-23454@127.0.0.1" "1 INVITE"
```


#### t_hash


获取 TM 内部哈希表负载的信息。


参数：


- *none*


MI FIFO 命令格式：


```bash
opensips-cli -x mi t_hash
```


#### t_reply


为已存在的入站 SIP 事务生成并发送应答。


参数：


- *code* - 应答码
- *reason* - 原因短语。
- *trans_id* - 事务标识符
（格式为 hash_entry:label）
- *to_tag* - 添加到 TO 头域的 To tag
- *new_headers*（可选）- 要追加到应答的额外头域。
- *body* -（可选）应答消息体（如存在，需要 
"Content-Type" 和 "Content-length"
头域）


MI FIFO 命令格式：


```bash
opensips-cli -x mi t_reply 403 Forbidden 46961:1279687637 abcde .
```


### 导出的统计 {#exported-statistics}


导出的统计列在以下各节中。除 "inuse_transactions" 外，所有统计都可以重置。


#### received_replies


TM 模块收到的应答总数。


#### relayed_replies


TM 模块收到并转发的应答总数。


#### local_replies


TM 模块本地生成的应答总数。


#### UAS_transactions


由收到的请求创建的事务总数。


#### UAC_transactions


由本地生成的请求创建的事务总数。


#### 2xx_transactions


以 2xx 应答完成的事务总数。


#### 3xx_transactions


以 3xx 应答完成的事务总数。


#### 4xx_transactions


以 4xx 应答完成的事务总数。


#### 5xx_transactions


以 5xx 应答完成的事务总数。


#### 6xx_transactions


以 6xx 应答完成的事务总数。


#### inuse_transactions


当前时刻内存中存在的事务数。


#### retransmission_req_T1_1


因 T1 1 定时器（第一个重传间隔，典型为 500ms）而发生的请求重传次数。


#### retransmission_req_T1_2


因 T1 2 定时器（第二个重传间隔，典型为 1s）而发生的请求重传次数。


#### retransmission_req_T1_3


因 T1 3 定时器（第三个重传间隔，典型为 2s）而发生的请求重传次数。


#### retransmission_req_T2


因 T2（最后一个重传间隔，典型为 4s）而发生的请求重传次数。


#### retransmission_rpl_T2


应答重传次数，全部使用相同的重传间隔 T2，典型为 4s。


#### timeout_finalresponse


B 侧未收到任何类型的应答（连临时应答也没有）的事务超时次数。此类超时表明存在通信/可达性问题。注意：由于分叉，单个事务可能会计入多次此类超时。


#### timeout_finalresponse


B 侧未收到最终应答（可能收到临时应答）的 INVITE 事务超时次数。此类超时表明「无应答」事件，并非信令问题。注意：由于分叉，单个事务可能会计入多次此类超时。


## 开发者指南 {#developer-guide}


### 函数 {#functions}


#### load_tm(*import_structure)


仅供程序化使用——导入 TM API。参见 cpl_c、acc 或 jabber 模块以了解其工作方式。


参数含义如下：


- *import_structure* - 指向导入结构的指针 - 见 
modules/tm/tm_load.h 中的 "struct tm_binds"


## 常见问题 {#frequently-asked-questions}


**Q: 旧的 cancel_call() 函数怎么了**


该函数的功能已被 cancel_branch("a") 取代——取消所有分支。


**Q: 我如何报告 bug？**


请遵循以下地址提供的指南：
[https://github.com/OpenSIPS/opensips/issues](https://github.com/OpenSIPS/opensips/issues)。
<!-- CONTRIBUTORS -->

### 许可证 {#license}

所有文档文件（即扩展名为 .md 的文件）均按 Creative Common License 4.0 授权
