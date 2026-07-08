import React from 'react';
import { redirect } from 'next/navigation';
import { getTenantContext } from '@/lib/auth-context';
import { prisma } from '@/lib/prisma';
import LayoutDashboardComponent from '@/components/layout-dashboard';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  CalendarDays,
  UserCheck,
  Activity,
  AlertTriangle,
  FileText,
  Clock,
  ArrowUpRight,
  TrendingUp,
  ShieldAlert,
} from 'lucide-react';

export default async function DashboardPage() {
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

  // Calculate Date Bounds for "Today"
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  // Queries (Multi-tenant scoped by municipalityId)
  const [
    todayTotal,
    todayCompleted,
    todayWaitlist,
    lowStockCount,
    totalPrescriptions,
    recentAppointments,
    recentAudits,
    topMedicines,
  ] = await Promise.all([
    // Today's total scheduled appointments
    prisma.appointment.count({
      where: {
        municipalityId: context.municipalityId,
        dateTime: { gte: startOfToday, lte: endOfToday },
        status: { in: ['PENDING', 'CONFIRMED', 'COMPLETED'] },
      },
    }),
    // Today's completed appointments
    prisma.appointment.count({
      where: {
        municipalityId: context.municipalityId,
        dateTime: { gte: startOfToday, lte: endOfToday },
        status: 'COMPLETED',
      },
    }),
    // Today's waitlist
    prisma.appointment.count({
      where: {
        municipalityId: context.municipalityId,
        dateTime: { gte: startOfToday, lte: endOfToday },
        status: 'WAITLIST',
      },
    }),
    // Critical stock levels
    prisma.medicine.count({
      where: {
        municipalityId: context.municipalityId,
        stockLevel: { lte: 100 },
      },
    }),
    // Total prescriptions issued
    prisma.prescription.count({
      where: { municipalityId: context.municipalityId },
    }),
    // 5 recent appointments
    prisma.appointment.findMany({
      where: { municipalityId: context.municipalityId },
      include: {
        patient: true,
        doctor: { include: { user: true } },
        specialty: true,
      },
      orderBy: { dateTime: 'desc' },
      take: 5,
    }),
    // 5 recent audit logs
    prisma.auditLog.findMany({
      where: { municipalityId: context.municipalityId },
      include: { user: true },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    // Top medicines based on stock movements
    prisma.medicine.findMany({
      where: { municipalityId: context.municipalityId },
      orderBy: { stockLevel: 'desc' },
      take: 4,
    }),
  ]);

  const awaitingConsultation = todayTotal - todayCompleted;

  return (
    <LayoutDashboardComponent
      user={user ? { name: user.name, email: user.email, role: user.role.name } : null}
      municipality={municipality ? { name: municipality.name, primaryColor: municipality.primaryColor, secondaryColor: municipality.secondaryColor } : null}
    >
      <div className="space-y-6">
        
        {/* Upper Greeting Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-linear-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 md:p-8 text-white shadow-xl shadow-blue-500/10">
          <div className="space-y-2">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Olá, {user?.name.split(' ')[0]}!
            </h1>
            <p className="text-blue-100 text-xs md:text-sm font-medium">
              Bem-vindo ao painel administrativo de <strong>{municipality?.name}</strong>. Aqui está o resumo de hoje.
            </p>
          </div>
          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-xl self-start md:self-auto text-xs font-semibold">
            <Activity className="animate-pulse text-emerald-300" size={16} />
            <span>Sistemas e-SUS & CNES Conectados</span>
          </div>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Consultas do Dia</CardTitle>
              <CalendarDays className="text-blue-500" size={20} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{todayTotal}</div>
              <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                <TrendingUp size={12} className="text-emerald-500" />
                <span>Total agendado para hoje</span>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Aguardando Atendimento</CardTitle>
              <Clock className="text-amber-500" size={20} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{awaitingConsultation < 0 ? 0 : awaitingConsultation}</div>
              <p className="text-[10px] text-muted-foreground mt-1">Pacientes na fila de espera/agendas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Consultas Concluídas</CardTitle>
              <UserCheck className="text-emerald-500" size={20} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{todayCompleted}</div>
              <p className="text-[10px] text-muted-foreground mt-1">
                Progresso: {todayTotal > 0 ? Math.round((todayCompleted / todayTotal) * 100) : 0}% concluído
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Alertas de Estoque</CardTitle>
              <AlertTriangle className={lowStockCount > 0 ? 'text-destructive animate-bounce' : 'text-slate-400'} size={20} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{lowStockCount}</div>
              <p className="text-[10px] text-muted-foreground mt-1">Medicamentos com estoque crítico (≤ 100)</p>
            </CardContent>
          </Card>
        </div>

        {/* Lower Dashboard Blocks */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main recent appointments block */}
          <Card className="lg:col-span-2">
            <CardHeader className="border-b border-border">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <CalendarDays size={18} className="text-primary" />
                Agendamentos Recentes
              </CardTitle>
              <CardDescription className="text-xs">Visualização rápida das últimas marcações no município.</CardDescription>
            </CardHeader>
            <CardContent className="pt-4 px-0">
              <div className="divide-y divide-border">
                {recentAppointments.length === 0 ? (
                  <div className="text-center py-10 text-xs text-muted-foreground">Nenhuma consulta agendada.</div>
                ) : (
                  recentAppointments.map(appt => (
                    <div key={appt.id} className="flex items-center justify-between px-6 py-3.5 hover:bg-muted/30 transition-colors">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-foreground">{appt.patient.name}</span>
                        <span className="text-[10px] text-muted-foreground mt-0.5">
                          Especialidade: <strong>{appt.specialty.name}</strong> • Médico: {appt.doctor.user.name.split(' ')[0]} {appt.doctor.user.name.split(' ')[1]}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col items-end">
                          <span className="text-xs font-semibold">
                            {new Date(appt.dateTime).toLocaleDateString('pt-BR')}
                          </span>
                          <span className="text-[10px] text-muted-foreground mt-0.5">
                            {new Date(appt.dateTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <Badge
                          variant={
                            appt.status === 'COMPLETED'
                              ? 'success'
                              : appt.status === 'CONFIRMED'
                              ? 'info'
                              : appt.status === 'CANCELLED'
                              ? 'destructive'
                              : appt.status === 'WAITLIST'
                              ? 'warning'
                              : 'default'
                          }
                        >
                          {appt.status === 'COMPLETED'
                            ? 'Concluída'
                            : appt.status === 'CONFIRMED'
                            ? 'Confirmada'
                            : appt.status === 'CANCELLED'
                            ? 'Cancelada'
                            : appt.status === 'WAITLIST'
                            ? 'Fila de Espera'
                            : 'Pendente'}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Pharmacy stock indicators */}
          <Card>
            <CardHeader className="border-b border-border">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <FileText size={18} className="text-primary" />
                Estoque de Medicamentos
              </CardTitle>
              <CardDescription className="text-xs">Medicamentos com maiores estoques e movimentações.</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-4">
                {topMedicines.length === 0 ? (
                  <div className="text-center py-6 text-xs text-muted-foreground">Nenhum medicamento cadastrado.</div>
                ) : (
                  topMedicines.map(med => (
                    <div key={med.id} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span>{med.name}</span>
                        <span className={med.stockLevel <= 100 ? 'text-destructive' : 'text-emerald-500'}>
                          {med.stockLevel} {med.unit.toLowerCase()}(s)
                        </span>
                      </div>
                      {/* CSS progress bar */}
                      <div className="w-full h-1.5 rounded-full bg-secondary overflow-hidden">
                        <div
                          className={`h-full rounded-full ${med.stockLevel <= 100 ? 'bg-destructive' : 'bg-blue-600'}`}
                          style={{ width: `${Math.min((med.stockLevel / 5000) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

        </div>

        {/* LGPD Audit Trail Grid */}
        <Card>
          <CardHeader className="border-b border-border">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <ShieldAlert size={18} className="text-primary" />
                  Rastreabilidade & Auditoria (LGPD)
                </CardTitle>
                <CardDescription className="text-xs">Registro de alterações recentes em conformidade legal.</CardDescription>
              </div>
              <a href="/auditoria" className="text-xs text-primary hover:underline flex items-center gap-1 font-bold">
                Ver todos os logs <ArrowUpRight size={14} />
              </a>
            </div>
          </CardHeader>
          <CardContent className="pt-4 px-0">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/20 text-muted-foreground font-bold">
                    <th className="px-6 py-3">Data</th>
                    <th className="px-6 py-3">Usuário</th>
                    <th className="px-6 py-3">Ação</th>
                    <th className="px-6 py-3">Tabela</th>
                    <th className="px-6 py-3">ID Registro</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {recentAudits.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-6 text-muted-foreground">Nenhum log gravado.</td>
                    </tr>
                  ) : (
                    recentAudits.map(log => (
                      <tr key={log.id} className="hover:bg-muted/10">
                        <td className="px-6 py-3.5 text-muted-foreground whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleDateString('pt-BR')} {new Date(log.createdAt).toLocaleTimeString('pt-BR')}
                        </td>
                        <td className="px-6 py-3.5 font-semibold">{log.user?.name || 'Sistema'}</td>
                        <td className="px-6 py-3.5">
                          <Badge variant={log.action === 'LOGIN' ? 'info' : log.action === 'CREATE' ? 'success' : 'warning'}>
                            {log.action}
                          </Badge>
                        </td>
                        <td className="px-6 py-3.5 text-muted-foreground">{log.tableName}</td>
                        <td className="px-6 py-3.5 font-mono text-[10px] text-slate-500 truncate max-w-[120px]">{log.recordId}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

      </div>
    </LayoutDashboardComponent>
  );
}
