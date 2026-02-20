'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { POLICY_SUMMARY } from '@/lib/cancellationPolicy';

// ─── Types ────────────────────────────────────────────────────────────────────

interface BookingPreview {
  id: string;
  guestName: string;
  startDate: string;
  endDate: string;
  totalPrice: number;
  status: string;
}

interface RefundInfo {
  tier: 'full' | 'half' | 'none';
  refundAmount: number;
  reason: string;
  daysUntilCheckIn: number;
}

type PageState = 'loading' | 'preview' | 'confirming' | 'done' | 'error';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(date: string) {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function RefundBadge({ tier, amount }: { tier: RefundInfo['tier']; amount: number }) {
  if (tier === 'full') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-800">
        ✅ Full refund — ${amount.toFixed(2)}
      </span>
    );
  }
  if (tier === 'half') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-800">
        ⚠️ 50% refund — ${amount.toFixed(2)}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-sm font-semibold text-red-800">
      ❌ No refund
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CancelBookingPage() {
  const params = useParams();
  const router = useRouter();
  const token = params?.token as string;

  const [state, setState] = useState<PageState>('loading');
  const [booking, setBooking] = useState<BookingPreview | null>(null);
  const [refund, setRefund] = useState<RefundInfo | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showPolicy, setShowPolicy] = useState(false);

  // Load booking preview on mount
  useEffect(() => {
    if (!token) return;

    fetch(`/api/bookings/cancel?token=${encodeURIComponent(token)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setErrorMsg(data.error);
          setState('error');
        } else {
          setBooking(data.booking);
          setRefund(data.refund);
          setState('preview');
        }
      })
      .catch(() => {
        setErrorMsg('Unable to load booking details. Please try again or contact us directly.');
        setState('error');
      });
  }, [token]);

  const handleCancel = async () => {
    setState('confirming');
    try {
      const res = await fetch('/api/bookings/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setErrorMsg(data.error || 'Cancellation failed. Please contact us directly.');
        setState('error');
      } else {
        setSuccessMsg(data.message);
        setState('done');
      }
    } catch {
      setErrorMsg('Network error. Please try again or contact us directly.');
      setState('error');
    }
  };

  // ─── Render states ────────────────────────────────────────────────────────

  if (state === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-amber-400 border-t-transparent" />
          <p className="text-stone-600">Loading your booking…</p>
        </div>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-50 px-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg text-center">
          <div className="mb-4 text-5xl">😕</div>
          <h1 className="mb-2 text-xl font-bold text-stone-800">Something went wrong</h1>
          <p className="mb-6 text-stone-600">{errorMsg}</p>
          <a
            href="mailto:Nora@thewhistleinn.com"
            className="inline-block rounded-lg bg-amber-500 px-6 py-3 font-semibold text-white hover:bg-amber-600 transition-colors"
          >
            Email us at Nora@thewhistleinn.com
          </a>
        </div>
      </div>
    );
  }

  if (state === 'done') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-50 px-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg text-center">
          <div className="mb-4 text-5xl">✅</div>
          <h1 className="mb-2 text-xl font-bold text-stone-800">Booking Cancelled</h1>
          <p className="mb-6 text-stone-600">{successMsg}</p>
          <p className="text-sm text-stone-500">
            You'll receive a confirmation email shortly. If you have questions,
            email us at{' '}
            <a href="mailto:Nora@thewhistleinn.com" className="text-amber-600 underline">
              Nora@thewhistleinn.com
            </a>
            .
          </p>
          <button
            onClick={() => router.push('/')}
            className="mt-6 rounded-lg border border-stone-300 px-6 py-2 text-sm text-stone-700 hover:bg-stone-100 transition-colors"
          >
            Return to homepage
          </button>
        </div>
      </div>
    );
  }

  // ─── Preview + Confirm ────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-stone-50 px-4 py-12">
      <div className="mx-auto w-full max-w-lg">

        {/* Header */}
        <div className="mb-8 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-amber-600">Whistle Inn</p>
          <h1 className="mt-1 text-3xl font-bold text-stone-900">Cancel Your Booking</h1>
        </div>

        {/* Booking Details Card */}
        <div className="rounded-2xl bg-white p-6 shadow-md mb-4">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-stone-500">
            Booking Details
          </h2>

          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-stone-500">Guest</dt>
              <dd className="font-medium text-stone-900">{booking!.guestName}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-stone-500">Check-in</dt>
              <dd className="font-medium text-stone-900">{fmt(booking!.startDate)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-stone-500">Check-out</dt>
              <dd className="font-medium text-stone-900">{fmt(booking!.endDate)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-stone-500">Total paid</dt>
              <dd className="font-medium text-stone-900">${booking!.totalPrice.toFixed(2)}</dd>
            </div>
          </dl>
        </div>

        {/* Refund Info Card */}
        {refund && (
          <div className="rounded-2xl bg-white p-6 shadow-md mb-4">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-stone-500">
              Refund Estimate
            </h2>
            <div className="mb-3">
              <RefundBadge tier={refund.tier} amount={refund.refundAmount} />
            </div>
            <p className="text-sm text-stone-600">{refund.reason}</p>
            {refund.tier !== 'none' && (
              <p className="mt-2 text-xs text-stone-400">
                Refunds typically appear within 5–10 business days on your original payment method.
              </p>
            )}
          </div>
        )}

        {/* Cancellation Policy Accordion */}
        <div className="rounded-2xl bg-white p-6 shadow-md mb-6">
          <button
            onClick={() => setShowPolicy((p) => !p)}
            className="flex w-full items-center justify-between text-sm font-semibold text-stone-700"
          >
            <span>Our Cancellation Policy</span>
            <span className="text-stone-400">{showPolicy ? '▲' : '▼'}</span>
          </button>

          {showPolicy && (
            <div className="mt-4 space-y-2">
              {POLICY_SUMMARY.map((row) => (
                <div key={row.window} className="flex items-start gap-3 text-sm">
                  <span className="mt-0.5">{row.icon}</span>
                  <div>
                    <p className="text-stone-700">{row.window}</p>
                    <p className="text-stone-500">{row.refund}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          <button
            onClick={handleCancel}
            disabled={state === 'confirming'}
            className="w-full rounded-xl bg-red-600 px-6 py-3 font-semibold text-white hover:bg-red-700 disabled:opacity-60 transition-colors"
          >
            {state === 'confirming' ? 'Processing…' : 'Confirm Cancellation'}
          </button>
          <button
            onClick={() => router.push('/')}
            className="w-full rounded-xl border border-stone-300 px-6 py-3 font-semibold text-stone-700 hover:bg-stone-100 transition-colors"
          >
            Keep My Booking
          </button>
        </div>

        <p className="mt-6 text-center text-xs text-stone-400">
          Need help? Email{' '}
          <a href="mailto:Nora@thewhistleinn.com" className="underline">
            Nora@thewhistleinn.com
          </a>
        </p>
      </div>
    </div>
  );
}
