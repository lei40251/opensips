---
title: "脚本标志位"
---

## 什么是标志位？

标志位是一个 TRUE 或 FALSE 的实体。每种类型（见下文）各有 32 个标志位。标志位通过其名称来标识 —— 同样，不同名称/标志位的数量不能超过 32 个。无需声明或定义标志位的名称，直接使用即可。
标志位可用于任何目的，没有任何预定义用途。

## 标志位的类型

* **消息标志位**（或事务标志位）这些标志位附加在当前 SIP 消息或当前事务（如果存在事务）上。因此这些标志位在事务内是持久的。凡是事务或 SIP 消息上下文可见的路由和场合，它们都可见。
* **分支标志位** 这些标志位也位于事务级别，但按 SIP 分支划分 —— 是的，每个 SIP 分支都有自己的一组标志位。每次处于特定 SIP 分支的上下文中时（例如在 `branch_route` 或 `reply_route` 中），看到的就是与之匹配的分支标志位。这些标志位可以从脚本层面操作，也可以由各种模块函数操作（例如 usrloc 为每个注册联系地址保存分支标志位）。

---

## 脚本标志位函数

有一批函数可帮助在脚本层面操作标志位 —— 设置、重置和检查。

### 消息/事务标志位

* [`setflag`](Script-CoreFunctions.md#setflag-flag)`(FLAG)`
* [`resetflag`](Script-CoreFunctions.md#resetflag-flag)`(FLAG)`
* [`isflagset`](Script-CoreFunctions.md#isflagset-string)`(FLAG)`

*示例：setflag(accounting)、resetflag(DO_NAT) 或 setflag(1942)*

### 分支标志位

* [`setbflag`](Script-CoreFunctions.md#setbflag-flag-branch-idx)`(FLAG, branch_idx)`
* [`resetbflag`](Script-CoreFunctions.md#resetbflag-flag-branch-idx)`(FLAG, branch_idx)`
* [`isbflagset`](Script-CoreFunctions.md#isbflagset-flag-branch-idx)`(FLAG, branch_idx)`

  

或者使用更简短的形式，作用于默认（分支 0）标志位：

* [`setbflag`](Script-CoreFunctions.md#setbflag-flag-branch-idx)`(FLAG)`
* [`resetbflag`](Script-CoreFunctions.md#resetbflag-flag-branch-idx)`(FLAG)`
* [`isbflagset`](Script-CoreFunctions.md#isbflagset-flag-branch-idx)`(FLAG)`

---

## 标志位相关变量

### 消息/事务标志位

* [`$msg.flag(name)`](Script-CoreVar.md#message-flag---msgflag) - 读取/写入某个消息标志位

* [`$mf`](Script-CoreVar.md#message-flags---mf) - 只读；输出所有已设置标志位的列表


### 分支标志位

* [`$msg.branch.flag(name)`](Script-CoreVar.md#a-flag-of-a-message-branch---msgbranchflag) - 读取/写入某个分支标志位

* [`$msg.branch.flags`](Script-CoreVar.md#flags-of-a-message-branch---msgbranchflags) - 只读；返回所有已设置分支标志位的列表

---

## 标志位与路由

### 消息/事务标志位

这些标志位会在处理与初始请求相关消息的所有路由中显示。因此，它们在 `onbranch`、`failure` 和 `onreply` 路由中可见且可更改；在所有 `branch` 路由中这些标志位都可见；如果在某个 `branch` 路由中修改了标志位，后续的 `branch` 路由将继承该修改。

### 分支标志位

这些标志位会在处理与初始分支请求相关消息的所有路由中显示。因此，在 `branch` 路由中你会看到不同的标志位集合（因为它们属于不同分支）；在 `onreply` 路由中你会看到与该应答所属分支对应的分支标志位；在 `failure` 路由中，可以看到与获胜应答所属分支对应的分支标志位。
在 `request` 路由中，可能有多个分支（例如 `lookup()` 的结果），但至少有一个。始终存在默认分支，索引为 0，对应 RURI。任何额外的分支索引从 1 开始向上递增。

---

## 示例

### NAT 标志位处理

```opensips

 ..........
 modparam("usrloc", "nat_bflag", "NAT_BFLAG")
 ..........
 
 route {
   ..........
   if (nat detected)
      setbflag(NAT_BFLAG); # 为分支 0 设置分支标志位 "NAT_BFLAG"

   ..........
   if (is_method("REGISTER")) {
      # 分支标志位（包括 "NAT_BFLAG"）将被保存到 location
      save("location");
      exit;
   } else {
      # lookup 将从 location 加载分支标志位
      if (!lookup("location")) {
         sl_send_reply(404,"Not Found");
         exit;
      }
      t_on_branch("handle_branch")
      t_relay();
   }
 }
 
 branch_route[handle_branch] {
   xlog("-------branch=$T_branch_idx, branch flags=$bf\n");
   if (isbflagset(NAT_BFLAG)) {
      # 当前分支被标记为经过 NAT
      .........
   }
 }

```

如果没有进行并行分叉，可以去掉分支路由，改为在 t_on_branch() 的位置添加：
```text

   ........
   if (isbflagset(NAT_BFLAG)) {
      # 当前分支被标记为经过 NAT
      .........
   }
   ......... 

```
