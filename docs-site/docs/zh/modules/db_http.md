---
title: "DB_HTTP 模块"
description: "本模块提供对一个以 HTTP 服务器形式实现的数据库的访问，可用于穿越防火墙存在困难或需要数据加密的特殊场景。"
sidebar: false
---


## 管理员指南 {#admin-guide}


### 概述 {#overview}


本模块提供对一个以 HTTP 服务器形式实现的数据库的
访问。在穿越防火墙存在问题、或需要数据加密的
特殊场景中可以使用。


要使用本模块，必须拥有一台能够通过 HTTP 或 HTTPS
与本模块通信、且严格遵循「服务器规范」小节所述
格式的服务器。


只要服务器支持，本模块即可提供 SSL、鉴权以及
OpenSIPS 数据库的全部功能（但 result_fetch 除外）。


db_http 的 url 与其他 db 模块
的 url 略有差异。该 url 不必包含
数据库名称。地址之后的部分
都被视为指向数据库资源的路径，该部分
可以省略。


即使使用 HTTPS，url 也必须以 "http://" 开头，
并且模块的 SSL 参数必须设为 1。


```opensips title="Setting db_url for a module"
...
modparam("presence", "db_url","http://user:pass@localhost:13100")
or
modparam("presence", "db_url","http://user:pass@www.some.com/some/some")
...
```


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


本模块不依赖其他模块。


#### 外部库或应用 {#external-libraries-or-applications}


- *libcurl*。


### 导出的参数 {#exported-parameters}


#### SSL(int)


是否使用 SSL。


若值为 1，模块使用 https；否则
使用 http。


*默认值为 " 0 "。*


```opensips title="Set SSL parameter"
...
modparam("db_http", "SSL",1)
...
```


#### cap_raw_query(int)


服务器是否支持原始查询。


*默认值为 "0"。*


```opensips title="Set cap_raw_query parameter"
...
modparam("db_http", "cap_raw_query", 1)
...
```


#### cap_replace(int)


服务器是否支持 replace 能力。


*默认值为 "0"。*


```opensips title="Set cap_replace parameter"
...
modparam("db_http", "cap_replace", 1)
...
```


#### cap_insert_update(int)


服务器是否支持 insert_update 能力。


*默认值为 "0"。*


```opensips title="Set cap_insert_update parameter"
...
modparam("db_http", "cap_insert_update", 1)
...
```


#### cap_last_inserted_id(int)


服务器是否支持 last_inserted_id 能力。


*默认值为 "0"。*


```opensips title="Set cap_last_inserted_id parameter"
...
modparam("db_http", "cap_last_inserted_id", 1)
...
```


#### field_delimiter (str)


应答中用于分隔字段的字符。只能
设置一个字符。


*默认值为 ";"*


```opensips title="Set field_delimiter parameter"
...
modparam("db_http", "field_delimiter",";")
...
```


#### row_delimiter (str)


应答中用于分隔行的字符。只能
设置一个字符。


*默认值为 "\n"*


```opensips title="Set row_delimiter parameter"
...
modparam("db_http", "row_delimiter","\n")
...
```


#### quote_delimiter (str)


应答中用于对需要加引号的字段加引号的
字符。只能设置一个字符。


*默认值为 "|"*


```opensips title="Set quote_delimiter parameter"
...
modparam("db_http", "quote_delimiter","|")
...
```


#### value_delimiter (str)


用于分隔单个变量的多个字段
的分隔符（参见 [http variables](#variables)）。
只能设置一个字符。


*默认值为 ","*


```opensips title="Set value_delimiter parameter"
...
modparam("db_http", "value_delimiter",";")
...
```


#### timeout (int)


HTTP 操作允许持续的最长毫秒数


*默认值为 "30000（30 秒）"*


```opensips title="Set timeout parameter"
...
modparam("db_http", "timeout",5000)
...
```


#### disable_expect (int)


对超过 1024 字节的请求，禁用 libcurl 中自动的 'Expect: 100-continue' 行为。
这可以通过为较大记录省去一次网络往返来降低延迟。
有关该行为的更多信息，请参见 rfc2616 第 8.2.3 节。


*默认值为 "0（关闭）"*


```opensips title="Set disable_expect parameter"
...
modparam("db_http", "disable_expect",1)
...
```


### 导出的函数 {#exported-functions}


### 服务器规范 {#server-specifications}


#### 查询 {#queries}


服务器必须以 HTTP 查询形式接受查询请求。


查询有两种类型：GET 与 POST。两者
都会设置一些必须由服务器解释的变量。
所有值均经过 URL 编码。


查询有多种类型，服务器可通过 query_type 变量
加以区分。每种查询类型都使用特定的变量，
与 opensips db_api 中的变量类似。


```c title="Example query."
...
GET /presentity/?c=username,domain,event,expires HTTP/1.1
...
```


#### 变量 {#variables}


所有变量的说明。每个变量可以是
单个值，也可以是逗号分隔的值列表。每个
变量都有特定含义，只能用于
特定查询。


将要操作的表会编码在 url 末尾
（www.some.com/users 指向 users 表）。


- k=
描述用于比较的键（列）。
可以有多个值。
- op=
描述用于比较的运算符。
可以有多个值。
- v=
描述各列所比较的目标值。
可以有多个值。
- c=
描述从结果中选取的列。
可以有多个值。
- o=
结果排序所依据的列。
只有单个值。
- uk=
将被更新的键（列）。
可以有多个值。
- uv=
将写入各列的新值。
可以有多个值。
- q=
描述原始查询。仅在服务器支持
原始查询时使用。只有单个值。
- query_type=
描述当前查询的类型。
取值如「查询类型」小节所述，
且只有单个值。
除 "SELECT"（普通查询）外，
所有查询都会携带该变量。


```c title="Example query with variables."
...
GET /presentity/?c=username,domain,event,expires HTTP/1.1
GET /version/?k=table_name&v=xcap&c=table_version HTTP/1.1 
...
...
POST /active_watchers HTTP/1.1

k=id&v=100&query_type=insert
...
```


#### 查询类型 {#query-types}


查询类型由 query_type 变量描述。
该变量的值会被设为查询的确切名称。


"SELECT" 查询使用 GET，其余
（insert、update、delete、replace、insert_update）使用 POST。


- normal query
使用 k、op、v、c 与 o 变量。
不会设置 query_type 变量，
并使用 GET。
- delete
使用 k、op 与 v 变量。
- insert
使用 k 与 v 变量。
- update
使用 k、op、v、uk 与 uv 变量。
- replace
使用 k 与 v 变量。这是可选的
查询类型。若模块未配置使用它，
则不会使用。
- insert_update
使用 k 与 v 变量。这是可选的
查询类型。若模块未配置使用它，
则不会使用。
- custom
使用 q 变量。这是可选的
查询类型。若模块未配置使用它，
则不会使用。


```c title="More query examples."
...
POST /active_watchers HTTP/1.1

k=id&op=%3D&v=100&query_type=delete
...

...
POST /active_watchers HTTP/1.1

k=id&op=%3D&v=100&uk=id&uv=101&query_type=update
...
```


#### 查询中的 NULL 值 {#null-values-in-queries}


查询中的 NULL 值表示为长度为 1 的字符串，
其中仅含一个值为 '\0' 的字符。


```c title="NULL query example."
...
POST /active_watchers HTTP/1.1

k=id&op=%3D&v=%00&query_type=delete
...
```


#### 服务器应答 {#server-replies}


若查询成功（即使应答为空），
服务器必须返回 200 OK 的 HTTP 应答，
其消息体包含各列的类型与值。


服务器必须以分隔符分隔的值与列
列表进行应答。


列表中的每个元素都必须与其前一个元素
以字段分隔符分隔，该分隔符必须与
脚本中为该模块设置的参数一致。
每行的最后一个元素之后不得是
字段分隔符，而是行分隔符。


应答的第一行必须包含各列值类型
的列表。类型可以是以下列表中的
任意一种：integer、string、str、blob、date。


其后的每一行包含结果中每一行的值。


若查询产生错误，服务器必须返回
HTTP 500 应答，或相应的错误码（404、401）。


```
...
int;string;blob
6;something=something;1000
100;mine;10002030
...
```


#### 应答引号处理 {#reply-quoting}


由于值内部可能含有分隔符，
服务器必须在必要时执行引号处理（即使
并非必要也执行也没有问题）。


必须定义引号分隔符，且必须与
脚本中设置的一致（默认为 "|"）。


若值中包含字段分隔符、行分隔符
或引号分隔符，则必须置于引号之内。值内部的
引号分隔符前必须再加一个引号分隔符。


```
...
int;string;blob
6;|ana;maria|;1000
100;mine;10002030
3;mine;|some||more;|
...
```


#### 最后插入的 id {#last-inserted-id}


这是一项可选特性，若需要使用
可将其启用。


要使用该特性，服务器必须在每个
insert 查询的 200 应答中放入最后一次
插入的 id。


#### 鉴权与 SSL {#authentication-and-ssl}


若服务器支持鉴权与 SSL，可将模块
配置为使用 SSL。需要时始终会
使用鉴权。


模块会尝试使用服务器所提供的、
来自以下类型中最安全的鉴权类型：
Basic、Digest、GSSNEGOTIATE 与 NTLM。
<!-- CONTRIBUTORS -->

### 许可 {#license}

所有文档文件（即 .md 扩展名）均按 Creative Common License 4.0 授权。
