// Helper: read data source config from DB and decrypt API keys.
// Used by API routes to pass { enabledKeys, apiKeys } to collectUniverse.
import { db } from "@/lib/db";
import { decrypt } from "@/lib/crypto";

export interface SourceConfig {
  enabledKeys: string[];
  apiKeys: Record<string, string>;
}

// Free adapters are always enabled unless explicitly disabled.
const FREE_DEFAULTS = ["coingecko", "defillama", "binance", "cmc"];

export async function getSourceConfig(): Promise<SourceConfig> {
  try {
    const sources = await db.dataSource.findMany();
    const enabledKeys: string[] = [];
    const apiKeys: Record<string, string> = {};

    for (const s of sources) {
      if (s.enabled) {
        enabledKeys.push(s.key);
        if (s.apiKey) {
          const decrypted = decrypt(s.apiKey);
          if (decrypted) {
            apiKeys[s.key] = decrypted;
          }
        }
      }
    }

    // If no config in DB, use defaults (all free adapters enabled).
    if (enabledKeys.length === 0) {
      return { enabledKeys: FREE_DEFAULTS, apiKeys: {} };
    }

    return { enabledKeys, apiKeys };
  } catch {
    // DB not available — use defaults.
    return { enabledKeys: FREE_DEFAULTS, apiKeys: {} };
  }
}
