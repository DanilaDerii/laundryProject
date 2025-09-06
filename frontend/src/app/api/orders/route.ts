// frontend/src/app/api/orders/route.ts
import { NextResponse } from "next/server";
import { db, validateSlot, computePrice } from "backend/lib";

export async function GET() {
  const orders = db.listOrders();
  return NextResponse.json({ orders }, { status: 200 });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      customerId,
      customerName,
      phone,
      address,
      pickupSlot,   // "YYYY-MM-DDTHH:mm" local preferred
      deliverySlot,
      tier,         // "SMALL" | "MEDIUM" | "LARGE"
      paid = true,  // temp until /api/payment
      weightKg,     // optional; mapper later
    } = body || {};

    for (const k of ["customerId","customerName","phone","address","pickupSlot","deliverySlot","tier"] as const) {
      if (!body?.[k]) {
        return NextResponse.json({ error: `Missing required field: ${k}` }, { status: 400 });
      }
    }

    const user = db.getUser(String(customerId));
    if (!user) {
      return NextResponse.json({ error: "customerId not found" }, { status: 404 });
    }

    // Enforce slot rules
    const existing = db.listOrders();
    const check = validateSlot(existing, String(pickupSlot));
    if (!check.ok) {
      return NextResponse.json(
        { ok: false, reason: check.reason, suggestion: check.suggestion },
        { status: 400 }
      );
    }
    const normalizedPickup = check.normalizedSlot; // local ISO

    // Pricing via shared function
    const price = computePrice(tier, user.isMember);

    const created = db.createOrder({
      customerId: String(customerId),
      customerName,
      phone,
      address,
      pickupSlot: normalizedPickup,
      deliverySlot,
      weightKg,
      tier,
      price,
      paid: !!paid,
      status: paid ? "PLACED" : "FAILED_PICKUP",
    });

    return NextResponse.json(created, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Invalid JSON" }, { status: 400 });
  }
}
