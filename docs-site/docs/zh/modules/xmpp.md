---
title: "xmpp 模块"
description: "本模块是 OpenSIPS 与 jabber 服务器之间的网关，用于在 SIP 客户端与 XMPP（jabber）客户端之间交换即时消息。"
---


## 管理指南 {#admin-guide}


### 概述 {#overview}


本模块是 OpenSIPS 与 jabber 服务器之间的网关。它使得
SIP 客户端与 XMPP（jabber）客户端之间可以交换即时消息。


该网关有两种运行模式：


- **组件模式** - 网关需要一个独立的 XMPP 服务器，`xmpp` 模块充当
一个 XMPP 组件
- **服务器模式** - 模块自身充当 XMPP 服务器，系统中无需另一个 XMPP 服务器。注意：这是 XMPP 服务器的受限实现，目前尚不支持 SRV 或 TLS。该模式目前处于 beta 阶段。


在组件模式下，需要一个本地 XMPP 服务器（推荐 jabberd2 或 ejabberd）；xmpp 模块会将所有连接中继到一个指向本地 jabber 服务器的 tcp 连接。


在 XMPP 服务器运行起来之后，需要在 OpenSIPS 配置文件中设置以下参数：


- xmpp_domain 与 xmpp_host，在
[导出的参数](#exported-parameters)一节中有说明；
- socket= 你的 ip；
- alias=opensips 域 与
alias=gateway 域；
- 也可以更改 jabber 服务器密码，它必须与 xmpp_password 参数一致。


组件模式的一个用例大致如下：


- OpenSIPS 运行在 sip-server.opensips.org 上；
- jabber 服务器运行在 xmpp.opensips.org 上；
- 组件运行在 xmpp-sip.opensips.org 上。


在服务器模式下，xmpp 模块是一个最简的 jabber 服务器，因此无需安装另一个 jabber 服务器，网关会连接到那些你希望与之聊天的用户拥有账号的 jabber 服务器。


如果要切换到服务器模式，必须更改
"backend" 参数，如[导出的参数](#exported-parameters)一节所示，
将其从 component 改为 server。


服务器模式的一个用例大致如下：


- OpenSIPS 运行在 sip-server.opensips.org 上；
- "XMPP 服务器"运行在 xmpp-sip.opensips.org 上。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


在加载本模块之前，必须先加载以下模块：


- *需要 'tm' 模块*。


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，必须安装以下库或应用程序：


- *libexpat1-devel* - 用于解析/构建 XML。


### 导出的参数 {#exported-parameters}


#### backend (string)


模块使用的模式；可以是 component 或 server。


*默认值为 "component"。*


```opensips title="Set backend parameter"
...
 modparam("xmpp", "backend", "server")
...
```


#### xmpp_domain (string)


组件或服务器的 xmpp 域，取决于所处的模式。


*默认值为 "127.0.0.1"。*


```opensips title="Set xmpp_domain parameter"
...
 modparam("xmpp", "xmpp_domain", "xmpp.opensips.org")
...
```


#### xmpp_host (string)


本地 jabber 服务器的 ip 地址或名称（当 backend 设置为 "component" 时）；
或在服务器模式下要绑定的地址。


*默认值为 "127.0.0.1"。*


```opensips title="Set xmpp_host parameter"
...
 modparam("xmpp", "xmpp_host", "xmpp.opensips.org")
...
```


#### sip_domain (string)


仅当 xmpp 模块以组件模式使用，且作为 jabber 服务器宿主的域
与 sip 服务器的域相同（即为 SIP 服务和 XMPP 服务使用同一域名）时，
才需要设置该参数。在这种情况下，如果要在 xmpp 账号中添加使用该域的
好友，那么所有到达 jabber 服务器的消息都会被当作是发给本地 xmpp 用户的。
因此有必要在发送 xmpp 消息时将 sip 域名转换为另一个域。
该参数正是 XMPP 中应使用的 SIP 域名。
用法示例：如果 sip 与 xmpp 域都是 opensips.org，而该参数设置为 sip.opensips.org，
那么在 xmpp 中发送的所有请求里，sip 用户的域都会被转换为 sip.opensips.org。
此外，在 XMPP 账号中 SIP 好友必须使用该域：sip.opensips.org，当消息穿过网关时
它会被转换为真实的 opensips.org。


*默认值为 NULL。*


```opensips title="Set xmpp_host parameter"
...
 modparam("xmpp", "sip_domain", "sip.opensips.org")
...
```


#### xmpp_port (integer)


在组件模式下，这是所连接的 jabber 路由器的端口。在服务器模式下，这是要绑定的传输地址。


*默认值为 "5347"（若 backend 设置为 "component"），或 "5269"（若 backend 设置为 "server"）。*


```opensips title="Set xmpp_port parameter"
...
 modparam("xmpp", "xmpp_port", 5269)
...
```


#### xmpp_password (string)


本地 jabber 服务器的密码。


*默认值为 "secret"；如果在此更改，也必须在 jabber 服务器提供的 c2s.xml 中更改。jabberd2 的默认配置如下所示：*


```
						<router>
		............... 
		<!-- Username/password to authenticate as --&gt;
    <user>jabberd</user>;          <!-- default: jabberd -->;
    <pass>secret</pass>;           <!-- default: secret -->;	
```


```opensips title="Set xmpp_password parameter"
...
 modparam("xmpp", "xmpp_password", "secret")
...
```


#### outbound_proxy (string)


发送消息时用作下一跳的 SIP 地址。当 OpenSIPS 使用的域名不在 DNS 中，
或使用单独的 OpenSIPS 实例处理 xmpp 时，
该参数非常有用。如果未设置，消息将发送到
目标 URI 中的地址。


*默认值为 NULL。*


```opensips title="Set outbound_proxy parameter"
...
 modparam("xmpp", "outbound_proxy", "sip:opensips.org;transport=tcp")
...
```


### 导出的函数 {#exported-functions}


#### xmpp_send_message()


将 SIP 消息转换为 XMPP（jabber）消息，以便中继到 XMPP（jabber）客户端。


```opensips title="xmpp_send_message() usage"
...
xmpp_send_message();
...
```


## 示例 {#samples}

[samples](https://github.com/OpenSIPS/opensips/tree/3.6/modules/xmpp/samples)
<!-- CONTRIBUTORS -->

### 许可证 {#license}

所有文档文件（即 .md 扩展名）均按 Creative Common License 4.0 许可发布。
