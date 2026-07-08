'use server';

import { StockService } from '@/services/stock.service';
import { getTenantContext } from '@/lib/auth-context';
import { StockMovementType } from '@prisma/client';
import { revalidatePath } from 'next/cache';

function authorizeRoles(userRole: string | null, allowedRoles: string[]) {
  if (!userRole || !allowedRoles.includes(userRole)) {
    throw new Error('Não autorizado: Acesso negado para esta função.');
  }
}

export async function registerMedicineAction(data: {
  name: string;
  activeIngredient: string;
  code?: string;
  category?: string;
  unit?: string;
  batch?: string;
  expirationDate?: Date;
  manufacturer?: string;
  initialStock?: number;
}) {
  try {
    const context = await getTenantContext();
    if (!context.userId || !context.municipalityId) {
      throw new Error('Não autorizado. Sessão expirada.');
    }

    authorizeRoles(context.role, ['Administrador', 'Farmácia']);

    const medicine = await StockService.registerMedicine(
      {
        ...data,
        municipalityId: context.municipalityId,
      },
      context.userId
    );

    revalidatePath('/farmacia');
    return { success: true, medicine };
  } catch (error: any) {
    return { success: false, error: error.message || 'Erro ao cadastrar medicamento.' };
  }
}

export async function adjustStockAction(data: {
  medicineId: string;
  type: StockMovementType;
  quantity: number;
  reason: string;
}) {
  try {
    const context = await getTenantContext();
    if (!context.userId || !context.municipalityId) {
      throw new Error('Não autorizado. Sessão expirada.');
    }

    authorizeRoles(context.role, ['Administrador', 'Farmácia']);

    const result = await StockService.adjustStock({
      ...data,
      userId: context.userId,
      municipalityId: context.municipalityId,
    });

    revalidatePath('/farmacia');
    return { success: true, medicine: result.medicine };
  } catch (error: any) {
    return { success: false, error: error.message || 'Erro ao realizar movimentação de estoque.' };
  }
}

export async function listMedicinesAction(search?: string, lowStockOnly?: boolean) {
  try {
    const context = await getTenantContext();
    if (!context.municipalityId) {
      throw new Error('Não autorizado. Sessão expirada.');
    }

    const medicines = await StockService.listInventory(
      context.municipalityId,
      search,
      lowStockOnly
    );

    return { success: true, medicines };
  } catch (error: any) {
    return { success: false, error: error.message || 'Erro ao carregar medicamentos.' };
  }
}

export async function getStockMovementLogsAction() {
  try {
    const context = await getTenantContext();
    if (!context.municipalityId) {
      throw new Error('Não autorizado. Sessão expirada.');
    }

    authorizeRoles(context.role, ['Administrador', 'Farmácia']);

    const movements = await StockService.getInventoryMovementLog(context.municipalityId);
    return { success: true, movements };
  } catch (error: any) {
    return { success: false, error: error.message || 'Erro ao buscar logs de movimentação de estoque.' };
  }
}
