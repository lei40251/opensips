---
title: "XCAP 客户端模块 (xcap_client)"
description: "本模块是 OpenSIPS 的 XCAP 客户端，可供其他模块使用。"
---


## 管理员指南 {#admin-guide}


### 概述 {#overview}


本模块是 OpenSIPS 的 XCAP 客户端，可供其他模块使用。
它通过发送 HTTP GET 请求来获取 XCAP 元素，既可以是文档，也可以是文档的一部分。
它还支持条件查询。
它使用 libcurl 库作为客户端 HTTP 传输库。


本模块提供 xcap 客户端接口，其中的通用函数
可用于向 xcap 服务器请求特定的元素。
除此之外，它还提供将收到的文档存储并更新到
数据库的服务。这种情况下，只需向本模块发起一次初始
请求——xcapGetNewDoc——即相当于请求模块从此之后
负责处理所引用的文档，从而保证数据库中始终
存在最新版本。


更新方式同样可配置：
既可以使用周期性查询（适用于任何类型的 xcap
服务器），也可以使用服务器在发生更新时应发送的
MI 命令。


本模块当前由 presence_xml 模块使用，前提是未设置
'integrated_xcap_server' 参数。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


使用本模块前必须先加载以下模块：


- *xcap*。


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，必须先安装以下库或应用程序：


- *libxml-dev*。
- *libcurl-dev*。


### 导出的参数 {#exported-parameters}


#### periodical_query(int)


用于禁用「周期性查询」这一更新方式的标志位，该方式适用于
本模块负责的文档。当 xcap 服务器能够在发生变化时发送所导出的
MI 命令，或由 OpenSIPS 中的其他模块
处理更新时，可以禁用周期性查询。


将其设为 0 即可禁用。


默认值为 *"1"*。


```opensips title="设置 periodical_query 参数"
...
modparam("xcap_client", "periodical_query", 0)
...
```


#### query_period(int)


在未禁用周期性查询时应设置此项。
表示应向 xcap 服务器查询更新的时间间隔。


将其设为 0 即可禁用。


默认值为 *"100"*。


```opensips title="设置 query_period 参数"
...
modparam("xcap_client", "query_period", 50)
...
```


### 导出的函数 {#exported-functions}


无可在配置文件中使用的函数。


### 导出的 MI 函数 {#exported-mi-functions}


#### refreshXcapDoc


当已存储的文档发生变化时，应由 xcap 服务器发送的
MI 命令。


名称：*refreshXcapDoc*


参数：


- doc_uri：文档的 uri
- port：xcap 服务器的端口


MI FIFO 命令格式：


```bash
...
opensips-cli -x mi refreshXcapDoc /xcap-root/resource-lists/users/eyebeam/buddies-resource-list.xml 8000
...
```


## 开发者指南 {#developer-guide}


本模块导出了一组函数，可用于从 xcap 服务器选择
并获取元素，也可用于注册一个回调，当收到 MI 命令 refreshXcapDoc
且所涉及的文档已被取回时调用该回调。


### bind_xcap_client_api(xcap_client_api_t* api)


本函数用于绑定所需的函数。


```c title="xcap_client_api 结构"
...
typedef struct xcap_client_api {
	
	/* xcap node selection and retrieving functions*/
	xcap_get_elem_t get_elem;
	xcap_nodeSel_init_t int_node_sel;
	xcap_nodeSel_add_step_t add_step;
	xcap_nodeSel_add_terminal_t add_terminal;
	xcap_nodeSel_free_t free_node_sel;
	xcapGetNewDoc_t getNewDoc; /* an initial request for the module 
	fo fetch this document that does not exist in xcap db table
	and handle its update*/

	/* function to register a callback to document changes*/
	register_xcapcb_t register_xcb;
}xcap_client_api_t;
...
```


### get_elem


字段类型：


```c
...
typedef char* (*xcap_get_elem_t)(char* xcap_root,
xcap_doc_sel_t* doc_sel, xcap_node_sel_t* node_sel);
...
```


本函数发送 HTTP 请求，从 xcap 服务器获取指定的信息。


各参数含义：


- *xcap_root*-
XCAP 服务器地址；
- *doc_sel*-
包含文档选择信息的结构；
	```
	Parameter type:
	...
	typedef struct xcap_doc_sel
	{
	str auid; /* application defined Unique ID*/
	int type; /* the type of the path segment
				after the AUID  which must either
				be GLOBAL_TYPE (for "global") or
				USERS_TYPE (for "users") */ 
	str xid; /* the XCAP User Identifier 
				if type is USERS_TYPE */
	str filename; 
	}xcap_doc_sel_t;
	...
	```
- *node_sel*-
包含节点选择信息的结构；
	```
	Parameter type:
	...
	typedef struct xcap_node_sel
	{
	step_t* steps;
	step_t* last_step;
	int size;
	ns_list_t* ns_list;
	ns_list_t* last_ns;
	int ns_no;

	}xcap_node_sel_t;

	typedef struct step
	{
	str val;
	struct step* next;
	}step_t;

	typedef struct ns_list
	{
	int name;
	str value;
	struct ns_list* next;
	}ns_list_t;
	...
	```
节点选择器表示为一系列步骤（step），这些步骤
会以 '/' 分隔的形式体现在路径字符串中。
节点的命名空间同样存放在一个列表中，形式为
名称与值的关联，其中的值需要填入
对应步骤的字符串 val 字段。
构建节点结构时应使用 xcap_api
结构中的以下函数：'int_node_sel'、'add_step'，以及（在需要时）
'add_terminal'。
如果目的是获取整个文档，则该参数必须
为 NULL。


### register_xcb


字段类型：


```c
...
typedef int (*register_xcapcb_t)(int types, xcap_cb f);
...
```


- 'types' 参数可以是 PRES_RULES、RESOURCE_LISTS、
RLS_SERVICES、OMA_PRES_RULES 和 PIDF_MANIPULATION 的组合值。


- 回调函数的类型为：


```c
...
typedef int (xcap_cb)(int doc_type, str xid, char* doc);
...
```
<!-- CONTRIBUTORS -->

### 许可 {#license}

所有文档文件（即 .md 扩展名的文件）均以 Creative Common License 4.0 授权。
