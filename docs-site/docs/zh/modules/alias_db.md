---
title: "ALIAS_DB 模块"
description: "ALIAS_DB 模块可作为通过 usrloc 实现用户别名的替代方案。其主要特点是不像用户位置那样存储所有相关数据，而是始终使用数据库进行查询（无内存缓存）。"
sidebar: false
---


## 管理指南 {#admin-guide}


### 概述 {#overview}


ALIAS_DB 模块可作为通过 usrloc 实现用户别名的替代方案。其主要特点是不像用户位置那样存储所有相关数据，而是始终使用数据库进行查询（无内存缓存）。


由于没有内存缓存，查询速度可能会下降，但数据配置更为容易。对于 MySQL 这类速度很快的数据库，速度损失可以降低。此外，在同一脚本中可以在不同的表上执行查询。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


在加载本模块之前，必须先加载以下模块：


- *数据库模块*（mysql、dbtext 等）。


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，必须安装以下库或应用程序：


- *无*。


### 导出的参数 {#exported-parameters}


#### db_url (str)


数据库 URL。


*默认值为 "mysql://opensipsro:opensipsro@localhost/opensips"。*


```opensips title="Set db_url parameter"
...
modparam("alias_db", "db_url", "dbdriver://username:password@dbhost/dbname")
...
```


#### user_column (str)


存储用户名的列的名称。


*默认值为 "username"。*


```opensips title="Set user_column parameter"
...
modparam("alias_db", "user_column", "susername")
...
```


#### domain_column (str)


存储用户所属域的列的名称。


*默认值为 "domain"。*


```opensips title="Set domain_column parameter"
...
modparam("alias_db", "domain_column", "sdomain")
...
```


#### alias_user_column (str)


存储别名用户名的列的名称。


*默认值为 "alias_username"。*


```opensips title="Set alias_user_column parameter"
...
modparam("alias_db", "alias_user_column", "auser")
...
```


#### alias_domain_column (str)


存储别名域的列的名称。


*默认值为 "alias_domain"。*


```opensips title="Set alias_domain_column parameter"
...
modparam("alias_db", "alias_domain_column", "adomain")
...
```


#### domain_prefix (str)


指定在执行查询之前，要从 R-URI 的域部分中去掉的前缀。


*默认值为 "NULL"。*


```opensips title="Set domain_prefix parameter"
...
modparam("alias_db", "domain_prefix", "sip.")
...
```


#### append_branches (int)


若别名解析出多个 SIP ID，则第一个替换 R-URI，其余的作为分支添加。


*默认值为 "0"（0 - 不添加分支；
1 - 添加分支）。*


```opensips title="Set append_branches parameter"
...
modparam("alias_db", "append_branches", 1)
...
```


### 导出的函数 {#exported-functions}


#### alias_db_lookup(table_name, [flags])


该函数取 R-URI 并进行查询，以判断其是否为别名。若它是某个本地用户的别名，则用该用户的 SIP URI 替换 R-URI。


若 R-URI 是别名且已被该用户的 SIP URI 替换，函数返回 TRUE。


各参数含义如下：


- *table_name (string)* - 用于查询别名的表的名称
- *flags (string, optional)* - 用于控制别名查询过程的字符标志位集合：
  - **d** - 在别名查询中不使用 URI 的域部分（仅按用户名查询）。默认情况下同时使用用户名和域。
  - **r** - 执行反向别名查询——查询映射到当前 URI 的别名（URI 到别名的转换）；通常，函数查询映射到该别名的 URI（别名到 URI 的转换）。


该函数可在 REQUEST_ROUTE、FAILURE_ROUTE 中使用。


```opensips title="alias_db_lookup() usage"
...
alias_db_lookup("dbaliases", "rd");
alias_db_lookup("dba_$(rU{s.substr,0,1})");
...
```


#### alias_db_find(table_name, input_uri, output_var, [flags])


该函数与 `alias_db_lookup()` 非常相似，但它不使用固定的输入（RURI）与输出（RURI），而是能从伪变量中取得输入的 SIP URI，并将结果同样写回伪变量。


该函数很有用，因为别名查询不影响请求本身（不修改 RURI），可在应答上下文中使用（因为它并非只依赖 RURI），也可用于 RURI 之外的其它 URI（To URI、From URI、自定义 URI）。


若找到并返回了任何别名映射，函数返回 TRUE。


各参数含义如下：


- *table_name (string)* - 用于查询别名的表的名称
- *input_uri (string)* - 要查询的 SIP URI
- *output_var (var)* - 用于存放 SIP URI 结果的变量
- *flags (string, optional)*（可选）- 用于控制别名查询过程的标志位集合
（基于字符的标志位）：

  - *d* - 在别名查询中不使用 URI 的域部分（仅按用户名查询）。默认情况下同时使用用户名和域。
  - *r* - 执行反向别名查询——查询映射到当前 URI 的别名（URI 到别名的转换）；通常，函数查询映射到该别名的 URI（别名到 URI 的转换）。


该函数可在 REQUEST_ROUTE、BRANCH_ROUTE、LOCAL_ROUTE、STARTUP_ROUTE、FAILURE_ROUTE 和 ONREPLY_ROUTE 中使用。


```opensips title="alias_db_find() usage"
...
# 执行反向别名查询并查找 FROM URI 对应的别名
alias_db_find("dbaliases", $fu, $avp(from_alias), "r");
...
```


## 常见问题 {#frequently-asked-questions}


**问：旧的 use_domain 参数怎么样了**


该全局参数（影响整个模块）已被按查询生效的参数（仅影响当前查询）取代。请参阅 alias_db_lookup() 和 alias_db_find() 函数中的 "d"（不使用域部分）标志位。


**问：如何报告缺陷？**


请遵循以下地址提供的指引：
[https://github.com/OpenSIPS/opensips/issues](https://github.com/OpenSIPS/opensips/issues)。
<!-- CONTRIBUTORS -->

### 许可证 {#license}

所有文档文件（即 .md 扩展名）均按 Creative Common License 4.0 许可发布。
