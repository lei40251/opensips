---
title: "欺诈检测模块"
description: "本模块提供了一种防范某些基本欺诈攻击的方法。"
---

## 管理指南 {#admin-guide}


### 概述 {#overview}


本模块提供了一种防范某些基本欺诈攻击的方法。
告警通过返回码和事件提供。


#### 监控的统计项 {#monitored-stats}


基本上，本模块监视以下参数：


- 总呼叫数
- 每分钟呼叫数
- 并发呼叫数
- 顺序呼叫数
- 呼叫时长


上述每个参数都按每个用户和
每个被叫前缀分别监控。每当
调用 *check_fraud* 函数时，统计值都会被更新。该
函数假定发起了一个新呼叫，并根据
所提供的配置（profile）中的所有规则检查被叫
号码。规则的 prefix 被视为被叫前缀，该前缀与
所提供的 user 一起用于监控上述 5 个
参数的值。


#### 欺诈规则 {#fraud-rules}


一条规则是针对五个参数（如上所述）各自的一组两个阈值（警告阈值和严重阈值），
并且仅对指定的 prefix 可用。
此外，一条规则只在指定的星期几的指定时间之间
匹配（类似于 dr 规则）。欺诈配置（profile）其实就是一组欺诈规则，
它仅用于在调用 check_fraud
函数时限定要匹配的规则列表。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


在使用本模块之前必须先加载以下模块：


- drouting
- dialog


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，必须安装以下库
或应用程序：


- *无*。


### 导出的参数 {#exported-parameters}


#### db_url (string)


从中加载规则的数据库。


*默认值为 "NULL"。fraud_detection 模块要工作，至少
应定义一个 db_url。*


```opensips title="Set the 'db_url' parameter"
...
modparam("fraud_detection", "db_url", "mysql://user:passwb@localhost/database")
...
```


#### use_utc_time (integer)


将此参数设为非零值，以启用基于 UTC 的区间
匹配和统计重置，而不是基于本地时间。


*默认值为 "0"（使用本地时间）。*


```opensips title="Set the 'use_utc_time' parameter"
...
modparam("fraud_detection", "use_utc_time", 1)
...
```


#### table_name (string)


如果要从数据库加载规则，必须将该参数设置为
表名。


*默认值为 "fraud_detection"。*


```opensips title="Set the 'table_name' parameter"
...
modparam("fraud_detection", "table_name", "my_fraud")
...
```


#### rid_col (string)


数据库中存储欺诈规则 id 的
列名。


*默认值为 "ruleid"。*


```opensips title="Set 'rid_col' parameter"
...
modparam("fraud_detection", "rid_col", "theruleid")
...
```


#### pid_col (string)


数据库中存储欺诈配置 id 的
列名。


请记住，配置（profile）仅仅
是一组规则。


*默认值为 "profileid"。*


```opensips title="Set 'pid_col' parameter"
...
modparam("fraud_detection", "pid_col", "profile")
...
```


#### prefix_col (string)


数据库中存储欺诈规则所匹配的
prefix 的列名。


*默认值为 "prefix"。*


```opensips title="Set 'prefix_col' parameter"
...
modparam("fraud_detection", "prefix_col", "myprefix")
...
```


#### start_h_col (string)


数据库中存储规则匹配区间
起始时间的列名。


时间需以字符串形式指定，格式为：
"HH:MM"


*默认值为 "start_hour"。*


```opensips title="Set 'start_h_col' parameter"
...
modparam("fraud_detection", "start_h_col", "the_start_time")
...
```


#### end_h_col (string)


数据库中存储规则匹配区间
结束时间的列名。


时间需以字符串形式指定，格式为：
"HH:MM"


*默认值为 "end_hour"。*


```opensips title="Set 'end_h_col' parameter"
...
modparam("fraud_detection", "end_h_col", "the_end_time")
...
```


#### days_col (string)


数据库中存储欺诈规则区间生效的
星期几的列名。


daysoftheweek 需以字符串形式指定，
其中包含日期或区间列表。
每个日期必须使用其名称的前
三个字母指定。有效的字符串
例如："Fri-Mon, Wed, Thu"


*默认值为 "daysoftheweek"。*


```opensips title="Set 'days_col' parameter"
...
modparam("fraud_detection", "days_col", "days")
...
```


#### cpm_thresh_warn_col (string)


数据库中存储每分钟呼叫数
警告阈值的列名。


*默认值为 "cpm_warning"。*


```opensips title="Set 'cpm_thresh_warn_col' parameter"
...
modparam("fraud_detection", "cpm_thresh_warn_col", "cpm_warn_thresh")
...
```


#### cpm_thresh_crit_col (string)


数据库中存储每分钟呼叫数
严重阈值的列名。


*默认值为 "cpm_critical"。*


```opensips title="Set 'cpm_thresh_crit_col' parameter"
...
modparam("fraud_detection", "cpm_thresh_crit_col", "cpm_crit_thresh")
...
```


#### calldur_thresh_warn_col (string)


数据库中存储呼叫时长
警告阈值的列名。


*默认值为 "call_duration_warning"。*


```opensips title="Set 'calldur_thresh_warn_col' parameter"
...
modparam("fraud_detection", "calldur_thresh_warn_col", "calldur_warn_thresh")
...
```


#### calldur_thresh_crit_col (string)


数据库中存储呼叫时长
严重阈值的列名。


*默认值为 "call_duration_critical"。*


```opensips title="Set 'calldur_thresh_crit_col' parameter"
...
modparam("fraud_detection", "calldur_thresh_crit_col", "calldur_crit_thresh")
...
```


#### totalc_thresh_warn_col (string)


数据库中存储总呼叫数
警告阈值的列名。


*默认值为 "total_calls_warning"。*


```opensips title="Set 'totalc_thresh_warn_col' parameter"
...
modparam("fraud_detection", "totalc_thresh_warn_col", "totalc_warn_thresh")
...
```


#### totalc_thresh_crit_col (string)


数据库中存储总呼叫数
严重阈值的列名。


*默认值为 "total_calls_critical"。*


```opensips title="Set 'totalc_thresh_crit_col' parameter"
...
modparam("fraud_detection", "totalc_thresh_crit_col", "totalc_crit_thresh")
...
```


#### concalls_thresh_warn_col (string)


数据库中存储并发呼叫数
警告阈值的列名。


*默认值为 "concurrent_calls_warning"。*


```opensips title="Set 'concalls_thresh_warn_col' parameter"
...
modparam("fraud_detection", "concalls_thresh_warn_col", "concalls_warn_thresh")
...
```


#### concalls_thresh_crit_col (string)


数据库中存储并发呼叫数
严重阈值的列名。


*默认值为 "concurrent_calls_critical"。*


```opensips title="Set 'concalls_thresh_crit_col' parameter"
...
modparam("fraud_detection", "concalls_thresh_crit_col", "concalls_crit_thresh")
...
```


#### seqcalls_thresh_warn_col (string)


数据库中存储顺序呼叫数
警告阈值的列名。


*默认值为 "sequential_calls_warning"。*


```opensips title="Set 'seqcalls_thresh_warn_col' parameter"
...
modparam("fraud_detection", "seqcalls_thresh_warn_col", "seqcalls_warn_thresh")
...
```


#### seqcalls_thresh_crit_col (string)


数据库中存储顺序呼叫数
严重阈值的列名。


*默认值为 "sequential_calls_critical"。*


```opensips title="Set 'seqcalls_thresh_crit_col' parameter"
...
modparam("fraud_detection", "seqcalls_thresh_crit_col", "seqcalls_crit_thresh")
...
```


### 导出的函数 {#exported-functions}


#### check_fraud(user, number, profile_id)


该函数应在给定 *user* 每次呼叫
给定 *number* 时调用。它会在给定的欺诈配置中
尝试匹配一条欺诈规则，并更新统计值（见上文）。此外，
统计值还会与规则的阈值进行比较。如果任一统计值
超过其阈值，还会触发相应的事件
（详见下文）。


设计上仅适用于初始 INVITE 消息！如果对话
尚不存在，将创建一个（等同于
create_dialog()）。


参数含义如下：


- *user*（string）- 发起呼叫的用户。请记住，
该用户不必已注册。该字符串仅用于为不同的已注册用户
维护不同的统计值。
- *number*（string）- 用户所呼叫的号码。
- *profile_id*（int）- 欺诈配置 id（即欺诈
规则的子集），将在其中尝试查找匹配的欺诈规则。


返回码含义如下：


- *2* - 未找到匹配的欺诈规则
- *1* - 找到匹配的规则，但没有
参数超过规则的阈值，即一切正常
- *-1* - 有参数超过警告阈值。
请查看触发的事件以获取更多信息
- *-2* - 有参数超过严重阈值。
请查看触发的事件以获取更多信息
- *-3* - 出错了（内部机制失败）


该函数可在 REQUEST_ROUTE 和 ONREPLY_ROUTE 中使用。


### 导出的 MI 函数 {#exported-mi-functions}


#### show_fraud_stats


显示 *user* 到 *prefix* 的所有拨号的
当前统计值。


> [!NOTE]
> 由于欺诈统计值是在调用 check_fraud() 时
> 动态刷新的，**如果在新的匹配时间区间内尚未对
> （user, prefix）对至少调用过一次 check_fraud()，
> 此函数将返回过期的数据**！


名称：*show_fraud_stats*


参数：


- user
- prefix


#### fraud_reload


重新加载所有欺诈规则。


名称：*fraud_reload*


参数：*无*


### 导出的事件 {#exported-events}


#### E_FRD_WARNING


当 5 个受监控参数之一
超过警告阈值时，会触发该事件


参数：


- *param* - 参数名称。
- *value* - 参数的当前值。
- *threshold* - 警告阈值。
- *user* - 发起呼叫的用户。
- *called_number* - 被呼叫的号码。
- *rule_id* - 呼叫发起时匹配的
欺诈规则 id
- *profile_id* - 所使用的配置 id


#### E_FRD_CRITICAL


当 5 个受监控参数之一
超过警告阈值时，会触发该事件


参数：


- *param* - 参数名称。
- *value* - 参数的当前值。
- *threshold* - 警告阈值。
- *user* - 发起呼叫的用户。
- *called_number* - 被呼叫的号码。
- *rule_id* - 呼叫发起时匹配的
欺诈规则 id
- *profile_id* - 所使用的配置 id
<!-- CONTRIBUTORS -->

### 许可证 {#license}


所有文档文件（即 .md 扩展名）均按 Creative Common License 4.0 授权。
