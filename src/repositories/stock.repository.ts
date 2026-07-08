import { prisma } from '@/lib/prisma';
import { StockMovementType, Prisma } from '@prisma/client';

export interface CreateMedicineData {
  name: string;
  activeIngredient: string;
  code?: string;
  category?: string;
  unit?: string;
  batch?: string;
  expirationDate?: Date;
  manufacturer?: string;
  municipalityId: string;
}

export class StockRepository {
  static async findMedicineById(id: string, municipalityId: string) {
    return prisma.medicine.findFirst({
      where: { id, municipalityId },
      include: {
        stockMovements: {
          include: { user: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  static async listMedicines(filters: {
    municipalityId: string;
    search?: string;
    lowStockOnly?: boolean;
  }) {
    const whereClause: any = { municipalityId: filters.municipalityId };

    if (filters.search) {
      whereClause.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { activeIngredient: { contains: filters.search, mode: 'insensitive' } },
        { code: { contains: filters.search } },
      ];
    }

    if (filters.lowStockOnly) {
      // Define "low stock" as less than or equal to 100 units
      whereClause.stockLevel = { lte: 100 };
    }

    return prisma.medicine.findMany({
      where: whereClause,
      orderBy: { name: 'asc' },
    });
  }

  static async createMedicine(data: CreateMedicineData & { stockLevel?: number }) {
    return prisma.medicine.create({
      data: {
        name: data.name,
        activeIngredient: data.activeIngredient,
        code: data.code || null,
        category: data.category || null,
        unit: data.unit || 'UNIDADE',
        batch: data.batch || null,
        expirationDate: data.expirationDate || null,
        manufacturer: data.manufacturer || null,
        stockLevel: data.stockLevel || 0,
        municipalityId: data.municipalityId,
      },
    });
  }

  static async updateMedicine(id: string, municipalityId: string, data: Partial<CreateMedicineData>) {
    const medicine = await prisma.medicine.findFirst({
      where: { id, municipalityId },
    });
    if (!medicine) {
      throw new Error('Medicamento não encontrado.');
    }
    return prisma.medicine.update({
      where: { id },
      data,
    });
  }

  static async createMovement(data: {
    medicineId: string;
    type: StockMovementType;
    quantity: number;
    reason?: string;
    userId: string;
    municipalityId: string;
  }) {
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 1. Create movement log
      const movement = await tx.stockMovement.create({
        data: {
          medicineId: data.medicineId,
          type: data.type,
          quantity: data.quantity,
          reason: data.reason || null,
          userId: data.userId,
          municipalityId: data.municipalityId,
        },
      });

      // 2. Adjust medicine stock level
      const multiplier = data.type === StockMovementType.ENTRY ? 1 : -1;
      const adjustment = data.quantity * multiplier;

      const med = await tx.medicine.findFirst({
        where: { id: data.medicineId, municipalityId: data.municipalityId },
      });
      if (!med) {
        throw new Error('Medicamento não encontrado.');
      }

      const medicine = await tx.medicine.update({
        where: { id: data.medicineId },
        data: {
          stockLevel: {
            increment: adjustment,
          },
        },
      });

      // Prevent negative stock levels
      if (medicine.stockLevel < 0) {
        throw new Error(`Estoque insuficiente para o medicamento "${medicine.name}". Estoque atual: ${medicine.stockLevel - adjustment}.`);
      }

      return { movement, medicine };
    });
  }

  static async listRecentMovements(municipalityId: string, limit = 50) {
    return prisma.stockMovement.findMany({
      where: { municipalityId },
      include: {
        medicine: true,
        user: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  static async countLowStock(municipalityId: string) {
    return prisma.medicine.count({
      where: {
        municipalityId,
        stockLevel: { lte: 100 },
      },
    });
  }
}
