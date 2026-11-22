---
title: "下载 OpenSIPS"
description: "提供各 Linux 发行版的 OpenSIPS 预编译二进制安装包与 Git 源码下载渠道。"
---

# 下载 OpenSIPS

**OpenSIPS 3.6** 为当前**稳定版（Stable）**，适用于生产环境部署。

---

## 预编译包下载（推荐方式）

官方仓库为各大主流 Linux 发行版（如 Debian、Ubuntu、RedHat/CentOS 等）提供了预编译好的安装包，可直接通过 APT/YUM 源进行安装：

* 访问官方安装包下载中心：[OpenSIPS Packages Repository](https://www.opensips.org/Downloads/Downloads#osipmi)

---

## Git 源码下载

OpenSIPS 的官方核心源码托管在 GitHub。如需获取最新 3.6 分支源码，可执行以下命令：

```bash
git clone --recurse-submodules https://github.com/OpenSIPS/opensips.git -b 3.6 opensips-3.6
```

> **提示**：`--recurse-submodules` 参数用于同步拉取关联的第三方子模块源码，推荐带上该参数。
