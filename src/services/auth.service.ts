import { UserRepository } from '@/repositories/user.repository';
import { AuditRepository } from '@/repositories/audit.repository';
import { signJWT } from '@/lib/jwt';
import * as bcrypt from 'bcrypt';

const JWT_SECRET = process.env.JWT_SECRET || "a7c4f42f36d4f40bb8e9b6267cbdfb09b53f65e23652a92ff15ad97e59b7dfb36a8d6263e52";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "9e52d6a5991823ebdfcf6d3e8e19bb5a1b3fc14421bfa9822a105c93bd8c8a14b5398d5c";

export class AuthService {
  static async login(data: { email: string; passwordHash: string; municipalitySlug: string; ipAddress?: string; userAgent?: string }) {
    // 1. Resolve municipality by slug
    const { prisma } = await import('@/lib/prisma');
    const municipality = await prisma.municipality.findUnique({
      where: { slug: data.municipalitySlug },
    });

    if (!municipality) {
      throw new Error('Município não encontrado ou inválido.');
    }

    // 2. Resolve user in that municipality
    const user = await UserRepository.findByEmail(data.email, municipality.id);
    if (!user) {
      throw new Error('Credenciais inválidas. E-mail ou senha incorretos.');
    }

    if (user.status !== 'ACTIVE') {
      throw new Error('Esta conta de usuário foi desativada.');
    }

    // 3. Verify password
    const isPasswordValid = await bcrypt.compare(data.passwordHash, user.passwordHash);
    if (!isPasswordValid) {
      throw new Error('Credenciais inválidas. E-mail ou senha incorretos.');
    }

    // 4. Generate JWT payload
    const tokenPayload = {
      userId: user.id,
      name: user.name,
      email: user.email,
      role: user.role.name,
      municipalityId: municipality.id,
      municipalitySlug: municipality.slug,
    };

    // Access token (24 hours) and Refresh token (7 days)
    const accessToken = await signJWT(tokenPayload, JWT_SECRET, 60 * 60 * 24);
    const refreshToken = await signJWT({ userId: user.id }, JWT_REFRESH_SECRET, 60 * 60 * 24 * 7);

    // 5. Create Audit Log (LGPD compliance)
    await AuditRepository.createLog({
      userId: user.id,
      action: 'LOGIN',
      tableName: 'User',
      recordId: user.id,
      newValues: { email: user.email, timestamp: new Date() },
      municipalityId: municipality.id,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role.name,
      },
      municipality: {
        id: municipality.id,
        name: municipality.name,
        slug: municipality.slug,
        primaryColor: municipality.primaryColor,
        secondaryColor: municipality.secondaryColor,
        logoUrl: municipality.logoUrl,
      },
      accessToken,
      refreshToken,
    };
  }
}
