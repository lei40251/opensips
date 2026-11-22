---
title: "生成配置文件"
description: "使用 OpenSIPS 提供的 GNU M4 模板，生成用户注册、中继对接与负载均衡场景的配置。"
---

OpenSIPS 在 `examples/templates/` 目录下提供了开箱即用的 GNU M4 配置模板：

* `residential.m4`
* `trunking.m4`
* `loadbalancer.m4`

它们会作为共享示例安装到 `$PREFIX/share/opensips/examples/templates/`，发行版安装包通常使用 `/usr/share/opensips/examples/templates/`。

每个模板开头都定义了监听接口、数据库 URL、可选端点和功能开关，使用前请先修改这些定义。功能开关取值为 `yes` 或 `no`。

## 直接运行模板

用 `-f` 指定模板，并用 `-p m4` 让 OpenSIPS 在解析前先做预处理：

```bash
opensips -C -f examples/templates/residential.m4 -p m4
opensips -f examples/templates/residential.m4 -p m4
```

第一条命令用于校验生成的配置，第二条用于启动 OpenSIPS。系统中需已安装 GNU M4 且可在 `PATH` 中找到。

若使用发行版安装包，请改用共享示例目录中的模板：

```bash
opensips -f /usr/share/opensips/examples/templates/residential.m4 -p m4
```

## 生成独立配置文件

也可以把模板渲染成一份普通配置文件：

```bash
m4 examples/templates/residential.m4 > opensips.cfg
```

生成的文件不再需要预处理。按需修改后，按常规方式校验或启动即可：

```bash
opensips -C -f opensips.cfg
opensips -f opensips.cfg
```

更多示例见 `examples/templates/README.md`。
