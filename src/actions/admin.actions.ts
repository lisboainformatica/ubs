'use server';

import { prisma } from '@/lib/prisma';
import { getTenantContext } from '@/lib/auth-context';
import { revalidatePath } from 'next/cache';
import * as bcrypt from 'bcrypt';

function authorizeRoles(userRole: string | null, allowedRoles: string[]) {
  if (!userRole || !allowedRoles.includes(userRole)) {
    throw new Error('Não autorizado: Acesso negado para esta função.');
  }
}

export async function createHealthUnitAction(data: {
  name: string;
  cnes?: string;
  address: string;
  cep: string;
  city: string;
  state: string;
  phone?: string;
  operatingHours?: string;
}) {
  try {
    const context = await getTenantContext();
    if (!context.userId || !context.municipalityId) {
      throw new Error('Não autorizado. Sessão expirada.');
    }

    authorizeRoles(context.role, ['Administrador']);

    const unit = await prisma.healthUnit.create({
      data: {
        name: data.name,
        cnes: data.cnes || null,
        address: data.address,
        cep: data.cep,
        city: data.city,
        state: data.state,
        phone: data.phone || null,
        operatingHours: data.operatingHours || '07:00 - 17:00',
        municipalityId: context.municipalityId,
      },
    });

    revalidatePath('/admin');
    return { success: true, unit };
  } catch (error: any) {
    return { success: false, error: error.message || 'Erro ao cadastrar posto de saúde.' };
  }
}

export async function createReceptionistAction(data: {
  name: string;
  email: string;
  password: string;
}) {
  try {
    const context = await getTenantContext();
    if (!context.userId || !context.municipalityId) {
      throw new Error('Não autorizado. Sessão expirada.');
    }

    authorizeRoles(context.role, ['Administrador']);

    // Find the Recepcionista role in this municipality
    const role = await prisma.role.findFirst({
      where: {
        name: 'Recepcionista',
        municipalityId: context.municipalityId,
      },
    });

    if (!role) {
      throw new Error('Papel "Recepcionista" não configurado para este município.');
    }

    // Verify if email already exists in this municipality
    const existingUser = await prisma.user.findFirst({
      where: {
        email: data.email,
        municipalityId: context.municipalityId,
      },
    });

    if (existingUser) {
      throw new Error('Este e-mail já está em uso neste município.');
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
        roleId: role.id,
        municipalityId: context.municipalityId,
      },
    });

    revalidatePath('/admin');
    return { success: true, user: { id: user.id, name: user.name, email: user.email } };
  } catch (error: any) {
    return { success: false, error: error.message || 'Erro ao cadastrar recepcionista.' };
  }
}

export async function createDoctorAction(data: {
  name: string;
  email: string;
  password: string;
  crm: string;
  phone?: string;
  healthUnitId: string;
  specialtyIds: string[];
}) {
  try {
    const context = await getTenantContext();
    if (!context.userId || !context.municipalityId) {
      throw new Error('Não autorizado. Sessão expirada.');
    }

    authorizeRoles(context.role, ['Administrador']);

    // Find the Médico role in this municipality
    const role = await prisma.role.findFirst({
      where: {
        name: 'Médico',
        municipalityId: context.municipalityId,
      },
    });

    if (!role) {
      throw new Error('Papel "Médico" não configurado para este município.');
    }

    // Verify if email already exists in this municipality
    const existingUser = await prisma.user.findFirst({
      where: {
        email: data.email,
        municipalityId: context.municipalityId,
      },
    });

    if (existingUser) {
      throw new Error('Este e-mail já está em uso neste município.');
    }

    // Verify if CRM already exists in this municipality
    const existingDoctor = await prisma.doctor.findFirst({
      where: {
        crm: data.crm,
        municipalityId: context.municipalityId,
      },
    });

    if (existingDoctor) {
      throw new Error('Este CRM já está cadastrado neste município.');
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    // Create user and doctor in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: data.name,
          email: data.email,
          passwordHash,
          roleId: role.id,
          municipalityId: context.municipalityId as string,
        },
      });

      const doctor = await tx.doctor.create({
        data: {
          userId: user.id,
          crm: data.crm,
          phone: data.phone || null,
          email: data.email,
          healthUnitId: data.healthUnitId,
          municipalityId: context.municipalityId as string,
        },
      });

      // Create specialties connections
      if (data.specialtyIds && data.specialtyIds.length > 0) {
        await tx.doctorSpecialty.createMany({
          data: data.specialtyIds.map((specialtyId) => ({
            doctorId: doctor.id,
            specialtyId,
          })),
        });
      }

      return { user, doctor };
    });

    revalidatePath('/admin');
    return { success: true, doctorId: result.doctor.id };
  } catch (error: any) {
    return { success: false, error: error.message || 'Erro ao cadastrar médico.' };
  }
}

export async function getDoctorSchedulesAction(doctorId: string) {
  try {
    const context = await getTenantContext();
    if (!context.userId || !context.municipalityId) {
      throw new Error('Não autorizado. Sessão expirada.');
    }
    authorizeRoles(context.role, ['Administrador']);

    const schedules = await prisma.schedule.findMany({
      where: { doctorId, municipalityId: context.municipalityId },
      include: { healthUnit: true },
      orderBy: { dayOfWeek: 'asc' },
    });

    return {
      success: true,
      schedules: schedules.map(s => ({
        id: s.id,
        doctorId: s.doctorId,
        healthUnitId: s.healthUnitId,
        healthUnitName: s.healthUnit.name,
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime,
        slotDurationMinutes: s.slotDurationMinutes,
        breakStartTime: s.breakStartTime || '',
        breakEndTime: s.breakEndTime || '',
      })),
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Erro ao carregar agendas do médico.' };
  }
}

export async function createDoctorScheduleAction(data: {
  doctorId: string;
  healthUnitId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDurationMinutes: number;
  breakStartTime?: string;
  breakEndTime?: string;
}) {
  try {
    const context = await getTenantContext();
    if (!context.userId || !context.municipalityId) {
      throw new Error('Não autorizado. Sessão expirada.');
    }
    authorizeRoles(context.role, ['Administrador']);

    const schedule = await prisma.schedule.create({
      data: {
        doctorId: data.doctorId,
        healthUnitId: data.healthUnitId,
        dayOfWeek: data.dayOfWeek,
        startTime: data.startTime,
        endTime: data.endTime,
        slotDurationMinutes: data.slotDurationMinutes,
        breakStartTime: data.breakStartTime || null,
        breakEndTime: data.breakEndTime || null,
        municipalityId: context.municipalityId,
      },
    });

    return { success: true, schedule };
  } catch (error: any) {
    return { success: false, error: error.message || 'Erro ao criar horário de agenda.' };
  }
}

export async function deleteDoctorScheduleAction(scheduleId: string) {
  try {
    const context = await getTenantContext();
    if (!context.userId || !context.municipalityId) {
      throw new Error('Não autorizado. Sessão expirada.');
    }
    authorizeRoles(context.role, ['Administrador']);

    const schedule = await prisma.schedule.findFirst({
      where: { id: scheduleId, municipalityId: context.municipalityId },
    });

    if (!schedule) {
      throw new Error('Horário de agenda não encontrado.');
    }

    await prisma.schedule.delete({
      where: { id: scheduleId },
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Erro ao excluir horário de agenda.' };
  }
}
