import { NextResponse } from "next/server";
import { db, type OrderStatus, computePrice } from "backend/lib";
import type { Tier } from "backend/lib/types";

// tiny enum guard
const TIERS: readonly Tier[] = ["SMALL", "MEDIUM", "LARGE"] as const;
function isTier(x: unknown): x is Tier {
  return typeof x === "string" && (TIERS as readonly string[]).includes(x);
}

// optional but recommended: keep tier honest if weight is known
function tierForWeight(weightKg: number): Tier {
  if (weightKg <= 5) return "SMALL";
  if (weightKg <= 15) return "MEDIUM";
  return "LARGE";
}

// GET /api/orders/[id]
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const o = db.getOrder(String(params.id));
  if (!o) return NextResponse.json({ ok: false, error: "Order not found" }, { status: 404 });
  return NextResponse.json({ ok: true, order: o }, { status: 200 });
}

// PATCH /api/orders/[id] — advance status
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = String(params.id);
    const body = await req.json().catch(() => ({}));
    const next: OrderStatus | undefined = body?.next;
    if (!next) return NextResponse.json({ ok: false, error: "Missing field: next" }, { status: 400 });

    const o = db.getOrder(id);
    if (!o) return NextResponse.json({ ok: false, error: "Order not found" }, { status: 404 });
    if (!db.canAdvanceStatus(o.status, next)) {
      return NextResponse.json({ ok: false, error: `Illegal transition: ${o.status} → ${next}` }, { status: 400 });
    }

    const updated = db.advanceOrderStatus(id, next)!;
    return NextResponse.json({ ok: true, order: updated }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Invalid JSON" }, { status: 400 });
  }
}

// PUT /api/orders/[id] — edit BEFORE pickup starts
// Body: { phone?, address?, deliverySlot?, weightKg?, tier?, paymentToken? }
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = String(params.id);
    const body = await req.json().catch(() => ({}));

    const o = db.getOrder(id);
    if (!o) return NextResponse.json({ ok: false, error: "Order not found" }, { status: 404 });

    // Enforce cutoff: no edits once pickupSlot has started (server time)
    if (!db.canEditOrCancel(o)) {
      return NextResponse.json({ ok: false, error: "Edits are not allowed after pickup start" }, { status: 400 });
    }

    const patch: Partial<typeof o> = {};
    if (typeof body.phone === "string") patch.phone = body.phone;
    if (typeof body.address === "string") patch.address = body.address;
    if (typeof body.deliverySlot === "string") patch.deliverySlot = body.deliverySlot;

    // Weight edit: allow, but enforce tier coherence if tier exists (existing or incoming)
    if (typeof body.weightKg === "number") {
      const w = body.weightKg;
      patch.weightKg = w;
      const derived = tierForWeight(w);
      // compare to target tier (incoming if provided/valid, else current)
      const targetTier: Tier = isTier(body.tier) ? body.tier : o.tier;
      if (derived !== targetTier) {
        return NextResponse.json(
          { ok: false, error: `Tier/weight mismatch: ${w}kg → ${derived}, not ${targetTier}` },
          { status: 400 }
        );
      }
    }

    // Tier change rule → require immediate payment for new price
    if (body.tier !== undefined) {
      if (!isTier(body.tier)) {
        return NextResponse.json({ ok: false, error: "Invalid tier" }, { status: 400 });
      }
      const newTier: Tier = body.tier;

      // If weight is known (existing or just set), keep them consistent
      const effectiveWeight = typeof body.weightKg === "number" ? body.weightKg : o.weightKg;
      if (typeof effectiveWeight === "number") {
        const derived = tierForWeight(effectiveWeight);
        if (derived !== newTier) {
          return NextResponse.json(
            { ok: false, error: `Tier/weight mismatch: ${effectiveWeight}kg → ${derived}, not ${newTier}` },
            { status: 400 }
          );
        }
      }

      if (newTier !== o.tier) {
        const user = db.getUser(o.customerId);
        if (!user) return NextResponse.json({ ok: false, error: "User not found" }, { status: 500 });

        const newPrice = computePrice(newTier, user.isMember);
        const token: string | undefined = body.paymentToken;
        if (!token) {
          return NextResponse.json({ ok: false, error: "Tier change requires paymentToken" }, { status: 402 });
        }
        const paid = db.verifyAndConsumePayment(token, o.customerId, newPrice);
        if (!paid) {
          return NextResponse.json(
            { ok: false, error: "Payment required or mismatch (invalid token / wrong amount / reused token)" },
            { status: 402 }
          );
        }
        patch.tier = newTier;
        patch.price = newPrice;
        patch.paid = true; // remains paid after immediate settlement
      }
    }

    const updated = db.updateOrder(id, patch)!;
    return NextResponse.json({ ok: true, order: updated }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Invalid JSON" }, { status: 400 });
  }
}

// DELETE /api/orders/[id] — cancel BEFORE pickup starts
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const id = String(params.id);
  const o = db.getOrder(id);
  if (!o) return NextResponse.json({ ok: false, error: "Order not found" }, { status: 404 });

  if (!db.canEditOrCancel(o)) {
    return NextResponse.json({ ok: false, error: "Cancellation not allowed after pickup start" }, { status: 400 });
  }

  const ok = db.deleteOrder(id);
  return NextResponse.json({ ok }, { status: ok ? 200 : 500 });
}
