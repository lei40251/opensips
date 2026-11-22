---
title: "event_sqs 模块"
description: "event_sqs 模块是 Amazon SQS 生产者的一种实现。"
sidebar: false
---

## 管理指南 {#admin-guide}


### 概述 {#overview}


event_sqs 模块是 Amazon SQS 生产者的一种实现。它作为事件接口的传输后端，
同时提供独立的连接器，可在 OpenSIPS 脚本中使用，以便把消息发布到 SQS 队列。
[https://aws.amazon.com/sqs/](https://aws.amazon.com/sqs/)


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


本模块之前无需加载任何模块。


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，必须安装以下库或应用程序：


- *AWS SDK for C++：*
按以下步骤操作，即可在 Linux 系统上完成 AWS SDK for C++ 的安装与配置，
从而与 SQS 集成：
[AWS SDK for C++ 安装指南](https://docs.aws.amazon.com/sdk-for-cpp/v1/developer-guide/setup-linux.html)
更多安装说明参见：
[AWS SDK for C++ GitHub 仓库](https://github.com/aws/aws-sdk-cpp)


#### 在本机本地部署 Amazon SQS {#deploying-amazon-sqs-locally-on-your-computer}


出于测试目的，可以在本地运行 SQS。为此，在计算机上启动 localstack：


```c
pip install localstack
localstack start
		
```


不要忘记为测试设置必要的环境变量，例如：


```c
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION=us-east-1
		
```


这里可以找到一些 CLI 命令，例如 create-queue、send/receive-message 等：
[https://docs.aws.amazon.com/cli/latest/reference/sqs/](https://docs.aws.amazon.com/cli/latest/reference/sqs/)


### 导出的参数 {#exported-parameters}


#### queue_url (string)


该参数指定 SQS 队列的配置，可用于直接从脚本发布消息（使用 sqs_send_message()
函数），或使用 raise_event 函数发送消息。


该参数的格式为：[ID]sqs_url，其中 ID 是该 SQS 队列实例的标识符，sqs_url 是队列的
完整 URL。


queue_url 包含：


- *endpoint*
- *region*


该参数可以设置多次。


```opensips title="设置 queue_url 参数"
...

modparam("event_sqs", "queue_url",
	  "[q1]https://sqs.us-west-2.amazonaws.com/123456789012/Queue1")

modparam("event_sqs", "queue_url",
	  "[q2]http://sqs.us-east-1.localhost.localstack.cloud:4566/000000000000/Queue2")

...
		
```


### 导出的函数 {#exported-functions}


#### sqs_send_message(queue_id, message)


向 SQS 队列发布消息。由于实际的发送操作是异步完成的，该函数不会阻塞，
在把消息加入发送队列后立即返回。


该函数可在任意路由中使用。


该函数具有以下参数：


- *queue_id (string)* SQS 队列的 ID。必须是 `queue_url` modparam 定义的 ID 之一。
- *message (string)* - 要发布消息的载荷。


```opensips title="sqs_send_message() 函数用法"
...

$var(msg) = "Hello, this is a message to SQS!";
sqs_send_message("q1", $var(msg));

...
		
```


### 示例 {#examples}


#### 使用*事件接口*的事件驱动消息 {#event-driven-messaging-with-event-interface}


可以利用 OpenSIPS 的事件接口，通过订阅事件并在需要时触发事件来向 SQS 发送消息。


步骤：


- *事件订阅：*
首先，在 OpenSIPS 配置文件的 `startup_route` 中注册事件订阅：

  ```
  subscribe_event("MY_EVENT",
  	"sqs:http://sqs.us-east-1.localhost.localstack.cloud:4566/000000000000/Queue2");
  		
  ```
- *通过 CLI 订阅事件：*
启动 OpenSIPS 后，可以在另一个终端中使用 OpenSIPS CLI 订阅该事件：

  ```
  opensips-cli -x mi event_subscribe MY_EVENT \
  	  sqs:http://sqs.us-east-1.localhost.localstack.cloud:4566/000000000000/Queue2
  		
  ```
- *触发事件并发送消息：*
最后，要发送消息，用所需的消息内容触发已订阅的事件：

  ```
  opensips-cli -x mi raise_event MY_EVENT 'OpenSIPS Message'
  		
  ```
<!-- CONTRIBUTORS -->

### 许可证 {#license}

本项目的所有文档文件（即 .md 扩展名的文件）均以 Creative Common License 4.0 授权。
