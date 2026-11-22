---
title: "拓扑隐藏模块"
description: "该模块提供拓扑隐藏能力。"
sidebar: false
---

## 管理员指南 {#admin-guide}


### 概述 {#overview}


该模块提供拓扑隐藏能力。
该模块既可以工作在 dialog 模块之上，也可以作为独立模块运行（从而可为
所有类型的请求提供拓扑隐藏）。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


使用该模块前必须先加载以下模块：


- *TM - 事务模块*。
- *Dialog 模块*，如果启用了 "force_dialog"
模块参数，或者通过配置脚本创建了对话。


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载该模块运行 OpenSIPS 之前，必须先安装以下库或应用程序：


- *无*


### 导出的参数 {#exported-parameters}


#### th_callid_passwd (string)


在使用带 callid 改写的拓扑隐藏时，用于对 callid 进行编码/解码的字符串口令。


*默认值为 "OpenSIPS"*


```opensips title="设置 th_callid_passwd 参数"
...
modparam("topology_hiding", "th_callid_passwd", "my_topo_hiding_secret")
...
```


#### th_callid_prefix (string)


用于识别已被对话拓扑隐藏编码过的 callid 的前缀。如果 SIP 路径中存在多台启用了拓扑隐藏的 OpenSIPS 设备，请务必修改该值。


*默认值为 "DLGCH_"*


```opensips title="设置 th_callid_prefix 参数"
...
modparam("topology_hiding", "th_callid_prefix", "MYCALLIDPREFIX_")
...
```


#### th_passed_contact_uri_params (string)


以分号分隔的 Contact URI 参数列表，在拓扑隐藏呼叫中这些参数会从一侧传递到另一侧。当端到端功能用到此类 Contact URI 参数时使用。


*默认值为 "empty" —— 不传递任何参数*


```opensips title="设置 th_passed_contact_uri_params 参数"
...
modparam("topology_hiding", "th_passed_contact_uri_params", "paramname1;myparam;custom_param")
...
```


#### th_passed_contact_params (string)


以分号分隔的 Contact 头域参数列表，在拓扑隐藏呼叫中这些参数会从一侧传递到另一侧。当端到端功能用到此类 Contact 头域参数时使用。


*默认值为 "empty" —— 不传递任何参数*


```opensips title="设置 th_passed_contact_params 参数"
...
modparam("topology_hiding", "th_passed_contact_params", "paramname1;myparam;custom_param")
...
```


#### force_dialog (int)


若设为 1，模块会在内部创建对话（如果尚未创建）。此功能仅对基于 INVITE 的对话有效，并且必须加载 dialog 模块。


*默认值为 "0"*


```opensips title="设置 force_dialog 参数"
...
modparam("topology_hiding", "force_dialog", 1)
...
```


#### th_contact_encode_passwd (string)


当不依赖 dialog 模块时（出于脚本编写者的偏好，或仅仅是要对非 INVITE 对话做拓扑隐藏），模块会把所需信息存放在一个 Contact URI 参数中。该参数配置的是用于对该特定参数进行编码/解码的字符串口令。


*默认值为 "ToPoCtPaSS"*


```opensips title="设置 th_contact_encode_passwd 参数"
...
modparam("topology_hiding", "th_contact_encode_passwd", "my_topoh_passwd")
...
```


#### th_contact_encode_param (string)


当不依赖 dialog 模块时（出于脚本编写者的偏好，或仅仅是要对非 INVITE 对话做拓扑隐藏），模块会把所需信息存放在一个 Contact URI 参数中。该参数配置的是相应的参数名。


*默认值为 "thinfo"*


```opensips title="设置 th_contact_encode_param 参数"
...
modparam("topology_hiding", "th_contact_encode_param", "customparam")
...
```


#### th_contact_encode_scheme (string)


当不依赖 dialog 模块时（出于脚本编写者的偏好，或仅仅是要对非 INVITE 对话做拓扑隐藏），模块会把所需信息存放在一个 Contact URI 参数中。该参数配置的是存放在
Contact URI 参数中的数据所采用的编码方案。可选值有：


- *base64*
- *base32*


*默认值为 "base64"*


```opensips title="设置 th_contact_encode_scheme 参数"
...
modparam("topology_hiding", "th_contact_encode_scheme", "base32")
...
```


#### th_contact_caller_username_var (string)


用于存放向主叫通告的 contact 用户名的变量。


*默认值为 "_th_contact_caller_username_var_"*


```opensips title="设置 th_contact_caller_username_var 参数"
...
modparam("topology_hiding", "th_contact_caller_username_var", "__topo_hiding_username_var__")
...
```


#### th_contact_callee_username_var (string)


用于存放向被叫通告的 contact 用户名的变量。


*默认值为 "_th_contact_callee_username_var_"*


```opensips title="设置 th_contact_callee_username_var 参数"
...
modparam("topology_hiding", "th_contact_callee_username_var", "__topo_hiding_username_var__")
...
```


### 导出的函数 {#exported-functions}


#### topology_hiding()


在初始请求上调用该函数时，模块将隐藏拓扑，也就是说它会剥离并恢复所有 Via、
Record-Route 和 Route 头域，并把 contact 替换为接收该请求的
接口的 IP 地址。


但必须注意，对于应用了拓扑隐藏的这些对话，其后续对话内请求（BYE、reInvite 等）
的识别并不是自动完成的。
在未使用拓扑隐藏、只有普通对话的情况下，识别是在
调用 loose_route 时完成的。但现在，对于应用了拓扑
隐藏的这些对话，到达 OpenSIPS 的对话内请求不会带有任何 Route 头域，
且 RURI 会指向 OpenSIPS 所在机器。
因此，为了把对话内请求匹配到对应的对话，必须调用一个脚本
函数。它的名字是 *topology_hiding_match*，你可以在上面读到
它的说明。
对话内拓扑请求是指带有 to tag、
RURI 指向 opensips，且方法为
Invite 对话所特有的请求。对于这类请求，应当调用
topology_hiding_match() 函数。如果请求被成功匹配并按拓扑隐藏逻辑完成修正，
该函数返回成功。


可选地，该函数还接收一个字符串参数，其中存放字符串标志位。
字符串标志位当前的可选值有：


- *U* - 在 Contact 头域 URI 中传递用户名
- *D* - 对话 ID（DID）被写入 Contact 用户名，而不是 URI 参数。此选项仅在使用带对话支持的拓扑隐藏时有意义。
- *a* - 在整个对话期间保持向主叫通告的 Contact 头域。
- *A* - 在整个对话期间保持向被叫通告的 Contact 头域。
- *D* - 对话 ID（DID）被写入 Contact 用户名，而不是 URI 参数。此选项仅在使用带对话支持的拓扑隐藏时有意义。
- *C* - 对 callid 头域进行编码
在很多情况下，把 callid 传递到被叫侧并不是个好主意，因为有时 callid 中会包含实际主叫侧的 IP，从而暴露部分网络拓扑。
使用 "C" 标志位时，callid 会被自动编码/解码，对脚本编写者透明——在 OpenSIPS 内部（脚本、MI 函数等）所有与 callid 相关的变量都表示主叫侧的 callid 值。如果需要被叫侧的 callid，请参考 $TH_callee_callid 伪变量。
*注意：*使用 "C" 标志位修改呼叫的 callid 仅在
带*对话支持*的拓扑隐藏下可用。在没有对话支持的情况下使用
该标志位根本不会改变 callid！。


第二个参数可用于在 Contact 头域 URI 中通告特定的
*用户名*，分别作用于
*主叫*或*被叫*
侧，以 */* 分隔。该参数的格式为
*caller_username|/[caller_contact_username][/callee_contact_username]*。
如果没有分隔符，则两侧通告相同的 contact 用户名。如果使用了分隔符，你就可以按侧控制
写入 contact 的用户名。


```opensips title="topology_hiding 用法"
...
if(!has_totag() && is_method("INVITE")) {
	topology_hiding();
}
...
...
if(!has_totag() && is_method("INVITE")) {
	topology_hiding("U");
}
...
# 把主叫和被叫的 Contact 用户名都设为 "opensips"
if(!has_totag() && is_method("INVITE")) {
	topology_hiding("U", "opensips");
}
...
# 把主叫的 Contact 用户名设为 "caller"
if(!has_totag() && is_method("INVITE")) {
	topology_hiding("U", "/caller");
}
...
# 把被叫的 Contact 用户名设为 "callee"
if(!has_totag() && is_method("INVITE")) {
	topology_hiding("U", "//callee");
}
...
# 把主叫的 Contact 用户名设为 "caller"，
# 把被叫的 Contact 用户名设为 "callee"
if(!has_totag() && is_method("INVITE")) {
	topology_hiding("U", "/caller/callee");
}
...
```


```opensips title="为拓扑隐藏的顺序请求调用 topology_hiding_match() 函数"
...
if (has_totag())
        if(topology_hiding_match())
        {
                xlog("Found a request $rm belonging to an existing topology hiding dialog\n");
                route(relay);
                exit;
        }
}
...
```


#### topology_hiding_match([dlg_match_mode])


该函数用于匹配并修正属于某个已存在拓扑隐藏对话的顺序请求。


在对话匹配方面（包括可选参数），该函数的行为与 match_dialog() 完全一致。关于对话
匹配选项的更多细节，请参见 dialog 模块文档。


如果该请求存在对应的拓扑隐藏对话且请求已被成功修正，函数返回 true。


该函数可在 REQUEST_ROUTE 中使用。


```opensips title="topology_hiding_match_dialog() 用法"
...
    if (has_totag()) {
        if (!topology_hiding_match() ) {
            xlog(" cannot match request to a dialog \n");
	    send_reply(404,"Not found");
        } else
		route(RELAY);
    }
...
```


### 导出的伪变量 {#exported-pseudo-variables}


#### $TH_callee_callid


只读变量，当调用了 topology_hiding("C") 时，其中存放向被叫侧传递的 callid。


如果该请求没有对应的拓扑隐藏对话，或者当前对话未使用带 callid 编码的拓扑隐藏，则返回 NULL。
<!-- CONTRIBUTORS -->

### 许可证 {#license}

所有文档文件（即 .md 扩展名）均按 Creative Common License 4.0 许可
