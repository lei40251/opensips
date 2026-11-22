---
outline: [2, 3]
title: "核心 MI 函数"
description: "由 OpenSIPS 核心导出的 MI（管理接口）函数。"
---

由 **OpenSIPS** 核心导出的 MI（管理接口）函数。

## 核心

### arg
返回启动 **OpenSIPS** 时使用的全部参数列表。与 UNIX 中一样，第一个参数是可执行二进制文件的名称。

**参数**：无

**输出**：一个包含多个字符串的数组，各字符串表示一个参数。

用法示例：
```bash

    $ opensips-cli -x mi arg
    [
        "./opensips",
        "-f",
        "/etc/openser/test.cfg"
    ]

```

### help
打印 MI 命令的用法信息。当提供 *mi_cmd* 时，响应中会包含该命令的描述以及导出该命令的模块。

**参数**：
* *mi_cmd*（可选） - MI 命令名

用法示例：
```bash

    $ opensips-cli -x mi help
    $ opensips-cli -x mi help version

```

### kill
该命令将终止 **OpenSIPS**（并执行内部关闭流程）。

**参数**：无

**输出**：无

用法示例：
```bash

    $ opensips-cli -x mi kill

```

### log_level  [level] [pid]
获取或设置某一个或所有 OpenSIPS 进程的日志级别。如果未向 **log_level** 命令传递参数，它会打印一张包含所有进程当前日志级别的表。如果给出日志 **level**，则会为每个进程设置该级别。如果同时还给出 **pid**，则只改变该进程的日志级别。

**参数**：
* *level*（可选） - 日志级别（-3...4）（参见[各取值的含义](Script-CoreParameters.md#log_level)）
* *pid*（可选） - Unix pid（由 OpenSIPS 校验）

用法示例：
```bash

    $ opensips-cli -x mi log_level
    {
        "Processes": [
            {
                "PID": 10670,
                "Log level": 2,
                "Type": "attendant"
            },
            {
                "PID": 10672,
                "Log level": 3,
                "Type": "MI FIFO"
            },
            {
                "PID": 10673,
                "Log level": 1,
                "Type": "SIP receiver udp:193.668.3.633:5060"
            },
        ]
    }
    $ opensipsctl fifo log_level 1
    {
        "New global log level": 1
    }
    $ opensipsctl fifo log_level 4 10670
    {
        "Log level": 1
    }

```

### log_level_filter  consumer [level_filter]
获取或设置针对特定日志「消费者」（*stderror*、*syslog* 或 *event*）的日志消息额外过滤级别。如果未给出 **log_level_filter**，该命令会打印指定消费者当前的级别过滤器。

**参数**：
* *consumer*（可选） - 日志消费者：*stderror*、*syslog* 或 *event*；
* *log_level_filter*（可选） - 日志级别过滤器。

用法示例：
```bash

    $ opensips-cli -x mi log_level_filter stderror
    {
        "Log level filter": 3
    }
    $ opensips-cli -x mi log_level_filter stderror 1
    "OK"

```

### log_mute_state  consumer [mute_state]
获取或设置特定日志「消费者」（*stderror*、*syslog* 或 *event*）的静默状态（是否启用打印）。如果未给出 **mute_state**，该命令会打印指定消费者当前的静默状态。

**参数**：
* *consumer*（可选） - 日志消费者：*stderror*、*syslog* 或 *event*；
* *mute_state*（可选） - 新的静默状态：*1* - 静默，或 *0* - 非静默（已启用）

用法示例：
```bash

    $ opensips-cli -x mi log_mute_state syslog
    {
        "mmute state": 0
    }
    $ opensips-cli -x mi log_mute_state syslog 1
    "OK"

```

### ps
该命令会列出所有 **OpenSIPS** 进程及其类型和描述。

**参数**：无

**输出**：多个对象，每个对象包含一个进程 ID（内部）、PID（操作系统）以及 Type。

用法示例：
```bash

    $ opensips-cli -x mi ps
    {
        "Processes": [
            {
                "ID": 0,
                "PID": 27271,
                "Type": "attendant"
            },
            {
                "ID": 1,
                "PID": 27272,
                "Type": "MI FIFO"
            },
            {
                "ID": 2,
                "PID": 27273,
                "Type": "time_keeper"
            },
            {
                "ID": 3,
                "PID": 27274,
                "Type": "timer"
            },
            {
                "ID": 4,
                "PID": 27275,
                "Type": "SIP receiver udp:127.0.0.1:5060"
            },
            {
                "ID": 5,
                "PID": 27276,
                "Type": "Timer handler"
            }
        ]
    }

```

### pwd
打印 **OpenSIPS** 实例的工作目录。

**参数**：无

**输出**：单个条目，包含工作目录的完整路径。

用法示例：
```bash

    $ opensips-cli -x mi pwd
    {
        "WD": "/"
    }

```

### reload_routes
在运行期间触发从脚本重新加载路由块（各路由）。
**参数**：无

**输出**：无

请注意，重新加载能否成功存在一些限制。取决于模块的初始配置，如果新脚本中对函数的使用与原始的模块设置和初始化不兼容，重新加载可能会被拒绝。

如果重新加载失败，请查看日志以了解原因 —— 可能是语法错误，也可能是与模块相关的约束。无论如何，即使重新加载失败，也不会影响正在运行的 OpenSIPS。

### uptime
打印关于 **OpenSIPS** 的各种时间信息 —— 何时开始运行、已运行多久。

**参数**：无

**输出**：三个条目："Now" - 当前时间；"Up since" - 启动时间；"Up time" - 自启动以来的秒数。

用法示例：
```bash

    $ opensips-cli -x mi uptime
    {
        "Now": "Mon Jul 21 17:41:03 2008",
        "Up since": "Mon Jul 21 17:36:33 2008",
        "Up time": "270 [sec]"
    }

```

### version
打印正在运行的 **OpenSIPS** 的版本字符串。

**参数**：
* *revision*（可选） - 附加版本控制修订号

**输出**：一个条目（名为 "Server"），包含版本字符串。如果提供了 *revision*，输出中还会包含版本控制修订号。

用法示例：
```bash

    $ opensips-cli -x mi version
    {
        "Server": "OpenSIPS (3.6.0-dev (x86_64/linux))"
    }
    $ opensips-mi version revision
    {
        "Server": "OpenSIPS (4.1.0-dev (x86_64/linux))",
        "git": "88ab7f2"
    }

```

### which
打印所查询的 **OpenSIPS** 实例上所有可用的 MI 命令。

**参数**：无

**输出**：一个由可用 MI 命令名称组成的数组。注意，可用的 MI 命令列表可能因 **OpenSIPS** 所使用的模块不同而不同。

用法示例：
```bash

    $ opensips-cli -x mi which
    [
        "get_statistics",
        "list_statistics",
        "reset_statistics",
        "uptime",
        "version",
        "pwd",
        "arg",
        "which",
        "ps",
        "kill",
        "log_level",
        "xlog_level",
        "shm_check",
        "cache_store",
        "cache_fetch",
        "cache_remove",
        "event_subscribe",
        "events_list",
    ...

```

### xlog_level [level]
获取或设置 OpenSIPS 进程中的全局 xlogging 级别。如果未向 **xlog_level** 命令传递参数，它会打印当前的 **xlog_level**。如果给出日志 **level**，则会为所有 OpenSIPS 进程全局设置该级别。

**参数**：
* *level*（可选）

用法示例：
```bash

    $ opensips-cli -x mi xlog_level -2

```

## 黑名单

### list_blacklists
该命令列出 **OpenSIPS** 中所有已定义（静态或动态学习而来）的黑名单。

**参数**：
* *name*（可选） - 只过滤并打印特定黑名单中的规则
**输出**：一个数组，每个对象描述一个列表（name、owner、flags）；"Rules" 条目是一个数组，其中每个对象成员描述各列表的规则（黑名单）（IP/mask、协议、端口、匹配正则表达式、flags）。

用法示例：
```bash

    $ opensips-cli -x mi list_blacklists

```

### check_blacklists
该命令返回所有匹配 proto:IP:port+pattern 的黑名单。

**参数**：
* *proto*（可选） - 检查规则的协议 —— 若缺失，则使用 "any" 协议。注意，"any" 协议的检查只能匹配 "any" 协议的规则。
* *ip* - 用于匹配规则的必填 IP
* *port*（可选） - 检查规则的端口 —— 若缺失，则使用 0/any 端口。注意，0 端口只能匹配 0 端口的规则。
* *pattern*（可选） - 用于与规则比对的可选模式
**输出**：一个数组，包含所有匹配的黑名单名称。

用法示例：
```bash

    $ opensips-cli -x mi check_blacklists 127.0.0.1
    $ opensips-cli -x mi check_blacklists udp 127.0.0.1 5060

```

### check_blacklist
该命令检查 proto:IP:port+pattern 是否匹配某个黑名单中的任一规则。

**参数**：
* *name* = 要检查的黑名单名称
* *proto*（可选） - 检查规则的协议 —— 若缺失，则使用 "any" 协议。注意，"any" 协议的检查只能匹配 "any" 协议的规则。
* *ip* - 用于匹配规则的必填 IP
* *port*（可选） - 检查规则的端口 —— 若缺失，则使用 0/any 端口。注意，0 端口只能匹配 0 端口的规则。
* *pattern*（可选） - 用于与规则比对的可选模式
**输出**：一个包含首个匹配规则的对象；若无任何匹配则返回错误。

用法示例：
```bash

    $ opensips-cli -x mi check_blacklist net_dynamic 127.0.0.1
    $ opensips-cli -x mi check_blacklists net_dynamic udp 127.0.0.1 5060

```

### add_blacklist_rule
向非只读黑名单添加一条规则。

**参数**：
* *name* - 要添加到的黑名单名称
* *rule* - 一个包含黑名单规则的字符串，格式参见 [**dst_blacklist**](./Script-CoreParameters.md#dst_blacklist) 参数
* *expire*（可选） - 表示该规则多少秒后过期
**输出**：成功或失败对象。

用法示例：
```bash

    $ opensips-cli -x mi add_blacklist_rule net_dynamic '!tcp,127.0.0.1,5060'
    $ opensips-cli -x mi add_blacklist_rule net_dynamic '!tcp,127.0.0.1,5060' 3600

```

### del_blacklist_rule
从非只读黑名单中移除一条规则。

**参数**：
* *name* - 要从中移除规则的黑名单名称
* *rule* - 一个包含黑名单规则的字符串，格式参见 [**dst_blacklist**](./Script-CoreParameters.md#dst_blacklist) 参数
**输出**：成功或失败对象。

用法示例：
```bash

    $ opensips-cli -x mi del_blacklist_rule net_dynamic '!tcp,127.0.0.1,5060'

```

## TCP 连接

### list_tcp_conns
该命令列出 **OpenSIPS** 中所有正在进行的 TCP/TLS 连接。

**参数**：无

**输出**：一个数组，每条连接一个对象，包含以下属性：ID、type、state、source、destination、lifetime、alias port。

用法示例：
```bash

    $ opensips-cli -x mi list_tcp_conns

```

## 状态报告

### sr_get_status
相当于 [sr_check_status() 脚本函数](./Script-CoreFunctions.md#sr-check-status-group-identifier) 的 MI 命令 —— 用于获取某个 'status/report' 标识符／分组的状态。

**参数**：必填的 *group* 与可选的 *identifier*，参见 [sr_check_status() 脚本函数](./Script-CoreFunctions.md#sr-check-status-group-identifier) 的参数。
**输出**：该标识符／分组的就绪状态、状态与详细信息（关于返回码的聚合说明参见 [sr_check_status() 脚本函数](./Script-CoreFunctions.md#sr-check-status-group-identifier)）

用法示例：
```bash

$ opensips-cli -x mi sr_get_status core
{
    "Readiness": true,
    "Status": 1,
    "Details": "running"
}

$ opensips-cli -x mi sr_get_status drouting all
{
    "Readiness": true,
    "Status": 1,
    "Details": "aggregated"
}

```

### sr_list_status
用于列出某一个或所有 'status/report' 分组中各标识符状态的命令。

**参数**：可选的 'status/report' *group*，更多细节参见 [sr_check_status() 脚本函数](./Script-CoreFunctions.md#sr-check-status-group-identifier)。
**输出**：所请求分组内所有标识符的就绪状态、状态与详细信息，或所有已定义／已注册分组内标识符的相应信息。

用法示例：
```bash

$ opensips-cli -x mi sr_list_status
[
    {
        "Name": "drouting",
        "Identifiers": [
            {
                "Name": "Default",
                "Readiness": true,
                "Status": 1,
                "Details": "data available"
            }
        ]
    },
    {
        "Name": "test",
        "Identifiers": [
            {
                "Name": "main",
                "Readiness": true,
                "Status": 1
            }
        ]
    },
    {
        "Name": "core",
        "Identifiers": [
            {
                "Name": "main",
                "Readiness": true,
                "Status": 1,
                "Details": "running"
            }
        ]
    }
]

```

### sr_list_reports
用于列出由 'status/report' 标识符收集的全部报告（日志）集合的命令。

**参数**：
* 可选的 'status/report' *group*，更多细节参见 [sr_check_status() 脚本函数](./Script-CoreFunctions.md#sr-check-status-group-identifier)。若缺失，则列出所有分组。
* 可选的 'identifier'。若缺失，则列出该分组内的所有标识符。
**输出**：所请求标识符的报告／日志，或各分组内所有标识符的报告／日志。

用法示例：
```bash

$ bin/opensips-cli -x mi sr_list_reports
[
    {
        "Name": "drouting",
        "Identifiers": [
            {
                "Name": "Default",
                "Reports": [
                    {
                        "Timestamp": 1644396830,
                        "Date": "Wed Feb  9 10:53:50 2022",
                        "Log": "starting DB data loading"
                    },
                    {
                        "Timestamp": 1644396830,
                        "Date": "Wed Feb  9 10:53:50 2022",
                        "Log": "DB data loading successfully completed"
                    },
                    {
                        "Timestamp": 1644396830,
                        "Date": "Wed Feb  9 10:53:50 2022",
                        "Log": "2 gateways loaded (0 discarded), 2 carriers loaded (0 discarded), 1 rules loaded (0 discarded)"
                    }
                ]
            }
        ]
    },
    {
        "Name": "test",
        "Identifiers": [
            {
                "Name": "main",
                "Reports": []
            }
        ]
    },
    {
        "Name": "core",
        "Identifiers": [
            {
                "Name": "main",
                "Reports": [
                    {
                        "Timestamp": 1644396830,
                        "Date": "Wed Feb  9 10:53:50 2022",
                        "Log": "initializing"
                    },
                    {
                        "Timestamp": 1644396830,
                        "Date": "Wed Feb  9 10:53:50 2022",
                        "Log": "initialization completed, ready now"
                    }
                ]
            }
        ]
    }
]

```

### sr_list_identifiers
用于列出 OpenSIPS 中所有现有标识符，或仅列出某个特定分组中的标识符的命令。

**参数**：
* 可选的 'status/report' *group*，更多细节参见 [sr_check_status() 脚本函数](./Script-CoreFunctions.md#sr-check-status-group-identifier)。若缺失，则列出所有分组中的标识符。
**输出**：一个由分组组成的数组，每个分组是一个标识符数组。

用法示例：
```bash

$ opensips-cli -x mi sr_list_identifiers
[
    {
        "Group": "clusterer",
        "Identifiers": [
            "sharing_tags"
        ]
    },
    {
        "Group": "dispatcher",
        "Identifiers": [
            "default;events",
            "default"
        ]
    },
    {
        "Group": "drouting",
        "Identifiers": [
            "Default;events",
            "Default"
        ]
    },
    {
        "Group": "dialplan",
        "Identifiers": [
            "default"
        ]
    },
    {
        "Group": "core",
        "Identifiers": [
            "main"
        ]
    }
]

$ opensips-cli -x mi sr_list_identifiers drouting
{
    "Group": "drouting",
    "Identifiers": [
        "Default;events",
        "Default"
    ]
}

```

## 统计

### get_statistics
打印统计（全部、按分组或单个）的实时值。

**参数**：
* *statistics* - 一个数组，可包含以下取值：
  * "all" - 打印所有可用统计；
  * "group_name:" - 只打印名为 "group_name" 的某个分组的统计；**OpenSIPS** 核心定义了以下分组：*core*、*shmem*；各模块导出的分组通常与其模块名相同。
  * "name" - 只打印名为 "name" 的统计项。
**输出**：一个对象，包含各统计变量的名称与值。

用法示例：
```bash

    $ opensips-cli -x mi get_statistics rcv_requests
    {
        "core:rcv_requests": 35243
    }

    $ opensipsc-cli -x mi get_statistics shmem:
    {
        "shmem:total_size": 1073741824,
        "shmem:max_used_size": 3389232,
        "shmem:free_size": 1070352592,
        "shmem:used_size": 2808952,
        "shmem:real_used_size": 3389232,
        "shmem:fragments": 3769
    }

    $ opensips-cli -x mi get_statistics shmem: core:
    ....

```

### list_statistics
打印当前 OpenSIPS 配置下可用统计的列表。
**参数**：
* *statistics*（可选） - 一个数组，取值与 **get_statistics** MI 命令相同，但不包括 "all"。省略该参数将列出所有可用统计。

用法示例：
```bash

    $ opensips-cli -x mi list_statistics
    {
        "shmem:total_size": "non-incremental",
        "shmem:max_used_size": "non-incremental",
        "shmem:free_size": "non-incremental",
        "shmem:used_size": "non-incremental",
        "shmem:real_used_size": "non-incremental",
        "shmem:fragments": "non-incremental",
        "rpmem:rpm_total_size": "non-incremental",
        "rpmem:rpm_used_size": "non-incremental",
    ...

```

### reset_statistics
将某个统计变量的值重置（为零）。注意，并非所有变量都允许重置（取决于其所承载信息的性质 —— 例如 "shmem:used_size"）。

**参数**：
* *statistics* - 一个数组，包含待重置变量的名称。
**输出**：无。

用法示例：
```bash

    $ opensips-cli -x mi get_statistics received_replies
    {
        "tm:received_replies": 14543
    }

    $ opensips-cli -x mi reset_statistics received_replies
    $ opensips-cli -x mi get_statistics received_replies
    {
        "tm:received_replies": 0
    }

```

### reset_all_statistics
将所有可重置的统计变量的值重置（为零）。注意，并非所有变量都允许重置（取决于其所承载信息的性质 —— 例如 "shmem:used_size"）。

**输出**：无。

用法示例：
```bash

    $ opensips-cli -x mi reset_all_statistics

```

## CacheDB 接口

### cache_store
该命令将一个字符串值存入缓存系统。

**参数**：
* *system* - 要使用的缓存系统 —— 对于由 **OpenSIPS** 模块 'localcache' 实现的缓存系统，该参数的值应为 'local'；
* *attr* - 与该值关联的标签；
* *value* - 要存储的字符串；
* *expire*（可选） - 所存储值的过期时间；
**输出**：无。

用法示例：
```bash

    $ opensips-cli -x mi cache_store local password_user1 password

```

### cache_fetch
该命令查询已存储的值。

**参数**：
* *system* - 要使用的缓存系统 —— 对于由 **OpenSIPS** 模块 'localcache' 实现的缓存系统，该参数的值应为 'local'
* *attr* - 与该值关联的标签
**输出**：若找到记录，则返回包含该值的对象；否则返回字符串 'Value not found'。

用法示例：
```bash

    $ opensips-cli -x mi cache_fetch local password_user1

```

### cache_remove
该命令从缓存系统中移除一条记录。

**参数**：
* *system* - 要使用的缓存系统；
* *attr* - 与所存储值关联的标签；
**输出**：无。

用法示例：
```bash

    $ opensips-cli -x mi cache_remove local password_user1

```

## 事件接口

### event_subscribe
将外部应用订阅到某个事件。

**参数**：
* *event* - 事件名
* *socket* - 外部应用的套接字
* *expire*（可选） - 过期时间，以秒为单位 —— 若缺失，则订阅仅在一小时（3600 s）内有效
**输出**：无。

用法示例：
```bash

    $ opensips-cli -x mi event_subscribe E_PIKE_BLOCKED udp:127.0.0.1:8888 1200

```

### events_list
列出通过事件接口发布的所有事件。

**参数**：无。

**输出**：无。

用法示例：
```bash

    $ opensips-cli -x mi events_list
    {
        "Events": [
            {
                "name": "E_CORE_THRESHOLD",
                "id": 0
            },
            {
                "name": "E_CORE_SHM_THRESHOLD",
                "id": 1
            },
            {
                "name": "E_CORE_PKG_THRESHOLD",
                "id": 2
            },
    ...

```

### raise_event
通过 MI 命令经事件接口触发一个事件。

**参数**：
* *event* - 事件名
* *params*（可选） - 元素数组，或一个由包含键值对的 JSON 对象构成的字符串
**输出**：无。

用法示例：
```bash

    $ opensips-cli -x mi raise_event E_PIKE_BLOCKED 127.0.0.1 # array mode
    $ opensips-cli -x -- mi -j raise_event event=E_PIKE_BLOCKED params='{"ip":"127.0.0.1"}' # json mode

```

### subscribers_list
列出订阅者的信息

**参数**：
* *event* - 事件名
* *socket*（可选） - 外部应用的套接字
**输出**：如果未指定参数，则该命令返回所有事件及其订阅者的信息。如果指定了事件，则只返回订阅该事件的外部应用。如果还指定了套接字，则只返回一个订阅者的信息。

用法示例：
```bash

    $ opensips-cli -x mi subscribers_list
    {
        "Events": [
            {
                "name": "E_RTPPROXY_STATUS",
                "id": 1,
                "subscribers": [
                    ...
                ]
            },
            {
                "name": "E_PIKE_BLOCKED",
                "id": 2,
                "subscribers": [
                    ...
                ]
            }
        ]
    }

    $ opensips-cli -x mi subscribers_list E_RTPPROXY_STATUS
    {
        "Event": {
            "name": "E_RTPPROXY_STATUS",
            "id": 1,
            "subscribers": [
                {
                    "socket": "unix:/tmp/event.sock",
                    "expire": "never",
                },
                {
                    "socket": "udp:127.0.0.1:8888",
                    "expire": 1100,
                    "ttl": 1046
                }
            ]
        }
    }

    $ opensips-cli -x mi subscribers_list E_RTPPROXY_STATUS unix:/tmp/event.sock
    {
        "Event": {
            "name": "E_RTPPROXY_STATUS",
            "id": 1,
            "Subscriber": {
                "socket": "unix:/tmp/event.sock",
                "expire": "never"
            }
        }
    }

```

## 内存

### mem_pkg_dump
为指定进程触发 pkg 内存转储。内存转储会使用 `memdump` 日志级别写入 OpenSIPS 的日志（syslog 或 stderr）。全局的 `memdump` 日志级别可被本命令参数中提供的自定义值覆盖。

**参数**：
* *pid* - 执行 pkg 转储的进程的 PID
* *log_level*（可选） - 用于本次转储的日志级别
**输出**：无。

用法示例：
```bash

    $ opensips-cli -x mi mem_pkg_dump 11854 -1

```

> [!IMPORTANT]
> 不支持 IPC 的进程（如 timer 进程和按模块划分的进程）将无法生成内存转储。

### mem_rpm_dump
触发重启后仍保留的内存转储。内存转储会使用 `memdump` 日志级别写入 OpenSIPS 的日志（syslog 或 stderr）。全局的 `memdump` 级别可被可选参数覆盖。

**参数**：
* *log_level*（可选） - 用于本次转储的日志级别

用法示例：
```bash

    $ opensips-cli -x mi mem_rpm_dump
    $ opensips-cli -x mi mem_rpm_dump -1

```

### mem_shm_dump
触发 shm 内存转储。内存转储会使用 `memdump` 日志级别写入 OpenSIPS 的日志（syslog 或 stderr）。全局的 `memdump` 日志级别可被本命令参数中提供的自定义值覆盖。

**参数**：
* *log_level*（可选） - 用于本次转储的日志级别
**输出**：无。

用法示例：
```bash

    $ opensips-cli -x mi mem_shm_dump -1

```

### shm_check
仅在 *QM_MALLOC* + *DBG_MALLOC* 下可用。完全扫描共享内存池，以定位任何不一致之处。如果检测到任何内存损坏的迹象，OpenSIPS 会立即中止。

**参数**：无

**输出**：当前碎片数量。

用法示例：
```bash

    $ opensips-cli -x mi shm_check

```
