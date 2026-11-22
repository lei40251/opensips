---
title: "qrouting 模块"
description: "*qrouting* 是一个位于 drouting、dialog 和 tm 之上的模块，对一系列关键的网关信令质量指标（即 ASR、CCR、PDD、AST、ACD —— 详见下文）进行实时跟踪。"
---


## 管理员指南 {#admin-guide}


### 概述 {#overview}


*qrouting* 是一个位于
[drouting](/zh/modules/drouting)、
[dialog](/zh/modules/dialog) 和
[tm](/zh/modules/tm) 之上的模块，它对一系列
关键的网关信令质量指标（即 ASR、CCR、PDD、AST、ACD —— 详见下文）
进行实时跟踪。因此，qrouting 能够
根据网关在实际流量中的表现动态地重新排序，从而在运行时
调整前缀路由行为，使得：


- 表现良好的网关在路由中获得更高优先级
- 信令质量下降的网关
被降至路由列表末尾


### 监控的统计项 {#monitored-statistics}


该模块针对每个 drouting
**（前缀, 目的地）** 对跟踪一系列统计项，其中
“目的地”可以是网关或运营商。统计项包括：


- ASR（Answer Seizure Ratio，应答占用比）—— 被应答的电话
呼叫百分比（200 应答状态码）。
- CCR（Call Completion Ratio，呼叫完成比）—— 由网关回送
应答的电话呼叫百分比，不含
5xx、6xx 应答码和内部 408 超时。以下
关系始终成立：CCR >= ASR。
- PDD（Post Dial Delay，拨号后延迟）—— 从收到初始
INVITE 到收到第一个 180/183 临时应答之间的时长，
单位为毫秒（呼叫状态进入
*"ringing"*）。
- AST（Average Setup Time，平均建立时长）—— 从收到初始
INVITE 到收到第一个 200 OK 应答之间的时长，
单位为毫秒（呼叫状态进入
*"answered"*）。以下关系始终
成立：AST >= PDD。
- ACD（Average Call Duration，平均通话时长）—— 从收到初始
INVITE 到收到任一参与方发来的第一个 BYE 请求之间的
时长，单位为秒（呼叫
状态进入 *"ended"*）。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


以下模块必须加载才能使用本模块：


- *一个 SQL 数据库模块，提供对
"qr_profiles" 表的访问*
- *tm*
- *dialog*
- *drouting*


### 导出参数 {#exported-parameters}


#### db_url (string)


一个 SQL 数据库 URL。


*默认值为 **NULL**。*


```opensips title="设置 db_url 参数"
modparam("qrouting", "db_url", "mysql://opensips:opensipsrw@localhost/opensips")
```


#### table_name (string)


基于质量的路由配置表的名称。


*默认值为 **"qr_profiles"**。*


```opensips title="设置 table_name 参数"
modparam("qrouting", "table_name", "qr_profiles_bak")
```


#### algorithm (string)


要使用的基于质量的目的地选择/均衡算法。


可选值：


- **"dynamic-weights"** ——
对每个前缀，所有目的地以相同的权重开始，
并获得相同的流量份额。随着
收集到目的地的信令统计，表现较差的目的地将
基于 *qr_profiles* 表的 "penalty" 列
获得更少的流量
- **"best-dest-first"** —— 对于每个
前缀，只要其质量保持不变，第 1 个（即 *评分最佳*）
目的地将获得全部流量。初始时，
所有目的地都以满分开始。如果在路由过程中
一项或多项信令统计低于 "warn" 或 "crit"
阈值，该分数可能下降，
此时目的地将被相应地重新排序，流量将被路由到
列表中最新确定的第 1 个位置
*注意*：使用 "best-dest-first" 算法时，
为获得最佳效果，目的地
必须按其预期质量降序配置！
（即质量最好的网关必须
放在列表靠前的位置）


*默认值为 **"dynamic-weights"**。*


```opensips title="设置 algorithm 参数"
modparam("qrouting", "algorithm", "best-dest-first")
```


#### history_span (integer) {#history_span-integer}


某个网关针对给定通话的统计数据的
保留时长（分钟）。


*默认值为 **30** 分钟。*


```opensips title="设置 connection_timeout 参数"
modparam("qrouting", "history_span", 15)
```


#### sampling_interval (integer) {#sampling_interval-integer}


统计采样窗口的时长（秒）。每隔
*[sampling_interval](#sampling_interval-integer)* 秒，
最近一个采样窗口内累积的统计会被
加到每个网关上，而最旧的采样区间统计
则从每个网关中减去（轮转移除）。


较小的值会使对流量变化的调整更接近
实时，但也会因加锁而增加 CPU 占用和
内部竞争。


*默认值为 **5** 秒。*


```opensips title="设置 connect_poll_interval 参数"
modparam("qrouting", "sampling_interval", 5)
```


#### extra_stats (string) {#extra_stats-string}


一个以分号分隔的自定义统计项列表，模块会额外保存
并监控这些统计项。为了收集这些统计，模块
要求脚本编写者在需要为某个（前缀, 目的地）元组增加
自定义统计时调用
[qr_set_xstat()](#qr_set_xstatrule_id-gw_name-stat_name-inc_by-part-inc_total)。


额外统计有两种类型：*正向*
（值越高越好，例如 ASR）或 *负向*
（值越低越好，例如 PDD）。该类型决定了
与统计阈值比较时使用的比较运算符，
可以分别在统计名称前加上 **"+"** 或
**"-"** 来指定（见下例）。


每个统计项可接受的最小样本数可以通过
可选的 **/&lt;min_samples&gt;**
后缀修改。默认值：**30**
个样本（最小）。


自定义统计的阈值和惩罚必须通过
*qr_profiles* 表提供，即为每个额外统计
扩展 4 个列，命名遵循以下
模板：


- warn_threshold_*&lt;STAT&gt;*
- crit_threshold_*&lt;STAT&gt;*
- warn_penalty_*&lt;STAT&gt;*
- crit_penalty_*&lt;STAT&gt;*


*默认值为 **NULL**。*


```opensips title="设置 extra_stats 参数"
modparam("qrouting", "extra_stats", "+mos/60; +r_factor; -503_replies/100")
```


#### min_samples_asr (integer)


每个（前缀, 目的地）对的 ASR 采样统计在被纳入考虑
之前可接受的最小数量。只要样本数
低于该限制，该对的 ASR 统计
即被视为健康。


*默认值为 **30**。*


```opensips title="设置 min_samples_asr 参数"
modparam("qrouting", "min_samples_asr", 50)
```


#### min_samples_ccr (integer)


每个（前缀, 目的地）对的 CCR 采样统计在被纳入考虑
之前可接受的最小数量。只要样本数
低于该限制，该对的 CCR 统计
即被视为健康。


*默认值为 **30**。*


```opensips title="设置 min_samples_ccr 参数"
modparam("qrouting", "min_samples_ccr", 50)
```


#### min_samples_pdd (integer)


每个（前缀, 目的地）对的 PDD 采样统计在被纳入考虑
之前可接受的最小数量。只要样本数
低于该限制，该对的 PDD 统计
即被视为健康。


*默认值为 **10**。*


```opensips title="设置 min_samples_pdd 参数"
modparam("qrouting", "min_samples_pdd", 15)
```


#### min_samples_ast (integer)


每个（前缀, 目的地）对的 AST 采样统计在被纳入考虑
之前可接受的最小数量。只要样本数
低于该限制，该对的 AST 统计
即被视为健康。


*默认值为 **10**。*


```opensips title="设置 min_samples_ast 参数"
modparam("qrouting", "min_samples_ast", 15)
```


#### min_samples_acd (integer)


每个（前缀, 目的地）对的 ACD 采样统计在被纳入考虑
之前可接受的最小数量。只要样本数
低于该限制，该对的 ACD 统计
即被视为健康。


*默认值为 **20**。*


```opensips title="设置 min_samples_acd 参数"
modparam("qrouting", "min_samples_acd", 30)
```


#### event_bad_dst_threshold (string) {#event_bad_dst_threshold-string}


（前缀, 目的地）组合可接受的最低质量，
以带引号的浮点数给出，取值范围为 [0, 1]。
每当某个（前缀, 目的地）组合的得分低于
该阈值时，就会触发 [E_QROUTING_BAD_DST](#e_qrouting_bad_dst) 事件。


*默认值为 **NULL**（未设置）。*


```opensips title="设置 event_bad_dst_threshold 参数"
modparam("qrouting", "event_bad_dst_threshold", "0.5")
```


#### decimal_digits (integer)


日志或 MI 输出中使用的十进制小数位数。


*默认值为 **2**。*


```opensips title="设置 decimal_digits 参数"
modparam("qrouting", "decimal_digits", 4)
```


### 导出函数 {#exported-functions}


#### qr_set_xstat(rule_id, gw_name, stat_name, inc_by, [part], [inc_total]) {#qr_set_xstatrule_id-gw_name-stat_name-inc_by-part-inc_total}


为给定（前缀, 网关）组合上的某个额外统计提供一个新样本值。
额外统计可通过
[extra_stats](#extra_stats-string) 模块参数定义。


参数：


- *rule_id (integer)* —— 持有该前缀及其目的地的
drouting 规则的数据库 id
- *gw_name (string)* —— 为其记录该统计的
网关。该网关必须是上述规则的目的地
之一。
- *stat_name (string)* —— 要记录的统计项
- *inc_by (string)* —— 带引号的浮点数，
表示要加到该统计上的数值
- *part (string, optional, default: 'Default')* ——
要使用的 drouting 分区
- *inc_total (string, optional, default: 1)* ——
要加到统计总计计数器上的数值。通常，
该值应为 1，但当某个自定义统计需要在同一个
已建立通话的持续期间内第 2 次、第 3 次等设置时，
将其设为 0 可能有意义。


该函数可在任意路由中使用。


```opensips title="qr_set_xstat() 用法"
# MoS 每次通话只设置一次，因此可以省略 "inc_total"
$var(rule_id) = 1574;
$var(gw_name) = "GW-28";
$var(mos_score) = "4.28";
qr_set_xstat($var(rule_id), $var(gw_name), "mos", $var(mos_score));
	
```


#### qr_disable_dst(rule_id, dst_name, [part])


在给定的路由规则内，临时将指定网关或
运营商从路由中移除，直到通过
[qr_enable_dst()](#qr_enable_dstrule_id-dst_name-part) 或 [qr_enable_dst](#qr_enable_dst) 重新启用它们。
该移除效果在 OpenSIPS 重启后失效。


参数：


- *rule_id (integer)* —— drouting 规则的
数据库 id
- *dst_name (string)* —— 要禁用的网关或
运营商
- *part (string, optional)* —— drouting 分区


该函数可在任意路由中使用。


```opensips title="qr_disable_dst() 用法"
# @rule_id 经 @dst_name 的信令质量正在下降，将其移除！
event_route [E_QROUTING_BAD_DST]
{
	qr_disable_dst($param(rule_id), $param(dst_name), $param(partition));
}
	
```


#### qr_enable_dst(rule_id, dst_name, [part]) {#qr_enable_dstrule_id-dst_name-part}


在给定的路由规则内，将指定网关或
运营商重新纳入路由过程。


参数：


- *rule_id (integer)* —— drouting 规则的
数据库 id
- *dst_name (string)* —— 要启用的网关或
运营商
- *part (string, optional)* —— drouting 分区


该函数可在任意路由中使用。


```opensips title="qr_enable_dst() 用法"
# 封禁已到期，重新启用该网关并观察其表现
qr_enable_dst($param(rule_id), $param(dst_name), $param(partition));
```


### 导出 MI 函数 {#exported-mi-functions}


#### qr_reload


从 SQL 数据库重新加载所有基于质量的路由规则。


MI FIFO 命令格式：


```bash
opensips-cli -x mi qr_reload
```


#### qr_status


查看当前 [history_span](#history_span-integer) 内所有分区中所有
drouting 网关的信令质量统计，
并支持多种级别的过滤。


参数：


- *partition (optional)* —— 要列出统计的特定
drouting 分区
- *rule_id (optional)* —— 要列出统计的特定 drouting
规则数据库 id
- *dst_name (optional)* —— 要列出统计的特定网关或
运营商名称


MI FIFO 命令格式：


```bash
opensips-cli -x mi qr_status
opensips-cli -x mi qr_status pstn
opensips-cli -x mi qr_status pstn 11 MY-GW-3
opensips-cli -x mi qr_status pstn 17 MY-CARR-7
```


#### qr_disable_dst


在给定的路由规则内，临时将指定网关或
运营商从路由中移除，直到被手动重新启用。该移除
效果在 OpenSIPS 重启后失效。


参数：


- *partition (optional)* —— drouting 分区
- *rule_id* —— drouting 规则的数据库 id
- *dst_name* —— 要禁用的网关或运营商


MI FIFO 命令格式：


```bash
opensips-cli -x mi qr_disable_dst 14 MY-CARR-7
opensips-cli -x mi qr_disable_dst pstn 81 MY-GW-3
```


#### qr_enable_dst {#qr_enable_dst}


在给定的路由规则内，将指定网关或
运营商重新纳入路由过程。


参数：


- *partition (optional)* —— drouting 分区
- *rule_id* —— drouting 规则的数据库 id
- *dst_name* —— 要启用的网关或运营商


MI FIFO 命令格式：


```bash
opensips-cli -x mi qr_enable_dst 14 MY-CARR-7
opensips-cli -x mi qr_enable_dst pstn 81 MY-GW-3
```


### 导出事件 {#exported-events}


#### E_QROUTING_BAD_DST {#e_qrouting_bad_dst}


在路由过程中，每当某个（前缀, 目的地）对的
得分低于
[event_bad_dst_threshold](#event_bad_dst_threshold-string) 时，该事件可能会被异步触发。


参数：


- *partition* —— drouting 分区名称
- *rule_id* —— drouting 规则的数据库 id
- *dst_name* —— 相关网关或运营商的名称
<!-- CONTRIBUTORS -->

### 许可证 {#license}

所有文档文件（即 .md 扩展名的文件）均按 Creative Common License 4.0 授权
