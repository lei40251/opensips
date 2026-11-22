---
title: "domainpolicy 模块"
description: "Domain Policy 模块结合 draft-lendl-domain-policy-ddds-02、draft-lendl-speermint-federations-02 与 draft-lendl-speermint-technical-policy-00 实现域策略。"
sidebar: false
---

## 管理员指南 {#admin-guide}


### 概述 {#overview}


Domain Policy 模块结合 draft-lendl-domain-policy-ddds-02、draft-lendl-speermint-federations-02
和 draft-lendl-speermint-technical-policy-00 实现域策略。这些草案定义了
DNS 记录，域可以通过它们宣告自己所属的联邦（federation）。本地数据库
可用于把策略规则映射为路由策略决策。该数据库也可以包含与目的域
相关的规则，这些规则独立于 draft-lendl-domain-policy-ddds-02。


本模块需要数据库。未实现缓存。


### 依赖 {#dependencies}


本模块依赖以下模块（换言之，列出的模块必须在本模块之前加载）：


- *database* —— 任意数据库模块


### 导出参数 {#exported-parameters}


#### db_url (string)


这是要使用的数据库的 URL。


*默认值为 
"mysql://opensipsro:opensipsro@localhost/opensips"。*


```opensips title="设置 db_url 参数"
modparam("domainpolicy", "db_url", "postgresql://user:pass@db_host/opensips")
```


#### dp_table (string)


包含本地支持的域策略配置的表名。


*默认值为 "domainpolicy"。*


```opensips title="设置 dp_table 参数"
modparam("domainpolicy", "dp_table", "supportedpolicies")
```


#### dp_col_rule (string)


包含域策略规则名称的列名，该名称等同于域策略 NAPTR 中发布的 URI。


*默认值为 "rule"。*


```opensips title="设置 dp_col_rule 参数"
modparam("domainpolicy", "dp_col_rule", "rules")
```


#### dp_col_type (string)


包含域策略规则类型的列名。对于联邦名称，该值为 "fed"。对于符合
draft-lendl-speermint-technical-policy-00 的标准转介，该值为 "std"。
对于直接域查找，该值为 "dom"。


*默认值为 "type"。*


```opensips title="设置 dp_col_rule 参数"
modparam("domainpolicy", "dp_col_type", "type")
```


#### dp_col_att (string)


包含 AVP 名称的列名。如果该行中存储的规则被触发，则 dp_can_connect()
会添加一个使用该名称的 AVP。


*默认值为 "att"。*


```opensips title="设置 dp_col_att 参数"
modparam("domainpolicy", "dp_col_att", "attribute")
```


#### dp_col_val (string)


包含由 dp_can_connect() 创建的 AVP 的值的列名。


*默认值为 "val"。*


```opensips title="设置 dp_col_val 参数"
modparam("domainpolicy", "dp_col_val", "values")
```


#### port_override_avp (string)


该参数定义 dp_apply_policy() 用来查找覆盖端口号的 AVP 名称。


*默认值为 "portoverride"。*


```opensips title="设置 port_override_avp 参数"
# 字符串型 AVP
modparam("domainpolicy", "port_override_avp", "portoverride")
```


#### transport_override_avp (string)


包含覆盖传输层设置的 AVP 名称。


*默认值为 "transportoverride"。*


```opensips title="设置 transport_override_avp 参数"
# 字符串型 AVP
modparam("domainpolicy", "transport_override_avp", "transportoverride")
```


#### domain_replacement_avp (string)


包含域替换内容的 AVP 名称。


*默认值为 "domainreplacement"。*


```opensips title="设置 domain_replacement_avp 参数"
# 字符串型 AVP
modparam("domainpolicy", "domain_replacement_avp", "domainreplacement")
```


#### domain_prefix_avp (string)


包含域前缀的 AVP 名称。


*默认值为 "domainprefix"。*


```opensips title="设置 domain_prefix_avp 参数"
# 字符串型 AVP
modparam("domainpolicy", "domain_prefix_avp", "domainprefix")
```


#### domain_suffix_avp (string)


包含域后缀的 AVP 名称。


*默认值为 "domainsuffix"。*


```opensips title="设置 domain_suffix_avp 参数"
# 字符串型 AVP
modparam("domainpolicy", "domain_suffix_avp", "domainsuffix")
```


#### send_socket_avp (string)


包含 send_socket 的 AVP 名称。发送套接字的格式（该 AVP 的载荷）
必须为 [proto:]ip_address[:port]。函数 dp_apply_policy 会查找该 AVP，
如果已定义，则把发送套接字强制设为其值（类似于 force_send_socket
核心函数）。


*默认值为 "sendsocket"。*


```opensips title="设置 send_socket_avp 参数"
# 字符串型 AVP
modparam("domainpolicy", "send_socket_avp", "sendsocket")
```


### 导出函数 {#exported-functions}


#### dp_can_connect()


检查主叫的互联策略。它使用请求 URI 中的域，按 draft-lendl-domain-policy-ddds-02
执行 DP-DDDS 算法，以取回该域的策略宣告。
在当前版本中，仅支持符合 draft-lendl-speermint-federations-02
和 draft-lendl-speermint-technical-policy-00 的记录。


非终端 NAPTR 记录将导致对替换域的递归。因此 dp_can_connect()
会在被引用的域中查找策略规则。此外，会为呼叫添加一个
"domainreplacement" AVP（包含新的域）。这会把 SRV/A 记录查找
重定向到新的域。


为了简化基于域的直接对等，所有目的域都被视为包含一条最高优先级的
"D2P+SIP:dom" 规则，规则的值就是该域本身。因此，任何 type = 'dom' 且
rule = 'example.com' 的数据库行都会覆盖任何通过 DNS 动态发现的规则。


对于 service-type 为 "D2P+SIP:fed" 的 NAPTR，联邦 ID
（从 regexp 字段中提取）用于从本地的本地数据库取回
策略记录（基本上就是："SELECT dp_col_att, dp_col_val FROM 
dp_table WHERE dp_col_rule = '[federationID]' AND type = 'fed'）。如果找到记录（并且 order 值相同的
所有其他记录都可满足），则将根据 dp_col_att 和 dp_col_val 列
创建 AVP。


对于 service-type 为 "D2P+SIP:std" 的 NAPTR，执行相同的过程。不过
这次数据库查找的是 type = 'std'。


"D2P+SIP:fed" 与 "D2P+SIP:std" 可以自由混用。如果两条 "order" 相同的
规则都匹配，并试图设置同一个 AVP，则行为未定义。


dp_col_att 列指定 AVP 的名称。如果 AVP 以 "s:" 或 "i:" 开头，
将生成相应的 AVP 类型（命名字符串型或命名整型）。如果省略了确切的
说明符，将推测 AVP 类型。


dp_col_val 列始终按字符串解释。因此，AVP 的值
始终基于字符串。


dp_can_connect 返回：


- *-2*：求值过程中的错误。（DNS、DB 等）
- *-1*：找到了 D2P+SIP 记录，但策略无法满足。
- *1*：找到了 D2P+SIP 记录，可以发起呼叫
- *2*：未找到 D2P+SIP 记录。目的域
未宣告针对入站 SIP 呼叫的策略。


该函数可在 REQUEST_ROUTE 中使用。


```opensips title="dp_can_connect 用法"
...
dp_can_connect();
switch(retcode) {
	case -2:
		xlog("L_INFO","Errors during the DP evaluation\n");
		sl_send_reply(404, "We can't connect you.");
		break;
	case -1:
		xlog("L_INFO","We can't connect to that domain\n");
		sl_send_reply(404, "We can't connect you.");
		break;
	case 1:
		xlog("L_INFO","We found matching policy records\n");
		avp_print();
		dp_apply_policy();
		t_relay();
		break;
	case 2:
		xlog("L_INFO","No DP records found\n");
		t_relay();
		break;
}
...
		
```


#### dp_apply_policy()


该函数根据 `dp_can_connect()` 函数返回的策略设置目的 URI。
`dp_can_connect()` 与 `dp_apply_policy()` 之间的参数交换
通过 AVP 完成。这些 AVP 可以在模块的参数部分配置。


> [!NOTE]
> AVP 的名称必须与 domainpolicy 表中 *att*
> 列的名称对应。


在 `dp_can_connect()` 中（或通过任何其他方式）设置以下 AVP，
会在 `dp_apply_policy()` 中引发以下动作：


- *port_override_avp*：如果设置了该 AVP，目的 URI 中的端口
将被设置为该端口。设置覆盖端口会按 RFC 3263
禁用 NAPTR 和 SRV 查找。
- *transport_override_avp*：如果设置了该 AVP，目的 URI 中的
transport 参数将被设置为指定的传输层（"udp"、"tcp"、
"tls"）。设置覆盖传输层也会禁用 NAPTR 查找，但保留
按 RFC 3263 的 SRV 查找。
- *domain_replacement_avp*：如果设置了该 AVP，目的 URI 中的
域将被该域替换。非终端 NAPTR（即指向新域的转介）会隐式地
把 *domain_replacement_avp* 设置为新的域。
- *domain_prefix_avp*：如果设置了该 AVP，目的 URI 中的域
将被加上该"子域"作为前缀。
例如，如果请求 URI 中的域为
"example.com"，而 domain_prefix_avp 包含 "inbound"，则目的
URI 中的域将被设置为 "inbound.example.com"。
- *domain_suffix_avp*：如果设置了该 AVP，目的 URI 中的域
将追加该 AVP 的内容。
例如，如果请求 URI 中的域为
"example.com"，而 domain_suffix_avp 包含 "myroot.com"，则目的 URI
中的域将被设置为 "example.com.myroot.com"。
- *send_socket_avp*：如果设置了该 AVP，发送套接字
将被强制设为该 AVP 中的套接字。该 AVP 的载荷格式必须
为 [proto:]ip_address[:port]。


如果同时使用前缀/后缀和域替换，则先执行替换，
再把前缀/后缀应用于新的域。


该函数可在 REQUEST_ROUTE 中使用。


```opensips title="dp_apply_policy 用法"
...
if (dp_apply_policy()) {
	t_relay();
}
...
		
```


### FIFO 命令 {#fifo-commands}


### 使用场景 {#usage-scenarios}


本节描述如何使用本模块实现选择性 VoIP 对等。


#### 基于 TLS 的联邦 {#tls-based-federation}


本示例展示如何基于 TLS 和域策略配置一个安全的对等网络。


假设有一个名为 "TLSFED.org" 的组织，作为希望彼此对等
但不想运行开放式 SIP 代理的 VoIP 提供商的联合组织。TLSFED.org 的秘书
充当 X.509 证书颁发机构，为所有成员 SIP 代理的 TLS 密钥签名。
每个成员应自动允许来自其他成员的入站呼叫。另一方面，该
联邦的配置不得妨碍成员参与其他 VoIP 对等网络。对于
名为 example.com 的参与方，以下配置可以实现所有这些目标：


- *入站 SIP 配置*
来自其他成员的呼叫应使用 TLS，并使用客户端 CERT 进行
鉴权。为实现这一点，不能与其他入站连接共享 TCP/TLS 端口。
因此需要使用 tls_server_domain[] 为该联邦专门分配一个
TCP 端口。

  ```
  tls_server_domain[1.2.3.4:5066] {
   tls_certificate   = "/path/to/tlsfed/example-com.key"
   tls_private_key   = "/path/to/tlsfed/example-com.crt"
   tls_ca_list       = "/path/to/tlsfed/ca.pem"
   tls_method        = tlsv1
   tls_verify_client = 1
   tls_require_cleint_certificate = 1
  }
  		
  ```
- *出站 SIP 配置*
发往其他成员的呼叫也必须使用正确的客户端证书。
因此必须配置一个 TLS 客户端域。我们使用
联邦名称作为 TLS 客户端域标识符。因此，
"tls_client_domain_avp" 的内容必须设置为该标识符
（例如把它作为规则放入 domainpolicy 表）。

  ```
  tls_client_domain["tlsfed"] {
   tls_certificate   = "/path/to/tlsfed/example-com.key"
   tls_private_key   = "/path/to/tlsfed/example-com.crt"
   tls_ca_list       = "/path/to/tlsfed/ca.pem"
   tls_method        = tlsv1
   tls_verify_server = 1
  }
  		
  ```


#### 基于 SIP 中心的联邦 {#sip-hub-based-federation}


本示例展示如何配置一个基于中心 SIP 中心节点的对等网络。


假设有一个名为 "HUBFED.org" 的组织，作为希望彼此对等
但不想运行开放式 SIP 代理的 VoIP 提供商的联合组织。
HUBFED.org 改为运营一个中心 SIP 代理，由它在所有
参与成员之间中继呼叫。这样每个成员只需
允许来自该中心节点的入站呼叫（可以通过防火墙实现）。
对于名为 example.com 的参与方，以下配置可以实现所有这些目标：


- *DNS 配置*
目的网络宣告其加入该
联邦。

  ```
  $ORIGIN destination.example.org
  @ IN NAPTR 10 50   "U"  "D2P+SIP:fed" (
                   "!^.*$!http://HUBFED.org/!" . )
  		
  ```
- *出站 SIP 配置*
发往其他成员的呼叫需要被重定向到中心代理。
domainpolicy 表只需列出该联邦，并把
它链接到中心代理的域名：

  ```
  mysql> select * from domainpolicy;
  +----+--------------------+------+-------------------+----------------+
  | id | rule               | type | att               | val            |
  +----+--------------------+------+-------------------+----------------+
  | 1  | http://HUBFED.org/ | fed  | domainreplacement | sip.HUBFED.org |
  +----+--------------------+------+-------------------+----------------+
  		
  ```


#### 有围墙花园式联邦 {#walled-garden-federation}


本示例假设一组 SIP 提供商已在各自的代理之间
建立了一个安全的第三层网络。该网络是通过 IPsec、私有
第二层网络，还是仅通过简单的防火墙构建，都无关紧要。
在本示例中我们将使用 10.x 网段
（作为围墙花园网络）和 "http://l3fed.org/"
（作为联邦标识符）。


该联邦的成员（例如 example.com）无法在自己的域的标准 SRV / A 记录中
宣告其 SIP 代理的 10.x 地址，
因为该地址只对本联邦的其他成员有意义。
为了便于在联邦内部与联邦外部使用不同的 IP 地址解析路径，
"http://l3fed.org/" 的所有成员
都同意在 SRV（或 A）查找之前给目的域加上 "l3fed" 前缀。


以下是 example.com 的配置：


- *DNS 配置*
目的网络宣告其加入该
联邦。

  ```
  $ORIGIN example.com
  @ IN NAPTR 10 50   "U"  "D2P+SIP:fed" (
                   "!^.*$!http://l3fed.org/!" . )
  _sip._udp      IN SRV 10 10 5060 publicsip.example.com.
  _sip._udp.l3fe IN SRV 10 10 5060 l3fedsip.example.com.
  
  publicsip      IN A   193.XXX.YYY.ZZZ 
  l3fedsip       IN A   10.0.0.42
  		
  ```
- *出站 SIP 配置*
domainpolicy 表只需把联邦标识符
链接到约定好的前缀：

  ```
  mysql> select * from domainpolicy;
  +----+-------------------+------+--------------+-------+
  | id | rule              | type | att          | val   |
  +----+-------------------+------+--------------+-------+
  | 1  | http://l3fed.org/ | fed  | domainprefix | l3fed |
  +----+-------------------+------+--------------+-------+
  		
  ```


### 已知限制 {#known-limitations}
<!-- CONTRIBUTORS -->

### 许可证 {#license}

所有文档文件（即 .md 扩展名）均按 Creative Common License 4.0 许可
