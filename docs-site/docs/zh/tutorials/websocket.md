---
title: "WebSocket 传输"
description: "为同时承载 UDP、TCP、TLS 上的 SIP 客户端与浏览器客户端的 SIP 平台配置 OpenSIPS 的 WebSocket 传输。"
---

参见模块：["WebSocket Transport"](https://docs.opensips.org/manual/devel/modules/proto_ws)

> [!NOTE]
> 其他版本：[OpenSIPS 2.1 版本](https://docs.opensips.org/tutorials/websocket-2-1/)、[早于 OpenSIPS 2.1 的版本](https://docs.opensips.org/tutorials/websocket-older/)。

## 教程概览 {#tutorial-overview}

[WebSocket](https://datatracker.ietf.org/doc/html/rfc6455) 是一种在 TCP 连接之上为 Web 客户端与服务器提供全双工通信的协议。使用 WebSocket 协议，浏览器可以连接 Web 服务器并交换数据，而与应用协议的类型或性质无关。[RFC 7118](https://datatracker.ietf.org/doc/html/rfc7118) 利用该协议，使浏览器能够使用 SIP 协议发起 VoIP 呼叫。[WebSocketSecure](/zh/modules/proto_wss)（WSS）在 WebSocket 协议之上叠加 TLS，使连接变得安全，这是许多浏览器在你希望使用 WebRTC 时的强制要求。

本文档描述如何将 **OpenSIPS** 用作 SIP 平台的核心组件，该平台既连接 SIP 客户端（通过 UDP、TCP 或 TLS），也连接基于浏览器的、使用 SIP over WebSocket 与 WebSocketSecure 的客户端。OpenSIPS 负责处理 SIP 信令部分，媒体则通过 [RTPengine](https://github.com/sipwise/rtpengine) 中继，OpenSIPS 使用 [rtp_relay](/zh/modules/rtp_relay) 模块，使媒体处理与呼叫上下文保持绑定。

## 搭建 {#setup}

### RTPengine {#rtpengine}

#### 安装 {#installation}

RTPengine 由两个主要组件构成：一个用于直接在内核中高效转发 RTP 包的内核模块，以及一个用于与 OpenSIPS 通信的守护进程。更多细节见[此处](https://github.com/sipwise/rtpengine#overview)。两个组件都可以从 deb 包安装（在基于 Debian 的系统上），也可以直接从源码安装。只需按照[官方文档](https://github.com/sipwise/rtpengine#compiling-and-installing)安装 RTPengine 即可。

你必须生成用于 TLS 与 WSS 的证书。在本例中，我们使用 [Let's Encrypt](https://letsencrypt.org/) 生成证书。

证书管理由 [TLS_MGM](/zh/modules/tls_mgm) 模块负责。设置合适的 `tls_mgm` 模块参数，就是我们为 WSS 与 TLS 管理证书的方式。

#### 使用 {#usage}

安装内核模块和附加库之后，需要对 RTPengine 守护进程进行配置。现代 RTPengine 部署应将守护进程选项保存在 INI 风格的配置文件中，通常为 `/etc/rtpengine/rtpengine.conf`。RTPengine 守护进程文档描述了 [`--config-file`](https://rtpengine.readthedocs.io/en/latest/rtpengine.html#options) 选项、默认配置文件路径以及可用选项。

我们使用的关键设置如下：

* `interface`：RTP/SRTP 监听接口，以及可选的通告地址
* `listen-ng`：OpenSIPS 使用 NG 控制协议与 RTPengine 通信所用的 IP 和端口
* `listen-cli`：CLI 接口的 IP 和端口，用于收集 RTP/SRTP 会话的统计信息
* `port-min` 与 `port-max`：RTPengine 为媒体中继分配的本地 UDP 端口范围
* `log-level`：syslog 日志详细程度

你可以在 [RTPengine 守护进程手册](https://rtpengine.readthedocs.io/en/latest/rtpengine.html)中找到全部参数。

下面是一个最小的 `/etc/rtpengine/rtpengine.conf` 示例，它通过 localhost 与 OpenSIPS 通信，并使用 `1.1.1.1` 这个 IP 中继 RTP：

```ini
[rtpengine]
table = 0
interface = external/1.1.1.1
listen-ng = 127.0.0.1:60000
listen-cli = 127.0.0.1:60001
port-min = 50000
port-max = 55000
log-level = 6
```

#### 排错 {#troubleshoot}

首先确认 `rtpengine` 守护进程已启动：
```bash

ps -ef | grep rtpengine

```

如果 `rtpengine` 守护进程没有启动，请确认 `xt_RTPENGINE` 内核模块已加载：
```bash

lsmod | grep xt_RTPENGINE

```

如果该模块未加载，请确认 `ip_tables` 与 `x_tables` 内核模块已加载。另外，请检查日志中系统最近产生的错误
```bash

dmesg

```

### OpenSIPS {#opensips}

为了在 OpenSIPS 中使用 WebSocket 与 WebSocketSecure，必须在配置文件中加载 [proto_ws](/zh/modules/proto_ws) 与 [proto_wss](/zh/modules/proto_wss) 模块，并为 WebSocket 与 WebSocketSecure 协议定义一个监听地址。我们还必须加载一个 TLS 后端模块，例如 `tls_wolfssl` 或 `tls_openssl`，连同 [tls_mgm](/zh/modules/tls_mgm) 模块，以便管理证书。

```opensips

# 为所有协议设置监听地址
socket=ws:127.0.0.1:8080
socket=wss:127.0.0.1:443
socket=tls:127.0.0.1:5061
socket=udp:127.0.0.1:5060

# 加载所有协议模块
loadmodule "proto_udp.so"
loadmodule "proto_ws.so"

# 加载 TLS 支持
loadmodule "tls_wolfssl.so"
loadmodule "tls_mgm.so"
loadmodule "proto_tls.so"
loadmodule "proto_wss.so"

# 设置证书相关信息
modparam("tls_mgm", "server_domain", "default")
modparam("tls_mgm", "match_ip_address", "[default]*")
modparam("tls_mgm", "certificate", "[default]/etc/letsencrypt/live/acme.com/fullchain.pem")
modparam("tls_mgm", "private_key", "[default]/etc/letsencrypt/live/acme.com/privkey.pem")
modparam("tls_mgm", "verify_cert", "[default]0")
modparam("tls_mgm", "require_cert", "[default]0")

```

接下来，加载 [rtp_relay](/zh/modules/rtp_relay) 模块以及 [rtpengine](/zh/modules/rtpengine) 后端。`rtp_relay` 模块为呼叫保留媒体上下文，并通过所选后端自动驱动 offer、answer 与 delete 操作。

```opensips

loadmodule "rtp_relay.so"
loadmodule "rtpengine.so"
modparam("rtpengine", "rtpengine_sock", "udp:127.0.0.1:60000")

```

注意，[rtpengine_sock](/zh/modules/rtpengine#param_rtpengine_sock) 参数应与 `rtpengine` 守护进程配置中的 `listen-ng` 设置相匹配，并且 OpenSIPS 应能通过 IP 连通到该套接字。

接下来，必须修改路由逻辑，以便将以 DTLS-SRTP 通信的客户端与使用普通 RTP 的客户端区别对待，并在必要时启用桥接。为此，可以检查请求消息是否通过 WebSocket 协议接收。这可以通过以下代码实现：

```opensips

if ($socket_in(proto) == "WS" || $socket_in(proto) == "WSS")
    setflag("SRC_WS");

```

如果请求是 REGISTER，我们希望把这一信息存入 *location* 表，这样在呼叫用户时就能知道传输类型。为此，可以在调用 [save()](/zh/modules/registrar#func_save) 函数之前设置一个分支标志位。这样，当 [lookup()](/zh/modules/registrar#func_lookup) 方法返回时，我们就能判断客户端是否使用 WebSocket。

```opensips

    if (is_method("REGISTER")) {
        if (isflagset("SRC_WS"))
            setbflag("DST_WS");

        fix_nated_register();
        if (!save("location"))
            send_reply(500, "Registration failed");

        exit;
    }

```

发起呼叫时，根据这两个标志位（`SRC_WS` 与 `DST_WS`），我们可以判断主叫与被叫各自能"说"什么（RTP 或 DTLS-SRTP）。当前脚本通过 [`$rtp_relay`](/zh/modules/rtp_relay#pv_rtp_relay) 与 [`$rtp_relay_peer`](/zh/modules/rtp_relay#pv_rtp_relay_peer) 变量为每一侧配置媒体类型，然后通过 [rtp_relay_engage()](/zh/modules/rtp_relay#func_rtp_relay_engage) 调用 RTPengine。

```opensips

    if (isbflagset("DST_WS"))
        $rtp_relay(type) = "UDP/TLS/RTP/SAVPF ICE=force";
    else
        $rtp_relay(type) = "RTP/AVP ICE=remove";

    if (isflagset("SRC_WS"))
        $rtp_relay_peer(type) = "UDP/TLS/RTP/SAVPF ICE=force";
    else
        $rtp_relay_peer(type) = "RTP/AVP ICE=remove";

    if (!has_totag())
        rtp_relay_engage("rtpengine");

```

一旦针对初始 INVITE 调用了 `rtp_relay_engage()`，`rtp_relay` 就会注册所需的钩子，以处理该呼叫后续与 RTPengine 的交互，包括对话中的 offer/answer 更新以及媒体拆除。

完成上述所有设置后，应当已具备一套完整的方案，用于互连通过 UDP、TCP 等协议接入的 SIP 客户端，以及通过 WebSocket 接入的基于浏览器的 SIP 客户端。

## 配置文件 {#configuration-file}

### 常规 SDP 协商 {#normal-sdp-negotiation}

完整的示例配置可在 PROTO_WSS 模块的示例中找到：[opensips.cfg](https://github.com/OpenSIPS/opensips/blob/master/modules/proto_wss/samples/opensips.cfg)，这是一个最小可用的住宅脚本示例，能够处理通过 UDP 与 WebSocket 两种传输接入的客户端连接。该示例假定 SDP offer 出现在来自 UAC 的 INVITE 中，SDP answer 出现在来自 UAS 的 200 OK 中。

> [!NOTE]
> WSS 的默认端口（443）是特权端口，因此如果运行该脚本，应以超级用户权限（root 用户）启动 OpenSIPS。

### 延迟 SDP 协商 {#late-sdp-negotiation}

对于延迟 SDP 协商，即 SDP 在 200 OK 与 ACK 之间交换的情况，使用相同的传输标志位标记与 RTP 中继配置。由于在 `rtp_relay_engage()` 之后由 `rtp_relay` 持有呼叫的媒体上下文，脚本只需确保携带 SDP 的对话中消息继续沿正常的中继路径传递即可。

## 旧版本说明 {#older-version-notes}

上面的 devel 配置是参考版本。旧版教程可以作为简短的版本说明合并进本文档，因为部署模型只在少数几个重要方面发生了变化。

### OpenSIPS 2.2 {#opensips-22}

2.2 教程已在 OpenSIPS 中使用原生 WebSocket 与 Secure WebSocket 支持。更新该教程时，应从当前的示例配置出发，刷新通用脚本语法，并将直接操作 RTPengine 的方式替换为 `rtp_relay` 的呼叫上下文。

### OpenSIPS 2.1 {#opensips-21}

2.1 教程涵盖原生纯 WebSocket 支持。Secure WebSocket 支持应遵循当前 OpenSIPS 的流程，使用 WSS 传输与 TLS 模块；在升级到 devel 时，媒体处理应迁移到 `rtp_relay`。

### 早于 OpenSIPS 2.1 的版本 {#older-than-opensips-21}

更早的部署使用 OverSIP 作为 WebSocket 到 SIP 的网关，因此 OpenSIPS 本身并不终结 WebSocket 流量。升级到当前版本时，应从教程流程中移除该网关角色，让 OpenSIPS 直接处理 WebSocket 与 Secure WebSocket 流量。
