---
title: "紧急呼叫"
description: "emergency 模块为 OpenSIPS 提供遵循 NENA i2 架构的紧急呼叫处理能力。"
---

参见模块：["Emergency"](https://docs.opensips.org/manual/devel/modules/emergency)

## 教程概览 {#tutorial-overview}

emergency 模块为 OpenSIPS 提供紧急呼叫处理能力，遵循美国机构 NENA（National Emergency Number Association，全国紧急号码协会）的 i2 架构规范。本教程介绍 i2 架构，以及在 OpenSIPS 脚本中集成紧急呼叫所需遵循的步骤。

## 问题 {#problem}

直到不久前，还无法向某个国家的统一紧急号码（美国的 911 或欧洲的 112）发起 VoIP 呼叫。难点恰恰在于灵活性：用户可以在世界上任何能接入互联网的地方发起呼叫。正是这种灵活性导致在 VoIP 呼叫中无法得知用户的位置信息。 

位置对紧急呼叫至关重要，原因有二：一是能够把呼叫路由到离呼叫发生地最近的 PSAP（负责应答紧急呼叫的呼叫中心），二是让接线员能够派人前往现场施救。 

在传统电话中，路由很容易实现：只要知道用户所属的交换机，再借助随信令一起传送的回叫号码，运营商就掌握了该业务对应的地址关系。在蜂窝网络中，路由是依据服务该移动设备的无线基站位置来执行的，并且通过各种获取移动设备位置的方法（例如三角定位），可以借助专门为此目的指定的架构获得位置信息。

除了拯救 VoIP 用户这一显而易见的意义之外，紧急呼叫的必要性还体现在其他方面。例如，一个国家的监管机构会把能否实现紧急呼叫作为该技术获得监管所需满足的最低要求之一。满足这一监管要求，对于让这些机构认可 VoIP 是传统电话的替代方案、进而向 VSP 运营商授予 VoIP 专用号码规划至关重要，而这是该技术在市场上成长的基本条件。 

除上述方面外，还必须考虑在完全基于 VoIP 的环境中开展紧急呼叫所带来的资源收益，例如将呼叫与监控系统对接的便利性。另一个例子是利用视频功能，让 PSAP 接线员评估事件状况，并能指导现场已在使用急救措施的人员，从而优化救援的提供。

---

## 解决方案 {#solution}

IETF 成立了一个工作组来研究 IP 网络上的紧急呼叫，产生了大量相关的 RFC。他们提出了 LIS（Location Information Server，位置信息服务器）的概念，负责依据 Geopriv[15] 的原则存储特定目标的位置信息。LIS 应部署在为设备提供互联网接入的 ISP（Internet Service Provider，互联网服务提供商）中，并可以通过两种方式提供主叫位置信息：

* 按值（By value），为此使用 PIDF-LO[10] 对象。该对象可使用两种格式： 
  * Civic[3]（例如州、城市、街道） 
  * Georeferenced[4]（例如纬度、经度）。
* 按引用（By reference），给出一个 URI，第三方可通过查询该 URI 获取设备的位置。

为了传输和存储执行紧急呼叫所需的新参数，必须对多种协议进行适配，包括 SIP —— 它新增了新的头域和新的内容类型；同时也产生了新的协议，例如 HELD。传输协议既考虑了二进制格式（DHCP），也考虑了基于文本的 XML（HTTP、SIP）。 

他们还创建了 LoST Server[6]，这是一个用于根据主叫位置确定呼叫路由的服务器。LoST 将成为 VSP（VoIP Service Provider，VoIP 服务提供商）架构的一部分。

IETF 产出了一套涉及所有这些新建或被修改[13]要素的架构。我们不会详述这套架构，因为我们的重点是由 NENA 规定的架构，如下文所述，它对 OpenSIPS 有更强的针对性。

---

## NENA i2 架构 {#nena-i2-architecture}

NENA（National Emergency Number Association，全国紧急号码协会）是一个由美国应急服务界组成的团体。该团体讨论并提出了面向美国覆盖范围的 IP 网络紧急呼叫技术与运营解决方案。

该团体提出的架构在很大程度上基于 IETF 为紧急呼叫定义的概念和协议。但这两套提出的架构之间存在差异。在 NENA 架构中，端点相对于呼叫路由的作用有所减弱，路由成为 VSP 呼叫服务器（Call Server）的功能。端点仅限于识别紧急呼叫（在美国的情形下即 911）并获取自身位置。 

另一点是，IETF 的架构认为 PSAP 也接收 SIP 呼叫。NENA 更倾向于将其分为两个阶段：先是 NENA i2，考虑传统 PSAP（位于 PSTN 网络中）；随后是 NENA i3，将 PSAP 置于专用的紧急 IP 网络中。

### 组件 {#components}

该架构的组件如下图所示：

![emergency figure1](/public/uploads/emergency-figure1.png)

* **Emergency Services Gateway**（ESGW）—— IP 网络与传统 PSAP 所在的 PSTN 网络之间的网关。它使用呼叫服务器（Call Server）收到的信息（ESGWRI）来选择合适的中继，从而在 PSTN 网络上路由呼叫；在中继信令中包含呼叫标识（ESQK），并在可能的情况下包含 ANI 字段中的回叫号码（CBN）。
* **Emergency Service Zone Routing Data Base**（ERDB）—— 根据收到的位置信息确定紧急服务区（ESZ），将地理参照地址或市民地址映射到最近 PSAP 的区域。
* **VoIP Positioning Center**（VPC）—— 为紧急呼叫提供路由信息的网元。它在需要时还会把位置信息发送给 PSAP 的 ALI 模块。VPC 与 ERDB 交互以获取 ESZ 信息。
* **Validation Database**（VDB）—— 包含由应急服务网络提供商的 MSAG 定义的合法市民地址信息。VDB 能够接收对 PIDF-LO 对象中市民地址的校验请求，并返回该地址是否合法的应答。这一过程确保地址是真实地址（即地址存在），但并不能确认它确实就是主叫的位置。
* **Location Information Server**（LIS）—— 提供主叫设备位置的网元。它可以按引用或按值提供位置，采用市民地址或地理参照格式。主叫端点自身可以请求以获知自己的位置，对设备位置感兴趣的第三方也可以请求。两种情况下，LIS 都会收到代表该端点的唯一标识（例如 IP 地址、电路 ID、MAC 地址），并返回与该标识关联的位置。LIS 还会针对使用引用 URI 的查询提供位置信息（解引用）。
* **Root Discovery Server**（RDS）—— 负责分发 ERDB 与 VDB 服务器的实体（假定必须有多台 ERDB/VDB 才能覆盖全国所有地区）。当携带位置信息被查询时，它返回服务于该位置区域的 ERDB 与 VDB URI 列表。
* **Call Server、Redirect Server 与 Routing Proxy** —— 这些是 SIP 代理，根据所提出的场景处理紧急呼叫。

### 场景 {#scenarios}

从业务角度看，该架构中可以区分出若干场景：

#### 场景 I {#scenario-i}
主叫方 VSP 的呼叫服务器接管紧急呼叫的处理。该 VSP 同时也是与 VPC 对接的提供方（source）。该场景使用如下运行示意图：

![emergency figure2](/public/uploads/emergency-figure2.png)

以下是发起紧急呼叫需要遵循的步骤：

* 主叫设备通过向 LIS 发送查询获取自身位置 —— 为此可以使用 HELD 协议。它按值（Location Object - LO）或按引用（Key Location - LK）获得该信息。
* 端点通过向呼叫服务器发送 INVITE 发起紧急呼叫，R-URI 为：`911@sourcedomain`，位置信息包含在该消息中：位于 Geolocation 头域（按引用）或位于使用 `application/pidf` 内容类型的消息体中，回叫号码位于 From 头域。
* 呼叫服务器存储回叫号码，并将其与用户名称关联。它通过向 VPC 发送以下数据来请求该呼叫的路由信息：主叫号码、用户标识、位置信息（LO 或 LK）
* 如果位置信息是按引用（LK）传递的，VPC 会向 LIS 获取其值（LO）。
* VPC 使用该位置（LO）在 ERDB 中取得紧急处理区域（ESZ），并确定路由到该区域 PSAP 的 ESGW R-URI。该信息将被发送给呼叫服务器（ESGWRI）。另一种可能是 VPC 发送与紧急区域相关的数据（ERT），此时呼叫服务器根据收到的这些数据解析 URI。
* VPC 分配一个与主叫位置及其他呼叫信息关联的键（ESQK）。这一关联将用于向 PSAP 接线员（通过 ALI-PSAP）告知主叫的位置与身份。
* 呼叫服务器使用从 VPC 收到的 R-URI（ESGWRI），或使用根据紧急区域数据（ERT）解析出的 R-URI，把 INVITE 转发给合适的 ESGW。呼叫服务器在该 INVITE 中包含 ESQK 与回叫号码。
* ESGW 根据 ESGWRI 信息选择通向 PSTN 的输出路径。在 PSTN 中，SS#7 信令将在 ANI 字段中包含 ESQK。
* SR 使用 ESGWRI 与 ESQK 把呼叫转发给合适的 PSAP。
* PSAP 接线员使用 ESQK 查询 ALI 以获取主叫位置
* ALI 向 VPC 发送 ESPOSREQ 信号，VPC 通过键 ESQK 取得所存储的位置与呼叫信息。
* 为结束呼叫，呼叫服务器收到来自主叫或 ESGW 网关的 BYE。呼叫服务器必须告知 VPC 该呼叫已结束，以释放该键及与该呼叫相关的信息。

第一个场景中交换的信号流程如下图所示：

![emergency figure3](/public/uploads/emergency-figure3.png)

#### 场景 II {#scenario-ii}
主叫方 VSP 的呼叫服务器把紧急呼叫路由给第三方 SIP 提供商的 Routing Proxy，由后者进行处理并从此接管该呼叫。 

在该场景中，接口 v0、v3、v7、v8 以及 PSTN 接口与场景 I 相同，因此此处不再描述。下图展示了该场景的运行示意图：

![emergency figure4](/public/uploads/emergency-figure4.png)

该场景的差异步骤列举如下：

* 端点通过向 VSP 呼叫服务器发送 INVITE 发起紧急呼叫，R-URI 为：`911@VSPdomain`，位置信息包含在该消息中：位于 Geolocation 头域（按引用）或位于使用 `application/pidf` 内容类型的消息体中，回叫号码位于 From 头域。
* 呼叫服务器把紧急呼叫转发给第三方 SIP 提供商的 Routing Proxy，并保留所收到 INVITE 中相同的位置信息。
* Routing Proxy 以与场景 I 中呼叫服务器相同的方式处理该呼叫。它通过向 VPC 发送以下数据来请求该呼叫的路由信息：主叫号码、用户标识、位置信息（LO 或 LK）。
* 与场景 I 类似，VPC 使用该位置（LO）从 ERDB 获取该呼叫的路由信息（esgwri/ert、esqk、lro），并把查到的信息应答给 Routing Proxy。
* Routing Proxy 使用从 VPC 收到的 R-URI（ESGWRI），或使用根据紧急区域数据（ERT）解析出的 R-URI，把 INVITE 转发给合适的 ESGW。Routing Proxy 在该 INVITE 中包含 esqk 与回叫号码。
* 为结束呼叫，Routing Proxy 收到来自主叫或 ESGW 网关的 BYE。Routing Proxy 必须告知 VPC 该呼叫已结束，以释放该键及与该呼叫相关的信息。

第二个场景中交换的信号流程如下图所示：

![emergency figure5](/public/uploads/emergency-figure5.png)

#### 场景 III {#scenario-iii}
主叫方 VSP 的呼叫服务器向 Redirect Server 请求另一家提供商通往紧急呼叫的路由信息，但在这种情况下由呼叫服务器转发并接管该呼叫。这第三家提供商可能是专门处理紧急呼叫的提供商。

在该场景中，接口 v0、v3、v7、v8 以及 PSTN 接口与场景 I 相同，因此此处不再描述。下图展示了该场景：

![emergency figure6](/public/uploads/emergency-figure6.png)

该场景的差异步骤列举如下：

* 端点通过向 VSP 呼叫服务器发送 INVITE 发起紧急呼叫，R-URI 为：911@*VSPdomain*，位置信息包含在该消息中：位于 Geolocation 头域（按引用）或位于使用 `application/pidf` 内容类型的消息体中，回叫号码位于 From 头域。
* 呼叫服务器把紧急呼叫转发给第三方 SIP 提供商的 Redirect Server，并保留所收到 INVITE 中相同的位置信息。
* Redirect Server 通过向 VPC 发送以下数据来请求该呼叫的路由信息：主叫号码、用户标识、位置信息（LO 或 LK）。
* 与场景 I 类似，VPC 使用该位置（LO）从 ERDB 获取该呼叫的路由信息（esgwri/ert、esqk、lro），并把查到的信息应答给 Redirect Server。
* Redirect 把收到的路由信息放在 300（Multiple Choice）应答的 Contact 头域中传送，并发送给呼叫服务器。
* Redirect 还会向呼叫服务器发送 SUBSCRIBE 请求。该订阅请求旨在监控紧急呼叫的状态。呼叫服务器以 NOTIFY 应答，接受订阅请求。
* 呼叫服务器将使用 Contact 头域中收到的路由信息，把 INVITE 转发给合适的 ESGW（直接使用 ESGWRI，或根据紧急区域信息（ERT）解析 URI，取决于收到的是哪种）。呼叫服务器在该 INVITE 中包含 esqk 与回叫号码。
* 为结束呼叫，呼叫服务器收到来自主叫或 ESGW 网关的 BYE，并向 Redirect Proxy 发送 NOTIFY，报告呼叫已终止的状态。
* Redirect 发送 Expires 头域值为零的 SUBSCRIBE，以结束订阅。呼叫服务器以 NOTIFY 确认订阅结束。
* Redirect Server 必须告知 VPC 该呼叫已结束，以释放该键及与该呼叫相关的信息。

第三个场景中交换的信号流程如下图所示：

![emergency figure7](/public/uploads/emergency-figure7.png)

## 配置角色 {#configuration-roles}

在该架构中，OpenSIPS 可以充当呼叫服务器（Call Server）、Redirect Server 或 Routing Proxy，具体取决于你在各场景中赋予它的角色。

emergency 模块的开发目的是让 OpenSIPS 满足 NENA 所要求的功能需求。该模块包含一些需要在配置脚本中设置的参数，我们还新增了两个函数：`emergency_call` 负责把请求转发到紧急呼叫，`failure` 负责处理被转发请求在传输过程中的任何失败。

下一节介绍这些函数执行的任务并解释相关参数。首先我们从无论为 emergency 模块配置何种 OpenSIPS 角色都通用的参数开始：

### emergency 模块的数据表 {#emergency-module-tables}

* `emergency_routing` —— 仅当 VPC 不把 ERT（Emergency Route Tuple，紧急路由元组）信息转换为用于把紧急呼叫路由到合适 ESGW 网关的 ESGWRI 时，才需要该表。该表由以下列构成：
  * **selectiveRoutingID：** 与紧急呼叫将要被导向的 Selective Router 相关联的 Common Language Location Indicator（CLLI）代码。
  * **routingESN：** 与特定 ESZ 相关联的 Emergency Services Number，代表警察、消防与 EMS 应急响应力量的唯一组合。
  * **npa：** 与通向 Selective Router 的出局路由相关联的 Numbering Plan Area，该路由适合主叫所在位置。
  * **esgwri：** 该字段将包含路由键，用于把呼叫路由到服务于呼叫发起地本地区的 Selective Router。

* `emergency_service_provider` —— 该表包含参与紧急呼叫路由的组织信息。在 devel 模块中，该表取代了旧版 2.1 示例所使用的、与组织相关的模块参数。当 OpenSIPS 按照 NENA 标准向 VPC 发送请求时需要该表；如果 OpenSIPS 不向 VPC 发送请求（例如 OpenSIPS 在场景 II 与 III 中充当呼叫服务器），则不需要该表。该表由以下列创建：
  * **organizationName：** 提供商公司名称。该参数在 NENA v2 接口（call server - VPC）中是可选字段。
  * **hostId：** 提供商主机名。如果 attribution 为 0（source）或 2（VSP），该参数为必填，否则为可选。
  * **nenaId：** 由 NENA 管理的提供商公司标识（NENA Company ID）。该参数在 NENA v2 接口（call server - VPC）中是可选字段。
  * **contact：** 可全天候（每周 7 天、每天 24 小时）联系提供商运营人员的电话号码。如果 attribution 为 0（source）或 2（VSP），该参数为必填，否则为可选。
  * **certUri：** 提供一种直接获取 VESA（Valid Emergency Services Authority）为提供商签发证书的手段。该参数在 NENA v2 接口（call server - VPC）中是可选字段。
  * **nodeIp：** 正在注册的节点的 IP 地址。该参数为必填。
  * **attribution：** 一个 int 类型字段，用于指明注册到该表中的、参与 NENA 架构组成的组织所承担的功能。该参数为必填。
该字段可以取的值有：
1. 该组织是 Source。Source 是直接向 VPC 请求紧急呼叫路由的节点；
2. 该组织是 VPC。VPC 是紧急呼叫的路由信息提供方；
3. 该组织是 VSP。VSP 是主叫的语音服务提供商；

* `emergency_report` —— 为排障目的保留呼叫事件记录（呼叫历史以及与 VPC 之间 Request/Response 消息的内容）。该表由以下列构成：
  * **callid：** 在呼叫服务器上唯一标识该呼叫的 INVITE 头域。
  * **vpc_organizationName：** VPC 公司名称
  * **vpc_hostname：** VPC 主机名。
  * **vpc_timestamp：** UTC 时间格式的日期时间戳，表示消息从 VPC 节点发出的时间。
  * **selectiveRoutingID：** 与紧急呼叫将要被导向的 Selective Router 相关联的 Common Language Location Indicator（CLLI）代码。
  * **routingESN：** 与特定 ESZ 相关联的 Emergency Services Number，代表警察、消防与 EMS 应急响应力量的唯一组合。
  * **npa：** 与通向 Selective Router 的出局路由相关联的 Numbering Plan Area（NPA），该路由适合主叫所在位置。
  * **lro：** 最后路由选项（last routing option）。该路由选项只应由呼叫服务器或代理作为最后手段使用。
  * **result：** 表示 VPC 确定路由成功或失败原因的代码。
  * **disposition：** 呼叫的处理结果（例如使用了 ESGWRI 还是 LRO）。

### 配置脚本 {#configuration-script}
```opensips

loadmodule "emergency.so" # 加载该模块

### 必填参数
# 定义存储 emergency 模块相关表的数据库 URL
modparam("emergency", "db_url", "mysql://opensips:opensipsrw@localhost/opensips")

# 定义 OpenSIPS 在处理紧急呼叫时应当考虑的紧急号码
modparam("emergency", "emergency_codes", "911-Código de emergência dos EUA")
modparam("emergency", "emergency_codes", "112-Código de Emergência Europeu")

### 可选参数
# OpenSIPS 把路由表中的数据载入内存的时间间隔，用于优化服务器性能
modparam("emergency", "timer_interval",30)

```

其他参数以及函数执行的任务取决于其在各种可能场景中所承担的角色。

### 场景 I 中的呼叫服务器或场景 II 中的 Routing Proxy {#call-server-in-scenario-i-or-routing-proxy-in-scenario-ii}

```opensips

/*
* 该角色所需的 emergency 模块数据表：
* emergency_service_provider - 创建该表，并插入 VPC、Source 与 VSP 节点的组织信息；VSP 节点仅在场景 II 中需要（attribution 分别为 0、1 和 2）。
* emergency_routing - 仅当 VPC 不直接返回 ESGWRI 时，才创建该表并插入 ERT 信息及其匹配的 ESGWRI。
* emergency_report - 只需创建。
**/
### 这些角色中必须配置的参数：
# proxy_role = 0 表示 OpenSIPS 在场景 I 中作为呼叫服务器
modparam("emergency", "proxy_role", 0)

# proxy_role = 1 表示 OpenSIPS 在场景 II 中作为 Routing Proxy
# modparam("emergency", "proxy_role", 1)

# OpenSIPS 用于获取路由数据的 VPC URL
modparam("emergency", "url_vpc", "http://192.168.0.103/fcgi-bin/fcgid.fcgi")

### 这些角色中可选配置的参数：
# 当 OpenSIPS 与 VPC 之间的路由机制失败时使用的应急代理 URI
modparam("emergency", "contingency_hostname", "192.168.0.105")

# 用于把从 VPC 收到的 ERT 信息映射为可路由 URI 的表
modparam("emergency", "db_table_routing", "emergency_routing")

# 存储与呼叫关联的元数据的表
modparam("emergency", "db_table_report", "emergency_report")

# 存储 VPC 接口中所用组织信息的表
modparam("emergency", "db_table_provider", "emergency_service_provider")

```

该角色中 `emergency_call` 函数执行的任务：
* 校验收到的请求（INVITE）是否与紧急呼叫有关。具体做法是检查 R-URI 中的 User 字段是否与配置文件中定义的某个 emergency_codes 参数一致，或者检查它是否是 RFC5031[7] 中提出的紧急呼叫标准 URN `urn: service.sos`。如果不是紧急呼叫，消息按常规流程处理。
* 如果是紧急呼叫请求，则检查该消息是否应由本代理处理。为此检查 R-URI 中的 host 字段是否指向 OpenSIPS 自身，或者检查 Geolocation-Routing 头域的值是否为 *yes*（依据 RFC6442[8]）。如果 OpenSIPS 不需要处理该消息，则按常规把消息传送到 R-URI 中设定的目的地，
* 获取主叫的位置信息：按值获取时位于 INVITE 的消息体中，使用内容类型 `application/pidf` [9]；按引用获取时通过 Geolocation 头域[7]。向 VPC 发送 HTTP POST，报告该位置以及 VPC 身份、VSP 身份和 Routing Proxy 的 SIP 提供商（后者仅用于场景 II）。这些信息必须配置在上文所述的参数中，以满足该接口的要求。 
* OpenSIPS 等待 VPC 返回携带转发 INVITE 所需信息的 200 OK 应答，该信息可能以两种方式到达：
  * 通过参数 ESGWRI（Emergency Services Gateway Route Identifier），其中已包含供呼叫服务器转发呼叫的 URI。
  * 或通过参数 ERT（Emergency Route Tuple），其中包含三个标识紧急区域的字段：Selective Routing Identifier、ESN（Emergency Services Number）与 NPA（Numbering Plan Area）。呼叫服务器/Routing Proxy 把这些字段转换为请求应被路由到的 URI。具体做法是填充由 db_emergency_routing 定义的表，该表包含 ERT 字段对应的列以及一个用于转换目标 URI 的列。
* 转发 INVITE 时，R-URI 应被替换为 ESGWRI 值，位置信息应保留在消息中，并且应添加与 CBN（Callback Number，回叫号码）以及 VPC 中与该呼叫关联的键（ESQK）有关的信息。
* 新的 URI 目的地应保持在 OpenSIPS 内部，这样同一 dialog 内、callid 相同且方向相同的所有请求都能被转发到同一目的地。消息中必须包含 Record-Route，因为 OpenSIPS 需要感知呼叫的终止。
* 呼叫结束时，OpenSIPS 应收到 BYE 并清除内存中与该呼叫相关的信息。OpenSIPS 再发送一个 HTTP POST，通知 VPC 该呼叫已终止，以便 VPC 也从其数据库中释放该键及与该呼叫相关的信息。
* OpenSIPS 应把该呼叫的元数据存入其数据库。

该角色中 `failure` 函数执行的任务：

如果按上述步骤定义的路由未能成功传送 INVITE，配置文件中必须在 `FAILURE ROUTE` 中包含 `failure()` 命令。该命令把 INVITE 传送到一个网关，由该网关把呼叫转到传统电话网中由 VPC 返回的 LRO 参数所定义的应急号码。

### 场景 II 中的呼叫服务器 {#call-server-in-the-scenario-ii}

```opensips

/* 该角色所需的 emergency 模块数据表：
 * 无需创建任何表。
**/
### 该角色中必须配置的参数：
# proxy_role = 2 表示 OpenSIPS 在场景 II 中作为呼叫服务器
modparam("emergency", "proxy_role", 2)
 
# 将处理该紧急呼叫的第三方 SIP 提供商的 Routing Proxy
modparam("emergency", "emergency_call_server", "192.168.0.105")

```

该角色中 `emergency_call` 函数执行的任务：
* 校验收到的请求（INVITE）是否与紧急呼叫有关。具体做法是检查 R-URI 中的 User 字段是否与配置文件中定义的某个 emergency_codes 参数一致，或者检查它是否是 RFC5031 [7] 中提出的紧急呼叫标准 URN `urn: service.sos`。如果不是紧急呼叫，消息按常规流程处理。
* 如果是紧急呼叫请求，则检查该消息是否应由本代理处理。为此检查 R-URI 中的 host 字段是否指向 OpenSIPS 自身，或者检查 Geolocation-Routing 头域的值是否为 *yes*（依据 RFC6442[8]）。如果 OpenSIPS 不需要处理该消息，则按常规把消息传送到 R-URI 中设定的目的地。
* 仅把 INVITE 转发给将接管该呼叫的 Routing Proxy。

`failure` 命令在该角色中没有意义。

### 场景 III 中的呼叫服务器 {#call-server-in-the-scenario-iii}

```opensips

/* 该角色所需的 emergency 模块数据表：
 * emergency_service_provider - 无需创建。
 * emergency_routing - 仅当 VPC 不直接返回 ESGWRI 时，才创建该表并插入 ERT 信息及其匹配的 ESGWRI。
 * emergency_report - 只需创建。
**/
### 该角色中必须配置的参数：
# proxy_role = 3 表示 OpenSIPS 在场景 III 中作为呼叫服务器
modparam("emergency", "proxy_role", 3)
 
# 将处理该紧急呼叫的 Redirect Server
modparam("emergency", "emergency_call_server", "192.168.0.105")
 

### 该角色中可选配置的参数：
# 当 OpenSIPS 与 VPC 之间的路由机制失败时使用的应急代理 URI
modparam("emergency", "contingency_hostname", "192.168.0.105")
 
# 用于把从 VPC 收到的 ERT 信息映射为可路由 URI 的表
modparam("emergency", "db_table_routing", "emergency_routing")

# 存储与呼叫关联的元数据的表
modparam("emergency", "db_table_report", "emergency_report")

```

该角色中 `emergency_call` 函数执行的任务：
* 校验收到的请求（INVITE）是否与紧急呼叫有关。具体做法是检查 R-URI 中的 User 字段是否与配置文件中定义的某个 emergency_codes 参数一致，或者检查它是否是 RFC5031[7] 中提出的紧急呼叫标准 URN `urn: service.sos`。如果不是紧急呼叫，消息按常规流程处理。
* 如果是紧急呼叫请求，则检查该消息是否应由本代理处理。为此检查 R-URI 中的 host 字段是否指向 OpenSIPS 自身，或者检查 Geolocation-Routing 头域的值是否为 *yes*（依据 RFC6442[8]）。如果 OpenSIPS 不需要处理该消息，则按常规把消息传送到 R-URI 中设定的目的地
* 把 INVITE 转发给 Redirect Server，并等待收到 300/302 应答以收集 Contact 头域中的数据。
* 使用 `failure()` 命令处理中所述的 INVITE 目标 URI，把该 dialog 内的所有请求重定向到同一目的地。
* 接收 Redirect Server 针对 RFC 4235 定义的 "dialog" 事件类型发来的 SUBSCRIBE 请求，创建订阅以监控该紧急呼叫的状态，并在呼叫结束时通知 Redirect。呼叫服务器必须向 Redirect 发送一个 NOTIFY，确认 SUBSCRIBE 已被接受。
* 呼叫结束时，OpenSIPS 应收到 BYE 并清除内存中与该呼叫相关的信息。呼叫服务器必须向 Redirect 发送 NOTIFY 报告该呼叫已结束，随后应等待收到 Expires 头域为零的 SUBSCRIBE，表示关闭订阅。呼叫服务器再次以状态为 *terminated* 的 NOTIFY 应答，依据 RFC 6665 确认订阅关闭。
* OpenSIPS 应把该呼叫的元数据存入其数据库。

该角色中 `failure` 函数执行的任务：
* failure 命令将处理从 Redirect 收到的 300/302 应答，并使用 Contact 头域中的信息把 INVITE 转发到正确的目的地。Contact 头域可能以两种方式出现：
  * 通过参数 ESGWRI（Emergency Services Gateway Route Identifier），其中已包含供呼叫服务器转发呼叫的 URI。
  * 或通过参数 ERT（Emergency Route Tuple），其中包含三个标识紧急区域的字段：Selective Routing Identifier、ESN（Emergency Services Number）与 NPA（Numbering Plan Area）。呼叫服务器/Routing Proxy 把这些字段转换为请求应被路由到的 URI。具体做法是填充由 db_emergency_routing 定义的表，该表包含 ERT 字段对应的列以及一个用于转换目标 URI 的列。
* 在转发 INVITE 时，R-URI 应被替换为 ESGWRI 值，位置信息应保留在消息中，并应添加 CBN 与 ESQK（Emergency Services Query Keys）的信息。并且消息中必须包含 Record-Route，以便 OpenSIPS 感知呼叫的关闭。
* 如果按上述步骤定义的路由未能成功传送 INVITE，该命令把 INVITE 传送到一个网关，由该网关把呼叫转到传统电话网中由 VPC 返回的 LRO 参数所定义的应急号码。

### 场景 III 中的 Redirect Server {#redirect-server-in-the-scenario-iii}

```opensips

/* 该角色所需的 emergency 模块数据表：
 * emergency_service_provider - 创建该表，并插入 VPC、Source 与 VSP 节点的组织信息（attribution 分别为 0、1 和 2）。
 * emergency_routing - 无需创建。
 * emergency_report - 只需创建。
**/
### 该角色中必须配置的参数：
# proxy_role = 4 表示 OpenSIPS 在场景 III 中作为 Redirect Server
modparam("emergency", "proxy_role", 4)
 
# OpenSIPS 用于获取路由数据的 VPC URL
modparam("emergency", "url_vpc", "http://192.168.0.103/fcgi-bin/fcgid.fcgi")

### 该角色中可选配置的参数：
# 存储与呼叫关联的元数据的表
modparam("emergency", "db_table_report", "emergency_report")

```

该角色中 `emergency_call` 函数执行的任务：
* 校验收到的请求（INVITE）是否与紧急呼叫有关。具体做法是检查 R-URI 中的 User 字段是否与配置文件中定义的某个 emergency_codes 参数一致，或者检查它是否是 RFC5031[7] 中提出的紧急呼叫标准 URN `urn: service.sos`。如果不是紧急呼叫，消息按常规流程处理。
* 如果是紧急呼叫请求，则检查该消息是否应由本代理处理。为此检查 R-URI 中的 host 字段是否指向 OpenSIPS 自身，或者检查 Geolocation-Routing 头域的值是否为 *yes*（依据 RFC6442[8]）。如果 OpenSIPS 不需要处理该消息，则按常规把消息传送到 R-URI 中设定的目的地。
* 获取主叫的位置信息：按值获取时位于 INVITE 的消息体中，使用内容类型 `application/pidf`[9]；按引用获取时通过 Geolocation 头域 [7]。向 VPC 发送 HTTP POST，报告该位置以及 VPC 身份、VSP 身份和 Routing Proxy 的 SIP 提供商。这些信息必须配置在上文所述的参数中，以满足该接口的要求。  
* OpenSIPS 等待 VPC 返回携带转发 INVITE 所需信息的 200 OK 应答，该信息可能以两种方式到达：
  * 通过参数 ESGWRI（Emergency Services Gateway Route Identifier），其中已包含供呼叫服务器转发呼叫的 URI。
或通过参数 ERT（Emergency Route Tuple），其中包含三个标识紧急区域的字段：Selective Routing Identifier、ESN（Emergency Services Number）与 NPA（Numbering Plan Area）。呼叫服务器/Routing Proxy 把这些字段转换为请求应被路由到的 URI。具体做法是填充由 db_emergency_routing 定义的表，该表包含 ERT 字段对应的列以及一个用于转换目标 URI 的列。
该信息必须包含在 300/302 应答的 Contact 头域中传送给呼叫服务器，以便它能够路由该 INVITE
* Redirect Server 还必须发送事件类型为 "dialog"（RFC 4235）的 SUBSCRIBE，在呼叫服务器中建立订阅以监控该紧急呼叫，并等待收到确认订阅的 NOTIFY
* 等待呼叫服务器在呼叫结束时发送另一个 NOTIFY，以便 Redirect 能够通知 VPC 释放该键及与进行中呼叫相关的信息。
* Redirect 再次发送 Expires 头域等于零的 SUBSCRIBE，以结束与呼叫服务器之间的订阅，并等待收到状态为 *terminated* 的 NOTIFY 以确认关闭（RFC 6665）。

`failure` 命令在该角色中没有意义。

## 配置示例 {#configuration-example}

```opensips
# 在场景 I、II 或 III 中将 OpenSIPS 作为呼叫服务器时使用 emergency_call()，
# 或在场景 II 中作为 Routing Proxy 时使用。
route {
    if (!mf_process_maxfwd_header(10)) {
        send_reply(483, "Too Many Hops");
        exit;
    }

    xlog("CONF ----- verify EMERGENCY -----------\n");

    if (emergency_call()) {
        t_on_failure("emergency_call");
        if (!t_relay()) {
            send_reply(500, "Internal Error");
        }
        exit;
    }

    xlog("CONF ------- NOT EMERGENCY - CONTINUE WITH OTHER CALL TREATMENT -----------\n");
    ...
}

# 在场景 I 中将 OpenSIPS 作为呼叫服务器时使用 failure()，
# 或在场景 II 中作为 Routing Proxy 时使用。
failure_route[emergency_call] {
    xlog("FAILURE ...\n");

    if (failure()) {
        xlog("RETRANSMIT ...\n");

        if (!t_relay()) {
            send_reply(500, "Internal Error");
            exit;
        }

        t_on_failure("emergency_call");
        exit;
    }
}
```

```opensips
# 在场景 III 中将 OpenSIPS 作为 Redirect Server 时使用 emergency_call()。
# 不需要 t_relay()，因为收到的 INVITE 由本地直接应答。
route {
    if (!mf_process_maxfwd_header(10)) {
        send_reply(483, "Too Many Hops");
        exit;
    }

    xlog("CONF ----- verify EMERGENCY -----------\n");

    if (emergency_call()) {
        exit;
    }

    xlog("CONF ------- NOT EMERGENCY - CONTINUE WITH OTHER CALL TREATMENT -----------\n");
    ...
}
```

## 参考文献 {#references}
* Hannes Tschofenig, Henning Schulzrinne. Internet Protocol-Based Emergency Sercices. 2013.
* NENA. NENA Interim VoIP Architecture for Enhanced 9-1-1 Services (i2) NENA 08-001 v2. Agosto 2013.
* H. Schulzrinne. Dynamic Host Configuration Protocol (DHCPv4 and DHCPv6) Option for Civic Addresses Configuration Information. Novembro 2006, RFC 4776, Internet Engineering Task Force.
* Polk, J., Linsner, M., Thomson, M. and Aboba, B. Dynamic Host Configuration Protocol Option for Coordinate-Based Location Configuration Information, July 2011. RFC 6225, Internet Engineering Task Force.
* Barnes, M. HTTP-Enabled Location Delivery (HELD), September 2010. RFC 5985, Internet Engineering Task Force.
* Hardie, T., Newton, A., Schulzrinne, H. and Tschofenig, H. LoST: A Location-to-Service Translation Protocol,August 2008. RFC 5222, Internet Engineering Task Force.
* Schulzrinne, H. A Uniform Resource Name (URN) for Emergency and Other Well-Known Services, January 2008. RFC 5031, Internet Engineering Task Force.
* Polk, J. and Rosen, B. Location Conveyance for the Session Initiation Protocol, December 2011. RFC 6442, Internet Engineering Task Force.
* Berners-Lee, T., Fielding, R. and Masinter, L. Uniform Resource Identifier (URI): Generic Syntax, January 2005. RFC 3986, Internet Engineering Task Force.
* Peterson, J. A Presence-Based GEOPRIV Location Object Format, December 2005. RFC 4119, Internet EngineeringTask Force.
* [Intrado](http://www.intrado.com/sites/default/files/documents/PSAP_Operations_Guide_for_Wireless_9-1-1.pdf) PSAP Operations Guide for Wireless 9-1-1. July 2005
* NENA. NENA Technical Requirements Document (TRD) for Location Information to Support IP-Based Emergency Services NENA 08-752, Issue 1, December 21, 2006
* B. Rosen, J. Polk. Best Current Practice for Communications Services in Support of Emergency Calling, March 2013. RFC 6881, Internet Engineering Task Force.
* B. Rosen, H. Schulzrinne, J. Polk, A. Newton. Framework for Emergency Calling Using Internet Multimedia, December 2011. RFC 6443, Internet Engineering Task Force.
* J. Cuellar, J. Morris, D. Mulligan, J. Peterson, J. Polk. Geopriv Requirements, February 2004. RFC 3693, Internet Engineering Task Force.
* J. Winterbottom, M. Thomson, R. Barnes,B. Rosen,R. George. Specifying Civic Address Extensions in the Presence Information Data Format Location Object (PIDF-LO), January 2013. RFC 6848, Internet Engineering Task Force.
* R. Barnes, M. Lepinski, A. Cooper, J. Morris, H. Tschofenig, H. Schulzrinne. An Architecture for Location and Location Privacy in Internet Applications, July 2011. RFC 6280, Internet Engineering Task Force
* H. Tschofenig, H. Schulzrinne. GEOPRIV Layer 7 Location Configuration Protocol: Problem Statement and Requirement, March 2010. RFC 5687, Internet Engineering Task Force
* M. Thomson, J. Winterbottom. Using Device-Provided Location-Related Measurements in Location Configuration Protocol, January 2014. RFC 7105, Internet Engineering Task Force

## 版本说明 {#version-notes}

本教程针对 OpenSIPS `emergency` 模块的 devel 版本。

旧版 OpenSIPS 2.1 配置使用模块参数来承载发送给 VPC 的组织数据。例如，2.1 的 Routing Proxy 或 Redirect Server 配置会包含如下参数：

```opensips
modparam("emergency", "source_hostname", "rp34.example.com")
modparam("emergency", "source_contact", "tel:+398348975439823")
modparam("emergency", "vsp_hostname", "cs98.example.com")
modparam("emergency", "vsp_contact", "tel:+15554476632")
modparam("emergency", "source_organization_name", "Terry re-direct proxy")
modparam("emergency", "source_nena_id", "nena1")
modparam("emergency", "source_cert_uri", "https://rp34.example.com/certificate.crt")
modparam("emergency", "vpc_organization_name", "Anand VPC")
modparam("emergency", "vpc_hostname", "vpc.example.com")
modparam("emergency", "vpc_nena_id", "nena1")
modparam("emergency", "vpc_contact", "tel:+398348975439823")
modparam("emergency", "vpc_cert_uri", "https://rp34.example.com/certificate.crt")
```

在 devel 教程中，请改为把这些组织数据保存在 `emergency_service_provider` 表中，并且只在需要覆盖默认表名时才使用 `db_table_provider`。

## 作者 {#authors}

* **Evandro Villaron Franceschinelli** —— 电气工程师，在电信领域经验丰富，参与过数字交换机开发，尤其是电话信令协议（TDM - SS#7、E&M、R2 DIG 和 NGN - MEGCO MGCP、SIP），也从事过面向电话企业的 BSS 系统、SIP 路由系统部署与 VoIP PBX 实施工作。

* **Robison Gonsalves Tesini** —— 计算机工程师，1998 年毕业，在电信领域经验丰富，从事电信工作十年，其中最近四年专注于 SIP。
