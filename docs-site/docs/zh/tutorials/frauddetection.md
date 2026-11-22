---
title: "使用欺诈检测模块"
description: "介绍 fraud_detection 模块如何针对每个用户与目的地的组合，按已配置的警告与严重阈值监控呼叫统计。"
---

# 使用欺诈检测模块 {#using-the-fraud-detection-module}

参见模块：[Fraud Detection](https://docs.opensips.org/manual/devel/modules/fraud_detection)

## 简介 {#introduction}

欺诈呼叫自 VoIP 诞生之初便已存在。通常，恶意用户可以通过两种途径获得通过 VoIP 平台发起呼叫的权限：*账户劫持*与*平台安全性薄弱*。

该模块提供了一种检测手段，用于发现同一用户向同一目的地发起、否则很可能给受影响的 VoIP 账户或 VoIP 提供商造成可观经济损失的可疑呼叫。实现方式是针对每个 **[user,destination]** 组合，结合已配置的告警阈值，密切监控一组与呼叫相关的参数。

## 模块概览 {#module-overview}

### 功能 {#functionality}

借助 dialog 模块，**fraud_detection** 可以针对每个 *[user,destination]* 组合监控以下与呼叫相关的统计：

* 每分钟呼叫数
* 通话时长
* 呼叫总数
* 并发呼叫数
* 向同一目的地的连续呼叫数

这些统计会依据用户配置的时间区间与阈值进行评估。参见下文的[表数据配置](#table-provisioning)。

### 数据库数据配置 {#db-provisioning}

#### 表创建 {#table-creation}

**fraud_detection** 表并不在 **opensips-cli** 创建的标准表集合之内，除非你在创建数据库时于 `opensips-cli.cfg` 文件中提供了 `database_modules: ALL` 设置。如果你还没有该表，按如下方式添加：

```bash
opensips-cli -x database add fraud_detection
```

该模块还依赖 **drouting** 与 **dialog**。如果这是一个全新的数据库、且这些表尚不存在，请一并添加它们的表结构，或用 `database_modules: ALL` 创建数据库。

#### 表数据配置 {#table-provisioning}

下面是针对目的地前缀 **99** 的一个欺诈检测配置示例。以下所有规则都属于同一个配置：**1**。

```sql
INSERT INTO fraud_detection (
    profileid, prefix, start_hour, end_hour, daysoftheweek,
    cpm_warning, cpm_critical,
    call_duration_warning, call_duration_critical,
    total_calls_warning, total_calls_critical,
    concurrent_calls_warning, concurrent_calls_critical,
    sequential_calls_warning, sequential_calls_critical
) VALUES
    (1, '99', '09:00', '17:00', 'Mon-Fri', 3, 5, 7200, 13200, 16, 35, 3, 5, 6, 20),
    (1, '99', '17:00', '23:59', 'Mon-Fri', 3, 5, 9600, 16000, 21, 35, 3, 5, 8, 26),
    (1, '99', '00:00', '09:00', 'Mon-Fri', 3, 4, 4800, 9600, 10, 20, 3, 4, 5, 15),
    (1, '99', '00:00', '23:59', 'Sat,Sun', 3, 5, 11400, 17400, 24, 40, 3, 5, 12, 30);
```

| **规则 ID** | **profile ID** | **前缀** | **起始小时** | **结束小时** | **星期** | **cpm 警告** | **cpm 严重** | **通话时长警告** | **通话时长严重** | **呼叫总数警告** | **呼叫总数严重** | **并发呼叫数警告** | **并发呼叫数严重** | **连续呼叫数警告** | **连续呼叫数严重** |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 1 | 99 | 09:00 | 17:00 | Mon-Fri | 3 | 5 | 7200 | 13200 | 16 | 35 | 3 | 5 | 6 | 20 |
| 2 | 1 | 99 | 17:00 | 23:59 | Mon-Fri | 3 | 5 | 9600 | 16000 | 21 | 35 | 3 | 5 | 8 | 26 |
| 3 | 1 | 99 | 00:00 | 09:00 | Mon-Fri | 3 | 4 | 4800 | 9600 | 10 | 20 | 3 | 4 | 5 | 15 |
| 4 | 1 | 99 | 00:00 | 23:59 | Sat,Sun | 3 | 5 | 11400 | 17400 | 24 | 40 | 3 | 5 | 12 | 30 |

**fraud_detection 表示例**

数据解读：

* **规则 1** 在 **周一至周五** 的 **09:00 至 17:00** 生效。当用户出现以下任一情况时，它会触发 **fraud warning** 事件并返回 `-1`：
  * **一分钟内发起 3 到 4 个呼叫**
  * 发起一个持续 **7200 到 13199 秒**的呼叫
  * 在当前区间内发起 **16 到 34 个呼叫**
  * **同时发起 3 到 4 个呼叫**
  * 向同一目的地发起 **6 到 19 个连续呼叫**
* 同一个 **规则 1** 在用户出现以下任一情况时，会触发 **fraud critical** 事件并返回 `-2`：
  * **一分钟内发起 5 个或更多呼叫**
  * 发起一个持续 **13200 秒或更久**的呼叫
  * 在当前区间内发起 **35 个或更多呼叫**
  * **同时发起 5 个或更多呼叫**
  * 向同一目的地发起 **20 个或更多连续呼叫**

### 工作原理 {#how-does-it-work}

正如[模块文档](/zh/modules/fraud_detection)所述，每次调用
[**check_fraud()**](/zh/modules/fraud_detection#func_check_fraud) 时，模块都会更新它所监控的五个参数。
对于每个 `(username, prefix)` 元组，模块都会保存并监控这五个参数的独立取值。

每当某个取值发生变化，就会与匹配规则的阈值进行比较。每个参数都有两个阈值：警告与严重。这些阈值，连同目的地前缀及其适用的时间区间，共同构成一条*规则*。一个配置（profile）就是这类规则的集合，通过 `check_fraud()` 的 `profile_id` 参数选取。

## 示例脚本 {#example-script}

首先，加载依赖模块与 **fraud_detection** 模块：

```opensips
loadmodule "db_mysql.so"
loadmodule "tm.so"
loadmodule "rr.so"
loadmodule "drouting.so"
loadmodule "dialog.so"
loadmodule "fraud_detection.so"
```

设置数据库 URL。**drouting** 模块是一个依赖项，即使 **fraud_detection** 从 **fraud_detection** 表加载自己的欺诈规则，它也必须能够正常初始化。

```opensips
modparam("drouting", "db_url", "mysql://root:123456@localhost/opensips")
modparam("fraud_detection", "db_url", "mysql://root:123456@localhost/opensips")
```

可选地，定义 `event_route` 块，以便在脚本内处理警告与严重事件。在当前的 OpenSIPS 版本中，`event_route` 支持属于核心的一部分，无需加载单独的模块。

假设每个初始 INVITE 都应更新欺诈统计：

```opensips
route {
	if (has_totag()) {
		loose_route();
	} else if (is_method("INVITE")) {
		record_route();

		check_fraud($fU, $rU, 1);
		if ($rc < 0)
			xlog("[$ci] Fraud detection alert for user $fU, rc=$rc\n");
	}

	t_relay();
}
```

有些问题可以直接通过返回码识别。完整的返回码列表参见模块文档。`check_fraud()` 的最后一个参数是先前配置好的 **profile id**。

可选地，处理警告与严重事件：

```opensips
event_route [E_FRD_WARNING]
{
	xlog("E_FRD_WARNING: $params(param);$params(value);$params(threshold);$params(user);$params(called_number);$params(rule_id);$params(profile_id)\n");
}

event_route [E_FRD_CRITICAL]
{
	xlog("E_FRD_CRITICAL: $params(param);$params(value);$params(threshold);$params(user);$params(called_number);$params(rule_id);$params(profile_id)\n");
}
```

事件参数名为 `param`、`value`、`threshold`、`user`、`called_number`、`rule_id` 和 `profile_id`。

## 2.1 版本遗留说明 {#legacy-21-notes}

OpenSIPS 2.1 使用相同的欺诈规则表结构以及相同的 `check_fraud()` 概念，但周边工具与事件路由语法有所不同。

### 表创建

在 OpenSIPS 2.1 部署中，表创建通常通过 `opensipsdbctl` 完成。首先确认 `opensipsctlrc` 中包含了所需的 SQL 引擎、数据库名与访问凭据：

```bash
vim /usr/local/etc/opensips/opensipsctlrc
```

然后添加额外的 OpenSIPS 表：

```bash
opensipsdbctl extra
```

### 脚本示例 {#script-example}

2.1 的脚本语法通常向 `check_fraud()` 传入字符串参数：

```opensips
route {
	if (has_totag()) {
		loose_route();
	} else {
		record_route();
		check_fraud("$fU", "$rU", "1");
		if ($rc < 0) {
			xlog("[$ci] Problems for user $fU rc=$rc\n");
		}
	}
	t_relay();
}
```

### 事件参数 {#event-parameters}

OpenSIPS 2.1 的示例使用 `fetch_event_params()` 把事件参数复制到脚本变量中：

```opensips
event_route[E_FRD_WARNING] {
	fetch_event_params("$var(param);$var(val);$var(threshold);$var(user);$var(number);$var(ruleid)");
	xlog("E_FRD_WARNING: $var(param);$var(val);$var(threshold);$var(user);$var(number);$var(ruleid)\n");
}

event_route[E_FRD_CRITICAL] {
	fetch_event_params("$var(param);$var(val);$var(threshold);$var(user);$var(number);$var(ruleid)");
	xlog("E_FRD_CRITICAL: $var(param);$var(val);$var(threshold);$var(user);$var(number);$var(ruleid)\n");
}
```

对于当前的 OpenSIPS 版本，请使用上文主示例中所示的 `$params(name)`。
