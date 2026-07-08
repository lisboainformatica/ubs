import React from 'react';
import { redirect } from 'next/navigation';
import { getTenantContext } from '@/lib/auth-context';
import { prisma } from '@/lib/prisma';
import { PatientService } from '@/services/patient.service';
import LayoutDashboardComponent from '@/components/layout-dashboard';
import PatientsClient from './patients-client';

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
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

  // Extract and await query parameter in Next.js 15
  const queryParams = await searchParams;
  const search = queryParams.q || '';

  // Fetch patients list
  const patients = await PatientService.listPatients(context.municipalityId, search);

  // Map to simple JSON-safe list for client components
  const patientsSafe = patients.map(p => ({
    id: p.id,
    name: p.name,
    cpf: p.cpf,
    cns: p.cns || '',
    birthDate: p.birthDate.toISOString(),
    gender: p.gender,
    address: p.address,
    cep: p.cep,
    city: p.city,
    state: p.state,
    phone: p.phone || '',
    email: p.email || '',
    guardianName: p.guardianName || '',
    guardianCpf: p.guardianCpf || '',
    notes: p.notes || '',
    allergies: p.allergies || '',
    chronicDiseases: p.chronicDiseases || '',
  }));

  return (
    <LayoutDashboardComponent
      user={user ? { name: user.name, email: user.email, role: user.role.name } : null}
      municipality={municipality ? { name: municipality.name, primaryColor: municipality.primaryColor, secondaryColor: municipality.secondaryColor } : null}
    >
      <PatientsClient initialPatients={patientsSafe} searchQuery={search} />
    </LayoutDashboardComponent>
  );
}
