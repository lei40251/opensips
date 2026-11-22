---
title: "脚本语句"
description: "在构建路由逻辑时可在 OpenSIPS 配置文件中使用的语句。"
---

在构建路由逻辑时，可在 **OpenSIPS** 配置文件中使用的语句。

## if

IF-ELSE 语句

语法原型：

```opensips

    if (expr) {
       actions;
    } else {
       actions;
    }

```

'expr' 应为合法的逻辑表达式。

逻辑表达式中可使用的逻辑运算符：

* == - 等于
* != - 不等于
* =~ - 正则表达式匹配（例如 `$rU` =~ '^1800*' 表示“`$rU` 以 1800 开头”）
* !~ - 正则表达式不匹配
* \> - 大于
* \>= - 大于等于
* \< - 小于
* \<= - 小于等于
* && - 逻辑与
* || - 逻辑或
* ! - 逻辑非
* [ ... ] - 测试运算符 —— 内部可以是任意算术表达式

使用示例：

```opensips

    if ( is_method("INVITE") && $rp==5060 )
    {
        log("this sip message is an invite\n");
    } else {
        log("this sip message is not an invite\n");
    }

```

## switch

SWITCH 语句 —— 可用于测试伪变量的值。

重要说明：'break' 只能用于标记 'case' 分支的结束（与 shell 脚本中相同）。如果在 'case' 块之外使用 'break'，脚本将返回错误 —— 此时必须使用 'return'。

使用示例：
```opensips

    route {
        route(my_logic);
        switch ($retcode) {
        case -1:
            log("process INVITE requests here\n");
            break;
        case 1:
            log("process REGISTER requests here\n");
            break;
        case 2:
        case 3:
            log("process SUBSCRIBE and NOTIFY requests here\n");
            break;
        default:
            log("process other requests here\n");
       }

        # 对 R-URI 用户名做 switch
        switch ($rU) {
        case "101":
            log("destination number is 101\n");
            break;
        case "102":
            log("destination number is 102\n"); # 继续执行 103 和 104
        case "103":
        case "104":
            log("destination number is 103 or 104\n");
            break;
        default:
            log("unknown destination number\n");
       }
    }

    route [my_logic] {
        if (is_method("INVITE"))
            return(-1);

        if (is_method("REGISTER"))
            return(1);

        if (is_method("SUBSCRIBE"))
            return(2);

        if (is_method("NOTIFY"))
            return(3);

        return(-2);
    }

```

> [!WARNING]
> 使用 'return' 时需小心 —— 'return(0)' 会终止脚本执行。

## while

while 语句

使用示例：
```opensips

    $var(i) = 0;
    $var(cli) = NULL;
    while ($var(i) < 10) {
        if ($(avp(valid_clis[$var(i)]) == $fU) {
            xlog("matched the From user!\n");
            $var(cli) = $fU;
            break;
        }
        $var(i) = $var(i) + 1;
    }

```

## for each

for each 语句 —— 用于便捷地遍历索引变量或伪变量

使用示例：
```opensips

    $avp(arr) = 0;
    $avp(arr) = 1;
    $avp(arr) = 2;
    $avp(arr) = 3;
    $avp(arr) = 4;

    for ($var(it) in $(avp(arr)[*]))
        xlog("array value: $var(it)\n");

    # 遍历每个 Contact 头域中的所有 Contact URI
    for ($var(ct) in $(ct[*]))
        xlog("Contact: $var(ct)\n");

    # 遍历 SIP 请求的所有 Via 头域
    for ($var(via) in $(hdr(Via)[*]))
        xlog("Found \"Via\" header: $var(via)\n");

    # 遍历 MongoDB 查询返回的所有 JSON 文档
    cache_raw_query("mongodb:location", "{... find ...}", "$avp(res)");
    for ($json(contact) in $(avp(res)[*])) {
        xlog("Found: $json(contact/phone) $json(contact/email)\n");
        
        if ($json(contact/phone) =~ "^40") {
            xlog("found a cheap destination to dial\n");
            break;
        }
    }

```
