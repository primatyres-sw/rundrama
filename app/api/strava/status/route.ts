import { readSession } from "@/lib/strava";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await readSession();

  return Response.json({
    athleteName: session?.athleteName ?? null,
    connected: Boolean(session),
    configured: Boolean(process.env.STRAVA_CLIENT_ID && process.env.STRAVA_CLIENT_SECRET),
  });
}
