import { test } from "node:test";
import assert from "node:assert/strict";
import { canAttempt, idempotencyKey, isReminderDue, retryDecision, retryDelayMs, scheduleChanged, zonedClock } from "../src/lib/reminder-policy.ts";
import { emailDeliveryConfigured, isRetryableProviderStatus, sendReminderEmail } from "../src/lib/reminder-email.ts";

test("date-only reminders start at midnight in the saved timezone, not UTC", () => {
  assert.equal(isReminderDue("2026-10-06", null, "America/New_York", new Date("2026-10-06T03:59:59Z")), false);
  assert.equal(isReminderDue("2026-10-06", null, "America/New_York", new Date("2026-10-06T04:00:00Z")), true);
  assert.equal(isReminderDue("2026-10-06", null, "Pacific/Kiritimati", new Date("2026-10-05T10:00:00Z")), true);
});

test("optional reminder time honors the exact local minute", () => {
  assert.equal(isReminderDue("2026-10-06", "09:30", "America/New_York", new Date("2026-10-06T13:29:59Z")), false);
  assert.equal(isReminderDue("2026-10-06", "09:30", "America/New_York", new Date("2026-10-06T13:30:00Z")), true);
  assert.equal(isReminderDue("2026-10-05", "23:59", "America/New_York", new Date("2026-10-06T04:00:00Z")), true);
});

test("month, year, and leap-day boundaries preserve calendar dates", () => {
  assert.deepEqual(zonedClock(new Date("2027-01-01T00:15:00Z"), "America/New_York"), { today: "2026-12-31", time: "19:15" });
  assert.equal(isReminderDue("2028-02-29", "23:59", "UTC", new Date("2028-03-01T00:00:00Z")), true);
  assert.equal(isReminderDue("2026-11-01", null, "America/New_York", new Date("2026-11-01T03:59:59Z")), false);
});

test("spring DST gap sends at the next valid minute", () => {
  assert.equal(isReminderDue("2026-03-08", "02:30", "America/New_York", new Date("2026-03-08T06:59:59Z")), false);
  assert.equal(isReminderDue("2026-03-08", "02:30", "America/New_York", new Date("2026-03-08T07:00:00Z")), true);
});

test("fall DST repeated time retains the same persistent delivery key", () => {
  for (const instant of ["2026-11-01T05:30:00Z", "2026-11-01T06:30:00Z"]) {
    assert.equal(isReminderDue("2026-11-01", "01:30", "America/New_York", new Date(instant)), true);
  }
  const savedKey = "a0b5f572-57b6-4f12-96e3-f578de138afb";
  assert.equal(idempotencyKey(savedKey), idempotencyKey(savedKey));
  assert.notEqual(idempotencyKey(savedKey), idempotencyKey("another-delivery"));
});

test("half-hour and quarter-hour zones do not shift the reminder", () => {
  assert.equal(isReminderDue("2026-10-06", "09:00", "Asia/Kathmandu", new Date("2026-10-06T03:14:59Z")), false);
  assert.equal(isReminderDue("2026-10-06", "09:00", "Asia/Kathmandu", new Date("2026-10-06T03:15:00Z")), true);
  assert.equal(zonedClock(new Date("2026-10-06T03:30:00Z"), "Asia/Kolkata").time, "09:00");
});

test("no-op saves and recurrence-only edits retain delivery identity; date or time changes create a new occurrence", () => {
  assert.equal(scheduleChanged("2026-10-06", "09:00"), false);
  assert.equal(scheduleChanged("2026-10-06", "09:00", "2026-10-06", "09:00"), false);
  assert.equal(scheduleChanged("2026-10-06", "09:00", "2026-10-07"), true);
  assert.equal(scheduleChanged("2026-10-06", "09:00", undefined, "10:00"), true);
  assert.equal(scheduleChanged("2026-10-06", "09:00", undefined, null), true);
  assert.equal(scheduleChanged("2026-10-06", null, "2026-10-06", null), false);
});

test("retries back off durably, cap at thirty minutes, and stop on terminal rejection", () => {
  const first = new Date("2026-10-06T12:00:00Z");
  assert.deepEqual(retryDecision(first, 1, first, true), { state: "retry", nextAttemptAt: new Date("2026-10-06T12:01:00Z") });
  assert.equal(retryDelayMs(2), 120_000);
  assert.equal(retryDelayMs(7), 30 * 60_000);
  assert.equal(retryDecision(first, 1, first, false).state, "failed");
  assert.equal(retryDecision(first, 8, first, true).state, "uncertain");
});

test("provider throttling, timeouts, and server failures retry; validation and authorization failures do not", () => {
  for (const status of [408, 409, 429, 500, 502, 503]) assert.equal(isRetryableProviderStatus(status), true);
  for (const status of [400, 401, 403, 404, 422]) assert.equal(isRetryableProviderStatus(status), false);
});

test("a restart outside the provider key window cannot trigger another send", () => {
  const first = new Date("2026-10-06T00:00:00Z");
  assert.equal(canAttempt(first, new Date("2026-10-06T22:59:59Z")), true);
  assert.equal(canAttempt(first, new Date("2026-10-06T23:00:00Z")), false);
  assert.equal(canAttempt(first, new Date("2026-10-08T00:00:00Z")), false);
  assert.equal(retryDecision(first, 2, new Date("2026-10-06T22:59:00Z"), true).state, "uncertain");
});

test("unconfigured transport refuses to send, never reports simulated success", async () => {
  const previous = process.env.REMINDER_WORKER_ENABLED;
  process.env.REMINDER_WORKER_ENABLED = "false";
  try {
    assert.equal(emailDeliveryConfigured(), false);
    await assert.rejects(sendReminderEmail({ from: "unused", to: "unused", subject: "unused", text: "unused" }, "unused"), /not configured/);
  } finally {
    if (previous === undefined) delete process.env.REMINDER_WORKER_ENABLED;
    else process.env.REMINDER_WORKER_ENABLED = previous;
  }
});
