---
title: "JSON-RPC 模块"
description: "本模块是 JSON-RPC v2.0 客户端 [http://www.jsonrpc.org/specification](http://www.jsonrpc.org/specification) 的一种实现，可以通过 TCP 连接向 JSON-RPC 服务器发送调用。"
sidebar: false
---

## 管理指南 {#admin-guide}


### 概述 {#overview}


本模块是 JSON-RPC v2.0 客户端 [http://www.jsonrpc.org/specification](http://www.jsonrpc.org/specification)
的一种实现，可以通过 TCP 连接向 JSON-RPC 服务器发送调用。


> [!NOTE]
> 本模块当前版本既不支持 TCP 连接复用，
> 也不支持异步命令。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


本模块之前必须加载以下模块：


- *无*。


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，必须安装以下库或应用程序：


- *无*


### 导出的参数 {#exported-parameters}


#### connect_timeout (integer)


OpenSIPS 等待连接 JSON-RPC 服务器的毫秒数，超过该时间即超时。


*默认值为 "500 毫秒"。*


```opensips title="设置 connect_timeout 参数"
...
modparam("jsonrpc", "connect_timeout", 200)
...
```


#### write_timeout (integer)


OpenSIPS 等待向 JSON-RPC 服务器发送 RPC 命令的毫秒数，超过该时间即超时。


*默认值为 "500 毫秒"。*


```opensips title="设置 write_timeout 参数"
...
modparam("jsonrpc", "write_timeout", 300)
...
```


#### read_timeout (integer)


OpenSIPS 等待 JSON-RPC 服务器响应 JSON-RPC 请求的毫秒数，超过该时间即超时。
注意该参数只影响 *jsonrpc_request* 命令。


*默认值为 "500 毫秒"。*


```opensips title="设置 read_timeout 参数"
...
modparam("jsonrpc", "read_timeout", 300)
...
```


### 导出的函数 {#exported-functions}


#### jsonrpc_request(destination, method, params, ret_var) {#jsonrpc_requestdestination-method-params-ret_var}


向 *destination* 参数指定的 JSON-RPC 服务器发起 JSON-RPC 请求，并等待其应答。


该函数可在任意路由中使用。


该函数具有以下参数：


- *destination* (string) - JSON-RPC 服务器的地址。格式必须为 *IP:port*。
- *method* (string) - RPC 请求中使用的方法。
- *params* (string) - 发送给 RPC 方法的参数。该参数必须是格式正确的 JSON 数组或
JSON 对象，符合 JSON-RPC 规范。
- *ret_var* 可写变量，用于存储 JSON-RPC 命令的结果。如果命令返回错误，该变量
会被填充为错误 JSON，否则填充为 JSON-RPC 结果的正文。


该函数具有以下返回码：


- *1* - JSON-RPC 命令执行成功，且服务器返回成功。可以检查 *ret_pvar* 变量获取
结果。
- *-1* - 处理过程中出现内部错误。
- *-2* - 与目的地发生连接（超时或连接）错误。
- *-3* - JSON-RPC 已成功运行，但服务器返回了错误。检查 *ret_pvar* 的值以了解
更多信息。


```opensips title="jsonrpc_request() 函数用法"
	...
	if (!jsonrpc_request("127.0.0.1", "add", "[1,2]", $var(ret))) {
		xlog("JSON-RPC command failed with $var(ret)\n");
		exit;
	}
	xlog(JSON-RPC command returned $var(ret)\n");
	# 把 $var(ret) 解析为 JSON，或按函数返回的其他内容处理
	...
	
```


#### jsonrpc_notification(destination, method, params)


向 *destination* 参数指定的 JSON-RPC 服务器发起 JSON-RPC 通知，但与 [jsonrpc_request()](#jsonrpc_requestdestination-method-params-ret_var) 不同，
它不等待 JSON-RPC 服务器的应答。


该函数可在任意路由中使用。


该函数接收与 [jsonrpc_request()](#jsonrpc_requestdestination-method-params-ret_var) 相同的参数，只是没有 *ret_pvar*。返回值也相同。


```opensips title="jsonrpc_notification() 函数用法"
	...
	if (!jsonrpc_notification("127.0.0.1", "block_ip", "{ \"ip": \"$si\" }")) {
		xlog("JSON-RPC notification failed with $rc!\n");
		exit;
	}
	...
	
```
<!-- CONTRIBUTORS -->

### 许可证 {#license}

本项目的所有文档文件（即 .md 扩展名的文件）均以 Creative Common License 4.0 授权。
