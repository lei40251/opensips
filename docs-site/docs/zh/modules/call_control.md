---
title: "call_control 模块"
description: "本模块可用于限制呼叫时长，并在呼叫超出所设限制时自动结束呼叫。"
sidebar: false
---


## 管理指南 {#admin-guide}


### 概述 {#overview}


本模块可用于限制呼叫时长，并在其超出所设限制时自动结束呼叫。其主要用例是实现预付费系统，但也可用于对代理所处理的所有呼叫施加全局限制。


### 描述 {#description}


callcontrol 由 3 个组件构成：


- OpenSIPS call_control 模块
- 一个名为 callcontrol 的外部应用程序，它跟踪带有时长限制的呼叫，并在其超出限制时自动结束这些呼叫。该应用接收来自 OpenSIPS 的请求，并向计费引擎（见下）发出请求，以判断某个呼叫是否需要限制。当呼叫结束（或被结束）时，它还会指示计费引擎从主叫的余额中扣除已消费的金额。callcontrol 应用可从 http://callcontrol.ag-projects.com/ 获取
- 一个计费引擎，用于根据主叫的信用额度与目标号码价格计算时长限制，并在呼叫结束后扣除主叫余额。它作为 CDRTool 的一部分提供，见 http://cdrtool.ag-projects.com/


callcontrol 应用与 OpenSIPS 运行在同一台机器上，二者通过文件系统套接字通信；而计费引擎可运行在不同主机上，通过 TCP 连接与 callcontrol 应用通信。


对于每个需要施加限制的呼叫，在其初始 INVITE 上调用 call_control() 函数即可触发 callcontrol。这最终会成为向 callcontrol 应用发出的一个请求，该应用会向计费引擎查询针对给定主叫与目标号码的时长限制。计费引擎将判断该目标号码是否关联了费用、主叫是否有信用额度，若有则返回其被允许呼叫该目标号码的时长；否则将表明该呼叫没有关联限制。如果存在限制，callcontrol 应用会保留该会话并为其附加一个定时器，该定时器在给定时长后到期，从而回调 OpenSIPS 请求结束该对话。如果计费引擎返回该呼叫没有限制，则 callcontrol 应用会丢弃该会话并允许其不受限制地继续。随后会向 call_control 模块返回一个适当的应答，该应答由 call_control() 函数调用返回，使脚本能够基于该结果做出决策。


### 特性 {#features}


- 极为简单的 API，仅由一个函数组成，只需在每个呼叫的第一个 INVITE 上调用一次。其余工作通过对话回调在后台自动完成。
- 当对话超出其时长时，通过向 dialog 模块触发 dlg_end_dlg 请求来优雅地结束对话，这会向每个端点生成两个 BYE 消息，从而干净地结束呼叫。
- 允许并行会话，每个用户使用一个余额
- 与 mediaproxy 检测呼叫发送媒体超时并被关闭的能力集成。在这种情况下，由 mediaproxy 触发的 dlg_end_dlg 会在 callcontrol 会话达到限制之前将其结束，避免为一个已经中断、实际并未发生的呼叫消耗全部信用额度。为此必须使用 mediaproxy，且必须通过 engage_media_proxy() 启动，才能跟踪呼叫的对话并在超时时将其结束。
- 即使 mediaproxy 因未通过 engage_media_proxy() 启动而无法结束对话，callcontrol 应用仍能通过查看 RADIUS 计费记录中由 mediaproxy 为超时呼叫记录的条目，检测出发送媒体超时的呼叫。这些呼叫同样会由 callcontrol 应用自身优雅地结束。
- 如果定义了 prepaid_account_flag 模块参数，外部应用会比较 OpenSIPS 与计费引擎关于主叫账户是否为预付费的观点，并在二者冲突时采取适当措施。这在计费引擎故障或数据库存在不一致的情况下提供了防欺诈保护。
- 如果 call_limit_avp 被定义为大于 0 的值，它将被传递给 CallControl 应用，由其限制计费方（From 用户或转接方）能够发起的并发呼叫数量。若达到该限制，call_control 函数将返回特定的错误值。
- call_token_avp 可用于检测具有重复 CallID 的呼叫，此类呼叫可能在计费引擎中造成潜在问题。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


在加载本模块之前，必须先加载以下模块：


- *dialog* 模块


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，必须安装以下库或应用程序：


- *无*。


### 导出的参数 {#exported-parameters}


#### disable (int)


布尔标志位，用于指定是否应禁用 callcontrol。当希望在两个不同的上下文中使用同一份 OpenSIPS 配置（一个使用 callcontrol，另一个不使用）时，这很有用。在 callcontrol 被禁用的情况下，对 call_control() 函数的调用将返回一个表示该呼叫没有关联限制的代码，从而允许在不做任何修改的情况下使用同一份配置。


*默认值为 "0"。*


```opensips title="Setting the disable parameter"
...
modparam("call_control", "disable", 1)
...
        
```


#### socket_name (string)


指向 callcontrol 应用监听来自本模块命令的文件系统套接字的路径。


*默认值为 
"/run/callcontrol/socket"。*


```opensips title="Setting the socket_name parameter"
...
modparam("call_control", "socket_name", "/run/callcontrol/socket")
...
        
```


#### socket_timeout (int)


等待 callcontrol 应用应答的时长（毫秒）。


*默认值为 "500"（毫秒）。*


```opensips title="Setting the socket_timeout parameter"
...
modparam("call_control", "socket_timeout", 500)
...
        
```


#### signaling_ip_avp (string)


用于存放 SIP 信令来源 IP 地址的 AVP 的指定。如果设置了该 AVP，将使用它来获取信令 IP 地址；否则将使用接收 SIP 消息的源 IP 地址。该 AVP 适用于以下情况：呼叫建立路径上存在多个代理，而实际启动 callcontrol 的代理并非直接从 UA 接收 SIP 消息，因而无法确定信令来源的 NAT IP 地址。在这种情况下，在第一个代理上附加一个 SIP 头域，然后将该头域的值复制到启动 callcontrol 的代理上的 signaling_ip_avp，即可使其获得信令来源的正确 NAT IP 地址。


它由计费引擎使用，计费引擎依据主叫的 SIP URI、主叫的 SIP 域或主叫的 IP 地址来查找适用于该呼叫的费率（按此顺序，先返回费率者优先）。


*默认值为 "$avp(cc_signaling_ip)"。*


```opensips title="Setting the signaling_ip_avp parameter"
...
modparam("call_control", "signaling_ip_avp", "$avp(cc_signaling_ip)")
...
        
```


#### canonical_uri_avp (string)


用于存放可选的、由应用定义的规范请求 URI 的 AVP 的指定。设置后，它将在计算呼叫价格时被用作目标，否则将使用请求 URI。当 ruri 中的用户名在计费引擎计算中需要采用与 ruri 中不同的规范形式时，这很有用。


*默认值为 "$avp(cc_can_uri)"。*


```opensips title="Setting the canonical_uri_avp parameter"
...
modparam("call_control", "canonical_uri_avp", "$avp(cc_can_uri)")
...
        
```


#### diverter_avp (string)


用于存放可选的、由应用定义的转接方 SIP URI 的 AVP 的指定。设置后，计费引擎在查找适用于给定呼叫的费率时将其用作计费方；否则将使用从 From 头域中取得的主叫 URI。设置时，该 AVP 应包含形如 "user@domain" 的值（不应使用 sip: 前缀）。


当目标号码转接呼叫、从而成为新的主叫时，这很有用。此时计费方是转接方，该 AVP 应设置为它，以便计费引擎为该呼叫选取正确的费率。例如，若 A 呼叫 B，而 B 将其所有呼叫无条件转接至 C，则 diverter AVP 应设置为 B 的 URI，因为在呼叫被转接后，B 才是该呼叫的计费方而非 A。


*默认值为 "$avp(diverter)"。*


```opensips title="Setting the diverter_avp parameter"
...
modparam("call_control", "diverter_avp", "$avp(diverter)")

route {
  ...
  # alice@example.com 为该呼叫付费
  $avp(diverter) = "alice@example.com";
  ...
}
...
        
```


#### prepaid_account_flag (string)


用于指定发起呼叫的账户是预付费还是后付费的标志位。将其设置为非空值将决定模块把该标志位的值传递给外部应用。这将使外部应用能够比较 OpenSIPS 与计费引擎关于主叫账户是否为预付费的观点，并在二者冲突时采取适当措施。该标志位应在 OpenSIPS 配置中为预付费账户设置、为后付费账户重置。


*默认值为 NULL（未定义）。*


```opensips title="Setting the prepaid_account_flag parameter"
...
modparam("call_control", "prepaid_account_flag", "PP_ACC_FLAG")
...
        
```


#### call_limit_avp (string)


用于存放可选的、由应用定义的呼叫限制的 AVP 的指定。设置后，它将被传递给 CallControl 应用，若达到该限制，call_control 函数将返回错误码 -4。


*默认值为 "$avp(cc_call_limit)"。*


```opensips title="Setting the call_limit_avp parameter"
...
modparam("call_control", "call_limit_avp", "$avp(cc_call_limit)")
...
        
```


#### call_token_avp (string)


用于存放可选的、由应用定义的令牌的 AVP 的指定。该令牌用于检查具有相同 CallID 的两个呼叫是否确实指向同一个呼叫。如果对同一个呼叫（即相同 CallID）多次调用 call_control()，则令牌必须相同，否则 call_control 将返回 -3 错误，表示 CallID 重复。


*默认值为 "$avp(cc_call_token)"。*


```opensips title="Setting the call_token_avp parameter"
...
modparam("call_control", "call_token_avp", "$avp(cc_call_token)")
...
$avp(cc_call_token) := $RANDOM;
...
        
```


#### init (string)


该参数用于描述自定义的呼叫控制初始化消息。它表示一组键值对，格式如下：


- "string1 = var1 [string2 = var2]*"


赋值的左侧可以是任意字符串。


赋值的右侧必须是脚本伪变量或脚本 AVP。有关它们的更多信息，参见 [CookBooks - Scripting Variables](https://docs.opensips.org/manual/3-6/script-corevar/)。


如果未设置该参数，则发送默认的初始化消息。


*默认值为 "NULL"。*


```opensips title="Setting the init parameter"
	
...
modparam("call_control", "init", "call-id=$ci to=$tu from=$fu 
			authruri=$du another_field = $avp(10)")
...
        
```


#### start (string)


该参数用于描述自定义的呼叫控制启动消息。它表示一组键值对，格式如下：


- "string1 = var1 [string2 = var2]*"


赋值的左侧可以是任意字符串。


赋值的右侧必须是脚本伪变量或脚本 AVP。有关它们的更多信息，参见 [CookBooks - Scripting Variables](https://docs.opensips.org/manual/3-6/script-corevar/)。


如果未设置该参数，则发送默认的启动消息。


*默认值为 "NULL"。*


```opensips title="Setting the start parameter"
	
...
modparam("call_control", "start", "call-id=$ci to=$tu from=$fu 
			authruri=$du another_field = $avp(10)")
...
        
```


#### stop (string)


该参数用于描述自定义的呼叫控制停止消息。它表示一组键值对，格式如下：


- "string1 = var1 [string2 = var2]*"


赋值的左侧可以是任意字符串。


赋值的右侧必须是脚本伪变量或脚本 AVP。有关它们的更多信息，参见 [CookBooks - Scripting Variables](https://docs.opensips.org/manual/3-6/script-corevar/)。


如果未设置该参数，则发送默认的停止消息。


*默认值为 "NULL"。*


```opensips title="Setting the stop parameter"
	
...
modparam("call_control", "stop", "call-id=$ci to=$tu from=$fu 
			authruri=$du another_field = $avp(10)")
...
        
```


### 导出的函数 {#exported-functions}


#### call_control()


为由调用该函数时所在 INVITE 所启动的对话触发 callcontrol 的使用（该函数只应在呼叫的第一个 INVITE 上调用）。后续的对话内请求将通过内部绑定到对话状态机自动处理，使 callcontrol 能够随着对话的推进更新其内部状态，无需脚本再做任何其他干预。


该函数应在消息通过 t_relay() 发出之前调用，此时所有请求 URI 修改均已完成，且最终目标已经确定。


该函数具有以下返回码：


- +2 - 呼叫无限制
- +1 - 呼叫有限制，且由 callcontrol 跟踪
- -1 - 信用额度不足，无法发起呼叫
- -2 - 呼叫被另一个进行中的呼叫锁定
- -3 - CallID 重复
- -4 - 已达到呼叫数量限制
- -5 - 内部错误（消息解析、通信……）


该函数可在 REQUEST_ROUTE 中使用。


```opensips title="Using the call_control function"
...
if ($avp(805) != NULL) {
    # 已设置转接方 AVP，将其用作计费方
    $avp(billing_party_domain) = $(avp(805){uri.domain});
} else {
    $avp(billing_party_domain) = $fd;
}

if (is_method("INVITE") && !has_totag() &&
    is_domain_local($avp(billing_party_domain))) {
    call_control();
    switch ($retcode) {
    case 2:
        # 呼叫无限制
    case 1:
        # 呼叫有限制，且由 callcontrol 管理
        break;
    case -1:
        # 信用额度不足（预付费呼叫）
        sl_send_reply(402, "Not enough credit");
        exit;
        break;
    case -2:
        # 被另一个进行中的呼叫锁定（预付费呼叫）
        sl_send_reply(403, "Call locked by another call in progress");
        exit;
        break;
    case -3:
        # CallID 重复
        sl_send_reply(400, "Duplicated callid");
        exit;
        break;
    case -4:
        # 已达到呼叫数量限制
        sl_send_reply(503, "Too many concurrent calls");
        exit;
        break;
    default:
        # 内部错误（消息解析、通信……）
        if (PREPAID_ACCOUNT) {
            xlog("Call control: internal server error\n");
            sl_send_reply(500, "Internal server error");
            exit;
        } else {
            xlog("L_WARN", "Cannot set time limit for postpaid call\n");
        }
    }
}
t_relay();
...
        
```
<!-- CONTRIBUTORS -->

### 许可证 {#license}

所有文档文件（即 .md 扩展名）均按 Creative Common License 4.0 授权。
