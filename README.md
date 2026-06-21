# @flixconomy/client

Rechtssichere KI-Infrastruktur aus Deutschland – direkt aus Ihrer KI-Coding-Umgebung.

Dieses Paket stellt einen **MCP-Server** bereit. Sie installieren ihn in Claude Code,
Claude Desktop, Cursor oder Windsurf; Ihr KI-Tool übernimmt dann **Registrierung,
Auth-Token und die Verbindung zum deutschen Rechencluster** – Sie müssen nur bestätigen
(„Agentic Onboarding").

## Installation

```bash
npm install @flixconomy/client
```

Danach in der Config Ihrer KI-Umgebung eintragen:

**Claude Code** (`.mcp.json`)
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

(Für Claude Desktop, Cursor und Windsurf identisch – nur der Config-Pfad unterscheidet
sich; siehe Website.)

## Onboarding

Sagen Sie Ihrem KI-Tool z. B.: *„Richte Flixconomy ein."* Der Ablauf:

1. **`flixconomy_onboard`** – startet die Einrichtung, liefert einen Bestätigungs-Link.
2. Sie öffnen den Link im Browser und bestätigen.
3. **`flixconomy_complete`** – schließt ab, speichert den Token unter `~/.flixconomy/config.json`.

## Tools

| Tool | Zweck |
|------|-------|
| `flixconomy_onboard` | Einrichtung starten (Device-Flow, Bestätigungs-Link) |
| `flixconomy_complete` | Einrichtung abschließen, Token speichern |
| `flixconomy_status` | Verbindungsstatus, Tarif, Endpunkt |
| `flixconomy_models` | verfügbare Modelle auflisten |
| `flixconomy_chat` | Anfrage an ein Modell senden |

## Architektur

- **Endpunkt:** `https://connect.flixconomy.ai` (überschreibbar via `FLIXCONOMY_API`)
- **Auth:** Device-Flow (`/device/start`, `/device/poll`) → Bearer-Token
- **Inferenz:** OpenAI-kompatibel über `/v1/chat/completions` und `/v1/models`
- **Lokale Config:** `~/.flixconomy/config.json`

Daten verlassen den deutschen Rechtsraum nie – auch nicht für die Inferenz.

## Entwicklung

```bash
npm install
npm run build      # tsc -> dist/
npm start          # MCP-Server (stdio)
```

> Status: technische Basis. Der Endpunkt `connect.flixconomy.ai` wird derzeit aufgebaut;
> die API-Verträge (Device-Flow, /v1) stehen, das Backend folgt.
