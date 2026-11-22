---
title: "负载均衡"
description: "本教程介绍如何为 SIP 呼叫实现 SIP 负载均衡器。"
---

“load-balancing” 模块用于提供基于负载的流量路由。简而言之，当 **OpenSIPS** 把呼叫路由到一组目标时，它能够记录每个目标的负载状态（即正在进行的呼叫数），并选择路由到（当时）负载较轻的目标。
**OpenSIPS** 了解每个目标的容量 —— 它预先配置了各目标所能接受的最大负载。更准确地说，路由时 **OpenSIPS** 考虑的不是正在进行呼叫数最少的目标，而是可用槽位最多的目标。

此外，**[load-balancing](/zh/modules/load_balancer)**（LB）模块能够接收来自目标的反馈（如果目标具备该能力）。该机制用于在某个目标的最大容量发生变化时（例如某台 GW 增减了 E1 卡）通知 **OpenSIPS**。

“load-balancing” 功能是对 “dispatcher” 功能的增强。区别在于是否掌握所路由目标的负载信息：

* **Dispatcher 没有负载信息** —— 它只是基于概率分散逻辑盲目地把呼叫转发给各目标。它不会得到关于目标负载的反馈（例如发出的呼叫中有多少真正建立、还有多少仍在进行）。
* **Load-balancer 由负载驱动** —— LB 路由逻辑主要基于负载信息。LB 模块使用 DIALOG 模块来跟踪负载（正在进行的呼叫）。

## 负载均衡 —— 工作原理 {#load-balancing-how-it-works}

考察 **OpenSIPS** 中 LB 的实现，有 3 个方面：

### 目标集合 {#destination-set}

一个目标由其地址（SIP URI）及其作为容量的描述来定义。

从 LB 模块的角度看，**目标并非同质的** —— 它们并不相同；这不仅体现在容量上，也体现在它们提供的**服务 / 资源**种类上。例如，你可能有一组用于媒体相关服务的 FreeSWITCH/Asterisk 机器 —— 其中一些做转码，另一些做语音信箱或会议，还有一些只做简单放音，还有一些做 PSTN 落地。但你也可能有混合的机器 —— 一台机器可能同时做 PSTN 和语音信箱。因此集合中的每个目标可能提供不同的服务 / 资源组合。

所以，对于每个目标，LB 模块定义其所提供的资源，并针对每种资源定义**容量 / 最大负载**，即该目标针对该资源能够处理的并发呼叫数。

示例：

```text
4 destinations/boxes in the LB set
    1) offers 30 channels for transcoding and 32 for PSTN
    2) offers 100 voicemail channels and 10 for transcoding
    3) offers 50 voicemail channels and 300 for conference
    4) offers 10 voicemail, 10 conference, 10 transcoding and 32 PSTN

This translated into the following setup:

+----+----------+--------------------------+---------------------------------+
| id | group_id | dst_uri                  | resources                       |
+----+----------+--------------------------+---------------------------------+
|  1 |        1 | sip:media1.mycluster.net | transc=30; pstn=32              |
|  2 |        1 | sip:media2.mycluster.net | vm=100; transc=10               |
|  3 |        1 | sip:media3.mycluster.net | vm=50; conf=300                 |
|  4 |        1 | sip:media4.mycluster.net | vm=10;conf=10;transc=10;pstn=32 |
+----+----------+--------------------------+---------------------------------+
```

在运行时，LB 模块提供以下 MI 命令：

* 重新加载目标集合的定义
* 修改某个目标某项资源的容量

### 调用负载均衡 {#invoking-load-balancing}

使用 LB 功能非常简单 —— 你只需把呼叫需要哪类资源告知 LB 模块。

资源检测在 **OpenSIPS** 路由脚本中完成，依据任何合适的信息。例如，查看 RURI（被叫号码）即可判断呼叫必须去 PSTN，还是语音信箱或会议号码；此外，通过查看 SDP 中通告的编解码，可以判断是否还需要转码。

```opensips
  if (!lb_start(1,"transc;pstn")) {
      send_reply(500,"Service full");
      exit;
  }
```

该函数的第一个参数标识要使用的 LB 集合（参见上面数据库快照中的 *group_id* 列）。第二个参数是呼叫所需资源的列表。还可以传入第三个可选参数，用于指示 LB 引擎如何估算负载 —— 按绝对值（占用了多少通道）还是按相对值（占用了多少百分比）。

**[lb_start](/zh/modules/load_balancer#func_lb_start)()** 会自动为该呼叫创建对话状态（以便监视它），并（从选中的机器上）为其分配所请求的资源。  

该函数会把所选目标 / 机器的地址设置为目标 URI（`$du`）。

呼叫终止时，资源会自动释放。

LB 模块提供一个 MI 函数，允许管理员查看各目标当前的负载。

### LB 逻辑 {#the-lb-logic}

LB 模块选择目标所用的逻辑是：

* 依据 **group_id 获取目标集合**（*lb_start()* 函数的第一个参数）
* 从集合中只选出**能够提供所请求资源的目标**（*[lb_start](/zh/modules/load_balancer#func_lb_start)()* 函数的第二个参数）
* 对选出的目标，**评估每种所请求资源的当前负载**
* 胜出的目标是**各项资源最小可用负载值最大**的那个。

```text
Example:

4 destinations/boxes in the LB set
    1) offers 30 channels for transcoding and 32 for PSTN
    2) offers 100 voicemail channels and 10 for transcoding
    3) offers 50 voicemail channels and 300 for conference
    4) offers 10 voicemail, 10 conference, 10 transcoding and 32 PSTN

when calling lb_start(1,"transc;pstn") ->

1) only boxes (1) and (4) will be selected at as they offer both transcoding and pstn

2) evaluating the load  :
    (1) transcoding - 10 channels used; PSTN - 18 used 
    (4) transcoding - 9 channels used; PSTN - 16 used 

   evaluating available load (capacity-load) :
    (1) transcoding - 20 channels used; PSTN - 14 used 
    (4) transcoding - 1 channels used; PSTN - 16 used 

3) for each box, the minimum available load (through all resources)
    (1) 14 (PSTN)
    (2) 1 (transcoding) 

4) final selected box in (1) as it has the the biggest (=14) available load for the most loaded resource.
```

该选择算法试图避免对单台机器上某项资源的密集使用。

### 禁用与 Ping {#disabling-and-pinging}

Load Balancer 模块提供若干功能，帮助应对目标的故障。对故障目标的实际检测（基于 SIP 流量）在 OpenSIPS 路由脚本中完成，依据是从目标收到的应答中的状态码（参见教程末尾的示例）。

一旦在脚本中检测到某目标故障，你可以通过[ **lb_disable**](/zh/modules/load_balancer#func_lb_disable_dst)**()** 函数把它标记为禁用 —— 一旦标记为禁用，该目标在 LB 过程中将不再被使用（路由呼叫时不会把它视为可能的目标）。

要让某个目标重新启用，有两种办法：

* 使用 [lb_status](/zh/modules/load_balancer#mi_status) MI 命令，从 OpenSIPS 外部手动完成
* 基于探测 —— 该目标必须启用 SIP 探测 / ping —— 一旦目标开始对 SIP ping 回复 200 OK（参见 [probing_reply_codes](/zh/modules/load_balancer#param_probing_reply_codes) 选项）。

要启用 ping，首先需要把 [probing_interval](/zh/modules/load_balancer#param_probing_interval) 设置为非零值 —— 即多久 ping 一次。ping 通过定期向目标发送 **OPTIONS** SIP 请求完成 —— 参见 [probing_method](/zh/modules/load_balancer#param_probing_method) 选项。

要控制哪些目标以及在何时被 ping，可使用 **load_balancer** 表中的 **probe_mode** 列 —— 参见[表定义](/zh/manual/Install-DBSchema#load-balancer)。可取的选项有：

* **0** 任何时候都不 ping
* **1** 仅在处于禁用状态时 ping（用于目标的自动重新启用）
* **2** 始终 ping —— 若目标不回应 ping 则将其禁用，当它重新开始回应时再将其启用。

### 对负载均衡器的实时控制 {#realtime-control-over-the-load-balancer}

Load Balancer 模块提供若干 MI 函数，允许你进行运行时变更并从中获取实时信息。

在运行时推送变更：

* **lb_reload** —— 强制从数据库重新加载全部配置数据 —— 参见[更多..](/zh/modules/load_balancer#mi_reload)
* **lb_resize** —— 修改某目标某项资源的容量 —— 参见[更多..](/zh/modules/load_balancer#mi_resize)
* **lb_status** —— 修改某目标的状态（启用 / 禁用）—— 参见[更多..](/zh/modules/load_balancer#mi_status)

获取实时信息：

* **lb_list** —— 列出所有目标上的负载（按资源）—— 参见[更多..](/zh/modules/load_balancer#mi_list)
* **lb_status** —— 查看某目标的状态（启用 / 禁用）—— 参见[更多..](/zh/modules/load_balancer#mi_status)

- - -

## 研究案例：路由媒体网关 {#study-case-routing-the-media-gateways}

以下是用于在媒体对端之间执行 LB 的完整配置与脚本。

### 配置 {#configuration}

考虑如下情形：一个媒体服务器集群，提供语音信箱服务与 PSTN（呼入和呼出）服务。因此这些机器能够接收（来自核心 SIP 服务器的）语音信箱或 PSTN 落地呼叫，但它们只能把仅来自 PSTN（呼入）的呼叫发回（给核心 SIP 服务器）。

我们还希望目标能够从脚本中被禁用（当检测到故障时）。目标的重新启用将基于 ping 完成 —— 我们仅在目标处于 “失败” 状态时才 ping。

```text
4 destinations/boxes in the LB set
    1) offers 50 channels for voicemail and 32 for PSTN
    2) offers 100 voicemail channels
    3) offers 50 voicemail channels
    4) offers 10 voicemail and 64 PSTN

This translated into the following setup:

+----+----------+--------------------------+---------------------------------+
| id | group_id | dst_uri                  | resources                       |
+----+----------+--------------------------+---------------------------------+
|  1 |        1 | sip:media1.mycluster.net | transc=30; pstn=32              |
|  2 |        1 | sip:media2.mycluster.net | vm=100; transc=10               |
|  3 |        1 | sip:media3.mycluster.net | vm=50; conf=300                 |
|  4 |        1 | sip:media4.mycluster.net | vm=10;conf=10;transc=10;pstn=32 |
+----+----------+--------------------------+---------------------------------+
```

### OpenSIPS 脚本 {#opensips-scripting}

**[完整配置文件在这里](https://github.com/OpenSIPS/opensips/tree/master/modules/load_balancer/samples/opensips-load-balancer.cfg)**。
