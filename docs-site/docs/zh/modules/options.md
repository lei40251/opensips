---
title: "options 模块"
description: "本模块提供一个函数，用于应答直接发往服务器自身的 OPTIONS 请求。"
sidebar: false
---


## 管理指南 {#admin-guide}


### 概述 {#overview}


本模块提供一个函数，用于应答直接发往服务器自身的 OPTIONS 请求。所谓直接发往服务器自身，是指请求 URI 中包含服务器地址、且 URI 中没有用户名的 OPTIONS 请求。该请求将以一个包含服务器能力的 200 OK 应答。


应答发往服务器的 OPTIONS 请求，是从远端在 SIP（应用）层进行存活测试的最简单方式（类似于网络层的 ICMP 回显请求，也称为 "ping"）。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


以下模块必须在本模块之前加载：


- *sl* —— 无状态应答。
- *signaling* —— 无状态应答。


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，必须安装以下库或应用程序：


- *无*。


### 导出参数 {#exported-parameters}


#### accept (string)


该参数是 Accept 头域的内容。若为 ""，则应答中不添加该头域。
注意：RFC3261 并未明确规定，代理是应当接受任意内容（即默认的 "*/*"），因为它并不关心内容；还是应当不接受任何内容，即 ""。


*默认值为 "*/*"。*


```opensips title="Set accept parameter"
...
modparam("options", "accept", "application/*")
...
```


#### accept_encoding (string)


该参数是 Accept-Encoding 头域的内容。若为 ""，则应答中不添加该头域。
请勿修改默认值，因为 OpenSIPS 目前不支持任何编码。


*默认值为 ""。*


```opensips title="Set accept_encoding parameter"
...
modparam("options", "accept_encoding", "gzip")
...
```


#### accept_language (string)


该参数是 Accept-Language 头域的内容。若为 ""，则应答中不添加该头域。
你可以设置任意偏好的语言代码，用于其他设备返回的错误描述，但大概没有多少设备支持默认英语之外的语言。


*默认值为 "en"。*


```opensips title="Set accept_language parameter"
...
modparam("options", "accept_language", "de")
...
```


#### support (string)


该参数是 Supported 头域的内容。若为 ""，则应答中不添加该头域。
请勿修改默认值，因为 OpenSIPS 目前不支持任何在 IANA 注册的 SIP 扩展。


*默认值为 ""。*


```opensips title="Set support parameter"
...
modparam("options", "support", "100rel")
...
```


### 导出函数 {#exported-functions}


#### options_reply()


该函数检查请求方法是否为 OPTIONS，以及请求 URI 中是否不含用户名。若两者均成立，将以无状态方式用 "200 OK" 应答该请求，并携带来自模块参数的能力信息。


在某些错误情况下，它会发送 "500 Server Internal Error"；若被用于错误的请求，则返回 false。


对请求方法以及用户名缺失的检查是可选的，因为函数自身也会执行这些检查。但不应在 myself 检查之外调用该函数，因为在这种情况下，该函数可能会应答那些作为出站代理发给你、但目的地并非你的代理的 OPTIONS 请求（该函数目前缺少这一检查）。


该函数可用于 REQUEST_ROUTE。


```opensips title="options_reply usage"
...
if (is_myself("$rd")) {
	if (is_method("OPTIONS") && (! $ru=~"sip:.*[@]+.*")) {
		options_reply();
	}
}
...
```
<!-- CONTRIBUTORS -->

### 许可证 {#license}

所有文档文件（即 .md 扩展名）均按 Creative Common License 4.0 授权。
