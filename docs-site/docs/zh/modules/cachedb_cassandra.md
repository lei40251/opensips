---
title: "cachedb_cassandra 模块"
description: "本模块是面向 Cassandra 服务器的缓存系统实现，使用由核心导出的 Key-Value 接口。"
---


## 管理指南 {#admin-guide}


### 概述 {#overview}


本模块是面向 Cassandra 服务器的缓存系统实现。
它使用由核心导出的 Key-Value 接口。


底层客户端库兼容 Cassandra 2.1+ 版本。


### 优势 {#advantages}


- *内存开销不再由服务器承担*
- *可在集群中使用多台服务器，因此内存实际上不受限制*
- *缓存 100% 持久化。重启 OpenSIPS 服务器不会影响数据库。Cassandra 数据库
  本身也是持久化的，因此它也可以在不丢失信息的情况下重启。*
- *Cassandra 是开源项目，因此可用于与其他各种应用程序
  交换数据*
- *通过创建 Cassandra 集群，多个 OpenSIPS 实例可以轻松共享
  键值信息*


### 限制 {#limitations}


- *键（key:value 对中的 key）中不允许包含空格或控制字符*


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


无。


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，必须安装以下库或应用程序：


- *libuv*
- *cassandra-cpp-driver*


适用于 Cassandra 的 DataStax C/C++ 驱动及 libuv 依赖库
可从以下地址下载：[http://downloads.datastax.com/cpp-driver/](http://downloads.datastax.com/cpp-driver/)。


### 导出的参数 {#exported-parameters}


#### cachedb_url (string)


OpenSIPS 将要连接的服务器组的 URL，用于在脚本中执行
cache_store、cache_fetch 等操作。
可以多次设置。
URL 的前缀部分即为脚本中使用的标识符。


Cassandra 不支持在包含 counter 列的表中共存普通列，
因此为了在 Key-Value 接口中使用 add()/sub()/get_counter() 方法，
可以额外指定一张仅供 counter 使用的表。


URL 的 database 部分需要采用 *Keyspace.Table[.CountersTable]* 格式。


```opensips title="Set cachedb_url parameter"
...
modparam("cachedb_cassandra", "cachedb_url",
	"cassandra:group1://localhost:9042/keyspace1.users.counters")

# 为 Cassandra 集群定义多个联系点
modparam("cachedb_cassandra", "cachedb_url",
	"cassandra:cluster1://10.0.0.10,10.0.0.15/keyspace2.keys.counters")
...
	
```


```opensips title="Use Cassandra servers"
...
cache_store("cassandra:group1","key","$ru value");
cache_fetch("cassandra:cluster1","key",$avp(10));
cache_remove("cassandra:cluster1","key");
...
	
```


#### connect_timeout (int)


连接尝试失败时触发的超时时间，单位为毫秒。


*默认值为 "5000"。*


```opensips title="Set connect_timeout parameter"
...
modparam("cachedb_cassandra", "connect_timeout",1000);
...
	
```


#### query_timeout (int) {#query_timeout-int}


Cassandra 查询耗时过长时触发的超时时间，单位为毫秒。


*默认值为 "5000"。*


```opensips title="Set query_timeout parameter"
...
modparam("cachedb_cassandra", "query_timeout",1000);
...
	
```


#### wr_consistency_level (string)


写操作所需的一致性级别。
可选值：


- *all* - 写操作必须写入该分区的所有副本节点的提交日志（commit log）和内存表（memtable）。
- *each_quorum* - 强一致性。写操作必须写入每个数据中心中法定数量副本节点的提交日志和内存表。
- *quorum* - 写操作必须写入所有数据中心中法定数量副本节点的提交日志和内存表。
- *local_quorum* - 强一致性。写操作必须写入与协调者位于同一数据中心的法定数量副本节点的提交日志和内存表。可避免跨数据中心通信的延迟。
- *one* - 写操作必须写入至少一个副本节点的提交日志和内存表。
- *two* - 写操作必须写入至少两个副本节点的提交日志和内存表。
- *three* - 写操作必须写入至少三个副本节点的提交日志和内存表。
- *local_one* - 写操作必须发送到本地数据中心中至少一个副本节点，并获得其成功确认。
- *any* - 写操作必须写入至少一个节点。如果给定分区键的所有副本节点都不可用，写操作在写入暗示移交（hinted handoff）后仍可成功。如果写入时所有副本节点都不可用，则 ANY 写入在该分区的副本节点恢复之前不可读。


默认值为 *one*。


```opensips title="Set wr_consistency_level parameter"
...
modparam("cachedb_cassandra", "wr_consistency_level", "each_quorum");
...
	
```


#### rd_consistency_level (string)


写操作所需的一致性级别。
可选值：


- *all* - 在所有副本响应后返回记录。如果某个副本未响应，读操作将失败。
- *quorum* - 在所有数据中心中法定数量副本响应后返回记录。
- *local_quorum* - 在与协调者位于同一数据中心的法定数量副本报告后返回记录。可避免跨数据中心通信的延迟。
- *one* - 从最近的副本返回响应，最近副本由 snitch 决定。默认情况下会在后台运行读修复，以使其他副本保持一致。
- *two* - 从最近的两个副本返回最新数据。
- *three* - 从最近的三个副本返回最新数据。
- *local_one* - 从本地数据中心中最近的副本返回响应。
- *serial* - 允许在不提议新添加或更新的情况下读取数据的当前（可能尚未提交的）状态。如果 SERIAL 读发现正在进行未提交的事务，它将在读取过程中提交该事务。与 QUORUM 类似。
- *local_serial* - 与 SERIAL 相同，但限于本数据中心内。与 LOCAL_QUORUM 类似。


默认值为 *one*。


```opensips title="Set rd_consistency_level parameter"
...
modparam("cachedb_cassandra", "rd_consistency_level", "quorum");
...
	
```


#### exec_threshold (int)


超过此阈值的 Cassandra 缓存查询
会向日志触发一条告警消息。


若设置该值，只有低于 [query_timeout](#query_timeout-int) 才有意义，
因为任何耗时超过该值的查询都会被丢弃。


*默认值为 "0 ( unlimited - no warnings )"。*


```opensips title="Set exec_threshold parameter"
...
modparam("cachedb_cassandra", "exec_threshold", 100000)
...
	
```


### 导出的函数 {#exported-functions}


本模块不导出供配置脚本使用的函数。


### 表结构 {#table-schema}


用于支持 Key-Value 接口的 cache_store()/cache_fetch()/cache_remove()
函数所需的表至少需要包含以下列：


- *opensipskey* - 作为主键，类型为 "text"
- *opensipsval* - 类型为 "text"


用于支持 Key-Value 接口的 cache_add()/cache_sub()/cache_counter_fetch()
函数所需的表至少需要包含以下列：


- *opensipskey* - 作为主键，类型为 "text"
- *opensipsval* - 类型为 "counter"
<!-- CONTRIBUTORS -->

### 许可证 {#license}

所有文档文件（即 .md 扩展名）均按 Creative Common License 4.0 许可发布。
