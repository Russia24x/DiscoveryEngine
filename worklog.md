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

---

Task ID: 8
Agent: main (cron webDevReview)
Task: QA testing + continuous monitoring + historical score persistence

Work Log:
- SESSION-START-SYNC-CHECK: git fetch + status — clean, up-to-date with origin/main.
- QA testing via agent-browser: all 11 views rendering correctly. No console errors.
- Continuous Monitoring (auto-scan + alert triggers):
  - New hook `src/lib/use-monitoring.ts`: useMonitoring() manages auto-scan interval (60s minimum), persists config to localStorage, restores on mount. Compares scan results with previous to auto-trigger alerts when: IA Final drops below threshold, decision changes, gate breach, thesis status changes.
  - Settings page: added Continuous Monitoring card with enable/disable switch, interval selector (1m/5m/10m/30m/1h), ACTIVE badge with pulse animation.
  - App shell: monitoring status indicator bar in header (green when active, primary shimmer when scanning).
- Historical Score Persistence (real trend tracking):
  - New Prisma model HistoricalScore: stores pq/tq/va/v/r/iaRaw/confidence/iaEffective/iaFinal/decision/marketRank per project per scan.
  - Updated scan route persistScan(): creates HistoricalScore records in bulk via ScanRecord.scores relation (nested write).
  - New API GET /api/history?symbol=X: returns historical score records for a project. Without symbol, returns recent scans with score counts.
  - Verified: HYPE has 1 persisted score (iaFinal=18.2, INVESTIGATE), 20 scans recorded with 22 scores each.
- Lint clean (0 errors). Committed + pushed (49b55dd).

Stage Summary:
- App now has continuous monitoring with auto-scan + auto-trigger alerts, and real historical score persistence per scan.
- Verified: settings shows Continuous Monitoring card with interval selector, history API returns persisted scores (HYPE iaFinal=18.2, 20 scans with 22 scores each), header shows monitoring status bar. No browser errors.

Priority Next:
- Real on-chain data sources (Etherscan, Glassnode) for Capital Flow
- Add more data sources (CoinMarketCap key-based)
- Mobile responsive refinements
- Use real historical scores in HistoricalTrendChart (currently synthetic)
- Add comparison of historical scores between projects

---

Task ID: 9
Agent: main (cron webDevReview)
Task: QA testing + real historical scores in trend chart + AI Copilot streaming

Work Log:
- SESSION-START-SYNC-CHECK: git fetch + status — clean, up-to-date with origin/main.
- QA testing via agent-browser: all 11 views rendering correctly. No console errors.
- Real Historical Scores in Trend Chart:
  - Updated project-detail API to fetch real HistoricalScore records from DB.
    If 2+ scans exist, uses real persisted scores with scan-based labels
    (e.g. '4scans', '3scans', 'now'). Falls back to synthetic for new projects.
  - padHistory() helper ensures at least 6 data points by repeating first entry.
  - Verified: HYPE trend now shows real labels ['5scans','4scans','3scans','2scans','1scans','now'] with actual PQ values.
- AI Copilot Streaming:
  - New API POST /api/copilot-stream: SSE streaming endpoint using z-ai-web-dev-sdk with stream:true. Returns text/event-stream with data chunks.
  - Updated CopilotChat: tries streaming first, falls back to non-streaming /api/copilot if stream produces no content. Streaming cursor (animated blinking bar) shows while content is being received.
  - MessageBubble: added streaming prop with animated cursor, fade-up animation on all messages.
- Lint clean (0 errors). Committed + pushed (40051d9).

Stage Summary:
- Historical trend chart now uses REAL persisted scores from scans instead of synthetic data.
- AI Copilot supports streaming responses with fallback to non-streaming.
- Verified: HYPE detail shows "5scans", "4scans"... labels in trend chart, AI Copilot present at bottom of detail page. No browser errors.

Priority Next:
- Real on-chain data sources (Etherscan, Glassnode) for Capital Flow
- Add more data sources (CoinMarketCap key-based)
- Mobile responsive refinements
- Add comparison of historical scores between projects
- Performance optimizations for large universes

---

Task ID: 10
Agent: main (cron webDevReview)
Task: QA testing + Custom Project Analyzer (manual fundamentals entry)

Work Log:
- SESSION-START-SYNC-CHECK: git fetch + status — clean, up-to-date with origin/main.
- QA testing via agent-browser: all 11 views rendering correctly. No console errors.
- Custom Project Analyzer:
  - New API `POST /api/custom-project`: accepts manually entered fundamentals (market data, value accrual chain PR/PC/TC, supply pressures, component scores 0-100) and returns full scoring result with all analysis modules (scores, thesis, evidence graph, tokenomics, capital flow, catalyst, price series, peer benchmarking against bundle universe).
  - New component `CustomProjectView`: comprehensive form with sections for basic info, market data, value accrual chain, supply pressures, and component scores. Quick presets (Strong Perp DEX, Weak Token Strong Project, High Risk Speculative) for instant testing.
  - Result renders: separation cards, 5 component gauges, price chart, historical trend, tokenomics, evidence graph, capital flow, catalyst — the full project detail analysis pipeline.
- Navigation: added Custom to nav (en + fa RTL). App now has 12 views.
- i18n: added customProject.* keys (en + fa RTL).
- Lint clean (0 errors). Committed + pushed (1832620).

Stage Summary:
- App now has 12 views: Dashboard, Scanner, Project, Compare, Heatmap, Portfolio, Alerts, Custom, Data Sources, News & Social, Settings, Framework.
- Verified: TEST project (Strong Perp DEX preset) scored iaRaw=21.4, iaFinal=17.9, INVESTIGATE with all analysis modules (tokenomics, evidence graph, capital flow, catalyst, price series). Custom view shows form with presets and Analyze button. No browser errors.

Priority Next:
- Real on-chain data sources (Etherscan, Glassnode) for Capital Flow
- Add more data sources (CoinMarketCap key-based)
- Mobile responsive refinements
- Performance optimizations for large universes
- Add keyboard shortcuts help overlay

---

Task ID: 11
Agent: main (cron webDevReview)
Task: QA testing + scanner presets + density toggle + keyboard shortcuts

Work Log:
- SESSION-START-SYNC-CHECK: git fetch + status — clean, up-to-date with origin/main.
- QA testing via agent-browser: all 12 views rendering correctly. No console errors.
- Scanner Presets:
  - Added 6 quick filter presets: All, Top Gainers, Undervalued, High VAE, Low Risk, High Confidence.
  - Each preset filters and sorts results (e.g. Top Gainers: revenueGrowth >= 20, sorted desc).
  - Preset chips appear above the filters card. Active preset highlighted.
  - Sort buttons hidden when a preset is active.
- Scanner Density Toggle:
  - Added density toggle button (Rows3/Rows4 icon) to switch between comfortable and compact row heights.
- Keyboard Shortcuts Help Overlay:
  - New component `KeyboardHelp`: press ? to toggle a help overlay showing all keyboard shortcuts with kbd styling.
  - Shortcuts: Cmd+K (search), ? (help), Esc (close), G+D/S/P/C/H/A/F/N (navigate views), T (toggle theme), L (toggle language).
  - G+key navigation implemented in AppShell with 800ms timeout window.
  - T and L shortcuts for theme/language switching.
- Lint clean (0 errors). Committed + pushed (1edff3a).

Stage Summary:
- Scanner now has 6 quick presets, density toggle, and the app has full keyboard navigation.
- Verified: scanner shows Presets chips (Top Gainers, Undervalued, High VAE, Low Risk, High Confidence), clicking filters results. No browser errors.

Priority Next:
- Real on-chain data sources (Etherscan, Glassnode) for Capital Flow
- Add more data sources (CoinMarketCap key-based)
- Mobile responsive refinements
- Performance optimizations for large universes

---

Task ID: 12
Agent: main (code review + bug fixes)
Task: Comprehensive codebase review and engineering improvements

Work Log:
- SESSION-START-SYNC-CHECK: git fetch + status — clean, up-to-date with origin/main.
- Launched 3 parallel review agents (engine, API routes, React components) to identify bugs.
- Fixed critical engine bugs:
  - V formula: replaced broken `1 - mc/tc` (always 0 for real projects) with P/E-style normalization `clamp(100 - ratio*5, 0, 100)`.
  - FDR: fixed USD/token dimensional mismatch (unlockEmission12m is USD, floatSupply is tokens). HYPE FDR: 0.09 → 0.0024.
  - Tokenomics dilution: same USD/token fix. HYPE dilution: 13.5% → 0.24%.
  - priceChange90d: added to ProjectInput type + propagated in toProjectInput. Price chart trend was always 0.
  - evidence.ts: fixed generateHistoricalScores call shape (was missing iaRaw/iaEffective/iaFinal). IA sparklines were all-zeros.
  - capital-flow.ts: fixed exchange flow signal inversion + insider direction swap.
  - gates.ts: fixed `conditional: input.buybackThesis ?? false` type error.
- Fixed security issues:
  - SSRF protection in /api/news POST: URL scheme validation (http/https only), block internal IPs + AWS metadata endpoint.
  - Copilot LLM role: changed from 'assistant' to 'system' for system prompt.
- Fixed React anti-patterns:
  - use-monitoring.ts: replaced non-reactive configRef with useState. Monitoring toggle was non-functional.
  - i18n/provider.tsx: fixed stale resolvedTheme in system mode via systemPrefDark state.
  - copilot-chat.tsx: added AbortController to prevent memory leaks on unmount.
  - compare.tsx: fixed auto-select overriding user deselection via userInteractedRef. Moved toast out of setState updater.
  - scanner.tsx: added keyboard accessibility (tabIndex, role, aria-label, onKeyDown).
  - Removed dead code in app-shell.tsx, dashboard.tsx, copilot-stream/route.ts.
- Lint clean (0 errors). Committed + pushed (1fd7c97, a23d4cb).

Stage Summary:
- 3 critical engine bugs fixed (V formula, FDR units, dilution units) — scores are now mathematically correct.
- 2 security vulnerabilities fixed (SSRF, LLM role).
- 4 React anti-patterns fixed (monitoring reactivity, theme reactivity, copilot abort, compare auto-select).
- Scanner table rows now keyboard accessible.
- Verified: HYPE FDR=0.0024 (was 0.09), dilution=0.24% (was 13.5%), SSRF blocked, copilot system role works.

Priority Next:
- Cache collectUniverse() result with TTL to avoid hammering free APIs
- Batch DB upserts in scan route (currently N+1 sequential)
- Add error states to views that silently swallow errors
- Replace custom modals with Radix Dialog for a11y
- Add range validation to custom-project component scores

---

Task ID: 13
Agent: main (engineering improvements)
Task: Performance optimizations, input validation, error states

Work Log:
- SESSION-START-SYNC-CHECK: git fetch + status — clean, up-to-date with origin/main.
- Universe caching with TTL:
  - Added 60s TTL cache in collectUniverse(). Caches the full universe (inputs + live flag + sources) to avoid hammering CoinGecko/DeFiLlama on every request.
  - Scan route uses skipCache:true to always get fresh data.
  - clearUniverseCache() exported for manual invalidation.
  - Verified: 2nd project-detail call 1.09s → 0.02s (48x faster).
- Batch DB upserts:
  - Scan route: replaced sequential for-loop of N await db.project.upsert() with db.$transaction(enriched.map(...)) for parallel execution in a single transaction. Reduces N round-trips to 1.
  - News sync: replaced sequential for-loop of db.newsItem.create() with db.newsItem.createMany() in a $transaction with deleteMany. Atomic + fast.
- Input validation:
  - Compare API: validates all symbols are non-empty strings (rejects numbers/nulls with 400). Deduplicates case-insensitively.
  - History API: clamps limit to 1-100 range. NaN → 20 default. Prevents unbounded queries.
  - Custom-project API: clampScore() for 0-100 component scores, clampNonNeg() for USD amounts. tokenUtility=99999 → clamped to 100.
- Error states:
  - Dashboard: added error state with AlertTriangle icon + retry button. Previously silently swallowed fetch errors.
  - Dashboard runScan: error in post-scan refresh now sets error state.
- Lint clean (0 errors). Committed + pushed (495091e).

Stage Summary:
- Universe caching delivers 48x speedup on repeated project-detail/compare/heatmap requests.
- All DB writes are now batched in transactions (scan upserts, news sync).
- All API inputs are validated and clamped (symbols, limits, scores, USD amounts).
- Dashboard shows proper error states instead of silently failing.

Priority Next:
- Add error states to remaining views (heatmap, portfolio, compare)
- Replace custom modals with Radix Dialog for accessibility
- Add contentEditable guard to keyboard shortcuts
- Add client-disconnect handling to copilot-stream
- Consider Redis or edge-cache for multi-instance deployments

---

Task ID: 14
Agent: main (engineering improvements round 2)
Task: Fix useLive coercion, copilot-stream disconnect, error states, a11y guards

Work Log:
- SESSION-START-SYNC-CHECK: git fetch + status — clean, up-to-date with origin/main.
- Fixed useLive string coercion bug in scan route: 'false' (string) is truthy, so useLive was always true. Now explicitly checks === false || === 'false'. Verified: useLive:'false' → live:false.
- Added client-disconnect handling to copilot-stream: listens to req.signal 'abort' event and ReadableStream.cancel() callback. Stops consuming LLM tokens after client disconnects. Errors now sent as 'event: error' SSE instead of 'data:' to avoid being rendered as content.
- Fixed news DELETE: returns 404 (not 500) when feed not found. Catches Prisma P2025 error code.
- Added try/catch to news GET and datasources GET for consistent JSON error responses.
- Added error states to heatmap (AlertCircle + retry button), portfolio (price fetch error banner), and compare (toast.error on fetch failure).
- Added contentEditable guard to keyboard shortcuts in app-shell and keyboard-help.
- Lint clean (0 errors). Committed + pushed (d7cd80d).

Stage Summary:
- useLive string coercion fixed — 'false' string now correctly disables live mode.
- Copilot stream stops consuming tokens on client disconnect (cost + resource savings).
- All views now have proper error states instead of silent failures.
- News DELETE returns correct 404 for missing resources.
- Keyboard shortcuts respect contentEditable elements.

Priority Next:
- Replace custom modals (command-palette, keyboard-help) with Radix Dialog for focus trapping
- Add CSV escaping in scanner export (double-quote handling)
- Add pagination to /api/projects for large universes
- Consider rate limiting on copilot endpoints
