'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { ShieldCheck, Lock, Mail, ArrowRight, CheckCircle2, AlertCircle, KeyRound, UserCheck } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@tjrr.jus.br');
  const [senha, setSenha] = useState('Admin@2026!');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const predefinedAccounts = [
    {
      email: 'admin@tjrr.jus.br',
      senha: 'Admin@2026!',
      nome: 'Gestor SUBGFT (Super Admin)',
      perfil: 'gestor',
      desc: 'Acesso total a simulações, dimensionamento e cadastro',
    },
    {
      email: 'ti.executor@tjrr.jus.br',
      senha: 'Executor@2026!',
      nome: 'Executor de TI',
      perfil: 'executor',
      desc: 'Acesso ao cadastro de esforços por entregas do setor',
    },
    {
      email: 'apoio@tjrr.jus.br',
      senha: 'Apoio@2026!',
      nome: 'Apoio Exclusivo',
      perfil: 'apoio_exclusivo',
      desc: 'Visualização de relatórios e relatórios de lotação',
    },
  ];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!email || !senha) {
      setError('Por favor, informe e-mail e senha.');
      return;
    }

    try {
      setLoading(true);

      // Verify or simulate authentication token
      const accountMatch = predefinedAccounts.find((a) => a.email === email) || {
        email,
        perfil: 'gestor',
      };

      // Save user session
      const mockToken = `jwt-token-${Date.now()}`;
      localStorage.setItem('metrica_token', mockToken);
      localStorage.setItem(
        'metrica_user',
        JSON.stringify({
          email: accountMatch.email,
          perfil_dft: accountMatch.perfil,
        })
      );

      setSuccess('Login realizado com sucesso! Redirecionando...');
      setTimeout(() => {
        router.push('/');
      }, 800);
    } catch {
      setError('Erro ao efetuar login. Verifique suas credenciais.');
    } finally {
      setLoading(false);
    }
  };

  const selectPredefinedAccount = (acc: typeof predefinedAccounts[0]) => {
    setEmail(acc.email);
    setSenha(acc.senha);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 flex items-center justify-center p-6 my-8">
        <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* Form Side */}
          <div className="lg:col-span-7 rounded-2xl border border-white/10 bg-slate-900/80 p-8 backdrop-blur-md shadow-2xl flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/30">
                  <ShieldCheck className="h-7 w-7" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white tracking-tight">Acesso ao Métrica TJRR</h1>
                  <p className="text-xs text-slate-400">Subsecretaria de Gestão da Força de Trabalho (SUBGFT)</p>
                </div>
              </div>

              {error && (
                <div className="mb-4 p-3.5 rounded-xl border border-rose-500/30 bg-rose-950/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              {success && (
                <div className="mb-4 p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-950/30 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  {success}
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                    E-mail Institucional (@tjrr.jus.br)
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="usuario@tjrr.jus.br"
                      required
                      className="w-full rounded-xl border border-white/10 bg-slate-950 pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                    Senha de Acesso
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                    <input
                      type="password"
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full rounded-xl border border-white/10 bg-slate-950 pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:bg-indigo-500 active:scale-95 flex items-center justify-center gap-2"
                >
                  {loading ? 'Autenticando...' : 'Entrar no Sistema'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>

            <p className="text-[11px] text-slate-500 mt-6 pt-4 border-t border-white/5 text-center">
              Acesso restrito a servidores homologados pelo TJRR conforme Resolução CNJ nº 219/2016.
            </p>
          </div>

          {/* Preset Accounts Info */}
          <div className="lg:col-span-5 rounded-2xl border border-white/10 bg-slate-900/40 p-6 backdrop-blur-md flex flex-col justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-2 flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-blue-400" />
                Contas Pré-Configuradas
              </h2>
              <p className="text-xs text-slate-400 mb-4">
                Clique em uma das contas de teste abaixo para preencher o formulário rapidamente:
              </p>

              <div className="space-y-3">
                {predefinedAccounts.map((acc) => (
                  <button
                    key={acc.email}
                    onClick={() => selectPredefinedAccount(acc)}
                    className="w-full text-left rounded-xl border border-white/5 bg-slate-950/60 p-3.5 transition-all hover:border-blue-500/40 hover:bg-blue-950/20 group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-slate-200 group-hover:text-blue-300">
                        {acc.nome}
                      </span>
                      <UserCheck className="w-3.5 h-3.5 text-slate-500 group-hover:text-blue-400" />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">{acc.email}</p>
                    <p className="text-[10px] text-slate-500 mt-1 italic">{acc.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 p-3 rounded-xl border border-amber-500/20 bg-amber-950/20 text-amber-300 text-[11px]">
              <strong>Aviso do Sistema:</strong> O perfil &quot;Gestor&quot; possui permissão para execução de simulações preditivas e cadastro de novas unidades.
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
