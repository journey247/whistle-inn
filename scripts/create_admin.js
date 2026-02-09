// One-off script to create or update an AdminUser
// Usage: node scripts/create_admin.js

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const prisma = new PrismaClient();

async function main() {
    const email = process.env.ADMIN_EMAIL || 'admin@example.com';
    const password = process.env.ADMIN_PASSWORD || 'password123';

    const hashed = await bcrypt.hash(password, 10);

    const existing = await prisma.adminUser.findUnique({ where: { email } });
    if (existing) {
        console.log(`Admin user with email ${email} already exists. Updating password.`);
        await prisma.adminUser.update({ where: { email }, data: { hashedPassword: hashed } });
    } else {
        const user = await prisma.adminUser.create({ data: { email, hashedPassword: hashed, role: 'admin' } });
        console.log('Created admin user:', user.email);
    }

    console.log('Admin credentials:');
    console.log('  email:', email);
    console.log('  password:', password);
    console.log('You can change these by setting ADMIN_EMAIL and ADMIN_PASSWORD in your .env and re-running this script.');
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
}).finally(async () => {
    await prisma.$disconnect();
});