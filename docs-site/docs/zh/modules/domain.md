---
title: "domain 模块"
description: "Domain 模块实现了基于 domain 表的检查，用于判定 URI 的主机部分是否为本地域。"
---


## 管理指南 {#admin-guide}


### 概述 {#overview}


Domain 模块实现了基于 domain 表的检查，用于判定
URI 的主机部分是否为"本地"（local）
域。"本地"域是指该代理
负责的域。


Domain 模块根据模块参数 `db_mode` 的取值
以缓存或非缓存模式运行。
在缓存模式下，domain 模块在模块加载时
将 domain 表的内容读入
缓存内存。此后只有在对模块下达 domain_reload fifo 命令时，
才会重新读取 domain 表。因此，
对 domain 表的任何改动都必须在之后执行
"domain_reload" 命令，才能使其在
模块行为中生效。在非缓存模式下，domain 模块始终查询
数据库中的 domain 表。


缓存使用哈希表实现。哈希表的大小
由 domain_mod.h 中定义的 HASH_SIZE 常量给出。
其"出厂默认"值为 128。


### 依赖 {#dependencies}


本模块依赖以下模块（换言之，
列出的模块必须在本模块之前加载）：


- *database* —— 任意数据库模块


### 导出的参数 {#exported-parameters}


#### db_url (string)


这是要使用的数据库的 URL。


默认值为
"mysql://opensipsro:opensipsro@localhost/opensips"


```opensips title="Setting db_url parameter"
modparam("domain", "db_url", "mysql://ser:pass@db_host/ser")
```


#### db_mode (integer)


数据库模式：0 表示非缓存，1 表示缓存。


默认值为 0（非缓存）。


```opensips title="db_mode example"
modparam("domain", "db_mode", 1)   # 使用缓存模式
```


#### domain_table (string)


包含该代理所负责的本地域名称的表名。
本地用户的 sip uri 中的主机部分
必须等于这些域之一。


默认值为 "domain"。


```opensips title="Setting domain_table parameter"
modparam("domain", "domain_table", "new_name")
```


#### domain_col (string)


domain 表中包含域的列名。


默认值为 "domain"。


```opensips title="Setting domain_col parameter"
modparam("domain", "domain_col", "domain_name")
```


#### attrs_col (string)


domain 表中包含属性的列名。


默认值为 "attrs"。


```opensips title="Setting attrs_col parameter"
modparam("domain", "attrs_col", "attributes")
```


#### accept_subdomain_col (string)


domain 表中 "accept_subdomain" 列的名称。
该列为正数表示该域接受子域。
值为 0 表示不接受。


默认值为 "accept_subdomain"。


```opensips title="Setting accept_subdomain_col parameter"
modparam("domain", "accept_subdomain_col", "has_subdomain")
```


### 导出的函数 {#exported-functions}


#### is_from_local([attrs_var])


基于 domain 表检查 From 头域 uri 的主机部分
是否属于该代理负责的本地域之一。
该参数是可选的，若提供，它应为一个可写
变量，将被填充以来自
数据库的属性。


该函数可用于 REQUEST_ROUTE。


```opensips title="is_from_local usage"
...
if (is_from_local()) {
	...
};
...
if (is_from_local($var(attrs))) {
	xlog("Domain attributes are $var(attrs)\n");
	...
};
...
```


#### is_uri_host_local([attrs_var])


若在路由块或失败路由块中调用，则基于
domain 表检查 Request-URI 的主机部分
是否属于该代理负责的本地域之一。
若在分支路由中调用，则针对第一个分支的 URI
主机部分进行测试，因此该分支必须已在调用
is_uri_host_local() 之前
被追加到事务中。
该参数是可选的，若提供，它应为一个可写
变量，将被填充以来自
数据库的属性。


该函数可用于 REQUEST_ROUTE、FAILURE_ROUTE、
BRANCH_ROUTE。


```opensips title="is_uri_host_local usage"
...
if (is_uri_host_local()) {
	...
};
...
if (is_uri_host_local($var(attrs))) {
	xlog("Domain attributes are $var(attrs)\n");
	...
};
```


#### is_domain_local(domain, [attrs_var])


该函数检查第一个参数中包含的域是否为本地域。


该函数是 is_from_local()
和 is_uri_host_local() 函数的通用形式，能够完全
替代它们，并且还扩展了它们，允许域
取自上述任一来源。
存在以下等价关系：


- is_domain_local($rd) 与 is_uri_host_local() 相同
- is_domain_local($fd) 与 is_from_local() 相同


参数：


- *domain* (string)
- *attrs_var* (var, optional) - 一个可写
变量，将被填充以来自
数据库的属性。


该函数可用于 REQUEST_ROUTE、FAILURE_ROUTE、
BRANCH_ROUTE。


```opensips title="is_domain_local usage"
...
if (is_domain_local($rd)) {
	...
};
if (is_domain_local($fd)) {
	...
};
if (is_domain_local($avp(some_avp_alias))) {
	...
};
if (is_domain_local($avp(850))) {
	...
};
if (is_domain_local($avp(some_avp))) {
	...
};
if (is_domain_local($avp(some_avp), $avp(attrs))) {
	xlog("Domain attributes are $avp(attrs)\n");
	...
};
...
```


### 导出的 MI 函数 {#exported-mi-functions}


#### domain_reload


使 domain 模块将 domain 表的内容重新读取
到缓存内存中。


名称：*domain_reload*


参数：*无*


MI FIFO 命令格式：


```bash
opensips-cli -x mi domain_reload
```


#### domain_dump


使 domain 模块导出其缓存内存中的
哈希索引与域名。


名称：*domain_dump*


参数：*无*


MI FIFO 命令格式：


```bash
opensips-cli -x mi domain_dump
```


### 已知限制 {#known-limitations}


在 domain 列表更新上存在一种不太可能发生的竞态条件。若某个
进程正在使用某张表，而该表同时通过 FIFO 被重载两次，
则第二次重载会删除
该进程仍在使用中的原表。


## 开发者指南 {#developer-guide}


本模块提供了 is_domain_local API
函数供其他 OpenSIPS 模块使用。


### 可用函数 {#available-functions}


#### is_domain_local(domain)


检查以 str* 参数给出的域是否为本地域。


若域为本地域，该函数返回 1；若
域不是本地域或发生错误，则返回 -1。
<!-- CONTRIBUTORS -->

### 许可 {#license}

所有文档文件（即 .md 扩展名的文件）均以 Creative Common License 4.0 授权。
