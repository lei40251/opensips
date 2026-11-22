---
title: "carrierroute 模块"
description: "提供路由、负载均衡与黑名单能力的模块。"
---


## 管理指南 {#admin-guide}


### 概述 {#overview}


本模块提供路由、负载均衡与黑名单能力。


本模块提供路由、负载均衡与黑名单能力。它在 OpenSIPS 启动时从数据库源或配置文件读取路由条目。它可以使用一棵路由树（对应一个运营商），或者在需要时为每个用户使用不同的路由树（每个运营商唯一），用于基于号码前缀的路由。它支持多个路由树域，例如用于回退路由，或为 VoIP 和 PSTN 目标使用不同的路由规则。


基于这棵树，模块决定哪些号码前缀被转发到哪个网关。它还可以按比例参数分配流量。此外，请求可以通过哈希函数分配到可预测的目标。哈希源是可配置的，有两种不同的哈希函数可用。


本模块可扩展到数百万用户以上，并能处理数十万条路由表条目。它应该能处理更多，但目前尚未充分测试。在负载均衡场景中，建议使用配置文件模式，以避免数据库驱动路由带来的额外复杂性。


路由表可以在配置文件模式下通过 MI 接口重新加载和编辑，配置文件会按变更更新。数据库接口未实现该功能，因为直接在数据库上修改更容易。不过重新加载和转储功能在这里同样可用。


在配置文件模式下，模块的部分功能并非完全可用，因为无法在配置文件中指定可存储于数据库表的所有信息。关于这些限制的更多信息在后续章节给出。对于基于用户的路由或 LCR，应使用数据库模式。


基本上，如果现有 lcr 和 dispatcher 模块无法妥善满足你在性能、灵活性和/或集成方面的某些要求，本模块可以作为它们的替代。但对于小型部署，使用 lcr 和 dispatcher 模块可能更合理。


如果要在 failure route 中使用本模块，那么在改写请求 URI 之后需要调用 "append_branch()"，以便将消息中继到新目标。它还支持通过 carrierfailureroute 表使用数据库派生的失败路由决策。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


在使用本模块之前，必须先加载以下模块：


- *数据库模块*，当使用数据库作为配置数据源时。仅支持基于 SQL 的数据库，因为本模块需要执行原生查询的能力。目前无法使用 dbtext 或 db_berkeley 模块。
- *tm 模块*，当你想在 "cr_next_domain" 函数中使用 $T_reply_code 伪变量时。


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，必须安装以下库或应用程序：


- *libconfuse*，一个配置文件解析库。
( http://www.nongnu.org/confuse/ )


### 导出的参数 {#exported-parameters}


#### db_url (string)


包含路由数据的数据库的 Url。


*默认值为 "mysql://opensipsro:opensipsro@localhost/opensips"。*


```opensips title="Set db_url parameter"
...
modparam("carrierroute", "db_url", "dbdriver://username:password@dbhost/dbname")
...
		
```


#### db_table (string)


存储路由数据的表名。


*默认值为 "carrierroute"。*


```opensips title="Set db_table parameter"
...
modparam("carrierroute", "db_table", "carrierroute")
...
		    
```


#### id_column (string)


包含 id 标识符的列名。


*默认值为 "id"。*


```opensips title="Set id_column parameter"
...
modparam("carrierroute", "id_column", "id")
...
		    
```


#### carrier_column (string)


包含运营商 id 的列名。


*默认值为 "carrier"。*


```opensips title="Set carrier_column parameter"
...
modparam("carrierroute", "carrier_column", "carrier")
...
		    
```


#### scan_prefix_column (string)


包含扫描前缀的列名。扫描前缀定义电话号码中参与匹配的部分，例如当我们有扫描前缀 49721 和 49，被叫号码是 49721913740 时，它匹配 49721，因为采用最长匹配。如果没有前缀匹配，该号码将不被路由。为防止这种情况，可以添加一个值为 "" 的空前缀。


*默认值为 "scan_prefix"。*


```opensips title="Set scan_prefix_column parameter"
...
modparam("carrierroute", "scan_prefix_column", "scan_prefix")
...
		    
```


#### domain_column (string)


包含规则域的列名。你可以定义多个路由域以使用不同的路由规则。也许你用域 0 做正常路由，用域 1 应对域 0 失败的情况。


*默认值为 "domain"。*


```opensips title="Set domain_column parameter"
...
modparam("carrierroute", "domain_column", "domain")
...
		    
```


#### flags_column (string)


包含标志位的列名。


*默认值为 "flags"。*


```opensips title="Set flags_column parameter"
...
modparam("carrierroute", "flags_column", "flags")
...
		    
```


#### mask_column (string)


包含标志位掩码的列名。


*默认值为 "mask"。*


```opensips title="Set mask_column parameter"
...
modparam("carrierroute", "mask_column", "mask")
...
		    
```


#### prob_column (string)


包含概率的列名。概率值用于在多个网关之间分配流量。假设 70% 的流量应路由到网关 A，其余 30% 应路由到网关 B，我们为网关 A 定义一条 prob 值为 0.7 的规则，为网关 B 定义一条 prob 值为 0.3 的规则。


如果给定前缀、树和域的所有概率加起来不等于 100%，前缀值将按给定的 prob 值进行调整。例如，若三台主机的 prob 值分别为 0.5、0.5 和 0.4，则最终概率为 35.714、35.714 和 28.571%。但为了清晰起见，最好一开始就选择有意义的值。


*默认值为 "prob"。*


```opensips title="Set prob_column parameter"
...
modparam("carrierroute", "prob_column", "prob")
...
		    
```


#### rewrite_host_column (string)


包含改写主机值的列名。空字段表示黑名单条目，任何其他值都会作为域名部分放入 SIP 消息的请求 URI。


*默认值为 "rewrite_host"。*


```opensips title="Set rewrite_host_column parameter"
...
modparam("carrierroute", "rewrite_host_column", "rewrite_host")
...
		    
```


#### strip_column (string)


包含在添加 rewrite_prefix 之前要从 URI 的 userpart 中剥去的数字位数的列名。


*默认值为 "strip"。*


```opensips title="Set strip_column parameter"
...
modparam("carrierroute", "strip_column", "strip")
...
		    
```


#### comment_column (string)


包含可选注释的列名（在大型路由表中很有用）
该注释也会由 fifo 命令 "cr_dump_routes" 显示。


*默认值为 "description"。*


```opensips title="Set comment_column parameter"
...
modparam("carrierroute", "comment_column", "description")
...
		    
```


#### carrier_table (string)


包含现有运营商的表的名称，由 id 及对应名称组成。


*默认值为 "route_tree"。*


```opensips title="Set carrier_table parameter"
...
modparam("carrierroute", "carrier_table", "route_tree")
...
		    
```


#### rewrite_prefix_column (string)


包含改写前缀的列名。这里你可以为 SIP URI 的 localpart 定义改写前缀。


*默认值为 "rewrite_prefix"。*


```opensips title="Set rewrite_prefix_column parameter"
...
modparam("carrierroute", "rewrite_prefix_column", "rewrite_prefix")
...
		    
```


#### rewrite_suffix_column (string)


包含改写后缀的列名。这里你可以为 SIP URI 的 localpart 定义改写后缀。


*默认值为 "rewrite_suffix"。*


```opensips title="Set rewrite_suffix_column parameter"
...
modparam("carrierroute", "rewrite_suffix_column", "rewrite_suffix")
...
		    
```


#### carrier_id_col (string)


carrier 表中包含运营商 id 的列名。


*默认值为 "id"。*


```opensips title="Set id_col parameter"
...
modparam("carrierroute", "carrier_id_col", "id")
...
		    
```


#### carrier_name_col (string)


carrier 表中包含运营商名称的列名。


*默认值为 "carrier"。*


```opensips title="Set carrier_name_col parameter"
...
modparam("carrierroute", "carrier_name_col", "carrier")
...
		    
```


#### subscriber_table (string)


包含订阅者的表的名称


*默认值为 "subscriber"。*


```opensips title="Set subscriber_table parameter"
...
modparam("carrierroute", "subscriber_table", "subscriber")
...
		    
```


#### subscriber_user_col (string)


subscriber 表中包含用户名的列名。


*默认值为 "username"。*


```opensips title="Set subscriber_user_col parameter"
...
modparam("carrierroute", "subscriber_user_col", "username")
...
		    
```


#### subscriber_domain_col (string)


subscriber 表中包含订阅者域的列名。


*默认值为 "domain"。*


```opensips title="Set subscriber_domain_col parameter"
...
modparam("carrierroute", "subscriber_domain_col", "domain")
...
		    
```


#### subscriber_carrier_col (string)


subscriber 表中包含订阅者运营商 id 的列名。


*默认值为 "cr_preferred_carrier"。*


```opensips title="Set subscriber_carrier_col parameter"
...
modparam("carrierroute", "subscriber_carrier_col", "cr_preferred_carrier")
...
		    
```


#### config_source (string)


指定模块从文件还是从数据库加载配置数据。可能的值为 file 或 db。


*默认值为 "file"。*


```opensips title="Set config_source parameter"
...
modparam("carrierroute", "config_source", "file")
...
		    
```


#### config_file (string)


指定配置文件的路径。


*默认值为 "/etc/opensips/carrierroute.conf"。*


```opensips title="Set config_file parameter"
...
modparam("carrierroute", "config_file", "/etc/opensips/carrierroute.conf")
...
		    
```


#### default_tree (string)


默认使用的运营商树名称（如果当前订阅者没有首选树）


*默认值为 "default"。*


```opensips title="Set default_tree parameter"
...
modparam("carrierroute", "default_tree", "default")
...
		    
```


#### use_domain (int)


当按用户进行树查找时，此参数指定是否使用域部分进行用户匹配。


*默认值为 "0"。*


```opensips title="Set use_domain parameter"
...
modparam("carrierroute", "use_domain", 0)
...
		    
```


#### fallback_default (int)


此参数定义使用基于用户的树查找时的行为。如果用户设置的树不存在，且 fallback_default 设为 1，则使用默认树。否则 cr_user_rewrite_uri 返回错误。


*默认值为 "1"。*


```opensips title="Set fallback_default parameter"
...
modparam("carrierroute", "fallback_default", 1)
...
		    
```


#### db_failure_table (string)


存储失败路由数据的表名。


*默认值为 "carrierfailureroute"。*


```opensips title="Set db_failure_table parameter"
...
modparam("carrierroute", "db_failure_table", "carrierfailureroute")
...
		    
```


#### failure_id_column (string)


包含 id 标识符的列名。


*默认值为 "id"。*


```opensips title="Set failure_id_column parameter"
...
modparam("carrierroute", "failure_id_column", "id")
...
		    
```


#### failure_carrier_column (string)


包含运营商 id 的列名。


*默认值为 "carrier"。*


```opensips title="Set failure_carrier_column parameter"
...
modparam("carrierroute", "failure_carrier_column", "carrier")
...
		    
```


#### failure_scan_prefix_column (string)


包含扫描前缀的列名。扫描前缀定义电话号码中参与匹配的部分，例如我们有扫描前缀 49721 和 49，被叫号码是 49721913740 时，它匹配 49721，因为采用最长匹配。如果没有前缀匹配，该号码将不被失败路由。为防止这种情况，可以添加一个值为 "" 的空前缀。


*默认值为 "scan_prefix"。*


```opensips title="Set failure_scan_prefix_column parameter"
...
modparam("carrierroute", "failure_scan_prefix_column", "scan_prefix")
...
		    
```


#### failure_domain_column (string)


包含规则域的列名。你可以定义多个路由域以使用不同的路由规则。也许你用域 0 做正常路由，用域 1 应对域 0 失败的情况。


*默认值为 "domain"。*


```opensips title="Set failure_domain_column parameter"
...
modparam("carrierroute", "failure_domain_column", "domain")
...
		    
```


#### failure_host_name_column (string)


包含最后一个路由目标的主机名的列名。


*默认值为 "host_name"。*


```opensips title="Set failure_host_name_column parameter"
...
modparam("carrierroute", "failure_host_name_column", "host_name")
...
		    
```


#### failure_reply_code_column (string)


包含应答码的列名。


*默认值为 "reply_code"。*


```opensips title="Set failure_reply_code_column parameter"
...
modparam("carrierroute", "failure_reply_code_column", "reply_code")
...
		    
```


#### failure_flags_column (string)


包含标志位的列名。


*默认值为 "flags"。*


```opensips title="Set failure_flags_column parameter"
...
modparam("carrierroute", "failure_flags_column", "flags")
...
		    
```


#### failure_mask_column (string)


包含标志位掩码的列名。


*默认值为 "mask"。*


```opensips title="Set failure_mask_column parameter"
...
modparam("carrierroute", "failure_mask_column", "mask")
...
		    
```


#### failure_next_domain_column (string)


包含下一个路由域的列名。


*默认值为 "next_domain"。*


```opensips title="Set failure_next_domain_column parameter"
...
modparam("carrierroute", "failure_next_domain_column", "next_domain")
...
		    
```


#### failure_comment_column (string)


包含可选注释的列名。


*默认值为 "description"。*


```opensips title="Set failure_comment_column parameter"
...
modparam("carrierroute", "failure_comment_column", "description")
...
		    
```


### 导出的函数 {#exported-functions}


carrierroute 以前的版本还有一些其他函数。所有旧的语义都可以通过以下少数几个新函数实现：


```opensips
cr_rewrite_uri(domain, hash_source)
-> cr_route("default", domain, $rU, $rU, hash_source)

cr_prime_balance_uri(domain, hash_source)
-> cr_prime_route("default", domain, $rU, $rU, hash_source)

cr_rewrite_by_to(domain, hash_source)
-> cr_route("default", domain, $tU, $rU, hash_source)

cr_prime_balance_by_to(domain, hash_source)
-> cr_prime_route("default", domain, $tU, $rU, hash_source)

cr_rewrite_by_from(domain, hash_source)
-> cr_route("default", domain, $fU, $rU, hash_source)

cr_prime_balance_by_from(domain, hash_source)
-> cr_prime_route("default", domain, $fU, $rU, hash_source)

cr_user_rewrite_uri(uri, domain)
-> cr_user_carrier(user, domain, $avp(tree_avp))
-> cr_route($avp(tree_avp), domain, $rU, $rU, "call_id")

cr_tree_rewrite_uri(tree, domain)
-> cr_route(tree, domain, $rU, $rU, "call_id")
  
```


#### cr_user_carrier(user, domain, dst_avp)


此函数加载运营商并将其存入一个 AVP。
它不能在配置文件模式下使用，因为它需要将给定用户映射到某个运营商。该映射来自属于用户参数的数据库条目。此映射必须存在于 "subscriber_table" 变量所指定的表中。
该数据不会缓存在内存中，也就是说每次执行此函数都会做一次数据库查询。


参数：


- *user (string)* - 用于运营商树查找的用户名
- *domain (string)* - 要使用的路由域名称
- *dst_avp (var)* - 用于存储运营商 id 的 AVP 名称


#### cr_route(carrier, domain, prefix_matching, rewrite_user, hash_source, [dst_avp])


此函数在给定运营商的树中、给定域下，对 prefix_matching 中给定的用户搜索最长匹配。请求 URI 使用 rewrite_user 以及给定的哈希源和算法进行改写。如果没有找到数据，或者最长匹配上的 rewrite host 为空，则返回 -1。否则改写后的主机存入给定的 AVP（如果省略，则不把主机存入 AVP）。
此函数仅适用于 rewrite_user 和 prefix_matching 都包含合法纯数字字符串的情况。它使用标准 crc32 算法计算哈希值。


参数：


- *carrier (string)* - 要使用的路由树
- *domain (string)* - 要使用的路由域名称
- *prefix_matching (string)* - 用于在路由树中进行前缀匹配的用户名
- *rewrite_user (string)* - 用于应用改写规则的用户名。通常这是请求 URI 的用户部分
- *hash_source (string)* - 目标集合的哈希值必须是起始于 1 的连续范围，受配置参数 max_targets 限制。hash_source 的可能值为：call_id、from_uri、from_user、to_uri 和 to_user。
- *dst_avp (var, optional)* - 可选的 AVP，用于存储改写后的主机


#### cr_prime_route(carrier, domain, prefix_matching, rewrite_user, hash_source, [dst_avp])


此函数在给定运营商的树中、给定域下，对 prefix_matching 中给定的用户搜索最长匹配。请求 URI 使用 rewrite_user 以及给定的哈希源和算法进行改写。如果没有找到数据，或者最长匹配上的 rewrite host 为空，则返回 -1。否则改写后的主机存入给定的 AVP（如果省略，则不把主机存入 AVP）。
此函数仅适用于 rewrite_user 和 prefix_matching 都包含合法纯数字字符串的情况。它使用 prime 哈希算法计算哈希值。


各参数的含义如下：


- *carrier (string)* - 要使用的路由树
- *domain (string)* - 要使用的路由域名称
- *prefix_matching (string)* - 用于在路由树中进行前缀匹配的用户名
- *rewrite_user (string)* - 用于应用改写规则的用户名。通常这是请求 URI 的用户部分
- *hash_source (string)* - 目标集合的哈希值必须是起始于 1 的连续范围，受配置参数 max_targets 限制。hash_source 的可能值为：call_id、from_uri、from_user、to_uri 和 to_user。
- *dst_avp (var, optional)* - 可选的 AVP，用于存储改写后的主机


#### cr_next_domain(carrier, domain, prefix_matching, host, reply_code, dst_avp)


此函数在给定运营商的失败树中、给定域下，对 prefix_matching 中给定的用户搜索最长匹配。它尝试找到与给定 host、reply_code 及消息标志位匹配的下一个域。匹配按以下顺序进行：host、reply_code，然后是 flags。reply_code 中的通配符越多、flags 中使用的位数越多，优先级越低。如果没有找到数据，或者最长匹配上的 next_domain 为空，则返回 -1。否则将下一个域存入给定的 AVP。
此函数仅适用于 prefix_matching 包含合法纯数字字符串的情况。


各参数的含义如下：


- *carrier (string)* - 要使用的路由树，任何伪变量都可以作为输入。
- *domain (string)* - 要使用的路由域名称
- *prefix_matching (string)* - 用于在路由树中进行前缀匹配的用户名
- *host (string)* - 用于失败路由规则匹配的主机名。通常这是 cr_route 存储在 avp 中的最后尝试的路由目标
- *reply_code (string)* - 用于失败路由规则匹配的应答码
- *dst_avp (var)* - 用于存储下一个路由域的 AVP。


### 导出的 MI 函数 {#exported-mi-functions}


所有命令都支持 "-?" 参数以打印简短帮助信息。选项必须作为一个字符串加引号后传给 MI 接口。除 host 和 new host 外，每个选项都可以用 * 通配（但只能是 *，不能是 "-d prox*" 之类）。


#### cr_reload_routes


此命令从数据源重新加载路由数据。


重要：当新增了域之后，必须重启服务器，因为目前配置脚本中使用的 id 映射无法在运行时更新。因此重新加载可能导致错误的路由行为，因为脚本中使用的 id 可能与服务器内部使用的不同。修改已存在的域没有问题。


#### cr_dump_routes


此命令在命令行上打印路由规则。


#### cr_replace_host


此命令可以替换路由规则的 rewrite_host，仅在文件模式下可用。支持以下选项：


- *-d* - 包含该主机的域
- *-p* - 包含该主机的前缀
- *-h* - 要替换的主机
- *-t* - 新主机


使用 "null" 前缀来指定空前缀。


```bash title="cr_replace_host usage"
...
opensips-cli -x mi cr_replace_host "-d proxy -p 49 -h proxy1 -t proxy2"
...
		
```


#### cr_deactivate_host


此命令停用指定的主机，即将其状态设为 0。
仅在文件模式下可用。支持以下选项：


- *-d* - 包含该主机的域
- *-p* - 包含该主机的前缀
- *-h* - 要停用的主机
- *-t* - 用作备份的新主机


当指定 -t（new_host）时，被停用主机的流量部分会路由到 -t 指定的主机。这在 dump_routes 的输出中会体现。当主机重新激活时，备份路由会被停用。


使用 "null" 前缀来指定空前缀。


```bash title="cr_deactivate_host usage"
...
opensips-cli -x mi cr_deactivate_host "-d proxy -p 49 -h proxy1"
...
		
```


#### cr_activate_host


此命令激活指定的主机，即将其状态设为 1。
仅在文件模式下可用。支持以下选项：


- *-d* - 包含该主机的域
- *-p* - 包含该主机的前缀
- *-h* - 要激活的主机


使用 "null" 前缀来指定空前缀。


```bash title="cr_activate_host usage"
...
opensips-cli -x mi cr_activate_host "-d proxy -p 49 -h proxy1"
...
		
```


#### cr_add_host


此命令添加一条路由规则，仅在文件模式下可用。支持以下选项：


- *-d* - 包含该主机的域
- *-p* - 包含该主机的前缀
- *-h* - 要添加的主机
- *-w* - 规则的权重
- *-P* - 可选的改写前缀
- *-S* - 可选的改写后缀
- *-i* - 可选的哈希索引
- *-s* - 可选的 strip 值


使用 "null" 前缀来指定空前缀。


```bash title="cr_add_host usage"
...
opensips-cli -x mi cr_add_host "-d proxy -p 49 -h proxy1 -w 0.25"
...
		
```


#### cr_delete_host


此命令删除指定的主机或规则，即将其从路由树中移除。仅在文件模式下可用。
支持以下选项：


- *-d* - 包含该主机的域
- *-p* - 包含该主机的前缀
- *-h* - 要添加的主机
- *-w* - 规则的权重
- *-P* - 可选的改写前缀
- *-S* - 可选的改写后缀
- *-i* - 可选的哈希索引
- *-s* - 可选的 strip 值


使用 "null" 前缀来指定空前缀。


```bash title="cr_delete_host usage"
...
opensips-cli -x mi cr_delete_host "-d proxy -p 49 -h proxy1 -w 0.25"
...
		
```


### 示例 {#examples}


```opensips title="Configuration example - Routing to default tree"
...
route {
	# 根据对 callid 的哈希来路由呼叫
	# 选择默认运营商的 0 号路由域
	
	if(!cr_route("default", "0", "$rU", "$rU", "call_id", "crc32")){
		sl_send_reply(403, "Not allowed");
	} else {
		# 失败情况下重新路由该请求
		t_on_failure("1");
		# 将请求中继到网关
		t_relay();
	}
}

failure_route[1] {
	# 失败情况下将其发送到备用路由：
	if (t_check_status("408|5[0-9][0-9]")) {
		#选择默认运营商的 1 号路由域
	if(!cr_route("default", "1", "$rU", "$rU", "call_id", "crc32")){
			t_reply(403, "Not allowed");
		} else {
			t_on_failure("2");
			t_relay();
		}
	}
}

failure_route[2] {
	# 后续处理
}

		
```


```opensips title="Configuration example - Routing to user tree"
...
route[1] {
	cr_user_carrier("$fU", "$fd", "$avp(carrier)");

	# 仅作示例的域
	$avp(domain)="start";
	if (!cr_route("$avp(carrier)", "$avp(domain)", "$rU", "$rU",
			"call_id", "$avp(host)")) {
		xlog("L_ERR", "cr_route failed\n");
		exit;
	}
	t_on_failure("1");
		if (!t_relay()) {
			sl_reply_error();
	};
}

failure_route[1] {
	revert_uri();
	if (!cr_next_domain("$avp(carrier)", "$avp(domain)", "$rU",
			"$avp(host)", "$T_reply_code", "$avp(domain)")) {
		xlog("L_ERR", "cr_next_domain failed\n");
		exit;
	}
	if (!cr_route("$avp(carrier)", "$avp(domain)", "$rU", "$rU",
			"call_id", "$avp(host)")) {
		xlog("L_ERR", "cr_route failed\n");
		exit;
	}
	t_on_failure("1");
	append_branch();
	if (!t_relay()) {
		xlog("L_ERR", "t_relay failed\n");
		exit;
	};
}
...
		
```


下面的配置文件在默认运营商内指定了两个域，每个域都包含一个前缀，该前缀下有两台主机。如果使用配置文件作为数据源，则无法指定其他运营商。


所有流量将在两台主机之间平均分配，两台主机都处于活动状态。哈希算法将作用于 [1,2] 集合，哈希到 1 的消息发往第一台主机，其他消息发往第二台。不要使用为零的哈希索引值。如果完全省略哈希，模块会为其生成一个从 1 开始的自动值。


在配置文件中使用 "NULL" 前缀来指定空前缀。请注意，前缀是对请求 URI（或 To URI）进行匹配的，如果它们不包含合法的纯数字 URI，则无法匹配。因此，对于负载均衡的用途（例如你的注册服务器），应使用空前缀。


```c title="Configuration example - module configuration"
...
domain proxy {
   prefix 49 {
     max_targets = 2
      target proxy1.localdomain {
         prob = 0.500000
         hash_index = 1
         status = 1
         comment = "test target 1"
      }
      target proxy2.localdomain {
         prob = 0.500000
         hash_index = 2
         status = 1
         comment = "test target 2"
      }
   }
}

domain register {
   prefix NULL {
     max_targets = 2
      target register1.localdomain {
         prob = 0.500000
         hash_index = 1
         status = 1
         comment = "test target 1"
      }
      target register2.localdomain {
         prob = 0.500000
         hash_index = 2
         status = 1
         comment = "test target 2"
      }
   }
}
...
		
```


### 安装与运行 {#installation-and-running}


#### 数据库设置 {#database-setup}


在运行带 carrierroute 的 OpenSIPS 之前，必须先设置模块存储路由数据所用的数据库表。为此，如果该表不是由安装脚本创建的，或者你选择自行安装所有内容，可以使用 opensips/scripts 文件夹中数据库目录下的 carrierroute-create.sql SQL 脚本作为模板。
数据库名和表名可以通过模块参数设置，因此可以更改，但列名必须与 SQL 脚本中一致。
你也可以在项目网页 https://opensips.org/docs/db/db-schema-devel.html 上找到完整的数据库文档。
flags 和 mask 列的功能与 carrierfailureroute 表中相同。flags 和 mask 列中的值为零意味着任何消息标志位都会匹配该规则。


对于最小配置，要么使用上面给出的配置文件，要么向模块的表中插入一些数据。


```c title="Example database content - carrierroute table"
...
+----+---------+--------+-------------+-------+------+---------------+
| id | carrier | domain | scan_prefix | flags | prob | rewrite_host  |
+----+---------+--------+-------------+-------+------+---------------+
| 1  |       1 |      0 | 49          |     0 |  0.5 | de-1.carrier1 |
| 2  |       1 |      0 | 49          |     0 |  0.5 | de-2.carrier1 |
| 3  |       1 |      0 | 49          |    16 |    1 | de-3.carrier1 |
| 4  |       1 |      0 |             |     0 |    1 | gw.carrier1-1 |
| 5  |       1 |      1 | 49          |     0 |    1 | gw.carrier1-1 |
| 6  |       1 |      2 |             |     0 |    1 | gw.carrier1-2 |
| 7  |       1 |      3 |             |     0 |    1 | gw.carrier1-3 |
| 8  |       2 |      0 | 49          |     0 |  0.5 | de-1.carrier2 |
| 9  |       2 |      0 | 49          |     0 |  0.5 | de-2.carrier2 |
| 10 |       2 |      0 |             |     0 |    1 | gw.carrier2   |
| 11 |       2 |      1 | 49          |     0 |    1 | gw.carrier2   |
| 12 |       3 |  start | 49          |     0 |    1 | de-gw.default |
| 13 |       3 |  start |             |     0 |    1 | gw.default    |
+----+---------+--------+-------------+-------+------+---------------+
...
		
```


该表包含三条到两个网关的 "49" 前缀路由，以及通过运营商 2 和运营商 1 到其他前缀的默认路由。默认运营商对应的网关将用于不支持按用户查找运营商的函数。运营商 1 和运营商 2 针对 "49" 前缀的路由规则还包含一条域为 1 的附加规则，例如可在域 0 中的网关不可达时用作回退。还为运营商 1 提供了另外两条回退规则（域 2 和域 3），以支持下一节中给出的 carrierfailureroute 表示例的功能。域也可以使用字符串，例如在运营商 3 中。


该表还为 "49" 前缀提供了一条 "carrier1" 路由规则，只有在设置了某些消息标志位时才会被选中。如果未设置这些标志位，则使用另外两条规则。为简略起见，省略了 "strip"、"mask" 和 "comment" 列。


```c title="Example database content - simple carrierfailureroute table"
...
+----+---------+--------+---------------+------------+-------------+
| id | carrier | domain | host_name     | reply_code | next_domain |
+----+---------+--------+---------------+------------+-------------+
|  1 |       1 | 0      | gw.carrier1-2 | ...        | 3           |
|  2 |       1 | 0      | gw.carrier1-3 | ...        | 2           |
+----+---------+--------+---------------+------------+-------------+
...
```


该表包含针对 "gw.carrier1-1" 和 "-2" 网关的两条失败路由。对于任何（失败）应答码，都会选择相应的下一个域。此后不再有可用的失败路由，cr_next_domain 函数将返回错误。为简略起见，此处未显示所有表列。


对于添加到 carrierfailureroute 表中的每个失败路由域和运营商，carrierroute 表中必须至少有一条对应条目，否则模块将不会加载路由数据。


```c title="Example database content - more complex carrierfailureroute table"
...
+----+---------+-----------+------------+--------+-----+-------------+
| id | domain  | host_name | reply_code | flags | mask | next_domain |
+----+---------+-----------+------------+-------+------+-------------+
|  1 |      99 |           | 408        |    16 |   16 |             |
|  2 |      99 | gw1       | 404        |     0 |    0 | 100         |
|  3 |      99 | gw2       | 50.        |     0 |    0 | 100         |
|  4 |      99 |           | 404        |  2048 | 2112 | asterisk-1  |
+----+---------+-----------+------------+-------+------+-------------+
...
```


该表包含四条失败路由，展示了更高级特性的用法。第一条路由匹配 408，以及某些标志位，例如指示已发生振铃。如果设置了该标志位，则不再继续转发，因为 next_domain 为空。第二条和第三条路由匹配某些网关错误，如果发生这些错误，则选择下一个域。最后一条路由根据某些标志位进行转发，例如客户来自某个运营商且已停用呼叫前转。为了使用上述指定的路由，必须提供与之匹配的 carrierroute 表，其中包含这些路由规则对应的域条目。为简略起见，此处未显示所有表列。


```c title="Example database content - route_tree table"
...
+----+----------+
| id | carrier  |
+----+----------+
|  1 | carrier1 |
|  2 | carrier2 |
|  3 | default  |
+----+----------+
...
		
```


该表包含运营商 id 到实际名称的映射。


为了使路由可用，必须向 subscriber 表（或你指定为模块参数的表和列）添加 "cr_preferred_carrier" 列，以便为用户选择实际运营商。


建议的修改：


```sql title="Necessary extensions for the user table"
...
ALTER TABLE subscriber ADD cr_preferred_carrier int(10) default NULL; 
...
		
```
<!-- CONTRIBUTORS -->

### 许可证 {#license}

所有文档文件（即 .md 扩展名）均按 Creative Common License 4.0 许可。
