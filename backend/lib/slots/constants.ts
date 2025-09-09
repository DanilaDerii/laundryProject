// ---------- Slot business rules ----------

// Grid size in minutes (15 → :00/:15/:30/:45)
export const SLOT_MINUTES = 15;

// Opening hour inclusive (09:00 is first slot start)
export const OPEN_HOUR = 9;

// Closing hour exclusive (16:00 means last valid slot starts 15:45)
export const CLOSE_HOUR = 16;

// Day of week closed (0=Sun … 3=Wed … 6=Sat)
export const CLOSED_WEEKDAY = 3;
