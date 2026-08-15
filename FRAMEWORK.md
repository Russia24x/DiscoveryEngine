# FRAMEWORK.md — CryptoSieve Investment Decision Engine

> **STATUS: LOCKED (v1.0)**
>
> این سند معماری رسمی و قفل‌شدهٔ موتور تصمیم‌گیری سرمایه‌گذاری CryptoSieve است.
> هر تغییر نیازمند PR + bump نسخه است (ر.ک `RULES.md` §4).

---

## ۰. Positioning

CryptoSieve یک **Crypto Investment Decision Engine** است.

نه screener. نه dashboard. نه news aggregator.

**خروجی محصول پاسخ به این یک سؤال است:**

> «از بین پروژه‌های زیادی که امروز جلوی من هستند، کدام واقعاً ارزش بررسی/سرمایه‌گذاری دارد، چرا، چه شواهدی این را ثابت می‌کند، و دقیقاً چه چیزی این تصمیم را باطل می‌کند؟»

زیرعنوان: **Discover → Verify → Evaluate → Value → Decide**

---

## ۱. معماری نهایی (Pipeline)

```
Gate → PQ → TQ → VA → V → R → IA_raw → C → IA_effective → M → IA_final
```

| مرحله | نماد | خروجی |
|---|---|---|
| Gate | — | Reject / Pass (مکانیزم‌آگاه) |
| Project Quality | `PQ` | 0–100 |
| Token Quality | `TQ` | 0–100 |
| Value Accrual | `VA` | 0–100 |
| Valuation | `V` | 0–100 |
| Risk | `R` | 0–100 |
| IA خام (Fundamental) | `IA_raw` | عدد |
| Confidence Factor | `C` | 0.70–1.00 |
| IA مؤثر | `IA_effective` | `IA_raw × C` |
| Market Regime Modifier | `M` | 0.90–1.10 |
| IA نهایی | `IA_final` | `IA_raw × C × M` |

---

## ۲. فرمول‌های قفل‌شده

### ۲.۱ IA خام (Fundamental)

```
IA_raw = ( PQ^0.20 · TQ^0.25 · VA^0.20 · V^0.35 ) / ( R_safe^0.15 )
```

با `R_safe = max(R, 1)`.

### ۲.۲ IA مؤثر (با Confidence)

```
IA_effective = IA_raw × C
```

با `C ∈ [0.70, 1.00]`.

### ۲.۳ IA نهایی (با Market Regime)

```
IA_final = IA_raw × C × M
```

با `M ∈ [0.90, 1.10]`.

---

## ۳. تفکیک رتبه‌بندی — چهار رتبه

| رتبه | مبنای محاسبه | کاربرد |
|---|---|---|
| **Fundamental Rank** | `IA_raw` | کیفیت ذاتی دارایی |
| **Confidence Rank** | `C` | کیفیت داده |
| **Effective Rank** | `IA_effective` | ترکیب کیفیت + اطمینان |
| **Market Rank** | `IA_final` | قابل‌اجرا با شرایط بازار |

**تفسیر مدل:** نمی‌گوییم «A از B بهتر است.» می‌گوییم:

> «A فعلاً بالاترین امتیاز با اطمینان داده‌ای بالا را دارد. B بالاترین IA خام را دارد اما عدم‌قطعیت داده‌ای آن زیاد است.»

---

## ۴. Gate — مکانیزم‌آگاه

```
VAE < 10       ⇒ Reject   (Universal)
δ   < 5        ⇒ Reject   (Universal)
R   > 90       ⇒ Reject   (Universal)
SAR < 0.1      ⇒ Reject   (Conditional — فقط وقتی Buyback/Burn جزء thesis اقتصادی توکن باشد)
```

**SAR فقط زمانی Gate است که value accrual از مسیر Buyback/Burn باشد.** اگر value accrual از مسیر staking یا fee sharing باشد، SAR Gate اعمال نمی‌شود.

---

## ۵. تعریف تمیز VAE — زنجیرهٔ انتقال ارزش

```
GEA  ──α──▶  PR  ──α_c──▶  PC  ──δ──▶  TC
```

| نماد | تعریف | فرمول |
|---|---|---|
| `GEA` | Gross Economic Activity | — |
| `PR`  | Protocol Revenue | — |
| `PC`  | Protocol Capture | — |
| `TC`  | Tokenholder Capture | — |
| `α`   | Protocol Capture Rate | `PC / PR` |
| `δ`   | Distribution Rate | `TC / PC` |
| `VAE` | Value Accrual Efficiency | `TC / PR = α × δ` |

**هر متغیر فقط یک معنی دارد. Audit کردن مدل ساده است.**

---

## ۶. اجزای اصلی

### ۶.۱ PQ — Project Quality

```
PQ = 0.30·RG + 0.25·RS + 0.20·RD + 0.15·MP + 0.10·UG
```

| نماد | تعریف |
|---|---|
| `RG` | Revenue Growth |
| `RS` | Revenue Stability |
| `RD` | Revenue Diversification |
| `MP` | Market Position / Moat |
| `UG` | User Growth |

### ۶.۲ TQ — Token Quality

```
TQ = 0.30·VAE + 0.20·SAR + 0.20·(1−FDR_n) + 0.20·TU + 0.10·GQ
```

| نماد | تعریف |
|---|---|
| `VAE` | Value Accrual Efficiency |
| `SAR` | Supply Absorption Ratio |
| `FDR` | Future Dilution Risk (نرمال‌شده) |
| `TU`  | Token Utility |
| `GQ`  | Governance Quality |

### ۶.۳ VA — Value Accrual

```
VA = 0.30·α + 0.30·δ + 0.25·τ + 0.15·BA
```

| نماد | تعریف |
|---|---|
| `α`  | Protocol Capture Rate |
| `δ`  | Distribution Rate |
| `τ`  | Trend (پایداری VAE در زمان) |
| `BA` | Buyback Activity |

### ۶.۴ V — Valuation

```
V = 0.25·(1−MC/TC_n) + 0.25·(1−MC/PR_n) + 0.20·TY + 0.15·(1−FDV/TC_n) + 0.15·IG
```

| نماد | تعریف |
|---|---|
| `MC`  | Market Cap |
| `TC`  | Tokenholder Capture (سالانه) |
| `PR`  | Protocol Revenue (سالانه) |
| `FDV` | Fully Diluted Valuation |
| `TY`  | Token Yield |
| `IG`  | Incentive Gravity |

### ۶.۵ R — Risk

```
R = 0.25·RC + 0.20·IC + 0.20·REG + 0.15·SC + 0.10·ML + 0.10·DR
```

| نماد | تعریف |
|---|---|
| `RC`  | Revenue Concentration Risk |
| `IC`  | Insider / Concentration Risk |
| `REG` | Regulatory Risk |
| `SC`  | Smart Contract Risk |
| `ML`  | Market Liquidity Risk |
| `DR`  | Dependency Risk |

---

## ۷. معیارهای عرضه — سه‌گانه

| معیار | فرمول | نقش |
|---|---|---|
| `SAR` | `(Buyback + Burn) / (Unlock + Emission)` | نسبت جذب فشار |
| `NSP` | `Unlock + Emission − Burn − Buyback` | مقدار واقعی فشار خالص |
| `FDR` | `(12m Unlock + Emission) / Current Float` | ریسک رقیق‌شدن آینده |

---

## ۸. Confidence Factor

```
C = f(Data Completeness, Source Quality, Model Stability)
```

| سطح داده | `C` |
|---|---|
| کامل و ممیزی‌شده | 1.00 |
| کامل ولی تخمینی | 0.85 |
| ناقص ولی قابل‌استفاده | 0.70 |
| بسیار ناقص | **رد** (Gate) |

---

## ۹. Market Regime Modifier

```
M ∈ [0.90, 1.10]
```

Momentum دیگر بخشی از Valuation نیست. حداکثر ۱۰٪ تأثیر دارد و **نمی‌تواند یک دارایی گران را ارزان جلوه دهد.**

محاسبهٔ `M` بر اساس وضعیت کلی بازار (BTC trend, total mcap trend, volatility regime) انجام می‌شود.

---

## ۱۰. Evidence Graph

هر پروژه یک Evidence Graph دارد:

```
Project
 │
 ├── Claim
 │    ├── Source
 │    ├── Timestamp
 │    ├── Freshness
 │    ├── Confidence
 │    ├── Contradictions
 │    └── Evidence Grade
 │
 ├── Metric
 │    ├── Current
 │    ├── Historical
 │    ├── Peer percentile
 │    └── Trend
 │
 └── Risk
      ├── Evidence
      ├── Severity
      └── Status
```

فلسفه: **Evidence > Narrative.**

---

## ۱۱. Explainable Decision Engine

خروجی به‌جای یک عدد، یک ساختار تصمیم است:

```
DECISION: INVESTIGATE

Why:
  + Revenue +41% / 90d
  + TVL +27%
  + Strong product-market fit
  + Token supply improving

Against:
  - 18% unlock next 12m
  - Revenue concentration = high
  - Governance concentration = high

What changes the decision:
  → unlock acceleration
  → revenue < X
  → TVL drawdown > Y
```

---

## ۱۲. Thesis Engine

برای هر پروژه یک Thesis زنده:

```
THESIS
────────────────────────
Perp DEX tollbooth thesis

WHY IT WORKS
  ✓ Revenue
  ✓ Market share
  ✓ Liquidity
  ✓ Product moat

WHAT MUST STAY TRUE
  ✓ Revenue > $X
  ✓ Market share > Y%
  ✓ Buyback > Z
  ✓ Unlock absorption > ...

WHAT BREAKS IT
  ✕ Revenue -40%
  ✕ Market share < X%
  ✕ Governance failure
  ✕ Unlock > absorption

LATEST EVIDENCE
  ↑ Positive
  ↑ Positive
  → Neutral
  ↓ Negative

THESIS STATUS
  73% intact
```

هر بار که دادهٔ جدید می‌آید، سیستم می‌پرسد: **آیا Thesis تقویت شد، تضعیف شد یا باطل شد؟**

---

## ۱۳. Dynamic Peer Benchmarking

برای هر پروژه، percentile در میان peer group محاسبه می‌شود:

```
Revenue Growth        91st percentile
P/R                   63rd percentile
Revenue/TVL           89th percentile
Token Unlock Risk     18th percentile
User Growth           78th percentile
Protocol Moat         86th percentile

Relative Investment Attractiveness: 84/100
```

---

## ۱۴. معماری محصول (آینده‌نگرانه)

```
┌─────────────────────────────────────────────┐
│  Presentation Layer                          │
│  (Web / Mobile / Desktop — shareable UI)     │
├─────────────────────────────────────────────┤
│  Decision Engine                             │
│  (Scoring + Evidence + Thesis + Decision)    │
├─────────────────────────────────────────────┤
│  Data Sources Layer (pluggable adapters)     │
│  CoinGecko · DeFiLlama · Binance · CMC · …   │
├─────────────────────────────────────────────┤
│  Storage (Prisma + SQLite; swappable)        │
└─────────────────────────────────────────────┘
```

- لایهٔ Decision Engine از presentation و data مستقل است تا روی Web/Mobile/Desktop اجرا شود.
- Data sources پلاگین‌پذیر: رایگان (بدون کلید) فعلی + کلیددار آینده با interface یکسان.

---

## ۱۵. نقشهٔ نسخه‌ها

| نسخه | محتوا |
|---|---|
| **v1.0** (این سند) | معماری قفل + پایهٔ engine |
| v1.1 | Evidence Graph + Project/Token/Investment separation + Explainable Decision |
| v1.2 | Peer Benchmarking + Percentile Engine + Historical Score |
| v1.3 | Unlock/Tokenomics Engine + Capital Flow / Smart Money |
| v1.4 | Thesis Engine + Catalyst Engine + Kill Conditions |
| v2.0 | AI Research Copilot + Continuous Monitoring + Automatic Thesis Updates |

---

## ۱۶. نکتهٔ حیاتی

داده‌های مثال (HYPE/SKY/AAVE) در مستندات صرفاً **نمونه**‌اند. برای اجرای واقعی، تمام اجزای مدل باید با داده‌های زنده و منابع اولیه/قابل‌ممیزی دوباره محاسبه شوند.

این framework یک **معماری** است، نه یک خروجی نهایی.

---

## ۱۷. کارت مرجع نهایی

```
IA_raw        = ( PQ^0.20 · TQ^0.25 · VA^0.20 · V^0.35 ) / ( R_safe^0.15 )
IA_effective  = IA_raw × C
IA_final      = IA_raw × C × M
Rank_Fundamental = Rank(IA_raw)
Rank_Actionable  = Rank(IA_final)
VAE           = α × δ = TC / PR
```

---

**LOCKED — v1.0 — CryptoSieve Investment Decision Engine**
