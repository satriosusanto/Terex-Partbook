# TEREX PartBook AI Backend (MVP)

This is a separate Node.js service for the static GitHub Pages PartBook. GitHub Pages cannot run the backend itself.

## What it does

- `GET /api/health`: reports which currently indexed model datasets load and whether an OpenAI key is configured.
- `POST /api/search`: searches existing JSON part records first, returns the actual matching records, and optionally asks OpenAI for a short Indonesian explanation grounded only in those candidates.
- Supports the datasets currently present and readable in this repository: TEREX AC40, TEREX AC80-2, Franna AT15, and Franna MAC25. Missing/incomplete model datasets are intentionally not indexed.
- Does not ingest PDF files yet. PDF catalog extraction / retrieval is a separate next step.

## Local setup

Requires Node.js 20 or newer.

1. Copy `.env.example` to `.env` in this folder.
2. Put your OpenAI API key in `OPENAI_API_KEY` in that local file only.
3. Install and start from the repository root:

```bash
npm --prefix ai-backend install
npm --prefix ai-backend start
```

The API listens on port 8787 by default. Test health at `http://localhost:8787/api/health`.

Example search:

```bash
curl -X POST http://localhost:8787/api/search \
  -H "Content-Type: application/json" \
  -d '{"query":"T177667"}'
```

Without an API key, deterministic search still works and `explanation` remains null. With a key, OpenAI provides an optional explanation; the returned part records remain sourced from the local JSON files.

## Deploy as a separate service

Deploy this repository to a Node.js host that can access the repository's root-level `data/` and `catalogs/` folders. Configure:

- Build/install command: `npm --prefix ai-backend install`
- Start command: `npm --prefix ai-backend start`
- `OPENAI_API_KEY`: secret environment variable set in the hosting dashboard
- `OPENAI_MODEL`: optional, defaults to `gpt-4.1-mini`
- `ALLOWED_ORIGIN`: exact origin of the deployed PartBook frontend, without a trailing slash
- `PORT`: supplied by most hosts automatically

Do not publish the API key in frontend JavaScript, HTML, GitHub Pages settings, or committed files. Keep `.env` local and never commit it. Add usage limits and monitoring at the hosting provider before public production use.

## API

`POST /api/search`

Request:

```json
{ "query": "T177667", "model": "Franna MAC25" }
```

`model` is optional; supported values are `TEREX AC40`, `TEREX AC80-2`, `Franna AT15`, and `Franna MAC25`.

Response includes `results` with source part number, model, position, quantity, catalog ID/title, a deep link, and a relevance score; `explanation` is optional. A missing part is not fabricated. Always verify the result against the OEM catalogue before ordering.

## Current limitations

- This is an MVP, not production-ready security or a complete AI catalogue system.
- In-memory rate limiting is per process and should be supplemented with host-level limits/WAF for public deployments.
- CORS is not authentication; configure host-level abuse protection before exposing publicly.
- No PDF ingestion, OCR, embeddings, vector database, authentication, or user feedback loop yet.
- Search can only find data present in the indexed JSON datasets. Descriptions missing from extracted data remain missing.
