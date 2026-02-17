// Twilio removed: provide no-op/stub implementations so the app can run without
// Twilio credentials or SDK. These preserve the public functions used across the
// codebase but do not perform any external network calls.

/**
 * Send an SMS message (no-op since Twilio was removed).
 */
export async function sendSMS({
  to,
  message,
}: {
  to: string;
  message: string;
}): Promise<void> {
  console.info(`SMS disabled: would have sent to ${to}: ${message}`);
  return;
}

/**
 * Send SMS to multiple recipients (no-op)
 */
export async function sendBulkSMS({
  to,
  message,
}: {
  to: string[];
  message: string;
}): Promise<void> {
  for (const phone of to) {
    console.info(`SMS disabled: would have sent to ${phone}: ${message}`);
  }
  return;
}

/**
 * Basic phone number validation (keeps behavior similar to previous implementation)
 */
export function isValidPhoneNumber(phoneNumber: string): boolean {
  const digitsOnly = phoneNumber.replace(/\D/g, '');
  if (phoneNumber.startsWith('+')) return /^\+[1-9]\d{1,14}$/.test(phoneNumber);
  if (digitsOnly.length === 10) return true; // assume US
  if (digitsOnly.length >= 11) return true;
  return false;
}

/**
 * Get SMS delivery status (returns null because there's no provider).
 */
export async function getSMSStatus(_messageSid: string): Promise<string | null> {
  return null;
}