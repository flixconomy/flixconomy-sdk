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

console.log("\n=== 2) flixconomy_quickstart (autonom, ohne Browser) ===");
const qs = txt(await client.callTool({ name: "flixconomy_quickstart", arguments: { email: "magic@firma.de", language: "python" } }));
console.log(qs);

console.log("\n=== Prüfungen ===");
console.log("  enthält Key:", /FLIXCONOMY_API_KEY=flx-/.test(qs));
console.log("  enthält base_url /v1:", /FLIXCONOMY_BASE_URL=.+\/v1/.test(qs));
console.log("  enthält Code-Snippet:", /OpenAI\(/.test(qs));

console.log("\n=== 3) flixconomy_chat (Token aus quickstart funktioniert -> GPU) ===");
const chat = txt(await client.callTool({ name: "flixconomy_chat", arguments: { prompt: "Sag in einem Satz hallo." } }));
console.log(" ", chat.slice(0, 120));

console.log("\n=== 4) Doku-Resource ===");
const doc = await client.readResource({ uri: "flixconomy://anleitung" });
console.log("  geladen:", (doc.contents?.[0]?.text ?? "").slice(0, 50), "...");

await client.close();
console.log("\n=== fertig ===");
