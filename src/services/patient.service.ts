import { PatientRepository, CreatePatientData } from '@/repositories/patient.repository';
import { AuditRepository } from '@/repositories/audit.repository';

export class PatientService {
  static async registerPatient(data: CreatePatientData, actorUserId: string) {
    const existing = await PatientRepository.findByCpf(data.cpf, data.municipalityId);
    if (existing) {
      throw new Error('Já existe um paciente cadastrado com este CPF neste município.');
    }

    const patient = await PatientRepository.create(data);

    await AuditRepository.createLog({
      userId: actorUserId,
      action: 'CREATE',
      tableName: 'Patient',
      recordId: patient.id,
      newValues: patient,
      municipalityId: data.municipalityId,
    });

    return patient;
  }

  static async updatePatient(
    id: string,
    municipalityId: string,
    data: Partial<CreatePatientData>,
    actorUserId: string
  ) {
    const oldPatient = await PatientRepository.findById(id, municipalityId);
    if (!oldPatient) {
      throw new Error('Paciente não encontrado.');
    }

    const updated = await PatientRepository.update(id, municipalityId, data);

    const oldValues: any = {};
    const newValues: any = {};
    for (const key of Object.keys(data)) {
      const field = key as keyof typeof data;
      const oldVal = (oldPatient as any)[field];
      const newVal = (updated as any)[field];
      
      // Compare dates, strings or numbers
      if (oldVal instanceof Date && newVal instanceof Date) {
        if (oldVal.getTime() !== newVal.getTime()) {
          oldValues[field] = oldVal;
          newValues[field] = newVal;
        }
      } else if (oldVal !== newVal) {
        oldValues[field] = oldVal;
        newValues[field] = newVal;
      }
    }

    if (Object.keys(newValues).length > 0) {
      await AuditRepository.createLog({
        userId: actorUserId,
        action: 'UPDATE',
        tableName: 'Patient',
        recordId: id,
        oldValues,
        newValues,
        municipalityId,
      });
    }

    return updated;
  }

  static async getPatientProfile(id: string, municipalityId: string) {
    return PatientRepository.findById(id, municipalityId);
  }

  static async listPatients(municipalityId: string, search?: string) {
    return PatientRepository.listAll(municipalityId, search);
  }
}
