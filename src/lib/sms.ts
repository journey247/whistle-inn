import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

if (!accountSid || !authToken || !fromPhoneNumber) {
  console.warn('Twilio credentials not configured. SMS notifications will be disabled.');
}

const client = accountSid && authToken ? twilio(accountSid, authToken) : null;

/**
 * Send an SMS message using Twilio
 */
export async function sendSMS({
  to,
  message,
}: {
  to: string;
  message: string;
}): Promise<void> {
  if (!client) {
    console.warn('Twilio client not initialized. Skipping SMS send.');
    return;
  }

  try {
    // Ensure phone number is in E.164 format
    const formattedTo = formatPhoneNumber(to);

    const result = await client.messages.create({
      body: message,
      from: fromPhoneNumber,
      to: formattedTo,
    });

    console.log(`SMS sent successfully. SID: ${result.sid}`);
  } catch (error) {
    console.error('Failed to send SMS:', error);
    throw new Error(`SMS send failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Send SMS to multiple recipients
 */
export async function sendBulkSMS({
  to,
  message,
}: {
  to: string[];
  message: string;
}): Promise<void> {
  const promises = to.map(phoneNumber =>
    sendSMS({ to: phoneNumber, message }).catch(error => {
      console.error(`Failed to send SMS to ${phoneNumber}:`, error);
      return null; // Don't fail the entire batch
    })
  );

  await Promise.allSettled(promises);
}

/**
 * Format phone number to E.164 format
 */
function formatPhoneNumber(phoneNumber: string): string {
  // Remove all non-digit characters
  const digitsOnly = phoneNumber.replace(/\D/g, '');

  // If it starts with a country code, assume it's already formatted
  if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
    return `+${digitsOnly}`;
  }

  // If it's 10 digits, assume US number and add +1
  if (digitsOnly.length === 10) {
    return `+1${digitsOnly}`;
  }

  // If it already has a +, return as is
  if (phoneNumber.startsWith('+')) {
    return phoneNumber;
  }

  // For other formats, try to add + if it looks like an international number
  if (digitsOnly.length > 10) {
    return `+${digitsOnly}`;
  }

  // Default to US format
  return `+1${digitsOnly}`;
}

/**
 * Validate phone number format
 */
export function isValidPhoneNumber(phoneNumber: string): boolean {
  const formatted = formatPhoneNumber(phoneNumber);
  // Basic validation for E.164 format
  return /^\+[1-9]\d{1,14}$/.test(formatted);
}

/**
 * Get SMS delivery status (if available)
 */
export async function getSMSStatus(messageSid: string): Promise<string | null> {
  if (!client) {
    return null;
  }

  try {
    const message = await client.messages(messageSid).fetch();
    return message.status;
  } catch (error) {
    console.error('Failed to get SMS status:', error);
    return null;
  }
}