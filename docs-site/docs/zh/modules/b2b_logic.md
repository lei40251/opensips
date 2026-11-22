---
title: "b2b_logic 模块"
description: "本模块是 B2BUA 的逻辑引擎，负责利用底层提供的功能实际实现 B2BUA 服务。"
sidebar: false
---

## 管理员指南 {#admin-guide}


### 概述 {#overview}


OpenSIPS 中的 B2BUA 实现分为两层：


- 下层（在 b2b_entities 模块中实现）——UAS 与 UAC 的基本功能
- 上层（在 b2b_logic 模块中实现）——即 B2BUA 的逻辑引擎，负责利用底层提供的功能实际实现 B2BUA 服务。


本模块是 B2BUA 的上层实现，可与 b2b_entities 模块配合使用，以提供各类 B2BUA 服务（例如 PBX 功能）。B2BUA 场景的实际逻辑可在专门的脚本路由中实现。


可通过两种方式触发 B2B 会话：


- 从脚本触发——在收到初始 INVITE 消息时
- 通过外部（MI）命令触发——服务器将在一个会话中连接两个端点（第三方呼叫控制）。


B2B 会话的高可用性可通过启用下层的 *b2b_entities* 模块所提供的集群支持来实现（即在 *b2b_entities* 中设置 [cluster_id](/zh/modules/b2b_entities#cluster-id-int) 参数）。


### 场景逻辑 {#scenario-logic}


初始化 B2B 会话后，各通话腿将由 b2b_logic 模块处理，第一步是让两个初始实体建立联系。属于这些对话的请求与应答不会经由标准 OpenSIPS 路由进入脚本，而是在 b2b_logic 专用路由中处理（通过 [script_req_route](#script_req_route-str) 与 [script_reply_route](#script_reply_route-str) 参数定义，或使用作为参数传给 [b2b_init_request()](#b2b_init_requestid-flags-req_route-reply_route) 的自定义路由）。场景的后续步骤可在这些路由中实现，通过调用专门的 b2b_logic 脚本函数来执行各类动作。不应在 b2b_logic 路由中执行常规的「代理式」OpenSIPS 函数。


部分消息将由模块自动处理，完全不会进入 b2b_logic 路由（例如在两个实体桥接过程中收到的 BYE 请求，以及针对已断开实体的 ACK/BYE/应答）。此外，如果未定义专门的 b2b_logic 应答路由，应答将由模块内部处理，其效果等同于在存在该类路由时从中调用 [b2b_handle_reply()](#b2b_handle_replyflags)。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


- *b2b_entities、一个 db 模块*


#### 外部库或应用程序 {#external-libraries-or-applications}


使用本模块运行 OpenSIPS 之前不需要任何库或应用程序。


### 导出的参数 {#exported-parameters}


#### hash_size (int)


用于存储会话实体的哈希表大小。


*默认值为 "9"*
（512 条记录）。


```opensips title="Set server_hsize parameter"
...
modparam("b2b_logic", "hash_size", 10)
...
	
```


#### script_req_route (str) {#script_req_route-str}


当收到属于某个进行中 B2B 会话的请求时要调用的脚本路由名称。


```opensips title="Set script_req_route parameter"
...
modparam("b2b_logic", "script_req_route", "b2b_request")
...
	
```


#### script_reply_route (str) {#script_reply_route-str}


当收到属于某个进行中 B2B 会话的应答时要调用的脚本路由名称。


```opensips title="Set script_repl_route parameter"
...
modparam("b2b_logic", "script_reply_route", "b2b_reply")
...
	
```


#### cleanup_period (int)


搜索挂起的 b2b 上下文的时间间隔。如果会话的持续时长超过其定义的生存期，则该会话被视为过期。此时会向该上下文中的所有对话发送 BYE，并删除该上下文。


*默认值为 "100"。*


```opensips title="Set cleanup_period parameter"
...
modparam("b2b_logic", "cleanup_period", 60)
...
	
```


#### custom_headers_regexp (str)


按头域名称搜索 SIP 头域的正则表达式，这些头域应从一个侧的对话传递到另一侧。默认会传递若干头域，它们是：


- Max-Forwards（其值减 1）
- Content-Type
- Supported
- Allow
- Proxy-Require
- Session-Expires
- Min-SE
- Require
- RSeq


如果还希望传递其他头域，应通过设置本参数来定义它们。


其形式可以是 "regexp"、"/regexp/" 与 "/regexp/flags"。


各标志位的含义如下：


- *i* - 大小写不敏感的搜索。
- *e* - 使用扩展正则表达式。


*默认值为 "NULL"。*


```opensips title="Set parameter"
...
modparam("b2b_logic", "custom_headers_regexp", "/^x-/i")
...
	
```


#### custom_headers (str)


以 ';' 分隔的 SIP 头域名称列表，这些头域应从一个侧的对话传递到另一侧。默认会传递若干头域，它们是：


- Max-Forwards（其值减 1）
- Content-Type
- Supported
- Allow
- Proxy-Require
- Session-Expires
- Min-SE
- Require
- RSeq


如果还希望传递其他头域，应通过设置本参数来定义它们。


*默认值为 "NULL"。*


```opensips title="Set parameter"
...
modparam("b2b_logic", "custom_headers", "User-Agent;Date")
...
	
```


#### db_url (str)


数据库 URL。


```opensips title="Set db_url parameter"
...
modparam("b2b_logic", "db_url", "mysql://opensips:opensipsrw@127.0.0.1/opensips")
...
	
```


#### cachedb_url (str)


要使用的 NoSQL 数据库的 URL。目前仅支持 Redis。


```opensips title="Set cachedb_url parameter"
...
modparam("b2b_logic", "cachedb_url", "redis://localhost:6379/")
...
		
```


#### cachedb_key_prefix (string)


为 NoSQL 数据库中设置的每个键所使用的前缀。


*默认值为 "b2bl$"。*


```opensips title="Set cachedb_key_prefix parameter"
...
modparam("b2b_logic", "cachedb_key_prefix", "b2b")
...
	
```


#### update_period (int)


更新数据库中信息的时间间隔。


*默认值为 "100"。*


```opensips title="Set update_period parameter"
...
modparam("b2b_logic", "update_period", 60)
...
	
```


#### max_duration (int) {#max_duration-int}


呼叫的最大时长。


*默认值为 "12 * 3600（12 小时）"。*


如果将其设为 0，则没有限制。


```opensips title="Set max_duration parameter"
...
modparam("b2b_logic", "max_duration", 7200)
...
	
```


#### contact_user (int)


如果设为 1，则把 From: 头域中的用户添加到生成的 Contact 中：


*默认值为 "0"。*


```opensips title="Set contact_user parameter"
...
modparam("b2b_logic", "contact_user", 1)
...
	
```


#### b2bl_from_spec_param (string)


用于存储新 "From" 头域的伪变量名称。该 PV 必须在调用 "b2b_init_request" 之前设置。


*默认值为 "NULL"（禁用）。*


```opensips title="Set b2bl_from_spec_param parameter"
...
modparam("b2b_logic", "b2bl_from_spec_param", "$var(b2bl_from)")
...
route{
	...
	# 设置 From 头域
	$var(b2bl_from) = "\"Call ID\" <sip:user@opensips.org>";
	...
	b2b_init_request("top hiding");
	...
}
	
```


#### server_address (str)


将用作生成消息中 Contact 的本机 IP 地址。仅当 OpenSIPS 从中途发起呼叫时此项才是必需的。对于由收到的呼叫触发的场景，如果未设置，则会从接收初始请求的套接字动态构造。该套接字将用于发送属于该会话的所有请求与应答。本参数支持伪变量。


```opensips title="Set server_address parameter"
...
modparam("b2b_logic", "server_address", "sip:sa@10.10.10.10:5060")
...
	
```


```opensips title="Set server_address parameter using Pseudo-Variables"
...
modparam("b2b_logic", "server_address", "sip:$socket_in(advertised_ip):$socket_in(advertised_port)")
...
	
```


#### init_callid_hdr (str)


本模块提供了在生成的 INVITE 中通过某个头域插入原始 callid 的能力。如果需要此功能，请将本参数设置为要插入原始 callid 的头域名称。


```opensips title="Set init_callid_hdr parameter"
...
modparam("b2b_logic", "init_callid_hdr", "Init-CallID")
...
	
```


#### db_mode (int)


B2B 模块支持 3 种数据库存储方式


- NO DB STORAGE - 将该参数设为 0
- WRITE THROUGH（同步写入数据库）- 将该参数设为 1
- WRITE BACK（不时更新数据库）- 将该参数设为 2


*默认值为 "2"（WRITE BACK）。*


```opensips title="Set db_mode parameter"
...
modparam("b2b_logic", "db_mode", 1)
...
	
```


#### db_table (str)


要使用的数据库表名称


*默认值为 "b2b_logic"*


```opensips title="Set db_table parameter"
...
modparam("b2b_logic", "db_table", "some_table_name")
...
	
```


#### b2bl_th_init_timeout (int)


拓扑隐藏场景的呼叫建立超时。


*默认值为 "60"*


```opensips title="Set b2bl_th_init_timeout parameter"
...
modparam("b2b_logic", "b2bl_th_init_timeout", 60)
...
	
```


#### b2bl_early_update (int)


允许通过发出 "UPDATE" 请求在早期阶段桥接呼叫


- 0 - 不在早期阶段桥接对话
- 1 - 尝试通过发送 UPDATE 在早期阶段更新会话


*默认值为 "0"，即不在早期阶段桥接对话*


```opensips title="Set b2bl_early_update parameter"
...
modparam("b2b_logic", "b2bl_early_update", 1)
...
	
```


#### old_entity_term_delay (int)


当 *b2b_bridge_request* 配合 *late_bye* 标志位使用时，本参数可延迟向被终止实体发送 BYE 的时刻。这样，BYE 不会在新实体建立时立即发出，而是延迟本参数所设定的秒数。


*默认值为 "0"——立即发送 BYE*


```opensips title="Set old_entity_term_delay parameter"
...
modparam("b2b_logic", "old_entity_term_delay", 2) # 将 BYE 延迟 2 秒
...
	
```


### 导出的函数 {#exported-functions}


#### b2b_init_request(id, [flags], [req_route], [reply_route]) {#b2b_init_requestid-flags-req_route-reply_route}


本函数基于初始 INVITE 初始化一个新的 B2B 会话。在运行本函数之前，必须分别使用 [b2b_server_new()](#b2b_server_newid-adv_contact-extra_hdrs-extra_hdr_bodies) 与 [b2b_client_new()](#b2b_client_newid-dest_uri-proxy-from_dname-adv_contact-extra_hdrs-extra_hdr_bodies) 创建一个新的服务器实体和一个新的客户端实体。这些就是将建立联系的初始实体，后续场景逻辑可在 b2b_logic 专用路由中实现。


参数：


- *scenario_id (string)* - 本 B2B 会话场景的标识符。特殊值 *top hiding* 会初始化一个内部拓扑隐藏场景。该场景在两侧之间简单地透传消息，无需额外的脚本或专用路由。
- *flags (string, optional)* - 以下标志位的 CSV 列表：
   - *setup-timeout=[nn]* - 呼叫建立超时。设为 0 表示将超时设为 max_duration 的值。示例："setup-timeout=300"。
   - *transparent-auth* - 透明鉴权。在此模式下，b2b 会把 401 或 407 鉴权请求透传给目标服务器。
   - *preserve-to* - 保留 To: 头域。
- *req_route (string, optional)* - 当收到属于本 B2B 会话的请求时要调用的脚本路由名称。本参数将针对该特定 B2B 会话覆盖全局的 [script_req_route](#script_req_route-str) 参数。
- *reply_route (string, optional)* - 当收到属于本 B2B 会话的应答时要调用的脚本路由名称。本参数将针对该特定 B2B 会话覆盖全局的 [script_reply_route](#script_reply_route-str) 参数。


本函数可在 REQUEST_ROUTE 中使用。


> [!NOTE]
> 如果采用多接口部署并希望更改出站接口，必须在将控制权交给 b2b 函数之前使用 "force_send_socket()" 核心函数。否则请求可能被正确路由，但 SIP 报文可能无效（如 Contact、Via 等）。


```opensips title="b2b_init_request usage"
...
if(is_method("INVITE") && !has_totag() && prepaid_user()) {
   ...
   # 创建初始实体
   b2b_server_new("server1");
   b2b_client_new("client1", $var(media_uri));

   # 初始化 B2B 会话
   b2b_init_request("prepaid");
   exit;
}
...
	
```


#### b2b_server_new(id, [adv_contact], [extra_hdrs], [extra_hdr_bodies]) {#b2b_server_newid-adv_contact-extra_hdrs-extra_hdr_bodies}


本函数创建一个新的服务器实体（即 OpenSIPS 作为 UAS 的对话），用于初始化新的 B2B 会话。它只能用于初始 INVITE，且须在调用 [b2b_init_request()](#b2b_init_requestid-flags-req_route-reply_route) 之前使用。


参数：


- *id (string)* - 用于在后续 B2B 动作中引用该实体的 ID。
- *adv_contact (string, optional)* - 在生成的消息中通告的 Contact 头域。
- *extra_hdrs (var, optional)* - 一个 AVP 变量，保存额外的头域列表（头域名称），这些头域将被添加到发送给该实体的任何请求中。
- *extra_hdr_bodies (var, optional)* - 一个 AVP 变量，保存额外头域体列表（与 *extra_hdrs* 参数中给出的头域相对应），这些内容将被添加到发送给该实体的任何请求中。


本函数可在 REQUEST_ROUTE 中使用。


```opensips title="b2b_server_new usage"
...
if(is_method("INVITE") && !has_totag()) {
   b2b_server_new("server1", $avp(b2b_hdrs), $avp(b2b_hdr_bodies));
   ...
}
...
		
```


#### b2b_client_new(id, dest_uri, [proxy], [from_dname], [adv_contact], [extra_hdrs], [extra_hdr_bodies]) {#b2b_client_newid-dest_uri-proxy-from_dname-adv_contact-extra_hdrs-extra_hdr_bodies}


本函数创建一个新的客户端实体（即 OpenSIPS 作为 UAC 的对话），用于初始化新的 B2B 会话或执行桥接动作。本函数可在调用 [b2b_init_request()](#b2b_init_requestid-flags-req_route-reply_route) 或 [b2b_bridge()](#b2b_bridgeentity1-entity2-provmedia_uri-flags) 之前使用。


参数：


- *id (string)* - 用于在后续 B2B 动作中引用该实体的 ID。
- *dest_uri (string)* - 新目标的 URI。
- *proxy (string, optional)* - 用于发送 INVITE 的出站代理 URI。
- *from_dname (string, optional)* - 在 From 头域中使用的显示名。
- *adv_contact (string, optional)* - 在生成的消息中通告的 Contact 头域。
- *extra_hdrs (var, optional)* - 一个 AVP 变量，保存额外的头域列表（头域名称），这些头域将被添加到发送给该实体的任何请求中。
- *extra_hdr_bodies (var, optional)* - 一个 AVP 变量，保存额外头域体列表（与 *extra_hdrs* 参数中给出的头域相对应），这些内容将被添加到发送给该实体的任何请求中。


本函数可在 REQUEST_ROUTE 以及 b2b_logic 请求路由中使用。


```opensips title="b2b_client_new usage"
...
b2b_client_new("client1", "sip:alice@opensips.org");
...
		
```


#### b2b_bridge(entity1, entity2, [provmedia_uri], [flags]) {#b2b_bridgeentity1-entity2-provmedia_uri-flags}


本函数在现有 B2B 会话的上下文中桥接两个实体（初始实体已经建立联系）。两个实体中至少有一个必须是新的客户端实体。


参数：


- *entity1 (string)* - 要桥接的第一个实体的 ID；特殊值 *peer* 与 *this* 也可用于引用现有实体。
- *entity2 (string)* - 要桥接的第二个实体的 ID；特殊值 *peer* 与 *this* 也可用于引用现有实体。
- *provmedia_uri (string, optional)* - 在被叫应答期间与主叫连接的临时媒体服务器 URI。
- *flags (string, optional)* - 以下标志位的 CSV 列表：
   - *max_duration=[nn]* - B2B 会话的最大时长。如果生存期到期，B2BUA 将向两端发送 BYE 消息并删除相应记录。此按桥接设定的值优先于全局的 [max_duration](#max_duration-int) 模块参数。示例："max_duration=300"。
   - *notify* - 启用 RFC3515 NOTIFY，以把引用的状态通知给发送 REFER 的代理。
   - *rollback-failed* - 在转移失败的情况下把呼叫回滚到桥接之前的状态，而不挂断呼叫（默认行为）。
   - *hold* - 在把旧实体桥接到新实体之前，先将旧实体置于保持状态。
   - *no-late-sdp* - 不尝试与新实体进行延迟 SDP 协商。桥接时先使用从旧实体收到的初始 SDP 联系新实体。新实体应答后，向旧实体发送一个不带消息体的 reINVITE。使用在旧实体的这个新应答中收到的当前 SDP 来触发与新实体的重新协商。


本函数可在 b2b_logic 请求路由中使用。


```opensips title="b2b_bridge usage"
...
route[b2b_logic_request] {
   ...
   b2b_client_new("client2", $hdr(Refer-To));

   b2b_bridge("peer", "client2");
}
...
		
```


#### b2b_bridge_retry(new_entity)


本函数可用于通过联系新目标来重试失败的桥接动作。在运行本函数之前，必须使用 [b2b_client_new()](#b2b_client_newid-dest_uri-proxy-from_dname-adv_contact-extra_hdrs-extra_hdr_bodies) 创建一个新的客户端实体。


参数：


- *entity1 (string)* - 要桥接的新实体的 ID。


本函数可在 b2b_logic 应答路由中使用。


```opensips title="b2b_bridge usage"
...
route[b2b_logic_reply] {
   ...
   if ($b2b_logic.entity(id) == "client1" && $rm == "INVITE" && $rs >= 300) {
      b2b_client_new("client_retry", "sip:alice@opensips.org");

      b2b_bridge_retry("client_retry");
   } else {
      b2b_handle_reply();
   }
   ...
}
...
		
```


#### b2b_pass_request()


本函数把属于现有 B2B 会话的请求传递给对端实体。除非为实现场景逻辑需要执行其他动作（例如桥接动作），否则应针对所有请求调用本函数。


本函数可在 b2b_logic 请求路由中使用。


```opensips title="b2b_pass_request usage"
...
route[b2b_logic_request] {
   if ($rm != "BYE") {
      b2b_pass_request();
      exit;
   } else {
      # 删除当前实体并将对端桥接到新实体
   }
...
		
```


#### b2b_handle_reply([flags]) {#b2b_handle_replyflags}


本函数处理收到的应答，针对进行中 B2B 会话的当前状态采取相应动作（把应答传递给对端、发送 INVITE 或 ACK 以完成正在进行的桥接动作等）。如果定义了 b2b_logic 应答路由，则应针对所有应答调用本函数。


本函数可在 b2b_logic 应答路由中使用。


参数：


- *flags (string, optional)* - 以逗号分隔的标志位列表，用于改变应答处理的行为。支持的取值有：
   - *pass-3xx-contact* - 当收到重定向应答（3xx）消息时，把联系人原样传递给另一对端，不作任何修改。


```opensips title="b2b_handle_reply usage"
...
route[b2b_logic_reply] {
    xlog("B2B REPLY: [$rs $rm] from entity: $b2b_logic.entity(id)\n");
    b2b_handle_reply();
}
...
		
```


#### b2b_send_reply(code, reason[, headers[, body]])


本函数向发送当前请求的实体发送一个应答。


参数：


- *code (int)* - 应答码
- *reason (string)* - 应答原因短语
- *headers (string, optional)* - 附加头域
- *body (string, optional)* - 消息体


本函数可在 b2b_logic 请求路由中使用。


```opensips title="b2b_send_reply usage"
...
route[b2b_logic_request] {
   if ($rm == "REFER") {
      b2b_send_reply(202, "Accepted");
      ...
   }
}
...
		
```


#### b2b_delete_entity() {#b2b_delete_entity}


本函数删除发送当前请求的实体。


本函数可在 b2b_logic 请求路由中使用。


```opensips title="b2b_delete_entity usage"
...
route[b2b_logic_request] {
   if ($rm == "BYE") {
      b2b_send_reply(200, "OK");
      b2b_delete_entity();
      ...
   }
}
...
		
```


#### b2b_end_dlg_leg()


本函数向发送当前请求的实体发送一个 BYE 请求。无需再调用 [b2b_delete_entity()](#b2b_delete_entity) 来删除当前实体。


本函数可在 b2b_logic 请求路由或应答路由中使用。


```opensips title="b2b_end_dlg_leg usage"
...
route[b2b_logic_request] {
   if ($rm == "REFER") {
      b2b_send_reply(202, "Accepted");
      b2b_end_dlg_leg();
   }
}
...
		
```


#### b2b_bridge_request(b2bl_key,entity_no, [adv_contact], [flags])


本函数会把一个初始 INVITE 与现有 b2b 会话中的某个参与者桥接起来。


参数：


- *b2bl_key (string)* - 一个包含 b2b_logic 键的字符串。该键也可以采用 *callid;from-tag;to-tag* 的形式。
- *entity_no (int)* - 一个整数，表示要桥接的实体/参与者的编号。
- *adv_contact (string, optional)* - 在生成的消息中通告的 Contact 头域。
- *flags (string, optional)* - 可改变本函数行为的标志位。可用标志位有：
   - *late_bye* - 不在停止时立即终止被替换的实体，而是让它保持挂起，直到新实体完全建立。


```opensips title="b2b_bridge_request usage"
...
if ($rU == "pickup") {
    # 获取该用户被保持呼叫的 b2b_logic 键
    cache_fetch("local", "$fU", $var(b2bl_key));
    cache_remove("local", "$fU");

    if ($var(b2bl_key) != NULL)
        b2b_bridge_request($var(b2bl_key), 0);
    else
        send_reply(481, "Call/Transaction Does Not Exist");

    exit;
}
...
		
```


#### b2b_trigger_scenario(scenario, [params], peer1, [extra_headers_peer1], [extra_headers_contents_peer1], peer2 [extra_headers_peer2], [extra_headers_contents_peer2])


本函数从路由脚本触发某个特定场景，例如对话外的 REFER。


参数：


- *scenario (string)* - 要触发的场景名称。
- *params (string, optional)* - 该场景中要使用的参数（可选，以 CSV 形式给出）

  - *n* - 启用 RFC3515 NOTIFY，以把引用的状态通知给发送 REFER 的代理。
  - *session key (string, optional)* - 内部会话键，如果 NOTIFY 应在此 B2B-UA 上的另一个会话中发送（例如用于接收对话外的 REFER 时很有用）
  - *party of remote session (int, optional)* - 如果 NOTIFY 应发送到另一个会话，指明由会话的哪一侧接收该 NOTIFY（0 = 会话的 A 方，1 = 会话的 B 方）
- *peer1 (string)* - 用于定义所触发场景 A 方的参数

  - *entitiy_name (string)* - 实体名称
  - *RURI (string)* - 要联系的实体的 R-URI
  - *Proxy (string, optional)* - 该实体要使用的出站代理
  - *Display-Name (string, optional)* - 该实体要使用的显示名
- *extra_headers_peer1 (var, optional)* - 一个 AVP 变量，保存额外的头域列表（头域名称），这些头域将被添加到为第一个实体发送的任何请求中。
- *extra_headers_contents_peer1 (var, optional)* - 一个 AVP 变量，保存额外头域体列表（与 *extra_headers_peer1* 参数中给出的头域相对应），这些内容将被添加到为第一个实体发送的任何请求中。
- *peer2 (string)* - 用于定义所触发场景 B 方的参数。格式与 *peer1* 的定义完全相同。
- *extra_headers_peer2 (var, optional)* - 一个 AVP 变量，保存额外的头域列表（头域名称），这些头域将被添加到为第二个实体发送的任何请求中。
- *extra_headers_contents_peer2 (var, optional)* - 一个 AVP 变量，保存额外头域体列表（与 *extra_headers_peer2* 参数中给出的头域相对应），这些内容将被添加到为第二个实体发送的任何请求中。


本函数可在 REQUEST_ROUTE 中使用。


```opensips title="b2b_trigger_scenario usage"
...
if(is_method("REFER") && !has_totag()) {
   $avp(header) = "Replaces";
   $avp(header_content) = "call-id=xyz";
   b2b_trigger_scenario("refer", "n", "conf,sip:conference@10.0.0.1", $avp(header), $avp(header_content), "callee,sip:user@10.0.0.1,sip:10.0.0.1");
   ...
}
...
		
```


### 导出的 MI 函数 {#exported-mi-functions}


#### b2b_trigger_scenario


本命令初始化一个新的 B2B 会话，其中 OpenSIPS 将从中途发起呼叫。要建立联系的初始实体通过命令参数指定，后续场景逻辑可在 b2b_logic 专用路由中实现。


名称：*b2b_trigger_scenario*


参数：


- *senario_id*：本 B2B 会话场景的 ID。
- *entity1* - 要联系的第一个实体；格式如下：*id,dest_uri[,from_dname]*，其中：

  - *id* - 用于在后续 B2B 动作中引用该实体的 ID
  - *dest_uri* - 新目标的 URI
  - *from_dname（可选）* - 在 From 头域中使用的显示名
- *entity2* - 要联系的第二个实体；格式与 *entity1* 相同
- *context (array, optional)* - B2B 上下文值的数组，格式为：*key=value*


MI FIFO 命令格式：


```bash
	opensips-cli -x mi b2b_trigger_scenario marketing client1,sip:bob@opensips.org client2,sip:322@opensips.org:5070 agent_uri=sip:alice@opensips.org
		
```


#### b2b_bridge


外部应用程序可用本命令告知 B2BUA 把进行中对话的某一方桥接到另一目标。默认情况下主叫被桥接到新 URI，并向被叫发送 BYE。如果在第三个参数中传入 1，则可以改为桥接被叫。


名称：*b2b_bridge*


参数：


- *dialog_id*：*b2b_logic 键*，或进行中对话的 *callid;from-tag;to-tag*。
- *new_uri* - 新目标的 URI
- *flag*（可选）- 用于指明必须把被叫桥接到新目标。若未提供，则桥接主叫。可能的取值为 '0' 或 '1'。
- *prov_media_uri*（可选）- 一个媒体服务器的 URI，该服务器能够从桥接场景开始到结束播放临时媒体。此项可选。若未提供，则桥接场景中不会涉及其他实体


MI FIFO 命令格式：


```bash
	opensips-cli -x mi b2b_bridge 1020.30 sip:alice@opensips.org
	
```


opensips-cli 命令格式：


```bash
	opensips-cli -x mi b2b_bridge 1020.30 sip:alice@opensips.org
	
```


#### b2b_list


本命令可用于列出 b2b_logic 实体的内部信息。


名称：*b2b_list*


参数：*none*


MI FIFO 命令格式：


```bash
	opensips-cli -x mi b2b_list
	
```


#### b2b_terminate_call


终止进行中的 B2B 会话。


名称：*b2b_terminate_call*


参数：


- *key*：*b2b_logic 键*，或进行中会话某一通话腿的 *callid;from-tag;to-tag*。


MI FIFO 命令格式：


```bash
	opensips-cli -x mi b2b_terminate_call 159.0
	
```


### 导出的伪变量 {#exported-pseudo-variables}


#### $b2b_logic.key


这是一个只读变量，返回进行中 B2B 会话的 b2b_logic 键。


该变量可用于请求路由、local_route，以及通过 *b2b_entities* 与 *b2b_logic* 模块定义的专用路由。


```opensips title="$b2b_logic.key usage"
...
local_route {
   ...
   if ($b2b_logic.key) {
      xlog("request belongs to B2B session: $b2b_logic.key\n");
      ...
   }
   ...
}
...
	
```


#### $b2b_logic.entity(field)[idx]


这是一个只读变量，返回进行中 B2B 会话所涉及的实体（对话）的信息。


可用的实体信息有：


- 对话的 Call-ID，通过 *callid* 子名访问；
- 实体键，通过 *key* 子名访问，或完全不使用子名。
- 实体 ID，通过 *id* 子名访问。
- 对话的 From-Tag，通过 *fromtag* 子名访问。
- 对话的 To-Tag，通过 *totag* 子名访问。


索引用于选择要引用的 B2B 会话中的实体。可能的取值只有 *0* 或 *1*，分别对应场景中实体的位置。最初这取决于实体创建的先后顺序。在内部拓扑隐藏场景中，*0* 是主叫、*1* 是被叫。当发生进一步的桥接动作时，被桥接的实体总是放在 *0* 索引上，新实体放在 *1* 上。


如果未提供索引，该变量将指向当前 SIP 消息所属的实体（对话）。


该变量可用于请求路由、local_route，以及通过 *b2b_entities* 与 *b2b_logic* 模块定义的专用路由。


```opensips title="$b2b_logic.entity usage"
...
modparam("b2b_entities", "script_request_route", "b2b_request")
...
route[b2b_request] {
   ...
   xlog("received request for entity: $b2b_logic.entity\n");
   ...
   if ($rm == "BYE" && $b2b_logic.entity == $(b2b_logic.entity[1]))
      xlog("Disconnecting callee\n")
   ...
}
...
	
```


#### $b2b_logic.ctx(key)


这是一个可读写变量，用于在进行中 B2B 会话的上下文中访问自定义的键值存储（值为字符串）。


该变量可用于请求路由、local_route，以及通过 *b2b_entities* 与 *b2b_logic* 模块定义的专用路由。在主请求路由中，该变量甚至可以在用 *b2b_init_request()* 实例化场景之前用于存储新的上下文值。


把该变量设为 *NULL* 将删除给定键处的值。


```opensips title="$b2b_logic.ctx usage"
...
modparam("b2b_entities", "script_reply_route", "b2b_reply")
...
route {
   ...
   b2b_init_request("prepaid", "sip:alice@127.0.0.1");

   $b2b_logic.ctx(my_extra_info) = "my_value";
   ...
}
...
route[b2b_reply] {
   ...
   xlog("my info: $b2b_logic.ctx(my_extra_info)\n");
   ...
}
...
	
```


#### $b2b_logic.scenario(key)


这是一个只读变量，返回进行中 B2B 会话的场景 ID


该变量可用于请求路由、local_route，以及通过 *b2b_entities* 与 *b2b_logic* 模块定义的专用路由。


```opensips title="$b2b_logic.scenario usage"
...
route[b2b_logic_request] {
   if ($b2b_logic.scenario == "prepaid") {
      route(prepaid);
   } else {
      route(marketing);
   }
}
...
	
```


## 开发者指南 {#developer-guide}


本模块提供了一个可供其他 OpenSIPS 模块使用的 API。该 API 提供的函数用于从其他模块实例化 b2b 场景（这是对另外两种实例化 b2b 场景方式的补充——从脚本实例化和通过 MI 命令实例化）。此外，实例化过程还可被动态控制，例如命令把呼叫中涉及的某个实体桥接到另一实体，或终止该呼叫，甚至桥接两个现有呼叫。


### b2b_logic_bind(b2bl_api_t* api)


本函数绑定 b2b_entities 模块，并填充该结构体中导出的函数，这些函数将在后文详细描述。


```c title="b2bl_api_t structure"
...
typedef struct b2bl_api
{
	b2bl_init_f init;
	b2bl_bridge_f bridge;
	b2bl_bridge_extern_f bridge_extern;
	b2bl_bridge_2calls_t bridge_2calls;
	b2bl_terminate_call_t terminate_call;
	b2bl_set_state_f set_state;
	b2bl_bridge_msg_t bridge_msg;
}b2bl_api_t;
...
```


### init


字段类型：


```opensips
...
typedef str* (*b2bl_init_f)(struct sip_msg* msg, str* name, str* args[5],
		b2bl_cback_f, void* param);
...
```


初始化一个 b2b 场景。最后两个参数是回调函数和参数，它们将在下文列出的 3 种情形下被调用。回调函数的定义如下：


```c
...
typedef int (*b2b_notify_t)(struct sip_msg* msg, str* id, int type, void* param);
...
```


第一个参数是 init 函数中给出的回调。


第二个参数是一个结构体，包含有关该呼叫的一些统计信息——开始时间、建立时间、通话时间。


第三个参数是场景实例化的当前状态。


最后一个参数是触发回调的事件。回调会在 3 种事件下被调用：


- *当从任一侧收到 BYE 时——事件参数还会表明 BYE 是从哪一侧收到的，因此可能是 B2B_BYE_E1 或 B2B_BYE_E2*
- *如果在桥接过程中从第二个实体收到否定应答——事件为 B2B_REJECT_E2。*
- *当 b2b_logic 实体被删除时——事件为 B2B_DESTROY*


返回码控制着引发该事件的请求/应答将如何处理（最后一个事件除外，此时返回码无关紧要）


- *-1 - 错误*
- *0 - 丢弃 BYE 或应答*
- *1 - 在另一侧发送 BYE 或应答*
- *2 - 按场景的规定执行，如果未定义规则，则在另一侧发送 BYE 或应答*


### bridge


字段类型：


```c
...
typedef int (*b2bl_bridge_f)(str* key, str* new_uri, str* new_from_dname,int entity_type);
...
```


本函数允许把由 b2b_logic 处理的呼叫中的某个实体桥接到另一实体。


### bridge_extern


字段类型：


```c
...
typedef str* (*b2bl_bridge_extern_f)(str* scenario_name, str* args[5],
                b2bl_cback_f cbf, void* cb_param);
...
```


本函数允许发起一个外部场景，即由 B2BUA 从中途发起呼叫。


### bridge_2calls


字段类型：


```c
...
typedef int (*b2bl_bridge_2calls_t)(str* key1, str* key2);
...
```


使用本函数可以桥接两个现有呼叫。两个呼叫中的第一个实体将被连接起来，并向它们的对端发送 BYE。


### terminate_call


字段类型：


```c
...
typedef int (*b2bl_terminate_call_t)(str* key);
...
```


终止一个呼叫。


### set_state


字段类型：


```c
...
typedef int (*b2bl_set_state_f)(str* key, int state);
...
```


设置场景状态。


### bridge_msg


字段类型：


```c
...
typedef int (*b2bl_bridge_msg_t)(struct sip_msg* msg, str* key, int entity_no);
...
```


本函数允许把呼入呼叫桥接到现有呼叫中的某个实体。


第一个参数是当前呼入呼叫的 INVITE 消息。


第二个参数是现有呼叫的 b2bl_key。


第三个参数是实体标识符。
<!-- CONTRIBUTORS -->

### 许可 {#license}

所有文档文件（即扩展名为 .md 的文件）均按 Creative Common License 4.0 许可发布。
