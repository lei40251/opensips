---
title: "呼叫计费"
description: "介绍 OpenSIPS 计费引擎的作用域、事件与后端，并通过示例讲解额外字段与多段计费。"
---

# 呼叫计费 {#call-accounting}

## 概述 {#overview}

SIP 呼叫计费是一项敏感而富有挑战性的任务。OpenSIPS 的灵活性与复杂性，使得理解计费方式的完整细节变得更加必要。本教程讲解有关计费的全部要素与概念，以及如何充分利用 OpenSIPS 提供的强大计费引擎。

诸如**计费事件**（未接通呼叫、失败呼叫）、**计费作用域**（事务、对话）、**计费后端**（数据库、日志、radius）等概念都会得到讲解，并配有完整的脚本示例。更复杂的场景也在覆盖范围之内，包括**额外计费**（扩展 CDR 格式并从整个呼叫中收集信息）与**多段计费**（一次 SIP 呼叫产生多条 CDR 记录）等高级特性。

本教程中的一切内容都有可实际运行、可供剖析的示例作为支撑，以便你更清楚地了解计费的工作方式，以及哪些计费选项最适合你的需求。本教程介绍的大部分特性从 **OpenSIPS 2.3** 起可用。

- - -

## 计费概念 {#accounting-concepts}

### 计费作用域 {#accounting-scopes}

计费可以有不同的作用域，也可以与不同的 SIP 网元保持一致：

* **SIP 消息级计费**：生成的计费记录只覆盖当前正在处理的 SIP 请求；这也称为手动计费，其中 CDR 是在当下通过某个脚本函数生成的，具体取决于所使用的后端，即 [acc_log_request()](/zh/modules/acc#func_acc_log_request)、[acc_db_request()](/zh/modules/acc#func_acc_db_request)、[acc_aaa_request()](/zh/modules/acc#func_acc_aaa_request) 或 [acc_evi_request()](/zh/modules/acc#func_acc_evi_request)；
* **SIP 事务级计费**：生成的计费记录覆盖一个 SIP 事务（SIP 请求及其全部应答的时长与数据）；当 OpenSIPS 作为有状态 SIP 代理时使用这种计费；该计费在请求处理过程中被启动/设置，但计费记录本身会在 SIP 事务（包括其所有分支）完成时才生成；
* **SIP 对话级计费**：生成的计费记录覆盖整个 SIP 呼叫/对话；这种计费记录也称为 CDR（Call Detail Record，呼叫详细记录）。该记录除了事务作用域的计费记录之外，还可以包含对话层面的信息（通话时长、BYE 原因、RTP 统计）；在使用方式上，对话计费是在处理初始 **INVITE** 请求时被启动/设置的；CDR 本身会在 SIP 对话结束时生成（即属于某个对话的所有消息都已处理完毕，包括 BYE 消息的应答）；

综上，如果你进行 SIP 无状态处理，或者需要对某些非常定制的边角场景手动计费，就应当使用 **SIP 消息级计费**。否则，在有状态模式下，对于非 INVITE 流量，**SIP 事务级计费**能给你最好的结果——一条计费记录聚合了所有与事务相关的信息。对于基于 INVITE 的会话，**SIP 对话级计费**是获得可直接使用的 CDR 的最简单、最强大的方式。

### 计费事件 {#accounting-events}

在计费作用域内，OpenSIPS 可以对不同的事件进行计费，例如：

* **成功事件**。此类事件在以下情况下生成计费记录：

  * 在*事务作用域*——事务成功完成时（带有 2xx 应答）：
    ![acc event success](/public/uploads/acc_event_success.png)
  * 在*对话作用域*——呼叫成功建立时：
    ![acc event success dialog](/public/uploads/acc_event_success_dialog.png)
* **未接通呼叫事件**。此类事件只可能发生在对话建立阶段（初始 INVITE 的事务存续期间），即某次呼叫尝试（或分支）因 UAS 侧目的地拒绝或回绝而未建立时；一次 SIP 呼叫可能产生多个此类事件（由于 SIP 分叉）。请注意，产生计费*成功事件*的 SIP 呼叫也可能因为串行或并行分叉中失败的分支（呼叫尝试）而产生一个或多个*未接通呼叫事件*；*未接通呼叫事件*也称为 UAS 侧计费（因为它们与 OpenSIPS 和被叫/UAS 侧之间的关系相关）。
  ![acc event missed](/public/uploads/acc_event_missed.png)
* **事务失败事件**。此类事件只生成于事务作用域，即事务在 OpenSIPS 的 UAC 侧失败（应答码 >=300）时——它是*事务成功*事件的互补事件。
  ![acc event failed](/public/uploads/acc_event_failed.png)

### 计费后端 {#accounting-backends}

进行计费时，你可以在多种引擎之间选择，甚至可以把它们组合使用：

* **log**：计费将通过 syslog 记录到你选择记录的任何位置，既可以是与 OpenSIPS 日志相同的位置，也可以是你选择的任何其他位置；后端
* **db**（数据库）：使用当前 OpenSIPS 中已实现的众多 SQL 后端之一（mysql、postgres、sqlite 等）；
* **aaa**：使用 **aaa** 协议对你的数据计费（可用的有 **radius** 与 **diameter**）；
* **evi**：将通过**事件接口**进行计费；

- - -

## 扩展计费引擎 {#extending-the-accounting-engine}

### 额外计费字段 {#extra-accounting-fields}

该机制允许你通过在计费记录中添加自定义字段来扩展它（数据可以在计费作用域内的任何时候收集）。

**[extra_fields](/zh/modules/acc#param_extra_fields)** 模块参数允许定义一组新字段，追加到计费记录的格式中。在脚本处理过程中，只要你仍处于该计费动作的作用域内，这些字段可以在任何位置、任何时刻被填充。

该机制有一个专用的脚本变量 [`$acc_extra`](/zh/modules/acc#pv_acc_extra)，你可以向它填充任何想要的内容；该 [`$acc_extra`](/zh/modules/acc#pv_acc_extra) 变量在整个计费作用域内都是持久的——例如，如果你做的是基于事务的计费，你可以在请求处理期间、在应答路由中、或在失败路由中的呼叫分叉期间收集数据（这些数据将被写入额外计费字段）。

注意，你需要自行调整后端（数据库或 radius）以容纳额外添加的值！！

### 多段计费 {#multi-leg-accounting}

有些 SIP 场景需要为一次 SIP 呼叫获取多条计费记录。通常发生在实现呼叫重定向或呼叫前转时，实际的 SIP 呼叫由若干呼叫段（SIP 实体之间的逻辑呼叫）组成。

**[leg_fields](/zh/modules/acc#param_leg_fields)** 模块参数定义了一组在各段之间取值不同的新字段（所有其他字段——默认字段与额外计费字段——在所有段中都是相同的）。每一组 *leg_fields* 取值都会转化为该呼叫的一个独立段。

如前所述，当一次 SIP 呼叫在逻辑上存在多个段时，这会很有用——例如 A 呼叫 B，B 把呼叫重定向到 C，这意味着该呼叫有两个段：A 到 B，以及 B 到 C。是否需要创建新段，由脚本编写者通过 [acc_new_leg()](/zh/modules/acc#func_acc_new_leg) 脚本函数决定。用于保存每段字段的变量是 [`$acc_leg`](/zh/modules/acc#pv_acc_leg)——在该段的上下文中，你可以随时为每段字段设置取值。

注意，你需要自行调整后端（数据库或 radius）以容纳额外添加的值！！

- - -

## 示例 {#examples}

### 基本计费 {#basic-accounting}

OpenSIPS 默认配置文件提供了简单的计费支持。我们将以它作为起点，逐步理解和编写越来越复杂的计费场景。

在这个脚本中，我们只想为与呼叫相关的请求获取计费记录——即 INVITE 与 BYE 事务。因此，计费只在事务级进行，并配置了以下计费事件：

* 针对 *INVITE* 事务的*成功事件*
* 针对 *BYE* 事务的*成功事件*与*事务失败事件*——无论 BYE 得到什么应答码，我们都想要一条计费记录。

计费将使用 syslog 后端——其关键字为 **log**。

现在，让我们走一遍 [opensips.cfg](https://github.com/OpenSIPS/opensips/blob/master/modules/acc/samples/opensips.cfg)，逐步解释所有与计费相关的动作。

在脚本的路由部分，使用 [do_accounting()](/zh/modules/acc#do_accounting) 函数来设置计费过程（包括事件、作用域与后端）。所有情况下都使用 **log** 后端，这意味着所有计费记录都会作为日志推送出去。该脚本记录到 syslog 服务，使用日志设施 LOG_DAEMON（参见 [log_facility](/zh/modules/acc#param_log_facility)），日志级别为 L_NOTICE（参见 [log_level](/zh/modules/acc#param_log_level)）。

在*请求路由*中处理 SIP 请求时，处理顺序请求的部分使用 [do_accounting()](/zh/modules/acc#do_accounting) 函数（见第 127 行），为所有 **BYE** 事务在*成功*与*事务失败*（应答码 >= 300）事件上触发计费记录：

```opensips
	if (has_totag()) {

		if ( is_method("ACK") && t_check_trans() ) {
			t_relay();
			exit;
		}

		if ( !loose_route() ) {
			send_reply(404,"Not here");
			exit;
		}

		if (is_method("BYE")) {
			# 即使事务失败也进行计费
			do_accounting("log","failed");
		}

		route(relay);
		exit;
	}


```

下面是 syslog 中计费行大致样子的示例

```text
ACC: transaction answered: timestamp=1474540760;method=BYE;\
  from_tag=2whdajbp4e-dzLdUwo8-coqaNKKh.oSp;to_tag=11562SIPpTag012;\
  call_id=ezUcDyVPC9jgwtk35eamdhmIo31RSScI;code=400;reason=Reason
```

如果没有使用 **failed** 选项，[do_accounting()](/zh/modules/acc#do_accounting) 就不会触发*事务失败*事件，当 BYE 请求超时或被拒绝时（因为事务以 4xx 应答码结束），上面那条记录也就不会生成。

同样在*请求路由*中，处理初始请求时，对于 *INVITE* 请求我们这样做（见第 176 行）：

```opensips
	# 仅对 INVITE 计费
	if (is_method("INVITE")) {
		do_accounting("log");
	}


```

由于没有指定任何标志，事务只会对*成功*事件计费：

```text
ACC: transaction answered: timestamp=1474540997;method=INVITE;\
  from_tag=U49E.iWKOkX1URnBlpKMD.0hM4rIM2U0;to_tag=1173610.0.0.1351;\
  call_id=vonxx1.d4qh9nfPmFBpu46u7Vvq5c8re;code=200;reason=OK
```

脚本中最后一处 [do_accounting()](/zh/modules/acc#do_accounting) 用法（第 213 行）是为发往我们已注册用户的呼叫（INVITE 请求）触发*未接通呼叫事件*。

注意，对于发往本地用户的呼叫，执行流程会两次碰到 [do_accounting](/zh/modules/acc#do_accounting)()。第一次是在创建对话时，用于启用常规计费（针对成功呼叫）；第二次就是这里，只是为了给发往本地用户的呼叫添加*未接通呼叫事件*。因此该函数可能被多次调用，以添加不同的标志。

这里还有一个注意点——我们只为发往本地用户的呼叫做*未接通呼叫事件*——这是一个符合逻辑的决定，我们只关心为自己的用户报告未接通呼叫，而不关心出向呼叫（发往其他 SIP 域）。

```opensips
        # 通过 usrloc 路由时，也记录未接通呼叫
        do_accounting("log","missed");
```

再次说明，这就是我们用于本示例的[完整 OpenSIPS 配置文件](https://github.com/OpenSIPS/opensips/blob/master/modules/acc/samples/opensips.cfg)。

- - -

### 基于 CDR 的计费与串行分叉计费 {#cdr-based-and-serial-forking-accounting}

在这个新示例中，我们扩展前一个脚本提供的计费功能，以额外实现：

* 启用对话级计费，从而获得 CDR（作为计费记录）
* 在 SIP 串行分叉期间启用多个未接通呼叫事件。假设有一个呼叫是打给用户 Alice 的，但 Alice 注册了多个联系地址（通过 SIP 注册），例如 *ContactA*、*ContactB* 与 *ContactC*。串行分叉的顺序应为 *ContactA*、*ContactB*、*ContactC*。也就是说，第一次我们尝试呼叫 *ContactA*，如果 *ContactA* 不应答，就应当尝试 *ContactB*，最后一次尝试应当打给 *ContactC*。最后但同样重要的是，如果呼叫（向任一联系地址）建立成功，该呼叫将被计费。

为实现这一行为，我们对计费函数做了如下修改：

* 在为 *INVITE* 请求设置*成功事件*时增加对话作用域（**cdr** 关键字）
* 由于我们是在对话级计费（直接得到 CDR），就不再需要单独为 BYE 事务计费，因此移除对它们的所有计费
* 在失败路由中也启用*未接通呼叫事件*，这样就能在串行分叉的各个顺序步骤中获得此类事件。

这是与该场景对应的[配置文件](https://github.com/OpenSIPS/opensips/blob/master/modules/acc/samples/opensips-cdrs.cfg)。下面所有解释都相对于该脚本。

首先，为了能够使用 CDR 引擎，需要加载 dialog 模块（我们在这里以尽可能简单的方式完成）：

```opensips
loadmodule "dialog.so"
modparam("dialog", "db_mode", 0)
```

现在，在脚本层面，我们移除了 BYE 事务的 *[do_accounting](/zh/modules/acc#do_accounting)()*（因为计费已在对话级而非事务级进行）——参见顺序请求块第 129 行，那里的计费调用已被去掉。

为了直接得到 CDR 作为计费记录，在对初始 INVITE（它们创建 SIP 呼叫/对话）调用 [do_accounting()](/zh/modules/acc#do_accounting)（第 175 行）时，我们需要通过给标志加上 **cdr** 关键字，把它从事务作用域切换到对话作用域：

```opensips
	# 仅对 INVITE 计费
	if (is_method("INVITE")) {
		do_accounting("log", "cdr");
	}
```

请记住，cdr 标志只影响呼叫（基于 INVITE 的 SIP 对话）。

为启用串行分叉（针对所有已注册的联系地址），在成功查询位置表之后添加了以下代码行。代码会根据联系地址的优先级（Q 参数）对其排序——首先我们把呼叫发往优先级较高的联系地址，若失败（未建立呼叫），则把呼叫串行分叉到优先级较低的下一个联系地址（参见 [serialize_branches()](/zh/manual/Script-CoreFunctions#serialize_branches) 的说明）。这种重新尝试（串行分叉）会一直进行，直到没有剩余的联系地址为止。

```opensips
        serialize_branches(1);
        next_branches();
```

在失败路由中添加了以下代码行：

```opensips
	do_accounting("log","missed");

	if (t_was_cancelled()) {
		exit;
	}

	next_branches();
	# 如果还有剩余分支可供再次尝试，
	# 就重新启用失败路由
	if ($rc != 2) {
		t_on_failure("missed_call");
	}

	t_relay();
```

如果没有再次调用 [do_accounting()](/zh/modules/acc#do_accounting)，那么在失败时只会对第一个未接通呼叫计费。每当一个未接通呼叫被计费后，该标志就会被重置。[next_branches()](/zh/manual/Script-CoreFunctions#next_branches) 函数调用会为我们取得下一个目的地。如果还有可呼叫的联系地址，我们就再次启用失败路由，以便能把呼叫发往下一个目的地。

对于每一个未接受呼叫的目的地，都会生成一个*未接通呼叫*事件：

```text
ACC: call missed: timestamp=1474637733;method=INVITE;\
  from_tag=1931529157;to_tag=;call_id=182969767;code=408;reason=Request Timeout
```

应答码与原因可能因场景而异。如果至少有一个联系地址应答且呼叫建立成功，CDR（作为*成功事件*）会在呼叫结束后生成：

```text
ACC: call ended: created=1474639265;call_start_time=1474639281;\
  duration=5;ms_duration=4250;setuptime=16;method=INVITE;from_tag=1515466979;\
  to_tag=1284910.0.0.1351;call_id=1766189979;code=200;reason=OK
```

在这里，除了每条计费记录都有的基本信息之外，我们还能看到额外字段 **call_start_time**，以及以秒和毫秒表示的**通话时长**。

再次说明，这就是我们用于本示例的[完整 OpenSIPS 配置文件](https://github.com/OpenSIPS/opensips/blob/master/modules/acc/samples/opensips-cdrs.cfg)。

- - -

### 额外字段计费 {#extra-fields-accounting}

有时你可能需要扩展计费能力，在计费记录中（除默认字段之外）添加一些额外的自定义值。这称为*额外计费*——简单说，你定义一些新的计费字段，并设定要放入其中的值。

这是本示例使用的[完整 OpenSIPS 配置文件](https://github.com/OpenSIPS/opensips/blob/master/modules/acc/samples/opensips-extracfg)。

在之前的脚本基础上，我们尝试添加关于呼叫发起与终止所在 IP 地址的额外计费信息。首先，我们需要在 **modparam** 部分使用 [extra_fields](/zh/modules/acc#param_extra_fields) 参数，定义要添加到计费信息中的额外数据

```opensips
   modparam("acc", "extra_fields", "log: src_ip; dst_ip")
```

下面的定义同样有效

```opensips
   modparam("acc", "extra_fields", "log: src_ip->src_ip; src_ip->dst_ip")
```

声明的第一部分是定义额外字段所针对的后端，本例中是 **log** 后端。定义的形式为 **script-tag -> backend-tag**。**script-tag** 是在 OpenSIPS 脚本中引用 [`$acc_extra`](/zh/modules/acc#pv_acc_extra) 变量时要使用的标签，该变量将保存我们所有的额外值。该变量的作用域取决于所使用的计费类型。如果在调用 do_accounting() 时使用了 **cdr** 标志，该变量在整个对话存续期间都可见，否则它的可见范围与事务的可见范围相同。**backend-tag** 是这些值在后端中的存放位置（对 **log** 来说是一个显示标签，对 **db** 来说是一个列名，对 **aaa** 来说是一个 RADIUS/DIAMETER AVP 名称）。

在脚本层面，我们只需用想要的值设置 [`$acc_extra`](/zh/modules/acc#pv_acc_extra) 变量。在当前场景中，我们这样设置 IP：

* 对于呼叫的发起 IP，我们取 INVITE（初始请求）的源 IP，因此在请求路由中处理初始 SIP 请求时，我们这样做（见第 206 行）：

```opensips
        $acc_extra(src_ip) = $si;
```

* 对于呼叫的终止 IP（被叫侧），我们取最终 SIP 应答（>=200）的源 IP，因此在应答路由中处理 SIP 应答时，我们这样做（见第 249 行）：

```opensips
    if ( $rs >= 200 )
        $acc_extra(dst_ip) = $si;
```

当前呼叫的 CDR 将包含我们设置的这些新的额外值

```text
ACC: call ended: created=1474899444;call_start_time=1474899448;\
  duration=5;ms_duration=4762;setuptime=4;method=INVITE;from_tag=1766231375;to_tag=2826210.0.0.1351;\
  call_id=604787970;code=200;reason=OK;src_ip=10.0.0.101;dst_ip=10.0.0.203
```

这里是本示例使用的[完整 OpenSIPS 配置文件](https://github.com/OpenSIPS/opensips/blob/master/modules/acc/samples/opensips-extra.cfg)。

- - -

### 多段计费

有时额外的值并不够用。一个这样的场景是：用户 Alice 呼叫用户 Bob，但 Bob 没有应答，并且他配置了重定向到用户 Charlie。这种情况下我们有两个逻辑段：从 Alice 到 Bob，以及从 Bob 到 Charlie。我们希望为每个段分别获取计费信息。在 OpenSIPS 中，这称为*多段计费*或*按段计费*。

在我们的示例中，我们希望为每个段计费主叫与被叫的用户名（因为两个段的用户名不同）。依据计费后端的不同，使用多段计费时，一条计费记录可能转化为多条后端记录（每段一条）。例如，如果使用 **db** 后端，计费表中每段会有一行（这是因为在 SQL 中表的格式是固定的，无法随段的数目而变化）。

这是本示例使用的[完整 OpenSIPS 配置文件](https://github.com/OpenSIPS/opensips/blob/master/modules/acc/samples/opensips-legs.cfg)。

[leg_fields](/zh/modules/acc#param_leg_fields) 的 modparam 声明与 [extra_fields](/zh/modules/acc#param_extra_fields) 非常相似

```opensips
modparam("acc", "leg_fields", "log: caller; callee")
```

[`$acc_leg`](/zh/modules/acc#pv_acc_leg) 变量也是如此。唯一的区别是该变量可以用段号作为索引。不加索引表示当前段。你还可以用 [`$acc_current_leg`](/zh/modules/acc#pv_acc_current_leg) 变量取得最后一个段的编号。新的额外段可以通过 [acc_new_leg()](/zh/modules/acc#func_acc_new_leg) 函数创建。

在脚本中，所有与 **lookup()** 函数相关的内容都被移入一个路由，以便多次使用。对于初始呼叫，我们从 **From** 头域取得主叫的 URI。被叫的 URI 位于 R-URI 中：

```opensips
      $acc_leg(caller) = $fu;
      $acc_leg(callee) = $ru;
```

如果如上述那样，我们到 Bob 的呼叫段失败，脚本执行将从 *failure_route* 继续，在其中我们会串行分叉到重定向 URI（到 Charlie）。在失败路由中，重定向 URI 的解析方式与第一个 URI 相同，都使用 **lookup** 函数。现在 Bob 到 Charlie 这一段即将开始，因此我们创建一个新段，并为这个新段相应地填充 [`$acc_leg`](/zh/modules/acc#id294672) 变量。主叫 URI 将是上一段的被叫 URI，而被叫 URI 将是新的重定向 URI：

```opensips
    if ( $avp(redirect_uri)!=NULL ) {
        # 设置新的目的地
        $ru = $avp(redirect_uri);

        # 创建一个新的呼叫段
        acc_new_leg();
        # 新的主叫是上一段的被叫
        $acc_leg(caller) = $(acc_leg(callee)[-2]);
        # 新的被叫是新的目的地
        $acc_leg(callee) = $ru;

        t_on_failure("missed_call");
        route(lookup);
        exit;
    }
```

对于一次重定向，我们会得到两行计费。一行是从 Alice 到 Bob 的未接通呼叫

```text
ACC: call missed: timestamp=1474899448;created=1474899444;setuptime=4;method=INVITE;\
  from_tag=1766231375;to_tag=;call_id=604787970;code=408;reason=Request Timeout;\
  src_ip=10.0.0.101;dst_ip=10.0.0.203;caller=Alice;callee=Bob
```

以及 CDR 记录，包含两个段：Alice 到 Bob，和 Bob 到 Charlie：

```text
ACC: call ended: created=1474899444;call_start_time=1474899448;duration=5;ms_duration=4762;\
  setuptime=4;method=INVITE;from_tag=1766231375;to_tag=2826210.0.0.1351;call_id=604787970;code=200;reason=OK;\
  src_ip=10.0.0.101;dst_ip=10.0.0.203;caller=Alice;callee=Bob;caller=Bob;callee=Charlie
```

如果使用 **db** 后端，会生成两行，一行是从 Alice 到 Bob 的段，一行是从 Bob 到 Charlie 的段。非段字段在所有段中都相同：

```text
|   created  | .... |reason|   src_ip   |   dst_ip   | caller | callee  |
| 1474899444 | .... |  OK  | 10.0.0.101 | 10.0.0.203 | Alice  |   Bob   |
| 1474899444 | .... |  OK  | 10.0.0.101 | 10.0.0.203 |  Bob   | Charlie |
```

这里是本示例使用的[完整 OpenSIPS 配置文件](https://github.com/OpenSIPS/opensips/blob/master/modules/acc/samples/opensips-legs.cfg)。
