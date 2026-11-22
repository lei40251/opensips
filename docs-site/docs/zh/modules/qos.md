---
title: "QOS 模块"
description: "qos 模块提供了一种按对话跟踪 SDP 会话的方法。"
---

## 管理指南 {#admin-guide}


### 概述 {#overview}


qos 模块提供了一种按对话跟踪
SDP 会话的方法。


### 工作原理 {#how-it-works}


qos 模块借助 dialog 模块获得新对话或对话更新的通知。
随后，它会从 SIP 请求和应答中查找并提取
SDP 会话（如果存在），并在对话的整个生命周期内对其进行跟踪。


这一切的前提是正确配置 dialog
和 qos 模块，并在看到任意 INVITE sip 消息时设置 dialog 标志位和 qos 标志位。
设置 SDP 会话跟踪机制不需要调用任何
配置脚本函数。更多信息请参阅 dialog 模块用户指南。


一个对话可以有一个或多个处于以下状态的
活跃 SDP 会话：


- *pending* - 只知道
SDP 会话的一端。
- *negotiated* - SDP 会话的
两端均已知。


SDP 会话可以通过以下场景之一
建立：


- *INVITE/200ok* - 典型的 "INVITE" 和
"200 OK" SDP 交换。
- *200ok/ACK* - "200 OK" 和 "ACK" 的 SDP
交换（针对以空 INVITE 发起的呼叫）。
- *183/PRACK* - 通过 "183 Session
Progress" 和 "PRACK" 实现的早期媒体（更多信息见 rfc3959）
- 尚未实现。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


在使用本模块之前必须加载
以下模块：


- *dialog* - dialog 模块
及其依赖（tm）。


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，必须安装
以下库或应用程序：


- *无*。


### 导出的参数 {#exported-parameters}


#### qos_flag (string)


遵循 OpenSIPS 的一贯做法，除非通过配置脚本指示，
本模块不会对任何消息做任何处理。必须在希望
qos 模块处理的 INVITE 的 setflag() 调用中
设置 qos_flag 值。但在这样做之前，需要
先告诉 qos 模块你为 qos 分配的是
哪个标志位值。


在大多数情况下，每当通过 create_dialog() 函数创建新对话时，
都会希望设置 qos 标志位。
如果未调用 create_dialog() 而设置了 qos 标志位，
则不会产生任何效果。


必须设置该参数，否则模块将
无法加载。


*默认值为 "Not set!"。*


```opensips title="设置 qos_flag 参数"
...
modparam("qos", "qos_flag", "QOS_FLAG")
...
route {
  ...
  if ($rm=="INVITE") {
    setflag(QOS_FLAG); # 设置 qos 标志位
	create_dialog(); # 创建对话
  }
  ...
}
```


### 导出的函数 {#exported-functions}


没有可在脚本中使用的导出函数。


### 导出的统计 {#exported-statistics}


qos 模块没有导出的统计项。


### 导出的 MI 函数 {#exported-mi-functions}


qos 模块没有导出的 MI 函数。
请查看 dialog 的 MI 函数，了解检查对话内部信息的方法。


### 导出的伪变量 {#exported-pseudo-variables}


qos 模块没有导出的伪变量。


### 安装与运行 {#installation-and-running}


只需加载模块，并记得设置标志位。


## 开发者指南 {#developer-guide}


### 可用函数 {#available-functions}


#### register_qoscb (qos, type, cb, param)


向 qos 注册新的回调。


参数含义如下：


- *struct qos_ctx_st* qos* - 要注册回调的
qos。它可能为 NULL，仅适用于 QOSCB_CREATED 回调
类型，该类型不是按 qos 划分的类型。
- *int type* - 回调类型；同一个回调函数
可以注册更多类型；只有
QOSCB_CREATED 必须单独注册。可能的类型：
	- *QOSCB_CREATED* - 在创建新的
	qos 上下文时调用 - 它是全局类型（不与
	任何 qos 关联）。
	- *QOSCB_ADD_SDP* - 在向 qos 上下文
	添加新 SDP 时调用 - 它是按 qos 划分的类型。
	- *QOSCB_UPDATE_SDP* - 在更新
	已有 SDP 时调用 - 它是按 qos 划分的类型。
	- *QOSCB_REMOVE_SDP* - 在删除
	已有 SDP 时调用 - 它是按 qos 划分的类型。
	- *QOSCB_TERMINATED* - 在
	qos 终止时调用。
- *qos_cb cb* - 要调用的回调函数。
原型为："void (qos_cb) 
(struct qos_ctx_st *qos, int type, struct qos_cb_params *params);
"
- *void *param* - 传递给
回调函数的参数。
<!-- CONTRIBUTORS -->

### 许可证 {#license}

所有文档文件（即以 .md 为扩展名的文件）均按 Creative Common License 4.0 许可发布
