---
title: "tracer 模块"
description: "提供将进入/发出的 SIP 消息存储到数据库的能力。"
sidebar: false
---


## 管理指南 {#admin-guide}


### 概述 {#overview}


提供将进入/发出的 SIP 消息存储到数据库的能力。
自 2.2 版本起，需要加载 proto_hep 模块才能通过
HEP 复制消息。所有 HEP 参数已移入 proto_hep。


OpenSIPS 的 2.2 版本在 tracer 模块中带来了重大改进。
现在只需以合适的参数调用 *trace()* 函数，
它就会完成相应工作。现在可以用同一个函数跟踪
消息、事务与对话。此外，只用一个参数就可以跟踪到
多个数据库、多个 HEP 目的地和 SIP 目的地。
现在只需在 modparam 段中定义 *trace_id*
参数，并在 tracer 函数中在它们之间切换。还可以使用
*trace_on* 全局（对所有 trace_id）
或针对某个 trace_id 打开
和关闭跟踪。


> [!IMPORTANT]
> 在 2.2 版本中，对无状态跟踪的支持已被移除。


可以使用 fifo 命令打开/关闭跟踪。

```bash
opensips-cli -x mi trace on
opensips-cli -x mi trace [some_trace_id] on


opensips-cli -x mi trace off
opensips-cli -x mi trace [some_trace_id] off
```

从 OpenSIPS 3.0 开始，可以使用 *trace_start*
基于自定义过滤器创建动态跟踪目的地。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


以下模块必须先于本模块加载：


- *数据库模块* - mysql、postgres、
dbtext、unixodbc 等，仅在使用数据库类型的
trace id 时需要
- *b2b_logic* - 仅在需要跟踪
B2B 会话时需要。
- *dialog* - 仅在需要跟踪
SIP 对话（基于 INVITE）时需要。
- *tm* - 仅在需要跟踪
SIP 事务时需要。
- *proto_hep* - 仅在需要通过 HEP 协议
跟踪 / 复制消息时需要。


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，必须安装
以下库或应用程序：


- *无*。


### 导出的参数 {#exported-parameters}


#### trace_on (integer)


用于启用/禁用跟踪的参数（on(1)/off(0)）


*默认值为 "1"（启用）。*


```opensips title="Set trace_on parameter"
...
modparam("tracer", "trace_on", 1)
...
```


#### trace_local_ip (str)


用于本地生成消息的源地址字段（协议、IP 与端口）
的地址。如果未设置，
模块会将其设为发送该消息所使用的套接字地址。
协议和/或端口是可选的，省略时
取默认值：udp 与 5060。


*默认值为 "NULL"。*


```opensips title="Set trace_local_ip parameter"
...
#结果地址：udp:10.1.1.1:5064
modparam("tracer", "trace_local_ip", "10.1.1.1:5064")
...

...
#结果地址：tcp:10.1.1.1:5060
modparam("tracer, "trace_local_ip", "tcp:10.1.1.1")
...

...
#结果地址：tcp:10.1.1.1:5064
modparam("tracer", "trace_local_ip", "tcp:10.1.1.1:5064")
...

...
#结果地址：udp:10.1.1.1:5060
modparam("tracer", "trace_local_ip", "10.1.1.1")
...
```


#### trace_id (str)


为跟踪指定一个目的地。它可以是 proto_hep 中定义的
HEP id、SIP URI、文件、syslog facility，
或数据库 URL 加表名。*trace_id* 内的所有参数
必须以 *;* 分隔，最后一个除外。
参数以键值格式给出，可能的键为：
HEP 与 SIP id 使用 *uri*，数据库使用
*uri* 与 *table*。格式为
*[id_name]key1=value1;key2=value2;*。HEP
id **必须**在 proto_hep 中定义，
才能在此处使用。


当 uri 为 *file* 时，必须在冒号后
指定文件路径。如果文件存在，输出总是追加到末尾；
如果不存在则创建，权限使用 [file_mode](#file_mode-integer)。


当 uri 为 *syslog* 时，必须遵循以下
格式：*syslog[:FACILITY[:LEVEL]]*。默认的
facility 与级别是 OpenSIPS 所使用的
（*syslog_facility* 与 *log_level*）。
它们可通过
[syslog_default_facility](#syslog_default_facility-string) 与
[syslog_default_level](#syslog_default_level-integer) 参数调整。


可以在同一个 trace id 下声明多种类型的跟踪，
通过名称加以标识。因此，如果以相同名称定义两个
数据库 URL、一个 HEP URI 和一个 SIP URI，
那么以该名称调用 trace() 时，将向
所有目的地进行跟踪。


所有旧参数（如 db_url、table 与 duplicate_uri）
将组成名称为 "default" 的 trace id。


*无默认值。如果不设置，模块将无法使用。*


```opensips title="Set trace_id parameter"
...
/*数据库 trace id*/
modparam("tracer", "trace_id",
"[tid]
uri=mysql://xxxx:xxxx@10.10.10.10/opensips;
table=new_sip_trace;")
/* hep trace id，其中 hep id 在 proto_hep 中定义；更多信息
 * 请查阅 proto_hep 文档 */
modparam("proto_hep", "hep_id",  "[hid]10.10.10.10")
modparam("tracer", "trace_id", "[tid]uri=hep:hid")
/*sip trace id*/
modparam("tracer", "trace_id",
"[tid]uri=sip:10.10.10.11:5060")
/* 注意它们的名称都相同，
 * 这意味着调用 trace("tid",...)
 * 将同时执行 sql、sip 与 hep 跟踪 */
/*file trace id*/
modparam("tracer", "trace_id",
"[tid]uri=file:/path/to/file")
/*error（级别 -1）时的 syslog trace id*/
modparam("tracer", "trace_id",
"[tid]uri=syslog:LOG_LOCAL0:-1")
...
```


#### syslog_default_facility (string) {#syslog_default_facility-string}


使用 *syslog* 跟踪时，该参数指定
写入跟踪的日志 facility。


Facility 名称必须使用 OpenSIPS 的名称，如 *LOG_LOCAL0* 或
*LOG_DAEMON*。不接受简写形式 *local0*。


*默认值为 *syslog_facility* 的值。*


```opensips title="Set syslog_default_facility parameter"
...
modparam("tracer", "syslog_default_facility", "LOG_DAEMON")
...
```


#### syslog_default_level (integer) {#syslog_default_level-integer}


使用 *syslog* 跟踪时，该参数指定
写入跟踪的级别。


*默认值为 *log_level* 的值。*


```opensips title="Set syslog_default_level parameter"
...
modparam("tracer", "syslog_default_level", 2) # NOTICE
...
```


#### file_mode (integer) {#file_mode-integer}


使用 *file* 跟踪时，该参数
指定创建跟踪文件所用的权限。
它遵循 UNIX 约定。


*默认值为 *0600 (rw-------)*。*


```opensips title="Set file_mode parameter"
...
modparam("tracer", "file_mode", 0644)
...
```


### 导出的函数 {#exported-functions}


#### trace(trace_id, [scope], [type], [trace_attrs], [flags], [correlation_id])


该函数取代了 OpenSIPS 3.0 中的 *sip_trace()*。


存储或复制当前正在处理的 SIP 消息、事务 / 对话或 B2B 会话。
存储的是对其进行更改之前的形式。traced_user_avp
参数现在是 trace() 函数的一个参数。自 2.2 版本起，该函数
在无状态模式（sl_send_reply(...)）下也能捕获内部生成的应答。


该函数可在 REQUEST_ROUTE、FAILURE_ROUTE、ONREPLY_ROUTE、BRANCH_ROUTE 中使用。


各参数含义如下：


- *trace_id (string)*
用于指定在何处进行跟踪的 *trace_id*
名称。
- *scope (string, optional)* 要跟踪
什么：对话、事务、B2B 会话或仅消息。
如果未指定，将尝试可执行的最上层跟踪：
如果已加载 dialog 模块则跟踪对话，否则如果已加载 tm 模块
则跟踪事务，如果这些都未加载则跟踪消息。
类型可以是以下各项：

  - *'m'/'M'* 跟踪消息。这是在无状态模式下
唯一应该使用的类型。
  - *'t'/'T'* 跟踪事务。如果未加载 tm
模块，将处于无状态事务感知
模式，这意味着会捕获选定的请求（进入与离开）
以及内部生成的应答。
  - *'d'/'D'* 跟踪对话
  - *'b'/'B'* 跟踪与之后将要创建的 B2B 会话
相关的所有流量
- *type (string, optional)* 该函数要跟踪的
消息类型列表；如果未设置，则只跟踪 SIP 消息；
如果设置了该参数，但未指定 *sip*，
则不会跟踪 *sip*；
列表中所有参数必须以 '|'
分隔。
当前可跟踪的类型如下：

  - *sip* - 启用 SIP 消息
跟踪；
  - *xlog* - 在当前作用域（对话、事务、B2B 会话
或消息）中启用 xlog 消息
跟踪；
  - *rest* - 启用 rest 消息
跟踪；
- *trace_attrs (string, optional)* 该参数
取代旧版本中的 traced_user_avp。为避免仅因该参数而
重复记录，此处放入的内容（字符串/pvar）
将存储在 sip_trace 表的 trace_attrs 列中。
- *flags (string,pvar)* 是对跟踪过程的
一些控制标志（如何跟踪以及跟踪什么）。

  - *C* - 仅跟踪 SIP 主叫侧；
  - *c* - 仅跟踪 SIP 被叫侧；
如果 *C* 与 *c* 标志都缺失，则视为跟踪两侧/两腿。
注意：这些标志仅由事务跟踪与对话跟踪支持
- *correlation_id (string,pvar)* 强制使用的自定义
SIP 关联 ID（通常使用 SIP Call-ID），
用于把该流量（事务、对话）与其他流量关联起来。


```opensips title="trace() usage"
...
/* 参见 trace_id 一节中 tid 的声明 */
	$var(trace_id) = "tid";
	$var(user) = "osip_user@opensips.org";

...
/* 示例 1：如何跟踪对话的 sip 与 xlog */
	if (has_totag()) {
		match_dialog();
	} else {
		if (is_method("INVITE") {
			trace($var(trace_id), "d", "sip|xlog", $var(user));
		}
	}
...
/* 示例 2：如何跟踪初始 INVITE 与 BYE，sip 与 rest */
	if (has_totag()) {
		if (is_method("BYE")) {
			trace($var(trace_id), "m", "sip|rest", $var(user));
		}
	} else {
		if (is_method("INVITE")) {
			trace($var(trace_id), "m", "sip|rest", $var(user));
		}
	}

...
/* 示例 3：仅跟踪初始 INVITE 事务的 xlog 与 rest，不含 sip */
	if (!has_totag()) {
		if (is_method("INVITE")) {
			trace($var(trace_id), "t", "xlog|rest", $var(user));
		}
	}
...
/* 示例 4：无状态事务感知模式！*/
/* 不得加载 tm 模块 */
	if (is_method("REGISTER")) {
		trace($var(trace_id), "t", "xlog|rest", $var(user));
		if (!www_authorize("", "subscriber")) {
			/* tracer 也会捕获 www_challenge() 生成的 401 */
			www_challenge("", "auth");
		}
	}
```


### 导出的 MI 函数 {#exported-mi-functions}


#### trace


启用/禁用跟踪（全局或针对特定 trace id），或转储
trace id 的信息。该命令要求使用命名参数
（每个参数以 param_name=param_value 格式给出）。


名称：*trace*


参数：


- *id*（可选）- 跟踪实例的名称。
如果缺少该参数，命令将
转储所有 trace id 的信息（并返回全局跟踪状态）
或设置全局跟踪状态。
- *mode*（可选）-
可能的值为：

  - "on" - 启用跟踪
  - "off" - 禁用跟踪
如果缺少第一个参数，命令将设置全局
跟踪状态，否则将为特定 trace id 设置状态。
如果打开全局跟踪，但某些 trace id 的跟踪被设为
关闭，则它们不会进行跟踪。如果希望为
所有 trace id 打开跟踪，必须逐个
分别设置。
如果缺少该参数但设置了第一个参数，命令将
仅转储该特定 trace id 的信息。如果两个参数都
缺失，命令将返回全局跟踪状态并转储
每个 id 的信息。


MI FIFO 命令格式：


```bash
# 显示全局跟踪模式与所有跟踪目的地：
opensips-cli -x mi trace
# 关闭全局跟踪：
opensips-cli -x mi trace mode=off
# 为目的地 id tid2 打开跟踪：
opensips-cli -x mi trace id=tid2 mode=on
		
```


#### trace_start


基于自定义过滤器创建动态跟踪目的地。
该函数可用于实时调试
发往特定目的地的呼叫。


动态目的地不会在重启后保留！


名称：*trace_start*


参数：


- *id* - 跟踪实例的名称。
- *uri* - 该实例的目的地 uri。
- *filter*（可选）- 用于过滤
发送方收到的流量。该参数应为数组，可以
包含多个 *condition=value*
格式的过滤器。
*condition* 参数可能的值为：

  - caller
  - callee
  - ip
*condition* 参数可以由多个不同的过滤器组成。
为了满足整体条件并把流量发送到期望的目的地，
所有条件都必须满足。
如果缺少该参数，则所有流量都转发到该目的地。
过滤器应用于任何进入的请求
- *scope* - 要启用的跟踪作用域。
该参数接收的格式与
*trace()* 函数接收的格式类似。
- *type* - 希望接收的消息类型。
该参数接收的格式与
*trace()* 函数接收的格式类似。


用于开始跟踪从 IP 127.0.0.1 发往 HEP 目的地 10.0.0.1:9060 的呼叫的 MI FIFO 命令：


```bash
opensips-cli -x mi trace_start id=ip_filter uri=hep:10.0.0.1:9060 filter=ip=127.0.0.1
```


用于开始跟踪从用户 Alice 到用户 Bob 的呼叫的 MI FIFO 命令：


```bash
opensips-cli -x mi trace_start id=alice_bob uri=hep:10.0.0.1:9060 filter=caller=Alice filter=caller=Bob
```


#### trace_stop


使 OpenSIPS 停止向通过 *trace_start* 命令创建的
动态 trace id 发送流量。


名称：*trace_stop*


参数：


- *id* - 要停止的跟踪实例的名称。


用于停止跟踪从用户 Alice 到用户 Bob 的呼叫的 MI FIFO 命令：


```bash
opensips-cli -x mi trace_stop alice_bob
```


### 数据库配置 {#database-setup}


在使用 tracer 运行 OpenSIPS 之前，必须先建立模块
存储数据所用的数据库表。为此，如果这些表
不是由安装脚本创建的，或者你选择
自行安装全部内容，可以使用 opensips/scripts 文件夹中
各数据库目录下的 tracer-create.sql
SQL 脚本作为模板。
完整的数据库文档也可在项目网页
[https://opensips.org/docs/db/db-schema-devel.html](https://opensips.org/docs/db/db-schema-devel.html) 上找到。


### 已知问题 {#known-issues}


与事务相关、离开 OpenSIPS 的 ACK 不会被
跟踪，因为它们通过 forward_request 函数以无状态方式处理。
若要修复，就需要注册一个 fwdcb 回调，该回调会对
所有消息调用但只被 ACK 使用，效率
极低。
<!-- CONTRIBUTORS -->

### 许可证 {#license}

本项目的所有文档文件（即 .md 扩展名的文件）均以 Creative Common License 4.0 授权。
