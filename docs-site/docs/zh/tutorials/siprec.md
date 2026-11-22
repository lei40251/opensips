---
title: "SIPREC 呼叫录音"
description: "配置 SIPREC，让一个或多个 SRS 端点加入正在进行的呼叫。"
---

# SIPREC 呼叫录音 {#siprec-call-recording}

参见模块：[Call Recording](https://docs.opensips.org/manual/devel/modules/siprec)

## 教程概述 {#tutorial-overview}

[SIPREC](https://tools.ietf.org/html/rfc7866) 是一项标准，规定了如何借助外部录音设备以非侵入方式完成呼叫录音。使用该协议，你可以把呼叫录音功能从媒体服务器中移出，交给一个或多个录音器，而不会干扰实际的 RTP 流。
按照 [SIPREC 架构](https://tools.ietf.org/html/rfc7245)，要录制一次呼叫，需要两个组件：

* SRC（Session Recording Client，会话录音客户端）——这是位于呼叫路径上的 SIP 组件，由它触发呼叫录音——**OpenSIPS** 正是在这里参与进来。
* SRS（Session Recording Server，会话录音服务器）——这是接收 SIPREC 会话与分叉媒体的 SIP 组件，随后存储或处理录音。

[Oreka](http://oreka.sourceforge.net/) 是 SRS 的一个例子，但 OpenSIPS 可以与任何理解 SIPREC 的 SRS 实现配合工作。其他选择包括 [Sippy SRS](https://github.com/sippy/Sippy_Recorder/blob/main/Sippy_SRS.py)、[Drachtio SRS with FreeSWITCH](https://github.com/davehorton/drachtio-srs-freeswitch)，甚至是在 FreeSWITCH 前面使用 [b2b_sdp_demux](/zh/modules/b2b_sdp_demux) 的另一个 OpenSIPS 实例。

本文档描述把 **OpenSIPS devel** 配置为 SRC、并让一个或多个 SRS 端点加入正在进行的呼叫的步骤。

[SIPREC](/zh/modules/siprec) 模块的开发工作由 [OrecX Company](http://www.orecx.com/) 赞助。

## 架构 {#architecture}

本文的目的是展示如何录制两个客户端之间的呼叫，我们称它们为 **Alice** 与 **Bob**。为此，需要以下组件：

* **OpenSIPS**——将充当 SRC，向 SRS 提供关于该呼叫的元数据。
* **SRS**——将接收 SIPREC 会话，并执行实际的录音或录音交接。
* **RTP 中继**——将把 RTP 流量分叉给 SRS。在 OpenSIPS devel 中，SIPREC 可以通过 [rtp_relay](/zh/modules/rtp_relay) 模块使用 **RTPProxy** 或 **RTPEngine**。

下图展示了该部署以及各组件之间如何交互。图中以 RTPProxy 作为媒体中继示例，但同样的 OpenSIPS SIPREC 流程也可用于 RTPEngine。

![siprec architecture](/public/uploads/siprec-architecture.png)

按照该图，**Alice** 与 **Bob** 不需要具备任何录音能力。它们像普通 SIP 客户端一样工作，把 SIP 流量发给 **OpenSIPS** 代理，把 RTP 媒体经由 RTP 中继传送。当某次呼叫被选定录音时，**OpenSIPS** 会向 SRS 发起一个 SIPREC 会话，提供关于 **Alice** 与 **Bob** 的元数据，以及录音 SDP。随后 SRS 决定该呼叫是否应当被录音。如果它以 200 OK 接受该会话，**OpenSIPS** 便指示 RTP 中继把客户端的媒体分叉给 SRS。当呼叫结束时，**OpenSIPS** 也会关闭与 SRS 之间的 SIPREC 会话。

## 基本配置 {#basic-configuration}

在本文中我们只讨论如何用 **OpenSIPS** 通过 SIPREC 协议录制呼叫。我们不涉及 SRS、RTPProxy 或 RTPEngine 的配置，但在 OpenSIPS 中启用 SIPREC 之前，这些组件应当已经可正常工作。

我们将从一个已可正常工作的 OpenSIPS 部署开始，逐步向其加入必要的部分。下面的示例沿用 **OpenSIPS devel** 的[默认住宅脚本](https://github.com/OpenSIPS/opensips/blob/master/etc/opensips.cfg)，它为客户端提供基本的呼叫路由。

我们首先要做的是加载必要的模块：

* **tm**：事务支持，默认脚本已加载。
* **dialog**：用于跟踪呼叫状态，并在呼叫结束时关闭录音。它也是处理顺序消息所必需的。
* **b2b_entities**：自动管理与 SRS 之间的 SIPREC 会话。
* **siprec**：提供呼叫录音逻辑。
* **rtp_relay**：提供 SIPREC 所使用的通用 RTP 中继接口。
* **rtpproxy** 或 **rtpengine**：控制选定的媒体中继后端。

在脚本的模块部分添加以下内容行：

```opensips
loadmodule "dialog.so"
loadmodule "b2b_entities.so"
loadmodule "siprec.so"
loadmodule "rtp_relay.so"

# 选择与你的媒体中继相匹配的后端
loadmodule "rtpproxy.so"
# loadmodule "rtpengine.so"
```

然后指定到所选媒体中继的连接。对于 RTPProxy：

```opensips
modparam("rtpproxy", "rtpproxy_sock", "udp:127.0.0.1:7899")
```

或者，如果你改用 RTPEngine：

```opensips
modparam("rtpengine", "rtpengine_sock", "udp:127.0.0.1:2223")
```

现在我们需要确定要录制哪些呼叫。这可以用脚本中你想要的任何逻辑来完成，但为简单起见，本例中我们将对所有呼叫启用呼叫录音。找到处理初始 INVITE 的部分。在默认脚本中，这由下面的片段完成：

```opensips
# 仅对 INVITE 计费
if (is_method("INVITE")) {

    do_accounting("log");
}
```

在这段代码中，我们需要做三件事：

* 创建对话，以便 OpenSIPS 能跟踪呼叫与录音的生命周期。
* 使用 `rtp_relay_engage()` 让 RTP 中继加入该呼叫。
* 通过配置 SRS 的 SIP URI，告知 SIPREC 模块该呼叫需要被录音。

在这个简单场景中，SRS 与 **OpenSIPS** 位于同一台机器，监听端口 5090：

```opensips
# 仅对 INVITE 计费
if (is_method("INVITE")) {
    create_dialog();

    $rtp_relay = "co";
    $rtp_relay_peer = "co";
    rtp_relay_engage("rtpproxy");
    # rtp_relay_engage("rtpengine");

    siprec_start_recording("sip:127.0.0.1:5090");
    do_accounting("log");
}
```

`rtp_relay_engage()` 函数并不会立即执行所有媒体操作。它为该呼叫注册 RTP 中继上下文，随后随着对话推进自动处理所需的 offer/answer 与删除操作。当 SIPREC 请求所选后端把媒体分叉给 SRS 时，就会使用这个 RTP 中继上下文。未提供实例名时，`siprec_start_recording()` 会为该呼叫启动默认的 SIPREC 实例。

完整的示例配置可在 SIPREC 模块示例中找到：[opensips.cfg](https://github.com/OpenSIPS/opensips/blob/master/modules/siprec/samples/opensips.cfg)。

## 录音开始时间 {#recording-start-time}

录音不必只在呼叫中的某一个点触发。如果在初始 INVITE 上调用 `siprec_start_recording()`，OpenSIPS 会准备好 SIPREC 实例，并在双方都提供了 SDP 时启动它，通常是在 183 或 200 OK 之后。当早期媒体也应当被录音时，这很有用。

如果你只想录制已建立的呼叫，就保留初始 INVITE 上的对话创建与 RTP 中继接入，而在处理 200 OK 时从 `onreply_route` 调用 `siprec_start_recording()`：

```opensips
if (is_method("INVITE")) {
    create_dialog();

    $rtp_relay = "co";
    $rtp_relay_peer = "co";
    rtp_relay_engage("rtpproxy");

    t_on_reply("start_recording_on_answer");
    do_accounting("log");
}

onreply_route[start_recording_on_answer] {
    if (t_check_status("200") && has_body("application/sdp")) {
        $siprec(group) = "answered";
        siprec_start_recording("sip:127.0.0.1:5090");
    }
}
```

你也可以在呼叫稍后的阶段启动 SIPREC 实例，例如从对话内的 re-INVITE 或 UPDATE 处理路径中启动，只要对话已知且媒体中继上下文能提供所需的 SDP 信息即可。

## 录音实例 {#recording-instances}

`siprec_start_recording()` 函数还支持为同一呼叫使用多个 SIPREC 实例。在 OpenSIPS 中，一个 SIPREC 实例是一次独立控制的录音，以名称标识，并会向 SRS 建立自己的 SIPREC 会话。如果你的部署使用录音配置（profile），每个配置都可以映射到一个具名的 SIPREC 实例，例如一个实例用于合规录音，另一个用于质量监控。实例名是 `siprec_start_recording()` 的第二个参数，而实例专属的设置通过带索引的 `$siprec` 变量进行配置：

```opensips
$(siprec(group)[compliance]) = "compliance";
$(siprec(headers)[compliance]) = "X-Recording-Profile: compliance\r\n";
siprec_start_recording("sip:compliance-srs@example.net;transport=tcp", "compliance");

$(siprec(group)[qa]) = "quality";
$(siprec(headers)[qa]) = "X-Recording-Profile: quality\r\n";
siprec_start_recording("sip:qa-srs@example.net:5090", "qa");
```

每个 SIPREC 实例都有自己的 SRS URI 列表和自己的 `$siprec` 设置。这使得同一呼叫的不同具名实例可以各自独立地使用不同的 SRS 集群、元数据、头域或出向套接字。

## 暂停、恢复与停止录音 {#pause-resume-and-stop-recording}

一个 SIPREC 实例在启动之后可以被暂停、恢复或停止。除非提供了具名实例，否则这些操作作用于默认实例：

```opensips
if (has_totag() && is_method("INVITE")) {
    if (is_audio_on_hold())
        siprec_pause_recording("compliance");
    else
        siprec_resume_recording("compliance");
}
```

停止一个 SIPREC 实例会为该呼叫结束该实例。其他实例会各自独立地继续运行：

```opensips
if (has_totag() && is_method("INFO") && $hdr(X-Stop-Recording) == "yes")
    siprec_stop_recording("qa");
```

这些函数适用于「保持即暂停」逻辑、用户驱动的隐私控制，或仅终止某个特定 SIPREC 实例而保持呼叫存活。

### 通过 MI 事件控制录音 {#control-recording-from-mi-events}

你还可以通过 MI 抛出一个自定义的 Event Interface 事件，把它交给 OpenSIPS 脚本处理，从而从外部应用控制 SIPREC 实例。事件处理程序可以根据作为事件参数传入的 Dialog ID 或 SIP Call-ID 加载对话上下文，然后在该对话上下文中调用 SIPREC 的暂停/恢复函数。

例如，外部控制器可以为某个具名 SIPREC 实例抛出一个切换事件：

```bash
$ opensips-mi evi:raise -j '{"event":"E_SIPREC_TOGGLE","params":{"callid":"call-123@example.net","instance":"compliance"}}'
```

脚本可以捕获该事件、加载对话上下文，并用一个对话标志位记住当前的暂停状态：

```opensips
event_route[E_SIPREC_TOGGLE] {
    $var(dlg_id) = $params(callid);
    $var(id_type) = "callid";

    if ($params(dlg_id) != NULL) {
        $var(dlg_id) = $params(dlg_id);
        $var(id_type) = "did";
    }

    if ($var(dlg_id) == NULL) {
        xlog("E_SIPREC_TOGGLE: missing callid or dlg_id parameter\n");
        exit;
    }

    if (!load_dialog_ctx($var(dlg_id), $var(id_type), 1)) {
        xlog("E_SIPREC_TOGGLE: cannot load dialog $var(dlg_id) as $var(id_type)\n");
        exit;
    }

    if (is_dlg_flag_set("SIPREC_PAUSED")) {
        if (siprec_resume_recording($params(instance))) {
            reset_dlg_flag("SIPREC_PAUSED");
            xlog("SIPREC resumed by MI event for dialog $var(dlg_id), instance=$params(instance)\n");
        }
    } else {
        if (siprec_pause_recording($params(instance))) {
            set_dlg_flag("SIPREC_PAUSED");
            xlog("SIPREC paused by MI event for dialog $var(dlg_id), instance=$params(instance)\n");
        }
    }

    unload_dialog_ctx();
}
```

上例传入了 `instance` 参数，控制的是一个具名 SIPREC 实例。对于默认实例，省略 MI 的 `instance` 参数，并在不带参数的情况下调用 `siprec_pause_recording()` 或 `siprec_resume_recording()`。

## 录音事件 {#recording-events}

SIPREC 模块会抛出两个事件，可用于监控 SRS 何时开始或停止对某次呼叫录音：

* [`E_SIPREC_START`](/zh/modules/siprec#event_E_SIPREC_START)——在 SIPREC 呼叫建立、录音开始时抛出。
* [`E_SIPREC_STOP`](/zh/modules/siprec#event_E_SIPREC_STOP)——在 SIPREC 呼叫终止时抛出。

两个事件暴露相同的参数：

* `dlg_id`——被录音呼叫的对话 ID。
* `dlg_callid`——被录音呼叫的 Call-ID。
* `callid`——SIPREC B2B 呼叫的 Call-ID。
* `session_id`——录音呼叫的 SIPREC UUID。
* `server`——处理该录音的 SIPREC 服务器。
* `instance`——触发该事件的 SIPREC 实例。

这些都是常规的 OpenSIPS Event Interface 事件，因此既可以由本地脚本的 `event_route` 块消费，也可以由外部应用消费。对于外部应用，需加载所需的事件传输模块，并让相应的端点订阅 `E_SIPREC_START` 与 `E_SIPREC_STOP`，既可在脚本中用 `subscribe_event()` 订阅，也可在运行时通过 MI 订阅。端点格式取决于传输模块；所支持的订阅端点参见[事件接口手册](/zh/manual/Interface-Events)。

例如，你可以直接在 OpenSIPS 脚本中用 `event_route` 块记录录音的生命周期：

```opensips
event_route[E_SIPREC_START] {
    xlog("SIPREC started: dlg_id=$params(dlg_id), dlg_callid=$params(dlg_callid), siprec_callid=$params(callid), session=$params(session_id), server=$params(server), instance=$params(instance)\n");
}

event_route[E_SIPREC_STOP] {
    xlog("SIPREC stopped: dlg_id=$params(dlg_id), dlg_callid=$params(dlg_callid), siprec_callid=$params(callid), session=$params(session_id), server=$params(server), instance=$params(instance)\n");
}
```

定义 `event_route` 会自动让脚本订阅对应的事件，因此对于这种本地日志用途无需显式订阅。

## 高级配置 {#advanced-configuration}

### 通过 TCP 与 SRS 通信 {#communicate-with-srs-over-tcp}

尽管 UDP 通信轻量且是 SIP 的基础协议，但在实践中它有一个很大的局限：它并不总能承载大数据包。这在 SIPREC 中很常见：大型 SDP 载荷，加上 XML 元数据与 SIP 开销，可能超过 MTU。为避免 IP 分片，你可能希望通过 TCP 与 SRS 通信。

为此，需要对脚本做三处修改：

* 加载 **proto_tcp** 模块：

```opensips
loadmodule "proto_tcp.so"
```

* 添加一个 OpenSIPS 可用于与 SRS 通信的 TCP 套接字：

```opensips
socket=tcp:127.0.0.1:5060
```

* 修改 SRS URI，加上 `;transport=tcp` 参数：

```opensips
siprec_start_recording("sip:127.0.0.1:5090;transport=tcp");
```

完成这些修改后，OpenSIPS 将通过 TCP 与 SRS 通信。

### 使用特定接口与 SRS 通信 {#use-a-specific-interface-to-communicate-with-the-srs}

在真实场景中，你可能希望把与 SRS 的通信放在本地 LAN 中一个独立或专用的 IP 上。在 OpenSIPS devel 中，这应当在调用 `siprec_start_recording()` 之前通过 `$siprec(socket)` 变量完成：

```opensips
$siprec(socket) = "tcp:10.0.0.10:5060";
siprec_start_recording("sip:10.0.0.20:5090;transport=tcp");
```

对于具名 SIPREC 实例，用实例名对 `$siprec` 设置做索引：

```opensips
$(siprec(socket)[compliance]) = "tcp:10.0.0.10:5060";
siprec_start_recording("sip:10.0.0.20:5090;transport=tcp", "compliance");
```

SIPREC 套接字选择已不再需要旧的 `force_send_socket()` 风格。请改用 `$siprec(socket)`，这样套接字的作用域就限定在 SIPREC 请求上，不会影响正常的呼叫路由。

有些修改更适合直接施加在生成的 SIPREC 请求本身上。由于 SIPREC 会话由 B2B 层创建，可以用 `local_route` 在本地生成的请求发出去之前对其进行检查或调整：

```opensips
local_route {
    if (is_method("INVITE") && $ru =~ "^sip:.*@10\\.0\\.0\\.20:5090") {
        append_hf("X-Recording-Origin: opensips\r\n");
    }
}
```

对于在 `siprec_start_recording()` 之前就已知的 SIPREC 参数，使用 `$siprec(...)`；对于取决于最终生成的 SIP 请求的修改，使用 `local_route`。在生产环境中，请把 `local_route` 的条件限定为你的 SRS 路由模式、某个标记头域，或其他能识别 SIPREC 生成请求的策略。

### 调整 SIPREC 元数据与请求参数 {#tune-siprec-metadata-and-request-parameters}

大部分 SIPREC 实例设置都可以用 [`$siprec`](/zh/modules/siprec#pv_siprec) 变量调整。这包括：

* `group`——呼叫分类元数据。
* `caller` 与 `callee`——自定义的 XML 参与者元数据。
* `media`——录音 SDP 中使用的媒体相关信息。
* `headers`——添加到发往 SRS 的初始请求中的额外 SIP 头域。
* `socket`——发往 SRS 时使用的 OpenSIPS 出向套接字。
* `from_uri` 与 `to_uri`——生成的 SIPREC 对话头域中使用的 URI。
* `group_custom_extension` 与 `session_custom_extension`——自定义 XML 扩展。

例如：

```opensips
$xml(caller_xml) = "<nameID></nameID>";
$xml(caller_xml/nameID.attr/aor) = "sip:john@opensips.org";
$xml(caller_xml/nameID) = "<name>John Doe</name>";

$siprec(group) = "regular";
$siprec(caller) = $xml(caller_xml/nameID);
$siprec(headers) = "X-Account-ID: " + $avp(account_id) + "\r\n";
$siprec(from_uri) = "sip:recorder-src@opensips.org";
$siprec(to_uri) = "sip:recording@example.net";

siprec_start_recording("sip:127.0.0.1:5090;transport=tcp");
```

`$siprec` 变量的作用域是当前消息，因此要在调用 `siprec_start_recording()` 之前紧挨着设置它。对于具名 SIPREC 实例，请使用带索引的形式，例如 `$(siprec(headers)[qa])`。

### SRS 故障切换 {#srs-failover}

有时 SRS 可能宕机或无法到达，而你希望故障切换到另一台服务器。这可以通过在 `siprec_start_recording()` 函数的第一个参数中列出多个 SRS URI 来实现，URI 之间以逗号分隔。下面的示例先通过 TCP 连接 SRS，如果失败，再尝试通过 UDP 到达它：

```opensips
siprec_start_recording("sip:127.0.0.1:5090;transport=tcp, sip:127.0.0.1:5090");
```

默认情况下，故障切换由 SRS 返回的否定应答驱动，或者当 SRS 不应答时由一个自动生成的 408 驱动。然而，并非所有应答都意味着服务不可用，其中一些可能只是表示该呼叫不应被录音。这种情况下，你可能希望让故障切换算法忽略某些应答码。这通过 [skip_failover_codes](/zh/modules/siprec#param_skip_failover_codes) 参数完成。下面的示例对任何 3xx 与 4xx 应答码都不做故障切换，因此只会在 5xx 与 6xx 类别上切换：

```opensips
modparam("siprec", "skip_failover_codes", "[34][0-9][0-9]")
```

对于更高级的故障切换逻辑，你可以在 `local_route` 中捕获一个生成的占位 SRS URI，让 `dispatcher` 从已配置的池中选择真实的 SRS，然后用 `failure_route` 标记失败的 SRS 目的地并重试下一个。完整示例可在 SIPREC 模块示例中找到：[siprec-dispatcher.cfg](https://github.com/OpenSIPS/opensips/blob/master/modules/siprec/samples/siprec-dispatcher.cfg)。
