---
title: "核心事件"
description: "事件由 OpenSIPS 核心通过事件接口导出。"
---

事件由 **OpenSIPS** 核心通过事件接口导出。

---

## E_CORE_THRESHOLD

超过阈值限制。

当某个特定操作耗时超过特定阈值时，会触发此事件。例如 MySQL 或 DNS 查询耗时过长，或 SIP 消息处理超出特定限制时，都可能触发该事件。更多信息请参见[此](http://lists.opensips.org/pipermail/users/2011-February/016918.html)帖子。

参数：
* **source**：事件的来源：mysql 模块、core（用于 DNS 或消息处理告警）。
* **time**：该操作所花费的时间（以微秒为单位）
* **extra**：额外信息，取决于事件的来源

## E_CORE_PKG_THRESHOLD

超过私有内存阈值。

当私有内存使用量超过由核心参数 **event_pkg_threshold** 指定的阈值限制时，会触发此事件。它向外部应用告警空闲私有内存偏低。

参数：
* **usage**：私有内存使用百分比。取值介于 **event_pkg_threshold** 与 100 之间。
* **threshold**：在脚本中指定的 **event_pkg_threshold**。
* **used**：已使用的私有内存量。
* **size**：私有内存总量。
* **pid**：触发该事件的进程的 pid。

> [!NOTE]
> 如果未指定 event_pkg_threshold 或其为 0，则此事件处于禁用状态。

## E_CORE_SHM_THRESHOLD

超过共享内存阈值。

当共享内存使用量超过由核心参数 **event_shm_threshold** 指定的阈值限制时，会触发此事件。它向外部应用告警空闲共享内存偏低。

参数：
* **usage**：共享内存使用百分比。取值介于 **event_shm_threshold** 与 100 之间。
* **threshold**：在脚本中指定的 **event_shm_threshold**。
* **used**：已使用的共享内存量。
* **size**：共享内存总量。

> [!NOTE]
> 如果未指定 event_shm_threshold 或其为 0，则此事件处于禁用状态。

## E_CORE_PROC_AUTO_SCALE

进程自动伸缩（扩容与缩容）。

每当因自动伸缩逻辑而创建（fork）新进程或终止进程时，会触发此事件。要触发此事件，必须在配置中启用 [auto-scaling](./Script-CoreParameters.md#auto_scaling_profile)。

参数：
* **group_type**：伸缩组的类型／名称（UDP/TCP/TIMER）。
* **group_filter**：伸缩组的过滤器（通常是 UDP 的套接字／接口）。
* **group_load**：伸缩组上的负载。
* **scale**："up" 或 "down"
* **process_id**：被伸缩（扩容或缩容）进程的进程 ID（OpenSIPS 层面）。
* **pid**：被伸缩（扩容或缩容）进程的 PID（操作系统层面）。

## E_CORE_TCP_DISCONNECT

TCP 连接断开。

当一条 TCP 连接被终止／断开时，会触发此事件。

参数：
* **src_ip**：TCP 连接的源 IP
* **src_port**：TCP 连接的源端口
* **dst_ip**：TCP 连接的目的 IP
* **dst_port**：TCP 连接的目的端口
* **proto**：底层 TCP 连接的协议（即 tcp、tls、ws、wss 等）

## E_CORE_SR_STATUS_CHANGED

状态／报告状态变化。

当某个 SR 标识符的状态发生变化时，会触发此事件。

参数：
* **group**：SR 组的名称
* **identifier**：SR 标识符的名称
* **status**：SR 标识符的新状态（以数值表示）
* **details**：附加到新状态的详细信息／文本
* **old_status**：SR 标识符的旧状态（以数值表示）

## E_CORE_LOG

产生日志消息。

每当 OpenSIPS 产生一条日志消息时，会触发此事件。要触发此事件，必须在配置中启用 [log_event_enabled](./Script-CoreParameters.md#log_event_enabled)。

参数：
* **time**：日志消息产生的时间
* **pid**：产生该日志消息的进程的 PID
* **level**：该消息的日志级别（"DBG"、"INFO" 等）
* **module**：产生该日志消息的模块；对于由 **xlog()** 函数从脚本触发的日志，该参数不存在
* **function**：产生该日志消息的内部函数；对于由 **xlog()** 函数从脚本触发的日志，该参数不存在
* **prefix**：日志前缀，通过 [log_prefix](./Script-CoreParameters.md#log_prefix) 参数配置。若未配置该参数，则此参数不存在。
* **message**：实际的日志消息内容
