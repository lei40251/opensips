---
title: "Diameter 鉴权与计费"
description: "如何配合 aaa_diameter、auth_aaa、acc 模块与一个 freeDiameter 对端，配置 OpenSIPS 的 Diameter 鉴权与计费。"
---

## 搭建 freeDiameter {#setting-up-freediameter}

当前的 [*aaa_diameter*](/zh/modules/aaa_diameter) OpenSIPS 模块使用
freeDiameter 库，要求 **libfdcore** 与 **libfdproto** 版本为 **1.2.1 或更高**。
下面的示例使用 Debian/Ubuntu 的包名；如有需要，请按你的发行版调整。

安装 freeDiameter 守护进程、开发头文件以及标准的 freeDiameter 扩展：

```bash
sudo apt install freediameter freediameter-extensions libfreediameter-dev
```

## freeDiameter 客户端 {#freediameter-client}

客户端一侧由 **aaa_diameter** OpenSIPS 模块与 freeDiameter 客户端库共同构成。
本节配置 OpenSIPS 所使用的 freeDiameter 客户端库。

### DNS {#dns}

freeDiameter 的身份标识即 DNS 主机名，因此请确保客户端与服务器名称能够解析。
本教程使用 `diameter.test` realm，并以 `client.diameter.test` 与
`server.diameter.test` 作为对端身份标识。对于单机实验环境，`/etc/hosts` 可以包含：

```text
127.0.0.1 client.diameter.test
127.0.0.1 server.diameter.test
```

如果 Diameter 对端运行在不同的机器上，请使用真实的主机地址。

### 软件包 {#packages}

**aaa_diameter** 模块会动态链接 `libfdcore` 与
`libfdproto`。如果你从 Debian 软件包安装 OpenSIPS，该模块由以下软件包提供：

```bash
sudo apt install opensips-diameter-module
```

如果你从源码构建 OpenSIPS，请在编译 **aaa_diameter** 之前确保已安装
`libfreediameter-dev`。运行时，该模块还需要 freeDiameter 的共享库，在
Debian/Ubuntu 系统上通常打包为 `libfdcore6` 与 `libfdproto6`。

### 创建 TLS 证书 {#creating-tls-certificates}

即使测试对端使用 `No_TLS`，freeDiameter 仍要求在配置文件中提供证书
路径。以下命令会创建一个本地 CA 以及一张对两个教程身份标识都有效的
测试证书：

```bash
sudo install -d -m 0755 /etc/freeDiameter/tls

sudo openssl req -x509 -newkey rsa:2048 -nodes -days 3650 \
  -subj "/CN=diameter.test test CA" \
  -keyout /etc/freeDiameter/tls/ca.key \
  -out /etc/freeDiameter/tls/ca.pem

sudo openssl req -newkey rsa:2048 -nodes \
  -subj "/CN=*.diameter.test" \
  -keyout /etc/freeDiameter/tls/peer.key \
  -out /etc/freeDiameter/tls/peer.csr

printf "subjectAltName=DNS:client.diameter.test,DNS:server.diameter.test\n" | \
  sudo tee /etc/freeDiameter/tls/peer.ext

sudo openssl x509 -req -days 3650 \
  -in /etc/freeDiameter/tls/peer.csr \
  -CA /etc/freeDiameter/tls/ca.pem \
  -CAkey /etc/freeDiameter/tls/ca.key \
  -CAcreateserial \
  -extfile /etc/freeDiameter/tls/peer.ext \
  -out /etc/freeDiameter/tls/peer.pem
```

这些证书仅适用于本地教程环境。

### freeDiameter 客户端配置文件 {#the-freediameter-client-configuration-file}

创建 `/etc/freeDiameter/freeDiameter-client.conf`：

```text
Identity = "client.diameter.test";
Realm = "diameter.test";
Port = 3866;
SecPort = 3867;
No_SCTP;

TLS_Cred = "/etc/freeDiameter/tls/peer.pem",
"/etc/freeDiameter/tls/peer.key";
TLS_CA = "/etc/freeDiameter/tls/ca.pem";

ConnectPeer = "server.diameter.test" {
  No_TLS;
};
```

该配置指示 OpenSIPS/freeDiameter 客户端对端向 `server.diameter.test` 建立一条
TCP 的 Diameter 连接。

## freeDiameter 服务器 {#freediameter-server}

服务器一侧由
[*app_opensips*](https://github.com/OpenSIPS/opensips/tree/master/modules/aaa_diameter/app_opensips)
freeDiameter 应用构成，运行在 freeDiameter 守护进程内部。

### 编译 app_opensips {#compiling-app_opensips}

请使用提供你的守护进程与库的同一份 freeDiameter 源码树来构建该扩展：

```bash
sudo apt install mercurial cmake flex bison gcc make build-essential \
  g++ swig libsctp-dev libgcrypt20-dev libgnutls28-dev libidn2-dev \
  libmariadb-dev libmariadb-dev-compat

cd /path/to/freeDiameter

# 把 app_opensips 目录复制或以符号链接方式放入 freeDiameter 的 extensions/ 目录
cp -r /path/to/opensips/modules/aaa_diameter/app_opensips extensions/app_opensips

# 将 app_opensips 扩展加入编译列表
cat >>extensions/CMakeLists.txt <<EOF
FD_EXTENSION_SUBDIR(app_opensips "OpenSIPS Diameter integration for SIP Authorization, Authentication (RFC 4740) and Accounting" ON)
EOF

mkdir -p fDbuild
cd fDbuild
cmake \
  -DBUILD_TEST_APP:BOOL=ON \
  -DBUILD_DBG_MONITOR:BOOL=ON \
  -DSKIP_TESTS:BOOL=ON \
  -DCMAKE_BUILD_TYPE:STRING=Debug \
  ..

make -j
```

如果构建成功，该扩展模块应出现在 freeDiameter 构建目录下的
`extensions/app_opensips.fdx`。

### DNS {#dns-1}

如果你的 freeDiameter 服务器运行在另一台机器上，请在该主机上同样添加
`client.diameter.test` 与 `server.diameter.test` 这两条 DNS 记录。

### freeDiameter 服务器配置文件 {#the-freediameter-server-configuration-file}

创建 `/etc/freeDiameter/freeDiameter.conf`：

```text
Identity = "server.diameter.test";
Realm = "diameter.test";
Port = 3868;
No_SCTP;

TLS_Cred = "/etc/freeDiameter/tls/peer.pem",
"/etc/freeDiameter/tls/peer.key";
TLS_CA = "/etc/freeDiameter/tls/ca.pem";

# 加载标准 SIP AVP 字典与 app_opensips 模块。
LoadExtension = "/usr/lib/freeDiameter/dict_sip.fdx";
LoadExtension = "/path/to/freeDiameter/fDbuild/extensions/app_opensips.fdx";

# 可选：启动时也主动向 OpenSIPS 发起 Diameter 连接。
ConnectPeer = "client.diameter.test" {
  No_TLS;
  port = 3866;
};
```

`dict_sip.fdx` 的路径可能因发行版而异，请按 freeDiameter 扩展的实际安装位置调整。

测试 **app_opensips** 是否能加载：

```bash
freeDiameterd -dd
```

如果教程中硬编码的数据库连接成功，启动日志中应出现 `dict_sip.fdx`、`app_opensips.fdx` 以及
`[AUTH] connected to MySQL` 消息。

## 配置 {#configuration}

如果你从源码构建，请确认 **aaa_diameter** 能够编译：

```bash
make modules module=aaa_diameter
```

如果使用软件包部署，则改为安装 `opensips-diameter-module`。

### 摘要鉴权 {#digest-authentication}

当前 **app_opensips** 教程服务器代码使用以下连接串连接 MySQL：

```text
mysql://opensips:opensipsrw@localhost/opensips
```

它读取 `subscriber` 表，并期望 HA1 散列值存放在 `ha1` 列中。
请在启动 freeDiameter 之前相应创建 OpenSIPS 数据库。

以下是通过 Diameter 完成 SIP 摘要鉴权所需的 `opensips.cfg` 相关片段：

```opensips
log_stdout = yes # required in order to see the freeDiameter library logs
...
alias = udp:sipdomain.invalid:5060
...
loadmodule "auth.so"

loadmodule "aaa_diameter.so"
modparam("aaa_diameter", "fd_log_level", 0)
modparam("aaa_diameter", "realm", "diameter.test")
modparam("aaa_diameter", "peer_identity", "server")

loadmodule "auth_aaa.so"
modparam("auth_aaa", "aaa_url", "diameter:/etc/freeDiameter/freeDiameter-client.conf")
...
route {
    ...

    if (is_method("INVITE")) {
        ...
        if (!aaa_proxy_authorize("sipdomain.invalid")) {
            proxy_challenge("sipdomain.invalid", "auth");
            exit;
        }
        ...
    }
}
...
```

**aaa_diameter** 模块必须在 **auth_aaa** 之前加载，因为
**auth_aaa** 会通过其 `aaa_url` 参数绑定到所配置的 AAA 协议。

下面是 Wireshark 中一个 Diameter 鉴权请求与一个成功应答的样子：

Diameter 鉴权请求：

![Diameter 鉴权请求](/public/uploads/diameter-auth-request.png)

成功的 Diameter 鉴权应答：

![Diameter 鉴权成功应答](/public/uploads/diameter-auth-reply-success.png)

### 计费 {#accounting}

当前 **app_opensips** 教程服务器会把 CDR 追加写入
`/var/log/freeDiameter/acc.log`，并每日轮转该文件。它还会写入由 OpenSIPS **acc** 模块
生成的 AAA AVP，其中包括由 `cdr` 计费标志位启用的 CDR 字段。

要在 `opensips.cfg` 中启用 Diameter 计费支持，请按如下方式配置相关模块：

```opensips
log_stdout = yes # required in order to see the freeDiameter library logs
...
loadmodule "rr.so"
loadmodule "dialog.so"

loadmodule "aaa_diameter.so"
modparam("aaa_diameter", "fd_log_level", 0)
modparam("aaa_diameter", "realm", "diameter.test")
modparam("aaa_diameter", "peer_identity", "server")

loadmodule "acc.so"
modparam("acc", "aaa_url", "diameter:/etc/freeDiameter/freeDiameter-client.conf")
...
route {
    ...

    if (is_method("INVITE")) {
        ...
        record_route();
        create_dialog();
        do_accounting("aaa", "cdr");
        ...
    }
}
...
```

`cdr` 标志位需要对话支持，因此必须加载 **dialog**，并为首个 INVITE 创建一个对话。
