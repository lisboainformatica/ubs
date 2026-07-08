'use server';

import { AppointmentService } from '@/services/appointment.service';
import { AppointmentRepository } from '@/repositories/appointment.repository';
import { getTenantContext } from '@/lib/auth-context';
import { AppointmentStatus, AppointmentType } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

function authorizeRoles(userRole: string | null, allowedRoles: string[]) {
  if (!userRole || !allowedRoles.includes(userRole)) {
    throw new Error('Não autorizado: Acesso negado para esta função.');
  }
}

export async function scheduleAppointmentAction(data: {
  patientId: string;
  doctorId: string;
  healthUnitId: string;
  specialtyId: string;
  dateTime: Date;
  durationMinutes?: number;
  type?: AppointmentType;
  forceOverbook?: boolean;
  forceWaitlist?: boolean;
}) {
  try {
    const context = await getTenantContext();
    if (!context.userId || !context.municipalityId) {
      throw new Error('Não autorizado. Sessão expirada.');
    }

    authorizeRoles(context.role, ['Administrador', 'Recepcionista', 'Médico']);

    const appointment = await AppointmentService.scheduleAppointment(
      {
        ...data,
        municipalityId: context.municipalityId,
      },
      context.userId
    );

    revalidatePath('/agenda');
    return { success: true, appointment };
  } catch (error: any) {
    return { success: false, error: error.message || 'Erro ao agendar consulta.' };
  }
}

export async function cancelAppointmentAction(id: string, reason: string) {
  try {
    const context = await getTenantContext();
    if (!context.userId || !context.municipalityId) {
      throw new Error('Não autorizado. Sessão expirada.');
    }

    authorizeRoles(context.role, ['Administrador', 'Recepcionista', 'Médico']);

    const appointment = await AppointmentService.cancelAppointment(
      id,
      context.municipalityId,
      reason,
      context.userId
    );

    revalidatePath('/agenda');
    return { success: true, appointment };
  } catch (error: any) {
    return { success: false, error: error.message || 'Erro ao cancelar consulta.' };
  }
}

export async function confirmAppointmentAction(id: string) {
  try {
    const context = await getTenantContext();
    if (!context.userId || !context.municipalityId) {
      throw new Error('Não autorizado. Sessão expirada.');
    }

    authorizeRoles(context.role, ['Administrador', 'Recepcionista', 'Médico']);

    const appointment = await AppointmentService.confirmAppointment(
      id,
      context.municipalityId,
      context.userId
    );

    revalidatePath('/agenda');
    return { success: true, appointment };
  } catch (error: any) {
    return { success: false, error: error.message || 'Erro ao confirmar consulta.' };
  }
}

export async function rescheduleAppointmentAction(id: string, newDateTime: Date) {
  try {
    const context = await getTenantContext();
    if (!context.userId || !context.municipalityId) {
      throw new Error('Não autorizado. Sessão expirada.');
    }

    authorizeRoles(context.role, ['Administrador', 'Recepcionista', 'Médico']);

    const appointment = await AppointmentService.rescheduleAppointment(
      id,
      context.municipalityId,
      newDateTime,
      context.userId
    );

    revalidatePath('/agenda');
    return { success: true, appointment };
  } catch (error: any) {
    return { success: false, error: error.message || 'Erro ao reagendar consulta.' };
  }
}

export async function listAppointmentsAction(filters: {
  healthUnitId?: string;
  doctorId?: string;
  specialtyId?: string;
  date?: Date | string;
  status?: AppointmentStatus;
}) {
  try {
    const context = await getTenantContext();
    if (!context.municipalityId) {
      throw new Error('Não autorizado. Sessão expirada.');
    }

    const appointments = await AppointmentService.listAppointments({
      ...filters,
      municipalityId: context.municipalityId,
    });

    return { success: true, appointments };
  } catch (error: any) {
    return { success: false, error: error.message || 'Erro ao listar consultas.' };
  }
}

// Helpers for scheduling select-inputs
export async function getSchedulingMetaAction(specialtyId?: string) {
  try {
    const context = await getTenantContext();
    if (!context.municipalityId) {
      throw new Error('Não autorizado. Sessão expirada.');
    }

    const [healthUnits, doctors, specialties] = await Promise.all([
      AppointmentRepository.listHealthUnits(context.municipalityId),
      AppointmentRepository.listDoctors(context.municipalityId, specialtyId),
      AppointmentRepository.listSpecialties(context.municipalityId),
    ]);

    // Format for easier standard consumption
    return {
      success: true,
      healthUnits,
      doctors: doctors.map(d => ({
        id: d.id,
        name: d.user.name,
        crm: d.crm,
        healthUnitId: d.healthUnitId,
        specialtyIds: d.specialties.map(s => s.specialtyId),
      })),
      specialties,
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Erro ao buscar metadados de agendamento.' };
  }
}

export async function getDoctorAvailabilitySlotsAction(doctorId: string, date: Date | string) {
  try {
    const context = await getTenantContext();
    if (!context.municipalityId) {
      throw new Error('Não autorizado. Sessão expirada.');
    }

    const schedules = await AppointmentRepository.getDoctorSchedules(doctorId, context.municipalityId);
    
    let dateStr: string;
    if (typeof date === 'string') {
      dateStr = date;
    } else {
      const y = date.getUTCFullYear();
      const m = String(date.getUTCMonth() + 1).padStart(2, '0');
      const d = String(date.getUTCDate()).padStart(2, '0');
      dateStr = `${y}-${m}-${d}`;
    }

    const dateObj = new Date(`${dateStr}T00:00:00`);
    const dayOfWeek = dateObj.getDay();
    const dailySchedule = schedules.find(s => s.dayOfWeek === dayOfWeek);

    if (!dailySchedule) {
      return { success: true, slots: [] }; // No slots if doctor doesn't work that day
    }

    // List existing appointments for this doctor on this day
    const existingAppointments = await AppointmentRepository.list({
      municipalityId: context.municipalityId,
      doctorId,
      date: dateObj,
    });

    const bookedTimes = existingAppointments
      .filter(a => a.status !== AppointmentStatus.CANCELLED && a.status !== AppointmentStatus.WAITLIST)
      .map(a => {
        const time = new Date(a.dateTime).toTimeString().substring(0, 5); // "HH:MM"
        return time;
      });

    // Generate timeslots based on start, end, break and duration
    const slots: string[] = [];
    const duration = dailySchedule.slotDurationMinutes;
    const [startH, startM] = dailySchedule.startTime.split(':').map(Number);
    const [endH, endM] = dailySchedule.endTime.split(':').map(Number);

    let currentMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    let breakStart = 0;
    let breakEnd = 0;
    if (dailySchedule.breakStartTime && dailySchedule.breakEndTime) {
      const [bsh, bsm] = dailySchedule.breakStartTime.split(':').map(Number);
      breakStart = bsh * 60 + bsm;
      const [beh, bem] = dailySchedule.breakEndTime.split(':').map(Number);
      breakEnd = beh * 60 + bem;
    }

    while (currentMinutes + duration <= endMinutes) {
      // Check break
      const isDuringBreak = breakStart && currentMinutes >= breakStart && currentMinutes < breakEnd;
      if (!isDuringBreak) {
        const h = Math.floor(currentMinutes / 60).toString().padStart(2, '0');
        const m = (currentMinutes % 60).toString().padStart(2, '0');
        const timeString = `${h}:${m}`;
        slots.push(timeString);
      }
      currentMinutes += duration;
    }

    // Filter slots to show availability status
    const list = slots.map(time => {
      const isBooked = bookedTimes.includes(time);
      return {
        time,
        available: !isBooked,
      };
    });

    return { success: true, slots: list };
  } catch (error: any) {
    return { success: false, error: error.message || 'Erro ao carregar horários disponíveis.' };
  }
}

export async function listMunicipalitiesPublicAction() {
  try {
    const list = await prisma.municipality.findMany({
      select: { id: true, name: true, slug: true },
      orderBy: { name: 'asc' },
    });
    return { success: true, list };
  } catch (error: any) {
    return { success: false, error: error.message || 'Erro ao listar municípios.' };
  }
}

export async function verifyPatientPublicAction(data: {
  cpf: string;
  birthDate: string;
  municipalityId: string;
}) {
  try {
    const cleanCpf = data.cpf.replace(/\D/g, '');
    const dateObj = new Date(data.birthDate);
    
    const startOfDay = new Date(dateObj);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(dateObj);
    endOfDay.setHours(23, 59, 59, 999);

    const patient = await prisma.patient.findFirst({
      where: {
        OR: [
          { cpf: cleanCpf },
          { cpf: data.cpf }
        ],
        birthDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
        municipalityId: data.municipalityId,
      },
    });

    if (!patient) {
      return { success: false, error: 'Paciente não encontrado com estes dados neste município.' };
    }

    return {
      success: true,
      patient: {
        id: patient.id,
        name: patient.name,
        cpf: patient.cpf,
        cns: patient.cns || '',
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Erro ao verificar CPF.' };
  }
}

export async function getMetadataPublicAction(municipalityId: string, specialtyId?: string) {
  try {
    const [healthUnits, doctors, specialties] = await Promise.all([
      AppointmentRepository.listHealthUnits(municipalityId),
      AppointmentRepository.listDoctors(municipalityId, specialtyId),
      AppointmentRepository.listSpecialties(municipalityId),
    ]);

    return {
      success: true,
      healthUnits,
      doctors: doctors.map(d => ({
        id: d.id,
        name: d.user.name,
        crm: d.crm,
        healthUnitId: d.healthUnitId,
        specialtyIds: d.specialties.map(s => s.specialtyId),
      })),
      specialties,
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Erro ao carregar clínicas e médicos.' };
  }
}

export async function getDoctorAvailabilitySlotsPublicAction(data: {
  doctorId: string;
  date: string;
  municipalityId: string;
}) {
  try {
    const doctorId = data.doctorId;
    const dateObj = new Date(data.date);
    const municipalityId = data.municipalityId;

    const schedules = await AppointmentRepository.getDoctorSchedules(doctorId, municipalityId);
    const dayOfWeek = dateObj.getDay();
    const dailySchedule = schedules.find(s => s.dayOfWeek === dayOfWeek);

    if (!dailySchedule) {
      return { success: true, slots: [] };
    }

    const existingAppointments = await AppointmentRepository.list({
      municipalityId,
      doctorId,
      date: dateObj,
    });

    const bookedTimes = existingAppointments
      .filter(a => a.status !== AppointmentStatus.CANCELLED && a.status !== AppointmentStatus.WAITLIST)
      .map(a => {
        const time = new Date(a.dateTime).toTimeString().substring(0, 5);
        return time;
      });

    const slots: string[] = [];
    const duration = dailySchedule.slotDurationMinutes;
    const [startH, startM] = dailySchedule.startTime.split(':').map(Number);
    const [endH, endM] = dailySchedule.endTime.split(':').map(Number);

    let currentMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    let breakStart = 0;
    let breakEnd = 0;
    if (dailySchedule.breakStartTime && dailySchedule.breakEndTime) {
      const [bsh, bsm] = dailySchedule.breakStartTime.split(':').map(Number);
      breakStart = bsh * 60 + bsm;
      const [beh, bem] = dailySchedule.breakEndTime.split(':').map(Number);
      breakEnd = beh * 60 + bem;
    }

    while (currentMinutes + duration <= endMinutes) {
      const isDuringBreak = breakStart && currentMinutes >= breakStart && currentMinutes < breakEnd;
      if (!isDuringBreak) {
        const h = Math.floor(currentMinutes / 60).toString().padStart(2, '0');
        const m = (currentMinutes % 60).toString().padStart(2, '0');
        const timeString = `${h}:${m}`;
        slots.push(timeString);
      }
      currentMinutes += duration;
    }

    const list = slots.map(time => {
      const isBooked = bookedTimes.includes(time);
      return {
        time,
        available: !isBooked,
      };
    });

    return { success: true, slots: list };
  } catch (error: any) {
    return { success: false, error: error.message || 'Erro ao consultar slots livres.' };
  }
}

export async function createPublicAppointmentAction(data: {
  patientId: string;
  doctorId: string;
  healthUnitId: string;
  specialtyId: string;
  dateTime: Date;
  municipalityId: string;
}) {
  try {
    const patientExists = await prisma.patient.findFirst({
      where: { id: data.patientId, municipalityId: data.municipalityId }
    });
    if (!patientExists) {
      throw new Error('Paciente inválido ou não cadastrado neste município.');
    }

    const dateObj = new Date(data.dateTime);
    const conflict = await AppointmentRepository.findConflict(data.doctorId, dateObj, data.municipalityId);
    if (conflict) {
      throw new Error('Este horário já está reservado. Escolha outro horário.');
    }

    const appointment = await AppointmentRepository.create({
      patientId: data.patientId,
      doctorId: data.doctorId,
      healthUnitId: data.healthUnitId,
      specialtyId: data.specialtyId,
      dateTime: dateObj,
      durationMinutes: 20,
      type: AppointmentType.REGULAR,
      status: AppointmentStatus.PENDING,
      municipalityId: data.municipalityId,
    });

    await prisma.auditLog.create({
      data: {
        action: 'CREATE',
        tableName: 'Appointment',
        recordId: appointment.id,
        newValues: JSON.stringify({ ...appointment, notes: 'Agendamento via portal do cidadão' }),
        userId: null,
        ipAddress: '127.0.0.1',
        municipalityId: data.municipalityId,
      }
    });

    return { success: true, appointment };
  } catch (error: any) {
    return { success: false, error: error.message || 'Erro ao realizar agendamento público.' };
  }
}
