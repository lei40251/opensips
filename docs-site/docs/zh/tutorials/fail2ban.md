---
title: "Fail2Ban"
description: "使用 Fail2Ban 封禁反复通过 OpenSIPS SIP 鉴权失败的 IP 地址。"
---

Fail2Ban 可以监视 OpenSIPS 的鉴权日志，并临时封禁反复通过 SIP 鉴权失败的源 IP 地址。下面的配置保持 OpenSIPS 的日志设施不变，而让 Fail2Ban 一侧去适应操作系统所使用的日志与防火墙后端。

## 脚本 {#script}

保持当前 `syslog_facility` 的值不变，例如默认的 `LOG_LOCAL0`。关键在于：当因用户无效或密码无效导致鉴权失败时，记录一个稳定的标记。这两种情况对应 `www_authorize()` 的负返回码 `-1` 和 `-2`。

```opensips
if (is_method("REGISTER")) {
    $var(auth_code) = www_authorize("", "subscriber");

    if ($var(auth_code) == -1 || $var(auth_code) == -2) {
        xlog("L_NOTICE", "FAIL2BAN_AUTH failed auth for $fU@$fd from $si code=$var(auth_code)\n");
    }

    if ($var(auth_code) < 0) {
        www_challenge("", "auth");
        exit;
    }
}
```

下面的 Fail2Ban 规则使用 `$si`，因此被封禁的地址是 OpenSIPS 看到的网络源 IP，而不是 SIP 头域中的值。

## 安装 Fail2Ban {#install-fail2ban}

从操作系统软件仓库安装 Fail2Ban。包名通常是 `fail2ban`，但包管理器因操作系统而异：

```bash
# Debian / Ubuntu
apt install fail2ban

# Fedora / 兼容 RHEL 的发行版
dnf install fail2ban

# openSUSE / SLES
zypper install fail2ban

# Arch Linux
pacman -S fail2ban
```

避免直接编辑 `/etc/fail2ban/jail.conf`。发行版更新可能会替换该文件，因此请将本地配置放在 `/etc/fail2ban/jail.d/*.local`，将过滤器放在 `/etc/fail2ban/filter.d/`。

## 日志来源 {#log-source}

Fail2Ban 既可以读取普通日志文件，也可以读取 systemd journal。请选择与你的主机上 OpenSIPS 日志方式相匹配的一种。

### Syslog 文件 {#syslog-file}

如果你的操作系统将 OpenSIPS 的 syslog 消息写入文件，请将该文件用作 `logpath`。如果希望有专门的 OpenSIPS 日志文件，为你已经使用的 facility 添加一条 rsyslog 规则。例如，当 OpenSIPS 已使用 `LOG_LOCAL0` 时：

```text
# /etc/rsyslog.d/30-opensips.conf
local0.*    /var/log/opensips.log
```

然后重新加载 rsyslog：

```bash
systemctl reload rsyslog
```

在 Fail2Ban 的 jail 中使用生成的文件路径：

```ini
logpath = /var/log/opensips.log
backend = auto
```

### systemd Journal {#systemd-journal}

如果 OpenSIPS 将日志写入 journal，请使用 `systemd` 后端，并且不要为此 jail 设置 `logpath`：

```ini
backend = systemd
journalmatch = SYSLOG_IDENTIFIER=opensips
```

用下面的命令检查你系统上确切的 journal 标识符：

```bash
journalctl -o short-iso -g FAIL2BAN_AUTH
```

## Fail2Ban 过滤器 {#fail2ban-filter}

创建 `/etc/fail2ban/filter.d/opensips.conf`：

```ini
[Definition]
failregex = ^.*FAIL2BAN_AUTH failed auth for \S+ from <ADDR> code=-(?:1|2)\b
ignoreregex =
```

标记字符串使匹配范围保持狭窄，而 `<ADDR>` 让 Fail2Ban 从 OpenSIPS 日志行中提取 IPv4 和 IPv6 源地址。

## Fail2Ban Jail {#fail2ban-jail}

创建 `/etc/fail2ban/jail.d/opensips.local`。下面的示例使用基于文件的日志路径，并使用操作系统选定的 `banaction` 同时封禁 UDP 和 TCP 的 SIP 流量。

```ini
[opensips]
enabled = true
filter = opensips
logpath = /var/log/opensips.log
backend = auto
maxretry = 5
findtime = 10m
bantime = 1h

action = %(banaction)s[actname=opensips-udp, name=opensips-udp, port="5060,5061", protocol=udp]
         %(banaction)s[actname=opensips-tcp, name=opensips-tcp, port="5060,5061", protocol=tcp]
```

对于基于 journal 的部署，将 `logpath` 和 `backend` 替换为：

```ini
backend = systemd
journalmatch = SYSLOG_IDENTIFIER=opensips
```

如果你的发行版默认没有选择正确的防火墙后端，请在 `/etc/fail2ban/jail.d/defaults.local` 中设置它，而不是在 OpenSIPS 的 jail 内硬编码 action：

```ini
[DEFAULT]
# 基于 nftables 的系统
banaction = nftables

# 基于传统 iptables 的系统
# banaction = iptables
```

检查你的软件包在 `/etc/fail2ban/action.d/` 下提供的 action 文件；某些发行版还提供 firewalld 专用的 action。

## 校验并启动 {#validate-and-start}

在启用 jail 之前，用真实的 OpenSIPS 日志行测试过滤器：

```bash
fail2ban-regex /var/log/opensips.log /etc/fail2ban/filter.d/opensips.conf
```

对于基于 journal 的部署：

```bash
fail2ban-regex systemd-journal /etc/fail2ban/filter.d/opensips.conf
```

重启 Fail2Ban 并检查 jail：

```bash
systemctl restart fail2ban
fail2ban-client status opensips
```

要测试完整链路，请制造一次失败的 REGISTER 尝试，并确认该行带着 `FAIL2BAN_AUTH` 标记出现在所选的日志来源中。在 `findtime` 内达到 `maxretry` 次匹配后，Fail2Ban 应在 `opensips` jail 的状态中报告该源 IP。
