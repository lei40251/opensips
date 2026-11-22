---
title: "proto_bins 模块"
description: "本模块实现了一种基于 TLS 的安全二进制通信协议，供 clusterer 模块提供的 OpenSIPS 集群引擎使用。"
---


## 管理指南 {#admin-guide}


### 概述 {#overview}


本模块实现了一种基于 TLS 的安全二进制通信协议，
供 clusterer 模块提供的 OpenSIPS 集群引擎
使用。


加载后，你就可以在配置文件中通过添加其 IP 以及
可选的监听端口来定义 BINS 监听地址，类似
下面的示例：

```opensips
...
socket = bins:127.0.0.1 		# 修改监听 IP
socket = bins:127.0.0.1:5557	# 修改监听 IP 和端口
...
```


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


在本模块之前必须加载以下模块：


- *tls_openssl* 或 *tls_wolfssl*，
取决于所需的 TLS 库
- *tls_mgm*。


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，必须安装
以下库或应用程序：


- *无*。


### 导出的参数 {#exported-parameters}


#### bins_port (integer)


所有 BINS 监听地址使用的默认端口。


*默认值为 5556。*


```c title="设置 bins_port 参数"
...
modparam("proto_bins", "bins_port", 5557)
...
```


#### bins_handshake_timeout (integer)


设置 SSL/TLS 握手序列完成的超时时间（毫秒）。
当连接使用 CPU 密集型加密套件时，可能需要
增大该值，以便有时间生成并处理
密钥。


该超时在接受新连接时（入站）以及
发起新会话的等待期间（出站）生效。


*默认值为 100。*


```opensips title="设置 bins_handshake_timeout 变量"
param("proto_tls", "bins_handshake_timeout", 200) # 毫秒数			
```


#### bins_send_timeout (integer)


设置阻塞发送操作完成的超时时间（毫秒）。


发送超时适用于所有 TLS 写操作，
但不包括握手过程（参见：bins_handshake_timeout）


*默认值为 100 ms。*


```opensips title="设置 bins_send_timeout 参数"
...
modparam("proto_bins", "bins_send_timeout", 200)
...
```


#### bins_max_msg_chunks (integer)


一条 BINS 消息经 TCP 到达时预期
分成的最大块数。如果收到的报文分片程度
超过此值，则连接将被丢弃（要么
连接严重过载导致高度碎片化 - 要么
我们正遭受持续攻击，攻击者为了
降低服务器性能而发送高度碎片化的流量）。


*默认值为 32。*


```opensips title="设置 bins_max_msg_chunks 参数"
...
modparam("proto_bins", "bins_max_msg_chunks", 8)
...
```


#### bins_async (integer)


指定 TCP/TLS 连接与写操作是否应以
异步模式（非阻塞连接与写）执行。如果禁用，
OpenSIPS 将阻塞并等待诸如连接和写这类
TCP/TLS 操作。


*默认值为 1（启用）。*


```opensips title="设置 bins_async 参数"
...
modparam("proto_bins", "bins_async", 0)
...
```


#### bins_async_max_postponed_chunks (integer)


如果启用了 bins_async，该参数指定可为
后续/异步写入暂存的最大 BINS 消息数量。如果
连接上待处理的写入超过该数量，连接
将被标记为已损坏并丢弃。


*默认值为 32。*


```opensips title="设置 bins_async_max_postponed_chunks 参数"
...
modparam("proto_bins", "bins_async_max_postponed_chunks", 16)
...
```


#### bins_async_local_connect_timeout (integer)


如果启用了 bins_async，该参数指定连接
将以阻塞模式尝试的毫秒数（优化）。如果
连接操作持续时间超过该值，连接将转为
异步模式，并交给 TCP MAIN 进行轮询。


*默认值为 100 ms。*


```opensips title="设置 bins_async_local_connect_timeout 参数"
...
modparam("proto_bins", "bins_async_local_connect_timeout", 200)
...
```


#### bins_async_handshake_timeout (integer)


如果启用了 *tls_async*，该参数指定 TLS 握手
应以阻塞模式尝试的毫秒数（优化）。如果
握手操作持续时间超过该值，写操作将转为
异步模式，并交给 tls MAIN 进行轮询。


*默认值为 10 ms。*


```opensips title="设置 bins_async_handshake_timeout 参数"
	...
	modparam("proto_tls", "bins_async_handshake_timeout", 100)
	...
	
```


#### trace_destination (string) {#trace_destination-string}


跟踪模块中定义的跟踪目标地址。目前
唯一的跟踪模块是 **proto_hep**。
诸如 connect、accept 和连接关闭这类网络事件
将与处理过程中可能出现的错误一起被跟踪。
对于每一条创建的连接，都会发送一个包含
客户端与服务器证书信息、主密钥以及网络层
信息的事件。


> [!WARNING]
> 必须加载跟踪模块，
> 该参数才能生效。（例如
> **proto_hep**）。


*默认值为 none（未定义）。*


```opensips title="设置 trace_destination 参数"
...
modparam("proto_hep", "hep_id", "[hep_dest]10.0.0.2;transport=tcp;version=3")
modparam("proto_bins", "trace_destination", "hep_dest")
...
```


#### trace_on (int)


控制是否开启 tls 的跟踪。仍需定义
[trace_destination](#trace_destination-string) 才能生效，但该值将
通过 mi 函数 [bins_trace](#bins_trace) 控制。


```opensips title="设置 trace_on 参数"
...
modparam("proto_bins", "trace_on", 1)
...
```


### 导出的 MI 函数 {#exported-mi-functions}


#### bins_trace {#bins_trace}


名称：*bins_trace*


参数：


- trace_mode(optional)：开启和关闭 bins 跟踪。该参数
可以缺省，此时命令将显示本模块当前的跟踪
状态（开启或关闭）；
可能的取值：
	- on
	- off


MI FIFO 命令格式：


```bash
opensips-cli -x mi bins_trace on
```
<!-- CONTRIBUTORS -->

### 许可证 {#license}

所有文档文件（即以 .md 为扩展名的文件）均按 Creative Common License 4.0 授权。
