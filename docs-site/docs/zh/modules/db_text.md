---
title: "DB_TEXT 模块"
description: "本模块实现了一个基于文本文件的简化数据库引擎。OpenSIPS DB 接口可以用它替代其他数据库模块（如 MySQL）。"
sidebar: false
---


## 管理指南 {#admin-guide}


### 概述 {#overview}


本模块实现了一个基于文本文件的简化数据库引擎。OpenSIPS DB 接口可以用它替代
其他数据库模块（如 MySQL）。


本模块适用于演示环境或无法支持其他数据库模块的小型设备。它把所有数据都保存在
内存中，如果你要处理大量数据，可能会很快耗尽内存。此外，它并未实现全部标准数据库
功能（如 order by），只包含与 OpenSIPS 正常配合所需的最小功能


> [!NOTE]
> 时间戳以 time_t 结构的整型值打印。若在不支持此转换的系统中使用它，
> 将会失败（对此类情况的支持已列入待办清单）。


> [!NOTE]
> 即使在非缓存模式下，模块在数据变更后也不会写回硬盘。在此模式下，
> 模块会检查磁盘上相应文件是否已更改，并重新加载它。写入磁盘发生在
> OpenSIPS 关闭时。


#### db_text 引擎的设计 {#design-of-db_text-engine}


db_text 数据库系统的架构：


- 一个数据库由本地文件系统中的一个目录表示。
> [!NOTE]
> 在 OpenSIPS 中使用 *db_text* 时，
> 模块的数据库 URL 必须是表文件所在目录的路径，并以
> "text://" 为前缀，例如
> "text:///var/dbtext/opensips"。若 "text://" 之后没有
> "/"，则会在数据库路径开头插入
> "CFG_DIR/"。因此，你要么提供数据库目录的绝对路径，
> 要么提供相对于 "CFG_DIR"
> 目录的路径。
- 一张表由数据库目录中的一个文本文件表示。


#### db_text 表的内部格式 {#internal-format-of-a-db_text-table}


第一行是列的定义。每一列必须按如下方式声明：


- 列名不得包含空白字符。
- 列定义的格式为：
*name(type,attr)*。
- 两个列定义之间必须有一个空白字符，例如
"first_name(str) last_name(str)"。
- 列的类型可以是：
   - *int* - 整数。
   - *double* - 带两位
   小数的实数。
   - *str* - 最大 4KB 的字符串。
- 列可以具有以下属性之一：
   - *auto* - 仅用于 'int' 列，
   如果查询中未提供该字段的值，则将该列中的最大值递增后
   存入该字段。
   - *null* - 允许列字段接受空值。

   若未设置任何属性，则该列的字段不能有
   空值。
- 其他每一行都是一条数据行。行以
"\n" 结束。
- 字段之间以 ":" 分隔。
- 两个 ':' 之间（或 ':' 与行首/行尾之间）没有值
表示"空值"。
- 字符串中的以下字符必须转义："\n"、
"\r"、"\t"、":"。
- *0* —— 零值也必须转义。


```c title="Sample of a db_text table"
...
id(int,auto) name(str) flag(double) desc(str,null)
1:nick:0.34:a\tgood\: friend
2:cole:-3.75:colleague
3:bob:2.50:
...
```


```c title="Minimal OpenSIPS location db_text table definition"
...
username(str) contact(str) expires(int) q(double) callid(str) cseq(int)
...
```


```c title="Minimal OpenSIPS subscriber db_text table example"
...
username(str) password(str) ha1(str) domain(str) ha1b(str)
suser:supasswd:xxx:alpha.org:xxx
...
```


#### 现有局限 {#existing-limitations}


该数据库接口不支持带有默认值的数据插入。数据库模板中指定的所有此类值
都会被忽略。因此在插入操作中，建议为每一列指定全部数据。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


以下模块必须在本模块之前加载：


- *无*。


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，必须安装以下库或应用程序：


- *无*。


### 导出的参数 {#exported-parameters}


#### db_mode (integer)


设置缓存模式（0）或非缓存模式（1）。在缓存模式下，数据在启动时加载。
在非缓存模式下，每次请求某张表时，模块都会检查磁盘上相应文件是否已
更改，若是则从文件重新加载该表。


*默认值为 "0"。*


```opensips title="Set db_mode parameter"
...
modparam("db_text", "db_mode", 1)
...
```


#### buffer_size (integer)


用于读取文本文件的缓冲区大小。


*默认值为 "4096"。*


```opensips title="Set buffer_size parameter"
...
modparam("db_text", "buffer_size", 8192)
...
```


### 导出的函数 {#exported-functions}


*无*。


### 导出的 MI 函数 {#exported-mi-functions}


#### dbt_dump


把修改过的表写回硬盘。


名称：*dbt_dump*。


参数：无


MI FIFO 命令格式：


```bash
opensips-cli -x mi dbt_dump
```


#### dbt_reload


使 db_text 模块从磁盘重新加载已缓存的表。取决于参数，它可以是整个缓存、
指定的数据库或单张表。
若任何表无法从磁盘重新加载——保留旧版本并报告错误。


名称：*dbt_reload*。


参数：


- *db_name*（可选）- 要重新加载的数据库名。
- *table_name*（可选，但不能在没有
db_name 参数的情况下出现）- 要重新加载的特定表。


MI FIFO 命令格式：


```bash
opensips-cli -x mi dbt_reload
```


```bash
opensips-cli -x mi dbt_reload /path/to/dbtext/database
```


```bash
opensips-cli -x mi dbt_reload /path/to/dbtext/database table_name
```


### 安装与运行 {#installation-and-running}


编译本模块并加载它来替代 mysql 或其他 DB 模块。


> [!WARNING]
> 在 OpenSIPS 中使用 *db_text* 时，
> 模块的数据库 URL 必须是表文件所在目录的路径，
> 并以 "text://" 为前缀，例如
> "text:///var/dbtext/opensips"。若 "text://" 之后没有 "/"，
> 则会在数据库路径开头插入 "CFG_DIR/"。因此，你要么提供
> 数据库目录的绝对路径，要么提供相对于
> "CFG_DIR" 目录的路径。


```opensips title="Load the db_text module"
...
loadmodule "/path/to/opensips/modules/db_text.so"
...
modparam("module_name", "database_URL", "text:///path/to/dbtext/database")
...
```


#### 在基础 OpenSIPS 配置中使用 db_text {#using-db_text-with-basic-opensips-configuration}


以下是最重要表的定义，以及一个将 db_text 与 OpenSIPS 配合使用的基础
配置文件。表结构可能随时间变化，你需要相应调整下面的示例。


你必须手工向 'subscriber' 表填充用户配置，
才能使用鉴权。要使用所给的配置文件，表文件必须放在 '/tmp/opensipsdb' 目录中。


```c title="Definition of 'subscriber' table (one line)"
...
username(str) domain(str) password(str) first_name(str) last_name(str) phone(str) email_address(str) datetime_created(int) datetime_modified(int) confirmation(str) flag(str) sendnotification(str) greeting(str) ha1(str) ha1b(str) perms(str) allow_find(str) timezone(str,null) rpid(str,null)
...
```


```c title="Definition of 'location' and 'aliases' tables (one line)"
...
username(str) domain(str,null) contact(str,null) received(str) expires(int,null) q(double,null) callid(str,null) cseq(int,null) last_modified(str) flags(int) user_agent(str) socket(str) 
...
```


```c title="Definition of 'version' table and sample records"
...
table_name(str) table_version(int)
subscriber:3
location:6
aliases:6
...
```

## 示例 {#samples}

[samples](https://github.com/OpenSIPS/opensips/tree/3.6/modules/db_text/samples)


## 开发者指南 {#developer-guide}


加载模块之后，你就可以使用 OpenSIPS DB 接口所规定的 API。
<!-- CONTRIBUTORS -->

### 许可证 {#license}

所有文档文件（即扩展名为 .md 的文件）均按 Creative Common License 4.0 授权
