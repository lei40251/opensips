---
title: "OpenSIPS 3.6 开发与运维手册"
description: "OpenSIPS 核心开发、配置语法、路由逻辑及接口使用指南"
---

# OpenSIPS 3.6 核心手册

本手册涵盖 OpenSIPS 核心架构、安装部署、路由脚本编写以及管理与监控接口的完整使用说明。

---

### 📦 安装与部署 (Installation)
* [下载 OpenSIPS 源码与发行包](Install-Download.md)
* [编译与安装指南](Install-CompileAndInstall.md)
* [数据库部署配置](Install-DBDeployment.md)
* [数据库表结构 (Schema) 详解](Install-DBSchema.md)

### ⚙️ 系统配置 (Configuring)
* [配置文件 (opensips.cfg) 架构与加载流程](Configure-File.md)
* [使用 menuconfig 自动生成配置文件](Generating-Configs.md)
* [基于模板动态生成配置文件](Templating-Config-Files.md)

### 💻 脚本开发与路由逻辑 (OpenSIPS Scripting)
* [脚本基础语法与结构](Script-Syntax.md)
* [全局核心参数 (Core Parameters)](Script-CoreParameters.md)
* [各类路由块 (Routes: request, reply, failure, onreply 等)](Script-Routes.md)
* [表达式与运算符规范](Script-Operators.md)
* [控制流语句 (if/switch/while)](Script-Statements.md)
* [核心内置函数 (Core Functions)](Script-CoreFunctions.md)
* [核心伪变量 (Core Variables / Pseudo-Variables)](Script-CoreVar.md)
* [消息标志位体系 (Scripting Flags)](Script-Flags.md)
* [数据变换器 (Transformations)](Script-Tran.md)
* [异步处理与挂起唤醒机制 (Async)](Script-Async.md)
* [模块文档总索引 (Modules Documentation)](Modules.md)

### 🔌 管理与交互接口 (OpenSIPS Interfaces)
* [MI (Management Interface) 管理接口概览](Interface-MI.md)
* [核心 MI 命令清单](Interface-CoreMI.md)
* [事件通知接口 (Event Interface)](Interface-Events.md)
* [核心系统事件 (Core Events)](Interface-CoreEvents.md)
* [性能与统计指标接口 (Statistics Interface)](Interface-Statistics.md)
* [核心内置统计项](Interface-CoreStatistics.md)
* [状态报告与健康检查接口 (Status/Report Interface)](Interface-StatusReport.md)
* [集群节点内部通信接口 (Binary Interface)](Interface-Binary.md)

### 🧪 测试与质量保证 (OpenSIPS Testing)
* [自动化一致性测试套件 (Conformance Tests)](Conformance-Tests.md)
