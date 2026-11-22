---
title: "diversion 模块"
description: "本模块按照 draft-levy-sip-diversion-08 实现 Diversion 扩展。"
sidebar: false
---

## 管理指南 {#admin-guide}


### 概述 {#overview}


本模块按照 draft-levy-sip-diversion-08 实现 Diversion 扩展。在各种涉及呼叫前转的
场景中，Diversion 扩展都很有用。通常需要把呼叫的原始接收者告知 PSTN 网关，
这正是 Diversion 扩展的用途。


> [!WARNING]
> draft-levy-sip-diversion-08 已过期！！
> 参见 [IETF I-D tracker](https://datatracker.ietf.org/public/idindex.cgi?command=id_detail&and;id=6002)。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


无。


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，必须安装以下库或应用程序：


- *无*。


### 导出的参数 {#exported-parameters}


#### suffix (string)


追加到头域末尾的后缀。可以使用该参数指定要添加到头域的附加参数，参见示例。


*默认值为 ""（空字符串）。*


```opensips title="suffix 用法"
modparam("diversion", "suffix", ";privacy=full")
```


### 导出的函数 {#exported-functions}


#### add_diversion(reason, [uri], [counter])


该函数在消息中任何其他已有的 Diversion 头域之前新增一个 Diversion 头域
（新添加的 Diversion 头域将成为最顶层的 Diversion 头域）。将使用入向的
Request-URI（未经代理服务器做任何修改）作为 Diversion URI。


各参数含义如下：


- *reason* (string) - 作为 reason 参数添加的原因字符串
- *uri* (string, optional) - 要添加到头域中的 URI。如果缺省，将使用原始消息中
未经修改的 RURI。
- *counter* (int, optional) - 要添加到头域的 Diversion 计数器，由标准定义。


该函数可在 REQUEST_ROUTE、FAILURE_ROUTE 中使用。


```opensips title="add_diversion 用法"
...
add_diversion("user-busy");
...
```


### Diversion 示例 {#diversion-example}


下面的示例展示了添加到 INVITE 消息中的 Diversion 头域。sip:bob@sip.org 的用户代理
收到的原始 INVITE 为：


```c
INVITE sip:bob@sip.org SIP/2.0
Via: SIP/2.0/UDP 1.2.3.4:5060
From: "mark" <sip:mark@sip.org>;tag=ldgheoihege
To: "Bob" <sip:bob@sip.org>
Call-ID: adgasdkgjhkjha@1.2.3.4
CSeq: 3 INVITE
Contact: <sip:mark@1.2.3.4>
Content-Length: 0
```


由于该用户正在与其他人通话，sip:bob@sip.org 的用户代理把 INVITE 消息改向，
新的目的地是 sip:alice@sip.org：


```c
INVITE sip:alice@sip.org SIP/2.0
Via: SIP/2.0/UDP 5.6.7.8:5060
Via: SIP/2.0/UDP 1.2.3.4:5060
From: "mark" <sip:mark@sip.org>;tag=ldgheoihege
To: "Bob" <sip:bob@sip.org>
Call-ID: adgasdkgjhkjha@1.2.3.4
CSeq: 3 INVITE
Diversion: <sip:bob@sip.org>;reason=user-busy
Contact: <sip:mark@1.2.3.4>
Content-Length: 0
```


## 开发者指南 {#developer-guide}


按照规范，新的 Diversion 头域应作为消息中最顶层的 Diversion 头域插入，
也就是说，位于消息中任何其他已有的 Diversion 头域之前。此外，`add_diversion` 函数
可以被多次调用，每次都应把新的 Diversion 头域插入为最顶层的一个。


为实现这一点，add_diversion 函数把 data_lump 列表中的锚点创建为静态变量，
以确保该函数的下一次调用使用同一个锚点，并把新的 Diversion 头域插入到上一次执行时
创建的头域之前。据我所知，这是把 Diversion 头域插入到该函数此前各次运行所创建的任何
头域之前的唯一方式。


以这种方式保存的锚点只对单条消息有效，当正在处理另一条消息时必须使其失效。
为此，该函数还把消息的 id 存储在另一个静态变量中，并把该变量的值与正在处理的 SIP
消息的 id 比较。如果两者不同，锚点就会失效，函数会创建一个新锚点。


下面的代码片段展示了使锚点失效的代码，当 `anchor` 变量被设为 0 时会创建新锚点。


```c
static inline int add_diversion_helper(struct sip_msg* msg, str* s)
{
    static struct lump* anchor = 0;
    static int msg_id = 0;

    if (msg_id != msg->id) {
        msg_id = msg->id;
        anchor = 0;
    }
...
}
```
<!-- CONTRIBUTORS -->

### 许可证 {#license}

本项目的所有文档文件（即 .md 扩展名的文件）均以 Creative Common License 4.0 授权。
