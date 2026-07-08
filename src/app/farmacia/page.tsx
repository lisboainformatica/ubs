import React from 'react';
import { redirect } from 'next/navigation';
import { getTenantContext } from '@/lib/auth-context';
import { prisma } from '@/lib/prisma';
import LayoutDashboardComponent from '@/components/layout-dashboard';
import FarmaciaClient from './farmacia-client';

export default async function FarmaciaPage() {
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
  if (user?.role.name !== 'Administrador' && user?.role.name !== 'Farmácia') {
    redirect('/dashboard');
  }

  // Fetch medicines in stock
  const medicines = await prisma.medicine.findMany({
    where: { municipalityId: context.municipalityId },
    orderBy: { name: 'asc' },
  });

  // Fetch recent movements
  const movements = await prisma.stockMovement.findMany({
    where: { municipalityId: context.municipalityId },
    include: {
      medicine: true,
      user: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 15,
  });

  // Fetch active prescriptions with pending items for verification/dispensation
  const prescriptions = await prisma.prescription.findMany({
    where: { municipalityId: context.municipalityId },
    include: {
      patient: true,
      doctor: { include: { user: true } },
      items: { include: { medicine: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  // Format preloads for hydration
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

  const movementsSafe = movements.map(mov => ({
    id: mov.id,
    medicineName: mov.medicine.name,
    type: mov.type,
    quantity: mov.quantity,
    reason: mov.reason || '',
    userName: mov.user.name,
    createdAt: mov.createdAt.toISOString(),
  }));

  const prescriptionsSafe = prescriptions.map(pr => ({
    id: pr.id,
    patientName: pr.patient.name,
    patientCpf: pr.patient.cpf,
    doctorName: pr.doctor.user.name,
    createdAt: pr.createdAt.toISOString(),
    items: pr.items.map(item => ({
      id: item.id,
      medicineId: item.medicineId,
      medicineName: item.medicine.name,
      quantity: item.quantity,
      dosage: item.dosage,
      frequency: item.frequency,
      durationDays: item.durationDays,
    })),
  }));

  return (
    <LayoutDashboardComponent
      user={user ? { name: user.name, email: user.email, role: user.role.name } : null}
      municipality={municipality ? { name: municipality.name, primaryColor: municipality.primaryColor, secondaryColor: municipality.secondaryColor } : null}
    >
      <FarmaciaClient
        initialMedicines={medicinesSafe}
        initialMovements={movementsSafe}
        initialPrescriptions={prescriptionsSafe}
      />
    </LayoutDashboardComponent>
  );
}
