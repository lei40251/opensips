---
title: "Diameter 客户端/服务器"
description: "如何使用 aaa_diameter 模块发送自定义 Diameter 请求，并在 OpenSIPS 脚本中处理进入的 Diameter 请求。"
---

## 搭建 freeDiameter 库 {#setting-up-the-freediameter-libraries}

当前的 **aaa_diameter** 模块动态链接 freeDiameter 库，要求 **libfdcore** 与 **libfdproto** 版本为
**1.2.1 或更高**。在 Debian/Ubuntu 系统上，请在从源码构建 OpenSIPS 模块之前安装开发包：

```bash
sudo apt -y install libfreediameter-dev
```

## 安装 "aaa_diameter" 模块 {#installing-the-aaa_diameter-module}

如果从源码构建：

```bash
include_modules=aaa_diameter make install
```

如果改用 Debian 软件包安装，则安装
**opensips-diameter-module** 软件包：

```bash
sudo apt -y install opensips-diameter-module
```

## 定义一个通用 Diameter 请求 + 应答 {#defining-a-generic-diameter-request--answer}

*freeDiameter* 库只会为其字典中已有的 Diameter Application、Command 与 AVP
构建消息。这意味着在 OpenSIPS 能够构建并发送自定义 Diameter 请求之前，必须在字典文件中
描述该请求与应答。

把 `;extra-avps-file:<path-to-dictionary.opensips>` 选项附加到
**aaa_diameter** 的 [aaa_url](/zh/modules/aaa_diameter#param_aaa_url) 模块参数上。
**dictionary.opensips** 语法支持自定义 Diameter Application、Command 与分组 AVP。完整模块
参考参见 [dm_send_request()](/zh/modules/aaa_diameter#func_dm_send_request)。

本教程中，把以下定义放入 `/etc/opensips/dictionary.opensips`：

```text
ATTRIBUTE out_gw            232 string
ATTRIBUTE trunk_id          233 string

ATTRIBUTE rated_duration    234 integer
ATTRIBUTE call_cost         235 integer

ATTRIBUTE Exponent          429 integer32
ATTRIBUTE Value-Digits      447 integer64

ATTRIBUTE Cost-Unit 424 grouped
{
	Value-Digits | REQUIRED | 1
	Exponent | OPTIONAL | 1
}

ATTRIBUTE Currency-Code     425 unsigned32

ATTRIBUTE Unit-Value  445 grouped
{
	Value-Digits | REQUIRED | 1
	Exponent | OPTIONAL | 1
}

ATTRIBUTE Cost-Information  423 grouped
{
	Unit-Value | REQUIRED | 1
	Currency-Code | REQUIRED | 1
	Cost-Unit | OPTIONAL | 1
}

APPLICATION 42 My Diameter Application

REQUEST 92001 My-Custom-Request
{
	Origin-Host | REQUIRED | 1
	Origin-Realm | REQUIRED | 1
	Destination-Realm | REQUIRED | 1
	Sip-From-Tag | REQUIRED | 1
	Sip-To-Tag | REQUIRED | 1
	Sip-Call-Duration | REQUIRED | 1
	Sip-Call-Setuptime | REQUIRED | 1
	Sip-Call-Created | REQUIRED | 1
	Sip-Call-MSDuration | REQUIRED | 1
	out_gw | REQUIRED | 1
	call_cost | REQUIRED | 1
	Cost-Information | OPTIONAL | 1
}

ANSWER 92001 My-Custom-Answer
{
	Origin-Host | REQUIRED | 1
	Origin-Realm | REQUIRED | 1
	Destination-Realm | REQUIRED | 1
	Result-Code | REQUIRED | 1
}
```

## opensips.cfg：发送通用 Diameter 请求 {#opensipscfg-sending-generic-diameter-requests}

OpenSIPS **3.2** 及更高版本可以构建通用 Diameter 请求，既能完全控制请求中的 AVP，
也能完全访问应答中的 AVP。

加载 **aaa_diameter**，将其指向 freeDiameter 客户端配置，并通过 `extra-avps-file`
加载自定义字典：

```opensips
log_stdout = yes
...
loadmodule "aaa_diameter.so"
modparam("aaa_diameter", "fd_log_level", 0)
modparam("aaa_diameter", "realm", "diameter.test")
modparam("aaa_diameter", "peer_identity", "server")
modparam("aaa_diameter", "aaa_url",
    "diameter:/etc/freeDiameter/freeDiameter-client.conf;extra-avps-file:/etc/opensips/dictionary.opensips")

loadmodule "json.so"
...
```

把请求 AVP 列表构建为 JSON 数组：

```opensips
# 为 My Diameter Application (42) 构建并发送一个
# My-Custom-Request (92001)
$var(payload) = "[
	{ \"Origin-Host\": \"client.diameter.test\" },
	{ \"Origin-Realm\": \"diameter.test\" },
	{ \"Destination-Realm\": \"diameter.test\" },
	{ \"Sip-From-Tag\": \"dc93-4fba-91db\" },
	{ \"Sip-To-Tag\": \"ae12-47d6-816a\" },
	{ \"Session-Id\": \"a59c-dff0d9efd167\" },
	{ \"Sip-Call-Duration\": 6 },
	{ \"Sip-Call-Setuptime\": 1 },
	{ \"Sip-Call-Created\": 1652372541 },
	{ \"Sip-Call-MSDuration\": 5850 },
	{ \"out_gw\": \"GW-774\" },
	{ \"call_cost\": 10 },
	{ \"Cost-Information\": [
		{\"Unit-Value\": [{\"Value-Digits\": 1000}]},
		{\"Currency-Code\": 35}
		]}
]";
```

然后以阻塞模式发送该请求：

```opensips
$var(rc) = dm_send_request(42, 92001, $var(payload), $var(rpl_avps));
xlog("rc: $var(rc), Reply AVPs: $var(rpl_avps)\n");
```

本例中，Diameter Application ID 为 **42**，Command Code 为
**92001**。收到应答时，返回码即 `Result-Code` AVP 的值。响应 AVP 可从
`$var(rpl_avps)` 中取得。使用 OpenSIPS [JSON 模块](/zh/modules/json) 解析并访问它们：

```opensips
$json(rpl) := $var(rpl_avps);
xlog("Reply AVPs: $json(rpl)\n");
$var(i) = 0;
while ($json(rpl[$var(i)])) {
  xlog("   AVP: $json(rpl[$var(i)])\n");
  $var(i) = $var(i) + 1;
}
```

对于非阻塞请求，请使用异步形式的
[dm_send_request()](/zh/modules/aaa_diameter#afunc_dm_send_request)。

## opensips.cfg：处理通用 Diameter 请求 {#opensipscfg-processing-generic-diameter-requests}

从 OpenSIPS **3.5** 起，**aaa_diameter** 还可以充当 Diameter 服务器，处理进入的
Diameter 请求。加载 [event_route](https://docs.opensips.org/manual/devel/modules/event_route/)，使 OpenSIPS 能够消费
针对进入的 Diameter 请求所发出的 **E_DM_REQUEST** 事件：

```opensips
log_stdout = yes
...
loadmodule "aaa_diameter.so"
modparam("aaa_diameter", "fd_log_level", 0)
modparam("aaa_diameter", "realm", "diameter.test")
modparam("aaa_diameter", "peer_identity", "server")
modparam("aaa_diameter", "aaa_url",
    "diameter:/etc/freeDiameter/freeDiameter-client.conf;extra-avps-file:/etc/opensips/dictionary.opensips")

loadmodule "event_route.so"
...
event_route [E_DM_REQUEST]
{
    xlog("Req: $param(sess_id) / $param(app_id) / $param(cmd_code)\n");
    xlog("AVPs: $param(avps_json)\n");
}
```

该事件提供以下参数：

* **app_id**（整型）- Diameter Application Identifier
* **cmd_code**（整型）- Diameter Command Code
* **sess_id**（字符串）- **Session-Id** AVP 或 **Transaction-Id** AVP 的值；若两个 AVP 都不存在则为 **NULL** 值
* **avps_json**（字符串）- 包含该请求全部 AVP 的 JSON 数组

处理完请求后，把应答 AVP 打包为 JSON 数组，并调用
[dm_send_answer()](/zh/modules/aaa_diameter#func_dm_send_answer)：

```opensips
event_route [E_DM_REQUEST]
{
  xlog("Req: $param(sess_id) / $param(app_id) / $param(cmd_code)\n");
  xlog("AVPs: $param(avps_json)\n");

  $var(ans_avps) = "[
          { \"Vendor-Specific-Application-Id\": [{
                  \"Vendor-Id\": 0
                  }] },

          { \"Result-Code\": 2001 },
          { \"Auth-Session-State\": 0 },
          { \"Origin-Host\": \"opensips.diameter.test\" },
          { \"Origin-Realm\": \"diameter.test\" }
  ]";

  if (!dm_send_answer($var(ans_avps)))
    xlog("ERROR - failed to send Diameter answer\n");
}
```
