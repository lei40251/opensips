---
title: "一致性测试"
description: "运行一致性/符合性测试，用于在特定场景下验证 OpenSIPS 的行为，确保对代码的任何改动（缺陷修复或新增功能）都符合预期规范且不引入回归。"
---

运行一致性/符合性测试是为了在特定场景下验证 OpenSIPS 的行为。其目标是确保对 OpenSIPS 代码的任何改动（无论是缺陷修复还是新增功能）都按预期规范运行，且不存在回归。

为此，我们开发了一组测试集，它们在不同场景下以不同的 SIP 流程执行 OpenSIPS，并验证所有涉及的组件（OpenSIPS 以及数据库、数据配置、SIP UA）都能正确互通，且行为符合预期。

---

## 环境准备

首要要求是安装 [SIPssert](https://github.com/OpenSIPS/SIPssert) —— 一个能够编排复杂一致性场景并验证其执行过程的测试框架。可按项目页面上的 [安装说明](https://github.com/OpenSIPS/SIPssert#installation) 操作。

接下来需要获取可用的测试。首次搭建时，需要克隆仓库：
```bash

git clone git@github.com:OpenSIPS/sipssert-opensips-tests.git

```

如果针对的是稳定版本，务必指定所需的 OpenSIPS 分支/版本：
```bash

git clone -b 3.6 git@github.com:OpenSIPS/sipssert-opensips-tests.git

```

进入测试目录。如果仓库此前已克隆过，务必通过执行以下命令保持其最新：
```bash

git pull --rebase

```

---

## 测试

SIPssert 就绪且测试仓库已克隆后，需要进入测试仓库并运行：
```bash

sipssert *

```

该命令将使用默认配置运行所有可用的测试集。如果只想测试某个特定的测试集或某个特定的测试，可以向 `sipssert` 工具提供额外参数。更多信息请参见 [使用说明](https://github.com/OpenSIPS/SIPssert#usage) 页面。

---

## 开发

开发新测试永远有空间，既可以用来确保旧代码行为正确，也可以用来证明其行为不正确 —— 欢迎任何贡献。因此，如果有想要加入的新测试，请随时在 [项目跟踪器](https://github.com/OpenSIPS/sipssert-opensips-tests/pulls) 上提交 pull request。
