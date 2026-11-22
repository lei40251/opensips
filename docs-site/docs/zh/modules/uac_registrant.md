---
title: "uac_registrant 模块"
description: "该模块使 OpenSIPS 能够在远端 SIP 注册服务器上注册自身。"
---


## 管理员指南 {#admin-guide}


### 概述 {#overview}


该模块使 OpenSIPS 能够在远端 SIP 注册服务器上注册自身。


启动时，注册者记录被加载到内存中的哈希表，
并启动一个定时器。
哈希索引基于 AOR 字段计算。


检查某个哈希桶中记录的定时器间隔，由
timer_interval 模块参数除以哈希桶数量计算得出。
当定时器第一次触发时，将检查第一个哈希桶，并为
其中找到的每一条记录发送 REGISTER。
在下一次超时触发时，检查第二个哈希桶，依此类推。
如果配置的 timer_interval 模块参数小于桶的数量，
模块将启动失败。


示例：将 timer_interval 模块参数设为 8、hash_size 设为 2，
将得到 4 个哈希桶（2^2=4），并且每 2s 检查一个桶（8/4=2）。


每个注册者都有自己的状态。
注册者的状态可通过 "reg_list" MI 命令查看。


UAC 注册者状态：


- *0*
				- NOT_REGISTERED_STATE -
初始状态（尚未发送任何 REGISTER）；
- *1*
				- REGISTERING_STATE - 发送不带鉴权头域的 REGISTER
之后，等待来自注册服务器的应答；
- *2*
				- AUTHENTICATING_STATE - 发送带鉴权头域的 REGISTER
之后，等待来自注册服务器的应答；
- *3*
				- REGISTERED_STATE - uac 已成功注册；
- *4*
				- REGISTER_TIMEOUT_STATE :
未收到来自注册服务器的应答；
- *5*
				- INTERNAL_ERROR_STATE -
在处理应答期间发现/遇到某些错误；
- *6*
				- WRONG_CREDENTIALS_STATE -
凭据被注册服务器拒绝；
- *7*
				- REGISTRAR_ERROR_STATE -
收到来自注册服务器的错误应答；
- *8*
				- UNREGISTERING_STATE - 发送不带鉴权头域的 unREGISTER
之后，等待来自注册服务器的应答；
- *9*
				- AUTHENTICATING_UNREGISTER_STATE - 发送带鉴权头域的 unREGISTER
之后，等待来自注册服务器的应答；


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


以下模块必须在本模块之前加载：


- *uac_auth - UAC 鉴权模块*


#### 外部库或应用程序 {#external-libraries-or-applications}


无。


### 导出参数 {#exported-parameters}


#### hash_size (integer)


内部用于保存注册者的哈希表的大小。
表越大，注册负载在时间上的分布越均匀，但消耗的内存更多。
哈希大小是 2 的幂。


*默认值为 1。*


```opensips title="设置 hash_size 参数"
...
modparam("uac_registrant", "hash_size", 2)
...
```


#### timer_interval (integer)


定义用于检查注册状态的周期性定时器。


*默认值为 100。*


```opensips title="设置 timer_interval 参数"
...
modparam("uac_registrant", "timer_interval", 120)
...
```


#### failure_retry_interval (integer)


定义在出错/失败时重试注册的自定义间隔。
通常，在任何类型的失败（超时、凭据、内部
错误）之后，注册会在 "expires" 秒后重新进行。此处
设置的参数（如果设置）将覆盖该值。


*默认值为 0（未设置）。*


```opensips title="设置 failure_retry_interval 参数"
...
modparam("uac_registrant", "failure_retry_interval", 3600)
...
```


#### enable_clustering (integer)


该参数启用模块中的集群支持。它
用于在集群中的所有节点之间共享该注册。
使用此选项时，应当为每条注册者记录
定义一个共享标签 —— 该共享标签将在集群层面控制
哪个节点有权执行注册（只有将该标签置为活动
状态的节点才会执行注册，其他节点则
处于空闲状态）。


*默认值为 0 / off。*


```opensips title="设置 enable_clustering 参数"
...
modparam("uac_registrant", "enable_clustering", 1)
...
```


#### db_url (string)


从中加载注册者的数据库。


*默认值为 "NULL"（使用核心的默认数据库 URL）。*


```opensips title="设置 'db_url' 参数"
...
modparam("uac_registrant", "db_url", "mysql://user:passw@localhost/database")
...
```


#### table_name (string)


保存注册者记录的数据库表。


*默认值为 "registrant"。*


```opensips title="设置 'table_name' 参数"
...
modparam("uac_registrant", "table_name", "my_registrant")
...
```


#### registrar_column (string)


数据库中保存指向远端注册服务器的 URI 的列名
（必填字段）。
OpenSIPS 要求是合法的 URI。


*默认值为 "registrar"。*


```opensips title="设置 'registrar_column' 参数"
...
modparam("uac_registrant", "registrar_column", "registrant_uri")
...
```


#### proxy_column (string)


数据库中保存指向出站代理的 URI 的列名
（非必填字段）。
空值或 NULL 值表示不使用出站代理，
否则 OpenSIPS 要求是合法的 URI。


*默认值为 "proxy"。*


```opensips title="设置 'proxy_column' 参数"
...
modparam("uac_registrant", "proxy_column", "proxy_uri")
...
```


#### aor_column (string)


数据库中保存定义记录地址（address of record）的 URI
的列名（必填字段）。
此处存储的 URI 将用于 REGISTER 的 To URI。
OpenSIPS 要求是合法的 URI。


*默认值为 "aor"。*


```opensips title="设置 'aor_column' 参数"
...
modparam("uac_registrant", "aor_column", "to_uri")
...
```


#### third_party_registrant_column (string)


数据库中保存定义第三方注册者的 URI 的列名
（非必填字段）。
此处存储的 URI 将用于 REGISTER 的 From URI。
空值或 NULL 值表示不做第三方注册
（From URI 与 To URI 相同），
否则 OpenSIPS 要求是合法的 URI。


*默认值为 "third_party_registrant"。*


```opensips title="设置 'third_party_registrant_column' 参数"
...
modparam("uac_registrant", "third_party_registrant_column", "from_uri")
...
```


#### username_column (string)


数据库中保存用于鉴权的用户名的列名
（如果注册服务器要求鉴权，则为必填）。


*默认值为 "username"。*


```opensips title="设置 'username_column' 参数"
...
modparam("uac_registrant", "username_column", "auth_username")
...
```


#### password_column (string)


数据库中保存用于鉴权的密码的列名
（如果注册服务器要求鉴权，则为必填）。


*默认值为 "password"。*


```opensips title="设置 'password_column' 参数"
...
modparam("uac_registrant", "password_column", "auth_passowrd")
...
```


#### binding_URI_column (string)


数据库中保存 REGISTER 中绑定 URI 的列名
（必填字段）。
此处存储的 URI 将用于 REGISTER 的 Contact URI。
OpenSIPS 要求是合法的 URI。


*默认值为 "binding_URI"。*


```opensips title="设置 'binding_URI_column' 参数"
...
modparam("uac_registrant", "binding_URI_column", "contact_uri")
...
```


#### binding_params_column (string)


数据库中保存 REGISTER 中绑定参数的列名
（非必填字段）。
若非 NULL 且非空，此处存储的字符串将作为参数
添加到 REGISTER 的 Contact URI 上（它必须以 ";" 开头）。


如果存在以下两个参数，则绑定将被强制
为唯一（如果在一个 200ok 中收到两个绑定，则在重新注册
之前会执行一次完整的绑定删除）：


- *reg-id*
- *+sip.instance*


将强制唯一绑定的参数示例：


```c
;reg-id=1;+sip.instance="<urn:uuid:11111111-AABBCCDDEEFF>"
		
```


*默认值为 "binding_params"。*


```opensips title="设置 'binding_params_column' 参数"
...
modparam("uac_registrant", "binding_params_column", "contact_params")
...
```


#### expiry_column (string)


数据库中保存过期时间的列名
（非必填）。


*默认值为 "expiry"。*


```opensips title="设置 'expiry_column' 参数"
...
modparam("uac_registrant", "expiry_column", "registration_timeout")
...
```


#### forced_socket_column (string)


数据库中保存用于发送 REGISTER 的套接字的列名
（非必填）。
如果提供了强制套接字，该套接字必须在配置中
显式设置为全局监听套接字
（参见 "listen" 核心参数）。


*默认值为 "forced_socket"。*


```opensips title="设置 'forced_socket_column' 参数"
...
modparam("uac_registrant", "forced_socket_column", "fs")
...
```


#### cluster_shtag_column (string)


数据库中保存集群共享标签的列名，
格式为 [tag_name/cluster_id]（非必填）。
如果提供了集群共享标签，则只有在标签处于活动状态时
才会发出 REGISTER 请求。


*默认值为 "cluster_shtag"。*


```opensips title="设置 'cluster_shtag_column' 参数"
...
modparam("uac_registrant", "cluster_shtag_column", "sh")
...
```


#### state_column (string)


数据库中保存注册者当前状态的列名。
当注册者被禁用时，OpenSIPS 将不再为其发送
REGISTER。该列的值为 *0* 时表示
启用，为 *1* 时表示禁用。


*默认值为 "state"。*


```opensips title="设置 'state_column' 参数"
...
modparam("uac_registrant", "state_column", "status")
...
```


### 导出函数 {#exported-functions}


配置文件中无可用函数。


### 导出 MI 函数 {#exported-mi-functions}


#### reg_list


列出注册者记录及其状态。


名称：*reg_list*


参数：


- *aor*（可选）—— 定义记录地址的 URI。如果提供，
*contact* 和 *registrar* 参数也是必需的，
并且只会列出特定的记录。
- *contact*（可选）—— Contact URI。如果提供，
*aor* 和 *registrar* 参数也是必需的，
并且只会列出特定的记录。
- *registrar*（可选）—— 指向远端注册服务器的 URI。
如果提供，*aor* 和 *contact* 参数也是必需的，
并且只会列出特定的记录。


MI FIFO 命令格式：


```bash
opensips-cli -x mi reg_list
...
opensips-cli -x mi reg_list sip:alice@opensips.org  sip:alice@127.0.0.1:5060 sip:opensips.org
```


#### reg_reload


从数据库重新加载注册者记录。


名称：*reg_reload*


参数：*无*


- *aor*（可选）—— 定义记录地址的 URI。如果提供，
*contact* 和 *registrar* 参数也是必需的，
并且只会重新加载特定的记录。
- *contact*（可选）—— Contact URI。如果提供，
*aor* 和 *registrar* 参数也是必需的，
并且只会重新加载特定的记录。
- *registrar*（可选）—— 指向远端注册服务器的 URI。
如果提供，*aor* 和 *contact* 参数也是必需的，
并且只会重新加载特定的记录。


MI FIFO 命令格式：


```bash
opensips-cli -x mi reg_reload
...
opensips-cli -x mi reg_leload sip:alice@opensips.org  sip:alice@127.0.0.1:5060 sip:opensips.org
```


#### reg_enable


启用特定的注册者。如果该注册者此前处于禁用状态，
OpenSIPS 将立即发送 REGISTER，并更新
数据库中的状态。


名称：*reg_enable*


参数：*无*


- *aor* —— 定义记录地址的 URI。
- *contact* —— Contact URI。
- *registrar* —— 指向远端注册服务器的 URI。


MI FIFO 命令格式：


```bash
opensips-cli -x mi reg_enable sip:alice@opensips.org  sip:alice@127.0.0.1:5060 sip:opensips.org
```


#### reg_disable


禁用特定的注册者。如果该注册者此前处于启用状态，
OpenSIPS 将立即发送 unREGISTER，并更新
数据库中的状态。


名称：*reg_disable*


参数：*无*


- *aor* —— 定义记录地址的 URI。如果提供，
*contact* 和 *registrar* 参数也是必需的，
并且只会禁用特定的记录。
- *contact* —— Contact URI。如果提供，
*aor* 和 *registrar* 参数也是必需的，
并且只会禁用特定的记录。
- *registrar* —— 指向远端注册服务器的 URI。
如果提供，*aor* 和 *contact* 参数也是必需的，
并且只会禁用特定的记录。


MI FIFO 命令格式：


```bash
opensips-cli -x mi reg_disable sip:alice@opensips.org  sip:alice@127.0.0.1:5060 sip:opensips.org
```


#### reg_force_register


强制特定注册者重新注册（或注册）（取决于其状态）。
注意，该注册者必须处于启用状态。


名称：*reg_force_register*


参数：


- *aor* —— 定义记录地址的 URI。如果提供，
*contact* 和 *registrar* 参数也是必需的，
并且只会强制特定记录重新注册。
- *contact* —— Contact URI。如果提供，
*aor* 和 *registrar* 参数也是必需的，
并且只会强制特定记录重新注册。
- *registrar* —— 指向远端注册服务器的 URI。
如果提供，*aor* 和 *contact* 参数也是必需的，
并且只会强制特定记录重新注册。


MI FIFO 命令格式：


```bash
opensips-cli -x mi reg_force_register sip:alice@opensips.org  sip:alice@127.0.0.1:5060 sip:opensips.org
```
<!-- CONTRIBUTORS -->

### 许可证 {#license}

所有文档文件（即 .md 扩展名的文件）均按 Creative Common License 4.0 授权
