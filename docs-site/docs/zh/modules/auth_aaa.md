---
title: "auth_aaa 模块"
description: "本模块包含用于针对 AAA 服务器执行摘要鉴权以及部分 URI 检查的函数。"
sidebar: false
---


## 管理指南 {#admin-guide}


### 概述 {#overview}


本模块包含用于针对 AAA 服务器执行摘要鉴权（digest authentication）以及
部分 URI 检查的函数。为了执行鉴权，代理会把凭据传递给 AAA 服务器，
后者则返回包含鉴权结果的应答。因此，整个鉴权过程基本上都是在 AAA 服务器中
完成的。把请求发送给 AAA 服务器之前，会对凭据做一些合理性检查，
以确保只有格式正确的凭据才会到达服务器。


### 附加凭据 {#additional-credentials}


执行鉴权时，AAA 服务器可以在应答中附带附加凭据。该方案在
无需发起额外查询即可从 AAA 服务器获取额外用户信息时非常有用。


附加凭据以 AVP "SIP-AVP" 的形式嵌入 AAA 应答。其值的语法为：


- *value = SIP_AVP_NAME SIP_AVP_VALUE*
- *SIP_AVP_NAME = STRING_NAME | '#'ID_NUMBER*
- *SIP_AVP_VALUE = ':'STRING_VALUE | '#'NUMBER_VALUE*


所有附加凭据都会以 OpenSIPS AVP（SIP_AVP_NAME = SIP_AVP_VALUE）的形式存储。


RPID 值可通过该机制获取。


```c title="'SIP-AVP' AAA AVP examples"
....
"email:joe@yahoo.com"
    - STRING NAME AVP (email) with STRING VALUE (joe@yahoo.com)
"#14:joe@yahoo.com"
    - ID AVP (14) with STRING VALUE (joe@yahoo.com)
"age#28"
    - STRING NAME AVP (age) with INTEGER VALUE (28)
"#14#28"
    - ID AVP (14) with INTEGER VALUE (28)
....
		
```


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


本模块依赖以下模块（换句话说，所列模块必须先于本模块加载）：


- *auth* —— 鉴权框架，
仅当从脚本中使用鉴权函数时才需要
- *一个实现 aaa 的模块* —— 例如
aaa_radius


#### 外部库或应用程序 {#external-libraries-or-applications}


本模块不依赖任何外部库。


### 导出的参数 {#exported-parameters}


#### aaa_url (string)


这是表示所使用的 AAA 协议以及该协议配置文件位置的 url。


url 的语法如下："name_of_the_aaa_protocol_used:path_of_the_configuration_file"


```opensips title="aaa_url parameter usage"
		
modparam("auth_aaa", "aaa_url", "radius:/etc/radiusclient-ng/radiusclient.conf")
		
```


#### auth_service_type (integer)


这是执行鉴权操作时使用的 Service-Type aaa 属性值。
默认值对大多数使用者而言都足够。如需修改，请查阅 aaa 客户端
的包含文件，以获取可填入该参数的数值。


默认值为 "15"。


```opensips title="auth_service_type parameter usage"
		
modparam("auth_aaa", "auth_service_type", 15)
		
```


#### check_service_type (integer)


`aaa_does_uri_exist` 与 `aaa_does_uri_user_exist` 检查所使用的
AAA 服务类型。


*默认值为 10（Call-Check）。*


```opensips title="Set check_service_type parameter"
...
modparam("auth_aaa", "check_service_type", 11)
...
```


#### use_ruri_flag (string)


当该参数被设置为 "NULL" 以外的值，且正在被鉴权的请求通过
setflag() 函数设置了编号匹配的标志位时，使用 Request URI 而
不是 Authorization / Proxy-Authorization 头域中的 uri 参数值
来执行 AAA 鉴权。其目的是为行为异常的 NAT / 路由器 / ALG 提供
变通方案，这些设备会在传输途中修改请求，从而破坏鉴权。撰写本文
时，已知某些版本的 Linksys WRT54GL 会这样做。


默认值为 "NULL"（未设置）。


```opensips title="use_ruri_flag parameter usage"
		
modparam("auth_aaa", "use_ruri_flag", "USE_RURI_FLAG")
		
```


### 导出的函数 {#exported-functions}


#### aaa_www_authorize(realm, [uri_user])


该函数依据
[RFC2617](http://www.ietf.org/rfc/rfc2617.txt) 校验凭据。
若凭据校验成功，函数将成功返回并把凭据标记为已授权（被标记的凭据
随后可被其他函数使用）。若函数因某种原因无法校验凭据，则会失败，
此时脚本应调用
`www_challenge`，由后者再次向用户发起质询。


负值返回码的含义如下：


- *-5（通用错误）* —— 发生了某种通用错误，
且未发出任何应答；
- *-4（无凭据）* —— 请求中
未找到凭据；
- *-3（过期 nonce）* —— nonce 已过期；


实际上，该函数会对收到的凭据执行合理性检查，然后将其
传递给 aaa 服务器，由后者校验凭据并返回其是否有效。


各参数含义如下：


- *realm (string)* —— realm 是一个不透明字符串，
用户代理应把它呈现给用户，以便用户决定使用哪个用户名和密码。
通常它是服务器所运行主机的域。
如果使用空字符串 ""，则服务器会
从请求中生成它。对于 REGISTER 请求，将使用 To
头域的域（因为该头域表示正在注册的用户），对于所有其他消息，
将使用 From 头域的域。
该字符串可以包含伪变量。
- *uri_user (string, optional)* ——
作为 SIP-URI-User 检查项的值传递给 Radius 服务器的值。
如果未提供该参数，服务器将从 To 头域 URI 的
用户名部分生成 SIP-URI-User 检查项的值。


本函数可在 REQUEST_ROUTE 中使用。


```opensips title="aaa_www_authorize usage"
		
...
if (!aaa_www_authorize("siphub.net"))
	www_challenge("siphub.net", "auth");
...
```


#### aaa_proxy_authorize(realm, [uri_user])


该函数依据
[RFC2617](http://www.ietf.org/rfc/rfc2617.txt) 校验凭据。
若凭据校验成功，函数将成功返回并把凭据标记为已授权（被标记的凭据
随后可被其他函数使用）。若函数因某种原因无法校验凭据，则会失败，
此时脚本应调用 `proxy_challenge`，
由后者再次向用户发起质询。有关负值返回码的更多说明，
参见上面的函数。


实际上，该函数会对收到的凭据执行合理性检查，然后将其
传递给 aaa 服务器，由后者校验凭据并返回其是否有效。


各参数含义如下：


- *realm (string)* —— realm 是一个不透明字符串，
用户代理应把它呈现给用户，以便用户决定使用哪个用户名和密码。
它通常是代理负责的域之一。
如果使用空字符串 ""，则服务器会
从 From 头域 URI 的主机部分生成 realm。
该字符串可以包含伪变量。
- *uri_user (string, optional)* ——
作为 SIP-URI-User 检查项的值传递给 Radius 服务器的值。
如果未提供该参数，服务器将从 To 头域 URI 的
用户名部分生成 SIP-URI-User 检查项的值。


本函数可在 REQUEST_ROUTE 中使用。


```opensips title="proxy_authorize usage"
		
...
if (!aaa_proxy_authorize(""))    # Realm 与 URI 用户将被自动生成
	proxy_challenge("", "auth");
...
if (!aaa_proxy_authorize($pd, $pU))    # Realm 与 URI 用户取自
	proxy_challenge($pd, "auth");  # P-Preferred-Identity
                                       # 头域
...
```


#### aaa_does_uri_exist([sip_uri])


向 Radius 检查存储在 "sip_uri" 参数中的 SIP URI
（若未给出 "sip_uri"，则为 Request-URI 的 user@host 部分）
是否属于本地用户。可用于在查找失败后决定应返回 404 还是 480。
若属于本地用户，则根据 Radius 返回的 SIP-AVP 应答项加载
AVP。每个
SIP-AVP 应答项都必须具有如下形式的字符串值：


- *value = SIP_AVP_NAME SIP_AVP_VALUE*
- *SIP_AVP_NAME = STRING_NAME | '#'ID_NUMBER*
- *SIP_AVP_VALUE = ':'STRING_VALUE | '#'NUMBER_VALUE*


若 Radius 返回 Access-Accept 则返回 1，若 Radius
返回 Access-Reject 则返回 -1，内部错误时返回
-2。


本函数可在 REQUEST_ROUTE 中使用。


```opensips title="aaa_does_uri_exist usage"
...
if (aaa_does_uri_exist()) {
	...
};
...
```


#### aaa_does_uri_user_exist([sip_uri])


与 aaa_does_uri_exist 类似，但仅根据 Request-URI 的用户部分
或存储在 "sip_uri" 中的用户进行检查。
因此该用户应在所有用户中唯一，例如
E.164 号码。


本函数可在 REQUEST_ROUTE 中使用。


```opensips title="aaa_does_uri_user_exist usage"
...
if (aaa_does_uri_user_exist()) {
	...
};
...
```
<!-- CONTRIBUTORS -->

### 许可证 {#license}

本项目的所有文档文件（即 .md 扩展名的文件）均以 Creative Common License 4.0 授权。
