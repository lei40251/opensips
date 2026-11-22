---
title: "PUA reginfo 模块 (pua_reginfo)"
description: "本模块按照 RFC 3680 发布与 reg 事件相关的信息。"
sidebar: false
---


## 管理员指南 {#admin-guide}


### 概述 {#overview}


本模块按照 RFC 3680 发布与 "reg" 事件相关的信息。可将注册信息状态分发给已订阅的观察者（watcher）。


当新用户在本服务器上注册时（例如调用 "save()" 时），本模块会向已订阅该用户 reg-info 的用户 "PUBLISH" 信息。


本模块可以在另一台服务器上 "SUBSCRIBE" 信息，这样当某个用户的信息发生变化时，它就会收到 "NOTIFY" 请求。


最后，它可以处理收到的 "NOTIFY" 请求，并相应地更新本地注册库。


适用场景包括：


- 在多台服务器之间保持位置数据库（location database）同步
- 在用户注册时获得通知：为某个账号处理离线消息存储的呈现服务器，会在该用户上线时收到通知。
- 客户端可以订阅自身的注册状态，这样一旦其账号被管理员注销，它就会收到通知。
- ...


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


使用本模块前必须先加载以下模块：


- *pua*。
- *usrloc*。


#### 外部库或应用程序 {#external-libraries-or-applications}


无。


### 导出的参数 {#exported-parameters}


#### default_domain(str)


注册用户的默认域，用于为注册服务器回调构造 uri。


默认值为 *"NULL"*。


```opensips title="设置 default_domain 参数"
...
modparam("pua_reginfo", "default_domain", "opensips.org")
...
```


#### publish_reginfo(int)


是否生成 PUBLISH 请求。


默认值为 *"1"*（启用）。


```opensips title="设置 publish_reginfo 参数"
...
modparam("pua_reginfo", "publish_reginfo", 0)
...
```


#### outbound_proxy(str)


发送 Subscribe 和 Publish 请求时使用的 outbound_proxy uri。


默认值为 *"NULL"*。


```opensips title="设置 outbound_proxy 参数"
...
modparam("pua_reginfo", "outbound_proxy", "sip:proxy@opensips.org")
...
```


#### server_address(str)


服务器的 IP 地址。


```opensips title="设置 server_address 参数"
...
modparam("pua_reginfo", "server_address", "sip:reginfo@160.34.23.12")
...
```


#### ul_domain(str)


查询 usrloc 数据库所用的域。


默认值为 *"NULL"*（未设置）。


```opensips title="设置 ul_domain 参数"
...
modparam("pua_reginfo", "ul_domain", "location")
...
```


#### ul_identities_key(str)


可用于检索某个用户的多个公有身份的键。


默认值为 *"NULL"*（未设置）。


```opensips title="设置 ul_identities_key 参数"
...
modparam("pua_reginfo", "ul_identities_key", "identities")
...
onreply_route[register_reply] {
	if (t_check_status("200") && $hdr(P-Associated-URI)) {
        ul_add_key("location", "$tU@$td", "identities", "$hdr(P-Associated-URI)");
        reginfo_update("$tU@$td");
	}
}

...
```


### 导出的函数 {#exported-functions}


#### reginfo_handle_notify(uldomain)


本函数处理收到的 "NOTIFY" 请求，并相应地更新本地注册库。


本方法不生成任何 SIP 应答，需由脚本编写者自行完成。


该参数必须与存储记录的用户位置表（域）相对应。


返回码：


- *2* - 联系人已成功更新，但当前已无在线联系人。
*1* - 联系人已成功更新，且至少还有一个联系人处于注册状态。
*-1* - 无效的 NOTIFY 或其他错误（见日志文件）


```opensips title="reginfo_handle_notify 用法"
...
if(is_method("NOTIFY")) 
	if (reginfo_handle_notify("location"))
		send_reply("202", "Accepted");
...
```


#### reginfo_subscribe(uri[, expires])


本函数将在给定的服务器 URI 上订阅 reginfo 信息。


各参数含义如下：


- *uri* - 要订阅的服务器的 SIP-URI，可包含伪变量。
*expires* - 该订阅的过期时间，单位为秒（默认 3600）


```opensips title="reginfo_subscribe 用法"
...
route {
	t_on_reply("1");
	t_relay();
}

reply_route[1] {
	if (t_check_status("200")) 
		reginfo_subscribe("$ru");		
}
...		
```


#### reginfo_update(aor)


显式更新呈现状态，例如在获知新信息时。这可能触发向已订阅实体发送新的 NOTIFY；至少它会更新内部信息，供后续的订阅和通知使用。


当注册被更新时，这一操作会隐式执行。然而，当注册刚刚被附加了身份之类的额外信息时，则不会自动触发。


各参数含义如下：


- *aor* - 要更新的 AOR。


```opensips title="reginfo_subscribe 用法"
...
modparam("pua_reginfo", "ul_domain", "location")
modparam("pua_reginfo", "ul_identities_key", "identities")
...
onreply_route[register_reply] {
	if (t_check_status("200") && $hdr(P-Associated-URI)) {
        ul_add_key("location", "$tU@$td", "identities", "$hdr(P-Associated-URI)");
        reginfo_update("$tU@$td");
	}
}

...
```
<!-- CONTRIBUTORS -->

### 许可 {#license}

所有文档文件（即 .md 扩展名的文件）均以 Creative Common License 4.0 授权。
