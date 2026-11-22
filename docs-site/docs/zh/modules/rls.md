---
title: "资源列表服务器"
description: "本模块是遵循 RFC 4662 与 RFC 4826 规范的资源列表服务器（Resource List Server）实现。"
sidebar: false
---


## 管理指南 {#admin-guide}


### 概述 {#overview}


本模块是遵循 RFC 4662 与 RFC 4826 规范的资源列表服务器
（Resource List Server）实现。


该服务器独立于本地呈现服务器，通过 Subscribe-Notify 消息获取呈现
信息。


本模块以库的方式使用 presence 模块，因为它需要一套类似的
机制来处理 Subscribe。因此，若本地呈现服务器
与资源列表服务器不在同一台机器上，presence 模块
应仅以库模式加载（参见 presence 模块文档）。


它以与事件无关的方式处理对列表的订阅。默认事件
为 presence，但若服务器需要处理其他事件，应
通过模块参数 "rls_events" 添加它们。


它配合 XCAP 服务器进行存储。也可以将其配置为
以 integrated_xcap 服务器模式工作，此时它只
向数据库查询资源列表文档。这在
所有客户端都使用集成式服务器、且其列表中没有
引用外部文档的小型架构中很有用。


与 presence 模块相同，它具有缓存模式，会定期把
订阅信息更新到数据库。通过 Notify
消息获取的信息仅存储在数据库中。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


以下模块必须先于本模块加载：


- *一个数据库模块*。
- *signaling*。
- *tm*。
- *presence* —— 以库模式。
- *pua*。
- *xcap*。


#### 外部库或应用程序 {#external-libraries-or-applications}


- *libxml-dev*。


### 导出的参数 {#exported-parameters}


#### rlsubs_table(str)


存储资源列表订阅信息的数据库表名。


*默认值为 "rls_watchers"。*


```opensips title="Set rlsubs_table parameter"
...
modparam("rls", "rlsubs_table", "rls_subscriptions")
...
```


#### rlpres_table(str)


存储已通知的事件特定信息的数据库表名。


*默认值为 "rls_presentity"。*


```opensips title="Set rlpres_table parameter"
...
modparam("rls", "rlpres_table", "rls_notify")
...
```


#### clean_period (int)


检查过期信息的周期。


*默认值为 "100"。*


```opensips title="Set clean_period parameter"
...
modparam("rls", "clean_period", 100)
...
```


#### waitn_time (int)


服务器尝试发送携带所订阅列表或观察者信息
最新呈现状态的 Notify 的定时器周期。


*默认值为 "50"。*


```opensips title="Set waitn_time parameter"
...
modparam("rls", "waitn_time", 10)
...
```


#### max_expires (int)


对列表的订阅可接受的最大 expires 值。


*默认值为 "7200"。*


```opensips title="Set max_expires parameter"
...
modparam("rls", "max_expires", 10800)
...
		
```


#### hash_size (int)


用于存储对列表的订阅的哈希表维度。
计算表大小时，该参数会被用作 2 的幂。


*默认值为 "9 (512)"。*


```opensips title="Set hash_size parameter"
...
modparam("rls", "hash_size", 11)
...
		
```


#### xcap_root (str)


xcap 服务器的地址。


*默认值为 "NULL"。*


```opensips title="Set hash_size parameter"
...
modparam("rls", "xcap_root", "http://192.168.2.132/xcap-root:800")
...
		
```


#### to_presence_code (int)


若所处理的 Subscribe 不是资源列表 Subscribe，
rls_handle_subscribe 函数返回的代码。
在 presence 与 rls 服务器同机部署的架构中，可用该代码
对导致此代码的消息调用 handle_subscribe。


*默认值为 "0"。*


```opensips title="Set to_presence_code parameter"
...
modparam("rls", "to_presence_code", 10)
...
		
```


#### rls_event (str)


RLS 默认处理的事件为 presence。若 RLS 还应处理
其他事件，可通过该参数添加。该参数可设置
多次。


*默认值为 "presence"。*


```opensips title="Set rls_event parameter"
...
modparam("rls", "rls_event", "dialog;sla")
...
		
```


#### presence_server (str)


呈现服务器的地址。它将被用作
RLS 服务器所发送 Subscribe 请求的出站代理，从而避免请求在
代理上进进出出、并不得不在代理的配置文件中
为这些消息添加特殊处理。


```opensips title="Set presence_server parameter"
...
modparam("rls", "presence_server", "sip:pres@opensips.org:5060")
...
		
```


#### contact_user (str)


这是用于 Contact 头域的用户名，适用于对 SUBSCRIBE 的 200 OK
应答、随后对话内（in-dialog）的 NOTIFY 请求，以及
RLS 服务器生成的 SUBSCRIBE 请求。
Contact 中的 IP 地址、端口与传输层将根据
接收或发送 SUBSCRIBE 的接口自动确定。


若设为空字符串，则不会向 contact 添加用户名，
contact 将仅由 IP、端口与传输层构成。


*默认值为 "rls"。*


```opensips title="Set contact_user parameter"
...
modparam("rls", "contact_user", "rls")
...
		
```


### 导出的函数 {#exported-functions}


#### rls_handle_subscribe()


本函数检测 Subscribe 消息是否应由
RLS 处理。若不是，则以配置的
to_presence_code 应答。若是，则提取对话信息，并发送
携带列表信息的聚合 Notify 请求。


本函数可在 REQUEST_ROUTE 中使用。


```opensips title="rls_handle_subscribe usage"
...
For presence and rls on the same machine:
	modparam(rls, "to_presence_code", 10)

	if(is_method("SUBSCRIBE"))
	{	
		$var(ret_code)= rls_handle_subscribe();

		if($var(ret_code)== 10)
				handle_subscribe();

		t_release();
	}

For rls only:
	if(is_method("SUBSCRIBE"))
	{
		rls_handle_subscribe();
		t_release();
	}

...
```


#### rls_handle_notify()


对于呈现服务器响应 RLS 所发送的 Subscribe 消息
而发出的 Notify 消息，必须调用本函数。


本函数可在 REQUEST_ROUTE 中使用。


它可以返回 3 种代码：


- *1* —— 该 Notify 位于 RLS 服务器可识别的
对话内，且已成功处理。
- *2* —— 该 Notify 不属于由 RLS 服务器
发起的对话。
- *-1* —— 处理过程中发生错误。


```opensips title="rls_handle_notify usage"
...
if($rm=="NOTIFY")
    rls_handle_notify();
...
```


### 导出的 MI 函数 {#exported-mi-functions}


#### rls_update_subscriptions


在 resources-list 或 rls-services 文档
被更新后，触发更新后端的订阅。


名称：*rls_update_subscriptions*


参数：


- presentity_uri：做出该变更、
且其订阅应被更新的用户的 uri


MI FIFO 命令格式：


```bash
opensips-cli -x mi rls_update_subscriptions sip:alice@atlanta.com
	
```


### 安装 {#installation}


本模块需要在 OpenSIPS 数据库中有 2 张表：rls_presentity
与 rls_watchers。创建它们的 SQL 语句可在
opensips/scripts 文件夹的数据库目录下的
rls-create.sql 脚本中找到。
也可以在项目网页上找到完整的数据库文档，
[https://opensips.org/docs/db/db-schema-devel.html](https://opensips.org/docs/db/db-schema-devel.html)。


## 开发者指南 {#developer-guide}


本模块不提供可供其他 OpenSIPS 模块使用的函数。
<!-- CONTRIBUTORS -->

### 许可证 {#license}

本项目的所有文档文件（即 .md 扩展名的文件）均以 Creative Common License 4.0 授权。
