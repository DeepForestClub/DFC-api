# DFC-api
深林文学部开发者API库，由Vercel提供服务器的支持，

## DFC-api介绍
DFC-api会通过外部方式调取深林文学部社区网站的数据，以JSON格式给开发者调取。DFC-api会在每次调用时代替使用者获取信息，目前的DFC-api并没有储存信息的功能。

DFC-api会减少开发者的开发难度，转移开发重点和难点，并通过官方方式获取信息，避免给Wikidot服务器造成压力。

## 关于限制速率
DFC-api限制大多数调取的速率为每分钟10次请求。深林文学部向部分有需要的开发者分别提供1个月（测试使用）和3个月（正式使用，可以根据使用的正确性和项目活跃度在使用期过后由开发者申请延长）的无速率限制的加密TOKEN密钥，使用方式是在URL上添加`token`值。

限制速率的目的是避免非官方方式给Wikidot和Vercel服务器带来过大的压力，使用官方方式将使调取更合理。

无速率限制的DFC-api因为可能造成不当使用，故要求申请的开发者符合以下条件：
* 加入深林文学部开发计划，在开发计划中长期活跃。
* 已完成所需DFC-api的项目的大概构思和部分代码。
* 项目完全闭源或以其他方式避免TOKEN密钥泄露。
* 项目的用途得到深林文学部认可并符合网站站规。
