# TECH.md — Vett 技术实现文档

本文档记录 `app-nextjs/` 的当前实现细节,作为开发对接和 PM 沟通的事实底稿。所有公式、阈值、缓存策略均以代码为准,本文档与代码不一致以代码为准。

> 顶层产品定位、用户故事、四层架构请参考 [SPEC.md](SPEC.md) / [PM.md](PM.md)。
> 高层入口和约定请参考 [CLAUDE.md](CLAUDE.md)。

---

## 1. 整体架构

### 技术栈
- **Framework**: Next.js 15 (App Router) + TypeScript + React 19
- **样式**: Tailwind CSS 3 + 内联样式;字体 Outfit(`next/font/google`)
- **图表**: recharts(雷达图)
- **图标**: lucide-react
- **数据库**: Supabase PostgreSQL(暂未启用 pgvector)
- **认证**: 自研轻量(bcryptjs + investor_id 作为用户名,localStorage 存登录态)
- **AI**: Claude Haiku 4.5(`claude-haiku-4-5-20251001`),通过 Anthropic SDK + tool_use 结构化输出
- **部署**: Vercel(Next.js 原生)

### 双 UI(mobile + web)从同一份代码出
| 路由组 | URL 前缀 | 布局 | 导航形态 |
|---|---|---|---|
| `app/(mobile)/` | `/` | 390×844 手机框居中 | 底部 3 图标 tab bar |
| `app/web/` | `/web/` | max 1200px 响应式 | 顶部 WebHeader |

两套 UI 共用全部 API 路由、`lib/*`、`components/shared/*`、类型定义。

### Middleware 自动跳转
[app-nextjs/middleware.ts](app-nextjs/middleware.ts) 按 User-Agent 把桌面端从 `/` 重定向到 `/web/...`,手机端不动。`/api/*`、`/_next/*`、静态资源不触发。

---

## 2. 数据模型(Supabase)

| 表 | 用途 | 迁移文件 |
|---|---|---|
| `investors` | 用户档案(认证 + 自评 + 行为推断) | [00001_create_tables.sql](app-nextjs/supabase/migrations/00001_create_tables.sql) |
| `products` | 37 个示例产品(seed 自 CSV) | 同上 |
| `transactions` | 8400+ 历史交易(seed 自 CSV) | 同上 |
| `check_results` | LLM Match 结果持久化缓存(24h TTL) | [00002_create_check_results.sql](app-nextjs/supabase/migrations/00002_create_check_results.sql) |

### investors 表关键字段(用于雷达图与 LLM)
- 自评:`self_risk_level`(1-5)、`stated_horizon`、`stated_max_loss`、`has_short_term_cash_need`、`investment_goal`、`target_gain`、`investment_experience_years`
- 行为推断:`actual_tolerance`(1-5,seed 数据自带)、`mismatch_direction`(`accurate / underestimate / overestimate`)
- 其它人口/财务:`age / gender / financial_literacy / account_size / monthly_spending / debt_level / is_qualified_investor / education / occupation`

### check_results 表
```
PRIMARY KEY (investor_id, ticker)
score INTEGER (0-100)
tier TEXT ('fit' | 'caution' | 'mismatch')
flags JSONB
ai_explanation TEXT
reflection_questions JSONB
suggestions JSONB
confidence TEXT ('low' | 'medium' | 'high')
data_basis TEXT
created_at TIMESTAMPTZ DEFAULT NOW()
```
读时按 `created_at > now() - 24h` 过滤;写时 upsert。

---

## 3. 信号引擎(`lib/signals.ts`)

### 4 个核心行为信号

| 信号 | 输入字段 | 等级判定 | 分数 |
|---|---|---|---|
| **持有偏离** `holdingDeviation` | `stated_horizon` 期望区间 vs `transactions.hold_days` 中位数 | medianHold < lowerBound/10 或 < lowerBound × 0.3 → **high**;< lowerBound → **medium**;否则 → **low** | high=0、medium=15、low=25 |
| **恐慌抛售** `panicSelling` | 亏损卖出中 -10%~0% 占比 + `sell_decision_source='panic'` 占比 | combined > 0.5 或 smallDipRate > 0.5 → **high**;> 0.25 → **medium**;否则 → **low** | 同上 |
| **外部依赖** `externalDependency` | `decision_source='friend'/'social_media'` 占买入比 | > 0.5 → **high**;> 0.25 → **medium**;否则 → **low** | 同上 |
| **流动性冲突** `liquidityConflict` | `has_short_term_cash_need=true` + 买入 `fund/private_equity/savings_insurance` 占比 | 无短期需求 → **low**;有需求 + 占比 > 30% → **high**;有需求 + 任意非流动性买入 → **medium** | 同上 |

### 总分(Fitness Score)
4 信号分数求和,**0-100**(实际离散值约 35 种组合)。

### Tier 判定
- **Mismatch**:≥3 个 high,或持有期极端偏离(medianHold < lowerBound/10)
- **Caution**:≥1 个 high,或 ≥3 个 medium
- **Fit**:其它

### 原始指标(供雷达计算)
计算引擎额外暴露:
```
metrics: {
  medianHoldDays,
  selfBuyRate,        // decision_source='self' / 总买入
  smallDipSellRate,   // -10%~0% 卖 / 亏损卖
  panicSourceRate,    // sell_decision_source='panic' / 总卖出
  illiquidBuyRate,    // 非流动性买入 / 总买入
  totalBuys,
  totalSells,
}
```

### 缓存
in-memory `Map<investor_id, SignalEngineOutput>`,TTL 5 分钟。`invalidateSignalCache(investorId)` 在用户数据变更时清除。

---

## 4. 五维雷达(`app/api/profile/route.ts`)

雷达模型对齐 PM.md / temp.md:**双多边形,差距即错配**。每条轴 self 和 obs 都映射到 0-100 同尺度,差距大小转成圆点颜色提示。

### 维度公式

| 维度 | self 来源 | obs 来源 |
|---|---|---|
| **Risk Tolerance** | `self_risk_level × 20`(R1=20…R5=100) | `actual_tolerance × 20`(若空则回退到 self) |
| **Holding Patience** | `stated_horizon` 映射:`<6m=20 / 6m-1y=40 / 1-3y=60 / 3-5y=80 / 5y+=95` | `medianHoldDays` 6 档:`<30=10 / 30-180=25 / 180-365=45 / 365-1095=65 / 1095-1825=80 / ≥1825=95` |
| **Decision Independence** | `expScore + litBonus`(clamp 0-100):exp `None=20 / <1y=35 / 1-3=55 / 3-5=75 / 5+=90`,literacy `low=-10 / medium=0 / high=+10` | `selfBuyRate × 100` |
| **Volatility Comfort** | `stated_max_loss` 映射:`0%=20 / 5%=40 / 10%=60 / 20%=80 / 50%+=95` | `100 − (smallDipSellRate + panicSourceRate)/2 × 100` |
| **Liquidity Readiness** | `has_short_term_cash_need ? 30 : 80` | 无需求 → 100;有需求 → `100 − illiquidBuyRate × 100` |

### 圆点配色(差距判定)
```
|self − obs| ≤ 15  → #14B8BB(teal,对齐)
|self − obs| ≤ 35  → #F59E0B(amber,中等差距)
|self − obs| > 35  → #EF4444(coral,明显错位)
```

### 头条文案(`headline`)
[`generateHeadline()`](app-nextjs/app/api/profile/route.ts) 按"差距最大且具有真实风险"的维度选择对应方向的句子(共 5 维 × 2 方向 = 10 条模板)。规则:
1. 排除 self ≥ 70 且 obs ≥ 70 的维度(双高 = 健康,不算问题)
2. 在剩余维度里找最大 `|self − obs|`
3. 若最大差距 < 15 或无候选 → "Your self-assessment matches your behavior."
4. 否则按 `self > obs`(高估)或 `self < obs`(低估)选模板

### 维度评论文案(`explanation`)
每个维度 3-5 个分支,基于实际数据填充。例如 Holding Patience:
- 无 sells → "No completed sells yet …"
- median ≥ 期望下限 → "your actual patience matches what you stated."
- median ≥ 下限 50% → "somewhat shorter than the lower end of your stated range"
- median ≥ 下限 10% → "well short of stated range"
- median < 下限 10% → "an order of magnitude shorter"

实现位于 [`profile/route.ts`](app-nextjs/app/api/profile/route.ts) 的 `explainXxx()` 系列函数。

---

## 5. LLM Match Check(核心,`lib/llm.ts` + `app/api/check/[ticker]`)

### 模型与调用
- `claude-haiku-4-5-20251001`,`temperature=0`(尽量确定)
- 通过 Anthropic SDK 的 `tool_use` 强制结构化 JSON 输出 — schema 锁定 8 个字段
- system prompt 启用 `cache_control: { type: "ephemeral" }`(5 分钟 ephemeral,大幅降低重复调用成本)

### System Prompt 6 条原则
1. 所有结论基于授权数据 + 可观测行为事实,不推测
2. 用 "we've detected / your data shows",禁用 "you will / you should"
3. 描述行为,不定义人(写"we've detected exits during dips",不写"you are a panic seller")
4. 适度幽默,**最多一句**,禁讽刺
5. **Mismatch 输出 `aiExplanation` 必须以解决方案结尾**
6. 概率而非确定性

外加禁令:无买卖/持有/避免建议、无价格/收益预测、无紧迫语、不给用户贴标签。

### LLM 输入(`CheckLLMInput`)
- `investor`:7 个自评 + 行为推断字段
- `signals`:4 信号等级 + 5 个原始 rate
- `product`:ticker / name / risk_level / product_type / is_long_term / is_illiquid

### LLM 输出(`CheckLLMOutput`)
| 字段 | 类型 | 用途 |
|---|---|---|
| `score` | 0-100 整数 | Decision Fitness Score |
| `tier` | `fit / caution / mismatch` | 分级标签 |
| `flags` | 0-3 条 `{label, explanation, iconType}` | Mismatch 标记 |
| `aiExplanation` | string | "Why this might (not) fit you" 主体文案 |
| `reflectionQuestions` | 2-3 条 | 反思问题 |
| `suggestions` | 2-3 条 | "If you still want to proceed" 行动建议 |
| `confidence` | `low / medium / high` | 数据置信度 |
| `dataBasis` | string | 例:"Based on 38 transactions over 12 months." |

`flags.iconType` 枚举:`clock`(持有/时间)、`trending-down`(波动/亏损)、`users`(社交/外部)、`alert`(流动性/通用)。

### Match 算分锚点(写在 prompt 里指导 LLM)
```
锚点:|product.risk_level − actual_tolerance| × 20
+ holdingDeviation × is_long_term
+ panicSelling × (risk_level ≥ 4)
+ externalDependency
+ liquidityConflict × is_illiquid
floor 5,cap 100
≥70 → fit / 40-69 → caution / <40 → mismatch
```
LLM 在该锚点上做最终评估,可结合具体数据微调。

### Alternatives(替代产品)
**仍是规则法**:同 `product_type` 候选产品 → 用 `computeMatchPercentage()` 排序取前 3。不走 LLM(过多调用、性价比低)。

---

## 6. 缓存与一致性策略

### 二级缓存
| 层 | 介质 | TTL | 用途 |
|---|---|---|---|
| **L1** | in-memory(`Map`,Vercel 函数实例本地) | 30 分钟 | 同实例同会话快速返回 |
| **L2** | Supabase `check_results` 表 | 24 小时 | 跨实例 / 跨冷启动复用 |

### 命中流程
```
generateCheck(investor_id, ticker)
  ↓
查 L1 → 命中即返回(< 1ms)
  ↓ 未命中
查 L2(SQL,< 50ms)→ 命中则填回 L1 后返回
  ↓ 未命中
调 Claude Haiku(~1-2s)→ 写 L1 + 异步写 L2 → 返回
```

### Trending / History 列表的 Match 显示
[`/api/products/trending`](app-nextjs/app/api/products/trending/route.ts) 和 [`/api/check/history`](app-nextjs/app/api/check/history/route.ts) 在批量返回 Match% 时:
- 一次 SQL 调 `readDbCacheBatch(investor_id, [tickers])` 拿所有命中
- 命中的 ticker → 用 LLM 分,`isEstimate=false`
- 未命中 → 用 `computeMatchPercentage()` 规则法兜底,`isEstimate=true`

前端([home/dashboard/history](app-nextjs/app))识别 `isEstimate` 字段,渲染时:
- `isEstimate=false` → 满色
- `isEstimate=true` → opacity 0.55 + `?` 图标 + tooltip"Estimate. Open this product to run the full AI check."

### 一致性保证

| 行为 | 现象 |
|---|---|
| 用户首次查 AAPL → 90 | DB 写 90 |
| 1h 后再次打开 AAPL 详情 | 读 L1,瞬时返回 90 |
| 同时刷 dashboard | trending 读 L2,显示 90(不再是 estimate) |
| 24h 后再来 | L2 过期,重算(temperature=0,prompt 不变,大概率仍是 90 ± 1) |
| 不同用户 | 各自缓存,互不影响 |

### 成本预估
- Haiku 4.5:$1/MTok input、$5/MTok output
- 单次 ~1500 in + 700 out → **~$0.005/次**
- system prompt cache 命中后 → **~$0.001-0.002/次**
- **同 (user, ticker) 24h 内只调一次** — 500 用户 × 平均 5 product/day × $0.002 ≈ **$5/天上限**

---

## 7. API 路由现状

| 路由 | 真实/Mock | 备注 |
|---|---|---|
| `POST /api/auth/register` | ✅ 真实 | bcrypt |
| `POST /api/auth/login` | ✅ 真实 | bcrypt |
| `POST /api/onboarding` | ✅ 真实 | 7 题答案 → investors 表 |
| `GET /api/profile?investor_id=` | ✅ 真实 | 5 维 + 头条 + 总分,Supabase 未配时 fallback |
| `GET /api/check/[ticker]` | ✅ 真实(LLM) | 二级缓存,LLM 失败时 fallback |
| `GET /api/check/history?investor_id=` | ✅ 真实 | LLM 缓存 + 规则法兜底 |
| `GET /api/products/trending?investor_id=` | ✅ 真实 | 同上 |
| `GET /api/articles?category=` | 🟡 Mock | 16 篇硬编码于 [lib/articles.ts](app-nextjs/lib/articles.ts) |
| `GET /api/articles/[slug]` | 🟡 Mock | 同上 |
| `GET /api/advisor/clients` | 🟡 Mock | 5 个写死客户 |

---

## 8. 前端主要页面

### Mobile(`app/(mobile)/`)
- `/` → 欢迎页
- `/login`、`/register`
- `/step/[1-7]` → 7 题 onboarding(localStorage 暂存,step 7 完成后批量 POST)
- `/import` → 数据导入页(仅 UI,模拟"已导入")
- `/home` → trending + history 列表 + 头条 + Fitness 进度条
- `/profile` → 雷达图 + 5 维卡片
- `/check/[ticker]` → LLM 检查结果详情
- `/explore` → 文章列表(mock)

### Web(`app/web/`)
- 镜像 mobile 全部页面
- 额外:`/web/dashboard`、`/web/history`、`/web/advisor`(顾问视图)

### Header 菜单(右上角)
[`AppHeader`](app-nextjs/components/shared/AppHeader.tsx) / [`WebHeader`](app-nextjs/components/web/WebHeader.tsx) 都内置 dropdown:
- **Import data** → `/import` 或 `/web/import`
- **Sign out** → 清 `vett_investor_id` + `vett_onboarding` localStorage,跳 login

---

## 9. 待与 PM 对齐的事项 ⚠️

下面这些是当前开发**自行决定**或**与 PM 文档不完全一致**的地方,demo 前最好确认。

### A. 五维计算的"未明确"项
| 维度 | 现实现 | PM 文档(temp.md / PM.md) | 待确认 |
|---|---|---|---|
| Decision Independence **self 端** | `expValue + litBonus` 派生(开发提议,用户确认) | **未定义** | PM 是否接受用经验+素养做代理,还是要新增一道 onboarding 题? |
| Volatility Comfort **self 端** | `stated_max_loss` 映射 | **未明确** | PM 是否同意用 Q5 max_loss? |
| Liquidity Readiness **self 端** | `has_short_term_cash_need ? 30 : 80`(二值) | **未明确** | Q7 onboarding 有 4 选项但只存了布尔 — 是否要加 `liquidity_awareness` 列保留 4 档? |
| Q1(投资目标)和 Q6(目标盈利) | onboarding 已存进 DB,**雷达暂未使用** | 未提及 | 是否要纳入计算?如何用? |

### B. Match% 计算原则
- 现实现:**LLM 驱动**,prompt 里给 LLM 一个数学锚点(`|risk_diff| × 20` + 4 信号惩罚)
- PM.md / temp.md / SPEC.md:**完全没给 Match% 公式**,只在产品段落顺带提及"trending products with personalized match percentages"
- **待 PM 确认**:对 LLM 驱动 Match 是否接受?锚点是否合理?

### C. Tier 阈值 / 颜色映射不一致
- PM.md tier:Fit ≥ 70 / Caution 30-69 / Mismatch < 30
- 现实现 tier:**按信号数量判**(≥3 high → mismatch / ≥1 high 或 ≥3 medium → caution / 否则 fit),**与总分脱钩**
- UI 进度条颜色分区:teal ≥ 70 / amber 40-69 / coral < 40
- 三处口径不一致,**待 PM 给出权威阈值**

### D. 雷达圆点颜色含义
- 现实现:按 `|self − obs|` 差距大小 → teal / amber / coral
- temp.md 第 399 行:**蓝色 = 自评、橙色 = 实际,差距 = 错配**(语义不同 — 用 self/obs 对比色,而非差距大小)
- **待 PM 决定**:保留现状(差距即颜色)还是改成 self/obs 双色?

### E. Onboarding 信息丢失
- Q3 持有期 7 选 1 → DB 只存 5 档枚举(<6m / 6m-1y / 1-3y / 3-5y / 5y+),`Less than a week / ~1 month / ~3 months` 三档全压成 `<6m`
- Q7 资金性质 4 选 1 → DB 只存布尔 `has_short_term_cash_need`
- **待 PM**:是否需要补全颗粒度?

### F. 知识库篇数
- PM.md 第 181 行:**20-30 篇**
- 现实现 + CLAUDE.md:**16 篇**(硬编码于 [lib/articles.ts](app-nextjs/lib/articles.ts))
- **待 PM**:差额怎么处理?

### G. 头条句的语气 / 模板
- 现实现 10 条模板写在代码里(开发起草)
- **待 PM 审核** UI 文案 + 是否需要进一步拆分(比如同样 overestimate,大差距 vs 小差距用不同句式)

### H. RAG 检索尚未实现
- pgvector 尚未启用、知识库未向量化、Layer 2 检索逻辑未写
- 影响:LLM 现在只能基于结构化数据生成解释,不能引用行为金融学专业内容
- 计划:Check-in 3 节点(2026-05-18)前完成

### I. Articles / Advisor 仍是 Mock
- `/api/articles` / `/api/articles/[slug]` 读硬编码 [lib/articles.ts](app-nextjs/lib/articles.ts)
- `/api/advisor/clients` 全部 mock 数据
- **若 PM 想 demo Advisor 视图,这两块必须接 Supabase**

---

## 10. 部署

### 环境变量(Vercel + 本地 `.env.local` 都要)
```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
ANTHROPIC_API_KEY=sk-ant-...
# OPENAI_API_KEY=...    # 仅 RAG 启用后需要(text-embedding-3-small)
```

### 数据库初始化(按顺序)
1. Supabase SQL Editor 执行 [00001_create_tables.sql](app-nextjs/supabase/migrations/00001_create_tables.sql)
2. 执行 [00002_create_check_results.sql](app-nextjs/supabase/migrations/00002_create_check_results.sql)
3. 本地 `cd app-nextjs && npm run seed` 把 CSV 灌入(500 投资者 + 8400+ 交易 + 37 产品)
   - 默认密码 `vett2026`(全部账户)
   - 用户名 `INV0001` ~ `INV0500`

### Vercel 部署清单
- 构建:`npm run build`(应 0 vulnerability、0 type error)
- middleware 自动按 UA 跳转
- L2 缓存依赖 `check_results` 表存在,migration 必须先跑

---

## 11. 关键代码索引

| 模块 | 文件 |
|---|---|
| 信号引擎 + 原始指标 | [app-nextjs/lib/signals.ts](app-nextjs/lib/signals.ts) |
| 五维 + 头条 + 评论 | [app-nextjs/app/api/profile/route.ts](app-nextjs/app/api/profile/route.ts) |
| LLM 调用 + 二级缓存 | [app-nextjs/lib/llm.ts](app-nextjs/lib/llm.ts) |
| Check 详情路由 | [app-nextjs/app/api/check/[ticker]/route.ts](app-nextjs/app/api/check/[ticker]/route.ts) |
| Trending(LLM 优先 + 规则兜底) | [app-nextjs/app/api/products/trending/route.ts](app-nextjs/app/api/products/trending/route.ts) |
| History(同上) | [app-nextjs/app/api/check/history/route.ts](app-nextjs/app/api/check/history/route.ts) |
| UA 跳转 | [app-nextjs/middleware.ts](app-nextjs/middleware.ts) |
| 共享类型 | [app-nextjs/lib/types.ts](app-nextjs/lib/types.ts) |
| Header 菜单 | [components/shared/AppHeader.tsx](app-nextjs/components/shared/AppHeader.tsx) / [components/web/WebHeader.tsx](app-nextjs/components/web/WebHeader.tsx) |
