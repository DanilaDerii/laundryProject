import { NextResponse } from "next/server";
import { db, validateSlot, computePrice } from "backend/lib";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const customerId = searchParams.get("customerId");

  const orders = customerId
    ? db.listOrdersByCustomer(String(customerId))
    : db.listOrders(); // fallback until real auth

  return NextResponse.json({ orders }, { status: 200 });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      customerId,
      phone,
      address,
      pickupSlot,
      deliverySlot,
      tier,
      weightKg,
      paymentToken, // REQUIRED
    } = body || {};

    for (const k of ["customerId","phone","address","pickupSlot","deliverySlot","tier","paymentToken"] as const) {
      if (!body?.[k]) {
        return NextResponse.json({ ok: false, error: `Missing required field: ${k}` }, { status: 400 });
      }
    }

    const user = db.getUser(String(customerId));
    if (!user) return NextResponse.json({ ok: false, error: "customerId not found" }, { status: 404 });

    const check = validateSlot(db.listOrders(), String(pickupSlot));
    if (!check.ok) {
      return NextResponse.json({ ok: false, reason: check.reason, suggestion: check.suggestion }, { status: 400 });
    }
    const normalizedPickup = check.normalizedSlot;

    const price = computePrice(tier, user.isMember);
    const ok = db.verifyAndConsumePayment(String(paymentToken), String(customerId), price);
    if (!ok) {
      return NextResponse.json(
        { ok: false, error: "Payment required or mismatch (invalid token / wrong amount / reused token)" },
        { status: 402 }
      );
    }

    const created = db.createOrder({
      customerId: String(customerId),
      customerName: user.name,
      phone: String(phone),
      address: String(address),
      pickupSlot: normalizedPickup,
      deliverySlot: String(deliverySlot),
      weightKg,
      tier,
      price,
      paid: true,
      status: "PLACED",
    });

    return NextResponse.json({ ok: true, order: created }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Invalid JSON" }, { status: 400 });
  }
}
