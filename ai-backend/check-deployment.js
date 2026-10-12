import process from "node:process";

const FRONTEND_ORIGIN = "https://satriosusanto.github.io";
const DISALLOWED_ORIGIN = "https://example.invalid";

function fail(message) {
  console.error("FAIL:", message);
  process.exitCode = 1;
}

function normalizeBase(value) {
  let url;
  try { url = new URL(value); }
  catch { throw new Error("Usage: npm run check:deployment -- https://your-service.onrender.com"); }
  if (!["https:", "http:"].includes(url.protocol)) throw new Error("Backend URL must use HTTP or HTTPS.");
  if (url.username || url.password || url.search || url.hash) throw new Error("Pass only the backend origin, without credentials, query, or fragment.");
  if (url.pathname !== "/" && url.pathname !== "") throw new Error("Pass only the backend origin, without a path such as /api/search.");
  return url.origin;
}

async function request(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function main() {
  let base;
  try { base = normalizeBase(process.argv[2] || ""); }
  catch (error) { console.error(error.message); process.exitCode = 2; return; }

  console.log("Checking backend:", base);

  let healthResponse;
  try { healthResponse = await request(base + "/api/health"); }
  catch (error) { fail("Health endpoint unreachable: " + error.message); return; }
  if (!healthResponse.ok) { fail("GET /api/health returned HTTP " + healthResponse.status); return; }

  let health;
  try { health = await healthResponse.json(); }
  catch { fail("Health endpoint did not return valid JSON."); return; }

  if (health.ok !== true) fail("Health payload does not contain ok: true.");
  const models = Array.isArray(health.models) ? health.models : [];
  const loaded = models.filter(model => model.loaded);
  console.log(`Health: ok=${health.ok}; AI configured=${Boolean(health.aiConfigured)}; datasets loaded=${loaded.length}/${models.length}`);
  for (const model of models) {
    console.log(`- ${model.name || model.id || "Unknown model"}: ${model.loaded ? "loaded" : "NOT LOADED"} (${Number(model.records || 0)} records)`);
  }
  if (!models.length || !loaded.length) fail("No searchable datasets are reported as loaded.");
  if (loaded.length !== models.length) console.warn("WARNING: one or more datasets failed to load; review deployment logs and dataset paths.");

  let searchResponse;
  try {
    searchResponse = await request(base + "/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Origin": FRONTEND_ORIGIN },
      body: JSON.stringify({ query: "screw" })
    });
  } catch (error) { fail("POST /api/search failed: " + error.message); return; }

  if (!searchResponse.ok) fail("POST /api/search returned HTTP " + searchResponse.status);
  const allowOrigin = searchResponse.headers.get("access-control-allow-origin");
  if (allowOrigin !== FRONTEND_ORIGIN) fail("Frontend CORS header mismatch: expected " + FRONTEND_ORIGIN + ", got " + (allowOrigin || "(missing)"));
  let search;
  try { search = await searchResponse.json(); }
  catch { fail("Search endpoint did not return valid JSON."); return; }
  if (!Array.isArray(search.results) || !Array.isArray(search.models) || typeof search.aiStatus !== "string") {
    fail("Search response shape is invalid (expected results[], models[], aiStatus).");
  } else {
    console.log(`Search API: valid response; candidates=${search.results.length}; aiStatus=${search.aiStatus}`);
  }

  let blockedResponse;
  try {
    blockedResponse = await request(base + "/api/health", { headers: { "Origin": DISALLOWED_ORIGIN } });
  } catch (error) { fail("Could not verify rejected-origin behavior: " + error.message); return; }
  if (blockedResponse.status !== 403) fail("Expected HTTP 403 for an unapproved Origin, received HTTP " + blockedResponse.status);
  else console.log("CORS rejection: unapproved origin blocked (HTTP 403).");

  if (process.exitCode) {
    console.error("\nDeployment verification FAILED. Do not configure the frontend until issues are resolved.");
  } else {
    console.log("\nDeployment verification PASSED. This test does not expose or require the OpenAI API key.");
  }
}

main().catch(error => { console.error("Unexpected verification error:", error); process.exitCode = 1; });
