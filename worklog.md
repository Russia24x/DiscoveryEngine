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
