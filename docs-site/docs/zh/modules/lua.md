---
title: "lua 模块"
description: "编写新的 OpenSIPS 模块所需的时间相当长，而配置文件提供的选项仅限于各模块已实现的功能，借助本 Lua 模块可在 Lua 中轻松实现自己的 OpenSIPS 扩展。"
sidebar: false
---


## 管理指南 {#admin-guide}


### 概述 {#overview}


遗憾的是，编写一个新的 OpenSIPS 模块
所需的时间相当长，而配置文件提供的选项
仅限于各模块已实现的功能。


借助该 Lua 模块，可以轻松用 Lua 实现自己的
OpenSIPS 扩展。


### 安装模块 {#installing-the-module}


该 Lua 模块在 opensips.cfg 中（与所有
其他模块一样）通过 loadmodule("/path/to/lua.so"); 加载。


编译该 Lua 模块需要动态链接较新版本的
Lua（已用 5.1 测试）。你常用的 Linux 发行版的
默认版本应可正常工作。


### 使用模块 {#using-the-module}


借助 Lua 模块，可以在
OpenSIPS 侧访问 lua 函数。需要定义一个要加载的文件，并从其中
调用函数。编写一个函数 “mongo_alias”，然后在 opensips.cfg 中写入


```opensips
...
if (lua_exec("mongo_alias")) {
	...
}
...
```


在 Lua 侧，可以访问 opensips 函数与
变量（AVP、pseudoVar 等）。更多信息请参阅
下文文档。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


无 ;-)


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，必须安装
以下库或应用程序：


- Lua 5.1.x 或更高版本
- memcached


本模块基于 Lua 5.1.? 开发并测试，但
应可用于任何 5.1.x 版本。更早的版本无法工作。


在当前的 Debian 系统上，至少应安装以下
软件包：


- lua5.1
- liblua5.1-0-dev
- libmemcached-dev
- libmysqlclient-dev


据报告，其他 Debian 系发行版（如 Ubuntu）需要相同的软件包。


在 OpenBSD 系统上，至少应安装以下
软件包：


- Lua


### 导出的参数 {#exported-parameters}


#### luafilename (string)


这是脚本的文件名。该参数只能设置一次，
但文件中可包含任意数量的函数，并可按需
“use” 任意多个 Lua 模块。


默认值为 "/etc/opensips/opensips.lua"


```opensips title="Set luafilename parameter"
...
modparam("lua", "luafilename", "/etc/opensips/opensips.lua")
...
        
```


#### lua_auto_reload (int)


若希望自动重新加载 lua 脚本，
将该值设为 1。
默认禁用。


#### lua_allocator (string)


更改 lua 模块的默认内存分配器。
可选值为：


- opensips（默认）
- malloc


### 导出的函数 {#exported-functions}


#### lua_exec(func, [param])


调用一个 Lua 函数，并将当前 SIP 消息传递给它。
该函数可用于 REQUEST_ROUTE、FAILURE_ROUTE、
ONREPLY_ROUTE 和 BRANCH_ROUTE。


参数：


- *func* (string) - Lua 函数名
- *param* (string, optional) - 传给 Lua 函数的参数。


```opensips title="lua_exec() usage"
...
if (lua_exec("mongo_alias")) {
	...
}
...
```


#### lua_meminfo()


记录内存相关信息。


### 导出的 MI 函数 {#exported-mi-functions}


#### watch


名称：*watch*


参数：*无*


- *action* (optional) - 'add' 或 'delete'
- *extension* (optional) - 若提供了
*action* 则必填


MI FIFO 命令格式：


```bash
$ opensips-cli -x mi watch
```


## OpenSIPS Lua API


### 可用函数 {#available-functions}


本模块提供对有限数量 OpenSIPS
核心函数的访问。


#### xdbg(message)


xlog(DBG, message) 的别名


#### xlog([level],message)


使用 OpenSIPS 的日志设施记录消息。日志
级别为以下之一：


- ALERT
- CRIT
- ERR
- WARN
- NOTICE
- INFO
- DBG


#### getpid


返回当前 pid。


#### getmem


返回一个表，包含已分配内存大小与碎片情况。


#### getmeminfo


返回包含内存信息的表。


#### gethostname


返回当前主机名的值。


#### getType(msg)


返回 "SIP_REQUEST" 或 "SIP_REPLY"。


#### isMyself(host, port)


测试 host 及可选的 port 是否表示 OpenSIPS 监听的
地址之一。


#### grepSockInfo(host, port)


与 isMyself() 类似，但不检查别名。


#### getURI_User(msg)


返回 To URI 的用户部分。


#### getExpires(msg)


返回当前消息的 expires 头域。


#### getHeader(msg, header)


返回指定头域的取值。


#### getContact(msg)


返回包含 contact 头域的表。


#### getRoute(msg)


返回包含 Route 头域的表。


#### moduleFunc(msg, function, args1, args2, ...)


可以向该函数传递参数。


#### getStatus(msg)


若 SIP 消息为 SIP_REPLY，则返回当前状态。


#### getMethod(msg)


返回当前方法。


#### getSrcIp(msg)


返回源的 IP 地址。


#### getDstIp(msg)


返回目的的 IP 地址。


#### AVP_get(name)


返回一个 AVP 变量。


#### AVP_set(name, value)


定义一个 AVP 变量。


#### AVP_destroy(name)


销毁一个 AVP 变量。


#### pseudoVar(msg, variable)


返回一个伪变量。


#### pseudoVarSet(msg, variable, value)


设置伪变量的值。


#### scriptVarGet(variable)


返回一个脚本变量。


#### scriptVarSet(variable, value)


设置脚本变量的值。


#### add_lump_rpl(msg, header)


向应答添加头域。
<!-- CONTRIBUTORS -->

### 许可证 {#license}

所有文档文件（即 .md 扩展名）均按 Creative Common License 4.0 许可发布
