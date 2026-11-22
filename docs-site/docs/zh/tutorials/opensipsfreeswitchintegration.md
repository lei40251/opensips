---
title: "FreeSWITCH 媒体集成"
description: "使用 Debian 软件包、默认路由脚本和最少的 FreeSWITCH 改动，搭建当前版本的 OpenSIPS 4.0 与 FreeSWITCH 集成。"
---

## 实时 FreeSWITCH 集成 {#realtime-freeswitch-integration}

本教程介绍如何使用 Debian 软件包、由数据库支撑的 OpenSIPS 注册服务器以及最小的 FreeSWITCH 配置，把 OpenSIPS 4.0 与 FreeSWITCH 搭在一起。

OpenSIPS 是 SIP 边缘服务器：用户向 OpenSIPS 注册，OpenSIPS 对其进行鉴权，并在用户之间路由呼叫。FreeSWITCH 用作媒体应用服务器。发往 FreeSWITCH 服务的呼叫由 OpenSIPS 在拨号分机前加上 `*` 前缀后送出：

* `*9196` 以 `9196` 发给 FreeSWITCH
* `**1234` 以 `*1234` 发给 FreeSWITCH

FreeSWITCH 侧刻意保持很小：沿用默认配置，不要整体替换 XML 文件；当两者运行在同一主机上时，把 FreeSWITCH 的 SIP 从 OpenSIPS 占用的端口挪开；添加一条 ACL 条目；添加一条接受来自 OpenSIPS 呼叫的拨号方案条目；再添加一个供实际测试呼叫使用的服务分机。

### 本文使用的拓扑 {#topology-used-below}

把这些值替换为你自己的值：

```text
SIP domain:       example.com
OpenSIPS IP:      192.0.2.10
FreeSWITCH IP:    192.0.2.20
OpenSIPS SIP:     udp:192.0.2.10:5060
FreeSWITCH SIP:   udp:192.0.2.20:5090
FreeSWITCH app:   9196 echo service
Database:         MariaDB/MySQL on the OpenSIPS host
```

如果两个服务运行在同一主机上，思路相同，只是要使用不同的 SIP 端口，例如 OpenSIPS 用 `5060`、FreeSWITCH 用 `5090`。

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

### 从 Debian 软件包安装 FreeSWITCH {#install-freeswitch-from-debian-packages}

FreeSWITCH 软件包安装在上游 FreeSWITCH 源码树的 `scripts/packaging` 目录下已有文档说明。当前的软件包获取方式使用 `fsget`，需要一个 SignalWire 个人访问令牌（Personal Access Token）或企业 API 令牌：

```bash
apt-get update
apt-get install -y curl

curl -sSL https://freeswitch.org/fsget | bash -s <SIGNALWIRE_TOKEN> release install
```

如果无法使用需要鉴权的软件包仓库，可以使用 <https://github.com/signalwire/freeswitch/releases> 提供的 FreeSWITCH 发行源码，或按文档中的 `fsdeb` 流程构建 Debian 软件包：<https://github.com/signalwire/freeswitch/tree/master/scripts/packaging/build>。

---

## 配置 {#configuration}

下面的脚本基于 OpenSIPS 4.0 默认的 residential 脚本，并做了以下增补：

* 基于 MySQL 的鉴权
* 持久化的、基于 MySQL 的用户位置
* 对 `REGISTER` 与用户发起的呼叫使用 SIP 摘要鉴权
* SIP 用户名与鉴权用户名之间的一一映射
* 一个用于星号前缀媒体服务的 `route[freeswitch]` 块

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

	route(freeswitch);

	if (!lookup("location", "method-filtering")) {
		t_reply(404, "Not Found");
		exit;
	}

	do_accounting("log", "missed");
	route(relay);
}

route[freeswitch] {
	if (!is_method("INVITE"))
		return;

	if ($rU =~ "^\*") {
		strip(1);
		$du = "sip:192.0.2.20:5090";   # 需定制：FreeSWITCH SIP 监听地址
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

## FreeSWITCH 配置 {#freeswitch-configuration}

不要替换默认的 FreeSWITCH 配置树。只有在 SIP 端口与 OpenSIPS 冲突时才修改端口，另外添加一条 ACL 条目和一个拨号方案文件。

### SIP IP 与端口 {#sip-ip-and-port}

如果 FreeSWITCH 与 OpenSIPS 运行在同一 IP 上，编辑 `/etc/freeswitch/vars.xml`，把内部 SIP profile 从 `5060` 挪开：

```xml
<X-PRE-PROCESS cmd="set" data="internal_sip_port=5090"/>
```

如果也使用外部 profile，把它放在另一个端口上：

```xml
<X-PRE-PROCESS cmd="set" data="external_sip_port=5091"/>
```

如果希望 FreeSWITCH 把 Sofia 绑定到特定监听 IP，编辑 `/etc/freeswitch/sip_profiles/internal.xml`，把 `sip-ip` 与 `ext-sip-ip` 都设为面向 OpenSIPS 的地址：

```xml
<param name="sip-ip" value="192.0.2.20"/>
<param name="ext-sip-ip" value="192.0.2.20"/>
```

除非 OpenSIPS 正是通过该公网地址访问 FreeSWITCH，否则不要让内部 profile 通告公网或经 STUN 发现的 `ext-sip-ip`。

修改 profile 的 IP 或端口后重启 FreeSWITCH：

```bash
systemctl restart freeswitch
```

### 在 FreeSWITCH ACL 中放行 OpenSIPS {#allow-opensips-in-the-freeswitch-acl}

默认的内部 SIP profile 在把未鉴权呼叫接入拨号方案之前会使用 `domains` ACL。在 `/etc/freeswitch/autoload_configs/acl.conf.xml` 中把 OpenSIPS 源 IP 加入该 ACL：

```xml
<list name="domains" default="deny">
  <node type="allow" domain="$${domain}"/>
  <node type="allow" cidr="192.0.2.10/32"/>
</list>
```

重载 ACL：

```bash
fs_cli -x 'reloadacl'
```

### 为 OpenSIPS 添加拨号方案条目 {#dialplan-entry-for-opensips}

创建 `/etc/freeswitch/dialplan/public/00_from_opensips.xml`：

```xml
<include>
  <extension name="from_opensips" continue="false">
    <condition field="network_addr" expression="^192\.0\.2\.10$">
      <action application="transfer" data="${destination_number} XML default"/>
    </condition>
  </extension>
</include>
```

把 `192.0.2.10` 替换为 FreeSWITCH 所看到的 OpenSIPS 源 IP。这样 public context 仍对任意主叫关闭，同时允许 OpenSIPS 把可信的、已完成鉴权的用户交给 FreeSWITCH 默认 context。

### FreeSWITCH 服务分机 {#freeswitch-service-extension}

创建 `/etc/freeswitch/dialplan/default/20_opensips_services.xml`：

```xml
<include>
  <extension name="opensips_echo_test">
    <condition field="destination_number" expression="^9196$">
      <action application="answer"/>
      <action application="echo"/>
    </condition>
  </extension>
</include>
```

这样 OpenSIPS 到 FreeSWITCH 的交接就有了完整的目标：OpenSIPS 用户拨打 `*9196` 时，以 `9196` 到达 FreeSWITCH，并在 default context 中启动回音测试。

重载 XML：

```bash
fs_cli -x 'reloadxml'
```

使用防火墙或主机 ACL，只允许 OpenSIPS 访问 FreeSWITCH 的 SIP 端口。拨号方案检查是有用的，但它不能替代网络访问控制。

---

## 测试 {#testing}

把 `alice@example.com` 与 `bob@example.com` 注册到 OpenSIPS 的 `5060` 端口。

呼叫流程检查：

* `alice` 呼叫 `bob`：OpenSIPS 鉴权主叫，在 `location` 中查询 `bob`，并把呼叫中继到 Bob 已注册的 Contact。
* `alice` 呼叫 `*9196`：OpenSIPS 去掉第一个 `*`，把 `9196` 发到 `192.0.2.20:5090` 的 FreeSWITCH，FreeSWITCH 从 `default` 拨号方案 context 接听回音服务。
* `alice` 呼叫 `**1234`：OpenSIPS 只去掉一个 `*`，因此 FreeSWITCH 收到的是 `*1234`。

常用检查：

```bash
opensips-cli -x mi ul:dump
opensips-cli -x mi ps
fs_cli -x 'sofia status'
fs_cli -x 'show calls'
```

OpenSIPS 4.0 使用规范的 `module:command` 形式 MI 命令名，例如 `ul:dump`。

---

## 由用户生成可选的 FreeSWITCH 目录 {#optional-freeswitch-directory-from-subscribers}

上面的交接并不需要 FreeSWITCH 目录用户。当 FreeSWITCH 应用需要为每个 OpenSIPS 用户关联一个用户对象时（例如语音信箱、MWI 数据、每用户变量或目录查询），再加上这一节。

本教程的实时版本包含了这部分用户映射信息。这里把它保留为可选章节，使基本的 SIP 交接保持精简，同时在 FreeSWITCH 服务需要时仍可使用目录集成。

SIP 端点仍然向 OpenSIPS 注册并鉴权。该映射只是让 FreeSWITCH 在某个模块请求用户数据时，能够从 OpenSIPS 的 `subscriber` 表构建目录 XML。

### 供 FreeSWITCH 使用的 OpenSIPS subscriber 字段 {#opensips-subscriber-fields-for-freeswitch}

OpenSIPS 4.0 创建 `subscriber` 表时包含 `username`、`domain`、`password` 和 `ha1` 字段。为语音信箱元数据添加 FreeSWITCH 专用字段：

```sql
ALTER TABLE subscriber
  ADD COLUMN fs_vm_password VARCHAR(32) NOT NULL DEFAULT '1234',
  ADD COLUMN fs_vm_email VARCHAR(128) NOT NULL DEFAULT '';
```

为教程中的用户设置值：

```sql
UPDATE subscriber
  SET fs_vm_password = '1001', fs_vm_email = 'alice@example.com'
  WHERE username = 'alice' AND domain = 'example.com';

UPDATE subscriber
  SET fs_vm_password = '1002', fs_vm_email = 'bob@example.com'
  WHERE username = 'bob' AND domain = 'example.com';
```

OpenSIPS 会忽略这些额外的列。FreeSWITCH 只通过下面的 Lua 处理程序读取它们。

### 通过 ODBC 访问 OpenSIPS 数据库 {#odbc-access-to-the-opensips-database}

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
[opensips]
Description = OpenSIPS database
Driver      = MariaDB Unicode
SERVER      = 127.0.0.1
PORT        = 3306
DATABASE    = opensips
USER        = opensips
PASSWORD    = opensipsrw
```

检查 DSN：

```bash
isql -v opensips opensips opensipsrw
```

### Lua 目录处理程序 {#lua-directory-handler}

找到 FreeSWITCH 的脚本目录：

```bash
fs_cli -x 'eval $${script_dir}'
```

在 Debian 软件包中通常是 `/usr/share/freeswitch/scripts`。在该目录下创建 `opensips_directory.lua`：

```lua
local db_dsn = "opensips"
local db_user = "opensips"
local db_pass = "opensipsrw"
local opensips_proxy = "192.0.2.10:5060"
local default_vm_password = "1234"
local debug_enabled = false

local function log(level, message)
        freeswitch.consoleLog(level, "[opensips_directory] " .. message .. "\n")
end

local function xml_escape(value)
        value = tostring(value or "")
        value = value:gsub("&", "&amp;")
        value = value:gsub("<", "&lt;")
        value = value:gsub(">", "&gt;")
        value = value:gsub("\"", "&quot;")
        value = value:gsub("'", "&apos;")
        return value
end

local function sql_escape(value)
        value = tostring(value or "")
        value = value:gsub("\\", "\\\\")
        value = value:gsub("'", "\\'")
        return value
end

local function add(xml, line)
        xml[#xml + 1] = line
end

local section = XML_REQUEST and XML_REQUEST["section"] or ""
if section ~= "directory" then
        XML_STRING = ""
        return
end

local domain_name = params:getHeader("domain") or params:getHeader("sip_auth_realm") or ""
local user = params:getHeader("user") or ""

if user == "" or domain_name == "" or user == "*97" then
        XML_STRING = ""
        return
end

local dbh = freeswitch.Dbh(db_dsn, db_user, db_pass)
if not dbh:connected() then
        log("err", "database connection failed")
        XML_STRING = ""
        return
end

local sql = string.format(
        "SELECT username, domain, password, ha1, fs_vm_password, fs_vm_email " ..
        "FROM subscriber WHERE username = '%s' AND domain = '%s' LIMIT 1",
        sql_escape(user),
        sql_escape(domain_name)
)

if debug_enabled then
        log("notice", sql)
end

local row_data = nil
dbh:query(sql, function(row)
        row_data = {
                username = row.username or "",
                domain = row.domain or "",
                password = row.password or "",
                ha1 = row.ha1 or "",
                fs_vm_password = row.fs_vm_password or "",
                fs_vm_email = row.fs_vm_email or ""
        }
end)
dbh:release()

if not row_data then
        XML_STRING = ""
        return
end

local username = row_data.username
local domain = row_data.domain
local vm_password = row_data.fs_vm_password
if vm_password == "" then
        vm_password = default_vm_password
end

local dial_string = "sofia/internal/sip:" .. username .. "@" .. domain ..
        ";fs_path=sip:" .. opensips_proxy

local xml = {}
add(xml, [[<?xml version="1.0" encoding="UTF-8" standalone="no"?>]])
add(xml, [[<document type="freeswitch/xml">]])
add(xml, [[  <section name="directory">]])
add(xml, [[    <domain name="]] .. xml_escape(domain) .. [[">]])
add(xml, [[      <user id="]] .. xml_escape(username) .. [[">]])
add(xml, [[        <params>]])

if row_data.password ~= "" then
        add(xml, [[          <param name="password" value="]] ..
                xml_escape(row_data.password) .. [["/>]])
end

if row_data.ha1 ~= "" then
        add(xml, [[          <param name="a1-hash" value="]] ..
                xml_escape(row_data.ha1) .. [["/>]])
end

add(xml, [[          <param name="vm-enabled" value="true"/>]])
add(xml, [[          <param name="vm-password" value="]] ..
        xml_escape(vm_password) .. [["/>]])

if row_data.fs_vm_email ~= "" then
        add(xml, [[          <param name="vm-email-all-messages" value="true"/>]])
        add(xml, [[          <param name="vm-attach-file" value="true"/>]])
        add(xml, [[          <param name="vm-keep-local-after-email" value="true"/>]])
        add(xml, [[          <param name="vm-mailto" value="]] ..
                xml_escape(row_data.fs_vm_email) .. [["/>]])
end

add(xml, [[          <param name="dial-string" value="]] ..
        xml_escape(dial_string) .. [["/>]])
add(xml, [[        </params>]])
add(xml, [[        <variables>]])
add(xml, [[          <variable name="domain_name" value="]] ..
        xml_escape(domain) .. [["/>]])
add(xml, [[          <variable name="user_context" value="default"/>]])
add(xml, [[          <variable name="effective_caller_id_name" value="]] ..
        xml_escape(username) .. [["/>]])
add(xml, [[          <variable name="effective_caller_id_number" value="]] ..
        xml_escape(username) .. [["/>]])
add(xml, [[        </variables>]])
add(xml, [[      </user>]])
add(xml, [[    </domain>]])
add(xml, [[  </section>]])
add(xml, [[</document>]])

XML_STRING = table.concat(xml, "\n")

if debug_enabled then
        log("notice", XML_STRING)
end
```

### 启用 Lua XML 目录绑定 {#enable-the-lua-xml-directory-binding}

编辑 `/etc/freeswitch/autoload_configs/modules.conf.xml`，确保 `mod_lua` 已加载：

```xml
<load module="mod_lua"/>
```

编辑 `/etc/freeswitch/autoload_configs/lua.conf.xml`，添加目录 XML 处理程序：

```xml
<configuration name="lua.conf" description="LUA Configuration">
  <settings>
    <param name="script-directory" value="$${script_dir}/?.lua"/>
    <param name="xml-handler-script" value="opensips_directory.lua"/>
    <param name="xml-handler-bindings" value="directory"/>
  </settings>
</configuration>
```

重载 FreeSWITCH XML 与 `mod_lua`，或者重启 FreeSWITCH：

```bash
fs_cli -x 'reloadxml'
fs_cli -x 'reload mod_lua'
```

检查 FreeSWITCH 能否为某个 OpenSIPS 用户获取目录数据：

```bash
fs_cli -x 'user_data alice@example.com param vm-password'
fs_cli -x 'user_data alice@example.com param a1-hash'
```

如果这些命令返回的是 OpenSIPS 数据库中的值，那么每当 FreeSWITCH 应用请求目录数据时，FreeSWITCH 就能把 `alice@example.com` 映射为一个 FreeSWITCH 目录用户。

---

## 最终具备的功能 {#resulting-functions}

在基础配置下：

* OpenSIPS 对 SIP 用户进行鉴权并保存其 Contact。
* OpenSIPS 从其 `location` 表路由用户到用户的呼叫。
* OpenSIPS 把带星号前缀的媒体服务呼叫发送给 FreeSWITCH。
* FreeSWITCH 接受来自 OpenSIPS 的可信呼叫，并接听 `9196` 回音服务。

再加上可选的目录映射后：

* FreeSWITCH 可以把 OpenSIPS 用户解析为 FreeSWITCH 目录用户。
* FreeSWITCH 可以在消费目录数据的模块中使用映射后的信箱元数据与用户变量。

---

## 本方案使用的数据 {#data-used-by-this-setup}

OpenSIPS 把用户凭据存放在 `subscriber` 表、把已注册的 Contact 存放在 `location` 表。两个可用用户通过以下命令创建：

```bash
opensips-cli -x user add alice@example.com alicepass
opensips-cli -x user add bob@example.com bobpass
```

在本方案中，FreeSWITCH 不对客户端 SIP 端点做鉴权。完成交接所需的 FreeSWITCH 数据包括：

* `/etc/freeswitch/vars.xml`，用于设置内部 SIP 端口
* `/etc/freeswitch/sip_profiles/internal.xml`，用于设置 Sofia 的 `sip-ip` 与 `ext-sip-ip`
* 放行 `192.0.2.10/32` 的 `domains` ACL 条目
* `/etc/freeswitch/dialplan/public/00_from_opensips.xml`，用于接受来自 OpenSIPS 的呼叫并将其转移到 `default` context
* `/etc/freeswitch/dialplan/default/20_opensips_services.xml`，定义测试呼叫使用的 `9196` 回音服务

可选的目录映射还会增加：

* OpenSIPS `subscriber` 表中的 FreeSWITCH 专用列
* 一个名为 `opensips` 的 ODBC DSN
* FreeSWITCH 脚本目录下的 `opensips_directory.lua`
* `lua.conf.xml` 中的 `mod_lua` 目录 XML 绑定

---

## 参考 {#references}

* OpenSIPS APT 仓库：<https://apt.opensips.org/packages.php>
* FreeSWITCH 发行版：<https://github.com/signalwire/freeswitch/releases>
