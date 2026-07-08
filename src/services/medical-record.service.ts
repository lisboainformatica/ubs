import { prisma } from '@/lib/prisma';
import { AuditRepository } from '@/repositories/audit.repository';
import { AppointmentStatus } from '@prisma/client';

export interface RecordConsultationData {
  appointmentId: string;
  patientId: string;
  doctorId: string;
  anamnese: string;
  diagnosisHipotesis?: string;
  cidCode?: string;
  bloodPressure?: string;
  weightKg?: number;
  heightCm?: number;
  temperatureC?: number;
  saturationPercent?: number;
  heartRateBpm?: number;
  observations?: string;
  municipalityId: string;
  prescriptionItems?: {
    medicineId: string;
    quantity: number;
    dosage: string;
    frequency: string;
    durationDays: number;
    instructions?: string;
  }[];
  examTypesRequested?: string[];
}

export class MedicalRecordService {
  static async recordConsultation(data: RecordConsultationData, actorUserId: string) {
    return prisma.$transaction(async (tx) => {
      // 1. Check if appointment exists
      const appointment = await tx.appointment.findUnique({
        where: { id: data.appointmentId, municipalityId: data.municipalityId },
      });

      if (!appointment) {
        throw new Error('Consulta não encontrada.');
      }

      // 2. Create the Medical Record (Prontuário)
      const record = await tx.medicalRecord.create({
        data: {
          appointmentId: data.appointmentId,
          patientId: data.patientId,
          doctorId: data.doctorId,
          anamnese: data.anamnese,
          diagnosisHipotesis: data.diagnosisHipotesis || null,
          cidCode: data.cidCode || null,
          bloodPressure: data.bloodPressure || null,
          weightKg: data.weightKg || null,
          heightCm: data.heightCm || null,
          temperatureC: data.temperatureC || null,
          saturationPercent: data.saturationPercent || null,
          heartRateBpm: data.heartRateBpm || null,
          observations: data.observations || null,
          municipalityId: data.municipalityId,
        },
      });

      // 3. Complete the Appointment status
      await tx.appointment.update({
        where: { id: data.appointmentId },
        data: { status: AppointmentStatus.COMPLETED },
      });

      // 4. Create Prescription if items are provided
      let prescription = null;
      if (data.prescriptionItems && data.prescriptionItems.length > 0) {
        const digitalSignature = `SIG-${data.doctorId}-${Date.now()}`;
        prescription = await tx.prescription.create({
          data: {
            medicalRecordId: record.id,
            patientId: data.patientId,
            doctorId: data.doctorId,
            digitalSignature,
            municipalityId: data.municipalityId,
            items: {
              create: data.prescriptionItems.map(item => ({
                medicineId: item.medicineId,
                quantity: item.quantity,
                dosage: item.dosage,
                frequency: item.frequency,
                durationDays: item.durationDays,
                instructions: item.instructions || null,
              })),
            },
          },
          include: {
            items: { include: { medicine: true } },
          },
        });
      }

      // 5. Create Exam Requests if requested
      const examRequests = [];
      if (data.examTypesRequested && data.examTypesRequested.length > 0) {
        for (const type of data.examTypesRequested) {
          const request = await tx.examRequest.create({
            data: {
              medicalRecordId: record.id,
              patientId: data.patientId,
              doctorId: data.doctorId,
              examType: type,
              municipalityId: data.municipalityId,
            },
          });
          examRequests.push(request);
        }
      }

      // 6. Register Audit Logs
      await AuditRepository.createLog({
        userId: actorUserId,
        action: 'CREATE_CONSULTATION',
        tableName: 'MedicalRecord',
        recordId: record.id,
        newValues: record,
        municipalityId: data.municipalityId,
      });

      if (prescription) {
        await AuditRepository.createLog({
          userId: actorUserId,
          action: 'CREATE_PRESCRIPTION',
          tableName: 'Prescription',
          recordId: prescription.id,
          newValues: prescription,
          municipalityId: data.municipalityId,
        });
      }

      return { record, prescription, examRequests };
    });
  }

  static async getPatientTimeline(patientId: string, municipalityId: string) {
    const medicalRecords = await prisma.medicalRecord.findMany({
      where: { patientId, municipalityId },
      include: {
        appointment: { include: { healthUnit: true, specialty: true } },
        doctor: { include: { user: true } },
        prescription: {
          include: {
            items: { include: { medicine: true } },
          },
        },
        examRequests: {
          include: {
            exams: { include: { file: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return medicalRecords;
  }
}
