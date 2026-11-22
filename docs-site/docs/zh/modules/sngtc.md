---
title: "sngtc 模块"
description: "**Sangoma 转码模块**可以用 [Sangoma 制造的 D 系列转码卡](https://wiki.sangoma.com/display/MTC/Media+Transcoding) 执行语音转码。"
sidebar: false
---

## 管理指南 {#admin-guide}


### 概述 {#overview}


**Sangoma 转码模块**可以用
[Sangoma
制造的 D 系列转码卡](https://wiki.sangoma.com/display/MTC/Media+Transcoding) 执行语音转码。本模块利用
Sangoma Transcoding API
在专用设备上管理转码会话。为了让网络中的卡
能够被发现，Sangoma SOAP 服务器必须已启动并
运行（*sngtc_server* 守护进程）。


### 工作原理 {#how-it-works}


本模块会对 SIP INVITE、
200 OK 和 ACK 消息的 SDP 消息体做若干修改。在所有转码场景中，UAC 执行早期
SDP 协商，而 UAS 执行晚期协商。这样，OpenSIPS
便负责求编解码器 offer 与 answer 的交集，并
管理 Sangoma 卡上的转码会话。


该场景带来几项
**限制**：


- UAC 只能执行早期 SDP 协商
- UAS 必须支持晚期 SDP 协商（rfc 3261 的要求）


由于 *sngtc_node* 库在每次新建转码会话时
都会进行大量内存分配，本模块使用一个
专用进程负责管理上述会话。
*sangoma_worker* 进程通过一系列管道与 OpenSIPS
的 UDP 接收器通信。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


在使用本模块之前必须加载
以下模块：


- *dialog*。


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行
OpenSIPS 之前，必须安装以下库或应用程序：


- *sngtc_node 库 - [从 Sangoma 下载](https://wiki.freepbx.org/display/MTC/Media+Transcoding+Download)，
解包，make，make install（编译本模块所必需）*。
- *sngtc_server 已启动并运行（本模块正常工作
所必需）*。


### 导出的函数 {#exported-functions}


#### sngtc_offer()


该函数会剥离 SIP INVITE 中的 SDP offer，从而
向对端请求另一个 SDP offer（晚期协商）。

可能返回以下**错误码**：


- *-1* - SDP 解析错误
- *-3* - 内部错误 / 内存不足


该函数可在 REQUEST_ROUTE、ONREPLY_ROUTE 中使用。


```opensips title="sngtc_offer 用法"
...
	if (is_method("INVITE")) {
		t_newtran();
		create_dialog();
		sngtc_offer();
	}
...
```


#### sngtc_callee_answer([listen_if_A], [listen_if_B])


处理 200 OK 应答中的 SDP offer，将双方的 offer 与
转码卡的能力求交集，并且**仅在**必要时在卡上创建新的转码
会话。随后它会重写 200 OK 的 SDP，使其
包含编解码器交集所得到的信息。


**参数**说明：


由于 D 系列转码卡通过 PCI 插槽或普通以太网接口连接，
无法为它们分配全局 IP。因此，本模块会在发往各端点的
SDP answer 中写入卡的本地私有 IP。由于这在非本地 UA
场景下无法工作，可选参数会强制指定每个 UA 的 RTP 监听
接口。这样，脚本编写者就可以为入向 RTP 强制使用全局 IP
（可将其端口转发到转码卡）。


- *listen_if_A* (string) - 呼叫建立后 UAC（主叫）发送 RTP 的接口（取自 'c=' SDP 行的 IP）
- *listen_if_B* (string) - 呼叫建立后 UAS（被叫）发送 RTP 的接口（取自 'c=' SDP 行的 IP）


可能返回以下**错误码**：


- *-1* - SDP 解析错误
- *-2* - 创建转码会话失败
- *-3* - 内部错误 / 内存不足


该函数可在 REQUEST_ROUTE、ONREPLY_ROUTE 中使用。


```opensips title="sngtc_callee_answer 用法"
...
onreply_route[1] {
	if ($rs == 200)
		sngtc_callee_answer("11.12.13.14", "11.12.13.14");
}
...
```


#### sngtc_caller_answer()


在主叫的 ACK 请求中附加 SDP 消息体，使其
与 UAS 所执行的晚期 SDP 协商相匹配。


可能返回以下**错误码**：


- *-3* - 内部错误 / 内存不足


该函数可在 REQUEST_ROUTE、ONREPLY_ROUTE 中使用。


```opensips title="sngtc_caller_answer 用法"
...
	if (has_totag()) {
		if (loose_route()) {
			...
			if (is_method("ACK"))
				sngtc_caller_answer();
		}
		...
	}
...
```
<!-- CONTRIBUTORS -->

### 许可证 {#license}

所有文档文件（即以 .md 为扩展名的文件）均按 Creative Common License 4.0 许可发布
