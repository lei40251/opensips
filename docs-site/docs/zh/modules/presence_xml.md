---
title: "presence_xml 模块"
description: "本模块对使用 XML 消息体的 notify-subscribe 事件做专门处理。"
---

## 管理员指南 {#admin-guide}


### 概述 {#overview}


本模块对使用 XML 消息体的 notify-subscribe 事件做专门处理。它与通用事件处理模块 presence 配合使用，负责构造 3 个事件并将其添加到该模块中：presence、presence.winfo、dialog;sla。


当启用基于 XCAP 的授权时，本模块从 xcap_table 中读取 XCAP 权限规则文档。

呈现权限规则按照 RFC 4745 和 RFC 5025 中的规范进行解释。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


在加载本模块之前，必须先加载以下模块：


- *presence*。
- *signaling*。
- *xcap*。仅当 force_active 为 0 或 pidf_manipulation 为 1 时才是必填。
- *xcap_client*。仅当 force_active 为 0 且未使用集成的 XCAP 服务器（即未设置 'integrated_xcap_server' 参数）时才是必填。


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，必须先安装以下库或应用程序：


- *libxml-dev*。


### 导出的参数 {#exported-parameters}


#### force_active (int)


该参数用于处理 Subscribe 消息时的权限判断。若设为 1，订阅状态被视为 active，并且不会向 presentity 查询权限（若未使用 xcap 服务器，应设为 1）。若未启用 pidf_manipulation，该模式不需要 xcap 模块。否则将查询 xcap 服务器，订阅状态取决于用户定义的权限规则。若未为某个 watcher 定义规则，订阅将保持 pending 状态，发送的 Notify 也不带消息体。


> [!NOTE]
> 在两个取值之间切换时，必须清空 watchers 表。


*默认值为 "0"。*


```opensips title="设置 force_active 参数"
...
modparam("presence_xml", "force_active", 1)
...
```


#### pidf_manipulation (int)


将该参数设为 1 可启用 RFC 4827 中描述的特性。它使得即使电话不在线，也能向用户通告一种永久状态。呈现文档取自 xcap 服务器，并在每次向 watcher 发送 Notify 时与其他呈现信息（若存在）聚合在一起。即使不发出任何 Publish，也可以通告信息（适用于 email、SMS、MMS 之类的服务）。


*默认值为 "0"。*


```opensips title="设置 pidf_manipulation 参数"
...
modparam("presence_xml", "pidf_manipulation", 1)
...
```


#### xcap_server (str)


用于存储的 xcap 服务器地址。若 force_active 为 0 且未设置 integrated_xcap_server 参数，则该参数为必填。该参数可设置多次，以构造受信任 XCAP 服务器的地址列表。


```opensips title="设置 xcap_server 参数"
...
modparam("presence_xml", "xcap_server", "xcap_server.example.org")
modparam("presence_xml", "xcap_server", "xcap_server.ag.org")
...
```


#### pres_rules_auid (str)


若使用非集成的 xcap 模式，且需要使用默认 'pres-rules' 之外的 pres-rules auid，则应配置该参数。


```opensips title="设置 pres_rules_auid 参数"
...
modparam("presence_xml", "pres_rules_auid", "org.openmobilealliance.pres-rules")
...
```


#### pres_rules_filename (str)


若使用非集成的 xcap 模式，且需要配置默认 'index' 之外的文件名，则应配置该参数。


```opensips title="设置 pres_rules_filename 参数"
...
modparam("presence_xml", "pres_rules_filename", "pres-rules")
...
```


#### generate_offline_body (int)


若希望阻止 OpenSIPS 在发布过期或被显式终止（即收到带有 Expires: 0 的 PUBLISH 请求）时自动生成 PIDF 消息体，应将该参数设为 0。


```opensips title="设置 generate_offline_body 参数"
...
modparam("presence_xml", "generate_offline_body", 0)
...
```


### 导出的函数 {#exported-functions}


配置文件中没有需要使用的函数。


### 安装 {#installation}


本模块需要在 OpenSIPS 数据库中有 1 张表：xcap。创建该表的 SQL 语法可在 opensips/scripts 文件夹下各数据库目录中的 presence-create.sql 脚本中找到。完整的数据库文档也可在项目网页 https://opensips.org/docs/db/db-schema-devel.html 上找到。


## 开发者指南 {#developer-guide}


本模块不导出供其他 OpenSIPS 模块使用的函数。
<!-- CONTRIBUTORS -->

### 许可 {#license}

本项目的所有文档文件（即 .md 扩展名的文件）均以 Creative Common License 4.0 授权。
