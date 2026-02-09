export interface ParsedBooking {
    guestName: string;
    startDate: string;
    endDate: string;
}

export async function parseIcalFeed(url: string, source: string): Promise<ParsedBooking[]> {
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'WhistleInn-BookingSync/1.0'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch iCal feed: ${response.status}`);
        }

        const icalData = await response.text();
        const bookings: ParsedBooking[] = [];

        // Simple iCal parsing - look for VEVENT blocks
        const events = icalData.split('BEGIN:VEVENT');

        for (const eventBlock of events.slice(1)) { // Skip the first empty part
            const endIndex = eventBlock.indexOf('END:VEVENT');
            if (endIndex === -1) continue;

            const event = eventBlock.substring(0, endIndex);

            // Extract DTSTART, DTEND, and SUMMARY
            const dtstartMatch = event.match(/DTSTART(?:;[^:]*)*:([^\r\n]+)/);
            const dtendMatch = event.match(/DTEND(?:;[^:]*)*:([^\r\n]+)/);
            const summaryMatch = event.match(/SUMMARY(?:;[^:]*)*:([^\r\n]+)/);

            if (dtstartMatch && dtendMatch) {
                try {
                    const startStr = dtstartMatch[1];
                    const endStr = dtendMatch[1];
                    const summary = summaryMatch ? summaryMatch[1] : 'Booked';

                    // Parse date strings (handle both DATE and DATETIME formats)
                    let startDate: Date;
                    let endDate: Date;

                    if (startStr.length === 8) { // DATE format: 20240101
                        startDate = new Date(
                            parseInt(startStr.substring(0, 4)),
                            parseInt(startStr.substring(4, 6)) - 1,
                            parseInt(startStr.substring(6, 8))
                        );
                    } else { // DATETIME format
                        startDate = new Date(startStr.replace(/Z$/, ''));
                    }

                    if (endStr.length === 8) { // DATE format
                        endDate = new Date(
                            parseInt(endStr.substring(0, 4)),
                            parseInt(endStr.substring(4, 6)) - 1,
                            parseInt(endStr.substring(6, 8))
                        );
                    } else { // DATETIME format
                        endDate = new Date(endStr.replace(/Z$/, ''));
                    }

                    // Skip past events
                    if (endDate < new Date()) continue;

                    bookings.push({
                        guestName: summary,
                        startDate: startDate.toISOString().split('T')[0],
                        endDate: endDate.toISOString().split('T')[0],
                    });

                } catch (dateError) {
                    console.warn('Failed to parse dates in event:', dateError);
                    continue;
                }
            }
        }

        return bookings;
    } catch (error) {
        console.error('Error parsing iCal feed:', error);
        throw new Error(`Failed to parse iCal feed: ${error}`);
    }
}