// app/lib/date.ts
import { addDays, format } from "date-fns";

export const fmt = (d: Date) => format(d, "yyyy-MM-dd");
export const label = (d: Date) => format(d, "EEE d"); // e.g., Mon 3

export function daysAround(center: Date, span: number) {
  const out: Date[] = [];
  for (let i = -span; i <= span; i++) out.push(addDays(center, i));
  return out;
}
