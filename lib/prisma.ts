import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['query'], // 터미널에 쿼리 로그를 보여줌 (디버깅용)
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;