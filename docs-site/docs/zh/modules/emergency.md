---
title: "紧急呼叫模块 (emergency)"
description: "紧急呼叫模块为 OpenSIPS 提供紧急呼叫处理能力，遵循美国机构 NENA 的 architecture i2 规范。"
sidebar: false
---


## 管理员指南 {#admin-guide}


### 概述 {#overview}


紧急呼叫模块为 OpenSIPS 提供紧急呼叫处理能力，遵循美国机构 NENA（National Emergency Number Association，美国紧急号码协会）的 architecture i2 规范。NENA 方案把紧急呼叫路由到较近的网关（ESGW），再由该网关把呼叫转发到服务于主叫所在区域的 PSAP（负责应答紧急呼叫的呼叫中心），因此必须在 SIP 协议中考虑主叫位置信息的处理和传输。

为满足这一新需求，NENA 方案由若干服务器组成：用于确定位置的（LIS）、用于根据位置确定紧急处理区域的（VPC）、用于校验已存位置数据的（VDB）等。与这些要素一道，还有与这些服务器对接以路由呼叫的 SIP 代理。OpenSIPS 可通过本紧急模块承担这些 SIP 代理的功能，并可根据所提出的场景，承担 Call Server、Redirect Server 和 Routing Proxy 的角色：


- 场景 I：VSP（VoIP 服务提供商）保留对紧急呼叫处理的控制权。VSP 的 Call Server 实现 v2 接口，向 VPC 查询路由信息，据此选择合适的 ESGW；若常规路由失败，则使用应急号码（LRO）经 PSTN 路由呼叫。
- 场景 II：VSP 使用 v6 SIP 接口把所有紧急呼叫转交给 Routing Proxy 提供商。转交完成后，VSP 不再参与该呼叫。Routing Proxy 提供商实现 v2 接口，向 VPC 查询路由信息，并转发该呼叫。
- 场景 III：VSP 向 Redirect Server 运营方请求路由信息，但仍保留在呼叫中。Redirect Server 从 VPC 获取路由信息。它把呼叫连同置于 SIP Contact 头域中的路由信息返回给 VSP 的 Call Server。Call Server 依据该信息选择合适的 ESGW。


紧急模块使 OpenSIPS 在所述场景中扮演 Call Server、Proxy 或 Routing/Redirect Server 的角色，具体取决于配置方式。


1.2. 场景 I：发起呼叫的 VSP 同时也是处理该呼叫的一方，并向 VPC 发送路由信息请求。

紧急模块通过 emergency_call() 命令检查收到的 INVITE 是否为紧急呼叫。若是，OpenSIPS 会从 INVITE 的特定头域和消息体中获取主叫位置信息。结合这些信息与本模块定义的配置参数，OpenSIPS 实现 v2 接口，向 VPC 查询路由信息（即 ESQK、LRO，以及 ERT 或 ESGWRI），并依据 ESGWRI 选择合适的 ESGW。呼叫结束时 OpenSIPS 收到 BYE 请求，它会通知 VPC 清理基于该呼叫的数据。
OpenSIPS 通过 failure() 命令，在常规路由失败时尝试使用国家应急号码（LRO）经 PSTN 路由呼叫。


1.3. 场景 II：VSP 把呼叫转交给 Routing Server 提供商

紧急模块通过 emergency_call() 命令检查收到的 INVITE 是否为紧急呼叫。若是，则把呼叫转发给 Routing Proxy，由后者与 VPC 对接并路由该呼叫。
OpenSIPS 将退出该呼叫，此后 OpenSIPS 收到的该对话的所有请求都会被转发给 Routing Server。


1.4. 场景 III：VSP 向 Redirect Server 请求路由信息

紧急模块通过 emergency_call() 命令检查收到的 INVITE 是否为紧急呼叫。若是，则向 Redirect Server 请求路由信息。Redirect Server 与 VPC 对接，并在 Contact 头域中携带路由信息，向 VSP 的 Call Server 返回应答。
Call Server 使用该信息处理呼叫。紧急呼叫结束时，必须通知 Redirect Server，再由其通知 VPC 释放资源。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


在加载本模块之前，必须先加载以下模块：


- *Dialog - 对话模块.*。
- *TM - 事务模块.*。
- *RR - Record-Route 模块.*。


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，必须先安装以下库或应用程序：


- *libcurl*。


### 导出的参数 {#exported-parameters}


#### db_url (string)


必须指定数据库 URL。


*默认值为 "NULL"。*


```opensips title="设置 db_url 参数"
...
modparam("emergency", "db_url", "mysql://opensips:opensipsrw@localhost/opensips”)
...
		
```


#### db_table_routing (string)


存储紧急呼叫路由信息的数据库表名称。


*默认值为 "emergency_routing"。*


```opensips title="设置 db_table_routing 参数"
...
modparam("emergency", "db_table_routing", "emergency_routing")
...
		
```


#### db_table_report (string)


存储紧急呼叫报告的数据库表名称。


*默认值为 "emergency_report"。*


```opensips title="设置 db_table_report 参数"
...
modparam("emergency", "db_table_report", "emergency_report")
...
		
```


#### db_table_provider (string)


存储参与紧急呼叫的组织节点信息的数据库表名称。


*默认值为 "emergency_service_provider"。*


```opensips title="设置 db_table_provider 参数"
...
modparam("emergency", "db_table_provider", "emergency_service_provider")
...
		
```


#### proxy_role (integer)


该参数定义 OpenSIPS 处理紧急呼叫时承担的角色：
- 0 – OpenSIPS 是场景 I 中的 Call Server。在此角色下，
OpenSIPS 实现 V2 接口，直接向 VPC 查询
ESGWRI/ESQK，依据 ESGWRI 选择合适的 ESGW，并在路由失败时
使用 LRO 经 PSTN 路由呼叫。
- 1 – OpenSIPS 是场景 II 中的 Call Server，把紧急呼叫的 INVITE
发送给 Routing Proxy 提供商。Routing Proxy 提供商
实现 V2 接口。
- 2 - OpenSIPS 是场景 II 中的 Routing Proxy。在此角色下，
OpenSIPS 实现 V2 接口，直接向 VPC 查询
ESGWRI/ESQK，依据 ESGWRI 选择合适的 ESGW，并在路由失败时
使用 LRO 经 PSTN 路由呼叫。
- 3 - OpenSIPS 是场景 III 中的 Redirect Proxy，接收来自 Call Server 的
紧急呼叫 INVITE。Redirect Server 从 VPC 获取
ESGWRI/ESQK，并在 SIP 3xx 应答中发送给
Call Server。
- 4 - OpenSIPS 是场景 III 中的 Call Server，把紧急呼叫的 INVITE
发送给 Redirect Server。Redirect Server 从 VPC 获取
ESGWRI/ESQK，并在 SIP 应答的 Contact 头域中携带
ESGWRI/ESQK，把呼叫返回给 OpenSIPS。OpenSIPS
依据 ESGWRI 选择合适的 ESGW。


*默认值为 "0"。*


```opensips title="设置 proxy_role 参数"
...
modparam("emergency", "proxy_role", 0))
...
		
```


#### url_vpc (string)


OpenSIPS 向紧急呼叫请求路由信息所用的 VPC URL。
该 VPC URL 的格式为 IP:Port


*默认值为 "空字符串"。*


```opensips title="设置 url_vpc 参数"
...
modparam("emergency", "url_vpc", “192.168.0.103:5060”)
...
		
```


#### emergency_codes (string)


本地紧急号码。OpenSIPS 使用该号码识别紧急呼叫，
此外还识别 RFC-5031 定义的默认用户名（urn:service.sos.）。
随号码应给出该代码的简要说明。
格式为 代码编号-说明。可注册多个紧急
号码。


*默认值为 "NULL"。*


```opensips title="设置 emergency_codes 参数"
...
modparam("emergency", "emergency_codes", “911-us emegency code”)
...
		
```


#### timer_interval (integer)


设置轮询时间间隔，用于把 db_table_routing
复制到内存中。


*默认值为 "10"。*


```opensips title="设置 timer_interval 参数"
...
modparam("emergency","timer_interval",20)
...
		
```


#### contingency_hostname (string)


contingency_hostname 是服务器的 URL，该服务器将使用应急号码
把呼叫路由到 PSTN。


*默认值为 "NULL"。*


```opensips title="设置 contingency_hostname 参数"
...
modparam("emergency","contingency_hostname",“176.34,29.102:5060”)
...
		
```


#### emergency_call_server (string)


emergency_call_server 是在场景 II 中处理紧急呼叫的
Routing Proxy/Redirect Server 的 URL。如果 OpenSIPS
作为场景 II 中的 Call Server（proxy_role = 1 且 flag_third_enterprise = 0）
或场景 III 中的 Call Server（proxy_role = 2），则该参数为必填。


*默认值为 "NULL"。*


```opensips title="设置 emergency_call_server 参数"
...
modparam("emergency","emergency_call_server",“124.78.29.123:5060”)
...
		
```


### 导出的函数 {#exported-functions}


#### emergency_call()


检查呼入呼叫是否为紧急呼叫，若是则进行处理，
并把呼叫路由到 VPC 确定的目的地。

如果是紧急呼叫且处理成功，该函数返回 true。


该函数可在 *REQUEST* 路由中使用。


```opensips title="emergency_call() 用法"
...
# 紧急呼叫处理示例
if (emergency_call()){
    xlog("emergency call\n");
    t_on_failure("emergency_call");
    t_relay();
    exit;
}
...
		
```


#### failure()


该函数用于在尝试把紧急呼叫路由到 VPC 指定的目的地
而失败时，作最后一次尝试，改用应急号码。

如果应急处理成功，该函数返回 true。


该函数可在 *FAILURE* 路由中使用。


```opensips title="failure() 用法"
...
# 紧急呼叫中使用应急号码的示例
if (failure()) {
   if (!t_relay()) {
      send_reply(500,"Internal Error");
   };
   exit;
}
...
		
```
<!-- CONTRIBUTORS -->

### 许可 {#license}

本项目的所有文档文件（即 .md 扩展名的文件）均以 Creative Common License 4.0 授权。
