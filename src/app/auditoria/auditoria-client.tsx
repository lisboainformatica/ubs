'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Dialog } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, Eye, Terminal, Info } from 'lucide-react';

interface AuditLog {
  id: string;
  userName: string;
  userEmail: string;
  userRole: string;
  action: string;
  tableName: string;
  recordId: string;
  oldValues: string;
  newValues: string;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
}

export default function AuditoriaClient({ initialLogs }: { initialLogs: AuditLog[] }) {
  const [logs, setLogs] = useState<AuditLog[]>(initialLogs);
  
  // Filter states
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterTable, setFilterTable] = useState('');

  // Modal details
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Apply filters client-side for immediate Nubank-style premium response
  const filteredLogs = logs.filter(log => {
    const matchesSearch =
      log.userName.toLowerCase().includes(search.toLowerCase()) ||
      log.userEmail.toLowerCase().includes(search.toLowerCase()) ||
      log.recordId.includes(search);
    const matchesAction = filterAction ? log.action === filterAction : true;
    const matchesTable = filterTable ? log.tableName === filterTable : true;

    return matchesSearch && matchesAction && matchesTable;
  });

  const handleOpenDetails = (log: AuditLog) => {
    setSelectedLog(log);
    setIsDetailsOpen(true);
  };

  const renderJsonBlock = (jsonStr: string, isDeleted = false) => {
    if (!jsonStr) return <p className="text-muted-foreground italic text-[11px]">Nenhum valor</p>;
    try {
      const parsed = JSON.parse(jsonStr);
      return (
        <pre className={`text-[10px] font-mono p-3 rounded-lg overflow-x-auto max-h-60 ${
          isDeleted ? 'bg-red-500/5 text-red-500 dark:text-red-400 border border-red-500/10' : 'bg-emerald-500/5 text-emerald-500 dark:text-emerald-400 border border-emerald-500/10'
        }`}>
          {JSON.stringify(parsed, null, 2)}
        </pre>
      );
    } catch {
      return <pre className="text-[10px] font-mono p-3 bg-muted rounded-lg overflow-x-auto">{jsonStr}</pre>;
    }
  };

  const uniqueActions = Array.from(new Set(logs.map(l => l.action)));
  const uniqueTables = Array.from(new Set(logs.map(l => l.tableName)));

  return (
    <div className="space-y-6">
      
      {/* Title block */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <ShieldCheck className="text-blue-500" size={24} />
            Registro de Auditoria de Ações (LGPD)
          </h1>
          <p className="text-xs text-muted-foreground">
            Acompanhe a rastreabilidade completa das ações e acessos a informações de saúde dos pacientes no município.
          </p>
        </div>
        <div className="flex items-center gap-1.5 bg-blue-500/5 border border-blue-500/10 px-3 py-1.5 rounded-lg text-[10px] font-bold text-blue-500">
          <Info size={14} />
          <span>LGPD Conformidade Ativa</span>
        </div>
      </div>

      {/* Filter toolbar */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">Pesquisar Operador / ID</label>
              <Input
                placeholder="Ex: Roberto Costa, 53ef-..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">Filtrar Ação</label>
              <Select
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
                options={uniqueActions.map(act => ({ value: act, label: act }))}
                placeholder="Todas as Ações"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">Filtrar Tabela</label>
              <Select
                value={filterTable}
                onChange={(e) => setFilterTable(e.target.value)}
                options={uniqueTables.map(tbl => ({ value: tbl, label: tbl }))}
                placeholder="Todas as Tabelas"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit Log Table Grid */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/20 text-muted-foreground font-bold">
                  <th className="px-6 py-3.5">Data/Hora</th>
                  <th className="px-6 py-3.5">Usuário (Operador)</th>
                  <th className="px-6 py-3.5">Função</th>
                  <th className="px-6 py-3.5">Ação</th>
                  <th className="px-6 py-3.5">Tabela</th>
                  <th className="px-6 py-3.5">ID Registro</th>
                  <th className="px-6 py-3.5 text-right">Detalhes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-muted-foreground">
                      Nenhum registro de auditoria encontrado.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map(log => (
                    <tr key={log.id} className="hover:bg-muted/10 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-muted-foreground font-medium">
                        {new Date(log.createdAt).toLocaleDateString('pt-BR')} {new Date(log.createdAt).toLocaleTimeString('pt-BR')}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-bold text-foreground block">{log.userName}</span>
                        <span className="text-[9px] text-muted-foreground">{log.userEmail}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant="secondary">{log.userRole}</Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={log.action === 'LOGIN' ? 'info' : log.action === 'CREATE' || log.action === 'CREATE_CONSULTATION' ? 'success' : log.action === 'CANCEL' ? 'destructive' : 'warning'}>
                          {log.action}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-foreground">{log.tableName}</td>
                      <td className="px-6 py-4 font-mono text-[10px] text-muted-foreground truncate max-w-[100px]">{log.recordId}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <Button onClick={() => handleOpenDetails(log)} size="sm" variant="outline" className="h-8 w-8 p-0" title="Ver Informações Detalhadas">
                          <Eye size={15} />
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

      {/* dialog for Details (side by side diff block) */}
      <Dialog isOpen={isDetailsOpen} onClose={() => setIsDetailsOpen(false)} title="Detalhes do Log de Auditoria">
        {selectedLog && (
          <div className="space-y-4 text-xs py-2">
            
            {/* Meta info grid */}
            <div className="grid grid-cols-2 gap-4 bg-muted/30 p-3 rounded-lg border border-border">
              <div>
                <span className="block text-[10px] text-slate-500 font-bold uppercase">Operador</span>
                <span className="font-bold text-foreground">{selectedLog.userName} ({selectedLog.userRole})</span>
                <span className="block text-[10px] text-muted-foreground mt-0.5">{selectedLog.userEmail}</span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-500 font-bold uppercase">Ação / Tabela</span>
                <span className="font-bold text-foreground">{selectedLog.action}</span>
                <span className="block text-[10px] text-muted-foreground mt-0.5">Tabela: {selectedLog.tableName}</span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-500 font-bold uppercase">Endereço IP</span>
                <span className="font-bold text-foreground font-mono">{selectedLog.ipAddress || 'Não registrado'}</span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-500 font-bold uppercase">Data do Evento</span>
                <span className="font-bold text-foreground">
                  {new Date(selectedLog.createdAt).toLocaleDateString('pt-BR')} {new Date(selectedLog.createdAt).toLocaleTimeString('pt-BR')}
                </span>
              </div>
              <div className="col-span-2 border-t border-border/50 pt-2">
                <span className="block text-[10px] text-slate-500 font-bold uppercase mb-0.5">Navegador / User Agent</span>
                <span className="text-[10px] text-muted-foreground leading-tight block truncate" title={selectedLog.userAgent}>
                  {selectedLog.userAgent || 'Não registrado'}
                </span>
              </div>
            </div>

            {/* side by side comparison */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <span className="block text-[10px] font-bold text-red-500 uppercase flex items-center gap-1">
                  <Terminal size={12} />
                  Valores Anteriores (Antes / Exclusão):
                </span>
                {renderJsonBlock(selectedLog.oldValues, true)}
              </div>

              <div className="space-y-1.5">
                <span className="block text-[10px] font-bold text-emerald-500 uppercase flex items-center gap-1">
                  <Terminal size={12} />
                  Valores Novos (Depois / Criação):
                </span>
                {renderJsonBlock(selectedLog.newValues, false)}
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-border mt-4">
              <Button type="button" onClick={() => setIsDetailsOpen(false)}>Fechar Detalhes</Button>
            </div>

          </div>
        )}
      </Dialog>

    </div>
  );
}
