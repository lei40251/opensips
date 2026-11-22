---
title: "键值接口"
description: "使用 OpenSIPS 键值接口，通过统一的脚本 API 访问本地与外部缓存后端。"
---

OpenSIPS 中的键值接口为路由脚本和模块提供了一种访问不同键值后端的通用方式。它的用途与 DB 接口类似：脚本使用稳定的 API，而所加载的 `cachedb_*` 模块提供实际的存储实现。

连接本地或外部存储后端的模块实现键值 API，并暴露一个或多个连接标识符。这些标识符作为第一个参数传给 `cache_*` 脚本函数。

---

## 可用的 cachedb_* 后端 {#available-cachedb-backends}

当前 OpenSIPS 的 cachedb 后端包括 `cachedb_cassandra`、`cachedb_couchbase`、`cachedb_dynamodb`、`cachedb_local`、`cachedb_memcached`、`cachedb_mongodb`、`cachedb_redis` 与 `cachedb_sql`。

### cachedb_local

[cachedb_local 模块](/zh/modules/cachedb_local)使用称为 collection 的本地哈希表，把数据存储在 OpenSIPS 共享内存中。它是最快的选择，且不依赖外部服务，但除非配置了本地缓存集群或重启持久化，数据通常在重启后丢失。

如果没有配置 URL，OpenSIPS 会提供一个默认的 `local` 存储 ID。额外的 URL 可以暴露具名分组，例如 `local:group2`。

```opensips
loadmodule "cachedb_local.so"

modparam("cachedb_local", "cachedb_url", "local://")
modparam("cachedb_local", "cachedb_url", "local:group2:///collection2")

cache_store("local", "key", "value");
cache_store("local:group2", "key", "value");
```

### cachedb_memcached

[cachedb_memcached 模块](/zh/modules/cachedb_memcached)把数据存储在 Memcached 服务器中。它把缓存内存放在 OpenSIPS 之外，可在 OpenSIPS 重启后依然存在，但如果 Memcached 服务重启或被清空，值仍然是易失的。

URL 前缀成为脚本中的存储 ID，例如 `memcached:group1`。

```opensips
loadmodule "cachedb_memcached.so"

modparam("cachedb_memcached", "cachedb_url",
	"memcached:group1://localhost:11211/")

cache_store("memcached:group1", "key", "value");
```

### cachedb_redis

[cachedb_redis 模块](/zh/modules/cachedb_redis)把数据存储在 Redis 中。它支持单机 Redis 服务器、Redis Cluster 拓扑发现、鉴权、Unix 套接字、TLS 以及 Redis 原始查询。

URL 前缀成为脚本中的存储 ID，例如 `redis:group1` 或 `redis:cluster1`。

```opensips
loadmodule "cachedb_redis.so"

modparam("cachedb_redis", "cachedb_url",
	"redis:group1://localhost:6379/")

cache_store("redis:group1", "key", "value");
```

### cachedb_cassandra

[cachedb_cassandra 模块](/zh/modules/cachedb_cassandra)把数据存储在 Cassandra 中。当需要在多个 OpenSIPS 实例之间共享持久、分布式的键值数据时，它很有用。

Cassandra 要求 URL 中的数据库部分用于标识 keyspace 与表。如果使用整型计数器操作，URL 还可以包含一个专用的计数器表。

```opensips
loadmodule "cachedb_cassandra.so"

modparam("cachedb_cassandra", "cachedb_url",
	"cassandra:cluster1://10.0.0.10,10.0.0.15/keyspace.keys.counters")

cache_store("cassandra:cluster1", "key", "value");
```

### cachedb_couchbase

[cachedb_couchbase 模块](/zh/modules/cachedb_couchbase)通过 `libcouchbase` 把数据存储在 Couchbase bucket 中。它可以指向单台服务器或多台 Couchbase 节点。

URL 前缀成为脚本中的存储 ID，例如 `couchbase:cluster1`。

```opensips
loadmodule "cachedb_couchbase.so"

modparam("cachedb_couchbase", "cachedb_url",
	"couchbase:cluster1://host1:11210,host2:11210/my_bucket")

cache_store("couchbase:cluster1", "key", "value");
```

### cachedb_mongodb

[cachedb_mongodb 模块](/zh/modules/cachedb_mongodb)把数据存储在 MongoDB collection 中。它的 URL 语法遵循 MongoDB 连接字符串格式，并支持 MongoDB 原始查询。

默认存储 ID 为 `mongodb`。带分组的 URL 会暴露形如 `mongodb:cluster` 的存储 ID。

```opensips
loadmodule "cachedb_mongodb.so"

modparam("cachedb_mongodb", "cachedb_url",
	"mongodb:cluster://localhost,10.0.0.10:27017/opensipsDB.dialog")

cache_store("mongodb:cluster", "key", "value");
```

### cachedb_sql

[cachedb_sql 模块](/zh/modules/cachedb_sql)通过 OpenSIPS DB 接口把键值数据存储在常规 SQL 数据库中。当已有可用的 SQL 后端、且持久性比缓存速度更重要时，它很有用。

URL 格式为 `sql:connection-id-dburl`，脚本中的存储 ID 是 `://` 之前的 `sql:*` 前缀。

```opensips
loadmodule "db_mysql.so"
loadmodule "cachedb_sql.so"

modparam("cachedb_sql", "cachedb_url",
	"sql:main-mysql://opensips:opensipsrw@localhost/opensips")

cache_store("sql:main-mysql", "key", "value");
```

### cachedb_dynamodb

[cachedb_dynamodb 模块](/zh/modules/cachedb_dynamodb)把数据存储在 Amazon DynamoDB 中，测试时也可存储在本地 DynamoDB 实例中。它支持常规键值操作与整型计数器操作。

默认存储 ID 为 `dynamodb`。

```opensips
loadmodule "cachedb_dynamodb.so"

modparam("cachedb_dynamodb", "cachedb_url",
	"dynamodb:///opensips_cache?region=eu-central-1")

cache_store("dynamodb", "key", "value");
```

---

## 核心 API {#core-api}

OpenSIPS 核心 API 基于存储 ID 与属性名工作。存储 ID 选择后端连接，属性名选择该后端内部的键。

通用的键值 API 包括：
* [cache_store()](/zh/manual/Script-CoreFunctions) —— 存储或替换一个字符串值，可带可选的超时时间
* [cache_fetch()](/zh/manual/Script-CoreFunctions) —— 获取一个字符串值到脚本变量
* [cache_remove()](/zh/manual/Script-CoreFunctions) —— 删除一个键
* [cache_counter_fetch()](/zh/manual/Script-CoreFunctions) —— 获取一个整型计数器值
* [cache_add()](/zh/manual/Script-CoreFunctions) —— 递增一个整型计数器，并可选择返回新值
* [cache_sub()](/zh/manual/Script-CoreFunctions) —— 递减一个整型计数器，并可选择返回新值
* [cache_raw_query()](/zh/manual/Script-CoreFunctions) —— 当所选模块支持时，执行后端特有的原始查询

在某些后端中，字符串值与整型计数器是两个独立的概念。例如，Cassandra 要求为 `cache_add()`、`cache_sub()` 与 `cache_counter_fetch()` 使用专用的计数器表，而 SQL 使用专用的计数器列，且目前仅 MySQL 支持计数器操作。在使用整型操作之前，请查阅所选模块的文档。

`cache_raw_query()` 是后端特有的。Redis 与 MongoDB 后端提供了原始查询支持的文档；其他后端可能并未实现。

```opensips
cache_store("local", "total_minutes_$fU", "$var(minutes)", 1200);

if (cache_fetch("local", "total_minutes_$fU", $var(total_minutes)))
	xlog("[$ci] cached total minutes: $var(total_minutes)\n");

cache_add("redis:stats", "calls_$fU", 1, 3600, $var(new_call_count));
cache_counter_fetch("redis:stats", "calls_$fU", $var(call_count));
cache_sub("redis:stats", "credit_$fU", 5, 0, $var(new_credit));
cache_raw_query("redis:stats", "PING", "$avp(redis_reply)");

cache_remove("local", "total_minutes_$fU");
```

---

## 用例与示例 {#use-cases-and-examples}

### 用于数据库鉴权的密码缓存 {#password-caching-for-db-authentication}

数据库鉴权成功后，OpenSIPS 可以把订阅者密码在缓存后端中保存一段时间。下一次鉴权尝试会先检查缓存。如果密码可用且未过期，OpenSIPS 就直接根据脚本变量完成鉴权，无需查询数据库。

由于多个用户的密码会同时被缓存，缓存键必须包含已通过鉴权的用户。对于 REGISTER 鉴权，下面的示例使用 To URI，从而得到形如 `passwd_$tu` 的键。

#### 逻辑 {#logic}

* 收到 REGISTER 请求
* 检查缓存中是否存在 `passwd_$tu`
* 如果存在，将其载入 `$var(auth_password)` 并运行 `pv_www_authorize()`
* 如果不存在，则针对数据库运行 `www_authorize()`
* 数据库鉴权成功后，把载入的密码存储为 `passwd_$tu`

#### 脚本示例 {#script-example}

一个常规的、由数据库支撑的 REGISTER 鉴权块如下：

```opensips
if (!www_authorize("", "subscriber")) {
	www_challenge("", "auth");
	exit;
}
```

使用密码缓存后，配置可以如下：

```opensips
loadmodule "db_mysql.so"
loadmodule "signaling.so"
loadmodule "auth.so"
loadmodule "auth_db.so"
loadmodule "cachedb_local.so"

modparam("auth", "username_spec", "$var(auth_user)")
modparam("auth", "password_spec", "$var(auth_password)")
modparam("auth", "calculate_ha1", 1)

modparam("auth_db", "calculate_ha1", 1)
modparam("auth_db", "password_column", "password")
modparam("auth_db", "db_url", "mysql://opensips:opensipsrw@localhost/opensips")
modparam("auth_db", "load_credentials", "$avp(cached_password)=password")
```

`auth_db` 模块在 `www_authorize()` 调用成功后，会把数据库中的密码载入名为 `$avp(cached_password)` 的 AVP。当 `pv_www_authorize()` 根据缓存数据校验凭据时，`auth` 模块使用 `$var(auth_user)` 与 `$var(auth_password)`。

```opensips
route[AUTH_REGISTER] {
	if (cache_fetch("local", "passwd_$tu", $var(auth_password))) {
		$var(auth_user) = $tU;

		xlog("[$ci] using cached password for $tu\n");

		if (!pv_www_authorize("")) {
			if ($rc == -2)
				cache_remove("local", "passwd_$tu");

			www_challenge("", "auth");
			exit;
		}
	} else {
		if (!www_authorize("", "subscriber")) {
			www_challenge("", "auth");
			exit;
		}

		xlog("[$ci] storing password in cache for $tu\n");

		cache_store("local", "passwd_$tu", "$avp(cached_password)", 1200);
	}
}
```

参考资料：
* [auth 模块](/zh/modules/auth)
* [auth_db 模块](/zh/modules/auth_db)
* [cachedb_local 模块](/zh/modules/cachedb_local)

#### 性能提升 {#performance-improvement}

假设注册周期为 30 分钟、每 20 分钟一次呼叫，在不使用缓存的情况下，每小时每用户有 5 次鉴权数据库查询。

对于 1000 个用户，这意味着每天 `1000 * 3 * 24 = 72000` 次鉴权查询。

若缓存生存期为两小时，则每个用户每两小时需要一次数据库查询。

对于同样的 1000 个用户，这意味着每天 `1000 * 0.5 * 24 = 12000` 次鉴权查询。

这将鉴权查询负载降低了约 83%。

### 简单的分布式计费 {#simple-distributed-billing}

多台 OpenSIPS 服务器可以出于冗余或负载均衡的目的服务同一个域。如果每个节点都独立地从本地数据库读写用户额度，计费决策可能会变得不一致。

使用诸如 Redis 这样的共享键值后端，可以让所有 OpenSIPS 节点读写同一个额度计数器。由于 `cache_add()` 与 `cache_sub()` 在合适的后端中是原子的，每台服务器都可以在通话后安全地更新额度，并在允许新的 INVITE 之前检查当前额度。

#### 前置条件 {#prerequisites}

运行一个所有 OpenSIPS 节点都可访问的 Redis Server 或 Redis Cluster，然后用共享的存储 ID 配置 `cachedb_redis`。

#### 脚本示例 {#script-example-1}

因额度不足拒绝呼叫，并在每次通话后更新额度，可以按如下方式实现：

```opensips
loadmodule "dialog.so"
loadmodule "cachedb_redis.so"

modparam("cachedb_redis", "cachedb_url",
	"redis:billing://192.168.2.1:6379/")

route {
	if (has_totag()) {
		if (is_method("BYE")) {
			$var(cost) = $DLG_lifetime * $(dlg_val(cost){s.int});
			cache_sub("redis:billing", "credit_$fU", $var(cost), 0,
				$var(remaining_credit));

			xlog("[$ci] remaining credit for $fU is $var(remaining_credit)\n");
		}

		# 在此处理顺序请求
		exit;
	}

	if (is_method("INVITE")) {
		if (!cache_counter_fetch("redis:billing", "credit_$fU",
			$var(user_credit))) {
			sl_send_reply(403, "Forbidden - No credit record");
			exit;
		}

		if ($var(user_credit) <= 1) {
			xlog("[$ci] user $fU does not have enough credit\n");
			sl_send_reply(403, "Forbidden - Not enough credit");
			exit;
		}

		create_dialog();
		$dlg_val(cost) = "3";
	}

	# 在此继续处理请求
}
```
