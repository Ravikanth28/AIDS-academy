import { PrismaClient } from '@prisma/client'

// Auto-parse videosWatched JSON string → string[] on every read (MySQL has no native arrays)
function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  }).$extends({
    result: {
      moduleProgress: {
        videosWatched: {
          needs: { videosWatched: true },
          compute(data) {
            try {
              const raw = data.videosWatched as unknown as string
              return typeof raw === 'string' ? (JSON.parse(raw) as string[]) : (raw as unknown as string[])
            } catch {
              return [] as string[]
            }
          },
        },
      },
    },
  })
}

type PrismaClientExtended = ReturnType<typeof createPrismaClient>

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientExtended | undefined
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
