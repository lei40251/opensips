---
title: "osp 模块"
description: "OSP 模块使 OpenSIPS 能够基于 ETSI 定义的 OSP 标准（TS 101 321 V4.1.1）支持安全的多边对等互联。"
---

## 管理指南 {#admin-guide}


### 概述 {#overview}


OSP 模块使 OpenSIPS 能够基于 ETSI 定义的 OSP 标准（TS 101 321 V4.1.1）支持安全的多边对等互联（multi-lateral peering）。该模块使 OpenSIPS 能够：


- 向对等服务器（peering server）发送对等互联授权请求。
- 校验在 SIP INVITE 消息中收到的、带数字签名的对等互联授权令牌（peering authorization token）。
- 向对等服务器上报使用信息。


### 依赖 {#dependencies}


OSP 模块依赖以下模块，这些模块必须在 OSP 模块之前加载。


- *auth* -- 鉴权框架模块
- *sqlops* -- SQL 操作模块
- *maxfwd* -- Max-Forward 处理模块
- *mi_fifo* -- 管理接口的 FIFO 支持
- *options* -- OPTIONS 应答模块
- *proto_udp* -- UDP 协议模块，为 SIP 实现 UDP 明文传输
- *registrar* -- SIP 注册服务器实现模块
- *rr* -- Record-Route 与 Route 模块
- *signaling* -- SIP 信令模块
- *sipmsgops* -- SIP 操作模块
- *sl* -- 无状态应答模块
- *tm* -- 事务（有状态）模块
- *uac* -- UAC 功能（FROM 改写与 UAC 鉴权）
- *uac_auth* -- UAC 鉴权功能
- *usrloc* -- 用户位置实现模块
- *OSP Toolkit* -- OSP Toolkit，可从 https://github.com/TransNexus/osptoolkit 获取，必须在构建带 OSP 模块的 OpenSIPS 之前构建。关于使用 OSP Toolkit 构建 OpenSIPS 的说明，参见 http://www.http://transnexus.com/wp-content/uploads/OSP-Routing-and-CDR-Collection-Server-with-OpenSIPS-1.7.2.pdf。对于 OpenSIPS 2.4.0，应使用 OSP Toolkit 4.16.0 或更高版本。


### 导出的参数 {#exported-parameters}


#### work_mode


work_mode（整型）参数指示 OSP 模块应以何种模式工作。若该值设为 0，OSP 模块以直接模式（direct mode）工作。若该值设为 1，OSP 模块以间接模式（indirect mode）工作。默认值为 0。


```opensips title="Instructing the module to work in direct mode"
modparam("osp","work_mode",0)
        
```


#### service_type


service_type（整型）参数指示 OSP 模块应提供哪些服务。若该值设为 0，OSP 模块提供普通语音服务。若该值设为 1，OSP 模块提供号码携带查询服务。若该值设为 2，OSP 模块提供 CNAM 查询服务。默认值为 0。


```opensips title="Instructing the module to provide normal voice service"
modparam("osp","service_type",0)
        
```


#### sp1_uri, sp2_uri, ..., sp16_uri


这些 sp_uri（字符串）参数定义用于请求对等互联授权和路由信息的对等服务器。至少必须配置一个对等服务器。仅当存在多个对等服务器时才需要配置其余参数。每个对等服务器地址采用标准 URL 的形式，由最多四个组件构成：


- 可选的、用于与对等服务器通信的协议指示。支持 HTTP 和以 SSL/TLS 加固的 HTTP，分别由 "http://" 和 "https://" 表示。若未显式指示协议，OpenSIPS 默认使用以 SSL 加固的 HTTP。
- 对等服务器的 Internet 域名。也可以使用 IP 地址，但必须用方括号括起，例如 [172.16.1.1]。
- 可选的、用于与对等服务器通信的 TCP 端口号。若省略端口号，OpenSIPS 默认为端口 5045（用于 HTTP）或端口 1443（用于以 SSL 加固的 HTTP）。
发往对等服务器的请求的统一资源标识符。该组件不是可选的，必须包含。


```opensips title="Setting the OSP servers"
modparam("osp","sp1_uri","http://osptestserver.transnexus.com:5045/osp")
modparam("osp","sp2_uri","https://[1.2.3.4]:1443/osp")
        
```


#### sp1_weight, sp2_weight, ..., sp16_weight


这些 sp_weight（整型）参数用于将对等请求负载均衡到各对等服务器。当配置为 1000 的因子时，这些参数最为有效。例如，若 sp1_uri 应承载 sp2_uri 两倍的流量负载，则将 sp1_weight 设为 2000、sp2_weight 设为 1000。建议在对等服务器之间共享负载均衡。不过，也可以通过给主用服务器分配 sp_weight 0、给备用服务器分配非零 sp_weight，将对等服务器配置为主用与备用。sp1_weight 和 sp2_weight 的默认值为 1000。


```opensips title="Setting the OSP server weights"
modparam("osp","sp1_weight",1000)
        
```


#### device_ip


device_ip（字符串）是推荐参数，显式定义 OpenSIPS 在对等请求消息中的 IP 地址（作为 SourceAlternate type=transport）。点分十进制 IP 地址必须放在方括号中，如下例所示。


```opensips title="Setting the device IP address"
modparam("osp","device_ip","[127.0.0.1]:5060")
        
```


#### use_security_features


use_security_features（整型）参数指示 OSP 模块如何使用 OSP 安全特性。若该值设为 1，OSP 模块使用 OSP 安全特性。若该值设为 0，OSP 模块不使用 OSP 安全特性。默认值为 0。


```opensips title="Instructing the module not to use OSP security features"
modparam("osp","use_security_features",0)
        
```


#### token_format


当 OpenSIPS 收到带有对等令牌的 SIP INVITE 时，OSP 模块将校验该令牌，以判定该呼叫是否已被对等服务器授权。对等令牌可能带数字签名，也可能不带。token_format（整型）参数定义 OpenSIPS 是校验签名令牌、未签名令牌，还是两者都校验。令牌格式的取值定义如下。默认值为 2。


若 use_security_features 参数设为 0，则无法校验签名令牌。


0 - 仅校验签名令牌。带有效签名令牌的呼叫被允许。


1 - 仅校验未签名令牌。带有效未签名令牌的呼叫被允许。


2 - 同时校验签名令牌与未签名令牌。带有效令牌的呼叫被允许。


```opensips title="Setting the token format"
modparam("osp","token_format",2)
        
```


#### private_key, local_certificate, ca_certificates


这些参数标识用于校验对等互联授权令牌、以及使用 SSL 在 OpenSIPS 与对等服务器之间建立安全通道的文件。这些文件由 OSP Toolkit 的 'Enroll' 工具生成。默认情况下，代理会在默认配置目录中查找 pkey.pem、localcert.pem 和 cacart_0.pem。默认配置目录在编译时通过 CFG_DIR 设置，默认为 /usr/local/etc/opensips/。可以将这些文件复制到预期的文件位置，也可以修改下面的参数。


若 use_security_features 参数设为 0，这些参数将被忽略。


若编译时使用了默认的 CFG_DIR 值，则将从以下位置加载这些文件：


```opensips title="Set authorization files"
modparam("osp","private_key","/usr/local/etc/opensips/pkey.pem")
modparam("osp","local_certificate","/usr/local/etc/opensips/localcert.pem")
modparam("osp","ca_certificates","/usr/local/etc/opensips/cacert.pem")
        
```


#### enable_crypto_hardware_support


enable_crypto_hardware_support（整型）参数用于设置 openssl 库中的加密硬件加速引擎。默认值为 0（不存在加密硬件）。若使用加密硬件，该值应设为 1。


```opensips title="Setting the hardware support"
modparam("osp","enable_crypto_hardware_support",0)
        
```


#### ssl_lifetime


ssl_lifetime（整型）参数定义单个 SSL 会话密钥的生存期，单位为秒。一旦超过该时限，OSP 模块将协商新的会话密钥。此时间限制到期时，正在进行中的通信交互不会被打断。这是可选字段，默认值为 200 秒。


```opensips title="Setting the ssl lifetime"
modparam("osp","ssl_lifetime",200)
        
```


#### persistence


persistence（整型）参数定义一次通信交互完成后应保持 HTTP 连接的时间，单位为秒。OSP 模块将在该时间段内保持连接，以应对后续发往同一对等服务器的通信交互。


```opensips title="Setting the persistence"
modparam("osp","persistence",1000)
        
```


#### retry_delay


retry_delay（整型）参数定义重试连接 OSP 对等服务器之间的时间间隔，单位为秒。在遍历完所有对等服务器后，OSP 模块将延迟该时长再恢复连接尝试。这是可选字段，默认值为 1 秒。


```opensips title="Setting the retry delay"
modparam("osp","retry_delay",1)
        
```


#### retry_limit


retry_limit（整型）参数定义连接对等服务器的最大重试次数。若对所有对等服务器进行这么多次重试后仍未建立连接，OSP 模块将停止连接尝试并返回相应的错误码。该数字不计入首次连接尝试，因此 retry_limit 为 1 时，对每个对等服务器总共会有两次连接尝试。默认值为 2。


```opensips title="Setting the retry limit"
modparam("osp","retry_limit",2)
        
```


#### timeout


timeout（整型）参数定义等待对等服务器应答的最长时间，单位为毫秒。若在该时间内未收到应答，则中止当前连接，OSP 模块尝试联系下一个对等服务器。默认值为 10 秒。


```opensips title="Setting the timeout"
modparam("osp","timeout",10)
        
```


#### support_nonsip_protocol


support_nonsip_protocol（整型）参数用于告知 OSP 模块是否支持非 SIP 信令协议的目标设备。默认值为 0。


```opensips title="Setting support non-SIP destination devices"
modparam("osp","support_nonsip_protocol",0)
        
```


#### max_destinations


max_destinations（整型）参数定义 OpenSIPS 请求对等服务器在对等应答中返回的最大目标数。OSP 模块最多支持 12 个目标。默认值为 12。


```opensips title="Setting the number of destination"
modparam("osp","max_destinations",12)
        
```


#### report_networkid


report_networkid（整型）参数用于告知 OSP 模块是否在已完成呼叫的 CDR 中上报网络 ID。若设为 0，OSP 模块不上报任何网络 ID。若设为 1，OSP 模块上报源网络 ID。若设为 2，OSP 模块上报目的网络 ID。若设为 3，OSP 模块同时上报源与目的网络 ID。默认值为 3。


```opensips title="Setting report network ID flag"
modparam("osp","report_networkid",3)
        
```


#### validate_call_id


validate_call_id（整型）参数指示 OSP 模块校验对等令牌中的 call id。若该值设为 1，OSP 模块校验 SIP INVITE 消息中的 call id 是否与对等令牌中的 call id 一致。若不一致，则拒绝该 INVITE。若该值设为 0，OSP 模块不校验对等令牌中的 call id。默认值为 1。


```opensips title="Instructing the module to validate call id"
modparam("osp","validate_call_id",1)
        
```


#### use_number_portability


use_number_portability（整型）参数指示 OSP 模块如何使用 SIP INVITE 消息 Request URI 中的号码可携带性参数。若该值设为 1，当这些参数存在时，OSP 模块使用 Request URI 中的号码可携带性参数。若该值设为 0，OSP 模块不使用这些号码可携带性参数。默认值为 1。


```opensips title="Instructing the module to use number portability parameters in Request URI"
modparam("osp","use_number_portablity",1)
        
```


#### append_userphone


append_userphone（整型）参数指示 OSP 模块是否在 URI 中追加 "user=phone" 参数。若该值设为 0，OSP 模块不追加 "user=phone" 参数。若该值设为 1，OSP 模块将追加 "user=phone" 参数。默认值为 0


```opensips title="Append user=phone parameter"
modparam("osp","append_userphone",0)
        
```


#### networkid_location


networkid_location（整型）参数指示 OSP 模块应将目的网络 ID 追加到何处。默认值为 2


0 - 不追加网络 ID。


1 - 将网络 ID 作为 userinfo 参数追加。


2 - 将网络 ID 作为 URI 参数追加。


```opensips title="Append networkid location"
modparam("osp","networkid_location",2)
        
```


#### networkid_parameter


networkid_parameter（字符串）参数指示 OSP 模块在出站目的 URI 中使用哪个参数名来追加目的网络 ID。默认值为 "networkid"


```opensips title="Networkid parameter name"
modparam("osp","networkid_param","networkid")
        
```


#### switchid_location


switchid_location（整型）参数指示 OSP 模块应将目的交换机 ID 追加到何处。默认值为 2


0 - 不追加交换机 ID。


1 - 将交换机 ID 作为 userinfo 参数追加。


2 - 将交换机 ID 作为 URI 参数追加。


```opensips title="Append switchid location"
modparam("osp","switchid_location",2)
        
```


#### switchid_parameter


switchid_parameter（字符串）参数指示 OSP 模块在出站目的 URI 中使用哪个参数名来追加目的交换机 ID。默认值为 "switchid"


```opensips title="Networkid parameter name"
modparam("osp","switchid_param","switchid")
        
```


#### parameterstring_location


parameterstring_location（整型）参数指示 OSP 模块应将参数字符串追加到何处。默认值为 0


0 - 不追加参数字符串。


1 - 将参数字符串作为 userinfo 参数追加。


2 - 将参数字符串作为 URI 参数追加。


```opensips title="Append parameter string location"
modparam("osp","parameterstring_location",0)
        
```


#### parameterstring_value


parameterstring_value（字符串）参数指示 OSP 模块在出站 URI 中追加的参数字符串。默认值为 ""


```opensips title="Parameter string value"
modparam("osp","parameterstring_value","")
        
```


#### source_device_avp


source_device_avp（字符串）参数指示 OSP 模块使用所定义的 AVP 在间接工作模式下传递源设备 IP 值。默认值为 "$avp(_osp_source_device_)"。随后可通过 "$avp(_osp_source_device_) = pseudo-variables" 设置源设备 IP。所有伪变量在 https://docs.opensips.org/manual/3-6/script-corevar/ 中有描述。


```opensips title="Setting the source device IP AVP"
modparam("osp","source_device_avp","$avp(srcdev)")
        
```


#### source_networkid_avp


source_networkid_avp（字符串）参数指示 OSP 模块使用所定义的 AVP 传递源网络 ID 值。默认值为 "$avp(_osp_source_networkid_)"。随后可通过 "$avp(_osp_source_networkid_) = pseudo-variables" 设置源网络 ID。所有伪变量在 https://docs.opensips.org/manual/3-6/script-corevar/ 中有描述。


```opensips title="Setting the source network ID AVP"
modparam("osp","source_networkid_avp","$avp(snid)")
        
```


#### source_switchid_avp


source_switchid_avp（字符串）参数指示 OSP 模块使用所定义的 AVP 传递源交换机 ID 值。默认值为 "$avp(_osp_source_switchid_)"。随后可通过 "$avp(_osp_source_switchid_) = pseudo-variables" 设置源交换机 ID。所有伪变量在 https://docs.opensips.org/manual/3-6/script-corevar/ 中有描述。


```opensips title="Setting the source switch ID AVP"
modparam("osp","source_switchid_avp","$avp(swid)")
        
```


#### custom_info_avp


custom_info_avp（字符串）参数指示 OSP 模块使用所定义的 AVP 传递自定义信息值。默认值为 "$avp(_osp_custom_info_)"。随后可通过 "$avp(_osp_custom_info_) = pseudo-variables" 设置自定义信息。所有伪变量在 https://docs.opensips.org/manual/3-6/script-corevar/ 中有描述。


```opensips title="Setting the custom info AVP"
modparam("osp","custom_info_avp","$avp(cinfo)")
        
```


#### cnam_avp


cnam_avp（字符串）参数指示 OSP 模块使用所定义的 AVP 传递 CNAM 值。默认值为 "$avp(_osp_cnam_)"。随后可通过 "$avp(_osp_cnam_)" 使用 CNAM。所有伪变量在 https://docs.opensips.org/manual/3-6/script-corevar/ 中有描述。


```opensips title="Setting the CNAM AVP"
modparam("osp","cnam_avp","$avp(cnam)")
        
```


#### extraheaders_value


extraheaders_value（字符串）参数指示 OSP 模块在出站 SIP NOTIFY 消息中追加所定义的 SIP 头域。默认值为空。


```opensips title="Setting the NOTIFY extra headers"
modparam("osp", "extraheaders_value", "Source: N")
        
```


#### source_media_avp, destination_media_avp


这些参数用于告知 OSP 模块哪些 AVP 用于存储媒体地址。默认值为 "$avp(_osp_source_media_address_)" 和 "$avp(_osp_destination_media_address_)"。所有伪变量在 https://docs.opensips.org/manual/3-6/script-corevar/ 中有描述。


```opensips title="Setting the media address AVPs"
modparam("osp", "source_media_avp", "$avp(srcmedia)")
modparam("osp", "destination_media_avp", "$avp(destmedia)")
        
```


#### request_date_avp


request_date_avp（字符串）参数指示 OSP 模块使用所定义的 AVP 传递 SIP 请求的 Date 头域值。默认值为 "$avp(_osp_request_date_)"。随后可通过 "$avp(_osp_request_date_)" 使用请求日期。所有伪变量在 https://docs.opensips.org/manual/3-6/script-corevar/ 中有描述。


```opensips title="Setting the request date AVP"
modparam("osp","request_date_avp","$avp(reqdate)")
        
```


#### sdp_fingerprint_avp


sdp_fingerprint_avp（字符串）参数指示 OSP 模块使用所定义的 AVP 传递 SDP 指纹属性值。默认值为 "$avp(_osp_sdp_fingerprint_)"。随后可通过 "$avp(_osp_sdp_fingerprint_)" 使用 SDP 指纹属性。所有伪变量在 https://docs.opensips.org/manual/3-6/script-corevar/ 中有描述。


```opensips title="Setting the SDP finger print AVP"
modparam("osp","sdp_fingerprint_avp","$avp(sdpfp)")
        
```


#### identity_signature_avp, identity_algorithm_avp, identity_information_avp, identity_type_avp, identity_canon_avp


这些参数指示 OSP 模块使用所定义的 AVP 传递与 Identity 相关的值。默认值为 "$avp(_osp_identity_signature_)"、"$avp(_osp_identity_algorithm_)"、"$avp(_osp_identity_information_)"、"$avp(_osp_identity_type_)"、"$avp(_osp_identity_canon_)"。随后可通过这些 AVP 使用与 Identity 相关的值。所有伪变量在 https://docs.opensips.org/manual/3-6/script-corevar/ 中有描述。


```opensips title="Setting the Identity related AVPs"
modparam("osp","identity_signature_avp","$avp(idsign)")
modparam("osp","identity_algorithm_avp","$avp(idalg)")
modparam("osp","identity_information_avp","$avp(idinfo)")
modparam("osp","identity_type_avp","$avp(idtype)")
modparam("osp","identity_canon_avp","$avp(idcanon)")
        
```


#### service_provider_avp


该参数用于告知 OSP 模块哪个 AVP 用于存储源服务提供商标识信息。默认值为 "$avp(_osp_service_provider_)"。所有伪变量在 https://docs.opensips.org/manual/3-6/script-corevar/ 中有描述。


```opensips title="Setting the source service provider AVP"
modparam("osp", "service_provider_avp", "$avp(sp)")
        
```


#### user_group_avp


该参数用于告知 OSP 模块哪个 AVP 用于存储源用户组信息。默认值为 "$avp(_osp_user_group_)"。所有伪变量在 https://docs.opensips.org/manual/3-6/script-corevar/ 中有描述。


```opensips title="Setting the source user group AVP"
modparam("osp", "user_group_avp", "$avp(groupid)")
        
```


#### user_id_avp


该参数用于告知 OSP 模块哪个 AVP 用于存储源用户 ID 信息。默认值为 "$avp(_osp_user_id_)"。所有伪变量在 https://docs.opensips.org/manual/3-6/script-corevar/ 中有描述。


```opensips title="Setting the source user ID AVP"
modparam("osp", "user_id_avp", "$avp(userid)")
        
```


### 导出的函数 {#exported-functions}


#### checkospheader()


该函数检查 OSP-Auth-Token 头域是否存在。


该函数可在 REQUEST_ROUTE 中使用。


```opensips title="checkospheader usage"
...
if (checkospheader()) {
  log(1,"OSP header field found.\n");
} else {
  log(1,"no OSP header field present\n");
};
...
        
```


#### validateospheader()


该函数校验 SIP 消息的 OSP-Auth-Token 头域中指定的 OSP-Token。若存在对等令牌，将在本地对其校验。若未找到 OSP 头域，或头域中的令牌无效、已过期，则返回 -1；校验成功时返回 1。


该函数可在 REQUEST_ROUTE 中使用。


```opensips title="validateospheader usage"
...
if (validateospheader()) {
  log(1,"valid OSP header found\n");
} else {
  log(1,"OSP header not found, invalid or expired\n");
};
...
        
```


#### getlocaladdress()


该函数获取 SIP 应答的接收 IP 地址，并将其作为代理出口地址存储。


该函数可在 ONREPLY_ROUTE 中使用。


```opensips title="getlocaladress usage"
...
if (getlocaladdress()) {
  log(1,"Obtain proxy local egress address\n");
} else {
  log(1,"Failed to get proxy local egress address\n");
};
...
        
```


#### setrequestdate()


该函数获取 SIP 应答的接收 IP 地址，并将其作为代理出口地址存储。


该函数可在 REQUEST_ROUTE 中使用。


```opensips title="setrequestdate usage"
...
if (setrequest()) {
  log(1,"Set request date\n");
} else {
  log(1,"Failed to set request date\n");
};
...
        
```


#### requestosprouting()


该函数向对等服务器发起查询，请求提供为一个或多个服务被叫的目的对端（destination peer）的 IP 地址。若目的对端可用，对等服务器将为每个目的对端返回 IP 地址和对等互联授权令牌。OSP-Auth-Token 头域会被插入 SIP 消息，同时 SIP URI 会被改写为对等服务器提供的目的对端 IP 地址。


被叫地址必须是有效的 E164 号码，否则该函数返回 -1。若事务被对等服务器接受，则改写 URI 并返回 1；出错时（对等服务器不可用、鉴权失败，或没有到目的地的路由，或路由被阻断）返回 -1。


该函数可在 REQUEST_ROUTE 中使用。


```opensips title="requestosprouting usage"
...
if (requestosprouting()) {
  log(1,"successfully queried OSP server, now relaying call\n");
} else {
  log(1,"Authorization request was rejected from OSP server\n");
};
...
        
```


#### checkosproute()


该函数用于检查该呼叫是否存在任何路由。


该函数可在 REQUEST_ROUTE 中使用。


```opensips title="checkosproute usage"
...
if (checkosproute()) {
  log(1,"There is at least one route for the call\n");
} else {
  log(1,"There is not any route for the call\n");
};
...
        
```


#### prepareosproute()


该函数尝试使用对等服务器返回的列表中的目的地来准备待转发的 INVITE。若主叫号码被翻译，将为 RPID AVP 设置一个 RPID 值。若无法准备路由，该函数向脚本返回 'FALSE'，脚本随后可决定如何处理该失败。注意，若在调用 prepareosproute 之前已调用 checkosproute 并返回 'TRUE'，则 prepareosproute 不应返回 'FALSE'，因为 checkosproute 已确认至少存在一条路由。


该函数可在 BRANCH_ROUTE 中使用。


```opensips title="prepareosproute usage"
...
if (prepareosproute()) {
  log(1,"successfully prepared the route, now relaying call\n");
} else {
  log(1,"could not prepare the route, there is not route\n");
};
...
        
```


#### prepareospresponse()


该函数尝试将对等服务器返回的列表中的所有路由准备为 SIP 300 Redirect 或 SIP 380 Alternative Service 消息。随后该消息被应答给源端。若准备路由失败，则回送 SIP 500，并记录一条跟踪日志消息。


该函数可在 REQUEST_ROUTE 中使用。


```opensips title="prepareospresponse usage"
...
if (prepareospresponse()) {
  log(1,"Response is prepared.\n");
} else {
  log(1,"Could not prepare the response.\n");
};
...
        
```


#### prepareallosproutes()


该函数尝试准备对等服务器返回的列表中的所有路由。随后该消息被分叉到各目的地。若准备路由失败，则回送 SIP 500，并记录一条跟踪日志消息。


该函数可在 REQUEST_ROUTE 中使用。


```opensips title="prepareallosproutes usage"
...
if (prepareallosproutes()) {
  log(1,"Routes are prepared, now forking the call\n");
} else {
  log(1,"Could not prepare the routes. No destination available\n");
};
...
        
```


#### checkcallingtranslation()


该函数用于检查主叫号码是否被翻译。在调用 checkcallingtranslation 之前，应先调用 prepareosproute。若主叫号码确实被翻译，则应将 INVITE 消息中原有的 Remote-Party-ID（若存在）移除，并添加新的 Remote-Party-ID 头域（prepareosproute 已为 RPID AVP 设置了 RPID 值）。若主叫号码未被翻译，则不做任何处理。


该函数可在 BRANCH_ROUTE 中使用。


```opensips title="checkcallingtranslation usage"
...
if (checkcallingtranslation()) {
  # Remove the Remote_Party-ID from the received message
  # Otherwise it will be forwarded on to the next hop
  remove_hf("Remote-Party-ID");

  # Append a new Remote_Party
  append_rpid_hf();
}
...
        
```


#### reportospusage()


该函数应在收到 BYE 消息后调用。若该消息包含 OSP cookie，该函数将向对等服务器转发始发和/或终接时长使用信息。若 BYE 包含 OSP cookie，该函数返回 TRUE。实际的使用信息将在另一线程上发送，不会延迟 BYE 的处理。该函数应在中继该消息之前调用。


参数含义如下：


- 0 - 源设备释放呼叫。
- 1 - 目的设备释放呼叫。


该函数可在 REQUEST_ROUTE 中使用。


```opensips title="reportospusage usage"
...
if (is_direction("downstream")) {
  log(1,"This BYE message is from SOURCE\n");
  if (!reportospusage(0)) {
    log(1,"This BYE message does not include OSP usage information\n");
  }
} else {
  log(1,"This BYE message is from DESTINATION\n");
  if (!reportospusage(1)) {
    log(1,"This BYE message does not include OSP usage information\n");
  }
}
...
        
```


#### processsubscribe([cachedcnamrecord])


该函数应在收到针对 CNAM 的 SUBSCRIBE 消息、且该消息存在缓存的 CNAM 记录时调用。该函数生成包含该缓存 CNAM 记录的 NOTIFY 消息，然后将该 NOTIFY 消息发送给发送 SUBSCRIBE 消息的设备。


参数含义如下：


- *cachedcnamrecord*（字符串）- 缓存的 CNAM 记录。


该函数可在 REQUEST_ROUTE 中使用。


```opensips title="processsubscribe usage"
...
if (is_method("SUBSCRIBE")) {
    if (($var(sevent) == "calling-name") && (is_myself("$rd"))) {
        if ($var(cnamrecord) != NULL) {
            processsubscribe($(var(cnamrecord){s.b64decode}));
        } else {
            t_relay("1.2.3.4", 0x02);
        }
    } else {
        t_relay();
    }
}
...
        
```


## 开发者指南 {#developer-guide}


OSP 模块的函数不被其他 OpenSIPS 模块使用。
<!-- CONTRIBUTORS -->

### 许可证 {#license}

所有文档文件（即扩展名为 .md 的文件）均按 Creative Common License 4.0 授权。
