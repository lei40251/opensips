---
title: "pike 模块"
description: "本模块提供一种简单的 DOS 防护机制——针对网络层洪泛的 DOS 攻击。"
sidebar: false
---


## 管理指南 {#admin-guide}


### 概述 {#overview}


本模块提供一种简单的 DOS 防护机制——针对网络层洪泛的 DOS 攻击。模块会跟踪入站 SIP 流量的所有（或选定的）源 IP，并阻断那些超出某个限制的 IP。对 IPv4 与 IPv6 地址同时生效。


模块本身不执行任何阻断动作——它只是报告某个 IP 存在高流量；如何处理由管理员通过脚本决定。


### 使用方式 {#how-to-use}


使用本模块有两种方式（既能检测洪泛攻击，也能采取正确的动作以限制对系统的影响）：


- *手动* - 在路由脚本中，可以使用 "pike_check_req" 函数强制检查入站请求的源 IP。注意，该检查仅对 SIP 请求有效，并且可以由你（依据脚本逻辑）决定监控哪些源 IP，以及在检测到洪泛时采取什么动作。
- *自动* - 模块会安装内部钩子，以捕获所有入站请求与应答（即使从 SIP 角度看格式不合法）——大致上，模块会监控 SIP 套接字上来自网络的所有入站数据包。每当需要分析某个数据包的源 IP（判断是否可信）时，模块会运行一个脚本路由——参见模块参数 "check_route"——在该路由中你可以基于自定义逻辑决定该 IP 是否需要按洪泛进行监控。作为动作，当检测到洪泛时，模块会自动丢弃这些数据包。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


以下模块必须在本模块之前加载：


- *不依赖其他 OpenSIPS 模块*。


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，必须安装以下库或应用程序：


- *无*。


### 导出参数 {#exported-parameters}


#### sampling_time_unit (integer)


用于采样的时间周期（也可以说是采样精度 ;-) ）。越小越好，但越慢。如果要检测峰值，请使用较小的值。如果要限制对某个代理资源（例如某个网关）的访问（例如长时间内的请求总数），请为该参数使用较大的值。


> [!IMPORTANT]
> 值过小可能因定时器进程过载而导致性能损失。


*默认值为 2。*


```opensips title="设置 sampling_time_unit 参数"
...
modparam("pike", "sampling_time_unit", 10)
...
```


#### reqs_density_per_unit (integer)


在每个 sampling_time_unit 内允许多少个请求，超过后即阻断来自该 IP 的所有入站请求。实际上，对 IPv4 地址，阻断阈值介于 x 与 3*x 之间（令 x=reqs_density_per_unit）；对 IPv6 地址，介于 x 与 8*x 之间。


*默认值为 30。*


```opensips title="设置 reqs_density_per_unit 参数"
...
modparam("pike", "reqs_density_per_unit", 30)
...
```


#### remove_latency (integer)


在来自某个 IP 地址的最后一个请求之后，该 IP 地址在内存中保留多久。这相当于一种超时值。


> [!NOTE]
> 如果 *remove_latency* 的值低于 *sampling_time_unit* 的值，节点可能在解除阻断之前就过期，从而丢失某些 UNBLOCK 事件。为避免这种情况，当 *remove_latency* 较小时，OpenSIPS 会在内部将其值强制设为 *sampling_time_unit + 1*。


*默认值为 120。*


```opensips title="设置 remove_latency 参数"
...
modparam("pike", "remove_latency", 130)
...
```


#### check_route (string)


当从网络收到数据包时（以自动方式）触发的脚本路由名称。如果在该路由中执行 "drop"，即表示告诉模块该数据包的源 IP 不需要监控。否则，该源 IP 将被自动监控。


通过定义该参数，即启用了自动检查模式。


*默认值为 NONE（无自动模式）。*


```opensips title="设置 check_route 参数"
...
modparam("pike", "check_route", "pike")
...
route[pike]{
    if ($si==111.222.111.222)  /*可信，不检查*/
        drop;
    /* 检查其他所有 IP*/
}
....
```


#### pike_log_level (integer)


模块用于自动报告被检测为洪泛源的 IP 的阻断（仅首次）与解除阻断时使用的日志级别。


*默认值为 1（L_WARN）。*


```opensips title="设置 pike_log_level 参数"
...
modparam("pike", "pike_log_level", -1)
...
```


### 导出函数 {#exported-functions}


#### pike_check_req()


处理当前请求的源 IP，如果该 IP 超出阻断阈值则返回 false。


返回码：


- *1 (true)* - 该 IP 无需阻断，或发生了内部错误。
	> [!IMPORTANT]
	> 发生内部错误时，函数返回 true，以免将当前处理的 IP 报告为已阻断。

- *-1 (false)* - 该 IP 是洪泛源，此前已被检测到
- *-2 (false)* - 该 IP 被检测为新的洪泛源——首次检测到


该函数可在 REQUEST_ROUTE 中使用。


```opensips title="pike_check_req 用法"
...
if (!pike_check_req()) { exit; };
...
```


### 导出 MI 函数 {#exported-mi-functions}


#### pike_list


列出 pike 树中的节点。


名称：*pike_list*


参数：*无*


MI FIFO 命令格式：


```bash
opensips-cli -x mi pike_list
```


#### pike_rm


按 IP 地址从 pike 树中移除一个节点。


名称：*pike_rm*


参数：


- *IP* - 当前被阻断的 IP 地址。


MI FIFO 命令格式：


```bash
opensips-cli -x mi pike_rm 10.0.0.106
```


### 导出的事件 {#exported-events}


#### E_PIKE_BLOCKED


当 *pike* 模块决定应阻断某个 IP 时，会触发该事件。


参数：


- *ip* - 被阻断的 IP 地址。


### 提供的状态/报告标识符 {#provided-statusreport-identifiers}


模块提供 "pike" 状态/报告组，仅包含 "main"/默认 SR 标识符。


模块没有发布有用的状态。


在报告/日志方面，将报告以下事件：


- 检测到 IP X.Y.Z.W 正在洪泛


关于如何访问和使用状态/报告信息，请参见 [Status/Report Interface](/zh/manual/Interface-StatusReport)。


## 开发者指南 {#developer-guide}


使用单棵树（同时适用于 IPv4 与 IPv6）。每个节点包含一个字节，IP 地址从根延伸到叶。


```c title="IP 地址树"
	   / 193 - 175 - 132 - 164
tree root /                  \ 142
	  \ 195 - 37 - 78 - 163
	   \ 79 - 134
```


为了检测完整地址，从根到叶逐字节地展开与该 IP 地址每个字节相对应的节点。一个节点必须被命中给定次数才会被展开（可能由不同地址命中；在上面的示例中，节点 "37" 是通过 195.37.78.163 和 195.37.79.134 的命中展开的）。


对于 193.175.132.164，令 x= reqs_density_per_unit：


- 首次请求命中后 -> 构建 "193" 节点。
- 再命中 x 次后，构建 "175" 节点；"193" 节点的命中数在自身与其子节点之间拆分——两者各占 x/2。
- 节点 "132" 和 "164" 依此类推。
- "164" 构建完成后，即可在树中找到完整地址。"164" 成为叶子。之后它作为叶子被命中 x 次，就会变为 "RED"（来自该地址的后续请求将被阻断）。


因此，构建并阻断该地址需要 3*x 次命中。现在，如果请求开始来自 193.175.132.142，前 3 个字节已在树中（与前一个地址共享），所以我只需要 x 次命中（构建节点 "142" 并使其变为 "RED"）就能让该地址也被阻断。这就是阻断一个 IP 所需命中次数可变的原因。


将地址变为红色所需的最大命中次数为（n 是该地址的字节数）：


1（第一个字节） + x（第二个字节） + (x / 2) * (n - 2)（其余字节） + (n - 1)（将节点变为红色）。


因此，对 IPv4（n = 4）为 3x，对 IPv6（n = 16）为 9x。将地址变为红色所需的最小命中次数为 x。
<!-- CONTRIBUTORS -->

### 许可 {#license}

所有文档文件（即 .md 扩展名）均按 Creative Common License 4.0 授权。
