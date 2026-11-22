---
title: "编译与安装"
description: "通过 Makefile.conf 配置构建参数，从源码编译并安装 OpenSIPS。"
---

本页面向需要从源码编译 OpenSIPS 的用户。若使用预编译二进制包，请直接通过操作系统自带的包管理器安装。

## 配置构建参数

构建配置保存在仓库根目录的 `Makefile.conf` 中。首次执行 `make` 时，若该文件尚不存在，会自动从 `Makefile.conf.template` 复制生成。也可以显式手动准备：

```bash
cp Makefile.conf.template Makefile.conf
```

编译前请按需编辑 `Makefile.conf`。后续重新编译时请保留此文件；它被刻意排除在 Git 版本控制之外。

### 选择要编译的模块

`exclude_modules` 列出了在常规 `modules` 和 `all` 目标中跳过的模块，默认主要是依赖外部开发库的模块。装好某个模块所需的开发依赖后，可将其从该列表中移除；或者加入 `include_modules`，在不改写默认排除列表的情况下强制纳入编译：

```make
include_modules += db_mysql json
```

也可以显式排除额外模块：

```make
exclude_modules += cachedb_redis event_rabbitmq
```

对于同一个模块，`include_modules` 优先级更高。模块名即 `modules/` 下的目录名。

若只是一次性构建，也可在命令行直接传入相同变量：

```bash
make -j4 modules include_modules="db_mysql json"
make -j4 modules skip_modules="cachedb_redis event_rabbitmq"
```

### 调整编译器与链接器参数

使用 `CC_EXTRA_OPTS` 和 `LD_EXTRA_OPTS` 追加编译器、链接器选项：

```make
CC_EXTRA_OPTS += -O2 -march=native
LD_EXTRA_OPTS += -Wl,--as-needed
```

使用 `DEFS` 设置 OpenSIPS 的编译期宏定义。`Makefile.conf.template` 中列出了受支持的宏及简要说明：取消注释即可启用被禁用的宏，也可以直接添加：

```make
DEFS += -DEXTRA_DEBUG
DEFS += -DSHM_EXTRA_STATS
```

只启用明确了解其行为的宏。部分内存分配器与锁相关的宏互斥，或会显著影响运行时性能。修改编译选项或编译期宏后，重新构建前请先执行 `make proper`。

### 设置安装前缀

在 `Makefile.conf` 中通过 `PREFIX` 修改默认安装根目录：

```make
PREFIX ?= /opt/opensips/
```

编译与安装务必使用同一个前缀，因为默认配置文件路径会被编译进 OpenSIPS 二进制文件中。

## 编译

构建核心与所选模块：

```bash
make -j4 all
```

常用的更细粒度目标：

```bash
make -j1                 # 仅编译核心二进制
make -j4 modules         # 仅编译所选模块
make -j1 modules module=db_mysql
```

## 安装

按 `Makefile.conf` 中的配置，安装核心、所选模块、文档以及数据库表结构：

```bash
make install
```

命令行变量会临时覆盖对应配置，仅对本次操作生效。构建与安装两步请传入相同的值。
