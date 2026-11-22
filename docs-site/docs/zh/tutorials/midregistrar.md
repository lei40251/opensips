---
title: "中间注册服务器"
description: "在现有 SIP PBX 或注册服务器之前配置一台中间注册服务器。"
---

## 教程概述 {#tutorial-overview}

本教程将教你如何在一台现有 SIP PBX 或注册服务器之前配置 OpenSIPS 中间注册服务器（mid-registrar）。我们将把这个新组件配置为接管现有服务器的大部分 SIP 注册以及全部呼叫分叉。这样就能利用现有基础设施继续增长（无论是用户规模还是注册流量），同时保留当前资源占用较低的注册服务器。

### 中间注册服务器如何工作？ {#how-does-the-mid-registrar-work}

OpenSIPS 中间注册服务器能够限制流经它、发往主注册服务器的 SIP 注册数量。其做法是配置中间注册服务器在出方向上延长 SIP Contact 的生命周期。随后，中间注册服务器会在内部同时跟踪入向和出向的过期值，以便在需要时自动向那个被延长了有效期的下游联系人发送 De-REGISTER 注销，确保两侧的 SIP 信令正确。


该模块还可以代表下游 SIP 元素处理 *SIP 呼叫分叉*。借助中间注册服务器，串行分叉和并行分叉都可以实现，从而有可能为现有注册服务器释放更多资源。这反过来又能让你以最少的软件成本、额外硬件或对现有组件的配置调整来扩大用户群。

#### 场景 {#scenario}

![mid registrar platform before](/public/uploads/mid-registrar-platform-before.png)



这是我们最初的示例 VoIP 平台。其服务由一层多用途服务器提供（在图中表示为 **main registrar** 方框）。举几个当前平台的服务：会议、呼叫截取和互联网消息（IM）。目前，平台服务器在处理约 50,000 个移动设备用户时似乎达到使用峰值。



我们的任务是找到一种方案，将平台扩展到 500,000 个用户。我们首先评估平台所处理的 VoIP 流量类型，结果得出了一个有趣的结论：打到服务器上的流量中 **80%+** 都是 REGISTER 请求！这是真的吗？嗯，很可能如此，因为移动设备的注册有效期很短（60 秒）。有了这个结论，我们就发现了一个潜在瓶颈：注册流量的处理！



经过几个阶段的测试，我们后来发现，在当前系统上处理注册相当昂贵，这立刻使它成为瓶颈。解决这个问题的一个低成本方案是在平台中集成 OpenSIPS 中间注册服务器，因为它能够将入向的高速率注册流量（移动用户到中间注册服务器）转换为低速率的变体（中间注册服务器到主注册服务器）。它的主要工作包括吸收大部分注册流量，以及处理并行分叉。



通过为服务器增加这个低成本的中间注册服务器流量转换前端，我们将降低它们的入向注册速率。这反过来会释放大量平台资源，使其能将资源转向服务更多用户。最终架构将类似于下图：



![mid registrar platform after](/public/uploads/mid-registrar-platform-after.png)

#### OpenSIPS 脚本 {#opensips-script}

下面，我们将分两步为默认 OpenSIPS 脚本扩展中间注册服务器能力。这样做实际上会经历该模块的两种工作模式：*Contact Throttling* 与 *AOR Throttling*。

##### 对注册进行限流 {#throttling-registrations}

首先，我们将配置中间注册服务器大幅提高出向 Contact 的过期值。这样做之后，它会在内部同时跟踪初始过期值和延长后的过期值，以决定是否应将 REGISTER 转发给主注册服务器。

##### 模块配置 {#module-configuration}

```opensips

loadmodule "mid_registrar.so"
modparam("mid_registrar", "mode", 1) /* 0 = mirror / 1 = ct / 2 = AoR */
modparam("mid_registrar", "outgoing_expires", 7200)
modparam("mid_registrar", "contact_id_param", "ctid")

```



我们首先加载 *mid_registrar* 模块并设置其参数。逐个说明各参数：

* *"mode"* - 模块的工作模式。此处 *"1"* 表示 "Contact throttling"（按 Contact 限流），模块将减少发送给主注册服务器的注册流量
* *"outgoing_expires"* - 中间注册服务器转发给主注册服务器的联系人过期时间的默认值。*mid_registrar_save()* 函数也有一个类似的可选参数，用于更精细的控制。
* *"contact_id_param"* - 仅在 "mirroring"（镜像）或 "contact throttling"（按 Contact 限流）模式下才相关。指定 Contact URI 参数的名称，模块用它来匹配联系人并路由 SIP 请求。

##### REGISTER 处理 {#register-handling}

```opensips

    if (is_method("REGISTER")) {
        mid_registrar_save("location");
        switch ($retcode) {
        case 1:
            xlog("forwarding REGISTER to main registrar ($$ci=$ci)\n");
            $ru = "sip:10.0.0.3:5070";
            t_relay();
            break;
        case 2:
            xlog("absorbing REGISTER! ($$ci=$ci)\n");
            break;
        default:
            xlog("failed to save registration! ($$ci=$ci)\n");
        }

        exit;
    }

```



对所有注册请求，我们都确保调用 *mid_registrar_save()*。如其[文档](/zh/modules/mid_registrar)所述，它不会立即处理联系人，而是在 REGISTER 请求被转发给主注册服务器之前做必要的修改，同时准备好透明地处理它的应答。无论模块处于何种工作模式或插入模式，上面的代码都保持不变。至此，REGISTER 请求处理就完成了！

##### INVITE 处理 {#invite-handling}

接下来，我们处理呼叫或即时消息期间的 Contact 查找：



```opensips

    # 来自主注册服务器的初始请求，需要查找它们！
    if (is_method("INVITE|MESSAGE") && $si == "10.0.0.3" && $sp == 5070) {
        xlog("looking up $ru!\n");
        if (!mid_registrar_lookup("location")) {
            t_reply("404", "Not Found");
            exit;
        }

        t_relay();

        exit;
    }

```



Contact 查找与原生 OpenSIPS 脚本几乎相同。唯一大的区别是我们使用 *mid_registrar_lookup()* 而不是 *lookup()*。注意，*mid_registrar_lookup()* 的行为取决于插入模式和工作模式。在我们的场景中，由于模块处于 *"mode = 1"* 工作模式，它只会填充 Request-URI 变量（参见 [`$ru`](/zh/manual/Script-CoreVar)）。

##### 呼叫流程（按 Contact 限流注册） {#call-flow-throttling-registrations-by-contact}

下图展示了同一用户的两台设备（**A** 和 **B**）定期向平台注册。在 *"Contact throttling"* 模式下，主注册服务器会被告知中间注册服务器上每个 SIP 联系人的存在。收到呼叫时，中间注册服务器只需将其转发给该用户。



![mid registrar contact throttling](/public/uploads/mid-registrar-contact-throttling.png)



注意 Alice 的每台设备如何先向两个注册服务器都注册，之后后续的注册则在中间注册服务器层面被吸收。

##### 并行分叉支持 {#parallel-forking-support}

中间注册服务器还可以接管全部呼叫分叉职责。要启用这一点，只需将其切换到 *"mode = 2"*（AOR 限流）。

##### 模块配置 {#module-configuration-1}

```opensips

loadmodule "mid_registrar.so"
modparam("mid_registrar", "mode", 2) /* 0 = mirror / 1 = ct / 2 = AoR */
modparam("mid_registrar", "outgoing_expires", 7200)
modparam("mid_registrar", "at_escape_str", "%40")

```



补充说明：

* *"mode"* - 模块的工作模式。此处 *"2"* 表示 "AOR throttling"（按 AOR 限流），模块既会减少发送给主注册服务器的注册流量，又会在向其转发注册时把多个联系人聚合为单个联系人。后者使它能够进行并行分叉。
* *"at_escape_str"* - 仅在 "AoR throttling" 模式且启用了 usrloc 的 use_domain 设置时才相关。该字符串表示 "@" 字符的转义序列，中间注册服务器生成的 Contact URI 用户名必须以某种方式包含它。



虽然脚本的其余部分保持不变，但 *mid_registrar_save()* 和 *mid_registrar_lookup()* 函数的行为会有所不同。例如，保存联系人时，REGISTER 请求的所有 Contact 头域会被聚合为一个。查找联系人时，整个分支集合都会被填充（参见 [`$branch`](/zh/manual/Script-CoreVar)），从而为并行分叉呼叫做好准备。

##### 呼叫流程（按 AOR 限流注册） {#call-flow-throttling-registrations-by-aor}

![mid registrar aor throttling](/public/uploads/mid-registrar-aor-throttling.png)



在 *AOR throttling* 模式下，中间注册服务器在向主注册服务器转发注册时，会将 Alice 的两个联系人（**A** 和 **B**）聚合为单个联系人（**alice@mid-registrar**）。

##### 呼叫流程（并行分叉） {#call-flow-parallel-forking}

![mid registrar parallel forking](/public/uploads/mid-registrar-parallel-forking.png)



该呼叫流程展示了中间注册服务器的 *"AOR throttling"* 模式如何使其接管全部呼叫分叉职责，从而为主注册服务器释放更多资源。

#### SIP 鉴权 {#sip-authentication}

用户鉴权是任何实际 VoIP 服务的强制要求，因此我们假设我们的平台也已启用。然而，这样做需要额外的配置，中间注册服务器才能正常工作。我们必须在主注册服务器上*将中间注册服务器的 IP 地址加入白名单*，从而对它可能生成的所有请求跳过 SIP 鉴权。



对此的解释是：在工作模式 *"1"* 和 *"2"* 下，中间注册服务器可能会*生成* De-REGISTER 请求，以避免主注册服务器上残留过期的注册记录。问题在于，默认情况下它无法向主注册服务器完成自身鉴权，因为它没有被配置任何凭据，因此应简单地在主注册服务器上将中间注册服务器的 IP 地址加入白名单，以便这些注销请求能够正常通过。

#### 下载 {#downloads}

本教程使用的完整脚本可[在此获取](https://topaz.github.io/paste/#XQAAAQAcFQAAAAAAAAARgoCSziuRo3MPud4NsTM/ouePakqy8IN1GfmpmX2sp7+yhDZNxt/Ep6D0jU35GZWFxNVdBu9nPIryszq42nJmyPS7U4kVWTpiJVIjDsA88KD8/zjLB0GHQ7dAx908r8+lfbkKfSmeHCZiBChdlu0CKnwvWHmF6EL1oLWksryGH0FkfypxSyFSL56jvMrGp9LU3ZhPYKsFMQA+/qc5n/aXa1XVBGOM03OQUoeZ/MS+deEynGyG/z4QwroA0ce6ur5HAjck7cvLyToTtG6Qvpx2uorF3m9qhcJUxrg4nS+KFXY+ASOni2oAWk4qLsmOIvwBv9AFNHjmmwLUXiRqbM8WRB3UgY6xYEnzqDj5AvsDl3L/MN9nexOTx/HJI3WZeFvEN9Zk2D0+gUmv71QhumJS7mjDVUcywt2O4VSN0Wl+9vRVOATBsDCM/xLeARaGMCb5k8JKAQqr5mKDleDMZZe1t+zvm7w6O+BnvkAfd/6C7Xt/pBbZqJS8hpsXtriJh4ZlbZIlz9e1WOrayHncHhbqFmxaa7sEcd6kVYJ7BiT/qtY1znGBlhVTdZMbqYaKtAX4f6vodK1y8QVoJQB0pvPRN/g3CLzh7krSQRJG/z+zga2WQLukevTLiUEkpNMyxNYebn3tSd3F4yq4fYO0N3qaQuZEOshFQNdX9Sx5ScpJLVcIYGisIG9r0QLn6Gh//yEdnIwo3egQceLcLxMZGd2rsFCj6lX1tH4AevBO7k+X4pLEubZS/dsKEEAhjg6InybsbW4bJoPA8m2nyf1HtmvShJyHb7CQyrfWJvlpg0x/IHKe9+N2Yx+2hQfH5UUKqZBmj0MlGCvTHBxxHS3XqdCHHFHipScK/pndLejYmbvWYbLv9r6SJFa8hQCqNZuXuZHnuKHqlBGLumbk4TJ3IRoYtUpgdsVZHOZCGRHtjv7gRUu2NS2SMm39YlpuR/wGgIRbHJvezITmvxqMXcdy5ZWL6LjsYoNEMystnE+lr/wSy3J0BwqdcHvN1lSvb5mU/srfsIJ+pIeXt/B23N0MU3akqgZ1SNgAdaldgFlk9ti2o69q6ab8qlMgXg+SaKZybT0e/YyQ5JQrf44bIdZaCozPZXqkzf7D0voGFD9s/x4KAYEuduew9/uYwQhMsgx7XfaqbbivyaPX31jXWrR2jF28J7l2nH1iD6H9NUuPqzqA6uGTTFPt8+s1nj0tC9YR/JkyK/7Ukdv/Sok9NSxH/nEe9mAze5JpSRD8NLP5HW2qF+rkKncM6j0z1QObYthmJbnPwMx6h3nUjvnSwvTOTfsPl9hLnt/qRblnOcOFVNcbktlwqZAxkuQYp1kGvmBC3ImtpIMpcyKrYz/nLphnwA0hkbsuRsXPE2ONznmxV6ujvMEiOB9jipZlIlsnXN0vnqA1vs8Fgdwdii7ZaL/QqVppurZBOja5mr8vivTkPl4Rn5XpKHyEF7pGEgbEWf9yvtkDKUwZPDLjPbx6UWg4ovRyP/IPHyK7XfhO2Ivft67VYW1ujjKrpp5xr5ByzaLw1WDF1q6M9klsoFXgXRKx7JdwtegcvggjBAnVSAUdDyYQU8fFnj5MgknmD+Q6LOMefX8sExNSgv8iZZgQjO4chB350r6WnTUs4giKwS63V62aZuTpf02/wsYPyPaBPyPXWqLu2oggRuJ3R44PuOARi2we6uxTJB8SlwY4xHXG12nVAgnNfGNKtBqhmhNXOGGNvxPn46SqYYavR4v7OS3vu8BBR2qH1oyjyRveV8TKR0EwU7KXMg1tLQ+RHW+U9FC5bOpvSuhJIqYzAdBxUlL9HpzEmGmO3S+YyGI//vBB+LyRCU4xlZO31GLmcnemXghmuI1hv13f/dlyU3jxIa1PvJ4Vj5Wktb39NupZOgeU0CrENBrMGaremGKEBa9lvUAEne3lACzInlpZxXX5jY3nXpWTFzYxKIokVrsj8/HWXsGEQANe9/W9S48PlyQ/C7fKxZ8QqwZWPWnmPtgQQ2A8KvJDPTrB0Tk4nFSqjkg7DUxJIoDbjZtvTaxMQ51xey7/rzapcFu5gR8JF44nBiOTi/1+wqDbbri+YbCoLXbIBiH8FKMztECRTIL9VK/QTmHs6Uzfe7Z3A1suvP3k00EWEdhh5+edF/Zshkv7hezZI1qFfV6kmuTwVZvCE4mGH/8qn4hzKtkwxK6k0YfdGXV4RYdKGIhnxrpFCQH4P2aoeQB8GUROzOavOzs1xu8kshg0+H1OG1NInMfnYEu6FlEBRW5w7hcW4/yYMSiKp0V6fXdDgndbble21mbKAx/RHR5DbNBJ5JIJo5Vp5YTJB3/paKLPk6l7xgAeQRnhM2KY7frp+jdQxIpzXGh3juWz9BGnRUGeI7dIxDfW3YMQ2SE5r06UiHgYVcKGxwpAQmq4hwQHsbwzqXrrIvE2iKLvyfqLTI+tyJ7a3jSTFcgC8l12bLDQbIQOImDjgWkq55P2dqAWAShRkz2u3748I9l2fm6QTjDYCylH8Ctxc+CvbjJzYdzvhutzQ2NG0NIzkl+GBN+6c6la92BqaeiIDyn1maVFpAMFuDG1acJc6MtgB/M2Og8IJe75UdUEiveYQJVCYRd7/eBMKLyVKrPN4NXuoST+ZoFIIwfqwuPeCVEGEvJht9N5cmkEELw+pa2UkUQjCyp9L5SfwYuRXLA24O/HY+ol2a8ZmsygU9pIQ30HMVotA/TipxH/32wCQYe8z7Jto0jyJiGNAL8JivP2GMXmDKSR5W3nGboYuZEiNkeKB2eVBQ6kOEhsO0Xin33dxpV0k9R9vLcDhdKvgd9DgLUIFgLsmZbjQTOFbWA+QlCb7dPknksJGj31ecYm7R7o82tejd9ULcM2QY5aqF0WPDSdgWk1QXhRFuqwpcYG25UaVo7qE+GtweJ1keTJbLmZEnLn79RfIss8z4vc7wqTBZWEVEfO/oPqluZlSXMxSIOilfjoRloJwuHFE8KjZNaxHgFf1+119cpz0eNVYCQh48Vdw9gZp+qaM5PCQJkzGRMr+eoyrV4vV/0Ur8c2Kr3Kvl8Su9fsDv5AlcsBBi+gn3srlZo+HfKYV0mBB7c3fiXK6DK1lqJM94u6LmnSIiVizBCucu7LG8ujp4vYjyRNQAPPsYBc//ktksY=)。
