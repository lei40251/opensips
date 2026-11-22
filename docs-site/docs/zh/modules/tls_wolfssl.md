---
title: "tls_wolfssl 模块"
description: "本模块使用 [wolfSSL](https://www.wolfssl.com/) 库实现 TLS 操作。"
sidebar: false
---

## 管理员指南 {#admin-guide}


### 概述 {#overview}


本模块使用 [wolfSSL](https://www.wolfssl.com/) 库实现 TLS 操作。它提供 *tls_mgm* 模块所需的基础原语，以便对外暴露供 *proto_tls*、*proto_wss* 等基于 TLS 的协议模块使用的高层 API。


*wolfSSL* 库以静态方式链接，并随本模块一起打包，因此无需安装，也不存在外部依赖。


### 依赖 {#dependencies}


#### 编译 {#compilation}


编译本模块之前，必须安装以下软件包：


- *autoconf*。
- *automake*。
- *libtool*。


#### OpenSIPS 模块 {#opensips-modules}


在加载本模块之前，必须先加载以下模块：


- *无*。


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，必须安装以下库或应用程序：


- *无*。


## 常见问题 {#frequently-asked-questions}


**问：编译本模块时为什么会遇到以下错误？**


如果通过从 Github 克隆仓库的方式获取 OpenSIPS 源码，却没有为 *git clone* 命令使用 *--recursive* 选项，那么就没有正确拉取 *wolfSSL* 库代码，该库以 git 子模块的形式引入，指向官方的 *wolfSSL* 仓库。


要拉取 *wolfSSL* 库代码，可以运行：


```bash
git submodule update --init
```
<!-- CONTRIBUTORS -->

### 许可 {#license}

本项目的所有文档文件（即 .md 扩展名的文件）均以 Creative Common License 4.0 授权。
