---
title: "nathelper 模块"
description: "这是一个用于协助 NAT 穿透的模块。"
sidebar: false
---


## 管理指南 {#admin-guide}


### 概述 {#overview}


这是一个用于协助 NAT 穿透的模块。特别是，它帮助那些并未声明自身是对称型、也无法确定自身公网地址的对称型 UA。fix_nated_contact 用请求的源地址:端口对重写 Contact 头域。fix_nated_sdp 向 SDP 添加活动方向指示（标志 0x01），并同时更新源 IP 地址（标志 0x02）。


从 2.2 版起，nathelper 提供了有状态 ping（仅 SIP Ping）。当 *max_pings_lost* 个 ping 未获响应（每个 ping 的响应超时为 *ping_threshold* 秒）时，该功能允许将联系人从 usrloc 位置表中移除。要使用该功能，联系人插入位置表时必须设置 *remove_on_timeout_bflag* 标志。


适用于包含 SDP 部分的多部分（multipart）消息，但不适用于多层 multipart 消息。


### NAT 探测类型 {#nat-pinging-types}


目前，nathelper 模块支持两种类型的 NAT ping：


- *UDP 数据包* - 向联系人地址发送 4 字节（填零）的 UDP 数据包。

  - *优点：* 带宽流量低，易于由 OpenSIPS 生成；
  - *缺点：* 通过 NAT 的流量是单向的（入站——从外到内）；由于许多 NAT 仅在出站流量时更新绑定超时，绑定可能过期并被关闭。
- *SIP 请求* - 向联系人地址发送无状态 SIP 请求。

  - *优点：* 通过 NAT 的流量是双向的，因为来自 OpenSIPS 的每个 PING 请求（入站流量）都会迫使 SIP 客户端产生一个 SIP 应答（出站流量）——NAT 绑定必定保持打开。从 2.2 版起，还可以选择在检测到特定阈值时从位置表中移除联系人。
  - *缺点：* 带宽流量更高，由 OpenSIPS 生成的开销（时间）更大；


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


在加载本模块之前必须先加载以下模块：


- *usrloc* 模块 - 仅当需要对 NAT 后的联系人执行 ping 时。
- *clusterer* - 仅当启用 "cluster_id" 选项时。


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，必须安装以下库或应用程序：


- *无*。


### 导出的参数 {#exported-parameters}


#### natping_interval (integer)


向所有当前已注册的 UA 发送 NAT ping 以保持其 NAT 绑定存活的时间间隔，单位为秒。值为 0 将禁用该功能。


> [!NOTE]
> 启用 NAT ping 功能将迫使模块绑定到 USRLOC 模块。


*默认值为 0。*


```opensips title="设置 natping_interval 参数"
...
modparam("nathelper", "natping_interval", 10)
...
```


#### ping_nated_only (integer)


若设置该变量，则只有用户位置数据库中设置了 "behind_NAT" 标志的联系人才会被 ping。


*默认值为 0。*


```opensips title="设置 ping_nated_only 参数"
...
modparam("nathelper", "ping_nated_only", 1)
...
```


#### natping_partitions (integer)


用于发送 ping 的分区/分块数量。一个分区表示所有 ping 一起发送。两个分区表示一次发送一半的 ping，另一半在另一时刻发送。


*默认值为 1。*
*最大允许值为 8。*


```opensips title="设置 natping_partitions 参数"
...
modparam("nathelper", "natping_partitions", 4)
...
```


#### natping_socket (string)


将 natping 的源 IP 伪造为此地址。仅适用于 IPv4。


*默认值为 NULL。*


```opensips title="设置 natping_socket 参数"
...
modparam("nathelper", "natping_socket", "192.168.1.1:5006")
...
```


#### received_avp (str) {#received_avp-str}


用于存储包含收到的 IP、端口和协议的 URI 的 AVP（属性值对）名称。该 URI 由 [fix_nated_register()](#fix_nated_register) 函数创建，随后此数据也可由 registrar 模块取用，后者会向注册附加 "Received=" 属性。无论何时修改此参数的值，都不要忘记修改 [registrar](/zh/modules/registrar) 模块中对应参数的值。


> [!NOTE]
> 如果使用 [fix_nated_register()](#fix_nated_register)，则必须设置此参数。此外，如果使用 registrar，还必须将其对称的 [received_avp](/zh/modules/registrar#received-avp-str) 模块参数设置为**相同的值**。


*默认值为 "NULL"（禁用）。*


```opensips title="设置 received_avp 参数"
...
modparam("nathelper", "received_avp", "$avp(received)")
...
```


#### force_socket (string)


用于向缺少本地套接字信息的联系人发送 ping 的发送套接字（本地套接字信息可能在重启或联系人复制期间丢失）。若未指定，OpenSIPS 将选择与目的协议和 AF 族匹配的第一个监听接口。


*默认值为 "NULL"。*


```opensips title="设置 force_socket 参数"
...
modparam("nathelper", "force_socket", "localhost:33333")
...
```


#### sipping_bflag (string)


模块应使用哪个分支标志来识别 NAT 后的联系人，并对这些联系人通过 SIP 请求（而非哑 UDP 数据包）执行 NAT ping。


*默认值为 NULL（禁用）。*


```opensips title="设置 sipping_bflag 参数"
...
modparam("nathelper", "sipping_bflag", "SIPPING_ENABLE")
...
```


#### remove_on_timeout_bflag (string)


应使用哪个分支标志，以便在超过 [ping_threshold](#ping_threshold-int) 时激活 usrloc 联系人移除。


*默认值为 NULL（禁用）。*


```opensips title="设置 remove_on_timeout_bflag 参数"
...
modparam("nathelper", "remove_on_timeout_bflag", "SIPPING_RTO")
...
```


#### sipping_latency_flag (string)


该分支标志用于启用联系人 ping 延迟的计算与上报，通过 usrloc 的 E_UL_LATENCY_UPDATE 事件进行。


*默认值为 NULL（禁用）。*


```opensips title="设置 sipping_latency_flag 参数"
...
modparam("nathelper", "sipping_latency_flag", "SIPPING_CALC_LATENCY")
...
```


#### sipping_ignore_rpl_codes (CSV string)


以逗号分隔的 SIP 应答状态码列表，用于指定来自联系人 ping 的、应被丢弃的应答。这对"全共享"（full-sharing）用户位置拓扑可能有用：其中的位置节点并不直接面向 UA，因此中间 SIP 组件可能会对离线联系人的 ping 尝试生成应答（例如 408 - Request Timeout）——此类 ping 应答应被忽略。


*默认值为 "NULL"（接受所有应答状态码）。*


```opensips title="设置 sipping_ignore_rpl_codes 参数"
...
modparam("nathelper", "sipping_ignore_rpl_codes", "408, 480, 404")
...
```


#### sipping_from (string)


该参数设置用于生成 NAT ping 用途 SIP 请求的 SIP URI。要启用 SIP 请求 ping 功能，必须设置此参数。SIP 请求 ping 仅对如此标记的请求使用。


*默认值为 "NULL"。*


```opensips title="设置 sipping_from 参数"
...
modparam("nathelper", "sipping_from", "sip:pinger@siphub.net")
...
```


#### sipping_method (string)


该参数设置用于生成 NAT ping 用途 SIP 请求的 SIP 方法。


*默认值为 "OPTIONS"。*


```opensips title="设置 sipping_method 参数"
...
modparam("nathelper", "sipping_method", "INFO")
...
```


#### nortpproxy_str (string)


该参数设置 nathelper 用于标记报文 SDP 信息已被改写的 SDP 属性。


若为空字符串，则不添加也不检查任何标记。


> [!NOTE]
> 该字符串必须是完整的 SDP 行，包括 EOH（\r\n）。


*默认值为 "a=nortpproxy:yes\r\n"。*


```opensips title="设置 nortpproxy_str 参数"
...
modparam("nathelper", "nortpproxy_str", "a=sdpmangled:yes\r\n")
...
```


#### natping_tcp (integer)


若设置该标志，TCP/TLS 客户端也会用 SIP OPTIONS 消息进行 ping。


*默认值为 0（未设置）。*


```opensips title="设置 natping_tcp 参数"
...
modparam("nathelper", "natping_tcp", 1)
...
```


#### oldip_skip (string)


该参数指定是否将旧媒体 IP 和旧原始 IP 放入 SDP 消息体。该参数有两个取值：'o'（跳过 "a=oldoip" 字段）和 'c'（跳过 "a=oldcip" 字段）。


*默认值为 0（未设置）。*


```opensips title="设置 oldip_skip 参数"
...
modparam("nathelper", "oldip_skip", "oc")
...
```


#### ping_threshold (int) {#ping_threshold-int}


若联系人在 ping 发出后 *ping_threshold* 秒内未响应，则在 [max_pings_lost](#max_pings_lost-int) 次未响应 ping 之后该联系人将被移除。


*默认值为 3（秒）。*


```opensips title="设置 ping_threshold 参数"
...
modparam("nathelper", "ping_threshold", 10)
...
```


#### max_pings_lost (int) {#max_pings_lost-int}


将联系人从位置表中移除前允许的未响应 ping 次数。


*默认值为 3（次 ping）。*


```opensips title="设置 max_pings_lost 参数"
...
modparam("nathelper", "max_pings_lost", 5)
...
```


#### cluster_id (integer) {#cluster_id-integer}


模块所属集群的 ID。nathelper 模块使用集群支持来控制 ping 过程。当处于多节点集群中时，各节点可以商定由哪个节点负责 ping。


支持共享标签（sharing tag）的集群可用于控制集群中哪个节点对联系人执行 ping/探测。参见 [cluster_sharing_tag](#cluster_sharing_tag-string) 选项。


有关如何定义和填充（含 OpenSIPS 节点的）集群的更多信息，参见 "clusterer" 模块。


*默认值为 "0（无）"。*


```opensips title="设置 cluster_id 参数"
...
# 属于集群 ID 9
modparam("nathelper", "cluster_id", 9)
...
```


#### cluster_sharing_tag (string) {#cluster_sharing_tag-string}


共享标签的名称（按 clusterer 模块定义），用于控制哪个节点负责对联系人执行 ping。若已定义，则只有该标签处于活动状态的节点才会执行 ping。


要使此选项生效，必须定义 [cluster_id](#cluster_id-integer)。


这是一个可选参数。若未设置，集群中的所有节点将各自执行 ping。


*默认值为 "空（无）"。*


```opensips title="设置 cluster_sharing_tag 参数"
...
# 只有持有活动 "vip" 共享标签的节点才会执行 ping
modparam("nathelper", "cluster_id", 9)
modparam("nathelper", "cluster_sharing_tag", "vip")
...
```


### 导出的函数 {#exported-functions}


#### fix_nated_contact([uri_params])


重写 Contact URI 头域，使其包含请求的源地址:端口。如果提供了 URI 参数列表，则会将其添加到修改后的 Contact 中；


> [!IMPORTANT]
> 该函数所做的修改不应在异步恢复路由中可见。因此请确保在所有需要修正联系人的恢复路由中调用它。


参数：


- *uri_params (string, optional)*


该函数可在 REQUEST_ROUTE、ONREPLY_ROUTE、BRANCH_ROUTE 中使用。


```opensips title="fix_nated_contact 用法"
...
if (search("User-Agent: Cisco ATA.*") {
    fix_nated_contact(";ata=cisco");
} else {
    fix_nated_contact();
}
...
```


#### fix_nated_sdp(flags [, ip_address [, sdp_fields]])


修改 SDP 信息以协助 NAT 穿透。要执行哪些修改可通过 "flags" 参数控制。自 1.12 版起，旧 IP 字段的名称分别为：旧原始 IP 为 "a=oldoip"，旧媒体 IP 为 "a=oldcip"。


各参数含义如下：


- *flags (string)* - 取值可以是以下标志的 CSV：

  - *add-dir-active* - （原 *0x01* 标志）添加 "a=direction:active" SDP 行；
  - *rewrite-media-ip* - （原 *0x02* 标志）用消息的源地址或指定的 IP 地址重写媒体 IP 地址（c=）（指定的 IP 地址优先于源地址）。
  - *add-no-rtpproxy* - （原 *0x04* 标志）添加 "a=nortpproxy:yes" SDP 行；
  - *rewrite-origin-ip* - （原 *0x08* 标志）用消息的源地址或指定的 IP 地址重写原始描述（o=）中的 IP（指定的 IP 地址优先于源地址）。
  - *rewrite-null-ips* - （原 *0x10* 标志）强制重写空的媒体 IP 和/或原始 IP 地址。不含此标志时，空 IP 保持原样。
- *ip_address (string, optional)* - 用于重写 SDP 的 IP。若未指定，则使用接收到的信令 IP。注意：要让该 IP 生效，需要使用 0x02 或 0x08 标志，否则不会产生任何效果。
- *sdp_fields (string, optional)* - 要附加到 SDP 的 SDP 字段。注意：每个 SDP 字段前必须带有 "\r\n"。


该函数可在 REQUEST_ROUTE、ONREPLY_ROUTE、FAILURE_ROUTE、BRANCH_ROUTE 中使用。


```opensips title="fix_nated_sdp 用法"
...
# 添加 "a=direction:active" SDP 行
# 重写媒体 IP（c= 行）
# 添加额外的 "a=x-attr1" SDP 行
# 添加额外的 "a=x-attr2" SDP 行
if (search("User-Agent: Cisco ATA.*")
    {fix_nated_sdp(3,,"\r\na=x-attr1\r\na=x-attr2");};
...
```


#### add_rcv_param([flag]),


向 Contact 头域或 Contact URI 添加 received 参数。该参数将包含由承载 SIP 消息的报文的源 IP、端口和协议构成的 URI。该参数随后可被另一个注册服务器处理，例如在使用 t_replicate 函数将 REGISTER 消息复制到另一个注册服务器时，这很有用。


各参数含义如下：


- *flag (int, optional)* - 指示该参数应添加到 Contact URI 还是 Contact 头的标志。若标志非零，参数将被添加到 Contact URI。若未使用或等于零，参数将放入 Contact 头。


该函数可在 REQUEST_ROUTE 中使用。


```opensips title="add_rcv_param 用法"
...
add_rcv_param(); # 将该参数添加到 Contact 头
....
add_rcv_param(1); # 将该参数添加到 Contact URI
...
```


#### fix_nated_register() {#fix_nated_register}


该函数创建一个由源 IP、端口和协议构成的 URI，并将其存入 [received_avp](#received_avp-str) AVP。该 URI 将作为 "received" 参数附加到 200 OK 中的 Contact，如果为 [registrar](/zh/modules/registrar) 模块配置了相同的 AVP，它也可能被存入用户位置数据库。


该函数可在 REQUEST_ROUTE 中使用。


```opensips title="fix_nated_register 用法"
...
fix_nated_register();
...
```


#### nat_uac_test(flags)


使用一项或多项预定义检查，判断收到的 SIP 消息是否源自 NAT 之后。


*flags*（字符串）参数表示以逗号分隔的待执行检查列表，如下所示：


- *private-contact* - （原 *1* 标志）在 Contact 头域中搜索是否存在 RFC1918 / RFC6598 地址
- *diff-ip-src-via* - （原 *2* 标志）使用 "received" 测试：将 Via 中的地址与信令的源 IP 地址比较
- *private-via* - （原 *4* 标志）在最顶层 VIA 中搜索是否存在 RFC1918 / RFC6598 地址
- *private-sdp* - （原 *8* 标志）在 SDP 中搜索是否存在 RFC1918 / RFC6598 地址
- *diff-port-src-via* - （原 *16* 标志）测试源端口是否不同于 Via 中的端口
- *diff-ip-src-contact* - （原 *32* 标志）将 Contact 中的地址与信令的源 IP 地址比较
- *diff-port-src-contact* - （原 *64* 标志）将 Contact 中的端口与信令的源端口比较
- *carrier-grade-nat* - （原 *128* 标志）在对 *Contact*、*Via* 和 *SDP* 的检查中也包含 RFC 6333 地址


**只要任一测试通过就返回 true**。


该函数可在 REQUEST_ROUTE、ONREPLY_ROUTE、FAILURE_ROUTE、BRANCH_ROUTE 中使用。


```opensips title="nat_uac_test 用法"
...
# 检查私有 Contact 或 SDP 媒体 IP 地址
if (nat_uac_test("private-contact,private-sdp"))
	xlog("SIP message is NAT'ed (Call-ID: $ci)\n");
...
```


### 导出的 MI 函数 {#exported-mi-functions}


#### nh_enable_ping


获取或设置 natping 状态。


参数：


- *status*（可选）- 若未提供，函数返回当前 natping 状态。否则，若参数值大于 0 则启用 natping，若参数值为 0 则禁用 natping。


```bash title="nh_enable_ping 用法"
...
$ opensips-cli -x mi nh_enable_ping
Status:: 1
$
$ opensips-cli -x mi nh_enable_ping 0
$
$ opensips-cli -x mi nh_enable_ping
Status:: 0
$
...
			
```


## 常见问题 {#frequently-asked-questions}


**问：在哪里可以找到更多关于 OpenSIPS 的信息？**


请查看 [https://opensips.org/](https://opensips.org/)。


**问：在哪里可以就此模块提问？**


首先请检查你的问题是否已在我们某个邮件列表中得到解答：

关于任何稳定版 OpenSIPS 发布的邮件应发送至 users@lists.opensips.org，关于开发版本的邮件应发送至 devel@lists.opensips.org。

若希望邮件保持私密，请发送至 users@lists.opensips.org。


**问：如何报告缺陷？**


请遵循以下地址提供的准则：[https://github.com/OpenSIPS/opensips/issues](https://github.com/OpenSIPS/opensips/issues)。
<!-- CONTRIBUTORS -->

### 许可证 {#license}

所有文档文件（即 .md 扩展名）均按 Creative Common License 4.0 许可。
