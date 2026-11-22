---
title: "B2BUA"
description: "OpenSIPS 功能众多，但在媒体会话建立后的行为上它不过是一个代理，只把一侧的消息转交给另一侧；本教程介绍如何用 b2b_entities 与 b2b_logic 模块构建背靠背用户代理服务。"
---

> [!NOTE]
> 其他版本：[早于 OpenSIPS 3.2 的版本](https://docs.opensips.org/tutorials/b2bua-older-3-2/)、[OpenSIPS 1.6 版本](https://docs.opensips.org/tutorials/b2bua-1-6/)。

## 背靠背用户代理 {#back-to-back-user-agent}

### 概述 {#overview}

OpenSIPS 功能众多，但在媒体会话建立后的行为上，它不过是一个代理，即只把消息从一侧取出并转交给另一侧。然而，事实证明这不足以提供某些服务，而这些服务要求服务器能够感知会话状态、监控并控制会话。背靠背用户代理（Back-to-Back User Agent，B2BUA）正是这样一个实体：在 SIP 网络中能够控制或发起媒体会话。这一名称源自其行为特征 —— 实际上所需的是让 B2BUA 站在中间，与两个端点分别建立两个对话，而这两个端点最终将交换媒体。

OpenSIPS 中的 B2BUA 是对 RFC 3261 所定义的 B2BUA 行为的一种实现，它提供了在其之上构建特定服务的可能。它由两个模块组成：
* [b2b_entities](/zh/modules/b2b_entities) —— 下半部分，通过处理实际的网络消息交换，实现 UAC 与 UAS 的基本功能；
* [b2b_logic](/zh/modules/b2b_logic) —— 上半部分，向脚本和外部提供实现 B2BUA 服务逻辑所需的函数。

组成 OpenSIPS 中 B2BUA 的两个部分以「控制-通知」关系相互绑定。[b2b_logic](/zh/modules/b2b_logic) 模块通过发送命令并告知要发送哪些消息来控制 [b2b_entities](/zh/modules/b2b_entities)，而 [b2b_entities](/zh/modules/b2b_entities) 在为 B2B 正在处理的对话收到请求或应答时通知 [b2b_logic](/zh/modules/b2b_logic)。

#### B2B 实体 {#b2b-entities}
B2B 实体是 OpenSIPS 的内部记录，对应该 B2BUA 所参与的对话。更宽泛地说，我们用「实体」一词指代在这些对话中作为 OpenSIPS 对端用户代理的 SIP 实体。根据 OpenSIPS 在首个事务中的行为（作为 UAS 还是 UAC），我们有两类实体： 
* b2b 服务器实体，如果它是为收到的初始 INVITE 而创建；
* b2b 客户端实体，如果 OpenSIPS 需要自己通过发送初始消息来发起对话。

### 实现 B2BUA 服务 {#implementing-b2bua-services}

#### 发起 B2B 会话 {#initiating-b2b-sessions}
触发与所需 B2BUA 场景对应的新 B2B 会话有两种方式：
* 在收到初始 INVITE 时，从脚本中使用 [b2b_init_request](/zh/modules/b2b_logic#func_b2b_init_request) 函数；
* 当 OpenSIPS 需要从中间发起呼叫时，使用 [b2b_logic:trigger_scenario](/zh/modules/b2b_logic#mi_trigger_scenario) MI 命令。

需要连接的首批实体的初始细节，直接作为参数提供给 [b2b_logic:trigger_scenario](/zh/modules/b2b_logic#mi_trigger_scenario) MI 命令。对于 [b2b_init_request](/zh/modules/b2b_logic#func_b2b_init_request) 函数，B2B 实体记录必须事先通过 [b2b_server_new](/zh/modules/b2b_logic#func_b2b_server_new) 与 [b2b_client_new](/zh/modules/b2b_logic#func_b2b_client_new) 脚本函数创建。

#### 管理接口命令 {#management-interface-commands}

当前 OpenSIPS 版本对 B2B 模块使用带命名空间的 MI 命令。本教程用于从中间发起呼叫的命令是 [b2b_logic:trigger_scenario](/zh/modules/b2b_logic#mi_trigger_scenario)。其他 B2BUA MI 命令可用于桥接、检查与呼叫终止：

| 当前 MI 命令 | 模块 | 用途 |
| --- | --- | --- |
| [b2b_logic:trigger_scenario](/zh/modules/b2b_logic#mi_trigger_scenario) | [b2b_logic](/zh/modules/b2b_logic) | 通过 MI 启动新的 B2B 场景。 |
| [b2b_logic:bridge](/zh/modules/b2b_logic#mi_bridge) | [b2b_logic](/zh/modules/b2b_logic) | 将已有的 B2B 呼叫腿桥接到新的目的地。 |
| [b2b_logic:list](/zh/modules/b2b_logic#mi_list) | [b2b_logic](/zh/modules/b2b_logic) | 列出 B2B 逻辑会话。 |
| [b2b_logic:terminate_call](/zh/modules/b2b_logic#mi_terminate_call) | [b2b_logic](/zh/modules/b2b_logic) | 终止正在进行的 B2B 会话。 |
| [b2b_entities:list](/zh/modules/b2b_entities#mi_list) | [b2b_entities](/zh/modules/b2b_entities) | 列出 B2B 实体。 |

#### 旧版 MI 命令名 {#older-mi-command-names}

旧版 OpenSIPS 对相同的 B2BUA 操作使用扁平命名的 MI 命令。将旧示例适配到当前 OpenSIPS 版本时，请使用上表中的带命名空间命令：

| 当前 MI 命令 | 旧版 MI 命令 |
| --- | --- |
| `b2b_logic:trigger_scenario` | `b2b_trigger_scenario` |
| `b2b_logic:bridge` | `b2b_bridge` |
| `b2b_logic:list` | `b2b_list` |
| `b2b_logic:terminate_call` | `b2b_terminate_call` |
| `b2b_entities:list` | `b2be_list` |

此映射仅适用于 MI 命令；诸如 `b2b_bridge()` 之类的脚本函数保留其脚本函数名。

#### 专用脚本路由 {#dedicated-script-routes}
初始化 B2B 会话后，各呼叫腿将由 [b2b_logic](/zh/modules/b2b_logic) 模块处理，第一步是让两个初始实体建立联系。属于这些对话的请求与应答不会通过 OpenSIPS 的标准路由进入脚本，而是由 [b2b_logic](/zh/modules/b2b_logic) 专用路由处理，这些路由通过 [script_req_route](/zh/modules/b2b_logic#param_script_req_route) 与 [script_reply_route](/zh/modules/b2b_logic#param_script_reply_route) modparam 定义，或通过作为参数传给 [b2b_init_request](/zh/modules/b2b_logic#func_b2b_init_request) 函数的自定义路由定义。场景的后续步骤可以在这些路由中通过调用特定的 [b2b_logic](/zh/modules/b2b_logic) 脚本函数（例如 [b2b_bridge](/zh/modules/b2b_logic#func_b2b_bridge)）来实现各种操作。不应在 b2b_logic 路由中执行普通「类代理」的 OpenSIPS 函数。

有些消息会被模块自动处理，完全不会进入 b2b_logic 路由（在两个实体桥接过程中收到的 BYE 请求，针对已断开实体的 ACK/BYE/应答）。此外，如果没有定义专用的 b2b_logic 应答路由，应答将由模块内部处理，其效果等同于在这样的路由中调用 [b2b_handle_reply](/zh/modules/b2b_logic#func_b2b_handle_reply) 函数（假如该路由已定义）。

下面的示例使用 [b2b_pass_request](/zh/modules/b2b_logic#func_b2b_pass_request)、[b2b_send_reply](/zh/modules/b2b_logic#func_b2b_send_reply)、[b2b_delete_entity](/zh/modules/b2b_logic#func_b2b_delete_entity) 与 [b2b_end_dlg_leg](/zh/modules/b2b_logic#func_b2b_end_dlg_leg) 执行 B2B 路由操作。

### 场景示例 {#scenario-examples}
#### 拓扑隐藏 {#topology-hiding}
此用例无需定义任何场景文档。这是一个内置机制，只需向 B2B Logic 指定名称 "top hiding" 即可请求使用。
该功能是一个简单的透传：在另一侧创建新对话，并把一侧收到的所有消息转发到另一侧，只注意修改对话信息。
##### 场景示意 {#scenario-schema}
以下是预期的理论消息流程：

![top hiding schema](/public/uploads/top_hiding_schema.jpeg)

#### 预付费 {#prepaid}
此场景可供公司用于预付费用户：在通话开始时向其播报余额，在通话结束时向其播报剩余余额。 

会话层面必须发生的是：

* 主叫连接到媒体服务器
* 主叫连接到被叫
* 如果被叫先于主叫挂机，主叫连接到媒体服务器（同一台或其他）。
##### 场景示意 {#scenario-schema-1}
为建立这些会话，SIP 消息流程应如下所示（此处假定使用同一台媒体服务器）：

![ppaid](/public/uploads/ppaid.jpeg)

##### 场景文档 {#scenario-document}
实现该场景的 OpenSIPS 配置的相关部分如下所示：
```opensips

modparam("b2b_logic", "script_req_route", "b2b_logic_request")

route {
    ...
    if (is_method("INVITE") && !has_totag()) {
        # 选择一个初始状态并保存到上下文
        $b2b_logic.ctx(state) = "1";
        # 将原始目的地保存到上下文
        $b2b_logic.ctx(callee_uri) = $tu;

        # 创建服务器实体
        b2b_server_new("caller");
        # 创建初始客户端实体，用于把主叫连接到媒体服务器
        b2b_client_new("media", "sip:808@opensips.org");

        # 为 "prepaid" 场景初始化 B2B 会话
        b2b_init_request("prepaid");
        exit;
    }
    ...
}

route[b2b_logic_request] {
    if ($rm != "BYE") {
        # 对于 BYE 以外的请求，无需执行特殊操作，
        # 只需把请求转交给对端
        b2b_pass_request();
        exit;
    }

    if ($b2b_logic.ctx(state) == "1" && $b2b_logic.entity(id) == "media") {
        # 如果处于初始状态（主叫已连接到媒体服务器）
        # 且该 BYE 来自媒体服务器，则把主叫与被叫连接起来

        # 结束与媒体服务器的对话
        b2b_send_reply(200, "OK");
        b2b_delete_entity();

        # 创建与被叫对应的客户端实体
        b2b_client_new("callee", $b2b_logic.ctx(callee_uri));

        # 触发桥接动作
        b2b_bridge("caller", "callee");

        # 将下一个状态保存到上下文
        $b2b_logic.ctx(state) = "2";
    } else if ($b2b_logic.ctx(state) == "2" && $b2b_logic.entity(id) == "callee") {
        # 如果处于第二个状态（主叫已与被叫连接）
        # 且被叫先挂机，则再次把主叫连接到媒体服务器

        # 结束与被叫的对话
        b2b_send_reply(200, "OK");
        b2b_delete_entity();

        # 创建一个与媒体服务器对应的新客户端实体
        b2b_client_new("media_end", "sip:808@opensips.org");

        # 触发桥接动作
        b2b_bridge("caller", "media_end");

        # 将下一个状态保存到上下文
        $b2b_logic.ctx(state) = "3";
    } else {
        # 普通 BYE 请求，无需特殊场景动作，
        # 只需把请求转交给对端
        b2b_pass_request();
    }
}

```

#### 营销 {#marketing}
最后一个测试场景被称为「营销」，因为它非常契合通过电话开展营销活动的需求。公司可能会选择一批潜在客户进行呼叫，向其介绍新产品/优惠/折扣。消息是录音播放的，但客户同时会被提供与人工坐席通话的机会。如果客户在录音消息结束前没有挂机，就会被连接到人工坐席。这也是筛选有意向客户、以更少资源提高流程效率的好办法。 

OpenSIPS B2BUA 必须连接两个端点，从中间发起呼叫。这与其他示例不同，因为呼叫由 B2BUA 发起，并由 MI 命令触发。

##### 场景示意 {#scenario-schema-2}
以下是实现该功能时应当发生的理论消息流程。

![marketing](/public/uploads/marketing.jpeg)

##### 场景文档 {#scenario-document-1}
实现该场景的 OpenSIPS 配置的相关部分如下所示：

```opensips

modparam("b2b_logic", "script_req_route", "b2b_logic_request")

route[b2b_logic_request] {
    if ($rm != "BYE") {
        # 对于 BYE 以外的请求，无需执行特殊操作，
        # 只需把请求转交给对端
        b2b_pass_request();
        exit;
    }

    if ($b2b_logic.ctx(state) != "2" && $b2b_logic.entity(id) == "media") {
        # 如果处于初始状态（客户已连接到媒体服务器）
        # 且该 BYE 来自媒体服务器，则把客户与坐席连接起来

         # 结束与媒体服务器的对话
        b2b_send_reply(200, "OK");
        b2b_delete_entity();

        # 创建与坐席对应的客户端实体，
        # 从上下文中取出目的地的 URI
        b2b_client_new("operator", $b2b_logic.ctx(operator_uri));

        # 触发桥接动作
        b2b_bridge("customer", "operator");

        # 将下一个状态保存到上下文
        $b2b_logic.ctx(state) = "2";
    }  else {
        # 普通 BYE 请求，无需特殊场景动作，
        # 只需把请求转交给对端
        b2b_pass_request();
    }
}

```

MI 命令示例：

```bash

opensips-cli -x mi b2b_logic:trigger_scenario marketing customer,sip:bob@opensips.org media,sip:808@opensips.org:5070 operator_uri=sip:alice@opensips.org

```

#### REFER 场景 {#refer-scenario}

B2BUA 组件还可以配置为处理盲转（通过 REFER SIP 消息）。当平台中存在不接受 REFER 方法的设备时，这很有用。该场景非常简单，只有一条在收到 REFER 时生效的规则。该规则告知 B2BUA 结束与发送 REFER 消息的用户代理之间的呼叫，并将对端与 'Refer-To' 头域中指定的用户进行桥接。
##### 场景文档 {#scenario-document-2}
实现该场景的 OpenSIPS 配置的相关部分如下所示：
```opensips

modparam("b2b_logic", "script_req_route", "b2b_logic_request")

route {
    ...
    if (is_method("INVITE") && !has_totag()) {
        # 创建服务器实体
        b2b_server_new("caller");
        # 创建初始客户端实体，用于把主叫与被叫连接起来
        b2b_client_new("callee", $ru);

        # 为 "refer" 场景初始化 B2B 会话
        b2b_init_request("refer");
        exit;
    }
    ...
}

route[b2b_logic_request] {
    if ($rm != "REFER") {
        # 对于 REFER 以外的请求，无需执行特殊操作，
        # 只需把请求转交给对端
        b2b_pass_request();
        exit;
    }

    # 结束与转交方的对话
    b2b_send_reply(202, "Accepted");
    b2b_end_dlg_leg();

    # 创建与 'Refer-To' 头域中
    # 所指定用户对应的客户端实体
    b2b_client_new("referee", $hdr(Refer-To));

    # 将转交方的对端与被转交方桥接
    b2b_bridge("peer", "referee");
}

```
