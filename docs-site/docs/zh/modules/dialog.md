---
title: "dialog 模块"
description: "dialog 模块为 OpenSIPS 代理提供对话感知能力。"
sidebar: false
---


## 管理员指南 {#admin-guide}


### 概述 {#overview}


dialog 模块为 OpenSIPS 代理提供对话感知能力。其功能是跟踪当前对话，并
提供有关它们的信息（比如有多少对话处于活动状态）。


除跟踪之外，dialog 模块还提供按对话设置的标志位与属性（跨对话持久化的
数据）、对话剖析以及对话终止（基于超时或由外部触发）等功能。


该模块还通过内部 API 为在其之上借助其他 OpenSIPS 模块构建更复杂的、基于
对话的功能提供基础。


### 工作原理 {#how-it-works}


要为初始请求创建关联的对话，必须调用 create_dialog() 函数，可以带参数，
也可以不带参数。


收到 "BYE" 时，对话会自动终止。如果没有 "BYE"，对话的生命周期由
[default_timeout](#default_timeout-integer) 模块参数或通过
[$DLG_timeout](#dlg_timeout) 设置的自定义值控制。


一旦终止，内存中的对话可能被立即销毁，或者根据
[delete_delay](#delete_delay-integer) 的设置，它可能在内存中保留一段时间，
处于只读状态（不执行动作、不做变更、什么都不做）。
这种延迟可用于协助路由那些在对话终止之后才到达的迟到的对话内
请求（例如因重传而迟到的 BYE、交叉 BYE 请求、经过鉴权的 BYE 请求、
对 re-INVITE 的缓慢 ACK 等）。


### 对话剖析 {#dialog-profiling}


对话剖析是一种机制，用于对特定类型的对话进行分类、排序和跟踪，可以使用
对话的任意属性（如主叫、目的地、呼叫类型等）。
对话可以被动态地加入不同的（且多个）剖析表——从逻辑上讲，每个剖析表可以
具有特定含义（如域外对话、终止到 PSTN 的对话等）。


剖析有两种类型：


- *不带值* - 对话只是属于某个剖析
（如出站呼叫剖析）。没有其他附加信息来描述对话对剖析的
归属；
- *带值* - 对话属于具有特定值的剖析（如主叫剖析，其中的值
就是主叫 ID）。对话对剖析的归属与该值
严格相关。


同一对话可以同时加入多个剖析。


剖析（目前）在请求路由（针对初始请求和后续请求）以及原始请求的
分支路由、失败路由和应答路由中可见。


对话剖析也可用于分布式系统，使用 OpenSIPS CacheDB 接口或
*clusterer* 模块。该特性允许你将对话剖析信息与多个 OpenSIPS 实例
共享，这些实例使用相同的 CacheDB 后端或属于同一 OpenSIPS 集群。为了
做到这一点，必须定义 **cachedb_url** 或
**profile_replication_cluster** 参数。
此外，必须通过在 *profiles_with_value* 或
*profiles_no_value* 参数中为剖析名添加 *'/s'* 或 *'/b'* 后缀之一，
将剖析标记为共享。


### 对话集群 {#dialog-clustering}


**对话复制**是一种机制，用于将一个 OpenSIPS 实例中发生的所有对话变更
镜像到一个或多个其他实例。该过程因使用 *clusterer* 模块而得以简化，
该模块便于管理 OpenSIPS 节点集群，以及发送与复制相关的 BIN 包
（二进制编码，使用 *proto_bin*）。该特性有助于为进行中的呼叫
实现高可用性和/或负载均衡。


配置对话复制包的接收与发送都很简单，可通过
**dialog_replication_cluster** 参数完成。但除了仅共享数据之外，
为了正确地集群化对话，你还需要使用**共享标签（sharing tags）**机制，
管理集群中哪个节点对哪些对话执行特定动作。
有关在不同使用场景下如何工作的细节和配置示例，请参阅
[这篇文章](https://blog.opensips.org/2018/03/23/clustering-ongoing-calls-with-opensips-2-4/)。


对于标记了处于"**backup**"状态的共享标签的对话，将**不会**执行
以下动作：


- 向端点发送 Re-Invite 或 OPTIONS ping
- 在对话过期时生成 BYE 请求或任何其他动作（如产生 CDR）
- 在对话事件（更新、删除）时发送复制包
- 在该对话所属的剖析中对其计数；仅当同时启用了剖析复制


除事件驱动的复制之外，OpenSIPS 实例在启动时还会首先尝试从集群中的
另一个节点学习所有对话信息。
数据同步机制要求将集群中的一个节点定义为"**seed**"节点。
有关如何做到这一点以及为什么需要它的详细信息，请参阅
[clusterer](/zh/modules/clusterer#capabilities-layer)
模块。


在对话复制的语境中，使用数据库作为获取对话数据重启持久性的故障保护
手段，在集群中所有节点都宕机的情况下很有用。
如果为集群中的每个节点使用单独的本地数据库，这种做法最为合理。
启动时从数据库加载的对话，若未通过同步得到再次确认，将被丢弃，
并在来自集群的同步完成后从数据库中删除。


此外，在已经配置了对话复制的情况下，无需再通过 *profile_replication_cluster*
参数配置剖析复制。剖析信息
包含在对话复制集群中发送的对话更新里。不过，剖析仍必须
在 *profiles_with_value* 或
*profiles_no_value* 参数中标记为共享。


需要同时配置剖析复制和对话复制的场景是：平台拥有
多个 POP，其中为 HA 目的配置了独立的对话复制集群，同时还
需要一个用于全局共享剖析的集群。在这种情况下，通过使用共享标签机制
（以避免在活动节点和备份节点上对同一对话重复计数）
来确保正确的对话计数。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


在使用该模块之前必须先加载以下模块：


- *TM* - 事务模块
- *RR* - Record-Route 模块，可选，
如果在非拓扑隐藏场景中使用 Dialog ID 匹配
- *clusterer* - 如果设置了 *replication_cluster*
参数（通过 clusterer 模块进行 contact 复制）


#### 外部库或应用 {#external-libraries-or-applications}


在加载该模块运行 OpenSIPS 之前，必须安装以下库或应用：


- *None*。


### 导出参数 {#exported-parameters}


#### enable_stats (integer)


是否应启用统计支持。通过统计
变量，模块提供有关对话处理的信息。
将其设为零可禁用，设为非零则启用。


*默认值为 "1 (enabled)"。*


```opensips title="Set enable_stats parameter"
...
modparam("dialog", "enable_stats", 0)
...
```


#### hash_size (integer)


内部用于保存对话的哈希表大小。较大的表
速度更快，但消耗更多内存。哈希大小
必须是 2 的幂。


重要：如果对话信息应存储在数据库中，
则应使用固定的 hash_size，否则恢复过程
将不会发生。如果你确实想修改 hash_size，
必须在重启 OpenSIPS 前删除该表的所有行。


*默认值为 "4096"。*


```opensips title="Set hash_size parameter"
...
modparam("dialog", "hash_size", 1024)
...
```


#### log_profile_hash_size (integer)


内部用于存储 profile->dialog 关联的哈希表
大小。较大的表可以提供更多
并行操作，但消耗更多内存。哈希大小
以以 2 为底的对数形式给出（例如 log_profile_hash_size =4
表示该表有 2^4 个条目）。


*默认值为 "4"。*


```opensips title="Set hash_size parameter"
...
modparam("dialog", "log_profile_hash_size", 5) #设置表大小为 32
...
```


#### rr_param (string)


要添加对话 cookie 的 Record-Route 参数名。
它用于后续请求的快速对话匹配。


*默认值为 "did"。*


```opensips title="Set rr_param parameter"
...
modparam("dialog", "rr_param", "xyz")
...
```


#### default_timeout (integer) {#default_timeout-integer}


若未设置自定义超时，则为默认的对话超时（单位为秒）。


*默认值为 "43200 (12 hours)"。*


```opensips title="Set default_timeout parameter"
...
modparam("dialog", "default_timeout", 21600)
...
```


#### dlg_extra_hdrs (string)


一个字符串，包含要添加到模块生成的请求（如 BYE）中的
额外头域（完整格式，带有 EOH）。


*默认值为 "NULL"。*


```opensips title="Set dlf_extra_hdrs parameter"
...
modparam("dialog", "dlg_extra_hdrs", "Hint: credit expired\r\n")
...
```


#### dlg_match_mode (integer) {#dlg_match_mode-integer}


后续请求应如何与已知对话匹配。
这些模式是以下两种匹配方式的组合：基于存储在 Record-Route 头域中
作为 cookie 的 cookie（DID）的匹配，以及基于 SIP
元素（如 RFC3261 中所述）的匹配。


支持的模式有：


- *0 - DID_ONLY* - 仅基于 DID
进行匹配；
- *1 - DID_FALLBACK* - 首先
基于 DID 尝试匹配，如果不存在，则回退到
SIP 匹配；
- *2 - DID_NONE* - 仅基于 SIP 元素
进行匹配；RR 中不添加任何 DID 信息。


*默认值为 "1 (DID_FALLBACK)"。*


请注意，如果你的 OpenSIPS 服务器存在呼叫环路（即多次
经过同一个 OpenSIPS 实例），强烈
建议只使用 DID_ONLY 模式，因为基于 SIP 的匹配
行为未定义——从 SIP 角度看，一个后续
对话会与呼叫的所有环路匹配，因为 Call-ID、To 和
From TAG 都相同。


```opensips title="Set dlg_match_mode parameter"
...
modparam("dialog", "dlg_match_mode", 0)
...
```


#### delete_delay (integer) {#delete_delay-integer}


在对话终止之后延迟从内存中删除 / 移除该对话的
间隔（秒）。一旦终止，对话将
保持在只读状态（不执行动作、不做变更），但仍
能够匹配并路由迟到的对话内请求。


该全局值可通过
[$DLG_del_delay](#dlg_del_delay) 脚本变量按呼叫修改。


*默认值为 "0"（禁用）。*


```opensips title="Set delete_delay parameter"
...
modparam("dialog", "delete_delay", 10)
...
```


#### db_url (string)


如果你想将对话的信息存储在数据库中，
必须指定数据库 URL。


*默认值为 "mysql://opensips:opensipsrw@localhost/opensips"。*


```opensips title="Set db_url parameter"
...
modparam("dialog", "db_url", "dbdriver://username:password@dbhost/dbname")
...
```


#### db_mode (integer)


描述如何将内存中的对话信息推送到数据库。


支持的模式有：


- *0 - NO_DB* - 内存内容不会
刷入数据库；
- *1 - REALTIME* - 任何对话信息
变更都会立即反映到数据库中。
- *2 - DELAYED* - 对话信息
变更将基于定时器例程定期刷入数据库。
- *3 - SHUTDOWN* - 对话信息
仅在关闭时刷入数据库 - 运行时不更新。


*默认值为 "0"。*


```opensips title="Set db_mode parameter"
...
modparam("dialog", "db_mode", 1)
...
```


#### db_update_period (integer)


如果你选择以给定间隔存储对话信息，则为更新对话信息的时间间隔（秒）。
间隔太短会产生密集的数据库操作，太长则无法感知短对话。


*默认值为 "60"。*


```opensips title="Set db_update_period parameter"
...
modparam("dialog", "db_update_period", 120)
...
```


#### options_ping_interval (integer)


OpenSIPS 为一方或双方
生成对话内 OPTIONS ping 的时间间隔（秒）。


*默认值为 "30"。*


```opensips title="Set options_ping_interval parameter"
...
modparam("dialog", "options_ping_interval", 20)
...
```


#### reinvite_ping_interval (integer)


OpenSIPS 为一方或双方
生成对话内 Re-INVITE ping 的时间间隔（秒）。


**重要：** ping 超时检测是在该间隔每次
触发时执行的，而不是在 re-INVITE 事务超时时执行！因此，请
确保 re-INVITE 事务的超时（例如 "tm" 模块的 "fr_timeout"
modparam 或其 $T_fr_timeout 变量）始终**低于**该
参数的值！未能确保这种超时顺序，可能
导致 re-INVITE ping 永远无法结束已断开的对话，因为 ping
在有机会正确超时之前就被重试了。


*默认值为 "300"。*


```opensips title="Set reinvite_ping_interval parameter"
...
modparam("dialog", "reinvite_ping_interval", 600)
...
```


#### table_name (string)


如果你想将对话的信息存储在数据库中，
必须指定表名。


*默认值为 "dialog"。*


```opensips title="Set table_name parameter"
...
modparam("dialog", "table_name", "my_dialog")
...
```


#### call_id_column (string)


数据库中用于存储对话 callid 的列名。


*默认值为 "callid"。*


```opensips title="Set call_id_column parameter"
...
modparam("dialog", "call_id_column", "callid_c_name")
...
```


#### from_uri_column (string)


数据库中用于存储主叫方
SIP 地址的列名。


*默认值为 "from_uri"。*


```opensips title="Set from_uri_column parameter"
...
modparam("dialog", "from_uri_column", "from_uri_c_name")
...
```


#### from_tag_column (string)


数据库中用于存储 Invite 请求中
From tag 的列名。


*默认值为 "from_tag"。*


```opensips title="Set from_tag_column parameter"
...
modparam("dialog", "from_tag_column", "from_tag_c_name")
...
```


#### to_uri_column (string)


数据库中用于存储被叫方 SIP 地址的列名。


*默认值为 "to_uri"。*


```opensips title="Set to_uri_column parameter"
...
modparam("dialog", "to_uri_column", "to_uri_c_name")
...
```


#### to_tag_column (string)


数据库中用于存储对 Invite 请求的 200 OK 应答中
To tag（如果存在）的列名。


*默认值为 "to_tag"。*


```opensips title="Set to_tag_column parameter"
...
modparam("dialog", "to_tag_column", "to_tag_c_name")
...
```


#### from_cseq_column (string)


数据库中用于存储主叫侧
cseq 的列名。


*默认值为 "caller_cseq"。*


```opensips title="Set from_cseq_column parameter"
...
modparam("dialog", "from_cseq_column", "from_cseq_c_name")
...
```


#### to_cseq_column (string)


数据库中用于存储被叫侧
cseq 的列名。


*默认值为 "callee_cseq"。*


```opensips title="Set to_cseq_column parameter"
...
modparam("dialog", "to_cseq_column", "to_cseq_c_name")
...
```


#### from_route_column (string)


数据库中用于存储主叫侧
路由记录（代理到主叫）的列名。


*默认值为 "caller_route_set"。*


```opensips title="Set from_route_column parameter"
...
modparam("dialog", "from_route_column", "from_route_c_name")
...
```


#### to_route_column (string)


数据库中用于存储被叫侧
路由记录（代理到被叫）的列名。


*默认值为 "callee_route_set"。*


```opensips title="Set to_route_column parameter"
...
modparam("dialog", "to_route_column", "to_route_c_name")
...
```


#### from_contact_column (string)


数据库中用于存储主叫方 contact
URI 的列名。


*默认值为 "caller_contact"。*


```opensips title="Set from_contact_column parameter"
...
modparam("dialog", "from_contact_column", "from_contact_c_name")
...
```


#### to_contact_column (string)


数据库中用于存储被叫方 contact
URI 的列名。


*默认值为 "callee_contact"。*


```opensips title="Set to_contact_column parameter"
...
modparam("dialog", "to_contact_column", "to_contact_c_name")
...
```


#### from_sock_column (string)


数据库中用于存储关于接收来自主叫的流量的
本地接口的列名。


*默认值为 "caller_sock"。*


```opensips title="Set from_sock_column parameter"
...
modparam("dialog", "from_sock_column", "from_sock_c_name")
...
```


#### to_sock_column (string)


数据库中用于存储关于接收来自被叫的流量的
本地接口的列名。


*默认值为 "callee_sock"。*


```opensips title="Set to_sock_column parameter"
...
modparam("dialog", "to_sock_column", "to_sock_c_name")
...
```


#### dlg_id_column (string)


数据库中用于存储对话
id 信息的列名。


*默认值为 "dlg_id"。*


```opensips title="Set dlg_id_column parameter"
...
modparam("dialog", "dlg_id_column", "dlg_id_c_name")
...
```


#### state_column (string)


数据库中用于存储
对话状态信息的列名。


*默认值为 "state"。*


```opensips title="Set state_column parameter"
...
modparam("dialog", "state_column", "state_c_name")
...
```


#### start_time_column (string)


数据库中用于存储
对话启动时间信息的列名。


*默认值为 "start_time"。*


```opensips title="Set start_time_column parameter"
...
modparam("dialog", "start_time_column", "start_time_c_name")
...
```


#### timeout_column (string)


数据库中用于存储对话超时的列名。


*默认值为 "timeout"。*


```opensips title="Set timeout_column parameter"
...
modparam("dialog", "timeout_column", "timeout_c_name")
...
```


#### profiles_column (string)


数据库中用于存储对话剖析的列名。


*默认值为 "profiles"。*


```opensips title="Set profiles_column parameter"
...
modparam("dialog", "profiles_column", "profiles_c_name")
...
```


#### vars_column (string)


数据库中用于存储对话变量的列名。


*默认值为 "vars"。*


```opensips title="Set vars_column parameter"
...
modparam("dialog", "vars_column", "vars_c_name")
...
```


#### sflags_column (string)


数据库中用于存储对话脚本标志位的列名。


*默认值为 "script_flags"。*


```opensips title="Set sflags_column parameter"
...
modparam("dialog", "sflags_column", "sflags_c_name")
...
```


#### mflags_column (string)


数据库中用于存储对话模块标志位的列名。


*默认值为 "module_flags"。*


```opensips title="Set mflags_column parameter"
...
modparam("dialog", "mflags_column", "mflags_c_name")
...
```


#### flags_column (string)


数据库中用于存储对话标志位的列名。


*默认值为 "flags"。*


```opensips title="Set flags_column parameter"
...
modparam("dialog", "flags_column", "flags_c_name")
...
```


#### profiles_with_value (string)


带值剖析的名称列表（字母数字/-/_）。标志
*/b* 或 */s* 分别允许通过 clusterer 模块或
CacheDB 后端在 OpenSIPS 实例之间共享
剖析。


*默认值为 "empty"。*


```opensips title="Set profiles_with_value parameter"
...
modparam("dialog", "profiles_with_value", "callerCC; gatewayCC; clientChannels/s; codecUsed/b;")
...
```


#### profiles_no_value (string)


不带值剖析的名称列表（字母数字/-/_）。标志
*/b* 或 */s* 分别允许通过 clusterer 模块或
CacheDB 后端在 OpenSIPS 实例之间共享
剖析。


*默认值为 "empty"。*


```opensips title="Set profiles_no_value parameter"
...
modparam("dialog", "profiles_no_value", "inbound ; outbound ; shared/s; repl/b;")
...
```


#### db_flush_vals_profiles (int)


将对话的值、剖析和标志位连同其他对话状态信息
一起推送到数据库（见 db_mode 1 和 2）。


*默认值为 "empty"。*


```opensips title="Set db_flush_vals_profiles parameter"
...
modparam("dialog", "db_flush_vals_profiles", 1)
...
```


#### timer_bulk_del_no (int)


应从数据库后端同时（单个查询）
尝试删除的对话数量。


*默认值为 "1"。*


```opensips title="Set timer_bulk_del_no parameter"
...
modparam("dialog", "timer_bulk_del_no", 10)
...
```


#### race_condition_timeout (int)


如果对话使用 'E' 标志创建，并且发生 SIP 竞态条件，则该对话将在 'race_condition_timeout' 秒后终止。
目前支持的竞态条件只有（200OK vs CANCEL）和（early BYE vs 200OK）


*默认值为 "5" 秒。*


```opensips title="Set race_condition_timeout parameter"
...
modparam("dialog", "race_condition_timeout", 1)
...
```


#### cachedb_url (string)


启用分布式对话剖析，并指定
CacheDB 接口应使用的后端。


*默认值为 "empty"。*


```opensips title="Set cachedb_url parameter"
...
modparam("dialog", "cachedb_url", "redis://127.0.0.1:6379")
...
```


#### profile_value_prefix (string)


指定带值剖析插入 CacheDB 后端时
应添加的前缀。这
仅在启用分布式剖析时使用。


*默认值为 "dlg_val_"。*


```opensips title="Set profile_value_prefix parameter"
...
modparam("dialog", "profile_value_prefix", "dlgv_")
...
```


#### profile_no_value_prefix (string)


指定不带值剖析插入 CacheDB 后端时
应添加的前缀。这
仅在启用分布式剖析时使用。


*默认值为 "dlg_noval_"。*


```opensips title="Set profile_no_value_prefix parameter"
...
modparam("dialog", "profile_no_value_prefix", "dlgnv_")
...
```


#### profile_size_prefix (string)


指定 CacheDB 后端中保存带值剖析大小的
实体应添加的前缀。这
仅在启用分布式剖析时使用。


*默认值为 "dlg_size_"。*


```opensips title="Set profile_size_prefix parameter"
...
modparam("dialog", "profile_size_prefix", "dlgs_")
...
```


#### profile_timeout (int)


指定对话剖析在 CacheDB 中应保留多久
直到过期。这仅在启用分布式剖析时
使用。


*默认值为 "86400"。*


```opensips title="Set profile_timeout parameter"
...
modparam("dialog", "profile_timeout", "43200")
...
```


#### dialog_replication_cluster (int) {#dialog_replication_cluster-int}


指定使用 *clusterer* 模块进行对话复制的
集群 ID。这会启用
集群中所有与对话相关事件（创建、更新和
删除）的发送与接收。


该 OpenSIPS 集群公开 **"dialog-dlg-repl"**
能力，以便将节点标记为有资格在任意同步请求期间成为
数据提供者。因此，集群必须将*至少
一个节点*的 *clusterer.flags* 列/属性标记为 **"seed"**
值，才能完全正常工作。
更多细节请参阅 [clusterer - Capabilities](/zh/modules/clusterer#capabilities-layer)
章节。


*默认值为 "0"（不复制）。*


```opensips title="Set dialog_replication_cluster parameter"
...
modparam("dialog", "dialog_replication_cluster", 1)
...
```


#### profile_replication_cluster (int)


指定使用 *clusterer* 模块进行剖析复制的
集群 ID。这会启用
集群中剖析信息（值、对话计数）的发送与
接收。


*默认值为 "0"（不复制）。*


```opensips title="Set profile_replication_cluster parameter"
...
modparam("dialog", "profile_replication_cluster", 1)
...
```


#### replicate_profiles_buffer (integer)


用于指定二进制复制所用缓冲区的长度，
单位为字节。通常该值应足够大以容纳
尽可能多的数据，但又足够小以避免 UDP
分片。推荐值是所有复制实例之间
最小的 MTU。


*默认值为 1400 字节。*


```opensips title="Set replicate_profiles_buffer parameter"
...
modparam("dialog", "replicate_profiles_buffer", 500)
...
```


#### replicate_profiles_check (integer)


定时器（秒），用于指定模块应多久检查一次
旧的已复制剖析值是否已过时并应被移除。
应向其他实例复制其剖析。


*默认值为 10 秒。*


```opensips title="Set replicate_profiles_check parameter"
...
modparam("dialog", "replicate_profiles_check", 100)
...
```


#### replicate_profiles_timer (integer)


定时器（毫秒），用于指定模块应多久
将其剖析复制到其他实例。


*默认值为 200 毫秒。*


```opensips title="Set replicate_profiles_timer parameter"
...
modparam("dialog", "replicate_profiles_timer", 100)
...
```


#### replicate_profiles_expire (integer)


定时器（秒），用于指定从其他实例收到的
剖析计数器何时不再被计入。
这用于在某个实例停止复制其计数器时防止
出现过时的值。


*默认值为 10 秒。*


```opensips title="Set replicate_profiles_expire parameter"
...
modparam("dialog", "replicate_profiles_expire", 10)
...
```


#### cluster_auto_sync (integer)


指定当节点变为可达时，是否自动发起同步请求
（针对标记为 backup 状态共享标签的对话）。
值为 *1* 表示启用，*0*
表示禁用。


*默认值为 1（启用）。*


```opensips title="Set cluster_auto_sync parameter"
...
modparam("dialog", "cluster_auto_sync", 0)
...
```


### 导出函数 {#exported-functions}


#### create_dialog([flags])


该函数为当前处理的请求创建对话。该
请求必须是初始请求。

可选地，该函数还接收一个字符串参数，用于指定
对当前对话要执行的特定行为。


参数：


- *flags (string, optional)*
此处可能的值有：
	- B - 到达对话生命周期时，将双向触发
	BYE
	- P - 每隔 options_ping_interval 秒用 OPTIONS 消息
	ping 主叫侧一次
	- p - 每隔 options_ping_interval 秒用 OPTIONS 消息
	ping 被叫侧一次
	- R - 每隔 reinvite_ping_interval 秒用 RE-INVITE 消息
	ping 主叫侧一次
	- r - 每隔 reinvite_ping_interval 秒用 RE-INVITE 消息
	ping 被叫侧一次
	- E - 检测到 SIP 竞态条件（见 RFC 5407）时，
	在 race_condition_timeout 秒后结束呼叫

	可以同时使用多个字符串标志位，
	即传入 "BPp" 将启用全部 3 个标志位。


> [!NOTE]
> 对于单个对话分支，不能同时启用 RE-INVITE 和 OPTIONS 两种 ping。
> 如果同时提供两个标志位（"*PR*" 或
> "*pr*"），将只使用 RE-INVITE ping。


如果对话创建成功，或该对话此前已创建，函数返回
true。


该函数可在 REQUEST_ROUTE 中使用。


```opensips title="create_dialog() usage"
...
create_dialog();
...
#ping 主叫
create_dialog("P");
...
#ping 主叫和被叫
create_dialog("Pp");

#超时后发送 bye
create_dialog("B");
...
```


#### match_dialog([dlg_match_mode])


该函数用于将一个后续（对话内）请求
匹配到一个进行中的对话。


默认情况下，对话匹配按照
[dlg_match_mode](#dlg_match_mode-integer) 模块参数执行。可通过指定可选的
"dlg_match_mode" 参数来强制使用特定的
匹配模式。该参数的
可能值为 "DID_ONLY"、"DID_FALLBACK" 和 "DID_NONE"。


由于在脚本中执行 "loose_route()" 时后续请求会自动匹配到对话，
该函数旨在：
(A) 控制脚本中执行对话匹配的位置，
(B) 处理没有 Route 头域的伪后续请求，使它们
不由 loose_route() 处理。


参数：


- *dlg_match_mode (string, optional)*


如果请求存在对应的对话，函数返回 true。


该函数可在 REQUEST_ROUTE 中使用。


```opensips title="match_dialog() usage"
...
    if (has_totag()) {
        loose_route();

        # 示例 1：按 dlg_match_mode 匹配
        if ($DLG_status == NULL && !match_dialog())
            xlog("cannot match request to a dialog\n");

        # 示例 2：覆盖 dlg_match_mode
        if ($DLG_status == NULL && !match_dialog("DID_FALLBACK"))
            xlog("cannot match request to a dialog\n");
    }
...
```


#### validate_dialog()


该函数将当前收到的请求与其所属的对话
（内部数据）进行校验。
通过执行若干测试，该函数有助于检测注入的
伪对话内请求（如恶意的 BYE）。


所执行的测试涉及 CSEQ 序列检查和路由
信息检查（contact 与 route set）。


如果请求存在对应的对话且请求有效（依据对话数据），函数返回
true。如果请求无效，
则返回以下返回码：


- *-1* - 无效的 cseq
- *-2* - 无效的 remote target
- *-3* - 无效的 route set
- *-4* - 其他错误（解析、无对话等）


该函数可在 REQUEST_ROUTE 中使用。


```opensips title="validate_dialog() usage"
...
    if (has_totag()) {
        loose_route();
        if ($DLG_status!=NULL && !validate_dialog() ) {
            xlog(" in-dialog bogus request \n");
        } else {
            xlog(" in-dialog valid request - $DLG_dir !\n");
        }
    }
...
```


#### fix_route_dialog()


该函数强制对话内 SIP 消息包含 ruri、route 头域和
dst_uri，与其所属对话的内部数据一致。
该函数可防止存在注入的伪对话内
请求（如恶意的 BYE）


该函数可在 REQUEST_ROUTE 中使用。


```opensips title="fix_route_dialog() usage"
...
    if (has_totag()) {
        loose_route();
        if ($DLG_status!=NULL)
            if (!validate_dialog())
                fix_route_dialog();
    }
...
```


#### get_dialog_info(attr,avp,key,key_val,no_dlgs)


该函数从另一个对话中提取对话值。它首先遍历
所有现有（进行中）对话，查找所有具有名为 "key"
且值为 "key_val" 的对话变量的对话
（即 $dlg_val(key)=="key_val" 的对话）。如果找到，则将
所有找到的对话中名为 "attr" 的对话变量的值
写入 "avp" 伪变量，否则不向 "avp" 写入任何内容，
并返回负的错误码。


> [!NOTE]
> 该函数不要求在对话上下文中调用——你可以在任何时候 / 任何位置
> 用它搜索其他对话。


各参数的含义如下：


- *attr (string)* - 要返回的对话变量名
（来自找到的对话）；
- *avp (var)* - 用于存储 "attr" 对话变量值的
AVP。
由于函数会遍历所有对话，这必须是一个真正的
AVP，以支持推送所有匹配对话的值。
- *key (string)* - 用作搜索键的对话变量名
（在查找目标对话时）
- *key_val (var)* - 作为键用于搜索目标对话的
对话变量值。
- *no_dlgs (var)* - 包含该键变量的对话
总数


该函数可在所有路由中使用。


```opensips title="get_dialog_info usage"
...
if ( get_dialog_info("callee",$avp(callee_array),"caller",$fu,$var(dlg_no)) ) {
	xlog("caller $fu has $var(dlg_no) other ongoing calls, talking with :");	
	$var(it) = 0;
	while ($var(it) < $var(dlg_no)) {
		$var(current_callee) = $(avp(callee_array)[$var(it)]);
		xlog(" $var(current_callee) ");
		$var(it) = $var(it) + 1;
	}

	xlog("\n");
}

# 为当前呼叫创建对话，并放置主叫和被叫属性
create_dialog();
$dlg_val(caller) = $fu;
$dlg_val(callee) = $ru;
...
```


#### get_dialog_vals(names,vals,callid)


该函数获取另一个对话的所有对话变量。
它首先依据给定的 SIP CallID 遍历所有现有（进行中）
对话。如果找到，则将全部对话变量作为
两个并行的名称数组和值数组返回（使用给定的变量
"names" 和 "vals"）。由于这些变量必须保存数组，它们必须是
AVP。


> [!NOTE]
> 该函数不要求在对话上下文中调用——你可以在任何时候 / 任何位置
> 用它搜索其他对话。


各参数的含义如下：


- *names (var)* - 用于保存找到的对话中
所有变量名的 AVP 变量。
- *vals (var)* - 用于保存找到的对话中
所有变量值的 AVP 变量。
- *callid (string)* - 要搜索（并获取其变量）的
对话的 callid。


该函数可在任意类型的路由中使用。


```opensips title="get_dialog_vals usage"
...
if ( get_dialog_vals($avp(d_names),$avp(d_vals),$var(callid)) ) {
	xlog("the call $var(callid) has the variables:\n);
	$var(i) = 0;
	while ( $(avp(d_names)[$var(i)])!=NULL ) {
		xlog("var $var(i) is $(avp(d_names)[$var(i)])='$(avp(d_vals)[$var(i)])'\n");
		$var(i) = $var(i) + 1;
	}
}
...
```


#### get_dialogs_by_val(name,value,out_avp,out_dlg_no)


该函数在整个对话表中查找包含具有所提供名称和值的 $dlg_val 的对话，并返回匹配对话的所有 $DLG_ctx_json 变量，将它们存储在所提供的 out_avp 中。匹配的对话总数在 out_dlgs_no 变量中返回


> [!NOTE]
> 该函数不要求在对话上下文中调用——你可以在任何时候 / 任何位置
> 用它搜索其他对话。


各参数的含义如下：


- *name (string)* - 用于查找的对话变量名
- *value (var)* - 上述对话值的值
- *out_avp (var)* - 将被填充所有匹配呼叫的对话 JSON 的 AVP
- *dlg_no (var)* - 用于返回匹配对话总数的输出变量


该函数可在任意类型的路由中使用。


```opensips title="get_dialog_vals usage"
...
if ( get_dialogs_by_val("caller",$fU,$avp(dlg_jsons),$avp(dlg_no)) ) {
	xlog("Caller $fU has $avp(dlg_no) other calls \n);
	$var(i) = 0;
	while ( $(avp(dlg_jsons)[$var(i)])!=NULL ) {
		$json(dlg_info) := $(avp(dlg_jsons)[$var(i)]); 
		# fetch any info for the above call and process it
		$var(i) = $var(i) + 1;
	}
}
...
```


#### get_dialogs_by_profile(name,value,out_avp,out_dlg_no)


该函数在整个对话表中查找配置为属于所提供对话剖析名、并可选具有所提供剖析值的对话。该函数返回匹配对话的所有 $DLG_ctx_json 变量，将它们存储在所提供的 out_avp 中。匹配的对话总数在 out_dlgs_no 变量中返回


> [!NOTE]
> 该函数不要求在对话上下文中调用——你可以在任何时候 / 任何位置
> 用它搜索其他对话。


各参数的含义如下：


- *name (string)* - 用于查找的对话剖析名
- *value (string)* - 上述对话剖析的值（可选）
- *out_avp (var)* - 将被填充所有匹配呼叫的对话 JSON 的 AVP
- *dlg_no (var)* - 用于返回匹配对话总数的输出变量


该函数可在任意类型的路由中使用。


```opensips title="get_dialog_vals usage"
...
if ( get_dialogs_by_profile("caller",$fU,$avp(dlg_jsons),$avp(dlg_no)) ) {
	xlog("Caller $fU has $avp(dlg_no) other calls \n);
	$var(i) = 0;
	while ( $(avp(dlg_jsons)[$var(i)])!=NULL ) {
		$json(dlg_info) := $(avp(dlg_jsons)[$var(i)]); 
		# fetch any info for the above call and process it
		$var(i) = $var(i) + 1;
	}
}
...
```


#### load_dialog_ctx( dialog [, id_type]) {#load_dialog_ctx-dialog--id_type}


该函数加载并切换到给定对话的上下文。
对话的上下文由对话标志位、变量、
剖析以及与对话相关的任何其他值/状态给出。通过
切换到另一个对话的上下文，在脚本层面，你默认会看到
来自新对话的所有数据。


> [!NOTE]
> 在执行卸载之前，你不能再执行新的加载——不支持嵌套
> 加载。


各参数的含义如下：


- *dialog (string)* - 要加载的对话
标识符，可以是 SIP Call-ID 或 Dialog ID。
- *id_type (string,optional)* - 第一个参数中
使用的是哪种对话标识。可以是
*callid*（SIP Call-ID）或
*did*（内部 Dialog ID）。默认将
假定为 callid。


该函数可在任意类型的路由中使用。


```opensips title="load_dialog_ctx usage"
...
if (load_dialog_ctx("$var(callid)")) {
	xlog("The dialog '$var(callid)' already has a duration "
	     "of $DLG_lifetime seconds\n");
	if (is_in_profile("inboundCall"))
		xlog("this dialog is an inbound call\n");
	unload_dialog_ctx();
}
...
```


#### unload_dialog_ctx()


该函数卸载已加载的另一个对话的上下文，恢复
在执行加载之前存在的对话上下文。


> [!NOTE]
> 你必须从脚本中对每一次加载显式执行卸载，
> 否则已加载的对话将永远挂起。


该函数可在任意类型的路由中使用。


使用示例见 [load dialog ctx](#load_dialog_ctx-dialog--id_type)


#### set_dlg_profile(profile, [value], [clear_values])


将当前对话插入剖析。注意，如果该剖析
不支持值，此操作将被静默丢弃。同一对话可以
多次插入同一剖析。


> [!NOTE]
> 必须先创建对话才能使用该函数（在此之前先使用
> create_dialog() 函数）。


各参数的含义如下：


- *profile (string)* - 要添加到的剖析名。
- *value (string, optional)* - 用于定义对话对剖析归属的
字符串值——注意该
剖析必须支持值。
- *clear_values (boolean, optional)* - 如果设为
*true*（1），则在设置给定值之前将清除该剖析的
所有值。默认：*false*。


该函数可在 REQUEST_ROUTE、BRANCH_ROUTE、
REPLY_ROUTE 和 FAILURE_ROUTE 中使用。


```opensips title="set_dlg_profile usage"
...
set_dlg_profile("inboundCall");

# 设置一个新值（保留所有其他值不变）
set_dlg_profile("caller", $fu);

# 设置一个新值，同时移除所有先前值
set_dlg_profile("caller", $fu, true);
...
```


#### unset_dlg_profile(profile, [value])


从剖析中移除当前对话。


> [!NOTE] 
> 必须先创建对话才能使用该函数（在此之前先使用
> create_dialog() 函数）。


各参数的含义如下：


- *profile (string)* - 要从中移除的剖析名。
- *value (string, optional)* - 用于定义对话对剖析归属的
字符串值——注意该
剖析必须支持值。
3.4 新增：对于带值剖析，省略该参数
现在可以清除给定剖析的所有值。


该函数可在 REQUEST_ROUTE、BRANCH_ROUTE、
REPLY_ROUTE 和 FAILURE_ROUTE 中使用。


```opensips title="unset_dlg_profile usage"
...
unset_dlg_profile("inboundCall");
unset_dlg_profile("caller", $fu);
...
# 移除剖析中的所有值
unset_dlg_profile("caller");
...
```


#### is_in_profile(profile,[value])


检查当前对话是否属于某个剖析。如果该剖析
支持值，可以加强检查以考虑
特定值——即对话是否以特定值插入到该剖析。
如果未传值，则仅检查对话对剖析的
简单归属。注意，如果该剖析不
支持值，此操作将被静默丢弃。


> [!NOTE]
> 必须先创建对话才能使用该函数（在此之前先使用
> create_dialog() 函数）。


各参数的含义如下：


- *profile (string)* - 用于检查的剖析名。
- *value (string. optional)* - 用于加强检查的
字符串值。


该函数可在 REQUEST_ROUTE、BRANCH_ROUTE、
REPLY_ROUTE 和 FAILURE_ROUTE 中使用。


```opensips title="is_in_profile usage"
...
if (is_in_profile("inboundCall")) {
	log("this request belongs to a inbound call\n");
}
...
if (is_in_profile("caller","XX")) {
	log("this request belongs to a call of user XX\n");
}
...
```


#### get_profile_size(profile,[value],size)


返回属于某个剖析的对话数量。如果该剖析
支持值，可以加强检查以考虑
特定值——有多少对话是以特定值插入到该剖析中。
如果未传值，则仅检查对话对
剖析的简单归属。注意，如果该剖析不
支持值，此操作将被静默丢弃。


各参数的含义如下：


- *profile (string)* - 要获取其大小的剖析名。
- *value (string, optional)* - 用于加强检查的
字符串值。
- *size (var)* - 用于返回剖析大小的 AVP 或
脚本变量。


该函数可在 REQUEST_ROUTE、BRANCH_ROUTE、
REPLY_ROUTE 和 FAILURE_ROUTE 中使用。


```opensips title="get_profile_size usage"
modparam("dialog", "profiles_no_value", "inboundCalls")
modparam("dialog", "profiles_with_value", "caller")
...
get_profile_size("inboundCalls",,$var(size));
xlog("inboundCalls: $var(size)\n");
...
get_profile_size("caller", $fu, $var(size));
xlog("currently, the user $fu has $var(size) active outgoing calls\n");
...
```


#### set_dlg_flag(flag)


将名为 *flag* 的对话标志位设为 true。对话
标志位在对话内持久存在，对于属于该对话的
所有请求都可访问（设置和测试）。


参数：


- *flag (string, static)* - 标志位名称。


> [!NOTE]
> 必须先创建对话才能使用该函数（在此之前先使用
> create_dialog() 函数）。


该函数可在 REQUEST_ROUTE、BRANCH_ROUTE、
REPLY_ROUTE 和 FAILURE_ROUTE 中使用。


```opensips title="set_dlg_flag usage"
...
set_dlg_flag("MY_DLG_FLAG");
...
```


#### test_and_set_dlg_flag(flag, value)


原子地检查名为 *flag* 的对话标志位是否
等于 *value*。如果相等，则将值改为
相反值。该操作在对话锁保护下完成。


- *flag (string, static)* - 标志位名称。
- *value (int)* - 该值应为 0（false）或 1（true）。


> [!NOTE]
> 必须先创建对话才能使用该函数（在此之前先使用
> create_dialog() 函数）。


该函数可在 REQUEST_ROUTE、BRANCH_ROUTE、
REPLY_ROUTE 和 FAILURE_ROUTE 中使用。


```opensips title="test_and_set_dlg_flag usage"
...
test_and_set_dlg_flag("MY_DLG_FLAG", 0);
...
```


#### reset_dlg_flag(flag)


将名为 *flag* 的对话标志位重置为 false。
对话标志位在对话内持久存在，对于属于该对话的
所有请求都可访问（设置和测试）。


参数：


- *flag (string, static)* - 标志位名称。


> [!NOTE]
> 必须先创建对话才能使用该函数（在此之前先使用
> create_dialog() 函数）。


该函数可在 REQUEST_ROUTE、BRANCH_ROUTE、
REPLY_ROUTE 和 FAILURE_ROUTE 中使用。


```opensips title="reset_dlg_flag usage"
...
reset_dlg_flag("MY_DLG_FLAG");
...
```


#### is_dlg_flag_set(flag)


如果名为 *flag* 的对话标志位已设置，则返回 true。
对话标志位在对话内持久存在，对于属于该对话的
所有请求都可访问（设置和测试）。


参数：


- *flag (string, static)* - 标志位名称。


> [!NOTE]
> 必须先创建对话才能使用该函数（在此之前先使用
> create_dialog() 函数）。


该函数可在 REQUEST_ROUTE、BRANCH_ROUTE、
REPLY_ROUTE 和 FAILURE_ROUTE 中使用。


```opensips title="is_dlg_flag_set usage"
...
if (is_dlg_flag_set("MY_DLG_FLAG")) {
	xlog("dialog flag MY_DLG_FLAG is set\n");
}
...
```


#### store_dlg_value(name,val)


将以 *name* 为名、来自变量 *val* 的值附加到
对话上。附加到对话的值在对话内
持久存在，对于属于该对话的所有请求都可访问
（读和写）。


参数：


- *name (string)*
- *val (var)*


> [!NOTE]
> 必须先创建对话才能使用该函数（在此之前先使用
> create_dialog() 函数）。


通过给伪变量 *$dlg_val(name)* 赋值也可获得
相同的功能。


该函数可在 REQUEST_ROUTE、BRANCH_ROUTE、
REPLY_ROUTE 和 FAILURE_ROUTE 中使用。


```opensips title="store_dlg_value usage"
...
store_dlg_value("inv_src_ip",$si);
store_dlg_value("account type",$var(account));
# 或者
$dlg_val(account_type) = "prepaid";
...
```


#### fetch_dlg_value(name,val)


从对话中获取名为 *name* 的属性值。
附加到对话的值在对话内
持久存在，对于属于该对话的所有请求都可访问
（读和写）。


参数：


- *name (string)*
- *val (var)*


> [!NOTE]
> 必须先创建对话才能使用该函数（在此之前先使用
> create_dialog() 函数）。


通过读取伪变量 *$dlg_val(name)* 也可获得
相同的功能。


该函数可在 REQUEST_ROUTE、BRANCH_ROUTE、
REPLY_ROUTE 和 FAILURE_ROUTE 中使用。


```opensips title="fetch_dlg_value usage"
...
fetch_dlg_value("inv_src_ip",$avp(2));
fetch_dlg_value("account type",$var(account));
# 或者
$var(account) = $dlg_val(account_type);
...
```


#### set_dlg_sharing_tag(tag_name)


用共享标签 *tag_name* 标记当前对话。
从此刻起，诸如对话内 ping、超时发送 BYE 等动作
将取决于标签状态（"backup" 状态时不执行动作，
"active" 状态时正常运作）。


更多细节见 [dialog clustering](#dialog-clustering) 章节。


参数：


- *tag_name (string)*


> [!NOTE]
> 必须先创建对话才能使用该函数（在此之前先使用
> create_dialog() 函数）。


该函数可在 REQUEST_ROUTE、BRANCH_ROUTE、
REPLY_ROUTE 和 FAILURE_ROUTE 中使用。


```opensips title="set_dlg_sharing_tag usage"
...
set_dlg_sharing_tag("vip1");
...
```


#### dlg_on_answer([route_name])


该函数挂载一个脚本路由，在当前
对话稍后被应答时执行。当该路由执行时，
对话上下文将被暴露，但不带有效 SIP 消息（只是一个
伪消息）。


你必须在创建对话之后、对话被应答之前
使用该函数。


如果缺少参数，该函数会重置先前设置的任何
路由；将不会触发。


参数：


- *route_name (string,optional)* - 要执行的
脚本路由名。


该函数可在 REQUEST_ROUTE、BRANCH_ROUTE、
REPLY_ROUTE 和 FAILURE_ROUTE 中使用。


```opensips title="dlg_on_answer usage"
...
create_dialog();
dlg_on_answer("dlg_answered");
...
route[dlg_answered] {
	xlog("The dialog $DLG_did was answered\n");
}
```


#### dlg_on_timeout([route_name])


该函数挂载一个脚本路由，在当前对话
（作为时长）超时时（且如果超时）执行。当该路由
执行时，对话上下文将被暴露，但不带有效 SIP
消息（只是一个伪消息）


当该路由执行时，对话尚未终止，只是其
生命周期达到了设定上限。在超时路由中你可以增加
对话的过期超时（对话将继续），或者
让对话被终止（在该路由结束后）。


你必须在创建对话之后、对话被应答之前
使用该函数。


你必须在创建对话之后、对话被应答之前
使用该函数。


参数：


- *route_name (string,optional)* - 要执行的
脚本路由名。


该函数可在 REQUEST_ROUTE、BRANCH_ROUTE、
REPLY_ROUTE 和 FAILURE_ROUTE 中使用。


```opensips title="dlg_on_timeout usage"
...
create_dialog();
$DLG_timeout=120;
dlg_on_timeout("dlg_timeout");
...
route[dlg_timeout] {
	xlog("The dialog $DLG_did timed out\n");
	if (_some_prolongation_condition)
		$DLG_timeout = 60; # 再给它 1 分钟
}
```


#### dlg_on_hangup([route_name])


该函数挂载一个脚本路由，在当前
对话被终止时执行。当该路由执行时，
对话上下文将被暴露，但不带有效 SIP 消息（只是
一个伪消息）。注意，此时对话已经终止，除了
从其上下文读取数据之外你无能为力。


你必须在创建对话之后、对话被应答之前
使用该函数。

如果缺少参数，该函数会重置先前设置的任何
路由；将不会触发。


参数：


- *route_name (string,optional)* - 要执行的
脚本路由名。


该函数可在 REQUEST_ROUTE、BRANCH_ROUTE、
REPLY_ROUTE 和 FAILURE_ROUTE 中使用。


```opensips title="dlg_on_hangup usage"
...
create_dialog();
dlg_on_hangup("dlg_hangup");
...
route[dlg_hangup] {
	xlog("The dialog $DLG_did terminated after $DLG_lifetime secs\n");
}
```


#### dlg_send_sequential(method, leg, [, body] [, content-type] [, headers])


用于向对话的某一分支发送对话内请求。
该函数假定自己在对话上下文中运行——如果你
从不同的上下文（如 event_route）中运行它，
请确保先用
[load dialog ctx](#load_dialog_ctx-dialog--id_type) 函数加载对话上下文。


参数：


- *method (string)* -
所发送请求的方法。
- *leg (string)* - 请求
发送到的分支。必须是
*caller* 或 *callee*。
- *body (string, optional)* -
请求中发送的可选消息体。如果缺省，则不发送消息体。
- *content-type (string, optional)* -
所发送消息体的内容类型。请确保每次发送带消息体的
请求时都指定它，否则你的 UAC 很可能
会拒绝该请求。
- *headers (string, optional)* -
附加到所发送请求的额外头域。


该函数可在任意路由中使用。


```opensips title="dlg_send_sequential usage to convert DTMF codes"
...
event_route[E_RTPPROXY_DTMF] {
    if (load_dialog_ctx("$param(id)", "did")) {
        if ($param(stream) == 0) {
            $var(direction) = "callee";
        } else {
            $var(direction) = "caller";
        }
        dlg_send_sequential($var(direction), "INFO",
                "Signal=$param(digit)\nDuration=160",
                "application/dtmf-relay");
        unload_dialog_ctx();
    }
}
...
```


#### dlg_inc_cseq([tag, ][inc])


递增与由对话标签标识的分支相关联的、
对话生成的 CSeq。


参数：


- *tag (string, optional)* -
要递增其 CSeq 值的标签。如果缺省，则使用
消息的 *To* 标签来标识
要递增其 CSeq 的分支。
- *inc (integer, optional)* -
用于递增/递减（如果为负）所标识分支的 CSeq
的值。如果未使用，则将该值递增
*1*。


该函数可在 REQUEST_ROUTE、FAILURE_ROUTE、
ONREPLY_ROUTE、BRANCH_ROUTE 和 LOCAL_ROUTE 路由中使用。


```opensips title="dlg_inc_cseq usage"
...
route {
	...
	if (has_totag()) {
		if (loose_route())
			dlg_inc_cseq(); # 每个对话内请求之后递增上游 CSeq
	}
}
...
```


### 导出统计 {#exported-statistics}


#### active_dialogs


返回当前活动对话的数量（可能已确认，也可能
未确认）。


#### early_dialogs


返回早期对话的数量。


#### processed_dialogs


返回自启动以来处理过的对话总数（已终止、
已过期或活动）。


#### expired_dialogs


返回自启动以来过期对话的总数。


#### failed_dialogs


返回失败对话的数量（由于任何原因——内部错误、
否定应答、被取消等——从未建立的
对话）


#### create_sent


返回发送到其他 OpenSIPS 实例的
复制对话 **create** 请求数量。


#### update_sent


返回发送到其他 OpenSIPS 实例的
复制对话 **update** 请求数量。


#### delete_sent


返回发送到其他 OpenSIPS 实例的
复制对话 **delete** 请求数量。


#### create_recv


返回从其他 OpenSIPS 实例收到的
对话 **create** 事件数量。


#### update_recv


返回从其他 OpenSIPS 实例收到的
对话 **update** 事件数量。


#### delete_recv


返回从其他 OpenSIPS 实例收到的
对话 **delete** 事件数量。


### 导出 MI 函数 {#exported-mi-functions}


#### dlg_list


列出对话（呼叫）的描述。如果未给出参数，
将列出所有对话。如果传入对话标识符
作为参数（callid 和 fromtag），则只列出该对话。如果
传入 index 和 counter 参数，则只列出从 index（作为偏移量）
开始的 "counter" 个对话——这用于
仅获取部分对话。


名称：*dlg_list*


参数（通过对话标识）：


- *callid*（可选）- 若要列出单个
对话，则为 callid。
- *from_tag*（可选，但若没有 callid 参数则不能出现）
- 要列出的对话的 fromtag（按初始请求）。
entry


参数（通过对话计数）：


- *index* - 对话列表应开始的
偏移量。
- *counter* - 应列出多少个对话
（从该偏移量开始）


MI FIFO 命令格式：


```bash
## 列出所有进行中的对话
opensips-cli -x mi dlg_list
## 按 callid 和 From TAG 列出对话
opensips-cli -x mi dlg_list callid=abcdrssfrs122444@192.168.1.1 from_tag=AAdfeEFF33
## 列出 10 个对话，从第 40 个位置开始
## （在所有进行中对话的列表中）
opensips-cli -x mi dlg_list index=40 counter=10
```


#### dlg_list_ctx


与 "dlg_list" 相同，但在对话描述中
包含位于 dialog 模块之上的各模块所关联的
上下文。该函数还会打印对话的值。对于
二进制值，不可打印字符以十六进制表示
（例如 \x00）


名称：*dlg_list_ctx*


参数：*参见 "dlg_list"*


MI FIFO 命令格式：


```bash
opensips-cli -x mi dlg_list_ctx
```


#### dlg_end_dlg {#dlg_end_dlg}


终止一个进行中的对话。
如果对话已建立，将向两个方向发送 BYE。
如果对话处于未确认或早期状态，将向被叫侧
发送 CANCEL，这会触发被叫返回 487，
该应答被中继后也会结束
主叫侧的对话。


名称：*dlg_end_dlg*


参数为：


- *dialog_id* - 这是对话的标识
——它可以是（1）对话的唯一 ID
（如 dlg_list 所提供），也可以是（2）对话的
SIP Call-ID。
- *extra_hdrs* -（可选）包含要添加到 BYE
请求的额外头域（完整格式）的
字符串。


"dialog_id" 值可通过 "dlg_list" MI 命令获取。


MI FIFO 命令格式：


```bash
# 通过内部 Dialog-ID 终止对话
opensips-cli -x mi dlg_end_dlg 6ae.4b38d013
# 通过对话的 SIP Call-ID 终止对话
opensips-cli -x mi dlg_end_dlg Y2IwYjQ2YmE2ZDg5MWVkNDNkZGIwZjAzNGM1ZDY
```


#### profile_get_size


返回属于某个剖析的对话数量。如果该剖析
支持值，可以加强检查以考虑
特定值——有多少对话是以特定值插入到该剖析中。
如果未传值，则仅检查对话对
剖析的简单归属。注意，如果该剖析不
支持值，此操作将被静默丢弃。


名称：*profile_get_size*


参数：


- *profile* - 要获取其值的剖析名。
- *value*（可选）- 用于加强检查的
字符串值；


MI FIFO 命令格式：


```bash
opensips-cli -x mi profile_get_size inboundCalls
```


#### profile_list_dlgs


列出属于某个剖析的所有对话。如果该剖析
支持值，可以加强检查以考虑
特定值——只列出以该特定值插入到剖析中的
对话。如果未传值，则将列出属于该剖析的
所有对话。注意，如果该剖析不
支持值，此操作将被静默丢弃。此外，在使用
CacheDB 接口的共享剖析时，该命令将只
显示本地对话。


名称：*profile_list_dlgs*


参数：


- *profile* - 要列出其对话的剖析名。
- *value*（可选）- 用于加强检查的
字符串值；


MI FIFO 命令格式：


```bash
opensips-cli -x mi profile_list_dlgs inboundCalls
```


#### profile_get_values


列出属于某个剖析的所有值及其
计数。如果该剖析不支持值，将返回总计数。
注意，该函数对通过 CacheDB 接口的共享
剖析不起作用。


名称：*profile_get_values*


参数：


- *profile* - 要列出其对话的剖析名。


MI FIFO 命令格式：


```bash
opensips-cli -x mi profile_get_values inboundCalls
```


#### profile_end_dlgs


终止指定剖析中所有进行中的对话，对单个对话它
执行与命令 **[dlg_end_dlg](#dlg_end_dlg)** 相同的操作


名称：*profile_end_dlgs*


参数：


- *profile* - 其对话将被终止的剖析名
- *value* -（可选）如果该剖析支持值，则只终止
具有指定值的对话


MI FIFO 命令格式：


```bash
opensips-cli -x mi profile_end_dlgs inboundCalls
```


#### dlg_db_sync


将从数据库加载所有关于对话的信息
到 OpenSIPS 内部内存中。如果某个对话在内存中已存在
且具有相同或更早的状态，则用数据库中的值
更新它。否则，内存中较新的版本将不会被更改。


名称：*dlg_db_sync*


它不接受参数


MI FIFO 命令格式：


```bash
opensips-cli -x mi dlg_db_sync
```


#### dlg_cluster_sync


该命令仅在启用对话复制时生效。


从 [dialog_replication_cluster](#dialog_replication_cluster-int) 中一个合适的提供者
节点完全同步内存中的对话信息。内存中已存在
但未通过同步得到再次确认的对话将被
丢弃。可以指定共享标签，以便仅同步标记了该
共享标签的对话。


名称：*dlg_cluster_sync*


参数：


- *sharing_tag* - 对话为被同步而必须标记的
共享标签名


MI FIFO 命令格式：


```bash
opensips-cli -x mi dlg_cluster_sync vip1
```


#### dlg_restore_db


在可能发生失步事件后恢复对话表。
该表被截断，然后用内存中 CONFIRMED 状态的对话填充。


名称：*dlg_restore_db*


它不接受参数


MI FIFO 命令格式：


```bash
opensips-cli -x mi dlg_restore_db
```


#### list_all_profiles


列出所有对话剖析，以及 1 或 0，表示
给定剖析是否具有关联值。


名称：*list_all_profiles*


参数：*它不接受参数*


MI FIFO 命令格式：


```bash
opensips-cli -x mi list_all_profiles
```


#### dlg_push_var


为给定的对话 ID / Call-ID 列表推送或更新一个对话值。


名称：*dlg_push_var*


参数：*它接受 3 个或更多参数*


- *dlg_val_name* - 需要插入/更新的对话值名
- *dlg_val_value* - 要插入/更新的值
- *DID* - 对话标识符。可以是 $DLG_did 或实际的 Call-ID。


MI FIFO 命令格式：


```bash
		opensips-cli -x mi dlg_push_var var_name var_value DID1 [ DID2 DID3 ...  DIDN ]
		
```


#### dlg_send_sequential


在一个进行中的对话内发送一个后续请求。


名称：*dlg_send_sequential*


参数：


- *callid* - 你需要为其触发后续消息的
对话的 callid。
- *method* -（可选）用于后续消息的
方法。默认值为 *INVITE*。
- *mode* -（可选）可用于调整后续消息的
行为。*mode* 的可能值为：
	- *caller* -（默认）向主叫发送后续消息。
		该模式在高可用场景中很有用，
		例如当你想要更新上游的路由集、特别是 contact 时。
	- *callee* - 与 caller 相同，但向被叫
			发送后续消息。
	- *challenge* - 向主叫发送后续 INVITE（或 UPDATE），
		以对其通告的 SDP 消息体发起挑战（challenge）。当
		收到消息体后，将其转发给被叫。该模式在
		尝试变更两个端点（上游和下游）路由
		集时很有用。在尝试为 SDP 消息体触发
		重新协商时也很有用。
	- *challenge-caller* - 与 *challenge* 相同
	- *challenge-callee* - 与
			*challenge-caller* 相同，只是它首先对
			被叫发起挑战，而不是主叫。
- *body* -（可选）可用于为初始后续消息
指定消息体。*body* 参数的可能值为：
	- *none* -（默认）后续消息中不添加消息体。
	- *inbound* - 在所生成的后续消息体中
			通告从其对端收到的最后一个消息体。例如，
			如果 *mode=challenge-caller*，该消息将
			包含被叫发送给 OpenSIPS 的消息体。当你
			需要修改先前发送给主叫的消息体时很有用，因为
			你想为该呼叫重新协商一个不同的媒体代理。这可以通过
			在 *local_route* 中捕获所生成的请求，并重新
			接合媒体代理来实现。
	- *outbound* - 在所生成的后续消息体中
			通告发送给该 UAC 的最后一个消息体。例如，
			如果 *mode=challenge-caller*，该消息将
			包含 OpenSIPS 发送给主叫的最后一个消息体。这在
			尝试重新协商服务器 contact 的高可用场景中很有用，
			但无需修改先前发送的消息体。
	- *custom:CONTENT_TYPE:BODY* - 这可用于
				为所生成的后续消息指定特定的 Content-Type 头和
				消息体。
- *headers* -（可选）可用于为初始后续消息
指定一些头域。


该函数异步运行，并返回 *challenge* 模式或普通模式下
收到的最后一个应答的状态码和原因短语。


MI 命令格式：


```bash
opensips-cli -x mi dlg_send_sequential \
	callid=5291231-testing@127.0.0.1
```


用于触发媒体重新协商的 MI 命令：


```bash
opensips-cli -x mi dlg_send_sequential \
	callid=5291231-testing@127.0.0.1 \
	mode=challenge \
	body=inbound
```


用于在服务器故障切换后 UPDATE 被叫远端 Contact 的
MI 命令：


```bash
opensips-cli -x mi dlg_send_sequential \
	callid=5291231-testing@127.0.0.1 \
	mode=challenge-callee \
	body=outbound \
	method=UPDATE
```


用于向被叫发送 REFER 并添加 Refer-To 头域的
MI 命令：


```bash
opensips-cli -x mi dlg_send_sequential \
	callid=usR8FlGOSMfCTAIHebHCOQ.. \
	method=REFER \
	body=none \
	mode=callee \
	headers='Refer-To: sip:user@domain:50060'
```


#### set_dlg_profile


将由对话 ID / Call-ID 标识的对话设置到给定剖析中（可带可选值和清除旧剖析值）


名称：*set_dlg_profile*


参数：*它接受 2-4 个参数*


- *dlg_id* - 相应对话的对话 ID 或 Call-ID
- *profile* - 要设置的剖析名
- *value* - 可选，要设置的剖析值
- *clear_values* - 可选，在设置新值之前清除剖析中的先前值


MI FIFO 命令格式：


```bash
opensips-cli -x mi set_dlg_profile DID my_profile my_value 1
```


#### unset_dlg_profile


将由对话 ID / Call-ID 标识的对话从给定剖析中取消设置（可带可选值和清除旧剖析值）


名称：*set_dlg_profile*


参数：*它接受 2-3 个参数*


- *dlg_id* - 相应对话的对话 ID 或 Call-ID
- *profile* - 要取消设置的剖析名
- *value* - 可选，要取消设置的剖析值。对于带值剖析，省略该参数现在可以清除给定剖析的所有值。


MI FIFO 命令格式：


```bash
opensips-cli -x mi unset_dlg_profile DID my_profile my_value
```


### 导出伪变量 {#exported-pseudo-variables}


#### $DLG_count


返回当前活动对话的数量（可能已确认，也可能
未确认）。


#### $DLG_status


返回与所处理后续请求对应的对话状态。该 PV
仅对后续请求、在执行 loose_route() 之后
可用。


值可能为：


- *NULL* - 未找到对话。
- *1* - 对话未确认（已创建
但完全未收到应答）
- *2* - 对话处于早期状态（已创建，
收到临时应答，但尚未收到最终应答）
- *3* - 已由最终应答确认，但
尚未收到 ACK。
- *4* - 已由最终应答确认且
收到 ACK。
- *5* - 对话已结束。


#### $DLG_lifetime


返回与所处理后续请求对应对话的持续时长（秒）。
该时长从对话确认时计算到当前时刻。该 PV 仅
对后续请求、在执行 loose_route() 之后
可用。


如果请求没有对应的对话，则返回 NULL。


#### $DLG_flags


返回与所处理后续请求对应对话的对话标志位
（以空格分隔的标志位名称列表）。
该 PV 仅对后续请求、
在执行 loose_route() 之后可用。


如果请求没有对应的对话，则返回 NULL。


#### $DLG_dir


返回请求在对话中的方向（如果请求由被叫生成，则为 "upstream"
字符串；如果请求由主叫生成，则为 "downstream" 字符串）
——用于后续请求。
该 PV 仅对后续请求（不适用于
应答）、在执行 loose_route() 之后可用。


如果请求没有对应的对话，则返回 NULL。


#### $DLG_did


返回与
所处理后续请求对应的对话 id。输出格式为字符串，
与 dlg_list MI 函数返回的格式相同。该 PV 仅
对后续请求、在执行 loose_route() 之后可用。


如果请求没有对应的对话，则返回 NULL。


#### $DLG_end_reason


返回对话终止的原因。它可以是
以下之一：


- *Upstream BYE* - 被叫已发送 BYE
- *Downstream BYE* - 主叫已发送 BYE
- *Lifetime Timeout* - 对话生命周期已过期
- *MI Termination* - 对话通过 MI 接口结束
- *Ping Timeout* - 因 OPTIONS ping 无应答而结束对话
- *ReINVITE Ping Timeout* - 因 reinvite ping 无应答而结束对话
- *RTPProxy Timeout* - RTPProxy 指示媒体超时
- *SIP Race Condition* - 发生 SIP 竞态条件


如果请求没有对应的对话，
或对话未在当前上下文中结束，则返回 NULL。


#### $DLG_timeout {#dlg_timeout}


用于设置对话生命周期（秒）。读取时，该变量
返回对话过期并被销毁之前的秒数。
注意，只有在对话创建之后（对于初始请求）或
执行 loose_route() 之后（对于后续请求）才能读取该变量。
重要提示：在 REALTIME db_mode 下使用该变量效率很低，
因为每次对话值变更都会执行一次数据库更新。


如果请求没有对应的对话，则返回 NULL，否则
返回直到对话过期的秒数。


#### $DLG_del_delay {#dlg_del_delay}


用于为当前对话（按呼叫）设置对话删除延迟（秒）。
读取时，该变量
返回为该呼叫设置的值，或通过
[delete_delay](#delete_delay-integer) 模块参数配置的默认值。


该变量必须在脚本中可用对话上下文时
使用。


#### $DLG_json


该变量为只读，暴露一个 JSON 变量，包含 dlg_list MI 函数所包含的全部信息


如果请求没有对应的对话，则返回 NULL，否则将返回该 JSON。


#### $DLG_ctx_json


该变量为只读，暴露一个 JSON 变量，包含 dlg_list_ctx MI 函数所包含的全部信息
（在 $DLG_json 之上，还会暴露当前对话的完整对话变量列表和剖析链接）


如果请求没有对应的对话，则返回 NULL，否则将返回该 JSON。


#### $dlg_val(name)


这是一个可读写变量，允许访问名为 *name* 的
对话属性。它可以保存字符串或
整数值。


请务必仅在拥有对话上下文时使用该变量
（例如在 create_dialog() 或 match_dialog() 或类似操作之后）。


该变量接受动态名称，即名称可以包含
其他变量。


如果请求没有对应的对话，则返回 NULL。


### 导出事件 {#exported-events}


#### E_DLG_STATE_CHANGED


当对话状态发生变更时引发该事件。


参数：


- *id* - 对话 id 的十六进制表示。
- *db_id* - 对话 id 的整数表示，
即存储在数据库 *dlg_id* 字段中的形式。
- *callid* - callid。
- *from_tag* - From 标签。
- *to_tag* - To 标签。
- *old_state* - 对话的旧状态。
- *new_state* - 对话的新状态。


## 开发者指南 {#developer-guide}


### 可用函数 {#available-functions}


#### register_dlgcb (dialog, type, cb, param, free_param_cb)


向对话注册一个新的回调函数。


各参数的含义如下：


- *struct dlg_cell* dlg* - 要向其
注册回调的对话。仅对 DLG_CREATED 回调类型可能为 NULL，
该类型不是按对话的类型。
- *int type* - 回调类型；同一回调函数可以注册
多个类型；只有
DLG_CREATED 必须单独注册。可能的类型：
	- *DLGCB_LOADED* - 当对话
	从数据库加载，或通过
	集群复制从某个节点收到时调用。
	- *DLGCB_SAVED*
	- *DLG_CREATED* - 当新对话
	被创建时调用——它是全局类型（不关联到
	任何对话）
	- *DLG_FAILED* - 当对话
	收到否定应答（非 2xx）时调用——它是按对话类型。
	- *DLG_CONFIRMED* - 当对话
	被确认（收到 2xx 应答）时调用——它是按对话类型。
	- *DLG_REQ_WITHIN* - 当对话
	匹配到后续请求时调用——它是按对话类型。
	- *DLG_TERMINATED* - 当对话
	通过 BYE 或通过 mi dlg_end_dlg 命令终止时调用——它是按对话类型。
	- *DLG_EXPIRED* - 当对话
	未收到 BYE 而过期时调用——它是按对话
	类型。注意，在使用复制共享标签时，该
	回调仅由持有 Active 标签的节点执行。
	- *DLGCB_EARLY* - 当对话
	以早期状态（18x 应答）创建时调用——它是
	按对话类型。
	- *DLGCB_RESPONSE_FWDED* - 当
	对话匹配到对初始 INVITE 请求的应答时调用——它是
	按对话类型。
	- *DLGCB_RESPONSE_WITHIN* - 当
	对话匹配到对后续对话内请求的应答时调用——它是按对话类型。
	- *DLGCB_MI_CONTEXT* - 当调用
	mi dlg_list_ctx 命令时调用——它是按对话类型。
	- *DLGCB_DESTROY*
- *dialog_cb cb* - 要调用的
回调函数。原型为："void (dialog_cb) 
(struct dlg_cell* dlg, int type, struct dlg_cb_params * params);
"
- *void *param* - 要传递给
回调函数的参数。
- *param_free callback_param_free* - 
为释放该参数而要调用的
回调函数。
原型为："void (param_free_cb) (void *param);"


## 常见问题 {#frequently-asked-questions}


**问："topology_hiding()" 函数怎么了？**


相应功能已移入 topology_hiding 模块。
函数原型保持不变。


**问："use_tight_match" 参数怎么了？**


该参数在 1.3 版本中被移除，因为紧匹配
选项变为强制且不可配置。现在，
紧匹配始终执行（在使用 DID 匹配时）。


**问："bye_on_timeout_flag" 参数怎么了？**


该参数在一次 dialog 模块参数重构中被移除。
要保留超时发送 BYE 的行为，需要向
create_dialog() 函数提供 "B" 字符串参数。


**问："dlg_flag" 参数怎么了？**


该参数被视为已过时。创建对话的
唯一方式是调用 create_dialog() 函数


**问：在哪里可以了解更多关于 OpenSIPS 的信息？**


请查看 [https://opensips.org/](https://opensips.org/)。


**问：我可以在哪里发布关于该模块的问题？**


首先请检查你的问题是否已在我们的某个
邮件列表中得到了回答：

关于任何稳定 OpenSIPS 版本的邮件应发送到
users@lists.opensips.org，关于开发版本的邮件
应发送到 devel@lists.opensips.org。

如果你希望邮件保持私密，请发送到
users@lists.opensips.org。


**问：我如何报告缺陷？**


请遵循以下地址提供的指南：
[https://github.com/OpenSIPS/opensips/issues](https://github.com/OpenSIPS/opensips/issues)。
<!-- CONTRIBUTORS -->

### 许可证 {#license}

所有文档文件（即 .md 扩展名）均按 Creative Common License 4.0 授权

