// End-to-end check of the scheduled sync's double-booking alert, run in CI
// against the throwaway Postgres (see .github/workflows/e2e.yml).
//
// Plants a paid direct booking and an overlapping Airbnb reservation, calls
// /api/cron/ical-sync as the scheduler does, and checks one alert is stored
// and that a second run does not repeat it. Also checks Airbnb's
// "Not available" echo of a booking is not treated as a conflict.
//
//   CRON_SECRET, DATABASE_URL, E2E_BASE_URL (default http://localhost:3000)

const { PrismaClient } = require('@prisma/client');

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3000';
const prisma = new PrismaClient();
const day = n => new Date(Date.UTC(2030, 0, 1 + n));

async function runSync() {
    const res = await fetch(`${BASE}/api/cron/ical-sync`, { headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` } });
    const body = await res.json();
    if (res.status !== 200) throw new Error(`Cron answered ${res.status}: ${JSON.stringify(body)}`);
    return body;
}

(async () => {
    try {
        console.log('→ cron refuses a wrong secret');
        const denied = await fetch(`${BASE}/api/cron/ical-sync`, { headers: { Authorization: 'Bearer wrong' } });
        if (denied.status !== 401) throw new Error(`Expected 401, got ${denied.status}`);

        console.log('→ plant a direct booking, an overlapping Airbnb reservation, and an echo block');
        const booking = await prisma.booking.create({
            data: { startDate: day(10), endDate: day(13), guestName: 'E2E Guest', email: 'guest@example.test', totalPrice: 900, status: 'paid' },
        });
        await prisma.externalBooking.createMany({
            data: [
                { source: 'Airbnb', guestName: 'Reserved', startDate: day(12), endDate: day(15) },
                { source: 'Airbnb', guestName: 'Airbnb (Not available)', startDate: day(10), endDate: day(13) },
            ],
        });

        console.log('→ the scheduled sync reports one conflict and stores one alert');
        const first = await runSync();
        if (first.conflicts !== 1) throw new Error(`Expected 1 conflict, got ${first.conflicts}`);
        const alerts = () => prisma.notification.findMany({ where: { type: 'booking_conflict' } });
        const afterFirst = await alerts();
        if (afterFirst.length !== 1) throw new Error(`Expected 1 alert, got ${afterFirst.length}`);
        if (!afterFirst[0].message.includes('E2E Guest')) throw new Error('Alert does not name the guest');

        console.log('→ a second run does not alert again');
        await runSync();
        const afterSecond = await alerts();
        if (afterSecond.length !== 1) throw new Error(`Expected still 1 alert, got ${afterSecond.length}`);

        await prisma.externalBooking.deleteMany({ where: { source: 'Airbnb' } });
        await prisma.notification.deleteMany({ where: { type: 'booking_conflict' } });
        await prisma.booking.delete({ where: { id: booking.id } });

        console.log('E2E sync conflict test passed');
        process.exit(0);
    } catch (err) {
        console.error('E2E sync conflict test failed:', err);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
})();
