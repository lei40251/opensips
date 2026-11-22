---
title: "RADIUS"
description: "RADIUS 是一种客户端/服务器网络协议，提供集中式的鉴权、授权与计费管理，供客户端接入并使用网络服务。"
---

RADIUS 是一种客户端/服务器网络协议，提供集中式的鉴权、授权与计费（AAA）管理。

完成本教程后，你将能够：

* 完成基本的 FreeRADIUS 服务器配置
* 将 OpenSIPS 配置为 RADIUS 客户端
* 在 OpenSIPS 脚本中使用基于 RADIUS 的计费和鉴权
* 在 RADIUS 消息中添加并使用自定义属性
* 使用 `aaa_radius` 发送自定义的鉴权和计费请求

以下示例使用 `radcli` 作为 RADIUS 客户端库。`radcli` 是较新 OpenSIPS 部署的首选库；它与较旧的 `freeradius-client` 和 `radiusclient-ng` 库源码兼容，OpenSIPS 在构建 `aaa_radius` 模块时会优先尝试使用它。

## 安装 RADIUS 服务器 {#installing-the-radius-server}

安装 FreeRADIUS。在基于 Debian 的系统上：

```bash
apt-get update
apt-get install -y freeradius
```

FreeRADIUS 的配置路径因发行版和版本而异。在较新的 Debian 软件包中，这些路径通常位于 `/etc/freeradius/3.0/` 下；较旧的软件包则直接使用 `/etc/freeradius/`。

## 安装 RADIUS 客户端 {#installing-the-radius-client}

安装 `radcli`。如果从源码构建 OpenSIPS，还要在构建 `aaa_radius` 之前安装开发包。

```bash
apt-get install -y radcli libradcli-dev
```

对于无法获得 `radcli` 的较旧系统，`freeradius-client` 和 `radiusclient-ng` 可能仍可用，但本教程中的示例使用 `radcli` 的路径：

```text
/etc/radcli/radiusclient.conf
/etc/radcli/servers
/etc/radcli/dictionary.opensips
```

## 配置 RADIUS 客户端与服务器 {#configuring-the-radius-client-and-server}

### 共用同一份 OpenSIPS 字典 {#share-the-same-opensips-dictionary}

OpenSIPS 的计费和鉴权使用 OpenSIPS 专有的 RADIUS 属性，例如 `Sip-Method`、`Sip-Rpid`、`Sip-Call-Duration` 和 `SIP-AVP`。`radcli` 和 FreeRADIUS 双方都必须认识这些属性。

安装 OpenSIPS 的 `dictionary.opensips`，或将其复制到本地路径，例如：

```bash
cp /usr/share/opensips/dictionary.opensips /etc/radcli/dictionary.opensips
cp /usr/share/opensips/dictionary.opensips /etc/freeradius/3.0/dictionary.opensips
```

如果你的软件包将该文件安装到其他位置，请改用该路径。在源码树中，该文件位于 `etc/dictionary.opensips`。

通过 `/etc/radcli/radiusclient.conf` 让 `radcli` 加载它：

```text
dictionary /etc/radcli/dictionary.opensips
```

让 FreeRADIUS 加载同一份字典。在 Debian 上的 FreeRADIUS 3.x 中，将下面这行添加到 `/etc/freeradius/3.0/dictionary`：

```text
$INCLUDE /etc/freeradius/3.0/dictionary.opensips
```

### 配置共享密钥 {#configure-the-shared-secret}

在 `/etc/radcli/radiusclient.conf` 中配置 RADIUS 服务器：

```text
authserver localhost
acctserver localhost
servers /etc/radcli/servers
```

在 `/etc/radcli/servers` 中配置与之匹配的客户端密钥：

```text
localhost testing123
```

在 FreeRADIUS 中配置相同的密钥。在 FreeRADIUS 3.x 上，该文件通常是 `/etc/freeradius/3.0/clients.conf`：

```text
client localhost {
    ipaddr = 127.0.0.1
    secret = testing123
}
```

### 启用摘要鉴权 {#enable-digest-authentication}

如果希望 FreeRADIUS 处理 SIP 摘要鉴权请求，请启用 `digest` 模块，并确保启用的站点在 `authorize {}` 和 `authenticate {}` 两处都调用它。

在 FreeRADIUS 3.x 中，通常通过将其链接到 `mods-enabled` 来启用该模块：

```bash
ln -s ../mods-available/digest /etc/freeradius/3.0/mods-enabled/digest
```

然后检查启用的站点（通常是 `/etc/freeradius/3.0/sites-available/default`），确保 `digest` 在两段中都存在：

```text
authorize {
    ...
    digest
    ...
}

authenticate {
    ...
    digest
    ...
}
```

### 配置测试用户与应答属性 {#configure-test-users-and-reply-attributes}

FreeRADIUS 3.x 将默认的 "users" 文件内容存放在 `/etc/freeradius/3.0/mods-config/files/authorize`。较旧的软件包使用 `/etc/freeradius/users`。

示例：

```text
testdig Cleartext-Password := "opensips.cfg"
        Reply-Message = "OpenSIPS Rules!",
        SIP-AVP = "sems:ann-account_locked",
        Sip-Rpid = "sip:+407433360111@opensips.org"

DEFAULT Auth-Type := Accept
        Reply-Message = "OpenSIPS Rules!",
        SIP-AVP = "sems:ann-account_locked",
        Sip-Rpid = "sip:+407433360111@opensips.org"
```

这些条目会依次测试，直到找到匹配项。`DEFAULT` 会匹配任何用户，因此应将其放在所有具体用户之后。

## 在脚本中使用 RADIUS {#using-radius-from-the-script}

OpenSIPS 通过其通用 AAA 接口使用 RADIUS：

* `aaa_radius` 提供 RADIUS AAA 后端。
* `acc` 使用 AAA 进行 RADIUS 计费。
* `auth_aaa` 使用 AAA 进行基于 RADIUS 的 SIP 鉴权和授权。

在使用 AAA 后端的模块之前加载 `aaa_radius`：

```opensips
loadmodule "aaa_radius.so"
loadmodule "acc.so"
loadmodule "auth.so"
loadmodule "auth_aaa.so"
```

## 计费 {#accounting}

计费会跟踪 SIP 事务或对话，用于出账、报告或审计。FreeRADIUS 的计费日志通常存放在 `/var/log/freeradius/radacct/` 下。

配置 ACC 使用 RADIUS：

```opensips
modparam("acc", "aaa_url", "radius:/etc/radcli/radiusclient.conf")
modparam("acc", "service_type", 15)
```

`aaa_url` 的值包含 AAA 协议名和 RADIUS 客户端配置路径，两者以 `:` 分隔。

在请求路由中使用 `do_accounting()` 启用计费：

```opensips
if (is_method("INVITE") && !has_totag()) {
    do_accounting("aaa", "cdr|missed|failed");
}
```

仍可使用 `acc_aaa_request()` 显式发送单次计费记录：

```opensips
acc_aaa_request("403 Destination not allowed");
```

### 额外计费属性 {#extra-accounting-attributes}

使用 `extra_fields` 添加额外的 RADIUS 计费属性。对于 AAA 计费，`->` 右侧必须是 RADIUS 字典认识的属性。

例如，将以下本地属性添加到 `radcli` 和 FreeRADIUS 双方都加载的字典中：

```text
ATTRIBUTE Sip-Via      240 string
ATTRIBUTE Sip-Email    241 string
ATTRIBUTE Sip-Bcontact 242 string
```

然后将 OpenSIPS 的计费字段映射到这些属性：

```opensips
modparam("acc", "extra_fields",
    "aaa: via->Sip-Via; email->Sip-Email; bcontact->Sip-Bcontact")

route {
    $acc_extra(via) = $hdr(Via);
    $acc_extra(email) = $avp(email);
    $acc_extra(bcontact) = $ct;
}
```

确保你使用的任何额外属性都同时存在于 `radcli` 和 FreeRADIUS 的字典中。

## 鉴权与授权 {#authentication-and-authorization}

`auth_aaa` 将 SIP 摘要凭据传递给 AAA 后端，并检查 RADIUS 返回的结果。RADIUS 应答中还可能包含 `SIP-AVP` 和 `Sip-Rpid` 等属性。

配置 `auth_aaa` 使用 RADIUS：

```opensips
modparam("auth_aaa", "aaa_url", "radius:/etc/radcli/radiusclient.conf")
```

用法示例：

```opensips
if (!aaa_www_authorize("opensips.org")) {
    www_challenge("opensips.org", "auth");
    exit;
}
```

代理鉴权示例：

```opensips
if (!aaa_proxy_authorize("")) {
    proxy_challenge("", "auth");
    exit;
}

if (!aaa_proxy_authorize($pd, $pU)) {
    proxy_challenge($pd, "auth");
    exit;
}
```

在第二个示例中，realm 和 URI 用户分别取自 `P-Preferred-Identity` 的域与用户伪变量。

## 自定义 RADIUS 查询 {#custom-radius-queries}

`aaa_radius` 模块可以直接从脚本发送自定义的 RADIUS 鉴权和计费请求，并能从鉴权应答中提取指定的属性。

配置 `aaa_radius` 的客户端文件：

```opensips
modparam("aaa_radius", "radius_config", "/etc/radcli/radiusclient.conf")
```

### 自定义 RADIUS 属性 {#custom-radius-attributes}

OpenSIPS 的 RADIUS 客户端与 FreeRADIUS 之间的 RADIUS 字典必须保持一致。对于非厂商专有属性，使用小于 256 的值。对于厂商专有属性，使用标准的厂商专有属性（Vendor-Specific Attribute）封装，并在双方定义相同的厂商名和属性名。

将 OpenSIPS 专有或本地自定义属性添加到双方都加载的字典文件中。例如：

```text
ATTRIBUTE Custom-SIP-Reason 240 string
```

### 定义属性集合 {#defining-attribute-sets}

自定义查询使用命名集合。一个集合将 RADIUS 属性映射到 OpenSIPS 伪变量或 AVP：

```text
set_name = ( Attribute-Name-1 = variable1 [, Attribute-Name-2 = variable2 ]* )
```

左侧必须是 RADIUS 字典认识的属性。右侧必须是 OpenSIPS 变量或 AVP。

示例：

```opensips
modparam("aaa_radius", "sets",
    "auth_in = (User-Name=$var(user), Sip-Group=$var(group), Service-Type=$var(type))")

modparam("aaa_radius", "sets",
    "auth_out = (Reply-Message=$var(reply), Sip-Rpid=$avp(rpid))")
```

### 自定义计费查询 {#custom-accounting-queries}

使用 `radius_send_acct(input_set_name)` 发送自定义计费请求：

```opensips
radius_send_acct("auth_in");
```

计费应答不携带鉴权应答所使用的输出属性，因此只需要一个集合。

### 自定义鉴权查询 {#custom-authentication-queries}

使用 `radius_send_auth(input_set_name, output_set_name)` 发送自定义鉴权请求并获取指定的应答属性：

```opensips
if (radius_send_auth("auth_in", "auth_out")) {
    xlog("RADIUS reply: $var(reply), RPID: $avp(rpid)\n");
}
```

## 相关链接 {#useful-links}

* [FreeRADIUS](https://freeradius.org/)
* [radcli](https://github.com/radcli/radcli)
* [OpenSIPS aaa_radius module](/zh/modules/aaa_radius)
* [OpenSIPS acc module](/zh/modules/acc)
* [OpenSIPS auth_aaa module](/zh/modules/auth_aaa)
* [RFC 2865 - RADIUS](https://www.rfc-editor.org/rfc/rfc2865)
* [RFC 2866 - RADIUS Accounting](https://www.rfc-editor.org/rfc/rfc2866)
