---
title: "db_postgres 模块"
description: "db_postgres 模块说明。"
sidebar: false
---

## 管理指南 {#admin-guide}


### 概述 {#overview}


模块说明。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


本模块之前必须加载以下模块：


- *不依赖其他 OpenSIPS 模块*。


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，必须安装以下库或应用程序：


- *PostgreSQL 库* - 例如 libpq5。
- *PostgreSQL 开发库* - 用于编译本模块（例如 libpq-dev）。


### 导出的参数 {#exported-parameters}


#### exec_query_threshold (integer)


如果查询耗时超过 'exec_query_threshold' 微秒，就会向日志设施写入告警消息。


*默认值为 0 - 禁用。*


```opensips title="设置 exec_query_threshold 参数"
...
modparam("db_postgres", "exec_query_threshold", 60000)
...
```


#### max_db_queries (integer)


可执行的数据库查询最大数量。如果该参数设置不当，则使用默认值。


*默认值为 2。*


```opensips title="设置 max_db_queries 参数"
...
modparam("db_postgres", "max_db_queries", 2)
...
```


#### timeout (integer)


PostgreSQL 库等待连接服务器和执行查询的秒数。如果在给定的超时时间内未能成功建立
连接，则连接失败。


> [!NOTE]
> 如果 timeout 为负值且连接未成功，OpenSIPS 会阻塞，
> 直到连接重新可用并成功建立。这是该库的默认行为，
> 也是新增此参数之前的行为。


*默认值为 5。*


```opensips title="设置 timeout 参数"
...
modparam("db_postgres", "timeout", 2)
...
```


#### use_tls (integer)


用于控制连接 Postgres 服务器时 SSL 支持使用方式的参数，如下所示：


- *use_tls=0*（默认）- 禁用 SSL 支持，不会尝试使用；
- *use_tls=1* 且 DB URL 中存在 "tls_domain" - 启用 SSL 支持，具体为 "require" 还是
"verify-ca"，取决于证书设置；
- *use_tls=1* 且 DB URL 中不存在 "tls_domain" - 以尽力而为模式（或 "prefer"）启用
SSL 支持；如果服务器支持则使用，否则回退到非 SSL 连接。


> [!WARNING]
> 设置此参数时不能使用 *tls_openssl* 模块。
> 如果需要 TLS/SSL 库，请改用 *tls_wolfssl* 模块。


设置此参数即可为 PostgreSQL 连接使用 TLS。要为特定连接启用 TLS，可以在相应
OpenSIPS 模块的 db_url 中使用 "tls_domain=*dom_name*" URL 参数。该参数应放在 URL
末尾的 '?' 字符之后。


使用此参数时，还必须确保已加载并正确配置 *tls_mgm*。有关 TLS 客户端域的更多信息，
请参阅该模块的文档。


> [!NOTE]
> 如果要使用此特性，TLS 域必须在配置文件中配置，*而不是*在数据库中。
> 如果要从数据库加载 TLS 证书，至少要在配置脚本中定义一个域，
> 用于初次连接数据库。


另外，*不能*为 *tls_mgm* 模块自身连接数据库启用 TLS。


*默认值为 **0**（未启用）*


```opensips title="设置 use_tls 参数"
...
modparam("tls_mgm", "client_domain", "dom1")
modparam("tls_mgm", "certificate", "[dom1]/etc/pki/tls/certs/opensips.pem")
modparam("tls_mgm", "private_key", "[dom1]/etc/pki/tls/private/opensips.key")
modparam("tls_mgm", "ca_list",     "[dom1]/etc/pki/tls/certs/ca.pem")
...
modparam("db_postgres", "use_tls", 1)
...
modparam("usrloc", "db_url", "postgres://root:1234@localhost/opensips?tls_domain=dom1")
...
```


### 导出的函数 {#exported-functions}


无


### 安装与运行 {#installation-and-running}


有关安装与运行的说明。
<!-- CONTRIBUTORS -->

### 许可证 {#license}

本项目的所有文档文件（即 .md 扩展名的文件）均以 Creative Common License 4.0 授权。
