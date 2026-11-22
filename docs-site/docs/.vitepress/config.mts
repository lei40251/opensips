import { defineConfig } from 'vitepress'

const enSidebar = [
  {
    text: 'Manual',
    collapsed: false,
    items: [
      { text: 'Overview', link: '/en/manual/README' },
      {
        text: 'Installation',
        collapsed: true,
        items: [
          { text: 'Download OpenSIPS', link: '/en/manual/Install-Download' },
          { text: 'Compile and Install OpenSIPS', link: '/en/manual/Install-CompileAndInstall' },
          { text: 'Database Deployment', link: '/en/manual/Install-DBDeployment' },
          { text: 'Database schema', link: '/en/manual/Install-DBSchema' },
        ]
      },
      {
        text: 'Configuring',
        collapsed: true,
        items: [
          { text: 'Config file', link: '/en/manual/Configure-File' },
          { text: 'Generating opensips.cfg files', link: '/en/manual/Generating-Configs' },
          { text: 'Templating opensips.cfg files', link: '/en/manual/Templating-Config-Files' },
        ]
      },
      {
        text: 'OpenSIPS scripting',
        collapsed: true,
        items: [
          { text: 'Script syntax', link: '/en/manual/Script-Syntax' },
          { text: 'Core parameters', link: '/en/manual/Script-CoreParameters' },
          { text: 'Types of routes', link: '/en/manual/Script-Routes' },
          { text: 'Script operators', link: '/en/manual/Script-Operators' },
          { text: 'Script statements', link: '/en/manual/Script-Statements' },
          { text: 'Core functions', link: '/en/manual/Script-CoreFunctions' },
          { text: 'Core variables', link: '/en/manual/Script-CoreVar' },
          { text: 'Scripting flags', link: '/en/manual/Script-Flags' },
          { text: 'Transformations', link: '/en/manual/Script-Tran' },
          { text: 'Asynchronous statements', link: '/en/manual/Script-Async' },
        ]
      },
      {
        text: 'Modules',
        collapsed: true,
        items: [
          { text: '模块文档索引', link: '/en/manual/Modules' },
          {
            text: 'SIP related modules',
            link: '/en/manual/Modules#sip-related-modules',
            collapsed: true,
            items: [
              {
                text: 'SIP signaling modules',
                link: '/en/manual/Modules#sip-signaling-modules',
                collapsed: true,
                items: [
                  { text: 'B2B_ENTITIES', link: '/en/modules/b2b_entities' },
                  { text: 'B2B_LOGIC', link: '/en/modules/b2b_logic' },
                  { text: 'CALL CENTER', link: '/en/modules/call_center' },
                  { text: 'DIALOG', link: '/en/modules/dialog' },
                  { text: 'NAT_TRAVERSAL', link: '/en/modules/nat_traversal' },
                  { text: 'NATHELPER', link: '/en/modules/nathelper' },
                  { text: 'OPTIONS', link: '/en/modules/options' },
                  { text: 'REGISTRAR', link: '/en/modules/registrar' },
                  { text: 'SIGNALING', link: '/en/modules/signaling' },
                  { text: 'UAC_REGISTRANT', link: '/en/modules/uac_registrant' },
                  { text: 'TM', link: '/en/modules/tm' },
                  { text: 'SL', link: '/en/modules/sl' },
                  { text: 'MEDIA_EXCHANGE', link: '/en/modules/media_exchange' },
                  { text: 'CALLOPS', link: '/en/modules/callops' },
                  { text: 'B2B_SDP_DEMUX', link: '/en/modules/b2b_sdp_demux' },
                  { text: 'MSRP_UA', link: '/en/modules/msrp_ua' },
                ]
              },
              {
                text: 'SIP Routing modules',
                link: '/en/manual/Modules#sip-routing-modules',
                collapsed: true,
                items: [
                  { text: 'CARRIERROUTE', link: '/en/modules/carrierroute' },
                  { text: 'CPL_C', link: '/en/modules/cpl_c' },
                  { text: 'DISPATCHER', link: '/en/modules/dispatcher' },
                  { text: 'DROUTING', link: '/en/modules/drouting' },
                  { text: 'QROUTING', link: '/en/modules/qrouting' },
                  { text: 'EMERGENCY', link: '/en/modules/emergency' },
                  { text: 'ENUM', link: '/en/modules/enum' },
                  { text: 'JABBER', link: '/en/modules/jabber' },
                  { text: 'IMC', link: '/en/modules/imc' },
                  { text: 'LOAD_BALANCER', link: '/en/modules/load_balancer' },
                  { text: 'MID_REGISTRAR', link: '/en/modules/mid_registrar' },
                  { text: 'MSILO', link: '/en/modules/msilo' },
                  { text: 'MSRP_GATEWAY', link: '/en/modules/msrp_gateway' },
                  { text: 'RR', link: '/en/modules/rr' },
                  { text: 'SCRIPT_HELPER', link: '/en/modules/script_helper' },
                  { text: 'OSP', link: '/en/modules/osp' },
                ]
              },
              {
                text: 'SIP messaging operations',
                link: '/en/manual/Modules#sip-message-operations',
                collapsed: true,
                items: [
                  { text: 'COMPRESSION', link: '/en/modules/compression' },
                  { text: 'DIVERSION', link: '/en/modules/diversion' },
                  { text: 'IDENTITY', link: '/en/modules/identity' },
                  { text: 'MAXFWD', link: '/en/modules/maxfwd' },
                  { text: 'MANGLER', link: '/en/modules/mangler' },
                  { text: 'PATH', link: '/en/modules/path' },
                  { text: 'SIP_I', link: '/en/modules/sip_i' },
                  { text: 'SIPMSGOPS', link: '/en/modules/sipmsgops' },
                  { text: 'STIR_SHAKEN', link: '/en/modules/stir_shaken' },
                  { text: 'TOPOLOGY_HIDING', link: '/en/modules/topology_hiding' },
                  { text: 'UAC', link: '/en/modules/uac' },
                  { text: 'UAC_AUTH', link: '/en/modules/uac_auth' },
                  { text: 'UAC_REDIRECT', link: '/en/modules/uac_redirect' },
                  { text: 'SST', link: '/en/modules/sst' },
                ]
              },
              {
                text: 'SIP Presence Modules',
                link: '/en/manual/Modules#sip-presence-modules',
                collapsed: true,
                items: [
                  { text: 'PRESENCE', link: '/en/modules/presence' },
                  { text: 'PRESENCE_CALLINFO', link: '/en/modules/presence_callinfo' },
                  { text: 'PRESENCE_DIALOGINFO', link: '/en/modules/presence_dialoginfo' },
                  { text: 'PRESENCE_DFKS', link: '/en/modules/presence_dfks' },
                  { text: 'PRESENCE_MWI', link: '/en/modules/presence_mwi' },
                  { text: 'PRESENCE_REGINFO', link: '/en/modules/presence_reginfo' },
                  { text: 'PRESENCE_XCAPDIFF', link: '/en/modules/presence_xcapdiff' },
                  { text: 'PRESENCE_XML', link: '/en/modules/presence_xml' },
                  { text: 'PUA', link: '/en/modules/pua' },
                  { text: 'PUA_BLA', link: '/en/modules/pua_bla' },
                  { text: 'PUA_DIALOGINFO', link: '/en/modules/pua_dialoginfo' },
                  { text: 'PUA_MI', link: '/en/modules/pua_mi' },
                  { text: 'PUA_REGINFO', link: '/en/modules/pua_reginfo' },
                  { text: 'PUA_USRLOC', link: '/en/modules/pua_usrloc' },
                  { text: 'PUA_XMPP', link: '/en/modules/pua_xmpp' },
                  { text: 'B2B_SCA', link: '/en/modules/b2b_sca' },
                  { text: 'RLS', link: '/en/modules/rls' },
                  { text: 'XCAP', link: '/en/modules/xcap' },
                  { text: 'XCAP_CLIENT', link: '/en/modules/xcap_client' },
                ]
              },
            ]
          },
          {
            text: 'Scripting modules',
            link: '/en/manual/Modules#scripting-modules',
            collapsed: true,
            items: [
              {
                text: 'Script helper modules',
                link: '/en/manual/Modules#script-helper-modules',
                collapsed: true,
                items: [
                  { text: 'JSON', link: '/en/modules/json' },
                  { text: 'XML', link: '/en/modules/xml' },
                  { text: 'CFGUTILS', link: '/en/modules/cfgutils' },
                  { text: 'CONFIG', link: '/en/modules/config' },
                  { text: 'EXEC', link: '/en/modules/exec' },
                  { text: 'TEXTOPS', link: '/en/modules/textops' },
                  { text: 'SQLOPS', link: '/en/modules/sqlops' },
                  { text: 'REGEX', link: '/en/modules/regex' },
                  { text: 'MATHOPS', link: '/en/modules/mathops' },
                  { text: 'BENCHMARK', link: '/en/modules/benchmark' },
                  { text: 'CARRIERROUTE', link: '/en/modules/carrierroute' },
                  { text: 'GFLAGS', link: '/en/modules/gflags' },
                  { text: 'PYTHON', link: '/en/modules/python' },
                  { text: 'LUA', link: '/en/modules/lua' },
                  { text: 'PERL', link: '/en/modules/perl' },
                  { text: 'MMGEOIP', link: '/en/modules/mmgeoip' },
                  { text: 'UUID', link: '/en/modules/uuid' },
                  { text: 'MQUEUE', link: '/en/modules/mqueue' },
                ]
              },
              {
                text: 'Auth modules',
                link: '/en/manual/Modules#auth-modules',
                collapsed: true,
                items: [
                  { text: 'AUTH_AAA', link: '/en/modules/auth_aaa' },
                  { text: 'AUTH', link: '/en/modules/auth' },
                  { text: 'AUTH_DB', link: '/en/modules/auth_db' },
                  { text: 'AUTH_JWT', link: '/en/modules/auth_jwt' },
                  { text: 'AUTH_AKA', link: '/en/modules/auth_aka' },
                  { text: 'AKA_AV_DIAMETER', link: '/en/modules/aka_av_diameter' },
                  { text: 'PERMISSIONS', link: '/en/modules/permissions' },
                ]
              },
              {
                text: 'Accounting & Billing modules',
                link: '/en/manual/Modules#accounting-billing-modules',
                collapsed: true,
                items: [
                  { text: 'ACC', link: '/en/modules/acc' },
                  { text: 'CALL CONTROL', link: '/en/modules/call_control' },
                  { text: 'CGRATES', link: '/en/modules/cgrates' },
                ]
              },
              {
                text: 'Dialplan Modules',
                link: '/en/manual/Modules#dialplan-modules',
                collapsed: true,
                items: [
                  { text: 'ALIAS_DB', link: '/en/modules/alias_db' },
                  { text: 'DIALPLAN', link: '/en/modules/dialplan' },
                  { text: 'DOMAIN', link: '/en/modules/domain' },
                  { text: 'DOMAINPOLICY', link: '/en/modules/domainpolicy' },
                  { text: 'GROUP', link: '/en/modules/group' },
                  { text: 'USERBLACKLIST', link: '/en/modules/userblacklist' },
                  { text: 'SPEEDDIAL', link: '/en/modules/speeddial' },
                  { text: 'PEERING', link: '/en/modules/peering' },
                ]
              },
              {
                text: 'Data caching',
                link: '/en/manual/Modules#data-caching',
                collapsed: true,
                items: [
                  { text: 'DNS_CACHE', link: '/en/modules/dns_cache' },
                  { text: 'RATE_CACHER', link: '/en/modules/rate_cacher' },
                  { text: 'SQL_CACHER', link: '/en/modules/sql_cacher' },
                  { text: 'TRIE', link: '/en/modules/trie' },
                  { text: 'USRLOC', link: '/en/modules/usrloc' },
                ]
              },
              {
                text: 'Traffic shaping module',
                link: '/en/manual/Modules#traffic-shaping-modules',
                collapsed: true,
                items: [
                  { text: 'PIKE', link: '/en/modules/pike' },
                  { text: 'QOS', link: '/en/modules/qos' },
                  { text: 'RATELIMIT', link: '/en/modules/ratelimit' },
                  { text: 'FRAUD_DETECTION', link: '/en/modules/fraud_detection' },
                ]
              },
            ]
          },
          {
            text: 'Database modules',
            link: '/en/manual/Modules#database-modules',
            collapsed: true,
            items: [
              {
                text: 'SQL modules',
                link: '/en/manual/Modules#sql-modules',
                collapsed: true,
                items: [
                  { text: 'DB_BERKELEY', link: '/en/modules/db_berkeley' },
                  { text: 'DB_CACHEDB', link: '/en/modules/db_cachedb' },
                  { text: 'DB_FLATSTORE', link: '/en/modules/db_flatstore' },
                  { text: 'DB_HTTP', link: '/en/modules/db_http' },
                  { text: 'DB_MYSQL', link: '/en/modules/db_mysql' },
                  { text: 'DB_ORACLE', link: '/en/modules/db_oracle' },
                  { text: 'DB_PERLVDB', link: '/en/modules/db_perlvdb' },
                  { text: 'DB_POSTGRES', link: '/en/modules/db_postgres' },
                  { text: 'DB_SQLITE', link: '/en/modules/db_sqlite' },
                  { text: 'DB_TEXT', link: '/en/modules/db_text' },
                  { text: 'DB_UNIXODBC', link: '/en/modules/db_unixodbc' },
                  { text: 'DB_VIRTUAL', link: '/en/modules/db_virtual' },
                ]
              },
              {
                text: 'noSQL modules',
                link: '/en/manual/Modules#nosql-modules',
                collapsed: true,
                items: [
                  { text: 'CACHEDB_CASSANDRA', link: '/en/modules/cachedb_cassandra' },
                  { text: 'CACHEDB_COUCHBASE', link: '/en/modules/cachedb_couchbase' },
                  { text: 'CACHEDB_DYNAMODB', link: '/en/modules/cachedb_dynamodb' },
                  { text: 'CACHEDB_LOCAL', link: '/en/modules/cachedb_local' },
                  { text: 'CACHEDB_MEMCACHED', link: '/en/modules/cachedb_memcached' },
                  { text: 'CACHEDB_MONGODB', link: '/en/modules/cachedb_mongodb' },
                  { text: 'CACHEDB_REDIS', link: '/en/modules/cachedb_redis' },
                  { text: 'CACHEDB_SQL', link: '/en/modules/cachedb_sql' },
                ]
              },
            ]
          },
          {
            text: 'External Integration modules',
            link: '/en/manual/Modules#external-integration-modules',
            collapsed: true,
            items: [
              {
                text: 'OpenSIPS API modules',
                link: '/en/manual/Modules#opensips-api-modules',
                collapsed: true,
                items: [
                  { text: 'EVENT_DATAGRAM', link: '/en/modules/event_datagram' },
                  { text: 'EVENT_FLATSTORE', link: '/en/modules/event_flatstore' },
                  { text: 'EVENT_KAFKA', link: '/en/modules/event_kafka' },
                  { text: 'EVENT_ROUTING', link: '/en/modules/event_routing' },
                  { text: 'EVENT_RABBITMQ', link: '/en/modules/event_rabbitmq' },
                  { text: 'EVENT_STREAM', link: '/en/modules/event_stream' },
                  { text: 'EVENT_SQS', link: '/en/modules/event_sqs' },
                  { text: 'EVENT_VIRTUAL', link: '/en/modules/event_virtual' },
                  { text: 'EVENT_XMLRPC', link: '/en/modules/event_xmlrpc' },
                  { text: 'MI_DATAGRAM', link: '/en/modules/mi_datagram' },
                  { text: 'MI_FIFO', link: '/en/modules/mi_fifo' },
                  { text: 'MI_HTML', link: '/en/modules/mi_html' },
                  { text: 'MI_HTTP', link: '/en/modules/mi_http' },
                  { text: 'MI_SCRIPT', link: '/en/modules/mi_script' },
                  { text: 'MI_XMLRPC_NG', link: '/en/modules/mi_xmlrpc_ng' },
                  { text: 'HTTPD', link: '/en/modules/httpd' },
                  { text: 'PI_HTTP', link: '/en/modules/pi_http' },
                  { text: 'RABBITMQ_CONSUMER', link: '/en/modules/rabbitmq_consumer' },
                  { text: 'STATISTICS', link: '/en/modules/statistics' },
                  { text: 'STATUS_REPORT', link: '/en/modules/status_report' },
                ]
              },
              {
                text: 'Media Relays',
                link: '/en/manual/Modules#media-relays',
                collapsed: true,
                items: [
                  { text: 'MEDIAPROXY', link: '/en/modules/mediaproxy' },
                  { text: 'MSRP_RELAY', link: '/en/modules/msrp_relay' },
                  { text: 'RTPENGINE', link: '/en/modules/rtpengine' },
                  { text: 'RTPPROXY', link: '/en/modules/rtpproxy' },
                  { text: 'RTP_RELAY', link: '/en/modules/rtp_relay' },
                ]
              },
              {
                text: 'External integration (non-SIP protocols)',
                link: '/en/manual/Modules#external-integration-non-sip',
                collapsed: true,
                items: [
                  { text: 'AAA_DIAMETER', link: '/en/modules/aaa_diameter' },
                  { text: 'AAA_RADIUS', link: '/en/modules/aaa_radius' },
                  { text: 'FREESWITCH', link: '/en/modules/freeswitch' },
                  { text: 'FREESWITCH_SCRIPTING', link: '/en/modules/freeswitch_scripting' },
                  { text: 'H350', link: '/en/modules/h350' },
                  { text: 'HTTP2D', link: '/en/modules/http2d' },
                  { text: 'JANUS', link: '/en/modules/janus' },
                  { text: 'JSONRPC', link: '/en/modules/jsonrpc' },
                  { text: 'LAUNCH_DARKLY', link: '/en/modules/launch_darkly' },
                  { text: 'LDAP', link: '/en/modules/ldap' },
                  { text: 'PROMETHEUS', link: '/en/modules/prometheus' },
                  { text: 'REST_CLIENT', link: '/en/modules/rest_client' },
                  { text: 'SIPCAPTURE', link: '/en/modules/sipcapture' },
                  { text: 'SIPREC', link: '/en/modules/siprec' },
                  { text: 'TRACER', link: '/en/modules/tracer' },
                  { text: 'SNGTC', link: '/en/modules/sngtc' },
                  { text: 'SNMPStats', link: '/en/modules/snmpstats' },
                  { text: 'STUN', link: '/en/modules/stun' },
                  { text: 'XMPP', link: '/en/modules/xmpp' },
                ]
              },
            ]
          },
          {
            text: 'OpenSIPS protocols and infrastructure',
            link: '/en/manual/Modules#opensips-protocols-infrastructure',
            collapsed: true,
            items: [
              { text: 'CLUSTERER', link: '/en/modules/clusterer' },
              { text: 'TLS_MGM', link: '/en/modules/tls_mgm' },
              { text: 'TLS_OPENSSL', link: '/en/modules/tls_openssl' },
              { text: 'TLS_WOLFSSL', link: '/en/modules/tls_wolfssl' },
              { text: 'TCP_MGM', link: '/en/modules/tcp_mgm' },
              { text: 'PROTO_BIN', link: '/en/modules/proto_bin' },
              { text: 'PROTO_BINS', link: '/en/modules/proto_bins' },
              { text: 'PROTO_HEP', link: '/en/modules/proto_hep' },
              { text: 'PROTO_IPSEC', link: '/en/modules/proto_ipsec' },
              { text: 'PROTO_MSRP', link: '/en/modules/proto_msrp' },
              { text: 'PROTO_SCTP', link: '/en/modules/proto_sctp' },
              { text: 'PROTO_TLS', link: '/en/modules/proto_tls' },
              { text: 'PROTO_WS', link: '/en/modules/proto_ws' },
              { text: 'PROTO_WSS', link: '/en/modules/proto_wss' },
              { text: 'PROTO_SMPP', link: '/en/modules/proto_smpp' },
              { text: 'SOCKETS_MGM', link: '/en/modules/sockets_mgm' },
            ]
          },
        ]
      },
      {
        text: 'OpenSIPS Interfaces',
        collapsed: true,
        items: [
          { text: 'MI interface', link: '/en/manual/Interface-MI' },
          { text: 'Core MI commands', link: '/en/manual/Interface-CoreMI' },
          { text: 'Event Interface', link: '/en/manual/Interface-Events' },
          { text: 'Core Events', link: '/en/manual/Interface-CoreEvents' },
          { text: 'Statistics Interface', link: '/en/manual/Interface-Statistics' },
          { text: 'Core Statistics', link: '/en/manual/Interface-CoreStatistics' },
          { text: 'Status/Report Interface', link: '/en/manual/Interface-StatusReport' },
          { text: 'Binary Internal Interface', link: '/en/manual/Interface-Binary' },
        ]
      },
      {
        text: 'OpenSIPS Testing',
        collapsed: true,
        items: [
          { text: 'Conformance Tests', link: '/en/manual/Conformance-Tests' },
        ]
      },
    ]
  },
  {
    text: 'Advanced Tutorials',
    collapsed: true,
    items: [
      { text: 'Tutorials Overview', link: '/en/tutorials/' },
      { text: 'Topology Hiding', link: '/en/tutorials/topology-hiding' },
      { text: 'Advanced Accounting', link: '/en/tutorials/advanced-accounting' },
      { text: 'Script Helper', link: '/en/tutorials/scripthelper' },
      { text: 'SIPREC Call Recording', link: '/en/tutorials/siprec' },
      { text: 'Fraud Detection', link: '/en/tutorials/frauddetection' },
      { text: 'Message Compression', link: '/en/tutorials/compression' },
      { text: 'Emergency Calls', link: '/en/tutorials/emergency' },
      { text: 'WebSocket Integration', link: '/en/tutorials/websocket' },
      { text: 'B2BUA', link: '/en/tutorials/b2bua' },
      { text: 'Presence Server', link: '/en/tutorials/presence-server' },
      { text: 'Presence User Agent', link: '/en/tutorials/presence-useragent' },
      { text: 'Presence RLS', link: '/en/tutorials/presence-rls' },
      { text: 'Load Balancing', link: '/en/tutorials/loadbalancing' },
      { text: 'Key-Value Interface', link: '/en/tutorials/keyvalueinterface' },
      { text: 'Event Interface', link: '/en/tutorials/eventinterface' },
      { text: 'Memory Caching', link: '/en/tutorials/memorycaching' },
      { text: 'FreeSWITCH Media Integration', link: '/en/tutorials/opensipsfreeswitchintegration' },
      { text: 'Asterisk Realtime Integration', link: '/en/tutorials/opensipsasteriskintegration' },
      { text: 'Concurrent Call Limits', link: '/en/tutorials/concurrentcallslimitation' },
      { text: 'TLS Setup', link: '/en/tutorials/tls' },
      { text: 'RADIUS Integration', link: '/en/tutorials/radius' },
      { text: 'SIP Redirect Server', link: '/en/tutorials/redirect' },
      { text: 'fail2ban Integration', link: '/en/tutorials/fail2ban' },
      { text: 'Sangoma Voice Transcoding', link: '/en/tutorials/sangomavoicetranscoding' },
      { text: 'Mid-Registrar', link: '/en/tutorials/midregistrar' },
      { text: 'Federated User Location', link: '/en/tutorials/distributed-user-location-federation' },
      { text: 'Full-Sharing User Location', link: '/en/tutorials/distributed-user-location-full-sharing' },
      { text: 'Diameter Accounting', link: '/en/tutorials/diameter-aaa' },
      { text: 'RCS Capabilities', link: '/en/tutorials/rcs-managing-capabilities' },
      { text: 'Diameter Client/Server', link: '/en/tutorials/diameter-client-server' },
    ]
  },
]

const zhSidebar = [
  {
    text: '基础教程',
    collapsed: false,
    items: [
      { text: '概览', link: '/zh/manual/README' },
      {
        text: '安装部署',
        collapsed: true,
        items: [
          { text: '下载 OpenSIPS', link: '/zh/manual/Install-Download' },
          { text: '编译与安装 OpenSIPS', link: '/zh/manual/Install-CompileAndInstall' },
          { text: '数据库部署', link: '/zh/manual/Install-DBDeployment' },
          { text: '数据库表结构', link: '/zh/manual/Install-DBSchema' },
        ]
      },
      {
        text: '配置指南',
        collapsed: true,
        items: [
          { text: '配置文件', link: '/zh/manual/Configure-File' },
          { text: '生成 opensips.cfg 文件', link: '/zh/manual/Generating-Configs' },
          { text: '模板化 opensips.cfg 文件', link: '/zh/manual/Templating-Config-Files' },
        ]
      },
      {
        text: 'OpenSIPS 脚本',
        collapsed: true,
        items: [
          { text: '脚本语法', link: '/zh/manual/Script-Syntax' },
          { text: '核心参数', link: '/zh/manual/Script-CoreParameters' },
          { text: '路由类型', link: '/zh/manual/Script-Routes' },
          { text: '脚本运算符', link: '/zh/manual/Script-Operators' },
          { text: '脚本语句', link: '/zh/manual/Script-Statements' },
          { text: '核心函数', link: '/zh/manual/Script-CoreFunctions' },
          { text: '核心变量', link: '/zh/manual/Script-CoreVar' },
          { text: '脚本标志位', link: '/zh/manual/Script-Flags' },
          { text: '数据变换', link: '/zh/manual/Script-Tran' },
          { text: '异步语句', link: '/zh/manual/Script-Async' },
        ]
      },
      {
        text: '模块',
        collapsed: true,
        items: [
          { text: '模块文档索引', link: '/zh/manual/Modules' },
          {
            text: 'SIP 相关模块',
            link: '/zh/manual/Modules#sip-related-modules',
            collapsed: true,
            items: [
              {
                text: 'SIP 信令模块',
                link: '/zh/manual/Modules#sip-signaling-modules',
                collapsed: true,
                items: [
                  { text: 'B2B_ENTITIES', link: '/zh/modules/b2b_entities' },
                  { text: 'B2B_LOGIC', link: '/zh/modules/b2b_logic' },
                  { text: 'CALL CENTER', link: '/zh/modules/call_center' },
                  { text: 'DIALOG', link: '/zh/modules/dialog' },
                  { text: 'NAT_TRAVERSAL', link: '/zh/modules/nat_traversal' },
                  { text: 'NATHELPER', link: '/zh/modules/nathelper' },
                  { text: 'OPTIONS', link: '/zh/modules/options' },
                  { text: 'REGISTRAR', link: '/zh/modules/registrar' },
                  { text: 'SIGNALING', link: '/zh/modules/signaling' },
                  { text: 'UAC_REGISTRANT', link: '/zh/modules/uac_registrant' },
                  { text: 'TM', link: '/zh/modules/tm' },
                  { text: 'SL', link: '/zh/modules/sl' },
                  { text: 'MEDIA_EXCHANGE', link: '/zh/modules/media_exchange' },
                  { text: 'CALLOPS', link: '/zh/modules/callops' },
                  { text: 'B2B_SDP_DEMUX', link: '/zh/modules/b2b_sdp_demux' },
                  { text: 'MSRP_UA', link: '/zh/modules/msrp_ua' },
                ]
              },
              {
                text: 'SIP 路由模块',
                link: '/zh/manual/Modules#sip-routing-modules',
                collapsed: true,
                items: [
                  { text: 'CARRIERROUTE', link: '/zh/modules/carrierroute' },
                  { text: 'CPL_C', link: '/zh/modules/cpl_c' },
                  { text: 'DISPATCHER', link: '/zh/modules/dispatcher' },
                  { text: 'DROUTING', link: '/zh/modules/drouting' },
                  { text: 'QROUTING', link: '/zh/modules/qrouting' },
                  { text: 'EMERGENCY', link: '/zh/modules/emergency' },
                  { text: 'ENUM', link: '/zh/modules/enum' },
                  { text: 'JABBER', link: '/zh/modules/jabber' },
                  { text: 'IMC', link: '/zh/modules/imc' },
                  { text: 'LOAD_BALANCER', link: '/zh/modules/load_balancer' },
                  { text: 'MID_REGISTRAR', link: '/zh/modules/mid_registrar' },
                  { text: 'MSILO', link: '/zh/modules/msilo' },
                  { text: 'MSRP_GATEWAY', link: '/zh/modules/msrp_gateway' },
                  { text: 'RR', link: '/zh/modules/rr' },
                  { text: 'SCRIPT_HELPER', link: '/zh/modules/script_helper' },
                  { text: 'OSP', link: '/zh/modules/osp' },
                ]
              },
              {
                text: 'SIP 消息操作',
                link: '/zh/manual/Modules#sip-message-operations',
                collapsed: true,
                items: [
                  { text: 'COMPRESSION', link: '/zh/modules/compression' },
                  { text: 'DIVERSION', link: '/zh/modules/diversion' },
                  { text: 'IDENTITY', link: '/zh/modules/identity' },
                  { text: 'MAXFWD', link: '/zh/modules/maxfwd' },
                  { text: 'MANGLER', link: '/zh/modules/mangler' },
                  { text: 'PATH', link: '/zh/modules/path' },
                  { text: 'SIP_I', link: '/zh/modules/sip_i' },
                  { text: 'SIPMSGOPS', link: '/zh/modules/sipmsgops' },
                  { text: 'STIR_SHAKEN', link: '/zh/modules/stir_shaken' },
                  { text: 'TOPOLOGY_HIDING', link: '/zh/modules/topology_hiding' },
                  { text: 'UAC', link: '/zh/modules/uac' },
                  { text: 'UAC_AUTH', link: '/zh/modules/uac_auth' },
                  { text: 'UAC_REDIRECT', link: '/zh/modules/uac_redirect' },
                  { text: 'SST', link: '/zh/modules/sst' },
                ]
              },
              {
                text: 'SIP 呈现模块',
                link: '/zh/manual/Modules#sip-presence-modules',
                collapsed: true,
                items: [
                  { text: 'PRESENCE', link: '/zh/modules/presence' },
                  { text: 'PRESENCE_CALLINFO', link: '/zh/modules/presence_callinfo' },
                  { text: 'PRESENCE_DIALOGINFO', link: '/zh/modules/presence_dialoginfo' },
                  { text: 'PRESENCE_DFKS', link: '/zh/modules/presence_dfks' },
                  { text: 'PRESENCE_MWI', link: '/zh/modules/presence_mwi' },
                  { text: 'PRESENCE_REGINFO', link: '/zh/modules/presence_reginfo' },
                  { text: 'PRESENCE_XCAPDIFF', link: '/zh/modules/presence_xcapdiff' },
                  { text: 'PRESENCE_XML', link: '/zh/modules/presence_xml' },
                  { text: 'PUA', link: '/zh/modules/pua' },
                  { text: 'PUA_BLA', link: '/zh/modules/pua_bla' },
                  { text: 'PUA_DIALOGINFO', link: '/zh/modules/pua_dialoginfo' },
                  { text: 'PUA_MI', link: '/zh/modules/pua_mi' },
                  { text: 'PUA_REGINFO', link: '/zh/modules/pua_reginfo' },
                  { text: 'PUA_USRLOC', link: '/zh/modules/pua_usrloc' },
                  { text: 'PUA_XMPP', link: '/zh/modules/pua_xmpp' },
                  { text: 'B2B_SCA', link: '/zh/modules/b2b_sca' },
                  { text: 'RLS', link: '/zh/modules/rls' },
                  { text: 'XCAP', link: '/zh/modules/xcap' },
                  { text: 'XCAP_CLIENT', link: '/zh/modules/xcap_client' },
                ]
              },
            ]
          },
          {
            text: '脚本模块',
            link: '/zh/manual/Modules#scripting-modules',
            collapsed: true,
            items: [
              {
                text: '脚本辅助模块',
                link: '/zh/manual/Modules#script-helper-modules',
                collapsed: true,
                items: [
                  { text: 'JSON', link: '/zh/modules/json' },
                  { text: 'XML', link: '/zh/modules/xml' },
                  { text: 'CFGUTILS', link: '/zh/modules/cfgutils' },
                  { text: 'CONFIG', link: '/zh/modules/config' },
                  { text: 'EXEC', link: '/zh/modules/exec' },
                  { text: 'TEXTOPS', link: '/zh/modules/textops' },
                  { text: 'SQLOPS', link: '/zh/modules/sqlops' },
                  { text: 'REGEX', link: '/zh/modules/regex' },
                  { text: 'MATHOPS', link: '/zh/modules/mathops' },
                  { text: 'BENCHMARK', link: '/zh/modules/benchmark' },
                  { text: 'CARRIERROUTE', link: '/zh/modules/carrierroute' },
                  { text: 'GFLAGS', link: '/zh/modules/gflags' },
                  { text: 'PYTHON', link: '/zh/modules/python' },
                  { text: 'LUA', link: '/zh/modules/lua' },
                  { text: 'PERL', link: '/zh/modules/perl' },
                  { text: 'MMGEOIP', link: '/zh/modules/mmgeoip' },
                  { text: 'UUID', link: '/zh/modules/uuid' },
                  { text: 'MQUEUE', link: '/zh/modules/mqueue' },
                ]
              },
              {
                text: '鉴权模块',
                link: '/zh/manual/Modules#auth-modules',
                collapsed: true,
                items: [
                  { text: 'AUTH_AAA', link: '/zh/modules/auth_aaa' },
                  { text: 'AUTH', link: '/zh/modules/auth' },
                  { text: 'AUTH_DB', link: '/zh/modules/auth_db' },
                  { text: 'AUTH_JWT', link: '/zh/modules/auth_jwt' },
                  { text: 'AUTH_AKA', link: '/zh/modules/auth_aka' },
                  { text: 'AKA_AV_DIAMETER', link: '/zh/modules/aka_av_diameter' },
                  { text: 'PERMISSIONS', link: '/zh/modules/permissions' },
                ]
              },
              {
                text: '计费与结算模块',
                link: '/zh/manual/Modules#accounting-billing-modules',
                collapsed: true,
                items: [
                  { text: 'ACC', link: '/zh/modules/acc' },
                  { text: 'CALL CONTROL', link: '/zh/modules/call_control' },
                  { text: 'CGRATES', link: '/zh/modules/cgrates' },
                ]
              },
              {
                text: '拨号计划模块',
                link: '/zh/manual/Modules#dialplan-modules',
                collapsed: true,
                items: [
                  { text: 'ALIAS_DB', link: '/zh/modules/alias_db' },
                  { text: 'DIALPLAN', link: '/zh/modules/dialplan' },
                  { text: 'DOMAIN', link: '/zh/modules/domain' },
                  { text: 'DOMAINPOLICY', link: '/zh/modules/domainpolicy' },
                  { text: 'GROUP', link: '/zh/modules/group' },
                  { text: 'USERBLACKLIST', link: '/zh/modules/userblacklist' },
                  { text: 'SPEEDDIAL', link: '/zh/modules/speeddial' },
                  { text: 'PEERING', link: '/zh/modules/peering' },
                ]
              },
              {
                text: '数据缓存',
                link: '/zh/manual/Modules#data-caching',
                collapsed: true,
                items: [
                  { text: 'DNS_CACHE', link: '/zh/modules/dns_cache' },
                  { text: 'RATE_CACHER', link: '/zh/modules/rate_cacher' },
                  { text: 'SQL_CACHER', link: '/zh/modules/sql_cacher' },
                  { text: 'TRIE', link: '/zh/modules/trie' },
                  { text: 'USRLOC', link: '/zh/modules/usrloc' },
                ]
              },
              {
                text: '流量整形模块',
                link: '/zh/manual/Modules#traffic-shaping-modules',
                collapsed: true,
                items: [
                  { text: 'PIKE', link: '/zh/modules/pike' },
                  { text: 'QOS', link: '/zh/modules/qos' },
                  { text: 'RATELIMIT', link: '/zh/modules/ratelimit' },
                  { text: 'FRAUD_DETECTION', link: '/zh/modules/fraud_detection' },
                ]
              },
            ]
          },
          {
            text: '数据库模块',
            link: '/zh/manual/Modules#database-modules',
            collapsed: true,
            items: [
              {
                text: 'SQL 模块',
                link: '/zh/manual/Modules#sql-modules',
                collapsed: true,
                items: [
                  { text: 'DB_BERKELEY', link: '/zh/modules/db_berkeley' },
                  { text: 'DB_CACHEDB', link: '/zh/modules/db_cachedb' },
                  { text: 'DB_FLATSTORE', link: '/zh/modules/db_flatstore' },
                  { text: 'DB_HTTP', link: '/zh/modules/db_http' },
                  { text: 'DB_MYSQL', link: '/zh/modules/db_mysql' },
                  { text: 'DB_ORACLE', link: '/zh/modules/db_oracle' },
                  { text: 'DB_PERLVDB', link: '/zh/modules/db_perlvdb' },
                  { text: 'DB_POSTGRES', link: '/zh/modules/db_postgres' },
                  { text: 'DB_SQLITE', link: '/zh/modules/db_sqlite' },
                  { text: 'DB_TEXT', link: '/zh/modules/db_text' },
                  { text: 'DB_UNIXODBC', link: '/zh/modules/db_unixodbc' },
                  { text: 'DB_VIRTUAL', link: '/zh/modules/db_virtual' },
                ]
              },
              {
                text: 'noSQL 模块',
                link: '/zh/manual/Modules#nosql-modules',
                collapsed: true,
                items: [
                  { text: 'CACHEDB_CASSANDRA', link: '/zh/modules/cachedb_cassandra' },
                  { text: 'CACHEDB_COUCHBASE', link: '/zh/modules/cachedb_couchbase' },
                  { text: 'CACHEDB_DYNAMODB', link: '/zh/modules/cachedb_dynamodb' },
                  { text: 'CACHEDB_LOCAL', link: '/zh/modules/cachedb_local' },
                  { text: 'CACHEDB_MEMCACHED', link: '/zh/modules/cachedb_memcached' },
                  { text: 'CACHEDB_MONGODB', link: '/zh/modules/cachedb_mongodb' },
                  { text: 'CACHEDB_REDIS', link: '/zh/modules/cachedb_redis' },
                  { text: 'CACHEDB_SQL', link: '/zh/modules/cachedb_sql' },
                ]
              },
            ]
          },
          {
            text: '外部集成模块',
            link: '/zh/manual/Modules#external-integration-modules',
            collapsed: true,
            items: [
              {
                text: 'OpenSIPS API 模块',
                link: '/zh/manual/Modules#opensips-api-modules',
                collapsed: true,
                items: [
                  { text: 'EVENT_DATAGRAM', link: '/zh/modules/event_datagram' },
                  { text: 'EVENT_FLATSTORE', link: '/zh/modules/event_flatstore' },
                  { text: 'EVENT_KAFKA', link: '/zh/modules/event_kafka' },
                  { text: 'EVENT_ROUTING', link: '/zh/modules/event_routing' },
                  { text: 'EVENT_RABBITMQ', link: '/zh/modules/event_rabbitmq' },
                  { text: 'EVENT_STREAM', link: '/zh/modules/event_stream' },
                  { text: 'EVENT_SQS', link: '/zh/modules/event_sqs' },
                  { text: 'EVENT_VIRTUAL', link: '/zh/modules/event_virtual' },
                  { text: 'EVENT_XMLRPC', link: '/zh/modules/event_xmlrpc' },
                  { text: 'MI_DATAGRAM', link: '/zh/modules/mi_datagram' },
                  { text: 'MI_FIFO', link: '/zh/modules/mi_fifo' },
                  { text: 'MI_HTML', link: '/zh/modules/mi_html' },
                  { text: 'MI_HTTP', link: '/zh/modules/mi_http' },
                  { text: 'MI_SCRIPT', link: '/zh/modules/mi_script' },
                  { text: 'MI_XMLRPC_NG', link: '/zh/modules/mi_xmlrpc_ng' },
                  { text: 'HTTPD', link: '/zh/modules/httpd' },
                  { text: 'PI_HTTP', link: '/zh/modules/pi_http' },
                  { text: 'RABBITMQ_CONSUMER', link: '/zh/modules/rabbitmq_consumer' },
                  { text: 'STATISTICS', link: '/zh/modules/statistics' },
                  { text: 'STATUS_REPORT', link: '/zh/modules/status_report' },
                ]
              },
              {
                text: '媒体中继',
                link: '/zh/manual/Modules#media-relays',
                collapsed: true,
                items: [
                  { text: 'MEDIAPROXY', link: '/zh/modules/mediaproxy' },
                  { text: 'MSRP_RELAY', link: '/zh/modules/msrp_relay' },
                  { text: 'RTPENGINE', link: '/zh/modules/rtpengine' },
                  { text: 'RTPPROXY', link: '/zh/modules/rtpproxy' },
                  { text: 'RTP_RELAY', link: '/zh/modules/rtp_relay' },
                ]
              },
              {
                text: '外部集成（非 SIP 协议）',
                link: '/zh/manual/Modules#external-integration-non-sip',
                collapsed: true,
                items: [
                  { text: 'AAA_DIAMETER', link: '/zh/modules/aaa_diameter' },
                  { text: 'AAA_RADIUS', link: '/zh/modules/aaa_radius' },
                  { text: 'FREESWITCH', link: '/zh/modules/freeswitch' },
                  { text: 'FREESWITCH_SCRIPTING', link: '/zh/modules/freeswitch_scripting' },
                  { text: 'H350', link: '/zh/modules/h350' },
                  { text: 'HTTP2D', link: '/zh/modules/http2d' },
                  { text: 'JANUS', link: '/zh/modules/janus' },
                  { text: 'JSONRPC', link: '/zh/modules/jsonrpc' },
                  { text: 'LAUNCH_DARKLY', link: '/zh/modules/launch_darkly' },
                  { text: 'LDAP', link: '/zh/modules/ldap' },
                  { text: 'PROMETHEUS', link: '/zh/modules/prometheus' },
                  { text: 'REST_CLIENT', link: '/zh/modules/rest_client' },
                  { text: 'SIPCAPTURE', link: '/zh/modules/sipcapture' },
                  { text: 'SIPREC', link: '/zh/modules/siprec' },
                  { text: 'TRACER', link: '/zh/modules/tracer' },
                  { text: 'SNGTC', link: '/zh/modules/sngtc' },
                  { text: 'SNMPStats', link: '/zh/modules/snmpstats' },
                  { text: 'STUN', link: '/zh/modules/stun' },
                  { text: 'XMPP', link: '/zh/modules/xmpp' },
                ]
              },
            ]
          },
          {
            text: 'OpenSIPS 协议与基础设施',
            link: '/zh/manual/Modules#opensips-protocols-infrastructure',
            collapsed: true,
            items: [
              { text: 'CLUSTERER', link: '/zh/modules/clusterer' },
              { text: 'TLS_MGM', link: '/zh/modules/tls_mgm' },
              { text: 'TLS_OPENSSL', link: '/zh/modules/tls_openssl' },
              { text: 'TLS_WOLFSSL', link: '/zh/modules/tls_wolfssl' },
              { text: 'TCP_MGM', link: '/zh/modules/tcp_mgm' },
              { text: 'PROTO_BIN', link: '/zh/modules/proto_bin' },
              { text: 'PROTO_BINS', link: '/zh/modules/proto_bins' },
              { text: 'PROTO_HEP', link: '/zh/modules/proto_hep' },
              { text: 'PROTO_IPSEC', link: '/zh/modules/proto_ipsec' },
              { text: 'PROTO_MSRP', link: '/zh/modules/proto_msrp' },
              { text: 'PROTO_SCTP', link: '/zh/modules/proto_sctp' },
              { text: 'PROTO_TLS', link: '/zh/modules/proto_tls' },
              { text: 'PROTO_WS', link: '/zh/modules/proto_ws' },
              { text: 'PROTO_WSS', link: '/zh/modules/proto_wss' },
              { text: 'PROTO_SMPP', link: '/zh/modules/proto_smpp' },
              { text: 'SOCKETS_MGM', link: '/zh/modules/sockets_mgm' },
            ]
          },
        ]
      },
      {
        text: 'OpenSIPS 接口',
        collapsed: true,
        items: [
          { text: 'MI 管理接口', link: '/zh/manual/Interface-MI' },
          { text: '核心 MI 命令', link: '/zh/manual/Interface-CoreMI' },
          { text: '事件接口', link: '/zh/manual/Interface-Events' },
          { text: '核心事件', link: '/zh/manual/Interface-CoreEvents' },
          { text: '统计接口', link: '/zh/manual/Interface-Statistics' },
          { text: '核心统计项', link: '/zh/manual/Interface-CoreStatistics' },
          { text: '状态/报告接口', link: '/zh/manual/Interface-StatusReport' },
          { text: '二进制内部接口', link: '/zh/manual/Interface-Binary' },
        ]
      },
      {
        text: 'OpenSIPS 测试',
        collapsed: true,
        items: [
          { text: '一致性自动化测试', link: '/zh/manual/Conformance-Tests' },
        ]
      },
    ]
  },
  {
    text: '进阶教程',
    collapsed: true,
    items: [
      { text: '教程总览', link: '/zh/tutorials/' },
      { text: '拓扑隐藏', link: '/zh/tutorials/topology-hiding' },
      { text: '高级计费', link: '/zh/tutorials/advanced-accounting' },
      { text: '脚本辅助', link: '/zh/tutorials/scripthelper' },
      { text: 'SIPREC 呼叫录音', link: '/zh/tutorials/siprec' },
      { text: '欺诈检测', link: '/zh/tutorials/frauddetection' },
      { text: '消息压缩', link: '/zh/tutorials/compression' },
      { text: '紧急呼叫', link: '/zh/tutorials/emergency' },
      { text: 'WebSocket 集成', link: '/zh/tutorials/websocket' },
      { text: 'B2BUA', link: '/zh/tutorials/b2bua' },
      { text: '呈现服务器', link: '/zh/tutorials/presence-server' },
      { text: '呈现用户代理', link: '/zh/tutorials/presence-useragent' },
      { text: '呈现 RLS', link: '/zh/tutorials/presence-rls' },
      { text: '负载均衡', link: '/zh/tutorials/loadbalancing' },
      { text: '键值接口', link: '/zh/tutorials/keyvalueinterface' },
      { text: '事件接口', link: '/zh/tutorials/eventinterface' },
      { text: '内存缓存', link: '/zh/tutorials/memorycaching' },
      { text: 'FreeSWITCH 媒体集成', link: '/zh/tutorials/opensipsfreeswitchintegration' },
      { text: 'Asterisk 实时集成', link: '/zh/tutorials/opensipsasteriskintegration' },
      { text: '并发呼叫限制', link: '/zh/tutorials/concurrentcallslimitation' },
      { text: 'TLS 配置', link: '/zh/tutorials/tls' },
      { text: 'RADIUS 集成', link: '/zh/tutorials/radius' },
      { text: 'SIP 重定向服务器', link: '/zh/tutorials/redirect' },
      { text: 'fail2ban 集成', link: '/zh/tutorials/fail2ban' },
      { text: 'Sangoma 语音转码', link: '/zh/tutorials/sangomavoicetranscoding' },
      { text: '中继注册', link: '/zh/tutorials/midregistrar' },
      { text: '联邦式用户位置', link: '/zh/tutorials/distributed-user-location-federation' },
      { text: '全共享用户位置', link: '/zh/tutorials/distributed-user-location-full-sharing' },
      { text: 'Diameter 计费', link: '/zh/tutorials/diameter-aaa' },
      { text: 'RCS 能力管理', link: '/zh/tutorials/rcs-managing-capabilities' },
      { text: 'Diameter 客户端/服务器', link: '/zh/tutorials/diameter-client-server' },
    ]
  },
]

export default defineConfig({
  base: '/rtc/docs/opensips/',
  title: "OpenSIPS Docs",
  description: "OpenSIPS SIP Server Bilingual Documentation",
  lastUpdated: true,
  cleanUrls: false,
  ignoreDeadLinks: true,

  locales: {
    root: {
      label: 'English',
      lang: 'en',
      link: '/en/',
      themeConfig: {
        nav: [
          { text: 'Home', link: '/en/' },
          { text: 'Manual', link: '/en/manual/README' },
          { text: 'Modules', link: '/en/manual/Modules' },
          { text: 'Tutorials', link: '/en/tutorials/' },
          { text: 'GitHub', link: 'https://github.com/OpenSIPS/opensips' }
        ],
        sidebar: {
          '/en/': enSidebar
        },
        footer: {
          message: 'Translated from the official OpenSIPS manual.',
          copyright: 'Copyright © OpenSIPS Project · GPL Licensed'
        }
      }
    },
    zh: {
      label: '简体中文',
      lang: 'zh-CN',
      link: '/zh/',
      themeConfig: {
        nav: [
          { text: '首页', link: '/zh/' },
          { text: '核心手册', link: '/zh/manual/README' },
          { text: '模块索引', link: '/zh/manual/Modules' },
          { text: '进阶教程', link: '/zh/tutorials/' },
          { text: '源码仓库', link: 'https://github.com/OpenSIPS/opensips' }
        ],
        sidebar: {
          '/zh/': zhSidebar
        },
        footer: {
          message: '文档译自 OpenSIPS 官方手册',
          copyright: 'Copyright © OpenSIPS Project · GPL 许可证'
        },
        docFooter: {
          prev: '上一篇',
          next: '下一篇'
        },
        outline: {
          label: '本页目录'
        },
        lastUpdated: {
          text: '最后更新于'
        }
      }
    }
  },

  themeConfig: {
    search: {
      provider: 'local',
      options: {
        locales: {
          zh: {
            translations: {
              button: {
                buttonText: '搜索文档',
                buttonAriaLabel: '搜索文档'
              },
              modal: {
                noResultsText: '无法找到相关结果',
                resetButtonTitle: '清除查询条件',
                footer: {
                  selectText: '选择',
                  navigateText: '切换',
                  closeText: '关闭'
                }
              }
            }
          }
        }
      }
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/OpenSIPS/opensips' }
    ]
  }
})
