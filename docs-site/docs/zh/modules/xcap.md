---
title: "XCAP 模块"
description: "本模块包含所有使用 XCAP 能力的模块共用的若干参数和函数。"
---

## 管理指南 {#admin-guide}


### 概述 {#overview}


本模块包含所有使用 XCAP 能力的模块
共用的若干参数和函数。


目前使用本模块的模块有：presence_xml、rls 和 xcap_client。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


在使用本模块之前必须加载以下模块：


- *一个数据库模块*。


### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行
OpenSIPS 之前，必须安装以下库或应用程序：


- *libxml-dev*。


### 导出的参数 {#exported-parameters}


#### db_url(str)


数据库 URL。


*默认值为 "mysql://opensips:opensipsrw@localhost/opensips"。*


```opensips title="设置 db_url 参数"
...
modparam("xcap", "db_url", "dbdriver://username:password@dbhost/dbname")
...    
```


#### xcap_table(str)


存储 XCAP 文档的数据库表名。


*默认值为 "xcap"。*


```opensips title="设置 xcap_table 参数"
...
modparam("xcap", "xcap_table", "xcap")
...    
```


#### integrated_xcap_server (int)


该参数是用于标记所使用的 XCAP 服务器类型的标志位。
如果使用集成式服务器（例如来自 AG Projects 的 OpenXCAP），
可直接访问数据库表，则该参数应设置为正数。集成式服务器
除了更新 xcap 表之外，还必须在用户修改规则文档时发送
MI 命令 refershWatchers [pres_uri] [event]。


*默认值为 "0"。*


```opensips title="设置 integrated_xcap_server 参数"
...
modparam("xcap", "integrated_xcap_server", 1)
...
```


### 导出的函数 {#exported-functions}


无在配置文件中使用的函数。


## 开发者指南 {#developer-guide}


本模块导出了若干参数和函数，供其他多个模块使用。


### bind_xcap_api(xcap_api_t* api)


该函数用于绑定所需的函数。


```c title="xcap_api 结构"
...
typedef struct xcap_api {
        int integrated_server;
        str db_url;
        str xcap_table;
        normalize_sip_uri_t normalize_sip_uri;
        parse_xcap_uri_t parse_xcap_uri;
        get_xcap_doc_t get_xcap_doc;
} xcap_api_t;
...
```


### normalize_xcap_uri


该函数对 XCAP 文档中出现的 SIP URI 进行规范化。它会去除转义，
并在缺少 SIP scheme 时补上。返回一个包含
规范化结果的静态分配字符串缓冲区。


参数：


- *uri* -
需要规范化的 URI


### parse_xcap_uri


该函数解析给定的 XCAP URI。


参数：


- *uri* -
需要解析的 URI，字符串格式
- *xcap_uri* -
将被填充解析信息的 xcap_uri_t 结构
  ```
  Parameter type:
  ...
  typedef struct {
      char buf[MAX_URI_SIZE];
      str uri;
      str root;
      str auid;
      str tree;
      str xui;
      str filename;
      str selector;
  } xcap_uri_t;
  ...
  ```


### get_xcap_doc


该函数向本地数据库查询所需的 XCAP 文档。它会返回该文档及其
对应的 etag。


参数：


- *user* -
文档所有者 URI 的 user 部分
- *domain* -
文档所有者 URI 的 domain 部分
- *type* -
所请求文档的类型，表示 AUID，可以是 PRES_RULES、RESOURCE_LISTS、
RLS_SERVICES、PIDF_MANIPULATION、OMA_PRES_RULES 之一
- *filename* -
如果指定，将用于匹配文档文件名，默认为 'index'
- *match_etag* -
如果指定，仅当文档的 etag 与之匹配时才返回该文档
- *doc* -
返回文档的存储引用
- *etag* -
返回文档 etag 的存储引用


### db_url


XCAP 模块将要连接的数据库 URL。


### xcap_table


用于存储 XCAP 文档的表名。默认为 'xcap'。


### integrated_server


布尔标志位，指示 XCAP 服务器是否有权访问本地数据库，还是
将使用 xcap_client 获取文档。
<!-- CONTRIBUTORS -->

### 许可证 {#license}

所有文档文件（即以 .md 为扩展名的文件）均按 Creative Common License 4.0 许可发布
