---
title: "内存缓存"
description: "使用 OpenSIPS 的内存缓存支持来存放运行时数据、减少重复的数据库查询，并给出一个用于摘要鉴权的密码缓存示例。"
---

## MemCache {#memcache}

**OpenSIPS** 中的**内存缓存**支持提供了一种从路由脚本缓存运行时数据的方式。缓存数据对脚本全局可用，并在所有使用同一缓存后端的 **OpenSIPS** 进程之间共享。

其目标是存放自定义值以供后续使用，尤其是那些获取代价高、且不必在每次请求时都从数据库读取的数据。数据库查询是 SIP 平台中常见的瓶颈，因此缓存稳定的数据可以显著降低后端负载。

---

## MemCache 设计 {#memcache-design}

**OpenSIPS** 中的内存缓存支持通过通用的键值 API（Key-Value API）对外提供。无论选择哪种后端，脚本使用的都是同一组函数，而由模块提供实际的存储实现。

核心 API 提供以下基本缓存操作：
* 存储 - [cache_store()](/zh/manual/Script-CoreFunctions#cache_store)
* 获取 - [cache_fetch()](/zh/manual/Script-CoreFunctions#cache_fetch)
* 移除 - [cache_remove()](/zh/manual/Script-CoreFunctions#cache_remove)

存储一个值时，脚本还可以为该属性设置生存期。这使得 OpenSIPS 能够自动让缓存数据过期，并从权威来源定期刷新。

缓存后端由各模块提供。本地共享内存缓存请使用 [cachedb_local 模块](/zh/modules/cachedb_local)。其他部署可以通过相应的 cachedb 模块使用外部缓存后端，例如 Redis 或 Memcached。

---

## MemCache 用法：为数据库鉴权缓存密码 {#memcache-usage-password-caching-for-db-authentication}

描述内存缓存最好的方式是通过一个实际例子：减少由用户鉴权引起的数据库查询次数。

### 思路 {#the-idea}

数据库鉴权成功之后，OpenSIPS 会把用户密码在缓存中保存一段时间。下一次鉴权尝试会先检查缓存。如果密码存在且未过期，OpenSIPS 就直接从脚本变量完成鉴权，无需查询数据库。

由于多个用户的密码会同时被缓存，缓存属性名必须包含被鉴权的用户。对于 REGISTER 鉴权，下面的例子使用 To URI，因此键形如 `passwd_$tu`。

### 逻辑 {#the-logic}

* 收到 REGISTER 请求
* 检查 `passwd_$tu` 是否存在于缓存
* 如果存在，将其加载到 `$var(auth_password)` 并执行 `pv_www_authorize()`
* 如果不存在，则对数据库执行 `www_authorize()`
* 数据库鉴权成功后，把加载到的密码存储为 `passwd_$tu`

### 脚本 {#script}

一个常规的、基于数据库的 REGISTER 鉴权块如下所示：

```opensips
if (!www_authorize("", "subscriber")) {
	www_challenge("", "auth");
	exit;
}
```

使用密码缓存后，配置可以写成这样：

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

`auth_db` 模块在 `www_authorize()` 调用成功之后，会把数据库中的密码加载到已命名的 AVP `$avp(cached_password)` 中。当 `pv_www_authorize()` 从缓存数据校验凭据时，`auth` 模块会使用 `$var(auth_user)` 和 `$var(auth_password)`。

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

上面缓存生存期为 1200 秒，即 20 分钟。该时间之后，密码将从缓存中移除，下一次鉴权会从数据库刷新它。

参考：
* [auth 模块](/zh/modules/auth)
* [auth_db 模块](/zh/modules/auth_db)
* [cachedb_local 模块](/zh/modules/cachedb_local)

---

### 改进 {#improvements}

#### 强制重新获取密码 {#force-password-re-fetching}

当缓存鉴权以返回码 `-2` 失败时，说明 `pv_www_authorize()` 找到了有效用户，但密码不匹配。这可能发生在数据库中的用户密码已变更、而旧值仍在缓存中的时候。

这种情况下，用 `cache_remove()` 移除缓存的密码，并重新向用户发起质询。下一次请求将未命中缓存，转而执行数据库鉴权并存储新的密码值。

#### WWW 与 PROXY 鉴权 {#www-and-proxy-authentication}

同样的方法对 WWW 鉴权（通常用于 REGISTER 请求）和 PROXY 鉴权（通常用于 INVITE、MESSAGE 以及其他对话内或对话外请求）都适用。

对于 WWW 鉴权，鉴权用户名从 To 头域中提取，因此要用 To URI 或 To 用户来构造缓存键，例如 `passwd_$tu` 或 `passwd_$tU`。对于 PROXY 鉴权，鉴权用户名从 From 头域中提取，因此要使用基于 From 的键，例如 `passwd_$fu` 或 `passwd_$fU`。

### 性能估算 {#performance-estimation}

假设注册周期为 30 分钟，每 20 分钟一次呼叫，在不使用缓存的情况下，每个用户每小时有五次鉴权数据库查询。

对于 1000 个用户，这意味着每天 `1000 * 3 * 24 = 72000` 次鉴权查询。

在缓存生存期为两小时的情况下，每个用户每两小时只需要一次数据库查询。

对于同样的 1000 个用户，这意味着每天 `1000 * 0.5 * 24 = 12000` 次鉴权查询。

这样可将鉴权查询负载降低约 83%。
