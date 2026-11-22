---
title: "tls_mgm 模块"
description: "本模块是用于 TLS 证书与参数的管理模块。"
---

## 管理指南 {#admin-guide}


### 概述 {#overview}


本模块是 TLS 证书与参数的管理模块。它为所有使用 TLS 协议的模块
提供接口，同时导出与证书及 TLS 参数相关的伪变量。


### 用法 {#usage}


本模块用于为所有使用 TLS 传输层的模块（如
*proto_tls* 或 *proto_wss*）配置 TLS 证书与参数。
模块支持多个
虚拟域，可将这些域分配给不同的监听地址
（服务器）或新连接（客户端）。每个使用
本管理模块的 TLS 模块都应将自己分配到一个或多个域。


该模块既可以通过模块参数（脚本层面）定义 TLS 域，
也可以通过 SQL 表定义。


介绍本模块用法的脚本示例见
[TLS 示例](#opensips-with-tls---script-example)。


### TLS 库 {#tls-libraries}


除 TLS 证书与参数外，本模块还充当
实际 TLS 实现（由
*openSSL* 或 *wolfSSL* 库提供）
与 *proto_tls*、*proto_wss* 等传输协议模块之间的接口。*tls_mgm* 模块
将 *tls_openssl* 与 *tls_wolfssl* 模块实现的 TLS 操作
透明地暴露给上层的 OpenSIPS 传输模块。


TLS 库的选择可经由
[tls_library](#tls_library-string) 模块参数进行配置。


### TLS 域 {#tls-domains}


「TLS 域」这一说法意味着该 TLS 连接将具有与
另一个 TLS 连接（来自另一个 TLS 域）不同的
参数。因此，TLS
域与不同的 SIP 域并无直接关系，尽管两者
常结合使用。根据 TLS 握手的发起方向，
TLS 域被称为「客户端域」（= 出站 TLS 连接）或「服务器域」
（= 入站 TLS 连接）。


若运行多个 SIP 域，可以为每个域单独指定部分参数
（无论配置文件中
只有一个还是多个 socket=tls:ip:port 条目）。


例如，TLS 域可用于支持 TLS 的虚拟主机场景。
OpenSIPS 为多个域提供 SIP 服务，如 atlanta.com 与 biloxi.com。尽管
两个域都托管在同一个 SIP 代理上，该 SIP 代理仍需要 2 张证书：一张
用于 atlanta.com，一张用于 biloxi.com。对于入站 TLS 连接，SIP 代理
必须在 TLS 握手期间出示相应的证书。由于此时 SIP 代理
尚未收到 SIP 消息（收到消息是在 TLS 握手之后完成），SIP
代理无法从 SIP 中获取目标域（通常是从
请求 URI 中的域获取）。因此，必须通过使用多个监听套接字，或
由客户端在
握手过程中发送 Servername TLS 扩展（SNI）来区分这些域。


对于出站 TLS 连接，TLS 域基于底层出站 TCP 连接的目标套接字来选择，
和/或通过 AVP 在脚本层面做出决定。例如，可以检查 RURI 或 From 等头域，
并将 SIP 头域中的域与为 TLS 域设置的过滤器进行匹配。


> [!NOTE]
> 除 tls_handshake_timeout 与 tls_send_timeout 外，所有 TLS 参数都可以按 TLS 域分别设置。


### 定义 TLS 域 {#defining-tls-domains}


TLS 域可以通过两种方式定义：


- 设置 *server_domain* 或 *client_domain* 模块参数
- 在 DB 中配置


对于在 DB 中定义的域，证书、私钥、受信任 CA 列表以及 Diffie-Hellman 参数以 BLOB 值形式配置，而对于脚本定义的域，必须提供文件路径。


可以同时在 DB 和脚本中定义域。


对任意 TLS 域（无论通过脚本还是 DB 定义），若未另行指定，默认设置为：


- method - *SSLv23*
- verify_cert - *1*
- require_cert - *1*
- certificate - *CFG_DIR/tls/cert.pem*
- private_key - *CFG_DIR/tls/ckey.pem*
- crl_check_all - *0*
- crl_dir - none
- ca_list - none
- ca_dir - */etc/pki/CA/*
- cipher_list -  the OpenSSL default ciphers
- dh_params -  none
- ec_curve -  none


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


在加载本模块之前，必须先加载以下模块：


- *tls_openssl* 或 *tls_wolfssl*，
除非 [tls_library](#tls_library-string) 设置为 'none'。


#### 外部库依赖 {#dependencies-of-external-libraries}


在加载本模块运行 OpenSIPS 之前，
必须先安装以下库或应用程序：


- *无*。


### 导出的函数 {#exported-functions}


#### is_peer_verified


若消息经由 TLS 接收且对端在 TLS 连接握手期间
通过验证，则返回 1，否则返回 -1


该函数可在 REQUEST_ROUTE 中使用。


```opensips title="is_peer_verified usage"
...
if (is_peer_verified()) {
        xlog("L_INFO","request from verified TLS peer\n");
} else {
        xlog("L_INFO","request not verified\n");
}
...
```


### 导出的 MI 函数 {#exported-mi-functions}


#### tls_list


列出所有域信息。


#### tls_reload


从数据库重新加载 TLS 域信息。
原先由 DB 定义的域将被丢弃，
而脚本定义的域会被保留。


### 导出的参数 {#exported-parameters}


所有这些参数都可在 opensips.cfg 文件中使用，
用于配置 OpenSIPS-TLS 的行为。


#### listen=interface


并非 TLS 专用。用于指定协议
（udp、tcp、tls）、IP 地址以及
监听服务器所在的端口。


```opensips title="Set listen variable"
...
socket= tls:1.2.3.4:5061
...
				
```


#### tls_library (string) {#tls_library-string}


选择要使用的 TLS 库。可选值：


- *auto* - 自动检测加载了哪个 TLS 库
模块（*tls_openssl* 或 *tls_wolfssl*）。
若未找到任何模块，或同时找到两个模块，
OpenSIPS 将不会启动。
- *none* - 不使用任何 TLS 库；当 *tls_mgm* 模块仅
被 *db_mysql*、*rabbitmq* 等模块用于管理 TLS 证书与参数时
（而非被 *proto_tls* 等传输模块
用于 TLS 操作），此项很有用。
- *openssl* - 通过 *tls_openssl* 模块
使用 *openSSL* 库。
- *wolfssl* - 通过 *tls_wolfssl* 模块
使用 *wolfSSL* 库。


默认值为 *auto*。


```opensips title="Set tls_library variable"
...
modparam("tls_mgm", "tls_library", "none")
...
				
```


#### tls_method ([domain]\(string\))


设置 TLS 协议。domain 部分表示
TLS 域的名称。支持的 TLS 方法包括：


- *TLSv1_3* - 表示 OpenSIPS
仅接受 TLSv1.3 连接。该版本仅在
OpenSSL 1.1.1 及以上版本中可用。
- *TLSv1_2* - 表示 OpenSIPS
仅接受 TLSv1.2 连接（符合 rfc3261）。
- *TLSv1* - 表示 OpenSIPS
仅接受 TLSv1 连接（符合 rfc3261）。
- *SSLv23* - 表示 OpenSIPS
接受上述任意方法，但初始 SSL
hello 必须为 v2（在初始 hello 中会通告
所有支持的协议，从而可以切换到更高、
更安全的版本）。初始 v2 hello 意味着
它不接受仅支持 SSLv3 或 TLSv1 的
客户端连接。


*如果使用的 OpenSSL 库版本高于 1.1.0，也可以
将可接受的 TLS 版本范围指定为 [VLOW]-[VHIGH]。
若未指定 VLOW，则使用支持的最低
协议版本；若未指定 VHIGH，则使用
支持的最高协议版本。这意味着若范围内
高低值都缺失，将接受所有支持的
方法，但与 SSLv23 不同的是，它不要求
初始 hello 为 SSLv2。*


*默认值为 SSLv23。*


> [!WARNING]
> 为与旧系统获得更好的兼容性，最好使用 SSLv23。


若希望符合 RFC3261，且所有客户端都支持
TLSv1（或计划仅在不同 OpenSIPS 代理之间
使用加密「隧道」），请使用 TLSv1。若希望
支持较旧的客户端，请使用 SSLv23（事实上大多数
支持 SSL 的应用程序都使用 SSLv23 方法）。


```opensips title="Set tls_method variable"
...
modparam("tls_mgm", "tls_method", "[dom]TLSv1")
...
				
```


```opensips title="Set tls_method range variable"
...
modparam("tls_mgm", "tls_method", "[dom]TLSv1-TLSv1_3")  # v1 到 v1.3 之间
modparam("tls_mgm", "tls_method", "[dom]TLSv1-")         # v1 或更高
modparam("tls_mgm", "tls_method", "[dom]-TLSv1_2")       # 最高到 v1.2
modparam("tls_mgm", "tls_method", "[dom]-")              # 所有支持的版本
...
				
```


#### certificate ([domain]\(string\))


OpenSIPS 的公开证书文件。它将用作
入站 TLS 连接的服务器端证书，以及
出站 TLS 连接的客户端证书。domain
部分表示 TLS 域的名称。


*默认值为 "CFG_DIR/tls/cert.pem"。*


```opensips title="Set certificate variable"
...
modparam("tls_mgm", "certificate", "[dom]/mycerts/certs/opensips_server_cert.pem")
...
				
```


#### private_key ([domain]\(string\))


上述证书的私钥。必须将其保存在
安全位置并设置严格的权限！domain 部分
表示 TLS 域的名称。


*默认值为 "CFG_DIR/tls/ckey.pem"。*


```opensips title="Set private_key variable"
...
modparam("tls_mgm", "private_key", "[dom]/mycerts/private/prik.pem")
...
				
```


#### ca_list ([domain]\(string\))


受信任 CA 列表。文件中包含可接受的
证书，一个接一个。它必须是文件，
而非文件夹。domain 部分表示
TLS 域的名称。


*默认值为 ""。*


```opensips title="Set ca_list variable"
...
modparam("tls_mgm", "ca_list", "[dom]/mycerts/certs/ca_list.pem")
...
				
```


#### ca_dir ([domain]\(string\))


存放受信任 CA 的目录。目录中的证书
必须为哈希形式，如
[openssl 文档](https://www.openssl.org/docs/manmaster/man3/X509_LOOKUP_hash_dir.html) 中关于
*Hashed Directory Method* 的说明所述。domain 部分
表示 TLS 域的名称。


*默认值为 "/etc/pki/CA/"。*


```opensips title="Set ca_dir variable"
...
modparam("tls_mgm", "ca_dir", "[dom]/mycerts/certs")
...
				
```


#### crl_dir ([domain]\(string\))


存放证书吊销列表（CRL）的目录。domain
部分表示 TLS 域的名称。


*若未设置该参数，则不会使用任何 CRL。*


```opensips title="Set crl_dir variable"
...
modparam("tls_mgm", "crl_dir", "[dom]/mycerts/crls")
...
				
```


#### crl_check_all ([domain]\(string\))


将该参数设置为非零整数值，可对整个证书链
启用 CRL 检查。


*默认情况下，仅检查证书链中的
叶证书。*


```opensips title="Set crl_check_all variable"
...
modparam("tls_mgm", "crl_check_all", "[dom]1")
...
				
```


#### ciphers_list ([domain]\(string\))


可以指定所允许的用于鉴权
与加密的算法列表。domain 部分
表示 TLS 域的名称。要获取加密套件列表
并从中选择，可使用 openssl 应用程序：


- openssl ciphers 'ALL:eNULL:!LOW:!EXPORT'


> [!WARNING]
> 不要使用 NULL 算法（不加密）……仅用于测试！！！


*默认使用 OpenSSL 默认的加密套件。*


```opensips title="Set ciphers_list variable"
...
modparam("tls_mgm", "ciphers_list", "[dom]NULL")
...
				
```


#### dh_params ([domain]\(string\))


可以指定一个以 PEM 文件格式包含
Diffie-Hellman 参数的文件。若希望
指定包含 Diffie-Hellman 模式的加密套件，则需要此项。
domain 部分表示 TLS 域的名称。


*默认不设置 dh 参数文件。*


```opensips title="Set dh_params variable"
...
modparam("tls_mgm", "dh_params", "[dom]/etc/pki/CA/dh1024.pem")
...		
```


#### ec_curve ([domain]\(string\))


可以指定用于
需要椭圆曲线的加密套件的椭圆曲线。domain 部分
表示 TLS 域的名称。


仅当编译时启用了 TLS v1.1/1.2 支持时可用。
可使用的曲线列表可通过以下命令获取


```bash
openssl ecparam -list_curves
```


*默认不设置椭圆曲线。*


#### verify_cert ([domain]\(string\)) {#verify_cert-domainstring}


在 ssl_context 中激活 SSL_VERIFY_PEER。详细
说明请查阅 *openssl* 文档。


domain 部分表示 TLS 域的名称。


默认值为 *1*。


```opensips title="Set verify_cert variable"
...
modparam("tls_mgm", "verify_cert", "[dom]0")
...
```


#### require_cert ([domain]\(string\))


在 ssl_context 中激活 SSL_VERIFY_FAIL_IF_NO_PEER_CERT。详细
说明请查阅 *openssl*
文档。该参数仅对服务器域有意义，
且需同时设置 [verify_cert](#verify_cert-domainstring) 参数。


domain 部分表示 TLS 域的名称。


默认值为 *1*。


```opensips title="Set require_cert variable"
...
modparam("tls_mgm", "require_cert", "[dom]0")
...
```


#### client_tls_domain_avp (string)


用于强制选择特定 TLS
客户端域的 AVP 名称。将该 AVP 设置为某个 TLS 客户端域的名称，
将导致忽略标准匹配机制
而使用该特定域。


> [!NOTE]
> 若已存在到远程目标的 TLS 连接，
> 该连接将被复用，设置此 AVP 无效。


> [!NOTE]
> 可以为同一名称的 *$bavp* 变量赋值，
> 从而仅对特定分支强制使用某个域。当同时设置 *$bavp* 与 *$avp*
> 变量时，前者优先。


*无默认值。*


```opensips title="Set client_tls_domain_avp variable"
...
modparam("tls_mgm", "client_tls_domain_avp", "tls_match_dom")
...
```


#### client_sip_domain_avp (string) {#client_sip_domain_avp-string}


设置 TLS 客户端域匹配过程中所用 SIP 域的
AVP 名称。


> [!NOTE]
> 若已存在到远程目标的 TLS 连接，
> 该连接将被复用，设置此 AVP 无效。


> [!NOTE]
> 可以为同一名称的 *$bavp* 变量赋值，
> 从而仅对特定分支强制使用某个 SIP 域。当同时设置 *$bavp* 与 *$avp*
> 变量时，前者优先。


AVP 用法示例请参阅  [server_domain, client_domain](#server_domain-client_domain-string)。


*无默认值。*


```opensips title="Set client_sip_domain_avp variable"
...
modparam("tls_mgm", "client_sip_domain_avp", "sip_match_dom")
...
```


#### db_url (string)


数据库 url。不能为 NULL。


对于 tls_mgm 模块自身连接数据库的 TLS 连接，
不能使用 "tls_domain=*dom_name*" URL 参数。


```opensips title="Usage of db_url block"
modparam("tls_mgm", "db_url", "mysql://root:admin@localhost/opensips")
```


#### db_table (string)


设置数据库表名。


默认值为 "tls_mgm"。


```opensips title="Usage of db_table block"
modparam("tls_mgm", "db_table", "tls_mgm")               
```


#### domain_col (string)


设置 TLS 域列的名称。


默认值为 "domain"。


```opensips title="Usage of domain_col block"
modparam("tls_mgm", "domain_col", "tls_domain")             
```


#### match_ip_address_col (string)


设置 IP 地址匹配列名。


默认值为 "match_ip_address"。


```opensips title="Usage of match_ip_address_col block"
modparam("tls_mgm", "match_ip_address_col", "addr")       
```


#### match_sip_domain_col (string)


设置 SIP 域匹配列名。


默认值为 "match_sip_domain"。


```opensips title="Usage of match_sip_domain_col block"
modparam("tls_mgm", "match_sip_domain_col", "addr")
```


#### tls_method_col (string)


设置方法列名。


默认值为 "method"。


```opensips title="Usage of tls_method_col block"
modparam("tls_mgm", "tls_method_col", "method")
```


#### verify_cert_col (string)


设置证书验证列名。


默认值为 "verify_cert"。


```opensips title="Usage of vertify_cert_col block"
modparam("tls_mgm", "verify_cert_col", "verify_cert") 
```


#### require_cert_col (string)


设置要求证书列名。


默认值为 "require_cert"。


```opensips title="Usage of require_cert_col block"
modparam("tls_mgm", "require_cert_col", "req") 
```


#### certificate_col (string)


设置证书列名。


默认值为 "certificate"。


```opensips title="Usage of certificate_col block"
modparam("tls_mgm", "certificate_col", "certificate") 
```


#### private_key_col (string)


设置私钥列名。


默认值为 "private_key"。


```opensips title="Usage of private_key_col block"
modparam("tls_mgm", "private_key_col", "pk")
```


#### crl_check_all_col (string)


设置 crl_check_all 列名。


默认值为 "crl_check_all"。


```opensips title="Usage of crl_check_all block"
modparam("tls_mgm", "crl_check_all_col", "crl_check")
```


#### crl_dir_col (string)


设置 crl 目录列名。


默认值为 "crl_dir"。


```opensips title="Usage of crl_dir_col block"
modparam("tls_mgm", "crl_dir_col", "crl_dir")
```


#### ca_list_col (string)


设置 CA 列表列名。


默认值为 "ca_list"。


```opensips title="Usage of ca_list_col block"
modparam("tls_mgm", "ca_list_col", "ca_list")
```


#### ca_dir_col (string)


设置 CA 目录列名。


默认值为 "ca_dir"。


```opensips title="Usage of ca_dir_col block"
modparam("tls_mgm", "ca_dir_col", "ca_dir")
```


#### ciphers_list_col (string)


设置加密套件列表列名。


默认值为 "cipher_list"。


```opensips title="Usage of ciphers_list_col block"
modparam("tls_mgm", "ciphers_list_col", "cipher_list")
```


#### dh_params_col (string)


设置 Diffie-Hellmann 参数列名。


默认值为 "dh_params"。


```opensips title="Usage of dh_params_col block"
modparam("tls_mgm", "dh_params_col", "dh_parms")
```


#### ec_curve_col (string)


设置 ec_curve 列名。


默认值为 "ec_curve"。


```opensips title="Usage of ec_curve_col block"
modparam("tls_mgm", "ec_curve_col", "ec_curve")
```


#### match_ip_address (string)


用于将 TLS 连接与
虚拟 TLS 域匹配的 IP 地址和端口。对于 TLS 服务器域，这些值将与
接收连接所用的套接字进行匹配。对于
TLS 客户端域，这些值将与连接的目标
套接字进行比较。


该参数接受一个值列表，特殊值 "*"
表示：匹配任意地址。


*默认值为 "*"（匹配任意地址）。*


```opensips title="Set match_ip_address variable"
...
modparam("tls_mgm", "match_ip_address", "[dom1]10.0.0.10:5061, 10.0.0.11:5061")
...
```


#### match_sip_domain (string)


用于将 TLS 连接与
虚拟 TLS 域匹配的 SIP 域。对于 TLS 服务器域，这些值将与
TLS Servername 扩展（SNI）中提供的主机名匹配。
对于 TLS 客户端域，这些值将与
[client_sip_domain_avp](#client_sip_domain_avp-string) AVP 的值进行比较。


该参数接受 FQDN 列表或以下特殊值：


- \* - 匹配任意 sip 域（
对于 TLS 服务器域，包括未提供 SNI 的情况）；
- *none* - 在未提供 SNI 时匹配
该 TLS 域（仅对 TLS 服务器域
有意义）。注意，若提供了 SNI 但不匹配任何
其他 SIP 域过滤器，连接将被拒绝。


FQDN 可以使用 Unix shell 风格的通配符指定。若
存在多个潜在匹配，将选择最具体的域
（例如，对 "foo.bar.com" 的请求会匹配以
"foo.bar.com" 指定的域，而非以 "*.bar.com" 指定的域）。


*默认值为 "\*"（匹配任意 sip 域）。*


```opensips title="Set match_sip_domain variable"
...
modparam("tls_mgm", "match_sip_domain", "[dom1]foo.com, bar.com, *.baz.com")
modparam("tls_mgm", "match_sip_domain", "[default_dom]*")
...
				
```


#### server_domain, client_domain (string) {#server_domain-client_domain-string}


可通过这些参数定义虚拟 TLS 域。


这些参数的值表示虚拟 tls 域的名称，
仅用于标识。


```opensips title="Usage of tls_client_domain and tls_server_domain block"
...
socket=tls:10.0.0.10:5061
...
# 设置 TLS 客户端域 AVP
modparam("tls_mgm", "client_sip_domain_avp", "tls_sip_dom")
...

# 'atlanta' 服务器域
modparam("tls_mgm", "server_domain", "dom1")
modparam("tls_mgm", "match_ip_address", "[dom1]10.0.0.10:5061")
modparam("tls_mgm", "match_sip_domain", "[dom1]atlanta.com")

modparam("tls_mgm", "certificate", "[dom1]/certs/atlanta.com/cert.pem")
modparam("tls_mgm", "private_key", "[dom1]/certs/atlanta.com/privkey.pem")
modparam("tls_mgm", "ca_list", "[dom1]/certs/wellknownCAs")
modparam("tls_mgm", "tls_method", "[dom1]tlsv1")
modparam("tls_mgm", "verify_cert", "[dom1]1")
modparam("tls_mgm", "require_cert", "[dom1]1")

#'biloxi' 服务器域
modparam("tls_mgm", "server_domain", "dom2")
modparam("tls_mgm", "match_ip_address", "[dom2]10.0.0.10:5061")
modparam("tls_mgm", "match_sip_domain", "[dom2]biloxi.com")

modparam("tls_mgm", "certificate", "[dom2]/certs/biloxi.com/cert.pem")
modparam("tls_mgm", "private_key", "[dom2]/certs/biloxi.com/privkey.pem")
modparam("tls_mgm", "ca_list", "[dom2]/certs/wellknownCAs")
modparam("tls_mgm", "tls_method", "[dom2]tlsv1")
modparam("tls_mgm", "verify_cert", "[dom2]1")
modparam("tls_mgm", "require_cert", "[dom2]1")

# 通用 TLS 服务器域，用于客户端未提供 SNI 的情况
modparam("tls_mgm", "server_domain", "dom3")
modparam("tls_mgm", "match_ip_address", "[dom3]10.0.0.10:5061")
modparam("tls_mgm", "match_sip_domain", "[dom3]none")

modparam("tls_mgm", "certificate", "[dom3]/certs/generic/cert.pem")
modparam("tls_mgm", "private_key", "[dom3]/certs/generic/privkey.pem")
modparam("tls_mgm", "ca_list", "[dom3]/certs/wellknownCAs")
modparam("tls_mgm", "tls_method", "[dom3]tlsv1")
modparam("tls_mgm", "verify_cert", "[dom3]1")
modparam("tls_mgm", "require_cert", "[dom3]1")

# 'atlanta' 客户端域
modparam("tls_mgm", "client_domain", "dom4")
modparam("tls_mgm", "match_ip_address", "[dom4]*")
modparam("tls_mgm", "match_sip_domain", "[dom4]atlanta.com")


modparam("tls_mgm", "certificate", "[dom4]/certs/atlanta.com/cert.pem")
modparam("tls_mgm", "private_key", "[dom4]/certs/atlanta.com/privkey.pem")
modparam("tls_mgm", "ca_list", "[dom4]/certs/wellknownCAs")
modparam("tls_mgm", "tls_method", "[dom4]tlsv1")
modparam("tls_mgm", "verify_cert", "[dom4]1")
modparam("tls_mgm", "require_cert", "[dom4]1")

# 'biloxi' 客户端域
modparam("tls_mgm", "client_domain", "dom5")
modparam("tls_mgm", "match_ip_address", "[dom5]*")
modparam("tls_mgm", "match_sip_domain", "[dom5]biloxi.com")

modparam("tls_mgm", "certificate", "[dom5]/certs/biloxi.com/cert.pem")
modparam("tls_mgm", "private_key", "[dom5]/certs/biloxi.com/privkey.pem")
modparam("tls_mgm", "ca_list", "[dom5]/certs/wellknownCAs")
modparam("tls_mgm", "tls_method", "[dom5]tlsv1")
modparam("tls_mgm", "verify_cert", "[dom5]1")
modparam("tls_mgm", "require_cert", "[dom5]1")

# 面向 GW 提供商的 TLS 客户端域
modparam("tls_mgm", "client_domain", "dom6")
modparam("tls_mgm", "match_ip_address", "[dom6]1.2.3.4:6677")
modparam("tls_mgm", "match_sip_domain", "[dom6]*")

modparam("tls_mgm", "certificate", "[dom6]/certs/gw/cert.pem")
modparam("tls_mgm", "private_key", "[dom6]/certs/gw/privkey.pem")
modparam("tls_mgm", "ca_list", "[dom6]/certs/wellknownCAs")
modparam("tls_mgm", "tls_method", "[dom6]tlsv1")
modparam("tls_mgm", "verify_cert", "[dom6]0")

...
route{
...
    # 使用 RURI 中的 SIP 域匹配 TLS 客户端域
    $avp(tls_sip_dom) = $rd;
    t_relay();
    exit;
...
    # 发往 PSTN GW 的呼叫将通过 IP 匹配正确的 TLS 域
    t_relay("tls:1.2.3.4:6677");
    exit;
...
				
```


### 变量 {#variables}


本模块导出以下变量：


有些变量同时适用于对端证书与本地证书。此外，
部分参数可以从 "Subject" 字段或 "Issuer" 字段读取。


#### $tls_version


*$tls_version* - 接收消息所用的
TLS 连接上使用的 TLS/SSL 版本。
字符串类型。


#### $tls_description


*$tls_description* - 接收消息所用的
TLS 连接的 TLS/SSL 描述。
字符串
类型。


#### $tls_cipher_info


*$tls_cipher_info* - 接收消息所用的
TLS 连接上使用的 TLS/SSL 加密套件。
字符串类型。


#### $tls_cipher_bits


*$tls_cipher_bits* - 接收消息所用的
TLS 连接上使用的加密位数。
字符串与整型。


#### $tls_[peer|my]_version


*$tls_[peer|my]_version* - 证书的
版本。字符串类型。


#### $tls_[peer|my]_serial


*$tls_[peer|my]_serial* - 证书的
序列号。字符串与整型。


#### $tls_[peer|my]_[subject|issuer]


*$tls_[peer|my]_[subject|issuer]* - 证书
issuer/subject 部分中各字段的 ASCII 转储。
字符串类型。


```c title="Example of $tls_[peer|my]_[subject|issuer]"
/C=AT/ST=Vienna/L=Vienna/O=enum.at/CN=enum.at
```


#### $tls_[peer|my]_[subject|issuer]_cn


*$tls_[peer|my]_[subject|issuer]_cn* -
证书 issuer/subject 部分的
commonName。字符串类型。


#### $tls_[peer|my]_[subject|issuer]_locality


*$tls_[peer|my]_[subject|issuer]_locality* -
证书 issuer/subject 部分的
localityName。字符串类型。


#### $tls_[peer|my]_[subject|issuer]_country


*$tls_[peer|my]_[subject|issuer]_country* -
证书 issuer/subject 部分的
countryName。字符串类型。


#### $tls_[peer|my]_[subject|issuer]_state


*$tls_[peer|my]_[subject|issuer]_state* -
证书 issuer/subject 部分的
stateOrProvinceName。字符串类型。


#### $tls_[peer|my]_[subject|issuer]_organization


*$tls_[peer|my]_[subject|issuer]_organization* -
证书 issuer/subject 部分的 organizationName。
字符串类型。


#### $tls_[peer|my]_[subject|issuer]_unit


*$tls_[peer|my]_[subject|issuer]_unit* -
证书 issuer/subject 部分的
organizationalUnitName。字符串类型。


#### $tls_[peer|my]_san_email


*$tls_[peer|my]_san_email* - "subject alternative name" 扩展中的
电子邮箱地址。字符串类型。


#### $tls_[peer|my]_san_hostname


*$tls_[peer|my]_san_hostname* - "subject alternative name" 扩展中的
主机名（DNS）。字符串
类型。


#### $tls_[peer|my]_san_uri


*$tls_[peer|my]_san_uri* - "subject alternative name" 扩展中的
URI。字符串类型。


#### $tls_[peer|my]_san_ip


*$tls_[peer|my]_san_ip* - "subject alternative name" 扩展中的
ip 地址。字符串类型。


#### $tls_peer_verified


*$tls_peer_verified* - 若对端证书
验证成功则返回 1，否则返回 0。
字符串与整型。


#### $tls_peer_revoked


*$tls_peer_revoked* - 若对端证书
已被吊销则返回 1，否则返回 0。
字符串与整型。


#### $tls_peer_expired


*$tls_peer_expired* - 若对端证书
已过期则返回 1，否则返回 0。
字符串与整型。


#### $tls_peer_selfsigned


*$tls_peer_selfsigned* - 若对端证书
为自签名则返回 1，否则返回 0。
字符串与整型。


#### $tls_peer_notBefore


*$tls_peer_notBefore* - 返回对端证书的
notBefore 有效期日期。
字符串类型。


#### $tls_peer_notAfter


*$tls_peer_notAfter* - 返回对端证书的
notAfter 有效期日期。
字符串类型。


### OpenSIPS 与 TLS - 脚本示例 {#opensips-with-tls---script-example}


> [!IMPORTANT]
> TLS 支持基于 TCP，为让 OpenSIPS
> 使用 TCP，必须以多进程模式启动。因此，
> 必须将 "fork" 参数设置为 "yes"：


> [!NOTE]
> 由于 TLS 引擎相当消耗内存，请通过
> 运行期参数 "-m" 增加所用内存（详见
> OpenSIPS -h）。


- fork = yes


```opensips title="Script with TLS support"
  # ----------- 全局配置参数 ------------------------
  log_level=3
  stderror_enabled=no
  syslog_enabled=yes

  check_via=no
  dns=no
  rev_dns=no
  socket=udp:your_serv_IP:5060
  socket=tls:your_serv_IP:5061
  udp_workers=4

  # ------------------ 模块加载 ----------------------------------

  loadmodule "proto_tls.so"
  loadmodule "proto_udp.so"

  #TLS 相关设置
  loadmodule "tls_mgm.so"

  modparam("tls_mgm", "certificate", "/path/opensipsX_cert.pem")
  modparam("tls_mgm", "private_key", "/path/privkey.pem")
  modparam("tls_mgm", "ca_list", "/path/calist.pem")
  modparam("tls_mgm", "ca_list", "/path/calist.pem")
  modparam("tls_mgm", "require_cert", "1")
  modparam("tls_mgm", "verify_cert", "1")

  alias=_DNS_ALIAS_


  loadmodule "sl.so"
  loadmodule "rr.so"
  loadmodule "maxfwd.so"
  loadmodule "mysql.so"
  loadmodule "usrloc.so"
  loadmodule "registrar.so"
  loadmodule "tm.so"
  loadmodule "auth.so"
  loadmodule "auth_db.so"
  loadmodule "textops.so"
  loadmodule "sipmsgops.so"
  loadmodule "signaling.so"
  loadmodule "uri_db.so"

  # ----------------- 设置模块专用参数 ---------------

  # -- auth_db 参数 --
  modparam("auth_db", "db_url", "sql_url")
  modparam("auth_db", "password_column", "password")
  modparam("auth_db", "calculate_ha1", 1)

  # -- registrar 参数 --
  # 不允许重复注册
  modparam("registrar", "append_branches", 0)

  # -------------------------  请求路由逻辑 -------------------

  # 主路由逻辑

  route{

  # 初始合法性检查
  if (!mf_process_maxfwd_header("10")) {
      send_reply(483,"Too Many Hops");
      exit;
  };

  # 若有人在 From 中声称属于本域，
  # 则对其进行质询（跳过 REGISTER -- 稍后再质询）
  if (is_myself("$fd")) {
      setflag(1);
      if ( is_method("INVITE|SUBSCRIBE|MESSAGE")
      && !(is_myself("$si")) ) {
          if  (!(proxy_authorize( "domA.net", "subscriber" ))) {
              proxy_challenge("domA.net","0"/*no-qop*/);
              exit;
          };
          if ($au!=$fU) {
              xlog("FROM hdr Cheating attempt in INVITE\n");
              send_reply(403,
                  "That is ugly -- use From=id next time (OB)");
              exit;
          };
      }; # 来自其他域的非 REGISTER 请求
  } else if ( is_method("INVITE") && !is_myself("$rd") ) {
      send_reply(403, "No relaying");
      exit;
  };

  /* ********   执行 record-route 与 loose-route ******* */
  if (!is_method("REGISTER"))
      record_route();

  if (loose_route()) {
      append_hf("P-hint: rr-enforced\r\n");
      t_relay();
      exit;
  };

  /* ******* 检查目标在本域之外的请求 ******* */
  if ( !is_myself("$rd") ) {
      append_hf("P-hint: OUTBOUND\r\n");
      if ($rd=="domB.net") {
          t_relay("tls:domB.net:5061");
      } else if ($rd=="domC.net") {
          t_relay("tls:domC.net:5061");
      } else {
          t_relay();
      };
      exit;
  };

  /* ******* 根据前缀转向其他域 ******* */
  if (!is_method("REGISTER")) {
      if ( $ru=~"sip:201") {
          strip(3);
          $rd = "domB.net";
          t_relay("tls:domB.net:5061");
          exit;
      } else if ( $ru=~"sip:202" ) {
          strip(3);
          $rd = "domC.net";
          t_relay("tls:domC.net:5061");
          exit;
      };
  };

  /* ************ 发往本域的请求 ********** */
  if (is_method("REGISTER")) {
      if (!www_authorize( "domA.net", "subscriber" )) {
          # 若无凭据或凭据无效则发起质询
          www_challenge( "domA.net" /* realm */,
              "0" /* no qop -- some phones can't deal with it */);
          exit;
      };
      if ($au!=$tU) {
          xlog("TO hdr Cheating attempt\n");
          send_reply(403, "That is ugly -- use To=id in REGISTERs");
          exit;
      };
      # 这是一个已鉴权的请求，现在更新 Contact 数据库
      if (!save("location")) {
          sl_reply_error();
      };
      exit;
  };

  # 本域 SIP 目的地通过 USRLOC DB 处理
  if (!lookup("location")) {
      # 处理未找到的用户
      send_reply(404, "Not Found");
      exit;
  };

  # 移除所有现存的 Alert-info 头域
  remove_hf("Alert-Info");

  if (is_method("INVITE") && ($rP=="TLS" || isflagset(1))) {
      append_hf("Alert-info: 1\r\n");                     # cisco 7960
      append_hf("Alert-info: Bellcore-dr4\r\n");          # cisco ATA
      append_hf("Alert-info: http://foo.bar/x.wav\r\n");  # snom
  };

  # 执行转发
  if (!t_relay()) {
      sl_reply_error();
  };

  #脚本结束
  }
		
```


### 调试 TLS 连接 {#debug-tls-connections}


若想调试 TLS 连接，请将以下日志
语句放入 OpenSIPS.cfg。
这将转储所有可用的 TLS 伪变量。


```opensips title="Example of TLS logging"
xlog("L_INFO","================= start TLS pseudo variables ===============\n");
xlog("L_INFO","$$tls_version                   = '$tls_version'\n");
xlog("L_INFO","$$tls_description               = '$tls_description'\n");
xlog("L_INFO","$$tls_cipher_info               = '$tls_cipher_info'\n");
xlog("L_INFO","$$tls_cipher_bits               = '$tls_cipher_bits'\n");
xlog("L_INFO","$$tls_peer_subject              = '$tls_peer_subject'\n");
xlog("L_INFO","$$tls_peer_issuer               = '$tls_peer_issuer'\n");
xlog("L_INFO","$$tls_my_subject                = '$tls_my_subject'\n");
xlog("L_INFO","$$tls_my_issuer                 = '$tls_my_issuer'\n");
xlog("L_INFO","$$tls_peer_version              = '$tls_peer_version'\n");
xlog("L_INFO","$$tls_my_version                = '$tls_my_version'\n");
xlog("L_INFO","$$tls_peer_serial               = '$tls_peer_serial'\n");
xlog("L_INFO","$$tls_my_serial                 = '$tls_my_serial'\n");
xlog("L_INFO","$$tls_peer_subject_cn           = '$tls_peer_subject_cn'\n");
xlog("L_INFO","$$tls_peer_issuer_cn            = '$tls_peer_issuer_cn'\n");
xlog("L_INFO","$$tls_my_subject_cn             = '$tls_my_subject_cn'\n");
xlog("L_INFO","$$tls_my_issuer_cn              = '$tls_my_issuer_cn'\n");
xlog("L_INFO","$$tls_peer_subject_locality     = '$tls_peer_subject_locality'\n");
xlog("L_INFO","$$tls_peer_issuer_locality      = '$tls_peer_issuer_locality'\n");
xlog("L_INFO","$$tls_my_subject_locality       = '$tls_my_subject_locality'\n");
xlog("L_INFO","$$tls_my_issuer_locality        = '$tls_my_issuer_locality'\n");
xlog("L_INFO","$$tls_peer_subject_country      = '$tls_peer_subject_country'\n");
xlog("L_INFO","$$tls_peer_issuer_country       = '$tls_peer_issuer_country'\n");
xlog("L_INFO","$$tls_my_subject_country        = '$tls_my_subject_country'\n");
xlog("L_INFO","$$tls_my_issuer_country         = '$tls_my_issuer_country'\n");
xlog("L_INFO","$$tls_peer_subject_state        = '$tls_peer_subject_state'\n");
xlog("L_INFO","$$tls_peer_issuer_state         = '$tls_peer_issuer_state'\n");
xlog("L_INFO","$$tls_my_subject_state          = '$tls_my_subject_state'\n");
xlog("L_INFO","$$tls_my_issuer_state           = '$tls_my_issuer_state'\n");
xlog("L_INFO","$$tls_peer_subject_organization = '$tls_peer_subject_organization'\n");
xlog("L_INFO","$$tls_peer_issuer_organization  = '$tls_peer_issuer_organization'\n");
xlog("L_INFO","$$tls_my_subject_organization   = '$tls_my_subject_organization'\n");
xlog("L_INFO","$$tls_my_issuer_organization    = '$tls_my_issuer_organization'\n");
xlog("L_INFO","$$tls_peer_subject_unit         = '$tls_peer_subject_unit'\n");
xlog("L_INFO","$$tls_peer_issuer_unit          = '$tls_peer_issuer_unit'\n");
xlog("L_INFO","$$tls_my_subject_unit           = '$tls_my_subject_unit'\n");
xlog("L_INFO","$$tls_my_issuer_unit            = '$tls_my_issuer_unit'\n");
xlog("L_INFO","$$tls_peer_san_email            = '$tls_peer_san_email'\n");
xlog("L_INFO","$$tls_my_san_email              = '$tls_my_san_email'\n");
xlog("L_INFO","$$tls_peer_san_hostname         = '$tls_peer_san_hostname'\n");
xlog("L_INFO","$$tls_my_san_hostname           = '$tls_my_san_hostname'\n");
xlog("L_INFO","$$tls_peer_san_uri              = '$tls_peer_san_uri'\n");
xlog("L_INFO","$$tls_my_san_uri                = '$tls_my_san_uri'\n");
xlog("L_INFO","$$tls_peer_san_ip               = '$tls_peer_san_ip'\n");
xlog("L_INFO","$$tls_my_san_ip                 = '$tls_my_san_ip'\n");
xlog("L_INFO","$$tls_peer_verified             = '$tls_peer_verified'\n");
xlog("L_INFO","$$tls_peer_revoked              = '$tls_peer_revoked'\n");
xlog("L_INFO","$$tls_peer_expired              = '$tls_peer_expired'\n");
xlog("L_INFO","$$tls_peer_selfsigned           = '$tls_peer_selfsigned'\n");
xlog("L_INFO","$$tls_peer_notBefore            = '$tls_peer_notBefore'\n");
xlog("L_INFO","$$tls_peer_notAfter             = '$tls_peer_notAfter'\n");
xlog("L_INFO","================= end TLS pseudo variables ===============\n");
```


## 开发者指南 {#developer-guide}


### API 函数 {#api-functions}


#### find_server_domain


struct tls_domain *find_server_domain(struct ip_addr *ip,
unsigned short port);


查找具有给定 ip 与端口
（本地监听套接字）的 TLS 服务器域。


#### find_client_domain


struct tls_domain *find_client_domain(struct ip_addr *ip,
unsigned short port);


查找 TLS 客户端域。


#### get_handshake_timeout


int get_handshake_timeout(void);


返回握手超时。


#### get_send_timeout


int get_send_timeout(void);


返回发送超时。


#### TLS_CONFIG


其中包含 OpenSIPS 的 TLS 配置变量（超时、
文件路径等）。


#### TLS_INIT


与初始化相关的函数和参数。


#### SSL 上下文 {#ssl-context}


extern SSL_CTX *default_client_ctx;


ssl 上下文是 TLS 域结构的成员。因此，每个
TLS 域（默认域与虚拟域、服务器与客户端）都有其自己的 SSL 上下文。


#### pre_init_tls


int init_tls(void);


从 main() 调用一次，用于预先初始化 tls 子系统。
在解析配置文件之前调用。


#### init_tls


int init_tls(void);


从 main() 调用一次，用于初始化 tls 子系统。
在解析配置文件之后调用。


#### destroy_tls


void destroy_tls(void);


仅调用一次，就在清理之前。


#### tls_init


int tls_init(struct socket_info *c);


从 main.c 为每个创建的 tls 套接字调用一次


#### os_malloc, os_realloc, os_free


围绕 shm_* 函数的包装函数。OpenSSL 使用
非共享内存创建其对象，因此无法在
OpenSIPS 中工作。通过创建这些包装函数并配置
OpenSSL 使用它们而非其默认内存函数，
所有 OpenSSL 对象都位于共享内存中，随时可用。


### TLS_DOMAIN


#### tls_domains


extern struct tls_domain *tls_default_server_domain;


默认 TLS 服务器域。


extern struct tls_domain *tls_default_client_domain;


默认 TLS 客户端域。


extern struct tls_domain *tls_server_domains;


已定义服务器域的列表。


extern struct tls_domain *tls_client_domains;


已定义客户端域的列表。


#### tls_find_server_domain


struct tls_domain *tls_find_server_domain(struct ip_addr *ip,
unsigned short port);


查找具有给定 ip 与端口
（本地监听套接字）的 TLS 服务器域。


#### tls_find_client_domain


struct tls_domain *tls_find_client_domain(struct ip_addr *ip,
unsigned short port);


查找 TLS 客户端域。


#### tls_find_client_domain_addr


struct tls_domain *tls_find_client_domain_addr(struct ip_addr *ip,
unsigned short port);


查找具有给定 ip 与端口
（远程目标套接字）的 TLS 客户端域。


#### tls_find_client_domain_name


struct tls_domain *tls_find_client_name(str name);


查找具有给定名称的 TLS 客户端域。


#### tls_new__domain


struct tls_domain *tls_new_domain(int type);


创建新的 TLS 域：分配内存、设置类型并初始化成员


#### tls_new_server_domain


int tls_new_server_domain(struct ip_addr *ip, unsigned short port);


创建一个新域并添加到 TLS 服务器域列表。


#### tls_new_client_domain


int tls_new_client_domain(struct ip_addr *ip, unsigned short port);


创建一个基于套接字的新域并添加到 TLS 客户端域列表。


#### tls_new_client_domain_name


int tls_new_client_domain_name(char *s, int len);


创建一个基于名称的新域并添加到 TLS 客户端域列表。


#### tls_free_domains


void tls_free_domains(void);


清理整个域列表。
<!-- CONTRIBUTORS -->

### 许可协议 {#license}

所有文档文件（即 .md 扩展名）均依据 Creative Common License 4.0 许可协议授权。
