---
title: "rtpproxy 模块"
description: "该模块供 OpenSIPS 与 RTPProxy 通信使用。RTPProxy 是一个媒体中继代理，用于使位于 NAT 之后的用户代理之间能够通信。"
sidebar: false
---


## 管理指南 {#admin-guide}


### 概述 {#overview}


该模块供 OpenSIPS 与 RTPProxy 通信使用。RTPProxy 是一个媒体中继代理，用于使位于 NAT 之后的用户代理之间能够通信。


该模块还与 RTPProxy 配合使用，用于录制用户代理之间的媒体流，或向 UAC 或 UAS 播放媒体。


### 使用多个 RTPProxy {#multiple-rtpproxy-usage}


目前，rtpproxy 模块可以支持多个 rtpproxy，以实现负载均衡/分发以及控制/选择的目的。


该模块允许定义若干组 rtpproxy —— 负载均衡在一个组内进行，并且用户能够选择使用哪个组。组通过其 id 来选择 —— id 在定义组时一并定义。语法说明请参考 "rtpproxy_sock" 模块参数的定义。


组内的均衡由模块根据组内每个 rtpproxy 的权重自动完成。注意，如果某个 rtpproxy 的权重为 0，则仅在没有其他（权重值不为 0 的）rtpproxy 响应时才会使用它。默认权重为 1。


从 OpenSIPS 2.1 开始，engage_rtp_proxy()、unforce_rtp_proxy() 和 start_recording() 函数已被 rtpproxy_engage()、rtpproxy_unforce() 和 rtpproxy_start_recording() 完全取代。


重要：如果使用多个组，请确保 rtpproxy_offer()/rtpproxy_answer() 与 rtpproxy_unforce() 使用同一个组！！


### RTPProxy 超时通知 {#rtpproxy-timeout-notifications}


Nathelper 模块也可以接收来自多个 rtpproxy 的超时通知。RTPProxy 可配置为：当某会话在一段可配置的时间间隔内未收到任何媒体时发送通知。rtpproxy 模块为此类通知实现了监听器，收到通知后借助 dialog 模块在 SIP 层终止对话（向两端发送 BYE）。


在我们对 RTPProxy 的测试中，观察到一些限制，并针对 git commit "600c80493793bafd2d69427bc22fcb43faad98c5" 提供了补丁。该补丁新增并为会话建立阶段和进行中的会话分别实现了独立的超时参数。在官方代码中，单个超时参数同时控制会话建立和 rtp 超时，并且在呼叫建立阶段也会发送超时通知。这存在问题，因为我们希望快速检测 rtp 超时，同时又希望为呼叫建立留出更长的时间。


注意，RTPProxy 版本
[v2.0.0](http://www.rtpproxy.org/post/v2release/)
已将该特性集成到上游，因此不再需要此补丁。


要启用超时通知，必须遵循以下几个步骤：
在配置脚本中设置 "rtpp_notify_socket" 模块参数，以启动 OpenSIPS 的超时检测。这是后续接收来自 rtpproxy 的通知所用的套接字。该套接字必须是 TCP 或
UNIX 套接字。此外，对于所有需要通知的呼叫，
调用 rtpproxy_engage()、rtpproxy_offer() 和 rtpproxy_answer() 函数时必须
带 "n" 标志位。
通过添加以下命令行参数，配置 RTPProxy 使用超时通知：


" -n timeout_socket" - 指定
通知的发送目的地。该套接字
必须与 OpenSIPS 模块参数 "rtpp_notify_socket"
相同。该参数为必填。


" -T ttl" - 将 rtp 会话
超时限制为 "ttl"。该参数
可选，默认值为 60 秒。


" -W ttl" - 将会话
建立超时限制为 "ttl"。
该参数可选，默认值
为 60 秒。
以上参数除最后一个外，均可与官方
RTPProxy 发行版一起使用。最后一个参数
与其他针对 RTPProxy 的修改一起被加入，
以使其正常工作。补丁位于模块的
*patches* 目录中。
要从 git 获取打过补丁的版本，必须遵循以下步骤：


获取最新源代码："git clone git://sippy.git.sourceforge.net/gitroot/sippy/rtpproxy"


从该 commit 创建分支："git checkout
-b branch_name 600c80493793bafd2d69427bc22fcb43faad98c5"


为 RTPProxy 打补丁："patch <
path_to_rtpproxy_patch"
打过补丁的版本也可在以下地址找到：
https://opensips.org/pub/rtpproxy/


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


在加载本模块之前，必须先加载以下模块：


- *数据库*模块 - 仅当你希望
从数据库表加载 rtp proxy 组时才需要。
- *dialog* 模块 - 如果使用 rtpproxy_engage
函数或 RTPProxy 超时通知。


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，必须安装
以下库或应用程序：


- *无*。


### 导出的参数 {#exported-parameters}


#### rtpproxy_sock (string)


用于连接（某组）RTPProxy 的套接字定义。它
可以指定 UNIX 套接字、IPv4/IPv6 UDP 套接字或 IPv4/IPv6 TCP 套接字。
如果缺少协议部分（即 "udp:"），则该套接字
被视为 UNIX 套接字。


该定义还支持指定另一个 IP，用于对外通告，
而不是使用 RTPProxy 返回的 IP。当存在多台
位于 NAT 之后、仅监听私有接口但需要
通告公网地址的 RTPProxy 服务器时，这很有用。


*默认值为 "NONE"（禁用）。*


```opensips title="Set rtpproxy_sock parameter"
...
# 带特定权重的单个 rtpproxy
modparam("rtpproxy", "rtpproxy_sock", "udp:localhost:22222=2")

# 带通告地址和权重的单个 rtpproxy
modparam("rtpproxy", "rtpproxy_sock", "udp:localhost:22222|8.8.8.8=2")

# 用于负载均衡的多个 rtpproxy
modparam("rtpproxy", "rtpproxy_sock",
	"udp:localhost:22222 udp:localhost:22223 tcp:remote1:33422 tcp6:remote2:32322")

# 多个组，每组包含多个 rtpproxy
modparam("rtpproxy", "rtpproxy_sock", "1 == udp:localhost:22222 udp:localhost:22223")
modparam("rtpproxy", "rtpproxy_sock", "2 == udp:localhost:22223")
modparam("rtpproxy", "rtpproxy_sock", "2 == udp:localhost:22223|8.8.8.8")
...
```


#### rtpproxy_disable_tout (integer)


一旦发现 RTPProxy 不可达并将其标记为禁用，rtpproxy
将在 rtpproxy_disable_tout 秒内不再尝试与 RTPProxy
建立通信。


*默认值为 "60"。*


```opensips title="Set rtpproxy_disable_tout parameter"
...
modparam("rtpproxy", "rtpproxy_disable_tout", 20)
...
```


#### rtpproxy_timeout (string)


等待 RTPProxy 应答的超时值。


*默认值为 "1"。*


```opensips title="Set rtpproxy_timeout parameter to 200ms"
...
modparam("rtpproxy", "rtpproxy_timeout", "0.2")
...
```


#### rtpproxy_autobridge (integer)


启用自动桥接特性。在进行串行/并行分叉时无法正常工作！


*默认值为 "0"。*


```opensips title="Enable auto-bridging feature"
...
modparam("rtpproxy", "rtpproxy_autobridge", 1)
...
```


#### rtpproxy_retr (integer)


在产生超时后，rtpproxy 应重试发送和接收的次数。


*默认值为 "5"。*


```opensips title="Set rtpproxy_retr parameter"
...
modparam("rtpproxy", "rtpproxy_retr", 2)
...
```


#### default_set (integer)


该参数指示默认使用的 RTPProxy 组，用于在配置文件中
配置引擎时未显式指定组，
或调用某个 *rtpproxy_*()*
函数时未显式指定组的情况。


*默认值设为 "0"。*


```opensips title="Set default_set parameter"
...
modparam("rtpproxy", "default_set", 1)
...
```


#### nortpproxy_str (string)


该参数设置 rtpproxy 用于标记
报文 SDP 信息已被改写的 SDP 属性。


如果为空字符串，则不会添加或检查任何标记。


> [!NOTE]
> 该字符串必须是完整的 SDP 行，包括 EOH（\r\n）。


*默认值为 "a=nortpproxy:yes\r\n"。*


```opensips title="Set nortpproxy_str parameter"
...
modparam("rtpproxy", "nortpproxy_str", "a=sdpmangled:yes\r\n")
...
```


#### db_url (string)


数据库 url。如果希望
使用数据库表来加载或重新加载用于连接（某组）RTPProxy 的
套接字定义，则应设置该参数。数据库表中的
记录会在启动时读取（追加到通过 rtpproxy_sock 模块参数
定义的那些记录），并在执行 MI 命令
rtpproxy_reload 时读取（定义将被
数据库表中的定义替换）。


*默认值为 "NULL"。*


```opensips title="Set db_url parameter"
...
modparam("rtpproxy", "db_url", 
		"mysql://opensips:opensipsrw@192.168.2.132/opensips")
...
```


#### db_table (string)


包含用于连接（某组）RTPProxy 的套接字定义的
数据库表名。


*默认值为 "rtpproxy_sockets"。*


```opensips title="Set db_table parameter"
...
modparam("rtpproxy", "db_table", "nh_sockets") 
...
```


#### rtpp_socket_col (string)


数据库表中 rtpp 套接字列的名称。


*默认值为 "rtpproxy_sock"。*


```opensips title="Set rtpp_socket_col parameter"
...
modparam("rtpproxy", "rtpp_socket_col", "rtpp_socket") 
...
```


#### set_id_col (string)


数据库表中 set id 列的名称。


*默认值为 "set_id"。*


```opensips title="Set set_id parameter"
...
modparam("rtpproxy", "set_id_col", "rtpp_set_id") 
...
```


#### rtpp_notify_socket (string)


OpenSIPS 监听来自 RTPProxy 的通知所用的套接字。
目前 OpenSIPS 可以接收 RTP 超时和 DTMF 事件。


*默认值为 "NULL" - 不接收任何通知。*


```opensips title="Set rtpp_notify_socket parameter"
...
modparam("rtpproxy", "rtpp_notify_socket", "tcp:10.10.10.10:9999")

# 使用 UNIX 套接字
modparam("rtpproxy", "rtpp_notify_socket", "unix:/tmp/rtpproxy.unix")
# 或者
modparam("rtpproxy", "rtpp_notify_socket", "/tmp/rtpproxy.unix")
...
```


#### generated_sdp_port_min (integer)


当 RTPProxy 模块需要生成 SDP 消息体时，
使用该值作为端口的最小值。


*默认值为 "35000"。*


```opensips title="Set generated_sdp_port_min parameter"
...
modparam("rtpproxy", "generated_sdp_port_min", 10000)
...
	
```


#### generated_sdp_port_max (integer)


当 RTPProxy 模块需要生成 SDP 消息体时，
使用该值作为端口的最大值。


*默认值为 "65000"。*


```opensips title="Set generated_sdp_port_max parameter"
...
modparam("rtpproxy", "generated_sdp_port_max", 30000)
...
	
```


#### generated_sdp_media_ip (string)


当 RTPProxy 模块需要生成 SDP 消息体时，
使用该值作为 *c=*
和 *o=* 中的 media_ip。


*默认值为 "127.0.0.1"。*


```opensips title="Set generated_sdp_media_ip parameter"
...
modparam("rtpproxy", "generated_sdp_media_ip", "10.0.0.1")
...
	
```


### 导出的函数 {#exported-functions}


#### rtpproxy_engage([[flags][, [ip_address][, [set_id][, [sock_var][, ret_var]]]]])


重写 SDP 消息体，以确保媒体流经
RTP 代理。它利用 dialog 模块的功能来跟踪
rtpproxy 会话何时必须更新。该函数只能
对初始 INVITE 调用，
并在内部负责重写 200 OK 和 ACK 的消息体。
注意，在桥接模式下使用时，该函数可能会在 SDP 中通告错误的
接口（因为 OpenSIPS 并不了解 RTPProxy
的配置），因此可能遇到未定义的行为。


参数含义如下：


- *flags(string, optional)* - 用于开启某些特性的标志位。

  - *a* - 标志表示接收消息的 UA
不支持对称 RTP。
  - *l* - 强制 "lookup"，即
仅当对应会话已存在于 RTP 代理中时
才重写 SDP。默认情况下，在会话
即将完成时（非 swap 模式下的应答或 swap 模式下的 ACK）该标志为开启。
  - *k* - 仅创建 RTPProxy 会话，但
不修改 SDP 消息体。当你只想
注入一些媒体，而不希望在整个呼叫中
启用 RTPProxy 时，这很有用。
  - *i/e* - 当 RTPProxy 以桥接模式使用时，
这些标志用于指示当前请求/应答的
媒体流方向。'i' 指 LAN（内部
网络），对应 RTPProxy 的第一个接口（由
-l 参数指定）。'e' 指 WAN（外部
网络），对应 RTPProxy 的第二个接口。
这些标志应始终成对使用。例如，来自
Internet（WAN）发往本地媒体服务器（LAN）的
INVITE（offer）应使用 'ei' 标志。
应答应使用 'ie' 标志。根据场景不同，
也支持 'ii'
和 'ee' 组合。仅在
RTPProxy 以桥接模式运行时才有意义。
*NOTE:* 以桥接模式使用 RTPProxy 时，
所有会话都被视为非对称（相对于普通模式下
使用的对称）。如果有对称客户端（这是
最常见的场景），则必须强制使用
*s*！
  - *f* - 指示 rtpproxy 忽略传输途中
由另一个 rtpproxy 插入的标记，该标记用于表示
该会话已经过另一个代理。允许创建
代理链。
  - *r* - 标志表示应信任 SDP 中的
IP 地址。没有该标志时，rtpproxy 忽略
SDP 中的地址，而使用 SIP 消息的源地址
作为传递给 RTP 代理的媒体
地址。
  - *o* - 标志表示 origin
描述（o=）中的 IP 也应被修改。
  - *c* - 标志表示当媒体描述中也包含
连接信息时，修改会话级
SDP 连接（c=）的 IP。
  - *s/w* - 标志表示对于接收
消息的 UA，必须强制支持对称 RTP。
  - *n[&lt;SOCKET&gt;]* - 标志启用
该会话的通知超时。可以在
< 和 > 标签之间指定一个可选的
"advertised" 套接字。
如果未指定套接字，则使用
*rtpp_notify_socket* 的值。
  - *d[NNN]* - 为该
呼叫启用 DTMF 通知。可以选择性地指定该呼叫 DTMF 将
使用的载荷类型 —— 如果未指定，RTPProxy 使用
*101* pt。*NOTE:* 该特性
目前仅在 RTPProxy 的
*rtpp_2_1_dtmf* 分支中可用。
  - *tNN* - 可用于指定主叫的 RTP
ttl。NN 表示该流的超时秒数。
这在只有一方客户端发送 RTP 的音乐保持场景中
很有用。
  - *TNN* - 与 *tNN*
参数类似，但用于调整被叫的 RTP ttl。
  - *zNN* - 请求 RTPproxy 对来自
发送当前消息的 UA 的 RTP 流量进行重新打包，
以尽可能增加或减少每个转发的 RTP 包的载荷
大小。NN 是
目标载荷大小（毫秒），对大多数编解码器而言其值应以
10ms 为步进，但对某些编解码器步进
可能不同（例如 GSM 为 30ms，G.723 为 20ms）。
RTPproxy 会选择编解码器支持的最接近的值。
该特性可用于显著降低低比特率编解码器的带宽
开销，例如 G.729 从 10ms 变为 100ms 可节省三分之二的网络带宽。
- *ip_address(string, optional)* - 新的 SDP IP 地址。
- *set_id(int, optional)* - 该呼叫使用的组。
- *sock_var(var, optional)* - 用于存储为该呼叫选择的 RTPProxy
套接字的变量。注意，该变量仅在
初始请求中被填充。
- *ret_var(var, optional)* - 用于打印 RTPProxy 服务器为该呼叫
使用的 IP 和端口的变量。这在使用
*rtp_cluster* 时尤其有用，因为它可以在其后通告多台服务器。
返回值格式为 *IP:port*。
注意，该变量仅在初始请求中被填充。


该函数可在 REQUEST_ROUTE、FAILURE_ROUTE、BRANCH_ROUTE 中使用。


```opensips title="rtpproxy_engage usage"
...
if (is_method("INVITE") && has_totag()) {
	if ($var(setid) != 0) {
		rtpproxy_engage(,,$var(setid), $var(proxy));
		xlog("SCRIPT: RTPProxy server used is $var(proxy)\n");
	} else {
		rtpproxy_engage();
		xlog("SCRIPT: using default RTPProxy set\n");
	}
}
...
	
```


#### rtpproxy_offer([[flags][, [ip_address][, [set_id][, [sock_var][, [ret_var][, [body_var]]]]]])


重写 SDP 消息体，以确保媒体流经
RTP 代理。在 SDP 位于 INVITE 和 200 OK 的情况下
在 INVITE 上调用，在 SDP 位于 200 OK 和 ACK 的情况下
在 200 OK 上调用。


该函数接收与
`rtpproxy_engage()` 相同的参数，另外还多一个
名为 *body_var* 的参数 —— 该参数
用作消息体的输入/输出变量，该消息体应用于
向 RTP 代理服务器发起挑战。如果指定了该变量，
则函数使用其内容作为要挑战的消息体，
并将结果消息体返回其中。如果未使用，则使用消息自身的
消息体，并且发出的消息体会被修改。


该函数可在 REQUEST_ROUTE、ONREPLY_ROUTE、
FAILURE_ROUTE、BRANCH_ROUTE 中使用。


```opensips title="rtpproxy_offer usage"
route {
...
    if (is_method("INVITE")) {
        if (has_body("application/sdp")) {
            if (rtpproxy_offer())
                t_on_reply("1");
        } else {
            t_on_reply("2");
        }
    }
    if (is_method("ACK") && has_body("application/sdp"))
        rtpproxy_answer();
...
}

onreply_route[1]
{
...
    if (has_body("application/sdp"))
        rtpproxy_answer();
...
}

onreply_route[2]
{
...
    if (has_body("application/sdp"))
        rtpproxy_offer();
...
}
```


#### rtpproxy_answer([[flags][, [ip_address][, [set_id][, [sock_var][, [ret_var][, [body_var]]]]]])


重写 SDP 消息体，以确保媒体流经
RTP 代理。在 SDP 位于 INVITE 和 200 OK 的情况下
在 200 OK 上调用，在 SDP 位于 200 OK 和 ACK 的情况下
在 ACK 上调用。


参数含义参见上文的 `rtpproxy_offer()` 函数
说明。


该函数可在 REQUEST_ROUTE、ONREPLY_ROUTE、
FAILURE_ROUTE、BRANCH_ROUTE 中使用。


示例参见上文的 rtpproxy_offer() 函数示例。


#### rtpproxy_unforce([[set_id][, sock_var]])


拆除当前呼叫的 RTPProxy 会话。


参数含义如下：


- *set_id(int, optional)* - 该呼叫使用的组。
- *sock_var(var, optional)* - 用于存储为该呼叫选择的 RTPProxy
套接字的变量。


该函数可在 REQUEST_ROUTE、ONREPLY_ROUTE、FAILURE_ROUTE、BRANCH_ROUTE 中使用。


```opensips title="rtpproxy_unforce usage"
...
rtpproxy_unforce();
...
```


#### rtpproxy_stream2uac(prompt_name, count[, [set_id][, sock_var]]), rtpproxy_stream2uas(prompt_name, count[, [set_id][, sock_var]])


指示 RTPproxy 播放使用 RTPproxy 发行版中的
makeann 命令预先编码的提示音/通告音。uac/uas
后缀选择相对于当前事务
由谁听到通告音 —— UAC 或 UAS。例如，在 ACK 事务的
请求处理块中调用
`rtpproxy_stream2uac`，将向生成原始 INVITE 和
ACK 的 UA 播放提示音，而在 183 的应答
处理块中调用
`rtpproxy_stop_stream2uas`，将向生成 183 的 UA 播放提示音。


除生成通告音外，该函数的另一个可能应用
是实现音乐保持（MOH）功能。
当 count 为 -1 时，将无限循环播放，
直到发出相应的 `rtpproxy_stop_stream2xxx`。


为使其正常工作，这些函数要求 RTPproxy 中的
会话已经存在。此外这些函数不会修改 SDP，因此
它们不能替代调用 `rtpproxy_offer`
或 `rtpproxy_answer`。


该函数可在 REQUEST_ROUTE、ONREPLY_ROUTE 中使用。


参数含义如下：


- *prompt_name* (string) - 要播放的
提示音名称。应为绝对路径名，或相对于
RTPproxy 运行目录的路径名。
- *count* (int) - 提示音
应重复的次数。值为 -1 表示
将无限循环播放，直到发出相应的
`rtpproxy_stop_stream2xxx`。
- *set_id(int, optional)* - 该呼叫使用的组。
- *sock_var(var, optional)* - 用于存储为该呼叫选择的 RTPProxy
套接字的变量。


```opensips title="rtpproxy_stream2xxx usage"
...
    if (is_method("INVITE")) {
        rtpproxy_offer();
        if ($rb=~ "0\.0\.0\.0") {
            rtpproxy_stream2uas("/var/rtpproxy/prompts/music_on_hold", -1);
        } else {
            rtpproxy_stop_stream2uas();
        };
    };
...
	    
```


#### rtpproxy_stop_stream2uac([[set_id][, sock_var]]), rtpproxy_stop_stream2uas([[set_id][, sock_var]])


停止此前由相应的 `rtpproxy_stream2xxx`
启动的通告音/提示音/MOH 播放。uac/uas
后缀选择相对于当前事务
应停止谁的通告音 —— UAC 或 UAS。


参数含义如下：


- *set_id(int, optional)* - 该呼叫使用的组。
- *sock_var(var, optional)* - 用于存储为该呼叫选择的 RTPProxy
套接字的变量。


这些函数可在 REQUEST_ROUTE、ONREPLY_ROUTE 中使用。


#### rtpproxy_start_recording([[set_id][, [sock_var][, [flags][, [destination][, mediastream]]]]])


该命令将向 RTP-Proxy 发送信号，以在 RTP-Proxy 上
录制 RTP 流。


参数含义如下：


- *set_id(int, optional)* - 该呼叫使用的组。
- *sock_var(var, optional)* - 用于存储为该呼叫选择的 RTPProxy
套接字的变量。
- *flags(string, optional)* - 传递给
RTPProxy 用于录制的标志列表。目前仅支持
*s*，它表示 RTPProxy 应将两条音频腿录制到
同一个文件中。注意，该特性从 RTPProxy 2.0
开始可用。
- *destination(string, optional)* - 录制
的目的地。如果为 *udp:IP:port*
格式，RTPProxy 会将 RTP 流发送到该 *IP:port*
远端目的地。否则，destination 表示
录制目录中的文件名。
- *mediastream(int, optional)* - 该参数仅在
指定了 *destination* 时使用，表示
要录制/复制的媒体流索引，从 1 开始。如果缺少该参数，
OpenSIPS 会指示 RTPProxy 复制所有流。


该函数可在 REQUEST_ROUTE 和 ONREPLY_ROUTE 中使用。


```opensips title="rtpproxy_start_recording usage"
...
rtpproxy_start_recording();

# 将 RTP 流复制到另一个监听地址
rtpproxy_start_recording(,,,"udp:127.0.0.1:60000");

# 仅复制第一个 RTP 流（音频流）
rtpproxy_start_recording(,,,"udp:127.0.0.1:60000", 1);
...
	
```


#### rtpproxy_stats(up_pvar, down_var, sent_var, fail_var[, [set_id][, sock_var]])


该命令从 RTP-Proxy 收集呼叫的 RTP 统计信息。


参数含义如下：


- *up_var* (var) - 用于返回该呼叫
*upstream* 所发送包数的变量。
- *down_var* (var) - 用于返回该呼叫
*downstream* 所发送包数的变量。
- *sent_var* (var) - 用于返回该呼叫
发送包总数的变量。
- *up_var* (var) - 用于返回该呼叫
失败包数的变量。
- *set_id(int, optional)* - 该呼叫使用的组。
- *sock_var(var, optional)* - 用于存储为该呼叫选择的 RTPProxy
套接字的变量。


该函数可在 REQUEST_ROUTE、FAILURE_ROUTE、ONREPLY_ROUTE、
BRANCH_ROUTE 和 LOCAL_ROUTE 中使用。


```opensips title="rtpproxy_stats usage"
...
rtpproxy_stats($var(up),$var(down),$var(sent),$var(fail));
xlog("RTP statistics for $ci: up=$var(up) down=$var(down) sent=$var(sent) fail=$var(fail)\n");
...
	
```


#### rtpproxy_all_stats(stats_avp[, [set_id][, sock_var]])


该命令从 RTP-Proxy 收集所有可用的 RTP 统计信息。
所有返回值存储在同一个 AVP 中，后续可通过
对 AVP 建索引来读取。


该命令仅在 RTPProxy 2.1 发行版及之后可用。


参数含义如下：


- *stats_avp* (var) - 用于存储
统计信息的 AVP。该 AVP 后续
可建索引以获取特定的统计项。
- *set_id(int, optional)* - 该呼叫使用的组。
- *sock_var(var, optional)* - 用于存储为该呼叫选择的 RTPProxy
套接字的变量。


该函数可在 REQUEST_ROUTE、FAILURE_ROUTE、ONREPLY_ROUTE、
BRANCH_ROUTE 和 LOCAL_ROUTE 中使用。


每个统计项按如下方式存储在特定索引处：


- *ttl* -
*$avp(ret)* /
*$(avp(ret)[0])*
- *pkts_ia* -
*$(avp(ret)[1])*
- *pkts_io* -
*$(avp(ret)[2])*
- *relayed* -
*$(avp(ret)[3])*
- *dropped* -
*$(avp(ret)[4])*
- *rtpa_set* -
*$(avp(ret)[5])*
- *rtpa_rcvd* -
*$(avp(ret)[6])*
- *rtpa_dups* -
*$(avp(ret)[7])*
- *rtpa_lost* -
*$(avp(ret)[8])*
- *rtpa_perrs* -
*$(avp(ret)[9])*


```opensips title="rtpproxy_all_stats usage"
...
rtpproxy_all_stats($avp(stats));
xlog("RTP statistics for $ci: dropped=$(avp(stats)[4])\n");
...
	
```


### 导出的 MI 函数 {#exported-mi-functions}


#### rtpproxy_enable


启用/禁用某个 rtp 代理。


参数：


- *url* - rtp 代理 url（与配置文件中定义的
完全一致）。
- *enable* - 1 - 启用，0 - 禁用该 RTPproxy 节点，2 - 将该 RTPproxy 节点置为探测模式。
- *setid*（可选）- rtpproxy 组 ID（用于
更好地标识要启用的 rtpproxy 实例，
例如当某个 rtpproxy 被多个组使用时）。


> [!NOTE]
> 如果某个 rtpproxy 被多次定义（在同一个或
> 不同的组中），并且未提供组 ID（作为第二个参数），
> 则其所有实例都将被启用/禁用。


```bash title="rtpproxy_enable usage"
...
## 仅按 URL 禁用某个 RTPProxy
$ opensips-cli -x mi rtpproxy_enable udp:192.168.2.133:8081 0
## 按 URL 和组 ID（3）禁用某个 RTPProxy
$ opensips-cli -x mi rtpproxy_enable udp:192.168.2.133:8081 0 3
...
```


#### rtpproxy_show


显示所有 rtp 代理及其信息：所属组和
状态（是否禁用、权重和 recheck_ticks）。


无参数。


```bash title="rtpproxy_show usage"
...
$ opensips-cli -x mi rtpproxy_show
...
```


#### rtpproxy_reload


从数据库重新加载 rtp 代理组。该函数将删除
此前所有记录，并用数据库表中的条目
填充列表。如果要使用该命令，必须设置
db_url 参数。


无参数。


```bash title="rtpproxy_reload usage"
...
$ opensips-cli -x mi rtpproxy_reload
...
```


### 导出的事件 {#exported-events}


#### E_RTPPROXY_STATUS


当某台 RTPProxy 服务器的状态变为
启用/禁用时，会引发该事件。


参数：


- *socket* - 标识该
RTPProxy 实例的套接字。
- *status* - 若该 RTPProxy 实例
响应探测则为 *active*，
若该实例已停用则为 *inactive*。


#### E_RTPPROXY_DTMF


当某台 RTPProxy 服务器向 OpenSIPS 发送 DTMF
通知时，会引发该事件。为捕获 RFC 2833/4733
DTMF 事件，需要向 *rtpproxy_offer()*/
*rtpproxy_answer()* 提供 *d*
标志位。


参数：


- *digit* - 所按下的按键。
- *duration* - 事件的持续时间。
- *volume* - 事件的音量。
- *id* - 表示
接收到该事件的呼叫的标识符。
- *is_callid* - 若 *id* 参数表示
对话 ID 则为 *0*，
若表示 callid 则为 *1*。
- *stream* - 指示 RTPProxy 会话的
流索引。若主叫发送了 DTMF 则通常为 0，
若被叫发送则为 1。


## 常见问题 {#frequently-asked-questions}


**Q: "rtpproxy_disable" 参数怎么了？**


它被移除了，因为已经过时 —— 现在
"rtpproxy_sock" 可以取空值来禁用
rtpproxy 功能。


**Q: 在哪里可以找到更多关于 OpenSIPS 的信息？**


请查看 [https://opensips.org/](https://opensips.org/)。


**Q: 关于本模块的问题可以在哪里提问？**


首先请检查你的问题是否已在我们的某个
邮件列表中得到了回答：


关于任何稳定版 OpenSIPS 发行的邮件应发送至
users@lists.opensips.org，关于开发版本的邮件
应发送至 devel@lists.opensips.org。


如果希望邮件保持私密，请发送至
users@lists.opensips.org。


**Q: 如何报告缺陷？**


请遵循以下地址提供的指南：
[https://github.com/OpenSIPS/opensips/issues](https://github.com/OpenSIPS/opensips/issues)。
<!-- CONTRIBUTORS -->

### 许可证 {#license}

所有文档文件（即 .md 扩展名）均按 Creative Common License 4.0 许可。

