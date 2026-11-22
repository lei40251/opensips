---
title: "呈现用户代理模块"
description: "该模块为 OpenSIPS 充当呈现用户代理客户端提供内部支持，通过发送 Subscribe 和 Publish 消息实现。"
sidebar: false
---

## 管理指南 {#admin-guide}


### 概述 {#overview}


该模块为 OpenSIPS 充当呈现用户代理（Presence User Agent）客户端提供内部支持，
通过发送 Subscribe 和 Publish 消息实现。


注意，该模块并不提供可直接在脚本中使用的功能，而是（通过内部 API）为其他特定事件的
模块提供此 PUA 客户端支持，以便执行 PUA 客户端操作。


构建在 PUA 模块之上的一些模块包括 pua_mi、pua_usrloc、pua_dialoginfo、pua_bla
和 pua_xmpp。pua_mi 提供了通过 fifo 发布任意类型信息或订阅某个资源的能力。
pua_usrloc 模块调用 pua 模块导出的函数，为未实现客户端到服务器呈现的客户端发布
基础的呈现信息，例如基本状态 "open" 或 "closed"。
pua_dialoginfo 通过发布通话中各参与者的状态（如振铃、已建立、已终止）来提供 BLF 支持。
通过 pua_bla，OpenSIPS 增加了桥接线路显示（BRIDGED LINE APPEARANCE）功能。
pua_xmpp 模块充当 SIP 与 XMPP 之间的网关，使 jabber 与 SIP 客户端可以交换呈现信息。


该模块使用缓存存储呈现体（presentity）列表，并在定时器中写入数据库，以便在重启后恢复。


> [!NOTE]
> 该模块不得在 no fork 模式下使用（所用的加锁机制在 no fork 模式下可能导致死锁）。


### PUA 集群 {#pua-clustering}


从 3.2 版本开始，该模块也扩展了集群支持。这意味着配置了 PUA 模块的多个 OpenSIPS
实例可以协同工作。例如，对某个呈现体的发布可以由集群中的不同节点（PUA OpenSIPS
实例）完成。


集群支持是数据库共享与 OpenSIPS 集群机制的混合。当某个呈现体被其中一个节点修改时，
OpenSIPS 集群层用于在集群内广播通知（这样集群中的其他节点可以通过数据库刷新该
呈现体）。


共享数据库用于在节点之间共享实际的呈现体数据。节点仅将自身创建的呈现体或自身处理过的
呈现体缓存到内存中。如果节点需要对某个呈现体执行操作，该呈现体记录可能会（从数据库）
加载到内存中。


> [!IMPORTANT]
> 由于实际的呈现体数据是通过数据库在节点之间共享的（集群层仅用于通知），
> 因此必须为数据库设置非常低的更新间隔（用于将数据从内存缓存刷写到数据库），
> 以尽可能实时地更新数据库内容。参见 [update_period](#update_period-int)
> 模块参数，推荐取值如 2-5 秒。


在 OpenSIPS 集群层上，PUA 模块使用共享标签（sharing-tag）机制，在集群所有节点之间
控制由哪个节点负责对呈现体执行过期操作（如发送 expires 为 0 的 PUBLISH）。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


必须先加载以下模块才能加载本模块：


- *一个数据库模块*。
- *tm*。
- *clusterer*，如果设置了 cluster_id
模块参数并启用了集群支持。


#### 外部库或应用程序 {#external-libraries-or-applications}


加载本模块运行 OpenSIPS 之前，必须先安装以下库或应用程序：


- *libxml*。


### 导出的参数 {#exported-parameters}


#### hash_size (int)


用于存储 Subscribe 与 Publish 信息的哈希表大小。
该参数在计算表大小时将作为 2 的幂次使用。


*默认值为 "9"。*


```opensips title="Set hash_size parameter"
...
modparam("pua", "hash_size", 11)
...
```


#### db_url (str)


数据库 URL。


*默认值为 ">mysql://opensips:opensipsrw@localhost/opensips"。*


```opensips title="Set db_url parameter"
...
modparam("pua", "db_url" "dbdriver://username:password@dbhost/dbname")
...
```


#### db_table (str)


数据库表的名称。


*默认值为 "pua"。*


```opensips title="Set db_table parameter"
...
modparam("pua", "db_table", "pua")
...
```


#### min_expires (int)


Publish 与 Subscribe 的 expires 下限。


*默认值为 "300"。*


```opensips title="Set min_expires parameter"
...
modparam("pua", "min_expires", 0)
...
```


#### default_expires (int)


在未配置该信息时使用的默认 expires 值。


*默认值为 "3600"。*


```opensips title="Set default_expires parameter"
...
modparam("pua", "default_expires", 3600)
...
```


#### update_period (int) {#update_period-int}


数据库和哈希表中的信息应进行更新的间隔。
对于哈希表而言，更新即删除已过期的消息。


*默认值为 "30"。*


> [!IMPORTANT]
> 如果对该模块使用集群支持，请在此设置较低的值，如 2-5，参见上文集群章节。


```opensips title="Set update_period parameter"
...
modparam("pua", "update_period", 100)
...
```


#### cluster_id (int)


PUA 数据应被复制/共享到的集群 ID。
仅在需要集群模式时才使用该参数。
要理解集群 ID 的概念，请参见 *clusterer* 模块。


关于 PUA 集群的更多内容，参见
[PUA 集群](#pua-clustering) 章节。


*默认值为 "None"。*


```opensips title="Set cluster_id parameter"
...
modparam("pua", "cluster_id", 10)
...
```


#### cluster_sharing_tag (str) {#cluster_sharing_tag-str}


PUA 模块在创建任何新的呈现体记录时所使用的集群共享标签。该标签用于决定由哪个
OpenSIPS 实例（将该标签持有为 active 的实例）负责使该呈现体过期。
仅在需要集群模式时才使用该参数。
要理解共享标签的概念，请参见 *clusterer* 模块。


关于 PUA 集群的更多内容，参见
[PUA 集群](#pua-clustering) 章节。


*默认值为 "NULL"。*


```opensips title="Set cluster_sharing_tag parameter"
...
modparam("pua", "cluster_sharing_tag", "vip")
...
```


### 导出的函数 {#exported-functions}


#### pua_update_contact()


远端目标可以通过对话中后续请求的 Contact 更新。在 PUA 观察者（watcher）场景中
（发送 SUBSCRIBE 消息），这意味着后续 Subscribe 消息的远端目标可以在任何时候
由 Notify 消息的 Contact 更新。
如果在收到 Notify 消息时于请求路由中调用该函数，它将尝试更新已存储的远端目标。


该函数可在 REQUEST_ROUTE 中使用。


*返回码：*


- *1 - 成功*。
- *-1 - 出错*。


```opensips title="pua_update_contact usage"
...
if($rm=="NOTIFY")
    pua_update_contact();
...
```


### 安装 {#installation}


该模块需要在 OpenSIPS 数据库中创建 1 张表：pua。创建该表的 SQL 语句可在
opensips/scripts 文件夹下各数据库目录中的 presence_xml-create.sql
脚本中找到。完整的数据库文档也可在项目网页
[https://opensips.org/docs/db/db-schema-devel.html](https://opensips.org/docs/db/db-schema-devel.html) 上找到。


## 开发者指南 {#developer-guide}


该模块提供以下函数，可供其他 OpenSIPS 模块使用。


### bind_pua(pua_api_t* api)


该函数绑定 pua 模块，并用导出的函数填充该结构。


```c title="pua_api structure"
...
typedef struct pua_api {
	send_subscribe_t send_subscribe;
	send_publish_t send_publish;
	query_dialog_t is_dialog;
	register_puacb_t register_puacb;
	add_pua_event_t add_event;
	is_shtag_active_t is_shtag_active;
} pua_api_t;
...
```


### is_shtag_active


字段类型：


```c
...
typedef int (*is_shtag_active_t)(void);
...
```


如果 pua 共享标签（参见
[cluster_sharing_tag](#cluster_sharing_tag-str)）在本节点上处于 active 状态，
或者未启用集群，则返回 1，否则返回 0。类似 pua 的模块在发布集群每个节点
都能看到的变更（例如 `pua_usrloc` 中的 contact 过期）之前会调用它，
以确保只有一个节点发布该变更。


### send_publish


字段类型：


```c
...
typedef int (*send_publish_t)(publ_info_t* publ);
...
				
```


该函数接收一个包含 Publish 所需信息的结构体作为参数，并发送一条 Publish 消息。


作为参数接收的结构体：


```c
...
typedef struct publ_info

  str id;             /*  (optional )a value unique for one combination
                          of pres_uri and flag */
  str* pres_uri;      /*  the presentity uri */	
  str* body;          /*  the body of the Publish message; 
                          can be NULL in case of an update expires*/ 	
  int  expires;       /*  the expires value that will be used in
                          Publish Expires header*/	
  int flag;           /*  it can be : INSERT_TYPE or UPDATE_TYPE
                          if missing it will be established according 
                          to the result of the search in hash table*/ 	
  int source_flag;    /*  flag identifying the resource ;
                          supported values: UL_PUBLISH, MI_PUBLISH,
                          BLA_PUBLISH, XMPP_PUBLISH*/
  int event;          /*  the event flag;
                          supported values: PRESENCE_EVENT, BLA_EVENT,
                          MWI_EVENT */
  str content_type;   /*  the content_type of the body if present
                          (optional if the same as the default value
                          for that event)*/
  str* etag;          /*  (optional) the value of the etag the request
                          should match */
  str* extra_headers  /*  (optional) extra_headers that should be added
                          to Publish msg*/
  publrpl_cb_t* cbrpl;/*  callback function to be called when receiving
                          the reply for the sent request */
  void* cbparam;      /*  extra parameter for tha callback function */

  str outbound_proxy; /*  the outbound proxy to be used when sending
							the Publish request*/

}publ_info_t;
...
		
```


回调函数类型：


```c
...
typedef int (publrpl_cb_t)(struct sip_msg* reply, void*  extra_param);
...
		
```


### send_subscribe


字段类型：


```c
...
typedef int (*send_subscribe_t)(subs_info_t* subs);
...
```


该函数接收一个包含 Subscribe 所需信息的结构体作为参数，并发送一条 Subscribe 消息。


作为参数接收的结构体：


```c
...
typedef struct subs_info

  str id;              /*  an id value unique for one combination
                           of pres_uri and flag */
  str* pres_uri;       /*  the presentity uri */	
  str* watcher_uri;    /*  the watcher uri */
  str* contact;        /*  the uri that will be used in
                           Contact header*/  
  str* remote_target;  /*  the uri that will be used as R-URI
                           for the Subscribe message(not compulsory;
                           if not set the value of the pres_uri field
                           is used) */
  str* outbound_proxy; /*  the outbound_proxy to use when sending the 
                           Subscribe request*/
  int event;           /*  the event flag; supported value: 
                           PRESENCE_EVENT, BLA_EVENT, PWINFO_EVENT*/ 
  int expires;         /*  the expires value that will be used in
                           Subscribe Expires header */	
  int flag;            /*  it can be : INSERT_TYPE or UPDATE_TYPE
                           not compulsory */	
  int source_flag;     /*  flag identifying the resource ;
                           supported values:  MI_SUBSCRIBE, 
                           BLA_SUBSCRIBE, XMPP_SUBSCRIBE,
                           XMPP_INITIAL_SUBS */
}subs_info_t;
...
```


### is_dialog


字段类型：


```c
...
typedef int  (*query_dialog_t)(ua_pres_t* presentity);
...
				
```


该函数检查该参数是否对应一个已存储的、由 Subscribe 发起的对话。


```opensips title="pua_is_dialog usage example"
...	
	if(pua_is_dialog(dialog) < 0)
	{
		LM_ERR("querying dialog\n");
		goto error;
	}
...	
```


### register_puacb


字段类型：


```c
...
typedef int (*register_puacb_t)(int types, pua_cb f, void* param );
...
				
```


该函数注册一个回调，在收到已发送 Subscribe 请求的应答消息时调用。
type 参数应设置为与该请求的 source_flag 相同。
注册为 pua 回调的函数应为 pua_cb 类型，即：
typedef void (pua_cb)(ua_pres_t* hentity, struct msg_start * fl);
其参数分别是该请求的对话结构和应答消息的首行。


```c title="register_puacb usage example"
...
	if(pua.register_puacb(XMPP_SUBSCRIBE, Sipreply2Xmpp, NULL) & 0)
	{
		LM_ERR("Could not register callback\n");
		return -1;
	}
...	
	
```


### add_event


字段类型：


```c
...
typedef int (*add_pua_event_t)(int ev_flag, char* name, 
   char* content_type,evs_process_body_t* process_body);

- ev_flag     : an event flag defined as a macro in pua module		
- name        : the event name to be used in Event request headers
- content_type: the default content_type for Publish body for 
                that event (NULL if winfo event)
- process_body: function that processes the received body before 
                using it to construct the PUBLISH request
                (NULL if winfo event)
...
				
```


该函数允许向 pua 模块注册新事件。
目前 pua 模块支持 4 种事件：presence、
presence;winfo、message-summary、dialog;sla。这些事件由 pua 模块内部注册。


process_body 的字段类型：


```c
...
typedef int (evs_process_body_t)(struct publ_info* publ, 
  str** final_body, int ver, str* tuple);
- publ      : the structure received as a parameter in send_publish 
              function ( initial body found in publ->body)
- final_body: the pointer where the result(final_body) should be stored 
- ver       : a counter for the sent Publish requests
              (used for winfo events)
- tuple     : a unique identifier for the resource;
              if an initial Publish it should be returned as a result
              and it will be stored  for that record, otherwise it will
              be given as a parameter;    
...
				
```


```c title="add_event usage example"
...
	if(pua.add_event((PRESENCE_EVENT, "presence", "application/pidf+xml", 
				pres_process_body) & 0)
	{
		LM_ERR("Could not register new event\n");
		return -1;
	}
...	
	
```
<!-- CONTRIBUTORS -->

### 许可证 {#license}

所有文档文件（即 .md 扩展名）均按 Creative Common License 4.0 许可协议授权。
