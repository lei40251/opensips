---
title: "dns_cache 模块"
description: "该模块是一个针对 DNS 记录的缓存系统的实现。"
sidebar: false
---


## 管理指南 {#admin-guide}


### 概述 {#overview}


该模块是一个针对 DNS 记录的缓存系统的实现。
对于所有类型的成功 DNS 查询，模块会按照 DNS 应答中收到的 TTL 秒数，
将映射关系存储在缓存/数据库后端。失败的 DNS 查询也会存储到后端，
其 TTL 可由用户指定。
该模块使用核心导出的键值接口。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


在加载 dns_cache 模块之前，必须先加载一个 cachedb_* 类型的模块。


### 导出的参数 {#exported-parameters}


#### cachedb_url (string)


将用于存储 DNS 记录的键值后端的 url。


```opensips title="Set cachedb_url parameter"
...
#使用内部 cachedb_local 模块
modparam("dns_cache", "cachedb_url","local://")
#使用 cachedb_memcached 模块，memcached 服务器位于 192.168.2.130
modparam("dns_cache", "cachedb_url","memcached://192.168.2.130:8888/")
...
		
```


#### blacklist_timeout (int)


失败的 DNS 查询在缓存中保留的秒数。
默认值为 3600。


```opensips title="Set blacklist_timeout parameter"
...
modparam("dns_cache", "blacklist_timeout",7200) # 2 小时
...
		
```


#### min_ttl (int)


DNS 记录在缓存中保留的最少秒数。如果 DNS 应答中收到的 TTL 低于该值，
则该记录将按 min_ttl 秒缓存。


*默认值为 **0** 秒（不强制最小 TTL）。*


```opensips title="Set min_ttl parameter"
...
modparam("dns_cache", "min_ttl",300) # 5 分钟
...
		
```


### 导出的函数 {#exported-functions}


本模块不导出可在配置脚本中使用的函数。
<!-- CONTRIBUTORS -->

### 许可证 {#license}

所有文档文件（即 .md 扩展名）均依据 Creative Common License 4.0 授权
