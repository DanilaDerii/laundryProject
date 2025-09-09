// backend/lib/index.ts
// Export a single DB instance that survives Next.js dev/hot-reload.

import { db as rawDb } from "./store";
import { seed } from "./seed";
import type { OrderStatus } from "./types";

type DBType = typeof rawDb;

declare global {
  // eslint-disable-next-line no-var
  var __LAUNDRY_DB__: DBType | undefined;
  // eslint-disable-next-line no-var
  var __LAUNDRY_SEEDED__: boolean | undefined;
}

const db: DBType = globalThis.__LAUNDRY_DB__ ?? (globalThis.__LAUNDRY_DB__ = rawDb);

if (!globalThis.__LAUNDRY_SEEDED__) {
  try {
    seed(db);
  } finally {
    globalThis.__LAUNDRY_SEEDED__ = true;
  }
}

// Core DB instance
export { db };

// Domain/types/utilities
export * from "./types";
export * from "./slots";
export * from "./pricing";

// Convenience re-exports of key helpers (so routes don’t import store.ts directly)
export const {
  listUsers,
  getUser,
  findUserByEmail,
  createUser,
  listOrders,
  listOrdersByCustomer,
  getOrder,
  createOrder,
  updateOrder,
  deleteOrder,
  canAdvanceStatus,
  advanceOrderStatus,
  canEditOrCancel,
  recordPayment,
  getPaymentByToken,
  verifyAndConsumePayment,
  resetForTests,
} = db;

export type { OrderStatus };
