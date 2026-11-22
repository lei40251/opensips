---
title: "compression 模块"
description: "本模块使用 deflate 与 gzip 算法/头域，实现 SIP 消息的压缩/解压与 base64 编码。"
---


## 管理员指南 {#admin-guide}


### 概述 {#overview}


本模块使用 deflate 与 gzip 算法/头域，实现 SIP 消息的压缩/解压
与 base64 编码。本模块的另一项功能是：按 SIP RFC 的规定
将头域缩减为紧凑形式、移除 sdp 消息体中编解码器
（0-97）不必要的描述、以及为不被移除的头域
提供白名单（必要头域除外）。


### 工作原理 {#how-it-works}


模块使用 zlib 库实现压缩与 base64 编码，
以将消息转换为可读字符。它还使用
回调机制对消息执行压缩/紧凑化处理，以便这些
操作在所有其他脚本函数作用于消息之后
才执行。


### 使用场景 {#usage-cases}


众所周知，UDP 分片目前是个大问题，因此本模块
试图通过各种手段让消息更小。模块可用于
压缩消息体或消息中的部分头域，
也可用于解压已压缩的消息。实现方式有更多可能：
消息体可与指定的头域一起压缩，或者
头域可以与消息体分离、压缩到某个特定头域中。


模块还会进行消息紧凑化：将 SIP 头域名
缩减为短形式（例如 "Via" 变为 'v' 等）、去掉 sdp 消息体中
编解码器属性的不必要描述（"a=rtpmap:0 PCMU/8000" 变为
"a=rtpmap:0"）、以及通过在白名单中指定希望保留的
头域来移除不需要的头域。


模块还支持消息解压与 base64 解码。它可以
从 Content-Encoding
头域识别所用的压缩算法。目前仅支持 gzip 与 deflate 算法。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


本模块加载前必须先加载以下模块：


- *无*


### 外部库或应用 {#external-libraries-or-applications}


加载本模块运行 OpenSIPS 之前，必须安装
以下库或应用：


- *zlib-dev —— [zlib](http://www.zlib.net/) 的开发库*。


### 导出的参数 {#exported-parameters}


#### compression_level (int)


该参数范围为 1 到 9，指定希望执行的压缩级别。
默认为 6。9 为最佳，但耗时最长；1 为最差。
若误将级别设为更低或更高的值，将使用默认值 6，但会
收到一条告警。


```opensips title="Set compression_level parameter"
...
modparam("compression", "compression_level", 3)
...
		
```


### 导出的函数 {#exported-functions}


#### mc_compress([algo], flags, [whitelist])


该函数按参数指定对当前消息进行压缩。请注意，
压缩在消息发送前才执行，以便你的所有 lump
都能生效。


参数含义如下：


- *algo* (int, optional) - 用于压缩的算法。目前
实现了 deflate（'0'）与 gzip（'1'）。
- *flags* (string) - 指定对什么内容应用压缩，以及
把压缩结果放在哪里。
*flags* 参数可取以下值：

  - "b" —— 表示应压缩消息体。
注意，若消息没有消息体，该标志位不会
产生效果。
  - "h" —— 表示应压缩 "whitelist" 参数部分
指定的头域（必要头域除外）。
  - "s" —— 头域与消息体应分别
压缩，这意味着将创建一个名为 "Comp-Hdrs" 的新头域，
用于保存压缩后头域的内容。同时还会创建 "Headers-Encoding"
头域，用于保存压缩头域所用的算法。若未指定
该标志位，头域与消息体（若指定了 'b' 与 'h'
标志位）将一起压缩到消息的新消息体中。
  - "e" —— 表示需要 base64 编码。若未指定
该标志位，模块默认以
deflate/gzip 格式发送原始压缩消息。
- *whitelist* (string, optional) - 头域名称列表，以 '|' 分隔，
用于指定哪些头域不应被压缩，与永不压缩的必要头域
一同考虑。必要头域如下：VIA、FROM、TO、CSEQ、ROUTE、RECORD_ROUTE、
CALLID。此外，仅当 CONTENT-LENGTH > 0 时 CONTENT_TYPE 才是必要的。
另外，若你不希望使用消息体压缩，Content-Length 头域
将成为必要头域，不可压缩。若你确实希望压缩
消息体，则旧的 Content-Length 头域将被压缩，并会计算
新的 content length。当你需要解压时，被压缩的
长度将被移除，content length 头域将与
压缩前相同。


本函数可在 REQUEST_ROUTE、BRANCH_ROUTE、ONREPLY_ROUTE、LOCAL_ROUTE、FAILURE_ROUTE 中使用。


```opensips title="mc_compress usage"
...
if (!mc_compress(0, "bhs", "Max-Forwards|Subject|P-Asserted-Identity"))
	xlog("compression failed\n");
...
	
```


```opensips title="mc_compress usage"
...
$avp(algo) = 1;
$var(flags) = "bs";
$var(list) = "Max-Forwards | Contact";
mc_compres($avp(algo), $var(flags), $var(list);
xlog("compression registered\n");
...
	
```


#### mc_compact([whitelist], flags)


该函数会实现四件不同的事：不在白名单中的非必要
头域将被移除；同类型的头域将合并
在一起，以 ',' 分隔；具有短形式的头域名
将缩减为该短形式（除非设置了 *n* 标志位）；
以及包含小于 96 的值的 SDP rtpmap 属性头域将被移除，
因为它们不是必要的。lump 不受该函数影响，因为该函数
在所有消息变更处理完成之后才
应用。
*mc_compact* 支持的短形式如下：


- "c" —— Content-Type（RFC 3261）
- "f" —— From（RFC 3261）
- "i" —— Call-ID（RFC 3261）
- "k" —— Supported（RFC 3261）
- "l" —— Content-Length（RFC 3261）
- "m" —— Contact（RFC 3261）
- "s" —— Subject（RFC 3261）
- "t" —— To（RFC 3261）
- "v" —— Via（RFC 3261）
- "x" —— Session-Expires（RFC 4028）


参数含义如下：


- *whitelist* (string, optional) - 不被移除的
头域白名单（必要头域除外）。白名单中的头域
名称必须以 '|' 分隔。
- *flags* (string) - 控制函数的行为。可用标志位有：

  - "n" —— 不使用头域的短形式。


本函数可在 REQUEST_ROUTE、BRANCH_ROUTE、ONREPLY_ROUTE、LOCAL_ROUTE、FAILURE_ROUTE 中使用。


```opensips title="mc_compact usage"
...
if (!mc_compact("Max-Forwards|P-Asserted-Identity"))
	xlog("compaction failed\n");
...
	
```


#### mc_decompress()


该函数执行与 mc_compress 相反的操作，即 base64
解码与 gzip/deflate 解压。请注意，gzip 解压
效率稍高，因为可以获知压缩缓冲区的大小，
而 deflate 不保存缓冲区大小，
因此解压将在静态缓冲区中进行。


本函数不需要参数。


警告：本函数会用解压后的缓冲区替换消息的
原始缓冲区，因此你对消息所做的任何处理都不会
被考虑。请在对消息进行任何其他处理之前
先应用解压函数。


本函数可在 REQUEST_ROUTE、LOCAL_ROUTE、FAILURE_ROUTE 中使用。


```opensips title="mc_decompress usage"
...
if (!mc_decompress())
	xlog("decompression failed\n");
...
	
```


### SIP 消息压缩性能测试 {#compression-performance-test-for-sip-messages}


以下结果使用模块内置的压缩函数
获得。利用这些结果，你可以改进
本模块的用法，只在你认为足够有利时
才进行压缩。所有情况使用的算法均为 deflate，
因为 gzip 总是比 deflate 大 16 字节，这 16 字节
表示未压缩大小对 4GB 取模的结果。同一测试中的各
子测试使用了相同的 SIP 消息。


**mc_compress 性能测试结果**


|  |  |  |  |  |  |  |  |  |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `Test Number` | `Subtest Number` | `Body Size` | `Headers to Compress Size` | `Compressed Content` | `Compressed Content Size` | `Compression level` | `Compressed size` | `Compression ratio` |
| `1` | `1` | `179` | `82` | `Body + Headers` | `261` | `1` | `284` | `0.91` |
| `1` | `2` | `179` | `82` | `Body + Headers` | `261` | `9` | `284` | `0.91` |
| `1` | `3` | `179` | `82` | `Body` | `179` | `1` | `196` | `0.91` |
| `1` | `4` | `179` | `82` | `Body` | `179` | `9` | `196` | `0.91` |
| `2` | `1` | `838` | `392` | `Body + Headers` | `1230` | `1` | `898` | `1.36` |
| `2` | `2` | `838` | `392` | `Body + Headers` | `1230` | `9` | `872` | `1.41` |
| `2` | `3` | `838` | `392` | `Body` | `838` | `1` | `568` | `1.47` |
| `2` | `4` | `838` | `392` | `Body` | `838` | `1` | `540` | `1.55` |
| `3` | `1` | `1329` | `607` | `Body + Headers` | `1936` | `1` | `1396` | `1.38` |
| `3` | `2` | `1329` | `607` | `Body + Headers` | `1936` | `9` | `1352` | `1.43` |
| `3` | `3` | `1329` | `607` | `Body` | `1329` | `1` | `840` | `1.58` |
| `3` | `4` | `1329` | `607` | `Body + Headers` | `1329` | `9` | `804` | `1.65` |
<!-- CONTRIBUTORS -->

### 许可 {#license}

所有文档文件（即 .md 扩展名）均按 Creative Common License 4.0 授权。
