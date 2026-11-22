---
title: "exec 模块"
description: "Exec 模块支持从 OpenSIPS 脚本中执行外部命令。"
---


## 管理指南 {#admin-guide}


### 概述 {#overview}


Exec 模块支持从 OpenSIPS 脚本中执行外部命令。任何合法的 shell 命令都可接受。
最终的输入字符串会使用 "/bin/sh" 符号链接/二进制程序进行求值并执行。
OpenSIPS 还可以通过环境变量额外传递关于请求的大量信息：


- SIP_HF_&lt;hf_name&gt; 包含请求中每个头域的值。若某个头域出现多次，
其值会被拼接并以逗号分隔。&lt;hf_name&gt; 为大写字母形式。
若某个头域以紧凑形式出现，&lt;hf_name&gt; 使用规范形式。
- SIP_TID 是事务标识符。所有与先前 INVITE 关联的请求重传或
CANCEL/ACK 都会得到相同的值。
- SIP_DID 是对话标识符，与 to-tag 相同。
初始时为空。
- SIP_SRCIP 是请求来源的源 IP 地址。
- SIP_ORURI 是原始请求 URI。
- SIP_RURI 是*当前*请求 URI（若未被修改，则等于原始值）。
- SIP_USER 是*当前*请求 URI 的用户部分。
- SIP_OUSER 是原始请求 URI 的用户部分。


> [!NOTE]
> 传递给 exec 模块函数的任何环境变量都必须使用 '$$' 分隔符指定
> （例如 $$SIP_OUSER），否则它们会被当作 OpenSIPS 伪变量求值，
> 从而引发脚本错误。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


必须在本模块之前加载以下模块：


- *不依赖其他 OpenSIPS 模块*。


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，必须安装以下库或应用程序：


- *无*。


### 导出的参数 {#exported-parameters}


#### setvars (integer)


设为 1 可为所有执行的命令启用上述环境变量的设置。


> [!WARNING]
> 在启用该参数之前，请确保你的 "/bin/sh" 不受
> Shellshock bash 漏洞影响！


*默认值为 0（禁用）。*


```opensips title="Set 'setvars' parameter"
...
modparam("exec", "setvars", 1)
...
```


#### time_to_kill (integer) {#time_to_kill-integer}


若设置，该参数指定程序允许执行的最长时间（秒）。一旦超过该时长，
程序会被终止（SIGTERM）。


> [!NOTE]
> 受内部实现限制，一旦 "time_to_kill"
> 过期超时触发，SIGTERM 实际上会被发送给**所有**
> 作业 pid。在标准系统上这不应产生副作用，
> 因为 pid 是以缓慢的方式单调递增的，
> 且 OpenSIPS 应以 "opensips" 用户运行，从而无法
> 终止非子进程。若你的系统并非如此，
> 请不要使用 OpenSIPS 的 "time_to_kill" 特性，
> 而应在你的外部应用中实现它！


*默认值为 0（禁用）。*


```opensips title="Set 'time_to_kill' parameter"
...
modparam("exec", "time_to_kill", 20)
...
```


### 导出的函数 {#exported-functions}


#### exec(command, [stdin], [stdout], [stderr], [envavp]) {#execcommand-stdin-stdout-stderr-envavp}


执行外部命令。若指定了输入，则输入会传递给新进程的标准输入，
而输出会保存在输出变量中。


该函数会等待外部脚本直到它提供完其全部输出（不要求脚本实际结束）。
若该函数不需要任何输出（标准输出或标准错误），则它完全不会阻塞
——它只是启动外部脚本并继续执行脚本。


各参数含义如下：


- *command (string)* - 要执行的命令
- *stdin (string, optional)* - 要传递给命令标准输入的字符串
- *stdout (var, optional)* - 可选的
输出变量，用于保存进程的标准输出
- *stderr (var, optional)* - 可选的
输出变量，用于保存进程的标准错误
- *envavp (var, optional)* - 可选 AVP，
保存要传递给命令的环境变量的值。
环境变量的名称将是 "OSIPS_EXEC_#"，其中 "#" 从 0 开始。例如，若我们
向一个行为类似栈的 AVP 变量压入两个值（如 "b" 和 "a"），
则 OSIPS_EXEC_0 保存 "a"，而 OSIPS_EXEC_1 保存 "b"。


> [!NOTE]
> 若期望多行格式的输出，应为 "stdout" 和 "stderr" 参数使用 $avp
> 变量，以避免只接收到各个流的最后几行。


> [!WARNING]
> 任何可能包含特殊 bourne shell（sh/bash）字符的 OpenSIPS 伪变量
> 都应放在引号内，例如
> exec("update-stats.sh '$(ct{re.subst,/'//g})'");


> [!WARNING]
> "stdin"/"stdout"/"stderr" 参数并非为大量数据而设计，
> 因此使用时应小心。受基本实现限制，
> 管道被写满可能导致读取死锁。


该函数可用于 REQUEST_ROUTE、FAILURE_ROUTE、
LOCAL_ROUTE、STARTUP_ROUTE、TIMER_ROUTE、EVENT_ROUTE、ONREPLY_ROUTE。


```opensips title="exec usage"
...
$avp(env) = "a";
$avp(env) = "b";
exec("ls -l", , $var(out), $var(err), $avp(env));
xlog("The output is $var(out)\n");
xlog("Received the following error\n$var(err)");
...
$var(input) = "input";
exec("/home/../myscript.sh", "this is my $var(input) for exec\n", , , $avp(env));
...
```


### 导出的异步函数 {#exported-asynchronous-functions}


#### exec(command, [stdin], [stdout], [stderr], [envavp])


执行外部命令。该函数与
[exec()](#execcommand-stdin-stdout-stderr-envavp) 完全相同（就输入、输出和处理而言），
但以异步方式执行。脚本执行会挂起，直到
外部脚本提供完其全部输出。OpenSIPS 等待
外部脚本关闭其输出流，而不必等待其终止
（因此当 OpenSIPS 在输出流上"看到" EOF 并恢复脚本执行时，
该脚本可能仍在运行）


> [!NOTE]
> 该函数目前忽略 "stderr" 参数 ——
> 异步等待仅在输出流上进行！！这可能
> 在后续版本中修复。


要阅读并了解更多关于异步函数、如何使用它们以及它们有何优势的内容，
请参阅 OpenSIPS 在线手册。


```opensips title="async exec usage"
{
...
async(exec("ruri-changer.sh", $ru, $ru), resume);
}

route [resume] {
...
}
```


### 已知问题 {#known-issues}


使用 **[time_to_kill](#time_to_kill-integer)** 施加执行超时时，
请确保你的 "/bin/sh" 是一个执行时不会 fork 的 shell，
否则作业本身不会被杀死，而是其父 shell 被杀，
同时该作业会被 "init" 静默继承并继续运行。
"/bin/dash" 就是这类麻烦的 shell 环境之一。
<!-- CONTRIBUTORS -->

### 许可 {#license}

所有文档文件（即 .md 扩展名的文件）均以 Creative Common License 4.0 授权。
