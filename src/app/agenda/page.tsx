import React from 'react';
import { redirect } from 'next/navigation';
import { getTenantContext } from '@/lib/auth-context';
import { prisma } from '@/lib/prisma';
import { AppointmentRepository } from '@/repositories/appointment.repository';
import LayoutDashboardComponent from '@/components/layout-dashboard';
import AgendaClient from './agenda-client';

export default async function AgendaPage() {
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

  // Fetch scheduling metadata preloads
  const [healthUnits, doctors, specialties, patients] = await Promise.all([
    AppointmentRepository.listHealthUnits(context.municipalityId),
    AppointmentRepository.listDoctors(context.municipalityId),
    AppointmentRepository.listSpecialties(context.municipalityId),
    prisma.patient.findMany({ where: { municipalityId: context.municipalityId }, orderBy: { name: 'asc' } }),
  ]);

  // Format preloads for JS-friendly client hydration
  const healthUnitsSafe = healthUnits.map(h => ({ id: h.id, name: h.name }));
  const doctorsSafe = doctors.map(d => ({
    id: d.id,
    name: d.user.name,
    crm: d.crm,
    healthUnitId: d.healthUnitId,
    specialtyIds: d.specialties.map(s => s.specialtyId),
  }));
  const specialtiesSafe = specialties.map(s => ({ id: s.id, name: s.name }));
  const patientsSafe = patients.map(p => ({ id: p.id, name: p.name, cpf: p.cpf }));

  return (
    <LayoutDashboardComponent
      user={user ? { name: user.name, email: user.email, role: user.role.name } : null}
      municipality={municipality ? { name: municipality.name, primaryColor: municipality.primaryColor, secondaryColor: municipality.secondaryColor } : null}
    >
      <AgendaClient
        healthUnits={healthUnitsSafe}
        doctors={doctorsSafe}
        specialties={specialtiesSafe}
        patients={patientsSafe}
      />
    </LayoutDashboardComponent>
  );
}
