import { SYNC_WINDOW_DAYS, ensureFreshSession, fetchQuestDistance, readSession } from "@/lib/strava";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await readSession();

  if (!session) {
    return Response.json({ connected: false, error: "Link Strava first" }, { status: 401 });
  }

  try {
    const freshSession = await ensureFreshSession(session);
    const result = await fetchQuestDistance(freshSession);

    return Response.json({
      ...result,
      athleteName: freshSession.athleteName,
      connected: true,
      windowDays: SYNC_WINDOW_DAYS,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync failed";

    return Response.json({ connected: true, error: message }, { status: 502 });
  }
}
