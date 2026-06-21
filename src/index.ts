#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { BASE_URL, loadConfig, saveConfig, configPath } from "./config.js";
import { deviceStart, devicePoll, listModels, chat } from "./api.js";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** device_code aus dem letzten onboard-Aufruf, damit der Agent ihn nicht durchreichen muss. */
let pendingDeviceCode: string | null = null;

const server = new McpServer({ name: "flixconomy", version: "0.1.0" });

function text(t: string) {
  return { content: [{ type: "text" as const, text: t }] };
}
function fail(t: string) {
  return { content: [{ type: "text" as const, text: t }], isError: true };
}

// ── Onboarding starten ────────────────────────────────────────────────
server.tool(
  "flixconomy_onboard",
  "Startet die Einrichtung der Flixconomy-KI-Infrastruktur (deutscher Rechtsraum). Gibt einen Bestätigungs-Link zurück, den der Nutzer im Browser öffnet. Danach 'flixconomy_complete' aufrufen.",
  {},
  async () => {
    const cfg = loadConfig();
    if (cfg.token) {
      return text(`Bereits mit Flixconomy verbunden. Tarif: ${cfg.tier ?? "?"}, Endpunkt: ${cfg.endpoint ?? BASE_URL}.`);
    }
    try {
      const d = await deviceStart();
      pendingDeviceCode = d.device_code;
      return text(
        `Einrichtung gestartet. Bitte diesen Link öffnen und bestätigen:\n\n` +
          `  ${d.verification_url}\n  Code: ${d.user_code}\n\n` +
          `Sobald Sie bestätigt haben, rufe 'flixconomy_complete' auf, um die Verbindung abzuschließen.`,
      );
    } catch (e) {
      return fail(`Onboarding konnte nicht gestartet werden: ${(e as Error).message}`);
    }
  },
);

// ── Onboarding abschließen ────────────────────────────────────────────
server.tool(
  "flixconomy_complete",
  "Schließt die Einrichtung ab: prüft die Bestätigung und speichert den Zugangs-Token lokal. Nach 'flixconomy_onboard' aufrufen, sobald der Nutzer den Link bestätigt hat.",
  { device_code: z.string().optional().describe("optional, sonst wird der laufende Vorgang genutzt") },
  async ({ device_code }) => {
    const code = device_code ?? pendingDeviceCode;
    if (!code) return fail("Kein laufender Vorgang. Bitte zuerst 'flixconomy_onboard' aufrufen.");
    try {
      for (let i = 0; i < 30; i++) {
        const p = await devicePoll(code);
        if (p.status === "ready" && p.token) {
          saveConfig({ token: p.token, endpoint: p.endpoint, tier: p.tier, defaultModel: "gemma-3-thinking" });
          pendingDeviceCode = null;
          return text(`Verbunden! Tarif: ${p.tier ?? "?"}. Endpunkt: ${p.endpoint ?? BASE_URL}. Konfiguration gespeichert unter ${configPath()}.`);
        }
        if (p.status === "denied") return fail("Die Einrichtung wurde abgelehnt.");
        if (p.status === "expired") return fail("Der Bestätigungs-Link ist abgelaufen. Bitte 'flixconomy_onboard' erneut aufrufen.");
        await sleep(2000);
      }
      return text("Noch nicht bestätigt. Bitte den Link im Browser bestätigen und 'flixconomy_complete' erneut aufrufen.");
    } catch (e) {
      return fail(`Abschluss fehlgeschlagen: ${(e as Error).message}`);
    }
  },
);

// ── Status ────────────────────────────────────────────────────────────
server.tool(
  "flixconomy_status",
  "Zeigt den aktuellen Verbindungsstatus zur Flixconomy-Infrastruktur (Tarif, Endpunkt, Standard-Modell).",
  {},
  async () => {
    const cfg = loadConfig();
    if (!cfg.token) return text("Nicht verbunden. Mit 'flixconomy_onboard' einrichten.");
    return text(
      `Verbunden mit Flixconomy.\n  Tarif:   ${cfg.tier ?? "?"}\n  Endpunkt: ${cfg.endpoint ?? BASE_URL}\n  Modell:  ${cfg.defaultModel ?? "?"}`,
    );
  },
);

// ── Modelle ───────────────────────────────────────────────────────────
server.tool(
  "flixconomy_models",
  "Listet die verfügbaren KI-Modelle auf der Flixconomy-Infrastruktur.",
  {},
  async () => {
    try {
      const models = await listModels();
      return text(models.length ? `Verfügbare Modelle:\n${models.map((m) => `  - ${m}`).join("\n")}` : "Keine Modelle gefunden.");
    } catch (e) {
      return fail(`Modelle konnten nicht geladen werden: ${(e as Error).message}`);
    }
  },
);

// ── Chat / Inferenz ───────────────────────────────────────────────────
server.tool(
  "flixconomy_chat",
  "Sendet eine Anfrage an ein Modell auf der Flixconomy-Infrastruktur und gibt die Antwort zurück.",
  {
    prompt: z.string().describe("die Eingabe an das Modell"),
    model: z.string().optional().describe("Modell-ID, sonst Standard-Modell"),
  },
  async ({ prompt, model }) => {
    const cfg = loadConfig();
    if (!cfg.token) return fail("Nicht verbunden. Bitte zuerst 'flixconomy_onboard' ausführen.");
    try {
      const answer = await chat(model ?? cfg.defaultModel ?? "gemma-3-thinking", [
        { role: "user", content: prompt },
      ]);
      return text(answer);
    } catch (e) {
      return fail(`Anfrage fehlgeschlagen: ${(e as Error).message}`);
    }
  },
);

// ── Start ─────────────────────────────────────────────────────────────
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("flixconomy MCP-Server läuft (stdio).");
}

main().catch((e) => {
  console.error("Fataler Fehler:", e);
  process.exit(1);
});
