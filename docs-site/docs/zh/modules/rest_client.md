---
title: "rest_client 模块"
description: "*rest_client* 模块提供了一种与 HTTP 服务器交互的手段，即执行 RESTful 查询，如 GET、POST 和 PUT。"
---


## 管理指南 {#admin-guide}


### 概述 {#overview}


*rest_client* 模块提供了一种与 HTTP 服务器交互的手段，即执行 RESTful 查询，如 GET、POST 和 PUT。


### TCP 连接复用 {#tcp-connection-reusage}


除非服务器通过 "Connection: close" 指示另行指定，否则本模块会尽可能保留并复用其创建的 TCP 连接，无论脚本编写者执行的是阻塞式还是异步的 HTTP 请求。这些连接不会在 OpenSIPS 工作进程之间共享——每个工作进程维护自己的一组连接。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


在加载本模块之前必须先加载以下模块：


- *不依赖其他 OpenSIPS 模块。*


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，必须安装以下库或应用程序：


- *libcurl*。


### 导出的参数 {#exported-parameters}


#### curl_timeout (integer) {#curl_timeout-integer}


任何 HTTP(S) 传输完成所允许的最长时间。该时间区间包含初始连接时间窗口，因此本参数的值必须大于或等于
[connection_timeout](#connection_timeout-integer)。


*默认值为 "20" 秒。*


```opensips title="Setting the curl_timeout parameter"
...
modparam("rest_client", "curl_timeout", 10)
...
```


#### connection_timeout (integer) {#connection_timeout-integer}


与服务器建立连接所允许的最长时间。


*默认值为 "20" 秒。*


```opensips title="Setting the connection_timeout parameter"
...
modparam("rest_client", "connection_timeout", 4)
...
```


#### connect_poll_interval (integer) {#connect_poll_interval-integer}


仅与异步请求相关。用于完全控制我们希望多快地检测到 libcurl 已完成的阻塞式 TCP/TLS 握手，
从而可以将异步传输放到后台执行。较低的
[connect_poll_interval](#connect_poll_interval-integer) 可能加快所有异步
HTTP 传输，但同时也会增加 CPU 占用。


*默认值为 "20" 毫秒。*


```opensips title="Setting the connect_poll_interval parameter"
...
modparam("rest_client", "connect_poll_interval", 2)
...
```


#### max_async_transfers (integer)


*单个* OpenSIPS 工作进程允许同时运行的异步 HTTP 传输的最大数量。一旦某个工作进程达到该阈值，
它尝试执行的所有新的异步传输都将以阻塞方式完成，并会输出相应的日志告警。


*默认值为 "100"。*


```opensips title="Setting the max_async_transfers parameter"
...
modparam("rest_client", "max_async_transfers", 300)
...
```


#### max_transfer_size (integer)


单次传输（下载）所允许的最大大小。传输过程中达到该上限会立即终止传输，
并在脚本层返回错误 -10。取值为
**0** 时将禁用该检查。


*默认值为 "10240"（KB）。*


```opensips title="Setting the max_transfer_size parameter"
...
modparam("rest_client", "max_transfer_size", 64)
...
```


#### ssl_verifypeer (integer)


将其设为 0 可禁用对远端对端证书的校验。校验使用 libcurl 自带的默认 CA 证书包完成。


*默认值为 "1"（启用）。*


```opensips title="Setting the ssl_verifypeer parameter"
...
modparam("rest_client", "ssl_verifypeer", 0)
...
```


#### ssl_verifyhost (integer)


将其设为 0 可禁用对「远端对端确实与证书中列出的服务器相符」这一点的校验。


*默认值为 "1"（启用）。*


```opensips title="Setting the ssl_verifyhost parameter"
...
modparam("rest_client", "ssl_verifyhost", 0)
...
```


#### ssl_capath (string)


用于主机校验的 CA 证书的可选路径。


```opensips title="Setting the ssl_capath parameter"
...
modparam("rest_client", "ssl_capath", "/home/opensips/ca_certificates")
...
```


#### curl_http_version (integer)


为所有请求使用特定的 HTTP 版本。可选值：


- 0（默认）- 由 libcurl 自行决定
- 1 - 强制使用 HTTP 1.0 请求
- 2 - 强制使用 HTTP 1.1 请求
- 3 - 尝试使用 HTTP 2 请求。若无法与服务器协商 HTTP 2，
则回退到 HTTP 1.1。需要 libcurl 7.33.0+。
- 4 - 仅尝试在 TLS（HTTPS）之上使用 HTTP 2。若无法与 HTTPS 服务器协商 HTTP
2，则回退到 HTTP 1.1。
对于明文 HTTP 服务器，请使用 HTTP 1.1。
需要 libcurl 7.47.0+。
- 5 - 使用 HTTP 2 发出非 TLS 的 HTTP 请求，且不做 HTTP 1.1
升级。这需要事先知道服务器直接支持
HTTP 2。HTTPS 请求仍会以标准方式进行 HTTP/2，即在 TLS
握手中协商协议版本。需要 libcurl 7.49.0+。


*更多细节见[此处](https://curl.haxx.se/libcurl/c/CURLOPT_HTTP_VERSION.html)，本设置的文档即参考（其实是照搬）自该页面*


```opensips title="Setting the curl_http_version parameter"
...
modparam("rest_client", "curl_http_version", 3)
...
```


#### enable_expect_100 (boolean)


当 POST 或 PUT 请求的消息体大小超过 1024 字节时，附带一个 "Expect: 100-continue" HTTP 头域。
启用后，等待服务器返回 "100 Continue" 应答的超时为 1
秒，之后便开始上传消息体。


*默认值为 "false"（禁用）。*


```opensips title="Setting the enable_expect_100 parameter"
...
modparam("rest_client", "enable_expect_100", true)
...
```


#### no_concurrent_connects (boolean) {#no_concurrent_connects-boolean}


设为 *true* 时，同一时刻只允许一个 OpenSIPS
工作进程连接到给定的 URL 主机名。当某个工作进程正在连接时，
其他所有工作进程在尝试对同一主机名执行任何 rest_client 操作时都会收到错误码
**-4（已在连接中）**，无论该操作是同步还是异步。


对于同步传输，工作进程串行化的范围扩展到整个 cURL 传输（TCP 连接 + 上传 + 下载），
因为这三个阶段都在单次 cURL 库调用中完成。


本参数可用于防止因所有 OpenSIPS 工作进程并发阻塞在一个故障（挂起）的
HTTP 服务上而导致系统故障，以至于没有空闲工作进程来处理入站
SIP 报文。


*默认值为 "false"（禁用）。*


```opensips title="Setting the no_concurrent_connects parameter"
...
modparam("rest_client", "no_concurrent_connects", true)
...
```


#### curl_conn_lifetime (integer)


仅在启用 [no_concurrent_connects](#no_concurrent_connects-boolean) 时相关。
通过设置本参数，脚本开发者可以利用 libcURL 的连接复用能力，从而在某个 SIP 工作进程
已确知与目标 URL 主机名之间存在 TCP 连接（由先前的 rest_xxx() 函数调用建立）时，
完全跳过「无并发传输」逻辑。


该参数表示 libcURL 内为复用而保留的 TCP 连接的生命周期（以秒为单位）；该设置常与操作系统相关，
也可能受启用/禁用保活的影响。关于 cURL TCP 连接的最大生命周期，
请查阅操作系统和/或 libcurl 的文档。


*默认值为 *0*（禁用）。*


```opensips title="Setting the curl_conn_lifetime parameter"
...
modparam("rest_client", "curl_conn_lifetime", 1800)
...
```


### 导出的函数 {#exported-functions}


#### rest_get(url, body_pv, [ctype_pv], [retcode_pv]) {#rest_geturl-body_pv-ctype_pv-retcode_pv}


对给定的 *url* 执行阻塞式 HTTP GET，并返回资源的表示。


参数：


- *url* (string)
- *body_pv* (var) - 输出变量，用于保存
HTTP 响应的消息体。
- *ctype_pv* (var, 可选) - 输出变量，用于
保存响应的 "Content-Type:" 头域的值。
- *retcode_pv* (var, 可选) - 输出变量，用于
保存 HTTP 响应的状态码。
状态码值为 **0** 表示根本没有收到 HTTP
应答。


**返回码**


- **1** - 成功
- **-1** - 连接被拒绝。
- **-2** - 连接超时
（在能够建立 TCP 连接之前已超过 [connection_timeout](#connection_timeout-integer)）
- **-3** - 传输超时
（在收到最后一个字节之前已超过 [curl_timeout](#curl_timeout-integer)）。*retcode_pv* 可能
被设为 200 或 0，取决于是否收到 200 OK。
若收到，则 *body_pv* 将包含部分下载的数据，
风险自负！（建议仅将这些数据用于日志/调试目的）
- **-4** - 已在连接中
（另一个 OpenSIPS 工作进程正在连接该 URL 主机名。
更多信息请参考 [no_concurrent_connects](#no_concurrent_connects-boolean)）。
- **-10** - 内部错误（内存不足、
意外的 libcurl 错误等）


本函数可在任意路由中使用。


```opensips title="rest_get usage"
...
# 查询 REST 服务以获取账户余额的示例
$var(rc) = rest_get("https://getcredit.org/?account=$fU",
                    $var(credit),
                    $var(ct),
                    $var(rcode));
if ($var(rc) < 0) {
	xlog("rest_get() failed with $var(rc), acc=$fU\n");
	send_reply(500, "Server Internal Error");
	exit;
}

if ($var(rcode) != 200) {
	xlog("L_INFO", "rest_get() rcode=$var(rcode), acc=$fU\n");
	send_reply(403, "Forbidden");
	exit;
}
...
```


#### rest_post(url, send_body, [send_ctype], recv_body_pv, [recv_ctype_pv], [retcode_pv]) {#rest_posturl-send_body-send_ctype-recv_body_pv-recv_ctype_pv-retcode_pv}


对给定的 *url* 执行阻塞式 HTTP POST。


> [!NOTE]
> *send_body* 参数也可以接受格式字符串（format-string），
> 但其大小不能超过 1024 字节。对于更大的消息，必须在
> 伪变量中构建后再传给该函数。


参数：


- *url* (string)
- *send_body* (string) - 请求消息体。
- *send_ctype* (string, 可选) - 请求的 MIME
Content-Type 头域。默认为
*"application/x-www-form-urlencoded"*
- *recv_body_pv* (var) - 输出变量，用于
保存 HTTP 响应的消息体。
- *recv_ctype_pv* (var, 可选) - 输出
变量，用于保存响应的 "Content-Type"
头域的值
- *retcode_pv* (var, 可选) - 输出变量，
用于保存 HTTP 响应的状态码。
状态码值为 **0** 表示根本没有收到 HTTP
应答。


**返回码**


- **1** - 成功
- **-1** - 连接被拒绝。
- **-2** - 连接超时
（在能够建立 TCP 连接之前已超过 [connection_timeout](#connection_timeout-integer)）
- **-3** - 传输超时
（在收到最后一个字节之前已超过 [curl_timeout](#curl_timeout-integer)）。*retcode_pv* 可能
被设为 200 或 0，取决于是否收到 200 OK。
若收到，则 *body_pv* 将包含部分下载的数据，
风险自负！（建议仅将这些数据用于日志/调试目的）
- **-4** - 已在连接中
（另一个 OpenSIPS 工作进程正在连接该 URL 主机名。
更多信息请参考 [no_concurrent_connects](#no_concurrent_connects-boolean)）。
- **-10** - 内部错误（内存不足、
意外的 libcurl 错误等）


本函数可在任意路由中使用。


```opensips title="rest_post usage"
...
# 使用 HTTP POST 请求通过 RESTful 服务创建资源
$var(rc) = rest_post("https://myserver.org/register_user",
                     $fU, , $var(body), $var(ct), $var(rcode));
if ($var(rc) < 0) {
	xlog("rest_post() failed with $var(rc), user=$fU\n");
	send_reply(500, "Server Internal Error 1");
	exit;
}

if ($var(rcode) != 200) {
	xlog("rest_post() rcode=$var(rcode), user=$fU\n");
	send_reply(500, "Server Internal Error 2");
	exit;
}
...
```


#### rest_put(url, send_body, [send_ctype], recv_body_pv[, [recv_ctype_pv][, [retcode_pv]]]) {#rest_puturl-send_body-send_ctype-recv_body_pv-recv_ctype_pv-retcode_pv}


对给定的 *url* 执行阻塞式 HTTP PUT。


与 [rest_post()](#rest_posturl-send_body-send_ctype-recv_body_pv-recv_ctype_pv-retcode_pv) 类似，*send_body_pv*
参数也可以接受格式字符串，但其大小不能超过 1024 字节。对于
更大的消息，必须在伪变量中构建后再传给该函数。


参数：


- *url* (string)
- *send_body* (string) - 请求消息体。
- *send_ctype* (string, 可选) - 请求的 MIME
Content-Type 头域。默认为
*"application/x-www-form-urlencoded"*
- *recv_body_pv* (var) - 输出变量，用于
保存 HTTP 响应的消息体。
- *recv_ctype_pv* (var, 可选) - 输出变量，
用于保存响应的 "Content-Type" 头域的值
- *retcode_pv* (var, 可选) - 输出变量，
用于保存 HTTP 响应的状态码。
状态码值为 **0** 表示根本没有收到 HTTP
应答。


**返回码**


- **1** - 成功
- **-1** - 连接被拒绝。
- **-2** - 连接超时
（在能够建立 TCP 连接之前已超过 [connection_timeout](#connection_timeout-integer)）
- **-3** - 传输超时
（在收到最后一个字节之前已超过 [curl_timeout](#curl_timeout-integer)）。*retcode_pv* 可能
被设为 200 或 0，取决于是否收到 200 OK。
若收到，则 *body_pv* 将包含部分下载的数据，
风险自负！（建议仅将这些数据用于日志/调试目的）
- **-4** - 已在连接中
（另一个 OpenSIPS 工作进程正在连接该 URL 主机名。
更多信息请参考 [no_concurrent_connects](#no_concurrent_connects-boolean)）。
- **-10** - 内部错误（内存不足、
意外的 libcurl 错误等）


本函数可在任意路由中使用。


```opensips title="rest_put usage"
...
# 使用 HTTP PUT 请求通过 RESTful 服务创建/更新资源
$var(rc) = rest_put("https://myserver.org/users/$fU",
                    $var(userinfo), , $var(body), $var(ct), $var(rcode));
if ($var(rc) < 0) {
	xlog("rest_put() failed with $var(rc), user=$fU\n");
	send_reply(500, "Server Internal Error 3");
	exit;
}

if ($var(rcode) != 200) {
	xlog("rest_put() rcode=$var(rcode), user=$fU\n");
	send_reply(500, "Server Internal Error 4");
	exit;
}
...
```


#### rest_append_hf(txt)


将 *txt* 追加到后续请求的 HTTP 头域中。
通过在发起请求前多次调用，可以追加多个头域。


*txt* 的内容应符合
HTTP 头域的规范（例如 Field: Value）


参数


- *txt* (string)


本函数可在任意路由中使用。


```opensips title="rest_append_hf usage"
...
# 查询需要额外头域的 REST 服务的示例

rest_append_hf("Authorization: Bearer mF_9.B5f-4.1JqM");
$var(rc) = rest_get("http://getcredit.org/?account=$fU", $var(credit));
...
		
```


#### rest_init_client_tls(tls_client_domain)


强制在接下来的 GET/POST/PUT 请求中最多使用一次特定的 TLS 域。关于 TLS 客户端域的更多信息，
请参考 tls_mgm 模块。


如果使用本函数，还必须确保 tls_mgm 已加载并正确配置。


参数


- *tls_client_domain* (string)


本函数可在任意路由中使用。


```opensips title="rest_init_client_tls usage"
...
rest_init_client_tls("dom1");
if (!rest_get("https://example.com"))
    xlog("query failed\n");
...
		
```


### 导出的异步函数 {#exported-asynchronous-functions}


#### rest_get(url, body_pv[, [ctype_pv][, [retcode_pv]]])


执行异步 HTTP GET。本函数的行为与
**[rest_get()](#rest_geturl-body_pv-ctype_pv-retcode_pv)**
完全一致（在输入、输出和处理方面），
只是以非阻塞方式进行。脚本执行会暂停，直到
HTTP 响应的全部内容可用为止。


```opensips title="async rest_get usage"
route {
	...
	async(rest_get("http://getcredit.org/?account=$fU",
	               $var(credit), , $var(rcode)), resume);
}

route [resume] {
	$var(rc) = $rc;
	if ($var(rc) < 0) {
		xlog("async rest_get() failed with $var(rc), acc=$fU\n");
		send_reply(500, "Server Internal Error");
		exit;
	}

	if ($var(rcode) != 200) {
		xlog("L_INFO", "async rest_get() rcode=$var(rcode), acc=$fU\n");
		send_reply(403, "Forbidden");
		exit;
	}

	...
}
```


#### rest_post(url, send_body_pv, [send_ctype_pv], recv_body_pv[, [recv_ctype_pv][, [retcode_pv]]])


执行异步 HTTP POST。本函数的行为与
**[rest_post()](#rest_posturl-send_body-send_ctype-recv_body_pv-recv_ctype_pv-retcode_pv)**（在
输入、输出和处理方面）完全一致，只是以非阻塞方式进行。
脚本执行会暂停，直到 HTTP
响应的全部内容可用为止。


```opensips title="async rest_post usage"
route {
	...
	async(rest_post("http://myserver.org/register_user",
	                $fU, , $var(body), $var(ct), $var(rcode)), resume);
}

route [resume] {
	$var(rc) = $rc;
	if ($var(rc) < 0) {
		xlog("async rest_post() failed with $var(rc), user=$fU\n");
		send_reply(500, "Server Internal Error 1");
		exit;
	}
	if ($var(rcode) != 200) {
		xlog("async rest_post() rcode=$var(rcode), user=$fU\n");
		send_reply(500, "Server Internal Error 2");
		exit;
	}

	...
}
```


#### rest_put(url, send_body_pv, [send_ctype_pv], recv_body_pv[, [recv_ctype_pv][, [retcode_pv]]])


执行异步 HTTP PUT。本函数的行为与
**[rest_put()](#rest_puturl-send_body-send_ctype-recv_body_pv-recv_ctype_pv-retcode_pv)**（在
输入、输出和处理方面）完全一致，只是以非阻塞方式进行。
脚本执行会暂停，直到 HTTP
响应的全部内容可用为止。


```opensips title="async rest_put usage"
route {
	...
	async(rest_put("http://myserver.org/users/$fU", $var(userinfo), ,
	               $var(body), $var(ct), $var(rcode)), resume);
}

route [resume] {
	$var(rc) = $rc;
	if ($var(rc) < 0) {
		xlog("async rest_put() failed with $var(rc), user=$fU\n");
		send_reply(500, "Server Internal Error 3");
		exit;
	}
	if ($var(rcode) != 200) {
		xlog("async rest_put() rcode=$var(rcode), user=$fU\n");
		send_reply(500, "Server Internal Error 4");
		exit;
	}

	...
}
```


### 导出的脚本变换 {#exported-script-transformations}


本模块还提供了一种按照
RFC3986 对任意脚本变量中所含参数进行编码和解码的方式。其做法是对包含待编码数据的脚本
变量施加一个变换。原变量的值不会被改动，而是返回相应的字符串值。
该变换通过 libcurl API 方法 curl_easy_escape（对于 libcurl < 7.15.4 则为 curl_escape）完成。


#### {rest.escape}


本变换的结果是生成百分比编码的字符串值，可安全用于 URI 构造。


本变换没有参数。


```opensips title="rest.escape usage"
...
# 本示例将产生日志条目："Output: call%40example.com%26safe%3Dfalse"
$var(tmp) = "call@example.com&safe=false";
xlog("Output: $(var(tmp){rest.escape})\n");

# 在传输前对 call ID 进行编码：
$var(rc) = rest_get("https://call-info.org/?id=$(ci{rest.escape})", $var(body_pv));
...
                
```


#### {rest.unescape}


本变换的结果是对百分比编码的字符串值进行解码。


本变换没有参数。


```opensips title="rest.unescape usage"
...
# 本示例将产生日志条目："Output: 1+1=2!"
$var(tmp) = "1%2B1%3D2%21";
xlog("Output: $(var(tmp){rest.unescape})\n");

# 本示例将产生日志条目："OpenSIPs, tastes better with every SIP!"
$var(tmp) = "OpenSIPs%2C%20tastes%20better%20with%20every%20SIP%21";
xlog("$(var(tmp){rest.unescape})\n");
...
                
```
<!-- CONTRIBUTORS -->

### 许可证 {#license}

所有文档文件（即 .md 扩展名的文件）均按 Creative Common License 4.0 许可发布
