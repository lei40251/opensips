---
title: "rr 模块"
description: "该模块包含记录路由逻辑"
---


## 管理员指南 {#admin-guide}


### 概述 {#overview}


该模块包含记录路由逻辑


### 对话支持 {#dialog-support}


OpenSIPS 基本上*只是*一个有状态事务代理，本身不内建任何对话支持。有许多功能/服务实际上需要对话感知，例如在对话创建阶段存储信息，这些信息将在整个对话存在期间使用。


最迫切的例子是 NAT 穿透，即处理对话内的 INVITE（re-INVITE）。在处理初始 INVITE 时，代理会检测主叫或被叫是否位于某个 NAT 之后，并修正信令与媒体部分——由于并非所有检测机制对对话内请求都可用（例如 usrloc），为了能够相应地修正顺序请求，代理必须记住原始请求已经过 NAT 处理。还有许多其它情形，对话感知可以修正问题或提供帮助。


解决方案是把与对话相关的附加信息存储在路由集（Record-Route/Route 头域）中，这些头域会出现在所有顺序请求中。因此，添加到 Record-Route 头域的任何信息都将在 Route 头域（对应于代理地址）中被找到（不依赖方向）。


作为存储容器，将使用 Record-Route / Route 头域的参数——RFC 3261 强化了 Record-Route 参数的镜像要求（见 12.1.1 UAS behavior）。


为此，本模块提供以下函数：


- [add_rr_param()](#add_rr_paramparam)
- [check_route_param()](#check_route_paramre)


```c title="Dialog support in RR module"
  
UAC                       OpenSIPS PROXY                          UAS

---- INVITE ------>       record_route()          ----- INVITE ---->
                     add_rr_param(";foo=true")

--- reINVITE ----->        loose_route()          ---- reINVITE --->
                    check_route_param(";foo=true")

<-- reINVITE ------        loose_route()          <--- reINVITE ----
                    check_route_param(";foo=true")

<------ BYE -------        loose_route()          <----- BYE -------
                    check_route_param(";foo=true")
  
```


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


在加载本模块之前必须先加载以下模块：


- *对其它 OpenSIPS 模块没有依赖*。


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，必须安装以下库或应用程序：


- *无*。


### 导出的参数 {#exported-parameters}


#### append_fromtag (integer) {#append_fromtag-integer}


如果开启，请求的 from-tag 会被附加到 record-route 中；这对于判断后续请求（例如 BYE）来自主叫（route 的 from-tag==BYE 的 from-tag）还是被叫（route 的 from-tag==BYE 的 to-tag）很有用


*默认值为 1（是）。*


```opensips title="Set append_fromtag parameter"
...
modparam("rr", "append_fromtag", 0)
...
```


#### enable_double_rr (integer)


在某些情况下，服务器需要插入两个 Record-Route 头域而不是一个。例如使用两个互不相连的网络，或从 UDP->TCP 进行跨协议转发时。该参数启用插入 2 个 Record-Route。服务器随后会将它们都移除。


*默认值为 1（是）。*


```opensips title="Set enable_double_rr parameter"
...
modparam("rr", "enable_double_rr", 0)
...
```


#### add_username (integer)


如果设置为非 0 值（表示是），用户名部分也会被添加到 Record-Route URI 中。


*默认值为 0（否）。*


```opensips title="Set add_username parameter"
...
modparam("rr", "add_username", 1)
...
```


#### enable_socket_mismatch_warning (integer)


当在 OpenSIPS 配置中强制指定预设的 record-route 头域，且该 record-route 头域中的 host 与服务器 host 不同时，日志中会打印一条告警。'enable_socket_mismatch_warning' 参数启用或禁用该告警。当 OpenSIPS 位于经过 NAT 的防火墙之后时，我们不希望每个桥接呼叫都打印该告警。


*默认值为 1（是）。*


```opensips title="enable_socket_mismatch_warning usage"
...
modparam("rr", "enable_socket_mismatch_warning", 0)
...
```


### 导出的函数 {#exported-functions}


#### loose_route() {#loose_route}


该函数对包含路由集的 SIP 请求执行路由。这个名称有点令人困惑，因为该函数也会路由处于 “strict router” 格式的请求。


该函数通常用于路由对话内请求（如 ACK、BYE、reINVITE）。不过，对话外请求也可能带有 “预加载的路由集”，并可用 loose_route 进行路由。它还会负责在 strict-router 与 loose-router 之间进行转换。


loose_route() 函数分析请求中的 Route 头域。如果没有 Route 头域，函数返回 FALSE，此时应完全通过 RURI 进行路由。如果找到 Route 头域，函数返回 TRUE，并按 RFC 3261 第 16.12 节所述行为处理。唯一例外是带有预加载 Route 头域的请求（携带 Route 头域的初始请求）：如果只有一个 Route 头域且指向本地代理，则该 Route 头域会被移除，函数返回 FALSE。


该函数能够自动检测所处理的是 'strict' 还是 'loose' 路由场景（区别在于 SIP 路径在 RURI 与 Route 头域之间的存储方式）。为了区分这两种场景，OpenSIPS 必须确定哪个 SIP URI 承载其地址/域——是 RURI（则为严格路由场景），还是最顶部的 Route URI（则为松散路由场景）。为了检查 SIP URI 是否承载其地址/域，OpenSIPS 会将 URI 中的 host 与监听 IP/接口（作为静态组成部分）以及 “domain” 模块/表中列出的域（作为动态组成部分）进行比对。


如果存在 Route 头域但发生其它解析错误（例如解析 TO 头域以获取 TAG），函数同样返回 FALSE。


请确保你的 loose_routing 函数不会被攻击者用来绕过代理授权。


松散路由这一主题非常复杂。更多细节请参见 RFC3261（在这份内容详尽的 RFC 中，搜索 “route set” 是个不错的切入点）。


该函数可在 REQUEST_ROUTE 中使用。


```opensips title="loose_route usage"
...
loose_route();
...
```


#### record_route() and record_route(string) {#record_route-and-record_routestring}


该函数添加一个新的 Record-Route 头域。该头域将被插入到消息中任何其它 Record-Route 头域之前。


如果传入字符串作为参数，它会被作为 URI 参数附加到 Record-Route 头域。该字符串必须遵循 “;name=value” 格式。


该函数可在 REQUEST_ROUTE、BRANCH_ROUTE 和 FAILURE_ROUTE 中使用。


```opensips title="record_route usage"
...
record_route();
...
```


#### record_route_preset(string [, string2])


该函数会把字符串放入 Record-Route，除非你清楚自己在做什么，否则不要使用。


参数含义如下：


- *string* - 要插入第一个头域的字符串；它可以包含伪变量。
- *string2*（可选）- 要插入第二个头域的字符串。


> [!NOTE]
> 如果存在 'string2'，则 'string' 参数指向出站接口，'string2' 参数指向入站接口。


该函数可在 REQUEST_ROUTE、BRANCH_ROUTE 和 FAILURE_ROUTE 中使用。


```opensips title="record_route_preset usage"
...
record_route_preset("1.2.3.4:5090");
...
```


#### add_rr_param(param) {#add_rr_paramparam}


向 Record-Route URI 添加一个参数。该参数必须使用 “;name=value” 格式。该函数可以在调用 [record_route()](#record_route-and-record_routestring) 之前或之后调用。


参数含义如下：


- *param*（字符串）- 要添加的 URI 参数。它必须遵循 “;name=value” 格式。


该函数可在 REQUEST_ROUTE、BRANCH_ROUTE 和 FAILURE_ROUTE 中使用。


```opensips title="add_rr_param usage"
...
add_rr_param(";nat=yes");
...
```


#### check_route_param(re) {#check_route_paramre}


该函数检查本地 Route 头域（对应于本地服务器）的 URI 参数是否匹配给定的正则表达式。它必须在 [loose_route()](#loose_route) 之后调用。


参数含义如下：


- *re*（字符串）- 用于与 Route URI 参数进行匹配的正则表达式。


该函数可在 REQUEST_ROUTE 中使用。


```opensips title="check_route_param usage"
...
if (check_route_param("nat=yes")) {
    setflag(6);
}
...
```


#### is_direction(dir)


该函数检查请求的流向。此检查使用 Route 头域的 “ftag” 参数，因此必须启用 [append_fromtag](#append_fromtag-integer) 模块参数。该函数同样只能在 [loose_route()](#loose_route) 之后调用。


如果 “dir” 与请求的流向相同，函数返回 true。


“downstream”（UAC 到 UAS）方向是相对于创建该对话的初始请求而言的。


参数含义如下：


- *dir*（字符串）- 要检查的方向。它可以是 “upstream”（从 UAS 到 UAC）或 “downstream”（UAC 到 UAS）。


该函数可在 REQUEST_ROUTE 中使用。


```opensips title="is_direction usage"
...
if (is_direction("upstream")) {
    xdbg("upstream request ($rm)\n");
}
...
```


#### 导出的伪变量 {#exported-pseudo-variables}


导出的伪变量在后续小节中列出。


##### $rr_params


*$rr_params* - Route 参数的完整字符串——仅在调用 loose_route() 之后可用


## 开发者指南 {#developer-guide}


RR 模块提供了一套供其它 OpenSIPS 模块使用的内部 API。该 API 支持基于 SIP 对话的功能——关于 RR 模块提供的对话支持，详见 [RR 对话 id](#dialog-support)。


对于内部（非脚本）用法，RR 模块向其它模块提供了注册回调函数的能力，每当处理本地 Route 头域时都会执行这些回调。回调函数将接收到注册时传入的参数以及 Route 头域的参数串作为入参。


### 可用函数 {#available-functions}


#### add_rr_param( msg, param)


向请求的 Record-Route URI 添加一个参数（param 必须为 “;name=value” 格式）。


函数成功时返回 0，否则返回 -1。


参数含义如下：


- *struct sip_msg* msg* - 将在其 Record-Route 头域中添加 “param” 参数的请求。
- *str* param* - 要添加到 Record-Route 头域的参数——它必须为 “;name=value” 格式。


#### check_route_param( msg, re)


该函数检查请求 “msg” 的本地 Route 头域（对应于本地服务器）的 URI 参数是否匹配给定的正则表达式 “re”。它必须在 loose_route 执行完成之后调用。


函数成功时返回 0，否则返回 -1。


参数含义如下：


- *struct sip_msg* msg* - 将对其 Route 头域参数进行检查的请求。
- *regex_t* param* - 用于与 Route 头域参数进行匹配的已编译正则表达式。


#### is_direction( msg, dir)


该函数检查请求 “msg” 的流向。此检查使用 Route 头域的 “ftag” 参数，因此必须启用 [append_fromtag](#append_fromtag-integer) 模块参数。该函数同样只能在 [loose_route()](#loose_route) 之后调用。


如果 “dir” 与请求的流向相同，函数返回 0，否则返回 -1。


参数含义如下：


- *struct sip_msg* msg* - 将检查其流向的请求。
- *int dir* - 用于比对的方向。它可以是 “RR_FLOW_UPSTREAM” 或 “RR_FLOW_DOWNSTREAM”。


#### get_route_param( msg, name, val)


该函数在 “msg” 的 Route 头域参数中查找名为 “name” 的参数，并将其值返回到 “val” 中。它只能在 loose_route 执行完成之后调用。


如果找到该参数（即使它没有值），函数返回 0，否则返回 -1。


参数含义如下：


- *struct sip_msg* msg* - 将对其 Route 头域参数进行查找的请求。
- *str *name* - 包含要查找的 Route 头域参数。
- *str *val* - 若找到，返回所查找的 Route 头域参数的值。如果该参数没有值，则可能是空字符串。


#### register_rrcb( callback, param, prior)


该函数注册一个新的回调（连同其参数）。当为本地地址执行松散路由时，将调用该回调。


函数成功时返回 0，否则返回 -1。


参数含义如下：


- *rr_cb_t callback* - 要注册的回调函数。
- *void *param* - 传递给回调函数的参数。
- *short prior* - 用于设置优先级的参数。如果该回调依赖另一个模块，此参数应大于该模块的优先级，否则应为 0。


### 示例 {#examples}


```c title="Loading RR module's API from another module"
...
#include "../rr/api.h"
...
struct rr_binds my_rrb;
...
...
/* 加载 RR API */
if (load_rr_api( &my_rrb )!=0) {
    LM_ERR("can't load RR API\n");
    goto error;
}
...
...
/* 注册 RR 回调 */
if (my_rrb.register_rrcb(my_callback,0,0))!=0) {
    LM_ERR("can't register RR callback\n");
    goto error;
}
...
```


## 常见问题 {#frequently-asked-questions}


**Q: 旧的 enable_full_lr 参数怎么样了**


该参数已被视为过时。它当初只是为了兼容较旧的 SIP 实体而引入，这些实体会抱怨没有值的 lr 参数。这种行为违反了 RFC 3261，而如今大多数 SIP 协议栈都已修正以符合该 RFC，因此该参数已被移除。


**Q: 在哪里可以找到更多关于 OpenSIPS 的信息？**


请访问 [https://opensips.org/](https://opensips.org/)。


**Q: 我可以在哪里提交关于本模块的问题？**


首先请检查你的问题是否已在我们某个邮件列表中得到了回答：


关于任何稳定版 OpenSIPS 的邮件应发送至 users@lists.opensips.org，关于开发版本的邮件应发送至 devel@lists.opensips.org。


如果希望邮件保持私密，请发送至 users@lists.opensips.org。


**Q: 我如何报告 bug？**


请遵循以下地址提供的指南：
[https://github.com/OpenSIPS/opensips/issues](https://github.com/OpenSIPS/opensips/issues)。
<!-- CONTRIBUTORS -->

### 许可证 {#license}

所有文档文件（即扩展名为 .md 的文件）均按 Creative Common License 4.0 许可。
