import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const API = "http://localhost:8787";
const txt = (r) => r?.content?.map((c) => c.text).join("\n") ?? "";

const transport = new StdioClientTransport({
  command: "node",
  args: ["dist/index.js"],
  env: { ...process.env, FLIXCONOMY_API: API },
});
const client = new Client({ name: "e2e-test", version: "1.0.0" });
await client.connect(transport);

console.log("\n=== 1) Tools, die der MCP-Server anbietet ===");
const { tools } = await client.listTools();
console.log(tools.map((t) => t.name).join(", "));

console.log("\n=== 2) flixconomy_onboard ===");
const onboard = await client.callTool({ name: "flixconomy_onboard", arguments: {} });
const onboardText = txt(onboard);
console.log(onboardText);

// user_code aus der Antwort parsen und Browser-Bestätigung simulieren
const code = onboardText.match(/Code:\s*([A-F0-9]{4}-[A-F0-9]{4})/i)?.[1];
console.log(`\n=== 3) Browser-Bestätigung simulieren (code ${code}) ===`);
const confirm = await fetch(`${API}/onboard/confirm`, {
  method: "POST",
  headers: { "content-type": "application/x-www-form-urlencoded" },
  body: `code=${encodeURIComponent(code)}`,
});
console.log(confirm.ok ? "bestätigt ✓" : `Fehler ${confirm.status}`);

console.log("\n=== 4) flixconomy_complete ===");
console.log(txt(await client.callTool({ name: "flixconomy_complete", arguments: {} })));

console.log("\n=== 5) flixconomy_status ===");
console.log(txt(await client.callTool({ name: "flixconomy_status", arguments: {} })));

console.log("\n=== 6) flixconomy_models ===");
console.log(txt(await client.callTool({ name: "flixconomy_models", arguments: {} })));

console.log("\n=== 7) flixconomy_chat (gemma4:31b) ===");
console.log(txt(await client.callTool({
  name: "flixconomy_chat",
  arguments: { model: "gemma4:31b", prompt: "Antworte in einem Satz: läuft der SDK-Flow?" },
})));

await client.close();
console.log("\n=== fertig ===");
