---
title: "proto_bin 模块"
description: "**proto_bin** 模块是一个传输模块，实现基于 TCP 的 Binary Interface 通信。"
sidebar: false
---

## 管理员指南 {#admin-guide}


### 概述 {#overview}


**proto_bin** 模块是一个传输模块，实现基于 TCP 的 Binary Interface 通信。它不负责 TCP 连接管理，只提供在 TCP 之上读写 BIN 消息的更高层原语。每接收到一条完整消息，它都会调用注册的回调函数。


加载后，即可在配置文件中通过添加 IP 以及可选的监听端口来定义 BIN 监听地址，类似下面的示例：

```opensips
...
socket = bin:127.0.0.1 		# 修改监听 IP
socket = bin:127.0.0.1:5080	# 修改监听 IP 和端口
...
```


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


在加载本模块之前，必须先加载以下模块：


- *无*。


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，必须先安装以下库或应用程序：


- *无*。


### 导出的参数 {#exported-parameters}


#### bin_port (integer)


所有 TCP 监听地址使用的默认端口。


*默认值为 5555。*


```c title="设置 bin_port 参数"
...
modparam("proto_bin", "bin_port", 6666)
...
```


#### bin_send_timeout (integer)


以毫秒计的时间；若 TCP 连接在该间隔内无法用于阻塞写（且 OpenSIPS 需要在其上发送数据），则连接将被关闭。


*默认值为 100 ms。*


```opensips title="设置 bin_send_timeout 参数"
...
modparam("proto_bin", "bin_send_timeout", 200)
...
```


#### bin_max_msg_chunks (integer)


一条 BIN 消息经 TCP 到达时所允许的最大分片数量。若接收到的报文分片数超过该值，则丢弃该连接（原因要么是连接严重过载导致分片过多，要么是我们正遭受攻击，攻击者发送高度分片的流量以降低服务器性能）。


*默认值为 32。*


```opensips title="设置 bin_max_msg_chunks 参数"
...
modparam("proto_bin", "bin_max_msg_chunks", 8)
...
```


#### bin_async (integer)


指定 TCP 连接与写操作是否以异步模式（非阻塞的连接与写）执行。若禁用，OpenSIPS 将阻塞等待诸如连接和写之类的 TCP 操作。


*默认值为 1（启用）。*


```opensips title="设置 bin_async 参数"
...
modparam("proto_bin", "bin_async", 0)
...
```


#### bin_async_max_postponed_chunks (integer)


若启用了 *bin_async*，该参数指定可为后续/异步写而暂存的最大 BIN 消息数量。若连接上待写的数据超过该数量，该连接将被标记为已损坏并丢弃。


*默认值为 1024。*


```opensips title="设置 bin_async_max_postponed_chunks 参数"
...
modparam("proto_bin", "bin_async_max_postponed_chunks", 1024)
...
```


#### bin_async_local_connect_timeout (integer)


若启用了 *bin_async*，该参数指定连接尝试以阻塞模式执行（作为优化）的毫秒数。若连接操作耗时超过该值，连接将转入异步模式，并交给 TCP MAIN 进行轮询。


*默认值为 100 ms。*


```opensips title="设置 bin_async_local_connect_timeout 参数"
...
modparam("proto_bin", "bin_async_local_connect_timeout", 200)
...
```


#### bin_async_local_write_timeout (integer)


若启用了 *bin_async*，该参数指定写操作以阻塞模式执行（作为优化）的毫秒数。若写操作耗时超过该值，写操作将转入异步模式，并交给 bin MAIN 进行轮询。


*默认值为 10 ms。*


```opensips title="设置 bin_async_local_write_timeout 参数"
...
modparam("proto_bin", "tcp_async_local_write_timeout", 100)
...
```
<!-- CONTRIBUTORS -->

### 许可 {#license}

本项目的所有文档文件（即 .md 扩展名的文件）均以 Creative Common License 4.0 授权。
