---
title: "Trie 模块"
---


## 管理指南 {#admin-guide}


### 概述 {#overview}


#### 简介 {#introduction}


Trie 是一个用于高效缓存和查找一组前缀（存储于 trie 数据结构中）的模块。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


在本模块之前必须加载以下模块：


- *一个数据库模块*。


#### 外部库或应用程序 {#external-libraries-or-applications}


- *无*。


### 导出的参数 {#exported-parameters}


#### trie_table(str)


存储前缀规则的数据库表名。


*默认值为 "trie_table"。*


```opensips title="设置 trie_table 参数"
...
modparam("trie", "trie_table", "my_prefix_table")
...
```


#### no_concurrent_reload (int)


如果启用，本模块将不允许并行（重叠）运行多个 trie_reload
MI 命令。在已有重新加载进行中时，任何新的重新加载
都会被拒绝（并丢弃）。


如果路由集合很大（数百万条规则/前缀），
应考虑禁用并发重新加载，因为它们会耗尽
共享内存（会同时把多份路由数据实例
加载到内存中）。


*默认值为 "0（禁用）"。*


```opensips title="设置 no_concurrent_reload 参数"
...
# 不允许并行重新加载操作
modparam("trie", "no_concurrent_reload", 1)
...
```


#### use_partitions (int)


用于配置是否为 trie 使用分区的标志位。如果设置了该
标志位，则 `db_partitions_url` 和
`db_partitions_table`
变量成为必填项。


*默认值为 "0"。*


```opensips title="设置 use_partitions 参数"
...
modparam("trie", "use_partitions", 1)
...
```


#### db_partitions_url (str)


包含分区专属信息的数据库 url。`use_partitions` 参数
必须设置为 1。


*默认值为 "NULL"。*


```opensips title="设置 db_partitions_url 参数"
...
modparam("trie", "db_partitions_url", "mysql://user:password@localhost/opensips_partitions")
...
```


#### db_partitions_table (str)


包含分区定义的表名。与 `use_partitions` 和
`db_partitions_url` 配合使用。


*默认值为 "trie_partitions"。*


```opensips title="设置 db_partitions_table 参数"
...
modparam("trie", "db_partitions_table", "trie_partition_defs")
...
```


#### extra_prefix_chars (str)


前缀中额外允许的 ASCII（0-127）字符列表。默认只
接受 '0' - '9' 字符（数字）。


*默认值为 "NULL"。*


```opensips title="设置 extra_prefix_chars 参数"
...
modparam("trie", "extra_prefix_chars", "#-%")
...
```


### 导出的函数 {#exported-functions}


#### trie_search(number, [flags], [trie_attrs_pvar], [match_prefix_pvar], [partition])


在 trie 中查找某个条目（number）的函数。


该函数可在所有路由中使用。


如果将 `use_partitions` 设置为 1，
最后一个 **partition** 参数将成为
必填项。


所有参数均为可选。只要正确放置了必要的分隔符 ","，
其中任何参数都可以忽略。


- **number** (str) - 要在 trie 中查找的号码
- **flags** (string, optional) - 一组
类字母标志位，用于控制路由行为。
可用的标志位有：

  - **L** - 对前缀执行严格长度匹配 -
实际上 trie 引擎将执行完全号码匹配，
而不再是前缀匹配。
- **trie_attrs_pvar** (var, optional) - 一个
可写变量，将填充匹配到的
trie 规则的属性。
- **match_prefix_pvar** (var, optional) - 一个
可写变量，其值为 trie 中实际匹配到的前缀。
- **partition** (string, optional) - 要使用的
trie 分区名。仅当 "use_partition" 模块参数
开启时才定义该参数。


```opensips title="trie_search 用法"
...
if (trie_search("$rU","L",$avp(code_attrs),,"my_partition")) {
    # 在 trie 中找到了它，这是一次匹配
    xlog("We found $rU in the trie with attrs $avp(code_attrs) \n");
}
```


### 导出的 MI 函数 {#exported-mi-functions}


#### trie_reload


从数据库重新加载 trie 规则的命令。


- 如果 `use_partition` 设置为 0 - 将重新加载所有路由规则。
- 如果 `use_partition` 设置为 1，参数为：
	- *partition_name* (optional) - 如果未提供，
		则重新加载所有分区；否则仅重新加载作为参数给出的分区。


MI FIFO 命令格式：


```bash
opensips-cli -x mi trie_reload part_1
```


#### trie_reload_status


获取各分区最后一次重新加载的时间。


- 如果 `use_partition` 设置为 0 - 该函数
不接收任何参数。它将列出默认（也是唯一）分区
最后一次重新加载的日期。
- 如果 `use_partition` 设置为 1，参数为：
	- *partition_name* (optional) - 如果未提供，
		该函数将列出每个分区最后一次更新的时间。
		否则，该函数将列出给定分区最后一次
		重新加载的时间。


```bash title="use_partitions 为 0 时的 trie_reload_status 用法"
$ opensips-cli -x mi trie_reload_status
Date:: Tue Aug 12 12:26:00 2014
```


#### trie_search


尝试在已从数据库加载的现有 trie 中匹配某个号码。


- 如果 `use_partition` 设置为 1，该函数
将有 2 个参数：
	- *partition_name*
	- *number* - 要匹配的号码
- 如果 `use_partition` 设置为 0，该函数将有 1 个参数：
	- *number* - 要匹配的号码

MI FIFO 命令格式：

```bash
opensips-cli -x mi trie_search partition_name=part1 number=012340987
```


#### trie_number_delete


删除 trie 中的单个条目，而无需重新加载全部数据


- 如果 `use_partition` 设置为 1，该函数
将有 2 个参数：
	- *partition_name*
	- *number* - 要删除的号码数组

MI FIFO 命令格式：


```bash
opensips-cli -x mi trie_number_delete partition_name=part1 number=["012340987","4858345"]
```


#### trie_number_upsert


在 trie 中对一组号码执行 upsert（不存在则插入，存在则更新），而无需重新加载全部数据


- 如果 `use_partition` 设置为 1，该函数
将有 3 个参数：
	- *partition_name*
	- *number* - 要更新的号码数组
	- *attrs* - 这些号码的新属性数组


MI FIFO 命令格式：


```bash
opensips-cli -x mi trie_number_upsert partition_name=part1 number=["012340987"] attrs=["my_attrs"]
```


### 安装 {#installation}


本模块需要 OpenSIPS 数据库中的若干表。
你也可以在项目网页 [https://opensips.org/docs/db/db-schema-devel.html](https://opensips.org/docs/db/db-schema-devel.html) 上找到完整的数据库文档。
<!-- CONTRIBUTORS -->

### 许可证 {#license}

所有文档文件（即以 .md 为扩展名的文件）均按 Creative Common License 4.0 授权。
