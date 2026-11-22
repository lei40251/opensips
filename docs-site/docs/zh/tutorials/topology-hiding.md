---
title: "拓扑隐藏"
description: "理解 topology_hiding 模块的工作原理，以及应当如何正确使用它。"
---

# 拓扑隐藏 {#topology-hiding}

参见模块：[Topology Hiding](https://docs.opensips.org/manual/devel/modules/topology_hiding)

## 教程概述 {#tutorial-overview}

本教程旨在帮助你理解 topology_hiding 模块的工作方式，以及应当如何使用它。

拓扑隐藏通常被用作增强 SIP 网络安全的一种手段。因为在常规 SIP 流量中，关键的 IP 地址数据会被转发到其他网络，于是令人担忧的是，第三方可能利用这些信息，把攻击引向你内部的 SIP 网络。

## 当前特性 {#current-features}

默认情况下，模块启用后会隐藏 VIA、Record-Route、Route 和 Contact 头域。在把消息从一侧路由到另一侧时，VIA、Record-Route 和 Route 头域会被完全删除，而 Contact 头域会被改写为指向出向接口的 IP。

模块还可选地在出方向隐藏 Call-ID，因为 Call-ID 常常包含流量发起方的 IP。

此外，topology_hiding 模块可以借助 Contact 头域各部分在两侧之间的传递来简化集成。Contact 用户名可以被传递（例如，当你向 LRN 服务器查询、又不希望向服务提供商披露完整拓扑时很有用）。同时还可以传递各种 Contact 头域参数，以支持依赖这些参数的端到端特性。

关于所有可用参数与函数，请参阅[完整的模块 README](/zh/modules/topology_hiding)。

## 工作原理 {#how-it-works}

该模块可以在 dialog 与 TM 模块之上工作，也可以仅依托 TM 模块工作。

当严格依托 TM 模块运行时，与初始请求相比，经过拓扑隐藏的 SIP 消息会更大（因为 OpenSIPS 会把所有必需的信息编码进 Contact 头域的一个参数中），但支持所有类型的 SIP 请求与对话（INVITE 对话、呈现对话、SIP MESSAGE 等）。

当依托 DIALOG 模块运行时，消息会更短（所有被移除的头域都保存在 dialog 模块内部），但只能对基于 INVITE 的对话进行隐藏。

## 示例脚本 {#example-script}

```opensips
loadmodule "topology_hiding.so"

route {

    ....
    ....
    ....

    if (has_totag()) {

        # 处理逐跳 ACK（无需路由）
        if ( is_method("ACK") && t_check_trans() ) {
            t_relay();
            exit;
        }

        if (!topology_hiding_match()) {
            send_reply(404,"Not here");
            exit;
        }

        xlog("Succesfully matched this request to a topology hiding dialog. \n");
        xlog("Calller side callid is $ci \n");
        xlog("Callee side callid  is $TH_callee_callid \n");
        t_relay();
        exit;
        
    }

    ....
    ....
    ....

    # 如果是 INVITE 对话
    if (is_method("INVITE")) {

        # 现在可以创建对话
        create_dialog();
        
        # 执行拓扑隐藏，保留 Contact 用户名，同时隐藏 Call-ID
        topology_hiding("UC");
    }
    
    ...
    
    t_relay();
    exit;
}
```
