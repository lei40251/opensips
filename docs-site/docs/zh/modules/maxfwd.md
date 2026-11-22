---
title: "maxfwd 模块"
description: "本模块实现与 Max-Forwards 头域相关的所有操作，例如添加该头域（若不存在），或对已存在的头域递减并检查其值。"
---


## 管理指南 {#admin-guide}


### 概述 {#overview}


本模块实现与 Max-Forwards 头域相关的所有操作，例如添加该头域（若不存在），或对已存在的头域递减并检查其值。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


以下模块必须在本模块之前加载：


- *不依赖其他 OpenSIPS 模块*。


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，必须安装以下库或应用程序：


- *无*。


### 导出参数 {#exported-parameters}


#### max_limit (integer)


设置出站请求中 Max-Forwards 值的上限。若该头域存在，递减后的值不得超出该 max_limit —— 若超出，头域值将被降低到 "max_limit"。


注意：该检查在调用 mf_process_maxfwd_header() 时执行。


取值范围为 1 到 256，这是 RFC 3261 允许的 Max-Forwards 最大值。


*默认值为 "256"。*


```opensips title="Set max_limit parameter"
...
modparam("maxfwd", "max_limit", 32)
...
```


### 导出函数 {#exported-functions}


#### mf_process_maxfwd_header(max_value)


若接收到的请求中不存在 Max-Forwards 头域，将添加一个头域，其原始值等于 "max_value"。若 Max-Forwards 头域已存在，其值将被递减（若不为 0）。


返回码：


- *2 (true)* - 未找到该头域，且已成功添加新的头域。
- *1 (true)* - 找到了该头域，且其值已成功递减（原值不为 0）。
- *-1 (false)* - 找到了该头域，且其值为 0（无法递减）。
- *-2 (false)* - 处理过程中出错。


返回码可通过脚本变量 "retcode"（或 "$?"）进行充分判断。


参数含义如下：


- *max_value* (int) - 若消息中不存在 Max-Forwards 头域时要添加的值。


该函数可用于 REQUEST_ROUTE。


```opensips title="mx_process_maxfwd_header usage"
...
# 初始基本检查 —— max_forwards==0 的消息，
# 或过长的请求
if (!mf_process_maxfwd_header(10) && $retcode==-1) {
	sl_send_reply(483,"Too Many Hops");
	exit;
};
...
```


#### is_maxfwd_lt(max_value)


检查 Max-Forwards 头域的值是否小于 "max_value" 参数值。它还会考虑新插入的头域的值（若为本地添加）。


返回码：


- *1 (true)* - 找到或设置了该头域，且其值严格小于 "max_value"。
- *-1 (false)* - 找到或设置了该头域，且其值大于或等于 "max_value"。
- *-2 (false)* - 未找到或未设置该头域。
- *-3 (false)* - 处理过程中出错。


返回码可通过脚本变量 "retcode"（或 "$?"）进行充分判断。


参数含义如下：


- *max_value* (int) - 用于比较 Max-Forwards 值的参照值（判断是否小于该值）。


```opensips title="is_maxfwd_lt usage"
...
# 下一跳是网关，因此若 MF 为 0（递减后）
# 转发没有意义
if ( is_maxfwd_lt(1) ) {
	sl_send_reply(483,"Too Many Hops");
	exit;
};
...
```
<!-- CONTRIBUTORS -->

### 许可证 {#license}

所有文档文件（即 .md 扩展名）均按 Creative Common License 4.0 授权。
