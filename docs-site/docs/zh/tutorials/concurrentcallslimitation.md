---
title: "并发呼叫限制"
description: "使用 OpenSIPS 的 dialog profile 实现并发呼叫限制。"
---

OpenSIPS 可以利用 **[dialog](/zh/modules/dialog)** 模块提供的*[呼叫 profile](/zh/modules/dialog#dialog_profiling)*支持来实现并发呼叫限制。呼叫 profile 是一种简单的机制，可以把特定的呼叫分组并对其计数。分组还可以借助*标签*（组内的值）来扩展，从而在统计呼叫数量时获得更细的粒度。

可以使用不同的键来对呼叫分组（例如入向 IP 地址、主叫用户、出向 GW 等）。一旦为这样一组呼叫创建了 profile，在 OpenSIPS 脚本中处理该呼叫时，就把该呼叫加入这个组，并可附带一个额外的标签（标签即入向 IP、主叫或 GW 的实际值）。

在下面的示例中，我们创建一个通用路由，用于限制来自同一主叫的并发呼叫。该*路由*接收两个参数：主叫 SIP 用户名和限制值。这个*路由*应在创建呼叫时使用（即处理初始 INVITE 时），并且在脚本中完成对话创建之后调用。

```opensips
....
# 定义 profile
modparam("dialog", "profiles_with_value", "caller")
....

########################################################################
# 本路由用于初始 INVITE，在
#   dialog 已创建之后调用
# 参数：
#    * 主叫 URI（字符串）
#    * 限制值（整型）
########################################################################
route[do_cc_limit]
{
	# 先加入 profile，仅用于避免 "test and set" 的误判结果
	set_dlg_profile("caller", $param(1));

	# 执行实际检测 - 看看该用户目前有多少路呼叫
	get_profile_size("caller", $param(1), $var(calls));
	xlog("User $param(1) has $var(calls) ongoing calls so far, limit is $param(2)\n");

	# 检查是否在限制之内
	if( $var(calls)>$param(2) )
	{	
		xlog("do_limit: user $param(1) exceeded number of calls [$var(calls)/$param(2)]\n");
		send_reply(487, "Request Terminated: Channel limit exceeded\n");
		exit;
		# 终止本次呼叫会自动把该呼叫从 profile 中移除
	}

	# 呼叫已在未超限的情况下加入 profile，直接继续
}
....
....
route {
	.....
	# 初始 INVITE
	route( do_cc_limit, $fu, 10);
	.....
}
```

在这里你可以找到一份**[功能完整的基础脚本](https://github.com/OpenSIPS/opensips/tree/master/modules/dialog/samples/opensips-dialog-cc-limit.cfg)**（终端用户注册并进行 SIP 到 SIP 呼叫），其中使用了这种并发呼叫限制。
