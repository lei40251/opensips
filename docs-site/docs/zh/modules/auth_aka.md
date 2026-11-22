---
title: "auth_aka 模块"
description: "本模块包含使用 AKA（Authentication and Key Agreement）安全协议执行摘要鉴权的函数。该机制用于 IMS 网络，在 UE（设备）与 3G/4G/5G 网络之间提供双向鉴权。"
---


## 管理指南 {#admin-guide}


### 概述 {#overview}


本模块包含使用 AKA（Authentication and Key Agreement）
安全协议执行摘要鉴权（digest authentication）的函数。该机制用于 IMS 网络，在
UE（设备）与 3G/4G/5G
网络之间提供双向鉴权。


AKA 协议建立一组称为鉴权向量（authentication vectors，简称
AV）的安全密钥，并用它们生成摘要
挑战，以及计算摘要结果并鉴权
UE。AV 通过独立的通信通道交换。


尽管 AKA 协议还要求使用 AV 在 UE 与网络之间建立
安全通道（借助 IPSec
隧道），但本模块不处理该部分——它只执行
用户鉴权，并按
*ETSI TS 129 229* 规范在 Authorization 头域中传递加密密钥与
完整性密钥。这些密钥随后
由其他组件（例如 P-CSCF）取出，用于建立
安全通道。


### 鉴权向量 {#authentication-vectors}


鉴权向量（Authentication Vectors，简称 AV）由五个参数
（RAND、AUTN、XRES、CK、IK）组成，用于双向
鉴权。由于这些参数需通过不同通道（即 LTE 网络中的
Diameter Cx 接口）在设备（UE）
与网络之间交换，本模块不提供获取 AV
信息的任何手段。但它提供了
一个通用接口（称为 AV
Manage Interface），用于存储 AV（由其他
模块/通道获取）、管理它们，并在摘要
鉴权算法中使用它们。


模块执行的基本 AV 操作：


- 为特定用户身份请求获取一个新的 AV
- 管理 AV 的生命周期，包括重用
- 将 AV 标记为已在摘要挑战中使用
- 使 AV 失效或丢弃 AV（原因多种）


实现 AV Manage Interface 的模块（称为 AV Manager）
应当能够获取 AV 的全部五个参数，并将它们推送到
AV Storage 中。


### 支持的算法 {#supported-algorithms}


当前实现仅支持 AKAv1 算法，以及
相关的哈希函数（例如 MD5、SHA-256）。在我们发送的
挑战消息中，也可以宣告其他算法，
但本模块无法处理其应答，将返回相应的
错误。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


本模块依赖以下模块（换言之，
列出的模块必须先于本模块加载）：


- *auth* —— 鉴权框架
- *AV manage 模块*
—— 至少一个负责获取 AV 并将其推送
到 AV Storage 的模块


#### 外部库或应用程序 {#external-libraries-or-applications}


本模块不依赖任何外部库。


### 导出的参数 {#exported-parameters}


#### default_av_mgm (string) {#default_av_mgm-string}


当函数未显式提供 AV Manager 时使用的默认 AV Manager。


```opensips title="default_av_mgm parameter usage"
		
modparam("auth_aka", "default_av_mgm", "diameter") # fetch AVs through the Cx interface
		
```


#### default_qop (string) {#default_qop-string}


挑战期间使用的默认 qop 参数，前提是函数
未显式提供。


默认值为 *auth*。


```opensips title="default_qop parameter usage"
		
modparam("auth_aka", "default_qop", "auth,auth-int")
		
```


#### default_algorithm (string) {#default_algorithm-string}


挑战期间宣告的默认算法，前提是
函数未显式提供。
> [!NOTE]
> 提供的算法中至少应有一个是 AKA
> 算法，否则使用本模块没有意义。


默认值为 *AKAv1-MD5*。


> [!WARNING]
> 当前仅支持 AKAv1-* 算法。


```opensips title="default_algorithm parameter usage"
		
modparam("auth_aka", "default_algorithm", "AKAv2-MD5")
		
```


#### hash_size (integer)


为每个用户存储 AV 的哈希表大小。
必须为 2 的幂。


默认值为 *4096*。


```opensips title="hash_size parameter usage"
		
modparam("auth_aka", "hash_size", 1024)
		
```


#### sync_timeout (integer)


同步调用等待获取一个鉴权向量所需的
毫秒数。


必须为正值。值为
*0* 表示无限等待。


默认值为 *100* ms。


```opensips title="sync_timeout parameter usage"
		
modparam("auth_aka", "sync_timeout", 200)
		
```


#### async_timeout (integer)


异步调用等待获取一个鉴权向量所需的
毫秒数。


必须为大于 0 的正值。


> [!NOTE] 
> 当前的超时机制只有
> 秒级粒度，因此应把此参数
> 配置为 1000 的倍数。


默认值为 *1000* ms。


```opensips title="async_timeout parameter usage"
modparam("auth_aka", "async_timeout", 2000)
		
```


#### unused_timeout (integer)


未被使用的鉴权向量可以在内存中保留的
秒数。一旦达到该超时，
鉴权向量即被移除。


必须为大于 0 的正值。


默认值为 *60* s。


```opensips title="unused_timeout parameter usage"
modparam("auth_aka", "unused_timeout", 120)
		
```


#### pending_timeout (integer)


正在鉴权过程中使用的鉴权向量应
保留在内存中的秒数。
一旦达到该超时，鉴权向量即被
移除，使用它的鉴权将失败。


必须为大于 0 的正值。


默认值为 *30* s。


```opensips title="pending_timeout parameter usage"
modparam("auth_aka", "pending_timeout", 10)
		
```


### 导出的函数 {#exported-functions}


#### aka_www_authorize([realm]]) {#aka_www_authorizerealm}


该函数按
[RFC3310](http://www.ietf.org/rfc/rfc3310.txt) 验证凭据，方式是使用
先前由 `aka_www_challenge()` 调用分配的
鉴权向量，并通过 *av_mgm* 管理器完成。如果凭据
验证成功，函数将成功返回，否则将以相应的错误码失败，
如下所示：


- *-6 (sync request)* - *auts*
参数存在，因此请求了同步；
- *-5 (generic error)* - 发生了某些通用错误，
未发出应答；
- *-4 (no credentials)* - 请求中未找到
凭据；
- *-3 (unknown nonce)* - 未找到与对应 nonce
关联的鉴权向量；
- *-2 (invalid password)* - 密码与
鉴权向量不匹配；
- *-1 (invalid username)* - Authorize 头域中
未找到用户名；


如果函数成功，*WWW-Authenticate*
头域会被添加到应答中，其中包含挑战信息，
以及与所用 AV 关联的 *Integrity-Key* 与
*Confidentiality-Key* 值。


各参数含义如下：


- *realm (string)* - Realm 是一个不透明的字符串，
用户代理应把它呈现给用户，以便用户决定
使用哪个用户名和密码。它通常是
代理负责的域之一。
若使用空字符串 ""，则服务器将从
From 头域 URI 的主机部分生成 realm。


如果凭据验证成功，函数将成功返回，
并把凭据标记为已授权（被标记的凭据
后续可供某些其他函数使用）。


此函数可在 REQUEST_ROUTE 中使用。


```opensips title="aka_www_authorize usage"
		
...
if (!aka_www_authorize("diameter", "siphub.com"))
	aka_www_challenge("diameter", "siphub.com", "auth");
...
```


#### aka_proxy_authorize([realm]])


该函数的行为与 [aka_www_authorize()](#aka_www_authorizerealm)
相同，但它从代理视角对用户进行鉴权。它接收相同的
参数，含义相同，返回值也相同。


此函数可在 REQUEST_ROUTE 中使用。


```opensips title="aka_proxy_authorize usage"
		
...
if (!aka_proxy_authorize("siphub.com"))
	aka_proxy_challenge("diameter", "siphub.com", "auth");
...
```


#### aka_www_challenge([av_mgm[, realm[ ,qop[, alg]]]]) {#aka_www_challengeav_mgm-realm-qop-alg}


该函数向用户代理发起挑战。它通过
*av_mgm* 管理器为所用的每个算法获取一个鉴权
向量，并生成一个或多个
包含摘要挑战的 WWW-Authenticate 头域。它会
把该头域放入基于服务器正在处理的请求所生成的应答中，
并发送该应答。收到此类
应答后，用户代理应使用所用
鉴权向量计算凭据并重试请求。
有关摘要鉴权的更多信息，
参见 RFC2617、RFC3261、RFC3310 与 RFC8760。


各参数含义如下：


- *av_mgm* (string, optional) - 本次挑战使用的
AV Manager，前提是受挑战的用户身份尚无
可用 AV。若缺省，则使用
[default_av_mgm](#default_av_mgm-string) 的值。
*realm* (string) - Realm 是一个不透明的字符串，
用户代理应把它呈现给用户，以便用户决定
使用哪个用户名和密码。通常它是服务器
所运行主机的域。若缺省，则使用
*From domain* 的值。
- *qop* (string, optional) - 此参数的
值可以是 "auth"、"auth-int"
或两者（以 *,* 分隔）。设置此参数时，
服务器会在挑战中放入 qop 参数。建议
使用 qop 参数，但仍有部分
用户代理无法正确处理 qop，因此将其设为可选。
另一方面，也仍有部分用户代理无法处理
不带 qop 参数的请求。若缺省，则使用
[default_qop](#default_qop-string) 的值。
- *algorithms* (string, optional) - 此参数的
值是以逗号分隔的摘要算法列表，供
UAC 用于鉴权。可能的值有：

  - AKAv1-MD5
  - AKAv1-MD5-sess
  - AKAv1-SHA-256
  - AKAv1-SHA-256-sess
  - AKAv1-SHA-512-256
  - AKAv1-SHA-512-256-sess
  - AKAv2-MD5
  - AKAv2-MD5-sess
  - AKAv2-SHA-256
  - AKAv2-SHA-256-sess
  - AKAv2-SHA-512-256
  - AKAv2-SHA-512-256-sess
当值为空或未设置时，所提供的唯一摘要算法
为 [default_algorithm](#default_algorithm-string) 的值。


可能的返回码：


- *-1* - 通用解析错误，在构建挑战
所需数据不足时产生
- *-2* - 无法获取任何 AV 向量
- *-3* - 无法构建鉴权头域
- *-5* - 无法发出应答
- *positive* - 应答中成功发送的挑战
数量；若等待某些 AV 时发生
超时，该值可能小于
请求的算法数量。


此函数可在 REQUEST_ROUTE 中使用。


```opensips title="aka_www_challenge usage"
...
if (!aka_www_authorize("siphub.com")) {
	aka_www_challenge(,"siphub.com", "auth-int", "AKAv1-MD5");
}
...
```


#### aka_proxy_challenge([realm]])


该函数的行为与 [aka_www_challenge()](#aka_www_challengeav_mgm-realm-qop-alg)
相同，但它从代理视角向用户发起挑战。它接收相同的
参数，含义相同，唯一区别在于 *realm* 缺省时
取自 *To domain* 而非
*From domain*。添加的头域是
*Proxy-Authenticate* 而非
*WWW-Authenticate*。其余参数、行为
以及返回值都相同。


此函数可在 REQUEST_ROUTE 中使用。


```opensips title="aka_proxy_challenge usage"
		
...
if (!aka_proxy_authorize("siphub.com"))
	aka_proxy_challenge(,"siphub.com", "auth");
...
```


#### aka_av_add(public_identity, private_identity, authenticate, authorize, confidentiality_key, integrity_key[, algorithms])


为 *public_identity* 与
*private_identity* 标识的用户添加一个鉴权向量。


各参数含义如下：


- *public_identity* (string) - 待添加鉴权向量的用户的
公共身份（IMPU）。
- *private_identity* (string) - 待添加鉴权向量的用户的
私有身份（IMPI）。
- *authenticate* (string) - 鉴权挑战 RAND 与令牌
AUTN 的拼接，以十六进制格式编码。
- *authorize* (string) - 用于授权该用户的
授权字符串（XRES），以十六进制格式编码。
- *confidentiality_key* (string) - AKA IPSec 过程中
使用的 Confidentiality-Key，以十六进制格式编码。
- *integrity_key* (string) - AKA IPSec 过程中
使用的 Integrity-Key，以十六进制格式编码。
- *algorithms* (string, optional) - 该 AV 应适用的
AKA 算法。若缺省，则该 AV 可用于任何 AKA
算法。


此函数可在任意路由中使用。


```c title="aka_av_add usage"
		
...
aka_av_add("sip:test@siphub.com", "test@siphub.com",
			"KFQ/MpR3cE3V9PxucEQS5KED8uUNYIAALFyk59sIJI4=", /* authenticate */
			"00000262c0000014000028af2d6398cbe26eea69", /* authorize */
			"db7f8c4a58e17083974bba3b936d34c4", /* ck */
			"6151667b9ef815c1dcb87473685f062a"  /* ik */);
...
```


#### aka_av_drop(public_identity, private_identity, authenticate)


丢弃与 *authenticate/nonce* 值相对应的、属于
*public_identity* 与
*private_identity* 标识的用户的鉴权向量。


各参数含义如下：


- *public_identity* (string) - 待丢弃鉴权向量的用户的
公共身份（IMPU）。
- *private_identity* (string) - 待丢弃鉴权向量的用户的
私有身份（IMPI）。
- *authenticate* (string) - 用于标识待丢弃
鉴权向量的 authenticate/nonce。


此函数可在任意路由中使用。


```c title="aka_av_drop usage"
		
...
aka_av_drop("sip:test@siphub.com", "test@siphub.com",
			"KFQ/MpR3cE3V9PxucEQS5KED8uUNYIAALFyk59sIJI4=");
...
```


#### aka_av_drop_all(public_identity, private_identity[, count])


丢弃 *public_identity* 与
*private_identity* 标识的用户的所有鉴权向量。当需要
执行同步时，此函数很有用。


各参数含义如下：


- *public_identity* (string) - 待丢弃鉴权向量的用户的
公共身份（IMPU）。
- *private_identity* (string) - 待丢弃鉴权向量的用户的
私有身份（IMPI）。
- *count* (variable, optional) - 用于返回被丢弃
鉴权向量数量的变量。


此函数可在任意路由中使用。


```opensips title="aka_av_drop_all usage"
		
...
aka_av_drop_all("sip:test@siphub.com", "test@siphub.com", $var(count));
...
```


#### aka_av_fail(public_identity, private_identity[, count])


告知引擎某用户的鉴权向量查询已
失败，从而解除对该消息处理的锁定。


*注意：* 当你知道无法获取新的
鉴权向量时（原因多种），此函数很有用
——调用它会恢复消息
处理，仅使用目前获取到的可用 AV。


各参数含义如下：


- *public_identity* (string) - 待丢弃鉴权向量的用户的
公共身份（IMPU）。
- *private_identity* (string) - 待丢弃鉴权向量的用户的
私有身份（IMPI）。
- *count* (integer, optional) - 失败的
鉴权向量数量。若缺省，
按 *1* 计。


此函数可在任意路由中使用。


```opensips title="aka_av_fail usage"
...
aka_av_fail("sip:test@siphub.com", "test@siphub.com", 3);
...
```


### 导出的 MI 函数 {#exported-mi-functions}


#### aka_av_add


通过 MI 接口添加一个鉴权向量。


参数：


- *public_identity* (string) - 待添加鉴权向量的用户的
公共身份（IMPU）。
- *private_identity* (string) - 待添加鉴权向量的用户的
私有身份（IMPI）。
- *authenticate* (string) - 鉴权挑战 RAND 与令牌
AUTN 的拼接，以十六进制格式编码。
- *authorize* (string) - 用于授权该用户的
授权字符串（XRES），以十六进制格式编码。
- *confidentiality_key* (string) - AKA IPSec 过程中
使用的 Confidentiality-Key，以十六进制格式编码。
- *integrity_key* (string) - AKA IPSec 过程中
使用的 Integrity-Key，以十六进制格式编码。
- *algorithms* (string, optional) - 该 AV 应适用的
AKA 算法。若缺省，则该 AV 可用于任何 AKA
算法。


```bash title="aka_av_add usage"
...
## 添加一个 AKA AV
$ opensips-cli -x mi aka_av_add \
				sip:test@siphub.com
				test@siphub.com
				KFQ/MpR3cE3V9PxucEQS5KED8uUNYIAALFyk59sIJI4=
				00000262c0000014000028af2d6398cbe26eea69
				db7f8c4a58e17083974bba3b936d34c4
				6151667b9ef815c1dcb87473685f062a
...
			
```


#### aka_av_drop


使以 authenticate 值标识的用户的某个鉴权向量
失效。


参数：


- *public_identity* (string) - 待添加鉴权向量的用户的
公共身份（IMPU）。
- *private_identity* (string) - 待添加鉴权向量的用户的
私有身份（IMPI）。
- *authenticate* (string) - 用于标识鉴权向量的
authenticate/nonce。


```bash title="aka_av_drop usage"
...
## 丢弃一个 AKA AV
$ opensips-cli -x mi aka_av_drop \
				sip:test@siphub.com
				test@siphub.com
				KFQ/MpR3cE3V9PxucEQS5KED8uUNYIAALFyk59sIJI4=
...
			
```


#### aka_av_drop_all


通过 MI 接口使用户的所有鉴权向量
失效。


参数：


- *public_identity* (string) - 待丢弃鉴权向量的用户的
公共身份（IMPU）。
- *private_identity* (string) - 待丢弃鉴权向量的用户的
私有身份（IMPI）。


```bash title="aka_av_drop_all usage"
...
## 丢弃该用户的所有 AKA AV
$ opensips-cli -x mi aka_av_drop_all \
				sip:test@siphub.com
				test@siphub.com
...
			
```


#### aka_av_fail


表示获取鉴权向量已失败，从而解除
对该消息处理的锁定。


*注意：* 当你知道无法获取新的
鉴权向量时（原因多种），此函数很有用
——调用它会恢复消息
处理，仅使用目前获取到的可用 AV。


参数：


- *public_identity* (string) - 待添加鉴权向量的用户的
公共身份（IMPU）。
- *private_identity* (string) - 待添加鉴权向量的用户的
私有身份（IMPI）。
- *count* (integer, optional) - 鉴权向量
失败的数量。


```bash title="aka_av_drop usage"
...
## 标记一次 AKA AV 获取失败
$ opensips-cli -x mi aka_av_drop \
				sip:test@siphub.com
				test@siphub.com
				KFQ/MpR3cE3V9PxucEQS5KED8uUNYIAALFyk59sIJI4=
...
			
```
<!-- CONTRIBUTORS -->

### 许可证 {#license}


所有文档文件（即 .md 扩展名）均按 Creative Common License 4.0 授权
