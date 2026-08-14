'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { apiFetch } from '@/lib/auth';
import { Link2, FileText, Building2, ShieldCheck, ArrowRight, CheckCircle2, CircleDashed } from 'lucide-react';

type Canal = {
  id: string;
  nome: string;
  papel: string;
  status: 'operacional' | 'local';
  href?: string;
  cta?: string;
};

const CANAIS: Canal[] = [
  {
    id: 'sei',
    nome: 'SEI TJRR',
    papel: 'Instrução processual: minutas e pareceres de lotação gerados no Métrica, prontos para autuar no SEI. Módulo separado: Instrução SEI.',
    status: 'operacional',
    href: '/relatorios-sei',
    cta: 'Abrir Instrução SEI',
  },
  {
    id: 'unidades',
    nome: 'Unidades e quantitativo',
    papel: 'Quadro de pessoal e lotação ideal entram pelo cadastro do Métrica (não há importação automática da folha neste MVP).',
    status: 'local',
    href: '/unidades',
    cta: 'Abrir Unidades',
  },
  {
    id: 'mgi',
    nome: 'Metodologia MGI / CNJ 219',
    papel: 'Pesos, Q₃, teto de 30% e ITP 70% já estão no Motor de Ponderação e na Simulação — integração normativa, não um webservice externo.',
    status: 'operacional',
    href: '/ponderacao',
    cta: 'Abrir Motor de Ponderação',
  },
];

export default function IntegracaoPage() {
  const [apiOk, setApiOk] = useState<boolean | null>(null);

  useEffect(() => {
    apiFetch('/api')
      .then((res) => setApiOk(res.ok))
      .catch(() => setApiOk(false));
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />

      <main id="conteudo-principal" className="flex-1 mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-10 py-6 sm:py-10 w-full">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <Link2 className="w-7 h-7 text-blue-500" />
              Integração
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Canais de governança do Métrica com o SEI e com os módulos internos. A Instrução SEI continua em menu próprio.
            </p>
          </div>
          <div
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold border ${
              apiOk
                ? 'border-emerald-500/30 bg-emerald-950/30 text-emerald-300'
                : apiOk === false
                ? 'border-rose-500/30 bg-rose-950/30 text-rose-300'
                : 'border-white/10 bg-slate-900/60 text-slate-400'
            }`}
          >
            {apiOk ? <CheckCircle2 className="h-3.5 w-3.5" /> : <CircleDashed className="h-3.5 w-3.5" />}
            API {apiOk ? 'conectada' : apiOk === false ? 'indisponível' : 'verificando…'}
          </div>
        </div>

        <div className="mb-8 p-5 rounded-2xl border border-blue-500/30 bg-blue-950/20 text-slate-300 text-xs leading-relaxed flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-white block mb-0.5">Dois caminhos distintos</span>
            <strong className="text-white">Instrução SEI</strong> emite a minuta. <strong className="text-white">Integração</strong> mostra como o Métrica se conecta aos sistemas e às regras do Tribunal. Não envia processo automaticamente ao SEI neste MVP.
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {CANAIS.map((canal) => (
            <article
              key={canal.id}
              className="flex flex-col rounded-2xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-md"
            >
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  {canal.id === 'sei' ? (
                    <FileText className="h-5 w-5 text-amber-300" />
                  ) : canal.id === 'unidades' ? (
                    <Building2 className="h-5 w-5 text-blue-400" />
                  ) : (
                    <ShieldCheck className="h-5 w-5 text-emerald-400" />
                  )}
                  <h2 className="text-sm font-bold text-white">{canal.nome}</h2>
                </div>
                <span
                  className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
                    canal.status === 'operacional'
                      ? 'border-emerald-500/30 bg-emerald-950/40 text-emerald-300'
                      : 'border-amber-500/30 bg-amber-950/40 text-amber-300'
                  }`}
                >
                  {canal.status === 'operacional' ? 'Operacional' : 'Cadastro local'}
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed flex-1">{canal.papel}</p>
              {canal.href && canal.cta && (
                <Link
                  href={canal.href}
                  className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-blue-700/20 transition-all hover:bg-blue-600"
                >
                  {canal.cta}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              )}
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}
