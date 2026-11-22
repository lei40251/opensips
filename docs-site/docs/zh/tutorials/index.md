---
title: "进阶教程"
description: "OpenSIPS 实战教程合集：拓扑隐藏、计费、呈现、外部集成、安全加固与集群部署。"
---

# 进阶教程 {#advanced-tutorials}

这些教程面向真实部署场景，比模块参考更进一步。每篇都讲清架构思路，给出可运行的配置脚本，并点出容易踩的坑。

## [拓扑隐藏](/zh/tutorials/topology-hiding)

简要介绍 topology_hiding 模块的配置与使用。

## [高级计费](/zh/tutorials/advanced-accounting)

揭示 OpenSIPS 中 SIP 计费的运作方式，从基础场景到自定义 CDR，再到呼叫前转的多段计费，全部配有详细说明和可运行的脚本示例。

## [脚本辅助](/zh/tutorials/scripthelper)

模块说明与一个完整的使用示例。

## [SIPREC 呼叫录音](/zh/tutorials/siprec)

本教程演示如何使用 SIPREC 标准实现呼叫录音。

## [欺诈检测](/zh/tutorials/frauddetection)

新模块的功能描述，并附一个完整的使用示例。

## [消息压缩](/zh/tutorials/compression)

模块说明与一个完整的使用示例。

## [紧急呼叫](/zh/tutorials/emergency)

架构设计与完整的使用示例。

## [WebSocket 集成](/zh/tutorials/websocket)

如何为现有的 OpenSIPS 部署增加 WebSocket 与 WebSocket Secure（仅 2.2+）能力。

## [B2BUA](/zh/tutorials/b2bua)

B2BUA 的架构、业务场景文档，以及 OpenSIPS B2BUA 服务的配置方法。

## [呈现服务器](/zh/tutorials/presence-server)

OpenSIPS 中呈现服务器的设计与配置。

## [呈现用户代理](/zh/tutorials/presence-useragent)

OpenSIPS 中呈现用户代理的支持与配置。

## [呈现 RLS](/zh/tutorials/presence-rls)

OpenSIPS 中呈现 RLS 的支持与配置。

## [负载均衡](/zh/tutorials/loadbalancing)

如何使用 OpenSIPS 的负载均衡模块，按真实目标负载来分发流量。

## [键值接口](/zh/tutorials/keyvalueinterface)

如何使用 OpenSIPS 的键值接口存储持久或临时的键值信息。

## [事件接口](/zh/tutorials/eventinterface)

如何使用 OpenSIPS 事件接口向外部应用推送事件。

## [内存缓存](/zh/tutorials/memorycaching)

如何使用 OpenSIPS 的 memcache 支持来减少数据库查询，例如鉴权查询。

## [FreeSWITCH 媒体集成](/zh/tutorials/opensipsfreeswitchintegration)

OpenSIPS 与 FreeSWITCH 媒体服务器之间的实时集成，用于语音信箱、会议和语音通告等服务。

## [Asterisk 实时集成](/zh/tutorials/opensipsasteriskintegration)

OpenSIPS 与 Asterisk 媒体服务器之间的实时集成，用于语音信箱、会议和语音通告等服务。

## [并发呼叫限制](/zh/tutorials/concurrentcallslimitation)

如何在 OpenSIPS 中控制单个用户允许发起的并发呼叫数量。

## [TLS 配置](/zh/tutorials/tls)

如何编译并配置 OpenSIPS 的 TLS 支持，附带脚本示例。

## [RADIUS 集成](/zh/tutorials/radius)

如何安装、配置、集成并使用 FreeRADIUS 服务器与 Radiusclient-ng，配合 OpenSIPS 模块完成计费与授权。

## [SIP 重定向服务器](/zh/tutorials/redirect)

如何使用外部脚本把 OpenSIPS 配置为 SIP 重定向服务器，并配合基于 IP 的限制。

## [fail2ban 集成](/zh/tutorials/fail2ban)

用 fail2ban 配合 OpenSIPS，封禁反复使用错误凭据发起攻击的来源。

## [Sangoma 语音转码](/zh/tutorials/sangomavoicetranscoding)

使用 OpenSIPS 与 Sangoma 硬件进行音频转码。

## [中继注册](/zh/tutorials/midregistrar)

如何把 OpenSIPS 的中继注册（mid-registrar）接入你的 VoIP 平台，让它能持续扩展。

## [联邦式用户位置](/zh/tutorials/distributed-user-location-federation)

联邦式用户位置集群的完整指南：搭建、配置、路由、NAT 穿透与高可用。

## [全共享用户位置](/zh/tutorials/distributed-user-location-full-sharing)

关于几种关键「全共享」用户位置部署模式的详细说明与配置示例。

## [Diameter 计费](/zh/tutorials/diameter-aaa)

如何配置与部署 aaa_diameter 模块以及 app_opensips 应用。

## [RCS 能力管理](/zh/tutorials/rcs-managing-capabilities)

处理大体积 RCS 能力列表时的字符串处理技巧。

## [Diameter 客户端/服务器](/zh/tutorials/diameter-client-server)

如何为 IMS 网络编写 Diameter 客户端和/或服务端的交互脚本。
