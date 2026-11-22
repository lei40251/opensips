---
title: "SIP 会话定时器模块"
description: "sst 模块提供了一种依据 SIP INVITE/200 OK 中 Session-Expires 头域值来更新对话过期定时器的方式。"
sidebar: false
---


## 管理指南 {#admin-guide}


### 概述 {#overview}


sst 模块提供了一种依据 SIP INVITE/200 OK 中
Session-Expires 头域值来更新对话过期定时器的方式。可以在
OpenSIPS 代理中使用 sst 模块，以释放已死亡（过期）呼叫所占用的
本地资源。


还可以用 sst 模块校验 MIN_SE 头域值：若该值对当前 OpenSIPS
配置而言过小，则以 "422 - Session Timer Too Small" 应答
任何请求。


### 工作原理 {#how-it-works}


sst 模块借助 dialog 模块获知任何新建或更新的对话。随后它会
查找并提取 session-expire: 头域值（如果存在），并覆盖
当前上下文对话的对话过期定时器值。


为希望建立定时会话的任意呼叫建立 INVITE 设置标志位。这样，
即使 UAC 未请求使用会话定时器，OpenSIPS 也会请求使用。


这一切都发生在 dialog 与 sst 模块配置正确、且在收到任何 INVITE
sip 消息时设置了对话标志位与 sst 标志位的前提下。设置对话过期
超时值不需要任何 opensips.cfg 脚本函数调用。更多信息参见
dialog 模块用户指南。


sstCheckMin() 脚本函数可用于校验 Session-Expires / MIN-SE
头域值对代理而言是否过小。若 SST min_se 参数值小于
消息的 Session-Expires / MIN-SE 值，测试将返回 true。
也可以配置该函数代为发送 422 响应。


以下内容取自 RFC，作为呼叫流程示例：


```c title="Session timer call flow"
+-------+    +-------+       +-------+
| UAC-1 |    | PROXY |       | UAC-2 |
+-------+    +-------+       +-------+
    |(1) INVITE  |               |
    |SE: 50      |               |
    |----------->|               |
    |            |(2)sstCheckMin |
    |            |-----+         |
    |            |     |         |
    |            |<----+         |
    |(3) 422     |               |
    |MSE:1800    |               |
    |<-----------|               |
    |            |               |
    |(4)ACK      |               |
    |----------->|               |
    |            |               |
    |(5) INVITE  |               |
    |SE: 1800    |               |
    |MSE: 1800   |               |
    |----------->|               |
    |            |(6)sstCheckMin |
    |            |-----+         |
    |            |     |         |
    |            |<----+         |
    |            |(7)setflag     |
    |            |create dialog  |
    |            |Set expire     |
    |            |-----+         |
    |            |     |         |
    |            |<----+         |
    |            |               |
    |            |(8)INVITE      |
    |            |SE: 1800       |
    |            |MSE: 1800      |
    |            |-------------->|
    |            |               |
 ...
     			
```


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


以下模块必须先于本模块加载：


- *dialog* —— dialog 模块及其依赖。（tm）
- *sl* —— 无状态模块。


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，必须安装以下库或应用程序：


- *无*。


### 导出的参数 {#exported-parameters}


#### enable_stats (integer)


是否启用统计支持。通过统计变量，
模块提供对话处理的相关信息。设置为 0
表示禁用，设置为非 0 表示启用。


*默认值为 "1"（启用）。*


```opensips title="Set enable_stats parameter"
...
modparam("sst", "enable_stats", 0)
...
```


#### min_se (integer)


该值用于设置代理的 MIN-SE 值，并在 sstCheckMin() 的标志位
设为 true 且检查失败时，作为代理的 MIN-SE: 头域值
用于 422 应答。


若未设置，而调用 sstCheckMin() 时把
发送应答标志位设为 true，则使用默认的 1800 秒
作为比较值，并在发送 422 应答时作为 MIN-SE:
头域值。


*默认值为 "1800" 秒。*


```opensips title="Set min_se parameter"
...
modparam("sst", "min_se", 2400)
...
```


#### sst_interval (integer)


当 OpenSIPS 请求使用会话定时器时，Session-Expires 头域中的
sst 最小间隔。实际使用的值将是 OpenSIPS minSE、UAS minSE
与该值三者中的最大值。


默认情况下，所使用的间隔为 min_se 值


*默认值为 "0" 秒。*


```opensips title="Set sst_interval parameter"
...
modparam("sst", "sst_interval", 2400)
...
```


#### reject_to_small (integer)


在初始 INVITE 中，若 UAC 请求了
Session-Expire: 且其值小于
本地策略的 Min-SE（见上文 min_se），则
代理有权通过以 422 Session Timer Too Small
应答该消息并说明本地 Min-SE: 值来拒绝该呼叫。
该 INVITE 不会被继续转发通过代理。


该标志位为 true 时，会指示 SST 模块
以 422 响应拒绝该 INVITE。为 false 时，
INVITE 不做任何修改地转发通过代理。


*默认值为 "1"（true/on）。*


```opensips title="Set reject_to_small parameter"
...
modparam("sst", "reject_to_small", 0)
...
```


#### sst_flag (string)


依照 OpenSIPS 的惯例，除非通过
opensips.cfg 脚本指示，模块不会对任何消息
做任何处理。必须在希望由 sst 模块
处理的 INVITE 的 setflag() 调用中设置 sst_flag
值。但在此之前，需要先
告诉 sst 模块你为 sst 分配的是哪个标志位值。


多数情况下，每当你通过 create_dialog() 函数创建新对话时，
都会希望设置 sst 标志位。
若未调用 create_dialog() 而设置了 sst 标志位，
则不会产生任何效果。


必须设置该参数，否则模块不会加载。


*默认值为 "Not set!"。*


```opensips title="Set sst_flag parameter"
...
modparam("sst", "sst_flag", "SST_FLAG")
...
route {
  ...
  if ($rm=="INVITE") {
    setflag(SST_FLAG); # 设置 sst 标志位
    create_dialog(); # 然后创建对话
  }
  ...
}
```


### 导出的函数 {#exported-functions}


#### sstCheckMin(send_reply_flag)


将当前的 Session-Expires / MIN-SE 值与
sst_min_se 参数值进行比较。若
Session-Expires 或 MIN_SE 头域值小于
模块的最小值，本函数将返回
true。


若调用该函数时
send_reply_flag 设为 true（1），且所请求的
Session-Expires / MIN-SE 值过小，则会
代为发送 422 应答。该 422 将携带一个
MIN-SE: 头域，其值为 sst min_se 参数值。


各参数含义如下：


- *min_allowed*（int，可选）—— 用于与
MIN_SE 头域值比较的值。


```opensips title="sstCheckMin usage"
...
modparam("sst", "sst_flag", "SST_FLAG")
modparam("sst", "min_se", 2400) # 必须 >= 90
...

route {
  if ($rm=="INVITE") {
	if (sstCheckMin(1)) {
		xlog("L_ERR", "422 Session Timer Too Small reply sent.\n");
		exit;
	}
	# 通过 dialog 模块跟踪会话定时器
	setflag(SST_FLAG);
	create_dialog();
  }
}

...
```


### 导出的统计 {#exported-statistics}


#### expired_sst


会话定时器已过期的对话数量。
<!-- CONTRIBUTORS -->

### 许可证 {#license}

本项目的所有文档文件（即 .md 扩展名的文件）均以 Creative Common License 4.0 授权。
