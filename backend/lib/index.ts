// backend/lib/index.ts
// Export a single DB instance that survives Next.js dev/hot-reload.

import { db as rawDb } from "./store";
import { seed } from "./seed";

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

export { db };
export * from "./types";
export * from "./slots"; // <-- add this
export * from "./pricing";
