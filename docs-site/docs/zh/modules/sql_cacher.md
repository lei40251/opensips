---
title: "sql_cacher 模块"
description: "sql_cacher 模块可以把基于 SQL 的数据库中的数据（借助实现了 DB API 的各种 OpenSIPS 模块）缓存到 OpenSIPS 内部通过 CacheDB 接口实现的缓存系统中。"
---

## 管理员指南 {#admin-guide}


### 概述 {#overview}


sql_cacher 模块把基于 SQL 的数据库中的数据（借助实现了 DB API 的各种 OpenSIPS 模块）
缓存到 OpenSIPS 内部通过 CacheDB 接口实现的缓存系统中，
提供了这样一种可能性。
具体做法是在 OpenSIPS 配置脚本中指定数据库 URL、要使用的 SQL 表、
需要缓存的列以及其他细节。


缓存的数据在脚本中可以通过只读伪变量
"$sql_cached_value" 以类似键值系统的方式访问。SQL 表中某个指定的
列充当"键"的角色，因此该列的值与所需列的名称一起作为
"参数"传给伪变量，从而返回该列相应的值。


可用的缓存类型有两种：


- *全量缓存* - 在 OpenSIPS 启动时把整张 SQL 表（所有行）加载
到缓存中；
- *按需缓存* - 在运行时当请求到相应键时才加载 SQL 表的
行。


对于按需缓存，所存储的值具有可配置的过期时间，
过期后它们会被永久删除，除非针对特定键调用了 MI 重载函数。对于全量缓存，
数据会按可配置的间隔自动重新加载。因此，如果 SQL 数据库中的数据发生变化
并调用了 MI 重载函数，旧数据只会在缓存中保留
到其过期为止。


### 依赖 {#dependencies}


使用该模块前必须先加载以下模块：


- *提供实际数据库后端连接功能的 OpenSIPS 模块*


### 导出的参数 {#exported-parameters}


#### cache_table (string)


该参数可以多次设置，以便缓存多张 SQL 表，
甚至以不同配置缓存同一张表。模块
通过一个 "id" 字符串区分这些不同的条目。


缓存条目通过该参数指定，该参数拥有自己的
子参数。这些子参数由 [spec_delimiter](#spec_delimiter-string)
配置的分隔符分隔，格式如下：
*param_name=param_value*
这些参数是：


- *id* ：缓存条目 id
- *db_url* ：SQL 数据库的 URL
- *cachedb_url* ：CacheDB 数据库的 URL
- *table* ：SQL 数据库表名
- *key* ：SQL 数据库中"键"列的列名
- *key_type* ：SQL"键"列的数据类型：
	- string
	- int

	*如果未指定，默认值为 "string"。*
- *columns* ：需要从 SQL 数据库缓存的列名，
以 [columns_delimiter](#columns_delimiter-string) 配置的分隔符分隔。
如果未指定，则缓存表中的所有列
- *on_demand* ：指定缓存类型：
	- 0 ：全量缓存
	- 1 ：按需缓存

	*如果未指定，默认值为 "0"。*
- *expire* ：按需缓存类型下缓存中所存值的过期时间，
以秒为单位
如果未指定，默认值为 "1 hour"


参数必须严格按上述顺序给出。


总体而言，该参数没有默认值，至少要设置一次
才能缓存任何表。


```opensips title="cache_table 参数用法"
modparam("sql_cacher", "cache_table",
"id=caching_name
db_url=mysql://root:opensips@localhost/opensips_2_2
cachedb_url=mongodb:mycluster://127.0.0.1:27017/db.col
table=table_name
key=column_name_0
columns=column_name_1 column_name_2 column_name_3
on_demand=0")
```


#### spec_delimiter (string) {#spec_delimiter-string}


在 *cache_table* 参数中给出的缓存条目规格里，
用于分隔各子参数的分隔符。它
必须是单个字符。


默认值为换行符。


```opensips title="spec_delimiter 参数用法"
modparam("sql_cacher", "spec_delimiter", "\n")
```


#### pvar_delimiter (string) {#pvar_delimiter-string}


"$sql_cached_value"
伪变量中用于分隔缓存 id、所需列名
和键值的分隔符。它必须是单个字符。


默认值为 ":"。


```opensips title="pvar_delimiter 参数用法"
modparam("sql_cacher", "pvar_delimiter", " ")
```


#### columns_delimiter (string) {#columns_delimiter-string}


在 *cache_table* 参数中给出的缓存条目规格的 *columns*
子参数里，用于分隔所需列名的分隔符。它必须是单个字符。


默认值为 " "（空格）。


```opensips title="columns_delimiter 参数用法"
modparam("sql_cacher", "columns_delimiter", ",")
```


#### sql_fetch_nr_rows (integer)


SQL 数据库驱动每次取到 OpenSIPS 私有内存中的
行数。查询大表时，请相应调整该参数，
以避免耗尽 OpenSIPS 私有内存。


默认值为 "100"。


```opensips title="sql_fetch_nr_rows 参数用法"
modparam("sql_cacher", "sql_fetch_nr_rows", 1000)
```


#### full_caching_expire (integer)


全量缓存类型下缓存中所存值的过期时间，
以秒为单位。这是已删除或已修改数据在缓存中残留的
最长时间。


默认值为 "24 hours"。


```opensips title="full_caching_expire 参数用法"
modparam("sql_cacher", "full_caching_expire", 3600)
```


#### reload_interval (integer)


该参数表示在数据过期（针对全量缓存）之前多少秒
触发自动重载。


默认值为 "60 s"。


```opensips title="reload_interval 参数用法"
modparam("sql_cacher", "reload_interval", 5)
```


#### bigint_to_str (integer)


控制 bigint 的转换。
默认情况下 bigint 值按 int 返回。
如果 bigint 中存储的值超出 int 范围，
通过启用 bigint 到字符串的转换，
该 bigint 值将以字符串返回。


默认值为 "0"（禁用）。


```opensips title="bigint_to_str 参数用法"
modparam("sql_cacher", "bigint_to_str", 1)
```


### 导出的函数 {#exported-functions}


#### sql_cache_dump(caching_id, columns, result_avps)


导出指定 *caching_id* 中缓存的所有 *columns*，
并把它们写入各自对应的 *result_avps*。


参数：


- *caching_id* (string) - SQL 缓存的标识符
- *columns* (string) - 需要导出的 SQL 列，
以逗号分隔的值给出
- *result_avps* (string) - 逗号分隔的 AVP 列表，结果将
写入其中


返回码：


- **-1** - 内部错误
- **-2** - 返回零条结果
- **1, 2, 3, ...** - 返回到每个输出 AVP 中的结果数量


该函数可在任意路由中使用。


```opensips title="sql_cache_dump 用法"
...
# 示例：取出所有已缓存的 CNAM 记录
$var(n) = sql_cache_dump("cnam", "caller,callee,calling_name,fraud_score",
                "$avp(caller),$avp(callee),$avp(cnam),$avp(fraud)");
$var(i) = 0;
while ($var(i) < $var(n)) {
	xlog("Caller $(avp(caller)[$var(i)]) has CNAM $(avp(cnam)[$var(i)])\n");
	$var(i) += 1;
}
...
```


### 导出的 MI 函数 {#exported-mi-functions}


#### sql_cacher_reload


在*全量缓存*模式下重载缓存中的整张 SQL 表，
或重载单个键（如果提供了键）。


在*按需缓存*模式下重载指定的键，或使缓存中的所有键失效。


参数：


- *id* - 缓存条目的 id
- *key*（可选）- 需要重载的特定键。


```bash title="sql_cacher_reload 用法"
...
$ opensips-cli -x mi sql_cacher_reload subs_caching
...
$ opensips-cli -x mi sql_cacher_reload subs_caching alice@domain.com
...
```


### 导出的伪变量 {#exported-pseudo-variables}


#### $sql_cached_value(id{sep}col{sep}key)


缓存的数据可通过该只读 PV 访问。格式
如下：


- *sep* ：由
[pvar_delimiter](#pvar_delimiter-string) 配置的分隔符
- *id*  ：缓存条目 id
- *col* ：所需列的名称
- *key* ："键"列的值


```opensips title="sql_cached_value(id{sep}col{sep}key) 伪变量用法"
...
$avp(a) = $sql_cached_value(caching_name:column_name_1:key1);
...
				 
```


### 用法示例 {#usage-example}


本节给出一个缓存 SQL 表的用法示例。


假设需要缓存 OpenSIPS 数据库 "carrierfailureroute" 表中的
以下列："host_name"、
"reply_code"、"flags" 和 "next_domain"。


```c title="示例数据库内容 - carrierfailureroute 表"
...
+----+---------+-----------+------------+--------+-----+-------------+
| id | domain  | host_name | reply_code | flags | mask | next_domain |
+----+---------+-----------+------------+-------+------+-------------+
|  1 |      99 |           | 408        |    16 |   16 |             |
|  2 |      99 | gw1       | 404        |     0 |    0 | 100         |
|  3 |      99 | gw2       | 50.        |     0 |    0 | 100         |
|  4 |      99 |           | 404        |  2048 | 2112 | asterisk-1  |
+----+---------+-----------+------------+-------+------+-------------+
...
		
```


首先，必须在 OpenSIPS 配置脚本中设置模块参数 "cache_table"
来提供缓存的细节。


```opensips title="设置 cache_table 参数"
modparam("sql_cacher", "cache_table",
"id=carrier_fr_caching
db_url=mysql://root:opensips@localhost/opensips
cachedb_url=mongodb:mycluster://127.0.0.1:27017/my_db.col
table=carrierfailureroute
key=id
columns=host_name reply_code flags next_domain")
		
```


接下来，可通过 "$sql_cached_value" PV 访问缓存列的值。


```opensips title="访问缓存值"
...
$avp(rc1) = $sql_cached_value(carrier_fr_caching:reply_code:1);
$avp(rc2) = $sql_cached_value(carrier_fr_caching:reply_code:2);
...
var(some_id)=4;
$avp(nd) = $sql_cached_value(carrier_fr_caching:next_domain:$var(some_id));
...
xlog("host name is: $sql_cached_value(carrier_fr_caching:host_name:2)");
...
		
```


### 导出的状态/报告标识符 {#exported-statusreport-identifiers}


该模块提供 "sql_cacher" 状态/报告组，其中每个
全量缓存都定义为一个独立的 SR 标识符。注意，
按需缓存不会创建任何标识符。


#### [cache_entry_id]


这些标识符的状态反映了缓存数据的
就绪/状态情况（在从 DB 加载时是否可用）：


- *-2* - 完全没有数据（初始状态）
- *-1* - 无数据，正在初始加载
- *1* - 数据已加载，分区就绪
- *2* - 数据可用，正在重载


就报告/日志而言，将报告以下事件：


- 开始加载 DB 数据
- DB 数据加载失败，正在丢弃
- DB 数据加载成功完成
- 已加载 N 条记录


关于如何访问和使用状态/报告信息，请参见
[Status/Report 接口](/zh/manual/Interface-StatusReport)。
<!-- CONTRIBUTORS -->

### 许可证 {#license}

所有文档文件（即 .md 扩展名）均按 Creative Common License 4.0 许可
