'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Dialog } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { registerPatientAction, updatePatientAction, getPatientTimelineAction } from '@/actions/patient.actions';
import { Search, UserPlus, FileHeart, Edit, Calendar, Pill, Stethoscope, Printer, FileText } from 'lucide-react';
import { jsPDF } from 'jspdf';

interface Patient {
  id: string;
  name: string;
  cpf: string;
  cns: string;
  birthDate: string;
  gender: string;
  address: string;
  cep: string;
  city: string;
  state: string;
  phone: string;
  email: string;
  guardianName: string;
  guardianCpf: string;
  notes: string;
  allergies: string;
  chronicDiseases: string;
}

export default function PatientsClient({
  initialPatients,
  searchQuery,
}: {
  initialPatients: Patient[];
  searchQuery: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchQuery);
  const [patients, setPatients] = useState<Patient[]>(initialPatients);

  // Sync state with props when initialPatients updates
  React.useEffect(() => {
    setPatients(initialPatients);
  }, [initialPatients]);
  
  // Modals state
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  
  // Selected contexts
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [timelineData, setTimelineData] = useState<any[]>([]);
  const [loadingTimeline, setLoadingTimeline] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    cpf: '',
    cns: '',
    birthDate: '',
    gender: 'M',
    address: '',
    cep: '',
    city: '',
    state: '',
    phone: '',
    email: '',
    guardianName: '',
    guardianCpf: '',
    notes: '',
    allergies: '',
    chronicDiseases: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Handle Search Trigger
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (search) {
      params.set('q', search);
    } else {
      params.delete('q');
    }
    router.push(`/pacientes?${params.toString()}`);
  };

  // Open Register Dialog
  const handleOpenRegister = () => {
    setFormData({
      name: '',
      cpf: '',
      cns: '',
      birthDate: '',
      gender: 'M',
      address: '',
      cep: '',
      city: '',
      state: '',
      phone: '',
      email: '',
      guardianName: '',
      guardianCpf: '',
      notes: '',
      allergies: '',
      chronicDiseases: '',
    });
    setError('');
    setIsRegisterOpen(true);
  };

  // Submit Patient Registration
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.cpf || !formData.birthDate || !formData.gender || !formData.address) {
      setError('Por favor, preencha todos os campos obrigatórios (*).');
      return;
    }

    setLoading(true);
    setError('');

    const res = await registerPatientAction({
      ...formData,
      birthDate: new Date(formData.birthDate),
    });

    setLoading(false);

    if (res.success) {
      setIsRegisterOpen(false);
      window.location.reload();
    } else {
      setError(res.error || 'Erro ao cadastrar paciente.');
    }
  };

  // Open Edit Dialog
  const handleOpenEdit = (patient: Patient) => {
    setSelectedPatient(patient);
    setFormData({
      name: patient.name,
      cpf: patient.cpf,
      cns: patient.cns,
      birthDate: patient.birthDate.split('T')[0],
      gender: patient.gender,
      address: patient.address,
      cep: patient.cep,
      city: patient.city,
      state: patient.state,
      phone: patient.phone,
      email: patient.email,
      guardianName: patient.guardianName,
      guardianCpf: patient.guardianCpf,
      notes: patient.notes,
      allergies: patient.allergies,
      chronicDiseases: patient.chronicDiseases,
    });
    setError('');
    setIsEditOpen(true);
  };

  // Submit Patient Edit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;
    if (!formData.name || !formData.cpf || !formData.birthDate || !formData.gender || !formData.address) {
      setError('Por favor, preencha todos os campos obrigatórios (*).');
      return;
    }

    setLoading(true);
    setError('');

    const res = await updatePatientAction(selectedPatient.id, {
      ...formData,
      birthDate: new Date(formData.birthDate),
    });

    setLoading(false);

    if (res.success) {
      setIsEditOpen(false);
      window.location.reload();
    } else {
      setError(res.error || 'Erro ao editar paciente.');
    }
  };

  // Open Patient Timeline (Prontuário)
  const handleOpenTimeline = async (patient: Patient) => {
    setSelectedPatient(patient);
    setIsTimelineOpen(true);
    setLoadingTimeline(true);
    setTimelineData([]);

    const res = await getPatientTimelineAction(patient.id);
    setLoadingTimeline(false);

    if (res.success && res.timeline) {
      setTimelineData(res.timeline);
    } else {
      console.error(res.error || 'Erro ao buscar prontuário.');
    }
  };

  // Generate and download/print Patient Timeline PDF
  const generateTimelinePDF = (printMode: boolean = false) => {
    if (!selectedPatient) return;

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 20;
    let yPos = margin;

    // Elegant Border/Frame
    doc.setDrawColor(203, 213, 225); // slate-300
    doc.setLineWidth(0.5);
    doc.rect(margin - 5, margin - 5, pageWidth - 2 * margin + 10, pageHeight - 2 * margin + 10);

    // Document Title
    doc.setTextColor(15, 23, 42); // slate-900
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('PRONTUÁRIO DE SAÚDE INTEGRADO', pageWidth / 2, yPos + 5, { align: 'center' });
    yPos += 12;

    // Divider Line
    doc.setDrawColor(148, 163, 184); // slate-400
    doc.setLineWidth(0.5);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 8;

    // Patient info block
    doc.setFontSize(10);
    doc.setFont('Helvetica', 'bold');
    doc.text('DADOS IDENTIFICADORES DO PACIENTE', margin, yPos);
    yPos += 6;

    doc.setFont('Helvetica', 'normal');
    doc.text(`Nome: ${selectedPatient.name}`, margin, yPos);
    doc.text(`CPF: ${selectedPatient.cpf}`, margin + 100, yPos);
    yPos += 5;

    doc.text(`Cartão SUS: ${selectedPatient.cns || '-'}`, margin, yPos);
    const dob = new Date(selectedPatient.birthDate).toLocaleDateString('pt-BR');
    doc.text(`Nascimento: ${dob}`, margin + 100, yPos);
    yPos += 5;

    doc.text(`Alergias: ${selectedPatient.allergies || 'Nenhuma registrada'}`, margin, yPos);
    doc.text(`Doenças Crônicas: ${selectedPatient.chronicDiseases || 'Nenhuma registrada'}`, margin + 100, yPos);
    yPos += 8;

    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 8;

    // Attendances history
    doc.setFont('Helvetica', 'bold');
    doc.text('HISTÓRICO DE ATENDIMENTOS CLÍNICOS', margin, yPos);
    yPos += 8;

    if (timelineData.length === 0) {
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('Nenhum atendimento clínico registrado anteriormente.', margin, yPos);
    } else {
      timelineData.forEach((record, index) => {
        // Page break check
        if (yPos > pageHeight - 65) {
          doc.addPage();
          yPos = margin;
          // Redraw border on new page
          doc.setDrawColor(203, 213, 225);
          doc.rect(margin - 5, margin - 5, pageWidth - 2 * margin + 10, pageHeight - 2 * margin + 10);
        }

        doc.setFont('Helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        const dateStr = new Date(record.createdAt).toLocaleDateString('pt-BR');
        const timeStr = new Date(record.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        doc.text(`${index + 1}. Consulta de ${record.appointment.specialty.name} (${dateStr} às ${timeStr})`, margin, yPos);
        yPos += 5;

        doc.setFont('Helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(`Médico: ${record.doctor.user.name} | Unidade: ${record.appointment.healthUnit.name}`, margin + 5, yPos);
        yPos += 5;

        doc.setFont('Helvetica', 'normal');
        doc.setTextColor(15, 23, 42);
        doc.text('Anamnese / Queixa Principal:', margin + 5, yPos);
        yPos += 4;
        doc.setFont('Helvetica', 'normal');
        doc.setTextColor(51, 65, 85);
        const textLines = doc.splitTextToSize(record.anamnese, pageWidth - 2 * margin - 10);
        doc.text(textLines, margin + 5, yPos);
        yPos += (textLines.length * 4) + 2;

        // Vitals
        const vitals = [];
        if (record.bloodPressure) vitals.push(`P.A.: ${record.bloodPressure}`);
        if (record.weightKg) vitals.push(`Peso: ${record.weightKg} kg`);
        if (record.heightCm) vitals.push(`Altura: ${record.heightCm} cm`);
        if (record.temperatureC) vitals.push(`Temp: ${record.temperatureC} °C`);
        if (vitals.length > 0) {
          doc.setFont('Helvetica', 'bold');
          doc.setTextColor(15, 23, 42);
          doc.text(`Sinais Vitais: ${vitals.join(' | ')}`, margin + 5, yPos);
          yPos += 5;
        }

        // Diagnosis
        if (record.diagnosisHipotesis) {
          doc.setFont('Helvetica', 'bold');
          doc.setTextColor(15, 23, 42);
          const cidInfo = record.cidCode ? ` (CID: ${record.cidCode})` : '';
          doc.text(`Hipótese Diagnóstica: ${record.diagnosisHipotesis}${cidInfo}`, margin + 5, yPos);
          yPos += 5;
        }

        // Prescribed Medicines
        if (record.prescription && record.prescription.items.length > 0) {
          doc.setFont('Helvetica', 'bold');
          doc.text('Medicamentos Prescritos:', margin + 5, yPos);
          yPos += 4;
          doc.setFont('Helvetica', 'normal');
          record.prescription.items.forEach((item: any) => {
            doc.text(`- ${item.medicine.name} (${item.quantity} ${item.medicine.unit.toLowerCase()}(s)) - ${item.dosage} / ${item.frequency}`, margin + 8, yPos);
            yPos += 4;
          });
          yPos += 2;
        }

        // Exam Requests
        if (record.examRequests && record.examRequests.length > 0) {
          doc.setFont('Helvetica', 'bold');
          doc.text('Exames Solicitados:', margin + 5, yPos);
          yPos += 4;
          doc.setFont('Helvetica', 'normal');
          record.examRequests.forEach((req: any) => {
            const lab = req.laboratory ? ` (Lab: ${req.laboratory})` : '';
            doc.text(`- ${req.examType}${lab} - Status: ${req.status === 'PENDING' ? 'Pendente' : 'Finalizado'}`, margin + 8, yPos);
            yPos += 4;
          });
          yPos += 2;
        }

        yPos += 6; // space between records
      });
    }

    if (printMode) {
      doc.autoPrint();
      window.open(doc.output('bloburl'), '_blank');
    } else {
      doc.save(`prontuario_${selectedPatient.cpf}.pdf`);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Cadastro de Pacientes</h1>
          <p className="text-xs text-muted-foreground">Gerencie o registro e o histórico de prontuários dos pacientes municipais.</p>
        </div>
        <Button onClick={handleOpenRegister} className="flex items-center gap-2 self-start sm:self-auto">
          <UserPlus size={18} />
          Cadastrar Paciente
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <Input
                placeholder="Pesquisar por Nome, CPF ou Cartão SUS (CNS)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button type="submit" variant="secondary">Buscar</Button>
          </form>
        </CardContent>
      </Card>

      {/* Patients Table Grid */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/20 text-muted-foreground font-bold">
                  <th className="px-6 py-3.5">Nome</th>
                  <th className="px-6 py-3.5">CPF</th>
                  <th className="px-6 py-3.5">Cartão SUS (CNS)</th>
                  <th className="px-6 py-3.5">Nascimento</th>
                  <th className="px-6 py-3.5">Sexo</th>
                  <th className="px-6 py-3.5">Telefone</th>
                  <th className="px-6 py-3.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {patients.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-muted-foreground">
                      Nenhum paciente encontrado.
                    </td>
                  </tr>
                ) : (
                  patients.map(p => (
                    <tr key={p.id} className="hover:bg-muted/10 transition-colors">
                      <td className="px-6 py-4 font-bold text-foreground">{p.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{p.cpf}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{p.cns || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {new Date(p.birthDate).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant="secondary">{p.gender === 'M' ? 'Masculino' : p.gender === 'F' ? 'Feminino' : 'Outro'}</Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">{p.phone || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right space-x-2">
                        <Button onClick={() => handleOpenTimeline(p)} size="sm" variant="outline" className="h-8 px-2" title="Ver Prontuário">
                          <FileHeart size={15} className="mr-1 text-primary" />
                          Prontuário
                        </Button>
                        <Button onClick={() => handleOpenEdit(p)} size="sm" variant="outline" className="h-8 px-2" title="Editar">
                          <Edit size={15} />
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

      {/* dialog for Register */}
      <Dialog isOpen={isRegisterOpen} onClose={() => setIsRegisterOpen(false)} title="Cadastrar Novo Paciente">
        <form onSubmit={handleRegisterSubmit} className="space-y-4">
          {error && <div className="p-3 bg-destructive/15 text-destructive rounded-lg text-xs font-semibold">{error}</div>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-bold">Nome Completo *</label>
              <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold">CPF *</label>
              <Input placeholder="111.111.111-11" value={formData.cpf} onChange={(e) => setFormData({ ...formData, cpf: e.target.value })} required />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold">Cartão SUS (CNS)</label>
              <Input placeholder="123456789012345" value={formData.cns} onChange={(e) => setFormData({ ...formData, cns: e.target.value })} />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold">Data de Nascimento *</label>
              <Input type="date" value={formData.birthDate} onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })} required />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold">Gênero *</label>
              <Select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                options={[
                  { value: 'M', label: 'Masculino' },
                  { value: 'F', label: 'Feminino' },
                  { value: 'OTHER', label: 'Outro' },
                ]}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold">Telefone</label>
              <Input placeholder="(11) 99999-9999" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold">E-mail</label>
              <Input type="email" placeholder="paciente@exemplo.com" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-bold">Endereço Completo *</label>
              <Input placeholder="Rua, Número, Bairro" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} required />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold">CEP</label>
              <Input placeholder="12345-000" value={formData.cep} onChange={(e) => setFormData({ ...formData, cep: e.target.value })} />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold">Cidade</label>
              <Input value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold">Estado</label>
              <Input placeholder="SP" value={formData.state} onChange={(e) => setFormData({ ...formData, state: e.target.value })} />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold">Responsável Legal (Caso menor)</label>
              <Input value={formData.guardianName} onChange={(e) => setFormData({ ...formData, guardianName: e.target.value })} />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-bold">Alergias Conhecidas</label>
              <Input placeholder="Ex: Penicilina, Dipirona" value={formData.allergies} onChange={(e) => setFormData({ ...formData, allergies: e.target.value })} />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-bold">Doenças Crônicas</label>
              <Input placeholder="Ex: Hipertensão, Diabetes" value={formData.chronicDiseases} onChange={(e) => setFormData({ ...formData, chronicDiseases: e.target.value })} />
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-border pt-4 mt-6">
            <Button type="button" variant="outline" onClick={() => setIsRegisterOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Salvando...' : 'Salvar Cadastro'}</Button>
          </div>
        </form>
      </Dialog>

      {/* dialog for Edit */}
      <Dialog isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title={`Editar Paciente: ${selectedPatient?.name}`}>
        <form onSubmit={handleEditSubmit} className="space-y-4">
          {error && <div className="p-3 bg-destructive/15 text-destructive rounded-lg text-xs font-semibold">{error}</div>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-bold">Nome Completo *</label>
              <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold">CPF *</label>
              <Input value={formData.cpf} onChange={(e) => setFormData({ ...formData, cpf: e.target.value })} required />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold">Cartão SUS (CNS)</label>
              <Input value={formData.cns} onChange={(e) => setFormData({ ...formData, cns: e.target.value })} />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold">Data de Nascimento *</label>
              <Input type="date" value={formData.birthDate} onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })} required />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold">Gênero *</label>
              <Select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                options={[
                  { value: 'M', label: 'Masculino' },
                  { value: 'F', label: 'Feminino' },
                  { value: 'OTHER', label: 'Outro' },
                ]}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold">Telefone</label>
              <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold">E-mail</label>
              <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-bold">Endereço Completo *</label>
              <Input value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} required />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold">CEP</label>
              <Input value={formData.cep} onChange={(e) => setFormData({ ...formData, cep: e.target.value })} />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold">Cidade</label>
              <Input value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold">Estado</label>
              <Input value={formData.state} onChange={(e) => setFormData({ ...formData, state: e.target.value })} />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-bold">Alergias Conhecidas</label>
              <Input value={formData.allergies} onChange={(e) => setFormData({ ...formData, allergies: e.target.value })} />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-bold">Doenças Crônicas</label>
              <Input value={formData.chronicDiseases} onChange={(e) => setFormData({ ...formData, chronicDiseases: e.target.value })} />
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-border pt-4 mt-6">
            <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Salvando...' : 'Salvar Alterações'}</Button>
          </div>
        </form>
      </Dialog>

      {/* dialog for Timeline (Prontuário) */}
      <Dialog isOpen={isTimelineOpen} onClose={() => setIsTimelineOpen(false)} title={`Prontuário de Saúde: ${selectedPatient?.name}`}>
        <div className="space-y-4 py-2">
          {/* Actions toolbar */}
          {!loadingTimeline && timelineData.length > 0 && (
            <div className="flex justify-end gap-2 mb-2 border-b border-border pb-3">
              <Button onClick={() => generateTimelinePDF(true)} size="sm" variant="outline" className="h-8 gap-1.5 text-xs font-semibold">
                <Printer size={14} /> Imprimir Prontuário
              </Button>
              <Button onClick={() => generateTimelinePDF(false)} size="sm" variant="default" className="h-8 gap-1.5 text-xs font-semibold">
                <FileText size={14} /> Baixar PDF
              </Button>
            </div>
          )}

          {/* Patient Quick Metadata */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-muted/30 p-3 rounded-lg text-xs font-medium text-muted-foreground mb-4">
            <div>
              <span className="block font-bold text-[10px] uppercase text-slate-500">Nascimento</span>
              <span className="text-foreground">{selectedPatient ? new Date(selectedPatient.birthDate).toLocaleDateString('pt-BR') : ''}</span>
            </div>
            <div>
              <span className="block font-bold text-[10px] uppercase text-slate-500">Alergias</span>
              <span className="text-destructive font-semibold truncate block" title={selectedPatient?.allergies}>{selectedPatient?.allergies || 'Nenhuma registrada'}</span>
            </div>
            <div>
              <span className="block font-bold text-[10px] uppercase text-slate-500">Doenças Crônicas</span>
              <span className="text-foreground truncate block" title={selectedPatient?.chronicDiseases}>{selectedPatient?.chronicDiseases || 'Nenhuma registrada'}</span>
            </div>
            <div>
              <span className="block font-bold text-[10px] uppercase text-slate-500">Cartão SUS</span>
              <span className="text-foreground">{selectedPatient?.cns || '-'}</span>
            </div>
          </div>

          <div className="relative border-l border-border pl-6 space-y-6">
            {loadingTimeline && (
              <div className="text-center py-6 text-xs text-muted-foreground">
                Carregando histórico do prontuário...
              </div>
            )}

            {!loadingTimeline && timelineData.length === 0 && (
              <div className="text-center py-6 text-xs text-muted-foreground ml-[-20px]">
                Nenhum atendimento clínico registrado anteriormente.
              </div>
            )}

            {!loadingTimeline && timelineData.map(record => (
              <div key={record.id} className="relative">
                {/* Timeline node icon */}
                <span className="absolute -left-[35px] top-1 h-6 w-6 rounded-full bg-blue-500/10 border-2 border-blue-500 text-blue-500 flex items-center justify-center">
                  <Stethoscope size={12} />
                </span>

                <div className="space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span className="text-xs font-bold text-foreground">
                      Consulta Clínica • {record.appointment.specialty.name}
                    </span>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-semibold">
                      <Calendar size={12} />
                      {new Date(record.createdAt).toLocaleDateString('pt-BR')} {new Date(record.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <p className="text-[10px] text-muted-foreground leading-none">
                    Médico: <strong>{record.doctor.user.name}</strong> • Unidade: {record.appointment.healthUnit.name}
                  </p>

                  {/* Anamnese Card */}
                  <div className="bg-card border border-border rounded-lg p-3 text-xs space-y-2">
                    <div>
                      <span className="font-bold text-[10px] text-slate-500 uppercase block mb-1">Anamnese / Queixa Principal</span>
                      <p className="text-foreground">{record.anamnese}</p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 border-t border-border/50 pt-2 text-[10px]">
                      {record.bloodPressure && (
                        <div>
                          <span className="font-semibold text-muted-foreground">Pressão:</span> <span className="font-bold text-foreground">{record.bloodPressure}</span>
                        </div>
                      )}
                      {record.weightKg && (
                        <div>
                          <span className="font-semibold text-muted-foreground">Peso:</span> <span className="font-bold text-foreground">{record.weightKg} kg</span>
                        </div>
                      )}
                      {record.heightCm && (
                        <div>
                          <span className="font-semibold text-muted-foreground">Altura:</span> <span className="font-bold text-foreground">{record.heightCm} cm</span>
                        </div>
                      )}
                      {record.temperatureC && (
                        <div>
                          <span className="font-semibold text-muted-foreground">Temp:</span> <span className="font-bold text-foreground">{record.temperatureC} °C</span>
                        </div>
                      )}
                    </div>

                    {record.diagnosisHipotesis && (
                      <div className="border-t border-border/50 pt-2 flex items-center gap-2">
                        <span className="font-bold text-[10px] text-slate-500 uppercase">Hipótese Diagnóstica:</span>
                        <Badge variant="outline">{record.diagnosisHipotesis} {record.cidCode ? `(CID: ${record.cidCode})` : ''}</Badge>
                      </div>
                    )}
                  </div>

                  {/* Prescribed Medications */}
                  {record.prescription && record.prescription.items.length > 0 && (
                    <div className="bg-blue-500/5 border border-blue-500/10 rounded-lg p-3 text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[10px] text-blue-500 uppercase flex items-center gap-1">
                          <Pill size={12} />
                          Medicamentos Prescritos
                        </span>
                        <a
                          href={`/api/prescriptions/${record.prescription.id}/pdf`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline font-bold"
                        >
                          <Printer size={12} /> Imprimir Receita
                        </a>
                      </div>
                      <ul className="space-y-1 text-[11px] list-disc pl-4">
                        {record.prescription.items.map((item: any) => (
                          <li key={item.id}>
                            <strong>{item.medicine.name}</strong> - {item.quantity} {item.medicine.unit.toLowerCase()}(s) ({item.dosage} • {item.frequency} • {item.durationDays} dias)
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Exam Requests */}
                  {record.examRequests && record.examRequests.length > 0 && (
                    <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-lg p-3 text-xs space-y-1">
                      <span className="font-bold text-[10px] text-emerald-500 uppercase flex items-center gap-1">
                        <FileText size={12} />
                        Exames Solicitados
                      </span>
                      <ul className="space-y-0.5 text-[11px] list-disc pl-4">
                        {record.examRequests.map((req: any) => (
                          <li key={req.id}>
                            <strong>{req.examType}</strong> {req.laboratory ? `(Lab: ${req.laboratory})` : ''} - <span className="text-muted-foreground">{req.status === 'PENDING' ? 'Pendente' : 'Finalizado'}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                </div>
              </div>
            ))}
          </div>
        </div>
      </Dialog>

    </div>
  );
}
