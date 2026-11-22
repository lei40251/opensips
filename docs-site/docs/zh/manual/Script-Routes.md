---
title: "路由类型"
description: "请求路由块。它包含针对 SIP 请求要执行的一组动作。"
---

**OpenSIPS** 路由逻辑使用多种类型的路由。每种类型的路由由某个事件触发，并允许你处理某种类型的消息（请求或应答）。

---

## route

请求路由块。它包含针对 SIP 请求要执行的一组动作。

**触发条件**：从网络收到外部请求。

**处理对象**：触发该路由的 SIP 请求。

**类型**：初始为无状态，可通过 TM 函数强制转为有状态。

**默认动作**：如果请求既未被转发也未被应答，路由最终会直接丢弃该请求。

由 'route`{...}`' 或 'route[0]`{...}`' 标识的主 'route' 块会针对每个 SIP 请求执行。

主路由块执行之后的隐式动作是丢弃该 SIP 请求。要发送应答或转发请求，必须在路由块内显式调用相应动作。

使用示例：
```opensips

    route {
         if(is_method("OPTIONS")) {
            # 对每个 OPTIONS 请求发送应答
            sl_send_reply(200, "OK");
            exit();
         }
         route(1);
    }
    route[1] {
         # 按 URI 转发
         forward();
    }

```

注意，如果从 'branch_route[Y]' 中调用 'route(X)'，那么在 'route[X]' 中只是按每个独立分支处理，而不是像在主路由中那样所有分支一起处理。

路由可以返回一组值，之后可在调用该路由的上下文中通过 [`$return`](./Script-CoreVar.md#return-value---return) 变量获取。

传值示例：
```opensips

    route {
         route(query);
         xlog("Query returned id $return(0) with $return(1) values\n");
    }
    route[query] {
         # 执行一次信息查询，并把信息存入 $var(id) 和 $var(values)
         return(1, $var(id), $var(values));
    }

```
注意，返回值的第一个参数始终是返回码，无法通过 `$return()` 变量获取。

---

## branch_route

请求的分支路由块。它包含针对 SIP 请求的每个分支要执行的一组动作。

**触发条件**：准备（请求的）新分支时；此时分支已成型，但尚未发出。

**处理对象**：SIP 请求（带有该分支的特性，如 RURI、分支标志位）

**类型**：有状态

**默认动作**：如果分支未被丢弃（通过 "drop" 语句），该分支将被自动发出。

它仅由 TM 模块在通过 t_on_branch("branch_route_index") 装载之后执行。

使用示例：
```opensips

    route {
        lookup("location");
        t_on_branch("1");
        if(!t_relay()) {
            sl_send_reply(500, "Internal Server Error");
        }
    }
    branch_route[1] {
        if($ru=~"10\.10\.10\.10") {
            # 丢弃发往 10.10.10.10 的分支
            drop();
        }
    }

```

---

## failure_route

失败事务路由块。它包含针对所有分支都只收到否定应答（>=300）的每个事务要执行的一组动作。

**触发条件**：收到或（内部）生成完成该事务的否定应答（所有分支都以否定应答终止）

**处理对象**：原始的 SIP 请求（已发出的那个）

**类型**：有状态

**默认动作**：如果没有生成新分支，也没有强制发出应答，则默认将获胜应答发回 UAC。

'failure_route' 仅由 TM 模块在通过 t_on_failure("failure_route_index") 装载之后执行。

注意，在 'failure_route' 内部处理的是发起该事务的请求，而不是它的应答。

使用示例：
```opensips

    route {
        lookup("location");
        t_on_failure("1");
        if(!t_relay()) {
            sl_send_reply(500, "Internal Server Error");
        }
    }
    failure_route[1] {
        if(is_method("INVITE")) {
             # 呼叫失败 —— 中继到语音信箱
             t_relay("udp:voicemail.server.com:5060");
        }
    }

```

---

## onreply_route

应答路由块。它包含针对 SIP 应答要执行的一组动作。

**触发条件**：从网络收到应答

**处理对象**：收到的应答

**类型**：有状态（如果绑定到事务）或无状态（如果是全局应答路由）。

**默认动作**：如果应答未被丢弃（只有临时应答可以丢弃），它将被注入并由事务引擎处理。

onreply 路由有三种类型：

* **全局** —— 捕获 OpenSIPS 收到的所有应答，无需任何特殊装载（简单定义即可）—— 命名为 'onreply_route `{...}`' 或 'onreply_route[0] `{...}`'。注意：此路由不感知 SIP 事务（应答未与事务匹配），因此这里没有事务数据可用。

* **按请求/事务** —— 捕获属于某个事务的所有收到的应答，需要在请求时于 REQUEST ROUTE 中装载（通过 "t_on_reply()" ）—— 命名为 'onreply_route[N] `{...}`'。

* **按分支** —— 只捕获属于事务中某个特定分支的应答。它同样需要在请求时装载（也是通过 "t_on_reply()" ），但要在 BRANCH ROUTE 中、处理某个出站分支时进行 —— 命名为 'onreply_route[N] `{...}`'。

某些 'onreply_route' 块可由 TM 模块针对特殊应答执行。为此，必须通过 t_on_reply("onreply_route_index") 为那些需要在其内部处理应答的 SIP 请求装载 'onreply_route'。

```opensips

route {
        $ru = "sip:bob@opensips.org";  # 第一个分支
        $msg.branch = "sip:alice@opensips.org"; # 第二个分支

        t_on_reply("global"); # "global" 应答路由
                              # 作用于整个事务
        t_on_branch("1");

        t_relay();
}

branch_route[1] {
        if ($rU=="alice")
                t_on_reply("alice"); # "alice" 应答路由
                                      # 仅作用于第二个分支
}

onreply_route {
        xlog("OpenSIPS received a reply from $si\n");
}

onreply_route[alice] {
        xlog("received reply on the branch from alice\n");
}

onreply_route[global] {
        if (t_check_status("1[0-9][0-9]")) {
                setflag("PROVISIONAL_REPLY");
                log("provisional reply received\n");
                if (t_check_status("183"))
                        drop;
        }
}

```

---

## error_route

错误路由在 SIP 请求处理过程中发生解析错误，或脚本 [assert](./Script-CoreFunctions.md#assert-statement-description) 失败时自动执行。它允许管理员决定在此类错误情况下采取什么动作。

> [!IMPORTANT]
> 由于它仅对 SIP 请求触发，OpenSIPS 必须能够正确解析 SIP 消息的第一行。因此，第一行中的任何语法错误都**不会**触发此路由（因为 OpenSIPS 无法判断这是应答还是请求）。

**触发条件**：在 "route" 中发生解析错误

**处理对象**：失败的请求

**类型**：无状态（推荐）

**默认动作**：丢弃请求。

在 error_route 中，以下伪变量可用于获取错误详情：
* `$(err.class)` - 错误类别（目前解析错误为 '1'）
* `$(err.level)` - 错误的严重级别
* `$(err.info)` - 描述错误的文本
* `$(err.rcode)` - 建议的应答码
* `$(err.rreason)` - 建议的应答原因短语

```opensips

  error_route {
     xlog("--- error route class=$(err.class) level=$(err.level)
            info=$(err.info) rcode=$(err.rcode) rreason=$(err.rreason) ---\n");
     xlog("--- error from [$si:$sp]\n+++++\n$mb\n++++\n");
     sl_send_reply($err.rcode, $err.rreason);
     exit;
  }

```

---

## local_route

本地路由在 TM 内部（无 UAC 侧）生成新的 SIP 请求时自动执行。该路由用于消息检查、计费以及对消息头域做最后修改。不允许使用路由和信令函数。

**触发条件**：TM 生成一个全新的请求

**处理对象**：新请求

**类型**：有状态 

**默认动作**：将请求发出

```opensips

  local_route {
     if (is_method("INVITE") && $ru=~"@foreign.com") {
        append_hf("P-hint: foreign request\r\n");
        exit;
     }
     if (is_method("BYE") ) {
        acc_log_request("internally generated BYE");
     }
  }

```

---

## startup_route

**startup_route** 仅在 OpenSIPS 启动时、开始处理 SIP 消息之前执行一次。当需要执行某些初始化动作（例如向缓存加载一些数据）以简化后续处理时，这很有用。注意，与其他路由相比，此路由不是在收到消息时触发，因此这里可调用的函数不得对消息进行处理。

**触发条件**：启动时，在监听进程启动之前。

**处理对象**：初始化函数。

```opensips

  startup_route {
    sql_query_one("SELECT gwlist FROM routing_rules WHERE ruleid = 1", "$avp(gateway_list)");
    cache_store("local", "rule1", "$avp(gateway_list)");
  }

```

---

## timer_route

**timer_route** 是按名称旁指定的配置时间间隔（以秒为单位）周期性执行的路由。与 *startup_route* 类似，此路由不处理 SIP 消息。允许多个定时器路由（运行间隔可以不同）。

**触发条件**：*timer* 工作进程。

**处理对象**：执行周期性、重复性处理的函数。

> [!NOTE]
> OpenSIPS 启动时，每个 timer_route 的**首次执行是在 `<interval>` 秒之后**！

```opensips

  timer_route[gw_update, 300] {
    sql_query_one("SELECT gwlist FROM routing_rules WHERE ruleid = 1", "$avp(gateway_list)");
    $shv(gateway_list) = $avp(gateway_list);
  }

```

---

## event_route
**event_route** 由 OpenSIPS 事件接口使用，在事件被触发时执行脚本代码。路由的名称就是该路由要处理的事件。路由本身相对于触发时刻是异步执行的。

**触发条件**：事件接口触发同名事件时的 OpenSIPS 核心

**处理对象**：被触发的事件

**类型**：无状态（推荐）

**默认动作**：事件被触发时不执行任何脚本代码。

```opensips

  event_route[E_PIKE_BLOCKED] {
    xlog("The E_PIKE_BLOCKED event was raised\n");
  }

```
