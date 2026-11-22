---
title: "db_cachedb 模块"
---


## 管理指南 {#admin-guide}


### 概述 {#overview}


#### 设计思路 {#the-idea}


db_cachedb 模块将暴露相同的前端 db api，但它运行在 NoSQL 后端之上，把 SQL 调用模拟为后端特定的查询。


因此，任何通常需要常规的基于 SQL 的数据库的 OpenSIPS 模块，现在都可以运行在 NoSQL 后端之上，从而使现有 OpenSIPS 模块在分布式环境中的分发与集成变得容易得多。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


以下模块必须在本模块之前加载：


- *至少一个 NoSQL 的 cachedb_* 模块*。


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，必须安装以下库或应用程序：


- *无*。


### 导出的参数 {#exported-parameters}


#### cachedb_url (str)


要使用的 CacheDB 后端的 URL。可以设置多次。


```opensips title="设置 cachedb_url 参数"
...
modparam("db_cachedb","cachedb_url","mongodb:mycluster://127.0.0.1:27017/db.col")
...
```


### 用法示例 {#examples-of-usage}


#### 分布式用户库 {#distributed-subscriber-base}


为实现这样的部署，需要将 auth_db 模块的 db_url 参数设置为指向 DB_CACHEDB 的 URL。


```opensips title="使用 DB_CACHEDB 的 OpenSIPS CFG 片段"
loadmodule "auth_db.so"
modparam("auth_db", "load_credentials", "$avp(user_rpid)=rpid")

loadmodule "db_cachedb.so"
loadmodule "cachedb_mongodb.so"
...
modparam("db_cachedb","cachedb_url","mongodb:mycluster://127.0.0.1:27017/my_db.col")
modparam("auth_db","db_url","cachedb://mongodb:mycluster")
...
```


通过这样的部署，auth_db 模块将从 MongoDB 集群的 'my_db' 数据库、'subscriber' 集合中加载用户。


同样的机制/部署可用于在 cachedb 集群之上运行其他模块（如 usrloc、dialog、permissions、drouting 等）。


### 当前限制 {#current-limitations}


#### CacheDB 模块集成 {#cachedb-modules-integration}


目前唯一实现此功能的 cachedb_* 模块是 cachedb_mongodb 模块，因此目前只能向 MongoDB 实例/集群模拟 SQL 查询。

计划将此功能扩展到其他 cachedb_* 后端，如 Cassandra 和 CouchBase。


#### 需要大量测试 {#extensive-testing-needed}


由于目前有许多 OpenSIPS 模块使用 DB 接口，无法对所有模块的所有场景都进行测试，因此可能仍存在一些不兼容之处。

本模块已用一些常用模块（如 usrloc、dialog、permissions、drouting）进行测试，但非常欢迎更多的测试，也感谢反馈。


#### CacheDB 特有的 'schema' 及其他不兼容性 {#cachedb-specific-schema-and-other-incompatibilities}


由于 NoSQL 后端通常不涉及严格的 schema，我们不提供用于创建此类 schema 的脚本，因为插入操作会触发 schema 和信息的动态创建。

不过，仍需要存在一个特定的数据集合，它相当于 SQL 中的 'version' 表。由于大多数模块在模块初始化时检查 version 表，因此用户有责任在相应的 NoSQL 后端中设置这样一个 'version' 集合。

例如，对于 MongoDB 集群，'version' 是保留关键字，因此必须修改 OpenSIPS 使用的默认 version 表（通过 'db_version_table' 全局参数），然后手动插入版本号，例如 db.my_version_table.insert({table_version : NumberInt(5), table_name : "address"})
<!-- CONTRIBUTORS -->

### 许可证 {#license}


所有文档文件（即 .md 扩展名）均按 Creative Common License 4.0 许可发布。
