---
title: "b2b_entities 模块"
description: "本模块实现 OpenSIPS 的 B2BUA 实现所需的 UAS 与 UAC 基本功能。"
---


## 管理指南 {#admin-guide}


### 概述 {#overview}


OpenSIPS 中的 B2BUA 实现分为两层：


- 下层（本模块实现）——实现 UAS 与 UAC 的基本功能
- 上层——代表 B2BUA 的逻辑引擎，负责使用下层提供的功能实际实现
B2BUA 业务。


本模块存储与 B2BUA 所参与对话相对应的记录。它导出一个供其他模块调用的
API，提供创建新对话记录、在某个对话中发送请求或应答的函数，并且在某个已存储
对话内收到请求或应答时通知上层模块。

记录按创建模式分为两类：b2b 服务器实体和 b2b 客户端实体。为收到的初始消息
创建的实体是服务器实体，而要发送初始请求（创建新对话）的实体是 b2b 客户端
实体。名称与第一个事务中的行为相对应——如果作为 UAS 则为服务器实体，如果
作为 UAC 则为客户端实体。

本模块并不能单独实现 B2BUA，而是需要一个实现 B2B 逻辑的模块。


如果先加载了 uac_auth 模块，本模块能够响应鉴权质询。b2b 鉴权的
凭据列表也由 uac_auth 模块提供。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


- *tm*
- *一个数据库模块*
- *uac_auth*
（如果需要鉴权则为必填）


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，必须安装以下库或应用程序：


- *无*


### 导出的参数 {#exported-parameters}


#### server_hsize (int)


用于存储 b2b 服务器实体的哈希表大小。
它是实际大小的 2 的对数值。


*默认值为 "9"*
（512 条记录）。


```opensips title="Set server_hsize parameter"
...
modparam("b2b_entities", "server_hsize", 10)
...
	
```


#### client_hsize (int)


用于存储 b2b 客户端实体的哈希表大小。
它是实际大小的 2 的对数值。


*默认值为 "9"*
（512 条记录）。


```opensips title="Set client_hsize parameter"
...
modparam("b2b_entities", "client_hsize", 10)
...
	
```


#### script_req_route (str)


收到 B2B 请求时将被调用的 b2b 脚本路由的名称。


```opensips title="Set script_req_route parameter"
...
modparam("b2b_entities", "script_req_route", "b2b_request")
...
	
```


#### script_reply_route (str)


收到 B2B 应答时将被调用的 b2b 脚本路由的名称。


```opensips title="Set script_repl_route parameter"
...
modparam("b2b_entities", "script_reply_route", "b2b_reply")
...
	
```


#### db_url (str)


数据库 URL。它不是必需的，如果不设置，
数据不会存储到数据库中。


```opensips title="Set db_url parameter"
...
modparam("b2b_entities", "db_url", "mysql://opensips:opensipsrw@127.0.0.1/opensips")
...
	
```


#### cachedb_url (str)


要使用的 NoSQL 数据库的 URL。目前仅支持
Redis。


```opensips title="Set cachedb_url parameter"
...
modparam("b2b_entities", "cachedb_url", "redis://localhost:6379/")
...
	
```


#### cachedb_key_prefix (string)


在 NoSQL 数据库中设置的每个键所使用的前缀。


*默认值为 "b2be$"。*


```opensips title="Set cachedb_key_prefix parameter"
...
modparam("b2b_entities", "cachedb_key_prefix", "b2b")
...
```


#### update_period (int)


更新数据库中信息的时间间隔。


*默认值为 "100"。*


```opensips title="Set update_period parameter"
...
modparam("b2b_entities", "update_period", 60)
...
	
```


#### b2b_key_prefix (string)


生成键时使用的字符串（它作为 callid 或 To tag 插入到
SIP 消息中）。如果在同一架构中级联使用多个 OpenSIPS B2BUA
实例，设置此前缀会很有用。有时 OpenSIPS B2BUA 会查看
callid 或 To tag，以判断它是否具有用于确定
请求是否由自己发送的格式。


*默认值为 "B2B"。*


```opensips title="Set b2b_key_prefix parameter"
...
modparam("b2b_entities", "b2b_key_prefix", "B2B1")
...
	
```


#### db_mode (int)


B2B 模块支持 3 种数据库存储方式


- NO DB STORAGE - 将此参数设置为 0
- WRITE THROUGH（同步写入数据库）- 将此参数设置为 1
- WRITE BACK（定期更新到数据库）- 将此参数设置为 2


*默认值为 "2"（WRITE BACK）。*


```opensips title="Set db_mode parameter"
...
modparam("b2b_entities", "db_mode", 1)
...
	
```


#### db_table (str)


用于存储 B2B 实体的表名


*默认值为 "b2b_entities"*


```opensips title="Set db_table parameter"
...
modparam("b2b_entities", "db_table", "some table name")
...
	
```


#### cluster_id (int)


本实例所属集群的 ID。设置此参数会通过在实例之间复制
B2B 实体（B2B 对话）来为 OpenSIPS B2BUA 启用集群支持。
这还通过 *clusterer* 模块的
数据 "sync" 机制确保重启后的持久性。


该 OpenSIPS 集群对外暴露 **"b2be-entities-repl"**
能力，以便在任意同步请求期间将节点标记为有资格成为数据提供者。
因此，集群中必须*至少有一个节点*在 *clusterer.flags*
列/属性中标记为 **"seed"** 值，才能完全正常工作。
更多细节请参阅 [clusterer - 能力](/zh/modules/clusterer#capabilities-layer)
章节。


*默认值为 "0"（已禁用集群）*


```opensips title="Set cluster_id parameter"
...
modparam("b2b_entities", "cluster_id", 10)
...
	
```


#### passthru_prack (int)


此参数用于控制 PRACK 是在本地生成（=0），
还是请求其端到端传输（=1）。


*默认值为 "0"（本地生成 PRACK）*


```opensips title="Set passthru_prack parameter"
...
modparam("b2b_entities", "passthru_prack", 1)
...
	
```


#### advertised_contact (str)


在为通过 [ua_session_client_start](#ua_session_client_start) MI 函数启动的
UA 会话所生成的消息中使用的 Contact。


```opensips title="Set advertised_contact parameter"
...
modparam("b2b_entities", "advertised_contact", "opensips@10.10.10.10:5060")
...
	
```


#### ua_default_timeout (int)


通过 [ua_session_server_init()](#ua_session_server_initkey-flags-extra_params) 函数或
[ua_session_client_start](#ua_session_client_start) MI 函数启动的 UA 会话的默认超时时间，
单位为秒。超过此时间后将发送 BYE 并删除该会话。


如果未设置，默认值为 43200（12 小时）。


```opensips title="Set ua_default_timeout parameter"
...
modparam("b2b_entities", "ua_default_timeout", 7200)
...
	
```


### 导出的函数 {#exported-functions}


#### ua_session_server_init([key], [flags], [extra_params]) {#ua_session_server_initkey-flags-extra_params}


此函数通过处理初始 INVITE 来初始化一个新的 UA 会话。
之后收到的属于该会话的请求/应答仅
通过 [E_UA_SESSION](#e_ua_session) 事件处理。


参数：


- *key (var, 可选)* - 用于返回
新 UA 会话的 b2b 实体键的变量。
- *flags (string, 可选)* - 通过以下标志位为此 UA 会话
配置选项：
  - *t[nn]* - 此会话的
最长持续时间，单位为秒。超时后将发送 BYE
并删除该会话。如果未设置，
将使用通过
[ua_default_timeout](#ua_default_timeout-str) 配置的默认超时。
示例：*t3600*
  - *a* - 通过
[E_UA_SESSION](#e_ua_session) 事件报告收到 ACK 请求。
  - *r* - 通过
[E_UA_SESSION](#e_ua_session) 事件报告收到应答。
  - *d* - 收到 INVITE 的 200 OK 应答（在 UAC 会话的情况下）
或 re-INVITE 时，禁用自动发送 ACK。
  - *h* - 在 [E_UA_SESSION](#e_ua_session) 事件中提供
SIP 请求/应答的头域。
  - *b* - 在 [E_UA_SESSION](#e_ua_session) 事件中提供
SIP 请求/应答的消息体。
  - *n* - 对于用此函数处理的初始 INVITE，
不触发 [E_UA_SESSION](#e_ua_session) 事件（event_type 为
*NEW*）。
- *extra_params (string, 可选)* - 传递给
[E_UA_SESSION](#e_ua_session) 事件中 *extra_params* 参数的
任意值。


此函数可在 REQUEST_ROUTE 中使用。


```opensips title="ua_session_server_init usage"
...
if(is_method("INVITE") && !has_totag()) {
   ua_session_server_init($var(b2b_key), "arhb");

   ua_session_reply($var(b2b_key), "INVITE", 200, "OK", $var(my_sdp));
   
   exit;
}
...
		
```


#### ua_session_update(key, method, [body], [extra_headers], [content_type])


为通过
[ua_session_server_init()](#ua_session_server_initkey-flags-extra_params) 函数或
[ua_session_client_start](#ua_session_client_start) MI 函数启动的 UA 会话发送顺序请求。


参数：


- *key (string)* - UA 会话的 b2b 实体键。
- *method (string)* - 此请求的
SIP 方法名。
- *body (string, 可选)* - 要包含在
SIP 消息中的消息体。
- *extra_headers (string, 可选)* - 要包含在
SIP 消息中的额外头域。
- *content_type (string, 可选)* - Content-Type
头域。如果缺少该参数且提供了消息体，
将使用 "Content-Type: application/sdp"。


此函数可在 REQUEST_ROUTE、EVENT_ROUTE 中使用。


```opensips title="ua_session_update usage"
...
ua_session_update($var(b2b_key), "OPTIONS");
...
		
```


#### ua_session_reply(key, method, code, [reason], [body], [extra_headers], [content_type])


为通过
[ua_session_server_init()](#ua_session_server_initkey-flags-extra_params) 函数或
[ua_session_client_start](#ua_session_client_start) MI 函数启动的 UA 会话发送应答。


参数：


- *key (string)* - UA 会话的 b2b 实体键。
- *method (string)* - 所应答的
SIP 方法的名称。
- *code (int)* - 应答码。
- *reason (string, 可选)* - 应答原因短语。
- *body (string, 可选)* - 要包含在
SIP 消息中的消息体。
- *extra_headers (string, 可选)* - 要包含在
SIP 消息中的额外头域。
- *content_type (string, 可选)* - Content-Type 头域。
如果缺少该参数且提供了消息体，
将使用 "Content-Type: application/sdp"。


此函数可在 REQUEST_ROUTE、EVENT_ROUTE 中使用。


```opensips title="ua_session_reply usage"
...
ua_session_reply($var(b2b_key), "INVITE", 180, "Ringing");
...
		
```


#### ua_session_terminate(key, [extra_headers])


终止通过
[ua_session_server_init()](#ua_session_server_initkey-flags-extra_params) 函数或
[ua_session_client_start](#ua_session_client_start) MI 函数启动的 UA 会话。


参数：


- *key (string)* - UA 会话的 b2b 实体键。
- *extra_headers (string, 可选)* - 要包含在
SIP 消息中的额外头域


此函数可在 REQUEST_ROUTE、EVENT_ROUTE 中使用。


```opensips title="ua_session_terminate usage"
...
ua_session_terminate($var(b2b_key));
...
		
```


### 导出的 MI 函数 {#exported-mi-functions}


#### b2be_list


此命令可用于列出 b2b 实体的内部信息。


名称：*b2be_list*


参数：*无*


MI FIFO 命令格式：


```bash
	opensips-cli -x mi b2be_list
	
```


#### ua_session_client_start {#ua_session_client_start}


此命令通过发送初始 INVITE 启动一个新的 UAC 会话。
之后收到的属于该会话的请求/应答仅
通过 [E_UA_SESSION](#e_ua_session) 事件处理。


名称：*ua_session_client_start*


参数：


- *ruri* - 请求 URI
- *to* - To URI；也可以按如下形式指定：
*display_name,uri*，以设置显示名称，
例如 *Alice,sip:alice@opensips.org*。
- *from* - From URI；也可以按如下形式指定：
*display_name,uri*，以设置显示名称，
例如 *Alice,sip:alice@opensips.org*
- *proxy (可选)* - 用于
发送 INVITE 的出站代理的 URI
- *body (可选)* - 消息体
- *content_type (可选)* - 要使用的 Content-Type
头域。如果缺失且提供了消息体，
将使用 "Content-Type: application/sdp"。
- *extra_headers (可选)* - 额外头域
- *flags (可选)* - 标志位，含义与
[ua_session_server_init()](#ua_session_server_initkey-flags-extra_params) 的 *flags*
参数相同。
- *socket (可选)* - OpenSIPS 发送套接字


opensips-cli 命令格式：


```bash
opensips-cli -x mi ua_session_client_start ruri=sip:bob@opensips.org \
to=sip:bob@opensips.org from=sip:alice@opensips.org flags=arhb
```


#### ua_session_update


为通过
[ua_session_server_init()](#ua_session_server_initkey-flags-extra_params) 函数或
[ua_session_client_start](#ua_session_client_start) MI 函数启动的 UA 会话发送顺序请求。


名称：*ua_session_update*


参数：


- *key* - UA 会话的 b2b 实体键。
- *method* - 此请求的
SIP 方法名。
- *body (可选)* - 要包含在
SIP 消息中的消息体。
- *extra_headers (可选)* - 要包含在
SIP 消息中的额外头域。
- *content_type (string)* - Content-Type 头域。
如果缺少该参数且提供了消息体，
将使用 "Content-Type: application/sdp"。


opensips-cli 命令格式：


```bash
opensips-cli -x mi ua_session_update key=B2B.436.1925389.1649338095 method=OPTIONS
```


#### ua_session_reply


为通过
[ua_session_server_init()](#ua_session_server_initkey-flags-extra_params) 函数或
[ua_session_client_start](#ua_session_client_start) MI 函数启动的 UA 会话发送应答。


名称：*ua_session_reply*


参数：


- *key* - UA 会话的 b2b 实体键。
- *method* - 所应答的
SIP 方法的名称。
- *code* - 应答码
- *reason* - 应答原因短语
- *body (可选)* - 要包含在
SIP 消息中的消息体
- *extra_headers (可选)* - 要包含在
SIP 消息中的额外头域
- *content_type (可选)* - Content-Type 头域。
如果缺少该参数且提供了消息体，
将使用 "Content-Type: application/sdp"。


opensips-cli 命令格式：


```bash
opensips-cli -x mi ua_session_reply key=B2B.436.1925389.1649338095 method=OPTIONS code=200 reason=OK
```


#### ua_session_terminate


终止通过
[ua_session_server_init()](#ua_session_server_initkey-flags-extra_params) 函数或
[ua_session_client_start](#ua_session_client_start) MI 函数启动的 UA 会话。


名称：*ua_session_terminate*


参数：


- *key* - UA 会话的 b2b 实体键。
- *extra_headers (可选)* - 要包含在
SIP 消息中的额外头域


opensips-cli 命令格式：


```bash
opensips-cli -x mi ua_session_terminate key=B2B.436.1925389.1649338095
```


#### ua_session_list


列出通过
[ua_session_server_init()](#ua_session_server_initkey-flags-extra_params) 函数或
[ua_session_client_start](#ua_session_client_start) MI 函数启动的 UA 会话的信息。


名称：*ua_session_list*


参数：


- *key (可选)* - 要列出的 UA 会话的 b2b 实体键。
如果缺失，将列出所有会话。


MI FIFO 命令格式：


```bash
	opensips-cli -x mi ua_session_list
	
```


### 导出的事件 {#exported-events}


#### E_UA_SESSION {#e_ua_session}


对于属于通过
[ua_session_server_init()](#ua_session_server_initkey-flags-extra_params) 函数或
[ua_session_client_start](#ua_session_client_start) MI 函数启动的、进行中的 UA 会话的请求/应答，
会触发此事件。


请注意，除非在发起 UA 会话时设置了
*r* 标志位，否则完全不会报告应答。并且
仅当设置了 *a* 标志位时才会报告 ACK 请求。


参数：


- *key* - UA 会话的 b2b 实体键。
- *entity_type* - 指示这是
*UAS* 还是 *UAC* 实体。
- *event_type* - 事件类型：
	- *NEW* - 对于初始 INVITE 请求，由 [ua_session_server_init()](#ua_session_server_initkey-flags-extra_params) 函数处理。
	- *EARLY* - 对于 1xx 临时应答
	- *ANSWERED* - 对于 2xx 成功应答
	- *REJECTED* - 对于 3xx-6xx 失败应答
	- *UPDATED* - 对于任何顺序请求，包括 ACK，但不包括 BYE/CANCEL
	- *TERMINATED* - 对于 BYE 或 CANCEL 请求
- *status* - 如果消息是
SIP 应答，则为应答状态码
- *reason* - 如果消息是
SIP 应答，则为应答原因
- *method* - SIP 方法名
- *body* - SIP 消息体
- *headers* - 消息中所有 SIP 头域的
完整列表。
- *extra_params* - 任意值。目前只有
[ua_session_server_init()](#ua_session_server_initkey-flags-extra_params) 函数在使用
*extra_params* 参数时传递此值，且它仅
出现在 event_type 为 *NEW* 的事件中。


## 开发者指南 {#developer-guide}


本模块提供一个可供其他
OpenSIPS 模块使用的 API。该 API 提供创建和处理对话的函数。
可以在收到初始消息时创建对话，这对应于
b2b 服务器实体；也可以由服务器发起，此时将在 b2b_entities 模块中
创建客户端实体。


### b2b_load_api(b2b_api_t* api)


此函数绑定 b2b_entities 模块，并填充结构体
中将在后文详细描述的导出函数。


```c title="b2b_api_t structure"
...
typedef struct b2b_api {
	b2b_server_new_t          server_new;
	b2b_client_new_t          client_new;

	b2b_send_request_t        send_request;
	b2b_send_reply_t          send_reply;

	b2b_entity_delete_t       entity_delete;

	b2b_restore_linfo_t       restore_logic_info;
	b2b_update_b2bl_param_t   update_b2bl_param;
}b2b_api_t;
...
```


### server_new


字段类型：


```c
...
typedef str* (*b2b_server_new_t) (struct sip_msg* , str* local_contact,
		b2b_notify_t , str *mod_name, str* logic_key, struct b2b_tracer *tracer,
		void *param, b2b_param_free_cb free_param);
...
```


此函数请求 b2b_entities 模块创建新的服务器
实体记录。内部处理实际上会从消息中提取对话信息，
并构造一条将存储在哈希表中的记录。
第二个参数是指向函数的指针，当该对话有事件（请求或应答）到来时，
b2b_entities 模块将调用该函数。第三个
参数是指向某个值的指针，该值将被存储并在调用 notify 函数时
作为参数传入（它必须在共享内存中分配）。


返回值是记录的标识符，在调用其他
表示对话中操作的函数（发送请求、
发送应答）时会用到。


notify 函数具有以下原型：


```c
...
typedef int (*b2b_notify_t)(struct sip_msg* msg, str* id, int type, void* param);
...
```


当收到由 b2b_entities 处理的对话的请求或应答时，
会调用此函数。第一个参数是消息，第二个是
对话的标识符，第三个是表示消息类型
的标志位（它有两个可能的值——B2B_REQUEST 和 B2B_REPLY）。最后
一个参数是创建实体时由上层模块传入的参数。


### client_new


字段类型：


```c
...
typedef str* (*b2b_client_new_t) (client_info_t* , b2b_notify_t b2b_cback,
				b2b_add_dlginfo_t add_dlginfo_f, str *mod_name, str *logic_key,
				struct b2b_tracer *tracer, void *param, b2b_param_free_cb free_param);
...
```


此函数请求 b2b_entities 模块创建新的客户端
实体记录，并通过发送初始消息创建新对话。
这些参数是初始请求所需的全部值，另外还加上
notify 函数和参数。
b2b_cback 参数是指向回调的指针，当用
此函数创建的对话中发生事件（收到应答或请求）时必须调用该回调。
add_dlginfo_f 参数也是一个函数指针，指向当创建的对话收到最终成功响应时
将调用的回调。
该回调将收到该记录的完整对话信息作为参数。应当存储它，
并在调用 send_request 或 send_reply 函数时使用。


返回值是记录的标识符，在调用其他
表示对话中操作的函数（发送请求、
发送应答）时会用到。


### send_request


字段类型：


```c
...
typedef int (*b2b_send_request_t)(enum b2b_entity_type ,str* b2b_key, str* method,
		str* extra_headers, str* body, b2b_dlginfo_t*);
...
```


此函数请求 b2b_entities 模块在由 b2b_key 标识的 b2b 对话中
发送请求。第一个参数是实体类型，可以有两个值：
B2B_SERVER 和 B2B_CLIENT。第二个是创建
函数（server_new 或 client_new）返回的标识符，接下来的参数是新请求所需的
信息：method、extra_headers、body。
最后一个参数包含对话信息——callid、To tag、From tag。这些
信息用于精确匹配必须为其发送新请求的
b2b_entities 记录。


返回值为 0 表示成功，负值表示错误。


### send_reply


字段类型：


```c
...
typedef int (*b2b_send_reply_t)(enum b2b_entity_type et, str* b2b_key, int code, str* text,
		str* body, str* extra_headers, b2b_dlginfo_t* dlginfo);
...
```


此函数请求 b2b_entities 模块在由 b2b_key 标识的 b2b 对话中
发送应答。第一个参数是实体类型，可以有两个值：
B2B_SERVER 和 B2B_CLIENT。第二个是创建
函数（server_new 或 client_new）返回的标识符，接下来的参数是新应答所需的
信息：code、text、body、extra_headers。最后一个参数包含
用于匹配正确记录的对话信息。


返回值为 0 表示成功，负值表示错误。


### entity_delete


字段类型：


```c
...
typedef void (*b2b_entity_delete_t)(enum b2b_entity_type et, str* b2b_key,
	 b2b_dlginfo_t* dlginfo);
...
```


上层函数必须调用此函数来删除
b2b_entities 中的记录。记录不会由 b2b_entities
模块清理，上层模块必须负责删除它们。


### restore_logic_info


字段类型：


```c
...
typedef int (*b2b_restore_linfo_t)(enum b2b_entity_type type, str* key,
		b2b_notify_t cback, void *param, b2b_param_free_cb free_param);
...
```


此函数在启动时从数据库加载数据时使用，
用于恢复指向回调函数的指针。


### update_b2bl_param


字段类型：


```c
...
typedef int (*b2b_update_b2bl_param_t)(enum b2b_entity_type type, str* key,
		str* param, int replicate);
...
```


此函数可用于更改为某个实体存储的逻辑参数
（在实体于逻辑记录之间移动的情况下很有用）。
<!-- CONTRIBUTORS -->

### 许可证 {#license}

所有文档文件（即扩展名为 .md 的文件）均按 Creative Common License 4.0 许可授权。
