---
title: "Script Helper 模块"
description: "**Script Helper 模块**的用途是在 OpenSIPS 中处理基本场景时简化脚本编写过程。"
sidebar: false
---


## 管理指南 {#admin-guide}


### 概述 {#overview}


**Script Helper 模块**的用途是在 OpenSIPS 中处理基本场景时
简化脚本编写过程。
同时，由于它内含基本的 SIP
路由逻辑，对脚本编写者也很有用，从而让他们能够更专注于
自身 OpenSIPS 路由代码的特定方面。


### 工作原理 {#how-it-works}


只需加载该模块，就会嵌入以下
**默认逻辑**：


- 对于初始 SIP 请求，模块会在运行主请求路由之前执行*记录路由*
- 顺序 SIP 请求将被透明处理——模块会执行
*松散路由*，并且请求路由根本不会运行


目前，该模块还可进一步配置为嵌入以下
**可选逻辑**：


- *dialog* 支持（依赖 dialog 模块——必须在本模块之前加载）
- 在转发顺序请求之前运行的额外路由


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


以下模块必须在本模块之前加载：


- *dialog*（仅在启用 **[use_dialog](#use_dialog-integer)** 时）。


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，必须安装以下库或应用程序：


- *无*。


### 导出的参数 {#exported-parameters}


#### use_dialog (integer) {#use_dialog-integer}


启用 dialog 支持。注意，设置该参数时 dialog 模块必须在本模块
之前加载。


默认值为 0（禁用）


```opensips title="设置 use_dialog"
...
modparam("script_helper", "use_dialog", 1)
...
```


#### create_dialog_flags (string)


创建对话时使用的标志位。有关这些标志位的详细信息，请参阅
dialog 模块的 *create_dialog()* 函数。


默认值为 ""（不设置任何标志位）


```opensips title="设置 create_dialog_flags"
...
modparam("script_helper", "create_dialog_flags", "PpB")
...
```


#### sequential_route (string)


在顺序请求被转发之前运行的可选路由。
如果在该路由内使用 *exit* 脚本语句，
模块将认为转发逻辑已处理完毕。


默认情况下，该参数未设置


```opensips title="设置 sequential_route"
...
modparam("script_helper", "sequential_route", "sequential_handling")
...
route [sequential_handling]
{
...
}
...
```


### 已知问题 {#known-issues}


目前完全不处理 Max-Forwards 头域。
<!-- CONTRIBUTORS -->

### 许可证 {#license}

所有文档文件（即以 .md 为扩展名的文件）均按 Creative Common License 4.0 授权。
