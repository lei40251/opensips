---
title: "pua_usrloc 模块"
description: "pua_usrloc 是 usrloc 与 pua 模块之间的连接器。"
---


## 管理指南 {#admin-guide}


### 概述 {#overview}


pua_usrloc 是 usrloc 与 pua 模块之间的连接器。它构建了针对用户位置记录在特定事件下发送 PUBLISH 请求的环境（例如，当 usrloc 中新增一条记录时，发出状态为 open（在线）的 PUBLISH；当记录过期时，发送 closed（离线））。


使用本模块，不支持呈现功能的电话也可被视为在线/离线。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


在加载本模块之前必须先加载以下模块：


- *usrloc*。
- *pua*。


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块的情况下运行 OpenSIPS 之前，必须安装以下库或应用程序：


- *libxml*。


### 导出的参数 {#exported-parameters}


#### default_domain (str)


构造 presentity URI 时使用的默认域，用于所记录 aor 中缺失该域的情况。


*默认值为 "NULL"。*


```opensips title="Set default_domain parameter"
...
modparam("pua_usrloc", "default_domain", "opensips.org")
...
```


#### entity_prefix (str)


构造要添加到 XML PIDF 呈现节点中的 entity 属性时使用的前缀。
（例如 pres:user@domain ）。


*默认值为 "NULL"。*


```opensips title="Set presentity_prefix parameter"
...
modparam("pua_usrloc", "entity_prefix", "pres")
...
```


#### presence_server (str)


呈现服务器的地址。若设置，则在发送 PUBLISH 请求时用作出站代理。


```opensips title="Set presence_server parameter"
...
modparam("pua_usrloc", "presence_server", "sip:pa@opensips.org:5075")
...
	
```


### 导出的函数 {#exported-functions}


#### pua_set_publish()


该函数用于标记那些必须发出 PUBLISH 的 REGISTER 请求。当 REGISTER 保存到 location 表时即发出 PUBLISH。


```opensips title="pua_set_publish usage"
...
if(is_method("REGISTER") && $fu=~"john@opensips.org") 
	pua_set_publish();
...
```
<!-- CONTRIBUTORS -->

### 许可证 {#license}

所有文档文件（即扩展名为 .md 的文件）均依据 Creative Common License 4.0 授权
