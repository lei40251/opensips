---
title: "sipmsgops 模块"
description: "该模块在 OpenSIPS 处理的消息之上实现基于 SIP 的操作。"
sidebar: false
---


## 管理员指南 {#admin-guide}


### 概述 {#overview}


该模块在 OpenSIPS 处理的消息之上实现基于 SIP 的操作。SIP 是一种基于文本的
协议，该模块提供大量非常有用的函数，用于在 SIP 层面操作消息，例如插入新
头域或删除头域、检查方法类型等。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


在加载本模块之前，必须先加载以下模块：


- *不依赖其他 OpenSIPS 模块*。


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块的情况下运行 OpenSIPS 之前，必须先安装以下库或应用程序：


- *无*。


### 导出的函数 {#exported-functions}


#### append_to_reply(txt)


将 'txt' 作为头域追加到 OpenSIPS 为该请求生成的所有应答中。


各参数的含义如下：


- *txt (string)* - SIP 头域字段、值以及 CRLF 标记。


该函数可在 REQUEST_ROUTE、FAILURE_ROUTE、
BRANCH_ROUTE 和 ERROR_ROUTE 中使用。


```opensips title="append_to_reply usage"
...
append_to_reply("Foo: bar\r\n");
append_to_reply("Foo: $rm at $Ts\r\n");
...
```


#### append_body_to_reply(txt)


将 'txt' 作为消息体追加到 OpenSIPS 为该请求生成的所有应答中。


多次调用将覆盖已设置的消息体。


> [!NOTE]
> 该函数不会添加任何与消息体匹配的 Content-Type 头域，
> 因此应使用 "append_to_reply()" 来完成这一工作。


各参数的含义如下：


- *txt (string)* - SIP 应答的消息体


该函数可在 REQUEST_ROUTE、FAILURE_ROUTE、
BRANCH_ROUTE 和 ERROR_ROUTE 中使用。


```opensips title="append_to_reply usage"
...
append_body_to_reply( $var(sdp_body) );
...
```


#### append_hf(txt[, hdr_anchor])


将 'txt' 作为头域追加到最后一个头域字段之后。如果给定了
'hdr_anchor'，则 'txt' 将改为追加到 'hdr_anchor' 首次出现的位置之后。


各参数的含义如下：


- *txt (string)* - 要追加的头域字段。
- *hdr_anchor (string, optional)* - 头域名称，
'txt' 将追加到该头域之后。

> [!NOTE]
> 在主路由中添加的头域无法在后续路由（如失败路由）中删除。
> 因此，不要在其中添加之后可能想要删除的头域。要临时添加头域，
> 请使用分支路由，因为在那里所做的改动是按分支生效的。


该函数可在 REQUEST_ROUTE、ONREPLY_ROUTE、
FAILURE_ROUTE、BRANCH_ROUTE 和 LOCAL_ROUTE 中使用。


```opensips title="append_hf usage"
...
append_hf("P-hint: VOICEMAIL\r\n");
append_hf("From-username: $fU\r\n");
append_hf("From-username: $fU\r\n", "Call-ID");
...
```


#### insert_hf(txt)


将 'txt' 作为头域插入到第一个头域字段之前。


各参数的含义如下：


- *txt (string)* - 要插入的头域字段。


该函数可在 REQUEST_ROUTE、ONREPLY_ROUTE、
FAILURE_ROUTE、BRANCH_ROUTE 和 LOCAL_ROUTE 中使用。


```opensips title="insert_hf usage"
...
insert_hf("P-hint: VOICEMAIL\r\n");
insert_hf("To-username: $tU\r\n");
...
```


#### insert_hf(txt, hdr)


将 'txt' 作为头域插入到第一个 'hdr' 头域字段之前。


各参数的含义如下：


- *txt (string)* - 要插入的头域字段。
- *hdr (string, optional)* - 头域名称，
'txt' 将插入到该头域之前。


该函数可在 REQUEST_ROUTE、ONREPLY_ROUTE、
FAILURE_ROUTE、BRANCH_ROUTE 和 LOCAL_ROUTE 中使用。


```opensips title="insert_hf usage"
...
insert_hf("P-hint: VOICEMAIL\r\n", "Call-ID");
insert_hf("To-username: $tU\r\n", "Call-ID");
...
```


#### append_urihf(prefix, suffix)


追加头域字段名称，中间使用原始 Request-URI。


各参数的含义如下：


- *prefix* - 字符串（通常至少包含
头域字段名称）。
- *suffix* - 字符串（通常至少包含
行结束符）。


该函数可在 REQUEST_ROUTE、FAILURE_ROUTE
和 BRANCH_ROUTE 中使用。


```opensips title="append_urihf usage"
...
append_urihf("CC-Diversion: ", "\r\n");
...
```


#### is_present_hf(hf_name)


如果消息中存在某个头域字段，则返回 true。


> [!NOTE]
> 该函数还能识别紧凑名称。例如 "From" 将匹配 "f"


各参数的含义如下：


- *hf_name (string)* - 头域字段名称（长名称或
紧凑形式）。


该函数可在 REQUEST_ROUTE、ONREPLY_ROUTE、
FAILURE_ROUTE、BRANCH_ROUTE 和 LOCAL_ROUTE 中使用。


```opensips title="is_present_hf usage"
...
if (is_present_hf("From")) log(1, "From HF Present");
...
```


#### append_time()


为请求的应答添加时间头域。必须在可能发送应答的函数之前使用它，
例如 'registrar' 模块的 save()。头域格式为：
"Date: %a, %d %b %Y %H:%M:%S GMT"，其中各项含义为：


- *%a* 缩写的星期名称（区域设置）
- *%d* 以十进制数字表示的月内日期
- *%b* 缩写的月份名称（区域设置）
- *%Y* 带世纪的年份
- *%H* 小时
- *%M* 分钟
- *%S* 秒


如果头域追加成功，则返回 true。


该函数可在 REQUEST_ROUTE、FAILURE_ROUTE、
BRANCH_ROUTE 和 LOCAL_ROUTE 中使用。


```opensips title="append_time usage"
...
append_time();
...
```


#### is_method(name)


检查消息的方法是否与名称匹配。如果名称是已知方法（invite、cancel、ack、bye、
options、info、update、register、message、subscribe、notify、refer、prack），
则该函数执行方法 ID 测试（整型比较），而不是忽略大小写的字符串比较。


'name' 可以是形如 'method1|method2|...' 的方法列表。在这种情况下，
如果 SIP 消息的方法属于该列表之一，函数返回 true。重要提示：
列表中只能是在 OpenSIPS 中定义了 ID 的方法（invite、cancel、ack、
bye、options、info、update、register、message、subscribe、notify、
refer、prack、publish；更多参见：
[https://www.iana.org/assignments/sip-parameters](https://www.iana.org/assignments/sip-parameters)）。


如果用于应答，该函数测试 CSeq 头域中的 method 字段值。


各参数的含义如下：


- *name (string)* - SIP 方法名称


该函数可在 REQUEST_ROUTE、ONREPLY_ROUTE、
FAILURE_ROUTE、BRANCH_ROUTE 和 LOCAL_ROUTE 中使用。


```opensips title="is_method usage"
...
if(is_method("INVITE"))
{
    # 在此处理 INVITE 请求
}
if(is_method("OPTION|UPDATE"))
{
    # 在此处理 OPTION 和 UPDATE 请求
}
...
```


#### remove_hf(hname)


从消息中删除所有名称为 "hname" 的头域


如果至少找到一个并删除了一个头域，则返回 true。


各参数的含义如下：


- *hname (string)* - 要删除的头域名称。


该函数可在 REQUEST_ROUTE、ONREPLY_ROUTE、
FAILURE_ROUTE、BRANCH_ROUTE 和 LOCAL_ROUTE 中使用。


```opensips title="remove_hf usage"
...
if(remove_hf("User-Agent"))
{
    # User Agent 头域已删除
}
...
```


#### remove_hf_re(hname_expr)


从消息中删除所有匹配 "hname_expr" POSIX 正则表达式的
头域。


如果至少找到一个并删除了一个头域，则返回 true。


各参数的含义如下：


- *hname_expr (string)* - 正则表达式。


该函数可在 REQUEST_ROUTE、ONREPLY_ROUTE、
FAILURE_ROUTE、BRANCH_ROUTE 和 LOCAL_ROUTE 中使用。


```opensips title="remove_hf_re usage"
...
remove_hf_re("^X-g.+[0-9]");
...
```


#### remove_hf_glob(hname_pattern)


从消息中删除所有匹配 "hname_pattern" glob 模式的
头域。


如果至少找到一个并删除了一个头域，则返回 true。


各参数的含义如下：


- *hname_pattern (string)* - glob 模式


该函数可在 REQUEST_ROUTE、ONREPLY_ROUTE、
FAILURE_ROUTE、BRANCH_ROUTE 和 LOCAL_ROUTE 中使用。


```opensips title="remove_hf_glob usage"
...
# 删除 X-Billing-Account、X-Billing-Price、X-Billing-rateplan 等
remove_hf_glob("X-Billing*");
...
```


#### has_totag()


检查 To 头域字段的 uri 是否包含 tag 参数。


该函数可在 REQUEST_ROUTE、ONREPLY_ROUTE、
FAILURE_ROUTE、BRANCH_ROUTE 和 LOCAL_ROUTE 中使用。


```opensips title="has_totag usage"
...
if (has_totag()) {
	...
};
...
```


#### ruri_has_param(param[,value])


查找 Request URI 是否具有给定参数。如果未给出值，
函数将查找不带值的该参数，否则将查找具有匹配值的该参数。


各参数的含义如下：


- *param (string)* - 要查找的参数名称。
- *value (string, optional)* - 要匹配的参数值。


该函数可在 REQUEST_ROUTE、
FAILURE_ROUTE、BRANCH_ROUTE 和 LOCAL_ROUTE 中使用。


```opensips title="ruri_has_param usage"
...
if (ruri_has_param("user","phone")) {
	...
};
...
```


#### ruri_add_param(param)


向 RURI 添加格式为 "name=value" 的 URI 参数。


各参数的含义如下：


- *param (string)* - 以
"name=value" 格式追加的参数。


该函数可在 REQUEST_ROUTE、
FAILURE_ROUTE、BRANCH_ROUTE 和 LOCAL_ROUTE 中使用。


```opensips title="ruri_add_param usage"
...
ruri_add_param("nat=yes");
...
```


#### ruri_del_param(param)


从当前 SIP 消息的 Request-URI 中删除参数、其值以及任何前导的 ";"。


各参数的含义如下：


- *param (string)* - 要删除的参数


删除成功时返回 **1**，否则返回 **-1**。


该函数可在 REQUEST_ROUTE、
FAILURE_ROUTE、BRANCH_ROUTE 和 LOCAL_ROUTE 中使用。


```opensips title="ruri_del_param usage"
...
ruri_del_param("user");
...
```


#### ruri_tel2sip()


如果 RURI 是 tel URI，则将其转换为 SIP URI。仅在
转换成功或无需转换时（例如 RURI 不是 tel URI）
返回 true。


该函数可在 REQUEST_ROUTE、
FAILURE_ROUTE、BRANCH_ROUTE 和 LOCAL_ROUTE 中使用。


```opensips title="ruri_tel2sip usage"
...
ruri_tel2sip();
...
```


#### is_uri_user_e164(uri)


检查给定 URI 的用户名部分是否为 E164 号码。


各参数的含义如下：


- *uri (string)* - 一个 SIP URI


该函数可在 REQUEST_ROUTE、FAILURE_ROUTE
和 LOCAL_ROUTE 中使用。


```opensips title="is_uri_user_e164 usage"
...
if (is_uri_user_e164($fu)) {  # 检查 From 头域 URI 的用户部分
   ...
}
if (is_uri_user_e164($avp(uri)) {
   # 检查存储在 avp uri 中的 URI 的用户部分
   ...
};
...
```


#### has_body_part([mime])


如果 SIP 消息具有任何给定 MIME 的消息体部分，该函数返回 *true*。如果未给出 MIME，
则只要找到至少一个消息体部分（任意 MIME）就返回 true。

> [!NOTE]
> 如果 `mime` 不被 OpenSIPS 识别/已知，该函数将始终返回 true。因此务必小心！！
> 作为替代，可以使用 [`$cT`](/zh/manual/Script-CoreVar#cT) 变量，它允许对 mime 进行纯字符串匹配——
> 因此对**任何** mime 都有效。

该函数可在 REQUEST_ROUTE、ONREPLY_ROUTE、
FAILURE_ROUTE、BRANCH_ROUTE 和 LOCAL_ROUTE 中使用。


```opensips title="has_body_part usage"
...
if(has_body_part("application/sdp"))
{
    # 在此做一些有意思的处理
}
...
```


#### is_audio_on_hold()


如果 SIP 消息附带 SDP 消息体，且至少有一个音频流处于保持状态，
该函数返回 *true*。函数的返回码表示检测到的保持类型：


- *1* - RFC2543 保持类型：
检测到空连接 IP
- *2* - RFC3264 保持类型：
检测到 inactive 或 sendonly 属性


该函数可在 REQUEST_ROUTE、ONREPLY_ROUTE、
FAILURE_ROUTE、BRANCH_ROUTE 和 LOCAL_ROUTE 中使用。


```opensips title="is_audio_on_hold usage"
...
if(is_audio_on_hold())
{
    switch ($rc) {
    case 1:
        # RFC2543 保持类型
    	# 在此做一些有意思的处理
        break;
    case 2:
        # RFC3264 保持类型
    	# 在此做一些有意思的处理
        break;
}
...
```


#### is_privacy(privacy_type)


如果 SIP 消息具有 Privacy 头域，且在其隐私值中包含给定的
privacy_type，该函数返回 *true*。可能的隐私类型值参见
[https://www.iana.org/assignments/sip-parameters/sip-parameters.xhtml#sip-parameters-8](https://www.iana.org/assignments/sip-parameters/sip-parameters.xhtml#sip-parameters-8)。


该函数可在 REQUEST_ROUTE、ONREPLY_ROUTE、
FAILURE_ROUTE、BRANCH_ROUTE 和 LOCAL_ROUTE 中使用。


```opensips title="is_privacy usage"
...
if(is_privacy("id"))
{
    # 在此做一些有意思的处理
}
...
```


#### remove_body_part([mime[, revert]])


从消息体中删除所有具有给定 mime 的消息体部分。
对 Content-Type 和 Content-Length 头域的必要修正
会自动完成。


如果给定了 MIME 类型，则只删除具有该 mime 的消息体部分。
如果未给出 MIME，则删除所有部分（整个消息体）。


各参数的含义如下：


- *mime (string, optional)* - 用于
与消息体部分进行比对的 MIME 类型；如果未给出，则删除所有部分；
- *revert (string, optional)* - 仅在
指定了 MIME 时有用。如果此处给出 "revert" 字符串，
该函数将删除除具有给定 MIME 的部分之外的所有消息体部分。


该函数可在 REQUEST_ROUTE、ONREPLY_ROUTE、
FAILURE_ROUTE、BRANCH_ROUTE 和 LOCAL_ROUTE 中使用。


```opensips title="remove_body_part() usage"
...
# 删除整个消息体（所有部分）
remove_body_part();
# 删除所有 mime 为 "application/isup" 的消息体部分
remove_body_part("application/isup");
# 删除所有消息体部分，但保留 mime 为 "application/sdp" 的部分
remove_body_part("application/sdp","revert")
...
```


#### add_body_part(body, mime[, headers])


该函数可用于向消息体添加新的消息体部分。
如果已存在其他部分，消息体将自动转换为多部分消息体。


各参数的含义如下：


- *body (string)* - 要添加的消息体部分的
内容
- *mime (string)* - 要添加的消息体部分的
mime 字符串
- *headers (string, optional)* - 可选的 SIP 头域列表
（完整定义，包括头域分隔符），将被推入该部分，紧邻 *Content-Type* 头域。


该函数可在 REQUEST_ROUTE、ONREPLY_ROUTE、
FAILURE_ROUTE、BRANCH_ROUTE 和 LOCAL_ROUTE 中使用。


```opensips title="add_body_part usage"
...
add_body_part("Hello World!", "text/plain");
...
```


#### get_updated_body_part( [mime], variable)


该函数将重新生成的消息体部分返回到变量中，
即包含 OpenSIPS 迄今所做全部改动的消息体部分。当你想对
消息体部分执行一系列操作，而某些操作需要先应用之前的全部改动时
（例如先做某些编解码相关改动，之后再插入 rtpengine），
这很有用。


> [!NOTE]
> 实际 SIP 消息不会受此操作影响！


各参数的含义如下：


- *mime (string)* - 要重新生成并返回的
消息体的 mime 字符串。如果缺失，则重新生成整个
消息体（包括其所有部分）。
- *variable* - 用于返回重新生成的消息体部分
（作为文本）的变量。


该函数可在 REQUEST_ROUTE、ONREPLY_ROUTE、
FAILURE_ROUTE、BRANCH_ROUTE 和 LOCAL_ROUTE 中使用。


```opensips title="get_updated_body_part usage"
...
	codec_delete_re("PCMA|PCMU");

	get_updated_body_part( "application/sdp", $var(new_sdp));

	xlog("------updated SDP is ----\n$var(new_sdp)\n-----------\n");
	exit;
...
```


#### sipmsg_validate([flags[, result_pvar]])


如果 SIP 消息按照 SIP RFC3261 构造正确，该函数返回 *true*。
它会验证每个请求/应答的必填头域，还可检查头域的
消息体格式。


收到的 flags 参数是可选的，可由以下值组合而成：


- *'s'* - 检查 SDP 消息体（如果存在）
的完整性
- *'h'* - 检查每个头域消息体的格式
和完整性。
- *'m'* - 不检查
Max-Forwards 头域。
- *'r'* - 检查 R-URI
以及域是否包含有效字符。
- *'f'* - 检查 'From' 字段的 URI
以及域是否包含有效字符。
- *'t'* - 检查 'To' 字段的 URI
以及域是否包含有效字符。
- *'c'* - 检查 'Contact' 字段的值
以及它是否为 Uri、Star —— 用于 Expires 头域设为 0 的 REGISTER 请求。


result_pvar 参数在结果为否定时，将带文本错误原因的结果 pvar 设置好
（便于记录日志，或把拒绝原因回传给有问题的 UA）


该函数可返回以下代码：


- *1* - 消息符合
RFC3261 且已成功通过校验。
- *-1* - 没有 SIP 消息
- *-2* - 头域解析错误
- *-3* - 没有 Call-ID 头域
- *-4* - 对于要求 Content-Length 的传输协议（如 TCP），没有该头域
- *-5* - Content-Length 无效，与实际消息体大小不符
- *-6* - SDP 消息体解析错误。
- *-7* - 没有 Cseq 头域。
- *-8* - 没有 From 头域。
- *-9* - 没有 To 头域。
- *-10* - 没有 Via 头域。
- *-11* - Request URI 解析错误。
- *-12* - R-URI 中的主机名无效。
- *-13* - 没有 Max-Forwards 头域。
- *-14* - 没有 Contact 头域。
- *-15* - 非 Register 请求使用了 Path 用户。
- *-16* - 405 应答中没有 allow 头域。
- *-17* - 423 应答中没有 Min-Expire 头域。
- *-18* - 407 应答中没有 Proxy-Authorize 头域。
- *-19* - 420 应答中没有 Unsupported 头域。
- *-20* - 401 应答中没有 WWW-Authorize 头域。
- *-21* - 没有 Content-Type 头域
- *-22* - To 头域解析错误
- *-23* - To 头域中的主机名无效
- *-24* - From 头域解析错误
- *-25* - From 头域中的主机名无效
- *-26* - Contact 头域解析错误
- *-27* - URI 用户名无效
- *-28* - From URI 用户名无效
- *-29* - To URI 用户名无效
- *-30* - 非 Register 请求的 Contact 头域包含 *
- *-255* - 未定义的错误。


该函数可在 REQUEST_ROUTE、ONREPLY_ROUTE、
FAILURE_ROUTE 和 BRANCH_ROUTE 中使用。


```opensips title="sipmsg_validate usage"
...
if(!sipmsg_validate())
{
	send_reply(400, "Bad Request");
	exit;
}
...

...
# 同时检查 SDP 和头域消息体
if(!sipmsg_validate("sh", $var(err_reason)))
{
	send_reply(400, "Bad Request/Body");
	exit;
}
...

...
# 对 200 Ok 应答检查 Contact 头域，若其为 * 则记录日志
if(!sipmsg_validate("c"))
{
	if ($rc == -30)
		xlog("Invalid * Contact header found\n");
}
...
```


#### codec_exists (name[, clock])


该函数可用于验证 sdp 载荷中是否存在某个编解码。
它会在所有 sdp 会话的所有流中搜索该编解码。如果在任何位置找到，
则返回 TRUE，否则返回 FALSE。


参数：


- *name* (string) - 该参数不区分大小写。
- *clock* (string, optional) - 如果未提供，
则任意时钟频率都将匹配。该参数不区分大小写。


该函数可在 REQUEST_ROUTE、ONREPLY_ROUTE、
FAILURE_ROUTE、BRANCH_ROUTE 和 LOCAL_ROUTE 中使用。


```opensips title="codec_exists usage"
...
codec_exists("speex");
or
codec_exists("GSM", "8000");
...
```


#### codec_delete(name[, clock])


该函数可用于从 sdp 载荷中删除某个编解码。它会在所有 sdp 会话的
所有流中搜索该编解码。如果在任何位置找到，将从
映射（"a=..."）和索引列表（"m=..."）中删除。
如果发生了任何删除则返回 TRUE，否则返回 FALSE。


- *name* (string) - 该参数不区分大小写。
- *clock* (string, optional) - 如果未提供，
则任意时钟频率都将匹配，并将全部删除。该参数不区分大小写。


该函数可在 REQUEST_ROUTE、ONREPLY_ROUTE、
FAILURE_ROUTE、BRANCH_ROUTE 和 LOCAL_ROUTE 中使用。


```opensips title="codec_delete usage"
...
codec_delete("speex");
or
codec_delete("GSM", "8000");
...
```


#### codec_move_up(name[, clock])


该函数可用于将某个编解码在索引列表（"m=..."）中上移。
它会在所有 sdp 会话的所有流中搜索该编解码。如果在任何位置找到，
将被移动到索引列表的顶部。如果发生了任何移动则返回 TRUE，
否则返回 FALSE。


- *name* (string) - 该参数不区分大小写。
- *clock* (string, optional) - 如果未提供，
则任意时钟频率都将匹配，所有编解码
将被移到前面，同时保持其原有顺序。
该参数不区分大小写。


该函数可在 REQUEST_ROUTE、ONREPLY_ROUTE、
FAILURE_ROUTE、BRANCH_ROUTE 和 LOCAL_ROUTE 中使用。


```opensips title="codec_move_up usage"
...
codec_move_up("speex");
or
codec_move_up("GSM", "8000");
...
```


#### codec_move_down(name[, clock])


该函数可用于将某个编解码在索引列表（"m=..."）中下移。
它会在所有 sdp 会话的所有流中搜索该编解码。如果在任何位置找到，
将被移动到索引列表的末尾。如果发生了任何移动则返回 TRUE，否则返回
FALSE。第二个参数是可选的，如果未提供，则任意时钟频率都将匹配，
所有编解码将被移到末尾，同时保持其原有顺序。
参数不区分大小写。


- *name* (string) - 该参数不区分大小写。
- *clock* (string, optional) - 如果未提供，
则任意时钟频率都将匹配，所有编解码
将被移到末尾，同时保持其原有顺序。
该参数不区分大小写。


该函数可在 REQUEST_ROUTE、ONREPLY_ROUTE、
FAILURE_ROUTE、BRANCH_ROUTE 和 LOCAL_ROUTE 中使用。


```opensips title="codec_move_down usage"
...
codec_move_down("speex");
or
codec_move_down("GSM", "8000");
...
```


```opensips title="codec_move_down usage"
...
/*
  本示例将把时钟为 8000 的 speex 编解码移到列表末尾，
  然后删除时钟为 8000 的 GSM，接着把所有
  speex 编解码移到列表前面。Speex/8000 将排在任何
  其他 speex 之后。
*/
codec_move_down("speex", "8000");
codec_delete("GSM", "8000");
codec_move_up("speex");
...
```


#### codec_exists_re ( regexp )


该函数与 codec_exists 效果相同（不含
clock 参数），唯一区别是它接受 POSIX 正则表达式
作为参数。


该函数可在 REQUEST_ROUTE、ONREPLY_ROUTE、
FAILURE_ROUTE、BRANCH_ROUTE 和 LOCAL_ROUTE 中使用。


```opensips title="codec_exists_re usage"
...
codec_exists_re("sp[a-z]*");
...
```


#### codec_delete_re ( regexp )


该函数与 codec_delete 效果相同（不含
clock 参数），唯一区别是它接受 POSIX 正则表达式
作为参数。


该函数可在 REQUEST_ROUTE、ONREPLY_ROUTE、
FAILURE_ROUTE、BRANCH_ROUTE 和 LOCAL_ROUTE 中使用。


```opensips title="codec_delete_re usage"
...
codec_delete_re("PCMA|PCMU");
...
```


#### codec_delete_except_re ( regexp )


该函数删除除正则表达式所指定之外的所有编解码。


该函数可在 REQUEST_ROUTE、ONREPLY_ROUTE、
FAILURE_ROUTE、BRANCH_ROUTE 和 LOCAL_ROUTE 中使用。


```opensips title="codec_delete_except_re usage"
...
codec_delete_except_re("PCMA|PCMU");#将删除除 PCMA 和 PCMU 之外的所有编解码
...
```


#### codec_move_up_re ( regexp )


该函数与 codec_move_up 效果相同（不含
clock 参数），唯一区别是它接受 POSIX 正则表达式
作为参数。


该函数可在 REQUEST_ROUTE、ONREPLY_ROUTE、
FAILURE_ROUTE、BRANCH_ROUTE 和 LOCAL_ROUTE 中使用。


```opensips title="codec_move_up_re usage"
...
codec_move_up_re("sp[a-z]*");
...
```


#### codec_move_down_re ( regexp )


该函数与 codec_move_down 效果相同（不含
clock 参数），唯一区别是它接受 POSIX 正则表达式
作为参数。


该函数可在 REQUEST_ROUTE、ONREPLY_ROUTE、
FAILURE_ROUTE、BRANCH_ROUTE 和 LOCAL_ROUTE 中使用。


```opensips title="codec_move_down_re usage"
...
codec_move_down_re("sp[a-z]*");
...
```


```opensips title="codec_move_down usage"
...
/*
  本示例将把时钟为 8000 的 speex 编解码移到列表末尾，
  然后删除时钟为 8000 的 GSM，接着把所有
  speex 编解码移到列表前面。Speex/8000 将排在任何
  其他 speex 之后。
*/
codec_move_down("speex","8000");
codec_delete("GSM","8000");
codec_move_up("speex");
...
```


#### change_reply_status(code, reason)


拦截 SIP 应答（在任意 onreply_route 中），并在转发之前
修改其状态码和原因短语。


各参数的含义如下：


- *code (int)* - 状态码。
- *reason (string)* - 原因短语。


该函数可在 ONREPLY_ROUTE 中使用。


```opensips title="change_reply_status usage"
...
onreply_route {
    if ($rs == "603") {
        change_reply_status(404, "Not Found");
        exit;
    }
}
...
```


#### stream_exists(regexp[,regexp2])


该函数可用于验证 sdp 载荷中是否存在某个流。它会在所有 sdp 会话中
搜索该流。如果在任何位置找到，则返回 TRUE，否则返回 FALSE。


各参数的含义如下：


- *regexp* - 用于匹配流媒体名称的 POSIX
正则表达式。
- *regexp2* - 可选的 POSIX 正则
表达式，用于匹配流传输名称。


该函数可在 REQUEST_ROUTE、ONREPLY_ROUTE、
FAILURE_ROUTE、BRANCH_ROUTE 和 LOCAL_ROUTE 中使用。


```opensips title="stream_exists usage"
...
# 检查 FAX
stream_exists("image");
...
stream_exists("audio","SAVP");
...
```


#### stream_delete(regexp[,regexp2])


该函数可用于从 sdp 载荷中删除整个流。它会在所有 sdp 会话中
搜索该流。如果在任何位置找到，将连同所有属性一起删除。
如果发生了任何删除则返回 TRUE，否则返回 FALSE。


各参数的含义如下：


- *regexp* - 用于匹配流媒体名称的 POSIX
正则表达式。
- *regexp2* - 可选的 POSIX 正则
表达式，用于匹配流传输名称。


该函数可在 REQUEST_ROUTE、ONREPLY_ROUTE、
FAILURE_ROUTE、BRANCH_ROUTE 和 LOCAL_ROUTE 中使用。


```opensips title="stream_delete usage"
...
# 禁止使用视频
stream_delete("video");
...
```


#### list_hdr_has_option(hdr_name, option)


如果给定选项/token 列在给定头域的消息体中，则检查并返回 true。
该头域的消息体必须格式化为 token/选项 的 CSV 列表
（如 Supported、Require、Content-Disposition 头域）
的消息体格式


各参数的含义如下：


- *hdr_name (string)* - 要检查的头域名称。
注意该头域的所有实例都会被检查（如果该头域在 SIP 消息中
有多个实例）。支持任何类型的头域名称——RFC3261 标准、
RFC 扩展或自定义名称。
- *opt (string)* - 要搜索的选项/token。


如果该选项在某一头域实例中被找到，函数返回 true。如果未找到头域、
未找到该选项，或存在解析或运行时错误，则返回 false。
该函数可在 REQUEST_ROUTE、ONREPLY_ROUTE、
FAILURE_ROUTE、BRANCH_ROUTE 和 LOCAL_ROUTE 中使用。


```opensips title="list_hdr_has_option usage"
...
# 检查是否宣告了 100rel
if (list_hdr_has_option("Supported", "100rel"))
	xlog("100rel option found\n");
...
```


#### list_hdr_add_option(hdr_name, option)


在给定头域消息体中列表的末尾添加新的选项/token。该头域的消息体必须
格式化为 token/选项 的 CSV 列表（如 Supported、Require、
Content-Disposition 头域）的消息体格式


可以对同个头域执行多次添加/删除操作。


各参数的含义如下：


- *hdr_name (string)* - 要添加选项的头域名称。
如果该头域在 SIP 消息中存在多个实例，添加操作将在第一个
实例上执行。支持任何类型的头域名称——RFC3261 标准、
RFC 扩展或自定义名称。
- *opt (string)* - 要添加到 CSV 列表的
选项/token。注意不会验证重复项（即新添加的选项是否
已存在于该头域中）。


如果该选项成功添加到给定头域的列表中，函数返回 true。如果未找到头域，
或存在解析或运行时错误，则返回 false。
该函数可在 REQUEST_ROUTE、ONREPLY_ROUTE、
FAILURE_ROUTE、BRANCH_ROUTE 和 LOCAL_ROUTE 中使用。


```opensips title="list_hdr_add_option usage"
...
# 添加 100rel 用于宣告
if (!list_hdr_has_option("Supported", "100rel"))
    list_hdr_add_option("Supported", "100rel");
```


#### list_hdr_remove_option(hdr_name, option)


从给定头域消息体中的列表里删除选项/token。该头域的消息体必须
格式化为 token/选项 的 CSV 列表（如 Supported、Require、
Content-Disposition 头域）的消息体格式


可以对同个头域执行多次添加/删除操作。


各参数的含义如下：


- *hdr_name (string)* - 要从中删除选项的头域名称。
如果该选项在同一头域中重复出现，仅删除最后一个。如果该头域
在 SIP 消息中存在多个实例，删除操作将在所有实例上
执行。支持任何类型的头域名称——RFC3261 标准、
RFC 扩展或自定义名称。
- *opt (string)* - 要从 CSV 列表中删除的
选项/token。注意如果这是该头域中唯一的选项，
则整个头域将被删除。


如果该选项至少从一个头域实例中成功删除，函数返回 true。如果未找到头域、
未找到该 token，或存在解析或运行时错误，则返回 false。
该函数可在 REQUEST_ROUTE、ONREPLY_ROUTE、
FAILURE_ROUTE、BRANCH_ROUTE 和 LOCAL_ROUTE 中使用。


```opensips title="list_hdr_remove_option usage"
...
# 添加 100rel 用于宣告
if (list_hdr_has_option("Supported", "100rel"))
    list_hdr_remove_option("Supported", "100rel");
list_hdr_add_option("Supported", "optionX");
```


#### get_glob_headers_values(hdr_name_glob, hdr_names_avp,hdr_vals_avp)


用所有匹配 hdr_name_glob 模式的头域名称和值填充
hdr_names_avp 和 hdr_vals_avp 这两个 AVP。


各参数的含义如下：


- *hdr_name_glob (string)* - 用于匹配头域名称的 glob 模式
- *hdr_names_avp (var)* - 将被填充所有匹配 glob 模式的头域名称的 AVP
- *hdr_vals_avp (var)* - 将被填充所有与匹配 glob 模式的头域名称相对应的头域值的 AVP


如果找到至少 1 个匹配 glob 模式的头域，函数返回 true；如果未找到匹配项，
则返回 false。
该函数可在 REQUEST_ROUTE、ONREPLY_ROUTE、
FAILURE_ROUTE、BRANCH_ROUTE 和 LOCAL_ROUTE 中使用。


```opensips title="get_glob_headers_values usage"
...
       if (get_glob_headers_values("X-*",$avp(names),$avp(values))) {
           xlog("All X- names are $(avp(names)[*]) and X- vals are $(avp(values)[*])\n");
       }
...
```


#### sip_to_json(out_var)


返回当前 SIP 消息的 JSON 格式表示，包含 first_line、headers 和 body 三个 json 成员。
当你想把一条通用 SIP 消息传递给与 SIP 无关的实体，但仍希望在发送完整消息之前
提供某种 SIP 解析层时，这很有用。


各参数的含义如下：


- *out_var (string)* - 输出 JSON 格式 SIP 消息的变量


该函数可在 REQUEST_ROUTE、ONREPLY_ROUTE、
FAILURE_ROUTE、BRANCH_ROUTE 和 LOCAL_ROUTE 中使用。


```opensips title="sip_to_json usage"
...
       if (sip_to_json($var(out_sip_json))) {
           xlog("The JSON format for the current SIP message is $var(out_sip_json) \n");
       }
...
```


### 已知限制 {#known-limitations}


搜索函数作用于当前消息，因此对 sdp 所做的修改
对 codec_exists 系列函数是可见的（例如调用
codec_delete("speex") 之后，codec_exists("speex")
将返回 false）。
<!-- CONTRIBUTORS -->

### 许可 {#license}

所有文档文件（即 .md 扩展名）均按 Creative Common License 4.0 许可发布。
