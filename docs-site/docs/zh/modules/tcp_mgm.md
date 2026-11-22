---
title: "TCP 管理模块 (tcp_mgm)"
description: "本模块为 OpenSIPS 上所有 TCP 连接的细粒度管理提供可选的、基于 SQL 的支持。"
---

## 管理员指南 {#admin-guide}


### 概述 {#overview}


本模块为 OpenSIPS 上所有 TCP 连接的细粒度管理提供可选的、基于 SQL 的支持。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


必须至少加载一个 SQL 数据库模块（例如 "db_xxx"）。


#### 外部库或应用程序 {#external-libraries-or-applications}


无。


### 导出的参数 {#exported-parameters}


#### db_url (string)


SQL 数据库的必填 URL。


```opensips title="设置 db_url 参数"
modparam("tcp_mgm", "db_url", "mysql://opensips:opensipsrw@localhost/opensips")
```


#### db_table (string)


存放 TCP 路径（规则）的表名。


默认值为 *"tcp_mgm"*。


```opensips title="设置 db_table 参数"
modparam("tcp_mgm", "db_table", "tcp_mgm")
```


#### [column-name]_col (string)


为列 *"column-name"* 使用不同的名称。


```opensips title="设置 [column-name]_col 参数"
modparam("tcp_mgm", "connect_timeout_col", "connect_to")
```


### 导出的 MI 函数 {#exported-mi-functions}


#### tcp_reload


从 *tcp_mgm* 表重新加载所有 TCP 路径，且不会中断正在进行的流量。请注意，重新加载的规则不会立即作用于已有的 TCP 连接，而只作用于新建立的连接。


示例：


```bash
# 重新加载所有 TCP 路径
$ opensips-cli -x mi tcp_reload
"OK"
```
<!-- CONTRIBUTORS -->

### 许可 {#license}

本项目的所有文档文件（即 .md 扩展名的文件）均以 Creative Common License 4.0 授权。
