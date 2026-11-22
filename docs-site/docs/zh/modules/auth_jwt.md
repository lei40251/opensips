---
title: "AUTH_JWT 模块"
description: "本模块基于 JSON Web Tokens 实现鉴权。"
sidebar: false
---


## 管理指南 {#admin-guide}


### 概述 {#overview}


本模块基于 JSON Web Tokens 实现鉴权。在某些场景下（例如 WebRTC），用户已在另一层（SIP 之外的层）完成鉴权，因此在 SIP 层再重复鉴权一次毫无意义。此时，SIP 客户端只需出示它从服务器收到的 JWT 鉴权令牌，并把它传给 OpenSIPS，由 OpenSIPS 用于鉴权。


它依赖两张数据库表：一张存放 JWT 配置档（一个配置档名称及其关联的 SIP 用户名），另一张存放 JWT 密钥。每个密钥对应一个配置档、用于对 JWT 签名的 KEY，以及描述有效区间的两个时间戳。多个 JWT 密钥可以指向同一个 JWT 配置档。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


本模块依赖以下模块（换言之，所列模块必须在本模块之前加载）：


- *database* -- 任意数据库模块
（目前为 mysql、postgres、dbtext），前提是设置了 db_url 参数


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，必须安装以下库或应用程序：


- *libjwt-dev*
- *openssl-dev* 或
*libssl-dev*


### 导出参数 {#exported-parameters}


#### db_mode (int)


如果设为 0，模块不会连接数据库来读取用于解码 JWT 的密钥——脚本中只能使用 jwt_script_authorize。


*默认值为 "0"。*


```opensips title="db_mode 参数用法"
modparam("auth_jwt", "db_mode", 0)
```


#### db_url (string)


要使用的数据库 URL。该参数的值取决于所用的数据库模块。例如对 mysql 和 postgres 模块，形如 mysql://username:password@host:port/database。对 dbtext 模块（将数据存储在纯文本文件中），则是数据库所在的目录。


*默认值为 "mysql://opensipsro:opensipsro@localhost/opensips"。*


```opensips title="db_url 参数用法"
modparam("auth_jwt", "db_url", "dbdriver://username:password@dbhost/dbname")
```


#### profiles_table (string)


存放 jwt 配置档的数据库表名


该参数的默认值为 jwt_profiles。


```opensips title="profiles_table 参数用法"
modparam("auth_jwt", "profiles_table", "my_profiles")
```


#### secrets_table (string)


存放 jwt 密钥的数据库表名


该参数的默认值为 jwt_secrets。


```opensips title="secrets_table 参数用法"
modparam("auth_jwt", "secrets_table", "my_secrets")
```


#### tag_column (string)


存放 JWT 配置档标签的列。


*默认值为 "tag"。*


```opensips title="设置 tag_column 参数"
...
modparam("auth_jwt", "tag_column", "my_tag_column")
...
```


#### username_column (string)


存放与 JWT 配置档关联的 SIP 用户名的列。


*默认值为 "sip_username"。*


```opensips title="设置 username_column 参数"
...
modparam("auth_jwt", "username_column", "my_username_column")
...
```


#### secret_tag_column (string)


存放 JWT 密钥关联标签的列。


*默认值为 "corresponding_tag"。*


```opensips title="设置 secret_tag_column 参数"
...
modparam("auth_jwt", "secret_tag_column", "my_secret_tag_column")
...
```


#### secret_column (string)


存放实际 jwt 签名密钥的列。


*默认值为 "secret"。*


```opensips title="设置 secret_column 参数"
...
modparam("auth_jwt", "secret_column", "my_secret_column")
...
```


#### start_ts_column (string)


存放 JWT 密钥起始 UNIX 时间戳的列。


*默认值为 "start_ts"。*


```opensips title="设置 start_ts 参数"
...
modparam("auth_jwt", "start_ts", "my_start_ts_column")
...
```


#### end_ts_column (string)


存放 jwt 密钥结束 unix 时间戳的列。


*默认值为 "end_ts"。*


```opensips title="设置 end_ts 参数"
...
modparam("auth_jwt", "end_ts", "my_end_ts_column")
...
```


#### tag_claim (string)


用于标识 JWT 配置档的 JWT 声明


*默认值为 "tag"。*


```opensips title="设置 tag_claim 参数"
...
modparam("auth_jwt", "tag_claim", "my_tag_claim")
...
```


#### load_credentials (string)


该参数指定在执行鉴权时从 JWT 配置档表中获取的凭据。加载的凭据将存储在 AVP 中。如果未特别指定 AVP 名称，将使用与列名同名的 NAME AVP。


参数语法：


- *load_credentials = credential (';' credential)**
- *credential = (avp_specification '=' column_name) |
(column_name)*
- *avp_specification = '$avp(' + NAME + ')'*


该参数的默认值为 "none（空）"。


```opensips title="load_credentials 参数用法"
# 将 my_extra_column 加载到 $avp(extra_jwt_info)
modparam("auth_jwt", "load_credentials", "$avp(extra_jwt_info)=my_extra_column")
```


### 导出函数 {#exported-functions}


#### jwt_db_authorize(jwt_token,out_decoded_token,out_sip_username)


该函数会读取第一个参数（jwt_token），提取 tag 声明，然后尝试用相应配置档标签的数据库密钥对其鉴权。成功时，它会把解码后的 JWT（纯文本格式的 header_json.payload_json）填充到 out_decoded_token 伪变量中，并把与该 JWT 配置档对应的 SIP 用户名填充到 out_sip_username 中。


负返回码的含义如下：


- *-1 (错误)* - JWT 鉴权失败


参数含义如下：


- *jwt_token (string)* - 要对其进行鉴权的 JWT 令牌
该字符串可以包含伪变量。
- *out_decoded_token (pvar)* - 用于在鉴权成功后存储解码后 JWT 的 PVAR
- *out_sip_username (pvar)* - 用于在鉴权成功后存储与该 JWT 配置档对应的 SIP 用户名的 PVAR


该函数可在 REQUEST_ROUTE 中使用。


```opensips title="jwt_db_authorize 用法"
...
if (!jwt_db_authorize("$avp(my_jwt_token)", $avp(decoded_token), $avp(sip_username) )) {
	send_reply(401,"Unauthorized");
	exit;
} else {
	xlog("Succesful JWT auth - $avp(decoded_token) \n");
	if ($fU != $avp(sip_username)) {
		send_reply(403,"Forbidden AUTH ID");
		exit;
	}	
}
...
```


#### jwt_script_authorize(jwt_token,key, out_decoded_token)


该函数会读取第一个参数（jwt_token），解码它，然后尝试用所提供的 key 对其进行校验。如果 JWT 解码成功，将填充 out_decoded_token 伪变量。返回码为：


- -2 : JWT 解码失败（out_decoded_token 不会被填充）
- -1 : JWT 校验失败（out_decoded_token 会被填充）
- 1 : JWT 已用该 key 成功校验（out_decoded_token 会被填充）


参数含义如下：


- *jwt_token (string)* - 要对其进行鉴权的 JWT 令牌
该字符串可以包含伪变量。
- *key (string)* - 用于校验 JWT 的 key。
- *out_decoded_token (pvar)* - 用于存储解码后 JWT 的 PVAR


该函数可在 REQUEST_ROUTE 中使用。


```opensips title="jwt_script_authorize 用法"
...
if (!jwt_script_authorize("$avp(my_jwt_token)",$avp(pub_key), $avp(decoded_token))) {
	send_reply(401,"Unauthorized");
	exit;
} else {
	xlog("Succesful JWT auth - $avp(decoded_token) \n");
}
...
```


#### extract_pub_key_from_cert(certificate,out_public_key)


该函数会读取第一个参数（certificate），解码它，然后尝试从该证书中提取公钥。如果提取成功，将填充 out_public_key。该函数适合与 jwt_script_authorize 函数配合使用，因为大多数提供方会公开其证书，而 JWT 是用证书中内嵌的实际公钥签名的。返回码为：


- -1 : 提取公钥失败
- 1 : out_public_key 已成功填充


参数含义如下：


- *certificate (string)* - 要读取并从中提取公钥的证书
该字符串可以包含伪变量。
- *out_public_key (pvar)* - 用于存储所提取公钥的 PVAR


该函数可在 REQUEST_ROUTE 中使用。


```opensips title="extract_pub_key_from_cert 用法"
...
if (extract_pub_key_from_cert("$avp(my_certificate)",$avp(my_pub_key))) {
    xlog("Succesfully extracted public key - $avp(my_pub_key) \n");
}
...
```
<!-- CONTRIBUTORS -->

### 许可 {#license}

所有文档文件（即 .md 扩展名）均按 Creative Common License 4.0 授权。
