# @flixconomy/client

Rechtssichere KI-Infrastruktur aus Deutschland – direkt aus Ihrer KI-Coding-Umgebung.

Dieses Paket stellt einen **MCP-Server** bereit. Sie installieren ihn in Claude Code,
Claude Desktop, Cursor oder Windsurf; Ihr KI-Tool übernimmt dann **Registrierung,
Auth-Token und die Anbindung Ihrer Anwendung** an das deutsche Rechencluster – Sie sagen
nur „mach's" („Agentic Onboarding").

## Installation

In der Config Ihrer KI-Umgebung eintragen, **Claude Code** (`.mcp.json`):
```json
{
  "mcpServers": {
    "flixconomy": {
      "command": "npx",
      "args": ["-y", "@flixconomy/client"]
    }
  }
}
```
(Claude Desktop, Cursor, Windsurf identisch – nur der Config-Pfad unterscheidet sich.)

## Der schnelle Weg (empfohlen)

Sagen Sie Ihrem KI-Tool: *„Binde meine App kostenlos an Flixconomy an."* Ablauf:

1. **`flixconomy_quickstart`** – richtet **kostenlos (Free) ohne Browser** einen Zugang ein
   und liefert sofort die Integrationsanweisung (Key + Code-Snippet).
2. Das KI-Tool schreibt die `.env` (`FLIXCONOMY_API_KEY`, `FLIXCONOMY_BASE_URL`) und biegt
   Ihren OpenAI-kompatiblen Client auf den Endpunkt um.
3. Ihre App läuft auf deutscher GPU. Fertig.

Für zahlende Tarife / explizite Browser-Bestätigung gibt es zusätzlich den Device-Flow
(`flixconomy_onboard` → bestätigen → `flixconomy_complete`).

## Tools

| Tool | Zweck |
|------|-------|
| `flixconomy_quickstart` | **Free ohne Browser** einrichten + Integrationsanweisung (empfohlen) |
| `flixconomy_plans` | verfügbare Tarife (Free/Starter/Pro/Dedicated) |
| `flixconomy_integrate` | Key + Code-Snippet, um die App anzubinden (wenn bereits verbunden) |
| `flixconomy_onboard` | Einrichtung per Browser-Bestätigung starten (Device-Flow) |
| `flixconomy_complete` | Device-Flow abschließen, Token speichern |
| `flixconomy_status` | Verbindungsstatus – **mit Live-Check gegen das Backend** |
| `flixconomy_models` | verfügbare Modelle (tarif-gefiltert) |
| `flixconomy_chat` | Anfrage an ein Modell senden (Test/interaktiv) |
| `flixconomy_revoke` | Token widerrufen (sofort ungültig) + lokal entfernen |

## Architektur

- **Endpunkt:** `https://connect.flixconomy.ai` (überschreibbar via `FLIXCONOMY_API` – nur für Tests)
- **Auth:** Bearer-Token, serverseitig nur als Hash gespeichert
- **Inferenz:** OpenAI-kompatibel über `/v1/chat/completions` und `/v1/models`
- **Lokale Config:** `~/.flixconomy/config.json` (Token wird vor Wiederverwendung gegen das Backend validiert)

Daten verlassen den deutschen Rechtsraum nie – auch nicht für die Inferenz.

## Entwicklung

```bash
npm install
npm run build      # tsc -> dist/
npm start          # MCP-Server (stdio)
node test-e2e.mjs  # End-to-End gegen ein Backend (FLIXCONOMY_API setzen)
```
