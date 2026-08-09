'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { Unidade, MotorPonderacaoConfig } from '@/types';
import { Sliders, RefreshCw, CheckCircle2, ShieldAlert, Scale, Sparkles, AlertCircle } from 'lucide-react';

export default function PonderacaoPage() {
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [config, setConfig] = useState<MotorPonderacaoConfig>({
    pesoVolume: 0.40,
    pesoComplexidade: 0.35,
    pesoCriticidade: 0.25,
    toleranciaDesvio: 20,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resConfig, resUnidades] = await Promise.all([
        fetch('/api/ponderacao'),
        fetch('/api/unidades'),
      ]);
      if (resConfig.ok) {
        const dataC = await resConfig.json();
        setConfig(dataC);
      }
      if (resUnidades.ok) {
        const dataU = await resUnidades.json();
        setUnidades(dataU);
      }
    } catch {
      console.error('Erro ao carregar dados do motor de ponderação');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveConfig = async () => {
    setSaving(true);
    setSuccessMsg('');
    try {
      const res = await fetch('/api/ponderacao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (res.ok) {
        setSuccessMsg('Pesos do motor de ponderação salvos e aplicados com sucesso!');
        setTimeout(() => setSuccessMsg(''), 4000);
      }
    } catch {
      alert('Erro ao salvar parametrização');
    } finally {
      setSaving(false);
    }
  };

  // Recalculate dynamic weighted workforce sizing for display
  const totalPeso = config.pesoVolume + config.pesoComplexidade + config.pesoCriticidade;

  const unidadesReponderadas = unidades.map((u) => {
    const ips = u.ips || 80;
    const baseVal = (ips / 80) * 3;
    
    // Weighted factor based on sliders
    const fVol = (config.pesoVolume / (totalPeso || 1)) * 1.2;
    const fComp = (config.pesoComplexidade / (totalPeso || 1)) * 1.1;
    const fCrit = (config.pesoCriticidade / (totalPeso || 1)) * 1.3;

    const multiplicadorPonderado = fVol + fComp + fCrit;
    const lotacaoCalculada = Math.max(1, Math.round(baseVal * multiplicadorPonderado));
    const servidoresAtuais = u.servidores_atuais || 4;
    const diff = servidoresAtuais - lotacaoCalculada;

    const desvioPct = lotacaoCalculada > 0 ? Math.round((diff / lotacaoCalculada) * 100) : 0;
    const foraDaTolerancia = Math.abs(desvioPct) > config.toleranciaDesvio;

    return {
      ...u,
      lotacaoPonderada: lotacaoCalculada,
      diffPonderado: diff,
      desvioPct,
      foraDaTolerancia,
    };
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-10 py-6 sm:py-10 w-full">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <Sliders className="w-7 h-7 text-blue-500" />
              Motor de Ponderação e Ajuste de Pesos (SUBGFT)
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Módulo 3 — Calibração autônoma de pesos (volume, complexidade e criticidade) com gatilhos da Res. CNJ 553/2024
            </p>
          </div>

          <button
            onClick={handleSaveConfig}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-700/20 transition-all hover:bg-blue-600 active:scale-95 disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            {saving ? 'Aplicando...' : 'Salvar e Recalcular Todos'}
          </button>
        </div>

        {successMsg && (
          <div className="mb-6 p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/30 text-emerald-300 text-sm flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            {successMsg}
          </div>
        )}

        {/* Sliders Control Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-10">
          <div className="lg:col-span-3 rounded-2xl border border-blue-500/30 bg-slate-900/80 p-6 backdrop-blur-md shadow-2xl">
            <h2 className="text-base font-bold text-white mb-1 flex items-center gap-2">
              <Sliders className="w-5 h-5 text-blue-400" /> Parametrização dos Pesos dos Indicadores
            </h2>
            <p className="text-xs text-slate-400 mb-6">
              Ajuste os pesos percentuais diretamente na interface sem necessidade de nova codificação.
            </p>

            <div className="space-y-6">
              {/* Peso Volume */}
              <div className="rounded-xl border border-white/10 bg-slate-900/80 p-4 shadow-sm">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-bold uppercase text-slate-300 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block shadow-sm"></span>
                    Peso: Volume de Demandas (MGI)
                  </label>
                  <span className="text-xs font-extrabold text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-lg border border-blue-500/20 shadow-sm">
                    {Math.round(config.pesoVolume * 100)}%
                  </span>
                </div>
                <div className="py-2 flex items-center">
                  <input
                    type="range"
                    min="0.10"
                    max="0.80"
                    step="0.05"
                    value={config.pesoVolume}
                    onChange={(e) => setConfig({ ...config, pesoVolume: parseFloat(e.target.value) })}
                    className="range-slider range-slider-blue"
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 font-medium mt-1">
                  <span>10% (Mínimo)</span>
                  <span className="text-blue-400 font-semibold">40% (Recomendado)</span>
                  <span>80% (Máximo)</span>
                </div>
              </div>

              {/* Peso Complexidade */}
              <div className="rounded-xl border border-white/10 bg-slate-900/80 p-4 shadow-sm">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-bold uppercase text-slate-300 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block shadow-sm"></span>
                    Peso: Complexidade das Atribuições
                  </label>
                  <span className="text-xs font-extrabold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 shadow-sm">
                    {Math.round(config.pesoComplexidade * 100)}%
                  </span>
                </div>
                <div className="py-2 flex items-center">
                  <input
                    type="range"
                    min="0.10"
                    max="0.80"
                    step="0.05"
                    value={config.pesoComplexidade}
                    onChange={(e) => setConfig({ ...config, pesoComplexidade: parseFloat(e.target.value) })}
                    className="range-slider range-slider-emerald"
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 font-medium mt-1">
                  <span>10% (Mínimo)</span>
                  <span className="text-emerald-400 font-semibold">35% (Recomendado)</span>
                  <span>80% (Máximo)</span>
                </div>
              </div>

              {/* Peso Criticidade Institucional */}
              <div className="rounded-xl border border-white/10 bg-slate-900/80 p-4 shadow-sm">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-bold uppercase text-slate-300 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block shadow-sm"></span>
                    Peso: Criticidade Institucional da Secretaria
                  </label>
                  <span className="text-xs font-extrabold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20 shadow-sm">
                    {Math.round(config.pesoCriticidade * 100)}%
                  </span>
                </div>
                <div className="py-2 flex items-center">
                  <input
                    type="range"
                    min="0.10"
                    max="0.80"
                    step="0.05"
                    value={config.pesoCriticidade}
                    onChange={(e) => setConfig({ ...config, pesoCriticidade: parseFloat(e.target.value) })}
                    className="range-slider range-slider-amber"
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 font-medium mt-1">
                  <span>10% (Mínimo)</span>
                  <span className="text-amber-400 font-semibold">25% (Recomendado)</span>
                  <span>80% (Máximo)</span>
                </div>
              </div>

              {/* Tolerância de Desvio (Res. CNJ 553/2024) */}
              <div className="rounded-xl border border-white/10 bg-slate-900/80 p-4 shadow-sm">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-bold uppercase text-slate-300 flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                    Margem de Tolerância de Desvio (CNJ 553/2024)
                  </label>
                  <span className="text-xs font-extrabold text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-lg border border-rose-500/20 shadow-sm">
                    ±{config.toleranciaDesvio}%
                  </span>
                </div>
                <div className="py-2 flex items-center">
                  <input
                    type="range"
                    min="10"
                    max="35"
                    step="5"
                    value={config.toleranciaDesvio}
                    onChange={(e) => setConfig({ ...config, toleranciaDesvio: parseInt(e.target.value) })}
                    className="range-slider range-slider-rose"
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 font-medium mt-1">
                  <span>±10% (Estrita)</span>
                  <span className="text-rose-400 font-semibold">±20% (Padrão CNJ 553)</span>
                  <span>±35% (Flexível)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Sum Summary Card */}
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 flex flex-col justify-between">
            <div>
              <p className="text-xs uppercase font-bold text-slate-400">Soma dos Pesos</p>
              <p className="text-3xl font-extrabold text-white mt-1">
                {Math.round(totalPeso * 100)}%
              </p>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                A distribuição ideal dos três eixos deve totalizar aproximadamente 100% para manter a calibração do modelo DFT.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-white/10">
              <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg inline-block border border-emerald-500/20">
                Auditoria de Pesos Ativa
              </span>
            </div>
          </div>
        </div>

        {/* Live Sizing Preview Table */}
        <h2 className="text-lg font-bold text-white mb-4">Recálculo da Lotação Ideal por Setor com Novos Pesos</h2>

        {loading ? (
          <div className="text-center py-12 text-slate-500 text-sm">Atualizando simulação do motor...</div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60 shadow-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider border-b border-white/10">
                <tr>
                  <th className="p-4">Unidade / Setor</th>
                  <th className="p-4">Tipo</th>
                  <th className="p-4 text-center">Lotação Atual</th>
                  <th className="p-4 text-center">Lotação Ponderada</th>
                  <th className="p-4 text-center">Balanço</th>
                  <th className="p-4 text-center">Desvio %</th>
                  <th className="p-4 text-right">Alerta CNJ 553</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {unidadesReponderadas.map((u) => (
                  <tr key={u.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-4 font-bold text-white">{u.nome}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase border ${
                        u.tipo === 'apoio_indireto' 
                          ? 'bg-amber-950/40 text-amber-300 border-amber-500/30'
                          : 'bg-blue-950/40 text-blue-300 border-blue-500/30'
                      }`}>
                        {u.tipo === 'apoio_indireto' ? 'Apoio Indireto' : 'Apoio Direto'}
                      </span>
                    </td>
                    <td className="p-4 text-center font-semibold text-slate-200">{u.servidores_atuais}</td>
                    <td className="p-4 text-center font-bold text-blue-300">{u.lotacaoPonderada}</td>
                    <td className={`p-4 text-center font-bold ${
                      u.diffPonderado < 0 ? 'text-rose-400' : u.diffPonderado > 0 ? 'text-amber-400' : 'text-emerald-400'
                    }`}>
                      {u.diffPonderado > 0 ? `+${u.diffPonderado}` : u.diffPonderado}
                    </td>
                    <td className="p-4 text-center font-semibold text-slate-300">{u.desvioPct}%</td>
                    <td className="p-4 text-right">
                      {u.foraDaTolerancia ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-300 bg-rose-950/50 border border-rose-500/40 px-2.5 py-1 rounded-lg">
                          <AlertCircle className="w-3.5 h-3.5" />
                          Gatilho Desvio ({'>'}20%)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-300 bg-emerald-950/40 border border-emerald-500/30 px-2.5 py-1 rounded-lg">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Margem OK
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
