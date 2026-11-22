---
title: "dialplan 模块"
description: "该模块基于匹配与替换规则实现通用的字符串转换。"
---

## 管理员指南 {#admin-guide}


### 概述 {#overview}


该模块基于匹配与替换规则实现通用的字符串转换。它可用于操作 R-URI 或某个
PV，并转换成新的格式/值。


### 工作原理 {#how-it-works}


启动时，模块会从一张或多张兼容 dialplan 的表
加载所有转换规则。每张表的数据都将存储在一个
*分区*（partition，数据源）中，该分区由
"db_url" 和 "table_name" 属性定义。表中的每一行都会作为一条转换规则存储在
内存中。每条规则描述如何执行匹配、如何修改输入值，
以及为匹配到的转换设置哪些属性。


dialplan 规则可以有两种类型：


- *"字符串匹配"规则* —— 对输入字符串执行
字符串相等测试。通过启用规则的 "match_flags"
位掩码列的第 1 位，可以忽略字符的大小写
（即把该列的值设为 1 或 0，分别表示不区分或区分大小写）
- *"正则匹配"规则* —— 使用 Perl
兼容正则表达式，尝试用规则的表达式匹配输入字符串。通过启用
规则的 "match_flags" 位掩码列的第 1 位，
可以以不区分大小写的方式执行正则
匹配（即把该列的值设为 1 或 0，分别表示不区分或区分大小写）


模块提供 *dp_translate()* 脚本函数，
它期望一个**字符串**类型的输入值，
该值最坏情况下会与某个分区的所有规则进行匹配。


在内部，模块会把一个分区的规则分为两组："string" 和 "regex"。
匹配逻辑会尝试在这两组规则中分别找出第一个匹配项。每组都会按
优先级**升序**迭代。如果某个输入
字符串恰好同时匹配两组中的规则，则会选择优先级
最小的那条规则。此外，如果这两条匹配
规则的优先级也相同，则会选择 "id" 字段（唯一键）
最小的那条。


一旦确定了一条规则，就会应用所定义转换（如果有），
并把结果作为输出值返回。另外，如果该规则关联了任何字符串
属性，该属性也会随输出值一起返回给脚本。


### 使用场景 {#usage-cases}


该模块可用于实现 dialplan——完成拨号号码的自动补全
（例如国内号码转国际号码），把通用号码
转换为特定号码（例如用于紧急号码）。


此外，该模块可用于检测映射到某个服务/情况的号码范围或号码集合——
这里的 "attributes" 字符串列可用于
存储关于该服务/情况的附加信息。


非 SIP 的字符串转换也可以实现——比如把
各种可能格式的国家名称转换为规范格式：
(UK, England, United Kingdom) -> GB。


以及任何其他目的的、基于字符串的转换或检测。


### 数据库结构与用法 {#database-structure-and-usage}


取决于你想用该模块进行何种操作（转换、匹配等），
你需要填充相应的数据库记录。


dialplan 模块所用表的定义可在
[dialplan 表文档](https://docs.opensips.org/manual/3-6/install-dbschema/#table-dialplan) 中找到


#### 表中应放置什么 {#what-to-place-in-table}


##### 字符串转换（正则检测，subst 替换）{#string-translation-regexp-detection-subst-translation}


识别各种形式（国际、国内）的号码块，
并将其转换为规范格式（E.164）


- *match_op* = 1（正则）
- *match_exp* = "^(0040|\+40|0|40)21[0-9]+" ;
将用于与该规则匹配的正则表达式（即
该规则是否应应用于输入字符串）
- *match_flags* = 0（0——区分大小写，
1——不区分大小写匹配）
- *subst_exp* = "^(0040|\+40|0|40)(.+)" ;
用于执行转换的正则表达式（subst 操作的
第一部分）
- *repl_exp* = "40\2" ; subst 的
第二部分（输出）——与 subst_exp 字段关联；两者都
定义时，它们的作用相当于 subst()


##### 字符串转换（正则检测，替换）{#string-translation-regexp-detection-replacement}


识别国家名称（多种语言），并将其
转换为单一的固定值


- *match_op* = 1（正则）
- *match_exp* = "^((Germany)|(Germania)|(Deutschland)|(DE))" ;
将用于与该规则匹配的正则表达式（即
该规则是否应应用于输入字符串）
- *match_flags* = 0（0——区分大小写，
1——不区分大小写匹配）
- *subst_exp* = NULL ;
当转换实际上是替换时，该字段必须
为 NULL。
- *repl_exp* = "DE" ; 用于替换
输入的静态字符串——只要该规则匹配，它就会
返回该字符串作为输出。


##### 号码检测（正则检测，不做替换）{#number-detection-regexp-detection-no-replacement}


识别属于某个单一服务的号码块，
并通过属性加以标记。


- *match_op* = 1（正则）
- *match_exp* = "^021456[0-9]{5}" ;
将用于与该规则匹配的正则表达式（即
该规则是否应应用于输入字符串）
- *match_flags* = 0（0——区分大小写，
1——不区分大小写匹配）
- *subst_exp* = NULL ;
不做转换
- *repl_exp* = NULL ;
不做转换
- *attrs* = "serviceX" ;
该字符串会进入 OpenSIPS 脚本，并为你
提供更多信息（完全自定义）


##### 字符串转换（相等检测，替换）{#string-conversion-equal-detection-replacement}


识别固定的字符串/号码，并将其替换为某个固定内容。


- *match_op* = 0（相等）
- *match_exp* = "SIP server" ;
要匹配的字符串
- *match_flags* = 0（0——区分大小写，
1——不区分大小写匹配）
- *subst_exp* = NULL ;
不做 subst 转换
- *repl_exp* = "OpenSIPS" ;
输出字符串


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


在本模块之前必须加载以下模块：


- *无*


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，必须安装以下
库或应用程序：


- *libpcre-dev —— [PCRE](http://www.pcre.org/) 的开发库*。


### 导出参数 {#exported-parameters}


#### partition (string)


指定一个新的 dialplan 分区（数据源）。该参数可以
设置多次。每个分区可以有自己的 "db_url" 和
"table_name"。如果未指定，这些值将分别继承自
[db_url](#db_url-string)、db_default_url 或
[table_name](#table_name-string)。默认分区的名称
为 'default'。


> [!NOTE]
> OpenSIPS 会校验每个分区，因此请确保在通过
> 'db_url' 属性定义的每个数据库的 "version" 表中添加所需的条目。


```opensips title="定义 'pstn' 分区"
...
modparam("dialplan", "partition", "
	pstn:
		table_name = dialplan;
		db_url = mysql://opensips:opensipsrw@127.0.0.1/opensips")
...
		
```


```opensips title="定义 'pstn' 分区并把它设为 'default' 分区，从而避免加载 'dialplan' 表"
...
db_default_url = "mysql://opensips:opensipsrw@localhost/opensips"

loadmodule "dialplan.so"
modparam("dialplan", "partition", "
	pstn:
		table_name = dialplan_pstn")
modparam("dialplan", "partition", "default: pstn")
...
		
```


#### db_url (string) {#db_url-string}


模块的默认 DB 连接，会覆盖全局的
'db_default_url' 设置。一旦指定，缺少
'db_url' 属性的分区将从该值继承其 URL。


*默认值为 NULL（未设置）。*


```opensips title="设置 db_url 参数"
...
modparam("dialplan", "db_url", "mysql://user:passwd@localhost/db")
...
		
```


#### table_name (string) {#table_name-string}


用于加载转换规则的默认表名。
缺少 'table_name' 属性的分区将从该值
继承其表名。


*默认值为 "dialplan"。*


```opensips title="设置 table_name 参数"
...
modparam("dialplan", "table_name", "my_table")
...
		
```


#### dpid_col (string)


用于存储 dialplan ID 组的列名。


*默认值为 "dpid"。*


```opensips title="设置 dpid_col 参数"
...
modparam("dialplan", "dpid_col", "column_name")
...
		
```


#### pr_col (string)


用于存储表中相应规则优先级的列名。
优先级值越小，优先级越高。


*默认值为 "pr"。*


```opensips title="设置 pr_col 参数"
...
modparam("dialplan", "pr_col", "column_name")
...
		
```


#### match_op_col (string)


用于存储规则匹配类型的列名。


*默认值为 "match_op"。*


```opensips title="设置 match_op_col 参数"
...
modparam("dialplan", "match_op_col", "column_name")
...
		
```


#### match_exp_col (string)


用于存储规则匹配表达式的列名。


*默认值为 "match_exp"。*


```opensips title="设置 match_exp_col 参数"
...
modparam("dialplan", "match_exp_col", "column_name")
...
		
```


#### match_flags_col (string)


用于存储各种匹配标志位的列名。当前
0——区分大小写匹配，1——不区分大小写匹配。


*默认值为 "match_flags"。*


```opensips title="设置 match_flags_col 参数"
...
modparam("dialplan", "match_flags_col", "column_name")
...
		
```


#### subst_exp_col (string)


用于存储规则替换（substitution）表达式的列名。


*默认值为 "subst_exp"。*


```opensips title="设置 subs_exp_col 参数"
...
modparam("dialplan", "subst_exp_col", "column_name")
...
		
```


#### repl_exp_col (string)


用于存储规则替换（replacement）表达式的列名。


*默认值为 "repl_exp"。*


```opensips title="设置 repl_exp_col 参数"
...
modparam("dialplan", "repl_exp_col", "column_name")
...
		
```


#### timerec_col (string)


该列名表示在规则内额外进行一次时间重复（time recurrence）检查
（列值为 RFC 2445 兼容的字符串）。该值的格式
与 *cfgutils* 模块的
[check_time_rec()](/zh/modules/cfgutils#check-time-rec-time-string-timestamp)
函数的输入完全相同，包括
可选地使用逻辑运算符把多个这样的字符串链接成
更大的表达式。


*默认值为 "timerec"。*


```opensips title="设置 timerec_col 参数"
...
modparam("dialplan", "timerec_col", "month_match")
...
		
```


#### disabled_col (string)


该列名表示 dialplan 规则是否被禁用。


*默认值为 "disabled"。*


```opensips title="设置 disabled_col 参数"
...
modparam("dialplan", "disabled_col", "disabled_column")
...
		
```


#### attrs_col (string)


用于存储规则专属属性的列名。


*默认值为 "attrs"。*


```opensips title="设置 attrs_col 参数"
...
modparam("dialplan", "attrs_col", "column_name")
...
		
```


### 导出函数 {#exported-functions}


#### dp_translate(id, input, [out_var], [attrs_var], [partition])


会尝试按照 dialplan ID 等于 id 的转换规则，
把 src 字符串转换为 dest 字符串。


各参数含义如下：


- *id*（int）——用于匹配规则的 dialplan id
- *input*（string）——用于规则匹配
以及计算输出字符串的输入字符串。
- *out_var*（var，可选）——转换成功时，用输出字符串
（如果转换规则提供了的话）填充/写入的变量。
- *attrs_var*（var，可选）——转换成功时，用转换规则的 "attributes" 字段
填充/写入的变量。
如果该字段为 NULL 或空字符串，该变量将被设为空字符串。
- *partition*（string，可选）——用于定位 DP ID
的分区（数据集）名称。


该函数可在 REQUEST_ROUTE、FAILURE_ROUTE、LOCAL_ROUTE、
BRANCH_ROUTE、STARTUP_ROUTE、TIMER_ROUTE 和 EVENT_ROUTE 中使用。


```opensips title="dp_translate 用法"
...
dp_translate(240, $ru, $var(out));
xlog("translated into '$var(out)' \n");
...
	
```


```opensips title="dp_translate 用法"
...
$avp(src) = $ruri.user;
dp_translate($var(x), $avp(src), $var(y), $var(attrs));
xlog("translated to var $var(y) with attributes: '$var(attrs)'\n");
...
	
```


```opensips title="dp_translate 用法"
...
$var(id) = 10;
dp_translate($var(id), $avp(in), , $avp(attrs), "example_partition");
xlog("matched with attributes '$avp(attrs) against example_partition'\n");
...
	
```


```opensips title="dp_translate 用法"
...
dp_translate(10, $var(in), , , $var(part));
xlog("'$var(in)' matched against partition '$var(part)'\n")
...
	
```


### 导出的 MI 函数 {#exported-mi-functions}


#### dp_reload


它会通过加载数据库信息来更新转换规则。


名称：*dp_reload*


参数：*1*


- *partition*（可选）——要重新加载的
分区。如果未指定，将重新加载所有分区。


MI DATAGRAM 命令格式：


```bash
opensips-cli -x mi dp_reload
```


#### dp_translate


它会把由某个 dialplan id 标识的转换规则
应用于一个输入字符串。


名称：*dp_translate*


参数：*3*


- *dpid*——用于匹配输入字符串的
规则集的 dpid
- *input*——输入字符串
- *partition*——（可选）dpid 所在
的分区名称


MI DATAGRAM 命令格式：


```bash
opensips-cli -x mi dp_translate 10 +40123456789
```


#### dp_show_partiton


显示分区详情。


名称：*dp_show_partiton*


参数：*2*


- *partition*（可选）——
分区名称。如果未指定分区，将列出所有已知
分区。


MI DATAGRAM 命令格式：


```bash
opensips-cli -x mi dp_translate default
```


### 导出的状态/报告标识符 {#exported-statusreport-identifiers}


该模块提供 "dialplan" 状态/报告组，其中每个
dialplan 分区都定义为一个单独的 SR 标识符。


#### [partition_name]


这些标识符的状态反映了缓存数据的
就绪程度/状态（从 DB 加载时是否有可用数据）：


- *-2*——完全没有数据（初始状态）
- *-1*——没有数据，正在执行初始加载
- *1*——数据已加载，分区就绪
- *2*——数据可用，正在重新加载


在报告/日志方面，将上报以下事件：


- 开始加载 DB 数据
- DB 数据加载失败，丢弃
- DB 数据加载成功完成
- 已加载 N 条规则（丢弃 N 条）


```json
{
    "Name": "default",
    "Reports": [
        {
            "Timestamp": 1652778355,
            "Date": "Tue May 17 12:05:55 2022",
            "Log": "starting DB data loading"
        },
        {
            "Timestamp": 1652778355,
            "Date": "Tue May 17 12:05:55 2022",
            "Log": "DB data loading successfully completed"
        },
        {
            "Timestamp": 1652778355,
            "Date": "Tue May 17 12:05:55 2022",
            "Log": "5 rules loaded (0 discarded)"
        },
        {
            "Timestamp": 1652778405,
            "Date": "Tue May 17 12:06:45 2022",
            "Log": "starting DB data loading"
        },
        {
            "Timestamp": 1652778405,
            "Date": "Tue May 17 12:06:45 2022",
            "Log": "DB data loading successfully completed"
        },
        {
            "Timestamp": 1652778405,
            "Date": "Tue May 17 12:06:45 2022",
            "Log": "5 rules loaded (0 discarded)"
        }
    ]
}
	
```


有关如何访问和使用状态/报告信息，请参阅
[状态/报告接口](/zh/manual/Interface-StatusReport)。


### 安装 {#installation}


该模块需要在 OpenSIPS 数据库中有一张表：dialplan。创建它们的 SQL
语法可在 opensips/scripts 文件夹下各 database 目录中的
dialplan-create.sql 脚本中找到。
你也可以在项目网页上找到完整的数据库文档：
[https://opensips.org/docs/db/db-schema-devel.html](https://opensips.org/docs/db/db-schema-devel.html)。


## 开发者指南 {#developer-guide}


该模块不提供任何可供其他 OpenSIPS 模块使用的 API。
<!-- CONTRIBUTORS -->

### 许可证 {#license}

所有文档文件（即 .md 扩展名）均按 Creative Common License 4.0 许可
