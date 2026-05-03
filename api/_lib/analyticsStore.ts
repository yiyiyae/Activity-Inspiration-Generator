declare const process: any;

export type AnalyticsLayer = "recommendation" | "presentation";

export type TrackRequestBody = {
  eventId: string;
  eventName: string;
  layer: AnalyticsLayer;
  sessionId: string;
  timestamp: string;
  appVersion: string;
  env: string;
  payload?: Record<string, unknown>;
};

type StoredEvent = {
  event_id: string;
  event_name: string;
  layer: AnalyticsLayer;
  session_id: string;
  event_time: string;
  app_version: string;
  env: string;
  mood_intent: string | null;
  party_mode: string | null;
  energy_level: string | null;
  weather: string | null;
  time_period: string | null;
  context_source: string | null;
  result_count: number | null;
  top_id: string | null;
  top_title: string | null;
  top_score: number | null;
  error_reason: string | null;
  selected_mode: "P" | "J" | null;
  from_mode: "P" | "J" | null;
  to_mode: "P" | "J" | null;
  location_id: string | null;
  payload_json: Record<string, unknown>;
  created_at: string;
};

type StoredSession = {
  session_id: string;
  app_version: string;
  env: string;
  mbti: string | null;
  city: string;
  started_at: string;
  ended_at: string | null;
};

type QueryFilters = {
  from?: string;
  to?: string;
  mode?: "P" | "J" | "ALL";
};

type TrackResult =
  | { ok: true; status: 200 | 201; deduplicated: boolean }
  | { ok: false; status: 400; message: string };

type AnalyticsProvider = {
  name: "memory" | "postgres";
  track: (event: StoredEvent, session: StoredSession) => Promise<TrackResult>;
  listEvents: (filters: QueryFilters) => Promise<StoredEvent[]>;
};

const MEMORY_MAX_EVENTS = 20000;
const memoryEvents: StoredEvent[] = [];
const memorySessions = new Map<string, StoredSession>();
const memoryEventIds = new Set<string>();

function toObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function pickString(source: Record<string, unknown>, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
}

function pickNumber(source: Record<string, unknown>, ...keys: string[]): number | null {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
}

function pickMode(source: Record<string, unknown>, ...keys: string[]): "P" | "J" | null {
  const value = pickString(source, ...keys);
  return value === "P" || value === "J" ? value : null;
}

function toIso(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return new Date().toISOString();
  return date.toISOString();
}

function buildSession(input: TrackRequestBody, payload: Record<string, unknown>): StoredSession {
  return {
    session_id: input.sessionId,
    app_version: input.appVersion,
    env: input.env,
    mbti: pickString(payload, "mbti"),
    city: pickString(payload, "city") ?? "changsha",
    started_at: toIso(input.timestamp),
    ended_at: null,
  };
}

function buildEvent(input: TrackRequestBody, payload: Record<string, unknown>): StoredEvent {
  return {
    event_id: input.eventId,
    event_name: input.eventName,
    layer: input.layer,
    session_id: input.sessionId,
    event_time: toIso(input.timestamp),
    app_version: input.appVersion,
    env: input.env,
    mood_intent: pickString(payload, "moodIntent", "mood_intent"),
    party_mode: pickString(payload, "partyMode", "party_mode"),
    energy_level: pickString(payload, "energyLevel", "energy_level"),
    weather: pickString(payload, "weather"),
    time_period: pickString(payload, "timePeriod", "time_period", "time"),
    context_source: pickString(payload, "contextSource", "context_source"),
    result_count: pickNumber(payload, "resultCount", "result_count"),
    top_id: pickString(payload, "topId", "top_id"),
    top_title: pickString(payload, "topTitle", "top_title"),
    top_score: pickNumber(payload, "topScore", "top_score"),
    error_reason: pickString(payload, "errorReason", "error_reason", "reason"),
    selected_mode: pickMode(payload, "selectedMode", "selected_mode"),
    from_mode: pickMode(payload, "fromMode", "from_mode"),
    to_mode: pickMode(payload, "toMode", "to_mode"),
    location_id: pickString(payload, "locationId", "location_id"),
    payload_json: payload,
    created_at: new Date().toISOString(),
  };
}

const memoryProvider: AnalyticsProvider = {
  name: "memory",
  async track(event, session) {
    if (memoryEventIds.has(event.event_id)) {
      return { ok: true, status: 200, deduplicated: true };
    }

    if (!memorySessions.has(session.session_id)) {
      memorySessions.set(session.session_id, session);
    }

    memoryEvents.push(event);
    memoryEventIds.add(event.event_id);

    if (memoryEvents.length > MEMORY_MAX_EVENTS) {
      const overflow = memoryEvents.length - MEMORY_MAX_EVENTS;
      const removed = memoryEvents.splice(0, overflow);
      for (const item of removed) {
        memoryEventIds.delete(item.event_id);
      }
    }

    return { ok: true, status: 201, deduplicated: false };
  },

  async listEvents(filters) {
    const { from, to } = getTimeRange(filters);
    const inRange = memoryEvents.filter((event) => {
      const t = new Date(event.event_time).getTime();
      return t >= from && t <= to;
    });

    if (!filters.mode || filters.mode === "ALL") {
      return inRange;
    }

    const modeSessions = new Set(
      inRange.filter((event) => event.event_name === "mode_selected" && event.selected_mode === filters.mode).map((event) => event.session_id)
    );

    return inRange.filter((event) => modeSessions.has(event.session_id));
  },
};

let postgresProviderPromise: Promise<AnalyticsProvider | null> | null = null;

async function createPostgresProvider(): Promise<AnalyticsProvider | null> {
  const connectionString = process.env.ANALYTICS_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!connectionString) {
    return null;
  }

  try {
    const pgPackage = "pg";
    const pgModule = (await import(pgPackage)) as any;
    const Client = pgModule.Client;
    const client = new Client({ connectionString });
    await client.connect();

    await client.query(`
      CREATE TABLE IF NOT EXISTS analytics_sessions (
        session_id TEXT PRIMARY KEY,
        app_version TEXT NOT NULL,
        env TEXT NOT NULL,
        mbti TEXT NULL,
        city TEXT NOT NULL DEFAULT 'changsha',
        started_at TIMESTAMPTZ NOT NULL,
        ended_at TIMESTAMPTZ NULL
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS analytics_events (
        event_id TEXT PRIMARY KEY,
        event_name TEXT NOT NULL,
        layer TEXT NOT NULL,
        session_id TEXT NOT NULL REFERENCES analytics_sessions(session_id),
        event_time TIMESTAMPTZ NOT NULL,
        app_version TEXT NOT NULL,
        env TEXT NOT NULL,
        mood_intent TEXT NULL,
        party_mode TEXT NULL,
        energy_level TEXT NULL,
        weather TEXT NULL,
        time_period TEXT NULL,
        context_source TEXT NULL,
        result_count INTEGER NULL,
        top_id TEXT NULL,
        top_title TEXT NULL,
        top_score NUMERIC(10,2) NULL,
        error_reason TEXT NULL,
        selected_mode TEXT NULL,
        from_mode TEXT NULL,
        to_mode TEXT NULL,
        location_id TEXT NULL,
        payload_json JSONB NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`CREATE INDEX IF NOT EXISTS idx_analytics_events_time ON analytics_events(event_time);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_analytics_events_name_time ON analytics_events(event_name, event_time);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_analytics_events_session ON analytics_events(session_id);`);

    const provider: AnalyticsProvider = {
      name: "postgres",
      async track(event, session) {
        const existing = await client.query(`SELECT 1 FROM analytics_events WHERE event_id = $1 LIMIT 1`, [event.event_id]);
        if (existing.rowCount && existing.rowCount > 0) {
          return { ok: true, status: 200, deduplicated: true };
        }

        await client.query(
          `
            INSERT INTO analytics_sessions (
              session_id, app_version, env, mbti, city, started_at, ended_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (session_id) DO NOTHING
          `,
          [
            session.session_id,
            session.app_version,
            session.env,
            session.mbti,
            session.city,
            session.started_at,
            session.ended_at,
          ]
        );

        await client.query(
          `
            INSERT INTO analytics_events (
              event_id, event_name, layer, session_id, event_time, app_version, env,
              mood_intent, party_mode, energy_level, weather, time_period, context_source,
              result_count, top_id, top_title, top_score, error_reason,
              selected_mode, from_mode, to_mode, location_id, payload_json, created_at
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7,
              $8, $9, $10, $11, $12, $13,
              $14, $15, $16, $17, $18,
              $19, $20, $21, $22, $23, $24
            )
          `,
          [
            event.event_id,
            event.event_name,
            event.layer,
            event.session_id,
            event.event_time,
            event.app_version,
            event.env,
            event.mood_intent,
            event.party_mode,
            event.energy_level,
            event.weather,
            event.time_period,
            event.context_source,
            event.result_count,
            event.top_id,
            event.top_title,
            event.top_score,
            event.error_reason,
            event.selected_mode,
            event.from_mode,
            event.to_mode,
            event.location_id,
            JSON.stringify(event.payload_json),
            event.created_at,
          ]
        );

        return { ok: true, status: 201, deduplicated: false };
      },

      async listEvents(filters) {
        const clauses: string[] = [];
        const values: unknown[] = [];

        if (filters.from) {
          values.push(toIso(filters.from));
          clauses.push(`event_time >= $${values.length}`);
        }
        if (filters.to) {
          values.push(toIso(filters.to));
          clauses.push(`event_time <= $${values.length}`);
        }

        const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
        const query = `SELECT * FROM analytics_events ${where} ORDER BY event_time ASC`;
        const result = await client.query(query, values);

        const allEvents = (result.rows as any[]).map((row) => ({
          event_id: String(row.event_id),
          event_name: String(row.event_name),
          layer: row.layer as AnalyticsLayer,
          session_id: String(row.session_id),
          event_time: new Date(row.event_time).toISOString(),
          app_version: String(row.app_version),
          env: String(row.env),
          mood_intent: row.mood_intent ?? null,
          party_mode: row.party_mode ?? null,
          energy_level: row.energy_level ?? null,
          weather: row.weather ?? null,
          time_period: row.time_period ?? null,
          context_source: row.context_source ?? null,
          result_count: typeof row.result_count === "number" ? row.result_count : row.result_count ? Number(row.result_count) : null,
          top_id: row.top_id ?? null,
          top_title: row.top_title ?? null,
          top_score: typeof row.top_score === "number" ? row.top_score : row.top_score ? Number(row.top_score) : null,
          error_reason: row.error_reason ?? null,
          selected_mode: row.selected_mode === "P" || row.selected_mode === "J" ? row.selected_mode : null,
          from_mode: row.from_mode === "P" || row.from_mode === "J" ? row.from_mode : null,
          to_mode: row.to_mode === "P" || row.to_mode === "J" ? row.to_mode : null,
          location_id: row.location_id ?? null,
          payload_json: toObject(row.payload_json),
          created_at: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
        })) as StoredEvent[];

        if (!filters.mode || filters.mode === "ALL") {
          return allEvents;
        }

        const modeSessions = new Set(
          allEvents.filter((event) => event.event_name === "mode_selected" && event.selected_mode === filters.mode).map((event) => event.session_id)
        );

        return allEvents.filter((event) => modeSessions.has(event.session_id));
      },
    };

    return provider;
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown";
    console.warn(`[analytics] PostgreSQL adapter unavailable, fallback to memory: ${reason}`);
    return null;
  }
}

async function getProvider(): Promise<AnalyticsProvider> {
  if (!postgresProviderPromise) {
    postgresProviderPromise = createPostgresProvider();
  }
  const postgres = await postgresProviderPromise;
  if (postgres) {
    return postgres;
  }

  // If the previous PostgreSQL init failed (e.g. DB not ready yet),
  // allow next request to retry instead of pinning to memory forever.
  postgresProviderPromise = null;
  return memoryProvider;
}

function getTimeRange(filters: QueryFilters) {
  const fromValue = filters.from ? new Date(filters.from).getTime() : Number.NEGATIVE_INFINITY;
  const toValue = filters.to ? new Date(filters.to).getTime() : Number.POSITIVE_INFINITY;
  const from = Number.isFinite(fromValue) ? fromValue : Number.NEGATIVE_INFINITY;
  const to = Number.isFinite(toValue) ? toValue : Number.POSITIVE_INFINITY;
  return { from, to };
}

function uvOf(eventsList: StoredEvent[], eventName: string, predicate?: (event: StoredEvent) => boolean): number {
  const ids = new Set<string>();
  for (const event of eventsList) {
    if (event.event_name !== eventName) continue;
    if (predicate && !predicate(event)) continue;
    ids.add(event.session_id);
  }
  return ids.size;
}

function countOf(eventsList: StoredEvent[], eventName: string, predicate?: (event: StoredEvent) => boolean): number {
  let count = 0;
  for (const event of eventsList) {
    if (event.event_name !== eventName) continue;
    if (predicate && !predicate(event)) continue;
    count += 1;
  }
  return count;
}

function percentile(values: number[], p: number): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.ceil((p / 100) * sorted.length) - 1;
  const index = Math.min(Math.max(rank, 0), sorted.length - 1);
  return sorted[index];
}

function validateTrackBody(body: TrackRequestBody): TrackResult | null {
  if (!body.eventId || !body.eventName || !body.layer || !body.sessionId || !body.timestamp || !body.appVersion || !body.env) {
    return { ok: false, status: 400, message: "Missing required fields" };
  }

  if (body.layer !== "recommendation" && body.layer !== "presentation") {
    return { ok: false, status: 400, message: "Invalid layer" };
  }

  return null;
}

export async function trackAnalyticsEvent(body: TrackRequestBody): Promise<TrackResult> {
  const validationError = validateTrackBody(body);
  if (validationError) return validationError;

  const payload = toObject(body.payload);
  const session = buildSession(body, payload);
  const event = buildEvent(body, payload);
  const provider = await getProvider();
  return provider.track(event, session);
}

export async function getOverviewMetrics(filters: QueryFilters) {
  const provider = await getProvider();
  const scoped = await provider.listEvents(filters);

  const intentSubmittedUv = uvOf(scoped, "intent_submitted");
  const resultImpressionUv = uvOf(scoped, "result_impression");
  const recommendationRequestedCnt = countOf(scoped, "recommendation_requested");
  const recommendationReceivedCnt = countOf(scoped, "recommendation_received");
  const recommendationFailedCnt = countOf(scoped, "recommendation_failed");
  const emptyResultByCountCnt = countOf(scoped, "recommendation_received", (event) => (event.result_count ?? 0) <= 0);
  const recommendationEmptyCnt = countOf(scoped, "recommendation_empty");
  const emptyResultCnt = Math.max(emptyResultByCountCnt, recommendationEmptyCnt);
  const saveModalOpenedUv = uvOf(scoped, "save_modal_opened");
  const modeSelectedP = countOf(scoped, "mode_selected", (event) => event.selected_mode === "P");
  const modeSelectedJ = countOf(scoped, "mode_selected", (event) => event.selected_mode === "J");

  const topScores = scoped
    .filter((event) => event.event_name === "recommendation_received" && typeof event.top_score === "number")
    .map((event) => event.top_score as number);
  const averageTopScore = topScores.length ? Number((topScores.reduce((acc, score) => acc + score, 0) / topScores.length).toFixed(2)) : null;
  const latencyValues = scoped
    .filter((event) => event.event_name === "recommendation_latency_ms")
    .map((event) => {
      const raw = event.payload_json.latencyMs;
      if (typeof raw === "number" && Number.isFinite(raw)) return raw;
      if (typeof raw === "string") {
        const parsed = Number(raw);
        if (Number.isFinite(parsed)) return parsed;
      }
      return null;
    })
    .filter((value): value is number => value !== null && value >= 0);
  const latencyP50MsRaw = percentile(latencyValues, 50);
  const latencyP95MsRaw = percentile(latencyValues, 95);
  const latencyP50Ms = latencyP50MsRaw === null ? null : Math.round(latencyP50MsRaw);
  const latencyP95Ms = latencyP95MsRaw === null ? null : Math.round(latencyP95MsRaw);

  const totalSessions = new Set(scoped.map((event) => event.session_id)).size;
  const prescriptionCompletionRate = intentSubmittedUv > 0 ? Number((resultImpressionUv / intentSubmittedUv).toFixed(4)) : 0;
  const recommendationSuccessRate =
    recommendationRequestedCnt > 0 ? Number((recommendationReceivedCnt / recommendationRequestedCnt).toFixed(4)) : 0;
  const recommendationFailureRate =
    recommendationRequestedCnt > 0 ? Number((recommendationFailedCnt / recommendationRequestedCnt).toFixed(4)) : 0;
  const emptyResultRate = recommendationRequestedCnt > 0 ? Number((emptyResultCnt / recommendationRequestedCnt).toFixed(4)) : 0;
  const saveRate = resultImpressionUv > 0 ? Number((saveModalOpenedUv / resultImpressionUv).toFixed(4)) : 0;

  return {
    provider: provider.name,
    filters: {
      from: filters.from ?? null,
      to: filters.to ?? null,
      mode: filters.mode ?? "ALL",
    },
    totals: {
      sessions: totalSessions,
      events: scoped.length,
    },
    metrics: {
      prescriptionCompletionRate,
      recommendationSuccessRate,
      recommendationFailureRate,
      emptyResultRate,
      saveRate,
      averageTopScore,
      latencyP50Ms,
      latencyP95Ms,
    },
    counts: {
      intentSubmittedUv,
      resultImpressionUv,
      recommendationRequestedCnt,
      recommendationReceivedCnt,
      recommendationFailedCnt,
      emptyResultCnt,
      recommendationEmptyCnt,
      saveModalOpenedUv,
      modeSelectedP,
      modeSelectedJ,
    },
  };
}

export async function getFunnelMetrics(filters: QueryFilters) {
  const provider = await getProvider();
  const scoped = await provider.listEvents(filters);

  const steps = [
    "intent_submitted",
    "mode_selected",
    "recommendation_requested",
    "recommendation_received",
    "result_impression",
    "save_modal_opened",
  ] as const;

  const rows = steps.map((step, index) => {
    const uv = uvOf(scoped, step);
    const prevUv = index === 0 ? uv : uvOf(scoped, steps[index - 1]);
    const conversionRate = index === 0 ? (uv > 0 ? 1 : 0) : prevUv > 0 ? Number((uv / prevUv).toFixed(4)) : 0;
    const dropoffRate = index === 0 ? 0 : Number((1 - conversionRate).toFixed(4));
    return {
      step,
      uv,
      conversionRate,
      dropoffRate,
    };
  });

  return {
    provider: provider.name,
    filters: {
      from: filters.from ?? null,
      to: filters.to ?? null,
      mode: filters.mode ?? "ALL",
    },
    rows,
  };
}



