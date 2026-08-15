# Worklog — CryptoSieve / DiscoveryEngine

این فایل log مشترک همهٔ agent‌هاست. هر agent قبل از شروع کار باید این فایل را بخواند و بعد از کار، بخش خود را (با `---` جداکننده) اضافه کند.

---

Task ID: 0
Agent: main (orchestrator)
Task: راه‌اندازی بنیاد پروژه — git sync, RULES.md, FRAMEWORK.md, worklog

Work Log:
- بررسی وضعیت git: local روی main با "Initial commit"، remote origin خالی بود (نه behind نه diverged).
- اضافه‌کردن remote origin (GitHub: Russia24x/DiscoveryEngine) با PAT.
- به‌روزرسانی .gitignore برای حذف db/*.db, .env, uploads, sandbox scripts.
- ساخت RULES.md با دو قانون حیاتی: NEVER-FORCE-PUSH و SESSION-START-SYNC-CHECK.
- ساخت FRAMEWORK.md به‌عنوان سند افتتاحیهٔ قفل‌شدهٔ معماری (v1.0): pipeline کامل، فرمول‌های PQ/TQ/VA/V/R/IA، Evidence Graph، Thesis Engine، Dynamic Peer Benchmarking، معماری آینده‌نگرانه.

Stage Summary:
- سند بنیاد قفل شد: FRAMEWORK.md (v1.0).
- قوانین git در RULES.md تعریف شد.
- آمادهٔ فاز پیاده‌سازی: Prisma schema → i18n → Data Sources → Scoring Engine → API → UI.

---

Task ID: 1
Agent: main (orchestrator)
Task: پیاده‌سازی کامل موتور تصمیم‌گیری + UI + API + کامیت GitHub

Work Log:
- Prisma schema کامل: Project, Metric, Evidence, RiskEntry, Thesis, DataSource, ScanRecord, NewsSource, NewsItem (pushed to SQLite).
- i18n دو زبانه سفارشی (context-based، بدون locale routing چون فقط / مجاز): fa (RTL) + en (LTR)، فونت Vazirmatn + Geist، ThemeScript برای جلوگیری از FOUC.
- Scoring Engine (pure TS، platform-independent): types, vae (chain + supply), gates (mechanism-aware), components (PQ/TQ/VA/V/R با وزن‌های قفل‌شده)، ia (IA_raw, C, M)، decision (explainable)، thesis (intact %)، peer-benchmark (percentile engine)، orchestrator (scoreProject + rankUniverse).
- Data Sources Layer پلاگین‌پذیر: CoinGecko + DeFiLlama + Binance (رایگان، بدون کلید) با fetchWithTimeout (4s) + stub‌های کلیددار CMC/Messari/Nansen برای آینده. Bundled dataset 22 پروژهٔ نماینده با fundamentals واقع‌گرایانه به‌عنوان fallback/seed. collectUniverse: bundle base + live market overlay.
- API routes: /api/scan (fire-and-forget DB persist), /api/market, /api/projects, /api/project-detail, /api/datasources, /api/news.
- UI/UX مدرن: AppShell با sidebar + glass header، Dashboard، Scanner (جدول 4-رتبه‌ای + فیلتر + CSV export)، Project Detail (IA pipeline، 5 gauge، VAE chain، gates، supply، peer benchmark، thesis، evidence)، Data Sources، News & Social، Settings، Framework reference. تم dark-first با accent emerald، scrollbar سفارشی، animations.
- رفع باگ confidence: computeConfidence حالا dataCompleteness را از فیلدهای input محاسبه می‌کند (نه placeholder 0).
- Lint تمیز (0 error). Commit + push به GitHub (Russia24x/DiscoveryEngine) موفق.

Stage Summary:
- محصول کامل و قابل‌اجرا: https://github.com/Russia24x/DiscoveryEngine
- تأیید end-to-end با agent-browser: داشبورد فارسی RTL، اسکن با 22 پروژه (live prices از CoinGecko + bundle fundamentals)، HYPE: iaRaw=19.5 C=0.95 iaEff=18.5 iaFinal=18.1 INVESTIGATE با thesis "Perp DEX tollbooth"، gates، peer benchmark، VAE chain.
- toggle زبان (fa/en)، footer sticky، بدون خطای browser.
- Cron job 15-min webDevReview تنظیم شد (job_id 324036).

Unresolved / Risks:
- dev server در sandbox پس از پایان Bash tool call می‌میرد (process reaping). Watchdog ساخته شد اما خودش هم reaped می‌شود. cron job باید سرور را restart کند.
- داده‌های bundle نمونه‌اند (per FRAMEWORK.md §16)؛ برای production باید با منابع اولیه جایگزین شوند.
- v1.1+ هنوز پیاده‌سازی نشده (Evidence Graph deepening، Historical Score، Smart Money، Catalyst Engine).

Priority Next (per FRAMEWORK.md §15):
- v1.1: Evidence Graph واقعی (claims با source/freshness/contradictions)، Project/Token/Investment separation برجسته‌تر.
- v1.2: Historical Score (روند IA در زمان)، Percentile Engine غنی‌تر.
- افزودن RSS feed fetcher واقعی برای News view.
- افزودن نمودارهای recharts برای روند PQ/TQ/IA.

---

Task ID: 2
Agent: main (cron webDevReview)
Task: QA testing + v1.1 Evidence Graph + v1.2 Historical Trends + Separation Cards + RSS fetcher

Work Log:
- SESSION-START-SYNC-CHECK: git fetch + status — clean, up-to-date with origin/main.
- QA testing via agent-browser: dashboard, scanner, project detail, framework view all working. No console errors. Scanner shows 22 ranked projects (HYPE #1, MKR #2, AERO #3). Project detail renders IA pipeline, VAE chain, gates, thesis, peer benchmark.
- v1.1 Evidence Graph (FRAMEWORK.md §10):
  - New engine module `src/lib/engine/evidence.ts`: buildEvidenceGraph() generates real evidence claims with source, timestamp, freshness, confidence, grade (A/B/C), direction, weight, category, contradiction links.
  - Metric nodes with historical + trend + mini sparkline. Risk nodes with severity + status. Contradiction auto-detection (e.g. revenue up but VAE low → contradiction).
  - Summary: strongest/weakest claim, avg confidence, avg grade.
  - New component `EvidenceGraphView`: summary strip, contradiction alerts, claim cards grid, metric sparklines, risk bars.
- v1.1 Separation Cards (FRAMEWORK.md §3): Project ≠ Token ≠ Investment. 4 prominent score cards + verdict bar classifying alignment.
- v1.2 Historical Score Trends: generateHistoricalScores() (deterministic 90d trend per symbol), HistoricalTrendChart with recharts (area + line modes, metric selector chips, delta indicator).
- News & Social: real RSS fetcher (no external dep), POST /api/news/sync endpoint, default feeds + sync buttons in UI.
- i18n: added evidence.*, separation.*, historical.* keys (en + fa RTL).
- Lint clean (0 errors). Committed + pushed to GitHub (4d28065).

Stage Summary:
- v1.1 + v1.2 roadmap items delivered. Project detail now shows: header → SeparationCards → IA Pipeline + Decision → 5 gauges → HistoricalTrendChart → VAE chain + Supply → Gates → Peer Benchmark → Thesis → EvidenceGraphView.
- Verified HYPE: separation verdict 'Mixed signals — investigate further', 7 evidence claims (6 positive, avg grade A), strongest claim 'VAE 32%', historical trend chart with 7 series.
- No browser console errors.

Priority Next (per FRAMEWORK.md §15):
- v1.3: Tokenomics/Unlock Engine deepening + Capital Flow / Smart Money evidence
- v1.4: Catalyst Engine (catalyst calendar) + Kill Conditions tracking
- v2.0: AI Research Copilot + Continuous Monitoring + Automatic Thesis Updates
- Add more data sources (CoinMarketCap key-based when key provided)
- Persist historical scores per scan for real trend tracking (currently synthetic)
