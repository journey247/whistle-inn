/**
 * Formatting for booking (stay) dates.
 *
 * Booking start/end dates are calendar days, stored as midnight UTC. Formatting
 * them in the viewer's or server's local zone (Pacific) shifts them a day early,
 * so every guest- or owner-facing stay date goes through here and is rendered
 * in UTC — the same stored date reads the same on every page and email.
 */

export type StayDateStyle = 'short' | 'medium' | 'long' | 'full';

const STYLES: Record<StayDateStyle, Intl.DateTimeFormatOptions> = {
    /** Feb 2 */
    short: { month: 'short', day: 'numeric' },
    /** Feb 2, 2027 */
    medium: { month: 'short', day: 'numeric', year: 'numeric' },
    /** February 2, 2027 */
    long: { month: 'long', day: 'numeric', year: 'numeric' },
    /** Tuesday, February 2, 2027 */
    full: { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' },
};

export function formatStayDate(date: Date | string, style: StayDateStyle = 'medium'): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', { ...STYLES[style], timeZone: 'UTC' });
}
