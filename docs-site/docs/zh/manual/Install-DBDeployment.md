---
title: "数据库部署"
description: "使用 opensips-cli 部署 OpenSIPS 数据库，用于用户鉴权、注册持久化、对话状态等场景。"
---

安装完 OpenSIPS 之后，通常还需要部署一个数据库，以满足多种用途（数据库用户鉴权、注册信息持久化、对话状态保存等）。

---

可以使用 [opensips-cli](https://github.com/OpenSIPS/opensips-cli) 工具部署 opensips 数据库。开始前请先按[安装说明](https://github.com/OpenSIPS/opensips-cli#install)装好该工具。

## 配置 OpenSIPS CLI

打开 OpenSIPS CLI 的配置文件，设置以下参数：

* `database_schema_path` ——（默认 `/usr/share/opensips/`）请设为 `[Install_Path]/share/opensips/`
* `database_url` —— 数据库连接 URL（若不填写，部署过程中会提示输入）
* `database_name` ——（默认 `opensips`）要使用的数据库名
* `database_modules` ——（默认标准模块集）需要部署的模块

更多关于 OpenSIPS CLI 配置项的说明见[官方文档](https://github.com/OpenSIPS/opensips-cli/blob/master/docs/modules/database.md#configuration)。

> [!NOTE]
> OpenSIPS CLI 会依次在 `~/.opensips-cli.cfg`、`/etc/opensips-cli.cfg`、`/etc/opensips/opensips-cli.cfg` 中查找配置文件，也可以通过 `-f` 参数指定自定义配置文件。

## 创建数据库

要创建上面配置好的 `database_name` 数据库，执行：

```bash

opensips-cli -x database create

```

之后若需要新增某个模块（例如 presence），只需执行：

```bash

opensips-cli -x database add presence

```

也可以指定其它数据库名，例如 `opensips_test`：

```bash

opensips-cli -x database create opensips_test

```
