import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");

    const upstreamParams = new URLSearchParams();

    if (fromDate) {
      upstreamParams.set("fromDate", fromDate);
    }

    if (toDate) {
      upstreamParams.set("toDate", toDate);
    }

    const query = upstreamParams.toString();
    const txRes = await fetch(
      `https://txline.txodds.com/api/fixtures/snapshot${query ? `?${query}` : ""}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.TXLINE_JWT}`,
          "X-Api-Token": process.env.TXLINE_API_KEY!,
          "Content-Type": "application/json",
        },
      },
    );

    if (!txRes.ok) {
      const text = await txRes.text();
      return new NextResponse(text, { status: txRes.status });
    }

    const data = await txRes.json();
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
