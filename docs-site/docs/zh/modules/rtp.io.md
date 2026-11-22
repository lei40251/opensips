---
title: "rtp.io 模块"
description: "rtp.io 模块提供在 OpenSIPS 内处理 RTP 流量的集成方案，可直接在 OpenSIPS 进程内部完成 RTP 中继与处理。"
---


## 管理指南 {#admin-guide}


### 概述 {#overview}


rtp.io 模块提供在 OpenSIPS 内处理 RTP 流量的集成方案，
可直接在 OpenSIPS 进程内部完成 RTP 中继与处理。这消除了
对 RTPProxy 等外部进程的需求，在某些用例中带来更
精简、高效且易管理的系统。


*rtp.io* 模块在主 OpenSIPS 进程中启动 RTP 处理线程，
并允许 *rtpproxy* 模块通过一对一的套接字对访问这些
线程。这种紧密集成使得无需依赖外部 RTP 处理
服务即可在 OpenSIPS 内高效管理 RTP 流量。


该模块要求 RTPProxy 3.1 或更高版本，并使用
`--enable-librtpproxy` 选项编译。它利用
`librtpproxy` 库管理 RTP 流量，并与现有的 *rtpproxy* 模块对接，以生成命令、
解析响应并处理 SIP 消息。


当 *rtpproxy* 模块不带参数加载且
*rtp.io* 模块也已加载时，*rtp.io* 导出的
套接字会自动用于集合 `0`。
也可以使用 `"rtp.io:auto"` 别名将这些套接字
纳入其他集合。


### 依赖 {#dependencies}


### 导出的参数 {#exported-parameters}


#### rtpproxy_args(string)


初始化时传递给内嵌 RTPProxy 模块的
命令行参数。完整列表请参阅 RTPProxy
文档。


*该参数没有默认值。*


```opensips title="设置 rtpproxy_args 参数"
...
modparam("rtp.io", "rtpproxy_args", "-m 12000 -M 15000 -l 0.0.0.0 -6 /::")
...
```


### 导出的函数 {#exported-functions}
<!-- CONTRIBUTORS -->

### 许可证 {#license}

所有文档文件（即以 .md 为扩展名的文件）均按 Creative Common License 4.0 授权。
