import React from 'react';
import { redirect } from 'next/navigation';
import { getTenantContext } from '@/lib/auth-context';
import { prisma } from '@/lib/prisma';
import LayoutDashboardComponent from '@/components/layout-dashboard';
import AtendimentoClient from './atendimento-client';

export default async function AtendimentoPage() {
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

  // Verify authorization
  if (user?.role.name !== 'Administrador' && user?.role.name !== 'Médico') {
    redirect('/dashboard');
  }

  // Load doctor profile for the current user
  const doctor = await prisma.doctor.findUnique({
    where: { userId: context.userId },
  });

  // Find today's appointments for this doctor (PENDING, CONFIRMED)
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  let appointments: any[] = [];
  if (doctor) {
    appointments = await prisma.appointment.findMany({
      where: {
        municipalityId: context.municipalityId,
        doctorId: doctor.id,
        dateTime: { gte: startOfToday, lte: endOfToday },
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
      include: {
        patient: true,
        specialty: true,
      },
      orderBy: { dateTime: 'asc' },
    });
  } else if (user?.role.name === 'Administrador') {
    // Admins can see all today's pending/confirmed appointments for testing
    appointments = await prisma.appointment.findMany({
      where: {
        municipalityId: context.municipalityId,
        dateTime: { gte: startOfToday, lte: endOfToday },
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
      include: {
        patient: true,
        doctor: { include: { user: true } },
        specialty: true,
      },
      orderBy: { dateTime: 'asc' },
    });
  }

  // Preload medicines in stock for the prescription dropdown
  const medicines = await prisma.medicine.findMany({
    where: { municipalityId: context.municipalityId },
    orderBy: { name: 'asc' },
  });

  const appointmentsSafe = appointments.map(a => ({
    id: a.id,
    dateTime: a.dateTime.toISOString(),
    status: a.status,
    patient: {
      id: a.patient.id,
      name: a.patient.name,
      cpf: a.patient.cpf,
      cns: a.patient.cns || '',
      birthDate: a.patient.birthDate.toISOString(),
      allergies: a.patient.allergies || '',
      chronicDiseases: a.patient.chronicDiseases || '',
    },
    specialty: { name: a.specialty.name },
  }));

  const medicinesSafe = medicines.map(m => ({
    id: m.id,
    name: m.name,
    activeIngredient: m.activeIngredient,
    unit: m.unit,
  }));

  return (
    <LayoutDashboardComponent
      user={user ? { name: user.name, email: user.email, role: user.role.name } : null}
      municipality={municipality ? { name: municipality.name, primaryColor: municipality.primaryColor, secondaryColor: municipality.secondaryColor } : null}
    >
      <AtendimentoClient
        initialAppointments={appointmentsSafe}
        medicines={medicinesSafe}
        doctorName={user?.name || ''}
        doctorCrm={doctor?.crm || ''}
        municipalityName={municipality?.name || ''}
      />
    </LayoutDashboardComponent>
  );
}
