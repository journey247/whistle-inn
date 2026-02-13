import Link from 'next/link';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';
import { SuccessView } from '@/components/SuccessView';

interface PageProps {
    searchParams: {
        session_id?: string;
        booking_id?: string;
    }
}

export default async function SuccessPage({ searchParams }: PageProps) {
    const sessionId = searchParams.session_id;
    const bookingId = searchParams.booking_id;

    if (!sessionId || !bookingId) {
        redirect('/');
    }

    // ---------------------------------------------------------
    // MOCK CONFIRMATION LOGIC (For Dev/Test without Webhooks)
    // ---------------------------------------------------------
    const isMock = sessionId.startsWith('cs_test_mock_');

    if (isMock) {
        try {
            const pendingBooking = await prisma.booking.findUnique({
                where: { id: bookingId }
            });

            if (pendingBooking && pendingBooking.status !== 'paid') {
                console.log(`[Mock] Auto-confirming booking ${bookingId}`);

                // 1. Update Status
                await prisma.booking.update({
                    where: { id: bookingId },
                    data: {
                        status: 'paid',
                        guestName: 'Mock Guest',
                        email: 'mock@example.com',
                        notes: 'Confirmed via Mock Success Page'
                    }
                });

                // 2. Send Email
                try {
                    await sendEmail({
                        to: 'mock@example.com',
                        templateName: 'booking_confirmation',
                        variables: {
                            guestName: 'Mock Guest',
                            bookingId: pendingBooking.id,
                            startDate: pendingBooking.startDate.toLocaleDateString(),
                            endDate: pendingBooking.endDate.toLocaleDateString(),
                            amount: pendingBooking.totalPrice.toFixed(2),
                        },
                        bookingId: pendingBooking.id
                    });
                } catch (emailErr) {
                    console.error('[Mock] Failed to send email:', emailErr);
                }
            }
        } catch (err) {
            console.error('[Mock] Error confirming booking:', err);
        }
    }
    // ---------------------------------------------------------

    // Fetch final booking details to display
    const booking = await prisma.booking.findUnique({
        where: { id: bookingId }
    });

    if (!booking) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="text-center p-8">
                    <h1 className="text-2xl font-bold text-slate-800 mb-2">Booking Not Found</h1>
                    <p className="text-slate-600 mb-6">We couldn't locate reservation {bookingId}.</p>
                    <Link href="/" className="text-brand-gold hover:underline">Return Home</Link>
                </div>
            </div>
        );
    }

    // Cast to any to satisfy the potentially stale Prisma client type definition
    // which may be missing 'guestCount' even though it exists in the DB.
    // If it's missing at runtime, default to 1.
    const bookingForView = {
        ...booking,
        guestCount: (booking as any).guestCount ?? 1
    };

    return (
        <SuccessView booking={bookingForView} />
    );
}
