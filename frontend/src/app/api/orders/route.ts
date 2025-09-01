// frontend/src/app/api/orders/route.ts
import { db } from "backend/lib";


export async function GET() {
  const orders = db.listOrders();
  return new Response(JSON.stringify({ orders }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}




// Minimal POST to create an order (we'll tighten rules later)
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // required fields for now
    const {
      customerId,
      customerName,
      phone,
      address,
      pickupSlot,
      deliverySlot,
      tier,          // "SMALL" | "MEDIUM" | "LARGE"
      paid = true,   // for now we assume payment happened; we'll add /payment later
      weightKg,      // optional
    } = body || {};

    if (!customerId || !customerName || !phone || !address || !pickupSlot || !deliverySlot || !tier) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    const user = db.getUser(String(customerId));
    if (!user) {
      return new Response(JSON.stringify({ error: "customerId not found" }), {
        status: 404,
        headers: { "content-type": "application/json" },
      });
    }

    // pricing rule: base by tier, 30% off if member
    const tierRates = { SMALL: 200, MEDIUM: 300, LARGE: 400 } as const;
    const base = tierRates[tier as "SMALL" | "MEDIUM" | "LARGE"];
    if (!base) {
      return new Response(JSON.stringify({ error: "Invalid tier" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }
    const price = user.isMember ? Math.round(base * 0.7) : base;

    const order = db.createOrder({
      customerId: String(customerId),
      customerName,
      phone,
      address,
      pickupSlot,
      deliverySlot,
      weightKg,
      tier,
      price,
      paid: !!paid,
      status: paid ? "PLACED" : "FAILED_PICKUP", // temp placeholder; we'll wire real payment flow soon
    });

    return new Response(JSON.stringify({ order }), {
      status: 201,
      headers: { "content-type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "Invalid JSON" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }
}