# OpenSIPS 中文文档翻译规范与术语表

> 本文件是 `docs-site/docs/zh/` 中文文档的唯一翻译依据。所有译文必须严格遵循本规范；本表未覆盖的术语，按「一、总则」的判定原则处理，并追加到本表。

## 一、总则（硬性规则）

1. **只译自然语言**。代码、命令、路径、配置项、参数名、函数名、模块名、MI 命令、事件名、统计项名、伪变量名，一律原样保留，不译、不改大小写、不加空格。
2. **代码块逐字保留**。``` 围栏内的内容不得改动。允许的例外仅两类：一是 `#` / `//` / `/* */` 注释可译为中文（保持缩进与行数）；二是整块都是取值说明的伪代码（形如 `true - 说明` / `false - 说明`）可译为中文并保持对齐。与代码写在**同一行**的说明文字（如 `$var(in) = "485"; (also works...)`）必须保留原文，避免全角字符破坏可复制性。若注释本身是命令输出或示例数据，不译。
3. **Markdown 结构不动**。标题层级、列表符号、引用块、告警块（`> [!NOTE]`）、分隔线、相对链接、图片全部保持原样；不合并段落、不删减内容、不新增原文没有的说明。
4. **锚点必须保留**。原文形如 `[script variables](#script-variables)` 的文内链接，对应译文标题必须写成 `## 脚本变量 {#script-variables}`，即在中文标题后显式加 `{#原英文锚点}`，保证链接不失效。
5. **修正原文笔误**。英文源存在明显拼写错误（如 OpenSIPs → OpenSIPS、pseudo0variable → pseudo-variable、inherite → inherit、relaces → releases、event_flastore → event_flatstore、RabbbitMQ → RabbitMQ），按正确含义理解后再译，不得照抄错误。
6. **不增不减**。不补充原文没有的解释，不省略任何句子；英文一个段落对应中文一个段落。

## 二、原样保留（不翻译）

**协议与技术缩写**：SIP、SDP、RTP、RTCP、SRTP、RTCP-MUX、ICE、STUN、TURN、DTLS、TLS、SSL、WSS、WS、UDP、TCP、SCTP、IPv4、IPv6、IP、DNS、SRV、NAPTR、ENUM、HTTP、HTTPS、JSON、JSON-RPC、XML-RPC、XML、YAML、API、URI、URL、FQDN、NAT、QoS、ToS、DSCP、MWI、BLF、CDR、SQL、LDAP、RADIUS、DIAMETER、XMPP、MSRP、SMPP、B2BUA、UA、UAC、UAS、PNR、AVP、PV、MI、TM、RR、SL、ACC、AAA、DB、KV、TTL、CPS、SLA、PEM、CRL、CA、SNI、SASL、OCSP、ASR、ACD、IVR、DID

**SIP 方法与头域**：INVITE、ACK、BYE、CANCEL、REGISTER、OPTIONS、SUBSCRIBE、NOTIFY、PUBLISH、MESSAGE、INFO、PRACK、UPDATE、REFER；From、To、Call-ID、CSeq、Contact、Via、Route、Record-Route、Max-Forwards、Content-Type、Content-Length、Expires、WWW-Authenticate、Proxy-Authenticate、Authorization、Allow、Supported、Require、User-Agent、Reason、P-Asserted-Identity、Diversion、Remote-Party-ID

**状态码与应答名**：100 Trying、180 Ringing、200 OK、1xx、2xx、3xx、4xx、5xx、6xx、401、403、404、407、408、480、486、487、488、500、503、603、604

**标识符类（全部不译）**：

- 伪变量：`$ru`、`$du`、`$fu`、`$tu`、`$ci`、`$ct`、`$avp()`、`$var()`、`$hdr()`、`$sbranch()` 等
- 函数：`t_relay()`、`t_newtran()`、`sl_send_reply()`、`xlog()`、`append_hf()`、`ds_select_dst()` 等
- 模块名：`tm`、`sl`、`rr`、`dialog`、`usrloc`、`registrar`、`dispatcher`、`drouting`、`b2b_logic`、`b2b_entities`、`presence`、`pua`、`rls`、`mediaproxy`、`rtpengine`、`cachedb_redis`、`db_mysql`、`mi_fifo`、`mi_datagram`、`mi_http`、`mi_html`、`mi_xmlrpc_ng`、`mi_script`、`clusterer`、`ratelimit`、`fraud_detection`、`proto_udp`、`proto_tcp`、`proto_tls` 等
- 配置项、参数名、MI 命令名、事件名、统计项名、内核参数名
- 文件名、目录名、`.so` / `.cfg` / `.m4` 等后缀

## 三、固定译法

| English | 中文 | 说明 |
|---|---|---|
| core | 核心 | |
| module | 模块 | |
| script | 脚本 | |
| configuration file | 配置文件 | |
| parameter | 参数 | |
| pseudo-variable | 伪变量 | 首次出现可写「伪变量（pseudo-variable）」 |
| transformation | 变换 | |
| route | 路由 | `request_route` 等标识符不译 |
| script route | 脚本路由 | |
| sub-route | 子路由 | |
| request route | 请求路由 | |
| reply route / onreply route | 应答路由 | |
| failure route | 失败路由 | |
| branch route | 分支路由 | |
| local route | 本地路由 | |
| error route | 错误路由 | |
| startup route | 启动路由 | |
| timer route | 定时器路由 | |
| event route | 事件路由 | |
| routing logic | 路由逻辑 | |
| route block | 路由块 | |
| request | 请求 | SIP 语境 |
| reply | 应答 | SIP 语境统一用「应答」 |
| response | 响应 | 用于 HTTP / JSON 语境 |
| provisional response | 临时应答 | 1xx |
| final response | 最终应答 | |
| transaction | 事务 | |
| stateful | 有状态 | |
| stateless | 无状态 | |
| dialog | 对话 | SIP dialog |
| session | 会话 | |
| call | 呼叫 | |
| branch | 分支 | |
| flag | 标志位 | message flag → 消息标志位 |
| AVP (Attribute-Value Pair) | AVP（属性值对） | 首次出现给全称 |
| index | 索引 | |
| escape sequence | 转义序列 | |
| header | 头域 | SIP header |
| body | 消息体 | |
| payload | 载荷 | |
| socket | 套接字 | |
| listener | 监听地址 | |
| interface | 接口 | |
| transport | 传输层 | transport protocol → 传输协议 |
| protocol | 协议 | |
| worker process | 工作进程 | |
| child process | 子进程 | |
| timer | 定时器 | timer handler → 定时器处理函数 |
| receiver | 接收器 | |
| registration | 注册 | |
| registrar | 注册服务器 | 模块名 `registrar` 不译 |
| usrloc / location | 用户位置 | |
| authentication | 鉴权 | |
| authorization | 授权 | |
| accounting | 计费 | |
| CDR | 话单 | 保留 CDR 缩写 |
| provisioning | 数据配置 | |
| presence | 呈现 | 模块名 `presence` 不译 |
| publish / subscribe | 发布 / 订阅 | |
| publisher / subscriber | 发布者 / 订阅者 | |
| dialog-info | 对话信息 | |
| call center | 呼叫中心 | |
| load balancer | 负载均衡器 | |
| dispatcher | 调度器 | 模块名不译 |
| media relay | 媒体中继 | |
| media proxy | 媒体代理 | |
| NAT traversal | NAT 穿透 | |
| cluster | 集群 | |
| node | 节点 | |
| replication | 复制 | |
| failover | 故障切换 | |
| heartbeat | 心跳 | |
| keepalive | 保活 | |
| timeout | 超时 | |
| retransmission | 重传 | |
| forking | 分叉 | sequential / parallel forking → 顺序分叉 / 并行分叉 |
| serial | 串行 | |
| prefix | 前缀 | |
| suffix | 后缀 | |
| pattern | 模式 | |
| wildcard | 通配符 | |
| regex / regular expression | 正则表达式 | |
| mandatory | 必填 | |
| optional | 可选 | |
| read-only | 只读 | |
| read-write | 可读写 | |
| value | 值 | |
| integer | 整型 | |
| string | 字符串 | |
| null | 空值 | |
| debug level | 调试级别 | |
| logging | 日志 | |
| statistics | 统计 | |
| metric | 指标 | |
| status report | 状态报告 | |
| threshold | 阈值 | |
| alert | 告警 | |
| event | 事件 | |
| backend | 后端 | |
| endpoint | 端点 | |
| gateway | 网关 | |
| trunk | 中继 | |
| conformance test | 一致性测试 | |
| regression | 回归 | |
| test suite | 测试套件 | |
| scenario | 场景 | |
| SIP flow | SIP 流程 | |
| inter-operate | 互通 | |
| signaling | 信令 | |
| media | 媒体 | |
| DB schema | 数据库表结构 | |
| table | 表 | |
| column | 列 | |
| record | 记录 | |
| query | 查询 | |
| script variable | 脚本变量 | |
| reference variable | 引用变量 | |
| context | 上下文 | |
| scope | 作用域 | |
| manipulate | 操作 | |
| override | 覆盖 | |
| inherit | 继承 | |
| assign / assignment | 赋值 | |
| expression | 表达式 | |
| operator | 运算符 | |
| statement | 语句 | |
| populate | 填充 | |
| matching | 匹配 | |
| fallback | 回退 | |
| probe | 探测 | |
| health check | 健康检查 | |
| throttle | 限流 | |
| rate limit | 速率限制 | |
| fraud detection | 欺诈检测 | |
| topology hiding | 拓扑隐藏 | |
| loose route / strict route | 松散路由 / 严格路由 | |
| outbound proxy | 出站代理 | |
| user agent | 用户代理 | 缩写 UA 保留 |
| callee / caller | 被叫 / 主叫 | |
| alias | 别名 | |
| domain | 域 | |
| realm | realm | 鉴权语境不译 |
| nonce | nonce | 不译 |
| digest | 摘要 | Digest 鉴权 → 摘要鉴权 |
| credential | 凭据 | |
| cipher / ciphersuite | 加密套件 | |
| certificate | 证书 | |
| handshake | 握手 | |
| mid-dialog | 对话中 | |
| component | 组件 | 与 module（模块）严格区分，不可互换 |
| Status/Report (SR) | 状态/报告 | 保留 SR 缩写 |
| readiness | 就绪（程度） | |
| stable | 稳定 | 发布状态；beta / alpha 保留原文 |
| deprecated | 已废弃 | |
| obsolete | 已过时 | |
| cache | 缓存 | CacheDB → CacheDB（模块名不译） |

## 四、语境与文风

1. 中文与英文单词 / 数字之间加一个半角空格（如「使用 SIP 协议」「共 3 个进程」）；中文标点后不加空格。
2. 不用「您」，不增补主语；保持技术文档的中性陈述语气，与已译的 `Install-Download.md`、`Configure-File.md` 一致。
3. 术语首次出现可写「中文（English）」，同一页面后续只用中文；标题中不加括注。
4. 代码块内的 `#` 注释译为中文，保持原有缩进与对齐意图。
5. 英文原文的换行用于控制行宽，译文按中文自然断句重排，不必逐行对应。
6. 原文的 `\` 行内换行标记、空行数量尽量保持，避免影响渲染。

## 五、frontmatter

```yaml
---
title: "中文标题"
description: "中文摘要，一句话"
---
```

title / description 必须译为中文；原文 description 若被截断（以 `...` 结尾），按正文内容补成完整一句话。

## 六、完成自检

- [ ] 代码块数量与英文原文一致
- [ ] 所有围栏内标识符未被翻译
- [ ] 链接数量一致，相对路径未被改写
- [ ] 原文所有 `#anchor` 在中文标题上以 `{#anchor}` 保留
- [ ] 标题数量一致
- [ ] 无整段残留英文（术语表允许保留的内容除外）
- [ ] 无 `OpenSIPs` 等原文笔误
