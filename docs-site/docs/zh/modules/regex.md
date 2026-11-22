---
title: "regex 模块"
description: "本模块使用强大的 [PCRE](http://www.pcre.org/) 库提供针对正则表达式的匹配操作。"
sidebar: false
---


## 管理员指南 {#admin-guide}


### 概述 {#overview}


本模块使用强大的 [PCRE](http://www.pcre.org/) 库提供针对正则表达式的
匹配操作。


模块加载时会编译一个文本文件，其中包含按组分类的正则表达式，
编译后的 PCRE 对象存放于一个数组中。模块提供
一个函数，用于将字符串或伪变量与这些组中的任意一组进行匹配。
该文本文件可以随时通过 MI 命令修改并重新加载。
模块还提供一个函数，用于针对作为函数参数给出的
正则表达式执行 PCRE 匹配操作。


有关 PCRE 特性的详细列表，请阅读该库的
[手册页](http://www.pcre.org/pcre.txt)。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


在本模块之前必须先加载以下模块：


- *不依赖其他 OpenSIPS 模块*。


#### 外部库或应用程序 {#external-libraries-or-applications}


在使用本模块运行 OpenSIPS 之前，必须安装以下
库或应用程序：


- *libpcre-dev - [PCRE](http://www.pcre.org/) 的开发库*。


### 导出的参数 {#exported-parameters}


#### file (string)


包含正则表达式组的文本文件。必须设置该参数
才能启用分组匹配功能。


*默认值为 "NULL"。*


```opensips title="设置 file 参数"
...
modparam("regex", "file", "/etc/opensips/regex_groups")
...
```


#### max_groups (int)


文本文件中正则表达式组的最大数量。


*默认值为 "20"。*


```opensips title="设置 max_groups 参数"
...
modparam("regex", "max_groups", 40)
...
```


#### group_max_size (int)


文本文件中单个组内容的最大长度。


*默认值为 "8192"。*


```opensips title="设置 group_max_size 参数"
...
modparam("regex", "group_max_size", 16384)
...
```


#### pcre_caseless (int)


如果设置了该选项，则匹配时不区分大小写。它等价于
Perl 的 /i 选项，并且可以在模式内部通过 (?i) 或
(?-i) 选项设置来改变。


*默认值为 "0"。*


```opensips title="设置 pcre_caseless 参数"
...
modparam("regex", "pcre_caseless", 1)
...
```


#### pcre_multiline (int)


默认情况下，PCRE 将目标字符串视为由单行
字符组成（即使它实际包含换行符）。"行首"
元字符（^）仅在字符串开头匹配，而"行尾"
元字符（$）仅在字符串末尾匹配，或在结尾换行符
之前匹配。


设置该选项后，"行首"和"行尾"结构将分别在
目标字符串中的内部换行符之后或之前立即匹配，
同时也在字符串的最开头和最末尾匹配。这
等价于 Perl 的 /m 选项，并且可以在模式内部通过
(?m) 或 (?-m) 选项设置来改变。如果目标字符串中没有换行符，
或者模式中没有出现 ^ 或 $，则设置该选项
没有效果。


*默认值为 "0"。*


```opensips title="设置 pcre_multiline 参数"
...
modparam("regex", "pcre_multiline", 1)
...
```


#### pcre_dotall (int)


如果设置了该选项，模式中的点元字符将匹配所有字符，
包括表示换行的字符。未设置时，当当前位置处于换行符处，
点号不匹配。该选项等价于 Perl 的 /s 选项，
并且可以在模式内部通过 (?s) 或 (?-s) 选项设置来改变。


*默认值为 "0"。*


```opensips title="设置 pcre_dotall 参数"
...
modparam("regex", "pcre_dotall", 1)
...
```


#### pcre_extended (int)


如果设置了该选项，模式中的空白数据字符将被完全
忽略，除非被转义或位于字符类内部。空白不包括
VT 字符（编码 11）。此外，字符类外部未转义的 #
与其后的换行符之间（含换行符）的字符也
会被忽略。这等价于 Perl 的 /x 选项，并且可以在
模式内部通过 (?x) 或 (?-x) 选项设置来改变。


*默认值为 "0"。*


```opensips title="设置 pcre_extended 参数"
...
modparam("regex", "pcre_extended", 1)
...
```


### 导出的函数 {#exported-functions}


#### pcre_match (string, pcre_regex)


将给定的字符串参数与正则表达式 pcre_regex 进行匹配，
该正则表达式会被编译为一个 PCRE 对象。匹配时返回 TRUE，
否则返回 FALSE。


各参数的含义如下：


- *string* - 要比较的字符串。
- *pcre_regex*（字符串）- 要编译为 PCRE 对象的
正则表达式。


> [!NOTE]
> 要在 pcre_regex 参数中使用"行尾"符号 '$'，请使用 '$$'。


该函数可以在 REQUEST_ROUTE、FAILURE_ROUTE、ONREPLY_ROUTE、
BRANCH_ROUTE 和 LOCAL_ROUTE 中使用。


```opensips title="pcre_match 用法（强制不区分大小写）"
...
if (pcre_match("$ua", "(?i)^twinkle")) {
    xlog("L_INFO", "User-Agent matches\n");
}
...
```


```opensips title="pcre_match 用法（使用'行尾'符号）"
...
if (pcre_match($rU, "^user[1234]$$")) {  # 将被转换为 "^user[1234]$"
    xlog("L_INFO", "RURI username matches\n");
}
...
```


#### pcre_match_group (string [, group])


它使用从文本文件中读取的组
（参见[文件格式](#file-format)）将给定的字符串
参数与组号为 group 的组中编译后的正则表达式进行匹配。
匹配时返回 TRUE，否则返回 FALSE。


各参数的含义如下：


- *string* - 要比较的字符串。
- *group*（整型）- 本次操作中使用的组。
如果未指定，则使用 0（第一个组）。


该函数可以在 REQUEST_ROUTE、FAILURE_ROUTE、ONREPLY_ROUTE、
BRANCH_ROUTE 和 LOCAL_ROUTE 中使用。


```opensips title="pcre_match_group 用法"
...
if (pcre_match_group($rU, 2)) {
    xlog("L_INFO", "RURI username matches group 2\n");
}
...
```


### 导出的 MI 函数 {#exported-mi-functions}


#### regex_reload


使 regex 模块重新读取文本文件的内容
并重新编译正则表达式。文件中的组数量
可以安全地修改。


名称：*regex_reload*


参数：*无*


MI FIFO 命令格式：


```bash
...
opensips-cli -x mi regex_reload
...
```


#### regex_match


将给定的字符串参数与正则表达式 pcre_regex 进行匹配。
匹配时返回 "Match"，否则返回 "Not Match"。


名称：*regex_match*


参数：


- string
- pcre_regex


MI FIFO 命令格式：


```bash
...
opensips-cli -x mi regex_match string="1234" pcre_regex="^1234$"
"Match"
opensips-cli -x mi regex_match string="1234" pcre_regex="^1235$"
"Not Match"
...
```


#### regex_match_group


它使用从文本文件中读取的组，将给定的字符串参数与组号为 group 的组中
编译后的正则表达式进行匹配。匹配时返回 "Match"，否则返回 "Not Match"。


名称：*regex_match_group*


参数：


- string
- group


MI FIFO 命令格式：


```bash
...
opensips-cli -x mi regex_match_group string="1234" group="0"
"Match"
opensips-cli -x mi regex_match_group string="1234" group="1"
"Not Match"
...
```


### 安装与运行 {#installation-and-running}


#### 文件格式 {#file-format}


该文件包含按组分类的正则表达式。每个
组以 "[number]" 行开始。以空格、制表符、
CR、LF 或 #（注释）开头的行将被忽略。每个正则表达式
必须仅占一行，这意味着正则表达式不能
拆分成多行。


文件格式示例如下：


```c title="regex 文件"
### 发布呈现状态的 User-Agent 列表
[0]

# 软件话机
^Twinkle/1
^X-Lite
^eyeBeam
^Bria
^SIP Communicator
^Linphone

# 桌面话机
^Snom

# 其他
^SIPp
^PJSUA


### 被列入黑名单的源 IP
[1]

^190\.232\.250\.226$
^122\.5\.27\.125$
^86\.92\.112\.


### 西班牙的免费 PSTN 目的地
[2]

^1\d{3}$
^((\+|00)34)?900\d{6}$
```


模块会将上述文本编译为以下正则
表达式：


```c
group 0: ((^Twinkle/1)|(^X-Lite)|(^eyeBeam)|(^Bria)|(^SIP Communicator)|
          (^Linphone)|(^Snom)|(^SIPp)|(^PJSUA))
group 1: ((^190\.232\.250\.226$)|(^122\.5\.27\.125$)|(^86\.92\.112\.))
group 2: ((^1\d{3}$)|(^((\+|00)34)?900\d{6}$))
```


第一个组可用于避免为已支持呈现的 UA
生成自动 PUBLISH（pua_usrloc 模块）：


```opensips title="与 pua_usrloc 配合使用"
route[REGISTER] {
    if (! pcre_match_group("$ua", 0)) {
        xlog("L_INFO", "Auto-generated PUBLISH for $fu ($ua)\n");
        pua_set_publish();
    }
    save("location");
    exit;
}
```


> [!NOTE]
> 需要理解的一点是，每个组头部
> （[number]）中的数字必须从 0 开始。否则，实际的组号
> 将与文件中出现的数字不符。例如，以下
> 文本文件：


```c title="错误的组文件"
[1]
^aaa
^bbb

[2]
^ccc
^ddd
```


将生成以下正则表达式：


```c
group 0: ((^aaa)|(^bbb))
group 1: ((^ccc)|(^ddd))
```


> [!NOTE]
> 实际索引与文件中的组号并不一致。也就是说，
> 编译后的组 0 始终指向文件中的第一个组，而无论
> 它在文件中的编号是多少。事实上，文件中出现的组号
> 除了用于分隔不同的组之外，没有其他用途。


> [!NOTE]
> 包含正则表达式的行不能以 '[' 开头，因为这样
> 会被当作新的组。以空格、制表符
> 或 '#' 开头的行同样如此（它们会被解析器忽略）。作为变通办法，
> 使用括号即可：


    ```c
    [0]
    ([0-9]{9})
    ( #abcde)
    ( qwerty)
    ```
<!-- CONTRIBUTORS -->

### 许可 {#license}

所有文档文件（即 .md 扩展名）均在 Creative Common License 4.0 下授权。
