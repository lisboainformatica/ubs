import { StockRepository, CreateMedicineData } from '@/repositories/stock.repository';
import { AuditRepository } from '@/repositories/audit.repository';
import { StockMovementType } from '@prisma/client';

export class StockService {
  static async registerMedicine(data: CreateMedicineData & { initialStock?: number }, actorUserId: string) {
    const medicine = await StockRepository.createMedicine({
      ...data,
      stockLevel: data.initialStock || 0,
    });

    // Audit log
    await AuditRepository.createLog({
      userId: actorUserId,
      action: 'CREATE',
      tableName: 'Medicine',
      recordId: medicine.id,
      newValues: medicine,
      municipalityId: data.municipalityId,
    });

    // If initial stock was provided, create movement
    if (data.initialStock && data.initialStock > 0) {
      await StockRepository.createMovement({
        medicineId: medicine.id,
        type: StockMovementType.ENTRY,
        quantity: data.initialStock,
        reason: 'Carga inicial no cadastro do medicamento',
        userId: actorUserId,
        municipalityId: data.municipalityId,
      });
    }

    return medicine;
  }

  static async adjustStock(
    data: {
      medicineId: string;
      type: StockMovementType;
      quantity: number;
      reason: string;
      userId: string;
      municipalityId: string;
    }
  ) {
    const result = await StockRepository.createMovement(data);

    // Audit log
    await AuditRepository.createLog({
      userId: data.userId,
      action: 'STOCK_ADJUST',
      tableName: 'Medicine',
      recordId: data.medicineId,
      newValues: { type: data.type, quantity: data.quantity, newStockLevel: result.medicine.stockLevel, reason: data.reason },
      municipalityId: data.municipalityId,
    });

    // Automatic alert: check if stock drops below critical levels (<= 100)
    if (result.medicine.stockLevel <= 100 && data.type !== StockMovementType.ENTRY) {
      const { prisma } = await import('@/lib/prisma');
      
      // Notify users (like administrators and pharmacists) about low stock
      // Find all users in the municipality with Role 'Administrador' or 'Farmácia'
      const staffUsers = await prisma.user.findMany({
        where: {
          municipalityId: data.municipalityId,
          role: {
            name: { in: ['Administrador', 'Farmácia'] },
          },
        },
      });

      for (const user of staffUsers) {
        await prisma.notification.create({
          data: {
            userId: user.id,
            title: `Estoque Crítico: ${result.medicine.name}`,
            content: `O medicamento ${result.medicine.name} (${result.medicine.activeIngredient}) atingiu o estoque crítico de ${result.medicine.stockLevel} ${result.medicine.unit.toLowerCase()}(s).`,
            type: 'STOCK_ALERT',
            municipalityId: data.municipalityId,
          },
        });
      }
    }

    return result;
  }

  static async listInventory(municipalityId: string, search?: string, lowStockOnly?: boolean) {
    return StockRepository.listMedicines({ municipalityId, search, lowStockOnly });
  }

  static async getInventoryMovementLog(municipalityId: string) {
    return StockRepository.listRecentMovements(municipalityId);
  }
}
