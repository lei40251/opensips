---
title: "imc 模块"
description: "本模块提供即时消息会议支持。"
sidebar: false
---


## 管理指南 {#admin-guide}


### 概述 {#overview}


本模块提供即时消息会议（instant message conference）支持。它沿用 IRC 频道的架构，你可以发送内嵌在 MESSAGE 消息体中的命令，因为目前没有带 IM 会议 GUI 的 SIP UA 客户端。


你必须定义一个与 im 会议管理器相对应的 URI，用户可向该 URI 发送命令来创建新的会议室。会议室创建之后，用户可以直接向该会议的 URI 发送命令。


为便于集成到配置文件中，IMC 命令的解释器内嵌在模块中，从配置的角度看，只有唯一一个函数需要对消息和命令都执行。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


以下模块必须在本模块之前加载：


- *mysql*。
- *tm*。


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，必须安装以下库或应用程序：


- *无*。


### 导出的参数 {#exported-parameters}


#### db_url (str)


数据库 URL。


*默认值为 "mysql://opensips:opensipsrw@localhost/opensips"。*


```opensips title="Set db_url parameter"
...
modparam("imc", "db_url", "dbdriver://username:password@dbhost/dbname")
...
```


#### rooms_table (str)


存储 IMC 房间的表的名称。


*默认值为 "imc_rooms"。*


```opensips title="Set rooms_table parameter"
...
modparam("imc", "rooms_table", "rooms")
...
```


#### members_table (str)


存储 IMC 成员的表的名称。


*默认值为 "imc_members"。*


```opensips title="Set members_table parameter"
...
modparam("imc", "rooms_table", "members")
...
```


#### hash_size (integer)


用于得到存储成员和房间的哈希表大小的 2 的幂次。


*默认值为 4（即哈希表大小为 16）。*


```opensips title="Set hash_size parameter"
...
modparam("imc", "hash_size", 8)
...
```


#### imc_cmd_start_char (str)


表示消息体是一条命令的字符。


*默认值为 "#"。*


```opensips title="Set imc_cmd_start_char parameter"
...
modparam("imc", "imc_cmd_start_char", "#")
...
```


#### outbound_proxy (str)


发送消息时用作下一跳的 SIP 地址。当 OpenSIPS 使用的域名不在 DNS 中，或使用独立的 OpenSIPS 实例处理 imc 时非常有用。若未设置，消息将发往目标 URI 中的地址。


*默认值为 NULL。*


```opensips title="Set outbound_proxy parameter"
...
modparam("imc", "outbound_proxy", "sip:opensips.org;transport=tcp")
...
```


### 导出的函数 {#exported-functions}


#### imc_manager()


处理 MESSAGE 方法。它检测消息体是否是一条会议命令。若是则执行该命令，否则把消息发送给房间内的所有成员。


该函数可在 REQUEST_ROUTE 中使用。


```opensips title="Usage of imc_manager() function"
...
# 房间将命名为 chat-xyz，以避免与用户名重叠
if(is_method("MESSAGE)
        && ($ru=~ "sip:chat-[0-9]+@" || ($ru=~ "sip:chat-manager@")
    imc_manager();
...
```


### 导出的 MI 函数 {#exported-mi-functions}


#### imc_list_rooms


列出 IM 会议房间。


名称：*imc_list_rooms*


参数：无


MI FIFO 命令格式：


```bash
		opensips-cli -x mi imc_list_rooms
		
```


#### imc_list_members


列出 IM 会议房间中的成员。


名称：*imc_list_members*


参数：


- *room* ：要列出成员的目标房间


MI FIFO 命令格式：


```bash
		opensips-cli -x mi imc_list_members sip:chat-000@opensips.org
		
```


### 导出的统计 {#exported-statistics}


#### active_rooms


活动 IM 会议房间的数量。


### IMC 命令 {#imc-commands}


命令由起始字符来识别。一条命令必须写在一行内。默认起始字符是 '#'。你可以通过 "imc_cmd_start_char" 参数修改它。


下图列出命令及其参数。


```c title="List of commands"
...

1.create
  -创建一个会议室
  -接收 2 个参数：
     1) 房间的名称
     2)可选- "private" -若提供，创建的房间为私有，
	   且只能通过邀请添加新成员
  -用户会被添加为房间的第一个成员和所有者
  -例：#create chat-000 private

2.join
  -使用户成为房间成员
  -接收一个可选参数 - 房间的地址 -若未提供，
    则视为消息 To 头域中的地址
  -若房间不存在，命令按 create 处理
  -例：join sip:chat-000@opensips.org，
      或直接向 sip:chat-000@opensips.org 发送 #join

3.invite
  -邀请某个用户成为房间成员
  -接收 2 个参数：
     1) 用户的完整地址
     2) 房间的地址 -若未提供，则视为消息 To 头域中的地址
  -只有特定用户有权邀请其他用户：房间所有者和管理员
  -例：#invite sip:john@opensips.org sip:chat-000@opensips.org
    或向 sip:chat-000@opensips.org 发送 #invite john@opensips.org

4.accept
  -接受邀请
  -接收一个可选参数 - 房间的地址 -若未提供，则视为消息
    To 头域中的地址
  -例：#accept sip:john@opensips.org

5.deny
  -拒绝邀请
  -参数与 accept 相同

6.remove
  -从房间中删除一个成员
  -接收 2 个参数：
    1) 成员的完整地址
    2) 房间的地址 -若未提供，则视为消息 To 头域中的地址
  -只有特定成员有权删除其他成员
  -例：#remove sip:john@opensips.org，发送到 sip:chat-000@opensips.org

7.exit
  -离开房间
  -接收一个可选参数 - 房间的地址 -若未提供，则视为消息
    To 头域中的地址
  -若用户是房间所有者，房间将被销毁

8.destroy
  -删除一个房间
  -参数与 exit 相同
  -只有房间所有者有权销毁房间

9.list
  -列出房间中的成员

...
```


### 安装 {#installation}


在使用 IMC 运行 OpenSIPS 之前，必须先建立模块存储数据所需的数据库表。为此，如果这些表不是由安装脚本创建，或者你选择自行安装全部内容，可以使用 opensips/scripts 文件夹中 database 目录下的 imc-create.sql SQL 脚本作为模板。你也可以在项目网站上找到完整的数据库文档，[https://opensips.org/docs/db/db-schema-devel.html](https://opensips.org/docs/db/db-schema-devel.html)。
<!-- CONTRIBUTORS -->

### 许可证 {#license}

所有文档文件（即扩展名为 .md 的文件）均按 Creative Common License 4.0 授权
