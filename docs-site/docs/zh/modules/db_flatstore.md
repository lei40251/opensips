---
title: "DB_FLATSTORE 模块"
description: "Flatstore 是所谓的 OpenSIPS 数据库模块之一。它不导出任何可从配置脚本执行的函数，而是导出数据库 API 的一个子集，因此其他模块可以用它替代例如 mysql 模块。"
sidebar: false
---


## 管理指南 {#admin-guide}


### 概述 {#overview}


Flatstore 是所谓的 OpenSIPS 数据库模块之一。它不导出任何可从配置脚本执行的函数，而是导出数据库 API 的一个子集，因此其他模块可以用它替代例如 mysql 模块。


本模块并不导出数据库 API 的全部函数，它只支持一个函数，即 insert。本模块功能有限但速度极快。它特别适合在流量极高的站点上存储计费信息。如果 MySQL 太慢，或者你产生了海量的计费数据，那么可以考虑使用本模块。请注意，acc 模块是唯一经过 flatstore 测试的模块。


本模块生成的文件格式为纯文本。每一行由若干字段组成，字段默认以 | 字符分隔。新信息总是追加到文件末尾，本模块不支持对已有数据进行查询、删除和更新。


acc 模块可以通过 db_url_parameter 配置为使用 flatstore 模块作为数据库后端：


```opensips
modparam("acc", "db_url", "flatstore:/var/log/acc")
```


该配置项告诉 acc 模块应使用 flatstore 模块，并且 flatstore 模块应在 /var/log/acc 目录下创建所有文件。该目录必须存在，且 OpenSIPS 进程必须拥有在该目录中创建文件的权限。


该目录中文件的名称遵循以下模式：


```xml
<prefix><table_name>[_<process_name>]<suffix>
```


例如，在不设置任何模块参数的情况下，OpenSIPS 进程 8 写入 acc 表的条目会被写入文件 acc_8.log。每张表会有多个文件，向该表写入过数据的每个 OpenSIPS 进程对应一个文件。每张表之所以有多个文件，主要原因在于每个进程一个文件的写入速度要快得多，因为这样不需要任何加锁，OpenSIPS 进程之间也就不会相互阻塞。要获得某张表的完整数据，只需将表名相同但进程 id 不同的文件内容拼接起来即可。另一种做法是使用 single_file 参数，这样所有进程都会把数据写入同一个文件。注意这会带来一定的延迟。


#### 轮转日志文件 {#rotating-log-files}


有一个名为 flat_rotate 的新 OpenSIPS MI（管理接口）命令。当 OpenSIPS 收到该命令时，它会关闭并重新打开 flatstore 模块使用的所有文件。轮转本身必须由另一个应用程序（例如 logrotate）完成。请按以下步骤轮转 flatstore 模块生成的文件：


- 重命名你想要轮转的文件：

```bash

cd /var/log/acc
mv acc_1.log acc_1.log.20050605
mv acc_2.log acc_2.log.20050605
mv acc_4.log acc_3.log.20050605
...
```

> [!NOTE]
> 此时 OpenSIPS 仍会把所有数据写入已重命名的文件。
- 向 OpenSIPS 发送 MI 命令，关闭并重新打开已重命名的文件。例如，使用 FIFO：

```bash
opensips-cli -x mi flat_rotate
```
这会强制 OpenSIPS 关闭已重命名的文件，并以原始名称（例如 `acc_1.log`）打开新文件。新文件会在 OpenSIPS 有数据要写入时打开。如果没有流量经过代理服务器，这些文件不会立即创建，这属于正常现象。

> [!NOTE] 
> suffix 与 prefix 参数在每次发出 flat_rotate 命令时都会重新求值。因此，执行一次轮转命令之后，打开的可能是与之前不同的文件。

- 将已重命名的文件移动到其他位置并进行处理。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


以下模块必须在本模块之前加载：


- *不依赖其他 OpenSIPS 模块*。


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，必须安装以下库或应用程序：


- *无*。


### 导出的参数 {#exported-parameters}


#### flush (integer)


启用或禁用每次写入后的刷新。


*默认值为 1。*


```opensips title="Set 'flush' parameter"
...
modparam("db_flatstore", "flush", 0)
...
```


#### delimiter (char)


用于分隔各值的分隔符。


*默认值为 '|'。*


```opensips title="Set 'delimiter' parameter"
...
modparam("db_flatstore", "delimiter", ";")
...
```


#### suffix (string)


追加到表名后的后缀。可以是伪变量。


*默认值为 ".log"。*


```opensips title="Set 'suffix' parameter"
...
modparam("db_flatstore", "suffix", "$time(%H)")
...
```


#### prefix (string)


表名前缀。可以是伪变量。


*默认值为无。*


```opensips title="Set 'prefix' parameter"
...
modparam("db_flatstore", "prefix", "$time(%H)")
...
```


#### single_file (integer)


指定是否所有进程都把数据写入同一个文件。


*默认值为 0。*


```opensips title="Set 'single_file' parameter"
...
modparam("db_flatstore", "single_file", 1)
...
```


### 导出的函数 {#exported-functions}


没有导出供路由脚本使用的函数。


### 导出的 MI 函数 {#exported-mi-functions}


#### flat_rotate


它改变数据写入所用文件的名称。


名称：*flat_rotate*


参数：*无*


MI FIFO 命令格式：


```bash
opensips-cli -x mi flat_rotate
```


## 开发者指南 {#developer-guide}


本模块实现了 DB API。
<!-- CONTRIBUTORS -->

### 许可 {#license}

全部文档文件（即以 .md 为扩展名的文件）均按 Creative Common License 4.0 许可发布
