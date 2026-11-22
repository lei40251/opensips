---
title: "cachedb_mongodb 模块"
description: "本模块是一个缓存系统的实现，设计用于配合 MongoDB 服务器工作。"
---


## 管理指南 {#admin-guide}


### 概述 {#overview}


本模块是一个缓存系统的实现，设计用于配合
MongoDB 服务器工作。
它实现了由 OpenSIPS 核心导出的键值（Key-Value）接口。


底层客户端库兼容以下任一
MongoDB 服务器版本：2.4、2.6、3.0、3.2 和 3.4，如
[MongoDB 文档](https://docs.mongodb.com/ecosystem/drivers/driver-compatibility-reference/)所述。


### 优势 {#advantages}


- *内存开销不再位于服务器上*
- *集群内可使用多台服务器，因此内存
实际上是无限的*
- *缓存 100% 持久。重启
OpenSIPS 服务器不会影响 DB。MongoDB 本身也是
持久的，因此也可以重启而不丢失信息。*
- *MongoDB 是一个开源项目，因此
可用它与其他各种应用程序
交换数据*
- *通过创建 MongoDB 集群，多个 OpenSIPS
实例可以轻松共享键值信息*
- *本模块还实现了 CacheDB 原始查询
能力，因此可以运行 MongoDB 后端支持的
任意查询，充分利用其后端能力。*


### 限制 {#limitations}


- *键（在键:值对中）不得包含空格或控制字符*


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


无。


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，必须安装以下软件包：


```bash title="Runtime requirements for 'cachedb_mongodb'"
# Debian / Ubuntu
sudo apt-get install libjson-c2 libmongoc-1.0

# Red Hat / CentOS
sudo yum install json-c mongo-c-driver
				
```


编译本模块需要以下软件包：


```bash title="Compilation requirements for 'cachedb_mongodb'"
# Debian / Ubuntu
sudo apt-get install libjson-c-dev libmongoc-dev libbson-dev

# Red Hat / CentOS
sudo yum install json-c-devel mongo-c-driver-devel
				
```


### 导出的参数 {#exported-parameters}


#### cachedb_url (string)


OpenSIPS 为了允许在 OpenSIPS 脚本中使用 cache_store()、cache_fetch() 等函数
而将要连接的服务器组的 URL。该参数可以设置多次。
URL 的前缀部分是脚本中将使用的
标识符。


URL 语法与 MongoDB 使用的语法完全相同，包括
连接字符串选项。更多信息
请参阅 [MongoDB 官方连接字符串文档](https://docs.mongodb.com/manual/reference/connection-string/)。


```opensips title="Set cachedb_url parameter"
...
# 连接到单个 mongod 实例
modparam("cachedb_mongodb", "cachedb_url",
         "mongodb://localhost:27017/opensipsDB.dialog")

# 连接到 mongod 副本集
modparam("cachedb_mongodb", "cachedb_url",
         "mongodb://10.0.0.10,10.0.0.11:27017/opensipsDB.dialog?replicaSet=my-set")

# 连接到 mongos 实例（路由到分片集群）
modparam("cachedb_mongodb", "cachedb_url",
         "mongodb://localhost/opensipsDB.dialog")

# 多个连接的示例：
#   * 连接主 mongos，并在故障时切换到备用 mongos
#   * 连接到单个 mongod
modparam("cachedb_mongodb", "cachedb_url",
         "mongodb:cluster://localhost,10.0.0.10:27017/opensipsDB.dialog")
modparam("cachedb_mongodb", "cachedb_url",
         "mongodb://localhost:27017/opensipsDB.userlocation")
...
```


```opensips title="Reference MongoDB connections"
...
cache_store("mongodb", "key", "$ru value");
cache_remove("mongodb:cluster", "key");
cache_fetch("mongodb:instance1", "key", $avp(10));
...
	
```


#### exec_threshold (int)


mongodb 查询可以持续的最大微秒数。
超过该阈值的任何情况都会向日志触发一条告警消息


*默认值为 "0（不限制 - 不告警）"。*


```opensips title="Set exec_threshold parameter"
...
modparam("cachedb_mongodb", "exec_threshold", 100000)
...
	
```


#### compat_mode_2.4 (int)


将模块切换为针对 MongoDB 2.4 服务器的兼容模式。
具体而言，这使得 "insert/update/delete" 原始查询不会失败，
因为这些查询是在 MongoDB 2.6 中引入的。模块会解析
原始查询 JSON，将其转换为对应的命令并执行它。


注意事项：此模式下仅支持最低限度必需的原始查询
选项。


*默认值为 "0（已禁用）"。*


```opensips title="Setting the compat_mode_2.4 parameter"
...
modparam("cachedb_mongodb", "compat_mode_2.4", 1)
...
	
```


#### compat_mode_3.0 (int)


将模块切换为针对 MongoDB 2.6/3.0 服务器的兼容模式。
具体而言，这使得 "find" 原始查询不会失败，
因为这些查询是在 MongoDB 3.2 中引入的。模块会解析
"find" 原始查询 JSON，将其转换为对应的命令并执行它。


注意事项：此模式下仅支持 "find" 原始查询最低限度必需的
选项。


*默认值为 "0（已禁用）"。*


```opensips title="Setting the compat_mode_3.0 parameter"
...
modparam("cachedb_mongodb", "compat_mode_3.0", 1)
...
	
```


### 导出的函数 {#exported-functions}


本模块不导出在配置脚本中
使用的函数。


### 原始查询语法 {#raw-query-syntax}


cachedb_mongodb 模块支持原始查询，从而充分
利用后端的能力，包括
查询专有选项，例如读/写偏好、超时、
过滤选项等。


查询语法与 mongo cli 完全相同。其文档
可在
[MongoDB 网站](https://docs.mongodb.com/manual/reference/command/nav-crud/)找到。查询结果
以 JSON 文档形式返回，后续可在 OpenSIPS 脚本中
使用 JSON 模块处理。


一些原始查询示例：


```opensips title="MongoDB Raw Insert"
...
cache_raw_query("mongodb:cluster", "{ \
    \"insert\": \"ip_blacklist\", \
    \"documents\": [{ \
        \"username\": \"$fU\", \
        \"ip\": \"$si\", \
        \"attempts\": 1 \
     }]}",
 "$avp(out)");
xlog("INSERT RAW QUERY returned $rc, output: '$avp(out)'\n");
...
			
```


```opensips title="MongoDB Raw Update"
...
cache_raw_query("mongodb:cluster", "{ \
    \"update\": \"ip_blacklist\", \
    \"updates\": [{ \
        \"q\": { \
            \"username\": \"$fU\", \
            \"ip\": \"$si\" \
         }, \
        \"u\": { \
            \"$$inc\": {\"attempts\": 1} \
         } \
      }]}",
 "$avp(out)");
xlog("UPDATE RAW QUERY returned $rc, output: '$avp(out)'\n");
...
			
```
<!-- CONTRIBUTORS -->

### 许可证 {#license}

所有文档文件（即 .md 扩展名）均按 Creative Common License 4.0 许可发布。
