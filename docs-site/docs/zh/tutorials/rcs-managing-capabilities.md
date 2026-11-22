---
title: "RCS - 能力管理"
description: "RCS（Rich Communication Services，富通信服务）是移动运营商之间、以及电话与运营商之间的通信协议，旨在以更丰富、支持电话簿轮询（用于服务发现）并可传输通话中多媒体的文本消息系统取代 SMS 短信。"
---

## 简介 {#introduction}

RCS（Rich Communication Services，富通信服务）是移动运营商之间、以及电话与运营商之间的通信协议，旨在以更丰富、支持电话簿轮询（用于服务发现）并可传输通话中多媒体的文本消息系统取代 SMS 短信[\[1\]](https://en.wikipedia.org/wiki/Rich_Communication_Services)。

在 SIP 协议层面，RCS 只带来极少量的扩展，因为它所启用的各种服务（例如群聊、文件传输、消息已读回执等）往往依赖同一 RCS 平台中额外的非 SIP 微服务，例如 Web 服务器、专用应用服务器等。绝大多数情况下，每个 RCS 特性在 SIP 中都表现为一个 Contact 头域参数，或一个 Accept-Contact 头域参数（有关该头域的更多信息，参见 [RFC 3841](https://datatracker.ietf.org/doc/html/rfc3841)）。

## 在 opensips.cfg 层面管理能力 {#managing-capabilities-at-opensipscfg-level}

RCS 能力和/或能力偏好可能出现在各种 SIP 请求中。下面是一些 RCS SIP 载荷可能长什么样的示例：

* SIP [REGISTER](https://topaz.github.io/paste/#XQAAAQAaBQAAAAAAAAApEUUI0nzkDSkv/znaTL6ykZtpcqypkKN0qBVE1PQAbbfTHFHr+UXdbmi6oPihCczws0Wkyu89pogRIs8H9kNnIjKzQHe7HnrzlH3zqewNMerQZgPN/UXJzp6c+Qm+PRlMebLg7XGJ9PNf+1+uu2HKg4nNCoiyVD+Rz/GnpD8EJ/tVR2prPqzhnaGDxZSKAvqSeHbCgeALtY4OmpFyEitHePxd9I+wFJRBKkzPuZGtEZunyFC3gE26/gm75M80QDlG57gsTVxzPaaH6+ZsdlBaqAwD76MW3dxTApSysbq3tx9ZeaxDpEOEpp/SWPtaRVP+WUkF49vZiKyAGc1r05WgD80wn/122GMhhudtJIW6xTXbKanL7nNgUHIP+zc2GTTXVK+Pb3i1WtHB7VJZIzaDn2lZkF/OvPSGsFA5kA60bwXhDRashbPuQhPPEjrBCfEc1Z8WsRTsCNwd/EuAEMs7Zcst3LGmnhHC/9PfZ32SYdb00EJ2KXQzFnwUR7aB1WajYJJFsa+mGwERxlXXY5aMH+QitUDSGp7y5KCaopYR1s2mUGZad8LHLX2LkYkVXvxWFLQLdnBM68FgoG2/pSh6a5oIJ2bM/iOG6fMjvr0EtCI/v7XhqvOknEyaEYDYQ1rEZRr7ERQcZCa4GAXqABFdJTUSwFncMYkLrLf12U41v8WYZJlom852bSYNT6xrj2pj+YqC7phawAGwrvlx2QPxtnqRiSzt7UpXNPedFmYwTuuPAaPE5QZyhWzINC8c6qFXdoCm7w3cEM3pq9zO7INZ/H1YBlimYuXtuMw9/PHxWyyXMyWPVroNMC/gr7GX5ec9KC3NmtMos5rMQObpxwl/JNLXsqmmt33CU+WNXZUEyUCbwIIF37iBTidtEROXsbBLT/+RxPUA) 报文
* SIP [SUBSCRIBE](https://topaz.github.io/paste/#XQAAAQAVBwAAAAAAAAAplURHvwauuecl+9dRreHnkbu+pi4nJf/e/L5fr6biVK1uvV48E/iBOlqNnr3hDIAGOi1cfwkY7fg3SVr508OPxcffAqudT4VpauQ4r12PJF1jhFUkH+DzDDKXvl+5UTGvDqHFBr8PC0xzKq1huXLPZq9Gaymx0Q3r2PM/Y2obpytdY7r/WkKSTGCYUFHjB4UxbFSzFYYRhlbpm2S+LZWMr4GcSJ9P7gzcUkDPARCDMJv8SzMeAVf8ufY960A+WuOeW1iycGujJbYyDYwSRLBjOMhrmzXZHdiLeGuVIymYVqmhijNig0yc7yX+B/WHuVC/SUwWMiQ/vgclq9IpOKij0oMuri6qgxoteQQSutigOPEd+d7j81ptWOIu466zWNQoJi3mllL1/r6nYZVhzwsz/TJ4/d0jfenVGDeUbFvWdItfCSsFCeKW+9n/IfNqJozKi/KauY4LK5dAtI5bGSmrxnRuP3kDci5Z51+jYArCQf/0/rKqUc+nd5S7uuANR8RJWpk6vcX1D/Pcunla5u+7owiyylELNMI6U0lsyrsiUAHnixc6YUw2uJomm40TXaCSbdTSfOFxUUi0DEWthS+OqXDODx2etAJRGGa39qlI1eOmCHTc/Cf/jU7vjfDeeM5odARp5nv2H0q5M/ZNG5YeYNExu0ggb9pVxTzIBfrkd332wtnf500wZ+d32seTDEAb6wdxnivmgWCn89q0PJj84zI+t4Y0j+g9JG1mLtrQFTiXmCeOwCxKTE6O0sMrMlpWap4/3b6F8c2aO2n1P2edtkbrNhEg9vlus4raL989+1mlD91febFYWD/i9HG5UUqsiViuTM/VDEm/T2b7Ha0MOpfEGL9KQ8d/SsESZKe0IeT/VP9u4rw9TAUiFLUJ7RAW2ZtrPScu6+ry6dpm0avNVFirhzr7UEhhmpPFsvJZft6Nl3l9UkUuMI1aAJuSZfBD5irc4G7SAFMnm5HOmKEuVL2PyD4Fc9Lya3GWVdIkCcchO0Nr5O+/GL4+VLuiTxVG+e/ymj3aqSX5j5o+YxHPqVtx7lIL/G3BuuyWkqD7BcG9mY6x+29GDzk2VLdV1wfJ7BM9XuzEsRTRfm9Jl47Qm/iuH8L3eEMKkJZv/shYE5WnuG0pt84b3VQOr3qixN85Rfr+Zbqf3ZWayIdP2CrMy4iqxPdSf+HjfjwQ/c/5l+zO+BvDy2sWxfPg3nuKnCwgkiwiWPasvD61KBDWTv/cQ4F/XUZEPOxB6YCZ4nHKCMgNK99vS7yrrPxwbABfWc+Jw9oZE7KZ6dRVlVp3NnyAA+smBjV0qBy6Rg7+K1QRjhG0RVoMiu7/vrc7yg==) 报文
* SIP [OPTIONS](https://topaz.github.io/paste/#XQAAAQDbBQAAAAAAAAAnlAa9JM9YtzjNyc9ny7oKnyE0Q96kMOZG9DhWmddBGbRJ4/KNR1ugdmkNK/Pzh3i6xhVUZvObVrgQL2pZYsOWvlNWOc7pdXbtCt2g0cHqXZ4svhmfn5lSFcHXzOEFtF/yi6xYmW/aOmJgboLQ4DLmVX0JCCgeJMRspZ/vDw3ZgDfnFUBmkW2DqrWMnmSg+4JGWowjxFJ82pXPyhzwRU48cAkb4PBrZIqQXMy8agtVbR6u2lfxrXqIgfEq3qdceCIMmFixQpZmWBr5/rKIf0LWmKh69cgS80NAOJliU+L2pvjZYOfdGu+244f1BS6Q+ekUPPUYr3zE0uE0s53iZBoPDZbduDQROwFAm6q/WY2+r0LBkwCPBYffDhakNEUCNB5SXh7AzZ9DwBdLVJTksGK2uejI7sGaYyR3qzzFk+SRvHQVgoMJhWgqK8atdoST/9QDQU41JGIEaMWk3eRQ7L5g3dI6CwcBiG2eNUSz6eC5iJHhux57N3rmxtmWsvmpysxjMFlLvLNC3PzZNvu7a+Gmc+r+vU4leThrVN7kDsOYsRpiY6cvATTt++gX5oseZhXOh741GKrTbQzjJX82OwV2/uZoEEf06RWSLd4KnkiJl7ITWgcNf7CjmGCJGpg/hUO5K9+anf+FOxBhvfwr7G/cXnrLXH5WDyqNkZ5Dpi41VEK8ZH3ppIi9w8t2NwaNDWCUvO6jx+gKSXkGATOBwZE0MheS1URaXMajIVCzIFVxYNyzeUN4hrBjSPZXcDXPn1t9eXWtL/27CPw3RRE=) 报文

请注意 Contact 与 Accept-Contact 头域后常跟着一长串能力列表。下面是一些用当前最佳实践的 opensips.cfg 脚本技巧来管理这类 RCS 能力列表的示例：

### 遍历所有能力 {#iterating-through-all-capabilities}

```opensips

# 首先，把 Contact 头域中的能力保存到一个变量中，便于后续快速访问
$var(caps) = $(hdr(Contact){nameaddr.params});

# 接着，遍历每个能力并打印其名称与取值
# 注意："+=" 语法仅在 3.1+ 版本的 OpenSIPS 上可用
$var(i) = 0;
while ($(var(caps){s.select,$var(i),;}) != NULL) {
    $var(cap) = $(var(caps){param.name,$var(i)});
    $var(val) = $(var(caps){param.valueat,$var(i)});

    if ($var(cap) != "+g.3gpp.iari-ref") {
        xlog("    $var(cap): $var(val)\n");
    } else {
        # 某些能力（例如 "+g.3gpp.iari-ref"）的取值本身就是一组子能力，因此用嵌套循环逐个处理
        $var(j) = 0;
        while ($(var(val){s.select,$var(j),,}) != NULL) {
             xlog("    +g.3gpp.iari-ref[$var(j)]: $(var(val){s.select,$var(j),,})\n");
             $var(j) += 1;
        }
    }

    $var(i) += 1;
}

```

用上述代码处理前面提到的 OPTIONS 载荷，输出如下：

```text

Mar 29 19:26:46 [67988]     +sip.instance: <urn:gsma:imei:35824005-944763-1>
Mar 29 19:26:46 [67988]     +g.oma.sip-im: 
Mar 29 19:26:46 [67988]     +g.3gpp.iari-ref[0]: urn%3Aurn-7%3A3gpp-application.ims.iari.rcse.im
Mar 29 19:26:46 [67988]     +g.3gpp.iari-ref[1]: urn%3Aurn-7%3A3gpp-application.ims.iari.rcse.ft
Mar 29 19:26:46 [67988]     +g.3gpp.iari-ref[2]: urn%3Aurn-7%3A3gpp-application.ims.iari.rcs.fthttp
Mar 29 19:26:46 [67988]     +g.3gpp.iari-ref[3]: urn%3Aurn-7%3A3gpp-application.ims.iari.rcs.ftthumb
Mar 29 19:26:46 [67988]     +g.3gpp.iari-ref[4]: urn%3Aurn-7%3A3gpp-application.ims.iari.rcs.ext.streaming
Mar 29 19:26:46 [67988]     +g.3gpp.iari-ref[5]: urn%3Aurn-7%3A3gpp-application.ims.iari.rcs.ext.messaging
Mar 29 19:26:46 [67988]     +g.3gpp.icsi-ref: urn%3Aurn-7%3A3gpp-service.ims.icsi.gsma.rcs.extension

```

进阶：若要在使用这些十六进制编码的字符串之前先对其反转义，只需在右侧再串联一个 `{s.unescape.param}` 变换，例如：

```opensips

    xlog("    +g.3gpp.iari-ref[$var(j)]: $(var(val){s.select,$var(j),,}{s.unescape.param})\n");

```

……这将输出：

```text

Mar 29 19:45:53 [80814]     +sip.instance: <urn:gsma:imei:35824005-944763-1>
Mar 29 19:45:53 [80814]     +g.oma.sip-im: 
Mar 29 19:45:53 [80814]     +g.3gpp.iari-ref[0]: urn:urn-7:3gpp-application.ims.iari.rcse.im
Mar 29 19:45:53 [80814]     +g.3gpp.iari-ref[1]: urn:urn-7:3gpp-application.ims.iari.rcse.ft
Mar 29 19:45:53 [80814]     +g.3gpp.iari-ref[2]: urn:urn-7:3gpp-application.ims.iari.rcs.fthttp
Mar 29 19:45:53 [80814]     +g.3gpp.iari-ref[3]: urn:urn-7:3gpp-application.ims.iari.rcs.ftthumb
Mar 29 19:45:53 [80814]     +g.3gpp.iari-ref[4]: urn:urn-7:3gpp-application.ims.iari.rcs.ext.streaming
Mar 29 19:45:53 [80814]     +g.3gpp.iari-ref[5]: urn:urn-7:3gpp-application.ims.iari.rcs.ext.messaging
Mar 29 19:45:53 [80814]     +g.3gpp.icsi-ref: urn:urn-7:3gpp-service.ims.icsi.gsma.rcs.extension

```

### 移除、重排或添加能力 {#removing-re-ordering-or-adding-capabilities}

此用途没有专门的辅助函数，因此这类操作只能通过一次 *[remove_hf()](/zh/modules/sipmsgops#func_remove_hf)* 函数调用，再接一次 *[append_hf()](/zh/modules/sipmsgops#func_append_hf)* 来完成。举例来说，假设我们想移除对 RCS 文件传输的支持（我们的平台不具备该能力），同时始终声明支持 RCS 位置推送（因为我们能够处理这类载荷）。

首先，在遍历过程中过滤掉任何不希望保留的 RCS 文件传输能力：



```opensips

$var(new_caps) = "";

$var(i) = 0;
while ($(var(caps){s.select,$var(i),;}) != NULL) {
    $var(cap) = $(var(caps){param.name,$var(i)});
    $var(val) = $(var(caps){param.valueat,$var(i)});

    if ($var(cap) != "+g.3gpp.iari-ref") {
        if ($var(val))
            $var(new_caps) += $var(cap) + "=" + $var(val) + ";";
        else
            $var(new_caps) += $var(cap) + ";";
    } else {
        # 现在确保从 "iari-ref" 列表中移除所有与文件传输相关的能力
        $var(j) = 0;
        $var(new_iari_ref) = "";
        while ($(var(val){s.select,$var(j),,}) != NULL) {
             $var(subcap) = $(var(val){s.select,$var(j),,}{s.unescape.param});
             if ($var(subcap) !~ "urn:urn-7:3gpp-application.ims.iari.rcse?.ft.*")
                 $var(new_iari_ref) += $(var(subcap){s.escape.param}) + ",";

             $var(j) += 1;
        }

        if ($var(new_iari_ref)) {
            # 确保去掉末尾的逗号
            $var(len) = $(var(new_iari_ref){s.len}) - 1;
            $var(new_caps) += "+g.3gpp.iari-ref=\"" + $(var(new_iari_ref){s.substr,0,$var(len)}) + "\"";
        }
    }

    $var(i) += 1;
}

if ($var(new_caps)) {
    # 确保去掉末尾的分号
    $var(len) = $(var(new_caps){s.len}) - 1;
    $var(new_caps) = $(var(new_caps){s.substr,0,$var(len)});
}

```

接下来，如果想添加新能力，这是一件容易的事：只需把它们追加到 iari_ref 子能力字符串中即可。



最后，用重新处理过的大字符串移除并重新添加 “Accept-Contact” SIP 头域。

```opensips

...
        # 对上面这段稍作改写
        if ($var(new_iari_ref))
            $var(new_caps) += "+g.3gpp.iari-ref=\"" + $(var(new_iari_ref){s.substr,0,$var(len)}) + ",urn%3Aurn-7%3A3gpp-application.ims.iari.rcs.geopush\"";
        else
            $var(new_caps) += "+g.3gpp.iari-ref=\"urn%3Aurn-7%3A3gpp-application.ims.iari.rcs.geopush\"";
...

# 最后，重写 Accept-Contact
remove_hf("Accept-Contact");
append_hf("Accept-Contact: $var(new_caps)\r\n");

```
