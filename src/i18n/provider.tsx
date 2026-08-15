"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { en } from "./messages/en";
import { fa } from "./messages/fa";
import type { Dictionary, Locale } from "./types";

type Theme = "light" | "dark" | "system";

type I18nContextValue = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: Dictionary;
  dir: "rtl" | "ltr";
  theme: Theme;
  setTheme: (t: Theme) => void;
  resolvedTheme: "light" | "dark";
};

const I18nContext = createContext<I18nContextValue | null>(null);

const dictionaries: Record<Locale, Dictionary> = { en, fa };

const LOCALE_KEY = "cryptosieve.locale";
const THEME_KEY = "cryptosieve.theme";

function readStoredLocale(): Locale {
  if (typeof window === "undefined") return "fa";
  return (localStorage.getItem(LOCALE_KEY) as Locale) || "fa";
}

function readStoredTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  return (localStorage.getItem(THEME_KEY) as Theme) || "dark";
}

function systemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

// Inline script (rendered once) to set the theme class + dir BEFORE first paint,
// preventing FOUC and hydration attribute mismatch.
export function ThemeScript() {
  const code = `(function(){try{var l=localStorage.getItem('${LOCALE_KEY}')||'fa';var t=localStorage.getItem('${THEME_KEY}')||'dark';var d=document.documentElement;var resolved=t==='system'?(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):t;d.lang=l;d.dir=l==='fa'?'rtl':'ltr';if(resolved==='dark'){d.classList.add('dark')}else{d.classList.remove('dark')}}catch(e){}})();`;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  // Lazy-init from localStorage (SSR returns defaults; suppressHydrationWarning handles mismatch).
  const [locale, setLocaleState] = useState<Locale>(readStoredLocale);
  const [theme, setThemeState] = useState<Theme>(readStoredTheme);

  const resolvedTheme: "light" | "dark" = theme === "system" ? systemTheme() : theme;

  // DOM sync — no setState here, just external system writes.
  useEffect(() => {
    const dir = locale === "fa" ? "rtl" : "ltr";
    document.documentElement.lang = locale;
    document.documentElement.dir = dir;
  }, [locale]);

  useEffect(() => {
    const root = document.documentElement;
    if (resolvedTheme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
  }, [resolvedTheme]);

  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      const root = document.documentElement;
      if (mq.matches) root.classList.add("dark");
      else root.classList.remove("dark");
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try {
      localStorage.setItem(LOCALE_KEY, l);
    } catch {}
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    try {
      localStorage.setItem(THEME_KEY, t);
    } catch {}
  }, []);

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale,
      t: dictionaries[locale],
      dir: locale === "fa" ? "rtl" : "ltr",
      theme,
      setTheme,
      resolvedTheme,
    }),
    [locale, setLocale, theme, setTheme, resolvedTheme]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}

export function useT() {
  const { t } = useI18n();
  return t;
}
