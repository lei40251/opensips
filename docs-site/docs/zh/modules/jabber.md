---
title: "jabber 模块"
description: "这是 Jabber 模块的新版本，集成 XODE XML 解析器用于解析 Jabber 消息。"
---

## 管理指南 {#admin-guide}


### 概述 {#overview}


这是 Jabber 模块的新版本，集成 XODE
XML 解析器用于解析 Jabber 消息。这
引入了一个新的模块依赖：expat 库。


Expat 是一个常见的 XML 库，也是 Linux/Unix 上
可用的最快库，在所有平台中仅次于 msxml 库，位列第二。它
已集成到大多数知名的 Linux 发行版中。


#### 新特性 {#new-features}


- 呈现（presence）支持（示例 cfg 文件见 doc/xxjab.cfg）
（2003 年 1 月）。
- SIP 到 Jabber 会议支持（2003 年 12 月）。
- 可以管理各种 Jabber 消息
（message/presence/iq）（2003 年 12 月）。
- 别名——可以为地址设置主机别名
（参见参数说明）（2003 年 12 月）。
- 通过 Jabber 服务器将收到的 SIP MESSAGE 消息发送到不同的 IM 网络
（Jabber、ICQ、MSN、AIM、Yahoo）（2003 年 12 月）。
- 将收到的 Jabber 即时消息作为 SIP MESSAGE 消息发送。
- 网关检测——能够查看某个 IM 网关是上线
还是下线。


### 管理员指南 {#admins-guide}


> [!NOTE]
> 关于 SIMPLE2Jabber 网关的更完整指南可在
> [https://opensips.org/](https://opensips.org/) 找到。下面这部分内容即将被删除，只有网站上的手册
> 会持续更新。


Jabber 服务器的设置不属于本指南的主题。请查阅 [http://www.jabber.org](http://www.jabber.org)。


用于创建 Jabber 网关数据库、或从 Web 管理
Jabber 账号的有用脚本位于模块的 'doc' 子目录中。


使用 Jabber 网关的主要步骤：


- 创建 MySQL 数据库。
- 设置本地 Jabber 服务器。
- 在 OpenSIPS 的 cfg 文件中设置模块参数值，加载
依赖模块，为 Jabber 网关设置路由规则。
- 运行 OpenSIPS。


OpenSIPS/Jabber 网关的管理员*必须*
告知用户 Jabber/其他 IM 网络的别名是什么。
其他 IM 可能是 AIM、ICQ、
MSN、Yahoo 等。


这些别名取决于运行 OpenSIPS 的服务器主机名
以及本地 Jabber 服务器的设置方式。


下面给出一个用例。前提：


- OpenSIPS 运行在 "server.org" 上。
- 本地 Jabber 服务器运行在 "jabsrv.server.org" 上。
- Jabber 网络别名（"jdomain" 的第一部分）为
"jabber.server.org"


其他 IM 网络的别名*必须*与
Jabber 配置文件中为各 IM 传输设置的 JID
相同。


Jabber 传输的 JID
*必须*以网络名开头。
对于 AIM，JID 必须以
"aim." 开头，对于 ICQ 以
"icq" 开头（这是因为我使用 icqv7-t），对于
MSN 以 "msn." 开头，对于
Yahoo 以 "yahoo." 开头。网关需要这些信息来判断
哪些传输可用、哪些不可用。在我们的用例中，它们
可以是 "aim.server.org"、
"icq.server.org"、
"msn.server.org"、"yahoo.server.org"。


建议在 DNS 中配置这些别名，这样
客户端应用就能解析该 DNS 名称。
否则必须将出站代理设置为 OpenSIPS 服务器。


*** Jabber 网关的路由规则 第一步是配置 OpenSIPS
识别发往 Jabber 网关的消息。参见
"doc/xjab.cfg" 中的示例。思路是在
消息中查找目的地址，如果它包含 Jabber 别名或
其他 IM 别名，就说明该消息是发往 Jabber 网关的。


下一步是弄清楚该消息对 Jabber 网关意味着什么。
它可能是一条触发网关执行某个
动作的特殊消息，也可能是一条应投递到 Jabber
网络的普通消息（使用 "jab_send_message" 方法）。


特殊消息用于：


- 注册到 Jabber 服务器（在 Jabber 网络中上线）——此处
必须调用 "jab_go_online" 方法。
- 离开 Jabber 网络（在 Jabber 网络中下线）——此处
必须调用 "jab_go_offline" 方法。
- 加入 Jabber 会议室——此处必须调用
"jab_join_jconf"。
- 离开 Jabber 会议室——此处必须调用
"jab_exit_jconf"。


目的地址*必须*遵循
以下模式：


- 对于 Jabber 网络：
"username&lt;delim&gt;jabber_server@jabber_alias"。
- 对于 Jabber 会议："nickname&lt;delim&gt;room&lt;delim&gt;conference_server@jabber_alias"。
- 对于 AIM 网络：
"aim_username@aim_alias"。
- 对于 ICQ 网络：
"icq_number@icq_alias"。
- 对于 MSN 网络：
"msn_username&lt;delim&gt;msn_server@msn_alias"。
msn_server 可以是 "msn.com" 或
"hotmail.com"。
- 对于 YAHOO 网络："yahoo_username@yahoo_alias"。


> [!NOTE]
> "jabber_alias" 是 "jdomain" 的第一部分。


### 管理指南 {#admin-guide-1}


用户必须激活与其 SIP id 关联的 Jabber 账号。对于他想发送消息的
每个其他 IM 网络，他必须为该 IM
网络设置一个账号。除本地 Jabber 服务器外，网关
无法在外部网络中创建新账号。


当你想向其他 IM 网络中的某人发送消息时，必须按照
该 IM 网络对应的模式设置消息的目的地址
（参见「管理员指南」章节的最后部分）。


向 Jabber 网络中的 user@jabber.xxx.org 发送消息时，
目的地址必须是：user&lt;delim&gt;jabber.xxx.org@jabber_alias。


对于 Yahoo 网络中的某人，目的地址必须是：
user@yahoo_alias


> [!NOTE]
> OpenSIPS 管理员必须为每个 IM 网络设置 Jabber 传输，
> 才能向这些网络发送消息。每个 IM 网络的别名
> 可以向 OpenSIPS 管理员查询。你无法从你的 SIP 客户端向你所关联的 Jabber
> 账号发送消息——这有点像给自己发消息。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


在使用本模块之前必须先加载以下模块：


- 数据库模块。
- *pa*（可选）- 呈现代理（Presence Agent）。
- *tm* - 事务管理器。


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，必须安装以下库
或应用程序：


- *Expat* 库。


### 导出的参数 {#exported-parameters}


#### db_url (string)


数据库的 SQL URL。


*默认值为 "mysql://root@127.0.0.1/sip_jab"。*


```opensips title="Set db_url parameter"
...
modparam("jabber", "db_url", "mysql://username:password@host/sip_jab")
...
```


#### jaddress (string)


Jabber 服务器的 IP 或主机名——必须与 Jabber 服务器
配置文件中 &lt;host&gt; 标签的值相同。


*默认值为 "127.0.0.1"。*


```opensips title="Set jaddress parameter"
...
modparam("jabber", "jaddress", "1.2.3.4")
...
```


#### jport (integer)


Jabber 服务器的端口号。


*默认值为 "5222"。*


```opensips title="Set jport parameter"
...
modparam("jabber", "jport", 1234)
...
```


#### jdomain (string)


格式：jabber.sipserver.com=&lt;delim&gt;。如果目的地是 Jabber 网络，
URI 应形如：username&lt;delim&gt;jabber_server@jdomain 或
nickname&lt;delim&gt;roomname&lt;delim&gt;conference_server@jdomain


&lt;delim&gt; 必须是非保留字符。默认情况下该字符是 * 。在
消息发送到 Jabber 服务器之前，目的地址将被转换为 username@jabber_server 或
roomname@conference_server/nickname。


*默认值为无。*


```opensips title="Set jdomain parameter"
...
modparam("jabber", "jdomain", "jabber.sipserver.com=*")
...
```


#### aliases (string)


IM 网络的别名。


格式："N;alias1=&lt;delim1&gt;;...;aliasN=&lt;delimN&gt;;"
形如 '*@aliasX' 的目的地址可以采用与 Jabber 网络所指定格式不同的
其他格式。如果目的地址包含 &lt;aliasX&gt;，则目的地址用户部分中的所有 &lt;delim&gt;
都会被替换为 &lt;delimX&gt;。


（示例：jdomain 为 'jabber.x.com=*'，msn_alias 为 'msn.x.com=%'。在 SIP 侧，
发往 MSN 网络的目的地址形如
'username*hotmail.com@msn.x.com'。该目的地址将被转换为
'username%hotmail.com@msn.x.com'。'msn.x.com' 必须与
Jabber 配置文件（通常是 'jabberd.xml'）中与 MSN 传输关联的
JID 相同）


*默认值为无。*


```opensips title="Set jdomain parameter"
...
modparam("jabber", "aliases", "1;msn.x.com=%")
...
```


#### proxy (string)


出站代理地址。


格式：ip_address:port hostname:port


网关生成的所有 SIP 消息都将发送到该地址。如果
缺失，消息将投递到目的地址的主机名


默认值为无。


```opensips title="Set proxy parameter"
...
modparam("jabber", "proxy", "10.0.0.1:5060 sipserver.com:5060")
...
```


#### registrar (string)


代表其发送 INFO 和 ERROR 消息的地址。


*默认值为 "jabber_gateway@127.0.0.1"。*


```opensips title="Set registrar parameter"
...
modparam("jabber", "registrar", "jabber_gateway@127.0.0.1")
...
```


#### workers (integer)


工作进程数。


*默认值为 2。*


```opensips title="Set workers parameter"
...
modparam("jabber", "workers", 2)
...
```


#### max_jobs (integer)


每个工作进程的最大任务数。


*默认值为 10。*


```opensips title="Set max_jobs parameter"
...
modparam("jabber", "max_jobs", 10)
...
```


#### cache_time (integer)


Jabber 连接的缓存时间。


*默认值为 600。*


```opensips title="Set cache_time parameter"
...
modparam("jabber", "cache_time", 600)
...
```


#### delay_time (integer)


保留 SIP 消息的时间（秒）。


*默认值为 90 秒。*


```opensips title="Set delay_time parameter"
...
modparam("jabber", "delay_time", 90)
...
```


#### sleep_time (integer)


检查过期 Jabber 连接的间隔时间（秒）。


*默认值为 20 秒。*


```opensips title="Set sleep_time parameter"
...
modparam("jabber", "sleep_time", 20)
...
```


#### check_time (integer)


检查 JabberGW 工作进程状态的间隔时间（秒）。


*默认值为 20 秒。*


```opensips title="Set check_time parameter"
...
modparam("jabber", "check_time", 20)
...
```


#### priority (str)


Jabber 网关的呈现优先级。


*默认值为 "9"。*


```opensips title="Set priority parameter"
...
modparam("jabber", "priority", "3")
...
```


### 导出的函数 {#exported-functions}


#### jab_send_message()


将 SIP MESSAGE 消息转换为 Jabber 消息并发送到 Jabber 服务器。


该函数可在 REQUEST_ROUTE 中使用。


```opensips title="jab_send_message() usage"
...
jab_send_message();
...
```


#### jab_join_jconf()


加入 Jabber 会议——昵称、房间名和会议服务器地址
应包含在 To 头域中，格式为：nickname%roomname%conference_server@jdomain。如果
缺少昵称，则使用 SIP 用户名。


该函数可在 REQUEST_ROUTE 中使用。


```opensips title="jab_join_jconf() usage"
...
jab_join_jconf();
...
```


#### jab_exit_jconf()


离开 Jabber 会议——昵称、房间名和会议服务器地址
应包含在 To 头域中，格式为：nickname%roomname%conference_server@jdomain。


该函数可在 REQUEST_ROUTE 中使用。


```opensips title="jab_exit_jconf() usage"
...
jab_exit_jconf();
...
```


#### jab_go_online()


使用 SIP 用户关联的 Jabber ID 注册到 Jabber 服务器。


该函数可在 REQUEST_ROUTE 中使用。


```opensips title="jab_go_online() usage"
...
jab_go_online();
...
```


#### jab_go_offline()


将 SIP 用户关联的 Jabber ID 从 Jabber 服务器注销。


该函数可在 REQUEST_ROUTE 中使用。


```opensips title="jab_go_offline() usage"
...
jab_go_offline();
...
```
<!-- CONTRIBUTORS -->

### 许可证 {#license}


所有文档文件（即 .md 扩展名）均按 Creative Common License 4.0 授权。
