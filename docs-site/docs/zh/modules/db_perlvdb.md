---
title: "DB_PERLVDB 模块"
description: "Perl 虚拟数据库（VDB）为 OpenSIPS 的数据库访问提供虚拟化框架，它本身不处理特定的数据库引擎，而是让用户把数据库请求转发给任意的 Perl 函数。"
---


## 管理指南 {#admin-guide}


### 概述 {#overview}


Perl 虚拟数据库（Perl Virtual Database，VDB）为 OpenSIPS 的数据库访问提供虚拟化框架。它本身不处理特定的数据库引擎，而是让用户把数据库请求转发给任意的 Perl 函数。


本模块不能「开箱即用」。用户必须为客户端模块提供相应的功能。可选方案见下文。


本模块可用于所有当前需要数据库访问的 OpenSIPS 模块。支持转发插入、更新、查询和删除操作。


各模块可通过 db_url 参数将 db_perlvdb 模块配置为数据库后端：


```opensips
modparam("acc", "db_url", "perlvdb:OpenSIPS::VDB::Adapter::AccountingSIPtrace")
```


该配置告诉 acc 模块应使用 db_perlvdb 模块，而后者又会使用 Perl 类 OpenSIPS::VDB::Adapter::AccountingSIPtrace 来转发数据库请求。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


以下模块必须在本模块之前加载：


- *perl* -- Perl 模块


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，必须安装以下库或应用程序：


- *无*（除 perl 模块文档中提到的以外）。


### 导出参数 {#exported-parameters}


*无*。


### 导出函数 {#exported-functions}


*无*。


## 开发者指南 {#developer-guide}


### 引言 {#introduction}


OpenSIPS 使用数据库 API 来处理大量不同类型数据的请求。支持四种主要操作：


- 查询
- 插入
- 更新
- 删除


本模块把这些数据库请求转发给用户实现的 Perl 函数。


### Base class OpenSIPS::VDB


客户端模块必须配置为结合某个 Perl 类来使用 db_perlvdb 模块，由该类提供这些函数。所配置的类需要继承基类 `OpenSIPS::VDB`。


派生类必须实现所需函数 "query"、"insert"、"update" 和/或 "delete"。由客户端模块指定所需的函数。要查明某个模块调用了哪些函数，可以用 `OpenSIPS::VDB::Adapter::Describe` 类对其进程进行评估，该类会记录入站请求（但并不提供任何真实功能）。


虽然用户可以直接在派生自 OpenSIPS::VDB 的类中实现所需功能，但建议把实现拆分为一个 Adapter（负责将关系型结构化参数转换为纯 Perl 函数参数），并增加一个虚拟表（VTab）以转发到底层技术。


### 数据类型 {#data-types}


在介绍本模块更高层的概念之前，先简要说明所用的数据类型。OpenSIPS 的 Perl 库包含若干必须在本模块中使用的数据类型：


#### OpenSIPS::VDB::Value


一个值包含一个数据类型标志和一个值。合法的数据类型有 DB_INT、DB_DOUBLE、DB_STRING、DB_STR、DB_DATETIME、DB_BLOB、DB_BITMAP。可用如下方式创建新变量


```perl
my $val = new OpenSIPS::VDB::Value(DB_STRING, "foobar");
```


Value 对象包含 type() 和 data() 方法，用于获取或设置类型与数据属性。


#### OpenSIPS::VDB::Pair


Pair 类派生自 Value 类，并额外包含一个列名（键）。可用如下方式创建新变量


```perl
my $pair = new OpenSIPS::VDB::Pair("foo", DB_STRING, "bar");
```


其中 foo 是键，bar 是值。除 Value 类的方法外，它还有 key() 方法，用于获取或设置键属性。


#### OpenSIPS::VDB::ReqCond


ReqCond 类用于选择条件，派生自 Pair 类。它额外包含一个运算符属性。可用如下方式创建新变量


```perl
my $cond = new OpenSIPS::VDB::ReqCond("foo", ">", DB_INT, 5);
```


其中 foo 是键，"greater" 是运算符，5 是用于比较的值。除 Pair 类的方法外，它还有 op() 方法，用于获取或设置运算符属性。


#### OpenSIPS::VDB::Column


该类表示列定义或数据库表结构。它包含一个存放列名的数组和一个存放列类型的数组。两个数组长度必须相同。可用如下方式创建新变量


```perl
my @types = { DB_INT, DB_STRING };
my @names = { "id", "vals" };
my $cols = new OpenSIPS::VDB::Column(\@types, \@names);
```


该类包含 type() 和 name() 方法，用于获取或设置类型与名称数组。


#### OpenSIPS::VDB::Result


Result 类表示查询结果。它包含一个表结构（Column 类）和一个行数组，其中每行都是一个 Value 数组。可使用对象方法 coldefs() 和 rows() 获取和设置对象属性。


### 适配器 {#adapters}


适配器应用于把关系型结构化的数据库请求转换为纯 Perl 函数参数。例如 alias_db 函数 alias_db_lookup 接受一个 user/host 对，并把它转换为另一个 user/host 对。Alias 适配器把 ReqCond 数组转换为两个独立的标量，用作 VTab 调用的参数。


适配器类必须继承 OpenSIPS::VDB 基类，并可以提供名为 insert、update、replace、query 和/或 delete 的一个或多个函数，具体取决于要与该适配器一起使用的模块。像 alias_db 这样的模块只需要 query 函数，而其他模块（如 siptrace）只依赖插入操作。


#### 函数参数 {#function-parameters}


所实现的函数必须处理正确的数据类型。本节列出参数类型与返回类型。


- *insert()* 接收一个 OpenSIPS::VDB::Pair 对象数组。
它应返回一个整型值。


- *replace()* 接收一个 OpenSIPS::VDB::Pair 对象数组。
该函数目前未被任何公开可用的模块使用。
它应返回一个整型值。


- *delete()* 接收一个 OpenSIPS::VDB::ReqCond 对象数组。
它应返回一个整型值。


- *update()* 接收一个 OpenSIPS::VDB::ReqCond 对象数组
（要更新哪些行）和一个 OpenSIPS::VDB::Pair 对象数组
（新数据）。
它应返回一个整型值。


- *query()* 接收一个 OpenSIPS::VDB::ReqCond 对象数组
（要选择哪些行）、一个字符串数组（要返回哪些列名）
以及一个用于指定排序列的字符串。
它应返回一个 OpenSIPS::VDB::Result 类型的对象。


### VTabs


VTab（虚拟表）为适配器提供具体的实现。例如 Alias 适配器调用带两个参数（user、host）的函数，并期望返回一个哈希，其中包含 username 和 domain 两个元素，或者返回 undef（未找到结果时）。Alias 适配器的一个示例 VTab 实现用一个包含别名数据的 Perl 哈希演示了该技术。


标准的 Adapter/VTab 模式让用户在实现 VTab 时有三种选择：


- *单个函数*。当一个函数被用作虚拟表时，它的第一个参数是操作名（insert、replace、update、query、delete）。该函数可以在主命名空间中实现。


- *包/类*。所定义的类必须有一个 init() 函数。它会在该 VTab 的第一次调用期间被调用。此外，该包还必须定义所需的函数 insert、replace、update、delete 和/或 query。这些函数会在函数上下文中调用（第一个参数是类名）。


- *对象*。所定义的类必须有一个 new() 函数，它返回对新创建对象的引用。该对象需要定义所需的函数 insert、replace、update、delete 和/或 query。这些函数会在方法上下文中调用（第一个参数是对该对象的引用）。
<!-- CONTRIBUTORS -->

### 许可 {#license}

所有文档文件（即 .md 扩展名）均按 Creative Common License 4.0 授权。
