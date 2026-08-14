'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { Categoria, SimulacaoResponse } from '@/types';
import { jsonAuthHeaders, apiErrorMessage } from '@/lib/auth';
import { BarChart3, Calculator, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function SimulacaoPage() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [categoriaId, setCategoriaId] = useState('');
  const [reducaoPercentual, setReducaoPercentual] = useState<number>(0);
  const [result, setResult] = useState<SimulacaoResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/categorias')
      .then((res) => res.json())
      .then((data: Categoria[]) => {
        setCategorias(data);
        if (data.length > 0) {
          setCategoriaId(data[0].id);
        }
      })
      .catch(() => console.error('Erro ao carregar categorias'));
  }, []);

  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);

    if (!categoriaId) {
      setError('Selecione uma categoria MGI para simulação.');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/simulacao/lotacao', {
        method: 'POST',
        headers: jsonAuthHeaders(),
        body: JSON.stringify({
          categoria_id: categoriaId,
          reducao_percentual: Number(reducaoPercentual),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(apiErrorMessage(data, 'Erro ao realizar simulação'));
      }

      setResult(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro na simulação';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const selectedCategoria = categorias.find((c) => c.id === categoriaId);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-10 py-6 sm:py-10 w-full">
        <div className="mb-8">
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <BarChart3 className="w-7 h-7 text-blue-500" />
          Simulação de Lotação (Q₃ / Mediana)
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Cálculo estatístico de força de trabalho por Categoria Transversal MGI com gatilho de redução do CNJ nº 219/2016
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Formulário de Parâmetros */}
        <div className="lg:col-span-5 rounded-2xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-sm">
          <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <Calculator className="w-4 h-4 text-blue-400" />
            Parâmetros da Simulação
          </h2>

          {error && (
            <div className="mb-4 p-3 rounded-xl border border-rose-500/30 bg-rose-950/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSimulate} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                Categoria MGI *
              </label>
              <select
                value={categoriaId}
                onChange={(e) => setCategoriaId(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-none"
              >
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold uppercase text-slate-400 mb-1">
                <span>Redução Percentual Solicitada (%)</span>
                <span className="text-blue-400 font-bold">{reducaoPercentual}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                step="1"
                value={reducaoPercentual}
                onChange={(e) => setReducaoPercentual(Number(e.target.value))}
                className="range-slider range-slider-blue"
              />
              <div className="flex justify-between text-[11px] text-slate-500 mt-1">
                <span>0% (Padrão)</span>
                <span className="text-amber-400 font-medium">30% (Gatilho Fallback)</span>
                <span>50%</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-700/20 transition-all hover:bg-blue-600 active:scale-95 flex items-center justify-center gap-2"
            >
              {loading ? 'Calculando...' : 'Calcular Lotação'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Painel de Resultados */}
        <div className="lg:col-span-7 flex flex-col justify-between rounded-2xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-sm shadow-xl">
          <div>
            <h2 className="text-base font-bold text-white mb-2">Resultado da Análise</h2>
            <p className="text-xs text-slate-400 mb-6">
              Categoria selecionada: <span className="text-blue-400 font-bold">{selectedCategoria?.nome || '—'}</span>
            </p>

            {result ? (
              <div className="space-y-6">
                {/* Metric Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-blue-500/30 bg-blue-950/20 p-4 shadow-sm">
                    <p className="text-[11px] font-extrabold uppercase tracking-wider text-blue-400">
                      Terceiro Quartil (Q₃ - 75%)
                    </p>
                    <p className="text-3xl font-black text-white mt-1">{result.q3}</p>
                    <p className="text-[11px] font-semibold text-slate-400 mt-1">Meta de Produtividade Elevada</p>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4 shadow-sm">
                    <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                      Mediana (50%)
                    </p>
                    <p className="text-3xl font-black text-slate-200 mt-1">{result.fallback}</p>
                    <p className="text-[11px] font-semibold text-slate-400 mt-1">Gatilho de Segurança de Redução</p>
                  </div>
                </div>

                {/* Strategy applied */}
                <div
                  className={`p-4 rounded-xl border shadow-md ${
                    result.strategy === 'median'
                      ? 'border-amber-500/40 bg-amber-950/30 text-amber-300'
                      : 'border-emerald-500/40 bg-emerald-950/30 text-emerald-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                    <span className="font-extrabold text-sm">
                      Estratégia Aplicada: {result.strategy === 'median' ? 'Mediana (Fallback)' : 'Q₃ (Padrão MGI)'}
                    </span>
                  </div>
                  <p className="text-xs font-semibold leading-relaxed mt-1">
                    {result.strategy === 'median'
                      ? 'Redução superior a 30% detectada! Aplicado gatilho de segurança utilizando a Mediana para preservação dos níveis mínimos de serviço.'
                      : 'Solicitação dentro dos parâmetros de redução tolerados (<=30%). Lotação calculada pelo Terceiro Quartil (Q₃).'}
                  </p>
                  <div className="mt-3 pt-3 border-t border-current/20 flex justify-between items-center text-xs font-bold">
                    <span>Valor de Lotação Recomendado:</span>
                    <span className="text-xl font-black">{result.value}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-white/10 p-12 text-center text-slate-400 font-medium text-sm">
                Selecione os parâmetros e clique em &quot;Calcular Lotação&quot; para visualizar os resultados.
              </div>
            )}
          </div>

          <p className="text-[11px] text-slate-500 mt-6 pt-4 border-t border-white/5">
            * Conforme Resolução CNJ nº 219/2016 e diretrizes do Modelo MGI do TJRR.
          </p>
        </div>
      </div>
      </main>
    </div>
  );
}
