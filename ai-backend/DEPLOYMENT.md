# Deploy TEREX PartBook AI Backend

This guide prepares the backend for deployment as a separate container service. The GitHub Pages frontend remains static.

## Recommended first deployment: Render Blueprint

For the easiest setup, use Render with the repository's root-level `render.yaml`. It configures a Docker Web Service, Singapore region, health check, allowed frontend origin, model name, and a secret variable prompt for the OpenAI key.

1. Review and merge the deployment configuration PR into `main`.
2. Sign in to Render and choose **New → Blueprint**.
3. Connect the `satriosusanto/Terex-Partbook` repository and select branch `main`.
4. Review the service settings from `render.yaml`. Choose the Free plan for a trial, or a paid plan if the service must remain responsive without idle sleep.
5. When prompted, enter `OPENAI_API_KEY` as a secret environment variable in Render. Do not put the key in GitHub, `render.yaml`, the Dockerfile, or frontend JavaScript.
6. Start the deployment. After it finishes, open `https://<your-render-service>/api/health`. Confirm `ok: true`, `aiConfigured: true`, and the expected datasets show as loaded.
7. Copy the exact HTTPS service origin from Render. In a separate branch and pull request, set `AI_API_BASE` in `part-search.html` to that origin only, without `/api/search` at the end. Leave it blank until the service URL is known and verified.

**Free-plan note:** Render's free web services sleep after 15 minutes without traffic and can take about a minute to wake up. Use this tier for trial/testing, not for a production experience that needs consistently fast responses. See [Render free instance limitations](https://render.com/docs/free) and [Docker deployment instructions](https://render.com/docs/docker).

## 1. Verify a deployed service

Once Render has assigned a URL, run this from the repository root with Node.js 20 or newer:

```bash
npm --prefix ai-backend run check:deployment -- https://YOUR-SERVICE.onrender.com
```

Replace the example origin with the exact HTTPS origin shown in Render. Pass only the origin (no `/api/health`, `/api/search`, credentials, or trailing path). The checker:

- requests `GET /api/health` and reports loaded datasets;
- sends a harmless `POST /api/search` query and checks the response shape;
- verifies that the GitHub Pages origin receives the expected CORS header;
- verifies that an unapproved origin receives HTTP 403.

The checker does not need or read `OPENAI_API_KEY`. A successful API smoke check confirms that the service responds; separately confirm `aiConfigured: true` in the health output before expecting AI explanations. It warns if only some datasets load.

## 2. Build the container locally (optional)

Run these commands from the repository root (the folder containing `Dockerfile`):

```bash
docker build -t terex-partbook-ai -f Dockerfile .
docker run --rm -p 8787:8787 \
  -e PORT=8787 \
  -e ALLOWED_ORIGIN=https://satriosusanto.github.io \
  terex-partbook-ai
```

Check health in another terminal:

```bash
curl http://localhost:8787/api/health
```

Without `OPENAI_API_KEY`, the backend should still return deterministic search results from its indexed JSON data; AI explanations will be unavailable. To enable explanations, set `OPENAI_API_KEY` as a secret environment variable at runtime. Never put the key in the Dockerfile, frontend, or repository.

## 3. Manual provider configuration (alternative)

If deploying without the Blueprint, configure the following in the hosting provider dashboard:

- Runtime: Docker
- Dockerfile path: `./Dockerfile`
- Docker build context: repository root (`.`)
- `ALLOWED_ORIGIN=https://satriosusanto.github.io`
- `OPENAI_API_KEY`: secret, required for AI explanations but optional for deterministic search
- `OPENAI_MODEL=gpt-4.1-mini`: optional
- Let the host provide `PORT` if it requires one.

## 4. Validate before public use

1. Open `GET /api/health` and verify the expected datasets report as loaded.
2. Run the deployment checker above and resolve failures.
3. Test the frontend from the GitHub Pages origin after configuring `AI_API_BASE` in a separate pull request.
4. Confirm searches still work without an OpenAI key and that AI explanations work when the key is configured.
5. Configure provider-side request limits, monitoring, and abuse protection before public use.

CORS is not authentication. The current in-memory rate limiter is per process and is not a substitute for provider-side protections. Never use AI output alone as approval to order a part; verify part number and application against the OEM catalogue.

## Current scope

The service searches the JSON datasets explicitly listed in `ai-backend/server.js` (TEREX AC40, TEREX AC80-2, Franna AT15, and Franna MAC25). Missing or incomplete datasets are not made searchable by this deployment setup. The container includes only the backend and indexed JSON dataset folders, not the full frontend assets or PDFs. PDF extraction, OCR, and document retrieval remain separate future work.
