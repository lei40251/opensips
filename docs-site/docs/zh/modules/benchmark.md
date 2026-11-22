---
title: "benchmark 模块"
description: "本模块帮助开发者对其模块函数进行基准测试。通过配置文件或 API 添加本模块的函数后，OpenSIPS 可以为每个函数记录性能分析信息。"
---


## 管理指南 {#admin-guide}


### 概述 {#overview}


本模块帮助开发者对其模块函数进行基准测试。通过配置文件或 API 添加
本模块的函数后，OpenSIPS 可以为每个函数记录性能分析信息。


start_timer 与 log_timer 两次调用之间的时长会被存储，
并通过 OpenSIPS 的日志设施记录。请注意，所有时长均以微秒为单位
（不要与毫秒混淆！）。


重要说明：由于此基准测试旨在测量执行脚本不同部分/代码块所花费的时间
（而不是测量由 SIP 信令引入的时间），因此 benchmark 模块
应在同一个顶层路由（请求路由、失败路由、分支路由、应答路由等）中使用。
它并非设计用于跨不同类型的顶层路由使用
（例如在请求路由中开始、在失败路由中结束）！


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


在加载本模块之前，必须先加载以下模块：


- *不依赖其他 OpenSIPS 模块*。


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，必须安装以下库或应用程序：


- *无*。


### 导出的参数 {#exported-parameters}


#### enable (int)


即使模块已加载，基准测试默认也不会启用。
该变量可以有三个不同的值：


- -1 - 全局禁用基准测试
- 0 - 启用逐定时器启用机制。单个定时器默认处于非活动状态，
  一旦该功能实现，即可通过 MI 接口将其激活。
- 1 - 全局启用基准测试


*默认值为 "0"。*


```opensips title="Set enable parameter"
...
modparam("benchmark", "enable", 1)
...
```


#### granularity (int)


通常并非每次引用 log_timer() 函数都会记录日志，
而是每第 n 次调用记录一次。n 由该变量定义。
一个合理的粒度值似乎是 100。


如果 granularity 设置为 0，则不会自动记录任何内容。此时可以使用 bm_poll_results MI 命令获取结果并清除本地值。


*默认值为 "100"。*


```opensips title="Set granularity parameter"
...
modparam("benchmark", "granularity", 500)
...
```


#### loglevel (int)


设置 benchmark 日志的日志级别。应使用以下级别：


- -3 - *L_ALERT*
- -2 - *L_CRIT*
- -1 - *L_ERR*
- 1 - *L_WARN*
- 2 - *L_NOTICE*
- 3 - *L_INFO*
- 4 - *L_DBG*


*默认值为 "3"（L_INFO）。*


```opensips title="Set loglevel parameter"
...
modparam("benchmark", "loglevel", 4)
...
```


这会将日志级别设置为 L_DBG。


### 导出的函数 {#exported-functions}


#### bm_start_timer(name)


启动名为 "name" 的定时器。之后调用
"bm_log_timer()" 会记录该定时器。


```opensips title="bm_start_timer usage"
...
bm_start_timer("test");
...
```


#### bm_log_timer(name)


该函数记录具有给定 ID 的定时器。将记录以下数据：


- *Last msgs* 是上一个记录区间内的调用次数。等同于 granularity 变量。


- *Last sum* 是当前记录区间内累计的时长（即最近 "granularity" 次调用）。


- *Last min* 是上一个区间内 start/log_timer 调用之间的最小时长。


- *Last max* - 最大时长。


- *Last average* 是自上次记录以来
bm_start_timer() 与 bm_log_timer() 之间的平均时长。


- *Global msgs* 调用 log_timer 的总次数。


- *Global sum* 以微秒计的总时长。


- *Global min*……你已经明白了。 :)


- *Global max* 同样显而易见。


- *Global avg* 可能最值得关注的值。


```opensips title="bm_log_timer usage"
...
bm_log_timer("test");
...
```


### 导出的伪变量 {#exported-pseudo-variables}


导出的伪变量在接下来的小节中列出。


#### $BM_time_diff


*$BM_time_diff* - 调用 bm_start_timer(name) 与
bm_log_timer(name) 之间经过的时间差。如果未调用 bm_log_timer()，
则该值为 0。


### 导出的 MI 函数 {#exported-mi-functions}


#### bm_enable_global


启用/禁用模块。


参数：


- *enable* - 值可以是 -1、0 或 1。参见
"enable" 参数的说明。


MI FIFO 命令格式：


```bash
			opensips-cli -x mi bm_enable_global 1
			
```


#### bm_enable_timer


启用或禁用单个定时器。


参数：


- *timer* - 定时器名称
- *enable* - 启用（1）或禁用（0）定时器


MI FIFO 命令格式：


```bash title="Enabling a timer"
...
opensips-cli -x mi bm_enable_timer test 1
...
```


#### bm_granularity


修改基准测试的粒度。


参数：


- *granularity* - 参见
"granularity" 参数的说明。


MI FIFO 命令格式：


```bash
			opensips-cli -x mi bm_granularity 300
			
```


#### bm_loglevel


修改模块的日志级别。


参数：


- *log_level* - 参见
"loglevel" 参数的说明。


MI FIFO 命令格式：


```bash
			opensips-cli -x mi bm_loglevel 4
			
```


#### bm_poll_results


返回每个定时器的当前结果与全局结果。仅当 "granularity" 变量设置为 0 时该命令才可用。它可用于按稳定的时间间隔获取结果，而不是每 N 条消息获取一次。每个定时器将有两个节点——本地值和全局值。值的格式与日志文件中通常使用的格式相同。这种获取结果的方式便于与 Munin 之类的外部绘图应用对接。


如果自上次检查以来没有新的 *bm_log_timer* 调用，则某个定时器的所有当前值都将为 0。每次调用 *bm_poll_results* 都会重置当前值（但不会重置全局值）。


```bash title="Getting the results via FIFO interface"
...
opensips-cli -x mi bm_poll_results
register_timer
	3/40/12/14/13.333333
	9/204/12/97/22.666667
security_check_timer
	3/21/7/7/7.000000
	9/98/7/41/10.888889
...
```


### 使用示例 {#example-of-usage}


测量用户位置查找的耗时。


```opensips title="benchmark usage"
...
bm_start_timer("usrloc-lookup");
lookup("location");
bm_log_timer("usrloc-lookup");
...
```


## 开发者指南 {#developer-guide}


benchmark 模块提供一个内部 API，供
其他 OpenSIPS 模块使用。可用函数与对用户导出的
函数完全相同。


请注意，本模块主要面向开发者。在生产环境中
应谨慎使用。


### 可用函数 {#available-functions}


#### bm_register(name, mode, id)


该函数注册一个新的定时器，并/或返回与该定时器关联的内部 ID。
mode 控制当定时器不存在时是否创建新的定时器。
id 供 start 与 log 定时器函数使用。


#### bm_start(id)


该函数等同于对用户导出的函数 bm_start_timer。不过
id 是以整型传递的。


#### bm_log(id)


该函数等同于对用户导出的函数 bm_log_timer。不过
id 是以整型传递的。


### Benchmark API 示例 {#benchmark-api-example}


```c title="Using the benchmark module's API from another module"
...
#include "../benchmark/benchmark.h"
...
struct bm_binds bmb;
...
...
/* 加载基准测试 API */
if (load_bm_api( &bmb )!=0) {
    LM_ERR("can't load benchmark API\n");
    goto error;
}
...
...
/* 在（通常是用户导出的）模块函数中启动/记录定时器 */
bmb.bm_register("test", 1, &id)
bmb.bm_start(id);
do_something();
bmb.bm_log(id);
...
```
<!-- CONTRIBUTORS -->

### 许可证 {#license}

所有文档文件（即 .md 扩展名）均按 Creative Common License 4.0 许可发布。
