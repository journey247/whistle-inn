// One-off script to create or update an AdminUser
// Usage: node scripts/create_admin.js

// Load environment variables BEFORE requiring Prisma, the same way Next.js
// does (.env.local wins over .env). Requiring @prisma/client first lets it
// load .env on its own, which once sent a dev-only admin to production.
const dotenv = require('dotenv');
const fs = require('fs');
if (fs.existsSync('.env.local')) dotenv.config({ path: '.env.local', override: true });
dotenv.config();

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();
const dbHost = (() => {
    try { return new URL(process.env.DATABASE_URL).hostname; } catch { return 'unknown'; }
})();

async function main() {
    const email = process.env.ADMIN_EMAIL || 'admin@example.com';
    const password = process.env.ADMIN_PASSWORD || 'password123';

    console.log(`Database: ${dbHost}`);
    const hashed = await bcrypt.hash(password, 10);

    const existing = await prisma.adminUser.findUnique({ where: { email } });
    if (existing) {
        console.log(`Admin user with email ${email} already exists. Updating password.`);
        await prisma.adminUser.update({ where: { email }, data: { hashedPassword: hashed } });
    } else {
        const user = await prisma.adminUser.create({ data: { email, hashedPassword: hashed, role: 'admin' } });
        console.log('Created admin user:', user.email);
    }

    // The password is not printed: it came from ADMIN_PASSWORD (or is the
    // documented default), and terminal output ends up in logs.
    console.log('Admin email:', email);
    console.log('You can change these by setting ADMIN_EMAIL and ADMIN_PASSWORD in your .env and re-running this script.');
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
}).finally(async () => {
    await prisma.$disconnect();
});