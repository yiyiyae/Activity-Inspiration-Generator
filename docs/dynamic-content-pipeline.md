# Dynamic Content Pipeline (MVP v1)

This scaffold gives you a first runnable flow:

1. Ingest source content (`rss` / `github_json`)
2. Normalize to Weekend Prescription card fields
3. Upsert into Notion data source
4. Support `draft/published` via confidence threshold

## Files

- `scripts/content-pipeline/run.mjs`
- `scripts/content-pipeline/sources.sample.json`

## Setup

1. Copy source config:

```bash
cp scripts/content-pipeline/sources.sample.json scripts/content-pipeline/sources.local.json
```

2. Edit `sources.local.json` and set real source URLs.

3. Ensure env variables exist:

```bash
NOTION_TOKEN=...
NOTION_DATABASE_ID=...            # or NOTION_DATA_SOURCE_ID
NOTION_DATA_SOURCE_ID=...
PIPELINE_AUTO_PUBLISH_CONFIDENCE=0.85
AMAP_WEB_SERVICE_KEY=...
```

## Run

Dry run:

```bash
npm run pipeline:dry
```

`dry-run` mode skips Notion writes and schema/query calls; use it to validate source ingest/normalize safely first.

Write to Notion:

```bash
npm run pipeline:run
```

Run one source only:

```bash
npm run pipeline:run -- --source=changsha-tourism-rss
```

Limit candidate count:

```bash
npm run pipeline:run -- --limit=20
```

## Source Types

- `amap_poi`:
  - Uses Amap Web Service `place/text`.
  - Required env: `AMAP_WEB_SERVICE_KEY` (or custom key via `keyEnv` in source config).
  - Recommended for stable local POI enrichment.
- `rss`:
  - Pulls `<item>` from RSS/Atom-like feeds.
- `github_json`:
  - Pulls JSON array from raw GitHub URL.

Debug candidate preview:

```bash
npm run pipeline:dry -- --debug
```

## Recommended Notion Properties

The script auto-detects properties by name and only writes existing ones.
If these fields exist, quality is better:

- `Name` (title)
- `Category` (multi_select)
- `Weather` (multi_select)
- `Time Period` (multi_select)
- `Main Image` (url)
- `P_Hook`, `P_Action` (rich_text)
- `J_Timeline`, `J_Checklist`, `J_Warning` (rich_text)
- `Source UID` / `Source ID` / `External ID` (rich_text)
- `Source URL` (url)
- `Source Name` (rich_text)
- `Confidence` (number)
- `Pipeline Status` or `Status` (status/select)
- `Event Date` (date)
- `Expires At` (date)

## Notes

- This is a scaffold, not a full crawler platform.
- For high-risk platforms, add legal/compliance review before crawling.
- Next iteration can add:
  - LLM extraction/refinement
  - Source quality scoring
  - Automatic expiry/unpublish jobs
