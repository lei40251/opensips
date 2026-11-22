---
title: "事件（基于）路由模块 (event_routing)"
description: "事件（基于）路由模块，简称 EBR 模块，提供一种机制，使脚本中不同的 SIP 处理能够通过 OpenSIPS 事件相互通信与同步。"
---


## 管理员指南 {#admin-guide}


### 概述 {#overview}


事件（基于）路由模块，简称 EBR 模块，提供了一种机制，使不同的 SIP 处理（脚本中的消息处理）能够通过 OpenSIPS 事件相互通信与同步
（参见[事件接口](/zh/manual/Interface-Events)）。


该机制基于 Subscribe-Notify 概念。任何 SIP 处理都可以订阅各种 OpenSIPS 事件。事件触发时，
订阅者将收到通知，从而能够使用附加在事件上的数据。需注意，事件的触发可能发生在
完全不同的 SIP 处理上下文中，与订阅者所在的处理毫无关系。


此外，事件既可以由 OpenSIPS 内部生成（预定义事件），也可以由脚本层面生成（自定义事件）。
关于事件如何生成的更多信息，请参考
[事件接口](/zh/manual/Interface-Events)文档。


根据订阅方处理如何处理通知，可分为两种主要场景：


- 订阅方以异步方式等待接收通知；
订阅方的处理会挂起，收到通知（或发生超时）后被完全恢复。
- 订阅方在订阅后继续处理，不作任何等待。每当收到通知，
就会执行一个脚本路由（由该订阅装备）。需注意，该通知路由
在原处理的任何上下文之外执行（该路由中不继承任何内容）。
触发通知的事件通过 AVP 变量在该通知路由中暴露。


因此，EBR 可以让你的 SIP 处理相互同步或交换信息，即使这些处理
在 SIP、时间或处理方式上完全无关。


借助 EBR 支持，现在可以实现更高级的路由场景，
即需要按类型和时间把不同的处理组合起来处理的场景，例如把各种呼叫的处理
与注册处理或 DTMF 提取结合起来。更多内容参见
[示例](#usage-examples)一节。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


本模块需要以下模块：


- *TM* - 事务模块


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，必须先安装以下库或应用程序：


- *无*。


### 导出的参数 {#exported-parameters}


本模块不提供任何脚本参数。


### 导出的函数 {#exported-functions}


#### notify_on_event(event, filter, route, timeout)


该函数为指定的事件创建订阅。可以使用过滤器（作用于事件的属性上），
以进一步筛选所需通知（只有匹配该过滤器的
事件才会通知给该订阅者）。


事件通知到达时，将执行指定的脚本路由（通常称为
通知路由）。订阅者处理中的任何变量、SIP 消息、SIP
事务/对话或其他上下文，都不会被继承到该通知路由中。


事件属性将通过 AVP 变量在该通知路由中暴露，形式为
*$avp(attr_name) = attr_value*。


作为例外，EBR 模块会在通知路由中提供订阅者上下文中的事务 ID。
需注意，这不是事务本身，而是其 ID。有些 TM
函数（如 *t_inject_branches*）可以基于事务 ID 对事务
进行操作。当然，需要在调用
*notify_on_event()* 函数之前，在订阅者处理中先创建事务。


该函数可在 REQUEST_ROUTE 中使用。


参数：


- *event* (string) - 要订阅的事件名称
- *filter* (var) - 一个 AVP 变量，以多值
数组形式保存要应用于该事件（通知之前）的全部过滤器。
过滤器取值格式为 "key=value"，
其中 "key" 必须与事件的某个属性名匹配。
"value" 是该属性期望的取值；可以是 shell
通配符模式。例如："aor=bob@*"
- *route* (string) - 收到事件通知时要执行的
脚本路由名称
- *timeout* (int) - 订阅在到期前保持有效的时长
（整数，单位秒）。注意：在其生命周期内，
一个订阅可能被通知若干次，也可能一次都没有。


```opensips title="notify_on_event() 用法"
...
$avp(filter) = "aor=*@opensips.org"
notify_on_event("E_UL_AOR_INSERT",$avp(filter),"reg_done",60);
...
route[reg_done] {
	xlog("a new user $avp(aor) registered with opensips.org domain\n");
}
```


### 导出的异步函数 {#exported-asynchronous-functions}


#### wait_for_event(event,filter,timeout)


与 *notify_on_event* 类似，该函数为指定的事件和过滤器
创建一个事件订阅者。但该函数会以异步方式（挂起与恢复）
等待接收所需事件的通知。


参数含义与 *notify_on_event* 相同。


```opensips title="wait_for_event 用法"
...
# 等待被叫注册
$avp(filter) = "aor="+$rU+"@"+$rd
async( wait_for_event("E_UL_AOR_INSERT",$avp(filter), 40),  resume_call);
# 完成
...
route[resume_call] {
	xlog("user $avp(aor) is now registered\n");
	lookup("location");
	t_relay();
}
```


### 用法示例 {#usage-examples}


#### 推送通知 {#push-notification}


我们使用 *notify_on_event* 捕获被叫新联系人注册的事件。
一旦呼叫发往被叫，就根据通知（关于新联系人）
把新注册的联系人作为新分支注入正在进行的事务中。


流程示意：当我们向某用户发送呼叫时，就订阅该用户新注册的
任何联系人。收到此类通知时，
就把新联系人作为新分支加入发往该用户的
正在进行的事务（振铃中）。


```opensips title="推送通知脚本"
...
route[route_to_user] {

    # 为分支注入准备事务；必须在订阅之前
    # 创建事务，否则 EBR 模块不会把事务 ID 传入
    # 通知路由
    t_newtran();

    # 保持事务存活（即使所有分支都将终止），
    # 直到 FR INVITE 定时器到期（我们希望等待
    # 可能新注册的联系人）
    t_wait_for_new_branches();

    # 订阅新联系人注册事件，
    # 但仅针对我们的被叫
    $avp(filter) = "aor="+$rU;
    notify_on_event("E_UL_CONTACT_INSERT",$avp(filter),
        "fork_call", 20);

    # 获取已注册的联系人，若有则中继
    if (lookup("location"))
        route(relay);
    # 如果没有可用联系人（即目前尚未创建任何分支），
    # 由于使用了 t_wait_for_new_branches() 函数，
    # 已创建的事务仍将等待新分支

    exit;
}

route[fork_call]
{
    xlog("user $avp(aor) registered a new "
        "contact $avp(uri), injecting\n");
    # 取出 E_UL_CONTACT_INSERT 事件所描述的联系人，
    # 并把它作为新分支注入原始事务
    t_inject_branches("event");
}
...
```


#### 呼叫代答 {#call-pickup}


场景是 Alice 呼叫 Bob，Bob 未接听，Charlie
执行呼叫代答（把 Alice 的呼叫接过来）。


我们使用 *notify_on_event* 把两个呼叫关联起来：
Alice 到 Bob 的呼叫，以及 Charlie 到代答服务的呼叫。


流程示意：当我们把呼叫发往某个代答组内的用户时，
就订阅是否有任何发往代答服务的呼叫（来自
同一代答组的其他成员）。当出现发往
代答服务的呼叫时，我们从脚本触发一个事件——该事件会被
通知给第一个呼叫，于是我们取消发往 Bob 的分支，
并注入呼叫代答组的用户（Charlie）所注册的联系人。


```opensips title="呼叫代答脚本"
...
route[handle_call]
    if ($rU=="33") {
        ## 这是发往代答服务的呼叫
        ## （Charlie 拨打 33）

        # 拒绝呼入呼叫，因为我们将基于原始呼叫
        # （Alice 到 Bob）生成一个回呼
        t_newtran();
        send_reply(480, "Gone");

        # 触发代答自定义事件，
        # 代答组为 1，代答者是 Charlie（主叫）
        $avp(attr-name) = "group";
        $avp(attr-val) = "1";
        $avp(attr-name) = "picker";
        $avp(attr-val) = $fu;
        raise_event("E_CALL_PICKUP", $avp(attr-name), $avp(attr-val));

        exit;
    } else {

        ## 这是发往订阅者的呼叫
        ## （Alice 呼叫 Bob）

        # 应用用户位置
        if (!lookup("location", "method-filtering")) {
            send_reply(404, "Not Found");
            exit;
        }

        # 为分支注入准备事务；必须在订阅之前
        # 创建事务，否则 EBR 模块不会把事务 ID 传入
        # 通知路由
        t_newtran();

        # 订阅呼叫代答事件，但仅针对我们的组
        $avp(filter) = "group=1";
        notify_on_event("E_CALL_PICKUP",$avp(filter),
            "handle_pickup", 20);

        t_relay();
    }
    exit;
}

route[handle_pickup]
{
    xlog("call picked by $avp(picker), fetching its contacts\n");
    if (lookup("location","", $avp(picker))) {
        # 取出 lookup() 返回的联系人（针对 Charlie），
        # 注入原始呼叫，同时取消任何现存正在进行的
        # 分支（发往 Bob 的振铃）
        t_inject_branches("msg","cancel");
    }
}
```


## 开发者指南 {#developer-guide}


本模块不导出任何内部 API。


## 常见问题 {#frequently-asked-questions}


**问：在哪里可以找到更多关于 OpenSIPS 的信息？**


请访问 [https://opensips.org/](https://opensips.org/)。


**问：可以在哪里提出关于本模块的问题？**


首先请确认你的问题是否已在我们的某个邮件列表中得到了解答：


有关任何稳定版 OpenSIPS 发布的邮件应发送至
users@lists.opensips.org，有关开发版本的邮件应发送至 devel@lists.opensips.org。

如果你想保持邮件私密，请发送至
users@lists.opensips.org。


**问：如何报告缺陷？**


请遵循以下地址提供的指南：
[https://github.com/OpenSIPS/opensips/issues](https://github.com/OpenSIPS/opensips/issues).
<!-- CONTRIBUTORS -->

### 许可 {#license}

本项目的所有文档文件（即 .md 扩展名的文件）均以 Creative Common License 4.0 授权。
