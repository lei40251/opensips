---
title: "Sangoma 语音转码"
description: "本教程说明如何使用 sngtc_server 守护进程与作为其客户端的 OpenSIPS sngtc 模块，借助 Sangoma 生产的 D 系列板卡完成音频转码。"
---

![tc setup](/public/uploads/tc-setup.png)

## 教程概述 {#tutorial-overview}

本教程说明如何使用 *sngtc_server* 守护进程以及作为其客户端的 OpenSIPS *sngtc* 模块，借助 Sangoma 生产的 D 系列板卡完成音频转码。截至 2013 年 8 月 1 日，转码库的最新版本为：**sng-tc-linux-1.3.4.1**

  

> [!WARNING]
> 正如[模块文档](/zh/modules/sngtc)中所述，只有当 UAC 执行早期 SDP 协商且 UAS 支持延迟 SDP 协商时，才能进行转码。

---

### 安装转码板卡 {#installing-the-transcoding-card}

D 系列转码板卡所需的固件可以使用 *sngtc_tool* 配置。需要 PCI 连接的板卡（D100 和 D500）还需要额外的内核驱动。安装教程请参考 [Sangoma wiki](http://wiki.sangoma.com/Sangoma-Media-Transcoding-Product-Selection)。

---

#### 配置 *sngtc_server* {#setting-up-the-sngtc_server}

安装 *sngtc_server* 很直接，[Sangoma wiki](http://wiki.sangoma.com/FreeSWITCH-D100-Single-Server-Installation) 中也有相关说明。完成配置后，可以使用 init 脚本启动它：
```bash

   $ /etc/init.d/sngtc_server_ctrl start

```
默认情况下，它记录日志到 /var/log/sngtc_server.log

---

#### 使用 *sngtc* OpenSIPS 模块的呼叫流程 {#call-flow-with-the-sngtc-opensips-module}

由于转码库的限制，只有在编解码 A 与编解码 B 都已知的情况下才能创建转码会话。由于标准 SIP 呼叫流程无法做到这一点，该模块*限制*接收方 UA 执行*延迟 SDP 协商*。下图对此作了更好的说明：

![dialog establish tc](/public/uploads/dialog-establish-tc.png)

---

#### 使用 *sngtc* 模块 {#using-the-sngtc-module}

**sngtc 模块**导出 3 个函数。它们在收到 INVITE、200 OK 和 ACK 消息时被调用。它们用途的简要概述如下：
* sngtc_offer - 在任何 INVITE 请求（包括 re-INVITE）时调用，删除 INVITE 的 SDP 消息体
* sngtc_callee_answer - 在 200 OK 应答时调用，对编解码提议取交集，必要时创建转码会话
* sngtc_caller_answer - 在 ACK 请求时调用，为 ACK 请求添加 SDP 消息体

所有函数都能正确处理重传。更多细节可在[模块文档](https://docs.opensips.org/manual/devel/modules/uri/)中找到。下面给出一个基本的配置文件：

  

```opensips
####### 全局参数 #########

log_level=3
xlog_level=3
stderror_enabled=yes
syslog_enabled=no
syslog_facility=LOG_LOCAL0

udp_workers=4

socket=udp:127.0.0.1:5060

####### 模块 ########

mpath = "modules/"

loadmodule "exec.so"
loadmodule "signaling.so"
loadmodule "sl.so"
loadmodule "maxfwd.so"
loadmodule "sipmsgops.so"
loadmodule "db_mysql.so"
loadmodule "registrar.so"
loadmodule "sngtc.so"

loadmodule "tm.so"
modparam("tm", "fr_timeout", 5)
modparam("tm", "fr_inv_timeout", 30)
modparam("tm", "restart_fr_on_each_reply", 0)
modparam("tm", "disable_6xx_block", 1)
modparam("tm", "onreply_avp_mode", 1)

#### Record Route 模块
loadmodule "rr.so"
/* 不要向 RR 追加 from 标签（本脚本无此需要） */
modparam("rr", "append_fromtag", 0)

#### FIFO 管理接口
loadmodule "mi_fifo.so"
modparam("mi_fifo", "fifo_name", "/var/tmp/opensips_fifo")
modparam("mi_fifo", "fifo_mode", 0666)

#### DIALOG 模块
loadmodule "dialog.so"
modparam("dialog", "db_mode", 0)
modparam("dialog", "default_timeout", 3600)

#### USeR LOCation（用户位置）模块
loadmodule "usrloc.so"
modparam("usrloc", "working_mode_preset", "single-instance-no-db")
modparam("usrloc", "db_url",	"mysql://opensips:opensipsrw@localhost/opensips")

loadmodule "proto_udp.so"

####### 路由逻辑 ########

route {

	if (!mf_process_maxfwd_header(10)) {
		sl_send_reply(483, "Too Many Hops");
		exit;
	}

	force_rport();

	if (has_totag()) {
		# 对话内的顺序请求应
		# 沿 record-routing 确定的路径发送

		if (loose_route()) {

			if (is_method("BYE")) {
				setsflag(FAIL_TRANS_FLAG);
			} else if (is_method("INVITE")) {
				sngtc_offer();
			} else if (is_method("ACK")) {
				sngtc_caller_answer();
			}

			# 按 loose_route() 设置的目标转发出去
			# （目标 URI 位于 $du 中）。
			route(relay);
		} else {

			if (is_method("ACK")) {
				if (t_check_trans()) {
					# 非松散路由，但有状态 ACK；必须是上游服务器
					# 的 487 或 404 等应答之后的 ACK
					t_relay();
					exit;
				} else {
					# 没有匹配事务的 ACK ->
					# 忽略并丢弃
					exit;
				}
			}
			sl_send_reply(404, "Not here");
		}
		exit;
	}

	# 处理 CANCEL
	if (is_method("CANCEL")) {
		if (t_check_trans())
			t_relay();
		exit;
	}

	# 吸收重传，但不创建事务
	t_check_trans();

	# 检查预加载路由
	if (loose_route()) {
		xlog("L_ERR",
			"Attempt to route with preloaded Route's [$fu/$tu/$ru/$ci]");
		if (!is_method("ACK"))
			send_reply(403, "Preload Route denied");
		exit;
	}

	# 记录路由
	if (!is_method("REGISTER|MESSAGE"))
		record_route();

	# 发往本域的请求
	if (is_method("PUBLISH|SUBSCRIBE")) {
		send_reply(503, "Service Unavailable");
		exit;
	}

	if (is_method("REGISTER")) {
		if (!save("location"))
			sl_reply_error();

		exit;
	}

	if (!$rU) {
		# RURI 中没有用户名的请求
		send_reply(484, "Address Incomplete");
		exit;
	}

	# 带方法过滤的查找
	if (!lookup("location","method-filtering")) {
		t_reply(404, "Not Found");
		exit;
	}

	if (is_method("INVITE"))
		sngtc_offer();

	route(relay);
}

route[relay] {
	# 对 INVITE 启用一些额外的辅助路由
	if (is_method("INVITE")) {
		t_on_reply("handle_answer");
		t_on_failure("missed_call");
	}

	if (!t_relay()) {
		send_reply(500, "Internal Error");
	}

	exit;
}

onreply_route[handle_answer] {
	if ($rs == 200)
		sngtc_callee_answer("11.12.13.14", "11.12.13.14");
}

failure_route[missed_call] {
	if (t_was_cancelled()) {
		exit;
	}

	if (next_branches()) {
		t_on_reply("handle_answer");
		t_on_failure("missed_call");
		t_relay();
	}
}
```

Sangoma 板卡上的转码会话基于对话回调，以透明的方式关闭。
