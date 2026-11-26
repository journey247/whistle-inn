import { describe, it, expect } from 'vitest';
import { formatStayDate } from './stay-dates';

// The bug: Jan 12 stored as 2027-01-12T00:00Z rendered as "Jan 11" in Pacific.
describe('formatStayDate', () => {
    const jan12 = new Date('2027-01-12T00:00:00Z');

    it('renders the stored calendar day in every style', () => {
        expect(formatStayDate(jan12)).toBe('Jan 12, 2027');
        expect(formatStayDate(jan12, 'short')).toBe('Jan 12');
        expect(formatStayDate(jan12, 'long')).toBe('January 12, 2027');
        expect(formatStayDate(jan12, 'full')).toBe('Tuesday, January 12, 2027');
    });

    it('accepts ISO strings as serialized by the API', () => {
        expect(formatStayDate('2027-02-02T00:00:00.000Z', 'short')).toBe('Feb 2');
        expect(formatStayDate('2027-02-05', 'short')).toBe('Feb 5');
    });

    it('does not shift across a year boundary', () => {
        expect(formatStayDate('2027-01-01T00:00:00Z')).toBe('Jan 1, 2027');
    });

    it('ignores the process time zone', () => {
        const original = process.env.TZ;
        try {
            process.env.TZ = 'America/Los_Angeles';
            expect(formatStayDate(jan12)).toBe('Jan 12, 2027');
            // Sanity: the old local-zone formatting really was a day early here.
            expect(jan12.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'America/Los_Angeles' })).toBe('Jan 11');
        } finally {
            process.env.TZ = original;
        }
    });
});
