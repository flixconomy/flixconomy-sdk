import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const API = process.env.FLIXCONOMY_API ?? "http://localhost:8788";
const txt = (r) => r?.content?.map((c) => c.text).join("\n") ?? "";

const transport = new StdioClientTransport({
  command: "node",
  args: ["dist/index.js"],
  env: { ...process.env, FLIXCONOMY_API: API },
});
const client = new Client({ name: "e2e-test", version: "1.0.0" });
await client.connect(transport);

console.log("\n=== 1) Tools ===");
const { tools } = await client.listTools();
console.log(tools.map((t) => t.name).join(", "));

console.log("\n=== 2) flixconomy_plans (Claude liest Tarife) ===");
console.log(txt(await client.callTool({ name: "flixconomy_plans", arguments: {} })));

console.log("\n=== 3) flixconomy_onboard ===");
const onboard = await client.callTool({ name: "flixconomy_onboard", arguments: {} });
const onboardText = txt(onboard);
const code = onboardText.match(/Code:\s*([A-F0-9]{4}-[A-F0-9]{4})/i)?.[1];
console.log(`  Code: ${code}`);

console.log("\n=== 4) Browser-Registrierung simulieren (E-Mail + Free + gemma4) ===");
const confirm = await fetch(`${API}/onboard/confirm`, {
  method: "POST",
  headers: { "content-type": "application/x-www-form-urlencoded" },
  body: `code=${encodeURIComponent(code)}&email=test@firma.de&plan=Free&model=gemma4:31b`,
});
console.log(confirm.ok ? "  bestätigt ✓" : `  Fehler ${confirm.status}`);

console.log("\n=== 5) flixconomy_complete ===");
console.log(txt(await client.callTool({ name: "flixconomy_complete", arguments: {} })));

console.log("\n=== 6) flixconomy_integrate (Key + Anleitung für die App) ===");
const integrate = txt(await client.callTool({ name: "flixconomy_integrate", arguments: { language: "python" } }));
console.log(integrate);
const hasKey = /FLIXCONOMY_API_KEY=flx-/.test(integrate);
const hasBase = /FLIXCONOMY_BASE_URL=.+\/v1/.test(integrate);
console.log(`\n  -> enthält Key: ${hasKey}, enthält base_url: ${hasBase}`);

console.log("\n=== 7) Doku-Resource lesen ===");
const res = await client.listResources();
console.log("  resources:", res.resources.map((r) => r.uri).join(", "));
const doc = await client.readResource({ uri: "flixconomy://anleitung" });
console.log("  anleitung geladen:", (doc.contents?.[0]?.text ?? "").slice(0, 60), "...");

await client.close();
console.log("\n=== fertig ===");
