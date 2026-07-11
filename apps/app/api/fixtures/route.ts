import { NextRequest, NextResponse } from "next/server";
import { fetchFixturesSnapshot, FixturesApiError } from "@/lib/fixtures";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");

    const data = await fetchFixturesSnapshot({ fromDate, toDate });
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof FixturesApiError) {
      return new NextResponse(err.message, { status: err.status });
    }

    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
