---
title: "动态套接字管理模块"
description: "本模块提供了在运行时为 OpenSIPS 配置和管理动态套接字的手段。"
---


## 管理指南 {#admin-guide}


### 概述 {#overview}


本模块提供了在运行时为 OpenSIPS 配置和管理动态套接字
的手段。套接字的定义存储在 SQL 数据库中，
并可在运行时动态变更。


本模块会缓存整个 sockets 表，并且只在使用
[sockets_reload](#sockets_reload) MI 命令重新加载之后
才调整动态套接字列表。


[sockets_list](#sockets_list) MI 命令
可用于显示 OpenSIPS 当前监听的所有动态套接字。


### 套接字 {#sockets}


本模块只处理用于 SIP 流量的套接字（例如
UDP、TCP、TLS、WSS）。它不支持 BIN 或 HEP 监听地址，
因为这些无法在脚本中动态利用或强制。


动态套接字的管理分为两种行为，取决于流量是
基于 UDP 还是基于 TCP。请根据流量的特性，
确保对相关设置进行适当调优，以容纳可能
动态配置的任何套接字。


#### UDP 处理 {#udp-handling}


所有动态添加的 UDP 套接字都被分配到一个专用的
额外进程组。这些进程的数量可通过
[processes](#processes-integer) 参数调整。这些进程通过在负载较低的
进程之间均衡请求，来均匀处理基于 UDP 的套接字流量。
不过区别在于，静态套接字绑定到指定的进程，
而动态套接字共享这一额外进程池。


#### TCP 处理 {#tcp-handling}


与 UDP 流量处理不同，TCP 流量按处理所有其他
TCP 流量的同样方式处理：请求被分发到某个
现有的静态 TCP 进程。


### 限制 {#limitations}


尽管动态工作进程的流量处理与静态工作进程非常相似，
但使用动态套接字仍存在一些限制：


- UDP 套接字处理目前无法从专用额外进程的
自动伸缩特性中受益。这意味着
启动时定义的 [processes](#processes-integer) 数量
将始终被 fork 出来，且只有这些进程会处理与
动态添加的 UDP 套接字相关的全部流量。
- 如前所述，本模块仅支持基于 SIP 的动态
监听地址，不支持 HEP 或 BIN。
- 数据库中定义的套接字无法扩展为多个
监听地址。这意味着你不能使用接口名或
可解析为多个 IP 的别名作为主机。只会创建
单个 IP:port 套接字，因此理想情况下应
使用明确的 IP 进行配置。
- 由于一些内部限制，动态套接字需要在启动时
预先分配。这意味着运行时使用的动态
套接字数量必须受限于启动时定义的静态值。
这正是建议为 [max_sockets](#max_sockets-integer)
参数中的套接字设置一个相当高的值的原因 -
我们的默认值是相当宽裕的 100 个套接字。
- [max_sockets](#max_sockets-integer) 中定义的套接字
按 FIFO 方式轮换 - 以此尽量避免在短时间内
出现套接字重叠。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


在本模块之前必须加载以下模块：


- *需要一个数据库模块来获取套接字*。


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，必须安装以下库或应用程序：


- *无*。


### 导出的参数 {#exported-parameters}


#### db_url (string)


从中获取套接字的数据库 URL。


*默认值为 "mysql://opensips:opensipsrw@localhost/opensips"。*


```opensips title="设置 'db_url' 参数"
...
modparam("sockets_mgm", "db_url", "dbdriver://username:password@dbhost/dbname")
...
```


#### table_name (string)


存储套接字的数据库表名。


*默认值为 "sockets"。*


```opensips title="设置 'table_name' 参数"
...
modparam("sockets_mgm", "table_name", "sockets_def")
...
```


#### socket_column (string)


存储套接字定义的数据库表列。


*默认值为 "socket"。*


```opensips title="设置 'socket_column' 参数"
...
modparam("sockets_mgm", "socket_column", "sock")
...
```


#### advertised_column (string)


存储 advertised 定义的数据库表列。


*默认值为 "advertised"。*


```opensips title="设置 'advertised_column' 参数"
...
modparam("advertiseds_mgm", "advertised_column", "adv")
...
```


#### tag_column (string)


存储 tag 定义的数据库表列。


*默认值为 "tag"。*


```opensips title="设置 'tag_column' 参数"
...
modparam("tags_mgm", "tag_column", "sock")
...
```


#### flags_column (string)


存储 flags 定义的数据库表列。


*默认值为 "flags"。*


```opensips title="设置 'flags_column' 参数"
...
modparam("flagss_mgm", "flags_column", "sock")
...
```


#### tos_column (string)


存储 tos 定义的数据库表列。


*默认值为 "tos"。*


```opensips title="设置 'tos_column' 参数"
...
modparam("toss_mgm", "tos_column", "sock")
...
```


#### processes (integer) {#processes-integer}


指定用于处理 UDP 套接字的进程数量。


*默认值为 "8"。*


```opensips title="设置 'processes' 参数"
...
modparam("sockets_mgm", "processes", 32)
...
```


#### max_sockets (integer) {#max_sockets-integer}


可动态定义的套接字最大数量。
更多信息参见[限制](#limitations)一节。


*默认值为 "100"。*


```opensips title="设置 'max_sockets' 参数"
...
modparam("sockets_mgm", "max_sockets", 2000)
...
```


### 导出的 MI 函数 {#exported-mi-functions}


#### sockets_reload {#sockets_reload}


用于从数据库重新加载套接字的 MI 命令。


MI FIFO 命令格式：


```bash
## 从数据库重新加载套接字
opensips-mi sockets_reload
opensips-cli -x mi sockets_reload
```


#### sockets_list {#sockets_list}


列出当前使用的所有动态套接字的 MI 命令。


MI FIFO 命令格式：


```bash
## 从数据库重新加载套接字
opensips-mi sockets_list
opensips-cli -x mi sockets_list
```
<!-- CONTRIBUTORS -->

### 许可证 {#license}

所有文档文件（即以 .md 为扩展名的文件）均按 Creative Common License 4.0 授权。
