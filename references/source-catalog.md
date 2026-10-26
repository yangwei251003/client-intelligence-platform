# 免费优先信息源起始目录

核验日期：2026-09-06。此目录用于为不同客户配置本地每日资讯网站时做候选源筛选，不是永久可用、免费或可商用承诺。**每个真实客户、每次启用前都必须重新核验官方定价、接口可用性、访问规则、数据许可和内容版权。**

## 先遵守的边界

- 信息源优先顺序：免费官方 API / 官方 RSS / 官方公开网页。模型负责理解与导读，单独选择并由客户配置；模型凭据不能弥补信息源访问缺失。
- **源免费与模型免费是两件事。** 免费获取 RSS、网页或结构化数据，不会免除模型推理、向量化、翻译、存储或网络费用。
- **数据 API 不等于新闻 API。** 学术元数据、宏观指标和公司申报适合补充事实与发现线索，不能替代编辑过的实时新闻。
- **RSS 不是无限转载许可。** 默认只保存必要元数据、短摘要和原文链接；全文、图片、附件和长期缓存须按发布者条款及单篇许可另行判断。
- 中国政府网站不假定存在统一 API。即使页面公开可读，也要逐站点核验 robots、网站声明、栏目结构、更新方式、频率限制及附件版权；页面结构变化时停止并人工复核。
- “unknown” 表示本轮官方资料未形成足够明确的商用、转载或配额结论；上线前不能把 unknown 当作允许。

## 候选源

### 1. arXiv API / RSS（科研预印本）

- 用途：计算机、数学、物理等预印本的新稿发现、主题追踪和作者追踪。
- 官方证据：[API 入口](https://info.arxiv.org/help/api/index.html)；[API 使用条款](https://info.arxiv.org/help/api/tou.html)。
- 访问 / 鉴权：公开 legacy API、OAI-PMH 与 RSS；官方条款要求 legacy 接口整体最多每 3 秒 1 次、单连接，限制可能变化。
- 免费或限制：接口为免费公共访问；商业产品应先审阅官方商业项目说明，并按官方要求致谢，不暗示 arXiv 背书。
- 商用 / 全文版权：描述性元数据按 CC0；论文全文通常仍受作者或出版商版权保护，除非单篇许可明确允许，不得自行托管或再分发全文。
- 定位：**主源（论文发现）**；站内仅展示元数据、短摘要和 arXiv 原文链接较稳妥。

### 2. Crossref REST API（科研与出版元数据）

- 用途：按 DOI、期刊、基金、发布日期、更新或撤稿关系补全和校验科研资讯。
- 官方证据：[REST API 文档](https://www.crossref.org/documentation/retrieve-metadata/rest-api/)；[访问与鉴权](https://www.crossref.org/documentation/retrieve-metadata/rest-api/access-and-authentication/)；[许可说明](https://www.crossref.org/documentation/retrieve-metadata/)。
- 访问 / 鉴权：公共访问无需注册；推荐通过 `mailto` / User-Agent 进入 polite pool；响应头给出当时的速率与并发限制，超限返回 429。
- 免费或限制：公共与 polite 访问免费；Metadata Plus 是付费生产级选项。不得把文档中的当前数值硬编码为永久配额。
- 商用 / 全文版权：绝大多数书目元数据可自由复用，Crossref 生成数据为 CC0；摘要版权可能属于出版商或作者，全文链接也不代表取得全文使用权。
- 定位：**主源（元数据与纠错）**，不是新闻正文源。

### 3. OpenAlex API（科研知识图谱）

- 用途：论文、作者、机构、主题与引用关系的聚合发现和趋势排序。
- 官方证据：[API reference](https://help.openalex.org/api/)；[鉴权](https://help.openalex.org/api/authentication/)；[定价](https://help.openalex.org/access/pricing/)。
- 访问 / 鉴权：少量基础查询可无 key；实际规模建议客户创建免费 key。官方已采用按用量计费模型，免费日预算和调用成本会变化。
- 免费或限制：数据本身为 CC0，API 仅“免费起步”；不要把免费预算写成容量承诺，部署前读取实时响应预算并设置硬停止。
- 商用 / 全文版权：元数据明确无“仅个人用途”限制；PDF / XML 的可访问性不等于可再分发，必须逐文档核验开放许可。
- 定位：**主源（科研聚合）**，适合去重、关系与趋势；原文仍回链出版者或仓储站。

### 4. NCBI E-utilities / PubMed（生医文献）

- 用途：生物医学论文检索、PMID 元数据、主题与发布日期跟踪。
- 官方证据：[E-utilities 总览](https://www.ncbi.nlm.nih.gov/home/tools/)；[参数与使用指南](https://www.ncbi.nlm.nih.gov/books/NBK25499/)；[通用使用政策及版权提示](https://www.ncbi.nlm.nih.gov/books/NBK25497/)。
- 访问 / 鉴权：低频可不带 API key；请求应带工具名和联系邮箱。更高频率需要 NCBI 账户 key，并遵守官方时段、批处理和退避要求。
- 免费或限制：公共服务免费但有频率和大任务约束；数字配额会变，上线时重查当前指南。
- 商用 / 全文版权：软件中须展示 NCBI disclaimer / copyright notice；PubMed 摘要可能受美国及其他国家版权保护，PMC / 全文须按各记录许可判断。
- 定位：**主源（生医发现）**，不是默认全文转载源。

### 5. Hacker News 官方 Firebase API（技术社区信号）

- 用途：技术产品、开源项目、创业和开发者讨论的早期信号；可取 top / new / best stories。
- 官方证据：[Hacker News API 官方仓库](https://github.com/HackerNews/API)。
- 访问 / 鉴权：Firebase JSON 端点，无鉴权；文档在核验日写明“currently no rate limit”，但应缓存、限制并发并为规则变化留退避。
- 免费或限制：公开读取免费；版本可能发生非兼容变化。
- 商用 / 全文版权：API 仓库代码为 MIT，但故事标题、用户文本、评论与外链内容的再利用权 **unknown**；只做发现、短引和回链，并处理删除 / dead 状态。
- 定位：**发现辅助**，不应作为事实核验或单一主源。

### 6. 国务院政策文件库（中国国家政策）

- 用途：公开发布的行政法规、规章、行政规范性文件及国务院部门文件追踪。
- 官方证据：[国务院政策文件库](https://sousuo.www.gov.cn/zcwjk/)；[中国政府网政府文件检索说明](https://www.gov.cn/zfwj/search.htm)。
- 访问 / 鉴权：公开网页；本轮未发现可据此假定的统一公开 API，结构化采集方式与稳定性 **unknown**。
- 免费或限制：公众浏览免费不等于允许高频自动抓取。必须按栏目、域名和页面类型逐站核验网站声明、robots、缓存与访问频率。
- 商用 / 全文版权：政策原文与页面编辑、解读、图片、音视频、附件的复用边界不能混为一谈；商业展示和全文镜像许可 **unknown**，默认保存标题、机关、日期、文号、短摘和原链。
- 定位：**主源（政策原文）**；政策解读应与原文分栏并标注来源。

### 7. 中国政府采购网及省级分网（国内政府采购）

- 用途：采购意向、公告、结果、合同和财政部政府采购信息公告的机会发现。
- 官方证据：[中国政府采购网](https://www.ccgp.gov.cn/)；[《政府采购信息发布管理办法》](https://www.ccgp.gov.cn/specialtopic/cj2020/dashijian/202001/t20200107_13717074.htm)；[信息公开通知](https://www.ccgp.gov.cn/zcfg/mof/201705/t20170509_8210617.shtml)。
- 访问 / 鉴权：网站及地方分网公开查询；本轮未发现可泛化为全国统一、稳定、公开 API 的官方文档，接口与抓取许可 **unknown**。
- 免费或限制：法规要求指定媒体向社会公众免费提供信息查阅，但这不等于允许批量抓取、镜像或商业再发布。
- 商用 / 全文版权：公告事实、附件、页面编排及第三方材料的权利边界 **unknown**；上线前逐分网核验并尽量只索引关键字段和原链。
- 定位：**主源（国内采购）**；遇到总网与分网或其他媒体不一致时，按官方规则核对指定媒体版本。

### 8. TED Search API（欧盟公共采购）

- 用途：检索和批量下载欧盟已发布采购公告，按 CPV、NUTS、买方和日期筛选。
- 官方证据：[Search API](https://docs.ted.europa.eu/api/latest/search.html)；[TED API 总览](https://docs.ted.europa.eu/api/latest/)。
- 访问 / 鉴权：Search API 面向数据复用者且无需鉴权；其他 TED API 通常需要 EU Login 与 API key，不能混用两者规则。
- 免费或限制：官方明确列举商业组织集成场景；仍应在每次部署前核验版本、端点、批量下载和公平使用限制。
- 商用 / 全文版权：公告数据复用被官方鼓励，但具体附件、商标、个人信息和第三方内容的权利边界 **unknown**；保留来源与公告标识。
- 定位：**主源（欧盟采购）**。

### 9. World Bank Indicators API（全球宏观与发展指标）

- 用途：GDP、人口、债务、能源、人力资本等长期序列，为新闻提供背景和图表。
- 官方证据：[Indicators API](https://datahelpdesk.worldbank.org/knowledgebase/articles/889392-about-the-indicators-api-documentation)；[数据访问与许可](https://datacatalog.worldbank.org/public-licenses)。
- 访问 / 鉴权：V2 API，无需 API key 或其他鉴权。
- 免费或限制：公开访问；它是指标数据接口，不是新闻接口，更新频率取决于具体序列。
- 商用 / 全文版权：世行自产开放数据默认 CC BY 4.0，可含商业使用但需署名并标注修改；其他机构数据集可能采用不同许可，必须逐数据集检查。
- 定位：**发现 / 背景辅助**，适合图表和事实校验，不适合独立判断当天新闻重要性。

### 10. SEC EDGAR Data APIs / RSS（美国公司申报）

- 用途：上市公司最新 filings、提交历史、10-K / 10-Q / 8-K 元数据和 XBRL 财务事实。
- 官方证据：[EDGAR Data APIs](https://www.sec.gov/search-filings/edgar-application-programming-interfaces)；[Developer Resources 与 RSS](https://www.sec.gov/about/developer-resources)；[data.sec.gov 提示](https://data.sec.gov/)。
- 访问 / 鉴权：`data.sec.gov` 的公开数据 API 无需 key；自动访问须遵守 SEC Privacy and Security Policy / Fair Access，声明可联系的 User-Agent，并按当时规则限速。
- 免费或限制：公共访问免费；实时 JSON 与夜间 bulk 数据更新时间不同。不要把提交用 EDGAR API 的 token 规则误套到公开 data API。
- 商用 / 全文版权：申报数据、附件、商标和第三方展品的再利用边界可能不同，统一商用全文许可 **unknown**；默认抽取事实、短摘并回链原 filing。
- 定位：**主源（监管披露）**；它是事件源和事实源，不是编辑新闻源。

### 11. FRED API（美国及全球宏观序列，谨慎启用）

- 用途：利率、通胀、就业、市场和宏观时间序列，为商业资讯提供背景。
- 官方证据：[FRED API 文档](https://fred.stlouisfed.org/docs/api/fred/)；[API Terms of Use](https://fred.stlouisfed.org/docs/api/terms_of_use.html)。
- 访问 / 鉴权：必须注册并使用客户自己的 API key；本目录不替客户注册。
- 免费或限制：官方条款允许其自行调整带宽或交易限制；当前免费额度 / 稳定性不能据此承诺，视为 **unknown** 并在部署时重查。
- 商用 / 全文版权：部分序列由第三方拥有；官方明确说明，超出个人使用前应向相应数据所有者取得许可。带 Copyright 标记的序列不得默认用于商业客户；产品还需展示官方规定的非背书声明。
- 定位：**发现 / 背景辅助**；只有逐序列许可审核通过后，才可进入商业客户生产配置。

## 上线前最小复核记录

为每个启用源保存：核验日期、官方文档与条款 URL、访问方式、客户拥有的凭据类型、当时响应头 / 配额依据、允许保存和展示的字段、全文与图片策略、署名文本、删除与下线方式。任一关键项为 unknown 时，只允许做人工试用或发现辅助，不进入自动对客发布。

## RSSHub 与自动化参考补充

RSSHub 是可选的 RSS 适配层，不是新闻版权库或免封禁服务。官方 [RSSHub 项目](https://github.com/DIYgod/RSSHub) 与 [维护者对路由检测的讨论](https://github.com/DIYgod/RSSHub/discussions/9989) 表明路由可用性会变化，增加对源站的请求也会增加封禁风险。每个路由、所选实例与上游来源分别核查；优先源站已有的官方 API/RSS，缓存/限流/退避，不能靠公共实例承诺全天可用。

近重复检测可参考 [Charikar 的原始相似度估计研究](https://doi.org/10.1145/509907.509965)，不从论文推导“新闻固定距离3/前500字”的通用规则。个性化与群体趋势可参考 [Google News 的点击行为推荐研究](https://research.google/pubs/personalized-news-recommendation-based-on-click-behavior/)，不能把转载数量直接宣称为客观热度。这些是方法依据，产品仍要在客户数据上校准与验证。

本补充核查日期 2026-09-06。具体网站的调度、热度与去重验收见 [自动化产品契约](autonomous-site.md)。
