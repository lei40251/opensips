---
title: "DB_BERKELEY 模块"
description: "本模块将 Berkeley DB 集成到 OpenSIPS 中，实现了 OpenSIPS 中定义的 DB API。"
sidebar: false
---

## 管理指南 {#admin-guide}


### 概述 {#overview}


本模块将 Berkeley DB 集成到 OpenSIPS 中。
它实现了 OpenSIPS 中定义的 DB API。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


在使用本模块之前必须先加载以下模块：


- *不依赖其他 OpenSIPS 模块*。


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，必须安装以下库或应用程序：


- *Berkeley DB 4.6* - 一个嵌入式数据库。


### 导出的参数 {#exported-parameters}


#### auto_reload (integer)


当文件的 inode 发生变化时，自动重载会关闭并重新打开 Berkeley DB。该操作只在
查询期间发生。插入或删除等其他操作不会触发 auto_reload。


*默认值为 0（1 - 开启 / 0 - 关闭）。*


```opensips title="Set auto_reload parameter"
...
modparam("db_berkeley", "auto_reload", 1)
...

```


#### log_enable (integer)


log_enable 布尔值控制何时创建日志文件。
以下操作可记录日志：
INSERT、UPDATE、DELETE。SELECT 等其他操作则不会。
如果你需要从损坏的 DB 文件中恢复，这些日志是必需的。
也就是说，bdb_recover 需要依靠它们重建
db 文件。如果你觉得这个日志功能有用，可能还会对
每张表都具有的 METADATA_LOGFLAGS 位域感兴趣。
它允许你控制记录哪些操作，
以及日志的去向（如 syslog、stdout、local-file）。
请参阅 bdblib_log() 以及关于 METADATA 的文档。


*默认值为 0（1 - 开启 / 0 - 关闭）。*


```opensips title="Set log_enable parameter"
...
modparam("db_berkeley", "log_enable", 1)
...

```


#### journal_roll_interval (integer seconds)


journal_roll_interval 会关闭并打开一个新的日志文件。
滚动操作只在写完一条日志时发生，
因此不保证「按时」滚动。


*默认值为 0（关闭）。*


```opensips title="Set journal_roll_interval parameter"
...
modparam("db_berkeley", "journal_roll_interval", 3600)
...

```


### 导出的函数 {#exported-functions}


没有导出可在配置文件中使用的函数。


### 导出的 MI 函数 {#exported-mi-functions}


#### bdb_reload


使 db_berkeley 模块重新读取指定表（或 dbenv）的内容。
db_berkeley DB 实际上是按需加载每张表，而不是在 mod_init 时
一次性全部加载。bdb_reload 操作实现为「先关闭再重新打开」。
注意——如果某张表此前从未被访问过，bdb_reload 会失败（因为关闭
操作会失败）。


名称：*bdb_reload*


参数：


- *table_path* - 要重载特定表，
请将表名作为参数提供；要重载
所有表，请提供 db 文件的 db_path。该路径可在
opensips-cli 配置变量中找到。


MI FIFO 命令格式：


```bash
		opensips-cli -x mi bdb_reload subscriber
		
```


### 安装与运行 {#installation-and-running}


首先下载、编译并安装 Berkeley DB。这
超出了本文档的范围。该过程的文档
可在 Internet 上获取。


接下来，准备将 OpenSIPS 与 db_berkeley 模块一起编译。
在 /modules/db_berkeley 目录中，修改 Makefile 使其指向
你所分发的 Berkeley DB。你也可以定义 'BDB_EXTRA_DEBUG'
来编译额外的调试日志。不过，这不推荐
部署到生产服务器。


因为该模块依赖外部库，db_berkeley 模块默认不会
被编译和安装。你可以使用以下选项之一。


- 编辑 "Makefile"，从 "excluded_modules"
列表中移除 "db_berkeley"。然后按标准流程安装 OpenSIPS：
"make all; make install"。
- 从命令行使用：'make all include_modules="db_berkeley";
make install include_modules="db_berkeley"'。


安装 OpenSIPS 只需在主目录下以 root 用户运行 make install
即可完成。这会将二进制文件
安装到 /usr/local/sbin/。
如果成功，OpenSIPS 控制引擎文件现在应
安装为 /usr/local/sbin/opensipsdbctl。


决定要在（文件系统上）哪个位置安装 Berkeley DB 文件。
例如 '/usr/local/etc/opensips/db_berkeley' 目录。
记下这个目录，因为我们需要将该路径添加到 opensips-cli 配置文件中。
注意：没有这些 DB 文件，OpenSIPS 将无法启动。


（可选）预创建步骤——自定义你的元数据。
DB 文件初始就已填充必要的元数据。
在修改表的 dbschema 之前，现在是查看
元数据部分细节的好时机。
默认情况下，文件安装在 '/usr/local/share/opensips/db_berkeley/opensips'
默认情况下，这些表创建为可读写，且不带任何日志记录，如
下所示。这些设置可以按表逐个修改。
注意：如果你计划使用 bdb_recover，必须修改 LOGFLAGS。


```c
METADATA_READONLY
0
METADATA_LOGFLAGS
0
```


执行 opensipsdbctl - 根据你的情况，可能需要三（3）组
表。


```c
opensipsdbctl create   		(required)
opensipsdbctl presence 		(optional)
opensipsdbctl extra    		(optional)
```


修改 OpenSIPS 配置文件以使用 db_berkeley 模块。
模块的数据库 URL 必须是 Berkeley DB 表文件所在目录的路径，
并以 "berkeley://" 为前缀，
例如 "berkeley:///usr/local/etc/opensips/db_berkeley"。


另外还有几件重要的事需要考虑：'db_mode' 和 'use_domain'
两个模块参数。这些参数的说明见 usrloc 文档。


关于 db_mode 的说明——
db_berkeley 模块只会在 usrloc 回写 DB 的那一刻记录日志。
最安全的模式是模式 3，因为 db_berkeley 的日志文件将始终
是最新的。关键在于 db_mode 与通过日志文件恢复之间的交互。


写入日志条目是「尽力而为」。因此如果硬盘写满，
写入日志条目的尝试可能失败。


关于 use_domain 的说明——
db_berkeley 模块在执行查询时会尝试自然连接（natural join）。
这基本上就是使用所提供的键进行字典序字符串比较。
在 db_berkeley dbschema 的大多数地方（除非你自定义），domainname
被识别为自然键。
考虑 use_domain = 0 的例子。在 subscriber 表中，db 会以
'username|NULL' 作为键，因为当该键列未提供时将使用默认值。
这实际上意味着后续查询必须一致地使用用户名（不含域）
才能找到与该特定 subscriber 查询匹配的结果。
关键在于：一旦 db_berkeley 建立完成，'use_domain' 就不能再更改。


### 数据库表结构与元数据 {#database-schema-and-metadata}


所有 Berkeley DB 表都通过 opensipsdbctl 脚本创建。
本节详细介绍创建时 DB 文件的内容与
格式。


由于 Berkeley DB 存储键值对，数据库会用
若干元数据行进行初始化。这些行的键必须以 'METADATA' 开头。
以下是取自 'version' 表的表元数据示例。


关于保留字符的说明——
'|' 竖线字符在 Berkeley DB 实现中被用作记录分隔符，
因此不得出现在任何 DB 字段中。


```c title="METADATA_COLUMNS"
METADATA_COLUMNS
table_name(str) table_version(int)
METADATA_KEY
0	
```


在上面的示例中，METADATA_COLUMNS 行定义列名
和类型，METADATA_KEY 行定义哪些列构成键。
此处值 0 表示第 0 列是键（即 table_name）。
关于列类型，db_berkeley 模块只有以下
类型：string、str、int、double 和 datetime。默认类型是 string，
当未指定其他类型时使用。元数据的各列
由空白字符分隔。


实际的列数据以字符串值存储，并由
'|' 竖线字符分隔。由于代码以此分隔符进行分词，
因此该字符不得出现在任何有效数据字段中。
以下是 'db_berkeley.sh dump version' 命令的输出。
它以纯文本形式显示表 'version' 的内容。


```c title="contents of version table"
VERSION=3
	format=print
	type=hash
	h_nelem=21
	db_pagesize=4096
HEADER=END
METADATA_READONLY
	1
	address|
	address|3
	aliases|
	aliases|1004
	dbaliases|
	dbaliases|1
	domain|
	domain|1
	speed_dial|
	speed_dial|2
	subscriber|
	subscriber|6
	uri|
	uri|1
	METADATA_COLUMNS
	table_name(str) table_version(int)
	METADATA_KEY
	0
	acc|
	acc|4
	grp|
	grp|2
	location|
	location|1004
	missed_calls|
	missed_calls|3
	re_grp|
	re_grp|1
	silo|
	silo|5
	trusted|
	trusted|4
	usr_preferences|
	usr_preferences|2
DATA=END

```


### METADATA_COLUMNS (required)


METADATA_COLUMNS 行包含列名和类型。
每项以空格分隔。以下示例数据取自 subscriber 表：


```c title="METADATA_COLUMNS"
METADATA_COLUMNS
username(str) domain(str) password(str) ha1(str) ha1b(str) first_name(str) last_name(str) email_address(str) datetime_created(datetime) timezone(str) rpid(str)
```


相关（硬编码）限制：


- 每张表最多 32 列。
- 表名最大长度为 64。
- 最大数据长度为 2048


目前支持以下五种类型：str、datetime、int、double、string。


### METADATA_KEYS (required)


METADATA_KEYS 行指示键列在
METADATA_COLUMNS 中所指定顺序下的索引。
以下示例取自 subscriber 表，说明了一个要点：


```c title="METADATA_KEYS"
METADATA_KEY
0 1
```


要点在于：username 和 domain name 都是该记录
键的必需部分。因此，必须设置 usrloc 模块参数
use_domain = 1 才能正常工作。


### METADATA_READONLY (optional)


METADATA_READONLY 行包含布尔值 0 或 1。
默认情况下，其值为 0。启动时 DB 会
先以读写方式打开（加载元数据），然后如果该项
设置为 1，它将关闭并以只读（ro）方式重新打开。
我发现这很有用，因为只读会影响
内部 db 锁等。


### METADATA_LOGFLAGS (optional)


METADATA_LOGFLAGS 行包含一个位域，用于按表
自定义日志记录。如果不存在，默认值
取 0。以下是目前的掩码（取自 bdb_lib.h）：


```c title="METADATA_LOGFLAGS"
#define JLOG_NONE 0
#define JLOG_INSERT 1
#define JLOG_DELETE 2
#define JLOG_UPDATE 4
#define JLOG_STDOUT 8
#define JLOG_SYSLOG 16

```


这意味着，如果你想将 INSERT 记录到本地文件并输出到 syslog，值
应设为 1+16=17。或者如果你完全不想记录日志，将其设为 0。


### DB Recovery : bdb_recover


db_berkeley 模块使用并发数据存储（Concurrent Data Store，CDS）架构。
因此，DB 本身不提供事务或日志记录。
应用程序 bdb_recover 专门用于从
OpenSIPS 创建的日志文件中恢复数据。
bdb_recover 应用程序需要额外的文本文件，其中包含
表结构。


该结构通过 '-s' 选项加载，是所有操作都必需的。
提供 db_berkeley 纯文本结构文件的路径。默认情况下，这些
文件安装到 '/usr/local/share/opensips/db_berkeley/opensips/'。


'-h' home 选项即 DB_PATH 路径。与 Berkeley 工具不同，
此应用程序不会查找 DB_PATH 环境变量，
因此你必须指定它。如果未指定，它将假定为当前
工作目录。最后一个参数是操作。
基本上只有两种操作——create 和 recover。


以下说明管理员可用的四种操作。


```bash title="bdb_recover usage"
usage: ./bdb_recover -s schemadir [-h home] [-c tablename]
	This will create a brand new DB file with metadata.

usage: ./bdb_recover -s schemadir [-h home] [-C all]
	This will create all the core tables, each with metadata.

usage: ./bdb_recover -s schemadir [-h home] [-r journal-file]
	This will rebuild a DB and populate it with operation from journal-file. 
	The table name is embedded in the journal-file name by convention.

usage: ./bdb_recover -s schemadir [-h home] [-R lastN]
	This will iterate over all core tables enumerated. If journal files exist in 'home', 
	a new DB file will be created and populated with the data found in the last N files. 
	The files are 'replayed' in chronological order (oldest to newest). This 
	allows the administrator to rebuild the db with a subset of all possible 
	operations if needed. For example, you may only be interested in 
	the last hours data in table location.
	
```

> [!NOTE]
> 在执行 bdb_recover 之前，必须将损坏的 DB 文件移走。


### 已知限制 {#known-limitations}


Berkeley DB 原生不支持自增（或序列）机制。
因此，此版本不支持 dbschema 中的代理键（surrogate keys）。这些
就是表中的 id 列。
<!-- CONTRIBUTORS -->

### 许可证 {#license}


所有文档文件（即 .md 扩展名）均按 Creative Common License 4.0 授权。
