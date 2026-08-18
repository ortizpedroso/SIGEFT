'use client';

import { useEffect, useState } from 'react';
import { apiFetch, apiErrorMessage } from '@/lib/auth';
import type { RateioIndiretoResponse } from '@/types';
import { AlertTriangle, ShieldCheck, Users } from 'lucide-react';

function classificacaoStyle(classificacao: string) {
  if (classificacao === 'acima_da_cota') {
    return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
  }
  if (classificacao === 'abaixo_da_cota') {
    return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
  }
  return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
}

function classificacaoLabel(classificacao: string) {
  if (classificacao === 'acima_da_cota') return 'Acima da cota';
  if (classificacao === 'abaixo_da_cota') return 'Abaixo da cota';
  return 'Dentro da cota';
}

export default function RateioIndiretoSection() {
  const [data, setData] = useState<RateioIndiretoResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch('/api/dashboard/rateio-indireto')
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(apiErrorMessage(json, 'Erro ao carregar rateio interno'));
        setData(json);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Erro ao carregar rateio interno');
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 text-sm text-slate-400">
        Carregando rateio interno do teto de 30%...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-rose-500/30 bg-rose-950/30 p-6 text-sm text-rose-300 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        {error || 'Dados indisponíveis'}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-sm shadow-xl space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-400" />
            Rateio Interno do Teto de 30% (Apoio Indireto)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Distribuição proporcional da cota de apoio indireto entre secretarias/subsecretarias
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="inline-flex items-center gap-1 rounded-lg border border-blue-500/20 bg-blue-950/30 px-2.5 py-1 text-blue-300">
            <ShieldCheck className="w-3.5 h-3.5" />
            Teto global: {data.teto_global_pct.toFixed(1)}%
          </span>
          <span
            className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 ${
              data.pct_esforco_indireto_atual > data.teto_global_pct
                ? 'border-rose-500/30 bg-rose-950/30 text-rose-300'
                : 'border-emerald-500/30 bg-emerald-950/30 text-emerald-300'
            }`}
          >
            Esforço agregado: {data.pct_esforco_indireto_atual.toFixed(1)}%
          </span>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950 text-slate-300 uppercase font-bold text-[11px] border-b border-white/10">
            <tr>
              <th className="px-4 py-3">Unidade</th>
              <th className="px-4 py-3">Lotação Ideal</th>
              <th className="px-4 py-3">Cota-alvo (%)</th>
              <th className="px-4 py-3">% Real</th>
              <th className="px-4 py-3">Desvio (%)</th>
              <th className="px-4 py-3">Classificação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-slate-300">
            {data.unidades.map((u) => (
              <tr key={u.unidade_id} className="hover:bg-white/5">
                <td className="px-4 py-3 font-medium text-slate-100">{u.nome}</td>
                <td className="px-4 py-3">{u.lotacao_ideal}</td>
                <td className="px-4 py-3">{u.cota_alvo_pct.toFixed(1)}%</td>
                <td className="px-4 py-3">{u.percentual_real_pct.toFixed(1)}%</td>
                <td className="px-4 py-3">{u.desvio_pct > 0 ? '+' : ''}{u.desvio_pct.toFixed(1)}%</td>
                <td className="px-4 py-3">
                  <span className={`inline-block rounded-lg border px-2 py-0.5 text-[11px] font-semibold ${classificacaoStyle(u.classificacao)}`}>
                    {classificacaoLabel(u.classificacao)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
