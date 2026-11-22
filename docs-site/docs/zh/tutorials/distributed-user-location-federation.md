---
title: "如何配置联邦式用户位置集群"
description: "OpenSIPS 用户位置的“federation”集群策略是一套完整的高端方案。"
---

## 说明 {#description}

OpenSIPS 用户位置的“federation”（联邦）集群策略是一套完整的高端方案，具备：

* 出色的水平扩展能力
* 集群节点之间极少的网络交互
* 极小的 NoSQL DB 记录，从而最大化 NoSQL 集群的扩展潜力
* 能够将集群化的注册服务器部署在平台边缘、直接面向客户端，同时保持所有 SIP AoR（Address-of-Record）及其全部 Contact 的全局可达性
* 可选的 NAT 保活支持
* 可选的重启持久化支持
* 可选的“热备份”高可用支持


节点不会把用户位置数据全网格复制到整个集群（即 [“全共享”](/zh/tutorials/distributed-user-location-full-sharing) 集群策略的做法），而是只向共享的 NoSQL 数据库发布一些轻量的元数据“AoR 可用性”记录，如下图所示：


![联邦式集群基本拓扑](/public/uploads/federation-basic.jpg)


该部署方式还为集群中的每个成员支持一个“热备份”节点，使得活动节点崩溃或离线时几乎可以立即完成故障切换。这是通过在每对服务器前端放置一个虚拟 IP 实现的，如下图所示：


![联邦式集群高可用拓扑](/public/uploads/federation-ha.jpg)


### 配置 {#configuration}

对于最小规模的部署，需要：

* 两个 OpenSIPS 实例
* 一个 MySQL 实例
* 一个 Cassandra 或 MongoDB 实例（之后可以将其升级为集群）

以下是相关的 OpenSIPS 配置片段：


```opensips

loadmodule "usrloc.so"
modparam("usrloc", "working_mode_preset", "federation-cachedb-cluster")
modparam("usrloc", "location_cluster", 1)

# 使用 Cassandra 时，务必事先创建 keyspace 与表：
# CREATE KEYSPACE IF NOT EXISTS opensips WITH replication = {'class': 'SimpleStrategy', 'replication_factor': '1'}  AND durable_writes = true;
# USE opensips;
# CREATE TABLE opensips.userlocation (
#     id text,
#     aor text,
#     home_ip text,
#     PRIMARY KEY (id));
loadmodule "cachedb_cassandra.so"
modparam("usrloc", "cachedb_url", "cassandra://10.0.0.5:9042/opensips.userlocation")

# 使用 MongoDB 时，无需创建任何数据库或集合……
loadmodule "cachedb_mongodb.so"
modparam("usrloc", "cachedb_url", "mongodb://10.0.0.5:27017/opensipsDB.userlocation")

loadmodule "clusterer.so"
modparam("clusterer", "my_node_id", 3)
modparam("clusterer", "db_url", "mysql://opensips:opensipsrw@localhost/opensips")

```


无高可用（2 个活动节点）的 clusterer 表示例：

```sql

INSERT INTO clusterer(id, cluster_id, node_id, url, state, no_ping_retries, priority, sip_addr, flags, description) VALUES \
(NULL, 1, 1, 'bin:10.0.0.177', 1, 3, 50, '10.0.0.177', 'seed', NULL), \
(NULL, 1, 3, 'bin:10.0.0.179', 1, 3, 50, '10.0.0.179', 'seed', NULL);

```

| **id** | **cluster id** | **node_id** | **url** | **state** | **no_ping_retries** | **priority** | **sip_addr** | **flags** | **description** |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
|  14 | 1 | 1 | bin:10.0.0.177 | 1 | 3 | 50 | 10.0.0.177 | seed | NULL |
|  15 | 1 | 3 | bin:10.0.0.179 | 1 | 3 | 50 | 10.0.0.179 | seed | NULL |

**clusterer 表示例（无高可用）**


请注意我们把两个节点的 “flags” 列都设为 “seed”。这样可以确保用户位置模块在空数据集下也能安全启动并正常工作。如果某个节点的 “flags” 留为 NULL，那么该节点启动时，其用户位置模块会开始寻找一个健康的供体节点，并通过集群同步从中请求一次完整的用户位置数据传输。另外，“sip_addr” 列等于我们希望接收流量的 SIP 监听地址，这些流量对应我们在 NoSQL 数据库中声明属于自己的 AoR。这是 “sip_addr” 在 usrloc 中的特定用法——其他启用集群的模块可能以不同方式使用该列，或完全忽略它。


带高可用的 clusterer 表数据配置示例（2 个活动节点 + 2 个被动节点）：

```sql

INSERT INTO clusterer(id, cluster_id, node_id, url, state, no_ping_retries, priority, sip_addr, flags, description) VALUES \
(NULL, 1, 1, 'bin:10.0.0.177', 1, 3, 50, '10.0.0.223', 'seed', NULL), \
(NULL, 1, 2, 'bin:10.0.0.178', 1, 3, 50, '10.0.0.223', 'NULL', NULL), \
(NULL, 1, 3, 'bin:10.0.0.179', 1, 3, 50, '10.0.0.224', 'seed', NULL), \
(NULL, 1, 4, 'bin:10.0.0.180', 1, 3, 50, '10.0.0.224', 'NULL', NULL);

```

| **id** | **cluster id** | **node_id** | **url** | **state** | **no_ping_retries** | **priority** | **sip_addr** | **flags** | **description** |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
|  14 | 1 | 1 | bin:10.0.0.177 | 1 | 3 | 50 | 10.0.0.223 | seed | NULL |
|  15 | 1 | 2 | bin:10.0.0.178 | 1 | 3 | 50 | 10.0.0.223 | NULL | NULL |
|  16 | 1 | 3 | bin:10.0.0.179 | 1 | 3 | 50 | 10.0.0.224 | seed | NULL |
|  17 | 1 | 4 | bin:10.0.0.180 | 1 | 3 | 50 | 10.0.0.224 | NULL | NULL |

**clusterer 表示例（带高可用）**


为实现高可用，请注意我们用 “sip_addr” 列把节点成对分组。该列现在存放位于每对服务器前端的虚拟 IP 地址。在 federation 模式下，用户位置只会把 contact 信息复制到 “sip_addr” 值相同的节点，以实现“热备份”特性。其次，“flags” 列在活动节点上设为 “seed”，在备份节点上设为 NULL。这使你能够重启备份节点，并让它通过集群传输自动完成同步。当使用本地 SQL 数据库做 [重启持久化](/zh/modules/usrloc#param_restart_persistency) 时，“flags” 列会被忽略。

#### 注册流程 {#registration-flows}

注册流程有两个步骤：

* UA 向其所配置的注册服务器注册
* 如果创建了新的 AoR，注册服务器会在 NoSQL 集群中发布该 AoR 的可用性

我们无需在默认脚本中做任何改动即可实现上述行为。[working_mode_preset](/zh/modules/usrloc#param_working_mode_preset) 或 [cluster_mode](/zh/modules/usrloc#param_cluster_mode) 模块参数会负责这些工作。


![联邦式集群注册流程](/public/uploads/federation-registration.jpg)


#### 呼叫流程 {#call-flows}

查询 AoR 时，我们有两种选择：

* 本地查询，使用 [lookup("location")](/zh/modules/registrar#func_lookup)
* 全局查询，使用 [lookup("location", "global")](/zh/modules/registrar#func_lookup)


“global” 标志表示 lookup() 不仅会执行本地查询操作，还会做一次 NoSQL DB 查询，并为每个返回结果准备额外的分支。因此，我们会把 INVITE 分叉到被叫的本地 contact，以及此前声明过该 AoR 的任何集群成员。下面是一个呼叫示例：它被分叉到当前 PoP 本地的一台设备（分支 #1）以及一个远端 PoP（分支 #2），被叫在那里注册了第二台设备。


![联邦式集群呼叫分叉](/public/uploads/federation-forking.jpg)


在 OpenSIPS 脚本层面，我们可以用 [cluster_check_addr()](/zh/modules/clusterer#func_cluster_check_addr) 轻松区分来自同一集群其他节点的呼叫：


```opensips

route {
    ...

    $var(lookup_flags) = "method-filtering";

    if (cluster_check_addr(1, "$si")) {
        xlog("$rm from cluster, doing local lookup only\n");
    } else {
        xlog("$rm from outside, doing global lookup\n");
        $var(lookup_flags) = $var(lookup_flags) + ",global";
    }

    if (!lookup("location", $var(lookup_flags))) {
        t_reply(404, "Not Found");
        exit;
    }

    ...
}

```

#### NAT 保活 {#nat-pinging}

某些部署要求注册服务器向部分 contact 周期性地发起 SIP OPTIONS ping，以保持 NAT 绑定存活。下面是一个配置示例：

```opensips

loadmodule "nathelper.so"
modparam("nathelper", "natping_interval", 30)
modparam("nathelper", "sipping_from", "sip:pinger@localhost")
modparam("nathelper", "sipping_bflag", "SIPPING_ENABLE")
modparam("nathelper", "remove_on_timeout_bflag", "SIPPING_RTO")
modparam("nathelper", "max_pings_lost", 5)

```

然后在调用 [save()](/zh/modules/registrar#func_save) 之前，为部分或全部 contact 启用这些分支标志位：

```opensips

    ...
    setbflag("SIPPING_ENABLE");
    setbflag("SIPPING_RTO");

    if (!save("location"))
        sl_reply_error();
    ...

```


不过，当我们为联邦式集群启用高可用时，活动节点与被动节点**都会**尝试生成 ping。取决于你的 VIP 实现，被动节点可能大量输出如下错误：

```text

May 30 06:09:58 localhost /usr/sbin/opensips[18833]: ERROR:core:proto_udp_send: sendto(sock,0x812ae0,294,0,0xbffd8800,16): Invalid
argument(22) [1.2.3.4:38911]
May 30 06:09:58 localhost /usr/sbin/opensips[18833]: CRITICAL:core:proto_udp_send: invalid sendtoparameters#012one possible reason
is the server is bound to localhost and#012attempts to send to the net
May 30 06:09:58 localhost /usr/sbin/opensips[18833]: ERROR:nathelper:msg_send: send() to 1.2.3.4:38911 for proto udp/1 failed
May 30 06:09:58 localhost /usr/sbin/opensips[18833]: ERROR:nathelper:nh_timer: sip msg_send failed

```

要消除这些错误，可以把 [nh_enable_ping](/zh/modules/nathelper#mi_nh_enable_ping) MI 命令挂接到 VIP 的 active->backup 与 backup->active 切换过程中：

```bash

    opensips-mi nh_enable_ping 1 # run this on the machine that takes over the VIP (new active)
    opensips-mi nh_enable_ping 0 # run this on the machine that gives up the VIP (new passive)

```

#### 常见问题 {#faq}

##### 我应该在每个节点上部署 MySQL 吗？ {#should-i-deploy-mysql-on-each-node}

是的，SQL 数据库应当是每个 OpenSIPS 节点本地的。

##### 我应该在多个 MySQL 实例之间配置复制吗？ {#should-i-set-up-replication-between-the-mysql-instances}

不需要！SQL 数据库的唯一用途是在每次 OpenSIPS 重启时持久化注册 / 对话数据。这样即使所在数据中心与全局平台隔离，SIP 节点也能独立运行。

##### 我应该在每个节点上放置一个 MongoDB 实例吗？ {#should-i-put-a-mongodb-instance-on-each-node}

这由你自行决定。唯一的要求是有一个全局的单一 NoSQL 数据库，且所有 OpenSIPS 节点都能连接到它。这样，不同数据中心可以把各自的 AoR 元数据发布到该数据库。

##### 虚拟 IP 管理推荐使用什么工具？ {#what-is-the-recommended-tool-for-the-virtual-ip-management}

根据我们的经验，只要配置正确，*keepalived* 与 *vrrpd* 都工作得很好，不会出现任何问题。
