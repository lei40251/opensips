---
title: "load_balancer 模块"
description: "Load-Balancer 模块用于提供基于负载的流量路由。"
sidebar: false
---

## 管理指南 {#admin-guide}


### 概述 {#overview}


Load-Balancer 模块用于提供基于负载的流量路由。简言之，当 OpenSIPS 将呼叫路由到一组目的地时，它能够记录每个目的地的负载状态（即进行中的呼叫数），并选择路由到（当时）负载较低的目的地。OpenSIPS 了解每个目的地的容量——它预先配置了目的地可接受的最大负载。更精确地说，在进行路由时，OpenSIPS 考虑的不是进行中呼叫数最少的目的地，而是可用槽位最多的目的地，即负载较低的目的地。


此外，该模块还具备故障切换能力（如果选中的目的地无响应，则尝试新的目的地）、保持目的地状态的能力（记住失败的目的地并避免再次使用它们），以及检查目的地健康状况的能力（通过对目的地进行探测并自动重新启用）。


### 工作原理 {#how-it-works}


请参考 OpenSIPS 网站上的 Load-Balancer 教程：[https://docs.opensips.org/tutorials/loadbalancing/](https://docs.opensips.org/tutorials/loadbalancing/)。


### 探测与禁用目的地 {#probing-and-disabling-destinations}


该模块能够通过执行 SIP 探测（发送诸如 OPTIONS 之类的 SIP 请求）来监控目的地的状态。


对于每个目的地，可以配置应执行何种探测（probe_mode 列）：


- *(0)* - 完全不探测；
- *(1)* - 仅当目的地处于禁用模式时才探测（通过 MI 命令禁用也会完全停止探测）。当下一次探测成功时，目的地将被自动重新启用；
- *(2)* - 始终探测。如果被禁用，当下一次探测成功时，目的地将被自动重新启用；


目的地可以通过两种方式变为禁用：


- 脚本检测
- MI 命令


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


在加载本模块之前必须先加载以下模块：


- *Dialog* - Dialog 模块
*freeswitch*。 - 仅在启用 "fetch_freeswitch_stats" 时。
- *dialog* - TM 模块（仅在启用探测时）
- *clusterer* - 仅在启用 "cluster_id" 选项时。
- *database* - 任一 DB 模块


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，必须先安装以下库或应用程序：


- *无*。


### 导出的参数 {#exported-parameters}


#### db_url (string)


指向存储负载均衡规则的数据库的 URL。


*默认值为 "mysql://opensips:opensipsrw@localhost/opensips"。*


```opensips title="Set db_url parameter"
...
modparam("load_balancer", "db_url", "dbdriver://username:password@dbhost/dbname")
...
```


#### db_table (string)


包含负载均衡规则的 DB 表的名称。


*默认值为 "load_balancer"。*


```opensips title="Set db_table parameter"
...
modparam("load_balancer", "db_table", "lb")
...
```


#### probing_interval (integer)


对目的地执行探测的频率（以秒为单位）。如果设置为 0，探测功能将被禁用（对所有目的地）。


*默认值为 "30"。*


```opensips title="Set probing_interval parameter"
...
modparam("load_balancer", "probing_interval", 60)
...
```


#### probing_method (string)


用于探测请求的 SIP 方法。


*默认值为 "OPTIONS"。*


```opensips title="Set probing_method parameter"
...
modparam("load_balancer", "probing_method", "INFO")
...
```


#### probing_from (string)


在 SIP 探测请求中通告的 FROM SIP URI。


*默认值为 "sip:prober@localhost"。*


```opensips title="Set probing_from parameter"
...
modparam("load_balancer", "probing_from", "sip:pinger@192.168.2.10")
...
```


#### probing_reply_codes (string)


以逗号分隔的 SIP 应答码列表。此处定义的应答码，除 200 之外，都将被视为探测消息的有效应答码。


*默认值为 "NULL"。*


```opensips title="Set probing_reply_codes parameter"
...
modparam("load_balancer", "probing_reply_codes", "501, 403")
...
```


#### probing_verbose (number)


一个布尔选项，用于启用基于探测应答和 MI 命令启用或禁用目的地相关的额外日志。


值为 0 表示禁用，任何其他值表示启用。


额外日志将以 INFO 级别记录。


*默认值为 "0"（禁用）。*


```opensips title="Set probing_verbose parameter"
...
modparam("load_balancer", "probing_verbose", 1)
...
```


#### lb_define_blacklist (string)


基于某个 lb 组定义黑名单。该列表将包含匹配给定组的目的地的 IP（不含端口，涵盖所有协议）。


允许该参数出现多个实例。


*默认值为 "NULL"。*


```opensips title="Set the lb_define_blacklist parameter"
...
modparam("load_balancer", "lb_define_blacklist", "list= 1,4,3")
modparam("load_balancer", "lb_define_blacklist", "blist2= 2,10,6")
...
```


#### fetch_freeswitch_stats (integer)


如果启用，某个资源的最大值也可以由 FreeSWITCH Event Socket Layer URL 组成，例如 *"channels=fs://:password@freeswitch.example.com"* 或 *"channels=fs://user:password@127.0.0.1:8021"*。ESL 的默认端口为 8021。


OpenSIPS 将与给定的套接字建立连接，并使用 FreeSWITCH 设备推送的统计信息，定期更新该给定资源的内部最大值。


每当统计信息从 FreeSWITCH 到达时，资源的最大值每 *event_heartbeat_interval* 秒更新一次（关于该设置的更多细节，参见 "freeswitch" OpenSIPS 模块）。


给定 FreeSWITCH 心跳消息的以下格式：


```json
{
  ...
  "FreeSWITCH-Hostname": "pbx2",
  "FreeSWITCH-IPv4": "172.17.0.3",
  "Idle-CPU": "78.400000",
  "Max-Sessions": "1000",
  "Session-Count": "0",
  ...
}
```


负载均衡器使用以下公式，定期更新每台 FreeSWITCH 设备的 "max_load" 值（FreeSWITCH 数据以粗体标出）：


*max_load = (**Idle-CPU** / 100)
				* (**Max-Sessions** -
(**Session-Count** -
current_load))*


*默认值为 "0"（禁用）。*


```opensips title="Set the fetch_freeswitch_load parameter"
...
modparam("load_balancer", "fetch_freeswitch_stats", 1)
...
```


#### initial_freeswitch_load (integer)


该参数仅在模块启动/重载后的数秒内有意义，此时来自新加载的 FreeSWITCH ESL 套接字的统计信息尚未到达，而呼叫路由必须保持不变。任何启用 FreeSWITCH 的资源都将在上述整个区间内继承该值（最长可达 20 秒！）。


*默认值为 "1000"。*


```opensips title="Set the initial_freeswitch_load parameter"
...
modparam("load_balancer", "initial_freeswitch_load", 200)
...
```


#### cluster_id (integer) {#cluster_id-integer}


模块所属集群的 ID。负载均衡模块中的集群支持有两个用途：共享目的地的状态，以及控制对目的地的 ping 探测。


如果启用集群，模块会自动将目的地状态的变化与属于同一集群的其他 OpenSIPS 实例共享。每当此类状态发生变化（由 MI 命令、探测结果或脚本命令引起），模块都会将该状态变化复制到该集群中的所有节点。


带共享标签（sharing tag）支持的集群可用于控制集群中哪个节点对目的地执行 ping/探测。参见 [cluster_sharing_tag](#cluster_sharing_tag-string) 选项。


该 OpenSIPS 集群公开了 **"load_balancer-status-repl"** 能力，用于在任意同步请求期间将节点标记为符合成为数据提供者的条件。因此，集群必须至少有一个节点在 *clusterer.flags* 列/属性中标记为 **"seed"** 值，才能完全正常工作。更多细节参见 [clusterer - 能力](/zh/modules/clusterer#capabilities-layer) 章节。


关于如何定义并填充集群（包含 OpenSIPS 节点）的更多信息，参见 "clusterer" 模块。


*默认值为 "0 (none)"。*


```opensips title="Set cluster_id parameter"
...
# 与集群 ID 9 中的所有 OpenSIPS 复制目的地状态
modparam("load_balancer", "cluster_id", 9)
...
```


#### cluster_sharing_tag (string) {#cluster_sharing_tag-string}


共享标签的名称（按 clusterer 模块定义），用于控制哪个节点负责执行模块中的自触发动作。此类动作可以是目的地探测，或共享目的地状态的变化。如果已定义，则只有该标签处于活动状态的节点才会执行这些动作（ping 探测与状态共享）。


该选项要生效，必须定义 [cluster_id](#cluster_id-integer)。


这是一个可选参数。如果未设置，集群中的所有节点将各自执行探测并共享状态变化。


*默认值为 "empty (none)"。*


```opensips title="Set cluster_sharing_tag parameter"
...
# 只有持有活动 "vip" 共享标签的节点才会执行 ping 探测
# 并广播状态变化
modparam("load_balancer", "cluster_id", 9)
modparam("load_balancer", "cluster_sharing_tag", "vip")
...
```


### 导出的函数 {#exported-functions}


#### lb_start(grp,resources[,flags],[attrs])


该函数在可用目的地之上启动一个新的负载均衡会话。这相当于在属于所请求组的、能提供所请求资源的目的地中，寻找负载较低的那个。


参数含义如下：


- *grp* (int) - 目的地的组 ID；目的地可以归入多个组，用于不同场景。
- *resources* (string) - 当前呼叫所需资源的以分号分隔的列表。
- *flags* (string, optional) - 用于控制 LB 算法（或计算系统上的可用负载）的各种标志位：

  - *n* - 负可用性（Negative availability）- 使用负可用性（容量已超出）的目的地；不忽略负可用性的资源，从而能够为负载均衡选择容量已超出的目的地。在希望限制普通呼叫量并始终放行重要/高优先级呼叫的场景中，可能需要该选项。
  - *r* - 相对值（Relative value）- 在计算每个 peer/资源的负载时使用相对可用负载（空闲百分比）；不带该标志位时，采用绝对值——在计算每个 peer/资源的负载时使用有效可用负载（maximum_load - current_load）。
  - *s* - 如果找到多个负载相同的目的地，则随机选择一个目的地，而不是总是选择第一个匹配的目的地。这有助于从第一个目的地卸除过多负载，并在失败呼叫总是路由到第一个目的地（因为它们几乎不影响目的地的负载计数器）的情况下分散负载。
- *attrs* (var, optional) - 一个可写变量，将被填充为所选目的地的属性。


该函数可能返回：


- *1 (true)* - 如果设置了新的目的地 URI，指向所选目的地。请注意，该函数不会更改 RURI。
- *-1 (false)* - 通用内部错误（内存分配、解析）
- *-2 (false)* - 无可用容量（目的地处于 up 且可用状态，但没有任何可用通道）
- *-3 (false)* - 无可用目的地（所请求的资源未匹配任何活动目的地）
- *-4 (false)* - 资源不正确（所请求的资源不存在）


该函数可在 REQUEST_ROUTE、BRANCH_ROUTE 和 FAILURE_ROUTE 中使用。


```opensips title="lb_start usage"
...
if (lb_start(1,"trascoding;conference")) {
	# dst URI 指向新目的地
	xlog("sending call to $du\n");
	t_relay();
	exit;
}
...
```


#### lb_next([attrs])


用于取出下一个可用（且负载较低）目的地的函数。需要有一个进行中的 LB 会话（由 lb_start() 启动）。


该函数主要用于为 LB 目的地实现故障切换。


参数含义如下：


- *attrs* (var, optional) - 一个可写变量，将被填充为所选目的地的属性。


该函数可能返回：


- *1 (true)* - 如果设置了新的目的地 URI，指向所选目的地。请注意，该函数不会更改 RURI。
- *-1 (false)* - 通用内部错误（内存分配、解析）
- *-2 (false)* - 无可用容量（目的地处于 up 且可用状态，但没有任何可用通道）
- *-3 (false)* - 无更多可用目的地（所请求的资源未匹配任何活动目的地）


该函数可在 REQUEST_ROUTE 和 FAILURE_ROUTE 中使用。


```opensips title="lb_next() usage"
...
if (t_check_status("(408)|(5[0-9][0-9])")) {
	/* 检查下一个可用的 LB 目的地 */
	if ( lb_next() ) {
		t_on_failure("1");
		xlog("-----------new dst is $du\n");
		t_relay();
		exit;
	}
}

...
```


#### lb_start_or_next(grp,resources[,flags],[attrs])


这只是一个用于简化脚本编写的封装函数。如果没有进行中的 LB 会话，它的作用等同于 lb_start()；如果有进行中的 LB 会话，它的作用等同于 lb_next()。


#### load_balance(grp,resources[,flags],[attrs])


lb_start_or_next() 函数的旧名称。


请注意，它将变为过时。


#### lb_reset()


用于停止并清空当前 LB 会话的函数。可在失败路由中使用，如果你希望停止当前 LB 会话（不再尝试该会话中的任何其他目的地）并启动一个全新的会话。


该函数可在 REQUEST_ROUTE 和 FAILURE_ROUTE 中使用。


```opensips title="lb_next() usage"
...
if (t_check_status("(5[0-9][0-9])")) {
	/* 检查下一个可用的 LB 目的地 */
	if ( lb_next() ) {
		t_on_failure("1");
		xlog("-----------new dst is $du\n");
		t_relay();
		exit;
	}
} else if (t_check_status("(408)")) {
	lb_reset();
	if (lb_start(1,"conference")) {
		t_relay();
		exit;
	}
}
...
```


#### lb_is_started()


用于检查是否存在进行中的 LB 会话的函数。如果有，则返回 true。


该函数可在任何类型的路由中使用。


#### lb_disable_dst()


将当前呼叫所使用的最后一个目的地标记为禁用。通过该函数执行的禁用将阻止该目的地从现在起被使用。探测机制可以重新启用该 peer（参见开头关于探测的章节）


该函数可在 REQUEST_ROUTE 和 FAILURE_ROUTE 中使用。


```opensips title="lb_disable_dst() usage"
...
if (t_check_status("(408)|(5[0-9][0-9])")) {
	lb_disable_dst();
	if ( lb_next() ) {
		t_on_failure("1");
		xlog("-----------new dst is $du\n");
		t_relay();
	} else {
		t_reply(500,"Error");
	}
}

...
```


#### lb_is_destination(ip,port,[group],[active],[attrs]])


检查给定的 IP 和 PORT 是否属于 load-balancer 列表中配置的目的地。如果找到且处于活动状态（参见 "active" 参数），则返回 true。


该函数可在 REQUEST_ROUTE、FAILURE_ROUTE、ONREPLY_ROUTE、BRANCH_ROUTE 和 LOCAL_ROUTE 中使用。


参数含义如下：


- *ip* (string) - 待检查的 IP
- *port* (int) - 待检查的 PORT。值为 0 表示 "any"——将匹配任何端口。
- *group* (int, optional) - 应在哪个 LB 组中查找该目的地；如果未指定，则将在所有组中搜索。
- *active*  (int, optional) - 如果为 "1"，则仅在 "活动"（未禁用）的目的地中执行搜索。如果缺省，则搜索将考虑任何类型的目的地。
- *attrs* (var, optional) - 一个可写变量，将被填充为所识别目的地的属性。


```opensips title="lb_is_destination usage"
...
if (lb_is_destination($si,$sp) ) {
	# 来自 LB 目的地的请求
}
...
```


#### lb_count_call(ip,port,grp,resources[,undo])


该函数将当前呼叫计为具有某些给定资源的某个目的地的负载。请注意，该呼叫不会经过负载均衡逻辑（不会为该呼叫做出路由决策）；它只是被 LB 计为该目的地的进行中呼叫；


参数含义如下：


- *ip* (string) - 用于标识该呼叫需计入的目的地的 IP。
- *port* (int) - 用于标识该呼叫需计入的目的地的 PORT。
- *grp* (int) - 目的地的组 ID；如果不清楚，"-1" 表示所有组。
- *resources* - (string) 当前呼叫所需资源的以分号分隔的列表。
- *undo* - (int, optional) 如果设置为非零值，将强制该函数执行反计数——实际上它会撤销当前 LB 会话中对该呼叫的负载计数；如果为特定资源计入呼叫后又需要取消计数，则可能需要该选项。


如果该呼叫已被正确纳入目的地负载的估计，函数返回 true。


该函数可在 REQUEST_ROUTE、BRANCH_ROUTE 和 FAILURE_ROUTE 中使用。


```opensips title="lb_count_call usage"
...
# 将 lb 目的地发起的呼叫也计为负载
if (lb_is_destination($si,$sp) ) {
	# 来自目的地的入站呼叫
	lb_count_call($si,$sp,-1,"conference");
} else {
	# 向目的地的出站呼叫
	if ( !load_balance(1,"conference") ) {
		send_reply(503,"unavailable");
		exit();
	}
	# dst URI 指向新目的地
	xlog("sending call to $du\n");
	t_relay();
	exit;
}
...
```


### 导出的 MI 函数 {#exported-mi-functions}


#### lb_reload


触发从 DB 重新加载负载均衡数据。


MI FIFO 命令格式：


```bash
opensips-cli -x mi lb_reload
```


#### lb_resize


更改某个目的地的某个资源的容量。


参数：


- *destination_id* - 目的地的 ID（按 DB）。
- *res_name* - 你希望调整容量的资源名称。
- *new_capacity* - 新的资源容量。


MI FIFO 命令格式：


```bash
opensips-cli -x mi lb_resize 11 voicemail 56
```


#### lb_list


列出所有目的地，以及每个目的地各资源的最大负载和当前负载。


```bash title="lb_list usage"
$ opensips-cli -x mi lb_list
Destination:: sip:127.0.0.1:5100 id=1 enabled=yes auto-re=on
        Resource:: pstn max=3 load=0
        Resource:: transc max=5 load=1
        Resource:: vm max=5 load=2
Destination:: sip:127.0.0.1:5200 id=2 enabled=no auto-re=on
        Resource:: pstn max=6 load=0
        Resource:: trans max=57 load=0
        Resource:: vm max=5 load=0
```


#### lb_status


获取或设置目的地的状态（启用或禁用）。


参数：


- *destination_id* - 目的地的 ID（按 DB）。
- *new_status* (optional) - 如果未给出新状态，函数将返回当前状态。如果给出新状态（0 - 禁用，1 - 启用），该状态将被强制应用于该目的地。


```bash title="lb_status usage"
$ opensips-cli -x mi lb_status 2
enable:: no
$ opensips-cli -x mi lb_status 2 1
$ opensips-cli -x mi lb_status 2
enable:: yes
```


### 导出的事件 {#exported-events}


#### E_LOAD_BALANCER_STATUS


当模块更改某个目的地的状态（通过 MI 或探测）时，会触发该事件。


参数：


- *group* - 目的地所属的组。
- *uri* - 目的地的 URI。
- *status* - 如果目的地被禁用则为 *disabled*，如果目的地正在被使用则为 *enabled*。


## 开发者指南 {#developer-guide}


### 可用函数 {#available-functions}


无


## 常见问题 {#frequently-asked-questions}


**Q：在哪里可以找到更多关于 OpenSIPS 的信息？**


请查看 [https://opensips.org/](https://opensips.org/)。


**Q：在哪里可以就该模块提问？**


首先请检查你的问题是否已在我们的某个邮件列表中得到了回答：


关于任何稳定版 OpenSIPS 版本的邮件应发送至 users@lists.opensips.org，关于开发版本的邮件应发送至 devel@lists.opensips.org。


如果你希望邮件保持私密，请发送至 users@lists.opensips.org。


**Q：如何报告缺陷？**


请遵循以下位置提供的指南：[https://github.com/OpenSIPS/opensips/issues](https://github.com/OpenSIPS/opensips/issues)。
<!-- CONTRIBUTORS -->

### 许可证 {#license}


所有文档文件（即 .md 扩展名）均采用 Creative Common License 4.0 许可。
