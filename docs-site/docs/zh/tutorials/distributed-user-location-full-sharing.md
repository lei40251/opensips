---
title: "如何配置“全共享”用户位置集群"
description: "深入剖析“full sharing”用户位置集群策略，在集群节点之间进行全网格数据复制。"
---

## 说明 {#description}

*提示：* 想更全面地了解 “full sharing” 拓扑，参见 [这篇博文](https://blog.opensips.org/2018/09/13/clustered-sip-user-location-the-full-sharing-topology/)。


 ![全共享拓扑](/public/uploads/full-sharing.png)


面向 OpenSIPS 2.4+ 用户位置实现的 *“full sharing”*（全共享）集群策略，是在 OpenSIPS 集群的各节点之间进行全网格数据复制的一种方式。每个节点都持有完整的用户位置数据集，因而能够为注册到集群的任意 SIP UA 提供查询服务。这类集群提供了：

* 高可用（任意集群节点都能正确服务进入的 SIP 流量）
* 分布式 NAT 保活支持（NAT 保活可由集群各节点分担发起）
* 所有集群节点的重启持久化
* 良好的水平扩展能力，上限取决于单个节点可处理的最大数据量


> [!IMPORTANT]
> *full sharing* 集群策略的强制要求是**任意节点都必须能够路由到任意已注册的 SIP UA**。对于简单的 *full sharing* 部署（例如主备模式），可以通过在两个节点之间使用共享的虚拟 IP 地址来满足该要求。如果集群规模较大，或端点通过 TCP/TLS 注册，则必须在集群前端放置一个前置实体（例如 SIP 负载均衡器）并启用 [Path 头域](https://tools.ietf.org/html/rfc3327)支持，从而消除网络路由上的限制。


在此部署之上，[联邦式用户位置](/zh/tutorials/distributed-user-location-federation)集群策略可提供与上述类似的能力，区别在于它不会在不同接入点（PoP）之间复制用户位置数据，使你能够按各 POP 的用户池规模独立扩展。

## 主备式“全共享”部署 {#activepassive-full-sharing-setup}

### 配置 {#configuration}

对于最小规模的部署（前置虚拟 IP 的 2 节点主备），需要：

* 两个 OpenSIPS 实例
* 实例之间可用的共享 / 虚拟 IP（例如使用 *keepalived*、*vrrpd* 等）
* 一个用于数据配置的 MySQL 实例


相关的 *opensips.cfg* 片段：


```opensips

listen = sip:10.0.0.150 # virtual IP (same on both nodes)
listen = bin:10.0.0.177

loadmodule "usrloc.so"
modparam("usrloc", "working_mode_preset", "full-sharing-cluster")
modparam("usrloc", "location_cluster", 1)

loadmodule "clusterer.so"
modparam("clusterer", "my_node_id", 1) # node number #1
modparam("clusterer", "db_url", "mysql://opensips:opensipsrw@localhost/opensips")

loadmodule "proto_bin.so"

```

### 数据配置 {#provisioning}

```sql

INSERT INTO clusterer(id, cluster_id, node_id, url, state, no_ping_retries, priority, sip_addr, flags, description) VALUES \
(NULL, 1, 1, 'bin:10.0.0.177', 1, 3, 50, NULL, 'seed', NULL), \
(NULL, 1, 2, 'bin:10.0.0.178', 1, 3, 50, NULL, NULL, NULL);

```

| **id** | **cluster id** | **node_id** | **url** | **state** | **no_ping_retries** | **priority** | **sip_addr** | **flags** | **description** |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
|  14 | 1 | 1 | bin:10.0.0.177 | 1 | 3 | 50 | NULL | seed | NULL |
|  15 | 1 | 2 | bin:10.0.0.178 | 1 | 3 | 50 | NULL | NULL | NULL |

**原生“全共享”clusterer 表**

### NAT 保活 {#nat-pinging}

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


为避免被动节点在尝试发起 NAT 保活时输出 “permission denied” 错误日志，务必把 [nh_enable_ping](/zh/modules/nathelper#mi_nh_enable_ping) MI 命令挂接到 VIP 的 active->passive 与 passive->active 切换过程中：

```bash

    opensips-mi nh_enable_ping 1 # run this on the machine that takes over the VIP (new active)
    opensips-mi nh_enable_ping 0 # run this on the machine that gives up the VIP (new passive)

```

## 带 SIP 前端的 NoSQL “全共享”集群 {#nosql-full-sharing-cluster-with-a-sip-front-end}

这是 OpenSIPS 用户位置的超高可扩展版本，可支撑用户池规模超过**数百万**级别。通过让一个外部专用数据库集群管理全部注册数据，我们得以将 SIP 信令系统与数据存储系统解耦。反过来，这也使两个系统可以各自高效地独立扩展。

### 配置

对于最小规模的部署，需要：

* 一个位于集群前端、支持 [SIP Path](https://tools.ietf.org/html/rfc3327) 的 SIP 前端代理
* 两个构成集群的后端 OpenSIPS 实例
* 一个 NoSQL DB 实例，例如 Cassandra 或 MongoDB，用于存放全部注册数据（之后可以将其升级为集群）
* 一个用于数据配置的 MySQL 实例


在后端层（集群实例）上，相关的 *opensips.cfg* 片段如下：


```opensips

listen = sip:10.0.0.177
listen = bin:10.0.0.177

loadmodule "usrloc.so"
modparam("usrloc", "working_mode_preset", "full-sharing-cachedb-cluster")
modparam("usrloc", "location_cluster", 1)

# 使用 Cassandra 时，务必事先创建 keyspace 与表：
# CREATE KEYSPACE IF NOT EXISTS opensips WITH replication = {'class': 'SimpleStrategy', 'replication_factor': '1'}  AND durable_writes = true;
# USE opensips;
# CREATE TABLE opensips.userlocation (
#     aor text,
#     aorhash int,
#     contacts map<text, frozen<map<text, text>>>,
#     PRIMARY KEY (aor));
loadmodule "cachedb_cassandra.so"
modparam("usrloc", "cachedb_url", "cassandra://10.0.0.180:9042/opensips.userlocation")

# 使用 MongoDB 时，无需创建任何数据库或集合……
loadmodule "cachedb_mongodb.so"
modparam("usrloc", "cachedb_url", "mongodb://10.0.0.180:27017/opensipsDB.userlocation")

loadmodule "clusterer.so"
modparam("clusterer", "my_node_id", 1) # node number #1
modparam("clusterer", "db_url", "mysql://opensips:opensipsrw@localhost/opensips")

loadmodule "proto_bin.so"

...

route {
    ...

    # 把注册数据存入 NoSQL DB
    if (!save("location", "path-lazy,path-received")) {
        send_reply(500, "Server Internal Error");
        exit;
    }

    ...
}

```

### 数据配置

```sql

INSERT INTO clusterer(id, cluster_id, node_id, url, state, no_ping_retries, priority, sip_addr, flags, description) VALUES \
(NULL, 1, 1, 'bin:10.0.0.177', 1, 3, 50, NULL, 'seed', NULL), \
(NULL, 1, 2, 'bin:10.0.0.178', 1, 3, 50, NULL, NULL, NULL);

```

| **id** | **cluster id** | **node_id** | **url** | **state** | **no_ping_retries** | **priority** | **sip_addr** | **flags** | **description** |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
|  14 | 1 | 1 | bin:10.0.0.177 | 1 | 3 | 50 | NULL | NULL | NULL |
|  15 | 1 | 2 | bin:10.0.0.178 | 1 | 3 | 50 | NULL | NULL | NULL |

**NoSQL “全共享”clusterer 表**

### 共享 NAT 保活 {#shared-nat-pinging}

```opensips

loadmodule "nathelper.so"
modparam("nathelper", "natping_interval", 30)
modparam("nathelper", "sipping_from", "sip:pinger@localhost")
modparam("nathelper", "sipping_bflag", "SIPPING_ENABLE")
modparam("nathelper", "remove_on_timeout_bflag", "SIPPING_RTO")
modparam("nathelper", "max_pings_lost", 5)

# 在集群节点之间分摊 ping
modparam("usrloc", "shared_pinging", 1)

```

然后在调用 [save()](/zh/modules/registrar#func_save) 之前，为部分或全部 contact 启用这些分支标志位：

```opensips

    ...

    setbflag("SIPPING_ENABLE");
    setbflag("SIPPING_RTO");

    # 把注册数据连同 Path 头域一起存入 NoSQL DB
    if (!save("location", "path-lazy,path-received")) {
        sl_reply_error();
        exit;
    }

    ...

```
