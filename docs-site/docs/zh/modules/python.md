---
title: "Python 模块"
description: "本模块可直接从 OpenSIPS 脚本中高效运行 Python 代码，而无需执行 *python* 解释器。"
sidebar: false
---

## 管理指南 {#admin-guide}


### 概述 {#overview}


本模块可直接从 OpenSIPS 脚本中高效运行 Python 代码，而无需执行
*python* 解释器。


本模块提供了加载 python 模块并运行其函数的手段。每个函数都必须
接收 SIP 消息作为参数，并可选地接收一些从脚本传入的额外参数。


要运行 Python 函数，必须通过 *script_name* 参数指定脚本名，
从而加载包含这些函数的模块。该模块必须包含以下组件：


- 一个类，包含所有可从脚本调用的方法。
- 类中的一个方法，在创建 SIP 子进程时被调用。
该方法应接收一个整型参数，表示子进程的 rank，并且在函数
执行成功时必须返回 0 或正数，否则返回负数。该方法的名称由
*child_init_method* 参数指定。
- 一个全局函数，用于初始化 Python 模块并返回该类的一个
对象，该对象中的函数将由脚本调用。该全局函数的名称由
*mod_init_method* 参数指示。


满足这些要求的 Python 脚本最小示例如下：


```c
	def mod_init():
		return SIPMsg()

	class SIPMsg:
        def child_init(self, rank):
	        return 0
		
```


可以使用 *python_exec()* 脚本函数从脚本中执行上述返回对象中的
函数。该 python 方法必须接收以下参数：


- SIP 消息，其结构详见下文
- 可选地，一个从脚本传入的字符串


函数作为参数接收的 SIP 消息具有以下字段和方法：


- *Type* - 消息的类型，为 *SIP_REQUEST* 或
*SIP_REPLY*
- *Method* - 消息的方法
- *Status* - 消息的状态，仅对应答可用
- *RURI* - 消息的 R-URI，仅对请求可用
- *src_address* - 表示消息源地址的 (IP, port)
元组
- *dst_address* - 表示消息目的地址（OpenSIPS 地址）的
(IP, port) 元组
- *copy()* - 将当前 SIP 消息复制到一个新对象
- *rewrite_ruri()* - 修改消息的 R-URI；
仅对请求可用
- *set_dst_uri()* - 设置消息的目的 URI；
仅对请求可用
- *getHeader()* - 返回消息的头域
- *call_function()* - 调用内置脚本函数
或其他模块导出的函数
- *get_pseudoVar(name)* - 以 Unicode 字符串返回由
*name* 指定的伪变量的值。
- *set_pseudoVar(name, value)* - 使用 Unicode 字符串
*value* 设置伪变量。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


在使用本模块之前必须加载以下模块：


- *无*。


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，必须安装以下库或应用程序：


- *python-dev* - 提供 Python 绑定。


### 导出的参数 {#exported-parameters}


#### script_name (string)


包含 Python 模块的脚本。


*默认值为 "/usr/local/etc/opensips/handler.py"。*


```opensips title="设置 script_name 参数"
...
modparam("python", "script_name", "/usr/local/bin/opensips_handler.py")
...
```


#### mod_init_function (string)


用于初始化 Python 模块并返回对象的方法。


*默认值为 "mod_init"。*


```opensips title="设置 mod_init_function 参数"
...
modparam("python", "mod_init_function", "module_initializer")
...
```


#### child_init_method (string)


为每个子进程调用的方法。


*默认值为 "child_init"。*


```opensips title="设置 child_init_method 参数"
...
modparam("python", "child_init_method", "child_initializer")
...
```


### 导出的函数 {#exported-functions}


#### python_exec(method_name [, extra_args])


该函数用于执行已加载的 Python 模块中的方法。


该函数可在 REQUEST_ROUTE、ONREPLY_ROUTE、
FAILURE_ROUTE 和 BRANCH_ROUTE 中使用。


参数含义如下：


- *method_name* (string) - 被调用方法的名称
- *extra_args* (string, optional) - 可从脚本传递给
python 函数的额外参数。
<!-- CONTRIBUTORS -->

### 许可证 {#license}

所有文档文件（即以 .md 为扩展名的文件）均按 Creative Common License 4.0 许可发布
