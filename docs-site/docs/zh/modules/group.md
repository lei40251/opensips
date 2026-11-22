---
title: "group 模块"
description: "本模块提供多种组成员关系检查方法的功能。"
---

## 管理指南 {#admin-guide}


### 概述 {#overview}


本模块提供多种组成员关系
检查方法的功能。


#### 严格成员关系检查 {#strict-membership-checking}


有一个数据库表，其中包含用户列表及
其所属的组。本模块提供了检查某个
特定用户是否属于某个特定组的能力。


不支持 DB 缓存，每次检查都涉及一次 DB 查询。


#### 基于正则表达式的检查 {#regular-expression-based-checking}


另一个数据库表包含正则表达式列表和
组 ID 列表。如果用户 URI 匹配该正则
表达式，则视为匹配。这种匹配类型可用于
获取用户所属的组 ID（通过 RE 匹配）。


出于性能原因（正则表达式求值），提供了
DB 缓存支持：表内容在启动时加载到内存，
并编译所有正则表达式。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


以下模块必须在本模块之前加载：


- 一个数据库模块，如 mysql、postgres 或 dbtext。
- 一个 AAA 模块，如 radius 或 diameter。


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，必须安装
以下库或应用程序：


- *无*。


### 导出的参数 {#exported-parameters}


#### db_url (string)


要使用的数据库表的 URL。


```opensips title="设置 db_url 参数"
...
modparam("group", "db_url", "mysql://username:password@dbhost/opensips")
...
```


#### table (string)


存放组及其成员严格定义的表
的名称。


*默认值为 "grp"。*


```opensips title="设置 table 参数"
...
modparam("group", "table", "grp_table")
...
```


#### user_column (string)


"table" 表中存放用户名的列的名称。


*默认值为 "username"。*


```opensips title="设置 user_column 参数"
...
modparam("group", "user_column", "user")
...
```


#### domain_column (string)


"table" 表中存放域的列的名称。


*默认值为 "domain"。*


```opensips title="设置 domain_column 参数"
...
modparam("group", "domain_column", "realm")
...
```


#### group_column (string)


"table" 表中存放组的列的名称。


*默认值为 "grp"。*


```opensips title="设置 group_column 参数"
...
modparam("group", "group_column", "grp")
...
```


#### use_domain (integer)


如果启用（设为非零值），则域也将用于
严格组匹配；否则只使用
用户名部分。


*默认值为 0（否）。*


```opensips title="设置 use_domain 参数"
...
modparam("group", "use_domain", 1)
...
```


#### re_table (string)


存放基于正则表达式的组定义的表
的名称。如果未定义表，则禁用
正则表达式支持。


*默认值为 "NULL"。*


```opensips title="设置 re_table 参数"
...
modparam("group", "re_table", "re_grp")
...
```


#### re_exp_column (string)


"re_table" 表中存放用于用户匹配的
正则表达式的列的名称。


*默认值为 "reg_exp"。*


```opensips title="设置 re_exp_column 参数"
...
modparam("group", "re_exp_column", "re")
...
```


#### re_gid_column (string)


"re_table" 表中存放组 ID 的列的名称。


*默认值为 "group_id"。*


```opensips title="设置 re_gid_column 参数"
...
modparam("group", "re_gid_column", "grp_id")
...
```


#### multiple_gid (integer) {#multiple_gid-integer}


如果启用（非零值），正则表达式匹配将
返回所有匹配该用户的组 ID；否则只返回
第一个。


*默认值为 "1"。*


```opensips title="设置 multiple_gid 参数"
...
modparam("group", "multiple_gid", 0)
...
```


#### aaa_url (string)


这是表示所用 AAA 协议以及该协议配置文件位置的 url。


```opensips title="设置 aaa_url 参数"
...
modparam("group", "aaa_url", "radius:/etc/radiusclient-ng/radiusclient.conf")
...
```


### 导出的函数 {#exported-functions}


#### db_is_user_in(uri, group)


该函数用于脚本中的组成员关系检查。如果给定 URI 中的
用户名是指定组的成员，函数返回 true，
否则返回 false。


参数含义如下：


- *uri (string)* - 一个 SIP URI，将使用其
用户名以及可选的域。可能的值：
	* "Request-URI" - 使用 Request-URI 的用户名和
	（可选的）域。


	* "To" - 使用 To 的用户名和（可选的）域。


	* "From" - 使用 From 的用户名和（可选的）域。


	* "Credentials" - 使用摘要凭据的用户名。


	* （默认） - 将给定的输入解析为 SIP URI
- *group (string)* - 要检查的组


该函数可在 REQUEST_ROUTE 和 FAILURE_ROUTE 中使用。


```opensips title="db_is_user_in 用法"
...
if (db_is_user_in("Request-URI", "ld")) {
	...
}
...
$avp(grouptocheck)="offline";

if (db_is_user_in("Credentials", $avp(grouptocheck))) {
	...
}
...
```


#### db_get_user_group(uri, output_avp)


该函数用于基于正则表达式的组成员关系检查，
使用 DB 支持。如果给定 "uri" 中的用户名
至少属于一个组，函数返回 true。


如果启用了 [multiple_gid](#multiple_gid-integer)，
所有匹配的组 ID 都将在 "output_avp" 中返回，
否则只返回第一个匹配的组 ID
（按 RDBMS 返回结果的逆序尝试记录）。


参数含义如下：


- *uri (string)* - 要与正则表达式
匹配的 SIP URI：
	* "Request-URI" - 使用 Request-URI
	* "To" - 使用 To URI。
	* "From" - 使用 From URI
	* "Credentials" - 使用摘要凭据的用户名
	和 realm。
	* （默认） - 将给定的输入解析为 SIP URI
- *output_avp (var)* - 匹配到的
组 ID 列表


该函数可在 REQUEST_ROUTE 和 FAILURE_ROUTE 中使用。


```opensips title="db_get_user_group 用法"
...
if (db_get_user_group("Request-URI", $avp(10))) {
    xdbg("User $ru belongs to the following groups: $(avp(10)[*])\n");
    ....
};
...
```


#### aaa_is_user_in(uri, group)


该函数使用 AAA 支持检查组成员关系。
如果给定 "uri" 中的用户名是指定组的成员，
函数返回 true，否则返回 false。


参数含义如下：


- *uri (string)* - 一个 SIP URI，将使用其
用户名以及可选的域，可以是以下之一：
	* "Request-URI" - 使用 Request-URI 的用户名和
	（可选的）域。
	* "To" - 使用 To 的用户名和（可选的）域。
	* "From" - 使用 From 的用户名和（可选的）域。
	* "Credentials" - 使用摘要凭据的用户名。
- *group (string)* - 要检查的组的名称。


该函数可在 REQUEST_ROUTE 中使用。


```opensips title="aaa_is_user_in 用法"
...
if (aaa_is_user_in("Request-URI", "ld")) {
	...
};
...
```
<!-- CONTRIBUTORS -->

### 许可证 {#license}

本项目的所有文档文件（即 .md 扩展名的文件）均以 Creative Common License 4.0 授权。
