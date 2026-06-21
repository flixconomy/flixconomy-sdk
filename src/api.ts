import { BASE_URL, loadConfig } from "./config.js";

/**
 * API-Client für die Flixconomy-Infrastruktur.
 *
 * Onboarding läuft als Device-Flow (wie OAuth Device Authorization):
 *   1. deviceStart() -> verification_url + user_code (der Nutzer bestätigt im Browser)
 *   2. devicePoll()  -> sobald bestätigt: Token + Endpunkt
 *
 * Inferenz läuft OpenAI-kompatibel über /v1.
 */

export interface DeviceStart {
  device_code: string;
  user_code: string;
  verification_url: string;
  interval: number; // Poll-Intervall in Sekunden
  expires_in: number;
}

export interface DevicePoll {
  status: "pending" | "ready" | "denied" | "expired";
  token?: string;
  endpoint?: string;
  tier?: string;
  default_model?: string;
}

export interface PlanInfo {
  plan: string;
  requestsPerMinute: number;
  tokensPerDay: number;
  models: string[] | "alle";
  default: boolean;
}

async function req(path: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(`${BASE_URL}${path}`, init);
  return res;
}

export async function deviceStart(): Promise<DeviceStart> {
  const res = await req("/device/start", { method: "POST" });
  if (!res.ok) throw new Error(`Onboarding-Start fehlgeschlagen (HTTP ${res.status})`);
  return (await res.json()) as DeviceStart;
}

export async function devicePoll(deviceCode: string): Promise<DevicePoll> {
  const res = await req("/device/poll", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ device_code: deviceCode }),
  });
  if (!res.ok) throw new Error(`Onboarding-Poll fehlgeschlagen (HTTP ${res.status})`);
  return (await res.json()) as DevicePoll;
}

export interface RegisterResult {
  token: string;
  endpoint?: string;
  tier?: string;
  default_model?: string;
}

/** Direkt-Registrierung ohne Browser (Free) für den autonomen Onboarding-Flow. */
export async function registerDirect(email?: string, model?: string): Promise<RegisterResult> {
  const res = await req("/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, model }),
  });
  if (res.status === 429) throw new Error("Zu viele Registrierungen von dieser Adresse. Bitte später erneut.");
  if (!res.ok) throw new Error(`Registrierung fehlgeschlagen (HTTP ${res.status})`);
  return (await res.json()) as RegisterResult;
}

export async function listPlans(): Promise<{ plans: PlanInfo[]; default_plan: string; default_model: string }> {
  const res = await req("/plans");
  if (!res.ok) throw new Error(`Tarife laden fehlgeschlagen (HTTP ${res.status})`);
  return (await res.json()) as { plans: PlanInfo[]; default_plan: string; default_model: string };
}

export async function listModels(): Promise<string[]> {
  const { token } = loadConfig();
  const res = await req("/v1/models", {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`Modelle laden fehlgeschlagen (HTTP ${res.status})`);
  const data = (await res.json()) as { data?: Array<{ id: string }> };
  return (data.data ?? []).map((m) => m.id);
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function chat(model: string, messages: ChatMessage[]): Promise<string> {
  const { token } = loadConfig();
  if (!token) throw new Error("Nicht verbunden. Bitte zuerst 'flixconomy_onboard' ausführen.");
  const res = await req("/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({ model, messages }),
  });
  if (!res.ok) throw new Error(`Anfrage fehlgeschlagen (HTTP ${res.status})`);
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return data.choices?.[0]?.message?.content ?? "";
}
