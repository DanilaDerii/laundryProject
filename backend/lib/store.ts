// backend/lib/store.ts
// Pure in-memory data store + CRUD helpers (no seed logic here)

import type { User, Order } from "./types";

// ---- In-memory tables ----
const users: User[] = [];
const orders: Order[] = [];

// ---- ID generators (MVP only) ----
let nextUserId = 1;
let nextOrderId = 1;
function genUserId() {
  return String(nextUserId++);
}
function genOrderId() {
  return String(nextOrderId++);
}

// ---- Public API ----
export const db = {
  // Users
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

  // Orders
  listOrders(): Order[] {
    return orders;
  },
  getOrder(id: string): Order | undefined {
    return orders.find((o) => o.id === id);
  },
  createOrder(input: Omit<Order, "id" | "createdAt" | "updatedAt">): Order {
    const now = new Date().toISOString();
    const o: Order = { ...input, id: genOrderId(), createdAt: now, updatedAt: now };
    orders.push(o);
    return o;
  },
  updateOrder(id: string, patch: Partial<Order>): Order | undefined {
    const o = orders.find((x) => x.id === id);
    if (!o) return undefined;
    Object.assign(o, patch);
    o.updatedAt = new Date().toISOString();
    return o;
  },
  deleteOrder(id: string): boolean {
    const idx = orders.findIndex((o) => o.id === id);
    if (idx === -1) return false;
    orders.splice(idx, 1);
    return true;
  },
};
