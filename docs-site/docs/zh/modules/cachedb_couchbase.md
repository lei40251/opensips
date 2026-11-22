---
title: "cachedb_couchbase 模块"
description: "本模块是一种缓存系统的实现，用于与 Couchbase 服务器配合工作。"
sidebar: false
---


## 管理指南 {#admin-guide}


### 概述 {#overview}


本模块是一种缓存系统的实现，用于与
Couchbase 服务器配合工作。它使用 libcouchbase 客户端库连接
服务器实例。
它使用核心导出的 Key-Value 接口。


### 优势 {#advantages}


- *内存开销不再由服务器承担*
- *可以在一个集群内使用多台服务器，因此内存
实际上是无限的*
- *缓存 100% 持久化。重启
OpenSIPS 服务器不会影响数据库。CouchBase 数据库也是
持久化的，因此它同样可以在不丢失信息的情况下重启。*
- *CouchBase 是开源项目，因此
可用于与各种其他应用程序交换
数据*
- *通过创建 CouchBase 集群，多个 OpenSIPS
实例可以轻松共享键值信息*


### 限制 {#limitations}


- *键（key:value 对中的 key）不得包含空格或控制字符*


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


无。


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，必须安装以下库或应用程序：


- *libcouchbase >= 3.0:*
libcouchbase 可从 http://www.couchbase.com/develop/c/current 下载


### 导出的参数 {#exported-parameters}


#### cachedb_url (string)


OpenSIPS 为使用脚本中的 cache_store、cache_fetch 等操作
而将要连接的服务器组的 URL。
该参数可以设置多次。
URL 的前缀部分将成为脚本中使用的标识符。
URL 的格式为
*couchbase[:identifier]://[username:password@]IP:Port/bucket_name*


```opensips title="设置 cachedb_url 参数"
...
modparam("cachedb_couchbase", "cachedb_url","couchbase:group1://localhost:6379/default")
modparam("cachedb_couchbase", "cachedb_url","couchbase:cluster1://random_url:8888/my_bucket")
# 多个主机
modparam("cachedb_couchbase", "cachedb_url","couchbase:cluster1://random_url1:8888,random_url2:8888,random_url3:8888/my_bucket")
...
	
```


#### timeout (int)


一次 couchbase 操作预期持续的最长时长，单位为微秒。

*默认值为 3000000（3 秒）。*


```opensips title="设置 timeout 参数"
...
modparam("cachedb_couchbase", "timeout",5000000);
...
	
```


#### exec_threshold (int)


一次 couchbase 查询可以持续的最大微秒数。
任何超过该阈值的操作都会在日志中触发一条告警消息


*默认值为 "0（不限——无告警）"。*


```opensips title="设置 exec_threshold 参数"
...
modparam("cachedb_couchbase", "exec_threshold", 100000)
...
	
```


#### lazy_connect (int)


延迟连接到某个 bucket，直到其首次被使用。
启动时连接大量 bucket 可能很耗时。该选项通过将连接延迟到
需要时，实现更快的启动。
对于未经测试的 bucket 配置/设置，该选项可能有风险。请务必先在
不使用 lazy_connect 的情况下测试。
该选项会在首次访问某个 bucket 时于日志中显示错误。

*默认值为 0（启动时连接所有 bucket）。*


```opensips title="设置 lazy_connect 参数"
...
modparam("cachedb_couchbase", "lazy_connect", 1);
...
	
```


```opensips title="使用 CouchBase 服务器"
...
cache_store("couchbase:group1","key","$ru value");
cache_fetch("couchbase:cluster1","key",$avp(10));
cache_remove("couchbase:cluster1","key");
...
	
```


#### 导出的函数 {#exported-functions}


该模块不导出可在配置脚本中使用的
函数。
<!-- CONTRIBUTORS -->

### 许可证 {#license}

所有文档文件（即以 .md 为扩展名的文件）均按 Creative Common License 4.0 授权。
