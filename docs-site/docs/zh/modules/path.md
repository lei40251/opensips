---
title: "path 模块"
description: "本模块设计用于中间 SIP 代理，例如位于注册服务器和代理之前的负载均衡器。"
---

## 管理员指南 {#admin-guide}


### 概述 {#overview}


本模块设计用于中间 SIP 代理，例如位于注册服务器和代理之前的负载均衡器。它提供的函数可插入 Path 头域，其中包含一个用于把注册的 received-URI 传递给下一跳的参数。它还提供了一种机制，可在后续请求中对该参数求值，并据此设置目的 URI。


#### 为注册插入 Path {#path-insertion-for-registrations}


对于 "[UAC] -> [P1] -> [REG]" 这类场景中的注册，"path" 模块可用于中间代理 P1，在把消息转发给注册服务器 REG 之前向消息中插入 Path 头域。可以用两个函数来实现：


- *add_path(...)* 使用出接口的地址，向消息中添加形如 "Path: <sip:1.2.3.4;lr>" 的 Path 头域。只有当端口不是默认端口 5060 时才会添加端口。若向函数传入了用户名，该用户名也会包含在 Path URI 中，形如 "Path: <sip:username@1.2.3.4;lr>"。
- *add_path_received(...)* 也会以与上面相同的形式添加 Path 头域，但同时还会添加一个指示消息 received-URI 的参数，形如 "Path: <sip:1.2.3.4;received=sip:2.3.4.5:1234;lr>"。若代理执行 NAT 检测并希望把经过 NAT 的地址传给注册服务器，这一点尤其有用。若调用该函数时传入了用户名，用户名也会包含在 Path URI 中。


#### 向经 NAT 的 UAC 出站路由 {#outbound-routing-to-nated-uacs}


若 UAC 经过 NAT 的地址被传给注册服务器，注册服务器在回送后续请求时会把注册中的 Path 头域用作当前请求的 Route 头域。若中间代理在注册期间插入了包含 "received" 参数的 Path 头域，该参数也会出现在新请求的 Route 头域中，从而使中间代理可以路由到该地址，而不是 Route URI 中携带的、用于穿透 NAT 的那个地址。该行为可通过设置模块参数 "use_received" 启用。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


在加载本模块之前，必须先加载以下模块：


- 依据 "received" 参数进行出站路由需要 "rr" 模块。


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，必须先安装以下库或应用程序：


- *无*。


### 导出的参数 {#exported-parameters}


#### use_received (int)


若设为 1，则对第一个 Route URI 的 "received" 参数求值，若该参数存在则将其用作目的 URI。


*默认值为 0。*


```opensips title="设置 use_received 参数"
...
modparam("path", "use_received", 1)
...
```


#### enable_double_path (integer)


在某些情形下，服务器需要插入两个 Path 头域而不是一个。例如使用两个互不相通的网络，或进行从 UDP 到 TCP 的跨协议转发时。该参数用于启用插入 2 个 Path。


*默认值为 1（是）。*


```opensips title="设置 enable_double_path 参数"
...
modparam("path", "enable_double_path", 0)
...
```


### 导出的函数 {#exported-functions}


#### add_path([user])


该函数添加形如 "Path: <sip:user@1.2.3.4;lr>" 的 Path 头域。


各参数的含义如下：


- *user*（string，可选）- 要作为 user 部分插入的用户名。


该函数可在 REQUEST_ROUTE 中使用。


```opensips title="add_path(user) 用法"
...
if (!add_path("loadbalancer")) {
	sl_send_reply(503, "Internal Path Error");
	...
};
...
```


#### add_path_received([user])


该函数添加形如 "Path: <sip:user@1.2.3.4;received=sip:2.3.4.5:1234;lr>" 的 Path 头域，把 'user' 设为地址的 user 部分，把自身的出接口地址设为 domain 部分，并把接收该请求的来源地址设为 received 参数。


各参数的含义如下：


- *user*（string，可选）- 要作为 user 部分插入的用户名。


该函数可在 REQUEST_ROUTE 中使用。


```opensips title="add_path_received(user) 用法"
...
if (!add_path_received("inbound")) {
	sl_send_reply(503, "Internal Path Error");
	...
};
...
```
<!-- CONTRIBUTORS -->

### 许可 {#license}

本项目的所有文档文件（即 .md 扩展名的文件）均以 Creative Common License 4.0 授权。
