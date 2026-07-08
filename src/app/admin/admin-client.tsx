'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Dialog } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  createHealthUnitAction,
  createDoctorAction,
  createReceptionistAction,
  getDoctorSchedulesAction,
  createDoctorScheduleAction,
  deleteDoctorScheduleAction,
} from '@/actions/admin.actions';
import { Building2, UserCog, Stethoscope, Plus, Search, ShieldCheck, Mail, Key, Phone, CreditCard, Clock, MapPin, FileSpreadsheet, Download, FileText, Users, Pill, Calendar, Trash } from 'lucide-react';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';

interface HealthUnit {
  id: string;
  name: string;
  cnes: string;
  address: string;
  cep: string;
  city: string;
  state: string;
  phone: string;
  operatingHours: string;
}

interface Specialty {
  id: string;
  name: string;
  description: string;
}

interface Doctor {
  id: string;
  name: string;
  email: string;
  crm: string;
  phone: string;
  healthUnitName: string;
  specialties: string[];
}

interface Receptionist {
  id: string;
  name: string;
  email: string;
  status: string;
}

interface PatientReportItem {
  id: string;
  name: string;
  cpf: string;
  cns: string;
  birthDate: string;
  gender: string;
  phone: string;
  allergies: string;
  chronicDiseases: string;
}

interface AttendanceReportItem {
  id: string;
  patientName: string;
  patientCpf: string;
  doctorName: string;
  specialtyName: string;
  healthUnitName: string;
  createdAt: string;
  anamnese: string;
  diagnosisHipotesis: string;
  cidCode: string;
}

interface MedicineReportItem {
  id: string;
  name: string;
  activeIngredient: string;
  code: string;
  category: string;
  stockLevel: number;
  unit: string;
  batch: string;
  expirationDate: string;
  manufacturer: string;
}

export default function AdminClient({
  initialHealthUnits,
  specialties,
  initialDoctors,
  initialReceptionists,
  patients = [],
  medicalRecords = [],
  medicines = [],
}: {
  initialHealthUnits: HealthUnit[];
  specialties: Specialty[];
  initialDoctors: Doctor[];
  initialReceptionists: Receptionist[];
  patients?: PatientReportItem[];
  medicalRecords?: AttendanceReportItem[];
  medicines?: MedicineReportItem[];
}) {
  const [activeTab, setActiveTab] = useState<'units' | 'doctors' | 'receptionists' | 'reports'>('units');

  // Lists state (in case we add items and want to update state or reload)
  const [healthUnits, setHealthUnits] = useState<HealthUnit[]>(initialHealthUnits);
  const [doctors, setDoctors] = useState<Doctor[]>(initialDoctors);
  const [receptionists, setReceptionists] = useState<Receptionist[]>(initialReceptionists);

  // Modals state
  const [isUnitOpen, setIsUnitOpen] = useState(false);
  const [isDoctorOpen, setIsDoctorOpen] = useState(false);
  const [isReceptionistOpen, setIsReceptionistOpen] = useState(false);
  const [isScheduleManagerOpen, setIsScheduleManagerOpen] = useState(false);
  const [selectedDoctorForSchedule, setSelectedDoctorForSchedule] = useState<Doctor | null>(null);
  const [doctorSchedulesList, setDoctorSchedulesList] = useState<any[]>([]);
  const [loadingSchedules, setLoadingSchedules] = useState(false);

  const [scheduleForm, setScheduleForm] = useState({
    dayOfWeek: 1, // default Monday
    startTime: '08:00',
    endTime: '12:00',
    slotDurationMinutes: 20,
    breakStartTime: '10:00',
    breakEndTime: '10:20',
    healthUnitId: initialHealthUnits[0]?.id || '',
  });

  // Search state
  const [searchTerm, setSearchTerm] = useState('');

  // Loading & error states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Report Filter/Search states
  const [reportSearch, setReportSearch] = useState('');
  const [reportDoctorFilter, setReportDoctorFilter] = useState('');
  const [reportUnitFilter, setReportUnitFilter] = useState('');

  // Filtered Patients for Report
  const filteredPatientsForReport = patients.filter(p =>
    p.name.toLowerCase().includes(reportSearch.toLowerCase()) ||
    p.cpf.toLowerCase().includes(reportSearch.toLowerCase())
  );

  // Filtered Attendances for Report
  const filteredAttendancesForReport = medicalRecords.filter(mr => {
    const matchesSearch = mr.patientName.toLowerCase().includes(reportSearch.toLowerCase()) ||
      mr.doctorName.toLowerCase().includes(reportSearch.toLowerCase());
    const matchesDoctor = reportDoctorFilter ? mr.doctorName === reportDoctorFilter : true;
    const matchesUnit = reportUnitFilter ? mr.healthUnitName === reportUnitFilter : true;
    return matchesSearch && matchesDoctor && matchesUnit;
  });

  // Filtered Medicines for Report
  const filteredMedicinesForReport = medicines.filter(m =>
    m.name.toLowerCase().includes(reportSearch.toLowerCase()) ||
    m.activeIngredient.toLowerCase().includes(reportSearch.toLowerCase())
  );

  // EXPORT PATIENTS TO EXCEL
  const exportPatientsExcel = () => {
    const data = filteredPatientsForReport.map(p => ({
      'Nome Completo': p.name,
      'CPF': p.cpf,
      'Cartão SUS (CNS)': p.cns || '-',
      'Data de Nascimento': new Date(p.birthDate).toLocaleDateString('pt-BR'),
      'Gênero': p.gender === 'M' ? 'Masculino' : p.gender === 'F' ? 'Feminino' : 'Outro',
      'Telefone': p.phone || '-',
      'Alergias': p.allergies || 'Nenhuma registrada',
      'Doenças Crônicas': p.chronicDiseases || 'Nenhuma registrada'
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Pacientes');
    XLSX.writeFile(workbook, `relatorio_pacientes_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // EXPORT PATIENTS TO PDF
  const generatePatientsPDF = () => {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });
    const pageWidth = 297;
    const pageHeight = 210;
    const margin = 15;
    let yPos = margin;

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('RELATÓRIO DE PACIENTES CADASTRADOS', pageWidth / 2, yPos + 5, { align: 'center' });
    yPos += 12;

    doc.setLineWidth(0.5);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 8;

    // Draw header of table
    doc.setFontSize(9);
    doc.text('Nome', margin, yPos);
    doc.text('CPF', margin + 65, yPos);
    doc.text('SUS/CNS', margin + 105, yPos);
    doc.text('Nascimento', margin + 145, yPos);
    doc.text('Gênero', margin + 175, yPos);
    doc.text('Telefone', margin + 195, yPos);
    doc.text('Doenças Crônicas', margin + 225, yPos);
    yPos += 4;
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 6;

    doc.setFont('Helvetica', 'normal');
    filteredPatientsForReport.forEach(p => {
      if (yPos > pageHeight - 15) {
        doc.addPage();
        yPos = margin;
        // header redraw
        doc.setFont('Helvetica', 'bold');
        doc.text('Nome', margin, yPos);
        doc.text('CPF', margin + 65, yPos);
        doc.text('SUS/CNS', margin + 105, yPos);
        doc.text('Nascimento', margin + 145, yPos);
        doc.text('Gênero', margin + 175, yPos);
        doc.text('Telefone', margin + 195, yPos);
        doc.text('Doenças Crônicas', margin + 225, yPos);
        yPos += 4;
        doc.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 6;
        doc.setFont('Helvetica', 'normal');
      }

      const nameTrunc = p.name.length > 30 ? p.name.substring(0, 28) + '..' : p.name;
      doc.text(nameTrunc, margin, yPos);
      doc.text(p.cpf, margin + 65, yPos);
      doc.text(p.cns || '-', margin + 105, yPos);
      const dob = new Date(p.birthDate).toLocaleDateString('pt-BR');
      doc.text(dob, margin + 145, yPos);
      doc.text(p.gender === 'M' ? 'Masc' : p.gender === 'F' ? 'Fem' : 'Outro', margin + 175, yPos);
      doc.text(p.phone || '-', margin + 195, yPos);
      
      const chronicTrunc = p.chronicDiseases.length > 25 ? p.chronicDiseases.substring(0, 23) + '..' : (p.chronicDiseases || '-');
      doc.text(chronicTrunc, margin + 225, yPos);
      yPos += 6;
    });

    doc.save('relatorio_pacientes.pdf');
  };

  // EXPORT ATTENDANCES TO EXCEL
  const exportAttendancesExcel = () => {
    const data = filteredAttendancesForReport.map(mr => ({
      'Data/Hora': new Date(mr.createdAt).toLocaleString('pt-BR'),
      'Paciente': mr.patientName,
      'CPF Paciente': mr.patientCpf,
      'Médico': mr.doctorName,
      'Especialidade': mr.specialtyName,
      'Unidade de Saúde': mr.healthUnitName,
      'Hipótese Diagnóstica': mr.diagnosisHipotesis || '-',
      'Código CID': mr.cidCode || '-',
      'Anamnese / Queixa': mr.anamnese
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Atendimentos');
    XLSX.writeFile(workbook, `relatorio_atendimentos_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // EXPORT ATTENDANCES TO PDF
  const generateAttendancesPDF = () => {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });
    const pageWidth = 297;
    const pageHeight = 210;
    const margin = 15;
    let yPos = margin;

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('RELATÓRIO DE ATENDIMENTOS MÉDICOS', pageWidth / 2, yPos + 5, { align: 'center' });
    yPos += 12;

    doc.setLineWidth(0.5);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 8;

    // Draw header of table
    doc.setFontSize(9);
    doc.text('Data/Hora', margin, yPos);
    doc.text('Paciente', margin + 35, yPos);
    doc.text('Médico', margin + 95, yPos);
    doc.text('Especialidade', margin + 150, yPos);
    doc.text('Unidade de Saúde', margin + 190, yPos);
    doc.text('Diagnóstico (Hipótese)', margin + 240, yPos);
    yPos += 4;
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 6;

    doc.setFont('Helvetica', 'normal');
    filteredAttendancesForReport.forEach(mr => {
      if (yPos > pageHeight - 15) {
        doc.addPage();
        yPos = margin;
        // header redraw
        doc.setFont('Helvetica', 'bold');
        doc.text('Data/Hora', margin, yPos);
        doc.text('Paciente', margin + 35, yPos);
        doc.text('Médico', margin + 95, yPos);
        doc.text('Especialidade', margin + 150, yPos);
        doc.text('Unidade de Saúde', margin + 190, yPos);
        doc.text('Diagnóstico (Hipótese)', margin + 240, yPos);
        yPos += 4;
        doc.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 6;
        doc.setFont('Helvetica', 'normal');
      }

      const formattedDate = new Date(mr.createdAt).toLocaleDateString('pt-BR') + ' ' + new Date(mr.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      doc.text(formattedDate, margin, yPos);
      
      const patTrunc = mr.patientName.length > 25 ? mr.patientName.substring(0, 23) + '..' : mr.patientName;
      doc.text(patTrunc, margin + 35, yPos);
      
      const docTrunc = mr.doctorName.length > 25 ? mr.doctorName.substring(0, 23) + '..' : mr.doctorName;
      doc.text(docTrunc, margin + 95, yPos);
      
      doc.text(mr.specialtyName, margin + 150, yPos);
      doc.text(mr.healthUnitName, margin + 190, yPos);
      
      const diag = mr.diagnosisHipotesis || '-';
      const diagTrunc = diag.length > 22 ? diag.substring(0, 20) + '..' : diag;
      doc.text(diagTrunc, margin + 240, yPos);
      yPos += 6;
    });

    doc.save('relatorio_atendimentos.pdf');
  };

  // EXPORT MEDICINES TO EXCEL
  const exportMedicinesExcel = () => {
    const data = filteredMedicinesForReport.map(m => ({
      'Medicamento': m.name,
      'Princípio Ativo': m.activeIngredient,
      'Código': m.code || '-',
      'Categoria': m.category || '-',
      'Estoque Atual': m.stockLevel,
      'Unidade': m.unit,
      'Lote': m.batch || '-',
      'Data de Validade': m.expirationDate ? new Date(m.expirationDate + 'T12:00:00').toLocaleDateString('pt-BR') : '-',
      'Fabricante': m.manufacturer || '-'
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Estoque');
    XLSX.writeFile(workbook, `relatorio_estoque_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // EXPORT MEDICINES TO PDF
  const generateMedicinesPDF = () => {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });
    const pageWidth = 297;
    const pageHeight = 210;
    const margin = 15;
    let yPos = margin;

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('RELATÓRIO DE ESTOQUE E MEDICAMENTOS', pageWidth / 2, yPos + 5, { align: 'center' });
    yPos += 12;

    doc.setLineWidth(0.5);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 8;

    // Draw header of table
    doc.setFontSize(9);
    doc.text('Medicamento', margin, yPos);
    doc.text('Princípio Ativo', margin + 65, yPos);
    doc.text('Categoria', margin + 125, yPos);
    doc.text('Lote', margin + 165, yPos);
    doc.text('Fabricante', margin + 195, yPos);
    doc.text('Validade', margin + 235, yPos);
    doc.text('Estoque', margin + 265, yPos);
    yPos += 4;
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 6;

    doc.setFont('Helvetica', 'normal');
    filteredMedicinesForReport.forEach(m => {
      if (yPos > pageHeight - 15) {
        doc.addPage();
        yPos = margin;
        // header redraw
        doc.setFont('Helvetica', 'bold');
        doc.text('Medicamento', margin, yPos);
        doc.text('Princípio Ativo', margin + 65, yPos);
        doc.text('Categoria', margin + 125, yPos);
        doc.text('Lote', margin + 165, yPos);
        doc.text('Fabricante', margin + 195, yPos);
        doc.text('Validade', margin + 235, yPos);
        doc.text('Estoque', margin + 265, yPos);
        yPos += 4;
        doc.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 6;
        doc.setFont('Helvetica', 'normal');
      }

      const medTrunc = m.name.length > 28 ? m.name.substring(0, 26) + '..' : m.name;
      doc.text(medTrunc, margin, yPos);
      
      const actTrunc = m.activeIngredient.length > 28 ? m.activeIngredient.substring(0, 26) + '..' : m.activeIngredient;
      doc.text(actTrunc, margin + 65, yPos);
      
      doc.text(m.category || '-', margin + 125, yPos);
      doc.text(m.batch || '-', margin + 165, yPos);
      doc.text(m.manufacturer || '-', margin + 195, yPos);
      
      const expDate = m.expirationDate ? new Date(m.expirationDate + 'T12:00:00').toLocaleDateString('pt-BR') : '-';
      doc.text(expDate, margin + 235, yPos);
      
      doc.setFont('Helvetica', 'bold');
      doc.text(`${m.stockLevel} ${m.unit.toLowerCase()}(s)`, margin + 265, yPos);
      doc.setFont('Helvetica', 'normal');
      yPos += 6;
    });

    doc.save('relatorio_estoque.pdf');
  };

  // Form states
  const [unitForm, setUnitForm] = useState({
    name: '',
    cnes: '',
    address: '',
    cep: '',
    city: '',
    state: '',
    phone: '',
    operatingHours: '07:00 - 17:00',
  });

  const [receptionistForm, setReceptionistForm] = useState({
    name: '',
    email: '',
    password: '',
  });

  const [doctorForm, setDoctorForm] = useState({
    name: '',
    email: '',
    password: '',
    crm: '',
    phone: '',
    healthUnitId: '',
    selectedSpecialties: [] as string[],
  });

  // Handle Health Unit Submit
  const handleUnitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unitForm.name || !unitForm.address || !unitForm.cep || !unitForm.city || !unitForm.state) {
      setError('Por favor, preencha todos os campos obrigatórios (*).');
      return;
    }

    setLoading(true);
    setError('');

    const res = await createHealthUnitAction(unitForm);
    setLoading(false);

    if (res.success) {
      setIsUnitOpen(false);
      window.location.reload();
    } else {
      setError(res.error || 'Erro ao cadastrar posto de saúde.');
    }
  };

  // Handle Receptionist Submit
  const handleReceptionistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receptionistForm.name || !receptionistForm.email || !receptionistForm.password) {
      setError('Por favor, preencha todos os campos obrigatórios (*).');
      return;
    }

    setLoading(true);
    setError('');

    const res = await createReceptionistAction(receptionistForm);
    setLoading(false);

    if (res.success) {
      setIsReceptionistOpen(false);
      window.location.reload();
    } else {
      setError(res.error || 'Erro ao cadastrar recepcionista.');
    }
  };

  // Handle Doctor Submit
  const handleDoctorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doctorForm.name || !doctorForm.email || !doctorForm.password || !doctorForm.crm || !doctorForm.healthUnitId || doctorForm.selectedSpecialties.length === 0) {
      setError('Por favor, preencha todos os campos obrigatórios (*), incluindo pelo menos uma especialidade.');
      return;
    }

    setLoading(true);
    setError('');

    const res = await createDoctorAction({
      name: doctorForm.name,
      email: doctorForm.email,
      password: doctorForm.password,
      crm: doctorForm.crm,
      phone: doctorForm.phone,
      healthUnitId: doctorForm.healthUnitId,
      specialtyIds: doctorForm.selectedSpecialties,
    });
    setLoading(false);

    if (res.success) {
      setIsDoctorOpen(false);
      window.location.reload();
    } else {
      setError(res.error || 'Erro ao cadastrar médico.');
    }
  };

  // Manage Doctor Schedules helpers
  const handleOpenScheduleManager = async (doctor: Doctor) => {
    setSelectedDoctorForSchedule(doctor);
    setLoadingSchedules(true);
    setDoctorSchedulesList([]);
    setIsScheduleManagerOpen(true);
    setError('');

    // Prepopulate form unit
    setScheduleForm(prev => ({
      ...prev,
      healthUnitId: initialHealthUnits.find(hu => hu.name === doctor.healthUnitName)?.id || initialHealthUnits[0]?.id || '',
    }));

    const res = await getDoctorSchedulesAction(doctor.id);
    setLoadingSchedules(false);
    if (res.success && res.schedules) {
      setDoctorSchedulesList(res.schedules);
    } else {
      setError(res.error || 'Erro ao carregar agenda do médico.');
    }
  };

  const handleAddScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctorForSchedule) return;

    setLoading(true);
    setError('');

    const res = await createDoctorScheduleAction({
      doctorId: selectedDoctorForSchedule.id,
      healthUnitId: scheduleForm.healthUnitId,
      dayOfWeek: Number(scheduleForm.dayOfWeek),
      startTime: scheduleForm.startTime,
      endTime: scheduleForm.endTime,
      slotDurationMinutes: Number(scheduleForm.slotDurationMinutes),
      breakStartTime: scheduleForm.breakStartTime || undefined,
      breakEndTime: scheduleForm.breakEndTime || undefined,
    });

    setLoading(false);
    if (res.success) {
      // Reload schedules list
      const listRes = await getDoctorSchedulesAction(selectedDoctorForSchedule.id);
      if (listRes.success && listRes.schedules) {
        setDoctorSchedulesList(listRes.schedules);
      }
      // Reset form defaults slightly
      setScheduleForm(prev => ({
        ...prev,
        dayOfWeek: (Number(prev.dayOfWeek) % 6) + 1, // advance day
      }));
    } else {
      setError(res.error || 'Erro ao adicionar horário na agenda.');
    }
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    if (!selectedDoctorForSchedule) return;
    if (!confirm('Deseja realmente excluir este horário de trabalho do médico?')) return;

    setLoading(true);
    setError('');

    const res = await deleteDoctorScheduleAction(scheduleId);
    setLoading(false);
    if (res.success) {
      // Reload schedules list
      const listRes = await getDoctorSchedulesAction(selectedDoctorForSchedule.id);
      if (listRes.success && listRes.schedules) {
        setDoctorSchedulesList(listRes.schedules);
      }
    } else {
      setError(res.error || 'Erro ao remover horário da agenda.');
    }
  };

  // Toggle Specialty Selection
  const toggleSpecialty = (specialtyId: string) => {
    setDoctorForm(prev => {
      const selected = prev.selectedSpecialties.includes(specialtyId)
        ? prev.selectedSpecialties.filter(id => id !== specialtyId)
        : [...prev.selectedSpecialties, specialtyId];
      return { ...prev, selectedSpecialties: selected };
    });
  };

  // Open forms helper
  const openUnitModal = () => {
    setUnitForm({
      name: '',
      cnes: '',
      address: '',
      cep: '',
      city: '',
      state: '',
      phone: '',
      operatingHours: '07:00 - 17:00',
    });
    setError('');
    setIsUnitOpen(true);
  };

  const openReceptionistModal = () => {
    setReceptionistForm({
      name: '',
      email: '',
      password: '',
    });
    setError('');
    setIsReceptionistOpen(true);
  };

  const openDoctorModal = () => {
    setDoctorForm({
      name: '',
      email: '',
      password: '',
      crm: '',
      phone: '',
      healthUnitId: healthUnits[0]?.id || '',
      selectedSpecialties: [],
    });
    setError('');
    setIsDoctorOpen(true);
  };

  // Filters listings
  const filteredUnits = healthUnits.filter(u =>
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.cnes.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredDoctors = doctors.filter(d =>
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.crm.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.healthUnitName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredReceptionists = receptionists.filter(r =>
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Painel de Administração</h1>
          <p className="text-xs text-muted-foreground">Cadastre e configure postos de saúde, médicos, e recepcionistas do município.</p>
        </div>
        
        {activeTab === 'units' && (
          <Button onClick={openUnitModal} className="flex items-center gap-2">
            <Plus size={18} />
            Cadastrar Posto
          </Button>
        )}
        {activeTab === 'doctors' && (
          <Button onClick={openDoctorModal} className="flex items-center gap-2" disabled={healthUnits.length === 0}>
            <Plus size={18} />
            Cadastrar Médico
          </Button>
        )}
        {activeTab === 'receptionists' && (
          <Button onClick={openReceptionistModal} className="flex items-center gap-2">
            <Plus size={18} />
            Cadastrar Recepcionista
          </Button>
        )}
      </div>

      {/* Tabs navigation & search toolbar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
        
        {/* Navigation Tabs */}
        <div className="flex border border-border bg-muted/20 p-1 rounded-xl w-fit">
          <button
            onClick={() => { setActiveTab('units'); setSearchTerm(''); }}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg cursor-pointer transition-all ${
              activeTab === 'units'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Building2 size={16} />
            Postos de Saúde
          </button>
          <button
            onClick={() => { setActiveTab('doctors'); setSearchTerm(''); }}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg cursor-pointer transition-all ${
              activeTab === 'doctors'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Stethoscope size={16} />
            Médicos
          </button>
          <button
            onClick={() => { setActiveTab('receptionists'); setSearchTerm(''); }}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg cursor-pointer transition-all ${
              activeTab === 'receptionists'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <UserCog size={16} />
            Recepcionistas
          </button>
          <button
            onClick={() => { setActiveTab('reports'); setReportSearch(''); setReportDoctorFilter(''); setReportUnitFilter(''); }}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg cursor-pointer transition-all ${
              activeTab === 'reports'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <FileSpreadsheet size={16} />
            Relatórios
          </button>
        </div>

        {/* Search bar */}
        {activeTab !== 'reports' && (
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <Input
              placeholder="Pesquisar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        )}
      </div>

      {/* -------------------- TAB CONTENT 1: HEALTH UNITS -------------------- */}
      {activeTab === 'units' && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/20 text-muted-foreground font-bold">
                    <th className="px-6 py-3.5">Nome do Posto</th>
                    <th className="px-6 py-3.5">CNES</th>
                    <th className="px-6 py-3.5">Endereço</th>
                    <th className="px-6 py-3.5">Cidade/UF</th>
                    <th className="px-6 py-3.5">Telefone</th>
                    <th className="px-6 py-3.5">Horário</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredUnits.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-muted-foreground">
                        Nenhum posto de saúde cadastrado.
                      </td>
                    </tr>
                  ) : (
                    filteredUnits.map(unit => (
                      <tr key={unit.id} className="hover:bg-muted/10 transition-colors">
                        <td className="px-6 py-4 font-bold text-foreground">{unit.name}</td>
                        <td className="px-6 py-4 font-semibold text-muted-foreground">{unit.cnes || '-'}</td>
                        <td className="px-6 py-4">{unit.address}</td>
                        <td className="px-6 py-4">{unit.city}/{unit.state}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{unit.phone || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant="secondary" className="font-semibold">{unit.operatingHours}</Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* -------------------- TAB CONTENT 2: DOCTORS -------------------- */}
      {activeTab === 'doctors' && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/20 text-muted-foreground font-bold">
                    <th className="px-6 py-3.5">Nome</th>
                    <th className="px-6 py-3.5">E-mail</th>
                    <th className="px-6 py-3.5">CRM</th>
                    <th className="px-6 py-3.5">Unidade de Saúde</th>
                    <th className="px-6 py-3.5">Especialidades</th>
                    <th className="px-6 py-3.5">Telefone</th>
                    <th className="px-6 py-3.5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredDoctors.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-muted-foreground">
                        Nenhum médico cadastrado.
                      </td>
                    </tr>
                  ) : (
                    filteredDoctors.map(doctor => (
                      <tr key={doctor.id} className="hover:bg-muted/10 transition-colors">
                        <td className="px-6 py-4 font-bold text-foreground">{doctor.name}</td>
                        <td className="px-6 py-4 font-medium">{doctor.email}</td>
                        <td className="px-6 py-4 whitespace-nowrap font-bold text-primary">{doctor.crm}</td>
                        <td className="px-6 py-4">{doctor.healthUnitName}</td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1.5">
                            {doctor.specialties.map(spec => (
                              <Badge key={spec} variant="outline" className="text-[10px] font-semibold">{spec}</Badge>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">{doctor.phone || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <Button
                            onClick={() => handleOpenScheduleManager(doctor)}
                            size="sm"
                            variant="outline"
                            className="h-8 gap-1.5 text-xs font-semibold"
                          >
                            <Calendar size={14} /> Agenda
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* -------------------- TAB CONTENT 3: RECEPTIONISTS -------------------- */}
      {activeTab === 'receptionists' && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/20 text-muted-foreground font-bold">
                    <th className="px-6 py-3.5">Nome</th>
                    <th className="px-6 py-3.5">E-mail</th>
                    <th className="px-6 py-3.5">Status da Conta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredReceptionists.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="text-center py-10 text-muted-foreground">
                        Nenhum recepcionista cadastrado.
                      </td>
                    </tr>
                  ) : (
                    filteredReceptionists.map(rec => (
                      <tr key={rec.id} className="hover:bg-muted/10 transition-colors">
                        <td className="px-6 py-4 font-bold text-foreground">{rec.name}</td>
                        <td className="px-6 py-4 font-medium">{rec.email}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant={rec.status === 'ACTIVE' ? 'success' : 'destructive'} className="font-semibold">
                            {rec.status === 'ACTIVE' ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* -------------------- TAB CONTENT 4: REPORTS -------------------- */}
      {activeTab === 'reports' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Patients Report Card */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Users className="text-primary" size={18} />
                Relatório de Pacientes
              </CardTitle>
              <CardDescription className="text-xs">Exportar lista geral e dados cadastrais dos pacientes.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted/30 p-3 rounded-lg text-center">
                <span className="text-2xl font-black text-foreground">{patients.length}</span>
                <p className="text-[10px] text-muted-foreground font-semibold uppercase mt-0.5">Pacientes Cadastrados</p>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">Filtro rápido (Nome/CPF)</label>
                <Input
                  placeholder="Pesquisar..."
                  value={reportSearch}
                  onChange={(e) => setReportSearch(e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2">
                <Button onClick={exportPatientsExcel} size="sm" variant="outline" className="gap-1 text-xs">
                  <FileSpreadsheet size={14} /> Excel
                </Button>
                <Button onClick={generatePatientsPDF} size="sm" variant="outline" className="gap-1 text-xs">
                  <FileText size={14} /> PDF
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Attendances Report Card */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Stethoscope className="text-primary" size={18} />
                Relatório de Atendimentos
              </CardTitle>
              <CardDescription className="text-xs">Consultas, diagnósticos e anamneses registradas.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted/30 p-3 rounded-lg text-center">
                <span className="text-2xl font-black text-foreground">{filteredAttendancesForReport.length}</span>
                <p className="text-[10px] text-muted-foreground font-semibold uppercase mt-0.5">Atendimentos Filtrados</p>
              </div>
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Pesquisar Paciente/Médico</label>
                  <Input
                    placeholder="Filtrar por nome..."
                    value={reportSearch}
                    onChange={(e) => setReportSearch(e.target.value)}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Médico</label>
                  <Select
                    value={reportDoctorFilter}
                    onChange={(e) => setReportDoctorFilter(e.target.value)}
                    options={Array.from(new Set(medicalRecords.map(r => r.doctorName))).map(name => ({ value: name, label: name }))}
                    placeholder="Todos os Médicos"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Unidade de Saúde</label>
                  <Select
                    value={reportUnitFilter}
                    onChange={(e) => setReportUnitFilter(e.target.value)}
                    options={Array.from(new Set(medicalRecords.map(r => r.healthUnitName))).map(name => ({ value: name, label: name }))}
                    placeholder="Todas as Unidades"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2">
                <Button onClick={exportAttendancesExcel} size="sm" variant="outline" className="gap-1 text-xs">
                  <FileSpreadsheet size={14} /> Excel
                </Button>
                <Button onClick={generateAttendancesPDF} size="sm" variant="outline" className="gap-1 text-xs">
                  <FileText size={14} /> PDF
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Medicines/Inventory Report Card */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Pill className="text-primary" size={18} />
                Estoque de Medicamentos
              </CardTitle>
              <CardDescription className="text-xs">Estoque atual, princípio ativo e lotes de medicamentos.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted/30 p-3 rounded-lg text-center">
                <span className="text-2xl font-black text-foreground">{medicines.length}</span>
                <p className="text-[10px] text-muted-foreground font-semibold uppercase mt-0.5">Itens no Inventário</p>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">Filtro rápido (Nome/Princípio)</label>
                <Input
                  placeholder="Pesquisar..."
                  value={reportSearch}
                  onChange={(e) => setReportSearch(e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2">
                <Button onClick={exportMedicinesExcel} size="sm" variant="outline" className="gap-1 text-xs">
                  <FileSpreadsheet size={14} /> Excel
                </Button>
                <Button onClick={generateMedicinesPDF} size="sm" variant="outline" className="gap-1 text-xs">
                  <FileText size={14} /> PDF
                </Button>
              </div>
            </CardContent>
          </Card>

        </div>
      )}

      {/* ==================== DIALOG: REGISTER HEALTH UNIT ==================== */}
      <Dialog isOpen={isUnitOpen} onClose={() => setIsUnitOpen(false)} title="Cadastrar Posto de Saúde">
        <form onSubmit={handleUnitSubmit} className="space-y-4">
          {error && (
            <div className="bg-destructive/15 text-destructive border border-destructive/20 p-3 rounded-lg text-xs font-semibold">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-bold">Nome do Posto *</label>
              <Input
                placeholder="Ex: UBS Dr. Carlos de Souza"
                value={unitForm.name}
                onChange={(e) => setUnitForm({ ...unitForm, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold flex items-center gap-1">
                <CreditCard size={14} />
                CNES (Código)
              </label>
              <Input
                placeholder="Ex: 1234567"
                value={unitForm.cnes}
                onChange={(e) => setUnitForm({ ...unitForm, cnes: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold flex items-center gap-1">
                <Phone size={14} />
                Telefone
              </label>
              <Input
                placeholder="Ex: (81) 3456-7890"
                value={unitForm.phone}
                onChange={(e) => setUnitForm({ ...unitForm, phone: e.target.value })}
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-bold flex items-center gap-1">
                <MapPin size={14} />
                Endereço Completo *
              </label>
              <Input
                placeholder="Rua, Número, Bairro"
                value={unitForm.address}
                onChange={(e) => setUnitForm({ ...unitForm, address: e.target.value })}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold">CEP *</label>
              <Input
                placeholder="00000-000"
                value={unitForm.cep}
                onChange={(e) => setUnitForm({ ...unitForm, cep: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1.5 col-span-2">
                <label className="text-xs font-bold">Cidade *</label>
                <Input
                  placeholder="Cidade"
                  value={unitForm.city}
                  onChange={(e) => setUnitForm({ ...unitForm, city: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold">UF *</label>
                <Input
                  placeholder="UF"
                  maxLength={2}
                  value={unitForm.state}
                  onChange={(e) => setUnitForm({ ...unitForm, state: e.target.value.toUpperCase() })}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-bold flex items-center gap-1">
                <Clock size={14} />
                Horário de Funcionamento *
              </label>
              <Input
                placeholder="Ex: 07:00 - 17:00"
                value={unitForm.operatingHours}
                onChange={(e) => setUnitForm({ ...unitForm, operatingHours: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-border pt-4 mt-6">
            <Button type="button" variant="outline" onClick={() => setIsUnitOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Salvando...' : 'Salvar Posto'}</Button>
          </div>
        </form>
      </Dialog>

      {/* ==================== DIALOG: REGISTER DOCTOR ==================== */}
      <Dialog isOpen={isDoctorOpen} onClose={() => setIsDoctorOpen(false)} title="Cadastrar Novo Médico">
        <form onSubmit={handleDoctorSubmit} className="space-y-4">
          {error && (
            <div className="bg-destructive/15 text-destructive border border-destructive/20 p-3 rounded-lg text-xs font-semibold">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-bold">Nome do Profissional *</label>
              <Input
                placeholder="Nome completo do médico"
                value={doctorForm.name}
                onChange={(e) => setDoctorForm({ ...doctorForm, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold flex items-center gap-1">
                <Mail size={14} />
                E-mail Corporativo *
              </label>
              <Input
                type="email"
                placeholder="medico@municipio.gov.br"
                value={doctorForm.email}
                onChange={(e) => setDoctorForm({ ...doctorForm, email: e.target.value })}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold flex items-center gap-1">
                <Key size={14} />
                Senha de Acesso *
              </label>
              <Input
                type="password"
                placeholder="Senha inicial"
                value={doctorForm.password}
                onChange={(e) => setDoctorForm({ ...doctorForm, password: e.target.value })}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold flex items-center gap-1">
                <CreditCard size={14} />
                CRM (Número/UF) *
              </label>
              <Input
                placeholder="Ex: 12345/PE"
                value={doctorForm.crm}
                onChange={(e) => setDoctorForm({ ...doctorForm, crm: e.target.value })}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold flex items-center gap-1">
                <Phone size={14} />
                Telefone de Contato
              </label>
              <Input
                placeholder="Ex: (81) 99876-5432"
                value={doctorForm.phone}
                onChange={(e) => setDoctorForm({ ...doctorForm, phone: e.target.value })}
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-bold">Unidade de Saúde Primária *</label>
              <Select
                value={doctorForm.healthUnitId}
                onChange={(e) => setDoctorForm({ ...doctorForm, healthUnitId: e.target.value })}
                options={healthUnits.map(hu => ({ value: hu.id, label: hu.name }))}
                placeholder="Selecione a unidade"
                required
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-bold">Especialidades Médicas (Selecione pelo menos uma) *</label>
              <div className="grid grid-cols-2 gap-2 p-3 border border-border rounded-lg bg-muted/10 max-h-36 overflow-y-auto">
                {specialties.map(spec => {
                  const isChecked = doctorForm.selectedSpecialties.includes(spec.id);
                  return (
                    <label key={spec.id} className="flex items-center gap-2 text-xs font-semibold cursor-pointer py-1">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleSpecialty(spec.id)}
                        className="cursor-pointer"
                      />
                      {spec.name}
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-border pt-4 mt-6">
            <Button type="button" variant="outline" onClick={() => setIsDoctorOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading || doctorForm.selectedSpecialties.length === 0}>
              {loading ? 'Salvando...' : 'Salvar Médico'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* ==================== DIALOG: REGISTER RECEPTIONIST ==================== */}
      <Dialog isOpen={isReceptionistOpen} onClose={() => setIsReceptionistOpen(false)} title="Cadastrar Novo Recepcionista">
        <form onSubmit={handleReceptionistSubmit} className="space-y-4">
          {error && (
            <div className="bg-destructive/15 text-destructive border border-destructive/20 p-3 rounded-lg text-xs font-semibold">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold">Nome do Recepcionista *</label>
              <Input
                placeholder="Nome completo do recepcionista"
                value={receptionistForm.name}
                onChange={(e) => setReceptionistForm({ ...receptionistForm, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold flex items-center gap-1">
                <Mail size={14} />
                E-mail Corporativo *
              </label>
              <Input
                type="email"
                placeholder="recepcao@municipio.gov.br"
                value={receptionistForm.email}
                onChange={(e) => setReceptionistForm({ ...receptionistForm, email: e.target.value })}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold flex items-center gap-1">
                <Key size={14} />
                Senha de Acesso *
              </label>
              <Input
                type="password"
                placeholder="Senha de acesso inicial"
                value={receptionistForm.password}
                onChange={(e) => setReceptionistForm({ ...receptionistForm, password: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-border pt-4 mt-6">
            <Button type="button" variant="outline" onClick={() => setIsReceptionistOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Salvando...' : 'Salvar Recepcionista'}</Button>
          </div>
        </form>
      </Dialog>

      {/* ==================== DIALOG: MANAGE DOCTOR SCHEDULES ==================== */}
      <Dialog
        isOpen={isScheduleManagerOpen}
        onClose={() => setIsScheduleManagerOpen(false)}
        title={`Gerenciar Agenda Médica: ${selectedDoctorForSchedule?.name}`}
      >
        <div className="space-y-6 max-h-[80vh] overflow-y-auto pr-1">
          {error && (
            <div className="bg-destructive/15 text-destructive border border-destructive/20 p-3 rounded-lg text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Form to Add Schedule */}
          <form onSubmit={handleAddScheduleSubmit} className="space-y-4 border border-border p-4 rounded-xl bg-muted/10">
            <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wide">
              <Plus size={14} className="text-primary" /> Adicionar Horário de Trabalho
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">Unidade de Saúde *</label>
                <Select
                  value={scheduleForm.healthUnitId}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, healthUnitId: e.target.value })}
                  options={healthUnits.map(hu => ({ value: hu.id, label: hu.name }))}
                  placeholder="Selecione a unidade"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">Dia da Semana *</label>
                <Select
                  value={String(scheduleForm.dayOfWeek)}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, dayOfWeek: Number(e.target.value) })}
                  options={[
                    { value: '1', label: 'Segunda-feira' },
                    { value: '2', label: 'Terça-feira' },
                    { value: '3', label: 'Quarta-feira' },
                    { value: '4', label: 'Quinta-feira' },
                    { value: '5', label: 'Sexta-feira' },
                    { value: '6', label: 'Sábado' },
                    { value: '0', label: 'Domingo' },
                  ]}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">Duração Consulta *</label>
                <Select
                  value={String(scheduleForm.slotDurationMinutes)}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, slotDurationMinutes: Number(e.target.value) })}
                  options={[
                    { value: '10', label: '10 minutos' },
                    { value: '15', label: '15 minutos' },
                    { value: '20', label: '20 minutos' },
                    { value: '30', label: '30 minutos' },
                    { value: '40', label: '40 minutos' },
                    { value: '60', label: '60 minutos' },
                  ]}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">Início do Expediente *</label>
                <Input
                  type="time"
                  value={scheduleForm.startTime}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, startTime: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">Fim do Expediente *</label>
                <Input
                  type="time"
                  value={scheduleForm.endTime}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, endTime: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">Início do Intervalo</label>
                <Input
                  type="time"
                  value={scheduleForm.breakStartTime || ''}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, breakStartTime: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">Fim do Intervalo</label>
                <Input
                  type="time"
                  value={scheduleForm.breakEndTime || ''}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, breakEndTime: e.target.value })}
                />
              </div>
            </div>

            <Button type="submit" disabled={loading} size="sm" className="w-full flex items-center justify-center gap-1 mt-2">
              {loading ? 'Salvando...' : 'Adicionar Horário'}
            </Button>
          </form>

          {/* List of current working hours templates */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wide">Horários Configurados</h3>
            
            {loadingSchedules ? (
              <p className="text-xs text-muted-foreground text-center py-6">Carregando horários de trabalho...</p>
            ) : doctorSchedulesList.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6 border border-dashed border-border rounded-xl">
                Nenhum horário de expediente configurado para este médico.
              </p>
            ) : (
              <div className="space-y-2">
                {doctorSchedulesList.map(sch => {
                  const days = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
                  return (
                    <div key={sch.id} className="flex items-center justify-between p-3 rounded-xl border border-border bg-card shadow-sm text-xs">
                      <div className="space-y-1">
                        <span className="font-bold text-foreground flex items-center gap-1.5">
                          <Clock size={14} className="text-primary" />
                          {days[sch.dayOfWeek]}
                        </span>
                        <div className="text-[10px] text-muted-foreground font-semibold">
                          <span>{sch.startTime} - {sch.endTime}</span>
                          <span className="mx-1.5">•</span>
                          <span>Unidade: {sch.healthUnitName}</span>
                          <span className="mx-1.5">•</span>
                          <span>Duração: {sch.slotDurationMinutes} min</span>
                          {sch.breakStartTime && sch.breakEndTime && (
                            <>
                              <span className="mx-1.5">•</span>
                              <span className="text-warning">Intervalo: {sch.breakStartTime} - {sch.breakEndTime}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteSchedule(sch.id)}
                        className="text-destructive hover:bg-destructive/10 p-2 rounded-full cursor-pointer transition-colors"
                        title="Remover Horário"
                      >
                        <Trash size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </Dialog>

    </div>
  );
}
