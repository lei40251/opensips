---
title: "MSRP Relay 模块"
description: "本模块按照 RFC 4976 的规范实现 MSRP 协议的中继。"
sidebar: false
---


## 管理指南 {#admin-guide}


### 概述 {#overview}


本模块按照 RFC 4976 的规范实现 MSRP 协议的中继。加载后，模块会自动为脚本中定义的 MSRP 监听地址转发消息并管理 MSRP 会话。


为了对 MSRP 客户端进行鉴权，会运行一个专用的脚本路由，通过伪变量检查 Digest 凭据。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


以下模块必须在本模块之前加载：


- *proto_msrp*


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，必须安装以下库或应用程序：


- *openssl* 或
*libssl*
- *openssl-dev* 或
*libssl-dev*


### 导出参数 {#exported-parameters}


#### hash_size (int)


用于存储 MSRP 会话的哈希表大小。它是实际大小的以 2 为底的对数值。


*默认值为 "10"*
（1024 条记录）。


```opensips title="设置 hash_size 参数"
...
modparam("msrp_relay", "hash_size", 10)
...
		
```


#### cleanup_interval (int)


完整遍历会话表以清理过期 MSRP 会话之间的间隔。注意，会话会在内存中保留，保留时长由对 AUTH 请求的 200 OK 应答中提供的 *Expires* 值决定。


*默认值为 "60"。*


```opensips title="设置 cleanup_interval 参数"
...
modparam("msrp_relay", "cleanup_interval", 30)
...
		
```


#### auth_route (str) {#auth_route-str}


对 MSRP 客户端进行授权（收到带 Authorization 头域的 AUTH 请求）时要调用的脚本路由名称。在此处应通过 [password_var](#password_var-string) 伪变量为凭据提供合适的密码（或预先计算好的 HA1 字符串），以便中继校验客户端的应答。


*无默认值；该参数为必填。*


```opensips title="设置 auth_route 参数"
...
modparam("msrp_relay", "auth_route", "auth")
...
		
```


#### username_var (string)


保存鉴权用户名的伪变量名称。


默认值为 "$var(username)"。


```opensips title="username_var 参数用法"
modparam("msrp_relay", "username_var", "$var(msrp_auth_user)")
```


#### realm_var (string)


保存鉴权 realm 的伪变量名称。


默认值为 "$var(realm)"。


```opensips title="realm_var 参数用法"
modparam("msrp_relay", "realm_var", "$var(msrp_auth_realm)")
```


#### password_var (string) {#password_var-string}


该伪变量的名称，需在 [auth_route](#auth_route-str) 脚本路由中设置，以便在鉴权时校验客户端应答。所设置的值可以是明文密码，也可以是依据该参数预先计算好的 HA1 字符串。


默认值为 "$var(password)"。


```opensips title="password_var 参数用法"
modparam("msrp_relay", "password_var", "$var(msrp_auth_password)")
```


#### calculate_ha1 (integer)


该参数配置是否应将 [password_var](#password_var-string) 伪变量的值视为明文密码还是预先计算好的 HA1 字符串。


该参数的默认值为 0（HA1 字符串）。


```opensips title="calculate_ha1 参数用法"
modparam("msrp_relay", "calculate_ha1", 1)
```


#### socket_route (str) {#socket_route-str}


可选参数，开始中继新的 MSRP 会话（在首个 SEND 时）要调用的脚本路由名称。该路由的用途是让你选择用于发出 MSRP 请求的合适出站套接字。


在该路由内部，将暴露所收到请求的以下信息：


- *源网络信息*，通过
`$si`、`$sp`、
`$sP` 和 `$socket_in`
变量提供。
- *目标 URL schema*，通过
[dst_schema_var](#dst_schema_var-string) 变量提供
- *目标 URL 主机*，通过
[dst_host_var](#dst_host_var-string) 变量提供


在该路由中，你可以选择通过 `$socket_out` 变量设置所需的 MSRP(S) 出站套接字。如果未设置任何值，且 schema（MSRP 与 MSRPS）相同，则入站接口也将被用作出站接口。如果 schema 发生变化，则使用第一个（与出站 schema 匹配的）套接字。


默认值为 "NULL"（无）。


```opensips title="设置 socket_route 参数"
...
modparam("msrp_relay", "socket_route", "msrp_routing")

route[msrp_routing] {
	xlog("MSRP request comming from $si:$sp on $socket_in socket\n");
	xlog("trying to go to $var(dst_schema)://$var(dst_host)\n");

	$socket_out = "msrp:1.2.3.4:9999";
}
...
		
```


#### dst_schema_var (string) {#dst_schema_var-string}


该变量名称，用于在 socket 路由中提供目标 URL 的 schema（"msrp" 或 "msrps"）。详情参见 [socket_route](#socket_route-str) 参数。


默认值为 "$var(dst_schema)"。


#### dst_host_var (string) {#dst_host_var-string}


该变量名称，用于在 socket 路由中提供目标 URL 的主机。详情参见 [socket_route](#socket_route-str) 参数。


默认值为 "$var(dst_host)"。


#### auth_realm (string)


当中继自动向 MSRP 客户端发起质询时，在 WWW-Authenticate 头域中提供的 realm。


如果未设置该参数，中继选择的 realm 为 AUTH 请求 To-Path 头域中顶层 MSRP URI 的域部分。


```opensips title="auth_realm 参数用法"
modparam("msrp_relay", "auth_realm", "opensips.org")
```


#### auth_expires (int)


对 AUTH 请求的 200 OK 应答中提供的 *Expires* 头域值，前提是客户端未显式请求该值。它表示中继在 Use-Path 头域中提供的 MSRP URI 的有效期。


*默认值为 "1800"*
（1024 条记录）。


```opensips title="设置 auth_expires 参数"
...
modparam("msrp_relay", "auth_expires", 600)
...
	
```


#### auth_min_expires (int)


中继在 *Expires* 头域中接受的最小值，前提是客户端在 AUTH 请求中提供了该头域。如果请求的值低于该参数，中继会在 423 Interval Out-of-Bounds 应答中包含一个带有配置值的 *Min-Expires* 头域。


如果未设置，中继将接受任意值。


```opensips title="设置 auth_min_expires 参数"
...
modparam("msrp_relay", "auth_min_expires", 60)
...
	
```


#### auth_max_expires (int)


中继在 *Expires* 头域中接受的最大值，前提是客户端在 AUTH 请求中提供了该头域。如果请求的值高于该参数，中继会在 423 Interval Out-of-Bounds 应答中包含一个带有配置值的 *Max-Expires* 头域。


如果未设置，中继将接受任意值。


```opensips title="设置 auth_max_expires 参数"
...
modparam("msrp_relay", "auth_max_expires", 60)
...
	
```


#### nonce_expire (integer)


nonce 具有有限的生命周期。经过给定时间后，nonce 将被视为无效。这是为了防止重放攻击。包含过期 nonce 的凭据将不被授权，但用户代理会被再次质询。此次质询将包含 `stale` 参数，向客户端表明它无需再次打断用户索取用户名和密码，而可以用现有的用户名和密码重新计算凭据。


该值以秒为单位，默认值为 30 秒。


```opensips title="nonce_expire 参数示例"
modparam("msrp_relay", "nonce_expire", 15)   # 将 nonce_expire 设为 15 秒
```


#### my_uri (string)


本中继的 MSRP URI，将与所收到的任何请求或应答中 To-Path 头域的第一个 URI 进行匹配。不是发给本中继的消息将被丢弃。


中继在 Use-Path 头域中提供的 MSRP URI 将根据 AUTH 请求 To-Path 头域中的 URI 来选择。


该参数可多次设置


如果未显式设置端口，将采用默认值 2855。不应设置 URI 的 session-id 部分


```opensips title="my_uri 参数用法"
modparam("msrp_relay", "my_uri", "msrp://opensips.org:2855;tcp")
```
<!-- CONTRIBUTORS -->

### 许可 {#license}

所有文档文件（即 .md 扩展名）均按 Creative Common License 4.0 授权。
