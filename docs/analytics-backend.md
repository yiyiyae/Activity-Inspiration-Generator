# Analytics Backend (Step 4)

## Current Behavior

- API contracts are unchanged:
  - `POST /api/analytics/track`
  - `GET /api/analytics/overview`
  - `GET /api/analytics/funnel`
- In dev (`vite`), use:
  - `POST /__api/analytics/track`
  - `GET /__api/analytics/overview`
  - `GET /__api/analytics/funnel`

## Storage Strategy

- Priority 1: PostgreSQL (when `ANALYTICS_DATABASE_URL` or `DATABASE_URL` is set and `pg` is available)
- Fallback: in-memory store (auto fallback if no DB config or `pg` is unavailable)

Response payload includes `provider` in metrics endpoints:

- `provider: "postgres"` means DB mode
- `provider: "memory"` means fallback mode

## PostgreSQL Setup

1. Install dependency:

```bash
npm install pg
```

2. Set env:

```bash
ANALYTICS_DATABASE_URL=postgres://username:password@host:5432/dbname
```

3. Restart dev server.

Tables and indexes are auto-created on first successful DB connection.

## Admin Guard

- Add env token:

```bash
ADMIN_ANALYTICS_TOKEN=your_admin_token_here
```

- `GET /api/analytics/overview` and `GET /api/analytics/funnel` require header:

```http
x-admin-token: your_admin_token_here
```

- Frontend admin page `/admin/analytics` has an unlock step and sends this header automatically after token input.

## Notes

- Current implementation keeps aggregation logic in Node for compatibility.
- Next optimization can push heavy aggregation into SQL views/materialized views.
