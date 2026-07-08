'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Dialog } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  scheduleAppointmentAction,
  cancelAppointmentAction,
  confirmAppointmentAction,
  rescheduleAppointmentAction,
  listAppointmentsAction,
  getDoctorAvailabilitySlotsAction,
} from '@/actions/appointment.actions';
import { Calendar, Clock, Plus, Filter, UserCheck, XCircle, RefreshCw, AlertCircle, Printer, Download, Pill } from 'lucide-react';
import { jsPDF } from 'jspdf';

interface MetaItem { id: string; name: string }
interface DoctorItem { id: string; name: string; crm: string; healthUnitId: string; specialtyIds: string[] }
interface PatientItem { id: string; name: string; cpf: string }

const getLocalDateString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDateString = (dateStr: string) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const [year, month, day] = parts;
  return `${day}/${month}/${year}`;
};

export default function AgendaClient({
  healthUnits,
  doctors,
  specialties,
  patients,
}: {
  healthUnits: MetaItem[];
  doctors: DoctorItem[];
  specialties: MetaItem[];
  patients: PatientItem[];
}) {
  const router = useRouter();

  // Search/Filter states
  const [filterUnit, setFilterUnit] = useState('');
  const [filterSpecialty, setFilterSpecialty] = useState('');
  const [filterDoctor, setFilterDoctor] = useState('');
  const [filterDate, setFilterDate] = useState('');

  // Appointments database fetch
  const [appointmentsList, setAppointmentsList] = useState<any[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  // Modals state
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);

  // Focus Contexts
  const [selectedAppt, setSelectedAppt] = useState<any | null>(null);

  // Scheduling Form State
  const [formPatient, setFormPatient] = useState('');
  const [formUnit, setFormUnit] = useState('');
  const [formSpecialty, setFormSpecialty] = useState('');
  const [formDoctor, setFormDoctor] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formTime, setFormTime] = useState('');
  const [isWaitlistChecked, setIsWaitlistChecked] = useState(false);
  const [isEncaixeChecked, setIsEncaixeChecked] = useState(false);

  // Timeslot slot-picker loading
  const [availableSlots, setAvailableSlots] = useState<{ time: string; available: boolean }[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Actions states
  const [cancelReason, setCancelReason] = useState('');
  const [loadingAction, setLoadingAction] = useState(false);
  const [error, setError] = useState('');
  const [conflictOccurred, setConflictOccurred] = useState(false);

  // Initialize date filters on client-side mount to avoid hydration mismatch
  useEffect(() => {
    const today = getLocalDateString();
    setFilterDate(today);
    setFormDate(today);
  }, []);

  // Fetch appointments based on filters
  const loadAppointments = async () => {
    if (!filterDate) return;
    setLoadingList(true);
    const res = await listAppointmentsAction({
      healthUnitId: filterUnit || undefined,
      doctorId: filterDoctor || undefined,
      specialtyId: filterSpecialty || undefined,
      date: filterDate,
    });
    setLoadingList(false);
    if (res.success && res.appointments) {
      setAppointmentsList(res.appointments);
    } else {
      console.error(res.error || 'Erro ao carregar consultas.');
    }
  };

  // Generate and download/print Patient Timeline PDF from schedule
  const generatePrescriptionPDF = (appt: any, printMode: boolean = false) => {
    const rx = appt.medicalRecord?.prescription;
    if (!rx) return;

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 20;

    // Frame/Border
    doc.setDrawColor(203, 213, 225); // slate-300
    doc.setLineWidth(0.5);
    doc.rect(margin - 5, margin - 5, pageWidth - 2 * margin + 10, pageHeight - 2 * margin + 10);

    // Header Title
    doc.setTextColor(15, 23, 42); // slate-900
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(appt.doctor.healthUnit?.name || 'RECEITUÁRIO MUNICIPAL', pageWidth / 2, margin + 10, { align: 'center' });
    
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // slate-500
    const rxDate = new Date(rx.createdAt).toLocaleDateString('pt-BR');
    doc.text(`Receita emitida em: ${rxDate}`, pageWidth / 2, margin + 16, { align: 'center' });

    doc.setDrawColor(148, 163, 184); // slate-400
    doc.setLineWidth(0.8);
    doc.line(margin, margin + 22, pageWidth - margin, margin + 22);

    // Document title
    doc.setTextColor(15, 23, 42);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('RECEITUÁRIO MÉDICO', pageWidth / 2, margin + 34, { align: 'center' });

    // Patient Information Card
    doc.setFillColor(248, 250, 252);
    doc.rect(margin, margin + 42, pageWidth - 2 * margin, 24, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(margin, margin + 42, pageWidth - 2 * margin, 24, 'S');

    doc.setTextColor(15, 23, 42);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('PACIENTE:', margin + 5, margin + 48);
    doc.setFont('Helvetica', 'normal');
    doc.text(appt.patient.name, margin + 28, margin + 48);

    doc.setFont('Helvetica', 'bold');
    doc.text('CPF:', margin + 5, margin + 54);
    doc.setFont('Helvetica', 'normal');
    doc.text(appt.patient.cpf, margin + 18, margin + 54);

    doc.setFont('Helvetica', 'bold');
    doc.text('NASCIMENTO:', margin + 100, margin + 54);
    doc.setFont('Helvetica', 'normal');
    const dob = new Date(appt.patient.birthDate).toLocaleDateString('pt-BR');
    doc.text(dob, margin + 130, margin + 54);

    doc.setFont('Helvetica', 'bold');
    doc.text('CNS:', margin + 5, margin + 60);
    doc.setFont('Helvetica', 'normal');
    doc.text(appt.patient.cns || 'Não informado', margin + 18, margin + 60);

    // Prescriptions list
    let currentY = margin + 78;
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('USO INTERNO / PRESCRIÇÃO:', margin, currentY);

    doc.setFontSize(10);
    rx.items.forEach((item: any, index: number) => {
      currentY += 8;
      
      // Draw item title
      doc.setFont('Helvetica', 'bold');
      doc.text(`${index + 1}. ${item.medicine.name}`, margin + 2, currentY);
      
      // Quantity align right
      doc.text(`Qtd: ${item.quantity} ${item.medicine.unit.toLowerCase()}(s)`, pageWidth - margin - 5, currentY, { align: 'right' });

      currentY += 5;
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      
      const details = `Posologia: ${item.dosage} | Freq: ${item.frequency} | Duração: ${item.durationDays} dias`;
      doc.text(details, margin + 6, currentY);

      if (item.instructions) {
        currentY += 5;
        doc.text(`Instruções: ${item.instructions}`, margin + 6, currentY);
      }

      currentY += 4;
      doc.setDrawColor(241, 245, 249);
      doc.setLineWidth(0.3);
      doc.line(margin + 2, currentY, pageWidth - margin - 2, currentY);
      doc.setTextColor(15, 23, 42);
    });

    // Signature Area
    const signatureY = pageHeight - margin - 40;
    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.5);
    doc.line(pageWidth / 2 - 40, signatureY, pageWidth / 2 + 40, signatureY);

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(appt.doctor.user.name, pageWidth / 2, signatureY + 5, { align: 'center' });
    
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(appt.doctor.crm ? `CRM: ${appt.doctor.crm}` : 'Assinatura Médica', pageWidth / 2, signatureY + 9, { align: 'center' });

    if (printMode) {
      doc.autoPrint();
      window.open(doc.output('bloburl'), '_blank');
    } else {
      doc.save(`receita_${appt.patient.cpf}.pdf`);
    }
  };

  useEffect(() => {
    if (filterDate) {
      loadAppointments();
    }
  }, [filterUnit, filterSpecialty, filterDoctor, filterDate]);

  // Fetch doctor timeslots when doctor or date changes in the booking form
  useEffect(() => {
    if (formDoctor && formDate) {
      setLoadingSlots(true);
      setAvailableSlots([]);
      setFormTime('');
      getDoctorAvailabilitySlotsAction(formDoctor, formDate).then(res => {
        setLoadingSlots(false);
        if (res.success && res.slots) {
          setAvailableSlots(res.slots);
        }
      });
    }
  }, [formDoctor, formDate]);

  // Handle scheduling submit
  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPatient || !formUnit || !formSpecialty || !formDoctor || !formDate || (!formTime && !isWaitlistChecked && !isEncaixeChecked)) {
      setError('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    setLoadingAction(true);
    setError('');
    setConflictOccurred(false);

    // Parse chosen datetime in local timezone to avoid day shifting
    const [year, month, day] = formDate.split('-').map(Number);
    const [h, m] = formTime ? formTime.split(':').map(Number) : [8, 0];
    const apptDateTime = new Date(year, month - 1, day, h, m, 0, 0);

    const res = await scheduleAppointmentAction({
      patientId: formPatient,
      doctorId: formDoctor,
      healthUnitId: formUnit,
      specialtyId: formSpecialty,
      dateTime: apptDateTime,
      forceOverbook: isEncaixeChecked,
      forceWaitlist: isWaitlistChecked,
    });

    setLoadingAction(false);

    if (res.success) {
      setIsScheduleOpen(false);
      window.location.reload();
    } else {
      if (res.error?.includes('CONFLICT_OCCURRED')) {
        setConflictOccurred(true);
        setError('O horário selecionado já está ocupado. Deseja realizar um encaixe (vaga extra) ou incluir o paciente na fila de espera?');
      } else {
        setError(res.error || 'Erro ao agendar consulta.');
      }
    }
  };

  // Confirm appointment
  const handleConfirm = async (id: string) => {
    const res = await confirmAppointmentAction(id);
    if (res.success) {
      window.location.reload();
    } else {
      alert(res.error || 'Erro ao confirmar consulta.');
    }
  };

  // Open Cancel dialog
  const handleOpenCancel = (appt: any) => {
    setSelectedAppt(appt);
    setCancelReason('');
    setIsCancelOpen(true);
  };

  // Submit cancellation
  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppt || !cancelReason) return;

    setLoadingAction(true);
    const res = await cancelAppointmentAction(selectedAppt.id, cancelReason);
    setLoadingAction(false);

    if (res.success) {
      setIsCancelOpen(false);
      window.location.reload();
    } else {
      alert(res.error || 'Erro ao cancelar consulta.');
    }
  };

  const filteredDoctors = formSpecialty
    ? doctors.filter(d => d.specialtyIds.includes(formSpecialty))
    : doctors;

  return (
    <div className="space-y-6">
      
      {/* Upper header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Agenda de Consultas</h1>
          <p className="text-xs text-muted-foreground">Gerencie a fila de espera, encaixes e agendamentos médicos.</p>
        </div>
        <Button onClick={() => {
          setFormPatient('');
          setFormUnit('');
          setFormSpecialty('');
          setFormDoctor('');
          setFormTime('');
          setIsWaitlistChecked(false);
          setIsEncaixeChecked(false);
          setError('');
          setConflictOccurred(false);
          setIsScheduleOpen(true);
        }} className="flex items-center gap-2">
          <Plus size={18} />
          Agendar Consulta
        </Button>
      </div>

      {/* Filter toolbar */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">Unidade de Saúde</label>
              <Select
                value={filterUnit}
                onChange={(e) => setFilterUnit(e.target.value)}
                options={healthUnits.map(h => ({ value: h.id, label: h.name }))}
                placeholder="Todas as Unidades"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">Especialidade</label>
              <Select
                value={filterSpecialty}
                onChange={(e) => setFilterSpecialty(e.target.value)}
                options={specialties.map(s => ({ value: s.id, label: s.name }))}
                placeholder="Todas as Especialidades"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">Médico</label>
              <Select
                value={filterDoctor}
                onChange={(e) => setFilterDoctor(e.target.value)}
                options={doctors.map(d => ({ value: d.id, label: d.name }))}
                placeholder="Todos os Médicos"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">Data da Agenda</label>
              <Input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Appointments List Board */}
      <Card>
        <CardHeader className="border-b border-border flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Calendar size={18} className="text-primary" />
              Agenda Diária - {formatDateString(filterDate)}
            </CardTitle>
            <CardDescription className="text-xs">Grade de horários do dia com ações de atendimento.</CardDescription>
          </div>
          <Button onClick={loadAppointments} size="icon" variant="ghost" className="h-8 w-8">
            <RefreshCw size={15} />
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/20 text-muted-foreground font-bold">
                  <th className="px-6 py-3.5">Horário</th>
                  <th className="px-6 py-3.5">Paciente</th>
                  <th className="px-6 py-3.5">Médico</th>
                  <th className="px-6 py-3.5">Especialidade</th>
                  <th className="px-6 py-3.5">Tipo</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loadingList ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-muted-foreground">
                      Carregando agenda...
                    </td>
                  </tr>
                ) : appointmentsList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-muted-foreground">
                      Nenhuma consulta agendada para os filtros selecionados nesta data.
                    </td>
                  </tr>
                ) : (
                  appointmentsList.map(appt => (
                    <tr key={appt.id} className="hover:bg-muted/10 transition-colors">
                      <td className="px-6 py-4 font-bold whitespace-nowrap text-foreground flex items-center gap-1.5">
                        <Clock size={14} className="text-muted-foreground" />
                        {new Date(appt.dateTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-6 py-4 font-bold text-foreground">
                        {appt.patient.name}
                        <span className="block font-medium text-[9px] text-muted-foreground mt-0.5">CPF: {appt.patient.cpf}</span>
                        {appt.medicalRecord?.prescription && (
                          <div className="mt-1 flex flex-wrap gap-1 items-center">
                            <span className="inline-flex items-center gap-1 bg-blue-500/10 text-blue-500 font-bold text-[8px] px-1.5 py-0.5 rounded">
                              <Pill size={8} />
                              Receita: {appt.medicalRecord.prescription.items.map((it: any) => it.medicine.name).join(', ')}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">{appt.doctor.user.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{appt.specialty.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant="secondary">{appt.type === 'WALK_IN' ? 'Encaixe' : 'Regular'}</Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={appt.status === 'COMPLETED' ? 'success' : appt.status === 'CONFIRMED' ? 'info' : appt.status === 'CANCELLED' ? 'destructive' : appt.status === 'WAITLIST' ? 'warning' : 'default'}>
                          {appt.status === 'COMPLETED' ? 'Atendido' : appt.status === 'CONFIRMED' ? 'Confirmado' : appt.status === 'CANCELLED' ? 'Cancelado' : appt.status === 'WAITLIST' ? 'Fila de Espera' : 'Pendente'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right space-x-2">
                        {appt.status === 'PENDING' && (
                          <Button onClick={() => handleConfirm(appt.id)} size="sm" className="bg-emerald-600 hover:bg-emerald-500 h-8 px-2" title="Confirmar Presença">
                            <UserCheck size={14} className="mr-1" /> Confirmar
                          </Button>
                        )}
                        {appt.status !== 'CANCELLED' && appt.status !== 'COMPLETED' && (
                          <Button onClick={() => handleOpenCancel(appt)} size="sm" variant="outline" className="h-8 px-2 text-destructive border-destructive/20 hover:bg-destructive/5 hover:text-destructive" title="Cancelar">
                            <XCircle size={14} />
                          </Button>
                        )}
                        {appt.medicalRecord?.prescription && (
                          <div className="inline-flex items-center gap-1">
                            <Button
                              onClick={() => generatePrescriptionPDF(appt, true)}
                              size="sm"
                              variant="outline"
                              className="h-8 px-2 border-primary/20 text-primary hover:bg-primary/5 gap-1 text-[10px] font-bold"
                              title="Imprimir Receita"
                            >
                              <Printer size={12} /> Imprimir
                            </Button>
                            <Button
                              onClick={() => generatePrescriptionPDF(appt, false)}
                              size="sm"
                              variant="outline"
                              className="h-8 px-2 border-primary/20 text-primary hover:bg-primary/5 gap-1 text-[10px] font-bold"
                              title="Baixar Receita PDF"
                            >
                              <Download size={12} /> PDF
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* dialog for Scheduling */}
      <Dialog isOpen={isScheduleOpen} onClose={() => setIsScheduleOpen(false)} title="Agendar Consulta">
        <form onSubmit={handleScheduleSubmit} className="space-y-4">
          {error && (
            <div className={`p-3 rounded-lg text-xs font-semibold flex gap-2 ${conflictOccurred ? 'bg-amber-500/15 text-amber-500 border border-amber-500/20' : 'bg-destructive/15 text-destructive'}`}>
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-4">
            
            {/* Select Patient */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold">Paciente *</label>
              <Select
                value={formPatient}
                onChange={(e) => setFormPatient(e.target.value)}
                options={patients.map(p => ({ value: p.id, label: `${p.name} (${p.cpf})` }))}
                placeholder="Selecione o Paciente"
                required
              />
            </div>

            {/* Select Health Unit */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold">Unidade de Saúde *</label>
              <Select
                value={formUnit}
                onChange={(e) => setFormUnit(e.target.value)}
                options={healthUnits.map(h => ({ value: h.id, label: h.name }))}
                placeholder="Selecione a Unidade"
                required
              />
            </div>

            {/* Select Specialty */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold">Especialidade *</label>
              <Select
                value={formSpecialty}
                onChange={(e) => setFormSpecialty(e.target.value)}
                options={specialties.map(s => ({ value: s.id, label: s.name }))}
                placeholder="Selecione a Especialidade"
                required
              />
            </div>

            {/* Select Doctor */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold">Médico *</label>
              <Select
                value={formDoctor}
                onChange={(e) => setFormDoctor(e.target.value)}
                options={filteredDoctors.map(d => ({ value: d.id, label: d.name }))}
                placeholder="Selecione o Médico"
                disabled={!formSpecialty}
                required
              />
            </div>

            {/* Select Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold">Data *</label>
              <Input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                disabled={!formDoctor}
                required
              />
            </div>

            {/* Timeslots selection */}
            {formDoctor && (
              <div className="space-y-2">
                <label className="text-xs font-bold flex items-center gap-1">
                  <Clock size={14} />
                  Horários Disponíveis *
                </label>
                {loadingSlots ? (
                  <p className="text-xs text-muted-foreground">Carregando horários...</p>
                ) : availableSlots.length === 0 ? (
                  <p className="text-xs text-destructive font-medium">Médico sem horários configurados ou disponíveis nesta data.</p>
                ) : (
                  <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto p-1.5 border border-border rounded-lg bg-muted/20">
                    {availableSlots.map(slot => (
                      <button
                        key={slot.time}
                        type="button"
                        onClick={() => {
                          if (slot.available) {
                            setFormTime(slot.time);
                            setIsEncaixeChecked(false);
                            setIsWaitlistChecked(false);
                          }
                        }}
                        disabled={!slot.available}
                        className={`py-1.5 text-xs rounded-md font-semibold cursor-pointer border text-center transition-all ${
                          formTime === slot.time
                            ? 'bg-primary text-primary-foreground border-transparent'
                            : slot.available
                            ? 'bg-card text-foreground border-border hover:bg-accent'
                            : 'bg-muted/50 text-muted-foreground border-border/40 opacity-40 cursor-not-allowed'
                        }`}
                      >
                        {slot.time}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Waitlist / Overbook selections on conflicts */}
            {conflictOccurred && (
              <div className="space-y-3 bg-amber-500/5 border border-amber-500/10 p-3 rounded-lg text-xs">
                <p className="font-bold text-amber-500 flex items-center gap-1">Opções Alternativas:</p>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-1.5 font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isWaitlistChecked}
                      onChange={(e) => {
                        setIsWaitlistChecked(e.target.checked);
                        if (e.target.checked) {
                          setIsEncaixeChecked(false);
                          setFormTime('');
                        }
                      }}
                      className="cursor-pointer"
                    />
                    Fila de Espera
                  </label>
                  
                  <label className="flex items-center gap-1.5 font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isEncaixeChecked}
                      onChange={(e) => {
                        setIsEncaixeChecked(e.target.checked);
                        if (e.target.checked) {
                          setIsWaitlistChecked(false);
                          setFormTime('');
                        }
                      }}
                      className="cursor-pointer"
                    />
                    Realizar Encaixe
                  </label>
                </div>
              </div>
            )}

          </div>

          <div className="flex justify-end gap-3 border-t border-border pt-4 mt-6">
            <Button type="button" variant="outline" onClick={() => setIsScheduleOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={loadingAction || (!formTime && !isWaitlistChecked && !isEncaixeChecked)}>
              {loadingAction ? 'Agendando...' : 'Agendar'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* dialog for Cancellation */}
      <Dialog isOpen={isCancelOpen} onClose={() => setIsCancelOpen(false)} title="Cancelar Consulta">
        <form onSubmit={handleCancelSubmit} className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Tem certeza de que deseja cancelar a consulta do paciente <strong>{selectedAppt?.patient?.name}</strong>?
          </p>

          <div className="space-y-1.5">
            <label className="text-xs font-bold">Motivo do Cancelamento *</label>
            <Select
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              options={[
                { value: 'Paciente desistiu / não pôde comparecer', label: 'Desistência do paciente' },
                { value: 'Médico ausente / emergência', label: 'Ausência do médico' },
                { value: 'Duplicidade de agendamento', label: 'Erro de agendamento' },
                { value: 'Feriado / Unidade fechada', label: 'Unidade de saúde fechada' },
              ]}
              placeholder="Selecione o motivo"
              required
            />
          </div>

          <div className="flex justify-end gap-3 border-t border-border pt-4">
            <Button type="button" variant="outline" onClick={() => setIsCancelOpen(false)}>Fechar</Button>
            <Button type="submit" variant="destructive" disabled={loadingAction || !cancelReason}>
              {loadingAction ? 'Cancelando...' : 'Confirmar Cancelamento'}
            </Button>
          </div>
        </form>
      </Dialog>

    </div>
  );
}
