---
title: "config 模块"
description: "*config* 模块通过在启动时从持久化存储加载 OpenSIPS 参数，并通过 $config(name) 伪变量将其暴露到脚本层，从而实现参数的动态、运行时配置。"
sidebar: false
---


## 管理指南 {#admin-guide}


### 概述 {#overview}


*config* 模块通过在启动时从持久化存储加载 OpenSIPS 参数，并通过
[$config(name)](#configname) 伪变量将其暴露到脚本层，从而实现参数的动态、
运行时配置。


所有配置变量都存储在 OpenSIPS 的内部缓存中，从而在 SIP 处理过程中实现快速访问，
保持高性能。缓存可以通过三种方式更新：


- *脚本* – 为 [$config(name)](#configname) 伪变量赋值会更新内存缓存，
  但该更改不会持久化到数据库。
- *MI 命令* – 使用 [config_push](#config_push) 或
  [config_push_bulk](#config_push_bulk) 更新运行时缓存中的一个或多个变量。
  这些更新同样不会保存到数据库。
- *数据库* – 手动修改数据库中的值，然后触发 [config_reload](#config_reload)
  命令，将使用数据库中的更新值刷新内存缓存。


#### 重启持久化内存 {#restart-persistent-memory}


默认情况下，配置缓存在启动时通过读取数据库进行初始化，
且仅在运行时期间保持。通过脚本或 MI 命令所做的任何临时更改，
若未使用 [config_flush](#config_flush) 命令显式刷写到数据库，
都会在重启后丢失。


在这种情况下，重启持久化内存便有了用处。通过
[enable_restart_persistency](#enable_restart_persistency-integer) 参数启用后，
OpenSIPS 在启动时不再从数据库加载配置值，而是恢复先前保存的内存缓存，
从而在重启之间保留运行时更改。


如有需要，仍可通过运行 [config_reload](#config_reload) MI 命令
手动从数据库重新初始化缓存。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


在加载本模块之前，必须先加载以下模块：


- *需要数据库模块来读取初始缓存*。


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，必须安装以下库或应用程序：


- *无*。


### 导出的参数 {#exported-parameters}


#### db_url (string)


用于加载初始配置值的数据库 URL，
并在运行时通过 [config_flush](#config_flush) MI 命令将配置值刷写到该数据库。


*默认值为 "mysql://opensips:opensipsrw@localhost/opensips"。*


```opensips title="Set 'db_url' parameter"
...
modparam("config", "db_url", "dbdriver://username:password@dbhost/dbname")
...
```


#### table_name (string)


存储配置条目的表的名称。


*默认值为 "config"。*


```opensips title="Set 'table_name' parameter"
...
modparam("config", "table_name", "configuration")
...
```


#### name_column (string)


存储配置变量名称的列的名称。


*默认值为 "name"。*


```opensips title="Set 'name_column' parameter"
...
modparam("config", "name_column", "key")
...
```


#### value_column (string)


存储配置变量值的列的名称。


*默认值为 "value"。*


```opensips title="Set 'value_column' parameter"
...
modparam("config", "value_column", "val")
...
```


#### description_column (string)


存储变量描述的列的名称。


*默认值为 "description"。*


```opensips title="Set 'desctiption_column' parameter"
...
modparam("config", "description_column", "desc")
...
```


#### enable_restart_persistency (integer) {#enable_restart_persistency-integer}


启用重启持久化。更多信息参见
[重启持久化内存](#restart-persistent-memory)。


*默认值为 "0 / disabled"。*


```opensips title="Set 'restart_persistent_memory' parameter"
...
modparam("config", "restart_persistent_memory", yes)
...
```


#### hash_size (integer)


用于存储配置变量的内部哈希表的大小。
必须是 2 的幂，否则其值将被舍入为小于所提供值的
最接近的 2 的幂。


*默认值为 "16"。*


```opensips title="Set 'hash_size' parameter"
...
modparam("config", "hash_size", 32)
...
```


### 导出的伪变量 {#exported-pseudo-variables}


#### $config(name) {#configname}


按名称返回给定配置变量的值。
也可用于临时更改该值。


```opensips title="Usage of $config(...)"
...
xlog("Config value: $config(debug_mode)\n"); # 读取该值
$config(debug_mode) = 1; # 临时更改该值
...
```


#### $config.description(name)


返回配置变量的描述（如果可用）。


该变量为只读。


```opensips title="Usage of $config.description(name)"
...
xlog("Description: $config.description(debug_mode)\n");
...
```


### 导出的 MI 函数 {#exported-mi-functions}


#### config_reload {#config_reload}


从数据库重新加载所有配置变量。


MI FIFO 命令格式：


```bash
## 从数据库重新加载配置缓存
opensips-mi config_reload
opensips-cli -x mi config_reload
```


#### config_list


列出当前已加载到缓存中的所有配置变量，
同时打印临时值。
如果提供了可选的 *description* 参数且其值不为 *0*，
还会返回一个包含这些值描述的数组。


MI FIFO 命令格式：


```bash
## 列出整个配置缓存
opensips-mi config_list
opensips-cli -x mi config_list 1
```


#### config_push {#config_push}


临时推送单个配置变量。


期望的参数为：


- *name* – (string) 变量的名称
- *value* – (string) 变量的值
- *description* – (string, 可选) 变量的描述；
  若未提供，则继承原描述，若变量是新建的则使用空值。


MI FIFO 命令格式：


```bash
## 临时推送 debug_mode 配置值
opensips-mi config_push debug_mode 1 "Enable Debug mode"
opensips-cli -x mi config_list 1
```


#### config_push_bulk {#config_push_bulk}


在内存中推送多个临时配置变量。


期望的参数为：


- *configs* – (json) 一个 JSON 数组，包含要推送的一组变量。
  每个变量应描述为具有以下键的 JSON 对象：
	* *name* – (string) 要更改的变量的名称。
	* *value* – (string 或 null) 变量的新值。
	* *description* – (string, 可选) 变量的描述。


MI FIFO 命令格式：


```bash
## 批量推送临时值到配置缓存
opensips-mi config_push_bulk -j '[[{"name":"debug_mode","value":"1"},{"name":"debug_level","value":"5"}]]'
```


该命令返回成功推送的值的数量。


#### config_flush {#config_flush}


将变量从内存刷写到数据库。


期望的参数为：


- *name* – (string, 可选) 若提供，则仅将指定的配置变量刷写到数据库，
  否则刷写整个缓存。


MI FIFO 命令格式：


```bash
## 将配置变量刷写到数据库
opensips-mi config_flush
opensips-cli -x mi config_flush debug_mode
```


该命令返回成功刷写的值的数量。
<!-- CONTRIBUTORS -->

### 许可证 {#license}

所有文档文件（即 .md 扩展名）均按 Creative Common License 4.0 许可发布。
