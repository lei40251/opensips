---
title: "Modules"
description: ""
---

## SIP related modules {#sip-related-modules}

### SIP signaling modules {#sip-signaling-modules}
* [**B2B_ENTITIES**](/en/modules/b2b_entities) - Back-to-Back User Agent Entities, 🟢 **stable**
* [**B2B_LOGIC**](/en/modules/b2b_logic) - Back-to-Back User Agent Logic, 🟢 **stable**
* [**CALL CENTER**](/en/modules/call_center) - Inbound call center system , 🟢 **stable**
* [**DIALOG**](/en/modules/dialog) - Dialog support module , 🟢 **stable**
* [**NAT_TRAVERSAL**](/en/modules/nat_traversal) - NAT traversal module , 🟢 **stable**
* [**NATHELPER**](/en/modules/nathelper) - NAT traversal helper module , 🟢 **stable**
* [**OPTIONS**](/en/modules/options) - OPTIONS server replier module , 🟢 **stable**
* [**REGISTRAR**](/en/modules/registrar) - SIP Registrar implementation module , 🟢 **stable**
* [**SIGNALING**](/en/modules/signaling) - SIP signaling module , 🟢 **stable**
* [**UAC_REGISTRANT**](/en/modules/uac_registrant) - SIP Registrant implementation module , 🟢 **stable**
* [**TM**](/en/modules/tm) - Transaction (stateful) module , 🟢 **stable**
* [**SL**](/en/modules/sl) - Stateless replier module , 🟢 **stable**
* [**MEDIA_EXCHANGE**](/en/modules/media_exchange) - Module to exchange SDP bodies between different SIP calls, 🟢 **stable**
* [**CALLOPS**](/en/modules/callops) - Module to trigger different call operations on ongoing SIP calls, 🟢 **stable**
* [**B2B_SDP_DEMUX**](/en/modules/b2b_sdp_demux) - Module to de-multiplex calls with multiple media streams, 🟢 **stable**
* [**MSRP_UA**](/en/modules/msrp_ua) - MSRP User Agent module, 🟢 **stable**

### SIP Routing modules {#sip-routing-modules}
* [**CARRIERROUTE**](/en/modules/carrierroute) - routing extension suitable for carriers , 🟢 **stable**
* [**CPL_C**](/en/modules/cpl_c) - CPL interpreter module , 🟢 **stable**
* [**DISPATCHER**](/en/modules/dispatcher) - Dispatcher module , 🟢 **stable**
* [**DROUTING**](/en/modules/drouting) - Dynamic Routing / LCR , 🟢 **stable**
* [**QROUTING**](/en/modules/qrouting) - Quality-based Routing , 🟢 **stable**
* [**EMERGENCY**](/en/modules/emergency) - Emergency module, 🟢 **stable**
* [**ENUM**](/en/modules/enum) - ENUM lookup module , 🟢 **stable**
* [**JABBER**](/en/modules/jabber) - JABBER IM and PRESENCE interconnection module , beta
* [**IMC**](/en/modules/imc) - Instant Messaging Conferencing module , 🟢 **stable**
* [**LOAD_BALANCER**](/en/modules/load_balancer) - Load Balancer (for calls) module, 🟢 **stable**
* [**MID_REGISTRAR**](/en/modules/mid_registrar) - SIP registration front-end with traffic throttling , 🟢 **stable**
* [**MSILO**](/en/modules/msilo) - SIP message silo module , 🟢 **stable**
* [**MSRP_GATEWAY**](/en/modules/msrp_gateway) - SIP MESSAGE / MSRP gateway module, 🟢 **stable**
* [**RR**](/en/modules/rr) - Record-Route and Route module , 🟢 **stable**
* [**SCRIPT_HELPER**](/en/modules/script_helper) - Embedded SIP routing logic and dialog management, 🟢 **stable**
* [**OSP**](/en/modules/osp) - OSP peering module , 🟢 **stable**

### SIP messaging operations {#sip-message-operations}
* [**COMPRESSION**](/en/modules/compression) - Message compression and compaction, 🟢 **stable**
* [**DIVERSION**](/en/modules/diversion) - Diversion header insertion module , 🟢 **stable**
* [**IDENTITY**](/en/modules/identity) - SIP Identity implementation, 🟢 **stable**
* [**MAXFWD**](/en/modules/maxfwd) - Max-Forward processor module , 🟢 **stable**
* [**MANGLER**](/en/modules/mangler) - SIP mangler module , 🟢 **stable**
* [**PATH**](/en/modules/path) - Path support for SIP frontending , 🟢 **stable**
* [**SIP_I**](/en/modules/sip_i) - ISUP manipulation module , 🟢 **stable**
* [**SIPMSGOPS**](/en/modules/sipmsgops) - SIP operations module , 🟢 **stable**
* [**STIR_SHAKEN**](/en/modules/stir_shaken) - STIR/SHAKEN support , 🟢 **stable**
* [**TOPOLOGY_HIDING**](/en/modules/topology_hiding) - Provides Topology Hiding capabilities , 🟢 **stable**
* [**UAC**](/en/modules/uac) - UAC functionalies (FROM mangling and UAC auth) , 🟢 **stable**
* [**UAC_AUTH**](/en/modules/uac_auth) - UAC Authentication functionality, 🟢 **stable**
* [**UAC_REDIRECT**](/en/modules/uac_redirect) - UAC redirection functionality , 🟢 **stable**
* [**SST**](/en/modules/sst) - SIP Session Timer support , 🟢 **stable**

### SIP Presence Modules {#sip-presence-modules}
* [**PRESENCE**](/en/modules/presence) - Presence server module - common API , 🟢 **stable**
* [**PRESENCE_CALLINFO**](/en/modules/presence_callinfo) - Extension to Presence server for Call-Info, 🟢 **stable**
* [**PRESENCE_DIALOGINFO**](/en/modules/presence_dialoginfo) - Extension to Presence server for Dialog Info, 🟢 **stable**
* [**PRESENCE_DFKS**](/en/modules/presence_dfks) - Extension to Presence server for Device Feature Key Synchronization, 🟢 **stable**
* [**PRESENCE_MWI**](/en/modules/presence_mwi) - Extension to Presence server for Message Waiting Indication , 🟢 **stable**
* [**PRESENCE_REGINFO**](/en/modules/presence_reginfo) - Extension to Presence server for "reg"-events according to RFC 3680 , 🟢 **stable**
* [**PRESENCE_XCAPDIFF**](/en/modules/presence_xcapdiff) - Extension to Presence server for XCAP-DIFF event, 🟢 **stable**
* [**PRESENCE_XML**](/en/modules/presence_xml) - Presence server module - presence & watcher info and XCAP , 🟢 **stable**
* [**PUA**](/en/modules/pua) - Common API for presence user agent client , 🟢 **stable**
* [**PUA_BLA**](/en/modules/pua_bla) - BLA extension for PUA , 🟢 **stable**
* [**PUA_DIALOGINFO**](/en/modules/pua_dialoginfo) - Dialog-Info extension for PUA , 🟢 **stable**
* [**PUA_MI**](/en/modules/pua_mi) - MI extension for PUA , 🟢 **stable**
* [**PUA_REGINFO**](/en/modules/pua_reginfo) - Publisher for "reg"-events according to RFC 3680 , 🟢 **stable**
* [**PUA_USRLOC**](/en/modules/pua_usrloc) - USRLOC extension for PUA , 🟢 **stable**
* [**PUA_XMPP**](/en/modules/pua_xmpp) - XMPP extension for PUA (SIMPLE-XMPP presence gateway) , 🟢 **stable**
* [**B2B_SCA**](/en/modules/b2b_sca) - Back-to-Back Shared Call Appearance, 🟢 **stable**
* [**RLS**](/en/modules/rls) - Resource List Server implementation , 🟢 **stable**
* [**XCAP**](/en/modules/xcap) - XCAP API provider , 🟢 **stable**
* [**XCAP_CLIENT**](/en/modules/xcap_client) - XCAP client implementation , 🟢 **stable**

---

## Scripting modules {#scripting-modules}

### Script helper modules {#script-helper-modules}
* [**JSON**](/en/modules/json) - Manipulate JSON objects in OpenSIPS script, 🟢 **stable** 
* [**XML**](/en/modules/xml) - Manipulate XML documents in OpenSIPS script, 🟢 **stable**
* [**CFGUTILS**](/en/modules/cfgutils) - Various utility functions, 🟢 **stable**
* [**CONFIG**](/en/modules/config) - DB backed runtime configuration, alpha / 🔵 **NEW**
* [**EXEC**](/en/modules/exec) - External exec module , 🟢 **stable**
* [**TEXTOPS**](/en/modules/textops) - Text operations module, 🟢 **stable**
* **AVPOPS** - renamed, see [SQLops module](/en/modules/sqlops)
* [**SQLOPS**](/en/modules/sqlops) - SQL DB operations module 🟢 **stable**
* [**REGEX**](/en/modules/regex) - RegExp via PCRE library, 🟢 **stable**
* [**MATHOPS**](/en/modules/mathops) - Floating point and rounding operations, 🟢 **stable**
* [**BENCHMARK**](/en/modules/benchmark) - Script file benchmarking,  🟢 **stable**
* [**CARRIERROUTE**](/en/modules/carrierroute) - routing extension suitable for carriers , 🟢 **stable**
* [**GFLAGS**](/en/modules/gflags) - Global shared flags module, 🟢 **stable**
* [**PYTHON**](/en/modules/python) - Python scripting support, 🟢 **stable**
* [**LUA**](/en/modules/lua) - Call LUA scripts from OpenSIPS cfg, 🟢 **stable**
* [**PERL**](/en/modules/perl) - embed execution of Perl function , 🟢 **stable**
* [**MMGEOIP**](/en/modules/mmgeoip) - MaxMind GeoIP module, 🟢 **stable**
* [**UUID**](/en/modules/uuid) - UUID generation, 🟢 **stable**
* [**MQUEUE**](/en/modules/mqueue) - Message queue system inter-process communication using the config file, 🟢 **stable**

### Auth modules {#auth-modules}
* [**AUTH_AAA**](/en/modules/auth_aaa) - AAA-backend authentication module, 🟢 **stable**
* [**AUTH**](/en/modules/auth) - Authentication Framework module, 🟢 **stable**
* [**AUTH_DB**](/en/modules/auth_db) -Database-backend authentication module, 🟢 **stable**
* [**AUTH_JWT**](/en/modules/auth_jwt) -Authentication over JSON Web Tokens, 🟢 **stable**
* [**AUTH_AKA**](/en/modules/auth_aka) - Authentication using RFC 3310 AKA mechanism, beta
* [**AKA_AV_DIAMETER**](/en/modules/aka_av_diameter) - Fetches RFC 3310 AKA AVs using Cx/Dx Diameter interface, beta
* [**PERMISSIONS**](/en/modules/permissions) - Permissions control module , 🟢 **stable**

### Accounting & Billing modules {#accounting-billing-modules}
* [**ACC**](/en/modules/acc) - Accounting module, 🟢 **stable**
* [**CALL CONTROL**](/en/modules/call_control) - PrePaid application module , 🟢 **stable**
* [**CGRATES**](/en/modules/cgrates) - Connector to  the CGRateS billing engine, 🟢 **stable**

### Dialplan Modules {#dialplan-modules}
* [**ALIAS_DB**](/en/modules/alias_db) - Database SIP aliases module, 🟢 **stable**
* [**DIALPLAN**](/en/modules/dialplan) - Dialplan management , 🟢 **stable**
* [**DOMAIN**](/en/modules/domain) - Multi-domain support module , 🟢 **stable**
* [**DOMAINPOLICY**](/en/modules/domainpolicy) - Policies to connect federations , 🟢 **stable**
* [**GROUP**](/en/modules/group) - User-groups module with DB-backend , 🟢 **stable**
* [**USERBLACKLIST**](/en/modules/userblacklist) - User black/white listing , 🟢 **stable**
* [**SPEEDDIAL**](/en/modules/speeddial) - Per-user speed-dial controller module , 🟢 **stable**
* [**PEERING**](/en/modules/peering) - Radius peering module , 🟢 **stable**

### Data caching {#data-caching}
* [**DNS_CACHE**](/en/modules/dns_cache) - Module for caching DNS records that can be used with any Key-Value back-end , 🟢 **stable**
* [**RATE_CACHER**](/en/modules/rate_cacher) - Cache, Query, Reload or Update rates via MI, 🟢 **stable**
* [**SQL_CACHER**](/en/modules/sql_cacher) - SQL Caching module, 🟢 **stable**
* [**TRIE**](/en/modules/trie) - Fast, low memory cache with trie search for number, alpha / 🔵 **NEW**
* [**USRLOC**](/en/modules/usrloc) - User location implementation module , 🟢 **stable**

### Traffic shaping module {#traffic-shaping-modules}
* [**PIKE**](/en/modules/pike) - Flood detector module , 🟢 **stable**
* [**QOS**](/en/modules/qos) - QOS (RTP) module , 🟢 **stable**
* [**RATELIMIT**](/en/modules/ratelimit) - SIP traffic shaping module , 🟢 **stable**
* [**FRAUD_DETECTION**](/en/modules/fraud_detection) - Detects fraudulent calls, 🟢 **stable**

---

## Database modules {#database-modules}

### SQL modules {#sql-modules}
* [**DB_BERKELEY**](/en/modules/db_berkeley) - Berkeley DB driver for DB API , 🟢 **stable**
* [**DB_CACHEDB**](/en/modules/db_cachedb) - SQL to CacheDB translator , 🟢 **stable**
* [**DB_FLATSTORE**](/en/modules/db_flatstore) - Fast writing-only text-backend for database module , 🟢 **stable**
* [**DB_HTTP**](/en/modules/db_http) - HTTP-backend for DB API , 🟢 **stable**
* [**DB_MYSQL**](/en/modules/db_mysql) - MYSQL-backend for database API module , 🟢 **stable**
* [**DB_ORACLE**](/en/modules/db_oracle) - ORACLE-backend for database API module , 🟢 **stable**
* [**DB_PERLVDB**](/en/modules/db_perlvdb) - Perl Virtual Database engine , 🟢 **stable**
* [**DB_POSTGRES**](/en/modules/db_postgres) - POSTGRES-backend for database API module , 🟢 **stable**
* [**DB_SQLITE**](/en/modules/db_sqlite) - SQLITE3-backend for database API module , 🟢 **stable**
* [**DB_TEXT**](/en/modules/db_text) - Text-backend for database API module , 🟢 **stable**
* [**DB_UNIXODBC**](/en/modules/db_unixodbc) - unixODBC driver module , 🟢 **stable**
* [**DB_VIRTUAL**](/en/modules/db_virtual) - Middle-layer DB mixer, 🟢 **stable**

### noSQL modules {#nosql-modules}
* [**CACHEDB_CASSANDRA**](/en/modules/cachedb_cassandra) - Cassandra Implementation of CacheDB, 🟢 **stable**
* [**CACHEDB_COUCHBASE**](/en/modules/cachedb_couchbase) - CouchBase Implementation of CacheDB, 🟢 **stable**
* [**CACHEDB_DYNAMODB**](/en/modules/cachedb_dynamodb) - AWS DynamoDB Implementation of CacheDB, alpha / 🔵 **NEW**
* [**CACHEDB_LOCAL**](/en/modules/cachedb_local) - Local Implementation of CacheDB, 🟢 **stable**
* [**CACHEDB_MEMCACHED**](/en/modules/cachedb_memcached) - Memcached Implementation of CacheDB, 🟢 **stable**
* [**CACHEDB_MONGODB**](/en/modules/cachedb_mongodb) - MongoDB Implementation of CacheDB, 🟢 **stable**
* [**CACHEDB_REDIS**](/en/modules/cachedb_redis) - Redis Implementation of CacheDB, 🟢 **stable**
* [**CACHEDB_SQL**](/en/modules/cachedb_sql) - SQL-based Implementation of CacheDB, 🟢 **stable**

---

## External Integration modules {#external-integration-modules}

### OpenSIPS API modules {#opensips-api-modules}
* [**EVENT_DATAGRAM**](/en/modules/event_datagram) - Publish JSON-RPC notifications using UDP, 🟢 **stable**
* [**EVENT_FLATSTORE**](/en/modules/event_flatstore) - Text/File backend for events, 🟢 **stable**
* [**EVENT_KAFKA**](/en/modules/event_kafka) - Publish JSON-RPC notifications/generic messages to Apache Kafka , 🟢 **stable**
* [**EVENT_ROUTING**](/en/modules/event_routing) - Event-based routing, 🟢 **stable**
* [**EVENT_RABBITMQ**](/en/modules/event_rabbitmq) - Publish JSON-RPC notifications using AMQP over TCP , 🟢 **stable**
* [**EVENT_STREAM**](/en/modules/event_stream) - Publish JSON-RPC notifications using TCP, 🟢 **stable**
* [**EVENT_SQS**](/en/modules/event_sqs) - An implementation of an Amazon SQS producer, alpha / 🔵 **NEW**
* [**EVENT_VIRTUAL**](/en/modules/event_virtual) - Aggregator of event backends (failover & balancing), 🟢 **stable**
* [**EVENT_XMLRPC**](/en/modules/event_xmlrpc) - Event XMLRPC client module , 🟢 **stable**
* [**MI_DATAGRAM**](/en/modules/mi_datagram) - DATAGRAM (unix and network) support for Management Interface , 🟢 **stable**
* [**MI_FIFO**](/en/modules/mi_fifo) - FIFO support for Management Interface , 🟢 **stable**
* [**MI_HTML**](/en/modules/mi_html) - Minimal web GUI for Management Interface , 🟢 **stable**
* [**MI_HTTP**](/en/modules/mi_http) - HTTP support for Management Interface , 🟢 **stable**
* [**MI_SCRIPT**](/en/modules/mi_script) - support for running Management Interface commands in script , 🟢 **stable**
* [**MI_XMLRPC_NG**](/en/modules/mi_xmlrpc_ng) - XMLRPC support for Management Interface , 🟢 **stable**
* [**HTTPD**](/en/modules/httpd) - Embedded HTTP server , 🟢 **stable**
* [**PI_HTTP**](/en/modules/pi_http) - Provisioning Interface module , 🟢 **stable**
* [**RABBITMQ_CONSUMER**](/en/modules/rabbitmq_consumer) - Connect to RabbitMQ and receive events, 🟢 **stable**
* [**STATISTICS**](/en/modules/statistics) - Script statistics support , 🟢 **stable**
* [**STATUS_REPORT**](/en/modules/status_report) - Script Status/Report identifiers support , 🟢 **stable**

### Media Relays {#media-relays}
* [**MEDIAPROXY**](/en/modules/mediaproxy) - NAT traversal module , 🟢 **stable**
* [**MSRP_RELAY**](/en/modules/msrp_relay) - Implementation of a Relay for the MSRP protocol , 🟢 **stable**
* [**RTPENGINE**](/en/modules/rtpengine) - Connector to RTPengine external RTP relay , 🟢 **stable**
* [**RTPPROXY**](/en/modules/rtpproxy) - Connector to RTPproxy external RTP relay, 🟢 **stable**
* [**RTP.IO**](/en/modules/rtp.io) - Builtin RTP relay module, alpha / 🔵 **NEW**
* [**RTP_RELAY**](/en/modules/rtp_relay) - Interface for different RTP relay engines, 🟢 **stable**

### External integration (non-SIP protocols) {#external-integration-non-sip}
* [**AAA_DIAMETER**](/en/modules/aaa_diameter) - Diameter backend for the AAA API, 🟢 **stable**
* [**AAA_RADIUS**](/en/modules/aaa_radius) - RADIUS backend for the AAA API, 🟢 **stable**
* [**FREESWITCH**](/en/modules/freeswitch) - FreeSWITCH ESL connection manager, 🟢 **stable**
* [**FREESWITCH_SCRIPTING**](/en/modules/freeswitch_scripting) - FreeSWITCH events & commands at OpenSIPS script level, 🟢 **stable**
* [**H350**](/en/modules/h350) - H350 implementation , 🟢 **stable**
* [**HTTP2D**](/en/modules/http2d) - Programmable HTTP/2 Server, beta
* [**JANUS**](/en/modules/janus) - WEB Socket connector to Janus (for running commands), alpha / 🔵 **NEW**
* [**JSONRPC**](/en/modules/jsonrpc) - Execute JSON-RPC commands, 🟢 **stable**
* [**LAUNCH_DARKLY**](/en/modules/launch_darkly) - Launch Darkly integration, beta
* [**LDAP**](/en/modules/ldap) - LDAP connector , 🟢 **stable**
* [**PROMETHEUS**](/en/modules/prometheus) - export statistics to a [Prometheus](http://prometheus.io/) server, 🟢 **stable**
* [**REST_CLIENT**](/en/modules/rest_client) - Implementation of an HTTP client , 🟢 **stable**
* [**SIPCAPTURE**](/en/modules/sipcapture) - SipCapture module , 🟢 **stable**
* [**SIPREC**](/en/modules/siprec) - SIP Recording module , 🟢 **stable**
* [**TRACER**](/en/modules/tracer) - Collects SIP, logs, DNS or REST queries and ships them to various backends , 🟢 **stable**
* [**SNGTC**](/en/modules/sngtc) - Voice Transcoding in OpenSIPS using Sangoma hardware , 🟢 **stable**
* [**SNMPStats**](/en/modules/snmpstats) - SNMP interface for statistics module , 🟢 **stable**
* [**STUN**](/en/modules/stun) - Built-in STUN server , 🟢 **stable** - 
* [**XMPP**](/en/modules/xmpp) - SIP-to-XMPP Gateway (SIP to Jabber/Google Talk) , 🟢 **stable**

---

## OpenSIPS protocols and infrastructure {#opensips-protocols-infrastructure}
* [**CLUSTERER**](/en/modules/clusterer) - Define and configure an OpenSIPS cluster, 🟢 **stable**
* [**TLS_MGM**](/en/modules/tls_mgm) - TLS management module , 🟢 **stable**
* [**TLS_OPENSSL**](/en/modules/tls_openssl) - TLS operations implemented using the openSSL library , 🟢 **stable**
* [**TLS_WOLFSSL**](/en/modules/tls_wolfssl) - TLS operations implemented using the wolfSSL library , 🟢 **stable**
* [**TCP_MGM**](/en/modules/tcp_mgm) - TCP connections management module , 🟢 **stable**
* [**PROTO_BIN**](/en/modules/proto_bin) - Binary INterface protocol module - implements inter-OPENSIPS communication , 🟢 **stable**
* [**PROTO_BINS**](/en/modules/proto_bins) - Binary INterface over TLS protocol module - implements Secure inter-OPENSIPS communication , 🟢 **stable**
* [**PROTO_HEP**](/en/modules/proto_hep) - HEP protocol module - implements HEP transport for SIP , 🟢 **stable**
* [**PROTO_IPSEC**](/en/modules/proto_ipsec) - implements IMS IPSec protocol according to TS 33.203 specs, beta
* [**PROTO_MSRP**](/en/modules/proto_msrp) - implements MSRP protocol stack, 🟢 **stable**
* [**PROTO_SCTP**](/en/modules/proto_sctp) - SCTP protocol module - implements SCTP transport for SIP , 🟢 **stable**
* [**PROTO_TCP**](https://github.com/OpenSIPS/opensips/blob/3.6/net/proto_tcp/README.md) - TCP protocol module - implements TCP-plain transport for SIP , 🟢 **stable**
* [**PROTO_TLS**](/en/modules/proto_tls) - TLS protocol module - implements TLS transport for SIP , 🟢 **stable**
* [**PROTO_UDP**](https://github.com/OpenSIPS/opensips/blob/3.6/net/proto_udp/README.md) - UDP protocol module - implements UDP-plain transport for SIP , 🟢 **stable**
* [**PROTO_WS**](/en/modules/proto_ws) - WebSocket protocol module - implements WS transport for SIP , 🟢 **stable**
* [**PROTO_WSS**](/en/modules/proto_wss) - WebSocket Secure protocol module - implements WSS transport for SIP , 🟢 **stable**
* [**PROTO_SMPP**](/en/modules/proto_smpp) - SMPP (Short Message Peer-to-Peer) protocol module - implements transport for SMPP messages, 🟢 **stable**
* [**SOCKETS_MGM**](/en/modules/sockets_mgm) - Dynamic SIP Sockets Management at runtime, alpha / 🔵 **NEW**
