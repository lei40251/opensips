---
title: "cachedb_local 模块"
description: "该模块是一个本地缓存系统的实现，以哈希表的形式设计。"
sidebar: false
---


## 管理指南 {#admin-guide}


### 概述 {#overview}


该模块是一个本地缓存系统的实现，以哈希表的形式
设计。它使用 OpenSIPS 核心导出的键值（Key-Value）接口。
从 2.3 版本开始，该模块可以拥有多个哈希表，
称为集合（collection）。cachedb_local 模块的每个 url 指向一个
集合。一个集合可以在多个 url 之间共享。


### 集群 {#clustering}


Cachedb_local 集群是一种机制，用于将某个 OpenSIPS 实例中发生的本地缓存
变更镜像到一个或多个其他实例，而
无需第三方依赖。
该过程通过使用 clusterer 模块得以简化，该模块便于
管理一组 OpenSIPS 节点，以及发送与复制相关的
BIN 数据包（二进制编码，使用 proto_bin）。这对于实现
热备系统可能很有用，在该系统中备用实例可以接管，而无需
自行填充缓存。


以下缓存操作将在集群内分发：


- cache_store
- cache_remove
- cache_add
- cache_sub


除了事件驱动的复制之外，OpenSIPS 实例在启动时还会首先
尝试从集群中的另一个节点学习所有本地缓存信息。
该数据同步机制要求将集群中的一个节点
定义为 "**seed**" 节点。
关于如何做到这一点以及为何需要这样做，请参阅 [clusterer](/zh/modules/clusterer#capabilities-layer)
模块。


*注意：* 在设置 [cache_collections](#cache_collections-string) 时，必须显式指定
要复制哪些集合。


**局限性：** 集群操作不是原子的，
且不保证集群节点之间的一致性。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


在加载本模块之前，必须加载以下模块：


- *如果设置了 [cluster_id](#cluster_id-int)，则需要
clusterer 模块。*


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，必须安装以下库或应用程序：


- *无*


### 导出的参数 {#exported-parameters}


#### cachedb_url (string)


用于脚本和 MI 的 cacheDB 操作的本地缓存组的 URL。该参数可以设置
多次。


一个集合可以属于多个 URL，但一个 URL 只能有一个集合。
用相同的 schema 和组名重新定义某个 URL 将导致
覆盖该 URL。URL 定义中使用的每个集合都必须通过
*cachedb_collection* 参数定义。集合应像示例中那样，
作为普通数据库在 URL 末尾定义。在脚本中，应使用
schema 以及（如果存在）组名来标识该集合。


*"如果未定义任何 URL，则将使用不带组名、集合为 "default"
的 url。"。*


```opensips title="Set cachedb_url parameter"
...
### 本例中，如果未定义集合，则将使用名为
### "default" 的默认集合
modparam("cachedb_local", "cachedb_url", "local://")
### 该 URL 将使用名为 collection1 的集合；它将覆盖
### 之前使用 "default" 集合的 url 定义
modparam("cachedb_local", "cachedb_url", "local:///collection1")
### 该 URL 将使用 collection2；它将从脚本中以
### "local:group2" 引用
modparam("cachedb_local", "cachedb_url", "local:group2:///collection2")

## 如何在脚本中使用这些 URL
## 如上定义，该调用将使用 collection1
cache_store("local", ...)
## 如上定义，该调用将使用 collection2
cache_store("local:group2", ...)
...
	
```


#### cache_collections (string) {#cache_collections-string}


使用该参数可以定义集合（哈希表）及其大小。每个
集合定义之间必须用 ';' 分隔。哈希的默认大小为 512。
大小必须与集合名称用
'=' 分隔。


如果启用了集群，必须在集合名称后加上
*/r* 后缀，以指定要复制哪些集合。


*"default"* 集合总会被创建，即使
未包含在此集合列表中。


```opensips title="Set cache_collections parameter"
...
## 创建使用默认大小（512）的 collection1，以及使用自定义大小
## 2^5（32）的 collection2；我们还更改了默认集合的大小，该集合本来
## 也会被创建，从 2^9 - 512（默认值）改为 2^4 - 16
## 此外，collection1 和 collection2 将在集群中复制，而
## 默认集合将只存在于本节点
modparam("cachedb_local", "cache_collections", "collection1/r; collection2/r = 5; default = 4")
...
	
```


#### cache_clean_period (int)


以秒为单位的时间间隔，用于遍历所有
记录并删除已过期的记录。


*默认值为 "600（10 分钟）"。*


```opensips title="Set cache_clean_period parameter"
...
modparam("cachedb_local", "cache_clean_period", 1200)
...
	
```


#### cluster_id (int) {#cluster_id-int}


指定该实例将向其发送缓存数据以及从中接收
缓存数据的集群 ID。


该 OpenSIPS 集群会公开 **"cachedb-local-repl"**
能力，以便在任意同步请求期间将节点标记为
符合成为数据提供者的条件。因此，集群*至少
必须有一个节点*在 *clusterer.flags* 列/属性中标记为
**"seed"** 值，才能完全正常工作。
更多细节请参阅 [clusterer - 能力](/zh/modules/clusterer#capabilities-layer)
章节。


*默认值为 0（复制禁用）。*


```opensips title="Setting the cluster_id parameter"
...
modparam("cachedb_local", "cluster_id", 1)
...
	
```


#### cluster_persistency (string)


控制 OpenSIPS 本地 cachedb 集群在重启后的行为。


该参数可以取以下值：


- *"none"* - 重启后不进行显式数据
同步。节点以空状态启动。
- *"sync-from-cluster"* - 启用
基于集群的重启持久化。重启后，
OpenSIPS 集群节点会寻找一个健康的 "donor" 节点，
通过直接集群同步（基于 TCP、二进制编码的数据传输）
从该节点镜像整个用户位置数据集。
这需要在集群中配置一个或多个 "seed"
节点。


*默认值为 "sync-from-cluster"。*


```opensips title="Set cluster_persistency parameter"
...
modparam("cachedb_local", "cluster_persistency", "sync-from-cluster")
...
	
```


#### enable_restart_persistency (int)


使用持久内存机制启用重启持久化。数据
存储在映射到 OpenSIPS 内存的缓存文件中。


请注意，必须保持与上一次运行相同的集合定义，
才能使用相应集合的缓存数据。


如果同时启用了集群持久化，则从持久
缓存加载的键如果在集群同步数据中未收到，将被丢弃。


*默认值为 "0（禁用）"。*


```opensips title="Set enable_restart_persistency parameter"
...
modparam("cachedb_local", "enable_restart_persistency", yes)
...
```


### 导出的函数 {#exported-functions}


#### cache_remove_chunk([collection,] glob)


从本地缓存中移除所有匹配 *glob* 模式且
属于某个 *collection*（若未定义则为 'default' 集合）的键。
请记住，集合名称与组名不同，
组名用于在 cachedb 操作中标识引擎。


参数：


- *collection*（string，可选）
- *glob*（string）


该函数可在所有路由中使用


```opensips title="cache_remove_chunk usage"
	...
	cache_remove_chunk("myinfo_*");
	cache_remove_chunk("collection1", "myinfo_*");
	...
	
```


### 导出的 MI 函数 {#exported-mi-functions}


#### cache_remove_chunk


移除所有匹配所提供 glob 参数的本地缓存条目。


参数：


- *glob* - 匹配 glob 的键将被移除
- *collection(optional)* - 要从中移除键的集合；
如果未设置集合，将使用默认集合；


MI FIFO 命令格式：


```bash
opensips-cli -x mi cache_remove_chunk "keyprefix*" collection
	
```


#### cache_fetch_chunk


获取所有匹配所提供 glob 参数的本地缓存条目。


参数：


- *glob* - 匹配 glob 的键将被返回
- *collection(optional)* - 要从中检索键的集合；
如果未设置集合，将使用默认集合；


MI FIFO 命令格式：


```bash
opensips-cli -x mi cache_fetch_chunk "keyprefix*" collection
{
    "keys": [
        {
            "name": "keyprefix_1",
            "value": "key 1 data here"
        },
        {
            "name": "keyprefix_2",
            "value": "key 2 data here"
        }
    ]
}
	
```


## 常见问题 {#frequently-asked-questions}


**问：旧的 cache_table_size 参数怎么了？**


该参数因冗余已被移除。自引入
集合以来，旧的哈希现在属于
默认集合。该集合每次都会创建，
其默认大小为 512。可以通过使用 cache_collections 参数
设置默认集合大小来更改该大小。
<!-- CONTRIBUTORS -->

### 许可证 {#license}

所有文档文件（即 .md 扩展名）均按 Creative Common License 4.0 许可发布。
