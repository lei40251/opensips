---
title: "SIP 重定向服务器"
description: "如何将 OpenSIPS 用作 SIP 重定向服务器：原理与示例。"
---

SIP 重定向服务器是一种以 30x 状态码应答的 SIP 服务器，其应答中的 **CONTACT** 携带一组 SIP URI，用作所收到请求中所指示 URI 的替代目标。

OpenSIPS 可以配置为 SIP 重定向服务器。在脚本层面生成要插入 30x 应答的 **CONTACT** 头域，有两种简单方式：

* 在脚本层面通过字符串操作手动构造 CONTACT 头域
* 使用消息分支，即通过 [$msg.branch](/zh/manual/Script-CoreVar#msg.branch) 系列变量

应答部分很简单，可以用 **TM** 模块提供的 **[t_reply()](< /manual/devel/modules/tm/#func_t_reply>)** 函数完成。当然，也可以使用 **SL** 模块的 **[sl_send_reply()](/zh/modules/sl#func_sl_send_reply)** 函数以无状态方式完成。

```opensips
t_reply( 302, "Temporary redirected");
```

可以重定向到一个或多个 SIP URI（位于 **CONTACT** 头域中）。这些 SIP URI 可以是脚本中自定义逻辑的最终结果，例如从数据库加载、从 REST HTTP 服务查询、从注册服务器数据库获取等。

## 手动构造 CONTACT {#building-the-contact-manually}

在这段代码中，我将重定向服务限制为仅处理 INVITE 请求，并按 IP 范围限制（仅为示例之目的）。

这里假设我们使用 [sql_query()](/zh/modules/sqlops#func_sql_query) 函数从数据库加载 SIP URI。在本例中，我们根据收到的 R-URI 用户名进行查询，尝试找到呼叫应重定向到的 SIP 网关列表（以 SIP URI 形式）（类似于一个简单的 LCR）。

```opensips
route {
    if ( $(si{ip.matches,192.168.1.1/24})==1 && $rm=="INVITE") {
    
        # 用 SQL 查询加载 GW 集合与优先级（Q 值）
        sql_query("select gw_uri,gw_prio from lcr_table where destination_did='$rU'",
  "$avp(gw_uri);$avp(gw_prio)");
        if ($rc<0) {
            t_reply( 404, "Destination not found");
            exit;
        }
        
        # 这里得到一组 GW URI 与 GW PRIO（数量相同），
        # 需要加到 Contact 头域中。
        $var(i) = 0;
        $var(hdr) = "";
        while ( $(avp(gw_uri)[$var(i)])!=NULL ) {

            # 我们将每组 GW 与 PRIO 添加为 ", <gw_uri>;q=val"
            if ($var(i)!=0)
              $var(hdr) = $var(hdr) + ", ";
            $var(hdr) = $var(hdr) + "<"+$(avp(gw_uri)[$var(i)])+">;q="+$(avp(gw_prio)[$var(i)]);
            
            # 移动到下一组 GW + PRIO
            $var(i) = $var(i) + 1;
        }
        
        # 添加 Contact 头域
        append_to_reply("Contact: $var(hdr)\r\n");
        
        # 立即发送应答
        t_reply( 302,"LCR Redirect");
    } else {
        send_reply( 403, "You are not allowed here!" );
    }
    exit;
}
```

## 通过 $msg.branch 构造 CONTACT {#building-the-contact-via-msgbranch}

负责构造 SIP 应答（有状态与无状态）的内部核心函数有一个有趣的、鲜为人知的行为：

*如果存在任何消息分支，那么在构造 30x 应答时，它会自动将它们写入 CONTACT 头域*。

因此，你只需将新的 URI 写入消息分支，它们就会被自动进一步写入 30x 应答的 CONTACT 中。

此外，还有若干模块会通过这种消息分支查询并返回多个新的 SIP 分支（SIP URI）（参见用于 SIP 注册查找的 **[lookup("location")](/zh/modules/registrar#func_lookup)**，或 **[alias_db_lookup()](modules/devel/alias_db/#func_alias_db_lookup)**）

```opensips
route {
    if ( $(si{ip.matches,192.168.1.1/24})==1 && $rm=="INVITE") {
    
        # 执行注册查找，找出该用户的所有注册记录
        if ( lookup( "location", "to-branches-only") ) {
        
            # 用户的注册记录已被写入消息分支，
            # 连同 Q 值、套接字等全部信息
            xlog("found branches are < $(msg.branch.uri[*]) >\n");
        }
        
        # 现在直接发送应答，消息分支会自动
        # 作为 CONTACT 写入应答中
        t_reply( 302,"LCR Redirect");
    } else {
        send_reply( 403, "You are not allowed here!" );
    }
    exit;
}
```

另外，如果回到第一个示例（手动构造 CONTACT 的那个），下面是使用消息分支的对应脚本。

```opensips
route {
    if ( $(si{ip.matches,192.168.1.1/24})==1 && $rm=="INVITE") {
    
        # 用 SQL 查询加载 GW 集合与优先级（Q 值）
        sql_query("select gw_uri,gw_prio from lcr_table where destination_did='$rU'",
  "$avp(gw_uri);$avp(gw_prio)");
        if ($rc<0) {
            t_reply( 404, "Destination not found");
            exit;
        }
        
        # 这里得到一组 GW URI 与 GW PRIO（数量相同），
        # 需要加到 Contact 头域中。
        while ( $avp(gw_uri)!=NULL ) {
        
            # 添加 SIP URI
            $msg.branch = $avp(gw_uri);
            # 以及 Q 值
            $msg.branch.q = $avp(gw_prio);
            
            # 删除刚用过的值
            $avp(gw_uri) = NULL;
            $avp(gw_prio) = NULL;
            
        }
        
        # 立即发送应答
        t_reply( 302,"LCR Redirect");
    } else {
        send_reply( 403, "You are not allowed here!" );
    }
    exit;
}
```
