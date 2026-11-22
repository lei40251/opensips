---
title: "auth 模块"
description: "本模块提供其他鉴权相关模块共同需要的通用函数，也可从伪变量中取出用户名与密码来执行鉴权。"
sidebar: false
---


## 管理指南 {#admin-guide}


### 概述 {#overview}


本模块提供其他鉴权相关模块共同需要的通用函数。此外，它还可以从伪变量中取出用户名与密码来执行鉴权。


#### RFC 8760 支持（强化鉴权）{#rfc-8760-support-strenghtened-authentication}


从 OpenSIPS 3.2 开始，auth、
[auth_db](/zh/modules/auth_db) 与
[uac_auth](/zh/modules/uac_auth)
模块按
[RFC 8760](https://datatracker.ietf.org/doc/html/rfc8760)
规范，支持两种新的摘要鉴权算法
（"SHA-256" 与 "SHA-512-256"）。


### nonce 安全性 {#nonce-security}


鉴权机制提供了针对嗅探入侵的防护。
模块生成并校验 nonce，使其只能被使用
一次（在一次鉴权应答中）。实现方式是让每个
nonce 都带有一个生存期值和一个索引。
仅使用过期值并不够，因为该值
只能是几十秒，攻击者有可能在网络中嗅探、
取得凭据，然后在另一个报文中重用它们，
从而注册一个不同的 Contact 或使用他人的
账号发起呼叫。索引在 nonce 的整个生存期内
唯一生成，因此可确保这种情况永远不会发生。


可被鉴权的请求默认上限为 30 秒内 100000 个。
如果希望调整，可以缩短 nonce 的生存期
（等待质询应答的时间）。但要注意不要
把它设得过小。


不过，该机制不适用于多台服务器共用同一
DNS 名称做负载均衡的集群架构。这种情况下，
可以通过设置模块参数
'disable_nonce_check' 来关闭 nonce 可重用性检查。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


本模块依赖以下模块（换言之，
所列模块必须先于本模块加载）：


- *signaling* —— 信令模块


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，
必须安装以下库或应用程序：


- *无*


### 导出的参数 {#exported-parameters}


#### secret (string)


用于计算 nonce 值的密钥短语。
长度必须恰好为 32 个字符。


默认使用核心中随机源生成的随机值。


如果部署中使用多台服务器，并希望第二台服务器能够
对第一台服务器生成的 nonce 进行鉴权，就必须
在所有服务器上显式设置相同的 secret 值。
不过，使用共享（固定）的 secret 作为 nonce 并不安全，
更好的做法是保持默认值。任何客户端都应把应答发送给
发出请求的那台服务器。


```opensips title="secret parameter example"
modparam("auth", "secret", "johndoessecretphrase")
```


#### nonce_expire (integer)


nonce 有有限的生存期。超过给定时间后，
nonce 将被视为无效。这是为了防止重放攻击。
携带过期 nonce 的凭据将不被授权，但
用户代理会再次收到质询。这一次质询将
包含 `stale` 参数，向客户端表明
它不必再打扰用户索要用户名
与密码，可以用已有的用户名
与密码重新计算凭据。


该值以秒为单位，默认值为 30 秒。


```opensips title="nonce_expire parameter example"
modparam("auth", "nonce_expire", 15)   # 将 nonce_expire 设为 15 秒
```


#### rpid_prefix (string)


要添加到 Remote-Party-ID 头域中、紧跟在
来自 RADIUS 或数据库的 URI 之前的前缀。


默认值为 ""。


```opensips title="rpid_prefix parameter example"
modparam("auth", "rpid_prefix", "Whatever <")
```


#### rpid_suffix (string)


要添加到 Remote-Party-ID 头域中、位于来自
RADIUS 或数据库的 URI 之后的后缀。


默认值为
";party=calling;id-type=subscriber;screen=yes"。


```opensips title="rpid_suffix parameter example"
modparam("auth", "rpid_suffix", "@1.2.3.4>")
```


#### realm_prefix (string)


要从 realm 中自动去除的前缀。作为
SRV 记录的替代方案（并非所有 SIP 客户端都支持 SRV 查询），
可以为 SIP 用途定义主域的一个子域（例如
sip.mydomain.net 指向与 mydomain.net 的 SRV
记录相同的 IP 地址）。鉴权时忽略 realm_prefix
"sip."，sip.mydomain.net 就
等同于 mydomain.net 。


默认值为空字符串。


```opensips title="realm_prefix parameter example"
modparam("auth", "realm_prefix", "sip.")
```


#### rpid_avp (string)


用于存放 RPID 值的 AVP 的完整 AVP 定义。
它用于把 RPID 值从鉴权后端模块
（auth_db 或 auth_radius）或从
脚本传送到鉴权函数 append_rpid_hf 与 is_rpid_user_e164。


如果定义为 NULL 字符串，所有 RPID 函数
在运行时都会失败。


默认值为 "$avp(rpid)"。


```opensips title="rpid_avp parameter example"
modparam("auth", "rpid_avp", "$avp(caller_rpid)")
		
```


#### username_spec (string)


用于存放用户名的伪变量名称。


默认值为 "NULL"。


```opensips title="username_spec parameter usage"
modparam("auth", "username_spec", "$var(username)")
```


#### password_spec (string)


用于存放密码的伪变量名称。


默认值为 "NULL"。


```opensips title="password_spec parameter usage"
modparam("auth", "password_spec", "$var(password)")
```


#### calculate_ha1 (integer)


该参数告知服务器：应当期望伪变量中存放的是明文
密码，还是预先计算好的 HA1 字符串。


如果参数设为 1，服务器将假定
"password_spec" 伪变量中包含明文密码，
并即时计算 HA1 字符串。如果参数设为 0，
服务器则假定伪变量中直接保存 HA1 字符串，
不做计算。


该参数默认值为 0。


```opensips title="calculate_ha1 parameter usage"
modparam("auth", "calculate_ha1", 1)
```


#### disable_nonce_check (int)


通过设置该参数，可以关闭防止嗅探入侵、
不允许 nonce 被重用的安全机制。但由于
当前实现的原因，启用该机制会使采用同一
DNS 名称、多台服务器做负载均衡的架构中的鉴权
失效。这种情况下必须设置该参数。


默认值为 "0"（启用 nonce 检查）。


```opensips title="disable_nonce_check parameter usage"
modparam("auth", "disable_nonce_check", 1)
```


### 导出的函数 {#exported-functions}


#### www_challenge(realm[, qop[, algorithms]]) {#www_challengerealm-qop-algorithms}


该函数向用户代理发起质询。它将生成一个或
多个包含摘要质询的 WWW-Authorize 头域，把这些
头域放入服务器正在处理的请求所生成的应答中，
并发送该应答。用户代理收到这样的应答后，
应计算凭据并重试请求。关于摘要鉴权的更多信息，
参见 RFC2617、RFC3261 与 RFC8760。


各参数含义如下：


- *realm* (string) - realm 是一个不透明的字符串，
用户代理应将其呈现给用户，以便用户决定使用
哪个用户名与密码。通常它是服务器所在主机的
域。如果使用空字符串 ""，服务器将
根据请求生成它。对于 REGISTER 请求的 To
头域，将使用其域（因为该头域
表示正在注册的用户）；对于所有其他消息，将使用
From 头域的域。
- *qop* (string, optional) - 该
参数的值可以是 "auth"、"auth-int"
或两者（以 *,* 分隔）。设置该参数后，
服务器会在质询中放入 qop 参数。建议
使用 qop 参数，但仍有一些
用户代理无法正确处理 qop，因此将其设为可选。
另一方面，也仍有一些用户代理无法处理
不带 qop 参数的请求。
目前启用该参数并不会提升安全性，
因为序列号未被存储，因而无法
校验。实际上，模块在质询与应答请求期间
不保留任何信息。
- *algorithms* (string, optional) - 该
参数的值为以逗号分隔的摘要算法列表，供
UAC 选择用于鉴权。可能的值有：

  - MD5
  - MD5-sess
  - SHA-256
  - SHA-256-sess
  - SHA-512-256
  - SHA-512-256-sess
当值为空或未设置时，唯一提供的摘要
算法是 *MD5*，以兼容
RFC8760 之前的 UAC 实现。
值可以按任意顺序列出。SIP 应答中各质询的
实际顺序由 RFC8760 规定：从较强的
算法到较弱的算法。


该函数可在 REQUEST_ROUTE 中使用。


```opensips title="www_challenge usage"
...
if (!www_authorize("siphub.net", "subscriber")) {
	www_challenge("siphub.net", "auth,auth-int", "MD5,SHA-512-256");
}
...
```


#### proxy_challenge(realm[, qop[, algorithms]])


该函数向用户代理发起质询。它将生成一个
包含摘要质询的 Proxy-Authorize 头域，把
该头域放入服务器正在处理的请求所生成的应答中
并发送该应答。用户代理收到这样的
应答后，应计算凭据并重试请求。
关于摘要鉴权的更多信息，参见 RFC2617、
RFC3261 与 RFC8760。


参数说明参见 [www_challenge()](#www_challengerealm-qop-algorithms)
一节。


该函数可在 REQUEST_ROUTE 中使用。


```opensips title="proxy_challenge usage"
...
$var(secure_algorithms) = "sha-256,sha-512-256";
...
if (!proxy_authorize("", "subscriber")) {
...
	proxy_challenge("", "auth", $var(secure_algorithms));  # realm 将被自动生成
							       # 不允许使用 MD5
}
...
```


#### consume_credentials()


该函数从服务器正在处理的消息中移除此前
已授权的凭据。这意味着下游消息将不包含
本服务器使用过的凭据。这确保代理不会
向下游网元泄露所用凭据的信息，同时也使消息
稍微短一些。该函数必须在
`www_authorize` 或
`proxy_authorize` 之后调用。


该函数可在 REQUEST_ROUTE 中使用。


```opensips title="consume_credentials example"
...
if (www_authorize("", "subscriber")) {
    consume_credentials();
}
...
```


#### is_rpid_user_e164()


该函数检查从数据库或
RADIUS 服务器获取、且可能被用于 Remote-Party-ID 头域
的 SIP URI，其用户部分是否包含 E164 号码（+ 后跟最多
15 位十进制数字）。如果不存在这样的 SIP URI
（即 RADIUS 服务器或数据库未提供该信息），检查失败。


该函数可在 REQUEST_ROUTE 中使用。


```opensips title="is_rpid_user_e164 usage"
...
if (is_rpid_user_e164()) {
    # 在此处执行相应处理
}
...
```


#### append_rpid_hf() {#append_rpid_hf}


向消息追加一个 Remote-Party-ID 头域，其中包含头域
'Remote-Party-ID: '，其后是保存的、来自数据库
或 RADIUS 服务器的 SIP URI，再后是
模块参数 radius_rpid_suffix 的值。如果
不存在已保存的 SIP URI，该函数不做任何操作。


该函数可在 REQUEST_ROUTE、FAILURE_ROUTE、
BRANCH_ROUTE 中使用。


```opensips title="append_rpid_hf usage"
...
append_rpid_hf();  # 追加 Remote-Party-ID 头域
...
```


#### append_rpid_hf(prefix, suffix)


该函数与
[append_rpid_hf()](#append_rpid_hf) 相同。唯一区别
在于它接受两个参数——要添加到
Remote-Party-ID 头域的 prefix 与 suffix。该函数忽略 rpid_prefix 与
rpid_suffix 参数，而是允许在每次
调用时设置它们。


各参数含义如下：


- *prefix* (string) - Remote-Party-ID URI 的
前缀。该字符串将添加到头域
消息体的开头，紧邻 URI 之前。
- *suffix* (string) - Remote-Party-ID
头域的后缀。该字符串将追加到头域的
末尾。例如，它可以用来设置各种 URI 参数。


该函数可在 REQUEST_ROUTE、FAILURE_ROUTE、
BRANCH_ROUTE 中使用。


```opensips title="append_rpid_hf(prefix, suffix) usage"
...
# 追加 Remote-Party-ID 头域
append_rpid_hf("", ";party=calling;id-type=subscriber;screen=yes");
...
```


#### pv_www_authorize(realm)


该函数按
[RFC2617](http://www.ietf.org/rfc/rfc2617.txt) 校验凭据。
如果凭据校验成功，函数将成功返回
并把凭据标记为已授权（被标记的凭据后续可
供其他函数使用）。如果函数因某种原因无法校验
凭据，则失败，脚本应
调用 `www_challenge`，由它对
用户重新发起质询。


负值返回码的含义如下：


- *-5 (generic error)* - 发生了某种通用错误，
未发出任何应答；
- *-4 (no credentials)* - 请求中未找到
凭据；
- *-3 (stale nonce)* - nonce 已过期；
- *-2 (invalid password)* - 用户有效，但
密码错误；
- *-1 (invalid user)* - 鉴权用户
不存在。


各参数含义如下：


- *realm* (string) - realm 是一个不透明的字符串，
用户代理应将其呈现给用户，以便用户决定使用
哪个用户名与密码。通常它是服务器所在主机的
域。如果使用空字符串 ""，服务器将
根据请求生成它。对于 REGISTER 请求，将使用 To
头域的域（因为该头域
表示正在注册的用户）；对于所有其他消息，将使用
From 头域的域。


该函数可在 REQUEST_ROUTE 中使用。


```opensips title="pv_www_authorize usage"
...
$var(username)="abc";
$var(password)="xyz";
if (!pv_www_authorize("opensips.org")) {
	www_challenge("opensips.org", "auth");
}
...
```


#### pv_proxy_authorize(realm)


该函数按
[RFC2617](http://www.ietf.org/rfc/rfc2617.txt) 校验凭据。
如果凭据校验成功，函数将
成功返回并把凭据标记为已授权（被标记的凭据后续
可供其他函数使用）。如果函数因某种原因无法
校验凭据，则失败，
脚本应调用
`proxy_challenge`，由它对
用户重新发起质询。关于负值返回码的更多说明，
参见上面的函数。


各参数含义如下：


- *realm* (string) - realm 是一个不透明的字符串，
用户代理应将其呈现给用户，以便用户决定使用
哪个用户名与密码。通常它是服务器所在主机的
域。如果使用空字符串 ""，服务器将
根据请求生成它。将使用 From 头域的域
作为 realm。


该函数可在 REQUEST_ROUTE 中使用。


```opensips title="pv_proxy_authorize usage"
...
$var(username)="abc";
$var(password)="xyz";
if (!pv_proxy_authorize("")) {
	proxy_challenge("", "auth");  # realm 将被自动生成
}
...
```
<!-- CONTRIBUTORS -->

### 许可证 {#license}

本项目的所有文档文件（即 .md 扩展名的文件）均以 Creative Common License 4.0 授权。
