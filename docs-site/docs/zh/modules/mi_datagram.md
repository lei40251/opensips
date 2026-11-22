---
title: "mi_datagram 模块"
description: "本模块为管理接口提供 UNIX/UDP SOCKET 传输层实现。"
sidebar: false
---

## 管理指南 {#admin-guide}


### 概述 {#overview}


本模块为管理接口（Management Interface）提供 UNIX/UDP SOCKET
传输层实现。


### DATAGRAM 命令语法 {#datagram-command-syntax}


MI 请求和应答遵循
[JSON-RPC](http://www.jsonrpc.org/specification) 语法。


如果错误由 MI 引擎产生（大多是内部
错误），则会在数据报中返回纯文本形式的
错误消息。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


以下模块必须在本模块之前加载：


- *不依赖其他 OpenSIPS 模块*。


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，必须安装
以下库或应用程序：


- *无*


### 导出的参数 {#exported-parameters}


#### socket_name (string)


UNIX SOCKET 的名称或一个 IP 地址。
将使用该参数创建 UNIX 数据报或 UDP 套接字，
以便读取外部命令。
同时支持 IPv4 和 IPv6。


*默认值为 NONE。*


```opensips title="设置 socket_name 参数"
...
modparam("mi_datagram", "socket_name", "/tmp/opensips.sock")
...
modparam("mi_datagram", "socket_name", "udp:192.168.2.133:8080")
...
```


#### children_count (integer)


要创建的子进程数量。每个子进程
都是一个数据报服务器。


*默认值为 1。*


```opensips title="设置 children_count 参数"
...
modparam("mi_datagram", "children_count", 3)
...
```


#### unix_socket_mode (integer)


创建监听 UNIX 数据报套接字所使用的权限。
对 UDP 套接字不需要。
它遵循 UNIX 约定。


*默认值为 0660 (rw-rw----)。*


```opensips title="设置 unix_socket_mode 参数"
...
modparam("mi_datagram", "unix_socket_mode", 0600)
...
```


#### unix_socket_group (integer) unix_socket_group (string)


创建监听 UNIX 套接字所使用的组。


*默认值为继承值。*


```opensips title="设置 unix_socket_group 参数"
...
modparam("mi_datagram", "unix_socket_group", 0)
modparam("mi_datagram", "unix_socket_group", "root")
...
```


#### unix_socket_user (integer) unix_socket_group (string)


创建监听 UNIX 套接字所使用的用户。


*默认值为继承值。*


```opensips title="设置 unix_socket_user 参数"
...
modparam("mi_datagram", "unix_socket_user", 0)
modparam("mi_datagram", "unix_socket_user", "root")
...
```


#### socket_timeout (integer)


应答在尝试发送 socket_timeout 毫秒之后
将过期。


*默认值为 2000。*


```opensips title="设置 socket_timeout 参数"
...
modparam("mi_datagram", "socket_timeout", 2000)
...
```


#### trace_destination (string)


在 tracing 模块中定义的跟踪目标。目前
唯一的 tracing 模块是 **proto_hep**。
被跟踪的 mi 消息将发送到此处。


**警告：**要使该参数生效，必须加载一个 tracing
模块（例如 **proto_hep**）。


*默认值为 none（未定义）。*


```opensips title="设置 trace_destination 参数"
...
modparam("proto_hep", "trace_destination", "[hep_dest]10.0.0.2;transport=tcp;version=3")

modparam("mi_datagram", "trace_destination", "hep_dest")
...
```


#### trace_bwlist (string)


基于黑名单或白名单过滤被跟踪的 mi 命令。
**trace_destination** 必须已定义，该参数
才有意义。白名单可用 'w' 或 'W' 定义，
黑名单可用 'b' 或 'B'。类型与实际黑名单
之间用 ':' 分隔。列表中的 mi 命令必须用
',' 分隔。


定义黑名单意味着所有未被列入黑名单的命令
都会被跟踪。定义白名单意味着所有未被列入
白名单的命令都不会被跟踪。
**警告：** 不能同时定义白名单
和黑名单。只允许其中一种。第二次定义
该参数只会覆盖第一次的定义。


**警告：**要使该参数生效，必须加载一个 tracing
模块（例如 **proto_hep**）。


*默认值为 none（未定义）。*


```opensips title="设置 trace_destination 参数"
...
## 将 ps 和 which mi 命令列入黑名单
## 所有其他命令都会被跟踪
modparam("mi_datagram", "trace_bwlist", "b: ps, which")
...
## 只允许 sip_trace mi 命令
## 所有其他命令都不会被跟踪
modparam("mi_datagram", "trace_bwlist", "w: sip_trace")
...
```


#### pretty_printing (int)


指示通过 MI 发送的 JSONRPC 响应是否
应进行美化打印（pretty-print）。


*默认值为 "0 - 不美化打印"。*


```opensips title="设置 pretty_printing 参数"
...
modparam("mi_fifo", "pretty_printing", 1)
...
```


### 导出的函数 {#exported-functions}


没有导出可在配置文件中使用的函数。


### 示例 {#example}


下面示例展示了
"get_statistics dialog: tm:" MI 命令的 DATAGRAM 格式：
请求。


```json title="DATAGRAM 请求"
{"jsonrpc":"2.0","method":"get_statistics","id":"1065","params":[["dialog:","tm:"]]}
```


## 常见问题 {#frequently-asked-questions}


**问：UNIX 和 UDP 两种类型的套接字可以
同时创建吗？**


该版本一次只支持一种套接字。
如果为 socket_name 设置了多个值，最后
一个将生效。


**问：数据报请求的大小有限制吗？**


数据报请求或应答的最大长度为 65457 字节。


**问：在哪里可以找到更多关于 OpenSIPS 的信息？**


请查看 [https://opensips.org/](https://opensips.org/)。


**问：在哪里可以提出关于本模块的问题？**


首先请检查你的问题是否已在我们的某个
邮件列表中得到了回答：

关于任何稳定版 OpenSIPS 的邮件应发送至
users@lists.opensips.org，关于开发版本的邮件
应发送至 devel@lists.opensips.org。

如果希望邮件保持私密，请发送至
users@lists.opensips.org。


**问：如何报告 bug？**


请遵循以下地址提供的指南：
[https://github.com/OpenSIPS/opensips/issues](https://github.com/OpenSIPS/opensips/issues)。
<!-- CONTRIBUTORS -->

### 许可证 {#license}

本项目的所有文档文件（即 .md 扩展名的文件）均以 Creative Common License 4.0 授权。
