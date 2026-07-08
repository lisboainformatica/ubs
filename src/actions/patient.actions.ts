'use server';

import { PatientService } from '@/services/patient.service';
import { MedicalRecordService } from '@/services/medical-record.service';
import { getTenantContext } from '@/lib/auth-context';
import { revalidatePath } from 'next/cache';

function authorizeRoles(userRole: string | null, allowedRoles: string[]) {
  if (!userRole || !allowedRoles.includes(userRole)) {
    throw new Error('Não autorizado: Acesso negado para esta função.');
  }
}

export async function registerPatientAction(data: {
  name: string;
  cpf: string;
  cns?: string;
  birthDate: Date;
  gender: string;
  address: string;
  cep: string;
  city: string;
  state: string;
  phone?: string;
  email?: string;
  guardianName?: string;
  guardianCpf?: string;
  notes?: string;
  allergies?: string;
  chronicDiseases?: string;
}) {
  try {
    const context = await getTenantContext();
    if (!context.userId || !context.municipalityId) {
      throw new Error('Não autorizado. Sessão expirada.');
    }

    authorizeRoles(context.role, ['Administrador', 'Recepcionista', 'Médico']);

    const patient = await PatientService.registerPatient(
      {
        ...data,
        municipalityId: context.municipalityId,
      },
      context.userId
    );

    revalidatePath('/pacientes');
    return { success: true, patient };
  } catch (error: any) {
    return { success: false, error: error.message || 'Erro ao registrar paciente.' };
  }
}

export async function updatePatientAction(
  id: string,
  data: {
    name?: string;
    cpf?: string;
    cns?: string;
    birthDate?: Date;
    gender?: string;
    address?: string;
    cep?: string;
    city?: string;
    state?: string;
    phone?: string;
    email?: string;
    guardianName?: string;
    guardianCpf?: string;
    notes?: string;
    allergies?: string;
    chronicDiseases?: string;
  }
) {
  try {
    const context = await getTenantContext();
    if (!context.userId || !context.municipalityId) {
      throw new Error('Não autorizado. Sessão expirada.');
    }

    authorizeRoles(context.role, ['Administrador', 'Recepcionista', 'Médico']);

    const patient = await PatientService.updatePatient(
      id,
      context.municipalityId,
      data,
      context.userId
    );

    revalidatePath(`/pacientes/${id}`);
    revalidatePath('/pacientes');
    return { success: true, patient };
  } catch (error: any) {
    return { success: false, error: error.message || 'Erro ao atualizar paciente.' };
  }
}

export async function getPatientProfileAction(id: string) {
  try {
    const context = await getTenantContext();
    if (!context.municipalityId) {
      throw new Error('Não autorizado. Sessão expirada.');
    }

    authorizeRoles(context.role, ['Administrador', 'Recepcionista', 'Médico']);

    const patient = await PatientService.getPatientProfile(id, context.municipalityId);
    return { success: true, patient };
  } catch (error: any) {
    return { success: false, error: error.message || 'Erro ao carregar perfil do paciente.' };
  }
}

export async function listPatientsAction(search?: string) {
  try {
    const context = await getTenantContext();
    if (!context.municipalityId) {
      throw new Error('Não autorizado. Sessão expirada.');
    }

    const patients = await PatientService.listPatients(context.municipalityId, search);
    return { success: true, patients };
  } catch (error: any) {
    return { success: false, error: error.message || 'Erro ao carregar pacientes.' };
  }
}

export async function getPatientTimelineAction(patientId: string) {
  try {
    const context = await getTenantContext();
    if (!context.municipalityId) {
      throw new Error('Não autorizado. Sessão expirada.');
    }

    authorizeRoles(context.role, ['Administrador', 'Recepcionista', 'Médico']);

    const timeline = await MedicalRecordService.getPatientTimeline(patientId, context.municipalityId);
    return { success: true, timeline };
  } catch (error: any) {
    return { success: false, error: error.message || 'Erro ao carregar prontuário.' };
  }
}
