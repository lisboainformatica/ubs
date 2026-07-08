'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  verifyPatientPublicAction,
  getMetadataPublicAction,
  getDoctorAvailabilitySlotsPublicAction,
  createPublicAppointmentAction,
} from '@/actions/appointment.actions';
import {
  CalendarDays,
  User,
  MapPin,
  Stethoscope,
  Clock,
  CheckCircle,
  FileText,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  ShieldCheck,
  Building,
} from 'lucide-react';

interface Municipality {
  id: string;
  name: string;
  slug: string;
}

interface AgendarClientProps {
  municipalities: Municipality[];
}

export default function AgendarClientComponent({ municipalities }: AgendarClientProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1: Auth fields
  const [selectedMunicipality, setSelectedMunicipality] = useState('');
  const [cpf, setCpf] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [patient, setPatient] = useState<{ id: string; name: string; cpf: string; cns: string } | null>(null);

  // Metadata loaded in Step 2
  const [healthUnits, setHealthUnits] = useState<any[]>([]);
  const [specialties, setSpecialties] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);

  // Selection states
  const [selectedUnit, setSelectedUnit] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [availableSlots, setAvailableSlots] = useState<{ time: string; available: boolean }[]>([]);
  const [selectedSlot, setSelectedSlot] = useState('');

  // Finished appointment
  const [createdAppointment, setCreatedAppointment] = useState<any>(null);

  // Mask CPF input helper
  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 11) val = val.substring(0, 11);
    
    // Format: 000.000.000-00
    if (val.length > 9) {
      val = `${val.substring(0, 3)}.${val.substring(3, 6)}.${val.substring(6, 9)}-${val.substring(9)}`;
    } else if (val.length > 6) {
      val = `${val.substring(0, 3)}.${val.substring(3, 6)}.${val.substring(6)}`;
    } else if (val.length > 3) {
      val = `${val.substring(0, 3)}.${val.substring(3)}`;
    }
    setCpf(val);
  };

  // 1. Verify Patient and load metadata
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMunicipality) {
      setError('Por favor, selecione seu município.');
      return;
    }
    if (!cpf || cpf.length < 14) {
      setError('Informe um CPF válido.');
      return;
    }
    if (!birthDate) {
      setError('Informe sua data de nascimento.');
      return;
    }

    setLoading(true);
    setError('');

    const res = await verifyPatientPublicAction({
      cpf,
      birthDate,
      municipalityId: selectedMunicipality,
    });

    if (res.success && res.patient) {
      setPatient(res.patient);
      
      // Load metadata for that municipality
      const meta = await getMetadataPublicAction(selectedMunicipality);
      if (meta.success) {
        setHealthUnits(meta.healthUnits || []);
        setSpecialties(meta.specialties || []);
        setDoctors(meta.doctors || []);
        setStep(2);
      } else {
        setError(meta.error || 'Erro ao carregar dados do município.');
      }
    } else {
      setError(res.error || 'Não encontramos seu cadastro. Verifique os dados ou procure sua UBS.');
    }
    setLoading(false);
  };

  // Filter doctors based on unit and specialty selectors
  const filteredDoctors = doctors.filter(doc => {
    const matchesUnit = selectedUnit ? doc.healthUnitId === selectedUnit : true;
    const matchesSpecialty = selectedSpecialty ? doc.specialtyIds.includes(selectedSpecialty) : true;
    return matchesUnit && matchesSpecialty;
  });

  // 2. Fetch doctor available slots when doctor/date alters
  useEffect(() => {
    async function loadSlots() {
      if (!selectedDoctor || !selectedDate || !selectedMunicipality) {
        setAvailableSlots([]);
        return;
      }
      setLoading(true);
      const res = await getDoctorAvailabilitySlotsPublicAction({
        doctorId: selectedDoctor,
        date: selectedDate,
        municipalityId: selectedMunicipality,
      });
      if (res.success) {
        setAvailableSlots(res.slots || []);
      } else {
        setAvailableSlots([]);
      }
      setLoading(false);
    }
    loadSlots();
  }, [selectedDoctor, selectedDate, selectedMunicipality]);

  // 3. Register public appointment
  const handleConfirmBooking = async () => {
    if (!patient || !selectedDoctor || !selectedUnit || !selectedSpecialty || !selectedDate || !selectedSlot) {
      setError('Preencha todos os campos para agendar.');
      return;
    }

    setLoading(true);
    setError('');

    // Combine date + time
    const combinedDateTime = new Date(`${selectedDate}T${selectedSlot}:00`);

    const res = await createPublicAppointmentAction({
      patientId: patient.id,
      doctorId: selectedDoctor,
      healthUnitId: selectedUnit,
      specialtyId: selectedSpecialty,
      dateTime: combinedDateTime,
      municipalityId: selectedMunicipality,
    });

    if (res.success && res.appointment) {
      setCreatedAppointment(res.appointment);
      setStep(4);
    } else {
      setError(res.error || 'Erro ao realizar agendamento.');
    }
    setLoading(false);
  };

  const getDoctorName = (id: string) => {
    return doctors.find(d => d.id === id)?.name || 'Médico';
  };

  const getUnitName = (id: string) => {
    return healthUnits.find(u => u.id === id)?.name || 'UBS';
  };

  const getSpecialtyName = (id: string) => {
    return specialties.find(s => s.id === id)?.name || 'Especialidade';
  };

  // Format date helper: "YYYY-MM-DD" -> "DD/MM/YYYY"
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };

  // Min date helper for picker (Today)
  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-950 text-slate-100 antialiased relative overflow-hidden select-none">
      {/* Decorative Gradients */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-emerald-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-25%] right-[-25%] w-[60%] h-[60%] rounded-full bg-cyan-500/10 blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md px-6 py-4 relative z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/25">
              <CalendarDays className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="font-extrabold text-lg bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                PSF Digital
              </span>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                Portal do Cidadão
              </p>
            </div>
          </div>
          <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-950/20 px-3 py-1 font-semibold flex items-center gap-1.5">
            <ShieldCheck size={14} />
            Agendamento Seguro
          </Badge>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-xl w-full mx-auto p-4 md:py-12 relative z-10 flex flex-col justify-center">
        {/* Step Indicator */}
        {step < 4 && (
          <div className="flex items-center justify-between mb-6 px-1 text-xs font-semibold text-slate-400">
            <span className={step >= 1 ? 'text-emerald-400 font-bold' : ''}>1. Identificação</span>
            <ChevronRight size={14} className="text-slate-700" />
            <span className={step >= 2 ? 'text-emerald-400 font-bold' : ''}>2. Profissional</span>
            <ChevronRight size={14} className="text-slate-700" />
            <span className={step >= 3 ? 'text-emerald-400 font-bold' : ''}>3. Horário</span>
          </div>
        )}

        {/* Errors Container */}
        {error && (
          <div className="mb-4 p-4 rounded-xl border border-red-500/20 bg-red-950/30 text-red-200 text-sm flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        {/* STEP 1: Identification */}
        {step === 1 && (
          <Card className="bg-slate-900/60 border-slate-800 backdrop-blur-md shadow-2xl">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                Agendamento de Consultas
              </CardTitle>
              <CardDescription className="text-slate-400">
                Identifique-se informando seu município e dados pessoais cadastrados no SUS
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleVerify} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1.5 uppercase tracking-wide">
                    Município
                  </label>
                  <Select
                    value={selectedMunicipality}
                    onChange={(e) => setSelectedMunicipality(e.target.value)}
                    placeholder="Selecione o Município..."
                    options={municipalities.map(m => ({ value: m.id, label: m.name }))}
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1.5 uppercase tracking-wide">
                    CPF
                  </label>
                  <Input
                    placeholder="000.000.000-00"
                    value={cpf}
                    onChange={handleCpfChange}
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1.5 uppercase tracking-wide">
                    Data de Nascimento
                  </label>
                  <Input
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    required
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold h-12 rounded-xl transition-all shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 cursor-pointer mt-4"
                >
                  {loading ? 'Verificando...' : 'Avançar'}
                  <ArrowRight size={18} />
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* STEP 2: Doctor and Specialty Selection */}
        {step === 2 && (
          <Card className="bg-slate-900/60 border-slate-800 backdrop-blur-md shadow-2xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-bold text-emerald-400">
                    Escolha o Profissional
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Selecione a clínica, especialidade e o médico disponível
                  </CardDescription>
                </div>
                <Badge variant="outline" className="border-slate-800 text-slate-300 bg-slate-950/40">
                  Olá, {patient?.name.split(' ')[0]}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5 uppercase tracking-wide">
                  Posto de Saúde (UBS)
                </label>
                <Select
                  value={selectedUnit}
                  onChange={(e) => {
                    setSelectedUnit(e.target.value);
                    setSelectedDoctor('');
                  }}
                  placeholder="Selecione a Unidade de Saúde..."
                  options={healthUnits.map(unit => ({ value: unit.id, label: unit.name }))}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5 uppercase tracking-wide">
                  Especialidade Médica
                </label>
                <Select
                  value={selectedSpecialty}
                  onChange={(e) => {
                    setSelectedSpecialty(e.target.value);
                    setSelectedDoctor('');
                  }}
                  placeholder="Selecione a Especialidade..."
                  options={specialties.map(spec => ({ value: spec.id, label: spec.name }))}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5 uppercase tracking-wide">
                  Médico
                </label>
                <Select
                  value={selectedDoctor}
                  onChange={(e) => setSelectedDoctor(e.target.value)}
                  disabled={!selectedUnit && !selectedSpecialty}
                  placeholder="Selecione o Médico..."
                  options={filteredDoctors.map(doc => ({ value: doc.id, label: `${doc.name} (CRM: ${doc.crm})` }))}
                />
              </div>

              <div className="flex gap-3 mt-6">
                <Button
                  onClick={() => setStep(1)}
                  variant="outline"
                  className="flex-1 h-12 rounded-xl border-slate-800 text-slate-300 hover:bg-slate-850 hover:text-white cursor-pointer"
                >
                  Voltar
                </Button>
                <Button
                  onClick={() => {
                    if (!selectedUnit || !selectedSpecialty || !selectedDoctor) {
                      setError('Selecione todos os filtros para prosseguir.');
                      return;
                    }
                    setError('');
                    setStep(3);
                  }}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold h-12 rounded-xl transition-all shadow-lg shadow-emerald-500/25 cursor-pointer"
                >
                  Avançar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 3: Select Date & Time Slot */}
        {step === 3 && (
          <Card className="bg-slate-900/60 border-slate-800 backdrop-blur-md shadow-2xl">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-emerald-400">
                Selecione Dia e Horário
              </CardTitle>
              <CardDescription className="text-slate-400">
                Escolha um dia e confira os horários livres na agenda do médico
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-800/80 mb-2">
                <div className="flex gap-2 items-center text-xs font-semibold text-emerald-400">
                  <User size={14} />
                  <span>Dr(a). {getDoctorName(selectedDoctor)}</span>
                </div>
                <div className="flex gap-2 items-center text-xs font-medium text-slate-400 mt-1">
                  <Building size={14} />
                  <span>{getUnitName(selectedUnit)} • {getSpecialtyName(selectedSpecialty)}</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5 uppercase tracking-wide">
                  Selecione a Data
                </label>
                <Input
                  type="date"
                  min={todayStr}
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setSelectedSlot('');
                  }}
                />
              </div>

              {selectedDate && (
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-2 uppercase tracking-wide">
                    Horários Disponíveis ({formatDate(selectedDate)})
                  </label>
                  {loading ? (
                    <div className="py-8 text-center text-xs text-slate-400">Consultando agenda...</div>
                  ) : availableSlots.length === 0 ? (
                    <div className="py-8 text-center text-xs text-red-400 border border-slate-850 rounded-xl bg-slate-950/20">
                      Médico sem atendimentos ou sem horários livres para esta data.
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 gap-2">
                      {availableSlots.map(slot => (
                        <button
                          key={slot.time}
                          type="button"
                          disabled={!slot.available}
                          onClick={() => setSelectedSlot(slot.time)}
                          className={`py-2 px-1 text-center text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                            selectedSlot === slot.time
                              ? 'bg-emerald-500 text-white border-emerald-400 shadow-md shadow-emerald-500/20'
                              : slot.available
                              ? 'border-slate-800 hover:border-emerald-500/50 hover:bg-emerald-950/10 text-slate-200 bg-slate-900/40'
                              : 'border-slate-950 text-slate-600 bg-slate-950/20 opacity-50 cursor-not-allowed'
                          }`}
                        >
                          {slot.time}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <Button
                  onClick={() => setStep(2)}
                  variant="outline"
                  className="flex-1 h-12 rounded-xl border-slate-800 text-slate-300 hover:bg-slate-850 hover:text-white cursor-pointer"
                >
                  Voltar
                </Button>
                <Button
                  onClick={handleConfirmBooking}
                  disabled={loading || !selectedSlot}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold h-12 rounded-xl transition-all shadow-lg shadow-emerald-500/25 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Confirmando...' : 'Confirmar Agendamento'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 4: Success Ticket Confirmation */}
        {step === 4 && createdAppointment && (
          <Card className="bg-slate-900/60 border-slate-800 backdrop-blur-md shadow-2xl overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-emerald-500 to-cyan-500" />
            <CardHeader className="text-center pt-8">
              <div className="w-16 h-16 rounded-full bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-10 h-10 text-emerald-400" />
              </div>
              <CardTitle className="text-2xl font-black text-emerald-400">
                Agendado com Sucesso!
              </CardTitle>
              <CardDescription className="text-slate-400 text-xs">
                Apresente este comprovante na recepção do Posto de Saúde
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pb-8">
              {/* Ticket details */}
              <div className="border border-dashed border-slate-800 rounded-xl p-5 bg-slate-950/50 space-y-4">
                <div>
                  <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wide">Paciente</span>
                  <p className="text-sm font-bold text-slate-200 mt-0.5">{patient?.name}</p>
                  <p className="text-xs text-slate-400">CPF: {patient?.cpf} • CNS: {patient?.cns || 'Não informado'}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-800/80">
                  <div>
                    <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wide">Especialidade</span>
                    <p className="text-xs font-bold text-slate-300 mt-0.5">{getSpecialtyName(selectedSpecialty)}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wide">Médico</span>
                    <p className="text-xs font-bold text-slate-300 mt-0.5">Dr(a). {getDoctorName(selectedDoctor)}</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/80">
                  <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wide">Unidade de Saúde</span>
                  <p className="text-xs font-bold text-slate-300 mt-0.5">{getUnitName(selectedUnit)}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-800/80">
                  <div>
                    <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wide">Data</span>
                    <p className="text-xs font-bold text-slate-300 mt-0.5 flex items-center gap-1">
                      <CalendarDays size={12} className="text-emerald-400" />
                      {formatDate(selectedDate)}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wide">Horário</span>
                    <p className="text-xs font-bold text-slate-300 mt-0.5 flex items-center gap-1">
                      <Clock size={12} className="text-emerald-400" />
                      {selectedSlot}
                    </p>
                  </div>
                </div>
              </div>

              {/* Instructions */}
              <div className="p-3 bg-slate-950/20 border border-slate-800 rounded-lg flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  <strong className="text-slate-300">Importante:</strong> Chegue com <strong className="text-slate-200">15 minutos de antecedência</strong> do horário agendado, munido do seu cartão nacional do SUS e documento oficial com foto.
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => {
                    // Reset page flow
                    setStep(1);
                    setSelectedUnit('');
                    setSelectedSpecialty('');
                    setSelectedDoctor('');
                    setSelectedDate('');
                    setSelectedSlot('');
                    setPatient(null);
                    setCpf('');
                    setBirthDate('');
                    setCreatedAppointment(null);
                  }}
                  variant="outline"
                  className="flex-1 h-12 rounded-xl border-slate-800 text-slate-300 hover:bg-slate-850 hover:text-white cursor-pointer font-bold"
                >
                  Novo Agendamento
                </Button>
                <Button
                  onClick={() => window.print()}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold h-12 rounded-xl transition-all shadow-lg shadow-emerald-500/25 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <FileText size={16} />
                  Imprimir Comprovante
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-slate-900 text-center text-xs text-slate-500 z-10 relative">
        <p>© 2026 PSF Digital. Governo Municipal & Secretaria de Saúde.</p>
        <p className="text-[10px] text-slate-600 mt-1 flex items-center justify-center gap-1">
          <ShieldCheck size={12} className="text-emerald-500/70" />
          Dados protegidos em conformidade com a LGPD (Lei 13.709/18)
        </p>
      </footer>
    </div>
  );
}
