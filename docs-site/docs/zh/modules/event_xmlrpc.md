---
title: "event_xmlrpc 模块"
description: "该模块是一个 XMLRPC 客户端的实现，用于在 OpenSIPS 触发某些通知时通知 XMLRPC 服务器。"
---


## 管理指南 {#admin-guide}


### 概述 {#overview}


本模块是一个 XMLRPC 客户端的实现，用于在 OpenSIPS 触发某些通知时通知
XMLRPC 服务器。它充当事件通知接口（Event Notification Interface）的
传输层。


基本上，当通过事件接口从 OpenSIPS 的脚本、核心或模块触发一个事件时，
该模块会执行一次远程过程调用。


为了接收通知，XMLRPC 服务器必须订阅 OpenSIPS 提供的某个事件。
这可以通过通用 MI 接口（*event_subscribe* 函数）或从
OpenSIPS 脚本（*subscribe_event* 核心函数）完成。


### XMLRPC 套接字语法 {#xmlrpc-socket-syntax}


*'xmlrpc:' host ':' port ':' method*


含义：


- *'xmlrpc:'* - 告知事件接口，
发送给该订阅者的事件应由 *event_xmlrpc* 模块处理。
- *host* - XMLRPC 服务器的主机名。
- *port* - XMLRPC 服务器的端口。
- *method* - 由 XMLRPC 客户端远程调用的
方法。
注意：客户端不会等待 XMLRPC 服务器的响应。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


在加载本模块之前必须加载以下模块：


- *无*。


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，必须安装以下库或应用程序：


- *无*


### 导出的参数 {#exported-parameters}


#### use_struct_param (integer)


触发事件时，将参数的名称和值打包到一个 XMLRPC 结构中。这为某些
XMLRPC 服务器实现解释参数提供了更简便的方式。
设为 0 表示禁用，设为非 0 表示启用。


*默认值为 "0（禁用）"。*


```opensips title="Set use_struct_param parameter"
...
modparam("event_xmlrpc", "use_struct_param", 1)
...
```


### 导出的函数 {#exported-functions}


不导出可在配置文件中使用的函数。


### 示例 {#example}


以下是 pike 模块在判定某个 ip 应被阻止时触发的事件示例：


```c title="E_PIKE_BLOCKED event"
POST /RPC2 HTTP/1.1.
Host: 127.0.0.1:8081.
Connection: close.
User-Agent: OpenSIPS XMLRPC Notifier.
Content-type: text/xml.
Content-length: 240.
		.
<?xml version="1.0"?>
<methodCall>
	<methodName>e_dummy_h</methodName>
	<params>
		<param>
			<value><string>E_MY_EVENT</string></value>
		</param>
		<param>
			<name>ip</name>
			<value><string>192.168.2.11</string></value>
		</param>
	</params>
</methodCall>
```


```c title="XMLRPC socket"
# 调用 'block_ip' 函数
xmlrpc:127.0.0.1:8080:block_ip
```
<!-- CONTRIBUTORS -->

### 许可证 {#license}

所有文档文件（即 .md 扩展名）均依据 Creative Common License 4.0 授权
