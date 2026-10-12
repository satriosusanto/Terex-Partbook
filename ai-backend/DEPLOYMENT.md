# Deploy TEREX PartBook AI Backend

This guide prepares the backend for deployment as a separate container service. The GitHub Pages frontend remains static.

## 1. Build the container

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

Without `OPENAI_API_KEY`, the backend should still return deterministic search results from its indexed JSON data; AI explanations will be unavailable. To enable explanations, pass `OPENAI_API_KEY` as a secret environment variable at runtime. Never put the key in the Dockerfile, frontend, or repository.

## 2. Configure your hosting provider

Use the repository root as the Docker build context and the root-level `Dockerfile`. Configure these environment variables in the provider dashboard:

- `ALLOWED_ORIGIN=https://satriosusanto.github.io`
- `OPENAI_API_KEY`: secret, optional for deterministic search and required for AI explanations
- `OPENAI_MODEL=gpt-4.1-mini`: optional
- `PORT`: let the host set it if required by the platform

The container includes only the backend and the JSON dataset folders currently indexed by `ai-backend/server.js`. It does not include the full frontend assets or PDFs, because PDF ingestion is not implemented yet.

## 3. Connect the frontend

After deployment, obtain the service's HTTPS origin, for example `https://your-service.example.com`. In `part-search.html`, set `AI_API_BASE` to that origin only (no `/api/search` suffix). Commit the frontend change through a separate branch and pull request.

Do not configure a placeholder URL as if it were live. The exact deployed URL must come from the hosting provider.

## 4. Validate before public use

1. Open `GET /api/health` and verify the expected datasets report as loaded.
2. Send a `POST /api/search` request with a known part number.
3. Test the frontend from the GitHub Pages origin.
4. Confirm an unrelated web origin is rejected.
5. Confirm searches still work without an OpenAI key and that AI explanations work when the key is configured.
6. Configure provider-side request limits, monitoring, and abuse protection before public use.

CORS is not authentication. The current in-memory rate limiter is per process and is not a substitute for provider-side protections. Never use AI output alone as approval to order a part; verify part number and application against the OEM catalogue.

## Current scope

The service searches the JSON datasets explicitly listed in `ai-backend/server.js` (TEREX AC40, TEREX AC80-2, Franna AT15, and Franna MAC25). Missing or incomplete datasets are not made searchable by this deployment setup. PDF extraction, OCR, and document retrieval remain separate future work.
