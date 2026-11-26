import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getDailyForecast } from "@/lib/weather";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const daysParam = Number(searchParams.get("days"));
  const days = Number.isFinite(daysParam) && daysParam > 0 ? daysParam : 16;

  try {
    const forecast = await getDailyForecast(days);
    return NextResponse.json({ forecast });
  } catch (err) {
    console.error("[Weather] Failed to fetch forecast:", err);
    return NextResponse.json({ error: "Could not load the weather forecast right now." }, { status: 502 });
  }
}
