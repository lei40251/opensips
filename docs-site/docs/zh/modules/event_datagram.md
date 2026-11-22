---
title: "event_datagram 模块"
description: "该模块为事件接口提供了 UNIX/UDP SOCKET 传输层实现。"
sidebar: false
---


## 管理指南 {#admin-guide}


### 概述 {#overview}


本模块为事件接口（Event Interface）提供了 UNIX/UDP SOCKET 传输层
实现。


### DATAGRAM 事件语法 {#datagram-events-syntax}


事件载荷被格式化为 JSON-RPC 通知，其中事件名作为 *method* 字段，
事件参数作为 *params* 字段。


### DATAGRAM 套接字语法 {#datagram-socket-syntax}


本模块根据套接字类型使用两类套接字。UNIX 套接字应遵循以下语法：
*['unix:'] unix_socket_path*


UDP 套接字应遵循以下语法：
*'udp:' address ':' port*


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


在加载本模块之前必须加载以下模块：


- *不依赖其他 OpenSIPS 模块*。


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，必须安装以下库或应用程序：


- *无*


### 导出的参数 {#exported-parameters}


本模块不导出任何参数。


### 导出的函数 {#exported-functions}


不导出可在配置文件中使用的函数。


### 示例 {#example}


以下是 pike 模块在判定某个 ip 应被阻止时触发的事件示例：


```c title="E_PIKE_BLOCKED event"
{
  "jsonrpc": "2.0",
  "method": "E_PIKE_BLOCKED",
  "params": {
    "ip": "192.168.2.11"
  }
}
```


```c title="UNIX socket"
unix:/tmp/opensips_event.sock
```


```c title="UDP socket"
udp:127.0.0.1:8081
```


## 常见问题 {#frequently-asked-questions}


**问：UNIX 和 UDP 两种类型的套接字都可以用于通知事件吗？**


可以，两种类型都可以使用。


**问：数据报事件的最大长度是多少？**


数据报事件的最大长度为 65457 字节。


**问：在哪里可以找到更多关于 OpenSIPS 的信息？**


请查看 [https://opensips.org/](https://opensips.org/)。


**问：在哪里可以提出关于本模块的问题？**


首先请检查你的问题是否已在我们的某个邮件列表中得到了回答：

关于任何稳定版 OpenSIPS 的邮件应发送至
users@lists.opensips.org，关于开发版本的邮件
应发送至 devel@lists.opensips.org。

如果希望邮件保持私密，请发送至
users@lists.opensips.org。


**问：如何报告缺陷？**


请遵循以下地址提供的指南：
[https://github.com/OpenSIPS/opensips/issues](https://github.com/OpenSIPS/opensips/issues)。
<!-- CONTRIBUTORS -->

### 许可证 {#license}

所有文档文件（即 .md 扩展名）均依据 Creative Common License 4.0 授权
