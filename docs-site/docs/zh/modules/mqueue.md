---
title: "mqueue 模块"
description: "mqueue 模块提供了一套通用的共享内存消息队列系统，通过配置文件实现进程间通信。"
---

## 管理员指南 {#admin-guide}


### 概述 {#overview}


mqueue 模块提供了一套通用的共享内存消息队列系统，通过配置文件实现进程间通信。一种典型用法是把耗时的操作交给一个或多个定时器进程，由它们消费队列中的条目，从而不影响套接字监听进程中的 SIP 消息处理。


可以定义多个队列。对队列中取值的访问通过伪变量完成。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


在加载本模块之前，必须先加载以下模块：


- *无*。


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，必须先安装以下库或应用程序：


- *无*。


### 导出的参数 {#exported-parameters}


#### db_url (str)


用于连接数据库的 URL，在启动时从 mqueue 表加载取值，和/或在关闭时保存取值。


*默认值为 NULL（不连接）。*


```opensips title="设置 db_url 参数"
...
modparam("mqueue", "db_url", "mysql://opensips:opensipsrw@localhost/opensips")

# SQLite 中的表示例，
# 需要设置字段以支持相应的长度，
# 长度应与 mqueue 中将存放的数据相匹配
CREATE TABLE mqueue_name (
id INTEGER PRIMARY KEY AUTOINCREMENT,
key character varying(64) DEFAULT "" NOT NULL,
val character varying(4096) DEFAULT "" NOT NULL
);
...
```


#### mqueue (string)


内存队列的定义。


*默认值为 "none"。*


值必须是一组参数：attr=value;...


- 必填属性：

  - *name*：队列的名称。
- 可选属性：

  - *size*：队列的长度。
指定队列中条目的最大数量。
若超出该数量，则移除最旧的一个。
若未设置，队列长度不受限制。
  - *dbmode*：若设为 1，队列内容
在 SIP 服务器停止时写入数据库表（即确保重启后数据持久化）。
若设为 2，则在关闭时写入，但启动时不读取。
若设为 3，则在启动时读取，但关闭时不写入。
默认值为 0（不与数据库表交互）。
  - *addmode*：如何添加新的（key,value）对。
    - *0*：
    将所有新的（key,value）对压入
    队列末尾。（默认）
    - *1*：
    依据 key，在队列中保留最旧的
    （key,value）对。
    - *2*：
    依据 key，在队列中保留最新的
    （key,value）对。


该参数可以设置多次，每次设置一个队列的定义。


```opensips title="设置 mqueue 参数"
...
modparam("mqueue", "mqueue", "name=myq;size=20;")
modparam("mqueue", "mqueue", "name=myq;size=10000;addmode=2")
modparam("mqueue", "mqueue", "name=qaz")
modparam("mqueue", "mqueue", "name=qaz;addmode=1")
...
```


### 导出的函数 {#exported-functions}


#### mq_add(queue, key, value)


向队列中添加一个新的条目（key, value）。若超出队列的最大长度，则移除最旧的条目。


```opensips title="mq_add 用法"
...
mq_add("myq", "$rU", "call from $fU");
...
```


#### mq_fetch(queue)


从队列中取出最旧的条目，并填充 $mqk(queue) 与 $mqv(queue) 伪变量。


返回值：成功时为 true（1）；失败时为 false（-1），未取到任何条目时为 -2。


```opensips title="mq_fetch 用法"
...
while(mq_fetch("myq"))
{
	xlog("$mqk(myq) - $mqv(myq)\n");
}
...
```


#### mq_pv_free(queue)


释放伪变量中已取出的条目。该函数是可选的，新的取值操作会自动释放先前取到的值。


```opensips title="mq_pv_free 用法"
...
mq_pv_free("myq");
...
```


#### mq_size(queue)


返回 mqueue 中当前的元素个数。


若该队列为空，函数返回 -1；若未找到该队列，函数返回 -2。


```opensips title="mq_size 用法"
...
$var(q_size) = mq_size("queue");
xlog("L_INFO", "Size of queue is: $var(q_size)\n");
...
```


### 导出的 MI 函数 {#exported-mi-functions}


#### mq_get_size


获取内存队列的长度。


参数：


- name


```bash title="mq_get_size 用法"
...
opensips-cli -x mq_get_size xyz
...
```


#### mq_fetch


从内存队列中取出一个（或至多 limit 个）键值对。


参数：


- name
- limit
limit


```bash title="mq_fetch 用法"
...
opensips-cli -x mq_fetch xyz
...
```


#### mq_get_sizes


获取所有内存队列的长度。


参数：无


```bash title="mq_get_sizes 用法"
...
opensips-cli -x mq_get_sizes
...
```


### 导出的伪变量 {#exported-pseudo-variables}


#### $mqk(mqueue)


该变量为只读，返回从指定 mqueue 中最近取出的条目 key。


#### $mqv(mqueue)


该变量为只读，返回从指定 mqueue 中最近取出的条目 value。


#### $mq_size(mqueue)


该变量为只读，返回指定 mqueue 的长度。
<!-- CONTRIBUTORS -->

### 许可 {#license}

本项目的所有文档文件（即 .md 扩展名的文件）均以 Creative Common License 4.0 授权。
