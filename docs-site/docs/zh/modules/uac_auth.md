---
title: "uac_auth 模块"
description: "UAC AUTH（用户代理客户端鉴权）模块提供构建鉴权头域的通用 API。"
---


## 管理指南 {#admin-guide}


### 概述 {#overview}


UAC AUTH（User Agent Client Authentication，用户代理客户端鉴权）模块提供构建鉴权头域的通用 API。


它还提供一组通用的鉴权凭据，供其他模块使用。


注意，本模块提供的鉴权同时支持 qop "auth" 和 qop "auth-int"，但如果服务器同时给出这两个值，则优先使用 "auth"。


#### RFC 8760 支持（强化鉴权） {#rfc-8760-support-strenghtened-authentication}


从 OpenSIPS 3.2 开始，[auth](/zh/modules/auth)、[auth_db](/zh/modules/auth_db) 和 uac_auth 模块依据 [RFC 8760](https://datatracker.ietf.org/doc/html/rfc8760) 规范，支持两种新的摘要鉴权算法（"SHA-256" 和 "SHA-512-256"）。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


- *无*。


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，必须安装以下库或应用程序：


- *无*


### 导出的参数 {#exported-parameters}


#### credential (string)


包含执行鉴权所用凭据的多重定义。


> [!NOTE]
> 密码可以提供为明文密码，也可以提供为预先计算好的 HA1，即以 "0x" 为前缀的十六进制（小写）字符串（32 个字符），因此总长度为 34 个字符。


*使用 UAC 鉴权时该参数为必填。*


```opensips title="设置 credential 参数"
...
modparam("uac_auth","credential","username:domain:password")
modparam("uac_auth","credential","username:domain:0xc17ba8157756f263d07e158504204629")
...
				
```


#### auth_realm_avp (string) {#auth_realm_avp-string}


定义一个 AVP，其中可能包含执行鉴权所用的 realm。


*如果定义了该参数，还需要定义 [auth_username_avp](#auth_username_avp-string) 和 [auth_password_avp](#auth_password_avp-string)。*


```opensips title="设置 auth_realm_avp 参数"
...
modparam("uac_auth","auth_realm_avp","$avp(10)")
...
				
```


#### auth_username_avp (string) {#auth_username_avp-string}


定义一个 AVP，其中可能包含执行鉴权所用的用户名。


*如果定义了该参数，还需要定义 [auth_realm_avp](#auth_realm_avp-string) 和 [auth_password_avp](#auth_password_avp-string)。*


```opensips title="设置 auth_username_avp 参数"
...
modparam("uac_auth","auth_username_avp","$avp(11)")
...
				
```


#### auth_password_avp (string) {#auth_password_avp-string}


定义一个 AVP，其中可能包含执行鉴权所用的密码。密码可以提供为明文密码，也可以提供为预先计算好的 HA1，即以 "0x" 为前缀的十六进制（小写）字符串（32 个字符），因此总长度为 34 个字符（例如 "0xc17ba8157756f263d07e158504204629"）


*如果定义了该参数，还需要定义 [auth_realm_avp](#auth_realm_avp-string) 和 [auth_username_avp](#auth_username_avp-string)。*


```opensips title="设置 auth_password_avp 参数"
...
modparam("uac_auth","auth_password_avp","$avp(12)")
...
				
```
<!-- CONTRIBUTORS -->

### 许可证 {#license}

本项目的所有文档文件（即 .md 扩展名的文件）均以 Creative Common License 4.0 授权。
