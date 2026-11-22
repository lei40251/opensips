---
title: "uac 模块"
description: "UAC（User Agent Client）模块提供了一些基本的 UAC 功能，例如 FROM / TO 头域操作（匿名化）或客户端鉴权。"
sidebar: false
---


## 管理指南 {#admin-guide}


### 概述 {#overview}


UAC（User Agent Client）模块提供了一些基本的 UAC
功能，例如 FROM / TO 头域操作（匿名化）
或客户端鉴权。


如果已加载 dialog 模块且可以创建对话，
则自动模式可以更高效地完成。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


在加载本模块之前，必须加载以下模块：


- *TM - 事务模块*。
- *RR - Record-Route 模块*，如果 FROM
URI 的恢复模式设置为 "auto"，或者配置脚本中任何位置
使用了 uac_auth()。在这两种情况下，都必须启用
rr 模块的 "append_fromtag" 参数：uac 需要
Record-Route 中的 from-tag 来判断顺序请求的方向，
并相应地递增 CSeq。该参数默认为 1，但随软件包提供的
opensips.cfg 以及 examples/templates/ 下的脚本将其
设置为 0。
- *UAC_AUTH - UAC 鉴权模块*。
- *Dialog 模块*，如果启用了 "force_dialog"
模块参数，或者从
配置脚本创建了对话。


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，必须安装
以下库或应用程序：


- *无*


### 导出的参数 {#exported-parameters}


#### restore_mode (string)


恢复原始头域（FROM/TO）URI 共有 3 种模式：


- "none" - 不存储关于原始 URI 的任何
信息；无法恢复。
- "manual" - 将恢复所有后续应答，
但顺序请求除外 —— 这些请求必须基于
原始 URI 手动更新。
- "auto" - 所有顺序请求和应答都将
基于已存储的原始 URI 自动更新。


*该参数是可选的，其默认值为
"auto"。*


```opensips title="Set restore_mode parameter"
...
modparam("uac","restore_mode","auto")
...
```


#### restore_passwd (string)


用于加密 RR 存储参数（在替换 TO/FROM 头域时）
的字符串密码。如果为空，则不使用
加密。


*该参数的默认值为空。*


```opensips title="Set restore_passwd parameter"
...
modparam("uac","restore_passwd","my_secret_passwd")
...
```


#### rr_from_store_param (string)


用于存储（编码后的）原始 FROM URI 的 Record-Route
头域参数名。


*该参数是可选的，其默认值为
"vsf"。*


```opensips title="Set rr_from_store_param parameter"
...
modparam("uac","rr_from_store_param","my_Fparam")
...
```


#### rr_to_store_param (string)


用于存储（编码后的）原始 TO URI 的 Record-Route
头域参数名。


*该参数是可选的，其默认值为
"vst"。*


```opensips title="Set rr_to_store_param parameter"
...
modparam("uac","rr_to_store_param","my_Tparam")
...
```


#### force_dialog (int)


如果配置脚本中未创建对话，则强制
创建对话。


默认值为 no。


```opensips title="Set force_dialog parameter"
...
modparam("uac", "force_dialog", yes)
...
```


### 导出的函数 {#exported-functions}


#### uac_replace_from([display],uri) uac_replace_to([display],uri)


替换 FROM/TO 头域中的 *display* 名称和/或
*URI* 部分。


两个参数都是字符串。*display* 是可选的。
如果缺失，则只更改消息中的 URI。


> [!IMPORTANT]
> 每个分支调用该函数超过一次会导致
> 请求出现不一致的更改。请确保每个分支只进行
> 一次更改。请注意，从 REQUEST
> ROUTE 调用该函数会影响所有分支！，因此之后将无法
> 再进行其他任何更改。若需按分支更改，请使用 BRANCH 和
> FAILURE 路由。


该函数可在 REQUEST_ROUTE、BRANCH_ROUTE 和
FAILURE_ROUTE 中使用。


```opensips title="uac_replace_from/uac_replace_to usage"
...
# 同时替换 display 和 uri
uac_replace_from($avp(display),$avp(uri));
# 只替换 display，不动 uri
uac_replace_from("batman","");
# 移除 display 并替换 uri
uac_replace_from("","sip:robin@gotham.org");
# 移除 display，不动 uri
uac_replace_from("","");
# 替换 URI 而不动 display
uac_replace_from( , "sip:batman@gotham.org");
...
			
```


#### uac_restore_from() uac_restore_to()


该函数会检查 FROM/TO URI 是否已被修改，并使用
头域参数中存储的信息来恢复
原始 FROM/TO URI 值。


> [!NOTE]
> 仅当你配置了头域的手动恢复
> （MANUAL，参见 restore_mode 参数）时才应使用该函数。对于 AUTO
> 和 NONE，无需使用该函数。


该函数可在 REQUEST_ROUTE 中使用。


```opensips title="uac_restore_from/uac_restore_to usage"
...
uac_restore_from();
...
```


#### uac_auth()


该函数只能从失败路由中调用，它将
构建鉴权应答头域并将其插入
请求，而不发送任何内容。
构建鉴权应答所需的凭据取自
uac_auth 模块提供的凭据列表（静态定义
或通过 AVP 提供）。


作为可选参数，该函数可以接受一个在鉴权过程中
要考虑 / 支持的鉴权算法列表：


- MD5、MD5-sess
- SHA-256、SHA-256-sess（可能缺失，取决于库支持）
- SHA-512-256、SHA-512-256-sess（可能缺失，取决于库支持）


> [!NOTE]
> 在鉴权过程中 CSeq 会自动递增。


该函数可在 FAILURE_ROUTE 中使用。


> [!NOTE]
> 在没有对话支持的情况下使用时，
> *uac_auth()* 函数无法用于对对话中（in-dialog）请求
> 进行鉴权，因为没有机制来存储为确保
> 对话正确性所需的 CSeq 变更。唯一的例外是
> *BYE* 消息，它们是呼叫中的最后一条消息，
> 因此无需进一步调整。不过，该函数仍可用于
> 对初始 INVITE 进行鉴权。


```opensips title="uac_auth usage"
...
uac_auth();
...
failure_route[check_auth] {
    ...
    if ($T_reply_code==407) {
        if (uac_auth("MD5,MD5-sess")) {
            # 鉴权成功，直接中继
            t_relay();
            exit;
        }
        # 鉴权失败（可能没有凭据）
        # 因此继续处理 407 应答
    }
    ...
}
...
			
```


#### uac_inc_cseq()


可以调用该函数来增加正在进行的请求的 CSeq。


它接受 *cseq* 参数作为 CSeq 应
递增的值。


该函数可在 REQUEST_ROUTE、BRANCH_ROUTE 和 FAILURE_ROUTE 中使用。


```opensips title="uac_inc_cseq usage"
...
uac_inc_cseq(1);
...
```


## 常见问题 {#frequently-asked-questions}


**问：auth_username_avp、auth_realm_avp 和 auth_password_avp 参数怎么了？**


由于 UAC 鉴权模块的一些重构，这些参数被移到了 "uac_auth" 模块中。
该模块现在负责处理所有凭据（静态定义或通过 AVP
动态定义）。UAC 模块仍会看到通过 AVP 定义的凭据。


**问：在哪里可以了解更多关于 OpenSIPS 的信息？**


看看 [https://opensips.org/](https://opensips.org/)。


**问：在哪里可以就该模块提问？**


首先请检查你的问题是否已在我们的某个邮件列表中
得到了回答：

关于任何稳定版 OpenSIPS 发布的邮件应发送至
users@lists.opensips.org，关于开发版本的邮件
应发送至 devel@lists.opensips.org。

如果你希望邮件保持私密，请发送至
users@lists.opensips.org。


**问：如何报告缺陷？**


请遵循以下地址提供的指南：
[https://github.com/OpenSIPS/opensips/issues](https://github.com/OpenSIPS/opensips/issues)。
<!-- CONTRIBUTORS -->

### 许可证 {#license}

所有文档文件（即 .md 扩展名）均按 Creative Common License 4.0 许可发布。
