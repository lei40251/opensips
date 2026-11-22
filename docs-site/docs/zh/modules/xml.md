---
title: "XML 模块"
description: "本模块导出一个脚本变量，提供对 XML 文档或 XML 数据块的基本解析与操作能力。"
sidebar: false
---


## 管理指南 {#admin-guide}


### 概述 {#overview}


本模块导出一个脚本变量，提供对 XML 文档或 XML 数据块的基本解析与操作功能。该变量可用于访问整个 XML 元素、其文本内容或其属性。既可以修改内容与属性，也可以在 XML 树中增加或移除节点。


该处理在验证层面不考虑任何 DTD 或 schema。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


本模块不依赖其他模块。


#### 外部库或应用程序 {#external-libraries-or-applications}


- *libxml2* 大多数 Linux 和 BSD 发行版都包含 libxml，但该库也可从以下地址下载：xmlsoft.org


### 导出的参数 {#exported-parameters}


本模块不导出任何参数。


### 导出的伪变量 {#exported-pseudo-variables}


#### $xml(path)


本模块导出 *$xml(path)* 变量。


##### 变量生命周期 {#variable-lifetime}


XML 变量自初始化之时起对该变量所在的进程可用。它们不会按消息或按事务重置。若希望按消息使用，则需每次都重新初始化。


##### Accessing the $xml(path) variable


访问元素与属性基于 XML 文档的树形表示，因此需要给出从根节点开始的完整路径。XML 文档在内存中的等价物是「XML 对象」，使用前必须用一段格式正确的 XML 数据对其初始化。因此，路径必须以对象名开头，后跟任意数量的节点，直至目标元素。


描述路径的文法为：
- path = name | name(identifier)+(access)?
- identifier = element(index)?
- element = /string | /$var
- index = [integer] | [$var]
- access = .val | .attr/string | .attr/$var


为在树的某一层级上区分同名节点，可提供索引，索引从 0 开始。


路径中的节点序列之后可跟 *.val*，以访问最后一个节点的文本内容；也可跟 *.attr/attr_name*，以访问其名为 *attr_name* 的属性。否则访问的是整个元素（起始标签、结束标签、子元素与内容）。


向该变量赋 NULL，会依据访问模式移除整个元素，或其文本内容，或其属性。


若要插入元素，必须向父节点赋一个字符串值（其中包含一段格式正确、具有根节点的 XML 数据）。注意，直接向某节点赋值不会用该值替换该节点。


> [!IMPORTANT]
> 在 XML 中，文档内容里的所有字符都是有意义的，包括空白符和用于格式化的换行。返回元素及其内容时会保留全部空白字符与换行；在已有节点下添加新节点时，若希望带缩进插入，必须在所赋的字符串中包含所需的字符。


其他脚本变量可用作路径中的元素名、属性名和索引。用作索引的变量必须包含整型值。用作元素名或属性名的变量应包含字符串值。


```opensips title="Creating a document"
...
$xml(my_doc) = "<doc></doc>";        # 初始化对象

$xml(my_doc/doc) = "<list></list>";  # 添加一个 "list" 节点

$xml(my_doc/doc/list) = "<item>some_value</item>";    # 向 list 添加一个 "item" 节点

$xml(my_doc/doc/list) = "<item>another_value</item>"; # 向 list 再添加一个 item

$xml(my_doc/doc/list/item[1].val) = "new_val";        # 设置上一个 item 的文本内容

$xml(my_doc/doc/list.attr/sort) = "asc";              # 为 list 节点添加属性 "sort"

$xml(my_doc/doc/list.attr/sort) = NULL;               # 移除上一个属性

$xml(my_doc/doc/list/item[1]) = NULL;                 # 移除第二个 item

$xml(my_doc/doc/list.val) = "end";                    # 向 list 添加文本内容，此时 list 具有
                                                      # 混合内容

$xml(my_doc/doc/list.val) = NULL;                     # 移除文本内容

xlog("$xml(my_doc/doc/list)\n");                      # 显示整个 list

xlog("$xml(my_doc)\n");                               # 显示整个文档

$xml(my_doc) = NULL;                                  # 清空整个文档
...
				
```


```opensips title="Inserting nodes with indentation"
...
$xml(my_doc) = "<doc>\n</doc>";
$xml(my_doc/doc) = "\t<list></list>\n";
$xml(my_doc/doc/list) = "\n\t\t<item></item>\n\t";

# 这将创建如下文档：
# <doc>
#	<list>
#		<item></item>
#	</list>
# </doc>
#
# 若没有这些显式的格式化字符，文档将是：
# <doc><list><item></item></list></doc>
...
				
```


```opensips title="Using script variables in path"
...
# 访问 list 中第二个 item 的属性
$var(my_list) = "list";
$var(my_idx) = 1;
$var(my_attr) = "sort";
xlog("$xml(my_doc/doc/$var(my_list)/item[$var(my_idx)].attr/$var(my_attr))\n");
...
				
```


### 导出的函数 {#exported-functions}


本模块不导出任何脚本函数。
<!-- CONTRIBUTORS -->

### 许可证 {#license}

本项目的所有文档文件（即 .md 扩展名的文件）均以 Creative Common License 4.0 授权。
