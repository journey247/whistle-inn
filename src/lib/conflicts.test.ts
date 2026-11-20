import { describe, it, expect, vi } from 'vitest';

vi.mock('./prisma', () => ({ prisma: {} }));
vi.mock('./alerts', () => ({ alertOnce: vi.fn() }));

import { findConflicts, isReservation } from './conflicts';

const d = (s: string) => new Date(`${s}T00:00:00Z`);
const booking = { id: 'b1', guestName: 'Pat', startDate: d('2026-12-10'), endDate: d('2026-12-13') };

describe('isReservation', () => {
    it.each(['Reserved', 'Airbnb (Reserved)', 'Jane Smith', 'VRBO - J. Smith'])('treats "%s" as a reservation', s => {
        expect(isReservation(s)).toBe(true);
    });

    it.each(['Airbnb (Not available)', 'Blocked', 'Unavailable', 'CLOSED - Not available'])('treats "%s" as a block', s => {
        expect(isReservation(s)).toBe(false);
    });
});

describe('findConflicts', () => {
    it('flags a channel reservation that overlaps a direct booking', () => {
        const block = { source: 'Airbnb', guestName: 'Reserved', startDate: d('2026-12-12'), endDate: d('2026-12-15') };
        const [conflict] = findConflicts([booking], [block]);
        expect(conflict.key).toBe('b1:Airbnb:2026-12-12');
        expect(conflict.booking.id).toBe('b1');
    });

    it('ignores back-to-back stays (checkout day = check-in day)', () => {
        const before = { source: 'Airbnb', guestName: 'Reserved', startDate: d('2026-12-07'), endDate: d('2026-12-10') };
        const after = { source: 'Airbnb', guestName: 'Reserved', startDate: d('2026-12-13'), endDate: d('2026-12-16') };
        expect(findConflicts([booking], [before, after])).toEqual([]);
    });

    it("ignores Airbnb's echo of this site's own booking", () => {
        const echo = { source: 'Airbnb', guestName: 'Airbnb (Not available)', startDate: booking.startDate, endDate: booking.endDate };
        expect(findConflicts([booking], [echo])).toEqual([]);
    });

    it('gives each conflict a stable key so it is alerted once', () => {
        const block = { source: 'VRBO', guestName: 'J. Smith', startDate: d('2026-12-11'), endDate: d('2026-12-12') };
        const a = findConflicts([booking], [block]);
        const b = findConflicts([booking], [{ ...block }]);
        expect(a[0].key).toBe(b[0].key);
    });
});
