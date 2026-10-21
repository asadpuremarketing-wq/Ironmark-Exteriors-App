import { NextResponse } from "next/server";
import {
  HOUSE_SIZES,
  SERVICE_PRICING,
  corsHeadersFor,
  isPublicBookableService,
  type HouseSize,
} from "@/lib/publicBooking";

/**
 * Public, unauthenticated: returns the house-size price tiers for a
 * bookable service, or null if that service isn't priced by house size
 * (e.g. Pressure Washing, which varies by surface). Keeps pricing defined
 * in one place (this App) rather than duplicated on the marketing site.
 */
export async function GET(request: Request) {
  const origin = request.headers.get("origin");
  const headers = corsHeadersFor(origin);

  const { searchParams } = new URL(request.url);
  const service = searchParams.get("service")?.trim() ?? "";

  if (!isPublicBookableService(service)) {
    return NextResponse.json({ error: "Unknown or unbookable service." }, { status: 400, headers });
  }

  const tiers = SERVICE_PRICING[service];
  if (!tiers) {
    return NextResponse.json({ pricedByHouseSize: false, tiers: null }, { headers });
  }

  const orderedSizes = Object.keys(HOUSE_SIZES) as HouseSize[];
  return NextResponse.json(
    {
      pricedByHouseSize: true,
      tiers: orderedSizes.map((size) => ({ value: size, label: HOUSE_SIZES[size], price: tiers[size] })),
    },
    { headers }
  );
}

export async function OPTIONS(request: Request) {
  const origin = request.headers.get("origin");
  return new NextResponse(null, { status: 204, headers: corsHeadersFor(origin) });
}
