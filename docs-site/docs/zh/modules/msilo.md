---
title: "MSILO 模块"
description: "本模块为 OpenSIPS 服务器提供离线消息存储。"
---

## 管理指南 {#admin-guide}


### 概述 {#overview}


本模块为 OpenSIPS 服务器提供离线消息存储。它会
为用户离线时收到的消息进行存储，并在
该用户上线时将其发送。


对于每条消息，本模块只在 "Request-URI"
（"R-URI"）是完整的地址记录
（"username@hostname"）时才存储它，此外还存储来自 "To"
头域的 URI、来自 "From" 头域的 URI、到达时间、
过期时间、内容类型以及消息体。如果
"R-URI" 不是地址记录（它可能是当前 SIP 会话的
联系地址），则将 "To" 头域中的 URI
用作 R-URI。


当过期时间过去后，该消息会从
数据库中丢弃。过期时间根据到达时间和
模块的某个参数计算得出。


每当用户向 OpenSIPS 注册时，本模块都会在
数据库中查找发给该用户的离线消息。这些消息
都会发送到 REGISTER 请求中提供的联系地址。


可能会出现 SIP 用户已注册、但其 SIP 用户代理
不支持 MESSAGE 请求的情况。此时应使用
"failure_route" 来存储未投递的请求。


本模块提供的另一项功能是在特定时间发送
消息——提醒功能。借助配置逻辑，收到的消息
可以被存储，并在存储时通过 'snd_time_avp'
指定的时间投递。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


在使用本模块之前必须先加载以下模块：


- *数据库模块* - mysql、dbtext 或其他
实现了 "db" 接口并
提供向数据库系统存储/从数据库系统接收数据
支持的模块。
- *TM*——事务模块——用于
发送 SIP 请求。


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前
必须安装以下库或应用程序：


- *无*。


### 导出的参数 {#exported-parameters}


#### db_url (string)


数据库 URL。


*默认值为
"mysql://opensips:opensipsrw@localhost/opensips"。*


```opensips title="Set the 'db_url' parameter"
...
modparam("msilo", "db_url", "mysql://user:passwd@host.com/dbname")
...
```


#### db_table (string)


存储消息的表名。


*默认值为 "silo"。*


```opensips title="Set the 'db_table' parameter"
...
modparam("msilo", "db_table", "silo")
...
```


#### from_address (string)


用于通知用户其消息目的地不在线的 SIP 地址，该消息
将在该用户下次上线时投递。如果未设置该参数，
模块不会发送任何通知。它可以包含伪变量。


*默认值为 "NULL"。*


```opensips title="Set the 'from_address' parameter"
...
modparam("msilo", "from_address", "sip:registrar@example.org")
modparam("msilo", "from_address", "sip:$rU@example.org")
...
```


#### contact_hdr (string)


要添加到通知消息中的 Contact 头域值（包括头域名和
结尾的 \r\n）。
它可以包含伪变量。


*默认值为 "NULL"。*


```opensips title="Set the 'contact_hdr' parameter"
...
modparam("msilo", "contact_hdr", "Contact: <sip:null@example.com>\r\n")
...
```


#### offline_message (string)


通知消息的消息体。
它可以包含伪变量。


*默认值为 "NULL"。*


```opensips title="Set the 'offline_message' parameter"
...
modparam("msilo", "offline_message", "*** User $rU is offline!")
modparam("msilo", "offline_message", "<em>I am offline!</em>")
...
```


#### content_type_hdr (string)


要添加到通知消息中的 Content-Type 头域值（包括头域名和
结尾的 \r\n）。它必须与
'offline_message' 的内容相符。
它可以包含伪变量。


*默认值为 "NULL"。*


```opensips title="Set the 'content_type_hdr' parameter"
...
modparam("msilo", "content_type_hdr", "Content-Type: text/plain\r\n")
modparam("msilo", "content_type_hdr", "Content-Type: text/html\r\n")
...
```


#### reminder (string)


用于发送提醒消息的 SIP 地址。如果未设置该值，
提醒功能将被禁用。


*默认值为 "NULL"。*


```opensips title="Set the 'reminder' parameter"
...
modparam("msilo", "reminder", "sip:registrar@example.org")
...
```


#### outbound_proxy (string)


发送消息时用作下一跳的 SIP 地址。当
OpenSIPS 使用的域名不在 DNS 中，或
使用独立的 OpenSIPS 实例处理 msilo 时非常有用。如果未设置，
消息将发送到目标 URI 中的地址。


*默认值为 "NULL"。*


```opensips title="Set the 'outbound_proxy' parameter"
...
modparam("msilo", "outbound_proxy", "sip:opensips.org;transport=tcp")
...
```


#### expire_time (int)


存储消息的过期时间——秒。当该时间过去后，消息会
从数据库中静默丢弃。


*默认值为 "259200（72 小时 = 3 天）"。*


```opensips title="Set the 'expire_time' parameter"
...
modparam("msilo", "expire_time", 36000)
...
```


#### check_time (int)


检查已转储消息是否发送成功的定时器间隔——秒。模块会
保留自己为新上线用户发送的每个请求，如果应答为 2xx，则
该消息会从数据库中删除。


*默认值为 "30"。*


```opensips title="Set the 'check_time' parameter"
...
modparam("msilo", "check_time", 10)
...
```


#### send_time (int)


以秒为单位检查是否存在提醒消息的定时器间隔。
模块会取出所有应在该时刻
或之前发送的提醒消息。


如果该值为 0，提醒功能将被禁用。


*默认值为 "0"。*


```opensips title="Set the 'send_time' parameter"
...
modparam("msilo", "send_time", 60)
...
```


#### clean_period (int)


每隔多少个 "check_time" 周期检查
数据库中是否存在过期消息。


*默认值为 "5"。*


```opensips title="Set the 'clean_period' parameter"
...
modparam("msilo", "clean_period", 3)
...
```


#### use_contact (int)


开启/关闭使用 Contact 地址向消息被 MSILO 存储的
发送者回送通知。


*默认值为 "1（0 = 关闭，1 = 开启）"。*


```opensips title="Set the 'use_contact' parameter"
...
modparam("msilo", "use_contact", 0)
...
```


#### sc_mid (string)


silo 表中存储消息 id 的列名。


默认值为 "mid"。


```opensips title="Set the 'sc_mid' parameter"
...
modparam("msilo", "sc_mid", "other_mid")
...
```


#### sc_from (string)


silo 表中存储源地址的列名。


默认值为 "src_addr"。


```opensips title="Set the 'sc_from' parameter"
...
modparam("msilo", "sc_from", "source_address")
...
```


#### sc_to (string)


silo 表中存储目的地址的列名。


默认值为 "dst_addr"。


```opensips title="Set the 'sc_to' parameter"
...
modparam("msilo", "sc_to", "destination_address")
...
```


#### sc_uri_user (string)


silo 表中存储用户名的列名。


默认值为 "username"。


```opensips title="Set the 'sc_uri_user' parameter"
...
modparam("msilo", "sc_uri_user", "user")
...
```


#### sc_uri_host (string)


silo 表中存储域的列名。


默认值为 "domain"。


```opensips title="Set the 'sc_uri_host' parameter"
...
modparam("msilo", "sc_uri_host", "domain")
...
```


#### sc_body (string)


silo 表中存储消息体的列名。


默认值为 "body"。


```opensips title="Set the 'sc_body' parameter"
...
modparam("msilo", "sc_body", "message_body")
...
```


#### sc_ctype (string)


silo 表中存储内容类型的列名。


默认值为 "ctype"。


```opensips title="Set the 'sc_ctype' parameter"
...
modparam("msilo", "sc_ctype", "content_type")
...
```


#### sc_exp_time (string)


silo 表中存储消息过期时间的列名。


默认值为 "exp_time"。


```opensips title="Set the 'sc_exp_time' parameter"
...
modparam("msilo", "sc_exp_time", "expire_time")
...
```


#### sc_inc_time (string)


silo 表中存储消息到达时间的列名。


默认值为 "inc_time"。


```opensips title="Set the 'sc_inc_time' parameter"
...
modparam("msilo", "sc_inc_time", "incoming_time")
...
```


#### sc_snd_time (string)


silo 表中存储提醒发送时间的列名。


默认值为 "snd_time"。


```opensips title="Set the 'sc_snd_time' parameter"
...
modparam("msilo", "sc_snd_time", "send_reminder_time")
...
```


#### snd_time_avp (str)


一个 AVP 的名称，其中可包含将收到的消息
作为提醒发送的时间。该 AVP 仅由 m_store() 使用。


如果未设置该参数，模块不会查找该 AVP。如果
该值被设置为有效的 AVP 名称，则模块期望该 AVP
中是格式为 YYYYMMDDHHMMSS 的时间值（例如 20060101201500）。


*默认值为 "null"。*


```opensips title="Set the 'snd_time_avp' parameter"
...
modparam("msilo", "snd_time_avp", "$avp(snd_time)")
...
```


#### add_date (int)


是否在消息前添加其存储日期作为前缀。


*默认值为 "1"（1==开启/0==关闭）。*


```opensips title="Set the 'add_date' parameter"
...
modparam("msilo", "add_date", 0)
...
```


#### max_messages (int)


一个 AoR 可存储的最大消息数。值 0
表示不限制。


*默认值为 0。*


```opensips title="Set the 'max_messages' parameter"
...
modparam("msilo", "max_messages", 0)
...
```


### 导出的函数 {#exported-functions}


#### m_store([owner])


该方法存储当前 SIP 请求的某些部分（应在
请求类型为 MESSAGE 且目的用户离线或其 UA
不支持 MESSAGE 请求时调用）。如果用户
注册时使用的 UA 不支持 MESSAGE 请求，
且你已将请求 URI 改为该用户 UA 的联系地址，则
不应使用 mode="0"。


参数含义如下：


- *owner*（string，可选）- 消息将存入其
收件箱的 SIP URI。如果缺少 "owner"，
则从 R-URI 中获取 SIP 地址。


该函数可在 REQUEST_ROUTE、FAILURE_ROUTE 中使用。


```opensips title="m_store usage"
...
m_store();
m_store($tu);
...
```


#### m_dump([owner], [maxmsg])


该方法将存储的消息发送给即将注册的 SIP 用户的
实际联系地址。应在收到 REGISTER 请求
且 "Expire" 头域的值大于零时
调用该方法。


参数含义如下：


- *owner*（string，可选）-
将要转储其收件箱的 SIP URI。如果缺少 "owner"，
则从 To URI 中获取 SIP 地址。
- *maxmsg*（int，可选）- 要转储的
最大消息数。


该函数可在 REQUEST_ROUTE、STARTUP_ROUTE、
TIMER_ROUTE、EVENT_ROUTE 中使用。


```opensips title="m_dump usage"
...
m_dump();
m_dump($fu);
m_dump($fu, 10);
...
```


### 导出的统计 {#exported-statistics}


#### stored_messages


msilo 存储的消息数。


#### dumped_messages


已转储的消息数。


#### failed_messages


转储失败的消息数。


#### dumped_reminders


已转储的提醒消息数。


#### failed_reminders


失败的提醒消息数。


## 示例 {#samples}


[samples](https://github.com/OpenSIPS/opensips/tree/3.6/modules/msilo/samples)
<!-- CONTRIBUTORS -->

### 许可证 {#license}


所有文档文件（即 .md 扩展名）均按 Creative Common License 4.0 授权。
