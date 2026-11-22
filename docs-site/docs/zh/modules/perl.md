---
title: "perl 模块"
description: "编写一个新的 OpenSIPS 模块所需的时间往往相当长，而配置文件提供的选项仅限于各模块已实现的功能。"
sidebar: false
---

## 管理员指南 {#admin-guide}

### 概述 {#overview}

编写一个新的 OpenSIPS 模块所需的时间往往相当长，而配置文件提供的选项仅限于各模块已实现的功能。

借助本 Perl 模块，可以轻松地用 Perl 实现自己的 OpenSIPS 扩展。这样就可以简单地访问 CPAN 模块的全部生态。SIP URI 重写可以基于正则表达式实现；访问任意数据后端（例如 LDAP 或 Berkeley DB 文件）如今也变得极其简单。

### 安装模块 {#installing-the-module}

本 Perl 模块在 opensips.cfg 中加载（与其他所有模块一样），使用 loadmodule("/path/to/perl.so");。

要使 Perl 模块编译通过，需要一个版本较新、以动态方式链接的 perl（已用 5.8.8 测试）。强烈建议使用线程化版本。你所使用的 Linux 发行版提供的默认二进制包通常可以正常工作。

Makefile 支持交叉编译。需要将环境变量 PERLLDOPTS、PERLCCOPTS 和 TYPEMAP 设置为类似以下输出的值

```c
PERLLDOPTS: perl -MExtUtils::Embed -e ldopts
PERLCCOPTS: perl -MExtUtils::Embed -e ccopts
TYPEMAP:    echo "`perl -MConfig -e 'print $Config{installprivlib}'`/ExtUtils/typemap"
```

（预编译的！）perl 库的确切位置取决于你所处环境的配置。

### 使用模块 {#using-the-module}

Perl 模块有两个接口：Perl 侧和 OpenSIPS 侧。一旦某个 Perl 函数被定义并通过模块参数加载（见下文），就可以在 OpenSIPS 配置的任意位置调用它。例如，可以在 Perl 中编写函数 "ldap_alias"，然后执行

```opensips
...
if (perl_exec("ldap_alias")) {
	...
}	
...
```

就如同使用当前的 alias_db 模块一样。

可用的函数列在下面的[导出的函数](#exported-functions)一节中。

在 Perl 侧，有许多函数可用于读取和修改当前 SIP 消息，例如 RURI 或消息标志位。Perl 接口的介绍和完整参考文档见下文。

### 依赖 {#dependencies}

#### OpenSIPS 模块 {#opensips-modules}

在加载本模块之前必须先加载以下模块：

- 发送致命错误应答时需要 "sl" 模块。不过，所有其他模块都可以从 Perl 模块访问。

#### 外部库或应用 {#external-libraries-or-applications}

在加载本模块运行 OpenSIPS 之前，必须安装以下库或应用：

- *Perl 5.8.x 或更高版本*

此外，还应安装若干 perl 模块。OpenSIPS::LDAPUtils 包依赖已安装的 Net::LDAP。其中一个示例脚本需要 IPC::Shareable

本模块在 Perl 5.8.8 下开发和测试，但应当可以在任何 5.8.x 版本上工作。5.6.x 下可以编译，但其行为不受支持。更早的版本无法工作。

在当前 Debian 系统上，至少应安装以下软件包：

- perl
- perl-base
- perl-modules
- libperl5.8
- libperl-dev
- libnet-ldap-perl
- libipc-shareable-perl

据报道，其他 Debian 风格的发行版（例如 Ubuntu）需要相同的软件包。

在 SuSE 系统上，至少应安装以下软件包：

- perl
- perl-ldap
- 来自 CPAN 的 IPC::Shareable perl 模块

尽管 SuSE 提供了大量 perl 模块，其他模块可能仍需从 CPAN 获取。可以考虑使用 "cpan2rpm" 程序——它同样可在 CPAN 上获得。它可以从 CPAN 创建 RPM 文件。

### 导出的参数 {#exported-parameters}

#### filename (string)

这是你的脚本的文件名。只能设置一次，但其中可以包含任意数量的函数，并按需 "use" 任意多个 Perl 模块。

*不能为空！*

```opensips title="Set filename parameter"
...
modparam("perl", "filename", "/home/john/opensips/myperl.pl")
...
```

#### modpath (string)

所包含的 Perl 模块（OpenSIPS.pm 等）的路径。并非绝对必须设置该路径，因为你*可以*将模块安装到 Perl 的标准路径中，或在脚本内部更新 "%INC" 变量。不过，使用该模块参数才是标准做法。

```opensips title="Set modpath parameter"
...
modparam("perl", "modpath", "/usr/local/lib/opensips/perl/")
...
```

### 导出的函数 {#exported-functions}

#### perl_exec_simple(func, [param])

调用一个 perl 函数，*不*向它传递当前 SIP 消息。可用于非常简单的请求，这类请求无需处理消息本身，而是返回关于环境的信息值。

第一个参数是要调用的函数。可选地可以传入任意字符串作为参数。

如果 perl 函数被成功调用，该函数返回 *1*；如果发生内部错误，返回 *-1*。注意它不会传播 perl 函数的返回值。

该函数可在 REQUEST_ROUTE、FAILURE_ROUTE、ONREPLY_ROUTE 和 BRANCH_ROUTE 中使用。

```opensips title="perl_exec_simple() usage"
...
if ($rm=="INVITE") {
	perl_exec_simple("dosomething", "on invite messages");
};
...
```

#### perl_exec(func, [param])

调用一个 perl 函数，*并*向它传递当前 SIP 消息。当前 SIP 消息由 Perl 模块反映，该模块提供对当前 SIP 消息中信息的访问（OpenSIPS::Message）。

第一个参数是要调用的函数。可以传入任意字符串作为参数。

该函数将 perl 函数返回的值返回给 OpenSIPS 脚本。注意如果该值为 *0*，脚本执行将被停止，类似于调用 *exit*。

该函数可在 REQUEST_ROUTE、FAILURE_ROUTE、ONREPLY_ROUTE 和 BRANCH_ROUTE 中使用。

```opensips title="perl_exec() usage"
...
if (perl_exec("ldapalias")) {
	...
};
...
```

## OpenSIPS Perl API

### OpenSIPS

本模块提供对有限数量 OpenSIPS 核心函数的访问。由于最值得关注的函数都与 SIP 消息有关，它们位于下面的 OpenSIPS::Message 类中。

#### log(level,message)

使用 OpenSIPS 的日志设施记录消息。日志级别为以下之一：

```c
* L_ALERT
* L_CRIT
* L_ERR
* L_WARN
* L_NOTICE
* L_INFO
* L_DBG
```

请注意，该方法*不会*自动导出，因为它会与 perl 函数 log（用于计算对数）冲突。要么显式导入该函数（通过 `use OpenSIPS qw ( log );`），要么使用其完整名称调用：

```c
OpenSIPS::log(L_INFO, "foobar");
```

### OpenSIPS::Message

本包为 OpenSIPS `sip_msg` 结构及其子组件提供访问函数。通过它可以完整地配置备选路由决策。

#### getType()

返回常量 SIP_REQUEST、SIP_REPLY、SIP_INVALID 之一，说明当前消息的类型。

#### getStatus()

返回当前应答消息的状态码。该函数在请求上下文中无效！

#### getReason()

返回当前应答消息的原因。该函数在请求上下文中无效！

#### getVersion()

返回当前 SIP 消息的版本字符串。

#### getRURI()

该函数返回当前 SIP 消息的接收方 URI：

`my $ruri =
$m->getRURI();`

getRURI 返回一个字符串。关于如何获得解析后的结构，见下面的 ["getParsedRURI()"](#getparsedruri)。

该函数仅在请求消息中有效。

#### getMethod()

返回当前方法，例如 `INVITE`、`REGISTER`、`ACK` 等。

`my $method =
$m->getMethod();`

该函数仅在请求消息中有效。

#### getFullHeader()

返回当前消息中呈现的完整消息头。你可以用该消息头配合你喜欢的 MIME 包做进一步处理。

`my $hdr =
$m->getFullHeader();`

#### getBody()

返回消息体。

#### getMessage()

返回包含消息头和消息体的整条消息。

#### getHeader(name)

返回具有该名称的第一个消息头的消息体。

`print
$m->getHeader("To");`

**`"John"
<sip:john@doe.example>`**

#### getHeaderNames()

返回包含所有消息头名称的数组。可能有重复！

#### moduleFunction(func,string1,string2)

在模块导出中搜索任意函数，并以参数 self、string1、string2 调用它。

`string1` 和/或 `string2` 可以省略。

由于该函数提供对导出到 OpenSIPS 配置文件的函数的访问，对于未知函数会自动加载它。不必写成

```c
$m->moduleFunction("sl_send_reply", "500", "Internal Error");
$m->moduleFunction("xlog", "L_INFO", "foo");
```

也可以写成

```c
$m->sl_send_reply("500", "Internal Error");
$m->xlog("L_INFO", "foo");
```

> [!WARNING]
> 在 OpenSIPS 1.2 中，只有有限的模块函数子集可用。该限制将在后续版本中移除。

以下是预期可用的函数列表（并非声称完整）：
* alias_db_lookup
* consume_credentials
* is_rpid_user_e164
* append_rpid_hf
* bind_auth
* avp_print
* cpl_process_register
* cpl_process_register_norpl
* load_dlg
* ds_next_dst
* ds_next_domain
* ds_mark_dst
* ds_mark_dst
* is_from_local
* is_uri_host_local
* dp_can_connect
* dp_apply_policy
* enum_query（无参数）
* enum_fquery（无参数）
* is_from_user_enum（无参数）
* i_enum_query（无参数）
* imc_manager
* jab_*（jabber 模块的所有函数）
* sdp_mangle_ip
* sdp_mangle_port
* encode_contact
* decode_contact
* decode_contact_header
* fix_contact
* use_media_proxy
* end_media_session
* m_store
* m_dump
* fix_nated_contact
* unforce_rtp_proxy
* force_rtp_proxy
* fix_nated_register
* add_rcv_param
* options_reply
* checkospheader
* validateospheader
* requestosprouting
* checkosproute
* prepareosproute
* prepareallosproutes
* checkcallingtranslation
* reportospusage
* mangle_pidf
* mangle_message_cpim
* add_path（无参数）
* add_path_received（无参数）
* prefix2domain
* allow_routing（无参数）
* allow_trusted
* pike_check_req
* handle_publish
* handle_subscribe
* stored_pres_info
* bind_pua
* send_publish
* send_subscribe
* pua_set_publish
* loose_route
* record_route
* load_rr
* sip_trace
* sl_reply_error
* sd_lookup
* sstCheckMin
* append_time
* has_body（无参数）
* is_peer_verified
* t_newtran
* t_release
* t_relay（无参数）
* t_flush_flags
* t_check_trans
* t_was_cancelled
* uac_restore_from
* uac_auth
* has_totag
* tel2sip
* check_to
* check_from
* radius_does_uri_exist
* ul_*（usrloc 模块为用户访问导出的所有函数）
* xmpp_send_message

#### log(level,message) (deprecated type)

使用 OpenSIPS 的日志设施记录消息。日志级别为以下之一：

* L_ALERT
* L_CRIT
* L_ERR
* L_WARN
* L_NOTICE
* L_INFO
* L_DBG

日志函数应通过 OpenSIPS 模块的变体访问。这一个位于 OpenSIPS::Message 中，已废弃。

#### rewrite_ruri(newruri)

设置新的目标（接收方）URI。可用于重新路由当前消息/呼叫。

```c
if ($m->getRURI() =~ m/\@somedomain.net/) {
  $m->rewrite_ruri("sip:dispatcher\@organization.net");
}
```

#### setFlag(flag)

设置消息标志位。包含 Constants.pm 后，可以使用 C API 中已知的常量。

#### resetFlag(flag)

重置消息标志位。

#### isFlagSet(flag)

返回消息标志位是否已设置。

#### pseudoVar(string)

返回一个新字符串，其中所有伪变量都被替换为其值。也可用于获取单个变量的值。

**请记住，在 perl 字符串中需要转义 '$' 符号！**

#### append_branch(branch,qval)

向当前消息追加一个分支。

#### serialize_branches(clean_before, keep_order)

串行化分支。

#### next_branches()

取下一批分支。

#### getParsedRURI()

以 OpenSIPS::URI 对象形式返回当前目标 URI。

### OpenSIPS::URI

本包提供访问 sip_uri 结构的函数。

#### user()

返回该 URI 的用户部分。

#### host()

返回该 URI 的主机部分。

#### passwd()

返回该 URI 的 passwd 部分。

#### port()

返回该 URI 的端口部分。

#### params()

返回该 URI 的 params 部分。

#### headers()

返回该 URI 的 headers 部分。

#### transport()

返回该 URI 的 transport 部分。

#### ttl()

返回该 URI 的 ttl 部分。

#### user_param()

返回该 URI 的 user_param 部分。

#### maddr()

返回该 URI 的 maddr 部分。

#### method()

返回该 URI 的 method 部分。

#### lr()

返回该 URI 的 lr 部分。

#### r2()

返回该 URI 的 r2 部分。

#### transport_val()

返回该 URI 的 transport_val 部分。

#### ttl_val()

返回该 URI 的 ttl_val 部分。

#### user_param_val()

返回该 URI 的 user_param_val 部分。

#### maddr_val()

返回该 URI 的 maddr_val 部分。

#### method_val()

返回该 URI 的 method_val 部分。

#### lr_val()

返回该 URI 的 lr_val 部分。

#### r2_val()

返回该 URI 的 r2_val 部分。

### OpenSIPS::AVP

本包为 OpenSIPS 的 AVP 提供访问函数。通过这些函数可以创建、求值、修改和删除这些变量。

请注意，这些函数并不支持配置文件中使用的记法，而是直接作用于字符串或数字。参见下面 add 方法的文档。

#### add(name,val)

添加一个 AVP。

向 AVP 环境中添加一个 OpenSIPS AVP。name 和 val 都可以是整数或字符串；该函数会尝试猜测哪种写法正确。请注意

```c
OpenSIPS::AVP::add("10", "10")
```

与

```c
OpenSIPS::AVP::add(10, 10)
```

是不同的，原因在于这种求值方式：前者会创建名为 10 的 _字符串_ AVP，而后者会创建一个数值 AVP。

可以用该函数修改/覆盖 AVP。

#### get(name)

获取一个 OpenSIPS AVP：

```c
my $numavp = OpenSIPS::AVP::get(5);
my $stravp = OpenSIPS::AVP::get("foo");
```

#### destroy(name)

销毁一个 AVP。

```c
OpenSIPS::AVP::destroy(5);
OpenSIPS::AVP::destroy("foo");
```

### OpenSIPS::Utils::PhoneNumbers

OpenSIPS::Utils::PhoneNumbers - 用于电话号码规范形式的函数。

```c
use OpenSIPS::Utils::PhoneNumbers;

my $phonenumbers = new OpenSIPS::Utils::PhoneNumbers(
     publicAccessPrefix => "0",
     internationalPrefix => "+",
     longDistancePrefix => "0",
     areaCode => "761",
     pbxCode => "456842",
     countryCode => "49"
   );

$canonical = $phonenumbers->canonicalForm("07612034567");
$number    = $phonenumbers->dialNumber("+497612034567");
```

以加号开头并包含所有拨号前缀的电话号码处于规范形式。这通常并不是在任意位置要拨打的号码，因此拨号号码取决于用户/系统的上下文。

将号码规范化的想法取自 hylafax。

示例：+497614514829 是我电话号码的规范形式，829 是在 Pyramid 拨打的号码，4514829 是从 Freiburg 区拨打的号码，等等。

为了规范化任何号码，我们会去掉所找到的所有拨号前缀，然后加上该位置的前缀。于是，当用户在 pyramid 上下文中输入号码 04514829 时，我们移除 publicAccessPrefix（在 Pyramid 这里是 0）和 pbxPrefix（这里是 4514）。结果为 829。然后我们加上所有通用拨号前缀——49（国家）761（区号）4514（pbx）以及 829，即号码本身 => +497614514829

要从规范电话号码得到拨号号码，我们会依次减去所有通用前缀，直到剩下某个部分

如前所述，电话号码的解释取决于该位置的上下文。对于本包中的函数，上下文通过 `new` 运算符创建。

应设置以下字段：

```c
'longDistancePrefix' 
'areaCode'
'pbxCode' 
'internationalPrefix'
'publicAccessPrefix'
'countryCode'
```

本模块在 `use` 时导出以下函数：

#### new(publicAccessPrefix,internationalPrefix,longDistancePrefix,countryCode,areaCode,pbxCode)

new 运算符返回一个该类型的对象，并根据传入的参数设置其位置上下文。参见上面的

OpenSIPS::Utils::PhoneNumbers。

#### canonicalForm( number [, context] )

将电话号码（作为第一个参数给出）转换为规范形式。当第二个参数未传入上下文时，使用系统配置文件中的默认上下文。

#### dialNumber( number [, context] )

将规范电话号码（在第一个参数中给出）转换为要拨打的号码。当第二个参数未给出上下文时，使用系统配置中的默认上下文。

### OpenSIPS::LDAPUtils::LDAPConf

OpenSIPS::LDAPUtils::LDAPConf - 从标准配置文件读取 openldap 配置。

```c
use OpenSIPS::LDAPUtils::LDAPConf;
my $conf = new OpenSIPS::LDAPUtils::LDAPConf();
```

本模块可用于检索其他 LDAP 软件（例如 `nsswitch.ldap` 和 `pam-ldap`）所使用的全局 LDAP 配置。该配置通常存放在 `/etc/openldap/ldap.conf`

当从具有足够权限的账户（例如 root）调用时，也会检索 ldap 管理员密码。

#### Constructor new()

返回一个新的、已初始化的 `OpenSIPS::LDAPUtils::LDAPConf` 对象。

#### Method base()

返回执行查询时要使用的服务器 base-dn。

#### Method host()

返回要联系的 ldap 主机。

#### Method port()

返回 ldap 服务器的端口。

#### Method uri()

返回用于联系 ldap 服务器的 uri。当配置文件中没有 ldap_uri 时，会用主机和端口构造一个 `ldap:` uri。

#### Method rootbindpw()

返回 ldap 的 "root" 密码。

注意，只有当前账户具有访问 `/etc/openldap/ldap.secret` 的足够权限时，`rootbindpw` 才可用。

#### Method rootbinddn()

返回用于以 "root" 身份访问 ldap 服务器的 DN。

#### Method binddn()

返回用于向 ldap 服务器鉴权的 DN。当配置文件中未指定 bind dn 时，返回 `rootbinddn`。

#### Method bindpw()

返回用于向 ldap 服务器鉴权的密码。当未指定 bind 密码时，如果存在 `rootbindpw` 则返回它。

### OpenSIPS::LDAPUtils::LDAPConnection

OpenSIPS::LDAPUtils::LDAPConnection - 用于执行简单 LDAP 查询的 Perl 模块。

OO 风格接口：

```c
use OpenSIPS::LDAPUtils::LDAPConnection;
my $ldap = new OpenSIPS::LDAPUtils::LDAPConnection;
my @rows = $ldap-search("uid=andi","ou=people,ou=coreworks,ou=de");
```

过程式接口：

```c
use OpenSIPS::LDAPUtils::LDAPConnection;
my @rows = $ldap->search(
      new OpenSIPS::LDAPUtils::LDAPConfig(), "uid=andi","ou=people,ou=coreworks,ou=de");
```

本 perl 模块为 `Net::LDAP` 功能提供了某种简化的接口。它面向只需检索少量属性、无需 `Net::LDAP` 全功能开销的场景。

#### Constructor new( [config, [authenticated]] )

建立一个新 LDAP 连接。

第一个参数若给出，应是一个指向连接参数的哈希引用，可能是一个 `OpenSIPS::LDAPUtils::LDAPConfig` 对象。该参数可以为 `undef`，此时会使用一个新的（默认）`OpenSIPS::LDAPUtils::LDAPConfig` 对象。

当可选的第二个参数为真值时，连接会进行鉴权。否则执行匿名绑定。

成功时返回新的 `LDAPConnection` 对象，否则结果为 `undef`。

#### Function/Method search( conf, filter, base, [requested_attributes ...])

执行一次 ldap 搜索，返回第一个匹配目录条目的 dn；如果请求了特定属性，则返回该属性的值。

当第一个参数（conf）是 `OpenSIPS::LDAPUtils::LDAPConnection` 时，将用它执行查询。你可以通过 "method" 语法隐式传入第一个参数。

否则 `conf` 参数应是一个哈希引用，包含 `OpenSIPS::LDAPUtils::LDAPConf` 对象中所含的连接建立参数。在此模式下，先前查询得到的 `OpenSIPS::LDAPUtils::LDAPConnection` 会被复用。

##### 参数： {#arguments}

**conf**

配置对象，用于查找 host、port、suffix 和 use_ldap_checks

**filter**

ldap 搜索过滤器，例如 '(mail=some@domain)'

**base**

本次查询的搜索基准。若为 undef 则使用默认后缀；若最后一个字符是 ','，则把 base 与默认后缀拼接

**requested_attributes**

从 ldap 目录中检索给定属性而非 dn。

##### 结果： {#result}

未指定任何 `requested_attributes` 时，返回 LDAP 目录中所有匹配条目的 dn。

给出某些 `requested_attributes` 时，返回包含这些属性的数组。当多个条目匹配查询时，属性列表会被拼接。

### OpenSIPS::VDB

本包是所有虚拟数据库的（抽象）基类。派生的包可配置为由 OpenSIPS 作为数据库使用。

基类本身不应在此上下文中使用，因为它不提供任何功能。

### OpenSIPS::Constants

本包提供了取自 OpenSIPS 头文件中枚举和定义的大量常量。遗憾的是，没有自动更新常量的机制，因此如有疑问请核对这些值。

### OpenSIPS::VDB::Adapter::Speeddial

该适配器可与 speeddial 模块一起使用。

### OpenSIPS::VDB::Adapter::Alias

本包旨在与 alias_db 模块一起使用。查询 VTab 必须接受两个参数，并返回包含两个参数（用户名/域）的数组。

#### query(conds,retkeys,order)

使用给定的参数查询 vtab，参数为请求条件、要返回的键和排序列名。

### OpenSIPS::VDB::Adapter::AccountingSIPtrace

本包是 acc 和 tracer 模块的适配器，仅提供插入操作。

### OpenSIPS::VDB::Adapter::Describe

本包旨在用于调试。它会打印关于客户端模块所请求函数和操作的信息。

在创建新适配器时，可使用本模块请求表结构信息。

### OpenSIPS::VDB::Adapter::Auth

该适配器旨在与 auth_db 模块一起使用。VTab 应以用户名为参数，并返回（纯文本！）密码。

### OpenSIPS::VDB::ReqCond

本包表示数据库访问的请求条件，由列名、运算符（=、<、> 等）、数据类型和值组成。

本包继承自 OpenSIPS::VDB::Pair，因此包含其方法。

#### new(key,op,type,name)

构造一个新的 Column 对象。

#### op()

返回或设置当前运算符。

### OpenSIPS::VDB::Pair

本包表示数据库键/值对，由键、值类型和值组成。

本包继承自 OpenSIPS::VDB::Value，因此具有相同的方法。

#### new(key,type,name)

构造一个新的 Column 对象。

#### key()

返回或设置当前键。

### OpenSIPS::VDB::VTab

本包处理虚拟表，由 OpenSIPS::VDB 类用于存储有效表的信息。本包不面向最终用户访问。

#### new()

```c
Constructs a new VTab object
```

#### call(op,[args])

用给定参数在表上调用操作（insert、update 等）。

### OpenSIPS::VDB::Value

本包表示一个数据库值。除数据本身外，还存储关于其类型的信息。

#### stringification

以字符串方式访问 OpenSIPS::VDB::Value 对象时，它只返回其数据，而不管其类型如何。=cut

use strict;

package OpenSIPS::VDB::Value;

use overload '""' => \&stringify;

sub stringify { shift->{data} }

use OpenSIPS; use OpenSIPS::Constants;

our @ISA = qw ( OpenSIPS::Utils::Debug );

#### new(type,data)

构造一个新的 Value 对象。其数据类型和数据作为参数传入。

#### type()

返回或设置当前数据类型。请考虑使用 OpenSIPS::Constants 中的常量

#### data()

返回或设置当前数据。

### OpenSIPS::VDB::Column

本包表示数据库列定义，由列名及其数据类型组成。

#### Stringification

以字符串方式访问 OpenSIPS::VDB::Column 对象时，它只返回其列名，而不管其类型如何。=cut

package OpenSIPS::VDB::Column;

use overload '""' => \&stringify;

sub stringify { shift->{name} }

use OpenSIPS; use OpenSIPS::Constants;

our @ISA = qw ( OpenSIPS::Utils::Debug );

#### new(type,name)

构造一个新的 Column 对象。其类型和名称作为参数传入。

#### type( )

返回或设置当前类型。请考虑使用 OpenSIPS::Constants 中的常量

#### name()

返回或设置当前列名。

#### OpenSIPS::VDB::Result

本类表示一个 VDB 结果集。它包含列定义以及一个行数组。行本身只是指向标量数组的引用。

#### new(coldefs,[row, row, ...])

构造函数创建一个新的 Result 对象。其第一个参数是一个指向 OpenSIPS::VDB::Column 对象数组的引用。还可以传入附加参数以提供初始行，这些行是指向标量数组的引用。

#### coldefs()

```c
Returns or sets the column definition of the object.
```

#### rows()

```c
Returns or sets the rows of the object.
```

## Perl 示例 {#perl-samples}

### 示例目录 {#sample-directory}

"samples/" 中有若干示例脚本。它们的文档很完善。读一读，它会向你解释很多内容 :)

如果你想在自己的实现中直接使用其中任何脚本，可以使用 Perl 的 "require" 机制导入它们（只需记住 require .pl 文件时需要使用引号）。

#### 脚本说明 {#script-descriptions}

包含的示例脚本说明如下：

##### branches.pl

branches.pl 中最小的函数说明，你可以从 perl 内部访问 "append_branch" 函数，就如同在普通配置文件中使用一样。关于分支概念的文档可在 OpenSIPS 文档中找到。

##### firstline.pl

可以求值消息的 first_line 结构。消息可以是 SIP_REQUEST 或 SIP_REPLY。据此可以获得不同的信息。本脚本演示了这些函数。

##### flags.pl

perl 模块提供对 OpenSIPS 标志位机制的访问。OpenSIPS 模块可用的标志位名称通过 OpenSIPS::Constants 包提供，因此你可以把消息标记为 "green"、"magenta" 等。

第一个函数 setflag 演示了如何设置 "green" 标志位。在第二个函数 readflag 中，对 "green" 和 "magenta" 标志位进行了求值。

##### functions.pl

本示例脚本演示了与从 perl 内部调用函数相关的不同内容，以及你可以为 OpenSIPS 访问提供的不同类型的函数。

"exportedfuncs" 简单演示了可以使用 moduleFunction 方法调用其他模块提供的函数。其结果等同于从配置文件中调用这些函数。在演示的情形中，目标号码以 555... 开头的电话呼叫会被以内部服务器错误拒绝。其他目标地址则被传给 alias_db 模块。

请注意，moduleFunction 方法在 OpenSIPS 1.2 中并非完全可用。详见该方法的文档。

"paramfunc" 表明可以向 perl 函数传入任意字符串。随你如何使用它们 :)

"autotest" 表明 OpenSIPS::Message 对象中的未知函数会被自动转换为模块函数的调用。

"diefunc" 系列表明 perl 脚本的终止——无论是"手动"终止还是由于脚本错误——都由 OpenSIPS 包处理。错误消息通过 OpenSIPS 的日志机制记录。请注意，只有当你没有覆盖默认的 die 处理程序时，这才能正常工作。哦对了，这对警告同样有效。

##### headers.pl

处理 SIP 消息时，消息头提取是最关键的功能之一。本示例脚本用两个示例函数演示了对消息头名称和值的访问。

"headernames" 提取所有消息头名称并记录其名称。

"someheaders" 记录两个消息头 "To" 和 "WWW-Contact" 的内容。如你所见，出现多次的消息头会以数组形式获取，可以通过 Perl 的数组访问方法访问。

##### logging.pl

出于调试目的，你可能想向 syslog 写入消息。"logdemo" 展示了访问 OpenSIPS 日志函数的三种方式：它既可通过 OpenSIPS 类使用，也可通过 OpenSIPS::Message 类使用。

请记住可以使用其他模块导出的函数。因此你也可以使用 "xlog" 模块及其 xlog 函数。

L_INFO、L_DBG、L_ERR、L_CRIT... 等常量可通过 OpenSIPS::Constants 包使用。

##### messagedump.pl

本脚本演示如何访问当前消息的完整消息头。请注意，配置脚本中较早的函数调用对消息所做的修改可能不会反映在该转储中。

##### persistence.pl

处理 SIP 消息时，你可能希望在多次调用 Perl 函数之间使用持久数据。第一个选项是在脚本中使用全局变量。遗憾的是，这些全局变量在 OpenSIPS 的多个实例之间不可见。你可能想使用 IPC::Shareable 共享内存访问包之类的机制来解决这个问题。

##### phonenumbers.pl

OpenSIPS::Utils::PhoneNumbers 包提供两个方法，用于在本地电话号码与规范电话号码之间相互转换。本脚本演示了它的用法。

##### pseudovars.pl

本脚本演示 Perl 模块的 "pseudoVar" 方法。它可用于获取当前伪变量的值。

你可能会注意到，并没有专门用于设置伪变量的函数；不过你可以使用 sqlops 模块导出的函数。

## 常见问题 {#frequently-asked-questions}

**问：Perl 模块中存在已知缺陷吗？**

Perl 模块确实有一些可被视为缺陷的不足之处。

**问：在哪里可以更多了解 OpenSIPS？**

请访问 [https://opensips.org/](https://opensips.org/)。

**问：可以在哪里提交关于本模块的问题？**

首先请检查你的问题是否已在我们的某个邮件列表中得到了回答：

关于任何稳定 OpenSIPS 版本的邮件应发送至 users@lists.opensips.org，关于开发版本的邮件应发送至 devel@lists.opensips.org。

如果希望邮件保持私密，请发送至 users@lists.opensips.org。

**问：如何报告缺陷？**

请遵循以下地址提供的准则：[https://github.com/OpenSIPS/opensips/issues](https://github.com/OpenSIPS/opensips/issues)。
<!-- CONTRIBUTORS -->

### 许可证 {#license}

所有文档文件（即 .md 扩展名）均按 Creative Common License 4.0 许可发布
