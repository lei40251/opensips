---
title: "clusterer 模块"
description: "clusterer 模块用于将多个 OpenSIPS 实例组织为组（集群），使节点之间可以相互通信，以便复制、共享信息或执行分布式任务。"
sidebar: false
---

## 管理指南 {#admin-guide}


### 概述 {#overview}


*clusterer* 模块用于将多个 OpenSIPS 实例组织为组（集群），在其中节点可以相互通信，以便复制、共享信息或执行分布式任务。分布式逻辑由使用 *clusterer* 接口的不同模块执行（例如 *dialog* 模块可以复制对话/配置文件，*ratelimit* 模块可以在多个实例之间共享管道等），也可以在脚本层面执行。*clusterer* 模块本身只提供发送/接收 BIN 包以及获取节点可用性通知的接口。它通过在内部学习集群拓扑和节点状态来实现这一点。集群内节点的数据配置通过数据库或配置脚本完成。节点相关信息可以通过 MI 接口发送命令来检查，并可触发重新加载。


*clusterer* 模块建立的拓扑是节点的覆盖网络，其中的「链路」表示 BIN 接口层面的通信可用性。为此使用了一种探测机制，即定期向集群中的所有节点发送 ping，且必须在给定时间间隔内收到应答。集群中的所有节点交换彼此与其他节点之间链路的状态信息，并计算出一张「路由表」，为每个目的地给出下一跳。最短路径的度量是跳数。当到目的地没有直连链路时，模块发送的 BIN 包会在集群中透明地路由。


注意，一个 OpenSIPS 实例可以属于多个集群，并分别为每个集群通信和建立拓扑。为了在数据库或脚本中进行配置，每个节点都有一个全局唯一的 ID，可以在各个集群中引用。


如果不希望使用数据库配置，OpenSIPS 实例可以动态学习集群中的所有节点。只需在脚本中定义至少一个邻居，就足以发现所有集群组件。


### 能力层 {#capabilities-layer}


clusterer 模块还会跟踪节点在数据同步方面的状态，这些数据同步是针对其他模块在其上实现的功能（或「能力」）而言的。某些能力需要从集群中拥有完整数据集的合法「供体」节点进行完整数据同步（在 OpenSIPS 启动时或运行时通过 MI）。此外，能力可以向 clusterer 模块查询，以便将某些分布式逻辑只划分到集群中已同步的节点上。


集群中的每个节点都从一个空数据集开始，并尝试找到合适的节点来拉取数据。为了帮助集群「引导」，应定义一个「种子」节点。这是通过在 clusterer 表的 **flags** 列（或 *my_node_info* 参数中的同名属性）中设置 *seed* 值来完成的。种子节点在可配置的时间间隔（[seed_fallback_interval](#seed_fallback_interval) 参数）之后会简单地回退到「已同步」状态。注意，此机制仅对在启动时同步数据的能力是必需的，因此请查看相应模块的文档。


clusterer 模块会将 clusterer 表中的 *sip_addr* 列（或 *my_node_info* 参数中的同名属性）透明地暴露给上层模块，因此请查看相应模块的文档以了解此节点相关信息的用途。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


以下模块必须在本模块之前加载：


- *数据库模块* - 如果 [db_mode](#db_mode) 为 *1*。
- *proto_bin 模块*。


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，必须安装以下库或应用程序：


- *无*。


### 导出的参数 {#exported-parameters}


#### my_node_id


本地实例的 id。此参数必须等于数据库中某个 *node_id* 字段的值。


*无默认值。此参数必须显式设置为大于零的值。*


```opensips title="设置 my_node_id 参数"
...
modparam("clusterer", "my_node_id", 1)
...
	
```


#### db_mode {#db_mode}


指定本地实例以及集群中其他实例的节点信息是从数据库加载，还是在脚本中配置（参见 [my_node_info](#my_node_info) 和 [neighbor_node_info](#neighbor_node_info)）。值为 "0" 表示不使用 DB，节点信息层面的集群拓扑将在运行时动态发现。


如果启用了 DB 模式，则此实例只接受数据库中定义的节点。


*默认值为 "1"*


```opensips title="设置 db_mode 参数"
...
modparam("clusterer", "db_mode", 0)
...
	
```


#### db_url


数据库 url。


*默认值为 "NULL"。*


```opensips title="设置 db_url 参数"
...
modparam("clusterer", "db_url",
	"mysql://opensips:opensipsrw@localhost/opensips")
...
	
```


#### db_table


存储集群信息的表名。


*默认值为 "clusterer"。*


```opensips title="设置 db_table 参数"
...
modparam("clusterer", "db_table", "clusterer")
...
	
```


#### sharing_tag


共享标签的定义。共享标签由 clusterer 模块管理，但任何构建在 clusterer 引擎之上的模块（如 dialog 或 presence）都可以使用它（就读取其状态而言）。


注意，其他标签可能在运行时通过与其他节点的集群通信动态学习到。


此值的格式为 "tag_name / cluster_id = active/backup"。


此参数允许多次定义。默认值为 "none"。


```opensips title="设置 sharing_tag 参数"
...
modparam("clusterer", "sharing_tag", "vip1/2=active")
modparam("clusterer", "sharing_tag", "node/10=backup")
...
```


#### my_node_info {#my_node_info}


节点规格，类似于 clusterer DB 表中与本地实例对应的一行所提供的信息。此参数可以多次设置，以便将本地节点加入多个集群。


参数格式：多个 "*prop=value*" 属性定义，以 '*,*' 分隔，属性名与 DB 列名相同。至少必须定义 *cluster_id* 和 *url* 属性。


如果 [db_mode](#db_mode) 设置为 "0"，则此参数为必需，以便在动态节点学习过程中正确通告本地实例的信息。


```opensips title="设置 my_node_info 参数"
...
modparam("clusterer", "my_node_info", "cluster_id=1, url=bin:192.168.0.5:5566")
...
	
```


#### neighbor_node_info {#neighbor_node_info}


节点规格，类似于 clusterer DB 表中与集群中另一实例对应的一行所提供的信息。在动态节点学习过程中，此节点将作为本地实例在集群中的入口点。此参数可以多次设置，以定义要连接的多个邻居（或同一邻居但属于不同集群）。


参数格式：多个 "*prop=value*" 属性定义，以 '*,*' 分隔，属性名与 DB 列名相同。至少必须定义 *cluster_id*、*node_id* 和 *url* 属性。


如果 [db_mode](#db_mode) 设置为 *0*，则此参数至少应设置一次，以便正确学习集群拓扑。如果未设置，学习节点拓扑的唯一方式是其他节点连接到本地实例。


```opensips title="设置 neighbor_node_info 参数"
...
modparam("clusterer", "neighbor_node_info", "cluster_id=1,node_id=2,url=bin:192.168.0.6:5566")
...
	
```


#### ping_interval


向邻居节点发送定期 ping 之间的时间间隔，单位为秒。


*默认值为 "4"*


```opensips title="设置 ping_interval 参数"
...
modparam("clusterer", "ping_interval", 1)
...
	
```


#### ping_timeout


等待先前发送的 ping 应答的时间，单位为毫秒；超过此时间则重试，或将与邻居节点的链路视为断开。这也是发送失败后连续重试之间的间隔。


*默认值为 "1000"*


```opensips title="设置 ping_timeout 参数"
...
modparam("clusterer", "ping_timeout", 500)
...
	
```


#### node_timeout


对失败节点重新开始 ping 之前等待的时间，单位为秒。


*默认值为 "60"*


```opensips title="设置 node_timeout 参数"
...
modparam("clusterer", "node_timeout", 10)
...
	
```


#### seed_fallback_interval {#seed_fallback_interval}


仅对「种子」节点相关。在节点重启或执行 MI 集群同步命令之后，等待合适供体节点的时间，单位为秒；超过此时间则回退到「已同步」状态。


*默认值为 "5"。*


```opensips title="设置 seed_fallback_interval 参数"
...
modparam("clusterer", "seed_fallback_interval", 10)
...
	
```


#### sync_timeout


自收到最后一个同步数据包以来的时间间隔，单位为秒；超过此时间则将同步过程视为失败，并将节点恢复为未同步状态。


*默认值为 "15"。*


```opensips title="设置 sync_timeout 参数"
...
modparam("clusterer", "sync_timeout", 5)
...
	
```


#### sync_packet_size


执行数据同步时发送的 BIN 包的最大大小。这只是一个建议值，因为包的实际大小可能略大。


*默认值为 "65535"。*


```opensips title="设置 sync_packet_size 参数"
...
modparam("clusterer", "sync_packet_size", 32765)
...
	
```


#### dispatch_jobs


启用将作业（处理复制的数据包）从接收 TCP 工作进程分派给空闲的 opensips 工作进程（包括 UDP、定时器进程等）。


这通常能提高高流量场景下处理复制包的性能，不应禁用。


但在某些情况下会出现「惊群」问题，导致 CPU 负载异常高。禁用此分派机制可以解决这类问题。


*默认值为 "1"（启用）。*


```opensips title="设置 dispatch_jobs 参数"
...
modparam("clusterer", "dispatch_jobs", 0)
...
	
```


#### id_col


存储表行 id 的列名。


*默认值为 "id"。*


```opensips title="设置 id_col 参数"
...
modparam("clusterer", "id_col", "id")
...
	
```


#### cluster_id_col


存储集群 id 的列名。


*默认值为 "cluster_id"。*


```opensips title="设置 cluster_id_col 参数"
...
modparam("clusterer", "cluster_id_col", "cluster_id")
...
	
```


#### node_id_col


存储实例 id 的列名。这些值必须大于 0。


*默认值为 "node_id"。*


```opensips title="设置 node_id_col 参数"
...
modparam("clusterer", "node_id_col", "node_id")
...
	
```


#### url_col


包含实例 url 的列名。这些值必须大于 0。


*默认值为 "url"。*


```opensips title="设置 url_col 参数"
...
modparam("clusterer", "url_col", "url")
...
	
```


#### state_col


存储节点状态（enabled/disabled）的列名。


*默认值为 "state"。*


```opensips title="设置 state_col 参数"
...
modparam("clusterer", "state_col", "state")
...
	
```


#### no_ping_retries_col


包含最大 ping 重试次数的列名，超过此次数后与邻居节点的链路被视为断开。


*默认值为 "no_ping_retries"。*


```opensips title="设置 no_ping_retries_col 参数"
...
modparam("clusterer", "no_ping_retries_col", "no_ping_retries")
...
	
```


#### priority_col


存储节点优先级的列名，在重路由消息时，若存在等长（跳数相同）路径，则用该优先级选择下一跳。


*默认值为 "priority"。*


```opensips title="设置 priority_col 参数"
...
modparam("clusterer", "priority_col", "priority")
...
	
```


#### sip_addr_col


包含节点 SIP 地址的列名。


*默认值为 "sip_addr"。*


```opensips title="设置 sip_addr_col 参数"
...
modparam("clusterer", "sip_addr_col", "sip_addr")
...
	
```


#### flags_col


包含节点标志位的列名。


*默认值为 "flags"。*


```opensips title="设置 flags_col 参数"
...
modparam("clusterer", "flags_col", "flags")
...
	
```


#### description_col


包含节点描述的列名。


*默认值为 "description"。*


```opensips title="设置 description_col 参数"
...
modparam("clusterer", "description_col", "description")
...
	
```


#### enable_stats (integer)


是否启用统计支持。通过统计变量，模块提供有关集群节点的信息。将其设为零以禁用，设为非零以启用。


*默认值为 "1 (enabled)"。*


```opensips title="设置 enable_stats 参数"
...
modparam("clusterer", "enable_stats", 0)
...
			
```


#### enable_rerouting (integer)


如果到目的地的直接路由不可用，是否应通过另一节点重路由数据包。在双节点拓扑中禁用可提高稳定性。将其设为零以禁用，设为非零以启用。


*默认值为 "1 (enabled)"。*


```opensips title="设置 enable_rerouting 参数"
...
modparam("clusterer", "enable_rerouting", 0)
...
			
```


### 导出的函数 {#exported-functions}


#### cluster_send_req(cluster_id, dst_id, msg, [tag])


此函数用于直接从脚本向集群中的特定节点发送包含自定义数据的通用请求类消息。该消息本身并不是「请求」，但根据接收端的逻辑，该节点可以回送一个应答。为了将收到的应答与发出的请求关联起来，函数通过 *tag* 参数返回一个随机生成的通信标签，该标签会随原始消息一起发送，可用于与应答中收到的标签进行比对。


各参数含义如下：


- *cluster_id* (int) - 目标节点的集群 ID；
- *dst_id* (int) - 目标节点的 ID；
- *msg* (string) - 实际的消息载荷；
- *tag* (var, optional) - 随机生成的通信标签。


此函数可以返回以下值：


- *1* - 成功将消息发送到目标节点或合法下一跳
- *-1* - 本地节点被禁用，无法发送
- *-2* - 根据已发现的拓扑，目标节点不可通过任何路径到达
- *-3* - 目标节点或合法下一跳看似可达，但发送失败或出现其他 OpenSIPS 内部错误


此函数可以在 REQUEST_ROUTE、FAILURE_ROUTE、ONREPLY_ROUTE、BRANCH_ROUTE、LOCAL_ROUTE 和 EVENT_ROUTE 中使用。


```opensips title="cluster_send_req() 用法"
...
# 发送一个请求
cluster_send_req(1, 1, "Check USER: $fU", $var(req_tag));
# 等待应答
$avp(filter) = "tag=" + $var(req_tag);
async(wait_for_event("E_CLUSTERER_RPL_RECEIVED", $avp(filter), 5), rpl_resume);
# 完成
...
route[rpl_resume] {
  xlog("Received reply: $avp(msg)\n");
}
...
			
```


#### cluster_send_rpl(cluster_id, dst_id, msg, tag)


此函数用于直接从脚本向集群中的特定节点发送包含自定义数据的通用应答类消息。该消息被标记为「应答」，因此此函数只应用于回复先前收到的请求类消息。为了让最初发送请求的另一节点能够将此应答与之关联，应把随请求一起收到的通信标签传给该函数。


各参数含义如下：


- *cluster_id* (int) - 目标节点的集群 ID；
- *dst_id* (int) - 目标节点的 ID；
- *msg* (string) - 实际的消息载荷；
- *tag* (var) - 通信标签。


此函数可以返回以下值：


- *1* - 成功将消息发送到目标节点或合法下一跳
- *-1* - 本地节点被禁用，无法发送
- *-2* - 根据已发现的拓扑，目标节点不可通过任何路径到达
- *-3* - 目标节点或合法下一跳看似可达，但发送失败或出现其他 OpenSIPS 内部错误


此函数可以在 REQUEST_ROUTE、FAILURE_ROUTE、ONREPLY_ROUTE、BRANCH_ROUTE、LOCAL_ROUTE 和 EVENT_ROUTE 中使用。


```opensips title="cluster_send_rpl() 用法"
...
event_route[E_CLUSTERER_REQ_RECEIVED] {
  cluster_send_rpl($param(cluster_id), $param(src_id), $var(my_reply), $param(tag));
}
...
			
```


#### cluster_broadcast_req(cluster_id, msg, [tag], [include_self])


此函数的行为与 `cluster_send_req()` 函数类似，区别在于消息会发送给指定集群中的所有节点。


- *include_self* (bool, optional, default: *false*) - 也为当前节点触发事件，但不实际发送数据包（req 和 rpl 都不发送）。


此函数可以返回以下值：


- *1* - 成功将消息发送到至少一个节点；
- *-1* - 本地节点被禁用，无法发送；
- *-2* - 根据已发现的拓扑，集群中的所有节点都不可达；
- *-3* - 对集群中所有节点发送失败，或出现其他 OpenSIPS 内部错误。


参数含义与 `cluster_send_req()` 相同。


此函数可以在 REQUEST_ROUTE、FAILURE_ROUTE、ONREPLY_ROUTE、BRANCH_ROUTE、LOCAL_ROUTE 和 EVENT_ROUTE 中使用。


```opensips title="cluster_broadcast_req() 用法"
...
# 也为当前节点触发事件
cluster_broadcast_req($var(cl_id), $var(share_data), , true);
...
			
```


#### cluster_check_addr(cluster_id, ip, addr_type)


此函数检查给定 IP 地址是否属于集群中的某个节点。


参数：


- *cluster_id* (int)
- *ip* (string)
- *addr_type* (string, optional) -
选择用于比较的节点地址，可选值为：
    * *"sip"*（默认）- 节点在 DB 中配置的 SIP 地址
    * *"bin"* - 节点的 BIN 接口监听地址


此函数可以在 REQUEST_ROUTE、FAILURE_ROUTE、ONREPLY_ROUTE、BRANCH_ROUTE、LOCAL_ROUTE 和 EVENT_ROUTE 中使用。


```opensips title="cluster_check_addr() 用法"
...
if (cluster_check_addr(1, $si)) {
	...
}
...
			
```


### 导出的 MI 函数 {#exported-mi-functions}


#### clusterer_reload


从 clusterer 数据库重新加载数据。当前已建立的拓扑将丢失，节点将重新发现新拓扑。


名称：*clusterer_reload*


参数：*无*


MI FIFO 命令格式：


```bash
opensips-cli -x mi clusterer_reload
```


#### clusterer_list


列出每个集群中其他节点的信息（节点 id、URL、与该节点的链路状态等）。


名称：*clusterer_list*


参数：*无*


```bash title="clusterer_list 用法"
$ opensips-cli -x mi clusterer_list
{
    "Clusters": [
        {
            "cluster_id": 1,
            "Nodes": [
                {
                    "node_id": 1,
                    "db_id": 1,
                    "url": "bin:127.0.0.1",
                    "link_state": "Up",
                    "next_hop": "1",
                    "description": "none"
                }
            ]
        }
    ]
}
```


#### clusterer_list_topology


以邻接表的形式，从本地节点的视角列出每个集群的拓扑。如果与某个节点的链路处于 up 状态，则该节点会作为邻居出现。


注意，如果某个节点 id 出现在多个集群中，它指的是属于不同集群的同一实例，而在这些集群中它具有不同的拓扑。


名称：*clusterer_list_topology*


参数：*无*


```bash title="clusterer_list_topology 用法"
$ opensips-cli -x mi clusterer_list_topology
{
    "Clusters": [
        {
            "cluster_id": 1,
            "Nodes": [
                {
                    "node_id": 2,
                    "Neighbours": [
                        1
                    ]
                },
                {
                    "node_id": 1,
                    "Neighbours": [
                        2
                    ]
                }
            ]
        }
    ]
}
```


#### clusterer_set_status {#clusterer_set_status}


设置节点的状态（Enabled/Disabled）。如果本地实例被禁用，该节点将不发送任何消息，并忽略收到的消息，从而在拓扑中（从其他节点的视角）表现为失败节点。如果禁用的是其他节点，本地实例在发送/接收任何消息时会简单地忽略该指定节点，如同它不再属于拓扑。


名称：*clusterer_set_status*


参数：


- *cluster_id* - 表示集群的 id。
- *node_id* (optional) - 表示要禁用的节点 id。如果缺失，将禁用本地实例。
- *status* - 表示新状态（0 - Disabled，1 - Enabled）。


MI FIFO 命令格式：


```bash
#禁用本地实例
opensips-cli -x mi clusterer_set_status 1 0
#禁用节点 ID 3
opensips-cli -x mi clusterer_set_status 1 3 0
```


#### clusterer_remove_node


从集群拓扑中移除一个节点。只需在单个节点上运行该函数，即可将目标节点从集群中的所有其他节点上移除。如果要移除的节点在触发此函数时正在运行，它将被自动禁用（等同于在该特定节点上运行 [clusterer_set_status](#clusterer_set_status)）。


此函数只能在 [db_mode](#db_mode) 设置为 *0*（禁用）时使用。


名称：*clusterer_remove_node*


参数：


- *cluster_id* - 集群 ID
- *node_id* - 要移除的节点 ID。


MI FIFO 命令格式：


```bash
opensips-cli -x mi clusterer_remove_node 1 3
```


#### cluster_send_mi


将给定的 MI 命令分派到集群中的特定节点上运行。


名称：*cluster_send_mi*


参数：


- *cluster_id* - 集群的 id。
- *destination* - 目标节点的 id
- *cmd_name* - 要运行的 MI 命令名称
- *cmd_params* (optional) - 要运行的 MI 命令的参数数组


注意，目前不支持需要命名参数或以数组作为参数值的 MI 命令。


MI FIFO 命令格式：


```bash
opensips-cli -x mi cluster_send_mi 1 3 lb_reload
```


#### cluster_broadcast_mi


将给定的 MI 命令分派到集群中的所有节点上运行。该命令也会在本地执行。


名称：*cluster_broadcast_mi*


参数：


- *cluster_id* - 集群的 id。
- *cmd_name* - 要运行的 MI 命令名称
- *cmd_params* (optional) - 要运行的 MI 命令的参数数组


注意，目前不支持需要命名参数或以数组作为参数值的 MI 命令。


MI FIFO 命令格式：


```bash
opensips-cli -x mi cluster_broadcast_mi 1 dr_reload partition_5
```


#### clusterer_list_cap {#clusterer_list_cap}


列出已注册的能力及其状态。


名称：*clusterer_list_cap*


参数：*无*


```bash title="clusterer_list_cap 用法"
$ opensips-cli -x mi clusterer_list_cap
{
    "Clusters": [
        {
            "cluster_id": 1,
            "Capabilities": [
                {
                    "name": "dialog-dlg-repl",
                    "state": "Ok",
                    "enabled": "yes"
                },
                {
                    "name": "dialog-prof-repl",
                    "state": "Ok",
                    "enabled": "yes"
                }
            ]
        }
    ]
}
```


#### clusterer_set_cap_status


设置能力的状态（Enabled/Disabled）。如果某个能力被禁用，节点将不发送属于该能力的任何复制/同步消息。同样，收到的消息将被丢弃。此外，该能力将转为「未同步」状态，节点也不再能作为同步的供体。


名称：*clusterer_set_cap_status*


参数：


- *cluster_id* - 集群的 id
- *capability* - 能力名称，由 [clusterer_list_cap](#clusterer_list_cap) 列出
- *status* - 表示新状态（0 - Disabled，1 - Enabled）。


MI FIFO 命令格式：


```bash
#在集群 1 中禁用对话复制
opensips-cli -x mi clusterer_set_cap_status 1 dialog-dlg-repl 0
#在集群 2 中启用对话配置文件复制
opensips-cli -x mi clusterer_set_cap_status 2 dialog-prof-repl 1
```


#### clusterer_shtag_set_active


将给定的共享标签设置为 *active* 状态。此变更信息也会在集群中广播，以强制任何可能在该标签上处于 active 的其他节点退让为 backup。


名称：*clusterer_shtag_set_active*


参数：*tag* - 要设为 active 的标签名称及其所属集群，格式为 'tag/cluster_id'。


MI FIFO 命令格式：


```bash
opensips-cli -x mi clusterer_shtag_set_active vip1/3
```


#### clusterer_list_shtags


列出所有已知的共享标签及其状态。


名称：*clusterer_list_shtags*


参数：*命令不接受任何参数*


MI FIFO 命令格式：


```bash
opensips-cli -x mi clusterer_list_shtags
```


### 导出的脚本变量 {#exported-script-variables}


#### $cluster.sh_tag


这是一个读/写变量，允许访问由 clusterer 模块管理的共享标签。


此类变量的名称格式为 *tag_name/cluster_id*，例如 *$cluster.sh_tag(vip/3)* 访问集群 ID 3 中名为 "vip" 的共享标签。


设置时，共享标签只能通过为其赋值来切换到 active：


- "active"
- 1


读取其值时，共享标签返回：


- "active" 或 1
- "backup" 或 0


只有在发生内部错误（如内存错误）时，才可能返回 NULL 值。


### 导出的事件 {#exported-events}


#### E_CLUSTERER_REQ_RECEIVED


当收到通用的请求类 clusterer 消息时触发此事件。此类消息直接从脚本发送，而不是由 OpenSIPS 模块发送。


参数：


- *cluster_id* - 源节点的集群 ID。
- *src_id* - 源节点的 ID。
- *msg* - 实际的消息载荷。
- *tag* - 此消息的通信标签，由源节点生成。可将该标签提供给 `cluster_send_rpl()` 函数，以发送与所收消息对应的应答。


#### E_CLUSTERER_RPL_RECEIVED


当收到通用的应答类 clusterer 消息时触发此事件。此类消息直接从脚本发送，而不是由 OpenSIPS 模块发送。


参数：


- *cluster_id* - 源节点的集群 ID。
- *src_id* - 源节点的 ID。
- *msg* - 实际的消息载荷。
- *tag* - 此消息的通信标签。可用于将收到的应答与通过 `cluster_send_req()` 或 `cluster_broadcast_req()` 函数发送的请求相匹配。


#### E_CLUSTERER_NODE_STATE_CHANGED


当节点的可用性状态发生变化时触发此事件。


参数：


- *cluster_id* - 集群 ID。
- *node_id* - 节点的 ID。
- *new_state* - 节点的新状态，可能的值：0 - down，1 - up。


#### E_CLUSTERER_SHARING_TAG_CHANGED


当共享标签的状态发生变化时触发此事件。


参数：


- *name* - 共享标签的名称。
- *cluster* - 集群 ID。
- *state* - 共享标签的新状态，可能的值："active" 或 "backup"。
- *reason* - 简短文本，描述触发状态变更的原因，例如另一节点成为 active、MI 命令或脚本变量。


### 导出的状态/报告标识符 {#exported-statusreport-identifiers}


模块提供 *clusterer* 状态/报告组。


#### sharing_tags


*sharing_tags* 标识符用于报告共享标签的状态变化（在 active 与 backup 之间）以及变更原因。此标识符在丢弃旧记录之前保留 200 条记录的历史。


```json
{
    "Name": "sharing_tags",
    "Reports": [
        {
            "Timestamp": 1652367224,
            "Date": "Thu May 12 17:53:44 2022",
            "Log": "TAG <HA>, cluster 1, became backup due to cluster broadcast from 2"
        },
        {
            "Timestamp": 1652367326,
            "Date": "Thu May 12 17:55:26 2022",
            "Log": "TAG <HA>, cluster 1, became active due to MI command"
        }
    ]
}

	
```


#### node_states


*node_states* 标识符用于报告节点状态（在可用性方面）的变化。此标识符在丢弃旧记录之前保留 200 条记录的历史。


```json
{
    "Name": "node_states",
    "Reports": [
        {
            "Timestamp": 1656489246,
            "Date": "Wed Jun 29 10:54:06 2022",
            "Log": "Node [2], cluster [1] is UP"
        },
        {
            "Timestamp": 1656489261,
            "Date": "Wed Jun 29 10:54:21 2022",
            "Log": "Node [2], cluster [1] is DOWN"
        }
    ]
}

	
```


#### cap:[capability_name]


每个注册到 clusterer 模块的能力都有一个对应的标识符，名为 *cap:[capability_name]*，用于提供该能力的数据同步状态。该状态反映同步过程的进展，可能具有以下值：


- *-3* - 未同步
- *-2* - 同步挂起（等待合适的供体节点或实际同步数据）
- *-1* - 同步进行中
- *1* - 已同步（同步已完成，或该能力根本不需要数据同步）


```json
{
    "Name": "cap:dialog-dlg-repl",
    "Readiness": true,
    "Status": 1,
    "Details": "synced"
},
	
```


能力标识符还提供有关同步过程主要阶段的报告。这些标识符在丢弃旧记录之前保留 200 条记录的历史。


```json
{
    "Name": "cap:dialog-dlg-repl",
    "Reports": [
        {
            "Timestamp": 1656966903,
            "Date": "Mon Jul  4 23:35:03 2022",
            "Log": "Sync requested"
        },
        {
            "Timestamp": 1656966904,
            "Date": "Mon Jul  4 23:35:04 2022",
            "Log": "Sync started from node [1]"
        },
        {
            "Timestamp": 1656966906,
            "Date": "Mon Jul  4 23:35:06 2022",
            "Log": "Sync completed, received [10000] chunks"
        }
    ]
},

	
```


有关如何访问和使用状态/报告信息，请参见 [Status/Report 接口](/zh/manual/Interface-StatusReport)。


### 使用示例 {#usage-example}


本节提供一个在两个 OpenSIPS 实例之间复制 ratelimit 管道的使用示例。它使用 clusterer 模块管理复制节点，并结合 *proto_bin* 模块发送复制信息。


搭建的拓扑很简单：我们有两个运行在两台不同机器上的 OpenSIPS 节点（它们也可以运行在同一台机器上）：*Node A* 的 IP 为 192.168.0.5，*Node B* 的 IP 为 192.168.0.6。除了流量监听地址（UDP、TCP 等）之外，两者都绑定了端口 *5566* 上的 BIN 监听地址。这些监听地址将用于二进制通信。


我们在 *clusterer* 表中插入以下内容：


```c title="示例数据库内容 - clusterer 表"
+----+------------+---------+----------------------+-------+-----------------+----------+----------+-------+-------------+
| id | cluster_id | node_id | url                  | state | no_ping_retries | priority | sip_addr | flags | description |
+----+------------+---------+----------------------+-------+-----------------+----------+----------+-------+-------------+
| 10 |          1 |       1 | bin:192.168.0.5:5566 |     1 |                3|       50 | NULL     | NULL  | Node A      |
| 20 |          1 |       2 | bin:192.168.0.6:5566 |     1 |                3|       50 | NULL     | NULL  | Node B      |
+----+------------+---------+----------------------+-------+-----------------+----------+----------+-------+-------------+
	
```


- "cluster_id" - 集群的标识符。一个组/集群内的所有节点应具有相同的 id（在我们的示例中，两个节点的 ID 都是 *1*）。这些值必须大于 0。
- "node_id" - 机器/节点的标识符，因此集群内的每个实例应具有不同的 ID。这些值必须大于 0。在我们的示例中，*Node A* 的 ID 为 1，*Node B* 的 ID 为 2。
- "url" - 该实例的所有 BIN 包将被发送到的地址。
- "state" - 节点状态：*1* 表示 Enabled，*0* 表示 Disabled。被禁用的节点不会发送任何 BIN 包，并会丢弃收到的包。
- "no_ping_retries" - 在与节点的链路被视为断开之前的最大 ping 重试次数。
- "priority" - 在重路由消息时，若存在等长（跳数相同）路径，用于选择下一跳的节点优先级；在此双节点拓扑示例中不相关。
- "sip_addr" - 节点的 SIP 地址，会透明地提供给模块；在我们的示例中对 ratelimit 模块没有用处。
- "flags" - 用于定义种子节点；在我们的示例中没有用处。
- "description" - 用于描述节点的不透明值


在数据库中配置好两个节点后，我们需要配置两个 OpenSIPS 实例。首先配置 *Node A*：


```opensips title="*Node A* 配置"
...
socket= bin:192.168.0.5:5566 # Node A 的 bin 监听地址

loadmodule "proto_bin.so"

loadmodule "clusterer.so"
modparam("clusterer", "db_url", "mysql://opensips@192.168.0.7/opensips")
modparam("clusterer", "my_node_id", 1) # Node A 的 node_id

loadmodule "ratelimit.so"
modparam("ratelimit", "pipe_replication_cluster", 1)
...
	
```


类似地，*Node B* 的配置如下：


```opensips title="*Node B* 配置"
...
socket= bin:192.168.0.6:5566 # Node B 的 bin 监听地址

loadmodule "proto_bin.so"

loadmodule "clusterer.so"
# 理想情况下，两个节点使用同一个数据库
modparam("clusterer", "db_url", "mysql://opensips@192.168.0.7/opensips")
modparam("clusterer", "my_node_id", 2) # Node B 的 node_id

loadmodule "ratelimit.so"
modparam("ratelimit", "pipe_replication_cluster", 1)
...
	
```


使用上述配置启动两个 OpenSIPS 实例，即可让平台以非常高效且可扩展的方式使用共享的 ratelimit 管道。


### 导出的统计 {#exported-statistics}


#### clusterer_nodes


返回集群节点的总数。


#### clusterer_nodes_up


返回处于 UP 状态的集群节点总数。


#### clusterer_nodes_down


返回不处于 UP 状态的集群节点总数。


## 开发指南 {#developer-guide}


### 可用函数 {#available-functions}


#### get_nodes(cluster_id)


此函数将返回指定集群中所有可达节点的列表（如果直连链路断开/正在探测，则考虑经过中间节点的路径）。


返回的节点结构：


```c
...
typedef struct clusterer_node {
    int node_id;
    union sockaddr_union addr;
    str sip_addr;
    str description;
    struct clusterer_node *next;
} clusterer_node_t;
...
        
```


各参数含义如下：


- *int cluster_id* - 集群 id


#### free_nodes(list)


此函数将释放 *get_nodes* 返回的节点列表。


各参数含义如下：


- *clusterer_node_t *list* - 列表头


#### set_state(cluster_id, state)


此函数设置当前节点在指定集群中的状态（enabled/disabled）。


各参数含义如下：


- *int cluster_id* - 集群 id
- *enum cl_node_state state* - 新状态；可能的值：

  - *STATE_DISABLED*
  - *STATE_ENABLED*


#### check_addr(cluster_id, su)


此函数检查给定地址是否属于集群中的某个节点。


各参数含义如下：


- *int cluster_id* - 集群 id
- *union sockaddr_union* su* - 套接字地址


#### get_my_id()


此函数将返回当前节点的 id。


#### send_to(packet, cluster_id, node_id)


此函数将给定的 BIN 包发送到集群中指定的节点。如果直连链路断开/正在探测，且目标节点可通过集群拓扑中的另一条路径到达，则会将该包发送给中间节点。


各参数含义如下：


- *bin_packet_t packet* - 要发送的包
- *int cluster_id* - 集群 id
- *int node_id* - 目标节点的 id


此函数返回以下值之一：


- *CLUSTERER_SEND_SUCCESS* - 成功将包发送到目标节点或合法下一跳
- *CLUSTERER_CURR_DISABLED* - 当前节点被禁用，无法发送
- *CLUSTERER_DEST_DOWN* - 根据已发现的拓扑，目标节点不可通过任何路径到达
- *CLUSTERER_SEND_ERR* - 目标节点或合法下一跳看似可达，但发送失败


#### send_all(packet, cluster_id)


将给定的 BIN 包发送到指定集群中的所有节点。该函数的运行方式与 *send_to* 类似。


各参数含义如下：


- *bin_packet_t packet* - 要发送的包
- *int cluster_id* - 集群 id


此函数返回以下值之一：


- *CLUSTERER_SEND_SUCCESS* - 成功将包发送到至少一个节点
- *CLUSTERER_CURR_DISABLED* - 当前节点被禁用，无法发送
- *CLUSTERER_DEST_DOWN* - 根据已发现的拓扑，集群中的所有节点都不可达
- *CLUSTERER_SEND_ERR* - 对集群中所有节点发送失败


#### get_next_hop(cluster_id, node_id)


此函数返回在指定集群中到给定目标节点所计算最短路径的下一跳。当与预期目的地的直连链路断开时，这就是 *send_to* 和 *send_all* 函数的实际发送目标。该函数返回与 *get_nodes* 相同的结构。


各参数含义如下：


- *int cluster_id* - 集群 id
- *int node_id* - 需要返回其下一跳的目标节点的 id。


#### free_next_hop(next_hop)


此函数将释放 *get_next_hop* 返回的下一跳。


各参数含义如下：


- *clusterer_node_t *next_hop* - 要释放的下一跳


#### register_module(mod_name, cb, auth_check, accept_clusters_ids, no_accept_clusters)


此函数注册一个 OpenSIPS 模块，以便接收 BIN 包和集群通知。某个模块可以接受来自多个集群的包，并提供一个单一的回调函数，对每个收到的包调用。该函数也会被调用来通知集群事件，例如节点变为可达/不可达。


各参数含义如下：


- *char *mod_name* - 模块名
- *clusterer_cb_f cb* - 回调函数
- *int auth_check* - 0 - 不检查，1 - 对每个收到的 BIN 包检查源 IP 是否属于集群中的某个节点
- *int* accept_clusters_ids* - 接受包的集群 id 数组
- *int no_accept_clusters* - *accept_clusters_ids* 数组的长度


回调函数原型：


```c
...
typedef void (*clusterer_cb_f)(enum clusterer_event ev,bin_packet_t *, int packet_type,
                struct receive_info *ri, int cluster_id, int src_id, int dest_id);
...
```


通过回调函数的 *ev* 参数发出的事件可能的值：


- *CLUSTER_RECV_MSG* - 收到 BIN 消息
- *CLUSTER_ROUTE_FAILED* - 未能路由收到的、目的为集群中另一节点的 BIN 包
- *CLUSTER_NODE_UP* - 节点变为可达
- *CLUSTER_NODE_DOWN* - 节点变为不可达
<!-- CONTRIBUTORS -->

### 许可证 {#license}

所有文档文件（即 .md 扩展名）均以 Creative Common License 4.0 许可发布。
