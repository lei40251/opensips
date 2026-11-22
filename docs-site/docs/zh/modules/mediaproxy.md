---
title: "mediaproxy 模块"
description: "mediaproxy 是一个 OpenSIPS 模块，旨在为大多数现有 SIP 客户端实现自动 NAT 穿透。"
sidebar: false
---

## 管理员指南 {#admin-guide}


### 概述 {#overview}


mediaproxy 是一个 OpenSIPS 模块，旨在为大多数现有 SIP 客户端
实现自动 NAT 穿透。这意味着使用
mediaproxy 模块时，无需在 NAT 设备上做任何特殊配置，
这些客户端就能在 NAT 之后正常工作。


### 工作原理 {#principle-of-operation}


该 NAT 穿透方案的运作方式是在 2 个 SIP 用户代理之间
放置一个媒体中继。它会对双方的 SDP 消息进行改写，
使得双方以为自己在直接通信，实际上却在与中继通信。


mediaproxy 由 2 个组件构成：


- OpenSIPS 的 mediaproxy 模块
- 一个名为 MediaProxy 的外部应用程序，它使用一个
调度器和多个分布式媒体中继。可从 http://ag-projects.com/MediaProxy.html
获取（该模块要求 2.0.0 或更高版本）。


mediaproxy 调度器与 OpenSIPS 运行在同一台机器上，
其作用是为呼叫选择一个媒体中继。媒体
中继既可以运行在调度器所在的机器上，也可以运行在多台
远程主机上，其作用是在通话各方之间转发媒体流。想进一步了解 MediaProxy
的架构，请阅读其随附的文档。


为了能够充当 2 个用户代理之间的中继，运行该模块/代理服务器的
机器必须拥有公网 IP 地址。


OpenSIPS 会要求媒体中继按 SDP offer 和 answer 中的媒体流数量
分配相应数量的端口。媒体中继会把为它们分配的 IP 地址和端口返回给
OpenSIPS。随后 OpenSIPS 会用媒体中继提供的
IP 地址和端口替换 SDP 消息中原有的 contact IP 和 RTP 端口。这样，两个用户代理
都会尝试联系媒体中继，而不是彼此直接通信。
一旦用户代理联系上媒体中继，中继就会记录它们来自的
地址，并知道该把从另一端点收到的报文转发到哪里。这是必需的，
因为 NAT 设备为媒体流分配的地址/端口在它们真正
离开 NAT 设备之前是未知的。而媒体中继的地址始终已知
（因为是公网 IP），所以 2 个端点知道该连向何处。在它们
这样做之后，中继就获知了它们的地址，并能在
它们之间转发报文。


使用 mediaproxy 时能在 NAT 之后透明工作的
SIP 客户端，就是所谓的对称客户端。对称客户端
的特点是收发数据使用同一个端口。
对客户端而言，信令和媒体都必须如此，才能在 NAT 设备上
不做任何配置的情况下与 mediaproxy 透明协作。


### 特性 {#features}


- 使对称客户端在 NAT 之后透明工作，客户端 NAT 设备上无需
任何配置。
- 能够把 RTP 流量分布到运行在多台主机上的多个媒体中继。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


使用该模块前必须先加载以下模块：


- *dialog* 模块 - 如果使用了 engage_media_proxy
（参见下文对 engage_media_proxy 的说明）。


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载该模块运行 OpenSIPS 之前，必须先安装以下库或应用程序：


- *无*。


### 导出的参数 {#exported-parameters}


#### disable (int)


布尔标志位，指定是否应禁用 mediaproxy。当你想在
两个不同环境中使用同一份 OpenSIPS 配置（一个使用 mediaproxy，
另一个不使用）时，这很有用。在
mediaproxy 被禁用的情况下，对其函数的调用不会产生
任何效果，从而让你无需改动即可复用同一份配置。


*默认值为 "0"。*


```opensips title="设置 disable 参数"
...
modparam("mediaproxy", "disable", 1)
...
        
```


#### mediaproxy_socket (string)


它是指向文件系统套接字的路径，mediaproxy 调度器
在该套接字上监听来自模块的命令。


*默认值为
"/run/mediaproxy/dispatcher.sock"。*


```opensips title="设置 mediaproxy_socket 参数"
...
modparam("mediaproxy", "mediaproxy_socket", "/run/mediaproxy/dispatcher.sock")
...
        
```


#### mediaproxy_timeout (int)


等待 mediaproxy 调度器应答的时间
（以毫秒为单位）。


*默认值为 "500"。*


```opensips title="设置 mediaproxy_timeout 参数"
...
modparam("mediaproxy", "mediaproxy_timeout", 500)
...
        
```


#### signaling_ip_avp (string)


用于指定存放 SIP 信令来源 IP 地址的 AVP。
如果设置了该 AVP，就会用它来
获取信令 IP 地址，否则将使用接收到该 SIP 消息的
源 IP 地址。
该 AVP 适用于呼叫建立路径上存在多台
代理，而实际启动 mediaproxy 的代理并非直接从 UA
接收 SIP 消息、因而无法确定信令来源的 NAT IP 地址
的情况。这种情况下，在第一台代理上附加一个
SIP 头域，然后在启动 mediaproxy 的代理上把该头域的值
复制到 signaling_ip_avp 中，就能让它获取到
信令来源的正确 NAT IP 地址。


*默认值为 "$avp(signaling_ip)"。*


```opensips title="设置 signaling_ip_avp 参数"
...
modparam("mediaproxy", "signaling_ip_avp", "$avp(nat_ip)")
...
        
```


#### media_relay_avp (string)


用于指定存放可选的、由应用定义的媒体中继 IP 地址的 AVP，
该地址表示当前呼叫优先使用的特定媒体中继。
如果在调用 use_media_proxy() 之前把 IP 地址写入该 AVP，
调度器将优先选择它，而不是走常规的选择
算法。


*默认值为 "$avp(media_relay)"。*


```opensips title="设置 media_relay_avp 参数"
...
modparam("mediaproxy", "media_relay_avp", "$avp(media_relay)")
...
        
```


#### ice_candidate (string)


指示将要添加到 SDP 中的 ICE candidate 类型。
它可以取 3 个值：'none'、'low-priority' 或 'high-priority'。
如果选择 'none'，则不会向 SDP 添加任何 candidate。如果
选择 'low-priority'，则添加一个低优先级 candidate；
如果选择 'high-priority'，则添加一个高优先级 candidate。


*默认值为 "none"。*


```opensips title="设置 ice_candidate 参数"
...
modparam("mediaproxy", "ice_candidate", "low-priority")
...
        
```


#### ice_candidate_avp (string)


用于指定存放将要插入 SDP 中的 ICE candidate 的 AVP。
该 AVP 中指定的值将覆盖
ice_candidate 模块参数中的值。


注意，如果正在使用 use_media_proxy() 和 end_media_session() 函数，
除非把 tm 模块的 onreply_avp_mode 设为 '1'，否则该 AVP
在应答路由中不可用；如果该 AVP
未设置，则使用默认值。


*默认值为 "$avp(ice_candidate)"。*


```opensips title="设置 ice_candidate_avp 参数"
...
modparam("mediaproxy", "ice_candidate_avp", "$avp(ice_candidate)")
...
        
```


### 导出的函数 {#exported-functions}


#### engage_media_proxy()


触发对所有带 SDP 消息体的对话请求和应答
使用 MediaProxy。只需在对话中的第一个 INVITE 上
调用一次。此后它将利用
dialog 模块跟踪该对话，并在属于该对话且带 SDP 消息体的
每个请求和应答上自动调用
use_media_proxy()。对话结束时，它还会
自动调用 end_media_session()。所有这些都是在对话回调中
内部调用的，因此要使用该函数，必须加载并配置 dialog 模块。


该函数是一种高级机制，使用媒体中继时无需在属于该对话的
每条消息上手动调用函数。但这种方法灵活性较差，
因为一旦通过在第一个 INVITE 上调用该函数把事情启动起来，
它就无法停止，即使调用
end_media_session() 也不行。它只会在对话结束时停止。
在此之前，它会修改每条对话内消息的 SDP 内容，
使其使用媒体中继。如果需要对这一过程有更多控制，
例如只在失败路由中才开始使用 mediaproxy，或者在失败
路由中停止使用 mediaproxy，那么应当使用 use_media_proxy 和 end_media_session 函数，
并按需手动调用。使用该函数时不应与 use_media_proxy()
或 end_media_session() 中的任何一个混用。


该函数可在 REQUEST_ROUTE 中使用。


```opensips title="使用 engage_media_proxy 函数"
...
if (is_method("INVITE") && !has_totag()) {
    # 如有需要，我们也可以使用特定的媒体中继
    #$avp(media_relay) = "1.2.3.4";
    engage_media_proxy();
}
...
        
```


#### use_media_proxy()


将向调度器发起调用，并把 SDP 消息体中
每个受支持媒体流的 IP 和端口替换为媒体中继返回的
值。这将强制媒体流经由媒体中继路由。如果 SDP 中
同时存在受支持和不受支持的流，则只会修改
受支持的流，不受支持的流
保持不变。


该函数不应与 engage_media_proxy() 混用。


该函数有以下返回码：


- +1 - 成功修改消息（true 值）
- -1 - 处理消息出错（false 值）
- -2 - 缺少 SDP 消息体，无需处理（false 值）


该函数可在 REQUEST_ROUTE、ONREPLY_ROUTE、FAILURE_ROUTE、BRANCH_ROUTE 中使用。


```opensips title="使用 use_media_proxy 函数"
...
if (is_method("INVITE")) {
    # 如有需要，我们也可以使用特定的媒体中继
    #$avp(media_relay) = "1.2.3.4";
    use_media_proxy();
}
...
        
```


#### end_media_session()


将调用调度器以通知媒体中继结束
媒体会话。这在呼叫结束时执行，用于指示媒体
中继释放分配给该呼叫的资源，并
保存关于该媒体会话的日志信息。在 BYE、
CANCEL 或失败时调用。


该函数不应与 engage_media_proxy() 混用。


该函数可在 REQUEST_ROUTE、ONREPLY_ROUTE、FAILURE_ROUTE、BRANCH_ROUTE 中使用。


```opensips title="使用 end_media_session 函数"
...
if (is_method("BYE")) {
    end_media_session();
}
...
        
```
<!-- CONTRIBUTORS -->

### 许可证 {#license}

所有文档文件（即 .md 扩展名）均按 Creative Common License 4.0 许可
