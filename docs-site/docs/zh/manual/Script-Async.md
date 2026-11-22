---
title: "异步语句"
description: "异步语句是 OpenSIPS 的关键特性之一；使用它们的主要原因之一是，即便执行阻塞且耗时的 I/O 操作，也能让 OpenSIPS 脚本性能随每秒请求数的高增长而扩展。"
---

## 描述

以异步方式运行各种脚本函数的能力是 OpenSIPS 的一项关键性能特性。这种异步处理使 OpenSIPS 脚本性能能够随高每秒请求数扩展，即使是在执行阻塞、耗时的 I/O 操作（如 DB 查询、exec 命令或 HTTP 查询）时也是如此。

在扩展性方面，使用异步的*挂起-恢复*逻辑而不是分叉大量进程，具有优化系统资源使用的优势。在相同时间内完成相同工作量所需的进程更少，进程上下文切换被最小化，整体 CPU 使用率得到改善。更少的进程也会占用更少的系统内存。

## async() 语句

**async()** 语句可用于脚本编写者既需要执行阻塞 I/O、又依赖该操作结果的情形。一些示例场景：

* 从数据库获取 SIP 鉴权数据
* 执行 HTTP/REST 查询并依据其结果行事
* 暂停脚本执行 X 秒
* 执行外部脚本并使用其结果

并非所有脚本函数都能与 **async()** 语句组合使用 —— 每个 OpenSIPS 模块都提供一组专用于异步模式的脚本函数。请查看[模块文档](Modules.md)。

### 要求

**async()** 语句依赖于事务模块（[**TM**](/zh/modules/tm)）—— 必须加载它。启动异步操作时，如有必要，SIP 事务会被自动且透明地创建。该事务包含挂起脚本执行所需的全部信息（例如它保存更新后的 SIP 消息，以及所有 `$avp` 变量）。

### 脚本语法与用法

用法很直接：如果你的阻塞函数支持异步模式（请阅读该模块文档），那么只需把它放进下面的函数调用中：
```opensips

async(blocking_function(...), resume_route [,timeout]);

```
*注意，resume_route 必须是**[简单路由](Script-Routes.md#route)***。


由于 **async()** 语句与脚本执行是*串行*的（见下文），调用时脚本会立即暂停，因此放在 async() 调用之后的任何代码都会被忽略！当前 OpenSIPS 工作进程会启动该异步操作，随后继续处理其他待处理任务（排队的 SIP 消息、定时器任务，或者可能是其他异步操作！）。一旦所有数据就绪，就会运行 `resume_route` —— 从而以最少的空闲时间恢复脚本执行。

以异步模式执行的函数的返回码，可在 `resume_route` 的一开始通过 `$rc` 或 `$retcode` 变量获取。此外，所有输出参数（函数参数中用于携带输出值的变量）在 `resume_route` 中也都可用。

可选的 'timeout' 参数用于控制脚本应等待阻塞函数完成多长时间（与该函数自身的实现无关）。如果在给定超时之前阻塞 I/O 未完成，异步层将强制该函数以其 I/O 超时结束，并恢复脚本。


```opensips

route
{
    /* 准备代码 */
    ...
    async( sql_query("SELECT credit FROM users WHERE uid='$avp(uid)'", "$avp(credit)"), resume_credit);
    /* 脚本执行立即暂停！ */
}

route [resume_credit]
{
    if ($rc < 0) {
        xlog("error $rc in avp_db_query()\n");
        exit;
    }

    xlog("Credit of user $avp(uid) is $avp(credit)\n");
    ...
    t_relay();
}

```


> [!IMPORTANT]
> **async()** 执行之后并非所有变量都会保留。只有以下内容会被继承到 `resume_route` 中：
>
> * **所有 `$avp` 变量**
> * **当前 SIP 消息中的所有修改**


## launch() 语句

**launch()** 语句可用于脚本编写者需要执行阻塞 I/O，但并不依赖该操作的结果来继续当前 SIP 路由决策流程的情形。一些示例场景：

* 触发外部推送通知
* 将数据写入自定义数据库（例如呼叫统计、话单等）
* 就某个事件的发生通知 HTTP 服务（例如 SIP 流量模式、欺诈检测等）

基本上，**launch()** 语句相当于*并行异步操作* —— I/O 操作只是从脚本中发起，其执行可能在完全不同的 OpenSIPS 进程/工作进程中并行进行。

**launch()** 语句没有额外的模块依赖，由 OpenSIPS 核心提供。

### 脚本语法与用法

与 **async()** 语句类似，如果你的阻塞函数支持异步模式（请阅读[模块文档](Modules.md)），那么只需把它放进下面的函数调用中：
```opensips

launch(blocking_function(...));
or
launch(blocking_function(...), report_route);
route[report_route] {}
or
launch(blocking_function(...), report_route, "Something with $var(xx) to be passed to report route");
route[report_route] {
   xlog("received as input the <$param(1)> string\n");
}

```
*注意，report_route 必须是**[简单路由](Script-Routes.md#route)***。


**launch()** 语句与其后的脚本执行既是异步的也是并行的（见下文）。注意 `report_route` 可以省略，因为脚本执行并不依赖它。该路由可能在以下任一时刻被触发：

* 恰好在 **launch()** 调用之后的下一行代码之前
* 当前 SIP 消息的路由过程中
* 当前 SIP 消息的路由完成之后


以异步模式执行的函数的返回码，可在 `report_route` 的一开始通过 `$rc` 或 `$retcode` 变量获取。此外，只有输出参数（函数参数中用于携带输出值的变量）会在该路由内部可用。


```opensips

route
{
    /* 准备代码 */
    ...

    # 异步、并行地发送推送通知
    launch(exec("/usr/local/bin/send-google-pn.py"), pn_counter);
    t_relay();
}

route [pn_counter]
{
    if ($rc < 0) {
        xlog("error $rc in pn script!\n");
        update_stat("pn-failure", "1");
        exit;
    }

    update_stat("pn-success", "1");
}

```

> [!IMPORTANT]
> **launch()** 执行之后，在 `report_route` 中唯一可用的数据是：
>
> * 异步函数设置的输出变量
> * 传给 **launch()** 语句的文本参数


## 限制

### 异步引擎兼容性

异步引擎严重依赖于底层库提供的非阻塞 I/O 特性 —— 阻塞 I/O 操作（例如 HTTP 或 SQL 查询）只有在库同时提供以下两项时才能变为异步：

* 与原本阻塞函数等价的非阻塞版本
* 在非阻塞等价函数启动之后，库还必须提供一种机制，用于提取与刚启动的数据传输操作相对应的有效 Linux 文件描述符。OpenSIPS 异步引擎会对该 fd 进行轮询，并在每次有新数据可用时触发内部状态更新。当阻塞操作完成时，会调用 `resume_route`，异步操作就此完成。


### TCP 连接问题

尽管某些库提供了异步功能，但它们只对 I/O 操作的“传输”部分这样做，而不包括最初的 TCP 连接。因此，在某些边界场景下（例如 TCP 连接因服务器无响应而挂起、中间的防火墙丢弃数据包而不是拒绝它们等），异步操作实际上可能会阻塞！


受此限制影响的模块示例：

* rest_client —— 尽管它在后续请求中复用 TCP 连接，但 libcurl 会阻塞，直到从某个 OpenSIPS 工作进程建立起 TCP 连接。一旦这些 TCP 连接挂起，相应的 OpenSIPS 工作进程也会挂起。

* db_mysql —— 与 rest_client 类似：尽管它会大量复用 DB 连接，但建立每个连接都是阻塞操作，由于该库的特性而无法异步化。

**缓解措施**：取决于你的具体环境，你可能会受到这些阻塞 TCP 连接严重影响，也可能几乎不受影响。对于前者，我们建议分叉出负责阻塞操作的外部进程，并以异步方式调用它们，使用类似下面的写法：

```opensips
 async(exec("curl my_host", $var(response_body)), resume_route); 
```

或

```opensips
 async(exec("mysql-query 'SELECT * FROM subscriber...'", $var(result_row)), resume_route); 
```

### 允许的路由

由于 **async** 操作与事务引擎紧密耦合，它们只能在存在 SIP 事务且该事务正在等待完成的路由中执行：

* request_route
* onreply_route

另一方面，**launch** 语句应当可以在**任何路由**中工作，因为它不依赖底层的 SIP 事务。
