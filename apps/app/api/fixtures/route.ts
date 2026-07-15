// pages/api/fixtures.ts
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { fromDate, toDate } = req.query;

    const txRes = await fetch(
      `https://txline.txodds.com/api/fixtures?fromDate=${fromDate}&toDate=${toDate}`,
      {
        headers: {
          "Authorization": `Bearer ${process.env.TXLINE_JWT}`,
          "X-Api-Token": process.env.TXLINE_API_KEY!,
          "Content-Type": "application/json",
        },
      }
    );

    if (!txRes.ok) {
      const text = await txRes.text();
      return res.status(txRes.status).send(text);
    }

    const data = await txRes.json();
    res.status(200).json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
