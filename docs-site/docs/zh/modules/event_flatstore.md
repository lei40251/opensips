---
title: "event_flatstore 模块"
description: "event_flatstore 模块提供了一套日志设施，用于记录通过 OpenSIPS Event 接口、直接从 OpenSIPS 脚本触发的各类事件。"
sidebar: false
---


## 管理指南 {#admin-guide}


### 概述 {#overview}


*event_flatstore*
模块提供了一套日志设施，用于记录通过 OpenSIPS Event 接口、
直接从 OpenSIPS 脚本触发的各类事件。该模块将事件及其参数
以纯文本形式记录到文件中。


### Flatstore 套接字语法 {#flatstore-socket-syntax}


*flatstore:path_to_file*


含义：


- *flatstore:* - 告知 Event 接口，发送给该订阅者的事件
应由 *event_flatstore* 模块处理。
- *path_to_file* - 记录事件所追加写入的文件路径。若文件不存在则会被创建。它必须是合法的文件路径，而不是目录。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


必须在本模块之前加载以下模块：


- *不依赖其他 OpenSIPS 模块*。


### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，必须安装以下库或应用程序：


- *无*


### 导出的参数 {#exported-parameters}


#### max_open_sockets (integer)


定义该模块同时打开文件的最大数量。若达到该上限，
将抛出错误消息，且只有在
当前至少一个订阅过期之后，才能建立新的订阅。


*默认值为 "100"。*


```opensips title="Set max_open_sockets parameter"
...
modparam("event_flatstore", "max_open_sockets", 200)
...
```


#### delimiter (string)


设置日志文件中事件各参数之间的分隔符。


*默认值为 ","。*


```opensips title="Set delimiter parameter"
...
modparam("event_flatstore", "delimiter", ";")
...
```


#### escape_delimiter (string)


可选的替换序列：当该字符（或序列）出现在字符串参数内部时，
将写入该序列*而不是*
[`delimiter`](#delimiter-string)。
这样即使用户数据本身包含分隔符符号，
也能保持日志文件易于解析。


若设置，其长度*必须完全等于*
`delimiter` 的长度。


*默认值为 """"（禁用转义）。*


```opensips title="Enable escaping of ',' with '|'"
...
modparam("event_flatstore", "delimiter", ",")
modparam("event_flatstore", "escape_delimiter", "|")
...
```


#### file_permissions (string)


设置新建日志文件的权限。它
期望一个八进制值的字符串表示。


*默认值为 "644"。*


```opensips title="Set file_permissions parameter"
...
modparam("event_flatstore", "file_permissions", "664")
...
```


#### suppress_event_name (int)


在日志文件中抑制事件名称的输出。


*默认值为 "0/OFF"（打印事件名称）。*


```opensips title="Set suppress_event_name parameter"
...
modparam("event_flatstore", "suppress_event_name", 1)
...
```


#### rotate_period (int)


使用后会触发文件自动轮转。该周期会与
机器的绝对时间进行匹配，可用于触发
每分钟或每小时的自动轮转。


*默认值为 "0/OFF"（文件永不自动轮转）*


```opensips title="Set rotate_period parameter"
...
modparam("event_flatstore", "rotate_period", 60) # 每分钟轮转一次
modparam("event_flatstore", "rotate_period", 3660) # 每小时轮转一次
...
```


#### rotate_count (int|string)


定义写入多少行后轮转日志文件。
该值可能超出 32 位整型上限；这种情况下请
*以字符串形式*传入，例如 "5000000000"。


*默认值为 "0/OFF"。*


```opensips title="Rotate after five billion lines"
...
modparam("event_flatstore", "rotate_count", "5000000000")
...
```


#### rotate_size (int|string)


设置文件在被轮转之前的最大大小。可以提供
"k"、"m" 或 "g" 的大小后缀
（1024 的倍数）。
非常大的值可以以字符串形式提供，例如
"8589934592" 表示 8 GiB。


*默认值为 "0/OFF"。*


```opensips title="Rotate at 2 GiB"
...
modparam("event_flatstore", "rotate_size", "2g")
...
```


#### suffix (string)


通过在 flatstore
*套接字*所指定的文件后追加一个后缀，
改变 OpenSIPS 写入事件的目标文件。


该后缀可以包含字符串格式（即变量与字符串的混合）。
所生成文件的路径在重载发生后首次触发/写入事件时求值，
或者在指定了 *rotate_period* 且其触发轮转时求值。


该参数不影响事件套接字的匹配 ——
匹配将完全基于所注册的 flatstore
*套接字*进行。


*默认值为 """"（不添加后缀）*


```opensips title="Set suffix parameter"
...
modparam("event_flatstore", "suffix", "$time(%Y)")
...
```


### 导出的函数 {#exported-functions}


没有导出供配置文件使用的函数。


### 导出的 MI 函数 {#exported-mi-functions}


#### evi_flat_rotate


它使各进程重新打开命令参数中指定的文件，
以便与 logrotate 命令兼容。若在执行 mv 命令后
未调用该函数，模块将继续写入已被重命名的文件。


名称：*evi_flat_rotate*


参数：*path_to_file*


MI FIFO 命令格式：


```bash
opensips-cli -x mi evi_flat_rotate _path_to_log_file_
```


### 导出的事件 {#exported-events}


#### E_FLATSTORE_ROTATION


每当 *event_flatstore*
打开新的日志文件时（手动执行 `evi_flat_rotate`、
由 `rotate_period` 自动轮转，或达到
阈值 `rotate_count`/`rotate_size`），该事件都会被触发。
外部应用可以订阅以监控日志轮转活动。


参数：


- *timestamp* – 执行轮转时的 Unix 时间戳（秒）。
- *reason* – 取值为以下字符串之一：
*count*、*size*、
*period* 或 *mi*。
- *filename* – 新日志文件的完整路径。
- *old_filename* – 上一个
日志文件的完整路径；若此前不存在，则为空字符串。
<!-- CONTRIBUTORS -->

### 许可 {#license}

所有文档文件（即 .md 扩展名的文件）均以 Creative Common License 4.0 授权。
