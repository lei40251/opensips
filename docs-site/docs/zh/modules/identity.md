---
title: "Identity 模块"
description: "本模块增加对 SIP Identity 的支持（见 RFC 4474）。"
sidebar: false
---


## 管理指南 {#admin-guide}


### 概述 {#overview}


本模块增加对 SIP Identity 的支持（见 RFC 4474）。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


以下模块必须在本模块之前加载：


- *不依赖其他 OpenSIPS 模块*。


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，必须安装以下库或应用程序：


- *openssl (libssl)*。


### 导出的参数 {#exported-parameters}


#### privKey (string)


鉴权服务的 RSA 私钥文件名。该文件必须为 PEM 格式。


```opensips title="Set privKey parameter"
...
modparam("identity", "privKey", "/etc/openser/privkey.pem")
...
```


#### authCert (string)


属于 `privKey` 的证书文件名。该文件必须为 PEM 格式。


```opensips title="Set authCert parameter"
...
modparam("identity", "authCert", "/etc/openser/cert.pem")
...
```


#### certUri (string)


可获取鉴权服务证书的 URI。该字符串将被放入 Identity-Info 头域。


```opensips title="Set certUri parameter"
...
modparam("identity", "certUri", "http://www.myserver.com/cert.pem")
...
```


#### verCert (string)


包含验证方所需证书的路径。证书必须为 PEM 格式。请求的 Identity-Info 头域中的 URI 用于查找对应的证书。为此，验证方会把每个既非字母数字、也不是 "_" 和 "." 的字符替换为 "-"。URI 开头不允许出现 "."。例如，若 URI 为 "http://www.test.com/cert.pem"，验证方将查找文件 "http---www.test.com-cert.pem"。
也可以把整条证书链存放在一个文件中。此时证书必须按正确顺序排列，终端证书在前。


```opensips title="Set verCert parameter"
...
modparam("identity", "verCert", "/etc/openser/verCert/")
...
```


#### caList (string)


包含验证方所需全部受信任（根）证书的文件。证书必须为 PEM 格式。


```opensips title="Set caList parameter"
...
modparam("identity", "caList", "/etc/openser/caList.pem")
...
```


#### crlList (string)


包含验证方证书吊销列表（crl）的文件。仅当 `useCrls` 设为 "1" 时才需要设置本参数。


```opensips title="Set crlList parameter"
...
modparam("identity", "crlList", "/etc/openser/crls.pem")
...
```


#### useCrls (integer)


开关，决定是否使用吊销列表（"1"）或不使用（"0"）。


*默认值为 "0"。*


```opensips title="Set privKey parameter"
...
modparam("identity", "useCrls", 1)
...
```


### 导出的函数 {#exported-functions}


#### authservice()


该函数执行鉴权服务的各个步骤。在调用本函数之前，必须确保


- 服务器对该请求负有责任（from URI 与本地 SIP 域匹配）
- 请求的发送者有权主张 From 头域中所给的身份。


- -3：Date 头域与证书的有效期不匹配。未添加 Identity 头域。
- -2：消息超时（例如消息过旧），未添加 Identity 头域。
- -1：发生错误。
- 1：一切正常，已添加 Identity 头域。


```opensips title="authservice() usage"
...
# CANCEL 和 ACK 无法被质询
if (($rm=="CANCEL") || ($rm"ACK"))
{
    route(1); # 转发
    exit;
}

# 有些客户端（例如 Kphone）在被质询 BYE 时不应答
if ($rm=="BYE")
{
    route(1); # 转发
    exit;
}

### 鉴权服务 ###

# 检查本服务器是否具有权威性
if($fd!="mysipdomain.de")
{
    route(1); # 转发
    exit;
}

if(!proxy_authorize("mysipdomain.de","subscriber"))
{
    proxy_challenge("mysipdomain.de",0);
    exit;
}

if ($au!=$fU)
{
    sl_send_reply(403, "Use From=ID");
    exit;
}
consume_credentials();
        
authservice();
switch($retcode)
{
    case -3:
        xlog("L_DBG" ,"authservice: Date header field does not match validity period of cert\n");
        break;
    case -2:
        xlog("L_DBG" ,"authservice: msg out of time (max. +- 10 minutes allowed)\n");
        break;
    case -1:
        xlog("L_DBG" ,"authservice: ERROR, returnvalue: -1\n");
        break;
    case 1:
        xlog("L_DBG" ,"authservice: everything OK\n");
        break;
    default:
        xlog("L_DBG" ,"unknown returnvalue of authservice\n");
        
}

route(1); #带 Identity 头域（$retcode=1）或不带（$retcode!=1）转发
...
```


#### verifier()


该函数执行验证方的各个步骤。返回的代码告诉你验证的结果：


- -438：签名与消息不对应。应发送 438 应答。
- -437：证书无法验证。应发送 437 应答。
- -436：证书不可用。应发送 436 应答。
- -428：消息没有 Identity 头域。应发送 428 应答。
- -3：验证 Date 头域时出错。
- -2：鉴权服务不具备权威性。
- -1：发生未知错误。
- 1：验证通过


```opensips title="verifier() usage"
...
# 必须定义与鉴权服务相同的例外
if (($rm=="CANCEL") || ($rm"ACK")) 
{ 
    route(1); # 转发
    exit;
}
    
if ($rm=="BYE")
{
    route(1); # 转发
    exit;
}
   
verifier();
switch($retcode)
{
    case -438:
        xlog("L_DBG" ,"verifier: returnvalue: -438\n");
        sl_send_reply(438, "Invalid Identity Header");
        exit;
        break;
    case -437:
        xlog("L_DBG" ,"verifier: returnvalue: -437\n");
        sl_send_reply(437, "Unsupported Certificate");
        exit;
        break;
    case -436:
        xlog("L_DBG" ,"verifier: returnvalue: -436\n");
        sl_send_reply(436, "Bad Identity-Info");
        exit;
        break;
    case -428:
        xlog("L_DBG" ,"verifier: returnvalue: -428\n");
        sl_send_reply(428, "Use Identity Header");
        exit;
        break;
    case -3:
        xlog("L_DBG" ,"verifier: error verifying Date header field\n");
        exit;
        break;
    case -2:
        xlog("L_DBG" ,"verifier: authentication service is not authoritative\n");
        exit;
        break;
    case -1:
        xlog("L_DBG" ,"verifier: ERROR, returnvalue: -1\n");
        exit;
        break;
    case 1:
        xlog("L_DBG" ,"verifier: verification OK\n");
        route(1); # 转发
        exit;
        break;
    default:
        xlog("L_DBG" ,"unknown returnvalue of verifier\n");
        exit;
}
exit;
...
```


### 已知限制 {#known-limitations}


- 证书不会被下载，必须存放在本地。
- 含 Identity 头域的合法请求的 Call-ID 不会被记录。因此验证方并不提供完整的重放保护。
- 鉴权服务和验证方使用的是原始请求。OpenSIPS 脚本中消息处理所带来的修改会被忽略。
<!-- CONTRIBUTORS -->

### 许可证 {#license}

所有文档文件（即扩展名为 .md 的文件）均按 Creative Common License 4.0 授权
