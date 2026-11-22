---
title: "gflags 模块"
description: "gflags 模块（全局标志位）在共享内存中维护一个标志位位图，可用于依据标志位的值改变服务器行为。"
---


## 管理指南 {#admin-guide}


### 概述 {#overview}


gflags 模块（全局标志位）在共享内存中维护一个标志位位图，可用于依据标志位的值改变服务器行为。示例：


```opensips
if (is_gflag(1)) {
	t_relay("udp:10.0.0.1:5060");
} else {
	t_relay("udp:10.0.0.2:5060");
}	
```


本模块的好处在于，开关标志位的值可由外部应用（如 Web 界面或命令行工具）操作。位图大小为 32。


该模块导出外部命令，可用于通过管理接口（Management Interface）修改全局标志位。这些 MI 命令是："set_gflag"、"reset_gflag" 和 "is_gflag"。


### 依赖 {#dependencies}


本模块依赖以下模块（换言之，所列模块必须在本模块之前加载）：


- *无*


### 导出参数 {#exported-parameters}


#### initial (integer)


全局标志位位图的初始值。


默认值为 "0"。


```opensips title="initial parameter usage"
modparam("gflags", "initial", 15)
```


### 导出函数 {#exported-functions}


#### set_gflag(flag)


设置全局标志位中位置 "flag" 的位。


"flag"（int）参数的取值范围为 0..31。


该函数可在任意路由中使用。


```opensips title="set_gflag() usage"
...
set_gflag(4);
...
```


#### reset_gflag(flag)


重置全局标志位中位置 "flag" 的位。


"flag"（int）参数的取值范围为 0..31。


该函数可在任意路由中使用。


```opensips title="reset_gflag() usage"
...
reset_gflag(4);
...
```


#### is_gflag(flag)


检查全局标志位中位置 "flag" 的位是否已设置。


"flag"（int）参数的取值范围为 0..31。


该函数可在任意路由中使用。


```opensips title="is_gflag() usage"
...
if(is_gflag(4))
{
	log("global flag 4 is set\n");
} else {
	log("global flag 4 is not set\n");
};
...
```


### 导出 MI 函数 {#exported-mi-functions}


用于检查或修改某些标志位的函数接受一个参数，即指定相应标志位的标志位位图/掩码。无法像路由脚本中可用的函数那样直接指定应修改的标志位位置。


#### set_gflag


将某些标志位（由位掩码指定）的值设置为 1。


参数值必须为十进制或十六进制格式的位掩码。该位掩码大小为 32 位。


```bash title="set_gflag usage"
...
$ opensips-cli -x mi set_gflag 1
$ opensips-cli -x mi set_gflag 0x3
...
```


#### reset_gflag


将某些标志位的值重置为 0。


参数值必须为十进制或十六进制格式的位掩码。该位掩码大小为 32 位。


```bash title="reset_gflag usage"
...
$ opensips-cli -x mi reset_gflag 1
$ opensips-cli -x mi reset_gflag 0x3
...
```


#### is_gflag


若位掩码中的所有标志位均已设置，则返回 true。


参数值必须为十进制或十六进制格式的位掩码。该位掩码大小为 32 位。


若集合中的所有标志位均已设置，该函数返回 TRUE；若至少有一个未设置，则返回 FALSE。


```bash title="is_gflag usage"
...
$ opensips-cli -x mi set_gflag 1024
$ opensips-cli -x mi is_gflag 1024
TRUE
$ opensips-cli -x mi is_gflag 1025
TRUE
$ opensips-cli -x mi is_gflag 1023
FALSE
$ opensips-cli -x mi set_gflag 0x10
$ opensips-cli -x mi is_gflag 1023
TRUE
$ opensips-cli -x mi is_gflag 1007
FALSE
$ opensips-cli -x mi is_gflag 16
TRUE
...
```


#### get_gflags


返回包含所有标志位的位图。该函数不接受参数，以十六进制和十进制格式返回位图。


```bash title="get_gflags usage"
...
$ opensips-cli -x mi get_gflags
0x3039
12345
...
```
<!-- CONTRIBUTORS -->

### 许可证 {#license}

所有文档文件（即 .md 扩展名）均按 Creative Common License 4.0 授权。
