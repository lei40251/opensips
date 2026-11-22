---
title: "mi_xmlrpc_ng 模块"
description: "本模块实现一个 XML-RPC 服务器，用于处理 XML-RPC 请求并生成 XML-RPC 应答。"
sidebar: false
---


## 管理指南 {#admin-guide}


### 概述 {#overview}


本模块实现一个 XML-RPC 服务器，用于处理 XML-RPC 请求并生成 XML-RPC 应答。收到 XML-RPC 消息时会执行一个默认方法。


首先，它会查找对应的 MI 命令。若找到，则把被调用的过程的参数解析为一棵 MI 树并执行该命令。随后返回一棵 MI 应答树，再格式化回 XML-RPC。应答有两种构建方式——一种是字符串，其中包含 MI 树节点的信息（名称、值和属性）；另一种是数组，其每个元素由各个 MI 树节点所存储的信息组成。


### 依赖 {#dependencies}


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，必须安装以下库或应用程序：


- *libxml2*


#### OpenSIPS 模块 {#opensips-modules}


在使用本模块之前必须先加载以下模块：


- *httpd* 模块。


### 导出的参数 {#exported-parameters}


#### http_root(string)


指定 XML-RPC 请求的根路径：http://[opensips_IP]:[opensips_httpd_port]/[http_root]


*默认值为 "RPC2"。*


```opensips title="设置 http_root 参数"
...
modparam("mi_xmlrpc_ng", "http_root", "opensips_mi_xmlrpc")
...
```


#### trace_destination (string)


跟踪目标，由跟踪模块定义。目前唯一的跟踪模块是 **proto_hep**。被跟踪的 MI 消息将发送到此处。


> [!WARNING]
> 必须加载跟踪模块（例如 **proto_hep**），该参数才会生效。


*默认值为 none（未定义）。*


```opensips title="设置 trace_destination 参数"
...
modparam("proto_hep", "trace_destination", "[hep_dest]10.0.0.2;transport=tcp;version=3")

modparam("mi_xmlrpc_ng", "trace_destination", "hep_dest")
...
```


#### trace_bwlist (string)


基于黑名单或白名单过滤被跟踪的 MI 命令。只有定义了 **trace_destination**，该参数才有意义。白名单使用 'w' 或 'W' 定义，黑名单使用 'b' 或 'B' 定义。类型与实际的黑名单之间用 ':' 分隔。列表中的 MI 命令必须用 ',' 分隔。


定义黑名单意味着所有未列入黑名单的命令都会被跟踪。定义白名单意味着所有未列入白名单的命令都不会被跟踪。

> [!WARNING]
> 不能同时定义白名单和黑名单，只允许其中一种。第二次定义该参数只会覆盖第一次的定义。


> [!WARNING]
> 必须加载跟踪模块（例如 **proto_hep**），该参数才会生效。


*默认值为 none（未定义）。*


```opensips title="设置 trace_destination 参数"
...
## 把 ps 和 which 这两条 mi 命令列入黑名单
## 其余所有命令都将被跟踪
modparam("mi_xmlrpc_ng", "trace_bwlist", "b: ps, which")
...
## 只允许 sip_trace 这一条 mi 命令
## 其余所有命令都不会被跟踪
modparam("mi_xmlrpc_ng", "trace_bwlist", "w: sip_trace")
...
```


### 导出的函数 {#exported-functions}


没有可供配置文件使用的导出函数。


### 已知问题 {#known-issues}


如果配置的 httpd 缓冲区过小（或配置的 pkg 内存不足），返回大量数据的命令（如 ul_dump）将失败。


httpd 与 mi_xmlrpc_ng 模块的未来版本将解决该问题。


### 示例 {#example}


下面是一个示例，展示 "get_statistics net: shmem:" MI 命令的 XML-RPC 格式应答。


```c title="XML-RPC 请求"
POST /xmlrpc HTTP/1.0
Host: my.host.com
User-Agent: My xmlrpc UA
Content-Type: text/xml
Content-Length: 216

<?xml version='1.0'?>
<methodCall>
	<methodName>get_statistics</methodName>
	<params>
		<param>
		<value>
		<struct>
		<member>
			<name>statistics</name>
			<value>
			<array>
			<data>
				<value><string>shmem:</string></value>
				<value><string>core:</string></value>
			</data>
			</array>
			</value>
		</member>
		</struct>
		</value>
		</param>
	</params>
</methodCall>


HTTP/1.0 200 OK
Content-Length: 236
Content-Type: text/xml; charset=utf-8
Date: Mon, 8 Mar 2013 12:00:00 GMT

<?xml version="1.0" encoding="UTF-8"?>.
<methodResponse>
<params><param>
<value><struct><member><name>net:waiting_udp</name><value><string>0</string></value></member><member><name>net:waiting_tcp</name><value><string>0</string></value></member><member><name>net:waiting_tls</name><value><string>0</string></value></member><member><name>shmem:total_size</name><value><string>268435456</string></value></member><member><name>shmem:used_size</name><value><string>40032</string></value></member><member><name>shmem:real_used_size</name><value><string>277112</string></value></member><member><name>shmem:max_used_size</name><value><string>277112</string></value></member><member><name>shmem:free_size</name><value><string>268158344</string></value></member><member><name>shmem:fragments</name><value><string>194</string></value></member></struct></value></param></params>
</methodResponse>.
```
<!-- CONTRIBUTORS -->

### 许可证 {#license}

本项目的所有文档文件（即 .md 扩展名的文件）均以 Creative Common License 4.0 授权。
