'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { ServidorBasico, Habilidade } from '@/types';
import { jsonAuthHeaders, apiFetch, getStoredPerfil, canManageCompetencias } from '@/lib/auth';
import { IdCard, Search, Save, CheckCircle2, AlertCircle } from 'lucide-react';

function statusLotacaoLabel(status: string): string {
  if (status === 'lotado') return 'Lotado';
  if (status === 'sem_lotacao') return 'Sem lotação (novo)';
  if (status === 'disponivel_realocacao') return 'Liberado para realocação';
  return status;
}

export default function CompetenciasPage() {
  const [perfil, setPerfil] = useState<ReturnType<typeof getStoredPerfil>>(null);
  const [servidores, setServidores] = useState<ServidorBasico[]>([]);
  const [habilidades, setHabilidades] = useState<Habilidade[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [mensagem, setMensagem] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);
  const [editDrafts, setEditDrafts] = useState<Record<string, { nivel: string; habilidades: string[] }>>({});

  const podeEditar = canManageCompetencias(perfil);

  useEffect(() => {
    setPerfil(getStoredPerfil());
  }, []);

  useEffect(() => {
    apiFetch('/api/habilidades')
      .then((res) => (res.ok ? res.json() : []))
      .then((data: Habilidade[]) => setHabilidades(data))
      .catch(() => undefined);
  }, []);

  const carregarServidores = async (termo = '') => {
    setLoading(true);
    try {
      const qs = termo.trim() ? `?busca=${encodeURIComponent(termo.trim())}` : '';
      const res = await apiFetch(`/api/servidores${qs}`);
      if (res.ok) {
        const data = (await res.json()) as ServidorBasico[];
        setServidores(data);
        const drafts: Record<string, { nivel: string; habilidades: string[] }> = {};
        data.forEach((s) => {
          drafts[s.id] = {
            nivel: s.nivel_escolaridade || '',
            habilidades: s.habilidades.map((h) => h.id),
          };
        });
        setEditDrafts(drafts);
      }
    } catch {
      setMensagem({ tipo: 'erro', texto: 'Não foi possível carregar a lista de servidores.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarServidores();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const salvar = async (servidorId: string) => {
    if (!podeEditar) return;
    const draft = editDrafts[servidorId];
    if (!draft) return;
    setMensagem(null);
    const res = await apiFetch(`/api/servidores/${servidorId}`, {
      method: 'PATCH',
      headers: jsonAuthHeaders(),
      body: JSON.stringify({
        nivel_escolaridade: draft.nivel || null,
        habilidade_ids: draft.habilidades,
      }),
    });
    if (!res.ok) {
      setMensagem({ tipo: 'erro', texto: 'Não foi possível salvar as competências deste servidor.' });
      return;
    }
    setMensagem({ tipo: 'ok', texto: 'Competências atualizadas com sucesso.' });
    await carregarServidores(busca);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />
      <main className="flex-1 mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
        <div className="flex items-center gap-3 mb-2">
          <IdCard className="h-7 w-7 text-amber-400" />
          <h1 className="text-2xl font-bold text-white">Cadastro de Competências (RH)</h1>
        </div>
        <p className="text-sm text-slate-400 mb-6">
          Registro oficial de escolaridade e habilidades de cada servidor, mantido pela área de Recursos
          Humanos. Esses dados alimentam as sugestões de compatibilidade exibidas em Simulação — a
          definição do perfil exigido por cada vaga continua sendo feita pelo gestor da unidade, em
          Unidades → Perfis de Lotação.
        </p>

        {!podeEditar && (
          <div className="mb-6 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              Esta tela é somente leitura para o seu perfil. A edição de competências é exclusiva do
              perfil RH.
            </span>
          </div>
        )}

        {mensagem && (
          <div
            className={`mb-6 flex items-center gap-2 rounded-xl border px-4 py-3 text-xs ${
              mensagem.tipo === 'ok'
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                : 'border-rose-500/30 bg-rose-500/10 text-rose-300'
            }`}
          >
            {mensagem.tipo === 'ok' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            {mensagem.texto}
          </div>
        )}

        <div className="mb-4 flex flex-wrap gap-2">
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') carregarServidores(busca);
            }}
            placeholder="Buscar por nome ou matrícula..."
            className="flex-1 min-w-[220px] rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white"
          />
          <button
            type="button"
            onClick={() => carregarServidores(busca)}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700"
          >
            <Search className="h-4 w-4" />
            Buscar
          </button>
        </div>

        {loading && <p className="text-sm text-slate-400">Carregando servidores...</p>}
        {!loading && servidores.length === 0 && (
          <p className="text-sm text-slate-400">Nenhum servidor encontrado.</p>
        )}

        <div className="space-y-3">
          {servidores.map((s) => {
            const draft = editDrafts[s.id] || { nivel: '', habilidades: [] };
            return (
              <div key={s.id} className="rounded-xl border border-white/10 bg-slate-900/60 p-4 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white">{s.nome}</p>
                    <p className="text-xs text-slate-400">
                      Matrícula: {s.matricula} · {s.unidade_nome || 'Sem unidade'} ·{' '}
                      {statusLotacaoLabel(s.status_lotacao)}
                    </p>
                  </div>
                  {podeEditar && (
                    <button
                      type="button"
                      onClick={() => salvar(s.id)}
                      className="inline-flex items-center gap-1 rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-600"
                    >
                      <Save className="w-3.5 h-3.5" />
                      Salvar dados
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-slate-400 uppercase font-semibold text-[10px]">Escolaridade</label>
                    <select
                      value={draft.nivel}
                      disabled={!podeEditar}
                      onChange={(e) =>
                        setEditDrafts((prev) => ({ ...prev, [s.id]: { ...draft, nivel: e.target.value } }))
                      }
                      className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white disabled:opacity-60"
                    >
                      <option value="">Não informado</option>
                      <option value="medio">Ensino Médio</option>
                      <option value="superior">Ensino Superior</option>
                    </select>
                  </div>
                  <div>
                    <p className="text-slate-400 uppercase font-semibold text-[10px] mb-1">Habilidades</p>
                    <div className="flex flex-wrap gap-1.5">
                      {habilidades.map((h) => (
                        <label
                          key={h.id}
                          className="inline-flex items-center gap-1 rounded border border-white/10 px-2 py-0.5 text-slate-300"
                        >
                          <input
                            type="checkbox"
                            disabled={!podeEditar}
                            checked={draft.habilidades.includes(h.id)}
                            onChange={(e) => {
                              const next = e.target.checked
                                ? [...draft.habilidades, h.id]
                                : draft.habilidades.filter((id) => id !== h.id);
                              setEditDrafts((prev) => ({ ...prev, [s.id]: { ...draft, habilidades: next } }));
                            }}
                          />
                          {h.nome}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
