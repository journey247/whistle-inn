'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { PROPERTY } from '@/config/property';

function UnsubscribeForm() {
    const params = useSearchParams();
    const email = params.get('e') ?? '';
    const token = params.get('t') ?? '';
    const [state, setState] = useState<'idle' | 'working' | 'done' | 'error'>('idle');
    const [error, setError] = useState('');

    const unsubscribe = async () => {
        setState('working');
        try {
            const res = await fetch('/api/unsubscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ e: email, t: token }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Something went wrong.');
            setState('done');
        } catch (err: any) {
            setError(err.message);
            setState('error');
        }
    };

    if (!email || !token) {
        return <p className="text-stone-600">This unsubscribe link is incomplete. Please use the link from your email.</p>;
    }

    if (state === 'done') {
        return (
            <p className="text-stone-700">
                You&apos;re unsubscribed. <strong>{email}</strong> won&apos;t receive offers from {PROPERTY.name} again.
                Booking confirmations for any future stays will still arrive.
            </p>
        );
    }

    return (
        <>
            <p className="mb-6 text-stone-600">
                Stop offers and follow-up emails from {PROPERTY.name} to <strong>{email}</strong>?
            </p>
            {state === 'error' && <p className="mb-4 text-sm text-red-600" role="alert">{error}</p>}
            <button
                onClick={unsubscribe}
                disabled={state === 'working'}
                className="w-full rounded-xl bg-stone-900 px-6 py-3 font-semibold text-white hover:bg-stone-800 disabled:opacity-60 transition-colors"
            >
                {state === 'working' ? 'Unsubscribing…' : 'Unsubscribe'}
            </button>
        </>
    );
}

export default function UnsubscribePage() {
    return (
        <main className="flex min-h-screen items-center justify-center bg-stone-50 px-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg text-center">
                <p className="text-sm font-semibold uppercase tracking-widest text-amber-600">{PROPERTY.name}</p>
                <h1 className="mt-1 mb-4 text-2xl font-bold text-stone-900">Email preferences</h1>
                <Suspense fallback={null}>
                    <UnsubscribeForm />
                </Suspense>
                <Link href="/" className="mt-6 inline-block text-sm text-stone-500 underline hover:text-stone-700">
                    Back to {PROPERTY.name}
                </Link>
            </div>
        </main>
    );
}
