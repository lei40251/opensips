---
title: "nat_traversal 模块"
description: "nat_traversal 模块为 SIP 信令提供远端 NAT 穿透处理支持。"
sidebar: false
---

## 管理员指南 {#admin-guide}


### 概述 {#overview}


nat_traversal 模块为 SIP 信令提供远端 NAT 穿透处理支持。该模块具备检测 NAT 之后的用户代理、修改 SIP 头域使这些用户代理能在 NAT 之后透明工作，以及向 NAT 之后的用户代理发送保活消息以维持其在网络中可达性的能力。该模块处理位于多级级联 NAT 盒之后的用户代理，与处理位于单级 NAT 之后的用户代理同样容易。


该模块设计用于复杂环境：其中可能有多个 SIP 代理参与注册与路由的处理，进入路径与出去路径未必相同，甚至路由路径可能在连续的对话之间发生变化。


### 保活功能 {#keepalive-functionality}


#### 概述 {#overview-1}


nat_traversal 模块实现了一套非常完善的保活机制，能够应对最复杂的环境与用例，包括存在多个代理的分布式环境。现有的保活方案只向已注册（在其注册过程中）的用户代理发送保活消息，本模块则可以根据多个条件对用户代理进行保活，因此不仅更灵活、更高效，还能在仅依靠保持注册存活这一简单保活实现无法工作的环境与用例中发挥作用。


保活机制的做法是向 NAT 之后的用户代理发送一个 SIP 请求，使该用户代理回送一个应答。目的是让从 NAT 内部发往代理的报文足够频繁，以防 NAT 盒使连接超时。许多 NAT 盒并不认为从 NAT 外部进入内部的报文会重置连接过期定时器，因此要使某个用户代理保持存活，我们需要触发它发出应答。


#### 背景 {#background}


只向已注册用户代理发送保活消息的实现，其主要局限之一是它在网络可达性概念与用户注册概念之间建立了一种人为的关联。注册过程只为入站 INVITE 请求、也就是为入站呼叫建立网络可达性。然而还有其他情形：用户代理在 NAT 之后需要保持其网络可达性，而这些情形与接收入站呼叫毫无关系。其中一种是用户代理要能持续接收其已创建的呈现订阅所产生的 NOTIFY 请求。另一种情形是用户代理即便没有注册，也应能接收其发起对话中的全部消息。在第一种情形下，呈现代理必须注册才能收到其订阅的通知，而且必须全程保持注册有效。在第二种情形下，想发起去话呼叫的用户代理必须注册并在整个呼叫期间保持注册有效，否则可能无法收到后续的对话中消息，包括结束该对话的 BYE。


不仅存在上述这种强制关联——要求用户代理必须注册才能做任何事——而且仅向已注册用户代理发送保活消息的简单保活实现，恰恰因为这种人为关联，在常见情形下也会失效。例如假设有一个用户代理已注册。若在此用户代理发起的去话呼叫过程中它停止了注册，那么在 NAT 绑定过期之后它就无法再收到对话中消息。对于接收其订阅通知的呈现代理，情况同样如此。


在多个代理处理同一域的环境中，问题会更为尖锐。此时一次呼叫的进入路径与出去路径可能完全不同：用户代理可能使用某个代理作为进入网络的入口点完成注册，却使用另一个代理作为网络入口点发起去话呼叫。更有甚者，注册在每次续期时都可能使用不同的代理作为网络入口点，使其除入站呼叫之外的功能变得不稳定、不可靠。仅向已注册用户代理发送保活消息的保活实现，即便要求用户代理在发起呼叫前先注册，也无法保证去话呼叫的对话中消息得以投递。在这种情况下，即使假设用户代理会为去话呼叫选择与上次注册相同的代理，在下一次注册时它也可能（按 DNS 返回）选择另一个代理，从而让进入路径与出去路径失去关联，使出去路径不可用（假定去话呼叫的持续时间长于注册周期）。


这一切都得出一个结论：仅基于向已注册用户代理发送保活消息的保活实现，只能适用于单代理环境，而且只有在其要求用户代理在做其他任何事之前先注册时才可靠，尽管有些操作本不要求用户代理注册。


#### 实现 {#implementation}


为避免上述问题，本实现引入了针对特定条件的网络可达性概念。这样我们就能针对多个相互独立的条件对同一用户代理进行保活，从而规避上面提到的所有问题。


模块将发送保活消息的条件有：


- *注册（Registration）* - 针对已注册的用户代理，以保持其接收入站呼叫的可达性。这是对 REGISTER 请求触发保活的结果。
- *订阅（Subscription）* - 针对已订阅某些事件的呈现代理，以保持其接收回送通知的可达性。这是对 SUBSCRIBE 请求触发保活的结果。
- *对话（Dialogs）* - 针对已发起去话呼叫的用户代理，以保持其接收后续对话中消息的可达性。这是对去话 INVITE 请求触发保活的结果。


一个用户代理的 NAT 入口点可以针对上述一个或多个条件保持存活。即便某个 NAT 端点针对多个条件保持存活，发往该 NAT 端点的保活消息也只有一条。一个 NAT 端点存在多个条件，只意味着基于某一条件的用户代理网络可达性会在该条件成立期间可用，且与其余条件相互独立。当保持某个 NAT 端点存活的所有条件都消失时，该端点将从需要保持存活的 NAT 端点列表中移除。


保活功能的用户接口非常简单。它只包含一个函数 nat_keepalive()，只需对触发网络可达性需求的那些请求调用一次。这些请求是：REGISTER、SUBSCRIBE 和去话 INVITE。此类请求到达后，用户代理便具备了接收回送其他消息的可达性。于是，REGISTER 之后用户代理可以接收回送入站呼叫，SUBSCRIBE 之后可以接收回送通知，去话 INVITE 之后可以接收回送后续的对话中消息，包括结束该对话的 BYE。nat_keepalive() 函数需要在直接收到该用户代理请求的代理上调用（若该代理判定发出请求的用户代理位于 NAT 之后）。该函数需要在请求获得无状态应答或被 t_relay() 中继之前调用。若请求既未获得无状态应答也未被中继，调用 nat_keepalive() 不会有任何效果。


对于存在多个代理的环境，如果对某个请求充当网络入口点的代理并非实际处理该请求的代理，那么 nat_keepalive() 函数需要在充当入口点的代理上调用，然后必须用 t_relay() 把该请求发送给实际处理它的代理。这是必需的，因为保活功能要从无状态应答或 TM 中继的应答中判断：对于触发 nat_keepalive() 调用的那个请求所对应的条件，该 NAT 端点是否需要保持存活。例如假设某网络中的代理 P1 收到来自 NAT 之后某用户代理的 REGISTER。P1 会判定该用户代理位于 NAT 之后，因而需要保活功能，但实际处理该订阅者注册的是另一个代理 P2。此时即使 P1 尚不知道 P2 会给 REGISTER 什么应答（甚至可能是否定应答），也不知道 P2 是否会以任何方式限制建议的过期时间，P1 仍必须调用 nat_keepalive()。于是 P1 先调用 nat_keepalive()，再调用 t_relay()。当 P2 的应答到达时，会触发一个回调，由它判断该请求是否获得肯定应答，若获得则提取注册过期时间，并为该端点针对注册条件在注册过期时间所给定时长内启用保活功能。对于单代理环境，或者 P1 与 P2 为同一代理的情况，则不调用 t_relay()，而是在注册被接受时调用 save_location()。之后发生的流程与上述相同，只是这次由无状态应答回调触发。两种情况下，在收到 REGISTER 时调用 nat_keepalive() 的唯一作用就是触发一些回调，由这些回调根据应答判断主叫端点是否应保持存活。


下面说明 nat_keepalive() 应如何调用，以及它对每个需要保活功能的请求都做了什么（仅当判定发出该请求的用户代理位于 NAT 之后时才应调用该函数）：


- *REGISTER* - 在 save_location() 或
t_relay() 之前调用（取决于收到 REGISTER 的代理是否也处理该订阅者的注册）。它会从 save_location() 生成的无状态应答或 TM 中继的应答中判断注册是否成功及其过期时间。若注册成功，它会按检测到的过期时间将该 NAT 端点标记为针对注册条件保持存活。若在调用 nat_keepalive() 之后 REGISTER 请求被丢弃，或它截获的是否定应答，则不会产生效果，该端点的注册条件不会被激活。
- *SUBSCRIBE* - 在 handle_subscribe()
或 t_relay() 之前调用（取决于收到 SUBSCRIBE 的代理是否也处理该订阅者的订阅）。它会从 handle_subscribe() 生成的无状态应答或 TM 中继的应答中判断订阅是否成功及其过期时间。若订阅成功，它会按检测到的过期时间将该 NAT 端点标记为针对订阅条件保持存活。若在调用 nat_keepalive() 之后 SUBSCRIBE 请求被丢弃，或它截获的是否定应答，则不会产生效果，该端点的订阅条件不会被激活。对收到的每个 SUBSCRIBE 都应调用它，而不只是开启订阅的那些（即不带 to tag 的那些），因为它需要更新（延长）订阅的过期时间。
- *INVITE* - 对对话中的第一个 INVITE，在 t_relay() 之前调用。它会自动为该对话触发对话跟踪，并使用对话回调检测对话状态的变化。一旦对话创建（这发生在调用 t_relay() 时），它就会为主叫的 NAT 端点添加一条带对话条件的保活条目。随后它为该端点保持该条件，直到对话被销毁（终止、失败或过期）。若在调用 nat_keepalive() 之后 INVITE 请求无法被中继，则不会产生效果，该端点的对话条件不会被激活。
此外，开启对话的 INVITE 还会自动为目标端点触发保活功能（如果它们位于 NAT 之后）。做法是检测是否有任一目标端点已存在针对注册条件的保活条目。若有，则向该条目添加对话条件，从而在该对话期间注册过期、或注册被转移到另一代理的情况下仍能保持该端点的可达性。在呼叫建立阶段，若采用并行分叉，被叫可能被添加多条带对话条件的条目，但只有位于 NAT 之后的目标端点会多出对话条件。之后当对话被确认时，只有应答了该呼叫的端点会保持对话条件处于激活状态（若存在），而未应答分支上的所有端点都会移除该条件。这一切自动完成，无需调用任何函数。


综合本节所述要素，可以说 nat_traversal 模块提供了一套灵活高效、易于使用的保活功能。由于只有边界代理发送保活消息，网络流量被降到最低。同样地，代理中的消息处理也被降到最低，因为边界代理自己生成保活消息并以无状态方式发送，而不必中继由注册服务器生成的消息。无论某个端点因多少原因保持存活，对该端点都只发送一条保活消息，这也降低了网络流量。保活消息还分布在保活区间内，避免因同时生成过多消息而使代理过载。nat_traversal 模块在内部维护需要保活的端点的状态，该状态在代理处理消息的过程中构建，因此无需从 usrloc 模块传输任何信息，这同样应能提升其效率。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


以下模块必须在本模块之前加载：


- *sl* 模块 - 若启用了保活。
- *tm* 模块 - 若启用了保活。
- *dialog* 模块 - 若启用了保活
且需要保持 INVITE 对话存活。
- *clusterer* - 仅在启用 "cluster_id"
选项时。


#### 外部库或应用程序 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，必须安装以下库或应用程序：


- *无*。


### 导出的参数 {#exported-parameters}


#### keepalive_interval (integer)


向所有需要保持存活的端点发送保活消息所需的时间间隔（单位为秒）。在该间隔内，每个端点将恰好收到一条保活消息。负值或零将禁用保活功能。


*默认值为 "60"。*


```opensips title="Setting the keepalive_interval parameter"
...
modparam("nat_traversal", "keepalive_interval", 90)
...
        
```


#### keepalive_method (string)


使用哪种 SIP 方法发送保活消息。常用于此目的的方法是 NOTIFY 和 OPTIONS。NOTIFY 从用户代理产生的应答更短，但这些应答几乎全是否定应答。显然几乎没有用户代理理解带 "keep-alive" 事件的 NOTIFY 的目的是保持 NAT 打开，尽管许多用户代理自己也会发送这类 NOTIFY 请求。不过这完全不影响结果，因为目的只是触发 NAT 之后的用户代理做出响应，肯定应答与否定应答关系不大，反正都会被丢弃。另一方面，OPTIONS 方法的肯定应答率高得多，但同时这些肯定应答也大得多，主要是因为 OPTIONS 方法用于告知用户代理的能力，因而包含大量用于指示这些能力的额外头域。许多用户代理还会附带一个含虚假媒体会话的 SDP 消息体，大概是为了指示媒体能力。这一切使得对 OPTIONS 请求的肯定应答比否定应答或对 NOTIFY 请求的应答大 2 到 3 倍。因此所用方法的默认值为 NOTIFY。


*默认值为 "NOTIFY"。*


```opensips title="Setting the keepalive_method parameter"
...
modparam("nat_traversal", "keepalive_method", "OPTIONS")
...
        
```


#### keepalive_from (string)


指示保活请求的 From 头域中使用哪个 SIP URI。若未指定，将使用 sip:keepalive@proxy_ip，其中 proxy_ip 是用于发送保活消息的出接口 IP 地址，该接口与触发保活功能的请求所到达的接口相同。


*默认值为 "sip:keepalive@proxy_ip"，其中 proxy_ip
为出接口的实际 IP。*


```opensips title="Setting the keepalive_from parameter"
...
modparam("nat_traversal", "keepalive_from", "sip:keepalive@my-domain.com")
...
        
```


#### keepalive_extra_headers (string)


指定应添加到代理所发送的保活消息中的额外头域。头域规格必须同时包含 CRLF（\r\n）行分隔符。可以拼接多个头域来指定它们，其中每一个都必须包含 \r\n 分隔符。


*默认值未定义（不发送额外头域）。*


```opensips title="Setting the keepalive_extra_headers parameter"
...
modparam("nat_traversal", "keepalive_extra_headers", "User-Agent: OpenSIPS\r\nX-MyHeader: some_value\r\n")
...
        
```


#### keepalive_state_file (string)


指定一个文件名，用于在 OpenSIPS 退出时保存关于 NAT 端点及其保活条件的信息。OpenSIPS 启动时会使用该文件中的信息恢复内部状态，并继续向在此期间尚未过期的 NAT 端点发送保活消息。重启 OpenSIPS 时这很实用，可避免丢失关于 NAT 端点的保活状态信息。即使 OpenSIPS 崩溃，也保证退出时将内部保活状态保存到该文件中。


该参数的值可以是相对路径（此时将保存在 OpenSIPS 工作目录中），也可以是绝对路径。


*默认值为未定义的 "keepalive_state"。*


```opensips title="Setting the keepalive_state_file parameter"
...
modparam("nat_traversal", "keepalive_state_file", "/run/opensips/keepalive_state")
...
        
```


#### cluster_id (integer) {#cluster_id-integer}


模块所属集群的 ID。nat_traversal 模块使用集群支持来控制 ping 过程。当处于多节点集群中时，各节点可以商定由哪个节点负责 ping。


支持共享标签的集群可用于控制集群中哪个节点对联系人执行 ping/探测。参见
[cluster_sharing_tag](#cluster_sharing_tag-string) 选项。


关于如何定义并填充集群（含 OpenSIPS 节点）的更多信息，参见 "clusterer" 模块。


*默认值为 "0 (none)"。*


```opensips title="Set cluster_id parameter"
...
# Be part of cluster ID 9
modparam("nat_traversal", "cluster_id", 9)
...
```


#### cluster_sharing_tag (string) {#cluster_sharing_tag-string}


共享标签的名称（按 clusterer 模块定义），用于控制哪个节点负责对联系人执行 ping。
若已定义，则只有该标签处于激活状态的节点才会执行 ping。


要使该选项生效，必须定义 [cluster_id](#cluster_id-integer)。


这是可选参数。若未设置，集群中所有节点都会各自执行 ping。


*默认值为 "empty (none)"。*


```opensips title="Set cluster_sharing_tag parameter"
...
# only the node with the active "vip" sharing tag will perform pinging
modparam("nat_traversal", "cluster_id", 9)
modparam("nat_traversal", "cluster_sharing_tag", "vip")
...
```


### 导出的函数 {#exported-functions}


#### client_nat_test(type)


检查客户端是否位于 NAT 之后。执行哪些测试由 type 参数指定，该参数是一个整数，由所要执行的各项测试对应数值之和给出。各项测试对应的数值如下：


- 1 - 检测客户端的 SIP 消息 Contact 字段中是否为私有 IP 地址（按 RFC1918 定义）。
- 2 - 检测客户端联系 OpenSIPS 时使用的地址是否与 Via 字段中的地址不同。该测试同时比较 IP 和端口。
- 4 - 检测客户端的 SIP 消息顶层 Via 字段中是否为私有 IP 地址（按 RFC1918 定义）。
- 8 - 检测客户端联系 OpenSIPS 时使用的地址是否与 Contact 字段中的地址不同。该测试只比较 IP。


例如调用 client_nat_test(3) 将执行测试 1 和测试 2，只要其中至少一项成功就返回 true，否则返回 false。


该函数可用于 REQUEST_ROUTE、ONREPLY_ROUTE、FAILURE_ROUTE、BRANCH_ROUTE。


```opensips title="Using the client_nat_test function"
...
if (client_nat_test(3)) {
    .....
}
...
        
```


#### fix_contact()


将 Contact 头域中的 IP 和端口替换为接收该 SIP 消息的源 IP 和端口。通常在成功调用 client_nat_test(type) 之后调用。


该函数可用于 REQUEST_ROUTE、ONREPLY_ROUTE、BRANCH_ROUTE。


```opensips title="Using the fix_contact function"
...
if (client_nat_test(3)) {
    fix_contact();
}
...
        
```


#### nat_keepalive()


对请求的源地址触发保活功能。调用时它只设置一些内部标志位，这些标志位随后会在生成/收到肯定应答时（针对 REGISTER 和 SUBSCRIBE）或在对话开始/被应答时（针对 INVITE）触发把该端点加入保活列表。
因此，它可以在脚本中较早或较晚调用。唯一条件是：在应答该请求之前、或在将其发送给另一代理之前调用。若请求需要发送给另一代理，则必须使用 t_relay()，以便能通过 TM 或对话回调截获应答。若使用无状态转发，保活功能将无法工作。另外对于去话 INVITE，还应使用 record_route()，以确保保持主叫端点存活的代理留在路径中。对于多代理部署，应始终在边界代理（直接收到来自用户代理的请求的那些代理）上调用该函数。关于该函数的更多细节，参见 *保活功能* 一节的 *实现* 小节。


该函数可用于 REQUEST_ROUTE。


```opensips title="Using the nat_keepalive function"
...
if (($rm=="REGISTER" || $rm=="SUBSCRIBE" ||
    ($rm=="INVITE" && !has_totag())) && client_nat_test(3))
{
    nat_keepalive();
}
...
        
```


### 导出的统计 {#exported-statistics}


#### keepalive_endpoints


指示当前保持存活的 NAT 端点总数。


#### registered_endpoints


指示这些 NAT 端点中有多少个因注册而保持存活。


#### subscribed_endpoints


指示这些 NAT 端点中有多少个因订阅而保持存活。


#### dialog_endpoints


指示这些 NAT 端点中有多少个因参与 INVITE 对话而保持存活。


### 导出的伪变量 {#exported-pseudo-variables}


#### $keepalive.socket(nat_endpoint)


返回用于向给定 NAT 端点 URI 发送消息的本地套接字。套接字的形式为 proto:ip:port。NAT 端点 URI 的形式为：sip:ip:port[;transport=xxx]，若为 UDP 则省略 transport。若所请求的 NAT 端点 URI 因任一条件存在于内部保活表中，则返回其关联的本地套接字，否则返回空值。nat_endpoint 可以是字符串或另一个伪变量。


在多代理环境中把消息中继给某个用户代理时，这可用来恢复发送套接字。设想一个涉及两个代理 P1 和 P2 的例子。某用户代理向 P1 发送 REGISTER 请求完成注册。P1 会调用 nat_keepalive()，但由于它判定应由 P2 实际处理该用户注册，因而会把请求转发给 P2。现在假设 P2 收到针对该用户的一个入站 INVITE。它会判定该注册是经 P1 而来的，从而把请求转发给 P1。P2 还应包含该请求要中继到的 NAT 端点 URI。该信息本应由 P1 在把 REGISTER 请求中继给 P2 时提供。实现这一点的手段超出本例范围，但可以使用 path 扩展或自定义头域。当 P1 收到 INVITE 时，它会用随请求收到的 NAT 端点 URI 确定发送该请求所用的套接字，该套接字应与最初收到注册请求的套接字相同。在下面的例子中，假设 P2 在名为 X-NAT-URI 的自定义头域中提供了原始 NAT 端点地址，并且还提供了名为 X-Scope 的自定义头域，用于指示该消息是发给 P1 的，以便由 P1 中继回用户代理，因为 P1 与该用户代理之间的 NAT 是打开的。


```opensips title="Using $keepalive.socket in multi-proxy environments"
...
# This code runs on P1 which has received an INVITE from P2 to forward
# it to the user agent behind NAT (because P1 has the NAT open with it).
if ($rm=="INVITE" && $hdr(X-Scope)=="nat-relay") {
    $du = $hdr(X-NAT-URI);
    $fs = $keepalive.socket($du);
    t_relay();
    exit;
}
...
        
```


#### $source_uri


返回接收请求的来源 URI 规格，形式为 sip:ip:port[;transport=xxx]，若为 UDP 则省略 transport。


该伪变量可用于为 registrar 模块设置 received AVP，以指示某用户代理位于 NAT 之后。它意在作为 fix_nated_register() 函数更灵活的替代，因为它允许在把来源 URI 保存到 received AVP 之前追加一些额外参数来修改它。


该伪变量的另一个用途是在多代理环境中向下一跳代理指示 NAT 端点 URI（如需要）。设想前面涉及两个代理 P1 和 P2 的例子。P1 收到来自某用户代理的 REGISTER 请求，并将其转发给执行实际注册的 P2。P1 需要向 P2 指示 NAT 端点 URI，以便 P2 之后能针对发往该用户代理的入站 INVITE 请求把它包含进去。


```opensips title="Using $source_uri to set the received AVP on registrars"
...
modparam("registrar", "received_avp", "$avp(received_uri)")
modparam("registrar", "tcp_persistent_flag", 10)
...
# This code runs on the registrar, assuming it has received the
# REGISTER request directly from the user agent.
if ($rm=="REGISTER") {
    if (client_nat_test(3)) {
        if ($socket_in(proto)==UDP) {
            nat_keepalive();
        } else {
            # Keep TCP/TLS connections open until the registration
            # expires, by setting the tcp_persistent_flag
            setflag(10);
        }
        force_rport();
        $avp(received_uri) = $source_uri;
        # or we could add some extra parameters to it if needed
        # $avp(received_uri) = $source_uri + ";relayed=false" 
    }
    if (!www_authorize("", "subscriber")) {
        www_challenge("", "0");
        return;
    } else if ($au!=$tU) {
        sl_send_reply("403", "Username!=To not allowed ($au!=$tU)");
        return;
    }

    if (!save("location")) {
        sl_reply_error();
    }
    exit;
}
...
        
```


```opensips title="Using $source_uri in multi-proxy environments"
...
# This code runs on P1 which received the REGISTER request and has to
# forward it to the registrar P2.
if ($rm=="REGISTER") {
    if (client_nat_test(3)) {
        force_rport();
        nat_keepalive();
        append_hf("X-NAT-URI: $source_uri\r\n");
    }
    $du = "sip:P2_ip:P2_port";
    t_relay();
    exit;
}
...
        
```


#### $nat_traversal.track_dialog


返回一个布尔值（0 或 1），指示 nat_traversal 模块是否会启用对话跟踪。除非另有告知，nat_traversal 模块总是跟踪对话（内部通过调用 create_dialog）。


这是一个高级设置，仅供多代理部署使用，用于某个代理不想跟踪对话的情形，也就是它不会留在信令路径中的情形。


将该 PV 设为 0 后，nat_traversal 模块将不会尝试创建对话。


### 保活使用场景 {#keepalive-use-cases}


#### 单代理环境 {#single-proxy-environments}


这种情况下用法很直接。对 REGISTER 请求需在 save_location() 之前调用 nat_keepalive() 函数，对 SUBSCRIBE 请求需在 handle_subscribe() 之前调用，对对话中的第一个 INVITE 需在 t_relay() 之前调用。


#### 多代理环境中的注册 {#registration-in-multi-proxy-environments}


若收到 REGISTER 请求的代理与处理它的代理相同，则该情形退化为单代理情形。本例中假设它们不同。有一个用户代理 UA1，其注册由代理 P1 处理。但 UA1 把 REGISTER 发给 P0，P0 再把它转发给 P1，即：UA1 --> P0 --> P1。此时 P0 调用 nat_keepalive()，把 NAT 端点 URI 加入请求（例如使用自定义头域），并把请求转发给 P1。P1 会连同 NAT 端点 URI 一起把该用户保存到用户位置中。


当 P1 上收到针对 UA1 的入站 INVITE 请求时，P1 会查询位置信息，判定必须把该请求中继给 P0，因为 P0 与 UA1 之间的 NAT 是打开的。P1 会在请求中包含原始 NAT 端点 URI，并指明 P0 在此事务中唯一的角色就是把它中继给 UA1。P0 会收到该请求并判定自己须为其充当中继。它会提取 NAT 端点 URI，然后基于它用 $keepalive.socket(endpoint_uri) 取得对应的本地套接字。接着它把 $du 和 $fs 都设为所找到的值，调用 record_route() 以留在路径中，并调用 t_relay() 把请求发送给 UA1。


处理到达 P1 上针对 UA1 的其他类型请求（例如 SUBSCRIBE 或 MESSAGE）的方式与处理第一个 INVITE 相同，P1 与 P0 两侧都是如此。


#### 多代理环境中的订阅 {#subscription-in-multi-proxy-environments}


若收到 SUBSCRIBE 请求的代理与处理它的代理相同，则该情形退化为单代理情形。本例中假设它们不同。有一个用户代理 UA1，其订阅由代理 P1 处理。但 UA1 把 SUBSCRIBE 发给 P0，P0 再把它转发给 P1，即：UA1 --> P0 --> P1。此时 P0 调用 nat_keepalive()，然后调用 record_route() 以留在路径中，并用 t_relay() 把请求转发给 P1。后续的 SUBSCRIBE 和 NOTIFY 请求会遵循记录路由，使用 P0 作为 NAT 入口点来访问 UA1。后续的对话中 SUBSCRIBE 请求也应调用 record_route()。


#### 多代理环境中的出站 INVITE {#outgoing-invites-in-multi-proxy-environments}


若收到 INVITE 请求的代理与处理它的代理相同，则该情形退化为单代理情形。本例中假设它们不同。有用户代理 UA1，由代理 P1 处理；以及 UA2，由 P2 处理。UA2 经 P3 向 P2 完成了注册，而 UA1 通过向 P0 发送第一个 INVITE 来呼叫 UA2。第一个 INVITE 的呼叫流程如下：UA1 --> P0 --> P1 --> P2 --> P3 --> UA2。
此时 P0 调用 nat_keepalive()，然后调用 record_route() 以留在路径中，并把请求转发给 P1。P1 对 UA1 进行鉴权，然后把请求转发给 P2，也就是 UA2 的归属代理。P1 不必使用 record_route 留在路径中，但若出于其他目的需要，也可以这么做。P2 会查询 UA2，发现可经 P3 到达它。它会取出 UA2 注册时保存到用户位置中的原始 NAT 端点 URI，把该 URI 加入消息，并指明 P3 只需把消息中继给 UA2。若 P2 做计费或启动媒体中继，它也应调用 record_route() 以留在路径中。然后它用 t_relay() 把请求转发给 P3。P3 会检测到自己只需把请求中继给 UA2，因为它与 UA2 之间的 NAT 是打开的。它会从消息中提取 NAT 端点 URI，并用 $keepalive.socket(endpoint_uri) 取得本地发送套接字，然后把 $du 和 $fs 都设好。之后它调用 record_route() 以留在路径中，并用 t_relay() 把请求转发给 UA2。后续的对话中请求会遵循记录的路由，使用 P0 和 P3 分别作为访问 UA1 和 UA2 的接入点。所有在第一个 INVITE 期间使用过 record_route() 的代理，在后续对话中请求期间也应调用 record_route() 以继续留在路径中。
<!-- CONTRIBUTORS -->

### 许可证 {#license}

所有文档文件（即 .md 扩展名的文件）均按 Creative Common License 4.0 许可发布。
