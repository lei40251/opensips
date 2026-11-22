---
title: "drouting 模块"
description: "动态路由（Dynamic Routing）是一个基于多种条件为特定呼叫选择最佳网关/目的地以完成投递的模块。"
sidebar: false
---


## 管理员指南 {#admin-guide}


### 概述 {#overview}


#### 简介 {#introduction}


动态路由（Dynamic Routing）是一个模块，它基于多种条件为特定呼叫选择
要用于投递的最佳网关/目的地。最低成本路由（Least Cost Routing，LCR）是
动态路由的一种特例 —— 规则基于成本排序。动态路由在路由规则选择方面
带来了许多特性：


- 基于前缀
- 基于主叫/组
- 基于时间
- 基于优先级


，以及处理：


- 剥离与前缀添加
- 默认规则
- 入站与出站处理
- 触发脚本路由


以及失败处理：


- 串行分叉
- 基于权重的网关选择
- 随机网关选择
- 网关崩溃探测


#### 特性 {#features}


OpenSIPS 的动态路由实现设计具有以下特性：


- 路由信息（目的地、运营商、规则、组）存储在数据库中，并在启动时
加载到内存；运行时可通管理接口命令重新加载。
- 基于权重或随机地选择目的地（从规则或从运营商中），
网关故障检测（切换到下一个可用网关）。
- 能够以极小的速度/时间与内存消耗开销处理大量路由信息
（1000 万条规则）
- 脚本集成 —— 函数中支持伪变量；规则匹配时触发脚本路由
- 双向行为 —— 入站与出站处理（向目的地/网关发送与从目的地/网关接收时
进行剥离与前缀添加）
- 黑名单 —— 模块允许基于目的地 IP 定义黑名单。这些黑名单用于在脚本逻辑执行
非地理（non-GE）转发（如外部域）时，防止向网关的恶意转发（基于 DNS 查询）。
- 从多个数据库加载路由信息 —— 网关、规则、组和运营商可按分区进行分组，
每个分区可从不同的数据库/表加载。这使路由过程基于分区。要使用某个分区中的表，
其名称必须能在该分区 db_url 所定义数据库的 "version" 表中找到。


#### 性能 {#performance}


围绕模块在处理大量路由规则时的性能，进行过多次测试。


测试使用 383000 条规则集，测量了：


- 从数据库加载的时间
- 使用的共享内存


加载时间在 4 秒到 8 秒之间变化，取决于数据库客户端的缓存 —— 首次加载
最慢（因为数据库查询需要访问磁盘驱动器）；后续加载更快，因为数据已
缓存在数据库客户端中。因此严格来说，加载时间（不含与数据库类型相关的
查询时间）约为 4 秒


将数据加载到共享内存后，约 96M 内存专门用于 DR 数据。


#### 动态路由概念 {#dynamic-routing-concepts}


DR 引擎使用若干概念来定义应如何进行路由
（描述目的地与路由规则之间的所有依赖关系）。


##### 目的地/网关 {#destinationgateways}


这些是路由之后流量实际需要发送到的最终 SIP 实体。它们存储在名为
"dr_gateways" 的表中。网关地址存储在单独的表中，因为需要独立于动态
路由处理来访问它们（例如，在执行其他操作前后（向网关接收/中继）添加/
移除网关 PRI 前缀）。


在 DR 中，网关由以下内容定义：


- id（字符串）
- SIP 地址（SIP URI）
- 类型（整型，允许按用途对网关分组，例如入站、出站等）
- 从被叫号码中剥离的值（位数）
- 要添加到被叫号码的前缀（字符串）
- 属性（DR 引擎不使用，仅在路由到该网关时推送到脚本层）
- 探测模式（应如何在 SIP 层探测该 GW —— 参见探测章节）


网关可通过路由规则或运营商定义使用。它们始终以其 ID 被引用。


##### 运营商 {#carriers}


如果你需要将网关分组，以便更好地控制 DR 规则如何使用这些网关
（例如网关的使用顺序），则可使用运营商概念。


基本上，运营商是一组网关，它有自己的排序算法和自己的属性字符串。
默认情况下，它们定义在 "dr_carriers" 表中。


在 DR 中，运营商由以下内容定义：


- id（字符串）
- 带权重或不带权重的网关列表（字符串）
（例如："gw1=10,gw4=10" 或 "gw1,gw2"
- flags：0x1 - 仅使用运营商中的第一个网关
（取决于排序）；0x2 - 禁用该运营商的使用
- 排序算法：在使用之前应如何对网关列表排序，
NULL - 使用数据库给定的顺序，W - 进行基于权重的重排序，Q - 进行基于质量的排序
（需要 qrouting 模块）
- 属性（DR 引擎不使用，仅在路由到该运营商时推送到脚本层）


运营商只能从路由规则定义中使用。
它们始终以其 ID 被引用。


##### 路由规则 {#routing-rules}


这些是控制路由的实际规则。使用不同的条件（前缀、时间、优先级等），
它们将决定呼叫被发送到哪些网关。


存储规则定义的表默认名称为 "dr_rules"。


在 DR 中，路由规则由以下内容定义：


- group（数字列表）—— 规则可以分组（一条规则可同时
属于多个组），并且在某一时刻你可以仅使用某个特定的组；例如在不同
情况下使用 "premium" 或 "standard" 或 "interstate" 或
"intrastate" 组规则
- prefix（仅含数字的字符串）—— 用于匹配该规则的前缀
（最长前缀匹配）
- 时间有效期（时间重复字符串）—— 从时间角度该规则何时有效
（参见 RFC 2445）
- priority（数字）—— 规则的优先级 —— 值越高，
优先级越高（参见规则选择章节的算法）
- 脚本路由 ID（字符串）—— 若定义，则当该规则匹配时执行具有指定
ID 的路由。也就是说，这是一个可用于对消息执行自定义操作的路由。注意
不会在信令层做任何修改，且你不得在该脚本路由中执行
任何信令操作
- 网关/运营商列表（字符串）—— 以逗号分隔的
网关或运营商（由 ID 定义）列表，用于该规则；运营商 ID 以
"#" 符号为前缀。对于每个 ID（网关或运营商），你可以指定权重。
有关该列表将如何被解释（作为顺序）请参见规则选择章节。列表
示例："gw1,gw4,#cr3" 或 "gw1=10,gw4=10,#cr3=80"
- 属性（DR 引擎不使用，仅在规则匹配并
被使用时推送到脚本层）


关于时间重复的更多说明：


- 一个日期时间表达式，定义当前规则需要匹配的时间重复。
时间重复紧密基于 Internet Calendaring and Scheduling Core Object
Specification（calendar COS，RFC 2445）中的重复时间间隔。
路由规则规范中使用的属性集是时间重复属性的子集。
- 数据库中存储的值基本格式为：

```
	<timezone>|<dtstart>|<dtend>|<duration>|<freq>|<until>|<interval>|<byday>|<bymonthday>|<byyearday>|<byweekno>|<bymonth>
```

，与 *cfgutils* 模块的 [check_time_rec()](/zh/modules/cfgutils#check-time-rec-time-string-timestamp)
函数的输入相同，包括可选地使用逻辑运算符将多个此类字符串
链接为更大的表达式。
- 当未指定某个属性时，只要列表中其后的另一个属性必须
指定，相应位置就必须留空。


#### 路由规则处理 {#routing-rule-processing}


该模块可用于找出用于终结到 PSTN 的新呼叫的最佳网关。选择规则
的算法如下：


- 模块发现发起用户的路由组。如果从脚本中作为参数传入了路由组，
则跳过此步骤。
- 一旦得知组，模块在该组的规则子集中，基于 "prefix"
列查找与目的地匹配的规则。选择具有最长前缀的规则集。如果前缀中
没有数字匹配，则使用默认规则（无前缀的规则）
- 在该规则集内应用时间条件，选出具有最高优先级且匹配时间条件的
规则来驱动路由。
- 找到规则后，它可能包含要执行的路由 ID。如果设置了某个
标志位，则执行完该路由块后停止处理。
- 该规则必须包含网关与运营商链。模块将对链中的每个地址
执行串行分叉（排序或者简单地使用定义顺序，或者可以是基于权重的 —— 必须
启用权重选择）。只有前一个失败时，才使用链中的下一个地址。
- 找到正确的网关地址后，将网关的前缀（PRI）添加到请求 URI，
然后转发请求。


如果没有找到匹配选择条件的规则，则必须采取默认动作
（例如，返回错误应答）。如果链中的网关没有前缀，则请求在不对请求
URI 添加任何前缀的情况下被转发。


#### 探测与禁用目的地 {#probing-and-disabling-destinations}


模块能够通过执行 SIP 探测（发送 OPTIONS 之类的 SIP 请求）来监控
目的地的状态。


对于每个目的地，你可以配置应执行何种探测（probe_mode 列）：


- *(0)* - 完全不探测；
- *(1)* - 仅在目的地处于
禁用模式时探测（通过 MI 命令禁用也会完全停止
探测）。下次探测成功时，目的地将自动
重新启用；
- *(2)* - 始终探测。如果被禁用，
下次探测成功时目的地将自动重新启用；


目的地可以通过两种方式变为禁用：


- 脚本检测
- MI 命令


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


以下模块必须在本模块之前加载：


- *一个数据库模块*。


- *tm 模块*。
- *clusterer* —— 仅当启用 "cluster_id"
选项时。


#### 外部库或应用程序 {#external-libraries-or-applications}


- *无*。


### 导出的参数 {#exported-parameters}


#### db_url(str)


数据库 url。


*默认值为 "NULL"。*


```opensips title="Set db_url parameter"
...
modparam("drouting", "db_url",
	"mysql://opensips:opensipsrw@localhost/opensips")
...
```


#### drd_table(str)


存储网关地址的数据库表的名称。


*默认值为 "dr_gateways"。*


```opensips title="Set drd_table parameter"
...
modparam("drouting", "drd_table", "dr_gateways")
...
```


#### drr_table(str)


存储路由规则的数据库表的名称。


*默认值为 "dr_rules"。*


```opensips title="Set drr_table parameter"
...
modparam("drouting", "drr_table", "rules")
...
```


#### drg_table(str)


存储组的数据库表的名称。


*默认值为 "dr_groups"。*


```opensips title="Set drg_table parameter"
...
modparam("drouting", "drg_table", "groups")
...
```


#### drc_table(str)


存储将被路由规则直接使用的运营商定义的数据库表的名称。


*默认值为 "dr_carriers"。*


```opensips title="Set drc_table parameter"
...
modparam("drouting", "drc_table", "my_dr_carriers")
...
```


#### ruri_avp (str)


用于存储请求 URI 以便稍后使用的 AVP 名称
（当前目的地的备选目的地）。


*若 `use_partitions` 参数为 0，则默认值为 "$avp(___dr_ruri__)"；
若 `use_partitions` 参数为 1，则为 "$avp(___dr_ruri__partition_name)"，其中 partition_name 是
包含该 AVP 的分区名称（从数据库获取）。*


```opensips title="Set ruri_avp parameter"
...
modparam("drouting", "ruri_avp", '$avp(dr_ruri)')
modparam("drouting", "ruri_avp", '$avp(33)')
...
	
```


#### gw_id_avp (str)


用于存储当前所选网关/目的地 ID 的 AVP 名称 —— 一旦选择了
新目的地（通过 use_next_gw() 函数），该 AVP 将更新为新
选择的网关/目的地的 ID。


*若 `use_partitions` 参数为 0，则默认值为 "$avp(___dr_gw_id__)"；
若 `use_partitions` 参数为 1，则为 "$avp(___dr_gw_id__partition_name)"，其中 partition_name 是
包含该 AVP 的分区名称（从数据库获取）。*


```opensips title="Set gw_id_avp parameter"
...
modparam("drouting", "gw_id_avp", '$avp(gw_id)')
modparam("drouting", "gw_id_avp", '$avp(334)')
...
	
```


#### gw_priprefix_avp (str)


用于存储当前所选目的地/网关 PRI 前缀的 AVP 名称 —— 一旦选择了
新目的地（通过 use_next_gw() 函数），该 AVP 将更新为新
使用目的地的 PRI 前缀。


*默认值为 "NULL"。*


```opensips title="Set gw_priprefix_avp parameter"
...
modparam("drouting", "gw_priprefix_avp", '$avp(gw_priprefix)')
...
	
```


#### rule_id_avp (str)


用于存储当前匹配的路由规则 ID 的 AVP 名称
（参见 dr_rules 表）。


*默认值为 "NULL"。*


```opensips title="Set rule_id_avp parameter"
...
modparam("drouting", "rule_id_avp", '$avp(rule_id)')
modparam("drouting", "rule_id_avp", '$avp(335)')
...
	
```


#### rule_prefix_avp (str)


匹配路由规则的实际前缀（RURI 用户名中
匹配路由规则的部分）。


*默认值为 "NULL"。*


```opensips title="Set rule_prefix_avp parameter"
...
modparam("drouting", "rule_prefix_avp", '$avp(dr_prefix)')
...
	
```


#### carrier_id_avp (str)


将用当前 GW 所属运营商的 ID 字符串填充的
AVP。


*默认值为 "NULL"。*


```opensips title="Set carrier_id_avp parameter"
...
modparam("drouting", "carrier_id_avp", '$avp(carrier_id)')
...
	
```


#### gw_sock_avp (str)


用于存储由 ruri_avp 定义的备选目的地的
套接字的 AVP 名称。


*若 `use_partitions` 参数为 0，则默认值为 "$avp(___dr_sock__)"；
若 `use_partitions` 参数为 1，则为 "$avp(___dr_sock__partition_name)"，其中 partition_name 是
包含该 AVP 的分区名称（从数据库获取）。*


```opensips title="Set gw_sock_avp parameter"
...
modparam("drouting", "gw_sock_avp", '$avp(dr_sock)')
modparam("drouting", "gw_sock_avp", '$avp(77)')
...
	
```


#### define_blacklist (str)


基于 GW 类型列表定义黑名单 —— 黑名单将
用具有指定类型的 GW 的 IP（无端口，所有协议）填充。


如果使用分区，请在黑名单定义字符串前加上
分区名称，后跟 ":" 分隔符。


此参数允许多个实例。


*默认值为 "NULL"。*


```opensips title="Set define_blacklist parameter"
...
modparam("drouting", "define_blacklist", 'bl_name= 3,5,25,23')
modparam("drouting", "define_blacklist", 'list= 4,2')
modparam("drouting", "define_blacklist", 'pstn:list2 = 5,6')
modparam("drouting", "define_blacklist", 'pstn:list3 = 7,8')
...
	
```


#### default_group (int)


如果在 GROUP 表中找不到主叫（FROM 用户），
则使用的组。


*默认值为 "NONE"。*


```opensips title="Set default_group parameter"
...
modparam("drouting", "default_group", 4)
...
```


#### force_dns (int)


启动时强制对 GW/目的地名称（如果不是 IP）进行 DNS 解析。
如果未启用，路由期间将盲目使用 GW 名称。


*默认值为 "1（启用）"。*


```opensips title="Set force_dns parameter"
...
modparam("drouting", "force_dns", 0)
...
	
```


#### persistent_state (int)


指定是否应在启动时加载 *state* 列
并在运行时刷新。


*默认值为 "1"（启用）。*


```opensips title="Set the persistent_state parameter"
...
# 禁用对网关状态的所有数据库操作
modparam("drouting", "persistent_state", 0)
...
```


#### no_concurrent_reload (int)


如果启用，模块将不允许并行（重叠）运行多个 dr_reload
MI 命令。当已有重新加载进行中时，任何新的重新加载都将
被拒绝（并丢弃）。


如果你有大型路由集（数百万条规则/前缀），
应考虑禁用并发重新加载，因为它们会耗尽
共享内存（同时将多份路由数据实例重新加载
到内存中）。


*默认值为 "0（禁用）"。*


```opensips title="Set no_concurrent_reload parameter"
...
# 不允许并行的重新加载操作
modparam("drouting", "no_concurrent_reload", 1)
...
```


#### probing_interval (integer)


应以多高的频率（秒）对目的地执行探测。如果
设为 0，则将禁用探测功能（对所有
目的地）


*默认值为 "30"。*


```opensips title="Set probing_interval parameter"
...
modparam("drouting", "probing_interval", 60)
...
```


#### probing_method (string)


用于探测请求的 SIP 方法。


*默认值为 ""OPTIONS""。*


```opensips title="Set probing_method parameter"
...
modparam("drouting", "probing_method", "INFO")
...
```


#### probing_from (string)


在 SIP 探测请求中通告的 FROM SIP URI。


*默认值为 ""sip:prober@localhost""。*


```opensips title="Set probing_from parameter"
...
modparam("drouting", "probing_from", "sip:pinger@192.168.2.10")
...
```


#### probing_reply_codes (string)


以逗号分隔的 SIP 应答码列表。此处定义的代码
除 200 之外，将被视为探测消息的有效应答码。


*默认值为 "NULL"。*


```opensips title="Set probing_reply_codes parameter"
...
modparam("drouting", "probing_reply_codes", "501, 403")
...
```


#### probing_socket (string)


本地套接字的描述 [proto:]host[:port]（OpenSIPS 用于
SIP 流量），用于（如果有多个）发送探测消息。


对于探测网关，优先级最高的是 dr_gateways 表中网关
配置的套接字。其次是全局 `probing_socket` 参数中的
套接字，优先级最低的是默认行为，即使用 OpenSIPS 监听
的自动选择套接字。


*默认值为 "NULL"。*


```opensips title="Set probing_socket parameter"
...
modparam("drouting", "probing_socket", "udp:192.168.1.100:5060")
...
```


#### gw_socket_filter_mode (string)


此参数控制在数据库加载期间的网关过滤，或者取决于
所配置的套接字，哪些网关被加载或不加载到
内存中。


支持的过滤模式有：


- **"all"** - 数据库中定义的所有
网关都加载到内存中，不考虑它们具有何种套接字
值。注意：对于不匹配任何 OpenSIPS
监听地址/套接字的网关套接字，GW 将以 NULL/无套接字加载。
- **"ignore"** - 数据库中定义的所有网关
都加载到内存中，但忽略它们具有的套接字
值（套接字将设置为 NULL/NONE，不会
尝试对照 OpenSIPS 监听地址/套接字进行检查）。
- **"matched-only"** - 在此模式下，
模块仅从数据库加载配置的套接字与任一
OpenSIPS 监听地址/套接字匹配的网关。如果网关套接字不匹配，它将被
丢弃，完全不加载到内存中。


*默认值为 ""all""。*


```opensips title="Set gw_socket_filter_mode parameter"
...
# 多个 OpenSIPS 实例共享一份 DR 设置，因此每个实例应
# 仅加载它们拥有套接字的 GW。
modparam("drouting", "gw_socket_filter_mode", "matched-only")
...
# 一个不执行路由的 OpenSIPS 实例，但需要
# 知晓所有 gw，因此忽略套接字全部加载
modparam("drouting", "gw_socket_filter_mode", "ignore")
...
```


#### cluster_id (integer) {#cluster_id-integer}


模块所属集群的 ID。drouting 模块中的集群支持
有两个用途：共享网关/运营商的状态，
以及控制对网关的 ping。


如果启用集群，模块将自动与
集群中其他 OpenSIPS 实例共享网关/目的地/运营商状态
的变化。每当此类状态发生变化（因 MI 命令、探测结果、脚本命令），
模块都会将此状态变化复制到该
集群中的所有节点。


带共享标签的集群可用于控制集群中哪个
节点执行对网关的 ping/探测。参见
[cluster_sharing_tag](#cluster_sharing_tag-string) 选项。


此 OpenSIPS 集群公开了 **"drouting-status-repl"**
能力，以便在
任意同步请求期间将节点标记为有资格成为数据提供者。因此，集群必须
*至少有一个节点* 在 *clusterer.flags* 列/属性中
标记为 **"seed"** 值，才能完全正常工作。
更多细节请参见 [clusterer - Capabilities](/zh/modules/clusterer#capabilities-layer)
章节。


有关如何定义和填充集群（使用 OpenSIPS
节点）的更多信息，请参见 [clusterer](/zh/modules/clusterer) 模块。


*默认值为 "0（无）"。*


```opensips title="Set cluster_id parameter"
...
# 与集群 ID 9 中所有 OpenSIPS 复制 gw/运营商状态
modparam("drouting", "cluster_id", 9)
...
```


#### cluster_sharing_tag (string) {#cluster_sharing_tag-string}


共享标签的名称（按 clusterer 模块定义），
用于控制哪个节点负责执行模块中的自触发
操作。此类操作可能是网关探测（另见
[cluster_probing_mode](#cluster_probing_mode-string) 参数）或
共享网关/运营商状态变化。
如果定义了，则只有具有该标签活动状态的节点
会执行这些操作（ping 和共享状态）。


必须定义 [cluster_id](#cluster_id-integer) 该选项
才能生效。


这是一个可选参数。如果未设置，集群中的所有节点
都将共享状态变化。


*默认值为 "空（无）"。*


```opensips title="Set cluster_sharing_tag parameter"
...
# 只有具有活动 "vip" 共享标签的节点会执行 ping
# 并广播状态变化
modparam("drouting", "cluster_id", 9)
modparam("drouting", "cluster_sharing_tag", "vip")
...
```


#### cluster_probing_mode (string) {#cluster_probing_mode-string}


此参数控制在使用集群支持时应如何进行
探测/ping。它涉及集群中哪个节点
ping 哪个网关/目的地。


必须定义 [cluster_id](#cluster_id-integer) 该选项
才能生效。


支持的探测模式有：


- **"all"** - 集群中的所有节点
将独立地 ping 所有已定义的网关，
即 "all" ping "all" 模式。
- **"by-shtag"** - 所有网关
仅由集群中的一个节点 ping，即具有活动
[cluster_sharing_tag](#cluster_sharing_tag-string) 的节点。通过
在不同节点上激活共享标签，ping
职责将转移到集群中的另一个节点。
- **"distributed"** - ping
工作负载分布在集群中的所有节点上，因此每个
节点将 ping 整个网关集合的一个子集。所有
网关仍会被 ping（且每个 ping 周期仅一次）。
当新节点加入或
节点退出时，会基于集群中的可用节点自动重新划分 ping 工作负载
。但仍不保证哪个节点
负责 ping 哪个网关。


*默认值为 ""all""。*


```opensips title="Set cluster_probing_mode parameter"
...
# 只有具有活动 "vip" 共享标签的节点会执行 ping
modparam("drouting", "cluster_id", 9)
modparam("drouting", "cluster_sharing_tag", "vip")
modparam("drouting", "cluster_probing_mode", "by-shtag")
...
# ping 工作负载分布在所有节点上
modparam("drouting", "cluster_id", 9)
modparam("drouting", "cluster_probing_mode", "distributed")
...
```


#### use_domain (int)


用于配置在数据库中查询用户路由组时
是否使用域匹配的标志。


*默认值为 "1"。*


```opensips title="Set use_domain parameter"
...
modparam("drouting", "use_domain", 0)
...
```


#### drg_user_col (str)


组数据库表中存储用户名的列名。


*默认值为 "username"。*


```opensips title="Set drg_user_col parameter"
...
modparam("drouting", "drg_user_col", "user")
...
```


#### drg_domain_col (str)


组数据库表中存储域的列名。


*默认值为 "domain"。*


```opensips title="Set drg_domain_col parameter"
...
modparam("drouting", "drg_domain_col", "host")
...
```


#### drg_grpid_col (str)


组数据库表中存储组 ID 的列名。


*默认值为 "groupid"。*


```opensips title="Set drg_grpid_col parameter"
...
modparam("drouting", "drg_grpid_col", "grpid")
...
```


#### use_partitions (int)


用于配置是否对路由使用分区的标志。如果设置此
标志，则 `db_partitions_url` 和
`db_partitions_table`
变量变为必填。


*默认值为 "0"。*


```opensips title="Set use_partitions parameter"
...
modparam("drouting", "use_partitions", 1)
...
```


#### db_partitions_url (str)


包含分区特定信息的数据库的 url。（分区特定信息
包括分区名称、保存该分区信息的数据库的 url、
保存该信息的表名，以及可通过 .cfg
脚本访问的 AVP）。必须将 `use_partitions` 参数
设置为 1。


*默认值为 ""NULL""。*


```opensips title="Set db_partitions_url parameter"
...
modparam("drouting", "db_partitions_url", "mysql://user:password@localhost/opensips_partitions")
...
```


#### db_partitions_table (str)


包含分区定义的表的名称。与
`use_partitions` 和 `db_partitions_url` 一起使用。


*默认值为 "dr_partitions"。*


```opensips title="Set db_partitions_table parameter"
...
modparam("drouting", "db_partitions_table", "partition_defs")
...
```


#### partition_id_pvar (pvar)


当使用 *通配符(*)* 运算符时，将存储分区
名称的变量。必须设置 *Use_partitions* 才能
使用此参数。


> [!NOTE]
> 该变量必须是可写的！


*默认值为 "null（未使用）"。*


```opensips title="Set partition_id_pvar parameter"
...
modparam("drouting", "partition_id_pvar", "$var(matched_partition)")
...
```


#### enable_restart_persistency (int)


设为启用动态路由模块重启持久性的参数。
设置此参数后，drouting 模块在重启后不再从数据库加载数据，
而是使用持久化存储文件，并从中"按需"加载
数据，从而提高启动性能。


> [!NOTE]
> 如果重启持久缓存未从上次运行中填充，
> 则启动时将改为从数据库加载数据！


> [!NOTE]
> 重新加载将更新缓存的数据。


*默认值为 "0（禁用）"。*


```opensips title="Set enable_restart_persistency parameter"
...
modparam("drouting", "enable_restart_persistency", yes)
...
```


#### extra_prefix_chars (str)


前缀中额外接受的 ASCII（0-127）字符列表。
默认仅接受 '0' - '9' 字符（数字）。


*默认值为 "NULL"。*


```opensips title="Set extra_prefix_chars parameter"
...
modparam("drouting", "extra_prefix_chars", "#-%")
...
```


#### extra_id_chars (str)


除字母数字字符外，允许在网关和运营商
唯一字符串标识符中使用的一组额外字符。


*默认值为 "_-."。*


```opensips title="Set extra_id_chars parameter"
...
modparam("drouting", "extra_id_chars", ":_-.")
...
```


#### rule_tables_query (str)


此参数提供一种动态的、基于 SQL 的方式，为任意给定分区构建
一组与 *dr_rules* 兼容的表名，每个表名都将
被加载，然后合并到单个 "dr_rules" 表
中。


参数的语法为：
"**token** : **query**"，
其中 **token** 是赋予某个
"dr_rules" 表的特殊名称，以便 OpenSIPS 能将其与此参数定义的
自定义查询进行匹配。


此参数可设置多次（每个定义创建一个
新映射）。


```opensips title="Set the rule_tables_query parameter"
...
# 首先，将 "dr_rules" 表名设置为你查询的名称
modparam("drouting", "drr_table", "MY_RULES_QUERY")

# 接着，指示 drouting 同时加载 'dr_rules_a' 和 'dr_rules_b'，
# 然后合并它们的所有规则
modparam("drouting", "rule_tables_query", "
	MY_RULES_QUERY:
		SELECT 'dr_rules_a' UNION SELECT 'dr_rules_b'")
...
```


#### generate_data_checksum (int)


如果启用，将为 drouting 已加载的数据生成校验和（MD5），将其附加到 reload_status MI 命令的输出以及重新加载生成的状态报告中


```opensips title="Set the generate_data_checksum parameter"
...
modparam("drouting", "generate_data_checksum", 1)
...
		
```


### 导出的函数 {#exported-functions}


#### do_routing([groupID], [flags], [gw_whitelist], [rule_attrs_pvar], [gw_attrs_pvar], [carrier_attrs_pvar], [partition])


根据数据库表中的规则和已配置的参数触发消息路由
的函数。


此函数可在所有路由中使用。


如果将 `use_partitions` 设置为 1，则最后一个参数
**partition** 变为
必填。


所有参数都是可选的。只要正确地放置了
必要的分隔标记 ","，其中任何一个都可以忽略。


- **groupID**（int，可选）—— 用于为路由目的
指定主叫组的数字。
若未指定，函数将自动尝试查询
dr_group 表以获取
- **flags**（string，可选）—— 用于
控制路由行为的字母类标志位列表。
可用的标志位有：

  - **F** - 启用规则回退；
通常引擎使用单条规则为呼叫路由；
通过设置此标志位，当当前规则中的所有
目的地都失败时，引擎将回退并使用
优先级较低或前缀较短的规则。
  - **L** - 对前缀进行严格长度匹配
—— 实际上 DR 引擎将进行完整号码
匹配，而不再是前缀匹配。
  - **C** - 仅检查被叫
号码是否匹配任何路由规则，而不加载/应用任何
路由信息（不设置 GW，不修改 RURI）
- **gw_whitelist**（string，可选）—— 以
逗号分隔的网关白名单。这将强制最多只在该
运营商或网关列表范围内路由（换言之，
该白名单将与通过规则搜索的结果
取交集）。
- **rule_attrs_pvar**（var，可选）—— 一个
可写变量，将被填充匹配的动态路由规则的
属性。
- **gw_attrs_pvar**（var，可选）—— 一个
可写变量，将被
填充匹配的网关的属性。
- **carrier_attrs_pvar**（var，可选）—— 一个
可写变量，将被
填充匹配的运营商的属性。
- **partition**（string，可选）—— 要
使用的 DR 分区名称。仅当打开 "use_partition" 模块参数时
才定义此参数。
除了指定一个分区的名称，你还可以使用 "*"
通配符来强制在所有分区上进行路由。


```c title="do_routing usage"
...
# 所有组，按顺序排序，
```


#### route_to_carrier( carriers, [gw_attrs_pvar], [carrier_attrs_pvar], [partition])


用于触发到给定一组运营商（一个
或多个）的直接路由的函数。因此，路由不是基于前缀，而是基于运营商
（呼叫将根据运营商策略发送到该运营商的 GW）。


此函数可在所有路由中使用。


如果将 `use_partitions` 参数设置为 1，则还必须
提供 "partition" 参数（运营商所在的
分区）。


- **carriers**（string）—— 以逗号分隔的
运营商 ID（名称）
- **gw_attrs_pvar**（var，可选）——
一个输出可写变量，将填充
该运营商当前匹配的网关的
属性。
- **carrier_attrs_pvar**（var，
可选）—— 一个输出可写变量，将填充
该运营商的属性。
- **partition**（string，可选）——
要使用的 DR 分区名称。仅当打开 "use_partition" 模块参数时
才定义此参数。此函数不接受
通配符。


```opensips title="route_to_carrier usage"
...
# use_partitions 未设置
if ( route_to_carrier("my_top_carrier, def_carrier", , $var(carrier_att)) ) {
	xlog("Routing to \"my_top_carrier\" - $var(carrier_att)\n");
	t_on_failure("next_gw");
	t_relay();
	exit;
}
...
# use_partitions 已启用
if ( route_to_carrier("my_top_carrier", , $var(carrier_att), "part") ) {
	xlog("Routing to \"my_top_carrier\" - $var(carrier_att)\n");
	t_on_failure("next_gw");
	t_relay();
	exit;
}
...
# use_partitions 已启用
if ( route_to_carrier($var(carrierId), , , $var(my_partition)) ) {
	xlog("Routing to \"my_top_carrier\"\n");
	t_on_failure("next_gw");
	t_relay();
	exit;
}
...
```


#### route_to_gw(gw_id, [gw_attrs_var], [carrier_attrs_var], [partition])


用于触发到给定网关（或网关列表）的直接路由的函数。
属性和按 gw 的处理将可用。


此函数可在所有路由中使用。


如果将 `use_partitions` 参数设置为 1，则必须
提供 "partition" 参数，以指明
网关定义所在的分区。


- **gw_id**（string）—— 以逗号
分隔的待使用网关 ID 列表。
- **gw_attrs_pvar**（var，可选）
					- 一个输出可写变量，将填充
当前匹配的网关的属性。
- **carrier_attrs_pvar**（var，
可选）—— 一个输出可写变量，将
填充该运营商的属性。注意：将考虑
指向该 GW 的第一个运营商！
- **partition**（string，可选）——
要使用的 DR 分区名称。仅当打开 "use_partition" 模块参数时
才定义此参数。此函数不接受
通配符。


```opensips title="route_to_gw usage"
...
# use_partitions 未设置
if ( route_to_gw("gw_europe") ) {
	t_relay();
	exit;
}
...
# use_partitions 未设置
if ( route_to_gw("gw1,gw2,gw3", $var(gw_attrs)) ) {
	xlog("Relaying to first gateway from our list - $var(gw_attrs)\n");
	t_relay();
	exit;
}
...
# use_partitions 已启用
if ( route_to_gw("gw_europe", , , "my_partition") ) {
	t_relay();
	exit;
}
...
# use_partitions 已启用
if ( route_to_gw("gw1,gw2,gw3", $var(gw_attrs), , "my_partition") ) {
	xlog("Relaying to first gateway from our list - $var(gw_attrs)\n");
	t_relay();
	exit;
}
...
```


#### use_next_gw( [rule_attrs_pvar], [gw_attrs_pvar], [carrier_attrs_pvar], [partition])


该函数取下一个可用的目的地（由 do_routing
设置的备选目的地）并将其推入 RURI。注意，
该函数仅设置 RURI（仅此而已）。


如果设置了新的 RURI，则所使用目的地将从
待处理的备选目的地集合中移除。


此函数可在 REQUEST_ROUTE、FAILURE_ROUTE、
BRANCH_ROUTE 和 LOCAL_ROUTE 中使用。


如果将 `use_partitions` 参数设置为 1，则必须
提供 "partition" 参数，以指明
网关定义所在的分区。


该函数仅在设置了新 RURI 时返回 true。如果
未找到其他备选目的地或出现内部处理错误，
则返回 false。它可以接收以下可选
参数：


- **rule_attrs_pvar**（var，可选）
					- 一个输出可写变量，将填充
匹配的动态路由规则的属性。
- **gw_attrs_pvar**（var，可选）—— 一个
输出可写变量，将填充
匹配的网关的属性。
- **carrier_attrs_pvar**（var，可选）
					- 一个输出可写变量，将填充
匹配的运营商的属性。
- **partition**（可选，string）——
要使用的 DR 分区名称。仅当打开 "use_partition" 模块参数时
才定义此参数。此函数不接受
通配符。


```opensips title="use_next_gw usage"
...
# use_partitions 未设置
if (use_next_gw()) {
	t_relay();
	exit;
}
...
# 同时获取运营商属性（如果有）
if (use_next_gw(, , $var(carrier_attrs))) {
	xlog("Carrier attributes of current gateway: $var(carrier_attrs)\n");
	t_relay();
	exit;
}
...
# use_partitions 已启用
if (use_next_gw( , , ,"my_partition")) {
	t_relay();
	exit;
}
...
# 同时获取运营商属性（如果有）
if (use_next_gw( , ,$var(carrier_attrs), "my_partition")) {
	xlog("Carrier attributes of current gateway: $var(carrier_attrs)\n");
	t_relay();
	exit;
}
...
```


#### goes_to_gw( [type], [flags], [gw_attrs_pvar], [carrier_attrs_pvar], [partition])


如果当前请求的目的地（destination URI 或 Request URI）
以（IP 形式）指向某个网关，函数返回 true。
如果 URI 的域部分不是 IP，则不进行 DNS 查询。


此函数不会更改消息中的任何内容。


此函数可在 REQUEST_ROUTE、FAILURE_ROUTE、
BRANCH_ROUTE、ONREPLY_ROUTE 和 LOCAL_ROUTE 中使用。


如果将 `use_partitions` 参数设置为 1，则必须
提供 "partition" 参数，以指明
网关定义所在的分区。


它可以接收以下可选参数：


- **type**（int，可选）—— 要检查的 GW/目的地
类型数字；省略此
参数或指定特殊值 *-1* 时，将
针对所有类型进行匹配。
- **flags**（string，可选）——
用于控制 GW 匹配时应执行哪些操作的
字母类标志位：

  - **'s'**（Strip）—— 将 GW 定义的 strip
应用到 RURI 的用户名
  - **'p'**（Prefix）—— 将 GW 定义的前缀
应用到 RURI 的用户名
  - **'i'**（Gateway ID）——
将网关 ID 返回到 gw_id_avp AVP
  - **'n'**（Ignore port）——
匹配时忽略端口号
  - **'c'**（Carrier ID）——
将运营商 ID 返回到 carrier_id_avp AVP
- **gw_attrs_pvar**（var，可选）——
一个输出可写变量，将填充
匹配的网关的属性。
- **carrier_attrs_pvar**（var，可选）—— 一个
输出可写变量，将填充
匹配的运营商的属性。
- **partition**（string，可选）——
要使用的 DR 分区名称。仅当打开 "use_partition" 模块参数时
才定义此参数。此函数接受
通配符。


```opensips title="goes_to_gw usage"
...
# use_partitions 未设置
if (goes_to_gw( 1, , $var(gw_attrs))) {
	sl_send_reply(403,"Forbidden");
	exit;
}
...
# use_partitions 已启用
if (goes_to_gw(1, , $var(gw_attrs), , "my_partition")) {
	sl_send_reply(403,"Forbidden");
	exit;
}
...
```


#### is_from_gw([type], [flags], [gw_attrs_pvar], [carrier_attrs_pvar], [partition])


该函数检查消息的发送方（源 IP + 源
端口）是否为某个组的网关。


此函数不会更改消息中的任何内容。


此函数可在 REQUEST_ROUTE、FAILURE_ROUTE、
BRANCH_ROUTE 和 ONREPLY_ROUTE 中使用。


如果将 `use_partitions` 参数设置为 1，则必须
提供 "partition" 参数，以指明
网关定义所在的分区。


它可以接收以下可选参数：


- **type**（int，可选）—— 要检查的 GW/目的地
类型数字；省略此
参数或指定特殊值 *-1* 时，将
针对所有类型进行匹配。
- **flags**（string，可选）——
用于控制 GW 匹配时应执行哪些操作的
字母类标志位：

  - **'s'**（Strip）—— 将 GW 定义的 strip
应用到 RURI 的用户名
  - **'p'**（Prefix）—— 将 GW 定义的前缀
应用到 RURI 的用户名
  - **'i'**（Gateway ID）——
将网关 ID 返回到 gw_id_avp AVP
  - **'n'**（Ignore port）——
匹配时忽略端口号
  - **'r'**（Check protocol）—— 检查协议
  - **'c'**（Carrier ID）——
将运营商 ID 返回到 carrier_id_avp AVP
- **gw_attrs_pvar**（var，可选）—— 一个
输出可写变量，将填充
匹配的网关的属性。
- **carrier_attrs_pvar**（var，可选）—— 一个
输出可写变量，将填充
匹配的运营商的属性。
- **partition**（string，可选）——
要使用的 DR 分区名称。仅当打开 "use_partition" 模块参数时
才定义此参数。此函数接受
通配符。


```opensips title="is_from_gw usage"
# use_partitions 未设置
# 仅匹配源 IP 到所有网关
if (is_from_gw(-1, "n")) {
	...
}

# use_partitions 已启用
# 将源 IP 和端口与 "outbound" 分区中的所有网关匹配，
# 并返回匹配网关的运营商
if (is_from_gw(, "c", , , "outbound")) {
	...
}
```


#### dr_is_gw( sip_uri, [type], [flags], [gw_attrs_pvar], [carrier_attrs_pvar], [partition])


该函数检查存储在
"src_pv" 伪变量中的 SIP URI 主机名部分是否为某个组的
网关。


此函数不会更改消息中的任何内容。


此函数可在所有路由中使用。


如果将 `use_partitions` 参数设置为 1，则必须
提供 "partition" 参数，以指明
网关定义所在的分区。


它可以接收以下可选参数：


- **sip_uri**（string）—— SIP URI。
如果 URI 的主机名部分是 FQDN，
则会在匹配之前进行解析。
- **type**（int，可选）—— 要检查的 GW/目的地
类型数字；省略此
参数或指定特殊值 *-1* 时，将
针对所有类型进行匹配。
- **flags**（string，可选）——
用于控制 GW 匹配时应执行哪些操作的
字母类标志位：

  - **'s'**（Strip）—— 将 GW 定义的 strip
应用到 RURI 的用户名
  - **'p'**（Prefix）—— 将 GW 定义的前缀
应用到 RURI 的用户名
  - **'i'**（Gateway ID）——
将网关 ID 返回到 gw_id_avp AVP
  - **'n'**（Ignore port）——
匹配时忽略端口号
  - **'c'**（Carrier ID）——
将运营商 ID 返回到 carrier_id_avp AVP
- **gw_attrs_pvar**（var，可选）—— 一个
输出可写变量，将填充
匹配的网关的属性。
- **carrier_attrs_pvar**（var，可选）—— 一个
输出可写变量，将填充
匹配的运营商的属性。
- **partition**（string，可选）——
要使用的 DR 分区名称。仅当打开 "use_partition" 模块参数时
才定义此参数。此函数接受
通配符。


```opensips title="dr_is_gw usage"
# 将 $var(uac) 中的 SIP URI 主机与所有网关匹配
if (dr_is_gw( $var(uac), , "n")) {
	...
}


# 将 $var(uac) 中的 SIP URI 主机与
# "outbound" 分区中的所有 gw 匹配
if (dr_is_gw( $avp(uac), , "n", , , "partition")) {
	...
}
```


#### dr_disable([partition])


将当前呼叫最后使用的目的地标记为禁用。通过此函数
进行的禁用将阻止该目的地从现在起被使用。探测机制
可以重新启用该对端（参见开头的探测章节）


此函数可在 REQUEST_ROUTE、FAILURE_ROUTE、
BRANCH_ROUTE、ONREPLY_ROUTE 和 LOCAL_ROUTE 中使用。


如果将 `use_partitions` 参数设置为 1，则必须
提供 "partition" 参数，以指明
网关定义所在的分区。


它可以接收以下参数：


- **partition**（string，可选）——
要使用的 DR 分区名称。仅当打开 "use_partition" 模块参数时
才定义此参数。此函数接受
通配符。


```opensips title="dr_disable() usage"
...
if (t_check_status("(408)|(5[0-9][0-9])")) {
	dr_disable();

}
...
if (t_check_status("(408)|(5[0-9][0-9])")) {
	dr_disable("my_partition");

}
...
```


#### dr_match(groupID, [flags], number, [rule_attrs_pvar], [partition])


该函数尝试将给定号码与数据库中的
规则进行匹配/检查。


此函数可在 REQUEST_ROUTE、FAILURE_ROUTE、
BRANCH_ROUTE、ONREPLY_ROUTE 和 LOCAL_ROUTE 中使用。


如果将 `use_partitions` 设置为 1，则最后一个参数
**partition** 变为
必填。


参数为：


- **groupID**（int）—— 用于
指定要对其执行检查的 dr 组（规则集）的数字
- **flags**（string，可选）—— 用于
控制检查/匹配行为的字母类标志位列表。
可用的标志位有：

  - **L** - 对前缀进行严格长度匹配
—— 实际上 DR 引擎将进行完整号码
匹配，而不再是前缀匹配。
- **number**（string）—— 要检查的号码
- **rule_attrs_pvar**（var，可选）—— 一个
可写变量，将被填充匹配的动态路由规则的
属性。
- **partition**（string，可选）—— 要
使用的 DR 分区名称。仅当打开 "use_partition" 模块参数时
才定义此参数。


```opensips title="dr_match usage"
...
if ( dr_match( 1, "L" , $fU, ,"dids") )
	xlog("Full From Username $fU found in group 1 partition DIDS\n");
...
if ( dr_match( 1, , $var(did) ) )
	xlog("DID $var(did) matches rules in group 1\n");
...
```


### 导出的 MI 函数 {#exported-mi-functions}


#### dr_reload


从数据库重新加载路由规则的命令。


- 如果 `use_partition` 设置为 0 —— 将重新加载所有路由规则。
	* *inherit_state*（可选）：是否继承网关的旧状态，默认为 y。
"n"：不继承状态
"y"：继承状态
- 如果 `use_partition` 设置为 1，参数为：
	* *partition_name*（可选）—— 如果未提供，将重新加载所有分区，否则仅重新加载作为参数给出的分区。
	* *inherit_state*（可选）：是否继承网关的旧状态，默认为 y。
		- "n"：不继承状态
		- "y"：继承状态


MI FIFO 命令格式：


```bash
		opensips-cli -x mi dr_reload part_1
		
```


#### dr_gw_status


获取一个或多个网关的状态（启用或禁用）。该函数
也可用于设置单个网关的状态。


- 如果 `use_partitions` 设置为 0，参数为：		
	* *gw_id*（可选）—— 网关的 id。如果提供，函数将返回/设置（取决于是否给出第二个参数）该网关的状态，否则将列出所有网关及其状态。
	* *status*（可选）—— 要为 GW 强制设置的新状态（0 - 禁用，1 - 启用）。仅在提供 *gw_id* 时才有意义。
- 如果 `use_partitions` 设置为 1，参数为：
	* *partition_name*
	* *gw_id*（可选）—— 网关的 id。如果提供，函数将返回/设置（取决于是否给出第三个参数）该网关的状态，否则将列出给定分区中的所有网关及其状态。
	* *status*（可选）—— 要为 GW 强制设置的新状态（0 - 禁用，1 - 启用）。仅在提供 *gw_id* 时才有意义。


```bash title="dr_gw_status usage when use_partitions is set to 0"
$ opensips-cli -x mi dr_gw_status gw_id=2
State:: Active
$ opensips-cli -x mi dr_gw_status gw_id=2 status=0
$ opensips-cli -x mi dr_gw_status gw_id=2
Enabled:: Disabled MI
$ opensips-cli -x mi dr_gw_status gw_id=3
Enabled:: Inactive
```


```bash title="dr_gw_status usage when use_partitionsis set to 1"
$ opensips-cli -x mi dr_gw_status partition_name=part_1 gw_id=my_gw
State:: Active
$ opensips-cli -x mi dr_gw_status partition_name=part_1 gw_id=my_gw status=0
$ opensips-cli -x mi dr_gw_status partition_name=part_1 gw_id=my_gw
enabled:: disabled mi
$ opensips-cli -x mi dr_gw_status partition_name=partition8 status=3
enabled:: inactive
```


#### dr_carrier_status


获取一个或多个运营商的状态（启用或禁用）。该函数
也可用于设置单个运营商的状态。


- 如果 `use_partitions` 设置为 0，参数为：
	* *carrier_id*（可选）—— 运营商的 id。如果提供，函数将返回/设置（取决于是否给出第二个参数）该运营商的状态，否则将列出所有运营商及其状态。
	* *status*（可选）—— 要为运营商强制设置的新状态（0 - 禁用，1 - 启用）。仅在提供 *carrier_id* 时才有意义。
- 如果 `use_partitions` 设置为 1，参数为：
	* *partition_name*
	* *carrier_id*（可选）—— 运营商的 id。如果提供，函数将返回/设置（取决于是否给出第三个参数）该运营商的状态，否则将列出给定分区中包含的所有运营商及其状态。
	* *status*（可选）—— 要为运营商强制设置的新状态（0 - 禁用，1 - 启用）。仅在提供 *carrier_id* 时才有意义。


```bash title="dr_carrier_status usage when use_partitions is 0"
$ opensips-cli -x mi dr_carrier_status carrier_id=CR1
Enabled:: no
$ opensips-cli -x mi dr_carrier_status carrier_id=CR1 status=1
$ opensips-cli -x mi dr_carrier_status carrier_id=CR1
Enabled:: yes
```


```bash title="dr_carrier_status usage when use_partitions is 1"
$ opensips-cli -x mi dr_carrier_status partition_name=my_partition carrier_id=CR1
Enabled:: no
$ opensips-cli -x mi dr_carrier_status partition_name=partition_1 carrier_id=CR1 status=1
$ opensips-cli -x mi dr_carrier_status partition_name=partition_3 carrier_id=CR1
Enabled:: yes
```


#### dr_reload_status


获取任意分区最后一次重新加载的时间。


- 如果 `use_partition` 设置为 0 —— 函数不接收任何参数。它将列出默认（也是唯一）分区最后一次重新加载的日期。
- 如果 `use_partition` 设置为 1，参数为：
	* *partition_name*（可选）—— 如果未提供，函数将列出每个分区最后一次更新的时间。否则，函数将列出给定分区最后一次重新加载的时间。


```bash title="dr_reload_status usage when use_partitions is 0"
$ opensips-cli -x mi dr_reload_status
Date:: Tue Aug 12 12:26:00 2014
```


```bash title="dr_reload_status usage when use_partitions is 1"
$ opensips-cli -x mi dr_reload_status
Partition:: part_test Date=Tue Aug 12 12:24:13 2014
Partition:: part_2 Date=Tue Aug 12 12:24:13 2014
$ opensips-cli -x mi dr_reload_status part_test
Partition:: part_test Date=Tue Aug 12 12:24:13 2014
```


#### dr_number_routing


获取匹配的前缀以及在使用 do_routing 函数时号码
将被路由到的网关/运营商列表。


- 如果 `use_partition` 设置为 1，函数将有 3 个参数：
	* *partition_name*
	* *group_id*（可选）—— 要对照检查的规则组 id
	* *number* —— 要测试的号码
- 如果 `use_partition` 设置为 0，函数将有 2 个参数：
	* *group_id*（可选）—— 要对照检查的规则组 id
	* *number* —— 要测试的号码


MI FIFO 命令格式：


```bash
		opensips-cli -x mi dr_number_routing partition_name=part1 group_id=3 number=012340987
		
```


#### dr_enable_probing


启用/禁用网关探测，或返回当前网关
探测状态。


参数：


- *status*（可选）—— 1 - 启用，0 - 禁用网关探测


```bash title="dr_enable_probing usage"
$ opensips-cli -x mi dr_enable_probing
Status:: 1
$ opensips-cli -x mi dr_enable_probing 0
$ opensips-cli -x mi dr_enable_probing
Status:: 0
		
```


### 导出的事件 {#exported-events}


#### E_DROUTING_STATUS


当模块更改网关状态时触发此事件，
无论是通过 MI 命令、探测还是脚本函数。


参数：


- *partition* —— 分区名称。
- *gwid* —— 网关标识符。
- *address* —— 网关地址。
- *status* —— 如果网关是通过 MI 命令
禁用的则为 *disabled MI*，
如果网关正在被 ping 则为 *probing*，
如果是从脚本禁用的则为 *inactive*，
如果网关已启用则为 *active*。


### 导出的状态/报告标识符 {#exported-statusreport-identifiers}


模块提供 "drouting" 状态/报告组，其中每个
路由分区都定义为独立的 SR 标识符。


#### [partition_name]


这些标识符的状态反映
缓存数据的就绪程度/状态（在从数据库加载时是否可用）：


- *-2* - 完全没有数据（初始状态）
- *-1* - 无数据，初始加载进行中
- *1* - 数据已加载，分区就绪
- *2* - 数据可用，重新加载进行中


重新加载报告：


在数据重新加载方面，将报告以下日志：


- 开始数据库数据加载
- 数据库数据加载失败，丢弃
- 数据库数据加载成功完成
- 已加载 N 个网关（丢弃 N 个），已加载 N 个运营商（丢弃 N 个），已加载 N 条规则（丢弃 N 条）


```json
{
	"Name": "Default",
	"Reports": [
		{
			"Timestamp": 1652353940,
			"Date": "Thu May 12 14:12:20 2022",
			"Log": "starting DB data loading"
		},
		{
			"Timestamp": 1652353940,
			"Date": "Thu May 12 14:12:20 2022",
			"Log": "DB data loading successfully completed"
		},
		{
			"Timestamp": 1652353940,
			"Date": "Thu May 12 14:12:20 2022",
			"Log": "2 gateways loaded (0 discarded), 2 carriers loaded (0 discarded), 1 rules loaded (0 discarded)"
		}
	]
}

```


#### [partition_name];events


GW/运营商切换报告：


为报告网关和运营商状态变化相关的事件，
模块提供了单独的标识符（仍然每个分区
一个）。为何要单独？状态变化的报告可能很冗长，
且由于状态变化日志数量多，存在重新加载时
丢失/丢弃重要报告的风险；


因此，每个分区将提供标识为 "partition_name;events" 的
标识符，用于报告网关和运营商的状态变化，
以及变化的原因。这些标识符在丢弃旧记录之前
保留 200 条记录的历史。


```json
{
	"Name": "Default;events",
	"Reports": [
		{
			"Timestamp": 1652353976,
			"Date": "Thu May 12 14:12:56 2022",
			"Log": "GW <gw1_1>/127.0.1.1 switched to [inactive] due probing reply\n"
		},
		{
			"Timestamp": 1652353976,
			"Date": "Thu May 12 14:12:56 2022",
			"Log": "GW <gw2_1>/127.0.1.2 switched to [inactive] due probing reply\n"
		}
	]
}

```


有关如何访问和使用状态/报告信息，请参见
[Status/Report Interface](/zh/manual/Interface-StatusReport)。


### 安装 {#installation}


该模块需要 OpenSIPS 数据库中的 4 张表：dr_groups、
dr_gateways、dr_carriers、dr_rules。创建它们的 SQL 语法可
在 drouting-create.sql 脚本中找到，该脚本位于 opensips/scripts 文件夹的
database 目录中。你也可以在项目网页上找到完整的
数据库文档，[https://opensips.org/docs/db/db-schema-devel.html](https://opensips.org/docs/db/db-schema-devel.html)。


## 开发者指南 {#developer-guide}


该模块没有提供可供其他 OpenSIPS 模块
使用的函数。
<!-- CONTRIBUTORS -->

### 许可 {#license}

所有文档文件（即 .md 扩展名）均按 Creative Common License 4.0 许可。
