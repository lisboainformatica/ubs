'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Dialog } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { registerMedicineAction, adjustStockAction } from '@/actions/stock.actions';
import {
  Search,
  Plus,
  ArrowUpDown,
  History,
  Pill,
  HeartHandshake,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

interface Medicine {
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

interface StockMovement {
  id: string;
  medicineName: string;
  type: string;
  quantity: number;
  reason: string;
  userName: string;
  createdAt: string;
}

interface PrescriptionItem {
  id: string;
  medicineId: string;
  medicineName: string;
  quantity: number;
  dosage: string;
  frequency: string;
  durationDays: number;
}

interface Prescription {
  id: string;
  patientName: string;
  patientCpf: string;
  doctorName: string;
  createdAt: string;
  items: PrescriptionItem[];
}

export default function FarmaciaClient({
  initialMedicines,
  initialMovements,
  initialPrescriptions,
}: {
  initialMedicines: Medicine[];
  initialMovements: StockMovement[];
  initialPrescriptions: Prescription[];
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'inventory' | 'dispense' | 'history'>('inventory');

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals state
  const [isNewMedOpen, setIsNewMedOpen] = useState(false);
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);

  // Focus Context
  const [selectedMed, setSelectedMed] = useState<Medicine | null>(null);

  // New Medicine Form State
  const [medForm, setMedForm] = useState({
    name: '',
    activeIngredient: '',
    code: '',
    category: '',
    unit: 'COMPRIMIDO',
    batch: '',
    expirationDate: '',
    manufacturer: '',
    initialStock: 0,
  });

  // Stock Adjust Form State
  const [adjustType, setAdjustType] = useState('ENTRY'); // ENTRY, EXIT, LOSS, EXPIRED
  const [adjustQty, setAdjustQty] = useState(1);
  const [adjustReason, setAdjustReason] = useState('');

  // Prescription Dispensation State
  const [prescSearch, setPrescSearch] = useState('');
  const [selectedPresc, setSelectedPresc] = useState<Prescription | null>(null);
  const [dispenseSuccess, setDispenseSuccess] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const filteredMedicines = initialMedicines.filter(m =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.activeIngredient.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.code.includes(searchQuery)
  );

  // Handle New Medicine Submit
  const handleNewMedSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!medForm.name || !medForm.activeIngredient) {
      setError('Por favor, preencha o nome e o princípio ativo.');
      return;
    }

    setLoading(true);
    setError('');

    const res = await registerMedicineAction({
      ...medForm,
      expirationDate: medForm.expirationDate ? new Date(medForm.expirationDate) : undefined,
      initialStock: Number(medForm.initialStock),
    });

    setLoading(false);

    if (res.success) {
      setIsNewMedOpen(false);
      router.refresh();
    } else {
      setError(res.error || 'Erro ao cadastrar medicamento.');
    }
  };

  // Open Adjust Modal
  const handleOpenAdjust = (med: Medicine) => {
    setSelectedMed(med);
    setAdjustType('ENTRY');
    setAdjustQty(1);
    setAdjustReason('');
    setError('');
    setIsAdjustOpen(true);
  };

  // Submit Stock Adjustment
  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMed || adjustQty <= 0 || !adjustReason) {
      setError('Preencha os campos corretamente.');
      return;
    }

    setLoading(true);
    setError('');

    const res = await adjustStockAction({
      medicineId: selectedMed.id,
      type: adjustType as any,
      quantity: Number(adjustQty),
      reason: adjustReason,
    });

    setLoading(false);

    if (res.success) {
      setIsAdjustOpen(false);
      router.refresh();
    } else {
      setError(res.error || 'Erro ao ajustar estoque.');
    }
  };

  // Search Patient Prescription for Dispensation
  const handleSearchPrescription = (e: React.FormEvent) => {
    e.preventDefault();
    setDispenseSuccess(false);
    if (!prescSearch) {
      setSelectedPresc(null);
      return;
    }
    // Search preloaded prescriptions (or do dynamic lookup)
    const found = initialPrescriptions.find(p => p.patientCpf.includes(prescSearch) || p.patientName.toLowerCase().includes(prescSearch.toLowerCase()));
    if (found) {
      setSelectedPresc(found);
    } else {
      setSelectedPresc(null);
      alert('Nenhuma receita pendente encontrada para este CPF/Paciente.');
    }
  };

  // Dispense medications
  const handleDispenseSubmit = async () => {
    if (!selectedPresc) return;

    setLoading(true);
    setError('');

    try {
      // Loop through items and deduct them from stock level
      for (const item of selectedPresc.items) {
        const res = await adjustStockAction({
          medicineId: item.medicineId,
          type: 'EXIT', // EXIT for dispensation delivery
          quantity: item.quantity,
          reason: `Dispensação de receita ID ${selectedPresc.id}`,
        });

        if (!res.success) {
          throw new Error(`Erro ao dispensar ${item.medicineName}: ${res.error}`);
        }
      }

      setDispenseSuccess(true);
      setSelectedPresc(null);
      setPrescSearch('');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Erro ao dispensar medicamentos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Farmácia Municipal</h1>
          <p className="text-xs text-muted-foreground">Controle de estoque, registro de dispensações e alertas de validade.</p>
        </div>
        <Button onClick={() => {
          setMedForm({
            name: '',
            activeIngredient: '',
            code: '',
            category: '',
            unit: 'COMPRIMIDO',
            batch: '',
            expirationDate: '',
            manufacturer: '',
            initialStock: 0,
          });
          setError('');
          setIsNewMedOpen(true);
        }} className="flex items-center gap-2 self-start sm:self-auto">
          <Plus size={18} />
          Cadastrar Medicamento
        </Button>
      </div>

      {/* Tabs headers */}
      <div className="flex border-b border-border text-sm font-semibold select-none gap-4">
        <button
          onClick={() => { setActiveTab('inventory'); setDispenseSuccess(false); }}
          className={`pb-2 border-b-2 px-1 cursor-pointer transition-all ${
            activeTab === 'inventory' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Estoque
        </button>
        <button
          onClick={() => { setActiveTab('dispense'); setDispenseSuccess(false); }}
          className={`pb-2 border-b-2 px-1 cursor-pointer transition-all ${
            activeTab === 'dispense' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Dispensação de Receitas
        </button>
        <button
          onClick={() => { setActiveTab('history'); setDispenseSuccess(false); }}
          className={`pb-2 border-b-2 px-1 cursor-pointer transition-all ${
            activeTab === 'history' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Histórico de Movimentações
        </button>
      </div>

      {/* Tab content 1: Inventory */}
      {activeTab === 'inventory' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <Card>
            <CardContent className="pt-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <Input
                  placeholder="Pesquisar por medicamento ou princípio ativo..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/20 text-muted-foreground font-bold">
                      <th className="px-6 py-3.5">Nome / Princípio Ativo</th>
                      <th className="px-6 py-3.5">Código</th>
                      <th className="px-6 py-3.5">Categoria</th>
                      <th className="px-6 py-3.5">Estoque</th>
                      <th className="px-6 py-3.5">Validade</th>
                      <th className="px-6 py-3.5 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredMedicines.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-10 text-muted-foreground">
                          Nenhum medicamento encontrado no estoque.
                        </td>
                      </tr>
                    ) : (
                      filteredMedicines.map(m => {
                        const isLowStock = m.stockLevel <= 100;
                        const isExpired = m.expirationDate && new Date(m.expirationDate) < new Date();
                        return (
                          <tr key={m.id} className="hover:bg-muted/10 transition-colors">
                            <td className="px-6 py-4 font-bold text-foreground">
                              {m.name}
                              <span className="block font-medium text-[9px] text-muted-foreground mt-0.5">{m.activeIngredient}</span>
                            </td>
                            <td className="px-6 py-4">{m.code || '-'}</td>
                            <td className="px-6 py-4 whitespace-nowrap">{m.category || '-'}</td>
                            <td className="px-6 py-4 whitespace-nowrap font-bold">
                              <span className={isLowStock ? 'text-destructive font-black' : 'text-foreground'}>
                                {m.stockLevel} {m.unit.toLowerCase()}(s)
                              </span>
                              {isLowStock && (
                                <Badge variant="destructive" className="ml-2 font-bold px-1.5 py-0">Crítico</Badge>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {m.expirationDate ? (
                                <span className={isExpired ? 'text-destructive font-bold' : 'text-foreground'}>
                                  {new Date(m.expirationDate).toLocaleDateString('pt-BR')}
                                  {isExpired && <Badge variant="destructive" className="ml-1 text-[8px] py-0 px-1">Vencido</Badge>}
                                </span>
                              ) : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <Button onClick={() => handleOpenAdjust(m)} size="sm" variant="outline" className="h-8 px-2">
                                <ArrowUpDown size={14} className="mr-1" /> Ajustar Estoque
                              </Button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab content 2: Dispensation */}
      {activeTab === 'dispense' && (
        <div className="space-y-6 max-w-3xl mx-auto animate-in fade-in duration-200">
          
          {/* Dispensação success message alert */}
          {dispenseSuccess && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-sm font-semibold flex items-center gap-2">
              <CheckCircle2 size={20} className="text-emerald-500" />
              <span>Medicamentos dispensados e entregues ao paciente com sucesso. Atualizações realizadas no estoque.</span>
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                <HeartHandshake className="text-primary" size={18} />
                Dispensar Receita Médica
              </CardTitle>
              <CardDescription className="text-xs">Digite o CPF ou nome do paciente para carregar a receita médica prescrita pelo médico.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSearchPrescription} className="flex gap-2">
                <Input
                  placeholder="Pesquisar por CPF do paciente (ex: 111.111.111-11)..."
                  value={prescSearch}
                  onChange={(e) => setPrescSearch(e.target.value)}
                />
                <Button type="submit">Buscar Receita</Button>
              </form>
            </CardContent>
          </Card>

          {/* Selected Prescription details */}
          {selectedPresc && (
            <Card className="border-blue-500/20 bg-blue-500/[0.01]">
              <CardHeader className="border-b border-border bg-muted/20">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                  <div>
                    <span className="text-[10px] font-bold text-blue-500 uppercase">Receita Encontrada</span>
                    <CardTitle className="text-sm font-bold text-foreground mt-0.5">{selectedPresc.patientName}</CardTitle>
                  </div>
                  <Badge variant="secondary">CPF: {selectedPresc.patientCpf}</Badge>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Prescrito por: <strong>{selectedPresc.doctorName}</strong> em {new Date(selectedPresc.createdAt).toLocaleDateString('pt-BR')}
                </p>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="space-y-2">
                  <span className="block text-xs font-bold text-foreground">Medicamentos Prescritos para Dispensação:</span>
                  <div className="divide-y divide-border border border-border rounded-lg bg-card overflow-hidden">
                    {selectedPresc.items.map(item => {
                      // Check if stock is available
                      const inventoryItem = initialMedicines.find(im => im.id === item.medicineId);
                      const isUnavailable = !inventoryItem || inventoryItem.stockLevel < item.quantity;
                      return (
                        <div key={item.id} className="flex items-center justify-between p-3 text-xs">
                          <div className="flex flex-col">
                            <span className="font-bold text-foreground">{item.medicineName}</span>
                            <span className="text-muted-foreground text-[10px] mt-0.5">
                              Posologia: {item.dosage} • Frequência: {item.frequency} • {item.durationDays} dias
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-semibold text-muted-foreground">Qtd: {item.quantity}</span>
                            {isUnavailable ? (
                              <Badge variant="destructive" className="flex items-center gap-0.5 py-0.5">
                                <AlertTriangle size={10} /> Sem Estoque
                              </Badge>
                            ) : (
                              <Badge variant="success">Disponível ({inventoryItem.stockLevel})</Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {error && <div className="p-3 bg-destructive/15 text-destructive rounded-lg text-xs font-bold">{error}</div>}

                <div className="flex justify-end gap-3 pt-2">
                  <Button variant="outline" onClick={() => setSelectedPresc(null)}>Cancelar</Button>
                  <Button
                    onClick={handleDispenseSubmit}
                    disabled={loading || selectedPresc.items.some(item => {
                      const inv = initialMedicines.find(im => im.id === item.medicineId);
                      return !inv || inv.stockLevel < item.quantity;
                    })}
                    className="bg-emerald-600 hover:bg-emerald-500 shadow-md"
                  >
                    Confirmar Entrega de Medicamentos
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

        </div>
      )}

      {/* Tab content 3: History */}
      {activeTab === 'history' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                <History className="text-primary" size={18} />
                Histórico Recente de Movimentações
              </CardTitle>
              <CardDescription className="text-xs">Registro de todas as entradas, dispensações e perdas de estoque registradas.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/20 text-muted-foreground font-bold">
                      <th className="px-6 py-3.5">Data</th>
                      <th className="px-6 py-3.5">Medicamento</th>
                      <th className="px-6 py-3.5">Tipo</th>
                      <th className="px-6 py-3.5">Quantidade</th>
                      <th className="px-6 py-3.5">Motivo / Descrição</th>
                      <th className="px-6 py-3.5">Operador</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {initialMovements.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-10 text-muted-foreground">
                          Nenhuma movimentação de estoque registrada.
                        </td>
                      </tr>
                    ) : (
                      initialMovements.map(mov => (
                        <tr key={mov.id} className="hover:bg-muted/10 transition-colors">
                          <td className="px-6 py-3.5 text-muted-foreground whitespace-nowrap">
                            {new Date(mov.createdAt).toLocaleDateString('pt-BR')} {new Date(mov.createdAt).toLocaleTimeString('pt-BR')}
                          </td>
                          <td className="px-6 py-3.5 font-bold text-foreground">{mov.medicineName}</td>
                          <td className="px-6 py-3.5">
                            <Badge variant={mov.type === 'ENTRY' ? 'success' : mov.type === 'EXIT' ? 'info' : 'destructive'}>
                              {mov.type === 'ENTRY' ? 'Entrada' : mov.type === 'EXIT' ? 'Dispensação / Saída' : mov.type === 'LOSS' ? 'Perda' : 'Vencido'}
                            </Badge>
                          </td>
                          <td className="px-6 py-3.5 font-semibold">{mov.quantity}</td>
                          <td className="px-6 py-3.5 text-muted-foreground">{mov.reason}</td>
                          <td className="px-6 py-3.5 whitespace-nowrap font-medium">{mov.userName}</td>
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

      {/* dialog for Register Medicine */}
      <Dialog isOpen={isNewMedOpen} onClose={() => setIsNewMedOpen(false)} title="Cadastrar Medicamento">
        <form onSubmit={handleNewMedSubmit} className="space-y-4">
          {error && <div className="p-3 bg-destructive/15 text-destructive rounded-lg text-xs font-semibold">{error}</div>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-bold">Nome do Medicamento *</label>
              <Input placeholder="Ex: Amoxicilina 500mg" value={medForm.name} onChange={(e) => setMedForm({ ...medForm, name: e.target.value })} required />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-bold">Princípio Ativo *</label>
              <Input placeholder="Ex: Amoxicilina" value={medForm.activeIngredient} onChange={(e) => setMedForm({ ...medForm, activeIngredient: e.target.value })} required />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold">Código do Medicamento</label>
              <Input placeholder="Ex: AMX-500" value={medForm.code} onChange={(e) => setMedForm({ ...medForm, code: e.target.value })} />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold">Categoria</label>
              <Input placeholder="Ex: Antibiótico" value={medForm.category} onChange={(e) => setMedForm({ ...medForm, category: e.target.value })} />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold">Apresentação / Unidade *</label>
              <Select
                value={medForm.unit}
                onChange={(e) => setMedForm({ ...medForm, unit: e.target.value })}
                options={[
                  { value: 'COMPRIMIDO', label: 'Comprimido' },
                  { value: 'FRASCO', label: 'Frasco' },
                  { value: 'AMPOLA', label: 'Ampola' },
                  { value: 'POMADA', label: 'Pomada / Tubo' },
                  { value: 'UNIDADE', label: 'Outro / Unidade' },
                ]}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold">Estoque Inicial</label>
              <Input type="number" value={medForm.initialStock} onChange={(e) => setMedForm({ ...medForm, initialStock: Number(e.target.value) })} min={0} />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold">Lote</label>
              <Input placeholder="Ex: LOTE-2026A" value={medForm.batch} onChange={(e) => setMedForm({ ...medForm, batch: e.target.value })} />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold">Data de Validade</label>
              <Input type="date" value={medForm.expirationDate} onChange={(e) => setMedForm({ ...medForm, expirationDate: e.target.value })} />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-bold">Fabricante</label>
              <Input placeholder="Ex: Medley / EMS" value={medForm.manufacturer} onChange={(e) => setMedForm({ ...medForm, manufacturer: e.target.value })} />
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-border pt-4 mt-6">
            <Button type="button" variant="outline" onClick={() => setIsNewMedOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Salvando...' : 'Salvar Cadastro'}</Button>
          </div>
        </form>
      </Dialog>

      {/* dialog for Adjust Stock */}
      <Dialog isOpen={isAdjustOpen} onClose={() => setIsAdjustOpen(false)} title={`Ajustar Estoque: ${selectedMed?.name}`}>
        <form onSubmit={handleAdjustSubmit} className="space-y-4">
          {error && <div className="p-3 bg-destructive/15 text-destructive rounded-lg text-xs font-semibold">{error}</div>}

          <div className="space-y-4">
            
            <div className="space-y-1.5">
              <label className="text-xs font-bold">Tipo de Ajuste *</label>
              <Select
                value={adjustType}
                onChange={(e) => setAdjustType(e.target.value)}
                options={[
                  { value: 'ENTRY', label: 'Entrada (Abastecimento)' },
                  { value: 'EXIT', label: 'Saída Manual' },
                  { value: 'LOSS', label: 'Perda / Danificado' },
                  { value: 'EXPIRED', label: 'Medicamento Vencido' },
                ]}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold">Quantidade *</label>
              <Input type="number" value={adjustQty} onChange={(e) => setAdjustQty(Number(e.target.value))} min={1} required />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold">Descrição / Motivo *</label>
              <Input placeholder="Ex: Recebimento de carga de medicamentos da secretaria" value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)} required />
            </div>

          </div>

          <div className="flex justify-end gap-3 border-t border-border pt-4 mt-6">
            <Button type="button" variant="outline" onClick={() => setIsAdjustOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Confirmar Ajuste' : 'Salvar Ajuste'}</Button>
          </div>
        </form>
      </Dialog>

    </div>
  );
}
