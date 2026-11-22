---
title: "JSON 模块"
description: "本模块引入一种新型变量，它同时提供 JSON 格式的序列化与反序列化能力。"
---


## 管理员指南 {#admin-guide}


### 概述 {#overview}


本模块引入一种新型变量，它同时提供 JSON 格式的序列化与反序列化能力。


该变量提供了访问对象和数组的方式，以便在脚本中新增、替换或删除取值。


正确的做法是把 JSON 对象视为哈希表（可以放入 (key;value) 键值对，也可以按键删除和获取取值），把 JSON 数组视为数组（可以追加、删除和替换取值）。


由于 JSON 格式允许在对象内部嵌套对象，因此可以有多个嵌套的哈希表或数组，并可通过路径访问它们。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


本模块不依赖其他模块。


#### 外部库或应用程序 {#external-libraries-or-applications}


- *libjson*
libjson C 库可从以下地址下载：
http://oss.metaparadigm.com/json-c/


### 导出的参数 {#exported-parameters}


#### enable_long_quoting (boolean)


如果输入的 JSON 中包含无法装入 4 字节的有符号整数（例如大于 2147483647 等），请启用该参数。启用该参数后，4 字节整数仍以整数返回，而更大的值将以字符串返回，以避免整数溢出。


*默认值为 false。*


```opensips title="设置 enable_long_quoting 参数"
...
modparam("json", "enable_long_quoting", true)
...
# 将 "gateway_id" 的整型/字符串取值统一规范为字符串
$var(gateway_id) = "" + $json(body/gateway_id);
...
```


### 导出的伪变量 {#exported-pseudo-variables}


#### $json(id)


`json` 变量提供访问 JSON 对象中字段、以及 JSON 数组中索引的方法。


##### 变量生命周期 {#variable-lifetime}


JSON 变量从被初始化那一刻起，对创建它的进程可用。它们不会按消息或按事务重置。若希望按消息使用，则需要每次重新初始化。


##### Accessing the $json(id) variable


描述 id 的文法为：


- id = name(identifier)*


- identifier = key | index


- key = /string | /$var


- index = [integer] | [$var] | []


"[]" 索引表示向数组追加。它只应在设置取值时使用，不应在获取取值时使用。


负索引可用于从末尾开始访问数组。因此 "[-1]" 表示最后一个元素。


> [!IMPORTANT]
> id 严格遵循该文法。
> 使用空格时需要留意，空格不会被忽略。这样设计是为了允许键中包含空格。


变量可用作索引或键。用作索引的变量必须包含整型值。用作键的变量应包含字符串值。


尝试从不存在路径（键或值）获取取值时，将返回 NULL 值，并在日志中写入提示消息，说明该 JSON 的取值和所用路径。


尝试在不存在路径中替换或插入取值时，设置取值将出错，并在日志中打印提示消息，说明该 JSON 的取值和所用路径


```opensips title="访问 $json 变量"
...
$json(obj1/key) = "value"; #在 json 对象中替换或插入 (key,value)
			   #键值对

$json(matrix1[1][2]) = 1;  #替换数组中索引 1 的元素里
			   #索引 2 处的元素

xlog("$json(name/key1[0][-1]/key2)"); #一个更复杂的示例

...
		
```


```opensips title="使用变量遍历数组"
...

$json(ar1) := "[1,2,3,4]";

$var(i) = 0;

while( $json(ar1[$var(i)]) )
{

	#打印每个值
	xlog("Found:[$json(ar1[$var(i)])]\n");

	#每个值自增
	$json(ar1[$var(i)])  = $json(ar1[$var(i)]) + 1 ;

	$var(i) = $var(i) + 1;

}


...
		
```


##### 遍历 {#traversal}


可以通过 for each 语句动态遍历 JSON 对象或数组，与索引伪变量的迭代方式类似。但需注意，$json 变量的索引方式在其他语句中不受支持（这里指的是对整个变量做索引，而非 *id* 文法中所接受的索引）。


若要显式遍历 JSON 对象的键或值，可对 *id* 中指定的路径使用 *.keys* 或 *.values* 后缀。


```opensips title="遍历 $json 对象的键"
...
$json(foo) := "{\"a\": 1, \"b\": 2, \"c\": 3}";
for ($var(k) in $(json(foo.keys)[*]))
    xlog("$var(k) ");
...
		
```


```opensips title="遍历 $json 对象的值"
...
$json(foo) := "{\"a\": 1, \"b\": 2, \"c\": 3}";
for ($var(v) in $(json(foo.values)[*]))
    xlog("$var(v) ");

# 等价于：

$json(foo) := "{\"a\": 1, \"b\": 2, \"c\": 3}";
for ($var(v) in $(json(foo)[*]))
    xlog("$var(v) ");
...
		
```


```opensips title="遍历 $json 数组的值"
...
$json(foo) := "[1, 2, 3]";
for ($var(v) in $(json(foo)[*]))
    xlog("$var(v) ");
...
		
```


##### Returned values from $json(id)


如果 id 指定的取值是整数，则返回整型值。


如果 id 指定的取值是字符串，则返回字符串。


如果 id 指定的取值是其他类型的 JSON（null、boolean、object、array），则返回该对象的序列化版本，作为字符串值。利用这一点和 ":=" 运算符，可以复制 JSON 对象并放入其他 JSON 对象中（对于字符串或整数可使用 "=" 运算符）。


如果 id 不存在，则返回 NULL 值。


##### Operators for the $json(id) variable


该变量共有 2 个可用的运算符。


###### The "=" operator


该运算符会把取值原样处理，并加入 JSON 对象（例如字符串值或整型值）。


将取值设为 NULL 会将其删除。


```opensips title="向数组追加整数"
...
$json(array1[]) = 1;
...
			
```


```opensips title="删除数组中的最后一个元素"
...
$json(array1[-1]) = NULL;
...
			
```


```opensips title="向 json 对象添加字符串值"
...
$json(object1/some_key) = "some_value";
...
			
```


###### The ":=" operator


该运算符会把取值按 JSON 对象解读后处理（例如该运算符应用于解析 JSON 输入）。


```opensips title="初始化数组"
...
$json(array1) := "[]";
...
			
```


```opensips title="设置布尔值或 null 值"
...
$json(array1[]) := "null";
$json(array1[]) := "true";
$json(array1[]) := "false";
...
			
```


```opensips title="将一个 json 添加到另一个 json"
...

$json(array) := "[1,2,3]";
$json(object) := "{}";
$json(object/array) := $json(array) ;
...
			
```


#### $json_pretty(id)


`json_pretty` 变量的用途与 `json` 变量相同，但以美观格式打印 JSON 对象，通过添加空格和制表符使输出更易读。


#### $json_compact(id)


`json_compact` 变量的用途与 `json` 变量相同，但以更紧凑的形式打印 JSON 对象，不添加格式化空格。


### 导出的函数 {#exported-functions}


#### json_link($json(dest_id), $json(source_id))


该函数可用于把 JSON 对象链接在一起。其效果与给对象设置取值类似，区别在于第二个对象不会被复制，只创建一个引用。


任一对象发生改动，在两个对象中都能看到。


可以用这种方式创建引用，使得每次访问字段时不必走完整路径（提升速度、代码更短）；也可以用于某个对象必须加入到许多其他对象、又不想每次都复制的情况（节省空间、提升速度）。


可以把该对象完全理解成面向对象语言中的引用。修改被变量引用的字段，会引起所有对象的修改，但修改变量本身不会引起其他对象的任何变化。


> [!WARNING]
> 使用引用时应小心。
> 如果不慎创建了循环引用，又尝试从该对象获取取值，将会使 OpenSIPS 崩溃。


```opensips title="创建引用"
...

$json(b) := "[{},{},{}]";

json_link($json(stub), $json(b[0]));

$json(stub/ana) = "are"; #添加到 stub
$json(stub/ar) := "[]";
$json(stub/ar[]) = 1;
$json(stub/ar[]) = 2;
$json(stub/ar[]) = 3;

$json(b[0]/ar[0]) = NULL; #从原始对象中删除

xlog("\nTest link :\n$json(stub)\n$json(b)\n\n");

/*Output:

Test link :
{ "ana": "are", "ar": [ 2, 3 ] }
[ { "ana": "are", "ar": [ 2, 3 ] }, { }, { } ]

*/

$json(stub) = NULL; #删除 stub，源对象不会发生任何变化


xlog("\nTest link :\n$json(stub)\n$json(b)\n\n");

/* Output:

Test link :
<null>
[ { "ana": "are", "ar": [ 2, 3 ] }, { }, { } ]

*/




...
			
```


```opensips title="[逻辑错误] 创建循环引用"
...

$json(b) := "[1]";

/* 千万不要这样做，此处仅用于说明哪些地方可能出问题  */
json_link($json(b[0]), $json(b)); #用对 b 的引用替换 1

xlog("\nTest link :\n$json(stub)\n$json(b)\n\n");

/* 这会使 OpenSIPS 崩溃，因为它会不断尝试
 先取 b，再取 b[0]，再取 b…… */


...
			
```


#### json_merge(main_json_var,patch_json_var,output_var))


该函数可用于以补丁方式把 patch_json_var 合并到 main_json_var，输出将填充到 output_var。


```opensips title="使用 json_merge"
...

$json(val1) := "{}";
$json(val1/test1) = "test_val1";
$json(val1/common_val) = "val_from1";

$json(val2) := "{}";
$json(val2/test2) = "test_val2";
$json(val1/common_val) = "val_from2";

json_merge($json(val1),$json(val2),$var(merged_json));
xlog("we merged and got $var(merged_json) \n");
# 将打印：
# we merged and got {"test1":"test_val1","common_val":"val_from2","test2":"test_val2"} 
			
```
<!-- CONTRIBUTORS -->

### 许可 {#license}

本项目的所有文档文件（即 .md 扩展名的文件）均以 Creative Common License 4.0 授权。
