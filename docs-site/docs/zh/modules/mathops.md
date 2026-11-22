---
title: "mathops 模块"
description: "mathops 模块提供一系列函数，可在 OpenSIPS 脚本层执行各种浮点运算。"
---


## 管理指南 {#admin-guide}


### 概述 {#overview}


mathops 模块提供一系列函数，可在 OpenSIPS 脚本层执行各种浮点运算。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


以下模块必须在本模块之前加载：


- *不依赖其他 OpenSIPS 模块*。


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，必须安装以下库或应用程序：


- *无*。


### 导出参数 {#exported-parameters}


#### decimal_digits (integer)


所有模块函数返回结果的精度。"decimal_digits" 值越大，结果保留的小数位数越多。


默认值为 "6"。


```opensips title="设置 decimal_digits 模块参数"
modparam("mathops", "decimal_digits", 10)
```


### 导出函数 {#exported-functions}


#### math_eval(expression, result_var)


该函数对给定的表达式求值，并把结果写入输出伪变量。求值使用 tinyexpr（参见 https://github.com/codeplea/tinyexpr）。


目前支持的表达式语法：


- 嵌套括号
- 加法 (+)、减法/取负 (-)、乘法 (*)、除法 (/)、幂运算 (^) 和取模 (%)，遵循常规运算符优先级（唯一例外是幂运算从左到右求值）
- C 数学函数：abs（调用 fabs）、acos、asin、atan、ceil、cos、cosh、exp、floor、ln（调用 log）、log（调用 log10）、sin、sinh、sqrt、tan、tanh


参数含义如下：


- *expression* (string) - 一个数学表达式。
- *result_var* (var) - 用于保存求值结果的变量。


该函数可在任意路由中使用。


```opensips title="math_eval 用法"
...
# 计算某个随机数学表达式

$avp(1) = "3.141592";
$avp(2) = "2.71828";
$avp(3) = "123.45678";

if (math_eval("$avp(1) * ($avp(3) - ($avp(1) - $avp(2))) / $avp(3)", $avp(result))) {
	xlog("Result of expression: $avp(result)\n");
} else {
	xlog("Math eval failed!\n");
}

...
```


#### math_rpn(expression, result_var)


该函数对给定的 RPN 表达式求值，并把结果写入输出变量。


表达式以逆波兰表示法（Reverse Polish Notation）指定。值被压入栈，运算在该栈上执行。支持以下运算：


- 二元运算符：+ - / * mod pow
- 一元函数：neg exp ln log10 abs sqrt cbrt floor ceil round nearbyint trunc
neg 会改变栈顶元素的正负号
ln 为自然对数；abs 为绝对值；其他函数为标准 C 函数
- 常量：e pi
- 栈操作命令：drop dup swap


参数含义如下：


- *expression* (string) - 一个 RPN 表达式。
- *result_var* (var) - 用于保存求值结果的变量。


该函数可在任意路由中使用。


```opensips title="math_rpn 用法"
$avp(1) = "3";

if (math_rpn("1 $avp(1) swap swap dup drop / exp ln 1 swap /", $avp(result))) {
	xlog("Result of expression: $avp(result)\n");
} else {
	xlog("RPN eval failed!\n");
}

/* 该示例 RPN 脚本会先将 1 再 3 压入栈，然后执行若干空操作
（两次交换这两个值，复制其中一个再丢弃副本），
计算 1 除以 3，再做一次空操作（幂运算后取对数），
最后计算 1 除以上述结果，最终结果为 3。 */
```


#### math_trunc(number, result_var)


向零方向截断一个数值。也就是说 trunc(3.7) = 3.0，trunc(-2.9) = -2.0。


参数含义如下：


- *number* (string) - 待截断的数值。
- *result_var* (var) - 用于保存求值结果的变量。


该函数可在任意路由中使用。


```opensips title="math_trunc 用法"
...
# 截断某个随机数

$avp(1) = "3.141492";

if (math_trunc($avp(1), $avp(result))) {
	xlog("Truncate result: $avp(result)\n");
} else {
	xlog("Truncate failed!\n");
}
...
```


#### math_floor(number, result_var)


截断一个数值，始终朝 -infinity 方向。也就是说 floor(3.7) = 3.0，floor(-2.9) = -3.0


参数含义如下：


- *number* (string) - 待截断的数值。
- *result_var* (var) - 用于保存求值结果的变量。


该函数可在任意路由中使用。


```opensips title="math_floor 用法"
...
# 截断某个随机数

$avp(1) = "3.141492";

if (math_floor($avp(1), $avp(result))) {
	xlog("Floor result: $avp(result)\n");
} else {
	xlog("Floor operation failed!\n");
}
...
```


#### math_ceil(number, result_var)


截断一个数值，始终朝 +infinity 方向。也就是说 ceil(3.2) = 4.0，ceil(-2.9) = -2.0


参数含义如下：


- *number* (string) - 待截断的数值。
- *result_var* (var) - 用于保存求值结果的变量。


该函数可在任意路由中使用。


```opensips title="math_ceil 用法"
...
# 截断某个随机数

$avp(1) = "3.141492";

if (math_ceil($avp(1), $avp(result))) {
	xlog("Ceil result: $avp(result)\n");
} else {
	xlog("Ceil operation failed!\n");
}
...
```


#### math_round(number, result_var[, decimals])


round 函数返回最接近的整数，遇到中值时向远离零的方向取整。例如：round(1.2) = 1.0，round(0.5) = 1.0，round(-0.5) = -1.0


默认情况下，函数返回一个整数。另有一个参数控制保留初始数值的多少位小数。随后使用剩余的小数位进行取整，结果将是以字符串表示的浮点值。


参数含义如下：


- *number* (string) - 待取整的数值。
- *result_var* - 用于保存求值结果的变量。
- *decimals* (int, 可选) -
进一步提高取整的精度。


该函数可在任意路由中使用。


```opensips title="math_round 用法"
...
# 对 PI 取整

$avp(1) = "3.141492";

if (math_round($avp(1), $avp(result))) {

	# 结果应为：3
	xlog("Round result: $avp(result)\n");
} else {
	xlog("Round operation failed!\n");
}

...

if (math_round($avp(1), $avp(result), 4)) {

	# 结果应为："3.1415"
	xlog("Round result: $avp(result)\n");
} else {
	xlog("Round operation failed!\n");
}
...
```


#### math_round_sf(number, result_var, figures)


简单来说，按 N 位有效数字取整的做法是：先得到保留 N 位有效数字后的数值（必要时补 0），然后若第 N+1 位数字大于或等于 5，则对其进行调整。


一些示例：


- round_sf(17892.987, 1) = 20000
round_sf(17892.987, 2) = 18000
round_sf(17892.987, 3) = 17900
round_sf(17892.987, 4) = 17890
round_sf(17892.987, 5) = 17893
round_sf(17892.987, 6) = 17893.0
round_sf(17892.987, 7) = 17892.99


参数含义如下：


- *number* (string) - 待取整的数值。
- *result_var* (var) - 用于保存求值结果的变量。
- *figures* -
进一步提高取整的精度。


该函数可在任意路由中使用。


```opensips title="math_round_sf 用法"
...
# 对 PI 取整

$avp(1) = "3.141492";

if (math_round_sf($avp(1), $avp(result), 4)) {

	# 结果应为："3.141"
	xlog("Round result: $avp(result)\n");
} else {
	xlog("Round operation failed!\n");
}

...
```


#### math_compare(exp1, exp2, result_var)


比较 exp1 与 exp2，并在 result_var 中返回比较结果。使用标准的比较返回码：如果 exp1 > exp2，则 result_var = 1。否则如果 exp2 > exp1，则 result_var = -1；否则（两者相等时）在 result_var 中填充 0


参数含义如下：


- *exp1* (string) - 第一个待求值并用于比较的表达式。
- *exp2* (string) - 第二个待求值并用于比较的表达式。
- *result_var* (var) - 用于保存比较结果的变量。


该函数可在任意路由中使用。


```opensips title="math_compare 用法"
...
# 对 PI 取整

$var(exp1) = "1 + 8";
$var(exp2) = "7/2";

if (math_compare($var(exp1), $var(exp2), $var(result))) {

	# 因为 9 > 3.5，$var(result) 将为 1
}

...
```
<!-- CONTRIBUTORS -->

### 许可 {#license}

所有文档文件（即 .md 扩展名）均按 Creative Common License 4.0 授权。
