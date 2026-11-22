---
title: "snmpstats 模块"
description: "SNMPStats 模块为 OpenSIPS 提供 SNMP 管理接口。"
---


## 管理指南 {#admin-guide}


### 概述 {#overview}


SNMPStats 模块（Simple Network Management Protocol Statistic Module）为 OpenSIPS 提供 SNMP 管理接口。具体而言，它提供通用的、可经 SNMP 查询的标量统计，提供较复杂数据（例如用户与联系人信息）的表表示，以及告警监控能力。


#### 通用标量统计 {#general-scalar-statistics}


SNMPStats 模块提供若干通用标量
统计。详细信息见 OPENSER-MIB、OPENSER-REG-MIB、
OPENSER-SIP-COMMON-MIB 和 OPENSER-SIP-SERVER-MIB。简而言之，
这些标量包括：


openserSIPProtocolVersion, openserSIPServiceStartTime,
openserSIPEntityType,
openserSIPSummaryInRequests, openserSIPSummaryOutRequest,
openserSIPSummaryInResponses, openserSIPSummaryOutResponses,
openserSIPSummaryTotalTransactions, openserSIPCurrentTransactions,
openserSIPNumUnsupportedUris, openserSIPNumUnsupportedMethods,
openserSIPOtherwiseDiscardedMsgs, openserSIPProxyStatefulness
openserSIPProxyRecordRoute, openserSIPProxyAuthMethod,
openserSIPNumProxyRequireFailures,
openserSIPRegMaxContactExpiryDuration,
openserSIPRegMaxUsers, openserSIPRegCurrentUsers,
openserSIPRegDfltRegActiveInterval,
openserSIPRegAcceptedRegistrations,
openserSIPRegRejectedRegistrations, openserMsgQueueDepth.
openserCurNumDialogs, openserCurNumDialogsInProgress,
openserCurNumDialogsInSetup, openserTotalNumFailedDialogSetups


还有一些与告警相关的标量，如下所示：


openserMsgQueueMinorThreshold, openserMsgQueueMajorThreshold,
openserMsgQueueDepthAlarmStatus, openserMsgQueueDepthMinorAlarm,
openserMsgQueueDepthMajorAlarm, openserDialogLimitMinorThreshold,
openserDialogLimitMajorThreshold, openserDialogUsageState,
openserDialogLimitAlarmStatus, openserDialogLimitMinorAlarm,
openserDialogLimitMajorAlarm


#### SNMP 表 {#snmp-tables}


SNMPStats 模块提供若干个表，其中包含较复杂的数据。当前可用的表包括：


openserSIPPortTable, openserSIPMethodSupportedTable,
openserSIPStatusCodesTable, openserSIPRegUserTable,
openserSIPContactTable, openserSIPRegUserLookupTable


#### 告警监控 {#alarm-monitoring}


若启用，SNMPStats 模块将监控告警条件。
目前定义了两种告警类型。


1. 活跃对话数量已超过次要或重要
阈值。其思路是让网络运营中心能够
意识到其 SIP 服务器可能过载，
而无需显式检查该条件。
若出现次要或重要条件，则分别
生成 openserDialogLimitMinorEvent trap
或 openserDialogLimitMajorEvent trap。
次要阈值与重要阈值在
下文参数一节中说明。
2. 所有 OpenSIPS 监听端口上待消费的
字节数已超过次要或重要
阈值。其思路是让网络运营中心
能够意识到承载 SIP 服务器的机器可能
正在进入降级状态，并调查其原因。
若待消费的字节数超过次要或重要
阈值，则分别发出
openserMsgQueueDepthMinorEvent 或
openserMsgQueueDepthMajorEvent trap。


这些 trap 的完整细节见发行版中的
OPENSER-MIB 文件。


### 工作原理 {#how-it-works}


#### SNMPStats 模块如何获取数据 {#how-the-snmpstats-module-gets-its-data}


SNMPStats 模块使用 OpenSIPS 内部的统计框架
采集其大部分数据。不过，有两处例外。


1. openserSIPRegUserTable 与 openserSIPContactTable 依赖
usrloc 模块的回调系统。具体而言，每当有用户/联系人
添加到系统时，SNMPStats 模块都会收到
回调。
2. SNMPStats 模块的 openserSIPMsgQueueDepthMinorEvent 与
openserSIPMsgQueueDepthMajorEvent 告警依赖 OpenSIPS
核心来确定 OpenSIPS 正在监听哪些接口、端口和
传输层。不过，该模块实际上会查询 proc
文件系统以获取待消费的字节数。
（目前这仅在提供 proc 文件
系统的系统上有效）。


#### 数据如何从 SNMPStats 模块传输到 NOC {#how-data-is-moved-from-the-snmpstats-module-to-a-noc}


至此已说明 SNMPStats 模块如何采集数据。但
尚未说明它如何将这些数据导出给 NOC（网络运营
中心）或管理员。


SNMPStats 模块期望连接到一个
*主代理（Master Agent）*。该代理是运行在
与 OpenSIPS 实例相同的系统上、或另一系统上的 SNMP 守护进程。
（通信可通过 TCP 进行，因此并不限制
该守护进程必须与 OpenSIPS 位于同一系统）。


若 OpenSIPS 首次启动时主代理不可用，
SNMPStats 模块仍会继续运行。但将无法
查询它。所幸 SNMPStats 模块会持续寻找其
主代理。因此，即使主代理启动较晚，
或由于临时硬件故障、或主代理崩溃并重启
导致与 SNMPStats 模块的连接中断，
连接最终也会重新建立。数据不应丢失，
查询可以重新开始。


要请求这些数据，需要查询主代理。主代理
随后会将请求重定向到 SNMPStats 模块，该模块
向主代理作出应答，主代理再对你的请求
作出应答。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


SNMPStats 模块提供大量统计项，其中一些
由其他模块采集。若依赖的模块未加载，
这些特定统计项仍会返回，但
值为零。其他所有统计项继续正常
工作。这意味着 SNMPStats 模块对其他模块
没有*硬性/强制*依赖。
但存在*软*依赖，如下所示：


- *usrloc* - 与用户和联系人相关的所有标量和表
都依赖 usrloc 模块。若该模块未加载，
相应的表将为空。
- *dialog* - 与对话数量相关的所有标量
都依赖 dialog 模块的存在。
此外，若该模块未加载，
openserDialogLimitMinorEvent 与 openserDialogLimitMajorEvent
告警将被禁用。


openserSIPMethodSupportedTable 的内容会随
已加载的模块而变化。


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，必须安装
以下库或应用程序：


- *Net SNMP DEV（debian 上的 libsnmp-dev）* - SNMP
库（开发文件）必须在编译时
安装。此外，在加载 SNMPStats 时必须有若干
共享对象可加载。这意味着加载了 SNMPStats
模块的系统上必须安装 SNMP 库（但不一定
需要运行）。（细节见下文编译一节）。
- *SNMP tools（debian 上的 snmp）* - SNMP
工具包，用于提供 snmpget 命令（由
SNMPStats 模块内部使用）。


### 导出的参数 {#exported-parameters}


#### sipEntityType (String) {#sipentitytype-string}


该参数描述此 OpenSIPS 实例的实体类型，
用于决定 openserSIPEntityType 标量返回的
内容。有效取值包括：


*registrarServer, redirectServer, proxyServer, userAgent, other*


```opensips title="Setting the sipEntityType parameter"
...
modparam("snmpstats", "sipEntityType", "registrarServer")
modparam("snmpstats", "sipEntityType", "proxyServer")
...
		
```


> [!NOTE]
> 如上例所示，该参数可以定义
> 多次。这当然是因为一个给定的 OpenSIPS 实例
> 可以承担多个角色。


#### MsgQueueMinorThreshold (Integer) {#msgqueueminorthreshold-integer}


SNMPStats 模块监控 OpenSIPS 待消费的字节数。
若待消费的字节数超过次要阈值，
SNMPStats 模块将发出
openserMsgQueueDepthMinorEvent trap，以表示
已出现告警条件。次要阈值通过
MsgQueueMinorThreshold 参数设置。


```opensips title="Setting the MsgQueueMinorThreshold parameter"
...
modparam("snmpstats", "MsgQueueMinorThreshold", 2000)
...
		
```


若未设置该参数，则不会进行
次要告警监控。


#### MsgQueueMajorThreshold (Integer) {#msgqueuemajorthreshold-integer}


SNMPStats 模块监控 OpenSIPS 待消费的字节数。
若待消费的字节数超过重要阈值，
SNMPStats 模块将发出
openserMsgQueueDepthMajorEvent trap，以表示
已出现告警条件。重要阈值通过
MsgQueueMajorThreshold 参数设置。


```opensips title="Setting the MsgQueueMajorThreshold parameter"
...
modparam("snmpstats", "MsgQueueMajorThreshold", 5000)
...
		
```


若未设置该参数，则不会进行
重要告警监控。


#### dlg_minor_threshold (Integer) {#dlg_minor_threshold-integer}


SNMPStats 模块监控活跃对话数量。若
活跃对话数量超过次要阈值，SNMPStats
模块将发出 openserDialogLimitMinorEvent trap，以表示
已出现告警条件。次要阈值通过
dlg_minor_threshold 参数设置。


```opensips title="Setting the dlg_minor_threshold parameter"
...
  modparam("snmpstats", "dlg_minor_threshold", 500)
...
		
```


若未设置该参数，则不会进行
次要告警监控。


#### dlg_major_threshold (Integer) {#dlg_major_threshold-integer}


SNMPStats 模块监控活跃对话数量。若
活跃对话数量超过重要阈值，SNMPStats
模块将发出 openserDialogLimitMajorEvent trap，以表示
已出现告警条件。重要阈值通过
dlg_major_threshold 参数设置。


```opensips title="Setting the dlg_major_threshold parameter"
...
  modparam("snmpstats", "dlg_major_threshold", 750)
...
		
```


若未设置该参数，则不会进行
重要告警监控。


#### snmpgetPath (String) {#snmpgetpath-string}


SNMPStats 模块提供 openserSIPServiceStartTime 标量。
该标量要求 SNMPStats 模块向主代理执行
snmpget 查询。可使用该参数设置
SNMP 的 snmpget 程序实例所在路径。


*默认值为 "/usr/local/bin/"。*


```opensips title="Setting the snmpgetPath parameter"
...
modparam("snmpstats", "snmpgetPath",     "/my/custom/path/")
...
		
```


#### snmpCommunity (String) {#snmpcommunity-string}


SNMPStats 模块提供 openserSIPServiceStartTime 标量。
该标量要求 SNMPStats 模块向主代理执行
snmpget 查询。若为 snmp 守护进程定义了
自定义 community 字符串，需要通过该参数指定它。


*默认值为 "public"。*


```opensips title="Setting the snmpCommunity parameter"
...
modparam("snmpstats", "snmpCommunity", "customCommunityString")
...
		
```


### 导出的函数 {#exported-functions}


目前没有导出的函数。


### 安装与运行 {#installation-and-running}


需要完成若干事项，才能编译 SNMPStats 模块
并使其正常运行。


#### 编译 SNMPStats 模块 {#compiling-the-snmpstats-module}


要编译 SNMPStats 模块，需要已安装
提供 SNMP（Simple Network Management
Protocol）库和开发文件的软件包。


SNMPStats 模块的 makefile 要求 SNMP 脚本
"net-snmp-config" 能够运行。


> [!IMPORTANT]
> 默认情况下，SNMP 从
> */var/lib/mibs/ietf/* 加载 *mibs*。请注意，
> 必须将 OpenSIPS 的 *mibs* 复制到你的 mibs 文件夹
> 所在位置。


#### 配置 SNMP 守护进程以允许来自 SNMPStats 模块的连接 {#configuring-snmp-daemon-to-allow-connections-from-the-snmpstats-module}


SNMPStats 模块将与 SNMP 主代理通信。该
通信通过名为 AgentX 的协议进行。这意味着
需要有一个 SNMP 守护进程（充当主代理）在运行——
它可以在同一台机器上，也可以在另一台机器上。


首先需要开启 AgentX 支持。配置文件
（snmpd.conf）的确切位置可能因系统而异。
通过软件包安装时，默认位于：


```bash
/etc/snmp/snmpd.conf
```


在该文件的最末尾添加以下行：


```c
master agentx
```


该行告知 SNMP 守护进程充当 AgentX 主代理，以便
能够接受来自 SNMPStats 模块等子代理的连接。


还有最后一步。尽管已配置
SNMP 支持 AgentX，仍需告知守护进程
监听哪个接口和端口以接受 AgentX 连接。这同样
通过配置文件（snmpd.conf）完成：


```c
agentXSocket    tcp:localhost:705
```


这告知 SNMP 守护进程充当主代理，
监听 localhost 的 UDP 接口 705 端口。


#### 配置 SNMPStats 模块与主代理通信 {#configuring-the-snmpstats-module-for-communication-with-a-master-agent}


上一节说明了如何设置 SNMP 主代理以接受
AgentX 连接。现在需要告知 SNMPStats 模块如何
与该主代理通信。做法是为
SNMPStats 模块提供其专属的 SNMP 配置文件。该文件必须命名为
"snmpstats.conf"，并且必须与上文配置的 "snmpd.conf" 文件
位于同一文件夹。默认位置为：


```bash
/etc/snmp/snmpstats.conf
```


可以使用发行版附带的默认配置文件，
其内容如下：


```c
agentXSocket tcp:localhost:705
```


上述行告知 SNMPStats 模块向 localhost 的 705 端口
上的主代理注册。参数应与
snmpd 进程保持一致。
注意，主代理（snmpd）无需与 OpenSIPS
位于同一台机器上。localhost 可以替换为任何其他
机器。


#### 测试配置是否正确 {#testing-for-a-proper-configuration}


作为快速验证 SNMPStats 模块子代理能否
成功连接到 SNMP 主代理的测试，请确保 snmpd 服务
已停止（/etc/init.d/snmpd stop），并手动以如下方式
启动 snmpd：


```bash
snmpd -f -Dagentx -x tcp:localhost:705 2>&1 | less
```


应能看到类似以下内容：


```c
    No log handling enabled - turning on stderr logging
    registered debug token agentx, 1
    ...
    Turning on AgentX master support.
    agentx/master: initializing...
    agentx/master: initializing...   DONE
    NET-SNMP version 5.3.1
```


现在在另一个窗口中启动 OpenSIPS。在 snmpd 窗口中，应能看到
大量类似以下内容：


```c
    agentx/master: handle pdu (req=0x2c58ebd4,trans=0x0,sess=0x0)
    agentx/master: open 0x81137c0
    agentx/master: opened 0x814bbe0 = 6 with flags = a0
    agentx/master: send response, stat 0 (req=0x2c58ebd4,trans=0x0,sess=0x0)
    agentx_build: packet built okay
```


以 "agentx" 开头的消息是调试信息，表明 AgentX 子代理
有活动发生，它们因 -Dagentx 这个 snmpd 开关而出现。
启动时 SNMPStats 模块会向主代理注册其所有标量和
表，因此会出现大量调试信息。若能看到这些消息，说明
SNMPStats 模块与 SNMP 守护进程均已正确配置。


## 常见问题 {#frequently-asked-questions}


**问：在哪里可以找到更多关于 SNMP 的资料？**


有许多网站在不同详细程度上讲解 SNMP。
一个很好的通用入门资料见 http://en.wikipedia.org/wiki/SNMP


如果对协议的细节感兴趣，
请参阅 RFC 3410。RFC 3410 梳理了定义 SNMP 的众多
其他 RFC，可从 http://www.rfc-archive.org/getrfc.php?rfc=3410 获取


INFO：另外，如果想要一份设置 snmpstats 与 OpenSIPS 配合使用的简明教程，可以试试
[这一篇](http://saevolgo.blogspot.ro/2012/09/opensips-monitoring-using-snmp-part-i.html)。


**问：在哪里可以找到更多关于 NetSNMP 的资料？**


NetSNMP 的源代码、文档、FAQ 和教程都可在
http://net-snmp.sourceforge.net/ 找到。


**问：在哪里可以了解更多关于 AgentX 的内容？**


AgentX 协议的完整细节在 RFC 2741 中说明，
可从以下地址获取：http://www.rfc-archive.org/getrfc.php?rfc=2741


**问：为什么我收不到任何 SNMP Trap？**


假设你已在 opensips.cfg 中配置了 trap 阈值，类似如下：

那么要么是 OpenSIPS 尚未达到这些阈值（这是好事），
要么是未正确设置 trap 监控。若要自行验证，
可以用以下方式启动 NetSNMP：

-f 告知 NetSNMP 进程不要转为守护进程，-Dtrap 启用 trap
调试日志。应能看到类似以下内容：

如果上面两行没有出现，那么很可能你未
在 snmpd.conf 文件中加入以下内容。

当 snmpd 收到 trap 时，上述输出中会出现
以下内容：

还需要一个程序来收集 trap 并对其做处理
（例如发送到 syslog）。NetSNMP 为此提供 snmptrapd。其他
方案也存在。可以自行搜索。


**问：OpenSIPS 拒绝加载 SNMPStats 模块。为什么显示 "load_module: could not open module snmpstats.so"？**


在某些系统上，根据配置不同，可能会在 stdout 或日志文件
中看到以下错误。

这意味着两种情况之一：

第二种情况下，修复方法如下：

或者，可以在启动命令前加上：

例如，在我的系统上运行的是：


**问：如何了解所有标量和表分别是什么？**


所有标量和表都在 SNMPStats 模块概述中命名。文件
OPENSER-MIB、OPENSER-REG-MIB、OPENSER-SIP-COMMON-MIB 和 OPENSER-SIP-SERVER-MIB
包含完整定义与说明。但请注意，MIB 中
实际可能包含 SNMPStats 模块目前未提供的标量和表。
因此，更好的替代做法是使用 NetSNMP 的 snmptranslate。
以 openserSIPEntityType 标量为例，可以如下
调用 snmptranslate：


```bash
    snmptranslate -TBd openserSIPEntityType
```


结果类似以下内容：


```c
    -- FROM       OPENSER-SIP-COMMON-MIB
    -- TEXTUAL CONVENTION OpenSIPSSIPEntityRole
    SYNTAX        BITS {other(0), userAgent(1), proxyServer(2), redirectServer(3), registrarServer(4)}
    MAX-ACCESS    read-only
    STATUS        current
    DESCRIPTION   " This object identifies the list of SIP entities this
                   row is related to. It is defined as a bit map.  Each
                   bit represents a type of SIP entity.
                   If a bit has value 1, the SIP entity represented by
                   this row plays the role of this entity type.

                   If a bit has value 0, the SIP entity represented by
                   this row does not act as this entity type
                   Combinations of bits can be set when the SIP entity
                   plays multiple SIP roles."
```


**问：为什么 snmpget、snmpwalk 和 snmptable 总是超时？**


如果 snmp 操作总是返回 "Timeout: No Response
from localhost"，那么很可能查询使用了错误的
community 字符串。默认安装大多会将 "public" 用作
默认 community 字符串。在 snmpd.conf 文件中搜索字符串
"rocommunity"，并将结果用作查询中的 community 字符串。


**问：如何使用 snmpget？**


NetSNMP 的 snmpget 用法如下：


```bash
    snmpget -v 2c -c theCommunityString machineToSendTheMachineTo scalarElement.0
```


例如，考虑对 openserSIPEntityType 标量执行 snmpget，
在与 OpenSIPS 实例相同的机器上运行，
并使用默认的 "public" community 字符串。命令为：


```bash
    snmpget -v2c -c public localhost openserSIPEntityType.0
```


结果类似：


```c
    OPENSER-SIP-COMMON-MIB::openserSIPEntityType.0 = BITS: F8 \
		other(0) userAgent(1) proxyServer(2)          \
		redirectServer(3) registrarServer(4)
```


**问：如何使用 snmptable？**


NetSNMP 的 snmptable 用法如下：


```bash
    snmptable -Ci -v 2c -c theCommunityString machineToSendTheMachineTo theTableName
```


例如，考虑 openserSIPRegUserTable。若在与运行中 OpenSIPS
实例相同的机器上运行 snmptable
命令，并配置默认的 "public" community 字符串，
命令为：


```bash
    snmptable -Ci -v 2c -c public localhost openserSIPRegUserTable
```


结果类似：


```c
    index openserSIPUserUri openserSIPUserAuthenticationFailures
        1       DefaultUser                                    0
        2            bogdan                                    0
        3    jeffrey.magder                                    0
```


**问：在哪里可以找到更多关于 OpenSIPS 的资料？**


参见 [https://opensips.org/](https://opensips.org/)。


**问：可以在哪里提出关于本模块的问题？**


首先请检查你的问题是否已在我们某个
邮件列表中得到了回答：

关于任何稳定版 OpenSIPS 的邮件应发送至
users@lists.opensips.org，关于开发版本的邮件
应发送至 devel@lists.opensips.org。

若希望邮件保持私密，请发送至
users@lists.opensips.org。


**问：如何报告 bug？**


请遵循以下地址中的指引：
[https://github.com/OpenSIPS/opensips/issues](https://github.com/OpenSIPS/opensips/issues)。
<!-- CONTRIBUTORS -->

### 许可证 {#license}

所有文档文件（即扩展名为 .md 的文件）均采用 Creative Common License 4.0 许可。

