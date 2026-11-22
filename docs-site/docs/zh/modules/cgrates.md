---
title: "cgrates 模块"
description: "[CGRateS](http://www.cgrates.org/) 是一款开源计费引擎，用于运营商级、多租户的实时计费。本模块用于与 CGRateS 引擎通信，以实现呼叫鉴权与计费。"
sidebar: false
---


## 管理指南 {#admin-guide}


### 概述 {#overview}


[*CGRateS*](http://www.cgrates.org/)
是一款开源计费引擎，用于运营商级、多租户的实时计费。它能够为
具有不同余额单位（例如：货币、SMS、互联网流量）的多个并发会话执行
后付费与预付费计费。CGRateS 还能以多种格式导出精确的 CDR。


本模块用于与 CGRateS 引擎通信，以实现呼叫鉴权与计费。OpenSIPS 模块
本身不执行任何计费，而是提供一个接口，通过高效的
[JSON-RPC](http://json-rpc.org/) API 以同步和异步方式
与 CGRateS 引擎通信。对于每条命令，用户可以借助
*$cgr()* 变量提供一组参数，这些参数会被转发给 CGRateS 引擎。
你可以在后续章节中找到用法示例。


本模块还支持与 CGRateS 建立多个并行的计费会话。
这在涉及复杂计费逻辑的场景中很有用，例如双重计费（同时对客户和运营商
计费），或多腿呼叫（串行/并行分叉）。每个计费会话相互独立，
并具有特定的 *tag*，可在整个呼叫生命周期内使用。


本模块可用于实现以下功能：


### 鉴权 {#authorization}


鉴权用于检查账户是否被允许发起新呼叫，以及其是否有足够余额呼叫该目的
号码。这通过 *cgrates_auth()* 命令完成，该命令会在
*$cgr_ret* 伪变量中返回允许该呼叫持续的秒数。


用法示例：


```opensips
...
if (cgrates_auth("$fU", "$rU"))
	xlog("Call is allowed to run $cgr_ret seconds\n");
}
...
```


### 计费 {#accounting}


计费模式用于启动和停止 CGRateS 会话。它既可用于预付费计费，
也可用于后付费计费。*cgrates_acc()*
函数在呼叫被应答时（收到 200 OK 消息）启动 CGRateS 会话，并在呼叫
结束时（收到 BYE 消息）结束该会话。这是借助 *dialog* 模块
自动完成的。


注意，在开始计费之前先对呼叫进行鉴权（使用
*cgrates_auth()* 命令）很重要。如果未这样做且用户无权呼叫，
对话将被立即关闭，从而产生时长为 0 的呼叫。如果允许呼叫继续，
对话的生命周期将被设置为 CGRateS 引擎指示的时长。
因此，如果呼叫持续时间更长，对话将被自动结束。


呼叫结束（通过 BYE 消息）后，CGRateS 会话也随之结束。
此时可以生成 CDR。为此，需要为
*cgrates_acc()* 命令设置 *cdr* 标志位。
使用 *missed* 标志位还可以为未接呼叫生成 CDR。


用法示例：


```opensips
...
if (!cgrates_auth("$fU", "$rU")) {
	sl_send_reply(403, "Forbidden");
	exit;
}
xlog("Call is allowed to run $cgr_ret seconds\n");
# 对该呼叫执行计费
cgrates_acc("cdr", "$fU", "$rU");
...
```


注意，使用 *cdr* 标志位时，CDR 由 CGRateS 引擎以多种格式
导出，而非由 OpenSIPS 导出。更多信息请查阅 CGRateS 文档。


### 其他命令 {#other-commands}


你可以使用 *cgrates_cmd()* 向 CGRateS 引擎发送任意
命令，并使用 *$cgr_ret* 伪变量获取响应。


以下示例模拟 *cgrates_auth()* 的 CGRateS 调用：


```opensips
...
$cgr_opt(Tenant) = $fd; # or $cgr(Tenant) = $fd; /* in compat mode */
$cgr(Account) = $fU;
$cgr(OriginID) = $ci;
$cgr(SetupTime) = "" + $Ts;
$cgr(RequestType) = "*prepaid";
$cgr(Destination) = $rU;
cgrates_cmd("SessionSv1.AuthorizeEvent");
xlog("Call is allowed to run $cgr_ret(MaxUsage) seconds\n");
...

```


### CGRateS 故障切换 {#cgrates-failover}


可以配置多个 CGRateS 引擎以故障切换方式使用：当一个引擎不可用时，
使用下一个。目前服务器之间没有负载均衡逻辑，但这是 CGRateS 的某个
组件在较新版本中提供的功能。


每个 CGRateS 引擎最多分配
*max_async_connections* 个连接，另有一个用于同步命令。
如果某个连接失败（由于网络问题或服务器问题），它会被标记为关闭
并尝试建立新连接。如果到该引擎的所有连接都中断，则整个
引擎被标记为禁用，并查询新的引擎。引擎中断超过
*retry_timeout* 秒后，OpenSIPS 会再次尝试连接该服务器。
如果成功，该服务器被启用。否则继续使用其他引擎，
直到没有可用引擎、命令失败为止。


### CGRateS 兼容性 {#cgrates-compatibility}


本模块支持两种不同的 CGRateS 版本：
*compat_mode* 版本，适用于 pre-rc8 发行版；以及
新版本，适用于 post-rc8 发行版。两个版本的区别
在于构造发往 CGRateS 的请求以及来自 CGRateS 的响应的方式。在非
*compat_mode* 的新版本中，提供了新变量
*$cgr_opt()*，可用于调整请求选项。为避免
歧义，不应在 *compat_mode* 模式下使用该变量，但如果使用，
其行为与 *$cgr()* 完全一致。默认情况下
*compat_mode* 处于禁用状态。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


在本模块之前必须加载以下模块：


- *dialog* —— 在使用 CGRateS 计费时。


#### 外部库或应用 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，必须安装以下库或应用：


- *libjson*


### 导出的参数 {#exported-parameters}


#### cgrates_engine (string)


该参数用于指定一个 CGRateS 引擎连接。
格式为 *IP[:port]*。端口是可选的，
如果缺省则使用 *2014*。


该参数可以有多个值，分别对应每个用于故障切换的服务器。
至少应配置一个服务器。


*默认值为 "None"。*


```opensips title="Set cgrates_engine parameter"
...
modparam("cgrates", "cgrates_engine", "127.0.0.1")
modparam("cgrates", "cgrates_engine", "127.0.0.1:2013")
...
```


#### bind_ip (string)


用于绑定与 CGRateS 引擎通信的套接字的 IP。
当引擎运行在本地安全 LAN 中，且希望使用
该网络与服务器通信时，设置该项很有用。
该参数是可选的。


*默认值为 "not set - any IP is used"。*


```opensips title="Set bind_ip parameter"
...
modparam("cgrates", "bind_ip", "10.0.0.100")
...
```


#### max_async_connections (integer)


到单个 CGRateS 引擎的最大同时异步连接数。


*默认值为 "10"。*


```opensips title="Set max_async_connections parameter"
...
modparam("cgrates", "max_async_connections", 20)
...
```


#### retry_timeout (integer)


在多少秒之后重试已禁用的连接/引擎。


*默认值为 "60"。*


```opensips title="Set retry_timeout parameter"
...
modparam("cgrates", "retry_timeout", 120)
...
```


#### compat_mode (integer)


指示 OpenSIPS 是否应使用旧的（compat_mode）
CGRateS 版本 API（pre-rc8）。


*默认值为 "false (0)"。*


```opensips title="Set compat_mode parameter"
...
modparam("cgrates", "compat_mode", 1)
...
```


### 导出的函数 {#exported-functions}


#### cgrates_acc([flags[, account[, destination[, session]]]])


`cgrates_acc()` 为当前对话在 CGRateS 引擎上启动一个计费
会话。当对话结束时，它也会结束该会话。该函数需要对话，因此
如果此前未使用 create_dialog()，它会在内部调用
该函数。


注意，`cgrates_acc()` 函数在被调用时
不会向 CGRateS 引擎发送任何消息，只有在呼叫被应答且应启动
CGRateS 会话时（收到 200 OK 消息）才会发送。


在 *REQUEST_ROUTE* 或
*FAILURE_ROUTE* 中调用时，会为所有已创建的分支执行
该会话的计费。在 *BRANCH_ROUTE*
或 *ONREPLY_ROUTE* 中调用时，仅当该分支成功
（以 2xx 应答码结束）时才执行计费。


`cgrates_acc()` 函数应
仅在初始 INVITE 上调用。更多信息请参阅
[计费](#accounting)。


各参数含义如下：


- *flags*（字符串，可选）- 指示 OpenSIPS
是否应在呼叫结束时生成 CDR。如果缺少该参数，
则不生成 CDR —— 会话仅经过 CGRateS。
可以使用以下值，以 '|' 分隔：

  - *cdr* - 同时生成 CDR；
  - *missed* - 即使对未接
呼叫也生成 CDR；该标志位仅在使用了 *cdr*
标志位时才有意义；
- *account*（字符串，可选）- 在 CGRateS 中将被计费
的账户。如果未指定，则使用 From 头域中的用户。
- *destination*（字符串，可选）- 被叫号码。
如果未提供，则使用请求 URI 中的用户。
- *session*（字符串，可选）- 若分支/呼叫成功完成
则要启动的会话的 tag。该参数
指示应考虑 *$cgr()* 变量中的哪一组
数据。如果缺省，则使用默认组。


该函数可返回以下值：


- *1* - 调用成功 - 已为该呼叫成功建立 CGRateS
计费。
- *-1* - OpenSIPS 返回内部错误
（例如无法创建对话，或服务器内存不足）。
- *-2* - SIP 消息无效：要么
缺少头域，要么不是初始 INVITE。


该函数可在 REQUEST_ROUTE、FAILURE_ROUTE、
BRANCH_ROUTE 和 LOCAL_ROUTE 中使用。


```opensips title="cgrates_acc() usage"
...
if (!has_totag()) {
	...
	if (cgrates_auth($fU, $rU))
		cgrates_acc("cdr|missed", $fU, $rU);
	...
}
...

```


#### cgrates_auth([account[, destination[, session]]])


`cgrates_auth()` 通过 CGRateS 引擎
执行呼叫鉴权。


各参数含义如下：


- *account*（字符串，可选）- 将在 CGRateS 中检查
的账户。如果未指定，则使用 From 头域中的用户。
- *destination*（字符串，可选）- 被叫号码。
如果未提供，则使用请求 URI 中的用户。
- *session*（字符串，可选）- 若分支/呼叫成功完成
则要启动的会话的 tag。该参数
指示应考虑 *$cgr()* 变量中的哪一组
数据。如果缺省，则使用默认组。


该函数可返回以下值：


- *1* - 调用成功 - 该 CGRateS 账户
被允许发起呼叫。
- *-1* - OpenSIPS 返回内部错误
（例如服务器内存不足）。
- *-2* - CGRateS 引擎返回错误。
- *-3* - 未找到合适的 CGRateS 服务器。
消息类型（不是初始 INVITE）。
- *-4* - SIP 消息无效：要么
缺少头域，要么不是初始 INVITE。
- *-5* - CGRateS 返回了无效消息。


该函数可在 REQUEST_ROUTE、FAILURE_ROUTE、
BRANCH_ROUTE 和 LOCAL_ROUTE 中使用。


```opensips title="cgrates_auth() usage"
...
if (!has_totag()) {
	...
	if (!cgrates_auth($fU, $rU)) {
		sl_send_reply(403, "Forbidden");
		exit;
	}
	...
}
...

```


```opensips title="cgrates_auth() usage with attributes parsing"
...
if (!has_totag()) {
	...
	$cgr_opt(GetAttributes) = 1;
	if (!cgrates_auth($fU, $rU)) {
		sl_send_reply(403, "Forbidden");
		exit;
	}
	# 将属性从 AttributesDigest 变量移动到普通 AVP
	$var(idx) = 0;
	while ($(cgr_ret(AttributesDigest){s.select,$var(idx),,}) != NULL) {
		$avp($(cgr_ret(AttributesDigest){s.select,$var(idx),,}{s.select,0,:}))
			= $(cgr_ret(AttributesDigest){s.select,$var(idx),,}{s.select,1,:});
		$var(idx) = $var(idx) + 1;
	}
	...
}
...

```


#### cgrates_cmd(command[, session])


`cgrates_cmd()` 可以
向 CGRateS 引擎发送任意命令。


各参数含义如下：


- *command*（字符串）- 发送给
CGRateS 引擎的命令。
- *session*（字符串，可选）- 若分支/呼叫成功完成
则要启动的会话的 tag。该参数
指示应考虑 *$cgr()* 变量中的哪一组
数据。如果缺省，则使用默认组。


该函数可返回以下值：


- *1* - 调用成功 - 该 CGRateS 账户
被允许发起呼叫。
- *-1* - OpenSIPS 返回内部错误
（例如服务器内存不足）。
- *-2* - CGRateS 引擎返回错误。
- *-3* - 未找到合适的 CGRateS 服务器。
消息类型（不是初始 INVITE）。


该函数可在任意路由中使用。


```opensips title="cgrates_cmd() usage"
...
# cgrates_auth($fU, $rU); 模拟
$cgr_opt(Tenant) = $fd;
$cgr(Account) = $fU;
$cgr(OriginID) = $ci;
$cgr(SetupTime) = "" + $Ts;
$cgr(RequestType) = "*prepaid";
$cgr(Destination) = $rU;
cgrates_cmd("SessionSv1.AuthorizeEvent");
xlog("Call is allowed to run $cgr_ret seconds\n");
...

```


### 导出的伪变量 {#exported-pseudo-variables}


#### $cgr(name) / $(cgr(name)[session])


用于为 CGRateS 命令设置不同参数的伪变量。
每个名称-值对都会在发往 CGRateS 的
JSON 消息中编码为 *string - value* 属性。


名称-值对存储在事务中（如果
加载了 tm 模块）。因此这些值在应答中
可访问。


调用 *cgrates_acc()* 函数时，
所有名称-值对都会移入对话。
因此这些值在对话的整个生命周期内都可访问。


该变量由若干组名称-值对组成。
每一组对应一个会话。该变量可以通过
*session tag* 索引。各组
之间完全独立。如果
*session tag* 不存在，则使用默认
（无名）的那一组。


使用 *:=* 运算符赋值时，
该值会被当作 JSON，而不是字符串/整型。
不过 JSON 的求值是延迟的，因此在
构造 CGRateS 请求时，如果模块无法解析
该 JSON，则将该值作为字符串发送。


```opensips title="$cgr(name) simple usage"
...
if (!has_totag()) {
	...
	$cgr_opt(Tenant) = $fd; # 将 From 域设置为 tenant
	$cgr(RequestType) = "*prepaid"; # 执行预付费计费
	$cgr(AttributeIDs) := '["+5551234"]'; # 按数组处理
	if (!cgrates_auth("$fU", "$rU")) {
		sl_send_reply(403, "Forbidden");
		exit;
	}
}
...

```


```opensips title="$cgr(name) multiple sessions usage"
...
if (!has_totag()) {
	...
	# 第一个会话 - 对用户鉴权
	$cgr_opt(Tenant) = $fd; # 将 From 域设置为 tenant
	$cgr(RequestType) = "*prepaid"; # 执行预付费计费
	if (!cgrates_auth("$fU", "$rU")) {
		sl_send_reply(403, "Forbidden");
		exit;
	}

	# 第二个会话 - 对运营商鉴权
	$(cgr_opt(Tenant)[carrier]) = $td;
	$(cgr(RequestType)[carrier]) = "*postpaid";
	if (!cgrates_auth("$tU", "$fU", "carrier")) {
		# 使用其他运营商
		return;
	}

	# 如果一切成功，对两者都启动计费
	cgrates_acc("cdr", "$fU", "rU");
	cgrates_acc("cdr", "$tU", "$fU", "carrier");
}
...

```


#### $cgr_opt(name) / $(cgr_opt(name)[session])


在非 *compat_mode* 下使用时，用于调整
CGRateS 请求的请求参数。


*注意：* 对于所有请求选项，整型值的作用等同于
布尔值：*0* 禁用该功能，
*1*（或 0 以外的值）启用该功能。字符串
变量按设置的原样传递。


撰写本文档时可用的值：


- *Tenant* - 调整 CGRateS 的 Tenant。
- *GetAttributes* - 从 CGRateS 数据库请求账户
属性。
- *GetMaxUsage* - 请求该呼叫允许持续的
最长时间。
- *GetSuppliers* - 请求一个数组，包含
所有能够终结该呼叫的供应商。


```opensips title="$cgr_opt(name) usage"
...
$cgr_opt(Tenant) = "cgrates.org";
$cgr_opt(GetMaxUsage) = 1; # 同时获取最大可用时长
if (!cgrates_auth("$fU", "$rU")) {
	# 呼叫被拒绝
}
...

```


#### $cgr_ret(name)


返回 CGRateS 命令在脚本中的应答消息，
或在非 compat 模式下使用时，返回应答中的
某个对象。


```opensips title="$cgr_ret(name) usage"
...
cgrates_auth("$fU", "$rU");

# 在 compat 模式下
xlog("Call is allowed to run $cgr_ret seconds\n");

# 在非 compat 模式下
xlog("Call is allowed to run $cgr_ret(MaxUsage) seconds\n");
...

```


### 导出的异步函数 {#exported-asynchronous-functions}


#### cgrates_auth([account[, destination[, session]]])


以异步方式执行 CGRateS 鉴权调用。脚本
执行会被挂起，直到 CGRateS 引擎返回应答。


各参数含义如下：


- *account* - 将在 CGRateS 中检查
的账户。该参数是可选的，如果未指定，
则使用 From 头域中的用户。
- *destination* - 被叫号码。可选
参数，如果未提供则使用请求 URI 中的用户。
- *session* - 若分支/呼叫成功完成
则要启动的会话的 tag。该参数
指示应考虑 *$cgr()* 变量中的哪一组
数据。如果缺省，则使用默认组。


该函数可返回以下值：


- *1* - 调用成功 - 该 CGRateS 账户
被允许发起呼叫。
- *-1* - OpenSIPS 返回内部错误
（例如服务器内存不足）。
- *-2* - CGRateS 引擎返回错误。
- *-3* - 未找到合适的 CGRateS 服务器。
消息类型（不是初始 INVITE）。
- *-4* - SIP 消息无效：要么
缺少头域，要么不是初始 INVITE。
- *-5* - CGRateS 返回了无效消息。


```opensips title="async cgrates_auth usage"
route {
	...
	async(cgrates_auth("$fU", "$rU"), auth_reply);
}

route [auth_reply]
{
	if ($rc < 0) {
		xlog("Call not authorized: code=$cgr_ret!\n");
		send_reply(403, "Forbidden");
		exit;
	}
	...
}
```


#### cgrates_cmd(command[, session])


可以异步方式运行任意 CGRateS 命令。
执行会被挂起，直到 CGRateS 引擎返回应答。


各参数含义如下：


- *command* - 发送给
CGRateS 引擎的命令。该参数为必填。
- *session* - 若分支/呼叫成功完成
则要启动的会话的 tag。该参数
指示应考虑 *$cgr()* 变量中的哪一组
数据。如果缺省，则使用默认组。


该函数可返回以下值：


- *1* - 调用成功 - 该 CGRateS 账户
被允许发起呼叫。
- *-1* - OpenSIPS 返回内部错误
（例如服务器内存不足）。
- *-2* - CGRateS 引擎返回错误。
- *-3* - 未找到合适的 CGRateS 服务器。
消息类型（不是初始 INVITE）。


```opensips title="async cgrates_cmd compat_mode usage"
route {
	...
	$cgr(Tenant) = $fd;
	$cgr(Account) = $fU;
	$cgr(OriginID) = $ci;
	$cgr(SetupTime) = "" + $Ts;
	$cgr(RequestType) = "*prepaid";
	$cgr(Destination) = $rU;
	async(cgrates_cmd("SMGenericV1.GetMaxUsage"), auth_reply);
}

route [auth_reply]
{
	if ($rc < 0) {
		xlog("Call not authorized: code=$cgr_ret!\n");
		send_reply(403, "Forbidden");
		exit;
	}
	...
}
```


```opensips title="async cgrates_cmd new usage"
route {
	...
	$cgr_opt(Tenant) = $fd;
	$cgr(Account) = $fU;
	$cgr(OriginID) = $ci;
	$cgr(SetupTime) = "" + $Ts;
	$cgr(RequestType) = "*prepaid";
	$cgr(Destination) = $rU;
	async(cgrates_cmd("SessionSv1.AuthorizeEventWithDigest"), auth_reply);
}

route [auth_reply]
{
	if ($rc < 0) {
		xlog("Call not authorized: MaxUsage=$cgr_ret(MaxUsage)!\n");
		send_reply(403, "Forbidden");
		exit;
	}
	...
}
```
<!-- CONTRIBUTORS -->

### 许可 {#license}

所有文档文件（即 .md 扩展名）均按 Creative Common License 4.0 授权
