---
title: "auth_db 模块"
description: "本模块包含所有需要访问数据库的鉴权相关函数。本模块应与 auth 模块一起使用，不能独立使用，因为它依赖于该模块。"
sidebar: false
---


## 管理指南 {#admin-guide}


### 概述 {#overview}


本模块包含所有需要访问数据库的鉴权相关函数。本模块应与 auth 模块一起使用，不能独立使用，因为它依赖于该模块。如果希望使用数据库存储鉴权信息（如用户用户名与密码），请选择本模块。如果希望使用 RADIUS 鉴权，则应改用 auth_radius。


#### RFC 8760 支持（强化鉴权）{#rfc-8760-support-strenghtened-authentication}


从 OpenSIPS 3.2 开始，[auth](/zh/modules/auth)、auth_db 与 [uac_auth](/zh/modules/uac_auth) 模块按 [RFC 8760](https://datatracker.ietf.org/doc/html/rfc8760) 规范，支持两种新的摘要鉴权算法（"SHA-256" 与 "SHA-512-256"）。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


本模块依赖以下模块（换言之，所列模块必须先于本模块加载）：


- *auth* —— 通用鉴权函数
- *database* —— 任意数据库模块（目前为 mysql、postgres、dbtext）


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，必须安装以下库或应用程序：


- *无*


### 导出的参数 {#exported-parameters}


#### db_url (string)


这是要使用的数据库的 URL。该参数的值取决于所使用的数据库模块。例如，对于 mysql 与 postgres 模块，其形式类似于 mysql://username:password@host:port/database。对于 dbtext 模块（以纯文本文件存储数据），它是数据库所在的目录。


*默认值为 "mysql://opensipsro:opensipsro@localhost/opensips"。*


```opensips title="db_url parameter usage"
modparam("auth_db", "db_url", "dbdriver://username:password@dbhost/dbname")
```


#### calculate_ha1 (integer)


该参数告知服务器应将被加载的密码（用于鉴权）视为明文密码还是预先计算好的 HA1 字符串。


该参数可能的含义为：


- *1（计算 HA1）* —— 所加载的密码是明文密码，因此 OpenSIPS 将在内部计算 HA1。由于密码将从 [password_column](#password_column-string) 参数所指定的列中加载，请确保该参数指向存放明文密码的列（默认情况下，该参数指向 "ha1" 列）；
- *0（**不**计算 HA1）* —— 所加载的密码是预先计算好的 HA1 哈希（无需计算）。模块将加载存储在 [password_column](#password_column-string)、[hash_column_sha256](#hash_column_sha256-string) 与 [hash_column_sha512t256](#hash_column_sha512t256-string) 列中的所有哈希，然后使用与给定摘要鉴权挑战所选哈希算法相对应的哈希。哈希列的内容可按如下方式生成：

password_column: MD5(username:realm:password)
hash_column_sha256: SHA-256(username:realm:password)
hash_column_sha512t256: SHA-512-256(username:realm:password)


该参数的默认值为 *0（使用哈希密码）*。


```opensips title="calculate_ha1 parameter usage"
modparam("auth_db", "calculate_ha1", 1)
```


#### use_domain (integer)


若为真（非 0），则在 subscriber 表中查询时也会使用域。若为多域部署，强烈建议开启该参数，以避免不同域之间的用户名重叠。


重要：在开启该参数之前，请确保 `subscriber` 表中的 `domain` 列已被正确填充。


默认值为 "0（false）"。


```opensips title="use_domain parameter usage"
modparam("auth_db", "use_domain", 1)
		
```


#### load_credentials (string)


该参数指定在鉴权执行时应从数据库获取的凭据。加载的凭据将存储在 AVP 中。若未专门给出 AVP 名，则将使用与列名同名的 NAME AVP。


参数语法：


- *load_credentials = credential (';' credential)**
- *credential = (avp_specification '=' column_name) |
(column_name)*
- *avp_specification = '$avp(' + NAME + ')'*


该参数的默认值为 "rpid"。


*注意：*默认表结构不再包含
*rpid* 列，因此如果使用 rpid 值，
应在表中自行对其进行数据配置。否则，只需将该参数
设置为空字符串值。


该参数的默认值为 "rpid"。


```opensips title="load_credentials parameter usage"
# 将 rpid 列加载到 $avp(13)，将 email_address 列
# 加载到 $avp(email_address)
modparam("auth_db", "load_credentials", "$avp(13)=rpid;email_address")
```


#### skip_version_check (int)


该参数指定不检查 auth 表的版本。当使用自定义的鉴权表时，
应设置该参数。


默认值为 "0（false）"。


```opensips title="skip_version_check parameter usage"
modparam("auth_db", "skip_version_check", 1)
		
```


#### user_column (string)


这是类似 'SUBSCRIBER' 表中存放用户名的列名。默认值对大多数人来说已经足够。
如确实需要修改，请使用该参数。


默认值为 "username"。


```opensips title="user_column parameter usage"
modparam("auth_db", "user_column", "user")
```


#### domain_column (string)


这是类似 'SUBSCRIBER' 表中存放用户所属域的列名。默认值对大多数人来说已经足够。
如确实需要修改，请使用该参数。


默认值为 "domain"。


```opensips title="domain_column parameter usage"
modparam("auth_db", "domain_column", "domain")
```


#### password_column (string) {#password_column-string}


这是类似 *"subscriber"* 表中存放 MD5 HA1 哈希字符串或明文密码的列名。
MD5 HA1 哈希是用户名、密码与 realm 的 MD5 哈希。将哈希存储在
数据库中（而非直接存储密码）要安全得多，因为服务器无需知道
明文密码，且攻击者从 HA1 字符串反推密码在计算上是不可行的。


默认值为 "ha1"。


```opensips title="password_column parameter usage"
modparam("auth_db", "password_column", "password")
```


#### hash_column_sha256 (string) {#hash_column_sha256-string}


存放 SHA-256 HA1 哈希的列名
（[RFC 8760](https://datatracker.ietf.org/doc/html/rfc8760) 支持）。


默认值为 "ha1_sha256"。


```opensips title="password_column parameter usage"
modparam("auth_db", "hash_column_sha256", "ha1_sha256")
```


#### hash_column_sha512t256 (string) {#hash_column_sha512t256-string}


存放 SHA-512/256 HA1 哈希的列名。
（[RFC 8760](https://datatracker.ietf.org/doc/html/rfc8760) 支持）。


默认值为 "ha1_sha512t256"。


```opensips title="password_column parameter usage"
modparam("auth_db", "hash_column_sha512t256", "ha1_sha512t256")
```


#### uri_user_column (string)


类似 'URI' 表中存放用户名的列。


*默认值为 "username"。*


```opensips title="Set uri_user_column parameter"
...
modparam("auth_db", "uri_user_column", "username")
...
```


#### uri_domain_column (string)


类似 'URI' 表中存放域的列。


*默认值为 "domain"。*


```opensips title="Set uri_domain_column parameter"
...
modparam("auth_db", "uri_domain_column", "domain")
...
```


#### uri_uriuser_column (string)


类似 'URI' 表中存放 URI 用户名的列。


*默认值为 "uri_user"。*


```opensips title="Set uriuser_column parameter"
...
modparam("auth_db", "uri_uriuser_column", "uri_user")
...
```


### 导出的函数 {#exported-functions}


#### www_authorize(realm, table) {#www_authorizerealm-table}


该函数依据 [RFC2617](http://www.ietf.org/rfc/rfc2617.txt) 中的摘要鉴权方式，
将收到的凭据与类似 "SUBSCRIBER" 的表进行校验。
若凭据校验成功，则函数成功返回，并将该凭据标记为已授权
（已标记的凭据后续可被其他函数使用）。若函数因某种原因
无法校验凭据，则失败，脚本应
调用 `www_challenge`，由其对
用户再次发起挑战。


负返回码可解释如下：


- *-5（通用错误）* —— 发生了某种通用错误，且未发出任何应答；
- *-4（无凭据）* —— 请求中未找到凭据；
- *-3（过期的 nonce）* —— nonce 已过期；
- *-2（无效密码）* —— 用户有效，但密码错误；
- *-1（无效用户）* —— 鉴权用户不存在。


各参数含义如下：


- *realm (string)* —— Realm 是一个不透明字符串，
用户代理应将其呈现给用户，以便用户决定使用哪个用户名与密码。
通常它是服务器运行主机的域。
若使用空字符串 ""，则服务器将从请求中生成它。
对于 REGISTER 请求，将使用 To
头域的域（因为该头域表示正在注册的用户）；对于所有其他消息，将使用
From 头域的域。
该字符串可包含伪变量。
- *table (string)* —— 用于查询用户名与密码的表
（通常为 subscribers 表）。


该函数可在 REQUEST_ROUTE 中使用。


```opensips title="www_authorize usage"
...
if (!www_authorize("siphub.net", "subscriber"))
	www_challenge("siphub.net", "auth");
...
```


#### proxy_authorize(realm, table)


该函数依据 [RFC2617](http://www.ietf.org/rfc/rfc2617.txt) 中的摘要鉴权方式，
将收到的凭据与类似 "SUBSCRIBER" 的表进行校验。若
凭据校验成功，则函数成功返回，并将该凭据标记为已授权（已标记的凭据
后续可被其他函数使用）。若函数因某种原因无法
校验凭据，则失败，
脚本应调用 `proxy_challenge`，
由其对用户再次发起挑战。


负返回码可解释如下：


- *-5（通用错误）* —— 发生了某种通用
错误，且未发出任何应答；
- *-4（无凭据）* —— 请求中
未找到凭据；
- *-3（过期的 nonce）* —— nonce 已过期；
- *-2（无效密码）* —— 用户有效，
但密码错误；
- *-1（无效用户）* —— 鉴权
用户不存在。


各参数含义如下：


- *realm (string)* —— Realm 是一个不透明字符串，
用户代理应将其呈现给用户，以便用户决定使用哪个用户名与密码。
通常它是服务器运行主机的域。
若使用空字符串 ""，则服务器将从请求中生成它。将使用 From 头域的域
作为 realm。
该字符串可包含伪变量。
- *table (string)* —— 用于查询用户名与密码的表
（通常为 subscribers 表）。


该函数可在 REQUEST_ROUTE 中使用。


```opensips title="proxy_authorize usage"
...
if (!proxy_authorize("", "subscriber"))
	proxy_challenge("", "auth");  # Realm 将自动生成
...
```


#### db_is_to_authorized(table) {#db_is_to_authorizedtable}


该函数对照类似 'URI' 的表，检查从 To 头域 URI 中提取的
用户名是否被允许/授权使用由
[www_authorize()](#www_authorizerealm-table) 校验过的凭据（鉴权用户名）。


该函数是这样一个机制的一部分：允许在 SIP 用户（来自 FROM/TO 头域）
与其所使用的鉴权用户（来自类似 SUBSCRIBER 的表）之间建立
映射。该映射存储在类似 URI 的表中。


各参数含义如下：


- *table (string)* —— 用于查询
URI/AUTH 映射的表（通常为 URI 表）。


该函数可在 REQUEST_ROUTE 中使用。


```opensips title="db_is_to_authorized usage"
...
if (!db_is_to_authorized("uri")) {
	xlog("User $tu is not authorized to authenticate with $au credential\n");
}
...
```


#### db_is_from_authorized(table)


与 [db_is_to_authorized()](#db_is_to_authorizedtable) 类似，但检查的是
FROM 头域 URI 而非 TO 头域 URI。


#### db_does_uri_exist(uri, table)


检查给定 URI 中的 username@domain 是否为类似 'SUBSCRIBER' 表中
已存在的用户。


各参数含义如下：


- *uri (string)* —— 要检测的 SIP URI。它必须
包含用户名部分才能进行有效检查。允许使用变量。
- *table (string)* —— 用于查询
该 URI 的表（通常为 SUBSCRIBER 表）。


该函数可在 REQUEST_ROUTE 中使用。


```opensips title="db_does_uri_exist usage"
...
if (db_does_uri_exist($ru, "subscriber")) {
	...
}
...
```


#### db_get_auth_id(table, uri, auth, realm)


将给定 uri 字符串中的用户名对照类似 'URI' 的表进行检查。
若该用户在数据库中存在，则返回 true，并将给定
变量设置为与给定 uri 对应的鉴权 id 与 realm。


各参数含义如下：


- *table (string)* —— 用于查询
该 URI 的表（通常为 URI 表）。
- *uri (string)* —— 待检测的输入 SIP URI。
它必须包含用户名部分才能进行有效检查。
允许使用变量。
- *auth (var)* —— 一个输出变量，用于存放
与给定 SIP URI 匹配的鉴权 id。
- *realm (var)* —— 一个输出变量，用于存放
与给定 SIP URI 匹配的鉴权 realm。


该函数可在 REQUEST_ROUTE、FAILURE_ROUTE 与
LOCAL_ROUTE 中使用。


```opensips title="db_get_auth_id usage"
...
if (db_get_auth_id("uri", $ru, $avp(auth_id), $avp(auth_realm))) {
	...
}
...
```


### 提示与常见问题 {#tips--faq}

#### 如何重新计算 ha1 与 ha1b {#how-to-recalculate-ha1-and-ha1b}

当修改 subscriber 表中的 `domain` 列时，必须重新计算 `ha1` 与 `ha1b` 字段。为此必须拥有每个用户的密码。

HA1 是 "username:domain:password" 的 MD5 哈希。例如，若创建了一个 SIP 账户 "1000@mydomain.com"，密码为 "123456"，则 HA1 是 "1000:mydomain.com:123456"（不含引号）的 MD5 哈希。另一方面，HA1B 是 "username@domain:domain:password" 的 MD5 哈希；因此沿用上例，HA1B 将是 "1000@mydomain.com:mydomain.com:123456"（不含引号）的 MD5 哈希。

要重新计算并更新 subscriber 表中的 ha1 与 ha1b 列，只需在 mysql 中执行以下 sql 语句：

```sql
update subscriber
set ha1 = md5(concat(username, ':', domain, ':', password)),
ha1b = md5(concat(username, '@', domain, ':', domain, ':', password))
```

> [!NOTE]
> 上述内容仅在启用了 `use_domain` *且*未为 `www_authorize()` 使用静态挑战参数时才成立。

若为 `www_authorize()` 使用静态挑战（即 `www_authorize()` 的第一个参数不是空字符串），则 HA1 为 MD5("username:challenge:password")，HA1B 为 MD5("username@challenge:challenge:password")。若 `www_authorize()` 的挑战参数为空，OpenSIPS 会自动选择域作为挑战值，从而得到上述解决方案。

若 `use_domain` 为 false，则 HA1B 字段必须基于 "username@:domain:password" 或 "username@:challenge:password" 计算，具体取决于挑战是空还是已定义。


<!-- CONTRIBUTORS -->

### 许可证 {#license}

所有文档文件（即 .md 扩展名）均按 Creative Common License 4.0 授权。
