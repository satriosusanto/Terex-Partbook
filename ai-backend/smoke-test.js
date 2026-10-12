import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.join(here, "server.js");

function reservePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const { port } = probe.address();
      probe.close(error => error ? reject(error) : resolve(port));
    });
  });
}

async function waitForHealth(baseUrl, child) {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error("Backend exited early with code " + child.exitCode);
    try {
      const response = await fetch(baseUrl + "/api/health");
      if (response.ok) return response;
    } catch { /* server is still starting */ }
    await new Promise(resolve => setTimeout(resolve, 150));
  }
  throw new Error("Backend did not become healthy within 10 seconds");
}

const port = await reservePort();
const baseUrl = "http://127.0.0.1:" + port;
const env = { ...process.env, PORT: String(port), ALLOWED_ORIGIN: "https://satriosusanto.github.io" };
delete env.OPENAI_API_KEY;

const child = spawn(process.execPath, [serverPath], {
  cwd: path.resolve(here, ".."),
  env,
  stdio: ["ignore", "pipe", "pipe"]
});
let logs = "";
child.stdout.on("data", chunk => { logs += chunk.toString(); });
child.stderr.on("data", chunk => { logs += chunk.toString(); });

try {
  const healthResponse = await waitForHealth(baseUrl, child);
  const health = await healthResponse.json();
  assert.equal(health.ok, true, "health endpoint should report ok");
  assert.equal(health.aiConfigured, false, "test should run without an API key");
  assert.ok(health.models.some(model => model.name === "Franna MAC25" && model.loaded), "MAC25 dataset should load");

  const searchResponse = await fetch(baseUrl + "/api/search", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Origin": "https://satriosusanto.github.io" },
    body: JSON.stringify({ query: "T177667", model: "Franna MAC25" })
  });
  assert.equal(searchResponse.status, 200, "valid search should succeed");
  const search = await searchResponse.json();
  assert.ok(search.results.some(item => item.partNumber === "T177667" && item.model === "Franna MAC25"), "search should return the known part record");
  assert.equal(search.aiStatus, "not_configured", "deterministic search should work without OpenAI");

  const emptyResponse = await fetch(baseUrl + "/api/search", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: " " })
  });
  assert.equal(emptyResponse.status, 400, "blank query should be rejected");

  const longResponse = await fetch(baseUrl + "/api/search", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: "x".repeat(201) })
  });
  assert.equal(longResponse.status, 400, "overlong query should be rejected");

  const blockedOrigin = await fetch(baseUrl + "/api/search", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Origin": "https://example.invalid" },
    body: JSON.stringify({ query: "T177667" })
  });
  assert.equal(blockedOrigin.status, 403, "unexpected origin should be rejected");

  console.log("AI backend smoke tests passed.");
} catch (error) {
  console.error("AI backend smoke tests failed:", error);
  if (logs) console.error(logs);
  process.exitCode = 1;
} finally {
  child.kill("SIGTERM");
}
