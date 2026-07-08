import React from 'react';
import { redirect } from 'next/navigation';
import { getTenantContext } from '@/lib/auth-context';
import { prisma } from '@/lib/prisma';
import { AuditRepository } from '@/repositories/audit.repository';
import LayoutDashboardComponent from '@/components/layout-dashboard';
import AuditoriaClient from './auditoria-client';

export default async function AuditoriaPage() {
  const context = await getTenantContext();
  if (!context.userId || !context.municipalityId) {
    redirect('/login');
  }

  // Load context user details
  const user = await prisma.user.findUnique({
    where: { id: context.userId },
    include: { role: true },
  });

  const municipality = await prisma.municipality.findUnique({
    where: { id: context.municipalityId },
  });

  // Verify authorization (Only Administrador can access LGPD logs)
  if (user?.role.name !== 'Administrador') {
    redirect('/dashboard');
  }

  // Fetch all audit logs
  const logs = await AuditRepository.getLogs(context.municipalityId);

  // Format preloads for client hydration
  const logsSafe = logs.map(l => ({
    id: l.id,
    userName: l.user?.name || 'Sistema',
    userEmail: l.user?.email || 'system@internal',
    userRole: l.user?.role?.name || 'Sistema',
    action: l.action,
    tableName: l.tableName,
    recordId: l.recordId,
    oldValues: l.oldValues || '',
    newValues: l.newValues || '',
    ipAddress: l.ipAddress || '',
    userAgent: l.userAgent || '',
    createdAt: l.createdAt.toISOString(),
  }));

  return (
    <LayoutDashboardComponent
      user={user ? { name: user.name, email: user.email, role: user.role.name } : null}
      municipality={municipality ? { name: municipality.name, primaryColor: municipality.primaryColor, secondaryColor: municipality.secondaryColor } : null}
    >
      <AuditoriaClient initialLogs={logsSafe} />
    </LayoutDashboardComponent>
  );
}
