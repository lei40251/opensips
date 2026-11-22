---
title: "rate_cacher 模块"
description: "rate_cacher 模块提供对所分配的客户和/或供应商费率表进行缓存与实时查询的手段。"
sidebar: false
---

## 管理员指南 {#admin-guide}


### 概述 {#overview}


rate_cacher 模块提供对所分配的客户和/或供应商费率表（ratesheet）进行缓存
与实时查询的手段。它还支持基于成本的实时路由和基于成本的过滤。


### 依赖 {#dependencies}


#### OpenSIPS 模块 {#opensips-modules}


在加载本模块之前，必须先加载以下模块：


- *不依赖其他 OpenSIPS 模块。*


#### 外部库或应用 {#external-libraries-or-applications}


在加载本模块运行 OpenSIPS 之前，必须先安装以下库或应用：


- *无*。


### 导出参数 {#exported-parameters}


#### vendors_db_url (str)


用于查询本模块所使用的供应商的 DB URL。


*默认值为 "NULL"。*


```opensips title="Setting the vendors_db_url parameter"
...
modparam("rate_cacher", "vendors_db_url", "mysql://opensips:opensipsrw@localhost/opensips")
...
```


#### vendors_db_table (str)


用于查询本模块所使用的供应商的 DB 表。


*默认值为 "rc_vendors"。*


```opensips title="Setting the vendors_db_table parameter"
...
modparam("rate_cacher", "vendors_db_table", "my_vendors_view")
...
```


#### vendors_hash_size (int)


内部用于保存供应商的哈希表大小。表越大，速度越快，但会占用更多内存。
哈希大小必须是 2 的幂。


*默认值为 "256"。*


```opensips title="Setting the vendors_hash_size parameter"
...
modparam("rate_cacher", "vendors_hash_size", 1024)
...
```


#### clients_db_url (str)


用于查询本模块所使用的客户的 DB URL。


*默认值为 "NULL"。*


```opensips title="Setting the clients_db_url parameter"
...
modparam("rate_cacher", "clients_db_url", "mysql://opensips:opensipsrw@localhost/opensips")
...
```


#### clients_db_table (str)


用于查询本模块所使用的客户的 DB 表。


*默认值为 "rc_clients"。*


```opensips title="Setting the clients_db_table parameter"
...
modparam("rate_cacher", "clients_db_table", "my_clients_view")
...
```


#### clients_hash_size (int)


内部用于保存客户的哈希表大小。表越大，速度越快，但会占用更多内存。
哈希大小必须是 2 的幂。


*默认值为 "256"。*


```opensips title="Setting the vendors_hash_size parameter"
...
modparam("rate_cacher", "clients_hash_size", 1024)
...
```


#### rates_db_url (str)


用于查询本模块所使用的费率表的 DB URL。


*默认值为 "NULL"。*


```opensips title="Setting the rates_db_url parameter"
...
modparam("rate_cacher", "rates_db_url", "mysql://opensips:opensipsrw@localhost/opensips")
...
```


#### rates_db_table (str)


用于查询本模块所使用的费率表的 DB 表。


*默认值为 "rc_ratesheets"。*


```opensips title="Setting the rates_db_table parameter"
...
modparam("rate_cacher", "rates_db_table", "my_clients_view")
...
```


### 导出函数 {#exported-functions}


#### get_client_price(client_id,is_wholesale,dialled_no,prefix_pvar,destination_pvar,price_pvar,minimum_pvar,increment_pvar)


对于来自所提供 client_id 的呼叫，按批发或零售质量拨打 dialled_no，该函数会将所拨号码与该客户的费率表进行匹配，并返回匹配到的 prefix、destination、price、minimum 和 increment。


*client_id* 伪变量将保存发起该呼叫的 client_id。


*is_wholesale* 伪变量将包含 1 或 0，取决于该呼叫是批发还是零售（参见客户费率表的数据配置）。


*dialled_no* 伪变量包含 DNIS —— 当前呼叫的被叫号码。它必须为 E164 格式，且不带前导 +。


*prefix* 伪变量将包含从该客户费率表中匹配到的前缀。


*destination* 伪变量将包含从该客户费率表中匹配到的目的地。


*price* 伪变量将包含从该客户费率表中匹配到的价格。


*minimum* 伪变量将包含从该客户费率表中匹配到的最低计费时长。


*increment* 伪变量将包含从该客户费率表中匹配到的计费单位。


可能的参数类型


- *所有参数* - 字符串/整型或伪变量


该函数可在任意路由中使用。


```opensips title="get_client_price usage"
...
if (get_client_price("my_client",1,"4072794242",$var(prefix),$var(dest),$var(price),$var(min),$var(inc))) {
                        xlog("We matched $var(prefix) , $var(dest) , $var(price) , $var(min) , $var(inc) for the client's ratesheet\n");
                }

...
```


#### get_vendor_price(vendor_id,dialled_no,prefix_pvar,destination_pvar,price_pvar,minimum_pvar,increment_pvar)


对于拨打 dialled_no 且经由所提供 vendor_id 的呼叫，该函数会将所拨号码与该供应商的费率表进行匹配，并返回匹配到的 prefix、destination、price、minimum 和 increment。


*vendor_id* 伪变量将保存 vendor_id。


*dialled_no* 伪变量包含 DNIS —— 当前呼叫的被叫号码。它必须为 E164 格式，且不带前导 +。


*prefix* 伪变量将包含从该供应商费率表中匹配到的前缀。


*destination* 伪变量将包含从该供应商费率表中匹配到的目的地。


*price* 伪变量将包含从该供应商费率表中匹配到的价格。


*minimum* 伪变量将包含从该供应商费率表中匹配到的最低计费时长。


*increment* 伪变量将包含从该供应商费率表中匹配到的计费单位。


可能的参数类型


- *所有参数* - 字符串/整型或伪变量


该函数可在任意路由中使用。


```opensips title="get_vendor_price usage"
...
if (get_vendor_price("my_vendor","4072794242",$var(prefix),$var(dest),$var(price),$var(min),$var(inc))) {
                        xlog("We matched $var(prefix) , $var(dest) , $var(price) , $var(min) , $var(inc) for the vendor's ratesheet\n");
                }

...
```


#### cost_based_filtering(client_id,is_wholesale,vendors_csv,dialled_no,desired_margin,out_vendor_csv)


对于来自所提供 client_id 的呼叫，按批发或零售质量拨打 dialled_no，该函数会从 vendor_csv 列表中移除不满足 desired_margin 条件的供应商，并将 out_vendor_csv 变量设置为满足该利润条件的供应商列表，同时保持 vendor_csv 变量中提供的初始顺序。


*client_id* 伪变量将保存发起该呼叫的 client_id。


*is_wholesale* 伪变量将包含 1 或 0，取决于该呼叫是批发还是零售（参见客户费率表的数据配置）。


*vendors_csv* 伪变量包含需要基于期望利润进行过滤的供应商列表（仅保留那些符合本次呼叫期望利润百分比的供应商）。


*dialled_no* 伪变量包含 DNIS —— 当前呼叫的被叫号码。它必须为 E164 格式，且不带前导 +。


*desired_margin* 伪变量包含脚本编写者基于客户卖出价与供应商买入价希望达到的最低整数利润。所用公式为：vendor_margin=(client_price - results[i])*100/client_price)。若 vendor_margin 高于 desired_margin，则该供应商可用。期望利润可为正（该呼叫将盈利），也可为负（该呼叫将造成亏损）。


*out_vendors_csv* 伪变量为输出参数，该 pvar 将被填充为满足期望利润条件的供应商 CSV 列表。


可能的参数类型


- *所有参数* - 字符串/整型或伪变量


该函数可在 REQUEST 或 FAILURE 路由中使用。


```opensips title="cost_based_filtering usage"
...
# 若我们从 testClient 收到一个按其批发质量的呼叫，
# 拨打号码 40720018124，并且需要从供应商列表
# 'testVendor,testVendor2' 中基于 0 的利润
# （我们不想在这通呼叫上亏钱）进行选择，
# 那么 $avp(out_vendor_csv) 将包含根据上述呼叫特征、
# $avp(carrierlist) 中提供的供应商顺序以及期望利润
# 而确定需要使用的供应商
$avp(client_id)="testClient";
$avp(is_ws)=1;  
$avp(carrierlist)="testVendor,testVendor2";
$avp(dnis)="40720018124";
$avp(profit_margin)=0;

if (cost_based_filtering("$avp(client_id)","$avp(is_ws)","$avp(carrierlist)","$avp(dnis)","$avp(profit_margin)","$avp(out_vendor_result)")) {
	xlog("XXX - Out of the $avp(carrierlist) carriers, we should only use $avp(out_vendor_result) \n");
...
```


#### cost_based_ordering(client_id,is_wholesale,vendors_csv,dialled_no,desired_margin,out_vendor_csv)


对于来自所提供 client_id 的呼叫，按批发或零售质量拨打 dialled_no，该函数会从 vendor_csv 列表中移除不满足 desired_margin 条件的供应商，并将 out_vendor_csv 变量设置为满足该利润条件的供应商列表，按利润降序排列（从利润最高的供应商到仍满足该条件的利润最低的供应商）。


*client_id* 伪变量将保存发起该呼叫的 client_id。


*is_wholesale* 伪变量将包含 1 或 0，取决于该呼叫是批发还是零售（参见客户费率表的数据配置）。


*vendors_csv* 伪变量包含需要基于期望利润进行过滤的供应商列表（仅保留那些符合本次呼叫期望利润百分比的供应商）。


*dialled_no* 伪变量包含 DNIS —— 当前呼叫的被叫号码。它必须为 E164 格式，且不带前导 +。


*desired_margin* 伪变量包含脚本编写者基于客户卖出价与供应商买入价希望达到的最低整数利润。所用公式为：vendor_margin=(client_price - results[i])*100/client_price)。若 vendor_margin 高于 desired_margin，则该供应商可用。期望利润可为正（该呼叫将盈利），也可为负（该呼叫将造成亏损）。


*out_vendors_csv* 伪变量为输出参数，该 pvar 将被填充为满足期望利润条件的供应商 CSV 列表。


可能的参数类型


- *所有参数* - 字符串/整型或伪变量


该函数可在任意路由中使用。


```opensips title="cost_based_ordering usage"
...
# 若我们从 testClient 收到一个按其批发质量的呼叫，
# 拨打号码 40720018124，并且需要从供应商列表
# 'testVendor,testVendor2' 中基于 0 的利润
# （我们不想在这通呼叫上亏钱）进行选择，
# 那么 $avp(out_vendor_csv) 将包含根据上述呼叫特征
# 以及期望利润而确定需要使用的供应商
# $avp(carrierlist) 中的顺序无关紧要，供应商将按
# 从利润最高到利润最低的顺序排列
$avp(client_id)="testClient";
$avp(is_ws)=1;  
$avp(carrierlist)="testVendor,testVendor2";
$avp(dnis)="40720018124";
$avp(profit_margin)=0;

if (cost_based_ordering("$avp(client_id)","$avp(is_ws)","$avp(carrierlist)","$avp(dnis)","$avp(profit_margin)","$avp(out_vendor_result)")) {
	xlog("XXX - Out of the $avp(carrierlist) carriers, we should only use $avp(out_vendor_result) , in the provided order\n");
...
```


### 导出的 MI 函数 {#exported-mi-functions}


#### rc_addVendor


添加一个新供应商，但不为其分配任何费率表。


名称：*rc_addVendor*


参数：


- *vendorName* - 要添加的供应商名称


MI FIFO 命令格式：


```bash
## 添加一个新供应商
$ opensips-cli -x mi rc_addVendor myNewVendor
```


#### rc_deleteVendor


从内存中移除一个供应商，连同与其关联的费率表（若有）。


名称：*rc_deleteVendor*


参数：


- *vendorName* - 要删除的供应商名称


MI FIFO 命令格式：


```bash
## 删除一个供应商
$ opensipss-cli -x mi rc_deleteVendor myNewVendor
```


#### rc_reloadVendorRate


重新加载所提供费率表，并将其分配给该供应商。


名称：*rc_reloadVendorRate*


参数：


- *vendorName* - 供应商名称
- *ratesheet_id* - 要重新加载并分配的费率表 ID


MI FIFO 命令格式：


```bash
## 重新加载供应商费率表
$ opensips-cli -x mi rc_reloadVendorRate myVendor 3
```


#### rc_deleteVendorRate


从该供应商处删除已分配的费率表。


名称：*rc_deleteVendorRate*


参数：


- *vendorName* - 供应商名称


MI FIFO 命令格式：


```bash
## 删除供应商的费率表
$ opensips-cli -x mi rc_deleteVendorRate myVendor
```


#### rc_getVendorPrice


获取所提供供应商与所拨号码的全部费率表信息（destination 名称、price、minimum、increment）。


名称：*rc_getVendorPrice*


参数：


- *vendorName* - 供应商名称
- *dialledNumber* - 要在上述供应商费率表中匹配的号码


MI FIFO 命令格式：


```bash
## 查询 myVendor 对 4072731825 号码的价格
#/usr/local/bin/opensips-cli -x mi rc_getVendorPrice myVendor 4072731825
{
    "prefix": "40727",
    "destination": "ROMANIA MOBILE VODAFONE",
    "price": 0.05,
    "minimum": 1,
    "increment": 1,
    "currency": "USD"
}
```


#### rc_addClient


添加一个新客户，但不为其分配任何费率表。


名称：*rc_addClient*


参数：


- *clientName* - 要添加的客户名称


MI FIFO 命令格式：


```bash
## 添加一个新客户
$ opensips-cli -x mi fifo rc_addClient myNewClient
```


#### rc_deleteClient


从内存中移除一个客户，连同与其关联的费率表（若有）。


名称：*rc_deleteClient*


参数：


- *clientName* - 要删除的客户名称


MI FIFO 命令格式：


```bash
## 删除一个客户
$ opensips-cli -x mi rc_deleteClient myClient
```


#### rc_reloadClientRate


重新加载所提供费率表，并将其分配给该客户。


名称：*rc_reloadClientRate*


参数：


- *clientName* - 客户名称
- *isWholesale* - 该费率表是按批发还是零售质量分配的
- *ratesheet_id* - 要重新加载并分配的费率表 ID


MI FIFO 命令格式：


```bash
## 重新加载该客户的批发费率表，并为其分配费率 id 3
$ opensips-cli -x mi rc_reloadClientRate myClient 1 3
```


#### rc_deleteClientRate


从该客户处删除已分配的费率表。


名称：*rc_deleteClientRate*


参数：


- *ClientName* - 客户名称
- *isWholesale* - 删除批发还是零售费率表


MI FIFO 命令格式：


```bash
## 删除供应商的费率表
$ opensips-cli -x mi rc_deleteVendorRate myVendor
```


#### rc_getClientPrice


获取所提供客户在指定质量（批发与零售）与所拨号码下的全部费率表信息（destination 名称、price、minimum、increment）。


名称：*rc_getClientPrice*


参数：


- *ClientName* - 客户名称
- *isWholesale* - 批发 = 1，零售 = 0
- *dialledNumber* - 要在上述客户费率表中匹配的号码


MI FIFO 命令格式：


```bash
## 查询 myClient 在零售质量下对 4072731825 号码的价格
#/usr/local/bin/opensips-cli -x mi rc_getClientPrice myClient 0 4072731825
{
    "prefix": "40727",
    "destination": "ROMANIA MOBILE VODAFONE",
    "price": 0.03,
    "minimum": 1,
    "increment": 1,
    "currency": "USD"
}
```
<!-- CONTRIBUTORS -->

### 许可证 {#license}

所有文档文件（即 .md 扩展名）均按 Creative Common License 4.0 授权
