# SDK-Befunde aus dem Demo-Setup (flixconomy-demo)

Aufgenommen beim Anbinden von `flixconomy-demo` an die echte Infrastruktur
(`connect.flixconomy.ai`). Alle Punkte sind **beobachtet/verifiziert**, nicht vermutet.
Ziel: das SDK so härten, dass der „Magic"-Flow auch nach Wiederholungen und
nach Lokaltests zuverlässig auf die richtige Infrastruktur zeigt.

---

## P1 — Stale-Config-Falle (kritisch)

**Was:** `flixconomy_quickstart` registriert nur neu, wenn gar kein Token existiert:

```js
// dist/index.js:133  /  src/index.ts:182
if (!existing.token) { ... registerDirect(email) ... }
```

Die Config liegt global in `~/.flixconomy/config.json`. Lag dort ein **alter** Token
(z.B. aus einem früheren Lokaltest), überspringt quickstart die Registrierung
komplett und baut die Integration aus der alten Config.

**Konkret passiert:** Die vorhandene Config zeigte auf
`"endpoint": "http://localhost:8788"` (der gemma4-channel, **nicht** das Backend).
Hätte ich quickstart blind vertraut, wäre in die Demo-`.env`
`FLIXCONOMY_BASE_URL=http://localhost:8788/v1` geschrieben worden — die App hätte
„funktioniert", aber **am deutschen Backend vorbei**. Das Kernversprechen
(„rechtssichere deutsche Infrastruktur") wäre still gebrochen worden.

**Fix-Vorschläge:**
- quickstart sollte den vorhandenen Token vor Wiederverwendung **validieren**
  (1 Call gegen `/v1/models`); bei 401/Unreachable neu registrieren.
- Endpoint-Mismatch erkennen: wenn `cfg.endpoint` ≠ aktuelles `BASE_URL`, warnen
  oder neu registrieren.
- Optionaler `force: boolean`-Parameter zum erzwungenen Neu-Onboarding.

---

## P1 — `flixconomy_status` meldet „Verbunden" ohne echten Check

**Was:** `status` gibt „Verbunden" zurück, sobald *irgendein* Token in der Datei steht
— ohne das Backend zu fragen (`src/index.ts:81–88`).

**Folge:** Im Stale-Fall hätte status gemeldet „Verbunden mit … http://localhost:8788"
— technisch wahr, aber irreführend für eine Infrastruktur-Demo. Ein toter/ungültiger
Token (siehe P3) wird ebenfalls als „Verbunden" angezeigt.

**Fix:** status sollte einen leichten Live-Check (`/v1/models`) machen und
„verbunden & erreichbar" vs. „Token vorhanden, aber nicht erreichbar/ungültig"
unterscheiden.

---

## P2 — Modell-Fallback inkonsistent **und** ungültig

**Was:** Das chat-Tool nutzt einen anderen Default als der Rest des Codes:

```js
// dist/index.js:86  /  src/index.ts:117
chat(model ?? cfg.defaultModel ?? "gemma-3-thinking", ...)
```

Überall sonst lautet der Fallback `"gemma4:31b"`
(`src/index.ts:58,156` u.a.). `"gemma-3-thinking"` taucht in der echten
Modell-Liste **nicht** auf — verfügbar sind:
`gemma4-31b-nothink:latest`, `gemma4:31b`, `gemma4:latest`.

**Folge:** Fehlt `cfg.defaultModel`, fragt das chat-Tool ein nicht existierendes
Modell an → Request schlägt fehl.

**Fix:** Einheitlichen, gültigen Fallback verwenden (`gemma4:31b`), idealerweise
zentral als Konstante.

---

## P2 — Endpoint-Persistenz kann localhost in die Prod-`.env` schreiben

**Was:** `buildIntegration` baut die Base-URL aus der gespeicherten Config:

```js
// src/index.ts:155
const apiBase = `${(cfg.endpoint ?? BASE_URL).replace(/\/$/, "")}/v1`;
```

Wurde via `FLIXCONOMY_API=http://localhost:8788` einmal lokal getestet, landet
genau dieser Endpoint in der Config — und damit in der `.env` der Nutzer-App.
Eng verwandt mit P1; eigene Zeile, weil hier der **Output-Pfad** das Problem ist.

**Fix:** Für den Integrations-Output zwischen „Test-Endpoint" und
„Prod-Endpoint" trennen, oder localhost-Endpoints in `buildIntegration`
explizit ablehnen/warnen.

---

## P3 — Toter Demo-Key + falscher Ausgangszustand (Demo-Hygiene)

**Was:**
- Die Demo-`.env` enthielt einen **toten** Key (`flx-5e9f…`, Backend-Antwort 401).
  `.env` ist nicht in git — lag als Altlast lokal aus einem früheren Test.
- Das Demo-`README` beschreibt den Startzustand als „noch auf OpenAI", aber
  `chat.mjs` war bereits auf Flixconomy umgebogen. Der dokumentierte Reset
  (`git checkout chat.mjs && rm -f .env`) war nach dem letzten Test nicht gelaufen.

**Folge:** Der „Magic"-Test ist nicht reproduzierbar — ein Zuschauer startet nicht
vom sauberen Vorher-Zustand.

**Fix:** Reset-Schritt in den Demo-Flow erzwingen (z.B. `npm run demo:reset`),
und keine `.env` mit Beispiel-Keys im Ordner liegen lassen.

---

## P3 — SDK-README ist veraltet / unvollständig

**Was:** Das README dokumentiert nur
`onboard / complete / status / models / chat`. Der eigentliche **Magic-Flow**
— `flixconomy_quickstart` (Free, ohne Browser) — sowie `integrate`, `plans`
und das neue `revoke` fehlen.

**Folge:** Ein Agent/Nutzer, der dem README folgt, findet den browserlosen
Hauptweg gar nicht und landet im langsameren Device-Flow.

**Fix:** README an den tatsächlichen Tool-Satz angleichen; quickstart als
empfohlenen Weg dokumentieren.

---

## P3 — Token-Wildwuchs beim Testen

**Was:** Jeder `register`/`quickstart`-Lauf legt einen neuen Account + Token an;
`registerDirect` wirft bei Wiederholung 429 (`src/api.ts`).
Es gibt keinen automatischen Cleanup.

**Status:** Teilweise adressiert — während dieses Setups kam ein
`flixconomy_revoke`-Tool hinzu (s.u.). Empfehlung: revoke in den Test-/Reset-Flow
einbauen, damit Test-Tokens nicht akkumulieren.

---

## Beobachtung — paralleler Build während des Setups

Während der Demo-Arbeit wurde der SDK-Quellcode **parallel geändert und neu
gebaut**: von 8 auf 9 Tools (neu: `flixconomy_revoke`, `src/index.ts:210`,
`src/api.ts:84`). `src` und `dist` sind jetzt in sync. Kein Bug — aber wer am SDK
baut, während eine Demo live darauf zeigt, sollte das koordinieren
(ein laufender `tsc --watch` o.ä. kann den getesteten Stand unter den Füßen
wegziehen).

---

## Was am Setup gut lief

- Der browserlose `/register`-Flow funktioniert sauber und schnell.
- OpenAI-Kompatibilität stimmt: die unveränderte Demo-App (`openai`-SDK gegen
  `base_url`) lief sofort gegen `gemma4:31b`.
- `buildIntegration` liefert eine klare, agententaugliche Schritt-für-Schritt-Anweisung.
- Der MCP-Server startet stabil; alle Tools antworten über stdio.
