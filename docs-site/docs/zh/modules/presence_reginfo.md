---
title: "presence_reginfo 模块"
description: "该模块使 presence 模块内部能够处理 \"Event: reg\"（定义于 RFC 3680）。"
---


## 管理指南 {#admin-guide}


### 概述 {#overview}


本模块使 presence 模块内部能够处理 "Event: reg"（定义于 RFC 3680）。这可用于把注册信息（registration-info）状态分发给已订阅的观察者（watcher）。


本模块目前未实现任何授权规则。它假定 PUBLISH 请求只由授权的应用发出，SUBSCRIBE 请求只由授权的用户发出。因此，在调用 handle_publish() 和 handle_subscribe() 函数之前，可以在 OpenSIPS 配置文件中轻松完成授权。


注意：本模块只是激活 presence 模块中对 "reg" 的处理。要向观察者发送对话信息（dialog-info），还需要有向 presence 模块 PUBLISH 注册信息的来源。例如可以使用 pua_reginfo 模块或任意外部组件。这种做法允许把呈现服务器与具备注册信息感知能力的发布者（例如主代理）部署在不同的 OpenSIPS 实例上。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


在加载本模块之前必须先加载以下模块：


- *presence*。


#### 外部库或应用程序 {#external-libraries-or-applications}


无。


### 导出的参数 {#exported-parameters}


#### default_expires (int)


SUBSCRIBE 消息中缺失 expires 值时使用的默认 expires 值（单位为秒）。


*默认值为 "3600"。*


```opensips title="Set default_expires parameter"
...
modparam("presence_reginfo", "default_expires", 3600)
...

```


#### aggregate_presentities (int)


是否把全部注册 presentity 聚合到单个 NOTIFY 消息体中。在初始 SUBSCRIBE 之后的第一个 NOTIFY 中携带全部注册信息时很有用。


*默认值为 "0"（禁用）。*


```opensips title="Set aggregate_presentities parameter"
...
modparam("presence_reginfo", "aggregate_presentities", 1)
...
					
```


### 导出的函数 {#exported-functions}


无可在配置文件中使用的函数。
<!-- CONTRIBUTORS -->

### 许可证 {#license}

所有文档文件（即扩展名为 .md 的文件）均依据 Creative Common License 4.0 授权
