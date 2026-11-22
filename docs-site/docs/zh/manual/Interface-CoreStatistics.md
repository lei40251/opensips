---
outline: [2, 3]
title: "核心统计"
description: "OpenSIPS 核心导出若干统计，并按类别（class）分组。要查看某个类别下的全部统计，可获取 \"class:\" 统计。"
---

**OpenSIPS** 核心导出若干统计，它们被划分为多个 **类别**（class）。要查看某个类别对应的全部统计，可获取 "class:" 统计（例如 **opensips-cli -x mi get_statistics load: core: shmem:**）

---

## "CORE" 类

### rcv_requests
返回 OpenSIPS 收到的请求总数。

通过 MI FIFO 使用的示例
```opensips

opensips-cli -x mi get_statistics rcv_requests

```

从脚本使用的示例
```opensips

xlog("Total number of received requests = $stat(rcv_requests) \n");

```

### rcv_replies
返回 OpenSIPS 收到的应答总数。

通过 MI FIFO 使用的示例
```opensips

opensips-cli -x mi get_statistics rcv_replies

```

从脚本使用的示例
```opensips

xlog("Total number of received replies = $stat(rcv_replies) \n");

```

### fwd_requests
返回 OpenSIPS 无状态转发的请求数量。

通过 MI FIFO 使用的示例
```opensips

opensips-cli -x mi get_statistics fwd_requests

```

从脚本使用的示例
```opensips

xlog("Total number of forwarded requests = $stat(fwd_requests) \n");

```

### fwd_replies
返回 OpenSIPS 无状态转发的应答数量。

通过 MI FIFO 使用的示例
```opensips

opensips-cli -x mi get_statistics fwd_replies

```

从脚本使用的示例
```opensips

xlog("Total number of forwarded replies = $stat(fwd_replies) \n");

```

### drop_requests
返回在进入脚本路由逻辑之前就被丢弃的请求数量。

通过 MI FIFO 使用的示例
```opensips

opensips-cli -x mi get_statistics drop_requests

```

从脚本使用的示例
```opensips

xlog("Total number of dropped requests = $stat(drop_requests) \n");

```

### drop_replies
返回在进入脚本路由逻辑之前就被丢弃的应答数量，或在 onreply_route 中
被显式丢弃的应答数量。

通过 MI FIFO 使用的示例
```opensips

opensips-cli -x mi get_statistics drop_replies

```

从脚本使用的示例
```opensips

xlog("Total number of dropped replies = $stat(drop_replies) \n");

```

### err_requests
返回从 SIP 角度看属于无效的请求数量（例如：找不到 Via 头域）

通过 MI FIFO 使用的示例
```opensips

opensips-cli -x mi get_statistics err_requests

```

从脚本使用的示例
```opensips

xlog("Total number of error requests = $stat(err_requests) \n");

```

### err_replies
返回从 SIP 角度看属于无效的应答数量（例如：找不到 Via 头域）

通过 MI FIFO 使用的示例
```opensips

opensips-cli -x mi get_statistics err_replies

```

从脚本使用的示例
```opensips

xlog("Total number of error replies = $stat(err_replies) \n");

```

### bad_URIs_rcvd
返回 OpenSIPS 解析失败的 URI 数量。

通过 MI FIFO 使用的示例
```opensips

opensips-cli -x mi get_statistics bad_URIs_rcvd

```

从脚本使用的示例
```opensips

xlog("Total number of bad URIs detected = $stat(bad_URIs_rcvd) \n");

```

从脚本使用的示例
```opensips

xlog("Total number of unsupported methods detected = $stat(unsupported_methods) \n");

```

### bad_msg_hdr
返回 OpenSIPS 解析失败的 SIP 头域数量。

通过 MI FIFO 使用的示例
```opensips

opensips-cli -x mi get_statistics bad_msg_hdr

```

从脚本使用的示例
```opensips

xlog("Total number of headers that failed to parse = $stat(bad_msg_hdr) \n");

```

### timestamp
返回自 OpenSIPS 启动以来经过的秒数。

通过 MI FIFO 使用的示例
```opensips

opensips-cli -x mi get_statistics timestamp

```

从脚本使用的示例
```opensips

xlog("OpenSIPS has been alive for $stat(timestamp) seconds \n");

```

---

## "LOAD" 类

这些统计提供 OpenSIPS 内部负载的信息。负载定义为处理所花费时间占总时间的百分比。参照 "top" 的模型，有三个负载值，分别在不同时间段上计算：
* 实时负载 —— 在过去 1 秒内计算
* 最近一分钟负载 —— 在过去 1 分钟内计算
* 最近 10 分钟负载 —— 在过去 10 分钟内计算

这三个负载值都由 OpenSIPS 按进程（每个进程的负载）以及全局（涵盖所有进程）提供。

### load
整个 OpenSIPS 的实时负载 —— 它统计 OpenSIPS 的所有核心进程；模块额外请求的进程不计入该负载。另外注意，有些核心进程也不计入，因为它们不产生任何负载；这类进程是 attendant、time keeper 和 timer trigger。
该统计实际上反映的是处理 SIP 流量所产生的负载（因为只统计核心活跃进程）。

通过 MI FIFO 使用的示例
```opensips

opensips-cli -x mi get_statistics load
load:load:: 24

```

从脚本使用的示例
```opensips

xlog("The OpenSIPS processing load is $stat(load) \n");

```

### load1m
核心 OpenSIPS 的最近一分钟平均负载（仅涵盖核心/SIP 进程）。更多内容参见 [load](#load)。

### load10m
核心 OpenSIPS 的最近 10 分钟平均负载（仅涵盖核心/SIP 进程）。更多内容参见 [load](#load)。

### load-all
整个 OpenSIPS 的实时负载，同时统计核心进程和模块进程。与 [load](#load) 类似，完全不产生负载的进程不计入。

通过 MI FIFO 使用的示例
```opensips

opensips-cli -x mi get_statistics load-all
load:load-all:: 24

```

从脚本使用的示例
```opensips

xlog("The overall OpenSIPS load is $stat(load-all) \n");

```

### load1m-all
整个 OpenSIPS 的最近一分钟平均负载（涵盖所有进程）。更多内容参见 [load-all](#load-all)。

### load10m-all
整个 OpenSIPS 的最近 10 分钟平均负载（涵盖所有进程）。更多内容参见 [load-all](#load-all)。

### load-proc-id
进程 **ID** 的实时负载。要了解 OpenSIPS 进程的 ID（及其类型），可使用 **ps** MI 命令。

通过 MI FIFO 使用的示例
```opensips

opensips-cli -x mi get_statistics load-proc-5
load:load-proc-5:: 79

```

从脚本使用的示例
```opensips

xlog("The load of processes 5 is $stat(load-proc-5) \n");

```

### load1m-proc-id
进程 **ID** 的最近一分钟平均负载。更多内容参见 [load-proc-id](#load-proc-id)。

### load10m-proc-id
进程 **ID** 的最近 10 分钟平均负载。更多内容参见 [load-proc-id](#load-proc-id)。

---

## "NET" 类

这些统计提供 OpenSIPS 所监听接口上 UDP、TCP 和 TLS 缓冲区的信息。

### waiting_udp
返回 OpenSIPS 所监听的 UDP 接口上等待被消费的字节数。

通过 MI FIFO 使用的示例
```opensips

opensips-cli -x mi get_statistics waiting_udp

```

从脚本使用的示例
```opensips

xlog("The UDP waiting buffer size is $stat(waiting_udp) \n");

```

### waiting_tcp
返回 OpenSIPS 所监听的 TCP 接口上等待被消费的字节数。

通过 MI FIFO 使用的示例
```opensips

opensips-cli -x mi get_statistics waiting_tcp

```

从脚本使用的示例
```opensips

xlog("The TCP waiting buffer size is $stat(waiting_tcp) \n");

```

### waiting_tls
返回 OpenSIPS 所监听的 TLS 接口上等待被消费的字节数。

通过 MI FIFO 使用的示例
```opensips

opensips-cli -x mi get_statistics waiting_tls

```

从脚本使用的示例
```opensips

xlog("The TLS waiting buffer size is $stat(waiting_tls) \n");

```

---

## "SHMEM" 类

这些统计提供 OpenSIPS 正在使用的共享内存的信息。

### total_size
返回可用于 OpenSIPS 进程的共享内存总大小。

通过 MI FIFO 使用的示例
```opensips

opensips-cli -x mi get_statistics total_size

```

从脚本使用的示例
```opensips

xlog("Total size of SHMEM available is $stat(total_size) \n");

```

### used_size
返回 OpenSIPS 进程已申请并使用的共享内存量。

通过 MI FIFO 使用的示例
```opensips

opensips-cli -x mi get_statistics used_size

```

从脚本使用的示例
```opensips

xlog("SHMEM in use = $stat(used_size) \n");

```

### real_used_size
返回 OpenSIPS 进程申请的共享内存量 + malloc 开销

通过 MI FIFO 使用的示例
```opensips

opensips-cli -x mi get_statistics real_used_size

```

从脚本使用的示例
```opensips

xlog("Real SHMEM used size is $stat(real_used_size) \n");

```

### max_used_size
返回 OpenSIPS 进程曾使用过的最大共享内存量。

通过 MI FIFO 使用的示例
```opensips

opensips-cli -x mi get_statistics max_used_size

```

从脚本使用的示例
```opensips

xlog("The max SHMEM ever used is $stat(max_used_size) \n");

```

### free_size
返回可用的空闲内存。按 total_size - real_used_size 计算

通过 MI FIFO 使用的示例
```opensips

opensips-cli -x mi get_statistics free_size

```

从脚本使用的示例
```opensips

xlog("Free SHMEM available is $stat(free_size) \n");

```

### fragments
返回共享内存中的碎片总数。

通过 MI FIFO 使用的示例
```opensips

opensips-cli -x mi get_statistics fragments

```

从脚本使用的示例
```opensips

xlog("The total number of SHMEM fragments is $stat(fragments) \n");

```

---

## "PKMEM" 类

与各个 OpenSIPS 进程私有内存相关的多种统计。每个 "PKMEM" 统计都带有一个数字前缀，表示 OpenSIPS 进程的索引（0、1、……）。

### N-total_size
返回 OpenSIPS 进程 #N 可用的私有内存总大小。

通过 MI FIFO 使用的示例
```opensips

opensips-cli -x mi get_statistics 0-total_size

```

从脚本使用的示例
```opensips

xlog("Total size of PKG memory available for process #0 is $stat(0-total_size) \n");

```

### N-used_size
返回 OpenSIPS 进程 #N 已申请并使用的私有内存量。

通过 MI FIFO 使用的示例
```opensips

opensips-cli -x mi get_statistics 0-used_size

```

从脚本使用的示例
```opensips

xlog("PKG mem in use for process #1 = $stat(1-used_size) \n");

```

### N-real_used_size
返回 OpenSIPS 进程 #N 申请的私有内存量，其中包含分配器自身特有的元数据

通过 MI FIFO 使用的示例
```opensips

opensips-cli -x mi get_statistics 0-real_used_size

```

从脚本使用的示例
```opensips

xlog("Process #0 actually uses $stat(0-real_used_size) bytes of private memory\n");

```

### N-max_used_size
返回 OpenSIPS 进程 #N 曾使用过的最大私有内存量。

通过 MI FIFO 使用的示例
```opensips

opensips-cli -x mi get_statistics 0-max_used_size

```

从脚本使用的示例
```opensips

xlog("The max PKG memory ever used for process #0 is $stat(0-max_used_size) \n");

```

### N-free_size
返回 OpenSIPS 进程 #N 可用的空闲私有内存。按 total_size - real_used_size 计算

通过 MI FIFO 使用的示例
```opensips

opensips-cli -x mi get_statistics 0-free_size

```

从脚本使用的示例
```opensips

xlog("Free PKG memory available for process #0 is $stat(0-free_size) \n");

```

### N-fragments
返回 OpenSIPS 进程 #N 私有内存中当前可用的空闲碎片数量。

通过 MI FIFO 使用的示例
```opensips

opensips-cli -x mi get_statistics 0-fragments

```

从脚本使用的示例
```opensips

xlog("The total number of PKG fragments is $stat(0-fragments) \n");

```
