import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:postgres@127.0.0.1:5432/agendamento_psf?schema=public";
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Starting seeding...');

  // 1. Create Permissions
  const permissionsList = [
    // Users management
    { name: 'users:create', description: 'Cadastrar usuários' },
    { name: 'users:read', description: 'Visualizar usuários' },
    { name: 'users:update', description: 'Editar usuários' },
    { name: 'users:delete', description: 'Remover usuários' },
    // Doctors
    { name: 'doctors:create', description: 'Cadastrar médicos' },
    { name: 'doctors:read', description: 'Visualizar médicos e agendas' },
    { name: 'doctors:update', description: 'Editar médicos' },
    // Patients
    { name: 'patients:create', description: 'Cadastrar pacientes' },
    { name: 'patients:read', description: 'Visualizar histórico de pacientes' },
    { name: 'patients:update', description: 'Editar dados de pacientes' },
    // Appointments
    { name: 'appointments:create', description: 'Agendar consultas' },
    { name: 'appointments:read', description: 'Consultar agenda' },
    { name: 'appointments:update', description: 'Reagendar ou alterar consultas' },
    { name: 'appointments:cancel', description: 'Cancelar consultas' },
    // Clinical Record
    { name: 'medical_records:create', description: 'Registrar atendimentos (Anamnese/CID)' },
    { name: 'medical_records:read', description: 'Visualizar prontuário eletrônico' },
    // Prescriptions
    { name: 'prescriptions:create', description: 'Cadastrar receitas' },
    { name: 'prescriptions:read', description: 'Visualizar receitas médicas' },
    // Exams
    { name: 'exams:create', description: 'Solicitar exames ou registrar resultados' },
    { name: 'exams:read', description: 'Visualizar exames' },
    // Stock / Pharmacy
    { name: 'stock:create', description: 'Cadastrar medicamentos' },
    { name: 'stock:read', description: 'Visualizar estoque de medicamentos' },
    { name: 'stock:write', description: 'Registrar entradas, perdas ou dispensação' },
    // General
    { name: 'reports:read', description: 'Visualizar dashboards, indicadores e relatórios' },
    { name: 'settings:write', description: 'Configurar sistema e gerenciar permissões' },
    { name: 'audit:read', description: 'Visualizar logs de auditoria (LGPD)' },
  ];

  console.log('Seeding permissions...');
  const dbPermissions: any[] = [];
  for (const perm of permissionsList) {
    const dbPerm = await prisma.permission.upsert({
      where: { name: perm.name },
      update: { description: perm.description },
      create: perm,
    });
    dbPermissions.push(dbPerm);
  }

  // 2. Create Default Municipality
  console.log('Seeding municipality...');
  const municipality = await prisma.municipality.upsert({
    where: { slug: 'exemplo' },
    update: {},
    create: {
      name: 'Município de Exemplo',
      slug: 'exemplo',
      primaryColor: '#0f172a',
      secondaryColor: '#3b82f6',
    },
  });

  // 3. Create Roles for the Municipality
  console.log('Seeding roles...');
  const roleAdmin = await prisma.role.upsert({
    where: { name_municipalityId: { name: 'Administrador', municipalityId: municipality.id } },
    update: {},
    create: { name: 'Administrador', description: 'Acesso total ao sistema', municipalityId: municipality.id },
  });

  const roleRecep = await prisma.role.upsert({
    where: { name_municipalityId: { name: 'Recepcionista', municipalityId: municipality.id } },
    update: {},
    create: { name: 'Recepcionista', description: 'Gerenciamento de agendas e cadastros', municipalityId: municipality.id },
  });

  const roleDoctor = await prisma.role.upsert({
    where: { name_municipalityId: { name: 'Médico', municipalityId: municipality.id } },
    update: {},
    create: { name: 'Médico', description: 'Atendimento clínico e prescrições', municipalityId: municipality.id },
  });

  const rolePharmacy = await prisma.role.upsert({
    where: { name_municipalityId: { name: 'Farmácia', municipalityId: municipality.id } },
    update: {},
    create: { name: 'Farmácia', description: 'Controle de estoque e entrega de medicamentos', municipalityId: municipality.id },
  });

  const roleManager = await prisma.role.upsert({
    where: { name_municipalityId: { name: 'Gestor Municipal', municipalityId: municipality.id } },
    update: {},
    create: { name: 'Gestor Municipal', description: 'Visualização de relatórios e indicadores', municipalityId: municipality.id },
  });

  // 4. Associate Permissions to Roles
  console.log('Associating permissions to roles...');
  
  // Clean up existing role permissions to avoid duplicates and keep clean
  await prisma.rolePermission.deleteMany({
    where: {
      roleId: { in: [roleAdmin.id, roleRecep.id, roleDoctor.id, rolePharmacy.id, roleManager.id] }
    }
  });

  // Helper to connect permissions
  const grantPermissions = async (roleId: string, allowedNames: string[]) => {
    const targets = dbPermissions.filter(p => allowedNames.includes(p.name));
    for (const p of targets) {
      await prisma.rolePermission.create({
        data: { roleId, permissionId: p.id }
      });
    }
  };

  // Admin gets everything
  await grantPermissions(roleAdmin.id, dbPermissions.map(p => p.name));

  // Receptionist gets appointment and patient permissions
  await grantPermissions(roleRecep.id, [
    'patients:create', 'patients:read', 'patients:update',
    'appointments:create', 'appointments:read', 'appointments:update', 'appointments:cancel'
  ]);

  // Doctor gets clinical records, appointments, exams, prescriptions
  await grantPermissions(roleDoctor.id, [
    'appointments:read',
    'patients:read',
    'medical_records:create', 'medical_records:read',
    'prescriptions:create', 'prescriptions:read',
    'exams:create', 'exams:read'
  ]);

  // Pharmacy gets medicines, stock, and prescription viewing
  await grantPermissions(rolePharmacy.id, [
    'prescriptions:read',
    'stock:read', 'stock:write'
  ]);

  // Manager gets dashboards/reports
  await grantPermissions(roleManager.id, [
    'reports:read'
  ]);

  // 5. Create Default Health Unit (Posto de Saúde)
  console.log('Seeding health units...');
  const healthUnit = await prisma.healthUnit.create({
    data: {
      name: 'UBS Central - Dr. Arthur de Souza',
      cnes: '1234567',
      address: 'Rua das Flores, 100, Centro',
      cep: '12345-000',
      city: 'Exemplo do Sul',
      state: 'SP',
      phone: '(11) 5555-0100',
      operatingHours: '07:00 - 18:00',
      municipalityId: municipality.id,
    }
  });

  // 6. Create Default Specialties
  console.log('Seeding specialties...');
  const specialtiesNames = ['Clínico Geral', 'Pediatria', 'Cardiologia', 'Ginecologia', 'Ortopedia', 'Dermatologia'];
  const dbSpecialties: any[] = [];
  for (const name of specialtiesNames) {
    const spec = await prisma.specialty.upsert({
      where: { name_municipalityId: { name, municipalityId: municipality.id } },
      update: {},
      create: { name, description: `Especialidade de ${name}`, municipalityId: municipality.id }
    });
    dbSpecialties.push(spec);
  }

  // 7. Create Users (Admin, Doctor, Receptionist, Pharmacist, Manager)
  console.log('Seeding users...');
  const saltRounds = 10;
  
  const hashPassword = async (pwd: string) => {
    return bcrypt.hash(pwd, saltRounds);
  };

  const adminUser = await prisma.user.upsert({
    where: { email_municipalityId: { email: 'admin@exemplo.gov.br', municipalityId: municipality.id } },
    update: {},
    create: {
      name: 'Administrador Geral',
      email: 'admin@exemplo.gov.br',
      passwordHash: await hashPassword('admin123'),
      roleId: roleAdmin.id,
      municipalityId: municipality.id,
    }
  });

  const recepUser = await prisma.user.upsert({
    where: { email_municipalityId: { email: 'recepcao@exemplo.gov.br', municipalityId: municipality.id } },
    update: {},
    create: {
      name: 'Maria Silva (Recepcionista)',
      email: 'recepcao@exemplo.gov.br',
      passwordHash: await hashPassword('recepcao123'),
      roleId: roleRecep.id,
      municipalityId: municipality.id,
    }
  });

  const docUser = await prisma.user.upsert({
    where: { email_municipalityId: { email: 'medico@exemplo.gov.br', municipalityId: municipality.id } },
    update: {},
    create: {
      name: 'Dr. João Medeiros (Médico)',
      email: 'medico@exemplo.gov.br',
      passwordHash: await hashPassword('medico123'),
      roleId: roleDoctor.id,
      municipalityId: municipality.id,
    }
  });

  // Create Doctor Profile
  const doctorProfile = await prisma.doctor.upsert({
    where: { userId: docUser.id },
    update: {},
    create: {
      userId: docUser.id,
      crm: 'CRM-SP 999999',
      phone: '(11) 99999-1111',
      email: 'medico@exemplo.gov.br',
      healthUnitId: healthUnit.id,
      municipalityId: municipality.id,
    }
  });

  // Connect Doctor to "Clínico Geral" and "Cardiologia"
  const clinicoGeralSpec = dbSpecialties.find(s => s.name === 'Clínico Geral')!;
  const cardiologiaSpec = dbSpecialties.find(s => s.name === 'Cardiologia')!;
  
  await prisma.doctorSpecialty.upsert({
    where: { doctorId_specialtyId: { doctorId: doctorProfile.id, specialtyId: clinicoGeralSpec.id } },
    update: {},
    create: { doctorId: doctorProfile.id, specialtyId: clinicoGeralSpec.id }
  });

  await prisma.doctorSpecialty.upsert({
    where: { doctorId_specialtyId: { doctorId: doctorProfile.id, specialtyId: cardiologiaSpec.id } },
    update: {},
    create: { doctorId: doctorProfile.id, specialtyId: cardiologiaSpec.id }
  });

  const pharmUser = await prisma.user.upsert({
    where: { email_municipalityId: { email: 'farmacia@exemplo.gov.br', municipalityId: municipality.id } },
    update: {},
    create: {
      name: 'Carla Dias (Farmacêutica)',
      email: 'farmacia@exemplo.gov.br',
      passwordHash: await hashPassword('farmacia123'),
      roleId: rolePharmacy.id,
      municipalityId: municipality.id,
    }
  });

  const managerUser = await prisma.user.upsert({
    where: { email_municipalityId: { email: 'gestor@exemplo.gov.br', municipalityId: municipality.id } },
    update: {},
    create: {
      name: 'Roberto Costa (Secretário de Saúde)',
      email: 'gestor@exemplo.gov.br',
      passwordHash: await hashPassword('gestor123'),
      roleId: roleManager.id,
      municipalityId: municipality.id,
    }
  });

  // 8. Create Doctor Schedule (Monday, Wednesday, Friday, 08:00 - 12:00)
  console.log('Seeding doctor schedules...');
  const daysOfWeek = [1, 3, 5]; // Mon, Wed, Fri
  for (const day of daysOfWeek) {
    await prisma.schedule.create({
      data: {
        doctorId: doctorProfile.id,
        healthUnitId: healthUnit.id,
        dayOfWeek: day,
        startTime: '08:00',
        endTime: '12:00',
        slotDurationMinutes: 20,
        breakStartTime: '10:00',
        breakEndTime: '10:20',
        municipalityId: municipality.id,
      }
    });
  }

  // 9. Create Default Medicines and Movements
  console.log('Seeding medicines...');
  const medicinesList = [
    { name: 'Amoxicilina 500mg', activeIngredient: 'Amoxicilina', category: 'Antibiótico', unit: 'COMPRIMIDO', stockLevel: 1500, manufacturer: 'Medley' },
    { name: 'Paracetamol 500mg', activeIngredient: 'Paracetamol', category: 'Analgésico', unit: 'COMPRIMIDO', stockLevel: 5000, manufacturer: 'EMS' },
    { name: 'Losartana Potássica 50mg', activeIngredient: 'Losartana', category: 'Anti-hipertensivo', unit: 'COMPRIMIDO', stockLevel: 3000, manufacturer: 'Eurofarma' },
    { name: 'Dipirona Sódica 500mg/mL', activeIngredient: 'Dipirona Sódica', category: 'Analgésico / Antitérmico', unit: 'FRASCO', stockLevel: 250, manufacturer: 'Neo Química' },
    { name: 'Ibuprofeno 600mg', activeIngredient: 'Ibuprofeno', category: 'Anti-inflamatório', unit: 'COMPRIMIDO', stockLevel: 1200, manufacturer: 'Prati' },
  ];

  for (const med of medicinesList) {
    const dbMed = await prisma.medicine.upsert({
      where: {
        name_activeIngredient_municipalityId: {
          name: med.name,
          activeIngredient: med.activeIngredient,
          municipalityId: municipality.id
        }
      },
      update: { stockLevel: med.stockLevel },
      create: {
        ...med,
        batch: 'LOTE-2026A',
        expirationDate: new Date('2028-12-31'),
        municipalityId: municipality.id
      }
    });

    // Record initial stock entry
    await prisma.stockMovement.create({
      data: {
        medicineId: dbMed.id,
        type: 'ENTRY',
        quantity: med.stockLevel,
        reason: 'Carga inicial de estoque',
        userId: adminUser.id,
        municipalityId: municipality.id
      }
    });
  }

  // 10. Create Default Patients
  console.log('Seeding patients...');
  const patientsList = [
    {
      name: 'José de Souza Martins',
      cpf: '111.111.111-11',
      cns: '123456789012345',
      birthDate: new Date('1965-08-15'),
      gender: 'M',
      address: 'Avenida Principal, 450, Centro',
      cep: '12345-000',
      city: 'Exemplo do Sul',
      state: 'SP',
      phone: '(11) 98888-2222',
      email: 'jose.martins@gmail.com',
      notes: 'Paciente hipertenso e diabético.',
      allergies: 'Dipirona, Penicilina',
      chronicDiseases: 'Hipertensão Arterial, Diabetes Tipo 2',
    },
    {
      name: 'Ana Julia Rodrigues',
      cpf: '222.222.222-22',
      cns: '987654321098765',
      birthDate: new Date('2018-04-10'),
      gender: 'F',
      address: 'Rua das Palmeiras, 12, Bairro Alto',
      cep: '12345-123',
      city: 'Exemplo do Sul',
      state: 'SP',
      phone: '(11) 97777-3333',
      email: 'mae.anajulia@gmail.com',
      guardianName: 'Maria Rodrigues',
      guardianCpf: '333.333.333-33',
      notes: 'Acompanhamento pediátrico de rotina.',
      allergies: 'Sem alergias conhecidas',
      chronicDiseases: 'Nenhuma',
    }
  ];

  for (const pat of patientsList) {
    await prisma.patient.upsert({
      where: { cpf_municipalityId: { cpf: pat.cpf, municipalityId: municipality.id } },
      update: {},
      create: {
        ...pat,
        municipalityId: municipality.id,
      }
    });
  }

  // 11. Add initial settings
  console.log('Seeding settings...');
  const settingsList = [
    { key: 'system_name', value: 'PSF Digital' },
    { key: 'support_email', value: 'suporte@exemplo.gov.br' },
    { key: 'allow_walk_ins', value: 'true' },
    { key: 'sms_notifications_enabled', value: 'false' },
    { key: 'whatsapp_notifications_enabled', value: 'false' },
  ];

  for (const set of settingsList) {
    await prisma.setting.upsert({
      where: { key_municipalityId: { key: set.key, municipalityId: municipality.id } },
      update: { value: set.value },
      create: {
        ...set,
        municipalityId: municipality.id,
      }
    });
  }

  console.log('Seeding finished successfully!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
