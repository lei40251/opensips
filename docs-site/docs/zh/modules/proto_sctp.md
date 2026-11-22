---
title: "proto_sctp 模块"
description: "**proto_sctp** 模块是一个可选的传输模块（共享库），它导出处理基于 SCTP 的通信所需的逻辑。"
sidebar: false
---

## 管理员指南 {#admin-guide}


### 概述 {#overview}


**proto_sctp** 模块是一个可选的传输模块（共享库），它导出处理基于 SCTP 的通信所需的逻辑。（供更高层网络层使用的套接字初始化与发送/接收原语）


加载后，即可在脚本中定义 *"sctp:"* 监听地址。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


在加载本模块之前，必须先加载以下模块：


- *无*。


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，必须安装以下库或应用程序：


- *无*。


### 导出的参数 {#exported-parameters}


#### sctp_port (integer)


用于所有 SCTP 相关操作的默认端口。请注意，该默认端口既影响 SIP 监听部分（SCTP 监听地址中未定义端口时），也影响 SIP 发送部分（目标 SCTP URI 未显式指定端口时）。


如果只想修改 SCTP 的监听端口，请使用 SIP 监听地址定义中的 port 选项。


*默认值为 5060。*


```opensips title="设置 sctp_port 参数"
...
modparam("proto_sctp", "sctp_port", 5070)
...
```


## 常见问题 {#frequently-asked-questions}


**问：升级到 OpenSIPS 2.1 之后，出现如下错误："listeners found for protocol sctp, but no module can handle it"**


需要加载 "proto_sctp" 模块。在脚本中，请确保在设置 **[mpath](/zh/manual/Script-CoreParameters#mpath)** 之后执行 **loadmodule "proto_sctp.so"**。
<!-- CONTRIBUTORS -->

### 许可 {#license}

本项目的所有文档文件（即 .md 扩展名的文件）均以 Creative Common License 4.0 授权。
