---
title: "presence_xcapdiff 模块"
description: "presence_xcapdiff 是为 presence 与 pua 增加 \"xcap-diff\" 事件支持的 OpenSIPS 模块。"
---


## 管理指南 {#admin-guide}


### 概述 {#overview}


presence_xcapdiff 是为 presence 与 pua 增加 "xcap-diff" 事件支持的 OpenSIPS 模块。目前该模块只是注册该事件，并不做任何事件特定的处理。模块会自动判断 presence 和/或 pua 模块是否存在，若存在则向其注册 xcap-diff 事件。这使该模块能够仅依据上述模块是否出现在 OpenSIPS 配置中，就自动提供 presence 或 pua 相关功能，无需任何手工配置。


向 pua 注册该事件，使 XCAP 服务器可以在文档发生某种修改时发布 xcap-event。向 presence 注册该事件，则使客户端能够订阅该事件。


本模块预期与 OpenXCAP 服务器（www.openxcap.org）配合使用，不过它不含任何 OpenXCAP 特定代码，应可与任意 XCAP 服务器搭配使用。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


在加载本模块之前必须先加载以下模块：


- *presence* 模块 - 使客户端能够订阅 xcap-diff 事件包。
- *pua* 模块 - 能够在文档发生某种修改时发布 xcap-diff 事件。
- *pua_mi* 模块 - 使 pua 能够通过 MI 接口发布 xcap-diff 事件。若本模块打算与 OpenXCAP 配合使用，则需要该模块。


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块的情况下运行 OpenSIPS 之前，必须安装以下库或应用程序：


- *无*。
<!-- CONTRIBUTORS -->

### 许可证 {#license}

所有文档文件（即扩展名为 .md 的文件）均依据 Creative Common License 4.0 授权
