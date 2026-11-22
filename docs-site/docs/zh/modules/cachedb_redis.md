---
title: "cachedb_redis 模块"
description: "该模块是一个缓存系统的实现，设计用于配合 Redis 服务器工作。"
---


## 管理指南 {#admin-guide}


### 概述 {#overview}


该模块是一个缓存系统的实现，设计用于配合 Redis 服务器工作。它使用
hiredis 客户端库连接单个 Redis 服务器实例，或连接 Redis 集群内的 Redis 服务器。
它使用核心导出的键值（Key-Value）接口。


### 优势 {#advantages}


- *内存开销不再由服务器承担*
- *可以在集群内使用多台服务器，因此内存
实际上是无限的*
- *缓存是 100% 持久化的。重启
OpenSIPS 服务器不会影响数据库。Redis 数据库同样是
持久化的，因此也可以重启而不丢失信息。*
- *redis 是一个开源项目，因此
可以用它与其他各种应用程序
交换数据*
- *通过创建 Redis 集群，多个 OpenSIPS
实例可以轻松共享键值信息*


### Redis Stack 支持 {#redis-stack-support}


从 OpenSIPS **3.6** 开始，*cachedb_redis*
模块实现了面向列的 cacheDB API 函数。这使得它成为
用户位置*联邦（federation）*和*完全共享（full-sharing）*等场景中的合适
cacheDB 存储，这些场景要求该 API 可用。


该实现使用了 *RedisJSON* 和 *RediSearch* ——
这些相对较新的特性在 Redis Stack Server 中提供，而不是在通常的 Redis Server
（Redis OSS 项目）中提供。更多文档可在 Redis 网站上查阅。


OpenSIPS 会在需要时自动检测 RedisJSON 支持的可用性，并记录
相应的消息。


### 局限性 {#limitations}


- *键（在键:值对中）不得包含空格或控制字符*


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


在加载本模块之前，必须加载以下模块：


- *如果定义了 [use_tls](#use_tls-integer)，则还需要加载 **tls_mgm** 模块*。


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，必须安装以下库或应用程序：


- *hiredis：*
在最新的基于 Debian 的发行版上，可以通过运行 'apt-get install libhiredis-dev' 来安装
hiredis

另外，如果你的操作系统软件源中没有 hiredis，
可以从以下地址下载 hiredis：https://github.com/antirez/hiredis 。
下载归档文件，解压源码，运行 make、sudo make install。
如果通过 [use_tls](#use_tls-integer) modparam 启用了 TLS 连接，
*hiredis* 需要以 TLS 支持进行编译。


### 导出的参数 {#exported-parameters}


#### cachedb_url (string)


OpenSIPS 为了在脚本中使用 cache_store()、cache_fetch() 等操作而将要连接的
服务器组的 URL。该参数可以设置多次。
URL 的前缀部分将作为脚本中使用的标识符。


```opensips title="Set cachedb_url parameter"
...
# 单实例 URL（Redis Server 或 Redis Cluster）
modparam("cachedb_redis", "cachedb_url", "redis:group1://localhost:6379/")
modparam("cachedb_redis", "cachedb_url", "redis:cluster1://random_url:8888/")

# 多实例 URL（会进行循环
```


```opensips title="Use Redis servers"
...
cache_store("redis:group1", "key", "$ru value");
cache_fetch("redis:cluster1", "key", $avp(10));
cache_remove("redis:cluster1", "key");
...
	
```


#### connect_timeout (integer)


该参数指定 OpenSIPS 连接 Redis 节点应等待的毫秒数。


*默认值为 "5000 ms"。*


```opensips title="Set connect_timeout parameter"
...
# 等待 1 秒以便 Redis 建立连接
modparam("cachedb_redis", "connect_timeout",1000)
...
	
```


#### query_timeout (integer)


该参数指定 OpenSIPS 等待 Redis 节点返回查询响应的毫秒数。


*默认值为 "5000 ms"。*


```opensips title="Set connect_timeout parameter"
...
# 等待 1 秒以完成 Redis 查询
modparam("cachedb_redis", "query_timeout",1000)
...
	
```


#### shutdown_on_error (integer)


将该参数设置为 1 后，如果无法建立到 Redis 的初始连接，
OpenSIPS 将中止启动。运行时重连行为不受该参数影响，
并且始终启用。


*默认值为 "0"（禁用）。*


```opensips title="Set the shutdown_on_error parameter"
...
# 如果 Redis 不可用则中止 OpenSIPS 启动
modparam("cachedb_redis", "shutdown_on_error", 1)
...
	
```


#### use_tls (integer) {#use_tls-integer}


设置该参数后即可为 Redis 连接使用 TLS。
要为某个特定连接启用 TLS，可以在本模块（或其他使用 CacheDB
接口的模块）的 cachedb_url 中使用
"tls_domain=*dom_name*" URL 参数。该片段应放在
URL 中 '?' 字符之后的末尾。


使用该参数时，还必须确保
*tls_mgm* 已加载并正确配置。有关 TLS 客户端域的更多信息，请参阅
该模块的文档。


请注意，Redis 从 6.0 版本开始支持 TLS。此外，它是在编译时
启用的可选特性，你的操作系统提供的标准 Redis 软件包中可能并不包含。


*默认值为 **0**（未启用）*


```opensips title="Set the use_tls parameter"
...
modparam("tls_mgm", "client_domain", "redis")
modparam("tls_mgm", "certificate", "[redis]/etc/pki/tls/certs/redis.pem")
modparam("tls_mgm", "private_key", "[redis]/etc/pki/tls/private/redis.key")
modparam("tls_mgm", "ca_list",     "[redis]/etc/pki/tls/certs/ca.pem")
...
modparam("cachedb_redis", "use_tls", 1)
modparam("cachedb_redis", "cachedb_url","redis://localhost:6379/?tls_domain=redis")
...
```


#### ftsearch_index_name (string)


仅在服务端支持 *RedisJSON* 和
*RediSearch* 时才有意义。


用于所有内部 JSON 全文搜索操作的全局索引名称。
未来的扩展可能会增加例如连接级别的索引名称设置。


默认值为 **"idx:usrloc"**。


```opensips title="Set the ftsearch_index_name parameter"
modparam("cachedb_redis", "ftsearch_index_name", "ix::usrloc")
```


#### ftsearch_json_prefix (string)


仅在服务端支持 *RedisJSON* 和
*RediSearch* 时才有意义。


所有内部创建的 Redis JSON 对象（例如通过 JSON.SET 或 JSON.MSET
创建的）的键命名前缀。


默认值为 **"usrloc:"**。


```opensips title="Set the ftsearch_json_prefix parameter"
modparam("cachedb_redis", "ftsearch_json_prefix", "userlocation:")
```


#### ftsearch_max_results (integer)


仅在服务端支持 *RedisJSON* 和
*RediSearch* 时才有意义。


每次内部触发的 FT.SEARCH JSON 查询所返回的
最大结果数。


默认值为最多 **10000** 个结果。


```opensips title="Set the ftsearch_max_results parameter"
modparam("cachedb_redis", "ftsearch_max_results", 100)
```


#### ftsearch_json_mset_expire (integer)


仅在服务端支持 *RedisJSON* 和
*RediSearch* 时才有意义。


在每次 JSON.MSET 操作之后对 JSON 键设置/刷新的 Redis EXPIRE 定时器，
单位为秒。值为 **0**
会完全禁用 EXPIRE 查询。


默认值为 **3600** 秒。


```opensips title="Set the ftsearch_json_mset_expire parameter"
modparam("cachedb_redis", "ftsearch_json_mset_expire", 7200)
```


### 导出的函数 {#exported-functions}


本模块不导出可在配置脚本中
使用的函数。


### 原始查询语法 {#raw-query-syntax}


cachedb_redis 模块允许执行 RAW 查询，从而充分利用后端的各项能力。

查询语法是典型的 REDIS 语法。


以下是运行若干 Redis 查询的几个示例：


```opensips title="Redis Raw Query Examples"
...
	$var(my_hash) = "my_hash_name";
	$var(my_key) = "my_key_name";
	$var(my_value) = "my_key_value";
	cache_raw_query("redis","HSET $var(my_hash) $var(my_key) $var(my_value)");
	cache_raw_query("redis","HGET $var(my_hash) $var(my_key)","$avp(result)");
	xlog("We have fetched $avp(result) \n");
...
	$var(my_hash) = "my_hash_name";
	$var(my_key1) = "my_key1_name";
	$var(my_key2) = "my_key2_name";
	$var(my_value1) = "my_key1_value";
	$var(my_value2) = "my_key2_value";
	cache_raw_query("redis","HSET $var(my_hash) $var(my_key1) $var(my_value1)");
	cache_raw_query("redis","HSET $var(my_hash) $var(my_key2) $var(my_value2)");
	cache_raw_query("redis","HGETALL $var(my_hash)","$avp(result)");

	$var(it) = 0;
	while ($(avp(result_final)[$var(it)]) != NULL) {
		xlog("Multiple key reply: - we have fetched $(avp(result_final)[$var(it)]) \n");
		$var(it) = $var(it) + 1;
	}
...
		
```


## 常见问题 {#frequently-asked-questions}


**问：我的 OpenSIPS 偶尔会在 libhiredis 中崩溃，该怎么办？**


请确保已将 Redis 的 "libhiredis" 客户端库升级到
至少 0.14.1 版本。在该版本之前的库版本中至少报告过一个
严重漏洞（[CVE-2020-7105](https://bugzilla.redhat.com/show_bug.cgi?id=CVE-2020-7105)），
因此升级到最新稳定版很可能就能修复该崩溃！
<!-- CONTRIBUTORS -->

### 许可证 {#license}

所有文档文件（即 .md 扩展名）均按 Creative Common License 4.0 许可发布。
