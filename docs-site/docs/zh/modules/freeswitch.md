---
title: "freeswitch 模块"
description: "freeswitch 模块是针对 FreeSWITCH Event Socket Layer 接口的 C 语言驱动。"
---


## 管理指南 {#admin-guide}


### 概述 {#overview}


*"freeswitch"* 模块是针对 FreeSWITCH Event Socket Layer 接口的 C 语言驱动。它既可以向一台或多台 FreeSWITCH 服务器下发命令，也可以从这些服务器接收事件，从而与之交互。


该驱动可视为一个集中式的 FreeSWITCH ESL 连接管理器。OpenSIPS 各模块可以调用其 API，以便便捷地建立、引用和复用 ESL 连接。


FreeSWITCH ESL URL 的形式为：
**fs://[username]:password@host[:port]**。
默认 ESL 端口为 8021。


### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块的情况下运行 OpenSIPS 之前，必须安装以下库或应用程序：


- *无*


### 导出的参数 {#exported-parameters}


#### event_heartbeat_interval (integer)


FreeSWITCH HEARTBEAT 事件到达的预期间隔。


*默认值为 "1"（秒）。*


```opensips title="Setting the event_heartbeat_interval parameter"
...
modparam("freeswitch", "event_heartbeat_interval", 20)
...
```


#### esl_connect_timeout (integer)


建立 ESL 连接所允许的最长持续时间。


*默认值为 "5000"（毫秒）。*


```opensips title="Setting the esl_connect_timeout parameter"
...
modparam("freeswitch", "esl_connect_timeout", 3000)
...
```


#### esl_cmd_timeout (integer)


执行 ESL 命令所允许的最长持续时间。该持续时间不包含连接耗时。


*默认值为 "5000"（毫秒）。*


```opensips title="Setting the esl_cmd_timeout parameter"
...
modparam("freeswitch", "esl_cmd_timeout", 3000)
...
```


#### esl_cmd_polling_itv (integer)


轮询 ESL 命令应答时所使用的休眠间隔。由于该参数的值会给任意 ESL 命令带来一个最短持续时间，应先以调试模式运行 OpenSIPS，确定任意 ESL 命令的预期应答时间，再据此调整本参数。


*默认值为 "1000"（微秒）。*


```opensips title="Setting the esl_cmd_polling_itv parameter"
...
modparam("freeswitch", "esl_cmd_polling_itv", 3000)
...
```


### 导出的函数 {#exported-functions}
<!-- CONTRIBUTORS -->

### 许可证 {#license}

所有文档文件（即扩展名为 .md 的文件）均依据 Creative Common License 4.0 授权
