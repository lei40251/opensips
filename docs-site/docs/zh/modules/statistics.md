---
title: "统计模块 (statistics)"
description: "统计模块是对内部统计管理器的封装，使脚本编写者可以动态定义并使用统计变量。"
sidebar: false
---


## 管理员指南 {#admin-guide}


### 概述 {#overview}


统计模块是对内部统计管理器的封装，使脚本编写者可以动态定义并
使用统计变量。


通过把统计支持引入脚本，它可以利用脚本在定义逻辑上的灵活性，
从而能够实现任何类型的统计场景。


### 统计分组 {#statistic-groups}


从 OpenSIPS 2.3 起，统计项可以分组：在统计项名称前加上所需分组名，
并以冒号分隔（例如 **$stat(method:invite)** 或
**update_stat("packets:$var(ptype)", "+1")**）。
为此，必须在 OpenSIPS 启动之前通过
**[stat_groups](#stat_groups-string)**
模块参数定义这些分组。


该模块允许使用
**[stat_iter_init()](#stat_iter_initgroup-iter)**
和 **[stat_iter_next()](#stat_iter_nextname-val-iter)**
函数轻松遍历某个分组的统计项。


默认情况下，所有统计项都属于
**"dynamic"** 分组。


### 统计序列 {#statistic-series}


统计序列（statistic series）提供了在预定义时间窗口内累积统计数据的能力。
数据存放在环形缓冲区中，新数据压入顶部，过期取值（时间范围之外的取值）
从底部移除。这些统计可用于提供按时间维度的统计，如
ACD、ASR、AST 等，可通过经典的统计接口、
借助 *$stat()* 变量读取。


统计序列配置（profile）描述用于存储数据的时间范围，
以及数据的累积和解读方式。根据所配置的算法，统计序列
有几种可用类型：


- *accumulate* - 把指定取值累积到
计数器中；与经典统计类似，区别是在指定时间范围后
重置
- *average* - 返回时间范围内灌入的全部数据的
平均值；在计算 PDD、AST、ACD 统计时有用。
- *percentage* - 表示一组取值在灌入的取值总量中所占的
百分比；在计算
ASR、NER、CCR 统计时有用。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


在加载本模块之前，必须先加载以下模块：


- *不依赖其他 OpenSIPS 模块*。


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，必须先安装以下库或应用程序：


- *无*。


### 导出的参数 {#exported-parameters}


#### variable (string)


新增统计变量的名称。名称后可以跟随描述变量行为的
附加标志：


- *no_reset*：变量不能被重置。


```opensips title="variable 示例"
modparam("statistics", "variable", "register_counter")
modparam("statistics", "variable", "active_calls/no_reset")
```


#### stat_groups (string) {#stat_groups-string}


以逗号分隔的取值字符串，指定可在整个 OpenSIPS 脚本中
使用的统计分组。分组不能包含前导或
尾随空白字符。


```opensips title="设置 stat_groups 参数"
modparam("statistics", "stat_groups", "method, packet, response")
```


#### stat_series_profile (string) {#stat_series_profile-string}


用于定义统计序列配置。格式如下：
*name: [attr=value]**，其中 *name*
表示配置的名称，*attr=value*
包含所定义配置的多个设置项。可能的属性
及其取值如下：


- *algorithm* - 表示数据在指定时间范围内的
存储与累积方式。可能取值为：
*accumulate*、*average* 和
*percentage*，如
**[section stat series](#statistic-series)**
段落所述（默认为 *accumulate*）
- *hash_size* - 每个已定义/使用的统计项都存放在
附加到该配置的哈希表中；该设置用于调整哈希
大小（默认：8）
- *group* - 表示归属于该配置的统计项
所在的分组（如
**[stat_groups](#stat_groups-string)**
所述（默认使用与该配置相同的分组）
- *window* - 一个时间范围包含的秒数；
所有更早的取值（超出指定窗口）都会被丢弃
（默认 *60* 秒）
- *slots* - 每个窗口的槽位数量；用于调整
环形缓冲区的粒度；槽位数量越多，
所得统计越精确；
（默认与 *window* 参数取值相同）
- *percentage_factor* - 用于
*percentage* 算法配置，指定
要使用的百分比因子（默认 *100*）


该参数可以设置多次，每个所需配置设置一次。


```opensips title="设置 stat_series_profile 参数"
...
# 定义一个统计项，累积最近一分钟内的平均值
modparam("statistics", "stat_series_profile", "avg: algorithm=average")
...
# 定义一个统计项，累积 10 分钟内的平均值，
# 粒度为 1 分钟（600 秒窗口中的 10 个槽位）
modparam("statistics", "stat_series_profile", "avg_10m: algorithm=average window=600 slots=10")
...
# 定义一个统计项，计算最近一小时取值的百分比，
# 粒度为 10 分钟（3600 秒窗口中的 6 个槽位）
modparam("statistics", "stat_series_profile", "perc_1h: algorithm=percentage window=3600 slots=6")
...
```


### 导出的函数 {#exported-functions}


#### update_stat(variable, value)


用新值更新统计变量的取值。


参数含义如下：


- *variable* (string) - 要更新的变量；
- *value* (int) - 用于更新的取值；也可以
为负数。


该函数可在 REQUEST_ROUTE、BRANCH_ROUTE、
FAILURE_ROUTE 和 ONREPLY_ROUTE 中使用。


```opensips title="update_stat 用法"
...
update_stat("register_counter", 1);
...
$var(a_calls) = "active_calls";
update_stat($var(a_calls), -1);
...
```


#### reset_stat(variable)


把统计变量的取值重置为零。


参数含义如下：


- *variable* (string) - 要重置的变量


该函数可在 REQUEST_ROUTE、BRANCH_ROUTE、
FAILURE_ROUTE 和 ONREPLY_ROUTE 中使用。


```opensips title="reset_stat 用法"
...
reset_stat("register_counter");
...
$var(reg_counter) = "register_counter";
update_stat($var(reg_counter));
...
```


#### stat_iter_init(group, iter) {#stat_iter_initgroup-iter}


重新初始化 "iter"，以便开始遍历属于给定 "group" 的
所有统计项。


参数含义如下：


- *group* (string)
- *iter* (string) - 在内部匹配
到对应的迭代器


该函数可在 REQUEST_ROUTE、BRANCH_ROUTE、
FAILURE_ROUTE 和 ONREPLY_ROUTE 中使用。


```opensips title="stat_iter_init 用法"
...
stat_iter_init("packet", "iter");
...
```


#### stat_iter_next(name, val, iter) {#stat_iter_nextname-val-iter}


尝试获取 "iter" 当前指向的统计项。
若成功，相关数据将写入 "name" 和 "val"，
同时推进 "iter"。到达迭代结束时返回负值。


参数含义如下：


- *name* (var)
- *val* (var)
- *iter* (string) - 在内部匹配
到对应的迭代器


该函数可在 REQUEST_ROUTE、BRANCH_ROUTE、
FAILURE_ROUTE 和 ONREPLY_ROUTE 中使用。


```opensips title="stat_iter_next 用法"
...
# 周期性清除与报文相关的数据
timer_route [clear_packet_stats, 7200] {
	stat_iter_init("packet", "iter");
	while (stat_iter_next($var(stat), $var(val), "iter"))
		reset_stat("packet:$var(stat)");
}
...
```


#### update_stat_series(profile, variable, value)


更新序列统计项的取值。


参数含义如下：


- *profile* (string) - 如
**[stat_series_profile](#stat_series_profile-string)**
中定义的配置
- *variable* (string) - 要更新的变量；
- *value* (int) - 用于更新的取值；也可以
为负数；使用 *percentage* 算法时，
所得取值表示正数取值在取值总数
（正数 + 负数）中所占的百分比


该函数可在任何路由中使用。


```opensips title="update_stat_series 用法"
...
# 统计失败的呼叫
update_stat_series("perc_1h", "ASR_1h", -1);

# 统计成功的呼叫
update_stat_series("perc_1h", "ASR_1h", 1);

# 计算平均 PDD
update_stat_series("avg", "PDD", $var(pdd_ms));
...
```


### 导出的伪变量 {#exported-pseudo-variables}


#### $stat


允许对给定统计项执行 "get" 或 "reset" 操作。


统计项名称前可选择性加上搜索
分组，并以冒号分隔。


如果未提供搜索分组，则先在核心分组中
搜索该统计项。若未找到，继续在
"dynamic" 分组中搜索，该分组默认存放所有未显式
分组、且不由 OpenSIPS 核心导出的统计项。


```opensips title="$stat 用法"
...
xlog("SHM used size = $stat(used_size), no_invites = $stat(method:invite)\n");
...
$stat(err_requests) = 0;
...
			
```
<!-- CONTRIBUTORS -->

### 许可 {#license}

本项目的所有文档文件（即 .md 扩展名的文件）均以 Creative Common License 4.0 授权。
