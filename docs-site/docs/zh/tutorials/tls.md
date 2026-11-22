---
title: "TLS"
description: "TLS 配置有时颇费时间，多因证书生成或使用不当。本教程给出一套可用的 OpenSIPS TLS 配置。"
---

## 简介 {#introduction}

本教程基于 OpenSIPS 4.1 编写。

它展示了一套基础 TLS 配置，可作为更高级部署的可靠起点。内容涵盖证书生成、基于文件的 TLS 域、可选的数据库数据配置以及基础故障排查。

示例使用以下实验环境取值：

```text
OpenSIPS TLS socket: 192.0.2.10:5061
Remote TLS UAS:      198.51.100.20:5061
TLS files:           /etc/opensips/tls
SIP domain:          example.com
```

把它们替换为你自己的地址和域。

## 生成证书 {#generating-certificates}

在配置 OpenSIPS 之前，先创建一个本地 CA 以及至少一个由该 CA 签发的证书。在实验环境中，[`opensips-cli` TLS 模块](https://github.com/OpenSIPS/opensips-cli/blob/master/docs/modules/tls.md)可以直接生成这些文件。

创建 `/etc/opensips-cli.cfg`：

```ini
[default]
tls_ca_dir: /etc/opensips/tls/rootCA
tls_ca_cert_file: cacert.pem
tls_ca_key_file: private/cakey.pem
tls_ca_overwrite: yes
tls_ca_common_name: example.com
tls_ca_country: RO
tls_ca_state: Bucharest
tls_ca_locality: Bucharest
tls_ca_organisation: OpenSIPS
tls_ca_organisational_unit: Project
tls_ca_notafter: 315360000
tls_ca_key_size: 4096
tls_ca_md: SHA256

tls_user_cert_file: cert.pem
tls_user_key_file: privkey.pem
tls_user_calist_file: calist.pem
tls_user_overwrite: yes
tls_user_cacert: /etc/opensips/tls/rootCA/cacert.pem
tls_user_cakey: /etc/opensips/tls/rootCA/private/cakey.pem
tls_user_country: RO
tls_user_state: Bucharest
tls_user_locality: Bucharest
tls_user_organisation: OpenSIPS
tls_user_organisational_unit: Project
tls_user_notafter: 315360000
tls_user_key_size: 4096
tls_user_md: SHA256
```

创建 CA：

```bash
opensips-cli -x tls rootCA
```

创建 OpenSIPS 在入向 TLS 连接上呈现的证书：

```bash
opensips-cli \
    -o tls_user_dir=/etc/opensips/tls/server \
    -o tls_user_common_name=sip.example.com \
    -x tls userCERT
```

为 OpenSIPS 作为 TLS 客户端时呈现的证书单独创建一个：

```bash
opensips-cli \
    -o tls_user_dir=/etc/opensips/tls/client \
    -o tls_user_common_name=client.example.com \
    -x tls userCERT
```

做快速互通测试时，可以使用 OpenSIPS 软件包附带的测试证书，但不要在生产环境中使用它们。

在下面的示例中，`$CERT_DIR` 指 `/etc/opensips/tls`。

## 脚本示例 {#script-example}

### TLS 模块与套接字 {#tls-modules-and-socket}

OpenSIPS 的 TLS 支持由三部分组成：

* `proto_tls`，用于 SIP-over-TLS 传输。
* `tls_mgm`，用于 TLS 域、证书与 TLS 参数。
* 一个 TLS 后端模块，例如 `tls_openssl` 或 `tls_wolfssl`。

在 `tls_mgm` 之前加载 TLS 后端，然后再加载 `proto_tls`：

```opensips
socket=tls:192.0.2.10:5061

loadmodule "tls_openssl.so"
loadmodule "tls_mgm.so"
loadmodule "proto_tls.so"
```

较新的套接字语法是 `socket=proto:ip:port`。较早的示例可能使用 `listen=...`；在改用新风格配置时请更新它们。

### 基于文件的 TLS 域 {#file-based-tls-domains}

示例中有两个 TLS 域：

* `sv_dom`：服务端域，用于到 `192.0.2.10:5061` 的入向 TLS 连接。
* `cl_dom`：客户端域，用于 OpenSIPS 向 `198.51.100.20:5061` 发起 TLS 连接时。

在较新的 OpenSIPS 配置中，`server_domain` 与 `client_domain` 只定义域名。地址匹配通过 `match_ip_address` 单独配置，域范围的取值使用 `[domain]value` 语法。

```opensips
modparam("tls_mgm", "server_domain", "sv_dom")
modparam("tls_mgm", "match_ip_address", "[sv_dom]192.0.2.10:5061")
modparam("tls_mgm", "certificate", "[sv_dom]/etc/opensips/tls/server/cert.pem")
modparam("tls_mgm", "private_key", "[sv_dom]/etc/opensips/tls/server/privkey.pem")
modparam("tls_mgm", "ca_list", "[sv_dom]/etc/opensips/tls/server/calist.pem")
modparam("tls_mgm", "tls_method", "[sv_dom]TLSv1_2-TLSv1_3")
modparam("tls_mgm", "verify_cert", "[sv_dom]0")
modparam("tls_mgm", "require_cert", "[sv_dom]0")

modparam("tls_mgm", "client_domain", "cl_dom")
modparam("tls_mgm", "match_ip_address", "[cl_dom]198.51.100.20:5061")
modparam("tls_mgm", "certificate", "[cl_dom]/etc/opensips/tls/client/cert.pem")
modparam("tls_mgm", "private_key", "[cl_dom]/etc/opensips/tls/client/privkey.pem")
modparam("tls_mgm", "ca_list", "[cl_dom]/etc/opensips/tls/client/calist.pem")
modparam("tls_mgm", "tls_method", "[cl_dom]TLSv1_2-TLSv1_3")
modparam("tls_mgm", "verify_cert", "[cl_dom]0")
modparam("tls_mgm", "require_cert", "[cl_dom]0")
```

这里关闭 `verify_cert` 与 `require_cert` 只是为了让实验环境的握手更简单。在生产环境中，应保持对端校验开启，并配置正确的 CA 链。

### 完整 TLS 片段 {#full-tls-fragment}

下面的片段只包含与 TLS 相关的部分。请把它加入一个加载了常规 SIP 模块的完整 OpenSIPS 路由脚本中。

```opensips
socket=tls:192.0.2.10:5061

loadmodule "tls_openssl.so"
loadmodule "tls_mgm.so"
loadmodule "proto_tls.so"

modparam("tls_mgm", "server_domain", "sv_dom")
modparam("tls_mgm", "match_ip_address", "[sv_dom]192.0.2.10:5061")
modparam("tls_mgm", "certificate", "[sv_dom]/etc/opensips/tls/server/cert.pem")
modparam("tls_mgm", "private_key", "[sv_dom]/etc/opensips/tls/server/privkey.pem")
modparam("tls_mgm", "ca_list", "[sv_dom]/etc/opensips/tls/server/calist.pem")
modparam("tls_mgm", "tls_method", "[sv_dom]TLSv1_2-TLSv1_3")
modparam("tls_mgm", "verify_cert", "[sv_dom]0")
modparam("tls_mgm", "require_cert", "[sv_dom]0")

modparam("tls_mgm", "client_domain", "cl_dom")
modparam("tls_mgm", "match_ip_address", "[cl_dom]198.51.100.20:5061")
modparam("tls_mgm", "certificate", "[cl_dom]/etc/opensips/tls/client/cert.pem")
modparam("tls_mgm", "private_key", "[cl_dom]/etc/opensips/tls/client/privkey.pem")
modparam("tls_mgm", "ca_list", "[cl_dom]/etc/opensips/tls/client/calist.pem")
modparam("tls_mgm", "tls_method", "[cl_dom]TLSv1_2-TLSv1_3")
modparam("tls_mgm", "verify_cert", "[cl_dom]0")
modparam("tls_mgm", "require_cert", "[cl_dom]0")
```

要从脚本通过 TLS 向远端 UAS 发送流量，就把请求中继到 TLS 目的地，例如：

```opensips
route[to_tls_uas] {
    $du = "sip:198.51.100.20:5061;transport=tls";

    if (!t_relay())
        send_reply(500, "Relay failed");
}
```

## 数据库数据配置 {#database-provisioning}

`tls_mgm` 的域也可以从 SQL 配置。当证书在 OpenSIPS 脚本之外管理，或者希望在不编辑配置文件的情况下重载 TLS 域时，这很有用。

创建 OpenSIPS 数据库时带上 `tls_mgm` 表。如果是新建数据库，请在 `database_modules` 中包含 `tls_mgm`，或直接使用 `ALL`：

```ini
[default]
database_admin_url: mysql://root@localhost
database_url: mysql://opensips:opensipsrw@localhost/opensips
database_name: opensips
database_modules: tls_mgm
```

```bash
opensips-cli -x database create
```

如果数据库已存在，只添加 `tls_mgm` 表：

```bash
opensips-cli -x database add tls_mgm
```

加载 SQL 模块并让 `tls_mgm` 指向该数据库：

```opensips
socket=tls:192.0.2.10:5061

loadmodule "db_mysql.so"
loadmodule "tls_openssl.so"
loadmodule "tls_mgm.so"
loadmodule "proto_tls.so"

modparam("tls_mgm", "db_url", "mysql://opensips:opensipsrw@localhost/opensips")
```

在 MySQL/MariaDB 中，证书、私钥、CA 列表与 DH 参数都以 BLOB 值存储。`type` 取值为 `2` 表示服务端域，取值为 `1` 表示客户端域：

```sql
INSERT INTO tls_mgm
    (domain, match_ip_address, match_sip_domain, type, method,
     verify_cert, require_cert, certificate, private_key, ca_list)
VALUES
    ('sv_dom', '192.0.2.10:5061', NULL, 2, 'TLSv1_2-TLSv1_3',
     0, 0,
     LOAD_FILE('/etc/opensips/tls/server/cert.pem'),
     LOAD_FILE('/etc/opensips/tls/server/privkey.pem'),
     LOAD_FILE('/etc/opensips/tls/server/calist.pem')),
    ('cl_dom', '198.51.100.20:5061', NULL, 1, 'TLSv1_2-TLSv1_3',
     0, 0,
     LOAD_FILE('/etc/opensips/tls/client/cert.pem'),
     LOAD_FILE('/etc/opensips/tls/client/privkey.pem'),
     LOAD_FILE('/etc/opensips/tls/client/calist.pem'));
```

`LOAD_FILE()` 要求数据库服务器有权读取这些文件。如果你的数据库通过 `secure_file_priv` 或文件系统权限阻止了这种操作，请改用数据库工具导入 BLOB 值，或者使用基于文件的脚本参数。

修改由数据库配置的域之后，用以下命令重载它们：

```bash
opensips-cli -x mi tls_mgm:reload
```

## 故障排查 {#troubleshooting}

### 检查 TLS 套接字 {#check-the-tls-socket}

OpenSIPS 启动后，确认它正在 TLS 套接字上监听：

```bash
ss -ltnp | grep 5061
```

### 用 OpenSSL 测试 {#test-with-openssl}

使用 `openssl s_client` 验证握手：

```bash
openssl s_client \
    -showcerts \
    -connect 192.0.2.10:5061 \
    -servername sip.example.com
```

对双向 TLS 测试，还要提供客户端证书与 CA：

```bash
openssl s_client \
    -showcerts \
    -connect 192.0.2.10:5061 \
    -servername sip.example.com \
    -cert /etc/opensips/tls/client/cert.pem \
    -key /etc/opensips/tls/client/privkey.pem \
    -CAfile /etc/opensips/tls/client/calist.pem
```

### 查看已加载的 TLS 域 {#inspect-loaded-tls-domains}

使用 `tls_mgm:list` MI 命令查看 OpenSIPS 已加载的域：

```bash
opensips-cli -x mi tls_mgm:list
```

检查 `sv_dom` 是服务端域、`cl_dom` 是客户端域，并确认匹配地址是预期的 `ip:port` 值。

### Wireshark 抓包分析 {#wireshark-tracing}

Wireshark 可以检查 TLS 握手，并且在抓包使用较早的 RSA 密钥交换时，只要持有私钥就能解密流量。现代 TLS 部署通常使用前向保密的密钥交换，因此解密报文可能需要 TLS 端点提供的密钥日志材料，而不仅是私钥。

调试握手时，按 OpenSIPS 的 TLS 套接字过滤：

```text
tcp.port == 5061
```

## 旧版 2.1 示例 {#legacy-21-example}

OpenSIPS 2.1 把 TLS 证书与域参数放在 `proto_tls` 下。它不支持基于数据库的 TLS 配置，因此证书与域必须在脚本中直接定义。

下面的示例仅作为迁移参考保留。对于较新的 OpenSIPS 版本，请使用上面展示的 `tls_openssl`/`tls_wolfssl` + `tls_mgm` + `proto_tls` 组合方式。

```opensips
# OpenSIPS 2.1 旧语法
listen=tls:<your-ip-address>:<port>

loadmodule "proto_tls.so"

modparam("proto_tls", "verify_cert", "0")
modparam("proto_tls", "require_cert", "0")
modparam("proto_tls", "tls_method", "TLSv1")

modparam("proto_tls", "certificate", "$CERT_DIR/rootCA/cacert.pem")
modparam("proto_tls", "private_key", "$CERT_DIR/rootCA/private/cakey.pem")
modparam("proto_tls", "ca_list", "$CERT_DIR/rootCA/cacert.pem")
modparam("proto_tls", "ca_dir", "$CERT_DIR/rootCA/")

modparam("proto_tls", "server_domain", "sv_dom=<your-ip-address>:<port>")
modparam("proto_tls", "certificate", "sv_dom:$CERT_DIR/rootCA/cacert.pem")
modparam("proto_tls", "private_key", "sv_dom:$CERT_DIR/rootCA/private/cakey.pem")
modparam("proto_tls", "ca_list", "sv_dom:$CERT_DIR/rootCA/cacert.pem")

modparam("proto_tls", "client_domain", "cl_dom=<UAS-ip-address>:<port>")
modparam("proto_tls", "certificate", "cl_dom:$CERT_DIR/user/user-cert.pem")
modparam("proto_tls", "private_key", "cl_dom:$CERT_DIR/user/user-privkey.pem")
modparam("proto_tls", "ca_list", "cl_dom:$CERT_DIR/user/user-calist.pem")
```

把该片段迁移到较新版本时：

* 把 TLS 域设置从 `proto_tls` 移到 `tls_mgm`。
* 在 `tls_mgm` 之前加载一个 TLS 后端模块。
* 把 `listen=tls:...` 的示例替换为 `socket=tls:...`。
* 把 `sv_dom:path` 形式的取值替换为 `[sv_dom]path`。
* 用 `server_domain` / `client_domain` 定义域名，再用 `match_ip_address` 匹配地址。
