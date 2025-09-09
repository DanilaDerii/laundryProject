import { NextResponse } from "next/server";
import { db } from "backend/lib";

// POST /api/payment
// Body: { customerId: string, amount: number }
// Resp: { ok: true, token: string, amount: number, createdAt: string }
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { customerId, amount } = body || {};

    if (!customerId || typeof amount !== "number" || amount <= 0) {
      return NextResponse.json(
        { ok: false, error: "customerId and positive amount are required" },
        { status: 400 }
      );
    }

    const user = db.getUser(String(customerId));
    if (!user) {
      return NextResponse.json({ ok: false, error: "customerId not found" }, { status: 404 });
    }

    const rec = db.recordPayment(String(customerId), amount);
    return NextResponse.json(
      { ok: true, token: rec.token, amount: rec.amount, createdAt: rec.createdAt },
      { status: 201 }
    );
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Invalid JSON" }, { status: 400 });
  }
}
