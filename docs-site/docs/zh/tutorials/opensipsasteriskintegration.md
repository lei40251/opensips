---
title: "Asterisk Realtime 集成"
description: "使用 OpenSIPS Debian 软件包、Asterisk 22 LTS 安装、默认路由脚本和最少的 Asterisk PJSIP 改动，搭建 OpenSIPS 4.0 与 Asterisk 集成。"
---

## 实时 Asterisk 集成 {#realtime-asterisk-integration}

本教程介绍如何使用 OpenSIPS Debian 软件包、Asterisk 22 LTS 安装、由数据库支撑的 OpenSIPS 注册服务器以及最小的 Asterisk PJSIP 配置，把 OpenSIPS 4.0 与 Asterisk 搭在一起。

OpenSIPS 是 SIP 边缘服务器：用户向 OpenSIPS 注册，OpenSIPS 对其进行鉴权，并在用户之间路由呼叫。Asterisk 用作媒体应用服务器。发往 Asterisk 服务的呼叫由 OpenSIPS 在拨号分机前加上 `*` 前缀后送出：

* `*9196` 以 `9196` 发给 Asterisk
* `**1234` 会以 `*1234` 发给 Asterisk

Asterisk 侧刻意保持很小：沿用默认配置；当两者运行在同一主机上时，把 Asterisk 的 SIP 从 OpenSIPS 占用的端口挪开；添加一个信任来自 OpenSIPS 流量的 PJSIP 端点；再添加一个供实际测试呼叫使用的拨号方案分机。

### 本文使用的拓扑 {#topology-used-below}

把这些值替换为你自己的值：

```text
SIP domain:       example.com
OpenSIPS IP:      192.0.2.10
Asterisk IP:      192.0.2.30
OpenSIPS SIP:     udp:192.0.2.10:5060
Asterisk SIP:     udp:192.0.2.30:5070
Asterisk app:     9196 echo service
Database:         MariaDB/MySQL on the OpenSIPS host
```

如果两个服务运行在同一主机上，思路相同，只是要使用不同的 SIP 端口，例如 OpenSIPS 用 `5060`、Asterisk 用 `5070`。

---

## 安装 {#installation}

### 基础系统 {#base-system}

从一个受支持的 Debian 安装开始，安装基础工具：

```bash
apt-get update
apt-get install -y ca-certificates curl gnupg lsb-release mariadb-server
```

下面的示例使用 Debian 的 `VERSION_CODENAME`，因此适用于 OpenSIPS APT 选择器列出的受支持 Debian 发行版。

### 从 Debian 软件包安装 OpenSIPS 4.0 {#install-opensips-40-from-debian-packages}

OpenSIPS 软件包发布在 <https://apt.opensips.org/packages.php>。如果需要自动生成的仓库命令，请在那里选择你的操作系统以及 `OpenSIPS 4.0` 稳定包。

```bash
. /etc/os-release

curl https://apt.opensips.org/opensips-org.gpg \
    -o /usr/share/keyrings/opensips-org.gpg

echo "deb [signed-by=/usr/share/keyrings/opensips-org.gpg] https://apt.opensips.org ${VERSION_CODENAME} 4.0-releases" \
    >/etc/apt/sources.list.d/opensips.list

echo "deb [signed-by=/usr/share/keyrings/opensips-org.gpg] https://apt.opensips.org ${VERSION_CODENAME} cli-nightly" \
    >/etc/apt/sources.list.d/opensips-cli.list

apt-get update
apt-get install -y opensips opensips-cli opensips-auth-modules \
    opensips-mysql-module opensips-mysql-dbschema
```

### 创建 OpenSIPS 数据库 {#create-the-opensips-database}

创建 `/etc/opensips-cli.cfg`：

```ini
[default]
database_admin_url: mysql://root@localhost
database_url: mysql://opensips:opensipsrw@localhost/opensips
database_name: opensips
```

然后创建数据库：

```bash
opensips-cli -x database create
```

该命令会创建 `opensips` 数据库、`opensips` 数据库用户以及标准表。如果你的 MariaDB/MySQL 配置不允许使用上面的 `root@localhost` URL，并且你处在封闭的实验环境中，可以在创建 OpenSIPS 数据库期间临时移除本地 `root` 数据库密码。在公开、共享或生产系统上，请保持数据库 root 账号受保护，并把 `database_admin_url` 调整为合适的本地数据库管理员账号：

```ini
database_admin_url: mysql://<ADMIN_USER>:<ADMIN_PASSWORD>@localhost
```

添加测试用户：

```bash
opensips-cli -x user add alice@example.com alicepass
opensips-cli -x user add bob@example.com bobpass
```

### 安装 Asterisk 22 LTS {#install-asterisk-22-lts}

Debian Trixie 的稳定软件包集合中不提供 `asterisk` 二进制包。如果你的 Debian 套件或厂商仓库提供了 Asterisk 软件包，就使用包管理器安装：

```bash
apt-get update
apt-get install -y asterisk
```

在 Debian Trixie 上，需要从上游源码安装 Asterisk 22 LTS。上游下载页面把 Asterisk 22 列为 LTS 分支，Asterisk 源码安装指南给出了完整的构建细节。在一台新的实验主机上，精简的安装步骤如下：

```bash
apt-get update
apt-get install -y build-essential ca-certificates curl tar

cd /usr/src
curl -LO https://downloads.asterisk.org/pub/telephony/asterisk/asterisk-22-current.tar.gz
tar xzf asterisk-22-current.tar.gz
cd asterisk-22*/

./contrib/scripts/install_prereq install
./configure
make menuselect
make
make install
make samples
make config
ldconfig
systemctl enable --now asterisk
```

使用 `make menuselect` 时，保持 PJSIP 模块与 `app_echo` 处于启用状态。如果还需要下文可选的 realtime 映射章节，也要保持 `res_odbc` 与 `app_voicemail` 启用。只有在可以接受覆盖 Asterisk 示例配置的全新安装上，才运行 `make samples`。

检查 Asterisk 能否启动、PJSIP 是否可用：

```bash
systemctl status asterisk
asterisk -rx 'module show like res_pjsip'
asterisk -rx 'core show version'
```

---

## 配置 {#configuration}

下面的脚本基于 OpenSIPS 4.0 默认的 residential 脚本，并做了以下增补：

* 基于 MySQL 的鉴权
* 持久化的、基于 MySQL 的用户位置
* 对 `REGISTER` 与用户发起的呼叫使用 SIP 摘要鉴权
* SIP 用户名与鉴权用户名之间的一一映射
* 一个用于星号前缀媒体服务的 `route[asterisk]` 块

将脚本保存为 `/etc/opensips/opensips.cfg` 并更新 `CUSTOMIZE` 标注的值。如果你的 Debian 架构不是 `amd64`，请保留软件包提供的 `mpath` 值。

```opensips
####### Global Parameters #########

log_level=3
xlog_level=3
stderror_enabled=no
syslog_enabled=yes
syslog_facility=LOG_LOCAL0

udp_workers=4

socket=udp:192.0.2.10:5060   # 需定制：OpenSIPS 监听地址
alias=example.com            # 需定制：SIP 域

####### Modules Section ########

mpath="/usr/lib/x86_64-linux-gnu/opensips/modules/"  # Debian amd64 路径

loadmodule "signaling.so"
loadmodule "sl.so"

loadmodule "tm.so"
modparam("tm", "fr_timeout", 5)
modparam("tm", "fr_inv_timeout", 30)
modparam("tm", "restart_fr_on_each_reply", 0)
modparam("tm", "onreply_avp_mode", 1)

loadmodule "rr.so"
modparam("rr", "append_fromtag", 0)

loadmodule "maxfwd.so"
loadmodule "sipmsgops.so"

loadmodule "mi_fifo.so"
modparam("mi_fifo", "fifo_name", "/run/opensips/opensips_fifo")
modparam("mi_fifo", "fifo_mode", 0666)

loadmodule "db_mysql.so"

loadmodule "auth.so"
loadmodule "auth_db.so"
modparam("auth_db", "db_url", "mysql://opensips:opensipsrw@localhost/opensips")
modparam("auth_db", "use_domain", true)
modparam("auth_db", "load_credentials", "")

loadmodule "usrloc.so"
modparam("usrloc", "db_url", "mysql://opensips:opensipsrw@localhost/opensips")
modparam("usrloc", "use_domain", true)
modparam("usrloc", "working_mode_preset", "single-instance-sql-write-back")

loadmodule "registrar.so"
modparam("registrar", "tcp_persistent_flag", "TCP_PERSISTENT")

loadmodule "acc.so"
modparam("acc", "early_media", 0)
modparam("acc", "report_cancels", 0)
modparam("acc", "detect_direction", 0)

loadmodule "proto_udp.so"

####### Routing Logic ########

route {
	if (!mf_process_maxfwd_header(10)) {
		send_reply(483, "Too Many Hops");
		exit;
	}

	if (has_totag()) {
		if (is_method("ACK") && t_check_trans()) {
			t_relay();
			exit;
		}

		if (!loose_route()) {
			send_reply(404, "Not here");
			exit;
		}

		if (is_method("BYE"))
			do_accounting("log", "failed");

		route(relay);
		exit;
	}

	if (is_method("CANCEL")) {
		if (t_check_trans())
			t_relay();
		exit;
	}

	t_check_trans();

	if (!is_method("REGISTER")) {
		if (is_myself("$fd")) {
			if (!proxy_authorize("", "subscriber")) {
				proxy_challenge("", "auth");
				exit;
			}

			if ($au != $fU) {
				send_reply(403, "Forbidden auth ID");
				exit;
			}

			consume_credentials();
		} else if (!is_myself("$rd")) {
			send_reply(403, "Relay Forbidden");
			exit;
		}
	}

	if (loose_route()) {
		xlog("L_ERR", "Attempt to route with preloaded Route [$fu/$tu/$ru/$ci]\n");
		if (!is_method("ACK"))
			send_reply(403, "Preload Route denied");
		exit;
	}

	if (!is_method("REGISTER|MESSAGE"))
		record_route();

	if (is_method("INVITE"))
		do_accounting("log");

	if (!is_myself("$rd")) {
		append_hf("P-hint: outbound\r\n");
		route(relay);
	}

	if (is_method("PUBLISH|SUBSCRIBE")) {
		send_reply(503, "Service Unavailable");
		exit;
	}

	if (is_method("REGISTER")) {
		if (!www_authorize("", "subscriber")) {
			www_challenge("", "auth");
			exit;
		}

		if ($au != $tU) {
			send_reply(403, "Forbidden auth ID");
			exit;
		}

		if (!save("location"))
			xlog("L_ERR", "failed to register AoR $tu\n");

		exit;
	}

	if ($rU == NULL) {
		send_reply(484, "Address Incomplete");
		exit;
	}

	route(asterisk);

	if (!lookup("location", "method-filtering")) {
		t_reply(404, "Not Found");
		exit;
	}

	do_accounting("log", "missed");
	route(relay);
}

route[asterisk] {
	if (!is_method("INVITE"))
		return;

	if ($rU =~ "^\*") {
		strip(1);
		$du = "sip:192.0.2.30:5070";   # 需定制：Asterisk PJSIP 监听地址
		route(relay);
	}
}

route[relay] {
	if (is_method("INVITE")) {
		t_on_branch("per_branch_ops");
		t_on_reply("handle_nat");
		t_on_failure("missed_call");
	}

	if (!t_relay())
		send_reply(500, "Internal Error");

	exit;
}

branch_route[per_branch_ops] {
	xlog("new branch at $ru\n");
}

onreply_route[handle_nat] {
	xlog("incoming reply\n");
}

failure_route[missed_call] {
	if (t_was_cancelled())
		exit;
}
```

校验并重启 OpenSIPS：

```bash
opensips -C -f /etc/opensips/opensips.cfg
systemctl restart opensips
systemctl status opensips
```

---

## Asterisk 配置 {#asterisk-configuration}

不要替换 Asterisk 配置树。为 OpenSIPS 添加一个 PJSIP 传输与端点，再为来自 OpenSIPS 的呼叫添加一个拨号方案 context。

### PJSIP 监听与 OpenSIPS 端点 {#pjsip-listener-and-opensips-endpoint}

把以下内容加入 `/etc/asterisk/pjsip.conf`，并更新 `CUSTOMIZE` 标注的值：

```ini
[transport-udp-opensips]
type=transport
protocol=udp
bind=192.0.2.30:5070        ; 需定制：Asterisk 监听地址

[opensips-endpoint]
type=endpoint
transport=transport-udp-opensips
context=from-opensips
disallow=all
allow=ulaw,alaw
aors=opensips-aor
direct_media=no
trust_id_inbound=yes

[opensips-aor]
type=aor
contact=sip:192.0.2.10:5060 ; 需定制：OpenSIPS 监听地址

[opensips-identify]
type=identify
endpoint=opensips-endpoint
match=192.0.2.10/32         ; 需定制：OpenSIPS 源 IP
```

如果 Asterisk 与 OpenSIPS 运行在同一主机上，确保没有其他 PJSIP 传输绑定了与 OpenSIPS 相同的 IP 和端口。

重载 PJSIP：

```bash
asterisk -rx 'pjsip reload'
asterisk -rx 'pjsip show endpoint opensips-endpoint'
```

### Asterisk 服务分机 {#asterisk-service-extension}

把以下内容加入 `/etc/asterisk/extensions.conf`：

```ini
[from-opensips]
exten => 9196,1,Answer()
 same => n,Echo()
 same => n,Hangup()
```

这样 OpenSIPS 到 Asterisk 的交接就有了完整的目标：OpenSIPS 用户拨打 `*9196` 时，以 `9196` 到达 Asterisk，并在 `from-opensips` context 中启动回音测试。

重载拨号方案：

```bash
asterisk -rx 'dialplan reload'
asterisk -rx 'dialplan show from-opensips'
```

使用防火墙或主机 ACL，只允许 OpenSIPS 访问 Asterisk 的 PJSIP 端口。PJSIP 的 `identify` 匹配是有用的，但它不能替代网络访问控制。

---

## 测试 {#testing}

把 `alice@example.com` 与 `bob@example.com` 注册到 OpenSIPS 的 `5060` 端口。

呼叫流程检查：

* `alice` 呼叫 `bob`：OpenSIPS 鉴权主叫，在 `location` 中查询 `bob`，并把呼叫中继到 Bob 已注册的 Contact。
* `alice` 呼叫 `*9196`：OpenSIPS 去掉第一个 `*`，把 `9196` 发到 `192.0.2.30:5070` 的 Asterisk，Asterisk 从 `from-opensips` 拨号方案 context 接听回音服务。
* `alice` 呼叫 `**1234`：OpenSIPS 只去掉一个 `*`，因此 Asterisk 收到的是 `*1234`。如果需要使用 Asterisk 的星号功能码，请在 `from-opensips` 中添加该分机。

常用检查：

```bash
opensips-cli -x mi ul:dump
opensips-cli -x mi ps
asterisk -rx 'pjsip show transports'
asterisk -rx 'pjsip show endpoint opensips-endpoint'
asterisk -rx 'core show channels'
```

OpenSIPS 4.0 使用规范的 `module:command` 形式 MI 命令名，例如 `ul:dump`。

---

## 由用户生成可选的 Asterisk Realtime 视图 {#optional-asterisk-realtime-views-from-subscribers}

上面的交接并不需要 Asterisk 用户记录。当 Asterisk 应用需要跟随 OpenSIPS 用户列表的用户数据时（例如语音信箱用户、信箱别名或 Asterisk 侧的 PJSIP 用户对象），再加上这一节。

本教程的 realtime 版本包含了这部分用户映射信息。这里把它保留为可选章节，使基本的 SIP 交接保持精简，同时在 Asterisk 服务需要时仍可使用 realtime 集成。

SIP 端点仍然向 OpenSIPS 注册并鉴权。这些视图让 Asterisk 在 realtime 请求用户数据时，能够从 OpenSIPS 数据库读取。

### 供 Asterisk 使用的 OpenSIPS subscriber 字段 {#opensips-subscriber-fields-for-asterisk}

OpenSIPS 4.0 创建 `subscriber` 表时包含 `username`、`domain`、`password` 和 `ha1` 字段。为语音信箱与显示信息添加 Asterisk 专用字段：

```sql
ALTER TABLE subscriber
  ADD COLUMN ast_vm_password VARCHAR(32) NOT NULL DEFAULT '1234',
  ADD COLUMN ast_first_name VARCHAR(64) NOT NULL DEFAULT '',
  ADD COLUMN ast_last_name VARCHAR(64) NOT NULL DEFAULT '',
  ADD COLUMN ast_email VARCHAR(128) NOT NULL DEFAULT '';
```

为教程中的用户设置值：

```sql
UPDATE subscriber
  SET ast_vm_password = '1001',
      ast_first_name = 'Alice',
      ast_last_name = 'Example',
      ast_email = 'alice@example.com'
  WHERE username = 'alice' AND domain = 'example.com';

UPDATE subscriber
  SET ast_vm_password = '1002',
      ast_first_name = 'Bob',
      ast_last_name = 'Example',
      ast_email = 'bob@example.com'
  WHERE username = 'bob' AND domain = 'example.com';
```

OpenSIPS 会忽略这些额外的列。Asterisk 只通过下面的视图读取它们。

### Asterisk 数据库与视图 {#asterisk-database-and-views}

为 Asterisk realtime 数据创建一个独立的 `asterisk` 数据库：

```sql
CREATE DATABASE IF NOT EXISTS asterisk;

CREATE USER IF NOT EXISTS 'asterisk'@'localhost'
  IDENTIFIED BY 'asterisk_pwd';

GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, ALTER, INDEX
  ON asterisk.* TO 'asterisk'@'localhost';

GRANT SELECT ON opensips.* TO 'asterisk'@'localhost';

FLUSH PRIVILEGES;
```

在 OpenSIPS 的 `subscriber` 表之上创建 realtime 语音信箱视图：

```sql
CREATE OR REPLACE VIEW asterisk.vmusers AS
SELECT
  CONCAT(username, '@', domain) AS uniqueid,
  username AS customer_id,
  'from-opensips' AS context,
  username AS mailbox,
  ast_vm_password AS password,
  TRIM(CONCAT(ast_first_name, ' ', ast_last_name)) AS fullname,
  ast_email AS email,
  NULL AS pager,
  NOW() AS stamp
FROM opensips.subscriber;
```

从 OpenSIPS 的 `dbaliases` 表创建语音信箱别名：

```sql
CREATE OR REPLACE VIEW asterisk.vmaliases AS
SELECT
  alias_username AS alias,
  'from-opensips' AS context,
  username AS mailbox
FROM opensips.dbaliases;
```

创建一张可选的表，用于通过 ODBC 存放语音信箱消息：

```sql
CREATE TABLE IF NOT EXISTS asterisk.voicemessages (
  id INT NOT NULL AUTO_INCREMENT,
  msgnum INT NOT NULL DEFAULT 0,
  dir VARCHAR(255) DEFAULT '',
  context VARCHAR(80) DEFAULT '',
  macrocontext VARCHAR(80) DEFAULT '',
  callerid VARCHAR(80) DEFAULT '',
  origtime VARCHAR(40) DEFAULT '',
  duration VARCHAR(20) DEFAULT '',
  mailboxuser VARCHAR(80) DEFAULT '',
  mailboxcontext VARCHAR(80) DEFAULT '',
  recording LONGBLOB,
  PRIMARY KEY (id),
  KEY dir (dir)
);
```

为 Asterisk 用户对象创建可选的 PJSIP realtime 视图。基础的 OpenSIPS 到 Asterisk 交接仍然使用静态的 `opensips-endpoint`；只有当某个 Asterisk 应用或拨号方案也想要把 `alice`、`bob` 这类用户当作 PJSIP 对象查询时，这些视图才有用。

```sql
CREATE OR REPLACE VIEW asterisk.ps_endpoints AS
SELECT
  username AS id,
  'transport-udp-opensips' AS transport,
  CONCAT(username, '-aor') AS aors,
  CONCAT(username, '-auth') AS auth,
  'from-opensips' AS context,
  'all' AS disallow,
  'ulaw,alaw' AS allow,
  'no' AS direct_media,
  'yes' AS trust_id_inbound,
  CONCAT(TRIM(CONCAT(ast_first_name, ' ', ast_last_name)),
         ' <', username, '>') AS callerid,
  'sip:192.0.2.10:5060;lr' AS outbound_proxy
FROM opensips.subscriber;

CREATE OR REPLACE VIEW asterisk.ps_aors AS
SELECT
  CONCAT(username, '-aor') AS id,
  CONCAT('sip:', username, '@', domain) AS contact,
  1 AS max_contacts,
  'yes' AS remove_existing,
  60 AS qualify_frequency
FROM opensips.subscriber;

CREATE OR REPLACE VIEW asterisk.ps_auths AS
SELECT
  CONCAT(username, '-auth') AS id,
  'userpass' AS auth_type,
  username AS username,
  password AS password,
  ha1 AS password_digest,
  domain AS realm
FROM opensips.subscriber;
```

### 为 Asterisk 配置 ODBC 访问 {#odbc-access-for-asterisk}

安装 UnixODBC 以及适用于你的 Debian 发行版的 MariaDB/MySQL ODBC 驱动。在 Debian 系统上通常是：

```bash
apt-get install -y unixodbc odbc-mariadb
```

检查已安装驱动的名称：

```bash
odbcinst -q -d
```

创建 `/etc/odbc.ini`，并使用你的系统上报告出来的驱动名称：

```ini
[asterisk]
Description = Asterisk database
Driver      = MariaDB Unicode
SERVER      = 127.0.0.1
PORT        = 3306
DATABASE    = asterisk
USER        = asterisk
PASSWORD    = asterisk_pwd
```

检查 DSN：

```bash
isql -v asterisk asterisk asterisk_pwd
```

配置 `/etc/asterisk/res_odbc.conf`：

```ini
[asterisk]
enabled => yes
dsn => asterisk
username => asterisk
password => asterisk_pwd
pre-connect => yes
```

重载 ODBC 并检查连接：

```bash
asterisk -rx 'module reload res_odbc.so'
asterisk -rx 'odbc show'
```

### Asterisk Realtime 映射 {#asterisk-realtime-mapping}

把 realtime 族加入 `/etc/asterisk/extconfig.conf`：

```ini
[settings]
voicemail => odbc,asterisk,vmusers
voicemail_data => odbc,asterisk,voicemessages
ps_endpoints => odbc,asterisk,ps_endpoints
ps_aors => odbc,asterisk,ps_aors
ps_auths => odbc,asterisk,ps_auths
```

重载受影响的模块：

```bash
asterisk -rx 'module reload res_config_odbc.so'
asterisk -rx 'module reload app_voicemail.so'
asterisk -rx 'module reload res_pjsip.so'
```

检查映射后的数据：

```bash
asterisk -rx 'voicemail show users'
asterisk -rx 'pjsip show endpoint alice'
asterisk -rx 'pjsip show aor alice-aor'
```

如果这些命令显示的是 OpenSIPS 数据库中的值，那么当某个已配置的 Asterisk 应用请求这些数据时，Asterisk 就能把 `alice@example.com` 与 `bob@example.com` 映射为 Asterisk realtime 用户。

---

## 最终具备的功能 {#resulting-functions}

在基础配置下：

* OpenSIPS 对 SIP 用户进行鉴权并保存其 Contact。
* OpenSIPS 从其 `location` 表路由用户到用户的呼叫。
* OpenSIPS 把带星号前缀的媒体服务呼叫发送给 Asterisk。
* Asterisk 接受来自 OpenSIPS 的可信呼叫，并接听 `9196` 回音服务。

再加上可选的 realtime 映射后：

* Asterisk 可以把 OpenSIPS 用户解析为 realtime 语音信箱用户。
* Asterisk 可以为消费 Asterisk 侧用户的服务提供与之匹配的 PJSIP realtime 用户对象。

---

## 本方案使用的数据 {#data-used-by-this-setup}

OpenSIPS 把用户凭据存放在 `subscriber` 表、把已注册的 Contact 存放在 `location` 表。两个可用用户通过以下命令创建：

```bash
opensips-cli -x user add alice@example.com alicepass
opensips-cli -x user add bob@example.com bobpass
```

在本方案中，Asterisk 不对客户端 SIP 端点做鉴权。完成交接所需的 Asterisk 数据包括：

* `/etc/asterisk/pjsip.conf`，定义面向 OpenSIPS 的传输、端点、AOR 与 IP identify 匹配
* `/etc/asterisk/extensions.conf`，定义测试呼叫使用的 `9196` 回音服务

可选的 realtime 映射还会增加：

* OpenSIPS `subscriber` 表中的 Asterisk 专用列
* `asterisk` 数据库，其中包含基于 OpenSIPS 用户数据的 realtime 视图
* 一个名为 `asterisk` 的 ODBC DSN
* `res_odbc.conf` 与 `extconfig.conf` 中的 realtime 映射

---

## 参考 {#references}

* OpenSIPS APT 仓库：<https://apt.opensips.org/packages.php>
* Debian Asterisk 软件包页面：<https://packages.debian.org/sid/asterisk>
* Debian Asterisk 软件包跟踪器：<https://tracker.debian.org/pkg/asterisk>
* Asterisk 安装概述：<https://docs.asterisk.org/Getting-Started/Installing-Asterisk/>
* Asterisk 源码安装：<https://docs.asterisk.org/Getting-Started/Installing-Asterisk/Installing-Asterisk-From-Source/>
* Asterisk 支持的版本与下载：<https://www.asterisk.org/downloads/asterisk/all-asterisk-versions/>
