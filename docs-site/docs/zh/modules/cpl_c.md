---
title: "cpl_c 模块"
description: "cpl_c 模块实现了一个 CPL（Call Processing Language，呼叫处理语言）解释器。"
sidebar: false
---

## 管理指南 {#admin-guide}


### 概述 {#overview}


cpl_c 模块实现了一个 CPL（Call Processing Language，呼叫处理语言）
解释器。它支持通过 SIP REGISTER 方法上传/下载/删除脚本。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


必须先加载以下模块才能加载本模块：


- *任意 DB 模块——用于对接数据库操作的 DB 模块
（如 mysql、postgres、dbtext 等模块）*
- *TM（事务）模块——用于代理/分叉
请求*
- *SL（无状态）模块——用于在响应 REGISTER 请求时发送无状态
应答，或用于回送错误响应*
- *USRLOC（用户位置）模块——用于实现
lookup("registration") 标签（把用户的 contact 加入位置集合）*


#### 外部库或应用程序 {#external-libraries-or-applications}


加载本模块运行 OpenSIPS 之前，必须先安装
以下库或应用程序：


- *libxml2 与 libxml2-devel——在某些操作系统上，这两个
包已合并为 libxml2。该库包含用于 XML 解析、DTD 校验和
DOM 操作的引擎。*


### 导出的参数 {#exported-parameters}


#### db_url (string)


必须向该模块提供 SQL URL，以便其知道存放 CPL 脚本表的
数据库位于何处。如有需要，可以指定用户名和密码，
以允许模块连接到数据库服务器。


*默认值为 "mysql://opensips:opensipsrw@localhost/opensips"。*


```opensips title="Set db_url parameter"
...
modparam("cpl_c","db_url","dbdriver://username:password@dbhost/dbname")
...
```


#### db_table (string)


指定存储 CPL 脚本的表名。
该表必须位于 "db_url" 参数指定的数据库中。关于 CPL
表格式的更多信息，请参见 modules/cpl_c/init.mysql 文件。


*默认值为 "cpl"。*


```opensips title="Set db_table parameter"
...
modparam("cpl_c","cpl_table","cpl")
...
```


#### username_column (string)


指定用于存储用户名的列名。


*默认值为 "username"。*


```opensips title="Set username_column parameter"
...
modparam("cpl_c","username_column","username")
...
```


#### domain_column (string)


指定用于存储域的列名。


*默认值为 "domain"。*


```opensips title="Set domain_column parameter"
...
modparam("cpl_c","domain_column","domain")
...
```


#### cpl_xml_column (string)


指定用于存储 cpl 脚本
XML 版本的列名。


*默认值为 "cpl_xml"。*


```opensips title="Set cpl_xml_column parameter"
...
modparam("cpl_c","cpl_xml_column","cpl_xml")
...
```


#### cpl_bin_column (string)


指定用于存储 cpl 脚本的
二进制版本（编译后版本）的列名。


*默认值为 "cpl_bin"。*


```opensips title="Set cpl_bin_column parameter"
...
modparam("cpl_c","cpl_bin_column","cpl_bin")
...
```


#### cpl_dtd_file (string)


指向描述 CPL 语法的 DTD 文件。文件名中
也可以包含文件路径。该路径可以是
绝对路径或相对路径（注意：该路径将相对于
OpenSIPS 的启动目录）。


*该参数为必填项！*


```opensips title="Set cpl_dtd_file parameter"
...
modparam("cpl_c","cpl_dtd_file","/etc/opensips/cpl-06.dtd")
...
```


#### log_dir (string)


指向一个目录，LOG CPL 节点生成的所有日志文件
都将在该目录下创建。每个用户会（按需）
创建一个名为 username.log 的日志文件。


*如果缺少该参数，日志功能将被禁用，
且执行时不会产生错误。*


```opensips title="Set log_dir parameter"
...
modparam("cpl_c","log_dir","/var/log/opensips/cpl")
...
```


#### proxy_recurse (int)


指定 PROXY CPL 节点允许递归的次数。
如果取值为 2，则在执行代理时，代理动作最多会被
重定向应答重新触发两次；第三次时，代理执行将
结束并转到 REDIRECTION 分支。将该参数设置为 0
可禁用递归功能。


*该参数的默认值为 0。*


```opensips title="Set proxy_recurse parameter"
...
modparam("cpl_c","proxy_recurse",2)
...
```


#### proxy_route (string)


在执行代理（转发）之前，可以执行一个脚本路由。
该路由所做的所有修改仅对
当前分支生效。


*该参数的默认值为 NULL（无）。*


```opensips title="Set proxy_route parameter"
...
modparam("cpl_c","proxy_route", "1")
...
```


#### case_sensitive (int)


指定用户名匹配是否需要区分
大小写。将其设置为非零值可强制
以区分大小写的方式处理用户名。


*该参数的默认值为 0。*


```opensips title="Set case_sensitive parameter"
...
modparam("cpl_c","case_sensitive",1)
...
```


#### realm_prefix (string)


为域部分定义一个前缀，在处理用户
和脚本时应忽略该前缀。


*该参数的默认值为空字符串。*


```opensips title="Set realm_prefix parameter"
...
modparam("cpl_c","realm_prefix","sip.")
...
```


#### lookup_domain (string)


由 lookup 标签使用，用于指明在何处执行用户位置查询。
基本上就是保存用户注册信息的 usrloc 域（表）
的名称。


如果设置为空字符串，则 lookup 节点将被禁用——
不会执行任何用户位置查询。


*该参数的默认值为 NULL。*


```opensips title="Set lookup_domain parameter"
...
modparam("cpl_c","lookup_domain","location")
...
```


#### lookup_append_branches (int)


指定当用户位置查询返回多个 contact 时，
lookup 标签是否应追加分支（以进行并行
分叉）。将其设置为非零值可为
location lookup 标签启用并行分叉。


*该参数的默认值为 0。*


```opensips title="Set lookup_append_branches parameter"
...
modparam("cpl_c","lookup_append_branches",1)
...
```


#### use_domain (integer)


指定在用户识别中是否使用 URI 的
域部分（否则仅使用用户名部分）。


*默认值为 "0（禁用）"。*


```opensips title="Set use_domain parameter"
...
modparam("cpl_c","use_domain",1)
...
```


### 导出的函数 {#exported-functions}


#### cpl_run_script(type,mode)


开始执行 CPL 脚本。用户名按以下顺序获取：new_uri、
requested URI 或 To 头域
（用于入口执行），或从 FROM 头域获取（用于
出口执行）。
关于有状态/无状态的消息处理，该
函数非常灵活，可以在不同
模式下运行（参见下面的 "mode" 参数）。
通常该函数会结束脚本执行。并不能
保证 OpenSIPS 脚本结束时 CPL 脚本的解释也已结束
（对于同一个 INVITE ;-)）——当 CPL 脚本执行 PROXY
时就会发生这种情况：脚本解释在代理之后
暂停，待收到某个应答后再恢复（这
可能发生在 OpenSIPS 的另一个进程中）。


如果函数向脚本返回 true：返回值为 "1" 时，
SIP 服务器应继续正常行为，
如同不存在任何脚本；返回值为 (2) 时，
表示未找到脚本，因此未执行任何操作。


当报告了某种错误（返回假值）时，
函数本身并未发送任何 SIP 错误应答（这可以
从脚本中完成）。


各参数含义如下：


- *type (string)* - 应执行脚本的哪一部分；
设置为 "incoming" 表示执行脚本的入口部分
（在收到 INVITE 时），或设置为 "outgoing"
表示执行脚本的出口部分（在
用户发起 INVITE 呼叫时）。
- *mode (string)* - 设置解释器模式为
无状态/有状态行为。接受以下模式：

  - *IS_STATELESS* - 当前 INVITE
尚未创建任何事务。所有应答（重定向或
拒绝）都以无状态方式完成。只有
在执行代理时才会切换到有状态。因此，
如果函数返回，将处于无状态模式。
  - *IS_STATEFUL* - 当前 INVITE
已关联事务。所有信令操作
（应答或代理）都以有状态方式完成。因此，
如果函数返回，将处于有状态模式。
  - *FORCE_STATEFUL* - 当前 INVITE
尚未创建任何事务。所有信令操作
都以有状态方式完成（进行信令时，
事务将在解释器内部创建）。
因此，如果函数返回，将处于无状态模式。
*提示*：is_stateful 很难
在路由脚本中管理（脚本处理
可以在有状态模式下继续）；is_stateless 最快、
资源消耗最少（只有在执行代理时
才创建事务），但对重传的保护很弱
（因为应答是以无状态方式发送的）；
force_stateful 是一个不错的折中——所有信令都以
有状态方式完成（具备重传保护），同时又
能在返回脚本时处于无状态模式
（便于继续执行路由脚本）


该函数可在 REQUEST_ROUTE 中使用。


```opensips title="cpl_run_script usage"
...
cpl_run_script("incoming","force_stateful");
...
```


#### cpl_process_register()


该函数只能对 REGISTER 请求调用。它
检查当前 REGISTER 请求是否与
CPL 脚本的上传/下载/删除相关。如果相关，
则会执行所有需要的操作。为了检查
REGISTER 是否与 CPL 相关，函数首先查看
"Content-Type" 头域。如果
该头域存在且 mime 类型设置为
"application/cpl+xml"，表示这是一次 CPL
脚本上传/删除操作。两种
情况的区分通过查看
"Content-Disposition" 头域完成；如果其值为
"script;action=store"，表示是上传；如果为
"script;action=remove"，表示是删除操作；其他
值都被视为错误。如果不存在
"Content-Type" 头域，函数会查看 "Accept" 头域，
如果其中包含 "*" 或 "application/cpl-xml"，
则该请求将被视为下载 CPL 脚本的请求。
仅当 REGISTER 与 CPL 无关时，函数才
返回脚本。在其他情况下，函数会
自行发送必要的应答（无状态——使用 sl），
包括错误应答。


该函数可在 REQUEST_ROUTE 中使用。


```opensips title="cpl_process_register usage"
...
if ($rm=="REGISTER") {
    cpl_process_register();
}
...
```


#### cpl_process_register_norpl()


与 "cpl_process_register" 相同，但
不会在内部生成应答。所有信息（脚本）都会
追加到应答中，但不会发送出去。


该函数的主要目的是允许 CPL 与 UserLocation 服务
通过相同的 REGISTER
消息进行集成。


该函数可在 REQUEST_ROUTE 中使用。


```opensips title="cpl_process_register_norpl usage"
...
if ($rm=="REGISTER") {
    cpl_process_register();
    # 继续执行 usrloc 部分
    save("location");
}
...
```


### 导出的 MI 函数 {#exported-mi-functions}


#### LOAD_CPL


对给定用户加载 XML cpl 文件，将其编译为
二进制格式，并把两种格式都存储到数据库中。


名称：*LOAD_CPL*


参数：


- username：用户名
- cpl_filename：文件名


MI FIFO 命令格式：


```bash
opensips-cli -x mi LOAD_CPL sip:bob@domain.com cpl_script.xml
```


#### REMOVE_CPL


对给定用户删除整个数据库记录
（XML cpl 与二进制 cpl）；cpl 脚本为空的
用户不予受理。


名称：*REMOVE_CPL*


参数：


- username：用户名


MI FIFO 命令格式：


```bash
opensips-cli -x mi REMOVE_CPL sip:bob@domain.com
```


#### GET_CPL


对给定用户返回 XML 格式的 CPL 脚本。


名称：*GET_CPL*


参数：


- username：用户名


MI FIFO 命令格式：


```bash
opensips-cli -x mi GET_CPL sip:bob@domain.com
```


### 安装与运行 {#installation-and-running}


#### 数据库设置 {#database-setup}


在使用 cpl_c 运行 OpenSIPS 之前，必须设置
模块用于存储 CPL 脚本的数据库表。为此，如果
该表并非由安装脚本创建，或者你选择
自行安装全部内容，可以将 opensips/scripts
文件夹下各数据库目录中的 cpc-create.sql SQL
脚本作为模板使用。
数据库名和表名可以通过模块参数设置，因此
可以修改，但列名必须与 SQL 脚本中保持
一致。完整的数据库文档也可在
项目网页 [https://opensips.org/docs/db/db-schema-devel.html](https://opensips.org/docs/db/db-schema-devel.html) 上找到。
<!-- CONTRIBUTORS -->

### 许可证 {#license}

所有文档文件（即 .md 扩展名）均按 Creative Common License 4.0 许可协议授权。
