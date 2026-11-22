---
title: "mi_html 模块"
description: "本模块为 OpenSIPS 的管理接口提供一个最简化的 Web 用户界面。"
---


## 管理指南 {#admin-guide}


### 概述 {#overview}


本模块为 OpenSIPS 的管理接口（Management Interface）提供一个最简化的 Web 用户界面。


MI 命令的参数必须以 JSON 数组格式给出。例如，要获取所有统计，参数应写为 [["all"]]。若只获取 dialog 和 tm 的统计，参数应写为 [["dialog:","tm:"]]。


### 待办 {#to-do}


将来会增加的功能：


- 对连接进行鉴权的可能性。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


以下模块必须在本模块之前加载：


- *httpd* 模块。


### 导出参数 {#exported-parameters}


#### root(string)


指定 HTTP 请求的根路径。指向 MI Web 界面的链接必须按以下模式构造：
http://[opensips_IP]:[opensips_mi_port]/[root]


*默认值为 "mi"。*


```opensips title="Set root parameter"
...
modparam("mi_html", "root", "opensips_mi")
...
```


#### http_method(integer)


指定要使用的 HTTP 请求方法：


- 0 - 使用 GET HTTP 请求
- 1 - 使用 POST HTTP 请求


*默认值为 0。*


```opensips title="Set http_method parameter"
...
modparam("mi_html", "http_method", 1)
...
```


#### trace_destination (string)


跟踪目的地，定义方式参见 tracing 模块。目前唯一的跟踪模块是 **proto_hep**。被跟踪的 MI 消息将发送到这里。


> [!WARNING]
> 必须加载跟踪模块，该参数才能生效。（例如
> **proto_hep**）。


*默认值为 none（未定义）。*


```opensips title="Set trace_destination parameter"
...
modparam("proto_hep", "trace_destination", "[hep_dest]10.0.0.2;transport=tcp;version=3")

modparam("mi_html", "trace_destination", "hep_dest")
...
```


#### trace_bwlist (string)


基于黑名单或白名单过滤被跟踪的 MI 命令。只有定义了 **trace_destination**，该参数才有意义。白名单可用 'w' 或 'W' 定义，黑名单可用 'b' 或 'B' 定义。类型与实际的黑名单之间以 ':' 分隔。列表中的 MI 命令必须以 ',' 分隔。


定义黑名单意味着所有未被列入黑名单的命令都会被跟踪。定义白名单意味着所有未被列入白名单的命令都不会被跟踪。
**警告：** 不能同时定义白名单和黑名单，只允许其中一种。第二次定义该参数只会覆盖第一次的定义。


**警告：** 必须加载跟踪模块，该参数才能生效。（例如
**proto_hep**）。


*默认值为 none（未定义）。*


```opensips title="Set trace_destination parameter"
...
## 将 ps 和 which MI 命令列入黑名单
## 所有其他命令都将被跟踪
modparam("mi_html", "trace_bwlist", "b: ps, which")
...
## 仅允许 sip_trace MI 命令
## 所有其他命令都不会被跟踪
modparam("mi_html", "trace_bwlist", "w: sip_trace")
...
```


### 导出函数 {#exported-functions}


没有导出供配置文件使用的函数。


### 已知问题 {#known-issues}


若配置的 httpd 缓冲区过小（或未配置足够的 pkg 内存），响应较大的命令（如 ul_dump）将失败。


httpd 模块的未来版本将解决该问题。
<!-- CONTRIBUTORS -->

### 许可证 {#license}

所有文档文件（即 .md 扩展名）均按 Creative Common License 4.0 授权。
