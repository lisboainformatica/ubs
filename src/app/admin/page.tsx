import React from 'react';
import { redirect } from 'next/navigation';
import { getTenantContext } from '@/lib/auth-context';
import { prisma } from '@/lib/prisma';
import LayoutDashboardComponent from '@/components/layout-dashboard';
import AdminClient from './admin-client';

export default async function AdminPage() {
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

  // Verify authorization (only Administrador is allowed)
  if (user?.role.name !== 'Administrador') {
    redirect('/dashboard');
  }

  // Fetch administrative and reporting preloads in parallel
  const [healthUnits, specialties, doctors, receptionists, patients, medicalRecords, medicines] = await Promise.all([
    prisma.healthUnit.findMany({
      where: { municipalityId: context.municipalityId },
      orderBy: { name: 'asc' },
    }),
    prisma.specialty.findMany({
      where: { municipalityId: context.municipalityId },
      orderBy: { name: 'asc' },
    }),
    prisma.doctor.findMany({
      where: { municipalityId: context.municipalityId },
      include: {
        user: true,
        healthUnit: true,
        specialties: { include: { specialty: true } },
      },
      orderBy: { user: { name: 'asc' } },
    }),
    prisma.user.findMany({
      where: {
        municipalityId: context.municipalityId,
        role: { name: 'Recepcionista' },
      },
      orderBy: { name: 'asc' },
    }),
    prisma.patient.findMany({
      where: { municipalityId: context.municipalityId },
      orderBy: { name: 'asc' },
    }),
    prisma.medicalRecord.findMany({
      where: { municipalityId: context.municipalityId },
      include: {
        patient: true,
        doctor: { include: { user: true } },
        appointment: { include: { healthUnit: true, specialty: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.medicine.findMany({
      where: { municipalityId: context.municipalityId },
      orderBy: { name: 'asc' },
    }),
  ]);

  // Format database outputs to simple JSON-safe list for client hydration
  const healthUnitsSafe = healthUnits.map(h => ({
    id: h.id,
    name: h.name,
    cnes: h.cnes || '',
    address: h.address,
    cep: h.cep,
    city: h.city,
    state: h.state,
    phone: h.phone || '',
    operatingHours: h.operatingHours,
  }));

  const specialtiesSafe = specialties.map(s => ({
    id: s.id,
    name: s.name,
    description: s.description || '',
  }));

  const doctorsSafe = doctors.map(d => ({
    id: d.id,
    name: d.user.name,
    email: d.user.email,
    crm: d.crm,
    phone: d.phone || '',
    healthUnitName: d.healthUnit.name,
    specialties: d.specialties.map(ds => ds.specialty.name),
  }));

  const receptionistsSafe = receptionists.map(r => ({
    id: r.id,
    name: r.name,
    email: r.email,
    status: r.status,
  }));

  const patientsSafe = patients.map(p => ({
    id: p.id,
    name: p.name,
    cpf: p.cpf,
    cns: p.cns || '',
    birthDate: p.birthDate.toISOString(),
    gender: p.gender,
    phone: p.phone || '',
    allergies: p.allergies || '',
    chronicDiseases: p.chronicDiseases || '',
  }));

  const medicalRecordsSafe = medicalRecords.map(mr => ({
    id: mr.id,
    patientName: mr.patient.name,
    patientCpf: mr.patient.cpf,
    doctorName: mr.doctor.user.name,
    specialtyName: mr.appointment.specialty.name,
    healthUnitName: mr.appointment.healthUnit.name,
    createdAt: mr.createdAt.toISOString(),
    anamnese: mr.anamnese,
    diagnosisHipotesis: mr.diagnosisHipotesis || '',
    cidCode: mr.cidCode || '',
  }));

  const medicinesSafe = medicines.map(m => ({
    id: m.id,
    name: m.name,
    activeIngredient: m.activeIngredient,
    code: m.code || '',
    category: m.category || '',
    stockLevel: m.stockLevel,
    unit: m.unit,
    batch: m.batch || '',
    expirationDate: m.expirationDate ? m.expirationDate.toISOString().split('T')[0] : '',
    manufacturer: m.manufacturer || '',
  }));

  return (
    <LayoutDashboardComponent
      user={user ? { name: user.name, email: user.email, role: user.role.name } : null}
      municipality={municipality ? { name: municipality.name, primaryColor: municipality.primaryColor, secondaryColor: municipality.secondaryColor } : null}
    >
      <AdminClient
        initialHealthUnits={healthUnitsSafe}
        specialties={specialtiesSafe}
        initialDoctors={doctorsSafe}
        initialReceptionists={receptionistsSafe}
        patients={patientsSafe}
        medicalRecords={medicalRecordsSafe}
        medicines={medicinesSafe}
      />
    </LayoutDashboardComponent>
  );
}
