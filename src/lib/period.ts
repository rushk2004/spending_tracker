import {
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfDay,
  endOfDay,
  subDays,
  format,
} from "date-fns";

export type PeriodKey = "this_month" | "last_month" | "last_30";

export function getPeriodRange(key: PeriodKey, now = new Date()) {
  if (key === "last_month") {
    const d = subMonths(now, 1);
    return {
      key,
      label: format(d, "MMMM yyyy"),
      shortLabel: "Last month",
      start: startOfMonth(d),
      end: endOfMonth(d),
    };
  }
  if (key === "last_30") {
    return {
      key,
      label: "Last 30 days",
      shortLabel: "Last 30 days",
      start: startOfDay(subDays(now, 29)),
      end: endOfDay(now),
    };
  }
  return {
    key: "this_month" as const,
    label: format(now, "MMMM yyyy"),
    shortLabel: "This month",
    start: startOfMonth(now),
    end: endOfMonth(now),
  };
}

export function parsePeriod(value?: string | null): PeriodKey {
  if (value === "last_month" || value === "last_30") return value;
  return "this_month";
}
