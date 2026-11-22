---
title: "UAC REDIRECT 模块"
description: "UAC REDIRECT（User Agent Client redirection，用户代理客户端重定向）模块为 OpenSIPS 增强处理（解析、过滤、记录并跟随）重定向应答（3xx 应答类）的能力。"
---


## 管理指南 {#admin-guide}


### 概述 {#overview}


UAC REDIRECT（User Agent Client redirection，用户代理客户端重定向）模块
为 OpenSIPS 增强了处理（解析、过滤、记录并跟随）重定向应答
（3xx 应答类）的能力。


UAC REDIRECT 模块提供有状态处理，会从一次呼叫的所有 3xx 分支中
收集联系人。


本模块提供了一套强大的机制，用于选择和过滤将在新的重定向中
使用的联系人：


- *基于数量* - 例如要使用的联系人总数上限，或
每个分支可选择的联系人最大数量这类限制。
- *基于正则表达式* - 拒绝过滤器与接受过滤器的
组合，可对用于重定向的联系人进行严格控制。


从 3xx 分支中选择要使用的联系人时，将根据 "q" 值
对这些联系人排序并划分优先级。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


在本模块之前必须加载以下模块：


- *TM* - 事务模块，用于访问
应答。
- *ACC* - 计费模块，但仅在使用
日志记录功能时才需要。


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，必须安装
以下库或应用程序：


- *无*


### 导出的参数 {#exported-parameters}


#### default_filter (string)


过滤联系人时的默认行为。可取
"accept" 或 "deny"。


*默认值为 "accept"。*


```opensips title="设置 default_filter 模块参数"
...
modparam("uac_redirect","default_filter","deny")
...
				
```


#### deny_filter (string)


用于默认拒绝过滤的正则表达式。仅当 `default_filter`
参数设置为 "accept" 时定义它才有意义。所有匹配
`deny_filter` 的联系人都将被拒绝；其余
联系人则会被接受用于重定向。


该参数只能定义一次 - 多次定义会
覆盖先前的定义。如果需要定义更多正则表达式，
请使用
`set_deny_filter()` 脚本
函数。


*该参数为可选，其默认
值为 NULL。*


```opensips title="设置 deny_filter 模块参数"
...
modparam("uac_redirect","deny_filter",".*@siphub\.net")
...
				
```


#### accept_filter (string)


用于默认接受过滤的正则表达式。仅当 `default_filter`
参数设置为 "deny" 时定义它才有意义。所有匹配
`accept_filter` 的联系人都将被接受；其余
联系人则会被拒绝，不用于重定向。


该参数只能定义一次 - 多次定义会
覆盖先前的定义。如果需要定义更多正则表达式，
请使用
`set_accept_filter()` 脚本
函数。


*该参数为可选，其默认
值为 NULL。*


```opensips title="设置 accept_filter 模块参数"
...
modparam("uac_redirect","accept_filter",".*@siphub\.net")
...
				
```


### 导出的函数 {#exported-functions}


#### set_deny_filter(filter,flags)


设置附加的拒绝过滤器。最多可组合 6 个。该
附加过滤器仅作用于当前消息 - 不会
产生全局影响。


参数：


- *filter* (string) - 正则表达式
- *flags* (string)
是否重置默认或先前添加的拒绝过滤器，取决于
该参数的值：

  - *reset_all* - 同时重置默认
和先前添加的拒绝过滤器；
  - *reset_default* - 仅重置
默认拒绝过滤器；
  - *reset_added* - 仅重置
先前添加的拒绝过滤器；
  - *empty* - 不重置，仅添加
该过滤器。


该函数可在 FAILURE_ROUTE 中使用。


```opensips title="set_deny_filter 用法"
...
set_deny_filter(".*@domain2.net","reset_all");
set_deny_filter(".*@domain1.net","");
...
				
```


#### set_accept_filter(filter,flags)


设置附加的接受过滤器。最多可组合 6 个。该
附加过滤器仅作用于当前消息 - 不会
产生全局影响。


参数：


- *filter* (string) - 正则表达式
- *flags* (string)
是否重置默认或先前添加的接受过滤器，取决于
该参数的值：

  - *reset_all* - 同时重置默认
和先前添加的接受过滤器；
  - *reset_default* - 仅重置
默认接受过滤器；
  - *reset_added* - 仅重置
先前添加的接受过滤器；
  - *empty* - 不重置，仅添加
该过滤器。


该函数可在 FAILURE_ROUTE 中使用。


```opensips title="set_accept_filter 用法"
...
set_accept_filter(".*@domain2.net","reset_added");
set_accept_filter(".*@domain1.net","");
...
				
```


#### get_redirects([max_total], [max_branch])


该函数只能从失败路由中调用。它会
从所有 3xx 分支中提取联系人，并将它们
作为新分支追加。注意，该函数不会转发
这些新分支，必须由脚本显式完成。


选择多少个联系人（总数以及每个分支）取决于
*max_total* 和
*max_branch* 参数：


- max_total (int, optional) - 要选择的联系人总数上限
- max_branch (int, optional) - 每个分支要选择的联系人数量上限


"max_total" 和 "max_branch"
默认值均为 0（不限制）。


> [!NOTE]
> 在选择过程中，来自特定分支的每一组
> 联系人都会根据 "q"
> 值排序。


该函数可在 FAILURE_ROUTE 中使用。


```opensips title="get_redirects 用法"
...
# 无限制
get_redirects();
...
# 每个分支无限制，但联系人总数不超过 6 个
get_redirects(6);
...
# 每个分支最多 2 个联系人，但总数不限制
get_redirects(, 2);
...
				
```


### 脚本示例 {#script-example}


```opensips title="重定向脚本示例"
loadmodule "modules/sl/sl.so"
loadmodule "modules/usrloc/usrloc.so"
loadmodule "modules/registrar/registrar.so"
loadmodule "modules/tm/tm.so"
loadmodule "modules/acc/acc.so"
loadmodule "modules/uac_redirect/uac_redirect.so"

modparam("usrloc", "db_mode",   0)

route{
	if (is_myself("$rd")) {

		if ($rm=="REGISTER") {
			save("location");
			exit;
		};

		if (!lookup("location")) {
			sl_send_reply(404, "Not Found");
			exit;
		};
	}

	t_on_failure("do_redirect");

	if (!t_relay()) {
		sl_reply_error();
	};
}

failure_route[do_redirect] {
	if (get_redirects(3, 1))
		t_relay();
}

				
```
<!-- CONTRIBUTORS -->

### 许可证 {#license}

所有文档文件（即以 .md 为扩展名的文件）均按 Creative Common License 4.0 授权。
