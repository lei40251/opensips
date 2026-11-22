---
outline: [2, 3]
title: "核心函数"
description: "本节列出 OpenSIPS 核心导出的所有可在脚本中使用的函数（在 opensips.cfg 中使用）"
---

本节列出 **OpenSIPS** 核心导出的所有可在脚本中使用的函数（在 opensips.cfg 中使用）

## add_local_rport()

向服务器生成的 Via 头域中添加 'rport' 参数（其含义见 RFC3581）。它只影响当前正在处理的请求。

用法示例：

```opensips
add_local_rport();
```

## assert(statement, [description])

仅当 [enable_asserts](./Script-CoreParameters.md#enable_asserts) 被设置为 *true* 时才生效。如果给定的表达式求值为 *false*，脚本执行将被停止，并执行 [error_route](./Script-Routes.md#error-route)。如果启用了 [abort_on_assert](./Script-CoreParameters.md#abort_on_assert)，OpenSIPS 还会关闭。

用法示例：
```opensips

    $var(i) = "1";
    $var(i) += "11";
    assert($var(i) == "111");

    $var(i) = 1;
    $var(i) += 11;
    assert($var(i) == 12);

    assert($ua != "friendly-scanner", "Forbidden UA: \"friendly-scanner\"");

```

## append_branch_old([uri], [qvalue])

> [!WARNING]
> 即将废弃，由 [append_msg_branch()](#append-msg-branch-uri-qvalue-flags) 取代。

添加一个新的消息分支，从而以一个新条目扩展目标集合。其区别在于，当前 URI 被作为新条目。

不带参数时，该函数把当前 URI 复制到一个新分支中。因此，主分支（该 URI）可以留待后续操作。

带参数时，该函数把参数中的 URI 复制到一个新分支中。因此，当前 URI 不会被操作。

注意，如果在 "on_failure_route" 块中此前已收到 6XX 应答，则无法追加新分支（否则将违反 RFC 3261）。

参数：
* *uri*（字符串，可选）
* *qvalue*（字符串，可选）

用法示例：
```opensips

    # 如果某人呼叫 B，该呼叫也应转发给 C。
    #
    if ($rm=="INVITE" && $ru=~"sip:B@xx.xxx.xx ")
    {
        # 把当前分支（branches[0]）复制到
        # 一个新分支（branches[1]）
        append_branch_old();
        # 所有 URI 操作函数都作用于 branches[0]
        # 因此，URI 操作不会影响
        # 已追加的分支（branches[1]）
        seturi("sip:C@domain");
        
        # 现在：branch 0 = C@domain
        #      branch 1 = B@xx.xx.xx.xx
        
        # 如果需要第三个目标……
        
        # 把当前分支（branches[0]）复制到
        # 一个新分支（branches[2]）
        append_branch_old();
        
        # 所有 URI 操作函数都作用于 branches[0]
        # 因此，URI 操作不会影响
        # 已追加的分支（branches[1-2]）
        seturi("sip:D@domain");
        
        # 现在：branch 0 = D@domain
        #      branch 1 = B@xx.xx.xx.xx
        #      branch 2 = C@domain
        
        t_relay();
        exit;
    };

    # 也可以使用 append_branch_old("sip:C@domain")，它会以新 URI 添加一个分支：
    
    
    if ($rm == "INVITE" && $ru =~ "sip:B@xx.xxx.xx ") {
        # 以第二个目标追加一个新分支
        append_branch_old("sip:user@domain");
        # 现在：branch 0 = B@xx.xx.xx.xx
        # 现在：branch 1 = C@domain

        t_relay();
        exit;
    }

```

## append_msg_branch(uri, [qvalue], [flags])

添加一个新的消息分支。最基本的信息是该分支的 SIP URI。可选地，可以提供一个 q 值。

可选的 "inherite" 标志可指定其他分支属性（duri、q、path、socket、bflags）是否从 RURI 分支继承。如果不继承，则所有这些属性在新创建的分支中均为 NULL（该分支将只有 RURI 字段，别无其他）。

## avp_print()

打印内存中所有 AVP 的列表。这只是一个辅助/调试函数。

## cache_store(storage_id, attribute, value, [timeout])

在类内存缓存的存储系统中为某个属性设置新值。如果该属性尚不在 memcache 中，将以给定的值插入；如果已存在，其值将被替换为新值。该函数可选地接受一个额外参数，即属性的超时（或生存期）值 —— 超出生存期后，该属性会自动从 memcache 中清除。如果省略 "timeout"，或者其值为 0，则该属性/值对永不过期。

如果新属性插入成功，函数返回 true。

参数：
* *storage_id*（字符串）
* *attribute*（字符串）
* *value*（字符串）
* *timeout*（整型，可选）

```opensips

cache_store("local", "total_minutes_$fU", $avp(mins), 1200);

# 对于由 Redis 支持的高速缓存：
modparam("cachedb_redis", "cachedb_url", "redis:cluster1://192.168.4.134:6379/");
cache_store("redis:cluster1", "passwd_$tu", $var(x));

```

更复杂的示例参见 [键值接口教程](https://docs.opensips.org/tutorials/keyvalueinterface/)。

## cache_remove(storage_id, attribute)

从类内存缓存的存储系统中移除一个属性。仅当 *storage_id* 无效时，函数才返回 false。

参数：
* *storage_id*（字符串）
* *attribute*（字符串）

```opensips

cache_remove("local", "total_minutes_$fU");

# 对于由 Redis 支持的高速缓存：
modparam("cachedb_redis", "cachedb_url", "redis:cluster1://192.168.4.134:6379/");
cache_remove("redis:cluster1", "total_minutes_$fU");

```

更复杂的示例参见 [键值接口教程](https://docs.opensips.org/tutorials/keyvalueinterface/)。

## cache_fetch(storage_id, attribute, result)

从类内存缓存的存储系统中获取某个属性的值。获取成功时，结果将存入由 **result_pv** 指定的变量中。

如果找到该属性并成功返回其值，函数返回 *true*。

参数：
* *storage_id*（字符串）
* *attribute*（字符串）
* *result_pv*（变量）

```opensips

cache_fetch("local", "credit_$fU", $var(ret));

# 对于由 Redis 支持的高速缓存：
modparam("cachedb_redis", "cachedb_url", "redis:cluster1://192.168.4.134:6379/");
cache_fetch("redis:cluster1", "credit_$fU", $var(ret));

```

更复杂的示例参见 [键值接口教程](https://docs.opensips.org/tutorials/keyvalueinterface/)。

## cache_counter_fetch(storage_id, counter_attribute, result)

该函数从类内存缓存的存储系统中获取某个计数器的值。结果（如果有）将存入由 **result** 指定的变量中。

如果找到该属性并返回其值，函数返回 true。

参数：
* *storage_id*（字符串）
* *attribute*（字符串）
* *result*（变量）

```opensips

cache_counter_fetch("local", "my_counter", $var(counter_val));

# 对于由 Redis 支持的高速缓存：
modparam("cachedb_redis", "cachedb_url", "redis:cluster1://192.168.4.134:6379/");
cache_counter_fetch("redis:cluster1", "my_counter", $var(redis_counter_val));

```

## cache_add( storage_id, attribute, increment, expire, [new_val])

该函数在支持此类操作的类内存缓存存储系统中递增某个属性。如果该属性不存在，将以 **increment** 的值创建它。

如果递增失败，函数返回 false。

参数：
* *storage_id*（字符串）
* *attribute*（字符串）
* *increment*（整型）
* *expire*（整型）—— 如果大于 0，该键还将在指定的秒数后过期
* *new_val*（变量，可选）—— 用于获取计数器新值的变量。

```opensips

modparam("cachedb_redis", "cachedb_url", "redis:cluster1://192.168.4.134:6379/");
cache_add("redis:cluster1", "my_counter", 5, 0);

```

更复杂的示例参见 [键值接口教程](https://docs.opensips.org/tutorials/keyvalueinterface/)。

## cache_sub(storage_id, attribute, decrement, expire, [new_val])

该函数在支持此类操作的类内存缓存存储系统中递减某个属性。

如果递减失败，函数返回 false。

参数：
* *storage_id*（字符串）
* *attribute*（字符串）
* *increment*（整型）
* *expire*（整型）—— 如果大于 0，该键还将在指定的秒数后过期
* *new_val*（变量，可选）—— 用于获取计数器新值的变量。

```opensips

modparam("cachedb_redis", "cachedb_url", "redis:cluster1://192.168.4.134:6379/");
cache_sub("redis:cluster1", "my_counter", 5, 0);

```

更复杂的示例参见 [键值接口教程](https://docs.opensips.org/tutorials/keyvalueinterface/)。

## cache_raw_query(storage_id, raw_query, result)

该函数执行所提供的原始查询（使用后端相关的语言），并在 *result* 中给出的 AVP（或 AVP 列表）里返回结果（如果有）。如果查询不返回任何结果，该参数可以省略。

如果查询失败，函数返回 false。

参数：
* *storage_id*（字符串）
* *raw_query*（字符串）
* *result*（字符串，可选，不展开）

```opensips

cache_raw_query("mongodb", "{ \"op\" : \"count\",\"query\": { \"username\" : $rU} }", "$avp(mongo_count_result)");

```

更复杂的示例参见 [键值接口教程](https://docs.opensips.org/tutorials/keyvalueinterface/)。

## break()

自 v0.10.0-dev3 起，'break' 不再能用于停止路由的执行。唯一可用的场合是结束 'switch' 语句中的 'case' 块。现在必须用 'return' 代替旧的 'break'。

现在 'return' 和 'break' 的含义与 c/shell 中类似。

## construct_uri(proto,[user],domain,[port],[extra],result)
该函数根据接收到的参数构建一个合法的 sip uri。结果（如果有）将存入 **result** AVP 变量中。
如果想省略 sip uri 的某一部分，只需省略相应的参数即可。

参数：
* *proto*（字符串）
* *user*（字符串，可选）
* *domain*（字符串）
* *port*（字符串，可选）
* *extra*（字符串，可选）
* *result*（变量）

用法示例：
```opensips

construct_uri("$var(proto)", "vlad", "$var(domain)", "", "$var(params)",$avp(s:newuri));
xlog("Constructed URI is <$avp(s:newuri)> \n");

```

## drop()

停止配置脚本的执行，并改变随后执行的隐式动作。

如果在 'branch_route' 中调用该函数，则该分支被丢弃（'branch_route' 的隐式动作是转发请求）。

如果在 'onreply_route' 中调用该函数，则丢弃任何临时应答（'onreply_route' 的隐式动作是根据 Via 头域将应答向上游发送）。

用法示例：

```opensips
onreply_route {
if($rs=="183") {
drop();
}
}
```

## exit()

停止配置脚本的执行 —— 其行为与 return(0) 相同。它不影响脚本执行后要采取的隐式动作。

```opensips
route {
if (route(CHECK_METHOD)) {
xlog("L_NOTICE","method $rm is INVITE\n");
} else {
xlog("L_NOTICE","method is $rm\n");
};
}
```

```opensips
route[CHECK_METHOD] {
if (is_method("INVITE")) {
return(1);
} else if (is_method("REGISTER")) {
return(-1);
} else if (is_method("MESSAGE")) {
sl_send_reply(403, "IM not allowed");
exit;
};
}
```

## force_rport()
Force_rport() 将 rport 参数添加到第一个 Via 头域。这样，即使客户端未表明支持 rport，**OpenSIPS** 也会把收到的 IP 端口添加到 SIP 消息中最顶层的 via 头域。这使得后续 SIP 消息在 SIP 事务稍后的阶段能够返回到正确的端口。

rport 参数定义于 RFC 3581。

用法示例：

```opensips
force_rport();
```

## force_send_socket(proto:address[:port])

强制 **OpenSIPS** 从指定的套接字发送消息（它 _必须_ 是 **OpenSIPS** 所监听的套接字之一）。如果协议不匹配（例如把 UDP 消息“强制”到 TCP 套接字），则使用同一协议中最接近的套接字。

参数：
* *socket*（字符串）

用法示例：

```opensips
force_send_socket("tcp:10.10.10.10:5060");
```

## force_tcp_alias([port_alias])

为当前 TLS（或 WSS、TCP、WS）连接（源 IP + **源端口** + 传输层）启用 TCP 连接复用（RFC 5923），无论 Via 头域中是否含有 *";alias"* 参数。只要该连接保持打开，所有发往同一（源 IP + **Via 端口** + 传输层）组合的反向 SIP 请求都将被强制通过该连接。该函数（以及 RFC 5923）的主要目的是尽量减少 SIP 代理必须建立的 TLS 连接数量，因为 TLS 加密套件协商阶段会带来可观的 CPU 开销。

参数：
* *port_alias*（整型，可选）

  

> [!WARNING]
> 不要为终端用户发起的连接（这类连接很可能归组在一个或多个公网 IP 之下）执行 **force_tcp_alias()**，因为这会产生一个可被利用来进行呼叫劫持的开放途径！

## forward(destination)

以无状态模式把 SIP 请求转发到给定目标。格式为 [proto:]host[:port]。Host 可以是 IP 或主机名；支持的协议为 UDP、TCP 和 TLS。（对于 TLS，需要把 TLS 支持编译进核心）。
如果未指定 proto 或 port，将使用 NAPTR 和 SRV 查询来确定它们（如果可能）。

参数：
* *destination*（字符串，可选）—— 如果缺失，将基于 RURI 进行转发。

用法示例：

```opensips
forward("10.0.0.10:5060");
#或者
forward();
```

## get_timestamp(sec_avp,usec_avp)

通过一次系统调用返回当前时间戳，即当前秒的秒数和微秒数。

参数：
* *sec_avp*（变量）
* *usec_avp*（变量）

用法示例：

```opensips
get_timestamp($avp(sec),$avp(usec));
```

## isdsturiset()

测试 dst_uri 字段（下一跳地址）是否已设置。

用法示例：

```opensips
if(isdsturiset()) {
log("dst_uri is set\n");
};
```

## isflagset(string)

测试当前正在处理的消息是否设置了某个标志位。

更多内容参见 [标志位文档](Script-Flags.md)。

参数：
* *flag*（字符串，静态）

用法示例：

```opensips

    if (isflagset("NAT_PING"))
        log("flag NAT_PING is set\n");

```

## isbflagset(flag, [branch_idx])

测试某个特定分支是否设置了某个标志位。"branch_idx" 指明要测试标志位的分支 —— 它必须是一个正数。分支索引 0 指向 RURI 分支。如果缺少该参数，则默认使用 0 作为分支索引。

关于脚本标志位的更多内容，参见 [标志位文档](Script-Flags.md)。

参数：
* *flag*（字符串，静态）
* *branch_idx*（整型，可选）

用法示例：

```opensips

    if (isbflagset("NAT_PING", 1))
        log("flag NAT_PING is set in branch 1\n");

```

## is_myself(host, [port])

测试 host 以及可选的 port 是否代表 OpenSIPS 所监听的地址之一。它会检查 OpenSIPS 配置文件中设置过的本地 IP 地址、主机名和别名列表。

参数：
* host（字符串）
* port（整型，可选）

用法示例：

```opensips
if (is_myself($rd, $rp)) {
    xlog("the request is for local processing\n");
}
```

## log([level,] string)

把文本消息写入标准错误终端或 syslog。可以把日志级别指定为第一个参数。

用法示例：

```opensips
log("just some text message\n");
```

## move_msg_branch([src_idx], [dst_idx] [, keep])

把附加在 **src_idx** 分支上的全部信息移动到 **dst_idx** 分支。**src_idx** 和 **dst_idx** 都应是整型值，并且应代表合法的分支索引。如果未提供它们，或它们的值为负数，则视为消息主分支。
默认情况下，该函数在移动之后会删除 **src_idx** 分支，并把其后的所有剩余分支前移。但如果函数的第三个参数是 **keep** 字符串，则不删除该分支，只把它复制到 **dst_idx** 分支。

## next_branches()

向请求中添加一个新的目标集合，其中包含来自已序列化分支（参见 serialize_branches()）的所有最高优先级类别联系人（基于 'q' 值）。如果从路由块中调用，它会用第一个联系人重写请求 URI，并把其余联系人作为并行分支添加。如果从失败路由块中调用，则把所有联系人作为并行分支添加。所有用到的联系人都会从已序列化分支中移除。

如果至少有一个联系人被添加到请求的目标集合中，则返回 true —— 如果还有其他分支待处理则返回 1，如果已没有其他分支可供后续处理则返回 2 —— 简而言之，返回 2 表示这是最后一个分支，返回 1 表示后面还有其他分支。如果什么都没做（没有更多已序列化分支），则返回 false。

用法示例：

```opensips
next_branches();
```

## prefix(str)

在 R-URI 中的用户名前面加上字符串参数。

参数：
* *str*（字符串）

用法示例：

```opensips
prefix("00");
```

## pv_printf(pv, fmt_str)

把格式化字符串 'fmt_str' 打印到 AVP 'pv' 中。'fmt_str' 参数可以包含 **OpenSIPS** 中定义的任何伪变量。'pv' 可以是任何可写的伪变量 —— 例如：AVP、VAR、`$ru`、`$rU`、`$rd`、`$du`、`$br`、`$fs.`

参数：
* *pv*（变量）
* *string*（字符串）

用法示例：

```opensips
pv_printf($var(x), "r-uri: $ru");
pv_printf($avp(i:3), "from uri: $fu");
```

## raise_event(event, [attrs], [vals])

通过 OpenSIPS 事件接口从脚本中抛出一个事件。

该函数为该事件的所有订阅者触发事件，无论使用的是哪个传输模块。

参数：
* *event*（字符串）—— 应被抛出的事件的名称
* *attrs*（变量，可选）—— 包含属性名称的 AVP；如果缺少该参数而提供了 *vals*，则属性将作为数组（位置）参数写入 JSON-RPC 载荷
* *vals*（变量，可选）—— 包含附加到事件的值的 AVP；如果缺少该参数，则抛出的事件将没有任何属性，即使提供了 *attrs* 参数也是如此。

用法示例（抛出一个无属性的事件）：

```opensips

raise_event("E_NO_PARAM");

```

用法示例（抛出一个带两个属性的事件）：

```opensips

$avp(attr-name) = "param1";
$avp(attr-name) = "param2";
$avp(attr-val) = 1;
$avp(attr-val) = "2";
raise_event("E_TWO_PARAMS", $avp(attr-name), $avp(attr-val));

```

用法示例（抛出一个带两个未命名属性的事件）：

```opensips

$avp(attr-val) = 1;
$avp(attr-val) = "2";
raise_event("E_TWO_PARAMS", , $avp(attr-val));

```

## remove_msg_branch(branch_idx)

移除给定的分支。
分支一旦被移除，其后的所有分支都会前移（即如果移除了分支 n，则原来的 n+1 分支成为新的 n 分支，原来的 n+2 分支成为 n+1，依此类推）。

参数：
* *branch_idx*（整型）

用法示例（移除所有 URI 主机名为 "127.0.0.1" 的分支）：

```opensips

$var(i) = 0;
while ($(branch(uri)[$var(i)]) != null) {
   xlog("L_INFO","$$(branch(uri)[$var(i)])=[$(branch(uri)[$var(i)])]\n");
   if ($(branch(uri)[$var(i)]{uri.host}) == "127.0.0.1") {
       xlog("L_INFO","removing branch $var(i) with URI=[$(branch(uri)[$var(i)])]\n");
       remove_msg_branch($var(i));
   } else {
       $var(i) = $var(i) + 1;
   }
}

```

## return(int)

return() 函数允许从被调用的 route() 块中返回任意整型值。
可以使用 "`$retcode`" 变量测试路由返回的值。

return(0) 与 "exit()" 相同；

在布尔表达式中：

  * 负数和零为 FALSE
  * 正数为 TRUE

用法示例：

```opensips

route {
  if (route(CHECK_METHOD)) {
    xlog("L_NOTICE","method $rm is INVITE\n");
  } else {
    xlog("L_NOTICE","method $rm is REGISTER\n");
  };
}

```
```opensips

route[CHECK_METHOD] {
  if (is_method("INVITE")) {
    return(1);
  } else if (is_method("REGISTER")) {
    return(-1);
  } else {
    return(0);
  };
}

```

## resetdsturi()

把 dst_uri 字段的值设置为 NULL。如果联系人地址位于 NAT 之后，dst_uri 字段通常在 loose_route() 或 lookup("location") 之后被设置。

用法示例：

```opensips
resetdsturi();
```

## resetflag(flag)

重置当前正在处理的消息的标志位（取消其值）。

更多内容参见 [标志位文档](Script-Flags.md)。

参数：
* *flags*（字符串，静态）

用法示例：

```opensips

    resetflag("NAT_PING");

```

## resetbflag(flag, [branch_idx])

重置某个特定分支的标志位（取消其值）。"branch_idx" 指明要重置标志位的分支 —— 它必须是一个正数。分支索引 0 指向 RURI 分支。如果缺少该参数，则默认使用 0 作为分支索引。

参数：
* *flag*（字符串，静态）
* *branch_idx*（整型，可选）

关于脚本标志位的更多内容，参见 [标志位文档](Script-Flags.md)。

用法示例：
```opensips

    resetbflag("NAT_PING", 1);
    # 或者
    resetbflag("NAT_PING"); # 等同于 resetbflag("NAT_PING", 0)

```

## revert_uri()

把 R-URI 设置为服务器收到该请求时 R-URI 的值（撤销所有对 R-URI 的修改）。

用法示例：

```opensips
revert_uri();
```

## set_via_handling(flags)

用函数参数的值重写 R-URI 的域部分。R-URI 的其他部分（如用户名、端口和 URI 参数）保持不变。

参数：
* *flags*（字符串）—— 以逗号分隔的命名标志位列表
  * `force-rport` —— 把 rport 参数添加到第一个 Via 头域；这样，即使客户端未表明支持 rport，**OpenSIPS** 也会把收到的 IP 端口添加到 SIP 消息中最顶层的 via 头域。这使得后续 SIP 消息在 SIP 事务稍后的阶段能够返回到正确的端口。
  * `add-local-rport `—— 向服务器生成的 Via 头域中添加 'rport' 参数（其含义见 RFC3581）；它只影响当前正在处理的请求。
  * `reply-to-via` —— 把应答路由回顶层 VIA 中的 IP:port，而不是请求的源 IP:port
  * `force-tcp-alias` —— 参见 [force_tcp_alias()](#force-tcp-alias-port-alias) 函数

用法示例：

```opensips
set_via_handling("force-rport,reply-to-via");
```

## sethost(host)

用函数参数的值重写 R-URI 的域部分。R-URI 的其他部分（如用户名、端口和 URI 参数）保持不变。

参数：
* *host*（字符串）

用法示例：

```opensips
sethost("1.3.6.4");
```

## sethostport(hostport)

用函数参数的值重写 R-URI 的域部分和端口。R-URI 的其他部分（如用户名和 URI 参数）保持不变。

参数：
* *hostport*（字符串）

用法示例：

```opensips
sethostport("1.3.6.4:5080");
```

## setuser(user)

用函数参数的值重写 R-URI 的用户部分。

参数：
* *user*（字符串）

用法示例：

```opensips
setuser("newuser");
```

## setuserpass(pass)

用函数参数的值重写 R-URI 的密码部分。

参数：
* *pass*（字符串）

用法示例：

```opensips
setuserpass("my_secret_passwd");
```

## setport(port)

用函数参数的值重写/设置 R-URI 的端口部分。

参数：
* *port*（字符串）

用法示例：

```opensips
setport("5070");
```

## seturi(str)

重写请求 URI。

参数：
* *uri*（字符串）

用法示例：

```opensips
seturi("sip:test@opensips.org");
```

## route(name [, param1 [, param2 [, ...] ] ] )

该函数用于运行脚本中声明的 `name` 路由中的代码。可选地，它可以接收若干参数（最多 7 个），这些参数随后可通过 `$param(idx)` 伪变量获取。

路由名的格式为标识符，而参数可以是整型、字符串或伪变量。

用法示例：

```opensips
route(HANDLE_SEQUENTIALS);
route(HANDLE_SEQUENTIALS, 1, "param", $var(param));
```

## script_trace([log_level, pv_format_string, [info]])

该函数启动脚本跟踪，帮助你更好地理解 OpenSIPS 脚本中的执行流程，例如哪个函数被执行、在哪一行执行。随着脚本执行的推进，还可以跟踪伪变量的值。

启用了脚本跟踪的脚本块会为每一个单独执行的动作打印一行（例如赋值、条件测试、模块函数、核心函数等）。通过指定 **pv_format_string**（例如 "`$ru`---`$avp(var1)`"）可以监视多个伪变量。

通过指定一个额外的普通字符串 —— **info_string** —— 作为第 3 个参数，可以区分（标记）脚本中多个/不同被跟踪区域所产生的日志。

要关闭脚本跟踪，调用 `script_trace()`。否则，跟踪将在顶层路由结束时自动停止。

参数：
* *log_level*（整型，可选）
* *pv_format_string*（字符串，可选）
* *info*（字符串，静态，可选）

用法示例：
```opensips
script_trace( 1, "$rm from $si, ruri=$ru", "me");
```

将输出：
```opensips

    [line 578][me][module consume_credentials] -> (INVITE from 127.0.0.1 , ruri=sip:111211@opensips.org)
    [line 581][me][core setbflag] -> (INVITE from 127.0.0.1 , ruri=sip:111211@opensips.org)
    [line 583][me][assign equal] -> (INVITE from 127.0.0.1 , ruri=sip:111211@opensips.org)
    [line 592][me][core if] -> (INVITE from 127.0.0.1 , ruri=sip:tester@opensips.org)
    [line 585][me][module is_avp_set] -> (INVITE from 127.0.0.1 , ruri=sip:tester@opensips.org)
    [line 589][me][core if] -> (INVITE from 127.0.0.1 , ruri=sip:tester@opensips.org)
    [line 586][me][module is_method] -> (INVITE from 127.0.0.1 , ruri=sip:tester@opensips.org)
    [line 587][me][module trace_dialog] -> (INVITE 127.0.0.1 , ruri=sip:tester@opensips.org)
    [line 590][me][core setflag] -> (INVITE from 127.0.0.1 , ruri=sip:tester@opensips.org) 

```

## send(destination [, headers])

以无状态模式把原始 SIP 消息发送到指定目标。其定义为 [proto:]host[:port]。除指定 headers 参数外，不对收到的消息做任何修改，也不添加 Via 头域。Host 可以是 IP 或主机名；支持的协议为 UDP、TCP 和 TLS。（对于 TLS，需要把 TLS 支持编译进核心）。如果未指定 proto 或 port，将使用 NAPTR 和 SRV 查询来确定它们（如果可能）。headers 参数应以 '\r\n' 结尾。

参数：
* *destination*（字符串）
* *headers*（字符串，可选）

用法示例：

```opensips
send("udp:10.10.10.10:5070");
send("udp:10.10.10.10:5070", "Server: opensips\r\n");
```

## serialize_branches(clear_previous[, keep_order])

取得当前已添加的所有用于并行分叉的分支（例如通过 lookup() 或 append_msg_branch() 添加的），以及当前分支（R-URI（`$ru`）/ 出站代理（`$du`）/ q 值（`$ru_q`）/ 分支标志位 / 强制 Path 头域 / 强制发送套接字），并把它们改为准备用于串行分叉。排序按 "q" 值递减进行。已序列化的分支在内部存储在 "`$avp(serial_branch)`" AVP 中 —— 这使得它们可以被 "next_branches()" 函数操作，通常是在失败路由中。

  

注意（根据 RFC3261），具有相同 "q" 值的分支在串行分叉的某一步骤中仍会并行分叉（这将导致串行分叉与并行分叉的组合）。换言之，该函数会清除所有已添加的分支，并在它们具有相同的最高 "q" 值时不断重新添加它们，同时把所有其他"低于最高 q"的分支放入 "`$avp(serial_branch)`"。在每次调用 "next_branches()" 函数时也会发生类似的分组过程。

  

注意，该函数不会改变当前分支（R-URI、出站代理等）—— 它只是用上述分支准备一个串行分叉集合。你可能需要在调用该函数之后立即调用 "next_branches()"，参见下面的示例。

参数：
* *clear_previous*（整型）—— 如果设置为非零值，则在开始新集合之前删除另一次 "serialize_branches()" 的所有先前结果（已不再需要的串行分叉集合）
* *keep_order*（整型，可选）—— 如果设置为非零值，则已添加的分支以及当前分支将严格按照它们的现有顺序进行序列化。

用法示例：

```opensips

    if (!lookup("location")) {
        t_reply(480, "Temporarily Unavailable");
        exit;
    }

    serialize_branches(1);
    next_branches(); # 从已序列化的分支集合中弹出 R-URI

```

## set_advertised_address(adv_addr)

与 'advertised_address' 相同，但它只影响当前消息。如果 'advertised_address' 也被设置，则它优先。

参数：
* *adv_addr*（字符串）

用法示例：

```opensips
set_advertised_address("opensips.org");
```

## set_advertised_port(adv_port)

与 'advertised_port' 相同，但它只影响当前消息。它优先于 'advertised_port'。

参数：
* *adv_port*（字符串）

用法示例：

```opensips
set_advertised_port("5080");
```

## setdsturi(uri)

显式地把 dst_uri 字段设置为参数的值。该参数必须是合法的 SIP URI。

参数：
* *uri*（字符串）

用法示例：

```opensips
setdsturi("sip:10.10.10.10:5090");
```

## setflag(flag)

为当前正在处理的消息设置标志位。标志位用于标记消息以进行特殊处理（例如对位于 NAT 之后的联系人进行 ping 探测、TCP 连接行为等），或用于保存某种状态（例如消息已鉴权）。OpenSIPS 脚本最多支持 32 个唯一的字符串标志位。

参数：
* *flag*（字符串，静态）

用法示例：

```opensips

    setflag("NAT_PING");

```

## setbflag(flag, [branch_idx])

为某个特定分支设置标志位。"branch_idx" 指明要为其设置标志位的分支 —— 它必须是一个正数。分支索引 0 指向 RURI 分支。如果缺少该参数，则默认使用 0 作为分支索引。OpenSIPS 脚本最多支持 32 个唯一的字符串分支标志位。

关于脚本标志位的更多内容，参见 [标志位文档](Script-Flags.md)。

参数：
* *flag*（字符串，静态）
* *branch_idx*（整型，可选）

用法示例：

```opensips

    setbflag("NAT_PING", 1);
    # 或者
    setbflag("NAT_PING"); # 等同于 setbflag("NAT_PING", 0)

```

## sr_check_status( group, [identifier])

用于检查某个 'status/report' 标识符状态的函数。这类检查对于在脚本层面判断模块或核心组件是否就绪（是否能够提供其完整功能）非常有用。

参数：
* *group*（字符串），'status/report' 组的名称（OpenSIPS 核心导出的组名为 "core"，而各模块可以以其名称导出组。
* *identifier*（字符串，可选），要检查的标识符名称（有哪些可用标识符取决于导出该组的一方）。该标识符可能的值有：
  * (1) 某个标识符的名称
  * (2) NULL，指代默认的（每组）标识符（在内部转换为 "main" 标识符
  * (3) "all"，指代该组中的所有标识符

返回值视所提供的标识符值而定，可能是：
* (1) 给定标识符的状态
* (2) "main" 标识符的状态
* (3) 所有标识符的聚合状态，即 -1（如果至少有一个标识符的状态为负）或 1（如果所有标识符的状态均为正）

用法示例：

```opensips

    # 检查 "drouting" 模块中的 "pstn" 标识符（"pstn" 分区）是否就绪（数据已完全加载）
    if (sr_check_status( "drouting", "pstn") ) {}

    # 检查 "drouting" 模块中的所有标识符（所有分区）是否就绪（数据已完全加载）
    if (sr_check_status( "drouting", "all") ) {}
    

```

## strip(n)

从 R-URI 的用户名中剥离开头的 N 个字符（N 为参数的值）。

参数：
* *n*（整型）

用法示例：

```text

    strip(3);

```

## strip_tail(n)

从 R-URI 的用户名中剥离结尾的 N 个字符（N 为参数的值）。

参数：
* *n*（整型）

用法示例：

```text
strip_tail(3);
```

## subscribe_event(string, string [, int])

为 OpenSIPS 事件接口订阅某个外部应用以接收特定事件。这用于那些自身无法订阅的传输协议（例如 event_rabbitmq）。如果订阅不过期，该函数只应在 startup_route 中调用一次；如果订阅需要定期续订，则应在定时器路由中调用。

参数：
* *event*（字符串）—— 应通知外部应用的事件名称。
* *socket*（字符串）—— 外部应用的套接字。注意，该套接字应遵循某个已加载的事件接口传输模块的语法（例如：event_datagram、event_rabbitmq）。
* *expire*（整型，可选）—— 订阅的过期时间。如果未提供，则订阅永不过期。

用法示例（永不失效的订阅者，由 RabbitMQ 模块通知）：

```opensips

startup_route {
    subscribe_event("E_PIKE_BLOCKED", "rabbitmq:127.0.0.1/pike");
}

```

用法示例（订阅者每 5 秒过期一次，通过 UDP 通知）：

```opensips

timer_route[SUBSCRIBE_EVENTS, 4] {
    subscribe_event("E_PIKE_BLOCKED", "udp:127.0.0.1:5051", 5);
}

```

## swap_msg_branches([br1_idx], [br2_idx])

交换由 **br1_idx** 和 **br2_idx** 表示的两个分支之间的信息。两个值都应是整型值，并且应代表合法的分支索引。如果未提供它们，或它们的值为负数，则视为消息主分支。

## use_blacklist(bl_name)

启用作为参数接收的 DNS 黑名单名称。其主要用途是防止因 DNS 而向关键 IP（如 GW）发送请求，或避免向已知不可用（临时或永久）的目标发送。

参数：
* *bl_name*（字符串）

```opensips

    use_blacklist("pstn-gws");

```

## unuse_blacklist(bl_name)

禁用作为参数接收的 DNS 黑名单名称。

参数：
* *bl_name*（字符串）

```opensips

    unuse_blacklist("pstn-gws");

```

## check_blacklist_rule([bl_name], ip[, port [, proto]])

检查特定的 proto:ip:port+pattern 是否匹配某个黑名单；如果未指定 *bl_name*，则匹配所有黑名单。

参数：
* *bl_name*（字符串，可选）—— 如果缺失，则将该规则与所有已使用的黑名单进行匹配
* *ip*（字符串）—— 要检查的 IP
* *port*（整型，可选）—— 要检查的端口；如果缺失，则视为 0，只匹配 0 端口的规则
* *proto*（字符串，可选）—— 要检查的协议，或 "any" 表示应检查任意协议；如果缺失，则视为 "any"，只匹配任意协议规则
* *pattern*（字符串，可选）—— 要检查的模式

```opensips

    if (check_blacklist_rule("pstn-gws", $dd, $dp, $dP))
        xlog("REQUEST will be blocked\n");

```

## add_blacklist_rule([bl_name], ip[, port [, proto [, expire]]])

向某个黑名单添加一条 proto:ip:port+pattern 规则。

参数：
* *bl_name*（字符串）—— 要向其添加规则的黑名单
* *ip*（字符串）—— 要添加的 IP；如果该 IP 以 '!' 开头，则整条规则被取反
* *port*（整型，可选）—— 要添加的端口；如果缺失，则使用 0/任意端口
* *proto*（字符串，可选）—— 要添加的协议，或 "any" 表示任意协议；如果缺失，则使用 "any"
* *pattern*（字符串，可选）—— 要添加的模式
* *expire*（整型，可选）—— 如果指定，则给出该规则的过期时间（秒）

```opensips

    add_blacklist_rule("filter", $si, $sp, "udp");

```

## del_blacklist_rule([bl_name], ip[, port [, proto]])

从某个黑名单中移除一条 proto:ip:port+pattern 规则。

参数：
* *bl_name*（字符串）—— 要从中移除规则的黑名单
* *ip*（字符串）—— 要移除的 IP；如果该 IP 以 '!' 开头，则整条规则被取反
* *port*（整型，可选）—— 要移除的端口；如果缺失，则使用 0/任意端口
* *proto*（字符串，可选）—— 要移除的协议，或 "any" 表示任意协议；如果缺失，则使用 "any"
* *pattern*（字符串，可选）—— 要移除的模式

```opensips

    del_blacklist_rule("filter", $si, $sp, "udp");

```

## xlog([log_level, ]format_string)

允许在 OpenSIPS 脚本执行过程中打印各种调试 / 运行时 / 关键消息。*format_string* 参数中包含的所有伪变量都会被展开。可以指定若干可选的日志级别。它们与 syslog 的严重级别相对应。级别命名如下：

* L_ALERT (-3)
* L_CRIT (-2)
* L_ERR (-1) —— 如果省略 log_level，默认使用该级别
* L_WARN (1)
* L_NOTICE (2)
* L_INFO (3)
* L_DBG (4)

  

```opensips

    # 几个 xlog 脚本示例
    xlog("Received $rm from $fu (callid: $ci)\n");
    xlog("L_ERR", "key $var(username) not found in cache!\n");

```
