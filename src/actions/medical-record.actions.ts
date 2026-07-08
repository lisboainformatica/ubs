'use server';

import { MedicalRecordService, RecordConsultationData } from '@/services/medical-record.service';
import { getTenantContext } from '@/lib/auth-context';
import { revalidatePath } from 'next/cache';

function authorizeRoles(userRole: string | null, allowedRoles: string[]) {
  if (!userRole || !allowedRoles.includes(userRole)) {
    throw new Error('Não autorizado: Acesso negado para esta função.');
  }
}

export async function recordConsultationAction(data: Omit<RecordConsultationData, 'doctorId' | 'municipalityId'>) {
  try {
    const context = await getTenantContext();
    if (!context.userId || !context.municipalityId) {
      throw new Error('Não autorizado. Sessão expirada.');
    }

    authorizeRoles(context.role, ['Administrador', 'Médico']);

    // Check if the user is a doctor and get their doctor profile ID
    const { prisma } = await import('@/lib/prisma');
    const doctorProfile = await prisma.doctor.findUnique({
      where: { userId: context.userId },
    });

    if (!doctorProfile) {
      throw new Error('Usuário logado não possui um perfil médico associado.');
    }

    const result = await MedicalRecordService.recordConsultation(
      {
        ...data,
        doctorId: doctorProfile.id,
        municipalityId: context.municipalityId,
      },
      context.userId
    );

    revalidatePath('/agenda');
    revalidatePath('/atendimento');
    revalidatePath(`/pacientes/${data.patientId}`);
    return { success: true, record: result.record };
  } catch (error: any) {
    return { success: false, error: error.message || 'Erro ao registrar atendimento médico.' };
  }
}
