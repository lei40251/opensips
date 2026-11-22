---
title: "AAA RADIUS 模块"
description: "该模块为来自核心的 AAA API 提供了一个 Radius 实现。"
---


## 管理指南 {#admin-guide}


### 概述 {#overview}


该模块为来自核心的 AAA API 提供了一个 Radius 实现。


它还提供两个可在脚本中使用的函数，用于生成自定义的 Radius 计费请求和鉴权请求。
模块会自动且透明地完成对 Radius 应答中 SIP-AVP 的检测与处理。


自 2.2 版本起，aaa_radius 模块支持异步操作。但要使用它们，必须应用
modules/aaa_radius 文件夹中包含的补丁，名为 *radius_async_support.patch*。要
做到这一点，必须拥有 freeradius-client 源码。为此可以按照
文档末尾的教程操作。


任何希望使用该 API 的模块都必须执行以下操作：


- *包含 aaa.h*
- *使用合适的 radius 专用 url 发起 bind 调用*


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


无。


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，必须安装
以下库之一：


- *radiusclient-ng* 0.5.0 或更高版本。参见 [http://developer.berlios.de/projects/radiusclient-ng/](http://developer.berlios.de/projects/radiusclient-ng/)。
- *freeradius-client*。参见 [http://freeradius.org/](http://freeradius.org/)。


可以在编译模块之前将 RADIUSCLIENT 环境变量设置为以下值之一，
以强制指定所使用的 radius 库：


- *RADCLI* - 将使用 libradcli-dev 库；
- *FREERADIUS* - 将使用 libfreeradius-client-dev 库；
- *RADIUSCLIENT* - 将使用 libradiusclient-ng 库；


> [!IMPORTANT]
> 如果所选库未安装，模块将无法编译。

> [!NOTE]
> 如果未设置 RADIUSCLIENT 环境变量，模块将按
> 以下顺序尝试查找三个 radius 库之一：radcli、freeradius、radiusclient-ng。也就是说，如果已安装 radcli 库，
> 则使用它；否则将查找 freeradius，依此类推。


### 导出的参数 {#exported-parameters}


#### sets (string)


在构建自定义 RADIUS 请求（输入 RADIUS AVP 集合）或从
RADIUS 应答中获取数据（输出 RADIUS AVP 集合）时要使用的 Radius AVP 集合。


集合定义的格式如下：


- " set_name = ( attribute_name1 = var1 [, attribute_name2 = var2 ]* ) "


赋值左侧必须是 RADIUS 字典中已知的属性名。


赋值右侧必须是脚本伪变量或
脚本 AVP。有关它们的更多信息，请参见 [CookBooks - Scripting Variables](https://docs.opensips.org/manual/3-6/script-corevar/)。


```opensips title="Set sets parameter"
...
modparam("aaa_radius","sets","set4  =  (  Sip-User-ID  =   $avp(10)
			,   Sip-From-Tag=$si,Sip-To-Tag=$tt      )      ")
...

...
modparam("aaa_radius","sets","set1 = (User-Name=$var(usr), Sip-Group = $var(grp),
			Service-Type = $var(type)) ")
...

...
modparam("aaa_radius","sets","set2 = (Sip-Group = $var(sipgrup)) ")
...
```


#### radius_config (string)


Radiusclient 配置文件。


该参数是可选的。仅在使用 radius_send_acct
和 radius_send_auth 函数时才需要设置。


```opensips title="Set radius_config parameter"
...
modparam("aaa_radius", "radius_config", "/etc/radiusclient-ng/radiusclient.conf")
...
```


#### syslog_name (string)


启用客户端库向 syslog 记录日志，使用给定的日志名称。


该参数是可选的。Radius 客户端库会尝试使用 syslog
以给定的 ident 字符串报告错误（例如字典方面的问题）。如果设置了该参数，
则这些错误在 syslog 中可见。
否则错误将被隐藏。


默认情况下该参数未设置（不记录日志）。


```opensips title="Set syslog_name parameter"
...
modparam("aaa_radius", "syslog_name", "aaa-radius")
...
```


#### fetch_all_values (integer)


对于输出集合，该参数控制是否应返回（同一
RADIUS AVP 的）所有值（否则只返回第一个值）。
启用该选项时，请确保用于获取 RADIUS 输出的变量
能够存储多个值（例如 AVP 变量）。


出于向后兼容的原因，该参数默认禁用
（设为 0）。


```opensips title="Set fetch_all_values parameter"
...
modparam("aaa_radius", "fetch_all_values", 1)
...
```


### 导出的函数 {#exported-functions}


#### radius_send_auth(input_set_name, output_set_name)


该函数可在脚本中使用，用于发起自定义的
radius 鉴权请求。该函数接受两个参数。


参数：


- *input_set_name*（string）- 包含将
构成鉴权请求的属性与 pvar 列表的集合名称（参见 "sets"
模块参数）。
- *output_set_name*（string）- 包含将从
鉴权应答中提取的属性与 pvar 列表的集合名称（参见 "sets"
模块参数）。


这些集合必须使用 "sets" 导出
参数定义。


如果鉴权成功，函数返回 TRUE（retcode 1）；如果在鉴权过程中
发生错误（任何类型的错误），返回 FALSE（retcode -1）；
如果鉴权被 RADIUS 服务器拒绝或否认，返回 FALSE（retcode -2）。


该函数可在 REQUEST_ROUTE、FAILURE_ROUTE、ONREPLY_ROUTE、BRANCH_ROUTE、ERROR_ROUTE 和 LOCAL_ROUTE 中使用。


```opensips title="radius_send_auth usage"
...
radius_send_auth("set1","set2");
switch ($rc) {
	case 1:
		xlog("authentication ok \n");
		break;
	case -1:
		xlog("error during authentication\n");
		break;
	case -2:
		xlog("authentication denied \n");
		break;
}
...

	
```


#### radius_send_acct(input_set_name)


该函数可在脚本中使用，用于发起自定义的
radius 计费请求。该函数只接受一个字符串参数，
该参数表示包含将构成计费请求的属性
与 pvar 列表的集合名称。


只需要一个集合作为参数，因为无法从
计费应答中提取任何 AVP。


集合必须使用 "sets" 导出参数定义。


该函数可在 REQUEST_ROUTE、FAILURE_ROUTE、ONREPLY_ROUTE、BRANCH_ROUTE、ERROR_ROUTE 和 LOCAL_ROUTE 中使用。


```opensips title="radius_send_acct usage"
...
radius_send_acct("set1");
...

	
```


### 导出的异步函数 {#exported-asynchronous-functions}


#### radius_send_auth(input_set_name, output_set_name)


该函数可在脚本中使用，用于发起自定义的
radius 鉴权请求。


参数：


- *input_set_name*（string）- 包含将
构成鉴权请求的属性与 pvar 列表的集合名称（参见 "sets"
模块参数）。
- *output_set_name*（string）- 包含将从
鉴权应答中提取的属性与 pvar 列表的集合名称（参见 "sets"
模块参数）。


这些集合必须使用 "sets" 导出
参数定义。


如果鉴权成功，函数返回 TRUE（retcode 1）；如果在鉴权过程中
发生错误（任何类型的错误），返回 FALSE（retcode -1）；
如果鉴权被 RADIUS 服务器拒绝或否认，返回 FALSE（retcode -2）。


```opensips title="radius_send_auth usage"
...
{
async( radius_send_auth("set1","set2"), resume);
}

route[resume] {
switch ($rc) {
	case 1:
		xlog("authentication ok \n");
		break;
	case -1:
		xlog("error during authentication\n");
		break;
	case -2:
		xlog("authentication denied \n");
		break;
}
...

	
```


#### radius_send_acct(input_set_name)


该函数可在脚本中使用，用于发起自定义的
radius 计费请求。该函数只接受一个字符串参数，
该参数表示包含将构成计费请求的属性
与 pvar 列表的集合名称。


只需要一个集合作为参数，因为无法从
计费应答中提取任何 AVP。


集合必须使用 "sets" 导出参数定义。


该函数可在 REQUEST_ROUTE、FAILURE_ROUTE、ONREPLY_ROUTE、BRANCH_ROUTE、ERROR_ROUTE 和 LOCAL_ROUTE 中使用。


```opensips title="radius_send_acct usage"
...
{
async( radius_send_acct("set1","set2"), resume);
}

route[resume] {
xlog(" accounting finished\n");
}

...

	
```


## 使用 radius 异步功能 {#using-radius-async}


### 下载 radius-client 库 {#downloading-radius-client-library}


可以从[此处](ftp://ftp.freeradius.org/pub/freeradius/freeradius-client-1.1.7.tar.gz)下载最新的 freeRADIUS 客户端库源码。
因此第一步是将这些源码下载到你想要的任意文件夹中。
在本示例中，我们将该文件夹统称为
*freeRADIUS-client*。下载源码后，
解压归档文件的内容。


```bash title="downloading the library"
........
mkdir freeRADIUS-client; cd freeRADIUS-client
wget ftp://ftp.freeradius.org/pub/freeradius/freeradius-client-1.1.7.tar.gz
tar -xzvf freeradius-client-1.1.7.tar.gz
........
	
```


### 应用补丁 {#applying-the-patch}


解压归档文件的内容后，可以应用名为
*radius_async_support.patch* 的补丁，该补丁可在 OpenSIPS 源码文件夹中的
*modules/aaa_radius/* 下找到。
必须将该补丁应用到 freeRADIUS-client 库上；之后
就可以像往常一样使用 configure 和 make 命令安装该 radius 库，
并自由使用该库。


```bash title="How to apply the patch"
........
cd freeRADIUS-client/freeradius-client-1.1.7.tar.gz
patch -p1 < /path/to/opensips/modules/aaa_radius/radius_async_support.patch
./configure --any-options-you-want
make
sudo make install
........
	
```
<!-- CONTRIBUTORS -->

### 许可证 {#license}

所有文档文件（即 .md 扩展名）均按 Creative Common License 4.0 许可发布。
