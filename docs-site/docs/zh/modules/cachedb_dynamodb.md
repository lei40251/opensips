---
title: "cachedb_dynamodb 模块"
description: "本模块是一个缓存系统（cachedb）的实现，设计用于配合 Amazon DynamoDB 工作。"
---


## 管理指南 {#admin-guide}


### 概述 {#overview}


本模块是一个缓存系统（cachedb）的实现，设计用于配合 Amazon DynamoDB 工作。它使用 AWS SDK for C++ 库连接 DynamoDB 实例。它利用核心导出的键值（Key-Value）接口。
[https://aws.amazon.com/pm/dynamodb/](https://aws.amazon.com/pm/dynamodb/)


#### 功能 {#functionalities}


- *set*  - 使用 *cachedb_store* 函数在 DynamoDB 中设置键
- *get*  - 使用 *cachedb_fetch* 函数从 DynamoDB 查询键
- *remove*  - 使用 *cachedb_remove* 函数从 DynamoDB 中移除键
- *get_counter*  - 使用 *cachedb_counter_fetch* 函数从 DynamoDB
查询具有数值的键
- *add*  - 使用 *cachedb_add* 函数将特定项的值增加一个给定量
- *sub*  - 使用 *cachedb_sub* 函数将特定项的值减少一个给定量


以下内容由 OpenSIPS 内部使用：


- *map_get*
- *map_set*
- *map_remove*


#### 表格式与 TTL 选项 {#table-format-and-ttl-option}


配合 DynamoDB 使用的表必须遵循特定格式。
下面是创建表的示例：


```bash
aws dynamodb create-table \
--table-name TableName \
--attribute-definitions \
	AttributeName=KeyName,AttributeType=S \
--key-schema \
	AttributeName=KeyName,KeyType=HASH \
--provisioned-throughput \
	ReadCapacityUnits=5,WriteCapacityUnits=5 \
--table-class STANDARD
			
```


若使用上述命令创建表，则必须在 cachedb_url 中指定键：*modparam("cachedb_dynamodb", "cachedb_url", 
"dynamodb://localhost:8000/TableName?key=KeyName;val=ValName")"*


更多格式示例请参阅
[cachedb_url](#cachedb_url-string) 一节。


若要为表启用 TTL（Time to Live，存活时间），使其可用于 set、add 和 subtract 等操作，
可以用 TTL 选项更新该表：


```c
aws dynamodb update-time-to-live --table-name TableName --time-to-live-specification
"Enabled=true, AttributeName=ttl"
			
```


关于表格式与 TTL 选项的更多信息，请参阅以下链接：


[创建表](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/getting-started-step-1.html)


[Time to Live (TTL)](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/time-to-live-ttl-how-to.html)


### 优势 {#advantages}


- *可扩展且由 AWS 完全托管的 NoSQL 数据库服务*
- *与其他 AWS 服务集成，提供强大的安全
与可扩展能力*
- *通过跨多个 AWS 可用区复制数据，实现
高可用与持久性*
- *无服务器架构，降低运维开销*
- *提供个位数级别的响应时间，并借助 DynamoDB Accelerator（DAX）
获得更低的延迟*


### 限制 {#limitations}


- *高度依赖索引；缺少索引时，查询会进行代价高昂的全表扫描*
- *不支持表连接，限制了涉及多张表的复杂查询*
- *项大小限制：每个项的大小上限为 400KB，且无法提高。*


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


在加载本模块之前无需加载任何模块。


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，必须安装
以下库或应用程序：


- *AWS SDK for C++：*
按以下步骤即可在 Linux 系统上安装并配置 AWS SDK for C++，
从而与 DynamoDB 集成：
[AWS SDK for C++ Installation Guide](https://docs.aws.amazon.com/sdk-for-cpp/v1/developer-guide/setup-linux.html)
更多安装说明见：
[AWS SDK for C++ GitHub Repository](https://github.com/aws/aws-sdk-cpp)


#### 在本地计算机上部署 DynamoDB {#deploying-dynamodb-locally-on-your-computer}


出于测试目的，可以在本地运行 DynamoDB。为此应遵循
[这些](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DynamoDBLocal.DownloadingAndRunning.html)步骤在本地部署 dynamodb。


别忘了始终使用以下命令启动服务器：

`java -Djava.library.path=./DynamoDBLocal_lib -jar DynamoDBLocal.jar -sharedDb`
并要在解压 *DynamoDBLocal.jar* 的目录中执行。


### 导出的参数 {#exported-parameters}


#### cachedb_url (string) {#cachedb_url-string}


OpenSIPS 为了在脚本中使用 cache_store()、cache_fetch() 等操作而将要连接的
服务器组的 URL。该参数可以设置多次。URL 的前缀部分
是脚本中将使用的标识符。


URL 中可出现以下默认参数：


- *region* - 指定 DynamoDB 表所在的 AWS 区域
- *key* - 指定表的 Key 列；默认值为 *"opensipskey"*
- *val* - 指定表的 Value 列，cache_store、cache_fetch 等缓存操作
将作用于该列；默认值为 *"opensipsval"*


*cachedb_url* 的语法


- 使用先前创建的表时（必须指定 key 和 value）：

  - 主机与端口
*"dynamodb://id_host:id_port/tableName?key=key1;val=val1"*
  - 区域
*"dynamodb:///tableName?region=regionName;key=key2;val=val2"*
- 使用默认 key 和 value 时：

  - 主机与端口
*"dynamodb://id_host:id_port/tableName"*
  - 区域
*"dynamodb:///tableName?region=regionName"*


```opensips title="Set cachedb_url parameter"
...

# 单实例 URL
modparam("cachedb_dynamodb", "cachedb_url", "dynamodb://localhost:8000/table1")
modparam("cachedb_dynamodb", "cachedb_url", "dynamodb:///table2?region=central-1")


# 多实例 URL（将执行循环
```


```opensips title="Use Dynamodb servers"
...

cache_store("dynamodb", "call1", "10");
cache_store("dynamodb", "call2", "25", 150) // expires = 150s -optional
cache_fetch("dynamodb", "call1", $var(total));
cache_remove("dynamodb", "call1");


cache_store("dynamodb", "counter1", "200");
cache_sub("dynamodb", "counter1", 4, 1000); // expires = 1000s -mandatory parameter
cache_add("dynamodb", "call2", 5, 0) // -this update will not expire  -mandatory parameter
cache_remove("dynamodb", "counter1");

...
		
```


### 导出的函数 {#exported-functions}


本模块不导出在配置脚本中
使用的函数。
<!-- CONTRIBUTORS -->

### 许可证 {#license}

所有文档文件（即 .md 扩展名）均按 Creative Common License 4.0 许可发布。
