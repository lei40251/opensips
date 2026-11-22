---
title: "speeddial 模块"
description: "本模块提供服务器端的缩位拨号功能。"
---


## 管理指南 {#admin-guide}


### 概述 {#overview}


本模块提供服务器端的缩位拨号功能。用户可以把由短号码（2 位数字）和 SIP 地址组成的记录对存入 OpenSIPS 的表中，之后只要拨打这两位数字，就能呼叫与之关联的 SIP 地址。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


在使用本模块之前必须先加载以下模块：


- *数据库模块（mysql、dbtext 等）*。


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，必须安装以下库或应用程序：


- *无*。


### 导出的参数 {#exported-parameters}


#### db_url (string)


保存缩位拨号记录表的数据库的 URL。


*默认值为 mysql://opensipsro:opensipsro@localhost/opensips。*


```opensips title="设置 db_url 参数"
...
modparam("speeddial", "db_url", "mysql://user:xxx@localhost/db_name")
...
```


#### user_column (string)


存储缩位拨号记录属主用户名的列名。


*默认值为 "username"。*


```opensips title="设置 user_column 参数"
...
modparam("speeddial", "user_column", "userid")
...
```


#### domain_column (string)


存储缩位拨号记录属主域的列名。


*默认值为 "domain"。*


```opensips title="设置 domain_column 参数"
...
modparam("speeddial", "domain_column", "userdomain")
...
```


#### sd_user_column (string)


存储短拨号地址用户部分的列名。


*默认值为 "sd_username"。*


```opensips title="设置 sd_user_column 参数"
...
modparam("speeddial", "sd_user_column", "short_user")
...
```


#### sd_domain_column (string)


存储短拨号地址域的列名。


*默认值为 "sd_domain"。*


```opensips title="设置 sd_domain_column 参数"
...
modparam("speeddial", "sd_domain_column", "short_domain")
...
```


#### new_uri_column (string)


包含用于替换短拨号 URI 的 URI 的列名。


*默认值为 "new_uri"。*


```opensips title="设置 new_uri_column 参数"
...
modparam("speeddial", "new_uri_column", "real_uri")
...
```


#### domain_prefix (string)


如果属主域（From URI 中的域）以该参数的值开头，则在执行短号码查询之前会先剥除该前缀。


*默认值为 NULL。*


```opensips title="设置 domain_prefix 参数"
...
modparam("speeddial", "domain_prefix", "tel.")
...
```


#### use_domain (int)


该参数指定在查询缩位拨号记录时是否使用域（0 - 不使用域，1 - 使用 From URI 中的域，2 - 同时使用 From URI 和请求 URI 中的域）。


*默认值为 0。*


```opensips title="设置 use_domain 参数"
...
modparam("speeddial", "use_domain", 1)
...
```


### 导出的函数 {#exported-functions}


#### sd_lookup(table [, owner])


该函数在 'table' 中查询 R-URI 中的短拨号号码，并用关联的地址替换 R-URI。


参数含义如下：


- *table* (string) - 存储缩位拨号记录的表的名称。
- *owner* (string) - 短拨号码属主的 SIP URI。若未提供，则使用 From 头域中的 URI。


该函数可在 REQUEST_ROUTE 中使用。


```opensips title="sd_lookup 用法"
...
# 'speed_dial' 是 opensips 数据库脚本创建的默认表名
if($ru=~"sip:[0-9]{2}@.*")
	sd_lookup("speed_dial");
# 使用鉴权用户名
if($ru=~"sip:[0-9]{2}@.*")
	sd_lookup("speed_dial", "sip:$au@$fd");
...
```


## 示例 {#samples}

[samples](https://github.com/OpenSIPS/opensips/tree/3.6/modules/speeddial/samples)
<!-- CONTRIBUTORS -->

### 许可证 {#license}

本项目的所有文档文件（即 .md 扩展名的文件）均以 Creative Common License 4.0 授权。
