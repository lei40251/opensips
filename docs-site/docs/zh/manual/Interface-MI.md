---
title: "管理接口"
description: "管理接口（MI）是 OpenSIPS 的一个接口，允许外部应用触发 OpenSIPS 内部的预定义命令。"
---

**管理接口**（或 **MI**）是 OpenSIPS 的一个接口，允许外部应用触发 OpenSIPS 内部的预定义命令。

## 概述

此类命令通常允许外部应用：
* 向 OpenSIPS 推送数据（如设置调试级别、注册联系人等）
* 从 OpenSIPS 获取数据（查看已注册用户、查看进行中的呼叫、获取统计等）
* 触发 OpenSIPS 内部的动作（重新加载数据、发送消息等）

**MI** 命令由 OpenSIPS 核心提供（参见[完整列表](Interface-CoreMI.md)），同时也由各模块提供（查看[每个模块](Modules.md)所提供的命令）。

---

## 协议

从外部应用连接 OpenSIPS **MI** 可用的协议是基于多种传输层的 JSON-RPC 以及 XML-RPC。接口本身（围绕 JSON 格式设计）由 OpenSIPS 核心提供，而每一种实际的传输协议都由单独的 OpenSIPS 模块提供。可以加载多个 MI 模块，以便同时使用多种 MI 传输协议。

大多数 MI 后端模块只提供传输，命令解析与响应格式化（作为 **JSON-RPC**）由 OpenSIPS 核心完成。唯一的例外是 *mi_html* 与 *mi_xmlrpc_ng* 模块，它们使用不同的格式。

可用的 MI 模块有：

### [mi_fifo](/zh/modules/mi_fifo)
为管理接口提供 FIFO 传输层。

### [mi_datagram](/zh/modules/mi_datagram)
为管理接口提供 UNIX 与 UDP 套接字传输层。

### [mi_http](/zh/modules/mi_http)
为管理接口提供 HTTP 传输层。

### [mi_html](/zh/modules/mi_html)
为管理接口提供一个最小化的 Web 用户界面。

### [mi_xmlrpc_ng](/zh/modules/mi_xmlrpc_ng)
实现一个 XML-RPC 服务器，处理 XML-RPC 请求并生成 XML-RPC 响应。

### [mi_script](/zh/modules/mi_script)
直接从 OpenSIPS 脚本运行管理接口命令并返回其 JSON 结果。

所有协议都允许多个应用（客户端）同时连接到 MI 接口。

---

## 示例

以下是几个针对 OpenSIPS 的 JSON-RPC 调用示例：

```bash

# 无参数的请求：
{
  "jsonrpc": "2.0",
  "method": "ps",
  "id": 10
}

# 响应：
{
  "jsonrpc":  "2.0",
  "result": {
    "Processes":  [{
        "ID": 0,
        "PID":  9467,
        "Type": "attendant"
      }, {
        "ID": 1,
        "PID":  9468,
        "Type": "HTTPD 127.0.0.1:8008"
      }, {
        "ID": 3,
        "PID":  9470,
        "Type": "time_keeper"
      }, {
        "ID": 4,
        "PID":  9471,
        "Type": "timer"
      }, {
        "ID": 5,
        "PID":  9472,
        "Type": "SIP receiver udp:127.0.0.1:5060 "
      }, {
        "ID": 7,
        "PID":  9483,
        "Type": "Timer handler"
      }, ]
  },
  "id": 10
}

# 带位置参数的请求：
{
  "jsonrpc": "2.0",
  "method": "log_level",
  "params": [4, 9472],
  "id": 11
}

# 带命名参数的请求：
{
  "jsonrpc": "2.0",
  "method": "log_level",
  "params": {
    "level": 4,
    "pid": 9472
  },
  "id": 11
}

# 带数组类型参数的请求：
{
  "jsonrpc": "2.0",
  "method": "get_statistics",
  "params": {
    "statistics": ["shmem:", "core:"]
  },
  "id": 11
}

```

通过 MI 接口与 OpenSIPS 交互的一个简单示例是 **opensips-cli** 工具 —— 它使用 FIFO 将 MI 命令推送给 OpenSIPS：

```bash

    opensips-cli -x mi ps
    opensips-cli -x mi log_level 4 9472

```

使用 *curl* 从命令行发送 JSON-RPC 形式的 OpenSIPS MI 命令的示例：
```bash

$ curl -X POST localhost:8888/mi -H 'Content-Type: application/json' -d '{"jsonrpc": "2.0", "id": "1", "method": "ps"}'

```
