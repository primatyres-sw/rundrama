import { NextResponse } from "next/server";
import { consumeOAuthState, exchangeCodeForSession, writeSession } from "@/lib/strava";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const homeUrl = new URL("/", requestUrl.origin);

  const fail = (reason: string) => {
    homeUrl.searchParams.set("strava", "error");
    homeUrl.searchParams.set("reason", reason);

    return NextResponse.redirect(homeUrl);
  };

  // Strava sends `error=access_denied` when the athlete clicks Cancel.
  const deniedError = requestUrl.searchParams.get("error");
  if (deniedError) {
    return fail(deniedError);
  }

  const code = requestUrl.searchParams.get("code");
  if (!code) {
    return fail("Missing authorization code");
  }

  const expectedState = await consumeOAuthState();
  if (!expectedState || expectedState !== requestUrl.searchParams.get("state")) {
    return fail("Link expired - press Link Strava again and finish in one go");
  }

  // Without activity:read_all the sync would silently return 0 km, so refuse
  // the connection here rather than letting it fail later on stage.
  const grantedScope = requestUrl.searchParams.get("scope") ?? "";
  if (!grantedScope.includes("activity:read")) {
    return fail("Activity permission was not granted");
  }

  try {
    const session = await exchangeCodeForSession(code);
    await writeSession(session);

    homeUrl.searchParams.set("strava", "connected");

    return NextResponse.redirect(homeUrl);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Token exchange failed");
  }
}
