---
title: "permissions 模块"
description: "本模块依据纯文本规则文件判断呼叫路由、注册、URI 与地址是否具备相应权限。"
---


## 管理指南 {#admin-guide}


### 概述 {#overview}


#### 呼叫路由 {#call-routing}


本模块可用于判断一次呼叫是否具备建立所需的权限。
权限规则存储在纯文本配置文件中，格式类似于 tcpd 使用的
`hosts.allow` 与 `hosts.deny` 文件。


调用 `allow_routing` 函数时，它会尝试查找一条与消息选定字段相匹配的
规则。


OpenSIPS 是分叉代理，因此单条消息可以同时发往不同目的地。检查权限时
必须检查所有目的地，只要其中一个失败，转发就会失败。


匹配算法如下，先匹配者生效：


- 构造一组对，形式为 (From, 分支 1 的 R-URI)、(From, 分支 2 的 R-URI) 等。
- 当所有对都匹配 allow 文件中的条目时，路由被允许。
- 否则，当其中任意一对匹配 deny 文件中的条目时，路由被拒绝。
- 否则，路由被允许。


不存在的权限控制文件按空文件处理。因此，只要不提供任何权限控制文件，
就可以关闭权限控制。


From 头域与 Request-URI 始终用正则表达式进行比较！语法参见示例文件：
`config/permissions.allow`。


#### 注册权限 {#registration-permissions}


除了呼叫路由之外，还可以检查 REGISTER 消息，并基于配置文件决定该消息
是否应被允许、注册是否被接受。


该函数的主要目的是阻止“禁止的” IP 地址注册。举例来说，当恶意用户
注册一个包含 PSTN 网关 IP 地址的 Contact 时，他可能得以绕过 SIP 代理
执行的授权检查。这是不可接受的，因此应拒绝试图注册 PSTN 网关 IP 地址的
请求。文件 `config/register.allow` 与 `config/register.deny` 包含示例
配置。


用于注册检查的函数名为 `allow_register`，其算法与
[呼叫路由](#call-routing) 中描述的算法非常相似。唯一的区别在于对的
构造方式。


该函数不使用 From 头域，而是使用 To 头域，因为 REGISTER 消息中的
To 头域包含被注册者的 URI。该函数不使用各分支的 Request-URI，
而是使用 Contact 头域。


因此，用于匹配的对形如：(To, Contact 1)、(To, Contact 2)、
(To, Contact 3)，以此类推。


匹配算法与 [呼叫路由](#call-routing) 中所述相同。


#### URI 权限 {#uri-permissions}


本模块可用于判断请求是否被允许发往某个 pvar 中存储的 URI 所指定的
目的地。权限规则存储在纯文本配置文件中，格式类似于 tcpd 使用的
`hosts.allow` 与
`hosts.deny` 文件。


调用 `allow_uri`
函数时，它会尝试查找一条与消息选定字段相匹配的规则。
匹配算法如下，先匹配者生效：


- 构造一个对 <From URI, pvar 中存储的 URI>。
- 当该对匹配 allow 文件中的条目时，请求被允许。
- 否则，当该对匹配 deny 文件中的条目时，请求被拒绝。
- 否则，请求被允许。


不存在的权限控制文件按空文件处理。因此，只要不提供任何权限控制文件，
就可以关闭权限控制。


From URI 与 pvar 中存储的 URI 始终用正则表达式进行比较！语法参见
示例文件：`config/permissions.allow`。


#### 地址权限 {#address-permissions}


本模块可用于判断某个地址（IP 地址与端口）是否匹配缓存在 OpenSIPS
数据库表中的任一 IP 子网。
缓存数据库表中的端口 0 匹配任意端口。待匹配的组 ID、IP 地址、端口与
传输协议取值可以取自请求（`check_source_address`），也可以作为 pvar
参数传入，或直接以字符串传入（`check_address`）。


缓存数据库表中存储的地址可以按组标识符（无符号整数）归入一个或多个
组。组标识符作为参数传给 `check_address` 与
`check_source_address`。


否则请求被拒绝。


地址数据库表由模块参数指定。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


加载本模块之前必须先加载以下模块：


- *不依赖其他 OpenSIPS 模块*。


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，必须安装以下库或应用程序：


- *无*。


### 导出的参数 {#exported-parameters}


#### default_allow_file (string)


无参数函数使用的默认 allow 文件。如果未指定完整路径名，则使用主配置文件
所在目录。


*默认值为 "permissions.allow"。*


```opensips title="Set default_allow_file parameter"
...
modparam("permissions", "default_allow_file", "/etc/permissions.allow")
...
```


#### default_deny_file (string)


包含 deny 规则的默认文件。该文件供无参数函数使用。如果未指定完整路径名，
则使用主配置文件所在目录。


*默认值为 "permissions.deny"。*


```opensips title="Set default_deny_file parameter"
...
modparam("permissions", "default_deny_file", "/etc/permissions.deny")
...
```


#### check_all_branches (integer)


若设置，allow_routing 系列函数将检查所有分支的 Request-URI（默认）。
若禁用，则只检查第一个分支的 Request-URI。


> [!WARNING]
> 除非确实清楚自己在做什么，否则不要禁用此参数。


*默认值为 1。*


```opensips title="Set check_all_branches parameter"
...
modparam("permissions", "check_all_branches", 0)
...
```


#### allow_suffix (string)


当使用 `allow_routing` 或
`allow_register` 的单参数版本时，追加到 basename 之后以构成 allow
文件名的后缀。


> [!NOTE]
> 包含前导点。


*默认值为 ".allow"。*


```opensips title="Set allow_suffix parameter"
...
modparam("permissions", "allow_suffix", ".allow")
...
```


#### deny_suffix (string)


当使用 `allow_routing` 或
`allow_register` 的单参数版本时，追加到 basename 之后以构成 deny 文件
名的后缀。


> [!NOTE]
> 包含前导点。


*默认值为 ".deny"。*


```opensips title="Set deny_suffix parameter"
...
modparam("permissions", "deny_suffix", ".deny")
...
```


#### db_url (string) {#db_url-string}


用于加载与基于 IP 的检查（"address" 表）相关数据的数据库 URL。


此参数为可选，仅在使用与基于 IP 的检查相关的函数时才需要。若使用这些
函数，必须显式设置此参数（它不会从
"db_default_url" 继承）


从 2.2 版本起，此 URL 表示
"default" 分区的 db_url。


*默认值为 "NULL"。*


```opensips title="Set db_url parameter"
...
modparam("permissions", "db_url", "dbdriver://username:password@dbhost/dbname")
...
```


#### address_table (string) {#address_table-string}


包含 `allow_register` 函数所用匹配规则的数据库表名。
从 2.2 版本起，此表名也作为未设置 'table_name' 的分区的默认表名。


*默认值为 "address"。*


```opensips title="Set address_table parameter"
...
modparam("permissions", "address_table", "pbx")
...
```


#### partition (string)


指定一个新的基于 IP 的检查分区（数据源）。此
参数可多次设置。每个分区可以有
自己的 "db_url" 与 "table_name"。若未指定，这些值
将分别继承自 [db_url](#db_url-string)、db_default_url
或 [address_table](#address_table-string)。默认分区的
名称为 'default'。


```opensips title="Set partition parameter"
...
modparam("permissions", "partition", "
	inbound:
		db_url = postgres://opensips:opensipsrw@127.0.0.1/opensips;
		table_name = address")
...
```


#### grp_col (string)


包含地址组标识符的地址表列名。


*默认值为 "grp"。*


```opensips title="Set grp_col parameter"
...
modparam("permissions", "grp_col", "group_id")
...
```


#### ip_col (string)


包含地址中 IP 地址部分的地址表列名。


*默认值为 "ip"。*


```opensips title="Set ip_col parameter"
...
modparam("permissions", "ip_col", "ipess")
...
```


#### mask_col (string)


包含地址网络掩码的地址表列名。可选值为 0-128。若
IP 为 v4 则最大为 32，若 IP 为 v6 则最大为 128。


*默认值为 "mask"。*


```opensips title="Set mask_col parameter"
...
modparam("permissions", "mask_col", "subnet_length")
...
```


#### port_col (string)


包含地址中端口部分的地址表列名。


*默认值为 "port"。*


```opensips title="Set port_col parameter"
...
modparam("permissions", "port_col", "prt")
...
```


#### proto_col (string)


包含传输协议的地址表列名，该协议与
收到的请求的传输协议进行匹配。可存储在
proto_col 中的值为 "any"、"udp"、
"tcp"、"tls"、
"sctp" 与 "none"。值
"any" 始终匹配，值
"none" 永不匹配。


*默认值为 "proto"。*


```opensips title="Set proto_col parameter"
...
modparam("permissions", "proto_col", "transport")
...
```


#### pattern_col (string)


包含模式的地址表列名（shell 通配符模式，类似文件名匹配所用的模式），
该模式与 `check_address`
或 `check_source_address` 收到的参数进行匹配。


*默认值为 "pattern"。*


```opensips title="Set pattern_col parameter"
...
modparam("permissions", "pattern_col", "wildcard_col")
...
```


#### info_col (string)


包含一个字符串的地址表列名，当函数成功时，该字符串作为值
写入传给 `check_address`
或 `check_source_address` 的 pvar 参数。


*默认值为 "context_info"。*


```opensips title="Set info_col parameter"
...
modparam("permissions", "info_col", "info_col")
...
```


### 导出的函数 {#exported-functions}


#### check_address(group_id, ip, port, proto [, context_info], [pattern], [partition])


如果作为参数给出的组 ID、IP 地址、端口与协议匹配缓存地址表中的某个
IP 子网（如[地址权限](#address-permissions) 一节所述），则返回 1。
该函数接受 4 个必填参数与 3 个可选参数。


此函数可用于检查某个请求能否免鉴权放行。


各参数含义如下：


- group_id (int)
此参数表示待匹配的组 ID。
若 group_id 参数为 "0"，查询可匹配缓存地址表中的任意组。
- ip (string)
此参数表示待匹配的 IP 地址。
此参数不能为空。
- port (int)
此参数表示待匹配的端口。
缓存地址表中端口值为 0 的条目
匹配任意端口。
此外，该参数取 *0* 值时也会匹配
地址表中的任意端口。
- proto (string)
此参数表示用于传输的协议；
传输协议为 "ANY" 或任何
有效传输协议值："UDP"、"TCP"、"TLS" 与 "SCTP"。
- context_info (var, optional)
此参数表示一个变量，匹配成功时缓存地址表中的 context_info 字段
会存入该变量。
- pattern (string, optional)
此参数是一个字符串，用于与地址表中的通配符
模式字段进行匹配。
- partition (string, optional)
组 ID 的可选分区名。若未指定分区，
则使用 "default" 分区。


此函数可在 REQUEST_ROUTE、FAILURE_ROUTE、
LOCAL_ROUTE、BRANCH_ROUTE、STARTUP_ROUTE、TIMER_ROUTE、EVENT_ROUTE 中使用。


```opensips title="check_address() usage"
...

// 检查以字符串给出的 IP 地址/端口与以 pvar 给出的
// 源协议是否属于组 4，验证字符串 "texttest" 是否
// 匹配数据库表中的通配符模式字段，并将上下文信息
// 存入 $avp(ctx)
if (check_address( 4, "192.168.2.135", 5700, "$socket_in(proto)", $avp(ctx), "texttest")) {
	t_relay();
	xlog("$avp(ctx)\n");
}

if (check_address( 4, "192.168.2.135", 5700, "$socket_in(proto)", , , "my_part")) {
	t_relay();
	xlog("$avp(ctx)\n");
}
...

// 检查源消息的 IP 地址/端口/协议三元组是否属于组 4
if (check_address( 4, "$si", "$sp", "$socket_in(proto)")) {
	t_relay();
}

...

// 检查存储在 AVP s:ip/s:port/s:proto 中的 IP 地址/端口/协议三元组
// 是否属于组 4，并将上下文信息存入 $avp(ctx)
$avp(ip) = "192.168.2.135";
$avp(port) = 5061;
$avp(proto) = "any";
$avp(partition)="my_part";
if (check_address( 4, $avp(ip), $avp(port), $avp(proto), $avp(ctx), , $avp(partition))) {
	t_relay();
	xlog("$avp(ctx)\n");
}

...

// 检查以字符串给出的 IP 地址/端口与以 pvar 给出的
// 源协议是否属于组 4，验证字符串 "texttest" 是否
// 匹配数据库表中的通配符模式字段，不存储任何
// 上下文信息
if (check_address( 4,$si, 5700, $socket_in(proto), ,"texttest")) {
	t_relay();
}

...
```


#### check_source_address(group_id , [context_info], [pattern], [partition])


等价于 check_address(group_id, "$si", "$sp", "$socket_in(proto)", context_info, pattern, partition)。


此函数可在 REQUEST_ROUTE、FAILURE_ROUTE、
LOCAL_ROUTE、BRANCH_ROUTE、STARTUP_ROUTE、TIMER_ROUTE、EVENT_ROUTE 中使用。


```opensips title="check_source_address() usage"
...
// 检查源地址/端口/协议是否属于组 4，并将
// 上下文信息存入 $avp(ctx)
if (check_source_address( 4,$avp(ctx), , , $avp(my_partition))) {
	xlog("$avp(ctx)\n");
}else {
	sl_send_reply(403, "Forbidden");
}
...
```


#### get_source_group(var,[partition])


检查缓存地址表或子网表中是否存在任意组下包含该源 ip/端口/协议的条目。
若存在，则在变量参数中返回该组。
若不存在则返回 -1。缓存地址表与
子网表中端口值 0 匹配任意端口。此外，还可以
指定分区。若未指定分区，
则使用 "default" 分区。


参数：


- *var* (var)
- *partition* (string, optional)


此函数可在 REQUEST_ROUTE、FAILURE_ROUTE、
LOCAL_ROUTE、BRANCH_ROUTE 中使用。


```opensips title="get_source_group() usage"
...

if ( get_source_group( $var(group)) ) {
   # 对 $var(group) 做些什么
   xlog("group is $var(group)\n");
};
...
```


#### allow_routing()


如果按 [呼叫路由](#call-routing) 所述构造的所有对依据配置文件均具备相应
权限，则返回 true。此函数使用 `default_allow_file` 与
`default_deny_file` 中指定的默认配置文件。


此函数可在 REQUEST_ROUTE、FAILURE_ROUTE 中使用。


```opensips title="allow_routing usage"
...
if (allow_routing()) {
	t_relay();
};
...
```


#### allow_routing(basename)


如果按 [呼叫路由](#call-routing) 所述构造的所有对依据作为参数给出的
配置文件均具备相应权限，则返回 true。


各参数含义如下：


- *basename* (string) - Basename，由它追加
`allow_suffix` 与 `deny_suffix`
参数的内容构造出 allow 与 deny 文件名。
如果该参数不包含完整路径名，则函数
期望文件位于服务器主配置文件的同一目录下。


此函数可在 REQUEST_ROUTE、FAILURE_ROUTE 中使用。


```opensips title="allow_routing(basename) usage"
...
if (allow_routing("basename")) {
	t_relay();
};
...
```


#### allow_register(basename)


如果按 [注册权限](#registration-permissions) 所述构造的所有对依据作为参数
给出的配置文件均具备相应权限，则函数返回 true。


各参数含义如下：


- *basename* (string) - Basename，由它追加
`allow_suffix` 与 `deny_suffix`
参数的内容构造出 allow 与 deny 文件名。
如果该参数不包含完整路径名，则函数
期望文件位于服务器主配置文件的同一目录下。


此函数可在 REQUEST_ROUTE、FAILURE_ROUTE 中使用。


```opensips title="allow_register(basename) usage"
...
if ($rm=="REGISTER") {
	if (allow_register("register")) {
		save("location");
		exit;
	} else {
		sl_send_reply(403, "Forbidden");
	};
};
...
```


#### allow_uri(basename, uri)


如果按 [URI 权限](#uri-permissions) 所述构造的对依据该参数指定的配置
文件具备相应权限，则返回 true。


各参数含义如下：


- *basename* (string) - Basename，由它追加
`allow_suffix` 与 `deny_suffix`
参数的内容构造出 allow 与 deny 文件名。
如果该参数不包含完整路径名，则函数
期望文件位于服务器主配置文件的同一目录下。
- *uri* (string) - 待检查的 SIP URI。


此函数可在 REQUEST_ROUTE、FAILURE_ROUTE 中使用。


```opensips title="allow_uri(basename, uri) usage"
...
if (allow_uri("basename", $rt)) {  // Check Refer-To URI
	t_relay();
};
if (allow_uri("basename", $avp(uri)) {  // Check URI stored in $avp(uri)
	t_relay();
};
...
```


### 导出的 MI 函数 {#exported-mi-functions}


#### address_reload


使 permissions 模块把地址数据库表的内容重新读入缓存
内存。在缓存内存中，为提升性能，条目
按 mask 字段的值（32 或更小）存放在两张
不同的表中：address 表与
subnet 表。


参数：


- *partition* -
要重新加载的分区名。若未指定，
则重新加载所有分区。


#### address_dump


使 permissions 模块导出缓存内存中
地址表的内容。


参数：


- *partition* -
要导出的分区名。若未指定，
则导出所有分区。


#### subnet_dump


使 permissions 模块导出缓存内存子网表的
内容。


参数：


- *partition* -
要导出的分区名。若未指定，
则导出所有分区。


#### allow_uri


测试 (URI, Contact) 对是否按 allow/deny 文件被允许。
这些文件必须已由 OpenSIPS 加载。


参数：


- *basename* -
Basename，由它追加 allow_suffix 与 deny_suffix
参数的内容构造出 allow 与 deny 文件名。
- *URI* - 待测试的 URI
- *Contact* - 待测试的
Contact
<!-- CONTRIBUTORS -->

### 许可证 {#license}


所有文档文件（即 .md 扩展名）均按 Creative Common License 4.0 授权
