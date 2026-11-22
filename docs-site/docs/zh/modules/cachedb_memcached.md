---
title: "cachedb_memcached 模块"
description: "该模块是一个缓存系统的实现，设计用于配合 memcached 服务器工作。"
---


## 管理指南 {#admin-guide}


### 概述 {#overview}


该模块是一个缓存系统的实现，设计用于配合 memcached 服务器工作。它使用
libmemcached 客户端库连接多台存储数据的 memcached 服务器。它使用核心导出的
键值（Key-Value）接口。


### 优势 {#advantages}


- *内存开销不再由服务器承担*
- *可以使用多台服务器，因此内存
实际上是无限的*
- *缓存是持久化的，因此重启
服务器不会影响缓存*
- *memcached 是一个开源项目，因此
可用它与其他各种应用程序
交换数据*
- *服务器可以分组
（例如出于安全考虑：一些可以位于
私有网络内，一些可以位于
公有网络）*


### 限制 {#limitations}


- *键（在键:值对中）不得包含空格或控制字符*


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


无。


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，必须安装以下库或应用程序：


- *libmemcached：*
libmemcached 可从以下地址下载：http://tangent.org/552/libmemcached.html。
下载归档文件，解压源码，依次运行 ./configure、make、sudo make install。

```bash
...
$ wget http://download.tangent.org/libmemcached-0.31.tar.gz 
$ tar -xzvf libmemcached-0.31.tar.gz
$ cd libmemcached-0.31
$ ./configure
$ make
$ sudo make install
...
```


### 导出的参数 {#exported-parameters}


#### cachedb_url (string)


OpenSIPS 为了在脚本中使用 cache_store、cache_fetch 等操作而将要连接的
服务器组的 url。该参数可以设置多次。
URL 的前缀部分将作为脚本中使用的标识符。


```opensips title="Set cachedb_url parameter"
...
modparam("cachedb_memcached", "cachedb_url","memcached:group1://localhost:9999,127.0.0.1/");
modparam("cachedb_memcached", "cachedb_url","memcached:y://random_url:8888/");
...
	
```


```opensips title="Use memcached servers"
...
cache_store("memcached:group1","key","$ru value");
cache_fetch("memcached:y","key",$avp(10));
cache_remove("memcached:group1","key");
...
	
```


#### exec_threshold (int)


一次本地缓存查询可以持续的最长微秒数。
任何超过该阈值的查询都会向日志触发一条告警消息


*默认值为 "0（无限制 - 不产生告警）"。*


```opensips title="Set exec_threshold parameter"
...
modparam("cachedb_memcached", "exec_threshold", 100000)
...
	
```


#### 导出的函数 {#exported-functions}


本模块不导出可在配置脚本中使用的函数。
<!-- CONTRIBUTORS -->

### 许可证 {#license}

所有文档文件（即 .md 扩展名）均依据 Creative Common License 4.0 授权
