// Type-safe i18n message keys. Derived from the English dictionary so fa must match en shape.
import type { en } from "./messages/en";

export type Dictionary = typeof en;

export type Locale = "fa" | "en";
