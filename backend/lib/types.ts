// backend/lib/types.ts

// ---------- Core domain types ----------

export type Tier = "SMALL" | "MEDIUM" | "LARGE";

export type OrderStatus =
  | "PLACED"
  | "PICKED_UP"
  | "WASHING"
  | "OUT_FOR_DELIVERY"
  | "COMPLETED"
  | "FAILED_PICKUP";

// Aliases (runtime = string)
export type ISODateTime = string;
export type PaymentToken = string;

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  isMember: boolean;
}

export interface Order {
  id: string;

  customerId: string;
  customerName: string; // set from User.name on create
  phone: string;
  address: string;

  // 15-min ISO timestamps
  pickupSlot: ISODateTime;
  deliverySlot: ISODateTime;

  weightKg?: number;
  tier: Tier;

  price: number;  // final THB after member discount
  paid: boolean;  // requires valid payment token consumption
  status: OrderStatus;

  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

// ---------- Status flow helpers ----------

export const ORDER_STATUS_SEQUENCE: readonly OrderStatus[] = [
  "PLACED",
  "PICKED_UP",
  "WASHING",
  "OUT_FOR_DELIVERY",
  "COMPLETED",
] as const;

export const ORDER_STATUS_TERMINAL: readonly OrderStatus[] = [
  "COMPLETED",
  "FAILED_PICKUP",
] as const;

// ---------- Payment records (in-memory mock) ----------

export interface PaymentRecord {
  token: PaymentToken;   // one-time token
  customerId: string;
  amount: number;        // THB; server will recompute on order create
  used: boolean;
  createdAt: ISODateTime;
  usedAt?: ISODateTime;
}

// ---------- API payload shapes ----------

// /api/payment (request a token)
export interface CreatePaymentRequest {
  customerId: string;
  amount: number; // client-estimated; server will recheck
}
export interface CreatePaymentResponse {
  ok: true;
  token: PaymentToken;
  amount: number;
  createdAt: ISODateTime;
}

// /api/orders (POST)
export interface CreateOrderRequest {
  customerId: string;
  phone: string;
  address: string;
  pickupSlot: ISODateTime;
  deliverySlot: ISODateTime;
  tier: Tier;
  weightKg?: number;

  // --- NEW: pricing knobs (server-authoritative) ---
  express?: boolean;      // +50 THB if true
  distanceKm?: number;    // +0 / +20 / +40 bands (<=5 / <=15 / >15)
  promoCode?: string;     // "PROMO10" => -10 THB flat

  paymentToken: PaymentToken; // required
}
export interface CreateOrderResponse {
  ok: true;
  order: Order;
}

// /api/orders/[id] (PATCH) — advance status or mark failed pickup
export interface PatchOrderStatusRequest {
  next: OrderStatus; // must follow ORDER_STATUS_SEQUENCE or be "FAILED_PICKUP" from PLACED
}
export interface PatchOrderStatusResponse {
  ok: true;
  order: Order;
}
