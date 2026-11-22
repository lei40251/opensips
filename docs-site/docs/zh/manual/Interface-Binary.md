---
title: "二进制内部接口"
description: "二进制内部接口是 OpenSIPS 的核心接口，为各个 OpenSIPS 实例之间的通信提供高效方式。这在实时数据（如对话）已无法简单存入数据库的场景中尤为有用，因为故障切换需要数分钟才能完成。"
---

**二进制内部接口（Binary Internal Interface）** 是 OpenSIPS 的核心接口，为各个 OpenSIPS 实例之间的通信提供高效方式。这在实时数据（如对话）已无法简单存入数据库的场景中尤为有用，因为故障切换需要整整数分钟才能完成。通过新的内部二进制接口，把与运行时数据相关的所有事件（创建 / 更新 / 删除）复制到备用 OpenSIPS 实例，即可解决该问题。

---

## 配置二进制内部接口监听地址

为了监听传入的二进制数据包，必须指定 **bin:** 接口。其监听进程数量可通过 *[tcp_workers](./Script-CoreParameters.md#tcp_workers)* 核心参数调整。

```opensips

   listen = bin:10.0.0.150:5062
   ...
   loadmodule "proto_bin.so"

```

使用二进制接口的集群化模块示例包括 **dialog** 和 **usrloc**，因为它们现在可以把所有运行时事件（对话/联系人的创建/更新/删除）复制到一个或多个 OpenSIPS 实例。配置方式如下：

```opensips

   modparam("dialog", "dialog_replication_cluster", 1)
   modparam("dialog", "profile_replication_cluster", 2)
   ...
   modparam("usrloc", "location_cluster", 2)

```

更多细节可查阅 [dialog](/zh/modules/dialog#dialog-clustering) 和 [usrloc](/zh/modules/usrloc#distributed-sip-user-location) 文档页面。

---

## C 接口概览（面向模块开发者）

该接口允许模块编写者以直观的方式构建并发送紧凑的 **二进制数据包**。

为了 **发送数据包**，接口提供以下原语：
* *int bin_init(str *mod_name, int packet_type)* —— 开始构建一个新的二进制数据包
* *int bin_push_str(const str *info)* —— 向当前正在构建的二进制数据包中添加一个字符串
* *int bin_push_int(int info)* —— 向当前正在构建的二进制数据包中添加一个整型
* *int bin_send(union sockaddr_union *dest)* —— 通过 UDP 将二进制数据包发送到给定目的地

  

为了 **接收数据包**，模块必须首先向接口注册一个回调函数：
* *int bin_register_cb(char *mod_name, void (*)(int packet_type))*

  

每次该回调被触发时，可以按照写入时的相同顺序取回信息，方法如下：
* *int bin_pop_str(str *info)* —— 从收到的二进制数据包中取回一个字符串
* *int bin_pop_int(void *info)* —— 从收到的二进制数据包中取回一个整型
