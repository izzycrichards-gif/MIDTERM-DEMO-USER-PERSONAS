export function zonedClock(now: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: string) => parts.find(p => p.type === type)!.value;
  return { today: `${get("year")}-${get("month")}-${get("day")}`, time: `${get("hour")}:${get("minute")}` };
}

export function isReminderDue(dueDate: string, dueTime: string | null, timeZone: string, now: Date) {
  const { today, time } = zonedClock(now, timeZone);
  // No time means local midnight. Spring DST gaps send at the next valid local
  // minute; fall DST repeats are deduplicated by the delivery's schedule key.
  return dueDate < today || (dueDate === today && (!dueTime || dueTime <= time));
}

export const idempotencyKey = (deliveryKey: string) => `crm-reminder-${deliveryKey}`;
export function scheduleChanged(dueDate: string, dueTime: string | null, nextDate?: string | null, nextTime?: string | null) {
  return (nextDate !== undefined && nextDate !== dueDate) || (nextTime !== undefined && nextTime !== dueTime);
}
export const retryDelayMs = (attempt: number) => Math.min(30 * 60_000, 60_000 * 2 ** Math.max(0, attempt - 1));
export function retryDecision(firstAttemptAt: Date, attempts: number, now: Date, retryable: boolean) {
  // Resend retains keys for 24 hours. Never risk replaying an ambiguous send
  // outside that window; leave it for operator reconciliation instead.
  if (!retryable) return { state: "failed", nextAttemptAt: now };
  const nextAttemptAt = new Date(now.getTime() + retryDelayMs(attempts));
  if (attempts >= 8 || nextAttemptAt.getTime() - firstAttemptAt.getTime() >= 23 * 60 * 60_000) {
    return { state: "uncertain", nextAttemptAt: now };
  }
  return { state: "retry", nextAttemptAt };
}
export function canAttempt(firstAttemptAt: Date | null, now: Date) {
  return !firstAttemptAt || now.getTime() - firstAttemptAt.getTime() < 23 * 60 * 60_000;
}
