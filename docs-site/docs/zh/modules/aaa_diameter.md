---
title: "AAA_DIAMETER 模块"
description: "本模块提供 RFC 6733 Diameter 对等端实现，既能充当 Diameter 客户端，也能充当服务器，或两者兼具。"
sidebar: false
---


## 管理指南 {#admin-guide}


### 概述 {#overview}


本模块提供 RFC 6733 Diameter 对等端实现，既能充当 **Diameter 客户端**，也能充当**服务器**，或**两者兼具**。


任何希望使用它的模块都必须执行以下操作：
- *包含 aaa.h*
- *使用合适的 Diameter 专用 URL 发起 bind 调用，例如 "diameter:freeDiameter-client.conf"*


### Diameter 客户端 {#diameter-client}


本模块实现了核心的 AAA OpenSIPS 接口，从而为 [aaa_radius](/zh/modules/aaa_radius) 模块提供了一种替代的客户端实现，这在例如为在线 SIP 呼叫执行计费与结算时可能很有用。


除 RADIUS 客户端的鉴权与计费功能外，Diameter 客户端还支持发送*任意* Diameter 请求，进一步扩展了可通过 OpenSIPS 脚本实现的应用范围。此类 Diameter 请求可使用 [dm_send_request()](#dm_send_requestapp_id-cmd_code-avps_json-rpl_avps_pv) 函数发送。


### Diameter 服务器 {#diameter-server}


从 OpenSIPS **3.5** 开始，Diameter 模块也包含*服务器端*支持。


首先，需要在 OpenSIPS 配置文件中创建一个 [event_route](/zh/manual/Script-Routes#event_route) 来处理 [E_DM_REQUEST](#e_dm_request) 事件。这些事件将包含传入 Diameter 请求的所有必要信息。


最后，一旦处理完请求信息并准备好应答 AVP，脚本编写者应使用 [dm_send_answer()](#dm_send_answeravps_json-is_error) 函数回复一条 Diameter 应答消息。


*建议：* 在可能的情况下，始终在 *freeDiameter.conf* 配置文件中加载 **dict_sip.fdx** freeDiameter 扩展模块，因为它包含数百个众所周知的 AVP 定义，在与其他 Diameter 对等端实现互通时可能会很有用。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


无。


#### 外部库或应用程序 {#external-libraries-or-applications}


所有 Diameter 消息的构建与解析，以及对等端状态机和 Diameter 相关的网络通信，均由 [freeDiameter 项目](http://www.freediameter.net/trac/) 及其 C 库提供支持，并与 "aaa_diameter" 模块动态链接。


在加载本模块运行 OpenSIPS 之前，必须安装以下库：


- *libfdcore* v1.2.1 或更高版本
- *libfdproto* v1.2.1 或更高版本


### 导出的参数 {#exported-parameters}


#### fd_log_level (integer)


该参数衡量 freeDiameter 库所做日志的*安静程度*。可能的值：


- 0 (ANNOYING)
- 1 (DEBUG)
- 3 (NOTICE，默认)
- 5 (ERROR)
- 6 (FATAL)


注意：由于 freeDiameter 将日志输出到标准输出，必须先启用新的核心参数 **log_stdout**，才能从该库获取任何日志。


```opensips title="设置 fd_log_level 参数"
modparam("aaa_diameter", "fd_log_level", 0)
```


#### realm (string)


所有参与的 Diameter 对等端使用的唯一 realm。


默认值为 *"diameter.test"*。


```opensips title="设置 realm 参数"
modparam("aaa_diameter", "realm", "opensips.org")
```


#### peer_identity (string)


Diameter 服务器对等端的身份（realm 子域），OpenSIPS 的 Diameter 客户端对等端将连接到它。


默认值为 *"server"*（即 "server.diameter.test"）。


```opensips title="设置 peer_identity 参数"
modparam("aaa_diameter", "peer_identity", "server")
```


#### aaa_url (string)


Diameter 客户端的 URL：配置文件，可带一个可选的 extra-avps-file，Diameter 客户端在其中进行配置。


默认情况下不会创建连接。


```opensips title="设置 aaa_url 参数"
modparam("aaa_diameter", "aaa_url", "diameter:freeDiameter-client.conf")
```


```opensips title="设置 aaa_url 参数"
modparam("aaa_diameter", "aaa_url", "diameter:freeDiameter-client.conf;extra-avps-file:dictionary.opensips")
```


#### answer_timeout (integer) {#answer_timeout-integer}


时间，以毫秒计；超过该时间后，未收到应答的 [dm_send_request()](#dm_send_requestapp_id-cmd_code-avps_json-rpl_avps_pv) 函数调用将超时，并返回 **-2** 代码。


默认值为 *2000* 毫秒。


```opensips title="设置 answer_timeout 参数"
modparam("aaa_diameter", "answer_timeout", 5000)
```


### 导出的函数 {#exported-functions}


#### dm_send_request(app_id, cmd_code, avps_json, [rpl_avps_pv]) {#dm_send_requestapp_id-cmd_code-avps_json-rpl_avps_pv}


向互联对等端执行一次阻塞式 Diameter 请求，并返回应答中的 Result-Code AVP 值。


*参数*


- *app_id* (integer) - 应用程序的 ID。自定义应用程序必须先在 dictionary.opensips 这个 Diameter 配置文件中定义，才能被识别。
- *cmd_code* (integer) - 命令的 ID。自定义的命令代码、名称及 AVP 要求必须事先在 dictionary.opensips Diameter 配置文件中定义。
HTTP 应答的消息体。
- *avps_json* (string) - 一个 JSON 数组，包含要放入消息中的 AVP。
- *rpl_avps_pv* (var, optional) - 输出变量，将保存 Diameter 应答中的所有 AVP 名称及其值，打包为 JSON 数组字符串。"json" 模块及其 *$json* 变量可用于遍历该数组。


*返回码*


- **1** - 成功
- **-1** - 内部错误
- **-2** - 请求超时（在处理应答之前已超过 [answer_timeout](#answer_timeout-integer)）


该函数可在任意路由中使用。


```
# 在 "dictionary.opensips" 文件中定义自定义 Diameter AVP、
# Application ID、Request 与 Reply 的示例

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
	Transaction-Id | REQUIRED | 1
	Sip-From-Tag | REQUIRED | 1
	Sip-To-Tag | REQUIRED | 1
	Acct-Session-Id | REQUIRED | 1
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
	Transaction-Id | REQUIRED | 1
	Result-Code | REQUIRED | 1
}
```


```opensips title="dm_send_request 用法"
# 为 My Diameter Application (42) 构建并发送一条
# My-Custom-Request (92001)
$var(payload) = "[
	{ \"Origin-Host\": \"client.diameter.test\" },
	{ \"Origin-Realm\": \"diameter.test\" },
	{ \"Destination-Realm\": \"diameter.test\" },
	{ \"Sip-From-Tag\": \"dc93-4fba-91db\" },
	{ \"Sip-To-Tag\": \"ae12-47d6-816a\" },
	{ \"Acct-Session-Id\": \"a59c-dff0d9efd167\" },
	{ \"Sip-Call-Duration\": 6 },
	{ \"Sip-Call-Setuptime\": 1 },
	{ \"Sip-Call-Created\": 1652372541 },
	{ \"Sip-Call-MSDuration\": 5850 },
	{ \"out_gw\": \"GW-774\" },
	{ \"cost\": \"10.84\" },
	{ \"Cost-Information\": [
		{\"Unit-Value\": [{\"Value-Digits\": 1000}]},
		{\"Currency-Code\": 35}
		]}
]";

$var(rc) = dm_send_request(42, 92001, $var(payload), $var(rpl_avps));
xlog("rc: $var(rc), AVPs: $var(rpl_avps)\n");
$json(avps) := $var(rpl_avps);
```


#### dm_send_answer(avps_json, [is_error]) {#dm_send_answeravps_json-is_error}


以*非阻塞*方式向互联对等端回送一条 Diameter 应答消息，作为对其请求的响应。


构建应答消息时，以下字段会自动从 Diameter 请求中复制过来：


- Application ID
- Command Code
- Session-Id AVP（如有）
- Transaction-Id AVP（如有，仅在 Session-Id 不存在时适用）


*参数*


- *avps_json* (string) - 一个 JSON 数组，包含要放入应答消息中的 AVP（示例见下）。
- *is_error* (boolean, default: *false*) - 设为 *true* 以在应答消息中设置 'E'（错误）位。


*返回码*


- **1** - 成功
- **-1** - 内部错误


该函数只能在 *EVENT_ROUTE* 中使用。


```opensips title="dm_send_answer() 用法"
event_route [E_DM_REQUEST] {
  xlog("Req: $param(sess_id) / $param(app_id) / $param(cmd_code)\n");
  xlog("AVPs: $param(avps_json)\n");

  $json(avps) := $param(avps_json);

  /* ... 处理数据（AVP）... */

  /* ... 并附带更多 AVP 回复！ */
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


### 导出的异步函数 {#exported-asynchronous-functions}


#### dm_send_request(app_id, cmd_code, avps_json, [rpl_avps_pv])


与 [dm_send_request()](#dm_send_requestapp_id-cmd_code-avps_json-rpl_avps_pv) 类似，但执行的是异步 Diameter 请求。


使用与 [dm_send_request()](#dm_send_requestapp_id-cmd_code-avps_json-rpl_avps_pv) 相同的参数和返回码。


```opensips title="dm_send_request 异步用法"
# 为 My Diameter Application (42) 构建并发送一条
# My-Custom-Request (92001)
$var(payload) = "[
	{ \"Origin-Host\": \"client.diameter.test\" },
	{ \"Origin-Realm\": \"diameter.test\" },
	{ \"Destination-Realm\": \"diameter.test\" },
	{ \"Sip-From-Tag\": \"dc93-4fba-91db\" },
	{ \"Sip-To-Tag\": \"ae12-47d6-816a\" },
	{ \"Acct-Session-Id\": \"a59c-dff0d9efd167\" },
	{ \"Sip-Call-Duration\": 6 },
	{ \"Sip-Call-Setuptime\": 1 },
	{ \"Sip-Call-Created\": 1652372541 },
	{ \"Sip-Call-MSDuration\": 5850 },
	{ \"out_gw\": \"GW-774\" },
	{ \"cost\": \"10.84\" },
	{ \"Cost-Information\": [
		{\"Unit-Value\": [{\"Value-Digits\": 1000}]},
		{\"Currency-Code\": 35}
		]}
]";

async(dm_send_request(42, 92001, $var(payload), $var(rpl_avps), dm_reply);

route[dm_reply] {
	xlog("rc: $retcode, AVPs: $var(rpl_avps)\n");
	$json(avps) := $var(rpl_avps);
}
```


### 导出的事件 {#exported-events}


#### E_DM_REQUEST {#e_dm_request}


当 *aaa_diameter* 模块已加载，且 OpenSIPS 在配置的 Diameter 监听接口上收到 Diameter 请求时，将触发该事件。


参数：


- *app_id (integer)* - Diameter 应用程序标识符
- *cmd_code (integer)* - Diameter 命令代码
- *sess_id (string)* - *Session-Id* AVP、*Transaction-Id* AVP 的值；若 Diameter 请求中这两个用于标识事务的 AVP 都不存在，则为 *NULL* 值。
- *avps_json (string)* - 一个 JSON 数组，包含该请求的 AVP。使用 [json](/zh/modules/json) 模块的 **$json** 变量可轻松解析并处理它。


注意，该事件目前主要设计为由 *event_route* 使用，因为这是访问 [dm_send_answer()](#dm_send_answeravps_json-is_error) 函数以构建自定义应答消息的唯一途径。另一方面，如果应用不在意应答始终是 3001（DIAMETER_COMMAND_UNSUPPORTED）错误，该事件可以通过任何其他兼容 EVI 的投递通道成功使用 ☺️
<!-- CONTRIBUTORS -->

### 许可证 {#license}

本项目的所有文档文件（即 .md 扩展名的文件）均以 Creative Common License 4.0 授权。
