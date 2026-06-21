import { homedir } from "node:os";
import { join } from "node:path";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";

/**
 * Basis-URL der Flixconomy-Infrastruktur (deutscher Rechtsraum).
 * Überschreibbar via FLIXCONOMY_API für lokale Tests.
 */
export const BASE_URL = process.env.FLIXCONOMY_API ?? "https://connect.flixconomy.ai";

/** Einheitlicher, gültiger Modell-Fallback (existiert in der echten Modell-Liste). */
export const DEFAULT_MODEL = "gemma4:31b";

/** Zeigt die Basis-URL auf einen lokalen Endpunkt (nur für Tests, nie in Prod-.env)? */
export function isLocalEndpoint(url: string): boolean {
  return /localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\]/.test(url);
}

const CONFIG_DIR = join(homedir(), ".flixconomy");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");

export interface FlixConfig {
  /** Zugangs-Token (flx-...) */
  token?: string;
  /** OpenAI-kompatibler Inferenz-Endpunkt */
  endpoint?: string;
  /** gebuchter Tarif */
  tier?: string;
  /** Standard-Modell */
  defaultModel?: string;
}

export function loadConfig(): FlixConfig {
  try {
    if (!existsSync(CONFIG_FILE)) return {};
    return JSON.parse(readFileSync(CONFIG_FILE, "utf-8")) as FlixConfig;
  } catch {
    return {};
  }
}

export function saveConfig(cfg: FlixConfig): void {
  mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), "utf-8");
}

export function configPath(): string {
  return CONFIG_FILE;
}
