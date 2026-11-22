---
title: "presence_mwi 模块"
description: "本模块按照 RFC 3842 的规定，对 notify-subscribe message-summary（消息等待指示）事件进行专门处理。"
sidebar: false
---

## 管理员指南 {#admin-guide}


### 概述 {#overview}


本模块按照 RFC 3842 的规定，对 notify-subscribe message-summary（消息等待指示）事件进行专门处理。它与通用事件处理模块 presence 配合使用，负责构造 message-summary 事件并将其添加到该模块中。


本模块目前未实现任何授权规则。它假定 PUBLISH 请求只由语音信箱应用发出，SUBSCRIBE 请求只由语音信箱的所有者发出。因此，可以很方便地在 OpenSIPS 配置文件中、于调用 handle_publish() 和 handle_subscribe() 函数之前完成授权。


本模块对内容类型 application/simple-message-summary 做简单校验：内容必须以 Messages-Waiting 状态行开头，其后跟零行或多行由制表符和可打印 ASCII 字符组成的行。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


在加载本模块之前，必须先加载以下模块：


- *presence*。


#### 外部库或应用程序 {#external-libraries-or-applications}


无。


### 导出的参数 {#exported-parameters}


无。


### 导出的函数 {#exported-functions}


配置文件中没有需要使用的函数。
<!-- CONTRIBUTORS -->

### 许可 {#license}

本项目的所有文档文件（即 .md 扩展名的文件）均以 Creative Common License 4.0 授权。
