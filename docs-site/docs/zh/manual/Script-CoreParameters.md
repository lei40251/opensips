---
outline: [2, 3]
title: "核心参数"
description: "本节列出 OpenSIPS 核心导出的、供脚本使用的全部参数（在 opensips.cfg 中使用）。"
---

本节列出 **OpenSIPS** 核心导出的、供脚本使用的全部参数（在 opensips.cfg 中使用）。

## 核心参数 {#core-parameters}

*opensips.cfg* 配置文件中可用的全局参数。可接受的值取决于参数类型：双引号字符串、数字或布尔值（`true`/`false`）。

### abort_on_assert {#abort_on_assert}
默认值为 `false`。

  

仅当启用了 [asserts](./Script-CoreFunctions.md#assert-statement-description) 时才有意义。设为 `true` 后，脚本中的 assert 断言失败时 OpenSIPS 会立即关闭。

使用示例：
```opensips

    abort_on_assert = true

```

### advertised_address {#advertised_address}

该值可以是 IP 地址或字符串，表示在 Via 头域以及其他目的地 lump（如 Record-Route 头域）中通告的地址。若为空或未设置，则通告用于发送请求的套接字地址。

> [!WARNING]
> 除非清楚自己在做什么（例如处理 NAT 穿透），否则不要设置此项。
> OpenSIPS 不会校验该值；例如 `foo.bar` 即使并不存在也会被接受。

使用示例：
```opensips

    advertised_address = "opensips.org"

```

> [!NOTE]
> 除了这种全局方式，还可以使用 [socket](#socket) 参数为每个接口分别定义通告的 IP 和端口。按接口设置的通告值仅用于从该接口发出的流量。

### advertised_port {#advertised_port}

在 Via 头域以及其他目的地 lump（如 Record-Route 头域）中通告的端口。若为空或未设置，则通告用于发送消息的端口。与 [advertised_address](#advertised_address) 相同的告警同样适用。

使用示例：
```opensips

    advertised_port = 5080

```

> [!NOTE]
> 除了这种全局方式，还可以使用 [socket](#socket) 参数为每个接口分别定义通告的 IP 和端口。按接口设置的通告值仅用于从该接口发出的流量。

### alias {#alias}

为服务器设置别名主机名。可多次设置，每个值都会加入在检查 `myself` 时用于匹配主机名的列表。

若省略 `:port` 部分，则该主机名的**所有**端口都被视为别名，类似于端口 `0`。

它可以接受一个可选的 **accept_subdomain** 标志，以便同时匹配所定义域的任何子域。

> [!IMPORTANT]
> 必须在别名定义中包含 `socket` 定义里使用的端口，否则 `loose_route()` 函数在本地转发时将无法按预期工作！


使用示例：

```opensips

    alias = udp:other.domain.com:5060
    alias = tcp:another.domain.com:5060
    # 接受形如 sip.domainX.com 的子域
    alias = udp:domainX.com:5060 accept_subdomain

```

### auto_aliases {#auto_aliases}

该参数控制是否在修正监听套接字时自动发现并添加别名。自动发现的别名来自 DNS 查询结果（当 [socket](#socket) 定义使用主机名时），或来自对套接字 IP 的反向 DNS 查询。

为了向后兼容，默认值为 `false`。

使用示例：
```opensips

    auto_aliases = true

```

### auto_scaling_cycle {#auto_scaling_cycle}
定义自动扩缩容周期的秒数。在每个周期内，自动扩缩容引擎会评估各进程组的内部负载，并决定是否需要创建更多进程或终止现有进程。关于自动扩缩容工作原理的更多细节，参见 [auto_scaling_profile](#auto_scaling_profile)。

默认值为 `1` 秒。

使用示例：
```opensips

    auto_scaling_cycle = 3  # 每 3 秒执行一次自动扩缩容检查

```

### auto_scaling_profile {#auto_scaling_profile}
定义自动扩缩容行为：允许的进程数量，以及何时创建或终止进程。这些 profile 可用于 UDP 进程（参见 [udp_workers](#udp_workers) 或 [socket](#socket) 选项）、TCP 进程（参见 [tcp_workers](#tcp_workers) 选项）或定时器进程（参见 [timer_workers](#timer_workers) 选项）。

更多内容参见 [这篇关于自动扩缩容的外部说明](https://blog.opensips.org/2019/02/25/auto-process-scaling-a-cure-for-load-and-resources-concerns/)。

使用示例：
```opensips

    auto_scaling_profile = PROFILE_SIP
        scale up to 6 on 70% for 4 cycles within 5
        scale down to 2 on 18% for 10 cycles

```
该 profile 允许该组最多分叉到 6 个进程。当该组的总体负载在 5 个周期的监控窗口内超过 70% 的持续时间多于 4 个周期时，会分叉一个新进程。一个周期即监控时间单位，由 [auto_scaling_cycle](#auto_scaling_cycle) 定义。

该 profile 还允许该组缩容到最少 2 个进程。当该组的总体负载在 10 个周期内低于 18% 时，会终止一个进程。profile 中的缩容部分是可选（optional）的。若未定义，OpenSIPS 只会扩容。

### check_via {#check_via}

检查应答中最顶层 Via 头域里的地址是否为本地地址。默认值为 `false`（检查关闭）。

使用示例：

```opensips

    check_via = true

```

### chroot {#chroot}

该值必须是系统中有效的路径。若设置，**OpenSIPS** 将执行 chroot，把根目录切换到该路径。

使用示例：

```opensips

    chroot = "/other/fakeroot"

```

### debug_mode {#debug_mode}
启用 **debug_mode** 是调试 **OpenSIPS** 的快捷方式。该选项会自动强制：
* 前台模式（不从控制台分离）
* 日志级别 4（debug）
* 日志输出到标准错误
* 核心转储
* 若启用了 UDP，则 UDP 工作进程数为 2
* 若启用了 TCP，则 TCP 工作进程数为 2；若配置的最大值小于 2，则取该最大值

默认值为 `false`（关闭）。

> [!NOTE]
> 启用该选项会覆盖前台模式、日志级别、`udp_workers` 和 `tcp_workers` 等单独参数。

使用示例：
```opensips

    debug_mode = true

```

### db_version_table {#db_version_table}

DB API 用于检查表版本所用的数据库表名。

默认值为 `"version"`。

使用示例：
```opensips

    db_version_table = "version_3_6"

```

### db_default_url {#db_default_url}

当未配置按模块的 URL 时，模块使用的默认 DB URL。

默认值为 `NULL`（未定义）。

使用示例：
```opensips

    db_default_url = "mysql://opensips:opensipsrw@localhost/opensips"

```

### db_max_async_connections {#db_max_async_connections}

单个 OpenSIPS 工作进程向每个独立 SQL 后端打开的最大 TCP 连接数。

默认值为 `10`。

独立后端按 DB URL 如下确定：
```opensips

    [ scheme, user, pass, host, port, database ]

```

使用示例：
```opensips

    db_max_async_connections = 220

```

### disable_503_translation {#disable_503_translation}

若设为 `true`，OpenSIPS 不会把收到的 503 应答转换为 500 应答。RFC 3261 规定代理绝不应中继 503 响应，而应将其转换为 500 响应。

默认值为 `false`（转换开启）。

使用示例：
```opensips

    disable_503_translation = true

```

### disable_core_dump {#disable_core_dump}

若设为 `true`，OpenSIPS 通过把核心转储大小限制设为 0 来禁用核心转储。默认情况下，核心转储限制为不限制或设为足够大的值。

默认值为 `false`。

使用示例：
```opensips

    disable_core_dump = true

```

### disable_dns_blacklist {#disable_dns_blacklist}

当配置了 DNS 故障切换时，DNS 解析器可以临时把失败的目的地加入黑名单。这会在有限时间内阻止 **OpenSIPS** 向已知失败的目的地发送请求。黑名单相当于 DNS 解析器的记忆机制。

DNS 解析器创建的临时黑名单名为 `dns`，默认被选用于故障切换，因此无需对其调用 `use_blacklist()`。该列表中的规则生存期为 4 分钟；这可在编译时于 `resolve.c` 中修改。

若设为 `true`，该 DNS 黑名单被禁用。

默认值为 `true`（DNS 黑名单禁用）。

使用示例：
```opensips

    disable_dns_blacklist = false

```

### disable_dns_failover {#disable_dns_failover}

若设为 `true`，OpenSIPS 禁用基于 DNS 的故障切换。这是一个全局选项，同时影响核心和模块。

默认值为 `false`（基于 DNS 的故障切换开启）。

使用示例：
```opensips

    disable_dns_failover = true

```

### disable_stateless_fwd {#disable_stateless_fwd}

控制无状态应答的处理方式：

```opensips

    true  - 若脚本中未使用 forward() 等无状态转发函数，则丢弃无状态应答
    false - 转发无状态应答

```

默认值为 `true`。

使用示例：
```opensips

    disable_stateless_fwd = false

```

### dns {#dns}

该参数控制 SIP 服务器是否应尝试在 DNS 中查询自身域名。若该参数设为 `true` 且域名不在 DNS 中，会向 syslog 打印一条告警，并在 Via 头域中添加 `received=` 字段。

默认值为 `false`。

使用示例：
```opensips

    dns = true

```

### dns_retr_time {#dns_retr_time}

重试 DNS 请求之前的等待秒数。默认值依系统而定，并且也取决于 `/etc/resolv.conf` 的内容，通常为 5 秒。

使用示例：
```opensips

    dns_retr_time = 3

```

### dns_retr_no {#dns_retr_no}

放弃之前进行的 DNS 重传次数。默认值依系统而定，并且也取决于 `/etc/resolv.conf` 的内容，通常为 `4`。

使用示例：
```opensips

    dns_retr_no = 3

```

### dns_servers_no {#dns_servers_no}

将使用 `/etc/resolv.conf` 中多少个 DNS 服务器。

默认值为使用全部。

使用示例：
```opensips

    dns_servers_no = 2

```

### dns_try_ipv6 {#dns_try_ipv6}

若设为 `true` 且 DNS 查询失败，OpenSIPS 会使用 AAAA 记录重试 IPv6 查询。

默认值为 `false`。

使用示例：
```opensips

    dns_try_ipv6 = true

```

### dns_try_naptr {#dns_try_naptr}

控制在对 SIP 请求进行基于 DNS 的路由时是否执行 NAPTR 查询。若禁用，DNS 查询将从 SRV 查询开始。

默认值为 `true`。

使用示例：
```opensips

    dns_try_naptr = false

```

### dns_use_search_list {#dns_use_search_list}

若设为 `false`，`/etc/resolv.conf` 中的搜索列表将被忽略，这意味着查询更少、DNS 失败处理更快。

默认值为 `true`。

> [!NOTE]
> 即使没有定义搜索列表，把该选项设为 `false` 仍可能更快，因为空搜索列表仍会引发两次 DNS 查询，例如 `foo.` 和 `foo`。

使用示例：
```opensips

    dns_use_search_list = false

```

### dst_blacklist {#dst_blacklist}

定义 IP/目的地黑名单。这些列表可在运行时从脚本中选择，以根据 IP、协议、端口等过滤出站请求。

主要目的是防止因错误的 DNS 记录而向网关等关键 IP 发送请求，或避免向已知暂时或永久不可用的目的地发送请求。

指定列表的语法为：

```opensips

    dst_blacklist = id [/bl_flags] [: bl_rules]

```

* **id** 是黑名单的唯一标识符。
* **bl_flags** 包含一组可选的修饰符：

```opensips

    bl_flags = bl_flag [, bl_flag]*
    bl_flag = "expire" | "default" | "readonly"

```

* **bl_rules** 包含一条或多条黑名单规则：

```opensips

    bl_rules = [!] ipnet | { bl_rule [, bl_rule]* }
    bl_rule = [!] ( [bl_proto, ] ipnet [, port [, bl_pattern]] )

```

黑名单修饰符的含义如下：
* `expire`：该黑名单可包含会过期的条目。
* `default`：发送请求时默认使用该黑名单，无需通过 `use_blacklist()` 函数显式设置。
* `readonly`：该黑名单在脚本中静态定义，运行时不可更改。

当缺少 **bl_flags** 时，会显式设置 `readonly` 标志。

一条规则具有以下属性：
* 若 `!` 位于规则开头，则对整个规则取反。
* **bl_proto**：任一受支持的协议，或 `any` 表示任意协议；若缺省，默认为 `any`。
* **ipnet**：应匹配该规则的 IP 或 IP/MASK。
* **port**：端口号，或 `0` 表示任意端口。
* **bl_pattern**：类似文件名的匹配，参见 `man 3 fnmatch`，作用于出站请求缓冲区（`first_line + hdrs + body`）。

使用示例：
```opensips

    # 过滤发往我的网关 IP 的请求
    dst_blacklist = gw:{(tcp, 192.168.3.100, 5060, ""), (any, 192.168.3.101, 0, "")}
    # 阻断发往“恶意”网络的请求
    dst_blacklist = net_filter:{(any, 192.168.1.120/255.255.255.0, 0, "")}
    # 阻断包含不良词汇的 MESSAGE 请求
    dst_blacklist = msg_filter:{(any, 192.168.20.0/255.255.255.0, 0, "MESSAGE*ugly_word")}
    # 阻断不前往特定子网的请求
    dst_blacklist = net_filter2:{!(any, 193.168.30.0/255.255.255.0, 0, "")}
    # 定义一个运行时构建、条目会过期的动态列表
    dst_blacklist = net_dynamic/expire

```

### enable_asserts {#enable_asserts}
默认值为 `false`。

设为 `true` 以启用 [assert](./Script-CoreFunctions.md#assert-statement-description) 脚本语句。

使用示例：
```opensips

    enable_asserts = true

```

### event_pkg_threshold {#event_pkg_threshold}

一个表示百分比阈值的数字，当可用私有内存偏低时会触发 E_CORE_PKG_THRESHOLD 事件以示告警。它接受 `0` 至 `100` 之间的整型值。

默认值为 `0`（事件禁用）。

使用示例：
```opensips

    event_pkg_threshold = 90

```

### event_shm_threshold {#event_shm_threshold}

一个表示百分比阈值的数字，当可用共享内存偏低时会触发 E_CORE_SHM_THRESHOLD 事件以示告警。它接受 `0` 至 `100` 之间的整型值。

默认值为 `0`（事件禁用）。

使用示例：
```opensips

    event_shm_threshold = 90

```

### exec_dns_threshold {#exec_dns_threshold}

一个表示 DNS 查询预期耗时的最大微秒数的数字。任何超过设定值的查询都会向日志设施触发一条告警消息。

默认值为 `0`（日志关闭）。

使用示例：
```opensips

    exec_dns_threshold = 60000

```

### exec_msg_threshold {#exec_msg_threshold}

一个表示处理一条 SIP 消息预期耗时的最大微秒数的数字。任何超过设定值的处理都会向日志设施触发一条告警消息。除消息和处理耗时外，脚本中最耗时的函数调用也会被记录。

默认值为 `0`（日志关闭）。

使用示例：
```opensips

    exec_msg_threshold = 60000

```

### include_file {#include_file}

可在路由块之外调用，用于加载额外的路由或块；也可在路由块之内调用，用于加载额外的脚本动作。文件路径可以是相对路径或绝对路径。若为相对路径，OpenSIPS 首先尝试相对于启动 OpenSIPS 时所在目录来定位；若失败，则尝试包含该文件的文件所在目录。若找不到文件则报错。

使用示例：
```opensips

    include_file "proxy_regs.cfg"

```

### import_file {#import_file}

[include_file](#include_file) 的别名。

使用示例：
```opensips

    import_file "proxy_regs.cfg"

```

### listen {#listen}

> [!WARNING]
> 已在 OpenSIPS 3.1 中被替换。

该参数已被 [socket](#socket) 参数替换，格式和行为完全保持一致。

### log_facility {#log_facility}

> [!WARNING]
> 已在 OpenSIPS 3.4 中被替换。

该参数已被 [syslog_facility](#syslog_facility) 参数替换，格式和行为完全保持一致。

### log_event_enabled {#log_event_enabled}

为 OpenSIPS 生成的每条日志消息启用 E_CORE_LOG 事件。

默认值为 `false`。

使用示例：
```opensips

    log_event_enabled = true

```

### log_event_level_filter {#log_event_level_filter}

针对 E_CORE_LOG 事件的额外日志级别过滤。当希望在 syslog/标准错误日志与通过 E_CORE_LOG 投递的日志之间使用不同的详细程度时，该参数很有用。

`log_event_level_filter` 参数应与 [log_level](#log_level) 参数配合使用，取值低于 `log_level`。

默认值为 `0`（不过滤）。

使用示例：
```opensips

    log_event_level_filter = 3

```

### log_json_buf_size {#log_json_buf_size}

用于打印日志消息对应 JSON 文档的缓冲区大小。当使用 `json` 或 `json_cee` 日志格式时，该参数才有意义。若缓冲区过小，日志消息会被截断。

默认值为 `6144` 字节。

使用示例：
```opensips

    log_json_buf_size = 8192  # 以字节为单位

```

### log_level {#log_level}

设置日志级别，控制 OpenSIPS 的详细程度。值越高，**OpenSIPS** 打印的消息越多。

默认值为 `2`（notice 级别）。

使用示例：
```opensips

    # 只打印重要消息，例如错误或更严重的情形；
    # 建议在以守护进程方式运行代理时使用
    log_level = 1

    # 打印大量调试消息；仅在调试时使用
    log_level = 4

```

实际取值为：
* `-3`：alert 级别
* `-2`：critical 级别
* `-1`：error 级别
* `1`：warning 级别
* `2`：notice 级别
* `3`：info 级别
* `4`：debug 级别

`log_level` 参数的值也可通过 [log_level](Interface-CoreMI.md#log-level-level-pid) 核心 MI 函数或 [`$log_level`](Script-CoreVar.md#opensips-log-level---log_level) 脚本变量动态读取和设置。

### log_msg_buf_size {#log_msg_buf_size}

用于打印日志消息载荷的缓冲区大小。当使用 `json` 或 `json_cee` 日志格式时，或在启用的情况下触发 E_CORE_LOG 事件时，会用它打印 JSON 文档中的 `message` 字段。若缓冲区过小，日志消息会被截断。

默认值为 `4096` 字节。

使用示例：
```opensips

    log_msg_buf_size = 8192  # 以字节为单位

```

### log_name {#log_name}

> [!WARNING]
> 已在 OpenSIPS 3.4 中被替换。

该参数已被 [syslog_name](#syslog_name) 参数替换，格式和行为完全保持一致。

### log_stdout {#log_stdout}

控制 OpenSIPS 是否保留标准输出。当需要从第三方库提取日志时，这可能很有用。

* `false`（默认）：丢弃所有标准输出日志。
* `true`：让所有标准输出日志通过。

默认值为 `false`。

使用示例：
```opensips

    log_stdout = true

```

### log_stderror {#log_stderror}

> [!WARNING]
> 已在 OpenSIPS 3.4 中废弃。

该参数已废弃。从 OpenSIPS 3.4 起，其行为等同于按如下方式设置 [stderror_enabled](#stderror_enabled) 和 [syslog_enabled](#syslog_enabled)：
* `false`：`stderror_enabled = false`，`syslog_enabled = true`。
* `true`（默认）：`stderror_enabled = true`，`syslog_enabled = false`。

使用示例：

```opensips
log_stderror = true
```

### log_prefix {#log_prefix}

附加在 OpenSIPS 产生的所有日志之前的字符串前缀，C 代码和脚本 `xlog()` 语句产生的日志都包括在内。非空的值会自动在末尾加上 `:`。

默认值为 `""`。

使用示例：
```opensips

    log_prefix = "opensips-backup"

```

### max_while_loops {#max_while_loops}

设置 `while` 语句中允许的最大循环迭代次数。这可在配置脚本执行期间防止死循环。

默认值为 `10000`。

使用示例：
```opensips

    max_while_loops = 200

```

### maxbuffer {#maxbuffer}

OpenSIPS 在自动探测过程中将接受的最大接收缓冲区大小（字节），该探测用于发现接收 UDP 消息的最大缓冲区大小。

默认值为 `262144` 字节。

使用示例：
```opensips

    maxbuffer = 65536

```

### mem-group {#mem-group}

按名称定义一组模块，用于单独的内存统计。OpenSIPS 提供按组的内存信息：已分配片段数、已使用内存量以及实际已使用内存量（包含内存管理器开销）。在监控特定模块或模块组的内存使用情况时很有用。

该功能需要运行 `make generate-mem-stats` 并定义 `SHM_EXTRA_STATS` 变量进行编译。

使用示例：
```opensips

    mem-group = "interest": "core" "tm"
    mem-group = "runtime": "dialog" "usrloc" "tm"

```

对于上述示例，生成的统计项命名为 `shmem_group_interest:fragments`、`shmem_group_interest:memory_used` 和 `shmem_group_interest:real_used`。

可定义多个组，但名称不得相同。

要为默认组（包含未归入其他组的所有模块）生成统计，需定义 `SHM_SHOW_DEFAULT_GROUP` 变量进行编译。

### mem_warming {#mem_warming}

仅在启用 `HP_MALLOC` 编译标志时才有意义。若设为 `true`，OpenSIPS 会在每次启动时尝试恢复停机/重启之前的内存碎片分布。若未找到上一次运行产生的 [mem_warming_pattern_file](#mem_warming_pattern_file)，则跳过内存预热，内存分配器会像其他所有分配器一样从一大块内存开始。

在处理高流量（例如多核机器上数千 CPS）时，内存预热很有用。使用的核心越多，内存预热就越有用，因为进程在切分初始的大内存块时必须相互互斥。通过在启动时完成碎片化，OpenSIPS 在重启后的头几分钟内也能保持最优表现。碎片化通常持续几秒，例如在 8GB 共享内存池、4.1GHz CPU 上约 5 秒；此期间不处理流量。

默认值为 `false`。

使用示例：
```opensips

    mem_warming = true

```

### mem_warming_percentage {#mem_warming_percentage}

重启时，应使用上一次运行的模式对多少 OpenSIPS 内存进行碎片化。若启用了 [mem_warming](#mem_warming)，则在启动时使用。

默认值为 `75`。

使用示例：
```opensips

    mem_warming_percentage = 50

```

### mem_warming_pattern_file {#mem_warming_pattern_file}

仅在启用 [mem_warming](#mem_warming) 时才有意义。它包含上一次 OpenSIPS 运行的内存碎片分布模式。该文件在每次 OpenSIPS 关闭时被覆盖，并在启动时使用，以便尽快恢复服务行为。

默认值为 `"CFG_DIR/mem_warming_pattern"`。

使用示例：
```opensips

    mem_warming_pattern_file = "/var/tmp/my_memory_pattern"

```

### memdump | mem_dump {#memdump--mem_dump}

用于在运行时和关闭时打印内存状态信息的日志级别。它必须低于 [log_level](#log_level) 参数的值，内存信息才会被记录。

默认值为 `14`（`L_DBG + 10`），它高于常规 debug 日志级别，因此实际上禁用了内存转储日志。

使用示例：
```opensips

    memdump = 2

```

> [!NOTE]
> 设置 [memlog](#memlog--mem_log) 也会把 `memdump` 设为相同的值。若希望 `memlog` 和 `memdump` 取不同值，请先设置 `memlog`，再设置 `memdump`。

### memlog | mem_log {#memlog--mem_log}

用于打印内存调试信息的日志级别。它必须低于 [log_level](#log_level) 参数的值，内存调试信息才会被记录。

默认值为 `15`（`L_DBG + 11`），它高于常规 debug 日志级别，因此实际上禁用了内存调试日志。

使用示例：
```opensips

    memlog = 2

```

> [!NOTE]
> 设置 `memlog` 会自动把 `memdump` 设为相同的值。

### mcast_loopback {#mcast_loopback}

若设为 `true`，组播数据报通过环回接口发送。

默认值为 `false`。

使用示例：
```opensips

    mcast_loopback = true

```

### mcast_ttl {#mcast_ttl}

设置组播 TTL。

默认值依操作系统而定，通常为 `1`。

使用示例：
```opensips

    mcast_ttl = 32

```

### mhomed {#mhomed}

若设为 `true`，OpenSIPS 会在多宿主主机上尝试定位出站接口。该查找较为耗时，因此默认禁用。

默认值为 `false`。

使用示例：
```opensips

    mhomed = true

```

### mpath {#mpath}

设置模块搜索路径。这可用于简化 `loadmodule` 语句。

使用示例：
```opensips

    mpath = "/usr/local/lib/opensips/modules"
    loadmodule "mysql.so"
    loadmodule "uri.so"
    loadmodule "uri_db.so"
    loadmodule "sl.so"
    loadmodule "tm.so"
    ...

```

该参数可多次设置，路径按声明顺序依次生效。

### open_files_limit {#open_files_limit}

若设置且大于当前打开文件数限制，**OpenSIPS** 会尝试把打开文件数限制提高到该数值。要把限制提高到硬限制之上，**OpenSIPS** 必须以 root 身份启动；在多数系统上打开文件的硬限制为 `1024`。

默认值为 `-1`（不更改打开文件数限制）。

使用示例：
```opensips

    open_files_limit = 2048

```

### poll_method {#poll_method}

内部 I/O 反应器使用的轮询方法。默认会选择当前操作系统的最佳方法。

可用值为 `poll`、`epoll`、`sigio_rt`、`select`、`kqueue` 和 `/dev/poll`。

使用示例：
```opensips

    poll_method = select

```

### pv_print_buf_size {#pv_print_buf_size}

包含变量或伪变量的展开格式化字符串的最大大小（字节）。

默认值为 `20000` 字节。

使用示例：
```opensips

    pv_print_buf_size = 60000

```

### query_buffer_size {#query_buffer_size}

若设为大于 `1` 的值，DB 插入不再逐条刷写。待插入的行会保留在内存中，直到累积到 `query_buffer_size` 行，此时才会刷写到数据库。

默认值为 `0`（缓冲禁用）。

使用示例：
```opensips

    query_buffer_size = 5

```

### query_flush_time {#query_flush_time}

若 [query_buffer_size](#query_buffer_size) 设为大于 `1` 的值，定时器每隔 `query_flush_time` 秒触发一次，确保没有行在内存中保留过久。

默认值为 `0`。

使用示例：
```opensips

    query_flush_time = 10

```

### REACTOR_DBG_FD_CHECK {#reactor_dbg_fd_check}

**调试选项。** 在每次 `io_watch_add()` / `io_watch_del()` 时对反应器的
fd 映射执行完整的一致性检查，以帮助诊断
反应器和 fd 映射相关问题。它不是调优或生产环境
设置。

该检查在每次调用时遍历反应器的每一个 `open_files_limit` 条目，
因此在大量异步流量下的大型反应器上开销很大
（实测：在 21000 条目的反应器上每次调用约 0.6 ms；每秒约 1500 次异步
操作会占用宿主 CPU 的 13.6%，并在负载下出现 UDP 丢包）。
仅在排查反应器问题时启用，之后再禁用；
更改需要重启。

默认值为 `false`（在定义 `EXTRA_DEBUG` 的构建中为 `true`）。

> [!NOTE]
> 这只是一个调试选项。在生产系统上请保持禁用，
> 除非你正在积极排查反应器问题。

使用示例：
```opensips

    REACTOR_DBG_FD_CHECK = true

```

### restart_persistency_cache_file {#restart_persistency_cache_file}

用于存储重启持久化内存的缓存文件名。

默认值为 `".restart_persistency.cache"`。

使用示例：
```opensips

    restart_persistency_cache_file = "/var/tmp/opensips_restart.cache"

```

### restart_persistency_size {#restart_persistency_size}

重启持久化缓存文件的大小，以兆字节为单位。若未指定该参数，则默认为共享内存的大小。

默认值为共享内存大小，默认 `32` MB。

使用示例：
```opensips

    restart_persistency_size = 64

```

### rev_dns {#rev_dns}

控制 SIP 服务器是否应尝试在 DNS 中查询自身的 IP 地址。若该参数设为 `true` 且 IP 地址不在 DNS 中，会向 syslog 打印一条告警，并在 Via 头域中添加 `received=` 字段。

默认值为 `false`。

使用示例：
```opensips

    rev_dns = true

```

### server_header {#server_header}

**OpenSIPS** 以 UAS 身份发送应答时生成的 Server 头域的主体内容。

默认值为 `"Server: OpenSIPS (<version> (<arch>/<os>))"`。

使用示例：
```opensips

    server_header = "Server: My Company SIP Proxy"

```

> [!NOTE]
> 该值必须包含头域名 `Server:`。否则，**OpenSIPS** 只会写入配置的主体内容。

### server_signature {#server_signature}

控制是否向本地生成的消息中添加 Server 头域。

默认值为 `true`。

使用示例：
```opensips

    server_signature = false

```

启用后，生成的头域形如：
```opensips

    Server: OpenSIPS (4.0.0 (x86_64/linux))

```

### shm_hash_split_percentage {#shm_hash_split_percentage}

仅在启用 `HP_MALLOC` 编译标志时才有意义。它控制优化多少个内存桶。例如，设为 `2` 会优化最常用的前 `2%` 内存桶。

默认值为 `1`。

使用示例：
```opensips

    shm_hash_split_percentage = 2

```

### shm_memlog_size {#shm_memlog_size}

配置在内存历史记录中保留的共享内存操作的最大数量。会分配一个专门用于该共享内存调试信息的独立内存块。因此，**OpenSIPS** 使用的系统内存会多于通过 `-m` 命令行选项设置的共享内存池。例如，`shm_memlog_size = 1000000` 会多占用约 750 MB 内存。该选项用于调试。

默认值为 `0`（禁用）。

使用示例：
```opensips

    shm_memlog_size = 1000000

```

### shm_secondary_hash_size {#shm_secondary_hash_size}

仅在启用 `HP_MALLOC` 编译标志时才有意义。它表示单个内存桶的优化因子。例如，设为 `4` 会使被优化的桶进一步拆分为 `4` 个。

默认值为 `8`。

使用示例：
```opensips

    shm_secondary_hash_size = 4

```

### sip_warning {#sip_warning}

若设为 `true`，会向 **OpenSIPS** 生成的每个应答添加 Warning 头域。该头域包含有助于利用网络流量转储进行故障排查的细节。

默认值为 `false`。

使用示例：
```opensips

    sip_warning = true

```

### socket {#socket}

设置 OpenSIPS 服务器应监听的网络地址/套接字。其语法为 `protocol:address[:port|portrange]`，其中：
* **protocol**：配置文件中已加载的传输模块之一，例如 `udp`、`tcp`、`tls`、`bin` 或 `hep`。
* **address**：IP 地址、主机名、网络接口名，或通配符 `*`（使 OpenSIPS 在该协议的所有可用接口上监听）。
* **port**：可选的监听套接字端口；若缺省，则使用传输模块导出的默认端口。
* **portrange**：可选的一组端口，应为同一 IP 地址监听。

该参数可在同一配置文件中多次设置，服务器将监听所有指定的套接字。

`socket` 定义可以接受若干可选参数：
* `as ip[:port]`：仅为此接口配置通告的 IP 和端口。示例：`as 11.24.14.14:5060`。
* `use_workers n`：仅为该套接字设置不同的工作进程数，适用于 UDP、SCTP 和 HEP_UDP 接口。这会覆盖全局 `udp_workers` 参数。
* `anycast`：把该套接字标记为 anycast IP。
* `use_auto_scaling_profile PROFILE`：为该 UDP 套接字强制使用某个自动扩缩容 profile。该选项仅对 UDP 套接字可用，且按套接字的 profile 会覆盖全局 UDP 自动扩缩容 profile。
* `tag ID`：为该套接字设置非 SIP 的名称/标签，在 OpenSIPS 集群中复制套接字标识时使用。
* `frag`：不使用 PMTU 发现来判断是否应进行分片；始终允许分片。
* `reuse_port`：仅对基于 TCP 的套接字，允许出站 TCP 连接复用监听端口作为源端口，而不用临时端口。
* `tos n`：通过该接口发送 SIP 流量时使用的可选 TOS 值。这会覆盖全局 [tos](#tos) 核心参数。
* `accept_subdomain`：当套接字定义为 FQDN 时，也匹配该 SIP 域的子域。

这些选项只影响为其配置的套接字；若某个套接字未定义这些选项，则改用全局值。

使用示例：
```opensips

    socket = udp:*
    socket = udp:eth1
    socket = tcp:eth1:5062
    socket = tls:localhost:5061
    socket = hep_udp:10.10.10.10:5064
    socket = ws:127.0.0.1:5060 use_workers 5
    socket = sctp:127.0.0.1:5060 as 99.88.44.33:5060 use_workers 3
    socket = udp:10.10.10.10:5060 anycast
    socket = udp:10.10.10.10:5060 use_workers 4 use_auto_scaling_profile PROFILE_SIP

```

启动时，OpenSIPS 会报告其正在监听的所有套接字。

### stderror_enabled {#stderror_enabled}

启用把日志消息写入标准错误。

默认值为 `true`。

使用示例：
```opensips

    stderror_enabled = false

```

### stderror_level_filter {#stderror_level_filter}

针对写入标准错误的消息的额外日志级别过滤。当希望 syslog 与标准错误日志使用不同的详细程度时，该参数很有用。

`stderror_level_filter` 参数应与 [log_level](#log_level) 参数配合使用，取值低于 `log_level`。

默认值为 `0`（不过滤）。

使用示例：
```opensips

    stderror_level_filter = 2

```

### syslog_enabled {#syslog_enabled}

启用把日志消息写入 syslog。

默认值为 `false`。

使用示例：
```opensips

    syslog_enabled = true

```

### stderror_log_format {#stderror_log_format}

打印到标准错误的日志消息格式。可用值为：
* `plain_text`：标准纯文本日志消息。
* `json`：基础 JSON 文档。
* `json_cee`：遵循 [CEE（Common Event Expression）](https://cee.mitre.org/language/1.0-beta1/core-profile.html) schema 的 JSON 文档。

默认值为 `plain_text`。

使用示例：
```opensips

    stderror_log_format = "json"

```

### syslog_facility {#syslog_facility}

若 **OpenSIPS** 记录到 syslog，该参数控制 syslog facility。当把全部 **OpenSIPS** 日志转移到另一个日志文件时很有用。更多细节参见 `syslog(3)`。

默认值为 `LOG_DAEMON`。

使用示例：
```opensips

    syslog_facility = LOG_LOCAL0

```

### syslog_level_filter {#syslog_level_filter}

针对发送到 syslog 的消息的额外日志级别过滤。当希望 syslog 与标准错误日志使用不同的详细程度时，该参数很有用。

`syslog_level_filter` 参数应与 [log_level](#log_level) 参数配合使用，取值低于 `log_level`。

默认值为 `0`（不过滤）。

使用示例：
```opensips

    syslog_level_filter = 1

```

### syslog_log_format {#syslog_log_format}

发送到 syslog 的日志消息格式。可用值为：
* `plain_text`：标准纯文本日志消息。
* `json`：基础 JSON 文档。
* `json_cee`：遵循 [CEE（Common Event Expression）](https://cee.mitre.org/language/1.0-beta1/core-profile.html) schema 的 JSON 文档。

默认值为 `plain_text`。

使用示例：
```opensips

    syslog_log_format = "json"

```

### syslog_name {#syslog_name}

设置 syslog 中打印的标识。该值必须是字符串，且仅在 **OpenSIPS** 以守护进程模式运行、完成守护化之后生效。

默认值为 `argv[0]`。

使用示例：
```opensips

    syslog_name = "osips-5070"

```

### tcp_workers {#tcp_workers}

为读取 TCP 连接而创建的工作进程数。这些工作进程处理任何基于 TCP 的协议上的流量，例如 SIP-TCP、SIP-TLS、SIP-WS、SIP-WSS、BIN 或 HEP。

默认值为 `8`。

可选地，可以定义自动扩缩容 profile，通过根据负载创建或终止进程来动态调控 TCP 工作进程数。更多细节参见 [auto_scaling_profile](#auto_scaling_profile)。

使用示例：
```opensips

    tcp_workers = 4
    tcp_workers = 3 use_auto_scaling_profile PROFILE_SIP

```

### tcp_accept_aliases {#tcp_accept_aliases}

若设为 `true`，OpenSIPS 在检测到 `;alias` Via 头域参数时会强制执行 RFC 5923 行为，并在向相同源 IP、Via 端口和协议三元组反向发送其他 SIP 请求时，复用为此类 SIP 请求打开的任何 TCP、TLS、WS 或 WSS 连接。RFC 5923 的目的是尽量减少 SIP 代理必须打开的 TLS 连接数，因为连接建立带来较大的 CPU 开销。

默认值为 `false`。

除 RFC 5923 的连接复用之外，OpenSIPS 中的 TCP 连接在多个 SIP 对话之间也是持久的。这可通过 [tcp_connection_lifetime](#tcp_connection_lifetime) 全局参数控制。

> [!WARNING]
> 为终端用户发起的连接（这类连接很可能归集在一个或多个公网 IP 之下）启用全局 `tcp_accept_aliases` 参数，会成为呼叫劫持的开放入口。在此类平台上，请使用 [force_tcp_alias()](./Script-CoreFunctions.md#force-tcp-alias-port-alias) 核心函数，仅在与相邻 SIP 代理之间采用 RFC 5923 行为。

使用示例：
```opensips

    tcp_accept_aliases = true

```

### tcp_connect_timeout {#tcp_connect_timeout}

中止正在进行的阻塞式连接尝试之前的毫秒数。

默认值为 `100` 毫秒。

使用示例：
```opensips

    tcp_connect_timeout = 100

```

### tcp_connection_lifetime {#tcp_connection_lifetime}

TCP 会话的生存期，以秒为单位。非活动时间超过 `tcp_connection_lifetime` 秒的 TCP 会话会被 **OpenSIPS** 关闭。把该值设为 `0` 会快速关闭 TCP 连接。也可以使用 registrar 模块的 `tcp_persistent_flag` 参数，把 TCP 生存期设为 REGISTER 的过期值。

默认值为 `120` 秒。

使用示例：
```opensips

    tcp_connection_lifetime = 3600

```

### tcp_max_connections {#tcp_max_connections}

允许的活跃 TCP 入向连接的最大数量，即由远端端点发起的连接。达到该限制后，新的入向 TCP 连接会被拒绝。目前对 OpenSIPS 发起的出向 TCP 连接没有限制。

默认值为 `2048`。

使用示例：
```opensips

    tcp_max_connections = 4096

```

### tcp_max_msg_time {#tcp_max_msg_time}

一条 SIP 消息通过 TCP 完整到达的预期最长秒数。若单个 SIP 包在该秒数之后仍未完整接收，连接会被断开。当连接过载且流量高度分片时，或遭遇故意分片流量以降低性能的攻击时，可能出现这种情况。

默认值为 `4` 秒。

使用示例：
```opensips

    tcp_max_msg_time = 8

```

### tcp_no_new_conn_bflag {#tcp_no_new_conn_bflag}

一个分支标志位，用于指示 OpenSIPS 在投递请求时不要打开新的 TCP 连接，而只复用现有连接（若有）。若没有可用的现有连接，则返回通用的发送错误。

这适用于 NAT 场景：向 NAT 后面的目的地打开 TCP 连接毫无意义，例如注册期间建立的 TCP 连接已丢失，且在设备重新注册之前无法联系到该设备。它也可用于检测被 NAT 的已注册用户何时丢失了 TCP 连接，从而让 OpenSIPS 把该注册置为不可用。

使用示例：
```opensips

    tcp_no_new_conn_bflag = TCP_NO_CONNECT
    ...
    route {
        ...
        if (isflagset("DST_NATED") && $socket_in(proto) == "TCP")
            setbflag("TCP_NO_CONNECT");
        ...
        t_relay("no-auto-477");
        $var(retcode) = $rc;
        if ($var(retcode) == -6) {
            # 发送错误
            xlog("unable to send request to destination");
            send_reply(404, "Not Found");
            exit;
        } else if ($var(retcode) < 0) {
            sl_reply_error();
            exit;
        }
    }

```

### tcp_no_new_conn_rplflag {#tcp_no_new_conn_rplflag}

一个消息标志位，类似于 [tcp_no_new_conn_bflag](#tcp_no_new_conn_bflag)，用于阻止 OpenSIPS 在回送当前请求的应答时打开新的 TCP 连接。若没有可用的现有连接，回送应答可能在传输层失败。

使用示例：
```opensips

    tcp_no_new_conn_rplflag = TCP_NO_RPL_CONNECT
    ...
    route {
        ...
        # 若检测到源端位于 NAT 之后，则阻止为应答打开 TCP 连接
        if (isflagset("SRC_NATED") && $socket_in(proto) == "TCP")
            setflag("TCP_NO_RPL_CONNECT");
        ...
        t_reply(302, "Redirected");
    }

```

### tcp_socket_backlog {#tcp_socket_backlog}

TCP 监听套接字的挂起连接队列可增长到的最大长度。若在队列已满时到达连接请求，客户端可能收到诸如 `ECONNREFUSED` 的错误；若底层协议支持重传，该请求可能被忽略，从而让后续的连接尝试能够成功。

默认值为 `10`。

使用示例：
```opensips

    tcp_socket_backlog = 20

```

### tcp_threshold {#tcp_threshold}

一个表示发送 TCP 请求预期耗时的最大微秒数的数字。任何超过设定值的发送都会向日志设施触发一条告警消息。

默认值为 `0`（日志关闭）。

使用示例：
```opensips

    tcp_threshold = 60000

```

### tcp_keepalive {#tcp_keepalive}

启用或禁用操作系统层面的 TCP 保活。

若操作系统支持 TCP 保活，默认值为 `true`，否则为 `false`。

使用示例：
```opensips

    tcp_keepalive = true

```

### tcp_keepcount {#tcp_keepcount}

关闭连接之前发送的保活探测次数。该选项在 Linux 及其他支持 `TCP_KEEPCNT` 的平台上可用。操作系统默认值通常可通过 `cat /proc/sys/net/ipv4/tcp_keepalive_probes` 查看；常见值为 `9`。

默认值依操作系统而定。

把 `tcp_keepcount` 设为任何值也会同时启用 [tcp_keepalive](#tcp_keepalive)。

使用示例：
```opensips

    tcp_keepcount = 5

```

### tcp_keepidle {#tcp_keepidle}

OpenSIPS 开始发送保活探测之前的空闲时间，以秒为单位。该选项在 Linux 及其他支持 `TCP_KEEPIDLE` 的平台上可用。操作系统默认值通常可通过 `cat /proc/sys/net/ipv4/tcp_keepalive_time` 查看；常见值为 `7200` 秒。

默认值依操作系统而定。

把 `tcp_keepidle` 设为任何值也会同时启用 [tcp_keepalive](#tcp_keepalive)。

使用示例：
```opensips

    tcp_keepidle = 30

```

### tcp_keepinterval {#tcp_keepinterval}

上一次探测失败后，各次保活探测之间的间隔，以秒为单位。该选项在 Linux 及其他支持 `TCP_KEEPINTVL` 的平台上可用。操作系统默认值通常可通过 `cat /proc/sys/net/ipv4/tcp_keepalive_intvl` 查看；常见值为 `75` 秒。

默认值依操作系统而定。

把 `tcp_keepinterval` 设为任何值也会同时启用 [tcp_keepalive](#tcp_keepalive)。

使用示例：
```opensips

    tcp_keepinterval = 10

```

### timer_workers {#timer_workers}

专为定时器相关任务创建的工作进程数。最小数量为 `1`。

默认值为 `1`。

可选地，可以定义自动扩缩容 profile，通过根据负载创建或终止进程来动态调控定时器工作进程数。更多细节参见 [auto_scaling_profile](#auto_scaling_profile)。

使用示例：
```opensips

    timer_workers = 3
    timer_workers = 3 use_auto_scaling_profile PROFILE_TIMER

```

### tos {#tos}

发送的 IP 包（TCP 和 UDP 均是）所使用的 TOS（Type Of Service）。默认值为 `IPTOS_LOWDELAY`。要禁用 TOS 设置，使用 `0`。

该全局值可被 [socket](#socket) 参数的按套接字 `tos` 选项覆盖。

使用示例：

```opensips
tos = IPTOS_LOWDELAY
tos = 0x10
```

### udp_workers {#udp_workers}

为每个 UDP 或 SCTP 接口创建的工作进程数。默认值为 `8`。

可选地，可以定义自动扩缩容 profile，通过根据负载创建或终止进程来动态调控 UDP 工作进程数。按接口的自动扩缩容 profile 会覆盖该全局 UDP 自动扩缩容 profile。
更多细节参见 [auto_scaling_profile](#auto_scaling_profile) 参数。

使用示例：

```opensips
udp_workers = 16
udp_workers = 4 use_auto_scaling_profile PROFILE_SIP
```

> [!NOTE]
> 该全局值适用于所有 UDP/SCTP 接口，但可在特定接口定义中设置不同的工作进程数来覆盖。这允许为每个接口定义不同的工作进程数；语法参见 [socket](#socket) 参数。

### user_agent_header {#user_agent_header}

**OpenSIPS** 以 UAC 身份发送请求时生成的 User-Agent 头域的主体内容。默认值为 `OpenSIPS (<version> (<arch>/<os>))`。

使用示例：

```opensips
user_agent_header = "User-Agent: My Company SIP Proxy"
```

请注意必须包含 `User-Agent:` 头域名，因为 **OpenSIPS** 不会自动添加。否则会得到形如下的错误头域：

```opensips
My Company SIP Proxy
```

### wdir {#wdir}

**OpenSIPS** 在运行时使用的工作目录。若未显式配置，**OpenSIPS** 会把工作目录切换到 `/`。

使用示例：

```opensips
wdir = "/usr/local/opensips"
wdir = /usr/opensips_wd
```

### xlog_buf_size {#xlog_buf_size}

用于通过所选 **OpenSIPS** 日志设施打印单行日志的缓冲区大小。若缓冲区过小，会打印溢出错误并跳过该行。默认值为 `4096` 字节。

使用示例：

```opensips
xlog_buf_size = 8388608 # 以字节为单位
```

### xlog_force_color {#xlog_force_color}

允许在 [xlog()](./Script-CoreFunctions.md#xlog-log-level-format-string) 中使用 [$C(xy)](Script-CoreVar.md#foreground-and-background-colors) 颜色转义序列。否则，颜色转义序列不起作用。默认值为 `false`。

使用示例：

```opensips
xlog_force_color = true
```

### xlog_level {#xlog_level}

与 [log_level](#log_level) 类似，该参数独立控制 [xlog()](./Script-CoreFunctions.md#xlog-log-level-format-string) 函数的详细程度。这允许分别控制代码生成的日志与 `xlog()` 生成的日志的详细级别。默认值为 `2` / `L_NOTICE`。

使用示例：

```opensips
xlog_level = 3 # L_DBG
```

### xlog_print_level {#xlog_print_level}

省略 `log_level` 参数时，[xlog()](./Script-CoreFunctions.md#xlog-log-level-format-string) 核心函数生成的日志的默认打印级别。默认值为 `2` / `L_NOTICE`。

使用示例：

```opensips
xlog_print_level = 2 # L_NOTICE
```

