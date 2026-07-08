'use server';

import { AuthService } from '@/services/auth.service';
import { cookies } from 'next/headers';
import { getTenantContext } from '@/lib/auth-context';

export async function loginAction(formData: { email: string; passwordHash: string; municipalitySlug: string }) {
  try {
    const result = await AuthService.login({
      email: formData.email,
      passwordHash: formData.passwordHash,
      municipalitySlug: formData.municipalitySlug,
      ipAddress: '127.0.0.1', // Standard fallback
      userAgent: 'Server Action',
    });

    // Set auth cookie
    const cookieStore = await cookies();
    cookieStore.set('auth_token', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    });

    return { success: true, user: result.user, municipality: result.municipality };
  } catch (error: any) {
    return { success: false, error: error.message || 'Erro desconhecido ao efetuar login.' };
  }
}

export async function logoutAction() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete('auth_token');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Erro ao efetuar logout.' };
  }
}

export async function getCurrentUserAction() {
  try {
    const context = await getTenantContext();
    if (!context.userId) return null;
    return context;
  } catch {
    return null;
  }
}
