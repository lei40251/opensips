---
title: "tls_openssl 模块"
description: "本模块使用 [openSSL](https://www.openssl.org/) 库实现 TLS 操作。"
sidebar: false
---

## 管理员指南 {#admin-guide}


### 概述 {#overview}


本模块使用 [openSSL](https://www.openssl.org/) 库实现 TLS 操作。它提供 *tls_mgm* 模块所需的基础原语，以便对外暴露供 *proto_tls*、*proto_wss* 等基于 TLS 的协议模块使用的高层 API。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


在加载本模块之前，必须先加载以下模块：


- *无*。


#### 外部库或应用程序 {#external-libraries-or-applications}


OpenSIPS 对 TLS v1.0 的支持需要以下软件包：


- *openssl* 或 *libssl* >= 0.9.6
- *openssl-dev* 或 *libssl-dev*


OpenSIPS 对 TLS v1.1/1.2 的支持需要以下软件包：


- *openssl* 或 *libssl* >= 1.0.1e
- *openssl-dev* 或 *libssl-dev*
<!-- CONTRIBUTORS -->

### 许可 {#license}

本项目的所有文档文件（即 .md 扩展名的文件）均以 Creative Common License 4.0 授权。
