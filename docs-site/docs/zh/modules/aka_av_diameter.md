---
title: "AKA 鉴权向量 Diameter 模块"
description: "本模块是 AKA_AUTH 模块的扩展，提供一个 Diameter AKA 鉴权向量（AV）管理器，实现 Multimedia-Auth-Request 与 Multimedia-Auth-Answer 两条 Diameter 命令。"
sidebar: false
---


## 管理指南 {#admin-guide}


### 概述 {#overview}


本模块是 *AKA_AUTH* 模块的扩展，提供一个 Diameter AKA 鉴权向量（AV）管理器，实现了 *ETSI TS 129 229* 规范 *Cx* 接口中定义的 Multimedia-Auth-Request 与 Multimedia-Auth-Answer 两条 Diameter 命令，用于获取一组鉴权向量并将其送入 AKA 鉴权流程。


当 *AKA_AUTH* 模块在执行一次 *aka_challenge()* 时需要新的鉴权向量，它可以请求本模块为此获取一组鉴权向量。本模块将查询封装为 *MAR*（Multimedia-Auth-Request）命令并发送给 *HSS* Diameter 服务器。收到作为响应的 *MAA*（Multimedia-Auth-Answer）命令后，相应的鉴权向量被收集并回送给 *AUTH_AKA* 引擎。


本模块使用 *AAA_Diameter* 模块来执行 Diameter 请求。它既可以运行在同步模式，也可以运行在异步模式，取决于 *AUTH_AKA* 模块如何执行查询。


### 配置准备 {#setup}


本模块需要一条 *aaa_diameter* 连接，指向实现了 *Cx* 接口、能够通过 Multimedia-Auth-Request 与 Multimedia-Auth-Answer 命令提供鉴权向量的 *HSS* Diameter 服务器。


命令的格式以及所需的字段，可以在模块源码目录下的 *example/aka_av_diameter.dictionary* 文件中找到，也可以参见[Diameter 命令示例](#diameter-commands-file)一节。


> [!NOTE]
> 模块内部使用的是所提供 dictionary 中的 AVP 名称——修改该文件可能会破坏模块的行为。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


本模块依赖以下模块（换言之，列出的模块必须在本模块之前加载）：


- *auth_aka*——AKA 鉴权模块，负责触发 AKA 鉴权流程
- *aaa_diameter*——AAA Diameter 模块，实现与 *HSS* 服务器之间的 Diameter 通信。


#### 外部库或应用程序 {#external-libraries-or-applications}


本模块不依赖任何外部库。


### 导出的参数 {#exported-parameters}


#### aaa_url (string)


这是表示到 AAA 服务器连接的 url。

> [!NOTE]
> 目前本模块仅支持到 Diameter 服务器的连接。同时还需要提供 AVP 配置文件的路径，否则模块将无法启动，或无法正常工作。


```opensips title="aaa_url parameter usage"
modparam("auth_aaa", "aaa_url", "diameter:freeDiameter.conf;extra-avps-file:/etc/freeDiameter/aka_av_diameter.dictionary")
		
```


#### realm (string)


用于 Origin Diameter 命令的 Realm。


默认值为 "diameter.test"。


```opensips title="realm parameter usage"
		
modparam("aka_av_diameter", "realm", "scscf.ims.mnc001.mcc001.3gppnetwork.org")
		
```


#### server_uri (string)


用于 Diameter 命令的 Server-URI。


若留空，则 Server-Name 将在 realm 参数值前面加上 "sip:" 来构造
（例如 "sip:scscf.ims.mnc001.mcc001.3gppnetwork.org"）。


```opensips title="server_uri parameter usage"
		
modparam("aka_av_diameter", "server_uri", "sip:scscf.ims.mnc001.mcc001.3gppnetwork.org")
		
```


### Diameter 命令文件 {#diameter-commands-file}


需要提供给 *aaa_diameter* 连接的文件。


```
VENDOR 10415 TGPP

ATTRIBUTE Public-Identity                     601 string     10415
ATTRIBUTE Server-Name                         602 string     10415
ATTRIBUTE 3GPP-SIP-Number-Auth-Items          607 unsigned32 10415
ATTRIBUTE 3GPP-SIP-Authentication-Scheme      608 utf8string 10415
ATTRIBUTE 3GPP-SIP-Authenticate               609 hexstring  10415
ATTRIBUTE 3GPP-SIP-Authorization              610 hexstring  10415
ATTRIBUTE 3GPP-SIP-Authentication-Context     611 string     10415
ATTRIBUTE 3GPP-SIP-Item-Number                613 unsigned32 10415
ATTRIBUTE Confidentiality-Key                 625 hexstring  10415
ATTRIBUTE Integrity-Key                       626 hexstring  10415


ATTRIBUTE 3GPP-SIP-Auth-Data-Item             612 grouped    10415
{
	3GPP-SIP-Item-Number | OPTIONAL | 1
	3GPP-SIP-Authentication-Scheme | OPTIONAL | 1
	3GPP-SIP-Authenticate | OPTIONAL | 1
	3GPP-SIP-Authorization | OPTIONAL | 1
	3GPP-SIP-Authentication-Context | OPTIONAL | 1
	Confidentiality-Key | OPTIONAL | 1
	Integrity-Key | OPTIONAL | 1
}

APPLICATION-AUTH 16777216/10415 3GPP Cx

REQUEST 303 Multimedia-Auth Request
{
	Session-Id | REQUIRED | 1
	Origin-Host | REQUIRED | 1
	Origin-Realm | REQUIRED | 1
	Destination-Realm | REQUIRED | 1
	Vendor-Specific-Application-Id | REQUIRED | 1
	Auth-Session-State | REQUIRED | 1
	User-Name | REQUIRED | 1
	Public-Identity | REQUIRED | 1
	3GPP-SIP-Number-Auth-Items | REQUIRED | 1
	3GPP-SIP-Auth-Data-Item | REQUIRED | 1
	Server-Name | REQUIRED | 1
}

ANSWER 303 Multimedia-Auth Answer
{
	Session-Id | REQUIRED | 1
	Origin-Host | REQUIRED | 1
	Origin-Realm | REQUIRED | 1
	Destination-Host | OPTIONAL | 1
	Destination-Realm | OPTIONAL | 1
	Vendor-Specific-Application-Id | REQUIRED | 1
	Auth-Session-State | REQUIRED | 1
	User-Name | REQUIRED | 1
	Public-Identity | REQUIRED | 1
	3GPP-SIP-Number-Auth-Items | REQUIRED | 1
	3GPP-SIP-Auth-Data-Item | REQUIRED | 1
	Result-Code | REQUIRED | 1
}
```
<!-- CONTRIBUTORS -->

### 许可 {#license}

全部文档文件（即以 .md 为扩展名的文件）均按 Creative Common License 4.0 许可发布
