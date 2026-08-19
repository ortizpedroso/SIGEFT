'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { ParecerSEI, Unidade } from '@/types';
import { jsonAuthHeaders, apiFetch, getStoredPerfil, canWriteCadastro } from '@/lib/auth';
import { useEscape } from '@/lib/useEscape';
import { FileText, Plus, Copy, Check, Printer, Building2, ShieldCheck, Pencil, Save } from 'lucide-react';

const TODAS_UNIDADES = 'todas';

export default function RelatoriosSEIPage() {
  const [pareceres, setPareceres] = useState<ParecerSEI[]>([]);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [perfil, setPerfil] = useState<ReturnType<typeof getStoredPerfil>>(null);
  const canCreate = canWriteCadastro(perfil);
  useEscape(isModalOpen, () => setIsModalOpen(false));
  const [unidadeId, setUnidadeId] = useState('');
  const [processoSEI, setProcessoSEI] = useState('');
  const [analista, setAnalista] = useState('Analista Técnico SUBGFT / TJRR');
  const [recomendacao, setRecomendacao] = useState('');
  const [generating, setGenerating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftMinuta, setDraftMinuta] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [printTargetId, setPrintTargetId] = useState<string | null>(null);

  useEffect(() => {
    const clearPrintTarget = () => setPrintTargetId(null);
    window.addEventListener('afterprint', clearPrintTarget);
    return () => window.removeEventListener('afterprint', clearPrintTarget);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resP, resU] = await Promise.all([
        apiFetch('/api/relatorios-sei'),
        apiFetch('/api/unidades'),
      ]);
      if (resP.ok) setPareceres(await resP.json());
      if (resU.ok) {
        const uData = await resU.json();
        setUnidades(uData);
        if (!unidadeId) {
          setUnidadeId(TODAS_UNIDADES);
        }
      }
    } catch {
      console.error('Erro ao carregar pareceres SEI');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPerfil(getStoredPerfil());
    fetchData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    setFormError(null);
    try {
      const res = await apiFetch('/api/relatorios-sei', {
        method: 'POST',
        headers: jsonAuthHeaders(),
        body: JSON.stringify({
          unidadeId,
          numeroProcessoSEI: processoSEI,
          analistaResponsavel: analista,
          recomendacao,
        }),
      });

      if (res.ok) {
        setIsModalOpen(false);
        setProcessoSEI('');
        setRecomendacao('');
        fetchData();
      } else {
        setFormError('Não foi possível gerar a minuta. Verifique a unidade e tente de novo.');
      }
    } catch {
      setFormError('Erro ao gerar parecer SEI');
    } finally {
      setGenerating(false);
    }
  };

  const startEdit = (p: ParecerSEI) => {
    setEditingId(p.id);
    setDraftMinuta(p.minutaTextoSEI);
    setEditError(null);
  };

  const saveEdit = async (id: string) => {
    setSavingEdit(true);
    setEditError(null);
    try {
      const res = await apiFetch(`/api/relatorios-sei/${id}`, {
        method: 'PATCH',
        headers: jsonAuthHeaders(),
        body: JSON.stringify({ minutaTextoSEI: draftMinuta }),
      });
      if (res.ok) {
        setEditingId(null);
        fetchData();
      } else {
        setEditError('Não foi possível salvar a edição da minuta.');
      }
    } catch {
      setEditError('Erro ao salvar a edição da minuta.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handlePrintMinuta = (parecerId: string) => {
    setPrintTargetId(parecerId);
    requestAnimationFrame(() => window.print());
  };

  const handleCopySEI = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 3000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />

      <main id="conteudo-principal" className="flex-1 mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-10 py-6 sm:py-10 w-full">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <FileText className="w-7 h-7 text-blue-500" />
              Instrução Processual e Emissão de Minutas SEI (TJRR)
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Módulo 4 — Geração automatizada de relatórios técnicos e pareceres de lotação formatados para colar no SEI
            </p>
          </div>

          {canCreate && (
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-700/20 transition-all hover:bg-blue-600 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Emite Parecer Técnico SEI
          </button>
          )}
        </div>

        {/* Info Banner */}
        <div className="mb-8 p-5 rounded-2xl border border-blue-500/30 bg-blue-950/20 text-slate-300 text-xs leading-relaxed flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-white block mb-0.5">Integração de Governança com o SEI TJRR</span>
            Elimina a etapa manual de transcrição do levantamento estatístico. As minutas já nascem formatadas com fundamentação na Resolução CNJ nº 219/2016, Resolução CNJ nº 553/2024 e Metodologia DFT (MGI/UnB) para rápida autuação administrativa.
          </div>
        </div>

        {/* List of Opinions */}
        {loading ? (
          <div className="text-center py-12 text-slate-500 text-sm">Carregando pareceres técnicos...</div>
        ) : pareceres.length === 0 ? (
          <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-12 text-center text-slate-400">
            Nenhum parecer emitido até o momento.
          </div>
        ) : (
          <div className="space-y-6">
            {pareceres.map((p) => (
              <div
                key={p.id}
                className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-md shadow-xl"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4 mb-4">
                  <div>
                    <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider bg-blue-500/10 px-2.5 py-1 rounded-lg border border-blue-500/20">
                      {p.numeroProcessoSEI}
                    </span>
                    <h3 className="text-lg font-bold text-white mt-2 flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-slate-400" />
                      {p.unidadeNome}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Emitido em {p.dataEmissao} · Responsável: <span className="text-slate-200 font-medium">{p.analistaResponsavel}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopySEI(p.minutaTextoSEI, p.id)}
                      className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
                        copiedId === p.id
                          ? 'border-emerald-500 bg-emerald-950/60 text-emerald-300'
                          : 'border-blue-500/30 bg-blue-600/20 text-blue-300 hover:bg-blue-600 hover:text-white'
                      }`}
                    >
                      {copiedId === p.id ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      {copiedId === p.id ? 'Minuta Copiada!' : 'Copiar Minuta SEI'}
                    </button>

                    {canCreate && editingId !== p.id && (
                      <button
                        type="button"
                        onClick={() => startEdit(p)}
                        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border border-amber-500/40 bg-amber-500/15 text-amber-200 hover:bg-amber-500 hover:text-slate-950"
                      >
                        <Pencil className="w-4 h-4" />
                        Editar minuta
                      </button>
                    )}
                    <button
                      onClick={() => handlePrintMinuta(p.id)}
                      className="p-2 rounded-xl border border-white/10 bg-slate-950/60 text-slate-400 hover:text-white hover:bg-white/5"
                      title="Imprimir Parecer"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Sizing Stats Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4 bg-slate-950/60 p-3 rounded-xl border border-white/5 text-xs">
                  <div>
                    <p className="text-slate-500 uppercase font-bold">Lotação Atual</p>
                    <p className="text-sm font-bold text-white mt-0.5">{p.servidoresAtuais} servidores</p>
                  </div>
                  <div>
                    <p className="text-blue-400 uppercase font-bold">Lotação Ideal SIGEP</p>
                    <p className="text-sm font-bold text-blue-300 mt-0.5">{p.lotacaoIdealCalculada} servidores</p>
                  </div>
                  <div>
                    <p className="text-slate-500 uppercase font-bold">Diagnóstico SIGEP</p>
                    <p className={`text-sm font-bold capitalize mt-0.5 ${
                      p.diagnostico === 'déficit severo' ? 'text-rose-400' : p.diagnostico === 'excesso de força' ? 'text-amber-400' : 'text-emerald-400'
                    }`}>
                      {p.diagnostico} ({p.desvioPercentual}%)
                    </p>
                  </div>
                </div>

                {editingId === p.id ? (
                  <div className="space-y-3">
                    {editError && (
                      <p className="text-sm text-rose-300">{editError}</p>
                    )}
                    <textarea
                      value={draftMinuta}
                      onChange={(e) => setDraftMinuta(e.target.value)}
                      rows={16}
                      className="w-full rounded-xl border border-amber-500/40 bg-slate-950 p-4 text-xs font-mono text-slate-100 leading-relaxed focus:border-amber-400 focus:outline-none"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={() => saveEdit(p.id)}
                        disabled={savingEdit}
                        className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-600 disabled:opacity-60"
                      >
                        <Save className="w-4 h-4" />
                        {savingEdit ? 'Salvando…' : 'Salvar edição'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    id={printTargetId === p.id ? 'minuta-impressao' : undefined}
                    className="bg-slate-950/90 rounded-xl p-4 border border-white/10 text-xs font-mono text-slate-300 whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto"
                  >
                    {p.minutaTextoSEI}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Modal Emitir Parecer */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} role="presentation">
            <div role="dialog" aria-modal="true" aria-labelledby="modal-parecer-sei" className="w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <h2 id="modal-parecer-sei" className="text-lg font-bold text-white mb-2">Instruir Novo Processo SEI</h2>
              <p className="text-xs text-slate-400 mb-5">
                Selecione uma unidade ou Todas as unidades. A minuta nasce embasada e circunstanciada; depois você pode editar e salvar.
              </p>

              <form onSubmit={handleCreate} className="space-y-4">
                {formError && (
                  <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-300">{formError}</div>
                )}
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                    Unidade Objeto de Análise *
                  </label>
                  <select
                    value={unidadeId}
                    onChange={(e) => setUnidadeId(e.target.value)}
                    required
                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value={TODAS_UNIDADES}>Todas as unidades</option>
                    {unidades.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.nome} ({u.tipo === 'apoio_indireto' ? 'Apoio Indireto' : 'Apoio Direto'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                    Número do Processo SEI (Opcional)
                  </label>
                  <input
                    type="text"
                    value={processoSEI}
                    onChange={(e) => setProcessoSEI(e.target.value)}
                    placeholder="Ex: SEI 0010293-84.2026.8.23.8000"
                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                    Analista Responsável SUBGFT *
                  </label>
                  <input
                    type="text"
                    value={analista}
                    onChange={(e) => setAnalista(e.target.value)}
                    required
                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                    Recomendação Técnica / Conclusão
                  </label>
                  <textarea
                    value={recomendacao}
                    onChange={(e) => setRecomendacao(e.target.value)}
                    placeholder="Ex: Sugere-se o remanejamento emergencial de 2 analistas administrativos para recompor o déficit da unidade..."
                    rows={3}
                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                  />
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
                    disabled={generating}
                    className="rounded-xl bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-600 shadow-md shadow-blue-700/20"
                  >
                    {generating ? 'Gerando Minuta...' : 'Gerar Parecer SEI'}
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
