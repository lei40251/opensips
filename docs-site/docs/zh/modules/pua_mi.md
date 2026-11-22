---
title: "pua_mi 模块"
description: "pua_mi 提供通过 MI 传输通道发布呈现信息以及订阅呈现信息的能力。"
---


## 管理指南 {#admin-guide}


### 概述 {#overview}


pua_mi 提供通过 MI 传输通道发布呈现信息以及订阅呈现信息的能力。


借助该模块，可以创建独立的应用程序或脚本来发布与 SIP 无关的信息（例如 CPU 使用率、内存、活跃订阅者数量等系统资源）。此外，该模块还允许不支持 SIP 的应用程序订阅保存在 SIP 呈现服务器中的呈现信息。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


在使用本模块之前必须先加载以下模块：


- *pua*


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，必须安装以下库或应用程序：


- *无*


### 导出的参数 {#exported-parameters}


#### presence_server (str)


呈现服务器的地址。若设置该参数，发送 PUBLISH 请求时会把它用作出站代理。


```opensips title="设置 presence_server 参数"
...
modparam("pua_mi", "presence_server", "sip:pa@opensips.org:5075")
...
	
```


### 导出的函数 {#exported-functions}


本模块不导出可在配置脚本中使用的函数。


### 导出的 MI 函数 {#exported-mi-functions}


#### pua_publish


命令参数：


- *presentity_uri* - 例如 sip:system@opensips.org
- *expires* - 相对过期时间，单位为秒（例如 3600）。
- *event_package* - 发布信息所针对的事件包（例如 presence）。
- *content_type*（可选）- 发布信息的 Content-Type（例如 application/pidf+xml）。若提供该参数，则 *body* 参数也为必填。
- *etag*（可选）- 发布时必须匹配的 ETag。
- *extra_headers*（可选）- 添加到 PUBLISH 请求中的额外头域。
- *body*（可选）- 发布请求的消息体，包含发布的信息；若没有发布信息则可不提供。对于 FIFO 传输，它必须是单行。若提供该参数，则 *content_type* 参数也为必填。


```bash title="pua_publish FIFO 示例"
opensips-cli -x mi pua_publish sip:system@opensips.org 3600 presence application/pidf+xml <?xml version='1.0'?><presence xmlns='urn:ietf:params:xml:ns:pidf' xmlns:dm='urn:ietf:params:xml:ns:pidf:data-model' xmlns:rpid='urn:ietf:params:xml:ns:pidf:rpid' xmlns:c='urn:ietf:params:xml:ns:pidf:cipid' entity='system@opensips.org'><tuple id='0x81475a0'><status><basic>open</basic></status></tuple><dm:person id='pdd748945'><rpid:activities><rpid:away/>away</rpid:activities><dm:note>CPU:16 MEM:476</dm:note></dm:person></presence>
```


#### pua_subscribe


命令参数：


- *presentity_uri* - 例如 sip:presentity@opensips.org
- *watcher_uri* - 例如 sip:watcher@opensips.org
- *event_package*
- *expires* - 订阅期望有效期的相对时间，单位为秒。


```bash title="pua_subscribe FIFO 示例"
opensips-cli -x mi pua_subscribe sip:system@opensips.org sip:400@opensips.org presence 3600
```
<!-- CONTRIBUTORS -->

### 许可证 {#license}

本项目的所有文档文件（即 .md 扩展名的文件）均以 Creative Common License 4.0 授权。
