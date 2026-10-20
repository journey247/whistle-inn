/**
 * Cancellation policy.
 *
 * The tiers come from the property's config (PROPERTY.cancellation). For the
 * Whistle Inn they mirror Airbnb's "Moderate" policy with a 24-hour booking
 * grace period:
 *
 *  • Grace period:   Full refund if cancelled within 24 h of *booking*
 *                    AND check-in is ≥ 7 days away.
 *  • 5+ days out:   Full refund (100%).
 *  • 1–4 days out:  50% refund.
 *  • < 24 h to check-in: No refund (0%).
 */

import { PROPERTY, type PropertyConfig } from '@/config/property';

type Policy = PropertyConfig['cancellation'];

/** 'half' is the partial tier, whatever its percentage — the name is kept for stored data. */
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

/** "24 hours" for one day, otherwise "N days". */
function span(days: number): string {
  return days === 1 ? '24 hours' : `${days} days`;
}

/** "1–4 days", or "3 days" when the window is a single day. */
function partialWindow(p: Policy): string {
  const last = p.fullRefundDays - 1;
  return last > p.partialRefundDays ? `${p.partialRefundDays}–${last} days` : `${p.partialRefundDays} day${p.partialRefundDays !== 1 ? 's' : ''}`;
}

export const PARTIAL_REFUND_PERCENT = PROPERTY.cancellation.partialRefundPercent;

/**
 * Calculate the refund a guest is entitled to under the cancellation policy.
 *
 * @param totalPaid         Total amount the guest paid (dollars)
 * @param checkInDate       Booking check-in date
 * @param bookingCreatedAt  When the booking was originally created (for grace period)
 * @param now               Current time (default: new Date()) — injectable for testing
 * @param policy            Refund tiers (default: this property's)
 */
export function calculateRefund(
  totalPaid: number,
  checkInDate: Date,
  bookingCreatedAt: Date,
  now: Date = new Date(),
  policy: Policy = PROPERTY.cancellation,
): RefundResult {
  const msPerDay = 24 * 60 * 60 * 1000;

  const msUntilCheckIn = checkInDate.getTime() - now.getTime();
  const daysUntilCheckIn = msUntilCheckIn / msPerDay; // fractional days

  const msSinceBooking = now.getTime() - bookingCreatedAt.getTime();
  const hoursSinceBooking = msSinceBooking / (60 * 60 * 1000);

  // ── Grace period ──────────────────────────────────────────────────────────
  if (hoursSinceBooking <= policy.graceHours && daysUntilCheckIn >= policy.graceMinDaysBeforeCheckIn) {
    return {
      tier: 'full',
      refundAmount: totalPaid,
      reason: `Cancelled within ${policy.graceHours} hours of booking — full refund applies.`,
      daysUntilCheckIn,
    };
  }

  // ── Full-refund window ────────────────────────────────────────────────────
  if (daysUntilCheckIn >= policy.fullRefundDays) {
    return {
      tier: 'full',
      refundAmount: totalPaid,
      reason: `Cancelled ${policy.fullRefundDays} or more days before check-in — full refund applies.`,
      daysUntilCheckIn,
    };
  }

  // ── Partial-refund window ─────────────────────────────────────────────────
  if (daysUntilCheckIn >= policy.partialRefundDays && policy.partialRefundPercent > 0) {
    const partial = Math.round(totalPaid * policy.partialRefundPercent) / 100; // round to cents
    return {
      tier: 'half',
      refundAmount: partial,
      reason: `Cancelled ${partialWindow(policy)} before check-in — ${policy.partialRefundPercent}% refund applies.`,
      daysUntilCheckIn,
    };
  }

  // ── Too close to check-in (or already checked in) ─────────────────────────
  return {
    tier: 'none',
    refundAmount: 0,
    reason: `Cancelled within ${span(policy.partialRefundDays)} of check-in — no refund applies.`,
    daysUntilCheckIn,
  };
}

function policySummary(p: Policy) {
  return [
    {
      window: `Within ${p.graceHours} h of booking (check-in ≥${p.graceMinDaysBeforeCheckIn} days away)`,
      refund: 'Full refund',
      icon: '✅',
    },
    {
      window: `${p.fullRefundDays}+ days before check-in`,
      refund: 'Full refund',
      icon: '✅',
    },
    {
      window: `${partialWindow(p)} before check-in`,
      refund: `${p.partialRefundPercent}% refund`,
      icon: '⚠️',
    },
    {
      window: `Less than ${span(p.partialRefundDays)} before check-in`,
      refund: 'No refund',
      icon: '❌',
    },
  ];
}

/** Human-readable policy summary for display on the booking/cancel pages */
export const POLICY_SUMMARY = policySummary(PROPERTY.cancellation);

/** One sentence for confirmation emails. */
export function policySentence(p: Policy = PROPERTY.cancellation): string {
  return `Full refund if cancelled ${p.fullRefundDays}+ days before check-in. ` +
    `${p.partialRefundPercent}% refund if cancelled ${partialWindow(p)} before. ` +
    `No refund within ${span(p.partialRefundDays)} of check-in.`;
}
