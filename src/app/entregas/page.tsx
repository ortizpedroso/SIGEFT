'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { Entrega, Unidade } from '@/types';
import { jsonAuthHeaders, apiErrorMessage } from '@/lib/auth';
import { Package, Plus, Search, CheckCircle2, Clock, BarChart, AlertCircle, RefreshCw } from 'lucide-react';

export default function EntregasPage() {
  const [entregas, setEntregas] = useState<Entrega[]>([]);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [unidadeFilter, setUnidadeFilter] = useState('todas');

  // Modal Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [unidadeId, setUnidadeId] = useState('');
  const [nome, setNome] = useState('');
  const [fonte, setFonte] = useState('');
  const [cargaHoraria, setCargaHoraria] = useState('6');
  const [volumeMensal, setVolumeMensal] = useState('100');
  const [complexidade, setComplexidade] = useState('3');
  const [criticidade, setCriticidade] = useState('3');
  const [absenteismo, setAbsenteismo] = useState('3.5');
  const [rotatividade, setRotatividade] = useState('2.0');

  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resEntregas, resUnidades] = await Promise.all([
        fetch('/api/entregas'),
        fetch('/api/unidades'),
      ]);
      if (resEntregas.ok) {
        const data = await resEntregas.json();
        setEntregas(data);
      }
      if (resUnidades.ok) {
        const dataU = await resUnidades.json();
        setUnidades(dataU);
        if (dataU.length > 0 && !unidadeId) {
          setUnidadeId(dataU[0].id);
        }
      }
    } catch {
      console.error('Erro ao carregar entregas e unidades');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/entregas', {
        method: 'POST',
        headers: jsonAuthHeaders(),
        body: JSON.stringify({
          unidade_id: unidadeId,
          nome,
          fonte,
          carga_horaria_media: parseFloat(cargaHoraria),
          volume_mensal: parseInt(volumeMensal),
          complexidade: parseInt(complexidade),
          criticidade: parseInt(criticidade),
          absenteismo_pct: parseFloat(absenteismo),
          rotatividade_pct: parseFloat(rotatividade),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(apiErrorMessage(err, 'Falha ao cadastrar entrega'));
      }

      setFormSuccess('Entrega e Indicador de Capacidade cadastrados com sucesso!');
      setNome('');
      setFonte('');
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      setFormError(err.message || 'Erro de conexão com a API');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredEntregas = entregas.filter((e) => {
    const matchesSearch = e.nome.toLowerCase().includes(search.toLowerCase()) || e.fonte.toLowerCase().includes(search.toLowerCase());
    const matchesUnidade = unidadeFilter === 'todas' || e.unidade_id === unidadeFilter;
    return matchesSearch && matchesUnidade;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-10 py-6 sm:py-10 w-full">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <Package className="w-7 h-7 text-blue-500" />
              Mapeamento de Entregas e Capacidade Produtiva
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Módulos 1 e 2 — Mapeamento estruturado de entregas, horas, absenteísmo e indicador de capacidade
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-700/20 transition-all hover:bg-blue-600 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Nova Entrega / Serviço
          </button>
        </div>

        {/* Success Alert */}
        {formSuccess && (
          <div className="mb-6 p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/30 text-emerald-300 text-sm flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            {formSuccess}
          </div>
        )}

        {/* Controls */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar por entrega ou norma de referência..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-slate-900/60 pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <select
            value={unidadeFilter}
            onChange={(e) => setUnidadeFilter(e.target.value)}
            className="rounded-xl border border-white/10 bg-slate-900/60 px-4 py-2.5 text-sm text-slate-200 focus:border-blue-500 focus:outline-none"
          >
            <option value="todas">Todas as Unidades</option>
            {unidades.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nome}
              </option>
            ))}
          </select>
        </div>

        {/* List of Deliverables & Sizing */}
        {loading ? (
          <div className="text-center py-12 text-slate-500 text-sm">Carregando entregas e capacidades...</div>
        ) : filteredEntregas.length === 0 ? (
          <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-12 text-center text-slate-400">
            Nenhuma entrega cadastrada para os filtros selecionados.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
            {filteredEntregas.map((item) => {
              const ch = item.carga_horaria_media || 6;
              const vol = item.volume_mensal || 100;
              const abs = item.absenteismo_pct || 3.5;
              const rot = item.rotatividade_pct || 2.0;
              const cap = item.capacidade_produtiva || Math.round((ch / Math.max(0.5, 1 - (abs + rot) / 100)) * vol);

              return (
                <div
                  key={item.id}
                  className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-sm flex flex-col justify-between shadow-xl"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-lg">
                        {item.unidade?.nome || 'Unidade Administrativa'}
                      </span>
                      <span className="text-xs font-medium text-slate-400 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-500" /> Fonte: {item.fonte}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-white leading-snug">{item.nome}</h3>

                    {/* Operational Metrics Grid */}
                    <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950/60 p-3.5 rounded-xl border border-white/5">
                      <div>
                        <p className="text-[10px] uppercase font-bold text-slate-500">Horas/Entrega</p>
                        <p className="text-base font-bold text-slate-200 mt-0.5">{ch}h</p>
                      </div>

                      <div>
                        <p className="text-[10px] uppercase font-bold text-slate-500">Demandas/Mês</p>
                        <p className="text-base font-bold text-slate-200 mt-0.5">{vol} un</p>
                      </div>

                      <div>
                        <p className="text-[10px] uppercase font-bold text-amber-400">Absenteísmo</p>
                        <p className="text-base font-bold text-amber-300 mt-0.5">{abs}%</p>
                      </div>

                      <div>
                        <p className="text-[10px] uppercase font-bold text-rose-400">Rotatividade</p>
                        <p className="text-base font-bold text-rose-300 mt-0.5">{rot}%</p>
                      </div>
                    </div>
                  </div>

                  {/* Calculated Capacity Indicator */}
                  <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-400 flex items-center gap-1">
                        <BarChart className="w-4 h-4 text-emerald-400" />
                        Capacidade Produtiva Necessária
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">Mapeamento DFT / MGI</p>
                    </div>

                    <div className="text-right">
                      <span className="text-xl font-extrabold text-emerald-400">{cap}</span>
                      <span className="text-xs text-slate-400 ml-1">horas/mês</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal New Entrega */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm overflow-y-auto">
            <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl my-8">
              <h2 className="text-lg font-bold text-white mb-2">Cadastrar Entrega & Metrificação (DFT)</h2>
              <p className="text-xs text-slate-400 mb-5">
                Forneça os parâmetros operacionais para geração automatizada do indicador de capacidade.
              </p>

              {formError && (
                <div className="mb-4 p-3 rounded-xl border border-rose-500/30 bg-rose-950/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {formError}
                </div>
              )}

              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                    Unidade de Saúde ou Setor *
                  </label>
                  <select
                    value={unidadeId}
                    onChange={(e) => setUnidadeId(e.target.value)}
                    required
                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                  >
                    {unidades.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.nome} ({u.tipo === 'apoio_indireto' ? 'Apoio Indireto' : 'Apoio Direto'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                    Nome da Entrega / Produto Gerado *
                  </label>
                  <input
                    type="text"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Ex: Análise de Contratos, Minuta de Julgamento..."
                    required
                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                    Fonte ou Documento de Referência *
                  </label>
                  <input
                    type="text"
                    value={fonte}
                    onChange={(e) => setFonte(e.target.value)}
                    placeholder="Ex: Plano Diretor, Manual de Atribuições SGP..."
                    required
                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                      Carga Horária Média (Horas)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      value={cargaHoraria}
                      onChange={(e) => setCargaHoraria(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                      Volume Mensal de Demandas
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={volumeMensal}
                      onChange={(e) => setVolumeMensal(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                      Taxa de Absenteísmo (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={absenteismo}
                      onChange={(e) => setAbsenteismo(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                      Rotatividade / Turnover (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={rotatividade}
                      onChange={(e) => setRotatividade(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-xl bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-600 shadow-md shadow-blue-700/20"
                  >
                    {submitting ? 'Salvando...' : 'Cadastrar e Calcular'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
