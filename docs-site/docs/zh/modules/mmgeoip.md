---
title: "mmgeoip 模块"
description: "本模块是 MaxMind GeoIP API 的轻量封装。"
---

## 管理指南 {#admin-guide}


### 概述 {#overview}


本模块是 MaxMind GeoIP
API 的轻量封装。它为 OpenSIPS 脚本增加了
IP 地址到位置的查询能力。


查询针对可免费获取的 GeoLite City
数据库执行；非免费的 GeoIP City 数据库可直接
兼容使用。API 提供的所有查询字段都可
由脚本访问。有关位置数据库的更多信息，请访问
[MaxMind
网站](https://dev.maxmind.com/geoip/)。


该模块同时兼容旧版 GeoIP 与
较新的 GeoIP2 API 及数据库。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


以下模块必须在本模块之前加载：


- *不依赖其他 OpenSIPS 模块*。


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，必须安装以下库或应用程序：


- *libGeoIP* - 用于旧版 GeoIP API 与数据库；
- *libmaxminddb* - 用于 GeoIP2 API 与数据库。


可在编译模块之前，将 GEOIP 环境变量设置为以下值之一，
以选择使用哪个 GeoIP 库：


- *GEOIPLEGACY* - 将使用 libGeoIP 库；
- *GEOIP2* - 将使用 libmaxminddb 库；


> [!IMPORTANT]
> 若所选库未安装，模块将无法编译。
> 注意：若未设置 GEOIP 环境变量，模块将尝试探测已安装的 GeoIP 库，
> 并优先使用 libmaxminddb。

### 导出的参数 {#exported-parameters}


#### mmgeoip_city_db_path (string)


GeoLite 或 GeoIP City 数据库文件的路径。


*必填参数。*


```opensips title="Set 'mmgeoip_city_db_path' parameter"
...
modparam("mmgeoip", "mmgeoip_city_db_path",
  "/usr/share/GeoIP/GeoLiteCity.dat")
...
	
```


#### cache_type (string)


数据库内存缓存选项。可用选项如下：


- *STANDARD* - 从文件系统读取数据库；
占用内存最少；
- *MMAP_CACHE* - 将数据库加载到 mmap 分配的
内存中；
*警告：若数据库文件在运行时被更改，该选项将导致
段错误！*
- *MEM_CACHE_CHECK* - 将数据库加载到内存中；
该模式会检查数据库更新；如果数据库被修改，
文件将在 60 秒后重新加载；这比
*MMAP_CACHE* 慢，但允许重新加载；


该参数的默认值为 *MMAP_CACHE*。


> [!NOTE]
> 若使用 libmaxminddb，该参数将被忽略，因为该库仅
> 支持将数据库加载到 mmap 分配的内存中。


```opensips title="Set 'cache_type' parameter"
...
modparam("mmgeoip", "cache_type","MEM_CACHE_CHECK")
...
	
```


### 导出的函数 {#exported-functions}


#### mmg_lookup([fields,]src,dst)


查询与 IP 地址 `src` 相关联、由 `field` 指定的
信息。结果数据以*逆序*加载到
`dst` AVP 中。


参数：


- *fields*（string，可选）- 由以下分隔符之一分隔的元素列表：
':'、'|'、','、'/' 或 ' '（空格）。接受以下标记：
	- *lat* - 纬度
	- *lon* - 经度
	- *cont* - 洲
	- *cc* - 国家代码
	- *reg* - 区域
	- *city* - 城市
	- *pc* - 邮政编码
	- *dma* - DMA 代码
	- *ac* - 区号，仅在旧版 GeoIP 数据库中可用
	- *tz* - 时区
- *src*（string）- IP 地址
- *dst*（var）- 用于返回与该 IP 关联信息的 AVP。


使用 GeoIP2 库时，`fields` 参数中所给列表的每个标记
都可以表示为与该 IP 关联的数据结构中某个特定键的路径。因此，
标记格式为 '*key_name*.*key_name*[*.key_name*]*'。如果某个键的值是数组，
则应提供索引而非子键名，以选取合适的值。


标记示例：'*country.names.en*'、'*continent.names.en*'、'*subdivisions.0.iso_code*'。有关
数据库中可用字段以及获取这些字段应使用的键名的更多细节，
请查阅 [MaxMind
GeoIP2 文档](https://dev.maxmind.com/geoip/geoip2/)。


该函数可在 REQUEST_ROUTE、FAILURE_ROUTE、
ONREPLY_ROUTE、BRANCH_ROUTE、ERROR_ROUTE 和 LOCAL_ROUTE 中使用。


```opensips title="mmg_lookup usage"
...
if(mmg_lookup("lon:lat",$si,$avp(lat_lon))) {
  xlog("L_INFO","Source IP latitude:$(avp(lat_lon)[0])\n");
  xlog("L_INFO","Source IP longitude:$(avp(lat_lon)[1])\n");
};
...
# fields 格式仅在 GeoIP2 中支持
if(mmg_lookup("continent.names.en:country.iso_code,",$si,$avp(geodata))) {
  xlog("L_INFO","Source IP country code:$(avp(geodata)[0])\n");
  xlog("L_INFO","Source IP continent:$(avp(geodata)[1])\n");
};
...
	
```


### 已知问题 {#known-issues}


目前无法在不先暂停服务器的前提下加载更新后的
位置数据库。
<!-- CONTRIBUTORS -->

### 许可 {#license}

所有文档文件（即 .md 扩展名）均以 Creative Common License 4.0 许可发布。
