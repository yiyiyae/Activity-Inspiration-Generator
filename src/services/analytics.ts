type AnalyticsLayer = "recommendation" | "presentation";

type AnalyticsEvent<T extends Record<string, unknown> = Record<string, unknown>> = {
  eventId: string;
  eventName: string;
  layer: AnalyticsLayer;
  sessionId: string;
  timestamp: string;
  payload: T;
};

const STORAGE_KEY = "weekend_prescription_analytics_v1";
const SESSION_KEY = "weekend_prescription_session_id_v1";
const SESSION_STARTED_AT_KEY = "weekend_prescription_session_started_at_v1";
const MAX_EVENTS = 300;

let lifecycleBound = false;
let sessionEndSent = false;

function readEvents(): AnalyticsEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AnalyticsEvent[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeEvents(events: AnalyticsEvent[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(events.slice(-MAX_EVENTS)));
  } catch {
    // ignore write errors
  }
}

function ensureSessionStartedAt() {
  if (typeof window === "undefined") return Date.now();
  const existing = window.sessionStorage.getItem(SESSION_STARTED_AT_KEY);
  if (existing) {
    const parsed = Number(existing);
    if (Number.isFinite(parsed)) return parsed;
  }

  const now = Date.now();
  window.sessionStorage.setItem(SESSION_STARTED_AT_KEY, String(now));
  return now;
}

function getSessionId() {
  if (typeof window === "undefined") return "server";
  const existing = window.sessionStorage.getItem(SESSION_KEY);
  if (existing) {
    ensureSessionStartedAt();
    return existing;
  }

  const next = `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  window.sessionStorage.setItem(SESSION_KEY, next);
  ensureSessionStartedAt();
  return next;
}

function createEvent<T extends Record<string, unknown>>(
  layer: AnalyticsLayer,
  eventName: string,
  payload: T
): AnalyticsEvent<T> {
  return {
    eventId: `e_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    eventName,
    layer,
    sessionId: getSessionId(),
    timestamp: new Date().toISOString(),
    payload,
  };
}

function getTrackEndpoint() {
  return import.meta.env.DEV ? "/__api/analytics/track" : "/api/analytics/track";
}

async function sendToServer(event: AnalyticsEvent) {
  try {
    await fetch(getTrackEndpoint(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventId: event.eventId,
        eventName: event.eventName,
        layer: event.layer,
        sessionId: event.sessionId,
        timestamp: event.timestamp,
        appVersion: "0.1.0",
        env: import.meta.env.DEV ? "dev" : "prod",
        payload: event.payload,
      }),
      keepalive: true,
    });
  } catch {
    // 上报失败不影响主流程
  }
}

export function trackEvent<T extends Record<string, unknown>>(
  layer: AnalyticsLayer,
  eventName: string,
  payload: T
) {
  const event = createEvent(layer, eventName, payload);
  const all = readEvents();
  all.push(event);
  writeEvents(all);

  if (import.meta.env.DEV) {
    console.info("[analytics]", eventName, event);
  }

  void sendToServer(event);
  return event;
}

function trackSessionEnd(reason: "pagehide" | "beforeunload") {
  if (typeof window === "undefined") return;
  if (sessionEndSent) return;
  sessionEndSent = true;

  const startedAt = ensureSessionStartedAt();
  const durationMs = Math.max(0, Date.now() - startedAt);

  trackEvent("presentation", "session_end", {
    reason,
    durationMs,
  });
}

export function setupSessionEndTracking() {
  if (typeof window === "undefined") return;
  if (lifecycleBound) return;
  lifecycleBound = true;

  // Ensure session is initialized on first load.
  getSessionId();

  window.addEventListener("pagehide", () => trackSessionEnd("pagehide"));
  window.addEventListener("beforeunload", () => trackSessionEnd("beforeunload"));
}

export function getTrackedEvents() {
  return readEvents();
}

export function clearTrackedEvents() {
  writeEvents([]);
}

declare global {
  interface Window {
    __weekendAnalytics?: {
      getEvents: typeof getTrackedEvents;
      clearEvents: typeof clearTrackedEvents;
    };
  }
}

if (typeof window !== "undefined") {
  window.__weekendAnalytics = {
    getEvents: getTrackedEvents,
    clearEvents: clearTrackedEvents,
  };
}
