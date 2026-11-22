---
title: "pi_http 模块"
description: "本模块为 OpenSIPS 提供 HTTP 数据配置接口。"
---

## 管理指南 {#admin-guide}


### 概述 {#overview}


本模块为 OpenSIPS 提供 HTTP 数据配置（provisioning）接口。
它使用 OpenSIPS 内部的数据库 API，提供一种操作
OpenSIPS 各表内记录的简便方式。
本模块提供：
- 通过 OpenSIPS 的 db API 连接多个/不同数据库的能力；
（支持所有 OpenSIPS 数据库）；
- 通过 OpenSIPS API 执行数据输入校验的能力；
- 通过 MI 命令接口从 xml 框架重新加载配置，
从而在线重新配置界面布局的能力。

> [!NOTE]
> 使用 *db_text* 配置表时，
> 对 *db_text* 表所做的任何修改都不会
> 反映到实际的文本文件中。要强制把
> 缓存的表写出到磁盘，必须使用 db_text 的 MI 命令
> *dbt_dump*。


### 用法 {#usage}


数据配置界面的布局由外部 xml 文件控制
（参见 framework 参数）。
pi_http 模块的 examples 目录中
提供了一个框架 xml 文件示例。
可以使用 opensips-cli 命令生成一个简单的框架文件：


```c
opensips-cli pframework create
```


生成的框架将保存在 OpenSIPS 的配置目录中，
文件名为 pi_framework_sample。可配置表的列表将
基于 opensips-cli.cfg 的 "database_modules" 设置（如果存在），
否则将使用一组默认的可配置表。


### 框架 {#framework}


xml 框架文件组织为三个不同的块：


- 数据库连接定义块
- 表定义块
- 命令定义块


#### 数据库连接定义块 {#database-connection-definition-block}


每个到特定数据库的连接都必须在此定义，
并使用唯一的数据库连接 id。
连接参数按照所有使用数据库的 OpenSIPS 模块的
db_url 参数模式定义。


支持的数据库：
- berkeley
- flatstore
- http
- mysql
- oracle
- postgres
- text
- unixodbc
- virtual


#### 表定义块 {#table-definition-block}


通过 OpenSIPS 数据配置接口管理的每个表
都必须在此定义，并使用唯一的表 id。
对每个表，必须指定数据库连接 id。
每个表必须列出将由 OpenSIPS 数据配置接口
管理的所有列。
每个列必须具有唯一的字段名和类型。
每个列可以有一个校验标签，用于校验输入数据。


支持的列类型：


- DB_INT
- DB_BIGINT
- DB_DOUBLE
- DB_STRING
- DB_STR
- DB_DATETIME
  > [!NOTE]
  > 输入字段必须按
  > 'YEAR-MM-DD HH:MM:SS' 格式提供。

- DB_BLOB
- DB_BITMAP


支持的校验方法：


- IPV4 - 表示 IPv4 地址
- URI - 表示 SIP URI
- URI_IPV4HOST - 表示主机为 IPV4 的 SIP URI
- P_HOST_PORT - 表示 [proto:]host[:port]
- P_IPV4_PORT - 表示 [proto:]IPv4[:port]


#### 命令定义块 {#command-definition-block}


多个数据配置命令可以组合在一起。
每个组可以包含多个命令。
组中的每个命令定义必须指明其操作的表的
表 id，以及要执行的命令类型。


命令类型最多可以包含三种类型的列参数：


- 子句列
- 查询列
- 排序依据列


每个列参数必须定义列的名称
（必须与由表 id 标识的描述表中的字段名匹配）。
一个列可以接受一个强制值列表。
每个强制值都有一个 id（将在 Web 界面上显示）
以及将用于数据库操作的实际值。
子句列必须定义运算符。
以下是支持的运算符：
'<', '>', '=', '<=', '>=', '!='。


支持的数据库命令类型：


- DB_QUERY - 执行 SQL 查询
并支持三种类型的列：

  - clause：0 个或更多列
  - query：1 列
  - order：0 或 1 列
- DB_INSERT - 执行 SQL 插入
并支持一种类型的列：

  - query：1 个或更多列
- DB_DELETE - 执行 SQL 删除
并支持一种类型的列：

  - clause：1 个或更多列
- DB_UPDATE - 执行 SQL 更新
并支持两种类型的列：

  - clause：0 个或更多列
  - query：1 个或更多列
- DB_REPLACE - 执行 SQL 替换
并支持一种类型的列：

  - query：1 个或更多列


请注意，某些数据库支持的数据库命令类型
集合有限。


### 待办 {#to-do}


将来要添加的功能：


- 完整的订阅者数据配置（subscriber provisioning），带有自动的 ha1/ha1b 字段。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


以下模块必须在本模块之前加载：


- *httpd* 模块。


### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，必须安装
以下库或应用程序：


- *libxml2*


### 导出的参数 {#exported-parameters}


#### pi_http_root(string)


指定 pi HTTP 请求的根路径。
指向 OpenSIPS 数据配置 Web 界面的链接必须使用
以下模式构造：
http://[opensips_IP]:[opensips_mi_port]/[pi_http_root]


*默认值为 "pi"。*


```opensips title="设置 pi_http_root 参数"
...
modparam("pi_http", "pi_http_root", "opensips_pi")
...
```


#### framework(string)


指定 xml 框架描述文件的完整路径。


*没有默认值。该参数为必填。*


```opensips title="设置 framework 参数"
...
modparam("pi_http", "framework", "/usr/local/etc/opensips/pi_framework.xml")
...
```


#### pi_http_method(integer)


指定要使用的 HTTP 请求方法：


- 0 - 使用 GET HTTP 请求
- 1 - 使用 POST HTTP 请求


*默认值为 0。*


```opensips title="设置 pi_http_method 参数"
...
modparam("pi_http", "pi_http_method", 1)
...
```


### 导出的 MI 函数 {#exported-mi-functions}


#### pi_reload_tbls_and_cmds


从框架文件重新加载数据配置界面的布局。


名称：*pi_reload_tbls_and_cmds*


参数：无


MI FIFO 命令格式：


```bash
opensips-cli -x mi pi_reload_tbls_and_cmds
		
```
<!-- CONTRIBUTORS -->

### 许可证 {#license}

本项目的所有文档文件（即 .md 扩展名的文件）均以 Creative Common License 4.0 授权。
