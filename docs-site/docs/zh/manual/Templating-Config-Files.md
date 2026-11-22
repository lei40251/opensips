---
title: "模板化 opensips.cfg 配置文件"
description: "通过 -p 预处理器选项，把 opensips.cfg 交给 m4、Jinja2、ERB 等模板引擎处理后交给 OpenSIPS 解析。"
---

## 通用预处理支持

从 OpenSIPS 3.0 起，脚本编写者可以把 *opensips.cfg*（包括它导入的其它文件）通过管道交给任意通用预处理命令处理。当 *opensips.cfg* 需要参数化（例如监听接口、端口、数据库连接器等）并自动化部署到多台服务器时，这一能力非常有用。系统管理员可通过 `-p <cmdline>`（preprocessor，预处理器）选项实现，例如：

```bash

opensips -f opensips.cfg -p /bin/cat

```

这是 `-p` 选项最基本的用法：指定一个从**标准输入**读取、原样输出到**标准输出**的 "echo" 型预处理器。在此基础上，只需选择一款符合部署需求的模板语言即可。一些简单的替换可以直接用 *sed* 完成：

```bash

opensips -f opensips.cfg -p "/bin/sed s/PRIVATE_IP/10.0.0.10/g"

```

## 常见模板语言与示例

当目标环境需要更复杂的判断（用 `if` 启用/禁用特性、对多个监听接口做 `for` 循环等）时，可以在 opensips.cfg 之上使用更强大的模板语言。下面是几个示例。

### GNU m4

[GNU m4](https://www.gnu.org/software/m4/) 是一款简洁易学的预处理器，主要特性包括文本替换、条件判断和文件包含。与 *opensips.cfg* 集成的示例如下：

```opensips

listen = udp:PRIVATE_IP:5060
loadmodule "proto_udp.so"

```
**opensips.cfg.m4**

```text

divert(-1)
define(`PRIVATE_IP', `127.0.0.1')
divert(0)dnl

```
**env.m4**

随后使用下面的命令启动 OpenSIPS：它会把 *opensips.cfg.m4* 通过管道送入 `m4` 的标准输入，再从标准输出读取生成后的结果。

```bash

opensips -f opensips.cfg.m4 -p "m4 env.m4 -"

```

### Jinja2

[Jinja2](http://jinja.pocoo.org/docs/2.10) 是一款功能丰富的现代模板语言，支持文本替换、`if` 判断、`for` 循环、大量过滤器、文件包含等等。与 *m4* 不同，Jinja2 目前没有独立的可执行程序，而是以 Python 包的形式提供。与 *opensips.cfg* 集成的方式如下：

首先用 `pip install jinja2` 安装 **jinja2** Python 模块，然后准备以下文件：

```opensips

listen = udp:{{ private_ip }}:5060
loadmodule "proto_udp.so"

```
**opensips.cfg.j2**

```python

import sys
import json
from jinja2 import Template

t = Template("".join(sys.stdin.readlines()))

with open('env.json') as f:
    print(t.render(json.load(f)))

```
**opensips-preproc.py**

```json

{
    "private_ip": "127.0.0.1"
}

```
**env.json**

随后使用下面的命令启动 OpenSIPS：

```bash

opensips -f opensips.cfg.j2 -p "python opensips-preproc.py"

```

### Embedded Ruby（ERB）

[Embedded Ruby (ERB)](https://ruby-doc.org/stdlib-2.6.1/libdoc/erb/rdoc/ERB.html) 为 Ruby 提供了一套易上手且强大的模板系统。借助 ERB，可以在任意纯文本文档中嵌入真正的 Ruby 代码，用于生成内容或控制流程。下面看看它如何与 *opensips.cfg* 集成：

首先安装 ERB 包（Debian/Ubuntu 执行 `apt install ruby-ejs`），然后准备以下文件：

```opensips

listen = udp:<%= private_ip %>:5060
loadmodule "proto_udp.so"

```
**opensips.cfg.erb**

```rb

#!/usr/bin/env ruby
require 'erb'
require './env.rb'

template = ERB.new($stdin.read, nil, '-')
$stdout.write template.result($erb_context)

```
**~/src/opensips-preproc.rb**

```rb

$erb_context = binding
private_ip   = '127.0.0.1'

```
**env.rb**

随后使用下面的命令启动 OpenSIPS：

```bash

opensips -f opensips.cfg.erb -p "ruby opensips-preproc.rb"

```

## 调试预处理器输出

预处理器的输出不会写入任何文件，每次运行时都由 OpenSIPS 直接消费。开发阶段若想查看并调试生成后的文件，可以在预处理命令外再包一层脚本，例如：

```bash

#!/bin/bash
  
m4 env.m4 - | tee >(grep -v __OSSPP_ >/tmp/opensips.cfg)

```
**~/src/preprocessor.sh**

然后这样启动 OpenSIPS：

```bash

opensips -f opensips.cfg.m4 -p ~/src/preprocessor.sh

```

同样的方法也适用于任何其它预处理器。
