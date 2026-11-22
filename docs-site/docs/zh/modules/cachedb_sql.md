---
title: "cachedb_sql 模块"
description: "本模块是一个缓存系统的实现，设计用于配合常规的基于 SQL 的服务器工作。"
sidebar: false
---


## 管理指南 {#admin-guide}


### 概述 {#overview}


本模块是一个缓存系统的实现，设计用于配合常规的基于 SQL 的服务器工作。它使用内部 DB 接口连接到后端，同时实现了由核心导出的 Key-Value 接口。


### 优势 {#advantages}


- *内存开销不再位于服务器上*
- *缓存 100% 持久。重启 OpenSIPS 服务器不会影响 DB。DB 本身也是持久的，因此也可以重启而不丢失信息。*
- *多个 OpenSIPS 实例可以通过常规的基于 SQL 的数据库轻松共享键值信息*


### 限制 {#limitations}


- *本模块的计数操作（ADD 和 SUB）目前仅由 MySQL 支持*


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


无。


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，必须安装以下库或应用程序：


- *无：*


### 导出的参数 {#exported-parameters}


#### cachedb_url (string)


OpenSIPS 将要连接的数据库的 url，用于在脚本中执行 cache_store、cache_fetch 等操作。


应遵循的格式为：sql:[conn_id]-dburl


该参数可以多次设置，以创建多个可从 OpenSIPS 脚本访问的连接。


```opensips title="设置 db_url 参数"
...
modparam("cachedb_sql", "cachedb_url", "sql:1st-mysql://root:vlad@localhost/opensips_sql")
...
	
```


```opensips title="用法示例"
...
modparam("cachedb_sql", "cachedb_url", "sql:1st-mysql://root:vlad@localhost/opensips_sql")
modparam("cachedb_sql", "cachedb_url", "sql:2nd-postgres://root:vlad@localhost/opensips_pg")
...
...
cache_store("sql:1st-mysql","key","$ru value");
cache_store("sql:2nd-postgres","counter","10");
...
	
```


#### db_table (string)


OpenSIPS 将要连接的数据库的表，用于在脚本中执行 cache_store、cache_fetch 等操作。


```opensips title="设置 db_url 参数"
...
modparam("cachedb_sql", "db_table","my_table");
...
	
```


#### key_column (string)


存储键的列


```opensips title="设置 key_column 参数"
...
modparam("cachedb_sql", "key_column","some_name");
...
	
```


#### value_column (string)


存储值的列


```opensips title="设置 value_column 参数"
...
modparam("cachedb_sql", "value_column","some_name");
...
	
```


#### counter_column (string)


存储计数值的列


```opensips title="设置 counter_column 参数"
...
modparam("cachedb_sql", "counter_column","some_name");
...
	
```


#### expires_column (string)


存储过期时间的列


```opensips title="设置 expires_column 参数"
...
modparam("cachedb_sql", "expires_column","some_name");
...
	
```


#### cache_clean_period (int)


已过期的键从数据库中被移除的时间间隔，单位为秒。默认值为 60（秒）


```opensips title="设置 cache_clean_period 参数"
...
modparam("cachedb_sql", "cache_clean_period",10);
...
	
```


#### 导出的函数 {#exported-functions}


本模块不导出可在配置脚本中使用的函数。


## 常见问题 {#frequently-asked-questions}


**问：旧的 "db_url" 模块参数发生了什么？**


它已被 "cachedb_url" 参数取代。有关 "cachedb_url" 参数的用法，请参阅文档。
<!-- CONTRIBUTORS -->

### 许可证 {#license}


所有文档文件（即 .md 扩展名）均按 Creative Common License 4.0 许可发布。
