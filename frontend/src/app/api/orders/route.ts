import { NextResponse } from "next/server";
import { db, validateSlot, computePrice } from "backend/lib";
import type {
  CreateOrderRequest,
  CreateOrderResponse,
  ISODateTime,
  Tier,
} from "backend/lib/types";

// Keep dependencies stable: inline the same thresholds (≤5, ≤15, >15)
function tierForWeight(weightKg: number): Tier {
  if (weightKg <= 5) return "SMALL";
  if (weightKg <= 15) return "MEDIUM";
  return "LARGE";
}

// Helper: ensure a string ISO is aligned to 15-minute grid and zeroed seconds/ms
function isAligned15(iso: string): boolean {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  return d.getUTCSeconds() === 0 && d.getUTCMilliseconds() === 0 && (d.getUTCMinutes() % 15) === 0;
}

function normalizeISO(iso: string): ISODateTime {
  const d = new Date(iso);
  d.setUTCSeconds(0, 0);
  return d.toISOString();
}

// GET /api/orders?customerId=123 (optional filter)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const customerId = searchParams.get("customerId");

  const orders = customerId
    ? db.listOrdersByCustomer(String(customerId))
    : db.listOrders(); // fallback until real auth

  return NextResponse.json({ orders }, { status: 200 });
}

// POST /api/orders
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateOrderRequest | any;

    const {
      customerId,
      phone,
      address,
      pickupSlot,
      deliverySlot,
      tier,
      weightKg,
      paymentToken, // REQUIRED

      // NEW knobs for A (all optional)
      express,
      distanceKm,
      promoCode,
    } = body || {};

    // Basic presence checks
    for (const k of [
      "customerId",
      "phone",
      "address",
      "pickupSlot",
      "deliverySlot",
      "tier",
      "paymentToken",
    ] as const) {
      if (!body?.[k]) {
        return NextResponse.json(
          { ok: false, error: `Missing required field: ${k}` },
          { status: 400 }
        );
      }
    }

    // Customer lookup (source of truth for membership + name)
    const user = db.getUser(String(customerId));
    if (!user) {
      return NextResponse.json(
        { ok: false, error: "customerId not found" },
        { status: 404 }
      );
    }

    // Slot validation (15-min grid; normalize to canonical ISO) — PICKUP
    const pickCheck = validateSlot(db.listOrders(), String(pickupSlot));
    if (!pickCheck.ok) {
      return NextResponse.json(
        { ok: false, reason: pickCheck.reason, suggestion: pickCheck.suggestion },
        { status: 400 }
      );
    }
    const normalizedPickup: ISODateTime = pickCheck.normalizedSlot;

    // DELIVERY validation
    // 1) Alignment to 15-min grid
    if (!isAligned15(String(deliverySlot))) {
      return NextResponse.json(
        { ok: false, error: "deliverySlot must be aligned to 15-minute increments (HH:00, :15, :30, :45)" },
        { status: 400 }
      );
    }
    const normalizedDelivery = normalizeISO(String(deliverySlot));

    // 2) Business rules (closed days / hours) — reuse validateSlot with EMPTY orders to skip occupancy
    const delivCheck = validateSlot([], normalizedDelivery);
    if (!delivCheck.ok) {
      return NextResponse.json(
        { ok: false, reason: delivCheck.reason, suggestion: delivCheck.suggestion },
        { status: 400 }
      );
    }

    // 3) Delivery must be strictly AFTER pickup
    if (new Date(normalizedDelivery).getTime() <= new Date(normalizedPickup).getTime()) {
      return NextResponse.json(
        { ok: false, error: "deliverySlot must be after pickupSlot" },
        { status: 400 }
      );
    }

    // Weight↔tier guard on CREATE (if weight is provided)
    if (typeof weightKg === "number") {
      const expected = tierForWeight(weightKg);
      if (expected !== (tier as Tier)) {
        return NextResponse.json(
          {
            ok: false,
            error: `Tier/weight mismatch: ${weightKg}kg → ${expected}, not ${tier}`,
          },
          { status: 400 }
        );
      }
    }

    // Coerce/validate pricing knobs minimally (server-authoritative anyway)
    const priceOpts = {
      express: Boolean(express),
      distanceKm:
        typeof distanceKm === "number"
          ? distanceKm
          : typeof distanceKm === "string" && distanceKm.trim() !== ""
          ? Number(distanceKm)
          : undefined,
      promoCode: typeof promoCode === "string" ? promoCode : undefined,
    };

    // Server-authoritative price using membership + surcharges/promo (A)
    const price = computePrice(tier as Tier, user.isMember, priceOpts);

    // Payment must match the server price and be consumable once
    const paidOk = db.verifyAndConsumePayment(
      String(paymentToken),
      String(customerId),
      price
    );
    if (!paidOk) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Payment required or mismatch (invalid token / wrong amount / reused token)",
        },
        { status: 402 }
      );
    }

    // Create order; force customerName from DB
    const created = db.createOrder({
      customerId: String(customerId),
      customerName: user.name,
      phone: String(phone),
      address: String(address),
      pickupSlot: normalizedPickup,
      deliverySlot: normalizedDelivery,
      weightKg,
      tier: tier as Tier,
      price,
      paid: true,
      status: "PLACED",
    });

    const resp: CreateOrderResponse = { ok: true, order: created };
    return NextResponse.json(resp, { status: 201 });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Invalid JSON" },
      { status: 400 }
    );
  }
}
