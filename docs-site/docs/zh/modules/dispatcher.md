---
title: "dispatcher 模块"
description: "该模块为目的地地址实现了调度器。"
sidebar: false
---

## 管理员指南 {#admin-guide}

### 概述 {#overview}

该模块为目的地地址实现了调度器。它对请求的各个部分计算哈希，并从目的地集合中选择一个地址。随后，选中的地址既可以覆盖 SIP 请求的 R-URI，也可以用作出站代理。

该模块可用作无状态负载均衡器，但不保证公平分发。

对于分发算法，该模块允许为目的地定义权重。这在需要让各目的地之间具有不同流量比例时很有用。

从 2.1 版本开始，dispatcher 模块将目的地集合保存在不同的分区（partition）中。每个分区由自己的一组属性描述："db_url"、"table_name"、"dst_avp"、"grp_avp"、"cnt_avp"、"sock_avp"、"attr_avp"、"blacklists"、"ping_from"、"ping_method" 和 "persistent_state"。设置这些模块参数中的任何一个，只会修改 "default" 分区的属性。

要创建新分区，可以使用 [partition](#partition-string) 参数。如果没有为 "default" 分区定义这 8 个分区专属参数中的任何一个，那么该分区将不会被创建。一旦 "default" 分区被创建，其他分区中任何未定义的参数都会继承 "default" 分区中对应参数的值。如果没有 "default" 分区，则使用参数说明中指定的默认值。最后请注意，通过 "table_name" 分区属性指定的每张 dispatcher 表，都需要在该分区数据库中（通过 "db_url" 指定）有一条对应的 "version" 表记录。

从 2.1 版本开始，"flags" 参数已连同 "force_dst" 和 "use_default" 标志位一起移至 ds_select_dst() 和 ds_select_domain()。

### 依赖 {#dependencies}

#### OpenSIPS 模块 {#opensips-modules}

在本模块之前必须先加载以下模块：

- *TM —— 仅在需要主动恢复故障主机时*。
- *clusterer* —— 仅在启用 "cluster_id" 选项时。
- *database* —— 某个 DB SQL 模块
- *freeswitch* —— 仅在启用 "fetch_freeswitch_stats" 时。

#### 外部库或应用程序 {#external-libraries-or-applications}

在使用本模块运行 OpenSIPS 之前，必须安装以下库或应用程序：

- *无*。

### 导出参数 {#exported-parameters}

#### db_url (string)

模块的默认数据库连接，会覆盖全局的 'db_default_url' 设置。一旦指定，缺少 'db_url' 属性的分区将从该值继承其 URL。

*默认值为 "NULL"。*

```opensips title="为 dispatcher 设置默认数据库 URL"
...
modparam("dispatcher", "db_url", "mysql://user:passwb@localhost/database")
...
```

#### attrs_avp (str)

用于存放当前目的地属性字符串的 AVP 名称。当选中某个目的地时，该 AVP 会自动提供该属性字符串——这是一个（从 OpenSIPS 角度看）不透明的字符串：它从目的地定义（通过数据库）加载，并在脚本中原样使用。设置此参数只会更改默认分区的 attrs_avp。使用 partition 参数可创建和修改其他分区。

*默认值为 "null" —— 不提供 ATTRIBUTE。*

```opensips title="设置 'default' 分区的 'attrs_avp' 参数"
...
modparam("dispatcher", "attrs_avp", "$avp(272)")
...
```

#### script_attrs_avp (str)

用于存放当前目的地脚本属性字符串的 AVP 名称。当选中某个目的地时，该 AVP 会自动提供该属性字符串——这是一个（从 OpenSIPS 角度看）不透明的字符串：它通过 ds_push_script_attrs 的 MI 或脚本函数提供。

*默认值为 "null" —— 不提供 SCRIPT ATTRIBUTE。*

```opensips title="设置 'default' 分区的 'script_attrs_avp' 参数"
...
modparam("dispatcher", "attrs_avp", "$avp(script_attrs)")
...
```

#### algo_route (str)

使用算法 10 时要调用的路由名称。该路由将获得当前需要评估的 dispatcher 条目的 dst_uri、attrs 和 script_attrs 作为参数（可通过 $param(1)、$param(2) 和 $param(3) 获取，或在路由被调用时通过 $param(dst_uri)、$param(attrs) 和 $param(script_attrs) 获取）。dispatcher 模块会将路由的返回值视为该 dispatcher 条目的当前权重，并且在使用算法 10 时，dispatcher 条目按权重升序排序。

如果 algo 路由返回负值，则当前 dispatcher 条目会被自动跳过，不再使用。

*默认值为 "null" —— 禁用。*

```opensips title="使用 algo_route 进行哈希："
...
modparam("dispatcher", "algo_route", "my_dispatcher_logic)")
...
route[my_dispatcher_logic] {
        $var(curent_score) = 0;
        xlog("DISPATCHER - Running logic for $param(dst_uri) with attrs $param(attrs) and script attrs $param(script_attrs) \n");

	# 根据你的逻辑决定是否惩罚当前 dispatcher 条目
	if (my_condition_here)
		$var(current_score) = $var(current_score) + 10;

        return $var(rc);
}
```

#### hash_pvar (str)

用于哈希算法 7 的 PV 字符串。

> [!NOTE]
> 如果要对自定义消息部分进行哈希，必须设置此参数。

*默认值为 "null" —— 禁用。*

```opensips title="使用 $avp(273) 进行哈希："
...
modparam("dispatcher", "hash_pvar", "$avp(273)")
...
```

```opensips title="使用 PV 组合进行哈希："
...
modparam("dispatcher", "hash_pvar", "hash the $fU@$ci")
...
```

#### setid_pvar (str)

在调用 ds_is_in_list() 且不带 group 参数（第三个参数）时，用于存放集合 ID（组 ID）的 PV 名称。

*默认值为 "null" —— 不设置 PV。*

```opensips title="设置 'setid_pvar' 参数"
...
modparam("dispatcher", "setid_pvar", "$var(setid)")
...
```

#### ds_ping_method (string)

使用此方法可以定义用哪个方法探测故障网关。只有在编译时启用了故障网关探测，此方法才可用。

如果你想为其他分区定义 ping 方法，请使用 'partition' 参数。

*默认值为 "OPTIONS"。*

```opensips title="设置 'ds_ping_method' 参数"
...
modparam("dispatcher", "ds_ping_method", "INFO")
...
```

#### ds_ping_from (string)

使用此方法可以定义发送给故障网关的请求的 "From:" 行。只有在编译时启用了故障网关探测，此方法才可用。

如果你想为其他分区定义 "From:" ping 头域，请使用 'partition' 参数。

*默认值为 "sip:dispatcher@localhost"。*

```opensips title="设置 'ds_ping_from' 参数"
...
modparam("dispatcher", "ds_ping_from", "sip:proxy@sip.somehost.com")
...
```

#### ds_ping_interval (int)

使用此方法可以定义向故障网关发送请求的间隔。仅当加载了 TM 模块时才使用此参数。如果设置为 "0"，则禁用对故障请求的 ping。

*默认值为 "0"（禁用）。*

```opensips title="设置 'ds_ping_interval' 参数"
...
modparam("dispatcher", "ds_ping_interval", 30)
...
```

#### ds_ping_maxfwd (int)

此参数允许你为 Dispatcher 模块生成的 SIP ping 请求强制指定一个特定的 Max-Forward 值。如果未显式设置，则不会强制任何值，而交由事务层（TM 模块）设置默认的 Max-Forward 值。

可接受的值为任意正整数，包括 "0"。

```opensips title="设置 'ds_ping_maxfwd' 参数"
...
modparam("dispatcher", "ds_ping_maxfwd", 2)
...
```

#### ds_probing_sock (str)

本地套接字（即 OpenSIPS 用于 SIP 流量的套接字）的描述 [proto:]host[:port]，用于（在存在多个时）发送探测消息。

*默认值为 "NULL(none)"。*

```opensips title="设置 'ds_probing_sock' 参数"
...
modparam("dispatcher", "ds_probing_sock", "udp:192.168.1.100:5077")
...
```

#### ds_probing_threshold (int)

如果想把网关置入探测模式，需要达到特定数量的请求，它才会从 "active" 变为 probing。尝试次数可通过此参数设置。

*默认值为 "3"。*

```opensips title="设置 'ds_probing_threshold' 参数"
...
modparam("dispatcher", "ds_probing_threshold", 10)
...
```

#### ds_probing_mode (int)

控制测试哪些网关以判断其是否可达。如果设置为 0，只测试处于 PROBING 状态的网关；如果设置为 1，则测试所有网关。如果设置为 1 且应答为 408（超时），则处于 active 状态的网关会被置为 PROBING 状态。

*默认值为 "0"。*

```opensips title="设置 'ds_probing_mode' 参数"
...
modparam("dispatcher", "ds_probing_mode", 1)
...
```

#### ds_probing_list (str)

定义一个或多个 setid 的列表，用于限定在探测启用时探测哪些目的地。当多个代理共享同一张 dispatcher 表，而你想限定哪些代理负责探测特定目的地时，这很有用。

*默认值为 "NULL（探测所有集合）"。*

```opensips title="设置 'ds_probing_list' 参数"
...
modparam("dispatcher", "ds_probing_list", "1,2,3")
...
```

#### ds_define_blacklist (str)

基于 'default' 分区中的某个调度集合 setid 定义黑名单。该列表将包含与给定 setid 匹配的目的地的 IP（不含端口，涵盖所有协议）。如果你想基于其他分区的集合定义黑名单，请使用 'partition' 参数。

允许该参数有多个实例。

*默认值为 "NULL"。*

```opensips title="设置 'default' 分区的 'ds_define_blacklist' 参数"
...
modparam("dispatcher", "ds_define_blacklist", "list= 1,4,3")
modparam("dispatcher", "ds_define_blacklist", "blist2= 2,10,6")
...
```

#### options_reply_codes (str)

此参数必须包含一个以逗号分隔的 SIP 应答码列表。此处定义的应答码，除 200 之外，将被视为用于 ping 的 OPTIONS 消息的合法应答码。

*默认值为 "NULL"。*

```opensips title="设置 'options_reply_codes' 参数"
...
modparam("dispatcher", "options_reply_codes", "501, 403")
...
```

#### dst_avp (str)

这主要用于内部使用，表示用于存放地址列表的 AVP 名称，列表中地址按所选算法选出的顺序排列。如果 use_default 为 1，最后一个 dst_avp_id 的值就是目的地集合中的最后一个地址。第一个 dst_avp_id 是选中的目的地。目的地集合中的所有其他地址都会被加入 AVP 列表，以便实现顺序分叉。设置此参数只会更改默认分区的 dst_avp。使用 partition 参数可创建和修改其他分区。

*对于 'default' 分区，默认值为 "$avp(ds_dst_failover)"。对于任何其他分区，默认值为 "$avp(ds_dst_failover_partitionname)"。*

```opensips title="设置 'default' 分区的 'dst_avp' 参数"
...
modparam("dispatcher", "dst_avp", "$avp(271)")
...
```

#### grp_avp (str)

这主要用于内部使用，表示存放目的地集合组 ID 的 AVP 名称。保留它以便后续使用或检查很有好处。设置此参数只会更改默认分区的 grp_avp。使用 partition 参数可创建和修改其他分区。

*对于 'default' 分区，默认值为 "$avp(ds_grp_failover)"。对于任何其他分区，默认值为 "$avp(ds_grp_failover_partitionname)"。*

```opensips title="设置 'default' 分区的 'grp_avp' 参数"
...
modparam("dispatcher", "grp_avp", "$avp(273)")
...
```

#### cnt_avp (str)

这主要用于内部使用，表示存放 dst_avp 各 AVP 中保存的目的地地址数量的 AVP 名称。设置此参数只会更改默认分区的 cnt_avp。使用 partition 参数可创建和修改其他分区。

*对于 'default' 分区，默认值为 "$avp(ds_cnt_failover)"。对于任何其他分区，默认值为 "$avp(ds_cnt_failover_partitionname)"。*

```opensips title="设置 'default' 分区的 'cnt_avp' 参数"
...
modparam("dispatcher", "cnt_avp", "$avp(274)")
...
```

#### sock_avp (str)

这主要用于内部使用，表示存放 dst_avp 各 AVP 中保存的目的地地址所使用套接字的 AVP 名称。设置此参数只会更改默认分区的 sock_avp。使用 partition 参数可创建和修改其他分区。

*对于 'default' 分区，默认值为 "$avp(ds_sock_failover)"。对于任何其他分区，默认值为 "$avp(ds_sock_failover_partitionname)"。*

```opensips title="设置 'default' 分区的 'sock_avp' 参数"
...
modparam("dispatcher", "sock_avp", "$avp(275)")
...
```

#### pvar_algo_pattern (str)

此参数由 PVAR(9) 算法使用，用于指定检测每个目的地负载所用的伪变量模式。伪变量的名称中应包含字符串 "%u"，模块会在内部用目的地的 URI 替换它。也可以使用字符串 "%i"，它会被替换为目的地所属的集合 ID（当多个集合中存在相同 URI 时很有用）。

*默认值为 "none"。*

```opensips title="设置 'pvar_algo_pattern' 参数"
...
modparam("dispatcher", "pvar_algo_pattern", "$stat(load_%u)")
...
```

#### persistent_state (int)

指定对 "default" 分区而言，是否应在启动时加载 *state* 列并在运行时刷新它。

如果想为其他分区定义持久化状态，请使用 'partition' 参数。

*默认值为 "1"（启用）。*

```opensips title="设置 persistent_state 参数"
...
# 禁用与目的地状态相关的所有数据库操作
modparam("dispatcher", "persistent_state", 0)
...
```

#### cluster_id (integer) {#cluster_id-integer}

模块所属集群的 ID。dispatcher 模块中的集群支持有两个用途：共享目的地的状态，以及控制对目的地的 ping。

如果启用了集群，模块会自动与属于同一集群的其他 OpenSIPS 实例共享目的地状态的变化。每当此类状态发生变化（由 MI 命令、探测结果或脚本命令引起），模块就会把该状态变化复制到该集群中的所有节点。

带共享标签（sharing tag）的集群机制可用于控制集群中哪个节点对目的地执行 ping/探测。参见 [cluster_sharing_tag](#cluster_sharing_tag-string) 选项。

该 OpenSIPS 集群公开 **"dispatcher-status-repl"** 能力（capability），以便在任意同步请求期间把节点标记为符合条件的数据供体（data donor）。因此，集群必须*至少有一个节点*在 *clusterer.flags* 列/属性中标记为 **"seed"** 值，才能完全正常工作。更多细节请参阅 [clusterer - 能力](/zh/modules/clusterer#capabilities-layer) 章节。

有关如何定义和填充（使用 OpenSIPS 节点）集群的更多信息，请参阅 [clusterer](/zh/modules/clusterer) 模块。

*默认值为 "0 (none)"。*

```opensips title="设置 cluster_id 参数"
...
# 与集群 ID 为 9 的所有 OpenSIPS 复制目的地状态
modparam("dispatcher", "cluster_id", 9)
...
```

#### cluster_sharing_tag (string) {#cluster_sharing_tag-string}

共享标签（sharing tag）的名称（由各 clusterer 模块定义），用于控制哪个节点负责执行模块中的自触发动作。此类动作可以是目的地探测（另见 [cluster_probing_mode](#cluster_probing_mode-string) 参数），也可以是共享目的地状态的变化。如果已定义，只有持有该标签 active 状态的节点才会执行这些动作（ping 和共享状态）。

要使此选项生效，必须定义 [cluster_id](#cluster_id-integer)。

这是一个可选参数。如果未设置，集群中的所有节点都会共享状态变化。

*默认值为 "empty (none)"。*

```opensips title="设置 cluster_sharing_tag 参数"
...
# 只有持有 active "vip" 共享标签的节点才会执行 ping
# 并广播状态变化
modparam("dispatcher", "cluster_id", 9)
modparam("dispatcher", "cluster_sharing_tag", "vip")
...
```

#### cluster_probing_mode (string) {#cluster_probing_mode-string}

此参数控制在使用集群支持时应如何执行 probing/pinging。它涉及的是集群中哪个节点 ping 哪个网关/目的地。

要使此选项生效，必须定义 [cluster_id](#cluster_id-integer)。

支持的探测模式有：

- **"all"** —— 集群中的所有节点都会独立地 ping 所有已定义的目的地，即 "all" ping "all" 模式。
- **"by-shtag"** —— 所有目的地只由集群中的一个节点 ping，即 [cluster_sharing_tag](#cluster_sharing_tag-string) 处于 active 的那个节点。通过在其他节点上激活该共享标签，ping 职责会转移到集群中的另一个节点。
- **"distributed"** —— ping 工作被分散到集群中的所有节点，因此每个节点只 ping 全部目的地集合的一个子集。所有目的地仍会被 ping（且每个 ping 周期只 ping 一次）。当有新节点加入或有节点退出时，会依据集群中可用节点自动重新划分 ping 工作。但仍不保证哪个节点负责 ping 哪个目的地。

*默认值为 "all"。*

```opensips title="设置 cluster_probing_mode 参数"
...
# 只有持有 active "vip" 共享标签的节点才会执行 ping
modparam("dispatcher", "cluster_id", 9)
modparam("dispatcher", "cluster_sharing_tag", "vip")
modparam("dispatcher", "cluster_probing_mode", "by-shtag")
...
# ping 工作被分散到所有节点
modparam("dispatcher", "cluster_id", 9)
modparam("dispatcher", "cluster_probing_mode", "distributed")
...
```

#### partition (string)

使用以下属性定义一个新分区（数据源）："db_url"、"table_name"、"dst_avp"、"grp_avp"、"cnt_avp"、"sock_avp"、"attrs_avp"、"script_attrs"、"ds_define_blacklist"。所有这些属性都是可选的，且具有合适的默认值。

语法为："partition_name: param1 = value1; param2 = value2"。每个值的格式与用 modparam 定义特定参数时相同。

此参数可设置多次，从而按需定义任意多个分区。也可以用此参数定义 'default' 分区。

```opensips title="定义名为 'voicemail' 的新分区"
...
modparam("dispatcher", "partition",
                "voicemail:
                    db_url = mysql://user:passwd@localhost/database;
                    table_name = dispatcher;
                    attrs_avp = $avp(ds_attr_vm);
                    ds_define_blacklist = list2 = 4,6")
...
```

```opensips title="定义 'trunks' 分区并将其设为 'default' 分区，从而避免加载 'dispatcher' 表"
...
modparam("dispatcher", "partition",
                "trunks:
                    db_url = mysql://user:passwd@localhost/database;
                    table_name = dispatcher_trunks;
                    attrs_avp = $avp(ds_attr_trunks)")
modparam("dispatcher", "partition", "default: trunks")
...
```

#### table_name (string)

加载 dispatcher 目的地所用的默认表名。缺少 'table_name' 属性的分区将从该值继承其表名。

*默认值为 "dispatcher"。*

```opensips title="设置默认表名"
...
modparam("dispatcher", "table_name", "my_dispatcher")
...
```

#### setid_col (string)

数据库中存放网关组 ID 的列名。

*默认值为 "setid"。*

```opensips title="设置 'setid_col' 参数"
...
modparam("dispatcher", "setid_col", "groupid")
...
```

#### destination_col (string)

数据库中存放目的地 SIP URI 的列名。

*默认值为 "destination"。*

```opensips title="设置 'destination_col' 参数"
...
modparam("dispatcher", "destination_col", "uri")
...
```

#### state_col (string)

数据库中存放目的地 URI 状态的列名。

*默认值为 "state"。*

```opensips title="设置 'state_col' 参数"
...
modparam("dispatcher", "state_col", "dststate")
...
```

#### weight_col (string)

数据库中存放目的地 URI 权重的列名。

*默认值为 "weight"。*

```opensips title="设置 'weight_col' 参数"
...
modparam("dispatcher", "weight_col", "dstweight")
...
```

#### priority_col (string)

数据库中存放目的地 URI 优先级的列名。

*默认值为 "priority"。*

```opensips title="设置 'priority_col' 参数"
...
modparam("dispatcher", "priority_col", "dstprio")
...
```

#### attrs_col (string)

数据库中存放目的地 URI 属性（不透明字符串）的列名。

*默认值为 "attrs"。*

```opensips title="设置 'attrs_col' 参数"
...
modparam("dispatcher", "attrs_col", "dstattrs")
...
```

#### socket_col (string)

数据库中存放目的地 URI 套接字（以字符串形式）的列名。

*默认值为 "socket"。*

```opensips title="设置 'socket_col' 参数"
...
modparam("dispatcher", "socket_col", "my_sock")
...
```

#### probe_mode_col (string)

数据库中存放目的地 probe_mode（以字符串形式）的列名。

*默认值为 "probe_mode"。*

```opensips title="设置 'probe_mode_col' 参数"
...
modparam("dispatcher", "probe_mode_col", "probing")
...
```

#### fetch_freeswitch_stats (integer)

如果启用，FreeSWITCH 目的地可以具有动态调度权重，并在运行时通过 FreeSWITCH Event Socket Layer 刷新。对于这些目的地，必须在 "weight" 列中配置 Event Socket Layer URL，而不是整数字符串。一些示例值：*"fs://:password@freeswitch.example.com"* 或 *"fs://user:password@127.0.0.1:8021"*。默认 ESL 端口为 8021。

OpenSIPS 会与给定套接字建立连接，并使用 FreeSWITCH 侧推送的统计信息定期计算/更新这些目的地的权重。

自动计算出的权重值范围为 **0 - 100**。在把普通目的地与 FreeSWITCH 目的地分组时，这很有帮助。

动态权重每 *event_heartbeat_interval* 秒重新计算一次（有关该设置的更多细节参见 "freeswitch" OpenSIPS 模块），这也是预期收到 FreeSWITCH 统计信息的周期。更新公式如下（FreeSWITCH 统计项以粗体标出）：

*weight = 100 * (**Idle-CPU** / 100) * (1 - **Session-Count** / **Max-Sessions**)*

*默认值为 **0**（禁用）。*

```opensips title="设置 fetch_freeswitch_load 参数"
...
modparam("dispatcher", "fetch_freeswitch_stats", 1)
...
```

#### max_freeswitch_weight (integer)

启用 FreeSWITCH ESL 的目的地的最大权重。在启动/重载时如果尚无 FreeSWITCH 统计信息，也会使用该值。

重要：当把普通目的地与启用 FreeSWITCH 的目的地混在同一调度集合中时，OpenSIPS 会把所有大于 **max_freeswitch_weight** 的权重值截断为该参数的值！

NOTE: OpenSIPS 在内部会把权重四舍五入到最接近的整数，因此更大的最大权重值能更准确地反映 FreeSWITCH 上的当前负载！例如，如果把此参数设为 1，那么只要某台机器的 CPU 或会话使用率超过 50%，它就不会再收到流量！

*默认值为 **100**。*

```opensips title="设置 max_freeswitch_weight 参数"
...
modparam("dispatcher", "max_freeswitch_weight", 1000)
...
```

### 导出函数 {#exported-functions}

#### ds_select_dst(set, alg, [flags], [partition], [max_res]) {#ds_select_dstset-alg-flags-partition-max_res}

该方法从给定的地址集合中选择一个目的地。它会覆盖 SIP 请求的目的地 URI（*$du*）。

参数含义如下：

- *set (int)* —— 从中选择目的地的集合标识符
- *alg (int)* —— 用于选择目的地地址的算法

  - "0" —— 对 callid 计算哈希
  - "1" —— 对 from uri 计算哈希。
  - "2" —— 对 to uri 计算哈希。
  - "3" —— 对 request-uri 计算哈希。
  - "4" —— 加权轮询（weighted round-robin，下一个目的地）。目的地的权重决定在转到下一个之前它被选中多少次
  - "5" —— 对 authorization-username（Proxy-Authorization 或"普通"授权）计算哈希。如果找不到用户名，则使用加权轮询。
  - "6" —— 随机（使用 rand()）。
  - "7" —— 对 PV 字符串的内容计算哈希。注意：仅当设置了参数 hash_pvar 时才有效。
  - "8" —— 选择集合中的第一个条目。
  - "9" —— 使用 *pvar_algo_pattern* 参数确定每个服务器的负载。如果未指定该参数，则选择集合中的第一个条目。
  - "10" —— 对 setid 中的每个 dispatcher 条目调用 *algo_route* OpenSIPS 路由，以决定路由顺序。用法示例参见 algo_route 参数
  - "X" —— 如果算法未实现，则选择集合中的第一个条目。
- *flags (string, optional)* —— 一个标志设置字符串，用于调整函数行为：

  - 'f'（故障切换支持）：使目的地集合中剩余的地址被存储到内部管理的 AVP 中。随后可以使用 [ds_next_dst()](#ds_next_dstpartition) 切换到下一个地址，从而实现到所有可能目的地的顺序分叉
  - 'u'（仅用户）：指定只使用 URI 的用户部分进行哈希
  - 'd'（使用默认）：把目的地集合中的最后一个地址作为发送消息的最后选项
  - 'a'（追加目的地）：把任何新目的地追加到当前目的地列表，而不是重写该列表
  这些标志位按分区分别保存。
- *partition (string, optional)* —— DB 分区名称
- *max_res (int, optional)* —— 表示指定的故障切换 AVP 中最多只包含一定数量的目的地。这样既可有多个目的地，又能在某个号码全局性地注定失败时避免过多的故障切换尝试。

该函数可在 REQUEST_ROUTE、BRANCH_ROUTE 和 FAILURE_ROUTE 中使用。

```opensips title="ds_select_dst 用法"
...
if (!ds_select_dst(1, 0)) {
	xlog("ERROR: no active destinations found!\n");
	send_reply(503, "Service Unavailable");
	exit;
}
...
ds_select_dst(1, 0, , "fs_boxes", 5);
...
ds_select_dst(1, 0, "fUD", "ask_boxes");
...
ds_select_dst(2, 0, "fud", "pstn_gws", 5);
ds_select_dst(3, 1, "fua", "pstn_gws", 2);
...
# 使用变量
$var(part) = "pstn_gws"
$var(setid) = 1;
$var(alg) = 4;
$var(flags) = "fdu";
$var(max_res) = 2;
ds_select_dst($var(setid), $var(alg), $var(flags), $var(part), $var(max_res));
...
```

#### ds_select_domain(set, alg, [flags], [partition], [max_res]) {#ds_select_domainset-alg-flags-partition-max_res}

该方法从地址集合中选择一个目的地，并重写 Request-URI（*$ru*）的主机名和端口部分。其参数含义与 [ds_select_dst()](#ds_select_dstset-alg-flags-partition-max_res) 相同。

如果存在 "f"（故障切换支持）标志位，则目的地集合中剩余的地址会被存入内部管理的 AVP。随后可以使用 [ds_next_domain()](#ds_next_domainpartition) 切换到列表中的下一个地址，从而实现到所有可能目的地的顺序分叉。

该函数可在 REQUEST_ROUTE、BRANCH_ROUTE 和 FAILURE_ROUTE 中使用。

#### ds_next_dst([partition]) {#ds_next_dstpartition}

从 id 为 partition.'dst_avp_id' 的 AVP 中取出下一个目的地地址，并设置 dst_uri（出站代理地址）。如果省略了 "partition"，则使用默认分区。此函数使用在 ds_select_dst 或 ds_select_domain 中设置的标志位。

该函数可在 REQUEST_ROUTE 和 FAILURE_ROUTE 中使用。

#### ds_next_domain([partition]) {#ds_next_domainpartition}

从 id 为 partition.'dst_avp_id' 的 AVP 中取出下一个目的地地址，并设置请求 URI 的域部分。如果省略了 "partition"，则使用默认分区。此函数使用在 ds_select_dst 或 ds_select_domain 中设置的标志位。

该函数可在 REQUEST_ROUTE 和 FAILURE_ROUTE 中使用。

#### ds_mark_dst([state], [partition])

将分区目的地集合中最后使用的地址标记为 inactive（"i"/"I"/"0"）、active（"a"/"A"/"1"）或 probing（"p"/"P"/"2"）。使用此函数可以实现对故障网关的自动检测。当地址被标记为 inactive 或 probing 后，[ds_select_dst()](#ds_select_dstset-alg-flags-partition-max_res) 和 [ds_select_domain()](#ds_select_domainset-alg-flags-partition-max_res) 会忽略它。如果省略了 "partition"，则使用默认分区。此函数使用在 [ds_select_dst()](#ds_select_dstset-alg-flags-partition-max_res) 或 [ds_select_domain()](#ds_select_domainset-alg-flags-partition-max_res) 中设置的标志位。

可能的参数：

- state (string, optional) —— 最后尝试的目的地的新状态。可能的值：

  - *"i"、"I" 或 "0"（默认）* —— 最后的目的地应被置为 inactive，并在后续请求中被忽略。
  - *"a"、"A" 或 "1"* —— 最后的目的地应被置为 active。
  - *"p"、"P" 或 "2"* —— 最后的目的地将被置为 probing。注意：需要调用此函数 "threshold" 次，它才会真正被置为 probing。
- partition (string, optional) —— DB 分区名称，否则使用默认分区

该函数可在 REQUEST_ROUTE 和 FAILURE_ROUTE 中使用。

#### ds_count(set, state_filter, res_var, [partition])

返回某分区集合中 active、inactive 或 probing 目的地的数量，或这些属性组合的数量。

参数含义：

- *set (int)* —— 一个调度目的地集合
- *state_filter (string)* —— 应统计哪些目的地。可以是 active（"a"、"A" 或 "1"）、inactive（"i"、"I" 或 "0"）、probing（"p"、"P" 或 "2"）目的地，或这些标志位的不同组合，例如 "pI"、"1i"、"ipA"……
- *res_var (variable)* —— 用于存放整型结果的变量
- *partition (string, optional)* —— DB 分区名称。如果省略，则使用 "default" 分区。

该函数可在 REQUEST_ROUTE、FAILURE_ROUTE、BRANCH_ROUTE、LOCAL_ROUTE、TIMER_ROUTE、EVENT_ROUTE 中使用

```opensips title="ds_count 用法"
...
if (ds_count(1, "a", $avp(result))) {
	...
}
...
if (ds_count($avp(set), "ip", $avp(result), $avp(partition))) {
	...
}
...
```

#### ds_is_in_list(ip, port, [set], [partition], [active_only], [pattern])

仅当 "ip" 和 "port" 指向给定 dispatcher "set" 中的某台主机时，此函数才返回 *true*。

参数含义：

- *ip (string)* —— 用于与 dispatcher "set" 进行测试的 IPv4 或 IPv6 地址
- *port (int)* —— 用于与 dispatcher 列表进行测试的端口。使用 *0* 值可匹配任意端口
- *set (int, optional)* —— 用于测试的 dispatcher 集合标识符。如果缺失，则检查所有集合。*-1* 集合是一个特殊值，充当"检查所有集合"的通配符。
- *partition (string, optional)* —— DB 分区名称
- *active_only (int, optional)* —— 指定非零值以便只搜索 active 状态的目的地（忽略处于 probing 和 inactive 状态的目的地）
- *pattern (string, optional)* —— 用于匹配目的地属性的 glob 模式。如果目的地 IP 和端口匹配，但该模式与目的地属性不匹配，函数将失败。

该函数可在 REQUEST_ROUTE、FAILURE_ROUTE、BRANCH_ROUTE 和 ONREPLY_ROUTE 中使用。

```opensips title="ds_is_in_list 用法"
...
if (ds_is_in_list($si, $sp)) {
	# 源 IP:PORT 在某个 dispatcher 列表中
}
...
if (ds_is_in_list($rd, $rp, 2)) {
	# R-URI（IP 和端口）位于 "default" 分区的 dispatcher 集合 2 中
}
...
if (ds_is_in_list($rd, $rp, 2, "part2")) {
	# R-URI（IP 和端口）位于 "part2" 分区的 dispatcher 集合 2 中
}
...
```

#### ds_push_script_attrs(script_attr, ip, port, set, [partition])

为 IP、Port、setid 和分区定义的 dispatcher 条目设置脚本属性。

参数含义：

- *script_attr (str 或 pvar)* —— 新的脚本属性
- *IP (string)* —— 正在为其推送脚本属性的 IP 地址
- *port (int)* —— 正在为其推送脚本属性的端口
- *setid (int)* —— 正在为其推送脚本属性的 setid
- *partition (string, optional)* —— DB 分区名称。如果省略，则使用 "default" 分区。

该函数可在 REQUEST_ROUTE、FAILURE_ROUTE、BRANCH_ROUTE、LOCAL_ROUTE、TIMER_ROUTE、EVENT_ROUTE 中使用

```opensips title="ds_count 用法"
...
if (ds_push_script_attrs($var(my_attributes),$si , $sp, 1, 'my_partition')) {
	...
}
...
```

#### ds_get_script_attrs(uri, set, [partition], out_attrs)

获取由 URI、setid 和分区定义的 dispatcher 条目的脚本属性。

参数含义：

- *URI (string)* —— 正在为其获取脚本属性的 URI 地址
- *setid (int)* —— 正在为其推送脚本属性的 setid
- *partition (string, optional)* —— DB 分区名称。如果省略，则使用 "default" 分区。
- *out_atrs (pvar)* —— 用于存放脚本属性的变量名称。

该函数可在 REQUEST_ROUTE、FAILURE_ROUTE、BRANCH_ROUTE、LOCAL_ROUTE、TIMER_ROUTE、EVENT_ROUTE 中使用

```opensips title="ds_count 用法"
...
if (ds_push_script_attrs($var(my_attributes),$si , $sp, 1, 'my_partition')) {
	...
}
...
```

### 导出 MI 函数 {#exported-mi-functions}

#### ds_set_state

设置目的地地址的状态（可用于把目的地标记为 active 或 inactive）。

名称：*ds_set_state*

参数：

- *state*：目的地地址的状态

  - "a"：active
  - "i"：inactive
  - "p"：probing
- *group*：分区名称后跟冒号，再跟目的地组 ID。如果省略分区名称，则使用默认分区
- *address*：该组中目的地的地址

MI FIFO 命令格式：

```bash
opensips-cli -x mi ds_set_state a 2 sip:10.0.0.202
```

#### ds_list

列出所有分区的组及其中包含的目的地。

名称：*ds_list*

参数：

- *full*（可选）—— 在列表中增加 weight、priority 和 description 字段
- *partition*（可选）—— 只返回所提供分区中的目的地和集合。

MI FIFO 命令格式：

```bash
opensips-cli -x mi ds_list
```

#### ds_reload

重新加载指定分区或所有分区的组及其中包含的目的地。

名称：*ds_reload*

参数：

- *partition*（可选）—— 要重新加载的分区名称。默认分区为 "default"。
- *inherit_state*（可选）：是否继承目的地的旧状态，默认为 y。

  - "n"：不继承状态
  - "y"：继承状态

MI FIFO 命令格式：

```bash
opensips-cli -x mi ds_reload
opensips-cli -x mi ds_reload inherit_state=n
```

#### ds_push_script_attrs

为 IP、Port、setid 以及可选分区定义的 dispatcher 条目推送脚本属性。

名称：*ds_push_script_attrs*

参数：

- *attrs*：要推送的新属性
- *ip*：正在为其推送脚本属性的 IP
- *port*：正在为其推送脚本属性的端口
- *setid*：正在为其推送脚本属性的 setid
- *partition（可选）*：正在为其推送脚本属性的分区

MI FIFO 命令格式：

```bash
$opensips-cli -x mi ds_push_script_attrs '{"ping":"30000","load":"50"}' '192.168.0.107' 5091 1 main
```

### 导出事件 {#exported-events}

#### E_DISPATCHER_STATUS

当 dispatcher 模块把某个目的地标记为已激活或已停用时，会触发此事件。

参数：

- *partition* —— 目的地的分区名称。
- *group* —— 目的地的组。
- *address* —— 目的地的地址。
- *status* —— 如果目的地被激活则为 *active*，如果检测到目的地无响应则为 *inactive*。

### 导出状态/报告标识符 {#exported-statusreport-identifiers}

模块提供 "dispatcher" Status/Report 组，其中每个分区都定义为一个独立的 SR 标识符。

#### [partition_name]

这些标识符的状态反映缓存数据的就绪程度/状态（从数据库加载时数据是否可用）：

- *-2* —— 完全没有数据（初始状态）
- *-1* —— 无数据，正在进行初始加载
- *1* —— 数据已加载，分区就绪
- *2* —— 数据可用，正在重新加载

重载上报：

在数据重新加载方面，将上报以下事件：

- 开始加载数据库数据
- 数据库数据加载失败，正在丢弃
- 数据库数据加载成功完成
- 已加载 N 个目的地（丢弃 N 个）

```json
{
    "Name": "default",
    "Reports": [
        {
            "Timestamp": 1652373212,
            "Date": "Thu May 12 19:33:32 2022",
            "Log": "starting DB data loading"
        },
        {
            "Timestamp": 1652373212,
            "Date": "Thu May 12 19:33:32 2022",
            "Log": "DB data loading successfully completed"
        },
        {
            "Timestamp": 1652373212,
            "Date": "Thu May 12 19:33:32 2022",
            "Log": "2 destinations loaded (0 discarded)"
        }
    ]
}
```

#### [partition_name];events

目的地切换上报：

为上报与目的地状态变化相关的事件，模块提供了单独的标识符（每个分区仍然一个）。为什么要单独设置？因为关于状态变化的报告可能很冗长，而且由于状态变化日志数量很多，在重载时存在丢失/丢弃重要报告的风险；

因此，每个分区都会提供名为 "partition_name;events" 的标识符，用于上报目的地的状态变化及变化原因。这些标识符在丢弃旧记录之前保留 200 条记录历史。

```json
{
    "Name": "default;events",
    "Reports": [
        {
            "Timestamp": 1652373308,
            "Date": "Thu May 12 19:35:08 2022",
            "Log": "DESTINATION <sip:127.0.1.1>, set 1 switched to [inactive] due to negative probing reply\n"
        },
        {
            "Timestamp": 1652373308,
            "Date": "Thu May 12 19:35:08 2022",
            "Log": "DESTINATION <sip:127.0.1.2>, set 1 switched to [inactive] due to negative probing reply\n"
        }
    ]
},
```

关于如何访问和使用 Status/Report 信息，请参阅 [Status/Report Interface](/zh/manual/Interface-StatusReport)。

## 示例 {#samples}

[samples](https://github.com/OpenSIPS/opensips/tree/3.6/modules/dispatcher/samples)

## 常见问题 {#frequently-asked-questions}

**问：*dispatcher* 是否提供公平的分发？**

无法保证。应进行一些测量，以确定哪种分发算法更适合你的环境。

**问：*dispatcher* 是对话有状态的吗？**

不是。Dispatcher 是无状态的，尽管某些分发算法被设计为为同一对话的后续请求选择相同的目的地（例如对 call-id 计算哈希）。

**问：*ds_is_from_list()* 函数发生了什么？**

该函数已被更通用的 *ds_is_in_list()* 函数取代，后者以 IP 和 PORT 作为参数与 dispatcher 列表进行测试。

ds_is_from_list() == ds_is_in_list("$si", "$sp")

**问：dispatcher 在选择目的地时如何使用权重和优先级？**

目的地的 *weight* 目前用于哈希算法中，它会提高该目的地被选中的概率（如果有两个目的地，权重分别为 1 和 4，那么后者被选中的可能性是前者的 4 倍）。所有权重之和不需要累加到某个特定数值。权重现在也用于轮询（round-robin）算法：某个目的地会被连续选中与其权重相同的次数，然后才转到下一个目的地。

*priority* 字段用于对集合中的目的地排序。它不影响目的地被选中的总体概率。它会在列出目的地时体现，该字段当然也可以用于进一步的选择算法。

**问：*list_file* 模块参数发生了什么？**

对文本文件（用于配置目的地）的支持已被移除。现在只有数据库支持（通过数据库表进行数据配置）可用——如果仍想使用文本文件进行数据配置，请使用 db_text 数据库驱动（通过文本文件模拟的数据库）

**问：在哪里可以找到关于 OpenSIPS 的更多信息？**

请访问 [https://opensips.org/](https://opensips.org/)。

**问：在哪里可以就本模块提问？**

首先请检查你的问题是否已在我们某个邮件列表中得到解答：

关于任何稳定版本的邮件应发送至 users@lists.opensips.org，关于开发版本或 SVN 快照的邮件应发送至 devel@lists.opensips.org。

如果希望邮件保持私密，请发送至 users@lists.opensips.org。

**问：如何报告 bug？**

请遵循以下位置的指南：[https://github.com/OpenSIPS/opensips/issues](https://github.com/OpenSIPS/opensips/issues)
<!-- CONTRIBUTORS -->

### 许可证 {#license}

所有文档文件（即 .md 扩展名的文件）均按 Creative Common License 4.0 授权
