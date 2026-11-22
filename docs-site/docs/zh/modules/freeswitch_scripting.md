---
title: "freeswitch_scripting 模块"
description: "freeswitch_scripting 是一个辅助模块，它向 OpenSIPS 脚本暴露对 FreeSWITCH ESL 接口的完整控制能力。"
---


## 管理指南 {#admin-guide}


### 概述 {#overview}


*freeswitch_scripting* 是一个辅助模块，它向 OpenSIPS 脚本暴露对 FreeSWITCH ESL 接口的完整控制能力。


它允许 OpenSIPS 脚本编写者订阅通用的 FreeSWITCH ESL 事件，以及运行任意 FreeSWITCH ESL 命令并解释其结果。它使用 [freeswitch](/zh/modules/freeswitch) 模块来管理 ESL 连接和事件订阅。


对最初的想法以及同时提供 ESL 事件与命令的可用代码示例，感谢 Giovanni Maruzzelli
<gmaruzz@opentelecom.it>。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


以下模块必须与本模块一起加载：


- *freeswitch*
- *（可选）一个 SQL DB 模块*


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，必须安装以下库或应用程序：


- *无*


### 导出的参数 {#exported-parameters}


#### db_url (string)


模块用于加载一组 FreeSWITCH ESL 套接字及其事件订阅的 SQL 数据库 URL。


*默认值为 "NULL"（数据库支持关闭）。*


```opensips title="Setting the db_url parameter"
...
modparam("freeswitch_scripting", "db_url", "dbdriver://username:password@dbhost/dbname")
...
```


#### db_table (string)


本模块使用的 SQL 表名。


*默认值为 "freeswitch"。*


```opensips title="Setting the db_table parameter"
...
modparam("freeswitch_scripting", "db_table", "freeswitch_sockets")
...
```


#### db_col_username (string)


"username" ESL 连接信息对应的 SQL 列名。


*默认值为 "username"。*


```opensips title="Setting the db_col_username parameter"
...
modparam("freeswitch_scripting", "db_col_username", "user")
...
```


#### db_col_password (string)


"password" ESL 连接信息对应的 SQL 列名。


*默认值为 "password"。*


```opensips title="Setting the db_col_password parameter"
...
modparam("freeswitch_scripting", "db_col_password", "pass")
...
```


#### db_col_ip (string)


"ip" ESL 连接信息对应的 SQL 列名。


*默认值为 "ip"。*


```opensips title="Setting the db_col_ip parameter"
...
modparam("freeswitch_scripting", "db_col_ip", "ip_addr")
...
```


#### db_col_port (string)


"port" ESL 连接信息对应的 SQL 列名。


*默认值为 "port"。*


```opensips title="Setting the db_col_port parameter"
...
modparam("freeswitch_scripting", "db_col_port", "tcp_port")
...
```


#### db_col_events (string)


OpenSIPS 将订阅的、以逗号分隔且区分大小写的 FreeSWITCH 事件名所对应的 SQL 列名。


*默认值为 "events_csv"。*


```opensips title="Setting the db_col_events parameter"
...
modparam("freeswitch_scripting", "db_col_events", "fs_events")
...
```


#### fs_subscribe (string) {#fs_subscribe-string}


添加一个 FreeSWITCH ESL URL，OpenSIPS 将在启动时连接它。URL 语法支持指定要订阅的事件列表，遵循以下模式：
**[fs://][[username]:password@]host[:port][?event1[,event2]...]**


*本参数可以设置多次。*


```opensips title="Setting the fs_subscribe parameter"
...
modparam("freeswitch_scripting", "fs_subscribe", ":ClueCon@10.0.0.10?CHANNEL_STATE")
modparam("freeswitch_scripting", "fs_subscribe", ":ClueCon@10.0.0.11:8021?DTMF,BACKGROUND_JOB")
...
```


### 导出的函数 {#exported-functions}


#### freeswitch_esl(command, freeswitch_url[, response_var])


在任意 FreeSWITCH ESL 套接字上运行任意命令。该套接字不必一定在数据库中或通过
**[fs_subscribe](#fs_subscribe-string)** 定义。不过，若属于这种情况，则 URL 中的 "password" 部分变为必填。


当前 OpenSIPS 工作进程会阻塞，直到 FreeSWITCH 的应答到达。该操作的超时可通过
freeswitch 连接管理器模块的 **esl_cmd_timeout** 参数控制。


各参数含义如下：


- *command* (string) - 要执行的 ESL 命令字符串。
- *freeswitch_url* (string) - 要连接的 ESL 接口。语法为：
[fs://][[username]:password@]host[:port][?event1[,event2]...]。
URL 中的 "?events" 部分会被静默丢弃。
- *response_var (var, optional)* - 用于存放 ESL 命令文本结果的变量。


**返回值**


- 1（成功）- ESL 命令执行成功，且所有输出变量均已成功写入。注意这并不说明
ESL 应答的性质（它完全可能是 "-ERR" 类型的响应）
- -1（失败）- 内部错误或 ESL 命令执行失败


该函数可在任意路由中使用。


```opensips title="*freeswitch_esl()* usage"
...
	# ESL 套接字 10.0.0.10 已在数据库中定义（密码 "ClueCon"）
	$var(rc) = freeswitch_esl("bgapi originate {origination_uuid=123456789}user/1010 9386\njob-uuid: foobar", "10.0.0.10", "$var(response)");
	if ($var(rc) < 0) {
		xlog("failed to execute ESL command ($var(rc))\n");
		return -1;
	}
...
	# ESL 套接字 10.0.0.10 是新建的，必须指定密码
	$var(rc) = freeswitch_esl("bgapi originate {origination_uuid=123456789}user/1010 9386\njob-uuid: foobar", ":ClueCon@10.0.0.10", $var(response));
	if ($var(rc) < 0) {
		xlog("failed to execute ESL command ($var(rc))\n");
		return -1;
	}
...
```


### 导出的 MI 命令 {#exported-mi-commands}


#### fs_subscribe {#fs_subscribe}


确保给定的 FreeSWITCH ESL 套接字订阅了给定的事件列表。若某个事件无法订阅，freeswitch
驱动会周期性重试订阅，直到针对相应事件发出 fs_unsubscribe
MI 命令。


参数：


- *freeswitch_url* - 要连接的 ESL 接口。语法为：
[fs://][[username]:password@]host[:port][?event1[,event2]...]。
URL 中的 "?events" 部分会被静默丢弃。
- *event* - 要订阅的事件名
- *...* - （其他事件）


#### fs_unsubscribe


确保给定的 FreeSWITCH ESL 套接字取消订阅给定的事件列表。


参数：


- *freeswitch_url* - 要查找的 ESL 接口。语法为：
[fs://][[username]:password@]host[:port][?event1[,event2]...]。
URL 中的 "?events" 部分会被静默丢弃。
- *event* - 要取消订阅的事件名
- *...* - （其他事件）


#### fs_list


显示当前 FreeSWITCH ESL 套接字集合，以及本模块为每个套接字订阅的事件列表。


#### fs_reload


用 "freeswitch" 表中找到的当前数据（ESL 套接字及其事件）替换当前的 FreeSWITCH ESL
套接字集合*及其各自的事件。


* 这包括通过
[fs_subscribe](#fs_subscribe-string)、MI
[fs_subscribe](#fs_subscribe) 命令或之前的数据库数据集配置的任何套接字/事件。


### 导出的事件 {#exported-events}


#### E_FREESWITCH


当 OpenSIPS 收到来自 "freeswitch_scripting" 模块所订阅套接字的 ESL 事件通知时，会触发该事件。


参数：


- *name* - 事件名
- *sender* - FreeSWITCH 发送方 IP 地址
- *body* - 事件的完整 JSON 编码消息体，
由 FreeSWITCH 发送。使用 json 模块（$json 变量）
可轻松解释它。
<!-- CONTRIBUTORS -->

### 许可证 {#license}

所有文档文件（即扩展名为 .md 的文件）均按 Creative Common License 4.0 授权
