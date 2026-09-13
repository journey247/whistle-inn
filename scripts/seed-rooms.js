// Create the Room rows that back per-room pricing and per-room booking.
// Usage: node scripts/seed-rooms.js
//
// Idempotent: rooms that already have a row are left untouched, so this never
// overwrites prices the owner has set in the admin panel.

const { PrismaClient } = require('@prisma/client');
// Load environment variables. Prefer .env.local (used by Next.js) when present.
const dotenv = require('dotenv');
const fs = require('fs');
if (fs.existsSync('.env.local')) {
    dotenv.config({ path: '.env.local' });
} else {
    dotenv.config();
}

const prisma = new PrismaClient();

// Mirrors the bookable entries in src/lib/rooms.ts. Kept as plain data because
// this script runs under plain node, outside the TypeScript path aliases.
const ROOMS = [
    { slug: 'conductors-suite', name: 'Conductors Suite',   weekdayPrice: 195, weekendPrice: 225, maxGuests: 3, sortOrder: 0 },
    { slug: 'tree-house-room',  name: 'The Tree House Room', weekdayPrice: 165, weekendPrice: 195, maxGuests: 2, sortOrder: 1 },
    { slug: 'train-room',       name: 'The Train Room',      weekdayPrice: 185, weekendPrice: 215, maxGuests: 4, sortOrder: 2 },
    { slug: 'starlit-sky-room', name: 'Starlit Sky Room',    weekdayPrice: 165, weekendPrice: 195, maxGuests: 2, sortOrder: 3 },
    { slug: 'breakmans-suite',  name: 'Breakmans Suite',     weekdayPrice: 165, weekendPrice: 195, maxGuests: 2, sortOrder: 4 },
];

async function main() {
    let created = 0;

    for (const room of ROOMS) {
        const existing = await prisma.room.findUnique({ where: { slug: room.slug } });
        if (existing) {
            console.log(`- ${room.slug}: already configured ($${existing.weekdayPrice}/$${existing.weekendPrice}), leaving as is`);
            continue;
        }

        await prisma.room.create({ data: room });
        created++;
        console.log(`+ ${room.slug}: created at $${room.weekdayPrice} weekday / $${room.weekendPrice} weekend, sleeps ${room.maxGuests}`);
    }

    console.log(`\nDone. ${created} room${created === 1 ? '' : 's'} created, ${ROOMS.length - created} already present.`);
}

main()
    .catch(err => {
        console.error('Failed to seed rooms:', err);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
