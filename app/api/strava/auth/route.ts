import { NextResponse } from "next/server";
import { buildAuthorizeUrl, writeOAuthState } from "@/lib/strava";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);

  try {
    const state = crypto.randomUUID();
    await writeOAuthState(state);

    return NextResponse.redirect(buildAuthorizeUrl(requestUrl, state));
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown error";
    const homeUrl = new URL("/", requestUrl.origin);

    homeUrl.searchParams.set("strava", "error");
    homeUrl.searchParams.set("reason", reason);

    return NextResponse.redirect(homeUrl);
  }
}
