---
title: "mangler 模块"
description: "本模块用于协助处理 SDP 改写。"
---

## 管理指南 {#admin-guide}


### 概述 {#overview}


这是一个协助处理 SDP 改写的模块。
注意：该模块已过时，将在 1.5.0 版本中移除。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


以下模块必须在本模块之前加载：


- *不依赖其他 OpenSIPS 模块*。


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，必须安装以下库或应用程序：


- *无*。


### 导出的参数 {#exported-parameters}


#### contact_flds_separator (string)


该参数的首字符用作 Contact 头域编码/解码的分隔符。


> [!WARNING]
> 该字段的首字符必须设置为一个不会出现在
> username、password 或 contact 其他字段中的值。否则
> 解码步骤可能会失败或产生错误结果。


*默认值为 "*"。*


```opensips title="Set db_url parameter"
...
modparam("mangler", "contact_flds_separator", "-")
...
```


此时编码后的 URI 可能形如
sip:user-password-ip-port-protocol@PublicIP


### 导出的函数 {#exported-functions}


#### sdp_mangle_ip(pattern, newip)


修改 SDP 包中描述连接的行（如 c=IN IP4）内的 IP 地址。
目前它仅修改 IP4 地址，因为 IP6 大概不需要穿透 NAT :)


该函数出错时返回负值，否则返回替换次数 + 1。


参数含义如下：


- *pattern*（string）- 一对 ip/mask，用于匹配
SDP 包中 c=IN IP4 ip 行内所定位的 IP。只有当所定位的 IP 位于
该 pattern 所描述的网络中时，这些行才会被改写。有效
pattern 的示例有 "10.0.0.0/255.0.0.0" 或
"10.0.0.0/8" 等。
- *newip*（string）- 若旧 IP 地址匹配
pattern，则放入 SDP 包中的新 IP。


该函数可在 REQUEST_ROUTE、ONREPLY_ROUTE 中使用。


```opensips title="sdp_mangle_ip usage"
...
sdp_mangle_ip("10.0.0.0/8","193.175.135.38");
...
```


#### sdp_mangle_port(offset)


修改 SDP 包中描述媒体的行（如
m=audio 13451）内的端口。


该函数出错时返回负值，否则返回替换次数 + 1。


参数含义如下：


- *offset*（int）- 一个整型值，将从
所定位的端口中加上/减去。


该函数可在 REQUEST_ROUTE、ONREPLY_ROUTE 中使用。


```opensips title="sdp_mangle_port usage"
...
sdp_mangle_port(-12000);
...
```


#### encode_contact(encoding_prefix, public_ip)


该函数将按以下方式对 Contact 头域内的 URI 进行编码：
sip:username:password@ip:port;transport=protocol 变为
sip:enc_pref*username*ip*port*protocol@public_ip，* 为默认
分隔符。


该函数出错时返回负值，成功时返回 1。


参数含义如下：


- *encoding_prefix*（string）- 用于判断某个 contact
已被编码的内容。
*public_ip*（string）- 将用于编码后 contact 中的公共 IP，
即可路由的 IP，很可能应填入你 NAT 设备的外部 IP，如上例所述。


该函数可在 REQUEST_ROUTE、ONREPLY_ROUTE 中使用。


```opensips title="encode_contact usage"
...
if ($si == 10.0.0.0/8) encode_contact("enc_prefix","193.175.135.38"); 
...
```


#### decode_contact()


该函数将对报文中第一行的 URI 进行解码，报文中的 URI
按以下方式编码：
sip:enc_pref*username*ip*port*protocol@public_ip 变为
sip:username:password@ip:port;transport=protocol。它使用
已设置的默认 contact 编码分隔符参数。


该函数出错时返回负值，成功时返回 1。


参数含义如下：


该函数可在 REQUEST_ROUTE 中使用。


```opensips title="decode_contact usage"
...
if ($ru =~ "^enc*") { decode_contact(); }
...
```


#### decode_contact_header()


该函数将按以下方式对 Contact 头域内的 URI 进行解码：
sip:enc_pref*username*ip*port*protocol@public_ip 变为
sip:username:password@ip:port;transport=protocol。它使用
已设置的默认 contact 编码分隔符参数。


该函数出错时返回负值，成功时返回 1。


参数含义如下：


该函数可在 REQUEST_ROUTE、ONREPLY_ROUTE 中使用。


```opensips title="decode_contact_header usage"
...
if ($ru =~ "^enc*") { decode_contact_header(); }
...
```
<!-- CONTRIBUTORS -->

### 许可 {#license}

所有文档文件（即 .md 扩展名）均以 Creative Common License 4.0 许可发布。
