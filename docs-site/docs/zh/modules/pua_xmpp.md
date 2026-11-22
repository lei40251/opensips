---
title: "pua_xmpp 模块"
description: "本模块是 SIP 与 XMPP 之间呈现信息的网关。"
---


## 管理指南 {#admin-guide}


### 概述 {#overview}


本模块是 SIP 与 XMPP 之间呈现信息的网关。


它把一种格式转换为另一种格式，并使用 xmpp、pua 和 presence 模块来管理呈现状态信息的传输。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


在加载本模块之前必须先加载以下模块：


- *presence*。
- *pua*。
- *xmpp*。


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块的情况下运行 OpenSIPS 之前，必须安装以下库或应用程序：


- *libxml*。


### 导出的参数 {#exported-parameters}


#### server_address(str)


服务器的 IP 地址。


```opensips title="Set server_address parameter"
...
modparam("pua_xmpp", "server_address", "sip:sa@opensips.org:5060")
...
```


#### presence_server (str)


呈现服务器的地址。若设置，则在发送 PUBLISH 请求时用作出站代理。


```opensips title="Set presence_server parameter"
...
modparam("pua_xmpp", "presence_server", "sip:pa@opensips.org:5075")
...
```


### 导出的函数 {#exported-functions}


导出供配置文件使用的函数。


#### pua_xmpp_notify()


处理从 xmpp 域发往某个用户的 NOTIFY 消息的函数。它需要在配置文件中按方法和域进行过滤。若函数执行成功，必须发送 2xx 应答。


该函数可在 REQUEST_ROUTE 中使用。


```opensips title="Notify2Xmpp usage"
...
	if( is_method("NOTIFY") && $ru=~"sip:.+@sip-xmpp.siphub.ro")
	{
		if(Notify2Xmpp())
			t_reply(200, "OK");
		exit;
	}
...
```


#### pua_xmpp_req_winfo(request_uri, expires)


当收到从 xmpp 域发往某个用户的 SUBSCRIBE 时调用的函数。它会为该用户发起针对 winfo 的 SUBSCRIBE，随后携带对话信息（dialog-info）的 NOTIFY 会被转换为 xmpp 中的一个订阅。
它同样需要在配置文件中按方法、域和事件（仅针对 presence）进行过滤。


参数：


- *request_uri* (string)
- *expires* (int) - 收到的 SUBSCRIBE 中 Expires 头域的值。


该函数可在 REQUEST_ROUTE 中使用。


```opensips title="xmpp_send_winfo usage"
...
	if( is_method("SUBSCRIBE"))
	{
		handle_subscribe();
		if($ru=~"sip:.+@sip-xmpp.siphub.ro" && $hdr(Event)== "presence")
		{
			pua_xmpp_req_winfo($ruri, $hdr(Expires));
		}
		t_release();
	}
...
```


### 过滤 {#filtering}


示例中的 "sip-xmpp.siphub.ro" 应替换为 xmpp 模块中名为 'gateway_domain' 的参数所设置的值。


## 开发者指南 {#developer-guide}


本模块不提供可供其他 OpenSIPS 模块使用的函数。
<!-- CONTRIBUTORS -->

### 许可证 {#license}

所有文档文件（即扩展名为 .md 的文件）均依据 Creative Common License 4.0 授权
