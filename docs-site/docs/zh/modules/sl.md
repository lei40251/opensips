---
title: "sl 模块"
description: "SL 模块使 OpenSIPS 能够充当无状态 UA 服务器，在不保留状态的情况下为 SIP 请求生成应答。"
sidebar: false
---


## 管理员指南 {#admin-guide}


### 概述 {#overview}


SL 模块使 OpenSIPS 能够充当无状态 UA 服务器，在不保留状态的情况下为 SIP 请求生成应答。这在许多场景下都是有利的：既能避免加重服务器内存负担，又能良好地横向扩展。


SL 模块需要过滤在对 INVITE 生成本地无状态应答之后收到的 ACK。为了识别这类 ACK，OpenSIPS 会在 to-tag 中加入一个特殊的「签名」。在收到的 ACK 中会查找该签名，若存在，则该 ACK 被吸收。


为加快过滤过程，模块采用超时机制。发出应答时会设置一个定时器。在超时未触发之前，收到的 ACK 请求都会使用 To tag 值进行校验。一旦定时器到期，所有 ACK 都会被放行——距发出应答已过去很长时间，因此不再预期存在必须被拦截的 ACK。


ACK 过滤在某些罕见情况下可能失效。如果认为这对你有影响，最好对 INVITE 处理使用有状态处理（tm 模块）。具体而言，当 UA 发送的 INVITE 本身已带有 to-tag（例如 re-INVITE）而 OpenSIPS 想要对其应答时，问题就会出现。此时它会保留当前的 to-tag，该值会被镜像到 ACK 中。OpenSIPS 将看不到自己的签名，从而把 ACK 向下游转发。造成的危害并不严重——只是转发了一个无用的 ACK。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


本模块之前必须先加载以下模块：


- *不依赖其他 OpenSIPS 模块*。


#### 外部库或应用程序 {#external-libraries-or-applications}


加载本模块运行 OpenSIPS 之前，必须先安装以下库或应用程序：


- *无*。


### 导出的参数 {#exported-parameters}


#### enable_stats (integer)


模块是否生成统计并导出给核心管理器。取值为零表示禁用。


SL 模块提供关于发送了多少应答（按状态码类别拆分）以及过滤掉了多少本地 ACK 的统计。


默认值为 1（启用）。


```opensips title="enable_stats example"
modparam("sl", "enable_stats", 0)
```


### 导出的函数 {#exported-functions}


#### sl_send_reply(code, reason)


对当前请求，使用给定的状态码和原因短语回送一个应答。该应答以无状态方式发送，完全独立于 Transaction 模块，且不会对 INVITE 的应答进行重传。`code` 和 `reason` 可以包含在运行时被替换的伪变量。


各参数含义如下：


- *code (int)* - 返回码。
- *reason (string)* - 原因短语。


该函数可在 REQUEST_ROUTE、ERROR_ROUTE 中使用。


```opensips title="sl_send_reply usage"
...
sl_send_reply(404, "Not found");
...
sl_send_reply($err.rcode, $err.rreason);
...
```


#### sl_reply_error()


回送一个错误应答，描述最近一次内部错误的性质。通常应在某个返回错误码的脚本函数之后使用该函数。


该函数可在 REQUEST_ROUTE 中使用。


```opensips title="sl_reply_error usage"
...
sl_reply_error();
...
```


### 导出的统计 {#exported-statistics}


#### 1xx_replies


1xx_replies 的数量。


#### 2xx_replies


2xx_replies 的数量。


#### 3xx_replies


3xx_replies 的数量。


#### 4xx_replies


4xx_replies 的数量。


#### 5xx_replies


5xx_replies 的数量。


#### 6xx_replies


6xx_replies 的数量。


#### sent_replies


sent_replies 的数量。


#### sent_err_replies


sent_err_replies 的数量。


#### received_ACKs


received_ACKs 的数量。
<!-- CONTRIBUTORS -->

### 许可证 {#license}

所有文档文件（即扩展名为 .md 的文件）均按 Creative Common License 4.0 授权
