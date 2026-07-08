import { prisma } from '@/lib/prisma';

export class UserRepository {
  static async findByEmail(email: string, municipalityId: string) {
    return prisma.user.findFirst({
      where: {
        email,
        municipalityId,
      },
      include: {
        role: true,
        municipality: true,
      },
    });
  }

  static async findById(id: string, municipalityId: string) {
    return prisma.user.findFirst({
      where: { id, municipalityId },
      include: {
        role: true,
        doctor: true,
      },
    });
  }

  static async listAll(municipalityId: string) {
    return prisma.user.findMany({
      where: { municipalityId },
      include: {
        role: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  static async createUser(data: {
    name: string;
    email: string;
    passwordHash: string;
    roleId: string;
    municipalityId: string;
  }) {
    return prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash: data.passwordHash,
        roleId: data.roleId,
        municipalityId: data.municipalityId,
      },
    });
  }

  static async getRoles(municipalityId: string) {
    return prisma.role.findMany({
      where: { municipalityId },
    });
  }
}
