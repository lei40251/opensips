---
title: "mi_fifo 模块"
description: "本模块为管理接口提供 FIFO 传输层实现。"
sidebar: false
---

## 管理指南 {#admin-guide}


### 概述 {#overview}


本模块为管理接口（Management Interface）提供 FIFO 传输层
实现。它通过 FIFO 文件接收
命令，并通过指定的 reply_fifo 返回输出。


模块每 30 秒检查一次 FIFO 文件是否存在，
如果已被删除，则重新创建。如果希望强制
重建 FIFO 文件，应向 MI 进程 PID
发送 SIGHUP 信号。


### FIFO 命令语法 {#fifo-command-syntax}


通过 FIFO 接口发出的外部命令必须遵循
以下语法：
*request = ':'(reply_fifo)?':'jsonrpc_command*


如果缺少 *reply_fifo*，mi_fifo
模块将不发送任何应答。当 *jsonrpc_command*
不包含 *id* 元素、命令被视为
JSON-RPC 通知时，行为类似。


### 返回值 {#values-returned}


成功时，会在 FIFO 文件上回复一个有效的
[JSON-RPC](http://www.jsonrpc.org/specification)
响应，其中包含成功的
JSON-RPC 响应。


MI 命令失败时，会通过应答 FIFO 文件
返回一个 JSON-RPC 应答错误。


如果错误由 MI 引擎产生（大多是内部
错误），则通过应答 FIFO 以
纯文本形式返回错误原因。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


以下模块必须在本模块之前加载：


- *不依赖其他 OpenSIPS 模块*。


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，必须安装
以下库或应用程序：


- *无*


### 导出的参数 {#exported-parameters}


#### fifo_name (string)


为监听和读取外部命令而创建的
FIFO 文件的名称。


> [!NOTE]
> 从 Linux 内核 4.19 开始，
> 进程不能再读取保存在带粘滞位（sticky bit）的目录
> （如 */tmp*）中、且所有者与进程运行用户
> 不一致的 FIFO 文件。这
> 会阻止外部工具（如 *opensips-cli*）
> 以其他用户执行 MI 命令（会触发
> *权限被拒绝* 错误）。如果
> 在使用 *opensips-cli* 时遇到此错误，可以通过
> 把 FIFO 文件存放在非粘滞位目录（如
> */run/opensips*），或使用
> *sysctl fs.protected_fifos = 0* 禁用 FIFO
> 保护（不推荐）来解决。


*默认值为 "/tmp/opensips_fifo"。*


```opensips title="设置 fifo_name 参数"
...
modparam("mi_fifo", "fifo_name", "/tmp/opensips_b2b_fifo")
...
```


#### fifo_mode (integer)


创建监听 FIFO 文件所使用的权限。它
遵循 UNIX 约定。


*默认值为 0660 (rw-rw----)。*


```opensips title="设置 fifo_mode 参数"
...
modparam("mi_fifo", "fifo_mode", 0600)
...
```


#### fifo_group (integer) fifo_group (string)


创建监听 FIFO 文件所使用的组。


*默认值为继承值。*


```opensips title="设置 fifo_group 参数"
...
modparam("mi_fifo", "fifo_group", 0)
modparam("mi_fifo", "fifo_group", "root")
...
```


#### fifo_user (integer) fifo_group (string)


创建监听 FIFO 文件所使用的用户。


*默认值为继承值。*


```opensips title="设置 fifo_user 参数"
...
modparam("mi_fifo", "fifo_user", 0)
modparam("mi_fifo", "fifo_user", "root")
...
```


#### reply_dir (string)


用于创建应答 FIFO 文件的目录。


*默认值为 "/tmp/"*


```opensips title="设置 reply_dir 参数"
...
modparam("mi_fifo", "reply_dir", "/home/opensips/tmp/")
...
```


#### pretty_printing (int)


指示通过 MI 发送的 JSONRPC 响应是否
应进行美化打印（pretty-print）。


*默认值为 "0 - 不美化打印"。*


```opensips title="设置 pretty_printing 参数"
...
modparam("mi_fifo", "pretty_printing", 1)
...
```


#### trace_destination (string)


在 tracing 模块中定义的跟踪目标。目前
唯一的 tracing 模块是 **proto_hep**。
被跟踪的 mi 消息将发送到此处。


**警告：**要使该参数生效，必须加载一个 tracing
模块（例如 **proto_hep**）。


*默认值为 none（未定义）。*


```opensips title="设置 trace_destination 参数"
...
modparam("proto_hep", "trace_destination", "[hep_dest]10.0.0.2;transport=tcp;version=3")

modparam("mi_fifo", "trace_destination", "hep_dest")
...
```


#### trace_bwlist (string)


基于黑名单或白名单过滤被跟踪的 mi 命令。
**trace_destination** 必须已定义，该参数
才有意义。白名单可用 'w' 或 'W' 定义，
黑名单可用 'b' 或 'B'。类型与实际黑名单
之间用 ':' 分隔。列表中的 mi 命令必须用
',' 分隔。


定义黑名单意味着所有未被列入黑名单的命令
都会被跟踪。定义白名单意味着所有未被列入
白名单的命令都不会被跟踪。
**警告：** 不能同时定义白名单
和黑名单。只允许其中一种。第二次定义
该参数只会覆盖第一次的定义。


> [!WARNING]
> 要使该参数生效，必须加载一个 tracing 模块
> （例如 **proto_hep**）。


*默认值为 none（未定义）。*


```opensips title="设置 trace_destination 参数"
...
## 将 ps 和 which mi 命令列入黑名单
## 所有其他命令都会被跟踪
modparam("mi_fifo", "trace_bwlist", "b: ps, which")
...
## 只允许 sip_trace mi 命令
## 所有其他命令都不会被跟踪
modparam("mi_fifo", "trace_bwlist", "w: sip_trace")
...
```


### 导出的函数 {#exported-functions}


没有导出可在配置文件中使用的函数。


### 示例 {#example}


下面示例展示了
"get_statistics dialog: tm:" MI 命令的 FIFO 格式：
应答。


```c title="FIFO 请求"
:reply_fifo:{"jsonrpc":"2.0","method":"get_statistics","id":"5672","params":[["dialog:","tm:"]]}
```
<!-- CONTRIBUTORS -->

### 许可证 {#license}

本项目的所有文档文件（即 .md 扩展名的文件）均以 Creative Common License 4.0 授权。
