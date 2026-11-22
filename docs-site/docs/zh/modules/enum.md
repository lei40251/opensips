---
title: "ENUM 模块"
description: "ENUM 模块实现 [i_]enum_query 函数，用于根据当前 Request-URI 的用户部分发起 ENUM 查询。"
sidebar: false
---


## 管理指南 {#admin-guide}


### 概述 {#overview}


ENUM 模块实现 `[i_]enum_query` 函数，这些函数根据当前 Request-URI 的用户部分发起 ENUM 查询。这些函数假定用户部分由形如 +十进制数字 的国际电话号码组成，位数至少 2 位、至多 15 位。`enum_query` 由此号码构造出一个域名，其中数字按逆序排列并以点分隔，后面接域名后缀，该后缀默认为 "e164.arpa."。例如，若用户部分为 +35831234567，则域名将是 "7.6.5.4.3.2.1.3.8.5.3.e164.arpa."。`i_enum_query` 的工作方式类似。唯一区别在于它会额外加一个标签（默认为 "i"），以便从默认的用户 ENUM 树分支到基础设施 ENUM 树。


构造出域名后，`enum_query` 向 DNS 查询其 NAPTR 记录。在可能的应答中，`enum_query` 选择这样的记录：其 flags 字段的字符串值为 "u"，其 services 字段的字符串值为 "e2u+[service:]sip" 或 "e2u+type[:subtype][+type[:subtype]...]"（两种情况均忽略大小写），且其 regexp 字段形如 !pattern!replacement!。


然后 `enum_query` 依据 <order, preference> 对选中的 NAPTR 记录排序。排序后，`enum_query` 将最优 NAPTR 记录的 regexp 应用于当前 Request URI 的用户部分，以此替换当前 Request URI；并将其余每条 NAPTR 记录的 regexp 应用于当前 Request URI 的用户部分，为请求追加新的分支。若新 URI 是 tel URI，`enum_query` 会把 tel_uri_params 模块参数的值作为 tel URI 参数附加到其上。最后，`enum_query` 依据对应 NAPTR 记录的 <order, preference> 为每个新 URI 关联一个 q 值。


不带任何参数使用 `enum_query` 时，它在默认 enum 树中查找服务类型为 "e2u+sip" 的 NAPTR。带单个参数使用 `enum_query` 时，该参数将被用作 enum 树。带两个参数使用 `enum_query` 时，其功能取决于第二个参数的第一个字符。当第一个字符不是 '+' 号时，第二个参数将用于查找服务类型为 "e2u+parameter:sip" 的 NAPTR。当第二个参数以 '+' 号开头时，ENUM 查找还支持复合 NAPTR（例如 "e2u+voice:sip+video:sip"），并支持在一次查找中搜索多个服务类型。多个服务类型必须以 '+' 号分隔。


大多数情况下你会希望基于 RURI 进行路由。极少数情况下你可能希望基于其他内容进行路由。函数 `enum_pv_query` 的行为与 `enum_query` 函数一致，区别在于 ENUM 查找使用的是其伪变量参数中的 E.164 号码，而不是 RURI 的用户部分。显然，RURI 的用户部分仍会用于 NAPTR regexp 中。


若当前 Request URI 被替换，枚举查询返回 1，否则返回 -1。


除标准 ENUM 外，还提供了对 ISN（ITAD Subscriber Numbers）的支持。为使 ISN 查找能够解析，DNS 服务器期望一种不同的格式化算法。ENUM NAPTR 记录期望形如 9.8.7.6.5.4.3.2.1.suffix 的 DNS 查询，而 ISN 方法期望形如 6.5.1212.suffix 的 DNS 查询。也就是说，一个有效的 ISN 号码在示例中包含 '56' 前缀。号码的其余部分是 ITAD（Internet Telephony Administrative Domain，互联网电话管理域），其定义见 RFC 3872 与 RFC 2871，并由 IANA 在 http://www.iana.org/assignments/trip-parameters 中分配。ITAD 保持原样，不按 ENUM 的要求做逆序。要了解更多 ISN 相关信息，请参阅 www.freenum.org 上的文档。


要对 Request-URI 的用户部分完成 ISN 查找，使用 isn_query() 而不是 enum_query()。


ENUM 模块还实现了 is_from_user_enum 函数。该函数对 from 用户执行一次 ENUM 查找，若找到则返回 true，否则返回 false。


### 依赖 {#dependencies}


本模块依赖以下模块（换言之，列出的模块必须先于本模块加载）：


- 无依赖。


### 导出的参数 {#exported-parameters}


#### domain_suffix (string) {#domain_suffix-string}


要附加到由 E164 号码数字得到的域名之后的域后缀。可被 enum_query 的参数覆盖。


默认值为 "e164.arpa."


```opensips title="设置 domain_suffix 模块参数"
modparam("enum", "domain_suffix", "e1234.arpa.")
```


#### tel_uri_params (string) {#tel_uri_params-string}


一个字符串，其内容将作为 tel URI 参数附加到请求中每个新 tel URI 上。


> [!NOTE]
> 目前 OpenSIPS 不支持 tel URI。这意味着目前 tel_uri_params 会作为 URI 参数附加到每个 URI 上。


默认值为 ""


```opensips title="设置 tel_uri_params 模块参数"
modparam("enum", "tel_uri_params", ";npdi")
```


#### i_enum_suffix (string) {#i_enum_suffix-string}


用于 i_enum_query() 查找的域后缀。可被 i_enum_query 的参数覆盖。


默认值为 "e164.arpa."


```opensips title="设置 i_enum_suffix 模块参数"
modparam("enum", "i_enum_suffix", "e1234.arpa.")
```


#### isn_suffix (string) {#isn_suffix-string}


用于 isn_query() 查找的域后缀。可被 isn_query 的参数覆盖。


默认值为 "freenum.org."


```opensips title="设置 isn_suffix 模块参数"
modparam("enum", "isn_suffix", "freenum.org.")
```


#### branchlabel (string)


该参数决定 i_enum_query() 使用哪个标签分支到基础设施 ENUM 树。


默认值为 "i"


```opensips title="设置 branchlabel 模块参数"
modparam("enum", "branchlabel", "i")
```


#### bl_algorithm (string)


该参数决定 i_enum_query() 使用哪种算法来选择基础设施树从用户 ENUM 树分出的 DNS 树位置。


若设为 "cc"，i_enum_query() 将始终在国家码层级插入该标签。示例：i.1.e164.arpa、i.3.4.e164.arpa、i.2.5.3.e164.arpa


若设为 "txt"，i_enum_query() 将在 [branchlabel].[reverse-country-code].[i_enum_suffix] 处查找一条 TXT 记录，以指示标签应在多少位数字之后插入。


```c title="区域文件示例"
i.1.e164.arpa.                     IN TXT   "4"
9.9.9.8.7.6.5.i.4.3.2.1.e164.arpa. IN NAPTR "NAPTR content for  +1 234 5678 999"
```


若设为 "ebl"，i_enum_query() 将在 [branchlabel].[reverse-country-code].[i_enum_suffix] 处查找一条 EBL（ENUM Branch Label）记录。该记录的描述及字段含义见 http://www.ietf.org/internet-drafts/draft-lendl-enum-branch-location-record-00.txt。EBL 的 RR 类型尚未分配。本版代码使用 65300。参见 resolve.h。


```c title="区域文件示例"
i.1.e164.arpa.     TYPE65300  \# 14 (
                              04    ; position
                              01 69 ; separator
                              04 65 31 36 34 04 61 72 70 61 00 ; e164.arpa
;                               )
9.9.9.8.7.6.5.i.4.3.2.1.e164.arpa. IN NAPTR "NAPTR content for  +1 234 5678 999"
```


*默认值为 "cc"*


```opensips title="设置 bl_algorithm 模块参数"
modparam("enum", "bl_algorithm", "txt")
```


### 导出的函数 {#exported-functions}


#### enum_query([suffix], [service], [number])


该函数对给定的 E.164 "number" 执行一次 ENUM 查询（若缺少 "number" 则使用 R-URI 用户名），并用查询结果重写 Request-URI。更多信息见[概述](#overview)。


参数含义如下：


- *suffix (string, optional)* - 要附加到域名之后的后缀，缺省时使用 [domain_suffix](#domain_suffix-string)
- *service (string, optional)* - 要在 service 字段中使用的服务字符串
- *number (string, optional)* - 以字符串形式打包的特定 E.164 号码，ENUM 查询在其上执行（若缺失，将使用 R-URI 用户名（$rU））。


该函数可在 REQUEST_ROUTE 中使用。


```opensips title="enum_query 用法"
...
# 在 freenum.org 中查找 "e2u+sip"
enum_query("freenum.org.", , $avp(number));
...
# 在默认树中查找 "e2u+sip"（通过参数配置）
enum_query();
...
# 在 e164.arpa 中查找 "e2u+voice:sip"
enum_query("e164.arpa.", "voice");
...
# 查找服务类型 "sip" 或 "voice:sip" 或 "video:sip"
# 注意第二个参数前面的 '+' 号
enum_query("e164.arpa.", "+sip+voice:sip+video:sip", $avp(number));
...
# 查询服务 sip 和 voice:sip
enum_query("e164.arpa.");
enum_query("e164.arpa.", "voice");
# 或改用
enum_query("e164.arpa.", "+sip+voice:sip");
...
```


#### i_enum_query([suffix], [service])


该函数执行一次枚举查询，并用查询结果重写 Request-URI。这是 enum_query() 的基础设施 ENUM 版本。与 enum_query() 的唯一区别在于计算查找 NAPTR 记录所用 FQDN 的方式。


参数含义如下：


- *suffix (string, optional)* - 要附加到域名之后的后缀，缺省时使用 [i_enum_suffix](#i_enum_suffix-string)
- *service (string, optional)* - 要在 service 字段中使用的服务字符串


关于该函数背后的设计理由，见 ftp://ftp.rfc-editor.org/in-notes/internet-drafts/draft-haberler-carrier-enum-01.txt。


#### isn_query([suffix], [service])


该函数执行一次 ISN 查询，并用查询结果重写 Request-URI。更多信息见[概述](#overview)。


参数含义如下：


- *suffix (string, optional)* - 要附加到域名之后的后缀，缺省时使用 [isn_suffix](#isn_suffix-string)
- *service (string, optional)* - 要在 service 字段中使用的服务字符串


该函数可在 REQUEST_ROUTE 中使用。


关于 ISN 字符串中 ITAD 部分的信息，见 ftp://www.ietf.org/rfc/rfc3872.txt 和 ftp://www.ietf.org/rfc/rfc2871.txt。


```opensips title="isn_query 用法"
...
# 在 freenum.org 中查找 "e2u+sip"
isn_query("freenum.org.");
...
# 在默认树中查找 "e2u+sip"（通过参数配置）
isn_query();
...
# 在 freenum.org 中查找 "e2u+voice:sip"
isn_query("freenum.org.", "voice");
...
```


#### is_from_user_enum([suffix], [service])


检查 from URI 的用户部分是否能在一次枚举查找中找到。若找到返回 1，否则返回 -1。


参数含义如下：


- *suffix (string, optional)* - 要附加到域名之后的后缀，缺省时使用 [domain_suffix](#domain_suffix-string)
- *service (string, optional)* - 要在 service 字段中使用的服务字符串


该函数可在 REQUEST_ROUTE 中使用。


```opensips title="is_from_user_enum 用法"
...
if (is_from_user_enum()) {
	....
};
...
```
<!-- CONTRIBUTORS -->

### 许可证 {#license}

本项目的所有文档文件（即 .md 扩展名的文件）均以 Creative Common License 4.0 授权。
