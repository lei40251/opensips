---
title: "Prometheus 模块"
description: "本模块为 [Prometheus](https://prometheus.io/) 监控系统提供 HTTP 接口，使其能够从 OpenSIPS 获取各类统计。"
---


## 管理员指南 {#admin-guide}


### 概述 {#overview}


本模块为
[Prometheus](https://prometheus.io/)
监控系统提供 HTTP 接口，使其能够从 OpenSIPS 获取各类统计。


要使用它，必须通过
[statistics](#statisticsstring) 参数显式列出你希望提供的统计项。


目前模块仅支持 *counter* 与 *gauge*
两类指标类型，具体某项统计选用哪一种，取决于该统计的定义方式——
要么在内部定义，要么通过 *statistics* 模块的
*variable* 参数显式定义。


每个导出的统计项都带有一个 *group* 标签，
用于指示其所属的分组。


### 依赖 {#dependencies}


#### 外部库或应用 {#external-libraries-or-applications}


无


#### OpenSIPS 模块 {#opensips-modules}


本模块加载前必须先加载以下模块：


- *httpd* 模块。


### 导出的参数 {#exported-parameters}


#### root(string)


指定 Prometheus 用于查询统计的指标根路径：
*http://[opensips_IP]:[opensips_httpd_port]/[root]*


*默认值为 "metrics"。*


```opensips title="Set root parameter"
...
modparam("prometheus", "root", "prometheus")
...
```


#### prefix(string)


为每个导出的统计项追加前缀。


*默认值为 "opensips"。*


```opensips title="Set prefix parameter"
...
modparam("prometheus", "prefix", "opensips_1")
...
```


#### group_prefix(string)


为统计项所属分组的名称追加前缀。


*默认值为 ""（无分组前缀）。*


```opensips title="Set group_prefix parameter"
...
modparam("prometheus", "group_prefix", "opensips")
...
```


#### delimiter(string)


指定用于分隔 *prefix*
与 *group_prefix* 的分隔符。


*默认值为 "_"。*


```opensips title="Set delimiter parameter"
...
modparam("prometheus", "delimiter", "-")
...
```


#### group_label(string)


指定当 *group_mode* 为 2 时用于存储分组的标签。


*默认值为 "group"。*


```opensips title="Set group_label parameter"
...
modparam("prometheus", "group_label", "grp")
...
```


#### group_mode(int)


指定统计项的分组应如何提供给
Prometheus。可用模式如下：


- *0* - 不发送统计分组。
- *1* - 以统计项名称的形式发送分组。
timestamp
core
opensips_core_timestamp
group_prefix
- *2* - 以统计项标签的形式发送分组。
group_label


*默认值为 0（不指定分组）。*


```opensips title="Set group_mode parameter"
...
modparam("prometheus", "group_mode", 1)
...
```


#### statistics(string) {#statisticsstring}


OpenSIPS 导出的统计项，以空格分隔。
列表也可以包含统计分组的名称——为此，需在分组名称末尾
添加冒号（*:*）。


若使用 *all* 值，模块将暴露
所有可用统计——因此该参数的其他任何设置
都将失效；


该参数可多次定义。


*默认值为空：不导出任何指标。*


```opensips title="Set statistics parameter"
...
# 导出活跃对话数量与 load 统计分组
modparam("prometheus", "statistics", "active_dialogs load:")
...
```


#### labels(string)


定义如何转换组内统计项的名称，
以得到推送到 Prometheus 的名称与标签集合的规则。


格式为 *group: regex*，其中
*group* 表示应对其应用该正则表达式的统计分组，
*regexp* 是用于匹配统计项名称、并将其转换为所需
名称与标签的正则表达式。


*regex* 格式为
*/matching_expression/substitution_expression/flags*。
替换后得到的 *substitution_expression*
应生成如下格式的字符串：*name:labels*，其中
*name* 表示推送到 Prometheus 时使用的统计项名称，
*labels* 为标签，以逗号分隔的 *key=value* 对
表示，与 Prometheus 接收的形式一致。
*注意*，生成的 *labels*
字符串会作为普通字符串拼接到其他标签之后——
不执行任何其他变换。


若声明分组内的统计项名称不匹配该正则表达式，
或生成结果不符合
*name:labels* 格式，则忽略该统计变换，
按普通统计项打印，如同未使用该规则。


该参数可多次定义，甚至可针对同一分组。
但若统计项匹配多个正则表达式，仅考虑
第一个匹配的正则表达式。检查顺序即
脚本中的声明顺序。


*默认值为空：直接使用统计项名称。*


```opensips title="Set statistics parameter"
...
# 将 duration_gateway 转换为名为 duration 的统计，并以 gateway 作为标签
modparam("prometheus", "labels", "group: /^(.*)_(.*)$/\1:gateway=\"\2\"/")
...
```


#### script_route(string) {#script_routestring}


指定用于添加自定义 Prometheus 信息的路由名称。


*默认值为 ""——不调用自定义路由。*


```opensips title="Set script_route parameter"
...
modparam("prometheus", "script_route", "my_custom_prometheus_route")
...
route[my_custom_prometheus_route] {
	# * 返回的 JSON 需包含一个对象数组
	#   每个对象含 header 与 values 字段
	# * header 字段应包含自定义 Prometheus 统计头部
	# * values 字段本身是一个数组，由 name/value 对象组成
	#   用于逐项发布统计
	return (1, '[{
        "header": "# TYPE opensips_total_cps gauge",
        "values": [
            {
                "name": "opensips_total_cps",
                "value": 3
            }
        ]
    }, {
        "header": "# TYPE opensips_disabled_rtpengine gauge",
        "values": [
            {
                "name": "opensips_disabled_rtpengine",
                "value": 0
            }
        ]
    }]');
}
...
```


### 导出的函数 {#exported-functions}


#### prometheus_declare_stat(name, [type], [help]) {#prometheus_declare_statname-type-help}


> [!NOTE]
> 本函数仅可在
> [script_route](#script_routestring) 参数所声明的路由中使用。


声明一项导出到 Prometheus 服务器的自定义统计项。需指定
其类型，并可选提供帮助字符串。


参数


- *name* (string) - 统计项名称
*type* (string, optional) - 统计项的
类型（即 *counter* 或 *gauge*）。
若省略，统计项按 *gauge* 声明。
*help* (string, optional) - 可选值，
用于描述统计项含义。若省略则不使用。


本函数仅可在
[script_route](#script_routestring) 参数所声明的请求
路由中使用。


```opensips title="prometheus_declare_stat usage"
...
modparam("prometheus", "script_route", "my_custom_prometheus_route")
...
route[my_custom_prometheus_route] {
	...
	prometheus_declare_stat("opensips_cps");
	prometheus_push_stat(3);
	...
}
```


#### prometheus_push_stat(value, [label_name], [label_value])


> [!NOTE]
> 本函数仅可在
> [script_route](#script_routestring) 参数所声明的路由中使用。


将自定义统计值以及可选的标签集合
推送到 Prometheus 服务器。


> [!NOTE]
> 统计值只应在通过
> [prometheus_declare_stat()](#prometheus_declare_statname-type-help) 函数声明之后
> 才被推送。


参数


- *value* (integer) - 统计项的值
*label_name* (string, optional) - 用于为
所推送的统计项定义标签。若缺少 *label_value*
参数，则该参数会附加到统计项名称之后——
这意味着它应包含该值的完整标签集合
（包括花括号）。若同时提供了
*label_value*，则该参数
应只包含一个标签名称。
*label_value* (string, optional) - 用于
*label_name* 参数标签的值。


本函数仅可在
[script_route](#script_routestring) 参数所声明的请求
路由中使用。


```opensips title="prometheus_push_stat usage"
...
modparam("prometheus", "script_route", "my_custom_prometheus_route")
...
route[my_custom_prometheus_route] {
	...
	prometheus_declare_stat("opensips_cps");
	prometheus_push_stat(3); # 未使用标签
	prometheus_declare_stat("opensips_cc");
	# 以下两行等价
	prometheus_push_stat(10, "{gateway=\"gw1\"}"); # 未使用标签
	prometheus_push_stat(10, "gateway", "gw1"); # 与上一行相同
	...
}
```


### 示例 {#examples}


要让 Prometheus 从 OpenSIPS 查询统计，需要
告知它从哪里获取统计。为此，应在 Prometheus 的
*scrape_configs* 配置中定义一个抓取任务（scrape job），
指明已配置 *httpd*
模块监听的 IP 与端口（默认：*0.0.0.0:8888*）。


```c title="Prometheus Scrape Config"
scrape_configs:
  - job_name: opensips

    static_configs:
    - targets: ['localhost:8888']
```
<!-- CONTRIBUTORS -->

### 许可 {#license}

所有文档文件（即 .md 扩展名）均按 Creative Common License 4.0 授权。
