export function emailDeliveryConfigured() {
  return process.env.REMINDER_WORKER_ENABLED === "true"
    && Boolean(process.env.RESEND_API_KEY && process.env.RESEND_EMAIL_FROM);
}

export class EmailDeliveryError extends Error {
  readonly retryable: boolean;
  constructor(message: string, retryable: boolean) {
    super(message);
    this.retryable = retryable;
  }
}

export const isRetryableProviderStatus = (status: number) =>
  status === 429 || status === 408 || status >= 500 || status === 409;

export async function sendReminderEmail(payload: { from: string; to: string; subject: string; text: string }, key: string): Promise<string> {
  if (!emailDeliveryConfigured()) throw new EmailDeliveryError("Email sender is not configured", false);
  let response: Response;
  try {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
        "Idempotency-Key": key,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new EmailDeliveryError("Email provider request timed out or could not be reached", true);
  }
  if (!response.ok) {
    // Do not store provider responses: they may contain addresses or credentials.
    throw new EmailDeliveryError(`Email provider returned HTTP ${response.status}`,
      isRetryableProviderStatus(response.status));
  }
  try {
    const data = await response.json() as { id?: unknown };
    if (typeof data.id === "string" && data.id) return data.id;
  } catch { /* An unreadable acknowledgement is ambiguous, not a success. */ }
  throw new EmailDeliveryError("Email provider acknowledgement was invalid", true);
}
