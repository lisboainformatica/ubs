'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { recordConsultationAction } from '@/actions/medical-record.actions';
import {
  Clock,
  HeartPulse,
  Scale,
  Thermometer,
  Activity,
  Plus,
  Trash,
  CheckCircle,
  FileHeart,
  ChevronLeft,
  Printer,
} from 'lucide-react';
import { jsPDF } from 'jspdf';

interface Patient {
  id: string;
  name: string;
  cpf: string;
  cns: string;
  birthDate: string;
  allergies: string;
  chronicDiseases: string;
}

interface Appointment {
  id: string;
  dateTime: string;
  status: string;
  patient: Patient;
  specialty: { name: string };
}

interface MedicineItem {
  id: string;
  name: string;
  activeIngredient: string;
  unit: string;
}

const COMMON_EXAMS = [
  'Hemograma Completo',
  'Glicemia em Jejum',
  'Urina Rotina (EAS)',
  'Creatinina e Ureia',
  'Raio-X de Tórax (PA)',
  'Eletrocardiograma (ECG)',
  'Lipidograma Completo',
  'Fezes (EPF)',
];

export default function AtendimentoClient({
  initialAppointments,
  medicines,
  doctorName = 'Médico',
  doctorCrm = '',
  municipalityName = 'Município',
}: {
  initialAppointments: Appointment[];
  medicines: MedicineItem[];
  doctorName?: string;
  doctorCrm?: string;
  municipalityName?: string;
}) {
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments);
  const [activeAppt, setActiveAppt] = useState<Appointment | null>(null);

  // Clinical Consultation Forms
  const [anamnese, setAnamnese] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [cidCode, setCidCode] = useState('');

  // Vital Signs
  const [bloodPressure, setBloodPressure] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [temp, setTemp] = useState('');
  const [saturation, setSaturation] = useState('');
  const [heartRate, setHeartRate] = useState('');
  const [observations, setObservations] = useState('');

  // Prescriptions Items State
  const [prescriptionItems, setPrescriptionItems] = useState<any[]>([]);
  const [currentMed, setCurrentMed] = useState('');
  const [medQty, setMedQty] = useState(1);
  const [medDosage, setMedDosage] = useState('');
  const [medFrequency, setMedFrequency] = useState('');
  const [medDuration, setMedDuration] = useState(1);
  const [medInstructions, setMedInstructions] = useState('');

  // Exam Requests Checkboxes
  const [selectedExams, setSelectedExams] = useState<string[]>([]);
  const [customExam, setCustomExam] = useState('');

  // Action states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const calculateAge = (dateStr: string) => {
    const birth = new Date(dateStr);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const handleStartConsultation = (appt: Appointment) => {
    setActiveAppt(appt);
    setAnamnese('');
    setDiagnosis('');
    setCidCode('');
    setBloodPressure('');
    setWeight('');
    setHeight('');
    setTemp('');
    setSaturation('');
    setHeartRate('');
    setObservations('');
    setPrescriptionItems([]);
    setSelectedExams([]);
    setCustomExam('');
    setError('');
  };

  // Add medicine to prescription list
  const handleAddMedicine = () => {
    if (!currentMed || !medDosage || !medFrequency || medQty <= 0 || medDuration <= 0) {
      alert('Preencha os campos do medicamento corretamente.');
      return;
    }

    const medObj = medicines.find(m => m.id === currentMed);
    if (!medObj) return;

    setPrescriptionItems([
      ...prescriptionItems,
      {
        medicineId: currentMed,
        medicineName: medObj.name,
        quantity: Number(medQty),
        dosage: medDosage,
        frequency: medFrequency,
        durationDays: Number(medDuration),
        instructions: medInstructions,
      },
    ]);

    // Reset current entry fields
    setCurrentMed('');
    setMedQty(1);
    setMedDosage('');
    setMedFrequency('');
    setMedDuration(1);
    setMedInstructions('');
  };

  // Remove medicine from prescription list
  const handleRemoveMedicine = (index: number) => {
    setPrescriptionItems(prescriptionItems.filter((_, i) => i !== index));
  };

  // Generate a draft prescription PDF during consultation
  const generateDraftPrescriptionPDF = () => {
    if (!activeAppt) return;
    if (prescriptionItems.length === 0) {
      alert('Adicione pelo menos um medicamento para gerar a receita.');
      return;
    }

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 20;

    // Border/Frame
    doc.setDrawColor(203, 213, 225); // slate-300
    doc.setLineWidth(0.5);
    doc.rect(margin - 5, margin - 5, pageWidth - 2 * margin + 10, pageHeight - 2 * margin + 10);

    // Header Title
    doc.setTextColor(15, 23, 42); // slate-900
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(municipalityName.toUpperCase(), pageWidth / 2, margin + 10, { align: 'center' });
    
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(`Receita emitida em: ${new Date().toLocaleDateString('pt-BR')}`, pageWidth / 2, margin + 16, { align: 'center' });

    doc.setDrawColor(148, 163, 184); // slate-400
    doc.setLineWidth(0.8);
    doc.line(margin, margin + 22, pageWidth - margin, margin + 22);

    // Document Type Title
    doc.setTextColor(15, 23, 42);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('RECEITUÁRIO MÉDICO', pageWidth / 2, margin + 34, { align: 'center' });

    // Patient Information Card
    doc.setFillColor(248, 250, 252); // slate-50
    doc.rect(margin, margin + 42, pageWidth - 2 * margin, 24, 'F');
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.rect(margin, margin + 42, pageWidth - 2 * margin, 24, 'S');

    doc.setTextColor(15, 23, 42);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('PACIENTE:', margin + 5, margin + 48);
    doc.setFont('Helvetica', 'normal');
    doc.text(activeAppt.patient.name, margin + 28, margin + 48);

    doc.setFont('Helvetica', 'bold');
    doc.text('CPF:', margin + 5, margin + 54);
    doc.setFont('Helvetica', 'normal');
    doc.text(activeAppt.patient.cpf, margin + 18, margin + 54);

    doc.setFont('Helvetica', 'bold');
    doc.text('NASCIMENTO:', margin + 100, margin + 54);
    doc.setFont('Helvetica', 'normal');
    const dob = new Date(activeAppt.patient.birthDate).toLocaleDateString('pt-BR');
    doc.text(dob, margin + 130, margin + 54);

    doc.setFont('Helvetica', 'bold');
    doc.text('CNS:', margin + 5, margin + 60);
    doc.setFont('Helvetica', 'normal');
    doc.text(activeAppt.patient.cns || 'Não informado', margin + 18, margin + 60);

    // Prescriptions list
    let currentY = margin + 78;
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('USO INTERNO / PRESCRIÇÃO:', margin, currentY);

    doc.setFontSize(10);
    prescriptionItems.forEach((item, index) => {
      currentY += 8;
      
      // Draw item title
      doc.setFont('Helvetica', 'bold');
      doc.text(`${index + 1}. ${item.medicineName}`, margin + 2, currentY);
      
      // Quantity align right
      doc.text(`Qtd: ${item.quantity}`, pageWidth - margin - 5, currentY, { align: 'right' });

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

    // Signatures and stamps area at bottom
    const signatureY = pageHeight - margin - 40;

    doc.setDrawColor(148, 163, 184); // slate-400
    doc.setLineWidth(0.5);
    doc.line(pageWidth / 2 - 40, signatureY, pageWidth / 2 + 40, signatureY);

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(doctorName, pageWidth / 2, signatureY + 5, { align: 'center' });
    
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(doctorCrm ? `CRM: ${doctorCrm}` : 'Assinatura Médica', pageWidth / 2, signatureY + 9, { align: 'center' });

    // Print & Open window
    doc.autoPrint();
    window.open(doc.output('bloburl'), '_blank');
  };

  // Handle Exam selection
  const handleToggleExam = (exam: string) => {
    if (selectedExams.includes(exam)) {
      setSelectedExams(selectedExams.filter(e => e !== exam));
    } else {
      setSelectedExams([...selectedExams, exam]);
    }
  };

  // Finalize Clinical Consultation submit
  const handleFinalize = async () => {
    if (!activeAppt) return;
    if (!anamnese) {
      setError('Por favor, registre a Anamnese do paciente.');
      return;
    }

    setLoading(true);
    setError('');

    const res = await recordConsultationAction({
      appointmentId: activeAppt.id,
      patientId: activeAppt.patient.id,
      anamnese,
      diagnosisHipotesis: diagnosis || undefined,
      cidCode: cidCode || undefined,
      bloodPressure: bloodPressure || undefined,
      weightKg: weight ? Number(weight) : undefined,
      heightCm: height ? Number(height) : undefined,
      temperatureC: temp ? Number(temp) : undefined,
      saturationPercent: saturation ? Number(saturation) : undefined,
      heartRateBpm: heartRate ? Number(heartRate) : undefined,
      observations: observations || undefined,
      prescriptionItems: prescriptionItems.map(item => ({
        medicineId: item.medicineId,
        quantity: item.quantity,
        dosage: item.dosage,
        frequency: item.frequency,
        durationDays: item.durationDays,
        instructions: item.instructions || undefined,
      })),
      examTypesRequested: selectedExams,
    });

    setLoading(false);

    if (res.success) {
      setActiveAppt(null);
      router.refresh();
      // Reload page appointments
      window.location.reload();
    } else {
      setError(res.error || 'Erro ao finalizar atendimento.');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Queue list view */}
      {!activeAppt && (
        <div className="space-y-4">
          <div>
            <h1 className="text-xl font-bold text-foreground">Fila de Atendimento</h1>
            <p className="text-xs text-muted-foreground">Grade de pacientes aguardando acolhimento ou consulta médica hoje.</p>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/20 text-muted-foreground font-bold">
                      <th className="px-6 py-3.5">Horário</th>
                      <th className="px-6 py-3.5">Paciente</th>
                      <th className="px-6 py-3.5">Idade</th>
                      <th className="px-6 py-3.5">Especialidade</th>
                      <th className="px-6 py-3.5">Status</th>
                      <th className="px-6 py-3.5 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {appointments.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-12 text-muted-foreground">
                          Nenhum paciente na fila para hoje.
                        </td>
                      </tr>
                    ) : (
                      appointments.map(appt => (
                        <tr key={appt.id} className="hover:bg-muted/10 transition-colors">
                          <td className="px-6 py-4 font-bold whitespace-nowrap text-foreground flex items-center gap-1.5">
                            <Clock size={14} className="text-slate-400" />
                            {new Date(appt.dateTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="px-6 py-4 font-bold text-foreground">
                            {appt.patient.name}
                            <span className="block font-medium text-[9px] text-muted-foreground mt-0.5">CPF: {appt.patient.cpf}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">{calculateAge(appt.patient.birthDate)} anos</td>
                          <td className="px-6 py-4 whitespace-nowrap">{appt.specialty.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge variant={appt.status === 'CONFIRMED' ? 'info' : 'default'}>
                              {appt.status === 'CONFIRMED' ? 'Presença Confirmada' : 'Agendado'}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <Button onClick={() => handleStartConsultation(appt)} size="sm" className="bg-blue-600 hover:bg-blue-500 h-8 px-3">
                              <HeartPulse size={14} className="mr-1.5" /> Iniciar Consulta
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
        </div>
      )}

      {/* 2. Active Consultation Workspace card */}
      {activeAppt && (
        <div className="space-y-6">
          
          {/* Workspace header */}
          <div className="flex items-center gap-3">
            <Button onClick={() => setActiveAppt(null)} variant="outline" size="sm" className="h-8">
              <ChevronLeft size={16} /> Fila
            </Button>
            <div>
              <span className="text-xs font-semibold text-primary uppercase">Atendimento em Andamento</span>
              <h1 className="text-lg font-bold text-foreground leading-tight">Consulta Médica - {activeAppt.patient.name}</h1>
            </div>
          </div>

          {/* Quick patient info bar */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-muted/40 p-4 rounded-xl text-xs font-semibold border border-border">
            <div>
              <span className="block text-[10px] text-muted-foreground uppercase">Paciente</span>
              <span className="text-foreground font-bold">{activeAppt.patient.name}</span>
            </div>
            <div>
              <span className="block text-[10px] text-muted-foreground uppercase">Idade / SUS</span>
              <span className="text-foreground">{calculateAge(activeAppt.patient.birthDate)} anos • {activeAppt.patient.cns || 'SUS não cadastrado'}</span>
            </div>
            <div>
              <span className="block text-[10px] text-muted-foreground uppercase text-destructive font-bold">Alergias</span>
              <span className="text-destructive truncate block font-bold" title={activeAppt.patient.allergies}>{activeAppt.patient.allergies || 'Nenhuma alergia relatada'}</span>
            </div>
            <div>
              <span className="block text-[10px] text-muted-foreground uppercase">Doenças Crônicas</span>
              <span className="text-foreground truncate block" title={activeAppt.patient.chronicDiseases}>{activeAppt.patient.chronicDiseases || 'Nenhuma doença relatada'}</span>
            </div>
          </div>

          {error && <div className="p-3 bg-destructive/15 text-destructive rounded-lg text-xs font-bold">{error}</div>}

          {/* Clinical layout panels */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left panel: Clinical forms */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Record Consultation fields */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                    <FileHeart size={18} className="text-primary" />
                    Avaliação Clínica & Anamnese
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">Anamnese / Queixa Principal *</label>
                    <textarea
                      placeholder="Registrar anamnese, sintomas descritos pelo paciente e histórico clínico inicial..."
                      value={anamnese}
                      onChange={(e) => setAnamnese(e.target.value)}
                      className="w-full min-h-[120px] rounded-lg border border-input bg-card p-3 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-foreground">Hipótese Diagnóstica</label>
                      <Input placeholder="Ex: Pneumonia Viral" value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-foreground">Código CID-10</label>
                      <Input placeholder="Ex: J18" value={cidCode} onChange={(e) => setCidCode(e.target.value)} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Vitals Signs fields */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                    <Activity size={18} className="text-primary" />
                    Sinais Vitais
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-0.5">
                      P. Arterial
                    </label>
                    <Input placeholder="120/80" value={bloodPressure} onChange={(e) => setBloodPressure(e.target.value)} />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-0.5">
                      <Scale size={12} /> Peso (kg)
                    </label>
                    <Input placeholder="70" type="number" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Altura (cm)</label>
                    <Input placeholder="170" type="number" value={height} onChange={(e) => setHeight(e.target.value)} />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-0.5">
                      <Thermometer size={12} /> Temp (°C)
                    </label>
                    <Input placeholder="36.5" type="number" step="0.1" value={temp} onChange={(e) => setTemp(e.target.value)} />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Saturação (%)</label>
                    <Input placeholder="98" type="number" value={saturation} onChange={(e) => setSaturation(e.target.value)} />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">F. Cardíaca</label>
                    <Input placeholder="80" type="number" value={heartRate} onChange={(e) => setHeartRate(e.target.value)} />
                  </div>

                  <div className="space-y-1.5 col-span-2 sm:col-span-3 md:col-span-6">
                    <label className="text-xs font-bold text-foreground">Observações Médicas Complementares</label>
                    <textarea
                      placeholder="Registrar anotações adicionais..."
                      value={observations}
                      onChange={(e) => setObservations(e.target.value)}
                      className="w-full min-h-[60px] rounded-lg border border-input bg-card p-3 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </CardContent>
              </Card>

            </div>

            {/* Right panel: Prescriptions & Exams */}
            <div className="space-y-6">
              
              {/* Prescriptions item list */}
              <Card>
                <CardHeader className="border-b border-border">
                  <CardTitle className="text-sm font-bold">Receita de Medicamentos</CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  {/* Select medicine */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Medicamento</label>
                    <Select
                      value={currentMed}
                      onChange={(e) => setCurrentMed(e.target.value)}
                      options={medicines.map(m => ({ value: m.id, label: `${m.name} (${m.activeIngredient})` }))}
                      placeholder="Selecione o medicamento"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">Qtd Total</label>
                      <Input type="number" value={medQty} onChange={(e) => setMedQty(Number(e.target.value))} min={1} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">Duração (dias)</label>
                      <Input type="number" value={medDuration} onChange={(e) => setMedDuration(Number(e.target.value))} min={1} />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Dosagem (Ex: 500mg)</label>
                    <Input placeholder="500mg" value={medDosage} onChange={(e) => setMedDosage(e.target.value)} />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Frequência (Ex: 8/8h)</label>
                    <Input placeholder="De 8 em 8 horas" value={medFrequency} onChange={(e) => setMedFrequency(e.target.value)} />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Instruções Extras</label>
                    <Input placeholder="Tomar após as refeições" value={medInstructions} onChange={(e) => setMedInstructions(e.target.value)} />
                  </div>

                  <Button type="button" onClick={handleAddMedicine} variant="secondary" className="w-full flex items-center gap-1 text-xs">
                    <Plus size={15} /> Adicionar na Receita
                  </Button>

                  {/* List of added medicines */}
                  <div className="space-y-2 pt-2 border-t border-border">
                    <span className="block text-[10px] font-bold text-muted-foreground uppercase">Medicamentos Adicionados:</span>
                    {prescriptionItems.length === 0 ? (
                      <p className="text-[10px] text-muted-foreground text-center py-2">Nenhum item adicionado.</p>
                    ) : (
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {prescriptionItems.map((item, index) => (
                          <div key={index} className="flex items-center justify-between p-2 rounded-lg bg-muted text-[10px] border border-border">
                            <div className="flex flex-col truncate max-w-[150px]">
                              <span className="font-bold text-foreground truncate">{item.medicineName}</span>
                              <span className="text-muted-foreground truncate">{item.dosage} • {item.frequency}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveMedicine(index)}
                              className="text-destructive hover:bg-destructive/10 p-1.5 rounded-full cursor-pointer transition-colors"
                            >
                              <Trash size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {prescriptionItems.length > 0 && (
                    <Button
                      type="button"
                      onClick={generateDraftPrescriptionPDF}
                      variant="outline"
                      className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold border-primary/30 text-primary hover:bg-primary/5 mt-2 h-9"
                    >
                      <Printer size={14} /> Gerar Receita (PDF)
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* Exams list */}
              <Card>
                <CardHeader className="border-b border-border">
                  <CardTitle className="text-sm font-bold">Solicitar Exames</CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-2">
                  <div className="space-y-2 max-h-44 overflow-y-auto p-1 border-b border-border/50 pb-2">
                    {COMMON_EXAMS.map(exam => (
                      <label key={exam} className="flex items-center gap-2 text-xs font-semibold cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={selectedExams.includes(exam)}
                          onChange={() => handleToggleExam(exam)}
                          className="cursor-pointer"
                        />
                        {exam}
                      </label>
                    ))}
                  </div>

                  {/* Custom/Other exams */}
                  <div className="pt-2 space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase block">Exames Personalizados</label>
                    
                    {/* Render selected custom exams */}
                    {selectedExams.filter(exam => !COMMON_EXAMS.includes(exam)).length > 0 && (
                      <div className="space-y-1.5 mb-2 max-h-24 overflow-y-auto">
                        {selectedExams.filter(exam => !COMMON_EXAMS.includes(exam)).map(exam => (
                          <div key={exam} className="flex items-center justify-between p-1.5 px-2.5 rounded-lg bg-muted text-[10px] border border-border">
                            <span className="font-bold text-foreground truncate max-w-[170px]">{exam}</span>
                            <button
                              type="button"
                              onClick={() => handleToggleExam(exam)}
                              className="text-destructive hover:bg-destructive/10 p-1 rounded-full cursor-pointer transition-colors"
                            >
                              <Trash size={10} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Input
                        placeholder="Exame não listado..."
                        value={customExam}
                        onChange={(e) => setCustomExam(e.target.value)}
                        className="h-8 text-xs flex-1"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (customExam.trim()) {
                              if (!selectedExams.includes(customExam.trim())) {
                                setSelectedExams([...selectedExams, customExam.trim()]);
                              }
                              setCustomExam('');
                            }
                          }
                        }}
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          if (customExam.trim()) {
                            if (!selectedExams.includes(customExam.trim())) {
                              setSelectedExams([...selectedExams, customExam.trim()]);
                            }
                            setCustomExam('');
                          }
                        }}
                        className="h-8 px-2.5 text-xs flex items-center justify-center bg-secondary hover:bg-secondary/80 text-foreground border border-border"
                      >
                        <Plus size={14} />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

            </div>

          </div>

          {/* Bottom Action Footer Bar */}
          <div className="flex justify-between items-center bg-card border border-border p-4 rounded-xl shadow-md">
            <Button variant="outline" onClick={() => setActiveAppt(null)}>Suspender Atendimento</Button>
            <Button onClick={handleFinalize} disabled={loading} className="bg-emerald-600 hover:bg-emerald-500 shadow-md">
              <CheckCircle size={16} className="mr-2" />
              {loading ? 'Finalizando...' : 'Finalizar Atendimento'}
            </Button>
          </div>

        </div>
      )}

    </div>
  );
}
