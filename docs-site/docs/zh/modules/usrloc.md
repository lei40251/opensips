---
title: "usrloc 模块"
description: "SIP 用户位置（user location）的实现。"
---


## 管理员指南 {#admin-guide}


### 概述 {#overview}


SIP 用户位置（user location）的实现。其主要用途是为其他模块（例如 registrar、mid-registrar、nathelper 等）存储、管理并提供对 SIP 注册绑定（联系人）的访问。该模块不导出任何可在 OpenSIPS 脚本中直接使用的函数。


在运行时，联系人可以驻留在内存中、SQL 数据库或 NoSQL 数据库中。上述方式中任意两者的组合也是可行的。例如，联系人可以只在内存中直接操作，以保证交互速度，同时异步同步到 SQL 数据库。后者有助于实现重启持久性。有关该模块所有可能的运行时行为，请参阅
**[working_mode_preset](#working_mode_preset-string)**
参数。


OpenSIPS 用户位置实现支持集群。除支持传统的“单实例”部署之外，它还允许多个
OpenSIPS 用户位置节点组成一个单一的全局用户位置集群。
这带来了诸如从随机一个健康的“供体（donor）”节点进行启动同步（数据
隧道）以及均匀分摊 NAT ping 负载等高级特性。


### 分布式 SIP 用户位置 {#distributed-sip-user-location}


从 OpenSIPS 2.4 开始，用户位置模块提供了若干可选的数据分发模型，每个模型针对
特定的实际生产用例而设计。这些模型构建在 OpenSIPS 集群模块之上，考虑了
*高可用、地理分布、水平可扩展性和 NAT 穿透*等业务关切。


根据数据的位置（data locality），分发模型分为两大类：


#### "Federation" 拓扑 {#federation-topology}


*联邦式（federated）*用户位置将联系人数据保留在联系人最初注册的那个
原始 OpenSIPS 节点本地。为了与全局
OpenSIPS 用户位置集群共享这些联系人的可达性，注册节点只会为任何从其
可达的新 Address-of-Record 发布一些轻量的“元数据”条目。这些条目
会使其他节点在收到发往其所公布 Address-of-Record 的呼叫时，也分叉出
指向发布者注册节点的额外 SIP 分支。


**federation** 拓扑是针对以下核心问题的
优化方案：


- **IP 地址限制** - 在某些
情况下，路由到已注册联系人的呼叫必须经过这些联系人最初的注册节点。这种
情况的典型例子是：位于平台边缘的 OpenSIPS 注册节点在通往联系人的路径上
直接面对 NAT 设备。除非呼叫从这个确切的注册节点发出，否则将无法穿越 NAT 设备
并到达该联系人。
- **水平可扩展性** - 避免
集群内的全局复制/联系人广播不仅能
大幅提升联系人存储性能，还能带来更好的服务可扩展性。不同地理位置可以
根据其本地用户规模来确定容量（例如，可以使用 DNS SRV 权重将流量
均衡到这些位置），同时不丧失平台级的可达性。


目前，元数据信息可以发布到支持键/多值列式关联的 NoSQL 数据库。
撰写本文时已知支持这些抽象的后端有
MongoDB 和 Cassandra。


[federated 用户位置教程](https://docs.opensips.org/tutorials/distributed-user-location-federation/)
包含如何完成该部署的精确细节（包括高可用
支持）。


#### "Full Sharing" 拓扑 {#full-sharing-topology}


*完全共享（fully sharing）*用户位置将联系人
信息广播到所有数据节点（OpenSIPS 或 NoSQL）。
该模式背后的主要假设是，任何路由
限制都已事先消除。因此，从“full sharing”
OpenSIPS 用户位置拓扑发出的 SIP 流量要么由平台的
另一个 SIP 边缘端点中转，要么根本不存在出口 IP
限制（例如，所有 SIP UA 都拥有公网 IP）。在这种部署中，所有 OpenSIPS 用户位置节点
彼此*对等*，因为它们各自都能访问同一份数据集，且没有路由限制。


**full sharing** 拓扑
适合多层 VoIP 平台，其中
OpenSIPS 注册节点不与外部 SIP 端点直接交互。此外，它可以配置为将联系人数据完全存储在
NoSQL 集群中（零内存存储），从而充分
利用专用分布式数据处理引擎的数据共享、分片、迁移等
能力。


此外，“full sharing”拓扑还可用于实现基本的
“热备”高可用部署：采用主备注册
节点配置，两者都使用共享虚拟 IP。


注册信息可以选择在支持键/多值列式关联的 NoSQL 数据库中
完全管理。目前已知支持这些抽象的后端有 MongoDB
和 Apache Cassandra。


[“full sharing”用户位置教程](https://docs.opensips.org/tutorials/distributed-user-location-full-sharing/)
包含如何完成该部署的精确细节（包括完整的
NoSQL 存储支持）。


#### "N Contact Pings" 问题 {#n-contact-pings-problem}


这是一个长期存在的问题：联系人信息通过复制直接地、或
通过全局可达的数据库间接地被复制到多个 SIP 注册实例。只要
传统上集群化的节点彼此不感知，
它们就会各自扫描整个联系人数据集，从而对每个联系人周期性地发送“N 次 ping”而不是“1 次 ping”。
这种差异直接影响服务可扩展性，也影响服务端和客户端所消耗的
CPU 和网络带宽等资源量。


该问题借助 OpenSIPS 集群层得到解决：
集群层使所有节点感知到彼此的存在。这样，分布式用户位置节点拓扑
能够在任意给定时刻集体划分 ping 工作量，并将其均匀分摊到当前
数量的集群节点上。[pinging_mode](#pinging_mode-string) 模块参数更详细地描述了
内置的 ping 启发式算法。


### 联系人匹配 {#contact-matching}


联系人匹配（针对同一个 Address-of-Record，AoR）是 SIP 用户位置服务的一个
重要方面，在 NAT
穿透的场景下尤为如此。后者会带来更多问题，因为同一用户不同
话机上的联系人可能重叠（如果它们位于配置相同的 NAT 之后），或者同一 SIP 用户代理的
重新注册 Contact 可能被视为一个新联系人（因为请求经由新的 NAT 绑定到达）。


SIP RFC 3261 公布的匹配算法仅基于
联系人字符串，并附加 Call-ID 与 CSeq 号的额外检查（如果 Call-ID
匹配，则 CSeq 号必须更大，否则注册
无效）。但如上所述，这在 NAT 穿透场景下是不够的，因此 OpenSIPS 的联系人匹配实现提供了更多
算法：


- *仅基于 Contact* - 严格符合 RFC 3261 -
联系人按字符串匹配，并通过 Call-ID 和 CSeq 额外检查（如果 Call-ID 相同，则 CSeq 号必须
更大，否则注册无效）。
- *基于 Contact 和 Call-ID* - 第一种情况的
扩展 - Contact 和 Call-ID 头域的值
必须按字符串匹配；CSeq 必须大于前一个 -
因此在这种情况下要小心处理 REGISTER 重传。


有关如何控制/选择联系人匹配算法的更多细节，
请参阅
**[matching_mode](#matching_mode-integer)**。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


以下模块必须在本模块之前加载：


- *可选：一个 SQL 数据库模块*。
- *可选：一个 NoSQL 数据库模块*。
- *clusterer，如果 [cluster_mode](#cluster_mode-string)
不等于 "none"。*


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，必须安装以下库或
应用程序：


- *无*。


### 导出的参数 {#exported-parameters}


#### nat_bflag (string)


用作 NAT 标记的分支标志位名称（联系人
是否经过 NAT）。这是一个分支标志位，将被所有依赖 usrloc 模块的
其他模块导入并使用。


*默认值为 NULL（未设置）。*


```opensips title="Set nat_bflag parameter"
...
modparam("usrloc", "nat_bflag", "NAT_BFLAG")
...
```


#### contact_id_column (string)


保存唯一联系人 ID 的列名。


*默认值为 "contact_id"。*


```opensips title="Set contact_id_column parameter"
...
modparam("usrloc", "contact_id_column", "ctid")
...
```


#### user_column (string)


包含用户名的列名。


*默认值为 "username"。*


```opensips title="Set user_column parameter"
...
modparam("usrloc", "user_column", "username")
...
```


#### domain_column (string)


包含域的列名。


*默认值为 "domain"。*


```opensips title="Set user_column parameter"
...
modparam("usrloc", "domain_column", "domain")
...
```


#### contact_column (string)


包含联系人的列名。


*默认值为 "contact"。*


```opensips title="Set contact_column parameter"
...
modparam("usrloc", "contact_column", "contact")
...
```


#### expires_column (string)


包含 expires 值的列名。


*默认值为 "expires"。*


```opensips title="Set expires_column parameter"
...
modparam("usrloc", "expires_column", "expires")
...
```


#### q_column (string)


包含 q 值的列名。


*默认值为 "q"。*


```opensips title="Set q_column parameter"
...
modparam("usrloc", "q_column", "q")
...
```


#### callid_column (string)


包含 callid 值的列名。


*默认值为 "callid"。*


```opensips title="Set callid_column parameter"
...
modparam("usrloc", "callid_column", "callid")
...
```


#### cseq_column (string)


包含 cseq 号的列名。


*默认值为 "cseq"。*


```opensips title="Set cseq_column parameter"
...
modparam("usrloc", "cseq_column", "cseq")
...
```


#### methods_column (string)


包含受支持方法的列名。


*默认值为 "methods"。*


```opensips title="Set methods_column parameter"
...
modparam("usrloc", "methods_column", "methods")
...
```


#### flags_column (string)


用于保存记录内部标志位的列名。


*默认值为 "flags"。*


```opensips title="Set flags_column parameter"
...
modparam("usrloc", "flags_column", "flags")
...
```


#### cflags_column (string)


用于保存记录的分支/联系人标志位的列名。


*默认值为 "cflags"。*


```opensips title="Set cflags_column parameter"
...
modparam("usrloc", "cflags_column", "cflags")
...
```


#### user_agent_column (string)


包含 user-agent 值的列名。


*默认值为 "user_agent"。*


```opensips title="Set user_agent_column parameter"
...
modparam("usrloc", "user_agent_column", "user_agent")
...
```


#### received_column (string)


包含 REGISTER 消息来源 IP、端口和协议的列名。


*默认值为 "received"。*


```opensips title="Set received_column parameter"
...
modparam("usrloc", "received_column", "received")
...
```


#### socket_column (string)


包含 REGISTER 消息所接收套接字信息（IP:port）的列名。


*默认值为 "socket"。*


```opensips title="Set socket_column parameter"
...
modparam("usrloc", "socket_column", "socket")
...
```


#### path_column (string)


包含 Path 头域的列名。


*默认值为 "path"。*


```opensips title="Set path_column parameter"
...
modparam("usrloc", "path_column", "path")
...
```


#### sip_instance_column (string)


包含 SIP 实例的列名。


*默认值为 "NULL"。*


```opensips title="Set sip_instance_column parameter"
...
modparam("usrloc", "sip_instance_column", "sip_instance")
...
```


#### kv_store_column (string)


包含通用键值数据的列名。


*默认值为 "kv_store"。*


```opensips title="Set kv_store_column parameter"
...
modparam("usrloc", "kv_store_column", "json_data")
...
```


#### attr_column (string)


包含额外的注册相关信息的列名。


*默认值为 "attr"。*


```opensips title="Set attr_column parameter"
...
modparam("usrloc", "attr_column", "attributes")
...
```


#### use_domain (integer) {#use_domain-integer}


用户的域部分是否也应被保存，并用于（与用户名部分一起）
标识用户。在多域场景中很有用。非 0 值表示真。


*默认值为 "0 (false)"。*


```opensips title="Set use_domain parameter"
...
modparam("usrloc", "use_domain", 1)
...
```


#### desc_time_order (integer)


是否应保持用户联系人的时间戳顺序；否则
联系人将按 q 值排序。
非 0 值表示真。


*默认值为 "0 (false)"。*


```opensips title="Set desc_time_order parameter"
...
modparam("usrloc", "desc_time_order", 1)
...
```


#### timer_interval (integer) {#timer_interval-integer}


两次定时器运行之间的秒数。在每次运行期间，模块
将更新/删除内存中的脏/过期联系人，并在配置了的情况下
将这些操作镜像到数据库。


> [!WARNING]
> 在 OpenSIPS 关闭甚至崩溃的情况下，仅存在于
内存中、尚未刷写到磁盘的联系人也绝不会丢失！
OpenSIPS 会尽最大努力在关闭前进行最后一次数据库同步。


*默认值为 60。*


```opensips title="Set timer_interval parameter"
...
modparam("usrloc", "timer_interval", 120)
...
```


#### db_url (string) {#db_url-string}


应使用的数据库 URL。


*默认值为 "mysql://opensips:opensipsrw@localhost/opensips"。*


```opensips title="Set db_url parameter"
...
modparam("usrloc", "db_url", "dbdriver://username:password@dbhost/dbname")
...
```


#### cachedb_url (string) {#cachedb_url-string}


要使用的 NoSQL 数据库 URL。仅在启用 cachedb 的
**[cluster_mode](#cluster_mode-string)** 中才需要。


*默认值为 "none"。*


```opensips title="Set cachedb_url parameter"
...
modparam("usrloc", "cachedb_url", "mongodb://10.0.0.4:27017/opensipsDB.userlocation")
...
```


#### db_mode (integer, deprecated) {#db_mode-integer-deprecated}


该参数为向后兼容而保留。它充当
[working_mode_preset](#working_mode_preset-string)（与之相冲突），
并覆盖任何 [cluster_mode](#cluster_mode-string)、
[restart_persistency](#restart_persistency-string) 和
[sql_write_mode](#sql_write_mode-string) 设置。可能的取值为：


- 0，对应 "single-instance-no-db"（见下文）
- 1，对应 "single-instance-sql-write-through"
- 2，对应 "single-instance-sql-write-back"
- 3，对应 "sql-only"


*默认值为 "not set"。*


```opensips title="Set db_mode parameter"
...
modparam("usrloc", "db_mode", 2)
...
```


#### working_mode_preset (string) {#working_mode_preset-string}


usrloc 模块的预定义工作模式。设置该
参数将覆盖任何 [cluster_mode](#cluster_mode-string)、
[restart_persistency](#restart_persistency-string) 和
[sql_write_mode](#sql_write_mode-string) 设置。


- **"single-instance-no-db"** - 该值
完全禁用数据库。只使用内存。
联系人在重启后不会保留。如果你需要
非常快的 usrloc，且联系人持久性并非必需或
由其他方式提供，请使用该值。
- **"single-instance-sql-write-through"**
			- 写穿（Write-Through）方案。对 usrloc 的所有变更都会立即
反映到数据库中。这非常慢，但非常可靠。
如果速度不是你的优先考虑，但需要确保
在崩溃或重启期间不会有已注册联系人丢失，请使用该方案。
- **"single-instance-sql-write-back"**
			- 写回（Write-Back）方案。这是前两种
方案的组合。所有变更都在内存中进行，数据库
同步在定时器中完成。定时器会删除所有
过期联系人，并将所有已修改或新的联系人刷写到
数据库。如果遇到高负载峰值并且希望它们
尽可能快地处理，请使用该方案。如果负载一直很高，该模式
将毫无帮助。使用该异步预置时，
SIP 信令上增加的时延远低于安全但
阻塞的 "single-instance-sql-write-through" 预置所增加的时延。
- **"sql-only"** -
仅数据库（DB-Only）方案。不保留内存缓存，所有操作
直接在数据库上执行。定时器会从数据库中删除所有
过期联系人 - 清理那些未注销或未重新注册的客户端。
如果配置了多台服务器共享同一数据库而在 SIP
层面不做任何复制，该模式很有用。由于数据库操作数量很多，该模式可能较慢。
例如 NAT ping 是致命的，因为每个 ping 周期中
所有经过 NAT 的联系人都要从数据库载入；缺少内存
缓存还会禁用统计导出。
- **"federation-cachedb-cluster"** -
OpenSIPS 将以 "federation-cachedb"
[cluster_mode](#cluster_mode-string) 和
"sync-from-cluster" [restart_persistency](#restart_persistency-string) 运行。
这将需要在集群中配置多个 "seed" 节点。详情请参阅
[federated 用户位置教程](https://docs.opensips.org/tutorials/distributed-user-location-federation/)。
- **"full-sharing-cluster"** -
OpenSIPS 将以 "full-sharing"
[cluster_mode](#cluster_mode-string) 和
"sync-from-cluster" [restart_persistency](#restart_persistency-string) 运行。
这将需要把集群中的某个节点配置为 "seed" 节点，以便引导同步过程。
- **"full-sharing-cachedb-cluster"** -
OpenSIPS 将以 "full-sharing-cachedb"
[cluster_mode](#cluster_mode-string) 运行，此时所有位置数据都严格
驻留在 NoSQL 数据库中，因此天然具备重启持久性。


有关集群拓扑及其行为的细节，请参阅
[分布式 sip 用户位置](#distributed-sip-user-location) 一节。


*默认值为 "single-instance-no-db"。*


```opensips title="Set working_mode_preset parameter"
...
modparam("usrloc", "working_mode_preset", "full-sharing-cachedb-cluster")
...
```


#### cluster_mode (string) {#cluster_mode-string}


**如果设置了
[working_mode_preset](#working_mode_preset-string) 或
[db_mode](#db_mode-integer-deprecated)，该参数将被覆盖。**


全局 OpenSIPS 用户位置集群的行为。详情请参阅
[分布式 sip 用户位置](#distributed-sip-user-location) 一节。


该参数可取值如下：


- *"none"* - 单实例模式。
- *"federation-cachedb"* -
基于 federation 的数据共享。本地 AoR 元数据发布
在 NoSQL 数据库中，因此其他集群节点可以将 SIP
流量分叉到当前节点。因此，
[location_cluster](#location_cluster-integer) 和
[cachedb_url](#cachedb_url-string) 参数为必填。
- *"full-sharing"* -
将联系人更新广播（全互联镜像）到所有其他
OpenSIPS 集群成员。每个节点都将持有整个
用户位置数据集。因此，
[location_cluster](#location_cluster-integer) 参数为必填。
- *"full-sharing-cachedb"* -
通过使用 NoSQL 数据库进行完全的联系人数据管理
（与 "sql-only" 预置有些类似）。
仍然需要集群层，以便
能够在参与的 OpenSIPS 节点之间划分并均匀分摊
ping 工作量。因此，
[location_cluster](#location_cluster-integer) 和
[cachedb_url](#cachedb_url-string) 参数为必填。
- *"sql-only"* -
多个 OpenSIPS 实例使用共同的
[db_url](#db_url-string)，而不必彼此感知。


*默认值为 *"none"（单实例模式）*。*


```opensips title="Set cluster_mode parameter"
...
modparam("usrloc", "cluster_mode", "federation-cachedb")
...
```


#### restart_persistency (string) {#restart_persistency-string}


**如果设置了
[working_mode_preset](#working_mode_preset-string) 或
[db_mode](#db_mode-integer-deprecated)，该参数将被覆盖。**


控制 OpenSIPS 用户位置在重启后的行为。在某些仅使用数据库的工作模式
预置中该参数无效，因为那些预置天然保证了重启持久性。


该参数可取值如下：


- *"none"* - 重启后不做显式的数据
同步。节点以空状态启动。
- *"load-from-sql"* - 启用
基于 SQL 的重启持久性。这会使所有运行时
内存写入（即新注册、重新注册或
注销）也传播到 SQL 数据库，重启后将从
该数据库导入所有数据。
选择该值将使 [db_url](#db_url-string)
参数变为必填，并且会使
[sql_write_mode](#sql_write_mode-string) 默认取 "write-back"
而非 "none"。
- *"sync-from-cluster"* - 启用
基于集群的重启持久性。重启后，
OpenSIPS 集群节点将搜索一个健康的“供体（donor）”节点，
通过直接集群同步（基于 TCP、二进制编码的数据传输）从该节点镜像整个
用户位置数据集。取决于集群模式和集群拓扑，这将
需要在集群中配置一个或多个 "seed" 节点。
选择该值将使
[location_cluster](#location_cluster-integer) 参数变为必填。


*默认值为
*"none"（无重启持久性）*。*


```opensips title="Set restart_persistency parameter"
...
modparam("usrloc", "restart_persistency", "sync-from-cluster")
...
```


#### sql_write_mode (string) {#sql_write_mode-string}


**如果设置了
[working_mode_preset](#working_mode_preset-string) 或
[db_mode](#db_mode-integer-deprecated)，该参数将被覆盖。**


仅在启用 [restart_persistency](#restart_persistency-string) 时有效。
控制 OpenSIPS 向 SQL 数据库写入的运行时行为。


该参数可取值如下：


- *"none"* - 在运行时不再为专门确保重启持久性
而对 SQL 数据库执行任何
额外的 SQL 写入。
- *"write-through"* - 所有内存
写入（即新注册、重新注册或
注销）也以内联方式传播到 SQL 数据库。
虽然这肯定会降低注册性能
（查询仍由内存提供！），但它具有
使实例崩溃安全的优点。
- *"write-back"* - 所有内存
写入（即新注册、重新注册或
注销）最终也会传播到 SQL
数据库，这得益于一个独立的定时器例程。这显著
加快了注册，但也引入了
在最新联系人变更传播到数据库之前发生崩溃的
可能性。额外的配置请参阅
[timer_interval](#timer_interval-integer)。


*默认值为 *"none"（不增加 SQL 写入）*。*


```opensips title="Set sql_write_mode parameter"
...
modparam("usrloc", "sql_write_mode", "write-back")
...
```


#### matching_mode (integer) {#matching_mode-integer}


要使用的联系人匹配算法。有关这些算法的描述，
请参阅 [联系人匹配](#contact-matching) 一节。


该参数可取值如下：


- *0* - 仅基于 CONTACT 的匹配
算法。
- *1* - 基于 CONTACT 和 CALLID 的
匹配算法。


*默认值为 *0 (CONTACT_ONLY)*。*


```opensips title="Set matching_mode parameter"
...
modparam("usrloc", "matching_mode", 1)
...
```


#### cseq_delay (integer)


接受具有相同 Call-ID 和 Cseq 的注册请求作为重传的
延迟（秒）。该延迟从收到第一个具有该 Call-ID 和 Cseq 的注册请求的时间
开始计算。


在该延迟区间内的重传将被接受，并作为原请求进行应答，
但不会对位置数据做任何更新。如果超过该延迟，
则报告错误。


值为 0 将禁用重传检测。


*默认值为 "20 seconds"。*


```opensips title="Set cseq_delay parameter"
...
modparam("usrloc", "cseq_delay", 5)
...
```


#### location_cluster (integer) {#location_cluster-integer}


指定本实例将向其发送、并从其接收所有用户位置相关信息的集群 ID
（*addresses-of-record*、*contacts*），
这些信息被组织为特定的事件（插入、删除或更新）。


该 OpenSIPS 集群公开 **"usrloc-contact-repl"**
能力，以便将节点标记为有资格在任意同步请求期间成为数据供体。
因此，集群必须至少有一个节点在
*clusterer.flags* 列/属性中被标记为 **"seed"** 值，
才能完全正常工作。更多细节请参阅
[clusterer - 能力](/zh/modules/clusterer#capabilities-layer)
章节。


默认值为 0（禁用复制）。


关于用户位置分发机制的更多细节，
可在 [分布式 sip 用户位置](#distributed-sip-user-location) 下找到。


```opensips title="Setting the location_cluster parameter"
...
modparam("usrloc", "location_cluster", 1)
...
```


#### ha_cluster (integer)


仅在 **"federation-cachedb"**
[cluster_mode](#cluster_mode-string) 下相关。表示用于
在 HA 对中确立活动节点的 HA 集群 ID，使得只有
该节点对 CacheDB 执行写操作。


默认值为 0（禁用）。


```opensips title="Setting the ha_cluster parameter"
...
modparam("usrloc", "ha_cluster", 4)
...
```


#### ha_shtag (string)


仅在 **"federation-cachedb"**
[cluster_mode](#cluster_mode-string) 下相关。表示用于
在 HA 对中确立活动节点的 HA 集群共享标签，使得
只有该节点对 CacheDB 执行写操作。


默认值为 NULL（禁用）。


```opensips title="Setting the ha_shtag parameter"
...
modparam("usrloc", "ha_shtag", "vip2")
...
```


#### skip_replicated_db_ops (int)


当通过 *Binary Interface* 收到事件时，阻止 OpenSIPS 执行
任何与数据库相关的联系人操作。
这通常用于避免不必要的重复操作。


默认值为 "0"（收到与 usrloc 相关的 Binary Interface
事件时，可以自由执行数据库查询）


关于用户位置复制机制的更多细节可在
[分布式 sip 用户位置](#distributed-sip-user-location) 中找到


```opensips title="Setting the skip_replicated_db_ops parameter"
...
modparam("usrloc", "skip_replicated_db_ops", 1)
...
```


#### max_contact_delete (int)


仅在 WRITE_THROUGH 或 WRITE_BACK 方案下相关。一次从数据库
删除的联系人最大数量。如果遍历所有联系人后
数量更少，则全部删除。


默认值为 "10"


```opensips title="Setting the max_contact_delete parameter"
...
modparam("usrloc", "max_contact_delete", 10)
...
```


#### hash_size (integer)


usrloc 用于保存位置记录的哈希表条目数为 2^hash_size。
对于 hash_size=4，哈希表的条目数为 16。自 2.2 版本起，
该参数的最大值为 16，意味着哈希最多支持 65536 个条目。


*默认值为 "9"。*


```opensips title="Set hash_size parameter"
...
modparam("usrloc", "hash_size", 10)
...
```


#### regen_broken_contactid (integer)


自 2.2 版本起引入了 **contact_id** 概念。
由于该参数会在每次 OpenSIPS 启动时校验联系人，
有时需要重新生成该参数的值。即当 **location** 表
从 2.2 之前的版本迁移而来，或者
**hash_size** 模块参数被更改时。
启用该参数将基于当前配置重新生成损坏的 contact id。


*默认值为 "0(not enabled)"*


```opensips title="Set regen_broken_contactid parameter"
...
modparam("usrloc", "regen_broken_contactid", 1)
...
```


#### latency_event_min_us (integer) {#latency_event_min_us-integer}


定义最小的 ping 时延阈值（微秒），
超过该阈值时将触发联系人 ping 时延更新事件。默认情况下，
每次收到 ping 应答（即时延更新）都会触发一个事件。


如果同时设置了 [latency_event_min_us](#latency_event_min_us-integer) 和
[latency_event_min_us_delta](#latency_event_min_us_delta-integer)，则
只要其中任一条件成立，就会触发该事件。


*默认值为 "0（未设置下限）"。*


```opensips title="Set latency_event_min_us parameter"
...
# 任何 425 毫秒以上的 ping 时延都触发事件
modparam("usrloc", "latency_event_min_us", 425000)
...
```


#### latency_event_min_us_delta (integer) {#latency_event_min_us_delta-integer}


定义最小的绝对 ping 时延差值（微秒），
超过该差值时将触发联系人 ping 时延更新事件。
该差值使用最近两次联系人 ping 应答的时延计算。
默认情况下，每次收到 ping 应答（即时延更新）都会触发一个事件。


如果同时设置了 [latency_event_min_us](#latency_event_min_us-integer) 和
[latency_event_min_us_delta](#latency_event_min_us_delta-integer)，则
只要其中任一条件成立，就会触发该事件。


*默认值为 "0（未设置最小时延差值）"。*


```opensips title="Set latency_event_min_us_delta parameter"
...
# 仅在联系人的 ping 时延波动达到 300 毫秒以上时才触发事件
modparam("usrloc", "latency_event_min_us_delta", 300000)
...
```


#### pinging_mode (string) {#pinging_mode-string}


取决于 [cluster_mode](#cluster_mode-string)，该模块
可以使用两种可能的启发式算法之一来执行联系人 ping：


- **"ownership"** - 该实例
只有在判定自己是该联系人的逻辑所有者时，才会尝试 ping 该联系人。
如果联系人附带共享标签，则只要节点拥有相应标签，
就会持续向该联系人发送 ping。如果某个联系人未指定
共享标签，默认假定对该联系人拥有永久所有权，
并在需要时 ping 它。
- **"cooperation"** - 该
ping 启发式算法的假设是，所有
用户位置集群节点都是对称的（可能
前置一个 SIP 流量均衡实体），因此
其中**任一**节点都可以 ping
**任何**联系人。
在该假设下，所有当前在线的用户位置
集群节点将相互协作，通过对 AoR 按
current_number_of_online_nodes 取模进行哈希，
只在各自负责的联系人上执行，从而在它们之间均匀分配 ping
工作量。


**"pinging_mode" 的可能取值，
取决于当前的 "cluster_mode"**


|  |  |  |  |  |  |
| --- | --- | --- | --- | --- | --- |
| [cluster_mode](#cluster_mode-string) | none | federation-cachedb | full-sharing | full-sharing-cachedb | sql-only |
| [pinging_mode](#pinging_mode-string) | **ownership** | **ownership** | **cooperation** / ownership | **cooperation** | *未维护* |


请注意，只有 **"full-sharing"**
集群模式提供了一定的灵活性 -- 其他所有模式
在逻辑上都绑定到单一的 ping 逻辑。根据上表，
为这些模式设置的任何不被接受的值
都将被静默丢弃。


```opensips title="Set pinging_mode parameter"
...
# 准备一个主动/备份的 "full-sharing" 部署，不带前端
modparam("usrloc", "pinging_mode", "ownership")
...
```


#### mi_dump_kv_store (integer)


启用后，将在所有输出 AoR 或 Contact 表示的 usrloc MI
命令中包含 "KV-Store" 字段。该冗余
字段包含附加到这两类实体各自的自定义数据。
例如，mid_registrar 会同时使用这两种载体。


*默认值为 "0 (disabled)"。*


```opensips title="Set mi_dump_kv_store parameter"
...
# 在所有 usrloc MI 输出中包含 "KV-Store" 键
modparam("usrloc", "mi_dump_kv_store", 1)
...
```


#### contact_refresh_timer (boolean) {#contact_refresh_timer-boolean}


启用一个定时器，它会周期性地扫描已排序的联系人列表，
并对任何超过其重新注册时间间隔限制的联系人触发
[E_UL_CONTACT_REFRESH](#e_ul_contact_refresh)。该
限制例如可以由 registrar 的 *pn_trigger_interval*
模块参数给出。


*默认值为 "false (disabled)"。*


```opensips title="Set contact_refresh_timer parameter"
...
modparam("usrloc", "contact_refresh_timer", true)
...
```


### 导出的函数 {#exported-functions}


#### ul_add_key(domain, aor, key_name, [key_value])


向 Usrloc 记录的 Key-Value-Store 追加一个 Key/Value。


如果在 usrloc 中未找到记录，则返回 false。


参数含义如下：


- *domain (string)* - AOR 的域，
例如 "location"
- *aor (string)* - Address-of-Record，
为特定（已注册）用户保存该 key。
- *key (string)* - 要存储的
key 名称。
- *value (string, optional)*
			        - 要存储的值。不提供该值，或
提供空值，将删除该条目。


该函数可在 ANY 路由中使用。


```opensips title="ul_add_key usage"
...
ul_add_key("location", "$tU@$td", "service_route", "$hdr(Service-Route)");
...
```


#### ul_get_key(domain, aor, key_name, destination)


从 Usrloc 记录的 Key-Value-Store 中取回一个 Key/Value。


如果在 usrloc 中未找到记录，或未找到相应的 key，则返回 false。


参数含义如下：


- *domain (string)* - AOR 的域，
例如 "location"
- *aor (string)* - Address-of-Record，
为特定（已注册）用户保存该 key。
- *key (string)* - 要取回的
key 名称。
- *destination (variable)*
			        - 一个变量，用于存放取回的 key 值。


该函数可在 ANY 路由中使用。


```opensips title="ul_get_key usage"
...
if (ul_get_key("location", "$tU@$td", "service_route", $avp(service_route))) {
        append_to_reply("Service-Route: $avp(service_route)\r\n");
}
...
```


#### ul_del_key(domain, aor, key_name)


从 Usrloc 记录的 Key-Value-Store 中删除一个 Key/Value。


如果在 usrloc 中未找到记录，则返回 false。


参数含义如下：


- *domain (string)* - AOR 的域，
例如 "location"
- *aor (string)* - Address-of-Record，
为特定（已注册）用户保存该 key。
- *key (string)* - 要删除的
key 名称。


该函数可在 ANY 路由中使用。


```opensips title="ul_del_key usage"
...
ul_del_key("location", "$tU@$td", "service_route");
...
```


### 导出的 MI 函数 {#exported-mi-functions}


#### ul_rm


删除整个 AOR 记录（包括其联系人）。


参数：


- *table_name* - 从中移除 AOR 的
表（例如：location）。
- *aor* - 用户名格式为 username[@domain] 的用户 AOR
（仅当启用 use_domain 选项时才必须提供域）。


#### ul_rm_contact


从 AOR 记录中删除一个联系人。


参数：


- *table name* - 从中移除 AOR 的
表（例如：location）。
- *AOR* - 用户名格式为 username[@domain] 的用户 AOR
（仅当启用 use_domain 选项时才必须提供域）。
- *contact* - 要移除的确切联系人


#### ul_dump


转储内存缓存中 USRLOC 的全部内容


参数：


- *brief* - （可选，可以不存在）；如果
等于字符串 "brief"，将执行简易转储
（只包含 AOR 和联系人，不含其他细节）


#### ul_flush


强制将所有待处理的 usrloc 缓存变更刷写到数据库。
正常情况下，该例程每
[timer_interval](#timer_interval-integer) 秒运行一次。


#### ul_add


为某个用户 AOR 添加一个新联系人。


参数：


- *table name (string)* - 联系人将被添加到的
表（例如："location"）。
- *aor (string)* - 用户名格式为 username[@domain] 的用户 AOR
（仅当启用 use_domain 选项时才必须提供域）。
- *contact (string)* - 要添加的 Contact URI
- *expires (int)* - 联系人的 expires 值
- *q (string)* - 联系人的 Q 值
- *flags (int)* - 联系人的内部 USRLOC
标志位
- *cflags (int)* - 联系人的
每分支标志位
- *methods (int)* - 联系人支持的请求
位掩码。若要将所有 SIP 方法加入白名单，直接使用
值 **32767**。每种方法取值
的明细，请参阅 "request_method" 内部枚举。


#### ul_show_contact


转储某个用户 AOR 的联系人。


参数：


- *table_name* - AOR 所在的
表（例如：location）。
- *aor* - 用户名格式为 username[@domain] 的用户 AOR
（仅当启用 use_domain 选项时才必须提供域）。


#### ul_sync


清空 location 表，然后用内存中的所有联系人同步该表。
注意，在未指定数据库或使用 DB-Only 方案时不能使用该命令。


重要：在执行该命令前，请确保所有联系人都在内存中
（*ul_dump* MI 函数）。


参数：


- *table name* - AOR 所在的
表（例如：location）。
- *AOR（可选）* - 仅删除/同步该
用户 AOR，而非整张表。格式："username[@domain]"
（仅当启用
[use_domain](#use_domain-integer) 选项时才需要 *domain*）。


#### ul_cluster_sync


仅当目标 OpenSIPS 实例与一个热备实例配对，并且运行在
启用集群的 [working_mode_preset](#working_mode_preset-string) 下时，
该命令才会生效。


当前节点将在
[location_cluster](#location_cluster-integer) 中定位一个健康的供体节点，并向其
发起同步请求。供体节点随后通过二进制接口将其全部用户位置
数据推送到当前节点。接收到的
数据将与现有数据合并。冲突的联系人（依据
[matching_mode](#matching_mode-integer) 匹配）仅在同步数据比当前数据更新时
才会被覆盖。


### 导出的统计 {#exported-statistics}


导出的统计在以下各节中列出。


#### users


该域在 USRLOC 内存缓存中现存的 AOR 数量
			- 不可重置；该统计将针对每个
使用的域进行注册（例如：location）。


#### contacts


该域在 USRLOC 内存缓存中现存的联系人数量
- 不可重置；该统计将针对
每个使用的域进行注册（例如：location）。


#### expires


该域的过期联系人总数 - 可重置；
该统计将针对每个使用的域进行注册
（例如：location）。


#### registered_users


所有域在 USRLOC 内存缓存中现存的 AOR
总数 - 不可重置。


### 导出的事件 {#exported-events}


#### E_UL_AOR_INSERT


当有新的 AOR 插入 USRLOC
内存缓存时，触发该事件。


参数：


- *domain* - 表的名称。
- *aor* - 被插入记录的 AOR。


#### E_UL_AOR_DELETE


当有 AOR 从 USRLOC
内存缓存中删除时，触发该事件。


参数：


- *domain* - 表的名称。
- *aor* - 被删除记录的 AOR。


#### E_UL_CONTACT_INSERT {#e_ul_contact_insert}


当有新联系人插入任何
现存 AOR 的联系人列表时，触发该事件。对于每个新联系人，如果其 AOR
在内存中不存在，则 E_UL_AOR_CREATE 和
E_UL_CONTACT_INSERT 两个事件都会被触发。


参数：


- *domain* - 表的名称。
- *aor* - 被插入联系人的 AOR。
- *uri* - 被插入联系人的
Contact URI。
- *received* - 注册消息来源的
IP、端口和协议。如果这些值与联系人的地址（见 address 参数）
相同，则 received 参数将为空字符串。
- *path* - 注册消息的 PATH 头域
值。（如不存在则为空字符串）
- *qval* - 联系人的 Q 值
（优先级，取 0 到 10 的整数值）。
- *user_agent* - User-Agent 头域
值。
*注意：*可包含空格。
- *socket* - OpenSIPS 用于接收联系人
注册的 SIP 套接字/监听地址
（字符串形式）。
- *bflags* - 联系人的分支标志位
（bflags）（以位掩码整数值表示）
- *expires* - 联系人的 expires 值
（以 UNIX 时间戳整数表示）。
- *callid* - 注册消息的 Call-ID
头域。
- *cseq* - cseq 号，取 int 值。
- *attr* - 附加到联系人的属性
字符串（从脚本层面附加的自定义属性）。由于该字符串是可选的，
如果联系人中缺失，事件将为该事件字段推送空字符串。
- *latency* - 该联系人最近一次成功
ping 的时延，单位为微秒。在收到某个联系人首次 ping 应答
之前，其 ping 时延为 0。
- *shtag* - 联系人的共享标签，
有助于判断当前节点是否拥有该联系人
（例如，可能使用 **$cluster.sh_tag** 伪变量来执行该检查）。
*注意：*如果联系人没有附加共享标签，
该参数的值将为 ""（空
字符串）！


#### E_UL_CONTACT_DELETE


当有联系人从现存 AOR 的
联系人列表中被删除时，触发该事件。如果该联系人是
列表中唯一的一个，则 E_UL_AOR_DELETE 和
E_UL_CONTACT_DELETE 两个事件都会被触发。


参数：与
[E_UL_CONTACT_INSERT](#e_ul_contact_insert) 事件相同


#### E_UL_CONTACT_UPDATE


当通过收到另一条注册消息而更新某个联系人的信息时，
触发该事件。


参数：与
[E_UL_CONTACT_INSERT](#e_ul_contact_insert) 事件相同


#### E_UL_CONTACT_REFRESH {#e_ul_contact_refresh}


该事件仅可能为启用 RFC 8599（推送通知）
的联系人触发。


将 [contact_refresh_timer](#contact_refresh_timer-boolean) 设置为
*true* 即可启用该事件。该事件会在启用 RFC 8599 的联系人
即将过期之前的合理时间内触发，以便脚本编写者采取行动，
例如可能强制端点刷新注册。


参数：


- *domain* - 表的名称。
- *aor* - 被插入联系人的 AOR。
- *uri* - 被插入联系人的
Contact URI。
- *received* - 注册消息来源的
IP、端口和协议。如果这些值与联系人的地址（见 address 参数）
相同，则 received 参数将为空字符串。
- *user_agent* - User-Agent 头域
值。
*注意：*可包含空格。
- *socket* - OpenSIPS 用于接收联系人
注册的 SIP 套接字/监听地址
（字符串形式）。
- *bflags* - 联系人的分支标志位
（bflags）（以位掩码整数值表示）
- *expires* - 联系人的 expires 值
（以 UNIX 时间戳整数表示）。
- *callid* - 注册消息的 Call-ID
头域。
- *attr* - 附加到联系人的属性
字符串（从脚本层面附加的自定义属性）。由于该字符串是可选的，
如果联系人中缺失，事件将为该事件字段推送空字符串。
- *shtag* - 联系人的共享标签，
有助于判断当前节点是否拥有该联系人
（例如，可能使用 **$cluster.sh_tag** 伪变量来执行该检查）。
- *reason* - 触发该绑定刷新
事件的原因。可能取值：
	- "reg-refresh" - 由 OpenSIPS 触发的周期性刷新
	- "ini-INVITE"、"ini-SUBSCRIBE" 等 - 由入站初始 SIP 请求
		触发的刷新
	- "mid-INVITE"、"mid-BYE" 等 - 由入站对话中 SIP 请求
		触发的刷新
- *req_callid* - 触发该事件的 SIP 请求的
Call-ID（如果有）。这样可以
在逻辑上将待处理请求与当前事件关联起来，并
从该请求中访问有用的数据（例如主叫身份、
被叫号码等）。
使用 *req_callid* 时，如果已为待处理请求
创建了对话，则可以在 event_route 中使用
dialog 模块的
[load_dialog_ctx()](/zh/modules/dialog#load-dialog-ctx-dialog-id-type) 和
[unload_dialog_ctx()](/zh/modules/dialog#unload-dialog-ctx)
函数临时加载该对话。


#### E_UL_LATENCY_UPDATE


当联系人的 ping 时延匹配
[latency_event_min_us](#latency_event_min_us-integer) 或
[latency_event_min_us_delta](#latency_event_min_us_delta-integer) 过滤器之一时，触发该事件。如果这些
过滤器都未设置，则每次成功的
联系人 ping 操作都会触发该事件。


参数：与
[E_UL_CONTACT_INSERT](#e_ul_contact_insert) 事件相同


## 开发者指南 {#developer-guide}


### 可用函数 {#available-functions}


#### ul_register_domain(name)


该函数注册一个新域。域只是 registrar 中所用表的另一个名称。
该函数由 registrar 中的 fixup 调用。它以域名作为参数，
并返回指向新域结构的指针。随后 fixup 会“修正”
registrar 中的参数，使得每次调用 save() 或 lookup() 时传递的是该指针
而非名称。某些 usrloc 函数在被调用时以该指针作为参数。更多细节请参阅
registrar 中 save 函数的实现。


参数含义如下：


- *const char* name* - 要注册的域名
（也称为表）。


#### ul_insert_urecord(domain, aor, rec, is_replicated)


该函数创建一个新的记录结构，并将其插入到
指定的域中。记录是一种结构，包含属于指定用户名的
所有联系人。


参数含义如下：


- *udomain_t* domain* - 指向由 ul_register_udomain 返回的
域的指针。
- *str* aor* - 新记录的 Address of Record（即
用户名）（此时该记录尚不包含任何联系人）。
- *urecord_t** rec* - 新创建的
记录结构。
- *char is_replicated* - 指定该函数是否会
从 Binary Interface 回调的上下文中被调用。如果不确定，直接使用 0。


#### ul_delete_urecord(domain, aor, is_replicated)


该函数删除与给定 Address
Of Record 绑定的所有联系人。


参数含义如下：


- *udomain_t* domain* - 指向由 ul_register_udomain 返回的
域的指针。
- *str* aor* - 应被删除的记录的 Address of record（即
用户名）。
- *char is_replicated* - 指定该函数是否会
从 Binary Interface 回调的上下文中被调用。如果不确定，直接使用 0。


#### ul_get_urecord(domain, aor)


该函数返回指向具有给定 Address of Record 的记录的指针。


参数含义如下：


- *udomain_t* domain* - 指向由 ul_register_udomain 返回的
域的指针。


- *str* aor* - 所请求记录的
Address of Record。


#### ul_lock_udomain(domain)


该函数锁定指定的域，这意味着在此期间其他进程
将无法访问该域。这可以防止竞态条件。锁的作用范围是
指定的域，这意味着多个域可以被同时访问，它们之间不会
相互阻塞。


参数含义如下：


- *udomain_t* domain* - 要锁定的域。


#### ul_unlock_udomain(domain)


解锁先前由 ul_lock_udomain 锁定的指定域。


参数含义如下：


- *udomain_t* domain* - 要解锁的
域。


#### ul_release_urecord(record, is_replicated)


做一些健全性检查 - 如果所有联系人都已被移除，则
删除整个记录结构。


参数含义如下：


- *urecord_t* record* - 要释放的
记录。
- *char is_replicated* - 指定该函数是否会
从 Binary Interface 回调的上下文中被调用。如果不确定，直接使用 0。


#### ul_insert_ucontact(record, contact, contact_info, contact, is_replicated)


该函数按指定参数向给定记录中插入一个新联系人。


参数含义如下：


- *urecord_t* record* - 应插入联系人的
记录。
- *str* contact* - Contact URI。
- *ucontact_info_t* contact_info* -
包含新联系人信息的单一结构
- *char is_replicated* - 指定该函数是否会
从 Binary Interface 回调的上下文中被调用。如果不确定，直接使用 0。


#### ul_delete_ucontact (record, contact, is_replicated)


该函数从记录中删除给定的联系人。


参数含义如下：


- *urecord_t* record* - 应移除联系人的
记录。


- *ucontact_t* contact* - 要删除的
联系人。
- *char is_replicated* - 指定该函数是否会
从 Binary Interface 回调的上下文中被调用。如果不确定，直接使用 0。


#### ul_delete_ucontact_from_id (domain, contact_id)


该函数从给定域中删除具有给定 contact_id 的
联系人。


参数含义如下：


- *udomain_t* domain* - 可找到该联系人的
域。


- *uint64_t contact_id* - 标识要删除联系人的
Contact_id。


#### ul_get_ucontact(record, contact)


该函数尝试查找具有给定 Contact URI 的联系人，
并返回指向表示该联系人的结构的指针。


参数含义如下：


- *urecord_t* record* - 要在其中搜索该联系人的
记录。


- *str_t* contact* - 所请求联系人的
URI。


#### ul_get_domain_ucontacts (domain, buf, len, flags)


该函数从给定域中取回所有已注册用户的所有联系人，
并将其返回到调用方提供的缓冲区中。如果
缓冲区太小，该函数返回一个正值，表示容纳全部联系人
还需要多少额外空间。请注意，该正值返回值只能作为
“提示”使用，因为无法保证在两次后续调用之间的
时间内已注册联系人的数量保持不变。


如果 flag 参数被设置为非零值，则只返回设置了
指定标志位的联系人。例如，可以
只列出位于 NAT 之后的联系人。


参数含义如下：


- *udomaint_t* domain* - 从中获取联系人的
域


- *void* buf* - 用于返回联系人的
缓冲区。


- *int len* - 缓冲区的长度。


- *unsigned int flags* - 必须设置的
标志位。


#### ul_get_all_ucontacts (buf, len, flags)


该函数取回所有已注册用户的所有联系人，
并将其返回到调用方提供的缓冲区中。如果缓冲区太小，
该函数返回一个正值，表示容纳全部联系人还需要多少额外
空间。请注意，该正值返回值只能作为
“提示”使用，因为无法保证在两次后续调用之间的
时间内已注册联系人的数量保持不变。


如果 flag 参数被设置为非零值，则只返回设置了
指定标志位的联系人。例如，可以
只列出位于 NAT 之后的联系人。


参数含义如下：


- *void* buf* - 用于返回联系人的
缓冲区。


- *int len* - 缓冲区的长度。


- *unsigned int flags* - 必须设置的
标志位。


#### ul_update_ucontact(record, contact, contact_info, is_replicated)


该函数用新值更新联系人。


参数含义如下：


- *urecord_t* record* - 应插入联系人的
记录。
- *ucontact_t* contact* - Contact URI。
- *ucontact_info_t* contact_info* -
包含新联系人信息的单一结构
- *char is_replicated* - 指定该函数是否会
从 Binary Interface 回调的上下文中被调用。如果不确定，直接使用 0。


#### ul_bind_ursloc( api )


该函数导入 USRLOC 模块导出的所有函数。
为其他想要使用内部 USRLOC API 的模块提供了一种加载和访问这些函数的
简便方式。


参数含义如下：


- *usrloc_api_t* api* - USRLOC API


#### ul_register_ulcb(type ,callback, param)


该函数向 USRLOC 注册一个回调函数，当 USRLOC 内部发生某些事件时会被调用。


各参数含义如下：


- *int types* —— 需要触发回调的事件类型（参见 usrloc/ul_callback.h）。
- *ul_cb f* —— 回调函数，原型参见 usrloc/ul_callback.h。
- *void *param* —— 每次调用回调时传入的参数。


#### ul_get_num_users()


该函数遍历所有域，累加用户数量。


### License {#license}


所有文档文件（即 .md 扩展名）均采用 Creative Common License 4.0 授权。
