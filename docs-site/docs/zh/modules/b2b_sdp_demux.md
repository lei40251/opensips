---
title: "b2b_sdp_demux 模块"
description: "本模块提供把多流 SDP 呼叫转换为多个呼叫的逻辑，每个新呼叫只包含初始呼叫中的一部分流。"
sidebar: false
---


## 管理指南 {#admin-guide}


### 概述 {#overview}


本模块提供把多流 SDP 呼叫转换为多个呼叫的逻辑，每个呼叫只包含初始呼叫中的一部分流。该模块只处理呼叫的 SIP 信令部分，不干预呼叫的媒体，媒体仍端到端传输。它唯一的操作是在 SDP 层面禁用下游未使用的媒体流。


该逻辑构建在 B2B 模块之上，把一个 B2B 服务端（含多条流的初始呼叫）解复用为多个 B2B 客户端（各自拥有自己的流子集）。来自初始主叫的对话内请求会被分叉到每个客户端，各客户端的应答再聚合回主叫。另一侧的对话内请求会转发给主叫，就好像只有其所属的流发生了变化。当客户端侧终止呼叫时，模块可以有不同的行为，具体取决于 [client_bye_mode](#client_bye_mode-string) 参数。


### 使用场景 {#use-cases}


本模块常见的一个适用场景是把 OpenSIPS 配置为 SIPREC SRS 代理。使用该模块，可以在其中一侧接收 SIPREC INVITE，这类请求通常包含两条或更多 SDP 流（每条流对应一个通话/会议参与者），并在下游把每条流拆分/解复用到一个新的呼叫中，通常发往具备通话录音能力的媒体服务器。这样媒体服务器只需处理只含一条媒体流的呼叫。


另一个使用场景是把多条流均衡到不同的媒体服务器。例如，如果同时提供音频和视频服务，可以把含两条流（音频流和视频流）的呼叫拆分为两个不同的呼叫，分别交由不同的服务器处理。这样既可有专门的音频处理媒体服务器，也可有专门的视频处理媒体服务器。当然，前提是能够分别处理这些流，例如用于录音。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


在使用本模块之前必须先加载以下模块：


- *B2B_ENTITIES* - 用于处理服务端和客户端侧呼叫的 Back-2-Back 模块。


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，必须安装以下库或应用程序：


- *无*。


### 导出的参数 {#exported-parameters}


#### client_bye_mode (string) {#client_bye_mode-string}


该参数指示在上游呼叫的上下文中应如何处理来自客户端侧的 BYE。


可能的取值有：

- *disable* - 当某个客户端终止其呼叫时，模块只是禁用与该呼叫关联的媒体流，从而向上游发送 re-INVITE。


- *terminate* - 当某个客户端终止其呼叫时，模块会终止所有其他呼叫，包括上游呼叫。


- *disable-terminate* - 与 disable 相同，区别在于当最后一条流被禁用时，模块不是发送所有流均被禁用的 re-INVITE，而是向上游发送 BYE。

*默认值为 "disable"。*


```opensips title="设置 client_bye_mode 参数"
...
modparam("b2b_sdp_demux", "client_bye_mode", "terminate")
...
```


### 导出的函数 {#exported-functions}


#### b2b_sdp_demux(URI[, [headers][, streams]])


对触发该函数的呼叫启用 B2B SDP 解复用场景。


参数：


- *URI* (string) - 新生成的呼叫要发往的 URI
- *headers*（AVP，可选）- 一个包含多个值的 AVP，每个索引对应该函数生成的一个新呼叫。AVP 中值的数量应等于产生的呼叫数量，否则可能导致意外行为。若未提供，则不会添加额外的头域。
- *streams*（AVP，可选）- 一个包含多个值的 AVP，每个值指示当前客户端应使用的媒体流索引。若单个呼叫需要使用多条流，则以逗号分隔指定（即 *0,2*）。AVP 值的数量代表下游生成的呼叫数量。若未提供该参数，则初始呼叫中的每条流都会生成一个呼叫。


该函数只能在请求路由中使用。


```opensips title="使用 b2b_sdp_demux() 处理音频 SIPREC 呼叫"
...
if (!has_totag() && is_method("INVITE")) {
	$avp(headers) = "X-Leg: caller\r\n");
	$avp(headers) = "X-Leg: callee\r\n");
	b2b_sdp_demux("sip:media@localhost", $avp(headers));
}
...
	
```
<!-- CONTRIBUTORS -->

### 许可证 {#license}

本项目的所有文档文件（即 .md 扩展名的文件）均以 Creative Common License 4.0 授权。
