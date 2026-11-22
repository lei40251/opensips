---
title: "状态/报告接口"
description: "状态/报告（Status/Report，简称 SR）是 OpenSIPS 的一个框架，允许 OpenSIPS 的不同组件（如模块、核心的各个部分）发布其状态（就绪程度）以及与自身活动相关的报告（日志）。"
---

**状态/报告**（Status/Report，简称 **SR**）是 OpenSIPS 的一个框架，允许 OpenSIPS 的不同组件（如模块、核心的各个部分）发布其状态（就绪程度）以及与自身活动相关的报告（日志）。  

该框架用于运维活动：在启动时检查 OpenSIPS 的就绪情况，在运行时监控其状态，并通过日志/报告追溯其运行过程。

## 概述

**状态/报告** 框架中的基础元素是 *标识符*（identifier）—— 状态和若干报告可以挂接到某个标识符上。所有标识符都存在于某个 **状态/报告** 分组之内。因此，分组是一组标识符 —— 一个模块或核心都可以是这样的分组。例如，*drouting* 模块发布 *drouting* 分组，其中每个路由分区就是一个 *标识符*。   

由于存在分组（模块）不需要多个标识符的情况，因此有一个默认的 *main* 标识符 —— 这样的标识符可以仅通过分组名来引用。

挂接到标识符上的信息包括：
* **status** 为整型值，表示该标识符是否已就绪可用；严格负值表示未就绪，严格正值表示已就绪；不接受零值。
* **status details** 是状态的可选文本，提供一些便于人阅读的（或更详细的）当前状态信息。
* **reports** 是一个固定大小的数组（实际上是一个丢弃最旧记录的队列），保存该标识符产生的日志。每条报告/日志在产生时还带有时间戳。

大多数情况下，标识符的状态和报告由 OpenSIPS 代码内部产生 —— **状态/报告** 接口只是让外部能够访问这些状态/报告信息，用于监控目的。

---

## 脚本函数

SR 接口提供一个脚本函数，用于检查某个标识符（或整个分组）的就绪状态，参见 [sr_check_status( group, \[identifier\])](./Script-CoreFunctions.md#sr-check-status-group-identifier) 函数。

---

## MI 函数

SR 接口提供多个函数，用于检查/列出单个或多个标识符的状态，以及列出它们的报告：
* [sr_get_status](./Interface-CoreMI.md#sr-get-status)
* [sr_list_status](./Interface-CoreMI.md#sr-list-status)
* [sr_list_reports](./Interface-CoreMI.md#sr-list-reports)
* [sr_list_identifiers](./Interface-CoreMI.md#sr-list-identifiers)

---

## 事件

每当某个状态/报告标识符的状态发生变化时，SR 框架都会触发一个事件。更多细节参见 [E_CORE_SR_STATUS_CHANGED 事件](./Interface-CoreEvents.md#e-core-sr-status-changed)。

---

## 核心标识符

OpenSIPS 核心提供 **core** 分组，其中包含一个 "main"（默认）标识符。可用的状态有：
* STATE_NONE (-100) —— OpenSIPS 刚刚启动
* STATE_TERMINATING (-2) —— OpenSIPS 正处于关闭流程
* STATE_INITIALIZING (-1) —— OpenSIPS 正处于启动流程
* STATE_RUNNING (1) —— OpenSIPS 已完全启动并运行

此外还暴露 **auto-scaling** 分组（若启用了自动伸缩特性），其中每个自动伸缩分组都是一个状态/报告标识符。每个标识符都会收到针对该自动伸缩分组中进程的分叉或回收的报告。

---

## 模块标识符

OpenSIPS 模块可能提供、也可能不提供自己的分组和标识符。为此需要查阅该模块的文档。

---

## 脚本标识符

[status_report](/zh/modules/status_report) 允许在脚本层面创建自定义的 SR 标识符。更进一步，还可以从脚本为这类自定义标识符设置状态或发布报告。
