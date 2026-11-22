---
title: "cfgutils 模块"
description: "为服务器配置提供的有用扩展。"
---

## 管理指南 {#admin-guide}


### 概述 {#overview}


为服务器配置提供的有用扩展。


cfgutils 模块可用于为服务器的行为引入随机性。它提供若干设置函数以及 `rand_event` 函数。该函数依据一个随机值和指定的概率返回 true 或 false。例如，如果通过 FIFO 或脚本将概率值设为 5%，那么所有对 rand_event 的调用中将有 5% 返回 false。伪变量 `$RANDOM` 可用于引入随机值，例如放入 SIP 应答中。


本模块的好处在于，决策的概率可由外部应用（如 Web 界面或命令行工具）操作。概率必须以百分比值指定，范围为 0 到 100。


该模块向 FIFO 服务器导出命令，可用于通过 FIFO 接口修改全局设置。这些 FIFO 命令是："set_prob"、"reset_prob" 和 "get_prob"。


本模块可用于简单的负载削减，例如以 503 错误以及一个合适的随机 Retry-After 值应答 5% 的 Invite。


本模块还提供延迟服务器执行的函数。函数 "sleep" 和 "usleep" 可用于让服务器等待指定的时间区间。


它还可在启动时用（弱）加密哈希函数对服务器所使用的配置文件计算哈希。该值会被保存，之后可与实际哈希比较，以检测服务器启动之后该文件是否被修改。这些功能以 FIFO 命令 "check_config_hash" 和 "get_config_hash" 提供。


### 依赖 {#dependencies}


本模块依赖以下模块（换言之，所列模块必须在本模块之前加载）：


- *无*


### 导出参数 {#exported-parameters}


#### initial_probability (integer)


概率的初始值。


*默认值为 "10"。*


```opensips title="initial_probability parameter usage"
   
modparam("cfgutils", "initial_probability", 15)
   
```


#### hash_file (string)


在启动时需要为其计算哈希值的配置文件名。


没有默认值；若未给出该参数，则哈希功能被禁用。


```opensips title="hash_file parameter usage"
   
modparam("cfgutils", "hash_file", "/etc/opensips/opensips.cfg")
   
```


#### shv_hash_size (integer)


用于存储共享变量（$shv）的哈希表大小。


*默认值为 "64"。*


```opensips title="shv_hash_size parameter usage"
modparam("cfgutils", "shv_hash_size", 1024)
```


#### shvset (string)


设置共享变量（$shv(name)）的值。该参数可设置多次。


该参数值的格式为：
_name_ '=' _type_ ':' _value_


- _name_：共享变量名
- _type_：值的类型

  - "i"：整型值
  - "s"：字符串值
- _value_：要设置的值


*默认值为 "NULL"。*


```opensips title="shvset parameter usage"
...
modparam("cfgutils", "shvset", "debug=i:1")
modparam("cfgutils", "shvset", "pstngw=s:sip:10.10.10.10")
...
```


#### varset (string)


设置脚本变量（$var(name)）的值。该参数可设置多次。


该参数值的格式为：
_name_ '=' _type_ ':' _value_


- _name_：变量名
- _type_：值的类型

  - "i"：整型值
  - "s"：字符串值
- _value_：要设置的值


默认值为 "NULL"。


```opensips title="varset parameter usage"
...
modparam("cfgutils", "varset", "init=i:1")
modparam("cfgutils", "varset", "gw=s:sip:11.11.11.11;transport=tcp")
...
```


#### lock_pool_size (integer) {#lock_pool_size-integer}


在 OpenSIPS 启动时分配的动态脚本锁数量。该数字必须是 2 的幂。（即 1、2、4、8、16、32、64 ...）


注意，*lock_pool_size* 参数仅影响启动时创建的动态锁数量。静态锁池仅取决于在脚本中传给静态锁函数集合的唯一静态字符串数量。


*默认值为 "32"。*


```opensips title="Setting lock_pool_size module parameter"
modparam("cfgutils", "lock_pool_size", 64)
```


### 导出函数 {#exported-functions}


#### rand_event([probability])


生成一个 0 - 100 之间的随机浮点值，若该值小于或等于当前设定的概率则返回 true。如果给出了 "probability" 参数，它将覆盖由 [rand_set_prob()](#rand_set_probprobability) 设定的全局参数。


参数：


- probability (int, optional) - 概率覆盖值


```opensips title="rand_event() usage"
...
if (rand_event()) {
  append_to_reply("Retry-After: 120\n");
  sl_send_reply(503, "Try later");
  exit;
}
# 之后的常规消息处理
...
```


#### rand_set_prob(probability) {#rand_set_probprobability}


设置决策的 "probability"。


参数：


- probability (int) - 从 0 到 99（含）的数字


```opensips title="rand_set_prob() usage"
...
rand_set_prob(4);
...
```


#### rand_reset_prob()


将概率重置回 [initial_probability](#initial_probability-string) 值。


```opensips title="rand_reset_prob() usage"
...
rand_reset_prob();
...
```


#### rand_get_prob()


返回当前的概率设置，例如用于日志记录。


```opensips title="rand_get_prob() usage"
...
rand_get_prob();
   
```


#### sleep(time) {#sleeptime}


等待 "time" 秒。


参数含义如下：


- *time (int)* - 以秒为单位的等待时间


该函数可在 REQUEST_ROUTE、ONREPLY_ROUTE、FAILURE_ROUTE、BRANCH_ROUTE 中使用。


```opensips title="sleep usage"
...
sleep(1);
...
$var(secs) = 10;
sleep($var(secs));
...
			
```


#### usleep(time) {#usleeptime}


等待 "time" 微秒。


参数含义如下：


- *time (int)* - 以微秒为单位的等待时间


该函数可在 REQUEST_ROUTE、ONREPLY_ROUTE、FAILURE_ROUTE、BRANCH_ROUTE 中使用。


```opensips title="usleep usage"
...
usleep(500000); # sleep half a sec
...
			
```


#### abort()


用于调试的函数，会中止服务器。取决于服务器的配置，可能会生成核心转储（core dump）。


该函数可在 REQUEST_ROUTE、ONREPLY_ROUTE、FAILURE_ROUTE、BRANCH_ROUTE 中使用。


```opensips title="abort usage"
...
abort();
...
			
```


#### pkg_status()


用于调试的函数，转储私有（PKG）内存的状态。该信息会记录到默认日志设施，具体取决于全局日志级别和 memlog 设置。需要以启用了内存调试的方式编译服务器，才能获得详细信息。


该函数可在 REQUEST_ROUTE、ONREPLY_ROUTE、FAILURE_ROUTE、BRANCH_ROUTE 中使用。


```opensips title="pkg_status usage"
...
pkg_status();
...
			
```


#### shm_status()


用于调试的函数，转储共享（SHM）内存的状态。该信息会记录到默认日志设施，具体取决于全局日志级别和 memlog 设置。需要以启用了内存调试的方式编译服务器，才能获得详细信息。


该函数可在 REQUEST_ROUTE、ONREPLY_ROUTE、FAILURE_ROUTE、BRANCH_ROUTE 中使用。


```opensips title="shm_status usage"
...
shm_status();
...
			
```


#### set_count(var_to_count, ret_var)


统计给定变量值的数量。仅对可承载多个值的变量（AVP、头域）调用该函数才有意义。


结果在第二个参数中返回。


该函数可在 REQUEST_ROUTE、ONREPLY_ROUTE、FAILURE_ROUTE、BRANCH_ROUTE 中使用。


```opensips title="set_count usage"
...
set_count($avp(dids), $var(num_dids));
...
			
```


#### set_select_weight(int_list_var)


该函数从给定的 "int_list_var" 变量的整型值所构成的集合中选择一个元素。它采用遗传算法——轮盘赌选择法从集合中挑选元素。选中某个元素的概率与其权重成正比。函数将返回所选元素的索引。


该函数可在 REQUEST_ROUTE、ONREPLY_ROUTE、FAILURE_ROUTE、BRANCH_ROUTE 中使用。


```opensips title="set_select_weight usage"
...
$var(next_gw_idx) = set_select_weight($avp(gw_success_rates));
...
			
```


#### ts_usec_delta(t1_sec, t1_usec, t2_sec, t2_usec, [delta_str], [delta_int])


该函数返回两个给定时间戳之间的绝对差值。结果以*微秒*表示，可以按字符串或整型返回。


**警告：** 使用 *delta_int* 时，若差值超出有符号整型所能容纳的范围（即差值约 35 分钟或更大），函数将返回错误码 **-1**！


该函数可在 REQUEST_ROUTE、ONREPLY_ROUTE、FAILURE_ROUTE、BRANCH_ROUTE 中使用。


```opensips title="ts_usec_delta usage"
...
ts_usec_delta($var(t1s), 300, 10, $var(t2us), $var(diff_str));
...
			
```


#### check_time_rec(time_string, [timestamp])


如果指定的时间重复（time recurrence）字符串与当前时间匹配，函数返回正值，否则返回负值。


若要检查当前时间之外的某个 Unix 时间戳，第二个参数应包含要检查的目标时间戳。


各字段的语法与 RFC 2445 中对应字段完全一致。


该函数可用于任何路由。成功时返回 1，失败、解析错误或内部错误时分别返回 -1、-2 或 -3。


参数含义如下：


- *time_string (string)* - 时间重复字符串，将与当前时间进行匹配。其字段以 "|" 分隔，给出的顺序为："timezone | dtstart | dtend | duration | freq | until | interval | byday | bymday | byyday | byweekno | bymonth"。"freq" 之后的字段除非定义了 "freq"，否则都不使用。如果字符串以多个空字段结尾，这些空字段可以全部省略。"timezone" 字段是可选的，它表示解释时间重复元素（例如 dtstart、dtend、until）所采用的时区。默认使用系统时区。
- *timestamp (string, optional)* - 要检查的特定 Unix 时间。函数在此处只期望实际的 Unix 时间，无需进行任何时区调整。


此外，可以通过逻辑 AND（"&"）、OR（"/"）和 NEG（"!"）运算符连接多个（上述的）时间重复字符串，构造更复杂的时间重复字符串。并且，表达式可以加括号。一些示例：


- 20210104T080000|20211231T180000||WEEKLY|||MO,TU,WE,TH,FR
&
!20210104T120000|20211231T140000||WEEKLY|||MO,TU,WE,TH,FR
该示例多重复表达式表示公司 X 在 2021 年的工作日时间表：8-18 点为工作时间，但 12-14 点区间除外，此时所有人都外出午餐、业务关闭。由于每个时间表都省略了时区，因此改用操作系统时区。
- America/New_York|20210104T090000|20210104T170000||WEEKLY|||MO,TU,WE,TH,FR
&
!(Europe/Amsterdam|20210427T000000|20210428T000000 / Europe/London|20211227T000000|20211228T000000)
该示例多重复表达式表示总部在美国的公司 Y 在 2021 年的工作日时间表：9-17 点为工作时间（纽约时区），但欧洲假日除外，例如国王节（4 月 27 日，荷兰）或春季银行假日（5 月 31 日，英国），此时其大部分员工已飞回欧洲。


```opensips title="check_time_rec usage"
...
# 仅当仍处于 2012 年且位于与布加勒斯特兼容的时区时才通过
if (check_time_rec("Europe/Bucharest|20120101T000000|20130101T000000"))
	xlog("Current system time matches the given Romanian time interval\n");
...
# 仅当距 "dtstart" 不足 30 天时才通过，使用系统时区
if (check_time_rec("20121101T000000||p30d"))
	xlog("Current time matches the given interval\n");
...
			
```


#### get_static_lock(key)


获取与 "key" 对应的静态锁。若该锁已被其他进程占用，脚本执行将暂停，直到该锁被释放。同一进程若在未先释放的情况下再次尝试获取该锁，将导致死锁。


静态锁函数保证两个不同的字符串绝不会指向同一把锁，从而避免在进程之间引入不必要的（而且是透明的！）同步。其缺点在于参数的性质（静态字符串），这使得它们在特定场景下不适用。


参数含义如下：


- *key (static string)* - 将被哈希以获得静态锁索引的键


该函数可在 REQUEST_ROUTE、FAILURE_ROUTE、ONREPLY_ROUTE、BRANCH_ROUTE、LOCAL_ROUTE、STARTUP_ROUTE、TIMER_ROUTE、EVENT_ROUTE 中使用。


```opensips title="get_static_lock usage"
# 获取并释放一个静态锁 
...
get_static_lock("Zone_1");
...
release_static_lock("Zone_1");
...
```


#### release_static_lock(key)


释放与 "key" 对应的静态锁。若该锁未被获取，则什么都不会发生。


参数含义如下：


- *key (static string)* - 将被哈希以获得静态锁索引的键。


该函数可在 REQUEST_ROUTE、FAILURE_ROUTE、ONREPLY_ROUTE、BRANCH_ROUTE、LOCAL_ROUTE、STARTUP_ROUTE、TIMER_ROUTE|EVENT_ROUTE 中使用。


```opensips title="release_static_lock usage"
# 获取并释放一个静态锁 
...
get_static_lock("Zone_1");
...
release_static_lock("Zone_1");
...
```


#### get_dynamic_lock(key)


获取与 "key" 对应的动态锁。若该锁已被其他进程占用，脚本执行将暂停，直到该锁被释放。同一进程若在未先释放的情况下再次尝试获取该锁，将导致死锁。


动态锁函数的优点在于允许将字符串变量作为参数传入，但其缺点是两个字符串可能具有相同的哈希值，从而指向同一把锁。因此，要么脚本中两个完全独立的区域会被同步（它们不会并行执行），要么某个进程可能因连续在两把不同的（但哈希值相同的）字符串上获取锁而最终陷入死锁。为解决后一问题，可使用 [strings_share_lock()](#strings_share_lockkey1-key2) 函数测试两个字符串是否哈希到同一把动态锁。


参数含义如下：


- *key (var)* - 将被哈希以从锁池中获得动态锁索引的键


该函数可在 REQUEST_ROUTE、FAILURE_ROUTE、ONREPLY_ROUTE、BRANCH_ROUTE、LOCAL_ROUTE、STARTUP_ROUTE、TIMER_ROUTE|EVENT_ROUTE 中使用。


```opensips title="get_dynamic_lock usage"
...
# 基于 "Call-ID" 头域值获取并释放一个动态锁
if (!get_dynamic_lock($ci)) {
	xlog("Error while getting dynamic lock!\n");
}
...
if (!release_dynamic_lock($ci) {
	xlog("Error while releasing dynamic lock!\n");
}
...
```


#### release_dynamic_lock(key)


释放与 "key" 对应的动态锁。若该锁未被获取，则什么都不会发生。


参数含义如下：


- *key (var)* - 将被哈希以从锁池中获得动态锁索引的键


该函数可在 REQUEST_ROUTE、FAILURE_ROUTE、ONREPLY_ROUTE、BRANCH_ROUTE、LOCAL_ROUTE、STARTUP_ROUTE、TIMER_ROUTE|EVENT_ROUTE 中使用。


```opensips title="release_dynamic_lock usage"
...
# 基于 "Call-ID" 头域值获取并释放一个动态锁
if (!get_dynamic_lock($ci)) {
	xlog("Error while getting dynamic lock!\n");
}
...
if (!release_dynamic_lock($ci) {
	xlog("Error while releasing dynamic lock!\n");
}
...
```


#### strings_share_lock(key1, key2) {#strings_share_lockkey1-key2}


用于测试两个字符串是否会生成相同哈希值的函数。其目的在于避免某进程连续在两把恰好指向同一把锁的动态锁（基于两个字符串）上获取时产生的死锁。


理论上，两个字符串生成相同哈希值的概率会随 [lock_pool_size](#lock_pool_size-integer) 参数的增大而成比例降低。换言之，为模块配置的动态锁越多，脚本中各个受保护区域全部并行运行（互不等待）的概率就越高。


参数含义如下：


- *key1, key2 (string)* - 将比较其哈希值的字符串


该函数可在 REQUEST_ROUTE、FAILURE_ROUTE、ONREPLY_ROUTE、BRANCH_ROUTE、LOCAL_ROUTE、STARTUP_ROUTE、TIMER_ROUTE|EVENT_ROUTE 中使用。


```opensips title="strings_share_lock usage"
...
# 连续获取两把动态锁的正确方式
if (!get_dynamic_lock($avp(foo))) {
	xlog("Error while getting dynamic lock!\n");
}

if (!strings_share_lock($avp(foo), $avp(bar)) {
	if (!get_dynamic_lock($avp(bar))) {
		xlog("Error while getting dynamic lock!\n");
	}
}
...
if (!strings_share_lock($avp(foo), $avp(bar)) {
	if (!release_dynamic_lock($avp(bar)) {
		xlog("Error while releasing dynamic lock!\n");
	}
}

if (!release_dynamic_lock($avp(foo))) {
	xlog("Error while releasing dynamic lock!\n");
}
...
```


#### get_accurate_time(sec, usec, [str_sec_usec])


以微秒精度获取当前 Unix 时间纪元。可选择将该值以浮点数形式输出（第三个参数）。


参数含义如下：


- *sec (int)* - 当前 Unix 时间戳（整数部分）
- *usec (int)* - 当前 Unix 时间戳（小数部分）
- *str_sec_usec (string, optional)* - 当前 Unix 时间戳的浮点数形式（6 位小数精度）


该函数可在 REQUEST_ROUTE、FAILURE_ROUTE、ONREPLY_ROUTE、BRANCH_ROUTE、LOCAL_ROUTE、STARTUP_ROUTE、TIMER_ROUTE、EVENT_ROUTE 中使用。


```opensips title="get_accurate_time usage"
...
get_accurate_time($var(sec), $var(usec));
xlog("Current Unix timestamp: $var(sec) s, $var(usec) us\n");
...
```


#### shuffle_avps(name)


随机打乱 *name* 对应的 AVP。


参数含义如下：


- *name (variable)* - 要打乱的 AVP 名称。


该函数可在 REQUEST_ROUTE、FAILURE_ROUTE、BRANCH_ROUTE、LOCAL_ROUTE 和 ONREPLY_ROUTE 中使用。


```opensips title="shuffle_avps usage"
...
$avp(foo) := "str1";
$avp(foo)  = "str2";
$avp(foo)  = "str3";
xlog("Initial AVP list is: $(avp(foo)[*])\n");       # str3 str2 str1
if(shuffle_avps( $avp(foo) ))
    xlog("Shuffled AVP list is: $(avp(foo)[*])\n");  # str1, str3, str2 (for example)
...
				
```


### 导出的异步函数 {#exported-asynchronous-functions}


#### sleep(seconds)


等待若干秒。该函数与 [sleep()](#sleeptime) 完全一致，只是以异步方式执行。脚本执行会被挂起，直到等待结束；随后 OpenSIPS 通过恢复路由（resume route）恢复脚本执行。


要阅读并了解更多关于异步函数、如何使用它们以及它们的优势，请参阅 OpenSIPS 在线手册。


```opensips title="async sleep usage"
{
...
async( sleep(5), after_sleep );
}

route[after_sleep] {
...
}
```


#### usleep(seconds)


等待若干微秒。该函数与 [usleep()](#usleeptime) 完全一致，只是以异步方式执行。脚本执行会被挂起，直到等待结束；随后 OpenSIPS 通过恢复路由（resume route）恢复脚本执行。


要阅读并了解更多关于异步函数、如何使用它们以及它们的优势，请参阅 OpenSIPS 在线手册。


```opensips title="async usleep usage"
{
...
async( usleep(1000), after_usleep );
}

route[after_usleep] {
...
}
```


### 导出的 MI 函数 {#exported-mi-functions}


#### rand_set_prop


将概率值设置为给定参数。


参数：


- *prob_proc* - 该参数应为百分比值（0 到 99 的数字）。


```bash title="rand_set_prob usage"
...
$ opensips-cli -x mi rand_set_prob 10
...
```


#### rand_reset_prob


将概率值重置为最初的起始值。


该命令不需要参数。


```bash title="rand_reset_prob usage"
...
$ opensips-cli -x mi rand_reset_prob
...
```


#### rand_get_prob


返回实际的概率设置。


该函数返回实际的概率值。


```bash title="rand_get_prob usage"
...
$ opensips-cli -x mi get_prob
The actual probability is 50 percent.
...
```


#### check_config_hash


检查当前配置文件哈希是否与存储的哈希一致。


若哈希值一致，函数返回 200 OK；不一致返回 400；未配置用于哈希的文件返回 404；出错返回 500。此外还会打印一条简短的文本消息。


```bash title="check_config_hash usage"
...
$ opensips-cli -x mi check_config_hash
The actual config file hash is identical to the stored one.
...
```


#### get_config_hash


返回存储的配置文件哈希。


成功时函数返回 200 OK 及哈希值；未配置用于哈希的文件时返回 404。


```bash title="get_config_hash usage"
...
$ opensips-cli -x mi get_config_hash
1580a37104eb4de69ab9f31ce8d6e3e0
...
```


#### shv_set


设置共享变量（$shv(name)）的值。


参数：


- *name*：共享变量名
- *type*：值的类型

  - "int"：整型值
  - "str"：字符串值
- *value*：要设置的值


```bash title="shv_set usage"
...
$ opensips-cli -x mi shv_set debug int 0
...
```


#### shv_get


获取共享变量（$shv(name)）的值。


参数：


- *name*：共享变量名。若缺少该参数，则返回所有共享变量。


```bash title="shv_get usage"
...
$ opensips-cli -x mi shv_get debug
$ opensips-cli -x mi shv_get
...
```


### 导出的伪变量 {#exported-pseudo-variables}


#### $env(name)


该 PV 提供对名为 'name' 的环境变量的访问。


```opensips title="env(name) pseudo-variable usage"
...
xlog("PATH environment variable is $env(PATH)\n");
...
				 
```


#### $RANDOM


返回 [0 - 2^31) 范围内的一个随机值。


```opensips title="RANDOM pseudo-variable usage"
...
$avp(10) = ($RANDOM / 16777216); # 2^24
if ($avp(10) < 10) {
   $avp(10) = 10;
}
append_to_reply("Retry-After: $avp(10)\n");
sl_send_reply(503, "Try later");
exit;
# 之后的常规消息处理
   
				 
```


#### $ctime(name)


该 PV 提供对分解时间（broken-down time）属性的访问。


"name" 可以是：


- *sec* - 返回秒（int 0-59）
- *min* - 返回分钟（int 0-59）
- *hour* - 返回小时（int 0-23）
- *mday* - 返回月内日期（int 0-59）
- *mon* - 返回月份（int 1-12）
- *year* - 返回年份（int，例如 2008）
- *wday* - 返回星期几（int，1=星期日 - 7=星期六）
- *yday* - 返回年内日期（int，1-366）
- *isdst* - 返回夏令时状态（int，0 - 夏令时关闭，>0 夏令时开启）


```opensips title="ctime(name) pseudo-variable usage"
...
if ($ctime(year) == 2008) {
	xlog("request: $rm from $fu to $ru in year 2008\n");
}
...
				 
```


#### $shv(name)


这是一类存储在共享内存中的伪变量。$shv(name) 的值对所有 opensips 进程可见。每个 "shv" 只有一个值，并被初始化为整型 0。你可以使用 "shvset" 参数来初始化该共享变量。该模块导出了一组 MI 函数，用于获取/设置共享变量的值。


```opensips title="shv(name) pseudo-variable usage"
...
modparam("cfgutils", "shvset", "debug=i:1")
...
if ($shv(debug) == 1) {
	xlog("request: $rm from $fu to $ru\n");
}
...
				 
```
<!-- CONTRIBUTORS -->

### 许可证 {#license}

所有文档文件（即 .md 扩展名）均按 Creative Common License 4.0 授权。
