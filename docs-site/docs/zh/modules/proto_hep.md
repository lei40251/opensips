---
title: "proto_hep 模块"
description: "**proto_hep** 模块是一个传输模块，实现了基于 UDP 的 hepV1 和 hepV2 通信以及基于 TCP 的 hepV3 通信。"
sidebar: false
---


## 管理员指南 {#admin-guide}


### 概述 {#overview}


**proto_hep** 模块是一个
传输模块，实现了基于 UDP 的 hepV1 和 hepV2 通信
以及基于 TCP 的 hepV3 通信。它还提供一个 API，
可用于注册回调函数，这些回调在 HEP 头域被
解析之后被调用，同时该 API 也能将 SIP 消息打包为 HEP 消息。
解包部分由模块内部完成。


加载之后，你就可以在配置文件中通过添加 IP 以及
（可选）监听端口来定义 HEP 监听地址。
可以定义 TCP、UDP 和 TLS 监听地址。在 UDP 上可以
接收 HEP v1、v2 和 v3 数据包，在 TCP 和 TLS 上仅支持 HEPv3。

```opensips
...
#HEPv3 监听地址
socket = hep_tcp:127.0.0.1:6061 		# 修改监听 IP
#HEPv1、v2、v3 监听地址
socket = hep_udp:127.0.0.1:6061 		# 修改监听 IP
...
```


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


在本模块之前必须先加载以下模块：


- *tls_mgm* - 可选，仅当脚本中定义了基于 TLS 的
HEP 监听地址时才需要。


#### 外部库或应用程序 {#external-libraries-or-applications}


在使用本模块运行 OpenSIPS 之前，必须安装以下
库或应用程序：


- *无*。


### 导出的参数 {#exported-parameters}


#### hep_id (str)


指定 HEP 数据包的目的地以及所使用的
HEP 协议版本。**hep_id** 内的所有参数
必须用 **;** 分隔。这些参数
以键值格式给出，可用的键为
**uri**、**transport**
和 **version**，但目的地的
URI 没有键，其格式为 **host:port**。**transport** 键的取值可以是
**TCP**、**UDP** 或
**TLS**。
**TCP** 和 **TLS**
仅适用于 HEP 版本 3。
**Version** 即 HEP 协议版本，
可以是 **1**、**2**
或 **3**。


HEPv1 和 HEPv2 只能使用 UDP。HEPv3 可以使用 TCP、UDP 和 TLS，
默认设置为 TCP。如果未定义 HEP 版本，则默认为版本 3，使用
TCP 和 TLS。


没有默认值。如果没有设置 **hep_id**，该模块
无法用于 HEP 跟踪。


```opensips title="设置 hep_id 参数"
...
/* 定义一个到 localhost 8001 端口的目的地，使用 tcp 上的 hepV3 */
modparam("proto_hep", "hep_id",
"[hep_dst] 127.0.0.1:8001; transport=tcp; version=3")
/* 定义一个到 1.2.3.4 5000 端口的目的地，使用 hepV2；未指定 transport（默认 UDP） */
modparam("proto_hep", "hep_id", "[hep_dst] 1.2.3.4:5000; version=2")
/* 仅定义目的地 uri；版本为 3（默认），transport 为 TCP（默认） */
modparam("proto_hep", "hep_id", "[hep_dst] 1.2.3.4:5000")
...
```


#### homer5_on (int)


指定数据应如何封装到 HEP 数据包中。如果设置为
*0*，则使用基于 JSON 的 HOMER 6 格式。否则，
如果设置为任何不等于 *0* 的值，则使用纯文本 HOMER 5
格式进行封装。在采集节点上，该参数
会影响 sipcapture 模块中
[report_capture()](/zh/modules/sipcapture#report-capture-correlation-id-table-name-proto-type)
函数的行为。


默认值为 1，即 HOMER5 格式。


```opensips title="设置 homer5_on 参数"
modparam("proto_hep", "homer5_on", 0)
```


#### homer5_delim (str)


如果 **homer5_on** 已设置
（不为 0），可以通过该参数设置
不同载荷部分之间的分隔符。


默认值为 ":"。


```opensips title="设置 homer5_on 参数"
modparam("proto_hep", "homer5_delim", "##")
```


#### hep_port (integer)


所有 TCP/UDP/TLS 监听地址使用的默认端口。


*默认值为 5656。*


```opensips title="设置 hep_port 参数"
...
modparam("proto_hep", "hep_port", 6666)
...
```


#### hep_send_timeout (integer)


如果 TCP 连接在该时间间隔内不可用于阻塞写
（而 OpenSIPS 希望在其上发送数据），
则在该时间（以毫秒为单位）之后关闭该连接。


*默认值为 100 ms。*


```opensips title="设置 hep_send_timeout 参数"
...
modparam("proto_hep", "hep_send_timeout", 200)
...
```


#### hep_max_msg_chunks (integer)


预期通过 TCP 到达的 HEP 消息被分成的最大分片数。
如果接收到的数据包分片数超过该值，
则丢弃连接（要么是连接非常
过载导致高度分片——要么是我们正遭受
正在进行的攻击，攻击者发送高度
分片的流量以降低服务器性能）。


*默认值为 32。*


```opensips title="设置 hep_max_msg_chunks 参数"
...
modparam("proto_hep", "hep_max_msg_chunks", 8)
...
```


#### hep_async (integer)


指定 TCP 连接和写操作是否应以
异步模式（非阻塞连接和
写）执行。如果禁用，OpenSIPS 将阻塞并等待
connect 和 write 之类的 TCP 操作完成。


*默认值为 1（启用）。*


```opensips title="设置 hep_async 参数"
...
modparam("proto_hep", "hep_async", 0)
...
```


#### hep_async_max_postponed_chunks (integer)


如果启用了 *hep_async*，该参数指定
可以暂存起来供稍后/异步写入的 HEP 消息
最大数量。如果连接上待处理的写入超过该数量，
该连接将被标记为已损坏并被丢弃。


*默认值为 32。*


```opensips title="设置 hep_async_max_postponed_chunks 参数"
...
modparam("proto_hep", "hep_async_max_postponed_chunks", 16)
...
```


#### hep_capture_id (integer)


该参数指定 HEPv2/v3 协议的采集代理 ID。
限制：16 位整数。


*默认值为 "1"。*


```opensips title="设置 hep_capture_id 参数"
...
modparam("proto_hep", "hep_capture_id", 234)
...
```


#### hep_retry_cooldown (integer)


该参数定义在达到 hep_max_retries 设置的最大失败尝试次数后，
OpenSIPS 在重试与 HEP 目的地之间的 TCP 连接之前应等待多少秒。
限制：16 位整数。


*默认值为 "3600"。*


```opensips title="设置 hep_retry_cooldown 参数"
...
modparam("proto_hep", "hep_retry_cooldown", 60)
...
```


#### hep_max_retries (integer)


该参数定义 OpenSIPS 为与 HEP 目的地建立 TCP 连接
而进行的最大尝试次数。
限制：16 位整数。


*默认值为 "5"。*


```opensips title="设置 hep_max_retries 参数"
...
modparam("proto_hep", "hep_max_retries", 10)
...
```


#### hep_async_local_connect_timeout (integer)


如果启用了 *hep_async*，该参数指定
以阻塞模式尝试连接所持续的毫秒数
（这是一种优化）。如果连接操作持续时间超过
该值，连接将转入异步模式，并交由 TCP
MAIN 进行轮询。


*默认值为 100 ms。*


```opensips title="设置 hep_async_local_connect_timeout 参数"
...
modparam("proto_hep", "hep_async_local_connect_timeout", 200)
...
```


#### hep_async_local_write_timeout (integer)


如果启用了 *hep_async*，该参数指定
以阻塞模式尝试写操作所持续的毫秒数
（这是一种优化）。如果写操作持续时间超过该值，
写操作将转入异步模式，并交由 TCP MAIN 进行
轮询。


*默认值为 10 ms。*


```opensips title="设置 hep_async_local_write_timeout 参数"
...
modparam("proto_hep", "hep_async_local_write_timeout", 100)
...
```


### 导出的函数 {#exported-functions}


#### correlate(hep_id, type1, correlation1, type2, correlation2)


发送一条带有额外关联 ID 的 HEP 消息，其中包含作为
参数给出的两个关联值。这两个类型必须不同。这有助于
在采集侧将两个呼叫关联起来（例如，
以它们的 callid 作为关联 ID）。


该函数可以在 REQUEST_ROUTE、FAILURE_ROUTE、ONREPLY_ROUTE、BRANCH_ROUTE、LOCAL_ROUTE 中使用。


各参数的含义如下：


- *hep_id（字符串）*
在 modparam 部分定义的 *hep_id* 名称，
用于指定在何处进行跟踪。
- *type1（字符串）*
标识第一个关联 ID 的键名。
- *correlation1（字符串）*
将放入额外关联块中的第一个额外关联 ID。
- *type2（字符串）*
标识第二个关联 ID 的键名。
- *correlation2（字符串）*
将放入额外关联块中的第二个额外关联 ID。


```opensips title="correlate 用法"
...
/* 参见 trace_id 小节中对 hep_dst 的声明 */
/* 我们假设在两个变量中有两个关联值：cor1 和 cor2 */
correlate("hep_dst", "correlation-no-1", $var(cor1), "correlation-no-2", $var(cor2));
...
```


## 开发者指南 {#developer-guide}


### 可用函数 {#available-functions}


#### pack_hep(from, to, proto, payload, plen, retbuf, retlen)


该函数将连接详情和 SIP 消息打包为 HEP 消息。
释放旧缓冲区和新缓冲区都是你的职责。


各参数的含义如下：


- *sockaddr_union *from* - 描述
发送套接字的 sockaddr_union
- *sockaddr_union *to* - 描述
接收套接字的 sockaddr_union
- *int proto* - HEP 头域中使用的协议；
- *char *payload* SIP 载荷缓冲区
- *int plen* SIP 载荷缓冲区长度
- *char **retbuf* HEP 消息缓冲区
- *int *retlen* HEP 消息缓冲区长度


#### register_hep_cb(cb)


该函数注册回调，在收到 HEP 消息时被调用。
回调的参数是 struct hep_desc*（详见
hep.h）——一个保存 HEP 头域全部详情的结构体，
以及 receive_info* 结构体。回调可以返回 HEP_SCRIPT_SKIP，
从而阻止该 HEP 消息继续传递到脚本。


各参数的含义如下：


- *hep_cb_t cb* HEP 回调


#### hep_version


当前使用的 HEP 版本。
<!-- CONTRIBUTORS -->

### 许可 {#license}

所有文档文件（即 .md 扩展名）均在 Creative Common License 4.0 下授权。
