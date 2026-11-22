---
title: "proto_tls 模块"
description: "SIP RFC 3261 中定义的 TLS 是代理的必备特性，可用于以逐跳（而非端到端）方式保护 SIP 信令。"
---


## 管理员指南 {#admin-guide}


### 概述 {#overview}


SIP RFC 3261 中定义的 TLS 是代理的必备特性，
可用于以逐跳（而非端到端）方式保护 SIP 信令。
TLS 运行在 TCP 之上。DTLS（即基于 UDP 的 TLS）
已由 IETF 定义，未来可能会提供支持。


### 历史 {#history}


TLS 支持最初由 Peter Griffiths 开发，并作为补丁
发布在 SER 开发邮件列表上。感谢 Cesc
Santasusana，修复了若干问题并添加了一些改进。


TLS 支持在两个项目中同时加入。在 SER 中，
该支持作为一个补丁提交到单独的 "experimental"
CVS 树中，作为主 CVS 树的补丁。在 OpenSIPS 中，该支持
直接集成到 CVS 树中，作为一个内置组件，并且
自 >=1.0.0 版本起成为稳定版 OpenSIPS 的一部分。


从 OpenSIPS 2.1 开始，TLS 已被移至单独的
传输模块，该模块实现了更通用的传输
接口。


### 场景 {#scenario}


随着提供商数量的增加，SIP 世界在持续
增长。更多用户意味着更多呼叫，而更多呼叫意味着
用户从完全陌生的人那里接到呼叫的概率很高，
或者在最坏的情况下接到不受欢迎的呼叫。为防止
这种情况，SIP 提供商必须采用一种防御机制。由于只有
被叫用户才能完全判断一个呼叫是否不受欢迎，SIP
服务器应基于关于该呼叫的所有信息，通知
用户该呼叫是否受欢迎。诸如主叫域、接收到的源地址
或入站协议等信息，对 SIP 服务器确定
呼叫的性质非常有用。


由于这些信息相当有限，服务器极不可能
检测出不受欢迎的呼叫——有很多呼叫它
无法预测其状态（中性呼叫）。因此，服务器
可以不向被叫用户告警不受欢迎的呼叫，而是
通知用户那些被认为可信的呼叫——即
服务器 100% 确定不是不受欢迎的呼叫。


因此，必须为 SIP 服务器定义一个信任概念。哪些
呼叫可信，哪些不可信？如果主叫可以
被识别为可信任的用户——即我们拥有可靠
信息的用户——则该呼叫可信。


由于其域内的所有用户都经过鉴权（或应该经过），
SIP 服务器可以将其用户发起的所有呼叫视为
可信。现在我们必须将信任概念扩展到多域
层面。多个域之间的相互协议可以建立
信任关系。因此，一个域（称为 A）也会将来自另一个
域（称为 B）的用户发起的所有呼叫视为可信，
反之亦然。但仅有协议还不够；由于
鉴权信息严格限于一个域内
（一个域只能鉴权自己的用户，而不能鉴权其他域
的用户），仍然存在检查主叫真实性的问题
——主叫可以（通过伪造的 From 头域）冒充
受信任域中的用户。


这个问题的答案是 TLS（传输层安全）。域 A 与
域 B 之间的所有呼叫都将通过 TLS 进行。在源域进行
鉴权，加上域间使用 TLS 传输，将使
该呼叫对目标域而言 100% 可信。


要使这种机制生效，必须满足以下要求：


- 所有 UA 都必须将其归属服务器设置为出站代理。
- 所有 SIP 服务器都必须对其
自己的用户发起的所有呼叫进行鉴权。
- 所有 SIP 服务器都必须通过 TLS 将其
用户发起的呼叫中继到受信任的域。


基于此，只有当某呼叫同样由其某个用户发起，
或该呼叫是从受信任域接收的（这等价于
通过 TLS 接收的呼叫）时，服务器才能将该呼叫
归类为其用户的受信任呼叫。不受信任的呼叫是指
从属于不受信任域的用户那里接收的呼叫，或
从受信任域的用户那里接收但其呼叫未经过其归属服务器
路由的呼叫（因此，它们未经过其归属服务器的鉴权）。


一旦服务器能够判断呼叫是否可信，仍未
解决的问题是服务器使用什么机制来通知
被叫用户入站呼叫的性质。


一种方式是通过远程更改被叫用户话机的
振铃类型。这可以通过在 INVITE 请求中插入
特殊头域来实现。目前已有多种
硬件话机支持该特性，例如 CISCO ATA、CISCO 7960 和 SNOM。这些话机
可以根据 "Alert-Info" SIP 头域的存在或其内容
更改其振铃音，具体如下：


- *CISCO ATA* - 它有 4 种预定义的
振铃类型。Alert-Info 头域必须形如
"Alert-info: Bellcore-drX EOH"，其中 X 可以是
1 到 4 之间的值。注意 1 是话机的默认振铃音。
- *CISCO 7960* - 它有 2 种预定义的
振铃类型，并且可以上传新的振铃音。
"Alert-Info" 头域必须形如
"Alert-info: X EOH"，其中 X 可以是任意数字。
当该头域存在时，话机不会更改
振铃音，而是更改振铃模式。通常，话机振铃
如 [ring.........ring..........ring]，其中 [ring] 是
振铃音；如果该头域存在，振铃模式将
变为 [ring.ring.........ring.ring........]。因此，为了能够听到
两种模式之间的差异（而不仅仅是时长上的差异），
强烈建议使用高度不对称的振铃类型
（因为预定义的类型并不如此！！）。
- *SNOM* - "Alert-Info"
头域必须形如 "Alert-info: URL EOH"，其中
URL 可以是（例如）一个 HTTP URL，话机可以从该地址
获取振铃音。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


在本模块之前必须先加载以下模块：


- *tls_openssl* 或 *tls_wolfssl*，
取决于所需的 TLS 库
- *tls_mgm*。


#### 外部库的依赖 {#dependencies-of-external-libraries}


在使用本模块运行 OpenSIPS 之前，必须安装以下
库或应用程序：


- *无*。


### 导出参数 {#exported-parameters}


所有这些参数都可以在 opensips.cfg 文件中使用，
以配置 OpenSIPS-TLS 的行为。


#### listen=interface


不特定于 TLS。允许指定协议
（udp、tcp、tls）、IP 地址以及
监听服务器所在的端口。


```opensips title="设置 listen 变量"
...
socket= tls:1.2.3.4:5061
...
```


#### tls_port (integer)


用于所有 TLS 相关操作的默认端口。请
注意，默认端口会同时影响 SIP 监听部分
（如果 TLS 监听地址中未定义端口）和 SIP 发送
部分（如果目的 URI 没有显式端口）。


如果只想更改 TLS 的监听端口，请使用
SIP 监听定义中的 port 选项。


*默认值为 5061。*


```opensips title="设置 tls_port 变量"
...
modparam("proto_tls", "tls_port", 5062)
...
```


#### tls_crlf_pingpong (integer)


对通过 TLS 收到的 CRLFCRLF ping 消息回复 CRLF pong（\r\n）。
默认启用（1）。


*默认值为 1（启用）。*


```opensips title="设置 tls_crlf_pingpong 参数"
...
modparam("proto_tls", "tls_crlf_pingpong", 0)
...
```


#### tls_crlf_drop (integer)


丢弃 CRLF（\r\n）ping 消息。启用该参数后，
TLS 层会丢弃包含单个 CRLF 消息的数据包。
如果收到 CRLFCRLF 消息，则根据
*tls_crlf_pingpong* 参数进行处理。


*默认值为 0（禁用）。*


```opensips title="设置 tls_crlf_drop 参数"
...
modparam("proto_tls", "tls_crlf_drop", 1)
...
```


#### tls_max_msg_chunks (integer)


SIP 消息通过 TLS 到达时预期被分成的最大块数。
如果收到的数据包分片程度超过此值，
则丢弃该连接（要么连接严重过载，导致高度
分片——要么我们正遭受持续攻击，攻击者以
高度分片的方式发送流量，以降低服务器性能）。


*默认值为 4。*


```opensips title="设置 tls_max_msg_chunks 参数"
...
modparam("proto_tls", "tls_max_msg_chunks", 8)
...
```


#### cert_check_on_conn_reusage (integer)


该参数用于开启或关闭在复用现有 TLS 连接时
对 TLS 域（SSL 证书）的额外检查/匹配。
如果不做此额外检查，则只检查连接的 IP 和端口
（以便复用现有连接）。做此额外检查时，
要复用的连接必须具有与当前信令操作所配置的
证书相同的 SSL 证书。


该检查仅在通过 TLS 发送 SIP 流量时进行，
并且仅针对由 OpenSIPS 创建/发起的连接
（作为 TLS 客户端）生效。任何被接受的连接（作为 TLS 服务器）
都会自动匹配（跳过额外检查）。


*默认值为 0（禁用）。*


```opensips title="设置 cert_check_on_conn_reusage 参数"
...
modparam("proto_tls", "cert_check_on_conn_reusage", 1)
...
```


#### trace_destination (string) {#trace_destination-string}


跟踪目的地，定义方式与 tracing 模块中相同。目前
唯一的 tracing 模块是 **proto_hep**。
连接、接受以及连接关闭等网络事件
将与过程中可能出现的错误一起被跟踪。
对于每个创建的连接，都会发送一个事件，
其中包含客户端和服务器证书、主密钥以及网络层
信息。


> [!WARNING]
> 必须加载一个 tracing 模块，
> 该参数才能生效。（例如
> **proto_hep**）。


*默认值为 none（未定义）。*


```opensips title="设置 trace_destination 参数"
...
modparam("proto_hep", "hep_id", "[hep_dest]10.0.0.2;transport=tcp;version=3")

modparam("proto_tls", "trace_destination", "hep_dest")
...
```


#### trace_on (int) {#trace_on-int}


控制是否开启 TLS 的跟踪。要使其生效，你仍然需要定义
[trace_destination](#trace_destination-string)，但该值将由
MI 函数 [tls_trace](#tls_trace) 控制。


```opensips title="设置 trace_on 参数"
...
modparam("proto_tls", "trace_on", 1)
...
```


#### trace_filter_route (string)


定义一个路由名称，在其中可以过滤哪些连接
需要跟踪、哪些不需要。在该路由中，你将获得
关于当前连接的源和目的 IP 及端口的信息。
要禁用对特定连接的跟踪，该路由中的最后一次调用
必须是 **drop**，任何其他退出方式都会导致跟踪
当前连接（当然，你仍然
必须定义 [trace_destination](#trace_destination-string)，并且在打开该连接时跟踪
必须处于开启状态）。


> [!IMPORTANT]
> 可以基于 IP 地址和端口进行过滤，使用 **$si** 和 **$sp** 来匹配
> 连接到 OpenSIPS 的实体，或 OpenSIPS 正在连接的实体。
> 该名称可能具有误导性（如果阅读文档，**$si** 表示源 IP），但实际上
> 它只是除 OpenSIPS 套接字之外的另一个套接字。为了匹配
> OpenSIPS 接口（无论是接受连接的那个接口，还是发起连接的那个
> 接口），可以使用 **$socket_in(ip)**（ip）和
> **$socket_in(port)**（port）。


> [!WARNING]
> 如果 [trace_on](#trace_on-int) 被设置为 0，或通过 MI 命令 [tls_trace](#tls_trace) 停用了跟踪，则不会调用该路由。


```opensips title="设置 trace_filter_route 参数"
...
modparam("proto_tls", "trace_filter_route", "tls_filter")
...
/* 如果跟踪已激活且定义了跟踪目的地，
 * 所有 TLS 连接都会经过该路由 */
route[tls_filter] {
	...
	/* 所有从 1.1.1.1:8000 打开/由 1.1.1.1:8000 打开的连接都将
	   在接口 1.1.1.10:5060（opensips 监听地址）上被跟踪
	   所有其他连接则不会 */
	 if ( $si == "1.1.1.1" && $sp == 8000 &&
		$socket_in(ip) == "1.1.1.10"  && $socket_in(port) == 5060)
		exit;
	else
		drop;
}
...
```


#### tls_handshake_timeout (integer)


设置 SSL 握手序列完成的超时时间（以毫秒为单位）。
当连接使用 CPU 密集型加密时，可能需要增大该值，
以便留出时间生成和处理密钥。


该超时在接受到新连接（入站）期间以及
在等待新会话建立（出站）期间被启用。


*默认值为 100。*


```opensips title="设置 tls_handshake_timeout 变量"
...
modparam("proto_tls", "tls_handshake_timeout", 200) # 毫秒数
...
```


#### tls_send_timeout (integer)


设置发送操作完成的超时时间（以毫秒为单位）


该发送超时对所有 TLS 写操作生效，但不包括
握手过程（参见：tls_handshake_timeout）


*默认值为 100。*


```opensips title="设置 tls_send_timeout 变量"
...
modparam("proto_tls", "tls_send_timeout", 200) # 毫秒数
...
```


#### tls_async (integer)


TLS 连接和写操作是否应以
异步模式进行（非阻塞连接和
写入）。如果禁用，OpenSIPS 将阻塞并等待
连接和写入等 TLS 操作完成。


*默认值为 1（启用）。*


```opensips title="设置 tls_async 变量"
...
modparam("proto_tls", "tls_async", 1) # 启用异步 TLS
...
```


#### tls_async_max_postponed_chunks (integer)


如果启用了 *tls_async*，该参数指定
可以为后续/异步写入暂存的 SIP 消息最大数量。
如果连接上待处理的写入超过该数量，
连接将被标记为已损坏并被丢弃。


*默认值为 32。*


```opensips title="设置 tls_async_max_postponed_chunks 参数"
...
modparam("proto_tls", "tls_async_max_postponed_chunks", 16)
...
```


#### tls_async_local_connect_timeout (integer)


如果启用了 *tls_async*，该参数指定
以阻塞模式尝试连接（优化）的毫秒数。
如果连接操作持续超过该时间，连接将转入异步模式，
并交由 TLS MAIN 进行轮询。


*默认值为 100 ms。*


```opensips title="设置 tls_async_local_connect_timeout 参数"
...
modparam("proto_tls", "tls_async_local_connect_timeout", 200)
...
```


#### tls_async_handshake_timeout (integer)


如果启用了 *tls_async*，该参数指定
以阻塞模式尝试 TLS 握手（优化）的毫秒数。
如果握手操作持续超过该时间，写入将转入异步模式，
并交由 TLS MAIN 进行轮询。


*默认值为 10 ms。*


```opensips title="设置 tls_async_handshake_timeout 参数"
...
modparam("proto_tls", "tls_async_handshake_timeout", 100)
...
```


### 导出 MI 函数 {#exported-mi-functions}


#### tls_trace {#tls_trace}


名称：*tls_trace*


参数：


- trace_mode（可选）：开启和关闭 TLS 跟踪。该参数
可以缺省，此时命令将显示该模块当前的跟踪
状态（on 或 off）；
可能的取值：
	- on
	- off


MI FIFO 命令格式：


```bash
opensips-cli -x mi tls_trace on
```


## 开发者指南 {#developer-guide}


### TLS_SERVER


#### 每个连接的 SSL 数据 {#ssl-data-per-connection}


每个 TLS 连接，无论是入站还是出站，都会创建一个
SSL * 对象，其中存储了从 SSL_CTX * 继承的配置以及该套接字上的特定信息。
只要连接存活，该 SSL * 结构就作为 "struct tcp_connection *"
对象的一部分保留在 OpenSIPS 中：


```c
...
struct tcp_connection *c;
SSL *ssl;

/* 以某种方式创建 SSL 对象*/
c->extra_data = (void *) ssl;
ssl = (SSL *) c->extra_data;
...
```


#### tls_print_errstack


void  tls_print_errstack(void);


转储 SSL 错误栈。


#### tls_tcpconn_init


int tls_tcpconn_init( struct tcp_connection *c, int fd);


在接受新的 TCP 连接时调用


#### tls_tcpconn_clean


void tls_tcpconn_clean( struct tcp_connection *c);


关闭 TLS 连接。


#### tls_blocking_write


size_t tls_blocking_write( struct tcp_connection *c, int fd,
const char *buf, size_t len);


以阻塞模式（同步）写入一块内存。


#### tls_read


size_t tls_read( struct tcp_connection *c);


从 TLS 连接读取。返回读取的字节数。


#### tls_fix_read_conn


void tls_tcpconn_clean( struct tcp_connection *c);


关闭 TLS 连接。


## 常见问题 {#frequently-asked-questions}


**问：关于 TLS 的问题可以在哪里发布？**


请使用 OpenSIPS 邮件列表中的一个（最合适的那个）：


请记住：首先检查你的问题是否已经被
解答过。


**问：如何报告缺陷？**


尽可能多地收集信息（OpenSIPS 版本、
opensips -V 输出、你的操作系统（uname -a）、OpenSIPS 日志、网络抓包、
核心转储文件、配置文件），
并发送邮件到 [http://lists.opensips.org/cgi-bin/mailman/listinfo/devel](http://lists.opensips.org/cgi-bin/mailman/listinfo/devel)


你也可以尝试 OpenSIPS 的缺陷报告网页：
https://opensips.org/pmwiki.php?n=Development.Tracker


**问：如何调试 ssl/tls 问题？**


在 opensips.cfg 中提高日志级别（log_level=4），并观察
syslog 中的日志语句。


安装 ssldump 工具并启动它。这会为你提供
ssl/tls 连接的跟踪信息。


**问：TLS 目录与 TLSOPS 模块目录之间有什么区别？**


TLS 目录中的代码实现了 TLS 传输层。
TLSOPS 模块实现了可在路由脚本中使用的
TLS 相关函数。


**问：在哪里可以了解更多关于 OpenSIPS 的信息？**


请查看 [https://opensips.org/](https://opensips.org/)。


**问：关于本模块的问题可以在哪里发布？**


首先检查你的问题是否已在我们的某个邮件列表中
得到解答：


关于任何稳定版 OpenSIPS 发布的邮件应发送至
users@lists.opensips.org，关于开发版本的邮件
应发送至 devel@lists.opensips.org。


如果希望邮件保持私密，请发送至
users@lists.opensips.org。


**问：如何报告缺陷？**


请遵循以下地址提供的指南：
[https://github.com/OpenSIPS/opensips/issues](https://github.com/OpenSIPS/opensips/issues)。
<!-- CONTRIBUTORS -->

### 许可 {#license}

所有文档文件（即 .md 扩展名）均在 Creative Common License 4.0 下授权。
