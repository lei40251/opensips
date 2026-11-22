---
title: "ldap 模块"
description: "ldap 模块为 OpenSIPS 实现 LDAP 查询接口。"
---

## 管理指南 {#admin-guide}


### 概述 {#overview}


ldap 模块为 OpenSIPS 实现 LDAP 查询接口。它导出脚本函数，用于执行 LDAP 查询操作，并把查询结果存储为 OpenSIPS AVP。这样，LDAP 目录数据就可以用在 OpenSIPS 的 SIP 消息路由脚本中。


ldap 模块提供以下特性：


- LDAP 查询函数，以 LDAP URL 作为输入，支持同步和异步两种方式
- LDAP 结果解析函数，用于把 LDAP 数据存储为 AVP
- 支持访问多台 LDAP 服务器
- LDAP SIMPLE 鉴权
- LDAP 服务器故障切换与自动重连
- 可配置的 LDAP 连接超时与 bind 超时
- 供其他 OpenSIPS 模块使用的 LDAP 查询操作模块 API
- 支持 StartTLS


本模块的实现使用了大多数 UNIX/Linux 平台上可用的开源 OpenLDAP 库。除 LDAP 服务器故障切换与自动重连之外，本模块还能并发处理多个 LDAP 会话，从而访问存储在不同 LDAP 服务器上的数据。每个 OpenSIPS 工作进程会为每台已配置的 LDAP 服务器维护一条 LDAP TCP 连接。这使得 LDAP 请求可以并行执行，并把 LDAP 并发控制卸载到 LDAP 服务器上。


本模块提供了一套 LDAP 查询模块 API，可供其他 OpenSIPS 模块使用。使用该 API 的模块无需自行实现 LDAP 连接管理与配置，同时仍能访问完整的 OpenLDAP API 以进行查询和结果处理。


由于 LDAP 服务器实现针对快速读访问做了优化，它们很适合存储 SIP 数据配置数据。性能测试表明，与其他数据库模块（例如 OpenSIPS MYSQL 模块）相比，本模块的数据访问时间更短、呼叫速率更高。


#### 使用基础 {#usage-basics}


首先，必须在外部配置文件中指定所谓的 LDAP 会话（参见 [ldap 配置](#ldap-configuration-file)）。每个 LDAP 会话都包含 LDAP 服务器访问参数，例如服务器主机名或连接超时。通常只会使用单个 LDAP 会话，除非需要访问多台 LDAP 服务器。随后，在 OpenSIPS 配置脚本中使用该 LDAP 会话名来引用特定的 LDAP 会话。


`ldap_search` 函数（[ldap_search()](#ldap_searchldap_url)）执行一次 LDAP 查询操作。它要求以 LDAP URL 作为输入，其中包含 LDAP 会话名和查询参数。[ldap url](#ldap-urls) 提供了 LDAP URL 的简要说明。


LDAP 查询的结果存储在内部，可通过某个 `ldap_result*` 函数访问。`ldap_result`（[ldap_result()](#ldap_resultldap_attr_name-avp_spec-avp_type-regex_subst)）把结果中的 LDAP 属性值存储为 AVP。`ldap_result_check`（[ldap 结果检查函数](#ldap_result_checkldap_attr_name-string_to_match--regex_subst)）是一个便捷函数，用正则表达式匹配来比较字符串与 LDAP 属性值。最后，`ldap_result_next`（[ldap_result_next()](#ldap_result_next)）可用于处理返回多个 LDAP 条目的 LDAP 查询。


所有 `ldap_result*` 函数始终访问最近一次 `ldap_search` 调用产生的 LDAP 结果集。在 OpenSIPS 配置脚本中多次调用 `ldap_search` 时，应牢记这一点。


#### LDAP URL {#ldap-urls}


`ldap_search` 要求以 LDAP URL 作为参数。本节介绍 LDAP URL 的格式与语义。


RFC 4516 [RFC4516](https://tools.ietf.org/html/rfc4516) 描述了 LDAP 统一资源定位符（URL）的格式。LDAP URL 以紧凑的格式表示一次 LDAP 查询操作。LDAP URL 格式定义如下（略有改动，ABNF 表示法请参考 [RFC4516](https://tools.ietf.org/html/rfc4516) 第 2 节）：


`ldap://[ldap_session_name][/dn?attrs[?scope[?filter]]]]`


**`ldap_session_name`**


在 LDAP 配置文件中定义的 LDAP 会话名。


（RFC 4516 将其定义为 LDAP hostport 参数）


**`dn`**


LDAP 查询的基准可分辨名称（DN），或非查询操作的目标，如 RFC 4514 [RFC4514](https://tools.ietf.org/html/rfc4514) 所定义


**`attrs`**


要返回的 LDAP 属性列表，以逗号分隔


**`scope`**


LDAP 查询范围，有效值为 "base"、"one" 或 "sub"


**`filter`**


LDAP 查询过滤器定义，遵循 RFC 4515 [RFC4515](https://tools.ietf.org/html/rfc4515) 的规则


> [!NOTE]
> 下表列出了在 LDAP 查询过滤器中必须转义的
> 字符：


> [!NOTE]
> LDAP URL 中的非 URL 字符必须使用百分号编码
> （percent-encoding，参见 RFC 4516 第 2.1 节）进行转义。特别
> 要注意，LDAP URL 各组成部分中的任何 "?" 字符都必须
> 写成 "%3F"，因为 "?" 被用作 URL 的分隔符。导出的函数 `ldap_filter_url_encode`（[ldap_filter_url_encode()](#ldap_filter_url_encodestring-avp_spec)）
> 实现了 RFC 4515/4516 的 LDAP 查询过滤器与 URL 转义
> 规则。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


本模块依赖以下模块（列出的模块必须在本模块之前加载）：


- *不依赖其他 OpenSIPS 模块。*


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，必须安装以下库或应用程序：


- OpenLDAP 库（libldap）v2.1 或更高版本，编译时需要 libldap 头文件（libldap-dev）


### LDAP 配置文件 {#ldap-configuration-file}


本模块在模块初始化时会读取一个外部配置文件，其中包含 LDAP 会话定义。


#### 配置文件语法 {#configuration-file-syntax}


配置文件遵循 Windows INI 文件语法，节名括在方括号中：


```c
[Section_Name]
```


任何节都可以包含零个或多个如下形式的配置键赋值：


```c
key = value ; comment
```


值可以用引号括起。如果未使用引号，则把值理解为第一个到最后一个非空白字符之间的所有字符。以井号开头的行和空行被视为注释。


每个节描述一个 LDAP 会话，可在 OpenSIPS 配置脚本中引用。把节名用作 LDAP URL 的主机部分，即告诉模块使用相应节中指定的 LDAP 会话。一个 LDAP 会话定义示例如下：


```c
[example_ldap]
ldap_server_url            = "ldap://ldap1.example.com, ldap://ldap2.example.com"
ldap_bind_dn               = "cn=sip_proxy,ou=accounts,dc=example,dc=com"
ldap_bind_password         = "pwd"
ldap_network_timeout       = 500
ldap_client_bind_timeout   = 500
ldap_ca_cert_file		   = "/usr/share/ca-certificates/mycert.pem"
ldap_cert_file			   = "/var/my-certificate/certificate.pem"
ldap_key_file			   = "/var/my-certificate/key.pem"
ldap_require_certificate   = "ALLOW"
```


配置键将在下一节说明。该 LDAP 会话可以在路由脚本中通过如下形式的 LDAP URL 引用：


```c
ldap://example_ldap/cn=admin,dc=example,dc=com
```


#### LDAP 会话设置 {#ldap-session-settings}


**ldap_server_url（必填）**


LDAP URL，包含 LDAP 服务器的完全限定域名或 IP 地址，后面可选跟冒号和要连接的 TCP 端口：`ldap://<FQDN/IP>[:<port>]`。可以添加故障切换用的 LDAP 服务器，彼此以逗号分隔。发生连接错误时，模块按出现顺序依次尝试连接各服务器。


默认值：无，这是必填设置


```c title="ldap_server_url 示例"
ldap_server_url = "ldap://localhost"
ldap_server_url = "ldap://ldap.example.com:7777"
ldap_server_url = "ldap://ldap1.example.com,
                   ldap://ldap2.example.com:80389"
				
```


**ldap_version（可选）**


支持的 LDAP 版本为 2 和 3。


默认值：`3`（LDAPv3）


```c title="ldap_version 示例"
ldap_version = 2
```


**ldap_bind_dn（可选）**


用于向 LDAP 服务器 bind 的鉴权用户 DN（模块目前仅支持 SIMPLE_AUTH）。空字符串表示启用匿名 LDAP bind。


默认值：""（空字符串 --> 匿名 bind）


```c title="ldap_bind_dn 示例"
ldap_bind_dn = "cn=root,dc=example,dc=com";
```


**ldap_bind_password（可选）**


用于向 LDAP 服务器 bind 的鉴权密码（SIMPLE_AUTH）。空字符串表示启用匿名 bind。


默认值：""（空字符串 --> 匿名 bind）


```c title="ldap_bind_password 示例"
ldap_bind_password = "secret";
```


**ldap_network_timeout（可选）**


LDAP TCP 连接超时，单位为毫秒。若 `ldap_server_url` 中包含多个 LDAP 服务器地址，把该参数设为较小值可实现快速故障切换。


默认值：1000（一秒）


```c title="ldap_network_timeout 示例"
ldap_network_timeout = 500 ; 把 TCP 超时设为 500 ms
```


**ldap_client_bind_timeout（可选）**


LDAP bind 操作超时，单位为毫秒。


默认值：1000（一秒）


```c title="ldap_client_bind_timeout 示例"
ldap_client_bind_timeout = 1000
```


**ldap_ca_cert_file（可选）**


CA 证书文件的 LDAP 完整路径。


无默认值。若希望使用 StartTLS，则为必填项


```c title="ldap_ca_cert_file 示例"
ldap_ca_cert_file = "/usr/local/CAcert.pem"
```


**ldap_cert_file（可选）**


证书文件的 LDAP 完整路径。


无默认值。若希望使用 StartTLS，则为必填项


```c title="ldap_cert_file 示例"
ldap_cert_file = "/usr/local/mycert.pem"
```


**ldap_key_file（可选）**


密钥文件的 LDAP 完整路径。


无默认值。若希望使用 StartTLS，则为必填项


```c title="ldap_key_file 示例"
ldap_key_file = "/usr/local/mykey.pem"
```


**ldap_require_certificate（可选）**


LDAP 对端证书检查策略，取 "NEVER"、"HARD"、"DEMAND"、"ALLOW"、"TRY" 之一。也接受小写字母。


默认值 "NEVER"。


```c title="ldap_require_certificate 示例"
ldap_require_certificate = "NEVER"
```


#### 配置文件示例 {#configuration-file-example}


下面的配置文件示例包含两个 LDAP 会话定义，例如可用于访问 H.350 数据并完成电话号码到姓名的映射。


```c title="LDAP 配置文件示例"
# LDAP 会话 "sipaccounts"：
#
# - 使用 LDAPv3（默认）
# - 两台冗余 LDAP 服务器
#
[sipaccounts]
ldap_server_url = "ldap://h350-1.example.com, ldap://h350-2.example.com"
ldap_bind_dn = "cn=sip_proxy,ou=accounts,dc=example,dc=com"
ldap_bind_password = "pwd"
ldap_network_timeout = 500
ldap_client_bind_timeout = 500
#使用 StartTLS
ldap_ca_cert_file = "/ldap/path/to/ca/certificate.pem"
ldap_cert_file = "/ldap/path/to/certificate.pem"
ldap_key_file = "/ldap/path/to/key/file.pem"
ldap_require_certificate = "NEVER"


# LDAP 会话 "campus"：
#
# - 使用 LDAPv2
# - 匿名 bind
#
[campus]
ldap_version = 2
ldap_server_url = "ldap://ldap.example.com"
ldap_network_timeout = 500
ldap_client_bind_timeout = 500
			
```


### 导出的参数 {#exported-parameters}


#### config_file (string)


LDAP 配置文件的完整路径。


默认值：
`/usr/local/etc/opensips/ldap.cfg`


```opensips title="config_file 参数用法"
modparam("ldap", "config_file", "/etc/opensips/ldap.ini")
		  
```


#### max_async_connections (int)


为执行异步 ldap_search 调用而与 ldap 服务器建立的最大异步连接数。该连接数是每进程的，因此若有 8 个工作进程且 max_async_connections 为 20，则到 ldap 服务器的连接数最多为 160。


默认值：`20`


```opensips title="max_async_connections 参数用法"
modparam("ldap", "max_async_connections", 50)
		  
```


### 导出的函数 {#exported-functions}


#### ldap_search(ldap_url) {#ldap_searchldap_url}


使用给定的 LDAP URL 执行一次 LDAP 查询操作，并把结果存储在内部，供随后由 `ldap_result*` 函数读取。如果找到一个或多个 LDAP 条目，函数返回找到的条目数，该值在 OpenSIPS 配置脚本中判定为 TRUE。若未找到任何 LDAP 条目，返回 `-1`（`FALSE`）；若发生内部错误（例如 LDAP 错误），返回 `-2`（`FALSE`）。


**`ldap_url (string)`**


定义 LDAP 查询操作的 LDAP URL（LDAP URL 格式说明参见 [ldap url](#ldap-urls)）。其 hostport 部分必须是 LDAP 配置脚本中声明的某个 LDAP 会话名。


使用名为 `sipaccounts` 的 LDAP 会话，基准为 `ou=sip,dc=example,dc=com`，`one` 层深度，查询过滤器为 `(cn=schlatter)`，返回所有属性：


```c title="ldap_url 用法示例"
ldap://sipaccounts/ou=sip,dc=example,dc=com??one?(cn=schlatter)
```


使用名为 `ldap1` 的 LDAP 会话，基准为 `dc=example,dc=com`，查询过滤器为 `(cn=$(avp(name)))`，返回 `SIPIdentityUserName` 和 `SIPIdentityServiceLevel` 属性的子树查询：


```opensips title="ldap_url 用法示例"
ldap://ldap_1/dc=example,dc=com?
       SIPIdentityUserName,SIPIdentityServiceLevel?sub?(cn=$(avp(name)))
	        
```


**`n` > 0（TRUE）：**


- 找到 `n` 个匹配的 LDAP 条目


**`-1`（FALSE）：**


- 未找到匹配的 LDAP 条目


**`-2`（FALSE）：**


- LDAP 错误（例如 LDAP 服务器不可用），或
- 内部错误


本函数可在 REQUEST_ROUTE、FAILURE_ROUTE、BRANCH_ROUTE 和 ONREPLY_ROUTE 中使用。


```opensips title="用法示例"
...
# ldap 查询
if (!ldap_search("ldap://sipaccounts/ou=sip,dc=example,dc=com??one?(cn=$rU)"))
{
    switch ($retcode)
    {
    case -1:
        # 未找到 LDAP 条目
        sl_send_reply(404, "User Not Found");
        exit;
    case -2:
        # 内部错误
        sl_send_reply(500, "Internal server error");
        exit;
    default:
        exit;
    }
}
xlog("L_INFO", "ldap_search: found [$retcode] entries for (cn=$rU)");

# 把电话号码存入 $avp(tel_number)
ldap_result("telephoneNumber/$avp(tel_number)");
...
			
```


#### ldap_result(ldap_attr_name, avp_spec, [avp_type], [regex_subst]) {#ldap_resultldap_attr_name-avp_spec-avp_type-regex_subst}


本函数把 LDAP 属性值转换为 AVP，供随后在消息路由脚本中使用。它访问最近一次 `ldap_search` 调用获取的 LDAP 结果集。`ldap_attr_name` 指定要将其值存入 AVP `avp_spec` 的 LDAP 属性名。多值 LDAP 属性会生成带索引的 AVP。可选的 `regex_subst` 参数可用于进一步指定属性值的哪一部分应存储为 AVP。


AVP 的类型可以是字符串或整型。默认情况下，`ldap_result` 把 LDAP 属性值存储为字符串类型的 AVP。可选的 `avp_type` 参数可用于显式指定 AVP 的类型，取值为 `str`（字符串）或 `int`（整型）。若 `avp_type` 指定为 `int`，则 `ldap_result` 会尝试把 LDAP 属性值转换为整型；此时，只有在转换为整型成功的情况下才会把值存储为 AVP。


**ldap_attr_name (string)**


要存储其值的 LDAP 属性名，例如 `SIPIdentityServiceLevel` 或 `telephonenumber`


**avp_spec (var)**


目标 AVP 的指定方式，例如 `$avp(service_level)` 或 `$avp(12)`


**avp_type (string, optional)**


目标 AVP 类型的指定方式，取 `str` 或 `int`。若未指定该参数，则 LDAP 属性值存储为字符串类型的 AVP。


**regex_subst (string)**


在把 LDAP 属性值存储为 AVP 之前对其应用的正则替换，例如 `"/^sip:(.+)$/\1/"` 用于去掉 LDAP 属性值开头的 "sip:"。


**`n` > 0（TRUE）**


在 LDAP 结果集中找到 LDAP 属性 `ldap_attr_name`，并把 `n` 个 LDAP 属性值存入 `avp_spec`


**-1（FALSE）**


在 LDAP 结果集中未找到 LDAP 属性 `ldap_attr_name`


**-2（FALSE）**


发生内部错误


本函数可在 REQUEST_ROUTE、FAILURE_ROUTE、BRANCH_ROUTE 和 ONREPLY_ROUTE 中使用。


```opensips title="用法示例"
...

# ldap_search 调用
...

# 把 SIPIdentityServiceLevel 存入 $avp(service_level)
if (!ldap_result("SIPIdentityServiceLevel", $avp(service_level)))
{
    switch ($retcode)
    {
    case -1:
        # 未找到 SIPIdentityServiceLevel
        sl_send_reply(403, "Forbidden");
        exit;
    case -2:
        # 内部错误
        sl_send_reply(500, "Internal server error");
        exit;
    default:
        exit;
    }
}

# 把 SIP URI 的域存入 $avp(10)
ldap_result("SIPIdentitySIPURI", $avp(10), "/^[^@]+@(.+)$/\1/");
...
			
```


#### ldap_result_check(ldap_attr_name, string_to_match, [, regex_subst]) {#ldap_result_checkldap_attr_name-string_to_match--regex_subst}


本函数比较 `ldap_attr_name` 的值与 `string_to_match` 是否相等。它访问最近一次 `ldap_search` 调用获取的 LDAP 结果集。可选的 `regex_subst` 参数可用于进一步指定属性值的哪一部分参与相等比较。若 `ldap_attr_name` 是多值的，则对每个值都与 `string_to_match` 做检查。若其中一个或多个值匹配，函数返回 `1`（TRUE）。


**ldap_attr_name (string)**


要匹配其值的 LDAP 属性名，例如 `SIPIdentitySIPURI`


**string_to_match (string)**


要匹配的字符串。其中包含的 AVP 和伪变量会被展开。


**regex_subst (string, optional)**


在把 LDAP 属性值与 string_to_match 比较之前对其应用的正则替换，例如 `"/^[^@]@+(.+)$/\1/"` 用于提取 SIP URI 的域部分


**1（TRUE）**


一个或多个 `ldap_attr_name` 属性值（在应用 `regex_subst` 之后）匹配 `string_to_match`


**-1（FALSE）**


未找到 `ldap_attr_name` 属性，或属性值（在应用 `regex_subst` 之后）不匹配 `string_to_match`


**-2（FALSE）**


发生内部错误


本函数可在 REQUEST_ROUTE、FAILURE_ROUTE、BRANCH_ROUTE 和 ONREPLY_ROUTE 中使用。


```opensips title="用法示例"
...
# ldap_search 调用
...

# 检查 'sn' 这个 ldap 属性值是否等于 R-URI 的用户名部分，
# 同样的效果也可以用 ldap_result_check("sn/$rU") 实现
if (!ldap_result_check("sn", $ru, "/^sip:([^@]).*$/\1/"))
{
    switch ($retcode)
    {
    case -1:
        # R-URI 用户名与 sn 不匹配
        sl_send_reply(401, "Unauthorized");
        exit;
    case -2:
        # 内部错误
        sl_send_reply(500, "Internal server error");
        exit;
    default:
        exit;
    }
}
...
			
```


#### ldap_result_next() {#ldap_result_next}


一次 LDAP 查询操作可能返回多个 LDAP 条目。本函数可用于遍历所有返回的 LDAP 条目。如果 LDAP 结果集中还有下一个 LDAP 条目，返回 1（TRUE），并使 `ldap_result*` 函数作用于下一个 LDAP 条目。如果 LDAP 结果集中已没有更多 LDAP 条目，函数返回 -1（FALSE）。


**1（TRUE）**


LDAP 结果集中还有另一个 LDAP 条目，结果指针加一


**-1（FALSE）**


已没有更多 LDAP 条目可用


**`-2`（FALSE）**


内部错误


本函数可在 REQUEST_ROUTE、FAILURE_ROUTE、BRANCH_ROUTE 和 ONREPLY_ROUTE 中使用。


```opensips title="用法示例"
...
# ldap_search 调用
...

ldap_result("telephonenumber/$avp(tel1)");
if (ldap_result_next())
{
	ldap_result("telephonenumber/$avp(tel2)");
}
if (ldap_result_next())
{
	ldap_result("telephonenumber/$avp(tel3)");
}
if (ldap_result_next())
{
	ldap_result("telephonenumber/$avp(tel4)");
}
...
			
```


#### ldap_filter_url_encode(string, avp_spec) {#ldap_filter_url_encodestring-avp_spec}


本函数对 `string` 应用以下转义规则，并把结果存入 AVP `avp_spec`：


**ldap_filter_url_encode() 转义规则**


| `string` 中的字符 | 替换为 | 定义于 |
| --- | --- | --- |
| * | \2a | RFC 4515 |
| ( | \28 | RFC 4515 |
| ) | \29 | RFC 4515 |
| \ | \5c | RFC 4515 |
| ? | %3F | RFC 4516 |


存储在 AVP `avp_spec` 中的字符串可以安全地用于 LDAP URL 过滤器字符串。


**`string`**


要应用 RFC 4515 与 URL 转义规则的字符串。其中的 AVP 和伪变量会被展开。示例：`"cn=$avp(name)"`


**`avp_spec (var)`**


用于存储所得 RFC 4515 与 URL 编码字符串的 AVP，例如 `$avp(ldap_search)` 或 `$avp(10)`


**`1`（TRUE）**


RFC 4515 与 URL 编码后的 `filter_component` 已存储为 AVP `avp_name`


**`-1`（FALSE）**


内部错误


本函数可在 REQUEST_ROUTE、FAILURE_ROUTE、BRANCH_ROUTE 和 ONREPLY_ROUTE 中使用。


```opensips title="用法示例"
...
if (!ldap_filter_url_encode("cn=$avp(name)", $avp(name_esc)))
{
    # RFC 4515/URL 编码失败 --> 静默丢弃请求
    exit;
}

xlog("L_INFO", "encoded LDAP filter component: [$avp(name_esc)]\n");

if (ldap_search(
     "ldap://h350/ou=commObjects,dc=example,dc=com??sub?($avp(name_esc))"))
    { ... }
...
			
```


### 导出的异步函数 {#exported-asynchronous-functions}


#### ldap_search(ldap_url)


使用给定的 LDAP URL 执行一次 LDAP 查询操作，并把结果存储在内部，供随后由 `ldap_result*` 函数读取。如果找到一个或多个 LDAP 条目，函数返回找到的条目数，该值在 OpenSIPS 配置脚本中判定为 TRUE。若未找到任何 LDAP 条目，返回 `-1`（`FALSE`）；若发生内部错误（例如 LDAP 错误），返回 `-2`（`FALSE`）。


**`ldap_url (string)`**


定义 LDAP 查询操作的 LDAP URL（LDAP URL 格式说明参见 [ldap url](#ldap-urls)）。其 hostport 部分必须是 LDAP 配置脚本中声明的某个 LDAP 会话名。


使用名为 `sipaccounts` 的 LDAP 会话，基准为 `ou=sip,dc=example,dc=com`，`one` 层深度，查询过滤器为 `(cn=schlatter)`，返回所有属性：


```c title="ldap_url 用法示例"
ldap://sipaccounts/ou=sip,dc=example,dc=com??one?(cn=schlatter)
```


使用名为 `ldap1` 的 LDAP 会话，基准为 `dc=example,dc=com`，查询过滤器为 `(cn=$(avp(name)))`，返回 `SIPIdentityUserName` 和 `SIPIdentityServiceLevel` 属性的子树查询：


```opensips title="ldap_url 用法示例"
ldap://ldap_1/dc=example,dc=com?
       SIPIdentityUserName,SIPIdentityServiceLevel?sub?(cn=$(avp(name)))
	        
```


**`n` > 0（TRUE）：**


- 找到 `n` 个匹配的 LDAP 条目


**`-1`（FALSE）：**


- 未找到匹配的 LDAP 条目


**`-2`（FALSE）：**


- LDAP 错误（例如 LDAP 服务器不可用），或
- 内部错误


本函数可在 REQUEST_ROUTE、FAILURE_ROUTE、BRANCH_ROUTE 和 ONREPLY_ROUTE 中使用。


```opensips title="用法示例"
...
# ldap 查询

route {
	async( ldap_search("ldap://sipaccounts/ou=sip,dc=example,dc=com??one?(cn=$rU)"), resume);
}
....
route[resume] {
{
    switch ($rc)
    {
    case -1:
        # 未找到 LDAP 条目
        sl_send_reply(404, "User Not Found");
        exit;
    case -2:
        # 内部错误
        sl_send_reply(500, "Internal server error");
        exit;
    default:
        exit;
    }
    xlog("L_INFO", "ldap_search: found [$retcode] entries for (cn=$rU)");

    # 把电话号码存入 $avp(tel_number)
    ldap_result("telephoneNumber", $avp(tel_number)");
...
}
			
```


### 安装与运行 {#installation--running}


#### 编译模块 {#compiling-the-module}


编译 ldap 模块需要 OpenLDAP 库（libldap）和头文件（libldap-dev）v2.1 或更高版本（本模块使用 v2.1.3 和 v2.3.32 测试过）。OpenLDAP 源码可从 [http://www.openldap.org/](http://www.openldap.org/) 获取。


OpenLDAP 库在大多数 UNIX/Linux 发行版上都有预编译版本。在 Debian/Ubuntu 上，必须安装以下软件包：


```bash
$ apt-get install libldap2 libldap2-dev
```


。


## 开发者指南 {#developer-guide}


### 概述 {#overview-1}


其他 OpenSIPS 模块可以使用 LDAP 模块 API 来实现 LDAP 查询功能。这使模块开发者无需关心 LDAP 连接管理与配置。


要使用该 API，模块必须通过 `load_ldap_api` 函数加载它，该函数返回指向 `ldap_api` 结构的指针。该结构包含指向下文所述 API 函数的指针。LDAP 模块的源文件 `api.h` 包含加载该 API 所需的全部声明，必须包含在加载该 API 的文件中。加载 API 通常在模块的 `mod_init` 调用中完成，如下例所示：


```c title="加载 LDAP 模块 API 的代码片段示例"
#include "../../sr_module.h"
#include "../ldap/api.h"

/*
 * 指向 ldap api 的全局指针
 */
extern ldap_api_t ldap_api;

...

static int mod_init(void)
{
    /*
     * 加载 LDAP API
     */
    if (load_ldap_api(&ldap_api) != 0)
    {
        LM_ERR("Unable to load LDAP API - this module requires ldap module\n");
        return -1;
    }

    ...
}

...
		
				
```


随后即可像下例那样使用这些 API 函数：


```c title="LDAP 模块 API 函数调用示例"
...
	
    rc = ldap_api.ldap_rfc4515_escape(str1, str2, 0);	
				
...		
		
				
```


### API 函数 {#api-functions}


#### ldap_params_search


使用作为函数参数给出的参数执行一次 LDAP 查询。


```c
typedef int (*ldap_params_search_t)(int* _ld_result_count,
                                    char* _lds_name,
                                    char* _dn,
                                    int _scope,
                                    char** _attrs,
                                    char* _filter,
                                    ...);

			
```


**int* _ld_result_count**


函数把返回的 LDAP 条目数存入 `_ld_result_count`。


**char* _lds_name**


在 LDAP 模块配置文件中配置的 LDAP 会话名。


**char* _dn**


LDAP 查询 DN。


**int _scope**


LDAP 查询范围，取 `LDAP_SCOPE_ONELEVEL`、`LDAP_SCOPE_BASE` 或 `LDAP_SCOPE_SUBTREE` 之一，如 OpenLDAP 的 `ldap.h` 中所定义。


**char** _attrs**


以空字符结尾的属性类型数组，指定要从条目中返回的属性。若为空（`NULL`），则返回所有属性类型。


**char* _filter**


符合 RFC 4515 的 LDAP 查询过滤器字符串。该字符串中的 `printf` 模式会被 `_filter` 参数之后的函数参数值替换。


**-1**


内部错误。


**0**


成功，`_ld_result_count` 包含找到的 LDAP 条目数。


#### ldap_url_search


使用 LDAP URL 执行一次 LDAP 查询。


```c
typedef int (*ldap_url_search_t)(char* _ldap_url,
                                 int* _result_count);

			
```


**char* _ldap_url**


如 [ldap url](#ldap-urls) 中所述的 LDAP URL。


**int* _result_count**


函数把返回的 LDAP 条目数存入 `_ld_result_count`。


**-1**


内部错误。


**0**


成功，`_ld_result_count` 包含找到的 LDAP 条目数。


#### ldap_result_attr_vals


获取返回的某个 LDAP 属性的值。该函数访问最近一次调用 `ldap_params_search` 或 `ldap_url_search` 返回的 LDAP 结果。`berval` 结构定义在 OpenLDAP 的 `ldap.h` 中，必须包含该头文件。


本函数会分配内存来存储 LDAP 属性值。该内存必须用 `ldap_value_free_len` 函数释放（见下一节）。


```c
typedef int (*ldap_result_attr_vals_t)(str* _attr_name,
                                       struct berval ***_vals);
									   
typedef struct berval {
        ber_len_t       bv_len;
        char            *bv_val;
} BerValue;

			
```


**str* _attr_name**


保存 LDAP 属性名的 `str` 结构。


**struct berval ***_vals**


以空指针结尾的数组，包含该属性值。


**-1**


内部错误。


**0**


成功，`_vals` 包含该属性值。


**1**


未找到属性值。


#### ldap_value_free_len


用于释放由 `ldap_result_attr_vals` 分配的内存。`berval` 结构定义在 OpenLDAP 的 `ldap.h` 中，必须包含该头文件。


```c
typedef void (*ldap_value_free_len_t)(struct berval **_vals);

typedef struct berval {
        ber_len_t       bv_len;
        char            *bv_val;
} BerValue;

			
```


**struct berval **_vals**


由 `ldap_result_attr_vals` 返回的 `berval` 数组。


#### ldap_result_next


递增 LDAP 结果指针。


```c
typedef int (*ldap_result_next_t)();

			
```


**-1**


未找到 LDAP 结果，可能是因为未调用 `ldap_params_search` 或 `ldap_url_search`。


**0**


成功，LDAP 结果指针现在指向下一个结果。


**1**


已没有更多结果可用。


#### ldap_str2scope


把 LDAP 查询范围字符串转换为整型值，例如供 `ldap_params_search` 使用。


```c
typedef int (*ldap_str2scope_t)(char* scope_str);

			
```


**char* scope_str**


LDAP 查询范围字符串。取 "one"、"onelevel"、"base"、"sub" 或 "subtree" 之一。


**-1**


`scope_str` 无法识别。


**n >= 0**


LDAP 查询范围的整型值。


#### ldap_rfc4515_escape


应用 [ldap_filter_url_encode()](#ldap_filter_url_encodestring-avp_spec) 中所述的转义规则。


```c
typedef int (*ldap_rfc4515_escape_t)(str *sin, str *sout, int url_encode);

			
```


**str *sin**


保存待应用转义规则字符串的 `str` 结构。


**str *sout**


保存转义后字符串的 `str` 结构。该字符串的长度必须至少为 `sin` 长度的三倍再加一。


**int url_encode**


标志位，指定 '?' 字符是否转义为 '%3F'。若 `url_encode` 等于 `0`，则 '?' 不被转义。


**-1**


内部错误。


**0**


成功，`sout` 包含转义后的字符串。


#### get_ldap_handle


返回特定 LDAP 会话的 OpenLDAP LDAP 句柄。这使模块开发者可以直接使用 OpenLDAP API 函数，而不必使用 OpenSIPS ldap 模块导出的 API 函数。`LDAP` 结构定义在 OpenLDAP 的 `ldap.h` 中，必须包含该头文件。


```c
typedef int (*get_ldap_handle_t)(char* _lds_name, LDAP** _ldap_handle);

			
```


**char* _lds_name**


在 LDAP 模块配置文件中指定的 LDAP 会话名。


**LDAP** _ldap_handle**


本函数返回的 OpenLDAP LDAP 句柄。


**-1**


内部错误。


**0**


成功，`_ldap_handle` 包含 OpenLDAP LDAP 句柄。


#### get_last_ldap_result


返回最近一次 LDAP 查询操作的 OpenLDAP LDAP 句柄和 OpenLDAP 结果句柄。这些句柄可用作 OpenLDAP LDAP 结果 API 函数的输入。`LDAP` 和 `LDAPMessage` 结构定义在 OpenLDAP 的 `ldap.h` 中，必须包含该头文件。


```c
typedef void (*get_last_ldap_result_t)
	     (LDAP** _last_ldap_handle, LDAPMessage** _last_ldap_result);

			
```


**LDAP** _last_ldap_handle**


本函数返回的 OpenLDAP LDAP 句柄。


**LDAPMessage** _last_ldap_result**


本函数返回的 OpenLDAP 结果句柄。


### 用法示例 {#example-usage}


下例展示如何使用该 API 执行一次 LDAP 查询操作。假定 API 已加载并通过 `ldap_api` 指针可用。


```c
...
	
int rc, ld_result_count, scope = 0;
char* sip_username = "test";

/*
 * 获取 LDAP 查询范围的整型值
 */
scope = ldap_api.ldap_str2scope("sub");
if (scope == -1)
{
    LM_ERR("ldap_str2scope failed\n");
    return -1;
}

/*
 * 执行 LDAP 查询
 */

if (ldap_api.ldap_params_search(
       &ld_result_count,
       "campus",
       "dc=example,dc=com",
       scope,
       NULL,
       "(&(objectClass=SIPIdentity)(SIPIdentityUserName=%s))",
       sip_username)
     != 0)
{
    LM_ERR("LDAP search failed\n");
    return -1;
}

/*
 * 检查结果数量
 */
if (ld_result_count < 1)
{
    LM_ERR("LDAP search returned no entry\n");
    return 1;
}

/*
 * 获取密码属性值 
 */
 
struct berval **attr_vals = NULL;
str ldap_pwd_attr_name = str_init("SIPIdentityPassword");
str res_password;

rc = ldap_api.ldap_result_attr_vals(&ldap_pwd_attr_name, &attr_vals);
if (rc < 0)
{
    LM_ERR("ldap_result_attr_vals failed\n");
    ldap_api.ldap_value_free_len(attr_vals);
    return -1;
}
if (rc == 1)
{
    LM_INFO("No password attribute value found for [%s]\n", sip_username);
    ldap_api.ldap_value_free_len(attr_vals);
    return 2;
}

res_password.s = attr_vals[0]->bv_val;
res_password.len = attr_vals[0]->bv_len;

ldap_api.ldap_value_free_len(attr_vals);

LM_INFO("Password for user [%s]: [%s]\n", sip_username, res_password.s);

...

return 0;		

		
```
<!-- CONTRIBUTORS -->

### 许可证 {#license}

本项目的所有文档文件（即 .md 扩展名的文件）均以 Creative Common License 4.0 授权。
