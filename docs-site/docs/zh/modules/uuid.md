---
title: "UUID 模块"
description: "本模块提供按 RFC 4122 规范生成通用唯一标识符（UUID）的方式。"
sidebar: false
---


## 管理指南 {#admin-guide}


### 概述 {#overview}


本模块提供按 RFC 4122 规范生成通用唯一标识符
（UUID）的方式。通过读取 [$uuid](#uuid)
伪变量或调用 [uuid()](#uuidout_var-version-namespace-name)
脚本函数，可以获取字符串形式的 UUID。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


本模块不依赖其他模块。


#### 外部库或应用程序 {#external-libraries-or-applications}


- *libuuid* - util-linux
软件包的一部分，可从以下地址下载：
ftp://ftp.kernel.org/pub/linux/utils/util-linux/


### 导出的参数 {#exported-parameters}


模块不导出任何参数。


### 导出的伪变量 {#exported-pseudo-variables}


#### $uuid


*$uuid* 变量返回一个新生成的
版本 4 UUID，其基于 /dev/urandom 的
高质量随机性（如果可用）。否则，将生成版本 1 UUID
（基于当前时间和本地以太网 MAC 地址）。


```opensips title="$uuid 用法"
xlog("generated uuid: $uuid\n");
```


### 导出的函数 {#exported-functions}


#### uuid(out_var, [version], [namespace], [name]) {#uuidout_var-version-namespace-name}


生成新的 UUID。


- *out_var* (var) - 用于返回所生成 UUID 的输出
变量。
- *version* (number, optional) - UUID 版本
号。支持的取值如下：
    - *0* - 将生成 RFC 版本 4 或
    版本 1 UUID，具体取决于
    /dev/urandom 高质量随机性是否
    可用。若缺少
    *version* 参数，则这是默认行为。
    - *1* - 基于当前时间和本地以太网
    MAC 地址的版本 1 UUID
    - *3* - 通过 MD5 对命名空间标识符
    和名称做哈希而生成的版本 3
    UUID。
    - *4* - 基于高质量随机数生成器
    的版本 4 UUID。若
    不可用，将以伪随机生成器
    替代。
    - *5* - 通过 SHA-1 对命名空间标识符
    和名称做哈希而生成的版本 5
    UUID。
    - *7* - 由时间戳和随机性
    生成的版本 7 UUID。
- *namespace* (string, optional) - 与
UUID 版本 3 和 5 一起使用的命名空间
标识符。它必须是有效的
UUID，一些预定义值参见 RFC 4122 附录 C。
- *name* (string, optional) - 与
UUID 版本 3 和 5 一起使用的名称。


如果使用 UUID 版本 1，且 UUID 是以不安全的
方式生成的，函数将返回值
*2*。这指的是在同步机制
不可用的情况下，两个并发
运行的进程可能生成相同 UUID（更多细节
参见 *libuuid* 的 *uuid_generate*
手册页）。


该函数可在任意路由中使用。
<!-- CONTRIBUTORS -->

### 许可证 {#license}

所有文档文件（即以 .md 为扩展名的文件）均按 Creative Common License 4.0 授权。
