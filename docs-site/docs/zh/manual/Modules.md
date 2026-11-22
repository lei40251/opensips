---
title: "模块"
description: ""
---

## SIP 相关模块 {#sip-related-modules}

### SIP 信令模块 {#sip-signaling-modules}
* [**B2B_ENTITIES**](/zh/modules/b2b_entities) - 背靠背用户代理实体，🟢 **稳定**
* [**B2B_LOGIC**](/zh/modules/b2b_logic) - 背靠背用户代理逻辑，🟢 **稳定**
* [**CALL CENTER**](/zh/modules/call_center) - 呼入呼叫中心系统，🟢 **稳定**
* [**DIALOG**](/zh/modules/dialog) - 对话支持模块，🟢 **稳定**
* [**NAT_TRAVERSAL**](/zh/modules/nat_traversal) - NAT 穿透模块，🟢 **稳定**
* [**NATHELPER**](/zh/modules/nathelper) - NAT 穿透辅助模块，🟢 **稳定**
* [**OPTIONS**](/zh/modules/options) - OPTIONS 服务器应答模块，🟢 **稳定**
* [**REGISTRAR**](/zh/modules/registrar) - SIP 注册服务器实现模块，🟢 **稳定**
* [**SIGNALING**](/zh/modules/signaling) - SIP 信令模块，🟢 **稳定**
* [**UAC_REGISTRANT**](/zh/modules/uac_registrant) - SIP 注册者实现模块，🟢 **稳定**
* [**TM**](/zh/modules/tm) - 事务（有状态）模块，🟢 **稳定**
* [**SL**](/zh/modules/sl) - 无状态应答模块，🟢 **稳定**
* [**MEDIA_EXCHANGE**](/zh/modules/media_exchange) - 在不同 SIP 呼叫之间交换 SDP 消息体的模块，🟢 **稳定**
* [**CALLOPS**](/zh/modules/callops) - 在正在进行的 SIP 呼叫上触发不同呼叫操作的模块，🟢 **稳定**
* [**B2B_SDP_DEMUX**](/zh/modules/b2b_sdp_demux) - 对包含多路媒体流的呼叫进行解复用的模块，🟢 **稳定**
* [**MSRP_UA**](/zh/modules/msrp_ua) - MSRP 用户代理模块，🟢 **稳定**

### SIP 路由模块 {#sip-routing-modules}
* [**CARRIERROUTE**](/zh/modules/carrierroute) - 适用于运营商的路由扩展，🟢 **稳定**
* [**CPL_C**](/zh/modules/cpl_c) - CPL 解释器模块，🟢 **稳定**
* [**DISPATCHER**](/zh/modules/dispatcher) - 调度器模块，🟢 **稳定**
* [**DROUTING**](/zh/modules/drouting) - 动态路由 / LCR，🟢 **稳定**
* [**QROUTING**](/zh/modules/qrouting) - 基于质量的路由，🟢 **稳定**
* [**EMERGENCY**](/zh/modules/emergency) - 紧急呼叫模块，🟢 **稳定**
* [**ENUM**](/zh/modules/enum) - ENUM 查询模块，🟢 **稳定**
* [**JABBER**](/zh/modules/jabber) - JABBER IM 与 PRESENCE 互联模块，beta
* [**IMC**](/zh/modules/imc) - 即时消息会议模块，🟢 **稳定**
* [**LOAD_BALANCER**](/zh/modules/load_balancer) - 负载均衡器（用于呼叫）模块，🟢 **稳定**
* [**MID_REGISTRAR**](/zh/modules/mid_registrar) - 带流量限流的 SIP 注册前端，🟢 **稳定**
* [**MSILO**](/zh/modules/msilo) - SIP 消息暂存模块，🟢 **稳定**
* [**MSRP_GATEWAY**](/zh/modules/msrp_gateway) - SIP MESSAGE / MSRP 网关模块，🟢 **稳定**
* [**RR**](/zh/modules/rr) - Record-Route 与 Route 模块，🟢 **稳定**
* [**SCRIPT_HELPER**](/zh/modules/script_helper) - 内嵌的 SIP 路由逻辑与对话管理，🟢 **稳定**
* [**OSP**](/zh/modules/osp) - OSP 对等互联模块，🟢 **稳定**

### SIP 消息操作 {#sip-message-operations}
* [**COMPRESSION**](/zh/modules/compression) - 消息压缩与精简，🟢 **稳定**
* [**DIVERSION**](/zh/modules/diversion) - Diversion 头域插入模块，🟢 **稳定**
* [**IDENTITY**](/zh/modules/identity) - SIP Identity 实现，🟢 **稳定**
* [**MAXFWD**](/zh/modules/maxfwd) - Max-Forwards 处理模块，🟢 **稳定**
* [**MANGLER**](/zh/modules/mangler) - SIP 报文改写模块，🟢 **稳定**
* [**PATH**](/zh/modules/path) - 为 SIP 前端接入提供 Path 支持，🟢 **稳定**
* [**SIP_I**](/zh/modules/sip_i) - ISUP 操作模块，🟢 **稳定**
* [**SIPMSGOPS**](/zh/modules/sipmsgops) - SIP 操作模块，🟢 **稳定**
* [**STIR_SHAKEN**](/zh/modules/stir_shaken) - STIR/SHAKEN 支持，🟢 **稳定**
* [**TOPOLOGY_HIDING**](/zh/modules/topology_hiding) - 提供拓扑隐藏能力，🟢 **稳定**
* [**UAC**](/zh/modules/uac) - UAC 功能（From 头域改写与 UAC 鉴权），🟢 **稳定**
* [**UAC_AUTH**](/zh/modules/uac_auth) - UAC 鉴权功能，🟢 **稳定**
* [**UAC_REDIRECT**](/zh/modules/uac_redirect) - UAC 重定向功能，🟢 **稳定**
* [**SST**](/zh/modules/sst) - SIP 会话定时器支持，🟢 **稳定**

### SIP 呈现模块 {#sip-presence-modules}
* [**PRESENCE**](/zh/modules/presence) - 呈现服务器模块 - 通用 API，🟢 **稳定**
* [**PRESENCE_CALLINFO**](/zh/modules/presence_callinfo) - 呈现服务器针对 Call-Info 的扩展，🟢 **稳定**
* [**PRESENCE_DIALOGINFO**](/zh/modules/presence_dialoginfo) - 呈现服务器针对对话信息（Dialog Info）的扩展，🟢 **稳定**
* [**PRESENCE_DFKS**](/zh/modules/presence_dfks) - 呈现服务器针对设备功能键同步的扩展，🟢 **稳定**
* [**PRESENCE_MWI**](/zh/modules/presence_mwi) - 呈现服务器针对消息等待指示（MWI）的扩展，🟢 **稳定**
* [**PRESENCE_REGINFO**](/zh/modules/presence_reginfo) - 呈现服务器针对符合 RFC 3680 的 "reg" 事件的扩展，🟢 **稳定**
* [**PRESENCE_XCAPDIFF**](/zh/modules/presence_xcapdiff) - 呈现服务器针对 XCAP-DIFF 事件的扩展，🟢 **稳定**
* [**PRESENCE_XML**](/zh/modules/presence_xml) - 呈现服务器模块 - 呈现与观察者信息以及 XCAP，🟢 **稳定**
* [**PUA**](/zh/modules/pua) - 呈现用户代理客户端的通用 API，🟢 **稳定**
* [**PUA_BLA**](/zh/modules/pua_bla) - PUA 的 BLA 扩展，🟢 **稳定**
* [**PUA_DIALOGINFO**](/zh/modules/pua_dialoginfo) - PUA 的 Dialog-Info 扩展，🟢 **稳定**
* [**PUA_MI**](/zh/modules/pua_mi) - PUA 的 MI 扩展，🟢 **稳定**
* [**PUA_REGINFO**](/zh/modules/pua_reginfo) - 符合 RFC 3680 的 "reg" 事件发布者，🟢 **稳定**
* [**PUA_USRLOC**](/zh/modules/pua_usrloc) - PUA 的 USRLOC 扩展，🟢 **稳定**
* [**PUA_XMPP**](/zh/modules/pua_xmpp) - PUA 的 XMPP 扩展（SIMPLE-XMPP 呈现网关），🟢 **稳定**
* [**B2B_SCA**](/zh/modules/b2b_sca) - 背靠背共享呼叫外观，🟢 **稳定**
* [**RLS**](/zh/modules/rls) - 资源列表服务器实现，🟢 **稳定**
* [**XCAP**](/zh/modules/xcap) - XCAP API 提供者，🟢 **稳定**
* [**XCAP_CLIENT**](/zh/modules/xcap_client) - XCAP 客户端实现，🟢 **稳定**

---

## 脚本模块 {#scripting-modules}

### 脚本辅助模块 {#script-helper-modules}
* [**JSON**](/zh/modules/json) - 在 OpenSIPS 脚本中操作 JSON 对象，🟢 **稳定**
* [**XML**](/zh/modules/xml) - 在 OpenSIPS 脚本中操作 XML 文档，🟢 **稳定**
* [**CFGUTILS**](/zh/modules/cfgutils) - 各类实用函数，🟢 **稳定**
* [**CONFIG**](/zh/modules/config) - 由 DB 支持的运行时配置，alpha / 🔵 **新增**
* [**EXEC**](/zh/modules/exec) - 外部命令执行模块，🟢 **稳定**
* [**TEXTOPS**](/zh/modules/textops) - 文本操作模块，🟢 **稳定**
* **AVPOPS** - 已重命名，见 [SQLops 模块](/zh/modules/sqlops)
* [**SQLOPS**](/zh/modules/sqlops) - SQL 数据库操作模块 🟢 **稳定**
* [**REGEX**](/zh/modules/regex) - 通过 PCRE 库实现的正则表达式，🟢 **稳定**
* [**MATHOPS**](/zh/modules/mathops) - 浮点与舍入操作，🟢 **稳定**
* [**BENCHMARK**](/zh/modules/benchmark) - 脚本文件基准测试， 🟢 **稳定**
* [**CARRIERROUTE**](/zh/modules/carrierroute) - 适用于运营商的路由扩展，🟢 **稳定**
* [**GFLAGS**](/zh/modules/gflags) - 全局共享标志位模块，🟢 **稳定**
* [**PYTHON**](/zh/modules/python) - Python 脚本支持，🟢 **稳定**
* [**LUA**](/zh/modules/lua) - 从 OpenSIPS 配置文件中调用 LUA 脚本，🟢 **稳定**
* [**PERL**](/zh/modules/perl) - 内嵌执行 Perl 函数，🟢 **稳定**
* [**MMGEOIP**](/zh/modules/mmgeoip) - MaxMind GeoIP 模块，🟢 **稳定**
* [**UUID**](/zh/modules/uuid) - UUID 生成，🟢 **稳定**
* [**MQUEUE**](/zh/modules/mqueue) - 使用配置文件进行消息队列系统的进程间通信，🟢 **稳定**

### 鉴权模块 {#auth-modules}
* [**AUTH_AAA**](/zh/modules/auth_aaa) - AAA 后端的鉴权模块，🟢 **稳定**
* [**AUTH**](/zh/modules/auth) - 鉴权框架模块，🟢 **稳定**
* [**AUTH_DB**](/zh/modules/auth_db) - 数据库后端的鉴权模块，🟢 **稳定**
* [**AUTH_JWT**](/zh/modules/auth_jwt) - 基于 JSON Web Token 的鉴权，🟢 **稳定**
* [**AUTH_AKA**](/zh/modules/auth_aka) - 使用 RFC 3310 AKA 机制的鉴权，beta
* [**AKA_AV_DIAMETER**](/zh/modules/aka_av_diameter) - 使用 Cx/Dx Diameter 接口获取 RFC 3310 AKA 鉴权向量（AV），beta
* [**PERMISSIONS**](/zh/modules/permissions) - 权限控制模块，🟢 **稳定**

### 计费与结算模块 {#accounting-billing-modules}
* [**ACC**](/zh/modules/acc) - 计费模块，🟢 **稳定**
* [**CALL CONTROL**](/zh/modules/call_control) - 预付费应用模块，🟢 **稳定**
* [**CGRATES**](/zh/modules/cgrates) - 连接 CGRateS 计费引擎的连接器，🟢 **稳定**

### 拨号计划模块 {#dialplan-modules}
* [**ALIAS_DB**](/zh/modules/alias_db) - 数据库 SIP 别名模块，🟢 **稳定**
* [**DIALPLAN**](/zh/modules/dialplan) - 拨号计划管理，🟢 **稳定**
* [**DOMAIN**](/zh/modules/domain) - 多域支持模块，🟢 **稳定**
* [**DOMAINPOLICY**](/zh/modules/domainpolicy) - 连接联邦的策略，🟢 **稳定**
* [**GROUP**](/zh/modules/group) - 带 DB 后端的用户组模块，🟢 **稳定**
* [**USERBLACKLIST**](/zh/modules/userblacklist) - 用户黑/白名单，🟢 **稳定**
* [**SPEEDDIAL**](/zh/modules/speeddial) - 按用户粒度的缩位拨号控制模块，🟢 **稳定**
* [**PEERING**](/zh/modules/peering) - RADIUS 对等互联模块，🟢 **稳定**

### 数据缓存 {#data-caching}
* [**DNS_CACHE**](/zh/modules/dns_cache) - 用于缓存 DNS 记录的模块，可与任意键值（Key-Value）后端配合使用，🟢 **稳定**
* [**RATE_CACHER**](/zh/modules/rate_cacher) - 通过 MI 缓存、查询、重载或更新费率，🟢 **稳定**
* [**SQL_CACHER**](/zh/modules/sql_cacher) - SQL 缓存模块，🟢 **稳定**
* [**TRIE**](/zh/modules/trie) - 基于 trie 查找的快速低内存号码缓存，alpha / 🔵 **新增**
* [**USRLOC**](/zh/modules/usrloc) - 用户位置实现模块，🟢 **稳定**

### 流量整形模块 {#traffic-shaping-modules}
* [**PIKE**](/zh/modules/pike) - 洪泛检测模块，🟢 **稳定**
* [**QOS**](/zh/modules/qos) - QoS（RTP）模块，🟢 **稳定**
* [**RATELIMIT**](/zh/modules/ratelimit) - SIP 流量整形模块，🟢 **稳定**
* [**FRAUD_DETECTION**](/zh/modules/fraud_detection) - 检测欺诈呼叫，🟢 **稳定**

---

## 数据库模块 {#database-modules}

### SQL 模块 {#sql-modules}
* [**DB_BERKELEY**](/zh/modules/db_berkeley) - DB API 的 Berkeley DB 驱动，🟢 **稳定**
* [**DB_CACHEDB**](/zh/modules/db_cachedb) - SQL 到 CacheDB 的转换器，🟢 **稳定**
* [**DB_FLATSTORE**](/zh/modules/db_flatstore) - 数据库模块的快速只写文本后端，🟢 **稳定**
* [**DB_HTTP**](/zh/modules/db_http) - DB API 的 HTTP 后端，🟢 **稳定**
* [**DB_MYSQL**](/zh/modules/db_mysql) - 数据库 API 模块的 MYSQL 后端，🟢 **稳定**
* [**DB_ORACLE**](/zh/modules/db_oracle) - 数据库 API 模块的 ORACLE 后端，🟢 **稳定**
* [**DB_PERLVDB**](/zh/modules/db_perlvdb) - Perl 虚拟数据库引擎，🟢 **稳定**
* [**DB_POSTGRES**](/zh/modules/db_postgres) - 数据库 API 模块的 POSTGRES 后端，🟢 **稳定**
* [**DB_SQLITE**](/zh/modules/db_sqlite) - 数据库 API 模块的 SQLITE3 后端，🟢 **稳定**
* [**DB_TEXT**](/zh/modules/db_text) - 数据库 API 模块的文本后端，🟢 **稳定**
* [**DB_UNIXODBC**](/zh/modules/db_unixodbc) - unixODBC 驱动模块，🟢 **稳定**
* [**DB_VIRTUAL**](/zh/modules/db_virtual) - 中间层 DB 混合器，🟢 **稳定**

### noSQL 模块 {#nosql-modules}
* [**CACHEDB_CASSANDRA**](/zh/modules/cachedb_cassandra) - CacheDB 的 Cassandra 实现，🟢 **稳定**
* [**CACHEDB_COUCHBASE**](/zh/modules/cachedb_couchbase) - CacheDB 的 CouchBase 实现，🟢 **稳定**
* [**CACHEDB_DYNAMODB**](/zh/modules/cachedb_dynamodb) - CacheDB 的 AWS DynamoDB 实现，alpha / 🔵 **新增**
* [**CACHEDB_LOCAL**](/zh/modules/cachedb_local) - CacheDB 的本地实现，🟢 **稳定**
* [**CACHEDB_MEMCACHED**](/zh/modules/cachedb_memcached) - CacheDB 的 Memcached 实现，🟢 **稳定**
* [**CACHEDB_MONGODB**](/zh/modules/cachedb_mongodb) - CacheDB 的 MongoDB 实现，🟢 **稳定**
* [**CACHEDB_REDIS**](/zh/modules/cachedb_redis) - CacheDB 的 Redis 实现，🟢 **稳定**
* [**CACHEDB_SQL**](/zh/modules/cachedb_sql) - CacheDB 的基于 SQL 的实现，🟢 **稳定**

---

## 外部集成模块 {#external-integration-modules}

### OpenSIPS API 模块 {#opensips-api-modules}
* [**EVENT_DATAGRAM**](/zh/modules/event_datagram) - 使用 UDP 发布 JSON-RPC 通知，🟢 **稳定**
* [**EVENT_FLATSTORE**](/zh/modules/event_flatstore) - 事件的文本/文件后端，🟢 **稳定**
* [**EVENT_KAFKA**](/zh/modules/event_kafka) - 向 Apache Kafka 发布 JSON-RPC 通知/通用消息，🟢 **稳定**
* [**EVENT_ROUTING**](/zh/modules/event_routing) - 基于事件的路由，🟢 **稳定**
* [**EVENT_RABBITMQ**](/zh/modules/event_rabbitmq) - 使用 TCP 上承载的 AMQP 发布 JSON-RPC 通知，🟢 **稳定**
* [**EVENT_STREAM**](/zh/modules/event_stream) - 使用 TCP 发布 JSON-RPC 通知，🟢 **稳定**
* [**EVENT_SQS**](/zh/modules/event_sqs) - Amazon SQS 生产者的实现，alpha / 🔵 **新增**
* [**EVENT_VIRTUAL**](/zh/modules/event_virtual) - 事件后端聚合器（故障切换与均衡），🟢 **稳定**
* [**EVENT_XMLRPC**](/zh/modules/event_xmlrpc) - 事件 XMLRPC 客户端模块，🟢 **稳定**
* [**MI_DATAGRAM**](/zh/modules/mi_datagram) - 管理接口的 DATAGRAM（unix 与网络）支持，🟢 **稳定**
* [**MI_FIFO**](/zh/modules/mi_fifo) - 管理接口的 FIFO 支持，🟢 **稳定**
* [**MI_HTML**](/zh/modules/mi_html) - 管理接口的最小化 Web GUI，🟢 **稳定**
* [**MI_HTTP**](/zh/modules/mi_http) - 管理接口的 HTTP 支持，🟢 **稳定**
* [**MI_SCRIPT**](/zh/modules/mi_script) - 支持在脚本中运行管理接口命令，🟢 **稳定**
* [**MI_XMLRPC_NG**](/zh/modules/mi_xmlrpc_ng) - 管理接口的 XMLRPC 支持，🟢 **稳定**
* [**HTTPD**](/zh/modules/httpd) - 嵌入式 HTTP 服务器，🟢 **稳定**
* [**PI_HTTP**](/zh/modules/pi_http) - 数据配置接口模块，🟢 **稳定**
* [**RABBITMQ_CONSUMER**](/zh/modules/rabbitmq_consumer) - 连接 RabbitMQ 并接收事件，🟢 **稳定**
* [**STATISTICS**](/zh/modules/statistics) - 脚本统计支持，🟢 **稳定**
* [**STATUS_REPORT**](/zh/modules/status_report) - 脚本状态/报告标识符支持，🟢 **稳定**

### 媒体中继 {#media-relays}
* [**MEDIAPROXY**](/zh/modules/mediaproxy) - NAT 穿透模块，🟢 **稳定**
* [**MSRP_RELAY**](/zh/modules/msrp_relay) - MSRP 协议中继的实现，🟢 **稳定**
* [**RTPENGINE**](/zh/modules/rtpengine) - 连接 RTPengine 外部 RTP 中继的连接器，🟢 **稳定**
* [**RTPPROXY**](/zh/modules/rtpproxy) - 连接 RTPproxy 外部 RTP 中继的连接器，🟢 **稳定**
* [**RTP.IO**](/zh/modules/rtp.io) - 内置 RTP 中继模块，alpha / 🔵 **新增**
* [**RTP_RELAY**](/zh/modules/rtp_relay) - 面向不同 RTP 中继引擎的接口，🟢 **稳定**

### 外部集成（非 SIP 协议） {#external-integration-non-sip}
* [**AAA_DIAMETER**](/zh/modules/aaa_diameter) - AAA API 的 Diameter 后端，🟢 **稳定**
* [**AAA_RADIUS**](/zh/modules/aaa_radius) - AAA API 的 RADIUS 后端，🟢 **稳定**
* [**FREESWITCH**](/zh/modules/freeswitch) - FreeSWITCH ESL 连接管理器，🟢 **稳定**
* [**FREESWITCH_SCRIPTING**](/zh/modules/freeswitch_scripting) - 在 OpenSIPS 脚本层使用 FreeSWITCH 事件与命令，🟢 **稳定**
* [**H350**](/zh/modules/h350) - H350 实现，🟢 **稳定**
* [**HTTP2D**](/zh/modules/http2d) - 可编程 HTTP/2 服务器，beta
* [**JANUS**](/zh/modules/janus) - 连接 Janus 的 WebSocket 连接器（用于执行命令），alpha / 🔵 **新增**
* [**JSONRPC**](/zh/modules/jsonrpc) - 执行 JSON-RPC 命令，🟢 **稳定**
* [**LAUNCH_DARKLY**](/zh/modules/launch_darkly) - LaunchDarkly 集成，beta
* [**LDAP**](/zh/modules/ldap) - LDAP 连接器，🟢 **稳定**
* [**PROMETHEUS**](/zh/modules/prometheus) - 将统计导出到 [Prometheus](http://prometheus.io/) 服务器，🟢 **稳定**
* [**REST_CLIENT**](/zh/modules/rest_client) - HTTP 客户端的实现，🟢 **稳定**
* [**SIPCAPTURE**](/zh/modules/sipcapture) - SipCapture 模块，🟢 **稳定**
* [**SIPREC**](/zh/modules/siprec) - SIP 录音模块，🟢 **稳定**
* [**TRACER**](/zh/modules/tracer) - 收集 SIP、日志、DNS 或 REST 查询并发送到各类后端，🟢 **稳定**
* [**SNGTC**](/zh/modules/sngtc) - 在 OpenSIPS 中使用 Sangoma 硬件进行语音转码，🟢 **稳定**
* [**SNMPStats**](/zh/modules/snmpstats) - 统计模块的 SNMP 接口，🟢 **稳定**
* [**STUN**](/zh/modules/stun) - 内置 STUN 服务器，🟢 **稳定**
* [**XMPP**](/zh/modules/xmpp) - SIP 到 XMPP 的网关（SIP 到 Jabber/Google Talk），🟢 **稳定**

---

## OpenSIPS 协议与基础设施 {#opensips-protocols-infrastructure}
* [**CLUSTERER**](/zh/modules/clusterer) - 定义并配置 OpenSIPS 集群，🟢 **稳定**
* [**TLS_MGM**](/zh/modules/tls_mgm) - TLS 管理模块，🟢 **稳定**
* [**TLS_OPENSSL**](/zh/modules/tls_openssl) - 使用 openSSL 库实现的 TLS 操作，🟢 **稳定**
* [**TLS_WOLFSSL**](/zh/modules/tls_wolfssl) - 使用 wolfSSL 库实现的 TLS 操作，🟢 **稳定**
* [**TCP_MGM**](/zh/modules/tcp_mgm) - TCP 连接管理模块，🟢 **稳定**
* [**PROTO_BIN**](/zh/modules/proto_bin) - 二进制接口（Binary Interface）协议模块 - 实现 OpenSIPS 之间的通信，🟢 **稳定**
* [**PROTO_BINS**](/zh/modules/proto_bins) - 基于 TLS 的二进制接口协议模块 - 实现 OpenSIPS 之间的安全通信，🟢 **稳定**
* [**PROTO_HEP**](/zh/modules/proto_hep) - HEP 协议模块 - 为 SIP 实现 HEP 传输，🟢 **稳定**
* [**PROTO_IPSEC**](/zh/modules/proto_ipsec) - 依据 TS 33.203 规范实现 IMS IPSec 协议，beta
* [**PROTO_MSRP**](/zh/modules/proto_msrp) - 实现 MSRP 协议栈，🟢 **稳定**
* [**PROTO_SCTP**](/zh/modules/proto_sctp) - SCTP 协议模块 - 为 SIP 实现 SCTP 传输，🟢 **稳定**
* [**PROTO_TCP**](https://github.com/OpenSIPS/opensips/blob/3.6/net/proto_tcp/README.md) - TCP 协议模块 - 为 SIP 实现 TCP 明文传输，🟢 **稳定**
* [**PROTO_TLS**](/zh/modules/proto_tls) - TLS 协议模块 - 为 SIP 实现 TLS 传输，🟢 **稳定**
* [**PROTO_UDP**](https://github.com/OpenSIPS/opensips/blob/3.6/net/proto_udp/README.md) - UDP 协议模块 - 为 SIP 实现 UDP 明文传输，🟢 **稳定**
* [**PROTO_WS**](/zh/modules/proto_ws) - WebSocket 协议模块 - 为 SIP 实现 WS 传输，🟢 **稳定**
* [**PROTO_WSS**](/zh/modules/proto_wss) - WebSocket Secure 协议模块 - 为 SIP 实现 WSS 传输，🟢 **稳定**
* [**PROTO_SMPP**](/zh/modules/proto_smpp) - SMPP（短消息点对点）协议模块 - 为 SMPP 消息实现传输，🟢 **稳定**
* [**SOCKETS_MGM**](/zh/modules/sockets_mgm) - 运行时动态管理 SIP 套接字，alpha / 🔵 **新增**
