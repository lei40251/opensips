---
outline: [2, 3]
title: "脚本变换"
description: "直观地说，变换是作用于变量（脚本变量、伪变量、AVP、静态字符串），从中取出特定值的函数，输入值本身不被改变。"
---

直观地说，**变换**（Transformation）是作用于变量（脚本变量、伪变量、AVP、静态字符串）并从中取出某个特定值的函数。输入值本身不会被改变。

在 **OpenSIPS 脚本**中使用各类变量的示例：

```opensips

# 检查 From 头域中的用户名是否与 To 头域中的用户名相同
if ($fU == $tU) {
   ...
}

# 基于 Request-URI 用户名的处理
switch ($rU) {
   case "1234":
      ...
   break;
   case "5678":
      ...
   break;
   default:
     ...
}

# 为变量赋一个整型值
$var(gw_count) = 1;

# 为 AVP 赋一个字符串值
$avp(server) = "opensips";

# 将 Request-URI 存入变量
$var(ru_backup) = $ru;

# 将 "sip:" + From 用户名 + "@" + To 域 拼接后存入脚本变量 x
$var(x) = "sip:" + $fU + "@" + $td;

```

变换旨在便于访问变量的不同属性（如值的 strlen、值的片段、子串），或获取变量完全不同形式的值（以十六进制编码、md5 值、用于 DB 操作的转义/反转义值……）。

变换写在 `{` 与 `}` 之间，紧跟在变量名之后。使用变换时，变量名与变换**必须**括在 `(` 与 `)` 之间。

示例：

```opensips

# From URI 的长度（$fu 是 From URI 对应的伪变量）

$(fu{s.len})

```

可以同时对同一个变量应用多个变换。

```opensips

# 转义后的 'Test' 头域消息体的长度

$(hdr(Test){s.escape.common}{s.len})

```

除非另有说明，所有变换在出错或操作不成功时都返回 NULL（例如用 "`{uri.param,name}`" 变换在 URI 中查找不存在的参数）。此外，变换也接受 NULL 作为输入，以便支持与之前可能返回 NULL 的变换进行链式组合。

变换可以用在任何位置，它被视为脚本变量支持的一部分 —— 在 xlog、avpops 或其他模块的函数与参数中，在赋值表达式右侧，或在比较式中。

> [!IMPORTANT]
> 关于哪些变量可与变换一起使用，参见[脚本变量列表](Script-CoreVar.md)。

## 字符串变换
这些变换的名称以 `s.` 开头，用于对变量执行字符串操作。

本类可用的变换：

### {s.len}

返回变量值的长度（strlen）

```opensips

$var(x) = "abc";
if($(var(x){s.len}) == 3)
{
   ...
}

```

### {s.int}

将给定字符串的起始部分转换为整型值。若完全不含数字，则返回 0。

```opensips

$var(dur) = "2868.12 sec";
if ($(var(dur){s.int}) < 3600) {
  ...
}

```

### {s.md5}

返回给定输入的 MD5 哈希值。

```opensips

xlog("MD5 over From username: $(fU{s.md5})\n");

```

### {s.crc32}

以十进制字符串形式返回该值的 CRC-32 校验和。

### {s.reverse}

以倒序返回输入字符串。

```opensips

$var(forward) = "onetwothree";
$var(reverse) = $(var(forward){s.reverse}); //包含 "eerhtowteno";

```

### {s.substr,offset,length}

返回从 *offset* 开始、长度为 *length* 的子串。若 *offset* 为负数，则从值的末尾开始计数，-1 表示最后一个字符。若为正值，*0* 表示第一个字符。若 *length* 为 *0* 或大于字符串长度，则返回到输入字符串末尾的子串。若 *length* 为负数，则子串的结束位置从值的末尾计数，-1 表示不包含最后一个字符。offset 与 length 均可使用变量指定。

示例：
```opensips

$var(x) = "abcd";
$(var(x){s.substr,1,0}) = "bcd"

```

### {s.select,index,separator}

返回变量值中的一个字段。字段依据 separator 与 index 选取。separator 必须是用于标识字段边界的字符。Index 必须是整型值或变量。若 index 为负数，则字段计数从值的末尾开始，-1 表示最后一个字段。若 index 为正数，0 表示第一个字段。注意，若字段为空，将返回空字符串而非 NULL。

示例：
```opensips

$var(x) = "12,34,56";
$(var(x){s.select,1,,}) => "34" ;

$var(x) = "12,34,56";
$(var(x){s.select,-2,,}) => "34"

```

### {s.encode.hexa}

返回变量值的十六进制编码

### {s.decode.hexa}

返回变量值从十六进制解码后的结果

### {s.escape.common}

返回变量值转义后的字符串。被转义的字符为 '、双引号、反斜杠和 0。执行 DB 查询时有用（非拉丁字符集需谨慎处理）。

### {s.unescape.common}

返回变量值反转义后的字符串。是上一条变换的逆操作。

### {s.escape.user}

返回变量值转义后的字符串，按 RFC 要求将 SIP URI 用户部分不允许的字符转换为 '%hexa'。

### {s.unescape.user}

返回变量值反转义后的字符串，将 '%hexa' 转换为字符码。是上一条变换的逆操作。

### {s.escape.param}

返回变量值转义后的字符串，按 RFC 要求将 SIP URI 参数部分不允许的字符转换为 '%hexa'。

### {s.unescape.param}

返回变量值反转义后的字符串，将 '%hexa' 转换为字符码。是上一条变换的逆操作。

### {s.tolower}

返回转为小写 ASCII 字母的字符串。

### {s.toupper}

返回转为大写 ASCII 字母的字符串。

### {s.index}

从第一个字符串的开头开始，在其内部查找另一个字符串。返回所找到字符串的起始索引，未找到则返回 NULL。
可选的 index 指定在字符串中开始搜索的偏移量。支持负偏移量，并会回绕。

```opensips

$var(strtosearch) = 'onetwothreeone';
$var(str) = 'one';

# 从 0 索引开始搜索该字符串
$(var(strtosearch){s.index, $var(str)}) # 返回 0
$(var(strtosearch){s.index, $var(str), 0}) # 同上
$(var(strtosearch){s.index, $var(str), 3}) # 返回 11

# 负偏移
$(var(strtosearch){s.index, $var(str), -11}) # 同上

# 负回绕偏移
$(var(strtosearch){s.index, $var(str), -25}) # 同上

# 检测一个字符串是否存在于另一个字符串中
if ($(var(strtosearch){s.index, $var(str)}) != NULL)
    xlog("found $var(str) in $var(strtosearch)\n");

```

### {s.rindex}

从第一个字符串的末尾开始，在其内部查找另一个字符串。返回所找到字符串的起始索引，未找到则返回 NULL。
可选的 index 指定开始搜索前的偏移量，即所找到字符串的起始位置将位于该偏移量之前。支持负偏移量，并会回绕。

```opensips

$(var(strtosearch){s.rindex, $var(str)}) # 返回 11
$(var(strtosearch){s.rindex, $var(str), -3}) # 返回 11
$(var(strtosearch){s.rindex, $var(str), 11}) # 返回 11
$(var(strtosearch){s.rindex, $var(str), -4}) # 返回 0

```

### {s.fill.left, tok, len}

用字符/字符串向左侧填充字符串，直到达到给定的最终长度。若初始字符串长度大于或等于给定的最终长度，则返回原字符串。

```opensips

$var(in) = "485"; (also works for integer PVs)

$(var(in){s.fill.left, 0, 3})    => 485
$(var(in){s.fill.left, 0, 6})    => 000485
$(var(in){s.fill.left, abc, 8})  => bcabc485

```

> [!NOTE]
> 当前针对速度做了优化。不支持伪变量参数，也不支持连续的 "s.fill" 级联。

### {s.fill.right, tok, len}

用字符/字符串向右侧填充字符串，直到达到给定的最终长度。若初始字符串长度大于或等于给定的最终长度，则返回原字符串。

```opensips

$var(in) = 485; （对字符串 PV 同样有效）

$(var(in){s.fill.right, 0, 3})   => 485
$(var(in){s.fill.right, 0, 6})   => 485000
$(var(in){s.fill.right, abc, 8}) => 485abcab

```

### {s.width, len}

将输入截断或扩展至给定的 *len*。扩展在右侧以空格字符 ' ' 进行。截断采用类似方式，从右侧进行。示例：

用字符/字符串向右侧填充字符串，直到达到给定的最终长度。若初始字符串长度大于或等于给定的最终长度，则返回原字符串。若用于存放整型的伪变量，则会把它们转换为字符串。

```opensips

$var(in) = "transformation";

$(var(in){s.width, 14})   => "transformation"
$(var(in){s.width, 16})  => "transformation  "
$(var(in){s.width, 9})   => "transform"

```

### {s.trim}

去除输入字符串首尾的所有空白字符。被裁剪的字符为 " "（空格）、\t（制表符）、\n（换行）和 \r（回车）。

```opensips

$var(in) = "\t \n input string  \r  ";

$(var(in){s.trim})   => "input string"

```

### {s.trimr}

去除输入字符串尾部的所有空白字符。被裁剪的字符为 " "（空格）、\t（制表符）、\n（换行）和 \r（回车）。

```opensips

$var(in) = "\t \n input string  \r  ";

$(var(in){s.trimr})   => "\t \n input string"

```

### {s.triml}

去除输入字符串首部的所有空白字符。被裁剪的字符为 " "（空格）、\t（制表符）、\n（换行）和 \r（回车）。

```opensips

$var(in) = "\t \n input string  \r  ";

$(var(in){s.triml})   => "input string  \r  "

```

### {s.dec2hex}

将以字符串表示的十进制（基 10）数字转换为十六进制（基 16）。

### {s.hex2dec}

将以字符串表示的十六进制（基 16）数字转换为十进制（基 10）。

### {s.b64encode}

将二进制输入数据表示为 ASCII 字符串格式。

```opensips

$var(in) = "\x2\x3\x4\x5!@#%^&*";
$(var(in){s.b64encode})   => "AgMEBSFAIyVeJio="

```

### {s.b64decode}

假定输入为 Base64 字符串，并尽可能多地解码字符。

```opensips

$var(in) = "AgMEBSFAIyVeJio=";
$(var(in){s.b64decode})   => "\x2\x3\x4\x5!@#%^&*"

```

### {s.xor,secret}

根据两个字符串的长度，对输入字符串与 "secret" 字符串参数（或其一部分）执行一次或多次逻辑 XOR 运算。

```opensips

$var(in) = "aaaaaabbbbbb";
$(var(in){s.xor,x})   => "!/>^P!/>^P!^U2^Q!^U2^Q"

```

### {s.eval}

将字符串解释为变量格式化字符串，并对其中声明的所有变量求值。

```opensips

$var(in) = "client";
$var(format) = "Hello, $var(in)!";
$(var(format){s.eval})   => "Hello, client!"

```

### {s.date2unix}

假定输入为 RFC-3261 的 SIP "Date" 头域值，据此解析并返回等价的 UNIX 时间戳。

```opensips

$var(date) = "Thu, 13 Jun 2024 12:48:00 GMT";
$(var(date){s.date2unix})   => "1718282880";

```

### {s.sha1}

返回给定输入的 SHA1 哈希值。
```opensips

xlog("SHA1 over From username: $(fU{s.sha1})\n");

```

### {s.sha224}

返回给定输入的 SHA224 哈希值。
```opensips

xlog("SHA224 over From username: $(fU{s.sha224})\n");

```

### {s.sha256}

返回给定输入的 SHA256 哈希值。
```opensips

xlog("SHA256 over From username: $(fU{s.sha256})\n");

```

### {s.sha384}

返回给定输入的 SHA384 哈希值。
```opensips

xlog("SHA384 over From username: $(fU{s.sha384})\n");

```

### {s.sha512}

返回给定输入的 SHA512 哈希值。
```opensips

xlog("SHA512 over From username: $(fU{s.sha512})\n");

```

### {s.sha1_hmac,key}

使用 key 返回给定输入的 SHA1 HMAC 哈希值。
```opensips

xlog("SHA1 HMAC over From username using key 'secret': $(fU{s.sha1_hmac,secret})\n");

```

### {s.sha224_hmac,key}

使用 key 返回给定输入的 SHA224 HMAC 哈希值。
```opensips

xlog("SHA224 HMAC over From username using key 'secret': $(fU{s.sha224_hmac,secret})\n");

```

### {s.sha256_hmac,key}

使用 key 返回给定输入的 SHA256 HMAC 哈希值。
```opensips

xlog("SHA256 HMAC over From username using key 'secret': $(fU{s.sha256_hmac,secret})\n");

```

### {s.sha384_hmac,key}

使用 key 返回给定输入的 SHA384 HMAC 哈希值。
```opensips

xlog("SHA384 HMAC over From username using key 'secret': $(fU{s.sha384_hmac,secret})\n");

```

### {s.sha512_hmac,key}

使用 key 返回给定输入的 SHA512 HMAC 哈希值。
```opensips

xlog("SHA512 HMAC over From username using key 'secret': $(fU{s.sha512_hmac,secret})\n");

```

## URI 变换

这些变换的名称以 `uri.` 开头。变量的值被视为一个 SIP URI。这些变换返回 SIP URI 的各个部分（参见 `struct sip_uri`）。若所请求的部分不存在，返回值为 NULL。

本类可用的变换：

### {uri.user}

返回 URI 结构中的用户部分。

### {uri.host}

（与 **`{uri.domain}`** 相同）

返回 URI 结构中的域部分。

### {uri.passwd}

返回 URI 结构中的密码部分。

### {uri.port}

返回 URI 结构中的端口。

### {uri.params}

将所有 URI 参数作为单个字符串返回。

### {uri.param,name}

返回名称为 "name" 的 URI 参数的值

### {uri.headers}

返回 URI 头域。

### {uri.transport}

返回 transport URI 参数的值。

### {uri.ttl}

返回 ttl URI 参数的值。

### {uri.uparam}

返回 user URI 参数的值

### {uri.maddr}

返回 maddr URI 参数的值。

### {uri.method}

返回 method URI 参数的值。

### {uri.lr}

返回 lr URI 参数的值。

### {uri.r2}

返回 r2 URI 参数的值。

### {uri.schema}

返回给定 URI 的 schema 部分。

## VIA 变换

这些变换解析 Via 头域，名称均以 `via.` 开头。变量的值被视为一个 SIP Via 头域。这些变换返回 Via 头域的各部分（参见 `struct via_body`）。若所请求的部分不存在，返回值为 NULL。若存放 Via 头域的变量为空，变换将失败（产生脚本错误）。除非下文说明中另有指明，变换结果均为字符串（而非整型）。

示例：
```opensips
$var(upstreamtransport) = $(hdr(Via)[1]{via.transport}{s.tolower});
$var(upstreamip) = $(hdr(Via)[1]{via.param,received});
$var(clientport) = $(hdr(Via)[-1]{via.param,rport});
```

本类可用的变换：

### {via.name}

返回 `protocol-name`（RFC3261 BNF 中的定义），通常为 `SIP`。

### {via.version}

返回 `protocol-version`（RFC3261 BNF 中的定义），通常为 `2.0`。

### {via.transport}

返回 `transport`（RFC3261 BNF 中的定义），例如 `UDP`、`TCP`、`TLS`。这是用于发送请求消息的传输协议。

### {via.host}

（与 `{via.domain}` 相同）

返回 `sent-by`（RFC3261 BNF 中的定义）的 `host` 部分。通常这是请求消息发送方的 IP 地址，也是应答将被发送到的地址。

### {via.port}

返回 `sent-by`（RFC3261 BNF 中的定义）的 `port` 部分。通常这是请求消息发送方的 IP 端口，也是应答将被发送到的地址。变换结果既可作整型使用，也可作字符串使用。

### {via.comment}

与 via 头域关联的注释。`struct via_body` 包含该字段，但 RFC3261 是否允许 Via 头域带注释并不明确（参见第 221 页顶部文字，且 BNF 并未明确允许 Via 内出现注释）。注释即括号内的文本。

### {via.params}

以单个字符串返回所有 Via 头域参数（RFC3261 BNF 中的 `via-param`）。结果可用 `{param.*}` 变换处理。实质上就是 host 与 port 之后的所有内容。

### {via.param,name}

返回名称为 `name` 的 Via 头域参数的值。典型参数包括 `branch`、`rport` 和 `received`。

### {via.branch}

返回 VIA 头域中 branch 参数的值。

### {via.received}

返回 VIA 头域中 received 参数的值（若存在）。

### {via.rport}

返回 VIA 头域中 rport 参数的值（若存在）。

## 参数列表变换

这些变换的名称以 `param.` 开头。变量的值被视为形如 `name1=value1;name2=value2;...` 的字符串。这些变换返回特定参数的值，或指定索引处参数的名称。

本类可用的变换：

### {param.value,name}

返回参数 `name` 的值。

示例：
```opensips

"a=1;b=2;c=3"{param.value,c} = "3"

```

`name` 可以是变量。

### {param.exist,name}

若参数 `name` 存在（有无值均可）则返回 1，否则返回 0。返回值既可作字符串也可作整型。`name` 可以是变量。可用于检测没有值的参数是否存在。

示例：
```opensips

"a=0;b=2;ob;c=3"{param.exist,ob};         # 返回 1
"a=0;b=2;ob;c=3"{param.exist,a};          # 返回 1
"a=0;b=2;ob;c=3"{param.exist,foo};        # 返回 0

```

### {param.valueat,index}

返回 `index` 指定位置处参数的值（索引从 0 开始）。接受负索引，-1 表示最后一个参数。

示例：
```opensips

"a=1;b=2;c=3"{param.valueat,1} = "2"

```

`index` 可以是变量。

### {param.name,index}

返回位置 `index` 处参数的名称。接受负索引，-1 表示最后一个参数。`index` 可以是变量。

示例：
```opensips

"a=1;b=2;c=3"{param.name,1} = "b"

```

### {param.count}

返回列表中参数的个数。

示例：
```opensips

"a=1;b=2;c=3"{param.count} = 3

```

## 名称地址变换

这些变换的名称以 `nameaddr.` 开头。变量的值被视为形如 `[display_name] uri` 的字符串。这些变换返回特定字段的值。

每个变换都支持可选的 `index`。当传入一组 nameaddr 规格时可用，表示提取值时应当考虑的规格索引。索引从 0 开始（缺省值即为 0），且接受负值（-1 表示最后一个 nameaddr 规格）。

示例：
```opensips

'"first" <first@opensips.org>, "second" <second@opensips.org>' {nameaddr.0.name} = "first"
'"first" <first@opensips.org>, "second" <second@opensips.org>' {nameaddr.1.name} = "second"
'"first" <first@opensips.org>, "second" <second@opensips.org>' {nameaddr.-1.name} = "second"

```

本类可用的变换：

### {nameaddr.name}

返回显示名称（display name）的值

示例：
```opensips

'"test" <sip:test@opensips.org>' {nameaddr.name} = "test"

```

### {nameaddr.uri}

返回 URI 的值

示例：
```opensips

'"test" <sip:test@opensips.org>' {nameaddr.uri} = sip:test@opensips.org

```

### {nameaddr.len}

返回值中整个 name-addr 部分的长度。

### {nameaddr.param,param_name}

返回名称为 param_name 的参数的值。
示例：
```opensips

'"test" <sip:test@opensips.org>;tag=dat43h' {nameaddr.param,tag} = dat43h

```

### {nameaddr.params}

返回所有参数及其对应的值。
示例：
```opensips

'"test" <sip:test@opensips.org>;tag=dat43h;private=yes' {nameaddr.params} = "tag=dat43h;private=yes"

```

## IP 变换

这些变换的名称以 `ip.` 开头。本类可用的变换：

### {ip.pton}

返回以字符串表示的 IP 的二进制表示。
示例：
```opensips

"193.668.3.634" {ip.pton} 返回所提供 IP 的 4 字节二进制表示

```

### {ip.ntop}

返回所提供二进制 IP 的字符串表示
示例：
```opensips

"193.668.3.634"{ip.pton}{ip.ntop} = "193.668.3.634"

```

### {ip.isip}

若提供的字符串是合法的 IPv4 或 IPv6 地址则返回 `1`，否则返回 `0`。
示例：
```opensips

"193.668.3.634" {ip.isip} = 1
"193.668.3.634.1" {ip.isip} = 0

```

### {ip.isip4}

若提供的字符串是合法的 IPv4 地址则返回 `1`，否则返回 `0`。
示例：
```opensips

"193.668.3.634" {ip.isip4} = 1

```

### {ip.isip6}

若提供的字符串是合法的 IPv6 地址则返回 `1`，否则返回 `0`。
示例：
```opensips

"193.668.3.634" {ip.isip6} = 0
"2001:0db8:85a3:0000:0000:8a2e:0370:7334" {ip.isip6} = 1

```

### {ip.family}
若提供的二进制 IP 表示为 IPv4 或 IPv6，则返回 INET 或 INET6。
示例：
```opensips

"193.668.3.634" {ip.pton}{ip.family} = "INET"

```

### {ip.resolve}
返回所提供域名解析后对应的 IP 地址。若提供的是字符串形式的 IP，则该变换不产生任何效果。
示例：
```opensips

"opensips.org" {ip.resolve} = "78.46.64.50"

```

### {ip.matches}
检查输入 IP 地址是否匹配以 IP/masklen（短格式）给出的网络掩码。匹配则返回 1，不匹配返回 0。出错时（非法输入、非法参数、地址族不匹配）返回 NULL。该参数支持变量。
示例：
```opensips

if ( $(si{ip.matches,10.10.0.1/24})==1 )
	xlog("It DOES match \n");
else
	xlog("It DOES NOT match \n");

```

### {ip.isprivate}
依据 RFC 1918 与 RFC 6598 检查输入 IP 地址是否为 IPv4 私有地址，或是否为环回地址（127.0.0.0/8）。若该 IP 为私有地址则返回 1，否则返回 0。
示例：
```opensips

if ( $(si{ip.isprivate})==1 )
	xlog("source ip is private\n");
else
	xlog("source ip is not private\n");

```

## CSV 变换

这些变换的名称以 `csv.` 开头。变量的值被视为形如 "field1,field2,..." 的字符串。这些变换返回所提供 CSV 中条目的数量，或 CSV 中指定位置处的字段。

本类可用的变换：

### {csv.count}
返回所提供 CSV 中条目的数量。
示例：
```opensips

"a,b,c" {csv.count} = 3

```

### {csv.value,index}
返回指定位置处的条目。索引从 0 开始。接受负索引，-1 表示最后一个条目。'index' 可以是变量。
示例：
```opensips

"a,b,c" {csv.value,2} = c

```

## SDP 变换

这些变换的名称以 `sdp.` 开头。变量的值被视为合法的 SDP 消息体。该变换返回 SDP 消息体中的特定行。

本类可用的变换：

### {sdp.line}
返回 SDP 消息体中指定的行。该变换还接受第二个参数，用于指定要从 SDP 消息体中获取的第一个参数类型的行号。索引从 0 开始。若缺少第二个参数，则默认为 0。
示例：
```opensips

if (is_method("INVITE"))
   {
      $var(aline) = $(rb{sdp.line,a,1});
      xlog("The second a line in the SDP body is $var(aline)\n");
   }

if (is_method("INVITE"))
   {
      $var(mline) = $(rb{sdp.line,m});
      xlog("The first m line in the SDP body is $var(mline)\n");
   }

```

### {sdp.stream}
从 SDP 消息体返回特定的流（以 m= 行开始）。要返回的流可通过其在消息体中的索引指定，也可按其媒体类型指定。若按索引指定，从 `0` 开始，也可以为负，`-1` 表示最后一个流。若按媒体类型指定，**只返回该类型的第一条**流。若媒体类型或索引不存在，返回 NULL。

示例：
```opensips

if (is_method("INVITE"))
   {
      $var(first_stream) = $(rb{sdp.stream,0});
      xlog("First stream is $var(first_stream)\n");
   }

if (is_method("INVITE"))
   {
      $var(audio_stream) = $(rb{sdp.stream,audio});
      xlog("Audio stream is $var(audio_stream)\n");
   }

```

### {sdp.stream-delete}
返回删除了其中部分流的指定 SDP 消息体。要删除的流可通过其索引指定，也可按其媒体类型指定。若按索引指定，从 `0` 开始，也可以为负，`-1` 表示最后一个流。若按媒体类型指定，将删除所有匹配的流！若媒体类型或索引不存在，返回 NULL。

示例：
```opensips

if (is_method("INVITE"))
   {
      $var(new_body) = $(rb{sdp.stream-delete,0});
      xlog("SDP body without first stream is $var(new_body)\n");
   }

if (is_method("INVITE"))
   {
      $var(new_body) = $(rb{sdp.stream-delete,video});
      xlog("SDP body without video stream is $var(new_body)\n");
   }

```

## 正则表达式变换

这些变换的名称以 `re.` 开头。输入可以是任意字符串。

### {re.subst,reg_exp}

reg_exp 参数可以是普通字符串，也可以是变量。
reg_exp 的格式为：
```opensips
/posix_match_expression/replacement_expression/flags
```

标志位可以是
```opensips
i - 匹配时忽略大小写
s - 在多行字符串内匹配
g - 替换所有匹配项
```

示例：
```opensips

$var(reg_input)="abc";
$var(reg) = "/a/A/g";
xlog("Applying reg exp $var(reg) to $var(reg_input) : $(var(reg_input){re.subst,$var(reg)})\n");

...
...
xlog("Applying reg /b/B/g to $var(reg_input) : $(var(reg_input){re.subst,/b/B/g})\n");

```

## 示例

在一个变量中可应用多个变换，按从左到右的顺序执行。

* 位置 1 处参数值的长度（记住 0 是第一个位置，1 是第二个位置）

```opensips

$var(x) = "a=1;b=22;c=333";
$(var(x){param.value,$(var(x){param.name,1})}{s.len}) = 2

```

* 判断是否为注销注册

```opensips

if(is_method("REGISTER") && is_present_hf("Expires") && $(hdr(Expires){s.int})==0)
    xlog("This is a de-registration\n");

```
