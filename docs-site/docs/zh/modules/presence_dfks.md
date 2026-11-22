---
title: "presence_dfks 模块"
description: "本模块使 presence 模块能够处理 \"as-feature-event\" 事件包（由 Broadsoft 的 [Device Feature Key Synchronization](https://h30434.www3.hp.com/psg/attachments/psg/Desk_IP_Conference_Phones/1740/1/DeviceFeatureKeySynchronizationFD.pdf) 协议定义）。"
---


## 管理指南 {#admin-guide}


### 概述 {#overview}


本模块使 presence 模块能够处理 "as-feature-event" 事件包（由 Broadsoft 的
[Device Feature Key Synchronization](https://h30434.www3.hp.com/psg/attachments/psg/Desk_IP_Conference_Phones/1740/1/DeviceFeatureKeySynchronizationFD.pdf)
协议定义）。该功能可用于在 SIP 电话与 SIP 服务器之间同步勿扰（Do Not Disturb）以及各种前转类型等功能的状态。


本模块支持同步以下功能：勿扰（Do Not Disturb）、始终前转（Call Forwarding Always）、忙时前转（Call Forwarding Busy）和无应答前转（Call Forwarding No Answer）。功能状态既可从 SIP 电话更改，也可从 OpenSIPS 服务器更改（通过运行 MI 命令）。


处理不带消息体的 SUBSCRIBE 消息时，模块会为每个功能运行一个脚本路由，用于获取该功能的当前状态。反之，带消息体的 SUBSCRIBE 会触发一个脚本路由，其中可获得某个特定功能更新后的状态。如果功能更新是通过 MI 从 OpenSIPS 触发的，该路由也可能被运行。


> [!NOTE]
> 模块不会自动缓存或持久化任何功能信息，这部分由脚本编写者在模块触发的路由中实现。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


在使用本模块之前必须先加载以下模块：


- *presence*。


#### 外部库或应用程序 {#external-libraries-or-applications}


- *libxml2-dev*。


### 导出的参数 {#exported-parameters}


#### get_route (string)


为获取某个功能的状态而要运行的脚本路由名称。


*默认值为 "dfks_get"。*


```opensips title="设置参数"
...
modparam("presence_dfks", "get_route", "dfks_get")
...
```


#### set_route (string)


收到来自 SIP 电话的功能状态更新时要运行的脚本路由名称。


*默认值为 "dfks_get"。*


```opensips title="设置参数"
...
modparam("presence_dfks", "set_route", "dfks_set")
...
```


### 导出的函数 {#exported-functions}


无。


### 导出的 MI 函数 {#exported-mi-functions}


#### dfks_set_feature


触发向所有观察者发送包含功能状态更新的 NOTIFY 消息。


> [!NOTE]
> 调用该 MI 函数也会触发
> *set_route* 的运行。可通过检查
> *$dfks(param)* 变量是否存在，
> 判断该路由是否由 MI 函数触发。


名称：*dfks_set_feature*


参数：


- *presentity*：功能状态需要更新的用户的 URI
- *feature*：要更新的功能名称。取以下值之一：
  - *DoNotDisturb*
  - *CallForwardingAlways*
  - *CallForwardingBusy*
  - *CallForwardingNoAnswer*
- *status*：功能的新状态：
*0* - 禁用，*1* - 启用
- *route_param*：可选字符串参数，
传给 *set_route* 中的 *$dfks(param)* 变量。
- *values*：可为某个功能更新的额外值数组。数组元素的格式为：
*field*/*value*。支持的字段有：
    - *forwardTo* - 适用于所有前转类型
    - *ringCount* - 适用于 *CallForwardingNoAnswer*


MI FIFO 命令格式：
```bash
opensips-cli -x mi dfks_set_feature sip:alice@10.0.0.11 CallForwardingNoAnswer 1 1 \
ringCount/4 forwardTo/sip:bob@10.0.0.11
```


### 导出的伪变量 {#exported-pseudo-variables}


#### $dfks(field)


该伪变量可在模块触发的路由中使用，通过以下子名称处理功能信息：


- *assigned* - 将其设为 *0* 可通知 SIP 电话某个功能未被分配（NOTIFY 应答中将不包含该功能对应的 XML 数据）。默认情况下，功能均已分配。
- *notify* - 将其设为 *0* 可抑制 NOTIFY 消息的发送。默认情况下会发送 NOTIFY。
- *presentity* - 只读，返回当前的 presentity URI。
- *feature* - 只读，返回当前的功能名称。可能的值为：

  - *DoNotDisturb*
  - *CallForwardingAlways*
  - *CallForwardingBusy*
  - *CallForwardingNoAnswer*
- *status* - 读写功能状态。值为
*1* 表示启用，*0* 表示禁用。
- *param* - 返回由
*mi_dfks_set_feature* MI 函数传入的参数。如果未指定该参数，或者
*set_route* 不是由 MI 命令触发而是由
SIP 信令触发，则该字段为
*NULL*。
- *value/field* - 读写额外的功能值。
*field* 可以是以下之一：
    - *forwardTo* - 适用于所有前转类型
    - *ringCount* - 适用于 *CallForwardingNoAnswer*


```opensips title="dfks 用法"
...
route[dfks_set] {
    # 不允许 CallForwardingAlways
    if ($dfks(feature) == "CallForwardingAlways")
        $dfks(status) = 0;

    xlog("New status: $dfks(status) for feature '$dfks(feature)' of user '$dfks(presentity)'\n");
}
route[dfks_get] {
    if ($dfks(feature) == "CallForwardingNoAnswer") {
        $dfks(status) = 1;
        $dfks(value/forwardTo) = "sip:bob@10.0.0.11";
        $dfks(value/ringCount) = "3";
    } else if ($dfks(feature) == "CallForwardingAlways")
        $dfks(assigned) = 0;
    } else {
        ...
    }
}
...
	
```
<!-- CONTRIBUTORS -->

### 许可证 {#license}

本项目的所有文档文件（即 .md 扩展名的文件）均以 Creative Common License 4.0 授权。
