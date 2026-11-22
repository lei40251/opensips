---
title: "STIR/SHAKEN 模块"
description: "该模块为在 OpenSIPS 中实现 STIR/SHAKEN（RFC 8224、RFC 8588）鉴权与验证服务提供支持。"
---

## 管理指南 {#admin-guide}


### 概述 {#overview}


该模块为在 OpenSIPS 中实现 STIR/SHAKEN（RFC 8224、RFC 8588）鉴权与验证服务提供支持。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


必须先加载以下模块才能加载本模块：


- *不依赖其他 OpenSIPS 模块*。


#### 外部库或应用程序 {#external-libraries-or-applications}


加载本模块运行 OpenSIPS 之前，必须先安装以下库或应用程序：


- *openssl (libssl)*。


### 导出的参数 {#exported-parameters}


#### auth_date_freshness (integer)


Date 头域中的取值可以比当前时间早的最大秒数。


该参数仅与 [stir_shaken_auth()](#stir_shaken_authattest-origid-cert-pkey-x5u-orig-dest-out) 函数相关。


默认值为 *60*。


```opensips title="Set auth_date_freshness parameter"
...
modparam("stir_shaken", "auth_date_freshness", 300)
...
```


#### verify_date_freshness (integer) {#verify_date_freshness-integer}


Date 头域中的取值可以比当前时间早的最大秒数。此外，如果 PASSporT 中的 *iat*
值与 Date 值不同，但仍在允许的时间区间内，则在验证过程中（用于重建的 PASSporT）
将使用 *iat* 值而不是 Date 值。


如果 [require_date_hdr](#require_date_hdr-integer) 参数设置为非必填并且缺少 Date 头域，
则改用 *iat* 值进行此项检查。


该参数仅与 [stir_shaken_verify()](#stir_shaken_verifycert-err_code-err_reason-orig-dest) 函数相关。


默认值为 *60*。


```opensips title="Set verify_date_freshness parameter"
...
modparam("stir_shaken", "verify_date_freshness", 300)
...
```


#### ca_list (string)


指向包含验证器所信任 CA 证书的文件的路径。这些证书必须为 PEM 格式，一个接一个排列。


```opensips title="Set ca_list parameter"
...
modparam("stir_shaken", "ca_list", "/stir_certs/ca_list.pem")
...
```


#### ca_dir (string)


指向包含验证器所信任 CA 证书的目录的路径。该目录中的证书必须为哈希形式，
如 [openssl 文档](https://www.openssl.org/docs/manmaster/man3/X509_LOOKUP_hash_dir.html) 中
*Hashed Directory Method* 所述。


```opensips title="Set ca_dir parameter"
...
modparam("stir_shaken", "ca_dir", "/stir_certs/cas")
...
```


#### crl_list (string)


指向包含验证器所用证书吊销列表（CRL）的文件的路径。该文件中只能存放 CRL：
其中的证书会被视为受信任的 CA，因此在启动时和重新加载时都会被拒绝。


```opensips title="Set crl_list parameter"
...
modparam("stir_shaken", "crl_list", "/stir_certs/crl_list.pem")
...
```


#### crl_dir (string)


指向包含验证器所用证书吊销列表（CRL）的目录的路径。该目录中的 CRL 必须为哈希形式，
如 [openssl 文档](https://www.openssl.org/docs/manmaster/man3/X509_LOOKUP_hash_dir.html) 中
*Hashed Directory Method* 所述。


```opensips title="Set crl_dir parameter"
...
modparam("stir_shaken", "crl_dir", "/stir_certs/crls")
...
```


#### e164_strict_mode (integer)


除了默认要求必须为 E.164 电话号码之外，还额外要求主叫/被叫 SHAKEN 身份中包含前导
*"+"*。此外，还要求该 URI 要么是 *tel* URI，要么是带有 *user=phone*
参数的 *sip* / *sips* URI。


默认值为 *0*（禁用）。


```opensips title="Set e164_strict_mode parameter"
...
modparam("stir_shaken", "e164_strict_mode", 1)
...
```


#### e164_max_length (integer)


该参数允许绕过 E.164 格式 15 位数字的长度限制。在使用了多种电话编号前缀、
导致部分号码超出标准最大长度的场景中尤为有用。


默认值为 *15*。


```opensips title="Set e164_max_length parameter"
...
modparam("stir_shaken", "e164_max_length", 16)
...
```


#### require_date_hdr (integer) {#require_date_hdr-integer}


指定在使用 [stir_shaken_verify()](#stir_shaken_verifycert-err_code-err_reason-orig-dest) 函数执行验证时，
Date 头域是否为必填。


取值为 *1* 表示必填，取值为 *0* 表示非必填。


如果该参数设置为"非必填"，但消息中仍然存在 Date 头域，则照常使用该头域的值
检查新鲜度（按 [verify_date_freshness](#verify_date_freshness-integer) 参数的配置）。
如果确实缺少 Date 头域，则改用 PASSporT 中 *iat* 声明的值。


默认值为 *1*（必填）。


```opensips title="Set require_date_hdr parameter"
...
modparam("stir_shaken", "require_date_hdr", 0)
...
```


### 导出的函数 {#exported-functions}


#### stir_shaken_auth(attest, origid, cert, pkey, x5u, [orig], [dest], [out]) {#stir_shaken_authattest-origid-cert-pkey-x5u-orig-dest-out}


该函数执行鉴权服务所需的各个步骤。不过在调用该函数之前，必须确保：


- authority - 服务器对所涉及的身份具有权威性；
- authentication - 发起者有权声称使用给定身份。


各参数含义如下：


- *attest (string)* - 要包含在 PASSporT 中的 'attest' 声明值。可使用以下取值：
				- *A* 或 *full*
				- *B* 或 *partial*
				- *C* 或 *gateway*
- *origid (string)* - 要包含在 PASSporT 中的 'origid' 声明值。
模块将其视为不透明字符串。
- *cert (string)* - 用于计算签名的 X.509 证书，PEM 格式。
- *pkey (string)* - 用于计算签名的私钥，PEM 格式。
- *x5u (string)* - 要包含在 PASSporT 中的 'x5u' 声明值。
模块将其视为不透明字符串。
- *orig (string, optional)* - 在 PASSporT 中用作主叫身份的电话号码。
如果缺省，该值将从 SIP 消息中推导得到。
- *dest (string, optional)* - 在 PASSporT 中用作被叫身份的电话号码。
如果缺省，该值将从 SIP 消息中推导得到。
- *out (string, no expand, optional)* - 输出变量的名称，用于存储 Identity 头域或以下标志位：
	- *req* - Identity 头域将被追加
	- 到当前请求消息；
	- *rpl* - Identity 头域将被追加
	- 到 OpenSIPS 为此请求生成的所有应答。
如果缺少该参数，Identity 头域将被追加到当前请求消息。
如果提供了输出变量，应以带引号的字符串形式给出，例如 *"$var(identity_hdr)"*。


该函数返回以下取值：


- 1：成功
- -1：内部错误
- -3：无法从 SIP 消息中推导身份，因为 URI 不是电话号码
- -4：Date 头域的值早于本地的新鲜度策略
- -5：当前时间或 Date 头域的值不在证书有效期内


该函数可在 REQUEST_ROUTE 中使用。


```opensips title="stir_shaken_auth() usage"
...
stir_shaken_auth("A", "4437c7eb-8f7a-4f0e-a863-f53a0e60251a",
	$var(cert), $var(privKey), "https://certs.example.org/cert.pem");
...
```


#### stir_shaken_verify(cert, err_code, err_reason, [orig], [dest]) {#stir_shaken_verifycert-err_code-err_reason-orig-dest}


该函数执行验证服务所需的各个步骤。


各参数含义如下：


- *cert (string)* - 用于验证签名的 X.509 证书，PEM 格式。
- *err_code (var)* - 输出变量，用于存储验证过程可能出错时对应的
SIP 响应码。
- *err_reason (var)* - 输出变量，用于存储验证过程可能出错时对应的
SIP 响应原因短语。
- *orig (string, optional)* - 在验证过程中用作主叫身份的电话号码。如果缺省，
该值将从 SIP 消息中推导得到。
- *dest (string, optional)* - 在验证过程中用作被叫身份的电话号码。如果缺省，
该值将从 SIP 消息中推导得到。


该函数返回以下取值：


- 1：成功
- -1：内部错误
- -2：未找到 Identity 或 Date 头域
- -3：无法从 SIP 消息中推导身份，因为 URI 不是电话号码
- -4：无效的 Identity 头域
- -5：不支持的 Identity 头域参数 'ppt' 或 'alg'
- -6：Date 头域的值早于本地的新鲜度策略
- -7：Date 头域的值不在证书有效期内
- -8：无效的证书
- -9：签名验证未通过


该函数可在 REQUEST_ROUTE 中使用。


```opensips title="stir_shaken_verify() usage"
...
$var(rc) = stir_shaken_verify($var(cert), $var(err_code), $var(err_reason));
if ($var(rc) < -1) {
	send_reply($var(err_sip_code), $var(err_sip_reason));
	exit;
}
...
```


#### stir_shaken_check()


该函数检查 Identity 头域，以便从格式上校验 STIR/SHAKEN 信息。
它可检测如下问题：缺失或格式错误的 PASSporT 声明、不支持的扩展等。


该函数返回以下取值：


- 1：成功
- -1：内部错误
- -2：未找到 Identity 头域
- -3：无效的 Identity 头域
- -4：不支持的 Identity 头域参数 'ppt' 或 'alg'


该函数可在 REQUEST_ROUTE 中使用。


```opensips title="stir_shaken_check() usage"
...
if (stir_shaken_check()) {
	xlog("forwarding call to stir/shaken verification service\n");
	...
}
...
```


#### stir_shaken_check_cert()


该函数检查当前时间是否落在给定证书的有效期内。


该函数返回以下取值：


- 1：成功
- -1：内部错误
- -2：证书无效


该函数可在 REQUEST_ROUTE 中使用。


```opensips title="stir_shaken_check_cert() usage"
...
# 更新已过期的缓存证书
cache_fetch("local", $identity(x5u), $var(cert));
if (!stir_shaken_check_cert($var(cert))) {
	rest_get($identity(x5u), $var(cert));
	cache_store("local", $identity(x5u), $var(cert));
}
...
```


#### stir_shaken_disengagement(token)


该函数在 SIP 头域末尾追加带有 token 值的 P-Identity-Bypass 头域。


各参数含义如下：


- *token (string)* - 故障期间由权威机构提供的 token。


该函数返回以下取值：


- 1：成功
- 0：添加 P-Identity-Bypass 头域失败


该函数可在 REQUEST_ROUTE 中使用。


```opensips title="stir_shaken_disengagement() usage"
...
if ( is_method("INVITE") && !has_totag()) {
	# 等价于 sipmsgops 模块的：append_hf("P-Identity-Bypass: OSIP99-1234567890ABCDEF\r\n");
	stir_shaken_disengagement("OSIP99-1234567890ABCDEF");
}
...
```


### 导出的伪变量 {#exported-pseudo-variables}


#### $identity(field)


这是一个只读伪变量，可通过以下子名称访问从 Identity 头域解析出的信息：


- *header* - 完整的 PASSporT 头部；
- *x5u* - PASSporT 'x5u' 声明的值；
- *payload* - 完整的 PASSporT 载荷；
- *attest* - PASSporT 'attest' 声明的值；
- *dest* - PASSporT 'dest' 声明中 'tn' 成员的值；
- *iat* - PASSporT 'iat' 声明的值；
- *orig* - PASSporT 'orig' 声明中 'tn' 成员的值；
- *origid* - PASSporT 'origid' 声明的值；


```opensips title="identity usage"
...
	# 获取用于验证过程的证书
	$var(rc) = rest_get($identity(x5u), $var(cert));
	if ($var(rc) < 0) {
		send_reply(436, "Bad Identity Info");
		exit;
	}
	...
	xlog("Verified caller:$identity(orig), attestation level: $identity(attest)\n");
...
	
```


### 导出的 MI 函数 {#exported-mi-functions}


#### stir_shaken_ca_reload


重新加载包含验证器所信任 CA 证书的文件，以及包含验证器所信任 CA 证书的目录。


CRL 也会随之重新加载，因为 CA 与 CRL 共用同一个证书存储，因此该命令
与 *stir_shaken_crl_reload* 的作用相同。


*ca_list* 与 *crl_list* 由执行该命令的进程读取一次。如果加载失败，命令会返回错误，
且不做任何变更。否则将发布新内容，每个 OpenSIPS 进程会在下一次证书检查之前
切换到新内容，包括稍后启动的进程；即使磁盘上的文件再次发生变化也是如此。
*ca_dir*、*crl_dir* 以及系统的默认 CA 证书不在此次复制的范围内：每个进程在首次
需要从中获取证书时才会从磁盘读取它们。"OK" 表示新内容已发布；未能切换到新内容的
进程会记录错误、保留其原有存储，并约每秒重试一次。


名称：*stir_shaken_ca_reload*


参数：*无*


MI FIFO 命令格式：


```bash
...
$ opensips-cli -x mi stir_shaken_ca_reload
"OK"
...
```


#### stir_shaken_crl_reload


重新加载包含验证器所用证书吊销列表（CRL）的文件，以及包含验证器所用证书吊销列表的目录。


受信任的 CA 证书也会随之重新加载，因为 CA 与 CRL 共用同一个证书存储，因此该命令
与 *stir_shaken_ca_reload* 的作用相同。


*ca_list* 与 *crl_list* 由执行该命令的进程读取一次。如果加载失败，命令会返回错误，
且不做任何变更。否则将发布新内容，每个 OpenSIPS 进程会在下一次证书检查之前
切换到新内容，包括稍后启动的进程；即使磁盘上的文件再次发生变化也是如此。
*ca_dir*、*crl_dir* 以及系统的默认 CA 证书不在此次复制的范围内：每个进程在首次
需要从中获取证书时才会从磁盘读取它们。"OK" 表示新内容已发布；未能切换到新内容的
进程会记录错误、保留其原有存储，并约每秒重试一次。


名称：*stir_shaken_crl_reload*


参数：*无*


MI FIFO 命令格式：


```bash
...
$ opensips-cli -x mi stir_shaken_crl_reload
"OK"
...
```
<!-- CONTRIBUTORS -->

### 许可证 {#license}

所有文档文件（即 .md 扩展名）均按 Creative Common License 4.0 许可协议授权。
