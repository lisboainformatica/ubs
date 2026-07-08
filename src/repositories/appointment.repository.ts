import { prisma } from '@/lib/prisma';
import { AppointmentStatus, AppointmentType } from '@prisma/client';

export interface CreateAppointmentData {
  patientId: string;
  doctorId: string;
  healthUnitId: string;
  specialtyId: string;
  dateTime: Date;
  durationMinutes?: number;
  type?: AppointmentType;
  municipalityId: string;
}

export class AppointmentRepository {
  static async findById(id: string, municipalityId: string) {
    return prisma.appointment.findFirst({
      where: { id, municipalityId },
      include: {
        patient: true,
        doctor: { include: { user: true } },
        healthUnit: true,
        specialty: true,
        medicalRecord: true,
      },
    });
  }

  static async findConflict(doctorId: string, dateTime: Date, municipalityId: string) {
    // Check if there is an active appointment (PENDING or CONFIRMED) at the exact same time
    return prisma.appointment.findFirst({
      where: {
        doctorId,
        dateTime,
        municipalityId,
        status: { in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED] },
      },
    });
  }

  static async getWaitlistPosition(doctorId: string, date: Date, municipalityId: string) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const count = await prisma.appointment.count({
      where: {
        doctorId,
        dateTime: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: AppointmentStatus.WAITLIST,
        municipalityId,
      },
    });

    return count + 1;
  }

  static async create(data: CreateAppointmentData & { waitlistPosition?: number; status?: AppointmentStatus }) {
    return prisma.appointment.create({
      data: {
        patientId: data.patientId,
        doctorId: data.doctorId,
        healthUnitId: data.healthUnitId,
        specialtyId: data.specialtyId,
        dateTime: data.dateTime,
        durationMinutes: data.durationMinutes || 20,
        type: data.type || AppointmentType.REGULAR,
        status: data.status || AppointmentStatus.PENDING,
        waitlistPosition: data.waitlistPosition || null,
        municipalityId: data.municipalityId,
      },
      include: {
        patient: true,
        doctor: { include: { user: true } },
        healthUnit: true,
        specialty: true,
      },
    });
  }

  static async list(filters: {
    municipalityId: string;
    healthUnitId?: string;
    doctorId?: string;
    specialtyId?: string;
    date?: Date | string;
    status?: AppointmentStatus;
  }) {
    const whereClause: any = { municipalityId: filters.municipalityId };

    if (filters.healthUnitId) whereClause.healthUnitId = filters.healthUnitId;
    if (filters.doctorId) whereClause.doctorId = filters.doctorId;
    if (filters.specialtyId) whereClause.specialtyId = filters.specialtyId;
    if (filters.status) whereClause.status = filters.status;

    if (filters.date) {
      let dateStr: string;
      if (typeof filters.date === 'string') {
        dateStr = filters.date;
      } else {
        const y = filters.date.getUTCFullYear();
        const m = String(filters.date.getUTCMonth() + 1).padStart(2, '0');
        const d = String(filters.date.getUTCDate()).padStart(2, '0');
        dateStr = `${y}-${m}-${d}`;
      }
      const start = new Date(`${dateStr}T00:00:00`);
      const end = new Date(`${dateStr}T23:59:59.999`);
      whereClause.dateTime = {
        gte: start,
        lte: end,
      };
    }

    return prisma.appointment.findMany({
      where: whereClause,
      include: {
        patient: true,
        doctor: {
          include: {
            user: true,
            specialties: { include: { specialty: true } },
          },
        },
        healthUnit: true,
        specialty: true,
        medicalRecord: {
          include: {
            prescription: {
              include: {
                items: {
                  include: {
                    medicine: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { dateTime: 'asc' },
    });
  }

  static async updateStatus(
    id: string,
    municipalityId: string,
    status: AppointmentStatus,
    cancelReason?: string
  ) {
    const appt = await prisma.appointment.findFirst({
      where: { id, municipalityId }
    });
    if (!appt) {
      throw new Error('Consulta não encontrada.');
    }
    return prisma.appointment.update({
      where: { id },
      data: {
        status,
        cancelReason: cancelReason || null,
        // If no longer in waitlist, clear position
        ...(status !== AppointmentStatus.WAITLIST ? { waitlistPosition: null } : {}),
      },
    });
  }

  static async listHealthUnits(municipalityId: string) {
    return prisma.healthUnit.findMany({
      where: { municipalityId },
      orderBy: { name: 'asc' },
    });
  }

  static async listDoctors(municipalityId: string, specialtyId?: string) {
    return prisma.doctor.findMany({
      where: {
        municipalityId,
        ...(specialtyId
          ? {
              specialties: {
                some: { specialtyId },
              },
            }
          : {}),
      },
      include: {
        user: true,
        specialties: { include: { specialty: true } },
      },
      orderBy: { user: { name: 'asc' } },
    });
  }

  static async listSpecialties(municipalityId: string) {
    return prisma.specialty.findMany({
      where: { municipalityId },
      orderBy: { name: 'asc' },
    });
  }

  static async getDoctorSchedules(doctorId: string, municipalityId: string) {
    return prisma.schedule.findMany({
      where: { doctorId, municipalityId },
      include: { healthUnit: true },
      orderBy: { dayOfWeek: 'asc' },
    });
  }

  static async createDoctorSchedule(data: {
    doctorId: string;
    healthUnitId: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    slotDurationMinutes: number;
    breakStartTime?: string;
    breakEndTime?: string;
    municipalityId: string;
  }) {
    return prisma.schedule.create({
      data,
    });
  }

  static async deleteDoctorSchedule(id: string, municipalityId: string) {
    const schedule = await prisma.schedule.findFirst({
      where: { id, municipalityId },
    });
    if (!schedule) {
      throw new Error('Horário não encontrado.');
    }
    return prisma.schedule.delete({
      where: { id },
    });
  }

  static async count(municipalityId: string, filters?: { status?: AppointmentStatus; date?: Date }) {
    const whereClause: any = { municipalityId };
    if (filters?.status) whereClause.status = filters.status;
    if (filters?.date) {
      const start = new Date(filters.date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(filters.date);
      end.setHours(23, 59, 59, 999);
      whereClause.dateTime = {
        gte: start,
        lte: end,
      };
    }
    return prisma.appointment.count({ where: whereClause });
  }
}
