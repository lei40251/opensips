---
title: "db_unixodbc 模块"
description: "本模块允许在 OpenSIPS 中使用 unixodbc 包。"
sidebar: false
---


## 管理指南 {#admin-guide}


### 概述 {#overview}


本模块允许在 OpenSIPS 中使用 unixodbc 包。它已在 mysql 和 odbc 连接器上测试过，但应该也能用于其他数据库。auth_db 模块可以正常工作。


更多信息请参见 [http://www.unixodbc.org/](http://www.unixodbc.org/) 项目网页。


要了解可通过 unixodbc 使用哪些数据库引擎，请参阅
[http://www.unixodbc.org/drivers.html](http://www.unixodbc.org/drivers.html)。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


以下模块必须在本模块之前加载：


- *不依赖其他 OpenSIPS 模块*。


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，必须安装以下库或应用程序：


- *无*。


### 导出的参数 {#exported-parameters}


#### auto_reconnect (int)


开启或关闭 auto_reconnect 模式。


*默认值为 "1"，表示已启用。*


```opensips title="设置 'auto_reconnect' 参数"
...
modparam("db_unixodbc", "auto_reconnect", 0)
...
```


#### use_escape_common (int)


使用内部 escape_common() 函数对查询中的值进行转义。
它会转义单引号 '''、双引号 '"'、反斜杠 '\' 以及 NULL 字符。


如果知道 ODBC 驱动将上述字符视为特殊字符（用于标记值的开始和结束、
转义其他字符等），则应启用此参数。它可以防止 SQL 注入。


*默认值为 "0"（0 = 禁用；1 = 启用）。*


```opensips title="设置 'use_escape_common' 参数"
...
modparam("db_unixodbc", "use_escape_common", 1)
...
```


### 导出的函数 {#exported-functions}


无


### 安装与运行 {#installation-and-running}


#### 安装 {#installing}


前提条件：应首先安装 unixodbc（或其他实现 odbc 标准的程序，如 iodbc）、
数据库以及正确的连接器。在 odbc.ini 文件中设置 DSN，在 odbcinst.ini
文件中设置连接器驱动。


#### 配置与运行 {#configuring-and-running}


在 opensips.conf 文件中添加以下行：


```opensips
....
loadmodule "/usr/local/lib/opensips/modules/db_unixodbc.so"
....
```


还应取消注释以下内容：


```opensips
....
loadmodule "/usr/local/lib/opensips/modules/auth.so"
loadmodule "/usr/local/lib/opensips/modules/auth_db.so"
modparam("usrloc", "db_mode", 2)
modparam("auth_db", "calculate_ha1", yes)
modparam("auth_db", "password_column", "password")
....
```


并设置 odbc.ini 中指定的 DSN，通过添加以下行将其写入 url：


```opensips
....
modparam("usrloc|auth_db", "db_url", 
    "unixodbc://opensips:opensipsrw@localhost/my_dsn")
....
```


将 my_dsn 替换为正确的值。


> [!TIP]
> 如果 unixodbc 无法连接到 mysql 服务器，请尝试用以下命令重启
> mysql 服务器：


```bash
shell>safe_mysqld --user=mysql --socket=/var/lib/mysql/mysql.sock
```


连接器在 /var/lib/mysql/mysql.sock 中查找套接字，而不是在
/tmp/mysql.sock 中


## 开发者指南 {#developer-guide}


本模块实现了 OpenSIPS DB API，以便被其他模块使用。
<!-- CONTRIBUTORS -->

### 许可证 {#license}


所有文档文件（即 .md 扩展名）均按 Creative Common License 4.0 许可发布。
