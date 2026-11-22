---
title: "使用 compression 模块"
description: "本教程讲解如何使用 compression 模块对 SIP 消息进行精简、压缩与解压缩。"
---

参见模块：["Compression"](https://docs.opensips.org/manual/devel/modules/compression)

## 教程概览 {#tutorial-overview}

本教程旨在帮助你理解 **compression** 模块的工作方式以及应当如何使用它。阅读本教程后，你应当了解该模块提供哪些函数，以及如何用它们来减小 SIP 消息的体积。

## 当前特性 {#current-features}

正如[文档](/zh/modules/compression)所述，该模块目前具备以下特性：
* **消息精简**
  * 未在给定白名单中指定的头域将被移除，Via、To 和 From 等强制头域除外
  * 部分具有压缩形式的头域（并非全部）会被缩减为短形式（例如 Via --> `v`；Content-Length --> `l`）
  * 同一类型的多个头域会被合并为一个头域，其中包含所有这些头域（例如 Header1: text1 与 Header1: text2 合并为 Header1: text1, text2）
  * 不必要的 SDP 消息体 `a=rtpmap:CODEC_NO` 行（其中 `CODEC_NO < 98`）将被移除
* **消息压缩/解压缩**
  * 压缩消息体
  * 压缩未在白名单中指定的头域，强制头域除外
  * base64 编码

## 示例脚本 {#example-script}
以下脚本实现了这样的场景：两台直连的 SIP 服务器。其中一台执行精简与压缩，然后转发消息。另一台接收压缩后的消息，将其解压缩后再转发。

为压缩服务器提供的 SIP 逻辑：
* 消息压缩
* 消息精简

为解压缩服务器提供的 SIP 逻辑：
* 消息解压缩

**压缩服务器**

必须加载该模块

```opensips
loadmodule "compression.so"
```

可选地，我们可以设置压缩级别（1-9），默认为 6：
```opensips
modparam("compression", "compression_level", 7)
```

然后假设我们希望对所有 INVITE 执行压缩与精简：

```opensips
route {
      if (is_method("INVITE")) {
         /*
             我们希望分别对消息体和头域进行压缩
             将使用 deflate
             不使用 base64
             假设我们要压缩的头域是 Header1 和 Header2
         */
         if (!mc_compress(0, "bhs", "Header1|Header2")) {
             xlog("compression failed\n");
             exit;
         }
         /*
            现在执行精简，但保留 User-Agent 和 P-Asserted-Identity 头域
            其余头域将被移除（强制头域除外）
            非常重要：请记住，如果在压缩之后执行精简，
            可能会新增 3 个头域：Content-Encoding（如果压缩了消息体）、
            Comp-Hdrs（被压缩的头域）、Headers-Encoding（用于压缩
            Comp-Hdrs 中头域的算法）。这些头域不会被
            OpenSIPS 保留，因此你必须在 mc_compact 的头域白名单中
            显式指定它们，以免被移除。
         */
         if (!mc_compact("User-Agent|P-Asserted-Identity|Content-Encoding|Comp-Hdrs|Headers-Encoding")) {
             xlog("Compaction failed\n");
             exit;
         }
         $var(dest) = "SO.ME.IP.ADDRESS:SOME_PORT";
         forward("$var(dest)");
      }
}
```

**现在转到接收端的服务器，即执行解压缩的那台。**

假设接收端服务器也加载了 "compression.so"。压缩服务器对 REGISTER 执行压缩，因此解压缩服务器也会做同样的处理。请记住，解压缩应当是对压缩消息最先执行的操作之一，因为该函数会替换 SIP 消息缓冲区，之前对消息所做的任何改动都不会被考虑。

```opensips
route {
      if (is_method("REGISTER")) {
          if (!mc_decompress()) {
              xlog("decompression failed\n");
              exit;
          }
          /* 使用解压缩后的消息 */
          #some_instructions#
          /* 转发它 */
          $var(endpoint_addr) = "SO.ME.IP.ADDRESS";
          forward("$var(endpoint_addr)");
      }
}
```
