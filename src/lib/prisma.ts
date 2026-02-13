import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { Pool } from '@neondatabase/serverless';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

console.log('Using DATABASE_URL:', process.env.DATABASE_URL);

// Use Neon adapter for serverless environments
const neon = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaNeon(neon);

export const prisma = globalForPrisma.prisma || new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
