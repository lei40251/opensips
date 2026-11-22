---
title: "db_sqlite 模块"
description: "本模块为 OpenSIPS 提供 SQLite 支持。它实现了 OpenSIPS 中定义的 DB API。"
sidebar: false
---

## 管理指南 {#admin-guide}


### 概述 {#overview}


本模块为 OpenSIPS 提供 SQLite 支持。它实现了 OpenSIPS 中定义的 DB API。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


本模块之前必须加载以下模块：


- *不依赖其他 OpenSIPS 模块*。


此外，本模块提供两种构造查询的方式。一种是在 OpenSIPS 创建预编译语句查询之后
使用 sqlite3_bind_* 函数。第二种方式仅直接使用 sqlite3_snprintf 函数把值打印到
OpenSIPS 创建的查询中。理论上第二种方式更快，并允许在同一时间向数据库发出更多查询，
因此默认启用这种方式。你只需取消 Makefile 中 SQLITE_BIND 一行的注释，即可使用
sqlite3_bind_* 接口。


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，必须安装以下库或应用程序：


- *libsqlite3-dev* - sqlite 的开发库。


### 导出的参数 {#exported-parameters}


#### alloc_limit (integer)


由于该库不支持返回查询行数的函数，因此该数值是通过 "count(*)" 查询获得的。
如果使用多个进程，就存在风险：由于 "count(*)" 查询和实际的 "select" 查询之间存在
时间差，结果查询的行数可能已经改变，所以如果行数更大就需要重新分配。
使用 *alloc_limit* 参数可以指定结果中已分配行数的增长基数。


*默认值为 10。*


```opensips title="设置 alloc_limit 参数"
...
modparam("db_sqlite", "alloc_limit", 25)
...
```


#### load_extension (string)


该参数启用扩展加载，类似于 sqlite3 中的 ".load" 功能，例如 sqlite3-pcre 这类启用 REGEX 函数的扩展。
要使用该功能，必须指定库路径（.so 文件）以及代表由 sqlite 库调用的函数的入口点
（更多内容参见 sqlite [load_extension](https://www.sqlite.org/capi3ref.html#sqlite3_load_extension)
官方文档），两者以 ";" 分隔。入口点参数可以省略，此时无需使用分隔符。


*默认不加载任何扩展。*


```opensips title="设置 load_extension 参数"
...
modparam("db_sqlite", "load_extension", "/usr/lib/sqlite3/pcre.so")
modparam("db_sqlite", "load_extension", "/usr/lib/sqlite3/pcre.so;sqlite3_extension_init")
...
```


#### busy_timeout (integer)


该参数为 SQLite 库设置默认的 busy_handler，当表被锁定时它会休眠指定的时间。
该处理函数会多次休眠，直到至少达到指定的 "busy_timeout" 时长（单位为毫秒）。
把该参数设置为小于或等于零的值会关闭所有 busy 处理函数。（更多内容参见
[SQLite 官方文档](https://www.sqlite.org/capi3ref.html#sqlite3_busy_timeout)）


*默认值为 500。*


```opensips title="设置 busy_timeout 参数"
...
modparam("db_sqlite", "busy_timeout", 5000)
...
```


#### exec_pragma (string)


该参数允许使用 "PRAGMA" 语句配置 SQLite 数据库，（更多内容参见
[SQLite 官方文档](https://sqlite.org/pragma.html)）要使用该功能，必须把 exec_pragma
参数值指定为 "pragma-name=pragma-value"。可以指定多个同名参数，它们会在每次数据库连接
时依次执行。如果参数名或语法不正确，SQLite 会忽略该参数，且不给出任何错误消息。


*默认不执行任何 PRAGMA 语句。*


```opensips title="设置 exec_pragma 参数"
...
modparam("db_sqlite", "exec_pragma", "journal_mode=wal")
modparam("db_sqlite", "exec_pragma", "synchronous=normal")
modparam("db_sqlite", "exec_pragma", "cache_size=-2000")
...
```


### 导出的函数 {#exported-functions}


没有可供配置文件使用的导出函数。


### 安装 {#installation}


由于依赖外部库，sqlite 模块默认不会被编译和安装。可以使用以下选项之一。


- 编辑 "Makefile"，从 "excluded_modules" 列表中移除 "db_sqlite"。
然后按标准流程安装 OpenSIPS："make all; make install"。
- 在命令行中使用：'make all include_modules="db_sqlite";
make install include_modules="db_sqlite"'。
<!-- CONTRIBUTORS -->

### 许可证 {#license}

本项目的所有文档文件（即 .md 扩展名的文件）均以 Creative Common License 4.0 授权。
