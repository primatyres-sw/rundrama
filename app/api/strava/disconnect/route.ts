import { clearSession } from "@/lib/strava";

export const dynamic = "force-dynamic";

export async function POST() {
  await clearSession();

  return Response.json({ connected: false });
}
