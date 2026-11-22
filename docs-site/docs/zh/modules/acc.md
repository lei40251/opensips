---
title: "acc 模块"
description: "ACC 模块用于将事务信息计费到 syslog、SQL、AAA 等不同后端。"
sidebar: false
---


## 管理指南 {#admin-guide}


### 概述 {#overview}


ACC 模块用于将事务信息计费到 syslog、SQL、AAA 等不同后端。


要对一个事务计费并选择使用哪一组后端，脚本编写者只需使用 [do_accounting()](#do_accountingtype-flags-table) 脚本函数将该事务标记为需要计费。注意，该函数并不会在那个时刻真正执行计费，它只是设置一个标记——实际的计费将在事务或对话结束之后进行。


即便如此，模块仍允许脚本编写者在特殊情况下通过其他脚本函数就地强制计费。


计费模块默认会为事务记录一组固定的属性——如果你通过添加更多信息来定制计费，请参阅下一章关于额外计费的内容——[ACC 额外 ID](#extra-accounting)。


固定的最小计费信息为：


- 请求方法名
- From 头域的 TAG 参数
- To 头域的 TAG 参数
- Call-Id
- 最终应答中的 3 位状态码
- 最终应答中的原因短语
- 事务完成时的时间戳


如果请求中不存在某个值，则改为计费空字符串。


注意：


- 一个 INVITE 可能产生多条计费报告——这最可能是由于 SIP 分叉特性造成的。
- 从 2.2 版本开始，所有用于计费的标志位都已被 do_accounting() 函数取代。无需再担心是否设置了标志位，也不会被各种标志位名称弄混，现在只需调用该函数，它就会为你完成所有工作。
- OpenSIPS 现在支持会话/对话计费。它可以自动将 INVITE 与 BYE 关联起来以生成正确的 CDR（话单），例如用于计费目的。
- 如果 UA 在通话过程中失败，代理将永远无法发现这一点。一般而言，更好的做法是由终端设备（例如 PSTN 网关）进行计费，因为它最了解呼叫状态（包括媒体状态，以及在网关场景下的 PSTN 状态）。


SQL、事件接口和 AAA 后端支持已编译进本模块。


关于计费模块在计费范围、计费事件和计费后端方面如何工作的非常全面的描述，可参阅此在线[高级计费教程](https://docs.opensips.org/tutorials/advanced-accounting/)。


#### 通用示例 {#general-example}


```opensips
loadmodule "modules/acc/acc.so"

if ($ru=~"sip:+40") /* 呼叫罗马尼亚 */ {
    if (!proxy_authorize("sip_domain.net" /* realm */,
    "subscriber" /* 表名 */))  {
        proxy_challenge("sip_domain.net" /* realm */, "0" /* 无 qop */ );
        exit;
    }

    if (is_method("INVITE") && $au!=$fU) {
        xlog("FROM URI != digest username\n");
        sl_send_reply(403,"Forbidden");
    }

    do_accounting("log"); /* 设置为通过 syslog 计费 */
    t_relay(); /* 现在进入有状态模式 */
};
```


### 额外计费 {#extra-accounting}


#### 概述 {#overview-1}


除静态的默认信息之外，ACC 模块允许使用 acc_extra 伪变量动态选择要记录的额外信息。这样你就可以记录任意伪变量（AVP、请求的各个部分、应答的各个部分等）。


#### 定义与语法 {#definitions-and-syntax}


额外信息的选择通过 *extra_field* 参数完成，即为附加信息指定标签（tag）和 log_name。该信息通过 acc_extra 伪变量定义，并以所定义的标签引用。如果未指定标签，其值将被视为与 log_value 相同。计费后端（log、db、aaa、evi）在定义的开头指定，并用 ':' 与其余部分分隔。参数的语法为：


- *backend : tag -> log_name (';'tag -> log_name)**
- *backend : tag (';' tag)**


额外值在整个呼叫期间保持一致。在请求期间设置某个值，会让它在所有应答期间保持可见。此外，就 CDR 记录而言，在初始 INVITE 上设置某个值，将使得该值贯穿整个对话。


通过 *log_name*，你可以定义*数据*将如何/在何处被记录。其含义取决于所使用的计费支持：


- *LOG 计费* - log_name 将直接与数据一起以 *log_name=data* 格式打印；
- *DB 计费* - log_name 将是存储该数据的数据库列名。
> [!IMPORTANT] 
> 在数据库 *acc* 表中添加与每个额外数据相对应的列。
- *AAA 计费* - log_name 将是用于把数据打包进 AAA 消息的 AVP 名称。log_name 将通过字典转换为 AVP 编号。
> [!IMPORTANT] 
> 在 AAA 字典中添加 *log_name* 属性。
- *事件计费* - log_name 将是所引发事件中的参数名。


#### 工作原理 {#how-it-works}


以如下格式声明一个额外项


```opensips
modparam("acc", "extra_fields", "log: a -> test_a")
```


将使你仅通过设置 *$acc_extra(a)* 变量就能为日志的 *test_a* 字段设置值。否则，该字段将以无值（null）方式记录。


#### Radius 计费的依赖 {#radius-accounting-dependencies}


如果使用 radius 计费，除必需的 radius 客户端库之外，还必须包含 **dictionary.rfc2866** 才能让模块正常工作。


### 多呼叫腿（call-leg）计费 {#multi-call-legs-accounting}


#### 概述 {#overview-2}


由于转发动作，一个 SIP 呼叫可以有多个腿（leg）。例如用户 A 呼叫用户 B，B 将该呼叫前转到用户 C。只有一个 SIP 呼叫，但有两个腿（A 到 B 和 B 到 C）。对呼叫的各个腿进行计费是正确计费所必需的（如果 C 是 PSTN 号码且该呼叫需要付费，则用户 B 必须为该呼叫付费——作为最后修改呼叫目的方的一方——而不是 A——作为呼叫的发起方。服务器上的呼叫前转只是说明为何需要具备多腿支持能力的计费引擎的一个例子。


#### 配置 {#configuration}


首先说明其工作原理：思路是使用一个变量为每个腿存储一组值。该变量内容的含义完全由脚本编写者决定——它可以是该腿的起点与来源、其状态或任何其他相关信息。默认只定义了一个腿。脚本编写者必须使用 *acc_new_leg()* 脚本函数决定何时创建新腿。创建新腿时，该腿的所有值默认都将被设置为 NULL。


当呼叫的计费信息将被写入/发送时，所有呼叫腿对都会被添加。


默认情况下，多呼叫腿支持是禁用的——只需设置 *acc_leg* 变量 `leg_fields` 模块参数即可启用。注意，后者仅对由 OpenSIPS 自动生成的 CDR 有意义。


#### 记录的数据 {#logged-data}


对于每个呼叫，*acc_leg* 变量中的所有值都将被记录。信息实际如何记录取决于数据后端：


- *syslog* -- 所有腿集合都将作为 acc_leg(leg1)=xxx, acc_leg(leg2)=xxxx ,... 集合添加到同一条记录字符串中。
- *数据库* -- 每一对都将被单独记录（受数据库数据结构限制）；将写入多条记录，它们之间的差异仅在于与呼叫腿信息相对应的字段。

> [!NOTE]
> 你需要在自己的数据库（所有与 acc 相关的表）中添加用于呼叫腿信息的列（集合中每个腿值对应一列）。

- *AAA* -- 所有集合都将作为 AAA AVP 添加到同一条 AAA 计费消息中——每个呼叫腿都会添加一组 AAA AVP（与每个腿的集合相对应）

> [!NOTE] 
> 你需要在自己的字典中添加呼叫腿集合定义中所使用的 AAA AVP。

- *事件* -- 每一对都将作为不同的事件参数-值对出现。与数据库行为类似，将引发多个事件，它们之间的唯一区别是腿信息。


> [!IMPORTANT]
> 为了使用 *RADIUS*，必须在 opensips radius 配置脚本字典和 radius 服务器字典中都包含位于 *$(opensips_install_dir)/etc/dictionary.opensips* 中的 AVP。最重要的是最后三个 AVP（ID：227、228、229），你在任何 SIP 字典中都找不到它们（至少目前如此），因为它们只在 OpenSIPS 中使用。


### CDR 计费 {#cdrs-accounting}


#### 概述 {#overview-3}


ACC 模块现在还可以维护会话/对话计费。这让你可以记录呼叫时长、呼叫开始时间和建立时间等有用信息。


#### 配置 {#configuration-1}


要进行 CDR 计费，首先需要在为对话的初始 INVITE 调用 [do_accounting()](#do_accountingtype-flags-table) 脚本函数时设置 *cdr* 标志位。


#### 工作原理 {#how-it-works-1}


这种计费基于 dialog 模块。当收到初始 INVITE 时，如果设置了 *cdr* 标志位，则保存对话创建时间。一旦呼叫被应答并收到 ACK，其他信息（如额外值或腿值）将被保存。当收到相应的 BYE 时，计算呼叫时长并将所有信息存储到所需后端。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


模块依赖以下模块（换言之，列出的模块必须在本模块之前加载）：


- *tm* -- 事务管理器
- *一个数据库模块* -- 如果使用 SQL 支持。
- *rr* -- Record Route，如果启用了 "detect_direction" 模块参数。
- *一个 aaa 模块*
- *dialog* -- Dialog，如果使用了 "cdr" 选项


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，必须安装以下库或应用程序：


- 无。


### 导出的参数 {#exported-parameters}


#### early_media (integer)


是否也应对早期媒体（任何带消息体的临时应答）进行计费？


默认值为 0（否）。


```opensips title="early_media example"
modparam("acc", "early_media", 1)
```


#### report_cancels (integer)


默认情况下，CANCEL 报告是禁用的——大多数计费应用希望看到 INVITE 的取消状态。如果你明确希望对 CANCEL 事务计费，请开启此项。


默认值为 0（否）。


```opensips title="report_cancels example"
modparam("acc", "report_cancels", 1)
```


#### detect_direction (integer)


控制顺序请求的方向检测。如果启用（非零值），对于向上游方向（从被叫到主叫）的顺序请求，FROM 与 TO 将被交换（方向将保持与原请求一致）。


它会影响所有与 TO 和 FROM 头域相关的值（消息体、URI、用户名、域、TAG）。


默认值为 0（禁用）。


```opensips title="detect_direction example"
modparam("acc", "detect_direction", 1)
```


#### extra_fields (string) {#extra_fields-string}


定义用于额外字段计费的 tag-log_value 集合。有关额外计费的详细说明，请参阅 [ACC 额外 ID](#extra-accounting)。


如果为空，额外计费支持将被禁用。


默认值为 0（禁用）。


```opensips title="Setting *extra_fields* example:"
# 对于基于 syslog 的计费，可使用任何你希望打印的文本
# 如果设置 $acc_extra(a)，你将在日志中看到 "My_a_Field=<value>
# 如果设置 $acc_extra(b)，你将在日志中看到 "b=<value>
modparam("acc", "extra_fields", "log: a->My_a_Field; b")
# 对于基于 mysql 的计费，使用列名
# $acc_extra(a) = <value>  会在数据库中以 <value> 设置 col_a
modparam("acc", "extra_fields", "db: a->col_a; col_b")
# 对于基于 AAA 的计费，使用 AAA AVP 的名称
modparam("acc", "extra_fields","aaa:a->AAA_SRC;b->AAA_DST")
# evi 定义示例
modparam("acc", "extra_fields","a->2345;b->2346")
```


#### leg_fields (string) {#leg_fields-string}


定义用于多腿计费的 tag-log_value 集合。有关多呼叫腿计费的详细说明，请参阅[多呼叫腿](#multi-call-legs-accounting)。


如果为空，多腿计费支持将被禁用。


默认值为 0（禁用）。


```opensips title="Setting *leg_fields* example:"
# 对于基于 syslog 的计费，可使用任何你希望打印的文本
# 如果设置 $(acc_leg(a)[0])，你将在日志中看到 "My_a_Field=<value>
# 如果设置 $(acc_leg(b)[0])，你将在日志中看到 "b=<value>
modparam("acc", "leg_fields", "log: a->My_a_Field; b")
# 对于基于 mysql 的计费，使用列名
# $acc_leg(a) = <value>  会在数据库中以 <value> 设置 col_a
modparam("acc", "leg_fields", "db: a->col_a; col_b")
# 对于基于 AAA 的计费，使用 AAA AVP 的名称
modparam("acc", "leg_fields","aaa:a->AAA_LEG_SRC;b->AAA_LEG_DST")
# evi 定义示例
modparam("acc", "leg_fields","a->2345;b->2346")
```


#### log_level (integer)


计费消息输出到 syslog 时所使用的日志级别。


默认值为 L_NOTICE。


```opensips title="log_level example"
modparam("acc", "log_level", 2)   # 将 log_level 设为 2
```


#### log_facility (string)


计费消息输出到 syslog 时所使用的日志设施（facility）。这样可以轻松地将计费相关的日志与其他日志消息区分开。


默认值为 LOG_DAEMON。


```opensips title="log_facility example"
modparam("acc", "log_facility", "LOG_DAEMON")
```


#### aaa_url (string)


这是表示所使用 AAA 协议及其配置文件位置的 url。


如果该参数被设置为空字符串，AAA 计费支持将被禁用。


默认值为 "NULL"。


```opensips title="Set aaa_url parameter"
...
modparam("acc", "aaa_url", "radius:/etc/radiusclient-ng/radiusclient.conf")
...
```


#### service_type (integer)


用于计费的 AAA 服务类型。


默认值未设置。


```opensips title="service_type example"
# SIP 的服务类型默认值为 15
modparam("acc", "service_type", 15)
```


#### db_table_acc (string)


成功呼叫计费所用的表名——与数据库相关。


默认值为 "acc"


```opensips title="db_table_acc example"
modparam("acc", "db_table_acc", "myacc_table")
```


#### db_table_missed_calls (string)


未接呼叫计费所用的表名——与数据库相关。


默认值为 "missed_calls"


```opensips title="db_table_missed_calls example"
modparam("acc", "db_table_missed_calls", "myMC_table")
```


#### db_url (string)


SQL 地址——与数据库相关。如果设置为 NULL 或空字符串，SQL 支持将被禁用。


默认值为 "NULL"（SQL 已禁用）。


```opensips title="db_url example"
modparam("acc", "db_url", "mysql://user:password@localhost/opensips")
```


#### acc_method_column (string)


计费表中用于以字符串形式存储请求方法名的列名。


默认值为 "method"。


```opensips title="acc_method_column example"
modparam("acc", "acc_method_column", "method")
```


#### acc_from_tag_column (string)


计费表中用于存储 From 头域 TAG 参数的列名。


默认值为 "from_tag"。


```opensips title="acc_from_tag_column example"
modparam("acc", "acc_from_tag_column", "from_tag")
```


#### acc_to_tag_column (string)


计费表中用于存储 To 头域 TAG 参数的列名。


默认值为 "to_tag"。


```opensips title="acc_to_tag_column example"
modparam("acc", "acc_to_tag_column", "to_tag")
```


#### acc_callid_column (string)


计费表中用于存储请求 Callid 值的列名。


默认值为 "callid"。


```opensips title="acc_callid_column example"
modparam("acc", "acc_callid_column", "callid")
```


#### acc_sip_code_column (string)


计费表中用于以字符串格式存储最终应答数字状态码值的列名。


默认值为 "sip_code"。


```opensips title="acc_sip_code_column example"
modparam("acc", "acc_sip_code_column", "sip_code")
```


#### acc_sip_reason_column (string)


计费表中用于存储最终应答原因短语值的列名。


默认值为 "sip_reason"。


```opensips title="acc_sip_reason_column example"
modparam("acc", "acc_sip_reason_column", "sip_reason")
```


#### acc_time_column (string)


计费表中用于以日期时间格式存储事务完成时间戳的列名。


默认值为 "time"。


```opensips title="acc_time_column example"
modparam("acc", "acc_time_column", "time")
```


### 导出的伪变量 {#exported-pseudo-variables}


#### $acc_extra(tag_name)


该变量可使用通过 [extra_fields](#extra_fields-string) 定义的标签名来访问。如果未调用 [do_accounting()](#do_accountingtype-flags-table)，该变量在单条消息的整个处理过程中都可见，从而可以调用 *acc_XXX_request()*。如果调用了 [do_accounting()](#do_accountingtype-flags-table)，该变量将从首次调用该函数起一直可见到实际进行计费为止。


#### $(acc_leg(tag_name)[leg_index])


该变量可使用通过 [leg_fields](#leg_fields-string) 定义的标签名以及有效的腿索引（<= [$acc_current_leg](#acc_current_leg-read-only)）来访问。除非使用了 [do_accounting()](#do_accountingtype-flags-table)，否则该变量无法使用。该变量还接受负索引，负索引从 -1 开始（最后添加的腿）。


```opensips
# 当前腿的 "caller" 值
$acc_leg(caller)

# 最后添加的腿的 "caller" 值
$(acc_leg(caller)[-1]) # 等价于 $acc_leg(caller)
                       # 等价于 $(acc_leg(caller)[$acc_current_leg])

# 倒数第二个腿的 "caller" 值
$(acc_leg(caller)[-2])
```


#### $acc_current_leg (read-only) {#acc_current_leg-read-only}


保存当前腿的索引，从 0 开始。调用 [acc_new_leg()](#acc_new_leg) 将使该索引递增。


### 导出的函数 {#exported-functions}


#### do_accounting(type, [flags], [table]) {#do_accountingtype-flags-table}


`do_accounting()` 取代了所有
*_flag 与 *_missed_flag、cdr_flag、failed transaction_flag 以及 db_table_avp 模块参数。只需调用 do_accounting()，选择希望计费在何处以及以何种方式进行，该函数就会为你完成所有工作。


被多次调用时，该函数表现为*累加*行为。


参数含义如下：


- *type (string)* - 你希望执行的计费类型。所有类型都必须用 '|' 分隔。可使用以下参数：
  - *log* - syslog 计费；
  - *db* - 数据库计费；
  - *aaa* - aaa 专用计费；
  - *evi* - 事件接口计费；
- *flags (string, optional)* - 你所选计费类型的标志位。所有类型都必须用 '|' 分隔。可使用以下参数：
  - *cdr* - 启用对话级计费。
OpenSIPS 将在内部检测对话终止（生成/收到 BYE 请求），并在 BYE 请求被应答后立即存储 CDR。通过启用 "cdr" 标志位，将填充以下附加字段：duration、ms_duration、setuptime、created。（需要 dialog 模块支持）
  - *missed* - 记录未接呼叫；请注意，
该标志位在第一个未接呼叫之后将被停用；如果你希望对每个未响应该呼叫的目的方都计费，则必须在
*failure_route* 中重新激活它；
  - *failed* -  该标志位指示在失败情况下（status>=300）是否也应对事务计费；
- *table (string, optional)* - 进行计费所用的表；
它取代了旧的 table_avp 参数；


该函数可在 REQUEST_ROUTE、FAILURE_ROUTE、BRANCH_ROUTE 和 LOCAL_ROUTE 中使用。


```opensips title="do_accounting usage"
		...
		if (!has_totag()) {
			if (is_method("INVITE")) {
			/* 启用数据库和 syslog 中的 cdr 与未接呼叫计费；
			 * 数据库计费将在 "my_acc" 表中进行 */
				do_accounting("db|log", "cdr|missed", "my_acc");
			}
		}
		...
		if (is_method("BYE")) {
			/* 通过 aaa 进行普通计费 */
			do_accounting("aaa");
		}
		...
		
```


#### drop_accounting([type], [flags])


`drop_accounting()` 重置由 do_accounting() 设置的计费标志位和类型。若不带参数调用，将停止所有计费。若只带一个参数调用，将停止该类型的所有计费。若带两个参数调用，普通计费仍将保持启用。


被多次调用时，该函数表现为*累加*行为。


参数含义如下：


- *type (string, optional)* - 你希望停止的计费类型。所有类型都必须用 '|' 分隔。可使用以下参数：
  - *log* - 停止 syslog 计费；
  - *db* - 停止数据库计费；
  - *aaa* - 停止 aaa 专用计费；
  - *evi* - 停止事件接口计费；
- *flags (string, optional)* - 针对你所选计费类型要重置的标志位。所有类型都必须用 '|' 分隔。可使用以下参数：
  - *cdr* - 停止 CDR 计费；
  - *missed* - 停止记录未接呼叫；
  - *failed* -  停止失败事务计费；


该函数可在 REQUEST_ROUTE、FAILURE_ROUTE、BRANCH_ROUTE 和 LOCAL_ROUTE 中使用。


```opensips title="drop_accounting usage"
		...
		acc_log_request("403 Destination not allowed");
		if (!has_totag()) {
			if (is_method("INVITE")) {
			/* 启用数据库和 syslog 中的 cdr 与未接呼叫计费；
			 * 数据库计费将在 "my_acc" 表中进行 */
				do_accounting("db|log", "cdr|missed", "my_acc");
			}
		}
		...
		/* 脚本稍后位置 */
		if (...) { /* 你不再希望计费 */
			/* 停止所有 syslog 计费 */
			drop_accounting("log");
			/* 或停止 syslog 的未接呼叫与 cdr 计费；
			 * 普通计费仍将保持启用 */
			drop_accounting("log", "missed|cdr");
			/* 或停止所有类型的计费  */
			drop_accounting();
		}
		...
		
```


#### acc_log_request(comment)


`acc_request` 报告一个请求，例如，它可用于向被应答 404 - Not Found 的离线用户报告未接呼叫。为避免对 UDP 请求重传产生多条报告，你需要将该动作嵌入有状态处理中。


参数含义如下：


- *comment (string)* - 描述请求如何完成的注释——该字符串必须包含应答码，后接应答原因短语（例如："480 Nobody Home"）。此字符串中可以使用变量。


该函数可在 REQUEST_ROUTE、FAILURE_ROUTE、BRANCH_ROUTE 和 LOCAL_ROUTE 中使用。


```opensips title="acc_log_request usage"
...
acc_log_request("403 Destination not allowed");
...
```


#### acc_db_request(comment, table)


与 `acc_log_request` 类似，`acc_db_request` 报告一个请求。报告将发送到 "db_url" 指定的数据库，位于第二个动作参数所引用的表中。


参数含义如下：


- *comment (string)* - 描述请求如何完成的注释——该字符串必须包含应答码，后接应答原因短语（例如："480 Nobody Home"）。此字符串中可以使用变量。
- *table (string)* - 要使用的数据库表。


该函数可在 REQUEST_ROUTE、FAILURE_ROUTE、BRANCH_ROUTE 和 LOCAL_ROUTE 中使用。


```opensips title="acc_db_request usage"
...
acc_db_request("Some comment", "Some table");
acc_db_request("$T_reply_code $(<reply>rr)", "acc");
...
```


#### acc_aaa_request(comment)


与 `acc_log_request` 类似，`acc_aaa_request` 报告一个请求。它按 "aaa_url" 中的配置报告给 aaa 服务器。


参数含义如下：


- *comment (string)* - 描述请求如何完成的注释——该字符串必须包含应答码，后接应答原因短语（例如："404 Nobody home"）。此字符串中可以使用变量。


该函数可在 REQUEST_ROUTE、FAILURE_ROUTE、BRANCH_ROUTE 和 LOCAL_ROUTE 中使用。


```opensips title="acc_aaa_request usage"
...
acc_aaa_request("403 Destination not allowed");
...
```


#### acc_evi_request(comment)


与 `acc_log_request` 类似，`acc_evi_request` 报告一个请求。如果应答码为成功码（小于 300），该报告将打包为通过 OpenSIPS 事件接口发送的 *E_ACC_EVENT* 事件；如果为失败码或无应答码，则为 *E_ACC_MISSED_EVENT*。更多信息请参阅[导出的事件](#exported-events)。


参数含义如下：


- *comment (string)* - 描述请求如何完成的注释——该字符串必须包含应答码，后接应答原因短语（例如："404 Nobody home"）


该函数可在 REQUEST_ROUTE、FAILURE_ROUTE、BRANCH_ROUTE 和 LOCAL_ROUTE 中使用。


```opensips title="acc_evi_request usage"
...
acc_evi_request("403 Destination not allowed");
...
```


#### acc_new_leg() {#acc_new_leg}


仅在使用了多腿计费时才创建新腿并递增 [$acc_current_leg](#acc_current_leg-read-only)。新腿的所有值都将被初始化为 null。


该函数可在 REQUEST_ROUTE、FAILURE_ROUTE、BRANCH_ROUTE 和 LOCAL_ROUTE 中使用。


```opensips title="acc_new_leg usage"
...
	acc_new_leg();
...
```


#### acc_load_ctx_from_dlg() {#acc_load_ctx_from_dlg}


该函数加载并暴露当前正在使用的对话的计费上下文。所谓对话上下文，是指在脚本层面，你将读写另一个对话的计费变量。当前计费上下文会被暂存，直到执行卸载操作为止。


注意，该函数只有与 dialog 模块的 *load_dialog_ctx()* 函数一起使用时才有意义。在加载另一个对话的上下文之后，通过使用 *acc_load_ctx_from_dlg()* 函数，你还可以访问所加载对话的计费上下文。


注意：在执行卸载之前不能进行新的加载——不允许嵌套加载。


该函数可在任意类型的路由中使用。


```opensips title="acc_load_ctx_from_dlg usage"
...
if ( load_dialog_ctx("$var(callid)") ) {
	# 现在我们拥有了新对话的对话上下文
	acc_load_ctx_from_dlg();
	# 现在我们也拥有了该对话的计费上下文
	xlog("The accounting caller of call '$var(callid)' "
		"is '$acc_extra(caller)'\n");
	acc_unload_ctx_from_dlg();
	unload_dialog_ctx();
}

...
```


#### acc_unload_ctx_from_dlg()


该函数卸载先前加载的计费上下文，暴露在执行加载之前存在的计费上下文。


> [!NOTE] 
> 你必须在脚本中为每一次加载执行一次显式卸载！


该函数可在任意类型的路由中使用。


用法示例请参见 [acc_load_ctx_from_dlg()](#acc_load_ctx_from_dlg)。


### 导出的事件 {#exported-events}


#### E_ACC_CDR


生成 CDR 时引发的事件。注意，只有当使用自动 CDR 计费时才会触发该事件。


参数：


- *method* - 请求方法名
- *from_tag* - From 头域 tag 参数
- *to_tag* - To 头域 tag 参数
- *callid* - 消息 Call-id
- *sip_code* - 最终应答中的状态码
- *sip_reason* - 最终应答中的状态原因
- *time* - 呼叫建立时的时间戳
- *evi_extra** - 由 *evi_extra* 参数添加的额外参数。
- *evi_extra_bye** - 由 *evi_extra_bye* 参数添加的额外参数
- *multi_leg_info** - 由 *multi_leg_info* 参数添加的额外参数
- *multi_leg_bye_info** - 由 *multi_leg_bye_info* 参数添加的额外参数
- *duration* - 呼叫时长（秒）
- *ms_duration* - 呼叫时长（毫秒）
- *setuptime* - 呼叫建立时间（秒）
- *created* - 呼叫创建的时间戳（即收到初始 Invite 的时间）


#### E_ACC_EVENT


该事件在使用旧式计费时触发。当请求（INVITE 和 BYE）事务具有正的最终应答时，或由注释中包含正应答码的 `acc_evi_request()` 函数引发。


参数：


- *method* - 请求方法名
- *from_tag* - From 头域 tag 参数
- *to_tag* - To 头域 tag 参数
- *callid* - 消息 Call-id
- *sip_code* - 最终应答中的状态码
- *sip_reason* - 最终应答中的状态原因
- *time* - 事务创建时的时间戳
- *evi_extra** - 由 *evi_extra* 参数添加的额外参数
- *multi_leg_info** - 由 *multi_leg_info* 参数添加的额外参数


#### E_ACC_MISSED_EVENT


该事件在使用旧式计费时触发。当请求（INVITE 和 BYE）事务具有负的最终应答时，或由注释中包含负应答码的 `acc_evi_request()` 函数引发。


参数：


- *method* - 请求方法名
- *from_tag* - From 头域 tag 参数
- *to_tag* - To 头域 tag 参数
- *callid* - 消息 Call-id
- *sip_code* - 最终应答中的状态码
- *sip_reason* - 最终应答中的状态原因
- *time* - 事务创建时的时间戳
- *evi_extra** - 由 *evi_extra* 参数添加的额外参数
- *multi_leg_info** - 由 *multi_leg_info* 参数添加的额外参数
- *created* - 呼叫创建时的时间戳
- *setuptime* - 呼叫建立时间（秒）


## 常见问题 {#frequently-asked-questions}


**问：旧的 report_ack 参数发生了什么变化**


该参数已被视为过时。它被移除是因为 acc 模块执行的是基于 SIP 事务的计费，而根据 SIP RFC，端到端 ACK 属于不同的事务（仍属于同一对话）。ACK 可以像任何其他顺序（对话内）请求一样被单独计费。


**问：旧的 log_fmt 参数发生了什么变化**


随着 ACC 模块所记录数据的重构（参见概述章节），该参数已过时。若需要类似行为，可以使用额外计费（参见相应章节）。


**问：旧的 multi_leg_enabled 参数发生了什么变化**


随着新的 multi_leg_info 参数的加入，该参数已过时。当定义了 multi_leg_info 时，多腿计费会自动启用。


**问：旧的 src_leg_avp_id 和 dst_leg_avp_id 参数发生了什么变化**


该参数被更通用的新参数 multi_leg_info 取代。这使得可以（按腿）记录除 dst 和 src 之外的更多信息。


**问：在哪里可以找到更多关于 OpenSIPS 的信息？**


请查看 [https://opensips.org/](https://opensips.org/)。


**问：可以在哪里提出关于本模块的问题？**


首先请确认你的问题是否已在我们的某个邮件列表中得到了解答：


有关任何稳定版 OpenSIPS 发布的邮件应发送至
users@lists.opensips.org，有关开发版本的邮件应发送至 devel@lists.opensips.org。


如果你希望邮件保持私密，请发送至
users@lists.opensips.org。


**问：如何报告缺陷？**


请遵循以下位置提供的指南：
[https://github.com/OpenSIPS/opensips/issues](https://github.com/OpenSIPS/opensips/issues)。
<!-- CONTRIBUTORS -->

### 许可证 {#license}


所有文档文件（即 .md 扩展名）均按 Creative Common License 4.0 许可发布。
