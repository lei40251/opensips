---
title: "配置文件"
description: "OpenSIPS 配置文件包含控制核心与模块的全部参数，以及用于处理 SIP 流量的路由逻辑。"
---

OpenSIPS 配置文件包含控制核心与模块的全部参数，以及 OpenSIPS 用于路由 SIP 流量的实际路由逻辑。

安装完成后，默认配置文件路径为：

```text

[INSTALL_PATH]/etc/opensips/opensips.cfg

```

配置文件是纯文本，使用 OpenSIPS 自定义的类 C 语言编写。其中包含作用域各不相同的变量（本手册后续会详细说明）、`if` / `while` / `switch` 等常见控制结构，也支持带参数调用子过程。因此，只要具备一定的 SIP 与编程基础，脚本读起来应该相当直观。

> [!IMPORTANT]
> 对配置文件做任何修改后，**必须重启 OpenSIPS** 才能生效。

正因为每次修改配置文件都需要重启 OpenSIPS，务必确保所有改动都符合 OpenSIPS 的语法规范。

可以执行以下命令校验配置文件的合法性：

```text

[INSTALL_PATH]/sbin/opensips -C [PATH_TO_CFG]

```

校验时，若配置文件正确，OpenSIPS 返回 `0`；若存在错误，错误信息会输出到控制台，OpenSIPS 返回 `-1`。
