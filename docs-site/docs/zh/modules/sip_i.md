---
title: "sip_i 模块"
description: "本模块提供处理封装在 SIP 中的 ISDN 用户部分（ISUP）消息的能力。"
sidebar: false
---

## 管理指南 {#admin-guide}


### 概述 {#overview}


本模块提供处理封装在 SIP 中的 ISDN 用户部分（ISUP）消息的能力。可用的操作包括：读取和修改 ISUP 消息中的参数、删除或添加新的可选参数、向 SIP 消息体中添加 ISUP 部分。这些操作通过脚本伪变量和函数显式完成。


支持的 ISUP 消息类型仅限于按照 ITU-T 定义的 SIP-I（SIP with encapsulated ISUP）协议能够包含在 SIP 消息中的那些类型。


ISUP 消息和参数的格式与规范遵循 ITU-T Rec. Q.763 的建议。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


加载本模块之前必须先加载以下模块：


- *无*。


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，必须安装以下库或应用程序：


- *无*。


### 导出的参数 {#exported-parameters}


#### param_subfield_separator (str)


用作 *$isup_param* 与 *$isup_param_str* 伪变量子名中 ISUP 参数名与子字段名之间分隔符的字符。


*默认值为 "|"。*


```opensips title="Set param_subfield_separator parameter"
...
modparam("sip_i", "param_subfield_separator", ":")
...
```


#### isup_mime_str (str)


创建新的 ISUP 部分时，用于 ISUP MIME 消息体的 Content-Type 头域字段的字符串。


*默认值为 "application/ISUP;version=itu-t92+"。*


```opensips title="Set isup_mime_str parameter"
...
modparam("sip_i", "isup_mime_str", "application/ISUP;base=itu-t92+;version=itu-t")
...
```


#### default_part_headers (str)


与 *Content-Type* 头域一同推入 ISUP 部分的默认头域集合（已完整定义，包含头域终止符）。


*默认值为 "Content-Disposition:signal;handling=optional\r\n"。*


```opensips title="Set default_part_headers parameter"
...
modparam("sip_i", "default_part_headers", "Content-Disposition:signal;handling=required\r\n")
...
```


#### country_code (str)


国家代码，用于在默认从 SIP 映射 Calling Party Number ISUP 参数时，与 P-Asserted-Identity 中号码的第一部分进行比对。若匹配，则赋予 Nature of Address Indicator 子字段的值为 *3*（国内），否则为 *4*（国际）。


*默认值为 "+1"。*


```opensips title="Set country_code parameter"
...
modparam("sip_i", "country_code", "+4")
...
```


### 导出的函数 {#exported-functions}


#### add_isup_part([isup_msg_type][,extra_headers])


向 SIP 消息体中添加一个新的 ISUP 部分。


除少数 ISUP 消息类型（IAM、REL、ACM、CPG、ANM、CON）之外，新添加的部分包含一个空的 ISUP 消息（即所有必填参数置零、不含任何可选参数），所有必需的参数都应通过 $isup_param 设置。对于上述消息类型，必填参数和部分可选参数会依据 ITU-T Rec. Q.1912.5 中的基本 SIP-ISUP 互通规则自动设置为默认值。这只提供了一种从 SIP 头域和消息类型（请求方法、应答码等）到 ISUP 参数的通用且简化的映射，不应仅依赖它来实现 SIP-ISUP 互通。


参数含义如下：


- *isup_msg_type (string, optional)* - 要添加的 ISUP 消息名称，与 ITU-T Rec. Q.763 中的写法完全一致，或为缩写（例如 *IAM* 表示 "Initial address"）。
- *extra_headers (string, optional)* - 一段完整定义的 SIP 头域（包含头域终止符），插入到 ISUP 部分中 *Content-Type* 头域之后。它会覆盖全局模块参数 *default_part_headers*。若未指定，则使用 *default_part_headers* 的值。


若未显式提供 *isup_msg_type*，则按如下方式从 SIP 消息中自动推断：


- INVITE - IAM
- BYE - REL
- 180, 183 - ACM
- 4xx, 5xx - REL
- 200 OK INVITE - ANM
- 200 OK BYE - RLC


每种 ISUP 消息类型可作为 *isup_msg_type* 给出的缩写如下：


- Initial address - *IAM*
- Address complete - *ACM*
- Answer - *ANM*
- Connect - *CON*
- Release - *REL*
- Release complete - *RLC*
- Call progress - *CPG*
- Facility reject - *FRJ*
- Facility accepted - *FAA*
- Facility request - *FAR*
- Confusion - *CFN*
- Suspend - *SUS*
- Resume - *RES*
- Subsequent address - *SAM*
- Forward transfer - *FOT*
- User-to-user information - *USR*
- Network resource management - *NRM*
- Facility - *FAC*
- Identification request - *IRQ*
- Identification response - *IRS*
- Loop prevention - *LPR*
- Application transport - *APT*
- Pre-release information - *PRI*


本函数可在 REQUEST_ROUTE、FAILURE_ROUTE、ONREPLY_ROUTE、LOCAL_ROUTE 中使用。


```opensips title="add_isup_part usage"
...
if ($rs == "183") {
	# 封装一个 CPG
	add_isup_part("Call progress");
	# 设置所需参数
	...
}
...
	
```


### 导出的伪变量 {#exported-pseudo-variables}


#### $(isup_param(param_name{sep}subfield_name)[byte_index])


接收到的或新添加的 ISUP 消息中名为 *param_name* 的 ISUP 参数可通过该读写变量访问。对于可选参数，向本 ISUP 消息中不存在的 *param_name* 写入会将其插入。向该变量赋空值会从消息中删除该可选参数，若为必填参数则将其置零。


`$isup_param` 的子名格式如下：


- *param_name* - ISUP 参数名称，与 ITU-T Rec. Q.763 中的写法一致
- *sep* - 分隔符，前后允许有空白字符
- *subfield_name* - ISUP 参数的子字段名称，与 ITU-T Rec. Q.763 中的写法一致


ISUP 参数可以通过不同方式寻址：


- 整个参数 - 仅将 ISUP 参数名作为变量子名，从而以如下形式访问整个参数的内容：读写时为十六进制字符串（类似于十六进制 "dump"），写入时为字符串别名，或读写时为整型值；赋值十六进制字符串时，十六进制值必须以 "0x" 开头；读取时，若该参数支持字符串别名，则返回关联的整型值，否则返回十六进制字符串
- 子字段级 - 将 ISUP 参数名与子字段名作为变量子名，从而以整型值或字符串值（例如 Called Party Number 等参数的电话号码）读写，或以字符串别名写入，访问特定子字段
- 字节级 - 将 ISUP 参数名与索引作为变量子名，从而以整型值访问指定索引处的字节


对于 ITU-T Rec. Q.763 中定义的所有 ISUP 参数，均支持以十六进制字符串形式在整参数级寻址以及字节级寻址。子字段级寻址仅受部分 ISUP 参数支持，且该建议中定义的参数的子字段也并非全部受支持。


并非所有参数或参数子字段都有字符串别名。此外，参数或参数子字段的所有可能取值也并非都定义了字符串别名。


有关支持的子字段和别名的更多信息，请查看[子字段别名](#isup-parameter-subfields-and-string-aliases)。


```opensips title="isup_param usage"
...
	$isup_param(Called Party Number | Nature of address indicator) = 3;
	...
	# 使用字符串别名
	$isup_param(Called Party Number | Numbering plan indicator) = "ISDN";
	...
	$isup_param(Called Party Number | Address signal) = "99991234";
	$isup_param(Nature of connection indicators) = "0x01"
	$isup_param(Calling party's category) = 10;
	...
	# 使用字符串别名
	$isup_param(Transmission Medium Requirement) = "speech";
	...
	# 按字节级访问
	$(isup_param(Forward Call Indicators)[0]) = 96;
	$(isup_param(Forward Call Indicators)[1]) = 1;
...
	
```


#### $isup_param_str(param_name{sep}subfield_name)


接收到的或新添加的 ISUP 消息中名为 *param_name* 的 ISUP 参数也可通过该只读变量访问。该变量的用法与 *$isup_param* 类似，区别在于它会尽可能返回取值的字符串别名。


`$isup_param_str` 的子名格式如下：


- *param_name* - ISUP 参数名称，与 ITU-T Rec. Q.763 中的写法一致
- *sep* - 分隔符，前后允许有空白字符
- *subfield_name* - ISUP 参数的子字段名称，与 ITU-T Rec. Q.763 中的写法一致


```opensips title="isup_param_str usage"
...
	# 可能输出: "NOA is: national"  
	xlog("NOA is: $isup_param_str(Called Party Number|Nature of address indicator)");
	# 可能输出: "CpN is: 99991234"
	xlog("CpN is: $isup_param_str(Called Party Number|Address signal)");
	# 可能输出: "nature of conn: 0x01"
	xlog("nature of conn: $isup_param_str(Nature of connection indicators)");
	# 可能输出: "Cg cat is: ordinary"
	xlog("$isup_param_str(Calling party's category)");
...
	
```


#### $isup_msg_type


只读变量，以字符串形式返回 ISUP 消息类型。


```opensips title="isup_msg_type usage"
...
	# 可能输出: "ISUP msg is: IAM"
	xlog("ISUP msg is: $isup_msg_type");
...
	
```


### 导出的脚本变换 {#exported-script-transformations}


本模块还提供了一种方式，可从任意脚本变量中包含的 ISUP 消息中访问 ISUP 参数及其子字段的值，而无需直接访问被处理的 SIP（封装了 ISUP）消息。做法是对包含 ISUP 消息体的脚本变量应用变换。原变量的值不会被修改，并返回相应的整型或字符串值（按精确值或字符串别名表示 ISUP 参数或子字段）。


#### {isup.param,param_name,[subfield_name]}


该变换的结果类似于读取 `$isup_param` 伪变量，区别在于不提供字节级访问。


该变换的参数为：


- *param_name* - ISUP 参数名称，与 ITU-T Rec. Q.763 中的写法一致
- *subfield_name* - 可选，ISUP 参数的子字段名称，与 ITU-T Rec. Q.763 中的写法一致


```opensips title="isup.param usage"
...
	# 本例中，我们从接收到的 SIP-I 消息中取出 ISUP 消息体
	$var(isup_body) = $(rb[1]);

	# 可能输出: "NOA is: 3"  
	xlog("NOA is: $(var(isup_body){isup.param, Called Party Number, Nature of address indicator})\n");

	# 可能输出: "CpN is: 99991234"  
	xlog("CpN is: $(var(isup_body){isup.param, Called Party Number, Address signal})\n");

	# 可能输出: "Cg cat is: 10"
	xlog("Cg cat is: $(var(isup_body){isup.param, Calling party's category})\n");

	# 可能输出: "nature of conn: 0x01"
	xlog("nature of conn: $(var(isup_body){isup.param, Nature of connection indicators})\n");
...
	
```


#### {isup.param.str,param_name,[subfield_name]}


该变换的结果类似于读取 `$isup_param_str` 伪变量，区别在于不提供字节级访问。


该变换的参数为：


- *param_name* - ISUP 参数名称，与 ITU-T Rec. Q.763 中的写法一致
- *subfield_name* - 可选，ISUP 参数的子字段名称，与 ITU-T Rec. Q.763 中的写法一致


```opensips title="isup.param.str usage"
...
	# 本例中，我们从接收到的 SIP-I 消息中取出 ISUP 消息体
	$var(isup_body) = $(rb[1]);

	# 可能输出: "NOA is: national"  
	xlog("NOA is: $(var(isup_body){isup.param.str, Called Party Number, Nature of address indicator})\n");

	# 可能输出: "CpN is: 99991234"  
	xlog("CpN is: $(var(isup_body){isup.param.str, Called Party Number, Address signal})\n");

	# 可能输出: "Cg cat is: ordinary"
	xlog("Cg cat is: $(var(isup_body){isup.param.str, Calling party's category})\n");

	# 可能输出: "nature of conn: 0x01"
	xlog("nature of conn: $(var(isup_body){isup.param.str, Nature of connection indicators})\n");
...
	
```


### ISUP 参数子字段与字符串别名 {#isup-parameter-subfields-and-string-aliases}


每个 ISUP 参数支持的子字段及其取值的字符串别名如下：


- Nature of Connection Indicators

  - Satellite indicator

  - *no satellite* - 0
  - *one satellite* - 1
  - *two satellite* - 2
  - Continuity check indicator

  - *not required* - 0
  - *required* - 1
  - *performed* - 2
  - Echo control device indicator

  - *not included* - 0
  - *included* - 1
- Forward Call Indicators

  - National/international call indicator

  - *national* - 0
  - *international* - 1
  - End-to-end method indicator

  - *no method* - 0
  - *pass-along* - 1
  - *SCCP* - 2
  - *pass-along and SCCP* - 3
  - Interworking indicator

  - *no interworking* - 0
  - *interworking* - 1
  - End-to-end information indicator

  - *no end-to-end* - 0
  - *end-to-end* - 1
  - ISDN user part indicator

  - *not all the way* - 0
  - *all the way* - 1
  - ISDN user part preference indicator

  - *preferred* - 0
  - *not required* - 1
  - *required* - 2
  - ISDN access indicator

  - *non-ISDN* - 0
  - *ISDN* - 1
  - SCCP method indicator

  - *no indication* - 0
  - *connectionless* - 1
  - *connection* - 2
  - *connectionless and connection* - 3
- Optional forward call indicators

  - Closed user group call indicator

  - *non-CUG* - 0
  - *outgoing allowed* - 2
  - *outgoing not allowed* - 3
  - Simple segmentation indicator

  - *no additional information* - 0
  - *additional information* - 1
  - Connected line identity request indicator

  - *not requested* - 0
  - *requested* - 1
- Called Party Number

  - Odd/even indicator

  - *even* - 0
  - *odd* - 1
  - Nature of address indicator

  - *subscriber* - 1
  - *unknown* - 2
  - *national* - 3
  - *international* - 4
  - *network-specific* - 5
  - *network routing national* - 6
  - *network routing network-specific* - 7
  - *network routing with CDN* - 8
  - Internal Network Number indicator

  - *allowed* - 0
  - *not allowed* - 1
  - Numbering plan indicator

  - *ISDN* - 1
  - *Data* - 3
  - *Telex* - 4
  - Address signal
- Calling Party Number

  - Odd/even indicator

  - *even* - 0
  - *odd* - 1
  - Nature of address indicator

  - *subscriber* - 1
  - *unknown* - 2
  - *national* - 3
  - *international* - 4
  - Number Incomplete indicator

  - *complete* - 0
  - *incomplete* - 1
  - Numbering plan indicator

  - *ISDN* - 1
  - *Data* - 3
  - *Telex* - 4
  - Address presentation restricted indicator

  - *allowed* - 0
  - *restricted* - 1
  - *not available* - 2
  - *reserved* - 3
  - Screening indicator

  - *user* - 0
  - *network* - 1
  - Address signal
- Backward Call Indicators

  - Charge indicator

  - *no indication* - 0
  - *no charge* - 1
  - Called party's status indicator

  - *no indication* - 0
  - *subscriber free* - 1
  - *connect* - 2
  - Called party's category indicator

  - *no indication* - 0
  - *ordinary subscriber* - 1
  - *payphone* - 2
  - End to End method indicator

  - *no end-to-end* - 0
  - *pass-along* - 1
  - *SCCP* - 2
  - *pass-along and SCCP* - 3
  - Interworking indicator

  - *no interworking* - 0
  - *interworking* - 1
  - End to End information indicator

  - *no end-to-end* - 0
  - *end-to-end* - 1
  - ISDN user part indicator

  - *not all the way* - 0
  - *all the way* - 1
  - Holding indicator

  - *not requested* - 0
  - *requested* - 1
  - ISDN access indicator

  - *non-ISDN* - 0
  - *ISDN* - 1
  - Echo control device indicator

  - *not included* - 0
  - *included* - 1
  - SCCP method indicator

  - *no indication* - 0
  - *connectionless* - 1
  - *connection* - 2
  - *connectionless and connection* - 3
- Optional Backward Call Indicators

  - In-band information indicator

  - *no indication*- 0
  - *available* - 1
  - Call diversion may occur indicator

  - *no indication* - 0
  - *call diversion* - 1
  - Simple segmentation indicator

  - *no additional information* - 0
  - *additional information* - 1
  - MLPP user indicator

  - *no indication* - 0
  - *MLPP user* - 1
- Connected Number

  - Odd/even indicator

  - *even* - 0
  - *odd* - 1
  - Nature of address indicator

  - *subscriber* - 1
  - *unknown* - 2
  - *national* - 3
  - *international* - 4
  - Numbering plan indicator

  - *ISDN* - 1
  - *Data* - 3
  - *Telex* - 4
  - Address presentation restricted indicator

  - *allowed* - 0
  - *restricted* - 1
  - *not available* - 2
  - Screening indicator

  - *user* - 0
  - *network* - 1
  - Address signal
- Original Called Number

  - Odd/even indicator

  - *even* - 0
  - *odd* - 1
  - Nature of address indicator

  - *subscriber* - 1
  - *unknown* - 2
  - *national* - 3
  - *international* - 4
  - Numbering plan indicator

  - *ISDN* - 1
  - *Data* - 3
  - *Telex* - 4
  - Address presentation restricted indicator

  - *allowed* - 0
  - *restricted* - 1
  - *not available* - 2
  - *reserved* - 3
- Redirecting Number - same as *Original Called Number*
- Redirection Number - same as *Called Party Number*
- Redirection information

  - Redirecting indicator

  - *no redirection* - 0
  - *call rerouted* - 1
  - *call rerouted, all information restricted* - 2
  - *call diverted* - 3
  - *Call diverted, all information restricted* - 4
  - *call rerouted, redirection number restricted* - 5
  - *call diversion, redirection number restricted* - 6
  - Original redirection reason

  - *unknown/not available* - 0
  - *user busy* - 1
  - *no reply* - 2
  - *unconditional* - 3
  - Redirection counter

  - 1
  - 2
  - 3
  - 4
  - 5
  - Redirecting reason

  - *unknown/not available* - 0
  - *user busy* - 1
  - *no reply* - 2
  - *unconditional* - 3
  - *deflection alerting* - 4
  - *deflection response* - 5
  - *mobile not reachable* - 6
- Cause Indicators

  - Location

  - *user* - 0
  - *LPN* - 1
  - *LN* - 2
  - *TN* - 3
  - *RLN* - 4
  - *RPN* - 5
  - *INTL* - 7
  - *BI* - 10
  - Coding standard

  - *ITU-T* - 0
  - *ISO/IEC* - 1
  - *national* - 2
  - *location* - 3
  - Cause value
- Subsequent Number

  - Odd/even indicator

  - *even* - 0
  - *odd* - 1
  - Address signal
- Event Information

  - Event indicator

  - *alerting* - 1
  - *progress* - 2
  - *in-band or pattern* - 3
  - *busy* - 4
  - *no reply* - 5
  - *unconditional* - 6
  - Event presentation restricted indicator

  - *no indication* - 0
  - *restricted* - 1
- Calling Party's Category

  - *unknown* - 0
  - *french* - 1
  - *english* - 2
  - *german* - 3
  - *russian* - 4
  - *spanish* - 5
  - *ordinary* - 10
  - *priority* - 11
  - *data* - 12
  - *test* - 13
  - *payphone* - 15
- Transmission Medium Requirement

  - *speech* - 0
  - *64 kbit/s unrestricted* - 2
  - *3.1 kHz audio* - 3
  - *64 kbit/s preferred* - 6
  - *2 x 64 kbit/s* - 7
  - *384 kbit/s* - 8
  - *1536 kbit/s* - 9
  - *1920 kbit/s* - 10


### 必填 ISUP 参数 {#mandatory-isup-parameters}


每种需要必填参数的支持 ISUP 消息的必填参数（依据 ITU-T Rec. Q.763）如下：


- Initial address

  - Nature of connection indicators
  - Forward call indicators
  - Calling party's category
  - Transmission medium requirement
  - Called party number
- Address complete

  - Backward call indicators
- Connect

  - Backward call indicators
- Release

  - Cause indicators
- Call progress

  - Event information
- Facility reject

  - Facility indicator

  - Cause indicators
- Facility accepted

  - Facility indicator
- Facility request

  - Facility indicator
- Confusion

  - Cause indicators
- Suspend

  - Suspend/resume indicators
- Resume

  - Suspend/resume indicators
- Subsequent address

  - Subsequent number
- User-to-user information

  - User-to-user information
<!-- CONTRIBUTORS -->

### 许可证 {#license}

所有文档文件（即 .md 扩展名）均依据 Creative Common License 4.0 授权。

