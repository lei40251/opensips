---
title: "sipcapture 模块"
description: "提供将入站/出站 SIP 消息存储到数据库的能力。"
---


## 管理员指南 {#admin-guide}


### 概述 {#overview}


提供将入站/出站 SIP 消息存储到数据库的能力。


OpenSIPS 可以通过三种模式捕获 SIP 消息


- IPIP 封装。（ETHHDR+IPHDR+IPHDR+UDPHDR）。
- 监控/镜像端口。
- Homer 封装协议模式（HEP v1/2/3）。自 2.2 版本起，借助 proto_hep 模块提供了新的 HEPv3 支持。同时还添加了对 HEPv3 的头域操作支持。详见 [hep_set()](#hep_setchunk_id-chunk_data-data_type-vendor_id)。如需了解 HEP 协议的更多信息，请查阅此[链接](https://github.com/sipcapture/HEP/blob/master/docs/HEP3_rev11.pdf)。


捕获功能可以通过 fifo 命令开启/关闭。


opensips-cli -x mi sip_capture on


opensips-cli -x mi sip_capture off


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


在本模块之前必须先加载以下模块：


- *database 模块* - mysql、postgres、
dbtext、unixodbc……
- *proto_hep 模块* - 如果使用 HEP 捕获


#### 外部库或应用程序 {#external-libraries-or-applications}


在使用本模块运行 OpenSIPS 之前，必须安装以下库或应用程序：


- *无*。


### 导出参数 {#exported-parameters}


#### db_url (str)


数据库 URL。


*默认值为 ""。*


```opensips title="设置 db_url 参数"
...
modparam("sipcapture", "db_url", "mysql://user:passwd@host/dbname")
...
```


#### table_name (str)


用于存储 SIP 消息的表名。自 2.2 版本起，它支持类似 strftime 的后缀，以便使用按时间格式化的表名。


*默认值为 "sip_capture"。*


```opensips title="设置 table_name 参数"
...
modparam("sipcapture", "table_name", "homer_capture")

/* 每天更换表名 */
modparam("sipcapture", "table_name", "homer_%m_%d")
/* 如果今天是 13-04-2014，它将扩展为 homer_04_13 */
...
```


#### rtcp_table_name (str)


用于存储通过 report_capture 函数捕获的数据包的表名。自 2.2 版本起，它支持类似 strftime 的后缀，以便使用按时间格式化的表名。


*默认值为 "rtcp_capture"。*


```opensips title="设置 rtcp_capture 参数"
...
modparam("sipcapture", "rtcp_table_name", "homer_capture")

/* 每小时更换表名 */
modparam("sipcapture", "rtcp_table_name", "homer_%m_%d_%H")
/* 如果今天是 13-04-2014 13:05 pm，它将扩展为 homer_04_13_13 */
...
```


#### capture_on (integer)


用于全局启用/禁用捕获的参数（on(1)/off(0)）


*默认值为 "0"。*


```opensips title="设置 capture_on 参数"
...
modparam("sipcapture", "capture_on", 1)
...
```


#### hep_capture_on (integer)


用于启用/禁用 HEP 捕获的参数（on(1)/off(0)）


*默认值为 "0"。*


```opensips title="设置 hep_capture_on 参数"
...
modparam("sipcapture", "hep_capture_on", 1)
...
```


#### max_async_queries (integer)


用于设置同一时刻执行的已捕获数据包 'INSERT' 查询的最大数量，仅当数据库支持异步操作时有效。如果 OpenSIPS 被关闭，剩余的查询将被执行。查询缓冲区限制为 65535 个字符，因此同一时刻最多可能执行 30-40 个查询，这主要取决于所插入 SIP 消息的大小，因为它是查询中最大的部分。


*默认值为 "5"。*


```opensips title="设置 max_async_queries 参数"
...
modparam("sipcapture", "max_async_queries", 3)
...
```


#### raw_ipip_capture_on (integer)


用于启用/禁用 IPIP 捕获的参数（on(1)/off(0)）


*默认值为 "0"。*


```opensips title="设置 raw_ipip_capture_on 参数"
...
modparam("sipcapture", "raw_ipip_capture_on", 1)
...
```


#### raw_moni_capture_on (integer)


用于启用/禁用监控/镜像端口捕获的参数（on(1)/off(0)）。在 raw 套接字上只能启用一种模式！监控端口捕获目前仅在 Linux 上受支持。


*默认值为 "0"。*


```opensips title="设置 raw_moni_capture_on 参数"
...
modparam("sipcapture", "raw_moni_capture_on", 1)
...
	
```


#### raw_socket_listen (string)


该参数指定用于 IPIP 捕获的 RAW 套接字的监听 IP 地址。你还可以为 IPIP/镜像模式定义端口/端口范围，以捕获特定端口上的 SIP 消息：
"10.0.0.1:5060" - SIP 消息的源/目的端口必须等于 5060
"10.0.0.1:5060-5090" - SIP 消息的源/目的端口必须等于 5060，或介于 5060 和 5090 之间。
如果计划使用镜像捕获，则必须定义端口/端口范围！在这种情况下，IP 地址部分将被忽略，但为了让解析器正常工作，请使用例如 10.0.0.0


*默认值为 ""。*


```opensips title="设置 raw_socket_listen 参数"
...
modparam("sipcapture", "raw_socket_listen", "10.0.0.1:5060-5090")
...
modparam("sipcapture", "raw_socket_listen", "10.0.0.1:5060")
...
```


#### raw_interface (string)


在 raw 套接字上绑定的接口名称。


*默认值为 ""。*


```opensips title="设置 raw_interface 参数"
...
modparam("sipcapture", "raw_interface", "eth0")
...
```


#### raw_sock_children (integer)


该参数定义必须创建多少个子进程来监听 raw 套接字。


*默认值为 "1"。*


```opensips title="设置 raw_sock_children 参数"
...
modparam("sipcapture", "raw_sock_children", 6)
...
```


#### promiscuous_on (integer)


用于启用/禁用 raw 套接字上的混杂模式的参数。
仅限 Linux。


*默认值为 "0"。*


```opensips title="设置 promiscuous_on 参数"
...
modparam("sipcapture", "promiscuous_on", 1)
...
```


#### raw_moni_bpf_on (integer)


在镜像接口上激活 Linux Socket Filter（基于 BPF 的 LSF）。该结构定义在 linux/filter.h 中。默认的 LSF 接受来自 raw_socket_listen 参数的端口/端口范围。目前 LSF 仅在 Linux 上受支持。


*默认值为 "0"。*


```opensips title="设置 raw_moni_bpf_on 参数"
...
modparam("sipcapture", "raw_moni_bpf_on", 1)
...
```


#### capture_node (str)


捕获节点的名称。


*默认值为 "homer01"。*


```opensips title="设置 capture_node 参数"
...
modparam("sipcapture", "capture_node", "homer03")
...
```


#### hep_route (string)


指定 HEP 消息应采用的路径。可能的取值如下：


- *none* - 不经过脚本；
直接执行 sip_capture()；
- *sip（默认）* - 经过主
请求路由；在此消息会被解析，你可以对它做任何想做的事情；
- *任何其他字符串值* - 定义一个路由名称，
HEP 消息将经过该路由；出于效率原因，消息不会被解析；在此你可以修改 HEP 块（如果使用 HEP 版本 3）
并将 HEP 消息中继到其他 HEP 捕获节点；


*默认值为 sip（经过主请求路由）。*


```opensips title="设置 hep_route 参数"
...
modparam("sipcapture", "hep_route", "my_hep_route")
...

route[my_hep_route] {
	/* 在此处理 HEP 相关事务 */
	...
}
...
```


### 导出函数 {#exported-functions}


#### sip_capture([table_name], [custom_field1], [custom_field2], [custom_field3])


将消息保存到数据库。


各参数的含义如下：


- *table_name (string, optional)* - 用于存储数据包的
表名；它可以带有类似 strftime 的格式化后缀，以便基于时间更改其名称；
如果未设置，将使用 modparam 定义的表；
*custom_field1 (string, optional)* - 要存储在
"custom_field1" 列中的自定义数据
*custom_field2 (string, optional)* - 要存储在
"custom_field2" 列中的自定义数据
*custom_field3 (string, optional)* - 要存储在
"custom_field3" 列中的自定义数据


该函数可以在 REQUEST_ROUTE、FAILURE_ROUTE、ONREPLY_ROUTE、BRANCH_ROUTE、LOCAL_ROUTE 中使用。


```opensips title="sip_capture 用法"
...
if (is_method("REGISTER"))
	sip_capture();
	...
	/* 表名将每天更换 */
	sip_capture("homer_%m_%d");
	sip_capture("homer_%m_%d", , $hdr(P-Asserted-Identity));
...
	
```


#### report_capture(correlation_id, [table_name], [proto_type])


将消息保存到数据库。如果要设置协议类型，则必须定义
表名，即使你将其跳过（report_capture($var(cor_id),,$var(proto_type))）。


各参数的含义如下：


- *correlation_id (string)*
- *table_name (string, optional)* - 用于存储数据包的
表名；它可以带有类似 strftime 的格式化后缀，以便基于时间更改其名称；
- *proto_type (int, optional)* - 按 HEP 协议规范定义的
协议类型编号。


> [!IMPORTANT]
> 自 2.3 版本起，report_capture 函数
> 的行为将取决于
> [proto_hep](/zh/modules/proto_hep) 的
> [homer5_on](/zh/modules/proto_hep#homer5-on-int)
> 参数。请查阅
> 模块的 [sql](https://github.com/OpenSIPS/opensips/tree/master/modules/sipcapture/sql)
> 文件夹，以了解各个版本的表字段。


该函数可以在 REQUEST_ROUTE、FAILURE_ROUTE、ONREPLY_ROUTE、BRANCH_ROUTE、LOCAL_ROUTE 中使用。


```opensips title="sip_capture 用法"
...
	hep_get("0x0011", "utf8-string", , $var(correlation_id));
	if ($var(correlation_id) == null) {
		xlog("NO CORRELATION ID! SET SOMETHING OR DROP");
		$var(correlation_id) = "absdcef";
	}

	$var(proto_type) = "3"; /* 0x03 - SDP 协议 */

	report_capture($var(correlation_id), "rtcp_log");
	/* setting the 2nd parameter, even if setting it to null, is mandatory in order to be able to set proto type */
	report_capture($var(correlation_id), , $var(proto_type));
	report_capture($var(correlation_id), "rtcp_log", $var(proto_type));
...
	
```


#### hep_set(chunk_id, chunk_data, [data_type], [vendor_id]) {#hep_setchunk_id-chunk_data-data_type-vendor_id}


设置一个 HEP 块。如果不存在，则会添加该块。


该函数可以在 REQUEST_ROUTE、FAILURE_ROUTE、ONREPLY_ROUTE、BRANCH_ROUTE、LOCAL_ROUTE 中使用。


各参数的含义如下：


- *chunk_id(string value with hex/int or string identifier of chunk)*
				- 要添加的块的 id；大多数通用
块位于内部的 HEP 结构中。对于这些块，可以跳过 data_type
和 vendor_id，因为它们已经是已知的。不具有内置
支持的通用块如下：0x000d(保活定时器)、0x000e(鉴权密钥)、
0x0011(内部关联 id)、0x0012(vlan ID)。你可以设置这些块，但
只能使用 vendor id 0x0000，其他值将导致错误。Timestamp(0x0009)
和 timestamp_us(0x000A) 块无法设置。对于
具有内置支持的块，你也可以使用字符串代替块 id，如下
所示：
	- 0x0001 - proto_family（无法设置；如果你将源/目的地址的类型从 IPv4 改为 IPv6 等，它会自动更新）
	- 0x0002 - proto_id；由于很难知道协议对应的整型值，可以使用以下字符串值来更改该值：
		- UDP
		- TCP
		- TLS
		- SCTP
		- WS
		- WSS
		- BIN
		- HEP
	- 0x0003 - src_ip
	- 0x0004 - dst_ip
	- 0x0005 - src_ip
	- 0x0006 - dst_ip
	- 0x0007 - src_port
	- 0x0008 - dst_port
	- 0x0009 - timestamp（无法设置）
	- 0x000A - timestamp_us（无法设置）
	- 0x000B - proto_type；该变量有预定义的字符串可以设置：
		- SIP
		- XMPP
		- SDP
		- RTP
		- RTCP
		- MGCP
		- MEGACO
		- M2UA
		- M3UA
		- IAX
		- H322
		- H321
	- 0x000C - captagent_id
	- 0x000f - payload
	- 0x0010 - payload
- *chunk_data(string)* - 该块应包含的数据；
内部会将其转换为所请求的数据类型
- *data_type (string, optional, default: "utf8-string")* - 块中数据的数据类型。它可以
取以下值：

  - uint8  - 单字节无符号整数
  - uint16 - 双字节（字）无符号整数
  - uint32 - 4 字节无符号整数
  - inet4-addr - 人类可读格式的 IPv4 地址
  - inet6-addr - 人类可读格式的 IPv6 地址
  - utf8-string - UTF-8 编码的字符序列
  - octet-string - 字节数组
- *vendor id(string value with hex or int, optional, default: "3")* - 已经
定义了一些 vendor id；如需了解更多细节，请查阅
[hep proto docs](http://hep.sipcapture.org/hepfiles/HEP3_rev11.pdf)。


```opensips title="hep_set 用法"
...
/* 修改/添加一个通用块 */
hep_set("proto_type", "H321");

/* 添加一个自定义块 - 整型 */
hep_set("31", "132", "uint32", "3")

/* 添加一个自定义块 - IPv4 地址 */
hep_set("32", "192.168.5.14", "inet4-addr", "3")
...
	
```


#### hep_get(chunk_id, data_type, [chunk_data_pv], [vendor_id_pv])


获取一个 HEP 块。如果该块不存在，则不会返回数据。


该函数可以在 REQUEST_ROUTE、FAILURE_ROUTE、ONREPLY_ROUTE、BRANCH_ROUTE、LOCAL_ROUTE 中使用。


各参数的含义如下：


- *chunk_id (string)* - 含义与
[hep_set()](#hep_setchunk_id-chunk_data-data_type-vendor_id)
中相同
- *data_type (string)* - 含义与
[hep_set()](#hep_setchunk_id-chunk_data-data_type-vendor_id) 中相同；如果是通用块，可以省略
- *chunk_data_pv (writable var, optional)* - 将保存块内
的数据；某些通用块的数据采用特定格式，如下所示：

  - 0x0001 - proto_family(string) - AF_INET/AF_INET6
  - 0x0002  proto_id(string) - 可能的取值见 [hep_set()](#hep_setchunk_id-chunk_data-data_type-vendor_id)
  - 0x0003/0x0004/0x0005/0x0006  src/dst_ip(string) - 人类可读格式的 IP 地址
  - 0x0009  timestamp(string) - 人类可读格式的日期和时间
  - 0x000B  proto_type(string) - 可能的取值见 [hep_set()](#hep_setchunk_id-chunk_data-data_type-vendor_id)
- *vendor_id_pv (writable var, optional)* - 将保存该块的
vendor id（整型值）


```opensips title="hep_get 用法"
...
/* 获取一个通用块 */
hep_get("proto_type", , $var(data), $var(vid));

/* 获取自定义块 - 你必须知道其中是哪类数据 */
hep_set("31", "uint32", $var(data), $var(vid))
...
	
```


#### hep_del(chunk_id)


移除一个 HEP 块。


该函数可以在 REQUEST_ROUTE、FAILURE_ROUTE、ONREPLY_ROUTE、BRANCH_ROUTE、LOCAL_ROUTE 中使用。


各参数的含义如下：


- *chunk_id (string)* - 含义与
[hep_set()](#hep_setchunk_id-chunk_data-data_type-vendor_id) 中的 *chunk_id* 相同。


```opensips title="hep_del 用法"
...
/* 获取一个通用块 */
hep_del("25"); /* 移除 chunk id 为 25 的块 */
...
	
```


#### hep_relay()


将有状态地将消息中继到当前 URI 中指示的目的地。
（如果原始 URI 被 UsrLoc、RR、strip/prefix 等重写，
将使用新的 URI）。该消息必须是一条 HEP 消息，
版本为 1、2 或 3。对于版本 1 和 2，只能使用 UDP 中继，
对于版本 3，可以使用 TCP 和 UDP。


该函数可以在 REQUEST_ROUTE、FAILURE_ROUTE、ONREPLY_ROUTE、BRANCH_ROUTE、LOCAL_ROUTE 中使用。


```opensips title="hep_relay 用法"
...
$du="sip:192.168.153.157";
if (!hep_relay()) {
	xlog("Hep proxying failed!\n");
	exit;
}

...
	
```


#### hep_resume_sip()


中断 HEP 路由的执行，并恢复到主请求路由中。


> [!WARNING]
> 请仅在由 *hep_route* 参数定义的路由中使用此函数。


```opensips title="hep_resume_sip 用法"
...
modparam("sipcapture", "hep_route", "my_hep_route")

route[my_hep_route] {
	...

	/* 在主请求路由中恢复执行 */
	hep_resume_sip();
}


...
	
```


### 导出的异步函数 {#exported-asynchronous-functions}


#### sip_capture()


将消息保存到数据库中。仅当数据库支持异步操作时，查询才会
异步执行。该查询可能不会恰好在此时执行，这取决于
*max_async_queries* 参数。


```opensips title="sip_capture 用法"
...
{
	async(sip_capture(), capture_resume);
}

route[capture_resume] {
	xlog("insert executed\n");
	/* 在此继续处理逻辑 */
}
...
	
```


### 导出的伪变量 {#exported-pseudo-variables}


#### $hep_net


保存关于接收 HEP 消息的节点的第 3 层和第 4 层信息（IP 地址和端口）。该变量为
只读，且只能通过其名称引用时使用。


其名称的可能取值如下：


- *proto_family* - 可以是 AF_INET/AF_INET6
- *proto_id* - 由于你以 HEP 方式接收该消息，
它是 PROTO_HEP。
- *src_ip* - 发送节点的 IPv4/IPv6 地址，
取决于 proto_family。
- *dst_ip* - 接收节点（消息被接收时所在的
OpenSIPS HEP 接口 IP）的 IPv4/IPv6 地址，
取决于 proto_family。
- *src_port* - 发送节点的端口。
- *dst_port* - 接收端口（消息被接收时所在的
OpenSIPS HEP 接口端口）。


```opensips title="hep_net 用法"
...
	/* 在接口 192.168.2.5 上接收到此 HEP 数据包*/
	if ($hep_net(dst_ip) == "192.168.2.5") {
		/* 在 192.168.2.5:6060 接口上接收到此包 */
		if ($hep_net(dst_port) == 6060) {
			...
		/* 在 192.168.2.5:6061 接口上接收到此包 */
		} else if ($hep_net(dst_port) == 6061) {
			...
		}
	}
...
	
```


#### HEPVERSION (string, int)


保存在该接口上接收到的 HEP 数据包的版本。


```opensips title="HEPVERSION 用法"
...
	if ($HEPVERSION == 3) {
		/* 这是一个 HEPv3 数据包*/
		...
	} else if ($HEPVERSION == 2) {
		/* 这是一个 HEPv2 数据包 */
		...
	} else if ($HEPVERSION == 1) {
		/* 这是一个 HEPv1 数据包 */
		...
	}
...
	
```


### 导出的 MI 函数 {#exported-mi-functions}


#### sip_capture


名称：*sip_capture*


参数：


- *capture_mode*（可选） - 
开启/关闭 SIP 消息捕获。可能的取值如下：
  - on
  - off

如果缺少该参数，命令将
返回 SIP 消息捕获的状态（以字符串
"on" 或 "off" 表示），而不会更改
任何内容。


MI FIFO 命令格式：


```bash
opensips-cli -x mi sip_capture off
```


### 数据库设置 {#database-setup}


在使用 sipcapture 运行 OpenSIPS 之前，必须先设置模块将存储数据的
数据库表。为此，如果这些表未由安装脚本创建，或者你选择
自行安装所有内容，可以将 opensips/scripts 文件夹下数据库
目录中的 sipcapture-create.sql、reportcapture-create.sql 或
sipcapture-st-create.sql SQL 脚本用作模板。
你也可以在项目网页 [https://opensips.org/docs/db/db-schema-devel.html](https://opensips.org/docs/db/db-schema-devel.html) 上找到完整的数据库文档。


### 限制 {#limitation}


1. RAW 套接字上只支持一种捕获模式：IPIP 或监控/镜像端口。
不要同时激活两者。
		2. 默认情况下，MySQL 不支持对分区表执行 INSERT DELAYED。你可以为 MySQL 打补丁
(http://bugs.mysql.com/bug.php?id=50393)，或使用单独的表（伪分区）
		3. 镜像端口捕获仅在 Linux 上有效。
<!-- CONTRIBUTORS -->

### 许可 {#license}

所有文档文件（即 .md 扩展名）均在 Creative Common License 4.0 下授权。
