---
title: "launch_darkly 模块"
description: "本模块实现了对 Launch Darkly 功能管理云的支持。"
sidebar: false
---

## 管理指南 {#admin-guide}


### 概述 {#overview}


本模块实现了对
[Launch Darkly](https://launchdarkly.com/) 功能
管理云的支持。该模块提供与该云之间的连接能力，以及
查询功能标志的能力。


OpenSIPS 使用 Launch Darkly 提供的[服务端 C/C++ SDK](https://launchdarkly.com/features/sdk/)。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


以下模块必须在本模块之前加载：


- *无*。


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，必须安装以下库或应用程序：


- *ldserverapi*


*ldserverapi* 必须从官方
[GITHUB repository](https://github.com/launchdarkly/c-server-sdk) 编译并安装。


该库的快速安装步骤（注意：为与 OpenSIPS 模块兼容，必须将其编译为共享库）：


```bash
...
$ git clone https://github.com/launchdarkly/c-server-sdk.git
$ cd c-server-sdk
$ cmake -DBUILD_SHARED_LIBS=On -DBUILD_TESTING=OFF .
$ sudo make install
...
```


### 导出的参数 {#exported-parameters}


#### sdk_key (string)


用于连接该服务的 LaunchDarkly SDK key。该参数为必填参数。


```opensips title="Set sdk_key parameter"
...
modparam("launch_darkly", "sdk_key", "sdk-12345678-abcd-12ab-1234-0123456789abc")
...
```


#### ld_log_level (string)


由 LD SDK/库用于记录其内部消息的 LaunchDarkly 专用日志级别。
注意，LD 库产生的这些日志（依据该 ld_log_level）还会进一步
根据 OpenSIPS 整体的 log_level 进行过滤。


可接受的值为
*LD_LOG_FATAL*、
*LD_LOG_CRITICAL*、
*LD_LOG_ERROR*、
*LD_LOG_WARNING*、
*LD_LOG_INFO*、
*LD_LOG_DEBUG*、
*LD_LOG_TRACE*。


若未设置或设置为不支持的值，
默认将使用 *LD_LOG_WARNING* 级别。


```opensips title="Set log_level parameter"
...
modparam("launch_darkly", "ld_log_level", "LD_LOG_CRITICAL")
...
```


#### connect_wait (integer)


连接 LD 服务时的等待时间（单位：毫秒）。
首次连接 LD 服务失败的情况，可通过增大该等待值来解决。


默认值为 500 毫秒。


```opensips title="Set connect_wait parameter"
...
modparam("launch_darkly", "connect_wait", 100)
...
```


#### re_init_interval (integer)


在模块启动时无法初始化 LD 连接的情况下，再次尝试
初始化 LD 客户端的最小时间间隔（单位：秒）。在此类失败情形下，
模块会在脚本检查功能标志时按需自动重试初始化其 LD 客户端，
但不会早于 `re_init_interval`。注意：如果没有需要执行的功能标志
检查，重新初始化可能会晚于 `re_init_interval` 才被尝试。


默认值为 10 秒。


```opensips title="Set re_init_interval parameter"
...
modparam("launch_darkly", "re_init_interval", 30)
...
```


### 导出的函数 {#exported-functions}


#### ld_feature_enabled( flag, user, [user_extra], [fallback])


用于评估 LaunchDarkly 布尔功能标志的函数。


如果该标志为 TRUE 则返回 *1*，
否则返回 *-1*。


出错时，将返回回退值（TRUE 或 FALSE）。在此类情况下，
回退的 TRUE 以 2 返回，回退的 FALSE 以 -2 返回，因此可以
区分真正的 TRUE（由 LD 服务返回）与因错误导致的回退 TRUE。


该函数可在任意路由中使用。


该函数具有以下参数：


- *flag*（string）- 要评估的标志的键。
不能为 NULL 或空。
- *user*（string）- 用于评估
该标志的用户。不能为 NULL 或空。
- *user_extra*（AVP，可选）- 一个 AVP，
包含一个或多个要附加到用户的键值属性。
AVP 值的格式为
"key=value"。
- *fallback*（int，可选）- 出错时
返回的值。默认情况下返回 FALSE。


```opensips title="ld_feature_enabled() function usage"
	...
	$avp(extra) = "domainId=123456";
	if (ld_feature_enabled("my-flag","opensips", $avp(extra), false))
		xlog("-------TRUE\n");
	else
		xlog("-------FALSE\n");
	...
	
```
<!-- CONTRIBUTORS -->

### 许可 {#license}

所有文档文件（即 .md 扩展名）均以 Creative Common License 4.0 许可发布。
