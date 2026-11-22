---
title: "userblacklist 模块"
description: "userblacklist 模块允许 OpenSIPS 按用户维护黑名单，并将数据存于数据库表中，通过查询判断请求 URI 的用户是否被列入黑名单。"
---


## 管理指南 {#admin-guide}


### 概述 {#overview}


userblacklist 模块允许 OpenSIPS 按用户维护黑名单。
该信息存储在数据库表中，通过查询该表来判断
某个号码（更准确地说，是请求 URI 的用户部分）是否被列入黑名单。


本模块提供的另一项功能是处理全局黑名单。这些列表在启动时
加载到内存中，因此相比 userblacklist 的情形具有更好的性能。
这些全局黑名单适用于仅允许呼叫某些国际目的地，
即阻止所有未被加入白名单的号码。
由于也支持白名单，它们还可用于防止重要号码被列入黑名单。
例如，这可用于防止客户将紧急呼叫号码或
服务热线列入黑名单。


本模块导出两个函数 *check_blacklist*
与 *check_user_blacklist* 供配置文件使用。
此外，它还提供了一个 FIFO 函数用于重新加载全局
黑名单缓存。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


本模块依赖以下模块（换言之，
列出的模块必须在加载本模块之前加载）：


- *database* -- 任意数据库模块


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，
必须安装以下库或应用程序：


- *无*


### 导出的参数 {#exported-parameters}


#### db_url (string)


指向包含路由数据的数据库的 URL。


*默认值为 "mysql://opensipsro:opensipsro@localhost/opensips"。*


```opensips title="Set db_url parameter"
...
modparam("userblacklist", "db_url", "dbdriver://username:password@dbhost/dbname")
...
		
```


#### db_table (string)


存储用户黑名单数据的表的名称。


*默认值为 "userblacklist"。*


```opensips title="Set db_table parameter"
...
modparam("userblacklist", "db_table", "userblacklist")
...
		    
```


#### use_domain (integer)


如果设置为非零值，则使用 userblacklist 中的 domain 列。


*默认值为 "0"。*


```opensips title="Set use_domain parameter"
...
modparam("userblacklist", "use_domain", 0)
...
		    
```


### 导出的函数 {#exported-functions}


#### check_user_blacklist (user, domain, [number], [table])


在数据库中为给定的用户名和域名查找与请求 URI 用户（或 number
参数）匹配的最长前缀。
如果找到匹配且该项未设置为白名单，则返回 false。
否则返回 true。number 参数可用于
例如针对 from URI 用户进行检查。


参数：


- *user* (string) - 描述
- *domain* (string) - 描述
- *number* (string, 可选) - 若省略，
则使用默认值。
- *table* (string, 可选) - 若省略，
则使用默认值。


```opensips title="check_user_blacklist usage"
...
if (!check_user_blacklist("user", "domain.com"))
	sl_send_reply(403, "Forbidden");
	exit;
}
...
		
```


#### check_blacklist (table)


在给定表中查找与请求 URI 匹配的最长前缀。
如果找到匹配且该项未设置为白名单，
则返回 false。否则返回 true。


参数：


- *table* (string)


```opensips title="check_blacklist usage"
...
if (!check_blacklist("global_blacklist")))
	sl_send_reply(403, "Forbidden");
	exit;
}
...
		
```


### 导出的 MI 函数 {#exported-mi-functions}


#### reload_blacklist


重新加载内部的全局黑名单缓存。在全局黑名单的
数据库表被更改后，需要执行此操作。


```bash title="reload_blacklists usage"
...
opensips-cli -x mi reload_blacklist
...
		
```


### 安装与运行 {#installation-and-running}


#### 数据库设置 {#database-setup}


在使用 userblacklist 运行 OpenSIPS 之前，必须先建立模块读取黑名单
数据的数据库表。为此，如果
该表不是由安装脚本创建的，或者你选择
自行安装所有内容，可以将 opensips/scripts 文件夹下
各数据库目录中的 userblacklist-create.sql
SQL 脚本作为模板使用。
数据库名与表名可以通过模块参数设置，因此可以更改，
但列名必须与 SQL 脚本中
保持一致。
你也可以在项目网页 https://opensips.org/docs/db/db-schema-devel.html
上找到完整的数据库文档。


```c title="Example database content - globalblacklist table"
...
+----+-----------+-----------+
| id | prefix    | whitelist |
+----+-----------+-----------+
|  1 |           |         0 |
|  2 | 1         |         1 |
|  3 | 123456    |         0 |
|  4 | 123455787 |         0 |
+----+-----------+-----------+
...
		
```


该表将为所有号码建立一个全局黑名单，仅允许以 "1" 开头的呼叫。
以 "123456" 和 "123455787" 开头的号码也会被列入黑名单，
因为会匹配最长前缀。


```c title="Example database content - userblacklist table"
...
+----+----------------+-------------+-----------+-----------+
| id | username       | domain      | prefix    | whitelist |
+----+----------------+-------------+-----------+-----------+
| 23 | 49721123456788 |             | 1234      |         0 |
| 22 | 49721123456788 |             | 123456788 |         1 |
| 21 | 49721123456789 |             | 12345     |         0 |
| 20 | 494675231      |             | 499034133 |         1 |
| 19 | 494675231      | test        | 499034132 |         0 |
| 18 | 494675453      | test.domain | 49901     |         0 |
| 17 | 494675454      |             | 49900     |         0 |
+----+----------------+-------------+-----------+-----------+
...
		
```


该表将为特定用户名建立用户专属黑名单。例如，
对于用户 "49721123456788"，前缀 "1234" 将不被
允许，但号码 "123456788" 是被允许的。此外，如果设置了 "use_domain"
参数，还可以指定一个用于用户名匹配的
域。
<!-- CONTRIBUTORS -->

### 许可证 {#license}

所有文档文件（即 .md 扩展名）均按 Creative Common License 4.0 许可发布。
