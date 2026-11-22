---
title: "mi_script 模块"
description: "本模块提供多种钩子，可直接从 OpenSIPS 脚本运行管理接口命令。"
---


## 管理指南 {#admin-guide}


### 概述 {#overview}


本模块提供多种钩子，可直接从 OpenSIPS 脚本运行管理接口（Management Interface）命令。它支持运行同步命令和异步命令。取决于命令的性质（是否异步）以及从脚本运行 *mi* 命令的方式，返回的结果有所不同。


### 返回值 {#values-returned}


若执行成功，MI 命令以成功状态返回。若提供了返回变量作为参数，还会把一份 JSON 存入所给的变量中。


若 MI 命令执行失败，JSON-RPC 应答错误码会以负数的形式存入 *$rc* 变量。也可能返回诸如 *-1,-2,-3* 这样更小的值，表示内部错误。若提供了返回变量，则会在其中存入错误描述。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


以下模块必须在本模块之前加载：


- *proto_hep 模块*，若使用 MI 跟踪。


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，必须安装以下库或应用程序：


- *无*


### 导出的参数 {#exported-parameters}


#### pretty_printing (int)


指示存入返回变量中的 JSON 应答是否应做美化打印。


*默认值为 "0 - 不做美化打印"。*


```opensips title="Set pretty_printing parameter"
...
modparam("mi_script", "pretty_printing", 1)
...
```


#### trace_destination (string)


跟踪目标，与 tracing 模块中定义的一致。目前唯一的 tracing 模块是 **proto_hep**。被跟踪的 mi 消息将发往此处。


> [!WARNING]
> 必须加载一个 tracing 模块，本参数才会生效（例如
> **proto_hep**）。


*默认值为 none（未定义）。*


```opensips title="Set trace_destination parameter"
...
modparam("proto_hep", "trace_id", "[hep_dest]10.0.0.2;transport=tcp;version=3")

modparam("mi_script", "trace_destination", "hep_dest")
...
```


#### trace_bwlist (string)


基于黑名单或白名单过滤被跟踪的 mi 命令。本参数要发挥作用，必须先定义 **trace_destination**。白名单可用 'w' 或 'W' 定义，黑名单可用 'b' 或 'B' 定义。类型与实际的黑名单之间用 ':' 分隔。列表中的 mi 命令必须用 ',' 分隔。


定义黑名单意味着所有未列入黑名单的命令都会被跟踪。定义白名单意味着所有未列入白名单的命令都不会被跟踪。
> [!WARNING]
> 不能同时定义白名单和黑名单，只允许其中之一。第二次定义本参数
> 只会覆盖第一次的定义。


> [!WARNING]
> 必须加载一个 tracing 模块，本参数才会生效（例如
> **proto_hep**）。


*默认值为 none（未定义）。*


```opensips title="Set trace_destination parameter"
...
## 将 ps 和 which mi 命令列入黑名单
## 其他所有命令都将被跟踪
modparam("mi_script", "trace_bwlist", "b: ps, which")
...
## 只允许 sip_trace mi 命令
## 其他所有命令都不会被跟踪
modparam("mi_script", "trace_bwlist", "w: sip_trace")
...
```


### 导出的函数 {#exported-functions}


#### mi(command, [ret_var [,params_avp[, vals_avp]]])


以同步模式运行 MI 命令，阻塞直到有应答可用。


> [!IMPORTANT]
> 强烈建议不要将此函数用于耗时较长的任务（例如 reload），
> 因为函数会一直阻塞到命令结束。此外，若正在运行的 MI
> *command* 被配置为以异步模式运行（例如 *t_uac_dlg*），
> 该命令会以忙等待的方式阻塞，直到收到应答。


该函数可在任意路由中使用。


该函数可接收以下参数：


- *command(string)* - 要运行的 MI 命令。它可以是一个单独的 token，表示要运行的 MI 命令（不带参数），也可以后面跟若干个以空格分隔的参数（不做转义处理）。每个以空格分隔的参数都会作为带索引的参数传给 MI 命令。
*注意：* 使用本参数无法指定具名参数，你必须使用 *params_avp* 和/或 *vals_avp* 参数来指定具名命令，此时本参数只包含 MI 命令。
- *ret_var(var, optional)* - 用于存放 MI 命令执行返回结果的变量。成功时存入 JSON，否则存入错误消息。
- *params_avp(avp, optional)* - 一个 AVP，包含将发送给 MI 命令的所有参数名。若使用本参数时未提供 *vals_avp*，AVP 中的所有值都会作为带索引的参数传给 MI 命令，否则作为具名参数传入。
*注意：* 若使用本参数，则在 *command* 参数中指定的参数将被忽略。
*注意：* 参数传给命令的顺序与你填充 AVP 的顺序相同（因此与 AVP 在内存中的存储方式相比某种意义上正好相反——最先添加的 AVP 是第一个参数）
- *vals_avp(avp, optional)* - 一个 AVP，包含将发送给 MI 命令的所有参数值。本参数仅在设置了 *params_avp* 时才有意义，且其中值的数量必须与参数数量相同。
要指定 *数组值*，请把以空格分隔的数组元素括在 *__array()* 伪函数调用中。例如：*"__array(HEARTBEAT BACKGROUND_JOB)"*


```opensips title="mi without params"
...
mi("shm_check");
...
```


```opensips title="mi with params in command"
...
# 该命令与上面的命令类似
mi("cache_remove local password_user1");
...
```


```opensips title="mi with return"
...
mi("ds_list", $var(ret));
...
```


```opensips title="mi without return but with indexed params"
...
$avp(params) = "local";
$avp(params) = "password_user1";
mi("cache_remove",,$avp(params));

# 下面的命令与上面的命令类似
mi("cache_remove local password_user1");
...
```


```opensips title="mi with return and named parameters"
...
$avp(params) = "callid";
$avp(vals) = "SEARCH_FOR_THIS_CALLID";
$avp(params) = "from_tag";
$avp(vals) = "SEARCH_FOR_THIS_FROM_TAG";
mi("dlg_list", $var(dlg), $avp(params), $avp(vals));
...
```


```opensips title="mi without return, with an array parameter value"
...
$avp(params) = "freeswitch_url";
$avp(vals) = "fs://:ClueCon@192.168.20.8:8021";
$avp(params) = "events";
$avp(vals) = "__array(HEARTBEAT BACKGROUND_JOB)";
mi("fs_subscribe", , $avp(params), $avp(vals));
...
```


### 导出的异步函数 {#exported-asynchronous-functions}


#### mi(command, [ret_var [,params_avp[, vals_avp]]])


该函数的用法与其同步版本大致相同，区别在于 MI 命令以异步方式运行——进程不会阻塞等待应答，而是继续执行，MI 命令在异步上下文中运行。


> [!NOTE]
> 目前以异步方式运行的 MI 命令无法通过 hep 跟踪。


```opensips title="async mi call usage"
...
xlog("reload starting\n");
async(mi("dr_reload"), after_reload);
...

route[after_reload] {
	xlog("reload completed\n");
}
```
<!-- CONTRIBUTORS -->

### 许可证 {#license}

所有文档文件（即扩展名为 .md 的文件）均按 Creative Common License 4.0 授权
