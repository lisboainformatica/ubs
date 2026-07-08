import { prisma } from '@/lib/prisma';

export interface CreatePatientData {
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
  municipalityId: string;
}

export class PatientRepository {
  static async findById(id: string, municipalityId: string) {
    return prisma.patient.findFirst({
      where: { id, municipalityId },
      include: {
        appointments: {
          include: {
            doctor: { include: { user: true } },
            medicalRecord: {
              include: {
                prescription: { include: { items: { include: { medicine: true } } } },
                examRequests: { include: { exams: { include: { file: true } } } },
              },
            },
          },
          orderBy: { dateTime: 'desc' },
        },
      },
    });
  }

  static async findByCpf(cpf: string, municipalityId: string) {
    return prisma.patient.findFirst({
      where: { cpf, municipalityId },
    });
  }

  static async listAll(municipalityId: string, search?: string) {
    return prisma.patient.findMany({
      where: {
        municipalityId,
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { cpf: { contains: search } },
                { cns: { contains: search } },
              ],
            }
          : {}),
      },
      orderBy: { name: 'asc' },
    });
  }

  static async create(data: CreatePatientData) {
    return prisma.patient.create({
      data,
    });
  }

  static async update(id: string, municipalityId: string, data: Partial<CreatePatientData>) {
    const patient = await prisma.patient.findFirst({
      where: { id, municipalityId },
    });
    if (!patient) {
      throw new Error('Paciente não encontrado.');
    }
    return prisma.patient.update({
      where: { id },
      data,
    });
  }

  static async count(municipalityId: string) {
    return prisma.patient.count({
      where: { municipalityId },
    });
  }
}
