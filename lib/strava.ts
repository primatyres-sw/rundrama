import { cookies } from "next/headers";

const SESSION_COOKIE = "strava_session";
const STATE_COOKIE = "strava_oauth_state";
const AUTHORIZE_URL = "https://www.strava.com/oauth/authorize";
const TOKEN_URL = "https://www.strava.com/oauth/token";
const ACTIVITIES_URL = "https://www.strava.com/api/v3/athlete/activities";

/** Only activities inside this window count toward the quest. */
export const SYNC_WINDOW_DAYS = 30;

/** Cycling would make the quest trivial to clear, so only foot sports count. */
const COUNTED_SPORT_TYPES = new Set([
  "Run",
  "TrailRun",
  "VirtualRun",
  "Walk",
  "Hike",
]);

export type StravaSession = {
  accessToken: string;
  refreshToken: string;
  /** Unix seconds, straight from Strava. */
  expiresAt: number;
  athleteId: number;
  athleteName: string;
};

export type StravaSyncResult = {
  activityCount: number;
  distanceKm: number;
  latestActivityName: string | null;
};

type StravaTokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  athlete?: {
    id: number;
    firstname?: string;
    lastname?: string;
  };
};

type StravaActivity = {
  distance?: number;
  name?: string;
  sport_type?: string;
  type?: string;
};

export function getStravaConfig() {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      "Missing STRAVA_CLIENT_ID / STRAVA_CLIENT_SECRET — copy .env.example to .env.local and fill them in.",
    );
  }

  return { clientId, clientSecret };
}

/**
 * Strava matches the redirect against the single "Authorization Callback Domain"
 * registered on the app, so this has to resolve to the domain actually being
 * served. Deriving it from the request keeps localhost and Vercel both working
 * without a code change; STRAVA_REDIRECT_URI is the escape hatch for proxies.
 */
export function getRedirectUri(requestUrl: URL) {
  return (
    process.env.STRAVA_REDIRECT_URI ??
    new URL("/api/strava/callback", requestUrl.origin).toString()
  );
}

export function buildAuthorizeUrl(requestUrl: URL, state: string) {
  const { clientId } = getStravaConfig();
  const authorizeUrl = new URL(AUTHORIZE_URL);

  authorizeUrl.searchParams.set("client_id", clientId);
  authorizeUrl.searchParams.set("redirect_uri", getRedirectUri(requestUrl));
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("approval_prompt", "auto");
  authorizeUrl.searchParams.set("scope", "activity:read_all");
  authorizeUrl.searchParams.set("state", state);

  return authorizeUrl;
}

export async function readSession(): Promise<StravaSession | null> {
  const raw = (await cookies()).get(SESSION_COOKIE)?.value;

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as StravaSession;
  } catch {
    return null;
  }
}

export async function writeSession(session: StravaSession) {
  (await cookies()).set(SESSION_COOKIE, JSON.stringify(session), {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export async function clearSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

/**
 * Reuses a state that is already in flight instead of rotating it on every
 * click. Rotating would silently invalidate a consent screen the athlete
 * already has open — which is exactly what double-clicking "Link Strava"
 * produces, and it fails only at the very end of the flow.
 */
export async function ensureOAuthState() {
  const cookieStore = await cookies();
  const existing = cookieStore.get(STATE_COOKIE)?.value;

  if (existing) {
    return existing;
  }

  const state = crypto.randomUUID();

  cookieStore.set(STATE_COOKIE, state, {
    httpOnly: true,
    maxAge: 60 * 10,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return state;
}

/** Reads the CSRF state and burns it, so a callback can never be replayed. */
export async function consumeOAuthState() {
  const cookieStore = await cookies();
  const state = cookieStore.get(STATE_COOKIE)?.value ?? null;
  cookieStore.delete(STATE_COOKIE);

  return state;
}

async function postToken(body: Record<string, string>) {
  const response = await fetch(TOKEN_URL, {
    body: JSON.stringify(body),
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`Strava token request failed (${response.status}): ${await response.text()}`);
  }

  return (await response.json()) as StravaTokenResponse;
}

export async function exchangeCodeForSession(code: string): Promise<StravaSession> {
  const { clientId, clientSecret } = getStravaConfig();
  const data = await postToken({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    grant_type: "authorization_code",
  });

  return {
    accessToken: data.access_token,
    athleteId: data.athlete?.id ?? 0,
    athleteName:
      [data.athlete?.firstname, data.athlete?.lastname].filter(Boolean).join(" ") || "Athlete",
    expiresAt: data.expires_at,
    refreshToken: data.refresh_token,
  };
}

/**
 * Strava access tokens last ~6 hours, so any session that survives a coffee
 * break needs this before it can call the API.
 */
export async function ensureFreshSession(session: StravaSession): Promise<StravaSession> {
  const nowSeconds = Math.floor(Date.now() / 1000);

  if (session.expiresAt - nowSeconds > 60) {
    return session;
  }

  const { clientId, clientSecret } = getStravaConfig();
  const data = await postToken({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
    refresh_token: session.refreshToken,
  });

  // The refresh response carries no athlete block, so identity comes from the
  // session we already hold.
  const refreshed: StravaSession = {
    accessToken: data.access_token,
    athleteId: session.athleteId,
    athleteName: session.athleteName,
    expiresAt: data.expires_at,
    refreshToken: data.refresh_token,
  };

  await writeSession(refreshed);

  return refreshed;
}

export async function fetchQuestDistance(session: StravaSession): Promise<StravaSyncResult> {
  const after = Math.floor(Date.now() / 1000) - SYNC_WINDOW_DAYS * 24 * 60 * 60;
  const url = new URL(ACTIVITIES_URL);

  url.searchParams.set("after", String(after));
  url.searchParams.set("per_page", "200");

  const response = await fetch(url, {
    cache: "no-store",
    headers: { Authorization: `Bearer ${session.accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`Strava activities request failed (${response.status}): ${await response.text()}`);
  }

  const activities = (await response.json()) as StravaActivity[];
  const counted = activities.filter((activity) =>
    COUNTED_SPORT_TYPES.has(activity.sport_type ?? activity.type ?? ""),
  );
  const meters = counted.reduce((total, activity) => total + (activity.distance ?? 0), 0);

  return {
    activityCount: counted.length,
    distanceKm: Number((meters / 1000).toFixed(1)),
    latestActivityName: counted.at(-1)?.name ?? null,
  };
}
