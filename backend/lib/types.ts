// backend/lib/types.ts

export type Tier = "SMALL" | "MEDIUM" | "LARGE";

export type OrderStatus =
  | "PLACED"
  | "PICKED_UP"
  | "WASHING"
  | "OUT_FOR_DELIVERY"
  | "COMPLETED"
  | "FAILED_PICKUP";

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string; // MVP only
  isMember: boolean;    // 30% discount flag
}

export interface Order {
  id: string;
  customerId: string;
  customerName: string;
  phone: string;
  address: string;

  pickupSlot: string;    // ISO; 15-min slot start
  deliverySlot: string;  // ISO; 15-min slot start

  weightKg?: number;     // optional until measured
  tier: Tier;
  price: number;         // after membership discount
  paid: boolean;         // must be true to exist as PLACED
  status: OrderStatus;

  createdAt: string;     // ISO
  updatedAt: string;     // ISO
}
