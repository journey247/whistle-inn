/**
 * Whistle Inn — Cancellation Policy
 *
 * Mirrors Airbnb's "Moderate" policy with a 24-hour booking grace period:
 *
 *  • Grace period:   Full refund if cancelled within 24 h of *booking*
 *                    AND check-in is ≥ 7 days away.
 *  • 5+ days out:   Full refund (100%).
 *  • 1–4 days out:  50% refund.
 *  • < 24 h to check-in: No refund (0%).
 */

export type RefundTier = 'full' | 'half' | 'none';

export interface RefundResult {
  tier: RefundTier;
  /** Refund amount in dollars (not cents) */
  refundAmount: number;
  /** Human-readable reason shown on the cancellation page */
  reason: string;
  /** Days until check-in (may be negative if already checked in) */
  daysUntilCheckIn: number;
}

/**
 * Calculate the refund a guest is entitled to under our cancellation policy.
 *
 * @param totalPaid         Total amount the guest paid (dollars)
 * @param checkInDate       Booking check-in date
 * @param bookingCreatedAt  When the booking was originally created (for grace period)
 * @param now               Current time (default: new Date()) — injectable for testing
 */
export function calculateRefund(
  totalPaid: number,
  checkInDate: Date,
  bookingCreatedAt: Date,
  now: Date = new Date(),
): RefundResult {
  const msPerDay = 24 * 60 * 60 * 1000;

  const msUntilCheckIn = checkInDate.getTime() - now.getTime();
  const daysUntilCheckIn = msUntilCheckIn / msPerDay; // fractional days

  const mseSinceBooking = now.getTime() - bookingCreatedAt.getTime();
  const hoursSinceBooking = mseSinceBooking / (60 * 60 * 1000);

  // ── Grace period ──────────────────────────────────────────────────────────
  // Full refund if cancelled within 24 h of booking AND check-in is ≥7 days away.
  if (hoursSinceBooking <= 24 && daysUntilCheckIn >= 7) {
    return {
      tier: 'full',
      refundAmount: totalPaid,
      reason: 'Cancelled within 24 hours of booking — full refund applies.',
      daysUntilCheckIn,
    };
  }

  // ── 5+ days before check-in ───────────────────────────────────────────────
  if (daysUntilCheckIn >= 5) {
    return {
      tier: 'full',
      refundAmount: totalPaid,
      reason: 'Cancelled 5 or more days before check-in — full refund applies.',
      daysUntilCheckIn,
    };
  }

  // ── 1–4 days before check-in ─────────────────────────────────────────────
  if (daysUntilCheckIn >= 1) {
    const half = Math.round((totalPaid / 2) * 100) / 100; // round to cents
    return {
      tier: 'half',
      refundAmount: half,
      reason: 'Cancelled 1–4 days before check-in — 50% refund applies.',
      daysUntilCheckIn,
    };
  }

  // ── Less than 24 hours to check-in (or already checked in) ───────────────
  return {
    tier: 'none',
    refundAmount: 0,
    reason: 'Cancelled within 24 hours of check-in — no refund applies.',
    daysUntilCheckIn,
  };
}

/** Human-readable policy summary for display on the booking/cancel pages */
export const POLICY_SUMMARY = [
  {
    window: 'Within 24 h of booking (check-in ≥7 days away)',
    refund: 'Full refund',
    icon: '✅',
  },
  {
    window: '5+ days before check-in',
    refund: 'Full refund',
    icon: '✅',
  },
  {
    window: '1–4 days before check-in',
    refund: '50% refund',
    icon: '⚠️',
  },
  {
    window: 'Less than 24 hours before check-in',
    refund: 'No refund',
    icon: '❌',
  },
];
