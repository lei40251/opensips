---
title: "统计接口"
description: "统计接口是 OpenSIPS 的一个接口，用于访问 OpenSIPS 内部的各种统计。这些统计提供了关于 OpenSIPS 内部运行情况的有用信息，可被外部应用用于监控、负载评估以及与其他服务的实时集成。"
---

**统计接口（Statistics Interface）** 是 OpenSIPS 的一个接口，用于访问 OpenSIPS 内部的各种统计。统计提供了关于 OpenSIPS 内部正在发生情况的有用信息——可用于外部应用、监控目的、负载评估、与其他服务的实时集成。统计变量的值全部为数值。

---

## 概述

**OpenSIPS** 通常提供两类统计变量：
* 计数型（counter like）—— 持续累计 OpenSIPS 中已发生事件的变量，例如收到的请求、已处理的对话、失败的数据库查询等
* 计算值（computed values）—— 实时计算出的变量，例如已使用多少内存、当前负载、活跃对话、活跃事务等

统计变量不跨重启持久化，它们都从 0 值开始（指计数型变量）。*计数型* 统计也可以在 OpenSIPS 运行期间被重置（为 0 值）。

在 OpenSIPS 中，统计变量按用途或提供方划分为不同的分组（set）。例如，OpenSIPS 核心提供 **shmem**、**load**、**net** 等分组，而每个 OpenSIPS 模块提供自己的分组（通常分组名与模块名相同）。

所有可用的统计变量都已被列出并记录：由 [OpenSIPS 核心](Interface-CoreStatistics.md) 提供的统计，或由 [OpenSIPS 模块](Modules.md) 提供的统计（参见各模块的 Statistics 章节）。

---

## 用法

要访问统计，必须使用 [MI 接口](Interface-MI.md)，它（直接由 OpenSIPS 核心）提供了若干 MI 函数用于：  
\
**获取某个统计变量、整个分组变量或全部变量** 的值。此处可使用 MI 的 [get_statistics](Interface-CoreMI.md) 命令：
```bash

   # 按名称获取一个统计变量
   > opensipsctl fifo get_statistics rcv_requests
   > core:rcv_requests = 3428
   > opensipsctl fifo get_statistics real_used_size 
   > shmem:real_used_size = 2951864

   # 按名称列表获取多个统计变量
   > opensipsctl fifo get_statistics rcv_requests inuse_transactions
   > core:rcv_requests = 453
   > tm:inuse_transactions = 10

   # 获取某个分组的全部统计
   > opensipsctl fifo get_statistics shmem:
   > shmem:total_size = 33554432
   > shmem:used_size = 2897024
   > shmem:real_used_size = 2951864
   > shmem:max_used_size = 2952304
   > shmem:free_size = 30602568
   > shmem:fragments = 26

   # 获取 OpenSIPS 的全部统计
   > opensipsctl fifo get_statistics all
   >...........

```
  

**重置统计变量的值**（设为 0 值），但仅当其是计数型变量时才有效。

> [!IMPORTANT]
> 重置计算值类型的统计将被忽略，不会产生任何效果。

此处可使用 MI 的 [reset_statistics](Interface-CoreMI.md) 命令：

```bash

   # 按名称重置一个统计变量
   > opensipsctl fifo reset_statistics rcv_requests

```
