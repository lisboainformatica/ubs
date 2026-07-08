'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginAction } from '@/actions/auth.actions';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ShieldCheck, HeartPulse } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [slug, setSlug] = useState('exemplo'); // default seed slug
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !slug) {
      setError('Por favor, preencha todos os campos.');
      return;
    }

    setLoading(true);
    setError('');

    const res = await loginAction({
      email,
      passwordHash: password, // The action hashes it/validates it
      municipalitySlug: slug,
    });

    if (res.success) {
      window.location.href = '/dashboard';
    } else {
      setError(res.error || 'Erro ao realizar login.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4 relative overflow-hidden select-none">
      {/* Decorative Gradients */}
      <div className="absolute top-0 -left-4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 -right-4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand Logo / Info */}
        <div className="text-center mb-6">
          <div className="mx-auto h-12 w-12 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30 mb-3 animate-pulse">
            <HeartPulse size={28} />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">PSF Digital</h1>
          <p className="text-slate-400 text-xs mt-1">Portal Integrado de Saúde Municipal</p>
        </div>

        <form onSubmit={handleSubmit}>
          <Card className="border-slate-800 bg-slate-950/80 backdrop-blur-md text-slate-100 shadow-2xl">
            <CardHeader className="space-y-1">
              <CardTitle className="text-xl font-bold text-white text-center">Acessar Sistema</CardTitle>
              <CardDescription className="text-slate-400 text-xs text-center">
                Entre com as credenciais do seu município.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <div className="bg-red-500/15 border border-red-500/20 text-red-400 p-3 rounded-lg text-xs font-semibold">
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Identificador do Município (Slug)</label>
                <Input
                  placeholder="exemplo"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="bg-slate-900/60 border-slate-800 text-white placeholder:text-slate-500 focus-visible:ring-blue-500"
                  disabled={loading}
                />
                <p className="text-[10px] text-slate-500">
                  Insira o slug do município (ex: <strong>exemplo</strong> para testar).
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">E-mail Corporativo</label>
                <Input
                  type="email"
                  placeholder="nome@municipio.gov.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-slate-900/60 border-slate-800 text-white placeholder:text-slate-500 focus-visible:ring-blue-500"
                  disabled={loading}
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300">Senha de Acesso</label>
                  <a href="#" className="text-[10px] text-blue-400 hover:underline">Esqueceu a senha?</a>
                </div>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-slate-900/60 border-slate-800 text-white placeholder:text-slate-500 focus-visible:ring-blue-500"
                  disabled={loading}
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20 py-2.5"
                disabled={loading}
              >
                {loading ? 'Entrando...' : 'Entrar no Portal'}
              </Button>
              <div className="flex items-center gap-1.5 text-[9px] text-slate-500 justify-center">
                <ShieldCheck size={12} />
                <span>Dados protegidos em conformidade com a LGPD.</span>
              </div>
            </CardFooter>
          </Card>
        </form>

        {/* Demo Credentials Alert helper */}
        <div className="mt-4 p-3 rounded-lg border border-blue-500/10 bg-blue-500/5 text-slate-400 text-xs space-y-1">
          <p className="font-bold text-slate-300">Credenciais de Teste (Município: exemplo):</p>
          <ul className="list-disc pl-4 text-[11px] space-y-0.5">
            <li><strong>Admin:</strong> admin@exemplo.gov.br / admin123</li>
            <li><strong>Médico:</strong> medico@exemplo.gov.br / medico123</li>
            <li><strong>Recepcionista:</strong> recepcao@exemplo.gov.br / recepcao123</li>
            <li><strong>Farmácia:</strong> farmacia@exemplo.gov.br / farmacia123</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
