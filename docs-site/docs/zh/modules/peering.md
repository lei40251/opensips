---
title: "peering 模块"
description: "peering 模块允许 SIP 提供商（运营商或组织）向中介核验某个 SIP 请求的源或目的是否为可信对端。"
---


## 管理指南 {#admin-guide}


### 概述 {#overview}


peering 模块允许 SIP 提供商（运营商或组织）向中介（broker）核验某个 SIP 请求的源或目的是否为可信对端。


为了加入由中介提供的信任社区，每个 SIP 提供商需向中介注册自己所服务的域（SIP URI 的主机部分）。当提供商的 SIP 代理需要向非本地域发送 SIP 请求时，可以通过 verify_destination() 函数向中介查询该非本地域是否由可信对端服务。若是，提供商从中介获得该 SIP 请求的哈希值和一个时间戳，并将其包含在发往该非本地域的请求中。当非本地域的 SIP 代理收到该 SIP 请求时，同样可以通过 verify_source() 函数向中介核验该请求是否来自可信对端。


核验函数使用 AAA 协议与中介通信。


欢迎提出意见和建议。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


本模块依赖以下模块（换言之，必须先加载下列模块才能加载本模块）：


- *一个实现 AAA 的模块*


### 导出的参数 {#exported-parameters}


#### aaa_url (string)


该 URL 表示所使用的 AAA 协议以及该协议配置文件的位置。


若该参数设为空字符串，AAA 计费支持将被禁用（即使已编译）。


默认值为 "NULL"。


```opensips title="设置 aaa_url 参数"
...
modparam("peering", "aaa_url", "radius:/etc/radiusclient-ng/radiusclient.conf")
...
```


#### verify_destination_service_type (integer)


当 SIP 请求的发送方使用 verify_destination() 函数核验请求的目的地时，所使用的 Service-Type AAA 属性值。


默认值为 "Sip-Verify-Destination" Service-Type 的字典值。


```opensips title="verify_destination_service_type 参数用法"
...
modparam("peering", "verify_destination_service_type", 21)
...
```


#### verify_source_service_type (integer)


当 SIP 请求的接收方使用 verify_source() 函数核验请求的源时，所使用的 Service-Type AAA 属性值。


默认值为 "Sip-Verify-Source" Service-Type 的字典值。


```opensips title="verify_source_service_type 参数用法"
...
modparam("peering", "verify_source_service_type", 22)
...
```


### 导出的函数 {#exported-functions}


#### verify_destination()


函数 verify_destination() 向中介的 AAA 服务器查询请求 URI 的域（主机部分）是否由可信对端服务。AAA 请求包含以下属性/值：


- User-Name - Request-URI 主机
- SIP-URI-User - Request-URI 用户
- SIP-From-Tag - From tag
- SIP-Call-Id - 呼叫 ID
- Service-Type - verify_destination_service_type


如果请求 URI 的域由可信对端服务，函数返回 1，否则返回 -1。若结果为正，AAA 服务器会返回一组 SIP-AVP 应答属性。每个 SIP-AVP 的值为如下形式：


[#]name(:|#)value


每个 SIP-AVP 应答属性的值会映射为一个 OpenSIPS AVP。名称或值前面的前缀 # 分别表示字符串名称或字符串值。


其中一个 SIP-AVP 应答属性包含一个字符串，源对端在向目的对端发送 SIP 请求时，必须将该字符串“原样”包含在 P-Request-Hash 头域中。该字符串值的形式例如 hash@timestamp，其中 hash 是中介根据查询的属性和一些本地信息计算出的哈希值，timestamp 是完成计算的时间。


应答属性中使用的 AVP 名称由中介分配。


该函数可在 REQUEST_ROUTE 和 FAILURE_ROUTE 中使用。


```opensips title="verify_destination() 用法"
...
if (verify_destination()) {
   append_hf("P-Request-Hash: $avp(prh)\r\n");
}
...
```


#### verify_source()


函数 verify_source() 向中介的 AAA 服务器查询某个 SIP 请求是否来自可信对端。AAA 请求包含以下属性/值：


- User-Name - Request-URI 主机
- SIP-URI-User - Request-URI 用户
- SIP-From-Tag - From tag
- SIP-Call-Id - 呼叫 ID
- SIP-Request-Hash - P-Request-Hash 头域的消息体
- Service-Type - verify_source_service_type


如果该 SIP 请求来自可信对端，函数返回 1，否则返回 -1。若结果为正，AAA 服务器可能返回一组 SIP-AVP 应答属性。每个 SIP-AVP 的值为如下形式：


[#]name(:|#)value


每个 SIP-AVP 应答属性的值会映射为一个 OpenSIPS AVP。名称或值前面的前缀 # 分别表示字符串名称或字符串值。


应答属性中使用的 AVP 名称由中介分配。


该函数可在 REQUEST_ROUTE 和 FAILURE_ROUTE 中使用。


```opensips title="verify_source() 用法"
...
if (is_present_hf("P-Request-Hash")) {
   if (verify_source()) {
      xlog("L_INFO", "Request came from trusted peer\n")
   }
}
...
```
<!-- CONTRIBUTORS -->

### 许可证 {#license}

本项目的所有文档文件（即 .md 扩展名的文件）均以 Creative Common License 4.0 授权。
