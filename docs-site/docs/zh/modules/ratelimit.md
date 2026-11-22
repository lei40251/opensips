---
title: "ratelimit 模块"
description: "该模块为 SIP 请求实现速率限制。"
---


## 管理指南 {#admin-guide}


### 概述 {#overview}


该模块为 SIP 请求实现速率限制。与 PIKE 模块不同，它按每种 SIP 请求类型来限制流量，而不是按源 IP。最新的源码允许将多条消息动态归入某些实体，并基于这些实体限制流量。MI 接口可用于在 OpenSIPS 运行期间修改可调参数。


该模块与 OpenSIPS 键值（Key-Value）接口集成，借助 Redis 或 Memcached CacheDB 后端支持分布式速率限制。内部限制数据将不再保存在每个 OpenSIPS 实例上，而是存储在分布式键值数据库中，各实例在决定是否拦截某条 SIP 消息之前会先查询该数据库。


为实现分布式速率限制特性，模块还可以通过 clusterer 模块将其管道计数器复制到不同的 OpenSIPS 实例。要做到这一点，请在配置脚本中定义 *pipe_replication_cluster* 参数。


从 OpenSIPS 3.2 开始，选择通过 CacheDB 后端还是 bin 复制来复制管道，由创建管道时指定的标志决定：在管道名称后添加 */r* 后缀将通过 CacheDB 复制，添加 */b* 则通过 bin/clusterer 复制。


### 使用场景 {#use-cases}


限制消息在系统上的处理速率会直接影响负载。ratelimit 模块可用于保护单台主机，或在将其运行于前端的调度机上时保护 OpenSIPS 集群。


当速率限制不仅需要在特定节点上执行，而是要在整个平台上执行时，分布式限制就很有用。


> [!NOTE]
> 仅当所使用的管道算法为 TAILDROP 或 RED 时，此行为才有意义。


一个示例配置片段可能如下所示：


```opensips
...
	if (!rl_check($rU, 50, "TAILDROP")) {
		sl_send_reply(503, "Server Unavailable");
		exit;
	};
...
```


对上述每条进入的请求都会调用 rl_check，并对由 R-URI 用户标识的实体进行检查。如果当前每请求负载低于配置的阈值，则返回 OK 代码。如果负载超限，函数返回错误，管理员可以用无状态应答丢弃这些请求。


### 静态速率限制算法 {#static-rate-limiting-algorithms}


ratelimit 模块支持两种不同的静态算法，供 rl_check 判断某条消息是否应被拦截。


#### Tail Drop Algorithm (TAILDROP)


这是一种简单的算法，与较长的定时器间隔配合使用时存在一定风险。在每个间隔开始时，内部计数器被重置，并对每条进入的消息递增。一旦计数器达到配置的上限，rl_check 便返回错误。


该算法的缺点是可能导致 SIP 客户端同步。在相对较长的间隔内，只有最初的若干请求（即 REGISTER）能够通过。后续消息（即 RE-REGISTER）会在共同的 Expire 定时器到期时同时冲击 SIP 代理。其他请求会在给定时间之后重传，所有具有相同固件/同一厂商的设备都是如此。


#### Random Early Detection Algorithm (RED)


Random Early Detection 通过测量平均负载并动态调整丢弃率，试图规避尾丢弃算法带来的同步问题。使用 RED 算法运行时，OpenSIPS 会每隔 n 个报文向 OpenSIPS 路由引擎返回错误，力图将上一计时器间隔测得的负载均匀分摊到当前间隔。其负面效应是，即使在该间隔内可能尚未达到上限，OpenSIPS 也可能丢弃消息。若遇到这种情况，请减小计时器间隔。


#### Slot Based Taildropping (SBT)


SBT 维护一个由一个或多个时隙（slot）组成的窗口。可以设置 *window_size* 参数（秒），表示向前回溯多长时间来统计呼叫；以及 *slot_period* 参数（毫秒），表示算法的粒度。时隙数量为 *window_size*/*slot_period*。例如，若 *window_size*=*slot_period*=1 秒，则每过一秒就会丢失呼叫计数；但若将 *slot_period* 设为 100 毫秒，那么当某次呼叫落到窗口之外时，前 100 毫秒内的呼叫会被丢弃，而随后 900 毫秒内的呼叫会被保留。


#### Network Algorithm (NETWORK)


该算法依赖网络接口提供的信息。每隔 timer_interval 秒获取一次所有网络接口上等待处理的字节总量。若返回的数量超过 modparam 中指定的上限，rl_check 返回错误。


### 动态速率限制算法 {#dynamic-rate-limiting-algorithms}


在不同机器上运行 OpenSIPS 时，必须调整静态算法的丢弃率，以维持低于 100% 的平均负载，否则报文会开始在网络栈中被丢弃。这本身并不困难，但也既不精确也不简单：另一台占用相当比例 CPU 时间的服务器将需要重新调整参数。


虽然可以根据某个系数从外部调整丢弃率，但让算法在 ratelimit 内部运行，就允许基于服务器内部参数调整速率，因而更为灵活（或者说，当加入对外部负载因子——而非 CPU 负载——的支持后，将会如此）。


#### Feedback Algorithm (FEEDBACK)


使用 PID 控制器模型（参见 [Wikipedia page](http://en.wikipedia.org/wiki/PID_controller)），丢弃率会根据负载因子动态调整，使负载因子始终向指定上限（用 PID 术语说是设定点）漂移。


由于读取 CPU 平均负载相对昂贵（打开 /proc/stat、解析等），因此只每隔 timer_interval 秒执行一次，相应地 FEEDBACK 值也只在这些间隔处重新计算。这反过来又使丢弃率难以快速调整。最坏的情形是请求速率瞬间升降数千，控制器需要长达 20 秒才能适应新的请求速率。


不过一般来说，由于现实中的请求速率波动较小，适应应该快得多。


> [!IMPORTANT]
> 由于该算法由负载因子驱动，上限的取值必须介于 0 和 100 之间（以百分比表示），并且所有检查和管道的上限必须相同（只用一个值）。同样，这一限制是该算法特有的，而非实现层面的。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


在加载本模块之前必须先加载以下模块：


- *不依赖其他 OpenSIPS 模块*。


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，必须安装以下库或应用程序：


- *无*。


### 导出的参数 {#exported-parameters}


#### timer_interval (integer)


Network 和 Feedback 算法执行查询、其他算法重置计数器的定时器间隔，单位为秒。


> [!IMPORTANT]
> 取值过小可能因定时器进程过载而导致性能损失。


*默认值为 10。*


```opensips title="设置 timer_interval 参数"
...
modparam("ratelimit", "timer_interval", 5)
...
```


#### limit_per_interval (integer)


该参数配置在 *rl_check* 函数中指定管道上限的方式，仅影响 Taildrop 和 RED 算法。值为 1 表示上限按每个 *timer_interval* 设置，值为 0 表示按秒设置。


*默认值为 0（按秒限制）。*


```opensips title="设置 limit_per_interval 参数"
...
modparam("ratelimit", "limit_per_interval", 1)
...
```


#### expire_time (integer)


该参数指定管道在变为空闲（不再对其执行任何操作）后，应在内存中保留多久才被删除。


*默认值为 3600。*


```opensips title="设置 expire_time 参数"
...
modparam("ratelimit", "expire_time", 1800)
...
```


#### hash_size (integer)


内部用于保存管道的哈希表大小。更大的表速度更快，但消耗更多内存。哈希大小必须是 2 的幂。


*默认值为 1024。*


```opensips title="设置 hash_size 参数"
...
modparam("ratelimit", "hash_size", 512)
...
```


#### default_algorithm (string)


指定在 *rl_check* 函数中未显式指定算法时应采用的算法。


*默认值为 "TAILDROP"。*


```opensips title="设置 default_algorithm 参数"
...
modparam("ratelimit", "default_algorithm", "RED")
...
```


#### cachedb_url (string)


启用分布式速率限制，并指定 CacheDB 接口应使用的后端。


*默认值为 "disabled"。*


```opensips title="设置 cachedb_url 参数"
...
modparam("ratelimit", "cachedb_url", "redis://root:root@127.0.0.1/")
...
```


#### db_prefix (string)


指定应添加到管道名称前的前缀。仅在启用分布式速率限制时使用。


*默认值为 "rl_pipe_"。*


```opensips title="设置 db_prefix 参数"
...
modparam("ratelimit", "db_prefix", "ratelimit_")
...
```


#### repl_buffer_threshold (integer)


用于指定二进制复制所用缓冲区的长度（字节），达到该长度时执行刷新——此前收集的管道应被发送到网络上。这用于避免为管道复制占用大量内存。


*默认值为 32767 字节。*


```opensips title="设置 repl_buffer_threshold 参数"
...
modparam("ratelimit", "repl_buffer_threshold", 500)
...
```


#### repl_timer_interval (integer)


定时器，单位为毫秒，用于指定模块应多久向其他实例复制其计数器。


*默认值为 200 ms。*


```opensips title="设置 repl_timer_interval 参数"
...
modparam("ratelimit", "repl_timer_interval", 100)
...
```


#### repl_timer_expire (integer)


定时器，单位为秒，用于指定从其他实例收到的计数器从何时起不再计入。这用于防止实例停止复制计数器时残留过期值。


*默认值为 10 s。*


```opensips title="设置 repl_timer_expire 参数"
...
modparam("ratelimit", "repl_timer_expire", 10)
...
```


#### pipe_replication_cluster (integer)


指定管道将被复制到以及从中接收的集群 ID。


*默认值为 0（不复制）。*


```opensips title="设置 pipe_replication_cluster 参数"
...
modparam("ratelimit", "pipe_replication_cluster", 1)
...
```


#### window_size (int)


SBT 中历史记录的长度，单位为秒。


*默认值为 "10"。*


```opensips title="设置 window_size 参数"
...
modparam("ratelimit", "window_size", 5)
...
```


#### slot_period (int)


一个时隙的取值，单位为毫秒。该参数决定算法的粒度。时隙数量由 window_size/slot_period 决定。


*默认值为 "200"。*


```opensips title="设置 slot_period 参数"
...
modparam("ratelimit", "window_size", 5)
#我们将有 50 个 100 毫秒的时隙
modparam("ratelimit", "slot_period", 100)
...
```


### 导出的函数 {#exported-functions}


#### rl_check(name, limit[, algorithm])


对照由 name 标识的管道检查当前请求，并更改/更新上限。如果未找到对应管道，则使用指定的上限和（若指定了）算法创建新管道。如果 algorithm 参数不存在，则使用默认算法。


> [!NOTE]
> 管道的算法无法动态更改。只有创建管道时指定的算法才会被采用。


> [!NOTE]
> 每次调用该函数都会递增管道的计数器，即使该调用应被拒绝。因此，如果使用 ratelimit 仅限制成功的流量，你需要针对被拒绝的呼叫，用 *rl_dec_count()* 函数显式减少计数器。


如果匹配到的管道已达上限，该方法将返回错误码。


各参数含义如下：


- *name* (string) - 标识应检查的管道的名称。也可以指定 */s* 后缀以表示该管道应通过 cachedb 复制，或指定 */b* 以通过 bin/clusterer 接口复制。
- *limit* (int) - 指定管道的阈值上限。它与所用的算法密切相关。请注意上限应按每秒指定，而不是按 timer_interval。
- *algorithm* (string, optional) - 该参数指用于检查管道的算法。若未设置，则使用默认值。


该函数可在 REQUEST_ROUTE、FAILURE_ROUTE、ONREPLY_ROUTE、BRANCH_ROUTE、ERROR_ROUTE、LOCAL_ROUTE、TIMER_ROUTE 和 EVENT_ROUTE 中使用。


```opensips title="rl_check 用法"
...
	# 对所有 INVITE 方法使用 RED 算法执行管道匹配
	if (is_method("INVITE")) {
		if (!rl_check("pipe_INVITE", 100, "RED")) {
			sl_send_reply(503, "Server Unavailable");
			exit;
		};
	};
...
	# 对每个不同的网关使用默认算法
	$var(limit) = 10;
	if (!rl_check("gw_$ru", $var(limit))) {
		sl_send_reply(503, "Server Unavailable");
		exit;
	};
...
	# 仅统计成功的呼叫
	if (!rl_check("gw_$ru", 100)) {
		rl_dec_count("gw_$ru");
		sl_send_reply(503, "Server Unavailable");
		exit;
	};
...
```


#### rl_dec_count(name)


该函数减少一个此前可能已由 *rl_check* 函数递增过的计数器。


各参数含义如下：


- *name* (string) - 标识管道的名称。


该函数可在 REQUEST_ROUTE、FAILURE_ROUTE、ONREPLY_ROUTE、BRANCH_ROUTE、ERROR_ROUTE、LOCAL_ROUTE、TIMER_ROUTE 和 EVENT_ROUTE 中使用。


```opensips title="rl_dec_count 用法"
...
	if (!rl_check("gw_$ru", 100, "TAILDROP")) {
		exit;
	} else {
		rl_dec_count("gw_$ru");
	};
...
```


#### rl_reset_count(name)


该函数重置一个此前可能已由 *rl_check* 函数递增过的计数器。


各参数含义如下：


- *name* - 标识管道的名称。


该函数可在 REQUEST_ROUTE、FAILURE_ROUTE、ONREPLY_ROUTE、BRANCH_ROUTE、ERROR_ROUTE、LOCAL_ROUTE、TIMER_ROUTE 和 EVENT_ROUTE 中使用。


```opensips title="rl_reset_count 用法"
...
	if (!rl_check("gw_$ru", 100, "TAILDROP")) {
		exit;
	} else {
		rl_reset_count("gw_$ru");
	};
...
```


#### rl_values(ret_avp, regexp)


将所有可用管道的名称返回到 *ret_avp* 输出变量中。


各参数含义如下：


- *ret_avp* (string) - 用于存放管道名称的 AVP。
- *regexp* (regex, optional) - 用于过滤管道名称的正则表达式。若缺省，则返回所有管道。


该函数可在任意路由中使用。


```opensips title="rl_values 用法"
...
	rl_values($avp(values));
	for ($var(pipe) in $(avp(values)[*]))
		xlog("RATELIMIT: $var(pipe): $rl_count($var(pipe))\n");
...
```


### 导出的 MI 函数 {#exported-mi-functions}


#### rl_list


列出 ratelimit 模块中的参数和变量。


名称：*rl_list*


参数：


- *pipe*（可选）- 指明要列出的单个管道的名称。
- *filter*（可选）- 用于筛选待列出的活动管道的模式。该过滤器是 shell 通配符模式（参见 glob(7)）。
- *filter_out*（可选）- 用于筛除不应列出的活动管道的模式。该过滤器是 shell 通配符模式（参见 glob(7)）。


> [!NOTE]
> 调用该函数时不能组合多个参数。若使用参数，只接受一个。


若未向函数传递任何参数，则列出所有活动管道。


MI FIFO 命令格式：


```bash
opensips-cli -x mi rl_list pipe=gw_10.0.0.1
opensips-cli -x mi rl_list filter=gw_*
```


#### rl_dump_pipe


暴露某个管道当前运行时数据（特定于该管道的算法）的全部细节。目前对 SBT 有意义。


名称：*rl_dump_pipe*


参数：


- *pipe* - 指明管道的名称。


MI FIFO 命令格式：


```bash
opensips-cli -x mi rl_dump_pipe gw_10.0.0.1
```


#### rl_reset_pipe


重置指定管道的计数器。


名称：*rl_reset_pipe*


参数：


- *pipe* - 指明应重置其计数器的管道名称。


MI FIFO 命令格式：


```bash
opensips-cli -x mi rl_reset_pipe gw_10.0.0.1
```


#### rl_set_pid


设置 Feedback 算法的 PID 控制器参数。


名称：*rl_set_pid*


参数：


- *ki* - 积分参数。
- *kp* - 比例参数。
- *kd* - 微分参数。


MI FIFO 命令格式：


```bash
opensips-cli -x mi rl_set_pid 0.5 0.5 0.5
```


#### rl_get_pid


获取正在使用的 PID 控制器参数列表。


名称：*rl_get_pid*


参数：*无*


MI FIFO 命令格式：


```bash
opensips-cli -x mi rl_get_pid
```


### 导出的伪变量 {#exported-pseudo-variables}


#### $rl_count(name)


返回管道的计数器。该变量为只读。


若管道不存在，将返回 NULL。
<!-- CONTRIBUTORS -->

### 许可证 {#license}

所有文档文件（即 .md 扩展名）均按 Creative Common License 4.0 许可。
