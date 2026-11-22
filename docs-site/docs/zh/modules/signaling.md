---
title: "signaling 模块"
description: "SIGNALING 模块是对 tm 与 sl 模块的封装，提供一个供希望发送应答的模块调用的函数。"
---


## 管理指南 {#admin-guide}


### 概述 {#overview}


SIGNALING 模块是对 tm 和 sl 模块的封装，提供一个供希望发送应答的模块调用的函数。


该模块的逻辑是：先检查是否已创建事务，若已创建，则使用 tm 模块发送有状态应答；否则使用 sl 导出的函数发送无状态应答。这样，脚本编写者仍然可以决定事务应如何处理——有状态还是无状态——应答也会按其选择相应发送。


例如，如果在脚本中先执行 t_newtran() 再执行 save()（用于注册），由于事务已存在，该函数会自动以有状态方式发送应答。若未创建事务，则应答将以无状态方式发送（与目前行为一致）。


这样，同一个模块既可以发送有状态应答也可以发送无状态应答，只需在脚本中控制（是否创建事务）即可。因此，信令会更加一致，因为应答将根据事务是否存在来发送。


此外，该模块支持只加载 sl 或 tm 中的一个模块，并且只使用已加载的模块发送应答。这很有用，因为并非所有情况下用户都希望发送有状态或无状态应答，不应仅仅因为发送应答的接口有所要求就被迫加载某个模块。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


在使用本模块之前，必须至少加载以下模块之一：


- *sl*。
- *tm*。


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，必须安装以下库或应用程序：


- *无*。


### 导出的参数 {#exported-parameters}


- *无*。


### 导出的函数 {#exported-functions}


#### send_reply(code, reason) {#send_replycode-reason}


针对当前请求，回送带有给定状态码和文本原因的应答。如上所述，应答是以无状态还是有状态方式发送，取决于加载了哪个模块以及是否创建了事务。


参数含义如下：


- *code (int)* - 返回码。
- *reason (string)* - 原因短语。


该函数可在 REQUEST_ROUTE、ERROR_ROUTE 中使用。


```opensips title="sl_send_reply 用法"
...
send_reply(404, "Not found");
...
send_reply($err.rcode, $err.rreason);
...
		
```


### 导出的变量 {#exported-variables}


#### $sig_local_totag


该变量返回 OpenSIPS 为当前 SIP 请求本地发送应答时将使用的本地 To-tag。是的，该变量只应在 SIP 请求的上下文中使用，并且只应与 [send_reply()](#send_replycode-reason) 配合使用。


每次使用时，务必确保该函数与随后的应答函数处于相同的有状态／无状态 SIP 模式。否则可能得到不同的 To-tag 值！


> [!NOTE]
> 该变量返回 OpenSIPS 在本地生成的应答中将使用的 To-Tag。这可能与 OpenSIPS 接收并转发的应答中的 To-tag 完全不同。


```opensips title="$sig_local_totag 变量用法"
...
# 有状态处理
t_newtran();
xlog("the To-tag to be used is $sig_local_totag \n");
send_reply();  # 或 t_reply();
...
# 无状态处理
xlog("the To-tag to be used is $sig_local_totag \n");
send_reply(); # 或 sl_send_reply();
...
```
<!-- CONTRIBUTORS -->

### 许可证 {#license}

本项目的所有文档文件（即 .md 扩展名的文件）均以 Creative Common License 4.0 授权。
