---
title: "http2d 模块"
description: "本模块基于 nghttp2 库提供了一个支持 h2 ALPN 的 RFC 7540/9113 HTTP/2 服务器实现。"
---


## 管理指南 {#admin-guide}


### 概述 {#overview}


本模块基于 **nghttp2** 库（[https://nghttp2.org/](https://nghttp2.org/)）提供了一个
支持 "h2" ALPN 的 RFC 7540/9113 HTTP/2 服务器实现。


HTTP/2 于 2015 年引入，是一种二进制协议，新增了事务层（SESSION、FRAME），
可识别并管理同一 TCP/TLS 连接上的多个并发传输。
因此，该修订版协议的主要目标是通过减少加载给定网页时执行的
TCP 和/或 TLS 握手次数，降低客户端与服务端的资源占用。


OpenSIPS **http2d** 服务器同时支持 "h2"（TLS 加密）
和 "h2c"（明文）HTTP/2 连接。请求通过 [E_HTTP2_REQUEST](#e_http2_request) 事件
到达 *opensips.cfg* 层，脚本编写者可在此处理数据并作出相应应答。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


无。


#### 外部库或应用程序 {#external-libraries-or-applications}


HTTP/2 服务器由 **nghttp2** 库提供，
它运行在 **libevent** 服务器框架之上。


总体而言，在加载本模块运行 OpenSIPS 之前，
必须安装以下库：


- *libnghttp2*
- *libevent*、*libevent_openssl*
- *libssl*、*libcrypto*


### 导出的参数 {#exported-parameters}


#### ip (string)


监听的 IPv4 地址。


默认值为 *"127.0.0.1"*。


```opensips title="Setting the ip parameter"
modparam("http2d", "ip", "127.0.0.2")
```


#### port (integer)


监听端口。


默认值为 *443*。


```opensips title="Setting the port parameter"
modparam("http2d", "port", 5000)
```


#### tls_cert_path (string)


TLS 证书的文件路径，PEM 格式。


默认值为 *NULL*（未设置）。


```opensips title="Setting the tls_cert_path parameter"
modparam("http2d", "tls_cert_path", "/etc/pki/http2/cert.pem")
```


#### tls_key_path (string)


TLS 私钥的文件路径，PEM 格式。


默认值为 *NULL*（未设置）。


```opensips title="Setting the tls_key_path parameter"
modparam("http2d", "tls_key_path", "/etc/pki/http2/private/key.pem")
```


#### max_headers_size (integer)


服务器处理的单个 HTTP/2 请求中，所有头域名称与取值
合计允许的最大字节数。一旦达到
该阈值，额外的头域将不再提供给脚本
层，而是作为错误上报。


默认值为 *8192* 字节。


```opensips title="Setting the max_headers_size parameter"
modparam("http2d", "max_headers_size", 16384)
```


#### response_timeout (integer)


库允许 opensips.cfg 处理某个 HTTP/2 请求所占用的
最长时间，单位为毫秒。


一旦达到该超时，模块会自动生成一个
408（请求超时）应答。


默认值为 *2000* 毫秒。


```opensips title="Setting the response_timeout parameter"
modparam("http2d", "response_timeout", 5000)
```


### 导出的函数 {#exported-functions}


#### http2_send_response(code, [headers_json], [data]) {#http2_send_responsecode-headers_json-data}


为正在处理的 HTTP/2 请求发送响应。模块会自动
将 *":status"* 头域作为第一个头域加入，因此不得将其
包含在 *headers_json* 数组中。


*参数*


- *code* (integer) - HTTP/2 应答码
- *headers_json* (string, default: *NULL*)
				- 可选，JSON 数组，包含 {"header": "value"} 元素，表示要加入响应消息的 HTTP/2
头域及其取值。
- *data* (string, default: *NULL*)
				- 可选，要包含在响应消息中的 DATA 载荷。


*返回值*


- **1** - 成功
- **-1** - 内部错误


该函数只能在 *EVENT_ROUTE* 中使用。


```opensips title="http2_send_response() usage"
event_route [E_HTTP2_REQUEST] {
  xlog(":: Method:  $param(method)\n");
  xlog(":: Path:    $param(path)\n");
  xlog(":: Headers: $param(headers)\n");
  xlog(":: Data:    $param(data)\n");

  $json(hdrs) := $param(headers);
  xlog("content-type: $json(hdrs/content-type)\n");

  $var(rpl_headers) = "[
	{ \"content-type\": \"application/json\" },
	{ \"server\": \"OpenSIPS 3.5\" },
	{ \"x-current-time\": \"1711457142\" },
	{ \"x-call-cost\": \"0.355\" }
  ]";

  $var(data) = "{\"status\": \"success\"}";

  if (!http2_send_response(200, $var(rpl_headers), $var(data)))
    xlog("ERROR - failed to send HTTP/2 response\n");
}
```


### 导出的事件 {#exported-events}


#### E_HTTP2_REQUEST {#e_http2_request}


当加载了 *http2d*
模块且 OpenSIPS 在配置的监听接口上收到 HTTP/2 请求时，
会触发该事件。


参数：


- *method (string)* - ":method" HTTP/2 头域的取值
- *path (string)* - ":path" HTTP/2 头域的取值
- *headers (string)* - 包含请求全部头域的 JSON 数组，
含伪头域
- *data (string, default: NULL)* - 若请求包含
载荷，该参数将保存其内容


注意，该事件目前主要设计为由 *event_route* 消费，
因为这是访问 [http2_send_response()](#http2_send_responsecode-headers_json-data)
函数以构建自定义响应消息的唯一途径。另一方面，
如果应用不在意应答始终为无载荷的 200，
则该事件可通过任何其他兼容 EVI 的投递通道成功消费 ☺️
<!-- CONTRIBUTORS -->

### 许可证 {#license}

所有文档文件（即 .md 扩展名）均按 Creative Common License 4.0 许可发布
