---
title: "PUA BLA 模块"
description: "pua_bla 模块根据 draft-anil-sipping-bla-03.txt 中的规范提供桥接线路呈现（BLA）支持。"
sidebar: false
---


## 管理指南 {#admin-guide}


### 概述 {#overview}


pua_bla 模块根据 draft-anil-sipping-bla-03.txt 中的规范提供桥接线路呈现（Bridged Line Appearances，BLA）支持。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


以下模块必须在本模块之前加载：


- *usrloc*。
- *pua*。
- *presence*。


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，必须安装以下库或应用程序：


- *libxml*。


### 导出参数 {#exported-parameters}


#### default_domain(str)


注册用户的默认域，在构造注册服务器回调所用的 URI 时使用。


*默认值为 "NULL"。*


```opensips title="Set default_domain parameter"
...
modparam("pua_bla", "default_domain", "opensips.org")
...
```


#### header_name(str)


要添加到 PUBLISH 请求中的头域名称。该头域将包含发送 NOTIFY 的用户代理的 URI，该 NOTIFY 会被转换为 PUBLISH。这样可避免再向发送方发送包含相同信息的通知。


*默认值为 "NULL"。*


```opensips title="Set header_name parameter"
...
modparam("pua_bla", "header_name", "Sender")
...
```


#### outbound_proxy(str)


发送 SUBSCRIBE 请求时要使用的 outbound_proxy URI。


*默认值为 "NULL"。*


```opensips title="Set outbound_proxy parameter"
...
modparam("pua_bla", "outbound_proxy", "sip:proxy@opensips.org")
...
```


#### server_address(str)


服务器的 IP 地址。


```opensips title="Set server_address parameter"
...
modparam("pua_bla", "server_address", "sip:bla@160.34.23.12")
...
```


#### presence_server(str)


呈现服务器的地址 —— 在发送 PUBLISH 请求时将作为出站代理使用。该参数为可选。


*默认值为 "NULL"。*


```opensips title="Set presence_server parameter"
...
modparam("pua_bla", "presence_server", "sip:pa@opensips.org")
...
```


### 导出函数 {#exported-functions}


#### bla_set_flag()


该函数用于标记发往 BLA AOR 的 REGISTER 请求。模块会为已注册的联系地址订阅 dialog;sla 事件。


```opensips title="bla_set_flag usage"
...
if(is_method("REGISTER") && $tu=~"bla_aor@opensips.org") 
	bla_set_flag();		
...
```


#### bla_handle_notify()


该函数处理同一 BLA 上的话机发送给服务器的 NOTIFY 请求。该消息会被转换为 PUBLISH 请求并传给 presence 模块进一步处理。若处理成功，应发送 2xx 应答。


```opensips title="bla_handle_notify usage"
...
if(is_method("NOTIFY") && $tu=~"bla_aor@opensips.org") 
{
		if( bla_handle_notify() ) 
			t_reply(200, "OK");
}	
...
```
<!-- CONTRIBUTORS -->

### 许可证 {#license}

所有文档文件（即 .md 扩展名）均按 Creative Common License 4.0 授权。
