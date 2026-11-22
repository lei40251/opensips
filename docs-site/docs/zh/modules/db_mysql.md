---
title: "DB_MYSQL 模块"
description: "本模块为 OpenSIPS 提供 MySQL 连接能力，实现了 OpenSIPS 中定义的 DB API。"
---


## 管理指南 {#admin-guide}


### 概述 {#overview}


本模块为 OpenSIPS 提供 MySQL 连接能力。它实现了 OpenSIPS 中定义的 DB API。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


以下模块必须在本模块之前加载：


- *如果定义了 [use_tls](#use_tls-integer)，则还需要加载 **tls_mgm** 模块*。


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，必须安装以下库或应用程序：


- *libmysqlclient-dev*——mysql-client 的开发库。


### 导出的参数 {#exported-parameters}


#### exec_query_threshold (integer)


如果查询耗时超过 'exec_query_threshold' 微秒，则会向日志设施写入警告消息。


*默认值为 0——表示禁用。*


```opensips title="Set exec_query_threshold parameter"
...
modparam("db_mysql", "exec_query_threshold", 60000)
...
```


#### timeout_interval (integer)


连接尝试（读或写请求）被中止的时间间隔。该值会按三倍计算，因为驱动在放弃之前会进行多次重试。


在 "5.1.12"、"5.0.25" 和 "4.1.22" 之前的驱动版本上，读超时参数会被忽略。在 "5.1.12" 和 "5.0.25" 之前的版本上，写超时参数会被忽略，"4.1" 发行版则完全不支持该参数。


*默认值为 2（6 秒）。*


```opensips title="Set timeout_interval parameter"
...
modparam("db_mysql", "timeout_interval", 2)
...
```


#### max_db_queries (integer)


因连接问题导致查询失败时，执行该查询的最大重试次数。如果该参数设置不当，则会被设为默认值。


*默认值为 2。*


```opensips title="Set max_db_queries parameter"
...
modparam("db_mysql", "max_db_queries", 2)
...
```


#### max_db_retries (integer)


数据库连接的最大重试次数。如果该参数设置不当，则会被设为默认值。


*默认值为 3。*


```opensips title="Set max_db_retries parameter"
...
modparam("db_mysql", "max_db_retries", 2)
...
```


#### ps_max_col_size (integer)


使用预处理语句取回数据时，单个列数据的最大尺寸。对变长数据尤其重要，例如 CHAR、BLOB 等。


> [!NOTE]
> 若某列的数据超过该限制，其值将被静默截断以适配缓冲区，且不会报告任何错误！


*默认值为 *1024（字节）*。*


```opensips title="Set ps_max_col_size parameter"
...
modparam("db_mysql", "ps_max_col_size", 4096)
...
```


#### use_tls (integer) {#use_tls-integer}


设置该参数后即可对 MySQL 连接使用 TLS。要为某个特定连接启用 TLS，可以在相应 OpenSIPS 模块的 db_url 中使用 "**tls_domain=**dom_name" URL 参数。该参数应放在 URL 中 **'?'** 字符之后的末尾位置。此外，查询字符串还可以包含 "**tls_opts=**PKEY,CERT,CA,CA_DIR,CIPHERS" CSV 参数，用于控制/限制传递给 TLS 库的 TLS 选项数量。


使用该参数时，还必须确保 *tls_mgm* 已加载并正确配置。关于 TLS 客户端域的更多信息，请参阅该模块的文档。


注意，如果要使用此功能，TLS 域必须在配置文件中配置，而*不能*在数据库中配置。如果你从数据库加载 TLS 证书，则至少必须在配置脚本中定义一个域，用于与数据库建立初始连接。


此外，你*不能*为 *tls_mgm* 模块自身到数据库的连接启用 TLS。


*默认值为 **0**（未启用）*


```opensips title="Set the use_tls parameter"
...
modparam("tls_mgm", "client_domain", "dom1")
modparam("tls_mgm", "certificate", "[dom1]/etc/pki/tls/certs/opensips.pem")
modparam("tls_mgm", "private_key", "[dom1]/etc/pki/tls/private/opensips.key")
modparam("tls_mgm", "ca_list",     "[dom1]/etc/pki/tls/certs/ca.pem")
...
modparam("db_mysql", "use_tls", 1)
...
modparam("usrloc", "db_url", "mysql://root:1234@localhost/opensips?tls_domain=dom1")
...
modparam("usrloc", "db_url", "mysql://root:1234@localhost/opensips?tls_domain=dom1&tls_opts=PKEY,CERT,CA,CA_DIR,CIPHERS")
...
```


### 导出的函数 {#exported-functions}


没有导出供配置文件使用的函数。


### 安装 {#installation}


由于依赖一个外部库，mysql 模块默认不会被编译和安装。你可以使用下列选项之一。


- 编辑 "Makefile"，从 "excluded_modules" 列表中移除 "db_mysql"。然后按标准流程安装 OpenSIPS："make all; make install"。
- 在命令行中使用：'make all include_modules="db_mysql"; make install include_modules="db_mysql"'。


### 导出的事件 {#exported-events}


#### E_MYSQL_CONNECTION


当 MySQL 连接丢失或恢复时会触发该事件。


参数：


- *url*——由 *db_url* 参数指定的连接 URL。
- *status*——若连接恢复则为 *connected*，若连接丢失则为 *disconnected*。
<!-- CONTRIBUTORS -->

### 许可 {#license}

全部文档文件（即以 .md 为扩展名的文件）均按 Creative Common License 4.0 许可发布
