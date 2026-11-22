---
title: "textops 模块"
description: "该模块对 OpenSIPS 所处理的 SIP 消息实现基于文本的操作。"
---


## 管理指南 {#admin-guide}


### 概述 {#overview}


该模块对 OpenSIPS 所处理的 SIP 消息实现基于文本的操作。
SIP 是一种基于文本的协议，该模块提供了大量非常有用的函数，
用于在文本层面操作消息，例如正则表达式搜索与替换、
类 Perl 的替换等。


> [!NOTE]
> 所有 SIP 感知的函数（如 *insert_hf*、
> *append_hf* 或 *codec*
> 操作）都已移至 *sipmsgops*
> 模块。


#### 已知局限性 {#known-limitations}


search 会忽略折叠行。例如，
search("(From|f):.*@foo.bar")
不会匹配以下 From 头域字段：


```c
From: medabeda 
 <sip:medameda@foo.bar>;tag=1234
```


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


在加载本模块之前，必须加载以下模块：


- *不依赖其他 OpenSIPS 模块*。


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，必须安装
以下库或应用程序：


- *无*。


### 导出的函数 {#exported-functions}


#### search(re)


在消息中搜索 re。


参数含义如下：


- *re*（string）- 正则表达式。


该函数可在 REQUEST_ROUTE、ONREPLY_ROUTE、
FAILURE_ROUTE、BRANCH_ROUTE 中使用。


```opensips title="search usage"
...
if ( search("[Ss][Ii][Pp]") ) { /*....*/ };
...
```


#### search_body(re)


在消息体中搜索 re。


参数含义如下：


- *re*（string）- 正则表达式。


该函数可在 REQUEST_ROUTE、ONREPLY_ROUTE、
FAILURE_ROUTE、BRANCH_ROUTE 中使用。


```opensips title="search_body usage"
...
if ( search_body("[Ss][Ii][Pp]") ) { /*....*/ };
...
```


#### search_append(re, txt)


搜索 re 的第一个匹配项，并在其后追加 txt。


参数含义如下：


- *re*（string）- 正则表达式。
- *txt*（string）- 要追加的字符串。


该函数可在 REQUEST_ROUTE、ONREPLY_ROUTE、
FAILURE_ROUTE、BRANCH_ROUTE 中使用。


```opensips title="search_append usage"
...
search_append("[Oo]pen[Ss]er", " SIP Proxy");
...
```


#### search_append_body(re, txt)


在消息体中搜索 re 的第一个匹配项，
并在其后追加 txt。


参数含义如下：


- *re*（string）- 正则表达式。
- *txt*（string）- 要追加的字符串。


该函数可在 REQUEST_ROUTE、ONREPLY_ROUTE、
FAILURE_ROUTE、BRANCH_ROUTE 中使用。


```opensips title="search_append_body usage"
...
search_append_body("[Oo]pen[Ss]er", " SIP Proxy");
...
```


#### replace(re, txt)


用 txt 替换 re 的第一次出现。


参数含义如下：


- *re*（string）- 正则表达式。
- *txt*（string）


该函数可在 REQUEST_ROUTE、ONREPLY_ROUTE、
FAILURE_ROUTE、BRANCH_ROUTE 中使用。


```opensips title="replace usage"
...
replace("opensips", "Open SIP Server");
...
```


#### replace_body(re, txt)


用 txt 替换消息体中 re 的第一次出现。


参数含义如下：


- *re*（string）- 正则表达式。
- *txt*（string）


该函数可在 REQUEST_ROUTE、ONREPLY_ROUTE、
FAILURE_ROUTE、BRANCH_ROUTE 中使用。


```opensips title="replace_body usage"
...
replace_body("opensips", "Open SIP Server");
...
```


#### replace_all(re, txt)


用 txt 替换 re 的所有出现。


参数含义如下：


- *re* -（string）正则表达式。
- *txt*（string）


该函数可在 REQUEST_ROUTE、ONREPLY_ROUTE、
FAILURE_ROUTE、BRANCH_ROUTE 中使用。


```opensips title="replace_all usage"
...
replace_all("opensips", "Open SIP Server");
...
```


#### replace_body_all(re, txt)


用 txt 替换消息体中 re 的所有出现。
匹配按行进行。


参数含义如下：


- *re*（string）- 正则表达式。
- *txt*（string）


该函数可在 REQUEST_ROUTE、ONREPLY_ROUTE、
FAILURE_ROUTE、BRANCH_ROUTE 中使用。


```opensips title="replace_body_all usage"
...
replace_body_all("opensips", "Open SIP Server");
...
```


#### replace_body_atonce(re, txt)


用 txt 替换消息体中 re 的所有出现。
匹配在整个消息体上进行。


参数含义如下：


- *re*（string）- 正则表达式。
- *txt*（string）


该函数可在 REQUEST_ROUTE、ONREPLY_ROUTE、
FAILURE_ROUTE、BRANCH_ROUTE 中使用。


```opensips title="replace_body_atonce usage"
...
# 从消息中剥离整个消息体：
if(has_body() && replace_body_atonce("^.+$", ""))
        remove_hf("Content-Type"); 
...
```


#### subst('/re/repl/flags')


用 repl 替换 re（类似 sed 或 perl）。


参数含义如下：


- *'/re/repl/flags'*（string）- 类似 sed 的正则
表达式。flags 可以是 i（不区分大小写）、
g（全局）或 s（把换行当作匹配，而不将其视为行尾）的组合。
're' - 是正则表达式
'repl' - 是替换字符串 - 可以包含伪变量
'flags' - 替换标志（i - 忽略大小写，g - 全局）


该函数可在 REQUEST_ROUTE、ONREPLY_ROUTE、
FAILURE_ROUTE、BRANCH_ROUTE 中使用。


```opensips title="subst usage"
...
# 用消息 uri 替换 to: 中的 uri（仅作示例）
if ( subst('/^To:(.*)sip:[^@]*@[a-zA-Z0-9.]+(.*)$/t:\1\u\2/ig') ) {};

# 用 avp sip_address 的值替换 to: 中的 uri（仅作示例）
if ( subst('/^To:(.*)sip:[^@]*@[a-zA-Z0-9.]+(.*)$/t:\1$avp(sip_address)\2/ig') ) {};

...
```


#### subst_uri('/re/repl/flags')


对消息 uri 执行 re 替换（类似 subst，但仅在
uri 上生效）


参数含义如下：


- *'/re/repl/flags'*（string）- 类似 sed 的正则
表达式。flags 可以是 i（不区分大小写）、
g（全局）或 s（把换行当作匹配，而不将其视为行尾）的组合。
're' - 是正则表达式
'repl' - 是替换字符串 - 可以包含伪变量
'flags' - 替换标志（i - 忽略大小写，g - 全局）


该函数可在 REQUEST_ROUTE、ONREPLY_ROUTE、
FAILURE_ROUTE、BRANCH_ROUTE 中使用。


```opensips title="subst_uri usage"
...
# 为数字 uri 添加 3463 前缀，并将原始 uri（\0 匹配）
# 保存为参数：orig_uri（仅作示例）
if (subst_uri('/^sip:([0-9]+)@(.*)$/sip:3463\1@\2;orig_uri=\0/i')){$

# 将 avp 'uri_prefix' 作为前缀添加到数字 uri，并将原始
# uri（\0 匹配）保存为参数：orig_uri（仅作示例）
if (subst_uri('/^sip:([0-9]+)@(.*)$/sip:$avp(uri_prefix)\1@\2;orig_uri=\0/i')){$

...
```


#### subst_user('/re/repl/flags')


对消息 uri 执行 re 替换（类似 subst_uri，但仅作用于
uri 的用户部分）


参数含义如下：


- *'/re/repl/flags'*（string）- 类似 sed 的正则
表达式。flags 可以是 i（不区分大小写）、
g（全局）或 s（把换行当作匹配，而不将其视为行尾）的组合。
're' - 是正则表达式
'repl' - 是替换字符串 - 可以包含伪变量
'flags' - 替换标志（i - 忽略大小写，g - 全局）


该函数可在 REQUEST_ROUTE、ONREPLY_ROUTE、
FAILURE_ROUTE、BRANCH_ROUTE 中使用。


```opensips title="subst usage"
...
# 为以 3642 结尾的 uri 添加 3463 前缀（仅作示例）
if (subst_user('/3642$/36423463/')){$

...

# 为 r-uri 中以 3642 结尾的用户名添加 avp 'user_prefix' 作为前缀
if (subst_user('/(.*)3642$/$avp(user_prefix)\13642/')){$
...
```


#### subst_body('/re/repl/flags')


在消息体中用 repl 替换 re（类似 sed 或 perl）。


参数含义如下：


- *'/re/repl/flags'*（string）- 类似 sed 的正则
表达式。flags 可以是 i（不区分大小写）、
g（全局）或 s（把换行当作匹配，而不将其视为行尾）的组合。
're' - 是正则表达式
'repl' - 是替换字符串 - 可以包含伪变量
'flags' - 替换标志（i - 忽略大小写，g - 全局）


该函数可在 REQUEST_ROUTE、ONREPLY_ROUTE、
FAILURE_ROUTE、BRANCH_ROUTE 中使用。


```opensips title="subst_body usage"
...
if (subst_body("/^o=([^ ]*) /o=$fU /"))
	xlog("successfully prepared an "o" line update!\n");
...
```
<!-- CONTRIBUTORS -->

### 许可证 {#license}

所有文档文件（即 .md 扩展名）均按 Creative Common License 4.0 许可发布。
