---
title: "B2B_SCA 模块"
description: "本模块为 OpenSIPS 提供核心的 SCA（Shared Call Appearance，共享呼叫外观）功能，设计上与 presence_callinfo 模块配合工作。"
sidebar: false
---


## 管理指南 {#admin-guide}


### 概述 {#overview}


本模块为 OpenSIPS 提供核心的 SCA（Shared Call Appearance，共享呼叫外观）功能。它设计上与 presence_callinfo 模块协同工作。


本模块处理呼叫控制所需的基本 SIP 信令，同时向呈现服务器发布 callinfo 事件。它构建在 b2b_logic 模块之上，并使用 'top hiding' 场景来控制 SIP 信令。


下面给出一个典型用法示例，其中 Alice 向 Bob 发起呼叫。Alice 与 b2b_sca 服务器之间的呼叫支路，是 b2b_sca 服务器与 Bob 之间 "shared" 呼叫的一个 "appearance" 呼叫。


```c
   caller         caller      b2b_sca     callee   presence server
alice1@example alice2@example  server   bob@example watcher@example
     |              |             |           |           |
     |--INV bob------------------>|           |           |
     |              |             |--INV bob->|           |
     |              |             |--PUBLISH(alerting)--->|
     |              |             |<-----200 OK-----------|
     |              |             |           |           |
     |              |             |<-180 ring-|           |
     |<-180 ring------------------|           |           |
     |              |             |           |           |
     |              |             |           |           |
     |              |             |<-200 OK---|           |
     |<-200 OK--------------------|--ACK----->|           |
     |--ACK---------------------->|--PUBLISH(active)----->|
     |              |             |<-----200 OK-----------|
     |              |             |           |           |
     |--INV bob (hold)----------->|           |           |
     |              |             |--INV bob->|           |
     |              |             |--PUBLISH(held)------->|
     |              |             |<-----200 OK-----------|
     |              |             |<-200 OK---|           |
     |<--200 OK-------------------|           |           |
     |              |             |           |           |
     |              |--INV------->|           |           |
     |              |             |--INV bob->|           |
     |<-BYE-----------------------|--PUBLISH(active)----->|
     |--200 OK------------------->|<-----200 OK-----------|
     |              |             |<-200 OK---|           |
     |              |<-200 OK-----|           |

	
```


- Alice 从她的桌面 IP 电话（alice1）呼叫 Bob。
- Bob 应答该呼叫。
- Alice 决定在会议室继续通话，于是将 Bob 置于保持状态。
- Alice 到达会议室，在会议室 IP 电话（alice2）上取回该呼叫。


### 待办事项 {#to-do}


未来将添加的功能：


- 支持处理不限数量的外观（appearance）。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


必须先于本模块加载以下模块：


- *tm* 模块。
*pua* 模块。
*b2b_logic* 模块。


### 导出的参数 {#exported-parameters}


#### hash_size(integer)


内部用于保存共享呼叫的哈希表大小。更大的表意味着更快的访问速度，代价是更多内存。哈希大小是 2 的幂。


*默认值为 "10"。*


```opensips title="设置 hash_size 参数"
...
modparam("b2b_sca", "hash_size", "5")
...
```


#### presence_server(string)


呈现服务器的地址，PUBLISH 消息应发送到该地址（非强制）。若未设置，PUBLISH 请求将基于 watcher 的 URI 进行路由。


*默认值为 "NULL"。*


```opensips title="设置 presence_server 参数"
...
modparam("b2b_sca", "presence_server", "sip:opensips.org")
...
```


#### watchers_avp_spec(string)


将保存一个或多个 watcher URI 的 AVP。若未设置，则不会发出任何 PUBLISH 请求。watchers_avp_spec 必须在调用 sca_init_request() 之前设置；


*默认值为 "NULL"。*


```opensips title="设置 watchers_avp_spec 参数"
...
modparam("b2b_sca", "watchers_avp_spec", "$avp(watchers_avp_spec)")
...
route {
	...
	$avp(watchers_avp_spec) = "sip:first_watcher@opensip.org";
	$avp(watchers_avp_spec) = "sip:second_watcher@opensip.org";
	...
}
```


#### shared_line_spec_param(string)


必填参数。用于标识共享线路/呼叫的不透明字符串。shared_line_spec_param 必须在调用 sca_init_request() 之前设置；


*默认值为 "NULL"。*


```opensips title="设置 shared_line_spec_param 参数"
...
modparam("b2b_sca", "shared_line_spec_param", "$var(shared_line)")
...
```


#### appearance_name_addr_spec_param(string)


必填参数。它必须是合法的 SIP URI。它将填充 *Call-Info* SIP 头域内的 *appearance-uri* SIP 参数。appearance_name_addr_spec_param 必须在调用 sca_init_request() 之前设置；


*默认值为 "NULL"。*


```opensips title="设置 appearance_name_addr_spec_param 参数"
...
modparam("b2b_sca", "appearance_name_addr_spec_param", "")
...
```


#### db_url(string)


这是要使用的数据库的 URL。


*默认值为 "NULL"。*


```opensips title="设置 db_url 参数"
...
modparam("b2b_sca", "db_url", "[dbdriver]://[[username]:[password]]@[dbhost]/[dbname]")
...
```


#### db_mode(integer)


b2b_sca 模块可以利用数据库来持久存储呼叫外观。使用数据库可确保活动的呼叫外观在机器重启或软件崩溃后依然存在。b2b_sca 模块可使用以下数据库访问模式：


- NO DB STORAGE - 将该参数设为 0
- WRITE THROUGH（同步写入数据库）- 将该参数设为 1


*默认值为 0（NO DB STORAGE）。*


```opensips title="设置 db_mode 参数"
...
modparam("b2b_sca", "db_mode", 1)
...
```


#### table_name(string)


标识已定义数据库中的表名。


*默认值为 "b2b_sca"。*


```opensips title="设置 table_name 参数"
...
modparam("b2b_sca", "table_name", "sla")
...
```


#### shared_line_column(string)


数据库中存储共享呼叫/线路 id 的列名。参见 "shared_line_spec_param" 参数。


*默认值为 "shared_line"。*


```opensips title="设置 shared_line_column 参数"
...
modparam("b2b_sca", "shared_line_column", "")
...
```


#### watchers_column(string)


数据库中存储 watcher 列表的列名。参见 "watchers_avp_spec" 参数。


*默认值为 "watchers"。*


```opensips title="设置 watchers_column 参数"
...
modparam("b2b_sca", "watchers_column", "")
...
```


#### app[index]_shared_entity_column(string)


数据库中存储某个特定外观的共享实体的列名。更多信息见 "sca_init_request"。


*默认值为 "app[index]_shared_entity"。* Index 是 1 到 10 之间的整数。


```opensips title="设置 app[index]_shared_entity_column 参数"
...
modparam("b2b_sca", "app1_shared_entity_column", "first_shared_entity")
modparam("b2b_sca", "app2_shared_entity_column", "second_shared_entity")
...
```


#### app[index]_call_state_column(string)


数据库中存储某个特定外观的呼叫状态的列名。存储以下状态：


- 1 - alerting，
- 2 - active，
- 3 - held，
- 4 - held-private。


*默认值为 "app[index]_call_state"。* Index 是 1 到 10 之间的整数。


```opensips title="设置 app[index]_call_state_column 参数"
...
modparam("b2b_sca", "app1_call_state_column", "first_call_state")
modparam("b2b_sca", "app2_call_state_column", "second_call_state")
...
```


#### app[index]_call_info_uri_column(string)


数据库中存储某个特定外观的 call info URI 的列名。


*默认值为 "app[index]_call_info_uri"。* Index 是 1 到 10 之间的整数。


```opensips title="设置 app[index]_call_info_uri_column 参数"
...
modparam("b2b_sca", "app1_call_info_uri_column", "first_call_info_uri")
modparam("b2b_sca", "app2_call_info_uri_column", "second_call_info_uri")
...
```


#### app[index]_call_info_appearance_uri_column(string)


数据库中存储某个特定外观的 call info appearance URI 的列名。对于每个外观，该值取自 "appearance_name_addr_spec_param" 参数。


*默认值为 "app[index]_call_info_appearance_uri"。* Index 是 1 到 10 之间的整数。


```opensips title="设置 app[index]_call_info_appearance_uri_column 参数"
...
modparam("b2b_sca", "app1_call_info_appearance_uri_column", "first_call_info_appearance_uri")
modparam("b2b_sca", "app2_call_info_appearance_uri_column", "second_call_info_appearance_uri")
...
```


#### appindex_b2bl_key_column(string)


数据库中存储某个特定外观的 b2b_logic 键的列名。


*默认值为 "app[index]_b2bl_key"。* Index 是 1 到 10 之间的整数。


```opensips title="设置 app[index]_b2bl_key_column 参数"
...
modparam("b2b_sca", "app1_b2bl_key_column", "first_b2bl_key")
modparam("b2b_sca", "app2_b2bl_key_column", "second_b2bl_key")
...
```


### 导出的函数 {#exported-functions}


#### sca_init_request(shared_line)


这是脚本编写者必须对初始 INVITE 调用的函数，该 INVITE 需要实例化一个 SCA 呼叫（见上图中来自 alice1 的呼叫）。


参数含义：


- *shared_line* (int) - 一个整数，用于将该呼叫支路标识为 "appearance" 呼叫或 "shared" 呼叫：
	* 0: "shared" 呼叫
	* 1: "appearance" 呼叫


```opensips title="sca_init_request() 用法"
...
modparam("b2b_sca",
	"shared_line_spec_param","$var(shared_line)")
modparam("b2b_sca",
	"appearance_name_addr_spec_param","$var(appearance_name_addr)")
modparam("b2b_sca",
	"watchers_avp_spec","$avp(watchers_avp_spec)")

...

	# 设置共享呼叫标识符
	$var(shared_line) = "alice";

	# 设置 watcher
	$avp(watchers_avp_spec) = "sip:alice1@example.com";
	$avp(watchers_avp_spec) = "sip:alice2@example.com";

	if (INCOMING_SHARED_CALL) {
		# 传入呼叫是一个 'shared' 呼叫
		$var(shared_line_entity) = 0;
		# 设置外观名称地址
		$var(appearance_name_addr) = $fu;
	}
	else {
		# 传入呼叫是一个 'appearance' 呼叫
		# - 参见示例中 Alice 的初始呼叫支路
		$var(shared_line_entity) = 1;
		# 设置外观名称地址
		$var(appearance_name_addr) = $tu;
	}

	# 发起呼叫
	if (!sca_init_request($var(shared_line_entity))) {
		send_reply(403, "Internal Server Error (SLA)");
		exit;
	}
...
```


#### sca_bridge_request(shared_line_to bridge)


这是脚本编写者必须对既有共享呼叫的初始 "appearance" INVITE 调用的函数。它会把当前的 "appearance" 呼叫与既有的 "shared" 呼叫桥接起来，旧的 "appearance" 呼叫将被断开（见上图中来自 alice2 的呼叫）。


参数含义：


- *shared_line_to_bridge* (string) - 一个字符串，标识此前由 sca_init_request() 设置的共享线路/呼叫。


```opensips
...
	if ($rU==NULL && is_method("INVITE") &&
		$fU==$tU && is_present_hf("Call-Info")) {
		# 传入呼叫是一个 'appearance' 呼叫
		# - 参见示例中来自 alice2 的 Alice 呼叫
		$var(shared_line_to_bridge) = "alice";
		if (!sca_bridge_request($var(shared_line_to_bridge)))
			send_reply(403, "Internal SLA Error");
			exit;
		}
	}
...
```


### 导出的 MI 函数 {#exported-mi-functions}


#### sca_list


列出属于某个共享线路/呼叫的外观。


名称：*sca_list*


参数：*无*


MI FIFO 命令格式：


```bash
	opensips-cli -x mi sca_list
```
<!-- CONTRIBUTORS -->

### 许可证 {#license}

本项目的所有文档文件（即 .md 扩展名的文件）均以 Creative Common License 4.0 授权。
