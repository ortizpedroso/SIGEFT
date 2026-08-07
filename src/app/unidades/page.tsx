'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { Unidade, Categoria } from '@/types';
import { Building2, Plus, Search, CheckCircle2, AlertCircle, Users, Scale, ArrowUpRight, ArrowDownRight, BarChart } from 'lucide-react';

export default function UnidadesPage() {
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tipoFilter, setTipoFilter] = useState<'todos' | 'apoio_direto' | 'apoio_indireto'>('todos');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'deficit' | 'excesso' | 'ideal'>('todos');

  // Modal / Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState<'apoio_direto' | 'apoio_indireto'>('apoio_direto');
  const [categoriaId, setCategoriaId] = useState('');
  const [ips, setIps] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resU, resC] = await Promise.all([
        fetch('/api/unidades'),
        fetch('/api/categorias'),
      ]);
      const dataU = await resU.json();
      const dataC = await resC.json();
      setUnidades(dataU);
      setCategorias(dataC);
      if (dataC.length > 0 && !categoriaId) {
        setCategoriaId(dataC[0].id);
      }
    } catch {
      console.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!nome.trim() || !categoriaId) {
      setFormError('Preencha os campos obrigatórios (Nome e Categoria).');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/unidades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: nome.trim(),
          tipo,
          categoria_id: categoriaId,
          ips: ips ? parseFloat(ips) : null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Erro ao cadastrar unidade');
      }

      setFormSuccess('Unidade cadastrada com sucesso!');
      setNome('');
      setIps('');
      setIsModalOpen(false);
      fetchData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao cadastrar';
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredUnidades = unidades.filter((u) => {
    const matchesSearch = u.nome.toLowerCase().includes(search.toLowerCase());
    const matchesTipo = tipoFilter === 'todos' || u.tipo === tipoFilter;
    const matchesStatus = statusFilter === 'todos' || u.status_dimensionamento === statusFilter;
    return matchesSearch && matchesTipo && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 mx-auto max-w-screen-xl px-6 py-10 lg:px-10 w-full">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <Building2 className="w-7 h-7 text-blue-500" />
              Unidades e Quantitativo Ideal por Setor
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Dimensionamento e diagnóstico de lotação paradigma conforme metodologia MGI e CNJ 219/2016
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-700/20 transition-all hover:bg-blue-600 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Nova Unidade
          </button>
        </div>

        {/* Messages */}
        {formSuccess && (
          <div className="mb-6 p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/30 text-emerald-300 text-sm flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            {formSuccess}
          </div>
        )}

        {/* Controls and Filters */}
        <div className="mb-6 flex flex-col lg:flex-row gap-4 justify-between items-stretch">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar unidade por nome..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-slate-900/60 pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {/* Tipo Filter */}
            <div className="flex bg-slate-900/60 p-1 rounded-xl border border-white/10">
              {(['todos', 'apoio_direto', 'apoio_indireto'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTipoFilter(t)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-all ${
                    tipoFilter === t
                      ? 'bg-blue-700 text-white shadow-md shadow-blue-700/20'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {t === 'todos' ? 'Todos Tipos' : t === 'apoio_direto' ? 'Direto' : 'Indireto'}
                </button>
              ))}
            </div>

            {/* Status Dimensionamento Filter */}
            <div className="flex bg-slate-900/60 p-1 rounded-xl border border-white/10">
              {(['todos', 'deficit', 'ideal', 'excesso'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-all ${
                    statusFilter === s
                      ? 'bg-blue-700 text-white shadow-md shadow-blue-700/20'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {s === 'todos' ? 'Todos Diagnósticos' : s === 'deficit' ? 'Déficit' : s === 'excesso' ? 'Excesso' : 'Equilibrado'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* List / Grid of Cards */}
        {loading ? (
          <div className="text-center py-12 text-slate-500 text-sm">Carregando unidades...</div>
        ) : filteredUnidades.length === 0 ? (
          <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-12 text-center text-slate-400">
            Nenhuma unidade encontrada com os filtros selecionados.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
            {filteredUnidades.map((u) => {
              const isIndireto = u.tipo === 'apoio_indireto';
              const servidoresAtuais = u.servidores_atuais ?? 4;
              const lotacaoIdeal = u.lotacao_ideal ?? 3;
              const diff = servidoresAtuais - lotacaoIdeal;

              const isDeficit = diff < 0;
              const isExcesso = diff > 0;

              return (
                <div
                  key={u.id}
                  className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-sm flex flex-col justify-between shadow-xl hover:border-white/20 transition-all"
                >
                  <div>
                    {/* Header Badges */}
                    <div className="flex items-center justify-between mb-3">
                      <span
                        className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                          isIndireto
                            ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                            : 'text-blue-400 bg-blue-500/10 border-blue-500/20'
                        }`}
                      >
                        {isIndireto ? 'Apoio Indireto' : 'Apoio Direto'}
                      </span>

                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                          isDeficit
                            ? 'text-rose-400 bg-rose-500/10 border-rose-500/20'
                            : isExcesso
                            ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                            : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                        }`}
                      >
                        {isDeficit && <ArrowDownRight className="w-3.5 h-3.5" />}
                        {isExcesso && <ArrowUpRight className="w-3.5 h-3.5" />}
                        {!isDeficit && !isExcesso && <Scale className="w-3.5 h-3.5" />}
                        {isDeficit
                          ? `Déficit (-${Math.abs(diff)})`
                          : isExcesso
                          ? `Excesso (+${diff})`
                          : 'Lotação Ideal'}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-white leading-snug">{u.nome}</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Categoria MGI: <span className="text-slate-200 font-semibold">{u.categoria?.nome || 'Gestão de Pessoas'}</span>
                    </p>

                    {/* Operational / Sizing Metrics Grid */}
                    <div className="mt-5 grid grid-cols-2 gap-3 bg-slate-950/60 p-3.5 rounded-xl border border-white/5">
                      <div>
                        <p className="text-[10px] uppercase font-bold text-slate-500">Lotação Atual</p>
                        <p className="text-base font-bold text-slate-200 mt-0.5">{servidoresAtuais} servidores</p>
                      </div>

                      <div>
                        <p className="text-[10px] uppercase font-bold text-blue-400">Lotação Ideal</p>
                        <p className="text-base font-bold text-blue-300 mt-0.5">{lotacaoIdeal} calculados</p>
                      </div>
                    </div>
                  </div>

                  {/* Calculated Capacity & CNJ Indicator */}
                  <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-400 flex items-center gap-1">
                        <BarChart className="w-4 h-4 text-emerald-400" />
                        Diagnóstico Resolução CNJ 219
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">Metodologia DFT / MGI</p>
                    </div>

                    <div className="text-right">
                      <span className="text-xl font-extrabold text-blue-400">{u.ips ?? 80}</span>
                      <span className="text-xs text-slate-400 ml-1">IPS</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal Nova Unidade */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
              <h2 className="text-lg font-bold text-white mb-4">Cadastrar Nova Unidade</h2>

              {formError && (
                <div className="mb-4 p-3 rounded-xl border border-rose-500/30 bg-rose-950/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {formError}
                </div>
              )}

              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                    Nome da Unidade *
                  </label>
                  <input
                    type="text"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Ex: 3ª Vara Cível da Comarca..."
                    required
                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                    Tipo de Unidade *
                  </label>
                  <select
                    value={tipo}
                    onChange={(e) => setTipo(e.target.value as 'apoio_direto' | 'apoio_indireto')}
                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="apoio_direto">Apoio Direto (Atividade Fim)</option>
                    <option value="apoio_indireto">Apoio Indireto (Atividade Meio)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                    Categoria MGI *
                  </label>
                  <select
                    value={categoriaId}
                    onChange={(e) => setCategoriaId(e.target.value)}
                    required
                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                  >
                    {categorias.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                    IPS (Índice de Produtividade/Serviço - Opcional)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={ips}
                    onChange={(e) => setIps(e.target.value)}
                    placeholder="Ex: 85.5"
                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
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
                    {submitting ? 'Salvando...' : 'Cadastrar'}
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
