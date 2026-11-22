---
title: "sqlops 模块"
description: "sqlops（SQL 操作）模块实现了一组脚本函数，用于执行通用的 SQL 标准查询（原始查询或结构化查询）。"
sidebar: false
---


## 管理指南 {#admin-guide}


### 概述 {#overview}


sqlops（SQL 操作）模块实现了一组脚本函数，用于执行通用的 SQL 标准查询（原始查询或结构化查询）。它还提供了一组专用函数，用于对用户 AVP（偏好设置）执行 DB 操作（加载/存储/删除）。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


在加载本模块之前，必须先加载以下模块：


- *一个数据库模块*


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，必须安装以下库或应用程序：


- *无*


### 导出的参数 {#exported-parameters}


#### db_url (string) {#db_url-string}


用于数据库连接的 DB URL。由于本模块允许使用多个 DB（DB URL），实际的 DB URL 前可加一个引用编号。该引用编号需要传给希望显式使用此 DB 连接的 AVPOPS 函数。如果未给出引用编号，则假定为 0 —— 即默认的 DB URL。


*本参数为可选参数，默认值为 NULL。*


```opensips title="设置 db_url 参数"
...
# 默认 URL
modparam("sqlops","db_url","mysql://user:passwd@host/database")
# 附加的 DB URL
modparam("sqlops","db_url","1 postgres://user:passwd@host2/opensips")
...

```


#### usr_table (string)


用于存放用户偏好设置（AVP）的 DB 表


*本参数为可选参数，默认值为
"usr_preferences"。*


```opensips title="设置 usr_table 参数"
...
modparam("sqlops","usr_table","avptable")
...

```


#### db_scheme (string)


定义用于访问非标准「用户偏好设置」类表的 DB scheme。


DB scheme 的定义。scheme 语法为：


- *db_scheme = name':'element[';'element]**
- *element* =
	- 'uuid_col='string
	- 'username_col='string
	- 'domain_col='string
	- 'value_col='string
	- 'value_type='('integer'|'string')
	- 'table='string


*默认值为 "NULL"。*


```opensips title="设置 db_scheme 参数"
...
modparam("sqlops","db_scheme",
"scheme1:table=subscriber;uuid_col=uuid;value_col=first_name")
...
```


#### use_domain (integer)


在 DB 操作中是否应使用 SIP URI 的域部分来标识 AVP。


*默认值为 0（否）。*


```opensips title="设置 use_domain 参数"
...
modparam("sqlops","use_domain",1)
...
```


#### ps_id_max_buf_len (integer)


在调用 "sql_select|update|insert|replace|delete()" 系列函数时，用于构建查询 ID（这些 ID 用于管理 Prepare Statements）的缓冲区最大长度


如果超出该长度（在尝试构建 PS 查询 ID 时），该查询将不再支持 PS。若设置为 0，则完全禁用 PS 支持。


*默认值为 1024。*


```opensips title="设置 ps_id_max_buf_len 参数"
...
modparam("sqlops","ps_id_max_buf_len", 2048)
...
```


#### bigint_to_str (int)


控制 bigint 转换。默认情况下，bigint 值以 int 返回。如果存储在 bigint 中的值超出 int 范围，启用 bigint 到字符串的转换后，该 bigint 值将以字符串返回。


*默认值为 "0"。*


```opensips title="设置 bigint_to_str 参数"
...
# 将 bigint 作为字符串返回
modparam("sqlops","bigint_to_str",1)
...
```


#### uuid_column (string)


包含 uuid（唯一用户 ID）的列名。


*默认值为 "uuid"。*


```opensips title="设置 uuid_column 参数"
...
modparam("sqlops","uuid_column","uuid")
...
```


#### username_column (string)


包含用户名的列名。


*默认值为 "username"。*


```opensips title="设置 username_column 参数"
...
modparam("sqlops","username_column","username")
...
```


#### domain_column (string)


包含域名的列名。


*默认值为 "domain"。*


```opensips title="设置 domain_column 参数"
...
modparam("sqlops","domain_column","domain")
...
```


#### attribute_column (string)


包含属性名（AVP 名称）的列名。


*默认值为 "attribute"。*


```opensips title="设置 attribute_column 参数"
...
modparam("sqlops","attribute_column","attribute")
...
```


#### value_column (string)


包含 AVP 值的列名。


*默认值为 "value"。*


```opensips title="设置 value_column 参数"
...
modparam("sqlops","value_column","value")
...
```


#### type_column (string)


包含 AVP 类型的列名。


*默认值为 "type"。*


```opensips title="设置 type_column 参数"
...
modparam("sqlops","type_column","type")
...
```


### 导出的函数 {#exported-functions}


#### sql_query(query, [res_col_avps], [db_id]) {#sql_queryquery-res_col_avps-db_id}


执行一次数据库查询，并将结果存入 AVP。


参数的含义与用法：


- *query (string)* - 必须是合法的 SQL
查询。该参数可以包含伪变量。
必须手动对所有伪变量进行转义，以防止
SQL 注入攻击。可以使用现有的变换
*escape.common* 和
*unescape.common*
对任意伪变量的内容进行转义与反转义。
未对查询中使用的变量进行转义会使你
容易遭受 SQL 注入攻击，例如使
外部攻击者得以修改你的数据库内容。
如果查询成功，函数返回 true；如果查询返回
空结果集则返回 -2；其余各类
错误返回 -1。
- *res_col_avps (string, optional, no expand)* - 存放结果的 AVP 名称列表。
格式为
"$avp(name1);$avp(name2);..."。如果省略该参数，
结果将存入
"$avp(1);$avp(2);..."。如果结果包含
多行，则会添加多个对应名称的 AVP。
AVP 的值类型（字符串或整型）
由列的类型推导得出。如果数据库中的值为
*NULL*，返回的 avp 将是值为 *&lt;null&gt;* 的字符串。
- *db_id (int, optional)* - 对已定义的
DB URL 的引用（一个数字 ID）——参见 "db_url"
模块参数。它可以是常量，也可以是
字符串/整型变量。


本函数可在 REQUEST_ROUTE、FAILURE_ROUTE、
BRANCH_ROUTE、LOCAL_ROUTE 和 ONREPLY_ROUTE 中使用。


```opensips title="sql_query 用法"
...
sql_query("SELECT password, ha1 FROM subscriber WHERE username='$tu'",
	"$avp(pass);$avp(hash)");
sql_query("DELETE FROM subscriber");
sql_query("DELETE FROM subscriber", , 2);

$avp(id) = 2;
sql_query("DELETE FROM subscriber", , $avp(id));
...
```


#### sql_query_one(query, [res_col_vars], [db_id]) {#sql_query_onequery-res_col_vars-db_id}


与 [sql_query()](#sql_queryquery-res_col_avps-db_id) 类似，执行一次通用的原始
数据库查询并返回结果，但有如下
差异：


- *只返回一行* - 即使
查询结果为多行，也只把第一行
返回给脚本。
- *返回变量不限于 AVP* -
用于返回查询结果的变量可以是任意
类型的变量，当然，前提是可写。注意
返回变量的数量必须与返回的列数
一致。如果提供的变量少于列数，查询
将失败。
- *返回 NULL* - 查询产生的任何 DB NULL
值都将以 NULL 标识（而**不是** *&lt;null&gt;* 字符串）的
形式推送给
脚本变量。


本函数可在任意类型的路由中使用。


```opensips title="sql_query_one 用法"
...
sql_query_one("SELECT password, ha1 FROM subscriber WHERE username='$tU'",
	"$var(pass);$var(hash)");
# 如果对应列未被填充，$var(pass) 或 $var(hash) 可能为 NULL
...
sql_query_one("SELECT value, type FROM usr_preferences WHERE username='$fU' and attribute='cfna'",
	"$var(cf_uri);$var(type)");
# 即使用户有多个 `cfna` 属性，上述查询也只返回一行
...
```


#### sql_select([columns],table,[filter],[order],[res_col_avps], [db_id]) {#sql_selectcolumnstablefilterorderres_col_avps-db_id}


执行结构化（非原始）SQL SELECT 操作的函数。
该查询通过 OpenSIPS 内部 SQL 接口执行，从而
利用预编译语句支持（如果 db 后端
提供此类支持）。所选列会返回
到一组 AVP 中（与所选列一一对应）。


> [!WARNING]
> 如果在构造查询时使用变量，必须
> 手动对其值进行转义，以防止 SQL 注入
> 攻击。可以使用现有的变换
> *escape.common* 和
> *unescape.common*
> 对任意伪变量的内容进行转义与反转义。
> 未对查询中使用的变量进行转义会使你
> 容易遭受 SQL 注入攻击，例如使
> 外部攻击者得以修改你的数据库内容。


如果查询成功，函数返回 true；如果查询返回
空结果集则返回 -2；其余各类
错误返回 -1。


参数的含义与用法：


- *columns (string,optional)* - JSON
格式的字符串，存放 select 要返回的列数组。
例如："["col1","col2"]"。
如果省略，将执行 "*"（所有列）的
查询。
- *table (string, mandatory)* - 要
查询的表名。
- *filter (string, optional)* - JSON
格式的字符串，存放查询的 "where" 过滤条件。它
必须是 (column, operator,value) 对的数组。此类对的
确切 JSON 语法为
"{"column":{"operator":"value"}}"。；运算符
可以是 `>`、`<`、`=`、`!=` 或自定义字符串；值
可以是字符串、整型或 `null`。为简化 `=` 运算符的
用法，可以使用 "{"column":"value"}"
如果省略，将选择所有行。
- *order (string, optional)* - 用于
排序的列名（仅升序）。
- *res_col_avps (string, optional, no expand)* - 存放结果的 AVP 名称列表。
格式为
"$avp(name1);$avp(name2);..."。如果省略该参数，
结果将存入
"$avp(1);$avp(2);..."。如果结果包含
多行，则会添加多个对应名称的 AVP。
AVP 的值类型（字符串或整型）
由列的类型推导得出。如果数据库中的值为
*NULL*，返回的 avp 将是值为 *&lt;null&gt;* 的字符串。
- *db_id (int, optional)* - 对已定义的
DB URL 的引用（一个数字 ID）——参见
[db_url](#db_url-string) 模块参数。它
可以是常量，也可以是字符串/整型变量。


本函数可在任意类型的路由中使用。


```opensips title="sql_select 用法"
...
sql_select('["password","ha1"]', 'subscriber',
	'[ {"username": "$tu"}, {"domain": {"!=", null}}]', ,
	'$avp(pass);$avp(hash)');
...

```


#### sql_select_one([columns],table,[filter],[order],[res_col_vars], [db_id])


与 [sql_select()](#sql_selectcolumnstablefilterorderres_col_avps-db_id) 类似，执行一次 SELECT SQL
查询并返回结果，但有如下
差异：


- *只返回一行* - 即使
查询结果为多行，也只把第一行
返回给脚本。
- *返回变量不限于 AVP* -
用于返回查询结果的变量可以是任意
类型的变量，当然，前提是可写。注意
返回变量的数量必须与返回的列数
一致。如果提供的变量少于列数，查询
将失败。
- *返回 NULL* - 查询产生的任何 DB NULL
值都将以 NULL 标识（而**不是** *&lt;null&gt;* 字符串）的
形式推送给
脚本变量。


本函数可在任意类型的路由中使用。


```opensips title="sql_select_one 用法"
...
sql_select_one('["value","type"]', 'usr_preferences',
	'[ {"username": "$tu"}, {"attribute": "cfna"}]', ,
	'$var(cf_uri);$var(type)');
# 即使用户有多个 `cfna` 属性，上述查询也只返回一行
...

```


#### sql_update(columns,table,[filter],[db_id])


执行结构化（非原始）SQL UPDATE 操作的函数。
重要：请参阅
[sql_select()](#sql_selectcolumnstablefilterorderres_col_avps-db_id) 函数的全部通用说明。


如果查询成功，函数返回 true。


参数的含义与用法：


- *columns (string,mandatory)* - JSON
格式的字符串，存放查询要更新的 (column,value) 对
数组。
例如："[{"col1":"val1"},{"col2":"val1"}]"。
- *table (string, mandatory)* - 要
查询的表名。
- *filter (string, optional)* - JSON
格式的字符串，存放查询的 "where" 过滤条件。它
必须是 (column, operator,value) 对的数组。此类对的
确切 JSON 语法为
"{"column":{"operator":"value"}}"。；运算符
可以是 `>`、`<`、`=`、`!=` 或自定义字符串；值
可以是字符串、整型或 `null`。为简化 `=` 运算符的
用法，可以使用 "{"column":"value"}"
如果省略，将更新所有行。
- *db_id (int, optional)* - 对已定义的
DB URL 的引用（一个数字 ID）——参见
[db_url](#db_url-string) 模块参数。它
可以是常量，也可以是字符串/整型变量。


本函数可在任意类型的路由中使用。


```opensips title="sql_update 用法"
...
sql_update( '[{"password":"my_secret"}]', 'subscriber',
	'[{"username": "$tu"}]');
...

```


#### sql_insert(table,columns,[db_id]) {#sql_inserttablecolumnsdb_id}


执行结构化（非原始）SQL INSERT 操作的函数。
重要：请参阅
[sql_select()](#sql_selectcolumnstablefilterorderres_col_avps-db_id) 函数的全部通用说明。


如果查询成功，函数返回 true。


参数的含义与用法：


- *table (string, mandatory)* - 要
查询的表名。
- *columns (string,mandatory)* - JSON
格式的字符串，存放要插入的 (column,value) 对
数组。
例如："[{"col1":"val1"},{"col2":"val1"}]"。
- *db_id (int, optional)* - 对已定义的
DB URL 的引用（一个数字 ID）——参见
[db_url](#db_url-string) 模块参数。它
可以是常量，也可以是字符串/整型变量。


本函数可在任意类型的路由中使用。


```opensips title="sql_insert 用法"
...
sql_insert( 'cc_agents', '[{"agentid":"agentX"},{"skills":"info"},{"location":null},{"msrp_location":"sip:agentX@opensips.com"},{"msrp_max_sessions":2}]' );
...

```


#### sql_delete(table,[filter],[db_id])


执行结构化（非原始）SQL DELETE 操作的函数。
重要：请参阅
[sql_select()](#sql_selectcolumnstablefilterorderres_col_avps-db_id) 函数的全部通用说明。


如果查询成功，函数返回 true。


参数的含义与用法：


- *table (string, mandatory)* - 要
删除数据的表名。
- *filter (string, optional)* - JSON
格式的字符串，存放查询的 "where" 过滤条件。它
必须是 (column, operator,value) 对的数组。此类对的
确切 JSON 语法为
"{"column":{"operator":"value"}}"。；运算符
可以是 `>`、`<`、`=`、`!=` 或自定义字符串；值
可以是字符串、整型或 `null`。为简化 `=` 运算符的
用法，可以使用 "{"column":"value"}"
如果省略，将更新所有行。
- *db_id (int, optional)* - 对已定义的
DB URL 的引用（一个数字 ID）——参见
[db_url](#db_url-string) 模块参数。它
可以是常量，也可以是字符串/整型变量。


本函数可在任意类型的路由中使用。


```opensips title="sql_delete 用法"
...
sql_delete( 'subscriber', '[{"username": "$tu"}]');
...

```


#### sql_replace(table,columns,[db_id])


与 [sql_insert()](#sql_inserttablecolumnsdb_id) 函数非常相似，
区别在于执行的是 SQL REPLACE 操作。注意并非所有
OpenSIPS 中的 SQL 后端都支持 REPLACE 操作。


如果查询成功，函数返回 true。


#### sql_avp_load(source, name, [db_id], [prefix]])


从 DB 中将与给定
*source* 对应的 AVP 加载到内存。如果给出，
它会为已加载的 AVP 设置脚本标志位。如果它
向 AVP 加载了某些值则返回 true，否则返回 false（db 错误、未加载任何 avp 等）。


AVP 名称前可以有一个可选的 *prefix*，
以避免某些冲突。


参数含义如下：


- *source (string, no expand)* - 用于
标识 AVP 的信息。参数语法：
	- *source = (pvar|str_value)
	['/'('username'|'domain'|'uri'|'uuid')])*
	- *pvar = OpenSIPS 中定义的任意伪变量。如果
	pvar 为 $ru（请求 uri）、$fu（From uri）、$tu（To uri）
	或 $ou（原始 uri），则隐式标志为 'uri'。
	否则，隐式标志为 'uuid'。*
- *name (string, no expand)* - 哪些 AVP 将从
DB 加载到内存。参数语法为：
	- *name = avp_spec['/'(table_name|'$'db_scheme)]*
- *db_id (int, optional)* - 对已定义的
DB URL 的引用（一个数字 ID）——参见 "db_url"
模块参数。
- *prefix (string, optional)* - 静态字符串，它将
置于本函数填充的 AVP 名称之前。


本函数可在 REQUEST_ROUTE、FAILURE_ROUTE、
BRANCH_ROUTE、LOCAL_ROUTE 和 ONREPLY_ROUTE 中使用。


```opensips title="sql_avp_load 用法"
...
sql_avp_load("$fu", "$avp(678)");
sql_avp_load("$ru/domain", "i/domain_preferences");
sql_avp_load("$avp(uuid)", "$avp(404fwd)/fwd_table");
sql_avp_load("$ru", "$avp(123)/$some_scheme");

# 使用 DB URL id 3
sql_avp_load("$ru", "$avp(1)", 3);

# 为所有已加载的 AVP 加上 "caller_" 前缀
sql_avp_load("$ru", "$avp(100)", , "caller_");
xlog("Loaded: $avp(caller_100)\n");
...	
```


#### sql_avp_store(source, name, [db_id])


将与给定
*source* 对应的 AVP 存储到 DB。


参数的含义与用法与
*sql_avp_load(source, name)*
函数完全相同。请参阅其说明。


本函数可在 REQUEST_ROUTE、FAILURE_ROUTE、
BRANCH_ROUTE、LOCAL_ROUTE 和 ONREPLY_ROUTE 中使用。


```opensips title="sql_avp_store 用法"
...
sql_avp_store("$tu", "$avp(678)");
sql_avp_store("$ru/username", "$avp(email)");
# 使用 DB URL id 3
sql_avp_store("$ru", "$avp(1)", 3);
...	
```


#### sql_avp_delete(source, name, [db_id])


从 DB 中删除与给定
*source* 对应的 AVP。


参数的含义与用法与
*sql_avp_load(source, name)*
函数完全相同。请参阅其说明。


本函数可在 REQUEST_ROUTE、FAILURE_ROUTE、
BRANCH_ROUTE、LOCAL_ROUTE 和 ONREPLY_ROUTE 中使用。


```opensips title="sql_avp_delete 用法"
...
sql_avp_delete("$tu", "$avp(678)");
sql_avp_delete("$ru/username", "$avp(email)");
sql_avp_delete("$avp(uuid)", "$avp(404fwd)/fwd_table");
# 使用 DB URL id 3
sql_avp_delete("$ru", "$avp(1)", 3);
...
```


### 导出的异步函数 {#exported-asynchronous-functions}


#### sql_query(query, [dest], [db_id])


本函数接受与 [sql_query()](#sql_queryquery-res_col_avps-db_id) 相同的参数，行为也完全相同，
但以异步方式执行
（发起查询后，当前 SIP 工作进程会暂停
对当前 SIP 消息的执行，直到结果可用，
并在此期间尝试处理更多 SIP 流量）。


本函数可在 REQUEST_ROUTE、FAILURE_ROUTE、
BRANCH_ROUTE、LOCAL_ROUTE 和 ONREPLY_ROUTE 中使用。


```opensips title="异步 sql_query 用法"
...
{
...
/* 慢速 MySQL 查询示例 - 大约需要 5 秒 */
async(
	sql_query(
		"SELECT table_name, table_version, SLEEP(0.1) from version",
		"$avp(tb_name); $avp(tb_ver); $avp(retcode)"),
	my_resume_route);
/* 脚本执行在 async() 调用后立即暂停 */
}

/* 数据就绪时会被调用 - 在此期间，工作进程是空闲的 */
route [my_resume_route]
{
	xlog("Results: \n$(avp(tb_name)[*])\n
-------------------\n$(avp(tb_ver)[*])\n
-------------------\n$(avp(retcode)[*])\n");
}
...
```


#### sql_query_one(query, [dest], [db_id])


本函数接受与 [sql_query_one()](#sql_query_onequery-res_col_vars-db_id) 相同的参数，行为也完全相同，
但以异步方式执行
（发起查询后，当前 SIP 工作进程会暂停
对当前 SIP 消息的执行，直到结果可用，
并在此期间尝试处理更多 SIP 流量）。


本函数可在任意类型的路由中使用。


```opensips title="异步 sql_query_one 用法"
...
{
...
/* 慢速 MySQL 查询示例 - 大约需要 5 秒 */
async(
	sql_query_one(
		"SELECT table_name, table_version, SLEEP(0.1) from version",
		"$var(tb_name); $var(tb_ver); $var(retcode)"),
	my_resume_route);
/* 脚本执行在 async() 调用后立即暂停 */
}

/* 数据就绪时会被调用 - 在此期间，工作进程是空闲的 */
route [my_resume_route]
{
	xlog("Result: $var(tb_name) | $var(tb_ver) | $(var(retcode)\n");
}
...
```
<!-- CONTRIBUTORS -->

### 许可证 {#license}

所有文档文件（即以 .md 为扩展名的文件）均按 Creative Common License 4.0 授权
