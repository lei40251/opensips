---
title: "脚本语法"
description: "OpenSIPS 配置脚本有三个主要逻辑部分：全局参数、模块部分和路由逻辑。"
---

## 脚本格式

OpenSIPS 配置脚本有三个主要逻辑部分：

* 全局参数 
* 模块部分
* 路由逻辑

---

### 全局参数

通常，在第一部分中声明 [OpenSIPS 全局参数](Script-CoreParameters.md) —— 这些全局或核心参数会影响 OpenSIPS 核心，也可能影响模块。

配置网络监听地址、可用的传输协议、分叉（以及进程数）、日志和其他全局内容，都通过这些全局参数提供。

示例：

```opensips

disable_tcp = yes
listen = udp:192.168.3.60:5060
listen = udp:192.168.3.60:5070
fork = yes
children = 4
log_stderror = no

```

---

#### 模块部分

关于 OpenSIPS 模块，需要加载的模块（默认不加载任何模块）通过 **loadmodule** 指令指定。模块以名称加可选路径（指向 *.so* 文件）的方式指定。如果未提供路径（只给出模块名），则使用默认路径来查找并加载模块（默认路径为 */usr/lib/opensips/modules*，除非在[编译时](Install-CompileAndInstall.md)配置了其他路径）。如需配置不同的路径，既可以直接把路径与模块名一起给出（以便按模块单独控制），也可以通过 **mpath** 全局参数进行全局配置（对所有模块生效）。  
\
模块加载完成后，可以使用 **modparam** 指令设置模块参数 —— 每个模块的可用参数列表以及参数值的类型（整型或字符串），可在[模块文档](Modules.md)的 *Parameters* 部分找到。

示例：
```opensips

loadmodule "modules/mi_datagram/mi_datagram.so"
modparam("mi_datagram", "socket_name", "udp:127.0.0.1:4343")
modparam("mi_datagram", "children_count", 3)

```

或者 

```opensips

mpath="/usr/local/opensips_proxy/lib/modules"
loadmodule "mi_datagram.so"
modparam("mi_datagram", "socket_name", "udp:127.0.0.1:4343")
modparam("mi_datagram", "children_count", 3)
loadmodule "mi_fifo.so"
modparam("mi_fifo", "fifo_name", "/tmp/opensips_fifo")

```

---

#### 路由逻辑

路由逻辑实际上是若干路由（脚本路由）的集合，其中包含 OpenSIPS 处理 SIP 流量的路由逻辑。**OpenSIPS 针对 SIP 流量的行为**正是通过这些路由来描述的。  
\
路由有多种类型： 
* **顶层路由** —— 由 OpenSIPS 在某些事件发生时直接触发的路由（例如收到 SIP 请求、收到 SIP 应答、事务失败等）
* **子路由** —— 由脚本中的其他路由触发或使用的路由。
  

现有的**顶层路由**有哪些、何时触发、处理何种 SIP 消息、允许哪些 SIP 操作等，记录在[路由类型章节](Script-Routes.md)中。  
\
**子路由**有名称，可通过名称从脚本中的任意其他路由（顶层路由或子路由）调用。**子路由**在被调用时可以接收参数，也可以返回一个数字代码（避免返回 0 值，因为这会导致整个脚本终止）。**子路由**类似于任何编程语言中的函数/过程。
参见 *route* 指令的[说明](Script-CoreFunctions.md#setuser-user)。

## 数据类型

OpenSIPS 脚本语言支持以下数据类型：

### 基本类型

* *整型*（32 位，有符号）。
  * 最大值：+2,147,483,647 == 2 ^ 31 - 1
  * 最小值：-2,147,483,648 == - 2 ^ 31
* *字符串*（长度不限）
  * 注意，某些使用字符串的函数可能有内部缓冲区，从而限制字符串的最大长度（例如 [xlog()](./Script-CoreFunctions.md#xlog-log-level-format-string) 函数的输出缓冲区可通过 [xlog_buf_size](./Script-CoreParameters.md#xlog_buf_size) 配置）
* *double*（以字符串形式打包），通过 **[mathops](/zh/modules/mathops)** 模块

### 复合类型

* *列表*，通过 **[`$avp` 变量](./Script-CoreVar.md#avp-variables)**
* *映射*，通过 **[`$json`](/zh/modules/json#jsonid)** 和 **[`$xml`](/zh/modules/xml#xmlpath)** 变量

## 函数调用约定
所有 OpenSIPS [核心](./Script-CoreFunctions.md)和模块函数在内部共享同一套函数接口，因此它们遵循以下调用约定：

  

* **任何整型或字符串函数参数也可以使用“持有变量”传递**

```opensips

ds_select_dst(1, 1); 

```

……等价于：

```opensips

$var(x) = 1;
ds_select_dst($var(x), $var(x));

```

  

* **任何字符串函数参数都可以作为格式字符串传递**

```opensips

set_dlg_profile("caller", "$var(country_code)_$var(area)_$fU");

```

  

字面 **"$"** 字符可以通过 **"$$"** 转义序列包含在格式字符串中

  

> [!NOTE]
> 出于性能优化的考虑，上述约定在字符串参数上仍存在少数例外，因为有些函数仍要求某些参数是普通的静态字符串（例如 *save("location")*）。这类情况会在函数文档中说明。

  

* **传给函数的输入或输出变量不能加引号**：

```opensips

ds_count(1, "a", $var(out_result));

```

  

* **整型不再需要以双引号字符串的形式传递**：

```opensips del={2-2}
# 这是已弃用的写法
ds_select_dst("1", "1");
```

```opensips

ds_select_dst(1, 1);

```
