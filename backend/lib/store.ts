// backend/lib/store.ts
// Pure in-memory data store + CRUD helpers (no seed logic here)

import type {
  User,
  Order,
  OrderStatus,
  PaymentRecord,
  PaymentToken,
} from "./types";
import {
  ORDER_STATUS_SEQUENCE,
  ORDER_STATUS_TERMINAL,
} from "./types";

// ---- In-memory tables ----
const users: User[] = [];
const orders: Order[] = [];
const payments: PaymentRecord[] = [];

// ---- ID generators (MVP only) ----
let nextUserId = 1;
let nextOrderId = 1;
let nextPaymentSeq = 1;

function genUserId() {
  return String(nextUserId++);
}
function genOrderId() {
  return String(nextOrderId++);
}
function genPaymentToken(): PaymentToken {
  // Simple deterministic token for dev/tests
  return `pay_${Date.now()}_${nextPaymentSeq++}`;
}

// ---- Helpers ----
function nowISO(): string {
  return new Date().toISOString();
}

function isLegalNextStatus(current: OrderStatus, next: OrderStatus): boolean {
  if (next === "FAILED_PICKUP") return current === "PLACED"; // side-exit only from PLACED
  const idx = ORDER_STATUS_SEQUENCE.indexOf(current);
  const nextIdx = ORDER_STATUS_SEQUENCE.indexOf(next);
  return nextIdx === idx + 1; // strictly forward by one step
}

function timeLt(aIso: string, bIso: string): boolean {
  return new Date(aIso).getTime() < new Date(bIso).getTime();
}

// ---- Public API ----
export const db = {
  // ===== Users =====
  listUsers(): User[] {
    return users;
  },
  getUser(id: string): User | undefined {
    return users.find((u) => u.id === id);
  },
  findUserByEmail(email: string): User | undefined {
    return users.find((u) => u.email === email);
  },
  createUser(input: Omit<User, "id">): User {
    const u: User = { ...input, id: genUserId() };
    users.push(u);
    return u;
  },

  // ===== Orders =====
  listOrders(): Order[] {
    return orders;
  },
  listOrdersByCustomer(customerId: string): Order[] {
    return orders.filter((o) => o.customerId === customerId);
  },
  getOrder(id: string): Order | undefined {
    return orders.find((o) => o.id === id);
  },
  createOrder(input: Omit<Order, "id" | "createdAt" | "updatedAt">): Order {
    const now = nowISO();
    const o: Order = { ...input, id: genOrderId(), createdAt: now, updatedAt: now };
    orders.push(o);
    return o;
  },
  updateOrder(id: string, patch: Partial<Order>): Order | undefined {
    const o = orders.find((x) => x.id === id);
    if (!o) return undefined;
    Object.assign(o, patch);
    o.updatedAt = nowISO();
    return o;
  },
  deleteOrder(id: string): boolean {
    const idx = orders.findIndex((o) => o.id === id);
    if (idx === -1) return false;
    orders.splice(idx, 1);
    return true;
  },

  // ===== Status machine =====
  canAdvanceStatus(current: OrderStatus, next: OrderStatus): boolean {
    if (ORDER_STATUS_TERMINAL.includes(current)) return false; // no moves after terminal
    return isLegalNextStatus(current, next);
  },
  advanceOrderStatus(id: string, next: OrderStatus): Order | undefined {
    const o = this.getOrder(id);
    if (!o) return undefined;
    if (!this.canAdvanceStatus(o.status, next)) return undefined;
    o.status = next;
    o.updatedAt = nowISO();
    return o;
  },

  // ===== Edit/Cancel cutoff =====
  canEditOrCancel(o: Order, atIso: string = nowISO()): boolean {
    // Editing/canceling allowed strictly before pickup start
    return timeLt(atIso, o.pickupSlot);
  },

  // ===== Payments (in-memory mock) =====
  recordPayment(customerId: string, amount: number): PaymentRecord {
    const rec: PaymentRecord = {
      token: genPaymentToken(),
      customerId,
      amount,
      used: false,
      createdAt: nowISO(),
    };
    payments.push(rec);
    return rec;
  },
  getPaymentByToken(token: PaymentToken): PaymentRecord | undefined {
    return payments.find((p) => p.token === token);
  },
  verifyAndConsumePayment(token: PaymentToken, customerId: string, expectedAmount: number): boolean {
    const rec = payments.find((p) => p.token === token);
    if (!rec) return false;
    if (rec.used) return false;
    if (rec.customerId !== customerId) return false;
    if (rec.amount !== expectedAmount) return false;
    rec.used = true;
    rec.usedAt = nowISO();
    return true;
  },

  // ===== Test utilities =====
  resetForTests(): void {
    users.splice(0, users.length);
    orders.splice(0, orders.length);
    payments.splice(0, payments.length);
    nextUserId = 1;
    nextOrderId = 1;
    nextPaymentSeq = 1;
  },
};
