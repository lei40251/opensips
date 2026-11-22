---
title: "DB_VIRTUAL 模块"
sidebar: false
---


## 管理指南 {#admin-guide}


### 概述 {#overview}


#### 思路 {#the-idea}


虚拟 DB 对外暴露同样的前端 DB api，但由多个真实 DB 作为后端。这意味着一个虚拟 DB URL 会对应多个真实 DB URL。这一虚拟层还使我们能够以多种方式使用真实 DB，例如：并行、故障切换（热切换）和轮询。


因此：必须为每个虚拟 DB URL 指定其关联的真实 DB，以及使用（模式）这些真实 DB 的方式。


#### 模式 {#modes}


已实现的模式有：


- FAILOVER——使用第一个 URL；若失败，则取下一个 URL 并重做该操作。
- PARALLEL——使用虚拟 DB URL 集合中的所有 URL。只有当所有 URL 都失败时才失败。
- ROUND（轮询）——每次使用下一个 URL；若失败，则使用再下一个 URL，并重做操作。


在选择 db virtual 模式时，务必确保你要执行的数据库操作（插入、更新、删除等）与集合中各真实 DB URL 之间的关系（若有）完全兼容——这些 URL 可以完全独立，也可以是同一集群的节点，或任何其他组合。


#### 能力 {#capabilities}


对每个集合（或新的虚拟 DB URL），其能力（capabilities）会根据集合中各真实 DB URL 所提供的能力自动计算。对每项能力，在集合中所有 URL 上执行逻辑与。简而言之，虚拟 URL 若要提供某项能力，其所有真实 URL 都必须提供该能力。


> [!NOTE]
> 从 2.2 版本开始，db_virtual 支持 async_raw_query 与 async_raw_resume 函数，目前仅由 mysql 数据库引擎实现。


#### 故障处理 {#failures}


```c
当某个进程对真实 DB 发起的一次操作失败时：
	它被标记（全局与本地 CAN 标志置为 down）
	其连接被关闭

随后定时器进程（探测）：
遍历每个虚拟 db_url
	遍历每个真实 db_url
		若全局 CAN 为 down
			尝试连接
		若成功
			全局 CAN 置为 up
			关闭连接

再之后每个进程：
	若本地 CAN 为 down 且全局 CAN 为 up
		若 db_max_consec_retrys *
			尝试连接
	若成功
		本地 CAN 置为 up

```


> [!NOTE]
> 探测与各个进程之间可能存在不一致，因此需要设置重试上限。
> 该上限由一条 MI 命令重置并被其忽略。


#### 定时器进程 {#the-timer-process}


定时器进程（探测）是一个不时尝试重连失败 DB 的进程。它是一个独立进程，因此当它阻塞时（例如连接超时）不会造成影响。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


以下模块必须在本模块之前加载：


- *至少一个真实 DB 模块*。


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，必须安装以下库或应用程序：


- *无*。


### 导出的参数 {#exported-parameters}


#### db_urls (str)


用于声明虚拟 DB URL 的多值参数。


```opensips title="Set db_urls parameter"
...

modparam("group","db_url","virtual://set1")
modparam("presence|presence_xml", "db_url","virtual://set2")

modparam("db_virtual", "db_urls", "define set1 PARALLEL")
modparam("db_virtual", "db_urls", "mysql://opensips:opensipsrw@localhost/testa")
modparam("db_virtual", "db_urls", "postgres://opensips:opensipsrw@localhost/opensips")

modparam("db_virtual", "db_urls", "define set2 FAILOVER")
modparam("db_virtual", "db_urls", "mysql://opensips:opensipsrw@localhost/testa")
...
```


#### db_probe_time (integer)


已注册的定时器进程在该时间间隔后尝试检查（由其他进程报告的）到真实 DB 的失败连接。探测进程会连接并断开失败的真实 DB，然后通知其他进程。


*默认值为 10（10 秒）。*


```opensips title="Set db_probe_time parameter"
...
modparam("db_virtual", "db_probe_time", 20)
...
```


#### db_max_consec_retrys (integer)


在定时器进程报告其能够连接真实 DB 之后，其他进程会尝试重连该 DB。有些情况下，尽管探测能够连接，某些进程仍可能失败。该参数表示某个进程在放弃之前会执行的连续失败重试次数。该值会被 MI 函数（db_set）重置并抑制。


*默认值为 10（连续 10 次）。*


```opensips title="Set db_max_consec_retrys parameter"
...
modparam("db_virtual", "db_max_consec_retrys", 20)
...

```


### 导出的 MI 函数 {#exported-mi-functions}


#### db_get


返回真实 DB 全局状态的信息。


名称：
*db_get*


参数：


- 无。


MI FIFO 命令格式：


```bash
opensips-cli -x mi db_get
```


#### db_set


设置每个集合中每个真实 DB 的访问权限。


设置重连重置标志。


名称：
*db_set*


参数：


- set_index [int]
- db_url_index [int]
- may_use_db_flag [boolean]
- ignore_retries[boolean]\(optional\)


db_set 3 2 0 1 表示：


- 3——第四个集合（必须存在）
- 2——第四个集合中的第三个 URL（必须存在）
- 0——不允许各进程使用该 URL
- 1——重置并抑制 db_max_consec_retrys


MI FIFO 命令格式：


```bash
opensips-cli -x mi db_set 3 2 0 1
```
<!-- CONTRIBUTORS -->

### 许可 {#license}

全部文档文件（即以 .md 为扩展名的文件）均按 Creative Common License 4.0 许可发布
