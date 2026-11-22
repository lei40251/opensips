---
title: "httpd 模块"
description: "本模块为 OpenSIPS 提供 HTTP 传输层。"
---

## 管理指南 {#admin-guide}


### 概述 {#overview}


本模块为 OpenSIPS 提供 HTTP 传输层。


httpd 模块的 http 服务器的实现基于
libmicrohttpd 库。


### 概述 {#overview-1}


通过设置 `tls_cert_file`
和 `tls_key_file` 参数启用 http 服务器的 TLS。如果启用，
则禁用对纯 http 的支持。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


以下模块必须在本模块之前加载：


- *不依赖其他 OpenSIPS 模块*。


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，必须安装
以下库或应用程序：


- *libmicrohttpd*，需支持 EPOLL。这
通常意味着版本新于 **0.9.50**。


**警告！**  请注意 *libmicrohttpd*
库及其打包中存在一个影响 OpenSIPS httpd 模块的
EPOLL 支持回归问题，该问题
已按下述时间线修复。该回归的影响是
HTTP 应答体*有时*不会被库写入，
导致客户端（例如 opensips-cli）
无期限挂起等待：


- 版本 **0.9.51** - **0.9.52**
已测试且工作正常
- 回归在 **0.9.53**（2017 年 4 月）引入，
持续到 **0.9.71**（2020 年 5 月）
- 自 **0.9.72**（2020 年 12 月）起该回归已修复


### 导出的参数 {#exported-parameters}


#### ip(string)


HTTP 服务器用于监听传入请求的
IP 地址。


*默认值为 "*"*（绑定到所有 IPv6 和 IPv4 接口）。


```opensips title="设置 ip 参数"
...
modparam("httpd", "ip", "127.0.0.1")
...
```


#### port(integer)


HTTP 服务器用于监听传入请求的
端口号。


*默认值为 8888。*
不接受低于 1024 的端口。


```opensips title="设置 port 参数"
...
modparam("httpd", "port", 8000)
...
```


#### conn_timeout(integer)


自动关闭空闲时间超过指定超时（以秒为单位）的
TCP 连接。设为零则从不关闭任何连接。


> [!NOTE]
> 连接自动关闭例程似乎只以 "按需" 方式
> 执行，即在 HTTPD 网络事件（例如新的
> 连接）期间执行，这虽然不理想，但在实际使用中
> 应已足够。


*默认超时为 30 秒。*


```opensips title="设置 conn_timeout 参数"
...
modparam("httpd", "conn_timeout", 10)
...
```


#### buf_size (integer)


指定用于写入 html 响应的缓冲区的
最大长度（以字节为单位）。


如果缓冲区大小设为零，将自动
设为 pkg 内存大小的四分之一。


*默认值为 0。*


```opensips title="设置 buf_size 参数"
...
modparam("httpd", "buf_size", 524288)
...
```


#### post_buf_size (integer)


指定处理 POST HTTP 请求的缓冲区的
长度（以字节为单位）。对于较大的
POST 请求，可能需要增大默认值。


*默认值为 1024。最小值为 256。*


```opensips title="设置 post_buf_size 参数"
...
modparam("httpd", "post_buf_size", 4096)
...
```


#### receive_buf_size (integer)


指定接收的 HTTP 请求的最大长度（以字节为单位）。
接收较大的 POST 请求时，可能需要增大默认值。


*默认值为 1024。*


```opensips title="设置 receive_buf_size 参数"
...
modparam("httpd", "receive_buf_size", 4096)
...
```


#### tls_cert_file (string)


httpd 的公共证书文件。它将用作传入 TLS 连接的服务端证书。


*默认值为 ""*


```opensips title="设置 tls_cert_file 参数"
...
modparam("httpd", "tls_cert_file", "/etc/opensips/tls/server.pem")
...
```


#### tls_key_file (string)


上述证书的私钥。必须保存在安全位置并设置严格的权限！


*默认值为 ""*


```opensips title="设置 tls_key_file 参数"
...
modparam("httpd", "tls_key_file", "/etc/opensips/tls/server.key")
...
```


#### tls_ciphers (string)


可以指定允许用于鉴权和加密的算法列表。
要获取密码套件列表并从中选择，请使用 gnutls-cli 应用程序：


- gnutls-cli -l


> [!WARNING]
> 不要使用 NULL 算法（不加密）……绝对不要！！！


*默认值为  "SECURE256:+SECURE192:-VERS-ALL:+VERS-TLS1.2"*


```opensips title="设置 tls_key_file 参数"
...
modparam("httpd", "tls_ciphers", "SECURE256:+SECURE192:-VERS-ALL:+VERS-TLS1.2")
...
```


### 导出的 MI 函数 {#exported-mi-functions}


#### httpd_list_root_path


列出 httpd 模块中所有已注册的 http 根路径。
当有请求到来时，如果该根路径在列表中，
请求将被发送到注册它的模块。


名称：*httpd_list_root_path*


参数：无


MI FIFO 命令格式：


```bash
opensips-cli -x mi httpd_list_root_path
		
```


### 导出的函数 {#exported-functions}


没有导出可在配置文件中使用的函数。


### 已知问题 {#known-issues}


由于 OpenSIPS 是多进程应用，
microhttpd 库以 "external select" 模式使用。
这确保该库不以多线程模式运行，
且完全由 OpenSIPS 控制。由于这种特定的
运行模式，目前整个 http 响应都在预先分配的
缓冲区中构建（参见 buf_size 参数）。


本模块将来的版本将解决该问题。


在 linux（内核 >=2.6.24）中，默认禁止以非 root 身份
在低于 1024 的端口上运行 http 守护进程。
为允许绑定该端口，可以使用
*setcap* 为 opensips 二进制文件授予
额外权限：


```c
setcap 'cap_net_bind_service=+ep' /usr/local/sbin/opensips
		
```


## 开发者指南 {#developer-guide}


### 可用函数 {#available-functions}


#### register_httpdcb (module, root_path, httpd_acces_handler_cb, httpd_flush_data_cb, httpd_init_proc_cb)


在 httpd 模块中注册一个新的 http 根路径及其关联的回调。


参数含义如下：


- *const char *mod*
			- 注册由该模块处理的 http 根路径的模块名；
- *str *root_path*
			- 注册的根路径；
- *httpd_acces_handler_cb f1*
			- 根路径匹配时调用的回调方法处理函数；
- *httpd_flush_data_cb f2*
			- 用于（稍后）发送额外数据的回调方法处理函数；
- *httpd_init_proc_cb f3*
			- httpd 进程初始化期间调用的回调方法处理函数；
<!-- CONTRIBUTORS -->

### 许可证 {#license}

本项目的所有文档文件（即 .md 扩展名的文件）均以 Creative Common License 4.0 授权。
