import { AppointmentRepository, CreateAppointmentData } from '@/repositories/appointment.repository';
import { AuditRepository } from '@/repositories/audit.repository';
import { AppointmentStatus, AppointmentType } from '@prisma/client';

export class AppointmentService {
  static async scheduleAppointment(
    data: CreateAppointmentData & { forceOverbook?: boolean; forceWaitlist?: boolean },
    actorUserId: string
  ) {
    const { doctorId, dateTime, municipalityId } = data;

    // 1. Verify doctor availability schedule for the day of week
    const dateObj = new Date(dateTime);
    const dayOfWeek = dateObj.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    const schedules = await AppointmentRepository.getDoctorSchedules(doctorId, municipalityId);
    const dailySchedule = schedules.find(s => s.dayOfWeek === dayOfWeek);

    if (!dailySchedule && !data.forceOverbook) {
      throw new Error('O médico não atende neste dia da semana.');
    }

    if (dailySchedule) {
      // Parse scheduled times
      const appointmentTime = dateObj.toTimeString().substring(0, 5); // "HH:MM"
      const [appHours, appMinutes] = appointmentTime.split(':').map(Number);
      const appTotalMinutes = appHours * 60 + appMinutes;

      const [startHours, startMinutes] = dailySchedule.startTime.split(':').map(Number);
      const startTotalMinutes = startHours * 60 + startMinutes;

      const [endHours, endMinutes] = dailySchedule.endTime.split(':').map(Number);
      const endTotalMinutes = endHours * 60 + endMinutes;

      // Validate time bounds
      if ((appTotalMinutes < startTotalMinutes || appTotalMinutes >= endTotalMinutes) && !data.forceOverbook) {
        throw new Error(`Horário fora do período de atendimento do médico (${dailySchedule.startTime} às ${dailySchedule.endTime}).`);
      }

      // Check break/interval
      if (dailySchedule.breakStartTime && dailySchedule.breakEndTime) {
        const [breakStartH, breakStartM] = dailySchedule.breakStartTime.split(':').map(Number);
        const breakStartTotal = breakStartH * 60 + breakStartM;
        const [breakEndH, breakEndM] = dailySchedule.breakEndTime.split(':').map(Number);
        const breakEndTotal = breakEndH * 60 + breakEndM;

        if (appTotalMinutes >= breakStartTotal && appTotalMinutes < breakEndTotal && !data.forceOverbook) {
          throw new Error('O horário selecionado coincide com o intervalo do médico.');
        }
      }
    }

    // 2. Check for scheduling conflicts
    let status: AppointmentStatus = AppointmentStatus.PENDING;
    let type: AppointmentType = data.type || AppointmentType.REGULAR;
    let waitlistPosition: number | undefined = undefined;

    if (data.forceWaitlist) {
      status = AppointmentStatus.WAITLIST;
      type = AppointmentType.REGULAR;
      waitlistPosition = await AppointmentRepository.getWaitlistPosition(doctorId, dateObj, municipalityId);
    } else if (data.forceOverbook) {
      status = AppointmentStatus.CONFIRMED;
      type = AppointmentType.WALK_IN;
    } else {
      // Check conflict
      const conflict = await AppointmentRepository.findConflict(doctorId, dateObj, municipalityId);
      if (conflict) {
        throw new Error('CONFLICT_OCCURRED: Este horário já está reservado para outro paciente.');
      }
    }

    const appointment = await AppointmentRepository.create({
      ...data,
      status,
      type,
      waitlistPosition,
    });

    await AuditRepository.createLog({
      userId: actorUserId,
      action: 'CREATE',
      tableName: 'Appointment',
      recordId: appointment.id,
      newValues: appointment,
      municipalityId,
    });

    return appointment;
  }

  static async cancelAppointment(id: string, municipalityId: string, reason: string, actorUserId: string) {
    const appointment = await AppointmentRepository.findById(id, municipalityId);
    if (!appointment) {
      throw new Error('Consulta não encontrada.');
    }

    const updated = await AppointmentRepository.updateStatus(id, municipalityId, AppointmentStatus.CANCELLED, reason);

    await AuditRepository.createLog({
      userId: actorUserId,
      action: 'CANCEL',
      tableName: 'Appointment',
      recordId: id,
      newValues: { status: AppointmentStatus.CANCELLED, cancelReason: reason },
      municipalityId,
    });

    return updated;
  }

  static async confirmAppointment(id: string, municipalityId: string, actorUserId: string) {
    const appointment = await AppointmentRepository.findById(id, municipalityId);
    if (!appointment) {
      throw new Error('Consulta não encontrada.');
    }

    const updated = await AppointmentRepository.updateStatus(id, municipalityId, AppointmentStatus.CONFIRMED);

    await AuditRepository.createLog({
      userId: actorUserId,
      action: 'CONFIRM',
      tableName: 'Appointment',
      recordId: id,
      newValues: { status: AppointmentStatus.CONFIRMED },
      municipalityId,
    });

    return updated;
  }

  static async rescheduleAppointment(
    id: string,
    municipalityId: string,
    newDateTime: Date,
    actorUserId: string
  ) {
    const appointment = await AppointmentRepository.findById(id, municipalityId);
    if (!appointment) {
      throw new Error('Consulta não encontrada.');
    }

    const dateObj = new Date(newDateTime);

    // Check conflict for new time
    const conflict = await AppointmentRepository.findConflict(appointment.doctorId, dateObj, municipalityId);
    if (conflict) {
      throw new Error('Horário indisponível na nova data selecionada.');
    }

    const { prisma } = await import('@/lib/prisma');
    const updated = await prisma.appointment.update({
      where: { id, municipalityId },
      data: {
        dateTime: dateObj,
        status: AppointmentStatus.PENDING, // reset to pending on reschedule
      },
    });

    await AuditRepository.createLog({
      userId: actorUserId,
      action: 'RESCHEDULE',
      tableName: 'Appointment',
      recordId: id,
      oldValues: { dateTime: appointment.dateTime },
      newValues: { dateTime: updated.dateTime, status: updated.status },
      municipalityId,
    });

    return updated;
  }

  static async listAppointments(filters: {
    municipalityId: string;
    healthUnitId?: string;
    doctorId?: string;
    specialtyId?: string;
    date?: Date | string;
    status?: AppointmentStatus;
  }) {
    return AppointmentRepository.list(filters);
  }
}
