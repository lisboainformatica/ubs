import { prisma } from '@/lib/prisma';

export interface AuditLogData {
  userId: string | null;
  action: string;
  tableName: string;
  recordId: string;
  oldValues?: any;
  newValues?: any;
  municipalityId: string;
  ipAddress?: string;
  userAgent?: string;
}

export class AuditRepository {
  static async createLog(data: AuditLogData) {
    return prisma.auditLog.create({
      data: {
        userId: data.userId,
        action: data.action,
        tableName: data.tableName,
        recordId: data.recordId,
        oldValues: data.oldValues ? JSON.stringify(data.oldValues) : null,
        newValues: data.newValues ? JSON.stringify(data.newValues) : null,
        municipalityId: data.municipalityId,
        ipAddress: data.ipAddress || null,
        userAgent: data.userAgent || null,
      },
    });
  }

  static async getLogs(municipalityId: string) {
    return prisma.auditLog.findMany({
      where: { municipalityId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100, // Limit to recent logs for performance
    });
  }
}
