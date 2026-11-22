---
title: "脚本助手用法"
description: "介绍 script_helper 模块如何让初学者以简化的脚本格式上手 OpenSIPS 脚本，并透明地处理顺序请求与对话。"
---

# 脚本助手用法 {#script-helper-usage}

参见模块：[Script Helper](https://docs.opensips.org/manual/devel/modules/script_helper)

## 教程概述 {#tutorial-overview}

该模块的目的是帮助你以简便的方式上手 OpenSIPS 脚本。由于初学者可以从简化的脚本格式入手，学习曲线变得更为平缓——其思路是把主要关注点转移到 SIP 初始请求的路由（它定义了服务逻辑）上，同时透明地处理大量「标准」的 SIP 脚本逻辑，从而既节省编写脚本的时间，又减少潜在的 SIP 脚本错误。本教程既简要介绍该新模块的特性，也给出一个示例脚本。

## 当前特性 {#current-features}

正如[文档](/zh/modules/script_helper)所述，该模块目前具备以下特性：

* **透明处理 SIP 顺序请求**

  * 顺序请求会被妥善且静默地处理——它们不再会进入脚本
  * 对于初始 SIP 请求，模块会执行 record-routing（即 OpenSIPS 通过 *Record-Route* 头域把自己加入信令路径），随后像以往一样触发主路由
  * 对于顺序 SIP 请求，模块会自动执行 loose_route() 以正确路由。
  * 可选地，可以在所有顺序请求被路由出去之前运行一个特殊路由
* **自动的对话支持**

  * 自动为基于 INVITE 的会话创建对话支持
  * 对于对话内的顺序请求，如果基于 'did' 的快捷 Record-Route 参数匹配失败，将尝试完整的对话匹配（Call-ID、From-tag、To-tag）

该模块的未来方向包括增加鉴权与 NAT 支持。

## 示例脚本 {#example-script}

提供的 SIP 逻辑：

* 简单的标准 SIP-2-SIP 呼叫（含注册）
* 初始与顺序 SIP 请求的路由（使用脚本助手）
* 对话支持（使用脚本助手）

### 脚本示例 {#scripting-examples}

这是带 script_helper 支持的 OpenSIPS 脚本。

[OpenSIPS script with the script_helper support](../manual/devel/modules/.samples/script_helper/samples/opensips-script-helper.cfg "include")

你可以把它与不带 script_helper 支持的常规 OpenSIPS 脚本对照。

[regular OpenSIPS script without the script_helper support](../manual/devel/modules/.samples/script_helper/samples/opensips-regular.cfg "include")

### 脚本差异 {#scripts-differences}

```diff
--- modules/script_helper/samples/opensips-regular.cfg	2026-07-21 13:11:53.483884563 +0300
+++ modules/script_helper/samples/opensips-script-helper.cfg	2026-07-21 13:11:47.175918222 +0300
@@ -95,6 +95,13 @@
 loadmodule "dialog.so"
 modparam("dialog", "db_mode", 0) # 不使用数据库

+#### SCRIPT HELPER 模块
+loadmodule "script_helper.so"
+# 该路由会在顺序请求被路由出去之前运行
+modparam("script_helper", "sequential_route", "my_seq_route")
+modparam("script_helper", "use_dialog", 1)
+modparam("script_helper", "create_dialog_flags", "bye-on-timeout,options-ping-caller,options-ping-callee")
+
 loadmodule "proto_udp.so"
 
 
@@ -109,44 +116,6 @@
 		exit;
 	}
 
-	if (has_totag()) {
-
-		# 处理逐跳 ACK（无需路由）
-		if ( is_method("ACK") && t_check_trans() ) {
-			t_relay();
-			exit;
-		}
-
-		# 对话内的顺序请求应当
-		# 沿 record-routing 所确定的路径前进
-		if ( !loose_route() ) {
-			# 我们对所有流量都做 record-routing，因此不应
-			# 收到任何不带 Route 头域的顺序请求。
-			send_reply(404,"Not here");
-			exit;
-		}
-
-		if (is_method("BYE")) {
-			# 即使事务失败也进行计费
-			do_accounting("log","failed");
-		}
-
-		# 把它路由出去，目的地由 loose_route() 设置在
-		# $du（目的 URI）中。
-		route(relay);
-		exit;
-	}
-
-	# CANCEL 处理
-	if (is_method("CANCEL")) {
-		if (t_check_trans())
-			t_relay();
-		exit;
-	}
-
-	# 吸收重传，但不创建事务
-	t_check_trans();
-
 	if ( !(is_method("REGISTER")  ) ) {
 		if (is_myself("$fd")) {
 					
@@ -159,19 +128,6 @@
 		}
 	}
 
-	# 预加载路由检查
-	if (loose_route()) {
-		xlog("L_ERR",
-			"Attempt to route with preloaded Route's [$fu/$tu/$ru/$ci]");
-		if (!is_method("ACK"))
-			send_reply(403,"Preload Route denied");
-		exit;
-	}
-
-	# 记录路由
-	if (!is_method("REGISTER|MESSAGE"))
-		record_route();
-
 	# 仅对 INVITE 计费
 	if (is_method("INVITE")) {
 		do_accounting("log","cdr");
@@ -214,6 +170,13 @@
 }
 
 
+route [my_seq_route]
+{
+	xlog("---- Sequential request handler ---- \n");
+	xlog("$rm | Call-ID: $ci | From-tag: $ft | To-tag: $tt\n");
+}
+
+
 route[relay] {
 	# 为 INVITE 启用一些额外的助手路由
 	if (is_method("INVITE")) {
```
