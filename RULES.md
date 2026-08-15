# RULES.md — CryptoSieve / DiscoveryEngine

این فایل قوانین حاکم بر توسعهٔ پروژه است. هر agent / contributor **موظف** است پیش از هر تغییری این قوانین را بخواند و رعایت کند.

---

## ۱. SESSION-START-SYNC-CHECK

در ابتدای هر session و بعد از هر gap زمانی، **قبل از هر تغییر جدید**:

```bash
a. git fetch origin
b. git status
c. اگر "behind" یا "diverged" از origin/main دیده شد: STOP فوری، گزارش بده، منتظر تصمیس بمون.
d. اگر clean / up-to-date بود، فقط آنوقت ادامه بده.
```

**هدف:** اطمینان از اینکه local دقیقاً با آخرین commit verified شده در GitHub یکی است. محیط sandbox/container ممکن است بهم بخورد؛ ملاک نهایی GitHub است.

---

## ۲. NEVER-FORCE-PUSH

```
git push --force   ← مطلقاً ممنوع
git push -f        ← مطلقاً ممنوع
git push --force-with-lease   ← باز هم ممنوع در این پروژه
```

اگر `git push` عادی rejected شد (non-fast-forward):

1. **STOP فوری.**
2. گزارش بده: چه commit‌هایی محلی‌اند، remote روی چه وضعی است.
3. منتظر تصمیس انسان بمون. هرگز force نزن.

دلیل: جلوگیری از overwrite شدن کار verified شده روی GitHub.

---

## ۳. COMMIT DISCIPLINE

- هر تغییر منطقی → یک commit با پیام واضح.
- فرمت پیام: `type(scope): summary` (مثلاً `feat(engine): add VAE computation`).
- قبل از commit: `bun run lint` را اجرا کن و خطاهای سطح error را برطرف کن.
- هرگز فایل‌های `.env*` (به جز `.env.example`)، کلید API، یا `*.db` را commit نکن.

---

## ۴. ARCHITECTURE LOCK

معماری اسکورینگ و فرمول‌های تعریف‌شده در `FRAMEWORK.md` **قفل‌شده** هستند. تغییر در وزن‌ها، فرمول‌ها یا ترتیب pipeline فقط با:

1. ثبت PR با توضیح دلیل.
2. به‌روزرسانی `FRAMEWORK.md` با نسخهٔ جدید.
3. bump شماره نسخهٔ framework.

انجام می‌شود. هیچ agentی حق ندارد سilent‌ وزن‌ها را تغییر دهد.

---

## ۵. LANGUAGE & I18N

- تمام UI دو زبانه است: فارسی (RTL) + انگلیسی (LTR).
- رشته‌های کاربری هرگز hard-code نمی‌شوند؛ همیشه از `src/i18n/messages` استفاده شود.
- منطق engine از زبان مستقل است.

---

## ۶. DATA SOURCES

- لایهٔ data sources پلاگین‌پذیر است.
- هر source یک adapter با interface واحد implements می‌کند.
- source‌های رایگان فعلی: CoinGecko (free), DeFiLlama (free), Binance (free).
- source‌های کلیددار آینده: CoinMarketCap, Messari, Nansen — interface باید `apiKey?` را پشتیبانی کند.
- هیچگاه کلید API را در client-side قرار نده.
