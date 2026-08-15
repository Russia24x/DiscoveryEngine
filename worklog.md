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

---

Task ID: 3
Agent: main (cron webDevReview)
Task: QA testing + v1.3 Tokenomics/Unlock Engine + v1.3 Capital Flow/Smart Money + v1.4 Catalyst/Kill Conditions + styling polish

Work Log:
- SESSION-START-SYNC-CHECK: git fetch + status — clean, up-to-date with origin/main.
- QA testing via agent-browser: dashboard, scanner, project detail all working. No console errors. Verified v1.1/v1.2 features (Evidence Graph, Separation Cards, Historical Trends) rendering correctly.
- v1.3 Tokenomics & Unlock Schedule Engine (FRAMEWORK.md §15):
  - New engine module `src/lib/engine/tokenomics.ts`: buildTokenomicsSchedule() projects 12-month unlock + dilution with front-loaded vesting curve. Monthly events with unlockUsd, emissionUsd, buybackUsd, netPressureUsd, netPressurePctOfFloat, cumulativeDilution, pressureLevel (low/moderate/high/extreme).
  - TokenomicsVerdict: healthy/acceptable/concerning/dangerous with composite score (dilution + absorption + pressure + peak).
  - Risk gates: dilution>30%, dilution>50%, SAR<0.1, peak>8%, avg>3%.
  - New component `TokenomicsView`: verdict header, 4 key metric cards, 12-month bar chart with hover tooltips, legend, totals, risk gates panel.
- v1.3 Capital Flow / Smart Money (Nansen-style):
  - New engine module `src/lib/engine/capital-flow.ts`: buildCapitalFlowProfile() generates 5 signals (smart money, whale accumulation, exchange flow, insider concentration, long-term holders) with direction, strength, grade. Composite score (-100 to +100), verdict (strong inflow → strong outflow). Deterministic per-symbol.
  - New component `CapitalFlowView`: half-gauge composite, signal bars with strength meters, direction icons, evidence grades.
- v1.4 Catalyst Calendar & Kill Conditions:
  - New engine module `src/lib/engine/catalyst.ts`: buildCatalystReport() generates upcoming catalysts (unlock, upgrade, governance, earnings, partnership, regulatory, launch) with impact/probability/magnitude. Kill conditions (VAE<10, revenue<0, risk>90, dilution>50%, insider>80%) with safe/watch/triggered status + margin. Risk level: low/moderate/elevated/high.
  - New component `CatalystView`: verdict header, catalyst timeline with day countdown, kill conditions with margin bars.
- Styling improvements:
  - New `DecisionDonut` component: arc-segment donut chart for PASS/INVESTIGATE/REJECT distribution.
  - Scanner: replaced flat stats strip with rich donut card + stats grid.
  - Dashboard hero: added pipeline formula strip (Gate → PQ → ... → IA_final), 'assets tracked' badge, avg confidence display.
- i18n: added tokenomics.*, capitalFlow.*, catalyst.* keys (en + fa RTL).
- API: project-detail now returns tokenomics, capitalFlow, catalystReport.
- Lint clean (0 errors). Committed + pushed (9673a10, 6cabeb5).

Stage Summary:
- v1.3 + v1.4 roadmap items delivered. Project detail now shows: Header → SeparationCards → IA Pipeline + Decision → 5 gauges → HistoricalTrendChart → VAE chain + Supply → TokenomicsView → Gates → Peer Benchmark → Thesis → EvidenceGraphView → CapitalFlowView → CatalystView.
- Verified HYPE: tokenomics healthy (score=86, SAR=6.00, dilution=13.5%, 12 monthly events), capital flow moderate_inflow (+15, 3 inflows/0 outflows, 5 signals), catalyst risk=low (3 catalysts, 5 kill conditions, 0 triggered).
- Scanner shows decision donut. Dashboard shows pipeline strip + assets tracked + avg confidence.
- No browser console errors.

Priority Next (per FRAMEWORK.md §15):
- v2.0: AI Research Copilot + Continuous Monitoring + Automatic Thesis Updates
- Persist historical scores per scan for real trend tracking (currently synthetic)
- Add real on-chain data sources for Capital Flow (Etherscan, Glassnode when key available)
- Add price chart with technical indicators to project detail
- Add portfolio/watchlist feature with alerts

---

Task ID: 4
Agent: main (cron webDevReview)
Task: QA testing + Price Chart + Watchlist + v2.0 AI Research Copilot + styling polish

Work Log:
- SESSION-START-SYNC-CHECK: git fetch + status — clean, up-to-date with origin/main.
- QA testing via agent-browser: all v1.1-v1.4 features rendering correctly. No console errors.
- Price Chart with Technical Indicators:
  - New engine module `src/lib/engine/price-chart.ts`: generatePriceSeries() creates 90-day price + volume + MA7/MA30 + RSI(14) + momentum. Deterministic per symbol. Computes support/resistance, volatility (annualized), trend (bullish/bearish/sideways).
  - New component `PriceChartView` with recharts: 3 views (Price area chart with MA overlays + support/resistance lines, Volume bar chart, RSI area chart with 30/70 reference lines). Indicators row: RSI, MA Cross (golden/death), Momentum (10d), Volatility. MA toggle button.
  - Added to project detail after separation cards.
- Watchlist Feature:
  - New store `src/lib/watchlist-store.ts`: zustand + localStorage persistence. add/remove/update/has operations.
  - New component `WatchlistView`: displays watchlist items enriched with live IA data from /api/projects. Shows logo, symbol, sector, price, IA final, decision badge, thesis status. Empty state with star icon.
  - New component `StarButton`: add/remove from watchlist with toast feedback. Added to project detail header (lg size) + scanner rows (sm size, hover reveal).
  - WatchlistView added to dashboard.
- v2.0 AI Research Copilot (FRAMEWORK.md §15):
  - New API route `POST /api/copilot` using z-ai-web-dev-sdk (backend only). Gathers full project context (scores, thesis, tokenomics, capital flow, catalyst, evidence) and sends to LLM with CryptoSieve framework system prompt. Answers questions about decisions, risks, thesis, catalysts.
  - New component `CopilotChat`: chat UI with message bubbles (user/assistant), 6 suggested questions, loading state with pulse animation, error handling. Added to project detail at the bottom.
  - Verified: HYPE copilot explains "INVESTIGATE because low Valuation (V=14.5) and moderate capital inflows (composite=15) prevent PASS".
- Styling improvements:
  - Dashboard StatCard: added progress bar (0-100) showing metric proportion, hover micro-interaction (icon scale 110%, card shadow).
  - Scanner rows: star button appears on hover.
  - Copilot: grid-bg header, sparkle icon, suggested question chips.
- Lint clean (0 errors). Committed + pushed (788619f, 9fb93c4).

Stage Summary:
- v2.0 AI Copilot delivered. Project detail now shows: Header (+star) → SeparationCards → PriceChartView → IA Pipeline + Decision → 5 gauges → HistoricalTrendChart → VAE chain + Supply → TokenomicsView → Gates → Peer Benchmark → Thesis → EvidenceGraphView → CapitalFlowView → CatalystView → CopilotChat.
- Dashboard: pipeline strip + assets tracked + avg confidence + 4 stat cards with progress bars + top picks + WatchlistView + recent scans.
- Scanner: decision donut + star buttons on rows + filters + CSV export.
- Verified: price chart (RSI=67.7, MA golden cross, momentum +4%), watchlist persists to localStorage, star button works, AI copilot gives context-aware answers. No browser errors.

Priority Next:
- Continuous Monitoring: auto-scan on interval + thesis update alerts
- Real on-chain data sources (Etherscan, Glassnode) for Capital Flow
- Persist historical scores per scan for real trend tracking
- Add comparison view (side-by-side 2-3 projects)
- Portfolio tracker with P&L

---

Task ID: 5
Agent: main (cron webDevReview)
Task: QA testing + Comparison view with radar chart + Market heatmap + scanner sector filter

Work Log:
- SESSION-START-SYNC-CHECK: git fetch + status — clean, up-to-date with origin/main.
- QA testing via agent-browser: all v1.1-v2.0 features rendering correctly. No console errors.
- Comparison View (side-by-side 2-4 projects):
  - New API `POST /api/compare`: computes scores, ranks, tokenomics, capital flow, thesis for each project. Returns winners per metric (best PQ/TQ/VA/V/R/IA).
  - New component `CompareView`: project selector chips (2-4, auto-selects top 3 by IA Final), recharts RadarChart showing PQ/TQ/VA/V/R(inverted)/IA_raw with color-coded overlays, comparison table with winner badges per metric.
  - Fetches available projects from /api/projects if scan results not in store.
- Market Heatmap (sector performance matrix):
  - New API `GET /api/heatmap`: groups universe by sector, computes avg IA Final, avg confidence, total market cap, decision counts per sector.
  - New component `HeatmapView`: sector cards with heat indicator bar (color by avg IA), expandable to show individual projects with decision badges, market rank, price.
- Scanner sector filter:
  - Added sector filter chips (All + each sector) to scanner filters row.
  - Integrated into useMemo filtered logic.
- Navigation: added Compare + Heatmap to nav (en + fa RTL).
- i18n: added compare.*, heatmap.* keys (en + fa RTL).
- Fixed import path bug (./primitives → ../primitives in views subfolder).
- Lint clean (0 errors). Committed + pushed (bc3e846, 1877ec1).

Stage Summary:
- App now has 9 views: Dashboard, Scanner, Project, Compare, Heatmap, Data Sources, News & Social, Settings, Framework.
- Verified: heatmap shows 14 sectors (Yield 16.8, CDP 16.7, Perp DEX 16.6...), compare shows HYPE/MKR/AAVE radar with HYPE as IA Final winner, scanner sector filter works (All/Cross-chain DEX/DEX/Lending/Perp DEX...). No browser errors.

Priority Next:
- Continuous Monitoring: auto-scan on interval + thesis update alerts
- Real on-chain data sources (Etherscan, Glassnode) for Capital Flow
- Persist historical scores per scan for real trend tracking
- Portfolio tracker with P&L
- Add more data sources (CoinMarketCap key-based)

---

Task ID: 6
Agent: main (cron webDevReview)
Task: QA testing + Portfolio tracker + Command palette + market regime indicator

Work Log:
- SESSION-START-SYNC-CHECK: git fetch + status — clean, up-to-date with origin/main.
- QA testing via agent-browser: all 9 views rendering correctly. No console errors.
- Portfolio Tracker:
  - New store `src/lib/portfolio-store.ts`: zustand + localStorage persistence. Positions with symbol, name, entryPrice, quantity, entryDate. computePnl() helper.
  - New component `PortfolioView`: summary header (cost basis, current value, P&L with color coding), positions table (qty, entry, current, value, P&L, IA Final), add position dialog with symbol autocomplete (datalist from /api/projects), auto-fills name + entry price.
  - Empty state with briefcase icon.
- Command Palette (Cmd+K):
  - New component `CommandPalette`: global search triggered by Cmd+K/Ctrl+K keyboard shortcut or clicking Search button in header.
  - Fetches all projects from /api/projects, filters by symbol/name/sector.
  - Keyboard navigation: ↑↓ to navigate, Enter to select, Esc to close.
  - Results show logo, symbol, name, sector, price, market rank, IA Final with color coding.
  - Backdrop blur, animated entry, footer with keyboard hints.
- Market regime indicator on dashboard:
  - Added regime card between hero and quick stats. Shows regime status (Neutral), gradient meter from Risk-Off (red) to Risk-On (green) with indicator dot, M value.
- Navigation: added Portfolio to nav (en + fa RTL). App now has 10 views.
- i18n: added nav.portfolio key (en + fa RTL).
- Lint clean (0 errors). Committed + pushed (6b8ef46, 3a84771).

Stage Summary:
- App now has 10 views: Dashboard, Scanner, Project, Compare, Heatmap, Portfolio, Data Sources, News & Social, Settings, Framework.
- Verified: portfolio shows empty state + add position dialog, command palette opens with Cmd+K and shows HYPE/MKR/AAVE results with keyboard navigation, dashboard shows market regime indicator with gradient meter. No browser errors.

Priority Next:
- Continuous Monitoring: auto-scan on interval + thesis update alerts
- Real on-chain data sources (Etherscan, Glassnode) for Capital Flow
- Persist historical scores per scan for real trend tracking
- Add more data sources (CoinMarketCap key-based)
- Export/import portfolio data

---

Task ID: 7
Agent: main (cron webDevReview)
Task: QA testing + Alerts/notifications system + export/import data backup

Work Log:
- SESSION-START-SYNC-CHECK: git fetch + status — clean, up-to-date with origin/main.
- QA testing via agent-browser: all 10 views rendering correctly. No console errors.
- Alerts/Notifications System:
  - New store `src/lib/alerts-store.ts`: zustand + localStorage persistence. AlertRule (type, symbol, condition, threshold, severity, enabled) + TriggeredAlert (with read state). CRUD operations.
  - New component `AlertsBell`: bell icon in header with unread badge count, dropdown showing recent triggered alerts with severity icons (critical/warn/info), mark all read + clear buttons.
  - New component `AlertsManager`: full alerts management view with rule creation form (type, symbol, threshold, severity), rule list with toggle/remove, demo alerts button.
  - 5 alert types: score_threshold, thesis_change, gate_breach, price_target, decision_change.
- Export/Import Data Backup:
  - New module `src/lib/data-io.ts`: exportAllData() bundles watchlist + portfolio + alert rules into versioned JSON. downloadJson() + importAllData() with deduplication.
  - Settings page: added Data Management card with Export Backup + Import Backup buttons.
- Navigation: added Alerts to nav (en + fa RTL). App now has 11 views.
- i18n: added nav.alerts key (en + fa RTL).
- Lint clean (0 errors). Committed + pushed (4620e56).

Stage Summary:
- App now has 11 views: Dashboard, Scanner, Project, Compare, Heatmap, Portfolio, Alerts, Data Sources, News & Social, Settings, Framework.
- Verified: alerts view shows "Alerts & Notifications" heading + Demo/New rule buttons + empty rules state, bell icon in header with badge, demo alerts trigger correctly, settings shows Data Management with Export/Import buttons. No browser errors.

Priority Next:
- Continuous Monitoring: auto-scan on interval + auto-trigger alerts
- Real on-chain data sources (Etherscan, Glassnode) for Capital Flow
- Persist historical scores per scan for real trend tracking
- Add more data sources (CoinMarketCap key-based)
- Mobile responsive refinements
