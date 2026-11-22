---
title: "presence 模块"
description: "该模块处理 PUBLISH 与 SUBSCRIBE 消息，并以通用的、与事件无关的方式生成 NOTIFY 消息。"
sidebar: false
---

## 管理指南 {#admin-guide}


### 概述 {#overview}


模块处理 PUBLISH 和 SUBSCRIBE 消息，并以通用的、与事件无关的方式生成 NOTIFY 消息。它允许从其他 OpenSIPS 模块注册事件。当前可添加的事件有：


- 来自 presence_xml 模块的 *presence*、*presence.winfo*、*dialog;sla*
- 来自 presence_mwi 模块的 *message-summary*
- 来自 presence_callinfo 模块的 *call-info*、*line-seize*
- 来自 presence_dialoginfo 模块的 *dialog*
- 来自 presence_xcapdiff 模块的 *xcap-diff*
- 来自 presence_dfks 模块的 *as-feature-event*


模块使用数据库存储。后续通过内存缓存操作对其进行了改进，以提升性能。订阅对话信息存放在内存中，并定期更新到数据库；而对于发布，内存中仅维护某个资源是否存在已存储信息，以避免不必要且代价高昂的数据库操作。可以配置回退到数据库模式（通过设置模块参数 "fallback2db"）。在该模式下，如果在缓存中找不到所查询的记录，则继续在数据库中查询。这适用于处理与内存负载可能分摊在使用同一数据库的多台机器上的架构。


模块也可以仅以库的功能工作，不进行消息处理和生成，只用于其导出的函数。如果 db_url 参数未设置为任何值，则启用该工作模式。


服务器遵循以下规范：RFC3265、RFC3856、RFC3857、RFC3858。


### 呈现集群 {#presence-clustering}


要阅读并理解呈现集群、其能力以及如何实现高可用、负载均衡或联邦等场景，请参阅本文 [https://blog.opensips.org/2018/03/27/clustering-presence-services-with-opensips-2-4/](https://blog.opensips.org/2018/03/27/clustering-presence-services-with-opensips-2-4/)。


由于在使用 *full-sharing* [cluster_federation_mode](#cluster_federation_mode-str) 时会在启动阶段执行数据同步，因此在这种情况下应至少在集群中定义一个"种子"节点。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


以下模块必须在本模块之前加载：


- *一个数据库模块*。
- *signaling*。
- 如果设置了 cluster_id 模块参数并启用了集群支持，则为 *clusterer*。


#### 外部库或应用程序 {#external-libraries-or-applications}


- *libxml-dev*。


### 导出的参数 {#exported-parameters}


#### db_url(str)


数据库 URL。


如果设置，模块就是完全可用的呈现服务器。否则，它作为"库"使用，仅提供其导出的函数。


*默认值是 "NULL"。*


```opensips title="Set db_url parameter"
...
modparam("presence", "db_url", 
	"mysql://opensips:opensipsrw@192.168.2.132/opensips")
...
```


#### fallback2db (int)


设置此参数可启用回退到数据库的工作模式。在该模式下，如果在缓存中找不到所查询的记录，则继续在数据库中查询。这适用于处理与内存负载可能分摊在使用同一数据库的多台机器上的架构。


```opensips title="Set fallback2db parameter"
...
modparam("presence", "fallback2db", 1)
...
```


#### cluster_id (int)


本呈现服务器所属集群的 ID。仅在需要集群模式时才使用此参数。要理解集群 ID 的概念，请参阅 *clusterer* 模块。


该 OpenSIPS 集群对外提供 **"presence"** 能力，用于将节点标记为有资格在任意同步请求中作为数据提供者。因此，集群必须至少有一个节点在 *clusterer.flags* 列/属性中标记为 **"seed"** 值，才能完全正常工作。更多细节请参阅 [clusterer - Capabilities](/zh/modules/clusterer#capabilities-layer) 章节。


更多信息请参阅[呈现集群](#presence-clustering)章节。


*默认值是 "None"。*


```opensips title="Set cluster_id parameter"
...
modparam("presence", "cluster_id", 2)
...
```


#### cluster_federation_mode (str) {#cluster_federation_mode-str}


启用联邦模式后，呈现集群内部的节点将开始通过集群支持向其他节点广播数据。


*可能的值：*


- *disabled* - 联邦模式被禁用
- *on-demand-sharing* - 每个节点上只保留最少需要的信息。非本地订阅者的复制信息会被丢弃，新订阅者的查询会在集群中广播。
- *full-sharing* - 所有呈现节点上都保留发布状态，即使没有任何本地订阅者。


如果不想使用共享数据库（通过 [fallback2db](#fallback2db-int)），但仍希望各处都拥有完整的数据集，可以选择 *full-sharing* 模式。该模式允许切换 PUBLISH 端点，即使对已发布的事件状态也是如此，从而可以在不丢失状态的前提下增加和移除呈现服务器。


更多信息请参阅[呈现集群](#presence-clustering)章节。


*默认值是 "disabled"。*


```opensips title="Set cluster_federation_mode parameter"
...
modparam("presence", "cluster_federation_mode", "full-sharing")
...
```


#### cluster_pres_events (str)


逗号分隔值（CSV）列表，列出联邦集群要考虑的事件——只有通告了这些事件之一的 presentity 才会通过集群广播。


更多信息请参阅[呈现集群](#presence-clustering)章节。


*默认值是 "empty"（表示全部）。*


```opensips title="Set cluster_pres_events parameter"
...
modparam("presence", "cluster_pres_events" ,"presence, dialog;sla, message-summary")
...
```


#### cluster_be_active_shtag (str)


用于指示该节点（作为集群的一部分）何时应处于活动状态的集群共享标签名称。如果该共享标签关闭（或作为备份），则从集群角度看该节点将变为非活动，即不发送也不接受任何与呈现相关的集群流量。


节点的这种变为非活动的能力可用于构建联邦集群，其中 2 个节点充当本地活动-备份配置（用于本地高可用目的）。


此参数仅在集群模式下有意义。如果未定义，节点将始终处于活动状态。


更多信息请参阅[呈现集群](#presence-clustering)章节。


*默认值是 "empty"（未定义标签）。*


```opensips title="Set cluster_be_active_shtag parameter"
...
modparam("presence", "cluster_be_active_shtag" ,"local_ha")
...
```


#### expires_offset (int)


存储订阅/发布时额外增加的时间。


*默认值是 "0"。*


```opensips title="Set expires_offset parameter"
...
modparam("presence", "expires_offset", 10)
...
```


#### max_expires_subscribe (int)


SUBSCRIBE 消息允许的最大 expires 值。


*默认值是 "3600"。*


```opensips title="Set max_expires_subscribe parameter"
...
modparam("presence", "max_expires_subscribe", 3600)
...
```


#### max_expires_publish (int)


PUBLISH 消息允许的最大 expires 值。


*默认值是 "3600"。*


```opensips title="Set max_expires_publish parameter"
...
modparam("presence", "max_expires_publish", 3600)
...
```


#### contact_user (str)


这是用于 SUBSCRIBE 的 200 OK 应答以及后续对话内 NOTIFY 请求的 Contact 头域中的用户名。Contact 的 IP 地址、端口和传输层将根据接收 SUBSCRIBE 的接口自动确定。


如果设置为空字符串，则不会向 contact 添加用户名，contact 仅由 IP、端口和传输层构成。


*默认值是 "presence"。*


```opensips title="Set contact_user parameter"
...
modparam("presence", "contact_user", "presence")
...
		
```


#### enable_sphere_check (int)


此参数是一个标志位，如果权限规则中包含 sphere 检查，则应设置该标志位。sphere 信息应出现在 presentity 发布的 RPID 消息体中。引入该标志位是因为此检查需要额外的处理，如果客户端不支持该特性，则应避免这些处理。


*默认值是 "0 "。*


```opensips title="Set enable_sphere_check parameter"
...
modparam("presence", "enable_sphere_check", 1)
...
	
```


#### waiting_subs_daysno (int)


如果订阅处于 pending 或 waiting 状态（未为其定义授权策略，或目标用户自订阅以来未注册因而未被告知该订阅），则该参数指定在服务器数据库中保留该订阅记录的天数。


*默认值是 "3" 天。可接受的最大值是 30 天。*


```opensips title="Set waiting_subs_daysno parameter"
...
modparam("presence", "waiting_subs_daysno", 2)
...
	
```


#### mix_dialog_presence (int)


该模块参数启用了呈现服务器中一个非常好的特性——根据对话状态生成呈现信息。如果设置此参数，即使好友的电话没有发送包含该信息的呈现发布，呈现服务器也会告知你该好友是否正在通话中。你需要加载 dialoginfo 相关模块：presence_dialoginfo、pua_dialoginfo、dialog 和 pua。


*默认值是 "0"。*


```opensips title="Set mix_dialog_presence parameter"
...
modparam("presence", "mix_dialog_presence", 1)
...
	
```


#### bla_presentity_spec (str)


默认情况下，BLA 订阅（event=dialog;sla）的 presentity uri 由 contact 用户名 + 域计算得出。但在某些情况下，这种计算 presentity 的方式可能不正确（例如前面有一个对 contact 做了伪装的 SBC）。因此我们添加了此参数，允许为 BLA 订阅定义用自定义 uri 作为 presentity uri。应将该参数设置为某个伪变量的名称，然后在调用 [handle_subscribe()](#handle_subscribeforce_active-sharing_tag) 函数之前将该伪变量设置为所需的 URI。


*默认值是 "NULL"。*


```opensips title="Set bla_presentity_spec parameter"
...
modparam("presence", "bla_presentity_spec", "$var(bla_pres)")
...
	
```


#### bla_fix_remote_target (int)


Polycom 在 bla 实现中存在一个缺陷。它会在 Notify 消息体中插入远端 IP contact，当同一 BLA 组中的另一部电话接起被另一部电话保持的通话时，它会直接向该远端 IP 发送 Invite。OpenSIPS BLA 服务器在可能的情况下会通过用域替换 IP contact 来防止这种情况。


但在某些情况下（某些配置下）这并不理想，因此引入了此参数以便在需要时禁用该行为。


*默认值是 "1"。*


```opensips title="Set bla_fix_remote_target parameter"
...
modparam("presence", "bla_fix_remote_target", 0)
...
	
```


#### notify_offline_body (int)


如果设置此参数，当找不到某用户的已发布信息时，呈现服务器会生成一个状态为 'closed' 的占位消息体，并在发送 Notify 时使用它，而不是发送不带消息体的通知。


*默认值是 "0"。*


```opensips title="Set notify_offline_body parameter"
...
modparam("presence", "notify_offline_body", 1)
...
	
```


#### end_sub_on_timeout (int)


当发送的 NOTIFY 请求收到 SIP 超时（408）时，是否应自动终止（销毁）呈现订阅。


*默认值是 "1"（启用）。*


```opensips title="Set end_sub_on_timeout parameter"
...
modparam("presence", "end_sub_on_timeout", 0)
...
	
```


#### clean_period (int)


清理过期订阅对话的周期。


*默认值是 "100"。值为零或负数会禁用此活动。*


```opensips title="Set clean_period parameter"
...
modparam("presence", "clean_period", 100)
...
```


#### db_update_period (int)


将缓存的订阅者信息与数据库同步的周期。


*默认值是 "100"。值为零或负数会禁用同步。*


```opensips title="Set db_update_period parameter"
...
modparam("presence", "db_update_period", 100)
...
```


#### presentity_table(str)


存储发布信息的数据库表名称。


*默认值是 "presentity"。*


```opensips title="Set presentity_table parameter"
...
modparam("presence", "presentity_table", "presentity")
...
```


#### active_watchers_table(str)


存储活动订阅信息的数据库表名称。


*默认值是 "active_watchers"。*


```opensips title="Set active_watchers_table parameter"
...
modparam("presence", "active_watchers_table", "active_watchers")
...
```


#### watchers_table(str)


存储订阅状态的数据库表名称。


*默认值是 "watchers"。*


```opensips title="Set watchers_table parameter"
...
modparam("presence", "watchers_table", "watchers")
...
```


#### subs_htable_size (int)


用于存储订阅对话的哈希表大小。计算表大小时，该参数将作为 2 的幂次使用。


*默认值是 "9 (512)"。*


```opensips title="Set subs_htable_size parameter"
...
modparam("presence", "subs_htable_size", 11)
...
	
```


#### pres_htable_size (int)


用于存储发布记录的哈希表大小。计算表大小时，该参数将作为 2 的幂次使用。


*默认值是 "9 (512)"。*


```opensips title="Set pres_htable_size parameter"
...
modparam("presence", "pres_htable_size", 11)
...
	
```


### 导出的函数 {#exported-functions}


#### handle_publish([sender_uri])


该函数处理 PUBLISH 请求。它存储并更新数据库中的发布信息，并在发布信息发生变化时调用函数发送 NOTIFY 消息。


它可以接受一个可选字符串参数，即 'sender_uri' SIP URI。该参数是为支持 BLA 实现而添加的。如果存在，即使订阅存在，也不会向该 uri 发送发布状态变化的通知。它应当从 Sender 头域中获取。为避免安全问题，是否将该头域的内容作为 handle_publish 的参数传递，留给管理员决定。


该函数可在 REQUEST_ROUTE 中使用。


*返回码：*


- *1 - 成功*。
- *-1 - 出错*。


在所有情况下，模块都会发送适当的无状态应答。


```opensips title="handle_publish usage"
...
	if(is_method("PUBLISH"))
	{
		if($hdr(Sender)!= NULL)
			handle_publish($hdr(Sender));
		else
			handle_publish();
	} 
...
```


#### handle_subscribe([force_active] [,sharing_tag]) {#handle_subscribeforce_active-sharing_tag}


该函数用于处理 SUBSCRIBE 请求。它存储或更新数据库中的 watcher/订阅者信息。此外，对于初始 SUBSCRIBE 请求（创建新的订阅会话），该函数还会向 watcher/订阅者回送 NOTIFY（携带呈现信息）。


该函数可以接受以下参数：


- *force_active*（int，可选）- 可选参数，用于控制（presentity 的）默认策略是接受还是拒绝新订阅——当然，该参数仅在使用启用了隐私规则的呈现配置时才有意义（presence_xml 模块中的 force_active 参数未设置）。有些场景下，presentity（你订阅的一方）无法上传包含其隐私规则的 XCAP 文档（用于控制允许哪些 watcher 订阅它）。在这种情况下，可以在脚本层面通过以整型参数 "1" 调用 handle_subscribe() 函数，强制呈现服务器将当前订阅视为允许（Subscription-Status:active）。
- *sharing_tag*（string，可选）- 可选参数，在订阅数据在多台服务器之间共享的集群场景中指定（该订阅的）所有者标签——更多细节请参阅[呈现集群](#presence-clustering)章节。


```opensips
   Ex: 
	if($ru =~ "kphone@opensips.org")
		handle_subscribe(1);
		
```


该函数可在 REQUEST_ROUTE 中使用。


*返回码：*


- *1 - 成功*。
- *-1 - 出错*。


在所有情况下，模块都会发送适当的无状态应答。


```opensips title="handle_subscribe usage"
...
if($rm=="SUBSCRIBE")
    handle_subscribe();
...
```


### 导出的 MI 函数 {#exported-mi-functions}


#### refresh_watchers


如果 watcher 的授权或发布状态发生变化，则触发向 watcher 发送 Notify 消息。


名称：*refresh_watchers*


参数：


- presentity_uri：做出变更且其 watcher 应被告知的用户的 uri
- event：事件包
- refresh type：用于区分两种可触发刷新的不同事件类型：
	- watcher 认证的变化：refresh type= 0 ；
	- 发布状态的静态更新（通过直接更新数据库表，或在设置了 pidf_manipulation 参数时通过修改 pidf 操作文档）：refresh type!= 0。


MI FIFO 命令格式：


```bash
opensips-cli -x mi refresh_watchers sip:11@192.168.2.132 presence 1
```


#### cleanup


手动触发 watchers 表和 presentity 表的清理函数。如果将 `clean_period` 设置为零或更小值，该命令很有用。


名称：*cleanup*


参数：*无*


MI FIFO 命令格式：


```bash
opensips-cli -x mi cleanup
```


#### pres_phtable_list


列出所有 presentity 记录。


名称：*pres_phtable_list*


参数：*无*


MI FIFO 命令格式：


```bash
opensips-cli -x mi pres_phtable_list
```


#### subs_phtable_list


列出所有订阅记录，或 "To" 和 "From" URI 与给定参数匹配的订阅。


名称：*subs_phtable_list*


参数


- *from*（可选）- "From" URI 的通配符
- *to*（可选）- "To" URI 的通配符


MI FIFO 命令格式：


```bash
opensips-cli -x mi subs_phtable_list sip:222@domain2.com sip:user_1@example.com
```


#### pres_expose


在脚本中通过触发 *E_PRESENCE_EXPOSED* 事件，暴露某个特定事件中符合指定过滤条件的所有 presentity。


名称：*pres_expose*


参数：


- *event* - 所需的呈现事件。
- *filter*（可选）- 用于为该事件过滤 presentity 的正则表达式（REGEXP）。只有匹配的 presentity 会被暴露。如果未指定，则该事件的所有 presentity 都会被暴露。


MI FIFO 命令格式：


```bash
opensips-cli -x mi pres_expose presence ^sip:10\.0\.5\.[0-9]*
```


### 导出的事件 {#exported-events}


#### E_PRESENCE_PUBLISH


当 presence 模块收到 PUBLISH 消息时触发该事件。


参数：
- *user* - 用户的 AOR
- *domain* - 域
- *event* - 所发布事件的类型
- *expires* - 该发布的过期值
- *etag* - 实体标签
- *old_etag* - 待刷新的实体标签
- *body* - PUBLISH 请求的消息体


#### E_PRESENCE_EXPOSED


对于 *pres_expose* 暴露的每个 presentity，都会触发该事件。


参数：


与 *E_PRESENCE_PUBLISH* 事件相同。


### 安装 {#installation}


该模块需要 OpenSIPS 数据库中的 3 张表：presentity、active_watchers 和 watchers 表。用于创建这些表的 SQL 语法可在 opensips/scripts 文件夹下各数据库目录中的 presence-create.sql 脚本中找到。你也可以在项目网页上找到完整的数据库文档：[https://opensips.org/docs/db/db-schema-devel.html](https://opensips.org/docs/db/db-schema-devel.html)。


## 开发者指南 {#developer-guide}


模块提供以下函数，可供其他 OpenSIPS 模块使用。


### bind_presence(presence_api_t* api)


该函数绑定 presence 模块，并用导出的函数填充结构体，这些函数代表向 presence 模块添加事件的函数以及专用于订阅处理的函数。


```c title="presence_api_t structure"
...
typedef struct presence_api {
	add_event_t add_event;
	contains_event_t contains_event;
	search_event_t search_event;
	get_event_list_t get_event_list;
	
	update_watchers_t update_watchers_status;
	
	/* subs hash table handling functions */
	new_shtable_t new_shtable;
	destroy_shtable_t destroy_shtable;
	insert_shtable_t insert_shtable;
	search_shtable_t search_shtable;
	delete_shtable_t delete_shtable;
	update_shtable_t update_shtable;
	/* function to duplicate a subs structure*/
	mem_copy_subs_t  mem_copy_subs;
	/* function used for update in database*/
	update_db_subs_t update_db_subs;
	/* function to extract dialog information from a
	SUBSCRIBE message */
	extract_sdialog_info_t extract_sdialog_info;
	/* function to request sphere defition for a presentity */
	pres_get_sphere_t get_sphere;
	pres_contains_presence_t contains_presence;
}presence_api_t;
...
```


### add_event


字段类型：


```c
...
typedef int (*add_event_t)(pres_ev_t* event);
...
```


该函数接收一个包含事件特定信息的结构体作为参数，并将其添加到 presence 事件列表中。


作为参数接收的结构体：


```c
...
typedef struct pres_ev
{
	str name;
	event_t* evp;
	str content_type;
	int default_expires;
	int type;
	int etag_not_new;
	/*
	 *  0 - 标准机制（为每次 Publish 分配新的 etag）
	 *  1 - 只为初始 Publish 分配 etag
	*/
	int req_auth;
	get_rules_doc_t* get_rules_doc;
	apply_auth_t*  apply_auth_nbody;
	is_allowed_t*  get_auth_status;
	
	/* 如果事件允许多个已发布状态并需要
	 * 对信息进行聚合，则应注册 agg_body_t 函数；
	 * 否则该字段应为 NULL，构造 Notify 消息时
	 * 取最后一次发布的状态
	 */
	agg_nbody_t* agg_nbody;
	publ_handling_t  * evs_publ_handl;
	subs_handling_t  * evs_subs_handl;
	free_body_t* free_body;
	
	/* 有时模块需要为每个活动 watcher 修改消息体（例如在 XML 文档中
	 * 设置 "version" 参数）。如果模块注册了 aux_body_processing 回调，
	 * 则每个 watcher 都会调用它。它要么获得 PUBLISH 接收到的消息体，
	 * 要么获得 agg_nbody 函数生成的消息体。
	 * 模块可以决定是复制原始消息体再对其进行操作，还是直接在原始消息体上操作。
	 * 如果模块复制了原始消息体，还必须注册 aux_free_body() 以
	 * 释放这个"每 watcher"的消息体。
	 */
	aux_body_processing_t* aux_body_processing;
	free_body_t* aux_free_body;

	struct pres_ev* wipeer;			
	struct pres_ev* next;
	
}pres_ev_t;
...
```


### get_rules_doc


字段类型：


```c
...
typedef int (get_rules_doc_t)(str* user, str* domain, str** rules_doc);
...
			
```


该函数返回授权规则文档，用于获取订阅状态以及处理被通知的消息体。应将文档的引用放入 subs_t 结构的 auth_rules_doc 字段中，该结构作为参数传给下文描述的函数。


### get_auth_status


该字段是一个函数，针对订阅请求被调用，根据授权规则返回该订阅的状态。作为参数接收的 subs_t 结构中，auth_rules_doc 字段应包含 presentity 的规则文档（如果存在）。


仅当 req_auth 字段不为 0 时才会调用它。


字段类型：


```c
...
typedef int (is_allowed_t)(struct subscription* subs);
...
			
```


### apply_auth_nbody


该参数应是一个函数，针对需要授权的事件在构造最终消息体时被调用。授权文档取自作为参数传入的 subs_t 结构的 auth_rules_doc 字段。仅当 req_auth 字段不为 0 时才会调用它。


字段类型：


```c
...
typedef int (apply_auth_t)(str* , struct subscription*, str** );
...
			
```


### agg_nbody


如果存在，该字段表示事件需要对状态进行聚合。该函数接收消息体数组，并应返回最终消息体。如果不存在，则认为该事件不需要聚合，构造 Notify 时使用最近一次发布的信息。


字段类型：


```c
...
typedef str* (agg_nbody_t)(str* pres_user, str* pres_domain, 
str** body_array, int n, int off_index);
..
			
```


### free_body


如果在将数据库中的信息插入 Notify 消息体之前要对其进行后续处理（即 agg_nbody 或 apply_auth_nbody 字段已填写），则必须填写该字段。它应与处理消息体时使用的分配函数相匹配。


字段类型：


```c
...
typedef void(free_body_t)(char* body);
..
			
```


### aux_body_processing


如果模块需要为每个 watcher 操作 NOTIFY 消息体，则必须设置该字段。例如，XML 消息体中包含一个 'version' 参数，需要以"每 watcher"为单位为每个 NOTIFY 递增。模块可以为新消息体分配新的缓冲区并返回它（此时也必须设置 aux_free_body 函数），或者直接操作原始消息体并返回 NULL。


字段类型：


```c
...
typedef str* (aux_body_processing_t)(struct subscription *subs, str* body);
..
			
```


### aux_free_body


如果模块注册了 aux_body_processing 函数并为新的修改后消息体分配了内存，则必须设置该字段。此时该函数将用于释放 aux_body_processing 函数返回的指针。如果模块确实使用了 aux_body_processing，但没有分配新内存，而是直接操作原始消息体缓冲区，那么 aux_body_processing 必须返回 NULL，并且不应设置该字段。


字段类型：


```c
...
typedef void(free_body_t)(char* body);
..
			
```


### evs_publ_handl


处理 Publish 请求时会调用该函数。大多数情况下包含消息体正确性检查。


```c
...
typedef int (publ_handling_t)(struct sip_msg*);
..
			
```


### evs_subs_handl


它不是必需的。应包含针对订阅请求的事件特定处理。


字段类型：


```c
...
typedef int (subs_handling_t)(struct sip_msg*);
..
```


### contains_event


字段类型：


```c
..
typedef pres_ev_t* (*contains_event_t)(str* name,
event_t* parsed_event);
...
```


该函数解析作为参数接收的事件名称，并在列表中搜索结果。它返回找到的事件，如果未找到则返回 NULL。如果第二个参数是已分配的 event_t* 结构，则用解析结果填充它。


### get_event_list


字段类型：


```c
...
typedef int (*get_event_list_t) (str** ev_list);
...
```


该函数返回 presence 模块中已注册事件的字符串表示（用于 Allowed-Events 头域）。


### update_watchers_status


字段类型：


```c
...
typedef int (*update_watchers_t)(str pres_uri, pres_ev_t* ev,
str* rules_doc);
...
```


该函数是一个外部命令，可用于通告某个 presentity 授权规则的变更。它会更新已存储的状态，并向状态发生变化的 watcher 发送 Notify。（当通过 MI 命令通知 xcap 文档发生变更时，由 presence_xml 模块使用）。


### get_sphere


字段类型：


```c
...
typedef char* (*pres_get_sphere_t)(str* pres_uri);
...
```


如果已发布信息的类型为 RPID，该函数会在其中搜索 sphere 定义。如果未找到则返回 NULL。（返回值分配在私有内存中，应当释放）


### contains_presence


字段类型：


```c
...
typedef int (*pres_contains_presence_t)(str* pres_uri);
...
```


该函数查询某个呈现 uri 是否发布过任何呈现信息。如果找到记录则返回 1，否则返回 -1。
<!-- CONTRIBUTORS -->

### 许可证 {#license}

所有文档文件（即 .md 扩展名）均依据 Creative Common License 4.0 授权

