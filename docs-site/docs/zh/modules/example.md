---
title: "example 模块"
description: "该模块演示了如何在 OpenSIPS 中编写一个模块。"
---


## 管理指南 {#admin-guide}


### 概述 {#overview}


本模块演示了如何在 OpenSIPS 中编写一个模块。
其主要目标是简化新手开发新模块的过程，提供一个清晰易懂的起点。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


在加载本模块之前必须加载以下模块：


- *不依赖其他 OpenSIPS 模块*。


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，必须安装以下库或应用程序：


- *无*。


### 导出的参数 {#exported-parameters}


#### default_str (string) {#default_str-string}


当调用 [example_str()](#example_strstring)
函数而不传入任何参数时使用的默认参数。


*默认值为 ""（空字符串）。*


```opensips title="Set 'default_str' parameter"
...
modparam("example", "default_str", "TEST")
...
```


#### default_int (integer) {#default_int-integer}


当调用 [example_int()](#example_intint)
函数而不传入任何参数时使用的默认参数。


*默认值为 "0"。*


```opensips title="Set 'default_int' parameter"
...
modparam("example", "default_int", -1)
...
```


### 导出的函数 {#exported-functions}


#### example()


该函数只是向日志打印一条消息，说明它已被调用。


此函数可在任意路由中使用。


```opensips title="example usage"
...
example();
...
```


#### example_str([string]) {#example_strstring}


该函数只是向日志打印一条消息，说明它已被调用。
如果传入了参数，则将其打印到日志中，否则使用
[default_str](#default_str-string) 参数的值。


参数含义如下：


- *string (string，可选)* - 要记录到日志的参数


此函数可在任意路由中使用。


```opensips title="example_str() usage"
...
example_str("test");
...
```


#### example_int([int]) {#example_intint}


该函数只是向日志打印一条消息，说明它已被调用。
如果传入了参数，则将其打印到日志中，否则使用
[default_int](#default_int-integer) 参数的值。


参数含义如下：


- *int (integer，可选)* - 要记录到日志的参数


此函数可在任意路由中使用。


```opensips title="example_int() usage"
...
example_int(10);
...
```
<!-- CONTRIBUTORS -->

### 许可证 {#license}

所有文档文件（即 .md 扩展名）均依据 Creative Common License 4.0 授权
