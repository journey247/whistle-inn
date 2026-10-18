import type { PropertyConfig } from '../property';

export const whistleInn: PropertyConfig = {
    id: 'whistle-inn',
    name: 'Whistle Inn',
    brandLine: 'Whistle Inn Private Getaway',
    siteUrl: 'https://thewhistleinn.com',
    title: 'Whistle Inn — Private Getaway in the Sierra',
    description:
        'A beautifully appointed Victorian farmhouse in Alta, California. Sleeps up to 14 — perfect for family gatherings, retreats, and getting away from it all.',
    roomsDescription:
        'Five bedrooms and a shared living space at Whistle Inn, a Victorian farmhouse in Alta, California. Sleeps up to 14.',
    ogImageAlt: 'The Whistle Inn — Victorian farmhouse exterior in Alta, California',
    propertyType: 'Victorian Farmhouse',
    hostName: 'Nora',
    email: 'Nora@thewhistleinn.com',
    fromEmail: 'noreply@thewhistleinn.com',
    phone: '(530) 448-6242',
    phoneE164: '+15304486242',
    address: {
        street: '33800 Alta Bonny Nook Rd',
        locality: 'Alta',
        region: 'CA',
        postalCode: '95701',
        country: 'US',
    },
    locationLabel: 'Alta, California',
    checkinTime: '16:00',
    checkoutTime: '11:00',
    bedrooms: 5,
    maxGuests: 14,
    amenities: ['Pool', 'Full kitchen', 'Balcony'],
};
