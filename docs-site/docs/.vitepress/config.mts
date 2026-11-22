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
          { text: 'Modules Index', link: '/en/manual/Modules' },
          {
            text: 'SIP related modules',
            link: '/en/manual/Modules#sip-related-modules',
            collapsed: true,
            items: [
              { text: 'SIP signaling modules', link: '/en/manual/Modules#sip-signaling-modules' },
              { text: 'SIP Routing modules', link: '/en/manual/Modules#sip-routing-modules' },
              { text: 'SIP messaging operations', link: '/en/manual/Modules#sip-message-operations' },
              { text: 'SIP Presence Modules', link: '/en/manual/Modules#sip-presence-modules' },
            ]
          },
          {
            text: 'Scripting modules',
            link: '/en/manual/Modules#scripting-modules',
            collapsed: true,
            items: [
              { text: 'Script helper modules', link: '/en/manual/Modules#script-helper-modules' },
              { text: 'Auth modules', link: '/en/manual/Modules#auth-modules' },
              { text: 'Accounting & Billing modules', link: '/en/manual/Modules#accounting-billing-modules' },
              { text: 'Dialplan Modules', link: '/en/manual/Modules#dialplan-modules' },
              { text: 'Data caching', link: '/en/manual/Modules#data-caching' },
              { text: 'Traffic shaping module', link: '/en/manual/Modules#traffic-shaping-modules' },
            ]
          },
          {
            text: 'Database modules',
            link: '/en/manual/Modules#database-modules',
            collapsed: true,
            items: [
              { text: 'SQL modules', link: '/en/manual/Modules#sql-modules' },
              { text: 'noSQL modules', link: '/en/manual/Modules#nosql-modules' },
            ]
          },
          {
            text: 'External Integration modules',
            link: '/en/manual/Modules#external-integration-modules',
            collapsed: true,
            items: [
              { text: 'OpenSIPS API modules', link: '/en/manual/Modules#opensips-api-modules' },
              { text: 'Media Relays', link: '/en/manual/Modules#media-relays' },
              { text: 'External integration (non-SIP protocols)', link: '/en/manual/Modules#external-integration-non-sip' },
            ]
          },
          { text: 'OpenSIPS protocols and infrastructure', link: '/en/manual/Modules#opensips-protocols-infrastructure' },
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
              { text: 'SIP 信令模块', link: '/zh/manual/Modules#sip-signaling-modules' },
              { text: 'SIP 路由模块', link: '/zh/manual/Modules#sip-routing-modules' },
              { text: 'SIP 消息操作', link: '/zh/manual/Modules#sip-message-operations' },
              { text: 'SIP 呈现模块', link: '/zh/manual/Modules#sip-presence-modules' },
            ]
          },
          {
            text: '脚本模块',
            link: '/zh/manual/Modules#scripting-modules',
            collapsed: true,
            items: [
              { text: '脚本辅助模块', link: '/zh/manual/Modules#script-helper-modules' },
              { text: '鉴权模块', link: '/zh/manual/Modules#auth-modules' },
              { text: '计费与结算模块', link: '/zh/manual/Modules#accounting-billing-modules' },
              { text: '拨号计划模块', link: '/zh/manual/Modules#dialplan-modules' },
              { text: '数据缓存', link: '/zh/manual/Modules#data-caching' },
              { text: '流量整形模块', link: '/zh/manual/Modules#traffic-shaping-modules' },
            ]
          },
          {
            text: '数据库模块',
            link: '/zh/manual/Modules#database-modules',
            collapsed: true,
            items: [
              { text: 'SQL 模块', link: '/zh/manual/Modules#sql-modules' },
              { text: 'noSQL 模块', link: '/zh/manual/Modules#nosql-modules' },
            ]
          },
          {
            text: '外部集成模块',
            link: '/zh/manual/Modules#external-integration-modules',
            collapsed: true,
            items: [
              { text: 'OpenSIPS API 模块', link: '/zh/manual/Modules#opensips-api-modules' },
              { text: '媒体中继', link: '/zh/manual/Modules#media-relays' },
              { text: '外部集成（非 SIP 协议）', link: '/zh/manual/Modules#external-integration-non-sip' },
            ]
          },
          { text: 'OpenSIPS 协议与基础设施', link: '/zh/manual/Modules#opensips-protocols-infrastructure' },
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
