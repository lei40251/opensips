---
outline: [2, 3]
title: "核心变量"
description: "OpenSIPS 变量在脚本中很容易识别，因为它们的名称（或记法）都以 $ 符号开头。"
---

**OpenSIPS** 提供了多种可在路由脚本中使用的变量类型。这些变量类型之间的差异来自：
* *其上下文* —— 变量依附于某个上下文，例如某条 SIP 消息、某个 SIP 事务或对话的上下文。在该上下文存在期间（在上下文存在的所有脚本路由中），变量始终可见
* *读写状态* —— 某些类型的变量是只读的
* *值的数量* —— 某些变量可以同时保存多个值

**OpenSIPS** 变量在脚本中很容易识别，因为它们的名称（或记法）都以 **$** 符号开头。

语法：  

伪变量的完整语法为：
`$(`*`<context>`*`name`*`(subname)[index]{transformation}`*`)`

以斜体书写的字段是可选的。
各字段的含义为：
* **name**（必填）—— 伪变量名（类型）。  
例如：var、avp、ru、DLG_status 等。
* **subname** —— 某个给定类型下特定 PV 的标识符。  
例如：hdr(From)、avp(name)。
* **index** —— 一个 PV 可以保存多个值，即可以指向一个值列表。指定索引即可访问列表中的某个值。也可以使用负值索引，-1 表示最后插入的值，-2 表示再往前插入的那个值。
* **transformation** —— 可以对伪变量施加一系列处理动作。完整的可用变换列表见[此处](Script-Tran.md)。变换可以级联，即把一次变换的输出作为另一次变换的输入。     
* **context** —— 伪变量求值所在的上下文。目前有 2 个 PV 上下文：reply 和 request。reply 上下文可用于失败路由，要求在应答消息的上下文中对该伪变量求值。request 上下文可用于在应答路由中希望该 PV 在对应请求的上下文中求值的情况。

用法示例：
* 仅 **name**：`$ru`
* **Name** 和 **subname**：`$hdr(Contact)`
* **Name** 和 **index**：`$(ct[0])`
* **Name**、**subname** 和 **index**：`$(avp(caller_dids)[2])`
* **Context** 
  * 在应答路由中使用 `$(<request>ru)` 将获取请求的 Request-URI
  * 在失败路由中可使用 `$(<reply>hdr(Contact))` 上下文来访问应答中的信息 

变量类型：

* [**脚本变量**](#script-variables) —— 顾名思义，这类变量严格绑定于脚本路由。

* [**AVP - Attribute Value Pair**](#avp-variables) —— AVP（属性值对）是动态变量，可以创建并依附到某条 SIP 消息或事务上（如果使用有状态处理）。因此，可以把它们看作事务级变量。

* [**引用变量**](#reference-variables) —— 这类变量用于提供对当前上下文信息的访问，包括当前 SIP 消息、事务、对话，或当前进程（非 SIP 信息）。

* [**转义序列**](#escape-sequences) —— 用于格式化字符串的转义序列；它们实际上不是变量，而是格式化器。



## 脚本变量 {#script-variables}

**命名**：`$var(name)`

这类变量依附于脚本，在顶层路由的整个执行期间持续存在（包括其所有子路由）。顶层路由执行结束后，脚本变量即丢失，不能再次使用。另外，首次使用（在顶层路由中）时要小心初始化，否则可能继承到垃圾值。
脚本变量可读写，其值可以是整型或字符串。
一个脚本变量只能保存单个值。新的赋值（或写操作）会覆盖已有的值。


**提示**：
* 如果你想在某个路由中开始使用某个脚本变量，最好用某个值初始化它（或重置它），否则可能继承同一进程此前执行过的路由中的值。
* 一个脚本变量只能保存一个值。

用法示例：

```opensips

$var(a) = 2;  # 将变量 'a' 的值设为整型 '2'
$var(a) = "2";  # 将变量 'a' 的值设为字符串 '2'
$var(a) = 3 + (7&(~2)); # 算术与按位运算
$var(a) = "sip:" + $au + "@" + $fd; # 由鉴权用户名和 From URI 的域组合出一个值

# 使用脚本变量进行判断
if( [ $var(a) & 4 ] ) {
  xlog("var a has third bit set\n");
}

```


## AVP 变量 {#avp-variables}

**命名**：`$avp(name)` 或 `$(avp(name)[N])`

一条消息或一个事务在最初（被接收或创建时）会带有一个空的 AVP 列表。在路由脚本执行期间，脚本本身或脚本调用的函数可能创建新的 AVP，它们会自动依附到该消息/事务上。AVP 在事务的任何消息（应答或请求）被处理的所有路由中都可见 —— `branch_route`、`failure_route`、`onreply_route`（对最后这个路由，需要启用 TM 参数 *onreply_avp_mode*）。
AVP 可读写，已存在的 AVP 甚至可以被删除（移除）。
一个 AVP 可以包含多个值 —— 新的赋值（或写操作）会向该 AVP 添加一个新值；这些值按「后添加的先使用」顺序保存（栈）。

使用索引 "N" 时，可以强制 AVP 返回某个特定的值（第 N 个值）。如果未给出索引，则返回第一个值。
定义了一个特殊索引 **append**，允许在列表末尾（栈底）添加新值 —— `$(avp(name)[append])` = "last value"；


**提示**：
* 要在 onreply_route 中启用 AVP，使用 "modparam("tm", "onreply_avp_mode", 1)"
* 如果单个 AVP 使用多个值，这些值的索引顺序与添加顺序相反
* AVP 属于事务上下文，因此在事务存在的任何地方都可见。
* AVP 的值可以被删除

用法示例：
* 事务持久化示例
```opensips

# 在 onreply 路由中启用 avp
modparam("tm", "onreply_avp_mode", 1)
...
route{
...
$avp(tmp) = $Ts ; # 保存当前时间（请求处理时）
...
t_onreply("handle_reply");
t_relay();
...
}

onreply_route[handle_reply] {
	if (t_check_status("200")) {
		# 计算建立时间
		$var(setup_time) = $Ts - $avp(tmp);
	}
}

```

* 多值示例
```opensips

$avp(demo) = "one";
# 只有一个值

$avp(demo) = "two";
# 有两个值（"two","one"）

$avp(demo) = "three";
# 有三个值（"three","two","one"）

xlog("accessing values with no index: $avp(demo)\n");
# 这将打印第一个值，即最后添加的值 -> "three"

xlog("accessing values with no index: $(avp(demo)[2])\n");
# 这将打印索引 2 的值（第三个）-> "one"

# 删除 avp 的第一个值（最后添加的那个）；如果只有一个值，AVP 本身将被销毁
$avp(demo) = NULL;

# 删除所有值并销毁该 AVP
$avp(demo) := NULL;

# 删除位于某个索引处的值 
$(avp(demo)[1]) = NULL;

# 覆盖某个索引处的值
$(avp(demo)[0]) = "zero";

```



## 引用变量 {#reference-variables}

**命名**：`$name`

它们提供对 SIP 消息/事务/对话或 OpenSIPS 内部信息的访问。
例如，引用变量可以访问被处理的 SIP 消息（头域、RURI、传输层信息等），也可以访问 **OpenSIPS** 内部信息（时间值、进程 PID、函数返回码）。取决于所提供的信息，这些 PV 要么绑定到消息，要么什么都不绑定（全局）。
大多数引用变量是只读的，只有少数允许写操作。引用变量可能返回多个值，也可能只返回一个值，取决于其所引用的信息（是否可有多个值）。  
标准引用变量是只读的，并返回单个值（除非另有说明）。

**提示**：
* 大多数引用变量由 **OpenSIPS** 核心提供，但也有模块导出此类变量（以提供该模块特有的信息）—— 请查阅各模块文档。
* 引用变量也称为*伪变量*或 *PV*。这是一种旧的术语。

由核心预定义（提供）的 PV 按字母顺序列出：

### 请求 P-Asserted-Identity 头域中的 URI - $ai

`$ai` - 指向请求 P-Asserted-Identity 头域中 URI 的引用（见 RFC 3325）

### 鉴权摘要 URI - $adu

`$adu` - 来自 Authorization 或 Proxy-Authorization 头域的 URI。计算 HTTP 摘要响应时使用该 URI。

### 鉴权 realm - $ar

`$ar` - 来自 Authorization 或 Proxy-Authorization 头域的 realm

### 鉴权用户名 user - $au

`$au` - 来自 Authorization 或 Proxy-Authorization 头域的用户名中的 user 部分

### 鉴权用户名域 - $ad

`$ad` - 来自 Authorization 或 Proxy-Authorization 头域的用户名中的域部分

### 鉴权 nonce - $an

`$an` - 来自 Authorization 或 Proxy-Authorization 头域的 nonce

### 鉴权响应  - $auth.resp

`$auth.resp` - 来自 Authorization 或 Proxy-Authorization 头域的鉴权响应

### 鉴权 nonce  - $auth.nonce

`$auth.nonce` - 来自 Authorization 或 Proxy-Authorization 头域的 nonce 字符串

### 鉴权 cnonce - $auth.cnonce

`$auth.cnonce` - 来自 Authorization 或 Proxy-Authorization 头域的客户端 nonce 字符串

### 鉴权 opaque - $auth.opaque

`$auth.opaque` - 来自 Authorization 或 Proxy-Authorization 头域的 opaque 字符串

### 鉴权算法 - $auth.alg

`$auth.alg` - 来自 Authorization 或 Proxy-Authorization 头域的算法字符串

### 鉴权 QOP - $auth.qop

`$auth.qop` - 来自 Authorization 或 Proxy-Authorization 头域的 qop 参数值

### 鉴权 nonce 计数（nc） - $auth.nc

`$auth.nc` - 来自 Authorization 或 Proxy-Authorization 头域的 nonce 计数参数值

### 鉴权完整用户名 - $aU

`$aU` - 来自 Authorization 或 Proxy-Authorization 头域的完整用户名

### 计费用户名 - $Au

`$Au` - 用于计费目的的用户名。它是一个选择性伪变量（继承自 acc 模块）。如果 `$au` 存在则返回 `$au`，否则返回 From 用户名。

### 参数选项 - $argv

`$argv` - 提供对通过 '-o' 选项指定的命令行参数的访问。
示例：
```opensips

   # 对于选项 '-o foo=0'
   xlog("foo is $argv(foo) \n");

```

### 鉴权质询算法 - $challenge.algorithm

`$challenge.algorithm` - 取自 WWW-Authorize 或 Proxy-Authorize 头域的算法值。

### 鉴权质询 realm - $challenge.realm

`$challenge.realm` - 取自 WWW-Authorize 或 Proxy-Authorize 头域的 realm 值。

### 鉴权质询 nonce - $challenge.nonce

`$challenge.nonce` - 取自 WWW-Authorize 或 Proxy-Authorize 头域的 nonce 值。

### 鉴权质询 opaque - $challenge.opaque

`$challenge.opaque` - 取自 WWW-Authorize 或 Proxy-Authorize 头域的 opaque 值。

### 鉴权质询 QOP - $challenge.qop

`$challenge.qop` - 取自 WWW-Authorize 或 Proxy-Authorize 头域的 qop 值。

### 鉴权质询 IK - $challenge.ik

`$challenge.ik` - 取自 WWW-Authorize 或 Proxy-Authorize 头域的 ik 值。

### 鉴权质询 CK - $challenge.ck

`$challenge.ck` - 取自 WWW-Authorize 或 Proxy-Authorize 头域的 ck 值。

### Call-Id - $ci

`$ci` - 指向 call-id 头域正文的引用

### Content-Length - $cl

`$cl` - 指向 content-length 头域正文的引用

### CSeq 号码 - $cs

`$cs` - 指向 cseq 头域中 cseq 号码的引用

### Contact 实例 - $ct

`$ct` - 指向 contact 头域中 contact 实例/正文的引用。contact 实例由 display_name + URI + contact_params 组成。由于一个 Contact 头域可能包含多个 Contact 实例、一条消息也可能包含多个 Contact 头域，因此为 `$ct` 变量增加了索引：
* `$ct` - 消息中的第一个 contact 实例
* `$(ct[n])` - 从消息开头数第 n 个 contact 实例，索引从 0 开始
* `$(ct[-n])` - 从消息末尾数第 n 个 contact 实例，索引从 -1 开始（最后一个 contact 实例）

### contact 实例的字段 - $ct.fields(field)

`$ct.fields()` - 指向 contact 实例/正文各字段的引用（见上）。支持的字段有：
* name - 显示名
* uri - contact uri
* q  - q 参数（仅值）
* expires - expires 参数（仅值） 
* methods - methods 参数（仅值）
* received - received 参数（仅值）
* params - 所有参数（含参数名）

示例：
* `$ct.fields(uri)` - 第一个 contact 实例的 URI
* `$(ct.fields(name)[1])` - 第二个 contact 实例的显示名

### Content-Type - $cT

`$cT` - 指向 Content-Type 头域正文的引用，也指向多部分消息体内部的 content-type 头域
* `$cT` - 消息的主 Content-Type，即头域中的那个
* `$(cT[n])` - 从消息开头数多部分消息体中的第 **n** 个 Content-Type，索引从 0 开始
* `$(cT[-n])` - 从消息末尾数多部分消息体中的第 **n** 个 Content-Type，索引从 -1 开始（最后一个 Content-Type）
* `$(cT[*])` - 所有 Content-Type 头域，包括主头域和多部分消息体中的那些

### 目标 URI 的域 - $dd

`$dd` - 指向目标 URI 的域的引用

> [!IMPORTANT]
> 它是可读写（R/W）变量（可以在路由逻辑中为它赋值）


### Diversion 头域 URI - $di

`$di` - 指向 Diversion 头域 URI 的引用

### Diversion "privacy" 参数 - $dip

`$dip` - 指向 Diversion 头域 "privacy" 参数值的引用

### Diversion "reason" 参数 - $dir

`$dir` - 指向 Diversion 头域 "reason" 参数值的引用

### 目标 URI 的端口 - $dp

`$dp` - 指向目标 URI 的端口的引用

> [!IMPORTANT]
> 它是可读写（R/W）变量（可以在路由逻辑中为它赋值）


### 目标 URI 的传输协议 - $dP

`$dP` - 指向目标 URI 的传输协议的引用

### 目标集合 - $ds

`$ds` - 指向目标集合的引用

### 目标 URI - $du

`$du` - 指向目标 URI（用于发送请求的出站代理）的引用
如果 loose_route() 返回 TRUE，则根据第一个 Route 头域设置目标 URI。

别名：`$duri`

> [!IMPORTANT]
> 它是可读写（R/W）变量（可以在路由逻辑中为它赋值）


### 错误类别 - $err.class

`$err.class` - 错误的类别（目前为 '1'，表示解析错误）

### 错误级别 - $err.level

`$err.level` - 错误的严重级别

### 错误信息 - $err.info

`$err.info` - 描述错误的文本

### 错误应答码 - $err.rcode

`$err.rcode` - 建议的应答码

### 错误应答原因 - $err.rreason

`$err.rreason` - 建议的应答原因短语

### From URI 的域 - $fd

`$fd` - 指向 'From' 头域 URI 中域的引用

别名：`$from.domain`

### From 显示名 - $fn

`$fn` - 指向 'From' 头域显示名的引用

### From tag - $ft

`$ft` - 指向 'From' 头域 tag 参数的引用

### From URI - $fu

`$fu` - 指向 'From' 头域 URI 的引用

别名：`$from`

### From URI 的用户名 - $fU

`$fU` - 指向 'From' 头域 URI 中用户名的引用

别名：`$from.user`

### OpenSIPS 日志级别 - $log_level {#opensips-log-level---log_level}

`$log_level` - 改变当前进程的日志级别；日志级别可以设置为新值（参见[可选值](Script-CoreParameters.md#log_level)），也可以重置回全局日志级别。
如果只对某段特定代码进行追踪和调试，该功能非常有用。 

用法示例：

```opensips
log_level= -1 # 仅错误
.....
{
......
$log_level = 4; # 将当前进程的调试级别设为 DBG
uac_replace_from(....);
$log_level = NULL; # 将当前进程的日志级别重置为其默认级别
.......
}
```

### SIP 消息缓冲区 - $mb

`$mb` - 指向 SIP 消息缓冲区的引用

### 消息标志位 - $mf {#message-flags---mf}

`$mf` - 显示当前 SIP 请求所设置的消息/事务标志位列表

### SIP 消息 ID - $mi

`$mi` - 指向 SIP 消息 id 的引用

### SIP 消息长度 - $ml

`$ml` - 指向 SIP 消息长度的引用

### 消息分支 - $msg.branch

`$msg.branch` - 该变量用于创建新的消息分支：向它写入某个 SIP URI 的值即可。读取该变量时，得到当前/最后添加的分支的 SIP URI（如果至今未添加额外分支，则为 RURI 分支的 SIP URI）。
```opensips

   # 创建一个新分支
   $msg.branch = "sip:new@domain.org";
   # 打印其 URI
   xlog("last added branch has URI $msg.branch \n");

```

### 消息分支的 SIP URI - $msg.branch.uri  {#sip-uri-of-a-message-branch---msgbranchuri}

`$msg.branch.uri` -  提供对某个已存在消息分支的 SIP URI（作为字符串）的读/写访问。消息分支通过 [append_msg_branch()](Script-CoreFunctions.md#append-msg-branch-uri-qvalue-flags) 核心函数或各类模块（如 "registrar" 模块）创建。消息分支由 TM 的 "t_relay()" 函数消费（它们被转换为 TM 分支）。  

该变量支持索引 —— 索引从 0 开始，即 RURI（或消息）分支。新增的分支从 1 开始。因此分支 0 始终
存在，无需创建。如果未指定索引，则考虑当前/最后添加的分支（如果至今未添加额外分支，则为 RURI 分支）。也接受负值，表示从最后一个分支（-1 是最新/最高的分支）到 RURI 分支的索引。`*` / ALL 索引将返回所有分支值以逗号分隔的列表。  

该变量可用于 REQUEST 和 FAILURE 路由。
```opensips

   # 创建一个新分支
   $msg.branch = "sip:new@domain.org";
   # 修改其 URI
   $msg.branch.uri = "sip:new_new@domain.org"
   # 修改 RURI 分支的 URI
   $(msg.branch.uri[0]) = "sip:new_RURI@domain.org"

```

### 消息分支的目标 URI - $msg.branch.duri

`$msg.branch.duri` -  与 [`$msg.branch.uri`](#sip-uri-of-a-message-branch---msgbranchuri) 完全相同，但操作的是消息分支的 Destination-URI 值。

### 消息分支的 PATH - $msg.branch.path

`$msg.branch.path` -  与 [`$msg.branch.uri`](#sip-uri-of-a-message-branch---msgbranchuri) 完全相同，但操作的是消息分支的 PATH 值。

### 消息分支的 Q - $msg.branch.q

`$msg.branch.q` -  与 [`$msg.branch.uri`](#sip-uri-of-a-message-branch---msgbranchuri) 完全相同，但操作的是消息分支的 Q 值。

### 消息分支的标志位 - $msg.branch.flags {#flags-of-a-message-branch---msgbranchflags}

`$msg.branch.flags` -  与 [`$msg.branch.uri`](#sip-uri-of-a-message-branch---msgbranchuri) 完全相同，但操作的是该分支所设置的各分支标志位列表（以逗号分隔）。

### 消息分支的 SIP 套接字 - $msg.branch.socket

`$msg.branch.socket` -  与 [`$msg.branch.uri`](#sip-uri-of-a-message-branch---msgbranchuri) 完全相同，但操作的是消息分支的（强制）套接字值。

### 消息分支的某个标志位 - $msg.branch.flag() {#a-flag-of-a-message-branch---msgbranchflag}

`$msg.branch.flag()` -  与 [`$msg.branch.uri`](#sip-uri-of-a-message-branch---msgbranchuri) 类似，但操作的是单个分支标志位（针对当前分支）。  

可接受的值为 0 表示 FALSE，正的非零值表示 TRUE。返回值为 0 表示 FALSE，1 表示 TRUE。  

> [!NOTE]
> 此处不能使用 `*` / ALL 索引。

```opensips

   # 创建一个新分支
   $msg.branch = "sip:new@domain.org";
   # 为该分支设置名为 "pstn" 的标志位
   $msg.branch.flag(pstn) = 1;
   $msg.branch.flag(foo) = 1;
   # 打印所有已设置的标志位
   xlog("Flags are <$msg.branch.flags>\n");

```

### 消息分支的某个属性 - $msg.branch.attr()

`$msg.branch.attr()` -  与 [`$msg.branch.uri`](#sip-uri-of-a-message-branch---msgbranchuri) 类似，但操作的是单个分支属性（依附于当前分支）。  

属性可以有任意名称（无需预定义），并且在同一时间只能有一个值，可以是字符串或整型。  

> [!NOTE]
> 此处不能使用 `*` / ALL 索引。

```opensips

   # 创建一个新分支
   $msg.branch = "sip:new@domain.org";
   # 为该分支设置名为 "pstn" 的标志位
   $msg.branch.attr(name) = "one";
   $msg.branch.attr(num) = 5;

```

### 最后一个消息分支的索引 - $msg.branch.last_idx

`$msg.branch.last_idx` -  返回最后一个消息分支的索引。如果未添加额外分支，将返回 0，即 RURI 分支的索引。此后每调用一次 append_msg_branch()，返回值就递增。  

### 消息标志位 - $msg.flag {#message-flag---msgflag}

`$msg.flag(flag_name)` - 该变量提供对某个特定消息标志位（由名称标识）值的读/写访问。写入时可接受的值为 1（置位）和 0（清除）。返回值为 1/"true"（置位）和 0/"false"（清除）。
```opensips

  setflag("X");
  xlog("---- flag value is $msg.flag(X) \n");
  $msg.flag(X) = off;
  xlog("---- flag value is $msg.flag(X) \n");

```

### 消息是否为请求  - $msg.is_request

`$msg.is_request` - 该变量表明当前 SIP 消息是否为请求。返回值为 1/"true"（请求）和 0/"false"（应答）。
```opensips

  xlog("---- this message is a request:  $msg.is_request \n");
  if ( $msg.is_request )
    xlog("---- yes, it is a request\n");

```

### 消息类型 - $msg.type

`$msg.type` - 该变量返回当前消息的类型。返回值为 "request"（请求）或 "reply"（应答）。
```opensips

  xlog("---- this message is a SIP $msg.type \n");

```

### SIP 请求原始 URI 中的域 - $od

`$od` - 指向请求原始 R-URI 中域的引用

### SIP 请求原始 URI 的端口 - $op

`$op` - 指向原始 R-URI 端口的引用

### SIP 请求原始 URI 的传输协议 - $oP

`$oP` - 指向原始 R-URI 传输协议的引用

### SIP 请求的原始 URI - $ou

`$ou` - 指向请求原始 URI 的引用

别名：`$ouri`

### SIP 请求原始 URI 中的用户名 - $oU

`$oU` - 指向请求原始 URI 中用户名的引用

### Path 头域 - $path

`$path` - 指向 Path 头域正文的引用。

### 路由参数 - $param

`$param(idx)` - 获取路由的参数。索引可以是整型，也可以是伪变量（索引从 1 开始）。  

示例：
```opensips

   route {
      ...
      $var(debug) = "DBUG:"
      route(PRINT_VAR, $var(debug), "param value");
      ...
   }

   route[PRINT_VAR] {
      $var(index) = 2;
      xlog("$param(1): The parameter value is <$param($var(index))>\n");
   }

```

### SIP 请求 P-Preferred-Identity 头域 URI 中的域 - $pd

`$pd` - 指向请求 P-Preferred-Identity 头域 URI 中域的引用（见 RFC 3325）

### SIP 请求 P-Preferred-Identity 头域中的显示名 - $pn

`$pn` - 指向请求 P-Preferred-Identity 头域中显示名的引用（见 RFC 3325）

### 进程 id - $pp

`$pp` - 指向进程 id（pid）的引用

### SIP 请求 P-Preferred-Identity 头域 URI 中的用户 - $pU

`$pU` - 指向请求 P-Preferred-Identity 头域 URI 中用户的引用（见 RFC 3325）

### SIP 请求 P-Preferred-Identity 头域中的 URI - $pu

`$pu` - 指向请求 P-Preferred-Identity 头域中 URI 的引用（见 RFC 3325）

### SIP 请求 URI 中的域 - $rd

`$rd` - 指向请求 URI 中域的引用

别名：`$ruri.domain`

> [!IMPORTANT]
> 它是可读写（R/W）变量（可以在路由脚本中为它赋值）


### 请求/应答的消息体 - $rb

`$rb` - 指向 SIP 消息的消息体或某个消息体部分的引用
* `$rb` - 消息的整个消息体（包含所有部分）
* `$(rb[*])` - 等同于 `$rb`
* `$(rb[n])` - 从消息开头数多部分消息体中的第 n 个消息体，索引从 0 开始
* `$(rb[-n])` - 从消息末尾数多部分消息体中的第 n 个消息体，索引从 -1 开始（最后一个消息体）
* `$rb(application/sdp)`   - 获取第一个 SDP 消息体部分
* `$(rb(application/isup)[-1])`  - 获取最后一个 ISUP 消息体部分

### 返回码 - $rc

`$rc` - 指向最后被调用函数返回码的引用

`$retcode` - 等同于 `$rc`

### Remote-Party-ID 头域 URI - $re

`$re` - 指向 Remote-Party-ID 头域 URI 的引用

### 返回值 - $return {#return-value---return}

`$return` - 返回此前执行的路由的值。

该变量接收一个索引，从 0 开始，表示需要读取的返回值。

### SIP 请求的方法 - $rm

`$rm` - 指向请求方法的引用

### SIP 请求的端口 - $rp

`$rp` - 指向 R-URI 端口的引用

> [!IMPORTANT]
> 它是可读写（R/W）变量（可以在路由脚本中为它赋值）


### SIP 请求 URI 的传输协议 - $rP

`$rP` - 指向 R-URI 传输协议的引用

### SIP 应答的原因 - $rr

`$rr` - 指向应答原因的引用

### SIP 应答的状态 - $rs

`$rs` - 指向应答状态的引用

### Refer-to URI - $rt

`$rt` - 指向 refer-to 头域 URI 的引用

### SIP 请求的 URI - $ru

`$ru` - 指向请求 URI 的引用

别名：`$ruri`

> [!IMPORTANT]
> 它是可读写（R/W）变量（可以在路由脚本中为它赋值）


### SIP 请求 URI 中的用户名 - $rU

`$rU` - 指向请求 URI 中用户名的引用

别名：`$ruri.user`

> [!IMPORTANT]
> 它是可读写（R/W）变量（可以在路由脚本中为它赋值）


### SIP 请求 URI 的 Q 值 - $ru_q

`$ru_q` - 指向 R-URI 的 q 值的引用

> [!IMPORTANT]
> 它是可读写（R/W）变量（可以在路由脚本中为它赋值）


### SDP 消息体 - $sdp

`$sdp` - 对当前 SIP 消息 SDP 消息体的读/写引用

```opensips

# 对 SIP 消息 SDP 的 READ 操作
$sdp

# WRITE 操作（赋予新的 SDP）
$sdp = $var(rtpengine_sdp);

# 对 SIP 应答 SDP 的 READ 操作
$(<reply>sdp)

# WRITE 操作（为 SIP 应答赋予新的 SDP）
$(<reply>sdp) = $var(rtpengine_sdp);

```

### SDP 消息体行 - $sdp.line

`$sdp.line` - 对 SDP 消息体各行的读/写引用，支持过滤

```opensips

# 获取第 1、2、3……个属性行（以 "a=" 开头）
$sdp.line(a=)         # 获取第一行 "a=" 行
$sdp.line(a=[0])      # 等价，索引 0 处的 "a=" 行
$sdp.line(a=ptime[1]) # 索引 1 处的 "a=ptime" 行
$sdp.line(a=[100])    # 很可能返回 NULL

# 行内基于 token 的过滤
$sdp.line(m=audio[1])         # m=audio 27292 RTP/AVP 9 8 0 2 102 100 99 101
$sdp.line(m=audio[1]/[0])     # audio
$sdp.line(m=audio[1]/[1])     # 27292
$sdp.line(m=audio[1]/[2])     # RTP/AVP
$sdp.line(m=audio[1]/[10])    # 101
$sdp.line(m=audio[1]/[11])    # NULL
$sdp.line(m=audio[1]/RTP)         # RTP/AVP
$sdp.line(m=audio[1]/RTP\/AVP)    # RTP/AVP
$sdp.line(m=audio[1]/RTP\/AVP[0]) # RTP/AVP
$sdp.line(m=audio[1]/RTP\/AVP[1]) # NULL
$sdp.line(m=audio[1]/RTQ)         # NULL

```

### SDP 消息体流 - $sdp.stream

`$sdp.stream` - 对 SDP 消息体各流的读/写引用，支持过滤

```opensips

# 在目标流中，可以先按行过滤……
$sdp.stream(/a=ptime);         # Stream #0 中的第一个 “a=ptime” 行（"m=" 匹配任意流类型）
$sdp.stream([1]/a=ptime);      # Stream #1 中的第一个 “a=ptime” 行（"m=" 匹配任意流类型））
$sdp.stream(audio[1]/a=ptime); # Audio Stream #1 中的第一个 “a=ptime” 行（"m=audio..."）
$sdp.stream(a[1]/a=ptime);     # Audio Stream #1 中的第一个 “a=ptime” 行（"m=a..."）
$sdp.stream(video[1]/a=nortpproxy) = NULL;  # 从 Video Stream #1 中删除整行以 "a=nortpproxy" 开头的行
$sdp.stream(v[1]/a=nortpproxy:/[0]) = "yes";   # 在 Video Stream #1 中将第一个 "a=nortpproxy" 行的值设为 "yes"

# ……此外，还可以按 token 过滤
$sdp.stream(video[1]/a=fmtp:115/bitrate=) = 48000; # 在 Video Stream #1 中，将 "a=fmtp:115" 第 0 行下的 "bitrate=" 设为 48000
$sdp.stream(video[1]/a=fmtp:115[3]) = NULL; # 仅在 Video Stream #1 内删除第 4 个（如果存在）"a=fmtp:115" 行
$sdp.stream(video[1]/a=fmtp:115/bitrate=) = 48000; # 在 Video Stream #1 中，将 "a=fmtp:115" 第 0 行下的 "bitrate=" 设为 48000

```

### SDP 消息体会话 - $sdp.session

`$sdp.session` - 对 SDP 消息体会话部分的读/写引用，支持过滤

```opensips

# 在 SDP 会话内（即直到第一个 "m=" 行之前），可以先按行过滤……
$sdp.session(a=ptime);            # 会话级的第 1 个 “a=ptime” 行
$sdp.session(a=ptime[0]);         # 同上
$sdp.session(a=ptime[1]);         # 会话级的第 2 个 “a=ptime” 行
$sdp.session(a=ptime[0]) = NULL;  # 删除会话级的第 1 个 “a=ptime” 行

# ……但也可以按 token 过滤并编辑：
$sdp.session(a=rtpmap/telephone-event\/) = "8000";  # 匹配会话级第一个描述 telephone-event 的 "a=rtpmap" 行，并将比特率强制为 8000

```

### SDP 流索引 - $sdp.stream.idx

`$sdp.stream.idx` - 指向所匹配 SDP 流索引的只读引用。无匹配时返回 NULL。

当需要先匹配某个具有特定属性的行（例如 "the rtpmap= line for PCMU codec"），然后在同一流中修改另一个属性时，该变量特别有用。示例：

```opensips

$var(line_idx) = $sdp.stream.idx(video/a=fmtp/packetization-mode=); # 定位第一个包含 packetization-mode= 属性的 "a=fmtp" 行的索引
$var(data) = $sdp.line([$var(line_idx)]); # 获取整行数据
... 对该行进行处理 ...
$sdp.line([$var(line_idx)]) = $var(data); # 重新写回该行

```

### IP 源地址 - $si

`$si` - 指向消息的 IP 源地址的引用

别名：`$src_ip`

### 入站套接字 - $socket_in / $socket_in(field)  {#socket-inbound---socket_in--socket_infield}

`$socket_in` - 只读变量，用于获取入站套接字（接收消息所用的套接字）的描述（proto:ip:port 格式）。
  

该变量还以 `$socket_in()` 的形式提供对套接字各种属性/子字段的详细只读访问。套接字的子字段有：
* ip - 套接字的 IP 部分
* port - 套接字的端口部分
* proto - 套接字协议的名称（如 "UDP"、"TCP" 等）
* advertised_ip - 套接字的对外通告 IP 部分（如果该套接字未做通告，可能为 NULL）
* advertised_port - 套接字的对外通告端口部分（如果该套接字未做通告，可能为 NULL）
* tag - 套接字的内部 tag/别名 
* anycast - 该套接字是否使用 anycast IP（否返回 0，是返回 1）
* af - 套接字 IP 的地址族。若为 IPv4 则值为 "INET"，若为 IPv6 则值为 "INET6"。
关于这些子字段含义的更多细节，也请参阅[套接字定义](Script-CoreParameters.md#rev_dns)。

### 出站套接字 - $socket_out / $socket_out(field)  {#socket-outbound---socket_out--socket_outfield}

`$socket_out` - 可读写变量，用于读取或更改消息的出站套接字。最初（在被写入/更改之前）它返回与 [`$socket_in`](#socket-inbound---socket_in--socket_infield) 相同的套接字描述（入站套接字同时也会被用作出站套接字）。此外它还支持 `forced` 子字段，仅当套接字已被显式强制时才返回套接字描述；因此与常规的 [`$socket_out`](#socket-outbound---socket_out--socket_outfield) 不同，如果没有显式强制过套接字，该变量返回 NULL。

  

该变量还以 `$socket_out()` 的形式提供对套接字各种属性/子字段的详细只读访问。**它提供的子字段与 [`$socket_in`](#socket-inbound---socket_in--socket_infield) 变量相同。**

```opensips

   $socket_out = "udp:11.11.11.11:5060";
   xlog("The outbound port is $socket_out(port)\n");

```

### 源端口 - $sp

`$sp` - 指向消息源端口的引用

### To URI 的域 - $td

`$td` - 指向 'To' 头域 URI 中域的引用

别名：`$to.domain`

### To 显示名 - $tn

`$tn` - 指向 'To' 头域显示名的引用

### To tag - $tt

`$tt` - 指向 'To' 头域 tag 参数的引用

### To URI - $tu

`$tu` - 指向 'To' 头域 URI 的引用

别名：`$to`

### To URI 的用户名 - $tU

`$tU` - 指向 'To' 头域 URI 中用户名的引用

别名：`$to.user`

### 格式化日期与时间 - $time

`$time(format)` - 按 UNIX date 返回格式化的时间字符串（参见：**man date**）。

### 分支索引 - $T_branch_idx

`$T_branch_idx` - branch_route[] 正在执行的对应分支的索引（第一个分支从 1 开始）。如果在 branch_route[] 块之外使用，值为 '0'。该变量由 TM 模块导出。

### 字符串格式的时间 - $Tf

`$Tf` - 指向字符串格式时间的引用

### 当前 unix 时间戳（秒） - $Ts

`$Ts` - 指向当前 unix 时间戳（秒）的引用

### 当前秒内的微秒数 - $Tsm

`$Tsm` - 指向当前秒内的微秒数的引用

### 启动时的 unix 时间戳 - $TS

`$TS` - 指向启动时 unix 时间戳的引用

### User agent 头域 - $ua

`$ua` - 指向 user agent 头域字段的引用

### SIP 头域 - $hdr

`$(hdr(name)[N])` - 表示由 'name' 标识的第 N 个头域的正文。如果省略 [N]，则打印第一个头域的正文。N=0 时取第一个头域，N=1 取第二个，依此类推。要打印该类型的最后一个头域，使用 -1，目前不支持其他负值。说明符内部不允许有空格（`}` 之前、`{` 之前或之后、[、] 符号周围）。当 N='*' 时，打印该类型的所有头域。

模块应能识别大多数紧凑头域名（即 **OpenSIPS** 能识别的那些，目前应为全部），若无法识别，则必须显式指定紧凑形式。如果存在专用说明符（例如 %ua 表示 user agent 头域），建议使用它们 —— 它们更快。

`$(hdr_name[N])` - 返回第 N 个头域的名称。N=0 时取第一个头域名称，N=1 取第二个，依此类推。要打印最后一个头域名称用 -1，倒数第二个用 -2，依此类推。说明符内部不允许有空格（`}` 之前、`{` 之前或之后、[、] 符号周围）。当 N='*' 时，打印所有头域名称。

`$(hdrcnt(name))` -- 返回由 'name' 给定类型的头域数量。指定头域名的规则与上面的 `$hdr(name)` 相同。许多头域（如 Via、Path、Record-Route）可能在消息中出现多次。该变量返回给定类型的头域数量。 

注意某些头域（如 Path）可能用逗号连接在一起，表现为单个头域行。该变量统计的是头域行数，而不是头域值个数。 

对于下面的消息片段，`$hdrcnt(Path)` 的值为 2，`$(hdr(Path)[0])` 的值为 **`<a.com>`**：
```opensips

    Path: <a.com>
    Path: <b.com>

```

对于下面的消息片段，`$hdrcnt(Path)` 的值为 1，`$(hdr(Path)[0])` 的值为 **`<a.com>`,`<b.com>`**：
```opensips

    Path: <a.com>,<b.com>

```

注意上面两个示例在语义上等价，但变量取到的值不同。

### 路由名称（完整） - $route

`$route` - 访问当前路由调用栈中的路由名称。用法示例（假设路由调用栈为 "route > route[A] > route[B]"）：

* `$route` 和 `$(route[0])` 均返回 **"route[B]"**（当前路由）
* `$(route[1])` 返回 **"route[A]"**（父路由）
* `$(route[2])` 返回 **"route"**（上一级父路由）
* `$(route[-1])` 返回 **"route"**（最顶层路由）
* `$(route[-2])` 返回 **"route[A]"**（次顶层路由）
* `$(route[-3])` 返回 **"route[B]"**（再次顶层路由）
* `$(route[3])` 和 `$(route[-4])` 均返回 **NULL**（索引越界）
* `$(route[*])` 返回 **"route > route[A] > route[B]"**（整个调用栈）

### 路由类型 - $route.type

`$route.type` - 访问当前路由的类型。可使用正索引或负索引。

* `$route.type` 和 `$(route.type[0])` 均返回当前路由类型
* `$(route.type[1])` 返回父路由类型
* `$(route.type[-1])` 返回最顶层路由类型
* `$(route.type[-2])` 返回次顶层路由类型

### 路由名称 - $route.name

`$route.name` - 访问当前路由的名称。可使用正索引或负索引。

* `$route.name` 和 `$(route.name[0])` 均返回当前路由名称
* `$(route.name[1])` 返回父路由名称
* `$(route.name[-1])` 返回最顶层路由名称
* `$(route.name[-2])` 返回次顶层路由名称

### 当前脚本行与文件  - $cfg_line

`$cfg_line` - 保存正在执行的动作在脚本中的当前行，便于记录日志   

`$cfg_file` - 保存正在执行的 cfg 文件的当前名称，在使用 include 语句引入多个脚本时很有用

### xlog() 的日志级别 - $xlog_level

`$xlog_level` - 允许按进程设置/重置 xlog() 的日志级别。简单来说，你可以读取 xlog() 调用的详细级别，也可以临时按进程更改该级别。

示例：
```opensips

xlog("current verbosity is $xlog_level \n");
$xlog_level = L_DBG; # 将本地 xlog 限制强制为 DBG
...
(set of xlogs)
...
$xlog_level = NULL;  # 重置为初始值

```

## 转义序列 {#escape-sequences}

这些序列由 xlog 模块导出并主要使用，通过转义序列以多种颜色（前景色和背景色）打印消息。 

### 前景色和背景色 {#foreground-and-background-colors}

`$C(xy)` - 指向某个转义序列的引用。「x」表示前景色，「y」表示背景色。

颜色可以是：

* x : 终端的默认颜色
* s : 黑
* r : 红
* g : 绿
* y : 黄
* b : 蓝
* p : 紫
* c : 青
* w : 白 

### 示例

几个用法示例。

```opensips

...
route {
...
    $avp(uuid)="caller_id";
    $avp(tmp)= $avp(uuid) + ": " + $fu;
    xlog("$C(bg)$avp(tmp)$C(xx) [$avp(tmp)] $C(br)$cs$C(xx)=[$hdr(cseq)]\n");
...
}
...

```
