---
title: "db_oracle 模块"
description: "本模块为 OpenSIPS 提供 Oracle 连接能力。"
sidebar: false
---


## 用户指南 {#users-guide}


### 概述 {#overview}


本模块为 OpenSIPS 提供 Oracle 连接能力。它实现了 OpenSIPS 中定义的 DB API。如果要使用 nathelper 模块，或任何调用 usrloc 导出的 get_all_ucontacts API 的其他模块，则需要在编译前在 Makefile.defs 文件中设置 *DORACLE_USRLOC* 宏。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


以下模块必须在本模块之前加载：


- *不依赖其他 OpenSIPS 模块*。


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，必须安装以下库或应用程序：


- *instantclient-sdk-10.2.0.3* - OCI 的开发头文件和库。


### 导出的参数 {#exported-parameters}


#### timeout (fixedpoint)


对数据库进行任何操作的超时值。


可能的值为 0.1 到 10.0 秒。


*默认值为 3.0（3 秒）。*


如果 timeout 参数的值设为 0，模块使用同步模式（无超时）。


```opensips title="设置 timeout 参数"
...
modparam("db_oracle", "timeout", 1.5)
...
```


```opensips title="禁用异步模式"
...
modparam("db_oracle", "timeout", 0)
...
```


#### reconnect (fixedpoint)


连接（创建会话）操作的超时值。


可能的值为 0.1 到 10.0 秒。


*默认值为 0.2（200 毫秒）。*


```opensips title="设置 reconnect 参数"
...
modparam("db_oracle", "reconnect", 0.5)
...
```


### 导出的函数 {#exported-functions}


没有导出可在配置文件中使用的函数。


### 安装 {#installation}


由于依赖外部库，oracle 模块默认不会被编译和安装。可以使用以下选项之一。


- 编辑 "Makefile" 并从 "excluded_modules" 列表中移除 "db_oracle"。然后按照标准流程安装 OpenSIPS："make all; make install"。
- 从命令行使用：'make all include_modules="db_oracle"; make install include_modules="db_oracle"'。


### opensips_orasel 工具 {#utility-opensips_orasel}


为配合 opensips-cli 工具使用，应能够以用户可读的形式将 'query' 结果打印到终端。标准命令行 Oracle 客户端（sqlplus）不太适合此用途，因为它无法将列宽对齐到实际（接收到的）数据（它总是按 db scheme 中描述的宽度打印单元格）。此问题已通过引入 opensips_orasel 工具解决，该工具格式化打印的方式与 'mysql' 客户端工具大致相同。此外，该工具了解 OpenSIPS 中用于与 Oracle 交互的 DB 中"约定与类型"，并在格式化打印时将其考虑在内。
<!-- CONTRIBUTORS -->

### 许可证 {#license}


所有文档文件（即 .md 扩展名）均按 Creative Common License 4.0 许可发布。
