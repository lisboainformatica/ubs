import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import {
  CalendarDays,
  ShieldCheck,
  User,
  Activity,
  Heart,
  Building,
  ClipboardList,
  Clock,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-950 text-slate-100 antialiased relative overflow-hidden select-none">
      {/* Background Glows */}
      <div className="absolute top-[-25%] left-[-15%] w-[70%] h-[70%] rounded-full bg-emerald-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-blue-500/5 blur-[120px] pointer-events-none" />

      {/* Navigation Header */}
      <header className="border-b border-slate-900 bg-slate-950/60 backdrop-blur-md px-6 py-4 relative z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/25">
              <CalendarDays className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="font-extrabold text-lg bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                PSF Digital
              </span>
              <p className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">
                Secretaria de Saúde
              </p>
            </div>
          </div>

          <a href="/login">
            <Button
              variant="outline"
              className="border-slate-800 text-slate-300 hover:bg-slate-900 hover:text-white text-xs h-9 rounded-lg flex items-center gap-1.5 cursor-pointer"
            >
              <User size={14} />
              Acesso Profissional
            </Button>
          </a>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-12 md:py-20 relative z-10 flex flex-col items-center justify-center space-y-12">
        <div className="text-center space-y-4 max-w-3xl">
          <Badge variant="outline" className="border-emerald-500/20 text-emerald-400 bg-emerald-950/10 px-3 py-1 font-semibold text-xs inline-flex items-center gap-1.5 animate-pulse">
            <Sparkles size={12} />
            Agendamento Online Ativo
          </Badge>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-none bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
            Portal Municipal de Saúde
          </h1>
          <p className="text-sm md:text-lg text-slate-400 font-medium max-w-xl mx-auto leading-relaxed">
            Consulte a escala dos médicos e agende seus atendimentos de forma rápida e segura na rede pública municipal de saúde.
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid md:grid-cols-2 gap-6 w-full max-w-4xl">
          {/* Patient Card */}
          <Card className="bg-slate-900/40 border-slate-850 backdrop-blur-md hover:border-emerald-500/30 transition-all group overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500 opacity-20 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="pb-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-950/60 border border-emerald-500/20 flex items-center justify-center mb-3">
                <Heart className="w-6 h-6 text-emerald-400" />
              </div>
              <CardTitle className="text-xl font-bold text-slate-200">Área do Cidadão</CardTitle>
              <CardDescription className="text-slate-400 text-xs">
                Para pacientes cadastrados que desejam marcar consultas de rotina e acompanhamentos.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="text-xs text-slate-400 space-y-2">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Auto-agendamento por especialidade e médico
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Impressão de comprovantes de agendamento
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Acesso rápido informando apenas CPF e Nascimento
                </li>
              </ul>
              <a href="/agendar" className="block pt-2">
                <Button className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold h-11 rounded-xl transition-all shadow-md shadow-emerald-500/10 flex items-center justify-center gap-1.5 cursor-pointer">
                  Agendar Consulta
                  <ArrowRight size={16} />
                </Button>
              </a>
            </CardContent>
          </Card>

          {/* Employee Card */}
          <Card className="bg-slate-900/40 border-slate-850 backdrop-blur-md hover:border-blue-500/30 transition-all group overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-blue-500 opacity-20 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="pb-4">
              <div className="w-12 h-12 rounded-xl bg-blue-950/60 border border-blue-500/20 flex items-center justify-center mb-3">
                <ShieldCheck className="w-6 h-6 text-blue-400" />
              </div>
              <CardTitle className="text-xl font-bold text-slate-200">Painel do Servidor</CardTitle>
              <CardDescription className="text-slate-400 text-xs">
                Para médicos, enfermeiros, recepcionistas, farmacêuticos e gestores da saúde municipal.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="text-xs text-slate-400 space-y-2">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  Controle de agendas, filas e prontuários eletrônicos
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  Prescrições digitais com emissão de receitas
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  Controle de estoque de medicamentos e dispensação
                </li>
              </ul>
              <a href="/login" className="block pt-2">
                <Button
                  variant="outline"
                  className="w-full border-slate-800 hover:bg-slate-900 text-slate-300 hover:text-white font-bold h-11 rounded-xl cursor-pointer"
                >
                  Entrar no Painel
                </Button>
              </a>
            </CardContent>
          </Card>
        </div>

        {/* Step Walkthrough Section */}
        <div className="w-full max-w-4xl pt-8">
          <div className="text-center mb-8">
            <h2 className="text-lg font-bold text-slate-300">Como funciona o auto-agendamento?</h2>
            <p className="text-xs text-slate-500">Passo a passo rápido para marcar seu atendimento</p>
          </div>
          <div className="grid sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl border border-slate-900 bg-slate-900/20 text-center space-y-2">
              <div className="w-8 h-8 rounded-full bg-emerald-950 border border-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center mx-auto">1</div>
              <h3 className="text-xs font-bold text-slate-200">Identificação</h3>
              <p className="text-[10px] text-slate-500 leading-normal">Informe o município, seu CPF e data de nascimento para validar seu registro.</p>
            </div>
            <div className="p-4 rounded-xl border border-slate-900 bg-slate-900/20 text-center space-y-2">
              <div className="w-8 h-8 rounded-full bg-emerald-950 border border-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center mx-auto">2</div>
              <h3 className="text-xs font-bold text-slate-200">Seleção</h3>
              <p className="text-[10px] text-slate-500 leading-normal">Selecione o Posto de Saúde (UBS), a especialidade médica e seu médico.</p>
            </div>
            <div className="p-4 rounded-xl border border-slate-900 bg-slate-900/20 text-center space-y-2">
              <div className="w-8 h-8 rounded-full bg-emerald-950 border border-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center mx-auto">3</div>
              <h3 className="text-xs font-bold text-slate-200">Horário</h3>
              <p className="text-[10px] text-slate-500 leading-normal">Escolha a melhor data e um dos horários disponíveis na agenda do médico.</p>
            </div>
            <div className="p-4 rounded-xl border border-slate-900 bg-slate-900/20 text-center space-y-2">
              <div className="w-8 h-8 rounded-full bg-emerald-950 border border-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center mx-auto">4</div>
              <h3 className="text-xs font-bold text-slate-200">Comprovante</h3>
              <p className="text-[10px] text-slate-500 leading-normal">Imprima o ticket e apresente-o na UBS no dia e hora marcados.</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/40 py-6 text-center text-xs text-slate-500 relative z-10">
        <p>© 2026 PSF Digital. Governo Municipal & Secretaria de Saúde.</p>
        <p className="text-[9px] text-slate-600 mt-1 flex items-center justify-center gap-1">
          <ShieldCheck size={12} className="text-emerald-500/60" />
          Segurança e LGPD garantidas • Conexões auditadas
        </p>
      </footer>
    </div>
  );
}
