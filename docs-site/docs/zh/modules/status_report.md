---
title: "Status/Reports 模块"
description: "Status/Report 模块是对内部 status/report 框架的封装，允许脚本编写者动态定义并使用 SR 组。"
---


## 管理指南 {#admin-guide}


### 概述 {#overview}


Status/Report 模块是对内部 status/report
框架的封装，允许脚本编写者
动态定义并使用 SR 组。


通过将 Status/Report 支持引入脚本，就可以依据
脚本中的逻辑，
从脚本创建自定义报告。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


以下模块必须在本模块之前加载：


- *不依赖其他 OpenSIPS 模块*。


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，必须安装以下库或应用程序：


- *无*。


### 导出的参数 {#exported-parameters}


#### script_sr_group (string)


要创建并在之后于脚本层面使用的
Status/Report 组名称。


该参数可以定义多次，以便定义
多个组。


```opensips title="script_sr_group 示例"
modparam("status_report", "script_sr_group", "security")
modparam("status_report", "script_sr_group", "alarms")
```


### 导出的函数 {#exported-functions}


#### sr_set_status( group, status, [details])


为 Status/Report 组设置新的状态（及详情）。


参数含义如下：


- *group* (string) - SR 组的名称；
只能为通过本模块（作为参数）定义的组修改
状态。
- *status* (int) - 新的状态值
（严格为正表示 OK，严格为负表示 NOT OK，
不接受 0，0 会被自动转换为 1）。
- *details* (string, optional) -
用于详述状态值的说明性文本


该函数可在任意路由中使用。


```opensips title="sr_set_status 用法"
...
sr_set_status( "script_caching", 1, "completed");
...
```


#### sr_add_report( group, report)


向 Status/Report 组添加新的报告/日志。该组也必须是通过
本模块定义的。


参数含义如下：


- *group* (string) - SR 组的名称；
只能为通过本模块（作为参数）定义的组修改
状态。
*report* (string) - 要添加的日志。


该函数可在任意路由中使用。


```opensips title="sr_add_report 用法"
...
sr_add_report("security","IP $si detected as attacker");
...
```
<!-- CONTRIBUTORS -->

### 许可证 {#license}

所有文档文件（即以 .md 为扩展名的文件）均按 Creative Common License 4.0 授权。
